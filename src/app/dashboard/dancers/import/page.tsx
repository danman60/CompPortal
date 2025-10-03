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

        {/* Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">CSV Format Instructions</h2>

          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">Required Columns:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="text-purple-400">first_name</code> - Dancer's first name</li>
                <li><code className="text-purple-400">last_name</code> - Dancer's last name</li>
                <li><code className="text-purple-400">studio_code</code> - 5-character studio code</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Optional Columns:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="text-purple-400">date_of_birth</code> - Format: YYYY-MM-DD</li>
                <li><code className="text-purple-400">gender</code> - Male or Female</li>
                <li><code className="text-purple-400">email</code> - Dancer's email address</li>
                <li><code className="text-purple-400">phone</code> - Phone number</li>
                <li><code className="text-purple-400">parent_name</code> - Parent/guardian name</li>
                <li><code className="text-purple-400">parent_email</code> - Parent email</li>
                <li><code className="text-purple-400">parent_phone</code> - Parent phone</li>
                <li><code className="text-purple-400">registration_number</code> - Unique registration ID</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Example CSV:</h3>
              <div className="bg-black/40 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="text-green-400">
{`first_name,last_name,studio_code,date_of_birth,gender,email
Jane,Smith,ABC12,2010-05-15,Female,jane@example.com
John,Doe,ABC12,2008-03-22,Male,john@example.com`}
                </pre>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
              <p className="text-yellow-200">
                <strong>Note:</strong> Make sure your studio code exists in the system before importing dancers.
                Invalid studio codes will cause the import to fail for those rows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
