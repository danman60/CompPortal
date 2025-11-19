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
import { useOptimisticScheduling } from '@/hooks/useOptimisticScheduling';
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
  /** Competition ID for mutations */
  competitionId: string;
  /** Tenant ID for mutations */
  tenantId: string;
  /** Callback when drop succeeds */
  onDropSuccess?: () => void;
  /** Callback when drop fails */
  onDropError?: (error: Error) => void;
}

export function DragDropProvider({
  children,
  routines,
  selectedDate,
  competitionId,
  tenantId,
  onDropSuccess,
  onDropError,
}: DragDropProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicatorTop, setDropIndicatorTop] = useState<number>(0);
  const [showDropIndicator, setShowDropIndicator] = useState(false);

  const { scheduleRoutines, calculateTimes } = useOptimisticScheduling();

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
    const { over } = event;

    if (over && !String(over.id).startsWith('schedule-table-') && !String(over.id).startsWith('routine-pool-')) {
      // Calculate drop indicator position based on over element
      setShowDropIndicator(true);

      // Find the element for the routine we're hovering over
      const overElement = document.querySelector(`[data-routine-id="${over.id}"]`);
      if (overElement) {
        const rect = overElement.getBoundingClientRect();
        // Position the line at the top of the hovered row
        setDropIndicatorTop(rect.top + window.scrollY);
      }
    } else {
      setShowDropIndicator(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
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

    // Determine drop operation type
    const targetId = over.id as string;

    // Case: Dropping onto empty schedule container
    if (targetId.startsWith('schedule-table-')) {
      console.log('[DragDropProvider] Drop onto empty schedule container');

      if (!draggedRoutine.isScheduled) {
        // Scheduling first routine of the day
        try {
          const timesResult = await calculateTimes.mutateAsync({
            tenantId,
            competitionId,
            date: selectedDate,
            routineIds: [draggedRoutineId],
            startTime: '08:00:00',
            startingEntryNumber: 100,
          });

          await scheduleRoutines.mutateAsync({
            tenantId,
            competitionId,
            date: selectedDate,
            routines: timesResult.schedule.map(s => ({
              routineId: s.routineId,
              entryNumber: s.entryNumber,
              performanceTime: s.performanceTime,
            })),
          });

          console.log('[DragDropProvider] First routine scheduled successfully');
          onDropSuccess?.();
        } catch (error) {
          console.error('[DragDropProvider] Failed to schedule first routine:', error);
          onDropError?.(error as Error);
        }
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
      console.log('[DragDropProvider] UR → SR: Scheduling routine');

      try {
        // Get all currently scheduled routines for this day, sorted by entry number
        const scheduledForDay = routines
          .filter(r => r.isScheduled && r.performanceTime) // Only routines with times (on this day)
          .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

        // Find insertion index (insert before target)
        const insertionIndex = scheduledForDay.findIndex(r => r.id === targetId);

        // Insert the dragged routine at the target position
        const newSchedule = [...scheduledForDay];
        newSchedule.splice(insertionIndex, 0, draggedRoutine);

        // Recalculate times for ALL routines starting from the first one
        const firstRoutine = scheduledForDay[0];
        const startTime = firstRoutine?.performanceTime || '08:00:00';
        const startingEntryNumber = firstRoutine?.entryNumber || 100;

        const timesResult = await calculateTimes.mutateAsync({
          tenantId,
          competitionId,
          date: selectedDate,
          routineIds: newSchedule.map(r => r.id),
          startTime,
          startingEntryNumber,
        });

        // Schedule ALL routines with new entry numbers
        await scheduleRoutines.mutateAsync({
          tenantId,
          competitionId,
          date: selectedDate,
          routines: timesResult.schedule.map(s => ({
            routineId: s.routineId,
            entryNumber: s.entryNumber,
            performanceTime: s.performanceTime,
          })),
        });

        console.log('[DragDropProvider] UR → SR successful');
        onDropSuccess?.();
      } catch (error) {
        console.error('[DragDropProvider] UR → SR failed:', error);
        onDropError?.(error as Error);
      }
    }

    // Case 2: Reordering within scheduled routines (SR)
    else if (draggedRoutine.isScheduled && targetRoutine.isScheduled) {
      console.log('[DragDropProvider] SR reorder: Moving routine');

      try {
        // Get all scheduled routines sorted by entry number
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

        // Recalculate times for all affected routines
        const startTime = reordered[0].performanceTime || '08:00:00';
        const startingEntryNumber = reordered[0].entryNumber || 100;

        const timesResult = await calculateTimes.mutateAsync({
          tenantId,
          competitionId,
          date: selectedDate,
          routineIds: reordered.map(r => r.id),
          startTime,
          startingEntryNumber,
        });

        // Schedule all routines with new times
        await scheduleRoutines.mutateAsync({
          tenantId,
          competitionId,
          date: selectedDate,
          routines: timesResult.schedule.map(s => ({
            routineId: s.routineId,
            entryNumber: s.entryNumber,
            performanceTime: s.performanceTime,
          })),
        });

        console.log('[DragDropProvider] SR reorder successful');
        onDropSuccess?.();
      } catch (error) {
        console.error('[DragDropProvider] SR reorder failed:', error);
        onDropError?.(error as Error);
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
