# Summary Submission / Invoice / SubInvoice Workflow Testing

## Mission: Complete Testing of Summary → Invoice → SubInvoice → Family Invoice Workflow

Use Playwright MCP to test the complete workflow from routine summary submission through invoice generation, splitting, and verification.

---

## Test Environment & Credentials

### Production URL
**Base:** https://empwr.compsync.net

### Test Accounts

**Studio Director (SD) - Test Account:**
- Email: `djamusic@gmail.com`
- Password: `123456`
- Studio: DJA Music Studio (test studio)
- Purpose: Submit routine summary

**Competition Director (CD) - EMPWR:**
- Email: `empwrdance@gmail.com`
- Password: `1CompSyncLogin!`
- Tenant: EMPWR Dance Experience
- Purpose: Generate invoices, split by family

**Super Admin (SA) - For Setup/Debug:**
- Email: `danieljohnabrahamson@gmail.com`
- Password: `123456`
- Purpose: System verification, testing tools

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Studio Director Submits Routine Summary            │
│ - Login as SD (djamusic@gmail.com)                          │
│ - Navigate to Reservations                                   │
│ - Click "Submit Summary"                                      │
│ - Review routines, confirm submission                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: CD Generates Invoice                               │
│ - Login as CD (empwrdance@gmail.com)                        │
│ - Navigate to Invoices                                       │
│ - Click "Generate Invoice" for studio                        │
│ - Verify invoice created with all entries                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: CD Splits Invoice by Family                        │
│ - Open invoice detail                                        │
│ - Click "Split by Family" button                             │
│ - Verify sub-invoices generated per dancer/family            │
│ - Check validation (totals match parent invoice)             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Verify Family Invoices                             │
│ - View sub-invoice list                                      │
│ - Check each family invoice                                  │
│ - Verify dancer-level detail                                 │
│ - Test PDF generation (if available)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Verbose Console Logging (To Be Added)

### Key Components to Log:

**SubmitSummaryModal.tsx:**
- When modal opens
- Routine data loaded
- Summary calculation
- Submission payload
- Success/error states

**Invoice Generation:**
- Invoice creation request
- Line items calculation
- Total calculation
- Tax calculation
- Success/error states

**SubInvoice Splitting:**
- Split request initiated
- Dancer/family grouping logic
- Sub-invoice creation
- Validation checks
- Total matching verification

### Console Log Tags:

```javascript
[SUMMARY_MODAL] - Summary submission modal
[SUMMARY_SUBMIT] - Summary submission process
[INVOICE_GEN] - Invoice generation
[INVOICE_CALC] - Invoice calculations
[SUBINVOICE_SPLIT] - Sub-invoice splitting
[SUBINVOICE_VALIDATE] - Sub-invoice validation
[SUBINVOICE_CREATE] - Sub-invoice creation
```

---

## Complete Testing Workflow

### Phase 1: Studio Director - Submit Routine Summary

#### Step 1.1: Login as Studio Director

**Actions:**
1. Navigate to https://empwr.compsync.net/login
2. Fill email: `djamusic@gmail.com`
3. Fill password: `123456`
4. Click "Sign In"
5. Wait for dashboard to load

**Verification:**
- ✅ Login successful
- ✅ Dashboard loads
- ✅ Role: Studio Director
- ✅ Studio name visible in header

**Screenshot:**
- Login page
- SD dashboard

#### Step 1.2: Navigate to Reservations

**Actions:**
1. Click "Reservations" in sidebar
2. OR navigate to `/dashboard/reservations`
3. Find reservation for EMPWR competition
4. Verify reservation status: "approved" or "adjusted"

**Verification:**
- ✅ Reservations page loads
- ✅ EMPWR reservation visible
- ✅ Reservation is approved
- ✅ "Submit Summary" button visible/enabled

**Screenshot:**
- Reservations list
- Reservation card showing "Submit Summary" button

