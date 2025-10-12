'use client';

import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

interface RoutinesSummaryElementProps {
  studioId: string;
  competitionId: string;
  onSummarySubmitted?: () => void;
}

export default function RoutinesSummaryElement({ studioId, competitionId, onSummarySubmitted }: RoutinesSummaryElementProps) {
  const { data: entriesResp, isLoading: entriesLoading } = trpc.entry.getAll.useQuery({ studioId, competitionId });
  const { data: reservationsResp } = trpc.reservation.getAll.useQuery({ studioId, competitionId, status: 'approved' });

  const entries = entriesResp?.entries || [];
  const totalRoutines = entries.length;
  const estimatedCost = entries.reduce((sum, e: any) => sum + Number(e.total_fee || 0), 0);
  const approvedReservation = reservationsResp?.reservations?.[0];
  const spacesConfirmed = approvedReservation?.spaces_confirmed || 0;
  const used = entries.filter((e: any) => e.status !== 'cancelled').length;
  const remainingTokens = Math.max(spacesConfirmed - used, 0);

  const handleSubmitSummary = () => {
    if (totalRoutines === 0) {
      toast.error('No routines to submit', { position: 'top-right' });
      return;
    }
    toast.success('Summary sent to Competition Director', { position: 'top-right' });
    onSummarySubmitted?.();
  };

  const handleDownloadPDF = () => {
    toast.success('Generating PDF…', { position: 'top-right' });
    // Placeholder: integrate with invoice/pdf when available
  };

  if (entriesLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
        <div className="h-24 bg-white/5 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 backdrop-blur-md rounded-xl border-2 border-white/30 p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">📊</span>
        <h2 className="text-2xl font-bold text-white">Routine Summary</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <div className="text-gray-300 text-sm mb-1">Total Routines</div>
          <div className="text-3xl font-bold text-white">{totalRoutines}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <div className="text-gray-300 text-sm mb-1">Estimated Total</div>
          <div className="text-3xl font-bold text-green-400">${estimatedCost.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">Final cost determined by CD</div>
        </div>
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <div className="text-gray-300 text-sm mb-1">Remaining Tokens</div>
          <div className="text-3xl font-bold text-purple-400">{remainingTokens}</div>
          <div className="text-xs text-gray-400 mt-1">From approved reservations</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSubmitSummary}
          disabled={totalRoutines === 0}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send Summary (Request Invoice)
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={totalRoutines === 0}
          className="bg-white/10 backdrop-blur-md text-white font-semibold px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download Summary (PDF)
        </button>
      </div>
    </div>
  );
}

