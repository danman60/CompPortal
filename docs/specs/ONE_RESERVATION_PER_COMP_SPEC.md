# One Reservation Per Competition - Specification

**Status:** Draft for Review
**Created:** 2025-11-09
**Purpose:** Enforce single reservation constraint per studio per competition, modify via space adjustments only

---

## 1. Core Principle

**ONE reservation per Studio per Competition**

- Studios can only have ONE active reservation per competition event
- To get more/fewer spaces → modify existing reservation (don't create new one)
- New reservation creation only allowed for different competitions

---

## 2. Business Rules

### 2.1 Duplicate Prevention

**When SD tries to create second reservation for same competition:**
- Block creation entirely
- Show friendly error message:
  > "You already have a reservation for [Competition Name]. Please use 'Request More Spaces' to modify your existing reservation instead."
- Auto-focus/highlight the existing reservation card

**Database Constraint:**
```sql
UNIQUE INDEX reservation_per_studio_per_comp
ON reservations(studio_id, competition_id)
WHERE status NOT IN ('cancelled', 'rejected')
```

### 2.2 Space Modification Workflows

**Studio Director (SD) - Request More Spaces:**
- **Existing UI:** "➕ Request More Spaces" button (ReservationsList.tsx:982-989) ✅ BUILT
- **Flow:** SD requests increase → CD must approve
- **Status:** `approved` → `pending_adjustment` (new status?) → back to `approved` after CD action
- **Backend:** Use existing `handleIncreaseSpaces` mutation

**Competition Director (CD) - Edit Spaces:**
- **Existing UI:** "✏️ Edit Spaces" button (ReservationsList.tsx:1011-1016) ✅ BUILT
- **Flow:** CD can increase OR decrease spaces immediately
- **Decrease behavior:** AUTO-APPROVE (instant capacity refund)
- **Increase behavior:** Must check available capacity first
- **Backend:** Use existing `handleEditSpaces` mutation

### 2.3 Status Transitions

**Keep existing flow (per user request):**
```
pending → approved → summarized → invoiced → paid/closed
```

**Open Question:** Do we need intermediate state for "pending space adjustment"?
- Option A: Add `pending_adjustment` status when SD requests more spaces
- Option B: Track adjustment requests separately, reservation stays `approved`
- **User Preference:** Keep existing flow ← SELECTED

---

## 3. Current Implementation Status

### ✅ Already Built (Session Context)

1. **SD "Request More Spaces" button** - ReservationsList.tsx:982-989
2. **CD "Edit Spaces" button** - ReservationsList.tsx:1011-1016
3. **CD "Reduce Capacity" button** - REMOVED this session (redundant with Edit Spaces)
4. **Tenant isolation fixes** - Commit 98608fa (added tenant_id filtering)
5. **Transaction timeout fix** - Commit c33f03c (moved logActivity outside transaction)
6. **Grid layout for reservations** - Commit 98608fa (responsive cards)

### ❌ Still Need to Build

1. **Duplicate reservation prevention:**
   - Frontend validation on "New Reservation" button
   - Backend validation in `reservation.create` mutation
   - Database unique constraint (partial index excluding cancelled/rejected)
   - User-friendly error messaging

2. **Space decrease auto-approval:**
   - Modify `handleEditSpaces` backend to auto-approve decreases
   - Instant capacity refund when SD/CD reduces spaces
   - Capacity ledger entry with reason: `space_decrease`

3. **UI/UX improvements:**
   - Disable "New Reservation" button if active reservation exists for competition
   - Show tooltip: "You already have a reservation. Use 'Request More Spaces' instead."
   - Highlight existing reservation when duplicate is attempted

---

## 4. Implementation Tasks

### Phase 1: Duplicate Prevention (CRITICAL)

**Frontend (ReservationsList.tsx or New Reservation Page):**
```typescript
// Check if studio already has reservation for this competition
const existingReservation = reservations.find(
  r => r.competition_id === selectedCompId &&
       !['cancelled', 'rejected'].includes(r.status)
);

if (existingReservation) {
  toast.error("You already have a reservation for this competition. Please use 'Request More Spaces' instead.");
  // Scroll to and highlight existing reservation card
  return;
}
```

**Backend (reservation.ts:create mutation):**
```typescript
// Check for existing non-cancelled reservation
const existing = await tx.reservations.findFirst({
  where: {
    studio_id: input.studioId,
    competition_id: input.competitionId,
    tenant_id: ctx.tenantId,
    status: {
      notIn: ['cancelled', 'rejected']
    }
  }
});

if (existing) {
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'You already have an active reservation for this competition. Please modify your existing reservation instead.'
  });
}
```

**Database Migration:**
```sql
-- Add partial unique index (allows multiple cancelled/rejected, single active)
CREATE UNIQUE INDEX reservation_per_studio_per_comp
ON reservations(studio_id, competition_id, tenant_id)
WHERE status NOT IN ('cancelled', 'rejected');
```

### Phase 2: Auto-Approve Decreases

**Backend (reservation.ts - Edit Spaces mutation):**
```typescript
// When CD/SD decreases spaces
if (newSpaces < currentSpaces) {
  const spacesReturned = currentSpaces - newSpaces;

  // Auto-approve decrease (instant capacity refund)
  await tx.reservations.update({
    where: { id: reservationId },
    data: {
      spaces_confirmed: newSpaces,
      spaces_requested: newSpaces, // Keep in sync
    }
  });

  // Refund capacity immediately
  await tx.competitions.update({
    where: { id: competitionId },
    data: {
      available_reservation_tokens: { increment: spacesReturned }
    }
  });

  // Log capacity refund
  await tx.capacity_ledger.create({
    data: {
      tenant_id: ctx.tenantId,
      competition_id: competitionId,
      reservation_id: reservationId,
      change_amount: spacesReturned, // POSITIVE = capacity returned
      reason: 'space_decrease_by_' + (ctx.user.role === 'studio_director' ? 'sd' : 'cd'),
      created_by: ctx.userId
    }
  });
}
```

### Phase 3: UI/UX Polish

1. **Disable "New Reservation" button:**
   - Check if studio has existing reservation for selected competition
   - Show disabled state with tooltip

2. **Auto-scroll to existing:**
   - When duplicate attempt detected, scroll to existing reservation card
   - Briefly highlight/pulse the card (visual feedback)

3. **Confirmation dialogs:**
   - "Are you sure you want to decrease spaces? This will refund [X] spaces to the competition."
   - "Request [X] additional spaces for [Competition]? Your Competition Director will need to approve."

---

## 5. Edge Cases & Validation

### Edge Case 1: Space Decrease Below Entry Count
**Scenario:** Studio has 10 spaces, created 8 entries, tries to reduce to 5 spaces

**Validation:**
```typescript
const entryCount = await tx.competition_entries.count({
  where: { reservation_id: reservationId }
});

if (newSpaces < entryCount) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Cannot reduce to ${newSpaces} spaces. You have ${entryCount} routines already created. Please delete some routines first.`
  });
}
```

### Edge Case 2: Concurrent Modification
**Scenario:** Two CDs edit same reservation simultaneously

**Solution:** Use optimistic locking with `updated_at` timestamp
```typescript
const updated = await tx.reservations.updateMany({
  where: {
    id: reservationId,
    updated_at: input.expectedTimestamp // Pass from frontend
  },
  data: { spaces_confirmed: newSpaces }
});

