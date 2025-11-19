# Overnight Schedule Page Testing Protocol

**Status:** Ready for systematic testing
**Build:** Latest (check footer for commit hash)
**URL:** https://tester.compsync.net/dashboard/director-panel/schedule

---

## Pre-Test Setup

1. Navigate to schedule page
2. Hard refresh (Ctrl+Shift+R) to clear cache
3. Open browser DevTools console (F12)
4. Verify build hash in footer matches latest commit

---

## Test 1: Page Load & Data Display

**Acceptance Criteria:**
- [ ] Page loads without errors
- [ ] Total routines shows 600
- [ ] Scheduled shows count (currently 1)
- [ ] Unscheduled shows count (currently 599)
- [ ] Four day tabs visible (Thu Apr 9 - Sun Apr 12)

**Evidence:** Screenshot of loaded page state

---

## Test 2: Filter Dropdowns Accessibility

**Acceptance Criteria:**
- [ ] Classification dropdown VISIBLE
- [ ] Age dropdown VISIBLE
- [ ] Category dropdown VISIBLE
- [ ] Dropdowns are SELECTABLE (not blocked by other elements)
- [ ] Clicking dropdown opens options list
- [ ] Can select an option and filter works

**Evidence:** Screenshot showing dropdown open + console has no errors

---

## Test 3: Drag Routine from UR to CR

**Steps:**
1. Find any routine in Unscheduled Routines (UR) table
2. Drag routine to Current Routines (CR) schedule area for Thursday
3. Drop at desired time slot

**Acceptance Criteria:**
- [ ] Routine drag/drop happens IMMEDIATELY (no delay)
- [ ] Routine DISAPPEARS from UR table
- [ ] Routine APPEARS in CR schedule table
- [ ] CR shows correct start time based on Day Card
- [ ] Entry number assigned (#100, #101, etc.)
- [ ] No console errors

**Evidence:** Screenshot showing routine in CR + console clean

---

## Test 4: Routine Time Display (TIMEZONE BUG CHECK)

**Debug Steps:**
1. Check console for ERROR logs with prefix `[ScheduleTable #100]`
2. Note the RAW scheduledTime value
3. Note the ISO timestamp
4. Compare displayed time vs expected time

**Acceptance Criteria:**
- [ ] Database has 08:00:00 → Display shows **08:00 AM** (not 03:00 AM)
- [ ] Timezone conversion is correct for EST
- [ ] Console debug logs show correct ISO timestamp

**Evidence:** Screenshot of console ERROR logs + schedule table time

---

## Test 5: Routine Re-ordering

**Steps:**
1. Drag a scheduled routine UP in the CR list
2. Drag a scheduled routine DOWN in the CR list

**Acceptance Criteria:**
- [ ] Routines can be re-ordered via drag/drop
- [ ] Sequence number updates dynamically
- [ ] Routine time updates correctly based on new position
- [ ] Changes reflect immediately (no page refresh needed)
- [ ] No console errors

**Evidence:** Screenshot before + after re-ordering

---

## Test 6: Console Errors Check

**Acceptance Criteria:**
- [ ] NO red console errors during any operation
- [ ] NO failed network requests (400, 500 errors)
- [ ] Warnings are acceptable (Sentry, etc.)

**Evidence:** Screenshot of clean console

---

## Known Issues to Document

### 1. Empty Space / Missing Data
- [ ] Studio column shows "?" for some routines
- [ ] Routine Age column shows "-" for some routines
- **Action:** Screenshot and note which data is missing

### 2. Timezone Bug Status
- [ ] Routines scheduled for 8 AM display as 3 AM (5-hour offset)
- **Root Cause:** Being investigated with debug logging
- **Evidence:** Console ERROR logs from Test 4

---

## Completion Checklist

- [ ] All 6 tests completed
- [ ] Screenshots saved to `.playwright-mcp/evidence/screenshots/`
- [ ] Console logs captured
- [ ] Issues documented with specific examples
- [ ] Summary report created

---

## Summary Report Template

```
SCHEDULE PAGE TEST RESULTS

Date: [YYYY-MM-DD]
Build: [commit hash]
Tester: [name]

PASS: [X/6 tests]
FAIL: [X/6 tests]

FAILED TESTS:
- Test #: [reason]

CRITICAL ISSUES:
- [Issue description + screenshot reference]

CONSOLE ERRORS:
- [Copy exact error messages]

NOTES:
- [Any observations]
```

---

**Next Steps After Testing:**
1. Share summary report
2. Prioritize critical issues
3. Fix identified bugs
4. Re-test failed scenarios
