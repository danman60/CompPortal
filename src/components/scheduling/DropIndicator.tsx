'use client';

/**
 * DropIndicator Component (Rebuild Spec Section 2)
 *
 * Purple gradient line shown between rows during drag-and-drop
 * Provides visual feedback for drop position
 *
 * Spec: SCHEDULE_PAGE_REBUILD_SPEC.md Lines 150-176
 */

import React from 'react';

interface DropIndicatorProps {
  /** Y-position in pixels from top of container */
  top: number;
  /** Whether to show the indicator */
  visible: boolean;
}

export function DropIndicator({ top, visible }: DropIndicatorProps) {
  if (!visible) return null;

  return (
    <div
      className="drop-indicator"
      style={{
        position: 'fixed',
        left: '33%', // Start after left panel (UR)
        right: '1rem', // Account for padding
        height: '4px',
        background: 'linear-gradient(90deg, transparent, #a78bfa 10%, #8b5cf6 50%, #a78bfa 90%, transparent)',
        boxShadow: '0 0 12px rgba(139, 92, 246, 1), 0 0 6px rgba(167, 139, 250, 0.8)',
        zIndex: 9999,
        transition: 'top 0.1s ease-out',
        pointerEvents: 'none',
        top: `${top}px`,
        borderRadius: '2px',
      }}
    />
  );
}
