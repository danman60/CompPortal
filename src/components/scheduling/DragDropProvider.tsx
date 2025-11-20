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

interface DragDropProviderProps {
  children: ReactNode;
  /** All routines (both scheduled and unscheduled) */
  routines: RoutineData[];
  /** Current selected date (ISO string "YYYY-MM-DD") */
  selectedDate: string;
  /** Callback when schedule order changes (draft state) */
  onScheduleChange: (newSchedule: RoutineData[]) => void;
}

export function DragDropProvider({
  children,
  routines,
  selectedDate,
  onScheduleChange,
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

    const draggedRoutineId = active.id as string;
    const draggedRoutine = routines.find(r => r.id === draggedRoutineId);

    if (!draggedRoutine) {
      console.error('[DragDropProvider] Dragged routine not found:', draggedRoutineId);
      return;
    }

    console.log('[DragDropProvider] Drag ended:', {
      draggedRoutineId,
      targetId: over.id,
      isScheduled: draggedRoutine.isScheduled,
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

        // Add to end of schedule
        const newSchedule = [...scheduledForDay, draggedRoutine];
        const recalculated = calculateSchedule(
          newSchedule,
          scheduledForDay[0]?.performanceTime || '08:00:00',
          scheduledForDay[0]?.entryNumber || 100
        );
        onScheduleChange(recalculated);
      }
      return;
    }

    // Ignore drops onto routine pool
    if (targetId.startsWith('routine-pool-')) {
      console.log('[DragDropProvider] Drop onto routine pool ignored');
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

      // Insert the dragged routine at the target position
      const newSchedule = [...scheduledForDay];
      newSchedule.splice(insertionIndex, 0, draggedRoutine);

      // Recalculate times and entry numbers
      const firstRoutine = scheduledForDay[0];
      const recalculated = calculateSchedule(
        newSchedule,
        firstRoutine?.performanceTime || '08:00:00',
        firstRoutine?.entryNumber || 100
      );

      onScheduleChange(recalculated);
    }

    // Case 2: Reordering within scheduled routines (SR)
    else if (draggedRoutine.isScheduled && targetRoutine.isScheduled) {
      console.log('[DragDropProvider] SR reorder: Reordering schedule');

      // Get all scheduled routines
      const scheduledRoutines = routines
        .filter(r => r.isScheduled)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

      // Find indices
      const fromIndex = scheduledRoutines.findIndex(r => r.id === draggedRoutineId);
      const toIndex = scheduledRoutines.findIndex(r => r.id === targetId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
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
