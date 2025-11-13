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
  const { studioId, competitionId } = await params;

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch user role to conditionally show navigation
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isCD = userProfile?.role === 'competition_director' || userProfile?.role === 'super_admin';

  // UX Isolation: Verify Studio Director owns the studio they're viewing
  if (userProfile?.role === 'studio_director') {
    const { data: userStudio } = await supabase
      .from('studios')
      .select('id')
      .eq('id', studioId)
      .eq('owner_id', user.id)
      .single();

    if (!userStudio) {
      redirect('/dashboard/invoices'); // Redirect to their own invoices
    }
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
