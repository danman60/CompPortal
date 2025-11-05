# CSV Import Full Workflow Test

## Mission: Test Complete CSV Import Flow with Verbose Logging

Use Playwright MCP to test the entire CSV import workflow from file upload through routine creation, using verbose console logging to debug persistent bugs.

---

## Context

### CSV Field Aliases (Fuzzy Matching)

The CSV parser uses fuzzy matching to map common column names to canonical fields:

**Title:**
- `routine_title`, `routinetitle`, `routine_name`, `routinename`, `name`, `routine`, `piece`, `dance_title`, `dancetitle`, `dance_name`, `entry_title`

**Props:**
- `prop`, `properties`, `prop_list`, `proplist`, `prop_description`, `propdescription`, `special_requirements`, `items`, `equipment`, `stage_props`, `stageprops`

**Dancers:**
- `dancer`, `participants`, `participant`, `performers`, `performer`, `members`, `member`, `artists`, `artist`, `names`, `dancer_names`, `dancer_list`, `dancers_list`, `dancerslist`, `dancers_list_first_name_last_name`

**Choreographer:**
- `choreo`, `choreographed_by`, `choreographedby`, `teacher`, `instructor`, `coach`, `director`, `creator`, `choreography_by`

**Dance Category:** ✅ FIXED - Now includes space variant
- `dance category` ← NEW (with space)
- `dance_category` (underscore)
- `dancecategory` (no space)
- `genre`, `style`, `type`, `dance_type`, `dancetype`, `category_type`

**Duration:**
- `length_seconds`, `lengthseconds`, `length`, `duration`, `time_seconds`, `timeseconds`

### Current Test CSV

File: `D:\ClaudeCode\CompPortal\test_routines_15.csv`

Headers: `Title,Choreographer,Dancers,Props,Dance Category`

Sample data:
```csv
Title,Choreographer,Dancers,Props,Dance Category
Shine Bright,Jane Smith,"Emma Smith (Age 15)",Chair,Jazz
Fire Within,Michael Chen,"Alexander Martinez (Age 18)",None,Contemporary
Dreamer,Sarah Williams,"Olivia Williams (Age 15), Sophia Miller (Age 15)",Umbrella,Lyrical
...
```

### Known Bugs (Being Debugged)

1. ✅ **FIXED**: Dance category not passing from CSV preview to detail view
   - Root cause: CSV parser didn't match "Dance Category" (with space)
   - Fix: Added 'dance category' to fuzzy matcher aliases

2. ❌ **ACTIVE**: Dancers locked - can't be deselected after pre-population
   - Hypothesis: useEffect re-running after toggleDancer called
   - Fix attempted: Added `prefilledRoutineId` state to prevent re-runs

