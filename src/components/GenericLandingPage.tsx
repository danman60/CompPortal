'use client';

import Link from 'next/link';

export default function GenericLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">✨</span>
            </div>
          </div>

          {/* Hero */}
          <h1 className="text-5xl font-bold text-white mb-4">
            CompSync
          </h1>

          <p className="text-xl text-gray-300 mb-8">
            Professional dance competition management platform
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-lg font-semibold text-white mb-2">Studio Management</h3>
              <p className="text-gray-300 text-sm">Manage dancers, registrations, and competition entries</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Event Operations</h3>
              <p className="text-gray-300 text-sm">Handle reservations, scheduling, and capacity management</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="text-3xl mb-3">💯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Judge Scoring</h3>
              <p className="text-gray-300 text-sm">Tablet-optimized scoring interface with real-time results</p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Interested in CompSync?</h2>
            <p className="text-gray-300 mb-6">
              Contact us to learn more about bringing CompSync to your competition
            </p>
            <a
              href="mailto:daniel@streamstage.live"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              📧 Contact: daniel@streamstage.live
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
