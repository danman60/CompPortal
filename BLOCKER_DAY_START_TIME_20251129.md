# BLOCKER: Day Start Time Change Not Working

**Date:** November 29, 2025
**Branch:** tester
**Build:** v1.1.2 (12664a2)
**Environment:** tester.compsync.net/dashboard/director-panel/schedule
**Status:** ❌ BLOCKING - Test Cycle Step 3 FAILED

---

## Issue Summary

**Day start time edit feature is completely broken** - changing a day's start time does NOT cascade routine times.

**Test Cycle Impact:** Mandatory test cycle (SCHEDULE_TEST_CYCLE.md) Step 3 FAILED. Cannot proceed with remaining tests until fixed.

---

## Reproduction Steps

1. Navigate to schedule page (Saturday, April 11)
2. Click pencil icon next to "08:00" on Saturday tab
3. Time editor opens with textbox showing "08:00"
4. Change time to "09:00" in textbox
5. Click save button (checkmark)

**Expected:**
- ✅ Toast: "Start time updated to 09:00 AM"
- ✅ Saturday tab shows "09:00"
- ✅ All routine times cascade from new start:
  - #115: 9:00 AM (was 8:00 AM)
  - #116: 9:02 AM (was 8:02 AM)
  - #117: 9:04 AM (was 8:04 AM)

**Actual:**
- ❌ NO toast appeared
- ❌ Saturday tab still shows "08:00"
- ❌ Routine times unchanged (8:00, 8:02, 8:04 AM)
- ⚠️ HTTP 400 error in console

---

## Evidence

**Screenshot:** `.playwright-mcp/step3-failed-time-not-cascaded.png`

**Console Output:**
```
[LOG] [DayTabs] Saving start time: {tenantId: 00000000-0000-0000-0000-000000000003, competitionId: 1b786221-8f8e-413f-b532-06fa20a2ff63, date: 2026-04-11, newStartTime: 09:00:00}
[ERROR] Failed to load resource: the server responded with a status of 400 ()
```

**Current State:**
- Saturday tab: "08:00" (unchanged)
- Routine #115: 8:00 AM (unchanged)
- Routine #116: 8:02 AM (unchanged)
- Routine #117: 8:04 AM (unchanged)

---

## Technical Analysis

**Mutation Called:** ✅ YES
- `[DayTabs] Saving start time` log confirms mutation executed
- Parameters correct: `date: 2026-04-11`, `newStartTime: 09:00:00`

**Mutation Failed:** ❌ YES
- HTTP 400 error indicates server rejected the request
- No success toast = mutation did not succeed
- UI state unchanged = no optimistic update or refetch

**Root Cause:** UNKNOWN - needs investigation
- Possible backend validation failure (HTTP 400)
- Possible missing/incorrect parameters
- Possible authorization issue
- Possible schema mismatch

---

## Impact Assessment

**Severity:** P0 (Critical Blocker)

**Blocks:**
- ✅ Step 3: Change day start time (FAILED)
- ⏸️ Step 4-13: Cannot proceed until Step 3 passes
- ⏸️ Full test cycle completion
- ⏸️ Phase 2 scheduler sign-off

**User Impact:**
- Competition Directors **CANNOT** change day start times
- Must manually recalculate all routine times
- Major usability regression
- Feature completely non-functional

---

## Investigation Needed

1. **Check backend tRPC procedure** (`scheduling.updateDayStartTime` or similar)
   - Verify procedure exists
   - Check parameter validation
   - Review authorization logic
   - Check for tenant_id filtering

2. **Check HTTP 400 response body**
   - What validation failed?
   - What error message returned?
   - Is this a Zod validation error?

3. **Check database schema**
   - Does `day_configs` table exist?
   - Does `start_time` column exist?
   - Are there any constraints blocking updates?

4. **Check frontend mutation**
   - Are parameters formatted correctly?
   - Is mutation name correct?
   - Is error handling working?

---

## Next Steps

**IMMEDIATE:**
1. ❌ DO NOT proceed with test cycle
2. ❌ DO NOT mark any tests as complete
3. ✅ Investigate HTTP 400 error cause
4. ✅ Fix backend validation or schema issue
5. ✅ Re-test Step 3 until passing
6. ✅ Re-run ENTIRE test cycle from Step 1 (per protocol)

**After Fix:**
1. Verify fix on tester.compsync.net
2. Capture screenshot of successful cascade
3. Verify toast message appears
4. Re-run full test cycle from Step 1
5. Only proceed to Step 4 after Step 3 passes

---

## Test Cycle Protocol

Per `SCHEDULE_TEST_CYCLE.md`:

> **If ANY item fails:**
> 1. Create `BLOCKER_SCHEDULE_TEST.md` with failure details ✅ DONE
> 2. Fix the issue ⏳ IN PROGRESS
> 3. Re-run ENTIRE test cycle from step 1 ⏳ PENDING
> 4. Do NOT mark work complete until 100% pass ✅ ENFORCED

---

**Session Status:** BLOCKED - Cannot continue testing
**Next Action:** Investigate HTTP 400 error and fix mutation
