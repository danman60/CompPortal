# Debug CSV Import Bugs - Playwright MCP Task

## Mission: Debug CSV Import Bugs Using Playwright MCP and Verbose Console Logging

You have access to Playwright MCP tools. Use them to test the CSV import flow on production and identify the root cause of two bugs using verbose console logging.

## Context:
Three bugs persist after 3+ failed fix attempts:
1. **Classification not passing** from CSV preview to detail view
2. **Dancers locked** - can't be deselected after pre-population
3. **Pinning behavior** - should pin to top when selected but still be deselectable

Verbose console logging has been added with tags:
- `[PREFILL]` - Tracks prefill logic, routine ID, classifications
- `[TOGGLE_DANCER]` - Tracks dancer selection/deselection
- `[NAVIGATION]` - Tracks prefill state reset

## Your Task:

### 1. Navigate and Login (Playwright MCP)

```
URL: https://empwr.compsync.net/login
Email: danieljohnabrahamson@gmail.com
Password: 123456
```

Use Playwright MCP to:
- Navigate to login page
- Fill email and password
- Click login button
- Wait for dashboard to load

### 2. Go to Entries Dashboard

```
Navigate to: https://empwr.compsync.net/dashboard/entries
Click: "Import Routines" button (or nav to /dashboard/entries/import)
```

### 3. Upload CSV and Monitor Console

```
File: D:\ClaudeCode\CompPortal\test_routines_15.csv
```

**CRITICAL:** Enable console monitoring BEFORE upload:
- Use Playwright's console message capture
- Watch for `[PREFILL]` logs during preview
- Screenshot the preview page showing matched dancers

### 4. Click "Confirm Routines" and Debug Bug #1 (Classification)

After clicking "Confirm Routines", monitor console for:

**Look for these logs:**
```
[PREFILL] Processing matched dancers: { matchedDancersFromCSV: [...], totalDancersInDB: X }
[PREFILL] Adding dancer: {
  dancerId: "...",
  dancerName: "...",
  classificationFromCSV: "..." or undefined,
  classificationFromDB: "...",
  usingClassification: "..."
}
```

**Questions to answer:**
- Is `classificationFromCSV` showing a value or undefined?
- Which classification is being used (CSV or DB)?
- Does the classification dropdown on the form show the correct value?

**Screenshot:**
- Console logs showing classification data
- The form showing (or not showing) the classification dropdown value

### 5. Debug Bug #2 (Locked Dancers)

Try clicking a selected dancer to deselect them.

**Monitor console for this sequence:**
```
[TOGGLE_DANCER] Called with: { dancer_id: "...", classification_id: "..." }
[TOGGLE_DANCER] Current state: { isSelected: true, currentlySelectedCount: X }
[TOGGLE_DANCER] REMOVING dancer: "..."
[PREFILL] useEffect triggered: { hasCurrentRoutine: true, ... }
[PREFILL] Checking prefill status: { routineId: "...", shouldSkip: true/false }
```

**Questions to answer:**
- Is `toggleDancer` being called when you click the dancer?
- Does it show "REMOVING dancer"?
- Does `[PREFILL] useEffect triggered` run AGAIN immediately after?
- Does `shouldSkip` show `true` or `false`?
- If `shouldSkip: false`, the bug is the prefill running again

**Screenshot:**
- Console logs showing the toggle → re-prefill cycle
- Dancer list showing dancer is still selected (locked)

### 6. Debug Bug #3 (Pinning Behavior)

**Expected behavior:**
- Selected dancers should be pinned to top of list
- They should maintain alphabetical order among selected dancers
- They should STILL be deselectable (clicking removes them)
- After deselection, they return to regular alphabetical position

**Test:**
- Are selected dancers at the top?
- Can you click to deselect them?
- Do they return to alphabetical order?

### 7. Analyze and Report

Based on console logs, identify root causes:

**Bug #1 (Classification):**
- Is `matchedDancer?.classification_id` undefined in the logs?
- Is the CSV missing classification data?
- Is the classification lookup failing to find the ID?

**Bug #2 (Locked Dancers):**
- Is `prefilledRoutineId` state working correctly?
- Is `shouldSkip` returning `true` as expected?
- Is the useEffect dependency array causing re-runs?
- Is something else triggering the effect?

**Bug #3 (Pinning):**
- Is DancerSelectionSection receiving selectedDancers correctly?
- Is the pinning logic (lines 71-89 in DancerSelectionSection.tsx) working?

### 8. Provide Full Report

Include in your report:
- Full console log output (all `[PREFILL]` and `[TOGGLE_DANCER]` logs)
- Screenshots of the bugs
- Root cause analysis for each bug
- Suggested fixes based on what the logs reveal

## Important Notes:

- Use Playwright MCP tools (playwright.navigate, playwright.click, playwright.fill, playwright.screenshot)
- Test on PRODUCTION (https://empwr.compsync.net) NOT localhost
- Capture ALL console output with timestamps
- Take screenshots showing bugs in action
- The verbose logging follows DEBUGGING.md protocol (lines 157-202)

## Code References:

**Files with logging:**
- `src/components/rebuild/entries/EntryCreateFormV2.tsx` (lines 77-179, 345, 370, 398)
- `src/hooks/rebuild/useEntryFormV2.ts` (lines 355-390)

**Original bugs reported in:**
- Previous session context (conversation summary)

## Success Criteria:

You've completed the task when you can answer:
1. Why is classification not passing from CSV to detail view?
2. Why can't dancers be deselected after pre-population?
3. What exact line of code is causing each bug?
4. What is the fix for each bug?

Return your findings with console logs and screenshots as evidence.
