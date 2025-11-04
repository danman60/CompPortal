"use client";

import { AgeGroup, SizeCategory, EntryFormV2State } from '@/hooks/rebuild/useEntryFormV2';

interface Props {
  inferredAgeGroup: AgeGroup | null;
  inferredSizeCategory: SizeCategory | null;
  effectiveAgeGroup: AgeGroup | null;
  effectiveSizeCategory: SizeCategory | null;
  ageGroupOverride: string | null;
  sizeCategoryOverride: string | null;
  setAgeGroupOverride: (id: string | null) => void;
  setSizeCategoryOverride: (id: string | null) => void;
  ageGroups: AgeGroup[];
  sizeCategories: SizeCategory[];
  selectedDancerCount: number;
  onRequestClassificationException?: () => void;
}

/**
 * Auto-Calculated Section V2
 * Phase 1 Spec lines 546-585: Auto-classification logic
 * Shows age group (from average age, rounded down) and size category (from count)
 * Updated: Classification field added with inline exception button
 * Cache Bust: 2025-01-04-16:45 UTC
 */
export function AutoCalculatedSection({
  inferredAgeGroup,
  inferredSizeCategory,
  effectiveAgeGroup,
  effectiveSizeCategory,
  ageGroupOverride,
  sizeCategoryOverride,
  setAgeGroupOverride,
  setSizeCategoryOverride,
  ageGroups,
  sizeCategories,
  selectedDancerCount,
  onRequestClassificationException,
}: Props) {
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
            <div className="text-sm text-blue-300">
              {inferredAgeGroup ? (
                <>
                  <span className="font-semibold">Detected: {inferredAgeGroup.name}</span>
                  <span className="text-blue-400 ml-2">
                    (based on average age, rounded down)
                  </span>
                </>
              ) : (
                <span className="text-white/60">Select dancers with ages to auto-detect</span>
              )}
            </div>
          </div>

          {/* Override Dropdown */}
          <select
            value={ageGroupOverride || ''}
            onChange={(e) => setAgeGroupOverride(e.target.value || null)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="" className="bg-gray-900">
              {inferredAgeGroup ? `Use detected (${inferredAgeGroup.name})` : 'Select age group'}
            </option>
            {ageGroups.map((group) => {
              // Cap display at 80 years (cosmetic only, doesn't affect logic)
              const displayMaxAge = group.max_age > 80 ? 80 : group.max_age;
              // Check if name already contains age range to avoid duplicates
              const hasAgeInName = /\(\d+[-\d]*\)/.test(group.name);
              const displayName = hasAgeInName
                ? group.name
                : `${group.name} (${group.min_age}-${displayMaxAge} yrs)`;

              return (
                <option key={group.id} value={group.id} className="bg-gray-900">
                  {displayName}
                </option>
              );
            })}
          </select>
          {ageGroupOverride && (
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
            <div className="text-sm text-green-300">
              {inferredSizeCategory ? (
                <>
                  <span className="font-semibold">Detected: {inferredSizeCategory.name}</span>
                  <span className="text-green-400 ml-2">
                    ({selectedDancerCount} dancer{selectedDancerCount !== 1 ? 's' : ''})
                  </span>
                </>
              ) : (
                <span className="text-white/60">Select dancers to auto-detect</span>
              )}
            </div>
          </div>

          {/* Override Dropdown */}
          <select
            value={sizeCategoryOverride || ''}
            onChange={(e) => setSizeCategoryOverride(e.target.value || null)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="" className="bg-gray-900">
              {inferredSizeCategory ? `Use detected (${inferredSizeCategory.name})` : 'Select size category'}
            </option>
            {sizeCategories.map((size) => (
              <option key={size.id} value={size.id} className="bg-gray-900">
                {size.name} ({size.min_participants}-{size.max_participants} performers)
              </option>
            ))}
          </select>
          {sizeCategoryOverride && (
            <p className="text-xs text-yellow-400 mt-1">⚠️ Manual override active</p>
          )}
        </div>

        {/* Classification - Phase 2 Feature */}
        {selectedDancerCount > 0 && (
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Classification (Auto-Detected)
            </label>

            {/* Detected Display with Exception Button */}
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-purple-300">
                  <span className="font-semibold">Detected: </span>
                  <span className="text-purple-400">Phase 2 Coming Soon</span>
                  <span className="text-purple-400/60 ml-2">
                    (will be based on dancer levels)
                  </span>
                </div>
                {onRequestClassificationException && (
                  <button
                    type="button"
                    onClick={onRequestClassificationException}
                    className="ml-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    Request Exception
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Classification will be auto-determined and locked. Request an exception if needed.
            </p>
          </div>
        )}

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
