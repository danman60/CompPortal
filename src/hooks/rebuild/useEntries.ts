import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for entry data and mutations
 * Used by Studio Directors in Entries rebuild page
 *
 * Provides:
 * - Entry list (filtered by current user's studio)
 * - Delete mutation
 * - Submit summary mutation
 */
export function useEntries() {
  const { data, isLoading, refetch } = trpc.entry.getAll.useQuery();

  const deleteMutation = trpc.entry.delete.useMutation({
    onSuccess: () => {
      toast.success('Routine deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete routine: ${error.message}`);
    },
  });

  const submitSummaryMutation = trpc.entry.submitSummary.useMutation({
    onSuccess: () => {
      toast.success('Summary submitted to Competition Director!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to submit summary: ${error.message}`);
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
