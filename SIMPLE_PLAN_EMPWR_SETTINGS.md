# Simple Plan: Fixing EMPWR Competition Settings

**Date:** October 30, 2025
**For:** Pre-Launch - Tomorrow
**Written in:** 8th Grade English (simple and clear)

---

## What's The Problem?

Think of your competition like a rulebook. Every dance competition needs rules like:
- What age groups can compete? (Kids, Teens, Adults)
- What dance styles are allowed? (Ballet, Jazz, Hip-Hop)
- How much does it cost to enter? ($115 for solo, $70 per dancer for duets)
- How do we score dancers? (Bronze, Silver, Gold medals)

Right now, your **database** (where we store all the information) has some **wrong or incomplete rules** for EMPWR. It's like having a rulebook with missing pages or typos.

---

## How The System Works Right Now

### The Good News ✅

**Entry Fees Are Perfect:**
- Solo costs $115 ✅
- Duet/Trio costs $70 per dancer ✅
- Groups cost $55 per dancer ✅

These match your PDF brochure exactly!

**The system already knows:**
1. EMPWR and Glow are separate competitions (like two different schools)
2. EMPWR dancers can't see Glow's stuff (and vice versa)
3. When creating an entry, it calculates the price from the database

### The Problems ❌

**1. Age Groups Are Messed Up**
- Your PDF says: 6 age groups (Micro, Mini, Junior, Intermediate, Senior, Adult)
- Database has: 12 age groups (duplicates and wrong age ranges)
- Problem: Studio directors see confusing dropdown with duplicate options

**2. Missing Dance Styles**
- Your PDF lists: 14 dance styles
- Database has: 9 dance styles
- Missing: Contemporary Ballet, Open, Song & Dance, Modern, Production

**3. Wrong Classification Names**
- Your PDF says: Novice, Part-Time, Competitive
- Database has: Recreational, Crystal, Elite, Titanium, Competitive
- Problem: Wrong names, wrong rules

