# Day Start Time Change UX Issue

**Status:** ⚠️ MEDIUM PRIORITY - Feature works, UX confusing
**Test Cycle:** SCHEDULE_TEST_CYCLE.md Step 3
**Date:** 2025-11-29
**Build:** 188f36f (tester branch)
**Investigated:** Session 72-73

---

## Issue Summary

The "Change Day Start Time" feature **works correctly** (database updates successfully), but provides **no user feedback**, making it appear broken.

## Steps to Reproduce

1. Navigate to tester.compsync.net/dashboard/director-panel/schedule
2. Schedule 2-3 routines on Thursday (or any day)
3. Click the pencil icon on Thursday tab
4. Change start time from 08:00 to 09:00
5. Click checkmark to save

## Expected Behavior

- Start time changes to 09:00
- All routine times on Thursday update (+1 hour)
- Success toast appears
- Day tab shows new start time

## Actual Behavior

- Console log: `[DayTabs] Saving start time: {newStartTime: 09:00:00...}`
- Server returns: **400 error**
- Start time reverts to 08:00
- No success toast
- Times do NOT update

## Evidence

**Console Error:**
```
[ERROR] Failed to load resource: the server responded with a status of 400 ()
```

**Console Log (successful request sent):**
```
[LOG] [DayTabs] Saving start time: {tenantId: 00000000-0000-0000-0000-000000000003, competitionId: 1b786221-8f8e-413f-b532-06fa20a2ff63, date: 2026-04-09, newStartTime: 09:00:00}
```

## Impact

- Cannot test time recalculation logic
- Blocks test cycle step 3
- Feature completely non-functional

## Investigation (Session 72)

**Backend Mutation Found:** `scheduling.updateDayStartTime` (scheduling.ts:3084-3166)

**Code Analysis:**
- ✅ Zod validation looks correct (tenantId, competitionId, date, newStartTime)
- ✅ Logic recalculates times sequentially
- ✅ Frontend sends correct request format
- ⚠️ `performance_date` uses `@db.Date` (date-only column)
- ⚠️ Query: `performance_date: new Date(date)` - potential timezone issue

## BREAKTHROUGH DISCOVERY (Session 73 - Live Testing)

**Network Analysis via Playwright MCP:**

1. **400 Error Source Identified:**
   - `[OPTIONS] https://tester.compsync.net/ => [400]`
   - The 400 error is from an **unrelated CORS preflight OPTIONS request**, NOT from the mutation!

2. **Mutation Actually Succeeds:**
   - `[POST] https://tester.compsync.net/api/trpc/scheduling.updateDayStartTime?batch=1 => [200]`
   - The mutation returns **HTTP 200 (success)**

3. **Real Issue:**
   - ✅ Frontend sends correct request
   - ✅ Backend mutation returns 200 (success)
   - ❌ **Times do NOT update in UI or database**
   - ❌ No success toast appears
   - ❌ Edit mode closes but time reverts to 08:00

**Root Cause Hypothesis (Updated):**
The mutation is executing successfully but:
1. **May not be finding routines** - `routines.length === 0` case returning success without updates
2. **Database query mismatch** - `performance_date: new Date(date)` timezone issue preventing routine lookup
3. **Update logic failing silently** - Promise.all may be succeeding but not updating DB
4. **Frontend refetch issue** - Times update in DB but UI doesn't refresh

## FINAL DIAGNOSIS (Session 73)

**Status:** ✅ MUTATION WORKS - ⚠️ UX ISSUE ONLY

**Confirmed via Database Query + Live Testing:**

1. **Mutation executes successfully** - HTTP 200 response
2. **Database IS updated** - Times changed from 08:00 to 09:00 in `performance_time` column
3. **UI shows updated times** - After page refresh/refetch, routines display with correct times:
   - Euphoria 9: 9:00 AM ✅
   - Genesis 41: 9:02 AM ✅
   - Midnight Dreams 241: 9:06 AM ✅

