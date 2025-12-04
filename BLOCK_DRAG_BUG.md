# Schedule Block Drag-Drop Bug

## Problem
Dragging schedule blocks (break blocks, award ceremony blocks) UP by 1 space does nothing - the block doesn't move to the new position.

## Root Cause (VERIFIED - Attempt 16)
**UI was re-sorting blocks by stale `scheduled_time` after database returned them in correct `sort_order`.**

**Location:** ScheduleTable.tsx line 676
**Fix:** Changed `sortedBlocks` to sort by `sort_order` instead of `scheduled_time`
**Result:** Blocks now persist in dragged position after refetch

## Investigation Journey Summary

**15 failed attempts** before finding the real bug:
- **Attempts 1-7:** Collision detection issues (timeouts, wrong targets)
- **Attempts 8-14:** Index-based reordering logic improvements
- **Attempt 15:** Time cascade and sort_order calculation fixes (drag worked, but blocks snapped back)
- **Attempt 16:** ✅ Found UI re-sorting bug - REAL FIX

**Key insight:** The drag-drop logic, database mutations, and queries were ALL correct. The bug was in a client-side `useMemo` that re-sorted blocks by time AFTER fetching them from the database.

## Failed Attempts (DO NOT REPEAT)

### ❌ Attempt 1: Multi-step fallback (lines 781-795)
Used `pointerWithin` → `rectIntersection` → `closestCenter` chain. This interfered with `verticalListSortingStrategy`.

### ❌ Attempt 2: Filtering after closestCenter (commit dcd7a44)
```typescript
if (isSortableRoutine || isSortableBlock) {
  const collisions = closestCenter(args);
  const filtered = collisions.filter((collision: any) => collision.id !== activeId);
  return filtered; // ❌ WRONG - removes valid targets!
}
```

**Why this failed:**
- Console showed: Drag started, CollisionDetection called 4 times, but NO drag end
- `onDragEnd` never fired because `over` was null (no valid collision targets after filtering)
- `closestCenter` ALREADY excludes the active item - additional filtering is unnecessary and harmful

### ❌ Attempt 3: Using closestCenter without filtering (commit 286e1f0)
```typescript
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using closestCenter:', activeId);
  return closestCenter(args);
}
```

**Why this failed:**
- Removed filtering as expected
- Console STILL showed: Drag started, CollisionDetection called 4 times, but NO drag end
- `closestCenter` itself is not detecting collisions when dragging UP by small distances
- **Root cause**: `closestCenter` calculates distance between CENTERS of elements. When dragging UP by 1 space, the block center may not get close enough to routine center to trigger detection

### ❌ Attempt 4: Using rectIntersection without filtering (commit c691521)
```typescript
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using rectIntersection:', activeId);
  return rectIntersection(args);
}
```

**Why this failed:**
- `rectIntersection` DOES detect collisions (unlike `closestCenter` which timed out)
- BUT it returns the block ITSELF in the collision results
- Result: "Block dropped on itself - no action taken"
- `rectIntersection` doesn't automatically exclude the activeId like `closestCenter` does

### ❌ Attempt 5: rectIntersection WITH activeId filtering (commit 885d59a)

**Fix**: Filter out the activeId from `rectIntersection` results

**File**: `src/components/scheduling/DragDropProvider.tsx`
**Lines 782-788**:

```typescript
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using rectIntersection:', activeId);
  const collisions = rectIntersection(args);
  // Filter out the active item itself to prevent "dropped on itself" bugs
  const filtered = collisions.filter((collision: any) => collision.id !== activeId);
  console.log('[CollisionDetection] Filtered collisions:', filtered.length, 'targets');
  return filtered;
}
```

**Why this failed:**
- Collision detection DOES fire (unlike Attempt 3 which timed out)
- activeId filtering prevents "dropped on itself" bug (unlike Attempt 4)
- BUT `rectIntersection` returns the **droppable CONTAINER** (`schedule-table-2026-04-11`) instead of the **specific routine** (`routine-...`) being dragged over
- Console log: `targetId: schedule-table-2026-04-11, targetStartsWithBlock: false`
- Drag handler doesn't know WHERE to insert the block, so nothing happens
- **Root cause**: `rectIntersection` detects ALL collisions including containers. Need to prioritize specific items (routines/blocks) over containers

## Attempt 6: Priority-based collision detection ⏳

**Solution**: Use `rectIntersection` but prioritize specific items (routines/blocks with IDs starting with `routine-` or `block-`) over containers (IDs starting with `schedule-table-`).

