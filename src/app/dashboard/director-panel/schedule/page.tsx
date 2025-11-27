'use client';

/**
 * Schedule Page - Rebuild Version (Phase 4)
 *
 * Clean implementation using new components:
 * - DragDropProvider for drag-and-drop
 * - RoutineTable for unscheduled routines
 * - ScheduleTable for scheduled routines
 * - Day tabs for date selection
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Draft schedule state (local changes before save)
  const [draftSchedule, setDraftSchedule] = useState<RoutineData[]>([]);

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

  // Selection state (scheduled routines)
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(new Set());

  // Selection handlers (unscheduled)
  const handleToggleSelection = (routineId: string, shiftKey: boolean) => {
    setSelectedRoutineIds(prev => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(unscheduledRoutinesFiltered.map(r => r.id));
    setSelectedRoutineIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedRoutineIds(new Set());
  };

  // Selection handlers (scheduled)
  const handleDeselectAllScheduled = () => {
    setSelectedScheduledIds(new Set());
  };

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

  // Schedule mutation (save draft to database)
  const scheduleMutation = trpc.scheduling.schedule.useMutation({
    onSuccess: async () => {
      toast.success('Schedule saved successfully');
      await Promise.all([refetch(), refetchConflicts()]); // Refetch routines AND conflicts
      setDraftSchedule([]); // Clear draft after new data loads
    },
    onError: (error) => {
      toast.error(`Failed to save schedule: ${error.message}`);
    },
  });

  // Reset mutations
  const resetDay = trpc.scheduling.resetDay.useMutation({
    onSuccess: async (data) => {
      toast.success(`Unscheduled ${data.count} routines`);
      await Promise.all([refetch(), refetchConflicts()]); // Refetch routines AND conflicts
      setDraftSchedule([]); // Clear local draft state AFTER refetch
    },
    onError: (error) => {
      toast.error(`Failed to reset day: ${error.message}`);
    },
  });

  const resetCompetition = trpc.scheduling.resetCompetition.useMutation({
    onSuccess: async (data) => {
      toast.success(`Unscheduled ${data.count} routines and deleted ${data.blocksDeleted || 0} blocks`);
      await Promise.all([refetch(), refetchBlocks(), refetchConflicts()]); // Refetch all
      setDraftSchedule([]); // Clear local draft state AFTER refetch
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
      setDraftSchedule(prev => prev.filter(r => !unscheduledIds.has(r.id)));

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

  // Build map of routineId -> conflicts for that routine
  const conflictsByRoutineId = useMemo(() => {
    if (!conflictsData?.conflicts) return new Map();

    const map = new Map<string, Array<typeof conflictsData.conflicts[0]>>();

    for (const conflict of conflictsData.conflicts) {
      // Add to routine1
      if (!map.has(conflict.routine1Id)) {
        map.set(conflict.routine1Id, []);
      }
      map.get(conflict.routine1Id)!.push(conflict);

      // Add to routine2
      if (!map.has(conflict.routine2Id)) {
        map.set(conflict.routine2Id, []);
      }
      map.get(conflict.routine2Id)!.push(conflict);
    }

    return map;
  }, [conflictsData]);

  // Clear draft when selectedDate changes (ensures correct day filtering)
  useEffect(() => {
    console.log('[SchedulePage] selectedDate changed to:', selectedDate);
    setDraftSchedule([]); // Clear draft to force reload from server
  }, [selectedDate]);

  // Initialize draft from server data when it changes
  useEffect(() => {
    if (routines && draftSchedule.length === 0) {
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
      setDraftSchedule(serverScheduled);
    }
  }, [routines, selectedDate, draftSchedule.length]);

  // Check if there are unsaved changes
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
  }, [hasUnsavedChanges, draftSchedule, scheduleMutation, selectedDate]);

  // Handle schedule changes from drag-drop
  const handleScheduleChange = (newSchedule: RoutineData[]) => {
    console.log('[SchedulePage] handleScheduleChange called with', newSchedule.length, 'routines');
    console.log('[SchedulePage] New schedule:', newSchedule);
    setDraftSchedule(newSchedule);
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

  // Save draft schedule to database
  const handleSaveSchedule = () => {
    if (draftSchedule.length === 0) {
      toast.error('No schedule to save');
      return;
    }

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
      setDraftSchedule(serverScheduled);
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

  // Competition dates for day tabs
  const competitionDates = [
    { date: '2026-04-09', routineCount: 0, startTime: '08:00:00' },
    { date: '2026-04-10', routineCount: 0, startTime: '08:00:00' },
    { date: '2026-04-11', routineCount: scheduledRoutines?.length || 0, startTime: '08:00:00' },
    { date: '2026-04-12', routineCount: 0, startTime: '08:00:00' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-500/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Schedule Builder</h1>
            <p className="text-sm text-purple-100 mt-1">
              Test Competition Spring 2026 • April 9-12, 2026
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {hasUnsavedChanges && (
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
