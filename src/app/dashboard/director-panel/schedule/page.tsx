'use client';

/**
 * Phase 2 Scheduling Interface
 *
 * Features:
 * - Left panel: Unscheduled routines pool with filters
 * - Middle panel: Visual schedule builder (timeline/calendar view)
 * - Right panel: Conflict warnings and schedule stats
 * - Drag-and-drop scheduling
 * - Real-time conflict detection
 * - Studio code masking (A, B, C, etc.)
 */

import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

// Session 55 Components
import { TrophyHelperPanel } from '@/components/TrophyHelperPanel';
import { ScheduleStateMachine } from '@/components/ScheduleStateMachine';
import { DaySelector, countRoutinesByDay } from '@/components/DaySelector';
import { StudioRequestsPanel } from '@/components/StudioRequestsPanel';
import { HotelAttritionBanner } from '@/components/HotelAttritionBanner';
import { AgeChangeWarning } from '@/components/AgeChangeWarning';
import { ScheduleBlockCard, DraggableBlockTemplate } from '@/components/ScheduleBlockCard';
import { ScheduleBlockModal } from '@/components/ScheduleBlockModal';
import { ConflictOverrideModal } from '@/components/ConflictOverrideModal';
import { CDNoteModal } from '@/components/CDNoteModal';

// Session 56 Components
import { ScheduleToolbar, ScheduleStatus, ViewMode } from '@/components/ScheduleToolbar';
import { FilterPanel, FilterState } from '@/components/FilterPanel';
import { RoutinePool } from '@/components/scheduling/RoutinePool';
import { ScheduleZone as ScheduleZoneType, ScheduleBlock as ScheduleBlockType } from '@/components/scheduling/ScheduleGrid';

// V4 Components (Schedule Redesign)
import { DayTabs } from '@/components/scheduling/DayTabs';
import { ScheduleTable } from '@/components/scheduling/ScheduleTable';

// TEST tenant ID
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

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
    dancerAge: number | null;
  }>;
  isScheduled: boolean;
  scheduleZone: string | null; // Zone ID: saturday-am, saturday-pm, etc.
  scheduledTime: Date | null;
  scheduledDay: Date | null;
}

// Use imported types from ScheduleGrid
type ScheduleZone = ScheduleZoneType;
type ScheduleBlock = ScheduleBlockType;

