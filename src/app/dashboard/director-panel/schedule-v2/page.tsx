'use client';

/**
 * Schedule V2 - Simplified Implementation
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

import { useState, useMemo, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
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
import { Mail, History, Eye, FileText, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { autoFixRoutineConflict, autoFixDayConflicts, autoFixWeekendConflicts } from '@/lib/conflictAutoFix';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

// Constants
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';
const COMPETITION_DATES = ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'];

// ===================== COMPONENTS =====================

function DraggableBlockCard({ type, label }: { type: 'award' | 'break'; label: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `template-${type}`,
    data: { type: 'template', blockType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`px-4 py-3 rounded-lg border-2 border-dashed cursor-grab active:cursor-grabbing transition-all hover:scale-105 ${
        type === 'award'
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
          : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
      }`}
    >
      <span className="font-semibold">{label}</span>
    </div>
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
        <td className="px-1 py-2" style={{ width: '36px' }}></td>
        <td className="px-1 py-2 text-lg" style={{ width: '30px' }}>{isAward ? '🏆' : '☕'}</td>
        <td className="px-1 py-2 font-mono text-sm text-white/90" style={{ width: '70px' }}>{timeString}</td>
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
        className={`border-b border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors ${sessionColor} ${
          hasConflict ? 'border-l-4 border-l-red-500' : ''
        }`}
      >
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
        <td className="px-1 py-2 text-sm font-bold text-white" style={{ width: '30px' }}>
          #{entryNumber}
        </td>
        
        {/* Time */}
        <td className="px-1 py-2 font-mono text-sm text-white/90" style={{ width: '70px' }}>
          {timeString}
        </td>
        
        {/* Title */}
        <td className="px-2 py-2 text-sm font-medium text-white truncate" style={{ maxWidth: '180px', width: '180px' }} title={routine.title}>
          {routine.title}
        </td>
        
        {/* Studio */}
        <td className="px-2 py-2 text-xs text-white/80 text-center" style={{ width: '50px' }}>
          {routine.studioCode}
        </td>
        
        {/* Classification */}
        <td className="px-2 py-2" style={{ width: '90px' }}>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getClassificationColor(routine.classificationName)}`}>
            {routine.classificationName}
          </span>
        </td>
        
        {/* Size */}
        <td className="px-2 py-2 text-xs text-white/80" style={{ width: '80px' }}>
          {routine.entrySizeName}
        </td>
        
        {/* Age */}
        <td className="px-2 py-2 text-xs text-white/80 text-center" style={{ width: '50px' }}>
          {routine.routineAge ?? '-'}
        </td>
        
        {/* Duration */}
        <td className="px-2 py-2 text-xs text-white/80 text-center" style={{ width: '50px' }}>
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
  onDeleteBlock,
  onEditBlock,
  onUnscheduleRoutine,
}: {
  scheduleOrder: string[];
  routinesMap: Map<string, RoutineData>;
  blocksMap: Map<string, BlockData>;
  trophyIds: Set<string>;
  conflictsMap: Map<string, string>;
  sessionColors: Map<string, string>;
  dayStartMinutes: number;
  onDeleteBlock: (blockId: string) => void;
  onEditBlock: (block: BlockData) => void;
  onUnscheduleRoutine: (routineId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'schedule-drop-zone' });

  // Calculate times and entry numbers
  let currentMinutes = dayStartMinutes;
  let entryNumber = 100;

  const rows = scheduleOrder.map((id) => {
    const isBlock = id.startsWith('block-');
    const actualId = isBlock ? id.replace('block-', '') : id;
    
    const routine = !isBlock ? routinesMap.get(actualId) : undefined;
    const block = isBlock ? blocksMap.get(actualId) : undefined;
    
    const duration = routine?.duration || block?.duration_minutes || 0;
    const timeFormatted = formatTime(currentMinutes);
    const timeString = `${timeFormatted.time} ${timeFormatted.period}`;
    
    const thisEntryNumber = !isBlock ? entryNumber++ : 0;
    
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
              <th className="px-1 py-2 text-xs font-semibold text-white/80 text-center" style={{ width: '36px' }}>●</th>
              <th className="px-1 py-2 text-xs font-semibold text-white text-left" style={{ width: '30px' }}>#</th>
              <th className="px-1 py-2 text-xs font-semibold text-white text-left" style={{ width: '70px' }}>TIME</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ maxWidth: '200px' }}>ROUTINE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '50px' }}>STD</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ width: '90px' }}>CLASS</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ width: '80px' }}>SIZE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '50px' }}>AGE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '50px' }}>DUR</th>
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
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockType, setBlockType] = useState<'award' | 'break'>('award');
  const [editingBlock, setEditingBlock] = useState<{ id: string; type: 'award' | 'break'; title: string; duration: number } | null>(null);
  
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

  const saveMutation = trpc.scheduling.schedule.useMutation({
    onSuccess: () => {
      toast.success('Schedule saved!');
      refetch();
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

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

  const { data: dayStartTimes, refetch: refetchDayStartTimes } = trpc.scheduling.getDayStartTimes.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
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

  const blocksMap = useMemo(() => {
    const map = new Map<string, BlockData>();
    (blocksData || []).forEach(b => {
      map.set(b.id, {
        id: b.id,
        block_type: b.block_type as 'award' | 'break',
        title: b.title,
        duration_minutes: b.duration_minutes,
      });
    });
    return map;
  }, [blocksData]);

  // ===== INITIALIZE FROM DB (ALL DAYS) =====
  useEffect(() => {
    if (!routinesData) return;

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
  const trophyIds = useMemo(() => {
    const trophies = new Set<string>();
    const categoryLastRoutine = new Map<string, string>();

    // Find last routine per category in schedule
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
          conflicts.set(id1, `${dancer}: ${spacing} routines between (need ${MIN_SPACING})`);
          conflicts.set(id2, `${dancer}: ${spacing} routines between (need ${MIN_SPACING})`);
        }
      }
    });

    return conflicts;
  }, [scheduleOrder, routinesMap]);

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
    return COMPETITION_DATES.map(date => ({
      date,
      startTime: '08:00:00',
      routineCount: (scheduleByDate[date] || []).filter(id => !id.startsWith('block-')).length,
      savedRoutineCount: (routinesData || []).filter(r => r.isScheduled && r.scheduledDateString === date).length,
    }));
  }, [scheduleByDate, routinesData]);

  // ===== COMPUTED: Has Changes =====
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

  // ===== AUTOSAVE EFFECT =====
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      if (!hasChanges) return;
      if (scheduleOrder.length === 0) return;
      if (saveMutation.isPending) return;

      console.log('[Autosave] Saving schedule...');
      handleSave();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autosaveInterval);
  }, [hasChanges, scheduleOrder, saveMutation.isPending]);

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
      handleCreateBlock(blockType);
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
      // Dropping on the schedule drop zone or a specific item
      if (overId === 'schedule-drop-zone') {
        // Drop at end of schedule
        setScheduleByDate(prev => ({
          ...prev,
          [selectedDate]: [...(prev[selectedDate] || []), activeId],
        }));
      } else {
        // Drop at specific position
        const overIndex = scheduleOrder.indexOf(overId);
        setScheduleByDate(prev => {
          const newOrder = [...(prev[selectedDate] || [])];
          if (overIndex >= 0) {
            newOrder.splice(overIndex, 0, activeId);
          } else {
            newOrder.push(activeId);
          }
          return { ...prev, [selectedDate]: newOrder };
        });
      }
      return;
    }

    // Case 3: Reordering within schedule
    if (activeId !== overId && scheduleOrder.includes(activeId) && scheduleOrder.includes(overId)) {
      const oldIndex = scheduleOrder.indexOf(activeId);
      const newIndex = scheduleOrder.indexOf(overId);
      
      if (oldIndex >= 0 && newIndex >= 0) {
        setScheduleByDate(prev => ({
          ...prev,
          [selectedDate]: arrayMove(prev[selectedDate] || [], oldIndex, newIndex),
        }));
      }
    }
  };

  // ===== HANDLERS =====
  const handleSave = async () => {
    const routineIds = scheduleOrder.filter(id => !id.startsWith('block-'));

    let currentMinutes = 8 * 60; // 8:00 AM
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

    await saveMutation.mutateAsync({
      tenantId: TEST_TENANT_ID,
      competitionId: TEST_COMPETITION_ID,
      date: selectedDate,
      routines: routinesToSave,
    });
  };

  const handleCreateBlock = async (type: 'award' | 'break') => {
    const title = type === 'award' ? 'Award Ceremony' : '30 Minute Break';
    const duration = 30;
    
    // Calculate time based on current schedule end
    let currentMinutes = 8 * 60;
    scheduleOrder.forEach(id => {
      const routine = routinesMap.get(id.replace('block-', ''));
      const block = blocksMap.get(id.replace('block-', ''));
      currentMinutes += routine?.duration || block?.duration_minutes || 0;
    });

    const [year, month, day] = selectedDate.split('-').map(Number);
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const scheduledTime = new Date(year, month - 1, day, hours, mins, 0);

    await createBlockMutation.mutateAsync({
      competitionId: TEST_COMPETITION_ID,
      tenantId: TEST_TENANT_ID,
      blockType: type,
      title,
      durationMinutes: duration,
      scheduledTime,
      sortOrder: scheduleOrder.length,
    });
  };

  const handleUpdateBlock = async (blockId: string, title: string, duration: number) => {
    await updateBlockDetailsMutation.mutateAsync({
      blockId,
      title,
      duration,
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    // Remove from local state
    setScheduleByDate(prev => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).filter(id => id !== `block-${blockId}`),
    }));
    // Delete from DB
    deleteBlockMutation.mutate({ blockId });
  };

  const handleExportPDF = () => {
    const scheduled = (routinesData || [])
      .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

    if (scheduled.length === 0) {
      toast.error('No routines scheduled for this day');
      return;
    }

    try {
      const doc = new jsPDF();

      // Convert hex color to RGB for jsPDF
      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
          : [99, 102, 241]; // Fallback indigo
      };

      const brandColor = hexToRgb(primaryColor);

      // Header with tenant branding
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(tenant?.name || 'Competition Schedule', 14, 18);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(competition?.name || 'Performance Schedule', 14, 28);

      doc.setFontSize(11);
      doc.setTextColor(240, 240, 240);
      doc.text(`📅 ${selectedDate}  •  Generated: ${new Date().toLocaleDateString()}`, 14, 37);

      doc.setTextColor(0, 0, 0);

      // Merge routines and blocks
      const scheduleItems: Array<{ type: 'routine' | 'block'; data: any }> = [];
      scheduled.forEach(r => scheduleItems.push({ type: 'routine', data: r }));
      (blocksData || []).forEach(block => scheduleItems.push({ type: 'block', data: block }));

      scheduleItems.sort((a, b) => {
        const timeA = a.type === 'routine' ? a.data.scheduledTimeString : a.data.scheduled_time?.toTimeString().split(' ')[0];
        const timeB = b.type === 'routine' ? b.data.scheduledTimeString : b.data.scheduled_time?.toTimeString().split(' ')[0];
        if (!timeA || !timeB) return 0;
        return timeA.localeCompare(timeB);
      });

      const tableData = scheduleItems.map(item => {
        if (item.type === 'routine') {
          const r = item.data;
          return [
            `#${r.entryNumber || ''}`,
            r.scheduledTimeString || '',
            r.title,
            r.studioName || '',
            r.classificationName || '',
            r.categoryName || '',
            `${r.duration} min`,
          ];
        } else {
          const block = item.data;
          const time = block.scheduled_time ? block.scheduled_time.toTimeString().split(' ')[0].substring(0, 5) : '';
          if (block.block_type === 'award') {
            return ['🏆', time, `AWARDS: ${block.title || 'Award Ceremony'}`, '', '', '', `${block.duration_minutes || 30} min`];
          } else {
            return ['☕', time, `BREAK: ${block.title || 'Break'}`, '', '', '', `${block.duration_minutes || 30} min`];
          }
        }
      });

      autoTable(doc, {
        startY: 50,
        head: [['#', 'Time', 'Title', 'Studio', 'Classification', 'Category', 'Duration']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: brandColor, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'left' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 52 },
          3: { cellWidth: 32 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
          6: { cellWidth: 18, halign: 'center' },
        },
        didParseCell: (data) => {
          const rowData = data.row.raw as string[];
          if (rowData[0] === '🏆') {
            data.cell.styles.fillColor = [255, 250, 235];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [150, 100, 0];
          } else if (rowData[0] === '☕') {
            data.cell.styles.fillColor = [235, 245, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [50, 100, 150];
          }
        },
        alternateRowStyles: { fillColor: [249, 249, 249] },
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`${tenant?.name || 'Competition'} • Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      }

      const filename = `${tenant?.slug || 'schedule'}-schedule-${selectedDate}.pdf`;
      doc.save(filename);
      toast.success(`📄 PDF exported: ${filename}`);
    } catch (error) {
      console.error('[PDF Export] Error:', error);
      toast.error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFixSingleConflict = (routineId: string) => {
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

    const { success, newSchedule, result } = autoFixRoutineConflict(routineId, daySchedule);

    if (success && newSchedule) {
      const updatedOrder = newSchedule.map(r => r.id);
      setScheduleByDate(prev => ({ ...prev, [selectedDate]: updatedOrder }));

      const movedRoutine = result.movedRoutines[0];
      if (movedRoutine) {
        const newEntryNumber = entryNumbersByRoutineId.get(routineId) || '?';
        toast.success(`Auto-fix: Moved routine to position ${movedRoutine.toPosition + 1} → Entry #${newEntryNumber}`);
      }
    } else {
      const unresolvedReason = result.unresolvedConflicts[0]?.reason || 'Failed to auto-fix conflict';
      toast.error(unresolvedReason);
    }
  };

  const handleFixAllDay = () => {
    const dayConflicts = Array.from(conflictsMap.entries());

    if (dayConflicts.length === 0) {
      toast.error('No conflicts to fix on this day');
      setShowFixAllModal(false);
      return;
    }

    let fixedCount = 0;
    dayConflicts.forEach(([routineId]) => {
      handleFixSingleConflict(routineId);
      fixedCount++;
    });

    toast.success(`Auto-fixed ${fixedCount} conflicts`);
    setShowFixAllModal(false);
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
            {/* Conflict indicator + Auto-fix */}
            {conflictsMap.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-500/30 border border-red-500/50 rounded-lg text-red-200 text-sm font-medium">
                  ⚠️ {Math.floor(conflictsMap.size / 2)} conflicts
                </span>
                <button
                  onClick={() => {
                    // Auto-fix: Try to spread out conflicting routines
                    const newOrder = [...scheduleOrder];
                    let fixed = 0;
                    const MIN_SPACING = 6;
                    
                    // Build dancer position map
                    const getDancerPositions = (order: string[]) => {
                      const positions = new Map<string, number[]>();
                      order.forEach((id, idx) => {
                        if (id.startsWith('block-')) return;
                        const routine = routinesMap.get(id);
                        routine?.dancer_names?.forEach(dancer => {
                          if (!positions.has(dancer)) positions.set(dancer, []);
                          positions.get(dancer)!.push(idx);
                        });
                      });
                      return positions;
                    };
                    
                    // Try to fix conflicts by moving routines
                    let iterations = 0;
                    while (iterations < 50) {
                      iterations++;
                      const positions = getDancerPositions(newOrder);
                      let foundConflict = false;
                      
                      for (const [dancer, idxs] of positions) {
                        for (let i = 0; i < idxs.length - 1; i++) {
                          const spacing = idxs[i + 1] - idxs[i] - 1;
                          if (spacing < MIN_SPACING) {
                            // Try to move the second routine further down
                            const fromIdx = idxs[i + 1];
                            const targetIdx = idxs[i] + MIN_SPACING + 1;
                            if (targetIdx < newOrder.length && targetIdx !== fromIdx) {
                              const [moved] = newOrder.splice(fromIdx, 1);
                              newOrder.splice(Math.min(targetIdx, newOrder.length), 0, moved);
                              fixed++;
                              foundConflict = true;
                              break;
                            }
                          }
                        }
                        if (foundConflict) break;
                      }
                      
                      if (!foundConflict) break;
                    }
                    
                    if (fixed > 0) {
                      setScheduleByDate(prev => ({ ...prev, [selectedDate]: newOrder }));
                      toast.success(`Auto-fixed ${fixed} conflict(s)`);
                    } else {
                      toast.error('Could not auto-fix conflicts - try manual adjustment');
                    }
                  }}
                  className="px-2 py-1 bg-red-500/50 hover:bg-red-500/70 text-white text-xs font-semibold rounded transition-colors"
                >
                  🔧 Auto-Fix
                </button>
              </div>
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
            
            {/* Schedule All Filtered button */}
            {unscheduledRoutines.length > 0 && selectedRoutineIds.size === 0 && (
              <button
                onClick={() => {
                  const idsToAdd = unscheduledRoutines.map(r => r.id).filter(id => !scheduleOrder.includes(id));
                  if (idsToAdd.length > 0) {
                    setScheduleByDate(prev => ({
                      ...prev,
                      [selectedDate]: [...(prev[selectedDate] || []), ...idsToAdd],
                    }));
                    toast.success(`Added ${idsToAdd.length} routines to schedule`);
                  }
                }}
                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                📥 Schedule All ({unscheduledRoutines.length})
              </button>
            )}
            
            {/* Reset Day button */}
            {scheduleOrder.length > 0 && (
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
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm font-semibold rounded-lg transition-colors border border-red-500/30 disabled:opacity-50"
              >
                🗑️ Reset Day
              </button>
            )}

            {/* Reset All button */}
            <button
              onClick={() => {
                if (confirm('Clear ALL schedules for this competition? This cannot be undone.')) {
                  resetCompetitionMutation.mutate({
                    tenantId: TEST_TENANT_ID,
                    competitionId: TEST_COMPETITION_ID,
                  });
                }
              }}
              disabled={resetCompetitionMutation.isPending}
              className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 text-sm font-semibold rounded-lg transition-colors border border-red-600/30 disabled:opacity-50"
            >
              ⚠️ Reset All
            </button>
            
            {/* Save button */}
            {hasChanges && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  💾 Save
                </button>
                <span className="text-yellow-300 text-sm font-medium">● Unsaved</span>
              </>
            )}
            
            {/* PDF Export button */}
            {scheduleOrder.filter(id => !id.startsWith('block-')).length > 0 && (
              <button
                onClick={handleExportPDF}
                className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-sm font-semibold rounded-lg transition-colors border border-purple-500/30"
              >
                📄 Export PDF
              </button>
            )}

            {/* Send to Studios button */}
            {versionData && versionData.isPublished && (
              <button
                onClick={() => setShowSendModal(true)}
                className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-sm font-semibold rounded-lg transition-colors border border-blue-500/30"
              >
                <Mail className="h-4 w-4 inline mr-1" />
                Send to Studios
              </button>
            )}

            {/* Publish button */}
            {versionData && !versionData.isPublished && hasChanges === false && (
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
                className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 text-sm font-semibold rounded-lg transition-colors border border-green-500/30 disabled:opacity-50"
              >
                📣 Publish Version
              </button>
            )}

            {/* Refresh button */}
            <button
              onClick={() => { refetch(); refetchBlocks(); }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="px-6 py-3">
        <DayTabs
          days={competitionDates}
          activeDay={selectedDate}
          onDayChange={(date) => setSelectedDate(date)}
          competitionId={TEST_COMPETITION_ID}
          tenantId={TEST_TENANT_ID}
          onCreateBlock={(type) => handleCreateBlock(type)}
        />
      </div>

      {/* Block Templates */}
      <div className="px-6 py-2 flex gap-3">
        <DraggableBlockCard type="award" label="🏆 Award Ceremony" />
        <DraggableBlockCard type="break" label="☕ Break" />
      </div>

      {/* Main Content */}
      <div className="px-6 py-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-4">
            {/* Left: Unscheduled Pool */}
            <div className="col-span-1">
              <DroppableUnscheduledPool
                routines={unscheduledRoutines}
                selectedIds={selectedRoutineIds}
                onToggleSelection={(id, shift) => {
                  setSelectedRoutineIds(prev => {
                    const next = new Set(prev);

                    // Shift+click range selection (copied from V1)
                    if (shift && lastClickedRoutineId && unscheduledRoutines.length > 0) {
                      const lastIndex = unscheduledRoutines.findIndex(r => r.id === lastClickedRoutineId);
                      const currentIndex = unscheduledRoutines.findIndex(r => r.id === id);

                      if (lastIndex !== -1 && currentIndex !== -1) {
                        const start = Math.min(lastIndex, currentIndex);
                        const end = Math.max(lastIndex, currentIndex);

                        // Select all routines in range
                        for (let i = start; i <= end; i++) {
                          next.add(unscheduledRoutines[i].id);
                        }
                        setLastClickedRoutineId(id);
                        return next;
                      }
                    }

                    // Normal click - toggle single routine
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    setLastClickedRoutineId(id);
                    return next;
                  });
                }}
                filters={filters}
                onFiltersChange={setFilters}
                filterOptions={filterOptions}
              />
            </div>

            {/* Right: Schedule Table */}
            <div className="col-span-2">
              <DroppableScheduleTable
                scheduleOrder={scheduleOrder}
                routinesMap={routinesMap}
                blocksMap={blocksMap}
                trophyIds={trophyIds}
                conflictsMap={conflictsMap}
                sessionColors={sessionColors}
                dayStartMinutes={8 * 60}
                onDeleteBlock={handleDeleteBlock}
                onEditBlock={(block) => {
                  setEditingBlock({
                    id: block.id,
                    type: block.block_type,
                    title: block.title,
                    duration: block.duration_minutes,
                  });
                  setShowBlockModal(true);
                }}
                onUnscheduleRoutine={(routineId) => {
                  setScheduleByDate(prev => ({
                    ...prev,
                    [selectedDate]: (prev[selectedDate] || []).filter(id => id !== routineId),
                  }));
                }}
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
          </DragOverlay>
        </DndContext>
      </div>

      {/* Saving Progress Overlay */}
      {isSaving && (
        <ScheduleSavingProgress
          currentDay={saveProgress.current}
          totalDays={saveProgress.total}
          currentDayName={saveProgress.currentDayName}
        />
      )}

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
        } : null}
        preselectedType={blockType}
        onSave={async (block) => {
          if (editingBlock) {
            await handleUpdateBlock(editingBlock.id, block.title, block.duration);
          } else {
            await handleCreateBlock(block.type);
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
          currentVersion={versionData.versionNumber}
          onSuccess={() => {
            refetchVersion();
            refetchHistory();
          }}
          onSaveBeforeSend={async () => {
            if (hasChanges) {
              await handleSave();
            }
          }}
        />
      )}

      {/* Fix All Conflicts Modal */}
      <Modal
        isOpen={showFixAllModal}
        onClose={() => setShowFixAllModal(false)}
        title="Fix All Conflicts"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Auto-fix will attempt to resolve conflicts by spacing out routines with conflicting dancers.
          </p>
          <p className="text-sm text-gray-600">
            Found {conflictsMap.size} conflicts on {selectedDate}.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowFixAllModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleFixAllDay}>
              Fix All Conflicts
            </Button>
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
}: {
  routines: any[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string, shift: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filterOptions: any;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled-pool' });

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
        onSelectAll={() => {}}
        onDeselectAll={() => {}}
      />
    </div>
  );
}
