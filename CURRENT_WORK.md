# Current Work - Entry Creation V2 Debug Session

**Session:** October 28, 2025
**Context:** ~100k/200k tokens (50%)
**Last Commit:** 016840c (debug logging added)
**Build Status:** ✅ PASS (63/63 pages)
**Critical Issue:** Entry creation still failing with 500 error

---

## CRITICAL FINDINGS (October 28, 2025 - Late Session)

**V2 Rebuild Status:** ⚠️ INCOMPLETE - Still has critical bugs

**Issue 1: React Hooks Error (FIXED ✅)**
- **Error:** React error #310 infinite loop
- **Root Cause:** `entry.getAll` query called AFTER early returns (Rules of Hooks violation)
- **Fix:** Moved all `useQuery` hooks to top of component (commit 45e82d4)
- **Status:** ✅ Page loads now

**Issue 2: Entry Creation 500 Error (ACTIVE 🔴)**
- **Error:** `POST /api/trpc/entry.create 500 - Null constraint violation on tenant_id`
- **User Report:** "Still throwing 500 error and duplicates still exist"
- **Diagnostic Steps Completed:**
  1. ✅ Verified `lookup.getAllForEntry` returns correct tenant-filtered data
  2. ✅ Confirmed tenant filter IS working (all items have EMPWR tenant_id)
  3. ✅ Identified duplicates are data quality issue, NOT cross-tenant leak
  4. ✅ Added debug logging to entry.create and lookup.getAllForEntry (commit 016840c)

**Issue 3: Duplicate Dropdowns (DATA QUALITY 🟡)**
- **Example:** "Large Group (10-14)" AND "Large Group (10-24)" both showing
- **Root Cause:** EMPWR tenant has duplicate rows with different ranges
- **Impact:** Confusing UX but not blocking
- **Solution:** Database cleanup needed (low priority)

---

## Diagnostic Evidence

**Network Analysis:**
- `lookup.getAllForEntry` response verified:
  - ageGroups: 12 items (all EMPWR tenant)
  - entrySizeCategories: 8 items (all EMPWR tenant)
  - NO cross-tenant contamination found
  - Tenant filter working correctly

**Duplicate Data Found:**
```json
// EMPWR has TWO "Large Group" definitions:
{
  "name": "Large Group",
  "min_participants": 10,
  "max_participants": 14,
  "per_participant_fee": "55"
},
{
  "name": "Large Group",
  "min_participants": 10,
  "max_participants": 24,
  "base_fee": "110"
}
```

**Backend Code Verified:**
- `entry.create` uses `ctx.tenantId` (line 969 in entry.ts) ✅
- `lookup.getAllForEntry` filters by `ctx.tenantId` ✅
- Context creation defaults to EMPWR tenant (route.ts:50) ✅

---

## Next Steps (URGENT)

**MUST DO FIRST:**
1. **Check Vercel logs** after deployment completes:
   - Look for: `[entry.create] ctx.tenantId: ...`
   - Look for: `[entry.create] ctx.userId: ...`
   - This will show if ctx.tenantId is actually null at runtime

2. **If ctx.tenantId is null:**
   - Check middleware is setting headers correctly
   - Verify user profile has tenant_id populated
   - Check database: `SELECT id, email, tenant_id FROM user_profiles WHERE email = 'danieljohnabrahamson@gmail.com'`

3. **If ctx.tenantId is NOT null:**
   - Issue is with Prisma relation handling
   - May need to use scalar field instead of relation connect
   - Check if `tenants` relation exists in database

**Database Cleanup (Lower Priority):**
- Remove duplicate "Large Group" entry in EMPWR tenant
- Verify all lookup tables have unique names per tenant

---

## Session Summary

**Completed:**
- ✅ Fixed React Hooks violation (45e82d4)
- ✅ Added V2 quick action to dashboard (79e3caa)
- ✅ Diagnosed tenant filtering (WORKING correctly)
- ✅ Identified root cause: data quality + unknown entry.create issue
- ✅ Added debug logging for next session (016840c)

**Key Fixes:**
1. Auth: Entry creation now uses `protectedProcedure` + `ctx.tenantId`
2. Auto-classification: Per Phase 1 spec (youngest dancer age, exact count)
3. Tenant isolation: All lookups filter by tenant_id
4. Type safety: All components use correct V2 types

**Files Changed:**
- Created: useEntryFormV2.ts, EntryCreateFormV2.tsx, create-v2/page.tsx
- Updated: 4 section components (RoutineDetails, DancerSelection, AutoCalculated, FormActions)
- Deleted: Old EntryCreateForm.tsx, useEntryForm.ts (had React error #418)
- Docs: ENTRY_CREATE_REBUILD_ANALYSIS.md (comprehensive), ENTRY_CREATION_BUG.md (resolution)

---

## Testing Status

**⚠️ CANNOT TEST - Entry creation fails with 500 error**

**Immediate Goal:** Fix the `Null constraint violation on tenant_id` error

**Once Fixed - Testing Checklist:**
- [ ] Entry creates successfully (no 500 error)
- [ ] Auto-classification works (youngest age, total count)
- [ ] All 4 save actions work
- [ ] Test on both EMPWR and Glow tenants
- [ ] Clean up duplicate "Large Group" data

---

## Known Issues / Follow-Up

**Database Cleanup (Low Priority):**
- Duplicate rows in classifications table (Titanium x2, Crystal x2)
- Duplicate rows in entry_size_categories (Large Group with different definitions)
- Can clean up after confirming rebuild works

**Architecture Notes:**
- Backend was already correct (dc394c1)
- Frontend just needed to use proper auth context
- Clean rebuild approach worked better than incremental fixes

---

## Resume Instructions (NEXT SESSION)

**IMMEDIATE ACTION:**
1. Check Vercel deployment logs at https://vercel.com/danman60s-projects/comp-portal
2. Look for console.log output:
   ```
   [entry.create] ctx.tenantId: ...
   [lookup.getAllForEntry] ctx.tenantId: ...
   ```
3. Try creating an entry on https://empwr.compsync.net/dashboard/entries/create-v2
4. Check if ctx.tenantId is null or has value

**IF ctx.tenantId IS NULL:**
- User profile doesn't have tenant_id set
- Check: `SELECT id, email, tenant_id FROM user_profiles WHERE email = 'danieljohnabrahamson@gmail.com'`
- May need to populate tenant_id for studio directors

**IF ctx.tenantId HAS VALUE:**
- Prisma relation connect failing
- Try using scalar field: `tenant_id: ctx.tenantId` instead of `tenants: { connect: { id: ctx.tenantId } }`

**Context Files:**
- This file (CURRENT_WORK.md) - Full diagnostic session
- ENTRY_CREATION_BUG.md - Historical attempts
- ENTRY_CREATE_REBUILD_ANALYSIS.md - Original rebuild plan
- src/server/routers/entry.ts:904-910 - Debug logging location
- src/server/routers/lookup.ts:56-83 - Debug logging location

---

## Previous Work Context

**Prior Session (Oct 26):** Phase 3 UX improvements paused for critical bug fix
- 10/25 UX recommendations completed (40%)
- Button component and skeleton loaders pending
- Will resume after entry creation verified working