**File**: `src/components/scheduling/DragDropProvider.tsx`
**Lines 782-795**:

```typescript
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using rectIntersection:', activeId);
  const collisions = rectIntersection(args);

  // Filter out the active item itself
  const filtered = collisions.filter((collision: any) => collision.id !== activeId);

  // Prioritize specific items (routines/blocks) over containers
  const specificItems = filtered.filter((c: any) =>
    c.id.startsWith('routine-') || c.id.startsWith('block-')
  );

  // If we found specific items, return those. Otherwise return all (including containers)
  const result = specificItems.length > 0 ? specificItems : filtered;
  console.log('[CollisionDetection] Filtered collisions:', result.length, 'targets');
  return result;
}
```

**Why this should work:**
- `rectIntersection` detects collisions even for small movements (solves Attempt 3 timeout)
- activeId filtering prevents "dropped on itself" (solves Attempt 4 issue)
- Prioritizing specific items over containers ensures targetId is a routine/block, not the container
- Falls back to container if no specific items found (edge case: dropping on empty schedule)
- Matches the solution described in DRAG_DROP_ANALYSIS.md lines 100-104

**Status**: ❌ FAILED - Implemented as commit 68d86ff, timed out identical to Attempt 3

### ❌ Attempt 7: Using closestCenter per DRAG_DROP_ANALYSIS.md (commit 68d86ff)

**Fix**: Switched from `rectIntersection` back to `closestCenter` based on DRAG_DROP_ANALYSIS.md recommendation (lines 94-97).

**File**: `src/components/scheduling/DragDropProvider.tsx`
**Lines 779-784**:

```typescript
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using closestCenter:', activeId);
  return closestCenter(args);
}
```

**Why this failed:**
- IDENTICAL behavior to Attempt 3 (both use `closestCenter` without filtering)
- Collision detection fired 4 times but `onDragEnd` never executed
- Drag operation timed out after 5000ms
- Console log pattern EXACTLY matches Attempt 3 failure

**Console Evidence (build 68d86ff)**:
```
[DragDropProvider] Drag started: {activeId: block-81ba4540...}
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
(NO drag end - timeout)
```

**Root Cause Analysis:**
- The issue is NOT which collision algorithm is used (`closestCenter` vs `rectIntersection`)
- The issue is NOT filtering (both Attempt 3 and 7 have no filtering, both fail)
- `closestCenter` is likely returning ZERO collision results for blocks moving UP by small distances
- This suggests a fundamental issue with how dnd-kit calculates center-based distances for blocks

**Status**: ❌ FAILED - Proves collision algorithm choice is NOT the root cause

## Console Log Evidence

### ❌ Failed (with filtering):
```
[DragDropProvider] Drag started: {activeId: block-81ba4540...}
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
(NO drag end - operation hangs)
```

### ✅ Expected (without filtering):
```
[DragDropProvider] Drag started: {activeId: block-81ba4540...}
[CollisionDetection] Sortable item drag, using closestCenter: block-81ba4540...
[DragDropProvider] Block drag: {draggedBlockId: block-81ba4540...}
[DragDropProvider] Inserting block before routine: Emerald 126
[DragDropProvider] Block inserted, cascading times
[SchedulePage] Block reorder triggered, updating 2 blocks
```

### ❌ Attempt 13: Prioritize specific items over containers in collision detection (commit dc94e05)

**Hypothesis**: Collision detection was returning the container (`schedule-table-2026-04-11`) instead of specific routines, causing the index-based drag handler to skip its logic.

**Fix**: Modified collision detection for sortable blocks (DragDropProvider.tsx:829-881) to:
1. Get `pointerWithin` collisions
2. Separate specific items (routines/blocks) from containers
3. Prioritize and return specific items first
4. Fall back to `closestCenter` if only container found

```typescript
if (isSortableBlock) {
  const collisions = pointerWithin(args);
  const filtered = collisions.filter((collision: any) => collision.id !== activeId);

  // Separate specific items from containers
  const specificItems = filtered.filter(c => {
    const id = String(c.id);
    return id.startsWith('routine-') || id.startsWith('block-');
  });
  const containers = filtered.filter(c => {
    const id = String(c.id);
    return id.startsWith('schedule-table-');
  });

  // Prioritize specific items over containers
  if (specificItems.length > 0) {
    return specificItems;
  }
  // ... fallback logic
}
```

**Status**: ❌ FAILED - Blocks still locked at bottom, snap back after drag

**Why this failed**: Investigation needed - console logs required to see what collision detection is actually returning and why blocks still don't move.

## Architecture Overview (for debugging tools)

