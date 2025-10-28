'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Plus } from '@/lib/icons';

export default function CompetitionsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.competition.getAll.useQuery();
  const [filter, setFilter] = useState<'active' | 'all' | 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled'>('active');

  const deleteMutation = trpc.competition.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: (error) => {
      alert(`Delete failed: ${error.message}`);
    },
  });

  const cloneMutation = trpc.competition.clone.useMutation({
    onSuccess: (result) => {
      alert(
        `✅ Competition cloned successfully!\n\n` +
        `New: ${result.competition?.name}\n` +
        `Cloned from: ${result.clonedFrom}\n` +
        `Sessions: ${result.sessionsCloned}\n` +
        `Locations: ${result.locationsCloned}`
      );
      utils.competition.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Clone failed: ${error.message}`);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleClone = (id: string, name: string, currentYear: number) => {
    const newYearStr = prompt(
      `Clone "${name}" (${currentYear})\n\nEnter the year for the new competition:`,
      (currentYear + 1).toString()
    );

    if (!newYearStr) return;

    const newYear = parseInt(newYearStr, 10);
    if (isNaN(newYear) || newYear < 2000 || newYear > 2100) {
      alert('Invalid year. Must be between 2000 and 2100.');
      return;
    }

    const newName = prompt(
      `Optional: Enter custom name for the cloned competition\n\n(Leave blank to use "${name} ${newYear}")`,
      ''
    );

    if (confirm(`Clone "${name}" for year ${newYear}?`)) {
      cloneMutation.mutate({
        id,
        newYear,
        newName: newName || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-white/20 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const competitions = data?.competitions || [];
  const filteredCompetitions = filter === 'all'
    ? competitions
    : filter === 'active'
    ? competitions.filter(c => c.status !== 'cancelled')
    : competitions.filter(c => c.status === filter);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      {/* Header */}
      <div className="mb-8">
        {/* Back to Dashboard */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-all mb-4"
        >
          <span className="text-xl">←</span>
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎭 Event Management</h1>
            <p className="text-gray-400">Create and manage dance competition events</p>
          </div>
          <Button asChild variant="primary" size="lg">
            <Link href="/dashboard/competitions/new">
              <Plus size={20} strokeWidth={2} />
              Create New Event
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'active'
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Active ({competitions.filter(c => c.status !== 'cancelled').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-gray-500 text-white'
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
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'cancelled'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Cancelled ({competitions.filter(c => c.status === 'cancelled').length})
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
              : filter === 'active'
              ? 'No active events found.'
              : `No ${filter.replace('_', ' ')} events found.`}
          </p>
          <Button asChild variant="primary" size="lg">
            <Link href="/dashboard/competitions/new">
              <Plus size={20} strokeWidth={2} />
              Create Your First Event
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompetitions.map((competition) => {
            // Calculate capacity metrics
            const totalCapacity = competition.venue_capacity || 600;
            const reservedCount = competition.reservations
              ?.filter(r => r.status === 'approved')
              .reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0) || 0;
            const remainingSlots = totalCapacity - reservedCount;

            return (
              <div
                key={competition.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all flex flex-col group cursor-pointer"
                onClick={() => router.push(`/dashboard/competitions/${competition.id}/edit`)}
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{competition.name}</h3>
                  <p className="text-gray-400 text-xs">Year: {competition.year}</p>
                </div>

                {/* Capacity Summary */}
                <div className="bg-white/5 rounded-lg p-3 mb-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Capacity</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total:</span>
                      <span className="text-white font-semibold">{totalCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Reserved:</span>
                      <span className="text-green-400 font-semibold">{reservedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Remaining:</span>
                      <span className="text-blue-400 font-semibold">{remainingSlots}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClone(competition.id, competition.name, competition.year);
                    }}
                    className="w-full px-4 py-2 bg-green-500/20 text-green-400 border border-green-400/30 rounded-lg hover:bg-green-500/30 transition-all font-medium text-sm"
                    disabled={cloneMutation.isPending}
                  >
                    {cloneMutation.isPending ? 'Cloning...' : '📋 Clone'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(competition.id, competition.name);
                    }}
                    className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all font-medium text-sm"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
