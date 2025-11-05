# Complete CSV Import Testing - Playwright MCP Task

## Mission: End-to-End CSV Import Testing with Bug Verification

Use Playwright MCP to thoroughly test the CSV import workflow on production, verifying bug fixes and documenting any remaining issues.

---

## Context & Recent Changes

### Bugs Fixed:
1. ✅ **Dance Category Not Passing** - Added "dance category" (with space) to fuzzy matcher
2. ⏳ **Dancers Locked** - Added `prefilledRoutineId` state to prevent re-prefill
3. ⏳ **Pinning Behavior** - Should pin selected dancers to top while still allowing deselection

### Fuzzy Matching Expanded:
- **250+ aliases** now recognized
- Supports: spaces, underscores, camelCase, UPPERCASE
- Key additions:
  - "Dance Style", "Dance Genre", "Dance Type" → category
  - "Choreography By", "Choreo", "Taught By" → choreographer
  - "Notes", "Comments", "Remarks" → props
  - "Full Name", "Cast", "Talent" → dancers

### Verbose Logging Active:
- `[PREFILL]` - Prefill logic and category matching
- `[TOGGLE_DANCER]` - Dancer selection/deselection
- `[UPDATE_FIELD]` - Form field updates (especially category_id)
- `[NAVIGATION]` - Navigation handlers

---

## Test Environment

**Production URL:** https://empwr.compsync.net

**Login Credentials:**
- **Email:** danieljohnabrahamson@gmail.com
- **Password:** 123456
- **Role:** Super Admin (SA)

**Test CSV File:** `D:\ClaudeCode\CompPortal\test_routines_15.csv`

**CSV Structure:**
```csv
Title,Choreographer,Dancers,Props,Dance Category
Shine Bright,Jane Smith,"Emma Smith (Age 15)",Chair,Jazz
Fire Within,Michael Chen,"Alexander Martinez (Age 18)",None,Contemporary
Dreamer,Sarah Williams,"Olivia Williams (Age 15), Sophia Miller (Age 15)",Umbrella,Lyrical
...
```

---

## Complete Testing Workflow

### Phase 1: Login & Navigation

**Actions:**
1. Navigate to https://empwr.compsync.net/login
2. Fill email: danieljohnabrahamson@gmail.com
3. Fill password: 123456
4. Click "Sign In"
5. Wait for dashboard to load
6. Navigate to /dashboard/entries
7. Click "Import Routines" button OR navigate to /dashboard/entries/import

**Verification:**
- ✅ Login successful
- ✅ Dashboard loads
- ✅ Import page accessible

**Screenshot:**
- Login page
- Dashboard
- Import page initial state

---

### Phase 2: CSV Upload & Preview

**Actions:**
1. Enable console monitoring (capture ALL logs)
2. Click file upload input
3. Select file: `D:\ClaudeCode\CompPortal\test_routines_15.csv`
4. Wait for CSV parsing to complete
5. Review preview table

**Console Logs to Capture:**
Look for CSV parsing logs showing field mapping:
```
[CSV Parser] Headers detected: ["Title", "Choreographer", "Dancers", "Props", "Dance Category"]
[CSV Parser] Mapped: "Dance Category" → "category"
```

**Verification Checklist:**
- ✅ CSV parses without errors
- ✅ Preview table displays 15 routines
- ✅ Columns visible: Title, Choreographer, Category, Props, Dancers
- ✅ **"Dance Category" column populated** (Jazz, Contemporary, Lyrical, etc.)
- ✅ All dancer names matched (check "X matched" indicators)
- ✅ Choreographer names visible
- ✅ Props visible

**Screenshot:**
- CSV preview table (full view)
- Console logs showing field mapping

**Test Edge Case - Fuzzy Matching:**
Create a test CSV with alternative column names and upload:
```csv
Dance Style,Choreo,Notes,Full Name
Jazz,Jane Smith,Chair,Emma Smith
Contemporary,Mike Chen,None,Alex Martinez
```

**Expected:**
- "Dance Style" → category ✅
- "Choreo" → choreographer ✅
- "Notes" → props ✅
- "Full Name" → dancers ✅

**Screenshot:** Alternative CSV preview showing fuzzy matching works

---

### Phase 3: Select Competition & Confirm

**Actions:**
1. Click competition dropdown
2. Select "EMPWR Dance Experience 2025" (or available competition)
3. Click "Confirm Routines" button
4. Wait for redirect to detail view

**Verification:**
- ✅ Redirects to `/dashboard/entries/create?importSession={sessionId}`
- ✅ First routine loaded (Routine 1 of 15)
- ✅ Import progress bar visible
- ✅ Form populated with first routine data

