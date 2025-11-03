import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import StudioDirectorDashboard from '@/components/StudioDirectorDashboard';
import CompetitionDirectorDashboard from '@/components/CompetitionDirectorDashboard';
import { signOutAction } from '@/app/actions/auth';
import { getTenantData } from '@/lib/tenant-context';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get current tenant from subdomain
  const tenant = await getTenantData();
  const tenantId = tenant?.id;

  // Fetch user profile with role
  const userProfile = await prisma.user_profiles.findUnique({
    where: { id: user.id },
    select: { role: true, first_name: true, last_name: true },
  });

  // Fetch studio info if user is a studio director
  let studioName: string | undefined;
  let studioCode: string | null | undefined;
  let studioPublicCode: string | null | undefined;
  let studioStatus: string | null | undefined;
  if (userProfile?.role === 'studio_director') {
    const studio = await prisma.studios.findFirst({
      where: {
        owner_id: user.id,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      select: { name: true, code: true, public_code: true, status: true },
    });
    studioName = studio?.name;
    studioCode = studio?.code;
    studioPublicCode = studio?.public_code;
    studioStatus = studio?.status;

    // Redirect to onboarding if no studio on THIS tenant or no first name
    if (!studio || !userProfile?.first_name) {
      redirect('/onboarding');
    }
  }

  const role = userProfile?.role || 'studio_director';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-500 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header with Studio Profile and Sign Out */}
        <div className="flex justify-end gap-3 mb-4">
          {role === 'studio_director' && (
            <a
              href="/dashboard/settings/profile"
              className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">⚙️</span>
              <span>Studio Profile</span>
            </a>
          )}
          {(role === 'competition_director' || role === 'super_admin') && (
            <a
              href="/dashboard/settings/tenant"
              className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">⚙️</span>
              <span>Competition Settings</span>
            </a>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Role-Based Dashboard */}
        {role === 'studio_director' ? (
          <StudioDirectorDashboard
            userEmail={user.email || ''}
            firstName={userProfile?.first_name || ''}
            studioName={studioName}
            studioCode={studioCode}
            studioPublicCode={studioPublicCode}
            studioStatus={studioStatus}
          />
        ) : (
          <CompetitionDirectorDashboard
            userEmail={user.email || ''}
            firstName={userProfile?.first_name || ''}
            role={role as 'competition_director' | 'super_admin'}
          />
        )}

        {/* Support Footer */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-400 text-sm">
            Need help? Email <a href="mailto:techsupport@compsync.net" className="text-purple-400 hover:text-purple-300 underline">techsupport@compsync.net</a>
          </p>
        </div>

      </div>
    </main>
  );
}
