import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import InvoiceDetail from '@/components/InvoiceDetail';

type Props = {
  params: Promise<{
    studioId: string;
    competitionId: string;
  }>;
};

export default async function InvoiceDetailPage({ params }: Props) {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { studioId, competitionId } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/invoices/all"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Invoices
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Invoice Detail</h1>
          <p className="text-gray-400">Competition routine invoice and breakdown</p>
        </div>

        {/* Invoice Detail */}
        <InvoiceDetail studioId={studioId} competitionId={competitionId} />
      </div>
    </main>
  );
}
