'use client';

import { ChevronDown, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { BeadProgress } from './BeadProgress';
import type { PipelineRowProps } from './types';

export function PipelineRow({
  reservation,
  isExpanded,
  onExpandChange,
  mutations,
}: PipelineRowProps) {
  const r = reservation;

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
        isExpanded ? 'bg-indigo-50/50' : ''
      }`}
      onClick={() => onExpandChange(!isExpanded)}
    >
      {/* Expand toggle */}
      <td className="px-4 py-3 w-10">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </td>

      {/* Studio info */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-gray-900">{r.studioName}</span>
          {r.studioCode && (
            <span className="text-xs text-gray-500">Code: {r.studioCode}</span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {r.studioCity}, {r.studioProvince}
          </div>
        </div>
      </td>

      {/* Contact */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          {r.contactName && (
            <span className="text-sm text-gray-900">{r.contactName}</span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Mail className="h-3 w-3" />
            {r.contactEmail}
          </div>
          {r.contactPhone && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Phone className="h-3 w-3" />
              {r.contactPhone}
            </div>
          )}
        </div>
      </td>

      {/* Competition */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-900">{r.competitionName}</span>
        <span className="text-xs text-gray-500 ml-1">{r.competitionYear}</span>
      </td>

      {/* Spaces */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-gray-900">
          {r.spacesConfirmed}/{r.spacesRequested}
        </span>
        <span className="text-xs text-gray-500 ml-1">spaces</span>
      </td>

      {/* Entries */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-gray-900">{r.entryCount}</span>
        <span className="text-xs text-gray-500 ml-1">entries</span>
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
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {r.displayStatus === 'ready_to_invoice' && (
            <button
              onClick={() => mutations.createInvoice({ reservationId: r.id })}
              disabled={mutations.isCreatingInvoice}
              className="px-3 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50"
            >
              {mutations.isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
            </button>
          )}
          {r.displayStatus === 'invoice_sent' && r.invoiceId && (
            <button
              onClick={() => mutations.markAsPaid({ invoiceId: r.invoiceId! })}
              disabled={mutations.isMarkingPaid}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              {mutations.isMarkingPaid ? 'Processing...' : 'Mark Paid'}
            </button>
          )}
          {r.displayStatus === 'needs_attention' && (
            <button
              onClick={() => mutations.reopenSummary({ reservationId: r.id })}
              disabled={mutations.isReopeningSummary}
              className="px-3 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-50"
            >
              {mutations.isReopeningSummary ? 'Fixing...' : 'Fix Issue'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