#### Step 1.3: Open Submit Summary Modal

**Actions:**
1. Click "Submit Summary" button on EMPWR reservation
2. Wait for modal to open
3. Enable console monitoring

**Expected Console Logs:**
```javascript
[SUMMARY_MODAL] Modal opened for reservation: {
  reservation_id: "...",
  studio_id: "...",
  competition_id: "...",
  entries_approved: X
}

[SUMMARY_MODAL] Loading routines...
[SUMMARY_MODAL] Routines loaded: {
  totalRoutines: X,
  readyToSubmit: Y,
  missing_data: []
}

[SUMMARY_CALC] Calculating totals: {
  subtotal: X,
  tax_amount: Y,
  total: Z,
  deposit_paid: A,
  balance_due: B
}
```

**Verification:**
- ✅ Modal opens successfully
- ✅ Shows list of routines for submission
- ✅ Shows calculated totals (subtotal, tax, total)
- ✅ Shows deposit paid (if any)
- ✅ Shows balance due
- ✅ All required routine data present

**Screenshot:**
- Submit Summary modal open
- Routine list
- Totals summary
- Console logs

#### Step 1.4: Review Routines

**For Each Routine, Verify:**
- ✅ Title visible
- ✅ Category visible
- ✅ Dancers listed
- ✅ Classification shown
- ✅ Age group shown
- ✅ Size category shown
- ✅ Price visible

**Screenshot:**
- Routines list in modal showing all details

#### Step 1.5: Submit Summary

**Actions:**
1. Click "Confirm & Submit Summary" button
2. Wait for submission to complete

**Expected Console Logs:**
```javascript
[SUMMARY_SUBMIT] Submitting summary: {
  reservation_id: "...",
  routines_count: X,
  total_amount: Y
}

[SUMMARY_SUBMIT] Payload: {
  routines: [{...}, {...}],
  totals: {...}
}

[SUMMARY_SUBMIT] Success: {
  reservation_id: "...",
  status: "summarized",
  submitted_at: "..."
}
```

**Verification:**
- ✅ Success message appears
- ✅ Modal closes
- ✅ Reservation status updates to "summarized"
- ✅ "Submit Summary" button now disabled or shows "Submitted"
- ✅ Console shows no errors

**Screenshot:**
- Success message
- Updated reservation card showing "Submitted" state
- Console logs showing success

---

### Phase 2: Competition Director - Generate Invoice

#### Step 2.1: Logout SD, Login as CD

**Actions:**
1. Click profile menu → Logout
2. Return to /login
3. Fill email: `empwrdance@gmail.com`
4. Fill password: `1CompSyncLogin!`
5. Click "Sign In"

**Verification:**
- ✅ Login successful
- ✅ CD dashboard loads
- ✅ Role: Competition Director
- ✅ EMPWR tenant name visible

**Screenshot:**
- CD dashboard

#### Step 2.2: Navigate to Invoices

**Actions:**
1. Click "Invoices" in sidebar
2. OR navigate to `/dashboard/invoices`
3. Look for DJA Music Studio in list

**Verification:**
- ✅ Invoices page loads
- ✅ List shows studios with summarized reservations
- ✅ DJA Music Studio appears
- ✅ "Generate Invoice" button visible

**Screenshot:**
- Invoices list page
- DJA Music Studio row

#### Step 2.3: Generate Invoice

**Actions:**
1. Click "Generate Invoice" for DJA Music Studio
2. Wait for generation to complete
3. Monitor console logs

**Expected Console Logs:**
```javascript
[INVOICE_GEN] Starting invoice generation: {
  studio_id: "...",
  competition_id: "...",
  reservation_id: "..."
}

[INVOICE_CALC] Calculating line items...
[INVOICE_CALC] Line items: [
  { routine_title: "...", price: X },
  { routine_title: "...", price: Y },
  ...
]

[INVOICE_CALC] Totals: {
  subtotal: X,
  tax_rate: 0.XX,
  tax_amount: Y,
  total: Z
}

[INVOICE_GEN] Invoice created: {
  invoice_id: "...",
  invoice_number: "INV-001",
  total: Z,
  line_items_count: X
}
```

