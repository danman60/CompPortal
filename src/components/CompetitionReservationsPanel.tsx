'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface CompetitionReservationsPanelProps {
  competitionId: string;
  competitionName: string;
  maxRoutines?: number;
}

export default function CompetitionReservationsPanel({
  competitionId,
  competitionName,
  maxRoutines = 600,
}: CompetitionReservationsPanelProps) {
  const [spacesInput, setSpacesInput] = useState<Record<string, number>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const utils = trpc.useContext();

  const { data, isLoading } = trpc.reservation.getAll.useQuery({
    competitionId,
  });

  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: () => {
      toast.success('Reservation approved successfully! ✅', {
        duration: 3000,
        position: 'top-right',
      });
      utils.reservation.getAll.invalidate();
      utils.competition.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`, {
        duration: 4000,
        position: 'top-right',
      });
    },
  });

  const rejectMutation = trpc.reservation.reject.useMutation({
    onSuccess: () => {
      toast.success('Reservation rejected', {
        duration: 3000,
        position: 'top-right',
      });
      utils.reservation.getAll.invalidate();
      utils.competition.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`, {
        duration: 4000,
        position: 'top-right',
      });
    },
  });

  const reservations = data?.reservations || [];
  const pending = reservations.filter(r => r.status === 'pending');
  const approved = reservations.filter(r => r.status === 'approved');

  const totalAllocated = approved.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);
  const remaining = maxRoutines - totalAllocated;

  const handleApprove = async (reservationId: string, studioId: string) => {
    // Prevent double-click race condition during 300ms animation window
    if (removingId || approveMutation.isPending) {
      return;
    }

    const spaces = spacesInput[reservationId];
    if (!spaces || spaces <= 0) {
      toast.error('Please enter number of spaces to approve');
      return;
    }

    if (spaces > remaining) {
      toast.error(`Only ${remaining} spaces remaining`);
      return;
    }

    // Trigger slide-out animation
    setRemovingId(reservationId);

    // Wait for animation before mutating
    setTimeout(async () => {
      await approveMutation.mutateAsync({
        id: reservationId,
        spacesConfirmed: spaces,
      });

      setSpacesInput(prev => {
        const next = { ...prev };
        delete next[reservationId];
        return next;
      });
      setRemovingId(null);
    }, 300); // Match animation duration
  };

  const handleReject = async (reservationId: string) => {
    if (!confirm('Are you sure you want to reject this reservation?')) return;

    // Trigger slide-out animation
    setRemovingId(reservationId);

    // Wait for animation before mutating
    setTimeout(async () => {
      await rejectMutation.mutateAsync({
        id: reservationId,
      });
      setRemovingId(null);
    }, 300); // Match animation duration
  };

  if (isLoading) {
    return (
      <div className="p-4 text-gray-400 text-sm">
        Loading reservations...
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="p-4 text-gray-400 text-sm">
        No reservations yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-semibold">{pending.length} Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-semibold">{approved.length} Approved</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${remaining < 50 ? 'text-red-400' : 'text-gray-300'}`}>
            {totalAllocated}/{maxRoutines} Spaces Allocated
          </span>
        </div>
      </div>

      {/* Pending Reservations */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-yellow-400 mb-2">Pending Approval</h4>
          <div className="space-y-1">
            {pending.map((reservation) => (
              <div
                key={reservation.id}
                className={`
                  bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-2
                  flex items-center justify-between gap-2
                  transition-all duration-300 ease-in-out
                  ${removingId === reservation.id
                    ? 'opacity-0 translate-x-full h-0 p-0 border-0 overflow-hidden'
                    : 'opacity-100 translate-x-0 h-auto'
                  }
                `}
              >
                <div className="text-white font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-shrink">
                  {(reservation as any).studios?.name} ({reservation.spaces_requested} req)
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min="1"
                    max={remaining}
                    placeholder="#"
                    value={spacesInput[reservation.id] || ''}
                    onChange={(e) => setSpacesInput(prev => ({
                      ...prev,
                      [reservation.id]: parseInt(e.target.value) || 0
                    }))}
                    className="w-14 px-1.5 py-0.5 bg-gray-900 text-white border border-white/20 rounded text-xs"
                  />
                  <button
                    onClick={() => handleApprove(reservation.id, reservation.studio_id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending || removingId === reservation.id}
                    className="bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded text-xs disabled:opacity-50"
                    title="Approve reservation"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleReject(reservation.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending || removingId === reservation.id}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs disabled:opacity-50"
                    title="Reject reservation"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Reservations */}
      {approved.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-400 mb-2">Approved</h4>
          <div className="space-y-1">
            {approved.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-green-500/10 border border-green-400/30 rounded-lg p-2 flex items-center justify-between"
              >
                <div className="text-white font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                  {(reservation as any).studios?.name}
                </div>
                <div className="text-xs text-green-400 font-semibold flex-shrink-0">
                  {reservation.spaces_confirmed} spaces
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
