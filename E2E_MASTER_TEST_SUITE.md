# CompPortal Scheduling - Master E2E Test Suite

**Project:** CompPortal Phase 2 - Scheduling System
**Environment:** tester.compsync.net
**Competition:** Test Competition Spring 2026
**Current Build:** 3928e97 (Session 58 - All UI gaps complete)
**Last Updated:** November 16, 2025

---

## 📊 Overall Progress

**Total Tests:** 32 tests (across all priorities)
**Completed:** 15 tests (47%)
**In Progress:** 0 tests
**Not Started:** 17 tests (53%)
**Estimated Time Remaining:** ~4.5 hours

---

## 🎯 Quick Resume Guide

### Current Status: Session 58 Complete

**Last Session Achievements:**
- ✅ All UI/feature gaps completed
- ✅ Visual indicators on routine cards
- ✅ Conflict boxes in schedule grid
- ✅ Age change resolution actions
- ✅ Time rounding display
- ✅ Build passing (TypeScript ✓)

**Next Session Goal:** Complete P0 Critical Testing (1 hour)

**Resume At:** **Test Suite A1** (Visual Indicators Verification)

---

## 📋 Test Organization

### By Priority

| Priority | Tests | Completed | % Done | Time Remaining |
|----------|-------|-----------|--------|----------------|
| **P0 Critical** | 12 tests | 6 tests | 50% | 90 min |
| **P1 High Priority** | 10 tests | 5 tests | 50% | 90 min |
| **P2 Edge Cases** | 10 tests | 4 tests | 40% | 90 min |
| **TOTAL** | 32 tests | 15 tests | 47% | 4.5 hrs |

### By Feature Area

| Feature | Tests | Completed | Status |
|---------|-------|-----------|--------|
| Visual Indicators | 6 tests | 0 tests | 🆕 NEW |
| Drag-Drop Workflow | 4 tests | 2 tests | 🟡 Partial |
| Conflict Detection | 3 tests | 0 tests | 🔴 Critical |
| State Machine | 3 tests | 1 test | 🟡 Partial |
| Trophy Helper | 2 tests | 1 test | 🟢 Mostly Done |
| View Modes | 2 tests | 2 tests | ✅ Complete |
| Schedule Blocks | 3 tests | 2 tests | 🟢 Mostly Done |
| Multi-Tenant | 2 tests | 0 tests | ⏸️ Deferred |
| Filters | 3 tests | 2 tests | 🟢 Mostly Done |
| Age Changes | 2 tests | 1 test | 🟡 Partial |
| Panel Controls | 2 tests | 0 tests | 🆕 NEW |

---

## 🚀 Session-Based Test Plan

### Session 59: P0 Critical Features (90 minutes)

**Goal:** Verify all critical features work end-to-end

**Prerequisites:**
- Deploy 3928e97 to tester.compsync.net
- Open Playwright MCP browser
- Login as CD (empwrdance@gmail.com / 1CompSyncLogin!)
- Navigate to /dashboard/director-panel/schedule

**Tests in This Session:**

#### **A. Visual Indicators Suite (30 min)** 🆕

**A1. Routine Card Visual Indicators (15 min)**
- [ ] Navigate to schedule page (tester.compsync.net)
- [ ] Verify unscheduled routines display in left panel
- [ ] Take screenshot: `session59-01-routine-cards-initial.png`
- [ ] Check for visual indicators (should be none yet - no conflicts/notes)
- [ ] **Expected:** Cards show with no badges initially
- [ ] **Evidence:** Screenshot showing clean routine cards

**A2. Trophy Helper Gold Borders (5 min)**
- [ ] Schedule 5+ routines to create trophy helper entries
- [ ] Check trophy helper panel for last routines
- [ ] Find those routines in schedule grid
- [ ] **Expected:** Last routines have gold borders + 🏆 badge
- [ ] Take screenshot: `session59-02-gold-borders.png`
- [ ] **Evidence:** Gold borders visible on last routines