**Verification:**
- ✅ Success message appears
- ✅ Invoice created
- ✅ Invoice number assigned (e.g., "INV-001")
- ✅ Status: "draft" or "pending"
- ✅ Console shows no errors

**Screenshot:**
- Success message
- Invoice generation confirmation
- Console logs

#### Step 2.4: View Invoice Detail

**Actions:**
1. Click on newly created invoice
2. OR navigate to `/dashboard/invoices/{studioId}/{competitionId}`
3. Review invoice details

**Verification:**
- ✅ Invoice detail page loads
- ✅ Studio name: DJA Music Studio
- ✅ Competition: EMPWR Dance Experience
- ✅ Invoice number visible
- ✅ Line items table shows all routines
- ✅ Subtotal matches expected
- ✅ Tax amount calculated correctly
- ✅ Total = Subtotal + Tax
- ✅ "Split by Family" button visible

**Screenshot:**
- Invoice detail page (full view)
- Line items table
- Totals section

---

### Phase 3: Split Invoice by Family

#### Step 3.1: Initiate Family Split

**Actions:**
1. On invoice detail page, click "Split by Family" button
2. Wait for split process to complete
3. Monitor console logs

**Expected Console Logs:**
```javascript
[SUBINVOICE_SPLIT] Starting family split: {
  parent_invoice_id: "...",
  total_routines: X,
  total_amount: Y
}

[SUBINVOICE_SPLIT] Grouping routines by dancer/family...
[SUBINVOICE_SPLIT] Families identified: {
  family_count: Z,
  families: [
    { family_name: "Smith", dancer_ids: [...], routine_count: X },
    { family_name: "Jones", dancer_ids: [...], routine_count: Y },
    ...
  ]
}

[SUBINVOICE_CREATE] Creating sub-invoice for family: "Smith"
[SUBINVOICE_CREATE] Line items for Smith: [{...}, {...}]
[SUBINVOICE_CALC] Smith totals: {
  subtotal: X,
  tax_amount: Y,
  total: Z
}

[SUBINVOICE_CREATE] Sub-invoice created: {
  sub_invoice_id: "...",
  family_name: "Smith",
  total: Z
}

[SUBINVOICE_VALIDATE] Validating totals...
[SUBINVOICE_VALIDATE] Validation: {
  parent_total: X,
  sub_invoices_total: Y,
  matches: true/false,
  difference: 0 or N
}
```

**Verification:**
- ✅ Success message appears
- ✅ Sub-invoices created (one per family/dancer)
- ✅ No errors in console
- ✅ Redirect to sub-invoice list OR show "View Family Invoices" button

**Screenshot:**
- Split in progress
- Success message
- Console logs showing split process

#### Step 3.2: View Sub-Invoice List

**Actions:**
1. Click "View Family Invoices" button
2. OR navigate to sub-invoice list page
3. Review sub-invoices

**Expected View:**
```
Family Invoices - DJA Music Studio

Validation: ✅ Passed / ❌ Error
Total: $X.XX matches main invoice: $X.XX

Family Name | Contact | Routines | Subtotal | Tax | Total | Actions
------------|---------|----------|----------|-----|-------|--------
Smith       | email   | 3        | $X.XX    | $Y  | $Z    | [View][PDF]
Jones       | email   | 2        | $A.XX    | $B  | $C    | [View][PDF]
...
------------|---------|----------|----------|-----|-------|--------
TOTAL       |         | 5        | $X.XX    | $Y  | $Z    |
```

