'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import Link from 'next/link';
import { useTableSort } from '@/hooks/useTableSort';
import SortableHeader from '@/components/SortableHeader';

export default function EntriesList() {
  const { data, isLoading } = trpc.entry.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Fetch reservation data for space limit tracking
  const { data: reservationData } = trpc.reservation.getAll.useQuery(
    {
      competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
      status: 'approved',
    },
    { enabled: selectedCompetition !== 'all' }
  );

  // Delete mutation
  const utils = trpc.useContext();
  const deleteMutation = trpc.entry.delete.useMutation({
    onSuccess: () => {
      utils.entry.getAll.invalidate();
      setSelectedEntries(new Set());
    },
  });

  // Process data before any conditional returns (hooks must be called in consistent order)
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

  // Sort entries for table view (must be called before any conditional returns)
  const { sortedData: sortedEntries, sortConfig, requestSort } = useTableSort(filteredEntries);

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedEntries.size === sortedEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(sortedEntries.map(e => e.id)));
    }
  };

  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedEntries.size} routine${selectedEntries.size > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    for (const entryId of selectedEntries) {
      await deleteMutation.mutateAsync({ id: entryId });
    }
  };

  // Helper function to determine routine completion status
  const getRoutineStatus = (entry: any) => {
    const hasDancers = entry.entry_participants && entry.entry_participants.length > 0;
    const hasMusic = !!entry.music_file_url;

    if (hasDancers && hasMusic) {
      return { status: 'ready', color: 'green', label: 'Ready', icon: '✅' };
    } else if (hasDancers) {
      return { status: 'in-progress', color: 'yellow', label: 'In Progress', icon: '⚠️' };
    } else {
      return { status: 'draft', color: 'gray', label: 'Draft', icon: '📝' };
    }
  };

  // Loading state check AFTER all hooks
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

  // Calculate space limit for "Create Routine" button
  const selectedReservation = reservationData?.reservations?.[0];
  const hasSelectedCompetition = selectedCompetition !== 'all';
  const confirmedSpaces = selectedReservation?.spaces_confirmed || 0;
  const usedSpaces = hasSelectedCompetition
    ? entries.filter(e => e.competition_id === selectedCompetition && e.status !== 'cancelled').length
    : 0;
  const isAtLimit = hasSelectedCompetition && selectedReservation && usedSpaces >= confirmedSpaces;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">My Routines</h1>
          <p className="text-gray-400">Manage your competition routines</p>
        </div>

        {/* Routine Capacity Helper Text */}
        {hasSelectedCompetition && selectedReservation && (
          <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-sm text-purple-300 font-semibold">
                    Routines Available
                  </div>
                  <div className="text-xs text-gray-400">
                    {usedSpaces} of {confirmedSpaces} routines created
                  </div>
                </div>
              </div>
              <div className={`text-2xl font-bold ${
                isAtLimit
                  ? 'text-red-400'
                  : (confirmedSpaces - usedSpaces) <= 3
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}>
                {confirmedSpaces - usedSpaces}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isAtLimit
                      ? 'bg-red-500'
                      : (usedSpaces / confirmedSpaces) >= 0.8
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((usedSpaces / confirmedSpaces) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className={`text-xs ${
              isAtLimit
                ? 'text-red-300'
                : (confirmedSpaces - usedSpaces) <= 3
                ? 'text-yellow-300'
                : 'text-gray-400'
            }`}>
              {isAtLimit
                ? '⚠️ No routines remaining - capacity reached'
                : (confirmedSpaces - usedSpaces) === 1
                ? '⚠️ 1 routine remaining'
                : `${confirmedSpaces - usedSpaces} routines remaining`
              }
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/dashboard/entries/assign"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
          >
            <span>👥</span>
            <span>Assign Dancers</span>
          </Link>

          {viewMode === 'table' && selectedEntries.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🗑️</span>
              <span>Delete Selected ({selectedEntries.size})</span>
            </button>
          )}

          {isAtLimit ? (
            <div className="relative group">
              <button
                disabled
                className="bg-gray-600 text-gray-400 px-6 py-3 rounded-lg cursor-not-allowed opacity-50 flex items-center gap-2"
              >
                ➕ Create Routine
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-red-500/20 border border-red-400/30 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="text-xs text-red-200">
                  Space limit reached for this competition. You cannot create more routines.
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/dashboard/entries/create"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              ➕ Create Routine
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Event Filter */}
        <select
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all" className="bg-gray-900 text-white">All Competitions</option>
          {competitions.map((comp) => comp && (
            <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
              {comp.name} ({comp.year})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
              title="Card View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
              title="Table View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

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

      {/* Space Limit Counter (for selected competition with approved reservation) */}
      {selectedCompetition !== 'all' && reservationData?.reservations?.[0] && (
        <div className="mb-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          {(() => {
            const reservation = reservationData.reservations[0];
            const confirmedSpaces = reservation.spaces_confirmed || 0;
            const usedSpaces = entries.filter(
              e => e.competition_id === selectedCompetition && e.status !== 'cancelled'
            ).length;
            const remainingSpaces = confirmedSpaces - usedSpaces;
            const usagePercent = confirmedSpaces > 0 ? (usedSpaces / confirmedSpaces) * 100 : 0;
            const isNearLimit = usagePercent >= 80;
            const isAtLimit = usedSpaces >= confirmedSpaces;

            return (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Space Usage for This Competition
                    </h3>
                    <p className="text-sm text-gray-400">
                      Reservation approved for {confirmedSpaces} {confirmedSpaces === 1 ? 'space' : 'spaces'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                      {usedSpaces} / {confirmedSpaces}
                    </div>
                    <div className={`text-sm font-semibold ${
                      isAtLimit ? 'text-red-400' :
                      isNearLimit ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {remainingSpaces} {remainingSpaces === 1 ? 'space' : 'spaces'} remaining
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden border border-white/20">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isAtLimit ? 'bg-red-500' :
                      isNearLimit ? 'bg-yellow-500' :
                      'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>

                {/* Warning Messages */}
                {isAtLimit && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg flex items-start gap-3">
                    <span className="text-2xl">🚫</span>
                    <div>
                      <div className="text-sm font-semibold text-red-300 mb-1">
                        Space Limit Reached
                      </div>
                      <div className="text-xs text-red-200">
                        You have used all {confirmedSpaces} confirmed {confirmedSpaces === 1 ? 'space' : 'spaces'} for this competition.
                        You cannot create more routines unless the reservation is updated.
                      </div>
                    </div>
                  </div>
                )}

                {isNearLimit && !isAtLimit && (
                  <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="text-sm font-semibold text-yellow-300 mb-1">
                        Approaching Space Limit
                      </div>
                      <div className="text-xs text-yellow-200">
                        Only {remainingSpaces} {remainingSpaces === 1 ? 'space' : 'spaces'} remaining.
                        Plan your remaining routines carefully.
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

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
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => {
            const routineStatus = getRoutineStatus(entry);
            return (
            <div
              key={entry.id}
              className={`bg-white/10 backdrop-blur-md rounded-xl border p-6 hover:bg-white/20 transition-all ${
                routineStatus.status === 'ready'
                  ? 'border-green-400/40'
                  : routineStatus.status === 'in-progress'
                  ? 'border-yellow-400/40'
                  : 'border-gray-400/40'
              }`}
            >
              {/* Routine Number Badge + Completion Status */}
              <div className="flex justify-between items-start mb-2">
                {entry.entry_number && (
                  <div>
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-lg shadow-md">
                      #{entry.entry_number}{entry.entry_suffix || ''}
                    </span>
                    {entry.is_late_entry && (
                      <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
                        LATE
                      </span>
                    )}
                  </div>
                )}

                {/* Completion Status Indicator */}
                <div className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  routineStatus.status === 'ready'
                    ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                    : routineStatus.status === 'in-progress'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                }`}>
                  <span>{routineStatus.icon}</span>
                  <span>{routineStatus.label}</span>
                </div>
              </div>

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
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-white/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white w-12">
                    <input
                      type="checkbox"
                      checked={selectedEntries.size === sortedEntries.length && sortedEntries.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <SortableHeader label="Routine #" sortKey="entry_number" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Title" sortKey="title" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Category" sortKey="dance_categories.name" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Age Group" sortKey="age_groups.name" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Dancers" sortKey="entry_participants" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Music" sortKey="music_file_url" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry, index) => {
                  const routineStatus = getRoutineStatus(entry);
                  return (
                  <tr
                    key={entry.id}
                    className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                      index % 2 === 0 ? 'bg-black/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() => handleSelectEntry(entry.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {entry.entry_number ? (
                        <div>
                          <span className="text-white font-bold">
                            #{entry.entry_number}{entry.entry_suffix || ''}
                          </span>
                          {entry.is_late_entry && (
                            <div className="text-xs text-orange-400 mt-1">LATE</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{entry.title}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {entry.competitions?.name} ({entry.competitions?.year})
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {entry.dance_categories?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {entry.age_groups?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">
                        {entry.entry_participants?.length || 0} dancer{entry.entry_participants?.length !== 1 ? 's' : ''}
                      </div>
                      {entry.entry_participants && entry.entry_participants.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {entry.entry_participants.slice(0, 2).map((p, i) => (
                            <div key={p.id}>
                              {p.dancers?.first_name} {p.dancers?.last_name}
                            </div>
                          ))}
                          {entry.entry_participants.length > 2 && (
                            <div>+{entry.entry_participants.length - 2} more</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {entry.music_file_url ? (
                        <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                          ✅ Uploaded
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                          ⚠️ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {/* Completion Status */}
                        <div className={`px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 w-fit ${
                          routineStatus.status === 'ready'
                            ? 'bg-green-500/20 text-green-400'
                            : routineStatus.status === 'in-progress'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          <span>{routineStatus.icon}</span>
                          <span>{routineStatus.label}</span>
                        </div>
                        {/* Registration Status */}
                        <span
                          className={`px-2 py-1 rounded text-xs uppercase font-semibold inline-block w-fit ${
                            entry.status === 'confirmed'
                              ? 'bg-green-500/20 text-green-400'
                              : entry.status === 'registered'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : entry.status === 'cancelled'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/entries/${entry.id}`}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-all"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/entries/${entry.id}/edit`}
                          className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs transition-all"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/dashboard/entries/${entry.id}/music`}
                          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs transition-all"
                        >
                          🎵
                        </Link>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        Showing {filteredEntries.length} of {entries.length} routines
      </div>
    </div>
  );
}
