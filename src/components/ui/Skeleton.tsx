import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
}

/**
 * Skeleton loader component with shimmer animation
 * Used to show loading placeholders that match final content layout
 */
function Skeleton({ className, variant = 'rectangular', ...props }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        'animate-shimmer',
        className
      )}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton for metric cards (dashboard)
 */
function SkeletonMetricCard() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <Skeleton variant="circular" className="h-12 w-12" />

        <div className="flex-1 space-y-3">
          {/* Number */}
          <Skeleton className="h-8 w-20" />

          {/* Label */}
          <Skeleton className="h-4 w-32" />

          {/* Breakdown */}
          <div className="space-y-2 mt-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Pre-built skeleton for table rows
 */
function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex gap-4 p-4 border-b border-white/10">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-5 flex-1" />
      ))}
    </div>
  );
}

/**
 * Pre-built skeleton for dancer cards
 */
function SkeletonDancerCard() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div className="flex items-center gap-4 mb-4">
        {/* Gender badge */}
        <Skeleton variant="rectangular" className="h-6 w-20" />
      </div>

      {/* Name */}
      <Skeleton className="h-6 w-48 mb-3" />

      {/* Studio */}
      <div className="flex items-center gap-2 mb-2">
        <Skeleton variant="circular" className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* DOB */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton variant="circular" className="h-4 w-4" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Status */}
      <Skeleton variant="rectangular" className="h-6 w-16" />
    </div>
  );
}

export { Skeleton, SkeletonMetricCard, SkeletonTableRow, SkeletonDancerCard };
