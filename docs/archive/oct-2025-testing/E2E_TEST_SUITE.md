# CompPortal E2E Test Suite - Phase 1
**Version:** 1.0
**Date:** October 29, 2025
**Environment:** Production (empwr.compsync.net)
**Test Credentials:**
- **Competition Director:** empwrdance@gmail.com / 1CompSyncLogin!
- **Studio Director:** daniel@streamstage.live / 123456

---

## Test Suite Overview

**Scope:** Complete Phase 1 registration flow + CSV import
**Total Test Cases:** 45
**Estimated Runtime:** 60-90 minutes
**Verification Method:** UI + Database (Supabase MCP)

### Test Categories

| Category | Test Count | Priority | Runtime |
|----------|-----------|----------|---------|
| CSV Import | 10 | P0 | 20 min |
| Dancer Management | 5 | P1 | 10 min |
| Reservation Flow | 8 | P0 | 15 min |
| Entry Creation | 10 | P0 | 20 min |
| Summary & Invoice | 7 | P1 | 15 min |
| Edge Cases | 5 | P2 | 10 min |

---

## Test Data Setup

### Pre-Test Database State
```sql
-- Query to capture baseline
SELECT
  (SELECT COUNT(*) FROM dancers WHERE studio_id = '2ade9fc1-3580-4d75-97a8-70ed2c8ba517') as dancer_count,
  (SELECT COUNT(*) FROM reservations WHERE studio_id = '2ade9fc1-3580-4d75-97a8-70ed2c8ba517') as reservation_count,
  (SELECT COUNT(*) FROM competition_entries WHERE studio_id = '2ade9fc1-3580-4d75-97a8-70ed2c8ba517') as entry_count;
```

### Test Studio Details
- **Studio ID:** `2ade9fc1-3580-4d75-97a8-70ed2c8ba517`
- **Studio Name:** "Dancertons"
- **Studio Code:** `43E4A`
- **Owner:** daniel@streamstage.live
- **Tenant ID:** `00000000-0000-0000-0000-000000000001` (EMPWR)

---

## Category 1: CSV Import Testing (P0)

