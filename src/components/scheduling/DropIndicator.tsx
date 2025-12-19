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
  /** Type of item being dragged */
  variant?: 'routine' | 'award' | 'break';
}

export function DropIndicator({ top, visible, variant = 'routine' }: DropIndicatorProps) {
  if (!visible) return null;

  // Different styles based on what's being dragged
  const getIndicatorStyle = () => {
    switch (variant) {
      case 'award':
        return {
          height: '6px',
          background: 'linear-gradient(90deg, transparent, #fbbf24 10%, #f59e0b 30%, #eab308 50%, #f59e0b 70%, #fbbf24 90%, transparent)',
          boxShadow: '0 0 20px rgba(251, 191, 36, 1), 0 0 12px rgba(245, 158, 11, 0.9), 0 0 6px rgba(234, 179, 8, 0.8)',
          icon: '🏆',
          iconColor: '#fbbf24',
        };
      case 'break':
        return {
          height: '6px',
          background: 'linear-gradient(90deg, transparent, #22d3ee 10%, #06b6d4 30%, #0891b2 50%, #06b6d4 70%, #22d3ee 90%, transparent)',
          boxShadow: '0 0 20px rgba(34, 211, 238, 1), 0 0 12px rgba(6, 182, 212, 0.9), 0 0 6px rgba(8, 145, 178, 0.8)',
          icon: '☕',
          iconColor: '#22d3ee',
        };
      default: // routine
        return {
          height: '4px',
          background: 'linear-gradient(90deg, transparent, #a78bfa 10%, #8b5cf6 50%, #a78bfa 90%, transparent)',
          boxShadow: '0 0 12px rgba(139, 92, 246, 1), 0 0 6px rgba(167, 139, 250, 0.8)',
          icon: null,
          iconColor: null,
        };
    }
  };

  const style = getIndicatorStyle();

  return (
    <>
      {/* Drop indicator line */}
      <div
        className="drop-indicator"
        style={{
          position: 'fixed',
          left: '33%', // Start after left panel (UR)
          right: '1rem', // Account for padding
          height: style.height,
          background: style.background,
          boxShadow: style.boxShadow,
          zIndex: 9999,
          transition: 'top 0.1s ease-out',
          pointerEvents: 'none',
          top: `${top}px`,
          borderRadius: '2px',
        }}
      />

      {/* Icon indicator for blocks */}
      {style.icon && (
        <div
          style={{
            position: 'fixed',
            left: 'calc(33% - 30px)',
            top: `${top - 12}px`,
            fontSize: '24px',
            textShadow: `0 0 8px ${style.iconColor}, 0 0 4px ${style.iconColor}`,
            zIndex: 10000,
            transition: 'top 0.1s ease-out',
            pointerEvents: 'none',
          }}
        >
          {style.icon}
        </div>
      )}
    </>
  );
}
