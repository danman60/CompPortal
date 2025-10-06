'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

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
  const utils = trpc.useContext();

  const { data, isLoading } = trpc.reservation.getAll.useQuery({
    competitionId,
  });

  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: () => {
      utils.reservation.getAll.invalidate();
      utils.competition.getAll.invalidate();
    },
  });

  const rejectMutation = trpc.reservation.reject.useMutation({
    onSuccess: () => {
      utils.reservation.getAll.invalidate();
      utils.competition.getAll.invalidate();
    },
  });

  const reservations = data?.reservations || [];
  const pending = reservations.filter(r => r.status === 'pending');
  const approved = reservations.filter(r => r.status === 'approved');

  const totalAllocated = approved.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);
  const remaining = maxRoutines - totalAllocated;

  const handleApprove = async (reservationId: string, studioId: string) => {
    const spaces = spacesInput[reservationId];
    if (!spaces || spaces <= 0) {
      alert('Please enter number of spaces to approve');
      return;
    }

    if (spaces > remaining) {
      alert(`Only ${remaining} spaces remaining`);
      return;
    }

    await approveMutation.mutateAsync({
      id: reservationId,
      spacesConfirmed: spaces,
    });

    setSpacesInput(prev => {
      const next = { ...prev };
      delete next[reservationId];
      return next;
    });
  };

  const handleReject = async (reservationId: string) => {
    if (!confirm('Are you sure you want to reject this reservation?')) return;

    await rejectMutation.mutateAsync({
      id: reservationId,
    });
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
          <div className="space-y-2">
            {pending.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">{reservation.studios?.name}</div>
                  <div className="text-xs text-gray-400">
                    Requested {reservation.spaces_requested} spaces{reservation.created_at && ` • ${new Date(reservation.created_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={remaining}
                    placeholder="Spaces"
                    value={spacesInput[reservation.id] || ''}
                    onChange={(e) => setSpacesInput(prev => ({
                      ...prev,
                      [reservation.id]: parseInt(e.target.value) || 0
                    }))}
                    className="w-20 px-2 py-1 bg-gray-900 text-white border border-white/20 rounded text-sm"
                  />
                  <button
                    onClick={() => handleApprove(reservation.id, reservation.studio_id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(reservation.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Reject
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {approved.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-green-500/10 border border-green-400/30 rounded-lg p-3"
              >
                <div className="text-white font-medium">{reservation.studios?.name}</div>
                <div className="text-xs text-gray-400">
                  {reservation.spaces_confirmed} spaces allocated
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
