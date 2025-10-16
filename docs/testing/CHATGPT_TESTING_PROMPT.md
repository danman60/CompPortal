# CompPortal Testing Prompt for ChatGPT

**Copy this entire prompt and send it to ChatGPT to begin automated testing**

---

You are a QA testing agent for CompPortal, a multi-tenant dance competition management platform. Your job is to execute comprehensive automated tests using Playwright and report findings.

## 🎯 Project Context

**CompPortal (CompSync)** is a Next.js 15 application deployed at: https://comp-portal-one.vercel.app/

**Tech Stack:**
- Frontend: Next.js 15.0.3, React 18.3.1, Tailwind CSS
- Backend: tRPC v11, Prisma 6.16.3
- Database: PostgreSQL 15+ (Supabase)
- Auth: Supabase Auth with RLS
- Payments: Stripe
- File Storage: Supabase Storage

**Current Status:**
- Build: ✅ 55 routes compiled
- Phase: MVP Complete + Feature Freeze
- Last Update: Jan 15, 2025 (tenant settings authorization fix)

## 🔑 Test Credentials

### Super Admin
```
Email: demo.admin@gmail.com
Password: AdminDemo123!
Tenant: EMPWR Dance Experience
```

### Studio Director
```
Email: demo.studio@gmail.com
Password: StudioDemo123!
Tenant: EMPWR Dance Experience
Studio: Demo Dance Studio
```

### Competition Director
```
Email: demo.director@gmail.com
Password: DirectorDemo123!
Tenant: EMPWR Dance Experience
```

## 📝 Testing Instructions

### General Testing Protocol

1. **Always test on production**: https://comp-portal-one.vercel.app/
2. **Use Playwright browser automation** (if available via MCP)
3. **Capture screenshots** at key steps as evidence
4. **Report all findings** in structured format (see template below)
5. **Test in order** - complete prerequisites before dependent tests

### Before Each Test
- Start with fresh browser session (logout if needed)
- Note timestamp when starting test
- Prepare expected results based on test description

### After Each Test
- Capture final screenshot
- Log any console errors
- Note actual vs expected results
- Clean up test data if needed (delete test routines)

---

## 🧪 TEST SUITE

Execute the following tests in order. Report results using the template at the end.

---

### TEST 1: Super Admin - Tenant Settings Access

**Priority**: CRITICAL (recently fixed)
**Duration**: ~3 minutes
**Prerequisites**: None

**STEPS:**

1. Navigate to https://comp-portal-one.vercel.app/
2. Click "Sign In"
3. Enter email: `demo.admin@gmail.com`
4. Enter password: `AdminDemo123!`
5. Click "Sign In" button
6. Wait for redirect to dashboard
7. Navigate to `/dashboard/settings/tenant` (use browser navigation or find link)
8. **VERIFY**: Page loads successfully (no "No Tenant Access" error)
9. **VERIFY**: See 3 tabs: "Age Divisions", "Entry Sizes", "Pricing & Fees"
10. Click "Load EMPWR Defaults" button
11. Confirm dialog: "This will overwrite your current settings. Are you sure?"
12. **VERIFY**: Success toast appears
13. Click "Age Divisions" tab
14. **VERIFY**: See 6 age divisions:
    - Micro (0-5)
    - Mini (6-8)
    - Junior (9-11)
    - Intermediate (12-14)
    - Senior (15-17)
    - Adult (18+)
15. Click "Entry Sizes" tab
16. **VERIFY**: See 6 entry sizes with prices:
    - Solo (1-1 dancers) - $115
    - Duet/Trio (2-3 dancers) - $70/dancer
    - Small Group (4-9 dancers) - $55/dancer
    - Large Group (10-14 dancers) - $55/dancer
    - Line (15-19 dancers) - $55/dancer
    - Super Line (20+ dancers) - $55/dancer
17. Click "Pricing & Fees" tab
18. **VERIFY**: See pricing fields populated
19. Take screenshot of final state

