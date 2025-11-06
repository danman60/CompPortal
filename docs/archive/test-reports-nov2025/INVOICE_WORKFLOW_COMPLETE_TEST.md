# Invoice Workflow - Complete End-to-End Test

**Test Type:** Full workflow from approved reservation → invoice paid
**Environment:** Production (empwr.compsync.net)
**Test Data:** Fresh routines created during test
**CSV Import File:** `test_routines_15.csv` (15 routines prepared)

---

## Pre-Test Setup Requirements

### Business Logic Context (Phase 1 Spec)

**Reservation States:**
```
pending → approved → summarized → invoiced → closed
```

**Test will start from:** `approved` reservation
**Test will end at:** `closed` (invoice paid)

**Capacity Rules:**
- Approved reservation has `spaces_confirmed` capacity allocated
- Creating routines consumes capacity (1 routine = 1 space)
- Summary submission refunds unused capacity
- Formula: `entries_used = count(entries)`, `entries_unused = spaces_confirmed - entries_used`

---

## Phase 0: Verify Starting Conditions (Setup)

**Preconditions Required:**

1. **Active Competition**
   - Competition exists for EMPWR tenant
   - Status: active (not cancelled)
   - Has capacity available
   - Settings configured (entry fees, categories, age divisions)

2. **Test Studio**
   - Studio: "Test Studio - Daniel"
   - Owner: SA account (danieljohnabrahamson@gmail.com)
   - Tenant: EMPWR (00000000-0000-0000-0000-000000000001)

3. **Approved Reservation** (Starting Point)
   - Status: `approved` ✅
   - Spaces confirmed: 20 (enough for test routines)
   - Competition: Active EMPWR competition
   - Studio: Test Studio - Daniel
   - No entries created yet (fresh start)

**Verification Steps:**

Using CD account via Playwright MCP:
1. Navigate to `/dashboard/reservation-pipeline`
2. Locate reservation with status "approved"
3. Verify `spaces_confirmed >= 20`
4. Verify `entry_count = 0` (no routines yet)
5. Note reservation ID for test

**Expected State:**
```
Reservation:
  status: approved
  spaces_confirmed: 20
  entry_count: 0
  available_slots: 20
```

---

## Phase 1: Studio Creates Routines (SD Role)

**Login:** `danieljohnabrahamson@gmail.com` / `123456` (SA acting as SD)
**URL:** https://empwr.compsync.net/dashboard/entries

### Business Logic:
- Approved reservation allows routine creation
- Each routine consumes 1 capacity slot
- Entries start in "draft" status
- Must register dancers before creating routines

### Steps:

**1.1 Register Dancers First**

Navigate to `/dashboard/dancers` and create 15+ dancers to match CSV:

Manual dancer creation (3-5 dancers):
1. Click "Add Dancer" button
2. Fill form:
   - First Name: Emma
   - Last Name: Johnson
   - Date of Birth: 2012-03-15
   - Gender: Female
3. Click "Save Dancer"
4. Repeat for 3-5 dancers

**1.2 Create Manual Routines (5 routines)**

Navigate to `/dashboard/entries`:
1. Select approved reservation from dropdown
2. Verify shows "20 slots available"
3. Click "Create Routine" button
4. Fill form:
   - Routine Name: "Starlight Dreams"
   - Category: Solo
   - Age Division: Junior
   - Select Dancer: Emma Johnson
5. Click "Save Routine"
6. Verify success message
7. Verify available slots decrements to 19
8. Repeat for 4 more routines

**1.3 Import Routines via CSV (10 routines)**

From entries page:
1. Click "Import CSV" button
2. Upload file: `test_routines_15.csv` (skip first 5 already created)
3. Preview shows 10 routines
4. Verify all dancers match (or create missing dancers)
5. Click "Import Routines"
6. Verify success message showing "10 routines imported"
7. Verify available slots = 5 (20 - 15 = 5 unused)

**1.4 Verify Entry State**

On entries page:
- Total created: 15 routines ✅
- Available slots: 5 (20 - 15) ✅
- All entries status: "draft" ✅
- Submit Summary button: ENABLED ✅

**Expected State:**
```
Reservation:
  status: approved
  spaces_confirmed: 20
  entry_count: 15
  entries_used: 15
  entries_unused: 5 (will be refunded on summary)
```

---

## Phase 2: Studio Submits Summary (SD Role)

**Continue as SD**

### Business Logic:
- Submit changes entry status: draft → submitted
- Changes reservation status: approved → summarized
- Refunds unused capacity: 5 slots back to competition
- Creates summary record

### Steps:

1. Click "Submit Routine Summary" button
2. Review modal showing:
   - Entries created: 15 ✅
   - Entries unused: 5 ✅
   - Total amount: $3,600 (15 × $240) ✅
3. Click "Confirm Submission"
4. Verify success message
5. Verify page shows "Summary submitted (reservation closed)"
6. Verify "Create Routine" button now DISABLED
7. Log out

**Expected State:**
```
Reservation:
  status: summarized ✅
  entry_count: 15

Summary record created:
  entries_used: 15
  entries_unused: 5
  submitted_at: [timestamp]

Competition capacity:
  refund_applied: +5 slots

Entries:
  all status: submitted ✅
```

---

## Phase 3: CD Reviews Summaries (CD Role)

