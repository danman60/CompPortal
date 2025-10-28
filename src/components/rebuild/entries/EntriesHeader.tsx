import Link from 'next/link';
import { Button } from '@/components/rebuild/ui/Button';

interface EntriesHeaderProps {
  selectedReservationId?: string;
  selectedCompetitionId?: string;
  isRegistrationClosed?: boolean;
}

/**
 * Header for Entries rebuild page
 * Shows title and action buttons
 */
export function EntriesHeader({ selectedReservationId, selectedCompetitionId, isRegistrationClosed = false }: EntriesHeaderProps) {
  // Build create URL with context
  const createUrl = selectedReservationId
    ? `/dashboard/entries/create?reservation=${selectedReservationId}`
    : '/dashboard/entries/create';

  return (
    <div className="mb-6">
      <Link
        href="/dashboard"
        className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
      >
        ← Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-bold text-white">My Routines</h1>
          <span className="px-3 py-1 bg-purple-500/30 border border-purple-400/50 rounded-full text-purple-200 text-sm font-bold">
            🔨 REBUILD
          </span>
        </div>

        <div className="flex gap-3">
          <Button href="/dashboard/entries/import" variant="secondary">
            📥 CSV Import
          </Button>
          <Button
            href={createUrl}
            variant="primary"
            disabled={isRegistrationClosed}
            title={isRegistrationClosed ? 'Reservation has been summarized - no more routines can be added' : 'Create a new routine'}
          >
            Create Routine
          </Button>
        </div>
      </div>
    </div>
  );
}