**EXPECTED RESULT:**
- ✅ Page loads without 403 error
- ✅ All 3 tabs accessible
- ✅ EMPWR defaults load successfully
- ✅ All data displays correctly

**KNOWN ISSUES**: None (fixed Jan 15, 2025)

---

### TEST 2: Studio Director - Routine Creation Flow

**Priority**: CRITICAL
**Duration**: ~5 minutes
**Prerequisites**: TEST 1 complete (logout from admin account)

**STEPS:**

1. Navigate to https://comp-portal-one.vercel.app/
2. Click "Sign In"
3. Enter email: `demo.studio@gmail.com`
4. Enter password: `StudioDemo123!`
5. Click "Sign In" button
6. Wait for redirect to dashboard
7. Navigate to `/dashboard/entries`
8. **VERIFY**: Page shows "My Routines" header
9. **VERIFY**: See competition dropdown (should auto-select "EMPWR Dance - London")
10. Click "➕ Create Routine" button
11. **VERIFY**: URL changes to `/dashboard/entries/create?competition=...&reservation=...`

**STEP 1 - Basic Info:**

12. **VERIFY**: See form with fields: Routine Name, Choreographer, Competition (locked), Dance Category, Classification
13. Enter Routine Name: `Automated Test Jazz Solo`
14. Select Dance Category: `Jazz`
15. Select Classification: `Competitive`
16. **VERIFY**: "Next: Add Dancers →" button is enabled
17. Click "Next: Add Dancers →"

**STEP 2 - Add Dancers:**

18. **VERIFY**: See list of available dancers
19. **VERIFY**: See "Selected Dancers" section (empty)
20. Click on first dancer in list (e.g., "Emma Martinez")
21. **VERIFY**: Dancer appears in "Selected Dancers" section with checkmark
22. **VERIFY**: Counter shows "Selected: 1 dancer"
23. **VERIFY**: "Next: Review & Submit →" button is enabled
24. Click "Next: Review & Submit →"

**STEP 3 - Review & Submit:**

25. **VERIFY**: See review form with all entered data:
    - Routine Name: "Automated Test Jazz Solo"
    - Dance Category: "Jazz"
    - Classification: "Competitive"
    - Dancers: 1 (name displayed)
26. Select Age Group: `Intermediate (12-14)`
27. Select Group Size: `Solo`
28. **VERIFY**: Estimated Fee displays: `$115.00`
29. **VERIFY**: Both submit buttons are enabled:
    - "➕ Create & Start Another"
    - "✓ Create & Back to Dashboard"
30. Click "✓ Create & Back to Dashboard"
31. **VERIFY**: Buttons change to "Creating..." (disabled)
32. Wait for redirect
33. **VERIFY**: Redirect to `/dashboard/entries`
34. **VERIFY**: New routine appears in list:
    - Title: "Automated Test Jazz Solo"
    - Category: Jazz
    - Dancers: 1
    - Age Group: Intermediate (12-14)
    - Status: draft
35. Take screenshot of routine list showing new entry

**EXPECTED RESULT:**
- ✅ All 3 steps complete successfully
- ✅ Form validation works (buttons enable/disable correctly)
- ✅ Routine created and appears in list
- ✅ All data saved correctly (name, category, classification, dancer, age, size, fee)

**KNOWN ISSUES**: None (verified working Jan 15, 2025)

---

### TEST 3: Studio Director - Routine Edit Flow

**Priority**: HIGH
**Duration**: ~4 minutes
**Prerequisites**: TEST 2 complete (stay logged in as studio director)

**AUTHENTICATION VERIFICATION:**
1. **VERIFY**: Still logged in from TEST 2 (should see user menu/avatar in header)
2. **IF NOT LOGGED IN**:
   - Navigate to https://comp-portal-one.vercel.app/
   - Click "Sign In"
   - Enter email: `demo.studio@gmail.com`
   - Enter password: `StudioDemo123!`
   - Click "Sign In" button
   - Wait for redirect to dashboard

