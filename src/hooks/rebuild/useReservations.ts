import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for reservation data (Studio Director view)
 * Used in Entries page to get approved/summarized reservations
 */
export function useReservations() {
  const { data, isLoading, refetch } = trpc.reservation.getAll.useQuery();

  return {
    reservations: data?.reservations || [],
    isLoading,
    refetch,
  };
}

/**
 * Custom hook for pipeline reservations (Competition Director view)
 * Used in Pipeline page with full mutation support
 *
 * Provides:
 * - All reservations for CD's events
 * - Approve mutation
 * - Reject mutation
 * - Create invoice mutation
 */
export function usePipelineReservations(refetchCompetitions?: () => void) {
  const { data, isLoading, refetch } = trpc.reservation.getPipelineView.useQuery();

  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: async () => {
      toast.success('Reservation approved!');
      await refetch();
      if (refetchCompetitions) await refetchCompetitions();
    },
    onError: (error) => {
      toast.error(`Error approving reservation: ${error.message}`);
    },
  });

  const rejectMutation = trpc.reservation.reject.useMutation({
    onSuccess: async () => {
      toast.success('Reservation rejected');
      await refetch();
      if (refetchCompetitions) await refetchCompetitions();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({
    onSuccess: async () => {
      toast.success('Invoice created successfully!');
      await refetch();
      if (refetchCompetitions) await refetchCompetitions();
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  return {
    reservations: data?.reservations || [],
    isLoading,
    refetch,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    createInvoice: createInvoiceMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isCreatingInvoice: createInvoiceMutation.isPending,
  };
}
