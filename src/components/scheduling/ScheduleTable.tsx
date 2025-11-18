'use client';

/**
 * Schedule V4 Redesign - ScheduleTable Component
 *
 * Single chronological table displaying all scheduled routines for a specific day.
 * 7-column layout: # | Time | Routine | Studio | Classification | Category | Dancers
 *
 * Features:
 * - Chronological ordering by entry_number
 * - Auto-calculated time display (not editable)
 * - Trophy Helper inline (gold border + 🏆 for last routine per Overalls)
 * - Conflict detection (red box spanning multiple rows)
 * - Drag-and-drop support via DnD Kit
 * - ViewMode filtering (CD/Studio/Judge/Public)
 * - Dancer names display (first 2 names + "+X more" if needed)
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
  allRoutines?: Array<{
    id: string;
    entrySizeName: string;
    ageGroupName: string;
    classificationName: string;
    isScheduled: boolean;
  }>;
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
  routineAge?: number | null;
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
  sessionNumber,
  isLastInSession,
  sessionBlock,
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
  sessionNumber: number;
  isLastInSession: boolean;
  sessionBlock: any;
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

  // Session background colors (alternating faded colors)
  const sessionBg = sessionNumber % 2 === 0 ? 'bg-purple-500/5' : 'bg-blue-500/5';

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          border-b border-white/10 hover:bg-white/5 transition-colors cursor-move relative
          ${isLastInOveralls ? 'bg-yellow-500/10' : sessionBg}
        `}
        onClick={() => onRoutineClick?.(routine.id)}
      >
      {/* Gold border for trophy helper */}
      {isLastInOveralls && (
        <td className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-yellow-600" />
      )}

      {/* Entry Number */}
      <td className="px-1 py-1 text-xs font-mono font-bold text-white whitespace-nowrap">
        #{routine.entryNumber || '?'}
      </td>

      {/* Time */}
      <td className="px-1 py-1 text-xs font-mono text-white/90 whitespace-nowrap">
        {performanceTime}
      </td>

      {/* Routine Title */}
      <td className="px-1 py-1 text-xs font-medium text-white">
        <div className="flex items-center gap-1">
          {routine.title}
          {isLastInOveralls && (
            <span
              className="text-yellow-400 text-sm cursor-help"
              title={`Last routine for ${routine.entrySizeName} • ${routine.ageGroupName} • ${routine.classificationName}`}
            >
              🏆
            </span>
          )}
        </div>
      </td>

      {/* Studio */}
      <td className="px-1 py-1 text-xs text-white/80 text-center">
        {studioDisplay}
      </td>

      {/* Classification */}
      <td className="px-1 py-1">
        <span
          className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold ${classificationColor}`}
        >
          {routine.classificationName}
        </span>
      </td>

      {/* Size */}
      <td className="px-1 py-1 text-xs text-white/80">
        {routine.entrySizeName}
      </td>

      {/* Routine Age */}
      <td className="px-1 py-1 text-xs text-white/80 text-center">
        {routine.routineAge ?? '-'}
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

      {/* Session Separator */}
      {isLastInSession && (
        <tr className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20">
          <td colSpan={7} className="px-1 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs font-bold text-purple-300">
                  End of Session {sessionNumber}
                </span>
              </div>
              {sessionBlock?.suggestAward && (
                <div className="flex items-center gap-1 bg-amber-600/20 border border-amber-500/50 px-2 py-1 rounded-lg">
                  <span className="text-sm">🏆</span>
                  <span className="text-xs font-medium text-amber-300">
                    Suggested Award Ceremony Location
                  </span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ScheduleTable({
  routines,
  allRoutines = [],
  selectedDate,
  viewMode,
  conflicts,
  onRoutineClick,
}: ScheduleTableProps) {
  // Sort routines by entry_number
  const sortedRoutines = useMemo(() => {
    return [...routines].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
  }, [routines]);

  // Calculate routines to show trophy helper (when ≤5 unscheduled remain in category)
  const lastRoutineIds = useMemo(() => {
    // Count total and scheduled per category
    const categoryCounts = new Map<string, { total: number; scheduled: number; lastRoutineId: string }>();

    // Count all routines (scheduled + unscheduled) per category
    allRoutines.forEach(routine => {
      const key = `${routine.entrySizeName}|${routine.ageGroupName}|${routine.classificationName}`;
      const current = categoryCounts.get(key) || { total: 0, scheduled: 0, lastRoutineId: '' };
      current.total++;
      if (routine.isScheduled) {
        current.scheduled++;
      }
      categoryCounts.set(key, current);
    });

    // Find last scheduled routine per category (highest entry number)
    sortedRoutines.forEach(routine => {
      const key = `${routine.entrySizeName}|${routine.ageGroupName}|${routine.classificationName}`;
      const current = categoryCounts.get(key);
      if (current && (!current.lastRoutineId || (routine.entryNumber || 0) > 0)) {
        current.lastRoutineId = routine.id;
      }
    });

    // Show trophy only when unscheduled count ≤ 5
    const lastIds = new Set<string>();
    categoryCounts.forEach((counts, key) => {
      const unscheduled = counts.total - counts.scheduled;
      if (unscheduled <= 5 && counts.lastRoutineId) {
        lastIds.add(counts.lastRoutineId);
      }
    });

    return lastIds;
  }, [sortedRoutines, allRoutines]);

  // Calculate session blocks (~3-4 hour chunks) for visual indicators
  const sessionBlocks = useMemo(() => {
    if (sortedRoutines.length === 0) return [];

    const blocks: Array<{ sessionNumber: number; startIndex: number; endIndex: number; startTime: Date | null; endTime: Date | null; suggestAward: boolean }> = [];
    let sessionNumber = 1;
    let sessionStartIndex = 0;
    let sessionStartTime = sortedRoutines[0]?.scheduledTime ? new Date(sortedRoutines[0].scheduledTime) : null;

    sortedRoutines.forEach((routine, index) => {
      if (!routine.scheduledTime || !sessionStartTime) return;

      const currentTime = new Date(routine.scheduledTime);
      const hoursElapsed = (currentTime.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60);

      // Start new session after ~3.5 hours
      if (hoursElapsed >= 3.5 && index > 0) {
        const prevRoutine = sortedRoutines[index - 1];
        const endTime = prevRoutine?.scheduledTime ? new Date(prevRoutine.scheduledTime) : null;

        // Check if there are trophy helper routines near this boundary (within last 10 routines of session)
        const lastFewRoutines = sortedRoutines.slice(Math.max(sessionStartIndex, index - 10), index);
        const hasTrophyHelperNearby = lastFewRoutines.some(r => lastRoutineIds.has(r.id));

        blocks.push({
          sessionNumber,
          startIndex: sessionStartIndex,
          endIndex: index - 1,
          startTime: sessionStartTime,
          endTime,
          suggestAward: hasTrophyHelperNearby,
        });

        sessionNumber++;
        sessionStartIndex = index;
        sessionStartTime = currentTime;
      }
    });

    // Add final session
    if (sessionStartIndex < sortedRoutines.length) {
      const lastRoutine = sortedRoutines[sortedRoutines.length - 1];
      const endTime = lastRoutine?.scheduledTime ? new Date(lastRoutine.scheduledTime) : null;

      const lastFewRoutines = sortedRoutines.slice(Math.max(sessionStartIndex, sortedRoutines.length - 10));
      const hasTrophyHelperNearby = lastFewRoutines.some(r => lastRoutineIds.has(r.id));

      blocks.push({
        sessionNumber,
        startIndex: sessionStartIndex,
        endIndex: sortedRoutines.length - 1,
        startTime: sessionStartTime,
        endTime,
        suggestAward: hasTrophyHelperNearby,
      });
    }

    return blocks;
  }, [sortedRoutines, lastRoutineIds]);

  // Helper: Get session number for a routine index
  const getSessionNumber = (index: number): number => {
    const session = sessionBlocks.find(s => index >= s.startIndex && index <= s.endIndex);
    return session?.sessionNumber || 1;
  };

  // Helper: Check if this is the last routine in a session
  const isLastInSession = (index: number): boolean => {
    return sessionBlocks.some(s => s.endIndex === index);
  };

  // Helper: Get session block for routine index
  const getSessionBlock = (index: number) => {
    return sessionBlocks.find(s => index >= s.startIndex && index <= s.endIndex);
  };

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
              <th className="px-1 py-1 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '32px' }}>
                #
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '55px' }}>
                Time
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '100px' }}>
                Routine
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '45px' }}>
                Studio
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '70px' }}>
                Classification
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '50px' }}>
                Size
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white/80 uppercase tracking-wider" style={{ width: '40px' }}>
                Routine Age
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

                // Studio display - always show 5-char code
                const studioDisplay = routine.studioCode;

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
                    sessionNumber={getSessionNumber(index)}
                    isLastInSession={isLastInSession(index)}
                    sessionBlock={getSessionBlock(index)}
                    onRoutineClick={onRoutineClick}
                  />
                );
              })}
            </tbody>
          </SortableContext>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="bg-white/5 border-t border-white/20 px-1 py-1 flex items-center justify-between text-xs">
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
