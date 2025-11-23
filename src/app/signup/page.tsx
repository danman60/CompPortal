'use client';

import Link from 'next/link';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

/**
 * Signup Page - DISABLED
 *
 * New account creation is disabled. Users must:
 * 1. Studio Directors: Use invitation link from Competition Director
 * 2. Competition Directors: Use credentials provided by Super Admin
 */
export default function SignupPage() {
  const { primaryColor, secondaryColor } = useTenantTheme();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="mb-8 flex justify-center">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${primaryColor || '#FF1493'}, ${secondaryColor || '#EC4899'})`
            }}
          >
            <span className="text-3xl">✨</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 min-h-[420px]">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">New Account Creation Disabled</h1>
            <p className="text-gray-300">
              Please use the invitation link from your email
            </p>
          </div>

          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 mb-6">
            <p className="text-blue-200 text-sm mb-3">
              <strong>Studio Directors:</strong> Check your email for an invitation link from your Competition Director.
            </p>
            <p className="text-blue-200 text-sm">
              <strong>Competition Directors:</strong> Contact the system administrator for credentials.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full text-center text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
              style={{
                background: `linear-gradient(90deg, ${primaryColor || '#FF1493'}, ${secondaryColor || '#EC4899'})`
              }}
            >
              Go to Login
            </Link>

            <Link
              href="/"
              className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-all duration-200 border border-white/20"
            >
              ← Back to Home
            </Link>
          </div>

          <div className="mt-6 text-center text-gray-400 text-xs">
            Need help? Email <a href="mailto:techsupport@compsync.net" className="text-purple-400 hover:text-purple-300 underline">techsupport@compsync.net</a>
          </div>
        </div>
      </div>
    </main>
  );
}
