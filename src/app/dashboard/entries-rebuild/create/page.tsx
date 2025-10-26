import { Suspense } from 'react';
import { EntryCreateForm } from '@/components/rebuild/entries/EntryCreateForm';

/**
 * Entry creation page (REBUILD)
 * Single-page form for creating routine entries
 * Replaces 3-step wizard with streamlined UX
 *
 * Required query params:
 * - reservation: Reservation ID (required)
 * - competition: Competition ID (optional, for context)
 */
export default function EntryCreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-lg">Loading entry form...</div>
        </div>
      }>
        <EntryCreateForm />
      </Suspense>
    </div>
  );
}
