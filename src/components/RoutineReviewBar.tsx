'use client';

import { useState } from 'react';

interface RoutineReviewBarProps {
  category?: string;
  classification?: string;
  ageGroup?: string;
  dancers?: Array<{ id: string; first_name: string; last_name: string }>;
  isVisible?: boolean;
}

export default function RoutineReviewBar({
  category,
  classification,
  ageGroup,
  dancers = [],
  isVisible = true,
}: RoutineReviewBarProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) return null;

  const hasContent = !!category || !!classification || !!ageGroup || dancers.length > 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
        isMinimized ? 'translate-y-[calc(100%-3rem)]' : 'translate-y-0'
      }`}
    >
      {/* Minimize/Expand Button */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="absolute -top-10 right-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-t-lg border border-white/20 border-b-0 text-white hover:bg-white/20 transition-colors"
      >
        {isMinimized ? '⬆ Show Review' : '⬇ Hide Review'}
      </button>

      {/* Review Bar */}
      <div className="bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-blue-900/95 backdrop-blur-xl border-t-2 border-white/20 shadow-2xl">
        <div className="container mx-auto px-6 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">📋 Live Review</h3>
            {hasContent && <span className="text-green-400 text-sm">✓ Updating live</span>}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Category</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">🎭</span>
                {category || <span className="text-gray-500">Not selected</span>}
              </div>
            </div>

            {/* Classification */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Classification</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">🏷️</span>
                {classification || <span className="text-gray-500">Not selected</span>}
              </div>
            </div>

            {/* Age Group */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Age Group</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">🎂</span>
                {ageGroup || <span className="text-gray-500">Will auto-calculate</span>}
              </div>
            </div>

            {/* Dancers */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Dancers</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">🩰</span>
                {dancers.length > 0 ? <span>{dancers.length} assigned</span> : <span className="text-gray-500">None assigned yet</span>}
              </div>
            </div>
          </div>

          {/* Dancer List (if assigned) */}
          {dancers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="text-gray-400 text-xs mb-2">Assigned Dancers:</div>
              <div className="flex flex-wrap gap-2">
                {dancers.map((dancer) => (
                  <span
                    key={dancer.id}
                    className="bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-sm border border-purple-400/30"
                  >
                    {dancer.first_name} {dancer.last_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