**Verification:**
- ✅ Sub-invoice list displays
- ✅ Shows validation status (totals match parent)
- ✅ Lists all families
- ✅ Shows routine count per family
- ✅ Shows totals per family
- ✅ Footer totals match parent invoice
- ✅ Each sub-invoice has "View" button

**Screenshot:**
- Sub-invoice list page (full table)
- Validation status (green if passed, red if failed)

#### Step 3.3: Verify Validation

**Check Validation Box:**

**If PASSED (Green):**
```
✅ Validation Passed
All family invoices sum to main invoice total: $X.XX
```

**If FAILED (Red):**
```
❌ Validation Error
Sub-invoices total ($X.XX) does not match main invoice ($Y.XX)
Difference: $Z.XX
```

**Verification:**
- ✅ Validation passes (totals match)
- ✅ No rounding errors
- ✅ Tax distributed correctly

**If Validation Fails:**
Document in console logs:
```javascript
[SUBINVOICE_VALIDATE] ERROR: Totals mismatch!
{
  parent_invoice_total: X,
  sub_invoices_total: Y,
  difference: Z,
  sub_invoices: [{...}]
}
```

**Screenshot:**
- Validation status box

---

### Phase 4: Verify Family Invoice Details

#### Step 4.1: Open First Family Invoice

**Actions:**
1. Click "View" button on first sub-invoice
2. OR navigate to `/dashboard/invoices/family/{subInvoiceId}`

**Expected Console Logs:**
```javascript
[SUBINVOICE_DETAIL] Loading sub-invoice: {
  sub_invoice_id: "...",
  family_name: "Smith",
  parent_invoice_id: "..."
}

[SUBINVOICE_DETAIL] Loaded: {
  line_items: [{...}, {...}],
  subtotal: X,
  tax_amount: Y,
  total: Z
}
```

**Verification:**
- ✅ Sub-invoice detail page loads
- ✅ Family name displayed
- ✅ Contact info (family identifier/email)
- ✅ Line items table shows routines for THIS family only
- ✅ Each line item shows:
  - Routine title
  - Dancer name(s)
  - Category
  - Price
- ✅ Subtotal correct
- ✅ Tax amount correct
- ✅ Total correct

**Screenshot:**
- Family invoice detail page
- Line items table

#### Step 4.2: Verify Dancer-Level Detail

**For Each Line Item:**

**Expected Format:**
```
Routine: "Shine Bright"
Dancer: Emma Smith (Age 15)
Category: Jazz
Classification: Teen Solo
Price: $50.00
```

**Verification:**
- ✅ Dancer name matches routine participants
- ✅ Age displayed (if available)
- ✅ Category matches
- ✅ Price correct

**Screenshot:**
- Line item detail showing dancer info

#### Step 4.3: Test Multiple Family Invoices

**Actions:**
1. Go back to sub-invoice list
2. Open 2-3 different family invoices
3. Verify each one

**For Each Family Invoice:**
- ✅ Shows only THAT family's routines
- ✅ No routines from other families
- ✅ Totals calculated correctly
- ✅ No duplicate line items

**Screenshot:**
- Multiple family invoices showing different dancers

---

### Phase 5: Edge Case Testing

#### Test 5A: Single Dancer with Multiple Routines

**Setup:**
1. Find family with one dancer in multiple routines
2. View their sub-invoice

**Expected:**
- ✅ All routines for that dancer appear
- ✅ Each routine is a separate line item
- ✅ Total = sum of all routine prices + tax

**Screenshot:**
- Single-dancer multi-routine invoice

#### Test 5B: Family with Multiple Dancers

**Setup:**
1. Find family with siblings (multiple dancers)
2. View their sub-invoice

**Expected:**
- ✅ All routines for ALL dancers in family appear
- ✅ Line items grouped or listed per dancer
- ✅ Total = sum of all family routines + tax

**Screenshot:**
- Multi-dancer family invoice

#### Test 5C: Solo vs Group Routines

**Setup:**
1. Find sub-invoice with both solo and group routines

