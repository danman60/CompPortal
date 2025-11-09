import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for entry data and mutations
 * Used by Studio Directors in Entries rebuild page
 *
 * Provides:
 * - Entry list (filtered by current user's studio)
 * - Delete mutation with optimistic UI
 * - Submit summary mutation
 */
export function useEntries() {
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.entry.getAll.useQuery({
    limit: 250, // Increased limit to prevent display bugs
  });

  const deleteMutation = trpc.entry.delete.useMutation({
    // Optimistic UI: Immediately remove entry from list
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await utils.entry.getAll.cancel();

      // Snapshot the previous value
      const previousData = utils.entry.getAll.getData();

      // Optimistically update the cache
      utils.entry.getAll.setData({ limit: 250 }, (old) => {
        if (!old) return old;
        return {
          ...old,
          entries: old.entries.filter((entry) => entry.id !== variables.id),
        };
      });

      // Return context with snapshot for rollback
      return { previousData };
    },
    onSuccess: (data) => {
      // Backend returns message in response
      toast.success(data.message || 'Routine deleted successfully');
    },
    onError: (error, variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        utils.entry.getAll.setData({ limit: 250 }, context.previousData);
      }
      // Use backend error message directly (context-aware)
      toast.error(error.message);
    },
    onSettled: () => {
      // Refetch to ensure consistency with server
      utils.entry.getAll.invalidate();
      utils.reservation.getAll.invalidate();
    },
  });

  const submitSummaryMutation = trpc.entry.submitSummary.useMutation({
    onSuccess: () => {
      toast.success('Summary submitted to Competition Director!');
      refetch();
    },
    onError: (error) => {
      toast.error(`We couldn't submit your summary right now. ${error.message}`);
    },
  });

  return {
    entries: data?.entries || [],
    isLoading,
    refetch,
    deleteEntry: deleteMutation.mutateAsync,
    submitSummary: submitSummaryMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isSubmitting: submitSummaryMutation.isPending,
  };
}
