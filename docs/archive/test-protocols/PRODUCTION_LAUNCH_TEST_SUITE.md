# Production Launch Test Suite - CompPortal Phase 1 Complete Workflow

**Launch Date:** November 7, 2025
**Test Environment:** empwr.compsync.net + glow.compsync.net
**Spec Compliance:** Phase 1 spec lines 1-1040 (Complete Registration Phase)
**Status:** Ready for autonomous execution

---

## 🎯 TEST PHILOSOPHY: ACT AS A REAL USER

**CRITICAL:** This is NOT code verification - this is USER EXPERIENCE testing.

**You must:**
- ✅ Click buttons like a real user would
- ✅ Fill forms naturally (not just bare minimum)
- ✅ Navigate through the actual UI (no direct URL manipulation unless testing links)
- ✅ Create realistic test data ("Emma's Solo Jazz", not "test1")
- ✅ Experience the entire workflow start-to-finish
- ✅ Notice UI/UX issues (confusing labels, missing feedback, etc.)
- ✅ Test CSV imports with actual CSV files in the repo
- ✅ Create at least 40 routines using various methods (manual, CSV, mixed)
- ✅ Test BOTH tenants for multi-tenant isolation

**You must NOT:**
- ❌ Skip steps or assume they work
- ❌ Use database queries as shortcuts (only for verification)
- ❌ Test only happy paths
- ❌ Rush through forms
- ❌ Skip evidence collection

---

## 🚨 CRITICAL DATA SAFETY RULES

**ONLY djamusic@gmail.com test data can be modified or deleted**