### System Components

**1. dnd-kit Library**
- React drag-and-drop framework
- Provides: `DndContext`, `useDraggable`, `useSortable`, collision detection algorithms
- Key concept: Items have IDs, collision detection returns which items are colliding during drag

**2. DragDropProvider.tsx** (lines 1-950+)
Main drag-drop orchestration component with three key subsystems:

**2a. Collision Detection** (lines 819-945)
- **Purpose**: Determine what the dragged item is hovering over
- **Input**: Active item ID, pointer coordinates, droppable item positions
- **Output**: Array of collision objects with IDs (e.g., `[{id: 'routine-abc123'}]`)
- **Logic Flow**:
  ```
  customCollisionDetection(args) {
    if (isSortableBlock) → pointerWithin + prioritize specific items
    if (isSortableRoutine) → closestCenter
    if (external drag) → custom priority logic
  }
  ```

**2b. Drag Handlers** (lines 228-697)
Three separate handlers based on what's being dragged:

- **handleBlockDrag** (lines 228-337): Block → Block/Routine reordering
- **Block Template Drop** (lines 387-411): Creating new blocks from templates
- **handleDragEnd** (lines 488-697): Routine drops and reordering

**2c. State Management**
- `scheduleBlocks`: Array of block objects with `{id, scheduled_time, duration}`
- `routines`: Array of routine objects with `{id, performanceTime, duration}`
- Changes trigger `onBlockReorder()` or `onScheduleChange()` callbacks

### Data Flow: Block Drag Operation

```
1. User starts dragging block
   ↓
2. onDragStart() → Sets activeId
   ↓
3. As mouse moves → customCollisionDetection() called repeatedly
   ↓
4. Collision detection returns array of IDs (routines/blocks/containers)
   ↓
5. onDragEnd(event) receives:
      - event.active.id (dragged block ID)
      - event.over.id (target ID from collision detection)
   ↓
6. handleBlockDrag() checks targetId:
      - If starts with 'routine-' → Insert before that routine
      - If starts with 'block-' → Reorder blocks
      - If starts with 'schedule-table-' → SKIP (container, not specific target)
   ↓
7. Index-based reordering (Attempt 12):
      - Create timeline of blocks + routines sorted by time
      - Find draggedIndex and targetIndex in timeline
      - Calculate insertIndex (adjust for direction)
      - Splice and reorder timeline
      - Extract blocks, recalculate times
   ↓
8. onBlockReorder(reorderedBlocks) → SchedulePage updates state
   ↓
9. React re-renders with new block positions
```

### The Bug: What's Breaking

**Symptoms (as of dc94e05)**:
- Drag operation completes (no timeout)
- Success toast appears
- Blocks snap back to bottom position
- No errors in console

**Possible Causes**:
1. Collision detection returns wrong IDs → Handler receives bad targetId
2. Handler logic executes but calculates wrong position
3. `onBlockReorder()` is called but state update fails
4. `recalculateBlockTimes()` puts blocks back at bottom

**Debug Strategy**:
1. Check console logs during drag to see:
   - What collision detection returns: `[CollisionDetection] pointerWithin results:`
   - What handler receives: `[DragDropProvider] Block drag: {targetId: ...}`
   - Timeline indices: `[DragDropProvider] Timeline indices - dragged: X target: Y`
   - Insert index: `[DragDropProvider] Moving UP/DOWN - insert at index: X`
2. If collision detection returns containers → Fix collision detection
3. If handler receives correct routine IDs → Fix index calculation
4. If index calculation correct → Fix `recalculateBlockTimes()` or state update

### Key Files
- `src/components/scheduling/DragDropProvider.tsx` - Drag-drop logic (950+ lines)
- `src/app/dashboard/director-panel/schedule/page.tsx` - SchedulePage component
- `src/components/scheduling/ScheduleTable.tsx` - Renders draggable rows

### Critical Code Patterns

**Routine Reordering (WORKS)**:
```typescript
// handleDragEnd lines 606-697
const fromIndex = scheduledRoutines.findIndex(r => r.id === routineId);
const toIndex = scheduledRoutines.findIndex(r => r.id === targetRoutineId);
const movingDown = fromIndex < toIndex;
const insertIndex = movingDown ? toIndex - 1 : toIndex;
reordered.splice(insertIndex, 0, removed);
```

