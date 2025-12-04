# Schedule Block Drag-Drop Bug

## Problem
Dragging schedule blocks (break blocks, award ceremony blocks) UP by 1 space does nothing - the block doesn't move to the new position.

## Root Cause (VERIFIED)
The issue is with **collision detection** in DragDropProvider.tsx lines 779-784.

**The bug:** After switching to `closestCenter`, I added filtering to remove the activeId from collision results. This filtering **removes valid drop targets**, causing `over` to be null and preventing `onDragEnd` from firing.

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

## Testing Plan
1. Build and deploy fix (commit removing filtering)
2. Navigate to schedule page with blocks (Saturday April 11)
3. Try dragging break block UP from 08:53 AM to before Entry #116 at 8:49 AM
4. Verify console shows drag end and block reorder messages
5. Verify block moves to correct position visually
6. Try dragging DOWN as well to ensure both directions work
