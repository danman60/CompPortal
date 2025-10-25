import { useState, useMemo } from 'react';

export type PipelineStatus = 'all' | 'pending' | 'approved' | 'summary_in' | 'invoiced' | 'paid';

interface PipelineReservation {
  id: string;
  competitionId: string;
  competitionName: string;
  status: string | null;
  entryCount: number;
  invoiceId: string | null;
  invoicePaid: boolean;
  [key: string]: any;
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
      if (!uniqueEvents.has(r.competitionId)) {
        uniqueEvents.set(r.competitionId, {
          id: r.competitionId,
          name: r.competitionName
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
      result = result.filter(r => r.competitionId === eventFilter);
    }

    // Status filter - CORRECT IMPLEMENTATION (uses new status values)
    if (statusFilter === 'pending') {
      result = result.filter(r => r.status === 'pending');
    } else if (statusFilter === 'approved') {
      // Approved but no entries yet (waiting for SD to create routines)
      result = result.filter(r =>
        r.status === 'approved' &&
        r.entryCount === 0 &&
        !r.invoiceId
      );
    } else if (statusFilter === 'summary_in') {
      // CORRECT: After summary submission, status='summarized'
      result = result.filter(r =>
        r.status === 'summarized' &&
        !r.invoiceId
      );
    } else if (statusFilter === 'invoiced') {
      // CORRECT: After invoice creation, status='invoiced'
      result = result.filter(r =>
        r.status === 'invoiced' &&
        !r.invoicePaid
      );
    } else if (statusFilter === 'paid') {
      // CORRECT: After payment, status='closed'
      result = result.filter(r =>
        r.status === 'closed' ||
        r.invoicePaid
      );
    }

    return result;
  }, [reservations, eventFilter, statusFilter]);

  // Calculate status counts
  const statusCounts = useMemo(() => ({
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    approved: reservations.filter(r =>
      r.status === 'approved' && r.entryCount === 0 && !r.invoiceId
    ).length,
    summary_in: reservations.filter(r =>
      r.status === 'summarized' && !r.invoiceId
    ).length,
    invoiced: reservations.filter(r =>
      r.status === 'invoiced' && !r.invoicePaid
    ).length,
    paid: reservations.filter(r =>
      r.status === 'closed' || r.invoicePaid
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