**Expected:**
- ✅ Solo routines: Dancer name shown
- ✅ Group routines: Multiple dancer names OR "Group" indicator
- ✅ Pricing correct for both types

**Screenshot:**
- Invoice showing mix of solo and group

#### Test 5D: Zero-Tax Competition

**Setup:**
1. If competition has 0% tax rate
2. Check sub-invoices

**Expected:**
- ✅ Tax amount: $0.00
- ✅ Total = Subtotal (no tax added)
- ✅ Validation still passes

**Screenshot:**
- Zero-tax invoice

---

### Phase 6: PDF Generation (If Available)

#### Step 6.1: Test PDF Download

**Actions:**
1. On sub-invoice detail page, look for "Download PDF" button
2. Click "Download PDF"
3. Wait for PDF to generate

**Expected Console Logs:**
```javascript
[PDF_GEN] Generating PDF for sub-invoice: {
  sub_invoice_id: "...",
  family_name: "Smith"
}

[PDF_GEN] PDF generated successfully
```

**Verification:**
- ✅ PDF downloads
- ✅ PDF opens correctly
- ✅ Contains all invoice details
- ✅ Formatted professionally

**Screenshot:**
- PDF download button
- Generated PDF (first page)

**If PDF Not Available:**
Note: "PDF generation not yet implemented - Coming Soon alert displayed"

---

### Phase 7: Email Functionality (If Available)

#### Step 7.1: Test Email Invoice

**Actions:**
1. Look for "Send Email" button on sub-invoice
2. Click "Send Email"

**Expected:**
Alert: "Send email functionality - Coming Soon!"

**Verification:**
- ✅ Button exists but shows "Coming Soon"
- ✅ No actual email sent (per email policy)

**Note:** Per CLAUDE.md email policy:
- ❌ Never send emails automatically
- 🔐 Only SA can manually send via button click

**Screenshot:**
- "Coming Soon" alert

---

### Phase 8: Bulk Operations

#### Step 8.1: Download All PDFs

**Actions:**
1. On sub-invoice list page, click "Download All PDFs"

**Expected:**
Alert: "Download All PDFs - Coming soon!"

**Verification:**
- ✅ Button shows "Coming Soon"

**Screenshot:**
- Bulk download button

#### Step 8.2: Send All Emails

**Actions:**
1. Click "Send All Emails"

**Expected:**
Alert: "Send All Emails - Coming soon!"

**Verification:**
- ✅ Button shows "Coming Soon"
- ✅ No emails sent

**Screenshot:**
- Bulk email button

---

## Console Log Requirements

### Must Log (Add to Components):

**SubmitSummaryModal.tsx:**
```typescript
console.log('[SUMMARY_MODAL] Modal opened:', { reservation_id, entries_count });
console.log('[SUMMARY_CALC] Calculated totals:', { subtotal, tax, total });
console.log('[SUMMARY_SUBMIT] Submitting with payload:', payload);
console.log('[SUMMARY_SUBMIT] Success:', { status: 'summarized' });
```

**Invoice Generation (invoice.ts router):**
```typescript
console.log('[INVOICE_GEN] Starting generation:', { studio_id, competition_id });
console.log('[INVOICE_CALC] Line items:', line_items);
console.log('[INVOICE_CALC] Totals:', { subtotal, tax, total });
console.log('[INVOICE_GEN] Created:', { invoice_id, invoice_number });
```

**SubInvoice Splitting (invoice.ts router):**
```typescript
console.log('[SUBINVOICE_SPLIT] Starting split:', { parent_invoice_id });
console.log('[SUBINVOICE_SPLIT] Families identified:', families);
console.log('[SUBINVOICE_CREATE] Creating for family:', family_name);
console.log('[SUBINVOICE_VALIDATE] Validation:', { matches, difference });
```

---

## Success Criteria

