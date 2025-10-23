'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import DancersList from '@/components/DancersList';

export default function DancersPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Dancers</h1>
            <p className="text-gray-400">Manage dancers and competition routines</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/dancers/add"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              <span>➕</span>
              <span>Add Dancers</span>
            </Link>
            <Link
              href="/dashboard/dancers/import"
              className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
            >
              <span>📤</span>
              <span>Import</span>
            </Link>
          </div>
        </div>

        {/* Dancers List */}
        <DancersList />
      </div>
    </main>
  );
}
