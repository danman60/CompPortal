# BLOCKER: Schedule Save & Discard Failures - Session 77

**Date:** November 29, 2025
**Branch:** tester
**Build:** 9c85710 (v1.1.2) - BLOCKERS FOUND
**Environment:** tester.compsync.net/dashboard/director-panel/schedule
**Status:** ✅ RESOLVED (Build ce7e72a)

---

## 🎉 RESOLUTION SUMMARY

**Resolved:** November 29, 2025
**Final Build:** ce7e72a
**All P0 Blockers:** FIXED and VERIFIED

### Root Cause

**Auto-renumbering `useEffect`** at lines 596-637 in `schedule/page.tsx`:
- Loaded routines with non-sequential entry numbers from database (100, 101, 102, 107, 108, 109...)
- Immediately renumbered them sequentially (100, 101, 102, 103, 104, 105...)
- Created draft state that differed from database state
- Triggered false "unsaved changes" detection
- Caused HTTP 500 when trying to save conflicting renumbered values

### Fixes Applied

**Commit deee47a:** Filter blocks before saving
- Added `isBlock?: boolean` property to RoutineData interface
- Modified save/comparison logic to exclude blocks
- **Result:** Partial fix, HTTP 500 still occurred

**Commit d7c793e:** Fix discard functionality
- Modified `handleDiscardChanges` to clear all drafts and refetch from server
- **Result:** Discard now working correctly

**Commit ce7e72a:** Remove auto-renumbering (ROOT CAUSE FIX)
- Removed auto-renumbering `useEffect` entirely (40 lines deleted)
- Entry numbers now preserved from database
- **Result:** All three blockers resolved

### Verification Results

✅ **Page loads cleanly** - No false "unsaved changes" on clean load
✅ **Save functionality working** - HTTP 200 success, "Saved schedule for 1 day" toast
✅ **Discard functionality working** - Changes revert correctly
✅ **Entry numbers preserved** - No automatic renumbering

