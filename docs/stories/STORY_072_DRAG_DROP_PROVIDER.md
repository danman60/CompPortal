# STORY-072: DragDropProvider Component

**Story ID:** STORY_072_DRAG_DROP_PROVIDER
**Epic:** EPIC_PHASE2_SCHEDULING
**Status:** Pending
**Story Points:** 8
**Priority:** HIGH
**Assignee:** Developer (Claude)

---

## Story Description

As a Competition Director, I want to drag routines from the Unscheduled Routines pool onto the Schedule table, so that I can quickly build competition schedules by dragging and dropping instead of manual data entry.

---

## Acceptance Criteria

- [ ] Drag single routine from Unscheduled Routines → Schedule table works
- [ ] Drag updates performance time via backend `calculateScheduleTimes` mutation
- [ ] Entry number auto-assigns starting at #100
- [ ] Drop indicator shows visual feedback during drag
- [ ] Multi-select: Shift+click to select multiple routines, drag all together
- [ ] Drag within Schedule (reorder) recalculates all subsequent times
- [ ] Failed drags show error toast and revert state
- [ ] Successful drags show success toast
- [ ] Build passes, type check passes

---

## Technical Requirements

### Component Architecture

**File to Create:** `src/components/scheduling/DragDropProvider.tsx`

**Purpose:** Wrap RoutineTable and ScheduleTable with @dnd-kit drag-and-drop context

**Key Features:**
1. **Drag Sources:**
   - Unscheduled Routines (RoutineTable rows)
   - Scheduled Routines (ScheduleTable rows)

2. **Drop Targets:**
   - Schedule table (empty state or between routines)
   - Schedule table rows (for reordering)

3. **Drag Types:**
   - **UR → SR:** Schedule routine (add to schedule)
   - **SR → SR:** Reorder routine (change position)
   - **Multi-drag:** Select multiple (Shift+click), drag all

4. **Drop Indicator:**
   - Visual line showing where routine will be dropped
   - Green/blue color to indicate valid drop zone
   - Position updates as mouse moves

---

## Implementation Details

### 1. Provider Setup

```typescript
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface DragDropProviderProps {
  children: React.ReactNode;
  routines: Routine[]; // All routines (scheduled + unscheduled)
  selectedDate: string; // ISO date string
  onScheduleChange: (routines: Routine[]) => void;
  selectedRoutineIds?: Set<string>; // For multi-select
  onClearSelection?: () => void;
}

export function DragDropProvider({
  children,
  routines,
  selectedDate,
  onScheduleChange,
  selectedRoutineIds = new Set(),
  onClearSelection
}: DragDropProviderProps) {
  // Implementation
}
```

### 2. Drag Handlers

**handleDragStart:**
```typescript
const handleDragStart = (event: DragStartEvent) => {
  const { active } = event;

  // Check if dragging selected routines (multi-drag)
  if (selectedRoutineIds.has(active.id as string)) {
    // Multi-drag: Show count indicator
    console.log('[DragDropProvider] Multi-drag started:', selectedRoutineIds.size);
  } else {
    // Single drag
    console.log('[DragDropProvider] Drag started:', active.id);
  }
};
```