3. ❌ **ACTIVE**: Pinning behavior not working as expected
   - Expected: Selected dancers pin to top, still deselectable
   - Actual: Unknown (need to test after bug #2 fixed)

### Console Logging Tags

All verbose logging uses prefixed tags:

- `[PREFILL]` - Prefill logic in useEffect
- `[TOGGLE_DANCER]` - Dancer selection/deselection
- `[UPDATE_FIELD]` - Form field updates (especially category_id)
- `[NAVIGATION]` - Navigation handlers (save, skip, delete)

---

## Test Workflow

### Step 1: Login and Navigate

**URL:** https://empwr.compsync.net/login

**Credentials:**
- Email: `danieljohnabrahamson@gmail.com`
- Password: `123456`

**Actions:**
1. Navigate to login page
2. Fill email field
3. Fill password field
4. Click "Sign In" button
5. Wait for dashboard to load

**Navigate to Import:**
- URL: https://empwr.compsync.net/dashboard/entries
- Click "Import Routines" button
- OR directly navigate to: https://empwr.compsync.net/dashboard/entries/import

---

### Step 2: Upload CSV File

**File:** `D:\ClaudeCode\CompPortal\test_routines_15.csv`

**Actions:**
1. Enable console monitoring (capture all logs)
2. Click file upload button
3. Select test_routines_15.csv
4. Wait for CSV to parse

**Expected Console Logs (CSV Parsing):**
```
[CSV Parser] Processing file...
[CSV Parser] Headers detected: ["Title", "Choreographer", "Dancers", "Props", "Dance Category"]
[CSV Parser] Fuzzy matching headers...
[CSV Parser] Mapped: "Dance Category" → "category"
```

**Verification:**
- CSV preview table appears
- All 15 routines displayed
- Check columns visible: Title, Choreographer, Category, Props, Dancers
- Verify "Dance Category" column shows values (Jazz, Contemporary, Lyrical, etc.)

**Screenshot:** CSV preview table showing all routines

---

### Step 3: Verify CSV Preview Data

**Check Preview Table:**

For each routine row, verify columns display:
- ✅ Title (e.g., "Shine Bright")
- ✅ Choreographer (e.g., "Jane Smith")
- ✅ **Dance Category** (e.g., "Jazz") ← Should now be visible!
- ✅ Props (e.g., "Chair")
- ✅ Dancers matched count (e.g., "1 matched")

**Expected Console Logs:**
```
[CSV Preview] Routines processed: 15
[CSV Preview] Fields captured:
  - title: 15/15 ✓
  - choreographer: 15/15 ✓
  - category: 15/15 ✓  ← Should be 15/15 now!
  - props: 15/15 ✓
  - dancers: 15/15 ✓
```

**Screenshot:** Preview table showing "Dance Category" column populated

---

### Step 4: Select Competition and Confirm

**Actions:**
1. Select competition from dropdown (e.g., "EMPWR Dance Experience 2025")
2. Click "Confirm Routines" button
3. Wait for redirect to detail view

**Expected:**
- Redirect to: `/dashboard/entries/create?importSession={session-id}`
- First routine loaded in detail form
- Import progress bar showing "1 / 15"

**Screenshot:** Detail view with first routine loaded

---

### Step 5: Test Dance Category Prefill (Bug #1 Fix Verification)

**Current Routine:** "Shine Bright" (first routine)

**Expected Console Logs:**
```
[PREFILL] useEffect triggered: {
  hasCurrentRoutine: true,
  dancersLength: X,
  hasEventStartDate: true,
  prefilledRoutineId: null,
  importSessionId: "...",
  currentIndex: 0
}

[PREFILL] Checking prefill status: {
  routineId: "...-0",
  prefilledRoutineId: null,
  shouldSkip: false
}

[PREFILL] Dance category from CSV: {
  category: "Jazz",  ← Should have value!
  "dance category": "Jazz",  ← Should match!
  genre: undefined,
  style: undefined,
  type: undefined,
  selectedValue: "Jazz",  ← Should be "Jazz"!
  hasLookups: true,
  availableCategories: ["Classical Ballet", "Tap", "Jazz", "Lyrical", ...]
}

[PREFILL] Category matching: {
  csvValue: "Jazz",
  matchedCategory: { id: "...", name: "Jazz" },
  willUpdate: true
}

[UPDATE_FIELD] category_id changed: {
  from: "current state",
  to: "uuid-for-jazz-category",
  stackTrace: "..."
}

[PREFILL] Marking routine as prefilled: "...-0"
```

**Form Verification:**
- ✅ Title: "Shine Bright"
- ✅ Choreographer: "Jane Smith"
- ✅ **Dance Category dropdown: "Jazz" SELECTED** ← KEY TEST!
- ✅ Props/Special Requirements: "Chair"
- ✅ Dancers: "Emma Smith" pre-selected

**Screenshot:**
- Form with "Jazz" selected in dropdown
- Console logs showing category prefill

**Action:** Take screenshot proving category is now prefilling correctly!

---

### Step 6: Test Dancer Locking Bug (Bug #2)

**Current State:**
- "Emma Smith" should be pre-selected (checkbox checked)
- Dancer should appear at top of list (pinned)

**Test Deselection:**
1. Click on "Emma Smith" checkbox to deselect
2. Monitor console for logs

**Expected Console Logs:**
```
[TOGGLE_DANCER] Called with: {
  dancer_id: "...",
  dancer_name: "Emma Smith",
  classification_id: "..."
}

[TOGGLE_DANCER] Current state: {
  isSelected: true,
  currentlySelectedCount: 1,
  currentlySelected: [{ id: "...", name: "Emma Smith" }]
}

[TOGGLE_DANCER] REMOVING dancer: "..."
```

**BUG CHECK - Does useEffect run again?**
```
[PREFILL] useEffect triggered: { ... }  ← Should NOT appear!
[PREFILL] Checking prefill status: {
  shouldSkip: true  ← Should be true (skip re-prefill)
}
```

**If Bug Exists:**
```
[PREFILL] useEffect triggered: { ... }  ← BUG: Running again!
[PREFILL] Checking prefill status: {
  shouldSkip: false  ← BUG: Not skipping!
}
[TOGGLE_DANCER] Called with: { ... }  ← BUG: Re-adding dancer!
```

**Visual Check:**
- Is "Emma Smith" still checked after clicking? (BUG)
- Or is she unchecked? (FIXED)

**Screenshot:**
- Console logs showing toggle behavior
- Checkbox state after clicking

---

### Step 7: Test Multiple Dancers (Routine 4: "Dreamer")

**Navigate to Routine:**
- Click "Skip" or "Save & Next" until you reach routine 4
- OR delete/skip routines to get to "Dreamer"

**Routine 4 Details:**
- Title: "Dreamer"
- Choreographer: "Sarah Williams"
- Category: "Lyrical"
- Props: "Umbrella"
- Dancers: "Olivia Williams (Age 15), Sophia Miller (Age 15)" (2 dancers)

**Test:**
1. Verify both dancers pre-selected
2. Verify they appear at TOP of dancer list (pinned)
3. Try deselecting "Olivia Williams"
4. Check if she stays deselected (not re-added by useEffect)
5. Check if she returns to alphabetical position in list

**Expected Console Logs:**
```
[PREFILL] Processing matched dancers: {
  matchedDancersFromCSV: [
    { dancer_id: "...", ... },
    { dancer_id: "...", ... }
  ],
  totalDancersInDB: X
}

[TOGGLE_DANCER] Called with: { dancer_id: "...", dancer_name: "Olivia Williams", ... }
[TOGGLE_DANCER] Current state: { isSelected: true, currentlySelectedCount: 2, ... }
[TOGGLE_DANCER] REMOVING dancer: "..."

[PREFILL] useEffect triggered: { ... }
[PREFILL] Checking prefill status: { shouldSkip: true }  ← Should skip!
```

**Verification:**
- Both dancers initially selected
- After deselecting Olivia: Only Sophia selected
- Olivia returns to alphabetical position
- No re-prefill occurs (shouldSkip: true)

**Screenshot:**
- Dancer list with pinning behavior
- Console logs for multi-dancer test

---

### Step 8: Test Category for All Routine Types

Navigate through all 15 routines and verify category prefills:

**Routine 1:** "Shine Bright" → Jazz ✓
**Routine 2:** "Fire Within" → Contemporary ✓
**Routine 3:** "Dreamer" → Lyrical ✓
**Routine 4:** "Triple Threat" → Tap ✓
**Routine 5-15:** Check remaining categories

**Quick Verification:**
For each routine, check console for:
```
[PREFILL] Dance category from CSV: { selectedValue: "...", ... }
[PREFILL] Category matching: { matchedCategory: { name: "..." }, ... }
[UPDATE_FIELD] category_id changed: { to: "..." }
```

And verify dropdown shows selected category.

**Screenshot:** Summary showing multiple routines with categories populated

---

### Step 9: Test Edge Cases

**Edge Case 1: Unknown Category**

Create a CSV with a category not in the database (e.g., "Ballroom").

**Expected:**
```
[PREFILL] Dance category from CSV: { selectedValue: "Ballroom", ... }
[PREFILL] Category matching: { matchedCategory: null, willUpdate: false }
[PREFILL] No category match found, clearing category_id
[UPDATE_FIELD] category_id changed: { to: "" }
```

**Result:** Dropdown shows "Select Category" (empty)

**Edge Case 2: Missing Category in CSV**

Create a CSV row without a category value.

**Expected:**
```
[PREFILL] Dance category from CSV: { selectedValue: undefined, ... }
[PREFILL] Skipping category prefill: { categoryValue: undefined, hasLookups: true }
```

**Result:** Dropdown shows "Select Category" (empty)

**Edge Case 3: Rapid Navigation**

Click "Save & Next" rapidly 3 times.

**Expected:**
- prefilledRoutineId resets each time
- Each routine prefills correctly
- No "ghost" selections from previous routines

**Console Check:**
```
[NAVIGATION] handleSaveAndNext: Resetting prefilledRoutineId
[PREFILL] Checking prefill status: { prefilledRoutineId: null, shouldSkip: false }
[PREFILL] Marking routine as prefilled: "...-1"
```

---

### Step 10: Complete Import Workflow

**Complete All 15 Routines:**
1. Navigate through all routines
2. For each routine:
   - Verify category prefilled
   - Verify dancers prefilled
   - Click "Save & Next"

**Final Routine (15/15):**
- Should show "Complete Import" button instead of "Save & Next"
- Click "Complete Import"
- Should redirect to `/dashboard/entries`
- All 15 entries should appear in entries list

**Verification:**
- Navigate to entries dashboard
- Count entries: Should be 15 new entries
- Check a few entries by opening them:
  - Category saved correctly
  - Dancers saved correctly
  - Props saved correctly

**Screenshot:** Entries list showing all 15 imported routines

---

## Summary Report Format

After completing all tests, provide a report in this format:

### ✅ Bug #1: Dance Category Not Passing (FIXED)

**Root Cause:** CSV fuzzy matcher didn't include 'dance category' with space, only matched 'dance_category' with underscore.

**Fix:** Added 'dance category' to category aliases in csv-utils.ts:55

**Verification:**
- Console shows: `selectedValue: "Jazz"` ✓
- Console shows: `matchedCategory: { id: "...", name: "Jazz" }` ✓
- Dropdown displays: "Jazz" ✓
- All 15 routines: Categories populated ✓

**Evidence:** [Screenshot links]

---

### ❌/✅ Bug #2: Dancers Locked (FIXED or STILL BROKEN)

**Root Cause:** [Based on console logs]

**Fix Attempted:** Added prefilledRoutineId state to prevent useEffect re-runs

**Verification:**
- Clicking dancer checkbox calls toggleDancer: ✓ or ✗
- toggleDancer removes dancer: ✓ or ✗
- useEffect runs again after toggle: ✓ (BUG) or ✗ (FIXED)
- shouldSkip shows true: ✓ (FIXED) or ✗ (BUG)
- Dancer stays deselected: ✓ (FIXED) or ✗ (BUG)

**Evidence:** [Screenshot links + console logs]

---

### ❌/✅ Bug #3: Pinning Behavior

**Expected Behavior:**
- Selected dancers appear at top
- Maintain alphabetical order among selected
- Can be deselected
- Return to alphabetical position when deselected

**Actual Behavior:** [Describe what you observe]

**Verification:**
- Dancers pin to top: ✓ or ✗
- Alphabetical order maintained: ✓ or ✗
- Can deselect: ✓ or ✗ (related to Bug #2)
- Return to position: ✓ or ✗

**Evidence:** [Screenshot links]

---

### Additional Findings

**CSV Fuzzy Matching:**
- All expected aliases working: ✓ or ✗
- Handles case variations: ✓ or ✗
- Handles special characters: ✓ or ✗

**Console Logging:**
- [PREFILL] logs helpful: ✓ or ✗
- [TOGGLE_DANCER] logs reveal bug: ✓ or ✗
- [UPDATE_FIELD] tracks category updates: ✓ or ✗

**Performance:**
- 15 routines import smoothly: ✓ or ✗
- No memory leaks observed: ✓ or ✗
- Navigation responsive: ✓ or ✗

---

## Next Steps

If bugs remain:
1. Provide full console log output for failing test
2. Identify exact line numbers where bug occurs
3. Suggest code fix based on logging evidence

If bugs fixed:
1. Remove verbose console logging (create cleanup commit)
2. Update test CSV with more edge cases
3. Test on both EMPWR and Glow tenants
4. Mark bugs as resolved

---

**Test Start:** [Timestamp]
**Test End:** [Timestamp]
**Tester:** [Agent/Human]
**Environment:** Production (empwr.compsync.net)
**Build Hash:** [From footer]
