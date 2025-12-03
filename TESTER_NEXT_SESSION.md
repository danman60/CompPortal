# Tester Branch - Next Session TODOs

**Date Created:** 2025-12-03
**Branch:** `tester`
**Priority:** Get tester tenant functioning like production for realistic testing

---

## Issue 1: Drag-Drop Block Positioning (Still Active)

**Problem:** Dragging schedule blocks UP by 1 space requires dragging 2 spaces

**Status:** Debug logging added (build 21237c3), console logs captured

**Console Output:**
```
[DragDropProvider] Inserting block before routine: Fire & Ice 204
[recalculateBlockTimes] Timeline BEFORE sort: (9) [{…}, {…}, ...]
[recalculateBlockTimes] Timeline AFTER sort: (9) [{…}, {…}, ...]
[DragDropProvider] Block inserted, cascading times
```

**Next Steps:**
1. Expand the console log arrays to see actual timestamps/ordering
2. Verify 1ms offset is working in sort (lines 330-348 in DragDropProvider.tsx)
3. Check if `recalculateBlockTimes` sequential time recalculation overwrites sort order
4. Fix root cause and remove debug logging

**File:** `CompPortal-tester/src/components/scheduling/DragDropProvider.tsx`
**Commit with logging:** 21237c3

---

## Issue 2: Studio Director Note Submission - 500 Error

**Problem:** "Routine not found or access denied" when Studio Director tries to save notes

**Root Cause:** Hardcoded TEST_STUDIO_ID mismatch across files

**Mismatches Found:**
- `/dashboard/schedules/[competitionId]/page.tsx` line 19: `TEST_STUDIO_ID = '2bc476db-62a0-49b3-a264-4bca9437f6a5'`
- `/dashboard/schedules/page.tsx` line 17: `TEST_STUDIO_ID = '00000000-0000-0000-0000-000000000002'`
- Backend checks `studio_id` must match routine ownership (scheduling.ts:3813-3818)

**Good News:** All backend procedures ARE implemented!
- ✅ `getAvailableSchedules` (line 3601)
- ✅ `getStudioSchedule` (line 3671)
- ✅ `submitStudioNote` (line 3804)

**Fixes Needed:**
1. **Quick Fix:** Sync TEST_STUDIO_IDs to same value across all files
2. **Proper Fix:** Populate tester tenant with realistic test data matching production structure

---

## Main Goal: Realistic Test Data Setup

**User Request:** "I want to get this tester tenant data functioning like the real data will for testing"

### Current State (Per TESTER_DATA_SETUP.md):
- ✅ Competition created (ID: `1b786221-8f8e-413f-b532-06fa20a2ff63`)
- ✅ Tenant exists (ID: `00000000-0000-0000-0000-000000000003`)
- ⏳ User accounts (manual step - not done)
- ⏳ Studios (need to create ~15 studios)
- ⏳ Dancers (~750 dancers across studios)
- ⏳ Routines (600 routines with proper studio linkage)
- ⏳ Reservations (all summarized)
- ⏳ Schedule entries (routines with scheduled times)

### Required for Studio Director Testing:
1. **Create Test Studio** with consistent ID used across all frontend files
2. **Create Routines** linked to that studio
3. **Create Schedule Entries** for those routines with:
   - `scheduled_day` set
   - `performance_time` set
   - `entry_number` set
   - `studio_id` matching test studio
4. **Create Schedule Version** that's published to studios
5. **Enable feedback** on competition (`schedule_feedback_allowed = true`)

### Recommended Approach:
1. Fix TEST_STUDIO_ID mismatch (5 min)
2. Query existing tester data to see what's already there
3. Create minimal test dataset:
   - 1 test studio (use ID from schedules page)
   - 10-15 routines linked to that studio
   - Schedule those routines on Saturday April 11
   - Publish schedule version
   - Enable feedback
4. Test end-to-end: Dashboard → Schedule View → Submit Note

---

## Files to Fix (Quick Fix):

**Option A - Use existing studio ID everywhere:**
```
File: src/app/dashboard/schedules/page.tsx (line 17)
Change: TEST_STUDIO_ID = '00000000-0000-0000-0000-000000000002'
To: TEST_STUDIO_ID = '2bc476db-62a0-49b3-a264-4bca9437f6a5'
```

**Option B - Check if studio exists in DB, then populate data for it**

---

## Success Criteria:
- [ ] Studio Director can view dashboard at `/dashboard/schedules`
- [ ] See test competition listed
- [ ] Click to view schedule at `/dashboard/schedules/[competitionId]`
- [ ] See studio's routines with scheduled times
- [ ] Click "Add Note" on a routine
- [ ] Submit note successfully (no 500 error)
- [ ] Note persists and shows on routine
- [ ] Drag schedule blocks UP works correctly (1 space = 1 space)

---

## Related Files:
- `TESTER_SETUP.md` - Original tester branch setup
- `TESTER_DATA_SETUP.md` - Data population plan
- `src/server/routers/scheduling.ts` - Backend procedures (lines 3601-3863)
- `src/components/scheduling/StudioNoteModal.tsx` - Note submission UI
- `src/components/scheduling/DragDropProvider.tsx` - Drag-drop logic

---

**Next Session Start:**
1. Check what data currently exists in tester tenant
2. Decide: Quick TEST_STUDIO_ID fix OR full test data population
3. Continue drag-drop debugging with expanded console logs
