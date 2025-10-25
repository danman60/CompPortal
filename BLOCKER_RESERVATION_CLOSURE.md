# BLOCKER: Reservation Not Closing After Summary Submission

**Date:** October 25, 2025 14:45 UTC
**Status:** 🔴 CRITICAL BLOCKER
**Impact:** Phase 1 workflow completely broken - reservations never close, capacity never refunded

## Problem Summary

User submitted summary for 1 out of 250 spaces on London competition. Expected behavior:
1. ✅ Summary record created in `summaries` table
2. ✅ Reservation status changed to "summarized"
3. ✅ Reservation `is_closed` set to `true`
4. ✅ 249 spaces refunded back to competition
5. ✅ Entry status changed to "submitted"

**Actual behavior:**
- ❌ NO summary record in database
- ❌ Reservation status still "approved"
- ❌ Reservation `is_closed` still `false`
- ❌ NO capacity refunded (still 350 available, should be 549)
- ❌ Entry status still "draft"
- ✅ UI showed "Summary submitted successfully!" (FALSE POSITIVE)

## Root Cause

The **entire transaction is failing and rolling back**, but the frontend `onSuccess` callback fires anyway, showing a success message to the user.

This is the SAME issue as Bug #3 from `BLOCKER_BUG3_STILL_FAILING.md`.

## Evidence

### Database State
```sql
-- London competition capacity
SELECT available_reservation_tokens, total_reservation_tokens
FROM competitions WHERE name LIKE '%London%';
-- Result: 350 available, 600 total (250 used)
-- Expected: 549 available (199 refunded from 200 - 1 submitted)

-- Reservation that should be closed
SELECT id, status, is_closed, spaces_confirmed
FROM reservations
WHERE id = '96e1dd3a-ed2b-4863-8a72-40322ff6f124';
-- Result: status='approved', is_closed=false, spaces_confirmed=250
-- Expected: status='summarized', is_closed=true, spaces_confirmed=1

-- Entry that should be submitted
SELECT id, title, status FROM competition_entries
WHERE id = '35364a56-d6c6-4c15-a1bd-94e4849da9ca';
-- Result: status='draft'
-- Expected: status='submitted'

-- Summaries table (should have 1 record)
SELECT * FROM summaries;
-- Result: [] (EMPTY)
```

### Code Deployed
Commit **9818afe** contains the transaction wrapper (entry.ts:208-305):
```typescript
await prisma.$transaction(async (tx) => {
  // Update reservation to summarized + closed
  await tx.reservations.update({ ... status: 'summarized', is_closed: true ... });

  // Refund unused capacity
  if (unusedSpaces > 0) {
    await capacityService.refund(...); // ← LIKELY FAILING HERE
  }

  // Create summary record
  await tx.summaries.create({ ... });

  // Create entry snapshots
  await tx.summary_entries.create({ ... });

  // Update entry statuses to 'submitted'
  await tx.competition_entries.update({ ... status: 'submitted' ... });
});
```

## Why Transaction Is Failing

Most likely culprit: **CapacityService.refund()** is throwing an error.

Possible reasons:
1. **Nested transaction issue** - capacityService.refund() calls `prisma.$transaction()` but we're already inside a transaction (entry.ts:209)
2. **Capacity validation failure** - Line 201 in capacity.ts prevents refunding beyond total: `if (available + spaces > total)`
3. **Database constraint violation** - Unknown constraint blocking the operation
4. **Missing userId parameter** - capacityService.refund() requires userId but might be undefined

## Frontend Issue

EntriesList.tsx:28-36 shows the problem:
```typescript
const submitSummaryMutation = trpc.entry.submitSummary.useMutation({
  onSuccess: () => {
    toast.success('Summary submitted...'); // ← FIRES EVEN ON TRANSACTION ROLLBACK
    setSummarySubmitted(true);
    refetch();
  },
  onError: (error) => {
    toast.error(`Failed: ${error.message}`);
  },
});
```

