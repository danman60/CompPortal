# Scheduling Suite E2E - Phase 4: Edge Cases & Multi-Tenant

**Date:** November 15, 2025
**Version:** 1.1 (Chunked)
**Spec Reference:** SCHEDULING_SPEC_V4_UNIFIED.md
**Environment:** tester.compsync.net
**Deadline:** December 26, 2025

---

## Document Purpose

Phase 4 focuses on Edge Cases and Multi-Tenant Isolation - validating that the system handles unusual scenarios correctly and maintains data isolation across tenants.

**This phase covers:**
- ✅ EC-001: Panel Collapse/Expand
- ✅ EC-002: Filter Combinations
- ✅ EC-003: Day Selector Edge Cases
- ✅ EC-004: Conflict Severity Levels
- ✅ EC-005: Time Rounding
- ✅ EC-006: Auto-Renumber in Draft Mode
- ✅ MT-001: Cross-Tenant Data Leak Prevention
- ✅ MT-002: Studio Code Uniqueness Per Tenant

**Prerequisites:** [Phase 3: P1 High-Priority Features](./SCHEDULING_E2E_PHASE3_P1_HIGH_PRIORITY.md) should pass first

**Completion:** After Phase 4 passes, full E2E test suite is complete!

---

## Test Environment Setup

**Competition Data Required:**
- Competition: "Test Competition Spring 2026" (April 9-12, 2026)
- Competition ID: `1b786221-8f8e-413f-b532-06fa20a2ff63`
- 60+ routines submitted (mix of classifications, ages, genres)

**Multi-Tenant Testing:**
- EMPWR: `empwr.compsync.net`
- Glow: `glow.compsync.net` (tester environment)

**Login Credentials:**
- CD (Glow): `registration@glowdancecomp.com` / `1CompSyncLogin!`
- CD (EMPWR): `empwrdance@gmail.com` / `1CompSyncLogin!`

---

## 🧪 EDGE CASES & VALIDATION TESTS

### EC-001: Panel Collapse/Expand

**Test:** Verify panel controls work

```javascript
// Collapse left panel
await mcp__playwright__browser_click({
  element: "Left panel collapse button",
  ref: "button[data-panel-collapse='left']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "ec-001-left-collapsed.png"
});

// Maximize center panel
await mcp__playwright__browser_click({
  element: "Center panel maximize button",
  ref: "button[data-panel-maximize='center']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "ec-001-center-maximized.png"
});

// Restore layout
await mcp__playwright__browser_click({
  element: "Restore button",
  ref: "button[data-panel-restore]"
});
```

**Validation:**
- [ ] Left collapse: 50px thin bar
- [ ] Center maximize: 100% width
- [ ] Right collapse: 50px thin bar
- [ ] Restore: Default layout

---

### EC-002: Filter Combinations

**Test:** Apply multiple filters, verify AND logic

```javascript
// Apply Classification + Genre + Search
await mcp__playwright__browser_click({
  element: "Emerald filter",
  ref: "button[data-filter='emerald']"
});

await mcp__playwright__browser_click({
  element: "Jazz filter",
  ref: "button[data-filter='jazz']"
});

await mcp__playwright__browser_type({
  element: "Search",
  ref: "input[placeholder*='Search']",
  text: "Swan"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "ec-002-multiple-filters.png"
});
```

**Validation:**
- [ ] Shows routines matching ALL filters (AND logic)
- [ ] Active filters highlighted
- [ ] Clear Filters resets all

---

### EC-003: Day Selector Edge Cases

**Test:** Multi-day competition date handling

```javascript
// Competition: April 9-12 (4 days)

// Verify all 4 day tabs exist
await mcp__playwright__browser_snapshot();

// Click last day (Sunday)
await mcp__playwright__browser_click({
  element: "Sunday tab",
  ref: "button[data-day='2025-04-12']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "ec-003-day4-tab.png"
});
```

**Validation:**
- [ ] 4 day tabs shown (Thu, Fri, Sat, Sun)
- [ ] Dates from database: April 9, 10, 11, 12
- [ ] Active tab highlighted
- [ ] Routines filter by day

---

### EC-004: Conflict Severity Levels

**Test:** Verify severity indicators (critical/error/warning)

```javascript
// Back-to-back (0 between) = Critical
await mcp__playwright__browser_drag({
  startElement: "Routine 1",
  startRef: "div[data-routine='1']",
  endElement: "Position 1",
  endRef: "div[data-order='1']"
});

await mcp__playwright__browser_drag({
  startElement: "Routine 2 (same dancer)",
  startRef: "div[data-routine='2']",
  endElement: "Position 2",
  endRef: "div[data-order='2']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "ec-004-critical-conflict.png"
});

// 2 between (< 6) = Error
await mcp__playwright__browser_drag({
  startElement: "Routine 3",
  startRef: "div[data-routine='3']",
  endElement: "Position 5",
  endRef: "div[data-order='5']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "ec-004-error-conflict.png"
});

// 5 between (< 6) = Warning
await mcp__playwright__browser_drag({
  startElement: "Routine 4",
  startRef: "div[data-routine='4']",
  endElement: "Position 11",
  endRef: "div[data-order='11']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "ec-004-warning-conflict.png"
});
```

**Validation:**
- [ ] 0 between: Red background (critical)
- [ ] 1-3 between: Orange background (error)
- [ ] 4-5 between: Yellow background (warning)
- [ ] 6+ between: No conflict

---

### EC-005: Time Rounding

