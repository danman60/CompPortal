'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { uploadMusicFile, formatFileSize, getMusicFileInfo } from '@/lib/storage';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Step = 'basic' | 'details' | 'participants' | 'music' | 'review';

interface EntryFormProps {
  entryId?: string;
}

// Sortable participant component for drag/drop
function SortableParticipant({ participant, onRemove }: {
  participant: { dancer_id: string; dancer_name: string };
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.dancer_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-purple-500/20 border-2 border-purple-400 rounded-lg"
    >
      <div className="flex items-center gap-3 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        <span className="text-white font-medium">{participant.dancer_name}</span>
      </div>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-red-500/20 rounded transition-colors"
        type="button"
      >
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function EntryForm({ entryId }: EntryFormProps) {
  const router = useRouter();
  const isEditMode = !!entryId;
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [formData, setFormData] = useState({
    competition_id: '',
    studio_id: '',
    title: '',
    category_id: '',
    classification_id: '',
    age_group_id: '',
    entry_size_category_id: '',
    choreographer: '',
    music_title: '',
    music_artist: '',
    special_requirements: '',
    participants: [] as Array<{ dancer_id: string; dancer_name: string; role?: string }>,
  });

  // Music upload state
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingMusicUrl, setExistingMusicUrl] = useState<string | null>(null);

  // Fetch all necessary data
  const { data: competitions } = trpc.competition.getAll.useQuery();
  const { data: studios } = trpc.studio.getAll.useQuery();
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();
  const { data: dancers } = trpc.dancer.getAll.useQuery({ studioId: formData.studio_id || undefined });

  // Fetch existing entries for "copy dancers" feature
  const { data: existingEntries } = trpc.entry.getAll.useQuery(
    { studioId: formData.studio_id || undefined },
    { enabled: !!formData.studio_id && !isEditMode }
  );

  // Fetch approved reservation for space limit enforcement
  const { data: reservations } = trpc.reservation.getAll.useQuery(
    {
      studioId: formData.studio_id || undefined,
      competitionId: formData.competition_id || undefined,
      status: 'approved'
    },
    { enabled: !!formData.studio_id && !!formData.competition_id }
  );

  // Load existing entry data if editing
  const { data: existingEntry } = trpc.entry.getById.useQuery(
    { id: entryId! },
    { enabled: isEditMode }
  );

  // Pre-fill form when editing
  useEffect(() => {
    if (existingEntry && isEditMode) {
      setFormData({
        competition_id: existingEntry.competition_id || '',
        studio_id: existingEntry.studio_id || '',
        title: existingEntry.title || '',
        category_id: existingEntry.category_id || '',
        classification_id: existingEntry.classification_id || '',
        age_group_id: existingEntry.age_group_id || '',
        entry_size_category_id: existingEntry.entry_size_category_id || '',
        choreographer: existingEntry.choreographer || '',
        music_title: existingEntry.music_title || '',
        music_artist: existingEntry.music_artist || '',
        special_requirements: existingEntry.special_requirements || '',
        participants: existingEntry.entry_participants?.map((p) => ({
          dancer_id: p.dancer_id,
          dancer_name: `${p.dancers?.first_name} ${p.dancers?.last_name}`,
          role: p.role || undefined,
        })) || [],
      });
      // Load existing music file if present
      if (existingEntry.music_file_url) {
        setExistingMusicUrl(existingEntry.music_file_url);
      }
    }
  }, [existingEntry, isEditMode]);

  const createMutation = trpc.entry.create.useMutation({
    onSuccess: async (data) => {
      // If music file selected, upload it
      if (musicFile && data.id) {
        await handleMusicUpload(data.id);
      } else {
        router.push('/dashboard/entries');
      }
    },
    onError: (error) => {
      alert(`Error creating entry: ${error.message}`);
    },
  });

  const updateMutation = trpc.entry.update.useMutation({
    onSuccess: async (data) => {
      // If music file selected, upload it
      if (musicFile && entryId) {
        await handleMusicUpload(entryId);
      } else {
        router.push(`/dashboard/entries/${entryId}`);
      }
    },
    onError: (error) => {
      alert(`Error updating entry: ${error.message}`);
    },
  });

  const updateMusicMutation = trpc.entry.updateMusic.useMutation({
    onSuccess: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error) => {
      setUploadError(`Failed to save music: ${error.message}`);
      setIsUploading(false);
    },
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for selected participants list
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prevData) => {
        const oldIndex = prevData.participants.findIndex((p) => p.dancer_id === active.id);
        const newIndex = prevData.participants.findIndex((p) => p.dancer_id === over.id);

        return {
          ...prevData,
          participants: arrayMove(prevData.participants, oldIndex, newIndex),
        };
      });
    }
  };

  // Copy dancers from another routine
  const handleCopyDancers = (entryId: string) => {
    const sourceEntry = existingEntries?.entries.find(e => e.id === entryId);
    if (sourceEntry?.entry_participants) {
      const copiedParticipants = sourceEntry.entry_participants.map((p) => ({
        dancer_id: p.dancer_id,
        dancer_name: `${p.dancers?.first_name} ${p.dancers?.last_name}`,
        role: p.role || undefined,
      }));
      setFormData({
        ...formData,
        participants: copiedParticipants,
      });
    }
  };

  // Handle music file upload
  const handleMusicUpload = async (entryId: string) => {
    if (!musicFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Upload file to storage
      const result = await uploadMusicFile({
        file: musicFile,
        entryId,
        onProgress: (progress) => setUploadProgress(progress),
      });

      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update entry with music URL
      await updateMusicMutation.mutateAsync({
        entryId,
        musicFileUrl: result.publicUrl,
        musicTitle: formData.music_title || undefined,
        musicArtist: formData.music_artist || undefined,
      });

      // Navigate to entries list
      router.push('/dashboard/entries');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload music';
      setUploadError(errorMsg);
      setIsUploading(false);
      alert(`Music upload failed: ${errorMsg}\n\nYour routine was saved, but the music file was not uploaded. You can upload it later.`);
      router.push('/dashboard/entries');
    }
  };

  const handleSubmit = () => {
    // Calculate entry fee based on entry size category
    const sizeCategory = lookupData?.entrySizeCategories.find(s => s.id === formData.entry_size_category_id);
    const baseFee = Number(sizeCategory?.base_fee || 0);
    const perParticipantFee = Number(sizeCategory?.per_participant_fee || 0);
    const totalFee = baseFee + (perParticipantFee * formData.participants.length);

    // Find approved reservation for space limit enforcement
    const approvedReservation = reservations?.reservations?.[0];

    const entryData = {
      ...formData,
      reservation_id: approvedReservation?.id, // Link to reservation for space enforcement
      entry_fee: totalFee,
      total_fee: totalFee,
      status: 'draft' as const,
      participants: formData.participants.map((p, index) => ({
        ...p,
        display_order: index + 1,
      })),
    };

    if (isEditMode && entryId) {
      updateMutation.mutate({
        id: entryId,
        data: entryData,
      });
    } else {
      createMutation.mutate(entryData);
    }
  };

  const steps: Step[] = ['basic', 'details', 'participants', 'music', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`text-sm ${
                index <= currentStepIndex ? 'text-purple-400 font-semibold' : 'text-gray-500'
              }`}
            >
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </div>
          ))}
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Form Steps */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
        {/* Step 1: Basic Info */}
        {currentStep === 'basic' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event *
              </label>
              <select
                value={formData.competition_id}
                onChange={(e) => setFormData({ ...formData, competition_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Event</option>
                {competitions?.competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.year})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Studio *
              </label>
              <select
                value={formData.studio_id}
                onChange={(e) => setFormData({ ...formData, studio_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Studio</option>
                {studios?.studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Routine Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. 'Rise Up', 'Brave', 'Thunderstruck'"
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Choreographer
              </label>
              <input
                type="text"
                value={formData.choreographer}
                onChange={(e) => setFormData({ ...formData, choreographer: e.target.value })}
                placeholder="Choreographer name"
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Category Details */}
        {currentStep === 'details' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Category Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Dance Category *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Category</option>
                {lookupData?.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Classification *
              </label>
              <select
                value={formData.classification_id}
                onChange={(e) => setFormData({ ...formData, classification_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Classification</option>
                {lookupData?.classifications.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.skill_level && `(Level ${cls.skill_level})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age Group *
              </label>
              <select
                value={formData.age_group_id}
                onChange={(e) => setFormData({ ...formData, age_group_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Age Group</option>
                {lookupData?.ageGroups.map((age) => (
                  <option key={age.id} value={age.id}>
                    {age.name} ({age.min_age}-{age.max_age} years)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Routine Size *
              </label>
              <select
                value={formData.entry_size_category_id}
                onChange={(e) => setFormData({ ...formData, entry_size_category_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Routine Size</option>
                {lookupData?.entrySizeCategories.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name} ({size.min_participants}-{size.max_participants} dancers)
                    {size.base_fee && ` - $${size.base_fee}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Participants */}
        {currentStep === 'participants' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Select Dancers</h2>

            {/* Copy from existing routine */}
            {existingEntries && existingEntries.entries.length > 0 && !isEditMode && (
              <div className="bg-blue-500/10 border border-blue-400/30 p-4 rounded-lg">
                <label className="block text-sm font-medium text-blue-300 mb-2">
                  💡 Quick Start: Copy dancers from existing routine
                </label>
                <select
                  onChange={(e) => e.target.value && handleCopyDancers(e.target.value)}
                  className="w-full px-4 py-2 bg-black/40 text-white border border-white/20 rounded-lg focus:border-blue-400 focus:outline-none"
                  defaultValue=""
                >
                  <option value="">-- Select a routine to copy dancers --</option>
                  {existingEntries.entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title} ({entry.entry_participants?.length || 0} dancers)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Dancers */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Available Dancers
                  <span className="ml-2 text-sm text-gray-400">
                    ({dancers?.dancers.filter(d => !formData.participants.some(p => p.dancer_id === d.id)).length || 0})
                  </span>
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {dancers?.dancers
                    .filter(d => !formData.participants.some(p => p.dancer_id === d.id))
                    .map((dancer) => (
                      <div
                        key={dancer.id}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            participants: [
                              ...formData.participants,
                              {
                                dancer_id: dancer.id,
                                dancer_name: `${dancer.first_name} ${dancer.last_name}`,
                              },
                            ],
                          });
                        }}
                        className="p-3 rounded-lg border-2 border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-white font-medium group-hover:text-purple-300 transition-colors">
                              {dancer.first_name} {dancer.last_name}
                            </div>
                            {dancer.date_of_birth && (
                              <div className="text-sm text-gray-400">
                                Age: {new Date().getFullYear() - new Date(dancer.date_of_birth).getFullYear()}
                              </div>
                            )}
                          </div>
                          <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  {dancers && dancers.dancers.filter(d => !formData.participants.some(p => p.dancer_id === d.id)).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      All dancers have been selected
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Dancers (Draggable to reorder) */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Selected Dancers ({formData.participants.length})
                  <span className="ml-2 text-xs text-gray-400">Drag to reorder</span>
                </h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={formData.participants.map(p => p.dancer_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {formData.participants.map((participant) => (
                        <SortableParticipant
                          key={participant.dancer_id}
                          participant={participant}
                          onRemove={() => {
                            setFormData({
                              ...formData,
                              participants: formData.participants.filter(p => p.dancer_id !== participant.dancer_id),
                            });
                          }}
                        />
                      ))}
                      {formData.participants.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-lg">
                          <p className="text-gray-400 mb-2">No dancers selected</p>
                          <p className="text-sm text-gray-500">Click dancers from the left to add them</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-400/30 p-4 rounded-lg">
              <p className="text-purple-300 text-sm">
                ✓ {formData.participants.length} dancer(s) selected
                {formData.participants.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    • Drag selected dancers to reorder
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Music */}
        {currentStep === 'music' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Music & Additional Info</h2>

            {/* Music File Upload */}
            <div className="bg-purple-500/10 border border-purple-400/30 p-6 rounded-lg">
              <label className="block text-sm font-medium text-purple-300 mb-3">
                🎵 Music File Upload
              </label>

              {/* Existing Music */}
              {existingMusicUrl && !musicFile && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-300">✓ Music file uploaded</span>
                    <button
                      type="button"
                      onClick={() => setExistingMusicUrl(null)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                  <audio controls className="w-full mt-2">
                    <source src={existingMusicUrl} />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="text-xs text-gray-400 mt-2">
                    {getMusicFileInfo(existingMusicUrl)?.fileName || 'Music file'}
                  </div>
                </div>
              )}

              {/* File Input */}
              {!existingMusicUrl && (
                <div>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/aac,.mp3,.wav,.m4a,.aac"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMusicFile(file);
                        setUploadError(null);
                      }
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white file:cursor-pointer hover:file:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Supported formats: MP3, WAV, M4A, AAC • Max size: 50MB
                  </p>
                </div>
              )}

              {/* Selected File Preview */}
              {musicFile && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm text-blue-300 font-medium">{musicFile.name}</div>
                      <div className="text-xs text-gray-400">{formatFileSize(musicFile.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMusicFile(null);
                        setUploadError(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 ml-4"
                    >
                      Remove
                    </button>
                  </div>
                  {/* Audio preview for selected file */}
                  <audio controls className="w-full mt-2">
                    <source src={URL.createObjectURL(musicFile)} />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-xs text-green-400 mt-2">
                    ✓ File will be uploaded when you create/update the routine
                  </p>
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                  <p className="text-sm text-red-400">❌ {uploadError}</p>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-4 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="animate-spin">⏳</div>
                    <span className="text-sm text-purple-300">Uploading music file...</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{uploadProgress}% complete</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Music Title
              </label>
              <input
                type="text"
                value={formData.music_title}
                onChange={(e) => setFormData({ ...formData, music_title: e.target.value })}
                placeholder="Song title"
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Music Artist
              </label>
              <input
                type="text"
                value={formData.music_artist}
                onChange={(e) => setFormData({ ...formData, music_artist: e.target.value })}
                placeholder="Artist name"
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Special Requirements
              </label>
              <textarea
                value={formData.special_requirements}
                onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                placeholder="Any special requirements, props, or accessibility needs..."
                rows={4}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Review Routine</h2>

            <div className="bg-black/20 p-6 rounded-lg space-y-4">
              <div>
                <div className="text-sm text-gray-400">Event</div>
                <div className="text-white font-semibold">
                  {competitions?.competitions.find(c => c.id === formData.competition_id)?.name}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Studio</div>
                <div className="text-white font-semibold">
                  {studios?.studios.find(s => s.id === formData.studio_id)?.name}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Routine Title</div>
                <div className="text-white font-semibold">{formData.title}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Category</div>
                <div className="text-white">
                  {lookupData?.categories.find(c => c.id === formData.category_id)?.name}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Classification</div>
                <div className="text-white">
                  {lookupData?.classifications.find(c => c.id === formData.classification_id)?.name}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Age Group</div>
                <div className="text-white">
                  {lookupData?.ageGroups.find(a => a.id === formData.age_group_id)?.name}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Dancers ({formData.participants.length})</div>
                <div className="text-white">
                  {formData.participants.map(p => p.dancer_name).join(', ')}
                </div>
              </div>

              {/* Music Information */}
              <div>
                <div className="text-sm text-gray-400">Music</div>
                {formData.music_title || formData.music_artist ? (
                  <div className="text-white mb-1">
                    {formData.music_title} {formData.music_artist && `by ${formData.music_artist}`}
                  </div>
                ) : (
                  <div className="text-gray-500 mb-1">Not specified</div>
                )}
                {musicFile && (
                  <div className="text-sm text-green-400 flex items-center gap-2 mt-1">
                    ✓ Music file ready: {musicFile.name} ({formatFileSize(musicFile.size)})
                  </div>
                )}
                {existingMusicUrl && !musicFile && (
                  <div className="text-sm text-green-400 flex items-center gap-2 mt-1">
                    ✓ Music file uploaded
                  </div>
                )}
                {!musicFile && !existingMusicUrl && (
                  <div className="text-sm text-yellow-400 flex items-center gap-2 mt-1">
                    ⚠️ No music file selected
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="text-sm text-gray-400">Estimated Fee</div>
                <div className="text-2xl font-bold text-green-400">
                  ${(() => {
                    const sizeCategory = lookupData?.entrySizeCategories.find(s => s.id === formData.entry_size_category_id);
                    const baseFee = Number(sizeCategory?.base_fee || 0);
                    const perParticipantFee = Number(sizeCategory?.per_participant_fee || 0);
                    return (baseFee + (perParticipantFee * formData.participants.length)).toFixed(2);
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => {
              const prevIndex = currentStepIndex - 1;
              if (prevIndex >= 0) {
                setCurrentStep(steps[prevIndex]);
              }
            }}
            disabled={currentStepIndex === 0}
            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>

          {currentStep !== 'review' ? (
            <button
              onClick={() => {
                const nextIndex = currentStepIndex + 1;
                if (nextIndex < steps.length) {
                  setCurrentStep(steps[nextIndex]);
                }
              }}
              disabled={
                (currentStep === 'basic' && (!formData.competition_id || !formData.studio_id || !formData.title)) ||
                (currentStep === 'details' && (!formData.category_id || !formData.classification_id || !formData.age_group_id || !formData.entry_size_category_id)) ||
                (currentStep === 'participants' && formData.participants.length === 0)
              }
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isEditMode
                ? (updateMutation.isPending ? 'Updating...' : 'Update Routine')
                : (createMutation.isPending ? 'Creating...' : 'Create Routine')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