**handleDragEnd:**
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) {
    console.log('[DragDropProvider] Drag cancelled (no drop target)');
    return;
  }

  const draggedId = active.id as string;
  const targetId = over.id as string;

  // Determine drag type
  const draggedRoutine = routines.find(r => r.id === draggedId);
  const isScheduled = draggedRoutine?.isScheduled;
  const isMultiDrag = selectedRoutineIds.size > 1 && selectedRoutineIds.has(draggedId);

  if (!isScheduled) {
    // UR → SR: Schedule routine(s)
    handleScheduleDrag(draggedId, targetId, isMultiDrag);
  } else {
    // SR → SR: Reorder routine(s)
    handleReorderDrag(draggedId, targetId, isMultiDrag);
  }

  // Clear selection after successful drag
  if (onClearSelection) {
    onClearSelection();
  }
};
```

**handleScheduleDrag** (UR → SR):
```typescript
const handleScheduleDrag = async (draggedId: string, targetId: string, isMultiDrag: boolean) => {
  const routinesToSchedule = isMultiDrag
    ? routines.filter(r => selectedRoutineIds.has(r.id))
    : routines.filter(r => r.id === draggedId);

  console.log('[DragDropProvider] Scheduling routines:', routinesToSchedule.length);

  // Call backend mutation
  const result = await trpc.scheduling.schedule.mutate({
    routineIds: routinesToSchedule.map(r => r.id),
    selectedDate,
    startTime: calculateInsertionTime(targetId), // Find time to insert at
  });

  // Update parent state
  onScheduleChange(result);
};
```

**handleReorderDrag** (SR → SR):
```typescript
const handleReorderDrag = async (draggedId: string, targetId: string, isMultiDrag: boolean) => {
  const scheduledRoutines = routines.filter(r => r.isScheduled);
  const routinesToMove = isMultiDrag
    ? scheduledRoutines.filter(r => selectedRoutineIds.has(r.id))
    : scheduledRoutines.filter(r => r.id === draggedId);

  console.log('[DragDropProvider] Reordering routines:', routinesToMove.length);

  // Remove dragged routines from current position
  const withoutDragged = scheduledRoutines.filter(r => !selectedRoutineIds.has(r.id));

  // Find target index
  const targetIndex = withoutDragged.findIndex(r => r.id === targetId);

  // Insert at new position
  const reordered = [...withoutDragged];
  reordered.splice(targetIndex, 0, ...routinesToMove);

  // Recalculate times via backend
  const result = await trpc.scheduling.calculateScheduleTimes.mutate({
    routines: reordered.map(r => ({
      id: r.id,
      duration: r.duration,
      entryNumber: r.entryNumber,
    })),
    selectedDate,
  });

  // Update parent state
  onScheduleChange(result);
};
```

### 3. Drop Indicator

```typescript
import { DragOverlay, DropIndicator } from '@dnd-kit/core';

// In render:
<DragOverlay>
  {activeId ? (
    <div className="bg-purple-600/20 border-2 border-purple-500 rounded-lg p-2">
      <span className="text-white font-semibold">
        {selectedRoutineIds.size > 1
          ? `Moving ${selectedRoutineIds.size} routines`
          : 'Moving routine'}
      </span>
    </div>
  ) : null}
</DragOverlay>

<DropIndicator className="h-1 bg-green-500 rounded-full" />
```

### 4. Integration with Tables

**RoutineTable** (Unscheduled Routines):
```typescript
import { useDraggable } from '@dnd-kit/core';

// In row component:
const { attributes, listeners, setNodeRef } = useDraggable({
  id: routine.id,
  data: { routine },
});

<tr ref={setNodeRef} {...attributes} {...listeners}>
  {/* Row content */}
</tr>
```

**ScheduleTable** (Scheduled Routines):
```typescript
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

// In row component:
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
  id: routine.id,
  data: { routine },
});

