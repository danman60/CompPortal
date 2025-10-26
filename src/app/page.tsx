import Link from 'next/link';
import { demoLoginAction } from './actions/auth';
import { getTenantData } from '@/lib/tenant-context';

export default async function Home() {
  // Get tenant data from subdomain (empwr.compsync.net → EMPWR Dance)
  const tenant = await getTenantData();

  // If no tenant (root domain compsync.net), show professional landing page
  if (!tenant) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="mb-8 flex justify-center">
              <div className="h-24 w-24 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-5xl">✨</span>
              </div>
            </div>

            <h1 className="text-6xl font-bold text-white mb-6">
              CompSync
            </h1>

            <p className="text-2xl text-gray-300 mb-8">
              Professional dance competition management platform
            </p>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
              Streamline your competition operations with multi-tenant architecture,
              real-time updates, and comprehensive reporting for directors and studios.
            </p>
          </div>

          {/* Features Grid */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-8">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-3">Competition Directors</h3>
              <p className="text-gray-400">
                Manage competitions, approve reservations, configure categories and pricing,
                generate reports and invoices.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-8">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-white mb-3">Studio Directors</h3>
              <p className="text-gray-400">
                Register dancers, create entries, submit reservations,
                track invoices and manage studio accounts.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-8">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold text-white mb-3">Multi-Tenant Architecture</h3>
              <p className="text-gray-400">
                Each competition operates on its own subdomain with isolated data,
                custom branding, and independent settings.
              </p>
            </div>
          </div>

          {/* Subdomain Access */}
          <div className="max-w-4xl mx-auto bg-purple-500/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-8 mb-16">
            <h2 className="text-2xl font-semibold text-purple-300 mb-4 text-center">
              Access Your Competition
            </h2>
            <p className="text-gray-300 text-center mb-6">
              Each competition has its own dedicated subdomain. Access your competition portal using:
            </p>
            <div className="bg-black/30 rounded-lg p-4 text-center font-mono text-lg text-purple-300">
              [competition].compsync.net
            </div>
            <p className="text-gray-400 text-sm text-center mt-4">
              Example: empwr.compsync.net, starbound.compsync.net
            </p>
          </div>

          {/* Features List */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Platform Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                'Real-time entry management and capacity tracking',
                'Automated invoice generation and email delivery',
                'Custom branding per competition tenant',
                'Judge scoring interface with live updates',
                'Comprehensive reporting and analytics',
                'Studio onboarding and dancer registration'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="text-purple-400 mt-1">✓</div>
                  <p className="text-gray-300">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="max-w-2xl mx-auto text-center bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Get Started</h2>
            <p className="text-gray-300 mb-6">
              Interested in using CompSync for your competition? Contact us to learn more.
            </p>
            <a
              href="mailto:daniel@streamstage.live"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              Contact: daniel@streamstage.live
            </a>
          </div>

          {/* Footer */}
          <div className="max-w-4xl mx-auto text-center mt-16 pt-8 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              © 2025 CompSync. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Extract tenant branding with consistent fallbacks
  const branding = tenant?.branding || {};
  const tenantName = tenant?.name || 'Competition Portal';
  const tagline = (typeof branding === 'object' && branding.tagline) || 'Professional dance competition management platform';
  const primaryColor = (typeof branding === 'object' && branding.primaryColor) || '#8B5CF6';
  const secondaryColor = (typeof branding === 'object' && branding.secondaryColor) || '#EC4899';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
              }}
            >
              <span className="text-4xl">✨</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white mb-4">
            {tenantName}
          </h1>

          <p className="text-xl text-gray-300 mb-8">
            {tagline}
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
              className="text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              style={{
                background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
              }}
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
              📱 Judge Tablet Interface Demo
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Interactive scoring demo with live sliders - no login required
            </p>
            <Link
              href="/demo/judge-scoring"
              className="inline-block bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              🎯 Try Judge Scoring Demo
            </Link>
            <div className="mt-3 text-xs text-gray-400">
              ✓ Interactive sliders • ✓ Instant feedback • ✓ Touch-optimized
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
