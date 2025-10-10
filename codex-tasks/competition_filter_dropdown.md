## Task: Competition Filter Dropdown Component

**Context:**
- File: src/components/CompetitionFilter.tsx
- Usage: Add to all list pages (entries, dancers, invoices, reservations)
- Pattern: Dropdown with "All Competitions" + individual options

**Requirements:**
1. Dropdown showing all user's competitions
2. "All Competitions" as default option
3. onChange callback with selected competition ID
4. Persist selection in localStorage (per page)
5. Glassmorphic styling

**Deliverables:**
- Complete CompetitionFilter.tsx component
- Export CompetitionFilter
- Hook: useCompetitionFilter for state management

**Component Structure:**
```tsx
import { useState, useEffect } from 'react';

interface Competition {
  id: string;
  competition_name: string;
  competition_start_date: Date;
}

interface CompetitionFilterProps {
  competitions: Competition[];
  selectedId: string | null;
  onSelect: (competitionId: string | null) => void;
  storageKey?: string;
  className?: string;
}

export function CompetitionFilter({
  competitions,
  selectedId,
  onSelect,
  storageKey = 'selected-competition',
  className = '',
}: CompetitionFilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-300">
        Competition:
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => {
          const id = e.target.value || null;
          onSelect(id);
          // Persist to localStorage
          if (id) {
            localStorage.setItem(storageKey, id);
          } else {
            localStorage.removeItem(storageKey);
          }
        }}
        className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[200px]"
      >
        <option value="" className="bg-gray-900">All Competitions</option>
        {competitions.map(comp => (
          <option key={comp.id} value={comp.id} className="bg-gray-900">
            {comp.competition_name} ({new Date(comp.competition_start_date).getFullYear()})
          </option>
        ))}
      </select>

      {selectedId && (
        <button
          onClick={() => onSelect(null)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Clear filter"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Hook for managing competition filter state
 */
export function useCompetitionFilter(storageKey = 'selected-competition') {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setSelectedCompetitionId(stored);
    }
  }, [storageKey]);

  // Clear filter
  const clearFilter = () => {
    setSelectedCompetitionId(null);
    localStorage.removeItem(storageKey);
  };

  return {
    selectedCompetitionId,
    setSelectedCompetitionId,
    clearFilter,
  };
}
```

**Usage Example:**
```tsx
// In EntriesList.tsx
import { CompetitionFilter, useCompetitionFilter } from '@/components/CompetitionFilter';

export default function EntriesList() {
  const { selectedCompetitionId, setSelectedCompetitionId } = useCompetitionFilter('entries-competition-filter');

  const { data: competitions } = trpc.competition.list.useQuery();
  const { data: entries } = trpc.entry.list.useQuery({
    competitionId: selectedCompetitionId || undefined,
  });

  return (
    <div>
      <CompetitionFilter
        competitions={competitions || []}
        selectedId={selectedCompetitionId}
        onSelect={setSelectedCompetitionId}
        storageKey="entries-competition-filter"
      />

      {/* Entry list... */}
    </div>
  );
}
```

**Storage Keys by Page:**
- Entries: `entries-competition-filter`
- Dancers: `dancers-competition-filter`
- Invoices: `invoices-competition-filter`
- Reservations: `reservations-competition-filter`

**Styling:**
- Dropdown: Glassmorphic with white/10 background
- Border: white/20
- Text: White
- Options: Dark gray (bg-gray-900)
- Clear button: Hover effect

**Codex will**: Generate filter component + hook
**Claude will**: Integrate into all list pages, update queries to filter by competition
