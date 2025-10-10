interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-shimmer';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const skeletonClass = `${baseClasses} ${variantClasses[variant]} ${className}`;

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={skeletonClass} style={style} />
        ))}
      </div>
    );
  }

  return <div className={skeletonClass} style={style} />;
}

// Pre-built skeleton patterns for common UI elements
export function SkeletonCard() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div className="flex justify-between items-start mb-4">
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <Skeleton width="60%" height={24} className="mb-2" />
      <Skeleton width="100%" count={2} />
      <div className="mt-4 pt-4 border-t border-white/10">
        <Skeleton width="40%" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20 bg-white/5">
              <th className="px-6 py-4">
                <Skeleton width="80%" height={16} />
              </th>
              <th className="px-6 py-4">
                <Skeleton width="60%" height={16} />
              </th>
              <th className="px-6 py-4">
                <Skeleton width="70%" height={16} />
              </th>
              <th className="px-6 py-4">
                <Skeleton width="50%" height={16} />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-white/10">
                <td className="px-6 py-4">
                  <Skeleton width="90%" height={20} />
                  <Skeleton width="60%" height={14} className="mt-1" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton width="50%" height={20} />
                </td>
                <td className="px-6 py-4">
                  <Skeleton width="70%" height={20} />
                </td>
                <td className="px-6 py-4">
                  <Skeleton width="100px" height={32} variant="rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="circular" width={48} height={48} />
            <Skeleton variant="rounded" width={60} height={24} />
          </div>
          <Skeleton width="40%" height={14} className="mb-2" />
          <Skeleton width="50%" height={32} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="flex items-start gap-4">
            <Skeleton variant="circular" width={60} height={60} />
            <div className="flex-1">
              <Skeleton width="70%" height={20} className="mb-2" />
              <Skeleton width="90%" count={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
