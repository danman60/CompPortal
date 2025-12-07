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
  Trash2,
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
    <tr className="bg-indigo-50/30">
      <td colSpan={9} className="px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Deposit & Reservation details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Deposit & Payment
            </h4>
            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deposit Amount</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(r.depositAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deposit Paid</span>
                <span className="font-medium text-gray-900">
                  {r.depositPaidAt ? formatDate(r.depositPaidAt) : 'Not paid'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Approved</span>
                <span className="font-medium text-gray-900">{formatDate(r.approvedAt)}</span>
              </div>
              {!r.depositPaidAt && r.displayStatus !== 'pending_review' && (
                <button
                  onClick={() => mutations.openDepositModal(r.id)}
                  className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200"
                >
                  Record Deposit
                </button>
              )}
            </div>
          </div>

          {/* Middle column: Invoice details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoice
            </h4>
            {r.invoiceId ? (
              <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice #</span>
                  <span className="font-medium text-gray-900">
                    {r.invoiceNumber || r.invoiceId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(r.invoiceAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(r.invoiceAmountPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Balance</span>
                  <span
                    className={`font-medium ${
                      (r.invoiceBalanceRemaining || 0) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(r.invoiceBalanceRemaining)}
                  </span>
                </div>

                {/* Invoice actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {r.invoiceStatus !== 'PAID' && r.invoiceStatus !== 'VOIDED' && (
                    <>
                      <button
                        onClick={() => mutations.sendInvoice({ invoiceId: r.invoiceId! })}
                        disabled={mutations.isSendingInvoice}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-md"
                      >
                        <Send className="h-3 w-3" />
                        {mutations.isSendingInvoice ? 'Sending...' : 'Send'}
                      </button>
                      <button
                        onClick={() => mutations.openPaymentModal(r.invoiceId!)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md"
                      >
                        <DollarSign className="h-3 w-3" />
                        Add Payment
                      </button>
                    </>
                  )}
                  {r.invoiceStatus !== 'PAID' && r.invoiceStatus !== 'VOIDED' && (
                    <button
                      onClick={() =>
                        mutations.voidInvoice({ invoiceId: r.invoiceId!, reason: 'Voided by CD' })
                      }
                      disabled={mutations.isVoidingInvoice}
                      className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md"
                    >
                      <Ban className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <p className="text-sm text-gray-500">No invoice created yet</p>
                {r.displayStatus === 'ready_to_invoice' && (
                  <button
                    onClick={() => mutations.createInvoice({ reservationId: r.id })}
                    disabled={mutations.isCreatingInvoice}
                    className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md"
                  >
                    {mutations.isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right column: Actions & notes */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Summary & Actions
            </h4>
            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Summary Status</span>
                <span className="font-medium text-gray-900">
                  {r.hasSummary ? 'Submitted' : 'Not submitted'}
                </span>
              </div>
              {r.summarySubmittedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Submitted At</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(r.summarySubmittedAt)}
                  </span>
                </div>
              )}

              {/* Issue warning */}
              {r.hasIssue && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">Data Issue Detected</p>
                      <p className="text-xs text-amber-700 mt-0.5">{r.hasIssue}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {r.internalNotes && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Internal Notes</p>
                  <p className="text-sm text-gray-700">{r.internalNotes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {r.hasSummary && r.displayStatus !== 'paid_complete' && (
                  <button
                    onClick={() => mutations.reopenSummary({ reservationId: r.id })}
                    disabled={mutations.isReopeningSummary}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {mutations.isReopeningSummary ? 'Reopening...' : 'Reopen for Edits'}
                  </button>
                )}
                <button
                  onClick={() => mutations.openSpacesModal(r.id)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md"
                >
                  <Edit className="h-3 w-3" />
                  Adjust Spaces
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
