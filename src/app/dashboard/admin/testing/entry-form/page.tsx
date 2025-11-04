import { Suspense } from 'react';
import { EntryCreateFormV2 } from '@/components/rebuild/entries/EntryCreateFormV2';

/**
 * SA Testing Route for New Entry Form
 * Hidden from SDs - only accessible to Super Admins
 * Test URL: /dashboard/admin/testing/entry-form?reservation=<reservation_id>
 */
export default function SAEntryFormTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
          <h1 className="text-xl font-bold text-blue-300 mb-2">🧪 SA Testing: New Entry Form</h1>
          <p className="text-sm text-blue-200">
            This is the SA-only testing route for the new entry form with classification auto-calculation.
            SDs cannot access this route.
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-lg">Loading entry form...</div>
        </div>
      }>
        <EntryCreateFormV2 />
      </Suspense>
    </div>
  );
}
