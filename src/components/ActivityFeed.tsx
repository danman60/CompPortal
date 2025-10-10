'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ActivityGroup,
  getActivityDescription,
  getActivityIcon,
  getActivityColor,
} from '@/hooks/useActivityFeed';

interface ActivityItemProps {
  activity: Activity;
  isNew?: boolean;
  onMarkAsSeen?: (id: string) => void;
  showAvatar?: boolean;
  className?: string;
}

/**
 * Activity Item
 * Individual activity display with actor, action, and timestamp
 */
export function ActivityItem({
  activity,
  isNew = false,
  onMarkAsSeen,
  showAvatar = true,
  className = '',
}: ActivityItemProps) {
  const handleClick = () => {
    if (isNew && onMarkAsSeen) {
      onMarkAsSeen(activity.id);
    }
  };

  const content = (
    <div className="flex items-start gap-3">
      {/* Icon/Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          {activity.actor.avatar ? (
            <img
              src={activity.actor.avatar}
              alt={activity.actor.name}
              className="w-10 h-10 rounded-full border border-white/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
              <span className="text-xl">{getActivityIcon(activity.type)}</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`text-sm ${isNew ? 'text-white font-medium' : 'text-gray-300'}`}>
            <span className="font-semibold">{activity.actor.name}</span>
            {' '}
            <span className={getActivityColor(activity.type)}>
              {getActivityDescription(activity)}
            </span>
          </p>
          {isNew && (
            <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
          )}
        </div>

        {/* Metadata */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <p className="text-xs text-gray-400 mb-1">
            {Object.entries(activity.metadata)
              .slice(0, 2)
              .map(([key, value]) => `${key}: ${value}`)
              .join(' • ')}
          </p>
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );

  return activity.target.url ? (
    <Link
      href={activity.target.url}
      onClick={handleClick}
      className={`block p-3 rounded-lg transition-all hover:bg-white/10 ${
        isNew ? 'bg-purple-500/10 border border-purple-500/30' : 'border border-transparent'
      } ${className}`}
    >
      {content}
    </Link>
  ) : (
    <div
      onClick={handleClick}
      className={`block p-3 rounded-lg ${
        isNew ? 'bg-purple-500/10 border border-purple-500/30' : 'border border-transparent'
      } ${className}`}
    >
      {content}
    </div>
  );
}

interface ActivityGroupSectionProps {
  group: ActivityGroup;
  isNew?: (id: string) => boolean;
  onMarkAsSeen?: (id: string) => void;
  showAvatars?: boolean;
}

/**
 * Activity Group Section
 * Time-based grouping of activities
 */
export function ActivityGroupSection({
  group,
  isNew,
  onMarkAsSeen,
  showAvatars = true,
}: ActivityGroupSectionProps) {
  return (
    <div className="mb-6">
      {/* Period header */}
      <div className="flex items-center gap-2 mb-3 px-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase">{group.period}</h3>
        <div className="flex-1 h-px bg-white/10"></div>
      </div>

      {/* Activities */}
      <div className="space-y-1">
        {group.activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isNew={isNew?.(activity.id)}
            onMarkAsSeen={onMarkAsSeen}
            showAvatar={showAvatars}
          />
        ))}
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  groups: ActivityGroup[];
  isLoading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  unseenCount?: number;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onMarkAsSeen?: (id: string) => void;
  onMarkAllAsSeen?: () => void;
  isNew?: (id: string) => boolean;
  emptyMessage?: string;
  showAvatars?: boolean;
  className?: string;
}

/**
 * Activity Feed
 * Main feed component with infinite scroll and refresh
 */
export function ActivityFeed({
  groups,
  isLoading = false,
  error = null,
  hasMore = false,
  unseenCount = 0,
  onLoadMore,
  onRefresh,
  onMarkAsSeen,
  onMarkAllAsSeen,
  isNew,
  emptyMessage = 'No recent activity',
  showAvatars = true,
  className = '',
}: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Infinite scroll detection
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setIsNearBottom(nearBottom);

      if (nearBottom && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, onLoadMore]);

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-2">⚠️</div>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (groups.length === 0 && !isLoading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-2">📭</div>
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4 px-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          {unseenCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
              {unseenCount} new
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {unseenCount > 0 && onMarkAllAsSeen && (
            <button
              onClick={onMarkAllAsSeen}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1"
            >
              Mark all as seen
            </button>
          )}
        </div>
      </div>

      {/* Activity groups */}
      <div ref={scrollRef} className="overflow-y-auto max-h-[600px] space-y-4">
        {groups.map((group) => (
          <ActivityGroupSection
            key={group.period}
            group={group}
            isNew={isNew}
            onMarkAsSeen={onMarkAsSeen}
            showAvatars={showAvatars}
          />
        ))}

        {/* Loading more indicator */}
        {isLoading && (
          <div className="text-center py-4">
            <svg className="w-6 h-6 text-purple-400 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Load more button */}
        {hasMore && !isLoading && !isNearBottom && onLoadMore && (
          <div className="text-center py-4">
            <button
              onClick={onLoadMore}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm transition-all border border-white/10"
            >
              Load More
            </button>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && groups.length > 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">End of activity feed</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityFeedPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groups: ActivityGroup[];
  isLoading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  unseenCount?: number;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onMarkAsSeen?: (id: string) => void;
  onMarkAllAsSeen?: () => void;
  isNew?: (id: string) => boolean;
}

/**
 * Activity Feed Panel
 * Sliding panel variant for sidebar/drawer
 */
export function ActivityFeedPanel({
  isOpen,
  onClose,
  groups,
  isLoading,
  error,
  hasMore,
  unseenCount,
  onLoadMore,
  onRefresh,
  onMarkAsSeen,
  onMarkAllAsSeen,
  isNew,
}: ActivityFeedPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-gradient-to-br from-gray-900 to-gray-800 border-l border-white/20 shadow-2xl z-50 animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Activity Feed</h2>
              {unseenCount && unseenCount > 0 && (
                <p className="text-xs text-purple-300">{unseenCount} new activities</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-hidden">
          <ActivityFeed
            groups={groups}
            isLoading={isLoading}
            error={error}
            hasMore={hasMore}
            unseenCount={unseenCount}
            onLoadMore={onLoadMore}
            onRefresh={onRefresh}
            onMarkAsSeen={onMarkAsSeen}
            onMarkAllAsSeen={onMarkAllAsSeen}
            isNew={isNew}
            className="h-full p-4"
          />
        </div>
      </div>
    </>
  );
}

interface ActivityBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Activity Badge
 * Compact unread count badge
 */
export function ActivityBadge({ count, onClick, className = '' }: ActivityBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10 ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm font-medium">Activity</span>
      {count > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
