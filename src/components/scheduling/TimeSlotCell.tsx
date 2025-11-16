'use client';

/**
 * TimeSlotCell Component
 *
 * Individual time slot cell in the timeline grid
 * - Shows time label (9:00 AM, 9:05 AM, etc.)
 * - Displays routine if scheduled
 * - Drag-and-drop target for scheduling
 * - Conflict indicators
 *
 * Created: Session 59 (Timeline Grid Phase 2)
 */

import { useDraggable, useDroppable } from '@dnd-kit/core';

interface TimeSlot {
  date: string;
  time: string;
  displayTime: string;
  index: number;
  available: boolean;
  routineId?: string;
  blockId?: string;
}

interface Routine {
  id: string;
  title: string;
  studioName: string;
  studioCode: string;
  categoryName: string;
  duration: number;
}

interface TimeSlotCellProps {
  slot: TimeSlot;
  routine?: Routine;
  showTimeLabel?: boolean;
  hasConflict?: boolean;
  isFirstOfHour?: boolean;
  onClick?: () => void;
}

export function TimeSlotCell({
  slot,
  routine,
  showTimeLabel = false,
  hasConflict = false,
  isFirstOfHour = false,
}: TimeSlotCellProps) {
  // Droppable zone for scheduling routines
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot-${slot.date}-${slot.time}`,
    data: {
      type: 'timeslot',
      slot,
    },
  });

  // If there's a routine in this slot, make it draggable
  const { setNodeRef: setDragRef, attributes, listeners, isDragging } = useDraggable({
    id: routine?.id || `empty-${slot.index}`,
    data: {
      type: 'routine',
      routine,
      currentSlot: slot,
    },
    disabled: !routine,
  });

  // Merge refs if routine exists
  const setRefs = (element: HTMLDivElement | null) => {
    setDropRef(element);
    if (routine) setDragRef(element);
  };

  return (
    <div
      ref={setRefs}
      className={`
        relative border-b border-r border-white/10
        ${isFirstOfHour ? 'border-t-2 border-t-white/30' : ''}
        ${isOver ? 'bg-purple-500/20 ring-2 ring-purple-500' : 'bg-black/20'}
        ${hasConflict ? 'bg-red-500/10 border-red-500/30' : ''}
        ${isDragging ? 'opacity-50' : ''}
        transition-all duration-150
        min-h-[40px]
      `}
      {...(routine ? { ...attributes, ...listeners } : {})}
    >
      {/* Time Label */}
      {showTimeLabel && (
        <div className="absolute left-0 top-0 px-2 py-1 text-xs font-medium text-gray-400 bg-black/40 rounded-br">
          {slot.displayTime}
        </div>
      )}

      {/* Routine Card (if scheduled) */}
      {routine && (
        <div className="p-2 cursor-move">
          <div className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 rounded-lg p-2 text-white shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {routine.title}
                </div>
                <div className="text-xs text-white/80 truncate">
                  {routine.studioName} • {routine.categoryName}
                </div>
              </div>
              <div className="text-xs text-white/60 whitespace-nowrap">
                {routine.duration}m
              </div>
            </div>

            {hasConflict && (
              <div className="mt-1 flex items-center gap-1 text-xs text-red-300">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Conflict
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State - Drop Zone Indicator */}
      {!routine && isOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs text-purple-300 font-medium">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
}
