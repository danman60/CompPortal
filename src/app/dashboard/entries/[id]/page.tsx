import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import EntryDetails from '@/components/EntryDetails';

interface EntryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EntryPage({ params }: EntryPageProps) {
  const supabase = await createServerSupabaseClient();
  const { id } = await params;

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/entries"
              className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 transition-colors"
            >
              ← Back to Routines
            </Link>
            <h1 className="text-4xl font-bold text-white">Routine Details</h1>
            <p className="text-gray-400">View competition routine information</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/entries/${id}/edit`}
              className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              ✏️ Edit Routine
            </Link>
            <Link
              href={`/dashboard/entries/${id}/music`}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              🎵 Manage Music
            </Link>
          </div>
        </div>

        {/* Routine Details Component */}
        <EntryDetails entryId={id} />
      </div>
    </main>
  );
}