if (updated.count === 0) {
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'This reservation was modified by someone else. Please refresh and try again.'
  });
}
```

### Edge Case 3: Cancelled/Rejected Reservations
**Scenario:** Studio has cancelled reservation, wants to create new one

**Solution:** Allow new reservation creation (partial unique index excludes cancelled/rejected)

---

## 6. Testing Checklist

**Duplicate Prevention:**
- [ ] SD cannot create 2nd reservation for same competition
- [ ] Error message shows and highlights existing reservation
- [ ] Can create reservation for different competition
- [ ] Can create new reservation after cancelling previous one

**Space Modifications:**
- [ ] SD "Request More Spaces" sends request to CD for approval
- [ ] CD "Edit Spaces" can increase immediately (if capacity available)
- [ ] CD "Edit Spaces" decrease auto-approves and refunds capacity
- [ ] Cannot decrease below current entry count
- [ ] Capacity ledger logs all changes correctly

**Multi-Tenant Isolation:**
- [ ] EMPWR reservations don't block GLOW reservations
- [ ] tenant_id filter on all duplicate checks
- [ ] Capacity refunds go to correct tenant's competition

**Status Flow:**
- [ ] Existing status transitions still work (pending → approved → summarized → invoiced)
- [ ] Space modifications don't break invoice generation
- [ ] Summary submission still refunds unused capacity

---

## 7. Migration Plan

### Step 1: Audit Existing Data
```sql
-- Find any duplicate active reservations (should be 0)
SELECT studio_id, competition_id, tenant_id, COUNT(*) as count
FROM reservations
WHERE status NOT IN ('cancelled', 'rejected')
GROUP BY studio_id, competition_id, tenant_id
HAVING COUNT(*) > 1;
```

### Step 2: Apply Database Constraint
```sql
-- Only apply if Step 1 returns 0 rows
CREATE UNIQUE INDEX CONCURRENTLY reservation_per_studio_per_comp
ON reservations(studio_id, competition_id, tenant_id)
WHERE status NOT IN ('cancelled', 'rejected');
```

### Step 3: Deploy Backend Validation
- Deploy reservation.create validation
- Deploy auto-approve decrease logic
- Monitor logs for any constraint violations

### Step 4: Deploy Frontend Changes
- Deploy duplicate prevention UI
- Deploy auto-scroll to existing reservation
- Deploy confirmation dialogs

---

## 8. Open Questions for User

**Q1:** Should we allow SD to decrease their own spaces, or only CD?
- **Option A:** SD can request decrease → CD must approve (symmetrical with increases)
- **Option B:** SD can auto-decrease (give them more control)
- **Recommendation:** Auto-decrease for SD (they're giving back capacity, low risk)

**Q2:** What happens to space adjustment requests when reservation reaches 'summarized' status?
- **Option A:** Lock space modifications after summary submitted
- **Option B:** Allow CD to adjust even after summary (adjust summary too)
- **Recommendation:** Lock modifications after summary (force cancel/recreate if needed)

**Q3:** Should we add a "Modification History" panel showing all space changes?
- **Option A:** Yes, show full audit trail of increases/decreases
- **Option B:** No, capacity_ledger is sufficient for SA debugging
- **Recommendation:** Not MVP, add later if CDs request it

---

## 9. Success Criteria

**Deployment is successful when:**
1. ✅ Zero duplicate active reservations possible (database enforces)
2. ✅ SD can request more spaces via existing button
3. ✅ CD can increase/decrease spaces via existing button
4. ✅ Space decreases auto-approve and refund capacity instantly
5. ✅ Clear error messages guide users to correct workflow
6. ✅ All existing reservations continue to work (backward compatible)
7. ✅ Multi-tenant isolation maintained (EMPWR vs GLOW)
8. ✅ Capacity ledger logs all modifications correctly

---

**Next Step:** Review this spec, answer open questions, then proceed with implementation in priority order.
