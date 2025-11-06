# Phase 1 Comprehensive Test Suite
**Pre-Release Validation - Routine Creation Through Invoice Payment**

**Purpose:** Validate ALL Phase 1 business logic before production release
**Environment:** Production (empwr.compsync.net)
**Test Data:** Fresh reservation + CSV import data
**Tester:** Manual execution via Playwright MCP
**Success Criteria:** 100% of test cases must pass

---

## Test Execution Guidelines

**Critical Rules:**
1. ✅ Execute tests **in sequence** - do not skip ahead
2. ✅ **Verify each assertion** before proceeding to next test
3. ✅ **Screenshot evidence** for each critical validation
4. ✅ **Stop immediately** on first failure - do not continue
5. ✅ Use **only the UI** - no SQL workarounds
6. ✅ Test on **production URLs only** (empwr.compsync.net)

**If ANY test fails:**
- Document the failure with screenshots
- Note expected vs. actual behavior
- Create BLOCKER.md with details
- STOP testing - do not continue

---

## Pre-Test Setup

### Test Accounts
- **SD:** `danieljohnabrahamson@gmail.com` / `123456`
- **CD:** `empwrdance@gmail.com` / `1CompSyncLogin!`

### Test Reservation
- **Reservation ID:** `a5942efb-6f8b-42db-8415-79486e658597`
- **Studio:** Test Studio - Daniel
- **Competition:** EMPWR Dance - London
- **Status:** approved
- **Spaces:** 50
- **Entries:** 0 (fresh start)

### Test Data Files
- **CSV:** `D:\ClaudeCode\CompPortal\test_routines_15.csv` (15 routines)

---

## Phase 0: Reservation Cleanup (REQUIRED FIRST STEP)

**🔴 CRITICAL: Run this cleanup BEFORE starting Section A**

**Why:** Previous test attempts may leave stale data (capacity ledger entries, old routines, summaries, invoices) that cause duplicate constraint errors.

**Method:** Use Supabase MCP tool (`mcp__supabase__execute_sql`)

**Cleanup Steps:**

### Step 1: Delete stale capacity ledger entries
```sql
DELETE FROM capacity_ledger
WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597';
```

### Step 2: Delete any existing invoices
```sql
DELETE FROM invoices
WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597';
```

### Step 3: Delete summary entries
```sql
DELETE FROM summary_entries
WHERE summary_id IN (
  SELECT id FROM summaries
  WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597'
);
```

### Step 4: Delete summaries
```sql
DELETE FROM summaries
WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597';
```

### Step 5: Delete all competition entries
```sql
DELETE FROM competition_entries
WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597';
```

### Step 6: Reset reservation to approved status
```sql
UPDATE reservations
SET
  status = 'approved',
  is_closed = false,
  updated_at = NOW()
WHERE id = 'a5942efb-6f8b-42db-8415-79486e658597';
```

### Step 7: Verify clean state
```sql
SELECT
  r.id,
  r.status,
  r.spaces_confirmed,
  r.is_closed,
  COUNT(e.id) as entry_count,
  COUNT(s.id) as summary_count,
  COUNT(i.id) as invoice_count,
  COUNT(cl.id) as ledger_count
FROM reservations r
LEFT JOIN competition_entries e ON e.reservation_id = r.id AND e.deleted_at IS NULL
LEFT JOIN summaries s ON s.reservation_id = r.id
LEFT JOIN invoices i ON i.reservation_id = r.id
LEFT JOIN capacity_ledger cl ON cl.reservation_id = r.id
WHERE r.id = 'a5942efb-6f8b-42db-8415-79486e658597'
GROUP BY r.id, r.status, r.spaces_confirmed, r.is_closed;
```

**Expected Result (Step 7):**
```json
{
  "id": "a5942efb-6f8b-42db-8415-79486e658597",
  "status": "approved",
  "spaces_confirmed": 50,
  "is_closed": false,
  "entry_count": 0,
  "summary_count": 0,
  "invoice_count": 0,
  "ledger_count": 0
}
```