**A3. Conflict Creation & Detection (10 min)**
- [ ] Identify a dancer in multiple routines (check routine details)
- [ ] Schedule both routines close together (< 6 routines apart)
- [ ] **Expected:** Red conflict box appears above routines
- [ ] **Expected:** Routine cards show ⚠️ badge
- [ ] Take screenshot: `session59-03-conflict-box.png`
- [ ] Verify conflict shows dancer name + spacing count
- [ ] **Evidence:** Conflict box with all details

#### **B. Drag-Drop Core Workflow (20 min)**

**B1. Basic Drag-Drop (5 min)**
- [ ] Drag routine from pool to Saturday AM
- [ ] Verify routine moves to zone
- [ ] Verify pool count decreases
- [ ] Verify zone count increases
- [ ] **Expected:** Smooth drag-drop, counts update
- [ ] Take screenshot: `session59-04-drag-drop-success.png`

**B2. Multi-Zone Scheduling (10 min)**
- [ ] Drag 3 routines to Saturday AM
- [ ] Drag 3 routines to Saturday PM
- [ ] Drag 3 routines to Sunday AM
- [ ] Drag 3 routines to Sunday PM
- [ ] Verify each zone shows correct count
- [ ] Refresh page - verify persistence
- [ ] **Expected:** All routines remain scheduled after refresh
- [ ] Take screenshot: `session59-05-multi-zone.png`

**B3. Undo/Redo Testing (5 min)** 🆕
- [ ] Schedule a routine
- [ ] Press Ctrl+Z (undo)
- [ ] **Expected:** Routine returns to pool, toast shows "↶ Undo successful"
- [ ] Press Ctrl+Y (redo)
- [ ] **Expected:** Routine returns to zone, toast shows "↷ Redo successful"
- [ ] Test undo/redo toolbar buttons
- [ ] **Expected:** Buttons enable/disable correctly
- [ ] Take screenshot: `session59-06-undo-redo.png`

#### **C. Panel Controls Testing (10 min)** 🆕

**C1. Filter Panel Collapse (5 min)**
- [ ] Click collapse button on filter panel (◀ icon)
- [ ] **Expected:** Panel collapses to thin bar
- [ ] Click expand button
- [ ] **Expected:** Panel expands back
- [ ] Verify state persists during drag operations
- [ ] Take screenshot: `session59-07-filter-collapse.png`

**C2. Trophy Helper Panel Collapse (5 min)**
- [ ] Click collapse button on trophy helper (▼ icon)
- [ ] **Expected:** Panel content hides
- [ ] Click expand button (▶ icon)
- [ ] **Expected:** Panel content shows
- [ ] Take screenshot: `session59-08-trophy-collapse.png`

#### **D. State Machine Basics (30 min)**

**D1. Draft Mode Validation (10 min)**
- [ ] Verify status badge shows "📝 Draft"
- [ ] Verify finalize button is disabled (unscheduled routines remain)
- [ ] Hover over disabled button
- [ ] **Expected:** Tooltip shows "Cannot finalize: X unscheduled routines"
- [ ] Take screenshot: `session59-09-draft-validation.png`

**D2. Schedule All Routines (15 min)**
- [ ] Schedule remaining unscheduled routines
- [ ] Distribute across all 4 zones
- [ ] Verify pool shows "0 routines"
- [ ] Verify finalize button becomes enabled
- [ ] **Expected:** "🔒 Finalize Schedule" button clickable
- [ ] Take screenshot: `session59-10-all-scheduled.png`

**D3. Finalize Workflow (5 min)**
- [ ] Click "🔒 Finalize Schedule" button
- [ ] **Expected:** Status badge changes to "🔒 Finalized"
- [ ] **Expected:** Entry numbers lock
- [ ] Verify publish button appears
- [ ] Take screenshot: `session59-11-finalized-state.png`

**Session 59 Success Criteria:**
- ✅ All visual indicators display correctly
- ✅ Drag-drop works smoothly
- ✅ Undo/redo functional
- ✅ Panel collapse/expand works
- ✅ State machine transitions correctly
- ✅ 10 screenshots captured as evidence

