import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import EntriesList from '@/components/EntriesList';

export default async function EntriesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

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
            <h1 className="text-4xl font-bold text-white mb-2">My Routines</h1>
            <p className="text-gray-400">Manage your competition routines</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/entries/assign"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              <span>👥</span>
              <span>Assign Dancers</span>
            </Link>
            <Link
              href="/dashboard/entries/create"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              ➕ Create Routine
            </Link>
          </div>
        </div>

        {/* Entries List */}
        <EntriesList />
      </div>
    </main>
  );
}
