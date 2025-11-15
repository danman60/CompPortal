# Scheduling Suite E2E - Phase 1: Happy Path

**Date:** November 15, 2025
**Version:** 1.1 (Chunked)
**Spec Reference:** SCHEDULING_SPEC_V4_UNIFIED.md
**Environment:** tester.compsync.net
**Deadline:** December 26, 2025

---

## Document Purpose

Phase 1 focuses on the complete end-to-end happy path workflow - the critical path that tests the full CD scheduling journey from draft to published schedule.

**This phase covers:**
- ✅ Complete Happy Path (HP-001) - 16 steps
- ✅ 3-panel layout verification
- ✅ Filter/search functionality
- ✅ Drag-drop scheduling
- ✅ Conflict detection
- ✅ Trophy helper
- ✅ Award/break blocks
- ✅ View modes (CD/Judge/Studio/Public)
- ✅ Studio requests workflow
- ✅ Finalize → Publish workflow

**Next:** After Phase 1 passes, proceed to [Phase 2: P0 Critical Features](./SCHEDULING_E2E_PHASE2_P0_CRITICAL.md)

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
- SD (Test Studio): `djamusic@gmail.com` / `123456`

**URL:** `https://tester.compsync.net/dashboard/director-panel/schedule`

---

## 🎯 HAPPY PATH: Complete CD Scheduling Workflow

### HP-001: Full Scheduling Journey (Critical Path)

**Objective:** Test complete end-to-end scheduling workflow from draft to published

**Prerequisites:**
- 60+ unscheduled routines exist
- Studios have submitted routines with varied classifications

**Test Steps:**

#### 1. Login & Navigation
```javascript
// Navigate to tester environment
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/login"
});

// Login as CD
await mcp__playwright__browser_fill_form({
  fields: [
    {
      name: "Email input",
      type: "textbox",
      ref: "input[name='email']",
      value: "registration@glowdancecomp.com"
    },
    {
      name: "Password input",
      type: "textbox",
      ref: "input[name='password']",
      value: "1CompSyncLogin!"
    }
  ]
});

await mcp__playwright__browser_click({
  element: "Login button",
  ref: "button[type='submit']"
});

// Wait for dashboard
await mcp__playwright__browser_wait_for({ text: "Director Panel" });

// Take screenshot: Login successful
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-01-login-success.png"
});

// Navigate to scheduling
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/schedule"
});

// Wait for page load
await mcp__playwright__browser_wait_for({ text: "Test Competition Spring 2026" });
```

**Expected Result:**
- ✅ Login successful
- ✅ Scheduling page loads
- ✅ Competition header shows "Test Competition Spring 2026 (April 9-12, 2026)"

---

#### 2. Verify 3-Panel Layout
```javascript
// Take snapshot
await mcp__playwright__browser_snapshot();

// Take screenshot: Initial layout
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-02-initial-layout.png"
});

// Verify left panel exists
await mcp__playwright__browser_wait_for({ text: "Unscheduled Routines" });

// Verify center panel exists
await mcp__playwright__browser_wait_for({ text: "Schedule Grid" });

// Verify right panel exists
await mcp__playwright__browser_wait_for({ text: "Trophy Helper" });
```

**Expected Result:**
- ✅ LEFT panel (25%): Unscheduled routines pool
- ✅ CENTER panel (50%): Schedule grid with day tabs
- ✅ RIGHT panel (25%): Trophy helper
- ✅ Competition header shows name + dates from database
- ✅ Collapse buttons visible on each panel

---

