'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const TypeIcons: Record<Notification['type'], string> = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const TypeColors: Record<Notification['type'], string> = {
  info: 'border-blue-500/30 bg-blue-500/10',
  success: 'border-green-500/30 bg-green-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  error: 'border-red-500/30 bg-red-500/10',
};

/**
 * Notification Center Component
 * Full-featured notification management
 */
export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    desktopPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    requestDesktopPermission,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-16 bottom-0 w-full md:w-96 bg-gradient-to-br from-gray-900 to-gray-800 border-l border-white/20 z-50 overflow-hidden shadow-2xl animate-slide-left">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-white/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Notifications</h2>
                    <p className="text-xs text-gray-400">{unreadCount} unread</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Desktop Notifications Permission */}
              {desktopPermission === 'default' && (
                <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🔔</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-purple-300 mb-1">
                        Enable Desktop Notifications
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        Get notified even when CompPortal isn't open
                      </div>
                      <button
                        onClick={requestDesktopPermission}
                        className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs font-medium transition-all border border-purple-500/50"
                      >
                        Enable
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'unread'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Actions */}
              {notifications.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Clear all notifications?')) {
                        clearAll();
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-red-300 transition-colors ml-auto"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto h-full pb-20">
              {displayNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  </h3>
                  <p className="text-sm text-gray-400 text-center max-w-xs">
                    {filter === 'unread'
                      ? 'All caught up! Check back later for updates.'
                      : "You'll see updates here when something happens."}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {displayNotifications.map((notification) => {
                    const notificationContent = (
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0 mt-0.5">
                            {notification.icon || TypeIcons[notification.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={`text-sm font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                              </span>
                              <div className="flex gap-2">
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                  >
                                    Mark read
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="text-xs text-gray-400 hover:text-red-300 transition-colors"
                                >
                                  Delete
                                  </button>
                              </div>
                            </div>
                          </div>
                        </div>
                    );

                    return notification.actionUrl ? (
                      <Link
                        key={notification.id}
                        href={notification.actionUrl}
                        onClick={() => handleNotificationClick(notification)}
                        className={`block p-4 rounded-lg border transition-all hover:bg-white/10 cursor-pointer ${
                          notification.read ? 'bg-white/5 border-white/10' : TypeColors[notification.type]
                        }`}
                      >
                        {notificationContent}
                      </Link>
                    ) : (
                      <div
                        key={notification.id}
                        className={`block p-4 rounded-lg border transition-all ${
                          notification.read ? 'bg-white/5 border-white/10' : TypeColors[notification.type]
                        }`}
                      >
                        {notificationContent}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Compact Notification Badge
 * For navigation/header use
 */
export function NotificationBadge() {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}
