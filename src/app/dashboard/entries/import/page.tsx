import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import Link from 'next/link';
import RoutineCSVImport from '@/components/RoutineCSVImport';

export default async function RoutineImportPage() {
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
            href="/dashboard/entries"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Entries
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Import Routines</h1>
          <p className="text-gray-400">Upload a CSV or Excel file to bulk import routines</p>
        </div>

        {/* CSV Import Component */}
        <RoutineCSVImport />

        {/* Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">CSV Format Instructions</h2>

          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">Required Columns:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="text-purple-400">title</code> (or "Routine Title", "Routine Name") - Routine's title</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Optional Columns:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="text-purple-400">props</code> (or "Prop", "Special Requirements") - Props needed for routine</li>
                <li><code className="text-purple-400">dancers</code> (or "Participants", "Performers") - Names of dancers</li>
                <li><code className="text-purple-400">choreographer</code> (or "Choreo", "Teacher", "Instructor") - Choreographer name</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Example CSV:</h3>
              <div className="bg-black/40 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="text-green-400">
{`Title,Props,Dancers,Choreographer
My Amazing Routine,Hat & Cane,John Doe & Jane Smith,Sarah Johnson
Solo Performance,None,Emily Brown,Michael Davis`}
                </pre>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
              <p className="text-green-200">
                <strong>✓ Ultra Flexible:</strong> This import is forgiving with header names.
                The system will automatically match columns like "ROUTINE TITLE" to "title" and "Prop List" to "props".
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
