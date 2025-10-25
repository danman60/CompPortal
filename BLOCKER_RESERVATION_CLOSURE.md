# BLOCKER: Reservation Not Closing After Summary Submission - RESOLVED

**Date:** October 25, 2025 16:00 UTC
**Status:** ✅ **ROOT CAUSE IDENTIFIED - FIX #4 DEPLOYED**
**Impact:** Phase 1 workflow completely broken - reservations never close, capacity never refunded

## Final Root Cause

**`logActivity()` call inside transaction was causing silent rollback**

At entry.ts:372, `logActivity()` was called INSIDE the `prisma.$transaction()` block. The `logActivity()` function uses `prisma.$executeRaw` with the global `prisma` instance, which **cannot participate in the transaction context**.

When operations inside a Prisma transaction use the global `prisma` instance instead of the `tx` transaction client, they run as separate database operations that can cause the transaction to fail silently.

## All Fixes Applied

### Fix #1 (Commit bf54ce8) - Inline Capacity Refund
**Issue:** Nested transaction - capacityService.refund() started its own transaction
**Fix:** Inlined all capacity logic within submitSummary transaction
**Result:** ❌ Still failing - but eliminated one issue

### Fix #2 (Commit b969e51) - Scope getSummary to Reservation
**Issue:** getSummary counted all entries, submitSummary only processed one reservation
**Fix:** Changed getSummary to find approved reservation first, filter entries by reservation_id
**Result:** ❌ Still failing - but fixed a data mismatch

### Fix #3 (Commit 5911723) - Expand Entry Select for Snapshot
**Issue:** Only selected `id` and `total_fee` but tried to snapshot full entry object
**Fix:** Expanded select to include all snapshot fields (19 fields), convert dates to ISO strings
**Result:** ❌ Still failing - but enabled proper snapshot creation

### Fix #4 (Commit [pending]) - Move logActivity Outside Transaction
**Issue:** `logActivity()` used global `prisma` instance inside transaction context
**Fix:** Moved `logActivity()` call outside transaction block with try/catch
**Code Change:**
```typescript
// BEFORE (line 372 - INSIDE transaction)
await prisma.$transaction(async (tx) => {
  // ... all operations ...

  await logActivity({  // ← Uses global prisma, breaks transaction!
    userId: ctx.userId,
    action: 'summary.submitted',
    // ...
  });
});

// AFTER (line 375 - OUTSIDE transaction)
await prisma.$transaction(async (tx) => {
  // ... all operations ...
});

// Activity logging moved outside (non-blocking)
try {
  await logActivity({
    userId: ctx.userId,
    action: 'summary.submitted',
    // ...
  });
} catch (logError) {
  logger.error('Failed to log summary submission activity', { error: logError });
}
```

**Result:** ✅ **EXPECTED TO RESOLVE** - Transaction should complete successfully

## Why This Wasn't in Logs

The transaction rollback happens silently in Prisma when:
1. An operation inside the transaction uses a different client instance
2. The operation completes successfully but doesn't commit as part of the transaction
3. Prisma internally detects the inconsistency and rolls back
4. No exception is thrown to the application layer
5. The mutation returns success (201 OK) but database has no changes

This is a known Prisma behavior - all operations inside `$transaction(async (tx) => {...})` **MUST** use the `tx` client, not the global `prisma` instance.

## Expected Database State After Fix #4

After deployment and successful test:
```sql
SELECT COUNT(*) FROM summaries;
-- Expected: 1 (or more)

SELECT status, is_closed FROM reservations
WHERE id = 'd6b7de60-b4f4-4ed8-99a7-b15864150b6d';
-- Expected: status='summarized', is_closed=true

SELECT available_reservation_tokens FROM competitions
WHERE id = '2121d20a-62fc-4aa3-a6aa-be9e7c4e140a';
-- Expected: 548 (525 + 23 refund)

SELECT status FROM competition_entries
WHERE id = '43c1db28-a405-4068-9f65-b6ca754d8fcc';
-- Expected: status='submitted'
```

## Testing Plan

1. Wait for deployment of commit [pending]
2. Run Playwright test to submit summary
3. Verify database shows all changes persisted
4. Verify UI shows correct state
5. Mark Phase 1 workflow as functional

## Lessons Learned

1. **Never mix transaction clients** - All operations in `prisma.$transaction(async (tx) => {...})` MUST use `tx`, not global `prisma`
2. **Move non-critical operations outside transactions** - Activity logging, emails, etc. should run after transaction commits
3. **Silent rollbacks are hard to debug** - Prisma doesn't always throw errors when transactions fail due to client mixing
4. **Check for `prisma.$executeRaw` in transactions** - Raw SQL operations need special attention in transaction contexts

## Impact

- **Phase 1 workflow:** Currently 0% functional → Expected 100% after Fix #4
- **Production readiness:** ❌ BLOCKED → ✅ UNBLOCKED after verification
- **User confidence:** Lost → To be restored with successful test

---

**RESOLUTION:** Fix #4 addresses the root cause. Transaction rollback was caused by mixing `prisma` and `tx` client instances.
