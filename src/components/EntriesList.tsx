'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import Link from 'next/link';

export default function EntriesList() {
  const { data, isLoading } = trpc.entry.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const entries = data?.entries || [];

  // Get unique competitions for filter
  const competitions = Array.from(new Set(entries.map(e => e.competition_id)))
    .map(id => {
      const entry = entries.find(e => e.competition_id === id);
      return entry?.competitions;
    })
    .filter(Boolean);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesStatus = filter === 'all' || entry.status === filter;
    const matchesCompetition = selectedCompetition === 'all' || entry.competition_id === selectedCompetition;
    return matchesStatus && matchesCompetition;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Event Filter */}
        <select
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Events</option>
          {competitions.map((comp) => comp && (
            <option key={comp.id} value={comp.id}>
              {comp.name} ({comp.year})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All ({entries.length})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'draft'
                ? 'bg-gray-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Draft ({entries.filter((e) => e.status === 'draft').length})
          </button>
          <button
            onClick={() => setFilter('registered')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'registered'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Registered ({entries.filter((e) => e.status === 'registered').length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'confirmed'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Confirmed ({entries.filter((e) => e.status === 'confirmed').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'cancelled'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Cancelled ({entries.filter((e) => e.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Routines Grid */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h3 className="text-xl font-semibold text-white mb-2">No routines found</h3>
          <p className="text-gray-400 mb-6">
            {filter === 'all'
              ? 'No routines have been created yet.'
              : `No ${filter} routines found.`}
          </p>
          <Link
            href="/dashboard/entries/create"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Create Your First Routine
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{entry.title}</h3>
                  <p className="text-sm text-gray-400">
                    {entry.competitions?.name} ({entry.competitions?.year})
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    entry.status === 'confirmed'
                      ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                      : entry.status === 'registered'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                      : entry.status === 'cancelled'
                      ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                  }`}
                >
                  {entry.status?.toUpperCase()}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {/* Routine Number (if assigned) */}
                {entry.entry_number && (
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>🔢</span>
                    <span className="text-purple-400">
                      Routine #{entry.entry_number}{entry.entry_suffix || ''}
                      {entry.is_late_entry && <span className="ml-2 text-xs text-yellow-400">(Late Routine)</span>}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>🏢</span>
                  <span>{entry.studios?.name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>🎭</span>
                  <span>{entry.dance_categories?.name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>👥</span>
                  <span>{entry.entry_participants?.length || 0} Dancer(s)</span>
                </div>

                {entry.age_groups && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span>📅</span>
                    <span>{entry.age_groups.name}</span>
                  </div>
                )}

                {entry.entry_number && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span>#️⃣</span>
                    <span>Routine #{entry.entry_number}</span>
                  </div>
                )}
              </div>

              {/* Participants */}
              {entry.entry_participants && entry.entry_participants.length > 0 && (
                <div className="pt-4 border-t border-white/10 mb-4">
                  <div className="text-xs text-gray-400 mb-2">Dancers:</div>
                  <div className="space-y-1">
                    {entry.entry_participants.slice(0, 3).map((participant) => (
                      <div key={participant.id} className="text-sm text-white">
                        • {participant.dancers?.first_name} {participant.dancers?.last_name}
                      </div>
                    ))}
                    {entry.entry_participants.length > 3 && (
                      <div className="text-sm text-gray-400">
                        +{entry.entry_participants.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Music Upload Status */}
              {entry.music_file_url ? (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-500/20 border border-green-400/30 rounded-lg">
                  <span className="text-green-400">✅</span>
                  <span className="text-sm text-green-300">Music uploaded</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                  <span className="text-yellow-400">⚠️</span>
                  <span className="text-sm text-yellow-300">Music not uploaded</span>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Link
                  href={`/dashboard/entries/${entry.id}`}
                  className="text-center bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-all"
                >
                  View
                </Link>
                <Link
                  href={`/dashboard/entries/${entry.id}/edit`}
                  className="text-center bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-sm transition-all"
                >
                  Edit
                </Link>
                <Link
                  href={`/dashboard/entries/${entry.id}/music`}
                  className="text-center bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-sm transition-all"
                >
                  🎵 Music
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        Showing {filteredEntries.length} of {entries.length} routines
      </div>
    </div>
  );
}
