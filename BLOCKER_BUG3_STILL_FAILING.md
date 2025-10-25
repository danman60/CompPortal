# BLOCKER: Bug #3 Still Failing After Transaction Fix

**Date:** October 25, 2025 2:10pm UTC
**Status:** 🔴 CRITICAL BLOCKER
**Deployment:** commit bcb6cf8 (deployed and tested)

## Summary

Bug #3 transaction wrapper fix (commit 9818afe) was deployed successfully, but summary submission is STILL failing silently. UI shows success message but database records are not created.

## Evidence

### Test Results (Playwright MCP - Production)
1. ✅ Navigated to https://www.compsync.net/dashboard/entries
2. ✅ Clicked "Submit Summary" button
3. ✅ Clicked "Submit Anyway" in modal
4. ✅ UI showed: "Summary submitted with 2 routines! 23 unused spaces released."
5. ✅ Button changed to "✓ Summary Submitted" (disabled)
6. ❌ **Database: summaries table is EMPTY**
7. ❌ **Reservation status still "approved" (should be "summarized")**
8. ❌ **Reservation is_closed still false (should be true)**

### Database State After Submission
```sql
-- Summaries table
SELECT * FROM summaries ORDER BY submitted_at DESC LIMIT 1;
-- Result: [] (EMPTY!)

-- Reservation status
SELECT id, status, spaces_confirmed, is_closed
FROM reservations
WHERE id = 'd6b7de60-b4f4-4ed8-99a7-b15864150b6d';
-- Result: {"status":"approved","spaces_confirmed":25,"is_closed":false}
-- Expected: {"status":"summarized","spaces_confirmed":2,"is_closed":true}

-- Entries
SELECT id, title, status, reservation_id
FROM competition_entries
WHERE studio_id = '6b5253c9-9729-4229-921b-f6080cbac2a1'
  AND competition_id = '2121d20a-62fc-4aa3-a6aa-be9e7c4e140a';
-- Result:
-- 1. 43c1db28 - "Test Routine..." - draft - d6b7de60... (CURRENT reservation)
-- 2. 3d432f22 - "123" - draft - 09aba73f... (OLD reservation)
```

### UI vs Backend Mismatch
- **UI shows:** 2 routines
- **Backend filters:** Only 1 routine (43c1db28) attached to current reservation
- **UI issue:** EntriesList.tsx shows entries from ALL reservations (Bug from previous session)

## Root Cause Analysis

The Bug #3 fix (transaction wrapper in entry.ts:208-304) is in the deployed code, verified by:
1. ✅ Git commit 9818afe exists
2. ✅ Comment added at entry.ts:3 for cache busting
3. ✅ Build succeeded (bcb6cf8)
4. ✅ Deployment READY on production

**Possible causes:**
1. **Silent exception in transaction** - Error thrown but caught somewhere
2. **Validation failing** - Empty entry check or reservation check triggering
3. **Capacity refund failing** - capacityService.refund() throwing error
4. **Database constraint violation** - CHECK constraint or foreign key failing
5. **Frontend optimistic update** - UI showing success before backend completes

## Code Deployed (entry.ts:181-304)

The transaction wrapper exists in production:
```typescript
// Line 184-190: Empty entry validation
if (routineCount === 0) {
  throw new TRPCError({ code: 'BAD_REQUEST', ... });
}

// Line 200-205: Missing reservation validation
if (!fullReservation) {
  throw new TRPCError({ code: 'NOT_FOUND', ... });
}

// Line 208-304: Transaction wrapper
await prisma.$transaction(async (tx) => {
  // Idempotency check
  // Update reservation
  // Refund capacity (throws on error)
  // Create summary
  // Create entry snapshots
  // Update entry statuses
  // Log activity
});
```

## Next Steps Required

### 1. Check Vercel Runtime Logs (URGENT)
Need to see actual error being thrown:
```bash
vercel logs --follow
# OR via MCP
mcp__vercel__get_deployment_logs(deployment_id, service='edge-function')
```

### 2. Add Detailed Logging
Temporarily add console.log statements to trace execution:
```typescript
console.log('[SUBMIT_SUMMARY] Start:', { studioId, competitionId, routineCount });
console.log('[SUBMIT_SUMMARY] Entries:', entries.map(e => e.id));
console.log('[SUBMIT_SUMMARY] Reservation:', fullReservation?.id);
console.log('[SUBMIT_SUMMARY] Transaction start');
// ... in transaction
console.log('[SUBMIT_SUMMARY] Summary created:', summary.id);
console.log('[SUBMIT_SUMMARY] Transaction complete');
```

### 3. Test with Fresh Data
Current test has data pollution (2 reservations, entries on wrong reservation). Need fresh test:
- Create new studio
- Request 10 spaces
- CD approves
- Create 8 routines
- Submit summary
- Verify database

### 4. Check Frontend Error Handling
Verify if frontend is catching errors and showing success anyway:
```typescript
// In submitSummary mutation onSuccess vs onError
// Check if optimistic update is running before backend completes
```

## Impact

- **Phase 1 workflow:** 0% Complete (completely blocked)
- **Summary approval:** Cannot test (no summaries to approve)
- **Invoice generation:** Cannot test (no confirmed entries)
- **Production readiness:** ❌ BLOCKED

## Deployment History

- **b61539e** (docs only) - Used cached build from d599f73 ❌
- **9818afe** (Bug #3 fix) - NOT deployed due to cache ❌
- **bcb6cf8** (cache bust) - Deployed Bug #3 fix ✅ BUT STILL FAILING ❌

## Technical Details

**Reservation ID:** d6b7de60-b4f4-4ed8-99a7-b15864150b6d
**Studio ID:** 6b5253c9-9729-4229-921b-f6080cbac2a1
**Competition ID:** 2121d20a-62fc-4aa3-a6aa-be9e7c4e140a
**Entry ID (current):** 43c1db28-a405-4068-9f65-b6ca754d8fcc
**Entry ID (old):** 3d432f22-399d-4fea-9813-ec64efaaa7a2

## Files Involved

- `src/server/routers/entry.ts` (lines 181-304) - submitSummary mutation
- `src/server/services/capacity.ts` - refund() method
- `src/components/EntriesList.tsx` - UI filter bug (shows all entries)
- Database tables: summaries, summary_entries, reservations, competition_entries

---

**URGENT:** Need to investigate Vercel runtime logs or add debug logging to identify exact failure point.