---

### Session 60: P1 Features & Edge Cases (90 minutes)

**Goal:** Test advanced features and edge cases

**Prerequisites:**
- Finalized schedule from Session 59
- All routines scheduled

**Tests in This Session:**

#### **E. Advanced Visual Indicators (20 min)** 🆕

**E1. Age Change Detection & Resolution (10 min)**
- [ ] Check age warnings panel
- [ ] If warnings present:
  - [ ] Click "✓ Resolve" button
  - [ ] **Expected:** Toast shows "Age change resolved for [Name]"
  - [ ] Click "⚙️ Override" button
  - [ ] **Expected:** Toast shows "Age change override for [Name]"
- [ ] If no warnings, note that feature renders correctly
- [ ] Take screenshot: `session60-01-age-resolution.png`

**E2. Notes Badges (5 min)**
- [ ] Add CD note to a routine (click routine, add note)
- [ ] **Expected:** Routine card shows 📝 badge
- [ ] Verify badge appears in both pool and grid
- [ ] Take screenshot: `session60-02-notes-badge.png`

**E3. Conflict Severity Levels (5 min)**
- [ ] Create critical conflict (0 routines between)
- [ ] **Expected:** Red box, red badge
- [ ] Create error conflict (1-3 routines between)
- [ ] **Expected:** Orange box, orange badge
- [ ] Create warning conflict (4-5 routines between)
- [ ] **Expected:** Yellow box, yellow badge
- [ ] Take screenshot: `session60-03-conflict-severities.png`

#### **F. Schedule Blocks Advanced (15 min)**

**F1. Award Block with Trophy Helper (10 min)**
- [ ] Open trophy helper panel
- [ ] Note suggested award time for a category
- [ ] Click "➕ Add Schedule Block" → Award
- [ ] Enter title, duration
- [ ] **Expected:** See time rounding note "⏰ Block start times auto-round..."
- [ ] Drag block to schedule
- [ ] Verify block appears in zone
- [ ] Take screenshot: `session60-04-award-block.png`

**F2. Break Block Placement (5 min)**
- [ ] Create break block (☕)
- [ ] Drag to schedule between routines
- [ ] Verify block displays correctly
- [ ] Take screenshot: `session60-05-break-block.png`

#### **G. Filter Combinations (15 min)**

**G1. Multi-Select Filters (10 min)**
- [ ] Select multiple classifications (Emerald + Sapphire)
- [ ] **Expected:** Only those classifications show
- [ ] Add genre filter (Jazz)
- [ ] **Expected:** Emerald Jazz + Sapphire Jazz only
- [ ] Add age group (Junior)
- [ ] **Expected:** Further filtered to Junior only
- [ ] Clear all filters
- [ ] **Expected:** All routines show again
- [ ] Take screenshot: `session60-06-multi-filters.png`

**G2. Search Filter (5 min)**
- [ ] Enter routine name in search box
- [ ] **Expected:** Only matching routines show
- [ ] Clear search
- [ ] Test with studio name
- [ ] **Expected:** Studio's routines show
- [ ] Take screenshot: `session60-07-search-filter.png`

#### **H. Publish Workflow (20 min)**

**H1. Publish Transition (10 min)**
- [ ] From finalized state, click "✅ Publish Schedule"
- [ ] **Expected:** Status badge changes to "✅ Published"
- [ ] **Expected:** Studio codes reveal full names (if in Public view)
- [ ] Verify no edit controls available
- [ ] Take screenshot: `session60-08-published-state.png`

**H2. View Mode Verification (10 min)**
- [ ] Switch to Judge View
- [ ] **Expected:** Codes only, no full names
- [ ] Switch to Public View
- [ ] **Expected:** Full studio names revealed
- [ ] Switch to Studio View
- [ ] **Expected:** Only that studio's routines (if logged as SD)
- [ ] Switch back to CD View
- [ ] Take screenshot: `session60-09-view-modes.png`

