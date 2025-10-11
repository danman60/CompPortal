# Quick Test Plan - Critical Issues Verification

**Date**: October 7, 2025
**Priority**: High
**Time Required**: 35-40 minutes total

---

## 📊 Test Summary

| Test | Priority | Time | Status |
|------|----------|------|--------|
| Account Confirmation | Recommended | 5 min | ⏳ Optional - verify integration |
| Invoice Auto-Generation | **REQUIRED** | 15 min | ⏳ Must complete |
| Routine Creation | **REQUIRED** | 15 min | ⏳ Must complete |

---

## 🧪 Test 1: Account Confirmation (Optional - 5 minutes)

**Purpose**: Verify Vercel-Supabase integration correctly handles confirmation emails

**Why Optional**: Code analysis shows integration should work automatically

### Prerequisites
- Temp email service (e.g., https://temp-mail.org or https://guerrillamail.com)
- Incognito/private browser window

### Steps
1. Open incognito browser
2. Navigate to: https://comp-portal-one.vercel.app/signup
3. Enter temp email and password (min 6 characters)
4. Click "Sign Up"
5. Check temp email inbox for confirmation

### Expected Result
✅ Confirmation email arrives
✅ Link URL is: `https://comp-portal-one.vercel.app/auth/callback?token=...`
✅ Clicking link activates account
✅ Redirects to dashboard
✅ Can log in with new account

### If Test Fails
- Check spam folder first
- Verify email arrived but check URL in link
- If URL is localhost: See SUPABASE_AUTH_WORKAROUND.md
- Fallback: Manual user confirmation via Supabase dashboard

---

## 🧪 Test 2: Invoice Auto-Generation (REQUIRED - 15 minutes)

**Purpose**: Confirm reservation approval automatically creates invoice

**Previous Fix**: Commit 17efaa0 (Oct 6, 2025)

### Test Credentials
- Competition Director: `demo.director@gmail.com`
- Password: `DirectorDemo123!`

### Prerequisites
- At least 1 PENDING reservation exists
- If none: Create one as Studio Director first

### Steps

#### Part 1: Approve Reservation
1. Log in as Competition Director
2. Navigate to **Events** page
3. Find competition with PENDING reservation
4. Click **Approve** button on reservation card
5. Wait for success toast notification
6. Note the studio name and competition

#### Part 2: Verify Invoice Creation (CD View)
7. Navigate to **Invoices → All Invoices**
8. Search for the studio/competition combination
9. Verify invoice exists with:
   - Status: UNPAID
   - Amount: Correct (spaces × entry fee)
   - Studio name correct
   - Competition correct

#### Part 3: Verify Invoice Visibility (SD View)
10. Log out
11. Log in as Studio Director (`demo.studio@gmail.com`, `StudioDemo123!`)
12. Navigate to **Invoices** page
13. Verify same invoice is visible
14. Check invoice details match

### Expected Results
✅ Reservation status changes to APPROVED (green badge)
✅ Invoice auto-generates immediately
✅ Invoice status is UNPAID
✅ Invoice visible to Competition Director
✅ Invoice visible to Studio Director
✅ Invoice amount correct
✅ Email sent to Studio Director (check if possible)

### If Test Fails

**Symptom**: No invoice created
- Check browser console for errors
- Check `src/server/routers/reservation.ts:538-555`
- Verify competition has `entry_fee` set
- Check database: `SELECT * FROM invoices WHERE studio_id = '...'`

**Symptom**: Invoice created with null values
- Check `AllInvoicesList.tsx:202,208,244-264` null handling
- Verify fix from Commit 50b3b31

**Symptom**: Invoice not visible to Studio Director
- Check RLS policies on invoices table
- Verify studio_id matches user's studio

---

## 🧪 Test 3: Routine Creation Validation (REQUIRED - 15 minutes)

**Purpose**: Confirm routine creation links to correct reservation

**Previous Fix**: Commit c9ffce4 (Oct 6, 2025)

### Test Credentials
- Studio Director: `demo.studio@gmail.com`
- Password: `StudioDemo123!`

### Prerequisites
- At least 1 APPROVED reservation with available spaces
- If none: Have CD approve a reservation first

### Test 3A: Single Reservation (5 minutes)

#### Steps
1. Log in as Studio Director
2. Navigate to **Reservations** page
3. Find APPROVED reservation with available spaces
4. Note current space count (e.g., "3 / 10")
5. Click **Create Routines** button
6. Fill form:
   - Routine Title: "Test Routine 1"
   - Category: Any
   - Add at least 1 participant
7. Submit form

#### Expected Results
✅ Form opens correctly
✅ Routine creates successfully
✅ No "Invalid Reservation ID" error
✅ Space counter increments (e.g., "3 / 10" → "4 / 10")
✅ Routine appears in Routines list
✅ Routine shows correct reservation linkage

### Test 3B: Multi-Reservation (10 minutes)

**Purpose**: Verify form handles multiple reservations for same competition correctly

#### Prerequisites
- Need 2 APPROVED reservations for same competition
- If only 1 exists: Create and approve a 2nd reservation first

#### Steps
1. Navigate to **Reservations** page
2. Identify 2 approved reservations for same competition
3. Note space counts for both:
   - Reservation A: "X / Y"
   - Reservation B: "X / Z"
4. Click **Create Routines** on **Reservation A**
5. Create routine (note space count after)
6. Go back to Reservations page
7. Click **Create Routines** on **Reservation B**
8. Create another routine
9. Check space counters updated independently
10. Navigate to **Routines** page
11. Verify each routine links to correct reservation

#### Expected Results
✅ Each "Create Routines" button passes correct reservation_id
✅ Each routine creates under correct reservation
✅ Space counters update independently:
   - Reservation A: Space count +1
   - Reservation B: Space count +1
✅ Form doesn't confuse reservations
✅ Both routines visible in Routines list
✅ Each routine shows correct reservation info

### If Test Fails

**Symptom**: "Invalid Reservation ID" error
- Check browser console for actual error
- Verify URL includes both `competition_id` and `reservation_id` params
- Check `src/components/EntryForm.tsx:79-84,147-150`

**Symptom**: Routine links to wrong reservation
- Check URL parameters on "Create Routines" button
- Verify `ReservationsList.tsx:679` passes both IDs

**Symptom**: Space counter doesn't update
- Refresh page and check
- Verify tRPC cache invalidation working
- Check network tab for successful mutation

---

## 📋 Test Results Template

Copy this template to track results:

```markdown
## Test Results - [Date]

### Test 1: Account Confirmation
- Status: [ ] Pass / [ ] Fail / [x] Skipped
- Notes:

### Test 2: Invoice Auto-Generation
- Status: [ ] Pass / [ ] Fail
- Reservation approved: [Studio Name] - [Competition]
- Invoice ID: [ID]
- Invoice visible to CD: [ ] Yes / [ ] No
- Invoice visible to SD: [ ] Yes / [ ] No
- Notes:

### Test 3A: Routine Creation (Single Reservation)
- Status: [ ] Pass / [ ] Fail
- Routine Title: Test Routine 1
- Space count before: [ / ]
- Space count after: [ / ]
- Notes:

### Test 3B: Routine Creation (Multi-Reservation)
- Status: [ ] Pass / [ ] Fail / [x] Skipped (if no 2nd reservation)
- Reservation A spaces: [ / ] → [ / ]
- Reservation B spaces: [ / ] → [ / ]
- Notes:

### Overall Result
- [ ] All tests pass - issues resolved
- [ ] Some tests fail - needs investigation
- [ ] Cannot test - blockers exist
```

---

## 🚨 If Tests Fail

1. **Document failure details**:
   - Exact error messages
   - Browser console errors
   - Network tab requests/responses
   - Database state (if accessible)

2. **Check recent fixes**:
   - Invoice auto-gen: `reservation.ts:538-555`
   - Routine creation: `EntryForm.tsx` + `ReservationsList.tsx:679`
   - Space limits: `entry.ts:327-365`

3. **Report with details**:
   - Test number that failed
   - Expected vs actual behavior
   - Screenshots if possible
   - Steps to reproduce

---

## ✅ Success Criteria

**All 5 Critical Issues Verified**:
- ✅ Issue #1: Account confirmations work (optional test)
- ✅ Issue #2: Email templates branded (verified)
- ✅ Issue #3: Invoices auto-generate (Test 2 passes)
- ✅ Issue #4: Routine creation works (Test 3 passes)
- ✅ Issue #5: Space limits enforced (previous tests confirmed)

**Ready for Production**: All REQUIRED tests pass

---

**Next Steps After Testing**:
- If all pass: Mark issues as resolved, move to backlog work
- If any fail: Debug specific failure, apply fix, retest
- Document results in PROJECT_STATUS.md
