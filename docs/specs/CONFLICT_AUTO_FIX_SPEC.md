# Conflict Auto-Fix Feature Specification

**Status:** Design Phase
**Created:** 2025-11-27
**Feature:** Automatic routine conflict resolution with minimal schedule disruption

---

## 1. Overview

Automatically resolve dancer scheduling conflicts by moving routines the minimum distance within the same competition day, never crossing day boundaries.

---

## 2. Core Algorithm: Minimal Distance Resolution

### 2.1 Conflict Detection (Existing)

Currently tracks conflicts via:
- `conflicts` array containing all detected conflicts
- `conflictsByRoutineId` map for per-routine conflict lookup
- Severity levels: `critical` | `error` | `warning`

### 2.2 Auto-Fix Logic

**Conflict Rule:** Same dancer must have at least **6 routines** between their performances

**Input:** A routine with one or more conflicts
**Output:** New position in schedule that resolves all conflicts for that routine

**Algorithm:**

```typescript
function findBestPositionToResolveConflict(
  conflictedRoutine: Routine,
  daySchedule: Routine[],
  conflicts: Conflict[]
): number | null {

  const REQUIRED_ROUTINES_BETWEEN = 6; // Fixed rule: 6 routines minimum spacing

  // 1. Get all dancers in this routine
  const routineDancers = new Set(
    conflictedRoutine.participants.map(p => p.dancerId)
  );

  const currentPosition = daySchedule.findIndex(r => r.id === conflictedRoutine.id);

  // 2. For each position in the day schedule (slots between routines)
  const validPositions: Array<{ position: number; distance: number }> = [];

  for (let candidatePosition = 0; candidatePosition <= daySchedule.length; candidatePosition++) {
    // Skip current position
    if (candidatePosition === currentPosition) continue;

    // 3. Check if placing routine here creates ANY conflicts
    const hasConflict = checkConflictAtPosition(
      conflictedRoutine,
      candidatePosition,
      daySchedule,
      routineDancers,
      REQUIRED_ROUTINES_BETWEEN
    );

    if (!hasConflict) {
      // 4. Calculate distance moved (in positions)
      const distance = Math.abs(candidatePosition - currentPosition);
      validPositions.push({ position: candidatePosition, distance });
    }
  }

  // 5. Return position with minimum distance
  if (validPositions.length === 0) return null; // No valid position found

  validPositions.sort((a, b) => a.distance - b.distance);
  return validPositions[0].position;
}

function checkConflictAtPosition(
  routine: Routine,
  candidatePosition: number,
  schedule: Routine[],
  routineDancers: Set<string>,
  requiredSpacing: number
): boolean {

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
```

**Example Scenario:**

```
Current schedule (positions 0-10):
0: Routine A (Dancer: Sarah)
1: Routine B
2: Routine C
3: Routine D
4: Routine E
5: Routine F (Dancer: Sarah) ⚠️ CONFLICT - only 5 routines apart
6: Routine G
7: Routine H
8: Routine I
9: Routine J
10: Routine K

Auto-fix attempts:
1. Try position 4 (move F earlier by 1) → Still conflict with A (4 apart)
2. Try position 3 (move F earlier by 2) → Still conflict with A (3 apart)
3. Try position 7 (move F later by 1) → No conflict! (7 apart from A)
   ✅ Selected: Move Routine F from position 5 → position 7 (distance: 2)

Final schedule:
0: Routine A (Dancer: Sarah)
1: Routine B
2: Routine C
3: Routine D
4: Routine E
5: Routine G
6: Routine H
7: Routine F (Dancer: Sarah) ✅ RESOLVED - 7 routines from A
8: Routine I
9: Routine J
10: Routine K
```

### 2.3 Multi-Routine Fixes

When fixing all conflicts:

