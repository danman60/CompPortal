import { useState, useMemo, useCallback } from 'react';
import { parseISODateToUTC } from '@/lib/date-utils';

/**
 * Selected dancer for entry
 * Phase 1 Spec lines 528-544: Dancer attachment to entries
 */
export interface SelectedDancer {
  dancer_id: string;
  dancer_name: string;
  dancer_age: number | null;
  date_of_birth: string | null; // For accurate age calculation
  classification_id?: string | null; // For classification auto-calculation
}

/**
 * Lookup table types (from backend)
 */
export interface AgeGroup {
  id: string;
  name: string;
  min_age: number;
  max_age: number;
  sort_order: number | null;
}

export interface SizeCategory {
  id: string;
  name: string;
  min_participants: number;
  max_participants: number;
  sort_order: number | null;
}

/**
 * Save action types for entry form
 * Phase 1 Spec: 4 distinct save actions
 */
export type SaveAction = 'cancel' | 'save' | 'save-another' | 'save-like-this';

/**
 * Entry form state (Phase 1 Spec lines 457-461 + Phase 2 extended time)
 */
export interface EntryFormV2State {
  // Required fields
  title: string;
  category_id: string;
  classification_id: string;

  // Optional fields
  choreographer: string;
  special_requirements: string;

  // Dancer selection
  selectedDancers: SelectedDancer[];

  // Overrides for auto-calculated fields
  age_override: number | null; // Numerical age override (can only be calculated or calculated+1)
  size_category_override: string | null;

  // Title upgrade option (empwrDefaults.ts:45)
  is_title_upgrade: boolean;

  // Phase 2 spec lines 324-373: Extended time tracking
  extended_time_requested: boolean;
  routine_length_minutes: number;
  routine_length_seconds: number;
  scheduling_notes: string;
}

const initialState: EntryFormV2State = {
  title: '',
  category_id: '',
  classification_id: '',
  choreographer: '',
  special_requirements: '',
  selectedDancers: [],
  age_override: null,
  size_category_override: null,
  is_title_upgrade: false,
  extended_time_requested: false,
  routine_length_minutes: 0,
  routine_length_seconds: 0,
  scheduling_notes: '',
};

interface UseEntryFormV2Props {
  eventStartDate: Date | null; // For age calculation
  ageGroups: AgeGroup[];
  sizeCategories: SizeCategory[];
}

/**
 * Hook for managing entry creation form V2
 * Built from scratch against Phase 1 spec (lines 503-585)
 *
 * Auto-Classification Logic:
 * - Age Group: Based on youngest dancer's age at event (spec line 552-564)
 * - Size Category: Based on total dancer count (spec line 566-577)
 */