The `onSuccess` callback fires because tRPC doesn't detect transaction rollbacks. The mutation technically "succeeds" (no exception thrown to the caller), but the database transaction rolls back internally.

## Nested Transaction Problem (MOST LIKELY)

**entry.ts:209** starts a transaction:
```typescript
await prisma.$transaction(async (tx) => {
  // ...
  await capacityService.refund(competitionId, unusedSpaces, ...);
  // ...
});
```

**capacity.ts:183** ALSO starts a transaction:
```typescript
async refund(...) {
  await prisma.$transaction(async (tx) => {
    // ...
  });
}
```

**Prisma does NOT support nested transactions!** When capacityService.refund() tries to start its own transaction while already inside the submitSummary transaction, it fails silently.

## Fix Required

**Option 1: Pass transaction object to capacityService**
```typescript
// entry.ts
await prisma.$transaction(async (tx) => {
  // ...
  if (unusedSpaces > 0) {
    await capacityService.refund(tx, competitionId, unusedSpaces, ...);
  }
  // ...
});

// capacity.ts - modify signature to accept tx parameter
async refund(
  tx: Prisma.TransactionClient,  // ← NEW
  competitionId: string,
  spaces: number,
  ...
) {
  // Use tx instead of starting new transaction
  const competition = await tx.competitions.findUnique({ ... });
  await tx.competitions.update({ ... });
  await tx.capacity_ledger.create({ ... });
}
```

**Option 2: Extract capacity logic inline**
```typescript
await prisma.$transaction(async (tx) => {
  // ... update reservation ...

  // Inline capacity refund (no nested transaction)
  if (unusedSpaces > 0) {
    const comp = await tx.competitions.findUnique({
      where: { id: competitionId },
      select: { available_reservation_tokens: true, total_reservation_tokens: true }
    });

    const newAvailable = (comp.available_reservation_tokens || 0) + unusedSpaces;
    if (newAvailable > comp.total_reservation_tokens) {
      throw new Error('Refund would exceed total capacity');
    }

    await tx.competitions.update({
      where: { id: competitionId },
      data: { available_reservation_tokens: newAvailable }
    });

    await tx.capacity_ledger.create({
      data: {
        competition_id: competitionId,
        reservation_id: fullReservation.id,
        change_amount: unusedSpaces,
        reason: 'summary_refund',
        created_by: ctx.userId
      }
    });
  }

  // ... create summary ...
});
```

## Immediate Actions Required

1. **Get Vercel runtime logs** to confirm exact error:
   ```bash
   vercel logs --follow
   ```

2. **Implement Option 2 above** (inline capacity refund) - simpler and safer

3. **Add try/catch logging** around capacityService.refund():
   ```typescript
   try {
     await capacityService.refund(...);
   } catch (refundError) {
     logger.error('Capacity refund failed', { error: refundError });
     throw new TRPCError({
       code: 'INTERNAL_SERVER_ERROR',
       message: `Capacity refund failed: ${refundError.message}`
     });
   }
   ```

4. **Fix frontend to detect failures** - Check if summary was actually created:
   ```typescript
   onSuccess: async () => {
     // Verify summary was created before showing success
     const summaries = await trpc.summary.getAll.query();
     if (summaries.length === 0) {
       toast.error('Summary submission failed silently!');
       return;
     }
     toast.success('Summary submitted...');
   }
   ```

## Testing Plan After Fix

1. Create fresh studio + reservation (avoid data pollution)
2. Request 100 spaces
3. CD approves
4. Create 75 routines
5. Submit summary
6. **Verify database:**
   - summaries table has 1 record
   - reservation status = 'summarized'
   - reservation is_closed = true
   - competition capacity = original + 25
   - entry status = 'submitted'

## Impact

- **Phase 1 workflow:** 0% functional (completely broken)
- **Production readiness:** ❌ BLOCKED
- **User experience:** Showing success when operations fail (data integrity issue)

---

**URGENT:** This blocker prevents all Phase 1 workflow testing and must be resolved before any further testing.
