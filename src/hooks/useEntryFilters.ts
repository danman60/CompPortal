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
 */
export function useEntryFilters(entries: any[]) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Get unique competitions for filter
  const competitions = Array.from(new Set(entries.map(e => e.competition_id)))
    .map(id => {
      const entry = entries.find(e => e.competition_id === id);
      return entry?.competitions;
    })
    .filter(Boolean) as Competition[];

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
