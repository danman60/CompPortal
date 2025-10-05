import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import EntryForm from '@/components/EntryForm';

interface EditEntryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const supabase = await createServerSupabaseClient();
  const { id } = await params;

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/entries/${id}`}
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Routine Details
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Edit Competition Routine</h1>
          <p className="text-gray-400">Modify your routine registration details</p>
        </div>

        {/* Routine Form with existing entry ID */}
        <EntryForm entryId={id} />
      </div>
    </main>
  );
}
