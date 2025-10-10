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

### 2. Table View UI Issues (RESOLVED)
**Status:** ✅ FIXED - Commits 4fba46c + 499247f (2025-01-10)
**First Reported:** 2025-01-10
**Severity:** High - Table headers missing, columns misaligned
**Resolution Date:** 2025-01-10

**Problem:**
- Table view rendering but invisible due to insufficient background contrast
- User feedback: "TABLE VIEW COLUMNS STILL MISALIGNED" (all caps)
- Table headers positioned below viewport, not visible on page load
- Data columns showing without header labels, making columns unidentifiable
- User reported: "all the data is completely shifted to the left of the columns its totally broken"

**Root Causes:**
1. **Visibility Issue (4fba46c):**
   - Glassmorphic design using very transparent backgrounds
   - Light backgrounds (`bg-white/10`, `bg-white/5`) invisible against page gradient
   - Insufficient contrast for table visibility

2. **Header Positioning Issue (499247f):**
   - Table container had no max-height constraint
   - Sticky thead only works within scrolling container
   - Headers existed in DOM but positioned ~438px below viewport
   - No scroll container = sticky positioning ineffective

**Solutions Applied:**

**Fix 1 - Visibility (4fba46c):**
- Table container: `bg-white/10` → `bg-gray-900/90` (solid dark background)
- Header row: `bg-white/5` → `bg-gray-800/90` (strong contrast)
- Body rows: alternating `bg-gray-800/40` and `bg-gray-900/20` (zebra striping)
- Added `shadow-2xl` for depth
- Stronger borders: `border-white/30` (was `border-white/20`)

**Fix 2 - Header Visibility (499247f):**
- Added `max-h-[600px] overflow-y-auto` to `.overflow-x-auto` container
- Creates proper scroll container for sticky positioning
- Headers now always visible at top of table
- Sticky header remains in place when scrolling rows

**Files Modified:**
- `src/components/EntriesList.tsx` (lines 777-778, 781, 809-810)

**Production Verification:**
- ✅ Table visible with clear contrast
- ✅ Column headers visible at top of table on page load
- ✅ Headers stick to top when scrolling table content
- ✅ Column headers properly aligned with data columns
- ✅ Zebra striping provides row distinction
- ✅ All text readable against dark background
- ✅ Screenshots: `table-header-fix-verified.png`, `table-header-sticky-verified.png`

---

## Minor Issues

### 3. Animation Description Inaccuracy
**Status:** Cosmetic
**Severity:** Low

**Problem:**
- Loading animation uses ballet shoes emoji (🩰), not ballet dancer
- Code comments refer to it as "ballet dancer"

**Fix:** Update comments to say "ballet shoes" for accuracy

---

*Last Updated: 2025-01-10*
