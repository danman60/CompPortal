'use client';

/**
 * Schedule Page - Rebuild Version (Phase 4)
 *
 * Clean implementation using new components:
 * - DragDropProvider for drag-and-drop
 * - RoutineTable for unscheduled routines
 * - ScheduleTable for scheduled routines
 * - Day tabs for date selection
 * - Version management for review workflow
 *
 * Spec: SCHEDULE_PAGE_REBUILD_SPEC.md
 * Old version archived: page.old.tsx
 */

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { DragDropProvider } from '@/components/scheduling/DragDropProvider';
import { RoutinePool, FilterState } from '@/components/scheduling/RoutinePool';
import { ScheduleTable } from '@/components/scheduling/ScheduleTable';
import { DayTabs } from '@/components/scheduling/DayTabs';
import { DraggableBlockTemplate } from '@/components/ScheduleBlockCard';
import { ScheduleBlockModal } from '@/components/ScheduleBlockModal';
import { SendToStudiosModal } from '@/components/scheduling/SendToStudiosModal';
import { VersionIndicator } from '@/components/scheduling/VersionIndicator';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Mail, Clock, History } from 'lucide-react';
import { autoFixRoutineConflict, autoFixDayConflicts, autoFixWeekendConflicts } from '@/lib/conflictAutoFix';

// TEST tenant ID (will be replaced with real tenant context)
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

interface RoutineData {
  id: string;
  title: string;
  duration: number;
  isScheduled: boolean;
  entryNumber?: number | null;
  performanceTime?: string | null;
}

