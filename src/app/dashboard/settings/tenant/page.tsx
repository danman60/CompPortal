'use client';

import { useRouter } from 'next/navigation';

export default function TenantSettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>

        {/* Under Construction Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-full p-6">
              <svg className="h-16 w-16 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4">
            Under Construction
          </h1>

          <p className="text-xl text-gray-300 mb-6">
            Competition Settings Panel
          </p>

          <div className="max-w-2xl mx-auto space-y-4 text-gray-400">
            <p>
              This feature is currently being developed and will be available after launch.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-white mb-3">
                Need to Update Settings?
              </h3>
              <p className="text-gray-300 mb-4">
                Competition settings (age divisions, dance categories, scoring tiers, etc.) are currently managed by administrators.
              </p>
              <p className="text-gray-300">
                To request changes, please contact:{' '}
                <a
                  href="mailto:danieljohnabrahamson@gmail.com"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  danieljohnabrahamson@gmail.com
                </a>
              </p>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Coming Soon
              </h3>
              <ul className="text-left text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Edit age divisions and requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Customize dance categories and styles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Configure entry size categories and pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Set up scoring rubrics and award tiers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Manage competition-specific overrides</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
