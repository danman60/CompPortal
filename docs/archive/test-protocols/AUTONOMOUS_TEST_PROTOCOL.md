# Autonomous Test Protocol - Production Launch Readiness

**Date:** November 6, 2025
**Launch Target:** Tomorrow (November 7, 2025)
**User Away:** 3 hours
**Protocol Status:** ACTIVE - Execute systematically with "continue" script

---

## Critical Success Criteria

**BULLETPROOF LAUNCH requires:**
1. ✅ **Functional:** All workflows complete without errors
2. ✅ **Visual:** All UI elements render correctly, no white-on-white, proper badges
3. ✅ **Data Persistence:** All database writes verified via SQL queries
4. ✅ **Multi-Tenant:** Works on BOTH EMPWR and Glow tenants
5. ✅ **Edge Cases:** Handles boundary conditions gracefully
6. ✅ **Spec Compliance:** Matches Phase 1 spec (lines 589-651 for summary, 656-720 for invoices)

---

## CRITICAL DATA SAFETY RULES (NON-NEGOTIABLE)

### 🚨 RULE 0: Data Protection (HIGHEST PRIORITY)

**ONLY djamusic@gmail.com test data can be modified or deleted**

**NEVER touch:**
- ❌ empwrdance@gmail.com (Emily's CD account) - READ ONLY
- ❌ stefanoalyessia@gmail.com (Alyessia's CD account) - READ ONLY
- ❌ Any other SD account besides djamusic@gmail.com
- ❌ ANY production studio data that isn't djamusic test account
- ❌ ANY real competition data

**Testing behavior:**
- ✅ Act like a real user (click buttons, fill forms naturally)
- ✅ Only use admin/CD accounts to SET UP test environment (approve reservations, create invoices)
- ✅ Switch to SD account (djamusic@gmail.com) for ALL user workflow testing
- ✅ Create test entries with names like "Test Solo - [timestamp]" for easy identification

**Before ANY delete operation:**
```sql
-- VERIFY it's djamusic test data
SELECT owner_id FROM studios WHERE id = '[studio-id]';
-- MUST match: SELECT id FROM auth.users WHERE email = 'djamusic@gmail.com';

-- VERIFY entry belongs to djamusic
SELECT s.owner_id, u.email
FROM competition_entries ce
JOIN reservations r ON r.id = ce.reservation_id
JOIN studios s ON s.id = r.studio_id
JOIN auth.users u ON u.id = s.owner_id
WHERE ce.id = '[entry-id]';
-- MUST show email = 'djamusic@gmail.com'
```

**If in doubt → DON'T DELETE. Create blocker instead.**

---

## MANDATORY Execution Rules

### Rule 1: Evidence Required for EVERY Test
**Before marking ANY test complete:**
- ✅ Screenshot captured (`evidence/screenshots/[test-name]-[tenant]-[timestamp].png`)
- ✅ Browser console clean (no errors via `playwright:browser_console_messages`)
- ✅ Database verified (SQL query via Supabase MCP shows expected data)
- ✅ Both tenants tested (EMPWR + Glow)

**If cannot provide all 4 → Mark as ❌ FAILED, document blocker**

### Rule 2: Use TodoWrite Tool Throughout
**Create todos at start:**
```
1. Auth & Navigation Tests (5 tests)
2. Manual Entry Creation (8 tests)
3. CSV Import Flow (7 tests)
4. Summary Submission (6 tests)
5. Invoice Generation (5 tests)
6. Split Invoice by Dancer (4 tests)
7. Edge Cases & Validation (10 tests)
```

**Update status in real-time:**
- Mark `in_progress` when starting test
- Mark `completed` ONLY after all 4 evidence items captured
- If blocked, create `BLOCKER_[test-name].md` immediately

### Rule 3: Systematic Failure Documentation
**When test fails:**
1. Create `BLOCKER_[test-name]_[timestamp].md` with:
   - What was tested
   - Expected behavior (reference spec line numbers)
   - Actual behavior (screenshot + console errors)
   - Database state (SQL query results)
   - Next steps to fix
2. Continue to next test (don't get stuck)
3. Summarize all blockers at end

### Rule 4: Spec Compliance Verification
**For EVERY business logic test:**
- Reference Phase 1 spec line numbers in evidence
- Verify calculations match spec exactly
- Check state transitions allowed (spec lines 187-198)
- Validate capacity refunds (spec lines 632-635)
- Confirm invoice formulas (spec lines 669-720)

### Rule 5: No False Completions
**RED FLAGS - Do NOT mark complete:**
- ❌ "Build passed" without production test
- ❌ "Should work" without evidence
- ❌ Tested only one tenant
- ❌ Missing database verification
- ❌ Console shows errors/warnings

---

## Test Execution Workflow

### Phase 1: Setup (5 min)
1. Create TodoWrite list with all tests
2. Navigate to empwr.compsync.net
3. Login as djamusic@gmail.com / 123456 (SD role)
4. Verify dashboard loads
5. Check existing reservation status

### Phase 2: Execute Tests Systematically
**For EACH test:**
1. Mark todo as `in_progress`
2. Execute test steps
3. Capture screenshot
4. Check console
5. Verify database
6. Test on Glow tenant
7. Mark todo as `completed` with evidence reference
8. If fail → Create blocker, move to next test

### Phase 3: Final Report (10 min)
1. Update `PRODUCTION_LAUNCH_TEST_RESULTS.md`:
   - Total tests: X/45
   - Passed: X
   - Failed: X (with blocker references)
   - Evidence: List all screenshots
2. Commit all evidence to git
3. Create summary for user return

---

## Test Suite: Production Launch Readiness

### Test Credentials

**Studio Director (SD) - Primary Test Account:**
- Email: `djamusic@gmail.com`
- Password: `123456`
- Role: Studio Director
- Use for: All SD workflows

**Competition Director (CD) - For Invoice/Admin Actions:**
- EMPWR: `empwrdance@gmail.com` / `1CompSyncLogin!`
- Glow: `stefanoalyessia@gmail.com` / `1CompSyncLogin!`
- Role: Competition Director
- Use for: Approving reservations, creating invoices

---

## Category 1: Authentication & Navigation (5 tests)

### T1.1: SD Login Flow
**Spec Reference:** Phase 1 spec lines 30-68 (user roles)
**Steps:**
1. Navigate to `https://empwr.compsync.net`
2. Login: djamusic@gmail.com / 123456
3. Verify: Dashboard loads with studio name
4. Verify: "Entries" navigation visible
5. Check console for errors
**Expected:** Clean login, dashboard renders
**Evidence Required:**
- Screenshot: `auth-sd-login-empwr-[timestamp].png`
- Console: No errors
- Database: `SELECT * FROM studios WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'djamusic@gmail.com')`

### T1.2: SD Navigation to Entries
**Steps:**
1. From dashboard, click "Entries" in navigation
2. Verify: Entries page loads
3. Verify: Shows existing reservation
4. Verify: "Create Entry" button visible
**Expected:** Entries dashboard with reservation info
**Evidence Required:**
- Screenshot: `nav-entries-dashboard-empwr-[timestamp].png`
- Console: No errors

### T1.3: CD Login Flow (For Invoice Testing)
**Steps:**
1. Logout from SD account
2. Navigate to `https://empwr.compsync.net`
3. Login: empwrdance@gmail.com / 1CompSyncLogin!
4. Verify: CD dashboard loads
5. Verify: "Director Panel" navigation visible
**Expected:** CD has access to admin features
**Evidence Required:**
- Screenshot: `auth-cd-login-empwr-[timestamp].png`
- Console: No errors

### T1.4: Multi-Tenant Isolation Check
**Spec Reference:** Phase 1 spec lines 51-68 (tenant isolation)
**Steps:**
1. Login as SD on EMPWR (djamusic@gmail.com)
2. Note entry count and reservation IDs
3. Logout, navigate to `https://glow.compsync.net`
4. Login as same SD account
5. Verify: DIFFERENT entries/reservations (or none if no Glow data)
**Expected:** Complete data isolation between tenants
**Evidence Required:**
- SQL Query:
  ```sql
  SELECT COUNT(*) FROM competition_entries WHERE tenant_id = '00000000-0000-0000-0000-000000000001'; -- EMPWR
  SELECT COUNT(*) FROM competition_entries WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'; -- Glow
  ```

### T1.5: Session Persistence
**Steps:**
1. Login as SD
2. Navigate to entries page
3. Refresh browser (F5)
4. Verify: Still logged in, data persists
**Expected:** No re-login required
**Evidence Required:**
- Screenshot: `auth-session-persist-empwr-[timestamp].png`

---

## Category 2: Manual Entry Creation (8 tests)

### T2.1: Solo Entry Creation (Happy Path)
**Spec Reference:** Phase 1 spec lines 398-438 (entry creation)
**Steps:**
1. Navigate to `/dashboard/entries`
2. Click "Create Entry"
3. Enter routine name: "Test Solo - [timestamp]"
4. Select 1 dancer (must have birthdate)
5. Select category: Jazz
6. Select classification: Intermediate
7. Verify: Age auto-calculated and displayed
8. Verify: Size category shows "Solo"
9. Click "Save Entry"
10. Verify: Success message appears
11. Verify: Bottom bar capacity updates (+1)
**Expected:** Entry saved, capacity decremented
**Evidence Required:**
- Screenshot: `entry-solo-create-empwr-[timestamp].png`
- Console: No errors
- Database:
  ```sql
  SELECT * FROM competition_entries
  WHERE routine_name LIKE 'Test Solo%'
  ORDER BY created_at DESC LIMIT 1;
  ```
- Verify: `routine_age`, `size_category_id`, `classification_id` populated

### T2.2: Duet Entry Creation
**Steps:**
1. Click "Create Entry"
2. Enter routine name: "Test Duet - [timestamp]"
3. Select 2 dancers
4. Verify: Age shows average (rounded down)
5. Verify: Size category shows "Duet/Trio"
6. Save entry
**Expected:** Duet rules applied correctly
**Evidence Required:**
- Screenshot: `entry-duet-create-empwr-[timestamp].png`
- Database: Verify `size_category_id` matches Duet/Trio

### T2.3: Small Group Entry (4-9 dancers)
**Steps:**
1. Create entry with 5 dancers
2. Verify: Size category shows "Small Group"
3. Verify: Classification uses 60% majority rule
4. Save entry
**Expected:** Small Group category assigned
**Evidence Required:**
- Screenshot: `entry-small-group-empwr-[timestamp].png`
- Database: Verify `size_category_id` matches Small Group

### T2.4: Large Group Entry (10+ dancers)
**Steps:**
1. Create entry with 12 dancers
2. Verify: Size category shows "Large Group"
3. Save entry
**Expected:** Large Group category assigned
**Evidence Required:**
- Screenshot: `entry-large-group-empwr-[timestamp].png`
- Database: Verify `size_category_id` matches Large Group

### T2.5: Production Entry (15+ dancers, special rules)
**Spec Reference:** Phase 1 spec lines 825-871 (validation rules)
**Steps:**
1. Create entry with 15+ dancers
2. Select category: Production
3. Verify: NO "Exception Required" button appears
4. Verify: Can select any classification without exception
5. Save entry
**Expected:** Production exempt from exception logic
**Evidence Required:**
- Screenshot: `entry-production-no-exception-empwr-[timestamp].png`
- Verify: AutoCalculatedSection.tsx:132 logic working

### T2.6: Age Override (+1 Bump)
**Spec Reference:** Phase 1 spec lines 546-585 (age calculation)
**Steps:**
1. Create solo with dancer DOB = 2012-03-15 (age ~12)
2. Verify: Calculated age shows 12
3. Select age dropdown
4. Verify: Only 2 options (12 and 13)
5. Select 13 (+1 bump)
6. Save entry
**Expected:** Age override stored correctly
**Evidence Required:**
- Screenshot: `entry-age-bump-empwr-[timestamp].png`
- Database: Verify `age_override = 13` and `routine_age = 13`

### T2.7: Entry Edit Mode
**Steps:**
1. Click on existing entry to edit
2. Change routine name
3. Verify: "Save and Create Another" button HIDDEN
4. Verify: Only "Cancel" and "Update" buttons visible
5. Click "Update"
6. Verify: Changes saved
**Expected:** Edit mode prevents accidental overwrites
**Evidence Required:**
- Screenshot: `entry-edit-mode-empwr-[timestamp].png`
- Database: Verify updated routine_name

### T2.8: Entry Delete (Soft Delete)
**Spec Reference:** Phase 1 spec lines 190-198 (soft delete)
**Steps:**
1. Create test entry
2. Click delete button
3. Confirm deletion
4. Verify: Entry removed from UI
5. Verify: Capacity refunded (+1)
**Expected:** Soft delete, not hard delete
**Evidence Required:**
- Database:
  ```sql
  SELECT id, routine_name, deleted_at
  FROM competition_entries
  WHERE routine_name LIKE 'Test%'
  AND deleted_at IS NOT NULL;
  ```
- Verify: `deleted_at` IS NOT NULL (not actually deleted)

---

## Category 3: CSV Import Flow (7 tests)

### T3.1: CSV Upload (Valid File)
**Steps:**
1. Navigate to `/dashboard/entries`
2. Click "Import from CSV"
3. Upload file: `D:\ClaudeCode\CompPortal\test_routines_15.csv`
4. Verify: Preview table shows 15 routines
5. Verify: All columns parsed correctly
6. Verify: No error messages
**Expected:** CSV parsed successfully
**Evidence Required:**
- Screenshot: `csv-upload-preview-empwr-[timestamp].png`
- Console: No errors

### T3.2: CSV Dancer Matching & Pinning
**Steps:**
1. After CSV upload, view first routine preview
2. Click on dancer selection
3. Verify: Matched dancer "Emma Johnson" pinned to TOP of list
4. Verify: Other dancers below
**Expected:** Matched dancers prioritized
**Evidence Required:**
- Screenshot: `csv-dancer-pinned-empwr-[timestamp].png`

### T3.3: CSV Save First Routine
**Steps:**
1. On first routine, verify all fields populated
2. Click "Save and Next"
3. Verify: Success message
4. Verify: Bottom bar updates from "N/50" to "N+1/50"
5. Verify: Advances to next routine
**Expected:** Entry saved, capacity tracked
**Evidence Required:**
- Screenshot: `csv-save-first-routine-empwr-[timestamp].png`
- Database: Verify entry exists with correct data

### T3.4: CSV Batch Save (Multiple Routines)
**Steps:**
1. Continue through CSV import
2. Save 5 routines sequentially
3. Verify: Bottom bar increments each time
4. Verify: Each routine shows in entries dashboard
**Expected:** All routines saved correctly
**Evidence Required:**
- Screenshot: `csv-batch-save-empwr-[timestamp].png`
- Database:
  ```sql
  SELECT COUNT(*) FROM competition_entries
  WHERE routine_name IN (SELECT routine_name FROM test_routines_15.csv);
  ```

### T3.5: CSV Error Handling (Invalid Data)
**Steps:**
1. Create CSV with invalid birthdate format
2. Upload CSV
3. Verify: Error message shows which rows invalid
4. Verify: Valid rows still processable
**Expected:** Graceful error handling
**Evidence Required:**
- Screenshot: `csv-error-handling-empwr-[timestamp].png`

### T3.6: CSV Import Cancel Mid-Flow
**Steps:**
1. Upload CSV, start import
2. Save 2 routines
3. Click "Cancel" or navigate away
4. Return to entries dashboard
5. Verify: Only 2 routines saved (not all 15)
6. Verify: Capacity reflects actual saves
**Expected:** Partial import allowed
**Evidence Required:**
- Database: Verify only 2 entries from CSV exist

### T3.7: CSV Large File (50+ routines)
**Steps:**
1. Create CSV with 50 routines (or use existing large file)
2. Upload and preview
3. Verify: All rows show in preview
4. Save first 10 routines
5. Verify: Performance acceptable (<2 sec per save)
**Expected:** Handles large imports efficiently
**Evidence Required:**
- Screenshot: `csv-large-file-empwr-[timestamp].png`
- Performance note in evidence file

---

## Category 4: Summary Submission (6 tests)

### T4.1: Summary Submission (Happy Path)
**Spec Reference:** Phase 1 spec lines 589-651 (summary submission)
**Steps:**
1. Ensure reservation has 5+ entries created
2. Navigate to entries dashboard
3. Click "Submit Summary"
4. Review modal:
   - Verify: Shows entry count
   - Verify: Shows unused spaces
   - Verify: Shows capacity refund calculation
5. Click "Confirm Submit"
6. Verify: Success message
7. Verify: Entries dashboard shows "Submitted" status
**Expected:** Summary created, capacity refunded
**Evidence Required:**
- Screenshot: `summary-submit-modal-empwr-[timestamp].png`
- Database:
  ```sql
  SELECT * FROM reservation_summaries
  WHERE reservation_id = '[reservation-id]';

  SELECT entries_used, entries_unused
  FROM reservation_summaries
  WHERE reservation_id = '[reservation-id]';
  ```
- Verify: `entries_unused` refunded to competition capacity

### T4.2: Capacity Refund Verification
**Spec Reference:** Phase 1 spec lines 632-635 (immediate refund)
**Steps:**
1. Before summary: Note competition `available_reservation_tokens`
2. Submit summary with 5 entries (from 50 reservation)
3. Expected refund: 45 spaces
4. Query database after submission
5. Verify: Competition capacity increased by 45
**Expected:** Immediate capacity refund on summary submission
**Evidence Required:**
- Database (before):
  ```sql
  SELECT available_reservation_tokens
  FROM competitions
  WHERE id = '[competition-id]';
  ```
- Database (after): Same query, verify +45
- Screenshot: `capacity-refund-verified-empwr-[timestamp].png`

### T4.3: Summary Prevents Duplicate Submission
**Steps:**
1. Submit summary (first time)
2. Attempt to submit again
3. Verify: Error message "Summary already submitted"
4. Verify: No duplicate in database
**Expected:** Idempotency enforced
**Evidence Required:**
- Screenshot: `summary-duplicate-prevention-empwr-[timestamp].png`
- Database: Only 1 summary record exists

### T4.4: Summary Requires Minimum 1 Entry
**Spec Reference:** Phase 1 spec line 606
**Steps:**
1. Create new reservation (0 entries)
2. Attempt to submit summary
3. Verify: Error "Must create at least 1 entry"
4. Create 1 entry, retry
5. Verify: Summary submits successfully
**Expected:** Validation prevents empty summaries
**Evidence Required:**
- Screenshot: `summary-min-entry-validation-empwr-[timestamp].png`

### T4.5: Summary Status Transition
**Spec Reference:** Phase 1 spec lines 187-198 (state transitions)
**Steps:**
1. Verify reservation status = "approved"
2. Submit summary
3. Verify: Reservation status changes to "summarized"
4. Verify: All entries status = "submitted"
**Expected:** Proper state transitions
**Evidence Required:**
- Database:
  ```sql
  SELECT status FROM reservations WHERE id = '[reservation-id]';
  SELECT status FROM competition_entries WHERE reservation_id = '[reservation-id]';
  ```

### T4.6: Summary Email Notification (CD)
**Spec Reference:** Phase 1 spec lines 638-648
**Steps:**
1. Submit summary as SD
2. Login as CD (empwrdance@gmail.com)
3. Check CD dashboard or email inbox
4. Verify: Notification shows summary submitted
5. Verify: Includes entries_used and entries_unused counts
**Expected:** CD notified of summary submission
**Evidence Required:**
- Screenshot: `summary-cd-notification-empwr-[timestamp].png`

---

## Category 5: Invoice Generation (5 tests)

### T5.1: Invoice Creation (Basic)
**Spec Reference:** Phase 1 spec lines 656-720 (invoice calculation)
**Steps:**
1. Login as CD (empwrdance@gmail.com)
2. Navigate to Director Panel → Reservations
3. Find reservation with submitted summary
4. Click "Create Invoice"
5. Verify: Invoice preview shows:
   - Base cost = entries_used × global_entry_fee
   - Subtotal
   - Tax
   - Total
6. Click "Generate Invoice"
7. Verify: Invoice created successfully
**Expected:** Invoice matches spec formula
**Evidence Required:**
- Screenshot: `invoice-create-basic-empwr-[timestamp].png`
- Database:
  ```sql
  SELECT subtotal, tax_amount, total, line_items
  FROM invoices
  WHERE reservation_id = '[reservation-id]';
  ```
- Manual calculation: Verify totals match spec

### T5.2: Invoice with Title Upgrades
**Spec Reference:** Phase 1 spec lines 672-679
**Steps:**
1. Ensure reservation has solo entries with title upgrades
2. Create invoice
3. Verify: Line item shows title upgrade charges
4. Verify: Formula = title_upgrades × title_upgrade_fee
**Expected:** Title upgrades calculated correctly
**Evidence Required:**
- Database: Verify `line_items` JSON includes title upgrade entries

### T5.3: Invoice with Discount
**Spec Reference:** Phase 1 spec lines 695-702
**Steps:**
1. Create invoice with 10% discount
2. Verify: Discount line item shows
3. Verify: Formula = subtotal × 0.10
4. Verify: Total reflects discount
**Expected:** Percentage discount applied correctly
**Evidence Required:**
- Screenshot: `invoice-discount-empwr-[timestamp].png`
- Database: Verify discount in line_items

### T5.4: Invoice with Credits
**Spec Reference:** Phase 1 spec lines 658-664
**Steps:**
1. Create invoice with $200 credit (label: "Deposit from 2024")
2. Verify: Credit line item shows
3. Verify: Total reduced by credit amount
**Expected:** Credits applied correctly
**Evidence Required:**
- Screenshot: `invoice-credit-empwr-[timestamp].png`
- Database: Verify credit in line_items

### T5.5: Invoice Status Lifecycle
**Steps:**
1. Create invoice → Verify status = "pending"
2. Mark as paid → Verify status = "paid"
3. Verify: Reservation status = "invoiced"
**Expected:** Status transitions correct
**Evidence Required:**
- Database:
  ```sql
  SELECT status FROM invoices WHERE id = '[invoice-id]';
  SELECT status FROM reservations WHERE id = '[reservation-id]';
  ```

---

## Category 6: Split Invoice by Dancer (4 tests)

### T6.1: Split Invoice Modal Opens
**Steps:**
1. Login as SD (djamusic@gmail.com)
2. Navigate to invoices
3. Find paid invoice
4. Click "Split by Dancer"
5. Verify: Modal opens with margin configuration
6. Verify: Shows 4 margin types (None, Markup %, Discount %, Fixed $)
**Expected:** Wizard UI loads correctly
**Evidence Required:**
- Screenshot: `split-invoice-modal-empwr-[timestamp].png`

### T6.2: Split with No Margin
**Steps:**
1. Open split invoice wizard
2. Select "No Margin"
3. Review preview (shows original amounts)
4. Click "Split Invoice"
5. Verify: Sub-invoices created
6. Verify: Each dancer has separate invoice
7. Verify: Sum of sub-invoices = main invoice total
**Expected:** Accurate split without markup
**Evidence Required:**
- Screenshot: `split-no-margin-empwr-[timestamp].png`
- Database:
  ```sql
  SELECT dancer_name, subtotal, tax_amount, total, margin_type, margin_value
  FROM sub_invoices
  WHERE parent_invoice_id = '[invoice-id]';

  -- Verify sum matches main invoice
  SELECT SUM(total) FROM sub_invoices WHERE parent_invoice_id = '[invoice-id]';
  SELECT total FROM invoices WHERE id = '[invoice-id]';
  ```

### T6.3: Split with 10% Markup
**Steps:**
1. Open split invoice wizard
2. Select "Markup %" → Enter 10
3. Review preview (shows +10% per dancer)
4. Click "Split Invoice"
5. Verify: Each sub-invoice total = original + 10%
6. Verify: Margin stored in database
**Expected:** Proportional markup applied
**Evidence Required:**
- Screenshot: `split-markup-10pct-empwr-[timestamp].png`
- Database: Verify `margin_type = 'markup_percent'`, `margin_value = 10.00`
- Manual calculation: Verify totals correct

### T6.4: Split Invoice Validation Summary
**Steps:**
1. After split, view sub-invoices list
2. Verify: Validation badge shows "Passed" (green) if totals match
3. Verify: Validation badge shows "Error" (red) if mismatch
4. Verify: Shows main invoice total vs sub-invoice sum
**Expected:** Validation UI clear
**Evidence Required:**
- Screenshot: `split-validation-summary-empwr-[timestamp].png`

---

## Category 7: Edge Cases & Validation (10 tests)

### T7.1: Capacity Boundary (Exact Match)
**Steps:**
1. Reservation approved for 10 spaces
2. Create exactly 10 entries
3. Attempt to create 11th entry
4. Verify: Error "Reservation capacity exceeded"
**Expected:** Hard capacity limit enforced
**Evidence Required:**
- Screenshot: `capacity-boundary-empwr-[timestamp].png`

### T7.2: Negative Age Handling
**Steps:**
1. Attempt to create entry with dancer DOB in future
2. Verify: Error message or age calculation handles gracefully
**Expected:** Invalid DOB rejected
**Evidence Required:**
- Screenshot: `edge-negative-age-empwr-[timestamp].png`

### T7.3: Missing Required Fields
**Steps:**
1. Create entry without routine name
2. Attempt to save
3. Verify: Validation error "Routine name required"
4. Test other required fields (category, dancers)
**Expected:** All required fields validated
**Evidence Required:**
- Screenshot: `validation-required-fields-empwr-[timestamp].png`

### T7.4: Special Characters in Routine Name
**Steps:**
1. Create entry with name: "Test's Routine: "Quotes" & Symbols!"
2. Save entry
3. View in dashboard
4. Verify: Name displays correctly, no encoding issues
**Expected:** Special chars handled safely
**Evidence Required:**
- Screenshot: `edge-special-chars-empwr-[timestamp].png`
- Database: Verify name stored correctly

### T7.5: Large Dancer Count (Edge Case)
**Steps:**
1. Create entry with 50 dancers
2. Verify: Age calculation works
3. Verify: Classification calculation works (60% rule)
4. Save entry
**Expected:** System handles large groups
**Evidence Required:**
- Screenshot: `edge-large-dancer-count-empwr-[timestamp].png`

### T7.6: Classification Exception Flow
**Steps:**
1. Create non-solo entry with mixed classifications
2. Select classification 2 levels above auto-calculated
3. Verify: "Exception Required" button appears
4. Click exception button
5. Verify: Exception request created
**Expected:** Exception flow working
**Evidence Required:**
- Screenshot: `classification-exception-empwr-[timestamp].png`
- Database: Verify exception request created

### T7.7: Concurrent Entry Creation (Race Condition)
**Steps:**
1. Open 2 browser tabs, login as SD
2. In Tab 1: Start creating entry
3. In Tab 2: Start creating entry at same time
4. Save both entries quickly
5. Verify: Both entries saved
6. Verify: Capacity decremented correctly (no race condition)
**Expected:** Atomic capacity updates
**Evidence Required:**
- Database: Verify 2 entries, correct capacity

### T7.8: Browser Refresh Mid-Entry
**Steps:**
1. Start creating entry (fill half the form)
2. Press F5 to refresh browser
3. Verify: Form data lost (expected)
4. Verify: No orphaned database records
**Expected:** Graceful handling, no corruption
**Evidence Required:**
- Database: Verify no partial entries created

### T7.9: Long Session Timeout
**Steps:**
1. Login as SD
2. Wait 30 minutes (or simulate session expiry)
3. Attempt to create entry
4. Verify: Redirected to login or session refreshed
**Expected:** Session management working
**Evidence Required:**
- Screenshot: `session-timeout-empwr-[timestamp].png`

### T7.10: Invoice Calculation Precision (Rounding)
**Steps:**
1. Create invoice with odd numbers (e.g., 3 entries @ $47.33 each)
2. Add 8.5% tax
3. Verify: Rounding correct to 2 decimal places
4. Verify: Total = subtotal + tax (no rounding errors)
**Expected:** Financial calculations precise
**Evidence Required:**
- Database: Verify all amounts have exactly 2 decimal places
- Manual calculation: Verify totals match

---

## Evidence Tracking

**Screenshot Naming Convention:**
```
evidence/screenshots/[category]-[test-name]-[tenant]-[timestamp].png
```

**Database Query Log:**
```
evidence/queries/[test-name]-[timestamp].sql
```

**Console Log:**
```
evidence/console/[test-name]-[timestamp].txt
```

---

## Final Deliverable: PRODUCTION_LAUNCH_TEST_RESULTS.md

**Structure:**
```markdown
# Production Launch Test Results

**Date:** November 6, 2025
**Tester:** Claude (Autonomous)
**Build:** [commit-hash]

## Executive Summary
- Total Tests: 45
- Passed: X (X%)
- Failed: X (X%)
- Blocked: X (X%)

## Test Results by Category

### Category 1: Auth & Navigation (5/5 passed)
[List each test with ✅/❌ and evidence link]

### Category 2: Manual Entry Creation (X/8 passed)
[List each test with ✅/❌ and evidence link]

[... continue for all categories ...]

## Critical Blockers (if any)
1. [Blocker description] - See BLOCKER_[name].md
2. [Blocker description] - See BLOCKER_[name].md

## Ready for Launch?
**YES / NO with reasoning**

## Recommendations
- [Any suggestions for launch day monitoring]
- [Any edge cases to watch]
```

---

## Autonomous Execution Checklist

Before starting each test session:
- [ ] TodoWrite tool created with all 45 tests
- [ ] Logged into empwr.compsync.net as SD
- [ ] Browser console open
- [ ] Evidence folder ready
- [ ] Spec documents reference tab open

During testing:
- [ ] Mark each test in_progress before starting
- [ ] Capture screenshot immediately after action
- [ ] Check console after every action
- [ ] Run SQL query to verify data
- [ ] Test on Glow tenant if multi-tenant applicable
- [ ] Mark complete ONLY with full evidence
- [ ] Create blocker doc if test fails

After all tests:
- [ ] Create PRODUCTION_LAUNCH_TEST_RESULTS.md
- [ ] Commit all evidence to git
- [ ] Update CURRENT_WORK.md
- [ ] Create summary for user

---

**START TESTING NOW - Work systematically through all 45 tests with "continue" script**
