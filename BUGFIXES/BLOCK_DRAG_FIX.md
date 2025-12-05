# Schedule V2 Block DRAG Fix - Claude Code Handoff

**Date:** December 5, 2025 (UPDATED)
**File:** `D:\ClaudeCode\CompPortal-tester\src\app\dashboard\director-panel\schedule-v2\page.tsx`
**Branch:** tester

---

## Status

- ✅ **CLICK to create blocks** - FIXED (works)
- ❌ **DRAG to create blocks** - STILL BROKEN (this handoff)

---

## Problem Summary

Dragging Award/Break block buttons onto the schedule shows success toast but block doesn't appear. Click-to-create works fine now.

---

## Root Cause (VERIFIED from current code ~line 920-960)

The drag handler adds to `tempBlocks` with the WRONG key format.

**Current code does:**
```typescript
const tempBlockId = `block-temp-${Date.now()}`;

setTempBlocks(prev => {
  const next = new Map(prev);
  next.set(tempBlockId, {  // ← Key is "block-temp-1234567890"
    id: tempBlockId,
    ...
  });
  return next;
});
```

**But the lookup code (line ~445) does:**
```typescript
const actualId = isBlock ? id.replace('block-', '') : id;  // ← Strips to "temp-1234567890"
const block = isBlock ? blocksMap.get(actualId) : undefined;  // ← Looks for "temp-1234567890"
```

**The mismatch:** `tempBlocks` stores with key `block-temp-X`, but lookup expects `temp-X`.

---

## COMPLETE FIX

### Find the template block handler in handleDragEnd (~line 920)

Search for: `if (activeId.startsWith('template-'))`

### Replace the ENTIRE Case 0 block with this code:

```typescript
// Case 0: Handle template block drops
if (activeId.startsWith('template-')) {
  const blockType = activeId.replace('template-', '') as 'award' | 'break';
  const timestamp = Date.now();
  
  // CRITICAL: Two different ID formats needed
  const tempMapKey = `temp-${timestamp}`;           // Key for tempBlocks Map (what lookup expects)
  const scheduleArrayId = `block-temp-${timestamp}`; // ID for scheduleByDate array
  
  // Create temp block data
  const tempBlockData: BlockData = {
    id: tempMapKey,  // Use the Map key format
    block_type: blockType,
    title: blockType === 'award' ? '🏆 Award Ceremony' : '☕ Break',
    duration_minutes: blockType === 'award' ? 30 : 15,
  };

  // Check if dropping on schedule area or any item in schedule
  const isDropOnScheduleZone = overId === 'schedule-drop-zone';
  const isDropOnScheduleItem = scheduleOrder.includes(overId);

  if (isDropOnScheduleZone || isDropOnScheduleItem) {
    // CRITICAL: Add block data to tempBlocks FIRST (so blocksMap has it when rendering)
    setTempBlocks(prev => {
      const next = new Map(prev);
      next.set(tempMapKey, tempBlockData);  // Key WITHOUT 'block-' prefix
      return next;
    });

    if (isDropOnScheduleZone) {
      // Drop at end of schedule
      setScheduleByDate(prev => ({
        ...prev,
        [selectedDate]: [...(prev[selectedDate] || []), scheduleArrayId],
      }));
    } else {
      // Drop at specific position (before the item we're hovering over)
      const overIndex = scheduleOrder.indexOf(overId);
      setScheduleByDate(prev => {
        const newOrder = [...(prev[selectedDate] || [])];
        if (overIndex >= 0) {
          newOrder.splice(overIndex, 0, scheduleArrayId);
        } else {
          newOrder.push(scheduleArrayId);
        }
        return { ...prev, [selectedDate]: newOrder };
      });
    }

    toast.success(`${blockType === 'award' ? '🏆 Award' : '☕ Break'} block added - click to edit`);
  }
  return;
}
```

---

## Why This Fix Works

The key insight is the ID mapping between different parts of the system:

| Location | ID Format | Example |
|----------|-----------|---------|
| `scheduleByDate` array | `block-temp-{ts}` | `block-temp-1733425200000` |
| `tempBlocks` Map key | `temp-{ts}` | `temp-1733425200000` |
| After `id.replace('block-', '')` | `temp-{ts}` | `temp-1733425200000` |

The render code strips 'block-' prefix before looking up in blocksMap:
```typescript
const actualId = id.replace('block-', '');  // "block-temp-123" → "temp-123"
const block = blocksMap.get(actualId);       // Looks for "temp-123"
```

So `tempBlocks` Map must use `temp-123` as the key (not `block-temp-123`).

---

## Verification Steps

1. Open Schedule V2 on tester
2. Drag 🏆 +Award button onto empty schedule drop zone
3. **Should see:** Gold/amber row with "🏆 Award Ceremony" and 30 min duration
4. Drag ☕ +Break button onto a specific position between routines  
5. **Should see:** Cyan row with "☕ Break" and 15 min duration at that position
6. Click Edit on the temp block - should open modal
7. Change title/duration, save
8. Block should persist with new values

---

## Files

- `src/app/dashboard/director-panel/schedule-v2/page.tsx` - line ~920-960

---

## Priority

**P0 - Critical** - Drag-to-create is primary workflow for CDs
