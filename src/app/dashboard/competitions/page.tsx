'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CompetitionsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.competition.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'registration_open' | 'in_progress' | 'completed'>('all');

  const deleteMutation = trpc.competition.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: (error) => {
      alert(`Delete failed: ${error.message}`);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

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

  const competitions = data?.competitions || [];
  const filteredCompetitions = filter === 'all'
    ? competitions
    : competitions.filter(c => c.status === filter);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎭 Event Management</h1>
            <p className="text-gray-400">Create and manage dance competition events</p>
          </div>
          <Link
            href="/dashboard/competitions/new"
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
          >
            ➕ Create New Event
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All ({competitions.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'upcoming'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Upcoming ({competitions.filter(c => c.status === 'upcoming').length})
          </button>
          <button
            onClick={() => setFilter('registration_open')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'registration_open'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Registration Open ({competitions.filter(c => c.status === 'registration_open').length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'in_progress'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            In Progress ({competitions.filter(c => c.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'completed'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Completed ({competitions.filter(c => c.status === 'completed').length})
          </button>
        </div>
      </div>

      {/* Competitions Grid */}
      {filteredCompetitions.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
          <p className="text-gray-400 mb-4">
            {filter === 'all'
              ? 'No events have been created yet.'
              : `No ${filter.replace('_', ' ')} events found.`}
          </p>
          <Link
            href="/dashboard/competitions/new"
            className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCompetitions.map((competition) => (
            <div
              key={competition.id}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">{competition.name}</h3>
                  <p className="text-gray-400 text-sm mb-2">Year: {competition.year}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    competition.status === 'upcoming'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                      : competition.status === 'registration_open'
                      ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                      : competition.status === 'in_progress'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                      : competition.status === 'completed'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                  }`}
                >
                  {competition.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {competition.description && (
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{competition.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                {competition.competition_start_date && (
                  <div>
                    <span className="text-gray-400">Start Date:</span>
                    <div className="text-white font-medium">
                      {new Date(competition.competition_start_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {competition.primary_location && (
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <div className="text-white font-medium">{competition.primary_location}</div>
                  </div>
                )}
                {competition.venue_capacity && (
                  <div>
                    <span className="text-gray-400">Capacity:</span>
                    <div className="text-white font-medium">{competition.venue_capacity} entries</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Sessions:</span>
                  <div className="text-white font-medium">{competition.session_count}</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Link
                  href={`/dashboard/competitions/${competition.id}/edit`}
                  className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-500/30 transition-all text-center font-medium"
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={() => handleDelete(competition.id, competition.name)}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all font-medium"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
