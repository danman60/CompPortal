'use client';

// Force rebuild: b57f350
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
// Removed PullToRefresh - causes SSR window.is-not-defined error
import { SkeletonTableRow } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import FloatingActionButton from '@/components/FloatingActionButton';
import { ReservationSelector } from './ReservationSelector';
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

  // Submit summary mutation
  const submitSummaryMutation = trpc.entry.submitSummary.useMutation({
    onSuccess: () => {
      toast.success('Summary submitted to Competition Director! They will create your invoice.', {
        duration: 4000,
        position: 'top-right',
      });
      setSummarySubmitted(true);
      refetch(); // Refresh entries to show updated reservation status
    },
    onError: (error) => {
      toast.error(`Failed to submit summary: ${error.message}`, {
        position: 'top-right',
      });
    },
  });

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
    selectedReservation: selectedReservationId,
    setSelectedReservation,
    viewMode,
    setViewMode,
    reservations,
    filteredEntries,
    selectedReservationObj,
  } = useEntryFilters(entries, reservationData);

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
    hasSelectedReservation,
    selectedReservation,
    confirmedSpaces,
    usedSpaces,
    isAtLimit,
    isIncomplete,
    isClosed,
  } = useSpaceUsage(entries, selectedReservationObj);

  // Get competition ID from selected reservation for routine creation
  const selectedCompetitionId = selectedReservation?.competition_id || '';

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

  // Loading state check AFTER all hooks
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="space-y-0">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <SkeletonTableRow key={i} columns={8} />
          ))}
        </div>
      </div>
    );
  }

  // Show progress bar when there are filtered entries and selected reservation
  const showProgressBar = filteredEntries.length > 0 && hasSelectedReservation && confirmedSpaces > 0;

  return (
    <>
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

              <button
                onClick={() => {
                  if (!filteredEntries || filteredEntries.length === 0) {
                    toast.error('No routines to export');
                    return;
                  }

                  // Generate CSV content
                  const headers = ['Routine #', 'Title', 'Category', 'Size', 'Age Group', 'Props', 'Choreographer', 'Dancers', 'Fee', 'Status'];
                  const rows = filteredEntries.map(entry => [
                    entry.entry_number || '',
                    entry.title || '',
                    entry.dance_categories?.name || '',
                    entry.entry_size_categories?.name || '',
                    entry.age_groups?.name || '',
                    entry.props || '',
                    entry.choreographer || '',
                    entry.entry_participants?.map((p: any) => `${p.dancers?.first_name} ${p.dancers?.last_name}`).join('; ') || '',
                    entry.total_fee || '0',
                    entry.status || ''
                  ]);

                  // Combine headers and rows
                  const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                  ].join('\n');

                  // Create download
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `routines-export-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);

                  toast.success(`Exported ${filteredEntries.length} routines to CSV`);
                }}
                className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>
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

          {isAtLimit || isClosed || !hasSelectedReservation ? (
            <div className="relative group">
              <button
                disabled
                className="bg-gray-600 text-gray-400 px-6 py-3 rounded-lg cursor-not-allowed opacity-50 flex items-center gap-2"
              >
                ➕ Create Routine
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-red-500/20 border border-red-400/30 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="text-xs text-red-200">
                  {isClosed
                    ? 'This reservation is closed. You can edit existing routines but cannot create new ones.'
                    : isAtLimit
                    ? 'Space limit reached for this reservation. You cannot create more routines.'
                    : 'No reservation selected. Please select a reservation first.'}
                </div>
              </div>
            </div>
          ) : (
            <Link
              href={
                hasSelectedReservation && selectedReservation
                  ? `/dashboard/entries/create?competition=${selectedCompetitionId}&reservation=${selectedReservation.id}`
                  : '/dashboard/entries/create'
              }
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              ➕ Create Routine
            </Link>
          )}

          {/* DUPLICATE Submit Summary Button - Beside Create Routine */}
          {isStudioDirector && hasSelectedReservation && filteredEntries.length > 0 && (
            <button
              onClick={() => {
                console.log('[SUBMIT DEBUG] Button clicked');
                console.log('[SUBMIT DEBUG] userData:', userData);
                console.log('[SUBMIT DEBUG] selectedCompetitionId:', selectedCompetitionId);
                console.log('[SUBMIT DEBUG] userData.studio:', userData?.studio);
                console.log('[SUBMIT DEBUG] userData.studio.id:', userData?.studio?.id);

                // Validate required data
                if (!userData?.studio?.id) {
                  console.error('[SUBMIT DEBUG] Missing studio ID');
                  toast.error('Studio information not loaded. Please refresh the page.');
                  return;
                }
                if (!selectedCompetitionId) {
                  console.error('[SUBMIT DEBUG] Missing competition ID');
                  toast.error('Please select a reservation first.');
                  return;
                }

                console.log('[SUBMIT DEBUG] Validation passed, calling mutation');

                // Check if incomplete - show confirmation dialog
                if (isIncomplete) {
                  setShowIncompleteConfirm(true);
                  return;
                }

                // Proceed with submission
                submitSummaryMutation.mutate({
                  studioId: userData.studio.id,
                  competitionId: selectedCompetitionId,
                });
              }}
              disabled={submitSummaryMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 font-bold disabled:opacity-50"
            >
              <span>✅</span>
              <span>Submit Summary (TEST)</span>
            </button>
          )}

          {/* Submit Summary Button - Far Right, Prominent */}
          {isStudioDirector && hasSelectedReservation && filteredEntries.length > 0 && (
            <button
              onClick={() => {
                // Validate required data
                if (!userData?.studio?.id) {
                  toast.error('Studio information not loaded. Please refresh the page.');
                  return;
                }
                if (!selectedCompetitionId) {
                  toast.error('Please select a reservation first.');
                  return;
                }

                // Check if incomplete - show confirmation dialog
                if (isIncomplete) {
                  setShowIncompleteConfirm(true);
                  return;
                }

                // Proceed with submission
                submitSummaryMutation.mutate({
                  studioId: userData.studio.id,
                  competitionId: selectedCompetitionId,
                });
              }}
              disabled={summarySubmitted || submitSummaryMutation.isPending}
              className={`px-8 py-4 rounded-xl transition-all duration-200 flex items-center gap-3 disabled:cursor-not-allowed font-bold text-lg shadow-xl ${
                summarySubmitted
                  ? 'bg-gray-600 text-gray-400 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white hover:shadow-2xl transform hover:scale-105 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 animate-pulse'
              }`}
            >
              <span className="text-2xl">{summarySubmitted ? '✓' : '📤'}</span>
              <span>{summarySubmitted ? 'Summary Submitted' : 'Submit Summary'}</span>
              {submitSummaryMutation.isPending && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Reservation Selector */}
        <ReservationSelector
          reservations={reservations.map((r: any) => ({
            id: r.id,
            event_name: r.event_name,
            status: r.status,
            is_closed: r.is_closed,
            competition_id: r.competition_id
          }))}
          selectedId={selectedReservationId || null}
          onSelect={(id) => setSelectedReservation(id || '')}
        />

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
            {hasSelectedReservation
              ? 'No routines have been created for this reservation yet.'
              : 'Please select a reservation to view or create routines.'}
          </p>
          {hasSelectedReservation && !isClosed ? (
            <Link
              href={`/dashboard/entries/create?competition=${selectedCompetitionId}&reservation=${selectedReservation?.id}`}
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
      {isStudioDirector && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 border-t-2 border-purple-400/50 shadow-2xl z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-6">
              {/* Summary Stats - Centered */}
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
                      {selectedReservationObj?.event_name || 'Select a Reservation'}
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

            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed bottom bar - only for Studio Directors */}
      {isStudioDirector && (
        <div className="h-24"></div>
      )}
    </div>

    {/* Floating Action Button for Mobile */}
    {hasSelectedReservation && selectedReservation && (
      <FloatingActionButton
        href={`/dashboard/entries/create?competition=${selectedCompetitionId}&reservation=${selectedReservation.id}`}
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
              {hasSelectedReservation && selectedReservation && (
                <span className="text-lg text-gray-400 ml-2">
                  - {selectedReservation.event_name}
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
                  setShowIncompleteConfirm(false);

                  // Validate required data
                  if (!userData?.studio?.id || !selectedCompetitionId) {
                    toast.error('Missing required data. Please refresh and try again.');
                    return;
                  }

                  // Proceed with submission via mutation
                  submitSummaryMutation.mutate({
                    studioId: userData.studio.id,
                    competitionId: selectedCompetitionId,
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
    </>
  );
}


