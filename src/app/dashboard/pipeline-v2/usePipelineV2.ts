'use client';

import { useState, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';
import type {
  PipelineReservation,
  PipelineMutations,
  FilterState,
  PipelineStats,
  DisplayStatus,
  CompetitionCapacity,
} from './types';

/**
 * Pipeline V2 Hook
 * Comprehensive data and mutation management for the new CRM-style pipeline
 */
export function usePipelineV2() {
  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    competition: null,
    status: null,
    hideCompleted: false,
  });

  // State for expanded rows
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // State for modals
  const [approvalModalReservation, setApprovalModalReservation] = useState<PipelineReservation | null>(null);
  const [spacesModalReservationId, setSpacesModalReservationId] = useState<string | null>(null);
  const [depositModalReservationId, setDepositModalReservationId] = useState<string | null>(null);
  const [paymentModalInvoiceId, setPaymentModalInvoiceId] = useState<string | null>(null);

  // Fetch pipeline data
  const { data, isLoading, refetch } = trpc.reservation.getPipelineViewV2.useQuery();

  // Fetch competitions for capacity overview
  const { data: competitionsData, refetch: refetchCompetitions } = trpc.competition.getAll.useQuery();

  // === MUTATIONS ===

  // Approve reservation
  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: async () => {
      toast.success('Reservation approved!');
      await refetch();
      await refetchCompetitions();
    },
    onError: (error) => {
      toast.error(`Error approving: ${error.message}`);
    },
  });

  // Reject reservation
  const rejectMutation = trpc.reservation.reject.useMutation({
    onSuccess: async () => {
      toast.success('Reservation rejected');
      await refetch();
      await refetchCompetitions();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  // Reduce capacity (adjust spaces)
  const reduceCapacityMutation = trpc.reservation.reduceCapacity.useMutation({
    onSuccess: async () => {
      toast.success('Spaces adjusted successfully');
      await refetch();
      await refetchCompetitions();
    },
    onError: (error) => {
      toast.error(`Failed to adjust spaces: ${error.message}`);
    },
  });

  // Record deposit
  const recordDepositMutation = trpc.reservation.recordDeposit.useMutation({
    onSuccess: async () => {
      toast.success('Deposit recorded successfully');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to record deposit: ${error.message}`);
    },
  });

  // Reopen summary (reset to approved)
  const reopenSummaryMutation = trpc.reservation.reopenSummary.useMutation({
    onSuccess: async () => {
      toast.success('Summary reopened for edits');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reopen summary: ${error.message}`);
    },
  });

  // Create invoice
  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({
    onSuccess: async () => {
      toast.success('Invoice created successfully!');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  // Send invoice
  const sendInvoiceMutation = trpc.invoice.sendInvoice.useMutation({
    onSuccess: async () => {
      toast.success('Invoice sent successfully!');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send invoice: ${error.message}`);
    },
  });

  // Mark as paid
  const markAsPaidMutation = trpc.invoice.markAsPaid.useMutation({
    onSuccess: async () => {
      toast.success('Marked as paid!');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });

  // Void invoice
  const voidInvoiceMutation = trpc.invoice.voidInvoice.useMutation({
    onSuccess: async () => {
      toast.success('Invoice voided');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to void invoice: ${error.message}`);
    },
  });

  // Apply partial payment
  const applyPaymentMutation = trpc.invoice.applyPartialPayment.useMutation({
    onSuccess: async () => {
      toast.success('Payment applied successfully!');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to apply payment: ${error.message}`);
    },
  });

  // === MUTATIONS INTERFACE ===
  const mutations: PipelineMutations = {
    approve: async (input) => {
      await approveMutation.mutateAsync(input);
    },
    reject: async (input) => {
      await rejectMutation.mutateAsync(input);
    },
    adjustSpaces: async (input) => {
      await reduceCapacityMutation.mutateAsync({
        id: input.id,
        newCapacity: input.newSpaces,
        confirmed: true,
      });
    },
    updateDeposit: async (input) => {
      await recordDepositMutation.mutateAsync({
        reservationId: input.id,
        depositAmount: input.depositAmount,
        paymentDate: input.depositPaidAt?.toISOString(),
      });
    },
    reopenSummary: async (input) => {
      await reopenSummaryMutation.mutateAsync(input);
    },
    createInvoice: async (input) => {
      await createInvoiceMutation.mutateAsync(input);
    },
    sendInvoice: async (input) => {
      await sendInvoiceMutation.mutateAsync(input);
    },
    markAsPaid: async (input) => {
      await markAsPaidMutation.mutateAsync(input);
    },
    voidInvoice: async (input) => {
      await voidInvoiceMutation.mutateAsync({
        invoiceId: input.invoiceId,
        reason: input.reason,
      });
    },
    applyPayment: async (input) => {
      await applyPaymentMutation.mutateAsync({
        invoiceId: input.invoiceId,
        amount: input.amount,
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod as 'check' | 'e-transfer' | 'cash' | 'credit_card' | 'wire_transfer' | 'other' | undefined,
        notes: input.notes,
      });
    },
    // Modal openers
    openApprovalModal: (reservation) => setApprovalModalReservation(reservation),
    openSpacesModal: (id) => setSpacesModalReservationId(id),
    openDepositModal: (id) => setDepositModalReservationId(id),
    openPaymentModal: (id) => setPaymentModalInvoiceId(id),
    // Loading states
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isCreatingInvoice: createInvoiceMutation.isPending,
    isSendingInvoice: sendInvoiceMutation.isPending,
    isMarkingPaid: markAsPaidMutation.isPending,
    isVoidingInvoice: voidInvoiceMutation.isPending,
    isApplyingPayment: applyPaymentMutation.isPending,
    isReopeningSummary: reopenSummaryMutation.isPending,
  };

  // === DERIVED DATA ===

  // Cast reservations to typed array
  const reservations = (data?.reservations || []) as PipelineReservation[];

  // Extract unique competitions for filter dropdown
  const competitions = useMemo((): CompetitionCapacity[] => {
    const compMap = new Map<string, CompetitionCapacity>();

    reservations.forEach((r) => {
      if (!compMap.has(r.competitionId)) {
        compMap.set(r.competitionId, {
          id: r.competitionId,
          name: r.competitionName,
          year: r.competitionYear,
          dates: '',
          location: '',
          totalCapacity: 0,
          used: 0,
          remaining: 0,
          percentage: 0,
          studioCount: 0,
          pendingCount: 0,
        });
      }
      const comp = compMap.get(r.competitionId)!;
      comp.studioCount += 1;
      if (r.displayStatus === 'pending_review') {
        comp.pendingCount += 1;
      }
      comp.used += r.spacesConfirmed;
    });

    // Merge with full competition data if available
    if (competitionsData?.competitions) {
      competitionsData.competitions.forEach((c: { id: string; venue_capacity: number | null }) => {
        const existing = compMap.get(c.id);
        if (existing && c.venue_capacity) {
          existing.totalCapacity = c.venue_capacity;
          existing.remaining = c.venue_capacity - existing.used;
          existing.percentage = Math.round((existing.used / c.venue_capacity) * 100);
        }
      });
    }

    return Array.from(compMap.values());
  }, [reservations, competitionsData]);

  // Filter reservations
  const filteredReservations = useMemo(() => {
    let result = reservations;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.studioName.toLowerCase().includes(searchLower) ||
          r.studioCode?.toLowerCase().includes(searchLower) ||
          r.contactName?.toLowerCase().includes(searchLower) ||
          r.contactEmail.toLowerCase().includes(searchLower) ||
          r.studioCity.toLowerCase().includes(searchLower)
      );
    }

    // Competition filter
    if (filters.competition) {
      result = result.filter((r) => r.competitionId === filters.competition);
    }

    // Status filter
    if (filters.status) {
      result = result.filter((r) => r.displayStatus === filters.status);
    }

    // Hide completed filter
    if (filters.hideCompleted) {
      result = result.filter((r) => r.displayStatus !== 'paid_complete');
    }

    return result;
  }, [reservations, filters]);

  // Calculate stats
  const stats = useMemo((): PipelineStats => {
    return {
      total: reservations.length,
      pending: reservations.filter((r) => r.displayStatus === 'pending_review').length,
      approved: reservations.filter((r) => r.displayStatus === 'approved').length,
      readyToInvoice: reservations.filter((r) => r.displayStatus === 'ready_to_invoice').length,
      awaitingPayment: reservations.filter((r) => r.displayStatus === 'invoice_sent').length,
      paidComplete: reservations.filter((r) => r.displayStatus === 'paid_complete').length,
      needsAttention: reservations.filter((r) => r.displayStatus === 'needs_attention').length,
    };
  }, [reservations]);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      competition: null,
      status: null,
      hideCompleted: false,
    });
  }, []);

  return {
    // Data
    reservations: filteredReservations,
    allReservations: reservations,
    competitions,
    stats,
    isLoading,
    refetch,

    // Filters
    filters,
    setFilters,
    clearFilters,

    // Row expansion
    expandedRowId,
    toggleRowExpansion,

    // Mutations
    mutations,

    // Modals
    approvalModalReservation,
    setApprovalModalReservation,
    spacesModalReservationId,
    setSpacesModalReservationId,
    depositModalReservationId,
    setDepositModalReservationId,
    paymentModalInvoiceId,
    setPaymentModalInvoiceId,
  };
}
