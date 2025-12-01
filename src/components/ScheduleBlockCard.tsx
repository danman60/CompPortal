'use client';

/**
 * Schedule Block Card Component
 *
 * Draggable blocks for awards and breaks:
 * - Award blocks (🏆) for ceremony timing
 * - Break blocks (☕) for scheduled breaks
 * - Duration display (15/30/45/60 minutes)
 * - Edit and delete actions
 * - Drag-and-drop enabled
 */

import { useDraggable } from '@dnd-kit/core';

interface ScheduleBlockCardProps {
  block: {
    id: string;
    type: 'award' | 'break';
    title: string;
    duration: number; // minutes
    zone?: string | null;
    displayOrder?: number | null;
  };
  inZone?: boolean;
  onEdit?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  isDragging?: boolean;
}

export function ScheduleBlockCard({
  block,
  inZone = false,
  onEdit,
  onDelete,
  isDragging = false,
}: ScheduleBlockCardProps) {
  const { attributes, listeners, setNodeRef, isDragging: isDraggingThis } = useDraggable({
    id: `block-${block.id}`,
    data: {
      type: 'block',
      blockType: block.type,
      blockId: block.id,
    },
  });

  const isAward = block.type === 'award';

  // Styling based on block type
  const blockStyles = isAward
    ? 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border-amber-500/50'
    : 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-cyan-500/50';

  const iconBgStyles = isAward
    ? 'bg-gradient-to-br from-amber-500 to-yellow-600'
    : 'bg-gradient-to-br from-cyan-500 to-blue-600';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Single-click to edit (only when in schedule zone)
        if (inZone && onEdit) {
          e.stopPropagation();
          onEdit(block.id);
        }
      }}
      className={`
        relative rounded-xl p-4 border-2 cursor-grab transition-all
        ${isDraggingThis || isDragging ? 'opacity-50 rotate-2 scale-105' : 'hover:translate-y-[-2px]'}
        ${inZone
          ? 'bg-white/20 border-green-400/50 shadow-lg'
          : `${blockStyles} shadow-md hover:shadow-xl`}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg ${iconBgStyles} flex items-center justify-center flex-shrink-0`}>
          <span className="text-xl">{isAward ? '🏆' : '☕'}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-white text-sm leading-tight">
              {block.title || (isAward ? 'Award Ceremony' : 'Break')}
            </h4>
            {inZone && block.displayOrder && (
              <span className="text-xs px-2 py-1 bg-white/20 rounded text-white font-medium">
                #{block.displayOrder}
              </span>
            )}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-3 h-3 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-purple-300">
              {block.duration} minute{block.duration !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Type Badge */}
          <div className="mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isAward
                ? 'bg-amber-500/30 text-amber-200'
                : 'bg-cyan-500/30 text-cyan-200'
            }`}>
              {isAward ? 'Award Block' : 'Break Block'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions (only show when in zone) */}
      {inZone && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(block.id);
              }}
              className="flex-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-medium transition-colors"
            >
              ✏️ Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this block?')) {
                  onDelete(block.id);
                }
              }}
              className="flex-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition-colors"
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}

      {/* Drag Handle Indicator */}
      {!inZone && (
        <div className="absolute top-2 right-2 opacity-50">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Draggable Block Templates
 * These are the source blocks that can be dragged to the schedule
 */
interface DraggableBlockTemplateProps {
  type: 'award' | 'break';
  onClick: () => void;
}

export function DraggableBlockTemplate({ type, onClick }: DraggableBlockTemplateProps) {
  const isAward = type === 'award';

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border-2 border-dashed transition-all
        ${isAward
          ? 'bg-amber-600/10 border-amber-500/50 hover:bg-amber-600/20 hover:border-amber-500'
          : 'bg-cyan-600/10 border-cyan-500/50 hover:bg-cyan-600/20 hover:border-cyan-500'
        }
        hover:scale-105 active:scale-95
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isAward
            ? 'bg-gradient-to-br from-amber-500 to-yellow-600'
            : 'bg-gradient-to-br from-cyan-500 to-blue-600'
        }`}>
          <span className="text-2xl">{isAward ? '🏆' : '☕'}</span>
        </div>
        <div className="text-left flex-1">
          <div className="font-bold text-white text-sm">
            {isAward ? '+Award Block' : '+Break Block'}
          </div>
          <div className="text-xs text-purple-300 mt-0.5">
            {isAward ? 'Add award ceremony' : 'Add scheduled break'}
          </div>
        </div>
        <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
    </button>
  );
}
