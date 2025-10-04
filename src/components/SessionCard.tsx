'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { SchedulingEntry } from '@/lib/scheduling';

interface SessionCardProps {
  session: {
    sessionId: string;
    sessionName: string;
    sessionDate: Date;
    startTime: Date;
    endTime?: Date | null;
    maxEntries: number | null;
    currentEntryCount: number;
    availableMinutes: number;
  };
  entries: SchedulingEntry[];
  onAssignEntry: (entryId: string, sessionId: string | null) => Promise<void>;
  onClearEntries: (entryIds: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function SessionCard({
  session,
  entries,
  onAssignEntry,
  onClearEntries,
  onRefresh,
}: SessionCardProps) {
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  // Fetch session stats
  const { data: stats } = trpc.scheduling.getSessionStats.useQuery({
    sessionId: session.sessionId,
  });

  // Auto-schedule mutation
  const autoScheduleMutation = trpc.scheduling.autoScheduleSession.useMutation();

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRemoveEntry = async (entryId: string) => {
    await onAssignEntry(entryId, null);
  };

  const handleClearAll = async () => {
    if (confirm(`Clear all ${entries.length} routines from this session?`)) {
      await onClearEntries(entries.map(e => e.id));
    }
  };

  const handleAutoSchedule = async () => {
    if (selectedEntries.length === 0) {
      alert('No routines selected for auto-scheduling');
      return;
    }

    try {
      await autoScheduleMutation.mutateAsync({
        sessionId: session.sessionId,
        entryIds: selectedEntries,
      });
      await onRefresh();
      setSelectedEntries([]);
      setShowAutoSchedule(false);
      alert('Auto-scheduling completed!');
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const utilizationPercent = stats?.utilizationPercent || 0;
  const utilizationColor = utilizationPercent > 90
    ? 'text-red-400'
    : utilizationPercent > 75
    ? 'text-yellow-400'
    : 'text-green-400';

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      {/* Session Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-white/20 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {session.sessionName}
            </h3>
            <div className="flex gap-4 text-sm text-gray-300">
              <span>📅 {formatDate(session.sessionDate)}</span>
              <span>🕐 {formatTime(session.startTime)}</span>
              {session.endTime && <span>→ {formatTime(session.endTime)}</span>}
            </div>
          </div>

          <div className="text-right">
            <div className={`text-3xl font-bold ${utilizationColor}`}>
              {utilizationPercent}%
            </div>
            <div className="text-xs text-gray-400">Capacity</div>
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{entries.length}</div>
            <div className="text-xs text-gray-400">Routines</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{stats?.totalDuration || 0}</div>
            <div className="text-xs text-gray-400">Minutes Used</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{stats?.remainingMinutes || 0}</div>
            <div className="text-xs text-gray-400">Minutes Left</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{session.maxEntries || '∞'}</div>
            <div className="text-xs text-gray-400">Max Routines</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleClearAll}
            disabled={entries.length === 0}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-semibold transition-all disabled:opacity-30"
          >
            🗑️ Clear All
          </button>
          <button
            onClick={() => setShowAutoSchedule(!showAutoSchedule)}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm font-semibold transition-all"
          >
            ✨ Auto-Schedule
          </button>
        </div>
      </div>

      {/* Auto-Schedule Panel */}
      {showAutoSchedule && (
        <div className="bg-yellow-500/10 border-b border-yellow-400/30 p-4">
          <h4 className="text-white font-semibold mb-2">🤖 Auto-Schedule Routines</h4>
          <p className="text-gray-300 text-sm mb-3">
            Select routines to automatically schedule them in this session with optimal timing.
          </p>
          {selectedEntries.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleAutoSchedule}
                disabled={autoScheduleMutation.isPending}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              >
                Schedule {selectedEntries.length} {selectedEntries.length === 1 ? 'Routine' : 'Routines'}
              </button>
              <button
                onClick={() => setSelectedEntries([])}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Routines List */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No routines scheduled yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries
              .sort((a, b) => (a.runningOrder || 0) - (b.runningOrder || 0))
              .map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all ${
                    showAutoSchedule && selectedEntries.includes(entry.id)
                      ? 'ring-2 ring-green-400'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {entry.runningOrder && (
                          <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-bold">
                            #{entry.runningOrder}
                          </span>
                        )}
                        <h4 className="text-white font-semibold">{entry.title}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                        <span>🏢 {entry.studioName}</span>
                        <span>🎭 {entry.categoryName}</span>
                        <span>📅 {entry.ageGroupName}</span>
                        <span>👥 {entry.participants.length} dancer(s)</span>
                        <span>⏱️ {entry.duration} min</span>
                        {entry.performanceTime && (
                          <span>🕐 {formatTime(entry.performanceTime)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {showAutoSchedule && (
                        <button
                          onClick={() => {
                            if (selectedEntries.includes(entry.id)) {
                              setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                            } else {
                              setSelectedEntries([...selectedEntries, entry.id]);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                            selectedEntries.includes(entry.id)
                              ? 'bg-green-500 text-white'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          {selectedEntries.includes(entry.id) ? '✓' : '+'}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-semibold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
