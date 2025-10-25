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
  studios?: { name: string };
  dance_categories?: { name: string };
  entry_size_categories?: { name: string };
  age_groups?: { name: string };
  entry_participants?: Array<{ dancer_name: string }>;
  music_file_url?: string;
  [key: string]: any;
}

interface RoutineCardProps {
  entry: Entry;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Card view for single routine
 * Shows all entry details in glassmorphic card
 */
export function RoutineCard({ entry, onDelete }: RoutineCardProps) {
  const handleDelete = async () => {
    if (confirm(`Delete routine "${entry.title}"?`)) {
      await onDelete(entry.id);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div>
          {entry.entry_number && (
            <div className="text-4xl font-bold text-white/40 mb-2">
              #{entry.entry_number}
            </div>
          )}
          <h3 className="text-xl font-bold text-white">{entry.title || 'Untitled'}</h3>
        </div>
        <Badge status={entry.status || 'draft' as any} />
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
        {entry.age_groups?.name && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{entry.age_groups.name}</span>
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

      {entry.total_fee && (
        <div className="text-2xl font-bold text-white mb-4">
          ${typeof entry.total_fee === 'number' ? entry.total_fee.toFixed(2) : Number(entry.total_fee).toFixed(2)}
        </div>
      )}

      <div className="flex gap-2">
        <Button href={`/dashboard/entries/${entry.id}`} variant="secondary" className="flex-1">
          View Details
        </Button>
        <Button onClick={handleDelete} variant="danger">
          Delete
        </Button>
      </div>
    </Card>
  );
}
