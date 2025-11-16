'use client';

/**
 * Day Selector Component
 *
 * Tab-based day selector for multi-day competitions:
 * - Fetches competition dates from database
 * - Renders tabs with formatted dates (e.g., "Thursday, June 4")
 * - Filters schedule by selected day
 * - Active tab highlighting with gradient
 * - Conflicts scoped to current day only
 * - Responsive design (scrollable on mobile)
 */

import { useState, useEffect } from 'react';

interface DaySelectorProps {
  competitionDates: Date[];
  selectedDay: Date | null;
  onDayChange: (day: Date) => void;
  routineCountByDay?: Map<string, number>;
  className?: string;
}

export function DaySelector({
  competitionDates,
  selectedDay,
  onDayChange,
  routineCountByDay,
  className = '',
}: DaySelectorProps) {
  // Auto-select first day if none selected
  useEffect(() => {
    if (!selectedDay && competitionDates.length > 0) {
      onDayChange(competitionDates[0]);
    }
  }, [competitionDates, selectedDay, onDayChange]);

  // Format date as "Thursday, June 4"
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date as "Jun 4"
  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get routine count for a day
  const getRoutineCount = (date: Date) => {
    if (!routineCountByDay) return 0;
    const dateStr = new Date(date).toISOString().split('T')[0];
    return routineCountByDay.get(dateStr) || 0;
  };

  // Check if day is selected
  const isSelected = (date: Date) => {
    if (!selectedDay) return false;
    return new Date(date).toDateString() === new Date(selectedDay).toDateString();
  };

  if (competitionDates.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-gray-400 text-sm">No competition dates configured</p>
      </div>
    );
  }

  // Single day - show as header instead of tabs
  if (competitionDates.length === 1) {
    return (
      <div className={`bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-xl">📅</span>
          </div>
          <div>
            <div className="text-sm text-purple-300">Competition Date</div>
            <div className="text-lg font-bold text-white">{formatDate(competitionDates[0])}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop: Full tabs */}
      <div className="hidden md:flex gap-2">
        {competitionDates.map((date, index) => {
          const selected = isSelected(date);
          const count = getRoutineCount(date);

          return (
            <button
              key={index}
              onClick={() => onDayChange(date)}
              className={`
                flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium
                ${selected
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 shadow-lg text-white'
                  : 'bg-white/5 border-white/20 hover:border-purple-500/50 text-purple-300 hover:text-white'
                }
              `}
            >
              <div className="flex flex-col items-center gap-1">
                <div className={`text-sm ${selected ? 'text-white' : 'text-purple-300'}`}>
                  {formatDate(date)}
                </div>
                {count > 0 && (
                  <div className={`text-xs px-2 py-0.5 rounded-full ${
                    selected
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {count} routine{count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: Compact scrollable tabs */}
      <div className="md:hidden overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-min">
          {competitionDates.map((date, index) => {
            const selected = isSelected(date);
            const count = getRoutineCount(date);

            return (
              <button
                key={index}
                onClick={() => onDayChange(date)}
                className={`
                  flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all font-medium min-w-[140px]
                  ${selected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 shadow-lg text-white'
                    : 'bg-white/5 border-white/20 hover:border-purple-500/50 text-purple-300'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className={`text-sm ${selected ? 'text-white' : 'text-purple-300'}`}>
                    {formatDateShort(date)}
                  </div>
                  {count > 0 && (
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      selected
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {count}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Helper text */}
      {selectedDay && (
        <div className="mt-3 text-xs text-purple-300 text-center">
          <span className="opacity-75">Showing routines for </span>
          <span className="font-medium text-white">{formatDate(selectedDay)}</span>
          <span className="opacity-75"> • Conflicts are scoped to this day only</span>
        </div>
      )}
    </div>
  );
}

/**
 * Day Selector with Automatic Date Detection
 *
 * Fetches competition dates from the competition and manages state internally
 */
interface AutoDaySelectorProps {
  competition: {
    id: string;
    start_date: Date | null;
    end_date: Date | null;
  } | null;
  onDayChange: (day: Date) => void;
  routineCountByDay?: Map<string, number>;
  className?: string;
}

export function AutoDaySelector({
  competition,
  onDayChange,
  routineCountByDay,
  className = '',
}: AutoDaySelectorProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Generate date range from competition dates
  const competitionDates = (() => {
    if (!competition?.start_date || !competition?.end_date) return [];

    const dates: Date[] = [];
    const start = new Date(competition.start_date);
    const end = new Date(competition.end_date);

    // Generate all dates between start and end (inclusive)
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  })();

  const handleDayChange = (day: Date) => {
    setSelectedDay(day);
    onDayChange(day);
  };

  return (
    <DaySelector
      competitionDates={competitionDates}
      selectedDay={selectedDay}
      onDayChange={handleDayChange}
      routineCountByDay={routineCountByDay}
      className={className}
    />
  );
}

/**
 * Utility function to group routines by day
 */
export function groupRoutinesByDay<T extends { performanceDate: Date | null }>(
  routines: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const routine of routines) {
    if (!routine.performanceDate) continue;

    const dateStr = new Date(routine.performanceDate).toISOString().split('T')[0];
    const existing = grouped.get(dateStr) || [];
    grouped.set(dateStr, [...existing, routine]);
  }

  return grouped;
}

/**
 * Utility function to count routines by day
 */
export function countRoutinesByDay<T extends { performanceDate: Date | null }>(
  routines: T[]
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const routine of routines) {
    if (!routine.performanceDate) continue;

    const dateStr = new Date(routine.performanceDate).toISOString().split('T')[0];
    counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
  }

  return counts;
}
