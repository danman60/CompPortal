'use client';

import { Check, AlertTriangle, X } from 'lucide-react';
import type { PipelineBeadProgressProps, DisplayStatus } from './types';

// Map display status to step completion (0-4)
function getStepFromStatus(status: DisplayStatus): number {
  switch (status) {
    case 'pending_review':
      return 0;
    case 'rejected':
      return 0;
    case 'approved':
      return 1;
    case 'ready_to_invoice':
      return 2;
    case 'invoice_sent':
      return 3;
    case 'paid_complete':
      return 4;
    case 'needs_attention':
      return 1; // Show at approved stage with warning
    default:
      return 0;
  }
}

const steps = ['Requested', 'Approved', 'Summary', 'Invoiced', 'Paid'];

export function BeadProgress({ status, hasIssue }: PipelineBeadProgressProps) {
  const currentStep = getStepFromStatus(status);
  const isRejected = status === 'rejected';
  const hasWarning = hasIssue !== null || status === 'needs_attention';

  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep || (status === 'paid_complete' && index === 4);
        const isCurrent = index === currentStep && status !== 'paid_complete';
        const isFuture = index > currentStep;

        // Determine bead styling
        let beadBg = 'bg-white/10'; // future step
        let borderColor = 'border-white/20';
        let iconColor = 'text-purple-200/30';

        if (isRejected && index === 0) {
          beadBg = 'bg-red-500/20';
          borderColor = 'border-red-500';
          iconColor = 'text-red-400';
        } else if (isCompleted) {
          beadBg = 'bg-emerald-500/20';
          borderColor = 'border-emerald-500';
          iconColor = 'text-emerald-400';
        } else if (isCurrent) {
          if (hasWarning) {
            beadBg = 'bg-amber-500/20';
            borderColor = 'border-amber-500';
            iconColor = 'text-amber-400';
          } else {
            beadBg = 'bg-indigo-500/20';
            borderColor = 'border-indigo-500';
            iconColor = 'text-indigo-400';
          }
        }

        return (
          <div key={step} className="flex items-center">
            {/* Bead - 24px (h-6 w-6) with border */}
            <div
              className={`w-6 h-6 rounded-full ${beadBg} border-2 ${borderColor} flex items-center justify-center transition-all`}
              title={step}
            >
              {isCompleted && !isRejected && (
                <Check className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={3} />
              )}
              {isRejected && index === 0 && (
                <X className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={3} />
              )}
              {isCurrent && hasWarning && (
                <AlertTriangle className={`h-3 w-3 ${iconColor}`} />
              )}
            </div>
            {/* Connector line (except after last) */}
            {index < steps.length - 1 && (
              <div
                className={`w-4 h-0.5 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
