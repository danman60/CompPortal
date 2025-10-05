import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import StudioApprovalList from '@/components/StudioApprovalList';

export default async function AdminStudiosPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Check if user is an admin (Competition Director or Super Admin)
  const userRecord = await prisma.users.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  // Only allow Competition Directors and Super Admins
  if (!userRecord || userRecord.role === 'studio_director') {
    redirect('/dashboard');
  }

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
          <h1 className="text-4xl font-bold text-white mb-2">Studio Management</h1>
          <p className="text-gray-400">Approve or reject studio registration requests</p>
        </div>

        {/* Studio Approval List */}
        <StudioApprovalList />
      </div>
    </main>
  );
}
