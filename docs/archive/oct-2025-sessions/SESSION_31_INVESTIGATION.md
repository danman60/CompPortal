# Session 31 Investigation - Reservation Pipeline 500 Error

**Date:** October 30, 2025
**Status:** Root cause identified ✅

---

## Issue Reported

User reported reservation pipeline broken with 500 error:
- URL: https://empwr.compsync.net/dashboard/reservation-pipeline
- Console error: `Failed to load resource: the server responded with a status of 500`
- Auth error: `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`

---

## Investigation Steps

### 1. Tested with Playwright
- ✅ Page loads successfully
- ✅ Competition cards showing (3 events with capacity counters)
- ✅ Filter tabs working
- ❌ Console shows 500 errors from `reservation.getPipelineView`

### 2. Checked Backend Code
Found in `src/server/routers/reservation.ts` (lines 1285-1289):

```typescript
getPipelineView: protectedProcedure.query(async ({ ctx }) => {
  // Only competition directors and super admins can view pipeline
  if (isStudioDirector(ctx.userRole)) {
    throw new Error('Studio directors cannot access the reservation pipeline');
  }
  // ... rest of query
});
```

### 3. Checked User Role
Queried database for logged-in user `djamusic@gmail.com`:

```sql
SELECT u.email, up.role
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'djamusic@gmail.com';
```

**Result:**
- email: `djamusic@gmail.com`
- role: `studio_director` ⚠️

---

## Root Cause

**The 500 error is CORRECT behavior, not a bug!**

1. User tested with **Studio Director** account
2. Pipeline page is **Competition Director only**
3. Backend correctly blocks Studio Directors with error
4. Frontend handles error gracefully (shows "0 reservations")

**The page architecture:**
- Old component: `src/components/ReservationPipeline.tsx` (deprecated)
- **Active component:** `src/components/rebuild/pipeline/PipelinePageContainer.tsx`
- Uses hook: `usePipelineReservations()` → calls `reservation.getPipelineView`

---

## Why Page Still Loads

The rebuilt pipeline page (`PipelinePageContainer`) fetches data from two sources:

1. **`reservation.getPipelineView`** (failing with 500 ❌)
   - Competition Director only
   - Returns reservation data
   - Error: "Studio directors cannot access..."

2. **`competition.getAll`** (succeeding ✅)
   - Available to all roles
   - Returns competition cards with capacity
   - This is what we see on the page

Frontend has error handling, so when `getPipelineView` fails, it shows "0 reservations" instead of crashing.

---

## Actual Pipeline Bugs (Per Handoff)

These bugs exist but **can only be tested with CD account**:

1. **Counter doesn't auto-update**
   - Problem: Capacity numbers need manual refresh after approve/reject
   - Fix: Add `refetch()` to mutation success handlers

2. **Last Action dates not populating**
   - Problem: "Last Action" column empty
   - Fix: Verify date formatting in backend response

3. **Amount column still exists**
   - Problem: Should be removed from table
   - Fix: Remove column from `ReservationTable.tsx`

---

## Next Steps

### P1: Get CD Credentials
**CD Account:** `empwrdance@gmail.com`
- Need password to test actual pipeline bugs
- Cannot verify/fix bugs without CD access

### P2: Implement Pipeline Fixes
Once CD access obtained:

1. **Fix counter auto-update**
   - File: `src/hooks/rebuild/useReservations.ts`
   - Add `await refetch()` to mutation success handlers
   - Lines: Approve, Reject, CreateInvoice, MarkAsPaid mutations

2. **Fix Last Action dates**
   - File: Backend `src/server/routers/reservation.ts`
   - Check line 1369-1370: `lastActionDate` field
   - Verify date is being returned correctly

3. **Remove Amount column**
   - File: `src/components/rebuild/pipeline/ReservationTable.tsx`
   - Remove totalAmount column from table
   - Update colSpan from 9 to 8

### P3: Add Client-Side Protection (Optional)
Add role check to pipeline page to show "Access Denied" for Studio Directors instead of 500 errors:

```typescript
// In PipelinePageContainer.tsx
const { data: userProfile } = trpc.user.getProfile.useQuery();

if (userProfile?.role === 'studio_director') {
  return <AccessDenied message="This page is only available to Competition Directors" />;
}
```

---

## Commits Made This Session

**Commit e3f50fe:** "fix: Regenerate Prisma client for reservation pipeline"
- Ran `prisma generate` to sync client with schema
- Attempted fix (didn't resolve 500 because it's not a bug)
- ✅ Build passed

---

## Files Investigated

- `src/server/routers/reservation.ts` (lines 1285-1377)
- `src/components/rebuild/pipeline/PipelinePageContainer.tsx`
- `src/hooks/rebuild/useReservations.ts`
- `prisma/schema.prisma` (users table, auth schema)
- Database tables: `auth.users`, `user_profiles`, `reservations`

---

## Database Findings

**User Roles:**
- `djamusic@gmail.com` → Studio Director (tenant_id: null ⚠️)
- `empwrdance@gmail.com` → Competition Director ✅

**tenant_id Issue:**
- Studio Director has `null` tenant_id in user_profiles
- May cause other issues (needs investigation)

---

**Status:** Blocked pending CD credentials

**User Action Required:** Provide password for `empwrdance@gmail.com` to continue testing pipeline bugs.