**Screenshot:**
- Competition selection
- Redirect to detail view
- Import progress indicator

---

### Phase 4: Test Bug Fix #1 - Dance Category Passing

**Routine 1: "Shine Bright" (Jazz)**

**Console Logs to Monitor:**
```javascript
[PREFILL] Dance category from CSV: {
  category: undefined or "Jazz",
  "dance category": "Jazz",  // ← Should have value!
  selectedValue: "Jazz"      // ← Key check!
}

[PREFILL] Category matching: {
  csvValue: "Jazz",
  matchedCategory: { id: "...", name: "Jazz" },
  willUpdate: true
}

[UPDATE_FIELD] category_id changed: {
  to: "uuid-for-jazz"  // ← Should be a UUID!
}
```

**Form Verification:**
- ✅ Title: "Shine Bright"
- ✅ Choreographer: "Jane Smith"
- ✅ **Dance Category dropdown: "Jazz" SELECTED** ← CRITICAL TEST!
- ✅ Props/Special Requirements: "Chair"
- ✅ Dancers: "Emma Smith" pre-selected

**Screenshot:**
- Form showing category dropdown with "Jazz" selected
- Console logs showing category prefill sequence

**Test Multiple Categories:**
Click "Save & Next" or "Skip" to navigate through routines 2-5:

| Routine | Expected Category | Verify |
|---------|------------------|--------|
| 1. Shine Bright | Jazz | ✓ |
| 2. Fire Within | Contemporary | ✓ |
| 3. Dreamer | Lyrical | ✓ |
| 4. Triple Threat | Tap | ✓ |

**Screenshot:** Each routine showing correct category selected

**If Bug Still Exists:**
Document exact console output showing where category is lost.

---

### Phase 5: Test Bug Fix #2 - Dancers Locked (Can't Deselect)

**Routine 1: "Shine Bright" (1 dancer)**

**Initial State:**
- Emma Smith should be pre-selected (checkbox checked)
- Emma Smith should appear at TOP of dancer list (pinned)

**Action: Try to Deselect**
1. Click Emma Smith's checkbox to uncheck
2. Monitor console logs

**Expected Console Logs:**
```javascript
[TOGGLE_DANCER] Called with: {
  dancer_id: "...",
  dancer_name: "Emma Smith",
  classification_id: "..."
}

[TOGGLE_DANCER] Current state: {
  isSelected: true,
  currentlySelectedCount: 1
}

[TOGGLE_DANCER] REMOVING dancer: "..."

// Should NOT see this (would indicate bug):
// [PREFILL] useEffect triggered: { ... }
// [TOGGLE_DANCER] Called with: { ... } ← Re-adding!
```

**Critical Check:**
After clicking to deselect, check for `[PREFILL] useEffect triggered:` log.

**If Bug Fixed:**
- ✅ `[TOGGLE_DANCER] REMOVING dancer` appears
- ✅ NO `[PREFILL] useEffect triggered` after toggle
- ✅ Emma Smith checkbox becomes UNCHECKED
- ✅ Emma Smith moves back to alphabetical position in list

**If Bug Still Exists:**
- ❌ `[PREFILL] useEffect triggered` appears after toggle
- ❌ `[TOGGLE_DANCER] Called with` appears again (re-adding)
- ❌ Emma Smith checkbox stays CHECKED
- ❌ Console shows: `shouldSkip: false` (should be `true`)

**Screenshot:**
- Before deselection (Emma checked, at top)
- After clicking (should be unchecked)
- Console logs showing toggle sequence

**Test with Multiple Dancers:**

Navigate to Routine 3: "Dreamer" (2 dancers: Olivia Williams, Sophia Miller)

**Actions:**
1. Verify both dancers pre-selected
2. Verify both pinned to top of list
3. Click to deselect "Olivia Williams"
4. Monitor console

**Expected:**
- ✅ Olivia deselects successfully
- ✅ Only Sophia remains selected
- ✅ Olivia returns to alphabetical position
- ✅ No re-prefill occurs

**Screenshot:**
- Multi-dancer routine with both selected
- After deselecting one dancer
- Console logs

---

### Phase 6: Test Bug Fix #3 - Pinning Behavior

**Expected Behavior:**
- Selected dancers appear at TOP of list
- Maintain alphabetical order among selected dancers
- Can still be deselected by clicking
- Return to normal alphabetical position when deselected

**Test Routine 3: "Dreamer" (2 dancers)**

