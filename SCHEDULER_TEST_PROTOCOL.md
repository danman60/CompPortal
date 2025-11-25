# Scheduler Continuous Test/Debug/Push Protocol

**Status:** ACTIVE - Continuous test loop until all pass
**Branch:** tester
**URL:** https://tester.compsync.net/dashboard/director-panel/schedule
**Last Updated:** 2025-11-25 (Session 56)

---

## Protocol Instructions

**When user says "continue":**
1. Check this file for current status
2. Find first failing test in Test Loop section
3. Fix the issue
4. Build + commit + push
5. Update status in this file
6. Report to user what was fixed
7. Wait for next "continue"

**DO NOT:**
- Ask clarifying questions unless absolutely blocked
- Wait for user approval to push
- Skip any test in the loop

**DO:**
- Fix → Build → Push → Report → Wait for "continue"
- Update this file after each fix
- Mark tests as ✅ when verified working

---

## Test Loop (Execute in Order)

### 1. ✅ Add Award and Break Blocks
**Status:** WORKING
**Last Test:** Session 56
**Actions:**
- Click "+Award" button
- Select routine to place after
- Click "Add Block"
- Repeat for "+Break" button

**Expected:**
- Award block appears with 🏆 icon
- Break block appears with ☕ icon
- Both visible in schedule

**Last Result:** ✅ PASS

---

### 2. ⏳ Drag/Drop to Move Blocks
**Status:** FIXED - Needs verification
**Last Fix:** Commit 311dd4e (stripped "block-" prefix)
**Actions:**
- Drag award block to new position
- Drag break block to new position
- Verify times recalculate (cascade)

**Expected:**
- Block moves to new position
- All subsequent blocks/routines recalculate times
- No console errors

**Last Result:** ❌ FAIL - "Dragged block not found" error
**Fix Applied:** Strip "block-" prefix before lookups (DragDropProvider.tsx:191-257)
**Next:** Verify on tester.compsync.net

---

### 3. ⏳ Save Schedule Successfully
**Status:** FIXED - Needs verification
**Last Fix:** Commit 30b6ed7 (clear ALL routines on date)
**Actions:**
- Add/drag multiple routines to schedule
- Click "Save Schedule" button
- Verify no errors

**Expected:**
- Save succeeds
- Green success toast
- No console errors

**Last Result:** ❌ FAIL - Unique constraint error
**Fix Applied:** Clear ALL routines on date (not just new routines) in scheduling.ts:295-307
**Root Cause:** Phase 1 only cleared entry_numbers for NEW routines, leaving old entry_numbers intact
**Next:** Verify on tester.compsync.net

---

### 4. ⏳ Export PDF Successfully
**Status:** NOT TESTED
**Actions:**
- Click "Export PDF" button
- Verify PDF downloads
- Open PDF and verify content

**Expected:**
- PDF downloads without errors
- Contains schedule with correct times
- Shows blocks (awards/breaks)

**Last Result:** NOT TESTED
**Next:** Test after Save Schedule fix

---

### 5. ⏳ Switch Days (Previous Day Routines Persist)
**Status:** NOT TESTED
**Actions:**
- Add routines to Friday
- Add blocks to Friday
- Switch to Saturday
- Verify Friday still has routines when switching back
- Add routines to Saturday
- Switch to Friday → verify Friday unchanged
- Switch to Saturday → verify Saturday unchanged

**Expected:**
- Friday routines/blocks persist
- Saturday routines/blocks persist
- No cross-contamination
- Draft state clears on day switch (as designed)

**Last Result:** NOT TESTED
**Known:** Day isolation fix in commit 158b7ee
**Next:** Verify working

---

### 6. ⏳ Add New Routines to Days with Blocks
**Status:** NOT TESTED
**Actions:**
- Day with existing blocks
- Drag new routine before block
- Drag new routine after block
- Verify times recalculate
- Verify blocks maintain position relative to time

**Expected:**
- New routines insert correctly
- Block times update if needed (cascade)
- No overlap or conflicts

**Last Result:** NOT TESTED
**Next:** Test after Save Schedule fix

