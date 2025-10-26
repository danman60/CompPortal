import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Selected dancer for entry
 */
export interface SelectedDancer {
  dancer_id: string;
  dancer_name: string;
  dancer_age: number | null;
}

/**
 * Save action types for entry form
 */
export type SaveAction = 'cancel' | 'save' | 'save-another' | 'save-like-this';

/**
 * Entry form state
 */
export interface EntryFormState {
  // Basic fields
  title: string;
  choreographer: string;
  category_id: string;
  classification_id: string;
  special_requirements: string;

  // Dancer selection
  selectedDancers: SelectedDancer[];
  dancerSearchQuery: string;
  dancerSortBy: 'name' | 'age';

  // Overrides
  age_group_override: string | null;
  size_category_override: string | null;
}

const initialState: EntryFormState = {
  title: '',
  choreographer: '',
  category_id: '',
  classification_id: '',
  special_requirements: '',
  selectedDancers: [],
  dancerSearchQuery: '',
  dancerSortBy: 'name',
  age_group_override: null,
  size_category_override: null,
};

/**
 * Hook for managing entry creation form
 * Handles state, validation, auto-calculations, and save actions
 *
 * According to ENTRY_REBUILD_PLAN.md:
 * - Auto-calculates age group from dancer ages
 * - Auto-calculates size category from dancer count
 * - Supports 4 save actions: cancel, save, save-another, save-like-this
 */
export function useEntryForm(reservationId: string | null) {
  const router = useRouter();
  const [form, setForm] = useState<EntryFormState>(initialState);

  /**
   * Infer age group from average dancer age
   * Returns null if no dancers with ages selected
   */
  const inferredAgeGroup = useMemo(() => {
    if (form.selectedDancers.length === 0) return null;

    const dancersWithAge = form.selectedDancers.filter(d => d.dancer_age !== null);
    if (dancersWithAge.length === 0) return null;

    const avgAge = dancersWithAge.reduce((sum, d) => sum + (d.dancer_age || 0), 0) / dancersWithAge.length;

    // Age group inference logic (align with competition settings)
    // These are common ranges - actual ranges come from competition_age_groups
    if (avgAge < 6) return 'Tiny';
    if (avgAge < 9) return 'Mini';
    if (avgAge < 13) return 'Teen';
    if (avgAge < 16) return 'Junior';
    return 'Senior';
  }, [form.selectedDancers]);

  /**
   * Infer size category from dancer count
   * Returns null if no dancers selected
   */
  const inferredSizeCategory = useMemo(() => {
    const count = form.selectedDancers.length;
    if (count === 0) return null;
    if (count === 1) return 'Solo';
    if (count <= 3) return 'Duet/Trio';
    if (count <= 9) return 'Small Group';
    if (count <= 15) return 'Large Group';
    return 'Line/Production';
  }, [form.selectedDancers]);

  /**
   * Check if form can be saved
   * Requires: title, category, classification, at least 1 dancer
   */
  const canSave = useMemo(() => {
    return (
      form.title.trim().length > 0 &&
      form.category_id.length > 0 &&
      form.classification_id.length > 0 &&
      form.selectedDancers.length > 0 &&
      reservationId !== null
    );
  }, [form.title, form.category_id, form.classification_id, form.selectedDancers, reservationId]);

  /**
   * Reset form to initial state (for "Save & Create Another")
   */
  const resetForm = useCallback(() => {
    setForm(initialState);
  }, []);

  /**
   * Reset details only, keep dancers and auto-calculated fields
   * Used for "Create Another Like This"
   */
  const resetDetailsOnly = useCallback(() => {
    setForm(prev => ({
      ...prev,
      title: '',
      choreographer: '',
      special_requirements: '',
      // Keep: category, classification, selectedDancers, overrides
    }));
  }, []);

  /**
   * Update form field
   */
  const updateField = useCallback(<K extends keyof EntryFormState>(
    field: K,
    value: EntryFormState[K]
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Add dancer to selection
   */
  const addDancer = useCallback((dancer: SelectedDancer) => {
    setForm(prev => {
      // Check if already selected
      if (prev.selectedDancers.some(d => d.dancer_id === dancer.dancer_id)) {
        return prev;
      }
      return {
        ...prev,
        selectedDancers: [...prev.selectedDancers, dancer],
      };
    });
  }, []);

  /**
   * Remove dancer from selection
   */
  const removeDancer = useCallback((dancerId: string) => {
    setForm(prev => ({
      ...prev,
      selectedDancers: prev.selectedDancers.filter(d => d.dancer_id !== dancerId),
    }));
  }, []);

  /**
   * Toggle dancer selection
   */
  const toggleDancer = useCallback((dancer: SelectedDancer) => {
    setForm(prev => {
      const isSelected = prev.selectedDancers.some(d => d.dancer_id === dancer.dancer_id);
      if (isSelected) {
        return {
          ...prev,
          selectedDancers: prev.selectedDancers.filter(d => d.dancer_id !== dancer.dancer_id),
        };
      }
      return {
        ...prev,
        selectedDancers: [...prev.selectedDancers, dancer],
      };
    });
  }, []);

  return {
    form,
    setForm,
    updateField,
    addDancer,
    removeDancer,
    toggleDancer,
    inferredAgeGroup,
    inferredSizeCategory,
    canSave,
    resetForm,
    resetDetailsOnly,
  };
}
