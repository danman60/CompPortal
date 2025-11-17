'use client';

/**
 * RoutinePool Component
 *
 * Display pool of unscheduled routines with:
 * - Table view (default) or Cards view
 * - Toggle button to switch views
 * - Loading skeleton states
 * - Error handling
 * - Empty state (all routines scheduled)
 * - Bulk selection
 *
 * Created: Session 56 (Frontend Component Extraction - Part 2)
 * Updated: Added table view + toggle (Session 64)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import { useState } from 'react';
import { RoutineCard, Routine, ViewMode } from './RoutineCard';
import { useDraggable } from '@dnd-kit/core';

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

// Helper: Get classification color
function getClassificationColor(classification: string): string {
  const lower = classification.toLowerCase();
  if (lower.includes('emerald')) return 'bg-emerald-600 text-white';
  if (lower.includes('sapphire')) return 'bg-blue-600 text-white';
  if (lower.includes('crystal')) return 'bg-cyan-600 text-white';
  if (lower.includes('titanium')) return 'bg-slate-600 text-white';
  if (lower.includes('production')) return 'bg-purple-600 text-white';
  return 'bg-gray-500 text-white';
}

// Draggable Table Row
function DraggableRoutineRow({ routine, viewMode, hasConflict, conflictSeverity, hasNotes, hasAgeChange, isLastRoutine, isSelected, onToggleSelection }: {
  routine: Routine;
  viewMode: ViewMode;
  hasConflict: boolean;
  conflictSeverity: 'critical' | 'error' | 'warning';
  hasNotes: boolean;
  hasAgeChange: boolean;
  isLastRoutine: boolean;
  isSelected: boolean;
  onToggleSelection?: (routineId: string, shiftKey: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: routine.id,
  });

  const style = isDragging ? { opacity: 0.5 } : {};

  // Determine studio display
  const studioDisplay = viewMode === 'judge' || viewMode === 'public'
    ? routine.studioCode
    : routine.studioName;

  // Row classes
  const rowClasses = [
    'border-b border-white/10 hover:bg-white/5 transition-colors cursor-grab',
    isLastRoutine ? 'bg-yellow-500/10 border-l-4 border-l-yellow-400' : '',
    hasAgeChange ? 'bg-yellow-900/30' : '',
    hasConflict ? 'border-l-4 border-l-red-500' : '',
    isDragging ? 'opacity-50' : '',
  ].filter(Boolean).join(' ');

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={rowClasses}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        {onToggleSelection && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(routine.id, (e.nativeEvent as MouseEvent).shiftKey);
            }}
            className="w-4 h-4 rounded border-2 border-white/40 bg-white/10 checked:bg-purple-600 checked:border-purple-600 cursor-pointer hover:border-white/60 transition-colors"
            title={isSelected ? "Deselect routine" : "Select routine"}
          />
        )}
      </td>

      {/* Title with indicators */}
      <td className="px-4 py-3 text-sm font-medium text-white">
        <div className="flex items-center gap-2">
          {routine.title}
          {isLastRoutine && <span className="text-yellow-400" title="Last in category">🏆</span>}
          {hasConflict && <span className="text-red-400" title="Has conflict">⚠️</span>}
          {hasNotes && <span className="text-blue-400" title="Has notes">📝</span>}
          {hasAgeChange && <span className="text-yellow-400" title="Age changed">🎂</span>}
        </div>
      </td>

      {/* Studio */}
      <td className="px-4 py-3 text-sm text-white/80">{studioDisplay}</td>

      {/* Classification */}
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${getClassificationColor(routine.classificationName)}`}>
          {routine.classificationName}
        </span>
      </td>

      {/* Category */}
      <td className="px-4 py-3 text-sm text-white/80">{routine.categoryName}</td>

      {/* Age Group */}
      <td className="px-4 py-3 text-sm text-white/80">{routine.ageGroupName}</td>

      {/* Group Size */}
      <td className="px-4 py-3 text-sm text-white/80">{routine.entrySizeName}</td>

      {/* Duration */}
      <td className="px-4 py-3 text-sm text-white/80 whitespace-nowrap">⏱️ {routine.duration} min</td>
    </tr>
  );
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

  // Display mode: 'table' (default) or 'cards'
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');

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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white bg-purple-600 px-3 py-1 rounded-full">
              {routines.length}
            </span>
            {/* View Toggle */}
            <div className="flex items-center bg-white/10 border border-white/20 rounded-lg overflow-hidden">
              <button
                onClick={() => setDisplayMode('table')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  displayMode === 'table'
                    ? 'bg-purple-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
                title="Table view"
              >
                ⊞ Table
              </button>
              <button
                onClick={() => setDisplayMode('cards')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  displayMode === 'cards'
                    ? 'bg-purple-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
                title="Cards view"
              >
                ⊟ Cards
              </button>
            </div>
          </div>
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

      {/* TABLE VIEW */}
      {displayMode === 'table' && routines.length > 0 && !isLoading && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="bg-white/10 border-b border-white/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '40px' }}>
                    ✓
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Routine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Studio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Classification
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {routines.map((routine) => (
                  <DraggableRoutineRow
                    key={routine.id}
                    routine={routine}
                    viewMode={viewMode}
                    hasConflict={hasConflict(routine.id)}
                    conflictSeverity={getConflictSeverity(routine.id)}
                    hasNotes={routineNotes[routine.id] || false}
                    hasAgeChange={ageChanges.includes(routine.id)}
                    isLastRoutine={isLastRoutine(routine.id)}
                    isSelected={selectedRoutineIds.has(routine.id)}
                    onToggleSelection={onToggleSelection}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARDS VIEW */}
      {displayMode === 'cards' && routines.length > 0 && !isLoading && (
        <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
