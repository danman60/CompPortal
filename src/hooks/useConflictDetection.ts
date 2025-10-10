import { useState, useEffect, useCallback, useMemo } from 'react';

export type ConflictSeverity = 'error' | 'warning' | 'info';

export interface Conflict {
  id: string;
  type: string;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedItems: Array<{ id: string; label: string }>;
  resolution?: string;
  timestamp: number;
}

interface ConflictRule<T> {
  id: string;
  name: string;
  severity: ConflictSeverity;
  check: (items: T[]) => Conflict[];
  enabled?: boolean;
}

interface UseConflictDetectionOptions<T> {
  items: T[];
  rules: ConflictRule<T>[];
  autoDetect?: boolean;
  debounceMs?: number;
}

/**
 * Hook for detecting conflicts and data inconsistencies
 * Features:
 * - Configurable conflict rules
 * - Auto-detection with debounce
 * - Severity levels (error/warning/info)
 * - Grouping by type
 * - Resolution suggestions
 */
export function useConflictDetection<T>({
  items,
  rules,
  autoDetect = true,
  debounceMs = 500,
}: UseConflictDetectionOptions<T>) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState<number | null>(null);

  const detectConflicts = useCallback(() => {
    setIsDetecting(true);

    const detectedConflicts: Conflict[] = [];
    const enabledRules = rules.filter(rule => rule.enabled !== false);

    for (const rule of enabledRules) {
      try {
        const ruleConflicts = rule.check(items);
        detectedConflicts.push(...ruleConflicts);
      } catch (error) {
        console.error(`Conflict detection rule "${rule.name}" failed:`, error);
      }
    }

    setConflicts(detectedConflicts);
    setLastDetectionTime(Date.now());
    setIsDetecting(false);

    return detectedConflicts;
  }, [items, rules]);

  // Auto-detect with debounce
  useEffect(() => {
    if (!autoDetect) return;

    const timeout = setTimeout(() => {
      detectConflicts();
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [autoDetect, debounceMs, detectConflicts]);

  const conflictsByType = useMemo(() => {
    const grouped = new Map<string, Conflict[]>();

    for (const conflict of conflicts) {
      if (!grouped.has(conflict.type)) {
        grouped.set(conflict.type, []);
      }
      grouped.get(conflict.type)!.push(conflict);
    }

    return grouped;
  }, [conflicts]);

  const conflictsBySeverity = useMemo(() => {
    return {
      error: conflicts.filter(c => c.severity === 'error'),
      warning: conflicts.filter(c => c.severity === 'warning'),
      info: conflicts.filter(c => c.severity === 'info'),
    };
  }, [conflicts]);

  const hasConflicts = conflicts.length > 0;
  const hasErrors = conflictsBySeverity.error.length > 0;
  const hasWarnings = conflictsBySeverity.warning.length > 0;

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  const dismissConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, []);

  return {
    conflicts,
    conflictsByType,
    conflictsBySeverity,
    hasConflicts,
    hasErrors,
    hasWarnings,
    errorCount: conflictsBySeverity.error.length,
    warningCount: conflictsBySeverity.warning.length,
    infoCount: conflictsBySeverity.info.length,
    isDetecting,
    lastDetectionTime,
    detectConflicts,
    clearConflicts,
    dismissConflict,
  };
}

/**
 * Common conflict detection rules
 */

// Detect duplicate items by key
export function createDuplicateRule<T>(
  getKey: (item: T) => string,
  getLabel: (item: T) => string,
  getId: (item: T) => string,
  typeName: string
): ConflictRule<T> {
  return {
    id: `duplicate-${typeName}`,
    name: `Duplicate ${typeName}`,
    severity: 'warning',
    check: (items) => {
      const conflicts: Conflict[] = [];
      const seen = new Map<string, T[]>();

      for (const item of items) {
        const key = getKey(item);
        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key)!.push(item);
      }

      for (const [key, duplicates] of seen.entries()) {
        if (duplicates.length > 1) {
          conflicts.push({
            id: `duplicate-${typeName}-${key}`,
            type: 'duplicate',
            severity: 'warning',
            title: `Duplicate ${typeName}`,
            description: `${duplicates.length} items share the same ${key}`,
            affectedItems: duplicates.map(item => ({
              id: getId(item),
              label: getLabel(item),
            })),
            resolution: 'Review and remove or update duplicate items',
            timestamp: Date.now(),
          });
        }
      }

      return conflicts;
    },
  };
}

