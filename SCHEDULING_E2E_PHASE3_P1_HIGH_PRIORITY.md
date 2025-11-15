# Scheduling Suite E2E - Phase 3: P1 High-Priority Features

**Date:** November 15, 2025
**Version:** 1.1 (Chunked)
**Spec Reference:** SCHEDULING_SPEC_V4_UNIFIED.md
**Environment:** tester.compsync.net
**Deadline:** December 26, 2025

---

## Document Purpose

Phase 3 focuses on P1 (Priority One) High-Priority Features - important features that significantly enhance the scheduling experience but are not absolutely critical for launch.

**This phase covers:**
- ✅ P1-001: Trophy Helper Report
- ✅ P1-002: Studio Feedback System
- ✅ P1-003: Age Change Detection
- ✅ P1-004: Routine Notes System
- ✅ P1-005: View Mode Filtering
- ✅ P1-006: Hotel Attrition Warning

**Prerequisites:** [Phase 2: P0 Critical Features](./SCHEDULING_E2E_PHASE2_P0_CRITICAL.md) must pass first

**Next:** After Phase 3 passes, proceed to [Phase 4: Edge Cases & Multi-Tenant](./SCHEDULING_E2E_PHASE4_EDGE_CASES.md)

---

## Test Environment Setup

**Competition Data Required:**
- Competition: "Test Competition Spring 2026" (April 9-12, 2026)
- Competition ID: `1b786221-8f8e-413f-b532-06fa20a2ff63`
- 60+ routines submitted (mix of classifications, ages, genres)
- 10+ studios with approved reservations

**Login Credentials:**
- CD: `registration@glowdancecomp.com` / `1CompSyncLogin!`
- SD: `djamusic@gmail.com` / `123456`

**URL:** `https://tester.compsync.net/dashboard/director-panel/schedule`

---

## 🎯 P1 HIGH-PRIORITY FEATURE TESTS

### P1-001: Trophy Helper Report

**Test:** Verify trophy helper shows last routine per category

```javascript
// Schedule 20+ routines across multiple categories
// (Solo Mini Emerald, Duet Junior Sapphire, etc.)

// Check trophy helper panel
await mcp__playwright__browser_evaluate({
  function: "() => { document.querySelector('[data-panel=\"trophy-helper\"]').scrollIntoView(); }"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "p1-001-trophy-helper.png"
});
```

**Validation:**
- [ ] Shows last routine per overall category
- [ ] Categories: Category Type + Age + Classification (NOT genre)
- [ ] Displays: Last routine #, time, total count
- [ ] Suggested award time = last + 30 min
- [ ] Last routines highlighted in schedule (gold border + 🏆)
- [ ] Updates in real-time

---

### P1-002: Studio Feedback System

**Test:** Studio adds request, CD manages it

```javascript
// Login as Studio
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/login"
});

await mcp__playwright__browser_fill_form({
  fields: [
    { name: "Email", type: "textbox", ref: "input[name='email']", value: "djamusic@gmail.com" },
    { name: "Password", type: "textbox", ref: "input[name='password']", value: "123456" }
  ]
});

await mcp__playwright__browser_click({
  element: "Login",
  ref: "button[type='submit']"
});

// Go to studio schedule
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/studio/schedule"
});

// Add request
await mcp__playwright__browser_click({
  element: "Add Note button",
  ref: "button[data-add-note]:first-child"
});

await mcp__playwright__browser_type({
  element: "Note textarea",
  ref: "textarea[name='note']",
  text: "Please schedule after 3pm"
});

await mcp__playwright__browser_click({
  element: "Submit",
  ref: "button:has-text('Submit')"
});

await mcp__playwright__browser_take_screenshot({
  filename: "p1-002-studio-request-added.png"
});

// Login as CD
// (logout, login as CD, navigate to requests)

await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/studio-requests"
});

await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "p1-002-cd-requests-list.png"
});

// Mark as completed
await mcp__playwright__browser_click({
  element: "Complete button",
  ref: "button[data-action='complete']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "p1-002-request-completed.png"
});
```

**Validation:**
- [ ] Studio sees ONLY their routines
- [ ] Can add note/request
- [ ] Blue dot appears on routine with pending request
- [ ] CD sees all requests from all studios
- [ ] Can filter by studio, status
- [ ] Can mark complete/ignored
- [ ] Status updates correctly

