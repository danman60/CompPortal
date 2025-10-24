# Double-Deduction Bug Investigation - October 24, 2025

## Test Evidence

**Test performed:** Approved 250-space reservation for "EMPWR Dance - London"

**BEFORE state:**
```sql
available_reservation_tokens: 600
total_reservation_tokens: 600
ledger_count: 0
ledger_sum: NULL
```

**AFTER state:**
```sql
available_reservation_tokens: 100
total_reservation_tokens: 600
ledger_count: 1
ledger_sum: -250
```

**UI Display:** "500 / 600 spaces used" (100 remaining)

### Critical Timestamp Evidence

**Reservation update timestamp:** 2025-10-24 21:01:23.**167601**
**Ledger entry timestamp:** 2025-10-24 21:01:23.**37**

**Time difference:** ~133ms between operations that should be in the SAME atomic transaction!

This proves the operations are NOT truly atomic. The ledger entry happened 133ms BEFORE the reservation update, which suggests either:
1. Prisma's transaction isolation is broken
2. Two separate transactions are executing
3. Operations are committing at different times despite being in same callback

## Bug Analysis

### What Happened
1. Approved reservation for 250 spaces
2. Database shows 500 spaces deducted (600 → 100 available)
3. Only ONE ledger entry of -250
4. Only ONE reservation status update to 'approved'

### Key Observation
**The capacity decrement happened TWICE (500 total), but the ledger and status update happened ONCE.**

This proves:
- The transaction is NOT fully atomic
- The SELECT FOR UPDATE lock is NOT preventing double execution
- OR the mutation is being called twice from a race condition

### Evidence the SELECT FOR UPDATE Failed

The code at `capacity.ts:48-72` should prevent this:

```typescript
const reservations = await tx.$queryRaw<Array<{ id: string; status: string }>>`
  SELECT id, status FROM reservations
  WHERE id = ${reservationId}::uuid
  FOR UPDATE
`;

if (reservation.status !== 'pending') {
  logger.warn('Reservation already processed - status guard');
  return; // Early return - should prevent double execution
}
```

**If this worked correctly:**
- First call: Lock acquired, status='pending', proceeds with deduction
- Second call: Waits for lock, sees status='approved', returns early
- Result: Only ONE deduction

**What actually happened:**
- Capacity decremented TWICE
- Ledger entry created ONCE
- Status updated ONCE

###Possible Root Causes

#### Theory 1: Prisma Transaction Isolation Issue
Prisma's `$transaction` might not maintain proper isolation with `$queryRaw` + regular Prisma operations. The lock from SELECT FOR UPDATE might not persist across the mixed raw SQL and ORM operations.

**Evidence supporting:** Mix of `$queryRaw` (line 48) and regular Prisma `update` (line 113) in same transaction

#### Theory 2: Multiple Concurrent Calls
Frontend might be triggering the mutation twice due to:
- React re-render (React.StrictMode in development)
- Double-click on approval button
- Network retry logic

**Evidence against:** Only ONE ledger entry created. If calls were truly concurrent and both passed the status check, there would be TWO ledger entries.

#### Theory 3: Transaction Timing Race
Possible timeline:
1. Call A: SELECT FOR UPDATE (acquires lock, status='pending')
2. Call B: Starts, waits for lock
3. Call A: Decrements capacity (line 113-120)
4. Call A: **Something fails here or transaction is slow**
5. Call B: Lock released, reads status (STILL 'pending'?)
6. Call B: Decrements capacity again
7. Call A: Updates status to 'approved', creates ledger
8. Call B: Tries to update status (fails silently? idempotency check catches it?)

**Evidence supporting:** Ledger idempotency check at lines 74-88 would prevent second ledger entry even if status update happened twice.

## Failed Fixes

### Attempt 1: Move status update inside transaction (commit 577c462)
**Result:** Bug persisted
**Reason:** Didn't add row locking

### Attempt 2: Add SELECT FOR UPDATE (commit 0df9984)
**Result:** Bug STILL persists
**Reason:** Lock not working as expected with Prisma transactions

## Next Steps

### Option A: Use Advisory Locks Instead
Replace SELECT FOR UPDATE with PostgreSQL advisory locks:

