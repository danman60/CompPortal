import { useState, useEffect } from 'react';

type FilterStatus = 'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled';

interface Reservation {
  id: string;
  event_name: string;
  status: string;
  is_closed: boolean;
  competition_id: string;
}

/**
 * Custom hook for managing entry filter state by reservation
 * Updated to filter by reservation instead of competition
 *
 * @param reservationData - Reservation data containing approved/summarized reservations
 */
export function useEntryFilters(entries: any[], reservationData?: any) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedReservation, setSelectedReservation] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Get approved and summarized reservations
  const reservations = (reservationData?.reservations || [])
    .filter((r: any) => r.status === 'approved' || r.status === 'summarized')
    .map((r: any) => ({
      id: r.id,
      event_name: r.competitions?.name || 'Unknown Event',
      status: r.status,
      is_closed: r.is_closed,
      competition_id: r.competition_id,
    })) as Reservation[];

  // Auto-select first reservation on load
  useEffect(() => {
    if (reservations.length > 0 && !selectedReservation && reservations[0]) {
      setSelectedReservation(reservations[0].id);
    }
  }, [reservations, selectedReservation]);

  // Filter entries by selected reservation
  const filteredEntries = entries.filter((entry) => {
    const matchesStatus = filter === 'all' || entry.status === filter;
    const matchesReservation = !selectedReservation || entry.reservation_id === selectedReservation;
    return matchesStatus && matchesReservation;
  });

  // Get selected reservation object
  const selectedReservationObj = reservations.find(r => r.id === selectedReservation);

  return {
    filter,
    setFilter,
    selectedReservation,
    setSelectedReservation,
    viewMode,
    setViewMode,
    reservations,
    filteredEntries,
    selectedReservationObj,
  };
}
