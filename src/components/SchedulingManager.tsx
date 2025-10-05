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
  const assignNumbersMutation = trpc.scheduling.assignEntryNumbers.useMutation();
  const publishMutation = trpc.scheduling.publishSchedule.useMutation({
    onSuccess: () => {
      alert('Schedule published and locked! Entry numbers are now final.');
      refetchEntries();
      refetchSessions();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Export mutations
  const exportPDFMutation = trpc.scheduling.exportSchedulePDF.useMutation();
  const exportCSVMutation = trpc.scheduling.exportScheduleCSV.useMutation();
  const exportICalMutation = trpc.scheduling.exportScheduleICal.useMutation();

  // Download helper function
  const downloadFile = (base64Data: string, filename: string, mimeType: string) => {
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export handlers
  const handleExportPDF = async () => {
    if (!selectedCompetition) return;
    try {
      const result = await exportPDFMutation.mutateAsync({ competitionId: selectedCompetition });
      const competition = competitions.find(c => c.id === selectedCompetition);
      const filename = `schedule_${competition?.name || 'competition'}_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadFile(result.data, filename, 'application/pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportCSV = async () => {
    if (!selectedCompetition) return;
    try {
      const result = await exportCSVMutation.mutateAsync({ competitionId: selectedCompetition });
      const competition = competitions.find(c => c.id === selectedCompetition);
      const filename = `schedule_${competition?.name || 'competition'}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(result.data, filename, 'text/csv');
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleExportICal = async () => {
    if (!selectedCompetition) return;
    try {
      const result = await exportICalMutation.mutateAsync({ competitionId: selectedCompetition });
      const competition = competitions.find(c => c.id === selectedCompetition);
      const filename = `schedule_${competition?.name || 'competition'}_${new Date().toISOString().split('T')[0]}.ics`;
      downloadFile(result.data, filename, 'text/calendar');
    } catch (error) {
      console.error('iCal export failed:', error);
      alert('Failed to export iCal. Please try again.');
    }
  };

  // Assign routine numbers handler
  const handleAssignNumbers = async () => {
    if (!selectedCompetition) return;
    if (!confirm('Assign routine numbers to all routines without numbers? This will start numbering at 100.')) return;

    try {
      const result = await assignNumbersMutation.mutateAsync({ competitionId: selectedCompetition });
      if (result.assignedCount === 0) {
        alert('All routines already have numbers assigned.');
      } else {
        const range = result.startNumber && result.endNumber
          ? ` (${result.startNumber}-${result.endNumber})`
          : '';
        alert(`Success! Assigned routine numbers${range} to ${result.assignedCount} routines.`);
      }
      refetchEntries();
    } catch (error) {
      console.error('Routine number assignment failed:', error);
      alert('Failed to assign routine numbers. Please try again.');
    }
  };

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

  const handlePublishSchedule = () => {
    if (!selectedCompetition) return;
    if (confirm('Publish schedule? This will lock all entry numbers and prevent changes.')) {
      publishMutation.mutate({ competitionId: selectedCompetition });
    }
  };

  if (competitionsLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="animate-spin text-6xl mb-4">⚙️</div>
        <p className="text-white">Loading events...</p>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Events Found</h3>
        <p className="text-gray-400">Create an event first to manage scheduling.</p>
      </div>
    );
  }

  const unscheduledEntries = entries?.filter(e => !e.sessionId) || [];
  const scheduledEntries = entries?.filter(e => e.sessionId) || [];

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <label className="block text-white font-semibold mb-3">
          Select Event
        </label>
        <div className="flex gap-4 items-center flex-wrap">
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="flex-1 min-w-[300px] px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="" className="text-gray-900">-- Select an event --</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id} className="text-gray-900">
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
              onClick={handlePublishSchedule}
              disabled={publishMutation.isPending}
              className="px-4 py-2 rounded-lg font-semibold transition-all bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
            >
              {publishMutation.isPending ? '⚙️ Publishing...' : '📋 Publish Schedule'}
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

        {/* Routine Numbering */}
        {selectedCompetition && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <label className="block text-white font-semibold mb-3 text-sm">
              Routine Numbering
            </label>
            <button
              onClick={handleAssignNumbers}
              disabled={assignNumbersMutation.isPending}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {assignNumbersMutation.isPending ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Assigning Numbers...
                </>
              ) : (
                <>
                  🔢 Assign Routine Numbers (100+)
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Assigns sequential numbers starting at 100 to all scheduled routines without numbers
            </p>
          </div>
        )}

        {/* Export Buttons */}
        {selectedCompetition && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <label className="block text-white font-semibold mb-3 text-sm">
              Export Schedule
            </label>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleExportPDF}
                disabled={exportPDFMutation.isPending}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exportPDFMutation.isPending ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    Exporting...
                  </>
                ) : (
                  <>
                    📄 Export PDF
                  </>
                )}
              </button>

              <button
                onClick={handleExportCSV}
                disabled={exportCSVMutation.isPending}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exportCSVMutation.isPending ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    Exporting...
                  </>
                ) : (
                  <>
                    📊 Export CSV
                  </>
                )}
              </button>

              <button
                onClick={handleExportICal}
                disabled={exportICalMutation.isPending}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exportICalMutation.isPending ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    Exporting...
                  </>
                ) : (
                  <>
                    📆 Export iCal
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
              <div className="text-gray-300 text-sm">Total Routines</div>
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
                  <p className="text-white">No sessions found for this event</p>
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
