# BUG: CD Routines Dashboard Status Display Incorrect

**Date:** 2025-12-27
**Severity:** P2 (UI Display)
**Status:** Fixed (pending deploy)

## Issue
CD Routines dashboard showed all entries as "Draft" even when entries had `entry.status='submitted'`

## Root Cause
**Wrong status field used for display logic:**

```typescript
// BAD - uses reservation status
const isDraft = entry.reservations?.status !== 'summarized';
const statusLabel = isDraft ? 'Draft' : 'Summarized';
```

The code checked `reservation.status` instead of `entry.status`:
- **Reservation status flow:** pending → approved → summarized → invoiced → closed
- **Entry status flow:** draft → submitted → confirmed → performed → scored

When entries were submitted (entry.status='submitted') but reservation was only approved (reservation.status='approved'), the dashboard showed "Draft" incorrectly.

## Affected Files
- `src/components/cd/RoutinesTable.tsx` - Display logic
- `src/components/cd/RoutinesFilters.tsx` - Filter options
- `src/components/cd/RoutinesPageContainer.tsx` - State type
- `src/components/sa/SARoutinesPageContainer.tsx` - Same issue
- `src/server/routers/entry.ts` - Backend filter

## Fix
Changed display and filter logic to use `entry.status` instead of `reservation.status`:

```typescript
// GOOD - uses entry status
const entryStatus = entry.status || 'draft';
if (entryStatus === 'submitted') {
  statusLabel = 'Submitted';
} else if (entryStatus === 'confirmed') {
  statusLabel = 'Confirmed';
}
```

## Impact
- Dancepirations entries for Blue Mountain Spring 2026 were showing as "Draft" when they were actually "Submitted"
- Filter by status was also broken (filtering by reservation.status not entry.status)

## Verification
- Build: Pending (tRPC types need regeneration)
- Production: Test on glow.compsync.net after deploy
