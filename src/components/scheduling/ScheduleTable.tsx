'use client';

/**
 * Schedule V4 Redesign - ScheduleTable Component
 *
 * Single chronological table displaying all scheduled routines for a specific day.
 * Features:
 * - Chronological ordering by entry_number
 * - Auto-calculated time display (not editable)
 * - Trophy Helper inline (gold border + 🏆 for last routine per Overalls)
 * - Conflict detection (red box spanning multiple rows)
 * - Drag-and-drop support via DnD Kit
 * - ViewMode filtering (CD/Studio/Judge/Public)
 */

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ViewMode } from '@/components/ScheduleToolbar';

interface ScheduleTableProps {
  routines: Routine[];
  selectedDate: string; // ISO date
  viewMode: ViewMode;
  conflicts: Conflict[];
  onRoutineClick?: (routineId: string) => void;
}

interface Routine {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  studioCode: string;
  classificationId: string;
  classificationName: string;
  categoryId: string;
  categoryName: string;
  ageGroupId: string;
  ageGroupName: string;
  entrySizeId: string;
  entrySizeName: string;
  duration: number;
  participants: Array<{
    dancerId: string;
    dancerName: string;
  }>;
  entryNumber?: number;
  scheduledTime?: Date | null;
  scheduledDay?: Date | null;
}

interface Conflict {
  id: string;
  dancerId: string;
  dancerName: string;
  routine1Id: string;
  routine2Id: string;
  routinesBetween: number;
  severity: 'critical' | 'error' | 'warning';
  message: string;
}

interface OverallsCategory {
  groupSize: string;
  ageGroup: string;
  classification: string;
}

// Sortable Row Component
function SortableRoutineRow({
  routine,
  index,
  isLastInOveralls,
  conflict,
  isFirstInConflict,
  conflictSpan,
  performanceTime,
  classificationColor,
  studioDisplay,
  viewMode,
  onRoutineClick,
}: {
  routine: Routine;
  index: number;
  isLastInOveralls: boolean;
  conflict: any;
  isFirstInConflict: boolean;
  conflictSpan: number;
  performanceTime: string;
  classificationColor: string;
  studioDisplay: string;
  viewMode: ViewMode;
  onRoutineClick?: (routineId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: routine.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        border-b border-white/10 hover:bg-white/5 transition-colors cursor-move relative
        ${isLastInOveralls ? 'bg-yellow-500/10' : ''}
      `}
      onClick={() => onRoutineClick?.(routine.id)}
    >
      {/* Gold border for trophy helper */}
      {isLastInOveralls && (
        <td className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-yellow-600" />
      )}

      {/* Entry Number */}
      <td className="px-4 py-3 text-sm font-mono font-bold text-white whitespace-nowrap">
        #{routine.entryNumber || '?'}
      </td>

      {/* Time */}
      <td className="px-4 py-3 text-sm font-mono text-white/90 whitespace-nowrap">
        {performanceTime}
      </td>

      {/* Routine Title */}
      <td className="px-4 py-3 text-sm font-medium text-white relative">
        <div className="flex items-center gap-2">
          {routine.title}
          {isLastInOveralls && (
            <span
              className="text-yellow-400 text-lg"
              title={`Last routine for ${routine.entrySizeName} • ${routine.ageGroupName} • ${routine.classificationName}`}
            >
              🏆
            </span>
          )}
        </div>
        {isLastInOveralls && (
          <div className="absolute top-1 right-2 bg-yellow-500/90 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg whitespace-nowrap">
            Last: {routine.entrySizeName} • {routine.ageGroupName} • {routine.classificationName}
          </div>
        )}
      </td>

      {/* Studio */}
      <td className="px-4 py-3 text-sm text-white/80">
        {studioDisplay}
      </td>

      {/* Classification */}
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${classificationColor}`}
        >
          {routine.classificationName}
        </span>
      </td>

      {/* Dancers */}
      <td className="px-4 py-3 text-sm text-white/70">
        {routine.participants.length > 0 ? (
          <div className="truncate" title={routine.participants.map(p => p.dancerName).join(', ')}>
            {routine.participants.slice(0, 2).map(p => p.dancerName).join(', ')}
            {routine.participants.length > 2 && ` +${routine.participants.length - 2}`}
          </div>
        ) : (
          <span className="text-white/40">No dancers</span>
        )}
      </td>

      {/* Category */}
      <td className="px-4 py-3 text-sm text-white/80">
        {routine.categoryName}
      </td>

      {/* Conflict indicator */}
      {conflict && isFirstInConflict && (
        <td
          className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"
          style={{
            height: `calc(${conflictSpan} * 100%)`,
          }}
        >
          <div className="absolute left-2 top-2 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-lg whitespace-nowrap z-10">
            ⚠️ {conflict.conflict.dancerName}: {conflict.conflict.routinesBetween} routines between (need 6 min)
          </div>
        </td>
      )}
    </tr>
  );
}

