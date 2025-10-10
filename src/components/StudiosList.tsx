'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { uploadLogoFile } from '@/lib/storage';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { copyToClipboard } from '@/lib/clipboard';
import { SkeletonCard, SkeletonList } from '@/components/Skeleton';
import { formatDistanceToNow } from 'date-fns';

interface StudiosListProps {
  studioId?: string; // If provided, show edit mode for this studio only (studio director)
}

export default function StudiosList({ studioId }: StudiosListProps) {
  const { data, isLoading, dataUpdatedAt } = trpc.studio.getAll.useQuery(undefined, {
    enabled: !studioId, // Only fetch all studios if not locked to one
  });

  // Fetch single studio if studioId is provided (studio director)
  const { data: singleStudioData, isLoading: isSingleLoading } = trpc.studio.getById.useQuery(
    { id: studioId! },
    { enabled: !!studioId }
  );

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    address1: '',
    city: '',
    province: '',
    postal_code: '',
    country: '',
    logo_url: '',
    website: '',
    // Branding settings
    brand_color: '#8B5CF6', // Default purple
    accent_color: '#EC4899', // Default pink
    tagline: '',
    // Social media
    instagram: '',
    facebook: '',
    tiktok: '',
  });

  const updateMutation = trpc.studio.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Studio information updated successfully!');
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
    },
  });

  // Initialize edit data when studio data is loaded
  useEffect(() => {
    if (singleStudioData && studioId) {
      // Parse JSON fields
      const settings = (singleStudioData.settings as any) || {};
      const socialMedia = (singleStudioData.social_media as any) || {};

      setEditData({
        name: singleStudioData.name || '',
        email: singleStudioData.email || '',
        phone: singleStudioData.phone || '',
        address1: singleStudioData.address1 || '',
        city: singleStudioData.city || '',
        province: singleStudioData.province || '',
        postal_code: singleStudioData.postal_code || '',
        country: singleStudioData.country || '',
        logo_url: singleStudioData.logo_url || '',
        website: singleStudioData.website || '',
        // Branding from settings
        brand_color: settings.brand_color || '#8B5CF6',
        accent_color: settings.accent_color || '#EC4899',
        tagline: settings.tagline || '',
        // Social media
        instagram: socialMedia.instagram || '',
        facebook: socialMedia.facebook || '',
        tiktok: socialMedia.tiktok || '',
      });
    }
  }, [singleStudioData, studioId]);

  // Handle loading states
  if (studioId && isSingleLoading) {
    return <SkeletonList items={1} />;
  }

  if (!studioId && isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Studio Director Mode - Edit own studio
  if (studioId && singleStudioData) {
    const studio = singleStudioData;

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploadingLogo(true);

      try {
        const result = await uploadLogoFile({
          file,
          studioId,
        });

        if (result.success && result.publicUrl) {
          setEditData({ ...editData, logo_url: result.publicUrl });
          toast.success('Logo uploaded successfully!');
        } else {
          toast.error(`Upload failed: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        toast.error(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsUploadingLogo(false);
      }
    };

    const handleSave = () => {
      // Structure data for mutation
      const { brand_color, accent_color, tagline, instagram, facebook, tiktok, ...basicData } = editData;

      updateMutation.mutate({
        id: studioId,
        data: {
          ...basicData,
          settings: {
            brand_color,
            accent_color,
            tagline,
          },
          social_media: {
            instagram,
            facebook,
            tiktok,
          },
        },
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
              {studio.code && (
                <button
                  onClick={() => copyToClipboard(studio.code!, 'Studio code')}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Copy studio code"
                >
                  📋
                </button>
              )}
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
          <div className="space-y-6">
            {/* Logo Display */}
            {studio.logo_url && (
              <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                <img
                  src={studio.logo_url}
                  alt={`${studio.name} logo`}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-white/20"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Studio Logo</label>
                  <div className="text-xs text-gray-500">Displayed on competition materials</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Studio Name</label>
                <div className="text-white">{studio.name || 'Not set'}</div>
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="text-white">
                {studio.email ? (
                  <a href={`mailto:${studio.email}`} className="text-blue-400 hover:underline">
                    {studio.email}
                  </a>
                ) : (
                  'Not set'
                )}
              </div>
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
          </div>
        ) : (
          <div className="space-y-6">
            {/* Logo Upload Section */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <label className="block text-sm font-medium text-gray-300 mb-3">Studio Logo</label>
              <div className="flex items-start gap-4">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  {editData.logo_url ? (
                    <img
                      src={editData.logo_url}
                      alt="Studio logo"
                      className="w-24 h-24 object-cover rounded-lg border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-white/10 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500 text-xs">
                      No Logo
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  <div className="mb-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 file:cursor-pointer disabled:opacity-50"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {isUploadingLogo ? 'Uploading...' : 'JPG, PNG, GIF, or WEBP. Max 5MB.'}
                  </p>
                  {editData.logo_url && (
                    <button
                      onClick={() => setEditData({ ...editData, logo_url: '' })}
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

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

            {/* Branding Customization Section */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">🎨 Branding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                  <input
                    type="url"
                    value={editData.website}
                    onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                    placeholder="https://yourstudio.com"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
                  <input
                    type="text"
                    value={editData.tagline}
                    onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                    placeholder="Your studio motto"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Brand Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editData.brand_color}
                      onChange={(e) => setEditData({ ...editData, brand_color: e.target.value })}
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editData.brand_color}
                      onChange={(e) => setEditData({ ...editData, brand_color: e.target.value })}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editData.accent_color}
                      onChange={(e) => setEditData({ ...editData, accent_color: e.target.value })}
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editData.accent_color}
                      onChange={(e) => setEditData({ ...editData, accent_color: e.target.value })}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Section */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">📱 Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                  <input
                    type="text"
                    value={editData.instagram}
                    onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                    placeholder="@yourstudio"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Facebook</label>
                  <input
                    type="text"
                    value={editData.facebook}
                    onChange={(e) => setEditData({ ...editData, facebook: e.target.value })}
                    placeholder="YourStudioPage"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">TikTok</label>
                  <input
                    type="text"
                    value={editData.tiktok}
                    onChange={(e) => setEditData({ ...editData, tiktok: e.target.value })}
                    placeholder="@yourstudio"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
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
            {studios.length}
          </span>
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            filter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Pending
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            filter === 'pending'
              ? 'bg-white/30 text-white'
              : 'bg-yellow-500 text-black'
          }`}>
            {studios.filter((s) => s.status === 'pending').length}
          </span>
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            filter === 'approved'
              ? 'bg-green-500 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Approved
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            filter === 'approved'
              ? 'bg-white/30 text-white'
              : 'bg-green-500 text-black'
          }`}>
            {studios.filter((s) => s.status === 'approved').length}
          </span>
        </button>
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

      {/* Studios Grid */}
      {filteredStudios.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-white mb-2">No studios found</h3>
          <p className="text-gray-400 mb-6">
            {filter === 'all'
              ? 'Studios that register for your competitions will appear here.'
              : `No ${filter} studios found. Try viewing all studios.`}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all border border-purple-400/30"
            >
              View All Studios
            </button>
          )}
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
                {studio.code && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(studio.code!, 'Studio code');
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-xs"
                    title="Copy studio code"
                  >
                    📋 {studio.code}
                  </button>
                )}
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
                      <a href={`mailto:${studio.email}`} className="text-blue-400 hover:underline truncate">
                        {studio.email}
                      </a>
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
