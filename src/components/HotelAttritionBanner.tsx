'use client';

/**
 * Hotel Attrition Warning Banner
 *
 * Displays warning when all Emerald routines are scheduled on a single day:
 * - Banner at top of schedule page
 * - Explanation of hotel attrition risk
 * - Dismissable (stores in local storage)
 * - Shows day distribution stats
 */

import { useState, useEffect } from 'react';

interface HotelAttritionBannerProps {
  hasWarning: boolean;
  message: string | null;
  dayDistribution: [string, number][];
  totalEmeraldRoutines: number;
  onDismiss?: () => void;
}

const STORAGE_KEY = 'hotelAttritionWarningDismissed';

export function HotelAttritionBanner({
  hasWarning,
  message,
  dayDistribution,
  totalEmeraldRoutines,
  onDismiss,
}: HotelAttritionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Load dismissed state from local storage
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't show if no warning, or if dismissed
  if (!hasWarning || isDismissed) return null;

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border-2 border-orange-500/50 rounded-xl p-4 mb-6 shadow-lg">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🏨</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-lg font-bold text-orange-300">
              ⚠️ Hotel Attrition Risk Detected
            </h3>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-orange-200 mb-4">
            {message}
          </p>

          {/* Explanation */}
          <div className="bg-white/5 rounded-lg p-3 mb-4">
            <div className="text-xs font-medium text-orange-300 mb-2">
              Why this matters:
            </div>
            <p className="text-xs text-gray-300">
              When all Emerald (highest level) routines compete on the same day, studios may only attend that
              single day instead of the full weekend. This can lead to hotel room cancellations and reduced
              weekend attendance. Consider spreading Emerald routines across multiple days to encourage full
              weekend participation.
            </p>
          </div>

          {/* Day Distribution */}
          <div className="mb-4">
            <div className="text-xs font-medium text-orange-300 mb-2">
              Current distribution:
            </div>
            <div className="space-y-2">
              {dayDistribution.map(([day, count]) => (
                <div key={day} className="flex items-center gap-3">
                  <div className="text-xs text-gray-300 w-32">{formatDate(day)}</div>
                  <div className="flex-1 bg-white/10 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(count / totalEmeraldRoutines) * 100}%` }}
                    >
                      {count > 0 && `${count} routine${count !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-white w-12 text-right">
                    {Math.round((count / totalEmeraldRoutines) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="flex items-start gap-2 bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
            <span className="text-lg">💡</span>
            <div className="flex-1 text-xs text-orange-200">
              <strong>Recommendation:</strong> Consider redistributing Emerald routines across{' '}
              {dayDistribution.length > 1 ? 'all competition days' : 'multiple days'} to maximize weekend
              attendance and reduce hotel attrition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact warning badge for toolbar
 */
interface HotelAttritionBadgeProps {
  hasWarning: boolean;
  onClick: () => void;
}

export function HotelAttritionBadge({ hasWarning, onClick }: HotelAttritionBadgeProps) {
  if (!hasWarning) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded-full text-xs font-medium hover:bg-orange-500/30 transition-all"
    >
      <span>🏨</span>
      <span>Hotel Risk</span>
    </button>
  );
}
