# Bug #3 Root Cause Analysis

## Issue
Summary submitted successfully, but does NOT appear in Competition Director's "Routine Summaries" page.

## Test Results
1. ✅ SD submits summary - success message shown
2. ✅ Summary record created in database
3. ❌ CD cannot see summary in `/dashboard/routine-summaries`

## Root Cause Investigation

### Database State After Submission

**Reservation:**
- ID: `d6b7de60-b4f4-4ed8-99a7-b15864150b6d`
- Studio: "123" (email: danieljohnabrahamson@gmail.com)
- Competition: "QA Automation Event"
- Status: `approved` (should be `summarized`!)
- Spaces Confirmed: 25
- Closed: `false`

**Competition Entries:**
- Entry 1: `43c1db28-a405-4068-9f65-b6ca754d8fcc` - reservation `d6b7de60...` (current)
- Entry 2: `3d432f22-399d-4fea-9813-ec64efaaa7a2` - reservation `09aba73f...` (old/different)

**Summaries Table:**
- **EMPTY** - NO records!

### Why Summary Wasn't Created

Looking at `entry.ts:143-270` (`submitSummary` mutation):

**Line 150-157:** Query finds reservation with status `approved`
```typescript
const reservation = await prisma.reservations.findFirst({
  where: {
    studio_id: studioId,
    competition_id: competitionId,
    status: 'approved',  // ✅ Found reservation d6b7de60...
  },
  select: { id: true },
});
```

**Line 168-174:** Query finds entries by reservation_id
```typescript
prisma.competition_entries.findMany({
  where: {
    reservation_id: reservation?.id,  // Only finds 1 entry!
    status: { not: 'cancelled' },
  },
})
```

**Result:** Only 1 entry found (Entry 1), not 2!

**Line 243-250:** Creates summary record
```typescript
const summary = await prisma.summaries.create({
  data: {
    reservation_id: fullReservation.id,
    entries_used: routineCount,  // routineCount = 1
    entries_unused: unusedSpaces,  // unusedSpaces = 24
    submitted_at: new Date(),
  },
});
```

**BUT:** Database shows summaries table is EMPTY!

This means the code executed successfully up to a point, but the summary creation likely failed silently OR was rolled back.

### Possible Causes

1. **Transaction Rollback:** Code may be wrapped in a transaction that failed after summary creation
2. **Silent Error:** Error in lines 253-268 (snapshot creation or entry status update) caused rollback
3. **Missing Entries:** `entries` array was empty, code never reached line 243

## Next Steps

1. Check if summary creation is inside a transaction that could rollback
2. Add Sentry error logging to capture failures
3. Verify entry status update doesn't fail (line 264-267)
4. Test with properly attached entries (all entries on same reservation)

## UI vs Backend Mismatch

**UI Issue:** EntriesList.tsx shows entries from ALL reservations for the selected competition, not just the current approved reservation. This causes confusion:
- User sees 2 routines
- Clicks "Submit Summary"
- Backend only submits 1 routine (correct reservation)
- UI says "2 routines submitted" (wrong!)

**Fix Required:** Filter entries in UI to only show entries for the active approved reservation.