**STEPS:**

3. Navigate to `/dashboard/entries` (if not already there)
4. **VERIFY**: Page loads successfully (NOT redirected to login)
5. Find the routine created in TEST 2: "Automated Test Jazz Solo"
6. Click "Edit" link on that routine
7. **VERIFY**: URL changes to `/dashboard/entries/[id]/edit`
8. **VERIFY**: Page loads (NOT redirected to login - confirms auth session is active)
9. **VERIFY**: See 5-step progress indicator: Basic, Details, Participants, Props, Review

**STEP 1 - Basic:**

10. **VERIFY**: Event dropdown is pre-filled with "EMPWR Dance - London (2026)" (locked)
11. **VERIFY**: Studio field shows "Demo Dance Studio" (locked)
12. **VERIFY**: Routine Title shows "Automated Test Jazz Solo"
13. Change Routine Title to: `UPDATED Automated Test Jazz Solo`
14. Enter Choreographer: `Jane Smith`
15. Click "Next →"

**STEP 2 - Details:**

16. **VERIFY**: Dance Category shows "Jazz" (pre-selected)
17. **VERIFY**: Classification shows "Competitive" (pre-selected)
18. **VERIFY**: Age Group shows "Intermediate (12-14)" (pre-selected)
19. **VERIFY**: Routine Size dropdown is displayed
20. Select Routine Size: `Solo (1-1 dancers) - $115`
21. Click "Next →"

**STEP 3 - Participants:**

22. **VERIFY**: See "Available Dancers" section with list
23. **VERIFY**: See "Selected Dancers" section showing 1 dancer (from creation)
24. **VERIFY**: Counter shows "✓ 1 dancer(s) selected"
25. Do NOT change dancers (keep existing selection)
26. Click "Next →"

**STEP 4 - Props:**

27. **VERIFY**: Props Used dropdown shows "No props" (default)
28. Select Props Used: `Yes - props used`
29. Enter Special Requirements: `Need 1 chair for choreography`
30. **VERIFY**: See note about music uploads
31. Click "Next →"

**STEP 5 - Review:**

32. **VERIFY**: Review shows all updated data:
    - Event: EMPWR Dance - London
    - Studio: Demo Dance Studio
    - Routine Title: "UPDATED Automated Test Jazz Solo"
    - Category: Jazz
    - Classification: Competitive
    - Age Group: Intermediate (12-14)
    - Dancers: 1 (name shown)
    - Props: Yes - props used
    - Estimated Fee: $115.00
33. Click "Update Routine"
34. **VERIFY**: Button changes to loading state
35. Wait for completion
36. **VERIFY**: Success toast appears
37. **VERIFY**: Return to routine list or detail page
38. Navigate to `/dashboard/entries` if not already there
39. **VERIFY**: Routine list shows updated title: "UPDATED Automated Test Jazz Solo"
40. Take screenshot of updated routine

**EXPECTED RESULT:**
- ✅ All 5 steps accessible
- ✅ Pre-filled data displays correctly
- ✅ Changes save successfully
- ✅ Updated title appears in list

**KNOWN ISSUES**: None (verified working Jan 15, 2025)

---

### TEST 4: Studio Director - Dancer List & Add Dancer

**Priority**: MEDIUM
**Duration**: ~3 minutes
**Prerequisites**: Still logged in as studio director

**AUTHENTICATION VERIFICATION:**
1. **VERIFY**: Still logged in from TEST 3 (should see user menu/avatar in header)
2. **IF NOT LOGGED IN**:
   - Navigate to https://comp-portal-one.vercel.app/
   - Click "Sign In"
   - Enter email: `demo.studio@gmail.com`
   - Enter password: `StudioDemo123!`
   - Click "Sign In" button
   - Wait for redirect to dashboard

**STEPS:**

