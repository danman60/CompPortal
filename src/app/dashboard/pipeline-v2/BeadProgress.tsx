'use client';

import { AlertTriangle } from 'lucide-react';
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

const steps = ['Requested', 'Approved', 'Summary In', 'Invoiced', 'Paid'];

export function BeadProgress({ status, hasIssue }: PipelineBeadProgressProps) {
  const currentStep = getStepFromStatus(status);
  const isRejected = status === 'rejected';
  const hasWarning = hasIssue !== null || status === 'needs_attention';

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPast = index <= currentStep;

        // Determine bead color
        let beadColor = 'bg-gray-200'; // future step
        if (isRejected && index === 0) {
          beadColor = 'bg-red-500';
        } else if (isCompleted) {
          beadColor = 'bg-green-500';
        } else if (isCurrent) {
          if (hasWarning) {
            beadColor = 'bg-amber-500';
          } else if (status === 'paid_complete') {
            beadColor = 'bg-green-500';
          } else {
            beadColor = 'bg-indigo-500';
          }
        }

        return (
          <div key={step} className="flex items-center">
            {/* Bead */}
            <div
              className={`w-2.5 h-2.5 rounded-full ${beadColor} ${
                isCurrent ? 'ring-2 ring-offset-1 ring-current' : ''
              }`}
              title={step}
            />
            {/* Connector line (except after last) */}
            {index < steps.length - 1 && (
              <div
                className={`w-3 h-0.5 ${
                  isPast && index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
      {/* Warning indicator */}
      {hasWarning && (
        <span title={hasIssue || 'Needs attention'}>
          <AlertTriangle className="h-4 w-4 text-amber-500 ml-1" />
        </span>
      )}
    </div>
  );
}
