'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardStats from './DashboardStats';
import SortableDashboardCards, { DashboardCard } from './SortableDashboardCards';
import MotivationalQuote from './MotivationalQuote';
import BalletLoadingAnimation from './BalletLoadingAnimation';
import SitePauseButton from './SitePauseButton';
import StudioInvitationButton from './StudioInvitationButton';
import { SuperAdminActivityBar } from './SuperAdminActivityBar';
import { trpc } from '@/lib/trpc';
import { Sparkles, Target, Settings as SettingsIcon } from '@/lib/icons';
import { useRouter } from 'next/navigation';
import { FeedbackWidget } from './FeedbackWidget';

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
  logoUrl?: string | null;
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
  {
    id: 'classification-requests',
    href: '/dashboard/classification-requests',
    icon: '📋',
    title: 'Classification Requests',
    description: 'Review exception requests',
    badge: 'classification-requests',
  },
];

export default function CompetitionDirectorDashboard({ userEmail, firstName, role, logoUrl }: CompetitionDirectorDashboardProps) {
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(true);
  const [greeting, setGreeting] = useState('Hello');
  const [showBadge, setShowBadge] = useState(false);
  const isAdmin = role === 'super_admin';
  const { data: studios, isLoading: studiosLoading } = trpc.studio.getAll.useQuery();
  const { data: reservations, isLoading: reservationsLoading } = trpc.reservation.getAll.useQuery();
  const { data: invoicesData, isLoading: invoicesLoading } = trpc.invoice.getAllInvoices.useQuery({});
  const { data: classificationRequestsData, isLoading: classificationRequestsLoading } = trpc.classificationRequest.getCount.useQuery();

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

  const draftInvoicesCount = invoicesData?.invoices
    ? invoicesData.invoices.filter((inv: any) => inv.status === 'DRAFT').length
    : 0;

  const badgeCount = pendingCount + summarizedCount + draftInvoicesCount;

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
      id: 'users',
      href: '/dashboard/admin/users',
      icon: '👥',
      title: 'User Management',
      description: 'Search & manage all users',
    },
    {
      id: 'tenants',
      href: '/dashboard/admin/tenants',
      icon: '🏛️',
      title: 'Tenant Management',
      description: 'Manage competitions & branding',
    },
    {
      id: 'testing',
      href: '/dashboard/admin/testing',
      icon: '🧪',
      title: 'Testing Tools',
      description: 'Clean slate & test data',
    },
    {
      id: 'feedback',
      href: '/dashboard/admin/feedback',
      icon: '💡',
      title: 'User Feedback',
      description: 'Review feedback & send digest',
    },
    {
      id: 'studio-invitations',
      href: '/dashboard/admin/studio-invitations',
      icon: '📧',
      title: 'Studio Invitations',
      description: 'Send & track invitations',
    },
    {
      id: 'account-recovery',
      href: '/dashboard/admin/account-recovery',
      icon: '🔐',
      title: 'Account Recovery',
      description: 'Restore orphaned studio accounts',
    },
    {
      id: 'email-monitor',
      href: '/dashboard/admin/emails',
      icon: '📮',
      title: 'Email Monitor',
      description: 'Track delivery & debug failures',
    },
    {
      id: 'backup-restore',
      href: '/dashboard/admin/backup',
      icon: '💾',
      title: 'Backup & Restore',
      description: 'Database backups & recovery',
    },
    {
      id: 'impersonate',
      href: '/dashboard/admin/impersonate',
      icon: '👤',
      title: 'Impersonation',
      description: 'View as another user (audited)',
    },
    {
      id: 'routines',
      href: '/dashboard/admin/routines',
      icon: '🩰',
      title: 'Routines',
      description: 'Multi-tenant routines view',
    },
    {
      id: 'reservations',
      href: '/dashboard/admin/reservations',
      icon: '📋',
      title: 'Reservations',
      description: 'Multi-tenant capacity view',
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

  // Check if critical data is ready (all queries completed)
  const dataReady = !studiosLoading && !reservationsLoading && !invoicesLoading && !classificationRequestsLoading;

  return (
    <>
      {showLoading && (
        <BalletLoadingAnimation
          onAnimationComplete={() => setShowLoading(false)}
          minDuration={1500}
          dataReady={dataReady}
        />
      )}

      <div className="space-y-8">
      {/* Header */}
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-4xl font-bold text-white">
            {greeting}, {firstName}!
          </h1>
          {/* Super Admin Controls */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <SitePauseButton />
              <StudioInvitationButton />
              <Link
                href="/dashboard/admin/digest"
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                title="Send Daily Digest emails"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Digest
              </Link>
            </div>
          )}
        </div>
        <p className="text-gray-400 mb-4">
          {isAdmin ? 'Super Admin Dashboard' : 'Competition Director Dashboard'}
          <span className="ml-2 px-2 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-xs font-semibold">
            {isAdmin ? 'SUPER ADMIN' : 'DIRECTOR'}
          </span>
        </p>
        <MotivationalQuote />

        {/* Super Admin Activity Feed */}
        {isAdmin && <SuperAdminActivityBar />}

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
              <div className="mt-4 bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Action Items
                  </div>
                  <div className="flex items-center justify-center bg-purple-500/30 border border-purple-400/40 rounded-full w-7 h-7">
                    <span className="text-xs font-bold text-purple-200">{badgeCount}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  {pendingCount > 0 && (
                    <div className="bg-gradient-to-r from-yellow-500/15 to-yellow-600/10 border border-yellow-400/40 text-yellow-100 px-4 py-2.5 rounded-lg font-semibold flex items-center gap-3 hover:from-yellow-500/20 hover:to-yellow-600/15 transition-all shadow-sm">
                      <div className="flex items-center justify-center bg-yellow-500/30 rounded-full w-7 h-7 flex-shrink-0">
                        <svg className="w-4 h-4 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-yellow-200 font-bold">{pendingCount} Reservation{pendingCount !== 1 ? 's' : ''} Awaiting Review</div>
                        <div className="text-yellow-300/70 text-[10px] mt-0.5">Action required</div>
                      </div>
                    </div>
                  )}
                  {summarizedCount > 0 && (
                    <div className="bg-gradient-to-r from-blue-500/15 to-blue-600/10 border border-blue-400/40 text-blue-100 px-4 py-2.5 rounded-lg font-semibold flex items-center gap-3 hover:from-blue-500/20 hover:to-blue-600/15 transition-all shadow-sm">
                      <div className="flex items-center justify-center bg-blue-500/30 rounded-full w-7 h-7 flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-blue-200 font-bold">{summarizedCount} New Summar{summarizedCount !== 1 ? 'ies' : 'y'} Received</div>
                        <div className="text-blue-300/70 text-[10px] mt-0.5">Ready to invoice</div>
                      </div>
                    </div>
                  )}
                  {draftInvoicesCount > 0 && (
                    <div className="bg-gradient-to-r from-orange-500/15 to-orange-600/10 border border-orange-400/40 text-orange-100 px-4 py-2.5 rounded-lg font-semibold flex items-center gap-3 hover:from-orange-500/20 hover:to-orange-600/15 transition-all shadow-sm">
                      <div className="flex items-center justify-center bg-orange-500/30 rounded-full w-7 h-7 flex-shrink-0">
                        <svg className="w-4 h-4 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-orange-200 font-bold">{draftInvoicesCount} Unsent Invoice{draftInvoicesCount !== 1 ? 's' : ''}</div>
                        <div className="text-orange-300/70 text-[10px] mt-0.5">Not yet sent to studios</div>
                      </div>
                    </div>
                  )}
                </div>
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

    {/* Feedback Widget */}
    <FeedbackWidget userRole={role === 'super_admin' ? 'super_admin' : 'competition_director'} />
    </>
  );
}
