import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import { EntryEditForm } from '@/components/rebuild/entries/EntryEditForm';

/**
 * Entry Edit Page
 * Allows editing of existing routine entries
 * Implements conditional field disabling when entry is summarized
 */
export default async function EntryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  // Fetch user profile to get role
  const profile = await prisma.user_profiles.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  // Fetch entry with all necessary relations
  const entry = await prisma.competition_entries.findUnique({
    where: { id },
    include: {
      studios: {
        select: {
          id: true,
          name: true,
          owner_id: true,
        },
      },
      competitions: {
        select: {
          id: true,
          name: true,
          year: true,
          competition_start_date: true,
        },
      },
      reservations: {
        select: {
          id: true,
          status: true,
        },
      },
      entry_participants: {
        include: {
          dancers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              date_of_birth: true,
            },
          },
        },
        orderBy: { display_order: 'asc' },
      },
      age_groups: true,
      dance_categories: true,
      classifications: true,
      entry_size_categories: true,
    },
  });

  if (!entry) {
    redirect('/dashboard/entries');
  }

  // Authorization check: user must own the studio
  // Competition directors and super admins can edit any entry
  const userRole = profile?.role;
  const isAdmin = userRole === 'competition_director' || userRole === 'super_admin';

  if (!isAdmin && entry.studios.owner_id !== user.id) {
    redirect('/dashboard/entries');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Edit Routine</h1>
        <p className="text-gray-300">
          {entry.competitions.name} {entry.competitions.year} - {entry.studios.name}
        </p>
      </div>

      <EntryEditForm entry={entry} />
    </div>
  );
}
