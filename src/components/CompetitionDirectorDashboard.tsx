'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardStats from './DashboardStats';
import SortableDashboardCards, { DashboardCard } from './SortableDashboardCards';
import MotivationalQuote from './MotivationalQuote';
import BalletLoadingAnimation from './BalletLoadingAnimation';
import { trpc } from '@/lib/trpc';
import { Sparkles, Target, Settings as SettingsIcon } from '@/lib/icons';
import { useRouter } from 'next/navigation';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface CompetitionDirectorDashboardProps {
  userEmail: string;
  firstName: string;
  role: 'competition_director' | 'super_admin';
}

const CD_DASHBOARD_CARDS: DashboardCard[] = [
  {
    id: 'invoices',
    href: '/dashboard/invoices/all',
    icon: '💰',
    title: 'Invoices',
    description: 'Studio invoices',
  },
  {
    id: 'summaries',
    href: '/dashboard/routine-summaries',
    icon: '📋',
    title: 'Routine Summaries',
    description: 'Review & create invoices',
  },
  {
    id: 'events',
    href: '/dashboard/competitions',
    icon: '🎪',
    title: 'Events',
    description: 'Reservations & capacity',
  },
  {
    id: 'studios',
    href: '/dashboard/studios',
    icon: '🏢',
    title: 'Studios',
    description: 'View all dance studios',
  },
  {
    id: 'routines',
    href: '/dashboard/director-panel/routines',
    icon: '🎭',
    title: 'Routines',
    description: 'View all event routines',
  },
  {
    id: 'analytics',
    href: '/dashboard/analytics',
    icon: '📊',
    title: 'Analytics',
    description: 'Insights & metrics',
  },
  {
    id: 'reports',
    href: '/dashboard/reports',
    icon: '📄',
    title: 'Reports',
    description: 'PDF scorecards & results',
  },
  {
    id: 'emails',
    href: '/dashboard/emails',
    icon: '📨',
    title: 'Emails',
    description: 'Email templates',
  },
  {
    id: 'scoring',
    href: '/dashboard/scoring',
    icon: '💯',
    title: 'Scoring',
    description: 'Judge tablet interface',
  },
  {
    id: 'scheduling',
    href: '/dashboard/scheduling',
    icon: '📅',
    title: 'Scheduling',
    description: '🚧 Under construction',
    disabled: true,
  },
  {
    id: 'judges',
    href: '/dashboard/judges',
    icon: '👨‍⚖️',
    title: 'Judges',
    description: '🚧 Under construction',
    disabled: true,
  },
  {
    id: 'music',
    href: '/dashboard/music-tracking',
    icon: '🎵',
    title: 'Music Tracking',
    description: '🚧 Under construction',
    disabled: true,
  },
];

