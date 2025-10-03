import { Prisma } from '@prisma/client';

// Types for scheduling
export interface SchedulingEntry {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  categoryId: string;
  categoryName: string;
  ageGroupId: string;
  ageGroupName: string;
  entrySizeCategoryId: string;
  duration: number; // in minutes
  warmUpTime: number; // in minutes
  sessionId?: string | null;
  performanceTime?: Date | null;
  runningOrder?: number | null;
  participants: {
    dancerId: string;
    dancerName: string;
    dancerAge: number | null;
  }[];
}

export interface SessionCapacity {
  sessionId: string;
  sessionName: string;
  sessionDate: Date;
  startTime: Date;
  endTime?: Date | null;
  maxEntries: number | null;
  currentEntryCount: number;
  availableMinutes: number;
}

export interface SchedulingConflict {
  type: 'dancer_overlap' | 'costume_change' | 'session_capacity' | 'time_overflow' | 'studio_preference';
  severity: 'error' | 'warning';
  message: string;
  entryIds: string[];
  dancerIds?: string[];
  sessionId?: string;
}

export interface SchedulingConstraints {
  minCostumeChangeBuffer: number; // minutes
  sessionBuffer: number; // minutes at start/end of session
  maxEntriesPerSession: number;
  preferGroupByStudio: boolean;
  preferGroupByCategory: boolean;
}

export const DEFAULT_CONSTRAINTS: SchedulingConstraints = {
  minCostumeChangeBuffer: 20, // 20 minutes for costume changes
  sessionBuffer: 10, // 10 minutes buffer at start/end
  maxEntriesPerSession: 50,
  preferGroupByStudio: false,
  preferGroupByCategory: true,
};

/**
 * Calculate total time needed for an entry (warm-up + performance + transition)
 */
export function calculateEntryTotalTime(entry: SchedulingEntry, includeWarmup: boolean = false): number {
  const transitionTime = 2; // 2 minutes for stage setup/teardown
  const warmup = includeWarmup ? entry.warmUpTime : 0;
  return warmup + entry.duration + transitionTime;
}

/**
 * Check if two time windows overlap
 */
export function timesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Get time difference in minutes
 */
