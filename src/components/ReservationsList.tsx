'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ManualReservationModal from './ManualReservationModal';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { SkeletonList } from '@/components/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import PullToRefresh from 'react-pull-to-refresh';
import { hapticMedium } from '@/lib/haptics';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface ReservationsListProps {
  isStudioDirector?: boolean; // If true, hide capacity/approve/reject UI
}

export default function ReservationsList({ isStudioDirector = false }: ReservationsListProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, dataUpdatedAt, refetch } = trpc.reservation.getAll.useQuery();
  const { data: studiosData } = trpc.studio.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalData, setRejectModalData] = useState<{ id: string; studioName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isManualReservationModalOpen, setIsManualReservationModalOpen] = useState(false);
  const [reduceModalData, setReduceModalData] = useState<{
    id: string;
    studioName: string;
    currentCapacity: number;
    routineCount?: number;
    impactedRoutines?: number;
    warning?: string;
  } | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(0);

  // Pull-to-refresh handler with haptic feedback
  const handleRefresh = async () => {
    hapticMedium();
    await refetch();
  };

  // Approval mutation with optimistic updates
  const approveMutation = trpc.reservation.approve.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.reservation.getAll.cancel();

      // Snapshot previous value
      const previousData = utils.reservation.getAll.getData();

      // Optimistically update reservation status
      utils.reservation.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          reservations: old.reservations.map((reservation) => {
            if (reservation.id !== variables.id) return reservation;

            return {
              ...reservation,
              status: 'approved' as const,
              spaces_confirmed: variables.spacesConfirmed ?? null,
              approved_at: new Date().toISOString() as any,
            };
          }),
        };
      });

      // Return context with snapshot for potential rollback
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousData) {
        utils.reservation.getAll.setData(undefined, context.previousData);
      }
      toast.error(getFriendlyErrorMessage(error.message));
      setProcessingId(null);
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      utils.reservation.getAll.invalidate();
      setProcessingId(null);
      toast.success('Reservation approved successfully');
    },
  });

  // Rejection mutation with optimistic updates
  const rejectMutation = trpc.reservation.reject.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.reservation.getAll.cancel();

      // Snapshot previous value
      const previousData = utils.reservation.getAll.getData();

      // Optimistically update reservation status
      utils.reservation.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          reservations: old.reservations.map((reservation) => {
            if (reservation.id !== variables.id) return reservation;

            return {
              ...reservation,
              status: 'rejected' as const,
              internal_notes: variables.reason || reservation.internal_notes,
            };
          }),
        };
      });

      // Return context with snapshot for potential rollback
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousData) {
        utils.reservation.getAll.setData(undefined, context.previousData);
      }
      toast.error(getFriendlyErrorMessage(error.message));
      setProcessingId(null);
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      utils.reservation.getAll.invalidate();
      setProcessingId(null);
      toast.success('Reservation rejected');
    },
  });

  // Reduce capacity mutation
  const reduceCapacityMutation = trpc.reservation.reduceCapacity.useMutation({
    onSuccess: (data) => {
      utils.reservation.getAll.invalidate();
      setProcessingId(null);
      setReduceModalData(null);
      setNewCapacity(0);
      toast.success(`Capacity reduced successfully. ${data.impact}`);
    },
    onError: (error) => {
      // Try to parse warning JSON
      try {
        const warningData = JSON.parse(error.message);
        if (warningData.requiresConfirmation) {
          // Show warning modal with parsed data
          setReduceModalData({
            ...reduceModalData!,
            routineCount: warningData.existingRoutines,
            impactedRoutines: warningData.impactedRoutines,
            warning: warningData.warning,
          });
          return;
        }
      } catch {
        // Not a JSON warning, show regular error
        toast.error(getFriendlyErrorMessage(error.message));
      }
      setProcessingId(null);
    },
  });

  const handleApprove = (reservationId: string, spacesRequested: number) => {
    const spacesConfirmed = prompt(
      `Approve this reservation.\n\nRoutines Requested: ${spacesRequested}\n\nHow many routines to allocate?`,
      spacesRequested.toString()
    );

    if (!spacesConfirmed) return;

    const confirmed = parseInt(spacesConfirmed, 10);
    if (isNaN(confirmed) || confirmed < 1 || confirmed > spacesRequested) {
      alert('Invalid number of routines. Must be between 1 and routines requested.');
      return;
    }

    setProcessingId(reservationId);
    approveMutation.mutate({
      id: reservationId,
      spacesConfirmed: confirmed,
    });
  };

  const handleReject = (reservationId: string, studioName: string) => {
    setRejectModalData({ id: reservationId, studioName });
    setRejectionReason('');
  };

  const confirmReject = () => {
    if (!rejectModalData) return;

    setProcessingId(rejectModalData.id);
    rejectMutation.mutate({
      id: rejectModalData.id,
      reason: rejectionReason || undefined,
    });
    setRejectModalData(null);
    setRejectionReason('');
  };

  // Keyboard shortcuts for rejection modal
  useEffect(() => {
    if (!rejectModalData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRejectModalData(null);
        setRejectionReason('');
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        confirmReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectModalData, rejectionReason]);

  const handleReduceCapacity = (
    reservationId: string,
    studioName: string,
    currentCapacity: number,
    routineCount: number
  ) => {
    setReduceModalData({
      id: reservationId,
      studioName,
      currentCapacity,
      routineCount,
    });
    setNewCapacity(currentCapacity);
  };

  const confirmReduceCapacity = () => {
    if (!reduceModalData || newCapacity < 0) return;

    setProcessingId(reduceModalData.id);
    reduceCapacityMutation.mutate({
      id: reduceModalData.id,
      newCapacity,
      confirmed: !!reduceModalData.warning, // Confirm if we've seen the warning
    });
  };

  // Keyboard shortcuts for reduce capacity modal
  useEffect(() => {
    if (!reduceModalData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReduceModalData(null);
        setNewCapacity(0);
        setProcessingId(null);
      }
      if (e.key === 'Enter' && e.ctrlKey && newCapacity >= 0 && newCapacity < reduceModalData.currentCapacity) {
        confirmReduceCapacity();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reduceModalData, newCapacity]);

  if (isLoading) {
    return <SkeletonList items={3} />;
  }

  const reservations = data?.reservations || [];
  const competitions = data?.competitions || [];

  // Filter reservations
  const filteredReservations = reservations.filter((reservation) => {
    const matchesStatus = filter === 'all' || reservation.status === filter;
    const matchesCompetition = selectedCompetition === 'all' || reservation.competition_id === selectedCompetition;
    return matchesStatus && matchesCompetition;
  });

  // Calculate capacity percentage
  const getCapacityPercentage = (requested: number, confirmed: number) => {
    if (requested === 0) return 0;
    return Math.round((confirmed / requested) * 100);
  };

  // Get capacity color based on percentage
  const getCapacityColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div>
      {/* Header with Create Button (Studio Directors Only - Issue #18) */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Reservations</h2>
          <p className="text-gray-400 mt-1">
            {isStudioDirector ? 'Manage your competition reservations' : 'Approve and manage studio reservation requests'}
          </p>
        </div>
        {isStudioDirector && (
          <Link
            href="/dashboard/reservations/new"
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            + Create Reservation
          </Link>
        )}
        {/* Manual Reservation Button (Competition Directors Only - Issue #17) */}
        {!isStudioDirector && (
          <button
            onClick={() => setIsManualReservationModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-medium"
          >
            📋 Manual Reservation
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Competition Filter */}
        <div className="flex-1">
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all" className="bg-gray-900 text-white">All Competitions</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                {comp.name} ({comp.year}){!isStudioDirector && ` - ${comp.available_reservation_tokens || 0}/${comp.total_reservation_tokens || 600} tokens`}
              </option>
            ))}
          </select>

          {/* Token Summary for Selected Competition - Competition Directors Only */}
          {!isStudioDirector && selectedCompetition !== 'all' && (() => {
            const selectedComp = competitions.find(c => c.id === selectedCompetition);
            if (!selectedComp) return null;

            const tokensUsed = (selectedComp.total_reservation_tokens || 600) - (selectedComp.available_reservation_tokens || 600);
            const tokensPercentage = Math.round((tokensUsed / (selectedComp.total_reservation_tokens || 600)) * 100);

            return (
              <div className="mt-2 p-3 bg-black/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Reservation Tokens</span>
                  {selectedComp.tokens_override_enabled && (
                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Override Enabled</span>
                  )}
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Used:</span>
                  <span className="text-white font-semibold">{tokensUsed}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Available:</span>
                  <span className="text-green-400 font-semibold">{selectedComp.available_reservation_tokens || 0}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      tokensPercentage >= 90
                        ? 'bg-red-500'
                        : tokensPercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${tokensPercentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`min-h-[44px] px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
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
              {reservations.length}
            </span>
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`min-h-[44px] px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
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
              {reservations.filter((r) => r.status === 'pending').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`min-h-[44px] px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
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
              {reservations.filter((r) => r.status === 'approved').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`min-h-[44px] px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              filter === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Rejected
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filter === 'rejected'
                ? 'bg-white/30 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {reservations.filter((r) => r.status === 'rejected').length}
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

      {/* Reservations Grid */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">No reservations found</h3>
          <p className="text-gray-400 mb-6">
            {filter === 'all'
              ? isStudioDirector
                ? 'Start by creating a reservation for an upcoming competition.'
                : 'Reservations from studios will appear here once submitted.'
              : `No ${filter} reservations found. Try adjusting your filters.`}
          </p>
          {isStudioDirector && filter === 'all' ? (
            <Link
              href="/dashboard/reservations/new"
              className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              + Create Reservation
            </Link>
          ) : filter !== 'all' ? (
            <button
              onClick={() => setFilter('all')}
              className="min-h-[44px] px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all border border-purple-400/30"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => {
            const capacityPercentage = getCapacityPercentage(
              reservation.spaces_requested,
              reservation.spaces_confirmed || 0
            );

            return (
              <div
                key={reservation.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left: Studio & Competition Info */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {reservation.competitions?.name || 'Unknown Competition'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {reservation.studios?.name || 'Unknown Studio'}
                        </p>
                      </div>
                      <StatusBadge status={(reservation.status || 'pending') as any} />
                    </div>

                    {/* Agent Info - Competition Directors Only */}
                    {!isStudioDirector && reservation.agent_first_name && (
                      <div className="space-y-2 pt-4 border-t border-white/10">
                        <div className="text-sm text-gray-400">
                          <strong className="text-white">Agent:</strong>{' '}
                          {reservation.agent_first_name} {reservation.agent_last_name}
                        </div>
                        {reservation.agent_email && (
                          <div className="text-sm text-gray-400">
                            📧 <a href={`mailto:${reservation.agent_email}`} className="text-blue-400 hover:underline">
                              {reservation.agent_email}
                            </a>
                          </div>
                        )}
                        {reservation.agent_phone && (
                          <div className="text-sm text-gray-400">
                            📞 {reservation.agent_phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Middle: Capacity Tracking (Competition Directors Only) */}
                  {!isStudioDirector && (
                    <div className="flex flex-col justify-center">
                      <div className="text-center mb-4">
                        <div className="text-sm text-gray-400 mb-2">Capacity</div>
                        <div className={`text-4xl font-bold ${getCapacityColor(capacityPercentage)}`}>
                          {capacityPercentage}%
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Routines Requested:</span>
                          <span className="text-white font-semibold">{reservation.spaces_requested}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Routines Allocated:</span>
                          <span className="text-green-400 font-semibold">
                            {reservation.spaces_confirmed || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Remaining:</span>
                          <span className="text-yellow-400 font-semibold">
                            {reservation.spaces_requested - (reservation.spaces_confirmed || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              capacityPercentage === 100
                                ? 'bg-green-500'
                                : capacityPercentage >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${capacityPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Middle: Simple Summary (Studio Directors Only) */}
                  {isStudioDirector && (
                    <div className="flex flex-col justify-center">
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-2">Request Summary</div>
                        <div className="text-2xl font-bold text-white mb-1">
                          {reservation.spaces_requested} {reservation.spaces_requested === 1 ? 'routine' : 'routines'}
                        </div>
                        <div className="text-sm text-gray-400">requested</div>
                      </div>
                    </div>
                  )}

                  {/* Right: Dates & Payment */}
                  <div className="space-y-3">
                    {reservation.requested_at && (
                      <div className="text-sm">
                        <span className="text-gray-400">Requested:</span>
                        <div className="text-white">
                          {new Date(reservation.requested_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    )}

                    {reservation.approved_at && (
                      <div className="text-sm">
                        <span className="text-gray-400">Approved:</span>
                        <div className="text-green-400">
                          {new Date(reservation.approved_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    )}

                    {/* Payment status hidden for Studio Directors */}
                    {!isStudioDirector && reservation.payment_status && (
                      <div className="pt-3 border-t border-white/10">
                        <div className="text-sm text-gray-400 mb-1">Payment Status</div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            reservation.payment_status === 'paid'
                              ? 'bg-green-500/20 text-green-400'
                              : reservation.payment_status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {reservation.payment_status.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {!isStudioDirector && (reservation.deposit_amount || reservation.total_amount) && (
                      <div className="pt-3 border-t border-white/10 space-y-1">
                        {reservation.deposit_amount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Deposit:</span>
                            <span className="text-white">
                              ${reservation.deposit_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {reservation.total_amount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-white font-semibold">
                              ${reservation.total_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Consents */}
                    {(reservation.age_of_consent || reservation.waiver_consent || reservation.media_consent) && (
                      <div className="pt-3 border-t border-white/10">
                        <div className="text-sm text-gray-400 mb-2">Consents</div>
                        <div className="space-y-1 text-xs">
                          {reservation.age_of_consent && (
                            <div className="text-green-400">✓ Age of Consent</div>
                          )}
                          {reservation.waiver_consent && (
                            <div className="text-green-400">✓ Waiver Signed</div>
                          )}
                          {reservation.media_consent && (
                            <div className="text-green-400">✓ Media Release</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {(reservation.public_notes || reservation.internal_notes) && (
                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    {reservation.public_notes && (
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Public Notes</div>
                        <div className="text-sm text-gray-300 bg-black/20 p-3 rounded-lg">
                          {reservation.public_notes}
                        </div>
                      </div>
                    )}
                    {reservation.internal_notes && (
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Internal Notes</div>
                        <div className="text-sm text-gray-300 bg-black/20 p-3 rounded-lg">
                          {reservation.internal_notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons (Competition Director Only) */}
                {!isStudioDirector && reservation.status === 'pending' && (
                  <div className="mt-6 pt-6 border-t border-white/10 flex gap-4">
                    <button
                      onClick={() => handleApprove(reservation.id, reservation.spaces_requested)}
                      disabled={processingId === reservation.id}
                      className="flex-1 min-h-[44px] bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {processingId === reservation.id && approveMutation.isPending
                        ? '⚙️ Approving...'
                        : '✅ Approve Reservation'}
                    </button>
                    <button
                      onClick={() => handleReject(reservation.id, reservation.studios?.name || 'studio')}
                      disabled={processingId === reservation.id}
                      className="flex-1 min-h-[44px] bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {processingId === reservation.id && rejectMutation.isPending
                        ? '⚙️ Rejecting...'
                        : '❌ Reject Reservation'}
                    </button>
                  </div>
                )}

                {/* Status Badge for Studio Directors */}
                {isStudioDirector && reservation.status === 'pending' && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-center w-full">
                        ⏳ Pending Approval
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Reason for Studio Directors */}
                {isStudioDirector && reservation.status === 'rejected' && reservation.internal_notes && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">❌</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-red-400 mb-2">
                            Reservation Rejected
                          </div>
                          <div className="text-sm text-gray-300">
                            <span className="text-gray-400">Reason:</span> {reservation.internal_notes}
                          </div>
                          {reservation.updated_at && (
                            <div className="text-xs text-gray-500 mt-2">
                              Rejected on {new Date(reservation.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entry Count Badge & CTA (for Approved Reservations) */}
                {reservation.status === 'approved' && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    {isStudioDirector ? (
                      /* Studio Director: Create Routines CTA */
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Routine Usage</div>
                            <div className="text-3xl font-bold text-white">
                              {reservation._count?.competition_entries || 0} / {reservation.spaces_confirmed || 0}
                            </div>
                            <div className={`text-sm font-semibold mt-1 ${
                              (reservation.spaces_confirmed || 0) - (reservation._count?.competition_entries || 0) > 0
                                ? 'text-green-400'
                                : 'text-gray-400'
                            }`}>
                              {(reservation.spaces_confirmed || 0) - (reservation._count?.competition_entries || 0)} {
                                ((reservation.spaces_confirmed || 0) - (reservation._count?.competition_entries || 0)) === 1
                                  ? 'routine'
                                  : 'routines'
                              } remaining
                            </div>
                          </div>
                          <div className="text-5xl">
                            {(reservation._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                              ? '✅'
                              : '📝'}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
                            <div
                              className={`h-full transition-all duration-500 ${
                                (reservation._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                                  ? 'bg-green-500'
                                  : (reservation._count?.competition_entries || 0) / (reservation.spaces_confirmed || 1) >= 0.8
                                  ? 'bg-yellow-500'
                                  : 'bg-gradient-to-r from-pink-500 to-purple-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  ((reservation._count?.competition_entries || 0) / (reservation.spaces_confirmed || 1)) * 100,
                                  100
                                )}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Create Routines Button (payment status check removed for SDs) */}
                        <Link
                          href={`/dashboard/entries/create?competition=${reservation.competition_id}&reservation=${reservation.id}`}
                          className={`block w-full text-center px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                            (reservation._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                              ? 'bg-white/10 text-gray-400 cursor-not-allowed border border-white/20'
                              : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-lg transform hover:scale-105'
                          }`}
                          onClick={(e) => {
                            if ((reservation._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {(reservation._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                            ? '✅ All Routines Allocated'
                            : 'Create Routines'}
                        </Link>
                      </div>
                    ) : (
                      /* Competition Director: Simple Routine Count */
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Routines Registered</div>
                            <div className="text-2xl font-bold text-white">
                              {reservation._count?.competition_entries || 0} / {reservation.spaces_confirmed || 0}
                            </div>
                          </div>
                          <div className="text-4xl">
                            {(reservation._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                              ? '✅'
                              : '⏳'}
                          </div>
                        </div>

                        {/* Reduce Capacity Button */}
                        <button
                          onClick={() =>
                            handleReduceCapacity(
                              reservation.id,
                              reservation.studios?.name || 'studio',
                              reservation.spaces_confirmed || 0,
                              reservation._count?.competition_entries || 0
                            )
                          }
                          disabled={processingId === reservation.id}
                          className="w-full bg-orange-500/20 hover:bg-orange-500/30 disabled:bg-orange-500/10 text-orange-400 border border-orange-400/30 font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                        >
                          {processingId === reservation.id && reduceCapacityMutation.isPending
                            ? '⚙️ Reducing...'
                            : '🔽 Reduce Capacity'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        Showing {filteredReservations.length} of {reservations.length} reservations
      </div>

      {/* Rejection Modal */}
      {rejectModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Reject Reservation</h3>

            <p className="text-gray-300 mb-4">
              Are you sure you want to reject the reservation for <span className="font-semibold text-white">{rejectModalData.studioName}</span>?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rejection Reason <span className="text-gray-500">(optional but recommended)</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection (visible to studio director)..."
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
              />
              <p className="text-xs text-gray-500 mt-2">
                This reason will be displayed to the studio director.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModalData(null);
                  setRejectionReason('');
                }}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                Cancel <span className="text-xs text-gray-500">(Esc)</span>
              </button>
              <button
                onClick={confirmReject}
                className="flex-1 min-h-[44px] px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg transition-all"
              >
                ❌ Reject Reservation <span className="text-xs opacity-70">(Ctrl+Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reduce Capacity Modal */}
      {reduceModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {reduceModalData.warning ? '⚠️ Confirm Capacity Reduction' : 'Reduce Reservation Capacity'}
            </h3>

            <p className="text-gray-300 mb-4">
              Reducing capacity for <span className="font-semibold text-white">{reduceModalData.studioName}</span>
            </p>

            <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Capacity:</span>
                <span className="text-white font-semibold">{reduceModalData.currentCapacity} routines</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Routines Created:</span>
                <span className="text-white font-semibold">{reduceModalData.routineCount || 0} routines</span>
              </div>
            </div>

            {reduceModalData.warning && (
              <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-orange-400 mb-2">Impact Warning</div>
                    <div className="text-sm text-gray-300">{reduceModalData.warning}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Capacity <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                max={reduceModalData.currentCapacity}
                value={newCapacity}
                onChange={(e) => setNewCapacity(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={!!reduceModalData.warning}
              />
              {newCapacity < (reduceModalData.routineCount || 0) && !reduceModalData.warning && (
                <p className="text-xs text-orange-400 mt-2">
                  ⚠️ Warning: This studio has {reduceModalData.routineCount} routines created. Reducing capacity below this will create an overage.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Released capacity will be returned to the competition pool.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReduceModalData(null);
                  setNewCapacity(0);
                  setProcessingId(null);
                }}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                Cancel <span className="text-xs text-gray-500">(Esc)</span>
              </button>
              <button
                onClick={confirmReduceCapacity}
                disabled={newCapacity < 0 || newCapacity >= reduceModalData.currentCapacity}
                className="flex-1 min-h-[44px] px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-500/50 disabled:to-orange-600/50 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {reduceModalData.warning ? '✅ Confirm Reduction' : '🔽 Reduce Capacity'} <span className="text-xs opacity-70">(Ctrl+Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Reservation Modal (Issue #17) */}
      <ManualReservationModal
        isOpen={isManualReservationModalOpen}
        onClose={() => setIsManualReservationModalOpen(false)}
        competitions={competitions}
        studios={studiosData?.studios || []}
        onSuccess={() => {
          utils.reservation.getAll.invalidate();
        }}
      />
    </div>
    </PullToRefresh>
  );
}
