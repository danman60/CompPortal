import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';
import Link from 'next/link';
import StudiosList from '@/components/StudiosList';

export default async function StudiosPage() {
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

  // Check if user is a competition director or super admin
  const userProfile = await prisma.user_profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const isCompetitionDirector = userProfile?.role === 'competition_director' || userProfile?.role === 'super_admin';

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
            <h1 className="text-4xl font-bold text-white mb-2">{studio ? 'Studio Settings' : 'Studios'}</h1>
            <p className="text-gray-400">{studio ? 'Manage your studio information' : 'Manage dance studios and registrations'}</p>
          </div>
        </div>

        {/* Studios List */}
        <StudiosList
          studioId={studio?.id}
          isCompetitionDirector={isCompetitionDirector}
        />
      </div>
    </main>
  );
}
