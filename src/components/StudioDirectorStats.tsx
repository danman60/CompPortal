'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { FEATURES, isFeatureEnabled } from '@/lib/feature-flags';

interface StudioDirectorStatsProps {
  nextActionCard?: 'dancers' | 'reservations' | 'routines' | null;
}

export default function StudioDirectorStats({ nextActionCard }: StudioDirectorStatsProps = {}) {
  const { data: myDancers, isLoading: dancersLoading } = trpc.dancer.getAll.useQuery();
  const { data: entryCounts, isLoading: entriesLoading } = trpc.entry.getCounts.useQuery();
  const { data: myReservations, isLoading: reservationsLoading } = trpc.reservation.getAll.useQuery();
  const { data: currentUser, isLoading: userLoading } = trpc.user.getCurrentUser.useQuery();

  if (dancersLoading || entriesLoading || reservationsLoading || userLoading) {
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

  // My Routines: Join with reservations to determine status (Phase1 spec:236-241)
  // "Drafts" = entries in approved/adjusted reservations (editable)
  // "Submitted" = entries in summarized/invoiced/closed reservations (limited editing)
  const totalEntries = entryCounts?.total || 0;

  // Calculate draft entries by summing counts for approved/adjusted reservations
  const draftEntries = myReservations?.reservations
    ?.filter(r => r.status === 'approved' || r.status === 'adjusted')
    .reduce((sum, r) => sum + (entryCounts?.byReservation[r.id] || 0), 0) || 0;

  // Calculate submitted entries by summing counts for summarized/invoiced/closed reservations
  const submittedEntries = myReservations?.reservations
    ?.filter(r => ['summarized', 'invoiced', 'closed'].includes(r.status || ''))
    .reduce((sum, r) => sum + (entryCounts?.byReservation[r.id] || 0), 0) || 0;

  // My Reservations: Count by status (Phase1 spec:61)
  const totalReservations = myReservations?.reservations?.length || 0;
  const approvedReservations = myReservations?.reservations?.filter(r =>
    r.status === 'approved' || r.status === 'adjusted'
  ).length || 0;
  const pendingReservations = myReservations?.reservations?.filter(r => r.status === 'pending').length || 0;
  const submittedReservations = myReservations?.reservations?.filter(r =>
    ['summarized', 'invoiced', 'closed'].includes(r.status || '')
  ).length || 0;

  // Calculate approved spaces and spaces remaining
  const approvedSpaces = myReservations?.reservations
    ?.filter(r => r.status === 'approved' || r.status === 'adjusted')
    ?.reduce((total, r) => total + (r.spaces_requested || 0), 0) || 0;

  const approvedReservationIds = myReservations?.reservations
    ?.filter(r => r.status === 'approved' || r.status === 'adjusted')
    ?.map(r => r.id) || [];

  const createdRoutinesForApproved = approvedReservationIds
    .reduce((sum, resId) => sum + (entryCounts?.byReservation[resId] || 0), 0);

  const spacesRemaining = Math.max(0, approvedSpaces - createdRoutinesForApproved);

  // Check if user can access routine creation (NEW_ROUTINE_PAGE feature flag)
  const canAccessRoutines = isFeatureEnabled(
    FEATURES.NEW_ROUTINE_PAGE,
    currentUser?.role || 'studio_director',
    currentUser?.id
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Dancers Card */}
        <div className="flex flex-col">
          <div className="text-sm text-gray-400 mb-2 font-medium">Add or import your dancers</div>
          <Link
            href="/dashboard/dancers"
            className={`flex-1 flex flex-col bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl p-6 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 cursor-pointer ${
              nextActionCard === 'dancers'
                ? 'border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse'
                : 'border border-purple-400/30'
            }`}
            title="Manage your studio's dancer roster. Add new dancers individually or import multiple dancers from a CSV file. Track active and inactive dancers."
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
        </div>

        {/* My Reservations Card */}
        <div className="flex flex-col">
          <div className="text-sm text-gray-400 mb-2 font-medium">Reserve routine slots</div>
          <Link
            href="/dashboard/reservations"
            className={`flex-1 flex flex-col bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl p-6 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 cursor-pointer ${
              nextActionCard === 'reservations'
                ? 'border-2 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)] animate-pulse'
                : 'border border-green-400/30'
            }`}
            title="Request routine slots at upcoming competitions. Submit reservation requests specifying how many routines you plan to enter. Once approved by the competition director, you can create your routines."
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
                <span>Spaces Remaining:</span>
                <span className="font-semibold text-blue-400">{spacesRemaining}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Pending:</span>
                <span className="font-semibold text-yellow-400">{pendingReservations}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* My Routines Card */}
        <div className="flex flex-col">
          <div className="text-sm text-gray-400 mb-2 font-medium">Create your routines</div>
          {canAccessRoutines ? (
            <Link
              href="/dashboard/entries"
              className={`flex-1 flex flex-col bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl p-6 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 cursor-pointer ${
                nextActionCard === 'routines'
                  ? 'border-2 border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.4)] animate-pulse'
                  : 'border border-blue-400/30'
              }`}
              title="Manage your competition routines. Create new entries, edit existing routines, and submit your registration summary to the competition director."
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">My Routines</h3>
                <div className="text-3xl">🎭</div>
              </div>
              <div className="text-4xl font-bold text-white mb-2">{totalEntries}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Submitted:</span>
                  <span className="font-semibold text-green-400">{submittedEntries}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Drafts:</span>
                  <span className="font-semibold text-yellow-400">{draftEntries}</span>
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="flex-1 flex flex-col bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-md rounded-xl p-6 border border-blue-400/20 opacity-60 cursor-not-allowed"
              title="Routine creation is coming soon. This feature is currently under construction."
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">My Routines</h3>
                <div className="text-3xl opacity-50">🎭</div>
              </div>
              <div className="text-4xl font-bold text-white mb-2 opacity-50">{totalEntries}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-300 opacity-50">
                  <span>Submitted:</span>
                  <span className="font-semibold text-green-400">{submittedEntries}</span>
                </div>
                <div className="flex justify-between text-gray-300 opacity-50">
                  <span>Drafts:</span>
                  <span className="font-semibold text-yellow-400">{draftEntries}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-center text-sm text-yellow-300">
                  🚧 Routine creation coming soon
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
