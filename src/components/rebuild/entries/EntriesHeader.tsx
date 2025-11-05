import Link from 'next/link';
import { Button } from '@/components/rebuild/ui/Button';
import { trpc } from '@/lib/trpc';

interface EntriesHeaderProps {
  selectedReservationId?: string;
  selectedCompetitionId?: string;
  isRegistrationClosed?: boolean;
  studioId?: string;
}

/**
 * Header for Entries rebuild page
 * Shows title and action buttons
 */
export function EntriesHeader({ selectedReservationId, selectedCompetitionId, isRegistrationClosed = false, studioId }: EntriesHeaderProps) {
  // Check for active import session
  const { data: activeSession } = trpc.importSession.getActiveForStudio.useQuery(
    { studio_id: studioId! },
    { enabled: !!studioId, refetchInterval: 5000 } // Poll every 5 seconds
  );

  // Build create URL with context (consolidated to single create route)
  const createUrl = selectedReservationId
    ? `/dashboard/entries/create?reservation=${selectedReservationId}`
    : '/dashboard/entries/create';

  const resumeUrl = activeSession
    ? `/dashboard/entries/create?importSession=${activeSession.id}`
    : null;

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
          {/* Resume Import Button - Shows when there's an active import session */}
          {activeSession && resumeUrl && (
            <Button
              href={resumeUrl}
              variant="primary"
              title={`Resume CSV import - ${activeSession.total_routines - activeSession.current_index} routine(s) remaining`}
            >
              ▶ Resume Import ({activeSession.total_routines - activeSession.current_index} left)
            </Button>
          )}

          <Button
            href="/dashboard/entries/import"
            variant="secondary"
            title="Import routines from CSV/Excel file"
          >
            Import CSV
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
