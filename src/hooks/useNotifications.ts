import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
}

interface UseNotificationsOptions {
  maxNotifications?: number;
  storageKey?: string;
  enableDesktop?: boolean;
}

/**
 * Hook to manage in-app notifications
 * Features:
 * - In-app notification center
 * - Desktop/browser notifications
 * - Mark as read/unread
 * - LocalStorage persistence
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { maxNotifications = 50, storageKey = 'compportal-notifications', enableDesktop = true } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>('default');

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Notification[];
        setNotifications(parsed.slice(0, maxNotifications));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }

    // Check desktop notification permission
    if (enableDesktop && 'Notification' in window) {
      setDesktopPermission(Notification.permission);
    }
  }, [storageKey, maxNotifications, enableDesktop]);

  // Request desktop notification permission
  const requestDesktopPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Desktop notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      setDesktopPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      setDesktopPermission('denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    setDesktopPermission(permission);
    return permission === 'granted';
  }, []);

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: Notification) => {
    if (!enableDesktop || desktopPermission !== 'granted') return;

    try {
      const desktopNotif = new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/icon?v=1',
        badge: '/icon?v=1',
        tag: notification.id,
        requireInteraction: notification.type === 'error',
      });

      desktopNotif.onclick = () => {
        if (notification.actionUrl) {
          window.focus();
          window.location.href = notification.actionUrl;
        }
        desktopNotif.close();
      };
    } catch (error) {
      console.error('Failed to show desktop notification:', error);
    }
  }, [enableDesktop, desktopPermission]);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications((current) => {
      const updated = [newNotification, ...current].slice(0, maxNotifications);

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }

      return updated;
    });

    // Show desktop notification
    showDesktopNotification(newNotification);

    return newNotification;
  }, [maxNotifications, storageKey, showDesktopNotification]);

  // Mark as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((current) => {
      const updated = current.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }

      return updated;
    });
  }, [storageKey]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((current) => {
      const updated = current.map((n) => ({ ...n, read: true }));

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }

      return updated;
    });
  }, [storageKey]);

  // Delete notification
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications((current) => {
      const updated = current.filter((n) => n.id !== notificationId);

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }

      return updated;
    });
  }, [storageKey]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, [storageKey]);

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get by type
  const getByType = useCallback((type: Notification['type']) => {
    return notifications.filter((n) => n.type === type);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    desktopPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    getByType,
    requestDesktopPermission,
  };
}