**Evidence:**
- Build ce7e72a deployed and tested on tester.compsync.net
- Saved routine "Genesis 41" to Saturday successfully (entry #122)
- Page refresh confirmed clean state with no false indicators

---

## Original Issue Report (Below)

## Critical Issues Found

### 1. ❌ Save Schedule HTTP 500 Error (P0)

**Steps to Reproduce:**
1. Navigate to schedule page (Saturday, April 11)
2. Add break block after routine #109 (30 min break)
3. Break displays with correct dynamic time: 08:28 AM ✅ (Session 74 fix working)
4. Click "Save Schedule"

**Expected:** HTTP 200, "Saved schedule for X day(s)" toast
**Actual:** HTTP 500 error, "Failed to save some days" toast

**Console Error:**
```
[ERROR] Failed to load resource: the server responded with a status of 500 ()
@ https://tester.compsync.net/api/trpc/scheduling.schedule?batch=1:0
```

**Evidence:** `.playwright-mcp/.playwright-mcp/save-schedule-500-error.png`

---

### 2. ❌ Discard Changes Not Working (P0)

**Steps to Reproduce:**
1. After save failure above, click "❌ Discard" button
2. Toast shows "Changes discarded"
3. Check page state

**Expected:**
- "● Unsaved changes" indicator removed
- "💾 Save Schedule" button removed
- Break block removed from table
- Page returns to clean state

**Actual:**
- Toast shows "Changes discarded" ✅
- "● Unsaved changes" indicator STILL visible ❌
- "💾 Save Schedule" button STILL visible ❌
- Break block STILL in table (08:28 AM) ❌
- NO change to page state

**Evidence:** `.playwright-mcp/.playwright-mcp/after-discard-state.png`

**Impact:** Users cannot revert changes. Once a change is made, it's stuck in draft state permanently.

---

### 3. ⚠️ False "Unsaved Changes" Indicator on Tab Switch (P1)

**Steps to Reproduce:**
1. Load schedule page
2. Click Friday tab (3 routines scheduled in database)
3. Friday loads correctly
4. Immediately see "● Unsaved changes" and "💾 Save Schedule" button

**Expected:** Clean state with no unsaved changes indicator
**Actual:** False positive "unsaved changes" appears

**Note:** This is the same bug reported in Session 75. May not have been fully resolved.

---

### 4. ⚠️ HTTP 400 Error on Friday Load (P2)

**Console Error:**
```
[ERROR] Failed to load resource: the server responded with a status of 400 ()
@ https://tester.compsync.net/:0
```

**Impact:** Unknown - doesn't appear to block functionality but indicates backend issue

---

## Test Summary

**Tested Features:**

✅ **WORKING:**
- Page loads without crashing
- Day tabs navigation
- Routine display with trophy badges (Session 76 fix verified)
- Time cascade calculations
- Multiple badges on same routine (🏆 + 📋)
- Table layout (no column collapse)
- **Break block dynamic time calculation (Session 74 fix verified)**
  - Break after routine #109 (8:25 AM + 3m) shows 08:28 AM ✅

❌ **BROKEN:**
- Save Schedule functionality (HTTP 500)
- Discard Changes functionality (no effect)
- False "unsaved changes" on clean state

---

## Previous Session Context

**Session 75 (Nov 29, 2025):**
- Fixed: "Save Schedule HTTP 500" by using `is_scheduled` column instead of `performance_date`
- Commit: b665527
- **Status:** Regression - Same error is back OR different root cause

**Session 74 (Nov 29, 2025):**
- Fixed: Break block dynamic time calculation
- Commit: 7a637f1
- **Status:** ✅ VERIFIED WORKING - Break shows 08:28 AM correctly

**Session 76 (Nov 29, 2025):**
- Investigated: Trophy helper table layout
- **Status:** ✅ VERIFIED WORKING - 7 routines with trophy badges, layout intact

---

## Investigation Needed

### For Save Schedule HTTP 500:

1. Check if Session 75 fix (b665527) is present in current build (9c85710)
2. Investigate if break blocks cause different validation path than routines
3. Check backend logs for specific error message
4. Verify database schema for schedule blocks table

### For Discard Changes:

1. Check if discard mutation is executing
2. Verify frontend state management (React state vs. draft state)
3. Check if discard is clearing both local state AND server state
4. Possible race condition between discard and state refresh

### For False Unsaved Changes:

1. Check if Session 75 fix addressed root cause or just symptoms
2. Investigate state comparison logic (database vs. draft)
3. Verify if certain data transformations cause state mismatch

---

## Recommended Actions

**Immediate (P0):**
1. ❌ DO NOT DEPLOY to production - core save/discard broken
2. Investigate save HTTP 500 error (backend logs)
3. Fix discard functionality - critical for user workflows

**High Priority (P1):**
4. Investigate false "unsaved changes" regression
5. Add comprehensive save/discard integration tests

**Medium Priority (P2):**
6. Investigate HTTP 400 error source

---

## Test Evidence Files

1. `friday-schedule-3-routines.png` - Friday with 3 routines, trophy badges visible
2. `saturday-schedule-7-routines.png` - Saturday with 7 routines, all with trophies
3. `saturday-with-break-block.png` - Break block showing dynamic time 08:28 AM (Session 74 fix working)
4. `save-schedule-500-error.png` - HTTP 500 error on save
5. `after-discard-state.png` - Discard not working, changes still visible

---

## Database State

**Scheduled Routines:**
- Friday (2026-04-10): 3 routines (is_scheduled=true)
- Saturday (2026-04-11): 7 routines (is_scheduled=true)
- Sunday (2026-04-12): 1 routine (is_scheduled=true)
- **Total:** 11 routines scheduled, 39 unscheduled

**Note:** Database state is clean - issues are in UI/backend save logic, not data corruption.

---

**Session Status:** INCOMPLETE - Critical blockers prevent clean runs
**Next Steps:** Create fix for save/discard functionality before continuing tests
