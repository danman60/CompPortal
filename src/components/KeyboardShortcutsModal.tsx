'use client';

import { useEffect, useState } from 'react';
import FontSizeControl from './FontSizeControl';

interface Shortcut {
  keys: string[];
  description: string;
  context?: string;
}

const shortcuts: Shortcut[] = [
  // Global shortcuts
  { keys: ['?'], description: 'Show keyboard shortcuts', context: 'Global' },
  { keys: ['Esc'], description: 'Close modal / Clear selection', context: 'Global' },
  { keys: ['Ctrl', 'Z'], description: 'Undo action', context: 'Global' },
  { keys: ['Ctrl', 'Y'], description: 'Redo action', context: 'Global' },

  // Table shortcuts
  { keys: ['Ctrl', 'A'], description: 'Select all items', context: 'Table View' },
  { keys: ['Esc'], description: 'Clear selection', context: 'Table View' },

  // Modal shortcuts
  { keys: ['Ctrl', 'Enter'], description: 'Submit action', context: 'Modals' },
  { keys: ['Esc'], description: 'Close modal', context: 'Modals' },

  // Navigation
  { keys: ['Alt', '1'], description: 'Go to Dashboard', context: 'Navigation' },
  { keys: ['Alt', '2'], description: 'Go to Entries', context: 'Navigation' },
  { keys: ['Alt', '3'], description: 'Go to Dancers', context: 'Navigation' },
  { keys: ['Alt', '4'], description: 'Go to Invoices', context: 'Navigation' },
  { keys: ['Alt', '5'], description: 'Go to Reservations', context: 'Navigation' },
];

export default function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open modal with "?" key (Shift + /)
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Don't trigger if typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Group shortcuts by context
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const context = shortcut.context || 'Other';
    if (!acc[context]) acc[context] = [];
    acc[context].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setIsOpen(false)}>
      <div
        className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">⌨️ Keyboard Shortcuts</h2>
            <p className="text-gray-400 text-sm">Navigate faster with these keyboard shortcuts</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Font Size Control */}
        <div className="mb-6">
          <FontSizeControl />
        </div>

        {/* Shortcuts List */}
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([context, contextShortcuts]) => (
            <div key={context}>
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
                {context}
              </h3>
              <div className="space-y-2">
                {contextShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <span className="text-gray-300 text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono text-white min-w-[32px] text-center">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-500 text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono text-white">?</kbd> anytime to toggle this modal
          </p>
        </div>
      </div>
    </div>
  );
}
