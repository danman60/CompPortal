import { useState, useEffect } from 'react';

interface SmartDefaults {
  competition_id?: string;
  category_id?: string;
  classification_id?: string;
  age_group_id?: string;
  entry_size_category_id?: string;
}

interface UseSmartDefaultsOptions {
  key: string;
  enabled?: boolean;
}

/**
 * Hook to remember and auto-fill last used form values.
 * Stores preferences in localStorage and loads them on next form use.
 */
export function useSmartDefaults({ key, enabled = true }: UseSmartDefaultsOptions) {
  const [defaults, setDefaults] = useState<SmartDefaults>({});

  // Load saved defaults on mount
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDefaults(parsed);
      }
    } catch (error) {
      console.error('Failed to load smart defaults:', error);
    }
  }, [key, enabled]);

  // Save defaults to localStorage
  const saveDefaults = (values: SmartDefaults) => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(values));
      setDefaults(values);
    } catch (error) {
      console.error('Failed to save smart defaults:', error);
    }
  };

  // Clear saved defaults
  const clearDefaults = () => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(key);
      setDefaults({});
    } catch (error) {
      console.error('Failed to clear smart defaults:', error);
    }
  };

  return {
    defaults,
    saveDefaults,
    clearDefaults,
  };
}