export function useEntryFormV2({
  eventStartDate,
  ageGroups,
  sizeCategories,
}: UseEntryFormV2Props) {
  const [form, setForm] = useState<EntryFormV2State>(initialState);

  /**
   * Calculate age at event from date of birth
   * Phase 1 Spec line 554: age_at_event = (event_start_date - youngest_dob).days // 365
   * FIXED: Bug discovered 11:31 AM Nov 12, 2025 - timezone shift caused +1 year error
   */
  const calculateAgeAtEvent = useCallback(
    (dateOfBirth: string | null): number | null => {
      if (!dateOfBirth || !eventStartDate) return null;

      const dob = parseISODateToUTC(dateOfBirth);
      if (!dob) return null;

      // Use UTC methods to prevent timezone mismatch
      let age = eventStartDate.getUTCFullYear() - dob.getUTCFullYear();
      const monthDiff = eventStartDate.getUTCMonth() - dob.getUTCMonth();

      // Adjust if birthday hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && eventStartDate.getUTCDate() < dob.getUTCDate())) {
        age--;
      }

      return age;
    },
    [eventStartDate]
  );

  /**
   * Calculate numerical age (Phase 2 spec: Dec 31 cutoff)
   * Solo: Exact dancer age
   * Group: Average age, drop decimal
   */
  const calculatedAge = useMemo((): number | null => {
    if (form.selectedDancers.length === 0 || !eventStartDate) return null;

    // Calculate ages at event (Dec 31 cutoff)
    const agesAtEvent = form.selectedDancers
      .map((d) => calculateAgeAtEvent(d.date_of_birth))
      .filter((age): age is number => age !== null);

    if (agesAtEvent.length === 0) return null;

    // Solo: Exact age
    if (form.selectedDancers.length === 1) {
      return agesAtEvent[0];
    }

    // Group: Average age, round to nearest (0.5+ rounds up)
    const avgAge = agesAtEvent.reduce((sum, age) => sum + age, 0) / agesAtEvent.length;
    return Math.round(avgAge);
  }, [form.selectedDancers, eventStartDate, calculateAgeAtEvent]);

  /**
   * Allowed ages for dropdown: [calculated, calculated+1]
   */
  const allowedAges = useMemo((): number[] => {
    if (calculatedAge === null) return [];
    return [calculatedAge, calculatedAge + 1];
  }, [calculatedAge]);

  /**
   * Infer size category from dancer count
   * Phase 1 Spec lines 566-577
   */
  const inferredSizeCategory = useMemo((): SizeCategory | null => {
    const count = form.selectedDancers.length;
    if (count === 0) return null;

    // Match to size categories (spec line 566-577)
    const match = sizeCategories.find(
      (sc) => sc.min_participants <= count && count <= sc.max_participants
    );

    return match || null;
  }, [form.selectedDancers, sizeCategories]);

  /**
   * Get effective age (override takes precedence)
   */
  const effectiveAge = useMemo((): number | null => {
    if (form.age_override !== null) {
      return form.age_override;
    }
    return calculatedAge;
  }, [form.age_override, calculatedAge]);

  /**
   * Map age to age group for database compatibility (temporary)
   * TODO: Remove when age_group_id is removed from schema
   */
  const inferredAgeGroup = useMemo((): AgeGroup | null => {
    if (effectiveAge === null) return null;
    const match = ageGroups.find(
      (ag) => ag.min_age <= effectiveAge && effectiveAge <= ag.max_age
    );
    return match || null;
  }, [effectiveAge, ageGroups]);

  const effectiveAgeGroup = inferredAgeGroup;

  /**
   * Get effective size category (override takes precedence)
   */
  const effectiveSizeCategory = useMemo((): SizeCategory | null => {
    if (form.size_category_override) {
      return (
        sizeCategories.find((sc) => sc.id === form.size_category_override) ||
        null
      );
    }
    return inferredSizeCategory;
  }, [form.size_category_override, inferredSizeCategory, sizeCategories]);

  /**
   * Check if form can be saved
   * Phase 1 Spec lines 842-850: Validation rules + Phase 2 choreographer required
   */
  // Expose autoCalculatedClassification for validation
  const autoCalculatedClassification = useMemo(() => {
    if (form.selectedDancers.length === 0) return null;

    const dancerClassifications = form.selectedDancers
      .map(d => d.classification_id)
      .filter((id): id is string => !!id);

    if (dancerClassifications.length === 0) return null;

    // Solo: Use dancer's classification
    if (form.selectedDancers.length === 1) {
      return dancerClassifications[0];
    }

    // Group: Count majority (60% rule simplified)
    const counts: Record<string, number> = {};
    dancerClassifications.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });

    // Return most common classification
    return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  }, [form.selectedDancers]);

  const canSave = useMemo(() => {
    // Production validation: minimum 10 dancers
    const isProduction = effectiveSizeCategory?.name === 'Production';
    const meetsProductionMin = !isProduction || form.selectedDancers.length >= 10;

    // Classification validation: accept auto-detected OR manual selection
    const hasValidClassification =
      form.classification_id.length > 0 || // Manual selection
      (autoCalculatedClassification !== null); // OR auto-detected

    return (
      form.title.trim().length >= 3 && // Min 3 chars (spec line 843)
      form.title.trim().length <= 255 && // Max 255 chars
      form.choreographer.trim().length > 0 && // Phase 2 spec lines 36-42: Required
      form.category_id.length > 0 &&
      hasValidClassification &&
      form.selectedDancers.length >= 1 && // Min 1 dancer (spec line 844)
      effectiveAgeGroup !== null &&
      effectiveSizeCategory !== null &&
      meetsProductionMin // Productions require 10+ dancers
    );
  }, [
    form.title,
    form.choreographer,
    form.category_id,
    form.classification_id,
    form.selectedDancers,
    effectiveAgeGroup,
    effectiveSizeCategory,
    autoCalculatedClassification,
  ]);

  /**
   * Get validation errors (for user feedback)
   */
  const validationErrors = useMemo((): string[] => {
    const errors: string[] = [];

    if (form.title.trim().length > 0 && form.title.trim().length < 3) {
      errors.push('Routine title must be at least 3 characters');
    }
    if (!form.choreographer.trim()) {
      errors.push('Choreographer is required');
    }
    if (!form.category_id) {
      errors.push('Dance category is required');
    }
    // Classification: accept auto-detected OR manual selection
    if (!form.classification_id && !autoCalculatedClassification) {
      errors.push('Classification is required');
    }
    // Allow 0 dancers - can be attached later. Summary submission will validate.
    if (form.selectedDancers.length > 0 && !effectiveAgeGroup) {
      errors.push('Cannot determine age group - please select manually');
    }
    if (form.selectedDancers.length > 0 && !effectiveSizeCategory) {
      errors.push('Cannot determine size category - please select manually');
    }

    // Production validation: minimum 10 dancers
    if (effectiveSizeCategory?.name === 'Production' && form.selectedDancers.length < 10) {
      errors.push('Productions require minimum 10 dancers');
    }

    return errors;
  }, [
    form.title,
    form.choreographer,
    form.category_id,
    form.classification_id,
    form.selectedDancers,
    effectiveAgeGroup,
    effectiveSizeCategory,
    autoCalculatedClassification,
  ]);

  /**
   * Reset form to initial state
   * Used for "Save & Create Another" action
   */
  const resetForm = useCallback(() => {
    setForm(initialState);
  }, []);

  /**
   * Reset details only, keep dancers and auto-calculated fields
   * Used for "Create Another Like This" action
   */
  const resetDetailsOnly = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      title: '',
      choreographer: '',
      special_requirements: '',
      is_title_upgrade: false,
      extended_time_requested: false,
      routine_length_minutes: 0,
      routine_length_seconds: 0,
      scheduling_notes: '',
      // Keep: category, classification, selectedDancers, overrides
    }));
  }, []);

  /**
   * Update form field
   */
  const updateField = useCallback(
    <K extends keyof EntryFormV2State>(field: K, value: EntryFormV2State[K]) => {
      // Log category_id updates to track when it's set/cleared
      if (field === 'category_id') {
        console.log('[UPDATE_FIELD] category_id changed:', {
          from: 'current state',
          to: value,
          stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
        });
      }
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Toggle dancer selection
   */
  const toggleDancer = useCallback((dancer: SelectedDancer) => {
    console.log('[TOGGLE_DANCER] Called with:', {
      dancer_id: dancer.dancer_id,
      dancer_name: dancer.dancer_name,
      classification_id: dancer.classification_id
    });

    setForm((prev) => {
      const isSelected = prev.selectedDancers.some(
        (d) => d.dancer_id === dancer.dancer_id
      );

      console.log('[TOGGLE_DANCER] Current state:', {
        isSelected,
        currentlySelectedCount: prev.selectedDancers.length,
        currentlySelected: prev.selectedDancers.map(d => ({ id: d.dancer_id, name: d.dancer_name }))
      });

      if (isSelected) {
        console.log('[TOGGLE_DANCER] REMOVING dancer:', dancer.dancer_id);
        return {
          ...prev,
          selectedDancers: prev.selectedDancers.filter(
            (d) => d.dancer_id !== dancer.dancer_id
          ),
        };
      }

      console.log('[TOGGLE_DANCER] ADDING dancer:', {
        dancer_id: dancer.dancer_id,
        classification_id: dancer.classification_id
      });
      return {
        ...prev,
        selectedDancers: [...prev.selectedDancers, dancer],
      };
    });
  }, []);

  /**
   * Clear age override
   */
  const clearAgeOverride = useCallback(() => {
    setForm((prev) => ({ ...prev, age_override: null }));
  }, []);

  /**
   * Clear size category override
   */
  const clearSizeCategoryOverride = useCallback(() => {
    setForm((prev) => ({ ...prev, size_category_override: null }));
  }, []);

  return {
    form,
    updateField,
    toggleDancer,
    calculatedAge,
    allowedAges,
    effectiveAge,
    inferredAgeGroup, // Keep for DB compatibility
    inferredSizeCategory,
    effectiveAgeGroup, // Keep for DB compatibility
    effectiveSizeCategory,
    canSave,
    validationErrors,
    resetForm,
    resetDetailsOnly,
    clearAgeOverride,
    clearSizeCategoryOverride,
    autoCalculatedClassification, // Expose for exception modal
  };
}
