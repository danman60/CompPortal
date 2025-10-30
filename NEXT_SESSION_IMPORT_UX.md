# Next Session: Import UX Improvements & Testing

**Date:** October 30, 2025
**Context:** Session 24+ continuation - Import system overhaul
**Build:** 6b81e91 (validation fix deployed)

---

## 📋 High Priority Tasks

### 1. Reorder Routine Import UI (30 min)
**File:** `src/components/RoutineCSVImport.tsx`

**Changes needed:**
- Move "File Validated Successfully" (green box) to TOP of validated section
- Move "Missing Required Fields" (yellow warning) BELOW green box
- Order should be: Green success → Yellow warning → Reservation select → Preview table

**Why:** User should see success message first, then warnings/actions below

---

### 2. Make Preview Table Taller (15 min)
**File:** `src/components/RoutineCSVImport.tsx`

**Current:** `max-h-96` (384px max height)
**Change to:** `max-h-[600px]` or `min-h-[500px] max-h-[800px]`

**Why:** Studios often import 50-200+ routines at once. Table needs more vertical space.

**Line:** Search for `max-h-96 overflow-y-auto` in preview table section

---

### 3. Add Indicator for Routines Needing Dancers (45 min)
**File:** `src/components/rebuild/entries/EntriesPageContainer.tsx` (or relevant entries list component)

**Requirements:**
- Check `entry.participants.length === 0` or `entry._count?.participants === 0`
- Show orange/yellow badge: "⚠️ Needs Dancers"
- Different visual treatment (orange border or highlight)
- Clicking entry should allow attaching dancers in detail view

**Considerations:**
- Check if detail view already supports adding dancers
- May need to enable participant editing in detail view

---

### 4. Block Summary Submission with 0-Dancer Routines (1 hour)
**Files:**
- Summary submission component (find with `grep -r "submit.*summary" src/`)
- Validation logic before summary creation

**Requirements:**
- Before allowing summary submission, check ALL entries for reservation
- Count entries with 0 participants
- If any found, show modal/alert: "⚠️ Cannot submit summary: X routine(s) need dancers"
- List affected routine titles
- Block submission until all have at least 1 dancer

**Phase 1 Spec Reference:** Lines 589-651 (summary submission validation)

---

## 🧪 Testing Tasks

### 5. Test Full Import Workflow (45 min)

**Test files created:**
- `C:\Users\Danie\Downloads\Dancers_UDA_2026.xls` (46 dancers with birthdates)
- `C:\Users\Danie\Downloads\Entries UDA 2026.xls` (208 routines with matching dancer names)

**Test steps:**
1. Navigate to `empwr.compsync.net/dashboard/dancers/import`
2. Upload `Dancers_UDA_2026.xls`
3. Verify birthdates required (inline editing)
4. Fill in any missing birthdates
5. Import dancers ✅

6. Navigate to `/dashboard/entries/import` (or routines import)
7. Upload `Entries UDA 2026.xls`
8. Verify preview shows ALL 208 routines (no validation errors)
9. Verify dancer matching works (should match all 46 dancers)
10. Verify auto-detect for Age Group & Entry Size (based on matched dancers)
11. Fill in Classification & Dance Category for ALL routines
12. Verify import button disabled until all fields complete
13. Click import ✅
14. Verify routines created with matched dancers

**Edge cases to test:**
- Routine with no matched dancers (should create with 0 participants)
- Routine with partial matches (some dancers matched, some not)
- Changing auto-detected age group manually

---

## 📊 Current System State

**Commits (Session 24):**
- 5b32704: Excel error messages + export buttons
- 9da1462: Replace ExcelJS with xlsx library
- d52dc44: Coordination cleanup
- 6b81e91: Allow preview without required fields

**Features completed:**
- ✅ .xls, .xlsx, .csv support
- ✅ Export buttons (dancers + routines)
- ✅ Birthdate required in dancer import (inline editing)
- ✅ Preview shows without field validation
- ✅ All 4 fields required before import
- ✅ Auto-detect age group & entry size
- ✅ Allow 0-dancer routines to be created
- ✅ Better error messages (suggest ChatGPT for corrupted files)
- ✅ Comprehensive guidance for non-tech users

**Features pending:**
- ⏳ UI reordering (success message at top)
- ⏳ Taller preview table
- ⏳ Orange indicator on entries needing dancers
- ⏳ Block summary if routines have 0 dancers
- ⏳ E2E testing with sample files

---

## 🎯 Success Criteria

**Session complete when:**
1. Preview table UI reordered (green → yellow → table)
2. Table has more vertical space (600-800px)
3. Entries page shows indicator for 0-dancer routines
4. Summary submission blocked if any routines missing dancers
5. Full import workflow tested with both XLS files
6. All 208 routines imported with correct dancer matching
7. No console errors, build passes

---

## 🔑 Key Context

**Import workflow (corrected):**
1. Upload file → Shows preview ALWAYS (only validates title)
2. Auto-detect Age Group & Entry Size (if dancers matched)
3. User fills Classification & Dance Category manually
4. Warning shows count of routines needing fields
5. Import blocked until ALL 4 fields complete
6. Routines created even with 0 dancers
7. On entries page, 0-dancer routines show indicator
8. SD can open detail view to attach dancers later
9. Summary blocked if any routines have 0 dancers

**Database schema notes:**
- `entry.participants` → `entry_participants` table (many-to-many)
- Check with `_count.participants` or `participants.length`
- Participant has: dancer_id, dancer_name, dancer_age, display_order

**Validation split:**
- Upload: Only title required
- Import: All 4 fields required (age/classification/category/size)
- Summary: At least 1 dancer required per entry

---

## 📁 Files to Check

**Import components:**
- `src/components/DancerCSVImport.tsx` (inline birthdate editing)
- `src/components/RoutineCSVImport.tsx` (field requirements, auto-detect)

**Entries page:**
- `src/components/rebuild/entries/EntriesPageContainer.tsx` (indicator needed)
- `src/components/rebuild/entries/EntryCard.tsx` (card display)

**Summary submission:**
- Search: `grep -rn "summary.*submit\|submit.*summary" src/components/`
- Check: Reservation summary creation flow
- Validation: Should check all entries have participants

---

**Total estimated time:** 3-4 hours
**Priority order:** UI fixes (1-2) → Indicators/blocking (3-4) → Testing (5)

**Next session start:** Load this document + PROJECT_STATUS.md + git log -3
