'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import SessionCard from './SessionCard';
import UnscheduledEntries from './UnscheduledEntries';
import ConflictPanel from './ConflictPanel';

export default function SchedulingManager() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [showConflicts, setShowConflicts] = useState(false);

  // Fetch competitions
  const { data: competitionsData, isLoading: competitionsLoading } = trpc.competition.getAll.useQuery();
  const competitions = competitionsData?.competitions || [];

  // Fetch sessions for selected competition
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = trpc.scheduling.getSessions.useQuery(
    { competitionId: selectedCompetition },
    { enabled: !!selectedCompetition }
  );

  // Fetch entries for selected competition
  const { data: entries, isLoading: entriesLoading, refetch: refetchEntries } = trpc.scheduling.getEntries.useQuery(
    { competitionId: selectedCompetition, includeScheduled: true },
    { enabled: !!selectedCompetition }
  );

  // Fetch conflicts
  const { data: conflictsData, refetch: refetchConflicts } = trpc.scheduling.getConflicts.useQuery(
    { competitionId: selectedCompetition },
    { enabled: !!selectedCompetition && showConflicts }
  );

  // Mutations
  const assignMutation = trpc.scheduling.assignEntryToSession.useMutation();
  const clearMutation = trpc.scheduling.clearSchedule.useMutation();

  const handleRefresh = async () => {
    await Promise.all([
      refetchSessions(),
      refetchEntries(),
      showConflicts ? refetchConflicts() : Promise.resolve(),
    ]);
  };

  const handleAssignEntry = async (entryId: string, sessionId: string | null) => {
    await assignMutation.mutateAsync({ entryId, sessionId });
    await handleRefresh();
  };

  const handleClearEntries = async (entryIds: string[]) => {
    await clearMutation.mutateAsync({ entryIds });
    await handleRefresh();
  };

  if (competitionsLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="animate-spin text-6xl mb-4">⚙️</div>
        <p className="text-white">Loading competitions...</p>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Competitions Found</h3>
        <p className="text-gray-400">Create a competition first to manage scheduling.</p>
      </div>
    );
  }

  const unscheduledEntries = entries?.filter(e => !e.sessionId) || [];
  const scheduledEntries = entries?.filter(e => e.sessionId) || [];

  return (
    <div className="space-y-6">
      {/* Competition Selector */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <label className="block text-white font-semibold mb-3">
          Select Competition
        </label>
        <div className="flex gap-4 items-center">
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">-- Select a competition --</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.year})
              </option>
            ))}
          </select>

          {selectedCompetition && (
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                showConflicts
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {showConflicts ? '⚠️ Hide Conflicts' : '🔍 Show Conflicts'}
            </button>
          )}

          {selectedCompetition && (
            <button
              onClick={handleRefresh}
              disabled={sessionsLoading || entriesLoading}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      {selectedCompetition && (
        <>
          {/* Conflict Panel */}
          {showConflicts && (
            <ConflictPanel
              conflicts={conflictsData?.conflicts || []}
              onRefresh={refetchConflicts}
            />
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-6">
              <div className="text-3xl font-bold text-white mb-1">
                {entries?.length || 0}
              </div>
              <div className="text-gray-300 text-sm">Total Entries</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
              <div className="text-3xl font-bold text-white mb-1">
                {scheduledEntries.length}
              </div>
              <div className="text-gray-300 text-sm">Scheduled</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6">
              <div className="text-3xl font-bold text-white mb-1">
                {unscheduledEntries.length}
              </div>
              <div className="text-gray-300 text-sm">Unscheduled</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 p-6">
              <div className="text-3xl font-bold text-white mb-1">
                {sessions?.length || 0}
              </div>
              <div className="text-gray-300 text-sm">Sessions</div>
            </div>
          </div>

          {/* Main Content: Sessions and Unscheduled Entries */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🎭</span>
                Sessions
              </h2>

              {sessionsLoading ? (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
                  <div className="animate-spin text-4xl mb-2">⚙️</div>
                  <p className="text-white">Loading sessions...</p>
                </div>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session) => (
                  <SessionCard
                    key={session.sessionId}
                    session={session}
                    entries={entries?.filter(e => e.sessionId === session.sessionId) || []}
                    onAssignEntry={handleAssignEntry}
                    onClearEntries={handleClearEntries}
                    onRefresh={handleRefresh}
                  />
                ))
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-white">No sessions found for this competition</p>
                </div>
              )}
            </div>

            {/* Unscheduled Entries (1/3 width) */}
            <div className="space-y-6">
              <UnscheduledEntries
                entries={unscheduledEntries}
                sessions={sessions || []}
                onAssignEntry={handleAssignEntry}
                onRefresh={handleRefresh}
                competitionId={selectedCompetition}
                isLoading={entriesLoading}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
