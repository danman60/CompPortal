import Link from 'next/link';
import { Button } from '@/components/rebuild/ui/Button';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

interface EntriesHeaderProps {
  selectedReservationId?: string;
  selectedCompetitionId?: string;
  isRegistrationClosed?: boolean;
  hasApprovedReservation?: boolean;
  studioId?: string;
}

/**
 * Header for Entries rebuild page
 * Shows title and action buttons
 */
export function EntriesHeader({ selectedReservationId, selectedCompetitionId, isRegistrationClosed = false, hasApprovedReservation = false, studioId }: EntriesHeaderProps) {
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

  // Handler for when no approved reservation exists
  const handleNoReservation = () => {
    toast.error('No approved reservation found. Please request a reservation from a Competition Director first.');
  };

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
              title={`Resume CSV import - ${activeSession.total_routines - (activeSession.current_index ?? 0)} routine(s) remaining`}
            >
              ▶ Resume Import ({activeSession.total_routines - (activeSession.current_index ?? 0)} left)
            </Button>
          )}

          <Button
            href={hasApprovedReservation ? "/dashboard/entries/import" : undefined}
            variant="secondary"
            disabled={!hasApprovedReservation}
            onClick={!hasApprovedReservation ? handleNoReservation : undefined}
            title={!hasApprovedReservation ? 'No approved reservation - request one first' : 'Import routines from CSV/Excel file'}
          >
            Import Routines
          </Button>
          <Button
            href={hasApprovedReservation ? createUrl : undefined}
            variant="primary"
            disabled={isRegistrationClosed || !hasApprovedReservation}
            onClick={!hasApprovedReservation ? handleNoReservation : undefined}
            title={
              !hasApprovedReservation
                ? 'No approved reservation - request one first'
                : isRegistrationClosed
                  ? 'Reservation has been summarized - no more routines can be added'
                  : 'Create a new routine'
            }
          >
            Create Routine
          </Button>
        </div>
      </div>
    </div>
  );
}
