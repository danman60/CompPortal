import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import MusicTrackingDashboard from '@/components/MusicTrackingDashboard';

export const metadata = {
  title: 'Music Tracking - EMPWR',
  description: 'Track music uploads and send reminders',
};

export default async function MusicTrackingPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Only Competition Directors and Super Admins can access this page
  if (profile?.role !== 'competition_director' && profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎵 Music Tracking Dashboard
          </h1>
          <p className="text-gray-300">
            Monitor music uploads and send reminder emails to studios
          </p>
        </div>

        <MusicTrackingDashboard />
      </div>
    </div>
  );
}
