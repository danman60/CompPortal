# Schedule Happy Path Testing Protocol

**Purpose:** Comprehensive end-to-end validation of schedule page functionality
**Frequency:** Run on every "continue" request during schedule development
**Environment:** tester.compsync.net (tester branch)
**Login:** CD credentials for tester tenant

---

## Pre-Test Setup

**Before starting tests:**
1. ✅ Build passes (`npm run build`)
2. ✅ Deployed to tester.compsync.net
3. ✅ Hard refresh browser (Ctrl+Shift+R)
4. ✅ Login as CD: `registration@glowdancecomp.com` / `1CompSyncLogin!`
5. ✅ Navigate to `/dashboard/director-panel/schedule`

---

## Test Sequence

### Test 1: Reset All Schedules
**Goal:** Clear all existing schedules to start fresh

**Steps:**
1. Click "Reset Competition" button
2. Verify confirmation modal appears
3. Confirm reset
4. Wait for success toast
5. Verify all days show "0 routines scheduled"

**Evidence:** Screenshot of empty schedule on multiple days

---

### Test 2: Drag ~150 Routines Across Days
**Goal:** Distribute routines across competition days with proper sequencing

**Days & Entry Numbers:**
- **Thursday:** Start at 100 (e.g., 100-149)
- **Friday:** Start at 150 (e.g., 150-199)
- **Saturday:** Start at 200 (e.g., 200-249)
- **Sunday:** Start at 250 (e.g., 250-299)

**Steps for each day:**
1. Select day tab (e.g., Thursday)
2. Drag first routine from UR (Unscheduled Routines) pool to SR (Schedule Routines) table
3. Verify entry number assigned (should be 100 for Thursday, 150 for Friday, etc.)
4. Drag 30-40 more routines to this day
5. Verify:
   - Entry numbers sequential (100, 101, 102...)
   - Times auto-calculate (start time + duration, no gaps)
   - No duplicate entry numbers
6. Click "Save Schedule" button
7. Verify success toast
8. Switch to different day, then back - verify routines persist

**Repeat for all 4 days**

**Evidence:**
- Screenshot of each day's schedule after saving
- Note entry number ranges for each day

---

### Test 3: Place Award Blocks
**Goal:** Insert award ceremonies between routines with auto-time calculation

**Steps:**
1. Navigate to Thursday schedule
2. Click "Add Schedule Block" button
3. Select "Award" type
4. Enter title: "Junior Division Awards"
5. Select duration: 30 minutes
6. Select placement: "After Routine" → Enter routine number (e.g., 120)
7. Click "Add Block"
8. Verify:
   - Award block appears in table after routine 120
   - Icon shows 🏆
   - Time shows correctly (routine 120 end time)
   - Entry number is 121 (inserted between 120 and what was 121)
   - Following routines renumbered (122, 123, 124...)
9. Save schedule
10. Hard refresh (Ctrl+Shift+R)
11. Verify award block persists

**Repeat for:**
- Friday: "Teen Division Awards" after routine 170
- Saturday: "Senior Division Awards" after routine 220

**Evidence:** Screenshot of award blocks in schedule table

---

### Test 4: Place Break Blocks
**Goal:** Insert scheduled breaks with auto-time calculation

**Steps:**
1. Navigate to Friday schedule
2. Click "Add Schedule Block" button
3. Select "Break" type
4. Enter title: "Lunch Break"
5. Select duration: 60 minutes
6. Select placement: "By Time" → Enter time: 12:00 PM
7. Click "Add Block"
8. Verify:
   - Break block appears at 12:00 PM position
   - Icon shows ☕
   - Routines after break have times adjusted (+60 min)
   - Entry numbers sequential
9. Save schedule

**Repeat for:**
- Saturday: "Costume Change Break" (15 min) by time at 2:30 PM
- Sunday: "Final Break" (30 min) after routine 275

**Evidence:** Screenshot of break blocks with time adjustments

---

### Test 5: Multi-Select Drag in SR
**Goal:** Move multiple scheduled routines together within same day

