import { useState, useMemo } from 'react';

export type PipelineStatus = 'all' | 'pending' | 'approved' | 'summary_in' | 'invoiced' | 'paid';

interface PipelineReservation {
  id: string;
  event_id: string;
  event_name: string;
  status: string;
  entry_count: number;
  invoice_id: string | null;
  invoice_paid: boolean;
  payment_status: string;
}

/**
 * Custom hook for pipeline filtering logic
 * Uses CORRECT status values after Phase 0 backend changes
 *
 * Key differences from old code:
 * - "Pending Invoice" looks for status='summarized' (not approved + entryCount)
 * - "Invoiced" looks for status='invoiced'
 * - "Paid" looks for status='closed'
 */
export function usePipelineFilters(reservations: PipelineReservation[]) {
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<PipelineStatus>('all');

  // Extract unique events
  const events = useMemo(() => {
    const uniqueEvents = new Map();
    reservations.forEach(r => {
      if (!uniqueEvents.has(r.event_id)) {
        uniqueEvents.set(r.event_id, {
          id: r.event_id,
          name: r.event_name
        });
      }
    });
    return Array.from(uniqueEvents.values());
  }, [reservations]);

  // Filter reservations by event and status
  const filteredReservations = useMemo(() => {
    let result = reservations;

    // Event filter
    if (eventFilter !== 'all') {
      result = result.filter(r => r.event_id === eventFilter);
    }

    // Status filter - CORRECT IMPLEMENTATION (uses new status values)
    if (statusFilter === 'pending') {
      result = result.filter(r => r.status === 'pending');
    } else if (statusFilter === 'approved') {
      // Approved but no entries yet (waiting for SD to create routines)
      result = result.filter(r =>
        r.status === 'approved' &&
        r.entry_count === 0 &&
        !r.invoice_id
      );
    } else if (statusFilter === 'summary_in') {
      // CORRECT: After summary submission, status='summarized'
      result = result.filter(r =>
        r.status === 'summarized' &&
        !r.invoice_id
      );
    } else if (statusFilter === 'invoiced') {
      // CORRECT: After invoice creation, status='invoiced'
      result = result.filter(r =>
        r.status === 'invoiced' &&
        r.payment_status !== 'completed'
      );
    } else if (statusFilter === 'paid') {
      // CORRECT: After payment, status='closed'
      result = result.filter(r =>
        r.status === 'closed' ||
        r.payment_status === 'completed'
      );
    }

    return result;
  }, [reservations, eventFilter, statusFilter]);

  // Calculate status counts
  const statusCounts = useMemo(() => ({
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    approved: reservations.filter(r =>
      r.status === 'approved' && r.entry_count === 0 && !r.invoice_id
    ).length,
    summary_in: reservations.filter(r =>
      r.status === 'summarized' && !r.invoice_id
    ).length,
    invoiced: reservations.filter(r =>
      r.status === 'invoiced' && r.payment_status !== 'completed'
    ).length,
    paid: reservations.filter(r =>
      r.status === 'closed' || r.payment_status === 'completed'
    ).length
  }), [reservations]);

  return {
    eventFilter,
    setEventFilter,
    statusFilter,
    setStatusFilter,
    filteredReservations,
    statusCounts,
    events
  };
}
