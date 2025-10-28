'use client';

import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

export function DebugSubmitButton({
  selectedCompetitionId,
  isIncomplete,
  onShowIncompleteConfirm,
}: {
  selectedCompetitionId: string;
  isIncomplete: boolean;
  onShowIncompleteConfirm: () => void;
}) {
  const { data: userData } = trpc.user.getCurrentUser.useQuery();

  const submitSummaryMutation = trpc.entry.submitSummary.useMutation({
    onSuccess: () => {
      toast.success('Summary submitted successfully!');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  return (
    <button
      onClick={() => {
        console.log('[SUBMIT DEBUG] Button clicked');
        console.log('[SUBMIT DEBUG] userData:', userData);
        console.log('[SUBMIT DEBUG] selectedCompetitionId:', selectedCompetitionId);
        console.log('[SUBMIT DEBUG] userData.studio:', userData?.studio);
        console.log('[SUBMIT DEBUG] userData.studio.id:', userData?.studio?.id);

        // Validate required data
        if (!userData?.studio?.id) {
          console.error('[SUBMIT DEBUG] Missing studio ID');
          toast.error('Studio information not loaded. Please refresh the page.');
          return;
        }
        if (!selectedCompetitionId) {
          console.error('[SUBMIT DEBUG] Missing competition ID');
          toast.error('Please select a reservation first.');
          return;
        }

        console.log('[SUBMIT DEBUG] Validation passed, calling mutation');

        // Check if incomplete - show confirmation dialog
        if (isIncomplete) {
          onShowIncompleteConfirm();
          return;
        }

        // Proceed with submission
        submitSummaryMutation.mutate({
          studioId: userData.studio.id,
          competitionId: selectedCompetitionId,
        });
      }}
      disabled={submitSummaryMutation.isPending}
      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 font-bold disabled:opacity-50"
    >
      <span>🚀</span>
      <span>DEBUG SUBMIT (NEW FILE)</span>
    </button>
  );
}
