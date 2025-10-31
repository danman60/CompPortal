import { useState, useMemo, useCallback } from 'react';

/**
 * Selected dancer for entry
 * Phase 1 Spec lines 528-544: Dancer attachment to entries
 */
export interface SelectedDancer {
  dancer_id: string;
  dancer_name: string;
  dancer_age: number | null;
  date_of_birth: string | null; // For accurate age calculation
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
  age_group_override: string | null;
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
  age_group_override: null,
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
   */
  const calculateAgeAtEvent = useCallback(
    (dateOfBirth: string | null): number | null => {
      if (!dateOfBirth || !eventStartDate) return null;

      const dob = new Date(dateOfBirth);
      const diffMs = eventStartDate.getTime() - dob.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return Math.floor(diffDays / 365);
    },
    [eventStartDate]
  );

  /**
   * Infer age group from YOUNGEST dancer's age
   * Phase 1 Spec lines 552-564
   */
  const inferredAgeGroup = useMemo((): AgeGroup | null => {
    if (form.selectedDancers.length === 0 || !eventStartDate) return null;

    // Calculate ages at event
    const agesAtEvent = form.selectedDancers
      .map((d) => calculateAgeAtEvent(d.date_of_birth))
      .filter((age): age is number => age !== null);

    if (agesAtEvent.length === 0) return null;

    // Find youngest age (spec line 553)
    const youngestAge = Math.min(...agesAtEvent);

    // Match to age divisions (spec line 557-561)
    const match = ageGroups.find(
      (ag) => ag.min_age <= youngestAge && youngestAge <= ag.max_age
    );

    return match || null;
  }, [form.selectedDancers, eventStartDate, ageGroups, calculateAgeAtEvent]);

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
   * Get effective age group (override takes precedence)
   */
  const effectiveAgeGroup = useMemo((): AgeGroup | null => {
    if (form.age_group_override) {
      return ageGroups.find((ag) => ag.id === form.age_group_override) || null;
    }
    return inferredAgeGroup;
  }, [form.age_group_override, inferredAgeGroup, ageGroups]);

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
  const canSave = useMemo(() => {
    return (
      form.title.trim().length >= 3 && // Min 3 chars (spec line 843)
      form.title.trim().length <= 255 && // Max 255 chars
      form.choreographer.trim().length > 0 && // Phase 2 spec lines 36-42: Required
      form.category_id.length > 0 &&
      form.classification_id.length > 0 &&
      form.selectedDancers.length >= 1 && // Min 1 dancer (spec line 844)
      effectiveAgeGroup !== null &&
      effectiveSizeCategory !== null
    );
  }, [
    form.title,
    form.choreographer,
    form.category_id,
    form.classification_id,
    form.selectedDancers,
    effectiveAgeGroup,
    effectiveSizeCategory,
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
    if (!form.classification_id) {
      errors.push('Classification is required');
    }
    // Allow 0 dancers - can be attached later. Summary submission will validate.
    if (form.selectedDancers.length > 0 && !effectiveAgeGroup) {
      errors.push('Cannot determine age group - please select manually');
    }
    if (form.selectedDancers.length > 0 && !effectiveSizeCategory) {
      errors.push('Cannot determine size category - please select manually');
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
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Toggle dancer selection
   */
  const toggleDancer = useCallback((dancer: SelectedDancer) => {
    setForm((prev) => {
      const isSelected = prev.selectedDancers.some(
        (d) => d.dancer_id === dancer.dancer_id
      );

      if (isSelected) {
        return {
          ...prev,
          selectedDancers: prev.selectedDancers.filter(
            (d) => d.dancer_id !== dancer.dancer_id
          ),
        };
      }

      return {
        ...prev,
        selectedDancers: [...prev.selectedDancers, dancer],
      };
    });
  }, []);

  /**
   * Clear age group override
   */
  const clearAgeGroupOverride = useCallback(() => {
    setForm((prev) => ({ ...prev, age_group_override: null }));
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
    inferredAgeGroup,
    inferredSizeCategory,
    effectiveAgeGroup,
    effectiveSizeCategory,
    canSave,
    validationErrors,
    resetForm,
    resetDetailsOnly,
    clearAgeGroupOverride,
    clearSizeCategoryOverride,
  };
}