**✅ Only proceed to Section A when all counts are 0 and status is 'approved'**

**How to execute:** Use `mcp__supabase__execute_sql` tool with each SQL query above. Run Steps 1-6 sequentially, then verify with Step 7.

---

## Test Suite Structure

- **Section A:** Dancer Management (6 tests) - **CAN BE SKIPPED** if 100+ dancers already exist
- **Section B:** Manual Routine Creation (12 tests)
- **Section C:** CSV Import Workflow (15 tests)
- **Section D:** Routine Validation & Business Logic (10 tests)
- **Section E:** Exception Requests (5 tests)
- **Section F:** Summary Submission (8 tests)
- **Section G:** Invoice Creation & Delivery (10 tests)
- **Section H:** Payment Confirmation (5 tests)

**Total:** 71 test cases

---

## Section A: Dancer Management

**Login as SD:** `danieljohnabrahamson@gmail.com` / `123456`

### A1: Create Dancer - Valid Data
**Navigate to:** `/dashboard/dancers`

**Steps:**
1. Click "Add Dancer" button
2. Fill form:
   - First Name: Emma
   - Last Name: Johnson
   - Date of Birth: 2012-03-15
   - Gender: Female
3. Click "Save Dancer"

**Expected:**
- ✅ Success message appears
- ✅ Dancer appears in list
- ✅ Name formatted: "Emma Johnson"
- ✅ Age calculated correctly from DOB

**Evidence:** Screenshot of dancer in list

---

### A2: Create Dancer - Invalid Name (Too Short)
**Steps:**
1. Click "Add Dancer"
2. Enter First Name: "E" (1 character)
3. Enter Last Name: "J" (1 character)
4. Enter DOB: 2012-03-15
5. Click "Save"

**Expected:**
- ❌ Validation error: "First name must be at least 2 characters"
- ❌ Form does not submit

**Evidence:** Screenshot of validation error

---

### A3: Create Dancer - Duplicate Check
**Steps:**
1. Try to create exact same dancer again:
   - First Name: Emma
   - Last Name: Johnson
   - DOB: 2012-03-15

**Expected:**
- ❌ Error: "Dancer already exists with this name and birthdate"
- ❌ Cannot create duplicate

**Evidence:** Screenshot of duplicate error

---

### A4: Create Dancer - Future Birthdate
**Steps:**
1. Enter DOB: 2030-01-01 (future date)
2. Try to save

**Expected:**
- ❌ Validation error: "Birthdate cannot be in the future"

**Evidence:** Screenshot of validation

---

### A5: Batch Create Dancers for CSV Import
**Steps:**
1. Create 10 more dancers matching CSV file:
   - Sophia Martinez (2009-07-22)
   - Olivia Brown (2006-11-08)
   - Ava Davis (2011-05-19)
   - Isabella Wilson (2011-08-30)
   - Mia Anderson (2008-09-12)
   - Charlotte Thomas (2009-01-25)
   - Amelia Taylor (2005-12-03)
   - Harper Moore (2006-04-17)
   - Evelyn Jackson (2012-02-28)
   - Abigail White (2011-10-14)

**Expected:**
- ✅ All 11 dancers created (including Emma from A1)
- ✅ Total dancer count: 11
- ✅ All visible in dancer list

**Evidence:** Screenshot showing 11 dancers

---

### A6: Verify Dancer Persistence
**Steps:**
1. Refresh page (Ctrl+R)
2. Verify all 11 dancers still visible

**Expected:**
- ✅ All dancers persist across page refresh
- ✅ No data loss

---

## Section B: Manual Routine Creation

**Navigate to:** `/dashboard/entries`

### B1: Verify Reservation Selection
**Steps:**
1. Check reservation dropdown
2. Select "EMPWR Dance - London" reservation

**Expected:**
- ✅ Dropdown shows approved reservation
- ✅ Shows "50 slots available"
- ✅ No entries exist yet (empty state)

**Evidence:** Screenshot of reservation dropdown

---

