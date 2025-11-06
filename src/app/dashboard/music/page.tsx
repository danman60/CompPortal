'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import Link from 'next/link';

export default function MusicTrackingPage() {
  const { data: entries, isLoading } = trpc.entry.getAll.useQuery();
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-white/20 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allEntries = entries?.entries || [];

  // Get unique competitions
  const competitions = Array.from(
    new Set(allEntries.map((e) => (e as any).competitions?.name).filter(Boolean))
  ).map((name) => ({
    name: name as string,
    id: allEntries.find((e) => (e as any).competitions?.name === name)?.competition_id || '',
  }));

  // Filter entries by competition
  const filteredEntries =
    selectedCompetition === 'all'
      ? allEntries
      : allEntries.filter((e: any) => e.competition_id === selectedCompetition);

  // Calculate stats
  const totalEntries = filteredEntries.length;
  const withMusic = filteredEntries.filter((e) => e.music_file_url).length;
  const withoutMusic = totalEntries - withMusic;
  const percentComplete = totalEntries > 0 ? (withMusic / totalEntries) * 100 : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎵 Music Tracking</h1>
            <p className="text-gray-400">Monitor which routines need music files</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-sm text-gray-400 mb-1">Total Routines</div>
            <div className="text-3xl font-bold text-white">{totalEntries}</div>
          </div>
          <div className="bg-green-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-4">
            <div className="text-sm text-green-400 mb-1">Music Uploaded</div>
            <div className="text-3xl font-bold text-green-400">{withMusic}</div>
          </div>
          <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-400/30 p-4">
            <div className="text-sm text-red-400 mb-1">Missing Music</div>
            <div className="text-3xl font-bold text-red-400">{withoutMusic}</div>
          </div>
          <div className="bg-blue-500/10 backdrop-blur-md rounded-xl border border-blue-400/30 p-4">
            <div className="text-sm text-blue-400 mb-1">Completion Rate</div>
            <div className="text-3xl font-bold text-blue-400">{percentComplete.toFixed(0)}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Overall Progress</span>
            <span className="text-sm text-white font-semibold">{withMusic} / {totalEntries}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentComplete >= 90
                  ? 'bg-green-500'
                  : percentComplete >= 70
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setSelectedCompetition('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedCompetition === 'all'
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All Competitions ({allEntries.length})
          </button>
          {competitions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => setSelectedCompetition(comp.id)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedCompetition === comp.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {comp.name} ({allEntries.filter((e) => e.competition_id === comp.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-semibold text-white mb-2">No routines found</h3>
          <p className="text-gray-400 mb-4">
            {selectedCompetition === 'all'
              ? 'No routines have been created yet.'
              : 'No routines found for this competition.'}
          </p>
          <Link
            href="/dashboard/entries/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all"
          >
            Create Routine
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const hasMusic = !!entry.music_file_url;

            return (
              <div
                key={entry.id}
                className={`bg-white/10 backdrop-blur-md rounded-xl border p-4 hover:bg-white/20 transition-all ${
                  hasMusic ? 'border-green-400/30' : 'border-red-400/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Entry Info */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status Icon */}
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                        hasMusic
                          ? 'bg-green-500/20 border border-green-400/30'
                          : 'bg-red-500/20 border border-red-400/30'
                      }`}
                    >
                      {hasMusic ? '✓' : '⚠'}
                    </div>

                    {/* Entry Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{entry.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-400/30">
                          #{entry.entry_number || 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>🎭 {(entry as any).competitions?.name || 'Unknown'}</span>
                        <span>🎪 {(entry as any).dance_categories?.name || 'Unknown'}</span>
                        {entry.music_title && (
                          <span>🎵 {entry.music_title}</span>
                        )}
                      </div>
                    </div>

                    {/* Music Status */}
                    <div className="text-right">
                      {hasMusic ? (
                        <div className="text-sm text-green-400 font-semibold">Music Uploaded</div>
                      ) : (
                        <div className="text-sm text-red-400 font-semibold">Music Missing</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-4">
                    {hasMusic ? (
                      <Link
                        href={`/dashboard/entries/${entry.id}/music`}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-medium"
                      >
                        Update Music
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/entries/${entry.id}/music`}
                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
                      >
                        📤 Upload Music
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </main>
  );
}
