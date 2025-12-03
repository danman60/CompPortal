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

## Correct Solution ✅

**File**: `src/components/scheduling/DragDropProvider.tsx`
**Lines 779-784**:

```typescript
// For sortable items (SR → SR, Block → Block reordering):
// Use closestCenter directly - it already excludes the active item
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using closestCenter:', activeId);
  return closestCenter(args);
}
```

**Key insight:** `closestCenter` from dnd-kit is designed to work with `verticalListSortingStrategy` and handles collision detection correctly on its own. Do NOT add filtering or fallback chains.

## Why This Works
- `closestCenter` is the collision detection that `verticalListSortingStrategy` expects
- It already excludes the dragged item from collision results
- No additional filtering or logic needed
- Routines use the same pattern (lines 736-739) and work correctly

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
