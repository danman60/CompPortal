"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc-client';
import { useEntryForm } from '@/hooks/rebuild/useEntryForm';
import { RoutineDetailsSection } from './RoutineDetailsSection';
import { DancerSelectionSection } from './DancerSelectionSection';
import { AutoCalculatedSection } from './AutoCalculatedSection';
import { ReservationContextBar } from './ReservationContextBar';
import { EntryFormActions } from './EntryFormActions';

/**
 * Entry creation form container
 * Single-page form for creating routine entries
 *
 * Required query params:
 * - reservation: Reservation ID
 *
 * Features:
 * - Auto-calculates age group from dancer ages
 * - Auto-calculates size category from dancer count
 * - 4 save actions: Cancel, Save, Save & Another, Create Like This
 * - No fee display (fees calculated at summary submission)
 */
export function EntryCreateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get('reservation');

  // Fetch reservation data for context
  const { data: reservation, isLoading: reservationLoading } = trpc.reservation.getById.useQuery(
    { id: reservationId! },
    { enabled: !!reservationId }
  );

  // Fetch competition data
  const { data: competition, isLoading: competitionLoading } = trpc.competition.getById.useQuery(
    { id: reservation?.competition_id! },
    { enabled: !!reservation?.competition_id }
  );

  // Fetch lookup data (categories, classifications, age groups, sizes)
  const { data: lookups, isLoading: lookupsLoading } = trpc.lookup.getAllForEntry.useQuery();

  // Fetch studio dancers
  const { data: dancers, isLoading: dancersLoading } = trpc.dancer.list.useQuery(
    { studioId: reservation?.studio_id! },
    { enabled: !!reservation?.studio_id }
  );

  // Form state management
  const {
    form,
    updateField,
    toggleDancer,
    inferredAgeGroup,
    inferredSizeCategory,
    canSave,
    resetForm,
    resetDetailsOnly,
  } = useEntryForm(reservationId);

  // Entry creation mutation
  const createEntryMutation = trpc.entry.create.useMutation();

  // Handle loading states
  if (!reservationId) {
    return (
      <div className="max-w-4xl mx-auto mt-20">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-red-300 mb-4">Missing Reservation</h2>
          <p className="text-white/80 mb-6">
            This page requires a reservation context. Please navigate here from the Entries page.
          </p>
          <button
            onClick={() => router.push('/dashboard/entries-rebuild')}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to Entries
          </button>
        </div>
      </div>
    );
  }

  if (reservationLoading || competitionLoading || lookupsLoading || dancersLoading) {
    return (
      <div className="max-w-4xl mx-auto mt-20">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white text-lg">Loading entry form...</div>
        </div>
      </div>
    );
  }

  if (!reservation || !competition || !lookups) {
    return (
      <div className="max-w-4xl mx-auto mt-20">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-red-300 mb-4">Invalid Reservation</h2>
          <p className="text-white/80 mb-6">
            Could not load reservation or competition data. Please try again.
          </p>
          <button
            onClick={() => router.push('/dashboard/entries-rebuild')}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to Entries
          </button>
        </div>
      </div>
    );
  }

  // Calculate capacity info
  const confirmedSpaces = reservation.spaces_confirmed || 0;
  const entriesCount = 0; // TODO: Fetch actual entry count for this reservation
  const remainingSpaces = confirmedSpaces - entriesCount;

  /**
   * Handle save action
   * Routes to appropriate behavior based on action type
   */
  const handleSave = async (action: 'cancel' | 'save' | 'save-another' | 'save-like-this') => {
    if (action === 'cancel') {
      router.push('/dashboard/entries-rebuild');
      return;
    }

    // Validate capacity
    if (remainingSpaces <= 0) {
      alert('Reservation is at capacity. Cannot create more entries.');
      return;
    }

    try {
      // Create entry
      await createEntryMutation.mutateAsync({
        reservation_id: reservationId,
        competition_id: reservation.competition_id,
        studio_id: reservation.studio_id,
        title: form.title,
        choreographer: form.choreographer || undefined,
        category_id: form.category_id,
        classification_id: form.classification_id,
        special_requirements: form.special_requirements || undefined,
        age_group_id: form.age_group_override || undefined, // TODO: Map inferred to actual ID
        entry_size_category_id: form.size_category_override || undefined, // TODO: Map inferred to actual ID
        status: 'draft',
        participants: form.selectedDancers.map((d, idx) => ({
          dancer_id: d.dancer_id,
          dancer_name: d.dancer_name,
          dancer_age: d.dancer_age || undefined,
          display_order: idx,
        })),
      });

      // Handle post-save action
      if (action === 'save') {
        router.push('/dashboard/entries-rebuild');
      } else if (action === 'save-another') {
        resetForm();
      } else if (action === 'save-like-this') {
        resetDetailsOnly();
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
      alert('Failed to create entry. Please try again.');
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto mb-32">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">🎭 Create Routine</h1>
            <span className="px-3 py-1 bg-purple-500/30 border border-purple-400/50 rounded-full text-purple-200 text-xs font-bold">
              🔨 REBUILD
            </span>
          </div>
          <p className="text-white/60">
            For: <span className="text-white font-semibold">{competition.name}</span> |
            Reservation: <span className="text-green-400 font-semibold">{entriesCount}/{confirmedSpaces} used</span> |
            <span className="text-blue-400 font-semibold">{remainingSpaces} remaining</span>
          </p>
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          <RoutineDetailsSection
            form={form}
            updateField={updateField}
            categories={lookups.categories}
            classifications={lookups.classifications}
          />

          <DancerSelectionSection
            form={form}
            updateField={updateField}
            toggleDancer={toggleDancer}
            dancers={dancers || []}
          />

          <AutoCalculatedSection
            form={form}
            updateField={updateField}
            inferredAgeGroup={inferredAgeGroup}
            inferredSizeCategory={inferredSizeCategory}
            ageGroups={lookups.ageGroups}
            sizeCategories={lookups.entrySizeCategories}
          />

          <EntryFormActions
            canSave={canSave}
            isLoading={createEntryMutation.isPending}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Fixed Bottom Context Bar */}
      <ReservationContextBar
        reservation={reservation}
        competition={competition}
        confirmedSpaces={confirmedSpaces}
        entriesCount={entriesCount}
        remainingSpaces={remainingSpaces}
      />
    </>
  );
}
