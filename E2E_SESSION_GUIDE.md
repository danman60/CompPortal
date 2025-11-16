# E2E Testing - Session Execution Guide

**Quick reference for executing E2E tests across multiple sessions**

---

## 🚀 Session Start Protocol (5 minutes)

### 1. Check Build Status

```bash
# Verify latest commit is deployed
git log -1 --oneline
# Expected: 3928e97 or newer
```

### 2. Open Playwright MCP

```javascript
// Navigate to tester environment
await mcp__playwright__browser_navigate({ url: "https://tester.compsync.net" })

// Verify deployment
await mcp__playwright__browser_take_screenshot({ filename: "session-start-footer.png" })
// Check footer for commit hash
```

### 3. Login & Navigate

```javascript
// If not logged in, login
// Email: empwrdance@gmail.com
// Password: 1CompSyncLogin!

// Navigate to schedule
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/schedule"
})

// Wait for page load
await mcp__playwright__browser_wait_for({ time: 2 })

// Take initial screenshot
await mcp__playwright__browser_take_screenshot({
  filename: "sessionXX-00-initial-state.png"
})
```

### 4. Check Console

```javascript
// Check for errors
await mcp__playwright__browser_console_messages({ onlyErrors: true })
// Should be empty or only minor warnings
```

### 5. Load Test Suite

```markdown
Read: E2E_MASTER_TEST_SUITE.md
Find: "Resume At" section
Start from indicated test
```

---

## 📋 Test Execution Pattern

### For Each Test:

#### **1. Setup (1 min)**
```
- Read test steps from E2E_MASTER_TEST_SUITE.md
- Note prerequisites
- Check browser is ready
- Clear any previous state if needed
```

#### **2. Execute (varies)**
```
- Follow steps exactly as written
- Take screenshots at checkpoints
- Verify expected results
- Note actual results
```

#### **3. Verify (1 min)**
```
- Check browser console for errors
- Compare expected vs actual
- Determine pass/fail status
```

#### **4. Document (1 min)**
```
- Save screenshots with correct naming
- Mark test status in tracker
- Note any issues
```

---

## 📸 Screenshot Commands

### Basic Screenshot
```javascript
await mcp__playwright__browser_take_screenshot({
  filename: "sessionXX-YY-description.png"
})
```

### Full Page Screenshot
```javascript
await mcp__playwright__browser_take_screenshot({
  filename: "sessionXX-YY-description.png",
  fullPage: true
})
```

### Element Screenshot
```javascript
await mcp__playwright__browser_take_screenshot({
  filename: "sessionXX-YY-description.png",
  element: "routine card",
  ref: "[data-routine-id='abc123']"
})
```

---

## 🎯 Common Test Actions

### Navigation
```javascript
// Navigate to page
await mcp__playwright__browser_navigate({ url: "..." })

// Go back
await mcp__playwright__browser_navigate_back()
```

### Clicking
```javascript
// Click button
await mcp__playwright__browser_click({
  element: "finalize button",
  ref: "button[data-action='finalize']"
})

// Double click
await mcp__playwright__browser_click({
  element: "routine card",
  ref: "[data-routine-id='abc']",
  doubleClick: true
})
```

### Typing
```javascript
// Type in search
await mcp__playwright__browser_type({
  element: "search input",
  ref: "input[placeholder*='Search']",
  text: "Warriors"
})

// Type and submit
await mcp__playwright__browser_type({
  element: "search input",
  ref: "input[placeholder*='Search']",
  text: "Warriors",
  submit: true
})
```

### Drag and Drop
```javascript
// Drag routine to zone
await mcp__playwright__browser_drag({
  startElement: "routine card",
  startRef: "[data-routine-id='routine-123']",
  endElement: "Saturday AM zone",
  endRef: "[data-zone='saturday-am']"
})
```

### Waiting
```javascript
// Wait for time
await mcp__playwright__browser_wait_for({ time: 2 })

// Wait for text
await mcp__playwright__browser_wait_for({ text: "Schedule finalized" })

// Wait for text to disappear
await mcp__playwright__browser_wait_for({ textGone: "Loading..." })
```

### Checking Console
```javascript
// All messages
await mcp__playwright__browser_console_messages()

// Only errors
await mcp__playwright__browser_console_messages({ onlyErrors: true })
```

