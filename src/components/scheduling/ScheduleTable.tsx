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

import { useMemo, useState, useRef } from 'react';
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
  conflictsByRoutineId?: Map<string, Array<{
    dancerId: string;
    dancerName: string;
    routine1Id: string;
    routine1Number: number;
    routine1Title: string;
    routine2Id: string;
    routine2Number: number;
    routine2Title: string;
    routinesBetween: number;
    severity: 'critical' | 'error' | 'warning';
    message: string;
  }>>;
  onRoutineClick?: (routineId: string) => void;
  selectedRoutineIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  scheduleBlocks?: Array<{
    id: string;
    block_type: string;
    title: string;
    duration_minutes: number;
    scheduled_time: Date | null;
    sort_order: number | null;
  }>;
  onDeleteBlock?: (blockId: string) => void;
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
  scheduledDateString?: string | null; // YYYY-MM-DD format from backend
  scheduledTimeString?: string | null; // HH:MM:SS format from backend
  routineAge?: number | null;
  has_studio_requests?: boolean | null; // SD notes flag for blue glow
  scheduling_notes?: string | null; // SD notes text for tooltip
  dancer_names?: string[] | null; // Array of dancer names in this routine
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

// Schedule Block Row Component (Sortable)
function SortableBlockRow({
  block,
  showCheckbox,
  onDelete,
}: {
  block: {
    id: string;
    block_type: string;
    title: string;
    duration_minutes: number;
    scheduled_time: Date | null;
  };
  showCheckbox?: boolean;
  onDelete?: (blockId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `block-${block.id}`, // Prefix to avoid ID collision with routines
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const bgColor = block.block_type === 'award'
    ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/30'
    : 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30';

  const icon = block.block_type === 'award' ? '🏆' : '☕';
  const borderColor = block.block_type === 'award' ? 'border-amber-500/50' : 'border-cyan-500/50';

  // Format time if available
  const displayTime = block.scheduled_time
    ? (() => {
        const date = new Date(block.scheduled_time);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
      })()
    : 'TBD';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`border-b-2 ${borderColor} ${bgColor} cursor-move hover:bg-white/5 transition-colors`}
    >
      {showCheckbox && <td className="px-0.5 py-1" style={{ width: '18px' }}></td>}
      <td className="px-0 py-1" style={{ width: '36px' }}></td>
      <td className="px-0.5 py-1 text-[13px] font-mono font-bold text-white" style={{ width: '22px' }}>
        {icon}
      </td>
      <td className="px-0.5 py-1 font-mono text-white/90" style={{ width: '36px' }}>
        <div className="flex items-baseline gap-0.5">
          <span className="font-semibold text-[13px]">{displayTime}</span>
        </div>
      </td>
      <td colSpan={5} className="px-1 py-1">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-sm font-semibold text-white">{block.title}</span>
            <span className="text-xs text-white/60 ml-2">({block.duration_minutes} min)</span>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(block.id);
              }}
              className="px-2 py-1 text-xs font-bold text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded transition-colors"
              title="Delete block"
            >
              ✕
            </button>
          )}
        </div>
      </td>
    </tr>
  );
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
  isSelected,
  onCheckboxChange,
  showCheckbox,
  dismissedIcons,
  onDismissIcon,
  scheduledRoutines,
  conflicts,
}: {
  routine: Routine;
  index: number;
  isLastInOveralls: boolean;
  conflict: { routineIds: string[]; conflict: Conflict } | undefined;
  isFirstInConflict: boolean;
  conflictSpan: number;
  performanceTime: { time: string; period: string };
  classificationColor: string;
  studioDisplay: string;
  viewMode: ViewMode;
  sessionNumber: number;
  isLastInSession: boolean;
  sessionBlock: any;
  onRoutineClick?: (routineId: string) => void;
  isSelected?: boolean;
  onCheckboxChange?: (routineId: string, index: number, event: React.MouseEvent) => void;
  showCheckbox?: boolean;
  dismissedIcons: Set<string>;
  onDismissIcon: (key: string) => void;
  scheduledRoutines: Routine[];
  conflicts?: Array<{
    dancerId: string;
    dancerName: string;
    routine1Id: string;
    routine1Number: number;
    routine1Title: string;
    routine2Id: string;
    routine2Number: number;
    routine2Title: string;
    routinesBetween: number;
    severity: 'critical' | 'error' | 'warning';
    message: string;
  }>;
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

  // Helper icon detection (using dynamic conflicts)
  const hasConflict = conflicts && conflicts.length > 0;
  const conflictSeverity = conflicts?.[0]?.severity || 'warning';
  const hasTrophy = isLastInOveralls;
  const hasSDRequest = !!(routine.has_studio_requests ?? false);

  // Generate detailed conflict tooltip from dynamic data
  const getConflictTooltip = () => {
    if (!conflicts || conflicts.length === 0) return '';

    const conflict = conflicts[0]; // Show first conflict
    const isRoutine1 = conflict.routine1Id === routine.id;
    const conflictingRoutineNumber = isRoutine1 ? conflict.routine2Number : conflict.routine1Number;
    const conflictingRoutineTitle = isRoutine1 ? conflict.routine2Title : conflict.routine1Title;

    let tooltip = `⚠️ Conflict: ${conflict.dancerName}`;
    tooltip += `\n${conflict.routinesBetween} routine${conflict.routinesBetween !== 1 ? 's' : ''} between performances`;
    tooltip += `\n(need 6+ for costume changes)`;
    tooltip += `\n\nConflicts with:`;
    tooltip += `\n• #${conflictingRoutineNumber} ${conflictingRoutineTitle}`;

    if (routine.dancer_names && routine.dancer_names.length > 0) {
      tooltip += `\n\nDancers in this routine:`;
      tooltip += `\n${routine.dancer_names.join(', ')}`;
    }

    if (conflicts.length > 1) {
      tooltip += `\n\n+${conflicts.length - 1} more conflict${conflicts.length - 1 !== 1 ? 's' : ''}`;
    }

    return tooltip;
  };

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          border-b border-white/10 hover:bg-white/5 transition-colors cursor-move relative
          ${sessionBg}
        `}
        onClick={() => onRoutineClick?.(routine.id)}
      >
      {/* Checkbox - 18px */}
      {showCheckbox && (
        <td className="px-0.5 py-1 text-center" style={{ width: '18px' }}>
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCheckboxChange?.(routine.id, index, e);
            }}
            className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-purple-600 cursor-pointer"
          />
        </td>
      )}

      {/* Landscape Badges - 28px */}
      <td className="px-0 py-1" style={{ width: '28px' }}>
        <div className="flex flex-row gap-0.5 items-center justify-center">
          {hasTrophy && !dismissedIcons.has(`${routine.id}-trophy`) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissIcon(`${routine.id}-trophy`);
              }}
              title={`🏆 Last Routine of ${routine.entrySizeName} • ${routine.ageGroupName} • ${routine.classificationName} - Ready for awards!`}
              className="inline-flex items-center justify-center w-6 h-2 rounded text-[10px] transition-transform hover:scale-125"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                border: '1px solid rgba(255, 215, 0, 0.6)'
              }}
            >
              <span className="text-[8px]">🏆</span>
            </button>
          )}
          {hasSDRequest && !dismissedIcons.has(`${routine.id}-note`) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissIcon(`${routine.id}-note`);
              }}
              title={`📋 ${routine.scheduling_notes || 'Studio Director requested changes'}`}
              className="inline-flex items-center justify-center w-6 h-2 rounded text-[10px] transition-transform hover:scale-125"
              style={{
                background: 'linear-gradient(135deg, #4FC3F7, #2196F3)',
                border: '1px solid rgba(33, 150, 243, 0.6)'
              }}
            >
              <span className="text-[8px]">📋</span>
            </button>
          )}
          {hasConflict && !dismissedIcons.has(`${routine.id}-conflict`) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissIcon(`${routine.id}-conflict`);
              }}
              title={getConflictTooltip()}
              className="inline-flex items-center justify-center w-6 h-2 rounded text-[10px] transition-transform hover:scale-125"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B, #EE5A6F)',
                border: '1px solid rgba(255, 107, 107, 0.6)'
              }}
            >
              <span className="text-[8px]">⚠️</span>
            </button>
          )}
        </div>
      </td>

      {/* Entry Number - 22px */}
      <td className="px-0.5 py-1 text-[13px] font-mono font-bold text-white whitespace-nowrap" style={{ width: '22px' }}>
        #{routine.entryNumber || '?'}
      </td>

      {/* Time - 36px (compact with split AM/PM, larger font) */}
      <td className="px-0.5 py-1 font-mono text-white/90 whitespace-nowrap" style={{ width: '36px' }}>
        <div className="flex items-baseline gap-0.5">
          <span className="font-semibold text-[13px]">{performanceTime.time}</span>
          {performanceTime.period && (
            <span className="text-[10px] opacity-70">{performanceTime.period}</span>
          )}
        </div>
      </td>

      {/* Routine Title - 75px */}
      <td className="px-1 py-1 text-xs font-medium text-white relative" style={{ width: '75px' }}>
        <div className="truncate-cell">
          <span className="truncate" title={routine.title}>{routine.title}</span>
        </div>
      </td>

      {/* Studio - 35px */}
      <td className="px-1 py-1 text-xs text-white/80 text-center" style={{ width: '35px' }}>
        {studioDisplay}
      </td>

      {/* Classification - 80px */}
      <td className="px-1 py-1" style={{ width: '80px' }}>
        <span
          className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold truncate ${classificationColor}`}
        >
          {routine.classificationName}
        </span>
      </td>

      {/* Size - 65px */}
      <td className="px-1 py-1 text-xs text-white/80" style={{ width: '65px' }}>
        <div className="truncate-cell">{routine.entrySizeName}</div>
      </td>

      {/* Routine Age - 40px */}
      <td className="px-1 py-1 text-xs text-white/80 text-center" style={{ width: '40px' }}>
        {routine.routineAge ?? '-'}
      </td>

      {/* Duration - 60px */}
      <td className="px-1 py-1 text-xs text-white/80 text-center whitespace-nowrap" style={{ width: '60px' }}>
        {routine.duration}m
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
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-xs font-bold text-purple-300">
                End of Session {sessionNumber}
              </span>
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
  conflictsByRoutineId,
  onRoutineClick,
  selectedRoutineIds = new Set(),
  onSelectionChange,
  scheduleBlocks = [],
  onDeleteBlock,
}: ScheduleTableProps) {
  const lastClickedIndexRef = useRef<number | null>(null);
  const [dismissedIcons, setDismissedIcons] = useState<Set<string>>(new Set());

  // Sort routines by entry_number
  const sortedRoutines = useMemo(() => {
    return [...routines].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
  }, [routines]);

  // Combine routines and blocks into chronological order
  const scheduleItems = useMemo(() => {
    const items: Array<{ type: 'routine' | 'block'; data: any; order: number }> = [];

    // Add routines
    sortedRoutines.forEach((routine, index) => {
      items.push({
        type: 'routine',
        data: routine,
        order: routine.entryNumber || index,
      });
    });

    // Add blocks
    scheduleBlocks.forEach(block => {
      if (block.sort_order !== null) {
        items.push({
          type: 'block',
          data: block,
          order: block.sort_order,
        });
      }
    });

    // Sort by order
    return items.sort((a, b) => a.order - b.order);
  }, [sortedRoutines, scheduleBlocks]);

  // Handle checkbox change with shift-click support
  const handleCheckboxChange = (routineId: string, index: number, event: React.MouseEvent) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedRoutineIds);

    // Shift-click: select range
    if (event.shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);

      // Add all routines in range
      for (let i = start; i <= end; i++) {
        newSelection.add(sortedRoutines[i].id);
      }
    } else {
      // Normal click: toggle single routine
      if (newSelection.has(routineId)) {
        newSelection.delete(routineId);
      } else {
        newSelection.add(routineId);
      }
    }

    lastClickedIndexRef.current = index;
    onSelectionChange(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedRoutineIds.size === sortedRoutines.length) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      onSelectionChange(new Set(sortedRoutines.map(r => r.id)));
    }
  };

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

  // Show empty state only if BOTH routines and blocks are empty
  if (sortedRoutines.length === 0 && scheduleBlocks.length === 0) {
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
        <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-indigo-600/20 border-b border-indigo-600/30">
              {onSelectionChange && (
                <th className="px-0.5 py-1 text-center" style={{ width: '14px' }}>
                  <input
                    type="checkbox"
                    checked={selectedRoutineIds.size === sortedRoutines.length && sortedRoutines.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-purple-600 cursor-pointer"
                  />
                </th>
              )}
              <th
                className="px-0 py-1 text-center text-[11px] font-semibold text-white/60"
                style={{ width: '28px' }}
              >
                <div
                  className="cursor-help"
                  title="Helper Icons Legend:
🏆 Trophy = Last routine in category (award ceremony ready)
📋 Note = Studio Director requested changes
⚠️ Conflict = Dancer scheduling conflict detected
Click badge to dismiss"
                >
                  <span className="text-[9px]">●</span>
                </div>
                {dismissedIcons.size > 0 && (
                  <button
                    onClick={() => setDismissedIcons(new Set())}
                    className="text-[9px] text-purple-400 hover:text-purple-300 mt-0.5 underline"
                    title={`Unhide ${dismissedIcons.size} hidden badge${dismissedIcons.size !== 1 ? 's' : ''}`}
                  >
                    Unhide
                  </button>
                )}
              </th>
              <th className="px-0.5 py-1 text-left text-[13px] font-semibold text-white uppercase tracking-wider" style={{ width: '22px' }}>
                #
              </th>
              <th className="px-0.5 py-1 text-left text-[13px] font-semibold text-white uppercase tracking-wider" style={{ width: '36px' }}>
                Time
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '75px' }}>
                Routine
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '35px' }}>
                Std
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '80px' }}>
                Class
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '65px' }}>
                Size
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '40px' }}>
                Age
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '60px' }}>
                Dur
              </th>
            </tr>
          </thead>
          <SortableContext
            items={[
              ...sortedRoutines.map(r => r.id),
              ...scheduleBlocks.map(b => `block-${b.id}`),
            ]}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {scheduleItems.map((item, index) => {
                if (item.type === 'block') {
                  // Render schedule block
                  return (
                    <SortableBlockRow
                      key={`block-${item.data.id}`}
                      block={item.data}
                      showCheckbox={!!onSelectionChange}
                      onDelete={onDeleteBlock}
                    />
                  );
                }

                // Render routine
                const routine = item.data;
                const routineIndex = sortedRoutines.findIndex(r => r.id === routine.id);
                const isLastInOveralls = lastRoutineIds.has(routine.id);
                const conflict = getRoutineConflict(routine.id);
                const isFirstInConflict = isFirstInConflictGroup(routine.id);
                const conflictSpan = getConflictSpan(routine.id);

                // Format time - split into number and period for compact display
                const performanceTime = routine.scheduledTimeString
                  ? (() => {
                      const [hours24, minutes] = routine.scheduledTimeString.split(':');
                      const hour24 = parseInt(hours24, 10);
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                      const ampm = hour24 >= 12 ? 'PM' : 'AM';
                      return { time: `${hour12}:${minutes}`, period: ampm };
                    })()
                  : { time: 'TBD', period: '' };

                // Classification color
                const classificationColor = getClassificationColor(routine.classificationName);

                // Studio display - always show 5-char code
                const studioDisplay = routine.studioCode;

                return (
                  <SortableRoutineRow
                    key={routine.id}
                    routine={routine}
                    index={routineIndex}
                    isLastInOveralls={isLastInOveralls}
                    conflict={conflict}
                    isFirstInConflict={!!isFirstInConflict}
                    conflictSpan={conflictSpan}
                    performanceTime={performanceTime}
                    classificationColor={classificationColor}
                    studioDisplay={studioDisplay}
                    viewMode={viewMode}
                    sessionNumber={getSessionNumber(routineIndex)}
                    isLastInSession={isLastInSession(routineIndex)}
                    sessionBlock={getSessionBlock(routineIndex)}
                    onRoutineClick={onRoutineClick}
                    isSelected={selectedRoutineIds.has(routine.id)}
                    onCheckboxChange={handleCheckboxChange}
                    showCheckbox={!!onSelectionChange}
                    dismissedIcons={dismissedIcons}
                    onDismissIcon={(key) => setDismissedIcons(prev => new Set(prev).add(key))}
                    scheduledRoutines={sortedRoutines}
                    conflicts={conflictsByRoutineId?.get(routine.id) || []}
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
          {dismissedIcons.size > 0 && (
            <button
              onClick={() => setDismissedIcons(new Set())}
              className="px-2 py-1 bg-purple-600/50 hover:bg-purple-600/70 text-white rounded text-xs font-medium transition-colors"
              title="Show all hidden helper icons"
            >
              🔄 Reset Helper Icons ({dismissedIcons.size})
            </button>
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