#### **I. Studio Requests Panel (10 min)** 🆕

**I1. Requests Button & Panel (10 min)**
- [ ] Check toolbar for "📝 Requests" button
- [ ] Note badge count (may be 0)
- [ ] Click button
- [ ] **Expected:** Studio requests panel toggles
- [ ] If requests exist, verify display
- [ ] Click button again to hide panel
- [ ] Take screenshot: `session60-10-requests-panel.png`

#### **J. Edge Cases (10 min)**

**J1. Day Selector Edge Cases (5 min)**
- [ ] Switch between Saturday and Sunday tabs
- [ ] Verify routines filter correctly
- [ ] Verify conflicts only show for current day
- [ ] Take screenshot: `session60-11-day-switching.png`

**J2. Empty State Handling (5 min)**
- [ ] Unschedule all routines from a zone (drag back to pool)
- [ ] **Expected:** Zone shows "Drop routines here" placeholder
- [ ] Verify pool shows all routines again
- [ ] Take screenshot: `session60-12-empty-zone.png`

**Session 60 Success Criteria:**
- ✅ All advanced features tested
- ✅ Edge cases handled gracefully
- ✅ Publish workflow complete
- ✅ 12 screenshots captured

---

### Session 61: Production Multi-Tenant (30 minutes)

**Goal:** Verify tenant isolation on production

**Prerequisites:**
- Access to empwr.compsync.net and glow.compsync.net
- Schedule data on both tenants

**Tests in This Session:**

#### **K. Multi-Tenant Security (20 min)**

**K1. Cross-Tenant Data Leak Prevention (10 min)**
- [ ] Login to EMPWR (empwr.compsync.net)
- [ ] Navigate to schedule page
- [ ] Note routine count and studio codes
- [ ] Take screenshot: `session61-01-empwr-schedule.png`
- [ ] Login to Glow (glow.compsync.net) in new tab
- [ ] Navigate to schedule page
- [ ] **Expected:** Different routines, different studios
- [ ] **Expected:** No EMPWR data visible
- [ ] Verify studio codes are different
- [ ] Take screenshot: `session61-02-glow-schedule.png`

**K2. Studio Code Uniqueness (10 min)**
- [ ] On EMPWR, check studio codes (should be A, B, C, ...)
- [ ] On Glow, check studio codes (should also be A, B, C, ...)
- [ ] **Expected:** Same codes, different studios (tenant-specific)
- [ ] Verify code assignment order matches reservation approval order
- [ ] Take screenshot: `session61-03-studio-codes.png`

#### **L. Production Smoke Test (10 min)**

**L1. Basic Workflow on Production (10 min)**
- [ ] On one tenant, perform basic drag-drop
- [ ] Verify visual indicators work
- [ ] Check conflict detection
- [ ] Verify state machine
- [ ] **Expected:** All features work same as tester
- [ ] Take screenshot: `session61-04-production-smoke.png`

**Session 61 Success Criteria:**
- ✅ Tenant isolation verified
- ✅ No cross-tenant data leaks
- ✅ Studio codes unique per tenant
- ✅ Production features functional

---

## 📋 Complete Test Reference

### P0 Critical Tests (12 tests)

| ID | Test Name | Status | Time | Evidence | Session |
|----|-----------|--------|------|----------|---------|
| A1 | Routine Card Visual Indicators | ❌ Not Started | 15 min | session59-01 | 59 |
| A2 | Trophy Helper Gold Borders | ❌ Not Started | 5 min | session59-02 | 59 |
| A3 | Conflict Box Display | ❌ Not Started | 10 min | session59-03 | 59 |
| B1 | Basic Drag-Drop | ✅ Complete | 5 min | schedule-comprehensive-test.png | 55 |
| B2 | Multi-Zone Scheduling | ✅ Complete | 10 min | schedule-comprehensive-test.png | 55 |
| B3 | Undo/Redo Functionality | ❌ Not Started | 5 min | session59-06 | 59 |
| C1 | Filter Panel Collapse | ❌ Not Started | 5 min | session59-07 | 59 |
| C2 | Trophy Helper Collapse | ❌ Not Started | 5 min | session59-08 | 59 |
| D1 | Draft Mode Validation | ✅ Complete | 10 min | hp-step14-01.png | 56 |
| D2 | Schedule All Routines | ⏸️ Partial | 15 min | - | 59 |
| D3 | Finalize Workflow | ✅ Complete | 5 min | p0-005-02.png | 56 |
| D4 | Publish Workflow | ❌ Not Started | 10 min | session60-08 | 60 |

