import { useState, useEffect, useCallback } from 'react';

export interface RecentItem {
  id: string;
  type: 'routine' | 'dancer' | 'invoice' | 'competition' | 'studio' | 'reservation';
  title: string;
  subtitle?: string;
  href: string;
  timestamp: number;
}

interface UseRecentItemsOptions {
  maxItems?: number;
  storageKey?: string;
}

/**
 * Hook to track and manage recently accessed items
 * Stores in localStorage for persistence across sessions
 */
export function useRecentItems(options: UseRecentItemsOptions = {}) {
  const { maxItems = 10, storageKey = 'compportal-recent-items' } = options;
  const [items, setItems] = useState<RecentItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentItem[];
        setItems(parsed.slice(0, maxItems));
      }
    } catch (error) {
      console.error('Failed to load recent items:', error);
    }
  }, [storageKey, maxItems]);

  // Add item to recent list
  const addItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setItems((current) => {
      // Remove existing item with same ID (to update timestamp)
      const filtered = current.filter((i) => i.id !== item.id);

      // Add new item at the beginning
      const updated = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, maxItems);

      // Save to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent items:', error);
      }

      return updated;
    });
  }, [maxItems, storageKey]);

  // Remove item from recent list
  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const updated = current.filter((i) => i.id !== id);

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent items:', error);
      }

      return updated;
    });
  }, [storageKey]);

  // Clear all recent items
  const clearAll = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear recent items:', error);
    }
  }, [storageKey]);

  // Get items by type
  const getByType = useCallback((type: RecentItem['type']) => {
    return items.filter((item) => item.type === type);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    clearAll,
    getByType,
  };
}
