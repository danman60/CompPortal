/**
 * Conflict Auto-Fix Utilities
 *
 * Automatically resolves dancer scheduling conflicts by moving routines
 * the minimum distance necessary within the same competition day.
 *
 * Rule: Same dancer must have at least 6 routines between performances
 */

export interface Routine {
  id: string;
  title: string;
  entryNumber?: number;
  participants: Array<{
    dancerId: string;
    dancerName: string;
  }>;
  scheduledDateString?: string | null;
}

export interface Conflict {
  dancerId: string;
  dancerName: string;
  routine1Id: string;
  routine2Id: string;
  routinesBetween: number;
  severity: 'critical' | 'error' | 'warning';
  message: string;
}

export interface FixResult {
  success: boolean;
  newSchedule?: Routine[]; // Updated schedule (for day/weekend fixes)
  movedRoutines: Array<{
    routineId: string;
    routineTitle: string;
    fromPosition: number;
    toPosition: number;
    distance: number;
  }>;
  resolvedConflicts: number;
  unresolvedConflicts: Array<{
    routineId: string;
    routineTitle: string;
    reason: string;
  }>;
}

// Fixed spacing rule: 6 routines minimum between same dancer
// To have 6 routines BETWEEN, positions must be 7 apart (e.g., pos 1 and pos 8 = 6 routines between)
const REQUIRED_ROUTINES_BETWEEN = 7;

/**
 * Check if placing a routine at a specific position creates any conflicts
 */
function checkConflictAtPosition(
  routine: Routine,
  candidatePosition: number,
  schedule: Routine[],
  requiredSpacing: number = REQUIRED_ROUTINES_BETWEEN
): boolean {
  const routineDancers = new Set(routine.participants.map(p => p.dancerId));

  // Create temporary schedule with routine at candidate position
  const tempSchedule = [...schedule.filter(r => r.id !== routine.id)];
  tempSchedule.splice(candidatePosition, 0, routine);

  // Check all routines within conflict range (6 positions before and after)
  const rangeStart = Math.max(0, candidatePosition - requiredSpacing);
  const rangeEnd = Math.min(tempSchedule.length, candidatePosition + requiredSpacing + 1);

  for (let i = rangeStart; i < rangeEnd; i++) {
    if (i === candidatePosition) continue; // Skip the routine itself

    const otherRoutine = tempSchedule[i];
    const otherDancers = new Set(otherRoutine.participants.map(p => p.dancerId));

    // Check if any dancers overlap
    for (const dancerId of routineDancers) {
      if (otherDancers.has(dancerId)) {
        // Calculate actual spacing
        const spacing = Math.abs(i - candidatePosition);

        // Conflict exists if spacing < required (6)
        if (spacing < requiredSpacing) {
          return true; // Conflict detected
        }
      }
    }
  }

  return false; // No conflict at this position
}

/**
 * Find the best position to move a conflicted routine
 * Returns the position with minimum distance that resolves all conflicts
 */
export function findBestPositionToResolveConflict(
  conflictedRoutine: Routine,
  daySchedule: Routine[]
): number | null {
  const currentPosition = daySchedule.findIndex(r => r.id === conflictedRoutine.id);

  if (currentPosition === -1) {
    console.error('Routine not found in schedule');
    return null;
  }

  // Find all valid positions (no conflicts)
  const validPositions: Array<{ position: number; distance: number }> = [];

  for (let candidatePosition = 0; candidatePosition <= daySchedule.length; candidatePosition++) {
    // Skip current position
    if (candidatePosition === currentPosition) continue;

    // Check if placing routine here creates ANY conflicts
    const hasConflict = checkConflictAtPosition(
      conflictedRoutine,
      candidatePosition,
      daySchedule
    );

    if (!hasConflict) {
      // Calculate distance moved (in positions)
      const distance = Math.abs(candidatePosition - currentPosition);
      validPositions.push({ position: candidatePosition, distance });
    }
  }

  // Return position with minimum distance
  if (validPositions.length === 0) {
    return null; // No valid position found
  }

  validPositions.sort((a, b) => a.distance - b.distance);
  return validPositions[0].position;
}

/**
 * Move a routine to a specific position in the schedule
 */
function moveRoutineToPosition(
  routine: Routine,
  newPosition: number,
  schedule: Routine[]
): Routine[] {
  // Remove routine from current position
  const filtered = schedule.filter(r => r.id !== routine.id);

  // Insert at new position
  const updated = [...filtered];
  updated.splice(newPosition, 0, routine);

  return updated;
}

/**
 * Detect conflicts for a specific routine in a schedule
 */
