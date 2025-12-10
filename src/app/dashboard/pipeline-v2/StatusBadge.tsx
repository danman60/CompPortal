'use client';

import type { PipelineStatusBadgeProps, DisplayStatus } from './types';

const statusConfig: Record<
  DisplayStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  pending_review: {
    label: 'Pending Review',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-500/50',
  },
  approved: {
    label: 'Awaiting Submission',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-300',
    borderColor: 'border-orange-500/50',
  },
  ready_to_invoice: {
    label: 'Ready to Invoice',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/50',
  },
  invoice_sent: {
    label: 'Awaiting Payment',
    bgColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-500/50',
  },
  paid_complete: {
    label: 'Paid',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/50',
  },
  needs_attention: {
    label: 'Needs Attention',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-300',
    borderColor: 'border-red-500/50',
  },
  rejected: {
    label: 'Rejected',
    bgColor: 'bg-gray-500/20',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/50',
  },
};

export function StatusBadge({ status }: PipelineStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {config.label}
    </span>
  );
}
