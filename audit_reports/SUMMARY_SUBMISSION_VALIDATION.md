# Summary Submission Validation Report

**Date:** October 24, 2025
**Validator:** Claude Code Pre-Production Review
**Context:** User reported summary submission broken after Session 9 capacity rewrite

---

## Executive Summary

**Status:** ❌ CRITICAL SPEC VIOLATIONS FOUND

The current implementation deviates significantly from PHASE1_SPEC.md requirements:

1. **Missing `summarized` status** in reservations table CHECK constraint
2. **Missing `submitted` status** in competition_entries table CHECK constraint
3. **No summaries table** - spec requires audit trail table
4. **No summary_entries table** - spec requires entry snapshots
5. **Incomplete validation** - missing idempotency check

---

## Spec Requirements vs Current Implementation

### PHASE1_SPEC.md Lines 589-651: submit_summary() Pseudocode

**Spec Requirements:**

1. Validate reservation status in `['approved', 'adjusted']`
2. Check if summary already exists (idempotency)
3. Find all entries linked to reservation_id
4. Validate at least 1 entry exists
5. Calculate entries_used and entries_unused
6. **Create summaries record** (reservation_id, entries_used, entries_unused, submitted_at)
7. **Create summary_entries records** (audit trail with entry snapshots)
8. **Update entry status to `'submitted'`** (line 625)
9. **Update reservation status to `'summarized'`** (line 629)
10. Refund unused capacity immediately
11. Send email to CD

### Current Implementation (entry.ts:150-216)

**What's Correct:**
- ✅ Validates reservation status (line 176: status = 'approved')
- ✅ Finds entries by studio_id + competition_id (lines 157-160)
- ✅ Calculates unused spaces (line 184)
- ✅ Updates reservation.spaces_confirmed (line 190)
- ✅ Refunds capacity via CapacityService (lines 197-215)
- ✅ Sends email to CD (lines 218-265)

**What's Missing/Wrong:**
- ❌ No idempotency check (spec line 599: `if Summary.exists()`)
- ❌ No summaries table creation
- ❌ No summary_entries table creation
- ❌ Does NOT update reservation.status to 'summarized' (removed in Session 9)
- ❌ Does NOT update entry.status to 'submitted' (would fail CHECK constraint)
- ❌ Query uses studio_id + competition_id instead of reservation_id (line 158)

---

## Database Schema Violations

### Reservation Status Constraint

**Current CHECK constraint:**
```sql
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'waitlisted'))
```

**Spec requires (line 629):**
```python
reservation.status = 'summarized'  # ❌ NOT IN CONSTRAINT
```

**Impact:** Cannot set reservation to 'summarized' status per spec

### Entry Status Constraint

**Current CHECK constraint:**
```sql
CHECK (status IN ('draft', 'registered', 'confirmed', 'performed', 'scored', 'awarded', 'disqualified', 'withdrawn'))
```

**Spec requires (line 625):**
```python
entry.status = 'submitted'  # ❌ NOT IN CONSTRAINT
```

**Impact:** Cannot set entries to 'submitted' status per spec

### Missing Tables

**Spec requires (lines 611-616):**
```python
summary = Summary.create(
    reservation_id=reservation_id,
    entries_used=entries_used,
    entries_unused=entries_unused,
    submitted_at=now()
)
```

**Database reality:** No `summaries` table exists

**Spec requires (lines 619-624):**
```python
SummaryEntry.create(
    summary_id=summary.id,
    entry_id=entry.id,
    snapshot=entry.to_json()
)
```

**Database reality:** No `summary_entries` table exists

---

## Why It Was Working Yesterday

**Theory:** The implementation never fully matched the spec, but worked "well enough":

1. Summary submission updated reservation.spaces_confirmed
2. Capacity was refunded correctly
3. Frontend showed updated numbers
4. No one tested re-submitting summaries (idempotency issue never surfaced)

**What Session 9 broke:**

- Added `status: 'submitted'` at line 191 (constraint violation)
- Changed capacity tracking logic (double deduction issues)
- Silent failures due to try/catch swallowing errors

