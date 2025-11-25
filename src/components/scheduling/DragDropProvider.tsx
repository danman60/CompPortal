'use client';

/**
 * DragDropProvider Component (Rebuild Spec Section 2)
 *
 * Wraps dnd-kit DndContext and manages drag-and-drop state for scheduling
 * - Manages activeId, activeRoutine during drag
 * - Shows drop indicator between rows
 * - Handles drop logic (UR → SR, SR reorder)
 * - Calls optimistic scheduling mutations
 *
 * Spec: SCHEDULE_PAGE_REBUILD_SPEC.md Lines 148-192
 */

import React, { useState, ReactNode } from 'react';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { DropIndicator } from './DropIndicator';
import { RoutineCard } from './RoutineCard';

interface RoutineData {
  id: string;
  title: string;
  duration: number;
  isScheduled: boolean;
  entryNumber?: number | null;
  performanceTime?: string | null; // TimeString format "HH:MM:SS"
}

interface ScheduleBlockData {
  id: string;
  block_type: string; // 'award' | 'break' from database
  title: string;
  duration_minutes: number;
  scheduled_time: Date | null;
  sort_order: number | null;
}

interface DragDropProviderProps {
  children: ReactNode;
  /** All routines (both scheduled and unscheduled) */
  routines: RoutineData[];
  /** Schedule blocks for current day */
  scheduleBlocks?: ScheduleBlockData[];
  /** Current selected date (ISO string "YYYY-MM-DD") */
  selectedDate: string;
  /** Callback when schedule order changes (draft state) */
  onScheduleChange: (newSchedule: RoutineData[]) => void;
  /** Callback when blocks are reordered */
  onBlockReorder?: (reorderedBlocks: ScheduleBlockData[]) => void;
  /** Set of selected routine IDs (for multi-select drag from unscheduled pool) */
  selectedRoutineIds?: Set<string>;
  /** Set of selected routine IDs (for multi-select drag from scheduled routines) */
  selectedScheduledIds?: Set<string>;
  /** Callback to clear selection after successful drag */
  onClearSelection?: () => void;
  /** Callback to clear scheduled selection after successful drag */
  onClearScheduledSelection?: () => void;
}

