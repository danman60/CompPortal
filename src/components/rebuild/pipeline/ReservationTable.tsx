"use client";

import { useState } from 'react';
import { Badge } from '@/components/rebuild/ui/Badge';
import { Button } from '@/components/rebuild/ui/Button';

/**
 * Get last action text based on reservation status
 */
function getLastAction(reservation: Reservation): string {
  if (reservation.invoicePaid) {
    return 'Marked Paid';
  }

  switch (reservation.status) {
    case 'invoiced':
      return 'Invoice Sent';
    case 'summarized':
      return 'Summary Sent';
    case 'approved':
    case 'adjusted':
      return 'Reservation Approved';
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
  invoicePaid?: boolean;
  invoiceAmount?: number;
  updatedAt?: string;
  studioId?: string;
  competitionId?: string;
  [key: string]: any;
}

interface ReservationTableProps {
  reservations: Reservation[];
  onApprove: (reservation: Reservation) => void;
  onReject: (reservationId: string, studioName: string) => void;
  onCreateInvoice: (reservationId: string) => Promise<void>;
  onMarkAsPaid: (invoiceId: string, studioId: string, competitionId: string) => Promise<void>;
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
  onMarkAsPaid,
}: ReservationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (reservations.length === 0) {
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
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Studio</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Competition</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Requested</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Routines</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Status</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Last Action</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-400 uppercase">Amount</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => {
              const isExpanded = expandedRows.has(reservation.id);
              const isPending = reservation.status === 'pending';
              const isSummarized = reservation.status === 'summarized';
              const isInvoiced = reservation.status === 'invoiced';
              const needsInvoice = isSummarized && !reservation.invoiceId;
              const canMarkPaid = isInvoiced && reservation.invoiceId && !reservation.invoicePaid;
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
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(reservation.updatedAt)}</div>
                  </td>
                  <td className="px-4 py-4 text-right text-white font-medium">
                    {reservation.invoiceAmount ? `$${reservation.invoiceAmount.toFixed(2)}` : '—'}
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
                      {canMarkPaid && (
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
                      )}
                      {isPaid && (
                        <span className="text-green-400 text-sm font-semibold">✓ Complete!</span>
                      )}
                      {!isPending && !needsInvoice && !canMarkPaid && !isPaid && (
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
