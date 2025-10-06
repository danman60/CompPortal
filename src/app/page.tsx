import Link from 'next/link';
import { demoLoginAction } from './actions/auth';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-500 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">✨</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white mb-4">
            GlowDance Competition Portal
          </h1>

          <p className="text-xl text-gray-300 mb-8">
            Professional dance competition management platform
          </p>

          <div className="bg-yellow-500/20 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6 mb-8">
            <h2 className="text-xl font-semibold text-yellow-400 mb-3">
              🚀 Quick Testing Login (No Auth Required)
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              One-click demo login for rapid testing
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <form action={demoLoginAction.bind(null, 'studio_director')}>
                <button
                  type="submit"
                  className="w-full bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 px-4 py-3 rounded-lg border border-blue-400/30 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-2xl mb-1">🏢</div>
                  <div className="font-semibold">Studio Director</div>
                  <div className="text-xs opacity-75">My studio data only</div>
                </button>
              </form>
              <form action={demoLoginAction.bind(null, 'competition_director')}>
                <button
                  type="submit"
                  className="w-full bg-purple-500/30 hover:bg-purple-500/50 text-purple-300 px-4 py-3 rounded-lg border border-purple-400/30 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="font-semibold">Competition Director</div>
                  <div className="text-xs opacity-75">All studios access</div>
                </button>
              </form>
              <form action={demoLoginAction.bind(null, 'super_admin')}>
                <button
                  type="submit"
                  className="w-full bg-red-500/30 hover:bg-red-500/50 text-red-300 px-4 py-3 rounded-lg border border-red-400/30 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-2xl mb-1">👑</div>
                  <div className="font-semibold">Super Admin</div>
                  <div className="text-xs opacity-75">Full system access</div>
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-8 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-emerald-400/30 p-6">
            <h2 className="text-xl font-semibold text-emerald-400 mb-3">
              📱 Judge Tablet Interface
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Tablet-optimized scoring interface for live competitions
            </p>
            <Link
              href="/dashboard/scoring"
              className="inline-block bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              🎯 Open Judge Scoring Interface
            </Link>
            <div className="mt-3 text-xs text-gray-400">
              ✓ Real-time scoring • ✓ Offline capable • ✓ Touch-optimized
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
