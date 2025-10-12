import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';

interface UseAutoSaveOptions {
  key: string;
  debounceMs?: number;
  enabled?: boolean;
}

interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
}

export function useAutoSave<T>(data: T, options: UseAutoSaveOptions) {
  const { key, debounceMs = 2000, enabled = true } = options;
  const [status, setStatus] = useState<AutoSaveStatus>({ status: 'idle' });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const initialLoadRef = useRef(false);

  // Load saved data on mount
  const loadSaved = (): T | null => {
    if (typeof window === 'undefined') return null;

    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      return parsed.data as T;
    } catch (error) {
      logger.error('Failed to load auto-saved data', { error: error instanceof Error ? error : new Error(String(error)) });
      return null;
    }
  };

  // Save data to localStorage
  const save = (dataToSave: T) => {
    if (typeof window === 'undefined' || !enabled) return;

    try {
      setStatus({ status: 'saving' });

      localStorage.setItem(key, JSON.stringify({
        data: dataToSave,
        timestamp: new Date().toISOString(),
      }));

      setStatus({
        status: 'saved',
        lastSaved: new Date(),
      });
    } catch (error) {
      logger.error('Failed to auto-save data', { error: error instanceof Error ? error : new Error(String(error)) });
      setStatus({ status: 'error' });
    }
  };

  // Clear saved data
  const clearSaved = () => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(key);
      setStatus({ status: 'idle' });
    } catch (error) {
      logger.error('Failed to clear auto-saved data', { error: error instanceof Error ? error : new Error(String(error)) });
    }
  };

  // Debounced auto-save
  useEffect(() => {
    // Skip initial render to avoid saving empty data
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      return;
    }

    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, key]);

  return {
    status,
    loadSaved,
    clearSaved,
    manualSave: () => save(data),
  };
}