```typescript
function fixAllConflicts(
  schedule: Routine[],
  conflicts: Conflict[]
): Routine[] {

  let updatedSchedule = [...schedule];
  const conflictedRoutineIds = new Set(
    conflicts.flatMap(c => [c.routine1Id, c.routine2Id])
  );

  // Sort by entry number (process in order)
  const routinesToFix = Array.from(conflictedRoutineIds)
    .map(id => updatedSchedule.find(r => r.id === id)!)
    .filter(r => r != null)
    .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

  for (const routine of routinesToFix) {
    // Re-calculate conflicts after each move
    const currentConflicts = detectConflictsForRoutine(routine, updatedSchedule);

    if (currentConflicts.length > 0) {
      const newPosition = findBestPositionToResolveConflict(
        routine,
        updatedSchedule,
        currentConflicts
      );

      if (newPosition !== null) {
        updatedSchedule = moveRoutineToPosition(routine, newPosition, updatedSchedule);
      }
    }
  }

  return updatedSchedule;
}
```

---

## 3. UI Design

### 3.1 Individual Conflict Badge - Two-Action Design

**Current behavior:** Click badge → dismisses warning

**New behavior:** Hover badge → reveals action menu

```
┌─────────────────────────────────────────┐
│ ⚠️ Conflict Badge (compact, inactive)   │  ← Default state
└─────────────────────────────────────────┘

On hover:
┌─────────────────────────────────────────┐
│ ⚠️  │  🔧 Fix  │  ✕ Dismiss            │  ← Expanded on hover
└─────────────────────────────────────────┘
```

**Implementation:**

```tsx
{hasConflict && !dismissedIcons.has(`${routine.id}-conflict`) && (
  <div
    className="relative group inline-flex items-center"
    onMouseEnter={() => setHoveredConflict(routine.id)}
    onMouseLeave={() => setHoveredConflict(null)}
  >
    {/* Default badge */}
    <div
      className="w-6 h-2 rounded text-[10px] transition-all group-hover:w-auto group-hover:px-2 group-hover:gap-1"
      style={{ background: 'linear-gradient(135deg, #FF6B6B, #EE5A6F)' }}
    >
      {hoveredConflict === routine.id ? (
        <div className="flex items-center gap-2 text-white font-semibold">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAutoFixConflict(routine.id);
            }}
            className="flex items-center gap-0.5 hover:scale-110 transition-transform"
            title="Auto-fix: Move routine to nearest conflict-free position"
          >
            <span className="text-[9px]">🔧</span>
            <span className="text-[8px]">Fix</span>
          </button>
          <div className="w-px h-3 bg-white/30" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismissIcon(`${routine.id}-conflict`);
            }}
            className="text-[10px] hover:scale-110 transition-transform"
            title="Dismiss warning (conflict remains)"
          >
            ✕
          </button>
        </div>
      ) : (
        <span className="text-[8px]">⚠️</span>
      )}
    </div>

    {/* Tooltip showing conflict details */}
    <div className="absolute hidden group-hover:block z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64">
      <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 border border-red-500/50">
        <div className="font-semibold mb-1">Dancer Conflict</div>
        {getConflictTooltip()}
        <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-gray-400">
          Click "Fix" to automatically move this routine
        </div>
      </div>
    </div>
  </div>
)}
```

**Alternative: Right-Click Context Menu**

Could also use right-click on badge for power users:

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    onDismissIcon(`${routine.id}-conflict`);
  }}
  onContextMenu={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onAutoFixConflict(routine.id);
  }}
  title="Left click: Dismiss | Right click: Auto-fix"
>
  {/* Badge content */}
</button>
```

### 3.2 Global "Fix All Conflicts" Button

**Location:** Schedule page header, near "Send Draft to Studios"

```tsx
<div className="flex items-center gap-3">
  <button
    onClick={handleSendToStudios}
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700..."
  >
    <Mail className="h-4 w-4" />
    Send Draft to Studios
  </button>

  {/* NEW: Fix All Conflicts Button */}
  {conflicts.length > 0 && (
    <button
      onClick={handleFixAllConflicts}
      disabled={isFixingConflicts}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isFixingConflicts ? (
        <>
          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          Fixing...
        </>
      ) : (
        <>
          <span className="text-lg">🔧</span>
          <span>Fix All {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}</span>
        </>
      )}
    </button>
  )}