**Before Deselection:**
```
Dancer List:
─────────────────
✓ Olivia Williams  ← Selected (pinned to top)
✓ Sophia Miller    ← Selected (pinned to top)
─────────────────
  Ava Jones        ← Not selected
  Emma Smith       ← Not selected
  Mia Smith        ← Not selected
```

**After Deselecting Olivia:**
```
Dancer List:
─────────────────
✓ Sophia Miller    ← Still selected (at top)
─────────────────
  Ava Jones        ← Not selected
  Emma Smith       ← Not selected
  Mia Smith        ← Not selected
  Olivia Williams  ← Returned to alphabetical position
```

**Verification:**
- ✅ Selected dancers at top
- ✅ Alphabetical within selected group
- ✅ Can deselect
- ✅ Returns to alphabetical after deselection

**Screenshot:**
- Before deselection (both pinned)
- After deselection (one pinned, one returned)

---

### Phase 7: Complete Import Workflow (All 15 Routines)

**Actions:**
For each routine (1-15):
1. Verify category pre-filled correctly
2. Verify dancers pre-selected
3. Try deselecting a dancer (verify unpins)
4. Re-select the dancer (verify pins again)
5. Click "Save & Next"

**Routine-by-Routine Checklist:**

| # | Title | Category | Dancers | Category ✓ | Dancers ✓ | Can Deselect ✓ |
|---|-------|----------|---------|-----------|-----------|----------------|
| 1 | Shine Bright | Jazz | 1 | | | |
| 2 | Fire Within | Contemporary | 1 | | | |
| 3 | Dreamer | Lyrical | 2 | | | |
| 4 | Triple Threat | Tap | 3 | | | |
| 5-15 | ... | ... | ... | | | |

**On Routine 15 (Last):**
- Button should say "Complete Import" instead of "Save & Next"
- Click "Complete Import"
- Should redirect to `/dashboard/entries`

**Screenshot:**
- Last routine showing "Complete Import" button
- Entries dashboard with all 15 imported entries

---

### Phase 8: Verify Data Persistence

**Navigate to Entries Dashboard:**
1. Go to `/dashboard/entries`
2. Count entries: Should be 15 new entries
3. Click on several entries to verify:

**Entry Detail Verification:**
Click on "Shine Bright" entry:
- ✅ Title: "Shine Bright"
- ✅ Choreographer: "Jane Smith"
- ✅ **Category: "Jazz"** ← CRITICAL!
- ✅ Props: "Chair"
- ✅ Dancers: "Emma Smith"
- ✅ All data saved correctly

**Random Sample Check:**
Open 3-5 random entries and verify category saved.

**Screenshot:**
- Entries list showing all 15 entries
- Entry detail pages showing categories saved

---

### Phase 9: Edge Case Testing

#### Test 9A: Unknown Category

Create CSV with category not in database:
```csv
Title,Dance Category
Test Entry,Ballroom
```

**Expected:**
```
[PREFILL] Dance category from CSV: { selectedValue: "Ballroom" }
[PREFILL] Category matching: { matchedCategory: null, willUpdate: false }
[UPDATE_FIELD] category_id changed: { to: "" }
```

**Verification:**
- ✅ Category dropdown shows "Select Category" (empty)
- ✅ User can manually select a category
- ✅ No errors thrown

#### Test 9B: Missing Category

CSV with no category column or empty values:
```csv
Title,Choreographer
Test Entry,Jane Doe
```

**Expected:**
```
[PREFILL] Skipping category prefill: { categoryValue: undefined }
```

**Verification:**
- ✅ Category dropdown empty
- ✅ No errors
- ✅ Other fields pre-fill correctly

#### Test 9C: Rapid Navigation

