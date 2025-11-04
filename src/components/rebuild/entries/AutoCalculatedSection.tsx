"use client";

import React from 'react';
import { AgeGroup, SizeCategory, EntryFormV2State } from '@/hooks/rebuild/useEntryFormV2';

interface Classification {
  id: string;
  name: string;
  skill_level: number | null;
}

interface SelectedDancer {
  dancer_id: string;
  dancer_name: string;
  dancer_age: number | null;
  classification_id?: string | null;
}

interface Props {
  calculatedAge: number | null;
  allowedAges: number[];
  effectiveAge: number | null;
  inferredAgeGroup: AgeGroup | null; // Keep for DB compatibility
  inferredSizeCategory: SizeCategory | null;
  effectiveAgeGroup: AgeGroup | null; // Keep for DB compatibility
  effectiveSizeCategory: SizeCategory | null;
  form: EntryFormV2State;
  updateField: <K extends keyof EntryFormV2State>(field: K, value: EntryFormV2State[K]) => void;
  sizeCategoryOverride: string | null;
  setSizeCategoryOverride: (id: string | null) => void;
  ageGroups: AgeGroup[]; // Keep for DB compatibility
  sizeCategories: SizeCategory[];
  selectedDancerCount: number;
  selectedDancers: SelectedDancer[];
  classifications: Classification[];
  classificationId: string;
  setClassificationId: (id: string) => void;
  onRequestClassificationException?: () => void;
}

/**
 * Auto-Calculated Section V2
 * Phase 1 Spec lines 546-585: Auto-classification logic
 * Shows age group (from average age, rounded down) and size category (from count)
 * Updated: Classification field added with inline exception button
 * Classification Logic (Nov 4 transcript):
 * - Solo: Locked dropdown + "+1 Bump" button (no exception for +1)
 * - Non-Solo: Unlocked dropdown, exception for +2/down
 * Cache Bust: 2025-01-04-17:00 UTC
 */
