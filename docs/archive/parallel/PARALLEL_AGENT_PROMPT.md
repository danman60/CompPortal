# Parallel Testing Agent Prompt - Work BACKWARDS

**Copy this entire prompt into a NEW Claude Code session**

---

## Mission
You are Agent B testing CompPortal's E2E test suite BACKWARDS (Categories 6→4). Agent A is testing FORWARD (Categories 1→3). You'll meet in the middle.

## Current State (from Agent A)
- **Environment:** https://empwr.compsync.net (EMPWR tenant, production)
- **Build:** v1.0.0 (e08a8f6)
- **Project Path:** D:\ClaudeCode\CompPortal
- **Studio:** Dans Dancer (de74304a-c0b3-4a5b-85d3-80c4d4c7073a)
- **Credentials:** danieljohnabrahamson@gmail.com / 123456

## Agent A's Completed Tests (DON'T DUPLICATE)
**Category 1: CSV Import (7/10 complete)**
- ✅ Tests 1.1, 1.2, 1.4, 1.5, 1.6, 1.8, 1.9, 1.10

**Category 2: Manual Entry (2/5 complete)**
- ✅ Tests 2.1, 2.3
- 🔴 Agent A is CURRENTLY working on: 2.2, 2.4, 2.5

**Category 3: Reservations (4/8 complete)**
- ✅ Tests 3.1, 3.2, 3.3, 3.8
- 🔴 Agent A will do: 3.4-3.7

## Your Assignment (Work BACKWARDS)

### START HERE: Category 6 - Edge Cases (5 tests)
Execute ALL edge case tests:

**Test 6.1: Maximum Capacity Scenarios**
- Try to exceed total competition capacity
- Try negative capacity values
- Try to create reservation when capacity = 0

**Test 6.2: Boundary Date Validations**
- Past competition dates
- Future dates (100 years out)
- Invalid date formats in UI
- Leap year dates (Feb 29)

**Test 6.3: Concurrent Operations**
- Open 2 browser tabs, try simultaneous operations
- Test race conditions (if possible)

**Test 6.4: Network Error Handling**
- Simulate slow network (if possible)
- Check error messages are user-friendly

**Test 6.5: Browser Compatibility**
- Document browser/version being tested
- Check responsive design at different widths

### THEN: Category 5 - Summary & Invoice (7 tests)
⚠️ **KNOWN BLOCKER:** Requires Competition Director role

**Test 5.1: Submit Summary (All Entries)**
- Try to access summary submission page
- Document what's blocked vs accessible

**Test 5.2: Submit Summary (Partial Entries)**
- Check if partial submission is possible

**Test 5.3: Edit Submitted Summary**
- Check if edit option exists

**Test 5.4: Invoice Generation**
- Look for invoice generation UI
- Document what studio director can see

**Test 5.5: Invoice Email Delivery**
- Check for email notification settings

**Test 5.6: Invoice Payment Tracking**
- Look for payment tracking UI

**Test 5.7: Refund Processing**
- Check for refund options in UI

**For ALL Category 5 tests:**
- Navigate to every relevant URL
- Screenshot what you see as Studio Director
- Document exactly what's blocked with error messages
- Note any UI elements that hint at CD-only features

### THEN: Category 4 - Entry Creation (10 tests)
⚠️ **KNOWN BLOCKER:** Requires approved reservation (CD approval needed)

**Current Database State:**
- 30 dancers exist
- 3 pending reservations exist (NOT approved)

**Test 4.1: Create Entry (All Fields)**
- Navigate to `/dashboard/entries/new` or entry creation page
- Check if blocked due to no approved reservations
- If not blocked, try to create entry with all fields

**Test 4.2: Create Entry (Minimal Fields)**
- Try minimal valid entry

**Test 4.3: Multiple Dancers in Entry**
- Check multi-dancer selection

**Test 4.4: Edit Entry Before Summary**
- Create entry (if possible), then edit

**Test 4.5: Delete Entry**
- Try to delete an entry

**Test 4.6: Duplicate Entry**
- Try to create duplicate

**Test 4.7: Entry Validation Rules**
- Test required field validation
- Test invalid data rejection

**Test 4.8: Age Group Auto-Assignment**
- Check if age groups auto-populate based on dancer age

**Test 4.9: Category Selection Validation**
- Test category dropdown behavior

**Test 4.10: Entry Limit Enforcement**
- Check if system enforces entry limits

**For ALL Category 4 tests:**
- Attempt every test even if you expect it to be blocked
- Document the EXACT blocking behavior
- Screenshot error messages
- Note what UI elements are visible vs hidden

### STOP at Category 3/4 Boundary
Don't test Category 3 or below - Agent A is handling those.

## Test Execution Protocol

1. **Load Test Suite:**
```
Read D:\ClaudeCode\CompPortal\E2E_TEST_SUITE.md
```

2. **Use Playwright MCP for all testing:**
```
mcp__playwright__browser_navigate to https://empwr.compsync.net
Login with credentials
Navigate to test pages
Take screenshots
Check console errors
```

3. **For EACH test:**
- Navigate to the feature
- Execute test steps
- Take screenshot (name: `test_X.X_RESULT_description.png`)
- Check console: `mcp__playwright__browser_console_messages`
- Document pass/fail

