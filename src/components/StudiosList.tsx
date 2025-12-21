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
  isCompetitionDirector?: boolean; // If true, show Add Studio with Reservation button
}

export default function StudiosList({ studioId, isCompetitionDirector = false }: StudiosListProps) {
  const { data, isLoading, dataUpdatedAt } = trpc.studio.getAll.useQuery(undefined, {
    enabled: !studioId, // Only fetch all studios if not locked to one
  });

  // Fetch invitation data for CD/SA (only if viewing all studios)
  const { data: invitationData } = trpc.studioInvitations.getStudiosForCD.useQuery(undefined, {
    enabled: isCompetitionDirector && !studioId,
  });

  // Fetch competitions for CD dropdown (only if CD and no locked studio)
  const { data: competitionsData } = trpc.competition.getAll.useQuery({}, {
    enabled: isCompetitionDirector && !studioId,
  });
  const competitions = competitionsData?.competitions || [];

  // Fetch single studio if studioId is provided (studio director)
  const { data: singleStudioData, isLoading: isSingleLoading } = trpc.studio.getById.useQuery(
    { id: studioId! },
    { enabled: !!studioId }
  );

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'unclaimed' | 'claimed' | 'invited'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'eventDate'>('name'); // Default to alphabetical
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [expandedStudioId, setExpandedStudioId] = useState<string | null>(null);
  const [selectedStudios, setSelectedStudios] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    studioId: string;
    studioName: string;
    hasActiveReservations: boolean;
    reservationCount: number;
    entryCount: number;
    confirmText: string;
  } | null>(null);
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

  // Add Studio with Reservation modal state (CD feature)
  const [addStudioModal, setAddStudioModal] = useState<{
    isOpen: boolean;
    studioName: string;
    contactName: string;
    email: string;
    phone: string;
    competitionId: string;
    preApprovedSpaces: string;
    depositAmount: string;
    comments: string;
  } | null>(null);

  const updateMutation = trpc.studio.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Studio information updated successfully!');
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
    },
  });

  // Add Studio with Reservation mutation (CD feature)
  const createStudioMutation = trpc.reservation.createStudioWithReservation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setAddStudioModal(null);
      // Refetch studios list
      window.location.reload(); // Simple refresh for now
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
    },
  });

  // Delete Studio mutation (CD feature)
  const deleteStudioMutation = trpc.studio.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.message}${data.spacesRefunded > 0 ? ` (${data.spacesRefunded} spaces refunded)` : ''}`);
      setDeleteConfirmModal(null);
      // Refetch studios list
      window.location.reload(); // Simple refresh for now
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
    },
  });

  // Send Invitations mutation (CD feature)
  const sendInvitationsMutation = trpc.studioInvitations.sendInvitations.useMutation({
    onSuccess: (result) => {
      toast.success(`Sent ${result.sent} invitation(s)`);
      if (result.failed > 0) {
        toast.error(`Failed to send ${result.failed} invitation(s)`);
      }
      setSelectedStudios(new Set());
      setSendingInvites(false);
      // Refetch studios list
      window.location.reload();
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
      setSendingInvites(false);
    },
  });

  // CD Feature: Add Studio handler
  const handleAddStudio = () => {
    setAddStudioModal({
      isOpen: true,
      studioName: '',
      contactName: '',
      email: '',
      phone: '',
      competitionId: competitions[0]?.id || '',
      preApprovedSpaces: '1',
      depositAmount: '',
      comments: '',
    });
  };

  const confirmAddStudio = () => {
    if (!addStudioModal) return;

    // Validation
    if (!addStudioModal.studioName.trim()) {
      toast.error('Studio name is required');
      return;
    }
    if (!addStudioModal.contactName.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (!addStudioModal.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!addStudioModal.competitionId) {
      toast.error('Please select a competition');
      return;
    }
    const spaces = parseInt(addStudioModal.preApprovedSpaces);
    if (isNaN(spaces) || spaces < 1) {
      toast.error('Pre-approved spaces must be at least 1');
      return;
    }

    const deposit = addStudioModal.depositAmount
      ? parseFloat(addStudioModal.depositAmount)
      : undefined;
    if (deposit !== undefined && (isNaN(deposit) || deposit < 0)) {
      toast.error('Invalid deposit amount');
      return;
    }

    createStudioMutation.mutate({
      studioName: addStudioModal.studioName,
      contactName: addStudioModal.contactName,
      email: addStudioModal.email,
      phone: addStudioModal.phone || undefined,
      competitionId: addStudioModal.competitionId,
      preApprovedSpaces: spaces,
      depositAmount: deposit,
      comments: addStudioModal.comments || undefined,
    });
  };

  // CD Feature: Delete Studio handler
  const handleDeleteStudio = (studio: any) => {
    const hasActiveReservations = studio._count?.reservations > 0;
    setDeleteConfirmModal({
      isOpen: true,
      studioId: studio.id,
      studioName: studio.name,
      hasActiveReservations,
      reservationCount: studio._count?.reservations || 0,
      entryCount: studio._count?.competition_entries || 0,
      confirmText: '',
    });
  };

  const confirmDeleteStudio = () => {
    if (!deleteConfirmModal) return;
    if (deleteConfirmModal.confirmText !== deleteConfirmModal.studioName) {
      toast.error('Studio name does not match');
      return;
    }
    deleteStudioMutation.mutate({ id: deleteConfirmModal.studioId });
  };

  // CD Feature: Bulk invitation sending handlers
  const handleToggleStudio = (studioIdToToggle: string) => {
    const newSelected = new Set(selectedStudios);
    if (newSelected.has(studioIdToToggle)) {
      newSelected.delete(studioIdToToggle);
    } else {
      newSelected.add(studioIdToToggle);
    }
    setSelectedStudios(newSelected);
  };

  const handleSelectAllUnclaimed = () => {
    // Get unclaimed studios from invitation data
    if (!invitationData?.studios) return;
    const unclaimedIds = invitationData.studios
      .filter((s) => !s.isClaimed)
      .map((s) => s.id);
    setSelectedStudios(new Set(unclaimedIds));
  };

  const handleDeselectAll = () => {
    setSelectedStudios(new Set());
  };

  const handleSendInvitations = async () => {
    if (selectedStudios.size === 0) {
      toast.error('Please select at least one studio');
      return;
    }

    const confirmed = confirm(
      `Send invitations to ${selectedStudios.size} studio(s)?\n\nThis will email them with their claim link.`
    );
    if (!confirmed) return;

    setSendingInvites(true);
    await sendInvitationsMutation.mutateAsync({
      studioIds: Array.from(selectedStudios),
    });
  };

  const handleResendInvitation = async (studioIdToResend: string, studioName: string) => {
    const confirmed = confirm(`Re-send invitation to "${studioName}"?`);
    if (!confirmed) return;

    setSendingInvites(true);
    await sendInvitationsMutation.mutateAsync({
      studioIds: [studioIdToResend],
    });
  };

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

  // Merge invitation data with studio data
  const studiosWithInvitations = studios.map((studio) => {
    const invitationInfo = invitationData?.studios.find((inv) => inv.id === studio.id);
    return {
      ...studio,
      // Invitation data
      isClaimed: invitationInfo?.isClaimed || false,
      wasInvited: invitationInfo?.wasInvited || false,
      invitedAt: invitationInfo?.invitedAt || null,
      hasCompletedOnboarding: invitationInfo?.hasCompletedOnboarding || false,
      ownerName: invitationInfo?.ownerName || null,
      earliestEvent: invitationInfo?.earliestEvent || null,
    };
  });

  // Filter studios
  const filteredStudios = studiosWithInvitations.filter((studio) => {
    if (filter === 'all') return true;
    if (filter === 'pending' || filter === 'approved') return studio.status === filter;
    if (filter === 'unclaimed') return !studio.isClaimed;
    if (filter === 'claimed') return studio.isClaimed;
    if (filter === 'invited') return studio.wasInvited;
    return true;
  });

  // Sort studios
  const sortedStudios = [...filteredStudios].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'eventDate') {
      if (!a.earliestEvent && !b.earliestEvent) return 0;
      if (!a.earliestEvent) return 1;
      if (!b.earliestEvent) return -1;
      return a.earliestEvent.getTime() - b.earliestEvent.getTime();
    }
    return 0;
  });

  return (
    <div>
      {/* Add Studio Section - CD/SA only */}
      {isCompetitionDirector && !studioId && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Quick Add Studio</h2>
                <p className="text-white/60">
                  Create a new studio with pre-approved reservation and send claim invitation
                </p>
              </div>
              <button
                onClick={handleAddStudio}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
              >
                <span>+</span>
                <span>Add Studio with Invitation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Sort Controls - CD feature */}
      {isCompetitionDirector && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-6">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
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
                {studiosWithInvitations.length}
              </span>
            </button>
            <button
              onClick={() => setFilter('unclaimed')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                filter === 'unclaimed'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Unclaimed
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === 'unclaimed'
                  ? 'bg-white/30 text-white'
                  : 'bg-orange-500 text-black'
              }`}>
                {studiosWithInvitations.filter((s) => !s.isClaimed).length}
              </span>
            </button>
            <button
              onClick={() => setFilter('invited')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                filter === 'invited'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Invited
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === 'invited'
                  ? 'bg-white/30 text-white'
                  : 'bg-blue-500 text-white'
              }`}>
                {studiosWithInvitations.filter((s) => s.wasInvited).length}
              </span>
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
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
                {studiosWithInvitations.filter((s) => s.status === 'approved').length}
              </span>
            </button>
          </div>

          {/* Sort & Bulk Actions */}
          <div className="flex flex-wrap gap-2 items-center pt-4 border-t border-white/10">
            <span className="text-sm text-gray-400 mr-2">Sort:</span>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 rounded text-sm transition-all ${
                sortBy === 'name'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Studio Name {sortBy === 'name' && '↑'}
            </button>
            <button
              onClick={() => setSortBy('eventDate')}
              className={`px-3 py-1 rounded text-sm transition-all ${
                sortBy === 'eventDate'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Event Date {sortBy === 'eventDate' && '↑'}
            </button>

            <div className="flex-1"></div>

            {/* Bulk Actions */}
            <button
              onClick={handleSelectAllUnclaimed}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded text-sm text-white transition-colors"
            >
              Select All Unclaimed
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded text-sm text-white transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={handleSendInvitations}
              disabled={sendingInvites || selectedStudios.size === 0}
              className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sendingInvites ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>📧</span>
                  <span>Send ({selectedStudios.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Simple Filter Tabs for non-CD */}
      {!isCompetitionDirector && (
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
      )}

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
      {sortedStudios.length === 0 ? (
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
          {sortedStudios.map((studio) => {
            const isExpanded = expandedStudioId === studio.id;
            const isSelected = selectedStudios.has(studio.id);

            return (
              <div
                key={studio.id}
                className={`bg-white/10 backdrop-blur-md rounded-xl border p-6 hover:bg-white/20 transition-all ${
                  isSelected ? 'border-purple-400 bg-purple-500/10' : 'border-white/20'
                }`}
              >
                {/* Header with Checkbox (CD only for unclaimed) and Studio Code */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox for unclaimed studios (CD only) */}
                    {isCompetitionDirector && !studio.isClaimed && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleStudio(studio.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 mt-1 rounded border-gray-300 cursor-pointer"
                      />
                    )}
                    {/* Invitation Status Badges (CD only) */}
                    {isCompetitionDirector && (
                      <div className="flex flex-col gap-1">
                        {studio.isClaimed ? (
                          <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs font-semibold border border-green-400/30 whitespace-nowrap">
                            ✓ Claimed
                          </span>
                        ) : (
                          <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs font-semibold border border-orange-400/30 whitespace-nowrap">
                            ⚠ Unclaimed
                          </span>
                        )}
                        {studio.wasInvited && (
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs font-semibold border border-blue-400/30 whitespace-nowrap">
                            📧 Invited
                          </span>
                        )}
                        {studio.hasCompletedOnboarding && (
                          <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs font-semibold border border-purple-400/30 whitespace-nowrap">
                            ✓ Onboarded
                          </span>
                        )}
                      </div>
                    )}
                  </div>
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
                <h3
                  className="text-xl font-bold text-white mb-2 cursor-pointer"
                  onClick={() => setExpandedStudioId(isExpanded ? null : studio.id)}
                >
                  {studio.name}
                </h3>

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
                        <a
                          href={`mailto:${studio.email}`}
                          className="text-blue-400 hover:underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
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

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    {studio.address1 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Address</label>
                        <div className="text-white text-sm">{studio.address1}</div>
                      </div>
                    )}
                    {studio.postal_code && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Postal Code</label>
                        <div className="text-white text-sm">{studio.postal_code}</div>
                      </div>
                    )}
                    {studio.website && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Website</label>
                        <a
                          href={studio.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {studio.website}
                        </a>
                      </div>
                    )}
                    {studio.created_at && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Registered</label>
                        <div className="text-white text-sm">
                          {new Date(studio.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {/* CD Feature: Invitation & Actions */}
                    {isCompetitionDirector && (
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        {/* Invitation Info */}
                        {studio.invitedAt && (
                          <div className="text-xs text-gray-400">
                            Invited {formatDistanceToNow(new Date(studio.invitedAt), { addSuffix: true })}
                          </div>
                        )}
                        {studio.ownerName && (
                          <div className="text-xs text-gray-400">
                            Owner: {studio.ownerName}
                          </div>
                        )}
                        {/* Re-send Invitation Button (Mobile-Friendly) */}
                        {!studio.isClaimed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResendInvitation(studio.id, studio.name);
                            }}
                            disabled={sendingInvites}
                            className="w-full min-h-[44px] px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all border border-blue-400/30 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            📧 {studio.wasInvited ? 'Re-send' : 'Send'} Invitation
                          </button>
                        )}
                        {/* Delete Studio Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudio(studio);
                          }}
                          className="w-full min-h-[44px] px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all border border-red-400/30 text-sm font-medium"
                        >
                          Delete Studio
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Click indicator */}
                <div className="mt-4 text-center text-xs text-gray-500">
                  {isExpanded ? '▲ Click to collapse' : '▼ Click for details'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Studio with Reservation Modal (CD Feature) */}
      {addStudioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-2">+ Add Studio with Invitation</h3>
            <p className="text-gray-400 mb-6">
              Create a new studio, assign pre-approved spaces, and send an invitation email
            </p>

            <div className="space-y-6">
              {/* Studio Information Section */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Studio Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Studio Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={addStudioModal.studioName}
                      onChange={(e) =>
                        setAddStudioModal({
                          ...addStudioModal,
                          studioName: e.target.value,
                        })
                      }
                      placeholder="ABC Dance Studio"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contact Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={addStudioModal.contactName}
                      onChange={(e) =>
                        setAddStudioModal({
                          ...addStudioModal,
                          contactName: e.target.value,
                        })
                      }
                      placeholder="Jane Smith"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={addStudioModal.email}
                      onChange={(e) =>
                        setAddStudioModal({
                          ...addStudioModal,
                          email: e.target.value,
                        })
                      }
                      placeholder="contact@studio.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={addStudioModal.phone}
                      onChange={(e) =>
                        setAddStudioModal({
                          ...addStudioModal,
                          phone: e.target.value,
                        })
                      }
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Reservation Details Section */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Reservation Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Competition <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={addStudioModal.competitionId}
                      onChange={(e) =>
                        setAddStudioModal({
                          ...addStudioModal,
                          competitionId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {competitions.map((comp) => (
                        <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                          {comp.name} ({comp.year})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pre-Approved Spaces <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={addStudioModal.preApprovedSpaces}
                      onChange={(e) =>
                        setAddStudioModal({
                          ...addStudioModal,
                          preApprovedSpaces: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Deposit Amount <span className="text-gray-500">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={addStudioModal.depositAmount}
                        onChange={(e) =>
                          setAddStudioModal({
                            ...addStudioModal,
                            depositAmount: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Invitation Comments Section */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Invitation Message</h4>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Comments <span className="text-gray-500">(included in invitation email)</span>
                </label>
                <textarea
                  value={addStudioModal.comments}
                  onChange={(e) =>
                    setAddStudioModal({
                      ...addStudioModal,
                      comments: e.target.value,
                    })
                  }
                  placeholder="Optional message to include in the invitation email..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => setAddStudioModal(null)}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddStudio}
                disabled={createStudioMutation.isPending}
                className="flex-1 min-h-[44px] px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-purple-500/50 disabled:to-pink-500/50 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {createStudioMutation.isPending ? '⚙️ Creating...' : '✅ Create Studio & Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Studio Confirmation Modal (CD Feature) */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-2">⚠️ Permanent Studio Deletion</h3>
            <p className="text-gray-400 mb-6">
              This will <span className="text-red-400 font-semibold">permanently delete</span> <span className="text-white font-semibold">{deleteConfirmModal.studioName}</span> and all associated data.
            </p>

            {/* Warning if has active data */}
            {(deleteConfirmModal.hasActiveReservations || deleteConfirmModal.entryCount > 0) && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 text-xl">⚠</span>
                  <div>
                    <p className="text-yellow-400 font-semibold mb-2">This studio has active data that will be deleted:</p>
                    <ul className="text-yellow-300 text-sm space-y-1">
                      {deleteConfirmModal.reservationCount > 0 && (
                        <li>{deleteConfirmModal.reservationCount} reservation(s) - spaces will be refunded</li>
                      )}
                      {deleteConfirmModal.entryCount > 0 && (
                        <li>{deleteConfirmModal.entryCount} competition entry(ies)</li>
                      )}
                      <li>All dancers and their data</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-xl">🚨</span>
                <div className="text-red-300 text-sm">
                  <p className="font-semibold mb-1">This is a HARD DELETE:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Studio permanently removed from database</li>
                    <li>All dancers deleted</li>
                    <li>All competition entries deleted</li>
                    <li>All reservations deleted</li>
                    <li>Approved spaces refunded to competition</li>
                    <li className="font-semibold">THIS CANNOT BE UNDONE</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type the studio name to confirm: <span className="text-white font-mono">{deleteConfirmModal.studioName}</span>
              </label>
              <input
                type="text"
                value={deleteConfirmModal.confirmText}
                onChange={(e) =>
                  setDeleteConfirmModal({
                    ...deleteConfirmModal,
                    confirmText: e.target.value,
                  })
                }
                placeholder="Type studio name here"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteStudio}
                disabled={deleteStudioMutation.isPending || deleteConfirmModal.confirmText !== deleteConfirmModal.studioName}
                className="flex-1 min-h-[44px] px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-500/50 disabled:to-red-600/50 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteStudioMutation.isPending ? 'Deleting...' : 'Permanently Delete Studio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
