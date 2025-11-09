import Link from 'next/link';
import { Card } from '@/components/rebuild/ui/Card';
import { Badge } from '@/components/rebuild/ui/Badge';
import { Button } from '@/components/rebuild/ui/Button';

interface Entry {
  id: string;
  title?: string;
  entry_number?: number;
  status?: string;
  total_fee?: number;
  is_title_upgrade?: boolean;
  routine_age?: number | null;
  studios?: { name: string };
  dance_categories?: { name: string };
  entry_size_categories?: { name: string };
  age_groups?: { name: string };
  entry_participants?: Array<{ dancer_name: string; dancer_age?: number | null }>;
  music_file_url?: string;
  classification_exception_requests?: Array<{
    id: string;
    status: string;
    cd_decision_type?: string | null;
  }>;
  [key: string]: any;
}

interface RoutineCardProps {
  entry: Entry;
  onDelete: (id: string) => Promise<void>;
  reservationClosed?: boolean;
}

/**
 * Card view for single routine
 * Shows all entry details in glassmorphic card
 */
export function RoutineCard({ entry, onDelete, reservationClosed = false }: RoutineCardProps) {
  const isDraft = entry.status === 'draft';
  const canDelete = isDraft && !reservationClosed;

  const handleDelete = async () => {
    if (!canDelete) return;

    if (confirm(
      `Delete draft routine "${entry.title}"?\n\n` +
      `This will:\n` +
      `• Cancel the routine entry\n` +
      `• Free up 1 reservation space\n` +
      `• Remove all participants from this routine`
    )) {
      try {
        await onDelete(entry.id);
      } catch (error: any) {
        // Error already shown by mutation toast
      }
    }
  };

  const needsDancers = !entry.entry_participants || entry.entry_participants.length === 0;

  // Check if there's a resolved classification exception request
  const hasDecision = entry.classification_exception_requests &&
    entry.classification_exception_requests.length > 0 &&
    ['approved', 'resolved'].includes(entry.classification_exception_requests[0].status);

  return (
    <Card className={needsDancers ? 'border-2 border-orange-400/50' : ''}>
      <div className="flex items-start justify-between mb-4">
        <div>
          {entry.entry_number && (
            <div className="text-4xl font-bold text-white/40 mb-2">
              #{entry.entry_number}
            </div>
          )}
          <h3 className="text-xl font-bold text-white">{entry.title || 'Untitled'}</h3>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge status={entry.status || 'draft' as any} />
          {needsDancers && (
            <span className="inline-flex items-center px-3 py-1 bg-orange-500/20 border border-orange-400/50 rounded-full text-orange-300 text-xs font-semibold">
              ⚠️ Needs Dancers
            </span>
          )}
          {hasDecision && (
            <span className="inline-flex items-center px-3 py-1 bg-green-500/20 border border-green-400/50 rounded-full text-green-300 text-xs font-semibold">
              ✓ Decision Made
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4 text-white/80">
        {entry.studios?.name && (
          <div className="flex items-center gap-2">
            <span>🏢</span>
            <span>{entry.studios.name}</span>
          </div>
        )}
        {entry.dance_categories?.name && (
          <div className="flex items-center gap-2">
            <span>🎭</span>
            <span>{entry.dance_categories.name}</span>
          </div>
        )}
        {entry.entry_size_categories?.name && (
          <div className="flex items-center gap-2">
            <span>👥</span>
            <span>{entry.entry_size_categories.name}</span>
          </div>
        )}
        {entry.routine_age !== null && entry.routine_age !== undefined && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Age {entry.routine_age}</span>
          </div>
        )}
        {entry.is_title_upgrade && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 bg-yellow-500/20 border border-yellow-400/50 rounded-full text-yellow-200 text-xs font-semibold">
              👑 +$30 Title Upgrade
            </span>
          </div>
        )}
      </div>

      {entry.entry_participants && entry.entry_participants.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-white/60 mb-2">Dancers:</div>
          <div className="flex flex-wrap gap-2">
            {entry.entry_participants.map((p, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-white/5 rounded text-sm text-white/80"
              >
                {p.dancer_name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 text-white/80">
        {entry.music_file_url ? (
          <span className="text-green-300">🎵 Music Uploaded</span>
        ) : (
          <span className="text-yellow-300">🎵 Music Pending</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button href={`/dashboard/entries/${entry.id}`} variant="secondary" className="flex-1">
          View Details
        </Button>
        <Button
          onClick={handleDelete}
          variant="danger"
          disabled={!canDelete}
          title={
            !isDraft
              ? "Cannot delete submitted routines - contact Competition Director"
              : reservationClosed
              ? "Reservation closed - contact Competition Director"
              : "Delete draft routine"
          }
        >
          {canDelete ? 'Delete' : '🔒 Delete'}
        </Button>
      </div>
    </Card>
  );
}
