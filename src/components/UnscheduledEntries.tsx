'use client';

import { useState } from 'react';
import { SchedulingEntry } from '@/lib/scheduling';

interface UnscheduledEntriesProps {
  entries: SchedulingEntry[];
  sessions: Array<{
    sessionId: string;
    sessionName: string;
    sessionDate: Date;
    startTime: Date;
    currentEntryCount: number;
    maxEntries: number | null;
  }>;
  onAssignEntry: (entryId: string, sessionId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  competitionId: string;
  isLoading: boolean;
}

export default function UnscheduledEntries({
  entries,
  sessions,
  onAssignEntry,
  onRefresh,
  competitionId,
  isLoading,
}: UnscheduledEntriesProps) {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [filterStudio, setFilterStudio] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Get unique studios and categories
  const studios = Array.from(new Set(entries.map(e => e.studioName))).sort();
  const categories = Array.from(new Set(entries.map(e => e.categoryName))).sort();

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    if (filterStudio !== 'all' && entry.studioName !== filterStudio) return false;
    if (filterCategory !== 'all' && entry.categoryName !== filterCategory) return false;
    return true;
  });

  const handleAssign = async (entryId: string, sessionId: string) => {
    setAssigningTo(sessionId);
    try {
      await onAssignEntry(entryId, sessionId);
      setSelectedEntry(null);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAssigningTo(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden sticky top-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-white/20 p-6">
        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <span>📋</span>
          Unscheduled Entries
        </h3>
        <div className="text-3xl font-bold text-yellow-400">
          {filteredEntries.length}
        </div>
        <div className="text-xs text-gray-400">
          {filteredEntries.length === entries.length
            ? 'Total unscheduled'
            : `of ${entries.length} total`}
        </div>
      </div>

      {/* Filters */}
      {entries.length > 0 && (
        <div className="p-4 border-b border-white/20 space-y-3">
          <div>
            <label className="block text-white text-sm font-semibold mb-1">Studio</label>
            <select
              value={filterStudio}
              onChange={(e) => setFilterStudio(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Studios ({entries.length})</option>
              {studios.map(studio => (
                <option key={studio} value={studio}>
                  {studio} ({entries.filter(e => e.studioName === studio).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories ({entries.length})</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category} ({entries.filter(e => e.categoryName === category).length})
                </option>
              ))}
            </select>
          </div>

          {(filterStudio !== 'all' || filterCategory !== 'all') && (
            <button
              onClick={() => {
                setFilterStudio('all');
                setFilterCategory('all');
              }}
              className="w-full px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 rounded-lg text-sm font-semibold transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Entries List */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-2">⚙️</div>
            <p className="text-white">Loading...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            <p>
              {entries.length === 0
                ? 'All entries are scheduled!'
                : 'No entries match filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="space-y-2">
                <div
                  className={`bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-all cursor-pointer ${
                    selectedEntry === entry.id ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  onClick={() => setSelectedEntry(selectedEntry === entry.id ? null : entry.id)}
                >
                  <h4 className="text-white font-semibold mb-2 text-sm">{entry.title}</h4>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>🏢 {entry.studioName}</div>
                    <div>🎭 {entry.categoryName}</div>
                    <div>📅 {entry.ageGroupName}</div>
                    <div>👥 {entry.participants.length} dancer(s)</div>
                    <div>⏱️ {entry.duration} min</div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntry(selectedEntry === entry.id ? null : entry.id);
                    }}
                    className="w-full mt-3 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-semibold transition-all"
                  >
                    {selectedEntry === entry.id ? 'Cancel' : 'Assign to Session'}
                  </button>
                </div>

                {/* Session Assignment */}
                {selectedEntry === entry.id && (
                  <div className="ml-4 space-y-1">
                    {sessions.length === 0 ? (
                      <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 text-center">
                        <p className="text-red-300 text-xs">No sessions available</p>
                      </div>
                    ) : (
                      sessions.map((session) => {
                        const isFull = session.maxEntries && session.currentEntryCount >= session.maxEntries;
                        return (
                          <button
                            key={session.sessionId}
                            onClick={() => handleAssign(entry.id, session.sessionId)}
                            disabled={isFull || assigningTo === session.sessionId}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                              isFull
                                ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                : assigningTo === session.sessionId
                                ? 'bg-green-500/50 text-white'
                                : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                            }`}
                          >
                            <div className="font-semibold mb-1">{session.sessionName}</div>
                            <div className="text-gray-400">
                              {formatDate(session.sessionDate)} @ {formatTime(session.startTime)}
                            </div>
                            <div className="text-gray-400">
                              {session.currentEntryCount} / {session.maxEntries || '∞'} entries
                            </div>
                            {isFull && <div className="text-red-400 mt-1">⚠️ Full</div>}
                            {assigningTo === session.sessionId && <div>⚙️ Assigning...</div>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