export function getMinutesDifference(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

/**
 * Detect dancer conflicts (same dancer in overlapping entries)
 */
export function detectDancerConflicts(
  entries: SchedulingEntry[],
  constraints: SchedulingConstraints
): SchedulingConflict[] {
  const conflicts: SchedulingConflict[] = [];

  // Build a map of dancer -> entries with scheduled times
  const dancerEntries = new Map<string, SchedulingEntry[]>();

  for (const entry of entries) {
    if (!entry.performanceTime) continue; // Skip unscheduled entries

    for (const participant of entry.participants) {
      if (!dancerEntries.has(participant.dancerId)) {
        dancerEntries.set(participant.dancerId, []);
      }
      dancerEntries.get(participant.dancerId)!.push(entry);
    }
  }

  // Check each dancer's entries for conflicts
  for (const [dancerId, dancerEntriesList] of dancerEntries) {
    // Sort by performance time
    const sortedEntries = [...dancerEntriesList].sort((a, b) =>
      a.performanceTime!.getTime() - b.performanceTime!.getTime()
    );

    for (let i = 0; i < sortedEntries.length - 1; i++) {
      const entry1 = sortedEntries[i];
      const entry2 = sortedEntries[i + 1];

      const entry1End = addMinutes(entry1.performanceTime!, calculateEntryTotalTime(entry1));
      const entry2Start = entry2.performanceTime!;

      const timeBetween = getMinutesDifference(entry1End, entry2Start);

      // Check for overlap (error)
      if (timeBetween < 0) {
        const dancer = entry1.participants.find(p => p.dancerId === dancerId);
        conflicts.push({
          type: 'dancer_overlap',
          severity: 'error',
          message: `Dancer ${dancer?.dancerName} is scheduled in overlapping entries`,
          entryIds: [entry1.id, entry2.id],
          dancerIds: [dancerId],
        });
      }
      // Check for insufficient costume change time (warning)
      else if (timeBetween < constraints.minCostumeChangeBuffer) {
        const dancer = entry1.participants.find(p => p.dancerId === dancerId);
        conflicts.push({
          type: 'costume_change',
          severity: 'warning',
          message: `Dancer ${dancer?.dancerName} has only ${timeBetween} minutes between entries (recommended: ${constraints.minCostumeChangeBuffer})`,
          entryIds: [entry1.id, entry2.id],
          dancerIds: [dancerId],
        });
      }
    }
  }

  return conflicts;
}

/**
 * Detect session capacity conflicts
 */
export function detectSessionCapacityConflicts(
  sessions: SessionCapacity[],
  entries: SchedulingEntry[]
): SchedulingConflict[] {
  const conflicts: SchedulingConflict[] = [];

  for (const session of sessions) {
    const sessionEntries = entries.filter(e => e.sessionId === session.sessionId);

    // Check entry count
    if (session.maxEntries && sessionEntries.length > session.maxEntries) {
      conflicts.push({
        type: 'session_capacity',
        severity: 'error',
        message: `Session "${session.sessionName}" has ${sessionEntries.length} entries (max: ${session.maxEntries})`,
        entryIds: sessionEntries.map(e => e.id),
        sessionId: session.sessionId,
      });
    }

    // Check total time
    const totalMinutesNeeded = sessionEntries.reduce(
      (sum, entry) => sum + calculateEntryTotalTime(entry),
      0
    );

    if (totalMinutesNeeded > session.availableMinutes) {
      conflicts.push({
        type: 'time_overflow',
        severity: 'error',
        message: `Session "${session.sessionName}" requires ${totalMinutesNeeded} minutes but only has ${session.availableMinutes} available`,
        entryIds: sessionEntries.map(e => e.id),
        sessionId: session.sessionId,
      });
    }
  }

  return conflicts;
}

/**
 * Get all conflicts for a set of entries
 */
export function getAllConflicts(
  entries: SchedulingEntry[],
  sessions: SessionCapacity[],
  constraints: SchedulingConstraints = DEFAULT_CONSTRAINTS
): SchedulingConflict[] {
  const conflicts: SchedulingConflict[] = [];

  conflicts.push(...detectDancerConflicts(entries, constraints));
  conflicts.push(...detectSessionCapacityConflicts(sessions, entries));

  return conflicts;
}

/**
 * Auto-schedule entries into a session
 * Returns entries with assigned performance times and running order
 */
export function autoScheduleSession(
  session: SessionCapacity,
  entries: SchedulingEntry[],
  constraints: SchedulingConstraints = DEFAULT_CONSTRAINTS
): SchedulingEntry[] {
  // Sort entries by preference (category grouping, studio grouping, etc.)
  const sortedEntries = [...entries].sort((a, b) => {
    // Primary: Category grouping
    if (constraints.preferGroupByCategory && a.categoryId !== b.categoryId) {
      return a.categoryName.localeCompare(b.categoryName);
    }

    // Secondary: Studio grouping
    if (constraints.preferGroupByStudio && a.studioId !== b.studioId) {
      return a.studioName.localeCompare(b.studioName);
    }

    // Tertiary: Age group
    return a.ageGroupName.localeCompare(b.ageGroupName);
  });

  const scheduledEntries: SchedulingEntry[] = [];
  let currentTime = addMinutes(session.startTime, constraints.sessionBuffer);
  let runningOrder = 1;

  for (const entry of sortedEntries) {
    const totalTime = calculateEntryTotalTime(entry);
    const entryEnd = addMinutes(currentTime, totalTime);

    // Check if entry fits in session
    const sessionEndTime = session.endTime || addMinutes(session.startTime, session.availableMinutes);
    if (entryEnd > addMinutes(sessionEndTime, -constraints.sessionBuffer)) {
      // Entry doesn't fit, skip it
      console.warn(`Entry ${entry.id} doesn't fit in session ${session.sessionId}`);
      continue;
    }

    // Assign time and running order
    scheduledEntries.push({
      ...entry,
      sessionId: session.sessionId,
      performanceTime: currentTime,
      runningOrder,
    });

    currentTime = entryEnd;
    runningOrder++;
  }

  return scheduledEntries;
}

/**
 * Calculate session statistics
 */
export function calculateSessionStats(session: SessionCapacity, entries: SchedulingEntry[]) {
  const sessionEntries = entries.filter(e => e.sessionId === session.sessionId);

  const totalDuration = sessionEntries.reduce(
    (sum, entry) => sum + calculateEntryTotalTime(entry),
    0
  );

  const utilizationPercent = session.availableMinutes > 0
    ? Math.round((totalDuration / session.availableMinutes) * 100)
    : 0;

  return {
    entryCount: sessionEntries.length,
    totalDuration,
    availableMinutes: session.availableMinutes,
    utilizationPercent,
    remainingMinutes: session.availableMinutes - totalDuration,
  };
}

/**
 * Validate scheduling constraints are met
 */
export function validateSchedule(
  entries: SchedulingEntry[],
  sessions: SessionCapacity[],
  constraints: SchedulingConstraints = DEFAULT_CONSTRAINTS
): { isValid: boolean; conflicts: SchedulingConflict[] } {
  const conflicts = getAllConflicts(entries, sessions, constraints);
  const errors = conflicts.filter(c => c.severity === 'error');

  return {
    isValid: errors.length === 0,
    conflicts,
  };
}
