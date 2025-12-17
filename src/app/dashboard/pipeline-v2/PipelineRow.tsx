'use client';

import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { BeadProgress } from './BeadProgress';
import { formatCurrency } from './PipelineTable';
import type { PipelineRowProps } from './types';

export function PipelineRow({
  reservation,
  isExpanded,
  onExpandChange,
  mutations,
}: PipelineRowProps) {
  const r = reservation;

  // Use invoiceBalanceRemaining directly if available, otherwise calculate
  const balanceDue = r.invoiceBalanceRemaining ?? (r.invoiceAmount ? r.invoiceAmount - (r.invoiceAmountPaid || 0) : 0);

  // Determine row background based on status
  const rowBg = r.displayStatus === 'needs_attention'
    ? 'hover:bg-red-500/5'
    : r.displayStatus === 'paid_complete'
    ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
    : 'hover:bg-white/5';

  return (
    <tr
      className={`border-b border-white/5 cursor-pointer transition-colors ${rowBg} ${
        isExpanded ? 'bg-white/10' : ''
      }`}
      onClick={() => onExpandChange(!isExpanded)}
    >
      {/* Expand toggle */}
      <td className="px-4 py-4">
        <svg
          className={`w-4 h-4 text-purple-300/50 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </td>

      {/* Studio info - combined with location like mockup */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{r.studioName}</span>
          {r.isStudioClaimed && (
            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30">CLAIMED</span>
          )}
          {r.hasIssue && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">FIX</span>
          )}
          {r.pendingAdditionalSpaces && r.pendingAdditionalSpaces > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded border border-amber-500/30" title={`Requesting +${r.pendingAdditionalSpaces} spaces`}>+{r.pendingAdditionalSpaces} REQ</span>
          )}
        </div>
        <div className="text-xs text-purple-200/50">
          {r.studioCity}, {r.studioProvince} {r.studioCode && `• ${r.studioCode}`}
        </div>
      </td>

      {/* Status - now in second position like mockup */}
      <td className="px-4 py-4">
        <StatusBadge status={r.displayStatus} />
      </td>

      {/* Competition */}
      <td className="px-4 py-4">
        <div className="text-sm text-purple-100">{r.competitionName}</div>
      </td>

      {/* Progress - centered like mockup */}
      <td className="px-4 py-4">
        <div className="flex justify-center">
          <BeadProgress status={r.displayStatus} hasIssue={r.hasIssue} />
        </div>
      </td>

      {/* Entries - formatted like mockup */}
      <td className="px-4 py-4 text-center">
        <span className="text-white font-medium">{r.entryCount}</span>
        <span className="text-purple-200/50">/{r.spacesConfirmed}</span>
      </td>

      {/* Balance - right aligned like mockup */}
      <td className="px-4 py-4 text-right">
        {balanceDue > 0 ? (
          <div>
            <div className="text-orange-400 font-medium">{formatCurrency(balanceDue)}</div>
            {r.invoiceDueDate && (
              <div className="text-xs text-purple-200/50">
                Due {new Date(r.invoiceDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
        ) : r.displayStatus === 'paid_complete' ? (
          <div className="text-emerald-400 font-medium">$0</div>
        ) : (
          <div className="text-purple-200/50">—</div>
        )}
      </td>

      {/* Action - centered like mockup */}
      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
        {r.displayStatus === 'pending_review' && (
          <button
            onClick={() => mutations.openApprovalModal(r)}
            disabled={mutations.isApproving}
            title="Review and approve or reject this reservation request"
            className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
          >
            Review Request
          </button>
        )}
        {r.displayStatus === 'approved' && (
          <span className="text-purple-200/50 text-xs" title="Studio is adding entries to their reservation">Awaiting entries</span>
        )}
        {r.displayStatus === 'ready_to_invoice' && (
          <button
            onClick={() => mutations.createInvoice({ reservationId: r.id })}
            disabled={mutations.isCreatingInvoice}
            title="Generate an invoice from this studio's entry summary"
            className="px-3 py-1.5 text-white text-xs font-medium rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg hover:shadow-pink-500/30 transition-all"
          >
            {mutations.isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
          </button>
        )}
        {r.displayStatus === 'invoice_sent' && r.invoiceId && (
          <button
            onClick={() => mutations.openPaymentModal(r.invoiceId!)}
            title="Record a partial or full payment on this invoice"
            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            Record Payment
          </button>
        )}
        {r.displayStatus === 'paid_complete' && (
          <span className="text-emerald-400 text-xs" title="All payments received - reservation complete">Done</span>
        )}
        {r.displayStatus === 'needs_attention' && (
          <button
            onClick={() => mutations.reopenSummary({ reservationId: r.id })}
            disabled={mutations.isReopeningSummary}
            title="Reopen the summary so studio can correct the issue"
            className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            {mutations.isReopeningSummary ? 'Fixing...' : 'Fix Issue'}
          </button>
        )}
      </td>

      {/* More menu - like mockup */}
      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
        <button className="p-2 text-purple-300/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
