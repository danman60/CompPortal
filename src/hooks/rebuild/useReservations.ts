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
export function usePipelineReservations() {
  const { data, isLoading, refetch } = trpc.reservation.getPipelineView.useQuery();

  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: () => {
      toast.success('Reservation approved!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Error approving reservation: ${error.message}`);
    },
  });

  const rejectMutation = trpc.reservation.reject.useMutation({
    onSuccess: () => {
      toast.success('Reservation rejected');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({
    onSuccess: () => {
      toast.success('Invoice created successfully!');
      refetch();
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
