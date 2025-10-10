import { useState, useEffect, useCallback } from 'react';

export interface NotificationPreferences {
  enabled: boolean;
  desktop: boolean;
  sound: boolean;
  types: {
    info: boolean;
    success: boolean;
    warning: boolean;
    error: boolean;
  };
  channels: {
    [key: string]: boolean; // e.g., 'entries', 'invoices', 'dancers'
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  grouping: {
    enabled: boolean;
    strategy: 'type' | 'title' | 'time' | 'auto';
    minGroupSize: number;
  };
}

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  desktop: false,
  sound: true,
  types: {
    info: true,
    success: true,
    warning: true,
    error: true,
  },
  channels: {},
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  grouping: {
    enabled: true,
    strategy: 'auto',
    minGroupSize: 2,
  },
};

interface UseNotificationPreferencesOptions {
  storageKey?: string;
}

/**
 * Hook for managing notification preferences
 * Features:
 * - Enable/disable notifications
 * - Desktop notification settings
 * - Filter by type and channel
 * - Quiet hours configuration
 * - Grouping preferences
 * - LocalStorage persistence
 */
export function useNotificationPreferences(options: UseNotificationPreferencesOptions = {}) {
  const { storageKey = 'compportal-notification-preferences' } = options;
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationPreferences;
        setPreferences({
          ...defaultPreferences,
          ...parsed,
          types: { ...defaultPreferences.types, ...parsed.types },
          channels: { ...defaultPreferences.channels, ...parsed.channels },
          quietHours: { ...defaultPreferences.quietHours, ...parsed.quietHours },
          grouping: { ...defaultPreferences.grouping, ...parsed.grouping },
        });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }, [storageKey]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);

    try {
      localStorage.setItem(storageKey, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }, [storageKey]);

  // Update a specific preference
  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    savePreferences({
      ...preferences,
      [key]: value,
    });
  }, [preferences, savePreferences]);

  // Toggle a notification type
  const toggleType = useCallback((type: keyof NotificationPreferences['types']) => {
    savePreferences({
      ...preferences,
      types: {
        ...preferences.types,
        [type]: !preferences.types[type],
      },
    });
  }, [preferences, savePreferences]);

  // Toggle a notification channel
  const toggleChannel = useCallback((channel: string) => {
    savePreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: !preferences.channels[channel],
      },
    });
  }, [preferences, savePreferences]);

  // Set quiet hours
  const setQuietHours = useCallback((enabled: boolean, start?: string, end?: string) => {
    savePreferences({
      ...preferences,
      quietHours: {
        enabled,
        start: start || preferences.quietHours.start,
        end: end || preferences.quietHours.end,
      },
    });
  }, [preferences, savePreferences]);

  // Set grouping preferences
  const setGrouping = useCallback((
    enabled: boolean,
    strategy?: NotificationPreferences['grouping']['strategy'],
    minGroupSize?: number
  ) => {
    savePreferences({
      ...preferences,
      grouping: {
        enabled,
        strategy: strategy || preferences.grouping.strategy,
        minGroupSize: minGroupSize || preferences.grouping.minGroupSize,
      },
    });
  }, [preferences, savePreferences]);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    savePreferences(defaultPreferences);
  }, [savePreferences]);

  // Check if notification should be shown based on preferences
  const shouldShowNotification = useCallback((
    type: keyof NotificationPreferences['types'],
    channel?: string
  ): boolean => {
    // Check if notifications are globally enabled
    if (!preferences.enabled) return false;

    // Check if this type is enabled
    if (!preferences.types[type]) return false;

    // Check channel if provided
    if (channel && preferences.channels[channel] === false) return false;

    // Check quiet hours
    if (preferences.quietHours.enabled && isInQuietHours(preferences.quietHours)) {
      // Still show errors even during quiet hours
      if (type !== 'error') return false;
    }

    return true;
  }, [preferences]);

  // Check if desktop notifications should be shown
  const shouldShowDesktop = useCallback((): boolean => {
    return preferences.enabled && preferences.desktop;
  }, [preferences]);

  // Check if sound should play
  const shouldPlaySound = useCallback((): boolean => {
    return preferences.enabled && preferences.sound && !isInQuietHours(preferences.quietHours);
  }, [preferences]);

  return {
    preferences,
    updatePreference,
    toggleType,
    toggleChannel,
    setQuietHours,
    setGrouping,
    resetPreferences,
    shouldShowNotification,
    shouldShowDesktop,
    shouldPlaySound,
  };
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietHours.start.split(':').map(Number);
  const [endHour, endMin] = quietHours.end.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Get notification preference summary for display
 */
export function getPreferenceSummary(preferences: NotificationPreferences): string {
  const parts: string[] = [];

  if (!preferences.enabled) {
    return 'All notifications disabled';
  }

  if (preferences.desktop) {
    parts.push('Desktop enabled');
  }

  if (preferences.sound) {
    parts.push('Sound enabled');
  }

  if (preferences.quietHours.enabled) {
    parts.push(`Quiet hours ${preferences.quietHours.start}-${preferences.quietHours.end}`);
  }

  const enabledTypes = Object.entries(preferences.types)
    .filter(([, enabled]) => enabled)
    .map(([type]) => type);

  if (enabledTypes.length < 4) {
    parts.push(`Only ${enabledTypes.join(', ')}`);
  }

  if (preferences.grouping.enabled) {
    parts.push('Grouping on');
  }

  return parts.length > 0 ? parts.join(' • ') : 'Default settings';
}