4. **Known Bugs to Watch:**
- Bug #1 (P1): Dates show -1 day offset (2010-05-15 → May 14, 2010)
- Bug #4 (P0): FIXED - Don't expect date Prisma errors
- Bug #5 (P0): FIXED - Competition API works

## Database State (from Agent A)
**Dancers:** 30 total including:
- Special characters: José García, François O'Brien, Zoë Smith-Jones, María D'Angelo
- Duplicates: 2x "Duplicate Test" (intentional)
- Duplicates: 2x "Mia Anderson" (intentional)
- Mix of genders, ages, with/without dates

**Reservations:** 3 total (all PENDING)
1. St. Catharines #2: 10 routines
2. St. Catharines #1: 500 routines
3. St. Catharines #1: 5 routines

**Entries:** 0 (none created yet - blocked by pending reservations)

## Output Requirements

Create: `D:\ClaudeCode\CompPortal\BACKWARD_TESTING_REPORT.md`

Include:
```markdown
# Backward Testing Report (Agent B)
**Date:** [Today]
**Agent:** B (Backward from Category 6)
**Tests Executed:** X/22 total (5 from Cat6, 7 from Cat5, 10 from Cat4)

## Executive Summary
- Category 6: X/5 passed
- Category 5: X/7 passed (Y blocked by architecture)
- Category 4: X/10 passed (Y blocked by architecture)
- New bugs found: X
- Pass rate: X%

## Category 6: Edge Cases (5 tests)
### Test 6.1: Maximum Capacity
**Status:** PASS/FAIL
**Evidence:** Screenshot path
**Result:** [Description]

[Continue for all 6.X tests]

## Category 5: Summary & Invoice (7 tests)
### Architectural Blocker Analysis
**Blocked Features:** [List]
**Reason:** Studio Director role cannot approve reservations
**Evidence:** [Screenshots showing blocks]

### Test 5.1: Submit Summary
**Status:** BLOCKED/PASS/FAIL
**Evidence:** Screenshot path
**Navigation:** Accessed /dashboard/[path]
**Blocking Message:** "[Exact error/message]"

[Continue for all 5.X tests]

## Category 4: Entry Creation (10 tests)
### Architectural Blocker Analysis
**Blocked Features:** [List]
**Reason:** No approved reservations exist
**Evidence:** [Screenshots showing blocks]

### Test 4.1: Create Entry (All Fields)
**Status:** BLOCKED/PASS/FAIL
**Evidence:** Screenshot path
**Navigation:** Accessed /dashboard/entries/new
**Blocking Message:** "[Exact error/message]"

[Continue for all 4.X tests]

## New Bugs Discovered
[Document any new issues found]

## Architectural Limitations Summary
[Comprehensive analysis of what requires CD role]

## Recommendations
1. Set up CD account for future testing
2. [Other recommendations]

## Testing Evidence
**Screenshots:** [List all files]
**Console Errors:** [Summary]
**Database Changes:** [None expected for blocked tests]
```

## Success Criteria
- ✅ Category 6 fully tested (5/5 tests executed with results)
- ✅ Category 5 attempted (7/7 tests, document what's blocked)
- ✅ Category 4 attempted (10/10 tests, document what's blocked)
- ✅ Comprehensive report with screenshots
- ✅ Clear documentation of architectural blockers
- ✅ Professional handoff for CD-role testing

## Starting Commands

```bash
# 1. Navigate to project
cd D:\ClaudeCode\CompPortal

# 2. Load test suite
Read E2E_TEST_SUITE.md

# 3. Start browser testing
mcp__playwright__browser_navigate https://empwr.compsync.net

# 4. Login
# Email: danieljohnabrahamson@gmail.com
# Password: 123456

# 5. Start with Category 6 tests
```

## Timeline Estimate
- Category 6: 15-20 minutes (thorough edge case testing)
- Category 5: 10-15 minutes (mostly documenting blocks)
- Category 4: 10-15 minutes (mostly documenting blocks)
- Report writing: 10 minutes
- **Total:** 45-60 minutes

## Critical Reminders
1. **Work BACKWARDS** - Start with Category 6, end at Category 4
2. **Don't duplicate** Agent A's work (Categories 1-3)
3. **Document blockers professionally** - this informs product decisions
4. **Take screenshots for EVERYTHING** - proof of what you tested
5. **Be thorough with edge cases** - Category 6 is often neglected
6. **Attempt blocked tests anyway** - document the blocking behavior
7. **Check console errors** after every test
8. **Update report progressively** - don't wait until the end

## Handoff Signal
When you complete Category 4, create a file:
```
D:\ClaudeCode\CompPortal\AGENT_B_COMPLETE.txt
```

With content:
```
Agent B testing complete.
- Category 6: X/5 passed
- Category 5: X/7 attempted (Y blocked)
- Category 4: X/10 attempted (Y blocked)
- Report: BACKWARD_TESTING_REPORT.md
- Ready for Agent A to review and merge results
```

---

**BEGIN TESTING NOW - START WITH CATEGORY 6 EDGE CASES**

Good luck, Agent B!
