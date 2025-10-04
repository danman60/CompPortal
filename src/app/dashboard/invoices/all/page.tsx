import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AllInvoicesList from '@/components/AllInvoicesList';

export default async function AllInvoicesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Check if user is a competition director (NOT a studio director)
  const isStudioDirector = await prisma.studios.findFirst({
    where: { owner_id: user.id },
    select: { id: true },
  });

  // Only competition directors (non-studio owners) can access this page
  if (isStudioDirector) {
    redirect('/dashboard');
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