### B2: Create Solo Routine - Valid
**Steps:**
1. Click "Create Routine"
2. Fill form:
   - Routine Name: "Starlight Dreams"
   - Category: Solo
   - Age Division: Junior
   - Select Dancer: Emma Johnson
   - Choreographer: (optional, leave blank)
   - Props: "None"
3. Click "Save Routine"

**Expected:**
- ✅ Success message
- ✅ Routine appears in list
- ✅ Classification auto-calculated: "Solo"
- ✅ Size category: "Solo" (read-only)
- ✅ Available slots: 49 (decremented from 50)

**Evidence:** Screenshot of created routine

---

### B3: Verify Auto-Calculated Fields
**Steps:**
1. Click on "Starlight Dreams" to view details

**Expected:**
- ✅ Classification: "Solo" (auto-calculated from 1 dancer)
- ✅ Size Category: "Solo" (displayed, not editable)
- ✅ Age Division: "Junior" (correct for DOB 2012-03-15)
- ✅ Extended time: Displays max time limit

**Evidence:** Screenshot of routine details

---

### B4: Create Duo Routine - Valid
**Steps:**
1. Create new routine:
   - Name: "Best Friends"
   - Category: Duo
   - Dancers: Ava Davis, Isabella Wilson
   - Age Division: Junior

**Expected:**
- ✅ Classification: "Duo" (2 dancers)
- ✅ Size category: "Duo"
- ✅ Available slots: 48

---

### B5: Create Trio Routine - Valid
**Steps:**
1. Create new routine:
   - Name: "Triple Threat"
   - Dancers: Evelyn Jackson, Abigail White, Emma Johnson
   - Age Division: Junior

**Expected:**
- ✅ Classification: "Trio" (3 dancers)
- ✅ Size category: "Trio"
- ✅ Available slots: 47

---

### B6: Title Upgrade - Solo Only Validation
**Steps:**
1. Try to enable "Title Upgrade" on "Triple Threat" (Trio)

**Expected:**
- ❌ Title upgrade checkbox disabled or hidden for non-Solo
- ❌ Validation error if attempted

**Evidence:** Screenshot showing validation

---

### B7: Title Upgrade - Solo Allowed
**Steps:**
1. Edit "Starlight Dreams" (Solo)
2. Enable "Title Upgrade" checkbox
3. Save

**Expected:**
- ✅ Title upgrade saves successfully for Solo
- ✅ No validation error

---

### B8: Routine Name Validation - Too Short
**Steps:**
1. Try to create routine with name: "AB" (2 chars)

**Expected:**
- ❌ Validation error: "Routine name must be at least 3 characters"

**Evidence:** Screenshot of validation

---

### B9: Routine Name Validation - Special Characters
**Steps:**
1. Try name: "Test@Routine!" (invalid chars)

**Expected:**
- ❌ Validation error: "Only letters, numbers, spaces, hyphens, apostrophes allowed"

---

### B10: Routine Name - Valid Special Chars
**Steps:**
1. Create routine: "Dancer's Dream-2024" (valid chars)

**Expected:**
- ✅ Name accepted (apostrophe, hyphen, numbers allowed)

---

### B11: Age Division Validation
**Steps:**
1. Try to create routine with dancer Emma (DOB 2012) in "Senior" division

**Expected:**
- ❌ Warning or error: "Dancer age does not match age division"

---

### B12: Verify Manual Routine Count
**Steps:**
1. Check entries page

**Expected:**
- ✅ Total routines created manually: 5
- ✅ Available slots: 45 (50 - 5)
- ✅ All routines show status "draft"

**Evidence:** Screenshot of entries list (5 routines)

---

## Section C: CSV Import Workflow

**Navigate to:** `/dashboard/entries` → Click "Import Routines"

### C1: CSV Upload - Valid File
**Steps:**
1. Click "Import Routines"
2. Upload file: `test_routines_15.csv`

**Expected:**
- ✅ File uploads successfully
- ✅ Shows preview table with 15 rows
- ✅ All columns mapped correctly

