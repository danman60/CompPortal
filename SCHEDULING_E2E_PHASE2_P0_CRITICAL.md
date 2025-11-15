# Scheduling Suite E2E - Phase 2: P0 Critical Features

**Date:** November 15, 2025
**Version:** 1.1 (Chunked)
**Spec Reference:** SCHEDULING_SPEC_V4_UNIFIED.md
**Environment:** tester.compsync.net
**Deadline:** December 26, 2025

---

## Document Purpose

Phase 2 focuses on P0 (Priority Zero) Critical Features - the absolutely essential features that must work for the scheduling system to be viable.

**This phase covers:**
- ✅ P0-001: 3-Panel Layout
- ✅ P0-002: Manual Drag-Drop Scheduling
- ✅ P0-003: Conflict Detection
- ✅ P0-004: Studio Code Masking
- ✅ P0-005: State Machine (Draft/Finalized/Published)
- ✅ P0-006: Schedule Blocks (Award & Break)

**Prerequisites:** [Phase 1: Happy Path](./SCHEDULING_E2E_PHASE1_HAPPY_PATH.md) must pass first

**Next:** After Phase 2 passes, proceed to [Phase 3: P1 High-Priority Features](./SCHEDULING_E2E_PHASE3_P1_HIGH_PRIORITY.md)

---

## Test Environment Setup

**Competition Data Required:**
- Competition: "Test Competition Spring 2026" (April 9-12, 2026)
- Competition ID: `1b786221-8f8e-413f-b532-06fa20a2ff63`
- 60+ routines submitted (mix of classifications, ages, genres)
- 10+ studios with approved reservations
- Studio codes assigned (A, B, C, etc.)

**Login Credentials:**
- CD: `registration@glowdancecomp.com` / `1CompSyncLogin!`

**URL:** `https://tester.compsync.net/dashboard/director-panel/schedule`

---

## 🎯 P0 CRITICAL FEATURE TESTS

### P0-001: 3-Panel Layout

**Test:** Verify 3-panel horizontal layout loads correctly

```javascript
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/schedule"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "p0-001-3-panel-layout.png"
});
```

**Validation:**
- [ ] LEFT panel visible (25% width)
- [ ] CENTER panel visible (50% width)
- [ ] RIGHT panel visible (25% width)
- [ ] Each panel has collapse button
- [ ] Competition header shows name + dates

---

### P0-002: Manual Drag-Drop Scheduling

**Test:** Drag routine from pool to schedule

```javascript
// Drag routine
await mcp__playwright__browser_drag({
  startElement: "First routine in pool",
  startRef: "div[data-routine-card]:first-child",
  endElement: "Schedule drop zone",
  endRef: "div[data-schedule-grid]"
});

await mcp__playwright__browser_wait_for({ time: 2 });

await mcp__playwright__browser_take_screenshot({
  filename: "p0-002-drag-drop-success.png"
});
```

**Validation:**
- [ ] Routine moves from pool to schedule
- [ ] Entry number assigned
- [ ] Start time assigned
- [ ] Duration calculated
- [ ] Routine removed from pool

---

### P0-003: Conflict Detection

**Test:** Schedule two routines with same dancer < 6 apart

```javascript
// Schedule routine with Dancer A
await mcp__playwright__browser_drag({
  startElement: "Routine 1 with Dancer A",
  startRef: "div[data-routine-id='routine-1']",
  endElement: "Position 1",
  endRef: "div[data-drop-zone][data-order='1']"
});

// Schedule another routine with Dancer A at position 3 (only 1 between)
await mcp__playwright__browser_drag({
  startElement: "Routine 2 with Dancer A",
  startRef: "div[data-routine-id='routine-2']",
  endElement: "Position 3",
  endRef: "div[data-drop-zone][data-order='3']"
});

await mcp__playwright__browser_wait_for({ time: 2 });

await mcp__playwright__browser_take_screenshot({
  filename: "p0-003-conflict-detected.png"
});
```

**Validation:**
- [ ] Conflict warning appears
- [ ] Shows dancer name clearly
- [ ] Shows both routine numbers
- [ ] Shows spacing count (e.g., "1 routine between, need 6")
- [ ] Red/orange/yellow severity indicator
- [ ] Override button available

---

### P0-004: Studio Code Masking

**Test:** Verify studio codes mask identity until published

```javascript
// Check Judge View (codes only)
await mcp__playwright__browser_click({
  element: "Judge View button",
  ref: "button[data-view='judge']"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "p0-004-judge-view-codes-only.png"
});

// Check CD View (codes + full names)
await mcp__playwright__browser_click({
  element: "CD View button",
  ref: "button[data-view='cd']"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "p0-004-cd-view-full-names.png"
});
```

