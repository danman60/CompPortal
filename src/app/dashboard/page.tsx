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

  // SECURITY: Block access if user has no tenant_id in metadata
  const userTenantId = user.user_metadata?.tenant_id;
  if (!userTenantId) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Account Setup Required</h1>
          <p className="text-gray-300 mb-6">
            Your account is missing required tenant information. This typically happens after account recovery.
          </p>
          <p className="text-gray-300 mb-6">
            Please contact our support team to complete your account setup:
          </p>
          <a
            href="mailto:techsupport@compsync.net"
            className="inline-block bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Contact techsupport@compsync.net
          </a>
          <div className="mt-6">
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-gray-400 hover:text-white text-sm underline transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </main>
    );
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

  // Get branding colors from tenant (defaults to pink/purple for non-admin)
  const branding = tenant?.branding as any;
  const primaryColor = branding?.primaryColor || '#FF1493';
  const secondaryColor = branding?.secondaryColor || '#EC4899';
  const logoUrl = branding?.logoUrl || null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div
          className="absolute inset-0 bg-gradient-to-br animate-gradient-shift"
          style={{
            backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})`,
            backgroundSize: '200% 200%'
          }}
        ></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header with Navigation */}
        <div className="flex justify-end items-center gap-3 mb-4">
          {role === 'studio_director' && (
            <a
              href="/dashboard/settings/profile"
              className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">⚙️</span>
              <span>Studio Profile</span>
            </a>
          )}
          {role === 'competition_director' && (
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
            logoUrl={logoUrl}
          />
        ) : (
          <CompetitionDirectorDashboard
            userEmail={user.email || ''}
            firstName={userProfile?.first_name || ''}
            role={role as 'competition_director' | 'super_admin'}
            logoUrl={logoUrl}
          />
        )}

        {/* Support Footer */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-400 text-sm">
            Need help? Email{' '}
            <a
              href="mailto:techsupport@compsync.net"
              className="underline hover:opacity-80 transition-opacity"
              style={{ color: primaryColor }}
            >
              techsupport@compsync.net
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
