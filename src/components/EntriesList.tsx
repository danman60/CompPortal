'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import PullToRefresh from 'react-pull-to-refresh';
import { SkeletonCard } from '@/components/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import FloatingActionButton from '@/components/FloatingActionButton';
import { CompetitionFilter } from './CompetitionFilter';
import { EntryEditModal } from './EntryEditModal';
import { useTableSort } from '@/hooks/useTableSort';
import { useEntries } from '@/hooks/useEntries';
import { useEntryFilters } from '@/hooks/useEntryFilters';
import { useEntrySelection } from '@/hooks/useEntrySelection';
import { useSpaceUsage } from '@/hooks/useSpaceUsage';
import { EntriesCardView } from '@/components/entries/EntriesCardView';
import { EntriesTableView } from '@/components/entries/EntriesTableView';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function EntriesList() {
  // Fetch current user to determine role
  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const isStudioDirector = userData?.role === 'studio_director';

  // Use custom hooks
  const {
    entries,
    isLoading,
    refetch,
    dataUpdatedAt,
    reservationData,
    deleteMutation,
    updateMutation,
  } = useEntries();

  const {
    filter,
    setFilter,
    selectedCompetition,
    setSelectedCompetition,
    viewMode,
    setViewMode,
    competitions,
    filteredEntries,
  } = useEntryFilters(entries);

  // Sort entries for table view
  const { sortedData: sortedEntries, sortConfig, requestSort } = useTableSort(filteredEntries);

  // Bulk selection with keyboard shortcuts
  const {
    selectedEntries,
    setSelectedEntries,
    handleSelectAll,
    handleSelectEntry,
    handleBulkDelete,
    handleSelectAllFiltered,
    handleClearSelection,
  } = useEntrySelection(sortedEntries, viewMode, deleteMutation);

  // Space usage calculations
  const {
    hasSelectedCompetition,
    selectedReservation,
    hasNoReservation,
    confirmedSpaces,
    usedSpaces,
    isAtLimit,
    isIncomplete,
  } = useSpaceUsage(entries, selectedCompetition, reservationData);

  // Check if user has any approved reservations (business logic requirement)
  const hasApprovedReservations = reservationData?.reservations?.some(
    (r: any) => r.status === 'approved'
  ) ?? false;

  // Modal states
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySubmitted, setSummarySubmitted] = useState(false);
  const [submittedEntriesSnapshot, setSubmittedEntriesSnapshot] = useState<string>('');
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);

  // Detect changes in filtered entries to re-enable submit button
  useEffect(() => {
    if (!summarySubmitted) return;

    // Create snapshot of current filtered entries (sorted by ID for consistency)
    const currentSnapshot = filteredEntries
      .map(e => e.id)
      .sort()
      .join(',');

    // If entries have changed, reset submitted state
    if (currentSnapshot !== submittedEntriesSnapshot) {
      setSummarySubmitted(false);
    }
  }, [filteredEntries, summarySubmitted, submittedEntriesSnapshot]);

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

  // Show progress bar when there are filtered entries and reservations for selected competition
  const showProgressBar = filteredEntries.length > 0 && confirmedSpaces > 0;

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

        <div className="flex gap-3">
          {isStudioDirector && (
            <>
              <Link
                href="/dashboard/entries/assign"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <span>👥</span>
                <span>Assign Dancers</span>
              </Link>

              <Link
                href="/dashboard/entries/import"
                className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <span>📤</span>
                <span>Import</span>
              </Link>
            </>
          )}

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

          {isAtLimit || hasNoReservation ? (
            <div className="relative group">
              <button
                disabled
                className="bg-gray-600 text-gray-400 px-6 py-3 rounded-lg cursor-not-allowed opacity-50 flex items-center gap-2"
              >
                ➕ Create Routine
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-red-500/20 border border-red-400/30 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="text-xs text-red-200">
                  {isAtLimit
                    ? 'Space limit reached for this competition. You cannot create more routines.'
                    : 'No approved reservation found for this competition. Please create and get approval for a reservation first.'}
                </div>
              </div>
            </div>
          ) : (
            <Link
              href={
                hasSelectedCompetition && selectedReservation
                  ? `/dashboard/entries/create?competition=${selectedCompetition}&reservation=${selectedReservation.id}`
                  : '/dashboard/entries/create'
              }
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
        <CompetitionFilter competitions={competitions.filter(Boolean).map((comp: any) => ({ id: comp.id, competition_name: comp.name, competition_start_date: comp.competition_start_date || (comp.year ? new Date(`${comp.year}-01-01`) : new Date()), }))} selectedId={selectedCompetition || null} onSelect={(id) => setSelectedCompetition(id || '')} />

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
          {hasApprovedReservations ? (
            <Link
              href="/dashboard/entries/create"
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              Create Your First Routine
            </Link>
          ) : (
            <div className="relative group inline-block">
              <button
                disabled
                className="bg-gray-600 text-gray-400 px-6 py-3 rounded-lg cursor-not-allowed"
                title="You need an approved reservation before creating routines"
              >
                Create Your First Routine
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                You need an approved reservation before creating routines
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <EntriesCardView entries={filteredEntries} />
      ) : (
        <EntriesTableView
          sortedEntries={sortedEntries}
          selectedEntries={selectedEntries}
          sortConfig={sortConfig}
          onRequestSort={requestSort}
          onSelectAll={handleSelectAll}
          onSelectEntry={handleSelectEntry}
          onDetailClick={setDetailEntry}
        />
      )}

      {/* Results Count */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        Showing {filteredEntries.length} of {entries.length} routines
      </div>

      {/* Live Summary Bar (Fixed at bottom - only for Studio Directors) */}
      {isStudioDirector && entries.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 border-t-2 border-purple-400/50 shadow-2xl z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-6">
              {/* Summary Stats */}
              <div className="flex items-center gap-8">
                {/* Created Routines */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="text-xs text-gray-300 font-semibold uppercase">Created</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {filteredEntries.length}
                    </div>
                  </div>
                </div>

                {/* Price Estimate */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <div>
                    <div className="text-xs text-gray-300 font-semibold uppercase">Est. Total</div>
                    <div className="text-2xl font-bold text-purple-400">
                      ${filteredEntries.reduce((sum, e) => sum + Number(e.total_fee || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Competition Info (show what's being summarized) */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-2xl">🎪</span>
                  <div>
                    <div className="text-xs text-gray-300 font-semibold uppercase">Viewing</div>
                    <div className="text-sm font-bold text-white">
                      {competitions.find((c: any) => c.id === selectedCompetition)?.name || 'Selected Competition'}
                    </div>
                  </div>
                </div>

                {/* Space Usage Progress Bar */}
                {showProgressBar && (
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-2xl">📊</span>
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-xs text-gray-300 font-semibold uppercase mb-1">
                        Space Usage
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              usedSpaces >= confirmedSpaces
                                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                : usedSpaces / confirmedSpaces > 0.8
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                : 'bg-gradient-to-r from-green-500 to-cyan-500'
                            }`}
                            style={{ width: `${Math.min((usedSpaces / confirmedSpaces) * 100, 100)}%` }}
                          />
                        </div>
                        <div className={`text-sm font-bold whitespace-nowrap ${
                          usedSpaces >= confirmedSpaces
                            ? 'text-red-400'
                            : usedSpaces / confirmedSpaces > 0.8
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}>
                          {usedSpaces} / {confirmedSpaces}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSummaryModal(true)}
                  disabled={filteredEntries.length === 0}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <span>📊</span>
                  <span>View Summary</span>
                </button>

                <button
                  onClick={() => {
                    // Check if incomplete - show confirmation dialog
                    if (isIncomplete) {
                      setShowIncompleteConfirm(true);
                      return;
                    }

                    // Create snapshot of current filtered entries
                    const snapshot = filteredEntries
                      .map(e => e.id)
                      .sort()
                      .join(',');

                    setSubmittedEntriesSnapshot(snapshot);
                    setSummarySubmitted(true);

                    toast.success('Summary submitted to Competition Director! They will create your invoice.', {
                      duration: 4000,
                      position: 'top-right',
                    });
                  }}
                  disabled={filteredEntries.length === 0 || summarySubmitted}
                  className={`px-8 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed font-semibold ${
                    summarySubmitted
                      ? 'bg-gray-600 text-gray-400 opacity-50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-lg transform hover:scale-105'
                  }`}
                >
                  <span>{summarySubmitted ? '✓' : '📤'}</span>
                  <span>{summarySubmitted ? 'Summary Submitted' : 'Submit Summary'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed bottom bar - only for Studio Directors */}
      {isStudioDirector && entries.length > 0 && (
        <div className="h-24"></div>
      )}
    </div>

    {/* Floating Action Button for Mobile */}
    {hasApprovedReservations && (
      <FloatingActionButton
        href="/dashboard/entries/create"
        icon="➕"
        label="Create Routine"
      />
    )}


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

      {/* Routine Detail Modal (Click Popup) */}
      {detailEntry && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDetailEntry(null)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Routine Details</div>
                <div className="text-lg font-bold text-white">{detailEntry.title}</div>
                {detailEntry.entry_number && (
                  <div className="text-sm text-purple-400 mt-1">
                    Routine #{detailEntry.entry_number}{detailEntry.entry_suffix || ''}
                    {detailEntry.is_late_entry && <span className="ml-2 text-xs text-orange-400">(LATE)</span>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Competition</div>
                  <div className="text-sm text-white">
                    {detailEntry.competitions?.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Year</div>
                  <div className="text-sm text-white">
                    {detailEntry.competitions?.year}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Category</div>
                  <div className="text-sm text-white">
                    {detailEntry.dance_categories?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Age Group</div>
                  <div className="text-sm text-white">
                    {detailEntry.age_groups?.name || 'N/A'}
                  </div>
                </div>
              </div>

              {detailEntry.entry_participants && detailEntry.entry_participants.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    Dancers ({detailEntry.entry_participants.length})
                  </div>
                  <div className="space-y-1">
                    {detailEntry.entry_participants.slice(0, 3).map((p: any) => (
                      <div key={p.id} className="text-sm text-gray-300">
                        • {p.dancer_name}
                      </div>
                    ))}
                    {detailEntry.entry_participants.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{detailEntry.entry_participants.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">Music</div>
                  <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${
                    detailEntry.music_file_url
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    <span>{detailEntry.music_file_url ? '✅' : '🎵'}</span>
                    <span>{detailEntry.music_file_url ? 'Uploaded' : 'Pending'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">Registration Status</div>
                  <StatusBadge status={(detailEntry.status || 'draft') as any} size="sm" />
                </div>
              </div>

              <button
                onClick={() => setDetailEntry(null)}
                className="w-full mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 p-6 max-w-4xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              Routine Summary
              {hasSelectedCompetition && (
                <span className="text-lg text-gray-400 ml-2">
                  - {competitions.find((c: any) => c.id === selectedCompetition)?.name}
                </span>
              )}
            </h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Routines</div>
                <div className="text-3xl font-bold text-white">{filteredEntries.length}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Est. Total</div>
                <div className="text-3xl font-bold text-purple-400">${filteredEntries.reduce((sum, e) => sum + Number(e.total_fee || 0), 0).toFixed(2)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Music Uploaded</div>
                <div className="text-3xl font-bold text-green-400">
                  {filteredEntries.filter(e => e.music_file_url).length}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Dancers</div>
                <div className="text-3xl font-bold text-blue-400">
                  {filteredEntries.reduce((sum, e) => sum + (e.entry_participants?.length || 0), 0)}
                </div>
              </div>
            </div>

            {/* Routines Table */}
            <div className="bg-white/5 rounded-lg overflow-hidden mb-4">
              <table className="w-full">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Routine</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Dancers</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Music</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, i) => (
                    <tr key={entry.id} className={i % 2 === 0 ? 'bg-white/5' : ''}>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{entry.title}</div>
                        {entry.entry_number && (
                          <div className="text-xs text-gray-400">#{entry.entry_number}{entry.entry_suffix || ''}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {entry.dance_categories?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white text-sm">
                          {entry.entry_participants?.length || 0} dancer{entry.entry_participants?.length !== 1 ? 's' : ''}
                        </div>
                        {entry.entry_participants && entry.entry_participants.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {entry.entry_participants.map((p: any) => p.dancer_name).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.music_file_url
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {entry.music_file_url ? '✅ Uploaded' : '🎵 Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowSummaryModal(false)}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Incomplete Submission Confirmation Modal */}
      {showIncompleteConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowIncompleteConfirm(false)}
        >
          <div
            className="bg-gradient-to-br from-yellow-900/90 to-orange-900/90 rounded-xl border-2 border-yellow-400/50 p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Incomplete Reservation</h2>
              <p className="text-yellow-200 text-sm">
                You're about to submit with fewer routines than reserved
              </p>
            </div>

            <div className="bg-black/30 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-white font-semibold">Reservation Status</div>
                  <div className="text-yellow-200 text-sm">
                    Reserved: {confirmedSpaces} routines<br/>
                    Created: {usedSpaces} routines<br/>
                    Unused: {confirmedSpaces - usedSpaces} spaces
                  </div>
                </div>
              </div>

              <div className="border-t border-yellow-400/20 pt-3 space-y-2 text-sm text-yellow-100">
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Unused spaces ({confirmedSpaces - usedSpaces}) will be forfeited</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Released spaces return to event's available capacity</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>You can create a new reservation if you need to add entries later</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowIncompleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Proceed with submission
                  const snapshot = filteredEntries
                    .map(e => e.id)
                    .sort()
                    .join(',');

                  setSubmittedEntriesSnapshot(snapshot);
                  setSummarySubmitted(true);
                  setShowIncompleteConfirm(false);

                  toast.success(`Summary submitted with ${usedSpaces} routines! ${confirmedSpaces - usedSpaces} unused spaces released.`, {
                    duration: 5000,
                    position: 'top-right',
                  });
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  );
}