**Evidence:** Screenshot of CSV preview

---

### C2: CSV Preview - Column Mapping
**Steps:**
1. Verify column headers detected:

**Expected:**
- ✅ "Routine Name" → routine_name
- ✅ "Category" → category
- ✅ "Age Division" → age_division
- ✅ "Dancer 1 First" → dancer first name
- ✅ "Dancer 1 Last" → dancer last name
- ✅ "Dancer 1 DOB" → dancer birthdate

**Evidence:** Screenshot showing mapped columns

---

### C3: CSV Fuzzy Matching - Category Aliases
**Steps:**
1. Check if CSV has variations:
   - "Solo" vs "SOLO"
   - "Dance Category" (with space)
   - "Category" vs "Cat"

**Expected:**
- ✅ All variations recognized via fuzzy matching
- ✅ No unmapped columns for known aliases

---

### C4: CSV Fuzzy Matching - Dancer Fields
**Steps:**
1. Verify dancer field variations work:
   - "Dancer 1 First" vs "Performer 1 First Name"
   - "DOB" vs "Date of Birth" vs "Birthdate"

**Expected:**
- ✅ All aliases recognized
- ✅ 2.5x expanded fuzzy matching working

---

### C5: CSV Import - Duplicate Dancer Detection
**Steps:**
1. Verify Emma Johnson (already exists) is detected

**Expected:**
- ✅ Shows "Emma Johnson - Existing" (matched by name + DOB)
- ✅ Does not create duplicate dancer
- ✅ Links to existing dancer record

**Evidence:** Screenshot of duplicate detection

---

### C6: CSV Import - New Dancer Creation
**Steps:**
1. Verify dancers not in system are flagged as "New"
2. Check count of new vs. existing dancers

**Expected:**
- ✅ New dancers clearly labeled
- ✅ Import progress shows "Creating 4 new dancers"

---

### C7: CSV Import - Pre-populate Category
**Steps:**
1. Click "Create Routine" from CSV row 1
2. Verify category field

**Expected:**
- ✅ Category pre-populated from CSV (Solo)
- ✅ Field editable if needed

**Evidence:** Screenshot of pre-populated form

---

### C8: CSV Import - Pinned Dancers
**Steps:**
1. Select dancers for routine
2. Verify selected dancers appear at top of list

**Expected:**
- ✅ Selected dancers pinned to top
- ✅ Easier to manage multi-dancer routines

**Evidence:** Screenshot of pinned dancers

---

### C9: CSV Import - Progress Tracking
**Steps:**
1. Import first 3 routines from CSV
2. Check import progress indicator

**Expected:**
- ✅ Progress shows "3 of 15 imported"
- ✅ Progress bar updates visually
- ✅ Shows both at top and bottom of page

**Evidence:** Screenshot of progress

---

### C10: CSV Import - Classification Auto-Calc
**Steps:**
1. Import Duo routine (2 dancers)
2. Verify classification

**Expected:**
- ✅ Classification auto-calculated: "Duo"
- ✅ Matches dancer count from CSV

---

### C11: CSV Import - Props Field Aliases
**Steps:**
1. CSV has "Notes" or "Comments" or "Remarks"
2. Verify mapped to props field

**Expected:**
- ✅ All aliases (Notes/Comments/Remarks) map to props_details

---

### C12: CSV Import - Duration Support
**Steps:**
1. If CSV has "Duration (seconds)" column
2. Verify imported correctly

**Expected:**
- ✅ UDA Excel format supported
- ✅ Duration in seconds converted properly

---

### C13: CSV Import - Batch Create 10 Routines
**Steps:**
1. Complete import of remaining 10 routines from CSV
2. Verify final count

**Expected:**
- ✅ 10 new routines created from CSV
- ✅ Total entries: 15 (5 manual + 10 CSV)
- ✅ Available slots: 35 (50 - 15)

**Evidence:** Screenshot showing 15 total routines

---

### C14: CSV Import - All Routines in Draft Status
**Steps:**
1. Check status column for all 15 entries