**Test:** Verify 5-minute rounding on block placement

```javascript
// Place award block at 2:33 PM
// (Exact implementation depends on how drag-drop sets time)

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "ec-005-time-rounding.png"
});
```

**Validation:**
- [ ] 2:33 PM → 2:35 PM
- [ ] 8:47 AM → 8:45 AM
- [ ] 11:52 AM → 11:50 AM

---

### EC-006: Auto-Renumber in Draft Mode

**Test:** Verify numbers renumber when dragging

```javascript
// Schedule 5 routines
// Drag routine 3 to position 1

await mcp__playwright__browser_drag({
  startElement: "Routine 3",
  startRef: "tr[data-routine-number='3']",
  endElement: "Position 1",
  endRef: "div[data-drop-zone][data-order='1']"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "ec-006-auto-renumber.png"
});
```

**Validation:**
- [ ] Draft mode: All routines renumber
- [ ] Old routine 3 becomes #1
- [ ] Old routines 1-2 shift down
- [ ] Finalized mode: Numbers DON'T change

---

## 🔒 MULTI-TENANT ISOLATION TESTS

### MT-001: Cross-Tenant Data Leak Prevention

**Test:** Verify EMPWR CD can't see Glow data

```javascript
// Login as EMPWR CD
await mcp__playwright__browser_navigate({
  url: "https://empwr.compsync.net/login"
});

await mcp__playwright__browser_fill_form({
  fields: [
    { name: "Email", type: "textbox", ref: "input[name='email']", value: "empwrdance@gmail.com" },
    { name: "Password", type: "textbox", ref: "input[name='password']", value: "1CompSyncLogin!" }
  ]
});

await mcp__playwright__browser_click({
  element: "Login",
  ref: "button[type='submit']"
});

// Navigate to schedule
await mcp__playwright__browser_navigate({
  url: "https://empwr.compsync.net/dashboard/director-panel/schedule"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "mt-001-empwr-schedule.png"
});

// Verify ONLY EMPWR routines visible
```

**Validation:**
- [ ] ONLY EMPWR routines visible
- [ ] NO Glow routines visible
- [ ] Tenant filter applied on all queries
- [ ] No cross-tenant leaks

---

### MT-002: Studio Code Uniqueness Per Tenant

**Test:** Verify studio A on EMPWR ≠ studio A on Glow

```javascript
// Check EMPWR Studio A
await mcp__playwright__browser_navigate({
  url: "https://empwr.compsync.net/dashboard/director-panel/schedule"
});

await mcp__playwright__browser_snapshot();

// Check Glow Studio A
await mcp__playwright__browser_navigate({
  url: "https://glow.compsync.net/dashboard/director-panel/schedule"
});

await mcp__playwright__browser_snapshot();
```

**Validation:**
- [ ] EMPWR Studio A ≠ Glow Studio A (different studios)
- [ ] Codes assigned per tenant
- [ ] No cross-tenant code conflicts

---

## Phase 4 Success Criteria

**Edge Cases & Multi-Tenant tests PASS if:**
- ✅ All 8 tests complete without errors
- ✅ Panel collapse/expand works
- ✅ Filter combinations use AND logic
- ✅ Day selector handles multi-day competitions
- ✅ Conflict severity levels correct
- ✅ Time rounding works
- ✅ Auto-renumber works in draft mode
- ✅ NO cross-tenant data leaks
- ✅ Studio codes unique per tenant

---

## 📋 FULL TEST SUITE SUMMARY

**Total Tests Across All Phases:** 25+
- **Phase 1:** Happy Path (1 test, 16 steps)
- **Phase 2:** P0 Critical (6 tests)
- **Phase 3:** P1 High-Priority (6 tests)
- **Phase 4:** Edge Cases & Multi-Tenant (8 tests)

**Estimated Execution Time:** 4-6 hours (full suite)

**Final Success Criteria:**
- ✅ All P0 tests pass (REQUIRED for launch)
- ✅ Happy path completes end-to-end (REQUIRED)
- ✅ No cross-tenant leaks (REQUIRED)
- ✅ No console errors
- ✅ All screenshots captured
- ⚠️ P1 tests: Best effort (not blocking)
- ⚠️ Edge cases: Best effort (not blocking)

---

## 🚀 NEXT STEPS AFTER COMPLETION

1. ✅ Execute all 4 phases on tester.compsync.net
2. ✅ Document failures in comprehensive bug report
3. ✅ Fix P0 blocking issues immediately
4. ✅ Re-run failed tests
5. ✅ Update spec compliance percentage
6. ✅ Create final test report with:
   - Total tests run
   - Pass/fail counts by phase
   - Critical issues found
   - Recommendations for launch readiness
7. ✅ Archive test evidence (screenshots, logs)

---

**Document Status:** ✅ COMPLETE (Phase 4 of 4)
**Estimated Execution Time:** 1-1.5 hours
**Target Environment:** tester.compsync.net + empwr.compsync.net
**Ready for Execution:** YES

---

## Related Documents

- [Phase 1: Happy Path](./SCHEDULING_E2E_PHASE1_HAPPY_PATH.md)
- [Phase 2: P0 Critical Features](./SCHEDULING_E2E_PHASE2_P0_CRITICAL.md)
- [Phase 3: P1 High-Priority Features](./SCHEDULING_E2E_PHASE3_P1_HIGH_PRIORITY.md)
- [Master Test Index](./SCHEDULING_E2E_TEST_INDEX.md)
