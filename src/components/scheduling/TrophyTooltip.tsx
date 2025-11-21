'use client';

/**
 * Trophy Tooltip Component
 *
 * Displays trophy icon with React Portal tooltip to indicate last routine in category.
 * Uses absolute positioning and Portal to prevent layout interference with schedule table.
 *
 * Fix for: Trophy helper breaking schedule table layout (BLOCKER_TROPHY_HELPER.md)
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface TrophyTooltipProps {
  routineId: string;
  entrySizeName: string;
  ageGroupName: string;
  classificationName: string;
}

export function TrophyTooltip({
  routineId,
  entrySizeName,
  ageGroupName,
  classificationName
}: TrophyTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <span
        className="text-yellow-400 text-sm cursor-help inline-block"
        style={{ width: '16px', height: '16px', lineHeight: '16px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        🏆
      </span>
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed bg-gray-900/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-yellow-400/50 z-[9999] pointer-events-none"
          style={{ left: position.x, top: position.y }}
        >
          Last routine for {entrySizeName} • {ageGroupName} • {classificationName}
        </div>,
        document.body
      )}
    </>
  );
}