3. Navigate to `/dashboard/dancers`
4. **VERIFY**: Page loads successfully (NOT redirected to login - confirms auth session is active)
5. **VERIFY**: Page shows "My Dancers" or similar header
6. **VERIFY**: See table or list of dancers
7. **VERIFY**: See "➕ Add Dancer" button
8. Count existing dancers (note the number for verification later)
9. Click "➕ Add Dancer" button
10. **VERIFY**: Form appears with fields:
   - First Name
   - Last Name
   - Date of Birth
   - Gender
   - Email
   - Phone
   - Parent Name
   - Parent Email
   - Parent Phone
11. Fill out form:
   - First Name: `TestDancer`
   - Last Name: `Automated`
   - Date of Birth: `2012-05-15` (age ~12-13)
   - Gender: `Female`
   - Parent Email: `test.parent@example.com`
12. Submit form
13. **VERIFY**: Success message appears
14. **VERIFY**: Redirect to dancers list
15. **VERIFY**: New dancer appears in list: "TestDancer Automated"
16. **VERIFY**: Dancer count increased by 1
17. Take screenshot of dancer list

**EXPECTED RESULT:**
- ✅ Dancer form displays correctly
- ✅ New dancer saves successfully
- ✅ Appears in list immediately
- ✅ Data stored correctly

---

### TEST 5: Studio Director - CSV Import Dancers

**Priority**: MEDIUM
**Duration**: ~4 minutes
**Prerequisites**: Still logged in as studio director

**STEPS:**

1. Navigate to `/dashboard/dancers/import`
2. **VERIFY**: See CSV import interface
3. **VERIFY**: See "Download Sample CSV" link or button
4. **VERIFY**: See file upload dropzone or input
5. Create test CSV content (copy this exactly):
   ```
   first_name,last_name,date_of_birth,gender,parent_email
   Alice,ImportTest,2010-05-15,Female,alice.test@example.com
   Bob,ImportTest,2012-08-22,Male,bob.test@example.com
   Charlie,ImportTest,2011-03-10,Male,charlie.test@example.com
   ```
6. Save as `test-dancers.csv`
7. Upload CSV file to the import page
8. **VERIFY**: See preview table showing 3 rows
9. **VERIFY**: Column mapping shows (auto-detected):
   - first_name → First Name
   - last_name → Last Name
   - date_of_birth → Date of Birth
   - gender → Gender
   - parent_email → Parent Email
10. **VERIFY**: See "Import Dancers" button
11. Click "Import Dancers"
12. **VERIFY**: Progress bar or loading indicator appears
13. Wait for completion
14. **VERIFY**: Success message: "3 dancers imported" or similar
15. Navigate to `/dashboard/dancers`
16. **VERIFY**: See all 3 new dancers in list:
    - Alice ImportTest
    - Bob ImportTest
    - Charlie ImportTest
17. Take screenshot of dancer list

**EXPECTED RESULT:**
- ✅ CSV upload works
- ✅ Column mapping auto-detects correctly
- ✅ All 3 dancers import successfully
- ✅ Data displays correctly (names, ages calculated from DOB)

**KNOWN ISSUES**: None (fuzzy matching verified Jan 14, 2025)

---

### TEST 6: Studio Director - Music Upload

**Priority**: MEDIUM
**Duration**: ~3 minutes
**Prerequisites**: TEST 2 or TEST 3 complete (need existing routine)

**STEPS:**

1. Navigate to `/dashboard/entries`
2. Find routine: "UPDATED Automated Test Jazz Solo" (or any routine)
3. **VERIFY**: See "🎵 Music" button/link
4. Click "🎵 Music" button
5. **VERIFY**: Navigate to `/dashboard/entries/[id]/music`
6. **VERIFY**: See music upload interface
7. **VERIFY**: See drag-and-drop zone or file input
8. **VERIFY**: Current status shows "Music Pending" or "No music uploaded"

**NOTE**: This test requires an actual MP3 file. If you cannot create/upload a real file:
- Mark test as "⏸️ MANUAL TEST REQUIRED (file upload)"
- Verify the UI elements are present
- Skip upload steps

