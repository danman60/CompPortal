# Scheduling System - Complete Test Suite
**Environment:** tester.compsync.net
**Branch:** tester
**Date:** 2025-11-15
**Status:** All features built - Ready for comprehensive testing

---

## Test Environment Setup

**Login Credentials:**
- **CD Account:** `registration@glowdancecomp.com` / `1CompSyncLogin!`
- **Studio Account:** `djamusic@gmail.com` / `123456`

**Test Data Requirements:**
- 60 routines from CSV import (existing)
- Multiple classifications (Emerald, Sapphire, Crystal, etc.)
- Multiple categories (Jazz, Contemporary, Ballet, etc.)
- Dancers with various ages across age groups
- At least 2 routines scheduled to create conflicts

---

## Feature Test Checklist

### 1. Page Load & Initial State ✅

**Test Steps:**
1. Navigate to `/dashboard/director-panel/schedule`
2. Verify page loads without errors
3. Check console for JavaScript errors

**Expected Results:**
- ✅ Page loads with glassmorphic purple gradient
- ✅ Left panel shows filters
- ✅ Middle panel shows 4 drop zones (Sat AM/PM, Sun AM/PM)
- ✅ Right panel shows Trophy Helper, Age Warnings, Conflicts, Stats
- ✅ Toolbar shows view mode buttons and status
- ✅ All 60 routines appear in unscheduled pool

---

### 2. Filters & Search ✅

**Test 2.1: Classification Filter**
1. Click classification dropdown
2. Select "Emerald"
3. Verify only Emerald routines shown

**Expected:** Filter works, routine count updates

**Test 2.2: Category Filter**
1. Click category dropdown
2. Select "Jazz"
3. Verify only Jazz routines shown

**Expected:** Filter works, can combine with classification

**Test 2.3: Search**
1. Type routine name in search box
2. Verify filtered results
3. Click clear (×) button

**Expected:** Search narrows results, clear button resets

---

### 3. Drag-and-Drop Scheduling ✅

**Test 3.1: Schedule to Saturday AM**
1. Drag routine from unscheduled pool
2. Drop into "Saturday AM" zone
3. Observe optimistic UI update
4. Wait for database confirmation

**Expected:**
- ✅ Routine moves immediately (optimistic)
- ✅ Database saves (check network tab)
- ✅ Routine stays in zone after page refresh

**Test 3.2: Move Between Zones**
1. Drag routine from Saturday AM
2. Drop into Sunday PM
3. Verify move persists

**Expected:** Routine updates zone, persists to database

**Test 3.3: Return to Unscheduled**
1. Drag routine from any zone
2. Drop into unscheduled pool
3. Verify routine becomes unscheduled

**Expected:** Routine returns to pool, zone cleared in DB

---

### 4. View Switching 🆕

**Test 4.1: CD View**
1. Click "👨‍💼 CD View" button
2. Verify studio display shows "A (Studio Name)"

**Expected:** Full info visible (codes + names)

**Test 4.2: Studio Director View**
1. Click "🎭 Studio Director View"
2. Verify only studio name shown (no code prefix)
3. Verify "Add Request" button appears on routine cards

**Expected:** Studio names only, request buttons visible

**Test 4.3: Judge View**
1. Click "👔 Judge View"
2. Verify only studio codes shown (e.g., "A", "B", "C")

**Expected:** Codes only, anonymous scheduling

**Test 4.4: Public View**
1. Click "🌍 Public View" (disabled until published)
2. Verify button is disabled with "(After Publish)" text

**Expected:** Disabled in draft/finalized status

---

### 5. Studio Request Submission 🆕

**Test 5.1: Open Request Form**
1. Switch to Studio Director view
2. Find routine card with "📝 Add Request" button
3. Click button

**Expected:** Modal opens with textarea and submit button

**Test 5.2: Submit Request**
1. Enter request text (e.g., "Please schedule after 2 PM")
2. Click "📝 Submit Request"
3. Wait for success alert

**Expected:**
- ✅ Alert: "Request submitted successfully!"
- ✅ Modal closes
- ✅ Request saved to database

**Test 5.3: Validation**
1. Click "Add Request" button
2. Leave textarea empty
3. Click "Submit Request"

**Expected:** Alert: "Please enter a request message"

---

### 6. CD Request Management 🆕

**Test 6.1: Open Requests Panel**
1. Switch to CD View
2. Click "📋 Studio Requests" button in toolbar
3. Verify panel expands

