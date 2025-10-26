"use client";

import { useMemo } from 'react';
import { useEntries } from '@/hooks/rebuild/useEntries';
import { useReservations } from '@/hooks/rebuild/useReservations';
import { useEntriesFilters } from '@/hooks/rebuild/useEntriesFilters';
import { EntriesHeader } from './EntriesHeader';
import { EntriesFilters } from './EntriesFilters';
import { RoutineCardList } from './RoutineCardList';
import { RoutineTable } from './RoutineTable';
import { LiveSummaryBar } from './LiveSummaryBar';

/**
 * Main container for Entries rebuild page
 * Orchestrates data fetching and component composition
 *
 * Data flow:
 * - useEntries: Fetch all entries for current user
 * - useReservations: Fetch approved/summarized reservations
 * - useEntriesFilters: Client-side filtering by reservation
 * - Pass filtered data to presentation components
 */
export function EntriesPageContainer() {
  const { entries, isLoading: entriesLoading, submitSummary: submitSummaryMutation, deleteEntry: deleteEntryMutation } = useEntries();
  const { reservations, isLoading: reservationsLoading } = useReservations();

  // Wrap mutations to match component signatures
  const deleteEntry = async (id: string) => {
    await deleteEntryMutation({ id });
  };

  const submitSummary = async (payload: { studioId: string; competitionId: string }) => {
    await submitSummaryMutation(payload);
  };

  const {
    selectedReservation,
    setSelectedReservation,
    viewMode,
    setViewMode,
    filteredEntries,
    selectableReservations,
  } = useEntriesFilters(entries, reservations);

  // Calculate summary data for bottom bar
  const summaryData = useMemo(() => {
    const created = filteredEntries.length;
    const estimatedTotal = filteredEntries.reduce((sum, e) => {
      const fee = e.total_fee ? (typeof e.total_fee === 'number' ? e.total_fee : Number(e.total_fee)) : 0;
      return sum + fee;
    }, 0);
    const confirmedSpaces = selectedReservation?.spaces_confirmed || 0;

    return { created, estimatedTotal, confirmedSpaces };
  }, [filteredEntries, selectedReservation]);

  const isLoading = entriesLoading || reservationsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="text-white text-center py-20">
          <div className="text-2xl">Loading entries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <EntriesHeader
        selectedReservationId={selectedReservation?.id}
        selectedCompetitionId={selectedReservation?.competition_id}
      />

      <EntriesFilters
        reservations={selectableReservations}
        selectedReservation={selectedReservation}
        onReservationChange={setSelectedReservation}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="mt-8">
        {filteredEntries.length === 0 ? (
          <div className="text-center text-white/60 py-20">
            <div className="text-6xl mb-4">🎭</div>
            <div className="text-xl">No routines yet</div>
            <div className="text-sm mt-2">Create your first routine to get started</div>
          </div>
        ) : viewMode === 'card' ? (
          <RoutineCardList entries={filteredEntries} onDelete={deleteEntry} />
        ) : (
          <RoutineTable entries={filteredEntries} onDelete={deleteEntry} />
        )}
      </div>

      <LiveSummaryBar
        created={summaryData.created}
        estimatedTotal={summaryData.estimatedTotal}
        confirmedSpaces={summaryData.confirmedSpaces}
        reservation={selectedReservation}
        onSubmitSummary={submitSummary}
      />
    </div>
  );
}
