'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export default function DancersList() {
  const { data, isLoading } = trpc.dancer.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const dancers = data?.dancers || [];
  const filteredDancers = dancers.filter((dancer) => {
    const matchesGender = filter === 'all' || dancer.gender?.toLowerCase() === filter;
    const matchesSearch =
      searchTerm === '' ||
      dancer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dancer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${dancer.first_name} ${dancer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGender && matchesSearch;
  });

  return (
    <div>
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search dancers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All ({dancers.length})
          </button>
          <button
            onClick={() => setFilter('male')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'male'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Male ({dancers.filter((d) => d.gender === 'Male').length})
          </button>
          <button
            onClick={() => setFilter('female')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'female'
                ? 'bg-pink-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Female ({dancers.filter((d) => d.gender === 'Female').length})
          </button>
        </div>
      </div>

      {/* Dancers Grid */}
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
      ) : (
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
                {dancer.first_name} {dancer.last_name}
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
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {searchTerm && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          Showing {filteredDancers.length} of {dancers.length} dancers
        </div>
      )}
    </div>
  );
}