export function DragDropProvider({
  children,
  routines,
  scheduleBlocks = [],
  selectedDate,
  onScheduleChange,
  onBlockReorder,
  selectedRoutineIds = new Set(),
  selectedScheduledIds = new Set(),
  onClearSelection,
  onClearScheduledSelection,
}: DragDropProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicatorTop, setDropIndicatorTop] = useState<number>(0);
  const [showDropIndicator, setShowDropIndicator] = useState(false);

  // Get the actively dragged routine
  const activeRoutine = activeId ? routines.find(r => r.id === activeId) : null;

  // Configure sensors for drag interaction
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required to start drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    console.log('[DragDropProvider] Drag started:', { activeId: active.id });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;

    if (over && !String(over.id).startsWith('schedule-table-') && !String(over.id).startsWith('routine-pool-')) {
      // Don't show indicator if hovering over self
      if (over.id === active.id) {
        setShowDropIndicator(false);
        return;
      }

      setShowDropIndicator(true);

      // Find the element for the routine we're hovering over
      const overElement = document.querySelector(`[data-routine-id="${over.id}"]`);
      if (overElement) {
        const rect = overElement.getBoundingClientRect();
        // Position the line above the hovered row (insertion point)
        // Subtract 2px to ensure line appears between rows, not on the row border
        setDropIndicatorTop(rect.top - 2);
      }
    } else {
      setShowDropIndicator(false);
    }
  };

  // Helper: Recalculate block times with cascading (blocks + routines interleaved)
  const recalculateBlockTimes = (blocks: ScheduleBlockData[], routines: RoutineData[]) => {
    // Combine blocks and routines into single timeline
    const timeline: Array<{type: 'block' | 'routine', data: any, time: Date}> = [];

    // Add blocks (skip null scheduled_time)
    blocks.forEach(block => {
      if (block.scheduled_time) {
        timeline.push({
          type: 'block',
          data: block,
          time: new Date(block.scheduled_time),
        });
      }
    });

    // Add scheduled routines
    routines.filter(r => r.isScheduled && r.performanceTime).forEach(routine => {
      const [hours, minutes] = routine.performanceTime!.split(':').map(Number);
      const date = new Date(routine.performanceTime!);
      date.setHours(hours, minutes, 0, 0);
      timeline.push({
        type: 'routine',
        data: routine,
        time: date,
      });
    });

    // Sort by time
    timeline.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Recalculate times based on order
    const recalculatedBlocks: ScheduleBlockData[] = [];
    let currentTime = timeline[0]?.time || new Date();

    timeline.forEach((item, index) => {
      if (item.type === 'block') {
        const block = item.data as ScheduleBlockData;
        recalculatedBlocks.push({
          ...block,
          scheduled_time: new Date(currentTime),
          sort_order: index,
        });
        // Add block duration to current time
        currentTime = new Date(currentTime.getTime() + block.duration_minutes * 60 * 1000);
      } else {
        // Routine - add routine duration
        const routine = item.data as RoutineData;
        currentTime = new Date(currentTime.getTime() + (routine.duration || 3) * 60 * 1000);
      }
    });

    return recalculatedBlocks;
  };

  // Helper: Handle block drag and reorder
  const handleBlockDrag = (draggedBlockId: string, targetId: string) => {
    if (!onBlockReorder) {
      console.warn('[DragDropProvider] No onBlockReorder callback provided');
      return;
    }

    // Strip "block-" prefix to get actual database ID
    const actualDraggedId = draggedBlockId.replace('block-', '');
    const actualTargetId = targetId.replace('block-', '');

    const draggedBlock = scheduleBlocks.find(b => b.id === actualDraggedId);
    if (!draggedBlock) {
      console.error('[DragDropProvider] Dragged block not found:', draggedBlockId, 'actual ID:', actualDraggedId);
      return;
    }

    // If dropped on another block, reorder
    if (targetId.startsWith('block-')) {
      const targetBlock = scheduleBlocks.find(b => b.id === actualTargetId);
      if (!targetBlock || targetBlock.id === actualDraggedId) {
        console.log('[DragDropProvider] Invalid block drop target');
        return;
      }

      console.log('[DragDropProvider] Reordering blocks:', {
        draggedBlock: draggedBlock.title,
        targetBlock: targetBlock.title,
      });

      // Get current block order (sorted by time)
      const sortedBlocks = [...scheduleBlocks]
        .filter(b => b.scheduled_time) // Filter out blocks without times
        .sort((a, b) =>
          new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime()
        );

      // Find positions
      const fromIndex = sortedBlocks.findIndex(b => b.id === actualDraggedId);
      const toIndex = sortedBlocks.findIndex(b => b.id === actualTargetId);

      if (fromIndex === -1 || toIndex === -1) {
        console.error('[DragDropProvider] Could not find block indices');
        return;
      }

      // Reorder
      const reordered = [...sortedBlocks];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);

      // Recalculate times with cascade
      const recalculated = recalculateBlockTimes(reordered, routines);

      console.log('[DragDropProvider] Block reorder complete, cascading times');
      onBlockReorder(recalculated);
    }
    // If dropped on routine, insert before that routine
    else if (!targetId.startsWith('schedule-table-') && !targetId.startsWith('routine-pool-')) {
      const targetRoutine = routines.find(r => r.id === targetId);
      if (!targetRoutine || !targetRoutine.isScheduled) {
        console.log('[DragDropProvider] Invalid routine drop target for block');
        return;
      }

      console.log('[DragDropProvider] Inserting block before routine:', targetRoutine.title);

      // Get target routine time
      const [hours, minutes] = targetRoutine.performanceTime!.split(':').map(Number);
      const targetTime = new Date();
      targetTime.setHours(hours, minutes, 0, 0);

      // Remove block from current position
      const otherBlocks = scheduleBlocks.filter(b => b.id !== actualDraggedId);

      // Create updated block with new time
      const updatedBlock = {
        ...draggedBlock,
        scheduled_time: targetTime,
      };

      // Combine and recalculate
      const allBlocks = [...otherBlocks, updatedBlock];
      const recalculated = recalculateBlockTimes(allBlocks, routines);

      console.log('[DragDropProvider] Block inserted, cascading times');
      onBlockReorder(recalculated);
    }
  };

  // Helper: Calculate entry numbers and times client-side
  const calculateSchedule = (routineList: RoutineData[], startTime = '08:00:00', startingEntry = 100) => {
    let currentTime = startTime;
    let currentEntry = startingEntry;

    return routineList.map(routine => {
      const scheduledRoutine = {
        ...routine,
        entryNumber: currentEntry,
        performanceTime: currentTime,
        isScheduled: true,
      };

      // Calculate next time (add duration, NO buffer per spec)
      const [hours, minutes, seconds] = currentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + (routine.duration || 3);
      const nextHours = Math.floor(totalMinutes / 60);
      const nextMinutes = totalMinutes % 60;
      currentTime = `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}:00`;

      currentEntry++;

      return scheduledRoutine;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setShowDropIndicator(false);

    if (!over) {
      console.log('[DragDropProvider] Drag cancelled (no drop target)');
      return;
    }

    const draggedId = active.id as string;

    // Check if dragging a schedule block
    if (draggedId.startsWith('block-')) {
      handleBlockDrag(draggedId, over.id as string);
      return;
    }

    // Otherwise, dragging a routine
    const draggedRoutine = routines.find(r => r.id === draggedId);

    if (!draggedRoutine) {
      console.error('[DragDropProvider] Dragged routine not found:', draggedId);
      return;
    }

    const draggedRoutineId = draggedId;

    // Multi-select logic: check appropriate selection state based on routine status
    // For scheduled routines: check selectedScheduledIds
    // For unscheduled routines: check selectedRoutineIds
    const relevantSelection = draggedRoutine.isScheduled ? selectedScheduledIds : selectedRoutineIds;
    const isMultiDrag = relevantSelection.has(draggedRoutineId) && relevantSelection.size > 1;
    const routinesToDrag = isMultiDrag
      ? routines.filter(r => relevantSelection.has(r.id))
      : [draggedRoutine];

    console.log('[DragDropProvider] Drag ended:', {
      draggedRoutineId,
      targetId: over.id,
      isScheduled: draggedRoutine.isScheduled,
      isMultiDrag,
      count: routinesToDrag.length,
    });

    const targetId = over.id as string;

    // Case: Dropping onto empty schedule container
    if (targetId.startsWith('schedule-table-')) {
      console.log('[DragDropProvider] Drop onto empty schedule container');

      if (!draggedRoutine.isScheduled) {
        // Get existing scheduled routines
        const scheduledForDay = routines
          .filter(r => r.isScheduled && r.performanceTime)
          .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

        // Add to end of schedule (single or multiple routines)
        const newSchedule = [...scheduledForDay, ...routinesToDrag];
        const recalculated = calculateSchedule(
          newSchedule,
          scheduledForDay[0]?.performanceTime || '08:00:00',
          scheduledForDay[0]?.entryNumber || 100
        );
        onScheduleChange(recalculated);

        // Clear selection after successful multi-drag (use appropriate callback)
        if (isMultiDrag) {
          const clearFn = draggedRoutine.isScheduled ? onClearScheduledSelection : onClearSelection;
          if (clearFn) clearFn();
        }
      }
      return;
    }

    // Ignore drops onto routine pool
    if (targetId.startsWith('routine-pool-')) {
      console.log('[DragDropProvider] Drop onto routine pool ignored');
      return;
    }

    // Handle drops onto blocks (insert routine before the block)
    if (targetId.startsWith('block-')) {
      const actualBlockId = targetId.replace('block-', '');
      const targetBlock = scheduleBlocks.find(b => b.id === actualBlockId);

      if (!targetBlock || !targetBlock.scheduled_time) {
        console.error('[DragDropProvider] Target block not found or has no time:', targetId);
        return;
      }

      console.log('[DragDropProvider] Inserting routine(s) before block:', targetBlock.title);

      // Get all currently scheduled routines for this day
      const scheduledForDay = routines
        .filter(r => r.isScheduled && r.performanceTime)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

      // Parse block time to find insertion point
      const blockDate = new Date(targetBlock.scheduled_time);
      const blockHours = blockDate.getHours();
      const blockMinutes = blockDate.getMinutes();
      const blockTime = blockHours * 60 + blockMinutes;

      // Find last routine before this block (by time)
      let insertionIndex = scheduledForDay.findIndex(r => {
        if (!r.performanceTime) return false;
        const [hours, minutes] = r.performanceTime.split(':').map(Number);
        const routineTime = hours * 60 + minutes;
        return routineTime >= blockTime;
      });

      // If no routine found after block, insert at end
      if (insertionIndex === -1) {
        insertionIndex = scheduledForDay.length;
      }

      // Insert the dragged routine(s) at the target position
      const newSchedule = [...scheduledForDay];
      newSchedule.splice(insertionIndex, 0, ...routinesToDrag);

      // Recalculate times and entry numbers
      const firstRoutine = scheduledForDay[0];
      const recalculated = calculateSchedule(
        newSchedule,
        firstRoutine?.performanceTime || '08:00:00',
        firstRoutine?.entryNumber || 100
      );

      onScheduleChange(recalculated);

      // Clear selection after successful multi-drag
      if (isMultiDrag) {
        const clearFn = draggedRoutine.isScheduled ? onClearScheduledSelection : onClearSelection;
        if (clearFn) clearFn();
      }
      return;
    }

    const targetRoutine = routines.find(r => r.id === targetId);

    if (!targetRoutine) {
      console.error('[DragDropProvider] Target routine not found:', targetId);
      return;
    }

    // Case 1: Dragging unscheduled routine (UR) to scheduled area (SR)
    if (!draggedRoutine.isScheduled && targetRoutine.isScheduled) {
      console.log('[DragDropProvider] UR → SR: Adding to schedule');

      // Get all currently scheduled routines for this day
      const scheduledForDay = routines
        .filter(r => r.isScheduled && r.performanceTime)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

      // Find insertion index (insert before target)
      const insertionIndex = scheduledForDay.findIndex(r => r.id === targetId);

      // Insert the dragged routine(s) at the target position
      const newSchedule = [...scheduledForDay];
      newSchedule.splice(insertionIndex, 0, ...routinesToDrag);

      // Recalculate times and entry numbers
      const firstRoutine = scheduledForDay[0];
      const recalculated = calculateSchedule(
        newSchedule,
        firstRoutine?.performanceTime || '08:00:00',
        firstRoutine?.entryNumber || 100
      );

      onScheduleChange(recalculated);

      // Clear selection after successful multi-drag (use appropriate callback)
      if (isMultiDrag) {
        const clearFn = draggedRoutine.isScheduled ? onClearScheduledSelection : onClearSelection;
        if (clearFn) clearFn();
      }
    }

    // Case 2: Reordering within scheduled routines (SR)
    else if (draggedRoutine.isScheduled && targetRoutine.isScheduled) {
      console.log('[DragDropProvider] SR reorder: Reordering schedule');

      // Get all scheduled routines
      const scheduledRoutines = routines
        .filter(r => r.isScheduled)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

      // Find target insertion index
      const toIndex = scheduledRoutines.findIndex(r => r.id === targetId);

      if (toIndex === -1) {
        console.log('[DragDropProvider] Target routine not found in schedule');
        return;
      }

      if (isMultiDrag) {
        // Multi-drag reorder: Remove all selected routines, then insert at target
        console.log('[DragDropProvider] Multi-drag reorder:', routinesToDrag.length, 'routines');

        // Get IDs of routines being moved
        const draggedIds = new Set(routinesToDrag.map(r => r.id));

        // Check if target is one of the selected routines (no-op)
        if (draggedIds.has(targetId)) {
          console.log('[DragDropProvider] Target is in selection, no reorder needed');
          return;
        }

        // Remove all selected routines from schedule
        const withoutDragged = scheduledRoutines.filter(r => !draggedIds.has(r.id));

        // Find new insertion index (may have shifted after removing selected routines)
        const newToIndex = withoutDragged.findIndex(r => r.id === targetId);

        if (newToIndex === -1) {
          console.error('[DragDropProvider] Target lost after removing dragged routines');
          return;
        }

        // Insert all selected routines at target position (in their original relative order)
        const reordered = [...withoutDragged];
        reordered.splice(newToIndex, 0, ...routinesToDrag);

        // Recalculate times and entry numbers
        const recalculated = calculateSchedule(
          reordered,
          reordered[0].performanceTime || '08:00:00',
          reordered[0].entryNumber || 100
        );

        onScheduleChange(recalculated);

        // Clear selection after successful multi-drag (always scheduled routines in this case)
        if (onClearScheduledSelection) {
          onClearScheduledSelection();
        }
      } else {
        // Single routine reorder (original logic)
        const fromIndex = scheduledRoutines.findIndex(r => r.id === draggedRoutineId);

        if (fromIndex === -1 || fromIndex === toIndex) {
          console.log('[DragDropProvider] No reorder needed');
          return;
        }

        // Reorder array
        const reordered = [...scheduledRoutines];
        const [removed] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, removed);

        // Recalculate times and entry numbers
        const recalculated = calculateSchedule(
          reordered,
          reordered[0].performanceTime || '08:00:00',
          reordered[0].entryNumber || 100
        );

        onScheduleChange(recalculated);
      }
    }

    // Case 3: Other combinations (e.g., SR → UR to unschedule)
    else {
      console.log('[DragDropProvider] Unsupported drop operation');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DropIndicator top={dropIndicatorTop} visible={showDropIndicator} />
      <DragOverlay>
        {activeRoutine ? (
          <div className="opacity-90 rotate-2 scale-105">
            <RoutineCard
              routine={{
                ...activeRoutine,
                studioId: '',
                studioName: '',
                studioCode: '',
                classificationId: '',
                classificationName: '',
                categoryId: '',
                categoryName: '',
                ageGroupId: '',
                ageGroupName: '',
                entrySizeId: '',
                entrySizeName: '',
                routineAge: null,
                participants: [],
                isScheduled: activeRoutine.isScheduled,
                scheduleZone: null,
                scheduledTime: null,
                scheduledDay: null,
                scheduledDateString: null,
                scheduledTimeString: activeRoutine.performanceTime,
                entryNumber: activeRoutine.entryNumber,
              }}
              viewMode="cd"
              inZone={false}
              isDraggingAnything={true}
              hasConflict={false}
              hasNotes={false}
              hasAgeChange={false}
              isLastRoutine={false}
              isSelected={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