</div>
```

**Confirmation Modal (if >5 routines will be moved):**

```tsx
<Modal
  isOpen={showFixAllConfirmation}
  onClose={() => setShowFixAllConfirmation(false)}
  title="Auto-Fix All Conflicts?"
  size="md"
>
  <div className="space-y-4">
    <p className="text-gray-300">
      This will automatically move <strong>{routinesToMove.length} routines</strong> to resolve
      <strong> {conflicts.length} conflicts</strong> across all days.
    </p>

    <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
      <div className="font-semibold text-blue-200 mb-2">📋 What will happen:</div>
      <ul className="space-y-1 text-sm text-blue-100">
        <li>• Each routine moves the minimum distance possible</li>
        <li>• Routines stay on their current day</li>
        <li>• Entry numbers update automatically</li>
        <li>• You can undo with "Discard Changes"</li>
      </ul>
    </div>

    <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-3">
      <div className="font-semibold text-amber-200 mb-2">⚠️ Unable to fix:</div>
      <ul className="space-y-1 text-sm text-amber-100">
        {unresolvedConflicts.map(c => (
          <li key={c.id}>
            • {c.dancerName} in routines #{c.routine1Number} and #{c.routine2Number}
            (insufficient spacing available)
          </li>
        ))}
      </ul>
    </div>
  </div>

  <div className="flex justify-end gap-3 mt-6">
    <Button variant="secondary" onClick={() => setShowFixAllConfirmation(false)}>
      Cancel
    </Button>
    <Button
      variant="primary"
      onClick={confirmFixAll}
      className="bg-gradient-to-r from-amber-600 to-orange-600"
    >
      Fix All Conflicts
    </Button>
  </div>
