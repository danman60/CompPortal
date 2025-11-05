"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useEntryFormV2 } from '@/hooks/rebuild/useEntryFormV2';
import { RoutineDetailsSection } from './RoutineDetailsSection';
import { DancerSelectionSection } from './DancerSelectionSection';
import { AutoCalculatedSection } from './AutoCalculatedSection';
import { ExtendedTimeSection } from './ExtendedTimeSection';
import { ReservationContextBar } from './ReservationContextBar';
import { EntryFormActions } from './EntryFormActions';
import { ImportActions } from './ImportActions';
import { ClassificationRequestExceptionModal } from '@/components/ClassificationRequestExceptionModal';
import toast from 'react-hot-toast';

export function EntryCreateFormV2() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const reservationId = searchParams.get('reservation');
  const importSessionId = searchParams.get('importSession');

  // Load import session if present
  const { data: importSession, isLoading: importSessionLoading } = trpc.importSession.getById.useQuery(
    { id: importSessionId! },
    { enabled: !!importSessionId }
  );

  // Get current routine from import session
  const currentRoutine = importSession && !importSession.completed
    ? (importSession.routines as any[])[importSession.current_index]
    : null;

  // Use session's reservation if in import mode, otherwise use query param
  const actualReservationId = importSessionId && importSession
    ? importSession.reservation_id
    : reservationId;

  const { data: reservation, isLoading: reservationLoading } = trpc.reservation.getById.useQuery(
    { id: actualReservationId! },
    { enabled: !!actualReservationId }
  );

  const { data: competition, isLoading: competitionLoading } = trpc.competition.getById.useQuery(
    { id: reservation?.competition_id! },
    { enabled: !!reservation?.competition_id }
  );

  const { data: lookups, isLoading: lookupsLoading } = trpc.lookup.getAllForEntry.useQuery();

  const { data: dancersData, isLoading: dancersLoading } = trpc.dancer.getByStudio.useQuery(
    { studioId: reservation?.studio_id! },
    { enabled: !!reservation?.studio_id }
  );

  // Calculate capacity (must be before early returns - Rules of Hooks)
  const { data: entriesData } = trpc.entry.getAll.useQuery();

  const dancers = (dancersData?.dancers || []) as any[];

  // Age calculation uses December 31st of competition year (not competition date)
  const eventStartDate = competition?.competition_start_date
    ? new Date(new Date(competition.competition_start_date).getFullYear(), 11, 31) // Dec 31st
    : null;

  const formHook = useEntryFormV2({
    eventStartDate,
    ageGroups: lookups?.ageGroups || [],
    sizeCategories: lookups?.entrySizeCategories || [],
  });

  // Pre-fill form from import session
  useEffect(() => {
    if (!currentRoutine || !dancers.length || !eventStartDate) return;

    // Pre-fill title and choreographer
    formHook.updateField('title', currentRoutine.title || '');
    if (currentRoutine.choreographer) {
      formHook.updateField('choreographer', currentRoutine.choreographer);
    }
    if (currentRoutine.props) {
      formHook.updateField('special_requirements', currentRoutine.props);
    }

    // Helper to calculate age
    const calculateAge = (dateOfBirth: string | null): number | null => {
      if (!dateOfBirth || !eventStartDate) return null;
      const dob = new Date(dateOfBirth);
      const diffMs = eventStartDate.getTime() - dob.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return Math.floor(diffDays / 365.25);
    };

    // Pre-select dancers with properly formatted objects
    const matchedDancerIds = new Set(currentRoutine.matched_dancers.map((d: any) => d.dancer_id));
    dancers.forEach(dancer => {
      if (matchedDancerIds.has(dancer.id) && !formHook.form.selectedDancers.some(d => d.dancer_id === dancer.id)) {
        const fullName = `${dancer.first_name} ${dancer.last_name}`;
        const age = calculateAge(dancer.date_of_birth);

        formHook.toggleDancer({
          dancer_id: dancer.id,
          dancer_name: fullName,
          dancer_age: age,
          date_of_birth: dancer.date_of_birth,
          classification_id: dancer.classification_id,
        });
      }
    });
  }, [currentRoutine?.title, dancers.length, eventStartDate]); // Only run when routine or dancers change

  // Production Auto-Lock: Bi-directional locking between Production dance category and Production size category
  useEffect(() => {
    if (!lookups) return;

    const productionCategory = lookups.categories.find(c => c.name === 'Production');
    const productionSizeCategory = lookups.entrySizeCategories.find(c => c.name === 'Production');
    const isProductionCategory = productionCategory && formHook.form.category_id === productionCategory.id;
    const isProductionSize = formHook.effectiveSizeCategory?.name === 'Production';

    // If Production dance category selected → lock size category to Production
    if (isProductionCategory && productionSizeCategory && formHook.form.size_category_override !== productionSizeCategory.id) {
      formHook.updateField('size_category_override', productionSizeCategory.id);
    }

    // If Production size category detected → lock dance category to Production
    if (isProductionSize && productionCategory && formHook.form.category_id !== productionCategory.id) {
      formHook.updateField('category_id', productionCategory.id);
    }

    // Lock classification to Production when either condition is true
    if ((isProductionCategory || isProductionSize)) {
      const productionClass = lookups.classifications.find(c => c.name === 'Production');
      if (productionClass && formHook.form.classification_id !== productionClass.id) {
        formHook.updateField('classification_id', productionClass.id);
      }
    }
  }, [
    formHook.effectiveSizeCategory,
    formHook.form.category_id,
    formHook.form.size_category_override,
    formHook.form.classification_id,
    lookups
  ]);

  const createMutation = trpc.entry.create.useMutation({
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const updateIndexMutation = trpc.importSession.updateIndex.useMutation();
  const deleteRoutineMutation = trpc.importSession.deleteRoutine.useMutation();
  const markCompleteMutation = trpc.importSession.markComplete.useMutation();

  if (!actualReservationId && !importSessionId) {
    return (
      <div className="max-w-4xl mx-auto mt-20 bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-red-300 mb-4">Missing Reservation</h2>
        <button onClick={() => router.push('/dashboard/entries')} className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg">
          Back to Entries
        </button>
      </div>
    );
  }

  if (reservationLoading || competitionLoading || lookupsLoading || dancersLoading || importSessionLoading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center text-white">
        Loading form...
      </div>
    );
  }

  if (!reservation || !competition || !lookups) {
    return (
      <div className="max-w-4xl mx-auto mt-20 bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-red-300 mb-4">Invalid Data</h2>
        <button onClick={() => router.push('/dashboard/entries')} className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg">
          Back to Entries
        </button>
      </div>
    );
  }

  // Calculate capacity (Phase 1 spec lines 513-521)
  const reservationEntries = entriesData?.entries?.filter(
    (e: any) => e.reservation_id === reservationId && e.status !== 'cancelled'
  ) || [];
  const confirmedSpaces = reservation?.spaces_confirmed || 0;
  const entriesCount = reservationEntries.length;
  const remainingSpaces = confirmedSpaces - entriesCount;

  const handleSave = async (action: any) => {
    if (action === 'cancel') {
      router.push('/dashboard/entries');
      return;
    }

    try {
      await createMutation.mutateAsync({
        reservation_id: actualReservationId!,
        competition_id: reservation.competition_id,
        studio_id: reservation.studio_id,
        title: formHook.form.title,
        choreographer: formHook.form.choreographer || '', // Phase 2: required
        category_id: formHook.form.category_id,
        classification_id: formHook.form.classification_id,
        special_requirements: formHook.form.special_requirements || undefined,
        age_group_id: formHook.effectiveAgeGroup?.id,
        entry_size_category_id: formHook.effectiveSizeCategory?.id,
        is_title_upgrade: formHook.form.is_title_upgrade,
        // Phase 2 spec lines 324-373: Extended time fields
        extended_time_requested: formHook.form.extended_time_requested,
        routine_length_minutes: formHook.form.extended_time_requested ? formHook.form.routine_length_minutes : undefined,
        routine_length_seconds: formHook.form.extended_time_requested ? formHook.form.routine_length_seconds : undefined,
        scheduling_notes: formHook.form.scheduling_notes || undefined,
        status: 'draft',
        participants: formHook.form.selectedDancers.map((d, idx) => ({
          dancer_id: d.dancer_id,
          dancer_name: d.dancer_name,
          dancer_age: d.dancer_age || undefined,
          display_order: idx,
        })),
      });

      // Show success toast
      toast.success('Routine saved successfully!');

      if (action === 'save') {
        router.push('/dashboard/entries');
      } else if (action === 'save-another') {
        formHook.resetForm();
      } else if (action === 'save-like-this') {
        formHook.resetDetailsOnly();
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
      toast.error('Failed to save routine. Please try again.');
    }
  };

  // Import mode handlers
  const handleSaveAndNext = async () => {
    try {
      // Save the entry
      await createMutation.mutateAsync({
        reservation_id: actualReservationId!,
        competition_id: reservation!.competition_id,
        studio_id: reservation!.studio_id,
        title: formHook.form.title,
        choreographer: formHook.form.choreographer || '',
        category_id: formHook.form.category_id,
        classification_id: formHook.form.classification_id,
        special_requirements: formHook.form.special_requirements || undefined,
        age_group_id: formHook.effectiveAgeGroup?.id,
        entry_size_category_id: formHook.effectiveSizeCategory?.id,
        is_title_upgrade: formHook.form.is_title_upgrade,
        extended_time_requested: formHook.form.extended_time_requested,
        routine_length_minutes: formHook.form.extended_time_requested ? formHook.form.routine_length_minutes : undefined,
        routine_length_seconds: formHook.form.extended_time_requested ? formHook.form.routine_length_seconds : undefined,
        scheduling_notes: formHook.form.scheduling_notes || undefined,
        status: 'draft',
        participants: formHook.form.selectedDancers.map((d, idx) => ({
          dancer_id: d.dancer_id,
          dancer_name: d.dancer_name,
          dancer_age: d.dancer_age || undefined,
          display_order: idx,
        })),
      });

      toast.success('Routine saved!');

      // Move to next routine or complete
      const nextIndex = importSession!.current_index + 1;
      if (nextIndex >= importSession!.total_routines) {
        // Mark session as complete
        await markCompleteMutation.mutateAsync({ id: importSessionId! });
        toast.success('Import complete!');
        router.push('/dashboard/entries');
      } else {
        // Update index and reload
        await updateIndexMutation.mutateAsync({ id: importSessionId!, current_index: nextIndex });
        formHook.resetForm();
        router.replace(`/dashboard/entries/create?importSession=${importSessionId}`);
      }
    } catch (error: any) {
      console.error('Failed to save and move to next:', error);
      toast.error(`Failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleSkipRoutine = async () => {
    try {
      const nextIndex = importSession!.current_index + 1;
      if (nextIndex >= importSession!.total_routines) {
        await markCompleteMutation.mutateAsync({ id: importSessionId! });
        toast.success('Import complete!');
        router.push('/dashboard/entries');
      } else {
        await updateIndexMutation.mutateAsync({ id: importSessionId!, current_index: nextIndex });
        formHook.resetForm();
        router.replace(`/dashboard/entries/create?importSession=${importSessionId}`);
      }
    } catch (error: any) {
      toast.error(`Failed to skip: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteRoutine = async () => {
    try {
      await deleteRoutineMutation.mutateAsync({
        id: importSessionId!,
        routine_index: importSession!.current_index,
      });

      toast.success('Routine deleted from import queue');

      // Check if there are any routines left
      const routines = importSession!.routines as any[];
      if (routines.length <= 1) {
        // This was the last routine
        await markCompleteMutation.mutateAsync({ id: importSessionId! });
        toast.success('Import complete!');
        router.push('/dashboard/entries');
      } else {
        // Reload to show next routine (index stays the same since we deleted current)
        formHook.resetForm();
        router.replace(`/dashboard/entries/create?importSession=${importSessionId}`);
      }
    } catch (error: any) {
      toast.error(`Failed to delete: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ReservationContextBar
        reservation={reservation}
        competition={competition}
        confirmedSpaces={confirmedSpaces}
        entriesCount={entriesCount}
        remainingSpaces={remainingSpaces}
      />

      <RoutineDetailsSection
        form={formHook.form}
        updateField={formHook.updateField}
        categories={lookups.categories}
        classifications={lookups.classifications}
      />

      <DancerSelectionSection
        dancers={dancers}
        selectedDancers={formHook.form.selectedDancers}
        toggleDancer={formHook.toggleDancer}
        eventStartDate={eventStartDate}
      />

      <AutoCalculatedSection
        calculatedAge={formHook.calculatedAge}
        allowedAges={formHook.allowedAges}
        effectiveAge={formHook.effectiveAge}
        inferredAgeGroup={formHook.inferredAgeGroup}
        inferredSizeCategory={formHook.inferredSizeCategory}
        effectiveAgeGroup={formHook.effectiveAgeGroup}
        effectiveSizeCategory={formHook.effectiveSizeCategory}
        form={formHook.form}
        updateField={formHook.updateField}
        sizeCategoryOverride={formHook.form.size_category_override}
        setSizeCategoryOverride={(id) => formHook.updateField('size_category_override', id)}
        ageGroups={lookups.ageGroups}
        sizeCategories={lookups.entrySizeCategories}
        selectedDancerCount={formHook.form.selectedDancers.length}
        selectedDancers={formHook.form.selectedDancers}
        classifications={lookups.classifications}
        classificationId={formHook.form.classification_id}
        setClassificationId={(id) => formHook.updateField('classification_id', id)}
        onRequestClassificationException={() => setShowClassificationModal(true)}
      />

      {/* Extended Time Section - Phase 2 spec lines 324-373 */}
      <ExtendedTimeSection
        form={formHook.form}
        updateField={formHook.updateField}
        effectiveSizeCategory={formHook.effectiveSizeCategory}
        selectedDancerCount={formHook.form.selectedDancers.length}
      />

      {/* Title Upgrade Option - Only for Solos (Nov 4 transcript lines 820-844) */}
      {formHook.form.selectedDancers.length === 1 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={formHook.form.is_title_upgrade}
              onChange={(e) => formHook.updateField('is_title_upgrade', e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-purple-400/50 bg-white/10
                       checked:bg-purple-500 checked:border-purple-500
                       focus:ring-2 focus:ring-purple-500/50 cursor-pointer
                       transition-all duration-200"
            />
            <div className="flex-1">
              <div className="text-white font-medium group-hover:text-purple-300 transition-colors">
                Title Upgrade (+$30)
              </div>
              <div className="text-sm text-gray-300 mt-1">
                Select if this routine is competing for title. Additional $30 fee applies. Only available for solos.
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Show different actions based on mode */}
      {importSessionId && importSession ? (
        <ImportActions
          canSave={formHook.canSave}
          isLoading={createMutation.isPending}
          validationErrors={formHook.validationErrors}
          currentIndex={importSession.current_index}
          totalRoutines={importSession.total_routines}
          onSaveAndNext={handleSaveAndNext}
          onSkip={handleSkipRoutine}
          onDelete={handleDeleteRoutine}
        />
      ) : (
        <EntryFormActions
          canSave={formHook.canSave}
          isLoading={createMutation.isPending}
          validationErrors={formHook.validationErrors}
          onSave={handleSave}
        />
      )}

      {/* Classification Exception Modal - Placeholder for Phase 2 */}
      {/* TODO: Pass actual entryId and classification data when Phase 2 is implemented */}
      {showClassificationModal && lookups.classifications && lookups.classifications.length > 0 && (
        <ClassificationRequestExceptionModal
          entryId="" // Placeholder - will be filled when entry is created
          autoCalculatedClassification={{
            id: lookups.classifications[0].id,
            name: lookups.classifications[0].name,
          }}
          onClose={() => setShowClassificationModal(false)}
          onSuccess={() => {
            toast.success('Classification exception feature coming in Phase 2');
            setShowClassificationModal(false);
          }}
        />
      )}
    </div>
  );
}
