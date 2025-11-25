"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/rebuild/ui/Badge';
import { Button } from '@/components/rebuild/ui/Button';

/**
 * Get last action text based on reservation status and invoice status
 */
function getLastAction(reservation: Reservation): string {
  if (reservation.invoicePaid) {
    return 'Marked Paid';
  }

  switch (reservation.status) {
    case 'invoiced':
      // Check invoice status: DRAFT = created but not sent, SENT = sent to studio
      return reservation.invoiceStatus === 'DRAFT' ? 'Invoice Created' : 'Invoice Sent';
    case 'summarized':
      return 'Summary Sent';
    case 'approved':
    case 'adjusted':
      return 'Submitted';
    case 'pending':
      return 'Reservation Sent';
    case 'rejected':
      return 'Reservation Rejected';
    default:
      return 'Unknown';
  }
}

interface Reservation {
  id: string;
  studioName?: string;
  competitionName?: string;
  spacesRequested?: number;
  spacesConfirmed?: number;
  entryCount?: number;
  status?: string | null;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  invoicePaid?: boolean;
  invoiceAmount?: number;
  lastActionDate?: string;
  studioId?: string;
  competitionId?: string;
  [key: string]: any;
}

interface ReservationTableProps {
  reservations: Reservation[];
  onApprove: (reservation: Reservation) => void;
  onReject: (reservationId: string, studioName: string) => void;
  onCreateInvoice: (reservationId: string) => Promise<void>;
  onSendInvoice: (invoiceId: string) => Promise<void>;
  onMarkAsPaid: (invoiceId: string, studioId: string, competitionId: string) => Promise<void>;
  onReopenSummary: (reservationId: string, studioName: string) => Promise<void>;
}

/**
 * Reservation Pipeline Table
 * Expandable rows with action buttons
 */
export function ReservationTable({
  reservations,
  onApprove,
  onReject,
  onCreateInvoice,
  onSendInvoice,
  onMarkAsPaid,
  onReopenSummary,
}: ReservationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<'studio' | 'competition' | 'requested' | 'routines' | 'status' | 'lastAction'>('studio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // Sort reservations
  const sortedReservations = [...reservations].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case 'studio':
        comparison = (a.studioName || '').localeCompare(b.studioName || '');
        break;
      case 'competition':
        comparison = (a.competitionName || '').localeCompare(b.competitionName || '');
        break;
      case 'requested':
        comparison = (a.spacesRequested || 0) - (b.spacesRequested || 0);
        break;
      case 'routines':
        comparison = (a.entryCount || 0) - (b.entryCount || 0);
        break;
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '');
        break;
      case 'lastAction':
        comparison = new Date(a.lastActionDate || 0).getTime() - new Date(b.lastActionDate || 0).getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (sortedReservations.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-16 text-center">
        <div className="text-6xl mb-4">📭</div>
        <div className="text-2xl font-semibold text-white mb-2">No reservations found</div>
        <div className="text-gray-400">Change your filters to see more reservations</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-black/30">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase w-10"></th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('studio')}>
                <div className="flex items-center gap-1">
                  Studio
                  {sortColumn === 'studio' && (
                    <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('competition')}>
                <div className="flex items-center gap-1">
                  Competition
                  {sortColumn === 'competition' && (
                    <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('requested')}>
                <div className="flex items-center justify-center gap-1">
                  Requested
                  {sortColumn === 'requested' && (
                    <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('routines')}>
                <div className="flex items-center justify-center gap-1">
                  Routines
                  {sortColumn === 'routines' && (
                    <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center justify-center gap-1">
                  Status
                  {sortColumn === 'status' && (
                    <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('lastAction')}>
                <div className="flex items-center gap-1">
                  Last Action
                  {sortColumn === 'lastAction' && (
                    <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedReservations.map((reservation) => {
              const isExpanded = expandedRows.has(reservation.id);
              const isPending = reservation.status === 'pending';
              const isSummarized = reservation.status === 'summarized';
              const isInvoiced = reservation.status === 'invoiced';
              const hasDraftInvoice = reservation.invoiceId && reservation.invoiceStatus === 'DRAFT';
              const hasSentInvoice = reservation.invoiceId && reservation.invoiceStatus === 'SENT';
              const needsInvoice = isSummarized && !reservation.invoiceId;
              const canMarkPaid = isInvoiced && hasSentInvoice && !reservation.invoicePaid;
              const isPaid = reservation.invoicePaid === true;

              return (
                <tr key={reservation.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleRow(reservation.id)}
                      className="text-white hover:text-purple-300 transition-colors"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-white font-medium">
                    {reservation.studioName || '—'}
                  </td>
                  <td className="px-4 py-4 text-white">
                    {reservation.competitionName || '—'}
                  </td>
                  <td className="px-4 py-4 text-center text-white">
                    {Number(reservation.spacesRequested) || 0}
                    {(reservation.spacesConfirmed != null && reservation.spacesConfirmed !== reservation.spacesRequested) && (
                      <div className="text-xs text-yellow-400">
                        (approved: {Number(reservation.spacesConfirmed)})
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center text-white font-medium">
                    {Number(reservation.entryCount) || 0}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge status={reservation.status || 'pending' as any} />
                  </td>
                  <td className="px-4 py-4 text-white text-sm">
                    <div className="font-medium">{getLastAction(reservation)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(reservation.lastActionDate)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2 justify-center">
                      {isPending && (
                        <>
                          <Button
                            onClick={() => onApprove(reservation)}
                            variant="primary"
                            className="text-sm px-3 py-1"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => onReject(reservation.id, reservation.studioName || 'Studio')}
                            variant="danger"
                            className="text-sm px-3 py-1"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {needsInvoice && (
                        <Button
                          onClick={() => onCreateInvoice(reservation.id)}
                          variant="primary"
                          className="text-sm px-3 py-1"
                        >
                          Create Invoice
                        </Button>
                      )}
                      {isSummarized && (
                        <Button
                          onClick={() => onReopenSummary(reservation.id, reservation.studioName || 'Studio')}
                          variant="warning"
                          className="text-sm px-3 py-1"
                        >
                          Reopen Summary
                        </Button>
                      )}
                      {hasDraftInvoice && (
                        <>
                          <Link href={`/dashboard/invoices/${reservation.studioId}/${reservation.competitionId}`}>
                            <Button
                              variant="secondary"
                              className="text-sm px-3 py-1"
                            >
                              View Invoice
                            </Button>
                          </Link>
                          <Button
                            onClick={() => onSendInvoice(reservation.invoiceId!)}
                            variant="primary"
                            className="text-sm px-3 py-1"
                          >
                            Send Invoice
                          </Button>
                        </>
                      )}
                      {hasSentInvoice && !reservation.invoicePaid && (
                        <>
                          <Link href={`/dashboard/invoices/${reservation.studioId}/${reservation.competitionId}`}>
                            <Button
                              variant="secondary"
                              className="text-sm px-3 py-1"
                            >
                              View Invoice
                            </Button>
                          </Link>
                          <Button
                            onClick={() => onMarkAsPaid(
                              reservation.invoiceId!,
                              reservation.studioId || '',
                              reservation.competitionId || ''
                            )}
                            variant="primary"
                            className="text-sm px-3 py-1"
                          >
                            Mark as Paid
                          </Button>
                        </>
                      )}
                      {isPaid && (
                        <span className="text-green-400 text-sm font-semibold">✓ Complete!</span>
                      )}
                      {!isPending && !needsInvoice && !hasDraftInvoice && !hasSentInvoice && !isPaid && (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
