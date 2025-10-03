import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import MusicUploadForm from '@/components/MusicUploadForm';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EntryMusicPage({ params }: Props) {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/entries"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Entries
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Upload Music</h1>
          <p className="text-gray-400">Upload the music file for your competition entry</p>
        </div>

        {/* Music Upload Form */}
        <MusicUploadForm entryId={id} />
      </div>
    </main>
  );
}