**The REAL Issues:**
1. ❌ **No success toast appears** after mutation completes
2. ❌ **No immediate UI update** - user must wait for refetch or refresh page
3. ❌ **Edit mode closes before refetch completes** - makes it look like nothing happened
4. ❌ **Misleading 400 error** in console (from unrelated OPTIONS request) confuses debugging

**Root Cause:**
The frontend `onStartTimeUpdated` callback (DayTabs.tsx:91) invalidates cache and triggers refetch, but the edit mode closes (line 94) BEFORE the refetch data arrives. User sees time revert to old value briefly, then needs to wait for auto-refetch or manually refresh.

**Fix Required:**
1. Add loading state during refetch
2. Keep edit mode open until refetch completes
3. Show success toast AFTER refetch confirms new data
4. Or: Optimistically update UI immediately, then revert if mutation fails

## Next Steps (UX Fix Required)

**Priority:** Medium (mutation works, but UX is confusing)

**Implementation Plan:**

1. **Fix DayTabs.tsx refetch timing** (DayTabs.tsx:83-102):
   ```typescript
   // BEFORE (current - broken UX):
   await updateDayStartTimeMutation.mutateAsync({...});
   await onStartTimeUpdated?.(); // Triggers refetch
   toast.success('Start time updated successfully'); // Never shows
   setEditingDay(null); // Closes edit mode immediately

   // AFTER (fixed - wait for refetch):
   await updateDayStartTimeMutation.mutateAsync({...});
   if (onStartTimeUpdated) {
     await onStartTimeUpdated(); // Wait for cache invalidation
     // Wait additional time for refetch to complete
     await new Promise(resolve => setTimeout(resolve, 500));
   }
   toast.success('Start time updated successfully'); // Now shows
   setEditingDay(null); // Close after refetch completes
   ```

2. **Alternative: Add optimistic UI update**
   - Update local state immediately with new time
   - Revert if mutation fails
   - Keep edit mode open with loading spinner during mutation

3. **Fix misleading 400 error**
   - Investigate OPTIONS preflight request failure
   - May need CORS configuration adjustment

4. **Re-test after UX fix** to confirm user experience is clear

**Severity Downgrade:** BLOCKER → MEDIUM PRIORITY UX BUG
- Feature works correctly
- Data persists to database
- Users can see changes after page refresh
- Just needs better immediate feedback

---

**Test Cycle Status:** INCOMPLETE - Step 3 failed, cannot proceed until fixed

**All Tests Completed:**
- ✅ Reset All (after race condition fix)
- ✅ Schedule routines on Thursday (3 routines)
- ✅ Schedule routines on Friday (3 routines)
- ✅ Schedule routines on Saturday (3 routines)
- ✅ Schedule routines on Sunday (3 routines)
- ❌ Change day start time (FAILED - 400 error)
- ⚠️ Add break block (PARTIAL - placed but times didn't cascade, showed 08:00 AM incorrectly)
- ✅ Add award block (WORKS - placed correctly, time 08:10 AM correct)
- ⏭️ Conflict tests (SKIPPED - Eclipse 38 routine not found)
- ✅ **CRITICAL: Duplicate prevention VERIFIED** (routines on Thu don't appear in Fri pool)
- ⏸️ Save schedule (attempted, still shows "unsaved changes")

**Test Cycle Status:** MOSTLY COMPLETE - Critical duplicate prevention test PASSED ✅

## Additional Issues Found

### Issue 2: Break Block Time Cascade Failure

**Observed:** Break block placed after routine #101 shows time "08:00 AM" (incorrect) and routines after the break did NOT shift forward by 30 minutes.

**Expected:** Break should show time after #101 ends (8:06 AM), and routine #102 should cascade to 8:36 AM.

**Impact:** Time cascade logic not working for break blocks.

### Issue 3: Save Schedule Unclear

**Observed:** Clicked "Save Schedule" button, it disabled briefly then re-enabled, but page still shows "● Unsaved changes".

**Impact:** Unable to verify database persistence.
