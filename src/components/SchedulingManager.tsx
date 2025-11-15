'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect, useMemo } from 'react';
import SessionCard from './SessionCard';
import UnscheduledEntries from './UnscheduledEntries';
import ConflictPanel from './ConflictPanel';

export default function SchedulingManager() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [showConflicts, setShowConflicts] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0); // 0-indexed day selector
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [centerMaximized, setCenterMaximized] = useState(false);

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

  // Fetch trophy helper
  const { data: trophyHelperData } = trpc.scheduling.getTrophyHelper.useQuery(
    { competitionId: selectedCompetition },
    { enabled: !!selectedCompetition }
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

  // Get selected competition details
  const selectedCompetitionData = competitions.find(c => c.id === selectedCompetition);

  // Generate competition days array using useMemo to avoid hydration issues
  // MUST be before early returns to comply with Rules of Hooks
  const competitionDays = useMemo(() => {
    const days: Date[] = [];
    if (selectedCompetitionData?.competition_start_date && selectedCompetitionData?.competition_end_date) {
      const startDate = new Date(selectedCompetitionData.competition_start_date);
      const endDate = new Date(selectedCompetitionData.competition_end_date);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return days;
  }, [selectedCompetitionData?.competition_start_date, selectedCompetitionData?.competition_end_date]);

  // Reset selected day when competition changes
  // MUST be before early returns to comply with Rules of Hooks
  useEffect(() => {
    setSelectedDay(0);
  }, [selectedCompetition]);

  // Early returns AFTER all hooks
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
      {/* Top Toolbar */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <div className="flex gap-4 items-center flex-wrap justify-between">
          {/* Event Selector */}
          <div className="flex-1 min-w-[300px]">
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="" className="bg-gray-900 text-white">-- Select an event --</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                  {comp.name} ({comp.year})
                </option>
              ))}
            </select>
          </div>

          {/* Control Buttons */}
          {selectedCompetition && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowConflicts(!showConflicts)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  showConflicts
                    ? 'bg-red-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {showConflicts ? '⚠️ Hide Conflicts' : '🔍 Show Conflicts'}
              </button>

              <button
                onClick={handlePublishSchedule}
                disabled={publishMutation.isPending}
                className="px-4 py-2 rounded-lg font-semibold transition-all text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
              >
                {publishMutation.isPending ? '⚙️ Publishing...' : '📋 Publish Schedule'}
              </button>

              <button
                onClick={handleRefresh}
                disabled={sessionsLoading || entriesLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all text-sm disabled:opacity-50"
              >
                🔄 Refresh
              </button>

              <button
                onClick={handleAssignNumbers}
                disabled={assignNumbersMutation.isPending}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all text-sm disabled:opacity-50"
              >
                {assignNumbersMutation.isPending ? '⚙️ Assigning...' : '🔢 Assign Routine Numbers (100+)'}
              </button>

              <button
                onClick={handleExportPDF}
                disabled={exportPDFMutation.isPending}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold transition-all text-sm disabled:opacity-50"
              >
                {exportPDFMutation.isPending ? '⚙️ Exporting...' : '📄 Export PDF'}
              </button>

              <button
                onClick={handleExportCSV}
                disabled={exportCSVMutation.isPending}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold transition-all text-sm disabled:opacity-50"
              >
                {exportCSVMutation.isPending ? '⚙️ Exporting...' : '📊 Export CSV'}
              </button>

              <button
                onClick={handleExportICal}
                disabled={exportICalMutation.isPending}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold transition-all text-sm disabled:opacity-50"
              >
                {exportICalMutation.isPending ? '⚙️ Exporting...' : '📆 Export iCal'}
              </button>
            </div>
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

          {/* 3-PANEL HORIZONTAL LAYOUT: LEFT 25% + CENTER 50% + RIGHT 25% */}
          <div className="flex gap-4 h-[calc(100vh-500px)] min-h-[600px]">
            {/* LEFT PANEL: Unscheduled Routines (25%) */}
            <div
              className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex flex-col overflow-hidden transition-all ${
                centerMaximized
                  ? 'w-0 opacity-0'
                  : leftPanelCollapsed
                  ? 'w-16'
                  : 'w-1/4'
              }`}
            >
              {leftPanelCollapsed ? (
                /* Collapsed state: vertical bar */
                <div className="h-full flex items-center justify-center">
                  <button
                    onClick={() => setLeftPanelCollapsed(false)}
                    className="writing-mode-vertical transform rotate-180 text-white font-semibold text-sm hover:text-purple-300 transition-colors p-2"
                  >
                    ▶ Unscheduled Routines
                  </button>
                </div>
              ) : (
                /* Expanded state */
                <>
                  {/* Competition Header */}
                  {selectedCompetitionData && (
                    <div className="p-4 border-b border-white/20 relative">
                      <button
                        onClick={() => setLeftPanelCollapsed(true)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-lg"
                        title="Collapse panel"
                      >
                        ◀
                      </button>
                      <h2 className="text-xl font-bold text-white pr-8">
                        {selectedCompetitionData.name}
                      </h2>
                      {selectedCompetitionData.competition_start_date && selectedCompetitionData.competition_end_date && (
                        <p className="text-sm text-gray-300">
                          ({new Date(selectedCompetitionData.competition_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedCompetitionData.competition_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto">
                    <UnscheduledEntries
                      entries={unscheduledEntries}
                      sessions={sessions || []}
                      onAssignEntry={handleAssignEntry}
                      onRefresh={handleRefresh}
                      competitionId={selectedCompetition}
                      isLoading={entriesLoading}
                    />
                  </div>
                </>
              )}
            </div>

            {/* CENTER PANEL: Schedule Grid (50%) */}
            <div
              className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex flex-col overflow-hidden transition-all ${
                centerMaximized ? 'flex-1' : 'w-1/2'
              }`}
            >
              <div className="p-4 border-b border-white/20 relative">
                <div className="flex items-center justify-between pr-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span>📅</span>
                    Schedule Grid
                  </h2>
                  <button
                    onClick={() => {
                      setCenterMaximized(!centerMaximized);
                      if (!centerMaximized) {
                        setLeftPanelCollapsed(true);
                        setRightPanelCollapsed(true);
                      } else {
                        setLeftPanelCollapsed(false);
                        setRightPanelCollapsed(false);
                      }
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-lg"
                    title={centerMaximized ? 'Restore layout' : 'Maximize'}
                  >
                    {centerMaximized ? '⊟' : '⛶'}
                  </button>
                </div>

                {/* Day Selector Tabs */}
                {competitionDays.length > 0 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto">
                    {competitionDays.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDay(index)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                          selectedDay === index
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {day.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {sessionsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin text-4xl mb-2">⚙️</div>
                      <p className="text-white">Loading sessions...</p>
                    </div>
                  </div>
                ) : sessions && sessions.length > 0 ? (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <SessionCard
                        key={session.sessionId}
                        session={session}
                        entries={entries?.filter(e => e.sessionId === session.sessionId) || []}
                        onAssignEntry={handleAssignEntry}
                        onClearEntries={handleClearEntries}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📅</div>
                      <p className="text-white">No sessions found for this event</p>
                      <p className="text-sm text-gray-400 mt-2">Create sessions to start scheduling routines</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: Trophy Helper (25%) */}
            <div
              className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex flex-col overflow-hidden transition-all ${
                centerMaximized
                  ? 'w-0 opacity-0'
                  : rightPanelCollapsed
                  ? 'w-16'
                  : 'w-1/4'
              }`}
            >
              {rightPanelCollapsed ? (
                /* Collapsed state: vertical bar */
                <div className="h-full flex items-center justify-center">
                  <button
                    onClick={() => setRightPanelCollapsed(false)}
                    className="writing-mode-vertical transform rotate-180 text-white font-semibold text-sm hover:text-purple-300 transition-colors p-2"
                  >
                    ◀ Trophy Helper
                  </button>
                </div>
              ) : (
                /* Expanded state */
                <>
                  <div className="p-4 border-b border-white/20 relative">
                    <button
                      onClick={() => setRightPanelCollapsed(true)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-lg"
                      title="Collapse panel"
                    >
                      ▶
                    </button>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 pr-8">
                      <span>🏆</span>
                      Trophy Helper
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Last routine per category</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {trophyHelperData && trophyHelperData.trophyHelper.length > 0 ? (
                      <div className="space-y-3">
                        {trophyHelperData.trophyHelper.map((category, index) => (
                          <div
                            key={index}
                            className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3"
                          >
                            {/* Category Name */}
                            <div className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                              <span>🏆</span>
                              <span className="truncate" title={category.categoryName}>
                                {category.categoryName}
                              </span>
                            </div>

                            {/* Last Routine Info */}
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-gray-300">
                                <span>Last Routine:</span>
                                <span className="text-white font-semibold">
                                  #{category.lastRoutineNumber || 'TBD'}
                                </span>
                              </div>

                              <div className="flex justify-between text-gray-300">
                                <span>Time:</span>
                                <span className="text-white">
                                  {new Date(category.lastRoutineTime).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div className="flex justify-between text-gray-300">
                                <span>Total Routines:</span>
                                <span className="text-white">{category.totalCount}</span>
                              </div>

                              <div className="flex justify-between text-yellow-300 mt-2 pt-2 border-t border-yellow-500/30">
                                <span className="font-semibold">Suggested Award:</span>
                                <span className="font-semibold">
                                  {new Date(category.suggestedAwardTime).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-sm">
                        <div className="text-4xl mb-2">🏆</div>
                        <p>Trophy Helper shows the last routine per overall category</p>
                        <p className="mt-2 text-xs">Schedule routines to see trophy recommendations</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