// Drop zone for empty schedule:
const { setNodeRef: setDropRef } = useDroppable({
  id: 'schedule-empty',
});
```

---

## Dependencies

### Completed
- ✅ STORY_070: Backend API (schedule mutation, calculateScheduleTimes)
- ✅ STORY_071: RoutineTable + ScheduleTable components

### External Libraries
- `@dnd-kit/core` - Drag-and-drop core library
- `@dnd-kit/sortable` - Sortable list utilities
- `@dnd-kit/utilities` - Helper utilities (CSS transform, etc.)

---

## Testing Checklist

### Unit Tests (Optional - Manual Testing Preferred)
- [ ] Drag handler functions execute correctly
- [ ] Multi-select state tracked properly
- [ ] Backend mutations called with correct params

### Integration Tests (Manual via Playwright MCP)
**Test on:** tester.compsync.net

1. **Single Routine Drag (UR → SR):**
   - [ ] Drag routine from UR to SR
   - [ ] Performance time auto-calculated
   - [ ] Entry number assigned (#100, #101, etc.)
   - [ ] Routine appears in schedule
   - [ ] Routine removed from UR pool

2. **Multi-Routine Drag (UR → SR):**
   - [ ] Shift+click to select 3 routines
   - [ ] Drag any selected routine
   - [ ] All 3 routines move to schedule
   - [ ] Times calculated sequentially
   - [ ] Entry numbers assigned sequentially
   - [ ] Selection cleared after drag

3. **Reorder Drag (SR → SR):**
   - [ ] Drag routine #102 to position of #105
   - [ ] Routine #102 moves to new position
   - [ ] All subsequent routines recalculated
   - [ ] Entry numbers remain sequential

4. **Drop Indicator:**
   - [ ] Green line shows during drag
   - [ ] Line position updates with mouse
   - [ ] Line disappears after drop

5. **Error Handling:**
   - [ ] Drag to invalid zone shows error toast
   - [ ] Failed mutation reverts state
   - [ ] Console shows clear error messages

6. **Performance:**
   - [ ] Drag response time <500ms (60 routines)
   - [ ] No lag during drag
   - [ ] Smooth animations

---

## Implementation Steps

1. **Create DragDropProvider.tsx file**
   - Set up @dnd-kit context
   - Define interfaces (DragDropProviderProps)
   - Implement drag event handlers (start, over, end)

2. **Implement drag logic**
   - handleScheduleDrag (UR → SR)
   - handleReorderDrag (SR → SR)
   - calculateInsertionTime helper

3. **Add drop indicator**
   - DragOverlay component
   - DropIndicator styling

4. **Integrate with RoutineTable**
   - Add useDraggable to rows
   - Test drag from UR

5. **Integrate with ScheduleTable**
   - Add useSortable to rows
   - Add useDroppable for empty state
   - Test drag within SR

6. **Add multi-select support**
   - Track selectedRoutineIds
   - Handle multi-drag in event handlers
   - Show count indicator in overlay

7. **Test end-to-end**
   - Build + type check
   - Manual testing on tester.compsync.net
   - Verify all acceptance criteria

8. **Code review**
   - Run code review checklist
   - Verify multi-tenant safety (tenant_id filters)
   - Check error handling

9. **Commit + push**
   - 8-line commit format
   - Update sprint-status.yaml (mark STORY_072 complete)

---

## Edge Cases & Error Handling

### Edge Cases
1. **Empty Schedule:** Drop onto empty schedule table
2. **First Position:** Drop at #100 (first routine)
3. **Last Position:** Drop after last routine
4. **Same Position:** Drag routine to its current position (no-op)
5. **Multi-select with non-adjacent:** Select #100, #103, #107 (skip #101, #102)

### Error Handling
1. **Network Failure:**
   - Show error toast: "Failed to schedule routine. Please try again."
   - Revert state to pre-drag
   - Console log full error for debugging

2. **Invalid Drop:**
   - Detect invalid drop zones
   - Show error toast: "Cannot drop here"
   - Revert drag

3. **Backend Validation Error:**
   - Show user-friendly error message
   - Example: "Routine already scheduled on this day"
   - Revert state

4. **Concurrent Edit Conflict:**
   - Detect version mismatch
   - Show warning: "Schedule was updated by another user. Reloading..."
   - Refresh schedule data

---

## Performance Considerations

### Optimization Strategies
1. **React.memo for rows:** Prevent unnecessary re-renders
2. **Debounce drop indicator:** Update position at most 60fps
3. **Virtual scrolling:** For 600+ routines (future enhancement)
4. **Lazy loading:** Load routines in batches (future enhancement)

### Performance Targets
- Drag response time: <500ms (60 routines)
- Drop indicator update: 60fps
- Backend mutation: <1s (up to 20 routines)
- UI revert on error: <100ms

---

## Code Review Checklist

### Functionality
- [ ] Build passes (`npm run build`)
- [ ] Type check passes (`npm run type-check`)
- [ ] All acceptance criteria met
- [ ] Edge cases handled
- [ ] Error handling implemented

### Code Quality
- [ ] Console logs for debugging (remove before commit)
- [ ] TypeScript types defined properly
- [ ] No `any` types (use proper interfaces)
- [ ] Comments explain complex logic
- [ ] Follows existing code patterns

### Multi-Tenant Safety
- [ ] All backend mutations include tenant_id filter
- [ ] No cross-tenant data leakage
- [ ] Tested on both EMPWR and Glow tenants

### Performance
- [ ] No unnecessary re-renders
- [ ] Drag-and-drop feels responsive
- [ ] No memory leaks (clear event listeners)

---

## Definition of Done

- [ ] DragDropProvider.tsx created and working
- [ ] All acceptance criteria met
- [ ] Build passes, type check passes
- [ ] Tested on tester.compsync.net (manual via Playwright MCP)
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] Code review checklist complete
- [ ] Committed with 8-line format
- [ ] sprint-status.yaml updated (STORY_072 → complete)
- [ ] STORY_073 (Optimistic Hook) unblocked

---

**Last Updated:** November 25, 2025
**Next Step:** Begin implementation of DragDropProvider.tsx
**Estimated Time:** 2-3 hours