**Expected:**
- ✅ All routines show status: "draft"
- ✅ No routines marked "submitted" yet

---

### C15: CSV Import - No Capacity Overflow
**Steps:**
1. Try to import more routines than available slots (35 remaining)

**Expected:**
- ❌ Error: "Insufficient capacity (35 available, X requested)"
- ❌ Cannot exceed reservation limit

---

## Section D: Routine Validation & Business Logic

### D1: Extended Time - Max Time Display
**Steps:**
1. View any routine
2. Check extended time section

**Expected:**
- ✅ Shows max time limit for category
- ✅ Label: "Extended Time (Max: X:XX)"

---

### D2: Extended Time - Exceeds Limit
**Steps:**
1. Try to set extended time > max limit

**Expected:**
- ❌ Validation error: "Cannot exceed max time limit"

---

### D3: Size Category - Read-Only Display
**Steps:**
1. View any routine
2. Check size category field

**Expected:**
- ✅ Size category displayed (Solo/Duo/Trio/Small Group/Large Group)
- ✅ Field is read-only (no dropdown)
- ✅ Cannot be manually edited

**Evidence:** Screenshot of read-only size category

---

### D4: Classification - Auto-Detected Accepted
**Steps:**
1. Create routine with 2 dancers
2. System auto-detects "Duo"
3. Save without requesting exception

**Expected:**
- ✅ Auto-detected classification accepted as valid
- ✅ No validation error

---

### D5: Classification - Mismatch Warning
**Steps:**
1. Create routine with 5 dancers (Small Group size)
2. Try to save as "Duo" category

**Expected:**
- ⚠️ Warning: "Classification mismatch - 5 dancers detected but category is Duo"
- ✅ Option to request exception

---

### D6: Choreographer Field - Optional
**Steps:**
1. Create routine without choreographer name

**Expected:**
- ✅ Field is optional
- ✅ Routine saves successfully

---

### D7: Choreographer Field - Display in Preview
**Steps:**
1. CSV import shows choreographer in preview table

**Expected:**
- ✅ Choreographer column visible
- ✅ Data imported correctly

---

### D8: Props Field - Display in Preview
**Steps:**
1. CSV import shows props/notes in preview

**Expected:**
- ✅ Props column visible
- ✅ "None", "Chair", etc. displayed

---

### D9: Entry Count Validation
**Steps:**
1. Verify total entry count matches capacity consumed

**Expected:**
- ✅ Entry count: 15
- ✅ Capacity consumed: 15
- ✅ Math correct: 50 - 15 = 35 remaining

---

### D10: Entry Deletion - Soft Delete
**Steps:**
1. Delete one routine
2. Check database (via summary count later)

**Expected:**
- ✅ Routine removed from UI
- ✅ Soft deleted (deleted_at timestamp, not hard delete)
- ✅ Capacity refunded (36 available after delete)

---

## Section E: Exception Requests

### E1: Request Classification Exception - Valid
**Steps:**
1. Create routine with 6 dancers
2. Auto-detected: "Small Group"
3. Click "Request Exception" to change to "Line"
4. Fill form:
   - Requested Classification: Line
   - Reason: "Formation is primarily line-based"
5. Submit

**Expected:**
- ✅ Exception request saved
- ✅ Entry saves with pending exception
- ✅ Shows "Exception Requested" badge

**Evidence:** Screenshot of exception badge

---

### E2: Exception Modal - Entry Exists Check
**Steps:**
1. Try to open exception modal before entry is created
2. (Auto-save should prevent this)

**Expected:**
- ✅ Entry auto-saved before modal opens
- ✅ No "entry does not exist" error

---

### E3: Exception Modal - Correct Auto-Calc Passed
**Steps:**
1. Open exception modal for 3-dancer routine
2. Verify "Current Classification" shown

**Expected:**
- ✅ Shows "Trio" (auto-calculated from 3 dancers)
- ✅ Passes correct auto-calculated value to modal

---

