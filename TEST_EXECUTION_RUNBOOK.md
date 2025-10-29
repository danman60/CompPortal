# MVP Launch Test Execution Runbook
**Purpose:** Comprehensive production readiness validation for CompPortal Phase 1
**Tool:** Playwright MCP + Supabase MCP + Vercel Logs
**Test Type:** E2E Functional, UI/UX, Data Persistence, Error Logging, Edge Cases
**User:** Studio Director (djamusic@gmail.com)
**Environment:** https://empwr.compsync.net
**Business Logic Ref:** `docs/specs/PHASE1_SPEC.md` (lines 30-1040)

---

## 🚨 MVP Launch Readiness Criteria

This test suite validates **production launch readiness** for CompPortal Phase 1.

### Launch Blockers (Must Pass)
- ✅ Zero P0 bugs discovered during testing
- ✅ All core flows work end-to-end (Dancers → Reservations → Entries → Summary → Invoice)
- ✅ Multi-tenant isolation verified (no cross-contamination)
- ✅ Data persistence confirmed (all CRUD operations persist correctly)
- ✅ No console errors on critical paths
- ✅ Capacity management accurate (no negative capacity, refunds work)
- ✅ Payment flow complete without errors

### Quality Gates (>80% Pass Required)
- ✅ CSV Import: 8/10 tests pass
- ✅ Reservation Flow: 7/8 tests pass
- ✅ Entry Creation: 8/10 tests pass
- ✅ UI/UX: All pages render without layout breaks
- ✅ Error Messages: User-friendly, actionable errors

### Known Issues Acceptable for Launch
- 🟡 P2 bugs (cosmetic, non-blocking)
- 🟡 CD-only features not tested (if no CD access)
- 🟡 Phase 2 features (not in scope)

---

## Pre-Execution Checklist

### 1. Prepare Test Environment

**Browser Console Monitoring:**
```
mcp__playwright__browser_console_messages()  # Clear/check before starting
```

**Vercel Logs Preparation:**
- Note test start time: `{TIMESTAMP}`
- After test run, retrieve Vercel logs via MCP for error analysis
- Filter logs by test timeframe for debugging

### 2. Capture Baseline Database State
```sql
-- Run via Supabase MCP
SELECT
  (SELECT COUNT(*) FROM dancers
   WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as baseline_dancers,
  (SELECT COUNT(*) FROM reservations
   WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as baseline_reservations,
  (SELECT COUNT(*) FROM entries
   WHERE reservation_id IN (
     SELECT id FROM reservations WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
   )) as baseline_entries,
  NOW() as test_start_time;
```

### 3. Initialize Test Report
Create `MVP_LAUNCH_REPORT_{DATE}.md` with template structure (see end of document).

### 4. Open Browser Session & Enable Console Monitoring
```
mcp__playwright__browser_navigate(url: "https://empwr.compsync.net/login")
mcp__playwright__browser_console_messages()  # Baseline check - should be empty or minimal
```

### 5. Authenticate (Skip if already logged in)
```
- Email: djamusic@gmail.com
- Password: 123456
```

**Post-Login Validation:**
```
# Check console for auth errors
mcp__playwright__browser_console_messages(onlyErrors: true)

# Verify session established in database
SELECT id, email, last_sign_in_at FROM auth.users WHERE email = 'djamusic@gmail.com';

# Verify user profile exists
SELECT id, role, first_name, last_name FROM user_profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'djamusic@gmail.com');
```

---

## Phase 0: Page Inspection & UI/UX Validation (NEW)
**Duration:** ~15 minutes
**Purpose:** Verify every page loads, renders correctly, and has no console errors

### Page Catalog - Studio Director Pages

#### 0.1: Dashboard Home
**URL:** `/dashboard`
**Business Logic:** Entry point, shows overview stats and quick actions

**Validation Steps:**
```
browser_navigate("https://empwr.compsync.net/dashboard")
browser_wait_for(time: 2)
browser_snapshot()  # Visual regression baseline
browser_console_messages()  # Check for errors
```

**UI/UX Checks:**
- ✅ Page loads within 3 seconds
- ✅ No layout shifts (CLS)
- ✅ Navigation menu visible
- ✅ User name displayed in header
- ✅ Dashboard widgets render (if any)
- ✅ No console errors
- ✅ No broken images (check snapshot)

**Database Verification:**
```sql
-- Verify dashboard data sources exist
SELECT COUNT(*) as dancer_count FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';

SELECT COUNT(*) as reservation_count FROM reservations
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';
```

---

#### 0.2: Dancers List Page
**URL:** `/dashboard/dancers`
**Business Logic Ref:** Phase 1 spec lines 329-394 (Dancer Management)

**Validation Steps:**
```
browser_navigate("https://empwr.compsync.net/dashboard/dancers")
browser_wait_for(time: 2)
browser_snapshot()
browser_console_messages(onlyErrors: true)
```

**UI/UX Checks:**
- ✅ Table renders with data
- ✅ Search box functional
- ✅ "Add Dancer" button visible
- ✅ "Import CSV" button visible
- ✅ Pagination works (if > 10 dancers)
- ✅ Sort columns work
- ✅ No console errors

**Functional Checks:**
```
# Test search
browser_type(element: "Search input", ref: "{REF}", text: "Emma")
browser_wait_for(time: 1)
browser_snapshot()  # Should show filtered results

# Clear search
browser_type(element: "Search input", ref: "{REF}", text: "")
```

---

#### 0.3: Dancer Import Page
**URL:** `/dashboard/dancers/import`
**Business Logic Ref:** Phase 1 spec lines 352-394 (Bulk Import)

**Validation Steps:**
```
browser_navigate("https://empwr.compsync.net/dashboard/dancers/import")
browser_wait_for(text: "Upload CSV")
browser_snapshot()
browser_console_messages(onlyErrors: true)
```

**UI/UX Checks:**
- ✅ Upload zone visible
- ✅ Instructions clear and helpful
- ✅ Sample CSV link works
- ✅ Back button functional
- ✅ No console errors

---

#### 0.4: Events/Reservations Page
**URL:** `/dashboard/events` or `/dashboard/reservations`
**Business Logic Ref:** Phase 1 spec lines 398-438 (Reservation Submission)

**Validation Steps:**
```
browser_navigate("https://empwr.compsync.net/dashboard/events")
browser_wait_for(time: 2)
browser_snapshot()
browser_console_messages(onlyErrors: true)
```

**UI/UX Checks:**
- ✅ Events list renders
- ✅ Event cards show: name, date, capacity, status
- ✅ "Request Reservation" button visible for open events
- ✅ Closed events clearly marked
- ✅ No console errors

**Database Check:**
```sql
-- Verify events data for SD
SELECT id, name, start_at, capacity_entries, remaining_capacity, status
FROM events
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND status IN ('registration_open', 'registration_closed')
ORDER BY start_at ASC;
```

---

#### 0.5: Entries Page (for approved reservation)
**URL:** `/dashboard/reservations/{RESERVATION_ID}/entries`
**Business Logic Ref:** Phase 1 spec lines 503-585 (Entry Creation)

**Prerequisites:** At least 1 approved reservation

**Validation Steps:**
```sql
-- Find an approved reservation first
SELECT id, entries_approved, status FROM reservations
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND status IN ('approved', 'adjusted')
LIMIT 1;
```

```
browser_navigate("https://empwr.compsync.net/dashboard/reservations/{RESERVATION_ID}/entries")
browser_wait_for(time: 2)
browser_snapshot()
browser_console_messages(onlyErrors: true)
```

**UI/UX Checks:**
- ✅ Quota counter shows X of Y used
- ✅ "Create Entry" button visible (if quota available)
- ✅ Entry list renders (if entries exist)
- ✅ Edit/Delete buttons functional
- ✅ No console errors

---

#### 0.6: Summary Page
**URL:** `/dashboard/reservations/{RESERVATION_ID}/summary`
**Business Logic Ref:** Phase 1 spec lines 589-651 (Summary Submission)

**Prerequisites:** Approved reservation with at least 1 entry created

**Validation Steps:**
```
browser_navigate("https://empwr.compsync.net/dashboard/reservations/{RESERVATION_ID}/summary")
browser_wait_for(time: 2)
browser_snapshot()
browser_console_messages(onlyErrors: true)
```

**UI/UX Checks:**
- ✅ Entry list displays all created entries
- ✅ Summary shows entries used vs approved
- ✅ "Submit Summary" button visible (if not yet submitted)
- ✅ Calculation accurate (entries_used + entries_unused = entries_approved)
- ✅ No console errors

---

#### 0.7: Settings/Profile Page
**URL:** `/dashboard/settings` or `/dashboard/profile`

**Validation Steps:**
```
browser_navigate("https://empwr.compsync.net/dashboard/settings")
browser_wait_for(time: 2)
browser_snapshot()
browser_console_messages(onlyErrors: true)
```

