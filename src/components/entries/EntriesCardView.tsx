import { EntryCard } from './EntryCard';

interface EntriesCardViewProps {
  entries: any[];
}

/**
 * Card grid view for entries
 * Extracted from EntriesList.tsx (lines 537-685)
 */
export function EntriesCardView({ entries }: EntriesCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