---

## Entry Linking Issue

### Current Query (entry.ts:157-160)

```typescript
prisma.competition_entries.findMany({
  where: {
    studio_id: studioId,
    competition_id: competitionId,
    status: { not: 'cancelled' }
  },
  select: { total_fee: true },
})
```

**Problem:** Doesn't filter by reservation_id

**Spec requirement (line 602):**
```python
entries = Entry.filter(reservation_id=reservation_id, deleted_at=None)
```

**Why it matters:**
- Studio can have multiple reservations per competition (spec line 200)
- Current query finds ALL entries for studio, not just for THIS reservation
- If studio has 2 reservations (15 spaces, 10 spaces) and submits summary for first:
  - Query finds all 25 entries
  - Sets reservation.spaces_confirmed = 25 (should be 15)
  - Refunds -10 spaces (should be 0 if all 15 used)

**Fix applied in Session 9.5:**
- Auto-link entries to reservation_id during creation (entry.ts:732-747)
- This ensures entries have valid reservation_id for future filtering

---

## Migration Requirements

### Add Missing Status Values

**Migration 1: Add 'summarized' to reservations.status**

```sql
ALTER TABLE reservations
DROP CONSTRAINT reservations_status_check;

ALTER TABLE reservations
ADD CONSTRAINT reservations_status_check
CHECK (status IN (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'waitlisted',
  'summarized'  -- NEW
));
```

**Migration 2: Add 'submitted' to competition_entries.status**

```sql
ALTER TABLE competition_entries
DROP CONSTRAINT competition_entries_status_check;

ALTER TABLE competition_entries
ADD CONSTRAINT competition_entries_status_check
CHECK (status IN (
  'draft',
  'registered',
  'confirmed',
  'performed',
  'scored',
  'awarded',
  'disqualified',
  'withdrawn',
  'submitted'  -- NEW
));
```

### Create Missing Tables

**Migration 3: Create summaries table**

```sql
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  entries_used INTEGER NOT NULL CHECK (entries_used >= 0),
  entries_unused INTEGER NOT NULL CHECK (entries_unused >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reservation_id)  -- One summary per reservation
);

CREATE INDEX idx_summaries_reservation ON summaries(reservation_id);
CREATE INDEX idx_summaries_submitted_at ON summaries(submitted_at);
```

**Migration 4: Create summary_entries table**

```sql
CREATE TABLE summary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,  -- Full entry data at submission time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(summary_id, entry_id)  -- One snapshot per entry per summary
);

CREATE INDEX idx_summary_entries_summary ON summary_entries(summary_id);
CREATE INDEX idx_summary_entries_entry ON summary_entries(entry_id);
```

---

## Breaking Changes Assessment

### Impact on Existing Data

**Existing reservations:** None currently in 'summarized' status, safe to add

**Existing entries:** None currently in 'submitted' status, safe to add

**New tables:** No foreign key issues, pure additions

**Risk Level:** 🟢 LOW - Additive changes only

### Impact on Code

**Files needing updates:**

1. **entry.ts:187-194** - Restore status updates
   ```typescript
   await prisma.reservations.update({
     where: { id: reservation.id },
     data: {
       spaces_confirmed: routineCount,
       status: 'summarized',  // RESTORE THIS
       is_closed: true,       // Always close after summary
       updated_at: new Date(),
     },
   });
   ```

2. **entry.ts:150-216** - Add summaries table logic
   ```typescript
   // Check idempotency BEFORE processing
   const existingSummary = await prisma.summaries.findUnique({
     where: { reservation_id: reservation.id }
   });
   if (existingSummary) {
     throw new TRPCError({
       code: 'BAD_REQUEST',
       message: 'Summary already submitted for this reservation'
     });
   }

   // After capacity refund, create summary record
   const summary = await prisma.summaries.create({
     data: {
       reservation_id: reservation.id,
       entries_used: routineCount,
       entries_unused: unusedSpaces,
       submitted_at: new Date(),
     }
   });

   // Create entry snapshots
   for (const entry of entries) {
     await prisma.summary_entries.create({
       data: {
         summary_id: summary.id,
         entry_id: entry.id,
         snapshot: entry,  // Full entry object as JSON
       }
     });

     // Update entry status
     await prisma.competition_entries.update({
       where: { id: entry.id },
       data: { status: 'submitted' }
     });
   }
   ```

