# Capacity & Reservation Workflows Map

**Last Updated:** 2025-11-08
**Purpose:** Quick reference for capacity management, reservation approval, and summary submission workflows

---

## Table of Contents

1. [Capacity Management System](#capacity-management-system)
2. [Reservation Approval Flow](#reservation-approval-flow)
3. [Summary Submission Flow](#summary-submission-flow)
4. [Entry Creation Flow](#entry-creation-flow)
5. [Common Issues & Debugging](#common-issues--debugging)
6. [Database Schema Reference](#database-schema-reference)

---

## 1. Capacity Management System

### Core Service: CapacityService

**Location:** `src/server/services/capacity.ts`

**Purpose:** Single source of truth for ALL capacity changes. Every capacity operation MUST go through this service.

### Key Methods

#### reserve() - Decrement Capacity
**Called by:** Reservation approval flow
**Location:** `capacity.ts:25-150`

**Atomic Operations (in order):**
1. **Acquire PostgreSQL advisory lock** (line 49)
   - Prevents race conditions
   - Lock auto-released when transaction ends
2. **Check reservation status** (line 68-74)
   - Must be `pending` (not already approved)
3. **Check ledger for idempotency** (line 76-90)
   - Prevents double-processing
4. **Validate capacity available** (line 106-112)
   - Throws error if insufficient
5. **Create capacity_ledger entry** (line 119-128)
   - `change_amount: -spaces` (negative = deduction)
   - `reason: 'reservation_approval'`
   - `reservation_id: reservationId`
6. **Decrement available_reservation_tokens** (line 131-138)
   - `competitions.available_reservation_tokens -= spaces`
7. **Update reservation status** (line 141-150)
   - `status: 'approved'`
   - `spaces_confirmed: spaces`
   - `approved_at: new Date()`
   - `approved_by: userId`

**Transaction guarantees:**
- All 3 operations succeed together OR all fail
- No partial updates possible
- Unique constraint on ledger prevents duplicates

#### refund() - Increment Capacity
**Called by:** Summary submission (when studio uses fewer spaces than confirmed)
**Location:** `capacity.ts:152-220`

**Atomic Operations:**
1. Create ledger entry: `change_amount: +spaces` (positive = refund)
2. Increment `available_reservation_tokens`
3. Update reservation metadata

#### cancel() - Full Refund
**Called by:** Reservation cancellation
**Location:** `capacity.ts:222-280`

**Atomic Operations:**
1. Create ledger entry: `change_amount: +spaces_confirmed`
2. Increment `available_reservation_tokens`
3. Set `status: 'cancelled'`

---

## 2. Reservation Approval Flow

### User Journey (CD Perspective)

**Page:** `/dashboard/reservation-pipeline`
**Component:** `src/components/ReservationPipeline.tsx`

**Steps:**
1. CD views pending reservations
2. Clicks "Approve" button → Opens approval modal
3. Modal shows:
   - Requested spaces
   - Current capacity usage
   - Approval amount input (can adjust down)
4. CD enters approval amount and confirms
5. Backend processes approval

### Backend Flow

**Router:** `src/server/routers/reservation.ts`
**Procedure:** `approve` (line 647-830)

**Validation:**
1. **Role check** (line 657-659)
   - Only CD or SA can approve
2. **Status guard** (line 677-681)
   - Must be `pending` (not already approved)
3. **Capacity reservation** (line 686-707)
   - Calls `CapacityService.reserve()`
   - Atomic: creates ledger + decrements capacity + updates status

**Post-approval:**
- Activity logging (line 737-753)
- Email notification (line 755-830) - if enabled in preferences

### Frontend Data Flow

**Component:** `src/components/rebuild/pipeline/ApprovalModal.tsx`

**Capacity calculation:**
```typescript
const totalCapacity = competition.total_reservation_tokens || 600;
const availableCapacity = competition.available_reservation_tokens ?? totalCapacity;
const reservedCount = totalCapacity - availableCapacity;
```

**Display:**
- Used spaces: `reservedCount`
- Remaining: `availableCapacity`
- Capacity bar: `(reservedCount / totalCapacity) * 100%`

---

## 3. Summary Submission Flow

### User Journey (SD Perspective)

**Page:** `/dashboard/entries`
**Component:** `src/components/rebuild/entries/EntriesPageContainer.tsx`

**Steps:**
1. SD creates entries (routines)
2. When done, clicks "Submit Summary" button
3. Modal shows:
   - Routines created vs. spaces confirmed
   - Estimated invoice total
   - Deposit amount
4. SD confirms submission
5. Backend processes summary

### Backend Flow

**Router:** `src/server/routers/entry.ts`
**Procedure:** `submitSummary` (line 161-400)

**Critical Query (line 168-176):**
```typescript
const reservation = await prisma.reservations.findFirst({
  where: {
    tenant_id: ctx.tenantId!,
    studio_id: studioId,
    competition_id: competitionId,
    status: 'approved',  // ← MUST be 'approved' (not 'summarized' or 'pending')
  },
  select: { id: true },
});
```

**Problem:** Once a reservation moves to `summarized`, this query fails to find it.

**Validation:**
1. **Find approved reservation** (line 168-176)
2. **Verify reservation exists** (line 257-262)
3. **Check if entries exist** (line 241-247)
4. **Verify tenant isolation** (line 264-270)

**Capacity refund logic (line 272-278):**
```typescript
const originalSpaces = fullReservation.spaces_confirmed || 0;
const routineCount = entries.length;
const unusedSpaces = originalSpaces - routineCount;

// If studio used fewer spaces than confirmed, refund the difference
if (unusedSpaces > 0) {
  await capacityService.refund(competitionId, unusedSpaces, reservationId, userId);
}
```

**Transaction operations:**
1. Create summary record
2. Refund unused capacity (if any)
3. Update reservation status to `summarized`
4. Create activity log

### Frontend Data Flow

**Component:** `src/components/rebuild/entries/SubmitSummaryModal.tsx`

**Payload (line 65-68):**
```typescript
await onConfirm({
  studioId: reservation.studio_id,      // From selected reservation
  competitionId: reservation.competition_id,
});
```

**Security:** Studios can only submit for their own reservations (filtered by `ctx.studioId` in backend).

---

## 4. Entry Creation Flow

### User Journey (SD Perspective)

**Page:** `/dashboard/entries`
**Component:** `src/components/rebuild/entries/EntryCreateFormV2.tsx` (or similar)

**Steps:**
1. SD selects reservation from dropdown
2. Fills in routine details:
   - Title
   - Category, classification, age group
   - Music info
   - Choreographer
3. Selects dancers (participants)
4. Submits form

### Backend Flow

**Router:** `src/server/routers/entry.ts`
**Procedure:** `create` (line 1100-1400)

**Auto-linking to reservation (line 1165-1176):**
```typescript
if (!data.reservation_id) {
  const approvedReservation = await prisma.reservations.findFirst({
    where: {
      studio_id: data.studio_id,
      competition_id: data.competition_id,
      status: 'approved',  // ← Only links to approved reservations
    },
    select: { id: true },
  });
  if (approvedReservation) {
    createData.reservation_id = approvedReservation.id;
  }
}
```

**Validation:**
- Required fields check
- Age calculation for dancers
- Tenant isolation
- Capacity check (optional - frontend usually prevents over-creation)

---

## 5. Common Issues & Debugging

### Issue: "No approved reservation found"

**Symptom:** Error when submitting summary or creating entries

**Causes:**
1. Reservation status is `summarized` (already submitted) → Query looks for `approved` only
2. Reservation status is `pending` (not approved yet)
3. Reservation doesn't exist for that studio/competition combo
4. Tenant isolation preventing access

**Debug queries:**
```sql
-- Check reservation status
SELECT id, status, spaces_confirmed, approved_at
FROM reservations
WHERE studio_id = '{studioId}'
  AND competition_id = '{competitionId}'
  AND tenant_id = '{tenantId}';

-- Check which statuses exist
SELECT status, COUNT(*)
FROM reservations
WHERE studio_id = '{studioId}'
GROUP BY status;
```

**Fix:**
- If status is `summarized`: Studio already submitted (can't submit again)
- If status is `pending`: CD needs to approve first
- If multiple reservations exist: Check which one has entries linked to it

### Issue: Capacity Counter Wrong

**Symptom:** Pipeline shows incorrect available spaces

**Causes:**
1. Bulk-inserted reservations missing `capacity_ledger` entries
2. Manual database edits bypassed CapacityService
3. Refund logic didn't execute during summary submission
4. Race condition (rare - should be prevented by advisory locks)

**Debug queries:**
```sql
-- Calculate actual vs. DB capacity
SELECT
  c.id,
  c.name,
  c.total_reservation_tokens,
  c.available_reservation_tokens as db_available,
  -- Sum confirmed spaces from approved/summarized/invoiced/paid
  COALESCE(SUM(CASE
    WHEN r.status IN ('approved', 'summarized', 'invoiced', 'paid', 'closed')
    THEN r.spaces_confirmed
    ELSE 0
  END), 0) as actual_confirmed,
  -- What available SHOULD be
  c.total_reservation_tokens - COALESCE(SUM(CASE
    WHEN r.status IN ('approved', 'summarized', 'invoiced', 'paid', 'closed')
    THEN r.spaces_confirmed
    ELSE 0
  END), 0) as should_be_available,
  -- Discrepancy
  c.available_reservation_tokens - (c.total_reservation_tokens - COALESCE(SUM(CASE
    WHEN r.status IN ('approved', 'summarized', 'invoiced', 'paid', 'closed')
    THEN r.spaces_confirmed
    ELSE 0
  END), 0)) as discrepancy
FROM competitions c
LEFT JOIN reservations r ON c.id = r.competition_id
WHERE c.id = '{competitionId}'
GROUP BY c.id, c.name, c.total_reservation_tokens, c.available_reservation_tokens;
```

**Check ledger:**
```sql
-- Verify ledger entries exist for all approved reservations
SELECT
  r.id as reservation_id,
  s.name as studio_name,
  r.spaces_confirmed,
  (SELECT COUNT(*) FROM capacity_ledger
   WHERE reservation_id = r.id
   AND reason = 'reservation_approval') as has_ledger
FROM reservations r
JOIN studios s ON r.studio_id = s.id
WHERE r.competition_id = '{competitionId}'
  AND r.status IN ('approved', 'summarized', 'invoiced', 'paid')
  AND r.spaces_confirmed > 0;
```

**Fix:**
- If `has_ledger = 0`: Missing ledger entry (bulk insert issue)
- Create missing ledger entries via migration
- Recalculate `available_reservation_tokens` from actual reservations

### Issue: Cross-Studio Data Leak

**Symptom:** Studio sees another studio's data

**Security checks (should prevent this):**
1. **Backend filter** (`reservation.ts:118-119`):
   ```typescript
   if (isStudioDirector(ctx.userRole) && ctx.studioId) {
     where.studio_id = ctx.studioId;
   }
   ```
2. **Tenant filter** (`reservation.ts:113-115`):
   ```typescript
   if (!isSuperAdmin(ctx.userRole) && ctx.tenantId) {
     where.tenant_id = ctx.tenantId;
   }
   ```
3. **Client-side filter** (`useEntriesFilters.ts:36-41`):
   ```typescript
   const selectableReservations = reservations.filter(r =>
     ['approved', 'adjusted', 'summarized', 'invoiced', 'closed'].includes(r.status || '')
   );
   ```

**If leak detected:**
- Check `ctx.studioId` is set correctly in `trpc.ts:68-89`
- Verify middleware sets `ctx.tenantId` from subdomain
- Run cross-tenant leak query (see DEBUGGING.md)

---

## 6. Database Schema Reference

### competitions table
```typescript
{
  id: string (uuid)
  tenant_id: string (uuid) ← FK to tenants
  name: string
  year: number
  total_reservation_tokens: number ← Total capacity
  available_reservation_tokens: number ← Remaining capacity (decremented on approval)
  created_at: timestamp
  updated_at: timestamp
}
```

### reservations table
```typescript
{
  id: string (uuid)
  tenant_id: string (uuid) ← FK to tenants
  studio_id: string (uuid) ← FK to studios
  competition_id: string (uuid) ← FK to competitions
  status: enum ← 'pending' | 'approved' | 'summarized' | 'invoiced' | 'paid' | 'closed'
  spaces_requested: number ← What studio asked for
  spaces_confirmed: number ← What CD approved (may be less)
  approved_at: timestamp?
  approved_by: string (uuid)? ← FK to users
  created_at: timestamp
  updated_at: timestamp
}
```

**Status flow:**
`pending → approved → summarized → invoiced → paid/closed`

### capacity_ledger table (Audit Trail)
```typescript
{
  id: string (uuid)
  tenant_id: string (uuid) ← FK to tenants
  competition_id: string (uuid) ← FK to competitions
  reservation_id: string (uuid)? ← FK to reservations
  change_amount: number ← Negative = deduction, Positive = refund
  reason: enum ← 'reservation_approval' | 'summary_refund' | 'reservation_cancellation' | 'manual_adjustment'
  created_by: string (uuid)? ← FK to users
  created_at: timestamp
}
```

**Unique constraint:** `[reservation_id, reason]` for 'reservation_approval' (prevents duplicates)

### competition_entries table
```typescript
{
  id: string (uuid)
  tenant_id: string (uuid) ← FK to tenants
  studio_id: string (uuid) ← FK to studios
  competition_id: string (uuid) ← FK to competitions
  reservation_id: string (uuid)? ← FK to reservations (auto-linked to approved reservation)
  title: string
  category_id: string (uuid)
  classification_id: string (uuid)
  age_group_id: string (uuid)
  entry_size_category_id: string (uuid)
  status: string ← 'registered' | 'cancelled' | 'scheduled' | 'completed'
  total_fee: decimal
  created_at: timestamp
  updated_at: timestamp
}
```

---

## When to Load This Map

**Load `CAPACITY_WORKFLOWS.md` when:**
- Debugging capacity counter discrepancies
- Investigating "No approved reservation found" errors
- Understanding reservation approval flow
- Tracing summary submission issues
- Adding new capacity-related features
- Bulk data import needs to match manual flow

**Don't load when:**
- Simple CRUD operations on unrelated tables
- UI-only changes
- Report generation
- Authentication issues
- Non-capacity related bugs

---

**Maintained by:** Claude Code
**Related files:** `CODEBASE_MAP.md`, `DEBUGGING.md`, `GOTCHAS.md`
