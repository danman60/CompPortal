# ✅ RESOLVED: "500 Routines" Issue - NOT A RACE CONDITION

**Original Severity:** P0 CRITICAL
**Actual Severity:** P2 UX Enhancement
**Status:** ✅ NO BLOCKER - Safe to launch
**Investigation Date:** October 29, 2025 (Session 23)
**Investigation Time:** 45 minutes

---

## ⚠️ CRITICAL UPDATE: Investigation Complete

**Finding:** This is **NOT** a race condition or double-click bug. The studio typed "500" when creating the reservation (likely meant "5" but added extra zero). The system accepted this value because there is no frontend validation for reasonable maximums.

**Evidence:**
- Database shows TWO separate reservations, not one that got corrupted
- Reservation `077ef6f4` was created with `spaces_requested = 500` at 14:06:22
- It was approved for exactly 500 spaces at 19:43:14 (no multiplication)
- Capacity ledger shows only ONE deduction of -500 (not two)
- CapacityService has multiple layers of idempotency protection (working correctly)

**See:** `INVESTIGATION_REPORT_500_ROUTINES.md` for complete analysis

**Recommendation:** Downgrade to P2, add input validation (1 hour fix), continue with launch prep

---

## Original Issue Description (Incorrect Diagnosis)

**Double-clicking the "Approve" button on a reservation causes a 100x multiplication of the approved count.**

**Example:**
- Studio requests: 5 spaces
- CD clicks "Approve" button (slow response)
- CD clicks "Approve" again (thinking it didn't register)
- Result: 500 spaces approved (5 * 100 = 500)

**Affected:**
- Competition: EMPWR Dance - St. Catharines #1
- Studio: asd
- Tenant: EMPWR (00000000-0000-0000-0000-000000000001)

---

## Impact

**Business:**
- Corrupted reservation data (500 spaces vs 5 requested)
- Capacity calculations incorrect
- Cannot trust any reservation approvals
- Potential data integrity issues for invoicing

**User Experience:**
- CD loses confidence in system
- Manual data cleanup required
- System appears broken

**Launch Blocker:**
- ❌ CANNOT launch with this bug
- ❌ All approvals must be rolled back and re-tested
- ❌ May affect other mutations (reject, summary, invoice)

---

## Root Cause Analysis

**Suspected Issue:** Race condition in approval mutation

**Location:** `src/server/routers/reservation.ts` - approval mutation

**Likely Problem:**
1. No idempotency key to prevent duplicate operations
2. No optimistic locking on reservation record
3. Button not disabled during mutation
4. No request deduplication

**Related Issue:** Agent 3 added `invalidate()` for counter refresh, but didn't add debouncing or disable logic to prevent double-clicks.

---

## Reproduction Steps

1. Login as CD (empwrdance@gmail.com)
2. Navigate to `/dashboard/reservation-pipeline`
3. Find pending reservation with small count (e.g., 5)
4. Click "Approve" button
5. Click "Approve" button again quickly (before first request completes)
6. Observe: Approved count becomes 100x original (5 → 500)

---

## Investigation Required

**Check these files:**
1. `src/server/routers/reservation.ts` - approval mutation logic
2. `src/components/ReservationPipeline.tsx` - button click handler
3. Database: Check if multiple transactions ran or single transaction with bad math

**Questions:**
- Does mutation run twice (2 API calls)?
- Does mutation have idempotency protection?
- Is there a 100x multiplier in the code somewhere?
- Are there database triggers that could cause this?

**Check logs:**
- Vercel function logs for duplicate requests
- Database transaction logs
- Look for 2 approval operations with same reservation ID

---

## Temporary Workaround

**For CD users:**
1. Click approve button ONCE
2. Wait for page to refresh completely
3. Do NOT double-click or click multiple times
4. If approval shows wrong number, DO NOT use system until fixed

**For developers:**
1. Add console.log to track mutation calls
2. Check if mutation is being called twice
3. Check if there's a *100 operation in approval logic
4. Add button disable during mutation as immediate fix

---

## Fix Requirements

**Immediate (P0):**
1. Disable "Approve" button when clicked (add loading state)
2. Add idempotency key to prevent duplicate approvals
3. Add optimistic locking (check reservation version/timestamp)
4. Test with rapid clicking (spam test)

**Follow-up (P1):**
5. Add mutation debouncing (500ms)
6. Add confirmation dialog for large approvals
7. Add undo/rollback capability
8. Audit all other mutations for same issue

---

## Testing Checklist

Before marking as fixed:
- [ ] Rapid click approve 10 times → Should only approve once
- [ ] Double-click approve → Should only approve once
- [ ] Check database for duplicate transactions
- [ ] Verify counter updates correctly after single approval
- [ ] Test on both EMPWR and Glow tenants
- [ ] Check reject, summary, invoice buttons for same issue

---

## Related Issues

**Also reported in same session:**
- Counter doesn't auto-update quickly (needs manual refresh)
- This may be masking the race condition severity

**Anti-pattern violation:**
- See `ANTI_PATTERNS.md` - Missing idempotency keys
- See `DEBUGGING.md` - Double-operation investigation protocol

---

## Data Cleanup Required

**Corrupted reservation:**
- ID: [Need to query]
- Studio: asd
- Competition: EMPWR Dance - St. Catharines #1
- Requested: 5
- Approved: 500 (INCORRECT)
- Should be: 5

**SQL to fix:**
```sql
-- Find the corrupted reservation
SELECT id, studio_id, competition_id, spaces_requested, spaces_confirmed
FROM reservations
WHERE studio_id IN (SELECT id FROM studios WHERE name = 'asd')
  AND competition_id IN (SELECT id FROM competitions WHERE name LIKE '%St. Catharines #1%')
  AND spaces_confirmed = 500;

-- Fix the approved count (update to requested amount)
UPDATE reservations
SET spaces_confirmed = spaces_requested
WHERE id = '[RESERVATION_ID]'
  AND spaces_confirmed = 500
  AND spaces_requested = 5;
```

---

**Status:** 🔴 DO NOT APPROVE ANY RESERVATIONS UNTIL FIXED

**Next Steps:**
1. Investigate approval mutation code
2. Add button disable as immediate hotfix
3. Add idempotency protection
4. Clean up corrupted data
5. Re-test approval flow
6. Deploy fix and verify

**Blocker Created:** October 29, 2025
**Assigned:** Development team
**Priority:** P0 - Cannot launch without fix
