'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScheduleRoutineCardProps {
  item: any;
  entry: any;
  isLocked: boolean;
}

/**
 * Draggable routine card in schedule
 */
export function ScheduleRoutineCard({ item, entry, isLocked }: ScheduleRoutineCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-4 ${
        !isLocked ? 'cursor-move hover:bg-white/15' : 'cursor-not-allowed'
      } transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💃</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded-full">
                  #{item.routine_number || '---'}
                </span>
                <h3 className="text-white font-bold text-lg">{entry.title}</h3>
              </div>
              <p className="text-white/70 text-sm">{entry.studios?.name || 'Unknown Studio'}</p>
            </div>
          </div>

          <div className="flex gap-4 text-sm text-white/60 ml-11">
            <div>
              <span className="text-white/40">Category:</span> {entry.dance_categories?.name || 'N/A'}
            </div>
            <div>
              <span className="text-white/40">Size:</span> {entry.entry_size_categories?.name || 'N/A'}
            </div>
            <div>
              <span className="text-white/40">Age:</span> {entry.age_groups?.name || 'N/A'}
            </div>
            <div>
              <span className="text-white/40">Duration:</span> {item.duration_minutes}min
            </div>
          </div>

          {/* Dancers */}
          <div className="mt-2 ml-11">
            <span className="text-white/40 text-xs">Dancers: </span>
            <span className="text-white/70 text-xs">
              {entry.entry_participants
                ?.map((p: any) => `${p.dancers?.first_name} ${p.dancers?.last_name}`)
                .join(', ') || 'None'}
            </span>
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