export default function SchedulePage() {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Track which zone each routine is in
  const [routineZones, setRoutineZones] = useState<Record<string, ScheduleZone>>({});

  // Conflict override state
  const [overrideConflictId, setOverrideConflictId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Studio request state
  const [showRequestForm, setShowRequestForm] = useState<string | null>(null); // routine ID
  const [requestContent, setRequestContent] = useState('');

  // CD Request Management
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);

  // Panel collapse state
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);
  const [isTrophyPanelCollapsed, setIsTrophyPanelCollapsed] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState<Array<Record<string, ScheduleZone>>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // CD Notes state
  const [showCDNoteModal, setShowCDNoteModal] = useState(false);
  const [cdNoteRoutineId, setCDNoteRoutineId] = useState<string | null>(null);
  const [cdNoteRoutineTitle, setCDNoteRoutineTitle] = useState<string>('');

  // NEW: Day selector state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // V4: Selected date state (ISO string format)
  const [selectedDate, setSelectedDate] = useState<string>('2026-04-11'); // Default to first day

  // Bulk selection state
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
  const [lastClickedRoutineId, setLastClickedRoutineId] = useState<string | null>(null);

  // NEW: Schedule block modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockModalMode, setBlockModalMode] = useState<'create' | 'edit'>('create');
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

  // Reset schedule confirmation dialog state
  const [showResetConfirm, setShowResetConfirm] = useState<'day' | 'all' | null>(null);

  // View mode state (needs to be before queries that use it)
  const [viewMode, setViewMode] = useState<ViewMode>('cd');

  // Filter state (Session 56)
  const [filters, setFilters] = useState<FilterState>({
    classifications: [],
    ageGroups: [],
    genres: [],
    studios: [],
    search: '',
  });

  // Refs to track operations (to suppress individual toasts during batch operations)
  const isReorderingRef = useRef(false);
  const isAutoGeneratingRef = useRef(false);

  // Track schedule blocks
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([
    {
      id: 'award-template',
      type: 'award',
      title: '🏆 Award Block',
      duration: 30,
      zone: null,
    },
    {
      id: 'break-template',
      type: 'break',
      title: '☕ Break Block',
      duration: 15,
      zone: null,
    },
  ]);

  // Fetch routines (search handled by backend, other filters client-side)
  // View mode filtering will be added to getRoutines procedure
  const TEST_STUDIO_ID = '00000000-0000-0000-0000-000000000001';

  const { data: routines, isLoading, error, refetch } = trpc.scheduling.getRoutines.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
    searchQuery: filters.search || undefined, // Backend search for performance
    viewMode: viewMode,
    studioId: viewMode === 'studio' ? TEST_STUDIO_ID : undefined,
    // Other filters (classification, age, genre, studio) handled client-side for multi-select
  });

  // Fetch Trophy Helper
  const { data: trophyHelper } = trpc.scheduling.getTrophyHelper.useQuery({
    competitionId: TEST_COMPETITION_ID,
  });

  // Fetch Conflicts
  const { data: conflictsData, refetch: refetchConflicts } = trpc.scheduling.detectConflicts.useQuery({
    competitionId: TEST_COMPETITION_ID,
  });

  // NEW: Fetch Hotel Attrition Warning
  const { data: hotelWarningData } = trpc.scheduling.getHotelAttritionWarning.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // NEW: Fetch Age Changes (Session 58 - Fixed: Converted to query)
  const { data: ageChangesData } = trpc.scheduling.detectAgeChanges.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // Fetch Studio Requests (for CD)
  const { data: studioRequests, refetch: refetchRequests } = trpc.scheduling.getStudioRequests.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // Fetch Competition Sessions with Time Slots (for Timeline Grid)
  const { data: sessions } = trpc.scheduling.getCompetitionSessions.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // V4: Fetch routines for selected day
  const { data: routinesByDay, refetch: refetchRoutinesByDay } = trpc.scheduling.getRoutinesByDay.useQuery({
    tenantId: TEST_TENANT_ID,
    competitionId: TEST_COMPETITION_ID,
    date: selectedDate,
  });

  // V4: Competition days configuration
  const competitionDays = [
    { date: '2026-04-09', routineCount: 0, startTime: '08:00:00' },
    { date: '2026-04-10', routineCount: 0, startTime: '08:00:00' },
    { date: '2026-04-11', routineCount: 0, startTime: '08:00:00' },
    { date: '2026-04-12', routineCount: 0, startTime: '08:00:00' },
  ];

  // State Machine mutations
  const finalizeMutation = trpc.scheduling.finalizeSchedule.useMutation({
    onSuccess: () => {
      toast.success('🔒 Schedule finalized! Entry numbers are now locked.');
      refetch();
    },
    onError: (error) => {
      toast.error(`Cannot finalize: ${error.message}`);
    },
  });

  const publishMutation = trpc.scheduling.publishSchedule.useMutation({
    onSuccess: () => {
      toast.success('✅ Schedule published! Studio names are now revealed.');
      refetch();
    },
    onError: (error) => {
      toast.error(`Cannot publish: ${error.message}`);
    },
  });

  const unlockMutation = trpc.scheduling.unlockSchedule.useMutation({
    onSuccess: () => {
      toast.success('🔓 Schedule unlocked! You can now make changes.');
      refetch();
    },
    onError: (error) => {
      toast.error(`Cannot unlock: ${error.message}`);
    },
  });

  // Studio Request mutations
  const addRequestMutation = trpc.scheduling.addStudioRequest.useMutation({
    onSuccess: () => {
      toast.success('📝 Request submitted successfully!');
      setShowRequestForm(null);
      setRequestContent('');
      refetchRequests();
    },
    onError: (error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });

  const updateRequestMutation = trpc.scheduling.updateRequestStatus.useMutation({
    onSuccess: () => {
      toast.success('✓ Request status updated!');
      refetchRequests();
    },
    onError: (error) => {
      toast.error(`Failed to update request: ${error.message}`);
    },
  });

  // CD Note mutations
  const addCDNoteMutation = trpc.scheduling.addCDNote.useMutation({
    onSuccess: () => {
      toast.success('✅ Private note saved successfully!');
      setShowCDNoteModal(false);
      setCDNoteRoutineId(null);
      setCDNoteRoutineTitle('');
      // Refetch routines to update note indicators
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
    },
  });

  // Timeline Grid - Schedule routine to time slot
  const scheduleToTimeSlotMutation = trpc.scheduling.scheduleRoutineToTimeSlot.useMutation({
    onSuccess: () => {
      toast.success('✅ Routine scheduled successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to schedule: ${error.message}`);
    },
  });

  // Conflict override mutation
  const overrideConflictMutation = trpc.scheduling.overrideConflict.useMutation({
    onSuccess: () => {
      toast.success('✅ Conflict override saved successfully!');
      setOverrideConflictId(null);
      setOverrideReason('');
      refetchConflicts();
    },
    onError: (error) => {
      toast.error(`Failed to override conflict: ${error.message}`);
    },
  });

  // Export mutations
  const exportPDFMutation = trpc.scheduling.exportSchedulePDF.useMutation({
    onSuccess: (data) => {
      // Generate PDF client-side
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text(data.competition.name, 14, 15);
      doc.setFontSize(10);
      doc.text(`Schedule Export - ${new Date().toLocaleDateString()}`, 14, 22);

      // Prepare table data
      const tableData = data.routines.map((r: any) => [
        r.scheduledDay?.toLocaleDateString() || 'Unscheduled',
        r.zone?.replace('-', ' ').toUpperCase() || '',
        r.scheduledTime?.toLocaleTimeString() || '',
        r.title,
        viewMode === 'judge' ? r.studioCode : r.studioName,
        `${r.duration} min`,
      ]);

      // Add table
      autoTable(doc, {
        startY: 28,
        head: [['Day', 'Session', 'Time', 'Routine', 'Studio', 'Duration']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
      });

      // Save PDF
      doc.save(`schedule-${data.competition.name.replace(/\s+/g, '-')}.pdf`);
      toast.success('📄 PDF exported successfully!');
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const exportExcelMutation = trpc.scheduling.exportScheduleExcel.useMutation({
    onSuccess: async (data) => {
      // Generate Excel client-side
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Schedule');

      // Add headers
      worksheet.columns = [
        { header: 'Day', key: 'day', width: 15 },
        { header: 'Session', key: 'session', width: 15 },
        { header: 'Time', key: 'time', width: 12 },
        { header: 'Routine', key: 'routine', width: 30 },
        { header: 'Studio', key: 'studio', width: 20 },
        { header: 'Classification', key: 'classification', width: 15 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Age Group', key: 'ageGroup', width: 15 },
        { header: 'Duration', key: 'duration', width: 10 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6366F1' },
      };

      // Add data
      data.routines.forEach((r: any) => {
        worksheet.addRow(r);
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `schedule-${data.competition.name.replace(/\s+/g, '-')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('📊 Excel exported successfully!');
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  // Mock competition status (in production, fetch from database)
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>('draft');
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // Auto-Generate Draft Schedule
  const handleAutoGenerate = async () => {
    if (unscheduledRoutines.length === 0) {
      toast.error('No unscheduled routines to schedule');
      return;
    }

    if (!confirm(`Auto-generate schedule for ${unscheduledRoutines.length} routines across Thursday-Sunday?`)) {
      return;
    }

    setIsAutoGenerating(true);
    isAutoGeneratingRef.current = true; // Suppress individual toasts during batch operation
    console.log('[Auto-Generate] ========== STARTING AUTO-GENERATION ==========');
    console.log('[Auto-Generate] Unscheduled routines:', unscheduledRoutines.length);

    try {
      // Competition days: Thursday-Sunday (April 9-12, 2026)
      const competitionDays = [
        '2026-04-09', // Thursday
        '2026-04-10', // Friday
        '2026-04-11', // Saturday
        '2026-04-12', // Sunday
      ];

      // Distribute routines evenly across days
      const routinesPerDay = Math.ceil(unscheduledRoutines.length / competitionDays.length);

      // Sequential entry numbering starting from 100 (V4 spec)
      let entryNumberCounter = 100;

      for (let dayIndex = 0; dayIndex < competitionDays.length; dayIndex++) {
        const date = competitionDays[dayIndex];
        const dayRoutines = unscheduledRoutines.slice(
          dayIndex * routinesPerDay,
          (dayIndex + 1) * routinesPerDay
        );

        console.log(`[Auto-Generate] Day ${dayIndex + 1} (${date}): Scheduling ${dayRoutines.length} routines`);

        // Schedule routines for this day sequentially
        let currentTime = '08:00:00'; // Starting time
        for (const routine of dayRoutines) {
          console.log(`[Auto-Generate] Scheduling: ${routine.title} at ${currentTime} (Entry #${entryNumberCounter})`);

          await scheduleMutation.mutateAsync({
            routineId: routine.id,
            tenantId: TEST_TENANT_ID,
            performanceDate: date,
            performanceTime: currentTime,
            entryNumber: entryNumberCounter,
          });

          // Increment entry number for next routine
          entryNumberCounter++;

          // Increment time for next routine
          const [hours, minutes] = currentTime.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + (routine.duration || 3);
          const newHours = Math.floor(totalMinutes / 60);
          const newMinutes = totalMinutes % 60;
          currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`;
        }
      }

      console.log('[Auto-Generate] ========== AUTO-GENERATION COMPLETE ==========');
      toast.success(`✅ Auto-generated schedule for ${unscheduledRoutines.length} routines!`);
    } catch (error) {
      console.error('[Auto-Generate] ERROR:', error);
      toast.error(`Auto-generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAutoGenerating(false);
      isAutoGeneratingRef.current = false; // Re-enable individual toasts
    }
  };

  const handleFinalize = () => {
    if (confirm('Lock entry numbers? This will prevent automatic renumbering.')) {
      finalizeMutation.mutate({
        competitionId: TEST_COMPETITION_ID,
        tenantId: TEST_TENANT_ID,
        userId: '00000000-0000-0000-0000-000000000001', // Test user
      });
      setScheduleStatus('finalized');
    }
  };

  const handlePublish = () => {
    if (confirm('Publish schedule? This will reveal studio names and lock all changes.')) {
      publishMutation.mutate({
        competitionId: TEST_COMPETITION_ID,
        tenantId: TEST_TENANT_ID,
        userId: '00000000-0000-0000-0000-000000000001',
      });
      setScheduleStatus('published');
    }
  };

  const handleAddCDNote = (routineId: string, routineTitle: string) => {
    setCDNoteRoutineId(routineId);
    setCDNoteRoutineTitle(routineTitle);
    setShowCDNoteModal(true);
  };

  const handleSubmitCDNote = (content: string) => {
    if (cdNoteRoutineId) {
      addCDNoteMutation.mutate({
        routineId: cdNoteRoutineId,
        tenantId: TEST_TENANT_ID,
        content: content,
        authorId: 'cd-user-id', // In production, get from auth context
      });
    }
  };

  const handleUnlock = () => {
    if (confirm('Unlock schedule? This will allow changes and enable auto-renumbering again.')) {
      unlockMutation.mutate({
        competitionId: TEST_COMPETITION_ID,
        tenantId: TEST_TENANT_ID,
      });
      setScheduleStatus('draft');
    }
  };

  const handleSubmitRequest = (routineId: string) => {
    if (!requestContent.trim()) {
      alert('Please enter a request message');
      return;
    }

    addRequestMutation.mutate({
      routineId,
      tenantId: TEST_TENANT_ID,
      content: requestContent,
      authorId: '00000000-0000-0000-0000-000000000001', // Test user
    });
  };

  const handleUpdateRequestStatus = (noteId: string, status: 'completed' | 'ignored') => {
    if (confirm(`Mark this request as ${status}?`)) {
      updateRequestMutation.mutate({ noteId, status });
    }
  };

  // Bulk selection handlers
  const handleToggleRoutineSelection = (routineId: string, shiftKey: boolean) => {
    setSelectedRoutineIds(prev => {
      const newSet = new Set(prev);

      // Shift+click range selection
      if (shiftKey && lastClickedRoutineId && unscheduledRoutines.length > 0) {
        const lastIndex = unscheduledRoutines.findIndex(r => r.id === lastClickedRoutineId);
        const currentIndex = unscheduledRoutines.findIndex(r => r.id === routineId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);

          // Select all routines in range
          for (let i = start; i <= end; i++) {
            newSet.add(unscheduledRoutines[i].id);
          }
          setLastClickedRoutineId(routineId);
          return newSet;
        }
      }

      // Normal click - toggle single routine
      if (newSet.has(routineId)) {
        newSet.delete(routineId);
      } else {
        newSet.add(routineId);
      }

      setLastClickedRoutineId(routineId);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(unscheduledRoutines.map(r => r.id));
    setSelectedRoutineIds(allIds);
    toast.success(`Selected ${allIds.size} routines`);
  };

  const handleDeselectAll = () => {
    setSelectedRoutineIds(new Set());
    setLastClickedRoutineId(null);
    toast.success('Cleared selection');
  };

  // Initialize routine zones from database on data load
  useEffect(() => {
    if (!routines) return;

    const initialZones: Record<string, ScheduleZone> = {};
    routines.forEach(routine => {
      // Use scheduleZone field to determine which zone the routine is in
      if (routine.scheduleZone) {
        initialZones[routine.id] = routine.scheduleZone as ScheduleZone;
      }
    });

    setRoutineZones(initialZones);
  }, [routines]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Schedule mutation
  const scheduleMutation = trpc.scheduling.scheduleRoutine.useMutation({
    onSuccess: () => {
      console.log('[Schedule] Mutation SUCCESS - refetching routines');
      // No toast on success - too spammy during drag operations
      // Refetch routines to get updated state from database
      refetch();
      refetchConflicts();
    },
    onError: (error) => {
      console.error('[Schedule] Mutation FAILED:', error);
      toast.error(`Failed to schedule routine: ${error.message}`);
      // Revert the optimistic update by refetching from database
      refetch();
    },
  });

  // Schedule Block mutations
  const createBlockMutation = trpc.scheduling.createScheduleBlock.useMutation({
    onSuccess: (newBlock) => {
      toast.success(`✅ ${newBlock.block_type === 'award' ? '🏆 Award' : '☕ Break'} block created!`);
      // Add new block to local state
      setScheduleBlocks(prev => [...prev, {
        id: newBlock.id,
        type: newBlock.block_type as 'award' | 'break',
        title: newBlock.title,
        duration: newBlock.duration_minutes,
        zone: null,
      }]);
      setShowBlockModal(false);
    },
    onError: (error) => {
      toast.error(`Failed to create block: ${error.message}`);
    },
  });

  // Reset schedule mutations
  const resetDayMutation = trpc.scheduling.resetScheduleForDay.useMutation({
    onSuccess: (result) => {
      toast.success(`Reset ${result.count} routine${result.count !== 1 ? 's' : ''} for this day`);
      refetch();
      refetchConflicts();
    },
    onError: (error) => {
      toast.error(`Failed to reset schedule: ${error.message}`);
    },
  });

  const resetAllMutation = trpc.scheduling.resetScheduleForCompetition.useMutation({
    onSuccess: (result) => {
      toast.success(`Reset ${result.count} routine${result.count !== 1 ? 's' : ''} for entire competition`);
      refetch();
      refetchConflicts();
    },
    onError: (error) => {
      toast.error(`Failed to reset schedule: ${error.message}`);
    },
  });

  // Handlers for schedule blocks
  const handleCreateBlock = (type: 'award' | 'break') => {
    setBlockModalMode('create');
    setEditingBlock(null);
    setShowBlockModal(true);
  };

  const handleEditBlock = (blockId: string) => {
    const block = scheduleBlocks.find(b => b.id === blockId);
    if (block) {
      setEditingBlock(block);
      setBlockModalMode('edit');
      setShowBlockModal(true);
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    setScheduleBlocks(prev => prev.filter(b => b.id !== blockId));
    toast.success('🗑️ Block deleted');
  };

  const handleSaveBlock = (block: { type: 'award' | 'break'; title: string; duration: number }) => {
    if (blockModalMode === 'edit' && editingBlock) {
      // Update existing block
      setScheduleBlocks(prev => prev.map(b =>
        b.id === editingBlock.id
          ? { ...b, type: block.type, title: block.title, duration: block.duration }
          : b
      ));
      toast.success('💾 Block updated!');
      setShowBlockModal(false);
    } else {
      // Create new block via mutation
      createBlockMutation.mutate({
        competitionId: TEST_COMPETITION_ID,
        tenantId: TEST_TENANT_ID,
        blockType: block.type,
        title: block.title,
        durationMinutes: block.duration,
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Save state to history for undo/redo
  const saveToHistory = (newState: Record<string, ScheduleZone>) => {
    // Remove future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setRoutineZones(previousState);
      setHistoryIndex(historyIndex - 1);
      toast.success('↶ Undo successful');
    } else {
      toast.error('Nothing to undo');
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setRoutineZones(nextState);
      setHistoryIndex(historyIndex + 1);
      toast.success('↷ Redo successful');
    } else {
      toast.error('Nothing to redo');
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const activeId = active.id as string;
      const targetZone = over.id as ScheduleZone;

      // Check if dragging a block
      if (activeId.startsWith('block-')) {
        const blockId = activeId.replace('block-', '');
        const block = scheduleBlocks.find(b => b.id === blockId);

        if (block) {
          // Create a new instance of the block in the target zone
          const newBlock: ScheduleBlock = {
            id: `${block.type}-${Date.now()}`,
            type: block.type,
            title: block.type === 'award' ? 'Award Ceremony' : 'Break',
            duration: block.duration,
            zone: targetZone,
          };

          setScheduleBlocks(prev => [...prev, newBlock]);

          console.log(`[Schedule] Block placed:`, { block: newBlock, zone: targetZone });
          alert(`${block.type === 'award' ? '🏆 Award' : '☕ Break'} block added to ${targetZone}`);
        }
      } else {
        // Dragging a routine - check if bulk drag (multiple selected)
        const isBulkDrag = selectedRoutineIds.has(activeId) && selectedRoutineIds.size > 1;
        const routineIds = isBulkDrag ? Array.from(selectedRoutineIds) : [activeId];

        console.log('[Schedule] Drag ended:', {
          routineId: activeId,
          targetZone,
          isBulkDrag,
          count: routineIds.length
        });

        // Check if dropping to a time slot (Timeline Grid) vs zone (old ScheduleGrid)
        if (typeof targetZone === 'string' && targetZone.startsWith('slot-')) {
          // Timeline Grid: Time-slot based scheduling
          const slotData = over?.data?.current?.slot;

          if (slotData && sessions && sessions.length > 0) {
            // Find the session that matches this slot's date
            const session = sessions.find((s: any) => {
              const sessionDate = new Date(s.sessionDate).toISOString().split('T')[0];
              return sessionDate === slotData.date;
            });

            if (session) {
              console.log('[Timeline] Scheduling to time slot:', {
                slotData,
                sessionId: session.id,
                count: routineIds.length
              });

              // Schedule all selected routines
              routineIds.forEach((routineId, index) => {
                scheduleToTimeSlotMutation.mutate({
                  routineId,
                  tenantId: TEST_TENANT_ID,
                  sessionId: session.id,
                  targetDate: slotData.date,
                  targetTime: slotData.time,
                });
              });

              if (isBulkDrag) {
                toast.success(`Scheduled ${routineIds.length} routines to ${slotData.time}`);
                // Clear selection after bulk drag
                setSelectedRoutineIds(new Set());
                setLastClickedRoutineId(null);
              }
            } else {
              toast.error('Could not find session for this time slot');
            }
          }
        } else if (typeof targetZone === 'string' && targetZone.startsWith('schedule-table-')) {
          // V4: Day-based scheduling (from ScheduleTable droppable)
          const date = over?.data?.current?.date;

          if (date) {
            console.log('[V4 Schedule] ========== SCHEDULING SESSION START ==========');
            console.log('[V4 Schedule] Target Date:', date);
            console.log('[V4 Schedule] Total Routines:', routineIds.length);
            console.log('[V4 Schedule] Routine IDs:', routineIds);

            // Schedule all selected routines sequentially with auto-assigned times
            // The backend scheduleRoutine will calculate next available slot automatically
            let currentTime = '08:00:00'; // Starting time
            routineIds.forEach((routineId, index) => {
              const routine = routines?.find(r => r.id === routineId);
              if (routine) {
                console.log(`[V4 Schedule] Routine #${index + 1}/${routineIds.length}:`, {
                  routineId,
                  title: routine.title,
                  duration: routine.duration || 3,
                  classification: routine.classificationName,
                  studio: routine.studioName,
                  scheduledDate: date,
                  scheduledTime: currentTime,
                  entryNumber: 0, // Auto-assigned by backend
                });

                // Each routine gets a basic time slot calculation
                // Backend will handle actual slot assignment and entry numbers
                scheduleMutation.mutate(
                  {
                    routineId,
                    tenantId: TEST_TENANT_ID,
                    performanceDate: date,
                    performanceTime: currentTime,
                    entryNumber: 0, // Let backend auto-assign
                  },
                  {
                    onSuccess: (data) => {
                      console.log(`[V4 Schedule] ✅ SUCCESS - Routine scheduled:`, {
                        routineId,
                        title: routine.title,
                        entryNumber: data.routine.entry_number,
                        date: data.routine.performance_date,
                        time: data.routine.performance_time,
                      });
                    },
                    onError: (error) => {
                      console.error(`[V4 Schedule] ❌ ERROR - Failed to schedule routine:`, {
                        routineId,
                        title: routine.title,
                        error: error.message,
                      });
                    },
                  }
                );

                // Increment time for next routine (rough estimate)
                const [hours, minutes] = currentTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes + (routine.duration || 3);
                const newHours = Math.floor(totalMinutes / 60);
                const newMinutes = totalMinutes % 60;
                currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`;
              } else {
                console.warn(`[V4 Schedule] ⚠️ WARNING - Routine not found:`, { routineId });
              }
            });

            console.log('[V4 Schedule] ========== SCHEDULING SESSION END ==========');

            if (isBulkDrag) {
              toast.success(`Scheduling ${routineIds.length} routines to ${date}...`);
              // Clear selection after bulk drag
              setSelectedRoutineIds(new Set());
              setLastClickedRoutineId(null);
            }
          }
        } else {
          // V4: Reordering within the same day
          // Detect if we're dragging a routine over another routine (not a droppable zone)
          const draggedRoutine = routines?.find(r => r.id === activeId);
          const targetRoutine = routines?.find(r => r.id === over?.id);

          if (draggedRoutine && targetRoutine && draggedRoutine.scheduledDay && targetRoutine.scheduledDay) {
            // Check if both routines are on the same day
            const dragDate = new Date(draggedRoutine.scheduledDay).toISOString().split('T')[0];
            const targetDate = new Date(targetRoutine.scheduledDay).toISOString().split('T')[0];

            if (dragDate === targetDate && routines) {
            console.log('[V4 Reorder] Reordering routine within schedule table');

            // Get all routines for the same day, sorted by entry number
            const sameDayRoutines = routines
              .filter(r => {
                if (!r.scheduledDay || !draggedRoutine.scheduledDay) return false;
                const rDate = new Date(r.scheduledDay).toISOString().split('T')[0];
                const dragDate = new Date(draggedRoutine.scheduledDay).toISOString().split('T')[0];
                return rDate === dragDate;
              })
              .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

            // Find old and new positions
            const oldIndex = sameDayRoutines.findIndex(r => r.id === activeId);
            const newIndex = sameDayRoutines.findIndex(r => r.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
              // Reorder the array
              const reorderedRoutines = arrayMove(sameDayRoutines, oldIndex, newIndex);

              // Get the base entry number from the first routine
              const baseEntryNumber = reorderedRoutines[0].entryNumber || 100;

              console.log('[V4 Reorder] Updating entry numbers:', {
                oldIndex,
                newIndex,
                routineCount: reorderedRoutines.length,
                baseEntryNumber,
              });

              // Two-phase update to prevent unique constraint violations
              // Phase 1: Move to temporary numbers, Phase 2: Move to final numbers
              (async () => {
                try {
                  // Set reordering flag to suppress individual toasts
                  isReorderingRef.current = true;

                  // Identify routines that need updating
                  const routinesToUpdate = reorderedRoutines.filter(
                    (routine, index) => routine.entryNumber !== baseEntryNumber + index
                  );

                  if (routinesToUpdate.length === 0) {
                    console.log('[V4 Reorder] No updates needed');
                    isReorderingRef.current = false;
                    return;
                  }

                  console.log(`[V4 Reorder] Phase 1: Moving ${routinesToUpdate.length} routines to temporary numbers`);

                  // Phase 1: Move to temporary entry numbers (10000+)
                  const tempUpdates = routinesToUpdate.map((routine) => {
                    const tempNumber = 10000 + (routine.entryNumber || 0);
                    console.log(`[V4 Reorder] Phase 1: ${routine.title} #${routine.entryNumber} → temp #${tempNumber}`);

                    return scheduleMutation.mutateAsync({
                      routineId: routine.id,
                      tenantId: TEST_TENANT_ID,
                      performanceDate: new Date(routine.scheduledDay!).toISOString().split('T')[0],
                      performanceTime: routine.scheduledTime
                        ? new Date(routine.scheduledTime).toTimeString().split(' ')[0]
                        : '08:00:00',
                      entryNumber: tempNumber,
                    });
                  });

                  await Promise.all(tempUpdates);
                  console.log('[V4 Reorder] Phase 1 complete');

                  console.log(`[V4 Reorder] Phase 2: Moving ${reorderedRoutines.length} routines to final numbers`);

                  // Phase 2: Move ALL routines to final entry numbers
                  const finalUpdates = reorderedRoutines.map((routine, index) => {
                    const newEntryNumber = baseEntryNumber + index;
                    console.log(`[V4 Reorder] Phase 2: ${routine.title} → final #${newEntryNumber}`);

                    return scheduleMutation.mutateAsync({
                      routineId: routine.id,
                      tenantId: TEST_TENANT_ID,
                      performanceDate: new Date(routine.scheduledDay!).toISOString().split('T')[0],
                      performanceTime: routine.scheduledTime
                        ? new Date(routine.scheduledTime).toTimeString().split(' ')[0]
                        : '08:00:00',
                      entryNumber: newEntryNumber,
                    });
                  });

                  await Promise.all(finalUpdates);
                  console.log('[V4 Reorder] Phase 2 complete');

                  // Reset reordering flag and show single success toast
                  isReorderingRef.current = false;
                  toast.success('Routines reordered successfully');
                } catch (error) {
                  console.error('[V4 Reorder] Error during reorder:', error);
                  // Reset reordering flag on error
                  isReorderingRef.current = false;
                  toast.error('Failed to reorder routines');
                }
              })();
            }
            }
          } else {
            // Dragging between different days or zones - not supported for reordering
            console.log('[V4 Reorder] Cannot reorder between different days');
          }
        }
      }
    }

    setActiveId(null);
  };

  // Get unique classifications from routines
  const classifications = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.classificationId, name: r.classificationName }))))
        .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Get unique categories from routines
  const categories = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.categoryId, name: r.categoryName }))))
        .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Get unique age groups from routines
  const ageGroups = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.ageGroupId, name: r.ageGroupName }))))
        .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Get unique studios from routines
  const studios = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.studioId, name: r.studioName, code: r.studioCode }))))
        .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Group routines by zone
  const routinesByZone = (routines || []).reduce((acc, routine) => {
    const zone = routineZones[routine.id] || 'unscheduled';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(routine);
    return acc;
  }, {} as Record<ScheduleZone, Routine[]>);

  // Apply client-side filters to unscheduled routines
  const allUnscheduled = routinesByZone['unscheduled'] || [];
  const unscheduledRoutines = allUnscheduled.filter(routine => {
    // Classification filter
    if (filters.classifications.length > 0 && !filters.classifications.includes(routine.classificationId)) {
      return false;
    }

    // Age group filter
    if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(routine.ageGroupId)) {
      return false;
    }

    // Genre filter
    if (filters.genres.length > 0 && !filters.genres.includes(routine.categoryId)) {
      return false;
    }

    // Studio filter
    if (filters.studios.length > 0 && !filters.studios.includes(routine.studioId)) {
      return false;
    }

    // Search filter (already handled by backend query, but add client-side for consistency)
    if (filters.search && !routine.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    return true;
  });

  const saturdayAM = routinesByZone['saturday-am'] || [];
  const saturdayPM = routinesByZone['saturday-pm'] || [];
  const sundayAM = routinesByZone['sunday-am'] || [];
  const sundayPM = routinesByZone['sunday-pm'] || [];

  // Group blocks by zone
  const blocksByZone = scheduleBlocks.reduce((acc, block) => {
    if (block.zone) {
      if (!acc[block.zone]) acc[block.zone] = [];
      acc[block.zone].push(block);
    }
    return acc;
  }, {} as Record<ScheduleZone, ScheduleBlock[]>);

  const saturdayAMBlocks = blocksByZone['saturday-am'] || [];
  const saturdayPMBlocks = blocksByZone['saturday-pm'] || [];
  const sundayAMBlocks = blocksByZone['sunday-am'] || [];
  const sundayPMBlocks = blocksByZone['sunday-pm'] || [];

  const activeRoutine = routines?.find(r => r.id === activeId);
  const activeBlock = activeId?.startsWith('block-')
    ? scheduleBlocks.find(b => `block-${b.id}` === activeId)
    : null;

  // V4: Count scheduled routines (routines with performance_date set)
  const scheduledCount = routines?.filter(r => r.isScheduled).length || 0;

  // Prepare visual indicator data (Session 58)
  const conflictsForUI = (conflictsData?.conflicts || []).map((c: any) => ({
    id: `${c.routine1Id}-${c.routine2Id}-${c.dancerId}`,
    dancerId: c.dancerId,
    dancerName: c.dancerName,
    routine1Id: c.routine1Id,
    routine1Number: c.routine1Number || 0,
    routine1Title: c.routine1Title || '',
    routine2Id: c.routine2Id,
    routine2Number: c.routine2Number || 0,
    routine2Title: c.routine2Title || '',
    routinesBetween: c.routinesBetween || 0,
    severity: c.severity as 'critical' | 'error' | 'warning',
    message: c.message || `${c.dancerName} has ${c.routinesBetween} routines between (need 6 minimum)`,
  }));

  const trophyHelperForUI = (trophyHelper || []).map((t: any) => ({
    routineId: t.lastRoutineId || t.last_routine_id,
    overallCategory: t.overallCategory || t.overall_category,
  })).filter((t: any) => t.routineId); // Filter out entries without routine ID

  const ageChangesForUI = (ageChangesData?.routines || [])
    .filter((r: any) => r.ageChanges && r.ageChanges.length > 0)
    .map((r: any) => r.id)
    .filter(Boolean);

  const routineNotesForUI = (studioRequests || []).reduce((acc: Record<string, boolean>, req: any) => {
    if (req.routine_id) {
      acc[req.routine_id] = true;
    }
    return acc;
  }, {} as Record<string, boolean>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        {/* Schedule Toolbar (Session 56) */}
        <ScheduleToolbar
          status={scheduleStatus}
          competitionName="Test Competition Spring 2026"
          competitionDates="April 9-12, 2026"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSaveDraft={() => toast('💾 Changes are saved automatically')}
          onFinalize={handleFinalize}
          onPublish={handlePublish}
          onExport={() => {
            // Show export options
            const exportType = prompt('Export as PDF or Excel? (Type "pdf" or "excel")');
            if (exportType === 'pdf') {
              exportPDFMutation.mutate({
                competitionId: TEST_COMPETITION_ID,
                tenantId: TEST_TENANT_ID,
                viewMode,
              });
            } else if (exportType === 'excel') {
              exportExcelMutation.mutate({
                competitionId: TEST_COMPETITION_ID,
                tenantId: TEST_TENANT_ID,
                viewMode,
              });
            }
          }}
          // Auto-Generate
          onAutoGenerate={handleAutoGenerate}
          // Undo/Redo
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          // Studio Requests
          onViewRequests={() => setShowRequestsPanel(!showRequestsPanel)}
          requestsCount={studioRequests?.length || 0}
          // Loading states
          isFinalizing={finalizeMutation.isPending}
          isPublishing={publishMutation.isPending}
          isAutoGenerating={isAutoGenerating}
          // Stats
          totalRoutines={routines?.length || 0}
          scheduledRoutines={scheduledCount}
          unscheduledRoutines={unscheduledRoutines.length}
        />

        <div className="p-6">

        {/* CD Requests Management Panel (Collapsible) */}
        {showRequestsPanel && (
          <div className="mb-6 bg-indigo-900/30 backdrop-blur-sm rounded-xl border border-indigo-500/30 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Studio Scheduling Requests</h2>
              <button
                onClick={() => setShowRequestsPanel(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {studioRequests && studioRequests.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {studioRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className={`border-2 rounded-lg p-4 ${
                      request.status === 'pending'
                        ? 'border-indigo-500/50 bg-indigo-900/30'
                        : request.status === 'completed'
                        ? 'border-green-500/50 bg-green-900/30'
                        : 'border-gray-500/50 bg-gray-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-white text-sm mb-1">
                          {request.routine?.title || 'Routine'}
                        </div>
                        <div className="text-xs text-gray-300">
                          Studio: {request.routine?.studioName || 'Unknown'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending'
                            ? 'bg-yellow-500 text-black'
                            : request.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-500 text-white'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-white/90 mb-3">{request.content}</div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                        >
                          ✓ Mark Complete
                        </button>
                        <button
                          onClick={() => handleUpdateRequestStatus(request.id, 'ignored')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          ✕ Ignore
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-indigo-200 text-sm">No studio requests yet</p>
              </div>
            )}
          </div>
        )}

        {/* Age Change Warnings */}
        {ageChangesData && ageChangesData.routines && ageChangesData.routines.length > 0 && (
          <div className="mb-6 bg-yellow-900/30 backdrop-blur-sm rounded-xl border border-yellow-500/50 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-300 text-lg mb-1">Dancer Age Changes Detected</h3>
                <p className="text-yellow-200 text-sm mb-3">
                  {ageChangesData.routines.length} routine{ageChangesData.routines.length !== 1 ? 's have' : ' has'} dancers whose ages have changed since scheduling.
                  This may affect age group categories.
                </p>
                <div className="space-y-2">
                  {ageChangesData.routines.slice(0, 5).map((routine: any) => (
                    <div key={routine.id} className="text-xs text-yellow-100 bg-yellow-900/20 rounded p-2">
                      🎭 {routine.title} - {routine.ageChanges?.length || 0} dancer{(routine.ageChanges?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  ))}
                  {ageChangesData.routines.length > 5 && (
                    <div className="text-xs text-yellow-300 italic">
                      +{ageChangesData.routines.length - 5} more routine{ageChangesData.routines.length - 5 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hotel Attrition Warning */}
        {hotelWarningData && (
          <HotelAttritionBanner
            hasWarning={hotelWarningData.hasWarning}
            message={hotelWarningData.message}
            dayDistribution={hotelWarningData.dayDistribution || []}
            totalEmeraldRoutines={hotelWarningData.totalEmeraldRoutines || 0}
          />
        )}

        {/* Main 2-Panel Layout (V4: 33% left, 67% right) */}
        <div className="grid grid-cols-3 gap-6">

          {/* LEFT PANEL: Unscheduled Routines Pool (33%) */}
          <div className="col-span-1 space-y-6">
            {/* Filter Panel (Session 56) */}
            <FilterPanel
              classifications={classifications.map(c => ({ id: c.id, label: c.name }))}
              ageGroups={ageGroups.map(ag => ({ id: ag.id, label: ag.name }))}
              genres={categories.map(c => ({ id: c.id, label: c.name }))}
              studios={studios.map(s => ({ id: s.id, label: `${s.code} - ${s.name}` }))}
              filters={filters}
              onFiltersChange={setFilters}
              totalRoutines={routines?.length || 0}
              filteredRoutines={unscheduledRoutines.length}
              isCollapsed={isFilterPanelCollapsed}
              onToggleCollapse={() => setIsFilterPanelCollapsed(!isFilterPanelCollapsed)}
            />

            {/* Unscheduled Routines Pool (Session 56) */}
            <RoutinePool
              routines={unscheduledRoutines}
              isLoading={isLoading}
              error={error}
              viewMode={viewMode}
              isDraggingAnything={activeId !== null}
              onRequestClick={(id) => setShowRequestForm(id)}
              onNoteClick={handleAddCDNote}
              conflicts={conflictsForUI}
              trophyHelper={trophyHelperForUI}
              ageChanges={ageChangesForUI}
              routineNotes={routineNotesForUI}
              selectedRoutineIds={selectedRoutineIds}
              onToggleSelection={handleToggleRoutineSelection}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />

            {/* Schedule Blocks */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] mt-6">
              <h2 className="text-lg font-bold text-white mb-4">Schedule Blocks</h2>
              <p className="text-xs text-purple-300 mb-4">Create and drag blocks into the schedule</p>

              {/* Create Block Templates */}
              <div className="space-y-3 mb-6">
                <DraggableBlockTemplate
                  type="award"
                  onClick={() => handleCreateBlock('award')}
                />
                <DraggableBlockTemplate
                  type="break"
                  onClick={() => handleCreateBlock('break')}
                />
              </div>

              {/* Existing Unplaced Blocks */}
              {scheduleBlocks.filter(b => b.zone === null).length > 0 && (
                <>
                  <div className="text-xs text-purple-300 mb-3 font-medium">Unplaced Blocks:</div>
                  <div className="space-y-2">
                    {scheduleBlocks.filter(b => b.zone === null).map(block => (
                      <ScheduleBlockCard
                        key={block.id}
                        block={block}
                        inZone={false}
                        onEdit={handleEditBlock}
                        onDelete={handleDeleteBlock}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Schedule Table (V4 Redesign - 67%) */}
          <div className="col-span-2 space-y-6">
            {/* Reset Schedule Buttons */}
            <div className="flex items-center justify-end gap-3 px-4">
              <button
                onClick={() => setShowResetConfirm('day')}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
              >
                Reset This Day
              </button>
              <button
                onClick={() => setShowResetConfirm('all')}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-400 rounded-lg hover:bg-red-200 transition-colors"
              >
                Reset Entire Schedule
              </button>
            </div>

            {/* V4: Day Tabs */}
            <DayTabs
              days={competitionDays.map(day => ({
                ...day,
                routineCount: (routinesByDay || []).filter((r: any) =>
                  r.performance_date && new Date(r.performance_date).toISOString().split('T')[0] === day.date
                ).length,
              }))}
              activeDay={selectedDate}
              onDayChange={setSelectedDate}
              competitionId={TEST_COMPETITION_ID}
              tenantId={TEST_TENANT_ID}
            />

            {/* V4: Schedule Table */}
            <ScheduleTable
              routines={(routinesByDay || []).map((r: any) => ({
                id: r.id,
                title: r.title,
                studioId: r.studio_id,
                studioName: r.studios?.name || 'Unknown Studio',
                studioCode: r.studios?.studio_code || '?',
                classificationId: r.classification_id || '',
                classificationName: r.classifications?.name || 'Unknown',
                categoryId: r.category_id || '',
                categoryName: r.dance_categories?.name || 'Unknown',
                ageGroupId: r.age_group_id || '',
                ageGroupName: r.age_groups?.name || 'Unknown',
                entrySizeId: r.entry_size_category_id || '',
                entrySizeName: r.entry_size_categories?.name || 'Unknown',
                duration: r.routine_length_minutes || 3,
                participants: [],
                entryNumber: r.entry_number,
                scheduledTime: r.performance_time,
                scheduledDay: r.performance_date,
              }))}
              selectedDate={selectedDate}
              viewMode={viewMode}
              conflicts={conflictsForUI}
              onRoutineClick={(id) => console.log('Routine clicked:', id)}
            />

            {/* Stats and Actions Section (inline below schedule) */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {/* Stats Panel */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <h3 className="text-sm font-bold text-white mb-3">Statistics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">Unscheduled:</span>
                    <span className="text-amber-300 font-bold">{unscheduledRoutines.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">Scheduled:</span>
                    <span className="text-emerald-300 font-bold">{scheduledCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">Total:</span>
                    <span className="text-blue-300 font-bold">{routines?.length || 0}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${routines?.length ? (scheduledCount / routines.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Conflicts Summary Panel */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                  <span>Conflicts</span>
                  {conflictsData && conflictsData.summary.total > 0 && (
                    <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                      {conflictsData.summary.total}
                    </span>
                  )}
                </h3>
                <div className="text-center py-3">
                  {conflictsData && conflictsData.conflicts.length > 0 ? (
                    <div className="text-xs text-red-300">
                      {conflictsData.summary.critical || 0} critical, {conflictsData.summary.errors || 0} errors
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-300">No conflicts</div>
                  )}
                </div>
              </div>

              {/* Actions Panel */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <button className="w-full px-3 py-2 text-xs rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all">
                  💾 Save
                </button>
              </div>
            </div>
          </div>

        </div>
        </div>
      </div>

      {/* Studio Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl border border-purple-500/50 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Submit Scheduling Request</h3>
            <p className="text-purple-200 text-sm mb-4">
              Add a note or request for the Competition Director regarding this routine's scheduling.
            </p>
            <textarea
              value={requestContent}
              onChange={(e) => setRequestContent(e.target.value)}
              placeholder="Enter your request or note..."
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none h-32"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleSubmitRequest(showRequestForm)}
                disabled={addRequestMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {addRequestMutation.isPending ? 'Submitting...' : '📝 Submit Request'}
              </button>
              <button
                onClick={() => {
                  setShowRequestForm(null);
                  setRequestContent('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Override Modal */}
      {overrideConflictId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-red-900 to-orange-900 rounded-xl border border-red-500/50 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">⚠️ Override Conflict</h3>
            <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-200 text-sm mb-2">
                <strong>Warning:</strong> You are about to override a critical scheduling conflict.
              </p>
              <p className="text-red-300 text-xs">
                This dancer will have less than 6 routines between performances. Please provide a justification.
              </p>
            </div>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Enter reason for override (required)..."
              className="w-full px-4 py-3 bg-red-950/50 border border-red-500/50 rounded-lg text-white placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none h-32"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (!overrideReason.trim()) {
                    alert('Please provide a reason for the override');
                    return;
                  }
                  if (overrideReason.length < 10) {
                    alert('Reason must be at least 10 characters');
                    return;
                  }
                  overrideConflictMutation.mutate({
                    conflictId: overrideConflictId,
                    reason: overrideReason,
                    userId: '00000000-0000-0000-0000-000000000001', // Test user
                    tenantId: TEST_TENANT_ID,
                  });
                }}
                disabled={overrideConflictMutation.isPending}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {overrideConflictMutation.isPending ? 'Saving...' : '⚙️ Confirm Override'}
              </button>
              <button
                onClick={() => {
                  setOverrideConflictId(null);
                  setOverrideReason('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeRoutine && (
          <div className="border-2 border-purple-400 rounded-lg p-4 bg-purple-800/90 backdrop-blur-sm shadow-xl">
            <div className="font-bold text-white mb-1">{activeRoutine.title}</div>
            <div className="text-sm text-purple-200">
              <div>Studio: <span className="font-medium text-purple-300">{activeRoutine.studioCode}</span></div>
            </div>
          </div>
        )}
        {activeBlock && (
          <div className={`
            border-2 rounded-lg p-3 backdrop-blur-sm shadow-xl
            ${activeBlock.type === 'award'
              ? 'border-yellow-400 bg-yellow-900/90'
              : 'border-gray-400 bg-gray-900/90'}
          `}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeBlock.type === 'award' ? '🏆' : '☕'}</span>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">{activeBlock.title}</div>
                <div className="text-xs text-gray-300">{activeBlock.duration} minutes</div>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Schedule Block Modal */}
      <ScheduleBlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onSave={handleSaveBlock}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        initialBlock={editingBlock}
        mode={blockModalMode}
      />

      {/* CD Note Modal */}
      <CDNoteModal
        isOpen={showCDNoteModal}
        onClose={() => setShowCDNoteModal(false)}
        routineId={cdNoteRoutineId || ''}
        routineTitle={cdNoteRoutineTitle}
        onSubmit={handleSubmitCDNote}
        isSubmitting={addCDNoteMutation.isPending}
      />

      {/* Reset Schedule Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500">
            <h3 className="text-xl font-bold text-red-700 mb-4">
              ⚠️ {showResetConfirm === 'day' ? 'Reset This Day' : 'Reset Entire Schedule'}
            </h3>
            <p className="text-gray-700 mb-6">
              {showResetConfirm === 'day'
                ? `This will remove ALL scheduled routines for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. All routines will return to the unscheduled pool.`
                : 'This will remove ALL scheduled routines for the ENTIRE competition. All routines will return to the unscheduled pool.'}
            </p>
            <p className="text-sm text-red-600 font-semibold mb-6">
              This action cannot be undone!
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showResetConfirm === 'day') {
                    resetDayMutation.mutate({
                      tenantId: TEST_TENANT_ID,
                      competitionId: TEST_COMPETITION_ID,
                      performanceDate: selectedDate,
                    });
                  } else {
                    resetAllMutation.mutate({
                      tenantId: TEST_TENANT_ID,
                      competitionId: TEST_COMPETITION_ID,
                    });
                  }
                  setShowResetConfirm(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Reset Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
