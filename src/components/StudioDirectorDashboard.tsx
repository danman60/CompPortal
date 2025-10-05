import Link from 'next/link';
import StudioDirectorStats from './StudioDirectorStats';

interface StudioDirectorDashboardProps {
  userEmail: string;
  studioName?: string;
  studioStatus?: string | null;
}

export default function StudioDirectorDashboard({ userEmail, studioName, studioStatus }: StudioDirectorDashboardProps) {
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
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          My Studio Dashboard
        </h1>
        <p className="text-gray-400">
          Welcome back, {userEmail}
          {studioName && <span className="text-purple-400"> • {studioName}</span>}
        </p>
      </div>

      {/* Stats */}
      <StudioDirectorStats />

      {/* Quick Actions - Studio Director View */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Manage Dancers */}
          <Link
            href="/dashboard/dancers"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">💃</div>
              <div>
                <h3 className="text-xl font-semibold text-white">My Dancers</h3>
                <p className="text-gray-400 text-sm">Register and manage dancers</p>
              </div>
            </div>
          </Link>

          {/* My Routines */}
          <Link
            href="/dashboard/entries"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎭</div>
              <div>
                <h3 className="text-xl font-semibold text-white">My Routines</h3>
                <p className="text-gray-400 text-sm">Create and edit routines</p>
              </div>
            </div>
          </Link>

          {/* Music Tracking */}
          <Link
            href="/dashboard/music"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎵</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Music Tracking</h3>
                <p className="text-gray-400 text-sm">Monitor music file uploads</p>
              </div>
            </div>
          </Link>

          {/* Studio Settings */}
          <Link
            href="/dashboard/studios"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">⚙️</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Studio Settings</h3>
                <p className="text-gray-400 text-sm">Update studio information</p>
              </div>
            </div>
          </Link>

          {/* My Reservations */}
          <Link
            href="/dashboard/reservations"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="text-xl font-semibold text-white">My Reservations</h3>
                <p className="text-gray-400 text-sm">Reserve routines for events</p>
              </div>
            </div>
          </Link>

          {/* Invoices */}
          <Link
            href="/dashboard/invoices"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">💰</div>
              <div>
                <h3 className="text-xl font-semibold text-white">My Invoices</h3>
                <p className="text-gray-400 text-sm">View studio billing</p>
              </div>
            </div>
          </Link>

          {/* Scoreboard */}
          <Link
            href="/dashboard/scoreboard"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🏆</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Results</h3>
                <p className="text-gray-400 text-sm">View competition scores</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

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
