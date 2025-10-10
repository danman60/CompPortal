import { useState, useEffect, useCallback } from 'react';

export interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, any>;
  context: 'routines' | 'dancers' | 'invoices' | 'reservations' | 'studios' | 'competitions';
  createdAt: number;
  usageCount: number;
}

interface UseSavedSearchesOptions {
  context: SavedSearch['context'];
  maxSearches?: number;
  storageKey?: string;
}

/**
 * Hook to manage saved search/filter combinations
 * Stores in localStorage with usage tracking
 */
export function useSavedSearches(options: UseSavedSearchesOptions) {
  const { context, maxSearches = 20, storageKey = 'compportal-saved-searches' } = options;
  const [searches, setSearches] = useState<SavedSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const allSearches = JSON.parse(stored) as SavedSearch[];
        // Filter by context and sort by usage count
        const contextSearches = allSearches
          .filter((s) => s.context === context)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, maxSearches);
        setSearches(contextSearches);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  }, [context, maxSearches, storageKey]);

  // Save search
  const saveSearch = useCallback((name: string, filters: Record<string, any>) => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name,
      filters,
      context,
      createdAt: Date.now(),
      usageCount: 1,
    };

    setSearches((current) => {
      // Check if search with same name already exists
      const existing = current.find((s) => s.name.toLowerCase() === name.toLowerCase());

      let updated: SavedSearch[];
      if (existing) {
        // Update existing search with new filters
        updated = current.map((s) =>
          s.id === existing.id
            ? { ...s, filters, usageCount: s.usageCount + 1 }
            : s
        );
      } else {
        // Add new search
        updated = [newSearch, ...current].slice(0, maxSearches);
      }

      // Save to localStorage (all contexts)
      try {
        const stored = localStorage.getItem(storageKey);
        const allSearches = stored ? JSON.parse(stored) as SavedSearch[] : [];

        // Replace searches for current context
        const otherContexts = allSearches.filter((s) => s.context !== context);
        const combined = [...updated, ...otherContexts];

        localStorage.setItem(storageKey, JSON.stringify(combined));
      } catch (error) {
        console.error('Failed to save searches:', error);
      }

      return updated;
    });

    return newSearch;
  }, [context, maxSearches, storageKey]);

  // Apply saved search (increments usage count)
  const applySearch = useCallback((searchId: string) => {
    const search = searches.find((s) => s.id === searchId);
    if (!search) return null;

    // Increment usage count
    setSearches((current) => {
      const updated = current.map((s) =>
        s.id === searchId ? { ...s, usageCount: s.usageCount + 1 } : s
      );

      // Save to localStorage
      try {
        const stored = localStorage.getItem(storageKey);
        const allSearches = stored ? JSON.parse(stored) as SavedSearch[] : [];
        const otherContexts = allSearches.filter((s) => s.context !== context);
        const combined = [...updated, ...otherContexts];
        localStorage.setItem(storageKey, JSON.stringify(combined));
      } catch (error) {
        console.error('Failed to update search usage:', error);
      }

      return updated.sort((a, b) => b.usageCount - a.usageCount);
    });

    return search.filters;
  }, [searches, context, storageKey]);

  // Delete search
  const deleteSearch = useCallback((searchId: string) => {
    setSearches((current) => {
      const updated = current.filter((s) => s.id !== searchId);

      try {
        const stored = localStorage.getItem(storageKey);
        const allSearches = stored ? JSON.parse(stored) as SavedSearch[] : [];
        const otherContexts = allSearches.filter((s) => s.context !== context);
        const combined = [...updated, ...otherContexts];
        localStorage.setItem(storageKey, JSON.stringify(combined));
      } catch (error) {
        console.error('Failed to delete search:', error);
      }

      return updated;
    });
  }, [context, storageKey]);

  // Rename search
  const renameSearch = useCallback((searchId: string, newName: string) => {
    setSearches((current) => {
      const updated = current.map((s) =>
        s.id === searchId ? { ...s, name: newName } : s
      );

      try {
        const stored = localStorage.getItem(storageKey);
        const allSearches = stored ? JSON.parse(stored) as SavedSearch[] : [];
        const otherContexts = allSearches.filter((s) => s.context !== context);
        const combined = [...updated, ...otherContexts];
        localStorage.setItem(storageKey, JSON.stringify(combined));
      } catch (error) {
        console.error('Failed to rename search:', error);
      }

      return updated;
    });
  }, [context, storageKey]);

  // Clear all searches for current context
  const clearAll = useCallback(() => {
    setSearches([]);

    try {
      const stored = localStorage.getItem(storageKey);
      const allSearches = stored ? JSON.parse(stored) as SavedSearch[] : [];
      const otherContexts = allSearches.filter((s) => s.context !== context);
      localStorage.setItem(storageKey, JSON.stringify(otherContexts));
    } catch (error) {
      console.error('Failed to clear searches:', error);
    }
  }, [context, storageKey]);

  return {
    searches,
    saveSearch,
    applySearch,
    deleteSearch,
    renameSearch,
    clearAll,
  };
}
