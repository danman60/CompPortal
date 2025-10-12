import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export interface EmailDigestPreferences {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  includeActivities: boolean;
  includeNotifications: boolean;
  includeUpcomingEvents: boolean;
  includePendingActions: boolean;
  minimumActivityCount: number;
}

const defaultPreferences: EmailDigestPreferences = {
  enabled: false,
  frequency: 'weekly',
  dayOfWeek: 1, // Monday
  dayOfMonth: 1,
  time: '09:00',
  includeActivities: true,
  includeNotifications: true,
  includeUpcomingEvents: true,
  includePendingActions: true,
  minimumActivityCount: 1,
};

interface UseEmailDigestOptions {
  storageKey?: string;
}

/**
 * Hook for managing email digest preferences
 * Features:
 * - Daily/weekly/monthly digest scheduling
 * - Content type filtering
 * - Time scheduling
 * - Minimum activity threshold
 * - LocalStorage persistence
 */
export function useEmailDigest(options: UseEmailDigestOptions = {}) {
  const { storageKey = 'compportal-email-digest' } = options;
  const [preferences, setPreferences] = useState<EmailDigestPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);

  // tRPC hooks
  const { data: dbPreferences } = trpc.user.getEmailDigestPreferences.useQuery();
  const saveToDb = trpc.user.saveEmailDigestPreferences.useMutation();

  // Load preferences from database OR localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Priority 1: Use database preferences if available
    if (dbPreferences) {
      setPreferences({
        ...defaultPreferences,
        ...dbPreferences,
      });
      return;
    }

    // Priority 2: Fallback to localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as EmailDigestPreferences;
        setPreferences({
          ...defaultPreferences,
          ...parsed,
        });
      }
    } catch (error) {
      console.error('Failed to load email digest preferences:', error);
    }
  }, [storageKey, dbPreferences]);

  // Save preferences to both localStorage AND database
  const savePreferences = useCallback(
    async (newPreferences: EmailDigestPreferences) => {
      setIsSaving(true);
      setPreferences(newPreferences);

      try {
        // Save to localStorage (immediate fallback)
        localStorage.setItem(storageKey, JSON.stringify(newPreferences));

        // Save to database (persistent, cross-device)
        await saveToDb.mutateAsync(newPreferences);
      } catch (error) {
        console.error('Failed to save email digest preferences:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [storageKey, saveToDb]
  );

  // Update a specific preference
  const updatePreference = useCallback(
    <K extends keyof EmailDigestPreferences>(key: K, value: EmailDigestPreferences[K]) => {
      savePreferences({
        ...preferences,
        [key]: value,
      });
    },
    [preferences, savePreferences]
  );

  // Set frequency and related day/time
  const setFrequency = useCallback(
    (frequency: EmailDigestPreferences['frequency'], day?: number) => {
      const updates: Partial<EmailDigestPreferences> = { frequency };

      if (frequency === 'weekly' && day !== undefined) {
        updates.dayOfWeek = day;
      } else if (frequency === 'monthly' && day !== undefined) {
        updates.dayOfMonth = day;
      }

      savePreferences({
        ...preferences,
        ...updates,
      });
    },
    [preferences, savePreferences]
  );

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    savePreferences(defaultPreferences);
  }, [savePreferences]);

  // Get next scheduled send time
  const getNextSendTime = useCallback((): Date | null => {
    if (!preferences.enabled) return null;

    const now = new Date();
    const [hours, minutes] = preferences.time.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    switch (preferences.frequency) {
      case 'daily':
        // If time has passed today, schedule for tomorrow
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'weekly':
        // Find next occurrence of the target day
        const targetDay = preferences.dayOfWeek || 1;
        const currentDay = now.getDay();
        let daysUntilTarget = targetDay - currentDay;

        if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && next <= now)) {
          daysUntilTarget += 7;
        }

        next.setDate(next.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        // Find next occurrence of the target day of month
        const targetDayOfMonth = preferences.dayOfMonth || 1;
        next.setDate(targetDayOfMonth);

        if (next <= now) {
          // Move to next month
          next.setMonth(next.getMonth() + 1);
        }
        break;
    }

    return next;
  }, [preferences]);

  return {
    preferences,
    updatePreference,
    setFrequency,
    resetPreferences,
    getNextSendTime,
    isSaving,
  };
}

/**
 * Get human-readable schedule description
 */
export function getScheduleDescription(preferences: EmailDigestPreferences): string {
  if (!preferences.enabled) {
    return 'Email digest disabled';
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const parts: string[] = [];

  switch (preferences.frequency) {
    case 'daily':
      parts.push('Every day');
      break;
    case 'weekly':
      const dayName = dayNames[preferences.dayOfWeek || 1];
      parts.push(`Every ${dayName}`);
      break;
    case 'monthly':
      const ordinal = getOrdinal(preferences.dayOfMonth || 1);
      parts.push(`Monthly on the ${ordinal}`);
      break;
  }

  parts.push(`at ${preferences.time}`);

  return parts.join(' ');
}

/**
 * Get ordinal suffix for day of month
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Get content summary for digest preferences
 */
export function getContentSummary(preferences: EmailDigestPreferences): string[] {
  const parts: string[] = [];

  if (preferences.includeActivities) parts.push('Recent activity');
  if (preferences.includeNotifications) parts.push('Notifications');
  if (preferences.includeUpcomingEvents) parts.push('Upcoming events');
  if (preferences.includePendingActions) parts.push('Pending actions');

  if (preferences.minimumActivityCount > 1) {
    parts.push(`(min ${preferences.minimumActivityCount} items)`);
  }

  return parts.length > 0 ? parts : ['No content selected'];
}
