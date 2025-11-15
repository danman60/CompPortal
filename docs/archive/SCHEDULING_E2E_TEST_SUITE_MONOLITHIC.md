# Scheduling Suite E2E Test Plan - Playwright MCP

**Date:** November 14, 2025
**Version:** 1.0
**Spec Reference:** SCHEDULING_SPEC_V4_UNIFIED.md
**Environment:** tester.compsync.net
**Deadline:** December 26, 2025

---

## Document Purpose

Comprehensive end-to-end test suite for the scheduling system using Playwright MCP. This test plan covers all P0 and P1 requirements with a complete happy path workflow and edge case validation.

**Test Coverage:**
- ✅ P0 Critical Requirements (5 features)
- ✅ P1 High-Priority Requirements (6 features)
- ✅ Happy Path Workflow (Full CD journey)
- ✅ Multi-Tenant Isolation
- ✅ Edge Cases & Validation

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
- ✅ All 23 steps complete without errors
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

## 📋 TEST EXECUTION SUMMARY

**Total Tests:** 25+
- Happy Path: 1 (16 steps)
- P0 Critical: 6 tests
- P1 High-Priority: 6 tests
- Edge Cases: 6 tests
- Multi-Tenant: 2 tests

**Estimated Execution Time:** 4-6 hours (full suite)

**Success Criteria:**
- ✅ All P0 tests pass
- ✅ Happy path completes end-to-end
- ✅ No cross-tenant leaks
- ✅ No console errors
- ✅ All screenshots captured

---

## 🚀 NEXT STEPS

1. Execute happy path on tester.compsync.net
2. Document failures in bug report
3. Fix blocking issues
4. Re-run failed tests
5. Update spec compliance percentage
6. Create final test report

---

**Document Status:** ✅ COMPLETE
**Ready for Execution:** YES
**Target Environment:** tester.compsync.net
