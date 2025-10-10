'use client';

import { useState } from 'react';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Contextual Help Tooltip
 * Displays helpful information on hover/click
 */
export function HelpTooltip({ content, title, position = 'top', className = '' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 transition-all hover:scale-110"
        aria-label="Help"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute z-50 ${positionClasses[position]} w-64 animate-fade-in`}>
          <div className="bg-gray-900 border border-purple-500/30 rounded-lg shadow-2xl p-4">
            {title && (
              <div className="text-sm font-semibold text-purple-300 mb-2">{title}</div>
            )}
            <div className="text-xs text-gray-300 leading-relaxed">
              {content}
            </div>
          </div>
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 border-purple-500/30 transform rotate-45 ${
              position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b' :
              position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t' :
              position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t border-r' :
              'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-b border-l'
            }`}
          />
        </div>
      )}
    </div>
  );
}

interface HelpPanelProps {
  children: React.ReactNode;
  title?: string;
  onClose: () => void;
}

/**
 * Sliding Help Panel
 * Full contextual help sidebar
 */
export function HelpPanel({ children, title = 'Help', onClose }: HelpPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-gradient-to-br from-gray-900 to-gray-800 border-l border-white/20 z-50 overflow-y-auto shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-white/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {children}
        </div>
      </div>
    </>
  );
}

interface HelpSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Help Section
 * Organized help content block
 */
export function HelpSection({ title, children, icon }: HelpSectionProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <div className="flex items-start gap-3 mb-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="text-sm text-gray-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/**
 * Inline Help Text
 * Small help hints directly in forms
 */
export function HelpText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-xs text-gray-400 mt-1 flex items-start gap-1 ${className}`}>
      <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

// Keyboard shortcut display component
export function KeyboardShortcut({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="inline-flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono text-purple-300 min-w-[24px] text-center">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-gray-500 text-xs">+</span>}
        </span>
      ))}
    </div>
  );
}
