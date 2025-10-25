# Golden Path Tests - Phase 1 Business Logic

**Date:** October 25, 2025
**Based on:** `docs/specs/PHASE1_SPEC.md`
**Test Target:** Rebuild pages (`/dashboard/entries-rebuild`, `/dashboard/reservation-pipeline-rebuild`)

---

## Test Overview

These 15 golden path tests validate core Phase 1 business logic from the specification:

**Core Principles (Spec lines 17-25):**
1. Capacity = Number of Entries
2. Multiple Reservations Allowed
3. Summary Triggers Invoice
4. Immediate Capacity Refund
5. Payment Required for Phase 2
6. Entries Convert to Routines

---

## Test Suite

### Group 1: Capacity Management (Tests 1-3)

#### Test 1: Capacity Calculation Accuracy
**Spec Reference:** Lines 19, 50-68
**Business Rule:** remaining_capacity = initial_capacity - approved_entries + refunded_entries

**Steps:**
1. Navigate to Pipeline rebuild page as CD
2. Verify St. Catharines #1 shows: 100/600 used, 500 remaining
3. Calculate: 600 - 100 = 500 ✓
4. Verify progress bar ~17% filled
5. Verify other events show 0/600

**Expected:**
- ✅ Capacity math correct
- ✅ Visual representation accurate
- ✅ No capacity shown for events without reservations

---

#### Test 2: Multiple Reservations Per Studio/Event
**Spec Reference:** Line 200
**Business Rule:** Same studio can have multiple reservations per event

**Steps:**
1. Check Pipeline table for Dans test studio
2. Verify current: 1 reservation for St. Catharines #1
3. Navigate to SD dashboard → My Reservations
4. Verify UI allows creating new reservation for same event
5. Check event filter shows accurate count

**Expected:**
- ✅ UI supports multiple reservations
- ✅ Current state: 1 reservation
- ✅ No UI blocking multiple reservations

---

#### Test 3: Capacity Displayed Across All Events
**Spec Reference:** Lines 30-68
**Business Rule:** Every event shows capacity metrics

**Steps:**
1. Navigate to Pipeline rebuild page
2. Count event metric cards: should be 4
3. Verify each shows: capacity/remaining/studios/pending
4. Verify QA Automation: 0/600
5. Verify St. Catharines #2: 0/600
6. Verify St. Catharines #1: 100/600
7. Verify London: 0/600

**Expected:**
- ✅ All 4 events displayed
- ✅ All show capacity metrics
- ✅ Only St. Catharines #1 has usage

---

### Group 2: Reservation Status Flow (Tests 4-7)

#### Test 4: Approved Reservation Status
**Spec Reference:** Lines 187-198
**Business Rule:** pending → approved → summarized → invoiced → closed

**Steps:**
1. Navigate to Pipeline rebuild as CD
2. Check Dans test reservation status
3. Verify status badge shows "approved"
4. Verify no approval action buttons (already approved)
5. Check SD dashboard shows "1 Approved"

**Expected:**
- ✅ Status: approved
- ✅ No duplicate approval buttons
- ✅ SD sees approved count

---

#### Test 5: Draft Entry Status
**Spec Reference:** Lines 204-229
**Business Rule:** Entries default to "draft" until submitted

**Steps:**
1. Navigate to Entries rebuild as SD
2. Check entry #123 status badge
3. Check entry #234 status badge
4. Verify both show "DRAFT"
5. Verify no "confirmed" or other statuses yet

**Expected:**
- ✅ Both entries show DRAFT
- ✅ No premature status changes
- ✅ Consistent across card/table views

---

#### Test 6: Status Filter Functionality
**Spec Reference:** Lines 187-198 (status transitions)
**Business Rule:** Filter reservations by status

**Steps:**
1. Navigate to Pipeline rebuild as CD
2. Click "All (1)" - verify 1 reservation shown
3. Click "Pending Reservation (0)" - verify empty state
4. Click "Pending Routine Creation (0)" - verify empty state
5. Click "Pending Invoice (0)" - verify empty state
6. Click "All (1)" - verify table reappears

**Expected:**
- ✅ All tab shows 1 reservation
- ✅ Other tabs show empty state
- ✅ Toggle works correctly
- ✅ Counts accurate

---

#### Test 7: Event Filter Functionality
**Spec Reference:** Lines 30-68
**Business Rule:** Filter by event

**Steps:**
1. Navigate to Pipeline rebuild as CD
2. Check dropdown: "All Events (1 reservations)"
3. Select "St. Catharines #1 2026 (1 reservations)"
4. Verify same reservation shown
5. Select "QA Automation Event 2026 (0 reservations)"
6. Verify empty state
7. Select "All Events" again

**Expected:**
- ✅ Dropdown shows correct counts
- ✅ Filtering works correctly
- ✅ Empty states for 0 reservations

---

### Group 3: Entry Management (Tests 8-11)

#### Test 8: Entry Count vs Capacity
**Spec Reference:** Line 19
**Business Rule:** Capacity = Number of Entries (not dancers, not routines)

**Steps:**
1. Navigate to Entries rebuild as SD
2. Count entries displayed: should be 2
3. Check summary: "Created: ✅ 2"
4. Navigate to SD dashboard
5. Check "98 Routines Left" = 100 approved - 2 created
6. Navigate to Pipeline as CD
7. Verify "Routines: 2" column

**Expected:**
- ✅ 2 entries created
- ✅ 98 remaining slots
- ✅ Matches across all pages
- ✅ 100 total approved

---

#### Test 9: Entry Fee Calculation
**Spec Reference:** Lines 669-680
**Business Rule:** global_entry_fee from competition_settings