---

### 7. ⏳ No Duplicates Across Days
**Status:** NOT TESTED
**Actions:**
- Add routine A to Friday
- Attempt to add routine A to Saturday
- Verify prevented OR allowed (clarify expected behavior)

**Expected:**
- Clarify: Should same routine be on multiple days? Or prevent?
- If prevented: Show error toast
- If allowed: Routine appears on both days

**Last Result:** NOT TESTED
**Question:** What is expected behavior? Same routine on multiple days allowed?
**Next:** Clarify with user, then test

---

### 8. ⏳ Remove Excel Export Button
**Status:** NOT DONE
**Actions:**
- Find Excel export button in schedule page
- Remove or hide it
- Keep PDF export button

**Expected:**
- Only PDF export button visible
- Excel export removed

**Last Result:** NOT DONE
**Next:** Find button location and remove

---

## Current Blockers

**None** - All blockers resolved.

**Previously Resolved:**
- ~~Save Schedule Unique Constraint~~ → Fixed in commit 30b6ed7 (needs verification)

---

## Recent Fixes

### Session 56 - Save Schedule Unique Constraint Fix (Commit 30b6ed7)
**Issue:** Unique constraint error on save schedule
**Root Cause:** Phase 1 only cleared entry_numbers for NEW routines, leaving old entry_numbers intact causing conflicts
**Fix:** Changed where clause to clear ALL routines on that competition+date (not just new routines)
**Files:** src/server/routers/scheduling.ts:295-307
**Status:** ✅ Committed and pushed
**Verification:** ⏳ Needs manual test on tester.compsync.net

### Session 56 - Block Drag ID Fix (Commit 311dd4e)
**Issue:** Dragged block not found error
**Root Cause:** Block IDs prefixed with "block-" in drag system, but database IDs don't have prefix
**Fix:** Strip "block-" prefix before lookups in DragDropProvider
**Files:** src/components/scheduling/DragDropProvider.tsx:191-257
**Status:** ✅ Committed and pushed
**Verification:** ⏳ Needs manual test on tester.compsync.net

---

## Test Results Summary

| Test | Status | Last Test | Result |
|------|--------|-----------|--------|
| 1. Add blocks | ✅ PASS | Session 56 | Working |
| 2. Drag blocks | ⏳ PENDING | Session 56 | Fixed, needs verify |
| 3. Save Schedule | ⏳ PENDING | Session 56 | Fixed, needs verify |
| 4. Export PDF | ⏳ NOT TESTED | - | - |
| 5. Switch days | ⏳ NOT TESTED | - | - |
| 6. Add routines with blocks | ⏳ NOT TESTED | - | - |
| 7. No duplicates | ⏳ NOT TESTED | - | Needs clarification |
| 8. Remove Excel button | ⏳ NOT DONE | - | - |

**Pass Rate:** 1/8 (12.5%)
**Next Focus:** Verify Test #2 and #3 on tester.compsync.net

---

## Quick Commands

### Build and Push
```bash
cd CompPortal-tester
npm run build
git add -A
git commit -m "fix: [description]"
git push
```

### Test URL
```
https://tester.compsync.net/dashboard/director-panel/schedule
```

### Login (CD)
- Email: `empwrdance@gmail.com`
- Password: `1CompSyncLogin!`

---

## Session Continuity

**For next session:**
1. Read this file FIRST
2. Check "Current Blockers" section
3. Fix blocker #1 (Save Schedule)
4. Move to next failing test
5. Repeat test loop until all ✅

**Status tracking:**
- ✅ = Test passing
- ❌ = Test failing (needs fix)
- ⏳ = Not tested yet
- 🚫 = Blocked by another test

**Current Priority:** Verify fixes on tester.compsync.net (Test #2, #3)

---

**Last Session:** 56 (2025-11-25)
**Next Action:** Verify Test #2 (drag blocks) and Test #3 (save schedule) on tester.compsync.net
**Latest Commits:** 311dd4e (block drag ID fix), 30b6ed7 (save schedule unique constraint fix)