### E4: Exception Modal - Text Styling
**Steps:**
1. Open exception modal
2. Check text color

**Expected:**
- ✅ Text is readable (not white-on-white)
- ✅ Proper contrast

**Evidence:** Screenshot of modal styling

---

### E5: Exception Requests - CD Review (Out of Scope)
**Note:** CD review of exceptions is Phase 2 feature
**Expected:**
- ⏭️ Skipped - exception *approval* workflow not in Phase 1
- ✅ Exception *request* functionality working

---

## Section F: Summary Submission

**Continue as SD**

### F1: Submit Summary - Button Enabled
**Steps:**
1. With 15 routines created
2. Check for "Submit Routine Summary" button

**Expected:**
- ✅ Button is visible and enabled
- ✅ Not disabled

---

### F2: Submit Summary - Preview Data
**Steps:**
1. Click "Submit Routine Summary"
2. Review modal

**Expected:**
- ✅ Shows: "15 routines created"
- ✅ Shows: "35 spaces unused"
- ✅ Shows: Total amount calculated correctly
- ✅ Formula: 15 × $240 = $3,600 (if $240 per routine)

**Evidence:** Screenshot of summary modal

---

### F3: Submit Summary - Capacity Refund Calculation
**Steps:**
1. Verify unused capacity shown

**Expected:**
- ✅ Entries used: 15
- ✅ Entries unused: 35 (50 - 15)
- ✅ Math correct

---

### F4: Submit Summary - Confirmation
**Steps:**
1. Click "Confirm Submission"

**Expected:**
- ✅ Success message
- ✅ Redirects or updates page state
- ✅ "Create Routine" button now DISABLED
- ✅ Message: "Summary submitted (reservation closed)"

**Evidence:** Screenshot of submitted state

---

### F5: Submit Summary - Reservation Status Update
**Steps:**
1. Check reservation status in UI

**Expected:**
- ✅ Status changed: approved → summarized
- ✅ Reservation is now closed (is_closed = true)

---

### F6: Submit Summary - Entry Status Update
**Steps:**
1. View all 15 entries

**Expected:**
- ✅ All entries status changed: draft → submitted
- ✅ Cannot edit submitted entries

---

### F7: Submit Summary - Cannot Submit Twice
**Steps:**
1. Try to submit summary again

**Expected:**
- ❌ Error: "Summary already submitted"
- ❌ Cannot duplicate submission

---

### F8: Submit Summary - No Entries Validation
**Steps:**
1. (Test on different reservation with 0 entries)

**Expected:**
- ❌ "Submit Summary" button disabled
- ❌ Error: "Must have at least 1 entry to submit"

---

## Section G: Invoice Creation & Delivery

**Login as CD:** `empwrdance@gmail.com` / `1CompSyncLogin!`

### G1: View Routine Summaries - Table Display
**Navigate to:** `/dashboard/routine-summaries`

**Steps:**
1. Check summary table

**Expected:**
- ✅ Shows summary for "Test Studio - Daniel"
- ✅ Competition: "EMPWR Dance - London"
- ✅ Submitted date: Today
- ✅ Routines: 15
- ✅ Total: $3,600.00
- ✅ Status: "Awaiting Invoice"
- ✅ Action: "Create Invoice" button visible

**Evidence:** Screenshot of summaries table

---

### G2: View Routine Summary - Details Page
**Steps:**
1. Click "View Details" link

**Expected:**
- ✅ No 404 error
- ✅ Navigates to `/dashboard/reservation-pipeline?reservation=[ID]`
- ✅ Shows reservation details

---

### G3: Create Invoice - From Summaries Page
**Steps:**
1. Go back to routine summaries
2. Click "Create Invoice" button

**Expected:**
- ✅ Success message
- ✅ Redirects to reservation pipeline or invoice page
- ✅ Invoice created with DRAFT status

---

### G4: Create Invoice - Verify Invoice Data
**Navigate to:** `/dashboard/reservation-pipeline`

**Steps:**
1. Find reservation for "Test Studio - Daniel"
2. Check invoice details

