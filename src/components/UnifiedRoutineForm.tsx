'use client';

import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Dancer {
  id: string;
  name: string;
  age?: number;
  date_of_birth?: Date;
}

interface SelectedDancer {
  dancer_id: string;
  dancer_name: string;
  dancer_age?: number;
}

export default function UnifiedRoutineForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params for event locking
  const competitionParam = searchParams.get('competition');
  const reservationParam = searchParams.get('reservation');

  // Wizard step state
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [form, setForm] = useState({
    studio_id: '',
    competition_id: '',
    title: '',
    choreographer: '',
    category_id: '',
    classification_id: '',
    special_requirements: '',
  });

  // Title upgrade (for solos only)
  const [isTitleEntry, setIsTitleEntry] = useState(false);
  const TITLE_SURCHARGE = 30; // $30 for Title upgrade

  // Dancers state
  const [selectedDancers, setSelectedDancers] = useState<SelectedDancer[]>([]);
  const [dancerSortBy, setDancerSortBy] = useState<'name' | 'age'>('name');

  // Overrides for inferred values (Step 3)
  const [overrides, setOverrides] = useState({
    age_group_id: '',
    entry_size_category_id: '',
  });

  // Fetch data
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
  const { data: competitions } = trpc.competition.getAll.useQuery();
  const { data: studios } = trpc.studio.getAll.useQuery();
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();
  const { data: dancersData } = trpc.dancer.getAll.useQuery(
    { studioId: form.studio_id },
    { enabled: !!form.studio_id }
  );

  // Fetch reservation data
  const { data: reservation } = trpc.reservation.getById.useQuery(
    { id: reservationParam! },
    { enabled: !!reservationParam }
  );

  // Auto-select studio for studio directors
  useEffect(() => {
    if (!form.studio_id && currentUser?.role === 'studio_director' && currentUser.studio?.id) {
      setForm((f) => ({ ...f, studio_id: currentUser.studio!.id }));
    }
  }, [currentUser, form.studio_id]);

  // Auto-populate competition from URL param
  useEffect(() => {
    if (competitionParam && !form.competition_id) {
      setForm((f) => ({ ...f, competition_id: competitionParam }));
    }
  }, [competitionParam, form.competition_id]);

  // Inference logic - calculate age group and size from dancers
  const inferredAgeGroup = useMemo(() => {
    if (selectedDancers.length === 0 || !lookupData?.ageGroups) return null;

    // Get average age
    const ages = selectedDancers.filter(d => d.dancer_age).map(d => d.dancer_age!);
    if (ages.length === 0) return null;

    const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;

    // Find matching age group
    const ageGroup = lookupData.ageGroups.find((ag: any) => {
      return avgAge >= ag.min_age && avgAge <= ag.max_age;
    });

    return ageGroup || null;
  }, [selectedDancers, lookupData]);

  const inferredSizeCategory = useMemo(() => {
    if (selectedDancers.length === 0 || !lookupData?.entrySizeCategories) return null;

    const count = selectedDancers.length;

    // Find matching size category
    const sizeCategory = lookupData.entrySizeCategories.find((sc: any) => {
      return count >= sc.min_performers && count <= sc.max_performers;
    });

    return sizeCategory || null;
  }, [selectedDancers, lookupData]);

  // Create mutation
  const createMutation = trpc.entry.create.useMutation({
    onError: (error) => {
      toast.error(`Error creating routine: ${error.message}`);
    },
  });

  // Step 1 validation
  const canProceedToStep2 =
    !!form.title &&
    !!form.studio_id &&
    !!form.competition_id &&
    !!form.category_id &&
    !!form.classification_id;

  // Step 2 validation
  const canProceedToStep3 = selectedDancers.length > 0;

  // Final submission
  const handleSubmit = (destination: 'dashboard' | 'another') => {
    const ageGroupId = overrides.age_group_id || inferredAgeGroup?.id;
    const sizeCategoryId = overrides.entry_size_category_id || inferredSizeCategory?.id;

    if (!ageGroupId || !sizeCategoryId) {
      toast.error('Age group or size category could not be determined');
      return;
    }

    // Calculate fee from Competition Settings pricing
    const sizeCategory = lookupData?.entrySizeCategories?.find((sc: any) => sc.id === sizeCategoryId);
    const baseFee = sizeCategory?.base_fee ? Number(sizeCategory.base_fee) : 0;
    const perParticipantFee = sizeCategory?.per_participant_fee ? Number(sizeCategory.per_participant_fee) : 0;
    const titleFee = (selectedDancers.length === 1 && isTitleEntry) ? TITLE_SURCHARGE : 0;
    const calculatedFee = baseFee + (perParticipantFee * selectedDancers.length) + titleFee;

    createMutation.mutate({
      competition_id: form.competition_id,
      studio_id: form.studio_id,
      reservation_id: reservationParam || undefined,
      title: form.title,
      category_id: form.category_id,
      classification_id: form.classification_id,
      age_group_id: ageGroupId,
      entry_size_category_id: sizeCategoryId,
      choreographer: form.choreographer || undefined,
      special_requirements: form.special_requirements || undefined,
      entry_fee: calculatedFee,
      total_fee: calculatedFee,
      status: 'draft',
      participants: selectedDancers,
    } as any, {
      onSuccess: () => {
        toast.success('Routine created successfully!');
        if (destination === 'dashboard') {
          router.push('/dashboard/entries');
        } else {
          // Reset form for another entry
          setForm({
            ...form,
            title: '',
            choreographer: '',
            special_requirements: '',
          });
          setSelectedDancers([]);
          setOverrides({ age_group_id: '', entry_size_category_id: '' });
          setCurrentStep(1);
          toast.success('Ready to create another routine!', { duration: 2000 });
        }
      },
    });
  };

  // Calculate capacity
  const routinesUsed = reservation?.competition_entries?.length || 0;
  const routinesConfirmed = reservation?.spaces_confirmed || 0;
  const routinesRemaining = routinesConfirmed - routinesUsed;

  // Step navigation
  const goToStep2 = () => {
    if (!canProceedToStep2) {
      toast.error('Please fill all required fields');
      return;
    }
    setCurrentStep(2);
  };

  const goToStep3 = () => {
    if (!canProceedToStep3) {
      toast.error('Please add at least one dancer');
      return;
    }
    setCurrentStep(3);
  };

  return (
    <>
      <div className="max-w-4xl mx-auto pb-32">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentStep === step
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110'
                      : currentStep > step
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {currentStep > step ? '✓' : step}
                </div>
                <div className="text-sm">
                  <div className={`font-semibold ${currentStep === step ? 'text-white' : 'text-gray-400'}`}>
                    {step === 1 ? 'Basic Info' : step === 2 ? 'Add Dancers' : 'Review & Submit'}
                  </div>
                </div>
                {step < 3 && <div className="w-12 h-0.5 bg-white/20 mx-2"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Create New Routine</h1>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Routine Name *</label>
                  <input
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    placeholder="e.g. Firebird"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Choreographer</label>
                  <input
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    placeholder="Optional"
                    value={form.choreographer}
                    onChange={(e) => setForm({ ...form, choreographer: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Competition *
                    <span className="text-xs text-blue-400 ml-2">(Locked)</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    value={form.competition_id}
                    onChange={(e) => setForm({ ...form, competition_id: e.target.value })}
                    disabled={true}
                  >
                    <option value="" className="bg-gray-900">Select competition</option>
                    {competitions?.competitions?.map((c: any) => (
                      <option key={c.id} value={c.id} className="bg-gray-900">
                        {c.name} ({c.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Classification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Dance Category *</label>
                  <select
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="" className="bg-gray-900">Select category</option>
                    {lookupData?.categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id} className="bg-gray-900">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Classification *</label>
                  <select
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={form.classification_id}
                    onChange={(e) => setForm({ ...form, classification_id: e.target.value })}
                  >
                    <option value="" className="bg-gray-900">Select classification</option>
                    {lookupData?.classifications?.map((cl: any) => (
                      <option key={cl.id} value={cl.id} className="bg-gray-900">
                        {cl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Additional Details</h2>
              <label className="block text-sm text-gray-300 mb-1">Props / Special Requirements</label>
              <textarea
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                rows={3}
                placeholder="List any props or special requirements..."
                value={form.special_requirements}
                onChange={(e) => setForm({ ...form, special_requirements: e.target.value })}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={goToStep2}
                disabled={!canProceedToStep2}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Add Dancers →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Dancers */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Add Dancers</h1>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Select Dancers for "{form.title}"</h2>
                {dancersData?.dancers && dancersData.dancers.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-300">Sort by:</label>
                    <select
                      value={dancerSortBy}
                      onChange={(e) => setDancerSortBy(e.target.value as 'name' | 'age')}
                      className="px-3 py-1.5 bg-white/5 border border-white/20 rounded-lg text-white text-sm"
                    >
                      <option value="name" className="bg-gray-900">Name (A-Z)</option>
                      <option value="age" className="bg-gray-900">Age (Youngest First)</option>
                    </select>
                  </div>
                )}
              </div>

              {dancersData?.dancers && dancersData.dancers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...dancersData.dancers]
                    .sort((a, b) => {
                      if (dancerSortBy === 'name') {
                        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                        return nameA.localeCompare(nameB);
                      } else {
                        const ageA = a.date_of_birth
                          ? Math.floor((Date.now() - new Date(a.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                          : 999;
                        const ageB = b.date_of_birth
                          ? Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                          : 999;
                        return ageA - ageB;
                      }
                    })
                    .map((dancer: any) => {
                    const isSelected = selectedDancers.some(d => d.dancer_id === dancer.id);
                    const age = dancer.date_of_birth
                      ? Math.floor((Date.now() - new Date(dancer.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                      : undefined;

                    return (
                      <button
                        key={dancer.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDancers(selectedDancers.filter(d => d.dancer_id !== dancer.id));
                          } else {
                            setSelectedDancers([
                              ...selectedDancers,
                              {
                                dancer_id: dancer.id,
                                dancer_name: `${dancer.first_name} ${dancer.last_name}`,
                                dancer_age: age,
                              },
                            ]);
                          }
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-400 ring-2 ring-purple-400'
                            : 'bg-white/5 border-white/20 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold">
                              {dancer.first_name} {dancer.last_name}
                            </div>
                            {age && (
                              <div className="text-sm text-gray-400">Age: {age}</div>
                            )}
                          </div>
                          {isSelected && <span className="text-2xl">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No dancers found for this studio</p>
                  <button
                    onClick={() => router.push('/dashboard/dancers/add')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Add Dancers First
                  </button>
                </div>
              )}

              {selectedDancers.length > 0 && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                  <div className="text-sm text-blue-300 font-semibold mb-2">
                    Selected: {selectedDancers.length} dancer{selectedDancers.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-blue-200">
                    {selectedDancers.map(d => d.dancer_name).join(', ')}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20"
              >
                ← Back
              </button>
              <button
                onClick={goToStep3}
                disabled={!canProceedToStep3}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review & Submit →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Review & Submit</h1>
            <p className="text-gray-400">Review and edit any details before creating the routine</p>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Routine Details (Editable)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Routine Name</label>
                  <input
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Choreographer</label>
                  <input
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={form.choreographer}
                    onChange={(e) => setForm({ ...form, choreographer: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Dance Category</label>
                  <select
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="" className="bg-gray-900">Select category</option>
                    {lookupData?.categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id} className="bg-gray-900">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Classification</label>
                  <select
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={form.classification_id}
                    onChange={(e) => setForm({ ...form, classification_id: e.target.value })}
                  >
                    <option value="" className="bg-gray-900">Select classification</option>
                    {lookupData?.classifications?.map((cl: any) => (
                      <option key={cl.id} value={cl.id} className="bg-gray-900">
                        {cl.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Props / Special Requirements</label>
                  <textarea
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    rows={2}
                    value={form.special_requirements}
                    onChange={(e) => setForm({ ...form, special_requirements: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Selected Dancers</h2>
              <div className="text-sm text-gray-300">
                {selectedDancers.map(d => d.dancer_name).join(', ')}
                <span className="ml-2 text-white font-semibold">({selectedDancers.length} total)</span>
              </div>
            </div>

            {/* Title Upgrade (Solos Only) */}
            {selectedDancers.length === 1 && (
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    id="titleUpgrade"
                    checked={isTitleEntry}
                    onChange={(e) => setIsTitleEntry(e.target.checked)}
                    className="w-5 h-5 mt-1 rounded border-yellow-400/30 bg-white/10 checked:bg-yellow-500 focus:ring-yellow-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="titleUpgrade" className="text-lg font-bold text-white cursor-pointer block mb-2">
                      🏆 Title Routine Upgrade (+$30.00)
                    </label>
                    <p className="text-sm text-gray-300 mb-2">
                      Upgrade this solo routine to compete for Title awards at this competition.
                    </p>
                    <div className="text-xs text-yellow-300">
                      • Available for solo routines only<br/>
                      • Competes in Title division with enhanced recognition<br/>
                      • ${TITLE_SURCHARGE.toFixed(2)} surcharge applies
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Preview */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Routine Fee</h2>
              {(() => {
                const sizeCategoryId = overrides.entry_size_category_id || inferredSizeCategory?.id;
                const sizeCategory = lookupData?.entrySizeCategories?.find((sc: any) => sc.id === sizeCategoryId);
                const baseFee = sizeCategory?.base_fee ? Number(sizeCategory.base_fee) : 0;
                const perParticipantFee = sizeCategory?.per_participant_fee ? Number(sizeCategory.per_participant_fee) : 0;
                const titleFee = (selectedDancers.length === 1 && isTitleEntry) ? TITLE_SURCHARGE : 0;
                const totalFee = baseFee + (perParticipantFee * selectedDancers.length) + titleFee;

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Base Fee ({sizeCategory?.name || 'Unknown'})</span>
                      <span>${baseFee.toFixed(2)}</span>
                    </div>
                    {perParticipantFee > 0 && (
                      <div className="flex justify-between text-gray-300">
                        <span>Per Dancer ({selectedDancers.length} × ${perParticipantFee.toFixed(2)})</span>
                        <span>${(perParticipantFee * selectedDancers.length).toFixed(2)}</span>
                      </div>
                    )}
                    {titleFee > 0 && (
                      <div className="flex justify-between text-yellow-300">
                        <span>🏆 Title Upgrade</span>
                        <span>+${titleFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-green-400 pt-2 border-t border-green-400/30">
                      <span>Total</span>
                      <span>${totalFee.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      * Pricing from Competition Settings
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Inferred Values with Override Option */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Auto-Detected Classification
                <span className="text-sm text-purple-300 ml-2 font-normal">(you can override if needed)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Age Group</label>
                  <select
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={overrides.age_group_id || inferredAgeGroup?.id || ''}
                    onChange={(e) => setOverrides({ ...overrides, age_group_id: e.target.value })}
                  >
                    {!inferredAgeGroup && <option value="" className="bg-gray-900">Select age group</option>}
                    {lookupData?.ageGroups?.map((ag: any) => {
                      const isInferred = !overrides.age_group_id && inferredAgeGroup?.id === ag.id;
                      return (
                        <option key={ag.id} value={ag.id} className="bg-gray-900">
                          {isInferred ? `✨ ${ag.name} (auto-detected)` : ag.name}
                        </option>
                      );
                    })}
                  </select>
                  {inferredAgeGroup && !overrides.age_group_id && (
                    <div className="text-xs text-green-400 mt-1">
                      ✓ Based on average dancer age
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Group Size</label>
                  <select
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    value={overrides.entry_size_category_id || inferredSizeCategory?.id || ''}
                    onChange={(e) => setOverrides({ ...overrides, entry_size_category_id: e.target.value })}
                  >
                    {!inferredSizeCategory && <option value="" className="bg-gray-900">Select size</option>}
                    {lookupData?.entrySizeCategories?.map((sc: any) => {
                      const isInferred = !overrides.entry_size_category_id && inferredSizeCategory?.id === sc.id;
                      return (
                        <option key={sc.id} value={sc.id} className="bg-gray-900">
                          {isInferred ? `✨ ${sc.name} (auto-detected)` : sc.name}
                        </option>
                      );
                    })}
                  </select>
                  {inferredSizeCategory && !overrides.entry_size_category_id && (
                    <div className="text-xs text-green-400 mt-1">
                      ✓ Based on {selectedDancers.length} dancers selected
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmit('another')}
                  disabled={createMutation.isPending || (!inferredAgeGroup && !overrides.age_group_id) || (!inferredSizeCategory && !overrides.entry_size_category_id)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {createMutation.isPending ? 'Creating...' : '➕ Create & Start Another'}
                </button>
                <button
                  onClick={() => handleSubmit('dashboard')}
                  disabled={createMutation.isPending || (!inferredAgeGroup && !overrides.age_group_id) || (!inferredSizeCategory && !overrides.entry_size_category_id)}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {createMutation.isPending ? 'Creating...' : '✓ Create & Back to Dashboard'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Summary Bar (Fixed at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 border-t-2 border-purple-400/50 shadow-2xl z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Building Parameters */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <div>
                  <div className="text-xs text-gray-300 font-semibold uppercase">Routine Name</div>
                  <div className="text-sm font-bold text-white">
                    {form.title || '(not set)'}
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-white/20"></div>

              <div className="flex items-center gap-2">
                <span className="text-2xl">🎭</span>
                <div>
                  <div className="text-xs text-gray-300 font-semibold uppercase">Category</div>
                  <div className="text-sm font-bold text-white">
                    {form.category_id ? lookupData?.categories?.find((c: any) => c.id === form.category_id)?.name : '(not set)'}
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-white/20"></div>

              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-xs text-gray-300 font-semibold uppercase">Dancers</div>
                  <div className="text-sm font-bold text-white">
                    {selectedDancers.length > 0 ? `${selectedDancers.length} selected` : '(none yet)'}
                  </div>
                </div>
              </div>

              {inferredAgeGroup && (
                <>
                  <div className="h-8 w-px bg-white/20"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    <div>
                      <div className="text-xs text-green-300 font-semibold uppercase">Age Group ✨</div>
                      <div className="text-sm font-bold text-green-400">
                        {inferredAgeGroup.name}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {inferredSizeCategory && (
                <>
                  <div className="h-8 w-px bg-white/20"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔢</span>
                    <div>
                      <div className="text-xs text-green-300 font-semibold uppercase">Group Size ✨</div>
                      <div className="text-sm font-bold text-green-400">
                        {inferredSizeCategory.name}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs text-gray-300 font-semibold uppercase">Progress</div>
                <div className="text-sm font-bold text-white">
                  Step {currentStep} of 3
                </div>
              </div>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