---

## 🔍 Visual Indicator Verification

### Check Routine Card Badges

```javascript
// Take snapshot
await mcp__playwright__browser_snapshot()

// Look for:
// - 🏆 trophy badge (gold background)
// - ⚠️ conflict badge (red/orange/yellow)
// - 📝 notes badge (blue)
// - 🎂 age change badge (yellow)

// Example: Verify gold border on last routine
// Look in snapshot for:
// - border-yellow-400 class
// - shadow with yellow color
// - 🏆 badge in top-left
```

### Check Conflict Box

```javascript
// Take snapshot
await mcp__playwright__browser_snapshot()

// Look for conflict box above routine:
// - Red/orange/yellow border
// - Dancer name displayed
// - "CONFLICT: [Name]" text
// - Routine numbers shown
// - Spacing count displayed
```

### Check Panel Collapse

```javascript
// Click collapse button
await mcp__playwright__browser_click({
  element: "collapse button",
  ref: "button[title*='Collapse']"
})

// Take screenshot
await mcp__playwright__browser_take_screenshot({
  filename: "panel-collapsed.png"
})

// Verify in snapshot:
// - Panel is minimized
// - Content is hidden
// - Expand button visible
```

---

## ✅ Pass/Fail Criteria

### Test PASSES if:
- ✅ All steps complete without errors
- ✅ Expected results match actual results
- ✅ No console errors (or only minor warnings)
- ✅ Visual elements display correctly
- ✅ Screenshots captured successfully

### Test FAILS if:
- ❌ Steps cannot be completed
- ❌ Expected results don't match actual
- ❌ Console shows critical errors
- ❌ Visual elements missing or broken
- ❌ Functionality doesn't work as expected

### Test is PARTIAL (⚠️) if:
- ⚠️ Most functionality works
- ⚠️ Minor visual issues
- ⚠️ Non-critical errors in console
- ⚠️ Workaround available
- ⚠️ Can continue testing

---

## 🚨 Error Handling

### If Test Fails:

**1. Document the Failure**
```markdown
- Take screenshot of error state
- Copy console errors
- Note what was expected vs actual
- Save evidence
```

**2. Determine Severity**
```markdown
CRITICAL (P0): Blocks all testing
  → Create BLOCKER_[DATE]_[ISSUE].md
  → Stop testing, notify user

HIGH (P1): Blocks this feature
  → Note in KNOWN_ISSUES.md
  → Skip related tests
  → Continue other tests

LOW (P2): Minor issue
  → Note in test tracker
  → Continue testing
```

**3. Recovery**
```markdown
- Refresh page if UI is broken
- Re-login if session expired
- Close and reopen browser if stuck
- Continue from next test
```

### If Playwright Errors:

```javascript
// Close browser completely
await mcp__playwright__browser_close()

// Start fresh
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/schedule"
})
```

---

## 📊 Session End Protocol (10 minutes)

### 1. Update Test Tracker

```markdown
# In E2E_MASTER_TEST_SUITE.md

- Mark completed tests with ✅
- Update progress percentages
- Note any failures with ❌
- Update "Resume At" pointer
- Update "Last Updated" date
```

### 2. Save Evidence

```bash
# Verify screenshots saved
ls .playwright-mcp/evidence/sessionXX/

# Should see all sessionXX-YY-*.png files
```

### 3. Create Session Summary

```markdown
# Create SESSION_XX_COMPLETE.md

## Session XX Summary
**Date:** [Date]
**Duration:** [Time]
**Tests Planned:** [N] tests
**Tests Completed:** [N] tests
**Tests Failed:** [N] tests

### Achievements:
- [List achievements]

### Issues Found:
- [List issues]

### Next Session:
- Resume at: [Test ID]
- Goal: [Description]
- Estimated time: [Time]
```

### 4. Commit Progress

```bash
# Stage changes
git add E2E_MASTER_TEST_SUITE.md
git add SESSION_XX_COMPLETE.md
git add .playwright-mcp/evidence/sessionXX/

# Commit
git commit -m "docs: Session XX E2E testing complete

- Completed X tests
- Evidence: Y screenshots
- Overall progress: Z%

Next: Session XX+1 - [Goal]"

# Push
git push origin tester
```

### 5. Archive Session Notes

