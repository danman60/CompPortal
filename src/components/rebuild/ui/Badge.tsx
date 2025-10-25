import React from 'react';

interface BadgeProps {
  status?: 'draft' | 'submitted' | 'confirmed' | 'approved' | 'rejected' | 'pending' | 'summarized' | 'invoiced' | 'closed';
  variant?: 'success' | 'warning' | 'error' | 'info';
  children?: React.ReactNode;
}

/**
 * Status badge component
 * Supports all Phase 1 reservation and entry statuses
 */
export function Badge({ status, variant, children }: BadgeProps) {
  const getColorClass = () => {
    // Entry statuses
    if (status === 'draft') return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    if (status === 'submitted') return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
    if (status === 'confirmed') return 'bg-green-500/20 text-green-300 border-green-500/50';

    // Reservation statuses
    if (status === 'pending') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
    if (status === 'approved') return 'bg-green-500/20 text-green-300 border-green-500/50';
    if (status === 'rejected') return 'bg-red-500/20 text-red-300 border-red-500/50';
    if (status === 'summarized') return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
    if (status === 'invoiced') return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50';
    if (status === 'closed') return 'bg-gray-500/20 text-gray-400 border-gray-500/50';

    // Generic variants
    if (variant === 'success') return 'bg-green-500/20 text-green-300 border-green-500/50';
    if (variant === 'warning') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
    if (variant === 'error') return 'bg-red-500/20 text-red-300 border-red-500/50';
    if (variant === 'info') return 'bg-blue-500/20 text-blue-300 border-blue-500/50';

    return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
  };

  const displayText = children || status || variant;

  return (
    <span className={`
      px-3 py-1
      rounded-full
      text-xs
      font-medium
      uppercase
      border
      ${getColorClass()}
    `}>
      {displayText}
    </span>
  );
}
