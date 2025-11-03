'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  action: string;
  entityType: string | null;
  entityName: string | null;
  createdAt: Date;
  user: {
    name: string;
    role: string | null;
  };
  tenant: {
    name: string;
    subdomain: string;
  } | null;
}

/**
 * Super Admin Activity Bar
 * Shows last 5 user actions in a compact, auto-refreshing notification bar
 * Appears at top of Super Admin dashboard only
 */
export function SuperAdminActivityBar() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());

  // Fetch activities
  const { data, isLoading, error, refetch } = trpc.activity.getRecentActivityForSuperAdmin.useQuery(
    undefined,
    {
      refetchInterval: 10000, // Refresh every 10 seconds
      retry: false, // Don't retry if user isn't SA
    }
  );

  // Update activities when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Check for new activities
      const currentIds = new Set(activities.map(a => a.id));
      const newIds = data
        .filter(a => !currentIds.has(a.id))
        .map(a => a.id);

      if (newIds.length > 0) {
        setNewActivityIds(new Set(newIds));
        // Clear new badges after 5 seconds
        setTimeout(() => {
          setNewActivityIds(new Set());
        }, 5000);
      }

      setActivities(data as Activity[]);
    }
  }, [data]);

  // Don't show if not visible, error (not SA), loading, or no data
  if (!isVisible || error || isLoading || !activities || activities.length === 0) {
    return null;
  }

  const getActionEmoji = (action: string) => {
    if (action.includes('create') || action.includes('add')) return '➕';
    if (action.includes('update') || action.includes('edit')) return '✏️';
    if (action.includes('delete') || action.includes('remove')) return '🗑️';
    if (action.includes('login')) return '🔐';
    if (action.includes('claim')) return '🎉';
    if (action.includes('approve')) return '✅';
    if (action.includes('reject')) return '❌';
    return '📌';
  };

  const formatAction = (activity: Activity) => {
    const action = activity.action || 'performed action';
    const entity = activity.entityName || activity.entityType || 'item';
    const tenant = activity.tenant?.name || 'Unknown';

    return `${activity.user.name} ${action} ${entity} (${tenant})`;
  };

  return (
    <div className="relative bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg mb-6 overflow-hidden">
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white z-10"
        aria-label="Hide activity bar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="text-sm font-semibold text-purple-300">Live Activity Feed</h3>
        <span className="text-xs text-gray-400">Auto-refreshes every 10s</span>
      </div>

      {/* Activity list */}
      <div className="px-4 py-3 space-y-2">
        {activities.map((activity, index) => {
          const isNew = newActivityIds.has(activity.id);

          return (
            <div
              key={activity.id}
              className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
                isNew
                  ? 'bg-purple-500/20 border border-purple-500/50 animate-fade-in'
                  : 'bg-white/5'
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Emoji icon */}
              <span className="text-lg flex-shrink-0">
                {getActionEmoji(activity.action || '')}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 leading-tight">
                  {formatAction(activity)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                  {activity.user.role && (
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
                      {activity.user.role}
                    </span>
                  )}
                  {isNew && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/50 text-purple-200 font-medium">
                      NEW
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/10 bg-white/5 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Showing last {activities.length} actions
        </span>
        <button
          onClick={() => refetch()}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}
