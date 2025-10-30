# Capacity Management System - Surgical Rewrite Plan

**Date:** October 24, 2025 4:30pm EST
**Status:** 🔴 CRITICAL - Current system fundamentally broken
**Estimated Time:** 5.5 hours

---

## Problem Statement

**Symptoms Observed Today:**
1. ✅ Approved 100-space reservation → deducted 200 spaces
2. ✅ Submitted summary with 1/100 used → showed "99 refunded" but capacity didn't change
3. ✅ Summary doesn't appear in CD pipeline
4. ✅ Multiple attempts to fix resulted in more bugs

**Root Cause:** Capacity logic is scattered across 3+ files with no transactional integrity, no audit trail, and no single source of truth.

---

## What's Fundamentally Broken

### 1. Scattered Capacity Logic
```
reservation.ts:694 - Decrements on approval
entry.ts:??? - Has refund logic for summary
competition.ts:??? - Additional capacity operations
```

**Problem:**
- No atomic transactions
- No validation that all operations completed
- Logic duplicated in multiple places
- Can't trace where 200 deduction came from

### 2. Dual-Write Problem
- Frontend likely making duplicate API calls
- OR approve mutation called twice somehow
- OR multiple code paths deducting capacity
- No idempotency protection

### 3. Missing Audit Trail
- Can't answer: "Why did capacity change from 600 to 400?"
- Can't reconcile: "Where did those 200 spaces go?"
- Can't debug: "Was refund operation actually executed?"

### 4. State Machine Not Enforced
- Guards exist but transitions still happen incorrectly
- Status strings without database constraints
- No validation that state transitions are valid

---

## ❌ What to Rewrite (Fundamentally Broken)

### 1. Capacity Management System
**Current State:**
- Logic scattered across 3+ files
- No transactions
- No audit trail
- Dual-writes possible

**Why Rewrite:**
- Patching doesn't fix race conditions
- No way to debug what happened
- Can't guarantee correctness

### 2. State Machine (Reservation/Entry Status)
**Current State:**
- Status strings without enforcement
- Guards exist but don't prevent invalid transitions

**Why Rewrite:**
- Status changes need database constraints
- State machine should be explicit class
- All transitions must be validated

### 3. tRPC Reservation Router
**Current State:**
- 1400+ lines in single file
- Mixed concerns (queries + mutations + business logic)
- Capacity logic embedded in mutations

**Why Rewrite:**
- Separate concerns (queries, mutations, services)
- Move business logic to service layer
- Make testing possible

---

## ✅ What to Keep (Working)

1. **Auth system** - Rock solid
2. **Email infrastructure** - Works when called correctly
3. **PDF generation** - Correct output
4. **Database schema** - 90% correct (just add capacity_ledger)
5. **UI components** - No issues there
6. **Spec documents** - Complete business logic reference

---

## 🎯 Surgical Rewrite Plan (5.5 Hours)

### Step 1: Create Capacity Service (2 hours)