```typescript
await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${reservationId}))`;
```

This locks at application level, not row level, and is guaranteed to work across the transaction.

### Option B: Use SERIALIZABLE Isolation
Force Prisma transaction to use SERIALIZABLE isolation level:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`;
  // ... rest of code
});
```

### Option C: Add Unique Constraint on Ledger
Create unique constraint on `(reservation_id, reason)` pairs to make double-execution fail loudly:

```sql
ALTER TABLE capacity_ledger
ADD CONSTRAINT unique_reservation_reason
UNIQUE (reservation_id, reason);
```

Then let the duplicate key error propagate, and rollback the entire transaction.

### Option D: Move ALL Operations to Raw SQL
Replace all Prisma ORM calls with raw SQL within the transaction to ensure consistent lock handling:

```typescript
await tx.$executeRaw`
  UPDATE competitions
  SET available_reservation_tokens = available_reservation_tokens - ${spaces}
  WHERE id = ${competitionId}::uuid
`;
```

## Additional Investigation

### Checked for Database Triggers
No triggers found on `competitions` table that could cause double deduction.

### Checked Prisma Transaction Isolation
The 133ms timestamp difference between operations proves Prisma's `$transaction` callback is NOT providing true atomicity with mixed raw SQL (`$queryRaw`) and ORM operations.

### Hypothesis: Double API Call
The frontend or Playwright may be calling the tRPC mutation twice due to:
- React.StrictMode double-rendering (development mode)
- Double-click on approval button
- Network retry logic
- Browser behavior

**Evidence supporting:** The mutation is likely being called twice, but the SELECT FOR UPDATE lock is NOT preventing the second call from also deducting capacity before seeing the status change.

## Recommended Solution

**Combination of Option A + Option C:**

1. Use `pg_advisory_xact_lock()` for absolute guarantee no concurrent execution
2. Add unique constraint on ledger as safety net
3. Keep existing idempotency checks

This provides defense in depth:
- Advisory lock prevents concurrent execution
- Status check prevents re-execution after first succeeds
- Ledger idempotency check prevents duplicate ledger entries
- Unique constraint makes any breakthrough fail loudly

## Test Plan for Fix

1. Reset London capacity to 600
2. Create pending reservation for 250 spaces
3. Use Playwright to rapidly double-click approve button
4. Verify:
   - available_reservation_tokens = 350 (NOT 100)
   - ledger has exactly 1 entry of -250
   - No errors in logs

---

## ROOT CAUSE IDENTIFIED (October 24, 2025 10:07 PM)

**Frontend race condition in CompetitionReservationsPanel.tsx:67-95**

### The Bug Timeline

```typescript
const handleApprove = async (reservationId: string, studioId: string) => {
  // Line 80: Set removingId (for animation)
  setRemovingId(reservationId);

  // Line 83: Schedule mutation for 300ms later
  setTimeout(async () => {
    await approveMutation.mutateAsync({ ... });  // Line 84
  }, 300);
};
```

**What happened on double-click:**

| Time | First Click | Second Click |
|------|-------------|--------------|
| 0ms | setRemovingId('abc') | - |
| 0ms | Schedule timeout #1 | - |
| 50ms (double-click) | - | setRemovingId('abc') AGAIN |
| 50ms | - | Schedule timeout #2 |
| 300ms | Timeout #1 fires → mutateAsync() | - |
| 350ms | - | Timeout #2 fires → mutateAsync() |

**Both setTimeout callbacks executed** because there was NO guard checking if `removingId` was already set.

The button's `disabled={approveMutation.isPending}` check (line 182) only prevented clicks DURING the mutation, not during the 300ms animation window.

### The Fix

**Commit a977508:** Add early return if removingId or mutation already in progress:

```typescript
const handleApprove = async (reservationId: string, studioId: string) => {
  // NEW: Prevent double-click during 300ms window
  if (removingId || approveMutation.isPending) {
    return;
  }

  // ... rest of function
};
```

### Defense in Depth

1. **Frontend (a977508):** Block double-clicks during animation window
2. **Backend (94670ac):** Use `pg_advisory_xact_lock()` to prevent concurrent execution
3. **Database:** Unique constraint on `capacity_ledger(reservation_id, reason)` to catch any breakthrough

---

## Latest Test Results (October 24, 2025 10:22 PM)

**Test:** Approved 15-space reservation for St. Catharines #1

**Evidence of CONTINUED Bug:**
```sql
St. Catharines #1:
- Total: 600
- Available: 270
- Used by DB: 330 (actual capacity decremented)
- Used by ledger: 315 (sum of all ledger entries: -300, -15)
- Discrepancy: 15 spaces

Ledger entries:
1. -300 spaces (old approval)
2. -15 spaces (new test approval) ← Only ONE entry created
```

**Analysis:**
- Ledger shows CORRECT single entry of -15
- Database shows 15 MORE was deducted than ledger (discrepancy = 15)
- This proves capacity.ts line 113-120 is executing TWICE despite:
  - Advisory lock at line 49
  - Status check at line 66-72
  - Ledger idempotency check at line 75-88

**Hypothesis:** The unique constraint on capacity_ledger caught the SECOND ledger insert, preventing duplicate ledger entries, but the capacity UPDATE at line 113-120 executed BEFORE the ledger insert failed, so both capacity decrements succeeded.

**Next Steps:**
1. Move capacity decrement AFTER ledger creation (reorder operations)
2. OR wrap entire transaction body in try-catch and verify ledger creation succeeded before committing

---

**Status:** ❌ BUG STILL ACTIVE - Fix unsuccessful, requires further investigation
**Priority:** CRITICAL - Blocks production launch
**Assignee:** Claude Code
**Date:** October 24, 2025 9:01 PM - 10:22 PM
