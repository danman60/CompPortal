import { trpc } from '@/lib/trpc';
import { useState } from 'react';

/**
 * Custom hook for fetching and managing entries data
 * Extracted from EntriesList.tsx (lines 24-94)
 */
export function useEntries() {
  const [limit] = useState(250); // Increased from 100 to 250 to prevent display limit bugs

  const { data, isLoading, refetch, dataUpdatedAt } = trpc.entry.getAll.useQuery({
    limit,
    offset: 0,
  });

  const entries = data?.entries || [];

  // Fetch reservation data for space limit tracking
  const { data: reservationData } = trpc.reservation.getAll.useQuery({
    competitionId: undefined,
    status: 'approved',
  });

  // Delete mutation with optimistic updates
  const utils = trpc.useUtils();
  const deleteMutation = trpc.entry.delete.useMutation({
    onMutate: async (variables) => {
      await utils.entry.getAll.cancel();
      const previousData = utils.entry.getAll.getData();

      utils.entry.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          entries: old.entries.filter((entry) => entry.id !== variables.id),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        utils.entry.getAll.setData(undefined, context.previousData);
      }
    },
    onSettled: () => {
      utils.entry.getAll.invalidate();
    },
  });

  // Update mutation
  const updateMutation = trpc.entry.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  return {
    entries,
    isLoading,
    refetch,
    dataUpdatedAt,
    reservationData,
    deleteMutation,
    updateMutation,
    utils,
  };
}
