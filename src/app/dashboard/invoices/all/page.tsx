'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import AllInvoicesList from '@/components/AllInvoicesList';

// Force client-side rendering to avoid SSR window errors
export const dynamic = 'force-dynamic';

export default function AllInvoicesPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      // Check if user is CD or SA - SDs should NOT access global invoices
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['competition_director', 'super_admin'].includes(profile.role)) {
        // SD trying to access global invoices - redirect to their studio invoices
        router.push('/dashboard/invoices');
        return;
      }

      setIsChecking(false);
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
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Global Invoices</h1>
          <p className="text-gray-400">
            View and manage invoices for all studios across all events
          </p>
        </div>

        {/* All Invoices List */}
        <AllInvoicesList />
      </div>
    </main>
  );
}
