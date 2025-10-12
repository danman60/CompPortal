'use client';

import { useState } from 'react';
import Link from 'next/link';
import StudioDirectorStats from './StudioDirectorStats';
import QuickStatsWidget from './QuickStatsWidget';
import { trpc } from '@/lib/trpc';
import SortableDashboardCards, { DashboardCard } from './SortableDashboardCards';
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

const STUDIO_DIRECTOR_CARDS: DashboardCard[] = [
  {
    id: 'dancers',
    href: '/dashboard/dancers',
    icon: '🩰',
    title: 'My Dancers',
    description: 'Register and manage dancers',
    tooltip: 'Add or import your dancers',
  },
  {
    id: 'routines',
    href: '/dashboard/entries',
    icon: '🎭',
    title: 'My Routines',
    description: 'Create and edit routines',
    tooltip: 'Create your routines',
  },
  {
    id: 'reservations',
    href: '/dashboard/reservations',
    icon: '📅',
    title: 'My Reservations',
    description: 'Reserve routines for events',
    tooltip: 'Reserve routine slots',
  },
  {
    id: 'results',
    href: '/dashboard/scoreboard',
    icon: '🏆',
    title: 'Results',
    description: 'View competition scores',
    tooltip: 'Check your scores and rankings',
  },
  {
    id: 'invoices',
    href: '/dashboard/invoices',
    icon: '🧾',
    title: 'My Invoices',
    description: 'View studio billing',
    tooltip: 'View and pay invoices',
  },
  {
    id: 'music',
    href: '/dashboard/music',
    icon: '🎵',
    title: 'Music Tracking',
    description: 'Monitor music file uploads',
    tooltip: 'Upload routine music files',
  },
];

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
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-2">
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-gray-400 mb-4">
            {studioName && <span className="text-purple-400">{studioName}</span>}
          </p>
          <MotivationalQuote />
        </div>
        <Link
          href="/dashboard/settings/profile"
          className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 px-4 py-2 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-white font-semibold">My Studio</span>
        </Link>
      </div>

      {/* Stats */}
      <StudioDirectorStats />

      {/* Quick Actions - Studio Director View */}
      <SortableDashboardCards cards={STUDIO_DIRECTOR_CARDS} />

      {/* Quick Stats */}
      <QuickStatsWidget
        className="mt-4"
        stats={[
          { icon: '🩰', value: myDancers?.dancers?.length || 0, label: 'Dancers', color: 'text-purple-300' },
          { icon: '🎟️', value: myEntries?.entries?.length || 0, label: 'Routines', color: 'text-pink-300' },
          { icon: '📦', value: myReservations?.reservations?.length || 0, label: 'Reservations', color: 'text-blue-300' },
          { icon: '✅', value: (myEntries?.entries?.filter(e => e.status === 'confirmed').length) || 0, label: 'Confirmed', color: 'text-green-300' },
        ]}
      />
    </div>
    </>
  );
}
