'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NotificationGroup } from '@/hooks/useNotificationGrouping';
import { formatDistanceToNow } from 'date-fns';

const TypeIcons: Record<string, string> = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const TypeColors: Record<string, string> = {
  info: 'border-blue-500/30 bg-blue-500/10',
  success: 'border-green-500/30 bg-green-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  error: 'border-red-500/30 bg-red-500/10',
};

interface NotificationGroupItemProps {
  group: NotificationGroup;
  onExpand?: (groupId: string) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onViewItem?: (url: string) => void;
  className?: string;
}

/**
 * Notification Group Item
 * Displays a grouped notification with expand/collapse
 */
export function NotificationGroupItem({
  group,
  onExpand,
  onMarkAsRead,
  onDelete,
  onViewItem,
  className = '',
}: NotificationGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && onExpand) {
      onExpand(group.id);
    }
  };

  const unreadCount = group.notifications.filter(n => !n.read).length;
  const hasUnread = unreadCount > 0;

  // Single notification - render directly
  if (group.count === 1) {
    const notification = group.notifications[0];
    const content = (
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{notification.icon || TypeIcons[notification.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-sm font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-2">{notification.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </span>
            <div className="flex gap-2">
              {!notification.read && onMarkAsRead && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Mark read
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="text-xs text-gray-400 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    return notification.actionUrl ? (
      <Link
        href={notification.actionUrl}
        onClick={() => onViewItem?.(notification.actionUrl!)}
        className={`block p-4 rounded-lg border transition-all hover:bg-white/10 ${
          notification.read ? 'bg-white/5 border-white/10' : TypeColors[notification.type]
        } ${className}`}
      >
        {content}
      </Link>
    ) : (
      <div
        className={`block p-4 rounded-lg border ${
          notification.read ? 'bg-white/5 border-white/10' : TypeColors[notification.type]
        } ${className}`}
      >
        {content}
      </div>
    );
  }

  // Grouped notifications - collapsible
  return (
    <div
      className={`rounded-lg border transition-all ${
        hasUnread ? TypeColors[group.type] : 'bg-white/5 border-white/10'
      } ${className}`}
    >
      {/* Group header */}
      <button
        onClick={handleToggle}
        className="w-full p-4 text-left hover:bg-white/5 transition-colors rounded-lg"
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            <span className="text-2xl flex-shrink-0">{TypeIcons[group.type]}</span>
            {group.count > 1 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {group.count > 9 ? '9+' : group.count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={`text-sm font-semibold ${hasUnread ? 'text-white' : 'text-gray-300'}`}>
                {group.title}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasUnread && (
                  <span className="text-xs font-medium text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">{group.summary}</p>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(group.latestTimestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded notifications */}
      {isExpanded && (
        <div className="border-t border-white/10 divide-y divide-white/10">
          {group.notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 hover:bg-white/5 transition-colors ${
                notification.actionUrl ? 'cursor-pointer' : ''
              }`}
              onClick={() => {
                if (notification.actionUrl && onViewItem) {
                  onViewItem(notification.actionUrl);
                }
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h5 className={`text-sm ${notification.read ? 'text-gray-300' : 'text-white font-medium'}`}>
                      {notification.title}
                    </h5>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </span>
                    <div className="flex gap-2">
                      {!notification.read && onMarkAsRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
                          }}
                          className="text-xs text-gray-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface NotificationGroupListProps {
  groups: NotificationGroup[];
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onViewItem?: (url: string) => void;
  emptyMessage?: string;
  className?: string;
}

/**
 * Notification Group List
 * Renders a list of grouped notifications
 */
export function NotificationGroupList({
  groups,
  onMarkAsRead,
  onDelete,
  onViewItem,
  emptyMessage = 'No notifications',
  className = '',
}: NotificationGroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📭</div>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {groups.map((group) => (
        <NotificationGroupItem
          key={group.id}
          group={group}
          onMarkAsRead={onMarkAsRead}
          onDelete={onDelete}
          onViewItem={onViewItem}
        />
      ))}
    </div>
  );
}
