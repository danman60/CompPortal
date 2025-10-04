'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';

interface StudiosListProps {
  studioId?: string; // If provided, show edit mode for this studio only (studio director)
}

export default function StudiosList({ studioId }: StudiosListProps) {
  const { data, isLoading } = trpc.studio.getAll.useQuery(undefined, {
    enabled: !studioId, // Only fetch all studios if not locked to one
  });

  // Fetch single studio if studioId is provided (studio director)
  const { data: singleStudioData, isLoading: isSingleLoading } = trpc.studio.getById.useQuery(
    { id: studioId! },
    { enabled: !!studioId }
  );

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    address1: '',
    city: '',
    province: '',
    postal_code: '',
    country: '',
  });

  const updateMutation = trpc.studio.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      alert('Studio information updated successfully!');
    },
    onError: (error) => {
      alert(`Error updating studio: ${error.message}`);
    },
  });

  // Initialize edit data when studio data is loaded
  useEffect(() => {
    if (singleStudioData && studioId) {
      setEditData({
        name: singleStudioData.name || '',
        email: singleStudioData.email || '',
        phone: singleStudioData.phone || '',
        address1: singleStudioData.address1 || '',
        city: singleStudioData.city || '',
        province: singleStudioData.province || '',
        postal_code: singleStudioData.postal_code || '',
        country: singleStudioData.country || '',
      });
    }
  }, [singleStudioData, studioId]);

  // Handle loading states
  if (studioId && isSingleLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-2/3"></div>
      </div>
    );
  }

  if (!studioId && isLoading) {
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

  // Studio Director Mode - Edit own studio
  if (studioId && singleStudioData) {
    const studio = singleStudioData;

    const handleSave = () => {
      updateMutation.mutate({
        id: studioId,
        data: editData,
      });
    };

    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
        {/* Studio Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{studio.name}</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-400/30">
                Studio Code: {studio.code}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  studio.status === 'approved'
                    ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                }`}
              >
                {studio.status?.toUpperCase()}
              </span>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              ✏️ Edit Information
            </button>
          )}
        </div>

        {/* Studio Information */}
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Studio Name</label>
              <div className="text-white">{studio.name || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="text-white">{studio.email || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
              <div className="text-white">{studio.phone || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
              <div className="text-white">{studio.address1 || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">City</label>
              <div className="text-white">{studio.city || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Province/State</label>
              <div className="text-white">{studio.province || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Postal Code</label>
              <div className="text-white">{studio.postal_code || 'Not set'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Country</label>
              <div className="text-white">{studio.country || 'Not set'}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Studio Name *</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <input
                  type="text"
                  value={editData.address1}
                  onChange={(e) => setEditData({ ...editData, address1: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Province/State</label>
                <input
                  type="text"
                  value={editData.province}
                  onChange={(e) => setEditData({ ...editData, province: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={editData.postal_code}
                  onChange={(e) => setEditData({ ...editData, postal_code: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <input
                  type="text"
                  value={editData.country}
                  onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t border-white/10">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {updateMutation.isPending ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Competition Director Mode - View all studios
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