**Expected:** Panel shows all submitted requests with status badges

**Test 6.2: Mark Request Complete**
1. Find request with status "pending" (yellow badge)
2. Click "✓ Mark Complete" button
3. Verify status changes to "completed" (green badge)

**Expected:** Status updates, badge color changes

**Test 6.3: Ignore Request**
1. Find another pending request
2. Click "✕ Ignore" button
3. Verify status changes to "ignored" (gray badge)

**Expected:** Status updates to ignored

**Test 6.4: Close Panel**
1. Click × button in top-right of panel
2. Verify panel collapses

**Expected:** Panel hides

---

### 7. Conflict Override 🆕

**Test 7.1: Create Conflict**
1. Schedule 2 routines with same dancer very close together
2. Wait for conflict detection
3. Verify conflict appears in Conflicts panel

**Expected:** Red conflict card shows in right panel

**Test 7.2: Open Override Modal**
1. Find critical conflict (red border)
2. Click "⚙️ Override with Reason" button
3. Verify modal opens

**Expected:** Red warning modal with reason textarea

**Test 7.3: Submit Override**
1. Enter override reason (>10 characters)
2. Click "⚙️ Confirm Override"
3. Wait for success alert

**Expected:**
- ✅ Alert: "✅ Conflict override saved successfully!"
- ✅ Override saved to database
- ✅ Modal closes

**Test 7.4: Validation**
1. Open override modal
2. Enter short reason (<10 chars)
3. Click Confirm

**Expected:** Alert: "Reason must be at least 10 characters"

---

### 8. Age Warnings Detection 🆕

**Test 8.1: View Age Warnings Panel**
1. Scroll to Age Warnings panel in right sidebar
2. Verify it shows detected age issues

**Expected:** Panel shows dancers outside age group ranges

**Test 8.2: Age Range Detection**
1. Find routine with dancer age outside normal range
2. Verify warning card shows:
   - Dancer name + age
   - Expected age group
   - Routine title
   - Verification prompt

**Expected:** Age mismatches detected and displayed

**Test 8.3: No Warnings State**
1. If no age issues exist
2. Verify panel shows checkmark and "No age warnings detected"

**Expected:** Empty state message displayed

---

### 9. Hotel Attrition Warning 🆕

**Test 9.1: Trigger Warning**
1. Schedule ALL Emerald routines to Saturday only
2. Leave Sunday empty of Emerald routines
3. Verify warning banner appears above schedule

**Expected:**
- ✅ Red warning banner appears
- ✅ Message: "All X Emerald routines are scheduled on Saturday only"
- ✅ Suggestion to spread across both days

**Test 9.2: Clear Warning**
1. Move at least 1 Emerald routine to Sunday
2. Verify warning disappears

**Expected:** Warning auto-hides when condition resolved

**Test 9.3: Sunday-Only Warning**
1. Move all Emerald to Sunday only
2. Verify warning appears for Sunday

**Expected:** Warning detects either single-day concentration

---

### 10. Award & Break Block Placement ✅

**Test 10.1: Drag Award Block**
1. Find "🏆 Award Block" in left panel
2. Drag to Saturday AM zone
3. Drop into zone

**Expected:** Award block appears in zone with 30-min duration

**Test 10.2: Drag Break Block**
1. Find "☕ Break Block" in left panel
2. Drag to Sunday PM zone
3. Drop into zone

**Expected:** Break block appears in zone with 15-min duration

**Test 10.3: Multiple Blocks**
1. Drag award block to multiple zones
2. Verify each creates a new instance

**Expected:** Template blocks can be reused

---

### 11. Trophy Helper 🏆

**Test 11.1: View Trophy Helper**
1. Schedule routines across zones
2. Scroll to Trophy Helper panel
3. Verify it shows award categories

**Expected:** Panel lists overall categories with last routine info

**Test 11.2: Suggested Award Time**
1. Find award category entry
2. Verify "Suggested award: [TIME]" is shown
3. Check time is calculated from last routine

**Expected:** Time suggestion based on last routine + buffer

---

### 12. Statistics Panel 📊

**Test 12.1: Verify Counts**
1. Check "Unscheduled" count (yellow)
2. Check "Scheduled" count (green)
3. Check "Total" count (blue)
4. Verify progress bar percentage

**Expected:** Counts accurate, progress bar matches percentage