**Block Reordering (BROKEN)**:
```typescript
// handleBlockDrag lines 343-429 (Attempt 12)
const timeline = [...blocks, ...routines].sort(by time);
const draggedIndex = timeline.findIndex(block);
const targetIndex = timeline.findIndex(routine);
const movingDown = draggedIndex < targetIndex;
const insertIndex = movingDown ? targetIndex - 1 : targetIndex;
reordered.splice(insertIndex, 0, removed);
```

Pattern is identical, but blocks still fail. Why?

### ❌ Attempt 14: Calculate times from index order, skip recalculateBlockTimes (commit ff0e3fd)

**Hypothesis**: `recalculateBlockTimes()` was re-sorting by time, undoing the index reorder.

**Fix**: Replaced `recalculateBlockTimes()` call with inline time calculation directly from the NEW index-reordered timeline (DragDropProvider.tsx:419-450).

**Implementation**:
```typescript
// Calculate times based on NEW index order (reordered timeline)
const dayStart = getDayStartTime(selectedDate);
let currentTime = new Date(year, month - 1, day, startHours, startMinutes, 0, 0);

for (const item of reordered) {
  if (item.type === 'block') {
    recalculated.push({
      ...block,
      scheduled_time: new Date(currentTime),
    });
    currentTime = new Date(currentTime.getTime() + block.duration_minutes * 60000);
  } else {
    // Routine: use its performance time to cascade
    const routine = item.data as RoutineData;
    if (routine.performanceTime) {
      const [rHours, rMinutes] = routine.performanceTime.split(':').map(Number);
      const routineEndTime = new Date(year, month - 1, day, rHours, rMinutes, 0, 0);
      currentTime = new Date(routineEndTime.getTime() + routine.duration * 60000);
    }
  }
}
```

**Status**: ❌ FAILED - Blocks still snap back to bottom

**Why this failed** (Root Cause Analysis):

**Bug #1: Broken Time Cascade Logic** ⚠️ CRITICAL
- When processing routines in the reordered timeline, code uses routine's ORIGINAL `performanceTime` instead of cascading from `currentTime`
- **What happens**: Block moves to 08:00 → currentTime advances to 08:03 → Next routine JUMPS to 08:49 (original time) → Cascade breaks → Subsequent blocks get 08:49+ times → Back at bottom
- **What should happen**: Routines should NOT override `currentTime` - they should START at `currentTime`, not jump back to their original time

**Bug #2: sort_order Never Updated** ⚠️ LIKELY
- `sort_order` field is inherited from old block, never recalculated based on new timeline position
- If database/UI sorts by `sort_order` instead of `scheduled_time`, blocks snap back to old position
- Need to recalculate `sort_order` based on new timeline indices

**Bug #3: Potential Race Condition** ⚠️ POSSIBLE
- After updating database, `refetchBlocks()` may return stale data due to caching or async timing
- Optimistic UI update needed before refetch

## Attempt 15: Fix all 3 bugs ⏳

**Fix #1: Proper Time Cascade**
```typescript
for (const item of reordered) {
  if (item.type === 'block') {
    recalculated.push({
      ...block,
      scheduled_time: new Date(currentTime),
      sort_order: blockIndex++,  // Fix #2
    });
    currentTime = new Date(currentTime.getTime() + block.duration_minutes * 60000);
  } else {
    // Routine: cascade through WITHOUT jumping to original time
    const routine = item.data as RoutineData;
    // Use currentTime + routine duration, DON'T read routine's old performanceTime
    currentTime = new Date(currentTime.getTime() + routine.duration * 60000);
  }
}
```

**Fix #2: Recalculate sort_order**
- Add `sort_order` calculation based on block's index in recalculated array

**Fix #3: Optimistic Update** (ABANDONED - no queryClient available)
- Attempted to update local state immediately before refetch
- Not possible without React Query's queryClient
- scheduleBlocks comes from tRPC query, not useState

**Status**: ❌ FAILED

**Test Results (Build ff0e3fd):**
- Drag executed successfully (no timeout)
- Console logs show correct timeline indices: dragged: 8, target: 7
- Console logs show "Moving UP - insert at index: 7"
- Console logs show "Block reordered with Attempt 15"
- Success toast appeared: "Schedule blocks reordered"
- **BUT: Break block still at 08:53 AM - snap-back still occurs**