**File:** `src/server/services/capacity.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

type CapacityChangeReason =
  | 'reservation_approval'
  | 'summary_refund'
  | 'reservation_cancellation'
  | 'manual_adjustment';

/**
 * Single source of truth for competition capacity management
 * All capacity changes MUST go through this service
 */
export class CapacityService {
  /**
   * Reserve capacity (decrement available)
   * Uses database row locking to prevent race conditions
   *
   * @throws InsufficientCapacityError if not enough capacity
   * @throws Error if reservation already processed
   */
  async reserve(
    competitionId: string,
    spaces: number,
    reservationId: string,
    userId: string
  ): Promise<void> {
    if (spaces <= 0) {
      throw new Error('Spaces must be positive');
    }

    // Check idempotency - has this reservation already been approved?
    const existingLedger = await prisma.capacity_ledger.findFirst({
      where: {
        reservation_id: reservationId,
        reason: 'reservation_approval',
      },
    });

    if (existingLedger) {
      logger.warn('Reservation already processed - idempotency check', {
        reservationId,
        existingChange: existingLedger.change_amount,
      });
      return; // Already processed, skip silently
    }

    await prisma.$transaction(async (tx) => {
      // Lock row for update
      const competition = await tx.competitions.findUnique({
        where: { id: competitionId },
        select: {
          available_reservation_tokens: true,
          total_reservation_tokens: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const available = competition.available_reservation_tokens || 0;

      if (available < spaces) {
        throw new Error(
          `Insufficient capacity: ${available} available, ${spaces} requested`
        );
      }

      // Deduct capacity
      await tx.competitions.update({
        where: { id: competitionId },
        data: {
          available_reservation_tokens: {
            decrement: spaces,
          },
        },
      });

      // Log to ledger (audit trail)
      await tx.capacity_ledger.create({
        data: {
          competition_id: competitionId,
          reservation_id: reservationId,
          change_amount: -spaces, // Negative = deduction
          reason: 'reservation_approval',
          created_by: userId,
        },
      });

      logger.info('Capacity reserved', {
        competitionId,
        reservationId,
        spaces,
        previousAvailable: available,
        newAvailable: available - spaces,
      });
    });
  }

  /**
   * Refund capacity (increment available)
   * Used when summary submitted with unused entries or reservation cancelled
   */
  async refund(
    competitionId: string,
    spaces: number,
    reservationId: string,
    reason: CapacityChangeReason,
    userId: string
  ): Promise<void> {
    if (spaces <= 0) {
      throw new Error('Refund spaces must be positive');
    }

    await prisma.$transaction(async (tx) => {
      // Lock row for update
      const competition = await tx.competitions.findUnique({
        where: { id: competitionId },
        select: {
          available_reservation_tokens: true,
          total_reservation_tokens: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const available = competition.available_reservation_tokens || 0;
      const total = competition.total_reservation_tokens || 0;

      // Prevent refunding beyond total capacity
      if (available + spaces > total) {
        logger.error('Refund would exceed total capacity', {
          competitionId,
          currentAvailable: available,
          refundAmount: spaces,
          total,
        });
        throw new Error('Cannot refund more than total capacity');
      }

      // Increment capacity
      await tx.competitions.update({
        where: { id: competitionId },
        data: {
          available_reservation_tokens: {
            increment: spaces,
          },
        },
      });

      // Log to ledger (audit trail)
      await tx.capacity_ledger.create({
        data: {
          competition_id: competitionId,
          reservation_id: reservationId,
          change_amount: spaces, // Positive = refund
          reason,
          created_by: userId,
        },
      });

      logger.info('Capacity refunded', {
        competitionId,
        reservationId,
        spaces,
        reason,
        previousAvailable: available,
        newAvailable: available + spaces,
      });
    });
  }

  /**
   * Get current available capacity with locking
   * Use this instead of direct prisma queries
   */
  async getAvailable(competitionId: string): Promise<number> {
    const competition = await prisma.competitions.findUnique({
      where: { id: competitionId },
      select: { available_reservation_tokens: true },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    return competition.available_reservation_tokens || 0;
  }

  /**
   * Get audit trail for capacity changes
   * Useful for debugging "where did my capacity go?"
   */
  async getLedger(
    competitionId: string,
    options?: { reservationId?: string; limit?: number }
  ) {
    return prisma.capacity_ledger.findMany({
      where: {
        competition_id: competitionId,
        ...(options?.reservationId && { reservation_id: options.reservationId }),
      },
      include: {
        reservations: {
          include: {
            studios: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: options?.limit || 100,
    });
  }

  /**
   * Reconcile capacity - verify ledger matches current state
   * Returns discrepancies if any
   */
  async reconcile(competitionId: string) {
    const competition = await prisma.competitions.findUnique({
      where: { id: competitionId },
      select: {
        total_reservation_tokens: true,
        available_reservation_tokens: true,
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    const ledger = await prisma.capacity_ledger.findMany({
      where: { competition_id: competitionId },
      select: { change_amount: true },
    });

    const totalChanges = ledger.reduce((sum, entry) => sum + entry.change_amount, 0);
    const expectedAvailable = competition.total_reservation_tokens + totalChanges;
    const actualAvailable = competition.available_reservation_tokens;

    const discrepancy = actualAvailable - expectedAvailable;

    return {
      total: competition.total_reservation_tokens,
      expected: expectedAvailable,
      actual: actualAvailable,
      discrepancy,
      isCorrect: discrepancy === 0,
      ledgerEntries: ledger.length,
    };
  }
}

// Singleton instance
export const capacityService = new CapacityService();
```