**UI/UX Checks:**
- ✅ Profile info displays
- ✅ Edit fields functional
- ✅ Save button works
- ✅ No console errors

---

### Page Inspection Summary Template

After visiting all pages, document results:

```markdown
## Phase 0: Page Inspection Results

| Page | Load Time | Console Errors | UI Issues | Status |
|------|-----------|----------------|-----------|--------|
| Dashboard | 1.2s | 0 | None | ✅ PASS |
| Dancers List | 1.5s | 0 | None | ✅ PASS |
| Dancer Import | 1.1s | 0 | None | ✅ PASS |
| Events/Reservations | 1.8s | 0 | None | ✅ PASS |
| Entries | 1.4s | 0 | None | ✅ PASS |
| Summary | 1.3s | 0 | None | ✅ PASS |
| Settings | 1.2s | 0 | None | ✅ PASS |

**Phase 0 Pass Rate:** 7/7 (100%)
**Critical Issues:** {NONE or LIST}
**Console Errors Found:** {NONE or LIST}
```

---

## Test Execution Order

### Phase 1: CSV Import Tests (Category 1)
**Duration:** ~20 minutes
**Tests:** 1.1 through 1.10

#### Test 1.1: Perfect Match CSV
**Business Logic Ref:** Phase 1 spec lines 352-394 (Bulk Import)
**Known Bugs:** Bug #1 (date offset), Bug #2 (4/5 success), Bug #3 (vague errors)

**Step 1:** Navigate to import page
```
browser_navigate("https://empwr.compsync.net/dashboard/dancers/import")
browser_wait_for(time: 2)
browser_snapshot()  # Capture page state

# Console check
browser_console_messages(onlyErrors: true)  # Should be 0 errors on page load
```

**Step 2:** Upload CSV file
```
# Wait for file input to be visible
browser_wait_for(text: "Upload CSV")

# Trigger file upload dialog
browser_click(element: "Upload CSV button", ref: "{REF_FROM_SNAPSHOT}")

# Upload file
browser_file_upload(paths: ["D:\\ClaudeCode\\CompPortal\\test-data\\import-tests\\dancers\\01-perfect-match.csv"])

# Wait for preview to process
browser_wait_for(time: 2)

# Console check after upload
browser_console_messages(onlyErrors: true)  # Check for parsing errors
```

**Step 3:** Verify preview shows 5 dancers
```
browser_snapshot()  # Capture preview state
browser_wait_for(text: "5 dancers")  # or whatever text indicates count

# Visual verification in snapshot:
# - All 5 rows visible in preview table
# - Columns mapped correctly (first_name, last_name, date_of_birth, etc.)
# - No validation error messages visible
# - "Import Dancers" button enabled
```

**Step 4:** Import dancers
```
# Note timestamp before import for database filtering
# {IMPORT_START_TIMESTAMP}

browser_click(element: "Import Dancers button", ref: "{REF}")
browser_wait_for(time: 3)  # Wait for import to complete
browser_snapshot()  # Capture success/error state

# Console check after import
browser_console_messages()  # Check for API errors, network failures, tRPC errors
```

**Step 5:** Database Persistence Verification
```sql
-- Via Supabase MCP

-- Check exact count imported
SELECT COUNT(*) as actual_count
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND created_at > '{IMPORT_START_TIMESTAMP}'::timestamp;
-- Expected: 5, Actual (Bug #2): 4

-- Check which dancers were created
SELECT first_name, last_name, date_of_birth::text as dob_text, email, created_at
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND first_name IN ('Emma', 'Michael', 'Sophia', 'James', 'Olivia')
  AND created_at > '{IMPORT_START_TIMESTAMP}'::timestamp
ORDER BY first_name;

-- Date accuracy verification (Bug #1 check)
SELECT
  first_name,
  last_name,
  date_of_birth::text as db_date,
  CASE
    WHEN date_of_birth = '2010-05-15'::date THEN '✅ CORRECT'
    WHEN date_of_birth = '2010-05-14'::date THEN '❌ OFF BY 1 DAY (Bug #1)'
    ELSE '❌ UNEXPECTED DATE'
  END as date_check
FROM dancers
WHERE first_name = 'Emma' AND last_name = 'Johnson'
  AND created_at > '{IMPORT_START_TIMESTAMP}'::timestamp;

-- Data integrity check
SELECT
  id,
  first_name,
  last_name,
  studio_id,
  tenant_id,
  status,
  created_at,
  updated_at,
  deleted_at
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND created_at > '{IMPORT_START_TIMESTAMP}'::timestamp;

-- Expected results:
-- ✅ studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a' (all rows)
-- ✅ tenant_id = '00000000-0000-0000-0000-000000000001' (all rows)
-- ✅ status = 'active' (all rows)
-- ✅ deleted_at IS NULL (all rows)
-- ✅ created_at and updated_at within last minute
```

**Step 6:** Error Logging Analysis

**Check Vercel Logs (after test run):**
- Filter by timestamp: {IMPORT_START_TIMESTAMP}
- Search for keywords: "dancer", "batchCreate", "error", "failed"
- Look for tRPC mutations logged
- Check if partial failures are logged

**Expected Log Patterns:**
```
[tRPC] dancer.batchCreate started
[tRPC] dancer.batchCreate completed {successful: 4, failed: 1}
[ERROR] Dancer creation failed: {REASON}
```

**Step 7:** UI/UX Validation

**Success Case (if all 5 imported):**
- ✅ Success message: "5 dancers imported successfully"
- ✅ Redirects to /dashboard/dancers
- ✅ New dancers visible in list immediately
- ✅ No error toast/notification

