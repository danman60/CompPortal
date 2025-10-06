import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string | null;
  direction: SortDirection;
}

// Helper to get nested property value
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function useTableSort<T>(data: T[], initialKey: keyof T | string | null = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: initialKey,
    direction: null,
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      // Support nested paths (e.g., "dance_categories.name")
      const key = sortConfig.key as string;
      let aValue = key.includes('.') ? getNestedValue(a, key) : (a as any)[key];
      let bValue = key.includes('.') ? getNestedValue(b, key) : (b as any)[key];

      // Handle arrays (e.g., entry_participants) - sort by length
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        aValue = aValue.length;
        bValue = bValue.length;
      } else if (Array.isArray(aValue)) {
        aValue = aValue.length;
        bValue = 0;
      } else if (Array.isArray(bValue)) {
        aValue = 0;
        bValue = bValue.length;
      }

      // Handle boolean (music_file_url existence)
      if (key === 'music_file_url') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings (case-insensitive)
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aString > bString) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null; // Reset to original order
      }
    }

    setSortConfig({ key: direction ? key : null, direction });
  };

  return { sortedData, sortConfig, requestSort };
}
