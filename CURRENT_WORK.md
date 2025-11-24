# Current Work - Phase 2 Scheduler Bug Fixes

**Date:** November 24, 2025
**Project:** CompPortal - Tester Branch (Phase 2 Scheduler)
**Branch:** tester
**Status:** ✅ Session Complete

---

## Session Summary

Fixed 4 critical bugs in Phase 2 scheduler:
1. Trophy helper breaking table layout
2. Reorder scheduling unique constraint error
3. Filter dropdown UX issues
4. Reset All not clearing draft state

**Commits:**
- `ac7a8b0` - Trophy helper UI removal
- `058c2eb` - Scheduling bugs (reorder, filters, reset)

**Build:** ✅ 89/89 pages, 45s compile

---

## Work Completed

### 1. Trophy Helper Removal ✅
**Commit:** ac7a8b0

**Problem:** Trophy helper UI (gold border, emoji, tooltip) was breaking table layout after 10+ attempts to fix.

**Solution:**
- Removed all visual indicators (border, background, emoji, footer counter)
- Preserved business logic (`lastRoutineIds` calculation)
- Ready for fresh implementation approach

**Files:**
- `src/components/scheduling/ScheduleTable.tsx`

### 2. Scheduling Reorder Bug ✅
**Commit:** 058c2eb

**Problem:**
```
Unique constraint failed on the fields:
(`competition_id`,`entry_number`,`COALESCE(entry_suffix`,`''::character varying)`)
```

**Root Cause:** `Promise.all()` executing parallel updates caused multiple routines to temporarily have same `entry_number`.

**Solution:** Sequential updates with `for` loop instead of parallel `Promise.all()`.

**Files:**
- `src/server/routers/scheduling.ts:311-326`

### 3. Filter Dropdown UX Fixes ✅
**Commit:** 058c2eb

**Problems:**
1. Dropdown positioning jumped to weird places
2. Selecting option didn't close dropdown
3. "Select All" persisted as toggle instead of one-shot

**Solutions:**
1. Changed from `position: fixed` (calculated coords) to `position: absolute top-full left-0`
2. Added `onToggleOpen()` call after option selection
3. Only show "Select All" when `selectedRoutineIds.size < routines.length`

**Files:**
- `src/components/scheduling/RoutinePool.tsx:614,635,255`

### 4. Reset All Draft State ✅
**Commit:** 058c2eb

**Problem:** "Reset All" and "Reset Day" only cleared database, not local draft state.

**Solution:** Added `setDraftSchedule([])` to both mutation success callbacks.

**Files:**
- `src/app/dashboard/director-panel/schedule/page.tsx:108,119`

---

## Next Steps

**Trophy Helper Redesign:**
- Business logic intact and ready
- Need to design new UI approach that doesn't break table layout
- Questions documented in planning notes

**Phase 2 Scheduler:**
- Continue development on tester branch
- Test fixes on production URL after deployment

---

## Technical Notes

**Unique Constraint Pattern:**
When updating fields with unique constraints in batch:
- ❌ Don't use `Promise.all()` (parallel)
- ✅ Use sequential `for` loop
- ✅ Or use two-phase update (clear first, then set)

**Draft State Pattern:**
When resetting schedules:
- ✅ Clear database AND local state
- ✅ Call `refetch()` after clearing draft
- ✅ Prevents stale UI after reset operations

---

**Last Updated:** November 24, 2025
