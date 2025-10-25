import { useState, useEffect, useMemo } from 'react';

interface Entry {
  id: string;
  reservation_id: string;
  status: string;
  total_fee?: number;
}

interface Reservation {
  id: string;
  status: 'approved' | 'summarized' | 'invoiced' | 'closed';
  is_closed: boolean;
  spaces_confirmed: number;
  competitions?: { name: string };
}

/**
 * Custom hook for entries filtering logic
 * Filters entries by selected reservation and view mode
 *
 * Auto-selects first approved reservation on load
 * Filters entries client-side by reservation_id
 */
export function useEntriesFilters(
  entries: Entry[],
  reservations: Reservation[]
) {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Filter to only approved and summarized reservations
  const selectableReservations = useMemo(
    () => reservations.filter(r => r.status === 'approved' || r.status === 'summarized'),
    [reservations]
  );

  // Auto-select first reservation on load
  useEffect(() => {
    if (!selectedReservationId && selectableReservations.length > 0) {
      const firstApproved = selectableReservations.find(r => r.status === 'approved');
      if (firstApproved) {
        setSelectedReservationId(firstApproved.id);
      } else if (selectableReservations[0]) {
        setSelectedReservationId(selectableReservations[0].id);
      }
    }
  }, [selectableReservations, selectedReservationId]);

  const selectedReservation = useMemo(
    () => selectableReservations.find(r => r.id === selectedReservationId) || null,
    [selectableReservations, selectedReservationId]
  );

  const filteredEntries = useMemo(() => {
    if (!selectedReservationId) return entries;
    return entries.filter(e => e.reservation_id === selectedReservationId);
  }, [entries, selectedReservationId]);

  return {
    selectedReservation,
    setSelectedReservation: setSelectedReservationId,
    viewMode,
    setViewMode,
    filteredEntries,
    selectableReservations,
  };
}
