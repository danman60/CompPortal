import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import DashboardStats from '@/components/DashboardStats';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              GlowDance Dashboard
            </h1>
            <p className="text-gray-400">Welcome back, {user.email}</p>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Stats Dashboard */}
        <DashboardStats />

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/dashboard/studios"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🏢</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Studios</h3>
                <p className="text-gray-400 text-sm">Manage dance studios</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/dancers"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">💃</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Dancers</h3>
                <p className="text-gray-400 text-sm">Manage dancers</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/entries"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎭</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Entries</h3>
                <p className="text-gray-400 text-sm">Competition entries</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/reservations"
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Reservations</h3>
                <p className="text-gray-400 text-sm">Capacity tracking</p>
              </div>
            </div>
          </Link>

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
        </div>
      </div>
    </main>
  );
}
