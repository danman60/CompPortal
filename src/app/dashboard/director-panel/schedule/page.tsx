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

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { DragDropProvider } from '@/components/scheduling/DragDropProvider';
import { RoutineTable, RoutineTableRow } from '@/components/scheduling/RoutineTable';
import { ScheduleTable } from '@/components/scheduling/ScheduleTable';
import { DayTabs } from '@/components/scheduling/DayTabs';

// TEST tenant ID (will be replaced with real tenant context)
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

export default function SchedulePage() {
  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string>('2026-04-11');

  // Fetch all routines
  const { data: routines, isLoading, refetch } = trpc.scheduling.getRoutines.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // Filter routines into unscheduled and scheduled for the selected day
  const unscheduledRoutines: RoutineTableRow[] = (routines || [])
    .filter(r => !r.isScheduled)
    .map(r => ({
      id: r.id,
      title: r.title,
      studioCode: r.studioCode,
      classificationName: r.classificationName,
      entrySizeName: r.entrySizeName,
      routineAge: r.routineAge,
      ageGroupName: r.ageGroupName,
      categoryName: r.categoryName,
      duration: r.duration,
    }));

  // Filter scheduled routines for the selected day
  const scheduledRoutines = (routines || [])
    .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
    .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

  // Prepare routine data for DragDropProvider
  const allRoutinesData = (routines || []).map(r => ({
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
              onClick={() => toast('Export feature coming soon')}
            >
              📥 Export
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
      <DragDropProvider
        routines={allRoutinesData}
        selectedDate={selectedDate}
        competitionId={TEST_COMPETITION_ID}
        tenantId={TEST_TENANT_ID}
        onDropSuccess={handleDropSuccess}
        onDropError={handleDropError}
      >
        <div className="flex h-[calc(100vh-200px)]">
          {/* Left Panel - Unscheduled Routines */}
          <div className="w-1/2 border-r border-purple-500/20 flex flex-col">
            <div className="px-6 py-3 bg-purple-800/30 border-b border-purple-500/20">
              <h2 className="text-lg font-semibold text-white">
                Unscheduled Routines ({unscheduledRoutines.length})
              </h2>
              <p className="text-sm text-purple-200 mt-1">
                Drag routines to the schedule →
              </p>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white">Loading routines...</div>
                </div>
              ) : unscheduledRoutines.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-purple-300">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="font-medium">All routines scheduled!</p>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <RoutineTable routines={unscheduledRoutines} isLoading={isLoading} />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Scheduled Routines */}
          <div className="w-1/2 flex flex-col">
            <div className="px-6 py-3 bg-indigo-800/30 border-b border-indigo-500/20">
              <h2 className="text-lg font-semibold text-white">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <p className="text-sm text-indigo-200 mt-1">
                {scheduledRoutines?.length || 0} routines scheduled
              </p>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              {scheduledRoutines && scheduledRoutines.length > 0 ? (
                <div className="p-6">
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
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-indigo-300">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="font-medium">No routines scheduled for this day</p>
                    <p className="text-sm mt-2">Drag routines from the left panel</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DragDropProvider>

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
