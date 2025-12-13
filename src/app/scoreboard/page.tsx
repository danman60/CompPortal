'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Default test competition for tester environment
const DEFAULT_TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

export default function ScoreboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/scoreboard/${DEFAULT_TEST_COMPETITION_ID}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <div className="text-gray-300 text-2xl font-medium">Redirecting to Scoreboard...</div>
      </div>
    </div>
  );
}
