'use client';

import { useRouter } from 'next/navigation';
import CompetitionSettingsDisplay from '@/components/CompetitionSettingsDisplay';

export default function TenantSettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ⚙️ Competition Settings
          </h1>
          <p className="text-white/80">
            View your tenant-specific competition settings
          </p>
        </div>

        {/* Settings Display */}
        <CompetitionSettingsDisplay />
      </div>
    </main>
  );
}
