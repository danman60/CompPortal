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
        position: 'absolute',
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, transparent, #8b5cf6 20%, #8b5cf6 80%, transparent)',
        boxShadow: '0 0 10px rgba(139, 92, 246, 0.8)',
        zIndex: 50,
        transition: 'top 0.15s ease-out',
        pointerEvents: 'none',
        top: `${top}px`,
      }}
    />
  );
}