**4. Missing Scoring Levels**
- Your PDF has: Bronze, Silver, Gold, Titanium, Platinum, Pandora (6 levels)
- Database has: Bronze, Silver, Gold, Diamond, Platinum (5 levels)
- Missing: Titanium and Pandora
- Wrong: Diamond (doesn't exist in your PDF)

---

## Where These Settings Are Used (The Critical Parts)

### 1. Entry Creation Form
**What happens:** Studio director creates a new dance routine

**Uses these settings:**
- Age Groups dropdown → Shows all 12 wrong options ❌
- Dance Style dropdown → Missing 5 styles ❌
- Classification dropdown → Shows wrong names ❌
- Entry Size (Solo, Duet, Group) → Works perfect ✅
- Price calculation → Works perfect ✅

**File:** `src/components/rebuild/entries/EntryCreateFormV2.tsx`
**How it gets data:** Calls `lookup.getAllForEntry()` which queries database

---

### 2. Invoice Creation
**What happens:** System generates a bill for the studio

**Uses these settings:**
- Reads entry fees from entries (already calculated) ✅
- Shows dance category names ✅
- Shows entry size names ✅
- Calculates tax and total ✅

**File:** `src/server/routers/invoice.ts`
**Status:** WORKING - Uses data already saved in entries

---

### 3. Dancer Creation
**What happens:** Studio director adds a new dancer to their roster

**Uses these settings:**
- Age groups (to calculate which division dancer fits in)
- Classifications (Novice, Competitive, etc.)

**File:** `src/server/routers/dancer.ts`
**Status:** WORKING but will show wrong dropdown options

---

### 4. Analytics/Reports
**What happens:** Competition director views entry statistics

**Uses these settings:**
- Groups entries by age group ✅
- Groups entries by dance category ✅
- Shows counts and breakdowns ✅

**Files:** `src/server/routers/analytics.ts`, `src/server/routers/reports.ts`
**Status:** WORKING - Uses relationships from entries

---

### 5. Future: Judge Scoring (Phase 3)
**What happens:** Judges score routines during the competition

**Will use these settings:**
- Scoring tiers (Bronze, Silver, Gold, etc.) ❌ Missing Titanium & Pandora
- Age groups (to calculate awards per division)
- Classifications (to calculate awards per level)

**Status:** NOT BUILT YET - But we need correct settings before Phase 3

---

## Security Issues Found 🚨

**Problem:** Some lookup queries DON'T filter by tenant (EMPWR vs Glow)

**Bad Code Found:**
```typescript
// lookup.ts lines 8-17 - PUBLIC, NO TENANT FILTER
getCategories: publicProcedure.query(async () => {
  const categories = await prisma.dance_categories.findMany({
    where: {
      is_active: true,  // ❌ Missing tenant_id filter!
    },
  });
});
```

**What this means:** If someone calls `getCategories()`, they might see BOTH EMPWR and Glow categories mixed together.

**Good Code (Already exists):**
```typescript
// lookup.ts lines 48-78 - PROTECTED, HAS TENANT FILTER
getAllForEntry: protectedProcedure.query(async ({ ctx }) => {
  const categories = await prisma.dance_categories.findMany({
    where: {
      is_active: true,
      tenant_id: ctx.tenantId,  // ✅ Filters by EMPWR or Glow
    },
  });
});
```

**Good News:** The entry creation form uses `getAllForEntry()` (the safe one with filters). The unsafe ones aren't used in critical places.

---

## The Fix Plan (Step by Step)

### Phase 1: Fix Unsafe Lookup Queries (SECURITY)
**Time:** 10 minutes
**Risk:** LOW - Just adding safety filters

**Fix these procedures in `lookup.ts`:**
1. `getCategories` - Add tenant_id filter OR mark as deprecated
2. `getClassifications` - Add tenant_id filter OR mark as deprecated
3. `getAgeGroups` - Add tenant_id filter OR mark as deprecated
4. `getEntrySizeCategories` - Add tenant_id filter OR mark as deprecated

**OR:** Just delete them if nothing uses them (entry form uses `getAllForEntry` which is safe)

---

### Phase 2: Fix EMPWR Age Groups
**Time:** 15 minutes
**Risk:** MEDIUM - Affects 18 existing entries

**What we'll do:**
1. Delete 3 orphan duplicates (Junior, Petite, Teen with no sort_order)
2. Rename "Mini (7-8)" → "Mini" and change age 6-8
3. Delete "Pre Junior (9-10)" (doesn't exist in PDF)
4. Rename "Junior (11-12)" → "Junior" and change age 9-11
5. Delete "Teen (13-14)" (keep Intermediate instead)
6. Rename "Senior (15-16)" → "Senior" and change age 15-17
7. Move 2 entries from "Senior+ (17+)" to "Adult", then delete Senior+
8. Fix sort_order so they display in correct order

**Result:** 6 clean age groups matching PDF

---

### Phase 3: Add Missing Dance Styles
**Time:** 5 minutes
**Risk:** LOW - Just adding new options

**Add these 5 styles:**
1. Contemporary Ballet (sort 9)
2. Open (sort 11)
3. Song & Dance (sort 12)
4. Modern (sort 13)
5. Production (sort 14)

**Also rename:**
- "Ballet" → "Classical Ballet"
- "Hip Hop" → "Hip-Hop"

**Result:** 14 dance styles matching PDF

---

### Phase 4: Fix Classifications
**Time:** 15 minutes
**Risk:** HIGH - Might affect existing entries

**What we'll do:**
1. Check if any entries use Crystal, Elite, Titanium, or Recreational
2. Decide how to migrate them (probably all → Competitive)
3. Delete Crystal, Elite, Titanium
4. Rename Recreational → Part-Time (or delete and create new)
5. Create Novice
6. Update Competitive description

**Result:** 3 classifications matching PDF (Novice, Part-Time, Competitive)

**WAIT:** Need to check database first to see which ones are used!

---

### Phase 5: Fix Scoring System
**Time:** 10 minutes
**Risk:** CRITICAL - Could recategorize scores if any exist

**What we'll do:**
1. Check if ANY entries have scores (shouldn't - haven't done competition yet)
2. If no scores: Delete all 5 tiers, create 6 new ones from PDF
3. If scores exist: STOP and create migration script

**New tiers:**
- Bronze: 0-84
- Silver: 84-86.99
- Gold: 87-89.99
- Titanium: 90-92.99 (NEW)
- Platinum: 93-95.99
- Pandora: 96-100 (NEW)

**Delete:**
- Diamond (doesn't exist in PDF)

---

### Phase 6: Test Everything
**Time:** 20 minutes
**Risk:** N/A - Just verification

**Test on production site (empwr.compsync.net):**
1. Create a test entry
   - Verify age groups dropdown shows 6 options
   - Verify dance styles dropdown shows 14 options
   - Verify classifications dropdown shows 3 options
   - Verify fee calculated correctly
2. Check invoice generation
3. Check analytics page
4. Delete test entry

---

### Phase 7: Build Competition Settings Page
**Time:** 30 minutes
**Risk:** LOW - Just display, no editing

**Create new page:** `/dashboard/settings/competition`

**Shows (READ-ONLY):**
- Age Divisions list (6 items)
- Classifications list (3 items)
- Dance Styles list (14 items)
- Entry Sizes & Fees (6 items with prices)
- Scoring System (6 tiers with ranges)

**Add button to CD dashboard:** "Competition Settings" (top right)

---

### Phase 8: Add Title Upgrade Checkbox
**Time:** 15 minutes
**Risk:** LOW - Feature addition

**Add to entry creation form:**
- Checkbox: "Title Division Upgrade (+$30)"
- When checked: Add $30 to total fee
- Save `is_title_upgrade = true` to database

**File to edit:** `src/components/rebuild/entries/RoutineDetailsSection.tsx`

**Database:** Already has `is_title_upgrade` column ✅

---

## Total Time Estimate

- Phase 1 (Security): 10 min
- Phase 2 (Age Groups): 15 min
- Phase 3 (Dance Styles): 5 min
- Phase 4 (Classifications): 15 min (+ checking entries first)
- Phase 5 (Scoring): 10 min (+ checking scores first)
- Phase 6 (Testing): 20 min
- Phase 7 (Settings Page): 30 min
- Phase 8 (Title Checkbox): 15 min

**TOTAL: ~2 hours**

---

## Safety Checklist (Before Each Phase)

**Before touching database:**
- [ ] Verify working on EMPWR tenant ID: `00000000-0000-0000-0000-000000000001`
- [ ] Check if any entries reference the rows we're deleting
- [ ] Have rollback plan (can undo changes)
- [ ] Test on staging first? (Do we have staging?)

**After each change:**
- [ ] Verify on production site (empwr.compsync.net)
- [ ] Check dropdowns show correct options
- [ ] Create test entry to verify fees
- [ ] Delete test entry to clean up

---

## What Could Go Wrong?

### Problem 1: Deleting age groups that entries use
**Solution:** Check first with SQL query, migrate entries before deleting

### Problem 2: Changing scoring after scores exist
**Solution:** Check for scores first, don't change if any exist

### Problem 3: Breaking Glow tenant
**Solution:** Always filter by EMPWR tenant_id, never touch Glow rows

### Problem 4: Frontend caches old dropdown data
**Solution:** Hard refresh browser (Ctrl+Shift+R) after database changes

---

## Key Decisions Made

1. **Use lookup tables as source of truth** ✅
   (NOT the JSONB columns in tenants table)

2. **Settings are tenant-specific, not competition-specific** ✅
   (EMPWR settings apply to all EMPWR competitions)

3. **Settings are hardcoded/fixed for launch** ✅
   (Competition directors can't edit them, must ask us to change)

4. **Settings page is read-only** ✅
   (Just displays settings, no editing for now)

5. **Use empwrDefaults.ts values to fix database** ✅
   (Those constants match PDF perfectly)

---

## Questions To Answer Before Starting

1. **Do we have a staging environment?**
   Or are we doing this directly on production?

2. **Are there any real entries in production yet?**
   Or is it all test data we can delete?

3. **Has anyone scored any routines yet?**
   (Shouldn't have - competition hasn't happened yet)

4. **Should we backup database first?**
   (RECOMMENDED - Can Supabase do point-in-time restore?)

5. **Do you want to review each SQL command before I run it?**
   Or should I just execute the plan?

---

## The Simple Truth

**Your system is 95% built correctly!**

- Entry creation: ✅ Works
- Fee calculation: ✅ Perfect
- Invoice generation: ✅ Works
- Tenant isolation: ✅ Works (mostly)

**We just need to clean up the dropdown options** (age groups, styles, classifications, scoring) so they match your PDF brochure.

The code is already looking at the database. The database just has some wrong/incomplete data. We fix the data, everything else works!

---

## Ready To Start?

Tell me:
1. Should I proceed with the fixes?
2. Do you want to see each SQL command before I run it?
3. Any concerns or questions?

Let's make those dropdowns perfect! 🎯
