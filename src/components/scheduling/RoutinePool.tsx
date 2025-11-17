'use client';

/**
 * RoutinePool Component
 *
 * Display pool of unscheduled routines with:
 * - Loading skeleton states
 * - Error handling
 * - Empty state (all routines scheduled)
 * - Scrollable list of routine cards
 * - Routine count badge
 *
 * Created: Session 56 (Frontend Component Extraction - Part 2)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import { RoutineCard, Routine, ViewMode } from './RoutineCard';

interface RoutinePoolProps {
  routines: Routine[];
  isLoading?: boolean;
  error?: { message: string } | null;
  viewMode: ViewMode;
  isDraggingAnything?: boolean;
  onRequestClick?: (routineId: string) => void;
  onNoteClick?: (routineId: string, routineTitle: string) => void;
  // Visual indicators (Session 58)
  conflicts?: Array<{ routine1Id: string; routine2Id: string; severity: 'critical' | 'error' | 'warning' }>;
  trophyHelper?: Array<{ routineId: string }>;
  ageChanges?: string[];
  routineNotes?: Record<string, boolean>;
  // Bulk selection (Session 63)
  selectedRoutineIds?: Set<string>;
  onToggleSelection?: (routineId: string, shiftKey: boolean) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export function RoutinePool({
  routines,
  isLoading = false,
  error = null,
  viewMode,
  isDraggingAnything = false,
  onRequestClick,
  onNoteClick,
  conflicts = [],
  trophyHelper = [],
  ageChanges = [],
  routineNotes = {},
  selectedRoutineIds = new Set(),
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
}: RoutinePoolProps) {
  const isEmpty = routines.length === 0 && !isLoading;

  // Helper: Check if routine has conflict
  const hasConflict = (routineId: string) => {
    return conflicts.some((c) => c.routine1Id === routineId || c.routine2Id === routineId);
  };

  // Helper: Get conflict severity
  const getConflictSeverity = (routineId: string): 'critical' | 'error' | 'warning' => {
    const routineConflicts = conflicts.filter((c) => c.routine1Id === routineId || c.routine2Id === routineId);
    if (routineConflicts.length === 0) return 'warning';
    return routineConflicts.reduce((max, c) => {
      const severityOrder = { critical: 3, error: 2, warning: 1 };
      return severityOrder[c.severity] > severityOrder[max] ? c.severity : max;
    }, 'warning' as 'critical' | 'error' | 'warning');
  };

  // Helper: Check if routine is last (trophy helper)
  const isLastRoutine = (routineId: string) => {
    return trophyHelper.some((t) => t.routineId === routineId);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">
            Unscheduled Routines
          </h2>
          <span className="text-sm font-medium text-white bg-purple-600 px-3 py-1 rounded-full">
            {routines.length}
          </span>
        </div>

        {/* Bulk Selection Controls */}
        {routines.length > 0 && onSelectAll && onDeselectAll && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex-1 flex items-center gap-2 text-sm text-white/80">
              <span className="font-medium">{selectedRoutineIds.size} selected</span>
              {selectedRoutineIds.size > 0 && (
                <span className="text-white/50">of {routines.length}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                title="Select all filtered routines"
              >
                ✓ Select All
              </button>
              {selectedRoutineIds.size > 0 && (
                <button
                  onClick={onDeselectAll}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded transition-colors"
                  title="Clear selection"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading State - Skeleton Loaders */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse">
              <div className="flex items-start justify-between mb-2">
                <div className="h-5 bg-white/20 rounded w-3/4"></div>
                <div className="h-6 w-8 bg-white/20 rounded"></div>
              </div>
              <div className="h-8 bg-white/15 rounded-lg w-2/3 mb-2"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p className="text-red-200 font-medium">Error loading routines</p>
          <p className="text-red-300 text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Routines List */}
      {routines.length > 0 && !isLoading && (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              viewMode={viewMode}
              isDraggingAnything={isDraggingAnything}
              onRequestClick={onRequestClick}
              onNoteClick={onNoteClick}
              hasConflict={hasConflict(routine.id)}
              conflictSeverity={getConflictSeverity(routine.id)}
              hasNotes={routineNotes[routine.id] || false}
              hasAgeChange={ageChanges.includes(routine.id)}
              isLastRoutine={isLastRoutine(routine.id)}
              isSelected={selectedRoutineIds.has(routine.id)}
              onToggleSelection={onToggleSelection}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-purple-200 font-medium">All routines scheduled!</p>
        </div>
      )}
    </div>
  );
}
