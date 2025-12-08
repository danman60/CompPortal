'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * StatusBadge Component
 *
 * Compact clickable badge for schedule status (Tentative vs Final)
 * Replaces the full-width ScheduleStatusToggle with a header-friendly badge
 */

interface StatusBadgeProps {
  status: 'tentative' | 'final';
  onToggle: (newStatus: 'tentative' | 'final') => void;
  disabled?: boolean;
}

export function StatusBadge({
  status,
  onToggle,
  disabled = false,
}: StatusBadgeProps) {
  const isFinal = status === 'final';

  return (
    <button
      onClick={() => onToggle(isFinal ? 'tentative' : 'final')}
      disabled={disabled}
      className={`
        px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5
        transition-all border
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isFinal
          ? 'bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30'
          : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30'
        }
      `}
      title={isFinal
        ? 'FINAL - Locked and visible to studios. Click to change to Tentative.'
        : 'TENTATIVE - Draft mode, studios see live updates. Click to mark as Final.'
      }
    >
      {isFinal ? (
        <>
          <CheckCircle className="h-4 w-4" />
          FINAL
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4" />
          TENTATIVE
        </>
      )}
    </button>
  );
}
