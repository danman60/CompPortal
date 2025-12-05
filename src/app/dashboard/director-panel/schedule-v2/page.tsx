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

// Constants
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';
const COMPETITION_DATES = ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'];

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
        <td colSpan={6} className="px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-white">{block.title}</span>
              <span className="text-xs text-white/60">({block.duration_minutes} min)</span>
            </div>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="px-2 py-1 text-xs text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded"
              >
                ✕
              </button>
            )}
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
        <td className="px-2 py-2 text-sm font-medium text-white truncate" style={{ maxWidth: '150px' }} title={routine.title}>
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
}: {
  scheduleOrder: string[];
  routinesMap: Map<string, RoutineData>;
  blocksMap: Map<string, BlockData>;
  trophyIds: Set<string>;
  conflictsMap: Map<string, string>;
  sessionColors: Map<string, string>;
  dayStartMinutes: number;
  onDeleteBlock: (blockId: string) => void;
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
              <th className="px-2 py-2 text-xs font-semibold text-white text-left">ROUTINE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '50px' }}>STD</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ width: '90px' }}>CLASS</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-left" style={{ width: '80px' }}>SIZE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '50px' }}>AGE</th>
              <th className="px-2 py-2 text-xs font-semibold text-white text-center" style={{ width: '50px' }}>DUR</th>
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
  const [initialized, setInitialized] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    classifications: [], ageGroups: [], genres: [], groupSizes: [], studios: [], routineAges: [], search: '',
  });
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockType, setBlockType] = useState<'award' | 'break'>('award');

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

  // ===== INITIALIZE FROM DB =====
  useEffect(() => {
    if (!routinesData || initialized.has(selectedDate)) return;

    const scheduled = routinesData
      .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0))
      .map(r => r.id);

    const blocks = (blocksData || [])
      .filter(b => b.scheduled_time)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(b => `block-${b.id}`);

    // Interleave based on sort_order (blocks have fractional sort_order between routines)
    // For simplicity, append blocks at appropriate positions based on sort_order
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

    setScheduleByDate(prev => ({ ...prev, [selectedDate]: combined }));
    setInitialized(prev => new Set(prev).add(selectedDate));
  }, [routinesData, blocksData, selectedDate, initialized]);

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

    // Case 1: Drop on unscheduled pool (remove from schedule)
    if (overId === 'unscheduled-pool') {
      if (!activeId.startsWith('block-')) {
        setScheduleByDate(prev => ({
          ...prev,
          [selectedDate]: (prev[selectedDate] || []).filter(id => id !== activeId),
        }));
      }
      return;
    }

    // Case 2: Adding from unscheduled to schedule
    if (!scheduleOrder.includes(activeId) && !activeId.startsWith('block-')) {
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
      return;
    }

    // Case 3: Reordering within schedule
    if (activeId !== overId && scheduleOrder.includes(activeId)) {
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
    const routinesToSave = routineIds.map((id, index) => {
      const routine = routinesMap.get(id);
      const duration = routine?.duration || 3;
      
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
      
      currentMinutes += duration;
      
      return {
        routineId: id,
        entryNumber: 100 + index,
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

  const handleDeleteBlock = (blockId: string) => {
    // Remove from local state
    setScheduleByDate(prev => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).filter(id => id !== `block-${blockId}`),
    }));
    // Delete from DB
    deleteBlockMutation.mutate({ blockId });
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
            <h1 className="text-2xl font-bold text-white">Schedule V2 (Simplified)</h1>
            <p className="text-sm text-purple-100">
              Test Competition Spring 2026 • {selectedDate} • {scheduleOrder.filter(id => !id.startsWith('block-')).length} scheduled
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {conflictsMap.size > 0 && (
              <span className="px-3 py-1 bg-red-500/30 border border-red-500/50 rounded-lg text-red-200 text-sm font-medium">
                ⚠️ {Math.floor(conflictsMap.size / 2)} conflicts
              </span>
            )}
            {hasChanges && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  💾 Save Schedule
                </button>
                <span className="text-yellow-300 text-sm font-medium">● Unsaved</span>
              </>
            )}
            <button
              onClick={() => { setInitialized(new Set()); refetch(); refetchBlocks(); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              🔄 Refresh
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
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
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

      {/* Block Modal */}
      <ScheduleBlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        mode="create"
        preselectedType={blockType}
        onSave={async (block) => {
          // Handle block creation
          setShowBlockModal(false);
        }}
      />
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
