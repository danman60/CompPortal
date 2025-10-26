'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTableSort } from '@/hooks/useTableSort';
import SortableHeader from '@/components/SortableHeader';
import PullToRefresh from 'react-pull-to-refresh';
import { highlightText } from '@/lib/highlightText';
import { SkeletonDancerCard } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function DancersList() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = trpc.dancer.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedDancers, setSelectedDancers] = useState<Set<string>>(new Set());

  // Delete mutation
  const utils = trpc.useUtils();
  const deleteMutation = trpc.dancer.delete.useMutation({
    onMutate: async (variables) => {
      await utils.dancer.getAll.cancel();
      const previousData = utils.dancer.getAll.getData();

      utils.dancer.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          dancers: old.dancers.filter((dancer) => dancer.id !== variables.id),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        utils.dancer.getAll.setData(undefined, context.previousData);
      }
      toast.error(err.message || 'Failed to delete dancer');
    },
    onSettled: () => {
      utils.dancer.getAll.invalidate();
      setSelectedDancers(new Set());
    },
  });

  // IMPORTANT: All hooks must be called before any conditional returns
  const dancers = data?.dancers ?? [];
  const filteredDancers = dancers.filter((dancer) => {
    if (!dancer) return false;
    const matchesGender = filter === 'all' || dancer.gender?.toLowerCase() === filter;
    const matchesSearch =
      searchTerm === '' ||
      dancer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dancer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${dancer.first_name} ${dancer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGender && matchesSearch;
  });

  // Sort dancers for table view
  const { sortedData: sortedDancers, sortConfig, requestSort } = useTableSort(filteredDancers);

  // Bulk selection helper functions - defined before hooks that use them
  const handleSelectAllFiltered = useCallback(() => {
    setSelectedDancers(new Set(sortedDancers.map(d => d.id)));
    toast.success(`${sortedDancers.length} dancers selected`);
  }, [sortedDancers]);

  const handleClearSelection = useCallback(() => {
    setSelectedDancers(new Set());
    toast.success('Selection cleared');
  }, []);

  // Force cards view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('cards');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts for bulk selection - MUST be called before conditional returns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'table') return;

      // Ctrl+A / Cmd+A - Select All Filtered
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && sortedDancers.length > 0) {
        e.preventDefault();
        handleSelectAllFiltered();
      }

      // Escape - Clear Selection
      if (e.key === 'Escape' && selectedDancers.size > 0) {
        e.preventDefault();
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, sortedDancers, selectedDancers, handleSelectAllFiltered, handleClearSelection]);

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-500/20 p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Dancers</h3>
        <p className="text-gray-300 mb-4">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonDancerCard key={i} />
        ))}
      </div>
    );
  }

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedDancers.size === sortedDancers.length) {
      setSelectedDancers(new Set());
    } else {
      setSelectedDancers(new Set(sortedDancers.map(d => d.id)));
    }
  };

  const handleSelectDancer = (dancerId: string) => {
    const newSelected = new Set(selectedDancers);
    if (newSelected.has(dancerId)) {
      newSelected.delete(dancerId);
    } else {
      newSelected.add(dancerId);
    }
    setSelectedDancers(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedDancers.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedDancers.size} dancer${selectedDancers.size > 1 ? 's' : ''}?`)) {
      return;
    }

    const count = selectedDancers.size;
    const dancerIds = Array.from(selectedDancers);
    let successCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const dancerId of dancerIds) {
      try {
        await deleteMutation.mutateAsync({ id: dancerId });
        successCount++;
      } catch (error: any) {
        failedCount++;
        lastError = error.message || 'Unknown error';
      }
    }

    if (failedCount === 0) {
      toast.success(`${successCount} dancer${successCount > 1 ? 's' : ''} deleted successfully`);
    } else if (successCount === 0) {
      toast.error(`Failed to delete dancers: ${lastError}`);
    } else {
      toast.error(`Deleted ${successCount}, failed ${failedCount}. Last error: ${lastError}`);
    }
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div>
      {/* Search, Filter, and View Toggle */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search dancers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <div className="flex gap-2 flex-wrap">
          {/* View Mode Toggle - Hidden on mobile */}
          <div className="hidden md:flex gap-1 bg-white/5 rounded-lg p-1">
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

          {/* Gender Filters */}
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
              {dancers.length}
            </span>
          </button>
          <button
            onClick={() => setFilter('male')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'male'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Male
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'male'
                ? 'bg-white/30 text-white'
                : 'bg-blue-500 text-white'
            }`}>
              {dancers.filter((d) => d.gender === 'Male').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('female')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'female'
                ? 'bg-pink-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Female
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'female'
                ? 'bg-white/30 text-white'
                : 'bg-pink-500 text-white'
            }`}>
              {dancers.filter((d) => d.gender === 'Female').length}
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
      {viewMode === 'table' && filteredDancers.length > 0 && (
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
            title="Select all filtered dancers (Ctrl/Cmd + A)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Select All Filtered ({sortedDancers.length})
          </button>

          {selectedDancers.size > 0 && (
            <>
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

              <button
                onClick={handleBulkDelete}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Selected
              </button>

              <div className="ml-auto px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg text-xs font-semibold">
                {selectedDancers.size} selected
              </div>
            </>
          )}

          <div className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20">Ctrl+A</kbd> to select all,
            <kbd className="ml-1 px-1.5 py-0.5 bg-white/10 rounded border border-white/20">Esc</kbd> to clear
          </div>
        </div>
      )}

      {/* Dancers Display */}
      {filteredDancers.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">💃</div>
          <h3 className="text-xl font-semibold text-white mb-2">No dancers found</h3>
          <p className="text-gray-400">
            {searchTerm
              ? `No dancers match "${searchTerm}"`
              : filter === 'all'
              ? 'No dancers registered yet.'
              : `No ${filter} dancers found.`}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDancers.map((dancer) => (
            <div
              key={dancer.id}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
            >
              {/* Gender Badge */}
              <div className="flex justify-between items-start mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    dancer.gender === 'Male'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                      : dancer.gender === 'Female'
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-400/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                  }`}
                >
                  {dancer.gender || 'Unknown'}
                </span>
                {dancer.registration_number && (
                  <div className="text-gray-400 text-xs">{dancer.registration_number}</div>
                )}
              </div>

              {/* Dancer Name */}
              <h3 className="text-xl font-bold text-white mb-2">
                {highlightText(`${dancer.first_name} ${dancer.last_name}`, searchTerm)}
              </h3>

              {/* Studio */}
              {dancer.studios && (
                <div className="flex items-center gap-2 text-gray-300 text-sm mb-3">
                  <span>🏢</span>
                  <span>{dancer.studios.name}</span>
                </div>
              )}

              {/* Age/Birth Year */}
              {dancer.date_of_birth && (
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                  <span>🎂</span>
                  <span>{new Date(dancer.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ({new Date().getFullYear() - new Date(dancer.date_of_birth).getFullYear()} years old)</span>
                </div>
              )}

              {/* Status */}
              {dancer.status && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      dancer.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {dancer.status.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Edit Button */}
              <div className="mt-4">
                <Link
                  href={`/dashboard/dancers/${dancer.id}`}
                  className="block w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Edit Dancer
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View - Completely Rebuilt with Fixed Headers and Checkboxes */
        <div className="bg-gray-900/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Fixed Header Table */}
          <div className="overflow-x-auto bg-gray-800 border-b border-white/30">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white" style={{ width: '60px' }}>
                    <input
                      type="checkbox"
                      checked={selectedDancers.size === sortedDancers.length && sortedDancers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <SortableHeader label="Name" sortKey="first_name" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '250px' }} />
                  <SortableHeader label="Gender" sortKey="gender" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '120px' }} />
                  <SortableHeader label="Age" sortKey="date_of_birth" sortConfig={sortConfig} onSort={requestSort} className="bg-gray-800" style={{ width: '200px' }} />
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white bg-gray-800" style={{ width: '180px' }}>Studio</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white bg-gray-800" style={{ width: '120px' }}>Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white bg-gray-800" style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Scrollable Body Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]" style={{ scrollbarGutter: 'stable' }}>
            <table className="w-full table-fixed">
              <tbody>
                {sortedDancers.map((dancer, index) => {
                  const age = dancer.date_of_birth
                    ? new Date().getFullYear() - new Date(dancer.date_of_birth).getFullYear()
                    : null;

                  return (
                  <tr
                    key={dancer.id}
                    className={`border-b border-white/10 hover:bg-gray-700/50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-800/40' : 'bg-gray-900/20'
                    }`}
                  >
                    <td className="px-6 py-4" style={{ width: '60px' }}>
                      <input
                        type="checkbox"
                        checked={selectedDancers.has(dancer.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectDancer(dancer.id);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4" style={{ width: '250px' }}>
                      <div className="text-white font-medium">
                        {highlightText(`${dancer.first_name} ${dancer.last_name}`, searchTerm)}
                      </div>
                      {dancer.registration_number && (
                        <div className="text-xs text-gray-400 mt-1">#{dancer.registration_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4" style={{ width: '120px' }}>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          dancer.gender === 'Male'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                            : dancer.gender === 'Female'
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-400/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                        }`}
                      >
                        {dancer.gender || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ width: '200px' }}>
                      {dancer.date_of_birth ? (
                        <div className="text-white">
                          {new Date().getFullYear() - new Date(dancer.date_of_birth).getFullYear()} yrs
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(dancer.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300" style={{ width: '180px' }}>
                      {dancer.studios?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4" style={{ width: '120px' }}>
                      {dancer.status && (
                        <span
                          className={`px-2 py-1 rounded text-xs uppercase font-semibold ${
                            dancer.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {dancer.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4" style={{ width: '150px' }}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/dancers/${dancer.id}`}
                          className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:shadow-lg transition-all duration-200"
                        >
                          Edit
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
      {searchTerm && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          Showing {filteredDancers.length} of {dancers.length} dancers
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