**Steps:**
1. Navigate to Entries rebuild as SD
2. Check entry #123 fee: $115.00
3. Check entry #234 fee: $115.00
4. Check estimated total: $230.00
5. Verify math: $115 × 2 = $230 ✓
6. Check Decimal type handling (no errors)

**Expected:**
- ✅ Individual fees: $115.00 each
- ✅ Total: $230.00
- ✅ Decimal type handled correctly
- ✅ No console errors

---

#### Test 10: Entry Details Display
**Spec Reference:** Lines 204-229
**Business Rule:** All entry fields displayed

**Steps:**
1. Navigate to Entries rebuild as SD
2. Check entry #123 displays:
   - Entry number: 123
   - Title: (visible)
   - Studio: Dans test
   - Category: Ballet
   - Size: (displayed)
   - Age: Senior+ (17+)
   - Dancers: ad asd
   - Music: 🎵 Music Pending
   - Fee: $115.00
   - Status: draft

**Expected:**
- ✅ All fields present
- ✅ No missing data
- ✅ Icons displayed correctly
- ✅ Formatting correct

---

#### Test 11: Reservation Selector
**Spec Reference:** Line 200
**Business Rule:** Multiple reservations allowed

**Steps:**
1. Navigate to Entries rebuild as SD
2. Check reservation dropdown
3. Verify shows: "EMPWR Dance - St. Catharines #1"
4. Verify dropdown is functional
5. Check summary shows correct event

**Expected:**
- ✅ Correct reservation selected
- ✅ Dropdown functional
- ✅ Event name matches across pages

---

### Group 4: UI Consistency (Tests 12-14)

#### Test 12: Card vs Table View Consistency
**Spec Reference:** N/A (UI requirement)
**Business Rule:** Both views show same data

**Steps:**
1. Navigate to Entries rebuild as SD
2. Note data in Card view:
   - 2 entries
   - Entry numbers: 123, 234
   - Fees: $115.00 each
   - Status: draft
3. Click "📊 Table" button
4. Verify same data in table rows
5. Verify row counts match
6. Toggle back to Cards

**Expected:**
- ✅ Same 2 entries in both views
- ✅ Same data displayed
- ✅ No data loss on toggle
- ✅ Toggle works smoothly

---

#### Test 13: Cross-Page Data Consistency
**Spec Reference:** Lines 187-229
**Business Rule:** Data consistent across all pages

**Steps:**
1. Note from Entries rebuild:
   - 2 entries created
   - Studio: Dans test
   - Event: St. Catharines #1
2. Navigate to SD dashboard:
   - Check "2 Drafts"
   - Check "98 Routines Left"
   - Check "1 Approved" reservation
3. Navigate to Pipeline rebuild as CD:
   - Check "Routines: 2"
   - Check "Requested: 100"
   - Check "100/600 capacity"

**Expected:**
- ✅ All pages show consistent data
- ✅ No discrepancies
- ✅ Counts match

---

#### Test 14: Navigation Flow
**Spec Reference:** N/A (UX requirement)
**Business Rule:** Seamless navigation

**Steps:**
1. Start at SD dashboard
2. Click "🎨 Preview New Page →"
3. Verify lands on `/dashboard/entries-rebuild`
4. Click "← Back to Dashboard"
5. Verify returns to dashboard
6. Sign out, login as CD
7. Click "🎯 Preview New Pipeline →"
8. Verify lands on `/dashboard/reservation-pipeline-rebuild`
9. Click "← Back to Dashboard"

**Expected:**
- ✅ All navigation links work
- ✅ Back buttons functional
- ✅ Preview buttons work correctly
- ✅ No broken links

---

### Group 5: Business Logic Integrity (Test 15)

#### Test 15: Full Workflow State Verification
**Spec Reference:** Lines 17-25 (all core principles)
**Business Rule:** Complete Phase 1 workflow integrity

**Steps:**
1. **Verify Capacity Principle:**
   - Check 100 approved = 100 capacity used ✓
2. **Verify Multiple Reservations:**
   - UI supports multiple reservations ✓
3. **Verify Summary Workflow:**
   - Submit Summary button present ✓
   - No invoice created yet ✓
4. **Verify Entry-to-Routine Conversion:**
   - Entries called "routines" in Pipeline ✓
5. **Verify Status Progression:**
   - Reservation: approved ✓
   - Entries: draft ✓
   - Next step: summary submission ✓

**Expected:**
- ✅ All core principles demonstrated
- ✅ Workflow state correct
- ✅ No violations of business rules
- ✅ Ready for next phase

---

## Test Execution Plan

### Phase 1: Visual/Navigation Tests (Tests 1, 3, 12, 14)
- Verify UI elements present
- Check navigation flow
- Validate visual consistency

### Phase 2: Data Accuracy Tests (Tests 2, 8, 9, 10, 13)
- Verify data calculations
- Check cross-page consistency
- Validate fee computations

### Phase 3: Status/Filter Tests (Tests 4, 5, 6, 7, 11)
- Verify status badges
- Test filter functionality
- Check dropdown behavior

### Phase 4: Integration Test (Test 15)
- Validate complete workflow
- Verify all principles together
- Final sanity check

---

## Success Criteria

**All 15 tests must pass with:**
- ✅ No functional bugs
- ✅ No data discrepancies
- ✅ No console errors
- ✅ Consistent behavior across pages
- ✅ Business logic compliance

**Ready for Phase 7 production cutover.**

---

## Test Environment

**Browser:** Playwright (Chromium)
**URL:** https://www.compsync.net
**Pages Under Test:**
- `/dashboard/entries-rebuild` (SD)
- `/dashboard/reservation-pipeline-rebuild` (CD)

**Test Accounts:**
- SD: danieljohnabrahamson@gmail.com / 123456
- CD: 1-click demo login