**Root Cause Discovered:**
The time cascade fix (#1) only affects blocks being sent to database. When `refetchBlocks()` runs, it doesn't update routine times - routines keep their original `performanceTime` values from the database. This means the cascade is broken on refetch, causing blocks to snap back.

**Real fix needed:** Block reordering should ONLY rely on `sort_order`, NOT on cascading times from routines. The refetch should sort by `sort_order` field, ignoring `scheduled_time` which gets stale.

## Attempt 16: Fix UI re-sorting after database fetch ✅ REAL FIX

**Hypothesis:** The database query `getScheduleBlocks` is sorting by `scheduled_time` which causes blocks to snap back when refetched.

**Investigation Results:**
- ✅ Database query ALREADY sorts by `sort_order` correctly (scheduling.ts:1491-1494)
- ✅ Backend mutation SAVES `sort_order` correctly (scheduling.ts:1590)
- ❌ **UI RE-SORTS blocks by `scheduled_time` AFTER fetch** (ScheduleTable.tsx:676)

**Root Cause Found:** Line 676 in ScheduleTable.tsx re-sorts blocks by stale `scheduled_time`:
```typescript
// BEFORE (causes snap-back):
const sortedBlocks = useMemo(() => {
  return [...scheduleBlocks]
    .filter(b => b.scheduled_time)
    .sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime());
}, [scheduleBlocks]);
```

**Fix Applied (Commit 4cf2d94):**
```typescript
// AFTER (respects database sort_order):
const sortedBlocks = useMemo(() => {
  return [...scheduleBlocks]
    .filter(b => b.scheduled_time)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)); // ✅ Use sort_order
}, [scheduleBlocks]);
```

**Why this fixes snap-back:**
1. Database returns blocks in correct `sort_order` (from drag-drop)
2. UI no longer re-sorts them by stale `scheduled_time`
3. Blocks stay in dragged position after refetch

**Status:** ✅ IMPLEMENTED - Deployed to tester branch (build 4cf2d94)

## Attempt 17: Handle container drops (move to bottom) ⏳

**Problem:** Block can now move UP (Attempt 16 fix), but cannot be moved to the BOTTOM of the schedule.

**Root Cause:** When dragging a block past all routines to the bottom, collision detection returns the container (`schedule-table-2026-04-11`) instead of a specific routine. The `handleBlockDrag` function had no handler for container drops:

```typescript
// handleBlockDrag cases:
if (targetId.startsWith('block-')) {       // ✅ block-to-block
  // ...
}
else if (!targetId.startsWith('schedule-table-') && !targetId.startsWith('routine-pool-')) {
  // ✅ block-to-routine (but excludes containers!)
}
// ❌ MISSING: No handler for schedule-table-* (container drops)
```

**Fix Applied (DragDropProvider.tsx lines 342-420):**
- Added new `else if (targetId.startsWith('schedule-table-'))` case
- Creates combined timeline of blocks + routines
- Removes dragged block from current position
- Appends block to END of timeline
- Recalculates times and sort_order

**Status:** ⏳ IMPLEMENTED - Needs testing

## Attempt 18: Fix collision detection to return container for bottom drops ✅

**Problem:** Even with the container handler (Attempt 17), blocks still couldn't drop to the bottom because collision detection was using `closestCenter` as a fallback when only the container was detected. This made it return the LAST routine instead of the container.

**Root Cause (DragDropProvider.tsx lines ~929-970):**
```typescript
// OLD CODE (buggy):
if (containers.length > 0) {
  console.log('[CollisionDetection] Only container found, trying closestCenter fallback');
  const fallbackCollisions = closestCenter(args);  // ❌ Returns last routine!
  // ... tries to find specific items from closestCenter ...
  return containers;  // Never reached if closestCenter finds something
}
```

**Why closestCenter fallback is wrong:**
- When dragging block to bottom (past all routines), `pointerWithin` finds only the container
- `closestCenter` fallback returns the LAST routine (closest by distance)
- Handler receives last routine ID → inserts BEFORE it → block stays at same position
- Need to return CONTAINER so handleBlockDrag can append to end

**Fix Applied:**
```typescript
// NEW CODE (Attempt 18):
if (containers.length > 0) {
  console.log('[CollisionDetection] No specific items found, returning container for bottom-of-schedule drop (Attempt 18)');
  return containers;  // ✅ Return container directly, no fallback
}
```

**Status:** ✅ IMPLEMENTED

## Testing Plan
1. Build and deploy fix
2. Navigate to schedule page with blocks (Saturday April 11)
3. Test cases:
   - ✅ Drag block UP by 1 position (regression test - Attempt 16)
   - ⏳ Drag block to BOTTOM (past all routines) - Attempt 17 + 18
   - ⏳ Drag block to middle position
4. Verify console logs:
   - "No specific items found, returning container for bottom-of-schedule drop (Attempt 18)"
   - "Block moved to end of schedule (Attempt 17)"
5. Verify block persists in new position after page refresh
