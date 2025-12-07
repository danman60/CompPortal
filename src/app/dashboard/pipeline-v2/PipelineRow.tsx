'use client';

import { ChevronDown, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';
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

  return (
    <tr
      className={`hover:bg-white/5 cursor-pointer transition-colors ${
        isExpanded ? 'bg-white/10' : ''
      }`}
      onClick={() => onExpandChange(!isExpanded)}
    >
      {/* Expand toggle */}
      <td className="px-4 py-3 w-10">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-purple-200/50" />
        ) : (
          <ChevronRight className="h-4 w-4 text-purple-200/50" />
        )}
      </td>

      {/* Studio info */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-white">{r.studioName}</span>
          {r.studioCode && (
            <span className="text-xs text-purple-200/50">Code: {r.studioCode}</span>
          )}
          <div className="flex items-center gap-1 text-xs text-purple-200/50">
            <MapPin className="h-3 w-3" />
            {r.studioCity}, {r.studioProvince}
          </div>
        </div>
      </td>

      {/* Contact */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          {r.contactName && (
            <span className="text-sm text-white">{r.contactName}</span>
          )}
          <div className="flex items-center gap-1 text-xs text-purple-200/50">
            <Mail className="h-3 w-3" />
            {r.contactEmail}
          </div>
          {r.contactPhone && (
            <div className="flex items-center gap-1 text-xs text-purple-200/50">
              <Phone className="h-3 w-3" />
              {r.contactPhone}
            </div>
          )}
        </div>
      </td>

      {/* Competition */}
      <td className="px-4 py-3">
        <span className="text-sm text-white">{r.competitionName}</span>
        <span className="text-xs text-purple-200/50 ml-1">{r.competitionYear}</span>
      </td>

      {/* Spaces */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-white">
          {r.spacesConfirmed}/{r.spacesRequested}
        </span>
        <span className="text-xs text-purple-200/50 ml-1">spaces</span>
      </td>

      {/* Entries */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-white">{r.entryCount}</span>
        <span className="text-xs text-purple-200/50 ml-1">entries</span>
      </td>

      {/* Balance */}
      <td className="px-4 py-3 text-right">
        {balanceDue > 0 ? (
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-amber-400">
              {formatCurrency(balanceDue)}
            </span>
            {r.invoiceDueDate && (
              <span className="text-xs text-purple-200/50">
                due {new Date(r.invoiceDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        ) : r.displayStatus === 'paid_complete' ? (
          <span className="text-sm font-medium text-emerald-400">Paid</span>
        ) : (
          <span className="text-sm text-purple-200/40">—</span>
        )}
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        <BeadProgress status={r.displayStatus} hasIssue={r.hasIssue} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={r.displayStatus} />
      </td>

      {/* Quick actions (stop propagation to prevent row expansion) */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {/* Primary action button based on status */}
          {r.displayStatus === 'pending_review' && (
            <button
              onClick={() => mutations.openApprovalModal(r)}
              disabled={mutations.isApproving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg disabled:opacity-50 shadow-lg shadow-green-500/25"
            >
              Approve
            </button>
          )}
          {r.displayStatus === 'ready_to_invoice' && (
            <button
              onClick={() => mutations.createInvoice({ reservationId: r.id })}
              disabled={mutations.isCreatingInvoice}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-lg disabled:opacity-50 shadow-lg shadow-purple-500/25"
            >
              {mutations.isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
            </button>
          )}
          {r.displayStatus === 'invoice_sent' && r.invoiceId && (
            <button
              onClick={() => mutations.markAsPaid({ invoiceId: r.invoiceId! })}
              disabled={mutations.isMarkingPaid}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg disabled:opacity-50 shadow-lg shadow-green-500/25"
            >
              {mutations.isMarkingPaid ? 'Processing...' : 'Mark Paid'}
            </button>
          )}
          {r.displayStatus === 'needs_attention' && (
            <button
              onClick={() => mutations.reopenSummary({ reservationId: r.id })}
              disabled={mutations.isReopeningSummary}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg disabled:opacity-50 shadow-lg shadow-amber-500/25"
            >
              {mutations.isReopeningSummary ? 'Fixing...' : 'Fix Issue'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
