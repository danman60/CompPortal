# Next Session: Import System Improvements (Continued)

**Session 26 Completed:** October 30, 2025
**Status:** Compact UX with selective import complete
**Context:** Major UX overhaul - compact layout + routine selection system

---

## Session 26 Achievements (THIS SESSION)

### 1. Compact Import UX (Major Overhaul)
- ✅ **Replaced 4 Big Cards** with single compact horizontal info bar (RoutineCSVImport.tsx:794-881)
  - Shows: ✓ routines validated, ⚠️ unmatched dancers, 🏆 competition dropdown
  - Expandable details section for dancer matching info
  - **Saved ~650px vertical space!**

- ✅ **Added Routine Selection System**
  - Checkbox column (first column in table) for individual selection
  - Header checkbox for select all / deselect all
  - Auto-selects all routines on file load
  - State management with Set<number> for selected indices

- ✅ **Selection Counter Bar** with validation (RoutineCSVImport.tsx:883-923)
  - Shows "Selected: X / Y available" with dynamic styling
  - Red warning when exceeding space limit: "⚠️ Uncheck 2 routines to continue"
  - "Uncheck All" / "Check All" buttons for bulk operations

- ✅ **Updated Import Logic** to respect selection (RoutineCSVImport.tsx:469-518)
  - Only imports selected routines (not all!)
  - Validates space limit against selected count
  - Import button shows count: `Import (52 selected)`
  - Disabled when exceeds limit or missing required fields

### 2. User Problem Solved
**Original Issue:** "If CSV has 200 routines but only 50 spaces available, blocking entire import"

**Solution:** Users can now:
1. Upload 200-routine file
2. See all routines in preview table
3. Select exactly which 50 they want
4. Import only those selected
5. Re-run import later for remaining routines

---

## Session 25 Achievements (Previous Session)

### 1. Import UI/UX Polish (All Tasks Complete)
- ✅ **Reordered Messages** - Success message now appears BEFORE warning (RoutineCSVImport.tsx:897-959)
- ✅ **Taller Import Table** - Increased from 96px to 600px for bulk imports (RoutineCSVImport.tsx:981)
- ✅ **Orange Indicators** - Visual warnings for 0-dancer routines (RoutineCard.tsx:38-58, RoutineTable.tsx:75-83)
- ✅ **Summary Blocking** - Prevents submission if routines missing dancers (LiveSummaryBar.tsx:52-194)

### 2. Critical Bug Fixes
- ✅ **Dancer Matching Fixed** - Added `dancers_list_first_name_last_name` to field variations (csv-utils.ts:51)
- ✅ **Age Group Detection Fixed** - Auto-loads event date from first available reservation (RoutineCSVImport.tsx:84-92)

### 3. Studio Public Code System
- ✅ **Database Migration** - Added public_code VARCHAR(5) UNIQUE with backfill
- ✅ **Auto-generation** - On studio creation in admin.ts + studio.ts
- ✅ **Lookup Endpoint** - `studio.lookupByCode` for code → UUID resolution
- ✅ **Documentation** - Clear warnings that codes are display-only, never for database relations

**Existing Codes:**
- Dans Dancer: `BFB89`
- asd: `D6DA5`
- Dancertons: `43E4A`

---

## Current Import System State

### Architecture Overview

**Entry Point:** `src/components/RoutineCSVImport.tsx` (~1050 lines after Session 26 changes)
**CSV Utilities:** `src/lib/csv-utils.ts` (180 lines)
**Display Components:** RoutineCard.tsx, RoutineTable.tsx, LiveSummaryBar.tsx

**Core Features:**
1. **Flexible Header Matching** - Fuzzy matching with Levenshtein distance (70% threshold)
2. **Dancer Auto-Matching** - Name-based matching with 80% confidence threshold
3. **Age Group Auto-Detection** - Calculates from dancer DOBs + event date
4. **Entry Size Auto-Detection** - Determines Solo/Duo/Trio/Group from dancer count
5. **Multi-file Support** - Can import from different file structures
6. **Validation at Upload** - Shows warnings for missing data before import
7. **Selective Import** - NEW: Checkbox selection for partial imports
8. **Space Validation** - NEW: Real-time validation against available spaces

### Key Data Flow

```
1. File Upload → Parse CSV
2. Column Mapping → Fuzzy match headers to canonical fields
3. Row Parsing → Extract routine data + dancer names
4. Dancer Matching → Match names to existing dancers (fuzzy 80%)
5. Auto-Detection → Calculate age group + entry size
6. Preview Table → Show with checkboxes (all selected by default)
7. User Selection → Check/uncheck routines to import
8. Space Validation → Verify selected count ≤ available spaces
9. Import Action → Create only selected entries with matched dancers
10. Summary Validation → Block if any routines have 0 dancers
```