// Detect missing required fields
export function createRequiredFieldRule<T>(
  fieldName: string,
  getValue: (item: T) => any,
  getLabel: (item: T) => string,
  getId: (item: T) => string,
  typeName: string
): ConflictRule<T> {
  return {
    id: `missing-${fieldName}`,
    name: `Missing ${fieldName}`,
    severity: 'error',
    check: (items) => {
      const conflicts: Conflict[] = [];
      const itemsWithMissingField: T[] = [];

      for (const item of items) {
        const value = getValue(item);
        if (value === undefined || value === null || value === '') {
          itemsWithMissingField.push(item);
        }
      }

      if (itemsWithMissingField.length > 0) {
        conflicts.push({
          id: `missing-${fieldName}`,
          type: 'missing-field',
          severity: 'error',
          title: `Missing ${fieldName}`,
          description: `${itemsWithMissingField.length} ${typeName} missing required field: ${fieldName}`,
          affectedItems: itemsWithMissingField.map(item => ({
            id: getId(item),
            label: getLabel(item),
          })),
          resolution: `Add ${fieldName} to all affected items`,
          timestamp: Date.now(),
        });
      }

      return conflicts;
    },
  };
}

// Detect value out of range
export function createRangeRule<T>(
  fieldName: string,
  getValue: (item: T) => number,
  min: number,
  max: number,
  getLabel: (item: T) => string,
  getId: (item: T) => string,
  typeName: string
): ConflictRule<T> {
  return {
    id: `range-${fieldName}`,
    name: `${fieldName} out of range`,
    severity: 'warning',
    check: (items) => {
      const conflicts: Conflict[] = [];
      const outOfRangeItems: T[] = [];

      for (const item of items) {
        const value = getValue(item);
        if (value < min || value > max) {
          outOfRangeItems.push(item);
        }
      }

      if (outOfRangeItems.length > 0) {
        conflicts.push({
          id: `range-${fieldName}`,
          type: 'out-of-range',
          severity: 'warning',
          title: `${fieldName} out of range`,
          description: `${outOfRangeItems.length} ${typeName} have ${fieldName} outside valid range (${min}-${max})`,
          affectedItems: outOfRangeItems.map(item => ({
            id: getId(item),
            label: getLabel(item),
          })),
          resolution: `Update ${fieldName} to be within ${min}-${max}`,
          timestamp: Date.now(),
        });
      }

      return conflicts;
    },
  };
}

// Detect scheduling time conflicts
export interface TimeSlot {
  id: string;
  label: string;
  startTime: Date;
  endTime: Date;
  resourceId?: string; // Optional resource (dancer, room, etc.)
}

export function createTimeConflictRule(
  resourceName: string = 'resource'
): ConflictRule<TimeSlot> {
  return {
    id: 'time-conflict',
    name: 'Scheduling Conflicts',
    severity: 'error',
    check: (items) => {
      const conflicts: Conflict[] = [];

      // Group by resource if resourceId exists
      const byResource = new Map<string, TimeSlot[]>();

      for (const item of items) {
        const key = item.resourceId || 'default';
        if (!byResource.has(key)) {
          byResource.set(key, []);
        }
        byResource.get(key)!.push(item);
      }

      // Check each resource for conflicts
      for (const [resourceId, slots] of byResource.entries()) {
        // Sort by start time
        const sorted = [...slots].sort((a, b) =>
          a.startTime.getTime() - b.startTime.getTime()
        );

        for (let i = 0; i < sorted.length - 1; i++) {
          const current = sorted[i];
          const next = sorted[i + 1];

          // Check if current ends after next starts (overlap)
          if (current.endTime > next.startTime) {
            conflicts.push({
              id: `time-conflict-${current.id}-${next.id}`,
              type: 'time-conflict',
              severity: 'error',
              title: 'Scheduling Conflict',
              description: `${resourceName} double-booked: ${current.label} and ${next.label} overlap`,
              affectedItems: [
                { id: current.id, label: current.label },
                { id: next.id, label: next.label },
              ],
              resolution: 'Reschedule one of the conflicting items',
              timestamp: Date.now(),
            });
          }
        }
      }

      return conflicts;
    },
  };
}
