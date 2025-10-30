import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';
import Link from 'next/link';
import InvoicesList from '@/components/InvoicesList';

export default async function InvoicesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get current tenant from subdomain
  const tenant = await getTenantData();
  const tenantId = tenant?.id;

  // Check if user owns a studio on THIS tenant (studio director)
  const studio = await prisma.studios.findFirst({
    where: {
      owner_id: user.id,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    select: { id: true },
  });

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
          <h1 className="text-4xl font-bold text-white mb-2">Invoices</h1>
          <p className="text-gray-400">View and manage studio invoices for competitions</p>
        </div>

        {/* Invoices List */}
        <InvoicesList studioId={studio?.id} />
      </div>
    </main>
  );
}
