"use client";

import React from 'react';
import { Info } from 'lucide-react';
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

interface ExceptionRequest {
  id: string;
  status: string;
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
  onCancelExceptionRequest?: (requestId: string) => void;
  pendingExceptionRequest?: ExceptionRequest | null;
  userRole?: string;
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
  onCancelExceptionRequest,
  pendingExceptionRequest,
  userRole,
}: Props) {
  // Auto-calculate classification based on dancers
  // UPDATED: Changed from 60% majority to AVERAGE algorithm (Nov 9 spec)
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

    // Solo: Use dancer's exact classification (unchanged)
    if (selectedDancers.length === 1) {
      return dancerClassifications[0];
    }

    // Non-Solo: AVERAGE classification (like age calculation - round down)
    const totalSkillLevel = dancerClassifications.reduce(
      (sum, cls) => sum + (cls.skill_level ?? 0),
      0
    );
    const avgSkillLevel = Math.floor(totalSkillLevel / dancerClassifications.length);

    // Find classification with skill_level closest to average without going over
    // Sort by skill level ascending, filter to <= average, take the highest
    const avgClassification = classifications
      .filter(c => (c.skill_level ?? 0) <= avgSkillLevel)
      .sort((a, b) => (a.skill_level ?? 0) - (b.skill_level ?? 0))
      .pop(); // Take last (highest skill within range)

    return avgClassification || dancerClassifications[0];
  }, [selectedDancers, classifications]);

  // Determine if solo or non-solo
  const isSolo = selectedDancerCount === 1;

  // Calculate exception requirement
  const needsException = React.useMemo(() => {
    if (!autoCalculatedClassification) return false;
    if (!classificationId) return false;

    const selected = classifications.find(c => c.id === classificationId);
    if (!selected) return false;

    // Production classification NEVER requires an exception
    if (selected.name === 'Production') return false;

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

  // Tooltip state
  const [showAgeTooltip, setShowAgeTooltip] = React.useState(false);
  const [showSizeTooltip, setShowSizeTooltip] = React.useState(false);
  const [showClassificationTooltip, setShowClassificationTooltip] = React.useState(false);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Auto-Calculated</h2>

      <div className="space-y-4">
        {/* Age (Numerical) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-semibold text-white/90">
              Age
            </label>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowAgeTooltip(true)}
                onMouseLeave={() => setShowAgeTooltip(false)}
                onClick={() => setShowAgeTooltip(!showAgeTooltip)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
              {showAgeTooltip && (
                <div className="absolute left-6 top-0 z-50 w-80 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-xl text-sm text-gray-300">
                  <p className="font-semibold text-white mb-2">Auto-Calculated Age</p>
                  <p className="mb-2">We automatically calculate the age for this routine:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2">
                    <li><strong className="text-white">Solo:</strong> Uses the dancer's age on competition day</li>
                    <li><strong className="text-white">Group:</strong> Uses the average age of all dancers (rounded down)</li>
                  </ul>
                  <p>You can age up by 1 year using the +1 button. Aging down requires director approval.</p>
                </div>
              )}
            </div>
          </div>

          {/* Calculated Age Display */}
          <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-sm text-blue-300">
              {calculatedAge !== null ? (
                <>
                  <span
                    className="font-semibold cursor-help"
                    title="Age calculated as of Dec 31 of registration year"
                  >
                    Calculated: {calculatedAge}
                  </span>
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

        {/* Size Category - Read Only Display */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-semibold text-white/90">
              Size Category
            </label>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowSizeTooltip(true)}
                onMouseLeave={() => setShowSizeTooltip(false)}
                onClick={() => setShowSizeTooltip(!showSizeTooltip)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
              {showSizeTooltip && (
                <div className="absolute left-6 top-0 z-50 w-80 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-xl text-sm text-gray-300">
                  <p className="font-semibold text-white mb-2">Auto-Calculated Size Category</p>
                  <p className="mb-2">We automatically determine the size based on how many dancers are performing:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2">
                    <li><strong className="text-white">Solo:</strong> 1 dancer</li>
                    <li><strong className="text-white">Duet/Trio:</strong> 2-3 dancers</li>
                    <li><strong className="text-white">Small Group:</strong> 4-9 dancers</li>
                    <li><strong className="text-white">Large Group:</strong> 10-19 dancers</li>
                    <li><strong className="text-white">Line:</strong> 20-39 dancers</li>
                    <li><strong className="text-white">Production:</strong> 40+ dancers</li>
                  </ul>
                  <p>This cannot be changed.</p>
                </div>
              )}
            </div>
          </div>

          {/* Auto-Detected Display (Read-Only) */}
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
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
        </div>

        {/* Classification - Always visible */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-semibold text-white/90">
              Classification
            </label>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowClassificationTooltip(true)}
                onMouseLeave={() => setShowClassificationTooltip(false)}
                onClick={() => setShowClassificationTooltip(!showClassificationTooltip)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
              {showClassificationTooltip && (
                <div className="absolute left-6 top-0 z-50 w-80 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-xl text-sm text-gray-300">
                  <p className="font-semibold text-white mb-2">Auto-Calculated Classification</p>
                  <p className="mb-2">We automatically determine the skill level classification:</p>
                  <ul className="list-disc list-inside space-y-1 mb-2">
                    <li><strong className="text-white">Solo:</strong> Uses the dancer's classification</li>
                    <li><strong className="text-white">Group:</strong> Uses the average classification of all dancers (rounded down)</li>
                  </ul>
                  <p>You may bump up one level using the +1 button. Changes of 2+ levels up or any level down require director approval.</p>
                </div>
              )}
            </div>
          </div>

          {/* Auto-Detected Display */}
          {selectedDancerCount > 0 && autoCalculatedClassification && (
            <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="text-sm text-purple-300">
                <span className="font-semibold">Detected: {autoCalculatedClassification.name}</span>
                <span className="text-purple-400 ml-2">
                  (based on dancer classifications)
                </span>
              </div>
            </div>
          )}

          {/* Pending State */}
          {selectedDancerCount === 0 && (
            <div className="mb-3 p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg">
              <div className="text-sm text-gray-300">
                <span className="font-semibold">Pending</span>
                <span className="text-gray-400 ml-2">
                  (select dancers to auto-detect)
                </span>
              </div>
            </div>
          )}

          {selectedDancerCount > 0 && !autoCalculatedClassification && (
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
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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

                {/* +1 Bump Button - Available for BOTH solos and groups (Nov 9 spec) */}
                {plusOneClassification && (
                  <button
                    type="button"
                    onClick={handlePlusOneBump}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    +1 Bump
                  </button>
                )}

                {/* Exception Required Button - Only for Studio Directors without pending request */}
                {needsException && onRequestClassificationException && userRole === 'studio_director' && !pendingExceptionRequest && (
                  <button
                    type="button"
                    onClick={onRequestClassificationException}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    Exception Required
                  </button>
                )}

                {/* Cancel Exception Request Button - Only for Studio Directors with pending request */}
                {pendingExceptionRequest && onCancelExceptionRequest && userRole === 'studio_director' && pendingExceptionRequest.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onCancelExceptionRequest(pendingExceptionRequest.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            )}

            {/* Help Text */}
            <p className="text-xs text-gray-400 mt-1">
              Based on average of dancer classifications (rounded down). You may bump up one level if needed. Exception required for +2 levels or going down.
            </p>

            {/* Pending Request Info */}
            {pendingExceptionRequest && pendingExceptionRequest.status === 'pending' && (
              <p className="text-xs text-blue-400 mt-1">
                ℹ️ Exception request pending CD approval. You can cancel it if you no longer need it.
              </p>
            )}

            {/* Exception Warning */}
            {needsException && !pendingExceptionRequest && (
              <p className="text-xs text-orange-400 mt-1">
                ⚠️ This selection requires CD approval before summary submission
              </p>
            )}
            {/* IMPROV Solo-Only Warning */}
            {classificationId && classifications.find(c => c.id === classificationId)?.name.toLowerCase() === 'improv' && selectedDancerCount > 1 && (
              <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-300 font-semibold">
                  ⚠️ Improv is solo-only
                </p>
                <p className="text-xs text-red-400 mt-1">
                  Improv entries can only have 1 dancer. Please remove dancers or select a different classification.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
