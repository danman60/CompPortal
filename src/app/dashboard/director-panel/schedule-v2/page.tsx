'use client';

/**
 * Schedule V2 - Simplified Implementation (V1 Feature Parity)
 * 
 * MIRRORS V1 UI EXACTLY but with simplified backend:
 * 1. Single source of truth: scheduleOrder (array of IDs)  
 * 2. Drag = reorder array, nothing else
 * 3. All changes local until Save button
 * 4. No optimistic DB updates during drag
 * 
 * Components reused from V1:
 * - RoutinePool (left panel with filters)
 * - ScheduleTable (schedule display)
 * - DayTabs (day selection)
 * - All modals
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RoutinePool, FilterState } from '@/components/scheduling/RoutinePool';
import { DayTabs } from '@/components/scheduling/DayTabs';
import { ScheduleBlockModal } from '@/components/ScheduleBlockModal';
import { SendToStudiosModal } from '@/components/scheduling/SendToStudiosModal';
import { AssignStudioCodesModal } from '@/components/AssignStudioCodesModal';
import { ResetAllConfirmationModal } from '@/components/ResetAllConfirmationModal';
import { VersionIndicator } from '@/components/scheduling/VersionIndicator';
import ScheduleSavingProgress from '@/components/ScheduleSavingProgress';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Mail, History, Eye, FileText, Clock, Pencil } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { autoFixRoutineConflict, autoFixDayConflicts, autoFixWeekendConflicts } from '@/lib/conflictAutoFix';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

// Constants
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';
const COMPETITION_DATES = ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'];

// ===================== COMPONENTS =====================

function DraggableBlockCard({ type, onClick }: { type: 'award' | 'break'; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `template-${type}`,
    data: { type: 'template', blockType: type },
  });

  const isAward = type === 'award';

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only trigger onClick if not dragging
        if (onClick && e.detail === 1) {
          onClick();
        }
      }}
      className={`
        relative flex-shrink-0 min-w-[180px] px-3 py-2 rounded-lg transition-all
        border-2 flex flex-col justify-center
        cursor-grab active:cursor-grabbing
        ${isAward
          ? 'bg-amber-900/30 text-amber-300 border-amber-500/50 hover:bg-amber-900/50 hover:border-amber-500'
          : 'bg-cyan-900/30 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-500'
        }
      `}
      title="Drag to schedule or click to configure"
    >
      <div className="font-semibold text-xs mb-1">
        {isAward ? '🏆 +Adjudication' : '☕ +Break'}
      </div>
      <div className={`text-xs ${isAward ? 'text-amber-200/80' : 'text-cyan-200/80'}`}>
        {isAward ? 'Add adjudication block' : 'Add break block'}
      </div>
      <div className="absolute top-1 right-1 opacity-40">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
        </svg>
      </div>
    </button>
  );
}

// ===================== TYPES =====================
interface ScheduleItem {
  id: string;
  type: 'routine' | 'block';
}

interface RoutineData {
  id: string;
  title: string;
  duration: number;
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
  routineAge?: number | null;
  dancer_names?: string[];
  has_studio_requests?: boolean;
  scheduling_notes?: string;
}

interface BlockData {
  id: string;
  block_type: 'award' | 'break';
  title: string;
  duration_minutes: number;
}

// ===================== HELPER FUNCTIONS (Pure) =====================

function getClassificationColor(classification: string): string {
  const lower = classification.toLowerCase();
  if (lower.includes('emerald')) return 'bg-emerald-600 text-white';
  if (lower.includes('sapphire')) return 'bg-blue-600 text-white';
  if (lower.includes('ruby')) return 'bg-red-600 text-white';
  if (lower.includes('diamond')) return 'bg-purple-600 text-white';
  if (lower.includes('platinum')) return 'bg-gray-600 text-white';
  return 'bg-gray-500 text-white';
}

function formatTime(minutes: number): { time: string; period: string } {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return {
    time: `${hour12}:${String(minute).padStart(2, '0')}`,
    period: ampm,
  };
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ===================== SORTABLE ROW COMPONENT =====================
function SortableScheduleRow({
  item,
  routine,
  block,
  entryNumber,
  timeString,
  hasTrophy,
  hasConflict,
  conflictInfo,
  hasNotes,
  notesText,
  sessionColor,
  onDelete,
  onEdit,
  onUnschedule,
  isSelected,
  onToggleSelection,
}: {
  item: ScheduleItem;
  routine?: RoutineData;
  block?: BlockData;
  entryNumber: number;
  timeString: string;
  hasTrophy?: boolean;
  hasConflict?: boolean;
  conflictInfo?: string;
  hasNotes?: boolean;
  notesText?: string;
  sessionColor: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onUnschedule?: () => void;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Block row
  if (item.type === 'block' && block) {
    const isAward = block.block_type === 'award';
    return (
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`border-b-2 cursor-grab active:cursor-grabbing ${sessionColor} ${
          isAward ? 'border-l-4 border-l-amber-500 border-amber-500/50' : 'border-l-4 border-l-cyan-500 border-cyan-500/50'
        }`}
      >
        <td className="px-1 py-2" style={{ width: '18px' }}></td>
        <td className="px-1 py-2" style={{ width: '36px' }}></td>
        <td className="px-1 py-2 text-lg" style={{ width: '22px' }}>{isAward ? '🏆' : '☕'}</td>
        <td className="px-1 py-2 font-mono text-sm text-white/90" style={{ width: '36px' }}>{timeString}</td>
        <td colSpan={7} className="px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-white">{block.title}</span>
              <span className="text-xs text-white/60">({block.duration_minutes} min)</span>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="px-2 py-1 text-xs text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 rounded"
                >
                  ✎ Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="px-2 py-1 text-xs text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded"
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

  // Routine row
  if (item.type === 'routine' && routine) {
    return (
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onToggleSelection}
        className={`border-b border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors ${sessionColor} ${
          hasConflict ? 'border-l-4 border-l-red-500' : ''
        } ${isSelected ? 'bg-blue-500/20' : ''}`}
      >
        {/* Selection Checkbox */}
        <td
          className="px-1 py-2"
          style={{ width: '18px' }}
          onClick={(e) => {
            e.stopPropagation(); // Stop click from bubbling to row
            if (onToggleSelection) {
              onToggleSelection(e as any);
            }
          }}
        >
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={(e) => {
                // onChange already handled by td onClick
              }}
              className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 cursor-pointer"
            />
          </div>
        </td>

        {/* Badges */}
        <td className="px-1 py-2" style={{ width: '36px' }}>
          <div className="flex gap-0.5">
            {hasTrophy && (
              <span className="inline-flex items-center justify-center w-6 h-5 rounded text-xs"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
                title={`🏆 Last in ${routine.entrySizeName} • ${routine.ageGroupName} • ${routine.classificationName}`}>
                🏆
              </span>
            )}
            {hasConflict && (
              <span className="inline-flex items-center justify-center w-6 h-5 rounded text-xs"
                style={{ background: 'linear-gradient(135deg, #FF6B6B, #EE5A6F)' }}
                title={conflictInfo}>
                ⚠️
              </span>
            )}
            {hasNotes && (
              <span className="inline-flex items-center justify-center w-6 h-5 rounded text-xs"
                style={{ background: 'linear-gradient(135deg, #4FC3F7, #2196F3)' }}
                title={notesText || 'Has notes'}>
                📋
              </span>
            )}
          </div>
        </td>

        {/* Entry # */}
        <td className="px-1 py-2 text-sm font-bold text-white" style={{ width: '22px' }}>
          #{entryNumber}
        </td>

        {/* Time */}
        <td className="px-1 py-2 font-mono text-sm text-white/90" style={{ width: '36px' }}>
          {timeString}
        </td>

        {/* Title */}
        <td className="px-2 py-2 text-sm font-medium text-white truncate" style={{ width: '75px' }} title={routine.title}>
          {routine.title}
        </td>

        {/* Studio */}
        <td className="px-2 py-2 text-xs text-white/80 text-center" style={{ width: '35px' }}>
          {routine.studioCode}
        </td>

        {/* Classification */}
        <td className="px-2 py-2" style={{ width: '80px' }}>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getClassificationColor(routine.classificationName)}`}>
            {routine.classificationName}
          </span>
        </td>

        {/* Size */}
        <td className="px-2 py-2 text-xs text-white/80" style={{ width: '65px' }}>
          {routine.entrySizeName}
        </td>

        {/* Age */}
        <td className="px-2 py-2 text-xs text-white/80 text-center" style={{ width: '40px' }}>
          {routine.routineAge ?? '-'}
        </td>

        {/* Duration */}
        <td className="px-2 py-2 text-xs text-white/80 text-center" style={{ width: '60px' }}>
          {routine.duration}m
        </td>
        
        {/* Actions */}
        <td className="px-1 py-2 text-center" style={{ width: '30px' }}>
          {onUnschedule && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnschedule(); }}
              className="px-1.5 py-0.5 text-xs text-white/50 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
              title="Remove from schedule"
            >
              ✕
            </button>
          )}
        </td>
      </tr>
    );
  }

  return null;
}

// ===================== DROPPABLE SCHEDULE TABLE =====================
function DroppableScheduleTable({
  scheduleOrder,
  routinesMap,
  blocksMap,
  trophyIds,
  conflictsMap,
  sessionColors,
  dayStartMinutes,
  entryNumbersByRoutineId,
  onDeleteBlock,
  onEditBlock,
  onUnscheduleRoutine,
  selectedScheduledIds,
  setSelectedScheduledIds,
  lastClickedScheduledRoutineId,
  setLastClickedScheduledRoutineId,
}: {
  scheduleOrder: string[];
  routinesMap: Map<string, RoutineData>;
  blocksMap: Map<string, BlockData>;
  trophyIds: Set<string>;
  conflictsMap: Map<string, string>;
  sessionColors: Map<string, string>;
  dayStartMinutes: number;
  entryNumbersByRoutineId: Map<string, number>;
  onDeleteBlock: (blockId: string) => void;
  onEditBlock: (block: BlockData) => void;
  onUnscheduleRoutine: (routineId: string) => void;
  selectedScheduledIds: Set<string>;
  setSelectedScheduledIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  lastClickedScheduledRoutineId: string | null;
  setLastClickedScheduledRoutineId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'schedule-drop-zone' });

  // Shift+click handler for scheduled routines (copied from V1 pattern)
  const handleScheduledRoutineClick = (routineId: string, e: React.MouseEvent) => {
    const shift = e.shiftKey;
    const scheduledRoutines = scheduleOrder.filter(id => !id.startsWith('block-'));

    if (shift && lastClickedScheduledRoutineId && scheduledRoutines.length > 0) {
      const lastIndex = scheduledRoutines.findIndex(id => id === lastClickedScheduledRoutineId);
      const currentIndex = scheduledRoutines.findIndex(id => id === routineId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const [start, end] = lastIndex < currentIndex ? [lastIndex, currentIndex] : [currentIndex, lastIndex];
        const rangeIds = scheduledRoutines.slice(start, end + 1);
        setSelectedScheduledIds(prev => {
          const newSet = new Set(prev);
          rangeIds.forEach(id => newSet.add(id));
          return newSet;
        });
        setLastClickedScheduledRoutineId(routineId);
        return;
      }
    }

    // Normal click: toggle selection
    setSelectedScheduledIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routineId)) {
        newSet.delete(routineId);
      } else {
        newSet.add(routineId);
      }
      return newSet;
    });
    setLastClickedScheduledRoutineId(routineId);
  };

  // Calculate times and entry numbers
  let currentMinutes = dayStartMinutes;

  const rows = scheduleOrder.map((id) => {
    const isBlock = id.startsWith('block-');
    const actualId = isBlock ? id.replace('block-', '') : id;

    const routine = !isBlock ? routinesMap.get(actualId) : undefined;
    const block = isBlock ? blocksMap.get(actualId) : undefined;

    const duration = routine?.duration || block?.duration_minutes || 0;
    const timeFormatted = formatTime(currentMinutes);
    const timeString = `${timeFormatted.time} ${timeFormatted.period}`;

    const thisEntryNumber = !isBlock ? (entryNumbersByRoutineId.get(actualId) ?? 100) : 0;

    currentMinutes += duration;

    return (
      <SortableScheduleRow
        key={id}
        item={{ id, type: isBlock ? 'block' : 'routine' }}
        routine={routine}
        block={block}
        entryNumber={thisEntryNumber}
        timeString={timeString}
        hasTrophy={trophyIds.has(actualId)}
        hasConflict={conflictsMap.has(actualId)}
        conflictInfo={conflictsMap.get(actualId)}
        hasNotes={routine?.has_studio_requests}
        notesText={routine?.scheduling_notes}
        sessionColor={sessionColors.get(id) || 'bg-purple-500/5'}
        onDelete={isBlock ? () => onDeleteBlock(actualId) : undefined}
        onEdit={isBlock && block ? () => onEditBlock(block) : undefined}
        onUnschedule={!isBlock ? () => onUnscheduleRoutine(actualId) : undefined}
        isSelected={!isBlock && selectedScheduledIds.has(actualId)}
        onToggleSelection={!isBlock ? (e) => handleScheduledRoutineClick(actualId, e) : undefined}
      />
    );
  });

  if (scheduleOrder.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`min-h-[400px] border-2 border-dashed rounded-xl flex items-center justify-center transition-colors ${
          isOver ? 'border-purple-400 bg-purple-500/20' : 'border-white/20 bg-white/5'
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
      className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden transition-all ${
        isOver ? 'ring-2 ring-purple-400' : ''
      }`}
    >
      <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-indigo-600/40 border-b border-indigo-600/30">
              <th className="px-1 py-2 text-xs font-semibold text-white/80 text-center" style={{ width: '18px' }}>☑</th>
              <th className="px-1 py-2 text-xs font-semibold text-white/80 text-center" style={{ width: '36px' }}>●</th>
              <th className="px-1 py-2 text-xs font-semibold text-white text-left" style={{ width: '22px' }}>#</th>
              <th className="px-1 py-2 text-xs font-semibold text-white text-left" style={{ width: '36px' }}>TIME</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ width: '75px' }}>ROUTINE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '35px' }}>STD</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ width: '80px' }}>CLASS</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ width: '65px' }}>SIZE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '40px' }}>AGE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '60px' }}>DUR</th>
              <th className="px-1 py-2 text-xs font-semibold text-white/60 text-center" style={{ width: '30px' }}></th>
            </tr>
          </thead>
          <SortableContext items={scheduleOrder} strategy={verticalListSortingStrategy}>
            <tbody>{rows}</tbody>
          </SortableContext>
        </table>
      </div>
      
      {/* Footer */}
      <div className="bg-white/5 border-t border-white/20 px-4 py-2 flex justify-between text-xs text-white/60">
        <span>Total: <span className="font-semibold text-white">{scheduleOrder.filter(id => !id.startsWith('block-')).length}</span> routines</span>
        <span>Duration: <span className="font-semibold text-white">{formatDuration(currentMinutes - dayStartMinutes)}</span></span>
      </div>
    </div>
  );
}

// ===================== MAIN PAGE =====================
export default function ScheduleV2Page() {
  // ===== STATE =====
  const [selectedDate, setSelectedDate] = useState('2026-04-11');
  const [scheduleByDate, setScheduleByDate] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    classifications: [], ageGroups: [], genres: [], groupSizes: [], studios: [], routineAges: [], search: '',
  });
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
  const [lastClickedRoutineId, setLastClickedRoutineId] = useState<string | null>(null);
  const [lastClickedScheduledRoutineId, setLastClickedScheduledRoutineId] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockType, setBlockType] = useState<'award' | 'break'>('award');
  const [editingBlock, setEditingBlock] = useState<{ id: string; type: 'award' | 'break'; title: string; duration: number; placement?: { routineNumber: number } } | null>(null);
  
  // Additional modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [showStudioCodeModal, setShowStudioCodeModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [showFixAllModal, setShowFixAllModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showStudioPickerModal, setShowStudioPickerModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, currentDayName: '' });
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(new Set());

  // Track if we've initialized scheduleByDate from database (prevent wiping local changes)
  const hasInitializedSchedule = useRef(false);

  // Edit day start time modal state (V1 parity)
  const [showEditStartTimeModal, setShowEditStartTimeModal] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingStartTime, setEditingStartTime] = useState('08:00');

  // Router for navigation
  const router = useRouter();

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // Tenant branding
  const { tenant, primaryColor, logo } = useTenantTheme();

  // Current day's schedule
  const scheduleOrder = scheduleByDate[selectedDate] || [];

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ===== DATA FETCHING =====
  const { data: routinesData, isLoading, refetch } = trpc.scheduling.getRoutines.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  const { data: blocksData, refetch: refetchBlocks } = trpc.scheduling.getScheduleBlocks.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
    date: selectedDate,
  });

  // Day start times (V1 parity - affects first routine time)
  const { data: dayStartTimes, refetch: refetchDayStartTimes } = trpc.scheduling.getDayStartTimes.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  const saveMutation = trpc.scheduling.schedule.useMutation();

  const createBlockMutation = trpc.scheduling.createScheduleBlock.useMutation({
    onSuccess: (data) => {
      // Add block to local state
      setScheduleByDate(prev => ({
        ...prev,
        [selectedDate]: [...(prev[selectedDate] || []), `block-${data.id}`],
      }));
      toast.success('Block created');
      refetchBlocks();
    },
    onError: (err) => toast.error(`Failed to create block: ${err.message}`),
  });

  const deleteBlockMutation = trpc.scheduling.deleteScheduleBlock.useMutation({
    onSuccess: () => {
      toast.success('Block deleted');
      refetchBlocks();
    },
    onError: (err) => toast.error(`Failed to delete block: ${err.message}`),
  });

  const updateBlockDetailsMutation = trpc.scheduling.updateBlockDetails.useMutation({
    onSuccess: () => {
      toast.success('Block updated');
      refetchBlocks();
    },
    onError: (err) => toast.error(`Failed to update block: ${err.message}`),
  });

  const unscheduleMutation = trpc.scheduling.unscheduleRoutines.useMutation({
    onSuccess: async (data) => {
      toast.success(`Unscheduled ${data.count} routine(s)`);
      await refetch();
    },
    onError: (err) => toast.error(`Failed to unschedule: ${err.message}`),
  });

  // Additional queries for V1 feature parity
  const { data: competition } = trpc.competition.getById.useQuery({ id: TEST_COMPETITION_ID });
  
  const { data: versionData, refetch: refetchVersion } = trpc.scheduling.getCurrentVersion.useQuery({
    tenantId: TEST_TENANT_ID,
    competitionId: TEST_COMPETITION_ID,
  });

  const { data: versionHistory, refetch: refetchHistory } = trpc.scheduling.getVersionHistory.useQuery(
    { tenantId: TEST_TENANT_ID, competitionId: TEST_COMPETITION_ID },
    { enabled: showVersionHistory }
  );

  const { data: allStudios } = trpc.studioInvitations.getStudiosForCD.useQuery();

  const { data: studioCodeData } = trpc.scheduling.getUnassignedStudioCodes.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // Update day start time mutation (V1 parity - recalculates all routine times)
  const updateDayStartTimeMutation = trpc.scheduling.updateDayStartTime.useMutation({
    onSuccess: async (data) => {
      toast.success(`Updated start time - recalculated ${data.updatedCount} routines`);
      await refetch(); // Refetch routines with new times
      await refetchDayStartTimes(); // Refetch start times
    },
    onError: (err) => toast.error(`Failed to update start time: ${err.message}`),
  });

  // Reset mutations
  const resetDayMutation = trpc.scheduling.resetDay.useMutation({
    onSuccess: async (data) => {
      toast.success(`Unscheduled ${data.count} routines`);
      setScheduleByDate(prev => ({ ...prev, [selectedDate]: [] }));
      refetch();
      refetchBlocks();
    },
    onError: (err) => toast.error(`Failed to reset day: ${err.message}`),
  });

  const resetCompetitionMutation = trpc.scheduling.resetCompetition.useMutation({
    onSuccess: async (data) => {
      toast.success(`Unscheduled ${data.count} routines from all days`);
      setScheduleByDate({});
      refetch();
      refetchBlocks();
    },
    onError: (err) => toast.error(`Failed to reset competition: ${err.message}`),
  });

  const toggleFeedbackMutation = trpc.scheduling.toggleScheduleFeedback.useMutation({
    onSuccess: () => { toast.success('Feedback setting updated'); refetchVersion(); },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const publishVersionMutation = trpc.scheduling.publishVersionToStudios.useMutation({
    onSuccess: (data) => {
      toast.success(`Published V${data.publishedVersion} to studios`);
      refetchVersion();
      refetchHistory();
    },
    onError: (err) => toast.error(`Failed to publish: ${err.message}`),
  });

  // ===== LOCAL TEMP BLOCKS STATE =====
  // Temp blocks are created on drag before being persisted to DB
  const [tempBlocks, setTempBlocks] = useState<Map<string, BlockData>>(new Map());

  // ===== BUILD MAPS =====
  const routinesMap = useMemo(() => {
    const map = new Map<string, RoutineData>();
    (routinesData || []).forEach(r => {
      map.set(r.id, {
        id: r.id,
        title: r.title,
        duration: r.duration || 3,
        studioId: r.studioId,
        studioName: r.studioName,
        studioCode: r.studioCode,
        classificationId: r.classificationId,
        classificationName: r.classificationName,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        ageGroupId: r.ageGroupId,
        ageGroupName: r.ageGroupName,
        entrySizeId: r.entrySizeId,
        entrySizeName: r.entrySizeName,
        routineAge: r.routineAge,
        dancer_names: r.dancer_names || [],
        has_studio_requests: r.has_studio_requests || false,
        scheduling_notes: r.scheduling_notes || undefined,
      });
    });
    return map;
  }, [routinesData]);

  // Combine DB blocks + temp blocks into single map
  const blocksMap = useMemo(() => {
    const map = new Map<string, BlockData>();
    // Add blocks from DB
    (blocksData || []).forEach(b => {
      map.set(b.id, {
        id: b.id,
        block_type: b.block_type as 'award' | 'break',
        title: b.title,
        duration_minutes: b.duration_minutes,
      });
    });
    // Add temp blocks (for drag-created blocks not yet in DB)
    tempBlocks.forEach((block, id) => {
      map.set(id, block);
    });
    return map;
  }, [blocksData, tempBlocks]);

  // ===== INITIALIZE FROM DB (ALL DAYS) =====
  // Only runs ONCE when data first loads - preserves local unsaved changes after that
  useEffect(() => {
    if (!routinesData || hasInitializedSchedule.current) return;

    hasInitializedSchedule.current = true;

    const allSchedules: Record<string, string[]> = {};

    COMPETITION_DATES.forEach(date => {
      const scheduled = routinesData
        .filter(r => r.isScheduled && r.scheduledDateString === date)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0))
        .map(r => r.id);

      const blocks = (blocksData || [])
        .filter(b => b.scheduled_time)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(b => `block-${b.id}`);

      // Interleave based on sort_order
      const combined = [...scheduled];
      blocks.forEach(blockId => {
        const block = blocksData?.find(b => `block-${b.id}` === blockId);
        if (block?.sort_order !== null && block?.sort_order !== undefined) {
          const insertIdx = Math.min(Math.floor(block.sort_order), combined.length);
          combined.splice(insertIdx, 0, blockId);
        } else {
          combined.push(blockId);
        }
      });

      allSchedules[date] = combined;
    });

    setScheduleByDate(allSchedules);
  }, [routinesData, blocksData]);

  // ===== COMPUTED: Unscheduled Routines =====
  const unscheduledRoutines = useMemo(() => {
    const allScheduledIds = new Set(
      Object.values(scheduleByDate).flat().filter(id => !id.startsWith('block-'))
    );
    
    return (routinesData || [])
      .filter(r => !r.isScheduled && !allScheduledIds.has(r.id))
      .filter(r => {
        // Apply filters
        if (filters.classifications.length > 0 && !filters.classifications.includes(r.classificationId)) return false;
        if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(r.ageGroupId)) return false;
        if (filters.genres.length > 0 && !filters.genres.includes(r.categoryId)) return false;
        if (filters.groupSizes.length > 0 && !filters.groupSizes.includes(r.entrySizeId)) return false;
        if (filters.studios.length > 0 && !filters.studios.includes(r.studioId)) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          if (!r.title.toLowerCase().includes(search) && 
              !r.studioName.toLowerCase().includes(search) &&
              !r.studioCode.toLowerCase().includes(search)) return false;
        }
        return true;
      });
  }, [routinesData, scheduleByDate, filters]);

  // ===== COMPUTED: Trophy Helper =====
  // Find last routine per category in current schedule (local state)
  const trophyIds = useMemo(() => {
    const trophies = new Set<string>();
    const categoryLastRoutine = new Map<string, string>();

    // Loop through schedule order to find last routine per category
    scheduleOrder.forEach(id => {
      if (id.startsWith('block-')) return;
      const routine = routinesMap.get(id);
      if (!routine) return;
      const key = `${routine.entrySizeName}|${routine.ageGroupName}|${routine.classificationName}`;
      categoryLastRoutine.set(key, id);
    });

    categoryLastRoutine.forEach(id => trophies.add(id));
    return trophies;
  }, [scheduleOrder, routinesMap]);

  // ===== COMPUTED: Global Entry Numbers =====
  const entryNumbersByRoutineId = useMemo(() => {
    const map = new Map<string, number>();
    let entryNumber = 100;

    COMPETITION_DATES.forEach(date => {
      const daySchedule = scheduleByDate[date] || [];
      daySchedule.forEach(id => {
        if (!id.startsWith('block-')) {
          map.set(id, entryNumber++);
        }
      });
    });

    return map;
  }, [scheduleByDate]);

  // ===== COMPUTED: Conflicts =====
  const conflictsMap = useMemo(() => {
    const conflicts = new Map<string, string>();
    const MIN_SPACING = 6;
    const dancerPositions = new Map<string, number[]>();

    scheduleOrder.forEach((id, index) => {
      if (id.startsWith('block-')) return;
      const routine = routinesMap.get(id);
      if (!routine?.dancer_names) return;

      routine.dancer_names.forEach(dancer => {
        if (!dancerPositions.has(dancer)) dancerPositions.set(dancer, []);
        dancerPositions.get(dancer)!.push(index);
      });
    });

    dancerPositions.forEach((positions, dancer) => {
      for (let i = 0; i < positions.length - 1; i++) {
        const spacing = positions[i + 1] - positions[i] - 1;
        if (spacing < MIN_SPACING) {
          const id1 = scheduleOrder[positions[i]];
          const id2 = scheduleOrder[positions[i + 1]];
          const entryNum1 = entryNumbersByRoutineId.get(id1) || 0;
          const entryNum2 = entryNumbersByRoutineId.get(id2) || 0;
          conflicts.set(id1, `${dancer} - ${spacing} between - #${entryNum2}`);
          conflicts.set(id2, `${dancer} - ${spacing} between - #${entryNum1}`);
        }
      }
    });

    return conflicts;
  }, [scheduleOrder, routinesMap, entryNumbersByRoutineId]);

  // ===== COMPUTED: Day Conflict Count =====
  const dayConflictCount = useMemo(() => {
    // Conflicts are counted twice (once per routine), so divide by 2
    return Math.floor(conflictsMap.size / 2);
  }, [conflictsMap]);

  // ===== COMPUTED: Session Colors =====
  const sessionColors = useMemo(() => {
    const colors = new Map<string, string>();
    const sessionColorList = ['bg-purple-500/8', 'bg-blue-500/8', 'bg-indigo-500/8', 'bg-violet-500/8'];
    let sessionNumber = 0;

    scheduleOrder.forEach(id => {
      colors.set(id, sessionColorList[sessionNumber % sessionColorList.length]);
      if (id.startsWith('block-')) {
        const blockId = id.replace('block-', '');
        const block = blocksMap.get(blockId);
        if (block?.block_type === 'award') {
          sessionNumber++;
        }
      }
    });

    return colors;
  }, [scheduleOrder, blocksMap]);

  // ===== COMPUTED: Filter Options =====
  const filterOptions = useMemo(() => ({
    classifications: [...new Map((routinesData || []).map(r => [r.classificationId, { id: r.classificationId, label: r.classificationName }])).values()],
    ageGroups: [...new Map((routinesData || []).map(r => [r.ageGroupId, { id: r.ageGroupId, label: r.ageGroupName }])).values()],
    genres: [...new Map((routinesData || []).map(r => [r.categoryId, { id: r.categoryId, label: r.categoryName }])).values()],
    groupSizes: [...new Map((routinesData || []).map(r => [r.entrySizeId, { id: r.entrySizeId, label: r.entrySizeName }])).values()],
    studios: [...new Map((routinesData || []).map(r => [r.studioId, { id: r.studioId, label: `${r.studioCode} - ${r.studioName}` }])).values()],
  }), [routinesData]);

  // ===== COMPUTED: Day Tabs Data =====
  const competitionDates = useMemo(() => {
    return COMPETITION_DATES.map(date => {
      // Get stored start time for this date
      const storedStartTime = dayStartTimes?.find((dst: any) => {
        const dstDate = new Date(dst.date);
        const targetDate = new Date(date);
        return dstDate.getTime() === targetDate.getTime();
      });

      let startTime = '08:00:00';
      if (storedStartTime?.start_time) {
        const timeValue = new Date(storedStartTime.start_time);
        const hours = String(timeValue.getUTCHours()).padStart(2, '0');
        const minutes = String(timeValue.getUTCMinutes()).padStart(2, '0');
        startTime = `${hours}:${minutes}:00`;
      }

      return {
        date,
        startTime,
        routineCount: (scheduleByDate[date] || []).filter(id => !id.startsWith('block-')).length,
        savedRoutineCount: (routinesData || []).filter(r => r.isScheduled && r.scheduledDateString === date).length,
      };
    });
  }, [scheduleByDate, routinesData, dayStartTimes]);

  // ===== COMPUTED: Has Changes (Current Day) =====
  const hasChanges = useMemo(() => {
    if (!routinesData) return false;
    
    const serverScheduled = routinesData
      .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0))
      .map(r => r.id);

    const currentRoutines = scheduleOrder.filter(id => !id.startsWith('block-'));
    
    if (serverScheduled.length !== currentRoutines.length) return true;
    return serverScheduled.some((id, i) => id !== currentRoutines[i]);
  }, [routinesData, scheduleOrder, selectedDate]);

  // ===== COMPUTED: Has Any Unsaved Changes (All Days) - V1 Parity =====
  const hasAnyUnsavedChanges = useMemo(() => {
    if (!routinesData) return false;

    return COMPETITION_DATES.some(date => {
      const daySchedule = scheduleByDate[date] || [];
      const dayRoutinesOnly = daySchedule.filter(id => !id.startsWith('block-'));

      const serverScheduled = routinesData
        .filter(r => r.isScheduled && r.scheduledDateString === date)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0))
        .map(r => r.id);

      if (dayRoutinesOnly.length !== serverScheduled.length) return true;
      return dayRoutinesOnly.some((id, i) => id !== serverScheduled[i]);
    });
  }, [routinesData, scheduleByDate]);

  // ===== AUTOSAVE EFFECT (5 minutes) =====
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      if (!hasAnyUnsavedChanges) return;
      if (saveMutation.isPending) return;

      console.log('[Autosave] Saving all days...');
      handleSaveAllDays();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autosaveInterval);
  }, [hasAnyUnsavedChanges, saveMutation.isPending]);

  // ===== CHECK FOR UNASSIGNED STUDIO CODES =====
  useEffect(() => {
    if (studioCodeData && studioCodeData.unassignedCount > 0 && !showStudioCodeModal) {
      setShowStudioCodeModal(true);
    }
  }, [studioCodeData]);

  // ===== DRAG HANDLERS =====
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Case 0: Handle template block drops
    if (activeId.startsWith('template-')) {
      const blockType = activeId.replace('template-', '') as 'award' | 'break';
      const timestamp = Date.now();

      // CRITICAL: Two different ID formats needed
      const tempMapKey = `temp-${timestamp}`;           // Key for tempBlocks Map (what lookup expects)
      const scheduleArrayId = `block-temp-${timestamp}`; // ID for scheduleByDate array

      // Create temp block data
      const tempBlockData: BlockData = {
        id: tempMapKey,  // Use the Map key format
        block_type: blockType,
        title: blockType === 'award' ? '🏆 Adjudication Ceremony' : '☕ Break',
        duration_minutes: blockType === 'award' ? 30 : 15,
      };

      // Check if dropping on schedule area or any item in schedule
      const isDropOnScheduleZone = overId === 'schedule-drop-zone';
      const isDropOnScheduleItem = scheduleOrder.includes(overId);

      if (isDropOnScheduleZone || isDropOnScheduleItem) {
        // CRITICAL: Add block data to tempBlocks FIRST (so blocksMap has it when rendering)
        setTempBlocks(prev => {
          const next = new Map(prev);
          next.set(tempMapKey, tempBlockData);  // Key WITHOUT 'block-' prefix
          return next;
        });

        if (isDropOnScheduleZone) {
          // Drop at end of schedule
          setScheduleByDate(prev => ({
            ...prev,
            [selectedDate]: [...(prev[selectedDate] || []), scheduleArrayId],
          }));
        } else {
          // Drop at specific position (before the item we're hovering over)
          const overIndex = scheduleOrder.indexOf(overId);
          setScheduleByDate(prev => {
            const newOrder = [...(prev[selectedDate] || [])];
            if (overIndex >= 0) {
              newOrder.splice(overIndex, 0, scheduleArrayId);
            } else {
              newOrder.push(scheduleArrayId);
            }
            return { ...prev, [selectedDate]: newOrder };
          });
        }

        toast.success(`${blockType === 'award' ? '🏆 Adjudication' : '☕ Break'} block added - click to edit`);
      }
      return;
    }

    // Case 1: Drop on unscheduled pool (remove from schedule)
    if (overId === 'unscheduled-pool') {
      if (!activeId.startsWith('block-') && scheduleOrder.includes(activeId)) {
        setScheduleByDate(prev => ({
          ...prev,
          [selectedDate]: (prev[selectedDate] || []).filter(id => id !== activeId),
        }));
        toast.success('Routine unscheduled');
      }
      return;
    }

    // Case 2: Adding from unscheduled to schedule
    if (!scheduleOrder.includes(activeId) && !activeId.startsWith('block-')) {
      // Check if activeId is in selectedRoutineIds (multi-select drag)
      const idsToAdd = selectedRoutineIds.has(activeId)
        ? Array.from(selectedRoutineIds).filter(id => !scheduleOrder.includes(id))
        : [activeId];

      // Dropping on the schedule drop zone or a specific item
      if (overId === 'schedule-drop-zone') {
        // Drop at end of schedule
        setScheduleByDate(prev => ({
          ...prev,
          [selectedDate]: [...(prev[selectedDate] || []), ...idsToAdd],
        }));
      } else {
        // Drop at specific position
        const overIndex = scheduleOrder.indexOf(overId);
        setScheduleByDate(prev => {
          const newOrder = [...(prev[selectedDate] || [])];
          if (overIndex >= 0) {
            newOrder.splice(overIndex, 0, ...idsToAdd);
          } else {
            newOrder.push(...idsToAdd);
          }
          return { ...prev, [selectedDate]: newOrder };
        });
      }

      // Clear selection after dragging
      setSelectedRoutineIds(new Set());
      return;
    }

    // Case 3: Reordering within schedule
    if (activeId !== overId && scheduleOrder.includes(activeId) && scheduleOrder.includes(overId)) {
      // Check if activeId is part of multi-select
      const isMultiSelect = selectedScheduledIds.has(activeId);

      if (isMultiSelect) {
        // Move all selected routines together as a group
        const selectedIds = Array.from(selectedScheduledIds).filter(id => scheduleOrder.includes(id));
        const nonSelectedIds = scheduleOrder.filter(id => !selectedScheduledIds.has(id));
        const targetIndex = nonSelectedIds.indexOf(overId);

        // Insert selected items at target position
        const newOrder = [...nonSelectedIds];
        if (targetIndex >= 0) {
          newOrder.splice(targetIndex, 0, ...selectedIds);
        } else {
          newOrder.push(...selectedIds);
        }

        setScheduleByDate(prev => ({
          ...prev,
          [selectedDate]: newOrder,
        }));

        // Clear selection after move
        setSelectedScheduledIds(new Set());
      } else {
        // Single item move
        const oldIndex = scheduleOrder.indexOf(activeId);
        const newIndex = scheduleOrder.indexOf(overId);

        if (oldIndex >= 0 && newIndex >= 0) {
          setScheduleByDate(prev => ({
            ...prev,
            [selectedDate]: arrayMove(prev[selectedDate] || [], oldIndex, newIndex),
          }));
        }
      }
    }
  };

  // ===== HANDLERS =====

  // Helper: Get day start time in minutes from dayStartTimes
  const getDayStartMinutes = (date: string): number => {
    const storedStartTime = dayStartTimes?.find((dst: any) => {
      const dstDate = new Date(dst.date);
      const targetDate = new Date(date);
      return dstDate.getTime() === targetDate.getTime();
    });

    if (storedStartTime?.start_time) {
      const timeValue = new Date(storedStartTime.start_time);
      const hours = timeValue.getUTCHours();
      const minutes = timeValue.getUTCMinutes();
      return hours * 60 + minutes;
    }

    return 8 * 60; // Default to 8:00 AM
  };

  // Save ALL days (V1 parity - multi-day save with progress)
  const handleSaveAllDays = async () => {
    if (!routinesData) return;

    setIsSaving(true);
    const savedDays: string[] = [];
    const failedDays: string[] = [];

    try {
      for (let i = 0; i < COMPETITION_DATES.length; i++) {
        const date = COMPETITION_DATES[i];
        const daySchedule = scheduleByDate[date] || [];
        const routineIds = daySchedule.filter(id => !id.startsWith('block-'));

        // Update progress
        const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        setSaveProgress({
          current: i + 1,
          total: COMPETITION_DATES.length,
          currentDayName: dayName,
        });

        // Skip empty days
        if (routineIds.length === 0) {
          savedDays.push(dayName);
          continue;
        }

        // Calculate times with global entry numbers
        let currentMinutes = getDayStartMinutes(date); // Use configured start time
        const routinesToSave = routineIds.map((id) => {
          const routine = routinesMap.get(id);
          const duration = routine?.duration || 3;

          const hours = Math.floor(currentMinutes / 60);
          const mins = currentMinutes % 60;
          const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

          currentMinutes += duration;

          return {
            routineId: id,
            entryNumber: entryNumbersByRoutineId.get(id) ?? 100,
            performanceTime: timeString,
          };
        });

        try {
          await saveMutation.mutateAsync({
            tenantId: TEST_TENANT_ID,
            competitionId: TEST_COMPETITION_ID,
            date,
            routines: routinesToSave,
          });
          savedDays.push(dayName);
        } catch (error) {
          console.error(`[Save] Failed to save ${dayName}:`, error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          failedDays.push(`${dayName} (${errorMsg})`);
        }
      }

      // Show summary
      if (failedDays.length === 0) {
        toast.success(`✅ Saved all ${savedDays.length} days`);
      } else {
        console.error('[Save] Failed days:', failedDays);
        toast.error(`⚠️ Saved ${savedDays.length} days, but ${failedDays.length} failed. Check console for details.`);
      }

      await refetch();
    } finally {
      setIsSaving(false);
      setSaveProgress({ current: 0, total: 0, currentDayName: '' });
    }
  };

  // Save current day only (quick save)
  const handleSave = async () => {
    const routineIds = scheduleOrder.filter(id => !id.startsWith('block-'));

    let currentMinutes = getDayStartMinutes(selectedDate); // Use configured start time
    const routinesToSave = routineIds.map((id) => {
      const routine = routinesMap.get(id);
      const duration = routine?.duration || 3;

      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

      currentMinutes += duration;

      return {
        routineId: id,
        entryNumber: entryNumbersByRoutineId.get(id) ?? 100,
        performanceTime: timeString,
      };
    });

    try {
      await saveMutation.mutateAsync({
        tenantId: TEST_TENANT_ID,
        competitionId: TEST_COMPETITION_ID,
        date: selectedDate,
        routines: routinesToSave,
      });
      toast.success('Schedule saved!');
      await refetch();
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    }
  };

  // Discard changes (V1 parity)
  const handleDiscardChanges = () => {
    setScheduleByDate({});
    refetchBlocks();
    refetch();
    toast.success('Changes discarded');
  };

  // Toggle feedback (V1 parity)
  const handleToggleFeedback = () => {
    const newState = !versionData?.feedbackAllowed;
    toggleFeedbackMutation.mutate({
      tenantId: TEST_TENANT_ID,
      competitionId: TEST_COMPETITION_ID,
      enabled: newState,
    });
  };

  const handleCreateBlock = (type: 'award' | 'break') => {
    setBlockType(type);
    setShowBlockModal(true);
  };

  const handleUpdateBlock = async (blockId: string, title: string, duration: number) => {
    await updateBlockDetailsMutation.mutateAsync({
      blockId,
      title,
      duration,
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    setScheduleByDate(prev => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).filter(id => id !== `block-${blockId}`),
    }));

    // If temp block (not yet saved), just remove from local state
    if (blockId.startsWith('temp-')) {
      setTempBlocks(prev => {
        const next = new Map(prev);
        next.delete(blockId);
        return next;
      });
      return;
    }

    // Real database block - delete via mutation
    deleteBlockMutation.mutate({ blockId });
  };

  // View Studio Schedule (V1 parity)
  const handleViewStudioSchedule = () => {
    if (!allStudios?.studios || allStudios.studios.length === 0) {
      toast.error('No studios found');
      return;
    }
    setShowStudioPickerModal(true);
  };

  const handleSelectStudio = (studioId: string, studioName: string) => {
    const url = `/dashboard/schedules/${TEST_COMPETITION_ID}?tenantId=${TEST_TENANT_ID}&studioId=${studioId}`;
    toast.success(`Opening schedule for ${studioName}`);
    router.push(url);
    setShowStudioPickerModal(false);
  };

  // Select All / Deselect All handlers (V1 parity)
  const handleSelectAll = () => {
    const allIds = new Set(unscheduledRoutines.map(r => r.id));
    setSelectedRoutineIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedRoutineIds(new Set());
    setLastClickedRoutineId(null);
  };

  const handleExportPDF = async () => {
    // Save schedule first to ensure PDF reflects latest changes
    await handleSaveAllDays();

    // Get ALL scheduled routines across all days
    const allScheduled = (routinesData || [])
      .filter(r => r.isScheduled)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

    if (allScheduled.length === 0) {
      toast.error('No routines scheduled');
      return;
    }

    try {
      const doc = new jsPDF();
      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [99, 102, 241];
      };

      // App color palette: purple/indigo gradients
      const primaryBrand = hexToRgb(primaryColor);
      const purpleDark: [number, number, number] = [88, 28, 135];   // purple-900
      const indigoDark: [number, number, number] = [49, 46, 129];   // indigo-900
      const purpleLight: [number, number, number] = [147, 51, 234]; // purple-600

      // Elegant header with gradient-style coloring
      doc.setFillColor(...purpleDark);
      doc.rect(0, 0, 210, 55, 'F');

      // Add accent bar
      doc.setFillColor(...purpleLight);
      doc.rect(0, 0, 210, 3, 'F');

      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(tenant?.name || 'Competition Schedule', 14, 22);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(competition?.name || 'Performance Schedule', 14, 33);

      doc.setFontSize(10);
      doc.setTextColor(200, 200, 220);
      const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Complete Schedule • Generated ${dateStr}`, 14, 44);
      doc.text(`${allScheduled.length} Routines Scheduled`, 14, 50);

      let currentY = 65;
      let isFirstDay = true;

      // Loop through all competition dates
      COMPETITION_DATES.forEach((date, dayIndex) => {
        const dayScheduled = allScheduled.filter(r => r.scheduledDateString === date);
        if (dayScheduled.length === 0) return;

        // Add page break between days (except first)
        if (!isFirstDay) {
          doc.addPage();
          currentY = 20;
        }
        isFirstDay = false;

        // Day header with elegant styling
        const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        // Day header background
        doc.setFillColor(240, 240, 250);
        doc.rect(14, currentY - 5, 182, 12, 'F');

        // Day header text
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryBrand);
        doc.text(dayName, 18, currentY + 3);

        // Routine count badge
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 120);
        doc.text(`${dayScheduled.length} routines`, 175, currentY + 3);

        currentY += 15;

        // Build table data for this day
        const tableData = dayScheduled.map(r => [
          `#${r.entryNumber || ''}`,
          r.scheduledTimeString || '',
          r.title || '',
          r.studioName || '',
          r.classificationName || '',
          `${r.duration || 3} min`,
        ]);

        // Generate table with polished styling
        autoTable(doc, {
          startY: currentY,
          head: [['Entry', 'Time', 'Routine Title', 'Studio', 'Classification', 'Duration']],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [220, 220, 230],
            lineWidth: 0.1,
            textColor: [40, 40, 60],
          },
          headStyles: {
            fillColor: primaryBrand,
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 5,
          },
          columnStyles: {
            0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 70, fontStyle: 'bold' },
            3: { cellWidth: 45 },
            4: { cellWidth: 32 },
            5: { cellWidth: 18, halign: 'center' },
          },
          alternateRowStyles: {
            fillColor: [248, 248, 252],
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      });

      // Elegant footer on all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(200, 200, 220);
        doc.setLineWidth(0.5);
        doc.line(14, 280, 196, 280);

        // Footer text
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 140);
        doc.text(tenant?.name || 'Competition Schedule', 14, 287);
        doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
      }

      const filename = `${tenant?.slug || 'schedule'}-full-schedule.pdf`;
      doc.save(filename);
      toast.success(`📄 PDF exported: ${filename}`);
    } catch (error) {
      console.error('[PDF Export] Error:', error);
      toast.error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Fix All Day (V1 parity - uses autoFixDayConflicts)
  const handleFixAllDay = () => {
    if (dayConflictCount === 0) {
      toast.error('No conflicts to fix on this day');
      setShowFixAllModal(false);
      return;
    }

    const daySchedule = scheduleOrder.filter(id => !id.startsWith('block-')).map(id => {
      const routine = routinesMap.get(id);
      if (!routine) return null;
      return {
        id: routine.id,
        title: routine.title,
        entryNumber: entryNumbersByRoutineId.get(id),
        participants: (routine.dancer_names || []).map((name: string) => ({
          dancerId: name,
          dancerName: name,
        })),
        scheduledDateString: selectedDate,
      };
    }).filter(Boolean) as any[];

    // Build conflict objects for autoFixDayConflicts with required fields
    const dayConflicts = Array.from(conflictsMap.entries()).map(([routineId, info]) => {
      const dancerName = info.split(':')[0];
      const spacingMatch = info.match(/(\d+) routines between/);
      const routinesBetween = spacingMatch ? parseInt(spacingMatch[1]) : 0;

      return {
        routine1Id: routineId,
        routine2Id: routineId, // Will be refined by the algorithm
        dancerId: dancerName,
        dancerName: dancerName,
        routinesBetween,
        severity: (routinesBetween < 3 ? 'critical' : routinesBetween < 6 ? 'error' : 'warning') as 'critical' | 'error' | 'warning',
        message: info,
      };
    });

    const result = autoFixDayConflicts(daySchedule, dayConflicts);

    if (result.newSchedule) {
      const updatedOrder = result.newSchedule.map(r => r.id);
      setScheduleByDate(prev => ({ ...prev, [selectedDate]: updatedOrder }));

      if (result.resolvedConflicts > 0) {
        toast.success(`✅ Fixed ${result.resolvedConflicts} conflict(s), moved ${result.movedRoutines.length} routine(s)`);
      } else {
        toast.error('Could not auto-fix conflicts - try moving routines to different days');
      }
    }

    setShowFixAllModal(false);
  };

  // Fix All Weekend (V1 parity - uses autoFixWeekendConflicts)
  const handleFixAllWeekend = () => {
    // Build schedule for all days
    const scheduleByDateWithParticipants: Record<string, any[]> = {};
    const conflictsByDate: Record<string, any[]> = {};

    COMPETITION_DATES.forEach(date => {
      const daySchedule = (scheduleByDate[date] || []).filter(id => !id.startsWith('block-')).map(id => {
        const routine = routinesMap.get(id);
        if (!routine) return null;
        return {
          id: routine.id,
          title: routine.title,
          entryNumber: entryNumbersByRoutineId.get(id),
          participants: (routine.dancer_names || []).map((name: string) => ({
            dancerId: name,
            dancerName: name,
          })),
          scheduledDateString: date,
        };
      }).filter(Boolean) as any[];

      scheduleByDateWithParticipants[date] = daySchedule;

      // Compute conflicts for this day
      const dayConflicts: any[] = [];
      const MIN_SPACING = 6;
      const dancerPositions = new Map<string, number[]>();

      daySchedule.forEach((routine, index) => {
        routine.participants?.forEach((p: any) => {
          if (!dancerPositions.has(p.dancerName)) dancerPositions.set(p.dancerName, []);
          dancerPositions.get(p.dancerName)!.push(index);
        });
      });

      dancerPositions.forEach((positions, dancer) => {
        for (let i = 0; i < positions.length - 1; i++) {
          const spacing = positions[i + 1] - positions[i] - 1;
          if (spacing < MIN_SPACING) {
            dayConflicts.push({
              routine1Id: daySchedule[positions[i]].id,
              routine2Id: daySchedule[positions[i + 1]].id,
              dancerId: dancer,
              dancerName: dancer,
              routinesBetween: spacing,
              severity: (spacing < 3 ? 'critical' : spacing < 6 ? 'error' : 'warning') as 'critical' | 'error' | 'warning',
              message: `${dancer}: ${spacing} routines between (need ${MIN_SPACING})`,
            });
          }
        }
      });

      if (dayConflicts.length > 0) {
        conflictsByDate[date] = dayConflicts;
      }
    });

    const results = autoFixWeekendConflicts(scheduleByDateWithParticipants, conflictsByDate);

    // Update all days
    let totalMoved = 0;
    let totalResolved = 0;

    setScheduleByDate(prev => {
      const updated = { ...prev };
      for (const [date, result] of Object.entries(results)) {
        if (result.newSchedule && result.movedRoutines.length > 0) {
          updated[date] = result.newSchedule.map(r => r.id);
          totalMoved += result.movedRoutines.length;
          totalResolved += result.resolvedConflicts;
        }
      }
      return updated;
    });

    if (totalResolved > 0) {
      toast.success(`✅ Fixed ${totalResolved} conflict(s) across all days, moved ${totalMoved} routine(s)`);
    } else {
      toast.error('Could not auto-fix weekend conflicts - schedules may be too dense');
    }

    setShowFixAllModal(false);
  };

  // Day start time update handler (V1 parity)
  const handleStartTimeUpdated = async (date: string, newStartTime: string) => {
    console.log('[V2] Day start time updated:', date, newStartTime);
    await refetchDayStartTimes();
    await refetch();

    // Reload draft from database
    const updatedRoutines = await utils.scheduling.getRoutines.fetch({
      competitionId: TEST_COMPETITION_ID,
      tenantId: TEST_TENANT_ID,
    });

    const serverScheduled = updatedRoutines
      .filter(r => r.isScheduled && r.scheduledDateString === date)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

    if (serverScheduled.length > 0) {
      setScheduleByDate(prev => ({
        ...prev,
        [date]: serverScheduled.map(r => r.id),
      }));
    }
  };

  // Edit day start time handler (V1 parity)
  const handleEditStartTime = (date: string, currentTime: string) => {
    setEditingDate(date);
    setEditingStartTime(currentTime.slice(0, 5)); // HH:mm format
    setShowEditStartTimeModal(true);
  };

  const handleSaveStartTime = async () => {
    if (!editingDate || !editingStartTime) return;

    try {
      await updateDayStartTimeMutation.mutateAsync({
        tenantId: TEST_TENANT_ID,
        competitionId: TEST_COMPETITION_ID,
        date: editingDate,
        newStartTime: `${editingStartTime}:00`, // Convert HH:mm to HH:mm:ss
      });
      setShowEditStartTimeModal(false);
    } catch (error) {
      console.error('Failed to update start time:', error);
    }
  };

  // Get active item for overlay
  const activeRoutine = activeId && !activeId.startsWith('block-') ? routinesMap.get(activeId) : null;

  // ===== RENDER =====
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Saving Progress Overlay */}
      {isSaving && (
        <ScheduleSavingProgress
          currentDay={saveProgress.current}
          totalDays={saveProgress.total}
          currentDayName={saveProgress.currentDayName}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-500/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Schedule V2</h1>
              {/* Version Indicator */}
              {versionData && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white/90">
                    {versionData.versionDisplay || `Version ${versionData.versionNumber}`}
                  </span>
                  {versionData.isPublished && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/50">
                      ✓ Published
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="text-xs text-purple-200 hover:text-white flex items-center gap-1"
              >
                <History className="h-3 w-3" />
                {showVersionHistory ? 'Hide' : 'View'} History
              </button>
            </div>
            <p className="text-sm text-purple-100 mt-1">
              {competition?.name || 'Test Competition'} • {selectedDate} • {scheduleOrder.filter(id => !id.startsWith('block-')).length} scheduled
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Feedback Toggle (V1 parity) */}
            {versionData && (
              <button
                onClick={handleToggleFeedback}
                disabled={toggleFeedbackMutation.isPending}
                className={`px-3 py-2 font-semibold rounded-lg transition-all flex items-center gap-2 text-sm ${
                  versionData.feedbackAllowed
                    ? 'bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30'
                    : 'bg-gray-500/20 text-gray-300 border border-gray-500/50 hover:bg-gray-500/30'
                }`}
                title={versionData.feedbackAllowed ? 'Click to close feedback' : 'Click to open feedback'}
              >
                {versionData.feedbackAllowed ? '🟢 Feedback Open' : '⭕ Feedback Closed'}
              </button>
            )}

            {/* Fix All Conflicts Button (V1 parity - header button with count) */}
            {dayConflictCount > 0 && (
              <button
                onClick={() => setShowFixAllModal(true)}
                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-sm"
                title={`${dayConflictCount} conflict${dayConflictCount !== 1 ? 's' : ''} detected`}
              >
                <span>🔧</span>
                <span>Fix All Conflicts</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-bold min-w-[1.5rem] text-center">
                  {dayConflictCount}
                </span>
              </button>
            )}
            
            {/* Schedule Selected button */}
            {selectedRoutineIds.size > 0 && (
              <button
                onClick={() => {
                  const idsToAdd = Array.from(selectedRoutineIds).filter(id => !scheduleOrder.includes(id));
                  if (idsToAdd.length > 0) {
                    setScheduleByDate(prev => ({
                      ...prev,
                      [selectedDate]: [...(prev[selectedDate] || []), ...idsToAdd],
                    }));
                    toast.success(`Added ${idsToAdd.length} routines to schedule`);
                  }
                  setSelectedRoutineIds(new Set());
                }}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                📥 Schedule {selectedRoutineIds.size} Selected
              </button>
            )}

            {/* Unschedule Selected button */}
            {selectedScheduledIds.size > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Unschedule ${selectedScheduledIds.size} selected routine(s)?`)) {
                    setScheduleByDate(prev => ({
                      ...prev,
                      [selectedDate]: (prev[selectedDate] || []).filter(id => !selectedScheduledIds.has(id)),
                    }));
                    toast.success(`Unscheduled ${selectedScheduledIds.size} routines`);
                    setSelectedScheduledIds(new Set());
                    setLastClickedScheduledRoutineId(null);
                  }
                }}
                className="px-3 py-2 bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ↩️ Unschedule ({selectedScheduledIds.size})
              </button>
            )}

            {/* Save button (multi-day) */}
            {hasAnyUnsavedChanges && (
              <>
                <button
                  onClick={handleSaveAllDays}
                  disabled={saveMutation.isPending || isSaving}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  💾 Save Schedule
                </button>
                <button
                  onClick={handleDiscardChanges}
                  className="px-3 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                >
                  ❌ Discard
                </button>
                <span className="text-yellow-300 text-sm font-medium">● Unsaved</span>
              </>
            )}
            
            {/* Refresh button */}
            <button
              onClick={() => { refetch(); refetchBlocks(); }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
            >
              🔄
            </button>

            {/* Reset Day button */}
            <button
              onClick={() => {
                const routineCount = scheduleOrder.filter(id => !id.startsWith('block-')).length;
                if (confirm(`Clear schedule for ${selectedDate}? This will unschedule all ${routineCount} routines and delete blocks.`)) {
                  resetDayMutation.mutate({
                    tenantId: TEST_TENANT_ID,
                    competitionId: TEST_COMPETITION_ID,
                    date: selectedDate,
                  });
                }
              }}
              disabled={resetDayMutation.isPending}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              🗑️ Reset Day
            </button>

            {/* Reset All button */}
            <button
              onClick={() => setShowResetAllModal(true)}
              disabled={resetCompetitionMutation.isPending}
              className="px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-200 text-sm font-semibold rounded-lg transition-colors border border-orange-600/30 disabled:opacity-50"
            >
              ⚠️ Reset All
            </button>
            
            {/* PDF Export button */}
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
            >
              📄 Export PDF
            </button>

            {/* Save Major Draft and Send to Studios button (V1 parity) */}
            <button
              onClick={async () => {
                await handleSaveAllDays();
                // Publish version creates major version (1, 2, 3) visible to studios
                await publishVersionMutation.mutateAsync({
                  tenantId: TEST_TENANT_ID,
                  competitionId: TEST_COMPETITION_ID,
                });
                setShowSendModal(true);
              }}
              className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 text-sm font-semibold rounded-lg transition-colors border border-green-500/30"
              title="Save schedule as major draft and send to studios"
            >
              💾📧 Save Draft & Send
            </button>

            {/* View Studio Schedule button */}
            <button
              onClick={handleViewStudioSchedule}
              className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-sm font-semibold rounded-lg transition-colors border border-purple-500/30"
              title="View schedule from a studio's perspective"
            >
              <Eye className="h-4 w-4 inline mr-1" />
              View Studio
            </button>

            {/* Publish button */}
            {versionData && !versionData.isPublished && !hasAnyUnsavedChanges && (
              <button
                onClick={() => {
                  if (confirm('Publish this version to studios?')) {
                    publishVersionMutation.mutate({
                      tenantId: TEST_TENANT_ID,
                      competitionId: TEST_COMPETITION_ID,
                    });
                  }
                }}
                disabled={publishVersionMutation.isPending}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Mail className="h-4 w-4 inline mr-1" />
                Publish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Single DndContext wrapping both day tabs/block buttons AND main content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Main Content */}
        <div className="px-6 py-2">
          <div className="grid grid-cols-3 gap-4">
            {/* Left: Unscheduled Pool */}
            <div className="col-span-1">
              <DroppableUnscheduledPool
                routines={unscheduledRoutines}
                selectedIds={selectedRoutineIds}
                onToggleSelection={(id, shift) => {
                  setSelectedRoutineIds(prev => {
                    const next = new Set(prev);

                    if (shift && lastClickedRoutineId && unscheduledRoutines.length > 0) {
                      const lastIndex = unscheduledRoutines.findIndex(r => r.id === lastClickedRoutineId);
                      const currentIndex = unscheduledRoutines.findIndex(r => r.id === id);

                      if (lastIndex !== -1 && currentIndex !== -1) {
                        const start = Math.min(lastIndex, currentIndex);
                        const end = Math.max(lastIndex, currentIndex);

                        for (let i = start; i <= end; i++) {
                          next.add(unscheduledRoutines[i].id);
                        }
                        setLastClickedRoutineId(id);
                        return next;
                      }
                    }

                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    setLastClickedRoutineId(id);
                    return next;
                  });
                }}
                filters={filters}
                onFiltersChange={setFilters}
                filterOptions={filterOptions}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />
            </div>

            {/* Right: Schedule Table */}
            <div className="col-span-2">
              {/* Day Tabs + Block Buttons - Above Schedule Table (V1 layout) */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <DayTabs
                  days={competitionDates}
                  activeDay={selectedDate}
                  onDayChange={(date) => setSelectedDate(date)}
                  competitionId={TEST_COMPETITION_ID}
                  tenantId={TEST_TENANT_ID}
                  onStartTimeUpdated={handleStartTimeUpdated}
                  onResetDay={() => {
                    if (confirm(`Reset schedule for ${selectedDate}?`)) {
                      resetDayMutation.mutate({
                        tenantId: TEST_TENANT_ID,
                        competitionId: TEST_COMPETITION_ID,
                        date: selectedDate,
                      });
                    }
                  }}
                  onResetAll={() => setShowResetAllModal(true)}
                />

                {/* Draggable Block Buttons - Inline */}
                <div className="flex gap-3 flex-shrink-0">
                  <DraggableBlockCard
                    type="award"
                    onClick={() => handleCreateBlock('award')}
                  />
                  <DraggableBlockCard
                    type="break"
                    onClick={() => handleCreateBlock('break')}
                  />
                </div>
              </div>

              <DroppableScheduleTable
                scheduleOrder={scheduleOrder}
                routinesMap={routinesMap}
                blocksMap={blocksMap}
                trophyIds={trophyIds}
                conflictsMap={conflictsMap}
                sessionColors={sessionColors}
                dayStartMinutes={getDayStartMinutes(selectedDate)}
                entryNumbersByRoutineId={entryNumbersByRoutineId}
                onDeleteBlock={handleDeleteBlock}
                onEditBlock={(block) => {
                  // Find routine number that comes before this block for auto-population
                  const daySchedule = scheduleByDate[selectedDate] || [];
                  const blockPosition = daySchedule.indexOf(`block-${block.id}`);
                  let routineNumber: number | undefined;

                  // Look backwards from block position to find the previous routine
                  if (blockPosition > 0) {
                    for (let i = blockPosition - 1; i >= 0; i--) {
                      const itemId = daySchedule[i];
                      if (!itemId.startsWith('block-')) {
                        // Found a routine - get its entry number
                        routineNumber = entryNumbersByRoutineId.get(itemId);
                        break;
                      }
                    }
                  }

                  setEditingBlock({
                    id: block.id,
                    type: block.block_type,
                    title: block.title,
                    duration: block.duration_minutes,
                    placement: routineNumber ? { routineNumber } : undefined,
                  });
                  setShowBlockModal(true);
                }}
                onUnscheduleRoutine={(routineId) => {
                  setScheduleByDate(prev => ({
                    ...prev,
                    [selectedDate]: (prev[selectedDate] || []).filter(id => id !== routineId),
                  }));
                }}
                selectedScheduledIds={selectedScheduledIds}
                setSelectedScheduledIds={setSelectedScheduledIds}
                lastClickedScheduledRoutineId={lastClickedScheduledRoutineId}
                setLastClickedScheduledRoutineId={setLastClickedScheduledRoutineId}
              />
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeRoutine && (
              <div className="p-3 rounded-lg bg-purple-600 border-2 border-purple-400 shadow-xl opacity-90 max-w-xs">
                <div className="font-medium text-white truncate">{activeRoutine.title}</div>
                <div className="text-xs text-white/70">{activeRoutine.studioCode} • {activeRoutine.duration}m</div>
              </div>
            )}
            {activeId?.startsWith('template-') && (
              <div className={`px-4 py-3 rounded-lg border-2 border-dashed shadow-xl opacity-90 ${
                activeId === 'template-award'
                  ? 'bg-amber-500/80 border-amber-400 text-white'
                  : 'bg-cyan-500/80 border-cyan-400 text-white'
              }`}>
                <span className="font-semibold">
                  {activeId === 'template-award' ? '🏆 Adjudication Ceremony' : '☕ Break'}
                </span>
              </div>
            )}
          </DragOverlay>
        </div>
      </DndContext>

      {/* Block Modal */}
      <ScheduleBlockModal
        isOpen={showBlockModal}
        onClose={() => {
          setShowBlockModal(false);
          setEditingBlock(null);
        }}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        mode={editingBlock ? "edit" : "create"}
        initialBlock={editingBlock ? {
          id: editingBlock.id,
          type: editingBlock.type,
          title: editingBlock.title,
          duration: editingBlock.duration,
          placement: editingBlock.placement,
        } : null}
        preselectedType={blockType}
        onSave={async (block) => {
          if (editingBlock) {
            await handleUpdateBlock(editingBlock.id, block.title, block.duration);
          } else {
            // Create block via mutation
            await createBlockMutation.mutateAsync({
              competitionId: TEST_COMPETITION_ID,
              tenantId: TEST_TENANT_ID,
              blockType: block.type,
              title: block.title,
              durationMinutes: block.duration,
              scheduledTime: new Date(`${selectedDate}T00:00:00`),
              sortOrder: scheduleOrder.length,
            });
          }
          setShowBlockModal(false);
          setEditingBlock(null);
        }}
      />

      {/* Studio Codes Modal */}
      <AssignStudioCodesModal
        isOpen={showStudioCodeModal}
        onClose={() => setShowStudioCodeModal(false)}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        onAssignComplete={() => {
          setShowStudioCodeModal(false);
          refetch();
        }}
      />

      {/* Send to Studios Modal */}
      {versionData && (
        <SendToStudiosModal
          open={showSendModal}
          onClose={() => setShowSendModal(false)}
          competitionId={TEST_COMPETITION_ID}
          tenantId={TEST_TENANT_ID}
          versionDisplay={versionData.versionDisplay}
          majorVersion={versionData.majorVersion}
          minorVersion={versionData.minorVersion}
          onSuccess={() => {
            refetchVersion();
            refetchHistory();
          }}
          onSaveBeforeSend={async () => {
            if (hasAnyUnsavedChanges) {
              await handleSaveAllDays();
            }
          }}
        />
      )}

      {/* Fix All Conflicts Modal (V1 parity - Day vs Weekend) */}
      <Modal
        isOpen={showFixAllModal}
        onClose={() => setShowFixAllModal(false)}
        title="Auto-Fix Conflicts"
      >
        <div className="space-y-4 p-4">
          <p className="text-gray-700">
            Select which conflicts to automatically fix. The system will move routines the minimum distance necessary to resolve conflicts.
          </p>

          <div className="grid gap-3">
            {/* Fix This Day */}
            <button
              onClick={handleFixAllDay}
              className="p-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <span className="text-xl">🔧</span>
                    Fix This Day Only
                  </div>
                  <div className="text-sm text-white/80 mt-1">
                    Resolve {dayConflictCount} conflict{dayConflictCount !== 1 ? 's' : ''} on {selectedDate}
                  </div>
                </div>
                <span className="text-2xl group-hover:scale-110 transition-transform">→</span>
              </div>
            </button>

            {/* Fix Entire Weekend */}
            <button
              onClick={handleFixAllWeekend}
              className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <span className="text-xl">🔧</span>
                    Fix Entire Weekend
                  </div>
                  <div className="text-sm text-white/80 mt-1">
                    Resolve conflicts across all competition days (Apr 9-12)
                  </div>
                </div>
                <span className="text-2xl group-hover:scale-110 transition-transform">→</span>
              </div>
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowFixAllModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset All Confirmation Modal */}
      <ResetAllConfirmationModal
        isOpen={showResetAllModal}
        onClose={() => setShowResetAllModal(false)}
        onConfirm={() => {
          resetCompetitionMutation.mutate({
            tenantId: TEST_TENANT_ID,
            competitionId: TEST_COMPETITION_ID,
          }, {
            onSuccess: () => setShowResetAllModal(false),
          });
        }}
        isLoading={resetCompetitionMutation.isPending}
      />

      {/* Studio Picker Modal */}
      <Modal
        isOpen={showStudioPickerModal}
        onClose={() => setShowStudioPickerModal(false)}
        title="Select Studio Schedule to View"
      >
        <div className="p-6 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
          <p className="text-purple-200 mb-4">
            Choose a studio to preview their interactive schedule view:
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {allStudios?.studios?.map((studio) => (
              <button
                key={studio.id}
                onClick={() => handleSelectStudio(studio.id, studio.name)}
                className="w-full text-left px-4 py-3 bg-purple-800/30 hover:bg-purple-700/50 rounded-lg transition-all border border-purple-600/30 hover:border-cyan-500/50"
              >
                <div className="font-medium text-white">{studio.name}</div>
                <div className="text-sm text-purple-300">
                  {studio.publicCode || 'No code assigned'}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowStudioPickerModal(false)}
              className="px-4 py-2 bg-purple-600/30 text-purple-200 rounded-lg hover:bg-purple-600/50 border border-purple-500/50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Version History Panel */}
      {showVersionHistory && versionHistory && (
        <div className="fixed right-4 top-20 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-40 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5 text-gray-600" />
                Version History
              </h3>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {versionHistory.map((v: any) => (
              <div key={v.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">V{v.versionNumber}</span>
                  {v.isPublished && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Published
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(v.createdAt).toLocaleString()}
                </p>
                {v.publishedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Published: {new Date(v.publishedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Day Start Time Modal (V1 parity - alternative to DayTabs inline edit) */}
      {showEditStartTimeModal && editingDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Day Start Time</h3>
            <p className="text-gray-300 text-sm mb-4">
              This will recalculate all routine times for {new Date(editingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <input
              type="time"
              value={editingStartTime}
              onChange={(e) => setEditingStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEditStartTimeModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStartTime}
                disabled={updateDayStartTimeMutation.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50"
              >
                {updateDayStartTimeMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== DROPPABLE UNSCHEDULED POOL =====
function DroppableUnscheduledPool({
  routines,
  selectedIds,
  onToggleSelection,
  filters,
  onFiltersChange,
  filterOptions,
  onSelectAll,
  onDeselectAll,
}: {
  routines: any[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string, shift: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filterOptions: any;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled-pool' });

  // Build notes maps from routines data
  const routineNotes: Record<string, boolean> = {};
  const routineNotesText: Record<string, string> = {};

  routines.forEach(routine => {
    if (routine.has_studio_requests || routine.scheduling_notes) {
      routineNotes[routine.id] = true;
      routineNotesText[routine.id] = routine.scheduling_notes || 'Has studio requests';
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? 'ring-2 ring-purple-400' : ''}`}
    >
      <RoutinePool
        routines={routines}
        viewMode="cd"
        classifications={filterOptions.classifications}
        ageGroups={filterOptions.ageGroups}
        genres={filterOptions.genres}
        groupSizes={filterOptions.groupSizes}
        studios={filterOptions.studios}
        routineAges={[]}
        filters={filters}
        onFiltersChange={onFiltersChange}
        totalRoutines={routines.length}
        filteredRoutines={routines.length}
        selectedRoutineIds={selectedIds}
        onToggleSelection={onToggleSelection}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        routineNotes={routineNotes}
        routineNotesText={routineNotesText}
      />
    </div>
  );
}