</Modal>
```

---

## 4. User Feedback & Notifications

### 4.1 Success Toast

```tsx
toast.success(
  <div>
    <div className="font-semibold">✅ Conflicts Resolved</div>
    <div className="text-sm">
      Moved {movedCount} routine{movedCount !== 1 ? 's' : ''} •
      Resolved {resolvedCount} conflict{resolvedCount !== 1 ? 's' : ''}
    </div>
  </div>,
  { duration: 5000 }
);
```

### 4.2 Partial Success Toast

```tsx
toast.warning(
  <div>
    <div className="font-semibold">⚠️ Some Conflicts Remain</div>
    <div className="text-sm">
      Resolved {resolvedCount}/{totalConflicts} conflicts.
      {unresolvedCount} conflicts could not be fixed (insufficient spacing).
    </div>
  </div>,
  { duration: 7000 }
);
```

### 4.3 Animation During Fix

```tsx
// Add visual feedback during move
const animateRoutineMove = (routineId: string, fromPosition: number, toPosition: number) => {
  // Highlight the routine being moved
  setHighlightedRoutine(routineId);

  // Scroll to routine
  document.getElementById(`routine-${routineId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  // Apply pulsing animation
  setTimeout(() => setHighlightedRoutine(null), 2000);
};
```

---

## 5. Edge Cases & Limitations

### 5.1 Cannot Resolve Scenarios

**When auto-fix fails:**

1. **Over-scheduled day:** Not enough gaps between routines on entire day
   - **UI:** Show warning in modal: "Day is too densely scheduled"
   - **Suggestion:** "Remove some routines or increase minimum spacing"

2. **Dancer in too many routines:** Same dancer in 5+ consecutive routines
   - **UI:** Toast: "Cannot fix: [Dancer Name] appears in too many consecutive routines"
   - **Manual action:** CD must manually reschedule or remove routines

3. **Conflict at boundaries:** First/last routine of day with no room to move
   - **UI:** Show in modal: "Edge routine conflicts (try moving to different session/block)"

### 5.2 Fixed Spacing Rule

**The 6-routine spacing rule is FIXED and not configurable.**

This ensures consistent conflict detection and resolution across all competitions.

```tsx
// Competition-wide constant
const REQUIRED_ROUTINES_BETWEEN_SAME_DANCER = 6;
```

**Rationale:**
- **Consistency:** All users follow same conflict rules
- **Simplicity:** No need for per-competition configuration
- **Safety:** Prevents overly tight scheduling that could harm dancers
- **Industry standard:** 6-routine spacing is widely accepted in competition scheduling

**If configurable spacing is needed in the future:**

```tsx
// Optional: Add to competition settings (Phase 2)
interface CompetitionSettings {
  auto_fix_enabled: boolean; // Default: true
  // Future: minimum_routines_between_same_dancer?: number; // Default: 6
}
```

---

## 6. Technical Implementation Notes

### 6.1 State Management

```tsx
// Add to schedule page state
const [isFixingConflicts, setIsFixingConflicts] = useState(false);
const [hoveredConflict, setHoveredConflict] = useState<string | null>(null);

// Handlers
const handleAutoFixConflict = async (routineId: string) => {
  setIsFixingConflicts(true);

  try {
    // 1. Find best position
    const routine = draftsByDate[selectedDate].find(r => r.id === routineId);
    if (!routine) throw new Error('Routine not found');

    const conflicts = conflictsByRoutineId?.get(routineId) || [];
    const newPosition = findBestPositionToResolveConflict(
      routine,
      draftsByDate[selectedDate],
      conflicts
    );

    if (newPosition === null) {
      toast.error('Cannot auto-fix: No valid position found on this day');
      return;
    }

    // 2. Move routine
    const updatedSchedule = moveRoutineToPosition(routine, newPosition, draftsByDate[selectedDate]);

    // 3. Update state
    setDraftsByDate(prev => ({
      ...prev,
      [selectedDate]: updatedSchedule
    }));

    // 4. Success feedback
    toast.success(`Moved routine #${routine.entryNumber} to resolve conflict`);

  } catch (error) {
    console.error('Auto-fix failed:', error);
    toast.error('Failed to auto-fix conflict');
  } finally {
    setIsFixingConflicts(false);
  }
};
```

### 6.2 Performance Considerations

- **Batch updates:** When fixing multiple conflicts, batch all state updates at once
- **Debounce:** If user clicks "Fix All" multiple times, debounce the action
- **Max iterations:** Limit fix attempts to prevent infinite loops (max 100 moves)

### 6.3 Undo Support

```tsx
// Track moves for undo
const [fixHistory, setFixHistory] = useState<Array<{
  timestamp: Date;
  movedRoutines: Array<{ routineId: string; fromPosition: number; toPosition: number }>;
}>>([]);

// Undo last fix
const undoLastFix = () => {
  const lastFix = fixHistory[fixHistory.length - 1];
  if (!lastFix) return;

  // Reverse all moves
  let updatedSchedule = [...draftsByDate[selectedDate]];
  for (const move of lastFix.movedRoutines.reverse()) {
    const routine = updatedSchedule.find(r => r.id === move.routineId);
    if (routine) {
      updatedSchedule = moveRoutineToPosition(routine, move.fromPosition, updatedSchedule);
    }
  }

  setDraftsByDate(prev => ({ ...prev, [selectedDate]: updatedSchedule }));
  setFixHistory(prev => prev.slice(0, -1));

  toast.success('Undid last conflict fix');
};
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

- ✅ `findBestPositionToResolveConflict` returns correct position
- ✅ `findBestPositionToResolveConflict` returns null when no valid position
- ✅ `checkConflictAtPosition` correctly detects conflicts
- ✅ `fixAllConflicts` processes routines in correct order
- ✅ Entry numbers update after moves

### 7.2 Integration Tests

- ✅ Fix single conflict updates UI
- ✅ Fix all conflicts resolves multiple conflicts
- ✅ Cannot fix shows appropriate error message
- ✅ Undo reverts changes correctly
- ✅ Toast notifications display correctly

### 7.3 Manual Testing Scenarios

1. **Simple conflict:** 2 routines, same dancer, 1 routine apart
   - **Expected:** One routine moves 2+ positions away

