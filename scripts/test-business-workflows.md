# Business Workflow Testing - Production

**Purpose**: Test actual user workflows on production using Playwright MCP
**URL**: https://www.compsync.net
**Method**: Follow real business logic, not mock data

## Studio Director (SD) Workflow Tests

### Test 1: Account Creation and Email Verification
**Status**: Manual - requires email verification
**Steps**:
1. Navigate to /signup
2. Fill registration form
3. Verify email confirmation sent
4. Click email link
5. Confirm account activated

**Success Criteria**:
- Account created
- Email received
- Login successful

---

### Test 2: Studio Details / Onboarding
**User**: danieljohnabrahamson@gmail.com / 123456
**Route**: /dashboard/settings/profile or /onboarding

**Steps**:
1. Login
2. Navigate to studio settings
3. Verify required fields save
4. Check studio profile completeness

**Success Criteria**:
- All fields persist after save
- No validation errors
- Studio data visible on dashboard

**Playwright Commands**:
```
navigate(https://www.compsync.net/login)
fill_form([email, password])
click("Sign In")
navigate(/dashboard/settings/profile)
snapshot() // Check fields present
```

---

### Test 3: Importing Dancers (CSV)
**Route**: /dashboard/dancers/import

**Steps**:
1. Navigate to dancers import page
2. Upload CSV file
3. Verify import success
4. Check error handling for duplicates
5. Confirm dancers appear in list

**Success Criteria**:
- CSV upload successful
- Duplicate detection works
- All dancers listed in /dashboard/dancers

**Test Data**: Need sample CSV

---

### Test 4: Importing Routines (CSV)
**Route**: /dashboard/entries/import

**Steps**:
1. Navigate to entries import
2. Upload routines CSV
3. Verify mapping to dancers
4. Check mapping to competition

**Success Criteria**:
- Routines import successfully
- Dancers correctly linked
- Competition correctly linked

---

### Test 5: Creating and Submitting Reservations
**Route**: /dashboard/reservations/new

**Steps**:
1. Navigate to create reservation
2. Select competition from dropdown
3. Enter spaces requested
4. Submit reservation
5. Verify confirmation message

**Success Criteria**:
- Competition dropdown populated (4 comps)
- Form validates correctly
- Reservation created
- Appears in /dashboard/reservations list

**Playwright Commands**:
```
navigate(/dashboard/reservations/new)
snapshot() // Should see competition dropdown
click(competition_dropdown)
select_option(["EMPWR Dance - London"])
type(spaces_field, "10")
click("Submit")
wait_for(text="Reservation created")
navigate(/dashboard/reservations)
snapshot() // Should see new reservation
```

**Known Issues**:
- Dropdown empty (needs latest deployment with tenant fix)

---

### Test 6: Creating Dancers Manually
**Route**: /dashboard/dancers/add or /dashboard/dancers/new

**Steps**:
1. Navigate to add dancer
2. Fill form (first name, last name, DOB)
3. Submit
4. Check duplication warning works

**Success Criteria**:
- Form validates
- Dancer created
- Duplicate detection works

---

### Test 7: Creating Routines Manually
**Route**: /dashboard/entries/create

**Steps**:
1. Navigate to create routine
2. Select competition
3. Select dancer(s)
4. Enter routine details (name, category, age division)
5. Submit

**Success Criteria**:
- Only shows competitions with approved reservations
- Dancer dropdown populated
- Entry created successfully

**Business Logic**:
- MUST have approved reservation before creating routines

---

### Test 8: Submitting Summaries
**Route**: /dashboard/routine-summaries or /dashboard/entries

**Steps**:
1. Navigate to entries
2. Review routine list
3. Submit summary/finalize
4. Check token refund logic
5. Verify submission notification

**Success Criteria**:
- Summary submitted
- Tokens refunded if applicable
- Notification shown

---

### Test 9: Receiving Invoices
**Route**: /dashboard/invoices

**Steps**:
1. Navigate to invoices
2. Check invoice visibility
3. Test download link
4. Verify invoice details match submissions

**Success Criteria**:
- Invoice visible
- PDF downloadable
- Totals correct

---

## Competition Director (CD) Workflow Tests

### Test 10: Receiving and Approving Reservations
**User**: CD account (need credentials)
**Route**: /dashboard/reservations or /dashboard/director-panel

**Steps**:
1. Login as CD
2. Navigate to reservations
3. See pending reservations
4. Approve reservation
5. Verify dashboard updates

**Success Criteria**:
- Pending reservations visible
- Approval updates status
- SD notified

---

### Test 11: Receiving and Approving Summaries
**Route**: /dashboard/routine-summaries

**Steps**:
1. Navigate to summaries
2. Review routine count
3. Check accuracy
4. Approve summary

**Success Criteria**:
- Routine count accurate
- Approval triggers invoice generation

---

### Test 12: Generating and Sending Invoices
**Route**: /dashboard/invoices/all

**Steps**:
1. Navigate to all invoices
2. Generate invoice for studio
3. Send invoice
4. Verify studio receives it

**Success Criteria**:
- Invoice generated with correct totals
- Studio sees invoice in their dashboard

---

### Test 13: Viewing Routines, Reservations, Dancers
**Route**: /dashboard/entries, /dashboard/reservations, /dashboard/dancers

**Steps**:
1. Navigate to each section
2. Verify real-time data sync
3. Check permissions (CD sees all studios)

**Success Criteria**:
- All data visible
- No permission errors
- Data accurate

---

## Error Tracking Format

Log errors to `test-errors.md`:

```markdown
| URL | Error | Design Issue | Status |
|-----|-------|--------------|--------|
| /dashboard/reservations/new | Competition dropdown empty | Data not loading from API | Needs deployment |
| /dashboard/entries/create | Button disabled | No approved reservations | Working as designed |
```

---

## Automated Test Execution Plan

### Phase 1: Login and Navigation
- Test all routes load without errors
- Check for console errors
- Verify no 500 responses

### Phase 2: SD Workflow
- Test reservation creation
- Test dancer creation
- Test entry creation

### Phase 3: CD Workflow
- Test reservation approval
- Test invoice generation

### Phase 4: Integration
- Full end-to-end: SD creates → CD approves → SD receives invoice

---

## Playwright MCP Test Script Template

```typescript
// Login
await navigate('https://www.compsync.net/login');
await fill_form([
  {name: 'Email', type: 'textbox', ref: 'email-input', value: 'user@example.com'},
  {name: 'Password', type: 'textbox', ref: 'password-input', value: 'password'}
]);
await click({element: 'Sign In', ref: 'submit-button'});

// Navigate and test
await navigate('/dashboard/reservations/new');
const snapshot = await browser_snapshot();

// Check for errors
const errors = await console_messages({onlyErrors: true});
if (errors.length > 0) {
  // Log to test-errors.md
}

// Take screenshot if errors
if (hasErrors) {
  await take_screenshot({filename: 'error-reservations-new.png'});
}
```

---

## Success Metrics

- **0 Console Errors**: All pages load cleanly
- **0 Network 500s**: All API calls succeed
- **100% Navigation**: All routes accessible
- **Business Logic**: Workflows follow rules (e.g., no entries without approved reservations)
- **Data Accuracy**: Real data from database, no hardcoded values

---

## Next Steps

1. Run automated Playwright tests on all routes
2. Log errors to test-errors.md
3. Fix critical workflow blockers
4. Re-test after fixes
5. Repeat until all tests pass
