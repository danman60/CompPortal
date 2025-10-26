import { EntryFormState } from '@/hooks/rebuild/useEntryForm';

interface AgeGroup {
  id: string;
  name: string;
  min_age?: number;
  max_age?: number;
}

interface SizeCategory {
  id: string;
  name: string;
  min_performers?: number;
  max_performers?: number;
}

interface AutoCalculatedSectionProps {
  form: EntryFormState;
  updateField: <K extends keyof EntryFormState>(field: K, value: EntryFormState[K]) => void;
  inferredAgeGroup: string | null;
  inferredSizeCategory: string | null;
  ageGroups: AgeGroup[];
  sizeCategories: SizeCategory[];
}

/**
 * Auto-Calculated Section
 * Shows auto-calculated age group and size category
 * Allows manual override if needed
 *
 * Features:
 * - Age group inferred from average dancer age
 * - Size category inferred from dancer count
 * - Manual override dropdowns
 * - Info message about fee calculation
 */
export function AutoCalculatedSection({
  form,
  updateField,
  inferredAgeGroup,
  inferredSizeCategory,
  ageGroups,
  sizeCategories,
}: AutoCalculatedSectionProps) {
  // Deduplicate age groups by name (keep first occurrence)
  const uniqueAgeGroups = ageGroups.reduce((acc, group) => {
    if (!acc.find(g => g.name === group.name)) {
      acc.push(group);
    }
    return acc;
  }, [] as AgeGroup[]);

  // Deduplicate size categories by name (keep first occurrence)
  const uniqueSizeCategories = sizeCategories.reduce((acc, size) => {
    if (!acc.find(s => s.name === size.name)) {
      acc.push(size);
    }
    return acc;
  }, [] as SizeCategory[]);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Auto-Calculated</h2>

      <div className="space-y-4">
        {/* Age Group */}
        <div>
          <label className="block text-sm font-semibold text-white/90 mb-2">
            Age Group
          </label>

          {/* Inferred Display */}
          <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-sm text-blue-300 mb-1">
              {inferredAgeGroup ? (
                <>
                  <span className="font-semibold">Detected: {inferredAgeGroup}</span>
                  {form.selectedDancers.length > 0 && (
                    <span className="text-blue-400 ml-2">
                      (avg {(form.selectedDancers.reduce((sum, d) => sum + (d.dancer_age || 0), 0) / form.selectedDancers.filter(d => d.dancer_age !== null).length).toFixed(1)} yrs)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-white/60">Select dancers with ages to auto-detect</span>
              )}
            </div>
          </div>

          {/* Override Dropdown */}
          <select
            value={form.age_group_override || ''}
            onChange={(e) => updateField('age_group_override', e.target.value || null)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="" className="bg-gray-900">
              {inferredAgeGroup ? `Use detected (${inferredAgeGroup})` : 'No override'}
            </option>
            {uniqueAgeGroups.map((group) => (
              <option key={group.id} value={group.id} className="bg-gray-900">
                {group.name}
                {group.min_age !== undefined && group.max_age !== undefined && (
                  ` (${group.min_age}-${group.max_age} yrs)`
                )}
              </option>
            ))}
          </select>
          {form.age_group_override && (
            <p className="text-xs text-yellow-400 mt-1">⚠️ Manual override active</p>
          )}
        </div>

        {/* Size Category */}
        <div>
          <label className="block text-sm font-semibold text-white/90 mb-2">
            Size Category
          </label>

          {/* Inferred Display */}
          <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="text-sm text-green-300 mb-1">
              {inferredSizeCategory ? (
                <>
                  <span className="font-semibold">Detected: {inferredSizeCategory}</span>
                  <span className="text-green-400 ml-2">
                    ({form.selectedDancers.length} dancer{form.selectedDancers.length !== 1 ? 's' : ''})
                  </span>
                </>
              ) : (
                <span className="text-white/60">Select dancers to auto-detect</span>
              )}
            </div>
          </div>

          {/* Override Dropdown */}
          <select
            value={form.size_category_override || ''}
            onChange={(e) => updateField('size_category_override', e.target.value || null)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="" className="bg-gray-900">
              {inferredSizeCategory ? `Use detected (${inferredSizeCategory})` : 'No override'}
            </option>
            {uniqueSizeCategories.map((size) => (
              <option key={size.id} value={size.id} className="bg-gray-900">
                {size.name}
                {size.min_performers !== undefined && size.max_performers !== undefined && (
                  ` (${size.min_performers}-${size.max_performers} performers)`
                )}
              </option>
            ))}
          </select>
          {form.size_category_override && (
            <p className="text-xs text-yellow-400 mt-1">⚠️ Manual override active</p>
          )}
        </div>

        {/* Info Message */}
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-purple-400 text-xl">ⓘ</div>
            <div className="text-sm text-purple-200">
              <strong>Note:</strong> Fees will be calculated at summary submission based on competition settings.
              No fees are displayed during entry creation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
