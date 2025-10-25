import Link from 'next/link';
import { Button } from '@/components/rebuild/ui/Button';

/**
 * Header for Entries rebuild page
 * Shows title and action buttons
 */
export function EntriesHeader() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard"
        className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
      >
        ← Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-white">My Routines</h1>

        <div className="flex gap-3">
          <Button href="/dashboard/entries/create" variant="primary">
            Create Routine
          </Button>
        </div>
      </div>
    </div>
  );
}