2. **Chain conflict:** Dancer A in routines 1, 3, 5
   - **Expected:** Routines spread out with minimum spacing

3. **Edge case:** Conflict at position 0 (first routine)
   - **Expected:** Routine moves down schedule

4. **Dense schedule:** 20 routines, 10 dancers, many conflicts
   - **Expected:** Some conflicts resolved, some remain with clear messaging

---

## 8. Future Enhancements

### 8.1 Smart Scheduling Suggestions

```tsx
// Suggest optimal day/session for routine based on conflicts
function suggestBestDay(routine: Routine, allDaysSchedules: Record<string, Routine[]>): string {
  const conflicts = Object.entries(allDaysSchedules).map(([day, schedule]) => ({
    day,
    conflictCount: detectConflictsForRoutine(routine, schedule).length
  }));

  conflicts.sort((a, b) => a.conflictCount - b.conflictCount);
  return conflicts[0].day;
}
```

### 8.2 Conflict Prevention

```tsx
// Warn user when dragging routine to conflicted position
onDragOver={(event) => {
  const targetPosition = calculateDropPosition(event);
  const wouldCreateConflict = checkConflictAtPosition(
    draggedRoutine,
    targetPosition,
    daySchedule,
    draggedRoutine.participants.map(p => p.dancerId)
  );

  if (wouldCreateConflict) {
    // Show red highlight/warning
    setConflictWarning(targetPosition);
  }
}}
```

### 8.3 Bulk Operations

- **Fix all conflicts on selected day only**
- **Fix conflicts for specific dancer**
- **Fix conflicts for specific studio**

---

## 9. Database Schema Changes

**None required** - feature operates entirely on client-side draft state.

Conflicts are detected in real-time from the draft schedule.

---

## 10. Acceptance Criteria

### Must Have
- ✅ Individual conflict badge shows "Fix" option on hover
- ✅ Clicking "Fix" moves routine to nearest conflict-free position
- ✅ "Fix All Conflicts" button appears when conflicts exist
- ✅ Fix All resolves multiple conflicts in one click
- ✅ Entry numbers update automatically after moves
- ✅ Success/error feedback via toast notifications
- ✅ Routines never move to different day
- ✅ Routines move minimum distance necessary

### Should Have
- ✅ Confirmation modal for Fix All (if >5 moves)
- ✅ Show which conflicts cannot be fixed
- ✅ Visual animation during routine move
- ✅ Undo support for last fix operation

### Nice to Have
- ◻️ Configurable minimum spacing threshold
- ◻️ Conflict prevention warnings during drag
- ◻️ Smart day suggestions
- ◻️ Bulk fix by dancer/studio

---

## 11. Implementation Phases

### Phase 1: Core Algorithm (1-2 days)
- Implement `findBestPositionToResolveConflict`
- Implement `checkConflictAtPosition`
- Unit tests for conflict detection
- Manual testing with simple scenarios

### Phase 2: Individual Fix UI (1 day)
- Add hover menu to conflict badge
- Wire up `handleAutoFixConflict` handler
- Toast notifications
- Basic error handling

### Phase 3: Fix All Button (1 day)
- Add "Fix All Conflicts" button to header
- Implement `fixAllConflicts` logic
- Confirmation modal
- Partial success handling

### Phase 4: Polish & Edge Cases (1 day)
- Animation during moves
- Cannot-fix messaging
- Undo support
- Performance optimization

**Total Estimate:** 4-5 days

---

## 12. Open Questions

1. **Should we limit Fix All to current day or entire competition?**
   - **Proposal:** Default to current day, add checkbox for "Fix all days"

2. **What should happen if auto-fix creates new conflicts?**
   - **Proposal:** Rollback move, show error toast

3. **Should we save fix history to database for audit trail?**
   - **Proposal:** Phase 2 enhancement, not MVP

4. **How to handle ties (two positions with equal distance)?**
   - **Proposal:** Prefer moving later (closer to end of day)

---

**End of Specification**