**Test 12.2: Schedule More Routines**
1. Drag 5 more routines to zones
2. Watch counts update in real-time

**Expected:** Stats update immediately (optimistic)

---

### 13. Finalize Schedule Workflow 🔒

**Test 13.1: Finalize Schedule**
1. Verify status badge shows "📝 Draft"
2. Click "🔒 Finalize Schedule" button
3. Confirm in dialog
4. Wait for mutation

**Expected:**
- ✅ Status badge changes to "🔒 Finalized"
- ✅ Info text: "Entry numbers locked • Studios can view"
- ✅ Alert: "Schedule finalized! Entry numbers are now locked."

**Test 13.2: Unlock Schedule**
1. While in finalized status
2. Click "🔓 Unlock" button
3. Confirm in dialog

**Expected:**
- ✅ Status returns to "📝 Draft"
- ✅ Finalize button reappears
- ✅ Alert: "Schedule unlocked! You can now make changes."

---

### 14. Publish Schedule Workflow ✅

**Test 14.1: Publish from Finalized**
1. Ensure status is "🔒 Finalized"
2. Click "✅ Publish Schedule" button
3. Confirm in dialog

**Expected:**
- ✅ Status badge changes to "✅ Published"
- ✅ Info text: "Studio names revealed • Schedule locked"
- ✅ Alert: "Schedule published! Studio names are now revealed."

**Test 14.2: Public View Enabled**
1. While in published status
2. Click "🌍 Public View" button (now enabled)
3. Verify full studio names shown

**Expected:** Public view accessible, names revealed

**Test 14.3: No Modifications Allowed**
1. Try to drag a routine
2. Verify drag is disabled or alert shown

**Expected:** Schedule locked, no changes allowed

---

### 15. Persistence & Refresh Testing 🔄

**Test 15.1: Hard Refresh**
1. Schedule 5 routines across different zones
2. Hard refresh page (Ctrl+Shift+R)
3. Verify all routines stay in their zones

**Expected:** All state persists from database

**Test 15.2: Browser Close/Reopen**
1. Close browser completely
2. Reopen and navigate to schedule page
3. Verify state is intact

**Expected:** Database is source of truth

---

### 16. Conflicts Panel ⚠️

**Test 16.1: Spacing Rule Detection**
1. Schedule 2 routines with same dancer <6 routines apart
2. Wait for conflict detection
3. Verify conflict appears

**Expected:** Conflict card shows:
- Dancer name
- "Less than 6 routines between performances"
- Both routine numbers and titles
- Override button (if critical)

**Test 16.2: No Conflicts State**
1. If no conflicts exist
2. Verify empty state message

**Expected:** "✅ No conflicts detected"

---

## Performance Benchmarks

**Page Load Time:** <3 seconds
**Filter Response:** <500ms
**Drag-Drop Update:** <1 second
**Database Save:** <2 seconds
**Conflict Detection:** Real-time

---

## Browser Compatibility

**Tested Browsers:**
- ✅ Chrome 120+
- ✅ Edge 120+
- ⚠️ Firefox (to be tested)
- ⚠️ Safari (to be tested)

---

## Known Limitations

1. **Migration Required:** `schedule_conflict_overrides` table needs migration on tester environment
2. **Age Tracking:** Uses simple range detection, not historical age_change_tracking table yet
3. **View Switching:** Studio Director view filters not implemented (shows all routines)
4. **Offline Support:** Not implemented
5. **Mobile Responsive:** Drag-drop may not work on touch devices

---

## Test Results Template

```markdown
## Test Execution Report
**Date:** [DATE]
**Tester:** [NAME]
**Environment:** tester.compsync.net
**Browser:** Chrome 120.x

### Results Summary
- ✅ Passed: X/47
- ❌ Failed: X/47
- ⚠️ Partial: X/47

### Failed Tests
1. [Test ID] - [Reason]
2. [Test ID] - [Reason]

### Screenshots
- [Feature] - [screenshot-name.png]

### Notes
[Any additional observations]
```

---

## Next Steps After Testing

1. ✅ Run migration: `prisma migrate dev --name add_schedule_conflict_overrides`
2. ✅ Test all features per checklist above
3. ✅ Document any bugs in GitHub issues
4. ✅ Capture screenshots for documentation
5. ✅ Create user guide/training materials
6. ✅ Plan Phase 3 features (if applicable)

---

**End of Test Suite Specification**
