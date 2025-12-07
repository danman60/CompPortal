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
} from 'lucide-react';
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
                className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-200 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20"
              >
                <Edit className="h-3 w-3" />
                Adjust Spaces
              </button>
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
              {r.hasSummary && r.displayStatus !== 'paid_complete' && (
                <button
                  onClick={() => mutations.reopenSummary({ reservationId: r.id })}
                  disabled={mutations.isReopeningSummary}
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
                  {r.invoiceStatus !== 'PAID' && r.invoiceStatus !== 'VOIDED' && (
                    <>
                      <button
                        onClick={() => mutations.sendInvoice({ invoiceId: r.invoiceId! })}
                        disabled={mutations.isSendingInvoice}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg border border-cyan-500/30"
                      >
                        <Send className="h-3 w-3" />
                        {mutations.isSendingInvoice ? '...' : 'Send'}
                      </button>
                      <button
                        onClick={() => mutations.openPaymentModal(r.invoiceId!)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30"
                      >
                        <DollarSign className="h-3 w-3" />
                        Payment
                      </button>
                      <button
                        onClick={() => mutations.voidInvoice({ invoiceId: r.invoiceId!, reason: 'Voided by CD' })}
                        disabled={mutations.isVoidingInvoice}
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
