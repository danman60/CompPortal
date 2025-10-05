'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';

export default function MusicTrackingDashboard() {
  const [selectedCompetition, setSelectedCompetition] = useState<string | undefined>(undefined);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [bulkSendResults, setBulkSendResults] = useState<{
    totalStudios: number;
    successCount: number;
    failureCount: number;
    results: Array<{
      studioId: string;
      studioName: string;
      success: boolean;
      error?: string;
    }>;
  } | null>(null);

  const { data: competitions } = trpc.competition.getAll.useQuery();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.music.getMusicStats.useQuery();
  const { data: missingMusic, isLoading: missingMusicLoading, refetch } =
    trpc.music.getMissingMusicByCompetition.useQuery({
      competitionId: selectedCompetition,
    });

  const sendReminderMutation = trpc.music.sendMissingMusicReminder.useMutation({
    onSuccess: () => {
      setSendingReminder(null);
      refetch();
    },
    onError: (error) => {
      alert(`Failed to send reminder: ${error.message}`);
      setSendingReminder(null);
    },
  });

  const bulkSendMutation = trpc.music.sendBulkMissingMusicReminders.useMutation({
    onSuccess: (data) => {
      setBulkSendResults(data);
      refetch();
    },
    onError: (error) => {
      alert(`Failed to send bulk reminders: ${error.message}`);
    },
  });

  const handleSendReminder = async (studioId: string, competitionId: string, studioName: string) => {
    if (!confirm(`Send missing music reminder to ${studioName}?`)) {
      return;
    }

    const key = `${studioId}-${competitionId}`;
    setSendingReminder(key);
    await sendReminderMutation.mutateAsync({ studioId, competitionId });
  };

  const handleBulkSend = async (competitionId: string, competitionName: string, studioCount: number) => {
    if (!confirm(`Send missing music reminders to all ${studioCount} studios for ${competitionName}?`)) {
      return;
    }

    await bulkSendMutation.mutateAsync({ competitionId });
  };

  const formatLastSent = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const sent = new Date(date);
    const diffMs = now.getTime() - sent.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return sent.toLocaleDateString();
  };

  const exportCSVMutation = trpc.music.exportMissingMusicCSV.useQuery(
    {
      competitionId: selectedCompetition,
    },
    {
      enabled: false, // Don't run automatically
    }
  );

  const handleExportCSV = async () => {
    try {
      const result = await exportCSVMutation.refetch();

      if (result.data?.csv) {
        const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const filename = selectedCompetition
          ? `missing-music-${selectedCompetition}-${Date.now()}.csv`
          : `missing-music-all-${Date.now()}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Failed to export CSV');
      console.error(error);
    }
  };

  const handleManualRefresh = async () => {
    await Promise.all([refetchStats(), refetch()]);
    setLastRefresh(new Date());
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      // Only refresh if page is visible
      if (!document.hidden) {
        await Promise.all([refetchStats(), refetch()]);
        setLastRefresh(new Date());
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refetchStats, refetch]);

  const formatLastRefresh = () => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);

    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return lastRefresh.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Auto-Refresh Controls */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-gray-900 text-purple-500 focus:ring-2 focus:ring-purple-500"
              />
              <div>
                <span className="text-white font-medium">Auto-Refresh</span>
                <span className="text-gray-400 text-sm ml-2">(every 30s)</span>
              </div>
            </label>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Last updated:</span>
              <span className="text-white font-medium">{formatLastRefresh()}</span>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* Competition Filter & Export */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label htmlFor="competition-filter" className="block text-sm font-medium text-gray-300 mb-2">
              Filter by Competition
            </label>
            <select
              id="competition-filter"
              value={selectedCompetition || ''}
              onChange={(e) => setSelectedCompetition(e.target.value || undefined)}
              className="w-full px-4 py-2 bg-gray-900 text-white border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="" className="bg-gray-900 text-white">All Competitions</option>
              {competitions?.competitions.map((comp) => (
                <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                  {comp.name} ({comp.year})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-gray-400 text-sm mb-1">Total Routines</div>
          <div className="text-3xl font-bold text-white">
            {statsLoading ? '...' : stats?.totalRoutines || 0}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-gray-400 text-sm mb-1">With Music</div>
          <div className="text-3xl font-bold text-green-400">
            {statsLoading ? '...' : stats?.routinesWithMusic || 0}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-gray-400 text-sm mb-1">Missing Music</div>
          <div className="text-3xl font-bold text-red-400">
            {statsLoading ? '...' : stats?.routinesWithoutMusic || 0}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="text-gray-400 text-sm mb-1">Upload Rate</div>
          <div className="text-3xl font-bold text-white">
            {statsLoading ? '...' : `${stats?.uploadRate.toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* Missing Music by Competition */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Routines Missing Music</h2>

        {missingMusicLoading ? (
          <div className="text-center py-12 text-gray-400">
            Loading...
          </div>
        ) : !missingMusic || Object.keys(missingMusic).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-xl font-semibold text-white mb-2">All Music Uploaded!</div>
            <div className="text-gray-400">
              Every routine has music uploaded. Great work!
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(missingMusic).map((compGroup) => {
              const comp = compGroup.competition;
              const studioCount = Object.keys(compGroup.studios).length;
              const routineCount = Object.values(compGroup.studios).reduce(
                (sum, studio) => sum + studio.routines.length,
                0
              );

              return (
                <div key={comp.id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                  {/* Competition Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {comp.name} ({comp.year})
                      </h3>
                      <div className="text-sm text-gray-400">
                        {routineCount} {routineCount === 1 ? 'routine' : 'routines'} missing music
                        across {studioCount} {studioCount === 1 ? 'studio' : 'studios'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {comp.daysUntil !== null && (
                        <div
                          className={`px-4 py-2 rounded-lg font-semibold ${
                            comp.daysUntil < 7
                              ? 'bg-red-500/20 text-red-400'
                              : comp.daysUntil < 14
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {comp.daysUntil} days until event
                        </div>
                      )}
                      <button
                        onClick={() => handleBulkSend(comp.id, `${comp.name} (${comp.year})`, studioCount)}
                        disabled={bulkSendMutation.isPending}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          bulkSendMutation.isPending
                            ? 'bg-purple-500/50 text-white cursor-wait'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                        }`}
                      >
                        {bulkSendMutation.isPending ? '📧 Sending...' : '📧 Send All Reminders'}
                      </button>
                    </div>
                  </div>

                  {/* Studios */}
                  <div className="space-y-4">
                    {Object.values(compGroup.studios).map((studioGroup) => {
                      const studio = studioGroup.studio;
                      const reminderKey = `${studio.id}-${comp.id}`;
                      const isSending = sendingReminder === reminderKey;

                      return (
                        <div
                          key={studio.id}
                          className="bg-black/30 rounded-lg p-4 border border-white/5"
                        >
                          {/* Studio Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-lg font-semibold text-white">
                                  {studio.name}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  {studio.code}
                                </span>
                              </div>
                              {studio.email && (
                                <div className="text-sm text-gray-400">{studio.email}</div>
                              )}
                              {studioGroup.lastReminderSent && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Last reminder: {formatLastSent(studioGroup.lastReminderSent)}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleSendReminder(studio.id, comp.id, studio.name)}
                              disabled={isSending || !studio.email}
                              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                !studio.email
                                  ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                  : isSending
                                  ? 'bg-purple-500/50 text-white cursor-wait'
                                  : 'bg-purple-500 hover:bg-purple-600 text-white'
                              }`}
                            >
                              {isSending ? '📧 Sending...' : '📧 Send Reminder'}
                            </button>
                          </div>

                          {/* Routines List */}
                          <div className="space-y-2">
                            {studioGroup.routines.map((routine) => (
                              <div
                                key={routine.id}
                                className="flex items-center gap-3 text-sm bg-white/5 rounded px-3 py-2"
                              >
                                <span className="text-gray-400 font-mono">
                                  #{routine.entryNumber || '---'}
                                </span>
                                <span className="text-white font-medium flex-1">
                                  {routine.title}
                                </span>
                                <span className="text-gray-500">{routine.category}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Send Results Modal */}
      {bulkSendResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                📧 Bulk Reminder Results
              </h3>
              <button
                onClick={() => setBulkSendResults(null)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-gray-400 text-sm mb-1">Total Studios</div>
                  <div className="text-2xl font-bold text-white">
                    {bulkSendResults.totalStudios}
                  </div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
                  <div className="text-green-400 text-sm mb-1">Sent Successfully</div>
                  <div className="text-2xl font-bold text-green-400">
                    {bulkSendResults.successCount}
                  </div>
                </div>
                <div className="bg-red-500/20 rounded-lg p-4 border border-red-400/30">
                  <div className="text-red-400 text-sm mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-400">
                    {bulkSendResults.failureCount}
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white mb-3">Detailed Results</h4>
                {bulkSendResults.results.map((result) => (
                  <div
                    key={result.studioId}
                    className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${result.success ? '✅' : '❌'}`}>
                        {result.success ? '✅' : '❌'}
                      </span>
                      <div>
                        <div className="text-white font-medium">{result.studioName}</div>
                        {result.error && (
                          <div className="text-xs text-red-400 mt-1">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-semibold ${
                      result.success
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {result.success ? 'Sent' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white/5 px-6 py-4 flex justify-end border-t border-white/10">
              <button
                onClick={() => setBulkSendResults(null)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