#### 3. Apply Filters to Unscheduled Pool
```javascript
// Click Classification filter: Emerald
await mcp__playwright__browser_click({
  element: "Emerald classification filter button",
  ref: "button[data-filter='classification'][data-value='emerald']"
});

// Wait for filter to apply
await mcp__playwright__browser_wait_for({ time: 1 });

// Take screenshot: Emerald filter active
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-03-filter-emerald.png"
});

// Click Genre filter: Jazz
await mcp__playwright__browser_click({
  element: "Jazz genre filter button",
  ref: "button[data-filter='genre'][data-value='jazz']"
});

// Take screenshot: Multiple filters active
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-04-filter-emerald-jazz.png"
});

// Search for specific routine
await mcp__playwright__browser_type({
  element: "Search input",
  ref: "input[placeholder*='Search']",
  text: "Swan"
});

// Take screenshot: Search applied
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-05-search-swan.png"
});

// Clear filters
await mcp__playwright__browser_click({
  element: "Clear Filters button",
  ref: "button:has-text('Clear Filters')"
});

// Take screenshot: Filters cleared
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-06-filters-cleared.png"
});
```

**Expected Result:**
- ✅ Emerald filter: Shows only Emerald routines
- ✅ Jazz filter: Shows only Emerald + Jazz routines
- ✅ Search: Shows only routines matching "Swan"
- ✅ Clear Filters: Resets all filters, shows all unscheduled routines
- ✅ Active filters highlighted (purple gradient)

---

#### 4. Drag First Routine to Schedule
```javascript
// Get first routine card
const firstRoutineCard = "div[data-routine-card]:first-child";

// Get schedule drop zone
const scheduleDropZone = "div[data-drop-zone='schedule']";

// Drag routine to schedule
await mcp__playwright__browser_drag({
  startElement: "First routine card in unscheduled pool",
  startRef: firstRoutineCard,
  endElement: "Schedule grid drop zone",
  endRef: scheduleDropZone
});

// Wait for placement
await mcp__playwright__browser_wait_for({ time: 2 });

// Take screenshot: First routine scheduled
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-07-first-routine-scheduled.png"
});

// Verify routine appears in schedule
await mcp__playwright__browser_snapshot();
```

