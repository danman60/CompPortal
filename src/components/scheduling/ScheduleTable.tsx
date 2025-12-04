'use client';

/**
 * Schedule V4 Redesign - ScheduleTable Component
 *
 * Single chronological table displaying all scheduled routines for a specific day.
 * 7-column layout: # | Time | Routine | Studio | Classification | Category | Dancers
 *
 * Features:
 * - Chronological ordering by entry_number
 * - Auto-calculated time display (not editable)
 * - Trophy Helper inline (gold border + 🏆 for last routine per Overalls)
 * - Conflict detection (red box spanning multiple rows)
 * - Drag-and-drop support via DnD Kit
 * - ViewMode filtering (CD/Studio/Judge/Public)
 * - Dancer names display (first 2 names + "+X more" if needed)
 */

import { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ViewMode } from '@/components/ScheduleToolbar';

interface ScheduleTableProps {
  routines: Routine[];
  allRoutines?: Array<{
    id: string;
    entrySizeName: string;
    ageGroupName: string;
    classificationName: string;
    isScheduled: boolean;
  }>;
  selectedDate: string; // ISO date
  viewMode: ViewMode;
  conflicts: Conflict[];
  conflictsByRoutineId?: Map<string, Array<{
    dancerId: string;
    dancerName: string;
    routine1Id: string;
    routine1Number: number;
    routine1Title: string;
    routine2Id: string;
    routine2Number: number;
    routine2Title: string;
    routinesBetween: number;
    severity: 'critical' | 'error' | 'warning';
    message: string;
  }>>;
  onRoutineClick?: (routineId: string) => void;
  selectedRoutineIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onAutoFixConflict?: (routineId: string) => void;
  scheduleBlocks?: Array<{
    id: string;
    block_type: string;
    title: string;
    duration_minutes: number;
    scheduled_time: Date | null;
    sort_order: number | null;
  }>;
  onDeleteBlock?: (blockId: string) => void;
  onEditBlock?: (block: { id: string; block_type: string; title: string; duration_minutes: number; scheduled_time: Date | null; routineNumberBefore?: number }) => void;
}

interface Routine {
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
  participants: Array<{
    dancerId: string;
    dancerName: string;
  }>;
  entryNumber?: number;
  scheduledTime?: Date | null;
  scheduledDay?: Date | null;
  scheduledDateString?: string | null; // YYYY-MM-DD format from backend
  scheduledTimeString?: string | null; // HH:MM:SS format from backend
  routineAge?: number | null;
  has_studio_requests?: boolean | null; // SD notes flag for blue glow
  scheduling_notes?: string | null; // SD notes text for tooltip
  dancer_names?: string[] | null; // Array of dancer names in this routine
}

interface Conflict {
  id: string;
  dancerId: string;
  dancerName: string;
  routine1Id: string;
  routine2Id: string;
  routinesBetween: number;
  severity: 'critical' | 'error' | 'warning';
  message: string;
}

interface OverallsCategory {
  groupSize: string;
  ageGroup: string;
  classification: string;
}

// Eligible award category (from trophy helper)
interface EligibleAward {
  entrySize: string;
  ageGroup: string;
  classification: string;
}

