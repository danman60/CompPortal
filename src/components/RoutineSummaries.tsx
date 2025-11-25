'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

/**
 * Competition Director View: Routine Summaries & Invoice Creation
 * Shows summarized reservations from all studios (tenant-scoped)
 * Allows filtering and creating invoices (NOT approve/reject)
 */
export default function RoutineSummaries() {
  const router = useRouter();
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch all summaries (tenant-scoped in router)
  const { data: summariesData, refetch } = trpc.summary.getAll.useQuery({
    competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
  });

  // Fetch competitions for filter (deleted competitions already filtered in router)
  const { data: competitionsData } = trpc.competition.getAll.useQuery();

  // Fetch studios for filter
  const { data: studiosData } = trpc.studio.getAll.useQuery();

  const summaries = summariesData?.summaries || [];
  const competitions = competitionsData?.competitions || [];
  const studios = studiosData?.studios || [];

  // Client-side filtering for studio and status
  const filteredSummaries = summaries.filter((s: any) => {
    if (selectedStudio !== 'all' && s.studio_id !== selectedStudio) return false;
    if (selectedStatus !== 'all') {
      // Map status filter to reservation status
      if (selectedStatus === 'summarized' && s.status !== 'summarized') return false;
      if (selectedStatus === 'invoiced' && s.status !== 'invoiced') return false;
      if (selectedStatus === 'paid' && s.status !== 'closed') return false;
    }
    return true;
  });

  // Create invoice mutation (same as Pipeline)
  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({
    onSuccess: async () => {
      toast.success('Invoice created successfully!');
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  const handleCreateInvoice = async (summary: any) => {
    try {
      await createInvoiceMutation.mutateAsync({ reservationId: summary.reservation_id });
      // Redirect to invoice detail page
      router.push(`/dashboard/invoices/${summary.studio_id}/${summary.competition_id}`);
    } catch (error) {
      // Error already handled by mutation onError
    }
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

      <h1 className="text-4xl font-bold text-white mb-2">Routine Summaries & Invoicing</h1>
      <p className="text-gray-400 mb-8">
        View studio submissions and create invoices
      </p>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Filter by Competition</label>
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
          >
            <option value="all" className="bg-gray-900">All Competitions</option>
            {competitions.map((comp: any) => (
              <option key={comp.id} value={comp.id} className="bg-gray-900">
                {comp.name} ({comp.year})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Filter by Studio</label>
          <select
            value={selectedStudio}
            onChange={(e) => setSelectedStudio(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
          >
            <option value="all" className="bg-gray-900">All Studios</option>
            {studios.map((studio: any) => (
              <option key={studio.id} value={studio.id} className="bg-gray-900">
                {studio.studio_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Filter by Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
          >
            <option value="all" className="bg-gray-900">All Statuses</option>
            <option value="summarized" className="bg-gray-900">Awaiting Invoice</option>
            <option value="invoiced" className="bg-gray-900">Invoiced</option>
            <option value="paid" className="bg-gray-900">Paid</option>
          </select>
        </div>
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
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white">Total</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSummaries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  No routine submissions found
                </td>
              </tr>
            ) : (
              filteredSummaries.map((summary: any) => {
                const key = `${summary.studio_id}-${summary.competition_id}`;

                return (
                  <tr
                    key={key}
                    className="border-b border-white/10 hover:bg-white/5 transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">
                        {summary.studio_name}
                        {summary.studio_code && <span className="text-sm text-gray-400 ml-2">({summary.studio_code})</span>}
                      </div>
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
                    <td className="px-6 py-4 text-center">
                      {summary.status === 'summarized' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-blue-500/20 text-blue-300 border-blue-500/30">
                          Awaiting Invoice
                        </span>
                      ) : summary.status === 'invoiced' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          Invoiced
                        </span>
                      ) : summary.status === 'closed' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-green-500/20 text-green-300 border-green-500/30">
                          Paid
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-500/20 text-gray-300 border-gray-500/30">
                          {summary.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-bold text-white">
                        ${summary.total_amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {summary.status === 'summarized' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateInvoice(summary);
                            }}
                            disabled={createInvoiceMutation.isPending}
                            className="px-4 py-2 rounded-lg transition-all text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                          </button>
                        ) : (
                          <Link
                            href={`/dashboard/reservation-pipeline?reservation=${summary.reservation_id}`}
                            className="px-4 py-2 rounded-lg transition-all text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg"
                          >
                            View Details
                          </Link>
                        )}
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
      {filteredSummaries.length > 0 && (
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Submissions</div>
              <div className="text-3xl font-bold text-white">
                {filteredSummaries.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Routines</div>
              <div className="text-3xl font-bold text-white">
                {filteredSummaries.reduce((sum: number, s: any) => sum + s.entry_count, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Awaiting Invoice</div>
              <div className="text-3xl font-bold text-blue-400">
                {filteredSummaries.filter((s: any) => s.status === 'summarized').length}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