**Steps:**
1. Navigate to Saturday schedule
2. Scroll to middle of schedule (around routine 215-220)
3. Click checkbox for routine 215
4. Hold Shift, click checkbox for routine 219 (selects 215-219, 5 routines)
5. Verify all 5 checkboxes checked
6. Drag routine 215 to position after routine 230
7. Verify:
   - All 5 routines (215-219) move together
   - They appear after routine 230 in same order
   - Entry numbers recalculated for entire schedule
   - Times recalculated correctly
   - Checkboxes clear after drop
8. Save schedule
9. Hard refresh
10. Verify new order persists

**Evidence:**
- Screenshot before drag (215-219 selected)
- Screenshot after drag (moved after 230)

---

### Test 6: Cross-Day Validation
**Goal:** Ensure day isolation - routines on Thursday don't appear on Friday

**Steps:**
1. Navigate to Thursday (should show ~40 routines starting at 100)
2. Note first routine title/number
3. Switch to Friday (should show different ~40 routines starting at 150)
4. Verify Thursday routines DON'T appear on Friday
5. Switch to Saturday, Sunday - verify each day shows only its routines
6. Switch back to Thursday - verify same routines as step 1

**Evidence:** Screenshot of day tabs showing correct routine counts

---

### Test 7: Block Drag and Reorder
**Goal:** Move award/break blocks within schedule

**Steps:**
1. Navigate to day with award block (e.g., Thursday)
2. Drag award block from after routine 120 to after routine 110
3. Verify:
   - Block moves to new position
   - Entry numbers recalculated
   - Times recalculated
   - Block styling preserved (🏆 icon, colors)
4. Save schedule
5. Verify persistence after refresh

**Evidence:** Screenshot of block in new position

---

### Test 8: Schedule Save Error Handling
**Goal:** Verify save mutation doesn't throw Prisma errors

**Steps:**
1. Make changes to schedule (drag a few routines)
2. Open browser console (F12)
3. Click "Save Schedule"
4. Check console for errors
5. Verify:
   - Success toast appears
   - No red console errors
   - No "Invalid `prisma.competition_entries.update()` invocation" error
   - Draft state cleared after save

**Evidence:** Screenshot of console (no errors)

---

## Success Criteria

All tests pass if:
- ✅ Routines drag smoothly between UR → SR
- ✅ Entry numbers start at correct base for each day (100, 150, 200, 250)
- ✅ Times auto-calculate with no gaps
- ✅ Award blocks (🏆) appear at correct positions
- ✅ Break blocks (☕) appear at correct positions
- ✅ Multi-select drag moves all selected routines together
- ✅ Day tabs show only routines for that day (no cross-contamination)
- ✅ All changes persist after hard refresh
- ✅ No console errors during save
- ✅ Schedule blocks appear on correct day only

---

## Failure Protocol

**If any test fails:**
1. 🛑 **STOP** testing immediately
2. 📸 Capture screenshot of failure state
3. 📋 Check browser console for errors
4. 🐛 Create bug report with:
   - Test number and name
   - Expected behavior
   - Actual behavior
   - Screenshot
   - Console errors (if any)
5. 🔧 Fix the bug
6. 🔄 **Restart from Test 1** (full reset)

---

## Continuous Testing Notes

**When user says "continue":**
1. Check current build status
2. Run full test sequence (Tests 1-8)
3. Report results:
   - ✅ Passed tests (with evidence)
   - ❌ Failed tests (with bug details)
   - 📊 Completion percentage
4. If all pass → Ask for next feature/bug
5. If any fail → Fix bug → Retest from Test 1

**Estimated Time:** 15-20 minutes per full run

---

## Evidence Checklist

After completing all tests, verify evidence captured:
- [ ] Empty schedule after reset (Test 1)
- [ ] Each day's schedule with routines (Test 2)
- [ ] Award blocks in table (Test 3)
- [ ] Break blocks with time adjustments (Test 4)
- [ ] Multi-select before/after drag (Test 5)
- [ ] Day tabs with correct counts (Test 6)
- [ ] Block reorder (Test 7)
- [ ] Clean console after save (Test 8)

**Store evidence in:** `.playwright-mcp/.playwright-mcp/schedule-test-[date].png`

---

*Last Updated: 2024-11-24*
*Test Protocol Version: 1.0*