// Helper: Format duration in hours and minutes
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Schedule Block Row Component (Sortable)
function SortableBlockRow({
  block,
  showCheckbox,
  onDelete,
  onEdit,
  calculatedTime,
  sessionDurationMinutes,
  sessionNumber,
  sessionColor,
  routineNumberBefore,
  eligibleAwards,
}: {
  block: {
    id: string;
    block_type: string;
    title: string;
    duration_minutes: number;
    scheduled_time: Date | null;
  };
  showCheckbox?: boolean;
  onDelete?: (blockId: string) => void;
  onEdit?: (block: { id: string; block_type: string; title: string; duration_minutes: number; scheduled_time: Date | null; routineNumberBefore?: number }) => void;
  calculatedTime?: string | null; // Dynamically calculated time from schedule position
  sessionDurationMinutes?: number; // Duration of session ending at this award block
  sessionNumber?: number; // Session number for this block
  sessionColor?: string; // Background color for this session
  routineNumberBefore?: number; // Entry number of routine this block is positioned after
  eligibleAwards?: EligibleAward[]; // Award categories with last routine in this session
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `block-${block.id}`, // Prefix to avoid ID collision with routines
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Use session color for background, with block-type accent
  const bgColor = block.block_type === 'award'
    ? `${sessionColor || 'bg-purple-500/8'} border-l-4 border-l-amber-500`
    : `${sessionColor || 'bg-blue-500/8'} border-l-4 border-l-cyan-500`;

  const icon = block.block_type === 'award' ? '🏆' : '☕';
  const borderColor = block.block_type === 'award' ? 'border-amber-500/50' : 'border-cyan-500/50';

  // Use calculated time if available, otherwise fall back to static scheduled_time
  const displayTime = calculatedTime || (block.scheduled_time
    ? (() => {
        const date = new Date(block.scheduled_time);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
      })()
    : 'TBD');

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only trigger edit on row/cell click, not button clicks
        const target = e.target as HTMLElement;
        const isButton = target.tagName === 'BUTTON' || target.closest('button');
        if (!isDragging && onEdit && !isButton) {
          onEdit({ ...block, routineNumberBefore });
        }
      }}
      className={`border-b-2 ${borderColor} ${bgColor} ${onEdit ? 'cursor-pointer' : 'cursor-move'} hover:bg-white/5 transition-colors`}
      data-block-id={block.id}
    >
      {showCheckbox && <td className="px-0.5 py-1" style={{ width: '18px' }}></td>}
      <td className="px-0 py-1" style={{ width: '36px' }}></td>
      <td className="px-0.5 py-1 text-[13px] font-mono font-bold text-white" style={{ width: '22px' }}>
        {icon}
      </td>
      <td className="px-0.5 py-1 font-mono text-white/90" style={{ width: '36px' }}>
        <div className="flex items-baseline gap-0.5">
          <span className="font-semibold text-[13px]">{displayTime}</span>
        </div>
      </td>
      <td colSpan={5} className="px-1 py-1">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-sm font-semibold text-white">{block.title}</span>
            <span className="text-xs text-white/60 ml-2">({block.duration_minutes} min)</span>
            {/* Session Duration Indicator for Award Blocks */}
            {block.block_type === 'award' && sessionDurationMinutes !== undefined && sessionNumber !== undefined && (
              <div className="ml-4 flex items-center gap-2">
                <div className="h-4 w-px bg-white/30" />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                  <span className="text-[10px] font-bold text-amber-300">SESSION {sessionNumber}</span>
                  <span className="text-[10px] text-amber-200/80">•</span>
                  <span className="text-[10px] font-semibold text-amber-200">{formatDuration(sessionDurationMinutes)}</span>
                </div>
              </div>
            )}
            {/* Eligible Awards from Trophy Helper (categories with last routine in this session) */}
            {block.block_type === 'award' && eligibleAwards && eligibleAwards.length > 0 && (
              <div className="ml-4 flex items-center gap-2 flex-wrap">
                <div className="h-4 w-px bg-white/30" />
                <span className="text-[10px] text-amber-300/70">Eligible:</span>
                {eligibleAwards.slice(0, 5).map((award, idx) => (
                  <div
                    key={`${award.entrySize}-${award.ageGroup}-${award.classification}-${idx}`}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30"
                    title={`🏆 ${award.entrySize} • ${award.ageGroup} • ${award.classification}`}
                  >
                    <span className="text-[10px]">🏆</span>
                    <span className="text-[9px] font-medium text-yellow-200">{award.entrySize}</span>
                    <span className="text-[9px] text-yellow-300/60">•</span>
                    <span className="text-[9px] text-yellow-200/80">{award.ageGroup}</span>
                  </div>
                ))}
                {eligibleAwards.length > 5 && (
                  <span className="text-[9px] text-amber-300/60">+{eligibleAwards.length - 5} more</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit({ ...block, routineNumberBefore });
                }}
                className="px-2 py-1 text-xs font-bold text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 rounded transition-colors"
                title="Edit block"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(block.id);
                }}
                className="px-2 py-1 text-xs font-bold text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded transition-colors"
                title="Delete block"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// Sortable Row Component
