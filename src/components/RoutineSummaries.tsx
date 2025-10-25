'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RoutineSummaries() {
  const router = useRouter();
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [processingInvoiceKey, setProcessingInvoiceKey] = useState<string | null>(null);
  const [pendingInvoiceRoute, setPendingInvoiceRoute] = useState<{studioId: string, competitionId: string} | null>(null);

  // Fetch all summaries for approval
  const { data: summariesData, refetch } = trpc.summary.getAll.useQuery({
    competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
  });

  // Fetch competitions for filter
  const { data: competitionsData } = trpc.competition.getAll.useQuery();

  const approveSummaryMutation = trpc.summary.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setProcessingInvoiceKey(null);
      refetch();

      // Navigate to invoices page after approval
      if (pendingInvoiceRoute) {
        router.push(`/dashboard/invoices/${pendingInvoiceRoute.studioId}/${pendingInvoiceRoute.competitionId}`);
        setPendingInvoiceRoute(null);
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
      setProcessingInvoiceKey(null);
      setPendingInvoiceRoute(null);
    },
  });

  const summaries = summariesData?.summaries || [];
  const competitions = competitionsData?.competitions || [];

  const handleApproveSummary = async (summary: any) => {
    const key = `${summary.studio_id}-${summary.competition_id}`;
    setProcessingInvoiceKey(key);

    // Store the route for navigation after success
    setPendingInvoiceRoute({
      studioId: summary.studio_id,
      competitionId: summary.competition_id,
    });

    await approveSummaryMutation.mutateAsync({
      summaryId: summary.id,
      action: 'approve',
    });
  };

  const handleRejectSummary = async (summary: any) => {
    const key = `${summary.studio_id}-${summary.competition_id}`;
    setProcessingInvoiceKey(key);

    await approveSummaryMutation.mutateAsync({
      summaryId: summary.id,
      action: 'reject',
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>

      <h1 className="text-4xl font-bold text-white mb-2">Routine Summaries</h1>
      <p className="text-gray-400 mb-8">
        Review and approve routine submissions by studio
      </p>

      {/* Competition Filter */}
      <div className="mb-6">
        <label className="block text-sm text-gray-300 mb-2">Filter by Competition</label>
        <select
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
        >
          <option value="all" className="bg-gray-900">All Competitions</option>
          {competitions.map((comp: any) => (
            <option key={comp.id} value={comp.id} className="bg-gray-900">
              {comp.name} ({comp.year})
            </option>
          ))}
        </select>
      </div>

      {/* Summaries Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Studio</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Competition</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Submitted</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Routines</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white">Total</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No routine submissions found
                </td>
              </tr>
            ) : (
              summaries.map((summary: any) => {
                const key = `${summary.studio_id}-${summary.competition_id}`;

                return (
                  <tr
                    key={key}
                    className="border-b border-white/10 hover:bg-white/5 transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{summary.studio_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{summary.competition_name}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-400">
                        {new Date(summary.submitted_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-white font-semibold">{summary.entry_count}</span>
                      <div className="text-xs text-gray-400">
                        {summary.entries_unused > 0 && `(${summary.entries_unused} refunded)`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-bold text-white">
                        ${summary.total_amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveSummary(summary);
                          }}
                          disabled={processingInvoiceKey === key}
                          className="px-4 py-2 rounded-lg transition-all text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingInvoiceKey === key ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectSummary(summary);
                          }}
                          disabled={processingInvoiceKey === key}
                          className="px-4 py-2 rounded-lg transition-all text-sm bg-gradient-to-r from-red-500 to-rose-500 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {summaries.length > 0 && (
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Pending Submissions</div>
              <div className="text-3xl font-bold text-white">
                {summaries.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Routines</div>
              <div className="text-3xl font-bold text-white">
                {summaries.reduce((sum: number, s: any) => sum + s.entry_count, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-green-400">
                ${summaries.reduce((sum: number, s: any) => sum + s.total_amount, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
