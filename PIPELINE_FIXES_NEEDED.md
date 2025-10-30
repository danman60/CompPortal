# Reservation Pipeline Fixes Needed

**Date:** October 30, 2025
**Page:** https://empwr.compsync.net/dashboard/reservation-pipeline
**Status:** Page currently broken (500 error in production)
**Priority:** P1

---

## Issues Reported by User

### 1. Capacity Counter Doesn't Auto-Update
**Problem:** When approving/rejecting reservations, the capacity numbers at the top don't update without a manual page refresh.

**Expected:** Counter should update immediately after action (approve/reject/invoice)

**File:** `src/components/ReservationPipeline.tsx`

**Fix Required:** Replace `invalidate()` with direct `refetch()` calls in mutation success handlers.

**Lines to fix:**
- Line 54-106: Mutation handlers (approve, reject, createInvoice, markAsPaid)
- Need to add `await refetch()` or `await Promise.all([refetch(), refetchCompetitions()])`

---

### 2. Last Action Date Column Not Populated
**Problem:** The "Last Action" column in the table shows dates but they're not populating correctly.

**Expected:** Show the date of the most recent action on each reservation

**File:** `src/components/ReservationPipeline.tsx`

**Fix Required:**
- Line ~549: Fix date formatting for Last Action column
- Simplify date formatting (remove try/catch wrapper if present)
- Ensure date field is being passed correctly from backend

---

### 3. Amount Column Still Exists
**Problem:** There's an "Amount" column in the table that should be removed.

**Expected:** Remove totalAmount column entirely from table

**File:** `src/components/ReservationPipeline.tsx`

**Fix Required:**
- Line ~424: Remove Amount column header from table
- Line ~541-552: Remove Amount cell from table row
- Update `colSpan` from 9 to 8 for loading/empty states

---

## Current State

**Commit 0da6b42** has a commit message claiming these fixes, but:
- ❌ The commit does NOT contain ReservationPipeline.tsx changes
- ❌ The commit only contains DancerForm.tsx and PDF settings JSON
- ❌ The fixes described in the commit message were NEVER actually committed
- ❌ Page is currently broken with 500 error in production

---

## Investigation Notes

**Checked commits:**
- Commit `50a289c` (date bug fix) - Contains ReservationPipeline with refetch changes
- Commit `0da6b42` (claims pipeline fixes) - Does NOT contain ReservationPipeline changes at all

**Git confusion:** The dual agent session resulted in mixed-up commit messages. One agent worked on pipeline, another on dancer form, and they got their commits crossed.

**Current file state:** The ReservationPipeline.tsx in the working directory (checked lines 54-106) DOES have refetch calls, but production is broken with 500 error, suggesting either:
1. The deployed version is different
2. There's a runtime error in the code
3. The changes aren't actually there despite appearing in local file

---

## Action Plan for Next Session

### Step 1: Fix Production 500 Error FIRST
1. Check Vercel runtime logs to see what's causing the 500
2. Fix the immediate error blocking the page
3. Verify page loads before making other changes

### Step 2: Verify Current State
1. Use Playwright to navigate to pipeline page once it's working
2. Document EXACTLY what's wrong:
   - Does counter update? (try approving a reservation)
   - Are Last Action dates showing? (screenshot the column)
   - Is Amount column there? (screenshot the table)

### Step 3: Implement Fixes
1. Fix counter auto-update (refetch on mutations)
2. Fix Last Action date population
3. Remove Amount column
4. Update colSpan for consistency

### Step 4: Test & Verify
1. Test approve action → counter updates immediately
2. Test reject action → counter updates immediately
3. Check Last Action column shows dates
4. Confirm Amount column is gone
5. Test on both EMPWR and Glow tenants

---

## Reference Code

**Expected mutation handler pattern:**
```typescript
const approveMutation = trpc.reservation.approve.useMutation({
  onSuccess: async () => {
    toast.success('Reservation approved!');
    closeApprovalModal(); // Close BEFORE refetch
    // Refetch immediately to update counters and table
    await Promise.all([
      refetch(),
      refetchCompetitions(),
    ]);
  },
  onError: (error) => {
    toast.error(`Error: ${error.message}`);
  },
});
```

**Pattern to use for ALL mutations:**
- approveMutation
- rejectMutation
- createInvoiceMutation
- markAsPaidMutation

---

## Files to Check/Modify

- `src/components/ReservationPipeline.tsx` - Main file with all fixes
- Check backend: `src/server/routers/reservation.ts` - Verify Last Action date field exists

---

## Questions to Answer

1. **Why is production showing 500 error?** Check Vercel logs
2. **Are refetch changes actually deployed?** Verify by inspecting network tab
3. **Does backend return Last Action dates?** Check API response
4. **What's the correct column count?** Verify table structure

---

**DO NOT START AUTOMATICALLY** - User wants to review before proceeding.
