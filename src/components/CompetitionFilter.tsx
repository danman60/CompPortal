"use client";
import { useState, useEffect } from 'react';

interface Competition {
  id: string;
  competition_name: string;
  competition_start_date: Date | string;
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
      <label className="text-sm font-medium text-gray-300">Competition:</label>
      <select
        value={selectedId || ''}
        onChange={(e) => {
          const id = e.target.value;
          onSelect(id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, id);
          }
        }}
        className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[200px]"
      >
        {competitions.map((comp) => (
          <option key={comp.id} value={comp.id} className="bg-gray-900">
            {comp.competition_name} ({new Date(comp.competition_start_date as any).getFullYear()})
          </option>
        ))}
      </select>
    </div>
  );
}

export function useCompetitionFilter(storageKey = 'selected-competition') {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    if (stored) setSelectedCompetitionId(stored);
  }, [storageKey]);

  const clearFilter = () => {
    setSelectedCompetitionId(null);
    if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
  };

  return { selectedCompetitionId, setSelectedCompetitionId, clearFilter };
}
