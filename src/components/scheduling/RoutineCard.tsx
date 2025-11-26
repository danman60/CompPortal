'use client';

/**
 * RoutineCard Component
 *
 * Draggable routine card for scheduling interface:
 * - Displays routine details (title, studio, classification, duration)
 * - Studio display adapts to view mode (CD/Judge/Studio/Public)
 * - Color-coded classification badges
 * - Drag-and-drop enabled
 * - Optional request button for Studio Directors
 *
 * Created: Session 56 (Frontend Component Extraction - Part 2)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import { useDraggable } from '@dnd-kit/core';

export type ViewMode = 'cd' | 'studio' | 'judge' | 'public';

export interface Routine {
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
  routineAge: number | null; // Final selected age for routine
  participants: Array<{
    dancerId: string;
    dancerName: string;
    dancerAge: number | null;
  }>;
  isScheduled: boolean;
  scheduleZone: string | null;
  scheduledTime?: Date | null;
  scheduledDay?: Date | null;
  scheduledDateString?: string | null; // YYYY-MM-DD format from backend
  scheduledTimeString?: string | null; // HH:MM:SS format from backend
  entryNumber?: number | null;
  has_studio_requests?: boolean | null; // SD notes flag for blue glow
  scheduling_notes?: string | null; // SD notes text for tooltip
}

interface RoutineCardProps {
  routine: Routine;
  viewMode: ViewMode;
  inZone?: boolean; // Is routine scheduled in a zone?
  isDraggingAnything?: boolean; // Is any item being dragged?
  onRequestClick?: (routineId: string) => void; // Studio request callback
  onNoteClick?: (routineId: string, routineTitle: string) => void; // CD note callback
  // Visual indicators (Session 58)
  hasConflict?: boolean; // Red badge if routine has scheduling conflicts
  conflictSeverity?: 'critical' | 'error' | 'warning'; // Conflict severity level
  hasNotes?: boolean; // Blue dot if CD notes or studio requests exist
  hasAgeChange?: boolean; // Yellow background if age group changed
  isLastRoutine?: boolean; // Gold border if last routine in category (trophy helper)
  // Bulk selection (Session 63)
  isSelected?: boolean;
  onToggleSelection?: (routineId: string, shiftKey: boolean) => void;
}

export function RoutineCard({
  routine,
  viewMode,
  inZone = false,
  isDraggingAnything = false,
  onRequestClick,
  onNoteClick,
  hasConflict = false,
  conflictSeverity = 'warning',
  hasNotes = false,
  hasAgeChange = false,
  isLastRoutine = false,
  isSelected = false,
  onToggleSelection,
}: RoutineCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: routine.id,
  });

  // Determine studio display based on view mode
  const getStudioDisplay = () => {
    switch (viewMode) {
      case 'cd':
        return `${routine.studioCode} (${routine.studioName})`;
      case 'studio':
        return routine.studioName; // Full name only
      case 'judge':
        return routine.studioCode; // Code only, no prefix
      case 'public':
        return routine.studioName; // Full names revealed
      default:
        return routine.studioCode;
    }
  };

  // Classification color mapping
  const getClassificationColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('emerald')) return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
    if (lower.includes('sapphire')) return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
    if (lower.includes('crystal')) return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
    if (lower.includes('titanium')) return 'bg-slate-400/20 border-slate-400/40 text-slate-300';
    if (lower.includes('production')) return 'bg-purple-500/20 border-purple-500/40 text-purple-300';
    return 'bg-gray-500/20 border-gray-500/40 text-gray-300';
  };

  // Get border styling based on indicators
  const getBorderStyle = () => {
    // Priority: Last Routine > Conflict > Age Change > Default
    if (isLastRoutine) return 'border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]'; // Gold border for trophy helper
    if (hasConflict) {
      if (conflictSeverity === 'critical') return 'border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]';
      if (conflictSeverity === 'error') return 'border-2 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]';
      return 'border-2 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.3)]';
    }
    if (hasAgeChange) return 'border-2 border-yellow-400/70';
    if (inZone) return 'border-2 border-green-400/50';
    return 'border border-white/25';
  };

  // Get background styling
  const getBackgroundStyle = () => {
    if (hasAgeChange) return 'bg-yellow-900/30'; // Yellow background for age changes
    if (inZone) return 'bg-white/15';
    return 'bg-white/15';
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        relative rounded-xl p-4 pt-10 cursor-grab transition-all
        ${isDragging ? 'opacity-50 rotate-3 scale-105' : 'hover:translate-y-[-4px]'}
        ${getBackgroundStyle()}
        ${getBorderStyle()}
        shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)]
      `}
      data-routine-id={routine.id}
      data-in-zone={inZone}
      data-has-conflict={hasConflict}
      data-has-notes={hasNotes}
      data-has-age-change={hasAgeChange}
      data-is-last-routine={isLastRoutine}
    >
      {/* Selection Checkbox (Top Left) */}
      {onToggleSelection && (
        <div className="absolute top-2 left-2" style={{ pointerEvents: 'auto', zIndex: 10 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(routine.id, (e.nativeEvent as MouseEvent).shiftKey);
            }}
            className="w-5 h-5 rounded border-2 border-white/40 bg-white/10 checked:bg-purple-600 checked:border-purple-600 cursor-pointer hover:border-white/60 transition-colors"
            title={isSelected ? "Deselect routine" : "Select routine (Shift+click for range)"}
          />
        </div>
      )}

      {/* Indicator Badges (Top Left Corner, offset if checkbox present) */}
      <div className={`absolute top-2 flex gap-1 ${onToggleSelection ? 'left-9' : 'left-2'} ${onToggleSelection ? 'max-w-[calc(100%-160px)]' : 'max-w-[calc(100%-120px)]'}`} style={{ pointerEvents: isDraggingAnything ? 'none' : 'auto', zIndex: 8 }}>
        {/* Trophy Icon for Last Routine */}
        {isLastRoutine && (
          <div
            className="bg-yellow-500/90 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg"
            title="Last routine in category - Award ceremony recommended after this"
          >
            🏆
          </div>
        )}

        {/* Conflict Badge */}
        {hasConflict && (
          <div
            className={`px-2 py-1 rounded-md text-xs font-bold shadow-lg ${
              conflictSeverity === 'critical'
                ? 'bg-red-600/90 text-white'
                : conflictSeverity === 'error'
                ? 'bg-orange-600/90 text-white'
                : 'bg-yellow-600/90 text-white'
            }`}
            title={`Scheduling conflict: ${conflictSeverity}`}
          >
            ⚠️
          </div>
        )}

        {/* Age Change Badge */}
        {hasAgeChange && (
          <div
            className="bg-yellow-600/90 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg"
            title="Age group changed since scheduling started"
          >
            🎂
          </div>
        )}

        {/* Notes Badge (Blue Dot) */}
        {hasNotes && (
          <div
            className="bg-blue-500/90 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg"
            title="Has notes or studio requests"
          >
            📝
          </div>
        )}
      </div>
      {/* Title + Studio Badge Row */}
      <div className="flex items-start justify-between mb-2" style={{ pointerEvents: isDraggingAnything ? 'none' : 'auto' }}>
        <h3 className="text-lg font-semibold text-white leading-tight flex-1 pr-2">
          🎭 {routine.title}
        </h3>
        <span className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm px-3 py-1 rounded-lg shadow-md">
          {getStudioDisplay().split(' ')[0]}
        </span>
      </div>

      {/* Duration Tag (top right corner) */}
      <div className="absolute top-2 right-2 bg-black/30 px-2 py-1 rounded-md text-xs text-white/90" style={{ pointerEvents: isDraggingAnything ? 'none' : 'auto', zIndex: 9 }}>
        ⏱️ {routine.duration} min
      </div>

      {/* Classification Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium mb-2 ${getClassificationColor(routine.classificationName)}`} style={{ pointerEvents: isDraggingAnything ? 'none' : 'auto' }}>
        🔷 {routine.classificationName} • {routine.categoryName}
      </div>

      {/* Age Group + Size */}
      <div className="flex gap-2 text-sm text-white/80" style={{ pointerEvents: isDraggingAnything ? 'none' : 'auto' }}>
        <span>👥 {routine.ageGroupName}</span>
        <span>•</span>
        <span>{routine.entrySizeName}</span>
      </div>

      {/* Studio Request Button (for Studio Directors) */}
      {viewMode === 'studio' && onRequestClick && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag from triggering
            onRequestClick(routine.id);
          }}
          className="mt-3 w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
          data-action="add-request"
        >
          📝 Add Request
        </button>
      )}

      {/* CD Note Button (for Competition Directors) */}
      {viewMode === 'cd' && onNoteClick && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag from triggering
            onNoteClick(routine.id, routine.title);
          }}
          className="mt-3 w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors font-medium"
          data-action="add-note"
        >
          📝 {hasNotes ? 'View/Add Note' : 'Add Private Note'}
        </button>
      )}
    </div>
  );
}