export function ScheduleTable({
  routines,
  selectedDate,
  viewMode,
  conflicts,
  onRoutineClick,
}: ScheduleTableProps) {
  // Sort routines by entry_number
  const sortedRoutines = useMemo(() => {
    return [...routines].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
  }, [routines]);

  // Calculate last routines per Overalls category
  const lastRoutineIds = useMemo(() => {
    const categories = new Map<string, Routine>();

    sortedRoutines.forEach(routine => {
      const key = `${routine.entrySizeName}|${routine.ageGroupName}|${routine.classificationName}`;

      // Track last routine per category (highest entry number)
      if (!categories.has(key) ||
          (routine.entryNumber || 0) > (categories.get(key)!.entryNumber || 0)) {
        categories.set(key, routine);
      }
    });

    const lastIds = new Set<string>();
    categories.forEach(routine => {
      lastIds.add(routine.id);
    });

    return lastIds;
  }, [sortedRoutines]);

  // Detect conflict groups (consecutive routines with same dancer)
  const conflictGroups = useMemo(() => {
    const groups: Array<{ routineIds: string[]; conflict: Conflict }> = [];

    conflicts.forEach(conflict => {
      // Find positions of both routines
      const idx1 = sortedRoutines.findIndex(r => r.id === conflict.routine1Id);
      const idx2 = sortedRoutines.findIndex(r => r.id === conflict.routine2Id);

      if (idx1 === -1 || idx2 === -1) return;

      const startIdx = Math.min(idx1, idx2);
      const endIdx = Math.max(idx1, idx2);

      // Collect all routine IDs in between
      const routineIds = sortedRoutines
        .slice(startIdx, endIdx + 1)
        .map(r => r.id);

      groups.push({ routineIds, conflict });
    });

    return groups;
  }, [sortedRoutines, conflicts]);

  // Check if routine is part of a conflict
  const getRoutineConflict = (routineId: string) => {
    return conflictGroups.find(group => group.routineIds.includes(routineId));
  };

  // Check if routine is first in conflict group
  const isFirstInConflictGroup = (routineId: string) => {
    const group = getRoutineConflict(routineId);
    return group && group.routineIds[0] === routineId;
  };

  // Get conflict span height
  const getConflictSpan = (routineId: string) => {
    const group = getRoutineConflict(routineId);
    return group ? group.routineIds.length : 1;
  };

  // Droppable zone for scheduling routines
  const { setNodeRef, isOver } = useDroppable({
    id: `schedule-table-${selectedDate}`,
    data: { date: selectedDate },
  });

  if (sortedRoutines.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`min-h-[400px] border-2 border-dashed rounded-xl flex items-center justify-center ${
          isOver
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-white/20 bg-white/5'
        }`}
      >
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-white/60 text-lg">No routines scheduled for this day</p>
          <p className="text-white/40 text-sm mt-2">Drag routines here to schedule</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden ${
        isOver ? 'ring-2 ring-purple-400' : ''
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/10 border-b border-white/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '60px' }}>
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '80px' }}>
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '200px' }}>
                Routine
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '120px' }}>
                Studio
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '120px' }}>
                Classification
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '150px' }}>
                Dancers
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                Category
              </th>
            </tr>
          </thead>
          <SortableContext
            items={sortedRoutines.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {sortedRoutines.map((routine, index) => {
                const isLastInOveralls = lastRoutineIds.has(routine.id);
                const conflict = getRoutineConflict(routine.id);
                const isFirstInConflict = isFirstInConflictGroup(routine.id);
                const conflictSpan = getConflictSpan(routine.id);

                // Format time
                const performanceTime = routine.scheduledTime
                  ? new Date(routine.scheduledTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'TBD';

                // Classification color
                const classificationColor = getClassificationColor(routine.classificationName);

                // Studio display based on view mode
                const studioDisplay = viewMode === 'judge'
                  ? `Studio ${routine.studioCode}`
                  : routine.studioName;

                return (
                  <SortableRoutineRow
                    key={routine.id}
                    routine={routine}
                    index={index}
                    isLastInOveralls={isLastInOveralls}
                    conflict={conflict}
                    isFirstInConflict={!!isFirstInConflict}
                    conflictSpan={conflictSpan}
                    performanceTime={performanceTime}
                    classificationColor={classificationColor}
                    studioDisplay={studioDisplay}
                    viewMode={viewMode}
                    onRoutineClick={onRoutineClick}
                  />
                );
              })}
            </tbody>
          </SortableContext>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="bg-white/5 border-t border-white/20 px-4 py-3 flex items-center justify-between text-sm">
        <div className="text-white/60">
          Total: <span className="font-semibold text-white">{sortedRoutines.length}</span> routines
        </div>
        <div className="flex items-center gap-4">
          {conflicts.length > 0 && (
            <div className="text-red-400">
              ⚠️ <span className="font-semibold">{conflicts.length}</span> conflict{conflicts.length !== 1 ? 's' : ''}
            </div>
          )}
          {lastRoutineIds.size > 0 && (
            <div className="text-yellow-400">
              🏆 <span className="font-semibold">{lastRoutineIds.size}</span> award{lastRoutineIds.size !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: Get classification color
function getClassificationColor(classification: string): string {
  const lower = classification.toLowerCase();

  if (lower.includes('emerald')) return 'bg-emerald-600 text-white';
  if (lower.includes('sapphire')) return 'bg-blue-600 text-white';
  if (lower.includes('ruby')) return 'bg-red-600 text-white';
  if (lower.includes('diamond')) return 'bg-purple-600 text-white';
  if (lower.includes('platinum')) return 'bg-gray-600 text-white';

  return 'bg-gray-500 text-white';
}
