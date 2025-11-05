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
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const reservationId = searchParams.get('reservation');
  const importSessionId = searchParams.get('importSession');

  // Load import session if present
  const { data: importSession, isLoading: importSessionLoading } = trpc.importSession.getById.useQuery(
    { id: importSessionId! },
    { enabled: !!importSessionId }
  );

  // Get current routine from import session
  const currentRoutine = importSession && !importSession.completed
    ? (importSession.routines as any[])[importSession.current_index ?? 0]
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
    // Only run this effect if we're in import mode (have currentRoutine)
    if (!currentRoutine) return;
    if (!dancers.length || !eventStartDate) return;

    // Clear previous selections when switching routines
    if (formHook.form.selectedDancers.length > 0) {
      // Clear all dancers first
      formHook.form.selectedDancers.forEach(d => {
        formHook.toggleDancer(d);
      });
    }

    // Pre-fill title and choreographer
    formHook.updateField('title', currentRoutine.title || '');
    if (currentRoutine.choreographer) {
      formHook.updateField('choreographer', currentRoutine.choreographer);
    }
    if (currentRoutine.props) {
      formHook.updateField('special_requirements', currentRoutine.props);
    }

    // Pre-fill dance category if present in CSV (check all possible field names)
    const categoryValue = currentRoutine.category || currentRoutine['dance category'] ||
                          currentRoutine.genre || currentRoutine.style || currentRoutine.type;

    if (categoryValue && lookups) {
      const matchedCategory = lookups.categories.find(cat =>
        cat.name.toLowerCase() === categoryValue.toLowerCase()
      );
      if (matchedCategory) {
        formHook.updateField('category_id', matchedCategory.id);
      } else {
        // CSV had category value but no match found - clear it
        formHook.updateField('category_id', '');
      }
    }
    // Don't clear category_id if no CSV value - user may have selected manually

    // Helper to calculate age
    const calculateAge = (dateOfBirth: string | null): number | null => {
      if (!dateOfBirth || !eventStartDate) return null;
      const dob = new Date(dateOfBirth);
      const diffMs = eventStartDate.getTime() - dob.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return Math.floor(diffDays / 365.25);
    };

    // Pre-select matched dancers
    if (currentRoutine.matched_dancers && currentRoutine.matched_dancers.length > 0) {
      const matchedDancerIds = new Set(currentRoutine.matched_dancers.map((d: any) => d.dancer_id));
      dancers.forEach(dancer => {
        if (matchedDancerIds.has(dancer.id)) {
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
    }
  }, [currentRoutine?.title, importSession?.current_index, dancers.length, eventStartDate, lookups]); // Trigger on routine change or lookups load

  // Production Auto-Lock: Lock size category and classification when Production dance category selected
  useEffect(() => {
    if (!lookups) return;

    const productionCategory = lookups.categories.find(c => c.name === 'Production');
    const productionSizeCategory = lookups.entrySizeCategories.find(c => c.name === 'Production');
    const isProductionCategory = productionCategory && formHook.form.category_id === productionCategory.id;

    // If Production dance category selected → lock size category AND classification to Production
    if (isProductionCategory) {
      // Lock size category to Production
      if (productionSizeCategory && formHook.form.size_category_override !== productionSizeCategory.id) {
        formHook.updateField('size_category_override', productionSizeCategory.id);
      }

      // Lock classification to Production
      const productionClass = lookups.classifications.find(c => c.name === 'Production');
      if (productionClass && formHook.form.classification_id !== productionClass.id) {
        formHook.updateField('classification_id', productionClass.id);
      }
    }
  }, [
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
      // Use auto-calculated classification if "Use detected" is selected (empty string)
      const effectiveClassificationId = formHook.form.classification_id || formHook.autoCalculatedClassification || '';

      await createMutation.mutateAsync({
        reservation_id: actualReservationId!,
        competition_id: reservation.competition_id,
        studio_id: reservation.studio_id,
        title: formHook.form.title,
        choreographer: formHook.form.choreographer || '', // Phase 2: required
        category_id: formHook.form.category_id,
        classification_id: effectiveClassificationId,
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
      // Use auto-calculated classification if "Use detected" is selected (empty string)
      const effectiveClassificationId = formHook.form.classification_id || formHook.autoCalculatedClassification || '';

      // Save the entry
      await createMutation.mutateAsync({
        reservation_id: actualReservationId!,
        competition_id: reservation!.competition_id,
        studio_id: reservation!.studio_id,
        title: formHook.form.title,
        choreographer: formHook.form.choreographer || '',
        category_id: formHook.form.category_id,
        classification_id: effectiveClassificationId,
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
      const nextIndex = (importSession!.current_index ?? 0) + 1;
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
      const nextIndex = (importSession!.current_index ?? 0) + 1;
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
        routine_index: importSession!.current_index ?? 0,
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

  // Handle classification exception request - save entry first, then show modal
  const handleRequestClassificationException = async () => {
    try {
      // Use auto-calculated classification if "Use detected" is selected (empty string)
      const effectiveClassificationId = formHook.form.classification_id || formHook.autoCalculatedClassification || '';

      // Save the entry first
      const result = await createMutation.mutateAsync({
        reservation_id: actualReservationId!,
        competition_id: reservation!.competition_id,
        studio_id: reservation!.studio_id,
        title: formHook.form.title,
        choreographer: formHook.form.choreographer || '',
        category_id: formHook.form.category_id,
        classification_id: effectiveClassificationId,
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

      // Store the saved entry ID and show exception modal
      setSavedEntryId(result.id);
      setShowClassificationModal(true);
    } catch (error: any) {
      console.error('Failed to save entry for exception request:', error);
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
      >
        ← Back
      </button>

      <ReservationContextBar
        reservation={reservation}
        competition={competition}
        confirmedSpaces={confirmedSpaces}
        entriesCount={entriesCount}
        remainingSpaces={remainingSpaces}
      />

      {/* Import Progress - Show at top when in import mode */}
      {importSessionId && importSession && (
        <ImportActions
          canSave={formHook.canSave}
          isLoading={createMutation.isPending}
          validationErrors={formHook.validationErrors}
          currentIndex={importSession.current_index ?? 0}
          totalRoutines={importSession.total_routines}
          onSaveAndNext={handleSaveAndNext}
          onSkip={handleSkipRoutine}
          onDelete={handleDeleteRoutine}
        />
      )}

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
        onRequestClassificationException={handleRequestClassificationException}
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

      {/* Show save/cancel actions for normal (non-import) mode */}
      {!importSessionId && (
        <EntryFormActions
          canSave={formHook.canSave}
          isLoading={createMutation.isPending}
          validationErrors={formHook.validationErrors}
          onSave={handleSave}
        />
      )}

      {/* Import Progress - Also show at bottom when in import mode */}
      {importSessionId && importSession && (
        <ImportActions
          canSave={formHook.canSave}
          isLoading={createMutation.isPending}
          validationErrors={formHook.validationErrors}
          currentIndex={importSession.current_index ?? 0}
          totalRoutines={importSession.total_routines}
          onSaveAndNext={handleSaveAndNext}
          onSkip={handleSkipRoutine}
          onDelete={handleDeleteRoutine}
        />
      )}

      {/* Classification Exception Modal */}
      {showClassificationModal && formHook.autoCalculatedClassification && savedEntryId && (
        <ClassificationRequestExceptionModal
          entryId={savedEntryId}
          autoCalculatedClassification={
            formHook.autoCalculatedClassification
              ? {
                  id: formHook.autoCalculatedClassification,
                  name: lookups?.classifications.find(c => c.id === formHook.autoCalculatedClassification)?.name || 'Unknown',
                }
              : { id: '', name: '' }
          }
          onClose={() => {
            setShowClassificationModal(false);
            setSavedEntryId(null);
          }}
          onSuccess={() => {
            toast.success('Exception request submitted');
            setShowClassificationModal(false);
            setSavedEntryId(null);

            // If in import mode, stay on import flow; otherwise go to entries list
            if (importSessionId) {
              // Stay on current page (import flow continues)
              formHook.resetForm();
            } else {
              // Manual entry - go back to entries list
              router.push('/dashboard/entries');
            }
          }}
        />
      )}
    </div>
  );
}