---

### P1-003: Age Change Detection

**Test:** Change dancer birthdate, verify highlight

```javascript
// (Requires modifying dancer birthdate in database)
// Then reload schedule

await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/schedule"
});

// Check for age change warnings
await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "p1-003-age-change-detected.png"
});

// Hover over routine with age change
await mcp__playwright__browser_hover({
  element: "Routine with age change",
  ref: "div[data-age-changed='true']"
});

await mcp__playwright__browser_take_screenshot({
  filename: "p1-003-age-change-tooltip.png"
});
```

**Validation:**
- [ ] Routine highlighted yellow
- [ ] Warning icon (⚠️)
- [ ] Hover shows: "Age Changed: Mini (8.5) → Junior (9.2)"
- [ ] CD can mark as resolved
- [ ] CD can drag to correct age group

---

### P1-004: Routine Notes System

**Test:** CD adds private note

```javascript
// Click on routine
await mcp__playwright__browser_click({
  element: "Routine row",
  ref: "tr[data-routine-id]:first-child"
});

// Open notes panel
await mcp__playwright__browser_click({
  element: "Notes button",
  ref: "button:has-text('Notes')"
});

// Add CD private note
await mcp__playwright__browser_type({
  element: "CD note textarea",
  ref: "textarea[name='cd_note']",
  text: "VIP studio - prioritize scheduling"
});

await mcp__playwright__browser_click({
  element: "Save note",
  ref: "button:has-text('Save')"
});

await mcp__playwright__browser_take_screenshot({
  filename: "p1-004-cd-private-note.png"
});
```

**Validation:**
- [ ] CD can add private notes
- [ ] 📝 icon appears on routine
- [ ] Hover shows note preview
- [ ] Studio does NOT see CD private notes
- [ ] CD sees all 3 note types (CD, studio, submission)

---

### P1-005: View Mode Filtering

**Test:** Verify all view modes work correctly

```javascript
// Test each view mode
const viewModes = ['cd', 'studio', 'judge', 'public'];

for (const mode of viewModes) {
  await mcp__playwright__browser_click({
    element: `${mode} view button`,
    ref: `button[data-view='${mode}']`
  });

  await mcp__playwright__browser_wait_for({ time: 1 });

  await mcp__playwright__browser_snapshot();

  await mcp__playwright__browser_take_screenshot({
    filename: `p1-005-view-${mode}.png`
  });
}
```

**Validation:**
- [ ] CD: Full schedule, codes + names, all notes
- [ ] Studio: ONLY their routines, their full name, their requests
- [ ] Judge: Full schedule, codes ONLY, no notes
- [ ] Public: Full schedule (after published), full names, no notes

---

### P1-006: Hotel Attrition Warning

**Test:** Schedule all Emerald on one day, check warning

```javascript
// Schedule 15 Emerald routines on Day 1 only

// Check for warning
await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_take_screenshot({
  filename: "p1-006-attrition-warning.png"
});
```

**Validation:**
- [ ] Warning appears: "All Emerald routines on single day"
- [ ] Suggests spreading across multiple days
- [ ] Warning severity: Warning (not error)

---

## Phase 3 Success Criteria

**P1 tests PASS if:**
- ✅ All 6 P1 tests complete without errors
- ✅ Trophy helper tracks categories correctly
- ✅ Studio feedback system functional
- ✅ Age changes detected and highlighted
- ✅ Routine notes system works
- ✅ All view modes filter correctly
- ✅ Hotel attrition warning appears

**Note:** P1 failures are NOT blockers for launch, but should be documented and prioritized for post-launch fixes.

---

## Next Steps

**If Phase 3 PASSES:**
→ Proceed to [Phase 4: Edge Cases & Multi-Tenant](./SCHEDULING_E2E_PHASE4_EDGE_CASES.md)

**If Phase 3 FAILS:**
1. Document which P1 test failed
2. Capture error screenshot
3. Create issue in tracking system
4. Decide: Fix now OR defer to post-launch
5. If fixing now: Re-run Phase 3

---

**Document Status:** ✅ COMPLETE (Phase 3 of 4)
**Estimated Execution Time:** 45-60 minutes
**Target Environment:** tester.compsync.net
