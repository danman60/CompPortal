"use client";
import { useState, useEffect } from 'react';

interface Reservation {
  id: string;
  event_name: string;
  status: 'approved' | 'summarized';
  is_closed: boolean;
  competition_id: string;
}

interface ReservationSelectorProps {
  reservations: Reservation[];
  selectedId: string | null;
  onSelect: (reservationId: string | null) => void;
  storageKey?: string;
  className?: string;
}

export function ReservationSelector({
  reservations,
  selectedId,
  onSelect,
  storageKey = 'selected-reservation',
  className = '',
}: ReservationSelectorProps) {
  // Filter to only show approved and summarized reservations
  const selectableReservations = reservations.filter(r =>
    r.status === 'approved' || r.status === 'summarized'
  );

  // Group reservations by event name to detect duplicates
  const eventNameCounts = selectableReservations.reduce((acc, r) => {
    acc[r.event_name] = (acc[r.event_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Track how many times we've seen each event name (for numbering duplicates)
  const eventNameOccurrences = {} as Record<string, number>;

  const getDisplayName = (reservation: Reservation) => {
    const eventName = reservation.event_name;
    const count = eventNameCounts[eventName];

    let displayName = eventName;

    // If multiple reservations for same event, add ordinal suffix
    if (count > 1) {
      eventNameOccurrences[eventName] = (eventNameOccurrences[eventName] || 0) + 1;
      const occurrence = eventNameOccurrences[eventName];

      // Add ordinal suffix (1st, 2nd, 3rd, etc.)
      const ordinal = occurrence === 1 ? '1st' : occurrence === 2 ? '2nd' : occurrence === 3 ? '3rd' : `${occurrence}th`;
      displayName = `${eventName} - ${ordinal}`;
    }

    // Add (closed) indicator for summarized/closed reservations
    if (reservation.is_closed) {
      displayName += ' (closed)';
    }

    return displayName;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-300">Reservation:</label>
      <select
        value={selectedId || ''}
        onChange={(e) => {
          const id = e.target.value;
          onSelect(id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, id);
          }
        }}
        className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[200px]"
      >
        {selectableReservations.map((reservation) => (
          <option key={reservation.id} value={reservation.id} className="bg-gray-900">
            {getDisplayName(reservation)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function useReservationFilter(storageKey = 'selected-reservation') {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    if (stored) setSelectedReservationId(stored);
  }, [storageKey]);

  const clearFilter = () => {
    setSelectedReservationId(null);
    if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
  };

  return { selectedReservationId, setSelectedReservationId, clearFilter };
}
