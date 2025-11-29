# BLOCKER: Save Schedule HTTP 500 Error

**Status:** 🚨 ACTIVE BLOCKER
**Severity:** HIGH - Core Feature Broken
**Date Discovered:** 2025-11-29 (Session 75)
**Branch:** CompPortal-tester/tester
**Build:** 81447c1

---

## Issue Summary

The "Save Schedule" button returns HTTP 500 error and displays toast message "Failed to save some days". This blocks the ability to save schedule changes in the Phase 2 scheduler.

## Steps to Reproduce

1. Navigate to https://tester.compsync.net/dashboard/director-panel/schedule
2. Click on Thursday tab (loads 40 routines including break and award blocks)
3. Page immediately shows "● Unsaved changes" (even though nothing was changed)
4. Click "💾 Save Schedule" button
5. **Observe:** HTTP 500 error
6. **Observe:** Toast message "Failed to save some days"

## Expected Behavior

- If no changes were made, "Save Schedule" button should not appear
- If changes were made, clicking "Save Schedule" should:
  - Save schedule to database
  - Show success toast "Saved schedule for X day(s)"
  - Clear "unsaved changes" indicator
  - Not throw HTTP 500 error

## Actual Behavior

- "● Unsaved changes" appears immediately on page load (false positive)
- Clicking "Save Schedule" triggers HTTP 500 error
- Toast shows "Failed to save some days"
- Schedule is NOT saved to database

## Evidence

**Console Errors:**
```
[ERROR] Failed to load resource: the server responded with a status of 400 () @ https://tester.compsync.net/:0
[ERROR] Failed to load resource: the server responded with a status of 500 () @ https://tester.compsync.net/api/trpc/scheduling.schedule?batch=1:0
```

**Network Request:**
```
POST /api/trpc/scheduling.schedule?batch=1 => [500]
```

**Database State (Verified Working):**
```sql
-- Thursday (2026-04-09)
SELECT COUNT(*) FROM competition_entries
WHERE is_scheduled = true AND performance_date = '2026-04-09'
-- Result: 3 scheduled routines (database has correct data)
```

**UI State:**
- Thursday tab shows: "40 routines"
- Page shows: "● Unsaved changes"
- Button visible: "💾 Save Schedule"

---

## Technical Analysis

### Frontend Code Path

**1. User Clicks Save (page.tsx:1215)**
```typescript
onClick={handleSaveSchedule}
```

**2. handleSaveSchedule Function (page.tsx:938-1000)**
- Compares `draftsByDate` with server state
- Finds dates with "unsaved changes"
- Calls `scheduling.schedule` mutation for each date

**3. Mutation Input (page.tsx:982-986)**
```typescript
scheduleMutation.mutate({
  tenantId: TEST_TENANT_ID,
  competitionId: TEST_COMPETITION_ID,
  date,
  routines: dayDraft.map(r => ({
    routineId: r.id,
    entryNumber: r.entryNumber || 100,
    performanceTime: r.performanceTime || '08:00:00',
  })),
})
```

### Backend Mutation (scheduling.ts:271-344)

**Phase 1: Clear Entry Numbers (lines 298-308)**
```typescript
await tx.competition_entries.updateMany({
  where: {
    competition_id: input.competitionId,
    tenant_id: input.tenantId,
    performance_date: new Date(input.date),
  },
  data: {
    entry_number: null,
    is_scheduled: false,
  },
});
```

**Phase 2: Update Routines (lines 314-329)**
```typescript
for (const { routineId, entryNumber, performanceTime } of input.routines) {
  const updated = await tx.competition_entries.update({
    where: {
      id: routineId,
      tenant_id: input.tenantId, // CRITICAL: Must match
    },
    data: {
      performance_date: new Date(input.date),
      performance_time: timeStringToDateTime(performanceTime),
      entry_number: entryNumber,
      is_scheduled: true,
      updated_at: new Date(),
    },
  });
  finalUpdates.push(updated);
}
```

**FAILURE POINT:** If `routineId` doesn't exist in `competition_entries` table with matching `tenant_id`, the `update()` call throws an error and the entire transaction fails with HTTP 500.

---

## Root Cause Hypotheses

### Hypothesis 1: Schedule Blocks in Draft State (MOST LIKELY)

**Problem:**
- Thursday schedule view shows 40 items (routines + break block + award block)
- `draftsByDate[Thursday]` may include block IDs
- Schedule blocks are in `schedule_blocks` table, NOT `competition_entries`
- Mutation tries to update block IDs as routines → fails with "Record not found"

**Evidence:**
- Page snapshot shows break block with 09:05 AM time
- Page snapshot shows award block with 08:17 AM time
- These are `schedule_blocks`, not `competition_entries`

**Fix:** Filter blocks from `draftsByDate` initialization

### Hypothesis 2: Invalid Tenant ID

