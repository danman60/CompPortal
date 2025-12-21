'use client';

import type { PipelineBeadProgressProps, DisplayStatus } from './types';

// Map display status to step completion (0-3) - 4 beads like mockup
function getStepFromStatus(status: DisplayStatus): number {
  switch (status) {
    case 'pending_review':
      return -1; // Before first bead
    case 'rejected':
      return -1;
    case 'approved':
      return 0; // First bead active
    case 'ready_to_invoice':
      return 1; // Second bead active (entries submitted)
    case 'invoice_sent':
      return 2; // Third bead active
    case 'paid_complete':
      return 3; // All beads complete
    default:
      return -1;
  }
}

// 4 steps like mockup: Approved → Entries Submitted → Invoice Sent → Paid
const steps = ['Approved', 'Entries', 'Invoice', 'Paid'];

export function BeadProgress({ status, hasIssue }: PipelineBeadProgressProps) {
  const currentStep = getStepFromStatus(status);
  const isError = hasIssue !== null;
  const isPending = status === 'pending_review';

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep || (status === 'paid_complete');
        const isCurrent = index === currentStep && status !== 'paid_complete';
        const isFuture = index > currentStep || isPending;

        // Determine bead styling based on state
        let beadBg = 'bg-white/5';
        let borderColor = 'border-white/20';
        let content: React.ReactNode = null;

        if (isPending && index === 0) {
          // Pending review - show ? on first bead
          beadBg = 'bg-yellow-500/20';
          borderColor = 'border-yellow-500';
          content = <span className="text-yellow-400 text-xs">?</span>;
        } else if (isError && (index === 1 || index === 2)) {
          // Error state - show ! or X
          beadBg = 'bg-red-500/20';
          borderColor = 'border-red-500';
          content = index === 1
            ? <span className="text-red-400 text-xs font-bold">!</span>
            : <span className="text-red-400 text-xs">✕</span>;
        } else if (isCompleted) {
          // Completed - show checkmark
          beadBg = 'bg-emerald-500/20';
          borderColor = 'border-emerald-500';
          content = (
            <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          );
        } else if (isCurrent) {
          // Current step - show dot
          const colorMap: Record<number, { bg: string; border: string; dot: string }> = {
            0: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', dot: 'bg-emerald-400' },
            1: { bg: 'bg-purple-500/20', border: 'border-purple-500', dot: 'bg-purple-400' },
            2: { bg: 'bg-blue-500/20', border: 'border-blue-500', dot: 'bg-blue-400' },
            3: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', dot: 'bg-emerald-400' },
          };
          const colors = colorMap[index] || colorMap[0];
          beadBg = colors.bg;
          borderColor = colors.border;
          content = <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>;
        }

        // Connector line color
        const lineColor = isCompleted ? 'bg-emerald-500/50' : isError && index <= 2 ? 'bg-red-500/50' : 'bg-white/10';

        return (
          <div key={step} className="flex items-center">
            {/* Bead - 24px circle like mockup */}
            <div
              className={`progress-bead w-6 h-6 rounded-full ${beadBg} border-2 ${borderColor} flex items-center justify-center transition-transform hover:scale-110`}
              title={step}
            >
              {content}
            </div>
            {/* Connector line (except after last) */}
            {index < steps.length - 1 && (
              <div className={`w-4 h-0.5 ${lineColor}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
