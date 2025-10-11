# ChatGPT Agent Test Prompt - Round 4 E2E Testing

**CRITICAL INSTRUCTION**: Run ALL tests continuously without stopping or asking questions until the entire test suite is complete. Do NOT pause between tests. Execute all 9 tests sequentially and provide a final report at the end.

---

## Production Environment

**URL**: https://comp-portal-one.vercel.app/
**Deployment**: dpl_AcRzS4DSQ2FevvKoeVcsXjWqPnKR (READY)
**Database State**: Clean slate - 0 invoices, 0 routines, 0 dancers, 0 reservations

---

## Test Credentials

**Studio Director** (Use 1-Click Auth Button):
- Click: 🏢 Studio Director button on homepage
- OR Manual Login: demo.studio@gmail.com / StudioDemo123!

**Competition Director** (Use 1-Click Auth Button):
- Click: 🎯 Competition Director button on homepage
- OR Manual Login: demo.director@gmail.com / DirectorDemo123!

---

## Execution Instructions

**RUN CONTINUOUSLY - DO NOT STOP OR ASK QUESTIONS**

1. Execute all 9 tests in order (Tests #1-#9)
2. Do NOT pause between tests
3. Do NOT ask for confirmation to continue
4. Capture evidence (URLs, data values) for each test
5. Note any failures with exact error messages
6. Provide final summary report at the end

**If a test fails**: Document the failure and CONTINUE to next test. Do not stop.

---

## Test Suite (Execute All 9 Tests)

### Test #1: Create Reservation (Studio Director)

**Objective**: Verify SD can request reservation for competition

**Steps**:
1. Navigate to https://comp-portal-one.vercel.app/
2. Click 🏢 Studio Director button (1-click auth)
3. Navigate to Dashboard → 📋 My Reservations
4. Verify page shows "No reservations found"
5. Click "+ Create Reservation" button
6. Select Competition: "GLOW Dance - Orlando" (2026 event)
7. Request Spaces: 5 routines
8. Fill Agent Info:
   - Agent Name: Sarah Johnson
   - Agent Email: sarah@demodancestudio.com
   - Agent Phone: (555) 123-4567
9. Check both boxes (pricing + terms)
10. Click "Submit Reservation Request"
11. **VERIFY**: Success message appears
12. **VERIFY**: Reservation shows with PENDING status (yellow badge)
13. **VERIFY**: Spaces Requested: 5
14. **VERIFY**: Agent: Sarah Johnson

**Expected**: ✅ Reservation created, status = PENDING

**Document**: Reservation ID or competition name

---

### Test #2: Approve Reservation + Auto-Invoice (Competition Director)

**Objective**: Verify CD can approve reservation and invoice auto-generates

**Steps**:
1. Sign out from Studio Director
2. Click 🎯 Competition Director button (1-click auth)
3. Navigate to Dashboard → 🎪 Events
4. Select "GLOW Dance - Orlando" (2026)
5. Scroll to "Reservations" section
6. **VERIFY**: Pending reservation from Demo Dance Studio visible
7. Click "Approve" button
8. Confirm spaces: 5
9. Click "Approve" in dialog
10. **VERIFY**: Reservation status = APPROVED (green badge)
11. Navigate to Dashboard → 💰 Invoices
12. **VERIFY**: NEW invoice appears with:
    - Studio: Demo Dance Studio
    - Event: GLOW Dance - Orlando
    - Routines: 5
    - Total Amount: $420.00 (or correct calculation)
    - Payment Status: PENDING (yellow badge)
13. Click "View" on invoice
14. **VERIFY**: Line items show "Routine reservations (5 routines @ $84.00 each)"
15. **VERIFY**: Subtotal and Total correct

**Expected**: ✅ Reservation approved, invoice auto-created with correct details

**CRITICAL**: If invoice does NOT appear, this is a BLOCKER - document exact error

**Document**: Invoice total amount, payment status

---

### Test #3: Create Dancers (Studio Director)

**Objective**: Verify SD can register dancers

**Steps**:
1. Sign out from Competition Director
2. Click 🏢 Studio Director button
3. Navigate to Dashboard → 💃 My Dancers
4. Click "+ Register Dancer"
5. Fill form:
   - First Name: Emma
   - Last Name: Martinez
   - Date of Birth: 2015-03-15
   - Gender: Female
   - Status: Active
6. Click "Register Dancer"
7. **VERIFY**: Emma Martinez appears in list
8. Repeat for 2 more dancers:
   - Olivia Chen (2014-07-22, Female, Active)
   - Sophia Patel (2016-01-10, Female, Active)
9. **VERIFY**: Dashboard shows "My Dancers: 3"

**Expected**: ✅ 3 dancers registered

**Document**: Dancer names confirmed in list

---

### Test #4: Create Routine from Approved Reservation (CRITICAL)

**Objective**: Verify routine creation works without "Invalid reservation ID" error

**Steps**:
1. Navigate to Dashboard → 📋 My Reservations
2. **VERIFY**: Approved reservation shows "0/5" (0 created, 5 available)
3. Click "Create Routines" button
4. **VERIFY**: Form loads correctly (competition pre-selected)
5. **VERIFY**: Space counter: "0 of 5 available spaces"
6. **VERIFY**: No console errors (F12 → Console)
7. Fill Routine Details (Step 1):
   - Routine Title: Dreamscape
   - Category: Contemporary
   - Age Group: Junior (8-11)
   - Classification: Competitive
   - Entry Size: Group (5-9 dancers)
   - Duration: 3:30
8. Click "Next →"
9. Assign Dancers (Step 2):
   - Select all 3 dancers
10. Click "Next →"
11. Music Upload (Step 3): Skip or upload
12. Click "Next →"
13. Costume Details (Step 4):
    - Designer: Studio Costumes Inc.
    - Description: Blue and silver contemporary costumes
14. Click "Next →"
15. Review (Step 5): Verify all details
16. Click "Create Entry"
17. **VERIFY**: ✅ SUCCESS - NO "Invalid reservation ID" error
18. **VERIFY**: Success message appears
19. Navigate to Dashboard → 📋 My Reservations
20. **VERIFY**: Counter shows "1/5"
21. Navigate to Dashboard → 🎭 My Routines
22. **VERIFY**: "Dreamscape" appears in list

**Expected**: ✅ Routine created successfully without errors

**BLOCKER if fails**: Capture exact error message and console errors

**Document**: Routine title, counter updated to 1/5

---

### Test #5: Create Multiple Routines + Space Limit

**Objective**: Verify space limit enforcement and counter accuracy

**Steps**:
1. Create 2nd routine:
   - Title: Firelight
   - Category: Jazz
   - Entry Size: Solo
   - Dancer: Emma Martinez only
2. **VERIFY**: Counter updates to "2/5"
3. Create 3rd routine:
   - Title: Whirlwind
   - Category: Hip Hop
   - Entry Size: Duo
   - Dancers: Olivia Chen, Sophia Patel
4. **VERIFY**: Counter updates to "3/5"
5. Create 4th routine (any details)
6. **VERIFY**: Counter updates to "4/5"
7. Create 5th routine (any details)
8. **VERIFY**: Counter updates to "5/5"
9. **VERIFY**: Button changes to "✅ All Routines Allocated" (disabled)
10. **VERIFY**: Cannot create 6th routine

**Expected**: ✅ Space limit enforced, counter accurate

**Document**: Final counter value (5/5), button disabled state

---

### Test #6: Invoice Payment Status Update (Competition Director)

**Objective**: Verify CD can update invoice payment status

**Steps**:
1. Sign out from Studio Director
2. Click 🎯 Competition Director button
3. Navigate to Dashboard → 💰 Invoices
4. **VERIFY**: Invoice shows:
   - Routines: 5
   - Total: $420.00
   - Payment Status: PENDING
5. Click "Mark Paid" button
6. In prompt, enter: paid
7. Click OK
8. **VERIFY**: Status updates to PAID (green badge)
9. **VERIFY**: Summary stats update:
   - Paid: 1
   - Pending: 0
10. Test filtering:
    - Select "Paid" from Payment Status dropdown
    - **VERIFY**: Invoice visible
    - Select "Pending" from dropdown
    - **VERIFY**: Invoice hidden
    - Select "All Statuses"
    - **VERIFY**: Invoice visible again

**Expected**: ✅ Payment status updates, filters work

**Document**: Final payment status (PAID), stats values

---

### Test #7: CSV Download with Data (Competition Director)

**Objective**: Verify CSV export includes actual invoice data

**Steps**:
1. On /dashboard/invoices/all page
2. **VERIFY**: Invoice table shows Demo Dance Studio invoice
3. Click "📥 Download CSV" button
4. **VERIFY**: File downloads as invoices-YYYY-MM-DD.csv
5. Open CSV file
6. **VERIFY CSV contains**:
   - Header: Studio,Code,City,Event,Year,Routines,Total Amount,Payment Status
   - Data row with: "Demo Dance Studio","DEMO","Toronto","GLOW Dance - Orlando","2026","5","420.00","paid"
7. **VERIFY**: All fields populated (no "undefined" or blank)
8. **VERIFY**: Total Amount is numeric
9. **VERIFY**: Payment Status = "paid"

**Expected**: ✅ CSV exports correct data

**Document**: CSV filename, verify data row contents

---

### Test #8: Global Invoices Page Stability (Competition Director)

**Objective**: Verify global invoices page handles null values gracefully

**Steps**:
1. Stay on /dashboard/invoices/all page
2. **VERIFY**: Page loads without crash
3. Press F12 → Check Console tab
4. **VERIFY**: No red errors
5. **VERIFY**: All table cells show data OR "N/A" (never "undefined")
6. **VERIFY**: Summary stats show numbers (never NaN)
7. **VERIFY**: Payment status badge displays correctly

**Expected**: ✅ Page handles data gracefully, no crashes

**Document**: Console errors (if any), page loads successfully

---

### Test #9: Dashboard Card Layouts (Both Roles)

**Objective**: Verify both dashboards display correctly

**Steps**:

**Part A - Studio Director Dashboard**:
1. Sign out from Competition Director
2. Click 🏢 Studio Director button
3. **VERIFY**: Dashboard shows exactly 3 stats cards:
   - 💃 My Dancers
   - 🎭 My Routines
   - 📋 My Reservations
4. **VERIFY**: NO Events Capacity card visible
5. **VERIFY**: Quick Actions section shows 6 draggable cards

**Part B - Competition Director Dashboard**:
1. Sign out from Studio Director
2. Click 🎯 Competition Director button
3. **VERIFY**: First card is 💰 Invoices
4. **VERIFY**: Second card is 🎪 Events
5. **VERIFY**: All 12 cards display correctly

**Expected**: ✅ Both dashboards render correctly

**Document**: Card counts, first 2 CD cards verified

---

## Final Summary Report Format

After completing ALL 9 tests, provide this report:

```
# E2E Test Report - Round 4 (Clean Database)

**Tester**: ChatGPT Agent
**Date**: [Date]
**Deployment**: dpl_AcRzS4DSQ2FevvKoeVcsXjWqPnKR
**Production URL**: https://comp-portal-one.vercel.app/

## Test Results Summary

| Test # | Description | Status | Notes |
|--------|-------------|--------|-------|
| 1 | Create Reservation (SD) | PASS/FAIL | [Details] |
| 2 | Approve Reservation + Invoice (CD) | PASS/FAIL | [Details] |
| 3 | Create Dancers (SD) | PASS/FAIL | [Details] |
| 4 | Create Routine (SD) | PASS/FAIL | [Details] |
| 5 | Multiple Routines + Space Limit (SD) | PASS/FAIL | [Details] |
| 6 | Invoice Payment Update (CD) | PASS/FAIL | [Details] |
| 7 | CSV Download (CD) | PASS/FAIL | [Details] |
| 8 | Global Invoices Stability (CD) | PASS/FAIL | [Details] |
| 9 | Dashboard Layouts (Both) | PASS/FAIL | [Details] |

**Pass Rate**: X/9 tests (XX%)

## Critical Issues Found

[List any blocking issues]

## Final Database State

- Reservations: [Count]
- Routines: [Count]
- Dancers: [Count]
- Invoices: [Count]
- Payment Status: [Status]

## Recommendation

[ ] ✅ APPROVE FOR LAUNCH - All tests pass, no blockers
[ ] ⚠️ APPROVE WITH NOTES - Minor issues, not blocking
[ ] ❌ DO NOT LAUNCH - Critical issues remain

**Detailed Notes**:
[Your assessment]
```

---

## FINAL INSTRUCTIONS FOR AGENT

**YOU MUST**:
- Execute ALL 9 tests without stopping
- Do NOT ask questions during execution
- Do NOT pause between tests
- Capture evidence for each test
- Document failures and CONTINUE
- Provide final summary report at the end

**START TESTING NOW - DO NOT STOP UNTIL COMPLETE**
