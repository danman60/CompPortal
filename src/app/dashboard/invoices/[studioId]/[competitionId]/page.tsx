'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InvoiceDetail from '@/components/InvoiceDetail';
import { trpc } from '@/lib/trpc';

type Props = {
  params: Promise<{
    studioId: string;
    competitionId: string;
  }>;
};

export default function InvoiceDetailPage({ params }: Props) {
  const router = useRouter();
  const [studioId, setStudioId] = useState<string>('');
  const [competitionId, setCompetitionId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then(({ studioId: sid, competitionId: cid }) => {
      setStudioId(sid);
      setCompetitionId(cid);
      setIsReady(true);
    });
  }, [params]);

  // Get current user
  const { data: userProfile, isLoading } = trpc.user.getCurrentUser.useQuery(undefined, {
    enabled: isReady,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !userProfile) {
      router.push('/login');
    }
  }, [userProfile, isLoading, router]);

  const isCD = userProfile?.role === 'competition_director' || userProfile?.role === 'super_admin';

  if (!isReady || isLoading || !userProfile) {
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
          <div className="flex gap-4 mb-2">
            {isCD && (
              <Link
                href="/dashboard/reservation-pipeline"
                className="text-blue-400 hover:text-blue-300 text-sm inline-block"
              >
                ← Back to Pipeline
              </Link>
            )}
            <Link
              href="/dashboard/invoices"
              className="text-purple-400 hover:text-purple-300 text-sm inline-block"
            >
              ← Back to Invoices
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Invoice Detail</h1>
          <p className="text-gray-400">Competition routine invoice and breakdown</p>
        </div>

        {/* Invoice Detail */}
        <InvoiceDetail studioId={studioId} competitionId={competitionId} />
      </div>
    </main>
  );
}
