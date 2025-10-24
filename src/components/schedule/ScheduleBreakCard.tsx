'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScheduleBreakCardProps {
  item: any;
  isLocked: boolean;
}

/**
 * Draggable break card (lunch, break, awards) in schedule
 */
export function ScheduleBreakCard({ item, isLocked }: ScheduleBreakCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const breakIcons: Record<string, string> = {
    lunch: '🍽️',
    break: '☕',
    awards: '🏆',
  };

  const breakColors: Record<string, string> = {
    lunch: 'bg-orange-600/20 border-orange-400/30',
    break: 'bg-blue-600/20 border-blue-400/30',
    awards: 'bg-yellow-600/20 border-yellow-400/30',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`backdrop-blur-md rounded-lg border p-4 ${
        breakColors[item.break_type] || 'bg-white/10 border-white/20'
      } ${!isLocked ? 'cursor-move hover:opacity-80' : 'cursor-not-allowed'} transition-all`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{breakIcons[item.break_type] || '⏸️'}</span>
          <div>
            <h3 className="text-white font-bold text-lg">
              {item.break_label || `${item.break_type.charAt(0).toUpperCase()}${item.break_type.slice(1)}`}
            </h3>
            <p className="text-white/60 text-sm">{item.duration_minutes} minutes</p>
          </div>
        </div>

        {!isLocked && (
          <div className="text-white/40 hover:text-white/70 cursor-grab active:cursor-grabbing">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