### Selection State Management

**State:** `selectedRoutines: Set<number>` - stores indices of selected routines

**Key Functions:**
- Auto-select all on load: `useEffect(() => setSelectedRoutines(new Set(previewData.map((_, i) => i))))`
- Toggle individual: checkbox `onChange` adds/removes from Set
- Check all: `setSelectedRoutines(new Set(previewData.map((_, i) => i)))`
- Uncheck all: `setSelectedRoutines(new Set())`

**Import Filtering:**
```typescript
const selectedIndices = Array.from(selectedRoutines);
const routinesToImport = previewData.filter((_, i) => selectedRoutines.has(i));
// Only process routinesToImport in import loop
```

### Field Variations (csv-utils.ts:36-53)

**Critical for matching Excel files with non-standard headers:**

```typescript
dancers: [
  'dancer', 'participants', 'participant', 'performers',
  'performer', 'members', 'member', 'artists', 'artist',
  'names', 'dancer_names', 'dancer_list', 'dancers_list',
  'dancerslist', 'dancers_list_first_name_last_name'  // Added Session 25
]

title: [
  'routine_title', 'routinetitle', 'routine_name', 'routinename',
  'name', 'routine', 'piece', 'dance_title', 'dancetitle',
  'dance_name', 'entry_title'
]

choreographer: [
  'choreo', 'choreographed_by', 'choreographedby', 'teacher',
  'instructor', 'coach', 'director', 'creator', 'choreography_by'
]

props: [
  'prop', 'properties', 'prop_list', 'proplist',
  'prop_description', 'propdescription', 'special_requirements',
  'items', 'equipment', 'stage_props', 'stageprops'
]
```

### Debug Logging (Added Session 25)

**Age Group Detection:** RoutineCSVImport.tsx:136-142
- Logs prerequisites check (dancer IDs, existing dancers, event date, age groups)
- Logs individual dancer ages and event date
- Logs age range and matched age group
- Console output format: `[Age Detection] Missing prerequisites: {...}`

**Monitor in production:** Check browser console for detection issues

---

## Test Files Ready

**Location:** User has test files from Session 25

1. **Dancers_UDA_2026.xls** - 46 dancers
   - Tests: Dancer import, data normalization

2. **Entries UDA 2026.xls** - 208 routines
   - Tests: Bulk import, dancer matching, age detection, entry size detection, **selective import**
   - Known column: "Dancers list (First Name Last Name)"

**Test Workflow:**
```
1. Import Dancers_UDA_2026.xls (46 dancers)
2. Import Entries UDA 2026.xls (208 routines)
3. Select competition with limited spaces (e.g., 50)
4. See "Selected: 208 / 50 available" warning
5. Uncheck routines until ≤ 50 selected
6. Verify import button enables
7. Import selected routines
8. Verify only selected routines created
```

---

## Known Issues & Limitations

### 1. Dancer Name Variations
- **Issue:** Nicknames, middle initials, typos reduce match confidence
- **Current:** 80% Levenshtein threshold (works well)
- **Potential Improvement:** Allow manual dancer selection for unmatched names

### 2. Age Group Edge Cases
- **Issue:** Dancers on age group boundaries may mismatch
- **Current:** Debug logging in place to monitor
- **Potential Improvement:** Show calculated ages in preview table

### 3. Batch Import Performance
- **Issue:** 200+ routines processed synchronously
- **Current:** Works but no progress indicator during import
- **Potential Improvement:** Batch processing with progress bar
- **Note:** Progress bar shows AFTER import starts, not during

### 4. Error Recovery
- **Issue:** Partial import failures don't rollback
- **Current:** User must manually delete imported entries
- **Potential Improvement:** Transaction-based import with rollback

### 5. Column Mapping UI
- **Issue:** User can't override fuzzy matches
- **Current:** 70% threshold works for most files
- **Potential Improvement:** Manual column mapping interface

### 6. Re-import Workflow
- **Issue:** No way to identify which routines already imported from same file
- **Current:** User must manually track
- **Potential Improvement:** Show "Already Imported" indicator based on title match

---

## Suggested Next Improvements

### Priority 1: User Testing Feedback
- Run E2E test with Dancers_UDA_2026.xls + Entries UDA 2026.xls
- Test selective import with space limits
- Gather user feedback on UX flow
- **SESSION 26 NOTE:** User requested this feature, should test it!

### Priority 2: Progress Indicators During Import
- Add spinner/progress bar for bulk imports
- Show "Processing X of Y routines..." during import loop
- Disable import button during processing
- **Note:** Current progress bar only shows after import starts