export default function CompetitionDirectorDashboard({ userEmail, firstName, role }: CompetitionDirectorDashboardProps) {
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(true);
  const [greeting, setGreeting] = useState('Hello');
  const [showBadge, setShowBadge] = useState(false);
  const isAdmin = role === 'super_admin';
  const { data: studios } = trpc.studio.getAll.useQuery();
  const { data: reservations } = trpc.reservation.getAll.useQuery();
  const { data: invoicesData } = trpc.invoice.getAllInvoices.useQuery({});

  // Set greeting on client mount to prevent hydration mismatch
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // Check if badge should be shown (session-based)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pipelineViewed = sessionStorage.getItem('pipeline-viewed');
      setShowBadge(!pipelineViewed);
    }
  }, []);

  // Calculate separate counts for detailed notifications
  const pendingCount = reservations?.reservations
    ? reservations.reservations.filter((r) => r.status === 'pending').length
    : 0;

  const summarizedCount = reservations?.reservations
    ? reservations.reservations.filter((r) => r.status === 'summarized').length
    : 0;

  const badgeCount = pendingCount + summarizedCount;

  // Handle pipeline click
  const handlePipelineClick = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pipeline-viewed', 'true');
      setShowBadge(false);
    }
    router.push('/dashboard/reservation-pipeline');
  };

  // Super Admin gets streamlined admin-focused dashboard
  const SA_DASHBOARD_CARDS: DashboardCard[] = [
    {
      id: 'testing',
      href: '/dashboard/admin/testing',
      icon: '🧪',
      title: 'Testing Tools',
      description: 'Clean slate & test data',
    },
    {
      id: 'studios',
      href: '/dashboard/studios',
      icon: '🏢',
      title: 'Studios',
      description: 'Manage studio accounts',
    },
    {
      id: 'events',
      href: '/dashboard/competitions',
      icon: '🎪',
      title: 'Events',
      description: 'Manage competitions',
    },
    {
      id: 'analytics',
      href: '/dashboard/analytics',
      icon: '📊',
      title: 'Analytics',
      description: 'System health & insights',
    },
    {
      id: 'emails',
      href: '/dashboard/emails',
      icon: '📨',
      title: 'Emails',
      description: 'Debug email templates',
    },
    {
      id: 'inspector',
      href: '/dashboard/admin/inspector',
      icon: '🔍',
      title: 'Admin Inspector',
      description: 'Debug CD workflows',
    },
    {
      id: 'settings',
      href: '/dashboard/settings',
      icon: '⚙️',
      title: 'Settings',
      description: 'System configuration',
    },
  ];

  const dashboardCards = isAdmin ? SA_DASHBOARD_CARDS : CD_DASHBOARD_CARDS;

  return (
    <>
      {showLoading && (
        <BalletLoadingAnimation
          onAnimationComplete={() => setShowLoading(false)}
          minDuration={1500}
        />
      )}

      <div className="space-y-8">
      {/* Header */}
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-white mb-2">
          {greeting}, {firstName}!
        </h1>
        <p className="text-gray-400 mb-4">
          {isAdmin ? 'Super Admin Dashboard' : 'Competition Director Dashboard'}
          <span className="ml-2 px-2 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-xs font-semibold">
            {isAdmin ? 'SUPER ADMIN' : 'DIRECTOR'}
          </span>
        </p>
        <MotivationalQuote />

        {/* Studio Pipeline Button - CD only */}
        {!isAdmin && (
          <button
            onClick={handlePipelineClick}
            className="mt-6 block w-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 hover:from-pink-600 hover:via-purple-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover-lift text-center relative"
          >
            <div className="flex items-center justify-center gap-3">
              <Target size={28} strokeWidth={2} />
              <span className="text-xl">Studio Pipeline</span>
              <span className="text-sm opacity-80">→</span>
            </div>
            <div className="text-xs mt-1 opacity-90">Manage all studio reservations from request to payment in one view</div>
            {showBadge && badgeCount > 0 && (
              <div className="mt-3 flex flex-col gap-1.5 text-xs">
                {pendingCount > 0 && (
                  <div className="bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 px-3 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-2">
                    <span className="text-yellow-400">●</span>
                    {pendingCount} Reservation{pendingCount !== 1 ? 's' : ''} Need{pendingCount === 1 ? 's' : ''} Approval
                  </div>
                )}
                {summarizedCount > 0 && (
                  <div className="bg-blue-500/20 border border-blue-400/50 text-blue-200 px-3 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-2">
                    <span className="text-blue-400">●</span>
                    {summarizedCount} New Summar{summarizedCount !== 1 ? 'ies' : 'y'} Submitted
                  </div>
                )}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Global Stats */}
      <DashboardStats role={role} />

      {/* Admin Actions */}
      <SortableDashboardCards cards={dashboardCards} />

      {/* Quick Info */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target size={28} strokeWidth={2} className="text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Competition Director Responsibilities</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Reservation Management</h3>
            <ul className="space-y-1 text-sm">
              <li>• Approve or reject studio reservation requests</li>
              <li>• Allocate event routine tokens (600 per event)</li>
              <li>• Monitor capacity across all studios</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Event Operations</h3>
            <ul className="space-y-1 text-sm">
              <li>• Schedule event sessions and heats</li>
              <li>• Assign judges to panels</li>
              <li>• Monitor routine submissions across all studios</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Data & Analytics</h3>
            <ul className="space-y-1 text-sm">
              <li>• View system-wide statistics and trends</li>
              <li>• Generate reports for stakeholders</li>
              <li>• Monitor platform health</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Communication</h3>
            <ul className="space-y-1 text-sm">
              <li>• Manage email templates for notifications</li>
              <li>• Send announcements to studios</li>
              <li>• Coordinate with studio directors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