**Expected Result:**
- ✅ Routine moves from unscheduled pool to schedule grid
- ✅ Entry number assigned (e.g., #1)
- ✅ Start time assigned
- ✅ Routine removed from unscheduled pool
- ✅ No conflicts detected (first routine)

---

#### 5. Schedule Multiple Routines & Detect Conflicts
```javascript
// Schedule 10 more routines
for (let i = 0; i < 10; i++) {
  const routineCard = `div[data-routine-card]:nth-child(${i + 1})`;

  await mcp__playwright__browser_drag({
    startElement: `Routine card ${i + 1}`,
    startRef: routineCard,
    endElement: "Schedule grid",
    endRef: "div[data-drop-zone='schedule']"
  });

  // Wait for placement
  await mcp__playwright__browser_wait_for({ time: 1 });
}

// Take screenshot: 11 routines scheduled
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-08-multiple-routines-scheduled.png"
});

// Check for conflict warnings
await mcp__playwright__browser_snapshot();

// Take screenshot: Conflict detected (if any)
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-09-conflicts-detected.png"
});
```

**Expected Result:**
- ✅ All 11 routines scheduled successfully
- ✅ Entry numbers auto-assigned (1-11)
- ✅ Times calculated correctly
- ✅ If same dancer in 2 routines < 6 apart: Conflict warning appears
- ✅ Conflict shows dancer name + spacing count

---

#### 6. Verify Conflict Detection Detail
```javascript
// If conflict box exists, click it
const conflictBox = "div[data-conflict-warning]";

await mcp__playwright__browser_click({
  element: "Conflict warning box",
  ref: conflictBox
});

// Wait for conflict details
await mcp__playwright__browser_wait_for({ time: 1 });

// Take screenshot: Conflict details modal
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-10-conflict-details.png"
});

// Read conflict message
await mcp__playwright__browser_snapshot();
```

**Expected Result:**
- ✅ Conflict modal shows:
  - Dancer name (e.g., "Emma Smith")
  - Routine #1 details
  - Routine #2 details
  - Spacing count (e.g., "3 routines between, need 6 minimum")
- ✅ Severity indicator (Critical/Error/Warning)
- ✅ Override button available

---

#### 7. Check Trophy Helper Updates
```javascript
// Scroll to right panel
await mcp__playwright__browser_evaluate({
  function: "() => { document.querySelector('[data-panel=\"trophy-helper\"]').scrollIntoView(); }"
});

// Take screenshot: Trophy Helper panel
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-11-trophy-helper.png"
});

// Verify content
await mcp__playwright__browser_snapshot();
```

**Expected Result:**
- ✅ Trophy Helper shows last routine per category
- ✅ Categories displayed: Solo/Duet/Small Group + Age + Classification
- ✅ Suggested award time = last routine time + 30 minutes
- ✅ Last routines highlighted in schedule (gold border + 🏆)
- ✅ Updates in real-time as schedule changes

---

#### 8. Create & Place Award Block
```javascript
// Click "Create Award Block" button
await mcp__playwright__browser_click({
  element: "Create Award Block button",
  ref: "button:has-text('🏆 +Award Block')"
});

// Fill award block details
await mcp__playwright__browser_fill_form({
  fields: [
    {
      name: "Award title",
      type: "textbox",
      ref: "input[name='title']",
      value: "Solo Overall Awards - Ages 7-9"
    },
    {
      name: "Duration",
      type: "combobox",
      ref: "select[name='duration']",
      value: "30"
    }
  ]
});

// Create block
await mcp__playwright__browser_click({
  element: "Create button",
  ref: "button:has-text('Create')"
});

// Drag award block to schedule
await mcp__playwright__browser_drag({
  startElement: "Award block",
  startRef: "div[data-block-type='award']:first-child",
  endElement: "Schedule after routine 11",
  endRef: "div[data-drop-zone][data-order='11']"
});

// Take screenshot: Award block placed
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-12-award-block-placed.png"
});
```

**Expected Result:**
- ✅ Award block appears with purple background
- ✅ Shows title "Solo Overall Awards - Ages 7-9"
- ✅ Duration: 30 minutes
- ✅ Start time rounds to nearest 5 minutes
- ✅ Trophy helper recommendation shows on placement

---

#### 9. Create & Place Break Block
```javascript
// Click "Create Break Block" button
await mcp__playwright__browser_click({
  element: "Create Break Block button",
  ref: "button:has-text('☕ +Break Block')"
});

// Fill break block details
await mcp__playwright__browser_fill_form({
  fields: [
    {
      name: "Break title",
      type: "textbox",
      ref: "input[name='title']",
      value: "Lunch Break"
    },
    {
      name: "Duration",
      type: "combobox",
      ref: "select[name='duration']",
      value: "60"
    }
  ]
});

// Create block
await mcp__playwright__browser_click({
  element: "Create button",
  ref: "button:has-text('Create')"
});

// Drag break block to schedule
await mcp__playwright__browser_drag({
  startElement: "Break block",
  startRef: "div[data-block-type='break']:first-child",
  endElement: "Schedule middle position",
  endRef: "div[data-drop-zone][data-order='6']"
});

// Take screenshot: Break block placed
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-13-break-block-placed.png"
});
```

**Expected Result:**
- ✅ Break block appears with gray background
- ✅ Shows title "Lunch Break"
- ✅ Duration: 60 minutes
- ✅ Routines after break auto-renumber
- ✅ Times recalculate

---

#### 10. Switch Day Tabs
```javascript
// Click Day 2 tab (Friday)
await mcp__playwright__browser_click({
  element: "Friday day tab",
  ref: "button[data-day='2025-04-10']"
});

// Wait for day switch
await mcp__playwright__browser_wait_for({ time: 1 });

// Take screenshot: Day 2 schedule
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-14-day2-schedule.png"
});

// Verify Day 2 is empty
await mcp__playwright__browser_snapshot();

// Go back to Day 1
await mcp__playwright__browser_click({
  element: "Thursday day tab",
  ref: "button[data-day='2025-04-09']"
});
```

**Expected Result:**
- ✅ Day 2 tab highlighted (purple gradient)
- ✅ Day 2 schedule empty (no routines scheduled yet)
- ✅ Day 1 routines hidden
- ✅ Switch back to Day 1: Routines reappear
- ✅ Conflicts scoped to current day only

---

#### 11. Test View Mode Switching
```javascript
// Switch to Judge View
await mcp__playwright__browser_click({
  element: "Judge View button",
  ref: "button[data-view='judge']"
});

// Take screenshot: Judge view (codes only)
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-15-judge-view.png"
});

// Verify studio codes shown (not full names)
await mcp__playwright__browser_snapshot();

// Switch to CD View
await mcp__playwright__browser_click({
  element: "CD View button",
  ref: "button[data-view='cd']"
});

// Take screenshot: CD view (codes + full names)
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-16-cd-view.png"
});
```

**Expected Result:**
- ✅ Judge View: Shows "A", "B", "C" (codes only, no "Studio" prefix)
- ✅ CD View: Shows "Studio A (Starlight Dance Academy)"
- ✅ All routines visible in both views
- ✅ No notes visible in Judge view

---

#### 12. Add Studio Request (Switch to Studio Portal)
```javascript
// Logout CD
await mcp__playwright__browser_click({
  element: "Logout button",
  ref: "button:has-text('Logout')"
});

// Login as Studio Director
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/login"
});

await mcp__playwright__browser_fill_form({
  fields: [
    {
      name: "Email",
      type: "textbox",
      ref: "input[name='email']",
      value: "djamusic@gmail.com"
    },
    {
      name: "Password",
      type: "textbox",
      ref: "input[name='password']",
      value: "123456"
    }
  ]
});

await mcp__playwright__browser_click({
  element: "Login button",
  ref: "button[type='submit']"
});

// Navigate to studio schedule view
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/studio/schedule"
});

// Take screenshot: Studio schedule view
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-17-studio-schedule-view.png"
});

// Add note to first routine
await mcp__playwright__browser_click({
  element: "Add Note button on first routine",
  ref: "button[data-routine-note]:first-child"
});

// Fill note
await mcp__playwright__browser_type({
  element: "Note textarea",
  ref: "textarea[name='note']",
  text: "Please schedule after 2pm - dancer has school conflict"
});

// Submit note
await mcp__playwright__browser_click({
  element: "Submit button",
  ref: "button:has-text('Submit')"
});

// Take screenshot: Note submitted
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-18-studio-note-submitted.png"
});
```

**Expected Result:**
- ✅ Studio view shows ONLY their routines
- ✅ NO competitor routines visible
- ✅ Large gaps in routine numbers (expected)
- ✅ Can add note/request to routine
- ✅ Note saved successfully

---

#### 13. CD Reviews Studio Request
```javascript
// Logout SD, login as CD again
await mcp__playwright__browser_click({
  element: "Logout button",
  ref: "button:has-text('Logout')"
});

await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/login"
});

await mcp__playwright__browser_fill_form({
  fields: [
    {
      name: "Email",
      type: "textbox",
      ref: "input[name='email']",
      value: "registration@glowdancecomp.com"
    },
    {
      name: "Password",
      type: "textbox",
      ref: "input[name='password']",
      value: "1CompSyncLogin!"
    }
  ]
});

await mcp__playwright__browser_click({
  element: "Login button",
  ref: "button[type='submit']"
});

// Navigate to studio requests list
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/studio-requests"
});

// Take screenshot: Requests list
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-19-studio-requests-list.png"
});

// Mark request as completed
await mcp__playwright__browser_click({
  element: "Mark Completed button",
  ref: "button[data-action='complete']:first-child"
});

// Take screenshot: Request marked completed
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-20-request-completed.png"
});
```

**Expected Result:**
- ✅ CD sees all studio requests
- ✅ Request shows: Studio, Routine, Content, Status
- ✅ Can mark as Completed or Ignored
- ✅ Status updates successfully

---

#### 14. Finalize Schedule
```javascript
// Go back to schedule
await mcp__playwright__browser_navigate({
  url: "https://tester.compsync.net/dashboard/director-panel/schedule"
});

// Click Finalize Schedule button
await mcp__playwright__browser_click({
  element: "Finalize Schedule button",
  ref: "button:has-text('Finalize Schedule')"
});

// Confirm finalization
await mcp__playwright__browser_click({
  element: "Confirm button in modal",
  ref: "button:has-text('Confirm')"
});

// Wait for finalization
await mcp__playwright__browser_wait_for({ time: 2 });

// Take screenshot: Schedule finalized
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-21-schedule-finalized.png"
});

// Verify status badge
await mcp__playwright__browser_snapshot();
```

**Expected Result:**
- ✅ Status badge changes to "Finalized" (orange)
- ✅ Entry numbers LOCK (no more auto-renumber)
- ✅ Drag-drop still works but numbers don't change
- ✅ Can still adjust times
- ✅ Studios can now view schedule

---

#### 15. Publish Schedule
```javascript
// Click Publish Schedule button
await mcp__playwright__browser_click({
  element: "Publish Schedule button",
  ref: "button:has-text('Publish Schedule')"
});

// Confirm publication
await mcp__playwright__browser_click({
  element: "Confirm button in modal",
  ref: "button:has-text('Confirm')"
});

// Wait for publication
await mcp__playwright__browser_wait_for({ time: 2 });

// Take screenshot: Schedule published
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-22-schedule-published.png"
});

// Verify studio names revealed
await mcp__playwright__browser_snapshot();
```

**Expected Result:**
- ✅ Status badge changes to "Published" (green)
- ✅ Studio codes → Full studio names revealed
- ✅ "Studio A (Starlight)" becomes "Starlight Dance Academy"
- ✅ NO more changes allowed
- ✅ Public view becomes available

---

#### 16. Verify Public View
```javascript
// Switch to Public View
await mcp__playwright__browser_click({
  element: "Public View button",
  ref: "button[data-view='public']"
});

// Take screenshot: Public view
await mcp__playwright__browser_take_screenshot({
  filename: "hp-001-23-public-view.png"
});

// Verify full names visible
await mcp__playwright__browser_snapshot();
```

**Expected Result:**
- ✅ Full studio names visible (no codes)
- ✅ Full schedule visible
- ✅ No notes or requests visible
- ✅ No edit controls

---

### Happy Path Success Criteria

**Test HP-001 PASSES if:**
- ✅ All 16 steps complete without errors
- ✅ 23 screenshots captured
- ✅ 3-panel layout works correctly
- ✅ Filters apply and clear
- ✅ Drag-drop scheduling works
- ✅ Conflicts detected and displayed
- ✅ Trophy helper updates
- ✅ Award/break blocks functional
- ✅ Day tabs switch correctly
- ✅ View modes work (CD/Judge/Studio/Public)
- ✅ Studio can add requests
- ✅ CD can manage requests
- ✅ Finalize locks numbering
- ✅ Publish reveals names
- ✅ Public view accessible after publish

---

## Next Steps

**If Phase 1 PASSES:**
→ Proceed to [Phase 2: P0 Critical Features](./SCHEDULING_E2E_PHASE2_P0_CRITICAL.md)

**If Phase 1 FAILS:**
1. Document failure point (which step failed)
2. Capture error screenshot
3. Check browser console for errors
4. Create bug report
5. Fix blocking issue
6. Re-run Phase 1

---

**Document Status:** ✅ COMPLETE (Phase 1 of 4)
**Estimated Execution Time:** 1.5-2 hours
**Target Environment:** tester.compsync.net