**NEVER TOUCH:**
- ❌ empwrdance@gmail.com (Emily's CD account) - READ ONLY for setup
- ❌ stefanoalyessia@gmail.com (Alyessia's CD account) - READ ONLY for setup
- ❌ ANY other SD account data
- ❌ ANY production studios or real competition data

**Testing Workflow:**
1. ✅ Use CD accounts ONLY to approve reservations and create invoices (setup)
2. ✅ Switch to djamusic@gmail.com for ALL user testing
3. ✅ Act like a real studio director creating real competition entries
4. ✅ Name entries naturally: "Emma's Solo Jazz", "Senior Lyrical Trio"

**Before ANY delete operation:**
```sql
-- VERIFY ownership
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

## Quick Reference

**Test Accounts:**
- **SA:** danieljohnabrahamson@gmail.com / 123456
- **CD (EMPWR):** empwrdance@gmail.com / 1CompSyncLogin!
- **CD (Glow):** stefanoalyessia@gmail.com / 1CompSyncLogin!
- **SD (TEST ACCOUNT):** djamusic@gmail.com / 123456 - ONLY account for data modification

**Test Data Files:**
- Search for: `test_dancers.csv`, `test_routines*.csv` in repo
- Create new CSVs as needed for 40+ routines

**Evidence Location:**
- Screenshots: `D:\ClaudeCode\evidence/screenshots/`
- SQL Queries: `D:\ClaudeCode\evidence/queries/`
- Console Logs: Captured via Playwright MCP

---

## Test Suite Overview

| Category | Tests | Critical | Est. Time |
|----------|-------|----------|-----------|
| 1. Setup & Auth | 6 | Yes | 20 min |
| 2. Dancer Management | 8 | Yes | 30 min |
| 3. Reservation Flow | 7 | Yes | 25 min |
| 4. Manual Entry Creation (40+ routines) | 15 | Yes | 90 min |
| 5. CSV Import Flow | 10 | Yes | 45 min |
| 6. Exception Requesting | 6 | Yes | 30 min |
| 7. Summary Submission | 8 | Yes | 30 min |
| 8. Invoice Generation | 10 | Yes | 40 min |
| 9. Split Invoice by Dancer | 6 | Medium | 25 min |
| 10. Edge Cases & Validation | 12 | Medium | 40 min |
| 11. Multi-Tenant Verification | 5 | Yes | 30 min |
| **TOTAL** | **93** | - | **~6.5 hours** |

---

## Success Criteria for Launch

✅ **PASS Requirements (Minimum for launch):**
- All Category 1-8 tests pass (70/70 = 100%)
- Zero critical blockers
- Multi-tenant isolation verified (Category 11)
- At least 40 routines created successfully
- Database persistence confirmed for all workflows
- Spec compliance validated

⚠️ **ACCEPTABLE (Launch with caution):**
- Categories 1-8: 63/70 pass (90%+)
- Category 9-10: Some failures acceptable (new features / edge cases)
- No data corruption or capacity calculation errors
- At least 35 routines created

❌ **NO-GO (Do not launch):**
- Any Category 1-8 test fails with data corruption
- Capacity calculation errors
- Multi-tenant data leaks
- Invoice calculation errors
- Summary submission failures
- Less than 30 routines created successfully

---

## CATEGORY 1: SETUP & AUTHENTICATION ✅ CRITICAL

**Purpose:** Verify authentication, navigation, and initial setup

### T1.1: SA Login & System Check
**Priority:** P0 - Blocker
**Steps:**
1. Navigate: `https://empwr.compsync.net`
2. Login: danieljohnabrahamson@gmail.com / 123456
3. Verify SA dashboard loads
4. Check browser console (no errors)
5. Screenshot dashboard

**Expected:** Clean login, SA access
**Evidence:** Screenshot + console log

---

### T1.2: CD Login & Director Panel Access (EMPWR)
**Priority:** P0 - Blocker
**Steps:**
1. Logout from SA
2. Login: empwrdance@gmail.com / 1CompSyncLogin!
3. Verify CD dashboard with "Director Panel" visible
4. Click "Director Panel"
5. Verify reservations, invoices sections visible

**Expected:** CD admin access working
**Evidence:** Screenshot

---

### T1.3: CD Login & Director Panel Access (Glow)
**Priority:** P0 - Blocker
**Steps:**
1. Navigate: `https://glow.compsync.net`
2. Login: stefanoalyessia@gmail.com / 1CompSyncLogin!
3. Verify CD dashboard loads
4. Verify DIFFERENT data from EMPWR

**Expected:** Tenant isolation
**Evidence:** Screenshot + SQL verification

**Database Verification:**
```sql
-- EMPWR tenant
SELECT COUNT(*) as empwr_count, tenant_id
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Glow tenant
SELECT COUNT(*) as glow_count, tenant_id
FROM competition_entries
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';
```

---

### T1.4: SD Login & Dashboard Access
**Priority:** P0 - Blocker
**Steps:**
1. Navigate: `https://empwr.compsync.net`
2. Login: djamusic@gmail.com / 123456
3. Verify studio dashboard loads with studio name
4. Check navigation buttons visible: Dancers, Entries, Reservations
5. Screenshot dashboard

**Expected:** SD dashboard working
**Evidence:** Screenshot + console log

---

### T1.5: SD Navigation Flow
**Priority:** P1 - High
**Steps:**
1. From dashboard, click "Dancers"
2. Verify dancers page loads
3. Click "Entries"
4. Verify entries page loads
5. Click "Reservations"
6. Verify reservations page loads
7. Navigate back to Dashboard

**Expected:** All nav links working
**Evidence:** Screenshot of each page

---

### T1.6: Session Persistence
**Priority:** P1 - High
**Steps:**
1. Login as SD
2. Navigate to entries
3. Refresh browser (F5)
4. Verify still logged in (no redirect to login)

**Expected:** Session persists
**Evidence:** Screenshot after refresh

---

## CATEGORY 2: DANCER MANAGEMENT ✅ CRITICAL

**Purpose:** Test dancer creation (manual + CSV) - foundation for all entries

### T2.1: Manual Dancer Creation (Single)
**Priority:** P0 - Blocker
**Steps:**
1. Login as SD (djamusic@gmail.com)
2. Navigate to "Dancers"
3. Click "Add Dancer"
4. Fill form:
   - Name: "Emma Johnson"
   - Birthdate: "2010-05-15"
   - Gender: Female
5. Click "Save"
6. Verify success message
7. Verify Emma appears in dancer list

**Expected:** Dancer created successfully
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT d.id, d.name, d.date_of_birth, d.gender, s.owner_id, u.email
FROM dancers d
JOIN studios s ON s.id = d.studio_id
JOIN auth.users u ON u.id = s.owner_id
WHERE d.name = 'Emma Johnson'
AND u.email = 'djamusic@gmail.com';
```

---

### T2.2: Manual Dancer Creation (Batch - 10 dancers)
**Priority:** P0 - Blocker
**Steps:**
1. Create 10 dancers manually with realistic names:
   - Sophia Martinez (2011-03-20)
   - Olivia Chen (2012-08-10)
   - Ava Williams (2009-11-25)
   - Isabella Garcia (2010-01-30)
   - Mia Thompson (2013-06-15)
   - Charlotte Lee (2011-09-05)
   - Amelia Rodriguez (2012-02-18)
   - Harper Kim (2010-07-22)
   - Evelyn Patel (2014-04-12)
   - Abigail Davis (2011-12-08)
2. Verify all 10 appear in dancer list
3. Verify ages calculated correctly

**Expected:** All 10 dancers created
**Evidence:** Screenshot of dancer list + SQL count

**Database Verification:**
```sql
SELECT COUNT(*) as dancer_count
FROM dancers d
JOIN studios s ON s.id = d.studio_id
JOIN auth.users u ON u.id = s.owner_id
WHERE u.email = 'djamusic@gmail.com';
-- Should be 11 (Emma + 10 new)
```

---

### T2.3: Find Test Dancer CSV Files
**Priority:** P0 - Blocker
**Steps:**
1. Use Glob tool to find CSV files:
   - Pattern: `**/test_dancers*.csv`
   - Pattern: `**/*dancer*.csv`
2. Read first CSV found
3. Verify format: name, dob, gender columns

**Expected:** Find usable CSV files
**Evidence:** List of CSV files found

---

### T2.4: CSV Dancer Import (Valid File)
**Priority:** P0 - Blocker
**Steps:**
1. Navigate to "Dancers"
2. Click "Import from CSV" (if available) OR use upload button
3. Upload first CSV file found
4. Verify preview shows dancers
5. Click "Import"
6. Verify success message with count (e.g., "15 dancers imported")
7. Verify dancer list updated

**Expected:** CSV import successful
**Evidence:** Screenshot + SQL count

**Database Verification:**
```sql
SELECT COUNT(*) as total_dancers
FROM dancers d
JOIN studios s ON s.id = d.studio_id
JOIN auth.users u ON u.id = s.owner_id
WHERE u.email = 'djamusic@gmail.com';
-- Should be 11 + CSV count
```

---

### T2.5: CSV Dancer Import (Duplicate Detection)
**Priority:** P1 - High
**Steps:**
1. Upload same CSV again
2. Verify message: "X skipped (already exist)"
3. Verify no duplicate dancers created

**Expected:** Duplicate prevention working
**Evidence:** Screenshot + SQL verification no duplicates

---

### T2.6: Dancer Edit
**Priority:** P1 - High
**Steps:**
1. Find "Emma Johnson" in dancer list
2. Click edit button
3. Change birthdate to "2010-06-01"
4. Click "Update"
5. Verify success message
6. Verify birthdate updated in list

**Expected:** Edit working
**Evidence:** Screenshot + SQL

---

### T2.7: Dancer Soft Delete
**Priority:** P1 - High
**Steps:**
1. Create test dancer "Test Delete Dancer"
2. Delete dancer
3. Verify removed from UI
4. Verify soft delete in database (deleted_at set, not hard delete)

**Expected:** Soft delete only
**Evidence:** SQL showing deleted_at IS NOT NULL

**Database Verification:**
```sql
SELECT id, name, deleted_at
FROM dancers
WHERE name = 'Test Delete Dancer';
-- Record MUST exist with deleted_at timestamp
```

---

### T2.8: Verify Total Dancer Count (30+ dancers)
**Priority:** P0 - Blocker
**Steps:**
1. View dancer list
2. Verify at least 30 dancers visible (11 manual + CSV imports)
3. Screenshot dancer list showing count

**Expected:** At least 30 dancers ready for routine creation
**Evidence:** Screenshot + SQL count

**Database Verification:**
```sql
SELECT COUNT(*) as total_dancers
FROM dancers d
JOIN studios s ON s.id = d.studio_id
JOIN auth.users u ON u.id = s.owner_id
WHERE u.email = 'djamusic@gmail.com'
AND d.deleted_at IS NULL;
-- MUST be >= 30
```

---

## CATEGORY 3: RESERVATION FLOW ✅ CRITICAL

**Purpose:** Test reservation request → approval → entry creation access

### T3.1: Check Existing Reservations (EMPWR)
**Priority:** P0 - Blocker
**Steps:**
1. Login as SD (djamusic@gmail.com) on empwr.compsync.net
2. Navigate to "Reservations"
3. Check if any approved reservations exist
4. If yes: Note reservation ID and capacity
5. If no: Proceed to T3.2 to create one

**Expected:** Know starting state
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT r.id, r.status, r.entries_approved, r.entries_requested
FROM reservations r
JOIN studios s ON s.id = r.studio_id
JOIN auth.users u ON u.id = s.owner_id
WHERE u.email = 'djamusic@gmail.com'
AND r.tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY r.created_at DESC;
```

---

### T3.2: Create New Reservation Request (if needed)
**Priority:** P0 - Blocker
**Steps:**
1. Navigate to "Reservations"
2. Click "Request Reservation"
3. Select event
4. Request 50 entries
5. Click "Submit Request"
6. Verify success message
7. Verify status = "Pending"

**Expected:** Reservation created, pending approval
**Evidence:** Screenshot

---

### T3.3: Approve Reservation (CD Side)
**Priority:** P0 - Blocker
**Steps:**
1. Logout from SD
2. Login as CD (empwrdance@gmail.com)
3. Navigate to Director Panel → Reservations
4. Find pending reservation from djamusic@gmail.com
5. Click "Review"
6. Approve for 50 entries
7. Click "Approve"
8. Verify success message

**Expected:** Reservation approved, capacity deducted
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
-- Check reservation status
SELECT id, status, entries_approved, reviewed_at
FROM reservations
WHERE studio_id IN (
  SELECT s.id FROM studios s
  JOIN auth.users u ON u.id = s.owner_id
  WHERE u.email = 'djamusic@gmail.com'
)
ORDER BY created_at DESC LIMIT 1;

-- Check competition capacity deducted
SELECT id, name, available_reservation_tokens
FROM competitions
WHERE id = '[competition-id]';
-- Should be decreased by 50
```

---

### T3.4: SD Receives Approval Notification
**Priority:** P1 - High
**Steps:**
1. Logout from CD
2. Login as SD (djamusic@gmail.com)
3. Navigate to "Reservations"
4. Verify reservation status = "Approved"
5. Verify entries_approved = 50
6. Verify "Create Entries" button visible

**Expected:** SD sees approved reservation
**Evidence:** Screenshot

---

### T3.5: Verify Capacity Tracking After Approval
**Priority:** P0 - Blocker
**Steps:**
1. Query competition capacity before approval
2. Note available_reservation_tokens
3. Compare with after approval
4. Verify decreased by 50

**Expected:** Capacity correctly deducted
**Evidence:** SQL before/after

---

### T3.6: Multiple Reservations Same Studio
**Priority:** P1 - High
**Steps:**
1. As SD, create second reservation request (20 entries)
2. As CD, approve second reservation (20 entries)
3. Verify SD has 2 approved reservations
4. Verify total capacity deducted = 70 (50 + 20)

**Expected:** Multiple reservations allowed
**Evidence:** Screenshot + SQL

---

### T3.7: Reservation Rejection Flow
**Priority:** P2 - Medium
**Steps:**
1. As SD, create third reservation request (100 entries)
2. As CD, reject with reason: "Insufficient capacity remaining for this event"
3. As SD, verify status = "Rejected"
4. Verify reason displayed

**Expected:** Rejection workflow working
**Evidence:** Screenshot

---

## CATEGORY 4: MANUAL ENTRY CREATION (40+ ROUTINES) ✅ CRITICAL

**Purpose:** Create 40+ routines manually using various sizes, categories, classifications

**IMPORTANT:** This is the CORE workflow - spend time here acting like a real user

### T4.1: Navigate to Entry Creation
**Priority:** P0 - Blocker
**Steps:**
1. Login as SD (djamusic@gmail.com)
2. Navigate to "Entries"
3. Verify entries dashboard loads
4. Verify approved reservation visible
5. Click "Create Entry"
6. Verify entry form loads

**Expected:** Entry creation accessible
**Evidence:** Screenshot

---

### T4.2: Solo Entry #1 - Jazz
**Priority:** P0 - Blocker
**Spec:** Phase 1 spec lines 546-585
**Steps:**
1. Click "Create Entry"
2. Enter routine name: "Emma's Solo Jazz"
3. Select 1 dancer: Emma Johnson
4. Select category: Jazz
5. Select classification: Intermediate
6. Verify age auto-calculated (based on Emma's DOB)
7. Verify size category = "Solo"
8. Verify capacity shows "1/50 used"
9. Click "Save Entry"
10. Verify success message
11. Verify bottom bar shows "1/50"
12. Verify entry appears in dashboard

**Expected:** Solo entry created, all auto-calculations correct
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT
  id,
  routine_name,
  routine_age,
  size_category_id,
  classification_id,
  dance_category,
  created_at
FROM competition_entries
WHERE routine_name = 'Emma''s Solo Jazz'
AND deleted_at IS NULL;

-- Verify size_category
SELECT sc.name
FROM size_categories sc
JOIN competition_entries ce ON ce.size_category_id = sc.id
WHERE ce.routine_name = 'Emma''s Solo Jazz';
-- MUST be 'Solo'
```

---

### T4.3: Solo Entry #2 - Contemporary with Age Override
**Priority:** P0 - Blocker
**Spec:** Phase 1 spec lines 546-585 (age override)
**Steps:**
1. Create entry: "Sophia's Contemporary Solo"
2. Select dancer: Sophia Martinez (age 13)
3. Select category: Contemporary
4. Verify age dropdown shows [13, 14]
5. Select age override: 14 (+1 bump)
6. Select classification: Advanced
7. Save
8. Verify routine_age = 14 in database

**Expected:** Age override working
**Evidence:** Screenshot showing age dropdown + SQL

**Database Verification:**
```sql
SELECT routine_name, routine_age, age_override
FROM competition_entries
WHERE routine_name = 'Sophia''s Contemporary Solo';
-- age_override should be TRUE
```

---

### T4.4: Duet Entry #1 - Lyrical
**Priority:** P0 - Blocker
**Spec:** Phase 1 spec lines 546-585 (age = average)
**Steps:**
1. Create entry: "Olivia & Ava Lyrical Duet"
2. Select 2 dancers: Olivia Chen (age 12), Ava Williams (age 14)
3. Verify age auto-calculated = 13 (average rounded down)
4. Verify size category = "Duet/Trio"
5. Select category: Lyrical
6. Select classification: Intermediate
7. Save

**Expected:** Duet rules applied correctly
**Evidence:** Screenshot + SQL

---

### T4.5: Trio Entry #1 - Hip Hop
**Priority:** P0 - Blocker
**Steps:**
1. Create entry: "Triple Threat Hip Hop"
2. Select 3 dancers: Isabella, Mia, Charlotte
3. Verify size category = "Duet/Trio"
4. Select category: Hip Hop
5. Select classification: Advanced
6. Save

**Expected:** Trio auto-detected
**Evidence:** Screenshot

---

### T4.6: Small Group Entry #1 - Jazz (5 dancers)
**Priority:** P0 - Blocker
**Spec:** Phase 1 spec lines 546-585 (60% majority classification)
**Steps:**
1. Create entry: "Jazz Ensemble - Small"
2. Select 5 dancers with MIXED classifications:
   - 3 Advanced dancers
   - 2 Intermediate dancers
3. Verify size category = "Small Group"
4. Verify suggested classification = Advanced (60% majority)
5. Select category: Jazz
6. Accept suggested classification
7. Save

**Expected:** Small group + 60% rule working
**Evidence:** Screenshot + SQL

---

### T4.7: Small Group Entry #2 - Contemporary (7 dancers)
**Priority:** P0 - Blocker
**Steps:**
1. Create entry: "Contemporary Collective"
2. Select 7 dancers
3. Verify size category = "Small Group"
4. Select category: Contemporary
5. Select classification: Intermediate
6. Save

**Expected:** 7-dancer group created
**Evidence:** Screenshot

---

### T4.8: Large Group Entry #1 - Musical Theater (12 dancers)
**Priority:** P0 - Blocker
**Steps:**
1. Create entry: "Broadway Bound - Large Group"
2. Select 12 dancers
3. Verify size category = "Large Group"
4. Select category: Musical Theater
5. Select classification: Advanced
6. Save

**Expected:** Large group auto-detected
**Evidence:** Screenshot

---

### T4.9: Large Group Entry #2 - Tap (15 dancers)
**Priority:** P0 - Blocker
**Steps:**
1. Create entry: "Tap Spectacular"
2. Select 15 dancers
3. Verify size category = "Large Group"
4. Select category: Tap
5. Select classification: Intermediate
6. Save

**Expected:** 15-dancer group created
**Evidence:** Screenshot

---

### T4.10: Production Entry (20 dancers, special rules)
**Priority:** P0 - Blocker
**Spec:** AutoCalculatedSection.tsx:131-132
**Steps:**
1. Create entry: "Grand Production - The Journey"
2. Select 20 dancers
3. Select category: **Production**
4. Verify NO "Exception Required" button visible
5. Verify can select ANY classification without restriction
6. Select classification: Advanced
7. Save

**Expected:** Production exempt from exception logic
**Evidence:** Screenshot showing NO exception button + SQL

**Code Reference:** AutoCalculatedSection.tsx:131-132
```typescript
if (selected.name === 'Production') return false;
```

---

### T4.11: Create 10 More Solo Entries (Rapid Creation)
**Priority:** P0 - Blocker
**Steps:**
1. Create 10 solo entries with different categories:
   - "Amelia's Ballet Solo" (Ballet, Intermediate)
   - "Harper's Acro Solo" (Acrobatic, Advanced)
   - "Evelyn's Jazz Solo" (Jazz, Intermediate)
   - "Abigail's Lyrical Solo" (Lyrical, Advanced)
   - "Sophia's Hip Hop Solo" (Hip Hop, Intermediate)
   - "Emma's Tap Solo" (Tap, Advanced)
   - "Olivia's Contemporary Solo" (Contemporary, Intermediate)
   - "Ava's Musical Theater Solo" (Musical Theater, Advanced)
   - "Isabella's Open Solo" (Open, Intermediate)
   - "Mia's Character Solo" (Character, Advanced)
2. Use "Save and Create Another" button for efficiency
3. Verify capacity counter incrementing each time

**Expected:** 10 solos created quickly
**Evidence:** Screenshot of entry list + SQL count

---

### T4.12: Create 5 More Duets (Mixed Categories)
**Priority:** P0 - Blocker
**Steps:**
1. Create 5 duet entries:
   - "Charlotte & Amelia Tap Duet" (Tap, Advanced)
   - "Harper & Evelyn Jazz Duet" (Jazz, Intermediate)
   - "Abigail & Sophia Contemporary Duet" (Contemporary, Advanced)
   - "Emma & Olivia Hip Hop Duet" (Hip Hop, Intermediate)
   - "Ava & Isabella Lyrical Duet" (Lyrical, Advanced)
2. Verify each age calculation correct
3. Verify "Save and Create Another" working in duet mode

**Expected:** 5 duets created
**Evidence:** Screenshot + SQL count

---

### T4.13: Create 3 More Trios
**Priority:** P1 - High
**Steps:**
1. Create 3 trio entries:
   - "Mia, Charlotte & Amelia Ballet Trio" (Ballet, Intermediate)
   - "Harper, Evelyn & Abigail Jazz Trio" (Jazz, Advanced)
   - "Sophia, Emma & Olivia Contemporary Trio" (Contemporary, Intermediate)
2. Verify size category = "Duet/Trio" for all

**Expected:** 3 trios created
**Evidence:** Screenshot

---

### T4.14: Create 3 More Small Groups (6-9 dancers)
**Priority:** P1 - High
**Steps:**
1. Create 3 small group entries with 6, 7, and 9 dancers:
   - "Lyrical Expression - 6 Dancers" (6 dancers, Lyrical, Advanced)
   - "Hip Hop Crew - 7 Dancers" (7 dancers, Hip Hop, Intermediate)
   - "Jazz Squad - 9 Dancers" (9 dancers, Jazz, Advanced)
2. Verify size category = "Small Group" for all

**Expected:** 3 small groups created
**Evidence:** Screenshot + SQL count

---

### T4.15: Verify Total Entry Count (40+ routines)
**Priority:** P0 - Blocker
**Steps:**
1. Navigate to entries dashboard
2. View total count
3. Verify at least 40 routines created
4. Verify bottom bar shows "40/50" (or higher)
5. Screenshot dashboard showing count

**Expected:** At least 40 routines created
**Evidence:** Screenshot + SQL count

**Database Verification:**
```sql
SELECT COUNT(*) as total_entries
FROM competition_entries ce
JOIN reservations r ON r.reservation_id = ce.reservation_id
JOIN studios s ON s.id = r.studio_id
JOIN auth.users u ON u.id = s.owner_id
WHERE u.email = 'djamusic@gmail.com'
AND ce.deleted_at IS NULL
AND r.tenant_id = '00000000-0000-0000-0000-000000000001';
-- MUST be >= 40
```

---

## CATEGORY 5: CSV IMPORT FLOW ✅ CRITICAL

**Purpose:** Test bulk routine import from CSV

### T5.1: Find Test Routine CSV Files
**Priority:** P0 - Blocker
**Steps:**
1. Use Glob tool to find CSV files:
   - Pattern: `**/test_routines*.csv`
   - Pattern: `**/*routine*.csv`
   - Pattern: `**/*entries*.csv`
2. Read first CSV found
3. Verify format has routine columns

**Expected:** Find usable routine CSV files
**Evidence:** List of CSV files

---

### T5.2: CSV Upload & Preview
**Priority:** P0 - Blocker
**Steps:**
1. Navigate to "Entries"
2. Click "Import from CSV"
3. Upload first CSV file found
4. Verify preview shows all routines
5. Verify columns parsed correctly
6. Verify dancer name matching working (if CSV has dancer names)
7. Screenshot preview

**Expected:** CSV preview loads
**Evidence:** Screenshot

---

### T5.3: CSV Dancer Matching & Pinning
**Priority:** P1 - High
**Steps:**
1. After CSV upload, view first routine
2. If routine specifies dancer "Emma Johnson"
3. Click dancer dropdown
4. Verify "Emma Johnson" pinned to TOP of list (matched dancer)
5. Verify other dancers below

**Expected:** Matched dancers prioritized
**Evidence:** Screenshot showing pinned dancer

---

### T5.4: CSV Save First Routine
**Priority:** P0 - Blocker
**Steps:**
1. On first routine preview, verify fields populated
2. Select dancers if needed
3. Select category/classification if needed
4. Click "Save and Next"
5. Verify success message
6. Verify bottom bar capacity updates (+1)
7. Verify moves to next routine in CSV

**Expected:** First CSV routine saved
**Evidence:** Screenshot + SQL

---

### T5.5: CSV Batch Save (Save 10 Routines)
**Priority:** P0 - Blocker
**Steps:**
1. Continue through CSV import
2. Save 10 routines sequentially using "Save and Next"
3. Verify bottom bar increments each time
4. Verify progress indicator (if exists)
5. After 10th, click "Done" or "Cancel"
6. Return to dashboard
7. Verify 10 new entries appear

**Expected:** Batch save working
**Evidence:** Screenshot + SQL count

**Database Verification:**
```sql
SELECT COUNT(*) as csv_entries
FROM competition_entries
WHERE routine_name LIKE '%CSV%' OR created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

---

### T5.6: CSV Import Mid-Flow Cancel
**Priority:** P2 - Medium
**Steps:**
1. Upload CSV with 15 routines
2. Save first 3 routines
3. Click "Cancel" or "Exit Import"
4. Verify warning (if exists)
5. Confirm cancel
6. Return to dashboard
7. Verify only 3 saved (not all 15)

**Expected:** Partial import allowed
**Evidence:** Screenshot + SQL count

---

### T5.7: CSV Error Handling (Invalid Data)
**Priority:** P1 - High
**Steps:**
1. Create CSV with intentional errors:
   - Invalid birthdate format
   - Missing required fields
   - Invalid category name
2. Upload CSV
3. Verify error messages show which rows invalid
4. Verify can skip invalid rows
5. Verify valid rows still processable

**Expected:** Graceful error handling
**Evidence:** Screenshot showing error messages

---

### T5.8: CSV Large File Test (20+ Routines)
**Priority:** P2 - Medium
**Steps:**
1. Find or create CSV with 20+ routines
2. Upload CSV
3. Verify preview loads (not timeout)
4. Save first 5 routines
5. Verify performance acceptable (<3 sec per save)
6. Note any UI lag or issues

**Expected:** Handles larger CSV files
**Evidence:** Screenshot + performance notes

---

### T5.9: CSV Bottom Bar Updates During Import
**Priority:** P1 - High
**Steps:**
1. Before CSV import, note bottom bar count (e.g., "40/50")
2. During CSV import, after each save:
   - Verify bottom bar updates to "41/50", "42/50", etc.
3. After import complete, verify final count matches

**Expected:** Real-time capacity tracking
**Evidence:** Screenshot sequence

---

### T5.10: Verify CSV Entries in Dashboard
**Priority:** P0 - Blocker
**Steps:**
1. After CSV import complete, return to entries dashboard
2. Verify all CSV entries visible
3. Verify routine ages calculated correctly
4. Verify classifications assigned correctly
5. Click one CSV entry to view details
6. Verify all fields populated correctly

**Expected:** CSV entries fully integrated
**Evidence:** Screenshot + SQL verification

---

## CATEGORY 6: EXCEPTION REQUESTING ✅ CRITICAL

**Purpose:** Test classification exception request workflow

### T6.1: Identify Exception Scenario
**Priority:** P1 - High
**Spec:** AutoCalculatedSection.tsx
**Steps:**
1. Create new small group entry with 5 dancers
2. All 5 dancers are Intermediate classification
3. Verify suggested classification = Intermediate
4. In classification dropdown, select **Elite** (2+ levels above)
5. Verify "Exception Required" button appears
6. Screenshot showing exception button

**Expected:** Exception logic triggers for 2+ level jump
**Evidence:** Screenshot

---

### T6.2: Request Classification Exception
**Priority:** P1 - High
**Steps:**
1. With exception button visible
2. Click "Request Exception"
3. Verify modal/form opens
4. Enter reason: "These dancers have been training at elite level for 2 years and need the challenge"
5. Click "Submit Request"
6. Verify success message
7. Verify entry saved with pending exception status

**Expected:** Exception request created
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT
  ce.id,
  ce.routine_name,
  ce.classification_id,
  ce.exception_status,
  ce.exception_reason
FROM competition_entries ce
WHERE ce.exception_status = 'pending';
```

---

### T6.3: CD View Exception Requests
**Priority:** P1 - High
**Steps:**
1. Logout from SD
2. Login as CD (empwrdance@gmail.com)
3. Navigate to Director Panel → Exceptions (or Reservations)
4. Verify exception request visible
5. Verify shows: routine name, studio, requested classification, reason
6. Screenshot exception request list

**Expected:** CD can see pending exceptions
**Evidence:** Screenshot

---

### T6.4: CD Approve Exception
**Priority:** P1 - High
**Steps:**
1. As CD, find exception request
2. Click "Review" or open details
3. Click "Approve"
4. Verify success message
5. Verify exception status = "approved"

**Expected:** Exception approval working
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT exception_status, approved_at, approved_by
FROM competition_entries
WHERE id = '[entry-id]';
-- exception_status should be 'approved'
```

---

### T6.5: CD Reject Exception
**Priority:** P1 - High
**Steps:**
1. Create second exception request as SD
2. As CD, review and reject with reason
3. Verify rejection reason saved
4. As SD, verify can see rejection reason
5. Verify entry reverted to suggested classification (or can edit)

**Expected:** Exception rejection working
**Evidence:** Screenshot

---

### T6.6: Production Category Exempt from Exception Logic
**Priority:** P0 - Blocker
**Steps:**
1. Create Production entry (15+ dancers)
2. Select category: Production
3. Select classification: Elite (any level)
4. Verify NO "Exception Required" button appears
5. Verify can save without exception request

**Expected:** Production exempt
**Evidence:** Screenshot showing no exception button

**Code Reference:** AutoCalculatedSection.tsx:131-132

---

## CATEGORY 7: SUMMARY SUBMISSION ✅ CRITICAL

**Purpose:** Test summary submission, capacity refund, state transitions

### T7.1: Pre-Summary State Check
**Priority:** P0 - Blocker
**Steps:**
1. Login as SD (djamusic@gmail.com)
2. Navigate to reservations
3. Find reservation with 40+ entries created
4. Verify reservation status = "approved"
5. Note entries used (e.g., 43/50)
6. Query competition capacity BEFORE summary

**Expected:** Reservation ready for summary
**Evidence:** SQL

**Database Verification:**
```sql
-- Check reservation
SELECT id, status, entries_approved
FROM reservations
WHERE id = '[reservation-id]';

-- Check competition capacity BEFORE
SELECT id, available_reservation_tokens
FROM competitions
WHERE id = '[competition-id]';
-- Note this number
```

---

### T7.2: Summary Submission Modal
**Priority:** P0 - Blocker
**Spec:** Phase 1 spec lines 589-651
**Steps:**
1. On entries dashboard with 43/50 entries
2. Click "Submit Summary"
3. Verify modal opens showing:
   - Entries used: 43
   - Entries unused: 7
   - Capacity to be refunded: 7
4. Verify cannot edit numbers (read-only)
5. Screenshot modal

**Expected:** Summary preview correct
**Evidence:** Screenshot

---

### T7.3: Confirm Summary Submission
**Priority:** P0 - Blocker
**Steps:**
1. In summary modal, click "Confirm Submit"
2. Verify success message
3. Verify reservation status changes to "Summarized"
4. Verify "Create Entry" button disabled (no more entries allowed)
5. Verify all entries status = "submitted"

**Expected:** Summary creates reservation_summary record
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
-- Check reservation status updated
SELECT id, status, updated_at
FROM reservations
WHERE id = '[reservation-id]';
-- status should be 'summarized'

-- Check summary record created
SELECT
  rs.id,
  rs.entries_used,
  rs.entries_unused,
  rs.submitted_at
FROM reservation_summaries rs
WHERE rs.reservation_id = '[reservation-id]';
-- entries_used = 43, entries_unused = 7

-- Check all entries marked submitted
SELECT COUNT(*) as submitted_entries
FROM competition_entries
WHERE reservation_id = '[reservation-id]'
AND status = 'submitted';
-- Should equal 43
```

---

### T7.4: Verify Capacity Refunded
**Priority:** P0 - Blocker
**Spec:** Phase 1 spec lines 632-635
**Steps:**
1. After summary submission
2. Query competition capacity AFTER summary
3. Verify capacity increased by 7 (unused entries)
4. Compare before/after

**Expected:** Immediate capacity refund
**Evidence:** SQL before/after comparison

**Database Verification:**
```sql
-- Check competition capacity AFTER
SELECT id, available_reservation_tokens
FROM competitions
WHERE id = '[competition-id]';
-- Should be +7 from BEFORE state (from T7.1)
```

---

### T7.5: Summary Prevents Duplicate Submission
**Priority:** P0 - Blocker
**Steps:**
1. With summarized reservation
2. Attempt to click "Submit Summary" again
3. Verify button disabled OR error message
4. Verify no duplicate summary created

**Expected:** Idempotency enforced
**Evidence:** Screenshot + SQL

---

### T7.6: Summary Requires Minimum 1 Entry
**Priority:** P1 - High
**Steps:**
1. Create new reservation (approved for 10 entries)
2. Do NOT create any entries
3. Attempt to submit summary
4. Verify error: "Must create at least 1 entry before submitting summary"

**Expected:** Validation prevents empty summaries
**Evidence:** Screenshot

---

### T7.7: CD Notification of Summary Submission
**Priority:** P1 - High
**Steps:**
1. After SD submits summary
2. Login as CD
3. Check notifications or activity feed
4. Verify shows "Studio X submitted summary for Event Y"
5. Click notification
6. Verify navigates to reservation details

**Expected:** CD notified of summary
**Evidence:** Screenshot

---

### T7.8: Summary State Transition Verification
**Priority:** P0 - Blocker
**Steps:**
1. Verify complete state transition chain:
   - Reservation: approved → summarized ✓
   - Entries: created → submitted ✓
   - Capacity: deducted → partially refunded ✓
   - Summary record: created ✓
2. Query all related tables to confirm

**Expected:** All state transitions correct
**Evidence:** SQL verification

**Database Verification:**
```sql
-- Complete state verification
SELECT
  r.id as reservation_id,
  r.status as reservation_status,
  r.entries_approved,
  rs.entries_used,
  rs.entries_unused,
  rs.submitted_at,
  (SELECT COUNT(*) FROM competition_entries WHERE reservation_id = r.id AND status = 'submitted') as entries_submitted_count,
  c.available_reservation_tokens as competition_capacity
FROM reservations r
JOIN reservation_summaries rs ON rs.reservation_id = r.id
JOIN competitions c ON c.id = r.competition_id
WHERE r.id = '[reservation-id]';
```

---

## CATEGORY 8: INVOICE GENERATION ✅ CRITICAL

**Purpose:** Test invoice creation, calculations, line items, discounts, credits

### T8.1: CD Navigate to Invoice Creation
**Priority:** P0 - Blocker
**Steps:**
1. Login as CD (empwrdance@gmail.com)
2. Navigate to Director Panel → Reservations
3. Find reservation with status "summarized"
4. Verify "Create Invoice" button visible
5. Click "Create Invoice"
6. Verify invoice form/wizard loads

**Expected:** Invoice creation accessible
**Evidence:** Screenshot

---

### T8.2: Basic Invoice Generation (No Extras)
**Priority:** P0 - Blocker
**Spec:** Phase 1 spec lines 656-720
**Steps:**
1. In invoice form:
   - Verify entries_used auto-populated (43)
   - Verify global_entry_fee shown (e.g., $50.00)
   - Verify subtotal calculated: 43 × $50 = $2,150.00
   - Verify tax rate shown (e.g., 8.5%)
   - Verify tax calculated: $2,150 × 0.085 = $182.75
   - Verify total: $2,150 + $182.75 = $2,332.75
2. Do NOT add discounts or credits
3. Click "Generate Invoice"
4. Verify success message
5. Verify invoice status = "pending"

**Expected:** Basic invoice formula correct
**Evidence:** Screenshot + SQL + manual calculation

**Database Verification:**
```sql
SELECT
  i.id,
  i.reservation_id,
  i.subtotal,
  i.tax_amount,
  i.total,
  i.line_items,
  i.status,
  i.created_at
FROM invoices i
WHERE i.reservation_id = '[reservation-id]';

-- Manual verification:
-- entries_used = 43
-- global_entry_fee = $50.00
-- Expected subtotal = $2,150.00
-- Tax (8.5%) = $182.75
-- Expected total = $2,332.75
```

---

### T8.3: Invoice with Title Upgrades
**Priority:** P1 - High
**Spec:** Phase 1 spec lines 672-679
**Steps:**
1. Before creating invoice, check how many solo entries exist
2. Assume 15 solo entries eligible for title upgrades
3. In invoice form:
   - Check "Include Title Upgrades" (if checkbox exists)
   - OR enter title upgrade count: 15
   - Verify title_upgrade_fee = $30.00
   - Verify title upgrade line item: 15 × $30 = $450.00
   - Verify new subtotal: $2,150 + $450 = $2,600.00
   - Verify tax recalculated: $2,600 × 0.085 = $221.00
   - Verify total: $2,600 + $221 = $2,821.00
4. Generate invoice

**Expected:** Title upgrades calculated correctly
**Evidence:** Screenshot + SQL line_items JSON

**Database Verification:**
```sql
SELECT line_items
FROM invoices
WHERE reservation_id = '[reservation-id]';
-- Verify line_items contains:
-- {"description": "Title Upgrades", "quantity": 15, "unit_price": 30.00, "total": 450.00}
```

---

### T8.4: Invoice with Percentage Discount
**Priority:** P1 - High
**Spec:** Phase 1 spec lines 695-702
**Steps:**
1. Create new invoice for second reservation
2. Add 10% discount:
   - Discount type: Percentage
   - Discount value: 10
   - Discount label: "Early Registration Discount"
3. Verify calculations:
   - Subtotal: $2,150.00
   - Discount (10%): -$215.00
   - Discounted subtotal: $1,935.00
   - Tax (8.5%): $164.48
   - Total: $2,099.48
4. Generate invoice

**Expected:** Percentage discount applied before tax
**Evidence:** Screenshot + SQL

---

### T8.5: Invoice with Fixed Credit
**Priority:** P1 - High
**Spec:** Phase 1 spec lines 658-664
**Steps:**
1. Create new invoice for third reservation
2. Add credit:
   - Credit amount: $200.00
   - Credit label: "Deposit from 2024 Event"
3. Verify calculations:
   - Subtotal: $2,150.00
   - Tax: $182.75
   - Total before credits: $2,332.75
   - Credit applied: -$200.00
   - Final total: $2,132.75
4. Generate invoice

**Expected:** Credits reduce final total
**Evidence:** Screenshot + SQL

---

### T8.6: Invoice with Multiple Line Items
**Priority:** P1 - High
**Steps:**
1. Create comprehensive invoice:
   - Base entries: 43 × $50 = $2,150
   - Title upgrades: 15 × $30 = $450
   - Subtotal: $2,600
   - Discount (5%): -$130
   - Discounted subtotal: $2,470
   - Tax (8.5%): $209.95
   - Total: $2,679.95
   - Credit: -$100
   - Final total: $2,579.95
2. Verify all line items in invoice
3. Generate invoice

**Expected:** Complex invoice calculated correctly
**Evidence:** Screenshot + SQL + manual calculation

---

### T8.7: Mark Invoice as Paid
**Priority:** P0 - Blocker
**Steps:**
1. As CD, find generated invoice (status = "pending")
2. Click "Mark as Paid"
3. Verify status changes to "paid"
4. Verify reservation status changes to "invoiced"
5. Verify paid_at timestamp set

**Expected:** Payment status tracking working
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT
  i.id,
  i.status,
  i.paid_at,
  r.status as reservation_status
FROM invoices i
JOIN reservations r ON r.id = i.reservation_id
WHERE i.id = '[invoice-id]';
-- invoice.status = 'paid'
-- reservation.status = 'invoiced'
```

---

### T8.8: Invoice PDF Generation (If Implemented)
**Priority:** P2 - Medium
**Steps:**
1. Find paid invoice
2. Click "Download PDF" or "View PDF"
3. Verify PDF generates
4. Verify PDF contains:
   - Studio name
   - Event name
   - Line items
   - Totals
   - Payment status

**Expected:** PDF generation working
**Evidence:** Screenshot of PDF

---

### T8.9: Invoice Calculation Precision (Decimal Rounding)
**Priority:** P0 - Blocker
**Steps:**
1. Create invoice with odd numbers:
   - 7 entries @ $47.33 = $331.31
   - Tax 8.5%: $28.16
   - Total: $359.47
2. Verify all calculations rounded to 2 decimals
3. Verify total = subtotal + tax (no rounding errors)

**Expected:** Financial precision correct
**Evidence:** SQL + manual calculation

---

### T8.10: Verify Invoice State Lifecycle
**Priority:** P0 - Blocker
**Steps:**
1. Verify invoice state transitions:
   - Created → status = "pending"
   - Marked paid → status = "paid"
   - Reservation updated → status = "invoiced"
2. Verify cannot edit invoice after marking paid
3. Verify cannot delete paid invoices

**Expected:** Invoice immutability after payment
**Evidence:** SQL + UI verification

---

## CATEGORY 9: SPLIT INVOICE BY DANCER (NEW FEATURE)

**Purpose:** Test new split invoice feature for parent invoices

### T9.1: SD Access Split Invoice Feature
**Priority:** P1 - High
**Steps:**
1. Login as SD (djamusic@gmail.com)
2. Navigate to invoices
3. Find paid invoice
4. Verify "Split by Dancer" button visible
5. Click "Split by Dancer"
6. Verify wizard/modal opens

**Expected:** Split invoice accessible to SD
**Evidence:** Screenshot

---

### T9.2: Configure Split with No Margin
**Priority:** P1 - High
**Steps:**
1. In split wizard, select margin type: "No Margin"
2. Verify preview shows:
   - List of all dancers
   - Each dancer's entry count
   - Each dancer's calculated amount (proportional)
3. Verify sum of sub-invoices = main invoice total
4. Screenshot preview

**Expected:** No markup preview correct
**Evidence:** Screenshot + manual calculation

---

### T9.3: Execute Split with No Margin
**Priority:** P1 - High
**Steps:**
1. With "No Margin" selected
2. Click "Split Invoice"
3. Verify success message
4. Verify sub-invoices created (one per dancer)
5. Verify validation badge: Green "Passed" (totals match)

**Expected:** Sub-invoices created accurately
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT
  si.dancer_name,
  si.subtotal,
  si.tax_amount,
  si.total,
  si.margin_type
FROM sub_invoices si
WHERE si.parent_invoice_id = '[invoice-id]';

-- Verify sum matches main invoice
SELECT SUM(total) as sub_total
FROM sub_invoices
WHERE parent_invoice_id = '[invoice-id]';

SELECT total as main_total
FROM invoices
WHERE id = '[invoice-id]';
-- sub_total MUST equal main_total
```

---

### T9.4: Configure Split with 10% Markup
**Priority:** P1 - High
**Steps:**
1. Create second invoice for split testing
2. Split wizard: select "Markup %"
3. Enter markup: 10
4. Verify preview shows each dancer's amount + 10%
5. Verify sum of sub-invoices = main total × 1.10

**Expected:** Markup preview correct
**Evidence:** Screenshot

---

### T9.5: Execute Split with Markup
**Priority:** P1 - High
**Steps:**
1. Confirm split with 10% markup
2. Verify sub-invoices created
3. Verify each sub-invoice = original proportion + 10%
4. Verify validation may show warning (totals don't match by design)

**Expected:** Markup applied correctly
**Evidence:** Screenshot + SQL

---

### T9.6: Split Invoice UI - Download PDFs
**Priority:** P2 - Medium
**Steps:**
1. After split complete, view sub-invoice list
2. Click "Download All PDFs" (if implemented)
3. Verify PDFs generate for each dancer
4. OR verify individual "Download PDF" buttons work

**Expected:** PDF generation ready (may be pending backend)
**Evidence:** Screenshot

---

## CATEGORY 10: EDGE CASES & VALIDATION

**Purpose:** Test boundary conditions, error handling, data validation

### T10.1: Capacity Boundary (Exact Match)
**Priority:** P0 - Blocker
**Steps:**
1. Create reservation approved for 10 entries
2. Create exactly 10 entries
3. Attempt to create 11th entry
4. Verify error message: "Reservation capacity exceeded"
5. Verify 11th entry NOT saved

**Expected:** Hard capacity limit enforced
**Evidence:** Screenshot + SQL count

---

### T10.2: Negative Age Handling (Future DOB)
**Priority:** P2 - Medium
**Steps:**
1. Attempt to create dancer with DOB in future (e.g., 2030-01-01)
2. Verify validation error
3. Verify dancer NOT saved

**Expected:** Invalid DOB rejected
**Evidence:** Screenshot

---

### T10.3: Missing Required Fields Validation
**Priority:** P1 - High
**Steps:**
1. Create entry without routine name (leave blank)
2. Attempt to save
3. Verify validation error: "Routine name is required"
4. Enter routine name, remove dancers
5. Attempt to save
6. Verify error: "Must select at least 1 dancer"

**Expected:** All required fields validated
**Evidence:** Screenshot

---

### T10.4: Special Characters in Routine Name
**Priority:** P2 - Medium
**Steps:**
1. Create entry with special chars: `Emma's Jazz: "The Dream" & More!`
2. Save
3. Verify displays correctly in dashboard
4. Click to edit
5. Verify special chars preserved

**Expected:** Special chars handled safely
**Evidence:** Screenshot + SQL

---

### T10.5: Large Dancer Count (30+ dancers in one entry)
**Priority:** P2 - Medium
**Steps:**
1. Create entry with 30 dancers (if available)
2. Verify age calculation doesn't timeout
3. Verify classification 60% rule calculated
4. Save
5. Verify entry created

**Expected:** System handles large groups
**Evidence:** Screenshot + performance note

---

### T10.6: Concurrent Entry Creation (Race Condition Test)
**Priority:** P2 - Medium
**Steps:**
1. Open 2 browser tabs as SD (same account)
2. In both tabs, navigate to entry creation
3. Create entry in Tab 1, save
4. Simultaneously create entry in Tab 2, save
5. Verify both saved successfully
6. Verify capacity counter correct (not double-counted or missed)

**Expected:** Atomic capacity updates (no race condition)
**Evidence:** SQL verification

---

### T10.7: Browser Refresh Mid-Entry Creation
**Priority:** P2 - Medium
**Steps:**
1. Start creating entry (fill half the form)
2. Press F5 (refresh)
3. Verify form data lost (expected behavior)
4. Verify no orphaned database records

**Expected:** No partial entries in database
**Evidence:** SQL showing no incomplete entries

---

### T10.8: Long Session Timeout Test
**Priority:** P2 - Medium
**Steps:**
1. Login as SD
2. Leave browser idle for 30 minutes
3. Return and attempt to create entry
4. Verify session refreshed OR redirected to login
5. Verify no errors in console

**Expected:** Session management working
**Evidence:** Screenshot

---

### T10.9: Invalid CSV Format Handling
**Priority:** P1 - High
**Steps:**
1. Create CSV with wrong column headers
2. Upload CSV
3. Verify error message: "Invalid CSV format"
4. Verify suggestions to fix format

**Expected:** Helpful error messages
**Evidence:** Screenshot

---

### T10.10: Entry Edit and Update
**Priority:** P0 - Blocker
**Steps:**
1. Create entry, save
2. Click entry to edit
3. Verify "Save and Create Another" button HIDDEN
4. Verify only "Cancel" and "Update" visible
5. Change routine name
6. Click "Update"
7. Verify changes saved
8. Verify no duplicate entry created

**Expected:** Edit mode prevents duplicates
**Evidence:** Screenshot + SQL

---

### T10.11: Entry Soft Delete and Capacity Refund
**Priority:** P0 - Blocker
**Steps:**
1. Note current capacity: e.g., "43/50"
2. Delete one entry
3. Verify entry removed from UI
4. Verify capacity refunded: "42/50"
5. Verify soft delete (deleted_at set, not hard delete)

**Expected:** Soft delete + capacity refund
**Evidence:** Screenshot + SQL

**Database Verification:**
```sql
SELECT id, routine_name, deleted_at
FROM competition_entries
WHERE id = '[deleted-entry-id]';
-- Record MUST exist with deleted_at timestamp
```

---

### T10.12: Invoice Calculation with Zero Tax Rate
**Priority:** P2 - Medium
**Steps:**
1. Temporarily update competition_settings tax_rate to 0.0000
2. Create invoice
3. Verify tax_amount = $0.00
4. Verify total = subtotal (no tax)
5. Restore tax_rate to 0.085

**Expected:** Zero tax handled correctly
**Evidence:** SQL

---

## CATEGORY 11: MULTI-TENANT VERIFICATION ✅ CRITICAL

**Purpose:** Verify complete data isolation between EMPWR and Glow tenants

### T11.1: Create Test Data on Glow Tenant
**Priority:** P0 - Blocker
**Steps:**
1. Navigate: `https://glow.compsync.net`
2. Login as CD: stefanoalyessia@gmail.com / 1CompSyncLogin!
3. Verify Glow tenant dashboard loads
4. Create test reservation for djamusic@gmail.com (if SD account exists on Glow)
5. OR create new test studio on Glow
6. Approve reservation for 20 entries
7. Logout

**Expected:** Glow tenant setup complete
**Evidence:** Screenshot + SQL

---

### T11.2: Create Entries on Glow Tenant
**Priority:** P0 - Blocker
**Steps:**
1. Login as SD on Glow tenant (djamusic@gmail.com or test account)
2. Create 10 dancers
3. Create 10 entries (solos, duets, groups)
4. Verify all entries saved
5. Note entry IDs

**Expected:** Glow data created
**Evidence:** Screenshot + SQL

---

### T11.3: Verify EMPWR Cannot See Glow Data
**Priority:** P0 - Blocker
**Steps:**
1. Navigate: `https://empwr.compsync.net`
2. Login as SD: djamusic@gmail.com
3. Navigate to entries
4. Verify ONLY EMPWR entries visible (40+ entries)
5. Verify ZERO Glow entries visible
6. Screenshot entry count

**Expected:** Complete tenant isolation
**Evidence:** Screenshot

---

### T11.4: Verify Glow Cannot See EMPWR Data
**Priority:** P0 - Blocker
**Steps:**
1. Navigate: `https://glow.compsync.net`
2. Login as SD: djamusic@gmail.com
3. Navigate to entries
4. Verify ONLY Glow entries visible (10 entries)
5. Verify ZERO EMPWR entries visible

**Expected:** Complete tenant isolation
**Evidence:** Screenshot

---

### T11.5: Database Cross-Tenant Leak Check
**Priority:** P0 - Blocker
**Steps:**
1. Run cross-tenant leak detection query
2. Verify result = 0 (no leaks)

**Database Verification:**
```sql
-- Check for cross-tenant data leaks
-- Entries referencing wrong tenant reservations
SELECT COUNT(*) as leak_count
FROM competition_entries ce
JOIN reservations r ON r.id = ce.reservation_id
WHERE ce.tenant_id != r.tenant_id;
-- MUST return 0

-- Dancers belonging to wrong tenant studios
SELECT COUNT(*) as leak_count
FROM dancers d
JOIN studios s ON s.id = d.studio_id
WHERE d.tenant_id != s.tenant_id;
-- MUST return 0

-- Invoices referencing wrong tenant reservations
SELECT COUNT(*) as leak_count
FROM invoices i
JOIN reservations r ON r.id = i.reservation_id
WHERE i.tenant_id != r.tenant_id;
-- MUST return 0
```

**Expected:** Zero leaks detected
**Evidence:** SQL results = 0

---

## EVIDENCE REQUIREMENTS CHECKLIST

For EACH test, provide:
- [ ] Screenshot saved to `evidence/screenshots/[category]-[test-id]-[tenant]-[YYYYMMDD-HHMMSS].png`
- [ ] Browser console checked via Playwright MCP (no errors)
- [ ] Database query executed and verified (where applicable)
- [ ] Tested on BOTH tenants (for cross-tenant tests)

**Naming Convention:**
```
evidence/screenshots/T4.2-solo-entry-jazz-empwr-20251107-143022.png
evidence/screenshots/T6.1-exception-button-empwr-20251107-150145.png
evidence/queries/T7.4-capacity-refund-verification-20251107-151230.sql
```

---

## AUTONOMOUS EXECUTION PROTOCOL

**When user says "continue":**

1. **Check TodoWrite** - What test is next?
2. **Mark test `in_progress`**
3. **Execute test steps systematically:**
   - Use Playwright MCP to navigate and interact (ACT AS USER)
   - Click buttons, fill forms, submit naturally
   - Capture screenshots at key moments
   - Check browser console for errors
   - Execute SQL verification queries
4. **Capture ALL evidence:**
   - Screenshot of final state
   - Console log check
   - Database verification
   - Save with proper naming convention
5. **Verify against spec:**
   - Reference spec line numbers in evidence
   - Confirm behavior matches specification
6. **Mark test `completed`** OR create `BLOCKER_[test-id].md` if failed
7. **Move to next test** in TodoWrite
8. **Repeat** until all 93 tests complete

**DO NOT:**
- ❌ Skip evidence collection
- ❌ Mark complete without all evidence items
- ❌ Test only one tenant (multi-tenant tests require both)
- ❌ Assume code works without actual testing
- ❌ Get stuck on one test >20 minutes (create blocker, move on)
- ❌ Use database shortcuts instead of UI testing

**DO:**
- ✅ Act like a real user (click, type, navigate naturally)
- ✅ Create realistic test data
- ✅ Test both happy paths AND error cases
- ✅ Create blockers for failures (don't hide them)
- ✅ Continue to next test if blocked
- ✅ Update TodoWrite in real-time
- ✅ Reference spec line numbers in evidence
- ✅ Verify database persistence for ALL data operations

---

## FINAL DELIVERABLE

**File:** `PRODUCTION_LAUNCH_TEST_RESULTS_FINAL.md`

**Must include:**
1. **Executive Summary:**
   - Total tests: 93
   - Passed: X/93
   - Failed: Y/93
   - Blocked: Z/93
   - Success rate: X%

2. **Test Results by Category** with evidence links

3. **Critical Blockers List** (if any):
   - Test ID
   - Description
   - Impact (P0, P1, P2)
   - Recommendation

4. **GO/NO-GO Recommendation:**
   - ✅ GO if: Categories 1-8 >= 90% pass, no P0 blockers, 40+ routines created
   - ⚠️ CAUTION if: 85-89% pass, P1 blockers only
   - ❌ NO-GO if: <85% pass, any P0 blockers, <30 routines created

5. **Recommendations for Launch Day Monitoring:**
   - Key metrics to watch
   - Common issues to monitor
   - Rollback procedures

6. **Multi-Tenant Verification Summary:**
   - Tenant isolation confirmed: YES/NO
   - Cross-tenant leak count: 0 (required)

---

## READY TO EXECUTE

**Starting test:** T1.1 - SA Login & System Check
**Estimated total time:** 6.5 hours
**Evidence folder:** `D:\ClaudeCode\evidence/`

**When user says "continue", begin autonomous execution following the protocol above.**
