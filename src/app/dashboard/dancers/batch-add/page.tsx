import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';
import Link from 'next/link';
import DancerBatchForm from '@/components/DancerBatchForm';

export default async function BatchAddDancersPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get current tenant from subdomain
  const tenant = await getTenantData();
  const tenantId = tenant?.id;

  // Fetch user profile to get role and studio
  const userProfile = await prisma.user_profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  // Fetch studio if user is a studio director on THIS tenant
  let studioId: string | undefined;
  let studioName: string | undefined;
  if (userProfile?.role === 'studio_director') {
    const studio = await prisma.studios.findFirst({
      where: {
        owner_id: user.id,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      select: { id: true, name: true },
    });
    studioId = studio?.id;
    studioName = studio?.name;

    if (!studioId) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
          <div className="container mx-auto px-4 py-8">
            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-200 mb-2">No Studio Found</h2>
              <p className="text-red-300 mb-4">
                You need to be associated with a studio to create dancers.
              </p>
              <Link
                href="/dashboard/dancers"
                className="text-red-400 hover:text-red-300 underline"
              >
                ← Back to Dancers
              </Link>
            </div>
          </div>
        </main>
      );
    }
  } else {
    // For admins, batch add requires studio selection
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-200 mb-2">Studio Directors Only</h2>
            <p className="text-yellow-300 mb-4">
              Batch add is currently available for studio directors only. Admins should use CSV import.
            </p>
            <Link
              href="/dashboard/dancers/import"
              className="text-yellow-400 hover:text-yellow-300 underline"
            >
              Go to CSV Import →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/dancers"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Dancers
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Batch Add Dancers</h1>
          <p className="text-gray-400">
            Add multiple dancers at once using the table below · Studio: {studioName}
          </p>
        </div>

        {/* Batch Form */}
        <DancerBatchForm studioId={studioId!} />
      </div>
    </main>
  );
}