### Test 1.1: Perfect Match CSV
**File:** `test-data/import-tests/dancers/01-perfect-match.csv`
**Expected:** 5 dancers imported successfully
**Known Bugs:** Date offset by 1 day (Bug #1), 4/5 success rate (Bug #2)

**Steps:**
1. Navigate to `/dashboard/dancers/import`
2. Upload `01-perfect-match.csv`
3. Verify preview shows all 5 dancers
4. Click "Import Dancers"
5. Wait for completion

**Verification (Database):**
```sql
SELECT first_name, last_name, date_of_birth, email
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND first_name IN ('Emma', 'Michael', 'Sophia', 'James', 'Olivia')
ORDER BY first_name;
```

**Expected Results:**
- ✅ UI shows "5 dancers imported" (CURRENTLY FAILS: shows success but only 4 imported)
- ✅ Database shows 5 rows (CURRENTLY FAILS: only 4 rows)
- ✅ Dates match CSV exactly (CURRENTLY FAILS: off by 1 day)

**Known Issues to Document:**
- Sophia Williams missing (Bug #2)
- All dates off by 1 day (Bug #1)

---

### Test 1.2: Column Name Variations
**File:** `test-data/import-tests/dancers/02-column-variations.csv`
**Expected:** 5 dancers with alternate column names ("First Name", "DOB", etc.)

**Steps:** Same as 1.1

**Verification:**
```sql
SELECT first_name, last_name, date_of_birth
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND first_name IN ('Ava', 'Ethan', 'Isabella', 'Noah', 'Mia')
ORDER BY first_name;
```

**Expected Results:**
- ✅ 5 dancers imported (CURRENTLY FAILS: 4/5)
- ✅ Column name mapping works (PASSES)
- ✅ Dates accurate (CURRENTLY FAILS: off by 1 day)

---

### Test 1.3: Minimal Required Fields Only
**File:** `test-data/import-tests/dancers/03-minimal-required.csv`
**Content:** `first_name,last_name` only (5 rows)

**Steps:**
1. Upload `03-minimal-required.csv`
2. Verify preview shows dancers with no optional fields
3. Import

**Verification:**
```sql
SELECT first_name, last_name, date_of_birth, email, phone
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND first_name IN ('Alice', 'Bob', 'Charlie', 'Diana', 'Eve')
ORDER BY first_name;
```

**Expected Results:**
- ✅ 5 dancers imported
- ✅ date_of_birth IS NULL
- ✅ email IS NULL
- ✅ phone IS NULL

---

### Test 1.4: Mixed Date Formats
**File:** `test-data/import-tests/dancers/04-mixed-dates.csv`
**Content:** 10 dancers with various date formats:
- MM/DD/YYYY
- YYYY-MM-DD
- DD.MM.YYYY
- M/D/YYYY

**Expected Results:**
- ✅ All 10 dancers imported (CURRENTLY FAILS: likely 9/10)
- ✅ All dates parsed correctly (CURRENTLY FAILS: off by 1 day)

**Verification:**
```sql
SELECT first_name, last_name,
       date_of_birth,
       date_of_birth::text as date_text
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY first_name
LIMIT 10;
```

---

### Test 1.5: Special Characters & UTF-8
**File:** `test-data/import-tests/dancers/05-special-chars.csv`
**Content:**
- Names with accents: "José García", "Zoë Müller", "François Côté"
- Apostrophes: "O'Brien", "D'Angelo"
- Hyphens: "Mary-Kate", "Jean-Luc"

**Expected Results:**
- ✅ All 5 dancers imported
- ✅ Special characters preserved
- ✅ No encoding issues

**Verification:**
```sql
SELECT first_name, last_name
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND (
    first_name LIKE '%José%' OR
    first_name LIKE '%Zoë%' OR
    first_name LIKE '%François%' OR
    last_name LIKE '%O''Brien%' OR
    first_name LIKE '%Mary-Kate%'
  );
```

---

### Test 1.6: Duplicate Detection
**File:** `test-data/import-tests/dancers/06-duplicates.csv`
**Content:**
- Row 1: New dancer "Grace Lee"
- Row 2: Duplicate "Grace Lee" (same first_name, last_name)
- Row 3: New dancer "Henry Park"
- Row 4: Duplicate "Emma Johnson" (from Test 1.1)
- Row 5: New dancer "Ivy Chen"

**Expected Results:**
- ⚠️ UI warns about duplicates during preview
- ✅ User can choose to import anyway or skip duplicates
- ✅ If imported, database constraint may fail (depends on schema)
- ✅ Clear error message shown for failed rows

**Verification:**
```sql
SELECT first_name, last_name, COUNT(*) as count
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND first_name IN ('Grace', 'Henry', 'Ivy')
GROUP BY first_name, last_name
ORDER BY first_name;
```

---

### Test 1.7: Invalid Data Validation
**File:** `test-data/import-tests/dancers/07-invalid-data.csv`
**Content:**
- Row 1: Missing first_name (should fail)
- Row 2: Missing last_name (should fail)
- Row 3: Invalid date "13/32/2010" (should fail)
- Row 4: Future date of birth (should fail)
- Row 5: Invalid email "not-an-email" (should fail or warn)

**Expected Results:**
- ❌ Import BLOCKED with validation errors
- ✅ Clear error messages for each invalid row
- ✅ No partial import (all-or-nothing or stop on first error)

**Verification:**
```sql
-- Should return 0 rows (no import should have occurred)
SELECT COUNT(*) as should_be_zero
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND created_at > NOW() - INTERVAL '5 minutes';
```

---

### Test 1.8: Extra Columns (Ignore)
**File:** `test-data/import-tests/dancers/08-extra-columns.csv`
**Content:** Standard columns + extra columns:
- `favorite_color`, `shoe_size`, `notes`, `custom_field_1`

**Expected Results:**
- ✅ Import succeeds
- ✅ Extra columns ignored
- ✅ 5 dancers imported

---

### Test 1.9: Mixed Case Headers
**File:** `test-data/import-tests/dancers/09-mixed-case.csv`
**Headers:** `FIRST_NAME`, `Last_Name`, `date_OF_birth`, `EMAIL`

**Expected Results:**
- ✅ Case-insensitive header matching works
- ✅ 5 dancers imported

---

### Test 1.10: Missing Required Columns
**File:** `test-data/import-tests/dancers/10-missing-required.csv`
**Content:** CSV with only `first_name` column (missing `last_name`)

**Expected Results:**
- ❌ Import BLOCKED
- ✅ Error: "Required column 'last_name' not found"
- ✅ No import occurs

---

## Category 2: Manual Dancer Management (P1)

### Test 2.1: Add Single Dancer (Manual Entry)
**Steps:**
1. Navigate to `/dashboard/dancers`
2. Click "Add Dancer" button
3. Fill form:
   - First Name: "Test"
   - Last Name: "Dancer"
   - DOB: "01/15/2012"
   - Gender: "Female"
   - Email: "test.dancer@example.com"
4. Submit

**Verification:**
```sql
SELECT * FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND first_name = 'Test' AND last_name = 'Dancer';
```

**Expected:** 1 row, date_of_birth = '2012-01-15'

---

### Test 2.2: Duplicate Detection (Manual Entry)
**Steps:**
1. Try to add "Emma Johnson" with same DOB as Test 1.1
2. Expect error: "Dancer already exists"

**Verification:** UI shows error, no new row created

---

### Test 2.3: Edit Dancer
**Steps:**
1. Find "Test Dancer" from Test 2.1
2. Click edit, change email to "updated@example.com"
3. Save

**Verification:**
```sql
SELECT email FROM dancers
WHERE first_name = 'Test' AND last_name = 'Dancer'
  AND studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';
```

**Expected:** email = 'updated@example.com'

---

### Test 2.4: Delete Dancer (Soft Delete)
**Steps:**
1. Find "Test Dancer"
2. Click delete
3. Confirm

**Verification:**
```sql
SELECT status, deleted_at FROM dancers
WHERE first_name = 'Test' AND last_name = 'Dancer'
  AND studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';
```

**Expected:** status = 'cancelled' OR deleted_at IS NOT NULL

---

### Test 2.5: Search and Filter Dancers
**Steps:**
1. Search for "Emma"
2. Filter by gender: Female
3. Filter by age group: Petite

**Verification:** UI shows filtered results matching criteria

---

## Category 3: Reservation Flow (P0)

### Test 3.1: Submit Reservation Request
**Prerequisites:** At least 1 active event with capacity > 0

**Steps:**
1. Navigate to `/dashboard/reservations` or events page
2. Find an event with open registration
3. Click "Request Reservation"
4. Enter: 10 entries requested
5. Submit

**Verification (Database):**
```sql
SELECT id, entries_requested, status, submitted_at
FROM reservations
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND submitted_at > NOW() - INTERVAL '5 minutes'
ORDER BY submitted_at DESC
LIMIT 1;
```

**Expected:**
- status = 'pending'
- entries_requested = 10
- entries_approved IS NULL

**Verification (UI):**
- Reservation appears in "Pending" section
- Email notification sent to CD (check logs)

---

### Test 3.2: Request More Than Available Capacity
**Prerequisites:** Event with remaining_capacity = 5

**Steps:**
1. Try to request 10 entries
2. Expect validation error: "Only 5 entries available"

**Verification:** No new reservation created

---

### Test 3.3: Multiple Reservations for Same Event
**Steps:**
1. Submit reservation for Event A (10 entries)
2. Wait for approval (or simulate CD approval)
3. Submit another reservation for Event A (5 entries)

**Expected:**
- ✅ Both reservations created (spec allows multiple per studio/event)
- ✅ Each has unique ID and status

**Verification:**
```sql
SELECT id, entries_requested, status
FROM reservations
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND event_id = '{EVENT_ID}'
ORDER BY submitted_at DESC;
```

---

### Test 3.4: CD Approves Reservation (Full Amount)
**Requires:** CD access or API call simulation

**Steps:**
1. As CD, navigate to `/dashboard/admin/reservations`
2. Find pending reservation from Test 3.1
3. Click "Approve" with full amount (10 entries)
4. Submit

**Verification (Database):**
```sql
-- Check reservation status
SELECT status, entries_approved, reviewed_at, reviewed_by_user_id
FROM reservations
WHERE id = '{RESERVATION_ID}';

-- Check capacity deducted
SELECT remaining_capacity
FROM events
WHERE id = '{EVENT_ID}';
```

**Expected:**
- Reservation: status = 'approved', entries_approved = 10
- Event: remaining_capacity decreased by 10
- Email sent to studio

---

### Test 3.5: CD Adjusts Reservation (Partial Approval)
**Steps:**
1. Reservation requests 10 entries
2. CD approves only 7 entries
3. Submit

**Verification:**
```sql
SELECT status, entries_requested, entries_approved
FROM reservations
WHERE id = '{RESERVATION_ID}';
```

**Expected:**
- status = 'adjusted'
- entries_requested = 10
- entries_approved = 7
- Capacity deducted by 7 (not 10)

---

### Test 3.6: CD Rejects Reservation
**Steps:**
1. CD selects "Reject"
2. Enters reason: "Studio has outstanding invoices from last year"
3. Submit

**Verification:**
```sql
SELECT status, rejection_reason, reviewed_at
FROM reservations
WHERE id = '{RESERVATION_ID}';
```

**Expected:**
- status = 'rejected'
- rejection_reason populated
- Capacity NOT deducted
- Email sent to studio

---

### Test 3.7: Cannot Create Entries Before Approval
**Steps:**
1. With pending reservation, navigate to entries page
2. Try to click "Create Entry"

**Expected:**
- ❌ Button disabled or hidden
- ⚠️ Message: "Wait for reservation approval"

---

### Test 3.8: View Reservation Status (SD Dashboard)
**Steps:**
1. Navigate to `/dashboard/reservations`
2. View list of all reservations with statuses

**Expected:**
- ✅ Pending reservations in "Pending" section
- ✅ Approved/adjusted in "Approved" section
- ✅ Rejected in "Rejected" section with reason visible

---

## Category 4: Entry Creation (P0)

### Test 4.1: Create Solo Entry (3-Step Flow)
**Prerequisites:** Approved reservation with quota available

**Step 1: Basic Details**
1. Navigate to entries for approved reservation
2. Click "Create Entry"
3. Fill form:
   - Routine Name: "Swan Lake"
   - Choreographer: "Jane Doe"
   - Category: "Performance"
   - Level: "Competitive"
   - Style: "Ballet"
   - Props: "None"
   - Title Upgrade: Yes (checkbox)
4. Click "Next"

**Step 2: Add Dancers**
1. Select 1 dancer: "Emma Johnson" (from CSV import)
2. Click "Next"

**Step 3: Auto-Calculate**
1. Review calculated fields:
   - Age Division: Based on Emma's DOB and event date
   - Group Size: "solo"
2. Click "Create Entry"

**Verification (Database):**
```sql
-- Check entry
SELECT e.id, e.routine_name, e.group_size_category, e.title_upgrade,
       e.age_division_id, e.status
FROM entries e
WHERE e.routine_name = 'Swan Lake'
  AND e.reservation_id = '{RESERVATION_ID}';

-- Check dancers linked
SELECT ed.dancer_id, d.first_name, d.last_name
FROM entry_dancers ed
JOIN dancers d ON ed.dancer_id = d.id
WHERE ed.entry_id = '{ENTRY_ID}';
```

**Expected:**
- Entry: group_size_category = 'solo', title_upgrade = true, status = 'draft'
- Entry Dancers: 1 row with Emma Johnson
- Age division calculated based on youngest dancer's age at event date

---

### Test 4.2: Create Duo Entry
**Steps:** Same as 4.1, but select 2 dancers

**Expected:**
- group_size_category = 'duo'
- title_upgrade = false (not allowed for duo, checkbox should be disabled or hidden)
- 2 rows in entry_dancers table

---

### Test 4.3: Create Large Group Entry
**Steps:** Same as 4.1, but select 10 dancers

**Expected:**
- group_size_category = 'large'
- Age division based on YOUNGEST dancer's DOB

---

### Test 4.4: Entry Quota Validation
**Prerequisites:** Reservation approved for 5 entries

**Steps:**
1. Create 5 entries successfully
2. Try to create 6th entry
3. Expect error: "Entry limit reached: 5 of 5 used"

**Verification:**
```sql
SELECT COUNT(*) as entry_count
FROM entries
WHERE reservation_id = '{RESERVATION_ID}'
  AND deleted_at IS NULL;
```

**Expected:** entry_count = 5, 6th entry blocked

---

### Test 4.5: Title Upgrade Solo-Only Validation
**Steps:**
1. Create duo entry
2. Try to enable "Title Upgrade" checkbox

**Expected:**
- ❌ Checkbox disabled or hidden for duo/trio/small/large
- ✅ Only enabled for solo

---

### Test 4.6: Edit Entry (Draft Status)
**Steps:**
1. Find entry with status = 'draft'
2. Click edit
3. Change routine name to "Swan Lake V2"
4. Change dancer selection
5. Save

**Expected:**
- ✅ All fields editable
- ✅ Changes saved to database

**Verification:**
```sql
SELECT routine_name, updated_at
FROM entries
WHERE id = '{ENTRY_ID}';
```

---

### Test 4.7: Cannot Edit Entry (Submitted Status)
**Steps:**
1. Submit summary (Test 5.1)
2. Try to edit entry fields (category, level, style)

**Expected:**
- ❌ Category, level, style, props, title_upgrade LOCKED
- ✅ Routine name, choreographer, dancers still editable (Phase 1 spec lines 237-241)

---

### Test 4.8: Delete Entry (Draft)
**Steps:**
1. Create entry with status = 'draft'
2. Click delete
3. Confirm

**Expected:**
- Soft delete: deleted_at timestamp set
- Quota count decreases (can create another entry)

**Verification:**
```sql
SELECT deleted_at, status
FROM entries
WHERE id = '{ENTRY_ID}';
```

---

### Test 4.9: Cannot Delete Entry After Invoice
**Steps:**
1. Create entry, submit summary, create invoice
2. Try to delete entry

**Expected:**
- ⚠️ Warning: "Requires CD approval to delete invoiced entry"
- ❌ Self-serve delete blocked

---

### Test 4.10: Age Division Auto-Calculation
**Prerequisites:** Event start date = 2026-06-15

**Test Cases:**
| Dancer DOB | Age at Event | Expected Division |
|-----------|-------------|------------------|
| 2010-05-15 | 16 years | Teen (15-17) |
| 2015-03-22 | 11 years | Petite (9-11) |
| 2008-07-08 | 17 years | Teen (15-17) |
| 2018-12-25 | 7 years | Mini (5-8) |

**Steps:**
1. Create 4 solo entries with dancers above
2. Verify age division calculated correctly

**Verification:**
```sql
SELECT e.id, e.routine_name, d.first_name, d.date_of_birth,
       e.age_division_id,
       AGE('{EVENT_START_DATE}'::date, d.date_of_birth) as age_at_event
FROM entries e
JOIN entry_dancers ed ON e.id = ed.entry_id
JOIN dancers d ON ed.dancer_id = d.id
WHERE e.id IN ('{ENTRY_ID_1}', '{ENTRY_ID_2}', '{ENTRY_ID_3}', '{ENTRY_ID_4}');
```

---

## Category 5: Summary & Invoice (P1)

### Test 5.1: Submit Summary (All Entries Used)
**Prerequisites:** Approved reservation with 5 entries, 5 entries created

**Steps:**
1. Navigate to `/dashboard/reservations/{id}/summary`
2. Review entry list (should show all 5 entries)
3. Click "Submit Summary"
4. Confirm

**Verification (Database):**
```sql
-- Check summary created
SELECT id, entries_used, entries_unused, submitted_at
FROM summaries
WHERE reservation_id = '{RESERVATION_ID}';

-- Check reservation status updated
SELECT status FROM reservations WHERE id = '{RESERVATION_ID}';

-- Check entries status updated
SELECT id, status FROM entries WHERE reservation_id = '{RESERVATION_ID}';

-- Check capacity refunded (should be 0 refund since all used)
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
```

**Expected:**
- Summary: entries_used = 5, entries_unused = 0
- Reservation: status = 'summarized'
- Entries: all status = 'submitted'
- Capacity: NO refund (0 unused)
- Email sent to CD

---

### Test 5.2: Submit Summary (Partial Entries Used)
**Prerequisites:** Approved for 10 entries, only 7 entries created

**Steps:** Same as 5.1

**Verification:**
```sql
SELECT entries_used, entries_unused FROM summaries WHERE reservation_id = '{RESERVATION_ID}';
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}' -- Should increase by 3
```

**Expected:**
- entries_used = 7
- entries_unused = 3
- Capacity refunded immediately (+3 to remaining_capacity)

---

### Test 5.3: Cannot Submit Summary Twice
**Steps:**
1. Submit summary successfully
2. Try to submit again

**Expected:**
- ❌ Error: "Summary already submitted"
- ❌ Submit button disabled or hidden

---

### Test 5.4: Cannot Submit Summary with Zero Entries
**Steps:**
1. Approved reservation with 5 entries
2. Delete all 5 entries
3. Try to submit summary

**Expected:**
- ❌ Blocked with error: "Must create at least 1 entry before submitting summary"

---

### Test 5.5: CD Creates Invoice (No Discounts/Credits)
**Prerequisites:** Reservation with submitted summary (7 entries used, 1 title upgrade)

**Steps:**
1. As CD, navigate to `/dashboard/admin/invoices/create?reservation_id={ID}`
2. Review auto-calculated totals:
   - Base entries: 7 × $50 = $350
   - Title upgrades: 1 × $30 = $30
   - Subtotal: $380
   - Tax (13%): $49.40
   - Total: $429.40
3. Click "Create Invoice"

**Verification (Database):**
```sql
SELECT subtotal, discount_amount, credits, tax_amount, total, status
FROM invoices
WHERE reservation_id = '{RESERVATION_ID}';
```

**Expected:**
- subtotal = 380.00
- discount_amount = 0.00
- credits = '[]'::jsonb
- tax_amount = 49.40
- total = 429.40
- status = 'issued'

---

### Test 5.6: CD Creates Invoice with Discount and Credits
**Steps:**
1. Apply 10% discount
2. Add credit: $200.00 "Deposit from 2024"
3. Review calculation:
   - Subtotal: $380
   - Discount (10%): -$38
   - Credit: -$200
   - Taxable: $142
   - Tax (13%): $18.46
   - Total: $160.46
4. Create invoice

**Verification:**
```sql
SELECT discount_percent, discount_amount, credits, total
FROM invoices
WHERE reservation_id = '{RESERVATION_ID}';
```

**Expected:**
- discount_percent = 10
- discount_amount = 38.00
- credits contains $200 credit
- total = 160.46

---

### Test 5.7: CD Marks Invoice Paid
**Steps:**
1. As CD, find issued invoice
2. Click "Mark as Paid"
3. Enter:
   - Payment Method: "Check"
   - Reference: "Check #12345"
   - Payment Date: "2025-10-28"
4. Submit

**Verification (Database):**
```sql
-- Check invoice status
SELECT status, paid_at, payment_method FROM invoices WHERE id = '{INVOICE_ID}';

-- Check reservation status
SELECT status FROM reservations WHERE id = '{RESERVATION_ID}';

-- Check entries status (should still be 'submitted' until Phase 2)
SELECT DISTINCT status FROM entries WHERE reservation_id = '{RESERVATION_ID}';
```

**Expected:**
- Invoice: status = 'paid', paid_at set, payment_method = 'Check - Check #12345'
- Reservation: status = 'closed'
- Email sent to studio

---

## Category 6: Edge Cases & Validation (P2)

### Test 6.1: Capacity Race Condition
**Setup:** Event with remaining_capacity = 1

**Steps:**
1. Studio A requests 1 entry
2. Studio B requests 1 entry (simultaneously or within seconds)
3. CD approves both

**Expected:**
- ✅ First approval succeeds
- ❌ Second approval fails with error: "Insufficient capacity"
- ✅ Database transaction prevents negative capacity

**Verification:**
```sql
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
-- Should never go below 0
```

---

### Test 6.2: Negative Invoice Total (Validation)
**Steps:**
1. Create summary with 1 entry (subtotal = $50)
2. Try to create invoice with:
   - Discount: 15% = $7.50
   - Credits: $200.00

**Expected:**
- ❌ Validation error: "Credits ($200) and discount ($7.50) exceed subtotal ($50)"
- ❌ Cannot create invoice

---

### Test 6.3: Entry Deletion After Summary (CD Approval Required)
**Steps:**
1. Submit summary with 5 entries
2. SD requests to delete 1 entry
3. CD approves deletion

**Expected:**
- Entry soft-deleted (deleted_at timestamp)
- Capacity refunded (+1 to event)
- Invoice NOT automatically adjusted (manual CD action required)

---

### Test 6.4: Multi-Tenant Isolation
**Test both tenants:**
- EMPWR (00000000-0000-0000-0000-000000000001)
- Glow (4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5)

**Steps:**
1. As EMPWR studio, create reservation
2. Query database to verify tenant_id
3. Switch to Glow tenant
4. Verify EMPWR data NOT visible

**Verification:**
```sql
-- Check for cross-tenant leaks
SELECT COUNT(*) as leak_count
FROM reservations r1
JOIN events e ON r1.event_id = e.id
WHERE r1.tenant_id != e.tenant_id;
-- Should return 0

SELECT COUNT(*) as leak_count
FROM entries en
JOIN reservations r ON en.reservation_id = r.id
WHERE en.event_id IN (
  SELECT id FROM events WHERE tenant_id != r.tenant_id
);
-- Should return 0
```

---

### Test 6.5: Phase 2 Access Gating
**Prerequisites:** Event with planning_phase_start = future date

**Steps:**
1. Complete payment (invoice status = 'paid')
2. Try to access Phase 2 features (music upload, schedule builder)

**Expected:**
- ⚠️ Warning: "Phase 2 not available until {DATE}"
- ❌ Phase 2 features locked

---

## Test Execution Protocol

### Setup Phase (5 min)
1. Capture baseline database state
2. Clear any previous test data (optional)
3. Verify test CSV files exist in `test-data/import-tests/dancers/`
4. Authenticate as Studio Director (djamusic@gmail.com / 123456)
5. Navigate to empwr.compsync.net

### Execution Phase (60-90 min)
- Run tests in order (Category 1 → 6)
- For each test:
  1. Execute steps via Playwright MCP
  2. Capture screenshot at completion
  3. Query database via Supabase MCP
  4. Compare expected vs. actual results
  5. Mark PASS/FAIL with notes

### Reporting Phase (10 min)
- Generate comprehensive report (see format below)
- Document all failures with evidence
- Create prioritized bug list
- Calculate pass rate by category

---

## Test Report Format

```markdown
# E2E Test Suite Execution Report
**Date:** {DATE}
**Duration:** {MINUTES} minutes
**Tester:** Claude Code Automation

## Summary
- **Total Tests:** 45
- **Passed:** XX (XX%)
- **Failed:** XX (XX%)
- **Blocked:** XX (XX%)
- **Known Issues:** XX

## Results by Category

### Category 1: CSV Import (P0)
| Test | Status | Notes |
|------|--------|-------|
| 1.1 | ❌ FAIL | Bug #2: Only 4/5 imported, Bug #1: Dates off by 1 day |
| 1.2 | ❌ FAIL | Same issues as 1.1 |
| 1.3 | ✅ PASS | Minimal fields import worked |
| ... | ... | ... |

**Pass Rate:** 3/10 (30%)

### Category 2: Dancer Management (P1)
| Test | Status | Notes |
|------|--------|-------|
| 2.1 | ✅ PASS | Manual add successful |
| ... | ... | ... |

**Pass Rate:** 5/5 (100%)

[Continue for all categories...]

## Known Issues Encountered

### P0 Issues (Critical)
1. **Bug #2: CSV Import Race Condition** - 4/5 dancers imported, no error shown
   - Test Cases: 1.1, 1.2, 1.4 (likely)
   - Evidence: Database shows 4 rows, UI shows "success"
   - Impact: Data loss, user confusion

### P1 Issues (High)
1. **Bug #1: Date Offset** - All dates off by 1 day
   - Test Cases: 1.1, 1.2, 1.4
   - Evidence: CSV `2010-05-15` → DB `2010-05-14`
   - Impact: Age group miscategorization

[Continue...]

## New Issues Discovered
[Document any issues not in audit report]

## Database State Changes
**Dancers Added:** +XX rows
**Reservations Created:** +XX rows
**Entries Created:** +XX rows
**Invoices Generated:** +XX rows

## Recommendations
1. Fix Bug #2 (race condition) immediately - P0
2. Fix Bug #1 (date offset) before launch - P1
3. Complete remaining tests after fixes deployed
```

---

## Test Data Files Required

Create these CSV files in `test-data/import-tests/dancers/`:

### 01-perfect-match.csv
```csv
first_name,last_name,date_of_birth,gender,email,phone,parent_name,parent_email,parent_phone,skill_level
Emma,Johnson,05/15/2010,Female,emma.j@example.com,555-0101,Sarah Johnson,sarah.j@example.com,555-0100,Intermediate
Michael,Smith,03/22/2008,Male,michael.s@example.com,555-0201,John Smith,john.s@example.com,555-0200,Advanced
Sophia,Williams,11/08/2011,Female,sophia.w@example.com,555-0301,Emily Williams,emily.w@example.com,555-0300,Beginner
James,Brown,07/08/2011,Male,james.b@example.com,555-0401,Robert Brown,robert.b@example.com,555-0400,Intermediate
Olivia,Davis,12/25/2009,Female,olivia.d@example.com,555-0501,Lisa Davis,lisa.d@example.com,555-0500,Advanced
```

### 02-column-variations.csv
```csv
First Name,Last Name,DOB,Gender,Email,Phone Number,Parent Name,Parent Email,Parent Phone,Skill Level
Ava,Martinez,06/12/2010,Female,ava.m@example.com,555-0601,Maria Martinez,maria.m@example.com,555-0600,Intermediate
Ethan,Garcia,04/18/2009,Male,ethan.g@example.com,555-0701,Carlos Garcia,carlos.g@example.com,555-0700,Advanced
Isabella,Rodriguez,2011-09-22,Female,isabella.r@example.com,555-0801,Ana Rodriguez,ana.r@example.com,555-0800,Beginner
Noah,Wilson,05/30/2008,Male,noah.w@example.com,555-0901,David Wilson,david.w@example.com,555-0900,Intermediate
Mia,Anderson,10/14/2008,Female,mia.a@example.com,555-1001,Jennifer Anderson,jennifer.a@example.com,555-1000,Advanced
```

[Continue for tests 03-10...]

---

## Success Criteria

### Test Suite Quality
- ✅ All 45 test cases executable
- ✅ Database verification for all data changes
- ✅ Screenshots captured for all UI states
- ✅ Known bugs documented and tracked

### Pass Rate Targets
- **P0 Tests (CSV Import + Reservations + Entries):** 80% pass (known bugs expected)
- **P1 Tests (Dancer Mgmt + Summary/Invoice):** 90% pass
- **P2 Tests (Edge Cases):** 70% pass

### Report Quality
- ✅ Clear PASS/FAIL status for each test
- ✅ Evidence (screenshots + SQL results)
- ✅ Failure root causes identified
- ✅ Bug priority assigned
- ✅ Reproducible test steps

---

**END OF TEST SUITE SPECIFICATION**
