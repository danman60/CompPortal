import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import StudioDirectorDashboard from '@/components/StudioDirectorDashboard';
import CompetitionDirectorDashboard from '@/components/CompetitionDirectorDashboard';
import { signOutAction } from '@/app/actions/auth';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch user profile with role
  const userProfile = await prisma.user_profiles.findUnique({
    where: { id: user.id },
    select: { role: true, first_name: true, last_name: true },
  });

  // Fetch studio info if user is a studio director
  let studioName: string | undefined;
  if (userProfile?.role === 'studio_director') {
    const studio = await prisma.studios.findFirst({
      where: { owner_id: user.id },
      select: { name: true },
    });
    studioName = studio?.name;
  }

  const role = userProfile?.role || 'studio_director';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Sign Out */}
        <div className="flex justify-end mb-4">
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
          <StudioDirectorDashboard userEmail={user.email || ''} studioName={studioName} />
        ) : (
          <CompetitionDirectorDashboard
            userEmail={user.email || ''}
            role={role as 'competition_director' | 'super_admin'}
          />
        )}
      </div>
    </main>
  );
}