### Phase 1: Summary Submission
- ✅ SD can submit routine summary
- ✅ Routines display with all details
- ✅ Totals calculated correctly
- ✅ Reservation status updates to "summarized"
- ✅ Console logs show complete flow

### Phase 2: Invoice Generation
- ✅ CD can generate invoice for studio
- ✅ Invoice includes all summarized routines
- ✅ Line items accurate
- ✅ Subtotal, tax, total correct
- ✅ Invoice number assigned

### Phase 3: Family Splitting
- ✅ "Split by Family" button works
- ✅ Sub-invoices created (one per family/dancer)
- ✅ Validation passes (totals match)
- ✅ No rounding errors
- ✅ Console logs show split process

### Phase 4: Family Invoice Detail
- ✅ Each family invoice shows only their routines
- ✅ Dancer names displayed
- ✅ Totals correct per family
- ✅ No missing or duplicate line items

### Phase 5: Edge Cases
- ✅ Single dancer multi-routine: Works
- ✅ Multi-dancer families: Works
- ✅ Solo vs group: Both handled
- ✅ Zero-tax: Handled correctly

### Phase 6-8: Future Features
- ⏳ PDF generation: Coming soon
- ⏳ Email send: Coming soon
- ⏳ Bulk operations: Coming soon

---

## Bug Report Template

If issues found, document:

### Issue: [Name]
**Phase:** [Which phase]
**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. Step 1
2. Step 2

**Expected:**
[What should happen]

**Actual:**
[What actually happened]

**Console Logs:**
```
[Full console output]
```

**Screenshots:**
- Before
- After
- Console

**Data Integrity Impact:**
- Does it affect totals? Yes/No
- Data loss? Yes/No
- Validation failing? Yes/No

---

## Test Report Template

After testing, provide:

```markdown
# Summary/Invoice/SubInvoice Workflow Test Report

**Date:** [Date]
**Tester:** [Agent/Human]
**Environment:** Production (empwr.compsync.net)
**Test Studio:** DJA Music Studio
**Competition:** EMPWR Dance Experience

## Summary

✅ **PASSED:** X/X phases
❌ **FAILED:** X/X phases
⚠️ **ISSUES:** X found

## Phase Results

### Phase 1: Summary Submission
**Status:** ✅ PASS / ❌ FAIL
**Notes:** [Details]
**Console Logs:** [Key logs]

### Phase 2: Invoice Generation
**Status:** ✅ PASS / ❌ FAIL
**Notes:** [Details]

### Phase 3: Family Splitting
**Status:** ✅ PASS / ❌ FAIL
**Validation:** ✅ Totals match / ❌ Mismatch
**Difference:** $0.00 or $X.XX

### Phase 4: Family Invoices
**Status:** ✅ PASS / ❌ FAIL
**Families Tested:** X
**Issues:** None / [List]

### Phase 5: Edge Cases
- Single dancer: ✅ / ❌
- Multi-dancer: ✅ / ❌
- Solo vs Group: ✅ / ❌
- Zero tax: ✅ / ❌

## Validation Results

**Total Matching:**
- Parent invoice total: $X.XX
- Sub-invoices sum: $Y.YY
- Difference: $Z.ZZ
- Status: ✅ Match / ❌ Mismatch

## Issues Found

1. [Issue 1 with severity]
2. [Issue 2 with severity]

## Console Logs

[Full logs for critical operations]

## Screenshots

1. [List all screenshots]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Next Steps

- [ ] Fix critical issues
- [ ] Add verbose logging to components
- [ ] Test on Glow tenant
- [ ] Implement PDF generation
```

---

## Ready to Execute

Use Playwright MCP to:
1. Test complete workflow end-to-end
2. Verify totals and validation at each step
3. Capture console logs throughout
4. Test edge cases
5. Document any issues with evidence

**Expected Duration:** 45-60 minutes for complete testing

**Let's verify that invoice workflow! 🧾**
