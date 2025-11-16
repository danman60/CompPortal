'use client';

/**
 * Trophy Helper Panel
 *
 * Displays the last routine for each category to help CD plan award ceremonies:
 * - Shows last routine per category (Ballet, Jazz, Contemporary, etc.)
 * - Calculates suggested award time (+30 minutes after last routine)
 * - Highlights last routines in main schedule with gold border
 * - Collapsible panel with expand/collapse control
 * - Updates in real-time when schedule changes
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface TrophyHelperData {
  categoryName: string;
  lastRoutineId: string;
  lastRoutineTitle: string;
  lastRoutineTime: Date | null;
  suggestedAwardTime: Date | null;
  routineCount: number;
}

interface TrophyHelperPanelProps {
  competitionId: string;
  tenantId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLastRoutineClick?: (routineId: string) => void;
}

export function TrophyHelperPanel({
  competitionId,
  tenantId,
  isCollapsed = false,
  onToggleCollapse,
  onLastRoutineClick,
}: TrophyHelperPanelProps) {
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);

  // Fetch trophy helper data
  const { data: trophyData, isLoading, error } = trpc.scheduling.getTrophyHelper.useQuery({
    competitionId,
  });

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  const collapsed = onToggleCollapse !== undefined ? isCollapsed : localCollapsed;

  // Format time as HH:MM AM/PM
  const formatTime = (date: Date | null) => {
    if (!date) return 'Not scheduled';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date as Day, Month Date
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Trophy Helper</h3>
            <p className="text-xs text-purple-300">
              {trophyData?.length || 0} categories with scheduled routines
            </p>
          </div>
        </div>
        <button
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            className={`w-5 h-5 text-purple-300 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Collapsed indicator */}
      {collapsed && (
        <div className="px-4 pb-4 text-xs text-purple-300">
          Click to expand award ceremony planning guide
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <div className="p-4 pt-0">
          {/* Info Banner */}
          <div className="mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-purple-200">
              <span className="text-lg">💡</span>
              <p>
                Plan award ceremonies after the last routine in each category. Suggested times include
                30-minute buffer for dancer preparation.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
              <p className="text-purple-300 text-sm">Loading trophy helper data...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300 text-sm">
              ⚠️ Error loading trophy helper: {error.message}
            </div>
          )}

          {/* Data Display */}
          {trophyData && !isLoading && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {trophyData.length}
                  </div>
                  <div className="text-xs text-purple-300 mt-1">Categories</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {trophyData.reduce((sum, cat) => sum + (cat.totalRoutinesInCategory || 0), 0)}
                  </div>
                  <div className="text-xs text-purple-300 mt-1">Total Routines</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {trophyData.filter((c: any) => c.suggestedAwardTime).length}
                  </div>
                  <div className="text-xs text-purple-300 mt-1">Awards Scheduled</div>
                </div>
              </div>

              {/* Category List */}
              {trophyData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-gray-400">No categories with scheduled routines yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Schedule routines to see award ceremony recommendations
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {trophyData.map((category: any) => (
                    <div
                      key={category.categoryName}
                      className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-lg p-4 hover:border-amber-500/50 transition-all"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🏆</span>
                          <h4 className="font-bold text-white text-lg">
                            {category.categoryName}
                          </h4>
                          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                            {category.routineCount} routine{category.routineCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Last Routine Info */}
                      <div className="bg-white/5 rounded-lg p-3 mb-3">
                        <div className="text-xs text-purple-300 mb-1">Last Routine:</div>
                        <button
                          onClick={() => onLastRoutineClick?.(category.lastRoutineId)}
                          className="text-white font-medium hover:text-amber-300 transition-colors text-left"
                        >
                          {category.lastRoutineTitle}
                        </button>
                        <div className="text-xs text-purple-300 mt-1">
                          {category.lastRoutineDate && category.lastRoutineTime && (
                            <>
                              {formatDate(new Date(category.lastRoutineDate))} at{' '}
                              <span className="font-medium text-white">
                                {formatTime(new Date(category.lastRoutineTime))}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Suggested Award Time */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/40 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⏰</span>
                          <div>
                            <div className="text-xs text-amber-300">Suggested Award Time:</div>
                            <div className="text-white font-bold">
                              {category.suggestedAwardTime ? formatTime(new Date(category.suggestedAwardTime)) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-amber-300/70">
                          +30 min buffer
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Note */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-purple-300 text-center">
                  💡 Last routines are highlighted with gold borders in the main schedule
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to get last routine IDs for gold border highlighting
 */
export function useLastRoutineIds(competitionId: string, tenantId: string) {
  const { data: trophyData } = trpc.scheduling.getTrophyHelper.useQuery({
    competitionId,
  });

  const lastRoutineIds = new Set(
    trophyData?.map((cat: any) => cat.lastRoutineId) || []
  );

  return lastRoutineIds;
}
