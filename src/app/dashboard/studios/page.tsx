import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import StudiosList from '@/components/StudiosList';

export default async function StudiosPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Check if user owns a studio (studio director)
  const studio = await prisma.studios.findFirst({
    where: { owner_id: user.id },
    select: { id: true },
  });

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
        <StudiosList studioId={studio?.id} />
      </div>
    </main>
  );
}