### P1 High-Priority Tests (10 tests)

| ID | Test Name | Status | Time | Evidence | Session |
|----|-----------|--------|------|----------|---------|
| E1 | Age Change Resolution | ❌ Not Started | 10 min | session60-01 | 60 |
| E2 | Notes Badges | ❌ Not Started | 5 min | session60-02 | 60 |
| E3 | Conflict Severity Levels | ❌ Not Started | 5 min | session60-03 | 60 |
| F1 | Award Block + Trophy | ✅ Complete | 10 min | p0-006-SUCCESS.png | 56 |
| F2 | Break Block Placement | ✅ Complete | 5 min | p0-006-SUCCESS.png | 56 |
| G1 | Multi-Select Filters | ⏸️ Partial | 10 min | e2e-filter-emerald-jazz.png | 55 |
| G2 | Search Filter | ❌ Not Started | 5 min | session60-07 | 60 |
| H1 | Publish Transition | ❌ Not Started | 10 min | session60-08 | 60 |
| H2 | View Mode Verification | ✅ Complete | 10 min | session-57-05/06/07.png | 57 |
| I1 | Studio Requests Panel | ❌ Not Started | 10 min | session60-10 | 60 |

### P2 Edge Cases (10 tests)

| ID | Test Name | Status | Time | Evidence | Session |
|----|-----------|--------|------|----------|---------|
| J1 | Day Selector Edge Cases | ✅ Complete | 5 min | schedule-comprehensive-test.png | 55 |
| J2 | Empty Zone Handling | ❌ Not Started | 5 min | session60-12 | 60 |
| J3 | Routine Reordering | ❌ Not Started | 10 min | - | 62 |
| J4 | Block Editing | ❌ Not Started | 5 min | - | 62 |
| J5 | Block Deletion | ❌ Not Started | 5 min | - | 62 |
| J6 | Conflict Override | ❌ Not Started | 10 min | - | 62 |
| J7 | Time Rounding Verification | ❌ Not Started | 10 min | - | 62 |
| J8 | Auto-Renumber in Draft | ✅ Complete | 5 min | - | 55 |
| K1 | Cross-Tenant Data Leak | ❌ Not Started | 10 min | session61-01/02 | 61 |
| K2 | Studio Code Uniqueness | ❌ Not Started | 10 min | session61-03 | 61 |

---

## 🎯 Testing Checklist

### Before Each Session

- [ ] Check latest commit deployed to tester.compsync.net
- [ ] Clear browser cache (Shift+F5)
- [ ] Check footer for commit hash (should match expected)
- [ ] Open Playwright MCP browser
- [ ] Login with correct credentials
- [ ] Navigate to schedule page
- [ ] Take initial screenshot

### During Testing

- [ ] Follow test steps exactly as written
- [ ] Take screenshots at each checkpoint
- [ ] Note any unexpected behavior
- [ ] Verify expected results match actual
- [ ] Check browser console for errors (playwright:browser_console_messages)
- [ ] Test on both EMPWR and Glow if production test

### After Each Test

- [ ] Mark test status (✅ Pass, ❌ Fail, ⚠️ Partial)
- [ ] Save screenshot to .playwright-mcp/evidence/
- [ ] Update tracker with result
- [ ] Note any bugs in KNOWN_ISSUES.md
- [ ] If failure, create BLOCKER_*.md if critical

### After Each Session