### Priority 3: Better Error Handling
- Wrap import in try-catch with rollback
- Show detailed error messages per routine
- Allow "skip and continue" for problematic rows

### Priority 4: Manual Overrides
- Allow user to manually map unmatched dancers
- Allow user to override age group detection
- Allow user to override entry size detection

### Priority 5: Validation Improvements
- Pre-import validation (before creating any entries)
- Show all issues in single modal
- Allow "import anyway" with warnings

### Priority 6: Export/Template
- Provide Excel template with correct headers
- Export current entries to CSV for bulk editing
- Import updated CSV to modify existing entries

### Priority 7: Re-import Intelligence
- Detect duplicate titles when re-importing
- Show which routines already exist
- Allow "Update existing" vs "Create new" choice

---

## Code Reference Map

**Selection System (NEW in Session 26):**
- `RoutineCSVImport.tsx:55` - selectedRoutines state declaration
- `RoutineCSVImport.tsx:95-100` - Auto-select all on load
- `RoutineCSVImport.tsx:794-881` - Compact info bar with competition dropdown
- `RoutineCSVImport.tsx:883-923` - Selection counter bar with Check All/Uncheck All
- `RoutineCSVImport.tsx:925-947` - Import/Cancel buttons with selection count
- `RoutineCSVImport.tsx:973-985` - Header checkbox (select all)
- `RoutineCSVImport.tsx:1016-1030` - Individual row checkboxes
- `RoutineCSVImport.tsx:469-518` - Import logic filtering by selection

**Import Logic:**
- `RoutineCSVImport.tsx:95-100` - Event date auto-loading
- `RoutineCSVImport.tsx:136-282` - Age group detection with logging
- `RoutineCSVImport.tsx:284-298` - Entry size detection
- `RoutineCSVImport.tsx:368-490` - Dancer matching with fuzzy search
- `RoutineCSVImport.tsx:447-529` - CSV parsing and import execution

**Validation:**
- `LiveSummaryBar.tsx:52-68` - 0-dancer validation
- `LiveSummaryBar.tsx:151-194` - Dancer warning modal
- `RoutineCSVImport.tsx:929-936` - Import button disabled logic

**CSV Utilities:**
- `csv-utils.ts:22-30` - Header normalization
- `csv-utils.ts:36-53` - Field variations mapping
- `csv-utils.ts:63-111` - Fuzzy column matching
- `csv-utils.ts:117-144` - Header mapping function

**Display:**
- `RoutineCard.tsx:38-58` - Orange indicator for 0-dancer routines
- `RoutineTable.tsx:75-83` - Dancer count/warning column
- `EntriesPageContainer.tsx:133-140` - Pass entries to LiveSummaryBar

---

## Studio Public Code Integration

**Future Use Cases:**
- Display public_code on studio dashboard
- Show on invoices/receipts
- Quick studio lookup for admins
- Self-service studio registration flow

**Endpoints:**
- `studio.lookupByCode` - Lookup studio by 5-char code (studio.ts:61-84)
- Returns: id, name, public_code, city, province, status

**Important:** Never use public_code in database relations. All FKs use UUID `id` field.

---

## Session Continuity Notes

**Context to preserve:**
1. Import system architecture (fuzzy matching, auto-detection, **selective import**)
2. Field variations mapping (critical for Excel compatibility)
3. Debug logging locations (for production monitoring)
4. Test files available (Dancers_UDA_2026.xls, Entries UDA 2026.xls)
5. Orange indicators for 0-dancer routines
6. Summary blocking validation
7. Studio public code system (display-only)
8. **NEW: Selection system for partial imports**

**Don't reload:**
- Detailed implementation of completed features

**Do reference:**
- csv-utils.ts for field variations
- RoutineCSVImport.tsx for auto-detection + selection logic
- This file for context and suggestions

---

## Quick Start for Next Session

**Load in this order:**
1. This file (NEXT_SESSION_IMPORTS_CONTINUED.md)
2. `git log -5 --oneline` (verify latest commits)
3. User's test results or new requirements

**If user reports issues:**
1. Check browser console for `[Age Detection]` logs
2. Verify field variations in csv-utils.ts
3. Check Supabase for actual dancer data vs. matched data
4. Use Playwright MCP to reproduce exact user steps
5. Check selectedRoutines state if selection issues

**If adding new features:**
1. Review suggested improvements above
2. Check existing auto-detection logic before duplicating
3. Add field variations if new CSV headers needed
4. Test with both test files
5. Consider impact on selection system

---

**Last Commit:** c2576f3 - Compact import UX with routine selection
**Build Status:** ✅ Passing
**Deployment:** Waiting for Vercel (build c2576f3 not yet showing on production)
**Ready For:** User testing with selective import feature