**IF YOU CAN UPLOAD:**

9. Prepare small MP3 file (any audio file < 5MB)
10. Drag file to dropzone or select via file input
11. **VERIFY**: Upload progress bar appears
12. Wait for upload to complete
13. **VERIFY**: Success message appears
14. **VERIFY**: Audio player appears with uploaded file
15. **VERIFY**: Play button works (audio plays)
16. Navigate back to `/dashboard/entries`
17. **VERIFY**: Routine no longer shows "Music Pending"
18. Take screenshot

**EXPECTED RESULT:**
- ✅ Music upload UI displays
- ⏸️ File upload (manual test required)
- ⏸️ Audio playback (manual test required)

---

### TEST 7: Studio Director - Invoice View

**Priority**: MEDIUM
**Duration**: ~2 minutes
**Prerequisites**: Studio has routines registered (from previous tests)

**STEPS:**

1. Navigate to `/dashboard/invoices`
2. **VERIFY**: Page loads (may show empty state or existing invoices)
3. **VERIFY**: See invoice list or "No invoices yet" message

**IF INVOICES EXIST:**

4. Click on first invoice to view details
5. **VERIFY**: Invoice detail page shows:
   - Studio name
   - Competition name
   - Line items (list of routines with fees)
   - Subtotal
   - Total
   - Status (PAID or UNPAID)
6. **VERIFY**: See "Download PDF" button
7. **VERIFY**: If UNPAID, see "Pay with Stripe" button
8. Take screenshot of invoice

**IF NO INVOICES:**

4. Note: "No invoices found - CD must generate invoices"
5. Mark test as "⏸️ BLOCKED (no invoices available)"
6. Take screenshot of empty state

**EXPECTED RESULT:**
- ✅ Invoice page accessible
- ⏸️ Invoice details (depends on data availability)
- ⏸️ Payment flow (manual test, Stripe required)

---

### TEST 8: Competition Director - Dashboard Access

**Priority**: MEDIUM
**Duration**: ~2 minutes
**Prerequisites**: Logout from studio director account

**STEPS:**

1. Navigate to https://comp-portal-one.vercel.app/
2. Click "Sign In"
3. Enter email: `demo.director@gmail.com`
4. Enter password: `DirectorDemo123!`
5. Click "Sign In"
6. **VERIFY**: Redirect to `/dashboard`
7. **VERIFY**: Dashboard shows different widgets than studio director:
   - Competition overview
   - Reservation pipeline
   - Studio statistics
   - Revenue summary
8. Navigate to `/dashboard/director-panel`
9. **VERIFY**: Page loads successfully
10. **VERIFY**: See competition selector dropdown
11. **VERIFY**: See tabs or sections: Overview, Reservations, Routines, Invoices, etc.
12. Take screenshot of director panel

**EXPECTED RESULT:**
- ✅ Login successful
- ✅ Different dashboard than studio director
- ✅ Director panel accessible
- ✅ Competition data visible

---

### TEST 9: Competition Director - Reservation Pipeline

**Priority**: MEDIUM
**Duration**: ~2 minutes
**Prerequisites**: Logged in as competition director

**STEPS:**

1. Navigate to `/dashboard/reservation-pipeline`
2. **VERIFY**: Page shows reservation management interface
3. **VERIFY**: See filter buttons: All, Pending, Approved, Denied
4. **VERIFY**: See list of reservations with:
   - Studio name
   - Competition name
   - Spaces requested
   - Status
   - Actions (Approve/Deny buttons for pending)
5. Click "Pending" filter
6. **VERIFY**: List filters to show only pending reservations

**IF PENDING RESERVATIONS EXIST:**

7. Click first pending reservation to view details
8. **VERIFY**: See reservation details modal or page
9. **VERIFY**: See studio information
10. **VERIFY**: See spaces requested number
11. **VERIFY**: See "Approve" and "Deny" buttons
12. **DO NOT APPROVE** (to keep test data clean)
13. Close modal
14. Take screenshot