3. **schema.prisma** - Add new models
   ```prisma
   model summaries {
     id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     reservation_id String   @unique @db.Uuid
     entries_used   Int
     entries_unused Int
     submitted_at   DateTime @default(now()) @db.Timestamptz(6)
     created_at     DateTime @default(now()) @db.Timestamptz(6)
     updated_at     DateTime @default(now()) @db.Timestamptz(6)

     reservations     reservations       @relation(fields: [reservation_id], references: [id], onDelete: Cascade)
     summary_entries  summary_entries[]

     @@index([reservation_id])
     @@index([submitted_at])
   }

   model summary_entries {
     id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     summary_id String   @db.Uuid
     entry_id   String   @db.Uuid
     snapshot   Json
     created_at DateTime @default(now()) @db.Timestamptz(6)

     summaries          summaries          @relation(fields: [summary_id], references: [id], onDelete: Cascade)
     competition_entries competition_entries @relation(fields: [entry_id], references: [id], onDelete: Cascade)

     @@unique([summary_id, entry_id])
     @@index([summary_id])
     @@index([entry_id])
   }
   ```

**Risk Level:** 🟡 MEDIUM - Multiple files, but straightforward additions

---

## Testing Requirements

### Test Case 1: Normal Flow
1. Create reservation for 15 spaces
2. Get approved
3. Create 10 entries (5 unused)
4. Submit summary
5. **Verify:**
   - reservation.status = 'summarized'
   - reservation.is_closed = true
   - All 10 entries.status = 'submitted'
   - summaries record created with entries_used=10, entries_unused=5
   - 10 summary_entries records created
   - Capacity refunded by 5

### Test Case 2: Idempotency
1. Submit summary successfully
2. Try to submit again
3. **Verify:** Error thrown: "Summary already submitted"

### Test Case 3: Multiple Reservations
1. Studio creates 2 reservations (15 spaces, 10 spaces)
2. Both approved
3. Create 8 entries for first reservation
4. Create 10 entries for second reservation
5. Submit summary for FIRST reservation only
6. **Verify:**
   - Only 8 entries marked 'submitted'
   - Only first reservation marked 'summarized'
   - Second reservation still 'approved'
   - Capacity refunded by 7 (not 17)

---

## Recommendations

### IMMEDIATE (Pre-Production Blockers)

1. **Run 4 migrations** - Add status values and create tables
2. **Update entry.ts** - Add summaries table logic and idempotency check
3. **Fix entry query** - Filter by reservation_id not studio_id + competition_id
4. **Update schema.prisma** - Add new models
5. **Run `npx prisma generate`** - Regenerate types
6. **Test all 3 test cases** - Verify complete flow

### HIGH PRIORITY (Day 1 Patch)

1. Add frontend guard to prevent re-submission if is_closed=true
2. Add backend validation for summary already exists
3. Create admin UI to view summaries and entry snapshots

### MEDIUM PRIORITY (Week 1)

1. Add summary PDF export functionality
2. Display summary details on invoice generation
3. Add audit log for summary submissions

---

## Estimated Implementation Time

- Migrations: 15 minutes (write + test + deploy)
- Code updates: 45 minutes (entry.ts + schema.prisma)
- Type generation: 5 minutes
- Testing: 30 minutes (all 3 test cases)
- **Total: ~90 minutes**

---

## Risk Assessment

**Production Readiness:** 🔴 BLOCKER

Without these changes:
- Cannot mark reservations as 'summarized' (constraint violation)
- No audit trail for submitted summaries
- Can submit summary multiple times
- Multiple reservations per studio will calculate wrong totals

**Minimum for Launch:**
- All 4 migrations deployed
- Code updated to use new tables
- Idempotency check added
- Test case 1 passing

---

*End of Validation Report*
