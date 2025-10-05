'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { getSelectedCompetitionId, setSelectedCompetitionId as saveCompetitionId } from '@/lib/competition-context';

export default function CompetitionSwitcher() {
  const [selectedCompId, setSelectedCompId] = useState<string>('');

  // Fetch all competitions
  const { data: competitions } = trpc.competition.getAll.useQuery();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = getSelectedCompetitionId();
    if (saved) {
      setSelectedCompId(saved);
    } else if (competitions?.competitions && competitions.competitions.length > 0) {
      // Auto-select first competition if none saved
      const firstComp = competitions.competitions[0];
      if (firstComp) {
        setSelectedCompId(firstComp.id);
        saveCompetitionId(firstComp.id);
      }
    }
  }, [competitions]);

  const handleChange = (compId: string) => {
    setSelectedCompId(compId);
    saveCompetitionId(compId);
    // Refresh the page to apply new filter
    window.location.reload();
  };

  const allComps = competitions?.competitions || [];
  const currentComp = allComps.find((c) => c.id === selectedCompId);

  if (allComps.length === 0) {
    return null; // Don't show if no competitions
  }

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
      <label className="block text-sm font-medium text-gray-400 mb-2">
        Current Competition
      </label>
      <select
        value={selectedCompId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {allComps.map((comp) => (
          <option key={comp.id} value={comp.id} className="bg-gray-900">
            {comp.name} ({comp.year})
          </option>
        ))}
      </select>
      {currentComp && (
        <div className="mt-2 text-xs text-gray-400">
          Status: <span className="text-purple-400 font-semibold">{currentComp.status}</span>
        </div>
      )}
    </div>
  );
}