export default function SchedulePage() {
  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string>('2026-04-11');

  // Draft schedule state per day (local changes before save)
  const [draftsByDate, setDraftsByDate] = useState<Record<string, RoutineData[]>>({});

  // Current day's draft (computed from map)
  const draftSchedule = draftsByDate[selectedDate] || [];

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    classifications: [],
    ageGroups: [],
    genres: [],
    groupSizes: [],
    studios: [],
    routineAges: [],
    search: '',
  });

  // Schedule block modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockType, setBlockType] = useState<'award' | 'break'>('award');

  // Selection state (unscheduled routines)
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Selection state (scheduled routines)
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(new Set());

  // Version management state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Fix All conflicts modal state
  const [showFixAllModal, setShowFixAllModal] = useState(false);

  // Selection handlers (unscheduled)
  const handleToggleSelection = (routineId: string, shiftKey: boolean) => {
    // Get the current filtered routines array (defined later in useMemo)
    const routines = unscheduledRoutinesFiltered;
    const currentIndex = routines.findIndex(r => r.id === routineId);

    if (currentIndex === -1) return;

    if (shiftKey && lastClickedIndex !== null) {
      // Shift+click: Select range from lastClickedIndex to currentIndex
      const start = Math.min(lastClickedIndex, currentIndex);
      const end = Math.max(lastClickedIndex, currentIndex);
      const rangeIds = routines.slice(start, end + 1).map(r => r.id);

      setSelectedRoutineIds(prev => {
        const next = new Set(prev);
        rangeIds.forEach(id => next.add(id));
        return next;
      });
    } else {
      // Normal click: Toggle selection
      setSelectedRoutineIds(prev => {
        const next = new Set(prev);
        if (next.has(routineId)) {
          next.delete(routineId);
        } else {
          next.add(routineId);
        }
        return next;
      });
    }

    // Always update last clicked index
    setLastClickedIndex(currentIndex);
  };

  const handleSelectAll = () => {
    const allIds = new Set(unscheduledRoutinesFiltered.map(r => r.id));
    setSelectedRoutineIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedRoutineIds(new Set());
    setLastClickedIndex(null);
  };

  // Selection handlers (scheduled)
  const handleDeselectAllScheduled = () => {
    setSelectedScheduledIds(new Set());
  };

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // Fetch all routines
  const { data: routines, isLoading, refetch } = trpc.scheduling.getRoutines.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // Fetch competition details for PDF branding
  const { data: competition } = trpc.competition.getById.useQuery({
    id: TEST_COMPETITION_ID,
  });

  // Fetch schedule blocks for selected date
  const { data: scheduleBlocks, refetch: refetchBlocks } = trpc.scheduling.getScheduleBlocks.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
    date: selectedDate,
  });

  // Fetch dynamic conflicts based on current schedule
  const { data: conflictsData, refetch: refetchConflicts } = trpc.scheduling.detectConflicts.useQuery(
    {
      competitionId: competition?.id || ''
    },
    {
      enabled: !!competition?.id,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch current version info
  const { data: versionData, refetch: refetchVersion } = trpc.scheduling.getCurrentVersion.useQuery(
    {
      tenantId: TEST_TENANT_ID,
      competitionId: TEST_COMPETITION_ID,
    },
    {
      refetchInterval: 60000, // Refresh every minute to check deadline
    }
  );

  // Fetch version history
  const { data: versionHistory, refetch: refetchHistory } = trpc.scheduling.getVersionHistory.useQuery(
    {
      tenantId: TEST_TENANT_ID,
      competitionId: TEST_COMPETITION_ID,
    },
    {
      enabled: showVersionHistory,
    }
  );

  const currentVersion = versionData;

  // Schedule mutation (save draft to database)
  // Note: onSuccess/onError handled in handleSaveSchedule for multi-day saves
  const scheduleMutation = trpc.scheduling.schedule.useMutation();

  // Reset mutations
  const resetDay = trpc.scheduling.resetDay.useMutation({
    onSuccess: async (data) => {
      toast.success(`Unscheduled ${data.count} routines`);
      await Promise.all([refetch(), refetchConflicts()]); // Refetch routines AND conflicts
      setDraftsByDate(prev => {
        const next = { ...prev };
        delete next[selectedDate]; // Clear draft for current day only
        return next;
      });
    },
    onError: (error) => {
      toast.error(`Failed to reset day: ${error.message}`);
    },
  });

  const resetCompetition = trpc.scheduling.resetCompetition.useMutation({
    onSuccess: async (data) => {
      toast.success(`Unscheduled ${data.count} routines and deleted ${data.blocksDeleted || 0} blocks`);
      await Promise.all([refetch(), refetchBlocks(), refetchConflicts()]); // Refetch all
      setDraftsByDate({}); // Clear ALL drafts
    },
    onError: (error) => {
      toast.error(`Failed to reset competition: ${error.message}`);
    },
  });

  // Unschedule specific routines mutation
  const unscheduleRoutines = trpc.scheduling.unscheduleRoutines.useMutation({
    onSuccess: async (data, variables) => {
      toast.success(`Unscheduled ${data.count} routine(s)`);

      await Promise.all([refetch(), refetchConflicts()]); // Refetch routines AND conflicts

      // Remove unscheduled routines from draft state AFTER refetch
      const unscheduledIds = new Set(variables.routineIds);
      setDraftsByDate(prev => ({
        ...prev,
        [selectedDate]: (prev[selectedDate] || []).filter(r => !unscheduledIds.has(r.id))
      }));

      setSelectedScheduledIds(new Set()); // Clear selection
    },
    onError: (error) => {
      toast.error(`Failed to unschedule routines: ${error.message}`);
    },
  });

  // Place schedule block mutation
  const placeBlock = trpc.scheduling.placeScheduleBlock.useMutation({
    onSuccess: async () => {
      toast.success('Schedule block placed');
      await Promise.all([refetchBlocks(), refetchConflicts()]); // Refetch blocks AND conflicts
    },
    onError: (error) => {
      toast.error(`Failed to place block: ${error.message}`);
    },
  });

  // Delete schedule block mutation
  const deleteBlock = trpc.scheduling.deleteScheduleBlock.useMutation({
    onSuccess: async () => {
      toast.success('Schedule block deleted');
      await Promise.all([refetchBlocks(), refetchConflicts()]); // Refetch blocks AND conflicts
    },
    onError: (error) => {
      toast.error(`Failed to delete block: ${error.message}`);
    },
  });

  // PDF Export function
  const handleExportPDF = async () => {
    if (!routines) {
      toast.error('No data to export');
      return;
    }

    // Auto-save draft changes before exporting
    if (draftSchedule.length > 0) {
      try {
        toast.loading('Saving schedule before export...', { id: 'pdf-save' });
        await scheduleMutation.mutateAsync({
          tenantId: TEST_TENANT_ID,
          competitionId: TEST_COMPETITION_ID,
          date: selectedDate,
          routines: draftSchedule.map(r => ({
            routineId: r.id,
            entryNumber: r.entryNumber || 100,
            performanceTime: r.performanceTime || '08:00:00',
          })),
        });
        await refetch(); // Refetch to get latest data
        toast.success('Schedule saved', { id: 'pdf-save' });
      } catch (error: any) {
        toast.error(`Failed to save schedule: ${error.message}`, { id: 'pdf-save' });
        return;
      }
    }

    // Get scheduled routines for selected date
    const scheduled = routines
      .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

    if (scheduled.length === 0) {
      toast.error('No routines scheduled for this day');
      return;
    }

    try {
      // Create PDF
      const doc = new jsPDF();

      // Add competition branding
      doc.setFontSize(18);
      doc.text(competition?.name || 'Competition Schedule', 14, 15);
      doc.setFontSize(12);
      doc.text('Performance Schedule', 14, 23);
      doc.setFontSize(10);
      doc.text(`Date: ${selectedDate}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35);

      // Merge routines and blocks into single sorted array
      const scheduleItems: Array<{ type: 'routine' | 'block'; data: any }> = [];

      // Add routines
      scheduled.forEach(r => {
        scheduleItems.push({
          type: 'routine',
          data: r,
        });
      });

      // Add blocks
      if (scheduleBlocks) {
        scheduleBlocks.forEach(block => {
          scheduleItems.push({
            type: 'block',
            data: block,
          });
        });
      }

      // Sort by time (routines use scheduledTimeString, blocks use scheduled_time)
      scheduleItems.sort((a, b) => {
        const timeA = a.type === 'routine' ? a.data.scheduledTimeString : a.data.scheduled_time?.toTimeString().split(' ')[0];
        const timeB = b.type === 'routine' ? b.data.scheduledTimeString : b.data.scheduled_time?.toTimeString().split(' ')[0];
        if (!timeA || !timeB) return 0;
        return timeA.localeCompare(timeB);
      });

      // Prepare table data
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
          // Block row
          const block = item.data;
          const time = block.scheduled_time ? block.scheduled_time.toTimeString().split(' ')[0].substring(0, 5) : '';
          const icon = block.block_type === 'award' ? '🏆' : '☕';
          const label = block.block_type === 'award' ? 'AWARD CEREMONY' : `${block.duration_minutes || 30} MINUTE BREAK`;
          return ['', time, `${icon} ${label}`, '', '', '', `${block.duration_minutes || 30} min`];
        }
      });

      // Add table
      autoTable(doc, {
        startY: 40,
        head: [['#', 'Time', 'Routine', 'Studio', 'Classification', 'Category', 'Duration']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: {
          0: { cellWidth: 15 }, // #
          1: { cellWidth: 20 }, // Time
          2: { cellWidth: 50 }, // Routine
          3: { cellWidth: 35 }, // Studio
          4: { cellWidth: 25 }, // Classification
          5: { cellWidth: 25 }, // Category
          6: { cellWidth: 20 }, // Duration
        },
      });

      // Save PDF
      const filename = `schedule-${selectedDate}.pdf`;
      doc.save(filename);
      toast.success(`📄 PDF exported: ${filename}`);
    } catch (error) {
      console.error('[PDF Export] Error:', error);
      toast.error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Compute filter options from routines (memoized for performance)
  const classifications = useMemo(() =>
    routines
      ? Array.from(new Set(routines.map(r => ({ id: r.classificationId, name: r.classificationName }))))
          .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
  , [routines]);

  const ageGroups = useMemo(() =>
    routines
      ? Array.from(new Set(routines.map(r => ({ id: r.ageGroupId, name: r.ageGroupName }))))
          .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
  , [routines]);

  const categories = useMemo(() =>
    routines
      ? Array.from(new Set(routines.map(r => ({ id: r.categoryId, name: r.categoryName }))))
          .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
  , [routines]);

  const groupSizes = useMemo(() =>
    routines
      ? Array.from(new Set(routines.map(r => ({ id: r.entrySizeId, name: r.entrySizeName }))))
          .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
  , [routines]);

  const studios = useMemo(() =>
    routines
      ? Array.from(new Set(routines.map(r => ({ id: r.studioId, name: r.studioName, code: r.studioCode }))))
          .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
  , [routines]);

  const routineAges = useMemo(() =>
    routines
      ? Array.from(new Set(
          routines
            .map(r => r.routineAge)
            .filter((age): age is number => age !== null && age > 0)
        ))
          .sort((a, b) => a - b)
          .map(age => ({ id: age.toString(), name: `${age} years` }))
      : []
  , [routines]);

  // Build map of routineId -> conflicts for that routine (database + draft conflicts)
  const conflictsByRoutineId = useMemo(() => {
    const map = new Map<string, any[]>();
    const MIN_ROUTINES_BETWEEN = 6;

    // Add database conflicts (from saved schedule)
    if (conflictsData?.conflicts) {
      for (const conflict of conflictsData.conflicts) {
        if (!map.has(conflict.routine1Id)) {
          map.set(conflict.routine1Id, []);
        }
        map.get(conflict.routine1Id)!.push(conflict);

        if (!map.has(conflict.routine2Id)) {
          map.set(conflict.routine2Id, []);
        }
        map.get(conflict.routine2Id)!.push(conflict);
      }
    }

    // Calculate draft conflicts (real-time based on draft positions)
    if (draftSchedule.length > 0 && routines) {
      const scheduledWithData = draftSchedule
        .map(draft => {
          const full = routines.find(r => r.id === draft.id);
          if (!full) return null;
          return {
            id: full.id,
            title: full.title,
            entryNumber: draft.entryNumber || 0,
            dancer_names: full.dancer_names || [],
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.entryNumber - b.entryNumber);

      // Check each pair of routines
      for (let i = 0; i < scheduledWithData.length; i++) {
        for (let j = i + 1; j < scheduledWithData.length; j++) {
          const routine1 = scheduledWithData[i];
          const routine2 = scheduledWithData[j];

          // Find shared dancers
          const sharedDancers = routine1.dancer_names.filter(d =>
            routine2.dancer_names.includes(d)
          );

          if (sharedDancers.length > 0) {
            const routinesBetween = routine2.entryNumber - routine1.entryNumber - 1;

            // Only flag if within critical range
            if (routinesBetween < MIN_ROUTINES_BETWEEN) {
              const severity =
                routinesBetween === 0 ? 'critical' :
                routinesBetween <= 3 ? 'error' : 'warning';

              const conflict = {
                dancerId: sharedDancers[0], // Use first shared dancer as ID
                dancerName: sharedDancers.join(', '),
                routine1Id: routine1.id,
                routine1Number: routine1.entryNumber,
                routine1Title: routine1.title,
                routine2Id: routine2.id,
                routine2Number: routine2.entryNumber,
                routine2Title: routine2.title,
                routinesBetween,
                severity,
                message: `${sharedDancers.join(', ')} has ${routinesBetween} routine${routinesBetween !== 1 ? 's' : ''} between performances (need ${MIN_ROUTINES_BETWEEN}+ for costume changes)`,
                isDraft: true, // Mark as draft conflict
              };

              // Add to both routines
              if (!map.has(routine1.id)) {
                map.set(routine1.id, []);
              }
              map.get(routine1.id)!.push(conflict);

              if (!map.has(routine2.id)) {
                map.set(routine2.id, []);
              }
              map.get(routine2.id)!.push(conflict);
            }
          }
        }
      }
    }

    return map;
  }, [conflictsData, draftSchedule, routines]);

  // Count conflicts on current day
  const dayConflictCount = useMemo(() => {
    const daySchedule = draftsByDate[selectedDate] || [];
    let count = 0;
    for (const [routineId, conflicts] of conflictsByRoutineId?.entries() || []) {
      if (daySchedule.some(r => r.id === routineId)) {
        count += conflicts.length;
      }
    }
    // Divide by 2 since each conflict is counted twice (once for each routine)
    return Math.floor(count / 2);
  }, [conflictsByRoutineId, draftsByDate, selectedDate]);

  // Initialize draft from server data when it changes or switching days
  useEffect(() => {
    if (routines && !draftsByDate[selectedDate]) {
      const serverScheduled = routines
        .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0))
        .map(r => ({
          id: r.id,
          title: r.title,
          duration: r.duration,
          isScheduled: r.isScheduled,
          entryNumber: r.entryNumber,
          performanceTime: r.scheduledTimeString,
        }));
      setDraftsByDate(prev => ({
        ...prev,
        [selectedDate]: serverScheduled
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routines, selectedDate]); // Don't include draftsByDate - it would cause infinite loops

  // Renumber all drafts globally in chronological order whenever any day changes
  useEffect(() => {
    const dates = ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'];
    let hasChanges = false;
    let currentEntry = 100;
    const renumbered: Record<string, RoutineData[]> = {};

    // Process each day in chronological order
    for (const date of dates) {
      const dayDraft = draftsByDate[date] || [];
      if (dayDraft.length === 0) continue;

      const renumberedDay = dayDraft.map(routine => {
        const newRoutine = { ...routine, entryNumber: currentEntry };
        currentEntry++;

        // Check if entry number changed
        if (routine.entryNumber !== newRoutine.entryNumber) {
          hasChanges = true;
        }

        return newRoutine;
      });

      renumbered[date] = renumberedDay;
    }

    // Only update if numbers actually changed
    if (hasChanges) {
      setDraftsByDate(prev => {
        const updated = { ...prev };
        for (const date of dates) {
          if (renumbered[date]) {
            updated[date] = renumbered[date];
          }
        }
        return updated;
      });
    }
  }, [draftsByDate]);

  // Check if there are unsaved changes on current day
  const hasUnsavedChanges = useMemo(() => {
    if (!routines) return false;
    const serverScheduled = routines
      .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

    // Compare draft with server state
    if (draftSchedule.length !== serverScheduled.length) return true;

    return draftSchedule.some((draft, index) => {
      const server = serverScheduled[index];
      return (
        draft.id !== server.id ||
        draft.entryNumber !== server.entryNumber ||
        draft.performanceTime !== server.scheduledTimeString
      );
    });
  }, [draftSchedule, routines, selectedDate]);

  // Check if ANY day has unsaved changes (for persistent button)
  const hasAnyUnsavedChanges = useMemo(() => {
    if (!routines) return false;

    // Check each date in draftsByDate
    return Object.keys(draftsByDate).some(date => {
      const dayDraft = draftsByDate[date] || [];
      const serverScheduled = routines
        .filter(r => r.isScheduled && r.scheduledDateString === date)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

      // Compare draft with server state for this date
      if (dayDraft.length !== serverScheduled.length) return true;

      return dayDraft.some((draft, index) => {
        const server = serverScheduled[index];
        if (!server) return true;
        return (
          draft.id !== server.id ||
          draft.entryNumber !== server.entryNumber ||
          draft.performanceTime !== server.scheduledTimeString
        );
      });
    });
  }, [draftsByDate, routines]);

  // 5-minute autosave with safety checks
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      // Safety checks before autosaving
      if (!hasUnsavedChanges) return; // No unsaved changes
      if (draftSchedule.length === 0) return; // No draft to save
      if (scheduleMutation.isPending) return; // Save already in progress

      console.log('[Autosave] Saving schedule...');
      scheduleMutation.mutate({
        tenantId: TEST_TENANT_ID,
        competitionId: TEST_COMPETITION_ID,
        date: selectedDate,
        routines: draftSchedule.map(r => ({
          routineId: r.id,
          entryNumber: r.entryNumber || 100,
          performanceTime: r.performanceTime || '08:00:00',
        })),
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autosaveInterval);
  }, [hasUnsavedChanges, draftSchedule, scheduleMutation]);

  // Handle schedule changes from drag-drop
  const handleScheduleChange = (newSchedule: RoutineData[]) => {
    console.log('[SchedulePage] handleScheduleChange called with', newSchedule.length, 'routines');
    console.log('[SchedulePage] New schedule:', newSchedule);
    setDraftsByDate(prev => ({
      ...prev,
      [selectedDate]: newSchedule
    }));
  };

  // Handle block reordering from drag-drop (saves immediately)
  const handleBlockReorder = async (reorderedBlocks: any[]) => {
    console.log('[SchedulePage] Block reorder triggered, updating', reorderedBlocks.length, 'blocks');

    try {
      await Promise.all(
        reorderedBlocks.map(block =>
          fetch('/api/trpc/scheduling.updateBlockPosition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blockId: block.id,
              scheduledTime: block.scheduled_time.toISOString(),
              sortOrder: block.sort_order,
            }),
          })
        )
      );

      toast.success('Schedule blocks reordered');
      refetchBlocks();
    } catch (error) {
      console.error('[SchedulePage] Failed to reorder blocks:', error);
      toast.error('Failed to reorder blocks');
    }
  };

  // Auto-fix conflict for a single routine
  const handleAutoFixConflict = (routineId: string) => {
    const daySchedule = draftsByDate[selectedDate] || [];

    if (daySchedule.length === 0) {
      toast.error('No schedule to fix');
      return;
    }

    // Transform RoutineData to Routine with participants
    const dayScheduleWithParticipants = daySchedule.map(draft => {
      const full = routines?.find(r => r.id === draft.id);
      return {
        id: draft.id,
        title: draft.title,
        entryNumber: draft.entryNumber ?? undefined,
        participants: (full?.dancer_names || []).map((name: string) => ({
          dancerId: name, // Use name as ID for now
          dancerName: name,
        })),
        scheduledDateString: selectedDate,
      };
    });

    const { success, newSchedule, result } = autoFixRoutineConflict(routineId, dayScheduleWithParticipants);

    if (success && newSchedule) {
      // Map newSchedule back to RoutineData format
      const updatedDraft = newSchedule.map((r, index) => ({
        id: r.id,
        title: r.title,
        duration: daySchedule.find(d => d.id === r.id)?.duration || 0,
        isScheduled: true,
        entryNumber: r.entryNumber,
        performanceTime: daySchedule.find(d => d.id === r.id)?.performanceTime,
      }));

      setDraftsByDate(prev => ({
        ...prev,
        [selectedDate]: updatedDraft
      }));

      const movedRoutine = result.movedRoutines[0];
      if (movedRoutine) {
        toast.success(
          `Moved "${movedRoutine.routineTitle}" from position ${movedRoutine.fromPosition + 1} to ${movedRoutine.toPosition + 1} (${movedRoutine.distance} positions)`
        );
      }
    } else {
      const unresolvedReason = result.unresolvedConflicts[0]?.reason || 'Failed to auto-fix conflict';
      toast.error(unresolvedReason);
    }
  };

  // Auto-fix all conflicts on current day
  const handleFixAllDay = () => {
    const daySchedule = draftsByDate[selectedDate] || [];
    const dayConflicts = Array.from(conflictsByRoutineId?.entries() || [])
      .filter(([routineId]) => daySchedule.some(r => r.id === routineId))
      .flatMap(([, conflicts]) => conflicts);

    if (dayConflicts.length === 0) {
      toast.error('No conflicts to fix on this day');
      setShowFixAllModal(false);
      return;
    }

    // Transform to Routine format with participants
    const dayScheduleWithParticipants = daySchedule.map(draft => {
      const full = routines?.find(r => r.id === draft.id);
      return {
        id: draft.id,
        title: draft.title,
        entryNumber: draft.entryNumber ?? undefined,
        participants: (full?.dancer_names || []).map((name: string) => ({
          dancerId: name,
          dancerName: name,
        })),
        scheduledDateString: selectedDate,
      };
    });

    const result = autoFixDayConflicts(dayScheduleWithParticipants, dayConflicts);

    // Update draft with modified schedule (map back to RoutineData)
    if (result.newSchedule) {
      const updatedDraft = result.newSchedule.map((r) => ({
        id: r.id,
        title: r.title,
        duration: daySchedule.find(d => d.id === r.id)?.duration || 0,
        isScheduled: true,
        entryNumber: r.entryNumber,
        performanceTime: daySchedule.find(d => d.id === r.id)?.performanceTime,
      }));

      setDraftsByDate(prev => ({
        ...prev,
        [selectedDate]: updatedDraft
      }));
    }

    // Show results
    const totalMoved = result.movedRoutines.length;
    const totalResolved = result.resolvedConflicts;
    const totalUnresolved = result.unresolvedConflicts.length;

    if (result.success) {
      toast.success(`Fixed all conflicts! Moved ${totalMoved} routines, resolved ${totalResolved} conflicts.`);
    } else {
      toast.error(`Partially fixed: Moved ${totalMoved} routines, resolved ${totalResolved} conflicts. ${totalUnresolved} conflicts remain.`);
    }

    setShowFixAllModal(false);
  };

  // Auto-fix all conflicts across entire weekend
  const handleFixAllWeekend = () => {
    const conflictsByDate: Record<string, any[]> = {};

    // Group conflicts by date
    for (const [routineId, conflicts] of conflictsByRoutineId?.entries() || []) {
      const routine = (routines || []).find(r => r.id === routineId);
      const date = routine?.scheduledDateString;
      if (date) {
        if (!conflictsByDate[date]) conflictsByDate[date] = [];
        conflictsByDate[date].push(...conflicts);
      }
    }

    // Transform all days to Routine format (include ALL scheduled days, not just drafts)
    const scheduleByDateWithParticipants: Record<string, any[]> = {};

    // Get all unique dates with scheduled routines (from drafts OR server data)
    const allDates = new Set<string>();
    Object.keys(draftsByDate).forEach(date => allDates.add(date));
    (routines || []).filter(r => r.isScheduled && r.scheduledDateString).forEach(r => allDates.add(r.scheduledDateString!));

    for (const date of allDates) {
      // Use draft if available, otherwise use server data
      const daySchedule = draftsByDate[date] || (routines || []).filter(r => r.isScheduled && r.scheduledDateString === date);

      scheduleByDateWithParticipants[date] = daySchedule.map(routine => {
        const full = routines?.find(r => r.id === routine.id);
        return {
          id: routine.id,
          title: routine.title || full?.title || '',
          entryNumber: routine.entryNumber ?? full?.entryNumber ?? undefined,
          participants: (full?.dancer_names || []).map((name: string) => ({
            dancerId: name,
            dancerName: name,
          })),
          scheduledDateString: date,
        };
      });
    }

    const results = autoFixWeekendConflicts(scheduleByDateWithParticipants, conflictsByDate);

    // Update all days with fixed schedules
    setDraftsByDate(prev => {
      const updated = { ...prev };
      for (const [date, result] of Object.entries(results)) {
        if (result.newSchedule && result.movedRoutines.length > 0) {
          // Map back to RoutineData format
          updated[date] = result.newSchedule.map((r) => ({
            id: r.id,
            title: r.title,
            duration: draftsByDate[date]?.find(d => d.id === r.id)?.duration || 0,
            isScheduled: true,
            entryNumber: r.entryNumber,
            performanceTime: draftsByDate[date]?.find(d => d.id === r.id)?.performanceTime,
          }));
        }
      }
      return updated;
    });

    // Show summary
    const totalDays = Object.keys(results).length;
    const totalMoved = Object.values(results).reduce((sum, r) => sum + r.movedRoutines.length, 0);
    const totalResolved = Object.values(results).reduce((sum, r) => sum + r.resolvedConflicts, 0);
    const totalUnresolved = Object.values(results).reduce((sum, r) => sum + r.unresolvedConflicts.length, 0);

    if (totalUnresolved === 0) {
      toast.success(`Fixed all conflicts across ${totalDays} days! Moved ${totalMoved} routines, resolved ${totalResolved} conflicts.`);
    } else {
      toast.error(`Partially fixed ${totalDays} days: Moved ${totalMoved} routines, resolved ${totalResolved} conflicts. ${totalUnresolved} conflicts remain.`);
    }

    setShowFixAllModal(false);
  };

  // Save draft schedule to database
  const handleSaveSchedule = async () => {
    if (!routines) return;

    // Find all dates with unsaved changes
    const datesToSave: string[] = [];

    for (const [date, dayDraft] of Object.entries(draftsByDate)) {
      const serverScheduled = routines
        .filter(r => r.isScheduled && r.scheduledDateString === date)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

      // Compare draft with server state
      const hasChanges =
        dayDraft.length !== serverScheduled.length ||
        dayDraft.some((draft, index) => {
          const server = serverScheduled[index];
          if (!server) return true;
          return (
            draft.id !== server.id ||
            draft.entryNumber !== server.entryNumber ||
            draft.performanceTime !== server.scheduledTimeString
          );
        });

      if (hasChanges && dayDraft.length > 0) {
        datesToSave.push(date);
      }
    }

    if (datesToSave.length === 0) {
      toast.error('No changes to save');
      return;
    }

    // Save all changed days sequentially
    try {
      for (const date of datesToSave) {
        const dayDraft = draftsByDate[date] || [];
        await new Promise<void>((resolve, reject) => {
          scheduleMutation.mutate(
            {
              tenantId: TEST_TENANT_ID,
              competitionId: TEST_COMPETITION_ID,
              date,
              routines: dayDraft.map(r => ({
                routineId: r.id,
                entryNumber: r.entryNumber || 100,
                performanceTime: r.performanceTime || '08:00:00',
              })),
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }

      toast.success(`Saved schedule for ${datesToSave.length} day${datesToSave.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error('Failed to save some days');
    }
  };

  // Discard changes and revert to server state
  const handleDiscardChanges = () => {
    if (routines) {
      const serverScheduled = routines
        .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
        .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0))
        .map(r => ({
          id: r.id,
          title: r.title,
          duration: r.duration,
          isScheduled: r.isScheduled,
          entryNumber: r.entryNumber,
          performanceTime: r.scheduledTimeString,
        }));
      setDraftsByDate(prev => ({
        ...prev,
        [selectedDate]: serverScheduled
      }));
      toast.success('Changes discarded');
    }
  };

  // Filter routines into unscheduled and scheduled for the selected day
  const unscheduledRoutines = (routines || [])
    .filter(r => !r.isScheduled);

  // Use draft schedule for display (not server data)
  const scheduledRoutines = useMemo(() => {
    console.log('[SchedulePage] Computing scheduledRoutines. draftSchedule.length:', draftSchedule.length);

    const result = draftSchedule.length > 0
      ? draftSchedule
          .map(draft => {
            const full = routines?.find(r => r.id === draft.id);
            if (!full) {
              console.warn('[SchedulePage] Could not find full routine for draft ID:', draft.id);
              return null;
            }
            return { ...full, entryNumber: draft.entryNumber, scheduledTimeString: draft.performanceTime };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
      : (routines || [])
          .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
          .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

    console.log('[SchedulePage] scheduledRoutines computed:', result.length, 'routines');
    return result;
  }, [draftSchedule, routines, selectedDate]);

  // Prepare routine data for DragDropProvider (unscheduled + draft schedule)
  // IMPORTANT: Exclude routines from unscheduled pool if they're in the draft schedule
  const draftRoutineIds = new Set(draftSchedule.map(d => d.id));
  const allRoutinesData = [
    ...unscheduledRoutines
      .filter(r => !draftRoutineIds.has(r.id)) // Don't show in unscheduled if in draft
      .map(r => ({
        id: r.id,
        title: r.title,
        duration: r.duration,
        isScheduled: false,
        entryNumber: null,
        performanceTime: null,
      })),
    ...draftSchedule,
  ];

  // Filter unscheduled routines for display (exclude draft scheduled routines + apply filters)
  const unscheduledRoutinesFiltered = useMemo(() => {
    const draftIds = new Set(draftSchedule.map(d => d.id));

    return unscheduledRoutines.filter(r => {
      // Exclude draft scheduled
      if (draftIds.has(r.id)) return false;

      // Apply classification filter
      if (filters.classifications.length > 0 && !filters.classifications.includes(r.classificationId)) {
        return false;
      }

      // Apply age group filter
      if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(r.ageGroupId)) {
        return false;
      }

      // Apply genre (category) filter
      if (filters.genres.length > 0 && !filters.genres.includes(r.categoryId)) {
        return false;
      }

      // Apply group size (entry size) filter
      if (filters.groupSizes.length > 0 && !filters.groupSizes.includes(r.entrySizeId)) {
        return false;
      }

      // Apply studio filter
      if (filters.studios.length > 0 && !filters.studios.includes(r.studioId)) {
        return false;
      }

      // Apply routine age filter (if routineAge is not null)
      if (filters.routineAges.length > 0 && r.routineAge) {
        const ageStr = String(r.routineAge);
        if (!filters.routineAges.includes(ageStr)) {
          return false;
        }
      }

      return true;
    });
  }, [unscheduledRoutines, draftSchedule, filters]);

  // Competition dates for day tabs - show draft counts (if exists), otherwise saved counts
  const competitionDates = useMemo(() => {
    const dates = [
      { date: '2026-04-09' },
      { date: '2026-04-10' },
      { date: '2026-04-11' },
      { date: '2026-04-12' },
    ];

    return dates.map(d => {
      // Find first scheduled routine for this date to get start time
      const firstRoutine = (routines || [])
        .filter(r => r.isScheduled && r.scheduledDateString === d.date)
        .sort((a, b) => (a.entryNumber ?? 0) - (b.entryNumber ?? 0))[0];

      // Extract start time from scheduledTimeString, default to '08:00:00'
      const startTime = firstRoutine?.scheduledTimeString || '08:00:00';

      // Count saved routines (always from database, ignores drafts)
      const savedRoutineCount = (routines || []).filter(
        r => r.isScheduled && r.scheduledDateString === d.date
      ).length;

      return {
        ...d,
        startTime,
        routineCount: draftsByDate[d.date]
          ? draftsByDate[d.date].length // Show draft count if it exists
          : savedRoutineCount, // Otherwise show saved count
        savedRoutineCount, // Always show saved count for pencil visibility
      };
    });
  }, [routines, draftsByDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-500/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Schedule Builder</h1>

              {/* Version Indicator - Inline */}
              {versionData && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white/90">
                    Version {versionData.versionNumber}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    versionData.status === 'draft'
                      ? 'bg-purple-900/30 text-purple-200 border border-purple-500/30'
                      : versionData.status === 'under_review'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}>
                    {versionData.status === 'draft' && '⚠️ Draft'}
                    {versionData.status === 'under_review' && '⏱️ Under Review'}
                    {versionData.status === 'review_closed' && '✅ Review Closed'}
                  </span>
                </div>
              )}

              {/* Version History Link - Inline */}
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="text-xs text-purple-200 hover:text-white flex items-center gap-1"
              >
                <History className="h-3 w-3" />
                {showVersionHistory ? 'Hide' : 'View'} Version History
              </button>
            </div>
            <p className="text-sm text-purple-100 mt-1">
              Test Competition Spring 2026 • April 9-12, 2026
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Send to Studios Button */}
            <button
              onClick={() => setShowSendModal(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Send Draft to Studios
            </button>
            {/* Fix All Conflicts Button - Only show if conflicts exist */}
            {dayConflictCount > 0 && (
              <button
                onClick={() => setShowFixAllModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                title={`${dayConflictCount} conflict${dayConflictCount !== 1 ? 's' : ''} detected on this day`}
              >
                <span className="text-lg">🔧</span>
                Fix All Conflicts ({dayConflictCount})
              </button>
            )}
            {hasAnyUnsavedChanges && (
              <>
                <button
                  onClick={handleSaveSchedule}
                  disabled={scheduleMutation.isPending}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  💾 Save Schedule
                </button>
                <button
                  onClick={handleDiscardChanges}
                  className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  ❌ Discard
                </button>
                <span className="text-yellow-300 text-sm font-medium">
                  ● Unsaved changes
                </span>
              </>
            )}
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              onClick={() => {
                if (confirm(`Reset schedule for ${new Date(selectedDate).toLocaleDateString()}? This will unschedule all routines for this day.`)) {
                  resetDay.mutate({
                    tenantId: TEST_TENANT_ID,
                    competitionId: TEST_COMPETITION_ID,
                    date: selectedDate,
                  });
                }
              }}
            >
              🗑️ Reset Day
            </button>
            {selectedScheduledIds.size > 0 && (
              <button
                className="px-4 py-2 bg-orange-500/80 hover:bg-orange-600 text-white rounded-lg transition-colors"
                onClick={() => {
                  if (confirm(`Unschedule ${selectedScheduledIds.size} selected routine(s)?`)) {
                    unscheduleRoutines.mutate({
                      tenantId: TEST_TENANT_ID,
                      competitionId: TEST_COMPETITION_ID,
                      routineIds: Array.from(selectedScheduledIds),
                    });
                  }
                }}
              >
                ↩️ Unschedule ({selectedScheduledIds.size})
              </button>
            )}
            <button
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              onClick={() => {
                if (confirm('Reset ALL days? This will unschedule all routines for the entire competition.')) {
                  resetCompetition.mutate({
                    tenantId: TEST_TENANT_ID,
                    competitionId: TEST_COMPETITION_ID,
                  });
                }
              }}
            >
              🗑️ Reset All
            </button>
            <button
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              onClick={handleExportPDF}
            >
              📥 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="px-6">
        <DragDropProvider
          routines={allRoutinesData}
          scheduleBlocks={scheduleBlocks || []}
          selectedDate={selectedDate}
          onScheduleChange={handleScheduleChange}
          onBlockReorder={handleBlockReorder}
          selectedRoutineIds={selectedRoutineIds}
          selectedScheduledIds={selectedScheduledIds}
          onClearSelection={handleDeselectAll}
          onClearScheduledSelection={handleDeselectAllScheduled}
          allDraftsByDate={draftsByDate}
        >
          <div className="grid grid-cols-3 gap-2">
          {/* Left Panel - Unscheduled Routines (33%) - Sticky */}
          <div className="col-span-1 space-y-4 sticky top-4 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <RoutinePool
              routines={unscheduledRoutinesFiltered as any}
              isLoading={isLoading}
              viewMode="cd"
              classifications={classifications.map(c => ({ id: c.id, label: c.name }))}
              ageGroups={ageGroups.map(ag => ({ id: ag.id, label: ag.name }))}
              genres={categories.map(c => ({ id: c.id, label: c.name }))}
              groupSizes={groupSizes.map(gs => ({ id: gs.id, label: gs.name }))}
              studios={studios.map(s => ({ id: s.id, label: `${s.code} - ${s.name}` }))}
              routineAges={routineAges.map(ra => ({ id: ra.id, label: ra.name }))}
              filters={filters}
              onFiltersChange={setFilters}
              totalRoutines={routines?.length || 0}
              filteredRoutines={unscheduledRoutinesFiltered.length}
              selectedRoutineIds={selectedRoutineIds}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          </div>

          {/* Right Panel - Scheduled Routines (67%) */}
          <div className="col-span-2 space-y-4">
            {/* Day Tabs + Schedule Block Buttons */}
            <div className="py-2">
              <DayTabs
                days={competitionDates}
                activeDay={selectedDate}
                onDayChange={(date) => setSelectedDate(date)}
                competitionId={TEST_COMPETITION_ID}
                tenantId={TEST_TENANT_ID}
                onCreateBlock={(type) => {
                  setBlockType(type);
                  setShowBlockModal(true);
                }}
                onStartTimeUpdated={async () => {
                  // Invalidate cache to force fresh data fetch
                  await Promise.all([
                    utils.scheduling.getRoutines.invalidate(),
                    utils.scheduling.detectConflicts.invalidate(),
                  ]);
                }}
                onResetDay={() => {
                  if (confirm(`Reset schedule for ${new Date(selectedDate).toLocaleDateString()}? This will unschedule all routines for this day.`)) {
                    resetDay.mutate({
                      tenantId: TEST_TENANT_ID,
                      competitionId: TEST_COMPETITION_ID,
                      date: selectedDate,
                    });
                  }
                }}
                onResetAll={() => {
                  if (confirm('Reset ALL days? This will unschedule all routines for the entire competition.')) {
                    resetCompetition.mutate({
                      tenantId: TEST_TENANT_ID,
                      competitionId: TEST_COMPETITION_ID,
                    });
                  }
                }}
              />
            </div>

            <ScheduleTable
              routines={scheduledRoutines as any}
              allRoutines={(routines || []).map(r => ({
                id: r.id,
                entrySizeName: r.entrySizeName,
                ageGroupName: r.ageGroupName,
                classificationName: r.classificationName,
                isScheduled: r.isScheduled,
              }))}
              selectedDate={selectedDate}
              viewMode="cd"
              conflicts={[]}
              conflictsByRoutineId={conflictsByRoutineId}
              selectedRoutineIds={selectedScheduledIds}
              onSelectionChange={setSelectedScheduledIds}
              onAutoFixConflict={handleAutoFixConflict}
              scheduleBlocks={scheduleBlocks}
              onDeleteBlock={(blockId) => {
                if (confirm('Delete this schedule block?')) {
                  deleteBlock.mutate({ blockId });
                }
              }}
            />
          </div>
          </div>
        </DragDropProvider>
      </div>

      {/* Schedule Block Modal */}
      <ScheduleBlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onSave={async (block) => {
          if (!block.blockId || !block.placement) {
            toast.error('Missing block ID or placement data');
            return;
          }

          try {
            // Calculate targetTime and displayOrder based on placement type
            let targetTime: Date;
            let displayOrder: number;

            if (block.placement.type === 'by_time' && block.placement.time) {
              // By time: Use provided time with selected date (parse in local timezone)
              const [hours, minutes] = block.placement.time.split(':').map(Number);
              const [year, month, day] = selectedDate.split('-').map(Number);
              targetTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

              // Find display order: count routines before this time + 1
              const routinesBeforeTime = (scheduledRoutines || []).filter(r => {
                if (!r.scheduledTimeString) return false;
                const [rHours, rMinutes] = r.scheduledTimeString.split(':').map(Number);
                return rHours < hours || (rHours === hours && rMinutes < minutes);
              });
              displayOrder = routinesBeforeTime.length + 1;
            } else if (block.placement.type === 'after_routine' && block.placement.routineNumber) {
              // After routine: Find routine by entry number
              const targetRoutine = (scheduledRoutines || []).find(
                r => r.entryNumber === block.placement?.routineNumber
              );

              if (!targetRoutine || !targetRoutine.scheduledTimeString) {
                toast.error(`Routine #${block.placement?.routineNumber} not found or not scheduled`);
                return;
              }

              // Calculate time: routine's time + duration (parse in local timezone)
              const [hours, minutes] = targetRoutine.scheduledTimeString.split(':').map(Number);
              const [year, month, day] = selectedDate.split('-').map(Number);
              targetTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
              targetTime.setMinutes(targetTime.getMinutes() + (targetRoutine.duration || 0));

              // Display order: routine's entry number + 1
              displayOrder = (targetRoutine.entryNumber || 0) + 1;
            } else {
              toast.error('Invalid placement configuration');
              return;
            }

            // Call placeScheduleBlock mutation
            await placeBlock.mutateAsync({
              blockId: block.blockId,
              targetTime,
              displayOrder,
            });

            toast.success(`${block.type === 'award' ? '🏆' : '☕'} Block placed: ${block.title}`);
            refetch();
            refetchBlocks();
          } catch (error: any) {
            toast.error(`Failed to place block: ${error.message}`);
          }
        }}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        mode="create"
        preselectedType={blockType}
      />

      {/* Send to Studios Modal */}
      <SendToStudiosModal
        open={showSendModal}
        onClose={() => setShowSendModal(false)}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        currentVersion={currentVersion?.versionNumber || 0}
        onSuccess={() => {
          refetchVersion();
          refetchHistory();
        }}
        onSaveBeforeSend={async () => {
          if (draftSchedule.length > 0) {
            await new Promise<void>((resolve, reject) => {
              scheduleMutation.mutate(
                {
                  tenantId: TEST_TENANT_ID,
                  competitionId: TEST_COMPETITION_ID,
                  date: selectedDate,
                  routines: draftSchedule.map(r => ({
                    routineId: r.id,
                    entryNumber: r.entryNumber || 100,
                    performanceTime: r.performanceTime || '08:00:00',
                  })),
                },
                {
                  onSuccess: () => resolve(),
                  onError: (error) => reject(error),
                }
              );
            });
          }
        }}
      />

      {/* Fix All Conflicts Modal */}
      <Modal
        isOpen={showFixAllModal}
        onClose={() => setShowFixAllModal(false)}
        title="Auto-Fix Conflicts"
        description="Choose scope for automatic conflict resolution"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowFixAllModal(false)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Select which conflicts to automatically fix. The system will move routines the minimum distance necessary to resolve conflicts within the same competition day.
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
                    Resolve {dayConflictCount} conflict{dayConflictCount !== 1 ? 's' : ''} on {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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

          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-200">
              <strong>Note:</strong> Routines will only be moved within their scheduled day. The system finds the nearest conflict-free position with minimum movement.
            </p>
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
                ×
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {versionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No versions yet. Click "Send Draft to Studios" to create version 0.
              </p>
            ) : (
              versionHistory.map((version: any) => (
                <div
                  key={version.versionNumber}
                  className={`p-3 rounded-lg border ${
                    version.versionNumber === currentVersion?.versionNumber
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">
                      Version {version.versionNumber}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      version.status === 'under_review'
                        ? 'bg-yellow-100 text-yellow-700'
                        : version.status === 'review_closed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {version.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Created: {new Date(version.createdAt).toLocaleDateString()}</p>
                    {version.sentAt && (
                      <p>Sent: {new Date(version.sentAt).toLocaleDateString()}</p>
                    )}
                    {version.closedAt && (
                      <p>Closed: {new Date(version.closedAt).toLocaleDateString()}</p>
                    )}
                    {version.notesCount > 0 && (
                      <p className="text-blue-600">{version.notesCount} studio notes</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
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
    </div>
  );
}
