'use client';

/**
 * ScheduleGrid Component
 *
 * Main schedule grid with drag-and-drop zones:
 * - Day sections (Saturday/Sunday)
 * - Session zones (Morning/Afternoon)
 * - Drop targets for routines and blocks
 * - Visual feedback on drag-over
 * - Routine and block count display
 *
 * Created: Session 56 (Frontend Component Extraction - Part 2)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import { useDroppable } from '@dnd-kit/core';
import { RoutineCard, Routine, ViewMode } from './RoutineCard';

export type ScheduleZone = 'saturday-am' | 'saturday-pm' | 'sunday-am' | 'sunday-pm' | 'unscheduled';

export interface ScheduleBlock {
  id: string;
  type: 'award' | 'break';
  title: string;
  duration: number;
  zone: ScheduleZone | null;
}

interface DropZoneProps {
  id: ScheduleZone;
  label: string;
  routines: Routine[];
  blocks: ScheduleBlock[];
  viewMode: ViewMode;
  isDraggingAnything?: boolean;
  onRequestClick?: (routineId: string) => void;
}

function DropZone({
  id,
  label,
  routines,
  blocks,
  viewMode,
  isDraggingAnything = false,
  onRequestClick,
}: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isEmpty = routines.length === 0 && blocks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl p-4 min-h-[200px] transition-all duration-300
        ${isEmpty
          ? `border-2 border-dashed ${isOver ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_24px_rgba(251,191,36,0.3)]' : 'border-white/30 bg-gradient-to-br from-white/5 to-white/2 hover:border-white/50 hover:bg-white/8'}`
          : `border border-white/15 bg-white/5 ${isOver ? 'border-amber-400/50 bg-amber-500/10' : ''}`
        }
      `}
      data-zone={id}
    >
      <h3 className="font-bold text-white mb-3">{label}</h3>
      <div className="space-y-2">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-2 opacity-60">📥</div>
            <p className="text-white/70 text-sm font-medium">
              Drop routines here
            </p>
            <p className="text-white/50 text-xs mt-1">
              {isOver ? 'Release to schedule' : '0 routines'}
            </p>
          </div>
        )}

        {/* Schedule Blocks in Zone */}
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`
              border-2 rounded-lg p-3 mb-2
              ${block.type === 'award'
                ? 'border-yellow-500 bg-yellow-900/40'
                : 'border-gray-500 bg-gray-900/40'}
            `}
            data-block-id={block.id}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{block.type === 'award' ? '🏆' : '☕'}</span>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">{block.title}</div>
                <div className="text-xs text-gray-300">{block.duration} min</div>
              </div>
            </div>
          </div>
        ))}

        {/* Routines in Zone */}
        {routines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            inZone
            viewMode={viewMode}
            isDraggingAnything={isDraggingAnything}
            onRequestClick={onRequestClick}
          />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-purple-500/30">
        <p className="text-xs text-purple-300">
          {routines.length} routine{routines.length !== 1 ? 's' : ''} • {blocks.length} block{blocks.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

// Main ScheduleGrid Component
interface DaySection {
  day: string;
  date: string;
  icon: string;
  gradient: string;
  borderColor: string;
  sessions: {
    id: ScheduleZone;
    label: string;
    routines: Routine[];
    blocks: ScheduleBlock[];
  }[];
}

interface ScheduleGridProps {
  days: DaySection[];
  viewMode: ViewMode;
  isDraggingAnything?: boolean;
  onRequestClick?: (routineId: string) => void;
}

export function ScheduleGrid({
  days,
  viewMode,
  isDraggingAnything = false,
  onRequestClick,
}: ScheduleGridProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
      <h2 className="text-lg font-bold text-white mb-4">Schedule Timeline</h2>

      <div className="space-y-4">
        {days.map((day) => (
          <div
            key={day.day}
            className={`${day.gradient} border ${day.borderColor} rounded-2xl p-5`}
            data-day={day.day.toLowerCase()}
          >
            {/* Day Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-white/10">
              <span className="text-3xl">{day.icon}</span>
              <h3 className="text-xl font-bold text-white">{day.day}</h3>
              <span className="text-sm text-white/70 ml-auto">{day.date}</span>
            </div>

            {/* Session Zones */}
            <div className="grid grid-cols-2 gap-4">
              {day.sessions.map((session) => (
                <DropZone
                  key={session.id}
                  id={session.id}
                  label={session.label}
                  routines={session.routines}
                  blocks={session.blocks}
                  viewMode={viewMode}
                  isDraggingAnything={isDraggingAnything}
                  onRequestClick={onRequestClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