- [ ] Update this file with progress
- [ ] Move completed session notes to docs/archive/
- [ ] Update SESSION_X_COMPLETE.md
- [ ] Commit all evidence and notes
- [ ] Push to tester branch
- [ ] Update CURRENT_WORK.md for next session

---

## 📊 Evidence Requirements

### Screenshot Naming Convention

```
session[XX]-[YY]-[description].png

Where:
  XX = Session number (59, 60, 61, etc.)
  YY = Sequential number within session (01, 02, 03, etc.)
  description = Brief test description (kebab-case)

Examples:
  session59-01-routine-cards-initial.png
  session59-02-gold-borders.png
  session60-01-age-resolution.png
```

### Required Evidence Per Test

| Test Type | Evidence Required |
|-----------|-------------------|
| Visual Feature | 1-2 screenshots showing feature working |
| Workflow | Screenshots at key steps (before/during/after) |
| State Transition | Before + after screenshots |
| Error Case | Screenshot of error + console output |
| Multi-Step | Screenshot per major step |

### Evidence Storage

**Location:** `.playwright-mcp/evidence/`

**Organization:**
```
.playwright-mcp/evidence/
├── session59/
│   ├── 01-routine-cards-initial.png
│   ├── 02-gold-borders.png
│   └── ...
├── session60/
│   └── ...
└── archive/
    ├── session55/
    ├── session56/
    └── session57/
```

---

## 🚨 Known Issues & Blockers

### Active Blockers

**NONE** - All critical blockers resolved as of Session 58

### Deferred Tests

| Test | Reason | Resume When |
|------|--------|-------------|
| Studio Requests E2E | SD portal not configured in tester | Configure SD user |
| Multi-Tenant Tests | Production only | After tester validation |

### Minor Issues (Non-Blocking)

1. **State Machine DB Errors:** Logs errors but transitions work (BLOCKER_SCHEDULING_STATE_MACHINE_20251115.md)
   - Status: Documented, non-blocking
   - Impact: None on functionality

---

## 📈 Progress Tracking

### Completion Metrics

**By Session:**
- Session 55-57: 15 tests completed (foundation)
- Session 58: 0 tests (frontend development)
- Session 59: Target 10 tests (P0 critical)
- Session 60: Target 10 tests (P1 + edge cases)
- Session 61: Target 2 tests (multi-tenant)
- Session 62: Target 5 tests (polish)

**By Priority:**
- P0: 6/12 complete (50%) → Target 100% by Session 59
- P1: 5/10 complete (50%) → Target 100% by Session 60
- P2: 4/10 complete (40%) → Target 80% by Session 61

**Overall:** 15/32 tests (47%) → Target 95% by Session 61

---

## 🎬 Quick Start Commands

### Open Test Environment
```bash
# Playwright navigate to tester
playwright.navigate("https://tester.compsync.net/dashboard/director-panel/schedule")

# Take screenshot
playwright.screenshot("session59-01-initial-state.png")

# Check console
playwright.browser_console_messages()

# Click element
playwright.click("button[data-action='finalize']")
```

### Verify Build
```bash
# Check deployed version
playwright.navigate("https://tester.compsync.net")
playwright.screenshot("footer-commit-hash.png")
# Look for commit hash in footer
```

---

## 📝 Notes

**Test Data:**
- Competition: Test Competition Spring 2026
- Routines: 60 routines loaded
- Studios: 5 studios (A, B, C, D, E)
- Classifications: Emerald, Sapphire, Crystal, Titanium
- Sessions: Saturday AM/PM, Sunday AM/PM

**Credentials:**
- CD: empwrdance@gmail.com / 1CompSyncLogin!
- SD: djamusic@gmail.com / 123456
- SA: danieljohnabrahamson@gmail.com / 123456

**Key URLs:**
- Tester: https://tester.compsync.net
- EMPWR: https://empwr.compsync.net
- Glow: https://glow.compsync.net

---

**Last Updated:** November 16, 2025 - Session 58
**Next Session:** Session 59 - P0 Critical Features (90 min)
**Resume At:** Test A1 - Routine Card Visual Indicators
