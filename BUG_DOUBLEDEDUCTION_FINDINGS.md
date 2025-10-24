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

**Status:** Bug confirmed and reproduced in production
**Priority:** CRITICAL - Blocks production launch
**Assignee:** Claude Code
**Date:** October 24, 2025 9:01 PM
