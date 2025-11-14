# BUG #3 Root Cause Analysis - Data Loss After Reload

**Date:** 2025-11-14
**Status:** ROOT CAUSE IDENTIFIED

---

## Problem

After scheduling 1 routine and reloading the page, ALL 59 routines disappeared:
- Unscheduled: 0
- Scheduled: 0
- Total: 0
- 400 error in console
- Page stuck on "Loading routines..."

---

## Root Cause

**Tenant ID Mismatch Between Frontend and Backend**

### Frontend (schedule/page.tsx:33)
```typescript
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
```

### Backend Context Creation (api/trpc/[trpc]/route.ts:28-49)
1. Extracts subdomain from URL: `"tester"` (from tester.compsync.net)
2. Queries database: `prisma.tenants.findFirst({ where: { subdomain: 'tester' } })`
3. If NO tenant found with subdomain "tester" → `ctx.tenantId = null`

### Query Validation (scheduling.ts:152-154)
```typescript
if (ctx.tenantId !== input.tenantId) {
  throw new Error('Tenant ID mismatch'); // 400 error!
}
```

**Result:**
- `ctx.tenantId = null` (no tenant with subdomain "tester" in DB)
- `input.tenantId = '00000000-0000-0000-0000-000000000003'` (frontend hardcoded)
- **MISMATCH!** → 400 Bad Request → Query fails → No routines loaded

---

## Additional Issue: Scheduled Routines Not Displayed

Even if the tenant mismatch is fixed, there's a second issue:

**getRoutines Only Returns Unscheduled Routines** (scheduling.ts:159)
```typescript
const where: any = {
  competition_id: input.competitionId,
  tenant_id: input.tenantId,
  performance_date: null, // Only unscheduled routines!
};
```

The query **filters OUT** routines with `performance_date !== null`. So:
- Scheduled routines are removed from unscheduled pool ✓
- But there's NO separate query/UI to display scheduled routines ✗
- Result: Scheduled routines become invisible

---

## Solution

### FIX #1: Create Missing Tenant (BLOCKING)

**Option A:** Create tenant with exact ID from frontend
```sql
INSERT INTO tenants (id, subdomain, slug, name, branding, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'tester',
  'test',
  'Test Environment',
  '{}',
  NOW(),
  NOW()
);
```

**Option B:** Update frontend to use correct tenant ID
- Find existing tenant with subdomain "tester"
- Update `TEST_TENANT_ID` in schedule/page.tsx to match

**Recommendation:** Option A (create tenant) to match existing configuration in middleware.ts

###FIX #2: Display Scheduled Routines (FEATURE GAP)

Need to add UI to display scheduled routines in their respective zones.

**Approach:**
1. Create separate query for scheduled routines (where `performance_date IS NOT NULL`)
2. Group by `performance_time` (zone: saturday-am, saturday-pm, etc.)
3. Display in corresponding schedule zone panels
4. Update counts: Scheduled count should reflect actual scheduled routines

---

## Impact

**Priority:** P0 - BLOCKING
- Cannot test scheduling feature without fixing tenant mismatch
- Even after fix, scheduled routines won't be visible without FIX #2

**Affected Components:**
- `src/server/routers/scheduling.ts` (getRoutines query)
- `src/app/dashboard/director-panel/schedule/page.tsx` (frontend)
- Database: `tenants` table

---

## Next Steps

1. **IMMEDIATE:** Create tenant with subdomain "tester" and ID `00000000-0000-0000-0000-000000000003`
2. **IMMEDIATE:** Verify existing test data (competition, routines) is associated with correct tenant
3. **HIGH:** Implement getScheduledRoutines query
4. **HIGH:** Update UI to display scheduled routines in zones
5. **MEDIUM:** Test complete drag-and-drop → persistence → display flow

---

## Files Involved

- `src/app/dashboard/director-panel/schedule/page.tsx:33` - Frontend tenant ID
- `src/app/api/trpc/[trpc]/route.ts:28-49` - Context tenant lookup
- `src/server/routers/scheduling.ts:142-249` - getRoutines query
- `middleware.ts:6` - Middleware tenant ID constant
- Database: `tenants` table - Missing "tester" subdomain entry

---

## Evidence

**Console Error:** 400 Bad Request on `scheduling.getRoutines`
**Symptoms:** All routines disappear, page stuck on "Loading routines..."
**Test Results:** See `SCHEDULING_TEST_RESULTS_FINAL_20251114.md`
