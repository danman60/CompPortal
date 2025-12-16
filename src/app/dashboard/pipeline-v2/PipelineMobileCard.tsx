'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, DollarSign, FileText, Edit, Send, RefreshCw, Ban, AlertTriangle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { BeadProgress } from './BeadProgress';
import type { PipelineReservation, PipelineMutations } from './types';
import Link from 'next/link';

interface PipelineMobileCardProps {
  reservation: PipelineReservation;
  mutations: PipelineMutations;
}

export function PipelineMobileCard({ reservation, mutations }: PipelineMobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const r = reservation;

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(new Date(date), 'MMM d');
  };

  // Calculate balance
  const balanceDue = r.invoiceBalanceRemaining ?? (r.invoiceAmount ? r.invoiceAmount - (r.invoiceAmountPaid || 0) : 0);

  // Determine card styling based on status
  const getCardBorder = () => {
    if (r.displayStatus === 'needs_attention') return 'border-red-500/50';
    if (r.displayStatus === 'paid_complete') return 'border-emerald-500/30';
    if (r.displayStatus === 'pending_review') return 'border-yellow-500/30';
    return 'border-white/10';
  };

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-xl border-2 ${getCardBorder()} overflow-hidden`}>
      {/* Main Card Content - Always Visible */}
      <div
        className="p-4 cursor-pointer active:bg-white/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Top Row: Studio Name + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{r.studioName}</h3>
              {r.isStudioClaimed && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30 flex-shrink-0">CLAIMED</span>
              )}
              {r.hasIssue && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded flex-shrink-0">FIX</span>
              )}
            </div>
            <p className="text-xs text-purple-200/50 truncate mt-0.5">
              {r.studioCity}{r.studioProvince && `, ${r.studioProvince}`} {r.studioCode && `• ${r.studioCode}`}
            </p>
          </div>
          <StatusBadge status={r.displayStatus} />
        </div>

        {/* Middle Row: Progress Beads + Competition */}
        <div className="flex items-center justify-between mb-3">
          <BeadProgress status={r.displayStatus} hasIssue={r.hasIssue} />
          <span className="text-xs text-purple-200/60 truncate ml-2 max-w-[120px]">{r.competitionName}</span>
        </div>

        {/* Bottom Row: Entries + Balance + Expand Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-white">{r.entryCount}<span className="text-purple-200/50">/{r.spacesConfirmed}</span></div>
              <div className="text-[10px] text-purple-200/50 uppercase">Entries</div>
            </div>
            {balanceDue > 0 ? (
              <div className="text-center">
                <div className="text-sm font-medium text-orange-400">{formatCurrency(balanceDue)}</div>
                <div className="text-[10px] text-purple-200/50 uppercase">Balance</div>
              </div>
            ) : r.displayStatus === 'paid_complete' ? (
              <div className="text-center">
                <div className="text-sm font-medium text-emerald-400">$0</div>
                <div className="text-[10px] text-purple-200/50 uppercase">Balance</div>
              </div>
            ) : null}
          </div>

          {/* Primary Action + Expand Toggle */}
          <div className="flex items-center gap-2">
            {r.displayStatus === 'pending_review' && (
              <button
                onClick={(e) => { e.stopPropagation(); mutations.openApprovalModal(r); }}
                title="Review and approve or reject this reservation"
                className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded-lg border border-yellow-500/30"
              >
                Review
              </button>
            )}
            {r.displayStatus === 'ready_to_invoice' && (
              <button
                onClick={(e) => { e.stopPropagation(); mutations.createInvoice({ reservationId: r.id }); }}
                disabled={mutations.isCreatingInvoice}
                title="Generate invoice from entry summary"
                className="px-3 py-1.5 text-white text-xs font-medium rounded-lg bg-gradient-to-r from-pink-500 to-purple-500"
              >
                Invoice
              </button>
            )}
            {r.displayStatus === 'invoice_sent' && r.invoiceId && (
              <button
                onClick={(e) => { e.stopPropagation(); mutations.openPaymentModal(r.invoiceId!); }}
                title="Record a payment on this invoice"
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/30"
              >
                Payment
              </button>
            )}
            {r.displayStatus === 'needs_attention' && (
              <button
                onClick={(e) => { e.stopPropagation(); mutations.reopenSummary({ reservationId: r.id }); }}
                disabled={mutations.isReopeningSummary}
                title="Reopen summary so studio can fix the issue"
                className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg"
              >
                Fix
              </button>
            )}
            {r.displayStatus === 'paid_complete' && (
              <span className="text-emerald-400 text-xs font-medium" title="All payments received">Done ✓</span>
            )}

            <button className="p-1 text-purple-300/50">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-white/10 bg-white/5 p-4 space-y-4">
          {/* Reservation Info */}
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold text-purple-200/60 uppercase tracking-wide">Reservation</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-purple-200/50 text-xs">Spaces</div>
                <div className="text-white font-medium">{r.spacesConfirmed}/{r.spacesRequested}</div>
              </div>
              <div>
                <div className="text-purple-200/50 text-xs">Entries</div>
                <div className="text-white font-medium">{r.entryCount}</div>
              </div>
              <div>
                <div className="text-purple-200/50 text-xs">Approved</div>
                <div className="text-white font-medium">{formatDate(r.approvedAt)}</div>
              </div>
            </div>
            <button
              onClick={() => mutations.openSpacesModal(r.id)}
              title="Modify the number of spaces allocated to this studio"
              className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-purple-200 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20"
            >
              <Edit className="h-3 w-3" />
              Adjust Spaces
            </button>
            <p className="text-[10px] text-purple-200/40 text-center mt-1">
              Change allocated space count
            </p>
          </div>

          {/* Summary Info */}
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold text-purple-200/60 uppercase tracking-wide">Summary</h4>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200/50">Status</span>
              <span className={r.hasSummary ? 'text-emerald-400' : 'text-purple-200/60'}>
                {r.hasSummary ? 'Submitted' : 'Pending'}
              </span>
            </div>
            {r.summarySubmittedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/50">Submitted</span>
                <span className="text-white">{formatDate(r.summarySubmittedAt)}</span>
              </div>
            )}
            {r.hasIssue && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg mt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-200">{r.hasIssue}</p>
                </div>
              </div>
            )}
            {r.hasSummary && r.displayStatus !== 'paid_complete' && (
              <>
                <button
                  onClick={() => {
                    if (confirm(`Reopen summary for ${r.studioName}? This will allow them to modify their entry summary.`)) {
                      mutations.reopenSummary({ reservationId: r.id });
                    }
                  }}
                  disabled={mutations.isReopeningSummary}
                  title="Allow studio to make changes to their submitted summary"
                  className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30"
                >
                  <RefreshCw className="h-3 w-3" />
                  {mutations.isReopeningSummary ? 'Reopening...' : 'Reopen for Edits'}
                </button>
                <p className="text-[10px] text-purple-200/40 text-center mt-1">
                  Allow studio to modify summary
                </p>
              </>
            )}
          </div>

          {/* Invoice Info */}
          {r.invoiceId ? (
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-purple-200/60 uppercase tracking-wide flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Invoice
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-purple-200/50 text-xs">Invoice #</div>
                  <div className="text-white font-medium">{r.invoiceNumber || r.invoiceId.slice(0, 8)}</div>
                </div>
                <div>
                  <div className="text-purple-200/50 text-xs">Total</div>
                  <div className="text-white font-medium">{formatCurrency(r.invoiceAmount)}</div>
                </div>
                <div>
                  <div className="text-purple-200/50 text-xs">Paid</div>
                  <div className="text-emerald-400 font-medium">{formatCurrency(r.invoiceAmountPaid)}</div>
                </div>
                <div>
                  <div className="text-purple-200/50 text-xs">Balance</div>
                  <div className={`font-semibold ${(r.invoiceBalanceRemaining || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatCurrency(r.invoiceBalanceRemaining)}
                  </div>
                </div>
              </div>
                  {/* View Invoice - always available */}
                  <Link
                    href={`/dashboard/invoices/${r.invoiceId}`}
                    title="View full invoice details"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Link>
              {r.invoiceStatus !== 'PAID' && r.invoiceStatus !== 'VOIDED' && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (confirm(`Send invoice ${r.invoiceNumber || ''} to ${r.contactEmail}?`)) {
                          mutations.sendInvoice({ invoiceId: r.invoiceId! });
                        }
                      }}
                      disabled={mutations.isSendingInvoice}
                      title="Email this invoice to the studio"
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg border border-cyan-500/30"
                    >
                      <Send className="h-3 w-3" />
                      {mutations.isSendingInvoice ? '...' : 'Send'}
                    </button>
                    <button
                      onClick={() => mutations.openPaymentModal(r.invoiceId!)}
                      title="Record a payment on this invoice"
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30"
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
                      className="px-3 py-2 text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/30"
                    >
                      <Ban className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <p className="flex-1 text-[10px] text-purple-200/40 text-center">
                      Email invoice
                    </p>
                    <p className="flex-1 text-[10px] text-purple-200/40 text-center">
                      Record payment
                    </p>
                    <p className="text-[10px] text-purple-200/40 text-center px-3">
                      Cancel
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : r.displayStatus === 'ready_to_invoice' ? (
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-sm text-purple-200/60 mb-2">No invoice yet</p>
              <button
                onClick={() => mutations.createInvoice({ reservationId: r.id })}
                disabled={mutations.isCreatingInvoice}
                title="Generate invoice from entry summary"
                className="w-full px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-lg"
              >
                {mutations.isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
              </button>
              <p className="text-[10px] text-purple-200/40 mt-1">
                Generate from entry summary
              </p>
            </div>
          ) : null}

          {/* Deposit Info */}
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold text-purple-200/60 uppercase tracking-wide flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Deposit
            </h4>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200/50">Amount</span>
              <span className="text-white font-medium">{formatCurrency(r.depositAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200/50">Status</span>
              <span className={r.depositPaidAt ? 'text-emerald-400' : 'text-purple-200/60'}>
                {r.depositPaidAt ? formatDate(r.depositPaidAt) : 'Pending'}
              </span>
            </div>
            {!r.depositPaidAt && r.displayStatus !== 'pending_review' && (
              <>
                <button
                  onClick={() => mutations.openDepositModal(r.id)}
                  title="Mark the deposit as received for this reservation"
                  className="w-full mt-2 px-3 py-2 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30"
                >
                  Record Deposit
                </button>
                <p className="text-[10px] text-purple-200/40 text-center mt-1">
                  Mark deposit as paid
                </p>
              </>
            )}
          </div>

          {/* Notes */}
          {r.internalNotes && (
            <div className="bg-white/5 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-purple-200/60 uppercase tracking-wide mb-1">Notes</h4>
              <p className="text-sm text-purple-200">{r.internalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