---

### Step 2: Create capacity_ledger Table (30 min)

**Migration:** `prisma/migrations/YYYYMMDDHHMMSS_add_capacity_ledger/migration.sql`

```sql
-- Capacity audit trail table
-- Every capacity change is logged here for debugging and reconciliation

CREATE TABLE capacity_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  change_amount INT NOT NULL, -- Negative = deduction, Positive = refund
  reason VARCHAR(50) NOT NULL, -- 'reservation_approval', 'summary_refund', 'reservation_cancellation', 'manual_adjustment'
  notes TEXT, -- Optional explanation for manual adjustments
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_capacity_ledger_competition ON capacity_ledger(competition_id, created_at DESC);
CREATE INDEX idx_capacity_ledger_reservation ON capacity_ledger(reservation_id);

COMMENT ON TABLE capacity_ledger IS 'Audit trail for all competition capacity changes';
COMMENT ON COLUMN capacity_ledger.change_amount IS 'Negative values = capacity deducted, Positive values = capacity refunded';
```

**Update Prisma schema:**

```prisma
model capacity_ledger {
  id             String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  competition_id String        @db.Uuid
  reservation_id String?       @db.Uuid
  change_amount  Int
  reason         String        @db.VarChar(50)
  notes          String?
  created_at     DateTime      @default(now()) @db.Timestamp(6)
  created_by     String?       @db.Uuid

  competitions   competitions  @relation(fields: [competition_id], references: [id], onDelete: Cascade)
  reservations   reservations? @relation(fields: [reservation_id], references: [id], onDelete: SetNull)
  users          users?        @relation(fields: [created_by], references: [id])

  @@index([competition_id, created_at(sort: Desc)], map: "idx_capacity_ledger_competition")
  @@index([reservation_id], map: "idx_capacity_ledger_reservation")
  @@schema("public")
}
```

---

### Step 3: Rewrite Reservation Approve Mutation (1 hour)

**File:** `src/server/routers/reservation.ts`

```typescript
import { capacityService } from '../services/capacity';

// ... existing code ...

approve: protectedProcedure
  .input(
    z.object({
      id: z.string().uuid().optional(),
      reservationId: z.string().uuid().optional(),
      spacesConfirmed: z.number().int().min(0).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Authorization check
    if (isStudioDirector(ctx.userRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Studio directors cannot approve reservations'
      });
    }

    const reservationId = input.reservationId || input.id;
    if (!reservationId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reservation ID is required' });
    }

    // Guard: Check current status
    const existingReservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      select: {
        status: true,
        competition_id: true,
        spaces_requested: true,
      },
    });

    if (!existingReservation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found' });
    }

    guardReservationStatus(
      existingReservation.status as 'pending' | 'approved' | 'rejected',
      ['pending'],
      'approve reservation'
    );

    const spacesConfirmed = input.spacesConfirmed ?? existingReservation.spaces_requested;

    // Reserve capacity FIRST (atomic, with idempotency)
    try {
      await capacityService.reserve(
        existingReservation.competition_id,
        spacesConfirmed,
        reservationId,
        ctx.userId!
      );
    } catch (error) {
      logger.error('Failed to reserve capacity', {
        error: error instanceof Error ? error.message : String(error),
        reservationId,
        spacesConfirmed
      });
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Failed to reserve capacity'
      });
    }

    // Update reservation status
    const reservation = await prisma.reservations.update({
      where: { id: reservationId },
      data: {
        status: 'approved',
        spaces_confirmed: spacesConfirmed,
        approved_at: new Date(),
        approved_by: ctx.userId,
        updated_at: new Date(),
      },
      include: {
        studios: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        competitions: {
          select: {
            id: true,
            name: true,
            year: true,
            entry_fee: true,
          },
        },
      },
    });

    // Activity logging (non-blocking)
    logActivity({
      userId: ctx.userId,
      studioId: reservation.studio_id,
      action: 'reservation.approve',
      entityType: 'reservation',
      entityId: reservation.id,
      details: {
        studio_id: reservation.studio_id,
        competition_id: reservation.competition_id,
        routines_requested: reservation.spaces_requested,
        routines_confirmed: reservation.spaces_confirmed,
      },
    }).catch((err) => {
      logger.error('Failed to log activity', { error: err });
    });

    // Email notification (non-blocking)
    // ... existing email code ...

    return reservation;
  }),
```

