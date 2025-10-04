import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';

/**
 * Real-time scoreboard hook using Supabase Realtime
 * Subscribes to competition_entries updates for live score changes
 *
 * @param competitionId - UUID of the competition to monitor
 * @returns Object with scoreboard data, connection status, and error state
 */
export function useRealtimeScores(competitionId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial data fetch using tRPC
  const { data: initialData, refetch } = trpc.scoring.getScoreboard.useQuery(
    { competition_id: competitionId || '' },
    {
      enabled: !!competitionId,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!competitionId) {
      setIsConnected(false);
      return;
    }

    const supabase = createClient();
    let subscribed = true;

    // Subscribe to competition_entries changes
    const channel = supabase
      .channel(`scoreboard:${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'competition_entries',
          filter: `competition_id=eq.${competitionId}`,
        },
        (payload) => {
          console.log('Score update received:', payload);

          // Check if scoring-related fields changed
          const newEntry = payload.new as any;
          if (
            newEntry.calculated_score !== undefined ||
            newEntry.award_level !== undefined ||
            newEntry.category_placement !== undefined
          ) {
            // Refetch scoreboard data to get updated scores
            if (subscribed) {
              refetch();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime status:', status);

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Connection error. Retrying...');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('Connection timed out. Retrying...');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    // Cleanup on unmount or competitionId change
    return () => {
      subscribed = false;
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [competitionId, refetch]);

  return {
    data: initialData || [],
    isConnected,
    error,
    refetch, // Manual refetch if needed
  };
}
