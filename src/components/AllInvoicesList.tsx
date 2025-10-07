'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTableSort } from '@/hooks/useTableSort';
import SortableHeader from '@/components/SortableHeader';

export default function AllInvoicesList() {
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();

  // Initialize filters from URL query parameters
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Read URL query parameters on mount
  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    if (paymentStatus) {
      setPaymentStatusFilter(paymentStatus);
    }
  }, [searchParams]);

  // Fetch all invoices with optional filters
  const { data, isLoading } = trpc.invoice.getAllInvoices.useQuery({
    competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
  });

  // Fetch competitions for filter dropdown
  const { data: competitionsData } = trpc.competition.getAll.useQuery();

  // Mark as paid mutation
  const markAsPaidMutation = trpc.reservation.markAsPaid.useMutation({
    onSuccess: () => {
      utils.invoice.getAllInvoices.invalidate();
      setProcessingId(null);
    },
    onError: (error) => {
      alert(`Failed to update payment status: ${error.message}`);
      setProcessingId(null);
    },
  });

  // Send reminder mutation
  const sendReminderMutation = trpc.invoice.sendInvoiceReminder.useMutation({
    onSuccess: (data) => {
      alert(`Reminder email sent to ${data.email}`);
    },
    onError: (error) => {
      alert(`Failed to send reminder: ${error.message}`);
    },
  });

  const handleMarkAsPaid = (reservationId: string, currentStatus: string, studioName: string) => {
    const newStatus = prompt(
      `Update payment status for ${studioName}\n\nCurrent: ${currentStatus}\n\nSelect new status:\n- pending\n- partial\n- paid\n- refunded\n- cancelled`,
      currentStatus
    );

    if (!newStatus) return;

    const validStatuses = ['pending', 'partial', 'paid', 'refunded', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      alert('Invalid payment status. Must be one of: pending, partial, paid, refunded, cancelled');
      return;
    }

    setProcessingId(reservationId);
    markAsPaidMutation.mutate({
      id: reservationId,
      paymentStatus: newStatus as 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled',
    });
  };

  const handleSendReminder = (studioId: string, competitionId: string, studioName: string) => {
    if (!confirm(`Send payment reminder to ${studioName}?`)) return;

    sendReminderMutation.mutate({
      studioId,
      competitionId,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentStatusBadge = (status: string | null | undefined) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
      partial: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      paid: 'bg-green-500/20 text-green-300 border-green-400/30',
      refunded: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
      cancelled: 'bg-red-500/20 text-red-300 border-red-400/30',
    };

    const color = statusColors[status || 'pending'] || statusColors.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
        {(status || 'pending').toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const invoices = data?.invoices || [];
  const competitions = competitionsData?.competitions || [];

  // Sort invoices for table view
  const { sortedData: sortedInvoices, sortConfig, requestSort } = useTableSort(invoices);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Competition Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event
            </label>
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all" className="bg-gray-900 text-white">All Events</option>
              {competitions.map((comp: any) => (
                <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                  {comp.name} ({comp.year})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Status
            </label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all" className="bg-gray-900 text-white">All Statuses</option>
              <option value="pending" className="bg-gray-900 text-white">Pending</option>
              <option value="partial" className="bg-gray-900 text-white">Partial</option>
              <option value="paid" className="bg-gray-900 text-white">Paid</option>
              <option value="refunded" className="bg-gray-900 text-white">Refunded</option>
              <option value="cancelled" className="bg-gray-900 text-white">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-3xl font-bold text-white mb-2">{invoices.length}</div>
          <div className="text-sm text-gray-300">Total Invoices</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-3xl font-bold text-white mb-2">
            {invoices.filter(inv => inv.reservation?.paymentStatus === 'paid').length}
          </div>
          <div className="text-sm text-gray-300">Paid</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-3xl font-bold text-white mb-2">
            {invoices.filter(inv => inv.reservation?.paymentStatus === 'pending' || !inv.reservation?.paymentStatus).length}
          </div>
          <div className="text-sm text-gray-300">Pending</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-3xl font-bold text-white mb-2">
            {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0))}
          </div>
          <div className="text-sm text-gray-300">Total Revenue</div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
        {/* Table Header with Download Button */}
        <div className="bg-white/5 border-b border-white/20 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Invoices</h3>
          <button
            onClick={() => {
              // Generate CSV from current invoices
              const csvHeaders = ['Studio', 'Code', 'City', 'Event', 'Year', 'Routines', 'Total Amount', 'Payment Status'];
              const csvRows = sortedInvoices.map(inv => [
                inv.studioName || 'N/A',
                inv.studioCode || 'N/A',
                inv.studioCity || 'N/A',
                inv.competitionName || 'N/A',
                inv.competitionYear || 0,
                inv.entryCount || 0,
                (inv.totalAmount || 0).toFixed(2),
                inv.reservation?.paymentStatus || 'pending',
              ]);

              const csvContent = [
                csvHeaders.join(','),
                ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold text-sm"
          >
            📥 Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/20">
              <tr>
                <SortableHeader label="Studio" sortKey="studioName" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <SortableHeader label="Event" sortKey="competitionName" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <SortableHeader label="Routines" sortKey="entryCount" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <SortableHeader label="Total Amount" sortKey="totalAmount" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No invoices found
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((invoice) => (
                  <tr key={`${invoice.studioId}-${invoice.competitionId}`} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-semibold">{invoice.studioName || 'N/A'}</div>
                        <div className="text-gray-400 text-sm">{invoice.studioCode || 'N/A'}</div>
                        <div className="text-gray-500 text-xs">
                          {invoice.studioCity || 'N/A'}, {invoice.studioProvince || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white">{invoice.competitionName || 'N/A'}</div>
                        <div className="text-gray-400 text-sm">{invoice.competitionYear || 0}</div>
                        <div className="text-gray-500 text-xs">
                          {formatDate(invoice.competitionStartDate)} - {formatDate(invoice.competitionEndDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white">
                      {invoice.entryCount || 0}
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">
                      {formatCurrency(invoice.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4">
                      {getPaymentStatusBadge(invoice.reservation?.paymentStatus)}
                      {invoice.reservation?.paymentConfirmedAt && (
                        <div className="text-gray-500 text-xs mt-1">
                          Confirmed: {formatDate(invoice.reservation.paymentConfirmedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/invoices/${invoice.studioId}/${invoice.competitionId}`}
                          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm font-semibold transition-all border border-blue-400/30"
                        >
                          View
                        </Link>
                        {invoice.reservation && (
                          <>
                            <button
                              onClick={() => handleMarkAsPaid(
                                invoice.reservation!.id,
                                invoice.reservation!.paymentStatus || 'pending',
                                invoice.studioName
                              )}
                              disabled={processingId === invoice.reservation.id}
                              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm font-semibold transition-all border border-green-400/30 disabled:opacity-50"
                            >
                              {processingId === invoice.reservation.id ? 'Processing...' : 'Mark Paid'}
                            </button>
                            <button
                              onClick={() => handleSendReminder(
                                invoice.studioId,
                                invoice.competitionId,
                                invoice.studioName
                              )}
                              disabled={sendReminderMutation.isPending}
                              className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-semibold transition-all border border-purple-400/30 disabled:opacity-50"
                            >
                              {sendReminderMutation.isPending ? 'Sending...' : 'Send Reminder'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
