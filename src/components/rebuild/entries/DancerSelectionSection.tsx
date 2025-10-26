import { useMemo } from 'react';
import { EntryFormState, SelectedDancer } from '@/hooks/rebuild/useEntryForm';

interface Dancer {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
}

interface DancerSelectionSectionProps {
  form: EntryFormState;
  updateField: <K extends keyof EntryFormState>(field: K, value: EntryFormState[K]) => void;
  toggleDancer: (dancer: SelectedDancer) => void;
  dancers: Dancer[];
}

/**
 * Dancer Selection Section
 * Features:
 * - Search by name
 * - Sort by name or age
 * - Checkbox selection
 * - Selected dancers display with remove option
 */
export function DancerSelectionSection({
  form,
  updateField,
  toggleDancer,
  dancers,
}: DancerSelectionSectionProps) {
  // Filter and sort dancers
  const filteredDancers = useMemo(() => {
    let result = dancers;

    // Apply search filter
    if (form.dancerSearchQuery.trim().length > 0) {
      const query = form.dancerSearchQuery.toLowerCase();
      result = result.filter((d) => {
        const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
        return fullName.includes(query);
      });
    }

    // Apply sort
    if (form.dancerSortBy === 'name') {
      result = [...result].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`;
        const nameB = `${b.first_name} ${b.last_name}`;
        return nameA.localeCompare(nameB);
      });
    } else {
      result = [...result].sort((a, b) => {
        if (a.age === null && b.age === null) return 0;
        if (a.age === null) return 1;
        if (b.age === null) return -1;
        return a.age - b.age;
      });
    }

    return result;
  }, [dancers, form.dancerSearchQuery, form.dancerSortBy]);

  // Check if dancer is selected
  const isDancerSelected = (dancerId: string) => {
    return form.selectedDancers.some((d) => d.dancer_id === dancerId);
  };

  // Get age group display for dancer
  const getAgeGroupDisplay = (age: number | null) => {
    if (age === null) return '';
    if (age < 6) return 'Tiny';
    if (age < 9) return 'Mini';
    if (age < 13) return 'Teen';
    if (age < 16) return 'Junior';
    return 'Senior';
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Dancers</h2>

      {/* Search and Sort Controls */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={form.dancerSearchQuery}
            onChange={(e) => updateField('dancerSearchQuery', e.target.value)}
            placeholder="🔍 Search dancers..."
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={form.dancerSortBy}
          onChange={(e) => updateField('dancerSortBy', e.target.value as 'name' | 'age')}
          className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
        >
          <option value="name" className="bg-gray-900">Sort: Name</option>
          <option value="age" className="bg-gray-900">Sort: Age</option>
        </select>
      </div>

      {/* Selected Dancers Summary */}
      {form.selectedDancers.length > 0 && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="text-sm text-green-300 font-semibold mb-2">
            {form.selectedDancers.length} dancer{form.selectedDancers.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex flex-wrap gap-2">
            {form.selectedDancers.map((dancer) => (
              <div
                key={dancer.dancer_id}
                className="px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full text-green-200 text-sm flex items-center gap-2"
              >
                <span>{dancer.dancer_name}</span>
                {dancer.dancer_age !== null && (
                  <span className="text-green-300">({dancer.dancer_age})</span>
                )}
                <button
                  onClick={() => toggleDancer(dancer)}
                  className="ml-1 text-green-400 hover:text-green-200 transition-colors"
                  aria-label={`Remove ${dancer.dancer_name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dancer List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredDancers.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            {dancers.length === 0 ? (
              <>
                <p className="mb-2">No dancers found for this studio.</p>
                <p className="text-sm">Add dancers first to create entries.</p>
              </>
            ) : (
              <p>No dancers match your search.</p>
            )}
          </div>
        ) : (
          filteredDancers.map((dancer) => {
            const isSelected = isDancerSelected(dancer.id);
            const dancerData: SelectedDancer = {
              dancer_id: dancer.id,
              dancer_name: `${dancer.first_name} ${dancer.last_name}`,
              dancer_age: dancer.age,
            };

            return (
              <label
                key={dancer.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-500/20 border-purple-500/50'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleDancer(dancerData)}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-white font-semibold">
                    {dancer.first_name} {dancer.last_name}
                  </div>
                  <div className="text-xs text-white/60">
                    {dancer.age !== null ? (
                      <>
                        Age {dancer.age} - {getAgeGroupDisplay(dancer.age)}
                      </>
                    ) : (
                      'Age not specified'
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="text-purple-400 text-sm font-semibold">✓ Selected</div>
                )}
              </label>
            );
          })
        )}
      </div>

      {/* Validation */}
      {form.selectedDancers.length === 0 && (
        <p className="text-xs text-red-400 mt-3">At least one dancer is required</p>
      )}
    </div>
  );
}
