import Link from 'next/link';
import DashboardStats from './DashboardStats';

interface CompetitionDirectorDashboardProps {
  userEmail: string;
  role: 'competition_director' | 'super_admin';
}

export default function CompetitionDirectorDashboard({ userEmail, role }: CompetitionDirectorDashboardProps) {
  const isAdmin = role === 'super_admin';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
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
      <DashboardStats />

      {/* Admin Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* All Studios */}
          <Link
            href="/dashboard/studios"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🏢</div>
              <div>
                <h3 className="text-xl font-semibold text-white">All Studios</h3>
                <p className="text-gray-400 text-sm">View all dance studios</p>
              </div>
            </div>
          </Link>

          {/* Manage Reservations */}
          <Link
            href="/dashboard/reservations"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Reservations</h3>
                <p className="text-gray-400 text-sm">Approve & manage</p>
              </div>
            </div>
          </Link>

          {/* All Entries */}
          <Link
            href="/dashboard/entries"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎭</div>
              <div>
                <h3 className="text-xl font-semibold text-white">All Entries</h3>
                <p className="text-gray-400 text-sm">Competition entries</p>
              </div>
            </div>
          </Link>

          {/* Scheduling */}
          <Link
            href="/dashboard/scheduling"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">📅</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Scheduling</h3>
                <p className="text-gray-400 text-sm">Competition schedule</p>
              </div>
            </div>
          </Link>

          {/* Dancers */}
          <Link
            href="/dashboard/dancers"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">💃</div>
              <div>
                <h3 className="text-xl font-semibold text-white">All Dancers</h3>
                <p className="text-gray-400 text-sm">View all dancers</p>
              </div>
            </div>
          </Link>

          {/* Judges */}
          <Link
            href="/dashboard/judges"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">👨‍⚖️</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Judges</h3>
                <p className="text-gray-400 text-sm">Judge management</p>
              </div>
            </div>
          </Link>

          {/* Scoring */}
          <Link
            href="/dashboard/scoring"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">💯</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Scoring</h3>
                <p className="text-gray-400 text-sm">Judge tablet interface</p>
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
                <h3 className="text-xl font-semibold text-white">Scoreboard</h3>
                <p className="text-gray-400 text-sm">Live scores & rankings</p>
              </div>
            </div>
          </Link>

          {/* Analytics */}
          <Link
            href="/dashboard/analytics"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">📊</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Analytics</h3>
                <p className="text-gray-400 text-sm">Insights & metrics</p>
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
                <h3 className="text-xl font-semibold text-white">Invoices</h3>
                <p className="text-gray-400 text-sm">Studio invoices</p>
              </div>
            </div>
          </Link>

          {/* Email Templates */}
          <Link
            href="/dashboard/emails"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">📨</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Emails</h3>
                <p className="text-gray-400 text-sm">Email templates</p>
              </div>
            </div>
          </Link>

          {/* System Settings (Super Admin Only) */}
          {isAdmin && (
            <Link
              href="/dashboard/settings"
              className="bg-gradient-to-br from-red-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border border-red-400/30 p-6 hover:from-red-500/30 hover:to-orange-500/30 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">⚙️</div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Settings</h3>
                  <p className="text-red-300 text-sm">System configuration</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">🎯 Admin Responsibilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Reservation Management</h3>
            <ul className="space-y-1 text-sm">
              <li>• Approve or reject studio reservation requests</li>
              <li>• Allocate competition entry tokens (600 per competition)</li>
              <li>• Monitor capacity across all studios</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Competition Operations</h3>
            <ul className="space-y-1 text-sm">
              <li>• Schedule competition sessions and heats</li>
              <li>• Assign judges to panels</li>
              <li>• Monitor entry submissions across all studios</li>
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
