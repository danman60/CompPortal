import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import DancerCSVImport from '@/components/DancerCSVImport';

export default async function DancerImportPage() {
  const supabase = await createServerSupabaseClient();

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
            href="/dashboard/dancers"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Dancers
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Import Dancers</h1>
          <p className="text-gray-400">Upload a CSV file to bulk import dancers</p>
        </div>

        {/* CSV Import Component */}
        <DancerCSVImport />
      </div>
    </main>
  );
}
