'use client';

/**
 * Studio Invitations Management Suite
 * Super Admin Only - Comprehensive studio invitation and onboarding tracking
 * Features: Sort by event date, studio name, tenant, invited status, claimed status, onboarding status
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

type SortField = 'name' | 'eventDate' | 'tenant' | 'invited' | 'claimed' | 'onboarding';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'unclaimed' | 'claimed' | 'invited' | 'not-invited' | 'onboarding-complete' | 'onboarding-pending';

export default function StudioInvitationsPage() {
  const [selectedStudios, setSelectedStudios] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Add Studio modal state (SA needs tenant selector)
  const [addStudioModal, setAddStudioModal] = useState<{
    isOpen: boolean;
    tenantId: string;
    studioName: string;
    contactName: string;
    email: string;
    phone: string;
    competitionId: string;
    preApprovedSpaces: string;
    depositAmount: string;
    comments: string;
  } | null>(null);

  const { data, refetch, isLoading} = trpc.studioInvitations.getAllStudios.useQuery();

  // Fetch tenants for SA dropdown
  const { data: tenantsData } = trpc.user.getAllTenants.useQuery();
  const tenants = tenantsData?.tenants || [];

  // Fetch competitions for selected tenant
  const { data: competitionsData } = trpc.competition.getAll.useQuery(
    {},
    { enabled: !!addStudioModal?.tenantId }
  );
  const allCompetitions = competitionsData?.competitions || [];

  // Filter competitions by selected tenant
  const competitions = addStudioModal?.tenantId
    ? allCompetitions.filter(c => c.tenant_id === addStudioModal.tenantId)
    : [];
  const sendInvitationsMutation = trpc.studioInvitations.sendInvitations.useMutation({
    onSuccess: (result) => {
      toast.success(`Sent ${result.sent} invitation(s)`);
      if (result.failed > 0) {
        toast.error(`Failed to send ${result.failed} invitation(s)`);
      }
      setSelectedStudios(new Set());
      refetch();
      setSendingInvites(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setSendingInvites(false);
    },
  });

  // Quick Add Studio mutation
  const createStudioMutation = trpc.reservation.createStudioWithReservation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setAddStudioModal(null);
      refetch(); // Refresh studios list
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filter and sort studios
  const filteredAndSortedStudios = useMemo(() => {
    if (!data?.studios) return [];

    let filtered = data.studios;

    // Apply status filter
    switch (filterStatus) {
      case 'unclaimed':
        filtered = filtered.filter((s) => !s.isClaimed);
        break;
      case 'claimed':
        filtered = filtered.filter((s) => s.isClaimed);
        break;
      case 'invited':
        filtered = filtered.filter((s) => s.wasInvited);
        break;
      case 'not-invited':
        filtered = filtered.filter((s) => !s.wasInvited);
        break;
      case 'onboarding-complete':
        filtered = filtered.filter((s) => s.hasCompletedOnboarding);
        break;
      case 'onboarding-pending':
        filtered = filtered.filter((s) => s.isClaimed && !s.hasCompletedOnboarding);
        break;
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          (s.email?.toLowerCase().includes(query) ?? false) ||
          s.publicCode.toLowerCase().includes(query) ||
          s.tenantName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'eventDate':
          if (!a.earliestEvent && !b.earliestEvent) comparison = 0;
          else if (!a.earliestEvent) comparison = 1;
          else if (!b.earliestEvent) comparison = -1;
          else comparison = a.earliestEvent.getTime() - b.earliestEvent.getTime();
          break;
        case 'tenant':
          comparison = a.tenantName.localeCompare(b.tenantName);
          break;
        case 'invited':
          if (a.invitedAt && b.invitedAt) {
            comparison = new Date(a.invitedAt).getTime() - new Date(b.invitedAt).getTime();
          } else if (a.invitedAt) {
            comparison = -1;
          } else if (b.invitedAt) {
            comparison = 1;
          }
          break;
        case 'claimed':
          comparison = (a.isClaimed ? 1 : 0) - (b.isClaimed ? 1 : 0);
          break;
        case 'onboarding':
          comparison = (a.hasCompletedOnboarding ? 1 : 0) - (b.hasCompletedOnboarding ? 1 : 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data?.studios, filterStatus, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleStudio = (studioId: string) => {
    const newSelected = new Set(selectedStudios);
    if (newSelected.has(studioId)) {
      newSelected.delete(studioId);
    } else {
      newSelected.add(studioId);
    }
    setSelectedStudios(newSelected);
  };

  const handleSelectAllUnclaimed = () => {
    const unclaimedIds = filteredAndSortedStudios
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

  const handleResendInvitation = async (studioId: string, studioName: string) => {
    const confirmed = confirm(`Re-send invitation to "${studioName}"?`);
    if (!confirmed) return;

    setSendingInvites(true);
    await sendInvitationsMutation.mutateAsync({
      studioIds: [studioId],
    });
  };

  // Quick Add Studio handlers
  const handleAddStudio = () => {
    setAddStudioModal({
      isOpen: true,
      tenantId: tenants[0]?.id || '',
      studioName: '',
      contactName: '',
      email: '',
      phone: '',
      competitionId: '',
      preApprovedSpaces: '1',
      depositAmount: '',
      comments: '',
    });
  };

  const confirmAddStudio = () => {
    if (!addStudioModal) return;

    // Validation
    if (!addStudioModal.tenantId) {
      toast.error('Please select a tenant');
      return;
    }
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

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="text-xs text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
    >
      {label}
      {sortField === field && (
        <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="text-white text-center">Loading studios...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Studio Invitations Suite</h1>
              <p className="text-gray-300">Comprehensive studio invitation and onboarding tracking</p>
            </div>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </a>
          </div>

          {/* Stats */}
          {data?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">{data.stats.total}</div>
                <div className="text-xs text-gray-300 mt-1">Total Studios</div>
              </div>
              <div className="bg-orange-500/20 backdrop-blur-md rounded-xl p-4 border border-orange-400/30">
                <div className="text-2xl font-bold text-orange-300">{data.stats.unclaimed}</div>
                <div className="text-xs text-gray-300 mt-1">Unclaimed</div>
              </div>
              <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-4 border border-green-400/30">
                <div className="text-2xl font-bold text-green-300">{data.stats.claimed}</div>
                <div className="text-xs text-gray-300 mt-1">Claimed</div>
              </div>
              <div className="bg-blue-500/20 backdrop-blur-md rounded-xl p-4 border border-blue-400/30">
                <div className="text-2xl font-bold text-blue-300">{data.stats.invited}</div>
                <div className="text-xs text-gray-300 mt-1">Invited</div>
              </div>
              <div className="bg-purple-500/20 backdrop-blur-md rounded-xl p-4 border border-purple-400/30">
                <div className="text-2xl font-bold text-purple-300">{data.stats.onboardingComplete}</div>
                <div className="text-xs text-gray-300 mt-1">Onboarding Done</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Studio Panel */}
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

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, code, or competition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ color: 'white' }}
            >
              <option value="all" style={{ backgroundColor: '#1e293b', color: 'white' }}>All Studios</option>
              <option value="unclaimed" style={{ backgroundColor: '#1e293b', color: 'white' }}>Unclaimed Only</option>
              <option value="claimed" style={{ backgroundColor: '#1e293b', color: 'white' }}>Claimed Only</option>
              <option value="invited" style={{ backgroundColor: '#1e293b', color: 'white' }}>Invited Only</option>
              <option value="not-invited" style={{ backgroundColor: '#1e293b', color: 'white' }}>Not Invited</option>
              <option value="onboarding-complete" style={{ backgroundColor: '#1e293b', color: 'white' }}>Onboarding Complete</option>
              <option value="onboarding-pending" style={{ backgroundColor: '#1e293b', color: 'white' }}>Onboarding Pending</option>
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSelectAllUnclaimed}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-white transition-colors"
              >
                Select All Unclaimed
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-white transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={handleSendInvitations}
                disabled={sendingInvites || selectedStudios.size === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sendingInvites ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
            <span className="text-sm text-gray-400">Sort by:</span>
            <SortButton field="eventDate" label="Event Date" />
            <SortButton field="name" label="Studio Name" />
            <SortButton field="tenant" label="Competition" />
            <SortButton field="invited" label="Invited Date" />
            <SortButton field="claimed" label="Claim Status" />
            <SortButton field="onboarding" label="Onboarding" />
          </div>
        </div>

        {/* Studios List */}
        {filteredAndSortedStudios.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Studios Found</h3>
            <p className="text-gray-300">No studios match your current filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedStudios.map((studio) => (
              <div
                key={studio.id}
                className={`bg-white/10 backdrop-blur-md rounded-xl p-5 border transition-all duration-200 ${
                  selectedStudios.has(studio.id)
                    ? 'border-purple-400 bg-purple-500/10'
                    : 'border-white/20 hover:border-white/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox - only show for unclaimed */}
                  {!studio.isClaimed && (
                    <input
                      type="checkbox"
                      checked={selectedStudios.has(studio.id)}
                      onChange={() => handleToggleStudio(studio.id)}
                      className="w-5 h-5 mt-1 rounded border-gray-300 cursor-pointer"
                    />
                  )}

                  {/* Studio Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white">{studio.name}</h3>
                          <span className="font-mono text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-400/30">
                            {studio.publicCode}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">{studio.email}</div>
                        <div className="text-xs text-gray-400">
                          {studio.tenantName} ({studio.tenantSubdomain}.compsync.net)
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {studio.isClaimed ? (
                            <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-semibold border border-green-400/30">
                              ✓ Claimed
                            </span>
                          ) : (
                            <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs font-semibold border border-orange-400/30">
                              ⚠ Unclaimed
                            </span>
                          )}
                          {studio.wasInvited && (
                            <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-semibold border border-blue-400/30">
                              📧 Invited
                            </span>
                          )}
                          {studio.hasCompletedOnboarding && (
                            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-semibold border border-purple-400/30">
                              ✓ Onboarded
                            </span>
                          )}
                        </div>
                        {studio.invitedAt && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-gray-400">
                              Invited {formatDistanceToNow(new Date(studio.invitedAt), { addSuffix: true })}
                            </span>
                            <button
                              onClick={() => handleResendInvitation(studio.id, studio.name)}
                              disabled={sendingInvites}
                              className="text-xs text-blue-300 hover:text-blue-200 underline disabled:opacity-50"
                            >
                              Re-send invitation
                            </button>
                          </div>
                        )}
                        {studio.ownerName && (
                          <span className="text-xs text-gray-400">Owner: {studio.ownerName}</span>
                        )}
                      </div>
                    </div>

                    {/* Events */}
                    {studio.events.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-400 mb-2">Reservations:</div>
                        {studio.events.map((event: any, idx: number) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-white">{event.name}</div>
                                <div className="text-sm text-gray-400">
                                  {event.startDate && new Date(event.startDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                  {event.endDate && event.startDate !== event.endDate && (
                                    <> - {new Date(event.endDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}</>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-semibold">{event.spaces} entries</div>
                                <div className="text-sm text-gray-400">${event.deposit.toFixed(2)} deposit</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Totals */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
                      <div className="text-sm">
                        <span className="text-gray-400">Total Spaces:</span>{' '}
                        <span className="text-white font-semibold">{studio.totalSpaces}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Total Deposit:</span>{' '}
                        <span className="text-white font-semibold">${studio.totalDeposit.toFixed(2)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Events:</span>{' '}
                        <span className="text-white font-semibold">{studio.reservationCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Showing {filteredAndSortedStudios.length} of {data?.studios.length || 0} studios
        </div>

        {/* Quick Add Studio Modal */}
        {addStudioModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-white mb-2">+ Add Studio with Invitation</h3>
              <p className="text-gray-400 mb-6">
                Create a new studio, assign pre-approved spaces, and send an invitation email
              </p>

              <div className="space-y-6">
                {/* Tenant Selection (SA Only) */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-4">Select Tenant</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Competition Tenant <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={addStudioModal.tenantId}
                      onChange={(e) => {
                        setAddStudioModal({
                          ...addStudioModal,
                          tenantId: e.target.value,
                          competitionId: '', // Reset competition when tenant changes
                        });
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id} className="bg-gray-900 text-white">
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
                        disabled={!addStudioModal.tenantId || competitions.length === 0}
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        <option value="" className="bg-gray-900 text-white">
                          {!addStudioModal.tenantId ? 'Select tenant first' : competitions.length === 0 ? 'No competitions for this tenant' : 'Select a competition'}
                        </option>
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
      </div>
    </div>
  );
}
