import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface UseThemeOptions {
  storageKey?: string;
}

/**
 * Hook to manage light/dark theme preferences
 * Features:
 * - Light, dark, and system (auto) modes
 * - LocalStorage persistence
 * - System preference detection
 * - CSS class application to <html>
 */
export function useTheme(options: UseThemeOptions = {}) {
  const { storageKey = 'compportal-theme' } = options;
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Apply theme to HTML element
  const applyTheme = useCallback((appliedTheme: 'light' | 'dark') => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the active theme class
    root.classList.add(appliedTheme);

    setResolvedTheme(appliedTheme);
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored);

        const effectiveTheme = stored === 'system' ? getSystemTheme() : stored;
        applyTheme(effectiveTheme);
      } else {
        // Default to system
        const systemTheme = getSystemTheme();
        applyTheme(systemTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      const systemTheme = getSystemTheme();
      applyTheme(systemTheme);
    }
  }, [storageKey, getSystemTheme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  // Set theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }

    const effectiveTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyTheme(effectiveTheme);
  }, [storageKey, getSystemTheme, applyTheme]);

  // Toggle between light and dark (skipping system)
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
}