function detectConflictsForRoutine(
  routine: Routine,
  schedule: Routine[]
): Array<{ otherRoutineId: string; spacing: number }> {
  const routineDancers = new Set(routine.participants.map(p => p.dancerId));
  const routinePosition = schedule.findIndex(r => r.id === routine.id);

  if (routinePosition === -1) return [];

  const conflicts: Array<{ otherRoutineId: string; spacing: number }> = [];

  // Check routines within conflict range
  const rangeStart = Math.max(0, routinePosition - REQUIRED_ROUTINES_BETWEEN);
  const rangeEnd = Math.min(schedule.length, routinePosition + REQUIRED_ROUTINES_BETWEEN + 1);

  for (let i = rangeStart; i < rangeEnd; i++) {
    if (i === routinePosition) continue;

    const otherRoutine = schedule[i];
    const otherDancers = new Set(otherRoutine.participants.map(p => p.dancerId));

    // Check if any dancers overlap
    for (const dancerId of routineDancers) {
      if (otherDancers.has(dancerId)) {
        const spacing = Math.abs(i - routinePosition);
        if (spacing < REQUIRED_ROUTINES_BETWEEN) {
          conflicts.push({ otherRoutineId: otherRoutine.id, spacing });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Auto-fix a single routine conflict
 */
export function autoFixRoutineConflict(
  routineId: string,
  daySchedule: Routine[]
): { success: boolean; newSchedule: Routine[] | null; result: FixResult } {
  const routine = daySchedule.find(r => r.id === routineId);

  if (!routine) {
    return {
      success: false,
      newSchedule: null,
      result: {
        success: false,
        movedRoutines: [],
        resolvedConflicts: 0,
        unresolvedConflicts: [{
          routineId,
          routineTitle: 'Unknown',
          reason: 'Routine not found in schedule'
        }]
      }
    };
  }

  // Find current conflicts
  const currentConflicts = detectConflictsForRoutine(routine, daySchedule);

  if (currentConflicts.length === 0) {
    return {
      success: true,
      newSchedule: daySchedule,
      result: {
        success: true,
        movedRoutines: [],
        resolvedConflicts: 0,
        unresolvedConflicts: []
      }
    };
  }

  // Find best position
  const newPosition = findBestPositionToResolveConflict(routine, daySchedule);

  if (newPosition === null) {
    return {
      success: false,
      newSchedule: null,
      result: {
        success: false,
        movedRoutines: [],
        resolvedConflicts: 0,
        unresolvedConflicts: [{
          routineId: routine.id,
          routineTitle: routine.title,
          reason: 'No valid position found on this day (day may be too densely scheduled)'
        }]
      }
    };
  }

  // Move routine
  const oldPosition = daySchedule.findIndex(r => r.id === routineId);
  const newSchedule = moveRoutineToPosition(routine, newPosition, daySchedule);

  // Verify conflicts resolved
  const remainingConflicts = detectConflictsForRoutine(routine, newSchedule);

  return {
    success: remainingConflicts.length === 0,
    newSchedule,
    result: {
      success: remainingConflicts.length === 0,
      movedRoutines: [{
        routineId: routine.id,
        routineTitle: routine.title,
        fromPosition: oldPosition,
        toPosition: newPosition,
        distance: Math.abs(newPosition - oldPosition)
      }],
      resolvedConflicts: currentConflicts.length - remainingConflicts.length,
      unresolvedConflicts: remainingConflicts.length > 0 ? [{
        routineId: routine.id,
        routineTitle: routine.title,
        reason: `Still has ${remainingConflicts.length} conflict(s) after move`
      }] : []
    }
  };
}

/**
 * Auto-fix all conflicts on a single day
 */
export function autoFixDayConflicts(
  daySchedule: Routine[],
  conflicts: Conflict[]
): FixResult {
  let updatedSchedule = [...daySchedule];
  const movedRoutines: FixResult['movedRoutines'] = [];
  const unresolvedConflicts: FixResult['unresolvedConflicts'] = [];
  let totalResolved = 0;

  // Get unique conflicted routine IDs
  const conflictedRoutineIds = new Set(
    conflicts.flatMap(c => [c.routine1Id, c.routine2Id])
  );

  // Sort by entry number (process in order)
  const routinesToFix = Array.from(conflictedRoutineIds)
    .map(id => updatedSchedule.find(r => r.id === id))
    .filter((r): r is Routine => r != null)
    .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

  for (const routine of routinesToFix) {
    // Re-calculate conflicts after each move
    const currentConflicts = detectConflictsForRoutine(routine, updatedSchedule);

    if (currentConflicts.length > 0) {
      const newPosition = findBestPositionToResolveConflict(routine, updatedSchedule);

      if (newPosition !== null) {
        const oldPosition = updatedSchedule.findIndex(r => r.id === routine.id);
        updatedSchedule = moveRoutineToPosition(routine, newPosition, updatedSchedule);

        // Verify conflicts resolved
        const remainingConflicts = detectConflictsForRoutine(routine, updatedSchedule);
        const resolved = currentConflicts.length - remainingConflicts.length;

        movedRoutines.push({
          routineId: routine.id,
          routineTitle: routine.title,
          fromPosition: oldPosition,
          toPosition: newPosition,
          distance: Math.abs(newPosition - oldPosition)
        });

        totalResolved += resolved;

        if (remainingConflicts.length > 0) {
          unresolvedConflicts.push({
            routineId: routine.id,
            routineTitle: routine.title,
            reason: `Still has ${remainingConflicts.length} conflict(s) after move`
          });
        }
      } else {
        unresolvedConflicts.push({
          routineId: routine.id,
          routineTitle: routine.title,
          reason: 'No valid position found on this day'
        });
      }
    }
  }

  return {
    success: unresolvedConflicts.length === 0,
    newSchedule: updatedSchedule,
    movedRoutines,
    resolvedConflicts: totalResolved,
    unresolvedConflicts
  };
}

/**
 * Auto-fix all conflicts across all days (full weekend)
 */
export function autoFixWeekendConflicts(
  scheduleByDate: Record<string, Routine[]>,
  conflictsByDate: Record<string, Conflict[]>
): Record<string, FixResult> {
  const results: Record<string, FixResult> = {};

  // Process each day independently
  for (const [date, daySchedule] of Object.entries(scheduleByDate)) {
    const dayConflicts = conflictsByDate[date] || [];

    if (dayConflicts.length > 0) {
      results[date] = autoFixDayConflicts(daySchedule, dayConflicts);
    }
  }

  return results;
}
