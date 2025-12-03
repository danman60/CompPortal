# Schedule Block Drag-Drop Bug

## Problem
Dragging schedule blocks (break blocks, award ceremony blocks) UP by 1 space does nothing - the block doesn't move to the new position.

## Root Cause
According to DRAG_DROP_ANALYSIS.md:
- The issue is with **collision detection**, not the splice logic
- Lines 781-795 use `pointerWithin` → `rectIntersection` → `closestCenter` for sortable blocks
- This custom collision chain **interferes** with dnd-kit's `verticalListSortingStrategy`
- The recommendation (lines 84-104) is to use `closestCenter` DIRECTLY for sortable items

## Current Code
**File**: `src/components/scheduling/DragDropProvider.tsx`
**Lines 781-795**: Sortable block collision detection
```typescript
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using pointerWithin:', activeId);
  // Try pointerWithin first for most accurate drop position
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  // Fallback to rectIntersection
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    return rectCollisions;
  }
  // Final fallback to closestCenter
  return closestCenter(args);
}
```

## Solution
Change line 781-795 to use `closestCenter` DIRECTLY:
```typescript
if (isSortableRoutine || isSortableBlock) {
  console.log('[CollisionDetection] Sortable item drag, using closestCenter:', activeId);
  return closestCenter(args);
}
```

## Why This Works
- `closestCenter` is the collision detection that `verticalListSortingStrategy` expects
- The multi-step fallback chain (`pointerWithin` → `rectIntersection` → `closestCenter`) breaks the sortable behavior
- Routines already use the same logic (lines 736-739) and work correctly

## Testing Plan
1. Build and deploy fix
2. Navigate to schedule page with blocks
3. Try dragging break block UP by 1 space
4. Verify block moves to correct position
5. Try dragging DOWN as well to ensure both directions work
