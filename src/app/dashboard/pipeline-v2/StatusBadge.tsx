'use client';

import type { PipelineStatusBadgeProps, DisplayStatus } from './types';

const statusConfig: Record<
  DisplayStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  pending_review: {
    label: 'Pending Review',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
  },
  approved: {
    label: 'Approved',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  ready_to_invoice: {
    label: 'Ready to Invoice',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
  },
  invoice_sent: {
    label: 'Invoice Sent',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-800',
  },
  paid_complete: {
    label: 'Paid - Complete',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  needs_attention: {
    label: 'Needs Attention',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
  rejected: {
    label: 'Rejected',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
  },
};

export function StatusBadge({ status }: PipelineStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}
