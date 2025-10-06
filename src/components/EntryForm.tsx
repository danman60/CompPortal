'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';

type Step = 'basic' | 'details' | 'participants' | 'props' | 'review';

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
    props_required: '',
    special_requirements: '',
    participants: [] as Array<{ dancer_id: string; dancer_name: string; role?: string }>,
  });

  // Props state
  const [propsUsed, setPropsUsed] = useState<'no' | 'yes'>('no');

  // Fetch all necessary data
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
  const { data: competitions } = trpc.competition.getAll.useQuery();
  const { data: studios } = trpc.studio.getAll.useQuery();
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();
  const { data: dancers } = trpc.dancer.getAll.useQuery({ studioId: formData.studio_id || undefined });

  // Determine if user is a studio director
  const isStudioDirector = currentUser?.role === 'studio_director';
  const userStudio = currentUser?.studio;

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

  // Auto-set studio for Studio Directors
  useEffect(() => {
    if (isStudioDirector && userStudio && !formData.studio_id && !isEditMode) {
      setFormData((prev) => ({ ...prev, studio_id: userStudio.id }));
    }
  }, [isStudioDirector, userStudio, formData.studio_id, isEditMode]);

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
        props_required: existingEntry.props_required || '',
        special_requirements: existingEntry.special_requirements || '',
        participants: existingEntry.entry_participants?.map((p) => ({
          dancer_id: p.dancer_id,
          dancer_name: `${p.dancers?.first_name} ${p.dancers?.last_name}`,
          role: p.role || undefined,
        })) || [],
      });
      // Set props state based on existing entry
      if (existingEntry.props_required) {
        setPropsUsed('yes');
      }
    }
  }, [existingEntry, isEditMode]);

  const createMutation = trpc.entry.create.useMutation({
    onSuccess: async (data) => {
      router.push('/dashboard/entries');
    },
    onError: (error) => {
      alert(`Error creating entry: ${error.message}`);
    },
  });

  const updateMutation = trpc.entry.update.useMutation({
    onSuccess: async (data) => {
      router.push(`/dashboard/entries/${entryId}`);
    },
    onError: (error) => {
      alert(`Error updating entry: ${error.message}`);
    },
  });

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

  const steps: Step[] = ['basic', 'details', 'participants', 'props', 'review'];
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
                <option value="" className="bg-gray-900 text-white">Select Event</option>
                {competitions?.competitions.map((comp) => (
                  <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                    {comp.name} ({comp.year})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Studio *
              </label>
              {isStudioDirector && userStudio ? (
                <div className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Studio (locked)</div>
                  <div className="text-white font-semibold">{userStudio.name}</div>
                  <input type="hidden" name="studio_id" value={userStudio.id} />
                </div>
              ) : (
                <select
                  value={formData.studio_id}
                  onChange={(e) => setFormData({ ...formData, studio_id: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="" className="bg-gray-900 text-white">Select Studio</option>
                  {studios?.studios.map((studio) => (
                    <option key={studio.id} value={studio.id} className="bg-gray-900 text-white">
                      {studio.name}
                    </option>
                  ))}
                </select>
              )}
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
                <option value="" className="bg-gray-900 text-white">Select Category</option>
                {lookupData?.categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-gray-900 text-white">
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
                <option value="" className="bg-gray-900 text-white">Select Classification</option>
                {lookupData?.classifications.map((cls) => (
                  <option key={cls.id} value={cls.id} className="bg-gray-900 text-white">
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
                <option value="" className="bg-gray-900 text-white">Select Age Group</option>
                {lookupData?.ageGroups.map((age) => (
                  <option key={age.id} value={age.id} className="bg-gray-900 text-white">
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
                <option value="" className="bg-gray-900 text-white">Select Routine Size</option>
                {lookupData?.entrySizeCategories.map((size) => (
                  <option key={size.id} value={size.id} className="bg-gray-900 text-white">
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
                  className="w-full px-4 py-2 bg-gray-900 text-white border border-white/20 rounded-lg focus:border-blue-400 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" className="bg-gray-900 text-white">-- Select a routine to copy dancers --</option>
                  {existingEntries.entries.map((entry) => (
                    <option key={entry.id} value={entry.id} className="bg-gray-900 text-white">
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

              {/* Selected Dancers */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Selected Dancers ({formData.participants.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {formData.participants.map((participant) => (
                    <div
                      key={participant.dancer_id}
                      className="flex items-center justify-between p-3 bg-purple-500/20 border-2 border-purple-400 rounded-lg"
                    >
                      <span className="text-white font-medium">{participant.dancer_name}</span>
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            participants: formData.participants.filter(p => p.dancer_id !== participant.dancer_id),
                          });
                        }}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        type="button"
                      >
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {formData.participants.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-lg">
                      <p className="text-gray-400 mb-2">No dancers selected</p>
                      <p className="text-sm text-gray-500">Click dancers from the left to add them</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-400/30 p-4 rounded-lg">
              <p className="text-purple-300 text-sm">
                ✓ {formData.participants.length} dancer(s) selected
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Props */}
        {currentStep === 'props' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Props & Additional Info</h2>

            {/* Props Section */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Props Used
              </label>
              <select
                value={propsUsed}
                onChange={(e) => {
                  const value = e.target.value as 'no' | 'yes';
                  setPropsUsed(value);
                  if (value === 'no') {
                    setFormData({ ...formData, props_required: '' });
                  }
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="no" className="bg-gray-900 text-white">No props</option>
                <option value="yes" className="bg-gray-900 text-white">Yes - props used</option>
              </select>
            </div>

            {propsUsed === 'yes' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Props Description
                </label>
                <textarea
                  value={formData.props_required}
                  onChange={(e) => setFormData({ ...formData, props_required: e.target.value })}
                  placeholder="Describe props (e.g., chairs, ribbons, hats, scarves)"
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                ℹ️ <strong>Note:</strong> Music files can be uploaded after creating the routine via the dedicated music upload page.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Special Requirements
              </label>
              <textarea
                value={formData.special_requirements}
                onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                placeholder="Any special requirements or accessibility needs..."
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

              {/* Props Information */}
              <div>
                <div className="text-sm text-gray-400">Props</div>
                {formData.props_required ? (
                  <div className="text-white mb-1">
                    ✓ {formData.props_required}
                  </div>
                ) : (
                  <div className="text-gray-500 mb-1">No props</div>
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
