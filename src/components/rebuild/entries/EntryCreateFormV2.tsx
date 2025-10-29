"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useEntryFormV2 } from '@/hooks/rebuild/useEntryFormV2';
import { RoutineDetailsSection } from './RoutineDetailsSection';
import { DancerSelectionSection } from './DancerSelectionSection';
import { AutoCalculatedSection } from './AutoCalculatedSection';
import { ReservationContextBar } from './ReservationContextBar';
import { EntryFormActions } from './EntryFormActions';
import toast from 'react-hot-toast';

export function EntryCreateFormV2() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get('reservation');

  const { data: reservation, isLoading: reservationLoading } = trpc.reservation.getById.useQuery(
    { id: reservationId! },
    { enabled: !!reservationId }
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

  const eventStartDate = competition?.competition_start_date ? new Date(competition.competition_start_date) : null;

  const formHook = useEntryFormV2({
    eventStartDate,
    ageGroups: lookups?.ageGroups || [],
    sizeCategories: lookups?.entrySizeCategories || [],
  });

  const createMutation = trpc.entry.create.useMutation({
    onSuccess: () => {
      toast.success('Entry created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  if (!reservationId) {
    return (
      <div className="max-w-4xl mx-auto mt-20 bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-red-300 mb-4">Missing Reservation</h2>
        <button onClick={() => router.push('/dashboard/entries')} className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg">
          Back to Entries
        </button>
      </div>
    );
  }

  if (reservationLoading || competitionLoading || lookupsLoading || dancersLoading) {
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
        reservation_id: reservationId,
        competition_id: reservation.competition_id,
        studio_id: reservation.studio_id,
        title: formHook.form.title,
        choreographer: formHook.form.choreographer || undefined,
        category_id: formHook.form.category_id,
        classification_id: formHook.form.classification_id,
        special_requirements: formHook.form.special_requirements || undefined,
        age_group_id: formHook.effectiveAgeGroup?.id,
        entry_size_category_id: formHook.effectiveSizeCategory?.id,
        is_title_upgrade: formHook.form.is_title_upgrade,
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
        inferredAgeGroup={formHook.inferredAgeGroup}
        inferredSizeCategory={formHook.inferredSizeCategory}
        effectiveAgeGroup={formHook.effectiveAgeGroup}
        effectiveSizeCategory={formHook.effectiveSizeCategory}
        ageGroupOverride={formHook.form.age_group_override}
        sizeCategoryOverride={formHook.form.size_category_override}
        setAgeGroupOverride={(id) => formHook.updateField('age_group_override', id)}
        setSizeCategoryOverride={(id) => formHook.updateField('size_category_override', id)}
        ageGroups={lookups.ageGroups}
        sizeCategories={lookups.entrySizeCategories}
        selectedDancerCount={formHook.form.selectedDancers.length}
      />

      {/* Title Upgrade Option (empwrDefaults.ts:45) */}
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
              Select if this routine is competing for title. Additional $30 fee applies.
            </div>
          </div>
        </label>
      </div>

      <EntryFormActions
        canSave={formHook.canSave}
        isLoading={createMutation.isPending}
        validationErrors={formHook.validationErrors}
        onSave={handleSave}
      />
    </div>
  );
}
