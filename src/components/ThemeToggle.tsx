'use client';

import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * Theme Toggle Button
 * Switches between light, dark, and system modes
 */
export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const icons = {
    light: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    dark: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    system: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  };

  const labels = {
    light: 'Light Mode',
    dark: 'Dark Mode',
    system: 'System Theme',
  };

  const nextTheme: Record<typeof theme, typeof theme> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  };

  return (
    <button
      onClick={() => setTheme(nextTheme[theme])}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
      aria-label={`Current theme: ${labels[theme]}. Click to switch.`}
      title={labels[theme]}
    >
      {icons[theme]}
    </button>
  );
}

/**
 * Theme Selector Dropdown
 * Full theme selection menu
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes: Array<{ value: typeof theme; label: string; icon: React.ReactNode; description: string }> = [
    {
      value: 'light',
      label: 'Light',
      description: 'Bright and clean',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'system',
      label: 'System',
      description: 'Match device setting',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-gray-300 hover:text-white"
        aria-label="Theme settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span className="text-sm font-medium">Theme</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-50 p-2 animate-fade-in">
            <div className="mb-2 px-3 py-2">
              <h3 className="text-sm font-semibold text-white">Theme Preference</h3>
              <p className="text-xs text-gray-400 mt-1">Choose how EMPWR looks</p>
            </div>

            <div className="space-y-1">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    theme === themeOption.value
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'hover:bg-white/5 text-gray-300 border border-transparent'
                  }`}
                >
                  <div className={`${theme === themeOption.value ? 'text-purple-400' : 'text-gray-400'}`}>
                    {themeOption.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{themeOption.label}</div>
                    <div className="text-xs text-gray-500">{themeOption.description}</div>
                  </div>
                  {theme === themeOption.value && (
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