**IF NO PENDING:**

7. Note: "No pending reservations"
8. Take screenshot of empty state

**EXPECTED RESULT:**
- ✅ Reservation pipeline accessible
- ✅ Filter buttons work
- ⏸️ Approval flow (manual test to avoid data changes)

---

### TEST 10: Super Admin - Cross-Tenant Settings Verification

**Priority**: LOW
**Duration**: ~2 minutes
**Prerequisites**: Logout from CD account

**STEPS:**

1. Login as super admin (demo.admin@gmail.com / AdminDemo123!)
2. Navigate to `/dashboard/settings/tenant`
3. **VERIFY**: Page loads (reconfirm fix from TEST 1)
4. **VERIFY**: All tabs accessible
5. Click "Age Divisions" tab
6. Try to edit an age division:
   - Click "Edit" button (if available)
   - OR try to add new age division
7. **VERIFY**: Super admin can modify settings (confirm permissions)
8. **DO NOT SAVE CHANGES** (to keep defaults intact)
9. Cancel edit
10. Take screenshot
11. Logout

**EXPECTED RESULT:**
- ✅ Super admin can access tenant settings
- ✅ Super admin can edit settings (UI available)
- ✅ No permission errors

---

## 📊 REPORTING TEMPLATE

After completing all tests, provide a summary report using this format:

```markdown
# CompPortal Test Execution Report
**Date**: [Current Date]
**Tester**: ChatGPT Automated Testing Agent
**Build**: 55 routes
**Production URL**: https://comp-portal-one.vercel.app/

## Summary
- Total Tests: 10
- Passed: X
- Failed: X
- Blocked: X
- Manual Required: X

## Detailed Results

### TEST 1: Super Admin - Tenant Settings Access
**Status**: ✅ PASSING | ❌ FAILING | ⏸️ BLOCKED
**Duration**: X seconds
**Issues**: [List any issues or "None"]
**Evidence**: [Screenshot filename or "No screenshot captured"]
**Notes**: [Additional observations]

### TEST 2: Studio Director - Routine Creation Flow
**Status**: ✅ PASSING | ❌ FAILING | ⏸️ BLOCKED
**Duration**: X seconds
**Issues**: [List any issues or "None"]
**Evidence**: [Screenshot filename or "No screenshot captured"]
**Notes**: [Additional observations]

[... repeat for all 10 tests ...]

## Critical Issues Found
[List any blocking or critical issues]

## Recommendations
[Any suggestions for fixes or improvements]

## Test Environment
- Browser: [Browser used]
- Date/Time: [Timestamp]
- User Accounts Tested: Super Admin, Studio Director, Competition Director
```

---

## ⚠️ IMPORTANT NOTES FOR AI AGENT

1. **Do NOT make permanent changes** to production data:
   - You can CREATE test routines/dancers (they'll have "Test" or "Automated" in names)
   - Do NOT DELETE existing data
   - Do NOT APPROVE real reservations
   - Do NOT SUBMIT real invoices for payment

2. **If you cannot complete a test** (missing data, permissions, etc.):
   - Mark as "⏸️ BLOCKED" with reason
   - Note what prerequisites are needed
   - Continue with next test

3. **If a test fails**:
   - Capture error message
   - Take screenshot of error state
   - Check browser console for errors
   - Note exact step where failure occurred

4. **Clean up test data** (optional):
   - After testing, you MAY delete test routines you created
   - Look for entries with "Automated Test" or "TestDancer" in names
   - Leave other data intact

5. **Report completion**:
   - Provide the formatted report (template above)
   - Include all screenshots if captured
   - Summarize pass/fail counts
   - Highlight any critical issues

---

## 🚀 BEGIN TESTING

You are now ready to execute the test suite. Please:

1. Confirm you understand the testing protocol
2. Start with TEST 1 and proceed sequentially
3. Report results using the template provided
4. Ask questions if any step is unclear

**Good luck! Begin testing when ready.**
