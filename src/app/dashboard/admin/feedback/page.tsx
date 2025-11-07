import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import FeedbackAdminPanel from '@/components/FeedbackAdminPanel';

/**
 * Feedback Admin Panel
 *
 * Super Admin only page for reviewing user feedback submissions.
 * Features:
 * - View all feedback with filters (status, type, date)
 * - Update feedback status (new → reviewed → actioned → archived)
 * - Add admin notes
 * - Stats dashboard (total, by type, avg rating)
 * - Send digest now button
 *
 * Created: November 7, 2025
 */
export default async function FeedbackAdminPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Super Admin only
  const userProfile = await prisma.user_profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (userProfile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FeedbackAdminPanel />
    </div>
  );
}
