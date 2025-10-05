'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export default function MusicTrackingDashboard() {
  const [selectedCompetition, setSelectedCompetition] = useState<string | undefined>(undefined);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = trpc.music.getMusicStats.useQuery();
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

  const handleSendReminder = async (studioId: string, competitionId: string, studioName: string) => {
    if (!confirm(`Send missing music reminder to ${studioName}?`)) {
      return;
    }

    const key = `${studioId}-${competitionId}`;
    setSendingReminder(key);
    await sendReminderMutation.mutateAsync({ studioId, competitionId });
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

  return (
    <div className="space-y-6">
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
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {comp.name} ({comp.year})
                      </h3>
                      <div className="text-sm text-gray-400">
                        {routineCount} {routineCount === 1 ? 'routine' : 'routines'} missing music
                        across {studioCount} {studioCount === 1 ? 'studio' : 'studios'}
                      </div>
                    </div>
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
    </div>
  );
}
