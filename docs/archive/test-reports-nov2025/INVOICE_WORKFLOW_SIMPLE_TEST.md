# Invoice Workflow Test - Using Existing Production Data

**Date:** November 5, 2025
**Environment:** Production (https://empwr.compsync.net)
**Build Version:** 6ec2330

---

## Test Objective

Test the complete Summary → Invoice → SubInvoice workflow using the existing danieljohnabrahamson@gmail.com account and the reservation with 15 CSV-imported routines.

**Workflow Steps:**
1. SD: Submit routine summary for reservation
2. CD: Approve the summary
3. CD: Generate invoice from approved summary
4. SD: Split invoice into sub-invoices by dancer
5. Verify: Check all calculations and data accuracy

---

## Test Accounts

**Studio Director (SD):**
- Email: `djamusic@gmail.com`
- Password: `123456`
- Role: Studio Director for test studio

**Competition Director (CD):**
- Email: `empwrdance@gmail.com`
- Password: `1CompSyncLogin!`
- Role: Competition Director for EMPWR tenant

**Super Admin (SA):**
- Email: `danieljohnabrahamson@gmail.com`
- Password: `123456`
- Role: Super Admin (can act as both SD and CD)

---

## Phase 1: Studio Director - Submit Routine Summary

**Login:** Use SA account acting as SD
- Navigate to: https://empwr.compsync.net/login
- Email: `danieljohnabrahamson@gmail.com`
- Password: `123456`

**Steps:**
1. Navigate to `/dashboard/reservations`
2. Find the reservation with 15 routines created from CSV import
3. Verify reservation status is "approved" or "adjusted"
4. Click "Submit Summary" button
5. Review modal showing:
   - Competition name
   - Number of routines created
   - Number of spaces confirmed
   - Spaces to refund (if any)

**Console Logs to Monitor:**
```javascript
[SUMMARY_MODAL] Modal opened: {
  reservation_id: "...",
  studio_id: "...",
  competition_id: "...",
  competition_name: "...",
  routines_created: 15,
  spaces_confirmed: ...,
  is_incomplete: true/false,
  spaces_to_refund: ...
}
```

**Actions:**
6. Click "Confirm Submit" or "Submit Anyway" button
7. Wait for success message

**Console Logs to Monitor:**
```javascript
[SUMMARY_SUBMIT] Submitting summary: {
  studioId: "...",
  competitionId: "...",
  routines_count: 15,
  confirmed_spaces: ...
}

[SUMMARY_SUBMIT] Success: {
  reservation_id: "...",
  status: "summarized"
}
```

**Verification:**
- ✅ Reservation status changed to "summarized"
- ✅ "Submit Summary" button no longer visible
- ✅ Success toast message displayed
- ✅ Console logs show correct data flow

**Screenshot:**
- Modal with summary details
- Success confirmation
- Updated reservation status

---

## Phase 2: Competition Director - Approve Summary

**Login:** Switch to CD account
- Navigate to: https://empwr.compsync.net/login
- Email: `empwrdance@gmail.com`
- Password: `1CompSyncLogin!`

**Steps:**
1. Navigate to `/dashboard/director-panel` or `/dashboard/routine-summaries`
2. Find the submitted summary from test studio
3. Review summary details:
   - Studio name
   - Competition name
   - Number of routines
   - Total fees
4. Click "Approve" or verify it's already approved

**Verification:**
- ✅ Summary visible in CD panel
- ✅ All 15 routines listed
- ✅ Totals calculated correctly
- ✅ Status ready for invoicing

**Screenshot:**
- Summary list
- Summary details

---

## Phase 3: Competition Director - Generate Invoice

**Steps:**
1. From routine summaries or director panel
2. Click "Generate Invoice" for the approved summary
3. Wait for invoice generation

**Console Logs to Monitor:**
```javascript
[INVOICE_GEN] Starting invoice generation: {
  reservation_id: "...",
  user_id: "...",
  tenant_id: "...",
  spaces_confirmed: ...
}

[INVOICE_GEN] Reservation loaded: {
  studio_id: "...",
  studio_name: "...",
  competition_id: "...",
  competition_name: "...",
  status: "summarized"
}

[INVOICE_CALC] Fetching entries for invoice generation: {
  reservation_id: "...",
  tenant_id: "..."
}

[INVOICE_CALC] Entries loaded: {
  entries_count: 15,
  entry_ids: [...],
  entry_numbers: [...],
  entry_titles: [...]
}

[INVOICE_CALC] Line items calculated: {
  line_items_count: 15,
  line_items: [
    {entry_number: "...", title: "...", entry_fee: ..., late_fee: ..., total: ...},
    ...
  ]
}

[INVOICE_CALC] Invoice totals calculated: {
  line_items_count: 15,
  subtotal: ...,
  total: ...
}

[INVOICE_GEN] Starting transaction for invoice creation

[INVOICE_GEN] Creating invoice record: {
  tenant_id: "...",
  studio_id: "...",
  competition_id: "...",
  reservation_id: "...",
  subtotal: ...,
  total: ...,
  status: "DRAFT"
}

[INVOICE_GEN] Invoice created successfully: {
  invoice_id: "...",
  status: "DRAFT"
}

[INVOICE_GEN] Updating reservation status to invoiced: {
  reservation_id: "...",
  old_status: "summarized",
  new_status: "invoiced",
  spaces_confirmed: ...
}

[INVOICE_GEN] Reservation updated successfully

[INVOICE_GEN] Transaction completed successfully: {
  invoice_id: "...",
  reservation_id: "...",
  total: ...
}
```

**Verification:**
- ✅ Invoice created successfully
- ✅ Invoice ID returned
- ✅ Reservation status changed to "invoiced"
- ✅ All 15 routines appear as line items
- ✅ Subtotal = sum of all entry fees
- ✅ Tax calculated correctly
- ✅ Total = subtotal + tax

**Manual Verification:**
4. Navigate to invoice detail page
5. Review line items:
   - Each routine appears once
   - Entry numbers match
   - Titles match
   - Fees match competition settings
6. Verify totals at bottom:
   - Subtotal
   - Tax (13% or competition setting)
   - Total

**Screenshot:**
- Invoice generation confirmation
- Invoice detail page showing all line items
- Console logs showing calculation

**Data to Record:**
```
Invoice ID: [from console]
Subtotal: [from UI and console]
Tax Rate: [from UI]
Tax Amount: [from UI]
Total: [from UI and console]
Line Items Count: 15
```

---

## Phase 4: Mark Invoice as PAID (Required for Splitting)

**Important:** Invoice must be marked as PAID before it can be split into sub-invoices.

**Steps:**
1. On invoice detail page
2. Click "Mark as Paid" button (or equivalent)
3. Confirm action
4. Verify status changes to "PAID"

**Verification:**
- ✅ Invoice status = "PAID"
- ✅ "Split by Family" or "Split by Dancer" button now visible/enabled

**Screenshot:**
- Invoice marked as paid
- Split button visible

---

## Phase 5: Studio Director - Split Invoice by Dancer

**Login:** Switch back to SA account acting as SD
- Email: `danieljohnabrahamson@gmail.com`
- Password: `123456`

**Steps:**
1. Navigate to `/dashboard/invoices`
2. Find the PAID invoice for this competition
3. Open invoice detail page
4. Click "Split by Dancer" or "Split by Family" button
5. Wait for sub-invoice generation

**Console Logs to Monitor:**
```javascript
[SUBINVOICE_SPLIT] Starting invoice split: {
  invoice_id: "...",
  user_id: "...",
  user_role: "super_admin",
  tenant_id: "..."
}

[SUBINVOICE_SPLIT] Invoice loaded: {
  invoice_id: "...",
  studio_id: "...",
  studio_name: "...",
  competition_id: "...",
  competition_name: "...",
  status: "PAID",
  total: ...
}

[SUBINVOICE_SPLIT] Extracting entries from invoice: {
  line_items_count: 15,
  entry_ids: [...]
}

[SUBINVOICE_SPLIT] Entries with participants loaded: {
  entries_count: 15,
  total_participants: ...,
  entries_detail: [
    {entry_id: "...", entry_number: "...", title: "...", total_fee: ..., participants_count: ..., dancers: [...]},
    ...
  ]
}

[SUBINVOICE_SPLIT] Building dancer-level sub-invoices

[SUBINVOICE_SPLIT] Processing entry for split: {
  entry_id: "...",
  entry_number: "...",
  title: "...",
  entry_total: ...,
  total_dancers: ...,
  share_per_dancer: ...
}

[SUBINVOICE_SPLIT] Creating new dancer entry in map: {
  dancer_id: "...",
  dancer_name: "...",
  parent_email: "..."
}

[SUBINVOICE_SPLIT] Added line item to dancer: {
  dancer_id: "...",
  dancer_name: "...",
  entry_title: "...",
  dancer_share: ...,
  new_subtotal: ...
}

[SUBINVOICE_SPLIT] Dancer map built: {
  unique_dancers: ...,
  dancers: [
    {dancer_id: "...", dancer_name: "...", entries_count: ..., subtotal: ...},
    ...
  ]
}

[SUBINVOICE_VALIDATE] Calculating tax and totals: {
  tax_rate: 13,
  dancers_count: ...,
  invoice_total: ...
}

[SUBINVOICE_VALIDATE] Dancer totals calculated: {
  dancer_id: "...",
  dancer_name: "...",
  subtotal: ...,
  tax_amount: ...,
  total: ...
}

[SUBINVOICE_VALIDATE] Checking totals match: {
  main_invoice_total: ...,
  calculated_total: ...,
  difference: 0.00,
  acceptable: true
}

[SUBINVOICE_VALIDATE] Applied rounding adjustment to last dancer: {
  dancer_id: "...",
  dancer_name: "...",
  old_total: ...,
  adjustment: 0.01,
  new_total: ...
}

[SUBINVOICE_CREATE] Deleting existing sub-invoices for regeneration: {
  parent_invoice_id: "..."
}

[SUBINVOICE_CREATE] Deleted existing sub-invoices: {
  count: 0
}

[SUBINVOICE_CREATE] Creating sub-invoices in transaction: {
  dancers_count: ...
}

[SUBINVOICE_CREATE] Creating sub-invoice for dancer: {
  dancer_id: "...",
  dancer_name: "...",
  subtotal: ...,
  tax_amount: ...,
  total: ...,
  line_items_count: ...
}

[SUBINVOICE_CREATE] Sub-invoices created successfully: {
  count: ...,
  sub_invoice_ids: [...],
  total_sum: ...
}
```

**Verification:**
- ✅ Sub-invoices generated (one per unique dancer)
- ✅ Success message displayed
- ✅ Redirect to sub-invoices list or main invoice updated

**Critical Validation:**
6. **Check total_sum matches main invoice total**
   - From console: `[SUBINVOICE_VALIDATE] Checking totals match`
   - `difference: 0.00` or `difference: 0.01` (acceptable rounding)
   - `acceptable: true`

**Screenshot:**
- Split confirmation
- Console logs showing validation
- Sub-invoices list

---

## Phase 6: Verify Sub-Invoice Details

**Steps:**
1. Navigate to sub-invoices list (or view from main invoice)
2. Count sub-invoices - should equal number of unique dancers across all 15 routines
3. For EACH sub-invoice:

**Sub-Invoice Checklist (Per Dancer):**
- [ ] Dancer name displayed correctly
- [ ] Only shows routines that dancer participated in
- [ ] Line items show correct entry numbers and titles
- [ ] For each line item:
  - [ ] Shows total dancers in routine
  - [ ] Shows dancer's share (total / dancers)
  - [ ] Share amount correct (e.g., $50 / 2 dancers = $25 per dancer)
- [ ] Subtotal = sum of all dancer shares
- [ ] Tax calculated on subtotal (13% or competition rate)
- [ ] Total = subtotal + tax
- [ ] Rounding is reasonable (pennies, not dollars)

**Manual Calculation Example:**
```
Dancer: Emma Smith
Routines:
  1. "Shine Bright" (Solo) - $50 / 1 dancer = $50.00
  2. "Fire Within" (Solo) - $50 / 1 dancer = $50.00
  3. "Dreamer" (Duet) - $60 / 2 dancers = $30.00

Subtotal: $130.00
Tax (13%): $16.90
Total: $146.90
```

**Verification:**
4. Open 3-5 random sub-invoices
5. Verify line items match routines from CSV
6. Verify calculations are correct
7. Check for any obvious errors:
   - Negative amounts
   - Zero totals
   - Missing line items
   - Duplicate charges

**Screenshot:**
- Sub-invoices list showing all dancers
- Detail view of 2-3 sub-invoices
- Calculation verification

**Data to Record:**
```
Number of Sub-Invoices: [count]
Sum of All Sub-Invoice Totals: [sum]
Main Invoice Total: [from Phase 3]
Match: YES/NO
Difference (if any): $0.00
```

---

## Phase 7: Cross-Reference with Original Entries

**Steps:**
1. Navigate to `/dashboard/entries`
2. Filter by competition or reservation
3. Verify all 15 routines appear
4. For 3-5 sample routines:
   - Note the routine title
   - Note the dancers
   - Note the total fee
5. Cross-reference with sub-invoices:
   - Each dancer in routine should have corresponding line item in their sub-invoice
   - Line item amount should be total fee / number of dancers

**Verification:**
- ✅ All routines accounted for
- ✅ All dancers accounted for
- ✅ No missing charges
- ✅ No duplicate charges
- ✅ Math checks out

**Screenshot:**
- Entries list
- Sample entry detail
- Corresponding sub-invoice line items

---

## Success Criteria

### ✅ Phase 1: Summary Submission
- [x] Modal shows correct data
- [x] Submission succeeds
- [x] Reservation status → "summarized"
- [x] Console logs captured

### ✅ Phase 2: CD Approval
- [x] Summary visible in CD panel
- [x] All routines listed
- [x] Ready for invoicing

### ✅ Phase 3: Invoice Generation
- [x] Invoice created
- [x] All 15 routines as line items
- [x] Subtotal correct
- [x] Tax calculated
- [x] Total = subtotal + tax
- [x] Reservation status → "invoiced"
- [x] Console logs show complete flow

### ✅ Phase 4: Mark as Paid
- [x] Status → "PAID"
- [x] Split button available

### ✅ Phase 5: Split by Dancer
- [x] Sub-invoices generated
- [x] One per unique dancer
- [x] Validation passes (totals match)
- [x] Console logs show calculations
- [x] No errors

### ✅ Phase 6: Sub-Invoice Verification
- [x] All dancers have sub-invoice
- [x] Line items correct per dancer
- [x] Calculations accurate (shares, tax, totals)
- [x] Sum of sub-invoices = main invoice total
- [x] Rounding acceptable (≤ $0.01 difference)

### ✅ Phase 7: Cross-Reference
- [x] All routines accounted for
- [x] All dancers accounted for
- [x] No missing or duplicate charges
- [x] Math validated across all sources

---

## Edge Cases to Check (If Time Permits)

### Solo Routine
- Dancer gets 100% of fee
- No division needed

### Duet Routine
- Each dancer gets 50% of fee
- Check rounding

### Group Routine (3+ dancers)
- Fee divided evenly
- Check rounding (e.g., $100 / 3 = $33.33, $33.33, $33.34)

### Dancer in Multiple Routines
- Sub-invoice has multiple line items
- Totals sum correctly

### Rounding Edge Case
- Last sub-invoice gets penny adjustment if needed
- Check console log: `[SUBINVOICE_VALIDATE] Applied rounding adjustment`

---

## Expected Console Output Summary

**Summary Submission:**
- `[SUMMARY_MODAL]` - Modal data
- `[SUMMARY_SUBMIT]` - Submission and success

**Invoice Generation:**
- `[INVOICE_GEN]` - Starting, reservation loaded, invoice created, transaction complete
- `[INVOICE_CALC]` - Entries loaded, line items, totals

**Sub-Invoice Splitting:**
- `[SUBINVOICE_SPLIT]` - Starting, invoice loaded, entries loaded, dancer map built
- `[SUBINVOICE_VALIDATE]` - Tax calculation, totals check, rounding adjustment
- `[SUBINVOICE_CREATE]` - Deletion, transaction start, creation per dancer, success

---

## Test Report Template

```markdown
# Invoice Workflow Test Report - SUCCESS

**Date:** [Date]
**Build:** 6ec2330
**Tester:** [Name]

## Summary
✅ All phases completed successfully
✅ All calculations verified accurate
✅ Console logging working as expected
✅ Sub-invoice totals match main invoice

## Phase Results
- Phase 1 (Summary): ✅ PASS
- Phase 2 (Approval): ✅ PASS
- Phase 3 (Invoice): ✅ PASS
- Phase 4 (Mark Paid): ✅ PASS
- Phase 5 (Split): ✅ PASS
- Phase 6 (Verify): ✅ PASS
- Phase 7 (Cross-ref): ✅ PASS

## Data Validation
- Main Invoice Total: $[amount]
- Sum of Sub-Invoices: $[amount]
- Difference: $0.00 ✅
- Number of Sub-Invoices: [count]
- Number of Unique Dancers: [count]

## Issues Found
[List any issues, or "None"]

## Screenshots
[Reference evidence folder]

## Recommendation
✅ Invoice workflow is production-ready
```

---

**Ready to execute this test protocol!**