**Problem:**
- Some routine IDs may not belong to TEST tenant (00000000-0000-0000-0000-000000000003)
- Mutation requires matching `tenant_id` (line 318)
- Wrong tenant_id → "Record not found" → 500 error

**Evidence:** None yet (needs verification)

**Fix:** Verify all routine IDs belong to correct tenant

### Hypothesis 3: Renumbering Effect Creating Phantom Changes

**Problem:**
- Renumbering effect (page.tsx:597-636) runs whenever `draftsByDate` changes
- May renumber entries differently from database
- `hasAnyUnsavedChanges` detects differences → shows "unsaved changes"
- User clicks save with no actual changes → mutation input may be invalid

**Evidence:**
- "Unsaved changes" appears immediately on page load
- No user action was taken

**Fix:** Make renumbering idempotent, match database entry numbers

---

## Impact Assessment

**Who is Affected:**
- Competition Directors using Phase 2 scheduler
- Currently only on `tester` branch (not production)

**What is Broken:**
- Cannot save schedule changes
- Cannot persist draft schedules to database
- "Unsaved changes" indicator always shown (false positive)

**Workaround:**
- None - save functionality completely broken

**Severity Justification:**
- HIGH: Core feature (save schedule) is non-functional
- Blocks all Phase 2 scheduler testing
- Prevents production deployment of Phase 2

---

## Investigation Plan

### Step 1: Verify Draft State Contents
```javascript
// Add logging to page.tsx:982
console.log('[SAVE DEBUG] Draft state for date:', date);
console.log('[SAVE DEBUG] Draft routines:', dayDraft);
console.log('[SAVE DEBUG] Mutation input:', dayDraft.map(r => ({
  routineId: r.id,
  entryNumber: r.entryNumber || 100,
  performanceTime: r.performanceTime || '08:00:00',
})));
```

### Step 2: Check Backend Error Logs
- Use Vercel MCP to get runtime logs
- Identify exact error message
- Find which `routineId` is failing

### Step 3: Database Verification
```sql
-- Check if all routine IDs in draft exist in database
SELECT id, entry_number, title
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000003'
  AND competition_id = '1b786221-8f8e-413f-b532-06fa20a2ff63'
  AND performance_date = '2026-04-09'
ORDER BY entry_number;
```

### Step 4: Test Fix
- Implement fix based on findings
- Re-test save functionality
- Verify "unsaved changes" clears after save
- Test on all 4 days

---

## Proposed Fixes

### Fix Option A: Filter Blocks from Draft State

**Location:** page.tsx:562-595 (Draft initialization)

**Change:**
```typescript
const serverScheduled = routines
  .filter(r => r.isScheduled && r.scheduledDateString === date)
  // NEW: Ensure only routines, not blocks
  .filter(r => r.id && !r.id.startsWith('block-')) // Add validation
  .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0))
  .map(r => ({...}));
```

### Fix Option B: Validate Mutation Input

**Location:** page.tsx:982-986 (Mutation call)

**Change:**
```typescript
routines: dayDraft
  .filter(r => r.id && typeof r.id === 'string') // Validate ID
  .map(r => ({
    routineId: r.id,
    entryNumber: r.entryNumber || 100,
    performanceTime: r.performanceTime || '08:00:00',
  }))
```

### Fix Option C: Backend Error Handling

**Location:** scheduling.ts:314-329 (Update loop)

**Change:**
```typescript
for (const { routineId, entryNumber, performanceTime } of input.routines) {
  try {
    const updated = await tx.competition_entries.update({...});
    finalUpdates.push(updated);
  } catch (error) {
    // Log which routine ID failed
    console.error(`[SCHEDULE] Failed to update routine ${routineId}:`, error);
    throw new Error(`Failed to update routine ${routineId}: ${error.message}`);
  }
}
```

---

## Related Issues

**From Session 72:**
- ⏸️ Save schedule unclear (still shows "unsaved changes")
- This is the same issue - now confirmed as HTTP 500 error

**Related Sessions:**
- Session 72: Initial test cycle, save issue first reported
- Session 74: Break block fix (separate issue, now resolved)
- Session 75: Current investigation session

---

## Success Criteria

**Fix is complete when:**
1. ✅ "Save Schedule" button only appears when user makes actual changes
2. ✅ Clicking "Save Schedule" returns HTTP 200 (not 500)
3. ✅ Toast shows "Saved schedule for X day(s)" on success
4. ✅ "● Unsaved changes" indicator clears after successful save
5. ✅ Database contains saved schedule data
6. ✅ Page reload shows saved schedule (persistence verified)
7. ✅ No console errors during save operation

---

**Blocker Created:** 2025-11-29 (Session 75)
**Next Action:** Add debug logging and verify draft state contents
**Assigned To:** Session 75 investigation