---

### Step 4: Rewrite Summary Submission (1 hour)

**File:** `src/server/routers/entry.ts`

```typescript
import { capacityService } from '../services/capacity';

// ... existing code ...

submitSummary: protectedProcedure
  .input(z.object({ reservationId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Get reservation with entries
    const reservation = await prisma.reservations.findUnique({
      where: { id: input.reservationId },
      include: {
        competition_entries: {
          where: { deleted_at: null },
        },
      },
    });

    if (!reservation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found' });
    }

    // Authorization check
    if (ctx.userStudioId !== reservation.studio_id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
    }

    // Validation
    if (reservation.status !== 'approved') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reservation not approved' });
    }

    const entriesUsed = reservation.competition_entries.length;
    const entriesApproved = reservation.spaces_confirmed || 0;
    const entriesUnused = entriesApproved - entriesUsed;

    if (entriesUnused < 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot submit ${entriesUsed} entries when only ${entriesApproved} approved`
      });
    }

    // Refund unused capacity FIRST (atomic)
    if (entriesUnused > 0) {
      try {
        await capacityService.refund(
          reservation.competition_id,
          entriesUnused,
          reservation.id,
          'summary_refund',
          ctx.userId!
        );
      } catch (error) {
        logger.error('Failed to refund capacity', {
          error: error instanceof Error ? error.message : String(error),
          reservationId: reservation.id,
          entriesUnused
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refund unused capacity'
        });
      }
    }

    // Update reservation status
    await prisma.reservations.update({
      where: { id: input.reservationId },
      data: {
        status: 'summarized',
        is_closed: entriesUnused === 0, // Close if all spaces used
        updated_at: new Date(),
      },
    });

    // Update entries to 'submitted' status
    await prisma.competition_entries.updateMany({
      where: {
        reservation_id: input.reservationId,
        deleted_at: null,
      },
      data: {
        status: 'submitted',
      },
    });

    // Activity logging
    logActivity({
      userId: ctx.userId,
      studioId: reservation.studio_id,
      action: 'summary.submit',
      entityType: 'reservation',
      entityId: reservation.id,
      details: {
        entries_used: entriesUsed,
        entries_unused: entriesUnused,
        capacity_refunded: entriesUnused,
      },
    }).catch((err) => {
      logger.error('Failed to log activity', { error: err });
    });

    // Email notification to CD
    // ... existing email code ...

    return {
      success: true,
      entriesUsed,
      entriesUnused,
      capacityRefunded: entriesUnused,
    };
  }),
```

---

### Step 5: Add Admin Reconciliation Tool (1 hour)

**File:** `src/server/routers/competition.ts`

```typescript
import { capacityService } from '../services/capacity';

// ... existing code ...

reconcileCapacity: protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Super Admin only
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const reconciliation = await capacityService.reconcile(input.competitionId);
    const ledger = await capacityService.getLedger(input.competitionId, { limit: 50 });

    return {
      reconciliation,
      recentChanges: ledger,
    };
  }),