**Login:** `empwrdance@gmail.com` / `1CompSyncLogin!` (Competition Director)
**URL:** https://empwr.compsync.net/dashboard/routine-summaries

### Business Logic:
- CD can view all submitted summaries (tenant-scoped)
- Can filter by competition/studio/status
- Can create invoices from summarized reservations

### Steps:

1. Navigate to "Routine Summaries" page
2. Verify table shows summary row:
   - Studio: "Test Studio - Daniel" ✅
   - Competition: [competition name] ✅
   - Submitted: [today's date] ✅
   - Routines: 15 ✅
   - Total: $3,600.00 ✅
   - Status: "Awaiting Invoice" ✅
   - Actions: "Create Invoice" button ✅
3. Verify "View Details" link works (no 404)

**Expected State:**
- Summary visible in UI ✅
- All data accurate ✅
- Ready for invoice creation ✅

---

## Phase 4: CD Creates Invoice (CD Role)

**Continue as CD**

### Business Logic:
- Creates invoice with DRAFT status
- Invoice locked = false (editable)
- Line items = all submitted entries
- Total = sum of entry fees

### Steps:

1. Click "Create Invoice" button
2. Verify success message
3. Verify redirected to invoice page OR pipeline updates
4. Navigate to `/dashboard/reservation-pipeline`
5. Find the reservation
6. Verify Action column shows "Send Invoice" button ✅
7. Click "Send Invoice" button
8. Verify success message
9. Verify reservation status updates to "invoiced"

**Expected State:**
```
Invoice created:
  status: SENT
  is_locked: true
  total: $3,600.00
  line_items: 15 entries

Reservation:
  status: invoiced ✅
```

---

## Phase 5: SD Views Invoice (SD Role)

**Login:** `danieljohnabrahamson@gmail.com` / `123456`
**URL:** https://empwr.compsync.net/dashboard/invoices

### Business Logic:
- SDs can view their invoices
- Sent invoices are locked (read-only)
- Shows all line items and total

### Steps:

1. Navigate to "Invoices" page
2. Verify invoice appears with:
   - Status: "SENT" ✅
   - Competition: [name] ✅
   - Total: $3,600.00 ✅
3. Click to view invoice details
4. Verify shows all 15 routines as line items
5. Verify total matches: 15 × $240 = $3,600
6. Verify invoice is locked (no edit buttons)
7. Log out

**Expected State:**
- Invoice visible to SD ✅
- All data accurate ✅
- Invoice locked ✅

---

## Phase 6: CD Marks Invoice as Paid (CD Role)

**Login:** `empwrdance@gmail.com` / `1CompSyncLogin!`
**URL:** https://empwr.compsync.net/dashboard/reservation-pipeline

### Business Logic:
- CD confirms external payment (e-transfer, check, etc.)
- Changes invoice status: SENT → PAID
- Changes reservation status: invoiced → closed
- Sets paid_at timestamp

### Steps:

1. Navigate to "Reservation Pipeline"
2. Find reservation with SENT invoice
3. Verify Action column shows "Mark as Paid" button ✅
4. Click "Mark as Paid" button
5. Verify success message
6. Verify Action column updates to "✓ Complete!"
7. Verify reservation status = "closed"

**Expected State:**
```
Invoice:
  status: PAID
  paid_at: [timestamp]

Reservation:
  status: closed ✅

Pipeline Action:
  Shows: "✓ Complete!" ✅
```

---

## Test Success Criteria

**All phases must complete using ONLY the UI (no SQL):**

- ✅ Phase 0: Approved reservation verified
- ✅ Phase 1: 15 routines created (5 manual + 10 CSV import)
- ✅ Phase 2: Summary submitted successfully
- ✅ Phase 3: Summary visible in CD dashboard
- ✅ Phase 4: Invoice created and sent
- ✅ Phase 5: Invoice visible to SD
- ✅ Phase 6: Invoice marked as paid

**Data Integrity Checks:**

- Capacity refunded correctly (5 unused slots)
- All 15 entries show in invoice line items
- Total amount = 15 × $240 = $3,600
- Reservation progressed: approved → summarized → invoiced → closed
- No SQL workarounds needed at any phase

---

## Test Data

**CSV File:** `test_routines_15.csv`
**Location:** `D:\ClaudeCode\CompPortal\test_routines_15.csv`

**Test Accounts:**
- SA/SD: `danieljohnabrahamson@gmail.com` / `123456`
- CD: `empwrdance@gmail.com` / `1CompSyncLogin!`

**Expected Totals:**
- Routines: 15
- Spaces confirmed: 20
- Spaces used: 15
- Spaces refunded: 5
- Total amount: $3,600 (at $240/routine)

---

## Failure Conditions

**Test FAILS if any of these occur:**

- ❌ Required to use SQL to create/modify data
- ❌ UI buttons missing at any workflow stage
- ❌ 404 errors when navigating
- ❌ Data doesn't appear in UI despite existing in database
- ❌ Capacity calculations wrong
- ❌ Invoice total doesn't match entries
- ❌ Any phase cannot complete via UI alone

**If test fails:** Document the blocker and STOP. That's the point of testing.

---

## Post-Test Cleanup

**Optional:** If testing on production, leave data in place for reference.
**If cleanup needed:** Use SA Testing Tools "Clean Slate" (DEV/STAGING ONLY).