**Actions:**
1. Import CSV with 5 routines
2. Click "Save & Next" rapidly 5 times (don't wait)

**Expected:**
```
[NAVIGATION] handleSaveAndNext: Resetting prefilledRoutineId
[PREFILL] Checking prefill status: { prefilledRoutineId: null }
[PREFILL] Marking routine as prefilled: "...-1"
```

**Verification:**
- ✅ Each routine prefills correctly
- ✅ No "ghost" selections from previous routines
- ✅ No duplicate entries created

#### Test 9D: Alternative Column Names

Create CSV testing all fuzzy aliases:
```csv
Dance Style,Choreography By,Notes,Full Name,Routine
Contemporary,Sarah Lee,No props,John Doe,My Dance
```

**Expected Mappings:**
- "Dance Style" → category ✅
- "Choreography By" → choreographer ✅
- "Notes" → props ✅
- "Full Name" → dancers ✅
- "Routine" → title ✅

**Screenshot:** CSV preview showing all fuzzy matches work

---

## Bug Report Template

If bugs are found, document using this format:

### Bug: [Name]
**Status:** ❌ STILL BROKEN or ⚠️ PARTIALLY FIXED

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Console Logs:**
```
[Full console output showing the bug]
```

**Screenshots:**
- Before action
- After action
- Console logs

**Root Cause Analysis:**
[Based on console logs, what's causing the bug?]

**Suggested Fix:**
[Code change needed]

---

## Success Criteria

### Bug #1: Dance Category Passing
- ✅ Console shows `selectedValue: "Jazz"` (not undefined)
- ✅ Console shows `matchedCategory: { id: "...", name: "Jazz" }`
- ✅ Console shows `[UPDATE_FIELD] category_id changed: { to: "uuid" }`
- ✅ Dropdown displays selected category
- ✅ All 15 routines prefill category correctly
- ✅ Categories saved to database

### Bug #2: Dancers Locked
- ✅ `[TOGGLE_DANCER] REMOVING dancer` appears when clicking
- ✅ NO `[PREFILL] useEffect triggered` after toggle
- ✅ Dancer checkbox unchecks
- ✅ Dancer can be re-selected
- ✅ Works for single and multiple dancer routines

### Bug #3: Pinning Behavior
- ✅ Selected dancers appear at top
- ✅ Alphabetical among selected
- ✅ Can deselect (unpins)
- ✅ Returns to alphabetical position
- ✅ Can re-select (pins again)

### Fuzzy Matching
- ✅ "Dance Category" → category
- ✅ "Dance Style" → category
- ✅ "Dance Genre" → category
- ✅ "Choreography By" → choreographer
- ✅ "Notes" → props
- ✅ "Comments" → props
- ✅ All 250+ aliases working

### Data Integrity
- ✅ All 15 entries created
- ✅ Categories saved correctly
- ✅ Dancers saved correctly
- ✅ Choreographer saved
- ✅ Props saved
- ✅ No duplicate entries
- ✅ No data loss

---

## Final Report Format

After testing, provide:

```markdown
# CSV Import Test Report

**Date:** [Date]
**Tester:** [Agent/Human]
**Environment:** Production (empwr.compsync.net)
**Build Hash:** [From footer]

## Summary

✅ **PASSED:** X/X tests
❌ **FAILED:** X/X tests
⚠️ **PARTIAL:** X/X tests

## Bug Status

### Bug #1: Dance Category Not Passing
**Status:** ✅ FIXED / ❌ BROKEN
**Evidence:** [Console logs + screenshots]
**Notes:** [Details]

### Bug #2: Dancers Locked
**Status:** ✅ FIXED / ❌ BROKEN
**Evidence:** [Console logs + screenshots]
**Notes:** [Details]

### Bug #3: Pinning Behavior
**Status:** ✅ FIXED / ❌ BROKEN
**Evidence:** [Console logs + screenshots]
**Notes:** [Details]

## Fuzzy Matching Results

| CSV Header | Expected | Actual | Status |
|------------|----------|--------|--------|
| Dance Category | category | category | ✅ |
| Dance Style | category | category | ✅ |
| Choreo | choreographer | choreographer | ✅ |
| Notes | props | props | ✅ |
| ... | ... | ... | ... |

## Edge Cases

- Unknown category: ✅ / ❌
- Missing category: ✅ / ❌
- Rapid navigation: ✅ / ❌
- Alternative names: ✅ / ❌

## Data Integrity Check

- All 15 entries created: ✅ / ❌
- Categories saved: ✅ / ❌
- Dancers linked: ✅ / ❌
- No duplicates: ✅ / ❌

## Screenshots

1. [List all screenshots with descriptions]
2. ...

## Console Logs

[Full console output for critical tests]

## Issues Found

1. [Issue 1 with details]
2. [Issue 2 with details]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Next Steps

- [ ] Fix remaining issues
- [ ] Test on Glow tenant
- [ ] Remove verbose logging
- [ ] Deploy to production
```

---

## Ready to Execute

Use Playwright MCP to:
1. Login to empwr.compsync.net
2. Navigate through CSV import workflow
3. Monitor console logs at each step
4. Capture screenshots of all critical states
5. Test all three bugs systematically
6. Verify fuzzy matching with alternative CSVs
7. Complete full import of 15 routines
8. Verify data persistence
9. Document all findings

**Expected Duration:** 30-45 minutes for complete testing

**Let's verify those bug fixes! 🚀**