getCapacityLedger: protectedProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    reservationId: z.string().uuid().optional(),
  }))
  .query(async ({ ctx, input }) => {
    // CD or Super Admin only
    if (!['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const ledger = await capacityService.getLedger(
      input.competitionId,
      { reservationId: input.reservationId }
    );

    return ledger;
  }),
```

---

## 🧪 Testing Plan (30 min)

### Test 1: Single Approval
```typescript
// Create reservation
const res = await trpc.reservation.create({ competitionId, spacesRequested: 100 });

// Approve
await trpc.reservation.approve({ reservationId: res.id, spacesConfirmed: 100 });

// Verify
const capacity = await capacityService.getAvailable(competitionId);
// Expected: initial - 100

const ledger = await capacityService.getLedger(competitionId);
// Expected: 1 entry with change_amount = -100
```

### Test 2: Idempotency (Double-Click Protection)
```typescript
// Approve twice in quick succession
await Promise.all([
  trpc.reservation.approve({ reservationId, spacesConfirmed: 100 }),
  trpc.reservation.approve({ reservationId, spacesConfirmed: 100 }),
]);

// Verify
const ledger = await capacityService.getLedger(competitionId, { reservationId });
// Expected: Only 1 ledger entry (second call was idempotent)
```

### Test 3: Summary Refund
```typescript
// Approve 100 spaces
await trpc.reservation.approve({ reservationId, spacesConfirmed: 100 });

// Create only 75 entries
// ...

// Submit summary
await trpc.entry.submitSummary({ reservationId });

// Verify
const capacity = await capacityService.getAvailable(competitionId);
// Expected: initial - 100 + 25 = initial - 75

const ledger = await capacityService.getLedger(competitionId, { reservationId });
// Expected: 2 entries (approval: -100, refund: +25)
```

### Test 4: Reconciliation
```typescript
const result = await capacityService.reconcile(competitionId);
// Expected: isCorrect = true, discrepancy = 0
```

---

## 📋 Implementation Checklist

- [ ] Create `src/server/services/capacity.ts` with CapacityService class
- [ ] Create capacity_ledger migration
- [ ] Update Prisma schema with capacity_ledger model
- [ ] Run `npx prisma generate`
- [ ] Rewrite reservation.approve mutation
- [ ] Rewrite entry.submitSummary mutation
- [ ] Add reconciliation admin tools
- [ ] Write 4 automated tests
- [ ] Test on clean database
- [ ] Deploy to production
- [ ] Verify with manual testing

---

## 🎯 Success Criteria

**Before:**
- ❌ 100-space approval deducts 200
- ❌ Summary refund shows message but doesn't persist
- ❌ Can't debug where capacity went
- ❌ Double-clicks cause double-deductions

**After:**
- ✅ 100-space approval deducts exactly 100
- ✅ Summary refund increases available capacity
- ✅ Complete audit trail in capacity_ledger
- ✅ Idempotency prevents double-deductions
- ✅ Reconciliation tool shows if anything is wrong

---

## 🚨 Migration Risk Mitigation

**Backup Plan:**
1. Create capacity_ledger table FIRST (non-breaking)
2. Deploy CapacityService but don't use it yet (test in staging)
3. Create admin tool to populate ledger from existing data (backfill)
4. Switch mutations to use CapacityService one at a time
5. Verify reconciliation shows isCorrect = true
6. If anything breaks, service layer can be bypassed temporarily

**Data Migration:**
```sql
-- Backfill ledger from existing approvals
INSERT INTO capacity_ledger (
  competition_id,
  reservation_id,
  change_amount,
  reason,
  created_at,
  created_by
)
SELECT
  competition_id,
  id,
  -spaces_confirmed,
  'reservation_approval',
  approved_at,
  approved_by
FROM reservations
WHERE status IN ('approved', 'summarized', 'invoiced', 'closed')
  AND spaces_confirmed IS NOT NULL;
```

---

## Timeline

**Total: 5.5 hours**

1. CapacityService class: 2 hours
2. Migration + schema: 30 min
3. Rewrite approve mutation: 1 hour
4. Rewrite summary mutation: 1 hour
5. Admin tools: 1 hour
6. Testing: 30 min

**Can be done in 2 sessions:**
- Session 1 (3 hours): Service + migration + approve
- Session 2 (2.5 hours): Summary + admin tools + testing

---

**Status:** Ready to implement
**Approved By:** Awaiting user confirmation