**Partial Failure Case (Bug #2 - 4/5 imported):**
- ❌ Shows success message despite failure
- ❌ Redirects without showing errors
- ❌ No indication which dancer failed
- ❌ User unaware of missing dancer

**Step 8:** Record results
```markdown
### Test 1.1: Perfect Match CSV (Phase 1 spec 352-394)
- **Status:** [PASS/FAIL]
- **Expected:** 5 dancers imported with correct dates
- **Actual:** {COUNT} dancers imported, dates off by {X} days
- **Known Issues:**
  - Bug #2: Only 4/5 dancers imported (Sophia Williams missing)
  - Bug #1: All dates off by 1 day (timezone conversion)
  - Bug #3: No error message shown for failed dancer
- **Evidence:**
  - Screenshot (preview): {FILENAME}
  - Screenshot (result): {FILENAME}
  - Console logs: {PASTE_CONSOLE_OUTPUT}
  - Database result: {PASTE_SQL_RESULT}
  - Vercel logs: {PASTE_RELEVANT_LOGS}
- **Data Persistence:** [✅ VERIFIED / ❌ ISSUES FOUND]
- **Multi-Tenant Isolation:** [✅ VERIFIED / ❌ LEAK DETECTED]
- **Console Errors:** [{COUNT} errors found / No errors]
- **Notes:** {ANY_OBSERVATIONS}
```

---

#### Test 1.2-1.10: Repeat pattern above for each CSV file

**File paths:**
- Test 1.2: `02-column-variations.csv`
- Test 1.3: `03-minimal-required.csv`
- Test 1.4: `04-mixed-dates.csv`
- Test 1.5: `05-special-chars.csv`
- Test 1.6: `06-duplicates.csv`
- Test 1.7: `07-invalid-data.csv` (expect FAILURE with validation errors)
- Test 1.8: `08-extra-columns.csv`
- Test 1.9: `09-mixed-case.csv`
- Test 1.10: `10-missing-required.csv` (expect FAILURE)

**SQL verification template:**
```sql
SELECT first_name, last_name, date_of_birth::text, email, created_at
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND created_at > '{TIMESTAMP_BEFORE_TEST}'
ORDER BY created_at DESC
LIMIT 10;
```

---

### Phase 2: Manual Dancer Management (Category 2)
**Duration:** ~10 minutes
**Tests:** 2.1 through 2.5

#### Test 2.1: Add Single Dancer

**Step 1:** Navigate to dancers list
```
browser_navigate("https://empwr.compsync.net/dashboard/dancers")
browser_snapshot()
```

**Step 2:** Click "Add Dancer"
```
browser_click(element: "Add Dancer button", ref: "{REF}")
browser_wait_for(text: "First Name")  # Wait for form
```

**Step 3:** Fill form
```
browser_type(element: "First Name input", ref: "{REF}", text: "Test")
browser_type(element: "Last Name input", ref: "{REF}", text: "Dancer")
browser_type(element: "Date of Birth input", ref: "{REF}", text: "01/15/2012")
browser_select_option(element: "Gender dropdown", ref: "{REF}", values: ["Female"])
browser_type(element: "Email input", ref: "{REF}", text: "test.dancer@example.com")
```

**Step 4:** Submit
```
browser_click(element: "Save button", ref: "{REF}")
browser_wait_for(time: 2)
browser_snapshot()  # Capture success message
```

**Step 5:** Verify in database
```sql
SELECT id, first_name, last_name, date_of_birth::text, email, created_at
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND first_name = 'Test' AND last_name = 'Dancer';
```

**Expected:** 1 row, DOB = '2012-01-15'

---

#### Test 2.2: Duplicate Detection

**Steps:**
1. Try to add "Emma Johnson" with DOB "05/15/2010" (matches Test 1.1)
2. Expect validation error
3. Screenshot error message
4. Verify no duplicate created in database

---

#### Test 2.3: Edit Dancer

**Steps:**
1. Search for "Test Dancer"
2. Click edit button
3. Change email to "updated@example.com"
4. Save
5. Verify update in database:
```sql
SELECT email FROM dancers
WHERE first_name = 'Test' AND last_name = 'Dancer'
  AND studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';
```

---

#### Test 2.4: Delete Dancer

**Steps:**
1. Find "Test Dancer"
2. Click delete
3. Confirm deletion
4. Verify soft delete:
```sql
SELECT status, deleted_at
FROM dancers
WHERE first_name = 'Test' AND last_name = 'Dancer'
  AND studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';
```
**Expected:** status = 'cancelled' OR deleted_at IS NOT NULL

---

#### Test 2.5: Search and Filter

**Steps:**
1. Use search box: Enter "Emma"
2. Screenshot filtered results
3. Apply gender filter: Female
4. Apply age group filter: Petite
5. Verify UI shows correct filtered results

---

### Phase 3: Reservation Flow (Category 3)
**Duration:** ~15 minutes
**Tests:** 3.1 through 3.8

⚠️ **NOTE:** Some tests require Competition Director (CD) access.
For SD-only testing, document which tests are blocked.

#### Test 3.1: Submit Reservation Request

**Prerequisites:** Find event with open registration

**Step 1:** Find active event
```sql
-- Via Supabase MCP
SELECT id, name, capacity_entries, remaining_capacity, status
FROM events
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'registration_open'
  AND remaining_capacity >= 10
ORDER BY start_at ASC
LIMIT 1;
```

**Step 2:** Navigate to event page
```
browser_navigate("https://empwr.compsync.net/dashboard/events/{EVENT_ID}")
browser_snapshot()
```

**Step 3:** Request reservation
```
browser_click(element: "Request Reservation button", ref: "{REF}")
browser_wait_for(text: "Entries Requested")
browser_type(element: "Entries input", ref: "{REF}", text: "10")
browser_click(element: "Submit button", ref: "{REF}")
browser_wait_for(time: 2)
browser_snapshot()
```

**Step 4:** Verify in database
```sql
SELECT id, entries_requested, status, submitted_at
FROM reservations
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND created_at > '{TEST_START_TIME}'
ORDER BY submitted_at DESC
LIMIT 1;
```

**Expected:**
- status = 'pending'
- entries_requested = 10

---

#### Test 3.2: Request More Than Available Capacity

**Prerequisites:** Event with low capacity (or manually set via SQL for testing)

**Step 1:** Check event capacity
```sql
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
-- If > 10, temporarily reduce for test:
UPDATE events SET remaining_capacity = 5 WHERE id = '{EVENT_ID}';
```

**Step 2:** Try to request 10 entries
```
browser_click(element: "Request Reservation", ref: "{REF}")
browser_type(element: "Entries input", ref: "{REF}", text: "10")
browser_click(element: "Submit", ref: "{REF}")
browser_wait_for(time: 1)
browser_snapshot()  # Should show error
```

**Expected:**
- ❌ Error message: "Only 5 entries available" or similar
- No reservation created in database

**Step 3:** Restore capacity (if modified)
```sql
UPDATE events SET remaining_capacity = {ORIGINAL_VALUE} WHERE id = '{EVENT_ID}';
```

---

#### Test 3.3: Multiple Reservations for Same Event

**Steps:**
1. Submit first reservation for Event A (10 entries)
2. Wait for success confirmation
3. Navigate back to events list
4. Submit second reservation for SAME Event A (5 entries)
5. Verify both created:
```sql
SELECT id, entries_requested, status, submitted_at
FROM reservations
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND event_id = '{EVENT_ID}'
ORDER BY submitted_at DESC;
```

**Expected:** 2 rows, both with unique IDs

---

#### Test 3.4-3.6: CD Actions (Approval/Rejection)

⚠️ **REQUIRES CD ACCESS** - Either:
1. Switch to CD user (empwrdance@gmail.com)
2. OR document as "BLOCKED - Requires CD access"
3. OR simulate via direct SQL (for testing only):

```sql
-- TESTING ONLY: Simulate CD approval
UPDATE reservations
SET status = 'approved',
    entries_approved = 10,
    reviewed_at = NOW(),
    reviewed_by_user_id = 'd72df930-c114-4de1-9f9d-06aa7d28b2ce'
WHERE id = '{RESERVATION_ID}';

-- Deduct capacity
UPDATE events
SET remaining_capacity = remaining_capacity - 10
WHERE id = '{EVENT_ID}';
```

If testing via CD UI:
```
browser_navigate("https://empwr.compsync.net/dashboard/admin/reservations")
# Find pending reservation
# Click "Approve" button
# Follow UI flow
```

---

### Phase 4: Entry Creation (Category 4)
**Duration:** ~20 minutes
**Tests:** 4.1 through 4.10

⚠️ **Prerequisites:** At least one APPROVED reservation with quota available

#### Test 4.1: Create Solo Entry (3-Step)

**Step 1:** Navigate to entries for approved reservation
```
browser_navigate("https://empwr.compsync.net/dashboard/reservations/{RESERVATION_ID}/entries")
browser_snapshot()
```

**Step 2:** Start entry creation
```
browser_click(element: "Create Entry button", ref: "{REF}")
browser_wait_for(text: "Routine Name")
```

**Step 3a:** Fill basic details
```
browser_type(element: "Routine Name", ref: "{REF}", text: "Swan Lake")
browser_type(element: "Choreographer", ref: "{REF}", text: "Jane Doe")
browser_select_option(element: "Category", ref: "{REF}", values: ["Performance"])
browser_select_option(element: "Level", ref: "{REF}", values: ["Competitive"])
browser_select_option(element: "Style", ref: "{REF}", values: ["Ballet"])
browser_click(element: "Title Upgrade checkbox", ref: "{REF}")  # Check it
browser_click(element: "Next button", ref: "{REF}")
```

**Step 3b:** Add dancers
```
browser_wait_for(text: "Select Dancers")
browser_click(element: "Emma Johnson checkbox", ref: "{REF}")  # Select 1 dancer only
browser_click(element: "Next button", ref: "{REF}")
```

**Step 3c:** Review and create
```
browser_wait_for(text: "Review")
browser_snapshot()  # Capture calculated fields (Age Division, Group Size)
browser_click(element: "Create Entry button", ref: "{REF}")
browser_wait_for(time: 2)
browser_snapshot()  # Capture success
```

**Step 4:** Verify in database
```sql
-- Check entry
SELECT e.id, e.routine_name, e.group_size_category, e.title_upgrade,
       e.age_division_id, e.status, e.category_id, e.level_id, e.style_id
FROM entries e
WHERE e.routine_name = 'Swan Lake'
  AND e.reservation_id = '{RESERVATION_ID}';

-- Check linked dancers
SELECT ed.dancer_id, d.first_name, d.last_name
FROM entry_dancers ed
JOIN dancers d ON ed.dancer_id = d.id
WHERE ed.entry_id = '{ENTRY_ID}';
```

**Expected:**
- Entry: group_size_category = 'solo', title_upgrade = true, status = 'draft'
- Entry Dancers: 1 row (Emma Johnson)
- Age division calculated correctly based on Emma's DOB

---

#### Test 4.2-4.10: Follow similar patterns

**Test 4.2:** Create duo (select 2 dancers, verify title_upgrade disabled)
**Test 4.3:** Create large group (10+ dancers)
**Test 4.4:** Try to exceed quota (create N+1 entries when approved for N)
**Test 4.5:** Verify title upgrade only for solo
**Test 4.6:** Edit draft entry
**Test 4.7:** Verify editing restrictions after summary submitted
**Test 4.8:** Delete draft entry
**Test 4.9:** Verify deletion restrictions after invoice
**Test 4.10:** Age division auto-calculation (create entries with different age dancers, verify)

---

### Phase 5: Summary & Invoice (Category 5)
**Duration:** ~15 minutes
**Tests:** 5.1 through 5.7

#### Test 5.1: Submit Summary (All Entries Used)

**Prerequisites:** Reservation with 5 approved entries, 5 entries created

**Step 1:** Navigate to summary page
```
browser_navigate("https://empwr.compsync.net/dashboard/reservations/{RESERVATION_ID}/summary")
browser_snapshot()  # Should show list of 5 entries
```

**Step 2:** Submit summary
```
browser_click(element: "Submit Summary button", ref: "{REF}")
browser_wait_for(text: "Confirm")  # Wait for confirmation dialog
browser_click(element: "Confirm button", ref: "{REF}")
browser_wait_for(time: 2)
browser_snapshot()  # Capture success message
```

**Step 3:** Verify in database
```sql
-- Check summary created
SELECT id, entries_used, entries_unused, submitted_at
FROM summaries
WHERE reservation_id = '{RESERVATION_ID}';

-- Check reservation status
SELECT status FROM reservations WHERE id = '{RESERVATION_ID}';

-- Check entries status
SELECT id, status FROM entries WHERE reservation_id = '{RESERVATION_ID}';

-- Check capacity (should NOT increase since all entries used)
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
```

**Expected:**
- Summary: entries_used = 5, entries_unused = 0
- Reservation: status = 'summarized'
- Entries: all status = 'submitted'
- Capacity: unchanged (0 refund)

---

#### Test 5.2: Submit Summary (Partial Entries)

**Prerequisites:** Approved for 10 entries, only 7 created

**Steps:** Same as 5.1

**Verification:**
```sql
SELECT entries_used, entries_unused FROM summaries WHERE reservation_id = '{RESERVATION_ID}';
-- Expected: entries_used = 7, entries_unused = 3

SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
-- Expected: Increased by 3
```

---

#### Test 5.3-5.7: CD Invoice Actions

⚠️ **REQUIRES CD ACCESS**

**Test 5.3:** Try to submit summary twice (should fail)
**Test 5.4:** Try to submit with 0 entries (should fail)
**Test 5.5:** CD creates invoice (no discounts/credits)
**Test 5.6:** CD creates invoice with 10% discount + $200 credit
**Test 5.7:** CD marks invoice paid

---

### Phase 6: Edge Cases & Business Logic Validation (Category 6)
**Duration:** ~25 minutes (expanded)
**Tests:** 6.1 through 6.15 (NEW)
**Business Logic Ref:** Phase 1 spec lines 943-972 (Edge Cases)

#### Test 6.1: Capacity Race Condition
**Business Logic Ref:** Phase 1 spec lines 951-954 (Capacity Race Condition)

**Setup:** Manually set event capacity to 1 via SQL
```sql
UPDATE events
SET remaining_capacity = 1
WHERE id = '{EVENT_ID}';
```

**Steps:**
1. Open TWO browser sessions (or tabs)
2. Both sessions: Studio A and Studio B (or same studio, two reservations)
3. Both request 1 entry simultaneously
4. Attempt CD approval for both

**Database Verification:**
```sql
-- Check that only ONE approval succeeded
SELECT id, status, entries_approved FROM reservations
WHERE event_id = '{EVENT_ID}'
  AND submitted_at > '{TEST_START}'
ORDER BY reviewed_at;

-- Verify capacity never went negative
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
-- Should be 0, NOT negative

-- Check audit trail
SELECT * FROM activity_logs
WHERE action LIKE '%reservation%'
  AND created_at > '{TEST_START}'
ORDER BY created_at;
```

**Expected:**
- ✅ First approval succeeds
- ❌ Second approval fails with "Insufficient capacity"
- ✅ Capacity = 0 (never negative)
- ✅ Database transaction prevented race condition

---

#### Test 6.2: Negative Invoice Total Validation
**Business Logic Ref:** Phase 1 spec lines 956-958 (Negative Invoice Total)

**Setup:** Create summary with 1 entry (subtotal = $50)

**Steps:**
1. As CD, navigate to invoice creation
2. Try to apply:
   - Discount: 15% ($7.50)
   - Credit: $200.00 "Overpayment from last year"
3. Attempt to create invoice

**Expected:**
- ❌ Validation error: "Credits ($200) and discount ($7.50) exceed subtotal ($50)"
- ❌ Cannot submit form
- ✅ Real-time warning as credits/discount are entered
- ✅ No invoice created in database

**Database Verification:**
```sql
SELECT COUNT(*) FROM invoices
WHERE reservation_id = '{RESERVATION_ID}';
-- Should be 0
```

---

#### Test 6.3: Entry Deletion After Summary
**Business Logic Ref:** Phase 1 spec lines 945-948 (Entry Deletion After Summary)

**Setup:** Reservation with submitted summary

**Steps:**
1. Navigate to entries list for summarized reservation
2. Try to delete an entry (self-serve)

**Expected:**
- ⚠️ Warning message: "Requires CD approval to delete entry after summary"
- ❌ Self-serve delete blocked
- ✅ "Request Deletion" button appears (sends request to CD)

**Business Logic Validation:**
```sql
-- If deletion somehow occurred:
SELECT deleted_at, status FROM entries WHERE id = '{ENTRY_ID}';

-- Check if capacity refunded
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
-- Should increase by 1 if deletion approved

-- Check invoice NOT auto-adjusted
SELECT total FROM invoices WHERE reservation_id = '{RESERVATION_ID}';
-- Should remain unchanged (manual CD adjustment required)
```

---

#### Test 6.4: Multi-Tenant Isolation (CRITICAL)
**Business Logic Ref:** Phase 1 spec lines 909-939 (Access Control)

**Comprehensive Tenant Isolation Checks:**
```sql
-- Via Supabase MCP

-- 1. Check for cross-tenant reservation leaks
SELECT COUNT(*) as leaks
FROM reservations r
JOIN events e ON r.event_id = e.id
WHERE r.tenant_id != e.tenant_id;
-- Expected: 0

-- 2. Check for cross-tenant entry leaks
SELECT COUNT(*) as leaks
FROM entries en
JOIN reservations r ON en.reservation_id = r.id
WHERE en.event_id IN (
  SELECT id FROM events WHERE tenant_id != r.tenant_id
);
-- Expected: 0

-- 3. Check for cross-tenant dancer leaks
SELECT COUNT(*) as leaks
FROM dancers d
JOIN studios s ON d.studio_id = s.id
WHERE d.tenant_id != s.tenant_id;
-- Expected: 0

-- 4. Check for cross-studio dancer access (within same tenant)
SELECT COUNT(*) as leaks
FROM entry_dancers ed
JOIN entries e ON ed.entry_id = e.id
JOIN dancers d ON ed.dancer_id = d.id
JOIN reservations r ON e.reservation_id = r.id
WHERE d.studio_id != r.studio_id;
-- Expected: 0 (dancers can only be used by their own studio)

-- 5. Verify RLS policies enforced
-- Test by switching to different tenant context
SET app.current_tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';
SELECT COUNT(*) FROM dancers WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';
-- Expected: 0 (RLS should block access)
```

**UI Verification:**
1. Login as EMPWR studio (djamusic@gmail.com)
2. Note visible dancers count
3. Login as Glow studio (different account)
4. Verify EMPWR dancers NOT visible
5. Create test dancer in Glow
6. Switch back to EMPWR
7. Verify Glow dancer NOT visible

---

#### Test 6.5: Phase 2 Access Gating
**Business Logic Ref:** Phase 1 spec lines 964-967 (Phase 2 Access with Unpaid Invoice)

**Setup:** Paid invoice but event.planning_phase_start is in future

**Validation:**
```sql
SELECT
  e.id,
  e.name,
  e.planning_phase_start,
  e.planning_phase_start > NOW() as phase2_locked,
  i.status as invoice_status
FROM events e
JOIN reservations r ON r.event_id = e.id
JOIN invoices i ON i.reservation_id = r.id
WHERE r.id = '{RESERVATION_ID}';
```

**Steps:**
1. Navigate to Phase 2 features (if accessible)
2. Expect gate message: "Phase 2 opens on {DATE}"

**Expected:**
- ❌ Phase 2 features locked
- ⚠️ Clear messaging about when access unlocks
- ✅ Calendar date + payment both required

---

#### Test 6.6: Zero-Entry Summary Validation (NEW)
**Business Logic Ref:** Phase 1 spec lines 959-961 (Zero-Entry Summary)

**Setup:** Approved reservation with 0 entries created

**Steps:**
1. Navigate to summary page
2. Try to submit summary

**Expected:**
- ❌ Submit button disabled
- ⚠️ Error message: "Must create at least 1 entry before submitting summary"
- ✅ Validation blocks submission

---

#### Test 6.7: Entry Quota Enforcement (NEW)
**Business Logic Ref:** Phase 1 spec lines 507-526 (Entry Quota Validation)

**Setup:** Reservation approved for N entries

**Steps:**
1. Create N entries successfully
2. Try to create N+1 entry

**Expected:**
- ❌ "Create Entry" button disabled
- ⚠️ Message: "Entry limit reached: N of N used"
- ✅ Database constraint prevents over-quota creation

**Database Verification:**
```sql
SELECT
  r.id,
  r.entries_approved,
  COUNT(e.id) FILTER (WHERE e.deleted_at IS NULL) as active_entries,
  r.entries_approved - COUNT(e.id) FILTER (WHERE e.deleted_at IS NULL) as quota_remaining
FROM reservations r
LEFT JOIN entries e ON e.reservation_id = r.id
WHERE r.id = '{RESERVATION_ID}'
GROUP BY r.id, r.entries_approved;
```

---

#### Test 6.8: Title Upgrade Solo-Only Constraint (NEW)
**Business Logic Ref:** Phase 1 spec lines 223-225 (Title Upgrade Solo Only)

**Steps:**
1. Create duo entry (2 dancers)
2. Try to enable "Title Upgrade" checkbox

**Expected:**
- ❌ Checkbox disabled for duo/trio/small/large
- ⚠️ Tooltip: "Title upgrade only available for solo entries"
- ✅ Database constraint prevents invalid combinations

**Database Verification:**
```sql
-- Check for invalid title upgrades
SELECT id, routine_name, group_size_category, title_upgrade
FROM entries
WHERE title_upgrade = true AND group_size_category != 'solo';
-- Expected: 0 rows
```

---

#### Test 6.9: Age Division Calculation Accuracy (NEW)
**Business Logic Ref:** Phase 1 spec lines 547-585 (Age Division Auto-Calculate)

**Test Matrix:**
| Dancer DOB | Event Date | Age at Event | Expected Division |
|-----------|------------|--------------|-------------------|
| 2010-05-15 | 2026-06-15 | 16 years 1 month | Teen (15-17) |
| 2008-06-16 | 2026-06-15 | 17 years 11 months | Teen (15-17) |
| 2008-06-14 | 2026-06-15 | 18 years 0 days | Senior (18+) |
| 2011-06-16 | 2026-06-15 | 14 years 11 months | Junior (12-14) |

**Steps:**
1. Create solo entries with dancers above
2. Verify age division calculated correctly

**Database Verification:**
```sql
SELECT
  d.first_name,
  d.last_name,
  d.date_of_birth,
  e.age_division_id,
  AGE('{EVENT_START_DATE}'::date, d.date_of_birth) as age_at_event
FROM entries e
JOIN entry_dancers ed ON e.id = ed.entry_id
JOIN dancers d ON ed.dancer_id = d.id
WHERE e.id IN ('{ENTRY_IDS}');
```

**Expected:**
- ✅ Age calculated based on youngest dancer in group
- ✅ Division boundaries respected (no off-by-one errors)
- ✅ Leap year dates handled correctly

---

#### Test 6.10: Capacity Refund on Summary (CRITICAL)
**Business Logic Ref:** Phase 1 spec lines 589-651, line 632-635 (Immediate Capacity Refund)

**Setup:** Reservation approved for 10 entries, only 7 created

**Before Summary:**
```sql
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
-- Note: {CAPACITY_BEFORE}
```

**Steps:**
1. Submit summary with 7 entries used, 3 unused
2. Immediately check capacity

**After Summary:**
```sql
SELECT remaining_capacity FROM events WHERE id = '{EVENT_ID}';
-- Expected: {CAPACITY_BEFORE} + 3

-- Verify summary record
SELECT entries_used, entries_unused, submitted_at FROM summaries
WHERE reservation_id = '{RESERVATION_ID}';
-- Expected: entries_used=7, entries_unused=3
```

**Expected:**
- ✅ Capacity refunded IMMEDIATELY (not after invoice)
- ✅ Refund amount = entries_unused
- ✅ Transaction atomic (refund + summary creation)

---

#### Test 6.11: Duplicate Reservation (Same Studio, Same Event) (NEW)
**Business Logic Ref:** Phase 1 spec line 200 (Multiple Reservations Allowed)

**Steps:**
1. Submit reservation for Event A (10 entries)
2. Submit second reservation for Event A (5 entries)

**Expected:**
- ✅ Both reservations created successfully
- ✅ Each has unique ID
- ✅ Both show in studio's reservation list
- ✅ Capacity deducted separately for each

**Database Verification:**
```sql
SELECT id, entries_requested, status, submitted_at
FROM reservations
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND event_id = '{EVENT_ID}'
ORDER BY submitted_at;
-- Expected: 2 rows
```

---

#### Test 6.12: Dancer Required Before Entry Creation (NEW)
**Business Logic Ref:** Phase 1 spec lines 163, 522-525 (Dancers Must Exist)

**Setup:** New studio with 0 dancers

**Steps:**
1. Try to create entry

**Expected:**
- ❌ Blocked with error: "Must add dancers before creating entries"
- ✅ "Add Dancer" button/link provided
- ✅ Import CSV option suggested

---

#### Test 6.13: Invoice Discount Validation (NEW)
**Business Logic Ref:** Phase 1 spec lines 683-685 (Discount Must Be 0, 5, 10, or 15)

**Steps:**
1. As CD, try to create invoice with 20% discount
2. Try negative discount (-5%)
3. Try decimal discount (10.5%)

**Expected:**
- ❌ Validation error: "Discount must be 0, 5, 10, or 15 percent"
- ✅ Dropdown only allows valid values
- ✅ No manual input allowed

---

#### Test 6.14: Credit Label Minimum Length (NEW)
**Business Logic Ref:** Phase 1 spec lines 690-692 (Credit Label ≥ 5 Characters)

**Steps:**
1. Try to add credit with label "Dep" (3 chars)
2. Try blank label

**Expected:**
- ❌ Validation error: "Credit label must be at least 5 characters"
- ✅ Form validation before submission

---

#### Test 6.15: Soft Delete Verification (NEW)
**Business Logic Ref:** CLAUDE.md Pre-Launch Protocols #5 (Soft Delete ONLY)

**Test soft delete for:**
- Dancer deletion
- Entry deletion
- Reservation cancellation

**Database Checks:**
```sql
-- Verify deleted_at timestamp set, NOT hard deleted
SELECT id, first_name, last_name, deleted_at, status
FROM dancers
WHERE id = '{DELETED_DANCER_ID}';
-- Expected: deleted_at IS NOT NULL OR status = 'cancelled'

-- Verify row still exists (not removed from table)
SELECT COUNT(*) FROM dancers WHERE id = '{DELETED_DANCER_ID}';
-- Expected: 1

-- Verify excluded from active queries
SELECT COUNT(*) FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
  AND deleted_at IS NULL;
-- Expected: Count excludes soft-deleted dancer
```

---

## Post-Execution

### 1. Retrieve and Analyze Vercel Logs

**After test execution:**
```
# Via Vercel MCP or dashboard
vercel logs --since {TEST_START_TIMESTAMP}

# Filter for errors
vercel logs --since {TEST_START_TIMESTAMP} | grep -i "error"

# Filter for specific functions
vercel logs --since {TEST_START_TIMESTAMP} | grep "dancer.batchCreate"
```

**Log Analysis Checklist:**
- ✅ Check for unhandled exceptions
- ✅ Verify tRPC mutations logged correctly
- ✅ Look for database connection issues
- ✅ Check for timeout errors
- ✅ Verify no 500 errors during test period

### 2. Generate MVP Launch Report

Compile all test results into production-ready report:

```markdown
# MVP Launch Test Report - CompPortal Phase 1
**Date:** {DATE}
**Test Duration:** {TOTAL_MINUTES} minutes
**Environment:** Production (empwr.compsync.net)
**Tester:** Claude Code (Playwright MCP + Supabase MCP)
**Business Logic Reference:** docs/specs/PHASE1_SPEC.md

---

## 🚨 Launch Readiness Decision

**Status:** [✅ READY FOR LAUNCH / ⚠️ CONDITIONAL LAUNCH / ❌ NOT READY]

### Launch Blockers Status
- [✅/❌] Zero P0 bugs discovered: {STATUS}
- [✅/❌] Core flows work end-to-end: {STATUS}
- [✅/❌] Multi-tenant isolation verified: {STATUS}
- [✅/❌] Data persistence confirmed: {STATUS}
- [✅/❌] No console errors on critical paths: {STATUS}
- [✅/❌] Capacity management accurate: {STATUS}
- [✅/❌] Payment flow works: {STATUS}

**Decision Rationale:**
{DETAILED EXPLANATION OF LAUNCH DECISION}

---

## Executive Summary

- **Total Test Cases:** 60+ (Phase 0-6)
- **Tests Executed:** XX
- **Passed:** XX (XX%)
- **Failed:** XX (XX%)
- **Blocked:** XX (XX% - CD access required)
- **Console Errors Found:** XX
- **P0 Bugs Discovered:** XX
- **P1 Bugs Discovered:** XX
- **P2 Bugs Discovered:** XX

**Quality Gates Met:**
- ✅ CSV Import: X/10 (XX%) - Target: >80%
- ✅ Reservation Flow: X/8 (XX%) - Target: >80%
- ✅ Entry Creation: X/10 (XX%) - Target: >80%
- ✅ UI/UX: X/7 pages load correctly - Target: 100%
- ✅ Data Persistence: X/X verified - Target: 100%

---

## Phase 0: Page Inspection Results

| Page | Load Time | Console Errors | UI Issues | Data Persistence | Status |
|------|-----------|----------------|-----------|------------------|--------|
| Dashboard | X.Xs | X | {NONE/ISSUES} | ✅ | [✅ PASS/❌ FAIL] |
| Dancers List | X.Xs | X | {NONE/ISSUES} | ✅ | [✅ PASS/❌ FAIL] |
| Dancer Import | X.Xs | X | {NONE/ISSUES} | ✅ | [✅ PASS/❌ FAIL] |
| Events/Reservations | X.Xs | X | {NONE/ISSUES} | ✅ | [✅ PASS/❌ FAIL] |
| Entries | X.Xs | X | {NONE/ISSUES} | ✅ | [✅ PASS/❌ FAIL] |
| Summary | X.Xs | X | {NONE/ISSUES} | ✅ | [✅ PASS/❌ FAIL] |
| Settings | X.Xs | X | {NONE/ISSUES} | ✅ | [✅ PASS/❌ FAIL] |

**Phase 0 Pass Rate:** X/7 (XX%)
**Critical UI Issues:** {NONE or LIST}
**Total Console Errors:** {COUNT}

---

## Phase 1: CSV Import Results

| Test | File | Expected | Actual | Dates | Console | Status | Notes |
|------|------|----------|--------|-------|---------|--------|-------|
| 1.1 | 01-perfect-match.csv | 5 | X | [✅/❌] | X | [✅/❌] | {NOTES} |
| 1.2 | 02-column-variations.csv | 5 | X | [✅/❌] | X | [✅/❌] | {NOTES} |
| 1.3 | 03-minimal-required.csv | 5 | X | N/A | X | [✅/❌] | {NOTES} |
| 1.4 | 04-mixed-dates.csv | 10 | X | [✅/❌] | X | [✅/❌] | {NOTES} |
| 1.5 | 05-special-chars.csv | 5 | X | [✅/❌] | X | [✅/❌] | {NOTES} |
| 1.6 | 06-duplicates.csv | X | X | [✅/❌] | X | [✅/❌] | {NOTES} |
| 1.7 | 07-invalid-data.csv | 0 (reject) | X | N/A | X | [✅/❌] | {NOTES} |
| 1.8 | 08-extra-columns.csv | 5 | X | [✅/❌] | X | [✅/❌] | {NOTES} |
| 1.9 | 09-mixed-case.csv | 5 | X | [✅/❌] | X | [✅/❌] | {NOTES} |
| 1.10 | 10-missing-required.csv | 0 (reject) | X | N/A | X | [✅/❌] | {NOTES} |

**Pass Rate:** X/10 (XX%)
**Known Bugs Confirmed:**
- [✅/❌] Bug #1: Date timezone offset (Phase 1 spec 575)
- [✅/❌] Bug #2: 4/5 success rate (Phase 1 spec 97-108)
- [✅/❌] Bug #3: Vague error messages (Phase 1 spec 583-588)

---

## Phase 2: Dancer Management Results

| Test | Description | Data Persistence | Status | Notes |
|------|-------------|------------------|--------|-------|
| 2.1 | Add single dancer | [✅/❌] | [✅/❌] | {NOTES} |
| 2.2 | Duplicate detection | [✅/❌] | [✅/❌] | {NOTES} |
| 2.3 | Edit dancer | [✅/❌] | [✅/❌] | {NOTES} |
| 2.4 | Delete dancer (soft) | [✅/❌] | [✅/❌] | {NOTES} |
| 2.5 | Search and filter | N/A | [✅/❌] | {NOTES} |

**Pass Rate:** X/5 (XX%)

---

## Phase 3: Reservation Flow Results

| Test | Description | Capacity Check | Data Persistence | Status | Notes |
|------|-------------|----------------|------------------|--------|-------|
| 3.1 | Submit reservation | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 3.2 | Exceed capacity | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 3.3 | Multiple reservations | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 3.4-3.6 | CD approval/reject | [✅/❌/BLOCKED] | [✅/❌] | [✅/❌/BLOCKED] | {NOTES} |
| 3.7 | Cannot create before approval | [✅/❌] | N/A | [✅/❌] | {NOTES} |
| 3.8 | View reservation status | N/A | N/A | [✅/❌] | {NOTES} |

**Pass Rate:** X/8 (XX%)
**Business Logic Validation:** (Phase 1 spec 398-499)
- [✅/❌] Capacity deducted on approval (not submission)
- [✅/❌] Multiple reservations allowed per studio/event
- [✅/❌] Rejection reason ≥ 20 characters

---

## Phase 4: Entry Creation Results

| Test | Description | Age Division | Quota Check | Data Persistence | Status | Notes |
|------|-------------|--------------|-------------|------------------|--------|-------|
| 4.1 | Create solo entry | [✅/❌] | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 4.2 | Create duo entry | [✅/❌] | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 4.3 | Create large group | [✅/❌] | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 4.4 | Exceed quota | [✅/❌] | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 4.5 | Title upgrade solo-only | [✅/❌] | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 4.6 | Edit draft entry | N/A | N/A | [✅/❌] | [✅/❌] | {NOTES} |
| 4.7 | Edit restrictions (submitted) | N/A | N/A | [✅/❌] | [✅/❌] | {NOTES} |
| 4.8 | Delete draft entry | N/A | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 4.9 | Delete restrictions (invoiced) | N/A | N/A | [✅/❌] | [✅/❌] | {NOTES} |
| 4.10 | Age division accuracy | [✅/❌] | N/A | N/A | [✅/❌] | {NOTES} |

**Pass Rate:** X/10 (XX%)
**Business Logic Validation:** (Phase 1 spec 503-585)
- [✅/❌] Age division based on youngest dancer
- [✅/❌] Group size auto-calculated
- [✅/❌] Quota enforcement works
- [✅/❌] Edit permissions respect status

---

## Phase 5: Summary & Invoice Results

| Test | Description | Capacity Refund | Data Persistence | Status | Notes |
|------|-------------|-----------------|------------------|--------|-------|
| 5.1 | Submit summary (all used) | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 5.2 | Submit summary (partial) | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 5.3 | Submit summary twice | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 5.4 | Submit with 0 entries | [✅/❌] | [✅/❌] | [✅/❌] | {NOTES} |
| 5.5-5.7 | Invoice creation/payment | [BLOCKED/✅/❌] | [✅/❌] | [BLOCKED/✅/❌] | {NOTES} |

**Pass Rate:** X/7 (XX%)
**Business Logic Validation:** (Phase 1 spec 589-821)
- [✅/❌] Capacity refunded IMMEDIATELY on summary
- [✅/❌] Invoice calculation accurate (base + upgrades + tax)
- [✅/❌] Discount validation (0, 5, 10, 15 only)

---

## Phase 6: Edge Cases & Business Logic Results

| Test | Description | Business Logic Ref | Status | Notes |
|------|-------------|-------------------|--------|-------|
| 6.1 | Capacity race condition | Spec 951-954 | [✅/❌] | {NOTES} |
| 6.2 | Negative invoice total | Spec 956-958 | [✅/❌] | {NOTES} |
| 6.3 | Entry deletion after summary | Spec 945-948 | [✅/❌] | {NOTES} |
| 6.4 | Multi-tenant isolation | Spec 909-939 | [✅/❌] | {NOTES} |
| 6.5 | Phase 2 access gating | Spec 964-967 | [✅/❌] | {NOTES} |
| 6.6 | Zero-entry summary | Spec 959-961 | [✅/❌] | {NOTES} |
| 6.7 | Entry quota enforcement | Spec 507-526 | [✅/❌] | {NOTES} |
| 6.8 | Title upgrade solo-only | Spec 223-225 | [✅/❌] | {NOTES} |
| 6.9 | Age division accuracy | Spec 547-585 | [✅/❌] | {NOTES} |
| 6.10 | Capacity refund immediate | Spec 632-635 | [✅/❌] | {NOTES} |
| 6.11 | Duplicate reservations | Spec 200 | [✅/❌] | {NOTES} |
| 6.12 | Dancer required | Spec 163, 522-525 | [✅/❌] | {NOTES} |
| 6.13 | Invoice discount validation | Spec 683-685 | [✅/❌] | {NOTES} |
| 6.14 | Credit label minimum | Spec 690-692 | [✅/❌] | {NOTES} |
| 6.15 | Soft delete verification | CLAUDE.md Pre-Launch #5 | [✅/❌] | {NOTES} |

**Pass Rate:** X/15 (XX%)

---

## Console Errors Summary

**Total Errors Found:** {COUNT}

### By Severity:
- **Critical (Blocking):** {COUNT}
- **Errors:** {COUNT}
- **Warnings:** {COUNT}

### By Page:
| Page | Errors | Warnings | Details |
|------|--------|----------|---------|
| {PAGE} | X | X | {DETAILS} |

**Vercel Logs Analysis:**
- **Exceptions Logged:** {COUNT}
- **tRPC Errors:** {COUNT}
- **Database Errors:** {COUNT}
- **Timeout Errors:** {COUNT}

---

## Data Persistence Verification

**Database Integrity Checks:**
- [✅/❌] All created records have tenant_id
- [✅/❌] All created records have studio_id (where applicable)
- [✅/❌] No cross-tenant data leaks (0 violations found)
- [✅/❌] No cross-studio dancer usage (0 violations found)
- [✅/❌] Soft deletes used (no hard deletes)
- [✅/❌] Timestamps accurate (created_at, updated_at)
- [✅/❌] Foreign key integrity maintained

**Database State Changes:**
- **Dancers Added:** +XX rows
- **Reservations Created:** +XX rows
- **Entries Created:** +XX rows
- **Summaries Submitted:** +XX rows
- **Invoices Generated:** +XX rows

---

## Known Issues Status

### P0 Issues (Launch Blockers)
1. **Bug #2: CSV Import Race Condition**
   - **Status:** [CONFIRMED/FIXED/NOT REPRODUCED]
   - **Impact:** {DESCRIPTION}
   - **Recommendation:** {FIX/LAUNCH WITH WORKAROUND/DOCUMENT}

### P1 Issues (Must Fix Before Wide Rollout)
1. **Bug #1: Date Timezone Offset**
   - **Status:** [CONFIRMED/FIXED/NOT REPRODUCED]
   - **Impact:** {DESCRIPTION}
   - **Recommendation:** {FIX/LAUNCH WITH WORKAROUND/DOCUMENT}

### P2 Issues (Can Launch With)
1. **Bug #3: Vague Error Messages**
   - **Status:** [CONFIRMED/FIXED/NOT REPRODUCED]
   - **Impact:** {DESCRIPTION}
   - **Recommendation:** {FIX/DOCUMENT/DEFER}

---

## New Issues Discovered

[List any unexpected issues found during testing]

| Issue # | Severity | Description | Affected Feature | Reproduction Steps |
|---------|----------|-------------|------------------|-------------------|
| NEW-001 | [P0/P1/P2] | {DESCRIPTION} | {FEATURE} | {STEPS} |

---

## Recommendations

### Immediate Actions (Before Launch)
1. {ACTION WITH PRIORITY}
2. {ACTION WITH PRIORITY}

### Post-Launch Monitoring
1. {MONITORING ITEM}
2. {MONITORING ITEM}

### Future Improvements (Phase 2+)
1. {IMPROVEMENT}
2. {IMPROVEMENT}

---

## Test Evidence

**Screenshots:** {COUNT} captured
**Database Queries:** {COUNT} executed
**Console Logs:** {COUNT} recorded
**Vercel Logs:** Analyzed from {START} to {END}

**Evidence Location:** `test-evidence/{DATE}/`

---

## Sign-Off

**Tested By:** Claude Code (Playwright MCP + Supabase MCP)
**Date:** {DATE}
**Duration:** {HOURS} hours {MINUTES} minutes

**Launch Recommendation:**
- [✅] **APPROVED FOR LAUNCH** - All critical tests passed, known issues documented
- [⚠️] **CONDITIONAL APPROVAL** - Launch with workarounds for known issues
- [❌] **NOT APPROVED** - Critical blockers must be resolved

**Notes:**
{FINAL NOTES AND CAVEATS}

---

**END OF MVP LAUNCH REPORT**
```

### 2. Capture Final Database State

```sql
SELECT
  (SELECT COUNT(*) FROM dancers
   WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as final_dancers,
  (SELECT COUNT(*) FROM reservations
   WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as final_reservations,
  (SELECT COUNT(*) FROM entries
   WHERE reservation_id IN (
     SELECT id FROM reservations WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
   )) as final_entries,
  NOW() as test_end_time;
```

### 3. Clean Up (Optional)

If test was on production:
- Document all test data created
- Mark test reservations as 'cancelled'
- Soft delete test dancers (or leave for future testing)

---

## Tips for Efficient Execution

1. **Batch screenshots:** Take snapshots at key points, not every step
2. **Copy SQL queries:** Keep a scratch file of SQL queries for quick editing
3. **Document blockers immediately:** Don't skip tests, mark as BLOCKED with reason
4. **Use database for verification:** UI can lie, database is source of truth
5. **Track time:** Note start/end time for each category
6. **Take breaks:** 60-90 minutes is long, pause between categories

---

## Troubleshooting

**Issue:** Playwright MCP not responding
**Solution:** Check browser status, restart if needed

**Issue:** Authentication expired
**Solution:** Re-login, continue from last completed test

**Issue:** Database query timeout
**Solution:** Simplify query, add LIMIT clause

**Issue:** Cannot find element by ref
**Solution:** Take new snapshot, get updated ref

**Issue:** Test data missing (CSV files not found)
**Solution:** Verify files exist in `test-data/import-tests/dancers/`

---

---

## 📋 CompPortal-Specific Quick Reference

### tRPC Mutation Names (For Console/Log Checking)

**Actual mutations used in application:**
```
dancer.batchCreate          # CSV import (lines 527-618 in dancer.ts)
dancer.create               # Manual add dancer
dancer.update               # Edit dancer
dancer.delete               # Soft delete dancer

reservation.create          # Submit reservation request
reservation.approve         # CD approval (requires CD role)
reservation.reject          # CD rejection (requires CD role)

entry.create                # Create entry (3-step wizard)
entry.update                # Edit entry
entry.delete                # Delete entry

summary.create              # Submit summary (triggers capacity refund)

invoice.create              # CD creates invoice
invoice.markPaid            # CD marks payment received
```

**Console Error Patterns to Look For:**
```
[TRPCClientError: FORBIDDEN]        # Permission denied
[TRPCClientError: BAD_REQUEST]      # Validation failed
[TRPCClientError: INTERNAL_SERVER_ERROR]  # Server crash
Unique constraint failed            # Duplicate data (Prisma P2002)
Foreign key constraint failed       # Invalid relationship (Prisma P2003)
```

---

### Actual Database Table/Column Names

**Core Tables (Exact Schema):**
```sql
-- Dancers table
dancers (
  id UUID,
  studio_id UUID,         -- FK to studios
  tenant_id UUID,         -- FK to tenants (isolation)
  first_name VARCHAR,
  last_name VARCHAR,
  date_of_birth DATE,     -- ❌ Bug #1 here (timezone conversion)
  email VARCHAR,
  phone VARCHAR,
  gender VARCHAR,
  status VARCHAR,         -- 'active' | 'cancelled'
  deleted_at TIMESTAMP,   -- Soft delete
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Reservations table
reservations (
  id UUID,
  event_id UUID,
  studio_id UUID,
  tenant_id UUID,
  entries_requested INT,
  entries_approved INT,
  status VARCHAR,         -- Phase 1 spec line 187 (state machine)
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by_user_id UUID,
  rejection_reason TEXT
)

-- Entries table
entries (
  id UUID,
  reservation_id UUID,
  event_id UUID,
  routine_name VARCHAR,
  group_size_category VARCHAR,  -- 'solo' | 'duo' | 'trio' | 'small' | 'large'
  title_upgrade BOOLEAN,        -- Only for solo (Phase 1 spec 223-225)
  age_division_id UUID,
  status VARCHAR,               -- 'draft' | 'submitted' | 'invoiced'
  deleted_at TIMESTAMP
)

-- Events table (capacity management)
events (
  id UUID,
  tenant_id UUID,
  capacity_entries INT,          -- Total capacity
  remaining_capacity INT,        -- Live counter (CRITICAL)
  planning_phase_start TIMESTAMP -- Phase 2 gate (spec 964-967)
)
```

---

### Test Environment Constants (Copy-Paste Ready)

**EMPWR Tenant (Primary Test Environment):**
```
Tenant ID:  00000000-0000-0000-0000-000000000001
Tenant Name: EMPWR Dance Experience
Subdomain: empwr.compsync.net
```

**Test Studio (Dan's Dancer):**
```
Studio ID:  de74304a-c0b3-4a5b-85d3-80c4d4c7073a
Studio Name: Dans Dancer
Owner ID:   d72df930-c114-4de1-9f9d-06aa7d28b2ce
```

**Test User (Studio Director):**
```
Email:    djamusic@gmail.com
Password: 123456
Role:     studio_director
```

**Glow Tenant (Secondary - Isolation Testing):**
```
Tenant ID:  4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5
Subdomain: glow.compsync.net
```

---

### Known Bugs - Exact Symptoms

**Bug #1: Date Offset (P1)**
- **File:** `src/server/routers/dancer.ts:575`
- **Code:** `date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined`
- **Symptom:** CSV `05/15/2010` → Database stores `2010-05-14`
- **Test:** All date imports in Tests 1.1, 1.2, 1.4
- **SQL Check:**
  ```sql
  SELECT first_name, date_of_birth::text
  FROM dancers
  WHERE first_name = 'Emma' AND last_name = 'Johnson'
  ORDER BY created_at DESC LIMIT 1;
  -- Expected: 2010-05-15
  -- Actual: 2010-05-14 ❌
  ```

**Bug #2: Race Condition (P0)**
- **File:** `src/components/DancerCSVImport.tsx:97-108`
- **Code:** `onSuccess` fires before error checking
- **Symptom:** Import shows "Success" but only 4/5 dancers imported
- **Test:** Tests 1.1, 1.2 (Sophia Williams, Noah Wilson missing)
- **Console:** NO errors shown (silent failure)
- **SQL Check:**
  ```sql
  SELECT COUNT(*) FROM dancers
  WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a'
    AND created_at > '{IMPORT_TIMESTAMP}'::timestamp;
  -- Expected: 5
  -- Actual: 4 ❌
  ```

**Bug #3: Vague Errors (P2)**
- **File:** `src/server/routers/dancer.ts:583-588`
- **Code:** `r.reason?.message || 'Unknown error'`
- **Symptom:** Error says "Unknown error" instead of "Duplicate email"
- **Test:** Test 1.6 (duplicates)
- **Vercel Log Pattern:**
  ```
  [Prisma] Unique constraint failed on the fields: (`email`)
  [tRPC] Error: Unknown error  # ❌ Lost detail
  ```

---

### Critical Business Logic Gotchas

**1. Capacity Management (NEVER GO NEGATIVE)**
```sql
-- CRITICAL CHECK: Verify capacity never negative
SELECT id, name, remaining_capacity
FROM events
WHERE remaining_capacity < 0;
-- Expected: 0 rows ALWAYS
```
**Why Critical:** Overselling competition slots = business failure

**2. Tenant Isolation (NEVER MIX DATA)**
```sql
-- CRITICAL CHECK: No cross-tenant leaks
SELECT COUNT(*) FROM dancers d
JOIN studios s ON d.studio_id = s.id
WHERE d.tenant_id != s.tenant_id;
-- Expected: 0 rows ALWAYS
```
**Why Critical:** Data leak = legal liability, client loss

**3. Capacity Deducted on APPROVAL not SUBMISSION**
```sql
-- Verify capacity timing (Phase 1 spec 465-467)
-- On reservation.status = 'pending': capacity unchanged
-- On reservation.status = 'approved': capacity -= entries_approved
SELECT r.status, e.remaining_capacity
FROM reservations r
JOIN events e ON r.event_id = e.id
WHERE r.id = '{RESERVATION_ID}';
```
**Why Critical:** Spec line 465 - prevents overbooking

**4. Capacity Refunded IMMEDIATELY on Summary**
```sql
-- Verify immediate refund (Phase 1 spec 632-635)
-- Refund happens IN SAME TRANSACTION as summary creation
SELECT
  s.submitted_at,
  s.entries_unused,
  e.remaining_capacity
FROM summaries s
JOIN reservations r ON s.reservation_id = r.id
JOIN events e ON r.event_id = e.id
WHERE s.id = '{SUMMARY_ID}';
-- Capacity should increase by entries_unused within 1 second
```
**Why Critical:** Spec says "IMMEDIATE" - not after invoice

**5. Age Division = YOUNGEST Dancer**
```sql
-- Verify age calculation (Phase 1 spec 552-561)
SELECT
  e.id,
  MIN(d.date_of_birth) as youngest_dob,
  e.age_division_id
FROM entries e
JOIN entry_dancers ed ON e.id = ed.entry_id
JOIN dancers d ON ed.dancer_id = d.id
WHERE e.id = '{ENTRY_ID}'
GROUP BY e.id, e.age_division_id;
-- Age division MUST be based on youngest_dob
```
**Why Critical:** Wrong age division = disqualification in competition

---

### URL Patterns (Production Ready)

**Studio Director Pages:**
```
https://empwr.compsync.net/dashboard
https://empwr.compsync.net/dashboard/dancers
https://empwr.compsync.net/dashboard/dancers/import
https://empwr.compsync.net/dashboard/events
https://empwr.compsync.net/dashboard/reservations
https://empwr.compsync.net/dashboard/reservations/{ID}/entries
https://empwr.compsync.net/dashboard/reservations/{ID}/summary
https://empwr.compsync.net/dashboard/settings
```

**Competition Director Pages (Requires CD Role):**
```
https://empwr.compsync.net/dashboard/admin/reservations
https://empwr.compsync.net/dashboard/admin/invoices
https://empwr.compsync.net/dashboard/director-panel
```

---

### Prisma Error Codes (From Real Failures)

**Common Errors You'll See:**
```
P2002: Unique constraint failed
  → Duplicate email, duplicate (name + DOB), etc.
  → Test 1.6, 2.2

P2003: Foreign key constraint failed
  → Invalid studio_id, invalid event_id
  → Should not occur in normal testing

P2025: Record not found
  → Trying to update/delete non-existent record
  → Should not occur in normal testing
```

---

### Test Data File Locations (Verified)

**CSV Files:**
```
D:\ClaudeCode\CompPortal\test-data\import-tests\dancers\
  ├── 01-perfect-match.csv       (5 dancers, all fields)
  ├── 02-column-variations.csv   (5 dancers, alt headers)
  ├── 03-minimal-required.csv    (5 dancers, name only)
  ├── 04-mixed-dates.csv         (10 dancers, date formats)
  ├── 05-special-chars.csv       (5 dancers, UTF-8)
  ├── 06-duplicates.csv          (5 dancers, dup detection)
  ├── 07-invalid-data.csv        (5 rows, all invalid)
  ├── 08-extra-columns.csv       (5 dancers, extra cols)
  ├── 09-mixed-case.csv          (5 dancers, HEADERS)
  └── 10-missing-required.csv    (5 rows, missing last_name)
```

---

### Pre-Launch Context (CRITICAL MINDSET)

**What "Production" Actually Means:**
- Real clients: EMPWR Dance Experience + Glow Dance Competition
- Real money: Thousands of dollars in payments
- Real consequences: Data loss = business failure

**Zero Tolerance Issues:**
- Negative capacity (overselling)
- Cross-tenant data leaks (legal liability)
- Lost dancers/entries (user trust violation)
- Wrong age divisions (competition disqualification)
- Payment errors (financial loss)

**Known Technical Debt (Acceptable for MVP):**
- No capacity audit ledger (manual tracking)
- No idempotency keys (double-click possible)
- No transaction retry logic (manual retry)
- Capacity calculated, not event-sourced

**Launch Blockers (Must Be Zero):**
- P0 bugs discovered during testing
- Console errors on critical path
- Data persistence failures
- Multi-tenant isolation violations

---

### Quick SQL Debug Queries (Copy-Paste)

**1. Check Baseline State:**
```sql
SELECT
  (SELECT COUNT(*) FROM dancers WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as dancers,
  (SELECT COUNT(*) FROM reservations WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a') as reservations,
  (SELECT COUNT(*) FROM entries WHERE reservation_id IN (SELECT id FROM reservations WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a')) as entries;
```

**2. Find Test Data Created in Last Hour:**
```sql
SELECT 'dancers' as table_name, COUNT(*) as count FROM dancers WHERE created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations WHERE created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'entries', COUNT(*) FROM entries WHERE created_at > NOW() - INTERVAL '1 hour';
```

**3. Check for Data Integrity Issues:**
```sql
-- Cross-tenant leaks
SELECT 'cross_tenant_dancers' as issue, COUNT(*) as violations
FROM dancers d JOIN studios s ON d.studio_id = s.id WHERE d.tenant_id != s.tenant_id
UNION ALL
SELECT 'negative_capacity', COUNT(*) FROM events WHERE remaining_capacity < 0
UNION ALL
SELECT 'invalid_title_upgrade', COUNT(*) FROM entries WHERE title_upgrade = true AND group_size_category != 'solo';
```

**4. Check Recent Test User Activity:**
```sql
SELECT
  'Last login' as metric,
  last_sign_in_at::text as value
FROM auth.users
WHERE email = 'djamusic@gmail.com'
UNION ALL
SELECT
  'Total dancers',
  COUNT(*)::text
FROM dancers
WHERE studio_id = 'de74304a-c0b3-4a5b-85d3-80c4d4c7073a';
```

---

**END OF RUNBOOK**