export function AutoCalculatedSection({
  calculatedAge,
  allowedAges,
  effectiveAge,
  inferredAgeGroup,
  inferredSizeCategory,
  effectiveAgeGroup,
  effectiveSizeCategory,
  form,
  updateField,
  sizeCategoryOverride,
  setSizeCategoryOverride,
  ageGroups,
  sizeCategories,
  selectedDancerCount,
  selectedDancers,
  classifications,
  classificationId,
  setClassificationId,
  onRequestClassificationException,
}: Props) {
  // Auto-calculate classification based on dancers
  const autoCalculatedClassification = React.useMemo(() => {
    if (selectedDancers.length === 0) return null;

    // Get classifications for all selected dancers
    const dancerClassifications = selectedDancers
      .map(d => {
        if (!d.classification_id) return null;
        return classifications.find(c => c.id === d.classification_id);
      })
      .filter((c): c is Classification => c !== null);

    if (dancerClassifications.length === 0) return null;

    // Solo: Use dancer's exact classification
    if (selectedDancers.length === 1) {
      return dancerClassifications[0];
    }

    // Non-Solo: Use highest classification (simplified for now)
    // TODO: Implement 60% majority rule for groups
    const highest = dancerClassifications.reduce((prev, curr) => {
      const prevLevel = prev.skill_level ?? 0;
      const currLevel = curr.skill_level ?? 0;
      return currLevel > prevLevel ? curr : prev;
    });

    return highest;
  }, [selectedDancers, classifications]);

  // Determine if solo or non-solo
  const isSolo = selectedDancerCount === 1;

  // Calculate exception requirement
  const needsException = React.useMemo(() => {
    if (!autoCalculatedClassification) return false;
    if (!classificationId) return false;

    const selected = classifications.find(c => c.id === classificationId);
    if (!selected) return false;

    const autoLevel = autoCalculatedClassification.skill_level ?? 0;
    const selectedLevel = selected.skill_level ?? 0;
    const levelDiff = selectedLevel - autoLevel;

    // Exception needed if:
    // - Going down any level (levelDiff < 0)
    // - Going up 2+ levels (levelDiff >= 2)
    return levelDiff < 0 || levelDiff >= 2;
  }, [autoCalculatedClassification, classificationId, classifications]);

  // Handle +1 bump for solos
  const handlePlusOneBump = () => {
    if (!autoCalculatedClassification) return;

    const autoLevel = autoCalculatedClassification.skill_level ?? 0;
    const nextLevel = classifications.find(c => (c.skill_level ?? 0) === autoLevel + 1);

    if (nextLevel) {
      setClassificationId(nextLevel.id);
    }
  };

  // Get classification one level above auto-calculated
  const plusOneClassification = React.useMemo(() => {
    if (!autoCalculatedClassification) return null;
    const autoLevel = autoCalculatedClassification.skill_level ?? 0;
    return classifications.find(c => (c.skill_level ?? 0) === autoLevel + 1) || null;
  }, [autoCalculatedClassification, classifications]);
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Auto-Calculated</h2>

      <div className="space-y-4">
        {/* Age (Numerical) */}
        <div>
          <label className="block text-sm font-semibold text-white/90 mb-2">
            Age
          </label>

          {/* Calculated Age Display */}
          <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-sm text-blue-300">
              {calculatedAge !== null ? (
                <>
                  <span className="font-semibold">Calculated: {calculatedAge}</span>
                  <span className="text-blue-400 ml-2">
                    (can select {calculatedAge} or {calculatedAge + 1})
                  </span>
                </>
              ) : (
                <span className="text-white/60">Select dancers with birthdates to calculate age</span>
              )}
            </div>
          </div>

          {/* Age Dropdown - Only 2 Options */}
          {allowedAges.length > 0 ? (
            <>
              <select
                value={effectiveAge || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  updateField('age_override', val);
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value={allowedAges[0]} className="bg-gray-900">
                  Age {allowedAges[0]} (use calculated)
                </option>
                <option value={allowedAges[1]} className="bg-gray-900">
                  Age {allowedAges[1]} (+1 bump)
                </option>
              </select>
              {form.age_override !== null && (
                <p className="text-xs text-yellow-400 mt-1">⚠️ +1 age bump active</p>
              )}
            </>
          ) : (
            <div className="text-sm text-white/60 italic">
              Select dancers to enable age selection
            </div>
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

        {/* Classification - Nov 4 Requirements */}
        {selectedDancerCount > 0 && (
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Classification
            </label>

            {/* Auto-Detected Display */}
            {autoCalculatedClassification && (
              <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="text-sm text-purple-300">
                  <span className="font-semibold">Detected: {autoCalculatedClassification.name}</span>
                  <span className="text-purple-400 ml-2">
                    (based on dancer classifications)
                  </span>
                </div>
              </div>
            )}

            {!autoCalculatedClassification && (
              <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="text-sm text-yellow-300">
                  <span className="font-semibold">⚠️ Dancers need classifications</span>
                  <span className="text-yellow-400 ml-2">
                    (assign classifications to dancers first)
                  </span>
                </div>
              </div>
            )}

            {/* Classification Dropdown + Buttons */}
            {autoCalculatedClassification && (
              <div className="flex gap-2">
                <select
                  value={classificationId}
                  onChange={(e) => setClassificationId(e.target.value)}
                  disabled={isSolo}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" className="bg-gray-900">
                    Use detected ({autoCalculatedClassification.name})
                  </option>
                  {classifications.map((cls) => (
                    <option key={cls.id} value={cls.id} className="bg-gray-900">
                      {cls.name}
                    </option>
                  ))}
                </select>

                {/* Solo: +1 Bump Button */}
                {isSolo && plusOneClassification && (
                  <button
                    type="button"
                    onClick={handlePlusOneBump}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    +1 Bump
                  </button>
                )}

                {/* Exception Required Button */}
                {needsException && onRequestClassificationException && (
                  <button
                    type="button"
                    onClick={onRequestClassificationException}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    Exception Required
                  </button>
                )}
              </div>
            )}

            {/* Help Text */}
            <p className="text-xs text-gray-400 mt-1">
              {isSolo
                ? 'Solo classification is locked to dancer level. Use +1 Bump to move up one level.'
                : 'Group classification can be changed. Exception required for +2 levels or going down.'}
            </p>

            {/* Exception Warning */}
            {needsException && (
              <p className="text-xs text-orange-400 mt-1">
                ⚠️ This selection requires CD approval before summary submission
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
