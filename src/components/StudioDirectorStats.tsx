'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function StudioDirectorStats() {
  const { data: myDancers, isLoading: dancersLoading } = trpc.dancer.getAll.useQuery();
  const { data: myEntries, isLoading: entriesLoading } = trpc.entry.getAll.useQuery();
  const { data: myReservations, isLoading: reservationsLoading } = trpc.reservation.getAll.useQuery();

  if (dancersLoading || entriesLoading || reservationsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-white/20 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-white/20 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalDancers = myDancers?.dancers?.length || 0;
  const activeDancers = myDancers?.dancers?.filter(d => d.status === 'active').length || 0;

  const totalEntries = myEntries?.entries?.length || 0;
  const registeredEntries = myEntries?.entries?.filter(e => e.status === 'registered' || e.status === 'confirmed').length || 0;
  const draftEntries = myEntries?.entries?.filter(e => e.status === 'draft').length || 0;

  const totalReservations = myReservations?.reservations?.length || 0;
  const approvedReservations = myReservations?.reservations?.filter(r => r.status === 'approved').length || 0;
  const pendingReservations = myReservations?.reservations?.filter(r => r.status === 'pending').length || 0;

  // Calculate events capacity for approved reservations
  const approvedReservationsWithCapacity = myReservations?.reservations
    ?.filter(r => r.status === 'approved' && r.spaces_confirmed && r.spaces_confirmed > 0)
    ?.map(r => {
      const spacesConfirmed = r.spaces_confirmed || 0;
      const spacesUsed = myEntries?.entries?.filter(e => e.reservation_id === r.id).length || 0;
      const utilizationPercent = spacesConfirmed > 0 ? Math.round((spacesUsed / spacesConfirmed) * 100) : 0;
      return {
        competitionName: r.competitions?.name || 'Competition',
        spacesConfirmed,
        spacesUsed,
        utilizationPercent,
      };
    }) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* My Dancers Card */}
      <Link
        href="/dashboard/dancers"
        className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-6 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">My Dancers</h3>
          <div className="text-3xl">💃</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{totalDancers}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Active:</span>
            <span className="font-semibold text-green-400">{activeDancers}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Inactive:</span>
            <span className="font-semibold text-gray-400">{totalDancers - activeDancers}</span>
          </div>
        </div>
      </Link>

      {/* My Routines Card */}
      <Link
        href="/dashboard/entries"
        className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 p-6 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">My Routines</h3>
          <div className="text-3xl">🎭</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{totalEntries}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Registered:</span>
            <span className="font-semibold text-green-400">{registeredEntries}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Drafts:</span>
            <span className="font-semibold text-yellow-400">{draftEntries}</span>
          </div>
        </div>
      </Link>

      {/* My Reservations Card */}
      <Link
        href="/dashboard/reservations"
        className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-400/30 p-6 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">My Reservations</h3>
          <div className="text-3xl">📋</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{totalReservations}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Approved:</span>
            <span className="font-semibold text-green-400">{approvedReservations}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Pending:</span>
            <span className="font-semibold text-yellow-400">{pendingReservations}</span>
          </div>
        </div>
      </Link>

      {/* Events Capacity Card */}
      <Link
        href="/dashboard/reservations"
        className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-xl border border-orange-400/30 p-6 hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Events Capacity</h3>
          <div className="text-3xl">📊</div>
        </div>
        <div className="text-4xl font-bold text-white mb-2">{approvedReservationsWithCapacity.length}</div>
        <div className="space-y-2 text-sm">
          {approvedReservationsWithCapacity.length === 0 ? (
            <p className="text-gray-400">No approved events yet</p>
          ) : (
            approvedReservationsWithCapacity.slice(0, 2).map((event, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-gray-300 text-xs">
                  <span className="truncate max-w-[120px]">{event.competitionName}</span>
                  <span className="font-semibold">{event.spacesUsed}/{event.spacesConfirmed}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      event.utilizationPercent >= 90
                        ? 'bg-red-500'
                        : event.utilizationPercent >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(event.utilizationPercent, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </Link>
    </div>
  );
}
