import { useMemo } from 'react';
import { Notification } from './useNotifications';

export interface NotificationGroup {
  id: string;
  type: Notification['type'];
  title: string;
  count: number;
  notifications: Notification[];
  latestTimestamp: number;
  firstTimestamp: number;
  summary: string;
}

interface UseNotificationGroupingOptions {
  groupBy?: 'type' | 'title' | 'time' | 'none';
  timeWindow?: number; // ms to group notifications within
  minGroupSize?: number; // minimum notifications to create a group
}

/**
 * Hook for intelligent notification grouping
 * Features:
 * - Group by type, title, or time window
 * - Collapse similar notifications
 * - Generate smart summaries
 * - Reduce notification clutter
 */
export function useNotificationGrouping(
  notifications: Notification[],
  options: UseNotificationGroupingOptions = {}
) {
  const {
    groupBy = 'type',
    timeWindow = 3600000, // 1 hour default
    minGroupSize = 2,
  } = options;

  const groups = useMemo(() => {
    if (groupBy === 'none' || notifications.length === 0) {
      return notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        count: 1,
        notifications: [n],
        latestTimestamp: n.timestamp,
        firstTimestamp: n.timestamp,
        summary: n.message,
      }));
    }

    const grouped = new Map<string, Notification[]>();

    // Group notifications
    for (const notification of notifications) {
      let key: string;

      switch (groupBy) {
        case 'type':
          key = notification.type;
          break;
        case 'title':
          key = notification.title;
          break;
        case 'time':
          // Group by hour windows
          const hourKey = Math.floor(notification.timestamp / timeWindow);
          key = `${hourKey}-${notification.type}`;
          break;
        default:
          key = notification.id;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(notification);
    }

    // Convert to group objects
    const result: NotificationGroup[] = [];

    for (const [key, notifs] of grouped.entries()) {
      if (notifs.length < minGroupSize) {
        // Don't group if below minimum size
        notifs.forEach(n => {
          result.push({
            id: n.id,
            type: n.type,
            title: n.title,
            count: 1,
            notifications: [n],
            latestTimestamp: n.timestamp,
            firstTimestamp: n.timestamp,
            summary: n.message,
          });
        });
        continue;
      }

      // Sort by timestamp (newest first)
      const sorted = [...notifs].sort((a, b) => b.timestamp - a.timestamp);
      const latest = sorted[0];
      const oldest = sorted[sorted.length - 1];

      result.push({
        id: `group-${key}`,
        type: latest.type,
        title: generateGroupTitle(sorted, groupBy),
        count: sorted.length,
        notifications: sorted,
        latestTimestamp: latest.timestamp,
        firstTimestamp: oldest.timestamp,
        summary: generateGroupSummary(sorted, groupBy),
      });
    }

    // Sort groups by latest timestamp
    return result.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [notifications, groupBy, timeWindow, minGroupSize]);

  const ungroupedCount = groups.filter(g => g.count === 1).length;
  const groupedCount = groups.filter(g => g.count > 1).length;
  const totalNotifications = notifications.length;

  return {
    groups,
    ungroupedCount,
    groupedCount,
    totalGroups: groups.length,
    totalNotifications,
    reductionPercentage: totalNotifications > 0
      ? Math.round((1 - groups.length / totalNotifications) * 100)
      : 0,
  };
}

function generateGroupTitle(notifications: Notification[], groupBy: string): string {
  if (groupBy === 'type') {
    const type = notifications[0].type;
    const typeLabels = {
      info: 'Information',
      success: 'Success',
      warning: 'Warnings',
      error: 'Errors',
    };
    return `${notifications.length} ${typeLabels[type]}`;
  }

  if (groupBy === 'title') {
    return notifications[0].title;
  }

  if (groupBy === 'time') {
    return 'Recent Activity';
  }

  return `${notifications.length} Notifications`;
}

function generateGroupSummary(notifications: Notification[], groupBy: string): string {
  const count = notifications.length;

  if (groupBy === 'type') {
    const type = notifications[0].type;
    const samples = notifications.slice(0, 2).map(n => n.title).join(', ');

    if (count === 2) {
      return `${samples}`;
    }
    return `${samples}, and ${count - 2} more`;
  }

  if (groupBy === 'title') {
    return `${count} similar notifications`;
  }

  if (groupBy === 'time') {
    const types = new Map<string, number>();
    for (const n of notifications) {
      types.set(n.type, (types.get(n.type) || 0) + 1);
    }

    const parts: string[] = [];
    for (const [type, typeCount] of types.entries()) {
      const label = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'update';
      parts.push(`${typeCount} ${label}${typeCount > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }

  return `${count} notifications`;
}

/**
 * Auto-detect best grouping strategy based on notification patterns
 */
export function detectBestGrouping(notifications: Notification[]): UseNotificationGroupingOptions['groupBy'] {
  if (notifications.length < 3) {
    return 'none';
  }

  // Count duplicates by title
  const titleCounts = new Map<string, number>();
  for (const n of notifications) {
    titleCounts.set(n.title, (titleCounts.get(n.title) || 0) + 1);
  }

  const maxDuplicates = Math.max(...titleCounts.values());
  if (maxDuplicates >= 3) {
    return 'title'; // Many similar notifications
  }

  // Check time clustering
  const sortedByTime = [...notifications].sort((a, b) => a.timestamp - b.timestamp);
  let clusteredCount = 0;
  const timeWindow = 3600000; // 1 hour

  for (let i = 1; i < sortedByTime.length; i++) {
    if (sortedByTime[i].timestamp - sortedByTime[i - 1].timestamp < timeWindow) {
      clusteredCount++;
    }
  }

  if (clusteredCount / notifications.length > 0.6) {
    return 'time'; // Time-clustered
  }

  // Default to type grouping
  return 'type';
}
