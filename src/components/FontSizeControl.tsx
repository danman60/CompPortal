'use client';

import { useFontSize } from '@/hooks/useFontSize';

/**
 * Font Size Control for accessibility
 * Allows users to adjust text size across the application
 */
export default function FontSizeControl() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">Text Size</h3>
          <p className="text-gray-400 text-sm">Adjust for better readability</p>
        </div>
        <span className="text-2xl">🔍</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFontSize('small')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            fontSize === 'small'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          <span className="text-sm">A</span>
        </button>
        <button
          onClick={() => setFontSize('medium')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            fontSize === 'medium'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          <span className="text-base">A</span>
        </button>
        <button
          onClick={() => setFontSize('large')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            fontSize === 'large'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          <span className="text-lg">A</span>
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Current: {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
      </div>
    </div>
  );
}
