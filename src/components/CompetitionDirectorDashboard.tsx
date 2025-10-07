import Link from 'next/link';
import DashboardStats from './DashboardStats';
import SortableDashboardCards, { DashboardCard } from './SortableDashboardCards';

interface CompetitionDirectorDashboardProps {
  userEmail: string;
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
    href: '/dashboard/entries',
    icon: '🎭',
    title: 'Routines',
    description: 'View all event routines',
  },
  {
    id: 'scheduling',
    href: '/dashboard/scheduling',
    icon: '📅',
    title: 'Scheduling',
    description: 'Event schedule',
  },
  {
    id: 'judges',
    href: '/dashboard/judges',
    icon: '👨‍⚖️',
    title: 'Judges',
    description: 'Judge management',
  },
  {
    id: 'scoring',
    href: '/dashboard/scoring',
    icon: '💯',
    title: 'Scoring',
    description: 'Judge tablet interface',
  },
  {
    id: 'scoreboard',
    href: '/dashboard/scoreboard',
    icon: '🏆',
    title: 'Scoreboard',
    description: 'Live scores & rankings',
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
    id: 'music',
    href: '/dashboard/music-tracking',
    icon: '🎵',
    title: 'Music Tracking',
    description: 'Monitor uploads & reminders',
  },
];

export default function CompetitionDirectorDashboard({ userEmail, role }: CompetitionDirectorDashboardProps) {
  const isAdmin = role === 'super_admin';

  // Add settings card for super admins
  const dashboardCards = isAdmin
    ? [
        ...CD_DASHBOARD_CARDS,
        {
          id: 'settings',
          href: '/dashboard/settings',
          icon: '⚙️',
          title: 'Settings',
          description: 'System configuration',
        },
      ]
    : CD_DASHBOARD_CARDS;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-white mb-2">
          {isAdmin ? 'Super Admin Dashboard' : 'Competition Director Dashboard'}
        </h1>
        <p className="text-gray-400">
          Welcome back, {userEmail}
          <span className="ml-2 px-2 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-xs font-semibold">
            {isAdmin ? 'SUPER ADMIN' : 'DIRECTOR'}
          </span>
        </p>
      </div>

      {/* Global Stats */}
      <DashboardStats role={role} />

      {/* Admin Actions */}
      <SortableDashboardCards cards={dashboardCards} />

      {/* Quick Info */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">🎯 Admin Responsibilities</h2>
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
  );
}
