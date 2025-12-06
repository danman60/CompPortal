'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * ScheduleStatusToggle Component
 *
 * P2-15: Simplified schedule versioning (Tentative vs Final toggle)
 * Simple toggle switch to mark schedule as Tentative or Final
 */

interface ScheduleStatusToggleProps {
  status: 'tentative' | 'final';
  onToggle: (newStatus: 'tentative' | 'final') => void;
  disabled?: boolean;
}

export function ScheduleStatusToggle({
  status,
  onToggle,
  disabled = false,
}: ScheduleStatusToggleProps) {
  const isFinal = status === 'final';

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isFinal ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-white">
              Schedule Status
            </h3>
            <p className="text-xs text-white/70">
              {isFinal
                ? 'Locked and visible to studios'
                : 'Draft mode - studios see live updates'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onToggle(isFinal ? 'tentative' : 'final')}
          disabled={disabled}
          className={`
            relative inline-flex h-8 w-48 items-center rounded-full transition-all
            ${isFinal
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-yellow-600 hover:bg-yellow-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              absolute inline-flex items-center justify-center h-7 w-24 rounded-full bg-white shadow-md transform transition-transform font-semibold text-xs
              ${isFinal ? 'translate-x-[88px] text-green-700' : 'translate-x-0.5 text-yellow-700'}
            `}
          >
            {isFinal ? '✓ FINAL' : '⚠ TENTATIVE'}
          </span>
          <span className="ml-2 text-xs font-medium text-white/90 select-none">
            {isFinal ? '' : 'Tentative'}
          </span>
          <span className="ml-auto mr-2 text-xs font-medium text-white/90 select-none">
            {isFinal ? 'Final' : ''}
          </span>
        </button>
      </div>
    </div>
  );
}
