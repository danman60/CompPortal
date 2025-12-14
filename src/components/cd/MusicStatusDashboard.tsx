'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { Loader2, Music, AlertTriangle, CheckCircle2, Send, Download, Clock, ChevronDown, ChevronUp, Ban } from 'lucide-react';

interface StudioWithMissing {
  studioId: string;
  studioName: string;
  studioEmail: string | null;
  missingCount: number;
  entryNumbers: number[];
  entries: Array<{
    id: string;
    title: string;
    entryNumber: number | null;
    category: string;
  }>;
  lastReminderAt: Date | null;
}

export function MusicStatusDashboard() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [expandedStudio, setExpandedStudio] = useState<string | null>(null);
  const [exemptingEntry, setExemptingEntry] = useState<string | null>(null);

  // Fetch competitions
  const { data: competitionsData, isLoading: competitionsLoading } = trpc.competition.getAll.useQuery({});
  const competitions = competitionsData?.competitions || [];

  // Fetch music status when competition is selected
  const { data, isLoading, refetch } = trpc.musicNotification.getMusicStatusSummary.useQuery(
    { competitionId: selectedCompetitionId },
    { enabled: !!selectedCompetitionId }
  );

  const exemptMutation = trpc.musicNotification.markEntryExempt.useMutation({
    onSuccess: () => {
      toast.success('Entry marked as exempt');
      refetch();
      setExemptingEntry(null);
    },
    onError: (error) => {
      toast.error(`Failed to mark exempt: ${error.message}`);
      setExemptingEntry(null);
    },
  });

  const handleExemptEntry = async (entryId: string, exempt: boolean) => {
    setExemptingEntry(entryId);
    await exemptMutation.mutateAsync({ entryId, exempt, reason: 'Marked exempt by CD' });
  };

  // No competition selected
  if (!selectedCompetitionId) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Music Upload Status</h1>
          <p className="text-white/60 mt-1">
            Track music file uploads across all studios
          </p>
        </div>

        {/* Competition Selector */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
          <label className="block text-sm font-medium text-white/70 mb-2">
            Select Competition
          </label>
          <select
            value={selectedCompetitionId}
            onChange={(e) => setSelectedCompetitionId(e.target.value)}
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={competitionsLoading}
          >
            <option value="" className="bg-gray-900">Select a competition...</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id} className="bg-gray-900">
                {comp.name} ({comp.year})
              </option>
            ))}
          </select>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white/5 rounded-xl border border-white/10">
          <Music className="w-12 h-12 text-white/40 mb-4" />
          <h2 className="text-xl font-semibold text-white/70 mb-2">No Competition Selected</h2>
          <p className="text-white/50">Please select a competition to view music status.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white/5 rounded-xl border border-white/10">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold text-white/70 mb-2">Unable to Load Data</h2>
        <p className="text-white/50">Please try refreshing the page.</p>
      </div>
    );
  }

  const { stats, studiosWithMissing, competition } = data;
  const isDeadlinePassed = competition.daysUntilDeadline !== null && competition.daysUntilDeadline < 0;
  const isUrgent = competition.daysUntilDeadline !== null && competition.daysUntilDeadline <= 2 && competition.daysUntilDeadline >= 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Music Upload Status</h1>
        <p className="text-white/60 mt-1">
          {competition.name} ({competition.year})
        </p>
      </div>

      {/* Competition Selector */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-6">
        <label className="block text-sm font-medium text-white/70 mb-2">
          Competition
        </label>
        <select
          value={selectedCompetitionId}
          onChange={(e) => setSelectedCompetitionId(e.target.value)}
          className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="" className="bg-gray-900">Select a competition...</option>
          {competitions.map((comp) => (
            <option key={comp.id} value={comp.id} className="bg-gray-900">
              {comp.name} ({comp.year})
            </option>
          ))}
        </select>
      </div>

      {/* Deadline Warning */}
      {isUrgent && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <div>
            <p className="font-semibold text-yellow-400">
              {competition.daysUntilDeadline === 0
                ? 'Entry deadline is TODAY!'
                : `${competition.daysUntilDeadline} day${competition.daysUntilDeadline !== 1 ? 's' : ''} until entry deadline`}
            </p>
            <p className="text-sm text-yellow-400/80">
              {stats.missingMusic} entries are still missing music files.
            </p>
          </div>
        </div>
      )}

      {isDeadlinePassed && stats.missingMusic > 0 && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <p className="font-semibold text-red-400">Entry deadline has passed</p>
            <p className="text-sm text-red-400/80">
              {stats.missingMusic} entries are still without music files.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <div className="text-center">
            <p className="text-sm text-white/50 mb-1">Total Entries</p>
            <p className="text-4xl font-bold text-purple-400">{stats.totalEntries}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <div className="text-center">
            <p className="text-sm text-white/50 mb-1">With Music</p>
            <p className="text-4xl font-bold text-green-400">{stats.withMusic}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <div className="text-center">
            <p className="text-sm text-white/50 mb-1">Missing Music</p>
            <p className={`text-4xl font-bold ${stats.missingMusic > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.missingMusic}
            </p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <div className="text-center">
            <p className="text-sm text-white/50 mb-1">Complete</p>
            <p className={`text-4xl font-bold ${stats.percentComplete === 100 ? 'text-green-400' : 'text-purple-400'}`}>
              {stats.percentComplete}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/70">Upload Progress</span>
          <span className="text-sm text-white/50">{stats.withMusic} / {stats.totalEntries}</span>
        </div>
        <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${stats.percentComplete === 100 ? 'bg-green-500' : 'bg-purple-500'}`}
            style={{ width: `${stats.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Success Message */}
      {stats.missingMusic === 0 && (
        <div className="mb-8 p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <h3 className="text-xl font-semibold text-green-400">All Music Files Received!</h3>
              <p className="text-green-400/80">
                Congratulations! All {stats.totalEntries} entries have their music files uploaded.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Studios with Missing Music */}
      {stats.missingMusic > 0 && (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Studios with Missing Music ({studiosWithMissing.length})
            </h2>
            <p className="text-white/50 text-sm mt-1">
              Click on a studio to view and manage individual entries
            </p>
          </div>
          <div className="divide-y divide-white/10">
            {studiosWithMissing.map((studio: StudioWithMissing) => (
              <div key={studio.studioId}>
                {/* Studio Header */}
                <button
                  onClick={() => setExpandedStudio(expandedStudio === studio.studioId ? null : studio.studioId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <h4 className="font-semibold text-white">{studio.studioName}</h4>
                      {studio.studioEmail && (
                        <p className="text-sm text-white/50">{studio.studioEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      studio.missingCount > 3
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                        : 'bg-white/10 text-white/70 border border-white/20'
                    }`}>
                      {studio.missingCount} missing
                    </span>
                    {studio.lastReminderAt && (
                      <div className="flex items-center gap-1 text-sm text-white/50">
                        <Clock className="w-4 h-4" />
                        <span>Reminded {new Date(studio.lastReminderAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {expandedStudio === studio.studioId ? (
                      <ChevronUp className="w-5 h-5 text-white/40" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/40" />
                    )}
                  </div>
                </button>

                {/* Expanded Entry List */}
                {expandedStudio === studio.studioId && (
                  <div className="bg-black/20 p-4 space-y-2">
                    {studio.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {entry.entryNumber ? `#${entry.entryNumber} - ` : ''}{entry.title}
                          </p>
                          <p className="text-sm text-white/50">{entry.category}</p>
                        </div>
                        <button
                          onClick={() => handleExemptEntry(entry.id, true)}
                          disabled={exemptingEntry === entry.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-white/20 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white/70"
                        >
                          {exemptingEntry === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Ban className="w-4 h-4" />
                              Mark Exempt
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t border-white/10 flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors text-white/70">
              <Download className="w-4 h-4" />
              Export Missing Music List
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white">
              <Send className="w-4 h-4" />
              Send Reminders to All Studios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
