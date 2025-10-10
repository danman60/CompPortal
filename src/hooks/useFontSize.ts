import { useEffect, useState } from 'react';

type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_KEY = 'compportal-font-size';

const fontSizeClasses: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

/**
 * Hook for managing user font size preferences
 * Persists to localStorage and applies to document root
 */
export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
    if (saved && ['small', 'medium', 'large'].includes(saved)) {
      setFontSizeState(saved);
      applyFontSize(saved);
    }
  }, []);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(FONT_SIZE_KEY, size);
    applyFontSize(size);
  };

  const applyFontSize = (size: FontSize) => {
    // Remove all font size classes
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    // Add new font size class
    document.documentElement.classList.add(`font-size-${size}`);
  };

  return {
    fontSize,
    setFontSize,
    fontSizeClass: fontSizeClasses[fontSize],
  };
}
