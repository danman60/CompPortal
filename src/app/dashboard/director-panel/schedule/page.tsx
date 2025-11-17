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

import { useState, useEffect } from 'react';
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
import { TimelineHeader, TimelineSession } from '@/components/TimelineHeader';
import { RoutinePool } from '@/components/scheduling/RoutinePool';
import { ScheduleGrid, ScheduleZone as ScheduleZoneType, ScheduleBlock as ScheduleBlockType } from '@/components/scheduling/ScheduleGrid';
import { TimelineGrid } from '@/components/scheduling/TimelineGrid';

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

  // Bulk selection state
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
  const [lastClickedRoutineId, setLastClickedRoutineId] = useState<string | null>(null);

  // NEW: Schedule block modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockModalMode, setBlockModalMode] = useState<'create' | 'edit'>('create');
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

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
      toast.success('🎭 Routine scheduled successfully!');
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
        } else {
          // Old ScheduleGrid: Zone-based scheduling
          // Save current state to history before updating
          saveToHistory(routineZones);

          // Update local state immediately for responsive UI (optimistic update)
          const newState = { ...routineZones };
          routineIds.forEach(routineId => {
            newState[routineId] = targetZone;
          });
          setRoutineZones(newState);

          // TODO: V4 Redesign - This will be replaced with proper date+time scheduling
          // Temporarily disabled zone-based scheduling - new components coming in Phase 4-5
          console.log('[Schedule] Zone-based scheduling deprecated - awaiting V4 components');
          toast.error('Schedule redesign in progress - drag-and-drop temporarily disabled');

          if (isBulkDrag) {
            toast.success(`Scheduled ${routineIds.length} routines to ${targetZone}`);
            // Clear selection after bulk drag
            setSelectedRoutineIds(new Set());
            setLastClickedRoutineId(null);
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

  const scheduledCount = (saturdayAM.length + saturdayPM.length + sundayAM.length + sundayPM.length);

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

        {/* Main 3-Panel Layout */}
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT PANEL: Unscheduled Routines Pool */}
          <div className="col-span-4 space-y-6">
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

          {/* MIDDLE PANEL: Schedule Builder */}
          <div className="col-span-5">
            {/* Timeline Header (Session 56) */}
            <TimelineHeader
              sessions={[
                {
                  id: 'saturday-am',
                  name: 'Saturday Morning',
                  day: new Date('2026-04-11'), // April 11, 2026 is Saturday
                  startTime: '09:00 AM',
                  endTime: '12:00 PM',
                  routineCount: saturdayAM.length,
                  blockCount: saturdayAMBlocks.length,
                  color: 'bg-gradient-to-br from-indigo-500/15 to-purple-500/15',
                },
                {
                  id: 'saturday-pm',
                  name: 'Saturday Afternoon',
                  day: new Date('2026-04-11'), // April 11, 2026 is Saturday
                  startTime: '01:00 PM',
                  endTime: '05:00 PM',
                  routineCount: saturdayPM.length,
                  blockCount: saturdayPMBlocks.length,
                  color: 'bg-gradient-to-br from-purple-500/15 to-pink-500/15',
                },
                {
                  id: 'sunday-am',
                  name: 'Sunday Morning',
                  day: new Date('2026-04-12'), // April 12, 2026 is Sunday
                  startTime: '09:00 AM',
                  endTime: '12:00 PM',
                  routineCount: sundayAM.length,
                  blockCount: sundayAMBlocks.length,
                  color: 'bg-gradient-to-br from-blue-500/15 to-indigo-500/15',
                },
                {
                  id: 'sunday-pm',
                  name: 'Sunday Afternoon',
                  day: new Date('2026-04-12'), // April 12, 2026 is Sunday
                  startTime: '01:00 PM',
                  endTime: '05:00 PM',
                  routineCount: sundayPM.length,
                  blockCount: sundayPMBlocks.length,
                  color: 'bg-gradient-to-br from-indigo-500/15 to-blue-500/15',
                },
              ]}
            />

            {/* Schedule Grid (Session 56) */}
            <ScheduleGrid
              days={[
                {
                  day: 'Saturday',
                  date: 'April 11, 2026', // April 11, 2026 is Saturday
                  icon: '📅',
                  gradient: 'bg-gradient-to-br from-indigo-500/15 to-purple-500/15',
                  borderColor: 'border-indigo-500/30',
                  sessions: [
                    {
                      id: 'saturday-am' as ScheduleZoneType,
                      label: 'Morning',
                      routines: saturdayAM,
                      blocks: saturdayAMBlocks,
                    },
                    {
                      id: 'saturday-pm' as ScheduleZoneType,
                      label: 'Afternoon',
                      routines: saturdayPM,
                      blocks: saturdayPMBlocks,
                    },
                  ],
                },
                {
                  day: 'Sunday',
                  date: 'April 12, 2026', // April 12, 2026 is Sunday
                  icon: '☀️',
                  gradient: 'bg-gradient-to-br from-blue-500/15 to-indigo-500/15',
                  borderColor: 'border-blue-500/30',
                  sessions: [
                    {
                      id: 'sunday-am' as ScheduleZoneType,
                      label: 'Morning',
                      routines: sundayAM,
                      blocks: sundayAMBlocks,
                    },
                    {
                      id: 'sunday-pm' as ScheduleZoneType,
                      label: 'Afternoon',
                      routines: sundayPM,
                      blocks: sundayPMBlocks,
                    },
                  ],
                },
              ]}
              viewMode={viewMode}
              isDraggingAnything={activeId !== null}
              onRequestClick={(id) => setShowRequestForm(id)}
              conflicts={conflictsForUI}
              trophyHelper={trophyHelperForUI}
              ageChanges={ageChangesForUI}
              routineNotes={routineNotesForUI}
            />

            {/* Timeline Grid (Session 59 - Time-Slot Based Scheduling) */}
            {sessions && sessions.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-lg font-bold text-white">
                    📅 Timeline Grid (New)
                  </h3>
                  <span className="text-xs text-gray-400 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                    Time-Slot Based Scheduling
                  </span>
                </div>

                {sessions.map((session: any) => {
                  // Map routines to Timeline Grid format
                  const mappedRoutines = (routines || []).map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    studioName: r.studioName,
                    studioCode: r.studioCode,
                    categoryName: r.categoryName,
                    classificationName: r.classificationName,
                    ageGroupName: r.ageGroupName,
                    duration: r.duration || 3,
                    performanceDate: r.scheduledDay,
                    performanceTime: r.scheduledTime,
                  }));

                  // Map conflicts to routine IDs
                  const routineConflicts = (conflictsData?.conflicts || []).flatMap((c: any) => [
                    { routineId: c.routine1Id, severity: c.severity },
                    { routineId: c.routine2Id, severity: c.severity },
                  ]);

                  return (
                    <TimelineGrid
                      key={session.id}
                      session={session}
                      routines={mappedRoutines}
                      conflicts={routineConflicts}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Trophy Helper */}
          <div className="col-span-3 space-y-6">
            {/* Trophy Helper Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <h2 className="text-lg font-bold text-white">Trophy Helper</h2>
                </div>
                <button
                  onClick={() => setIsTrophyPanelCollapsed(!isTrophyPanelCollapsed)}
                  className="text-white/60 hover:text-white transition-colors text-sm font-medium px-2 py-1 hover:bg-white/10 rounded"
                  title={isTrophyPanelCollapsed ? "Expand panel" : "Collapse panel"}
                >
                  {isTrophyPanelCollapsed ? '▶' : '▼'}
                </button>
              </div>

              {!isTrophyPanelCollapsed && (
                <>
                  {trophyHelper && Array.isArray(trophyHelper) && trophyHelper.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {trophyHelper.map((entry, index) => (
                        <div
                          key={entry.overallCategory}
                          className="border-2 border-yellow-500/30 bg-yellow-900/20 rounded-lg p-3"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-400 text-xl flex-shrink-0">🏆</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white mb-1 truncate">
                                {entry.categoryDisplay}
                              </div>
                              <div className="text-xs text-yellow-200 space-y-1">
                                <div>Last: #{entry.lastRoutineNumber || '?'} "{entry.lastRoutineTitle}"</div>
                                <div>Zone: {entry.lastRoutineZone}</div>
                                <div className="text-yellow-300 font-medium">
                                  {entry.totalRoutinesInCategory} routine{entry.totalRoutinesInCategory !== 1 ? 's' : ''}
                                </div>
                                <div className="text-xs text-yellow-400 mt-2">
                                  💡 Suggested award: {entry.suggestedAwardTime
                                    ? new Date(entry.suggestedAwardTime).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                      })
                                    : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-3">🏆</div>
                      <p className="text-purple-200 text-sm">
                        Schedule routines to see award recommendations
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Age Change Warnings Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎂</span>
                <h2 className="text-lg font-bold text-white">Age Warnings</h2>
              </div>

              {/* PERFORMANCE: Age detection now handled by backend detectAgeChanges query */}
              {/* Client-side detection removed to avoid fetching 6000+ participant rows */}
              <div className="text-center py-6">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-purple-200 text-sm">No age warnings detected</p>
              </div>
            </div>

            {/* Conflicts Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">
                Conflicts
                {conflictsData && conflictsData.summary.total > 0 && (
                  <span className="ml-2 text-sm font-medium bg-red-600 text-white px-2 py-1 rounded-full">
                    {conflictsData.summary.total}
                  </span>
                )}
              </h2>

              {conflictsData && conflictsData.conflicts.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {conflictsData.conflicts.map((conflict, index) => (
                    <div
                      key={index}
                      className={`border-2 rounded-lg p-3 ${
                        conflict.severity === 'critical'
                          ? 'border-red-500/50 bg-red-900/30'
                          : conflict.severity === 'error'
                          ? 'border-orange-500/50 bg-orange-900/30'
                          : 'border-yellow-500/50 bg-yellow-900/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl flex-shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white mb-1">
                            {conflict.dancerName}
                          </div>
                          <div className="text-xs text-gray-200">
                            {conflict.message}
                          </div>
                          <div className="text-xs text-gray-300 mt-2 space-y-1">
                            <div>#{conflict.routine1Number} "{conflict.routine1Title}"</div>
                            <div>#{conflict.routine2Number} "{conflict.routine2Title}"</div>
                          </div>

                          {/* Override Button */}
                          {conflict.severity === 'critical' && scheduleStatus === 'draft' && (
                            <button
                              onClick={() => setOverrideConflictId(`${conflict.dancerId}-${conflict.routine1Id}-${conflict.routine2Id}`)}
                              className="mt-3 w-full px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              ⚙️ Override with Reason
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-purple-200 text-sm">No conflicts detected</p>
                </div>
              )}
            </div>

            {/* Stats Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">Statistics</h2>
              <div className="space-y-3">
                {/* Unscheduled - Warning State */}
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0">⚠️</div>
                  <div className="flex-1">
                    <div className="text-xs text-amber-200/70 uppercase tracking-wide mb-1">Unscheduled</div>
                    <div className="text-3xl font-bold text-amber-300">{unscheduledRoutines.length}</div>
                    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${routines?.length ? (unscheduledRoutines.length / routines.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Scheduled - Success State */}
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0">✅</div>
                  <div className="flex-1">
                    <div className="text-xs text-emerald-200/70 uppercase tracking-wide mb-1">Scheduled</div>
                    <div className="text-3xl font-bold text-emerald-300">{scheduledCount}</div>
                    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${routines?.length ? (scheduledCount / routines.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Total - Info State */}
                <div className="bg-blue-500/15 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0">📊</div>
                  <div className="flex-1">
                    <div className="text-xs text-blue-200/70 uppercase tracking-wide mb-1">Total</div>
                    <div className="text-3xl font-bold text-blue-300">{routines?.length || 0}</div>
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/80">Overall Progress</span>
                    <span className="font-semibold text-amber-300">
                      {routines?.length ? Math.round((scheduledCount / routines.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${routines?.length ? (scheduledCount / routines.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px] flex items-center justify-center gap-2"
                >
                  <span>💾</span>
                  <span>Save Schedule</span>
                </button>
                <button
                  className="w-full px-4 py-3 rounded-lg font-semibold text-white border-2 border-white/30 hover:border-white/50 hover:bg-white/10 transition-all duration-300 hover:translate-y-[-2px] flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>Export Schedule</span>
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
    </DndContext>
  );
}