**Validation:**
- [ ] Judge View: "A" (code only, no "Studio" prefix)
- [ ] CD View: "Studio A (Starlight Dance Academy)"
- [ ] Studio codes assigned in registration order
- [ ] First approved = A, second = B, etc.

---

### P0-005: State Machine (Draft/Finalized/Published)

**Test:** Verify state transitions work correctly

```javascript
// Verify Draft state
await mcp__playwright__browser_wait_for({ text: "Draft" });

await mcp__playwright__browser_take_screenshot({
  filename: "p0-005-01-draft-state.png"
});

// Finalize
await mcp__playwright__browser_click({
  element: "Finalize button",
  ref: "button:has-text('Finalize Schedule')"
});

await mcp__playwright__browser_click({
  element: "Confirm",
  ref: "button:has-text('Confirm')"
});

await mcp__playwright__browser_wait_for({ text: "Finalized" });

await mcp__playwright__browser_take_screenshot({
  filename: "p0-005-02-finalized-state.png"
});

// Publish
await mcp__playwright__browser_click({
  element: "Publish button",
  ref: "button:has-text('Publish Schedule')"
});

await mcp__playwright__browser_click({
  element: "Confirm",
  ref: "button:has-text('Confirm')"
});

await mcp__playwright__browser_wait_for({ text: "Published" });

await mcp__playwright__browser_take_screenshot({
  filename: "p0-005-03-published-state.png"
});
```

**Validation:**
- [ ] Draft: Numbers auto-renumber on drag
- [ ] Finalize: Numbers lock, can't reorder
- [ ] Published: Studio names revealed, no changes
- [ ] Status badge updates (blue→orange→green)

---

### P0-006: Schedule Blocks (Award & Break)

**Test:** Create and place award/break blocks

```javascript
// Create Award Block
await mcp__playwright__browser_click({
  element: "Award Block button",
  ref: "button:has-text('🏆 +Award Block')"
});

await mcp__playwright__browser_fill_form({
  fields: [
    { name: "Title", type: "textbox", ref: "input[name='title']", value: "Solo Awards" },
    { name: "Duration", type: "combobox", ref: "select[name='duration']", value: "30" }
  ]
});

await mcp__playwright__browser_click({
  element: "Create button",
  ref: "button:has-text('Create')"
});

// Drag to schedule
await mcp__playwright__browser_drag({
  startElement: "Award block",
  startRef: "div[data-block-type='award']",
  endElement: "Schedule position",
  endRef: "div[data-drop-zone][data-order='5']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "p0-006-award-block-placed.png"
});

// Create Break Block
await mcp__playwright__browser_click({
  element: "Break Block button",
  ref: "button:has-text('☕ +Break Block')"
});

await mcp__playwright__browser_fill_form({
  fields: [
    { name: "Title", type: "textbox", ref: "input[name='title']", value: "Lunch" },
    { name: "Duration", type: "combobox", ref: "select[name='duration']", value: "60" }
  ]
});

await mcp__playwright__browser_click({
  element: "Create button",
  ref: "button:has-text('Create')"
});

await mcp__playwright__browser_drag({
  startElement: "Break block",
  startRef: "div[data-block-type='break']",
  endElement: "Schedule position",
  endRef: "div[data-drop-zone][data-order='10']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "p0-006-break-block-placed.png"
});
```

**Validation:**
- [ ] Award block: Purple background, custom title, 30 min duration
- [ ] Break block: Gray background, custom title, 60 min duration
- [ ] Start times round to nearest 5 minutes
- [ ] Trophy helper recommendation shows on award placement
- [ ] Subsequent routines renumber

---

## Phase 2 Success Criteria

**P0 tests PASS if:**
- ✅ All 6 P0 tests complete without errors
- ✅ 3-panel layout renders correctly
- ✅ Drag-drop works for routines and blocks
- ✅ Conflicts detected with proper severity
- ✅ Studio codes mask identity (Judge View)
- ✅ State transitions work (Draft→Finalized→Published)
- ✅ Award/break blocks functional

---

## Next Steps

**If Phase 2 PASSES:**
→ Proceed to [Phase 3: P1 High-Priority Features](./SCHEDULING_E2E_PHASE3_P1_HIGH_PRIORITY.md)

**If Phase 2 FAILS:**
1. Document which P0 test failed
2. Capture error screenshot
3. Check browser console for errors
4. Create BLOCKER.md (P0 failures block launch)
5. Fix critical issue
6. Re-run Phase 2

---

**Document Status:** ✅ COMPLETE (Phase 2 of 4)
**Estimated Execution Time:** 45-60 minutes
**Target Environment:** tester.compsync.net