**Expected:**
- ✅ Invoice exists
- ✅ Status: DRAFT
- ✅ Total: $3,600.00
- ✅ Line items: 15 routines
- ✅ Is locked: false (editable)

---

### G5: Send Invoice - From Pipeline
**Steps:**
1. In reservation pipeline, find "Test Studio - Daniel"
2. Action column shows "Send Invoice" button
3. Click "Send Invoice"

**Expected:**
- ✅ Success message
- ✅ Invoice status: DRAFT → SENT
- ✅ Invoice locked: true
- ✅ Reservation status: summarized → invoiced

**Evidence:** Screenshot of invoice sent

---

### G6: Send Invoice - Email Delivered
**Steps:**
1. Check email sent to SD (danieljohnabrahamson@gmail.com)

**Expected:**
- ✅ Email subject: "Invoice Ready for EMPWR Dance - London"
- ✅ Email body shows:
  - Studio name: "Test Studio - Daniel"
  - Invoice number: [8-char ID]
  - Routines: 15
  - Total amount: $3,600.00 (NOT $0.00)
- ✅ "View Invoice" button works
- ✅ Visual alignment correct (no misaligned elements)

**Evidence:** Screenshot of email

---

### G7: Invoice Email - Alignment Check
**Steps:**
1. Check email layout

**Expected:**
- ✅ Invoice number aligned properly
- ✅ Routines and Total Amount in two-column layout
- ✅ Total amount right-aligned
- ✅ Consistent margins (8px label, 16px value)

**Evidence:** Screenshot of email layout

---

### G8: Invoice Cannot Be Sent Twice
**Steps:**
1. Try to click "Send Invoice" again

**Expected:**
- ✅ Button changed to "Mark as Paid"
- ✅ "Send Invoice" no longer available

---

### G9: Invoice Line Items - Verify All Routines
**Steps:**
1. View invoice details
2. Check line items

**Expected:**
- ✅ All 15 routines listed as line items
- ✅ Each line item shows routine name
- ✅ Total matches sum of line items

---

### G10: Invoice - No Duplicate Creation
**Steps:**
1. Try to create another invoice for same reservation

**Expected:**
- ❌ Error: "Invoice already exists for this reservation"
- ❌ Cannot duplicate

---

## Section H: Payment Confirmation

**Continue as CD**

### H1: Mark Invoice as Paid
**Navigate to:** `/dashboard/reservation-pipeline`

**Steps:**
1. Find reservation with SENT invoice
2. Click "Mark as Paid" button

**Expected:**
- ✅ Success message
- ✅ Invoice status: SENT → PAID
- ✅ Reservation status: invoiced → closed
- ✅ Action column: "✓ Complete!"
- ✅ paid_at timestamp set

**Evidence:** Screenshot of completed reservation

---

### H2: Payment Confirmation - Email Sent to SD
**Steps:**
1. Check email to SD (danieljohnabrahamson@gmail.com)

