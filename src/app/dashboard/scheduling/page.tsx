import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import SchedulingManager from '@/components/SchedulingManager';

export default async function SchedulingPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            📅 Event Scheduling
          </h1>
          <p className="text-gray-300">
            Manage event sessions, assign routines, and resolve conflicts
          </p>
        </div>

        {/* Scheduling Manager Component */}
        <SchedulingManager />
      </div>
    </div>
  );
}
