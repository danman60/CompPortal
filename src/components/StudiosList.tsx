'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export default function StudiosList() {
  const { data, isLoading } = trpc.studio.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const studios = data?.studios || [];
  const filteredStudios = studios.filter((studio) => {
    if (filter === 'all') return true;
    return studio.status === filter;
  });

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          All ({studios.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition-all ${
            filter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Pending ({studios.filter((s) => s.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg transition-all ${
            filter === 'approved'
              ? 'bg-green-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Approved ({studios.filter((s) => s.status === 'approved').length})
        </button>
      </div>

      {/* Studios Grid */}
      {filteredStudios.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-white mb-2">No studios found</h3>
          <p className="text-gray-400">
            {filter === 'all'
              ? 'No studios registered yet.'
              : `No ${filter} studios found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudios.map((studio) => (
            <div
              key={studio.id}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
            >
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    studio.status === 'approved'
                      ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                      : studio.status === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                  }`}
                >
                  {studio.status?.toUpperCase()}
                </span>
                <div className="text-gray-400 text-xs">#{studio.code}</div>
              </div>

              {/* Studio Name */}
              <h3 className="text-xl font-bold text-white mb-2">{studio.name}</h3>

              {/* Location */}
              <div className="flex items-center gap-2 text-gray-300 text-sm mb-4">
                <span>📍</span>
                <span>
                  {studio.city && studio.province
                    ? `${studio.city}, ${studio.province}`
                    : studio.country || 'Location not set'}
                </span>
              </div>

              {/* Contact Info */}
              {(studio.email || studio.phone) && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  {studio.email && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <span>📧</span>
                      <span className="truncate">{studio.email}</span>
                    </div>
                  )}
                  {studio.phone && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <span>📞</span>
                      <span>{studio.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Created Date */}
              {studio.created_at && (
                <div className="mt-4 text-gray-500 text-xs">
                  Registered: {new Date(studio.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
