# Known Issues - CompPortal

## Critical Issues

### 1. Routine Creation - Auto-Save Corruption (RESOLVED)
**Status:** ✅ FIXED - Commit 0f1add8 (2025-01-10)
**First Reported:** 2025-01-10
**Severity:** High - Blocked routine creation
**Resolution Date:** 2025-01-10

**Problem:**
- Routine creation failing with 500 error
- Multiple cascading errors related to Prisma data handling
- Started with undefined values, then UUID validation, then relation syntax errors

**Root Cause:**
- Frontend passing undefined values for optional fields
- Prisma requiring explicit relation connect syntax, not foreign key IDs
- publicProcedure context missing tenant_id (requires fetching from studio)

**Solution Applied (4 iterations):**

1. **Iteration 1 (debee79):** Filtered undefined values - FAILED (spread operator issue)
2. **Iteration 2 (818e782):** Better filtering - FAILED (wrong relation syntax)
3. **Iteration 3 (335b5f2):** Used Prisma connect syntax - FAILED (tenant_id was null)
4. **Iteration 4 (0f1add8):** ✅ SUCCESS
   - Fetch studio to get tenant_id
   - Use relation connect syntax: `tenants: { connect: { id: studio.tenant_id } }`
   - Applied to all foreign key relations (competitions, studios, age_groups, etc.)

**Files Modified:**
- `src/server/routers/entry.ts` (lines 364-392) - Fixed mutation with relation syntax

**Production Verification:**
- ✅ Routine created successfully in production (empwr.compsync.net)
- ✅ Test routine: "VERIFIED FIX - Routine Creation Success"
- ✅ Page redirected to entries list showing new routine
- ✅ No 500 errors

**Note:** Auto-save feature remains disabled (separate issue - UUID truncation in localStorage)

---

## Minor Issues

### 2. Animation Description Inaccuracy
**Status:** Cosmetic
**Severity:** Low

**Problem:**
- Loading animation uses ballet shoes emoji (🩰), not ballet dancer
- Code comments refer to it as "ballet dancer"

**Fix:** Update comments to say "ballet shoes" for accuracy

---

*Last Updated: 2025-01-10*
