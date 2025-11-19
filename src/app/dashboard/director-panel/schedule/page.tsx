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

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { DragDropProvider } from '@/components/scheduling/DragDropProvider';
import { RoutinePool, FilterState } from '@/components/scheduling/RoutinePool';
import { ScheduleTable } from '@/components/scheduling/ScheduleTable';
import { DayTabs } from '@/components/scheduling/DayTabs';
import { DraggableBlockTemplate } from '@/components/ScheduleBlockCard';
import { ScheduleBlockModal } from '@/components/ScheduleBlockModal';

// TEST tenant ID (will be replaced with real tenant context)
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

export default function SchedulePage() {
  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string>('2026-04-11');

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

  // Fetch all routines
  const { data: routines, isLoading, refetch } = trpc.scheduling.getRoutines.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // Reset mutations
  const resetDay = trpc.scheduling.resetDay.useMutation({
    onSuccess: (data) => {
      toast.success(`Unscheduled ${data.count} routines`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reset day: ${error.message}`);
    },
  });

  const resetCompetition = trpc.scheduling.resetCompetition.useMutation({
    onSuccess: (data) => {
      toast.success(`Unscheduled ${data.count} routines`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reset competition: ${error.message}`);
    },
  });

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

  // Filter routines into unscheduled and scheduled for the selected day
  const unscheduledRoutines = (routines || [])
    .filter(r => !r.isScheduled);

  // Filter scheduled routines for the selected day
  const scheduledRoutines = (routines || [])
    .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
    .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

  // Prepare routine data for DragDropProvider (only unscheduled + scheduled for this day)
  const allRoutinesData = [
    ...unscheduledRoutines,
    ...scheduledRoutines,
  ].map(r => ({
    id: r.id,
    title: r.title,
    duration: r.duration,
    isScheduled: r.isScheduled,
    entryNumber: r.entryNumber,
    performanceTime: r.scheduledTimeString,
  }));

  const handleDropSuccess = () => {
    toast.success('Routine scheduled successfully');
    refetch();
  };

  const handleDropError = (error: Error) => {
    toast.error(`Failed to schedule routine: ${error.message}`);
  };

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
          <div className="flex gap-3">
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
              onClick={() => toast('Export PDF feature coming soon')}
            >
              📥 Export PDF
            </button>
            <button
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              onClick={() => toast('Export Excel feature coming soon')}
            >
              📥 Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="px-6 py-4 bg-purple-900/30 border-b border-purple-500/20">
        <DayTabs
          days={competitionDates}
          activeDay={selectedDate}
          onDayChange={(date) => setSelectedDate(date)}
          competitionId={TEST_COMPETITION_ID}
          tenantId={TEST_TENANT_ID}
        />
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="px-6">
        <DragDropProvider
          routines={allRoutinesData}
          selectedDate={selectedDate}
          competitionId={TEST_COMPETITION_ID}
          tenantId={TEST_TENANT_ID}
          onDropSuccess={handleDropSuccess}
          onDropError={handleDropError}
        >
          <div className="grid grid-cols-3 gap-2">
          {/* Left Panel - Unscheduled Routines (33%) - Sticky */}
          <div className="col-span-1 space-y-4 sticky top-4 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <RoutinePool
              routines={unscheduledRoutines as any}
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
              filteredRoutines={unscheduledRoutines.length}
            />

            {/* Schedule Block Templates */}
            <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span>📋</span>
                <span>Schedule Blocks</span>
              </h3>
              <div className="space-y-2">
                <DraggableBlockTemplate
                  type="award"
                  onClick={() => {
                    setBlockType('award');
                    setShowBlockModal(true);
                  }}
                />
                <DraggableBlockTemplate
                  type="break"
                  onClick={() => {
                    setBlockType('break');
                    setShowBlockModal(true);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Scheduled Routines (67%) */}
          <div className="col-span-2 space-y-4">
            {scheduledRoutines && scheduledRoutines.length > 0 ? (
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
              />
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center text-indigo-300">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="font-medium">No routines scheduled for this day</p>
                  <p className="text-sm mt-2">Drag routines from the left panel</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </DragDropProvider>
      </div>

      {/* Schedule Block Modal */}
      <ScheduleBlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onSave={(block) => {
          toast.success(`${block.type === 'award' ? '🏆' : '☕'} Block created: ${block.title}`);
          refetch();
        }}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        mode="create"
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
