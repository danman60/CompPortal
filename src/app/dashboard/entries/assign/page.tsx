import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DancerAssignmentPanel from '@/components/DancerAssignmentPanel';

export default async function AssignDancersPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch studio for studio directors
  const studio = await prisma.studios.findFirst({
    where: { owner_id: user.id },
    select: { id: true, name: true },
  });

  if (!studio) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-200 mb-2">Studio Not Found</h2>
            <p className="text-yellow-300 mb-4">
              You need to be associated with a studio to assign dancers.
            </p>
            <Link href="/dashboard" className="text-yellow-400 hover:text-yellow-300 underline">
              ← Back to Dashboard
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
            href="/dashboard/entries"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Routines
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Assign Dancers to Routines</h1>
          <p className="text-gray-400">
            {studio.name} · Click a routine to select it, then click dancers to assign them
          </p>
        </div>

        {/* Assignment Panel */}
        <DancerAssignmentPanel studioId={studio.id} />
      </div>
    </main>
  );
}
