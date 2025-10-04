import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import CompetitionSettingsForm from '@/components/CompetitionSettingsForm';

export default async function CompetitionSettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch user profile with role
  const userProfile = await prisma.user_profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  // Only competition_director and super_admin can access settings
  if (userProfile?.role !== 'competition_director' && userProfile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ⚙️ Competition Settings
          </h1>
          <p className="text-white/80">
            Configure routine types, age divisions, classifications, and more
          </p>
        </div>

        {/* Settings Form */}
        <CompetitionSettingsForm />
      </div>
    </main>
  );
}
