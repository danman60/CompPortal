'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';

type Step = 'basic' | 'details' | 'participants' | 'music' | 'review';

interface EntryFormProps {
  entryId?: string;
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

  // Fetch all necessary data
  const { data: competitions } = trpc.competition.getAll.useQuery();
  const { data: studios } = trpc.studio.getAll.useQuery();
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();
  const { data: dancers } = trpc.dancer.getAll.useQuery({ studioId: formData.studio_id || undefined });

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
    }
  }, [existingEntry, isEditMode]);

  const createMutation = trpc.entry.create.useMutation({
    onSuccess: (data) => {
      router.push('/dashboard/entries');
    },
    onError: (error) => {
      alert(`Error creating entry: ${error.message}`);
    },
  });

  const updateMutation = trpc.entry.update.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/entries/${entryId}`);
    },
    onError: (error) => {
      alert(`Error updating entry: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    // Calculate entry fee based on entry size category
    const sizeCategory = lookupData?.entrySizeCategories.find(s => s.id === formData.entry_size_category_id);
    const baseFee = Number(sizeCategory?.base_fee || 0);
    const perParticipantFee = Number(sizeCategory?.per_participant_fee || 0);
    const totalFee = baseFee + (perParticipantFee * formData.participants.length);

    const entryData = {
      ...formData,
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
                Competition *
              </label>
              <select
                value={formData.competition_id}
                onChange={(e) => setFormData({ ...formData, competition_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Competition</option>
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
                Entry Size *
              </label>
              <select
                value={formData.entry_size_category_id}
                onChange={(e) => setFormData({ ...formData, entry_size_category_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Entry Size</option>
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

            <div className="bg-black/20 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-300">
                Select dancers from {studios?.studios.find(s => s.id === formData.studio_id)?.name}
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dancers?.dancers.map((dancer) => {
                const isSelected = formData.participants.some(p => p.dancer_id === dancer.id);
                return (
                  <div
                    key={dancer.id}
                    onClick={() => {
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          participants: formData.participants.filter(p => p.dancer_id !== dancer.id),
                        });
                      } else {
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
                      }
                    }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-400'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-semibold">
                          {dancer.first_name} {dancer.last_name}
                        </div>
                        {dancer.date_of_birth && (
                          <div className="text-sm text-gray-400">
                            Age: {new Date().getFullYear() - new Date(dancer.date_of_birth).getFullYear()}
                          </div>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'bg-purple-500 border-purple-400' : 'border-white/40'
                      }`}>
                        {isSelected && <span className="text-white text-sm">✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-blue-500/10 border border-blue-400/30 p-4 rounded-lg">
              <p className="text-blue-300 text-sm">
                Selected: {formData.participants.length} dancer(s)
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Music */}
        {currentStep === 'music' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Music & Additional Info</h2>

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
            <h2 className="text-2xl font-bold text-white mb-6">Review Entry</h2>

            <div className="bg-black/20 p-6 rounded-lg space-y-4">
              <div>
                <div className="text-sm text-gray-400">Competition</div>
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

              {formData.music_title && (
                <div>
                  <div className="text-sm text-gray-400">Music</div>
                  <div className="text-white">
                    {formData.music_title} {formData.music_artist && `by ${formData.music_artist}`}
                  </div>
                </div>
              )}

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
                ? (updateMutation.isPending ? 'Updating...' : 'Update Entry')
                : (createMutation.isPending ? 'Creating...' : 'Create Entry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
