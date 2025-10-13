'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTableSort } from '@/hooks/useTableSort';
import SortableHeader from '@/components/SortableHeader';
import toast from 'react-hot-toast';
import PullToRefresh from 'react-pull-to-refresh';
import HoverPreview from '@/components/HoverPreview';
import { SkeletonCard } from '@/components/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import FloatingActionButton from '@/components/FloatingActionButton';
import { CompetitionFilter } from './CompetitionFilter';
import { EntryEditModal } from './EntryEditModal';

export default function EntriesList() {
  // PERFORMANCE FIX: Add pagination to reduce initial load time
  const [limit] = useState(100); // Load 100 entries at a time
  const { data, isLoading, refetch, dataUpdatedAt } = trpc.entry.getAll.useQuery({
    limit,
    offset: 0,
  });
  const [filter, setFilter] = useState<'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const updateMutation = trpc.entry.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowEditModal(false);
      setEditingEntry(null);
    },
  });

  // Fetch reservation data for space limit tracking
  const { data: reservationData } = trpc.reservation.getAll.useQuery(
    {
      competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
      status: 'approved',
    },
    { enabled: selectedCompetition !== 'all' }
  );

  // Delete mutation with optimistic updates
  const utils = trpc.useUtils();
  const deleteMutation = trpc.entry.delete.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.entry.getAll.cancel();

      // Snapshot previous value
      const previousData = utils.entry.getAll.getData();

      // Optimistically update cache - remove deleted entry
      utils.entry.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          entries: old.entries.filter((entry) => entry.id !== variables.id),
        };
      });

      // Return context with snapshot for potential rollback
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousData) {
        utils.entry.getAll.setData(undefined, context.previousData);
      }
      toast.error('Failed to delete routine');
    },
    onSettled: () => {
      // Refetch to ensure sync with server
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

    const count = selectedEntries.size;
    const entryIds = Array.from(selectedEntries);

    toast.promise(
      (async () => {
        for (const entryId of entryIds) {
          await deleteMutation.mutateAsync({ id: entryId });
        }
      })(),
      {
        loading: `Deleting ${count} routine${count > 1 ? 's' : ''}...`,
        success: `${count} routine${count > 1 ? 's' : ''} deleted successfully`,
        error: 'Failed to delete routines',
      }
    );
  };

  // Helper function to get music upload status only
  const getMusicStatus = (entry: any) => {
    const hasMusic = !!entry.music_file_url;
    if (hasMusic) {
      return { status: 'uploaded', color: 'green', label: 'Music Uploaded', icon: '✅' };
    } else {
      return { status: 'pending', color: 'yellow', label: 'Music Pending', icon: '🎵' };
    }
  };

  // Bulk selection shortcuts
  const handleSelectAllFiltered = () => {
    setSelectedEntries(new Set(sortedEntries.map(e => e.id)));
    toast.success(`${sortedEntries.length} routines selected`);
  };

  const handleClearSelection = () => {
    setSelectedEntries(new Set());
    toast.success('Selection cleared');
  };

  // Keyboard shortcuts for bulk selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only in table mode
      if (viewMode !== 'table') return;

      // Ctrl+A / Cmd+A - Select All Filtered
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && sortedEntries.length > 0) {
        e.preventDefault();
        handleSelectAllFiltered();
      }

      // Escape - Clear Selection
      if (e.key === 'Escape' && selectedEntries.size > 0) {
        e.preventDefault();
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, sortedEntries, selectedEntries]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await refetch();
  };

  // Loading state check AFTER all hooks
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
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
    <PullToRefresh onRefresh={handleRefresh}>
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
        <CompetitionFilter competitions={competitions.filter(Boolean).map((comp: any) => ({ id: comp.id, competition_name: comp.name, competition_start_date: comp.competition_start_date || (comp.year ? new Date(`${comp.year}-01-01`) : new Date()), }))} selectedId={selectedCompetition === "all" ? null : selectedCompetition} onSelect={(id) => setSelectedCompetition(id || "all")} />

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
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'all'
                ? 'bg-white/30 text-white'
                : 'bg-purple-500 text-white'
            }`}>
              {entries.length}
            </span>
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'draft'
                ? 'bg-gray-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Draft
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'draft'
                ? 'bg-white/30 text-white'
                : 'bg-gray-500 text-white'
            }`}>
              {entries.filter((e) => e.status === 'draft').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('registered')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'registered'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Registered
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'registered'
                ? 'bg-white/30 text-white'
                : 'bg-yellow-500 text-black'
            }`}>
              {entries.filter((e) => e.status === 'registered').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'confirmed'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Confirmed
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'confirmed'
                ? 'bg-white/30 text-white'
                : 'bg-green-500 text-black'
            }`}>
              {entries.filter((e) => e.status === 'confirmed').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'cancelled'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Cancelled
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'cancelled'
                ? 'bg-white/30 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {entries.filter((e) => e.status === 'cancelled').length}
            </span>
          </button>
        </div>
      </div>

      {/* Data Refresh Indicator */}
      {dataUpdatedAt && (
        <div className="flex justify-end mb-4">
          <div className="text-xs text-gray-400/80 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Updated {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}
          </div>
        </div>
      )}

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

      {/* Bulk Selection Toolbar (Table Mode Only) */}
      {viewMode === 'table' && filteredEntries.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Quick Select:</span>
          </div>

          <button
            onClick={handleSelectAllFiltered}
            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 rounded-lg text-xs transition-all flex items-center gap-1.5"
            title="Select all filtered routines (Ctrl/Cmd + A)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Select All Filtered ({sortedEntries.length})
          </button>

          {selectedEntries.size > 0 && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-400/30 text-gray-300 rounded-lg text-xs transition-all flex items-center gap-1.5"
              title="Clear selection (Escape)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Selection
            </button>
          )}

          {selectedEntries.size > 0 && (
            <div className="ml-auto px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg text-xs font-semibold">
              {selectedEntries.size} selected
            </div>
          )}

          <div className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20">Ctrl+A</kbd> to select all,
            <kbd className="ml-1 px-1.5 py-0.5 bg-white/10 rounded border border-white/20">Esc</kbd> to clear
          </div>
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
            const musicStatus = getMusicStatus(entry);
            return (
            <div
              key={entry.id}
              className={`bg-white/10 backdrop-blur-md rounded-xl border p-6 hover:bg-white/20 transition-all flex flex-col ${
                entry.status === 'confirmed'
                  ? 'border-green-400/40'
                  : entry.status === 'registered'
                  ? 'border-yellow-400/40'
                  : entry.status === 'cancelled'
                  ? 'border-red-400/40'
                  : 'border-gray-400/40'
              }`}
            >
              {/* Routine Number Badge + Registration Status */}
              <div className="flex justify-between items-start mb-3">
                {entry.entry_number ? (
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
                ) : (
                  <span className="text-gray-500 text-sm">Pending Assignment</span>
                )}

                {/* Registration Status */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                    entry.status === 'confirmed'
                      ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                      : entry.status === 'registered'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                      : entry.status === 'cancelled'
                      ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                  }`}
                >
                  {entry.status}
                </span>
              </div>

              {/* Header */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-1">{entry.title}</h3>
                <p className="text-sm text-gray-400">
                  {entry.competitions?.name} ({entry.competitions?.year})
                </p>
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
              <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border ${
                musicStatus.status === 'uploaded'
                  ? 'bg-green-500/20 border-green-400/30'
                  : 'bg-yellow-500/20 border-yellow-400/30'
              }`}>
                <span className={musicStatus.status === 'uploaded' ? 'text-green-400' : 'text-yellow-400'}>
                  {musicStatus.icon}
                </span>
                <span className={`text-sm ${musicStatus.status === 'uploaded' ? 'text-green-300' : 'text-yellow-300'}`}>
                  {musicStatus.label}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-4 gap-2 mt-4">
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
        /* Table View - Completely Rebuilt with Fixed Headers */
        <div className="bg-gray-900/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Fixed Header Table */}
          <div className="overflow-x-auto bg-gray-800 border-b border-white/30">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white" style={{ width: '60px' }}>
                    <input
                      type="checkbox"
                      checked={selectedEntries.size === sortedEntries.length && sortedEntries.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <SortableHeader label="Routine #" sortKey="entry_number" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '120px' }} />
                  <SortableHeader label="Title" sortKey="title" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '250px' }} />
                  <SortableHeader label="Category" sortKey="dance_categories.name" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '150px' }} />
                  <SortableHeader label="Age Group" sortKey="age_groups.name" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '150px' }} />
                  <SortableHeader label="Dancers" sortKey="entry_participants" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '200px' }} />
                  <SortableHeader label="Music" sortKey="music_file_url" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '120px' }} />
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '120px' }} />
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white bg-gray-800" style={{ width: '200px' }}>Actions</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Scrollable Body Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full table-fixed">
              <tbody>
                {sortedEntries.map((entry, index) => {
                  const musicStatus = getMusicStatus(entry);
                  return (
                  <HoverPreview
                    key={entry.id}
                    delay={400}
                    trigger={
                  <tr
                    className={`border-b border-white/10 hover:bg-gray-700/50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800/40' : 'bg-gray-900/20'
                    }`}
                  >
                    <td className="px-6 py-4" style={{ width: '60px' }}>
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() => handleSelectEntry(entry.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4" style={{ width: '120px' }}>
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
                    <td className="px-6 py-4" style={{ width: '250px' }}>
                      <div className="text-white font-medium">{entry.title}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {entry.competitions?.name} ({entry.competitions?.year})
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300" style={{ width: '150px' }}>
                      {entry.dance_categories?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-300" style={{ width: '150px' }}>
                      {entry.age_groups?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4" style={{ width: '200px' }}>
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
                    <td className="px-6 py-4" style={{ width: '120px' }}>
                      <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${
                        musicStatus.status === 'uploaded'
                          ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                      }`}>
                        <span>{musicStatus.icon}</span>
                        <span>{musicStatus.status === 'uploaded' ? 'Uploaded' : 'Pending'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ width: '120px' }}>
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs uppercase font-semibold inline-block ${
                          entry.status === 'confirmed'
                            ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                            : entry.status === 'registered'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                            : entry.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ width: '200px' }}>
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
                    }
                    content={
                      <div className="space-y-3 min-w-[350px]">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Routine Details</div>
                          <div className="text-lg font-bold text-white">{entry.title}</div>
                          {entry.entry_number && (
                            <div className="text-sm text-purple-400 mt-1">
                              Routine #{entry.entry_number}{entry.entry_suffix || ''}
                              {entry.is_late_entry && <span className="ml-2 text-xs text-orange-400">(LATE)</span>}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Competition</div>
                            <div className="text-sm text-white">
                              {entry.competitions?.name}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Year</div>
                            <div className="text-sm text-white">
                              {entry.competitions?.year}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Category</div>
                            <div className="text-sm text-white">
                              {entry.dance_categories?.name || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Age Group</div>
                            <div className="text-sm text-white">
                              {entry.age_groups?.name || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {entry.entry_participants && entry.entry_participants.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              Dancers ({entry.entry_participants.length})
                            </div>
                            <div className="space-y-1">
                              {entry.entry_participants.slice(0, 3).map((p) => (
                                <div key={p.id} className="text-sm text-gray-300">
                                  • {p.dancers?.first_name} {p.dancers?.last_name}
                                </div>
                              ))}
                              {entry.entry_participants.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{entry.entry_participants.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-400">Music</div>
                            <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${
                              musicStatus.status === 'uploaded'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              <span>{musicStatus.icon}</span>
                              <span>{musicStatus.status === 'uploaded' ? 'Uploaded' : 'Pending'}</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-400">Registration Status</div>
                            <span className={`px-2 py-1 rounded text-xs uppercase font-semibold ${
                              entry.status === 'confirmed'
                                ? 'bg-green-500/20 text-green-400'
                                : entry.status === 'registered'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : entry.status === 'cancelled'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {entry.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    }
                  />
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

    {/* Floating Action Button for Mobile */}
    <FloatingActionButton
      href="/dashboard/entries/create"
      icon="➕"
      label="Create Routine"
    />


      {/* Quick Edit Modal */}
      {showEditModal && editingEntry && (
        <EntryEditModal
          entry={editingEntry}
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingEntry(null); }}
          onSave={async (updates) => {
            await updateMutation.mutateAsync({ id: editingEntry.id, data: updates as any } as any);
          }}
        />
      )}
    </PullToRefresh>
  );
}