**Expected:**
- ✅ Email subject: "Payment Confirmed for EMPWR Dance - London"
- ✅ Email body shows:
  - Studio name: "Test Studio - Daniel"
  - Invoice number: [8-char ID]
  - Amount: $3,600.00 (NOT $0.00)
  - Status: PAID
  - Date: [today's date]
- ✅ "View Dashboard" button works

**Evidence:** Screenshot of payment email

---

### H3: Payment Email - Amount Display Fix
**Steps:**
1. Verify amount in email

**Expected:**
- ✅ Shows $3,600.00 (actual invoice total)
- ❌ NOT $0.00 (hardcoded bug fixed)

**Evidence:** Screenshot showing correct amount

---

### H4: Payment Email - Alignment Check
**Steps:**
1. Check email layout

**Expected:**
- ✅ Invoice number, amount, status, date all properly aligned
- ✅ Consistent margins throughout
- ✅ No white-on-white text issues

---

### H5: Verify Final Reservation State
**Steps:**
1. Check reservation in pipeline

**Expected:**
- ✅ Status: closed
- ✅ Invoice: PAID
- ✅ No further actions available
- ✅ Workflow complete

**Evidence:** Screenshot of closed reservation

---

## Test Completion Summary

### Success Criteria
**To pass this test suite:**
- ✅ **71 of 71 tests must pass** (100% success rate)
- ✅ No critical bugs found
- ✅ All business logic validated
- ✅ Email templates correct
- ✅ Capacity calculations accurate
- ✅ State transitions working
- ✅ Data persistence verified

### Evidence Required
1. Screenshot folder with all evidence images
2. Test execution log (timestamp + result for each test)
3. Any failure documentation (if applicable)
4. Final database state verification

### Post-Test Verification Queries

Run these SQL queries to verify data integrity:

```sql
-- 1. Verify reservation state
SELECT id, status, spaces_confirmed, is_closed
FROM reservations
WHERE id = 'a5942efb-6f8b-42db-8415-79486e658597';
-- Expected: status='closed', is_closed=true

-- 2. Verify entry count and statuses
SELECT status, COUNT(*) as count
FROM competition_entries
WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597'
  AND deleted_at IS NULL
GROUP BY status;
-- Expected: status='submitted', count=15

-- 3. Verify summary created
SELECT id, entries_used, entries_unused, submitted_at
FROM summaries
WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597';
-- Expected: entries_used=15, entries_unused=35

-- 4. Verify invoice created
SELECT id, status, total, is_locked, paid_at
FROM invoices
WHERE reservation_id = 'a5942efb-6f8b-42db-8415-79486e658597';
-- Expected: status='PAID', total=3600.00, is_locked=true, paid_at NOT NULL

-- 5. Verify capacity not negative
SELECT id, name, available_reservation_tokens
FROM competitions
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Expected: available_reservation_tokens >= 0 (no negative capacity)
```

---

## Phase 1 Business Logic Coverage

**This test suite validates:**

✅ **Dancer Management**
- Creation, validation, duplicate prevention
- Birthdate validation, age calculation

✅ **Reservation Management**
- Capacity allocation, slot consumption
- State transitions (approved → summarized → invoiced → closed)

✅ **Routine Creation**
- Manual creation workflow
- CSV import with fuzzy matching
- Auto-calculated fields (classification, size category)
- Validation rules (name, title upgrade, age division)

✅ **Exception Requests**
- Classification exceptions
- Modal workflow, auto-save

✅ **Summary Submission**
- Entry counting, capacity refund
- Status transitions (draft → submitted)
- Reservation closure

✅ **Invoice Creation**
- Draft creation, line items
- Send workflow, locking
- Email delivery with correct amounts

✅ **Payment Processing**
- Mark as paid, confirmation email
- Final state (closed)

---

## Known Issues NOT Tested (Out of Scope)

⏭️ **Phase 2 Features:**
- Exception approval by CD
- Music upload
- Schedule/performance order
- Awards and scoring

⏭️ **Advanced Features:**
- Split invoices by family
- Stripe payment processing
- PDF invoice generation
- Refund processing

---

## Test Execution Checklist

Before starting:
- [ ] Production database backed up
- [ ] Test reservation created and verified (Section Pre-Test Setup)
- [ ] CSV file ready at specified path
- [ ] Both SD and CD accounts accessible
- [ ] Playwright MCP configured and working
- [ ] Screenshot folder created for evidence

During testing:
- [ ] Execute tests in sequence (A → H)
- [ ] Capture screenshot for each "Evidence:" requirement
- [ ] Stop immediately on first failure
- [ ] Document any unexpected behavior

After completion:
- [ ] Run post-test verification queries
- [ ] Review all 71 test results
- [ ] Compile evidence folder
- [ ] Create test execution report
- [ ] Decision: PASS (release ready) or FAIL (blockers found)

---

**Test Suite Version:** 1.0
**Created:** November 6, 2025
**Author:** Claude (Session 35)
**Purpose:** Pre-release validation for Phase 1 production launch
