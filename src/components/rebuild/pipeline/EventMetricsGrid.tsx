import Link from 'next/link';
import { memo } from 'react';
import { useCountUp } from '@/hooks/rebuild/useCountUp';

interface EventMetric {
  id: string;
  name: string;
  dates: string;
  location: string;
  totalCapacity: number;
  used: number;
  remaining: number;
  percentage: number;
  pendingCount: number;
  studioCount: number;
}

interface EventMetricsGridProps {
  metrics: EventMetric[];
}

const getCapacityBarColor = (percentage: number) => {
  if (percentage >= 90) return 'bg-gradient-to-r from-red-500 to-pink-500';
  if (percentage >= 70) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
  return 'bg-gradient-to-r from-green-500 to-emerald-500';
};

/**
 * Metric card component with counter animation
 * Memoized to prevent re-animation on parent state changes
 */
const MetricCard = memo(({ event }: { event: EventMetric }) => {
  const { count: usedCount } = useCountUp(event.used);
  const { count: remainingCount } = useCountUp(event.remaining);
  const { count: studioCountNum } = useCountUp(event.studioCount);
  const { count: pendingCountNum } = useCountUp(event.pendingCount);

  return (
    <Link
      href={`/dashboard/competitions/${event.id}/edit`}
      className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 relative overflow-hidden hover:bg-white/15 transition-all cursor-pointer block"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-white font-bold mb-1">{event.name}</div>
          <div className="text-xs text-gray-400">{event.dates} • {event.location}</div>
        </div>
        <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-semibold">
          Open
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>
            <span className="text-green-400 font-semibold">{usedCount}</span> / {event.totalCapacity} spaces used
          </span>
          <span>{remainingCount} remaining</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden relative">
          <div
            className={`h-full ${getCapacityBarColor(event.percentage)} transition-all duration-300`}
            style={{ width: `${event.percentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 text-xs">
        <div>
          <div className="text-gray-400">Studios</div>
          <div className="text-white font-semibold">{studioCountNum}</div>
        </div>
        <div>
          <div className="text-gray-400">Pending</div>
          <div className={`font-semibold ${event.pendingCount > 0 ? 'text-yellow-400' : 'text-white'}`}>
            {pendingCountNum > 0 ? `${pendingCountNum} need action` : '0'}
          </div>
        </div>
      </div>
    </Link>
  );
});

MetricCard.displayName = 'MetricCard';

/**
 * Event Capacity Metrics Grid
 * Shows capacity usage for all competitions
 * Sticky at top with click-to-edit
 */
export function EventMetricsGrid({ metrics }: EventMetricsGridProps) {

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-slate-900 via-gray-900 to-black pb-4 -mx-6 px-6 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(event => (
          <MetricCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
