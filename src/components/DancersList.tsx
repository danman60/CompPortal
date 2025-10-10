'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTableSort } from '@/hooks/useTableSort';
import SortableHeader from '@/components/SortableHeader';
import PullToRefresh from 'react-pull-to-refresh';
import { highlightText } from '@/lib/highlightText';
import HoverPreview from '@/components/HoverPreview';
import { SkeletonCard } from '@/components/Skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function DancersList() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = trpc.dancer.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Force cards view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // md breakpoint
        setViewMode('cards');
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

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
        /* Table View - Completely Rebuilt with Fixed Headers */
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Fixed Header Table */}
          <div className="overflow-x-auto bg-gray-800 border-b border-white/30">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-gray-800">
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
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full table-fixed">
              <tbody>
                {sortedDancers.map((dancer, index) => {
                  const age = dancer.date_of_birth
                    ? new Date().getFullYear() - new Date(dancer.date_of_birth).getFullYear()
                    : null;

                  return (
                  <HoverPreview
                    key={dancer.id}
                    delay={400}
                    trigger={
                  <tr
                    className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                      index % 2 === 0 ? 'bg-black/20' : ''
                    }`}
                  >
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
                      <Link
                        href={`/dashboard/dancers/${dancer.id}`}
                        className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:shadow-lg transition-all duration-200"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                    }
                    content={
                      <div className="space-y-3 min-w-[300px]">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Dancer Details</div>
                          <div className="text-lg font-bold text-white">
                            {dancer.first_name} {dancer.last_name}
                          </div>
                          {dancer.registration_number && (
                            <div className="text-xs text-gray-400 mt-1">
                              Registration: #{dancer.registration_number}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Gender</div>
                            <div className={`text-sm font-semibold ${
                              dancer.gender === 'Male'
                                ? 'text-blue-400'
                                : dancer.gender === 'Female'
                                ? 'text-pink-400'
                                : 'text-gray-400'
                            }`}>
                              {dancer.gender || 'Unknown'}
                            </div>
                          </div>

                          {age && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Age</div>
                              <div className="text-sm font-semibold text-white">
                                {age} years
                              </div>
                            </div>
                          )}
                        </div>

                        {dancer.studios && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Studio</div>
                            <div className="text-sm text-white">
                              {dancer.studios.name}
                            </div>
                          </div>
                        )}

                        {dancer.date_of_birth && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Date of Birth</div>
                            <div className="text-sm text-gray-300">
                              {new Date(dancer.date_of_birth).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        )}

                        {dancer.status && (
                          <div className="pt-3 border-t border-white/10">
                            <div className="text-xs text-gray-400 mb-1">Status</div>
                            <span
                              className={`px-2 py-1 rounded text-xs uppercase font-semibold ${
                                dancer.status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {dancer.status}
                            </span>
                          </div>
                        )}
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
      {searchTerm && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          Showing {filteredDancers.length} of {dancers.length} dancers
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
