/**
 * Skeleton Loader Components
 * Professional loading states with shimmer animation
 */

export function EntrySkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-white/20 p-6 animate-pulse">
      {/* Header with entry number and status badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="h-8 w-20 bg-white/20 rounded animate-shimmer"></div>
        <div className="h-6 w-16 bg-white/20 rounded-full animate-shimmer"></div>
      </div>

      {/* Fee display */}
      <div className="h-10 w-32 bg-white/20 rounded mb-4 animate-shimmer"></div>

      {/* Details rows */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-4 w-32 bg-white/20 rounded animate-shimmer"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-4 w-24 bg-white/20 rounded animate-shimmer"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-4 w-28 bg-white/20 rounded animate-shimmer"></div>
        </div>
      </div>

      {/* Dancers section */}
      <div className="mt-4">
        <div className="h-4 w-16 bg-white/20 rounded mb-2 animate-shimmer"></div>
        <div className="h-4 w-40 bg-white/20 rounded animate-shimmer"></div>
      </div>

      {/* Music status */}
      <div className="h-6 w-36 bg-white/20 rounded mt-4 animate-shimmer"></div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <div className="h-10 flex-1 bg-white/20 rounded animate-shimmer"></div>
        <div className="h-10 w-24 bg-white/20 rounded animate-shimmer"></div>
      </div>
    </div>
  );
}

export function EventMetricSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border-2 border-purple-400/30 p-6 animate-pulse">
      {/* Event name and date */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="h-6 w-48 bg-white/20 rounded mb-2 animate-shimmer"></div>
          <div className="h-4 w-32 bg-white/20 rounded animate-shimmer"></div>
        </div>
        <div className="h-6 w-16 bg-white/20 rounded-full animate-shimmer"></div>
      </div>

      {/* Capacity display */}
      <div className="mb-4">
        <div className="h-6 w-40 bg-white/20 rounded mb-2 animate-shimmer"></div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-white/20 animate-shimmer"></div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between">
        <div>
          <div className="h-4 w-16 bg-white/20 rounded mb-1 animate-shimmer"></div>
          <div className="h-6 w-8 bg-white/20 rounded animate-shimmer"></div>
        </div>
        <div>
          <div className="h-4 w-16 bg-white/20 rounded mb-1 animate-shimmer"></div>
          <div className="h-6 w-8 bg-white/20 rounded animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-white/10 animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 w-8 bg-white/20 rounded animate-shimmer"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-32 bg-white/20 rounded animate-shimmer"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-white/20 rounded animate-shimmer"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-16 bg-white/20 rounded animate-shimmer"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-20 bg-white/20 rounded animate-shimmer"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-20 bg-white/20 rounded-full animate-shimmer"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-white/20 rounded animate-shimmer"></div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-8 w-16 bg-white/20 rounded animate-shimmer"></div>
        </div>
      </td>
    </tr>
  );
}

export function PipelineTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Studio</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Competition</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Requested</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Routines</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Last Action</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </tbody>
      </table>
    </div>
  );
}
