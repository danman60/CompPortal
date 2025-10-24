'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScheduleRoutineCard } from '@/components/schedule/ScheduleRoutineCard';
import { ScheduleBreakCard } from '@/components/schedule/ScheduleBreakCard';
import { ScheduleDay } from '@/components/schedule/ScheduleDay';
import { ConflictPanel } from '@/components/schedule/ConflictPanel';
import { SuggestionsPanel } from '@/components/schedule/SuggestionsPanel';

/**
 * Advanced Schedule Builder (Competition Director)
 * Drag-drop interface for scheduling routines across days/sessions
 */
export default function ScheduleBuilderPage() {
  const searchParams = useSearchParams();
  const competitionId = searchParams.get('competitionId');

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedSession, setSelectedSession] = useState(1);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch schedule
  const { data: schedule, refetch } = trpc.scheduleBuilder.getByCompetition.useQuery(
    { competitionId: competitionId || '' },
    { enabled: !!competitionId }
  );

  // Mutations
  const autoGenerate = trpc.scheduleBuilder.autoGenerate.useMutation({
    onSuccess: () => {
      toast.success('Schedule auto-generated!');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const lockSchedule = trpc.scheduleBuilder.lock.useMutation({
    onSuccess: () => {
      toast.success('Schedule locked! Routine numbers are now permanent.');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const detectConflicts = trpc.scheduleBuilder.detectConflicts.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} conflicts detected`);
      setShowConflicts(true);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderItems = trpc.scheduleBuilder.reorderItems.useMutation({
    onSuccess: () => {
      toast.success('Schedule updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Handle reordering logic
    const items = schedule?.schedule_items || [];
    const activeItem = items.find((item: any) => item.id === active.id);
    const overItem = items.find((item: any) => item.id === over.id);

    if (!activeItem || !overItem) return;

    // Update running order
    const updatedItems = items.map((item: any, index: number) => ({
      id: item.id,
      runningOrder: index + 1,
      dayNumber: item.day_number,
      sessionNumber: item.session_number,
    }));

    reorderItems.mutate({
      scheduleId: schedule?.id || '',
      items: updatedItems,
    });
  };

  // Filter items by selected day/session
  const filteredItems = schedule?.schedule_items.filter(
    (item: any) => item.day_number === selectedDay && item.session_number === selectedSession
  );

  if (!competitionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">No Competition Selected</h2>
          <p className="text-white/70">Please select a competition to build a schedule.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">📅 Schedule Builder</h1>
            <p className="text-white/70">
              {schedule?.status === 'locked' ? (
                <span className="text-green-400">🔒 Schedule Locked</span>
              ) : (
                <span className="text-yellow-400">✏️ Draft Mode</span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            {!schedule && (
              <button
                onClick={() => autoGenerate.mutate({ competitionId })}
                disabled={autoGenerate.isPending}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
              >
                {autoGenerate.isPending ? 'Generating...' : '🤖 Auto-Generate'}
              </button>
            )}

            {schedule && schedule.status === 'draft' && (
              <>
                <button
                  onClick={() => detectConflicts.mutate({ scheduleId: schedule.id })}
                  disabled={detectConflicts.isPending}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-all disabled:opacity-50"
                >
                  {detectConflicts.isPending ? 'Checking...' : '⚠️ Detect Conflicts'}
                </button>

                <button
                  onClick={() => lockSchedule.mutate({ scheduleId: schedule.id })}
                  disabled={lockSchedule.isPending}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {lockSchedule.isPending ? 'Locking...' : '🔒 Lock Schedule'}
                </button>
              </>
            )}

            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              💬 Suggestions ({schedule?.schedule_suggestions?.length || 0})
            </button>
          </div>
        </div>

        {/* Day/Session Selector */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
          <div className="flex gap-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">Day</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      selectedDay === day
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">Session</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((session) => (
                  <button
                    key={session}
                    onClick={() => setSelectedSession(session)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      selectedSession === session
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Session {session}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Schedule Timeline */}
        <div className="col-span-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Day {selectedDay} - Session {selectedSession}
            </h2>

            {!schedule ? (
              <div className="text-center py-12">
                <p className="text-white/70 text-lg">No schedule created yet.</p>
                <p className="text-white/50 text-sm mt-2">
                  Click "Auto-Generate" to create a schedule from confirmed entries.
                </p>
              </div>
            ) : filteredItems && filteredItems.length > 0 ? (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredItems.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {filteredItems.map((item: any) => (
                      <div key={item.id}>
                        {item.item_type === 'routine' && item.competition_entries ? (
                          <ScheduleRoutineCard
                            item={item}
                            entry={item.competition_entries}
                            isLocked={schedule.status === 'locked'}
                          />
                        ) : item.item_type === 'break' ? (
                          <ScheduleBreakCard item={item} isLocked={schedule.status === 'locked'} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/70">No items scheduled for this day/session.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-4">
          {/* Stats */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <h3 className="text-lg font-bold text-white mb-3">📊 Statistics</h3>
            <div className="space-y-2 text-white/70">
              <div className="flex justify-between">
                <span>Total Routines:</span>
                <span className="font-bold text-white">
                  {schedule?.schedule_items.filter((i: any) => i.item_type === 'routine').length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Breaks:</span>
                <span className="font-bold text-white">
                  {schedule?.schedule_items.filter((i: any) => i.item_type === 'break').length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Conflicts:</span>
                <span className="font-bold text-red-400">{schedule?.schedule_conflicts?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Conflicts */}
          {showConflicts && schedule && (
            <ConflictPanel conflicts={schedule.schedule_conflicts || []} onClose={() => setShowConflicts(false)} />
          )}
        </div>
      </div>

      {/* Suggestions Panel */}
      {showSuggestions && schedule && (
        <SuggestionsPanel
          scheduleId={schedule.id}
          suggestions={schedule.schedule_suggestions || []}
          onClose={() => setShowSuggestions(false)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
