'use client';

/**
 * Conflict Override Modal
 *
 * Allows Competition Director to override scheduling conflicts with a reason
 * - Requires minimum 10-character explanation
 * - Stores override in database for audit trail
 * - Updates conflict display after override
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface Conflict {
  conflictId: string;
  dancerId: string;
  dancerName: string;
  routine1Id: string;
  routine1Title: string;
  routine1Time: Date;
  routine2Id: string;
  routine2Title: string;
  routine2Time: Date;
  routinesBetween: number;
  severity: 'critical' | 'error' | 'warning';
  message: string;
}

interface ConflictOverrideModalProps {
  conflict: Conflict;
  tenantId: string;
  userId: string;
  onClose: () => void;
  onOverrideComplete: () => void;
}

export function ConflictOverrideModal({
  conflict,
  tenantId,
  userId,
  onClose,
  onOverrideComplete,
}: ConflictOverrideModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const overrideConflict = trpc.scheduling.overrideConflict.useMutation({
    onSuccess: () => {
      onOverrideComplete();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate reason
    if (reason.length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    // Submit override
    overrideConflict.mutate({
      conflictId: conflict.conflictId,
      reason,
      userId,
      tenantId,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              ⚠️ Override Scheduling Conflict
            </h3>
            <p className="text-gray-400 text-sm">
              Document why this conflict can be safely ignored
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conflict Details */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-purple-300">
              <span className="font-medium">Dancer:</span>
              <span className="text-white font-bold">{conflict.dancerName}</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Routine 1:</span>
                <span className="text-white">{conflict.routine1Title}</span>
              </div>
              <div className="flex items-center gap-2 pl-4 text-gray-400">
                <span>↓</span>
                <span>
                  {conflict.routinesBetween} routine{conflict.routinesBetween !== 1 ? 's' : ''} between
                </span>
                <span className="text-red-400 font-bold">(need 6+ for safety)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Routine 2:</span>
                <span className="text-white">{conflict.routine2Title}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-sm text-gray-400">
              <span className="font-medium text-red-400">Issue: </span>
              {conflict.message}
            </div>
          </div>
        </div>

        {/* Override Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-purple-300 mb-2">
              Reason for Override *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder="Explain why this conflict can be safely ignored (e.g., 'Dancer confirmed they can handle quick change', 'Parent will assist with costume change', etc.)"
              className="w-full h-32 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
              required
              minLength={10}
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${reason.length >= 10 ? 'text-green-400' : 'text-gray-500'}`}>
                {reason.length}/10 characters minimum
              </span>
              {reason.length > 0 && reason.length < 10 && (
                <span className="text-xs text-yellow-400">
                  Need {10 - reason.length} more characters
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Warning */}
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="text-sm text-yellow-200">
                <p className="font-medium mb-1">Important:</p>
                <p>
                  Overriding this conflict means you accept responsibility for potential issues during the
                  competition (e.g., costume change delays, dancer fatigue, etc.). This override will be logged
                  in the audit trail.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={overrideConflict.isPending}
              className="px-6 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reason.length < 10 || overrideConflict.isPending}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {overrideConflict.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Overriding...</span>
                </>
              ) : (
                <>
                  <span>✓ Override Conflict</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
