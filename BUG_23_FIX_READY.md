# Bug #23 Fix Report

## Status: ✅ FIXED - Build Passed

---

## Root Cause

The `submitSummary` mutation (entry.ts:140-223) only sent notification emails but **did not update the reservation record**. This caused:

1. Reservation remained in `status: 'approved'` instead of `'submitted'`
2. `spaces_confirmed` still showed original value (e.g., 15) instead of actual submitted routines (e.g., 1)
3. SD could continue creating routines using the "unused" spaces (14 remaining)
4. CD didn't see the reservation as "submitted" for invoicing

---

## Fix Applied

**File**: `src/server/routers/entry.ts`
**Lines**: 169-189 (new code added)

### Changes:

```typescript
// 🐛 FIX Bug #23: Update reservation to reflect actual submitted routines
// Find the reservation for this studio/competition
const reservation = await prisma.reservations.findFirst({
  where: {
    studio_id: studioId,
    competition_id: competitionId,
    status: 'approved', // Only update approved reservations
  },
});

if (reservation) {
  // Update reservation: set spaces_confirmed to actual routine count, mark as submitted
  await prisma.reservations.update({
    where: { id: reservation.id },
    data: {
      spaces_confirmed: routineCount, // Lock to actual submitted count
      status: 'submitted', // Change status so it doesn't show in "available spaces"
      updated_at: new Date(),
    },
  });
}
```

---

## What This Fixes

### Before (Broken):
- SD submits summary with 1/15 routines
- Warning popup shows "14 spaces will be released"
- But reservation still shows 14/15 available
- SD can create 14 more routines
- CD doesn't see submitted summary

### After (Fixed):
- SD submits summary with 1/15 routines
- Reservation updated: `spaces_confirmed = 1`, `status = 'submitted'`
- SD cannot create more routines (capacity locked at 1)
- Reservation no longer shows in "available" list (status changed)
- CD sees `status: 'submitted'` reservations ready to invoice

---

## Build Status

✅ **Build Passed**
```
✓ Compiled successfully in 33.0s
```

---

## Testing Instructions

1. Login as SD with approved reservation (e.g., 15 spaces)
2. Create 1 routine
3. Submit summary
4. **Expected**:
   - Success message
   - Reservation status changes to 'submitted'
   - spaces_confirmed = 1 (not 15)
5. Try to create another routine
6. **Expected**: Error (capacity exceeded - no approved reservations)
7. Login as CD
8. View reservations with `status = 'submitted'`
9. **Expected**: See the submitted reservation ready to invoice

---

## Database Verification

```sql
-- Before submission:
SELECT status, spaces_confirmed FROM reservations
WHERE studio_id = '...' AND competition_id = '...';
-- Result: status='approved', spaces_confirmed=15

-- After submission:
SELECT status, spaces_confirmed FROM reservations
WHERE studio_id = '...' AND competition_id = '...';
-- Expected: status='submitted', spaces_confirmed=1
```

---

**Ready to commit** (waiting for Bug #24 fix to commit both together)
