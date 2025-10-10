import { useState, useEffect, useCallback, useMemo } from 'react';

export interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'comment' | 'upload' | 'export';
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  action: string;
  target: {
    type: string;
    id: string;
    name: string;
    url?: string;
  };
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ActivityGroup {
  period: string;
  activities: Activity[];
}

interface UseActivityFeedOptions {
  fetchActivities?: () => Promise<Activity[]>;
  pollInterval?: number;
  maxItems?: number;
  groupByTime?: boolean;
  filterTypes?: Activity['type'][];
  autoMarkAsSeen?: boolean;
}

/**
 * Hook for managing activity feed
 * Features:
 * - Real-time activity updates
 * - Time-based grouping
 * - Type filtering
 * - Pagination/infinite scroll
 * - Mark as seen tracking
 * - Auto-refresh
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const {
    fetchActivities,
    pollInterval = 30000, // 30 seconds
    maxItems = 50,
    groupByTime = true,
    filterTypes,
    autoMarkAsSeen = true,
  } = options;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load activities
  const loadActivities = useCallback(async (reset = false) => {
    if (!fetchActivities) return;

    setIsLoading(true);
    setError(null);

    try {
      const newActivities = await fetchActivities();

      if (reset) {
        setActivities(newActivities);
        setPage(1);
        setHasMore(newActivities.length >= maxItems);
      } else {
        setActivities(prev => {
          const combined = [...prev, ...newActivities];
          // Remove duplicates
          const unique = Array.from(
            new Map(combined.map(a => [a.id, a])).values()
          );
          return unique.slice(0, maxItems * page);
        });
        setHasMore(newActivities.length > 0);
      }

      // Auto-mark as seen
      if (autoMarkAsSeen) {
        setSeenIds(prev => {
          const next = new Set(prev);
          newActivities.forEach(a => next.add(a.id));
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, [fetchActivities, maxItems, page, autoMarkAsSeen]);

  // Initial load
  useEffect(() => {
    loadActivities(true);
  }, []);

  // Poll for updates
  useEffect(() => {
    if (!pollInterval || !fetchActivities) return;

    const interval = setInterval(() => {
      loadActivities(true);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, fetchActivities, loadActivities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (filterTypes && filterTypes.length > 0) {
      filtered = filtered.filter(a => filterTypes.includes(a.type));
    }

    return filtered;
  }, [activities, filterTypes]);

  // Group activities by time
  const groupedActivities = useMemo(() => {
    if (!groupByTime) {
      return [{ period: 'All', activities: filteredActivities }];
    }

    const now = Date.now();
    const today = new Date(now).setHours(0, 0, 0, 0);
    const yesterday = today - 86400000; // 24 hours
    const thisWeek = today - 7 * 86400000;
    const thisMonth = today - 30 * 86400000;

    const groups: Record<string, Activity[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      'This Month': [],
      Older: [],
    };

    for (const activity of filteredActivities) {
      const activityDate = new Date(activity.timestamp).setHours(0, 0, 0, 0);

      if (activityDate === today) {
        groups.Today.push(activity);
      } else if (activityDate === yesterday) {
        groups.Yesterday.push(activity);
      } else if (activity.timestamp >= thisWeek) {
        groups['This Week'].push(activity);
      } else if (activity.timestamp >= thisMonth) {
        groups['This Month'].push(activity);
      } else {
        groups.Older.push(activity);
      }
    }

    // Convert to array and filter empty groups
    return Object.entries(groups)
      .filter(([, activities]) => activities.length > 0)
      .map(([period, activities]) => ({ period, activities }));
  }, [filteredActivities, groupByTime]);

  // Load more
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    setPage(prev => prev + 1);
    loadActivities();
  }, [hasMore, isLoading, loadActivities]);

  // Refresh
  const refresh = useCallback(() => {
    loadActivities(true);
  }, [loadActivities]);

  // Mark as seen
  const markAsSeen = useCallback((activityId: string) => {
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(activityId);
      return next;
    });
  }, []);

  // Mark all as seen
  const markAllAsSeen = useCallback(() => {
    setSeenIds(new Set(activities.map(a => a.id)));
  }, [activities]);

  // Check if activity is new
  const isNew = useCallback((activityId: string) => {
    return !seenIds.has(activityId);
  }, [seenIds]);

  // Get unseen count
  const unseenCount = useMemo(() => {
    return activities.filter(a => !seenIds.has(a.id)).length;
  }, [activities, seenIds]);

  return {
    activities: filteredActivities,
    groupedActivities,
    isLoading,
    error,
    hasMore,
    unseenCount,
    loadMore,
    refresh,
    markAsSeen,
    markAllAsSeen,
    isNew,
  };
}

/**
 * Generate activity description from activity data
 */
export function getActivityDescription(activity: Activity): string {
  const { type, action, target } = activity;

  const actionVerbs: Record<Activity['type'], string> = {
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    approve: 'approved',
    reject: 'rejected',
    comment: 'commented on',
    upload: 'uploaded',
    export: 'exported',
  };

  const verb = actionVerbs[type] || action;
  return `${verb} ${target.name}`;
}

/**
 * Get activity icon based on type
 */
export function getActivityIcon(type: Activity['type']): string {
  const icons: Record<Activity['type'], string> = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    approve: '✅',
    reject: '❌',
    comment: '💬',
    upload: '📤',
    export: '📊',
  };

  return icons[type] || '📝';
}

/**
 * Get activity color based on type
 */
export function getActivityColor(type: Activity['type']): string {
  const colors: Record<Activity['type'], string> = {
    create: 'text-green-400',
    update: 'text-blue-400',
    delete: 'text-red-400',
    approve: 'text-green-400',
    reject: 'text-red-400',
    comment: 'text-purple-400',
    upload: 'text-yellow-400',
    export: 'text-indigo-400',
  };

  return colors[type] || 'text-gray-400';
}