```bash
# Move to archive
mv SESSION_XX_COMPLETE.md docs/archive/

# Update CURRENT_WORK.md
# - Note session completion
# - Update next session plan
```

---

## 🎯 Session Templates

### Session 59 Template

```markdown
# Session 59: P0 Critical Features

**Goal:** Verify all critical features work
**Duration:** 90 minutes
**Tests:** A1-A3, B1-B3, C1-C2, D1-D3

**Checklist:**
- [ ] Deploy verified (3928e97+)
- [ ] Browser opened
- [ ] Logged in as CD
- [ ] Initial screenshot taken
- [ ] Console clear of errors

**Tests:**
- [ ] A1: Routine Card Indicators (15 min)
- [ ] A2: Trophy Gold Borders (5 min)
- [ ] A3: Conflict Boxes (10 min)
- [ ] B1: Basic Drag-Drop (5 min)
- [ ] B2: Multi-Zone (10 min)
- [ ] B3: Undo/Redo (5 min)
- [ ] C1: Filter Collapse (5 min)
- [ ] C2: Trophy Collapse (5 min)
- [ ] D1: Draft Validation (10 min)
- [ ] D2: Schedule All (15 min)
- [ ] D3: Finalize (5 min)

**Evidence:** 11 screenshots expected
```

### Session 60 Template

```markdown
# Session 60: P1 Features & Edge Cases

**Goal:** Test advanced features
**Duration:** 90 minutes
**Tests:** E1-E3, F1-F2, G1-G2, H1-H2, I1, J1-J2

**Checklist:**
- [ ] Finalized schedule from Session 59
- [ ] All routines scheduled
- [ ] Browser ready
- [ ] Console clear

**Tests:**
- [ ] E1: Age Resolution (10 min)
- [ ] E2: Notes Badges (5 min)
- [ ] E3: Conflict Severities (5 min)
- [ ] F1: Award Block (10 min)
- [ ] F2: Break Block (5 min)
- [ ] G1: Multi-Filters (10 min)
- [ ] G2: Search Filter (5 min)
- [ ] H1: Publish Transition (10 min)
- [ ] H2: View Modes (10 min)
- [ ] I1: Requests Panel (10 min)
- [ ] J1: Day Switching (5 min)
- [ ] J2: Empty Zone (5 min)

**Evidence:** 12 screenshots expected
```

---

## 💡 Tips & Tricks

### Speed Up Testing

1. **Batch Screenshots:** Take multiple screenshots in sequence
2. **Use Shortcuts:** Ctrl+Z/Y for undo/redo instead of clicking
3. **Skip Animations:** Tests don't need to wait for animations
4. **Parallel Verification:** Check multiple things in one snapshot

### Avoid Common Mistakes

1. **Wrong Build:** Always verify commit hash first
2. **Cache Issues:** Hard refresh (Shift+F5) if UI looks wrong
3. **Stale State:** Refresh page between major test sections
4. **Screenshot Naming:** Follow convention exactly (session59-01-...)
5. **Console Check:** Always check console at start and end

### Troubleshooting

**UI Not Loading:**
- Check network tab (Playwright)
- Verify URL is correct
- Check if logged in
- Hard refresh page

**Drag-Drop Not Working:**
- Verify elements exist
- Check if page is interactive
- Try clicking first to focus
- Refresh if stuck

**Screenshots Not Saving:**
- Check file path is correct
- Verify directory exists
- Use relative paths only
- Check filename has .png extension

---

## 📚 Reference Links

**Test Suite:** `E2E_MASTER_TEST_SUITE.md`
**Evidence Folder:** `.playwright-mcp/evidence/`
**Issue Tracker:** `KNOWN_ISSUES.md`
**Blocker Template:** `BLOCKER_[DATE]_[ISSUE].md`
**Session Archive:** `docs/archive/`

**Spec Reference:**
- Master: `CompPortal/docs/SCHEDULING_SPEC_V4_UNIFIED.md`
- Holistic Report: `HOLISTIC_STATUS_REPORT_SESSION58.md`

**Credentials:** `.claude/docs/CREDENTIALS.md`
**Tenants:** `.claude/docs/TENANTS.md`

---

**Remember:** Testing is systematic. Follow the process, document everything, and don't skip steps. Quality > Speed.
