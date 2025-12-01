'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ManualReservationModal from './ManualReservationModal';
import MoveReservationModal from './MoveReservationModal';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { SkeletonList } from '@/components/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import { hapticMedium } from '@/lib/haptics';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface ReservationsListProps {
  isStudioDirector?: boolean; // If true, hide capacity/approve/reject UI
  isCompetitionDirector?: boolean; // If true, show Edit Spaces and Edit Deposit buttons
}

export default function ReservationsList({ isStudioDirector = false, isCompetitionDirector = false }: ReservationsListProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, dataUpdatedAt, refetch } = trpc.reservation.getAll.useQuery({ limit: 100 });
  const { data: studiosData } = trpc.studio.getAll.useQuery();
  const { data: entriesData } = trpc.entry.getAll.useQuery({ limit: 100 });
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'studio-alpha' | 'spaces-desc' | 'competition-alpha'>('studio-alpha');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [tableSortColumn, setTableSortColumn] = useState<'studio' | 'competition' | 'status' | 'requested' | 'confirmed' | 'created'>('studio');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Handle table column sorting
  const handleTableSort = (column: typeof tableSortColumn) => {
    if (tableSortColumn === column) {
      setTableSortDirection(tableSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortColumn(column);
      setTableSortDirection('asc');
    }
  };
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

  // Edit Spaces modal state (CD feature)
  const [editSpacesModal, setEditSpacesModal] = useState<{
    isOpen: boolean;
    reservationId: string;
    studioName: string;
    competitionName: string;
    currentSpaces: number;
    entryCount: number;
    newSpaces: number;
    reason: string;
  } | null>(null);

  // Edit Deposit modal state (CD feature)
  const [depositModal, setDepositModal] = useState<{
    isOpen: boolean;
    reservationId: string;
    studioName: string;
    competitionName: string;
    depositAmount: string;
    paymentMethod: string;
    paymentDate: string;
    notes: string;
  } | null>(null);

  // Move Reservation modal state (CD feature)
  const [moveReservationModal, setMoveReservationModal] = useState<{
    isOpen: boolean;
    reservationId: string;
    studioName: string;
    currentCompetitionName: string;
    currentCompetitionId: string;
    spacesConfirmed: number;
  } | null>(null);

  // SD Request Space Increase modal state (SD feature)
  const [increaseSpacesModal, setIncreaseSpacesModal] = useState<{
    isOpen: boolean;
    reservationId: string;
    studioName: string;
    competitionName: string;
    currentSpaces: number;
    requestedIncrease: number;
    competitionUtilization: number;
    availableCapacity: number;
  } | null>(null);

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

  // Adjust Spaces mutation (CD feature)
  const adjustSpacesMutation = trpc.reservation.adjustReservationSpaces.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setEditSpacesModal(null);
      utils.reservation.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
    },
  });

  // Edit Deposit mutation (CD feature)
  const recordDepositMutation = trpc.reservation.recordDeposit.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setDepositModal(null);
      utils.reservation.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error.message));
    },
  });

  // SD Request Space Increase mutation (SD feature)
  const increaseSpacesMutation = trpc.reservation.requestSpaceIncrease.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIncreaseSpacesModal(null);
      utils.reservation.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message); // Backend provides friendly messages
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

  // CD Feature: Edit Spaces handler
  const handleEditSpaces = (reservation: any) => {
    setEditSpacesModal({
      isOpen: true,
      reservationId: reservation.id,
      studioName: reservation.studios?.name || '',
      competitionName: reservation.competitions?.name || '',
      currentSpaces: reservation.spaces_confirmed || 0,
      entryCount: reservation._count?.competition_entries || 0,
      newSpaces: reservation.spaces_confirmed || 0,
      reason: '',
    });
  };

  const confirmAdjustSpaces = () => {
    if (!editSpacesModal) return;
    adjustSpacesMutation.mutate({
      reservationId: editSpacesModal.reservationId,
      newSpacesConfirmed: editSpacesModal.newSpaces,
      reason: editSpacesModal.reason || undefined,
    });
  };

  // CD Feature: Edit Deposit handler
  const handleRecordDeposit = (reservation: any) => {
    setDepositModal({
      isOpen: true,
      reservationId: reservation.id,
      studioName: reservation.studios?.name || '',
      competitionName: reservation.competitions?.name || '',
      depositAmount: reservation.deposit_amount ? String(reservation.deposit_amount) : '',
      paymentMethod: 'etransfer',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // CD Feature: Move Reservation handler
  const handleMoveReservation = (reservation: any) => {
    setMoveReservationModal({
      isOpen: true,
      reservationId: reservation.id,
      studioName: reservation.studios?.name || 'Unknown Studio',
      currentCompetitionName: reservation.competitions?.name || 'Unknown Competition',
      currentCompetitionId: reservation.competition_id,
      spacesConfirmed: reservation.spaces_confirmed || 0,
    });
  };

  const confirmRecordDeposit = () => {
    if (!depositModal) return;
    const amount = parseFloat(depositModal.depositAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    recordDepositMutation.mutate({
      reservationId: depositModal.reservationId,
      depositAmount: amount,
      paymentMethod: depositModal.paymentMethod as any,
      paymentDate: depositModal.paymentDate,
      notes: depositModal.notes || undefined,
    });
  };

  // SD Feature: Request Space Increase handler
  const handleIncreaseSpaces = async (reservation: any) => {
    // Fetch competition capacity data
    const competition = reservation.competitions;
    const totalTokens = competition.total_reservation_tokens || 0;
    const availableTokens = competition.available_reservation_tokens || 0;
    const usedTokens = totalTokens - availableTokens;
    const utilization = totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0;

    setIncreaseSpacesModal({
      isOpen: true,
      reservationId: reservation.id,
      studioName: reservation.studios?.name || '',
      competitionName: reservation.competitions?.name || '',
      currentSpaces: reservation.spaces_confirmed || 0,
      requestedIncrease: 1,
      competitionUtilization: utilization,
      availableCapacity: availableTokens,
    });
  };

  const confirmIncreaseSpaces = () => {
    if (!increaseSpacesModal) return;

    increaseSpacesMutation.mutate({
      reservationId: increaseSpacesModal.reservationId,
      requestedIncrease: increaseSpacesModal.requestedIncrease,
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
  const studios = studiosData?.studios || [];

  // Filter and sort reservations
  const filteredReservations = reservations
    .filter((reservation) => {
      const matchesStatus = filter === 'all' || reservation.status === filter;
      const matchesCompetition = selectedCompetition === 'all' || (reservation as any).competition_id === selectedCompetition;
      const matchesStudio = selectedStudio === 'all' || (reservation as any).studio_id === selectedStudio;
      return matchesStatus && matchesCompetition && matchesStudio;
    })
    .sort((a, b) => {
      if (sortBy === 'studio-alpha') {
        // Alphabetical by studio name (DEFAULT)
        const studioA = ((a as any).studios?.name || '').toLowerCase();
        const studioB = ((b as any).studios?.name || '').toLowerCase();
        return studioA.localeCompare(studioB);
      } else if (sortBy === 'spaces-desc') {
        // Sort by spaces confirmed (descending - highest first)
        return (b.spaces_confirmed || 0) - (a.spaces_confirmed || 0);
      } else if (sortBy === 'competition-alpha') {
        // Sort by competition name (alphabetical)
        const compA = ((a as any).competitions?.name || '').toLowerCase();
        const compB = ((b as any).competitions?.name || '').toLowerCase();
        return compA.localeCompare(compB);
      }
      return 0;
    });

  // Apply table sorting (separate from grid sorting)
  const sortedFilteredReservations = viewMode === 'table'
    ? [...filteredReservations].sort((a, b) => {
        let comparison = 0;

        switch (tableSortColumn) {
          case 'studio':
            comparison = ((a as any).studios?.name || '').localeCompare((b as any).studios?.name || '');
            break;
          case 'competition':
            comparison = ((a as any).competitions?.name || '').localeCompare((b as any).competitions?.name || '');
            break;
          case 'status':
            comparison = (a.status || '').localeCompare(b.status || '');
            break;
          case 'requested':
            comparison = (a.spaces_requested || 0) - (b.spaces_requested || 0);
            break;
          case 'confirmed':
            comparison = (a.spaces_confirmed || 0) - (b.spaces_confirmed || 0);
            break;
          case 'created':
            comparison = ((a as any)._count?.competition_entries || 0) - ((b as any)._count?.competition_entries || 0);
            break;
        }

        return tableSortDirection === 'asc' ? comparison : -comparison;
      })
    : filteredReservations;

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
            + Request Reservation
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
          <label className="block text-xs text-gray-400 mb-1">Competition</label>
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

        {/* Studio Filter */}
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Studio</label>
          <select
            value={selectedStudio}
            onChange={(e) => setSelectedStudio(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all" className="bg-gray-900 text-white">All Studios</option>
            {studios.map((studio) => (
              <option key={studio.id} value={studio.id} className="bg-gray-900 text-white">
                {studio.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="studio-alpha" className="bg-gray-900 text-white">Studio Name (A-Z)</option>
            <option value="spaces-desc" className="bg-gray-900 text-white">Reservation Spaces (High-Low)</option>
            <option value="competition-alpha" className="bg-gray-900 text-white">Competition Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Status Filter Row */}
      <div className="mb-6">
        {/* Status Filter - Wraps on Mobile */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`min-h-[44px] px-3 md:px-4 py-2 rounded-lg transition-all flex items-center gap-2 flex-1 md:flex-none justify-center ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <span className="whitespace-nowrap">All</span>
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
            className={`min-h-[44px] px-3 md:px-4 py-2 rounded-lg transition-all flex items-center gap-2 flex-1 md:flex-none justify-center ${
              filter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <span className="whitespace-nowrap">Pending</span>
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
            className={`min-h-[44px] px-3 md:px-4 py-2 rounded-lg transition-all flex items-center gap-2 flex-1 md:flex-none justify-center ${
              filter === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <span className="whitespace-nowrap">Approved</span>
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
            className={`min-h-[44px] px-3 md:px-4 py-2 rounded-lg transition-all flex items-center gap-2 flex-1 md:flex-none justify-center ${
              filter === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <span className="whitespace-nowrap">Rejected</span>
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

      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/20">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
              viewMode === 'grid'
                ? 'bg-purple-500 text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
              viewMode === 'table'
                ? 'bg-purple-500 text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Table
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
              + Request Reservation
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredReservations.map((reservation) => {
            const capacityPercentage = getCapacityPercentage(
              reservation.spaces_requested,
              reservation.spaces_confirmed || 0
            );

            return (
              <div
                key={reservation.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all flex flex-col h-full min-h-[400px]"
              >
                <div className={`grid grid-cols-1 gap-6 ${isStudioDirector ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  {/* Left: Studio & Competition Info */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {(reservation as any).studios?.name || 'Unknown Studio'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {(reservation as any).competitions?.name || 'Unknown Competition'}
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


                  {/* Middle: Simple Summary (Studio Directors Only) */}
                  {isStudioDirector && (
                    <div className="flex flex-col justify-center space-y-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Routines Requested</div>
                        <div className="text-2xl font-bold text-white">
                          {reservation.spaces_requested}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Routines Submitted</div>
                        <div className="text-2xl font-bold text-green-400">
                          {entriesData?.entries?.filter(e => e.reservation_id === reservation.id).length || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Reservation Status</div>
                        <div className={`text-sm font-semibold ${
                          reservation.is_closed
                            ? 'text-gray-400'
                            : reservation.status === 'approved'
                            ? 'text-green-400'
                            : reservation.status === 'pending'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}>
                          {reservation.is_closed ? 'Closed' : (reservation.status ? reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1) : 'Unknown')}
                        </div>
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
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Payment Status:</span>
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
                      onClick={() => handleReject(reservation.id, (reservation as any).studios?.name || 'studio')}
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
                              {(reservation as any)._count?.competition_entries || 0} / {reservation.spaces_confirmed || 0}
                            </div>
                            <div className={`text-sm font-semibold mt-1 ${
                              (reservation.spaces_confirmed || 0) - ((reservation as any)._count?.competition_entries || 0) > 0
                                ? 'text-green-400'
                                : 'text-gray-400'
                            }`}>
                              {(reservation.spaces_confirmed || 0) - ((reservation as any)._count?.competition_entries || 0)} {
                                ((reservation.spaces_confirmed || 0) - ((reservation as any)._count?.competition_entries || 0)) === 1
                                  ? 'routine'
                                  : 'routines'
                              } remaining
                            </div>
                          </div>
                          <div className="text-5xl">
                            {((reservation as any)._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                              ? '✅'
                              : '📝'}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
                            <div
                              className={`h-full transition-all duration-500 ${
                                ((reservation as any)._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                                  ? 'bg-green-500'
                                  : ((reservation as any)._count?.competition_entries || 0) / (reservation.spaces_confirmed || 1) >= 0.8
                                  ? 'bg-yellow-500'
                                  : 'bg-gradient-to-r from-pink-500 to-purple-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  (((reservation as any)._count?.competition_entries || 0) / (reservation.spaces_confirmed || 1)) * 100,
                                  100
                                )}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Create Routines Button (payment status check removed for SDs) */}
                        <Link
                          href={`/dashboard/entries`}
                          className={`block w-full text-center px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 mb-3 ${
                            ((reservation as any)._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                              ? 'bg-white/10 text-gray-400 cursor-not-allowed border border-white/20'
                              : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-lg transform hover:scale-105'
                          }`}
                          onClick={(e) => {
                            if (((reservation as any)._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {((reservation as any)._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                            ? '✅ All Routines Allocated'
                            : 'Create Routines'}
                        </Link>

                        {/* SD Feature: Request More Spaces button */}
                        {['approved'].includes(reservation.status || '') && (
                          <button
                            onClick={() => handleIncreaseSpaces(reservation)}
                            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                          >
                            ➕ Request More Spaces
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Competition Director: Simple Routine Count */
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Routines Registered</div>
                            <div className="text-2xl font-bold text-white">
                              {(reservation as any)._count?.competition_entries || 0} / {reservation.spaces_confirmed || 0}
                            </div>
                          </div>
                          <div className="text-4xl">
                            {((reservation as any)._count?.competition_entries || 0) >= (reservation.spaces_confirmed || 0)
                              ? '✅'
                              : '⏳'}
                          </div>
                        </div>

                        {/* CD Feature: Edit Spaces, Edit Deposit, Move Reservation buttons */}
                        {isCompetitionDirector && (
                          <div className="space-y-3">
                            {/* Edit Spaces - only for approved/summarized/invoiced */}
                            {['approved', 'summarized', 'invoiced'].includes(reservation.status || '') && (
                              <button
                                onClick={() => handleEditSpaces(reservation)}
                                className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                              >
                                ✏️ Edit Spaces
                              </button>
                            )}
                            {/* Edit Deposit - only for approved/summarized/invoiced and invoice not SENT */}
                            {['approved', 'summarized', 'invoiced'].includes(reservation.status || '') &&
                              (!reservation.invoices || reservation.invoices.length === 0 || reservation.invoices[0]?.status !== 'SENT') && (
                              <button
                                onClick={() => handleRecordDeposit(reservation)}
                                className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                              >
                                ✏️ Edit Deposit
                              </button>
                            )}
                            {/* Move Reservation - always available for CD */}
                            <button
                              onClick={() => handleMoveReservation(reservation)}
                              className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                            >
                              🔄 Move Reservation
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/20">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleTableSort('studio')}>
                    <div className="flex items-center gap-1">
                      Studio
                      {tableSortColumn === 'studio' && (
                        <span className="text-purple-400">{tableSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleTableSort('competition')}>
                    <div className="flex items-center gap-1">
                      Competition
                      {tableSortColumn === 'competition' && (
                        <span className="text-purple-400">{tableSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleTableSort('status')}>
                    <div className="flex items-center justify-center gap-1">
                      Status
                      {tableSortColumn === 'status' && (
                        <span className="text-purple-400">{tableSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleTableSort('requested')}>
                    <div className="flex items-center justify-center gap-1">
                      Requested
                      {tableSortColumn === 'requested' && (
                        <span className="text-purple-400">{tableSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleTableSort('confirmed')}>
                    <div className="flex items-center justify-center gap-1">
                      Confirmed
                      {tableSortColumn === 'confirmed' && (
                        <span className="text-purple-400">{tableSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleTableSort('created')}>
                    <div className="flex items-center justify-center gap-1">
                      Created
                      {tableSortColumn === 'created' && (
                        <span className="text-purple-400">{tableSortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {!isStudioDirector && (
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedFilteredReservations.map((reservation) => {
                  const entriesCount = (reservation as any)._count?.competition_entries || 0;
                  return (
                    <tr key={reservation.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-semibold">
                          {(reservation as any).studios?.name || 'Unknown Studio'}
                        </div>
                        {!isStudioDirector && reservation.agent_first_name && (
                          <div className="text-xs text-gray-400 mt-1">
                            {reservation.agent_first_name} {reservation.agent_last_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300">
                          {(reservation as any).competitions?.name || 'Unknown Competition'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={(reservation.status || 'pending') as any} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-white font-semibold">{reservation.spaces_requested}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-white font-semibold">
                          {reservation.spaces_confirmed || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-white font-semibold">{entriesCount}</div>
                      </td>
                      {!isStudioDirector && (
                        <td className="px-6 py-4">
                          {reservation.status === 'pending' ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleApprove(reservation.id, reservation.spaces_requested)}
                                disabled={processingId === reservation.id}
                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-sm font-semibold rounded transition-all disabled:cursor-not-allowed"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(reservation.id, (reservation as any).studios?.name || 'studio')}
                                disabled={processingId === reservation.id}
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-sm font-semibold rounded transition-all disabled:cursor-not-allowed"
                              >
                                Reject
                              </button>
                            </div>
                          ) : isCompetitionDirector && ['approved', 'summarized', 'invoiced'].includes(reservation.status || '') ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEditSpaces(reservation)}
                                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-sm font-semibold rounded transition-all"
                              >
                                Edit
                              </button>
                              {/* Hide Edit Deposit button if invoice has been SENT */}
                              {(!reservation.invoices || reservation.invoices.length === 0 || reservation.invoices[0]?.status !== 'SENT') && (
                                <button
                                  onClick={() => handleRecordDeposit(reservation)}
                                  className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 text-sm font-semibold rounded transition-all"
                                >
                                  Edit Deposit
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm text-center">-</div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {/* Edit Spaces Modal (CD Feature) */}
      {editSpacesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">✏️ Edit Reservation Spaces</h3>

            <p className="text-gray-300 mb-4">
              Modify capacity for <span className="font-semibold text-white">{editSpacesModal.studioName}</span>
            </p>

            <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Competition:</span>
                <span className="text-white font-semibold">{editSpacesModal.competitionName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Spaces:</span>
                <span className="text-white font-semibold">{editSpacesModal.currentSpaces}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entries Created:</span>
                <span className="text-white font-semibold">{editSpacesModal.entryCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Minimum Allowed:</span>
                <span className="text-yellow-400 font-semibold">{editSpacesModal.entryCount}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Spaces <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={editSpacesModal.entryCount}
                value={editSpacesModal.newSpaces}
                onChange={(e) =>
                  setEditSpacesModal({
                    ...editSpacesModal,
                    newSpaces: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {editSpacesModal.newSpaces < editSpacesModal.entryCount && (
                <p className="text-xs text-red-400 mt-2">
                  ⚠️ Cannot reduce below {editSpacesModal.entryCount} (number of entries already created)
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                value={editSpacesModal.reason}
                onChange={(e) =>
                  setEditSpacesModal({
                    ...editSpacesModal,
                    reason: e.target.value,
                  })
                }
                placeholder="Explain why spaces were adjusted..."
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditSpacesModal(null)}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdjustSpaces}
                disabled={editSpacesModal.newSpaces < editSpacesModal.entryCount || adjustSpacesMutation.isPending}
                className="flex-1 min-h-[44px] px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-500/50 disabled:to-blue-600/50 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {adjustSpacesMutation.isPending ? '⚙️ Saving...' : '✅ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deposit Modal (CD Feature) */}
      {depositModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">✏️ Edit Deposit</h3>

            <p className="text-gray-300 mb-4">
              Editing deposit for <span className="font-semibold text-white">{depositModal.studioName}</span>
            </p>

            <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Competition:</span>
                <span className="text-white font-semibold">{depositModal.competitionName}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deposit Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositModal.depositAmount}
                  onChange={(e) =>
                    setDepositModal({
                      ...depositModal,
                      depositAmount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method <span className="text-red-400">*</span>
              </label>
              <select
                value={depositModal.paymentMethod}
                onChange={(e) =>
                  setDepositModal({
                    ...depositModal,
                    paymentMethod: e.target.value,
                  })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="etransfer" className="bg-gray-900 text-white">E-Transfer</option>
                <option value="cheque" className="bg-gray-900 text-white">Cheque</option>
                <option value="cash" className="bg-gray-900 text-white">Cash</option>
                <option value="credit_card" className="bg-gray-900 text-white">Credit Card</option>
                <option value="other" className="bg-gray-900 text-white">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={depositModal.paymentDate}
                onChange={(e) =>
                  setDepositModal({
                    ...depositModal,
                    paymentDate: e.target.value,
                  })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                value={depositModal.notes}
                onChange={(e) =>
                  setDepositModal({
                    ...depositModal,
                    notes: e.target.value,
                  })
                }
                placeholder="Additional notes about this deposit..."
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDepositModal(null)}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmRecordDeposit}
                disabled={!depositModal.depositAmount || recordDepositMutation.isPending}
                className="flex-1 min-h-[44px] px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-500/50 disabled:to-green-600/50 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {recordDepositMutation.isPending ? '⚙️ Saving...' : '✅ Save Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Increase Spaces Modal (SD Feature) */}
      {increaseSpacesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">➕ Request More Spaces</h3>

            <div className="space-y-4 mb-6">
              {/* Studio & Competition Info */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Reservation Details</div>
                <div className="text-white font-semibold">{increaseSpacesModal.studioName}</div>
                <div className="text-gray-300 text-sm">{increaseSpacesModal.competitionName}</div>
              </div>

              {/* Current Spaces */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Confirmed Spaces
                </label>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  {increaseSpacesModal.currentSpaces}
                </div>
              </div>

              {/* Competition Capacity Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">ℹ️</div>
                  <div>
                    <p className="text-blue-300 font-semibold mb-1">Competition Capacity</p>
                    <p className="text-blue-200 text-sm">
                      Utilization: <strong>{increaseSpacesModal.competitionUtilization.toFixed(1)}%</strong>
                    </p>
                    <p className="text-blue-200 text-sm">
                      Available: <strong>{increaseSpacesModal.availableCapacity} spaces</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Requested Increase */}
              <div>
                <label htmlFor="requestedIncrease" className="block text-sm font-medium text-gray-300 mb-2">
                  Spaces to Add
                </label>
                <input
                  id="requestedIncrease"
                  type="number"
                  min={1}
                  max={Math.min(50, increaseSpacesModal.availableCapacity)}
                  value={increaseSpacesModal.requestedIncrease}
                  onChange={(e) => setIncreaseSpacesModal({
                    ...increaseSpacesModal,
                    requestedIncrease: parseInt(e.target.value) || 1,
                  })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-gray-400 text-xs mt-1">
                  New total: {increaseSpacesModal.currentSpaces + increaseSpacesModal.requestedIncrease} spaces
                </p>
              </div>

              {/* Warning if utilization >= 90% */}
              {increaseSpacesModal.competitionUtilization >= 90 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <p className="text-orange-300 font-semibold mb-1">Competition Nearly Full</p>
                      <p className="text-orange-200 text-sm">
                        This competition is at {increaseSpacesModal.competitionUtilization.toFixed(1)}% capacity.
                        You may need to contact the Competition Director for more spaces.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIncreaseSpacesModal(null)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmIncreaseSpaces}
                disabled={
                  increaseSpacesMutation.isPending ||
                  increaseSpacesModal.requestedIncrease < 1 ||
                  increaseSpacesModal.requestedIncrease > increaseSpacesModal.availableCapacity
                }
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {increaseSpacesMutation.isPending ? 'Requesting...' : 'Request Increase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Reservation Modal (CD Feature) */}
      {moveReservationModal && data?.competitions && (
        <MoveReservationModal
          isOpen={moveReservationModal.isOpen}
          onClose={() => setMoveReservationModal(null)}
          reservation={{
            id: moveReservationModal.reservationId,
            studio_name: moveReservationModal.studioName,
            current_competition_name: moveReservationModal.currentCompetitionName,
            current_competition_id: moveReservationModal.currentCompetitionId,
            spaces_confirmed: moveReservationModal.spacesConfirmed,
          }}
          competitions={data.competitions || []}
          onSuccess={() => {
            setMoveReservationModal(null);
            utils.reservation.getAll.invalidate();
          }}
        />
      )}
    </div>
  );
}
