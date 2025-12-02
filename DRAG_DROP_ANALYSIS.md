# Drag/Drop System Holistic Analysis

## All Drag/Drop Operations

### 1. UR → SR (Unscheduled Routine to Schedule)
**Source**: RoutinePool (useDraggable or useSortable?)
**Target**: ScheduleTable (SortableContext)
**Drop Locations**:
- On routine (insert before that routine)
- On block (insert before that block)
- On empty schedule container
**ID Format**: `routine-${id}` (from UR pool)
**Handler**: `handleDragEnd` lines 574-604
**Status**: ✅ Working (per Session 75 fix)

### 2. SR → SR (Reordering Routines Within Schedule)
**Source**: ScheduleTable routine (useSortable)
**Target**: ScheduleTable routine (useSortable)
**Drop Locations**:
- On another routine (reorder to that position)
**ID Format**: `routine-${id}` (sortable)
**Handler**: `handleDragEnd` lines 606-697
**Status**: ❌ NOT WORKING (user reported)

### 3. Block Template → SR (Creating New Block)
**Source**: Block template button (useDraggable)
**Target**: ScheduleTable (SortableContext)
**Drop Locations**:
- On routine (insert before routine)
- On block (insert before block)
- On empty schedule container
**ID Format**: `block-template-award` or `block-template-break`
**Handler**: `handleDragEnd` lines 387-411
**Status**: ✅ Working (per Session 75 fix)

### 4. Block → Block/Routine (Reordering Blocks)
**Source**: ScheduleTable block (useSortable)
**Target**: ScheduleTable block or routine (useSortable)
**Drop Locations**:
- On another block (reorder blocks)
- On routine (insert before routine)
**ID Format**: `block-${id}` (sortable)
**Handler**: `handleBlockDrag` lines 228-337
**Status**: ❌ NOT WORKING (user reported)

## Root Cause Analysis

### dnd-kit Architecture
1. **SortableContext** (ScheduleTable lines 972-978):
   - Items: `[...routines.map(r => 'routine-${r.id}'), ...blocks.map(b => 'block-${b.id}')]`
   - Strategy: `verticalListSortingStrategy`
   - Purpose: Optimized reordering within a list

2. **useSortable** (ScheduleTable):
   - Routine rows: `id: 'routine-${routine.id}'` (line 315)
   - Block rows: `id: 'block-${block.id}'` (line 146)
   - Applies: `{...attributes} {...listeners}` to `<tr>` elements

3. **Custom Collision Detection** (DragDropProvider lines 707-799):
   - Overrides dnd-kit's default collision detection
   - Prioritizes specific items over containers
   - Special handling for blocks (allows routine/block targets)

### The Problem

**For sortable items (SR routines, blocks already in schedule):**
- dnd-kit's `verticalListSortingStrategy` expects standard collision detection (closestCenter/closestCorners)
- Our custom collision detection uses: `pointerWithin → rectIntersection → closestCenter`
- The custom logic is **interfering with sortable collision detection**

**Why custom collision works for external draggables but not sortables:**
- External draggables (UR routines, block templates): NOT part of SortableContext, need custom collision to find insertion points
- Sortables (SR routines, blocks): ARE part of SortableContext, dnd-kit has optimized collision logic that our custom function breaks

## Holistic Solution

### Key Insight
**We need TWO collision detection strategies:**
1. **For sortable → sortable** (SR → SR, Block → Block): Use dnd-kit's default collision
2. **For external → sortable** (UR → SR, Block Template → SR): Use custom collision

### Implementation Strategy

```typescript
const customCollisionDetection = (args: any) => {
  const activeId = String(args.active?.id || '');

  // Identify sortable items (already in schedule, part of SortableContext)
  const isSortableRoutine = activeId.startsWith('routine-') &&
    !activeId.startsWith('routine-pool-');
  const isSortableBlock = activeId.startsWith('block-') &&
    !activeId.startsWith('block-template-');

  // For sortable items reordering within schedule:
  // Use dnd-kit's closestCenter (works with verticalListSortingStrategy)
  if (isSortableRoutine || isSortableBlock) {
    return closestCenter(args);
  }

  // For external draggables (UR routines, block templates):
  // Use custom collision detection to prioritize specific items

  // ... existing custom logic for external draggables
};
```

### What This Fixes

1. **SR → SR reordering**: Uses closestCenter → works with useSortable
2. **Block → Block reordering**: Uses closestCenter → works with useSortable
3. **UR → SR drops**: Uses custom logic → preserves Session 75 fix
4. **Block Template → SR**: Uses custom logic → preserves Session 75 fix

### Edge Cases to Test

1. **Multi-select drag in SR**: Should still work with closestCenter
2. **Block → Routine drop**: Need to verify block special handling works
3. **Empty schedule**: Should fall back to container drop
4. **Cross-day drags**: Not currently supported, should still be blocked

## Next Steps

1. Implement the dual-strategy collision detection
2. Test all 4 drag/drop operations on production
3. Verify multi-select still works
4. Verify blocks can drop on routines (special handling)
