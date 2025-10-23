import { useState, useEffect } from 'react';

type FilterStatus = 'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled';

interface Competition {
  id: string;
  name: string;
  competition_start_date: Date;
}

/**
 * Custom hook for managing entry filter state
 * Extracted from EntriesList.tsx (lines 30-116)
 *
 * @param reservationData - Optional reservation data to include competitions with no entries yet
 */
export function useEntryFilters(entries: any[], reservationData?: any) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // 🐛 FIX Bug #17: Include ALL competitions with approved reservations, not just those with entries
  // Get unique competitions from existing entries
  const entriesCompetitions = Array.from(new Set(entries.map(e => e.competition_id)))
    .map(id => {
      const entry = entries.find(e => e.competition_id === id);
      return entry?.competitions;
    })
    .filter(Boolean) as Competition[];

  // Get competitions from approved reservations (for competitions with no entries yet)
  const reservationCompetitions = (reservationData?.reservations || [])
    .filter((r: any) => r.status === 'approved')
    .map((r: any) => ({
      id: r.competition_id,
      name: r.competitions?.name || 'Unknown Competition',
      competition_start_date: r.competitions?.competition_start_date || new Date(),
    })) as Competition[];

  // Merge and deduplicate by competition ID
  const competitionsMap = new Map<string, Competition>();
  [...entriesCompetitions, ...reservationCompetitions].forEach(comp => {
    if (comp && !competitionsMap.has(comp.id)) {
      competitionsMap.set(comp.id, comp);
    }
  });

  const competitions = Array.from(competitionsMap.values());

  // Auto-select first competition on load
  useEffect(() => {
    if (competitions.length > 0 && !selectedCompetition && competitions[0]) {
      setSelectedCompetition(competitions[0].id);
    }
  }, [competitions, selectedCompetition]);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesStatus = filter === 'all' || entry.status === filter;
    const matchesCompetition = !selectedCompetition || entry.competition_id === selectedCompetition;
    return matchesStatus && matchesCompetition;
  });

  return {
    filter,
    setFilter,
    selectedCompetition,
    setSelectedCompetition,
    viewMode,
    setViewMode,
    competitions,
    filteredEntries,
  };
}