function SortableRoutineRow({
  routine,
  index,
  isLastInOveralls,
  conflict,
  isFirstInConflict,
  conflictSpan,
  performanceTime,
  classificationColor,
  studioDisplay,
  viewMode,
  sessionNumber,
  isLastInSession,
  sessionColor,
  onRoutineClick,
  isSelected,
  onCheckboxChange,
  showCheckbox,
  dismissedIcons,
  onDismissIcon,
  onAutoFixConflict,
  hoveredConflict,
  setHoveredConflict,
  scheduledRoutines,
  conflicts,
}: {
  routine: Routine;
  index: number;
  isLastInOveralls: boolean;
  conflict: { routineIds: string[]; conflict: Conflict } | undefined;
  isFirstInConflict: boolean;
  conflictSpan: number;
  performanceTime: { time: string; period: string };
  classificationColor: string;
  studioDisplay: string;
  viewMode: ViewMode;
  sessionNumber: number;
  isLastInSession: boolean;
  sessionColor: string;
  onRoutineClick?: (routineId: string) => void;
  isSelected?: boolean;
  onCheckboxChange?: (routineId: string, index: number, event: React.MouseEvent) => void;
  showCheckbox?: boolean;
  dismissedIcons: Set<string>;
  onDismissIcon: (key: string) => void;
  onAutoFixConflict?: (routineId: string) => void;
  hoveredConflict: string | null;
  setHoveredConflict: (id: string | null) => void;
  scheduledRoutines: Routine[];
  conflicts?: Array<{
    dancerId: string;
    dancerName: string;
    routine1Id: string;
    routine1Number: number;
    routine1Title: string;
    routine2Id: string;
    routine2Number: number;
    routine2Title: string;
    routinesBetween: number;
    severity: 'critical' | 'error' | 'warning';
    message: string;
  }>;
}) {
  const conflictBadgeRef = useRef<HTMLButtonElement>(null);
  const [badgePosition, setBadgePosition] = useState<{ top: number; left: number } | null>(null);
  const conflictHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `routine-${routine.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Session background color (passed from parent based on award block delineation)
  const sessionBg = sessionColor || (sessionNumber % 2 === 0 ? 'bg-purple-500/5' : 'bg-blue-500/5');

  // Helper icon detection (using dynamic conflicts)
  const hasConflict = conflicts && conflicts.length > 0;
  const conflictSeverity = conflicts?.[0]?.severity || 'warning';
  const hasTrophy = isLastInOveralls;
  const hasSDRequest = !!(routine.has_studio_requests ?? false);

  // Generate detailed conflict tooltip from dynamic data
  const getConflictTooltip = () => {
    if (!conflicts || conflicts.length === 0) return '';

    const conflict = conflicts[0]; // Show first conflict
    const isRoutine1 = conflict.routine1Id === routine.id;
    const conflictingRoutineId = isRoutine1 ? conflict.routine2Id : conflict.routine1Id;
    const conflictingRoutineTitle = isRoutine1 ? conflict.routine2Title : conflict.routine1Title;

    // Get current entry number from scheduled routines (UI state)
    const conflictingRoutine = scheduledRoutines.find(r => r.id === conflictingRoutineId);
    const conflictingRoutineNumber = conflictingRoutine?.entryNumber ||
      (isRoutine1 ? conflict.routine2Number : conflict.routine1Number);

    let tooltip = `⚠️ Conflict: ${conflict.dancerName}`;
    tooltip += `\n${conflict.routinesBetween} routine${conflict.routinesBetween !== 1 ? 's' : ''} between performances`;
    tooltip += `\n(need 6+ for costume changes)`;
    tooltip += `\n\nConflicts with:`;
    tooltip += `\n• #${conflictingRoutineNumber} ${conflictingRoutineTitle}`;

    if (routine.dancer_names && routine.dancer_names.length > 0) {
      tooltip += `\n\nDancers in this routine:`;
      tooltip += `\n${routine.dancer_names.join(', ')}`;
    }

    if (conflicts.length > 1) {
      tooltip += `\n\n+${conflicts.length - 1} more conflict${conflicts.length - 1 !== 1 ? 's' : ''}`;
    }

    return tooltip;
  };

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          border-b border-white/10 hover:bg-white/5 transition-colors cursor-move relative
          ${sessionBg}
        `}
        onClick={() => onRoutineClick?.(routine.id)}
      >
      {/* Checkbox - 18px */}
      {showCheckbox && (
        <td className="px-0.5 py-1 text-center" style={{ width: '18px' }}>
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCheckboxChange?.(routine.id, index, e);
            }}
            className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-purple-600 cursor-pointer"
          />
        </td>
      )}

      {/* Landscape Badges - 36px (widened for larger badges) */}
      <td className="px-0 py-1" style={{ width: '36px', minHeight: '40px' }}>
        <div className="flex flex-row gap-0.5 items-center justify-center min-h-[40px]">
          {hasTrophy && !dismissedIcons.has(`${routine.id}-trophy`) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissIcon(`${routine.id}-trophy`);
              }}
              title={`🏆 Last Routine of ${routine.entrySizeName} • ${routine.ageGroupName} • ${routine.classificationName} - Ready for awards!`}
              className="inline-flex items-center justify-center w-8 h-6 rounded text-sm transition-transform hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                border: '1px solid rgba(255, 215, 0, 0.6)'
              }}
            >
              <span className="text-sm">🏆</span>
            </button>
          )}
          {hasSDRequest && !dismissedIcons.has(`${routine.id}-note`) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissIcon(`${routine.id}-note`);
              }}
              title={`📋 ${routine.scheduling_notes || 'Studio Director requested changes'}`}
              className="inline-flex items-center justify-center w-8 h-6 rounded text-sm transition-transform hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #4FC3F7, #2196F3)',
                border: '1px solid rgba(33, 150, 243, 0.6)'
              }}
            >
              <span className="text-sm">📋</span>
            </button>
          )}
          {hasConflict && !dismissedIcons.has(`${routine.id}-conflict`) && (
            <button
              ref={conflictBadgeRef}
              className="inline-flex items-center justify-center w-8 h-6 rounded text-sm transition-transform hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B, #EE5A6F)',
                border: '1px solid rgba(255, 107, 107, 0.6)'
              }}
              onMouseEnter={() => {
                // Clear any pending hide timeout
                if (conflictHideTimeoutRef.current) {
                  clearTimeout(conflictHideTimeoutRef.current);
                  conflictHideTimeoutRef.current = null;
                }
                if (conflictBadgeRef.current) {
                  const rect = conflictBadgeRef.current.getBoundingClientRect();
                  setBadgePosition({ top: rect.top, left: rect.left + rect.width + 8 });
                }
                setHoveredConflict(routine.id);
              }}
              onMouseLeave={() => {
                // Delay hiding to allow user to move mouse to popup
                conflictHideTimeoutRef.current = setTimeout(() => {
                  setHoveredConflict(null);
                  setBadgePosition(null);
                }, 200); // 200ms delay
              }}
              title={hoveredConflict === routine.id ? '' : getConflictTooltip()}
            >
              <span className="text-sm">⚠️</span>

              {/* Hover popup - shows conflict details + action buttons */}
              {hoveredConflict === routine.id && conflicts && conflicts.length > 0 && badgePosition && typeof window !== 'undefined' && createPortal(
                <div
                  className="flex flex-col gap-2 text-white rounded-md px-3 py-2 shadow-2xl"
                  style={{
                    position: 'fixed',
                    zIndex: 999999,
                    left: `${badgePosition.left}px`,
                    top: `${badgePosition.top}px`,
                    transform: 'translateY(-50%)',
                    background: 'linear-gradient(135deg, #FF6B6B, #EE5A6F)',
                    border: '2px solid rgba(255, 107, 107, 0.9)',
                    minWidth: '280px',
                    maxWidth: '400px'
                  }}
                  onMouseEnter={() => {
                    // Clear hide timeout when hovering popup
                    if (conflictHideTimeoutRef.current) {
                      clearTimeout(conflictHideTimeoutRef.current);
                      conflictHideTimeoutRef.current = null;
                    }
                  }}
                  onMouseLeave={() => {
                    // Hide immediately when leaving popup
                    setHoveredConflict(null);
                    setBadgePosition(null);
                  }}
                >
                  {/* Conflict Details */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {(() => {
                      const conflict = conflicts[0];
                      const isRoutine1 = conflict.routine1Id === routine.id;
                      const conflictingRoutineId = isRoutine1 ? conflict.routine2Id : conflict.routine1Id;
                      const conflictingRoutineTitle = isRoutine1 ? conflict.routine2Title : conflict.routine1Title;

                      // Get current entry number from scheduled routines (UI state)
                      const conflictingRoutine = scheduledRoutines.find(r => r.id === conflictingRoutineId);
                      const conflictingRoutineNumber = conflictingRoutine?.entryNumber ||
                        (isRoutine1 ? conflict.routine2Number : conflict.routine1Number);

                      return (
                        <>
                          <div className="font-bold mb-1">⚠️ Conflict: {conflict.dancerName}</div>
                          <div className="text-xs opacity-90">
                            {conflict.routinesBetween} routine{conflict.routinesBetween !== 1 ? 's' : ''} between performances
                          </div>
                          <div className="text-xs opacity-90 mb-2">(need 6+ for costume changes)</div>

                          <div className="text-xs font-semibold mb-1">Conflicts with:</div>
                          <div className="text-xs opacity-90 mb-2">• #{conflictingRoutineNumber} {conflictingRoutineTitle}</div>

                          {routine.dancer_names && routine.dancer_names.length > 0 && (
                            <>
                              <div className="text-xs font-semibold mb-1">Dancers in this routine:</div>
                              <div className="text-xs opacity-90">{routine.dancer_names.join(', ')}</div>
                            </>
                          )}

                          {conflicts.length > 1 && (
                            <div className="text-xs opacity-75 mt-2">
                              +{conflicts.length - 1} more conflict{conflicts.length - 1 !== 1 ? 's' : ''}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAutoFixConflict?.(routine.id);
                      }}
                      className="flex items-center gap-1 hover:scale-110 transition-transform px-2 py-1 rounded hover:bg-white/20 text-sm"
                      title="Auto-fix: Move routine to nearest conflict-free position"
                    >
                      <span className="text-sm">🔧</span>
                      <span className="text-sm font-semibold">Fix</span>
                    </button>
                    <div className="w-px h-4 bg-white/40" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissIcon(`${routine.id}-conflict`);
                      }}
                      className="text-base hover:scale-110 transition-transform px-2 py-1 rounded hover:bg-white/20"
                      title="Dismiss warning (conflict remains)"
                    >
                      ✕
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </button>
          )}
        </div>
      </td>

      {/* Entry Number - 22px */}
      <td className="px-0.5 py-1 text-[13px] font-mono font-bold text-white whitespace-nowrap" style={{ width: '22px' }}>
        #{routine.entryNumber || '?'}
      </td>

      {/* Time - 36px (compact with split AM/PM, larger font) */}
      <td className="px-0.5 py-1 font-mono text-white/90 whitespace-nowrap" style={{ width: '36px' }}>
        <div className="flex items-baseline gap-0.5">
          <span className="font-semibold text-[13px]">{performanceTime.time}</span>
          {performanceTime.period && (
            <span className="text-[10px] opacity-70">{performanceTime.period}</span>
          )}
        </div>
      </td>

      {/* Routine Title - 75px */}
      <td className="px-1 py-1 text-xs font-medium text-white relative" style={{ width: '75px' }}>
        <div className="truncate-cell">
          <span className="truncate" title={routine.title}>{routine.title}</span>
        </div>
      </td>

      {/* Studio - 35px */}
      <td className="px-1 py-1 text-xs text-white/80 text-center" style={{ width: '35px' }}>
        {studioDisplay}
      </td>

      {/* Classification - 80px */}
      <td className="px-1 py-1" style={{ width: '80px' }}>
        <span
          className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold truncate ${classificationColor}`}
        >
          {routine.classificationName}
        </span>
      </td>

      {/* Size - 65px */}
      <td className="px-1 py-1 text-xs text-white/80" style={{ width: '65px' }}>
        <div className="truncate-cell">{routine.entrySizeName}</div>
      </td>

      {/* Routine Age - 40px */}
      <td className="px-1 py-1 text-xs text-white/80 text-center" style={{ width: '40px' }}>
        {routine.routineAge ?? '-'}
      </td>

      {/* Duration - 60px */}
      <td className="px-1 py-1 text-xs text-white/80 text-center whitespace-nowrap" style={{ width: '60px' }}>
        {routine.duration}m
      </td>

      {/* Conflict indicator */}
      {conflict && isFirstInConflict && (
        <td
          className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"
          style={{
            height: `calc(${conflictSpan} * 100%)`,
          }}
        >
          <div className="absolute left-2 top-2 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-lg whitespace-nowrap z-10">
            ⚠️ {conflict.conflict.dancerName}: {conflict.conflict.routinesBetween} routines between (need 6 min)
          </div>
        </td>
      )}
    </tr>

      {/* Session Separator */}
      {isLastInSession && (
        <tr className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20">
          <td colSpan={7} className="px-1 py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-xs font-bold text-purple-300">
                End of Session {sessionNumber}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ScheduleTable({
  routines,
  allRoutines = [],
  selectedDate,
  viewMode,
  conflicts,
  conflictsByRoutineId,
  onRoutineClick,
  selectedRoutineIds = new Set(),
  onSelectionChange,
  onAutoFixConflict,
  scheduleBlocks = [],
  onDeleteBlock,
  onEditBlock,
}: ScheduleTableProps) {
  const lastClickedIndexRef = useRef<number | null>(null);
  const [dismissedIcons, setDismissedIcons] = useState<Set<string>>(new Set());
  const [hoveredConflict, setHoveredConflict] = useState<string | null>(null);

  // Sort routines by entry_number
  const sortedRoutines = useMemo(() => {
    return [...routines].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
  }, [routines]);

  // Sort blocks by sort_order (CRITICAL for SortableContext) - NOT scheduled_time which becomes stale
  const sortedBlocks = useMemo(() => {
    return [...scheduleBlocks]
      .filter(b => b.scheduled_time)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)); // Fix: Use sort_order, not scheduled_time
  }, [scheduleBlocks]);

  // Combine routines and blocks into chronological order
  const scheduleItems = useMemo(() => {
    const items: Array<{ type: 'routine' | 'block'; data: any; time: number }> = [];

    // Add routines with their scheduled times
    sortedRoutines.forEach((routine) => {
      if (routine.scheduledTimeString) {
        const [hours, minutes] = routine.scheduledTimeString.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        items.push({
          type: 'routine',
          data: routine,
          time: timeInMinutes,
        });
      }
    });

    // Add blocks with their scheduled times
    sortedBlocks.forEach(block => {
      if (block.scheduled_time) {
        const schedTime = new Date(block.scheduled_time);
        const timeInMinutes = schedTime.getHours() * 60 + schedTime.getMinutes();
        items.push({
          type: 'block',
          data: block,
          time: timeInMinutes,
        });
      }
    });

    // Sort by time (chronological order)
    return items.sort((a, b) => a.time - b.time);
  }, [sortedRoutines, sortedBlocks]);

  // Handle checkbox change with shift-click support
  const handleCheckboxChange = (routineId: string, index: number, event: React.MouseEvent) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedRoutineIds);

    // Shift-click: select range
    if (event.shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);

      // Add all routines in range
      for (let i = start; i <= end; i++) {
        newSelection.add(sortedRoutines[i].id);
      }
    } else {
      // Normal click: toggle single routine
      if (newSelection.has(routineId)) {
        newSelection.delete(routineId);
      } else {
        newSelection.add(routineId);
      }
    }

    lastClickedIndexRef.current = index;
    onSelectionChange(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedRoutineIds.size === sortedRoutines.length) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      onSelectionChange(new Set(sortedRoutines.map(r => r.id)));
    }
  };

  // Calculate routines to show trophy helper (when ≤5 unscheduled remain in category)
  const lastRoutineIds = useMemo(() => {
    // Count total and scheduled per category
    const categoryCounts = new Map<string, { total: number; scheduled: number; lastRoutineId: string }>();

    // Count all routines (scheduled + unscheduled) per category
    allRoutines.forEach(routine => {
      const key = `${routine.entrySizeName}|${routine.ageGroupName}|${routine.classificationName}`;
      const current = categoryCounts.get(key) || { total: 0, scheduled: 0, lastRoutineId: '' };
      current.total++;
      if (routine.isScheduled) {
        current.scheduled++;
      }
      categoryCounts.set(key, current);
    });

    // Find last scheduled routine per category (highest entry number)
    sortedRoutines.forEach(routine => {
      const key = `${routine.entrySizeName}|${routine.ageGroupName}|${routine.classificationName}`;
      const current = categoryCounts.get(key);
      if (current && (!current.lastRoutineId || (routine.entryNumber || 0) > 0)) {
        current.lastRoutineId = routine.id;
      }
    });

    // Show trophy only when unscheduled count ≤ 5
    const lastIds = new Set<string>();
    categoryCounts.forEach((counts, key) => {
      const unscheduled = counts.total - counts.scheduled;
      if (unscheduled <= 5 && counts.lastRoutineId) {
        lastIds.add(counts.lastRoutineId);
      }
    });

    return lastIds;
  }, [sortedRoutines, allRoutines]);

  // Calculate session blocks based on AWARD blocks (sessions end at award ceremonies)
  // Each session = time from day start (or previous award) to current award (inclusive)
  const sessionInfo = useMemo(() => {
    // Build chronological timeline with calculated times
    const timeline: Array<{
      type: 'routine' | 'block';
      id: string;
      blockType?: string;
      startMinutes: number;
      durationMinutes: number;
      endMinutes: number;
    }> = [];

    // Get day start time (default 8:00 AM = 480 minutes)
    let currentMinutes = 480;
    if (scheduleItems.length > 0 && scheduleItems[0].type === 'routine') {
      const firstRoutine = scheduleItems[0].data;
      if (firstRoutine.scheduledTimeString) {
        const [hours, minutes] = firstRoutine.scheduledTimeString.split(':').map(Number);
        currentMinutes = hours * 60 + minutes;
      }
    }

    const dayStartMinutes = currentMinutes;

    // Build timeline with calculated times
    scheduleItems.forEach((item) => {
      const startMinutes = currentMinutes;
      const durationMinutes = item.type === 'block' 
        ? (item.data.duration_minutes || 0)
        : (item.data.duration || 0);
      const endMinutes = startMinutes + durationMinutes;

      timeline.push({
        type: item.type,
        id: item.data.id,
        blockType: item.type === 'block' ? item.data.block_type : undefined,
        startMinutes,
        durationMinutes,
        endMinutes,
      });

      currentMinutes = endMinutes;
    });

    // Find award block positions and calculate sessions
    const sessions: Array<{
      sessionNumber: number;
      startMinutes: number;
      endMinutes: number; // Includes award block duration
      durationMinutes: number;
      awardBlockId: string | null;
      itemIds: Set<string>; // All routine/block IDs in this session
    }> = [];

    let sessionNumber = 1;
    let sessionStartMinutes = dayStartMinutes;
    let currentSessionItems = new Set<string>();

    timeline.forEach((item, index) => {
      currentSessionItems.add(item.id);

      // Check if this is an AWARD block (ends a session)
      if (item.type === 'block' && item.blockType === 'award') {
        const sessionEndMinutes = item.endMinutes; // Include award block duration
        const sessionDuration = sessionEndMinutes - sessionStartMinutes;

        sessions.push({
          sessionNumber,
          startMinutes: sessionStartMinutes,
          endMinutes: sessionEndMinutes,
          durationMinutes: sessionDuration,
          awardBlockId: item.id,
          itemIds: new Set(currentSessionItems),
        });

        // Start new session after this award block
        sessionNumber++;
        sessionStartMinutes = sessionEndMinutes;
        currentSessionItems = new Set<string>();
      }
    });

    // Add final session if there are items after the last award (or no awards at all)
    if (currentSessionItems.size > 0) {
      const lastItem = timeline[timeline.length - 1];
      const sessionEndMinutes = lastItem?.endMinutes || dayStartMinutes;
      const sessionDuration = sessionEndMinutes - sessionStartMinutes;

      sessions.push({
        sessionNumber,
        startMinutes: sessionStartMinutes,
        endMinutes: sessionEndMinutes,
        durationMinutes: sessionDuration,
        awardBlockId: null, // No award block ends this session
        itemIds: new Set(currentSessionItems),
      });
    }

    // Create lookup map: itemId -> session info
    const itemSessionMap = new Map<string, { sessionNumber: number; durationMinutes: number; isLastInSession: boolean; sessionColor: string }>();
    
    // Session colors (alternating)
    const sessionColors = [
      'bg-purple-500/8',
      'bg-blue-500/8', 
      'bg-indigo-500/8',
      'bg-violet-500/8',
    ];

    sessions.forEach((session) => {
      const color = sessionColors[(session.sessionNumber - 1) % sessionColors.length];
      const itemIdsArray = Array.from(session.itemIds);
      
      itemIdsArray.forEach((id, idx) => {
        const isLast = idx === itemIdsArray.length - 1;
        itemSessionMap.set(id, {
          sessionNumber: session.sessionNumber,
          durationMinutes: session.durationMinutes,
          isLastInSession: isLast,
          sessionColor: color,
        });
      });
    });

    return { sessions, itemSessionMap, dayStartMinutes };
  }, [scheduleItems]);

  // Calculate eligible awards for each session based on trophy helper logic
  const eligibleAwardsBySession = useMemo(() => {
    const awardMap = new Map<number, EligibleAward[]>();

    sessionInfo.sessions.forEach(session => {
      const eligibleAwards: EligibleAward[] = [];
      const seenCategories = new Set<string>();

      // Check each routine in this session
      session.itemIds.forEach(itemId => {
        // Find the routine with this ID
        const routine = sortedRoutines.find(r => r.id === itemId);
        if (!routine) return;

        // Check if this routine has a trophy (is last in its category)
        if (lastRoutineIds.has(routine.id)) {
          // Build category key to avoid duplicates
          const categoryKey = `${routine.entrySizeName}|${routine.ageGroupName}|${routine.classificationName}`;

          if (!seenCategories.has(categoryKey)) {
            seenCategories.add(categoryKey);
            eligibleAwards.push({
              entrySize: routine.entrySizeName,
              ageGroup: routine.ageGroupName,
              classification: routine.classificationName,
            });
          }
        }
      });

      awardMap.set(session.sessionNumber, eligibleAwards);
    });

    return awardMap;
  }, [sessionInfo, sortedRoutines, lastRoutineIds]);

  // Detect conflict groups (consecutive routines with same dancer)
  const conflictGroups = useMemo(() => {
    const groups: Array<{ routineIds: string[]; conflict: Conflict }> = [];

    conflicts.forEach(conflict => {
      // Find positions of both routines
      const idx1 = sortedRoutines.findIndex(r => r.id === conflict.routine1Id);
      const idx2 = sortedRoutines.findIndex(r => r.id === conflict.routine2Id);

      if (idx1 === -1 || idx2 === -1) return;

      const startIdx = Math.min(idx1, idx2);
      const endIdx = Math.max(idx1, idx2);

      // Collect all routine IDs in between
      const routineIds = sortedRoutines
        .slice(startIdx, endIdx + 1)
        .map(r => r.id);

      groups.push({ routineIds, conflict });
    });

    return groups;
  }, [sortedRoutines, conflicts]);

  // Check if routine is part of a conflict
  const getRoutineConflict = (routineId: string) => {
    return conflictGroups.find(group => group.routineIds.includes(routineId));
  };

  // Check if routine is first in conflict group
  const isFirstInConflictGroup = (routineId: string) => {
    const group = getRoutineConflict(routineId);
    return group && group.routineIds[0] === routineId;
  };

  // Get conflict span height
  const getConflictSpan = (routineId: string) => {
    const group = getRoutineConflict(routineId);
    return group ? group.routineIds.length : 1;
  };

  // Droppable zone for scheduling routines
  const { setNodeRef, isOver } = useDroppable({
    id: `schedule-table-${selectedDate}`,
    data: { date: selectedDate },
  });

  // Show empty state only if BOTH routines and blocks are empty
  if (sortedRoutines.length === 0 && scheduleBlocks.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`min-h-[400px] border-2 border-dashed rounded-xl flex items-center justify-center ${
          isOver
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-white/20 bg-white/5'
        }`}
      >
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-white/60 text-lg">No routines scheduled for this day</p>
          <p className="text-white/40 text-sm mt-2">Drag routines here to schedule</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden ${
        isOver ? 'ring-2 ring-purple-400' : ''
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-indigo-600/20 border-b border-indigo-600/30">
              {onSelectionChange && (
                <th className="px-0.5 py-1 text-center" style={{ width: '14px' }}>
                  <input
                    type="checkbox"
                    checked={selectedRoutineIds.size === sortedRoutines.length && sortedRoutines.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-purple-600 cursor-pointer"
                  />
                </th>
              )}
              <th
                className="px-0 py-1 text-center text-[11px] font-semibold text-white/60"
                style={{ width: '36px' }}
              >
                <div
                  className="cursor-help"
                  title="Helper Icons Legend:
🏆 Trophy = Last routine in category (award ceremony ready)
📋 Note = Studio Director requested changes
⚠️ Conflict = Dancer scheduling conflict detected
Click badge to dismiss"
                >
                  <span className="text-[9px]">●</span>
                </div>
                {dismissedIcons.size > 0 && (
                  <button
                    onClick={() => setDismissedIcons(new Set())}
                    className="text-[9px] text-purple-400 hover:text-purple-300 mt-0.5 underline"
                    title={`Unhide ${dismissedIcons.size} hidden badge${dismissedIcons.size !== 1 ? 's' : ''}`}
                  >
                    Unhide
                  </button>
                )}
              </th>
              <th className="px-0.5 py-1 text-left text-[13px] font-semibold text-white uppercase tracking-wider" style={{ width: '22px' }}>
                #
              </th>
              <th className="px-0.5 py-1 text-left text-[13px] font-semibold text-white uppercase tracking-wider" style={{ width: '36px' }}>
                Time
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '75px' }}>
                Routine
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '35px' }}>
                Std
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '80px' }}>
                Class
              </th>
              <th className="px-1 py-1 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '65px' }}>
                Size
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '40px' }}>
                Age
              </th>
              <th className="px-1 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '60px' }}>
                Dur
              </th>
            </tr>
          </thead>
          <SortableContext
            items={[
              ...sortedRoutines.map(r => `routine-${r.id}`),
              ...sortedBlocks.map(b => `block-${b.id}`),
            ]}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {/* Calculate cascading times for all items */}
              {(() => {
                // Get day start time from first routine or default to 8:00 AM
                let currentTimeMinutes = 480; // 8:00 AM default
                if (scheduleItems.length > 0 && scheduleItems[0].type === 'routine') {
                  const firstRoutine = scheduleItems[0].data;
                  if (firstRoutine.scheduledTimeString) {
                    const [hours, minutes] = firstRoutine.scheduledTimeString.split(':').map(Number);
                    currentTimeMinutes = hours * 60 + minutes;
                  }
                }

                return scheduleItems.map((item, index) => {
                  // Calculate this item's start time (based on accumulated time)
                  const thisItemStartMinutes = currentTimeMinutes;

                  // Format time for display
                  const hour24 = Math.floor(thisItemStartMinutes / 60);
                  const minute = thisItemStartMinutes % 60;
                  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                  const ampm = hour24 >= 12 ? 'PM' : 'AM';
                  const calculatedTimeString = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;

                  if (item.type === 'block') {
                    const block = item.data;
                    // Add block duration to cumulative time
                    currentTimeMinutes += block.duration_minutes || 0;

                    // Get session info for this block
                    const blockSessionInfo = sessionInfo.itemSessionMap.get(block.id);

                    // Find the routine number this block is positioned after
                    let routineNumberBefore: number | undefined = undefined;
                    for (let i = index - 1; i >= 0; i--) {
                      if (scheduleItems[i].type === 'routine') {
                        routineNumberBefore = scheduleItems[i].data.entryNumber;
                        break;
                      }
                    }

                    // Get eligible awards for this session (if award block)
                    const eligibleAwards = block.block_type === 'award' && blockSessionInfo?.sessionNumber
                      ? eligibleAwardsBySession.get(blockSessionInfo.sessionNumber) || []
                      : [];

                    // Render schedule block
                    return (
                      <SortableBlockRow
                        key={`block-${block.id}`}
                        block={block}
                        showCheckbox={!!onSelectionChange}
                        onDelete={onDeleteBlock}
                        onEdit={onEditBlock}
                        calculatedTime={calculatedTimeString}
                        sessionDurationMinutes={blockSessionInfo?.durationMinutes}
                        sessionNumber={blockSessionInfo?.sessionNumber}
                        sessionColor={blockSessionInfo?.sessionColor}
                        routineNumberBefore={routineNumberBefore}
                        eligibleAwards={eligibleAwards}
                      />
                    );
                  }

                  // Render routine
                  const routine = item.data;
                  const routineIndex = sortedRoutines.findIndex(r => r.id === routine.id);
                  const isLastInOveralls = lastRoutineIds.has(routine.id);
                  const conflict = getRoutineConflict(routine.id);
                  const isFirstInConflict = isFirstInConflictGroup(routine.id);
                  const conflictSpan = getConflictSpan(routine.id);

                  // Get session info for this routine
                  const routineSessionInfo = sessionInfo.itemSessionMap.get(routine.id);

                  // Add routine duration to cumulative time for next item
                  currentTimeMinutes += routine.duration || 0;

                  // Format time - split into number and period for compact display
                  const performanceTime = { time: `${hour12}:${String(minute).padStart(2, '0')}`, period: ampm };

                // Classification color
                const classificationColor = getClassificationColor(routine.classificationName);

                // Studio display - always show 5-char code
                const studioDisplay = routine.studioCode;

                return (
                  <SortableRoutineRow
                    key={routine.id}
                    routine={routine}
                    index={routineIndex}
                    isLastInOveralls={isLastInOveralls}
                    conflict={conflict}
                    isFirstInConflict={!!isFirstInConflict}
                    conflictSpan={conflictSpan}
                    performanceTime={performanceTime}
                    classificationColor={classificationColor}
                    studioDisplay={studioDisplay}
                    viewMode={viewMode}
                    sessionNumber={routineSessionInfo?.sessionNumber || 1}
                    isLastInSession={routineSessionInfo?.isLastInSession || false}
                    sessionColor={routineSessionInfo?.sessionColor || ''}
                    onRoutineClick={onRoutineClick}
                    isSelected={selectedRoutineIds.has(routine.id)}
                    onCheckboxChange={handleCheckboxChange}
                    showCheckbox={!!onSelectionChange}
                    dismissedIcons={dismissedIcons}
                    onDismissIcon={(key) => setDismissedIcons(prev => new Set(prev).add(key))}
                    onAutoFixConflict={onAutoFixConflict}
                    hoveredConflict={hoveredConflict}
                    setHoveredConflict={setHoveredConflict}
                    scheduledRoutines={sortedRoutines}
                    conflicts={conflictsByRoutineId?.get(routine.id) || []}
                  />
                );
              });
            })()}
            </tbody>
          </SortableContext>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="bg-white/5 border-t border-white/20 px-1 py-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="text-white/60">
            Total: <span className="font-semibold text-white">{sortedRoutines.length}</span> routines
          </div>
          {/* Session Duration Summary */}
          {sessionInfo.sessions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/40">|</span>
              <span className="text-white/60">Sessions:</span>
              {sessionInfo.sessions.map((session, idx) => (
                <span
                  key={session.sessionNumber}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10"
                  title={`Session ${session.sessionNumber}: ${formatDuration(session.durationMinutes)}${session.awardBlockId ? ' (ends with award)' : ''}`}
                >
                  S{session.sessionNumber}: {formatDuration(session.durationMinutes)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {conflicts.length > 0 && (
            <div className="text-red-400">
              ⚠️ <span className="font-semibold">{conflicts.length}</span> conflict{conflicts.length !== 1 ? 's' : ''}
            </div>
          )}
          {dismissedIcons.size > 0 && (
            <button
              onClick={() => setDismissedIcons(new Set())}
              className="px-2 py-1 bg-purple-600/50 hover:bg-purple-600/70 text-white rounded text-xs font-medium transition-colors"
              title="Show all hidden helper icons"
            >
              🔄 Reset Helper Icons ({dismissedIcons.size})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: Get classification color
function getClassificationColor(classification: string): string {
  const lower = classification.toLowerCase();

  if (lower.includes('emerald')) return 'bg-emerald-600 text-white';
  if (lower.includes('sapphire')) return 'bg-blue-600 text-white';
  if (lower.includes('ruby')) return 'bg-red-600 text-white';
  if (lower.includes('diamond')) return 'bg-purple-600 text-white';
  if (lower.includes('platinum')) return 'bg-gray-600 text-white';

  return 'bg-gray-500 text-white';
}
