'use client';

/**
 * Age Change Warning Component
 *
 * Displays warning when dancer age has changed affecting age group:
 * - Yellow warning icon on affected routines
 * - Tooltip showing old vs new age group
 * - Resolve button to acknowledge change
 * - Persists until resolved
 */

import { useState } from 'react';

interface AgeChange {
  dancerId: string;
  dancerName: string;
  oldAge: number;
  newAge: number;
  oldAgeGroup?: string;
  newAgeGroup?: string;
  detectedAt: Date;
}

interface AgeChangeWarningProps {
  routineId: string;
  routineTitle: string;
  ageChanges: AgeChange[];
  onResolve?: (routineId: string) => void;
  compact?: boolean;
}

export function AgeChangeWarning({
  routineId,
  routineTitle,
  ageChanges,
  onResolve,
  compact = false,
}: AgeChangeWarningProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await onResolve?.(routineId);
    } finally {
      setIsResolving(false);
    }
  };

  if (ageChanges.length === 0) return null;

  // Compact version - just the icon
  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-6 h-6 bg-yellow-500/20 border border-yellow-500/50 rounded-full flex items-center justify-center hover:bg-yellow-500/30 transition-colors"
          aria-label="Age change detected"
        >
          <span className="text-sm">⚠️</span>
        </button>

        {showTooltip && (
          <div className="absolute z-50 left-0 top-full mt-2 w-64 bg-gray-900 border border-yellow-500/50 rounded-lg shadow-2xl p-3">
            <div className="text-xs font-medium text-yellow-300 mb-2">
              Age Change Detected
            </div>
            {ageChanges.map((change, idx) => (
              <div key={idx} className="text-xs text-white mb-1">
                {change.dancerName}: {change.oldAge} → {change.newAge} years
                {change.oldAgeGroup && change.newAgeGroup && (
                  <div className="text-yellow-300 mt-0.5">
                    {change.oldAgeGroup} → {change.newAgeGroup}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version - card with details
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">⚠️</span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-yellow-300 mb-1">
            Age Change Detected
          </h4>
          <p className="text-sm text-gray-300 mb-3">
            One or more dancers in this routine have had their age updated, which may affect age group eligibility.
          </p>

          {/* Dancer Changes */}
          <div className="space-y-2 mb-4">
            {ageChanges.map((change, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-white">{change.dancerName}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(change.detectedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  Age: <span className="line-through text-gray-500">{change.oldAge}</span>
                  {' → '}
                  <span className="text-yellow-300 font-medium">{change.newAge}</span>
                </div>
                {change.oldAgeGroup && change.newAgeGroup && change.oldAgeGroup !== change.newAgeGroup && (
                  <div className="text-sm text-yellow-300 mt-1">
                    Age Group: <span className="line-through text-gray-500">{change.oldAgeGroup}</span>
                    {' → '}
                    <span className="font-medium">{change.newAgeGroup}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onResolve && (
              <button
                onClick={handleResolve}
                disabled={isResolving}
                className="px-4 py-2 bg-yellow-600/30 hover:bg-yellow-600/40 text-yellow-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isResolving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <span>✓ Acknowledge & Resolve</span>
                  </>
                )}
              </button>
            )}
            <div className="text-xs text-gray-400">
              Review and confirm this change is correct
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Age Change Badge - Compact indicator for routine cards
 */
interface AgeChangeBadgeProps {
  count: number;
  onClick?: () => void;
}

export function AgeChangeBadge({ count, onClick }: AgeChangeBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 rounded-full text-xs font-medium hover:bg-yellow-500/30 transition-colors"
      title={`${count} age change${count !== 1 ? 's' : ''} detected`}
    >
      <span>⚠️</span>
      <span>{count}</span>
    </button>
  );
}
