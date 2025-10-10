'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTableSort } from '@/hooks/useTableSort';
import SortableHeader from '@/components/SortableHeader';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { formatDistanceToNow } from 'date-fns';
import { showUndoToast } from '@/lib/undoToast';

export default function AllInvoicesList() {
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();

  // Initialize filters from URL query parameters
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Data refresh tracking
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Read URL query parameters on mount
  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    if (paymentStatus) {
      setPaymentStatusFilter(paymentStatus);
    }
  }, [searchParams]);

  // Fetch all invoices with optional filters
  const { data, isLoading, dataUpdatedAt, refetch } = trpc.invoice.getAllInvoices.useQuery({
    competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
  });

  // Update lastUpdated when data changes
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // Fetch competitions for filter dropdown
  const { data: competitionsData } = trpc.competition.getAll.useQuery();

  // Mark as paid mutation with optimistic updates
  const markAsPaidMutation = trpc.reservation.markAsPaid.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await utils.invoice.getAllInvoices.cancel();

      // Snapshot the previous value
      const previousData = utils.invoice.getAllInvoices.getData({
        competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
        paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
      });

      // Optimistically update the cache
      utils.invoice.getAllInvoices.setData(
        {
          competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
          paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            invoices: old.invoices.map((inv) =>
              inv.reservation?.id === variables.id
                ? {
                    ...inv,
                    reservation: inv.reservation
                      ? {
                          ...inv.reservation,
                          paymentStatus: variables.paymentStatus,
                          paymentConfirmedAt: variables.paymentStatus === 'paid' ? new Date() : inv.reservation.paymentConfirmedAt,
                        }
                      : inv.reservation,
                  }
                : inv
            ),
          };
        }
      );

      // Return context with snapshot
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        utils.invoice.getAllInvoices.setData(
          {
            competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
            paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
          },
          context.previousData
        );
      }
      toast.error(getFriendlyErrorMessage(error.message));
      setProcessingId(null);
    },
    onSuccess: () => {
      setProcessingId(null);
      toast.success('Payment status updated to paid');
    },
    onSettled: () => {
      // Refetch to ensure consistency with server
      utils.invoice.getAllInvoices.invalidate();
    },
  });

  // Send reminder mutation
  const sendReminderMutation = trpc.invoice.sendInvoiceReminder.useMutation({
    onSuccess: (data) => {
      toast.success(`Reminder email sent to ${data.email}`);
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
    },
  });

  const handleMarkAsPaid = (reservationId: string, currentStatus: string, studioName: string) => {
    // Store previous status for undo
    const previousStatus = currentStatus as 'pending' | 'cancelled' | 'partial' | 'paid' | 'refunded';

    setProcessingId(reservationId);
    markAsPaidMutation.mutate({
      id: reservationId,
      paymentStatus: 'paid',
    }, {
      onSuccess: () => {
        // Show undo toast
        showUndoToast({
          message: `${studioName} invoice marked as paid`,
          onUndo: () => {
            // Revert the change
            markAsPaidMutation.mutate({
              id: reservationId,
              paymentStatus: previousStatus,
            });
          },
        });
      },
    });
  };

  const handleSendReminder = (studioId: string, competitionId: string, studioName: string) => {
    if (!confirm(`Send payment reminder to ${studioName}?`)) return;

    sendReminderMutation.mutate({
      studioId,
      competitionId,
    });
  };

  // Bulk selection handlers
  const toggleInvoiceSelection = (invoiceKey: string) => {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(invoiceKey)) {
      newSelection.delete(invoiceKey);
    } else {
      newSelection.add(invoiceKey);
    }
    setSelectedInvoices(newSelection);
  };

  const selectAllInvoices = () => {
    const allKeys = sortedInvoices.map(inv => `${inv.studioId}-${inv.competitionId}`);
    setSelectedInvoices(new Set(allKeys));
  };

  const deselectAllInvoices = () => {
    setSelectedInvoices(new Set());
  };

  const selectFilteredInvoices = () => {
    // Select only pending invoices
    const filteredKeys = sortedInvoices
      .filter(inv => inv.reservation?.paymentStatus === 'pending' || !inv.reservation?.paymentStatus)
      .map(inv => `${inv.studioId}-${inv.competitionId}`);
    setSelectedInvoices(new Set(filteredKeys));
  };

  // Bulk action handlers
  const handleBulkMarkAsPaid = () => {
    if (selectedInvoices.size === 0) return;
    if (!confirm(`Mark ${selectedInvoices.size} selected invoices as paid?`)) return;

    const selectedArray = Array.from(selectedInvoices);
    const selectedInvoiceData = sortedInvoices.filter(inv =>
      selectedArray.includes(`${inv.studioId}-${inv.competitionId}`) && inv.reservation
    );

    // Store previous states for undo
    const previousStates = selectedInvoiceData.map(inv => ({
      id: inv.reservation!.id,
      previousStatus: (inv.reservation!.paymentStatus || 'pending') as 'pending' | 'cancelled' | 'partial' | 'paid' | 'refunded',
    }));

    let completed = 0;
    selectedInvoiceData.forEach(inv => {
      if (inv.reservation) {
        markAsPaidMutation.mutate({
          id: inv.reservation.id,
          paymentStatus: 'paid',
        }, {
          onSuccess: () => {
            completed++;
            if (completed === selectedInvoiceData.length) {
              // Show undo toast
              showUndoToast({
                message: `${completed} invoices marked as paid`,
                onUndo: () => {
                  // Revert all changes
                  previousStates.forEach(state => {
                    markAsPaidMutation.mutate({
                      id: state.id,
                      paymentStatus: state.previousStatus,
                    });
                  });
                },
              });
              setSelectedInvoices(new Set());
            }
          },
        });
      }
    });
  };

  const handleBulkSendReminders = () => {
    if (selectedInvoices.size === 0) return;
    if (!confirm(`Send payment reminders for ${selectedInvoices.size} selected invoices?`)) return;

    const selectedArray = Array.from(selectedInvoices);
    const selectedInvoiceData = sortedInvoices.filter(inv =>
      selectedArray.includes(`${inv.studioId}-${inv.competitionId}`)
    );

    let completed = 0;
    selectedInvoiceData.forEach(inv => {
      sendReminderMutation.mutate({
        studioId: inv.studioId,
        competitionId: inv.competitionId,
      }, {
        onSuccess: () => {
          completed++;
          if (completed === selectedInvoiceData.length) {
            toast.success(`Reminders sent to ${completed} studios`);
            setSelectedInvoices(new Set());
          }
        },
      });
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
        {/* Table Header with Bulk Selection and Actions */}
        <div className="bg-white/5 border-b border-white/20 px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Invoices</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
                <button
                  onClick={() => refetch()}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                  title="Refresh data"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
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

          {/* Bulk Selection Controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-300">
              {selectedInvoices.size > 0 ? `${selectedInvoices.size} selected` : 'Select:'}
            </span>
            <button
              onClick={selectAllInvoices}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/20 transition-all"
            >
              All ({sortedInvoices.length})
            </button>
            <button
              onClick={selectFilteredInvoices}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/20 transition-all"
            >
              Pending Only
            </button>
            <button
              onClick={deselectAllInvoices}
              disabled={selectedInvoices.size === 0}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/20 transition-all disabled:opacity-50"
            >
              Clear
            </button>

            {/* Bulk Actions - Show only when items selected */}
            {selectedInvoices.size > 0 && (
              <>
                <div className="h-6 w-px bg-white/20 mx-2"></div>
                <button
                  onClick={handleBulkMarkAsPaid}
                  className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm font-semibold border border-green-400/30 transition-all"
                >
                  ✓ Mark Paid ({selectedInvoices.size})
                </button>
                <button
                  onClick={handleBulkSendReminders}
                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-semibold border border-purple-400/30 transition-all"
                >
                  📧 Send Reminders ({selectedInvoices.size})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/20 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.size === sortedInvoices.length && sortedInvoices.length > 0}
                    onChange={(e) => e.target.checked ? selectAllInvoices() : deselectAllInvoices()}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-purple-500 cursor-pointer"
                  />
                </th>
                <SortableHeader label="Studio" sortKey="studioName" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <SortableHeader label="Event" sortKey="competitionName" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <SortableHeader label="Routines" sortKey="entryCount" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <SortableHeader label="Total Amount" sortKey="totalAmount" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <SortableHeader label="Payment Status" sortKey="reservation.payment_status" sortConfig={sortConfig} onSort={requestSort} className="text-xs uppercase tracking-wider" />
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="text-6xl mb-4">📋</div>
                      <h3 className="text-xl font-bold text-white mb-2">No Invoices Found</h3>
                      <p className="text-gray-400 mb-4">
                        {paymentStatusFilter !== 'all'
                          ? `No ${paymentStatusFilter} invoices match your filters.`
                          : 'Invoices will appear here once studios create reservations.'}
                      </p>
                      {paymentStatusFilter !== 'all' || selectedCompetition !== 'all' ? (
                        <button
                          onClick={() => {
                            setPaymentStatusFilter('all');
                            setSelectedCompetition('all');
                          }}
                          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all border border-purple-400/30"
                        >
                          Clear Filters
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((invoice) => {
                  const invoiceKey = `${invoice.studioId}-${invoice.competitionId}`;
                  const isSelected = selectedInvoices.has(invoiceKey);
                  return (
                  <tr key={invoiceKey} className={`hover:bg-white/5 transition-colors ${isSelected ? 'bg-purple-500/10' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleInvoiceSelection(invoiceKey)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-purple-500 cursor-pointer"
                      />
                    </td>
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
                          Confirmed: {formatDate(invoice.reservation?.paymentConfirmedAt)}
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
                              disabled={processingId === invoice.reservation?.id}
                              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm font-semibold transition-all border border-green-400/30 disabled:opacity-50"
                            >
                              {processingId === invoice.reservation?.id ? 'Processing...' : 'Mark Paid'}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {sortedInvoices.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-white mb-2">No Invoices Found</h3>
              <p className="text-gray-400 mb-4">
                {paymentStatusFilter !== 'all'
                  ? `No ${paymentStatusFilter} invoices match your filters.`
                  : 'Invoices will appear here once studios create reservations.'}
              </p>
            </div>
          ) : (
            sortedInvoices.map((invoice) => {
              const invoiceKey = `${invoice.studioId}-${invoice.competitionId}`;
              const isSelected = selectedInvoices.has(invoiceKey);
              return (
                <div
                  key={invoiceKey}
                  className={`bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-4 ${
                    isSelected ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
                  }`}
                >
                  {/* Card Header with Checkbox */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleInvoiceSelection(invoiceKey)}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-purple-500 cursor-pointer"
                        />
                        <h4 className="text-lg font-bold text-white">{invoice.studioName || 'N/A'}</h4>
                      </div>
                      <p className="text-sm text-gray-400">{invoice.studioCode || 'N/A'}</p>
                      <p className="text-xs text-gray-500">
                        {invoice.studioCity || 'N/A'}, {invoice.studioProvince || 'N/A'}
                      </p>
                    </div>
                    {getPaymentStatusBadge(invoice.reservation?.paymentStatus)}
                  </div>

                  {/* Event Info */}
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <div className="text-sm text-gray-400">Event</div>
                    <div className="text-white font-semibold">{invoice.competitionName || 'N/A'}</div>
                    <div className="text-xs text-gray-500">
                      {invoice.competitionYear || 0} • {formatDate(invoice.competitionStartDate)} -{' '}
                      {formatDate(invoice.competitionEndDate)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Routines</div>
                      <div className="text-xl font-bold text-white">{invoice.entryCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Total Amount</div>
                      <div className="text-xl font-bold text-green-400">
                        {formatCurrency(invoice.totalAmount || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/dashboard/invoices/${invoice.studioId}/${invoice.competitionId}`}
                      className="w-full text-center px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-semibold transition-all border border-blue-400/30"
                    >
                      View Details
                    </Link>
                    {invoice.reservation && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            handleMarkAsPaid(
                              invoice.reservation!.id,
                              invoice.reservation!.paymentStatus || 'pending',
                              invoice.studioName
                            )
                          }
                          disabled={processingId === invoice.reservation?.id}
                          className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-semibold transition-all border border-green-400/30 disabled:opacity-50"
                        >
                          {processingId === invoice.reservation?.id ? 'Processing...' : 'Mark Paid'}
                        </button>
                        <button
                          onClick={() =>
                            handleSendReminder(invoice.studioId, invoice.competitionId, invoice.studioName)
                          }
                          disabled={sendReminderMutation.isPending}
                          className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg font-semibold transition-all border border-purple-400/30 disabled:opacity-50"
                        >
                          {sendReminderMutation.isPending ? 'Sending...' : 'Reminder'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
