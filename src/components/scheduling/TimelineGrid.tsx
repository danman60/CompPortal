'use client';

/**
 * TimelineGrid Component
 *
 * Visual timeline grid for scheduling routines at specific times
 * - Displays time slots in 5-minute increments
 * - Shows scheduled routines in their time slots
 * - Drag-and-drop support for scheduling
 * - Horizontal scrolling for long sessions
 *
 * Created: Session 59 (Timeline Grid Phase 2)
 */

import { TimeSlotCell } from './TimeSlotCell';

interface TimeSlot {
  date: string;
  time: string;
  displayTime: string;
  index: number;
  available: boolean;
  routineId?: string;
  blockId?: string;
}

interface Session {
  id: string;
  sessionName: string;
  sessionDate: Date;
  startTime: Date;
  endTime: Date | null;
  timeSlots: TimeSlot[];
}

interface Routine {
  id: string;
  title: string;
  studioName: string;
  studioCode: string;
  categoryName: string;
  classificationName: string;
  ageGroupName: string;
  duration: number;
  performanceDate: Date | null;
  performanceTime: string | null;
}

interface TimelineGridProps {
  session: Session;
  routines: Routine[];
  conflicts?: Array<{ routineId: string; severity: string }>;
  onRoutineScheduled?: (routineId: string, slot: TimeSlot) => void;
}

export function TimelineGrid({
  session,
  routines,
  conflicts = [],
  onRoutineScheduled,
}: TimelineGridProps) {
  // Group routines by their scheduled time
  const routinesBySlot = new Map<string, Routine>();

  routines.forEach(routine => {
    if (routine.performanceTime) {
      const slotKey = `${routine.performanceDate?.toISOString().split('T')[0]}-${routine.performanceTime}`;
      routinesBySlot.set(slotKey, routine);
    }
  });

  // Check if a routine has conflicts
  const hasConflict = (routineId: string) => {
    return conflicts.some(c => c.routineId === routineId);
  };

  // Group time slots by hour for better labeling
  const slotsByHour = session.timeSlots.reduce((acc, slot) => {
    const hour = slot.time.substring(0, 2);
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {session.sessionName}
            </h3>
            <p className="text-sm text-gray-300">
              {session.sessionDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-300">
              {session.startTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })}
              {' - '}
              {session.endTime?.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
            <div className="text-xs text-gray-400">
              {session.timeSlots.length} time slots
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <div className="min-w-full">
          {/* Hour Groups */}
          {Object.entries(slotsByHour).map(([hour, slots]) => (
            <div key={hour} className="border-b border-white/10 last:border-b-0">
              {/* Hour Header */}
              <div className="sticky left-0 bg-gray-800/90 px-3 py-2 border-r border-white/10">
                <div className="text-sm font-semibold text-gray-300">
                  {slots[0].displayTime.split(':')[0] + ' ' + slots[0].displayTime.split(' ')[1]}
                </div>
              </div>

              {/* Time Slot Cells */}
              <div className="grid grid-cols-1">
                {slots.map((slot, slotIndex) => {
                  const slotKey = `${slot.date}-${slot.time}`;
                  const routine = routinesBySlot.get(slotKey);
                  const isFirstOfHour = slotIndex === 0;
                  const showLabel = slotIndex % 3 === 0; // Show label every 15 minutes

                  return (
                    <TimeSlotCell
                      key={slotKey}
                      slot={slot}
                      routine={routine}
                      showTimeLabel={showLabel}
                      hasConflict={routine ? hasConflict(routine.id) : false}
                      isFirstOfHour={isFirstOfHour}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {session.timeSlots.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-sm">
                No time slots available for this session
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-black/20 border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            <span className="text-white font-medium">
              {routines.filter(r => r.performanceTime).length}
            </span>
            {' / '}
            {routines.length} routines scheduled
          </div>
          <div className="flex items-center gap-4">
            {conflicts.length > 0 && (
              <div className="text-red-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
              </div>
            )}
            <div className="text-gray-400">
              {session.timeSlots.filter(s => !s.routineId && !s.blockId).length} slots available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
