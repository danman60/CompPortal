'use client';

import { useState } from 'react';
import Link from 'next/link';
import StudioDirectorStats from './StudioDirectorStats';
import QuickStatsWidget from './QuickStatsWidget';
import { trpc } from '@/lib/trpc';
import MotivationalQuote from './MotivationalQuote';
import BalletLoadingAnimation from './BalletLoadingAnimation';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface StudioDirectorDashboardProps {
  userEmail: string;
  firstName: string;
  studioName?: string;
  studioStatus?: string | null;
}

export default function StudioDirectorDashboard({ userEmail, firstName, studioName, studioStatus }: StudioDirectorDashboardProps) {
  const [showLoading, setShowLoading] = useState(true);
  const { data: myDancers } = trpc.dancer.getAll.useQuery();
  const { data: myEntries } = trpc.entry.getAll.useQuery();
  const { data: myReservations } = trpc.reservation.getAll.useQuery();

  return (
    <>
      {showLoading && (
        <BalletLoadingAnimation
          onAnimationComplete={() => setShowLoading(false)}
          minDuration={1500}
        />
      )}

      <div className="space-y-8">
      {/* Pending Approval Banner */}
      {studioStatus === 'pending' && (
        <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl border-2 border-yellow-400/50 p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⏳</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-yellow-300 mb-2">
                Studio Pending Approval
              </h3>
              <p className="text-gray-300 mb-2">
                Your studio registration is currently under review by the competition administrators.
              </p>
              <p className="text-gray-400 text-sm">
                You will receive an email notification once your studio has been approved. Some features
                may be limited until approval is complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-white mb-2">
          {getGreeting()}, {firstName}! 👋
        </h1>
        <p className="text-gray-400 mb-4">
          {studioName && <span className="text-purple-400">{studioName}</span>}
        </p>
        <MotivationalQuote />
      </div>

      {/* Stats */}
      <StudioDirectorStats />

      {/* Quick Stats CARDS (not buttons - these show information) */}
      <QuickStatsWidget
        className="mt-4"
        stats={[
          { icon: '🩰', value: myDancers?.dancers?.length || 0, label: 'Dancers', color: 'text-purple-300', tooltip: 'Add or import your dancers' },
          { icon: '📦', value: myReservations?.reservations?.length || 0, label: 'Reservations', color: 'text-blue-300', tooltip: 'Reserve spaces at events' },
          { icon: '🎟️', value: myEntries?.entries?.length || 0, label: 'Routines', color: 'text-pink-300', tooltip: 'Create Routines from Approved Reservations' },
          { icon: '✅', value: (myEntries?.entries?.filter(e => e.status === 'confirmed').length) || 0, label: 'Confirmed', color: 'text-green-300', tooltip: 'Routines confirmed by director' },
        ]}
      />

      {/* Action BUTTONS (navigation only - no duplicates of stats CARDS) */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="w-full">
            <div className="text-xs text-purple-300 font-medium mb-2 px-2">Check your scores and rankings</div>
            <Link
              href="/dashboard/scoreboard"
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200 block h-32 w-full"
            >
              <div className="flex items-center gap-4 h-full">
                <div className="text-4xl inline-block hover:scale-110 transition-transform flex-shrink-0">🏆</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white truncate">Results</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">View competition scores</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="w-full">
            <div className="text-xs text-purple-300 font-medium mb-2 px-2">View and pay invoices</div>
            <Link
              href="/dashboard/invoices"
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200 block h-32 w-full"
            >
              <div className="flex items-center gap-4 h-full">
                <div className="text-4xl inline-block hover:scale-110 transition-transform flex-shrink-0">🧾</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white truncate">My Invoices</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">View studio billing</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="w-full">
            <div className="text-xs text-purple-300 font-medium mb-2 px-2">Upload routine music files</div>
            <Link
              href="/dashboard/music"
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200 block h-32 w-full"
            >
              <div className="flex items-center gap-4 h-full">
                <div className="text-4xl inline-block hover:scale-110 transition-transform flex-shrink-0">🎵</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white truncate">Music Tracking</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">Monitor music file uploads</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
