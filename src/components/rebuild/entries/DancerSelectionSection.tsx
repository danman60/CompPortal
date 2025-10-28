"use client";

import { useState } from 'react';
import { SelectedDancer } from '@/hooks/rebuild/useEntryFormV2';

interface Dancer {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
}

interface Props {
  dancers: Dancer[];
  selectedDancers: SelectedDancer[];
  toggleDancer: (dancer: SelectedDancer) => void;
  eventStartDate: Date | null;
}

/**
 * Dancer Selection Section V2
 * Phase 1 Spec lines 528-544: Dancer attachment to entries
 * Built from scratch without legacy code contamination
 */
export function DancerSelectionSection({
  dancers,
  selectedDancers,
  toggleDancer,
  eventStartDate,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'age'>('name');

  /**
   * Calculate age at event for display
   * Phase 1 Spec line 554: age_at_event calculation
   */
  const calculateAgeAtEvent = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth || !eventStartDate) return null;

    const dob = new Date(dateOfBirth);
    const diffMs = eventStartDate.getTime() - dob.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.floor(diffDays / 365);
  };

  /**
   * Filter dancers by search query
   */
  const filteredDancers = dancers.filter((d) => {
    const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  /**
   * Sort dancers
   */
  const sortedDancers = [...filteredDancers].sort((a, b) => {
    if (sortBy === 'name') {
      return `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      );
    } else {
      const ageA = calculateAgeAtEvent(a.date_of_birth) || 999;
      const ageB = calculateAgeAtEvent(b.date_of_birth) || 999;
      return ageA - ageB;
    }
  });

  /**
   * Check if dancer is selected
   */
  const isSelected = (dancerId: string): boolean => {
    return selectedDancers.some((d) => d.dancer_id === dancerId);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4">
        Select Dancers <span className="text-red-400">*</span>
      </h2>

      {/* Search and Sort Controls */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search dancers..."
          className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'age')}
          className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="name" className="bg-gray-900">
            Sort by Name
          </option>
          <option value="age" className="bg-gray-900">
            Sort by Age
          </option>
        </select>
      </div>

      {/* Dancer List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedDancers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {searchQuery
              ? 'No dancers match your search'
              : 'No dancers found. Add dancers to your roster first.'}
          </div>
        ) : (
          sortedDancers.map((dancer) => {
            const age = calculateAgeAtEvent(dancer.date_of_birth);
            const fullName = `${dancer.first_name} ${dancer.last_name}`;
            const selected = isSelected(dancer.id);

            return (
              <button
                key={dancer.id}
                type="button"
                onClick={() =>
                  toggleDancer({
                    dancer_id: dancer.id,
                    dancer_name: fullName,
                    dancer_age: age,
                    date_of_birth: dancer.date_of_birth,
                  })
                }
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  selected
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                    selected
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-white/40'
                  }`}
                >
                  {selected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">{fullName}</div>
                  {age !== null && (
                    <div className="text-sm text-gray-400">
                      {age} years old at event
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Selected Count */}
      <div className="mt-4 text-sm text-gray-400">
        {selectedDancers.length} dancer{selectedDancers.length !== 1 ? 's' : ''}{' '}
        selected
      </div>
    </div>
  );
}
