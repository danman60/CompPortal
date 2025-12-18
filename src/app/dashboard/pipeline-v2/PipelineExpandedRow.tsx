'use client';

import { format } from 'date-fns';
import {
  DollarSign,
  FileText,
  Calendar,
  AlertTriangle,
  Send,
  RefreshCw,
  Ban,
  Edit,
  ClipboardList,
  Clock,
  PlusCircle,
  Check,
  X,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import type { PipelineExpandedRowProps } from './types';

export function PipelineExpandedRow({ reservation, mutations }: PipelineExpandedRowProps) {
  const r = reservation;

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <tr className="bg-white/5">
      <td colSpan={9} className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: Reservation Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-purple-400" />
              Reservation
            </h4>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/60">Spaces</span>
                <span className="font-medium text-white">
                  {r.spacesConfirmed}/{r.spacesRequested}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/60">Entries</span>
                <span className="font-medium text-white">{r.entryCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/60">Approved</span>
                <span className="font-medium text-white">{formatDate(r.approvedAt)}</span>
              </div>
              <button
                onClick={() => mutations.openSpacesModal(r.id)}
                title="Modify the number of spaces allocated to this studio"
                className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-200 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20"
              >
                <Edit className="h-3 w-3" />
                Adjust Spaces
              </button>
              {/* Pending Space Request */}
              {r.pendingAdditionalSpaces && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <PlusCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">Pending Space Request</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-200/70">Requested</span>
                      <span className="font-medium text-amber-300">+{r.pendingAdditionalSpaces}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-200/70">New Total</span>
                      <span className="font-medium text-amber-300">{(r.spacesConfirmed || 0) + r.pendingAdditionalSpaces}</span>
                    </div>
                    {r.pendingSpacesJustification && (
                      <p className="text-xs text-amber-200/80 mt-2 italic">&quot;{r.pendingSpacesJustification}&quot;</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mutations.approveSpaceRequest({ reservationId: r.id })}
                      disabled={mutations.isApprovingSpaceRequest}
                      title="Grant the additional spaces requested by this studio"
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/40"
                    >
                      <Check className="h-3 w-3" />
                      {mutations.isApprovingSpaceRequest ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => mutations.denySpaceRequest({ reservationId: r.id })}
                      disabled={mutations.isDenyingSpaceRequest}
                      title="Reject the request for additional spaces"
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-300 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/40"
                    >
                      <X className="h-3 w-3" />
                      {mutations.isDenyingSpaceRequest ? '...' : 'Deny'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Summary */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Summary
            </h4>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/60">Status</span>
                <span className={`font-medium ${r.hasSummary ? 'text-emerald-400' : 'text-purple-200/60'}`}>
                  {r.hasSummary ? 'Submitted' : 'Pending'}
                </span>
              </div>
              {r.summarySubmittedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Submitted</span>
                  <span className="font-medium text-white">{formatDate(r.summarySubmittedAt)}</span>
                </div>
              )}
              {r.hasIssue && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg mt-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-300">Issue Detected</p>
                      <p className="text-xs text-amber-200/80 mt-0.5">{r.hasIssue}</p>
                    </div>
                  </div>
                </div>
              )}
              {r.hasSummary && (
                <button
                  onClick={() => {
                    if (confirm(`Reopen summary for ${r.studioName}? This will allow them to modify their entry summary.`)) {
                      mutations.reopenSummary({ reservationId: r.id });
                    }
                  }}
                  disabled={mutations.isReopeningSummary}
                  title="Allow studio to make changes to their submitted summary"
                  className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30"
                >
                  <RefreshCw className="h-3 w-3" />
                  {mutations.isReopeningSummary ? 'Reopening...' : 'Reopen for Edits'}
                </button>
              )}
            </div>
          </div>

          {/* Column 3: Invoice */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              Invoice
            </h4>
            {r.invoiceId ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Invoice #</span>
                  <span className="font-medium text-white">
                    {r.invoiceNumber || r.invoiceId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Total</span>
                  <span className="font-medium text-white">{formatCurrency(r.invoiceAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Paid</span>
                  <span className="font-medium text-emerald-400">{formatCurrency(r.invoiceAmountPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Balance</span>
                  <span className={`font-semibold ${(r.invoiceBalanceRemaining || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatCurrency(r.invoiceBalanceRemaining)}
                  </span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  {/* View Invoice - always available */}
                  <Link
                    href={`/dashboard/invoices/${r.invoiceId}`}
                    title="View full invoice details"
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Link>
                  {r.invoiceStatus !== 'VOIDED' && (
                    <>
                      <button
                        onClick={() => {
                          if (confirm(`Send invoice ${r.invoiceNumber || ''} to ${r.contactEmail}?`)) {
                            mutations.sendInvoice({ invoiceId: r.invoiceId! });
                          }
                        }}
                        disabled={mutations.isSendingInvoice}
                        title="Email this invoice to the studio contact"
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg border border-cyan-500/30"
                      >
                        <Send className="h-3 w-3" />
                        {mutations.isSendingInvoice ? '...' : 'Send'}
                      </button>
                      <button
                        onClick={() => mutations.openPaymentModal(r.invoiceId!)}
                        title="Record a partial or full payment on this invoice"
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30"
                      >
                        <DollarSign className="h-3 w-3" />
                        Payment
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Void this invoice? This action cannot be undone.')) {
                            mutations.voidInvoice({ invoiceId: r.invoiceId!, reason: 'Voided by CD' });
                          }
                        }}
                        disabled={mutations.isVoidingInvoice}
                        title="Cancel this invoice permanently"
                        className="px-2 py-1.5 text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/30"
                      >
                        <Ban className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 text-center">
                <p className="text-sm text-purple-200/60">No invoice yet</p>
                {r.displayStatus === 'ready_to_invoice' && (
                  <button
                    onClick={() => mutations.createInvoice({ reservationId: r.id })}
                    disabled={mutations.isCreatingInvoice}
                    title="Generate an invoice from this studio's entry summary"
                    className="mt-3 w-full px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-lg shadow-lg shadow-purple-500/25"
                  >
                    {mutations.isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Column 4: Payment & Activity */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Payment
            </h4>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/60">Deposit</span>
                <span className="font-medium text-white">{formatCurrency(r.depositAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/60">Deposit Paid</span>
                <span className={`font-medium ${r.depositPaidAt ? 'text-emerald-400' : 'text-purple-200/60'}`}>
                  {r.depositPaidAt ? formatDate(r.depositPaidAt) : 'Pending'}
                </span>
              </div>
              {!r.depositPaidAt && r.displayStatus !== 'pending_review' && (
                <button
                  onClick={() => mutations.openDepositModal(r.id)}
                  title="Mark the deposit as received for this reservation"
                  className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30"
                >
                  Record Deposit
                </button>
              )}
              {/* Notes section */}
              {r.internalNotes && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <p className="text-xs text-purple-200/60 mb-1">Notes</p>
                  <p className="text-sm text-purple-200">{r.internalNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Log placeholder */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-purple-200/60">
            <Clock className="h-4 w-4" />
            <span>Last activity: {r.lastAction || 'No recent activity'}</span>
            {r.lastActionDate && (
              <span className="text-purple-200/40">• {formatDate(r.lastActionDate)}</span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
