import { RoutineCard } from './RoutineCard';

interface Entry {
  id: string;
  title?: string;
  entry_number?: number;
  status?: string;
  total_fee?: number;
  is_title_upgrade?: boolean;
  studios?: { name: string };
  dance_categories?: { name: string };
  entry_size_categories?: { name: string };
  age_groups?: { name: string };
  entry_participants?: Array<{ dancer_name: string }>;
  music_file_url?: string;
  [key: string]: any;
}

interface RoutineCardListProps {
  entries: Entry[];
  onDelete: (id: string) => Promise<void>;
}

/**
 * Grid layout for routine cards
 * Responsive: 1 col mobile, 2 col tablet, 3 col desktop
 */
export function RoutineCardList({ entries, onDelete }: RoutineCardListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className="animate-fadeInUp"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <RoutineCard entry={entry} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}
