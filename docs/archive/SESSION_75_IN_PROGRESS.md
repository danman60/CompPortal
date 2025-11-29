# Session 75: Save Schedule Bug Investigation - IN PROGRESS

**Date:** November 29, 2025
**Branch:** CompPortal-tester/tester
**Build:** 81447c1 (documentation commit)
**Status:** 🚨 BLOCKER FOUND - Save Schedule HTTP 500 Error

---

## Session Objective

Continue from Session 74 (break block fix verified) to investigate the remaining item from Session 72: "Save Schedule" button showing "unsaved changes" and unclear save behavior.

---

## Investigation Progress

### Initial Discovery

**Test Environment:** tester.compsync.net/dashboard/director-panel/schedule

**Steps Executed:**
1. Navigated to schedule page (loaded successfully)
2. Database query confirmed:
   - Thursday (2026-04-09): 3 scheduled, 37 unscheduled (40 total)
   - Friday (2026-04-10): 3 scheduled, 0 unscheduled
   - Saturday (2026-04-11): 3 scheduled, 0 unscheduled
   - Sunday (2026-04-12): 3 scheduled, 0 unscheduled
3. **UI showed "0 routines" on all days** (data loading bug)
4. Clicked Thursday tab → 40 routines loaded successfully ✅
5. Page immediately showed "● Unsaved changes" indicator
6. Clicked "💾 Save Schedule" button
7. **HTTP 500 ERROR** - "Failed to save some days"

### Critical Findings

**1. Data Loading Works**
- Database contains scheduled routines correctly
- Clicking day tab triggers data load
- Break block fix verified working (shows 09:05 AM) ✅
- Award block fix verified working (shows 08:17 AM) ✅

**2. Save Mutation Fails with HTTP 500**
```
[ERROR] Failed to load resource: the server responded with a status of 500 ()
@ https://tester.compsync.net/api/trpc/scheduling.schedule?batch=1:0
```

**3. Frontend Code Analysis**

**handleSaveSchedule Function** (page.tsx:938-1000):
- Compares `draftsByDate` with server state (lines 944-965)
- Finds dates with changes
- Calls `scheduling.schedule` mutation for each date
- Sends: `{ tenantId, competitionId, date, routines: [...] }`

**Mutation Input** (lines 982-986):
```typescript
routines: dayDraft.map(r => ({
  routineId: r.id,
  entryNumber: r.entryNumber || 100,
  performanceTime: r.performanceTime || '08:00:00',
}))
```

**Backend Mutation** (scheduling.ts:271-344):
- Phase 1: Clears entry numbers for date (lines 298-308)
- Phase 2: Updates each routine sequentially (lines 314-329)
- Update requires: `id` + `tenant_id` match (lines 316-318)
- **CRITICAL:** If `routineId` doesn't exist in `competition_entries` → 500 error

### Root Cause Hypothesis

**Issue #1: Unsaved Changes Indicator**
The renumbering effect (page.tsx:597-636) renumbers all drafts globally whenever `draftsByDate` changes. This may cause:
- Entry numbers to differ from database
- `hasAnyUnsavedChanges` to return true
- Save button to appear even when no user changes made

**Issue #2: HTTP 500 Error**
Possible causes:
1. **Schedule blocks in draft state:** If `draftsByDate` includes break/award block IDs, mutation fails (blocks aren't in `competition_entries` table)
2. **Invalid routine IDs:** Draft state may contain IDs that don't exist or don't match tenant_id
3. **Data type mismatch:** `performanceTime` format incorrect
4. **Missing fields:** Draft state missing required fields

### Evidence

**Console Errors:**
```
[ERROR] Failed to load resource: the server responded with a status of 400 () @ https://tester.compsync.net/:0
[ERROR] Failed to load resource: the server responded with a status of 500 () @ https://tester.compsync.net/api/trpc/scheduling.schedule?batch=1:0
```

**Toast Message:**
```
Failed to save some days
```

**Database State (Verified):**
- Thursday has 40 total items in schedule view (routines + blocks)
- Database has only routines (no blocks in `competition_entries`)
- Break block and award block are in `schedule_blocks` table

---

## Remaining Work

### Immediate Investigation Needed

1. **Verify Draft State Contents**
   - Check if `draftsByDate[Thursday]` includes block IDs
   - Confirm it only contains routine IDs from `competition_entries`
   - Log the actual mutation input being sent

2. **Backend Error Details**
   - Check Vercel runtime logs for actual error message
   - Identify which routine ID is failing the update
   - Verify tenant_id matches for all routines

3. **Renumbering Effect Analysis**
   - Confirm renumbering is idempotent
   - Check if entry numbers match database
   - Verify no infinite loop

### Potential Fixes

**Option A: Filter Blocks from Draft State**
- Ensure `draftsByDate` only contains routines, not blocks
- Update draft initialization to exclude schedule_blocks

**Option B: Fix Save Mutation Input**
- Validate all `routineId` values before sending
- Filter out any invalid IDs
- Add error handling for failed updates

**Option C: Fix Renumbering Logic**
- Prevent unnecessary renumbering
- Only renumber when user actually changes order
- Match database entry numbers on initial load

---

## Files Analyzed

1. **src/app/dashboard/director-panel/schedule/page.tsx**
   - Lines 938-1000: `handleSaveSchedule` function
   - Lines 597-636: Renumbering effect
   - Lines 659-682: `hasAnyUnsavedChanges` check
   - Lines 562-595: Draft initialization from server

2. **src/server/routers/scheduling.ts**
   - Lines 271-344: `schedule` mutation
   - Lines 298-308: Clear entry numbers phase
   - Lines 314-329: Update routines phase

---

## Next Steps

1. Add console logging to capture mutation input
2. Check Vercel logs for backend error details
3. Verify draft state doesn't include block IDs
4. Fix identified issue
5. Re-test save functionality
6. Verify "unsaved changes" clears after successful save

---

## Session Status

**Status:** 🔴 BLOCKED - HTTP 500 error prevents save functionality
**Severity:** HIGH - Core feature broken
**Impact:** Cannot save schedule changes in Phase 2 scheduler

**Blocker File:** `BLOCKER_SAVE_SCHEDULE.md`

---

**Session Started:** November 29, 2025
**Current Status:** Investigating root cause of HTTP 500 error
