import Link from 'next/link';
import StudioDirectorStats from './StudioDirectorStats';
import SortableDashboardCards, { DashboardCard } from './SortableDashboardCards';
import MotivationalQuote from './MotivationalQuote';

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
    icon: '💃',
    title: 'My Dancers',
    description: 'Register and manage dancers',
  },
  {
    id: 'routines',
    href: '/dashboard/entries',
    icon: '🎭',
    title: 'My Routines',
    description: 'Create and edit routines',
  },
  {
    id: 'reservations',
    href: '/dashboard/reservations',
    icon: '📋',
    title: 'My Reservations',
    description: 'Reserve routines for events',
  },
  {
    id: 'results',
    href: '/dashboard/scoreboard',
    icon: '🏆',
    title: 'Results',
    description: 'View competition scores',
  },
  {
    id: 'invoices',
    href: '/dashboard/invoices',
    icon: '💰',
    title: 'My Invoices',
    description: 'View studio billing',
  },
  {
    id: 'music',
    href: '/dashboard/music',
    icon: '🎵',
    title: 'Music Tracking',
    description: 'Monitor music file uploads',
  },
];

export default function StudioDirectorDashboard({ userEmail, firstName, studioName, studioStatus }: StudioDirectorDashboardProps) {
  return (
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
          href="/dashboard/studios"
          className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 px-4 py-2 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-white font-semibold">Studio Settings</span>
        </Link>
      </div>

      {/* Stats */}
      <StudioDirectorStats />

      {/* Quick Actions - Studio Director View */}
      <SortableDashboardCards cards={STUDIO_DIRECTOR_CARDS} />

      {/* Recent Activity */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">💡 Getting Started</h2>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <span className="text-purple-400 font-bold">1.</span>
            <p>Reserve your routines in <Link href="/dashboard/reservations" className="text-purple-400 hover:underline">Reservations</Link></p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-purple-400 font-bold">2.</span>
            <p>Turn approved reservations into routines in <Link href="/dashboard/entries" className="text-purple-400 hover:underline">My Routines</Link></p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-purple-400 font-bold">3.</span>
            <p>Upload music for each routine</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-purple-400 font-bold">4.</span>
            <p>Add your dancers in the <Link href="/dashboard/dancers" className="text-purple-400 hover:underline">Dancers</Link> section</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-purple-400 font-bold">5.</span>
            <p>Assign dancers to routines</p>
          </div>
        </div>
      </div>
    </div>
  );
}
