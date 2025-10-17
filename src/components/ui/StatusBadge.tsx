/**
 * StatusBadge Component
 *
 * Reusable status badge with consistent styling across all views.
 * Replaces 12+ duplicated status badge implementations.
 *
 * Created: Wave 1.2 (StatusBadge Component)
 */

'use client';

interface StatusBadgeProps {
  status: 'confirmed' | 'registered' | 'cancelled' | 'draft' | 'pending' | 'approved' | 'rejected' | 'DRAFT' | 'SENT' | 'PAID' | 'UNPAID';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_STYLES = {
  confirmed: 'bg-green-500/20 text-green-400 border-green-400/30',
  approved: 'bg-green-500/20 text-green-400 border-green-400/30',
  PAID: 'bg-green-500/20 text-green-400 border-green-400/30',
  registered: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
  SENT: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  UNPAID: 'bg-orange-500/20 text-orange-400 border-orange-400/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-400/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-400/30',
  draft: 'bg-gray-500/20 text-gray-400 border-gray-400/30',
  DRAFT: 'bg-gray-500/20 text-gray-400 border-gray-400/30',
} as const;

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const statusKey = status as keyof typeof STATUS_STYLES;
  const statusStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.draft;

  return (
    <span className={`rounded-full font-semibold uppercase border ${statusStyle} ${SIZE_CLASSES[size]} ${className}`}>
      {status}
    </span>
  );
}
