# Section I: Split Invoice by Dancer - Test Protocol

**Date:** November 6, 2025
**Status:** EXECUTING
**Test Invoice:** 2a811127-7b5e-4447-affa-046c76ded8da ($525.45, PAID)

---

## Test Data Setup

**Invoice Details:**
- Invoice ID: `2a811127-7b5e-4447-affa-046c76ded8da`
- Status: PAID ✅
- Subtotal: $465.00
- Tax (13%): $60.45
- Total: $525.45

**Entries in Invoice:**

1. **Fly Away** (Solo) - $115.00
   - Emma Johnson (johnson.parents@example.com)
   - Expected: 1 sub-invoice, $115 + $14.95 tax = $129.95

2. **Together We Rise** (Duo) - $140.00
   - Olivia Williams (williams.parents@example.com)
   - Charlotte Williams (williams.parents@example.com)
   - Expected: 2 sub-invoices, each $70 + $9.10 tax = $79.10

3. **Triple Threat** (Trio) - $210.00
   - Alexander Martinez (martinez.parents@example.com)
   - Amelia Jones (jones.amelia.parent@example.com)
   - Ava Jones (jones.ava.parent@example.com)
   - Expected: 3 sub-invoices, each $70 + $9.10 tax = $79.10

**Expected Sub-Invoices:** 6 total (one per dancer)
**Expected Sum:** $525.45 (must match invoice total exactly)

---

## Test Cases

### I1: Navigate to Invoice Detail ✅
**Action:** Navigate to invoice page as Studio Director
**Expected:** Invoice displays with "Split Invoice by Family" button
**Verification:** Button visible, invoice status shows PAID

---

### I2: Click Split Invoice Button
**Action:** Click "✂️ Split Invoice by Family" button
**Expected:** SplitInvoiceWizard modal opens with Step 1 (Review)
**Verification:**
- Modal displays business rules
- Shows requirements (all dancers have parent_email)
- "Next" button available

---

### I3: Wizard Step 2 - Confirm Split
**Action:** Click "Next" to proceed to Step 2
**Expected:** Confirmation step shows what will happen
**Verification:**
- Shows 6 dancers will get sub-invoices
- Shows total being split: $525.45
- "Confirm Split" button available

---

### I4: Execute Split Operation
**Action:** Click "Confirm Split" button
**Expected:**
- API mutation executes: `splitInvoice({ invoiceId })`
- Loading state shows
- Step 3 (Success) displays with family list
**Verification:**
- No errors
- Success message displays
- Shows 6 sub-invoices created

---

### I5: Verify Sub-Invoice List
**Action:** View SubInvoiceList after split
**Expected:**
- Table shows 6 sub-invoices (one per dancer)
- Validation summary shows: "✅ Sum matches parent invoice"
- Each row shows: Dancer name, # entries, subtotal, tax, total
**Verification:**
- Count: 6 sub-invoices
- Sum: $525.45 matches parent invoice
- All dancers listed with correct names

---

### I6: Verify Solo Dancer Sub-Invoice (Emma Johnson)
**Action:** Click "View" on Emma Johnson's sub-invoice
**Expected:**
- Title: "Invoice for Emma Johnson"
- Line items: 1 (Fly Away)
- Entry shows: "Fly Away - Solo" with Emma as only dancer
- Subtotal: $115.00
- Tax (13%): $14.95
- Total: $129.95
**Verification:** Math correct, all details accurate

---

### I7: Verify Duo Dancer Sub-Invoice (Olivia Williams)
**Action:** Click "View" on Olivia Williams's sub-invoice
**Expected:**
- Title: "Invoice for Olivia Williams"
- Line items: 1 (Together We Rise)
- Entry shows: "Together We Rise - Duo/Trio"
- Total dancers in routine: 2
- Olivia's share: $70.00 (50% of $140)
- Tax (13%): $9.10
- Total: $79.10
**Verification:** Split calculation correct (50% share)

---

### I8: Verify Duo Sibling Sub-Invoice (Charlotte Williams)
**Action:** Click "View" on Charlotte Williams's sub-invoice
**Expected:**
- Same parent_email as Olivia (williams.parents@example.com)
- BUT separate sub-invoice (split by dancer, not family)
- Line items: 1 (Together We Rise)
- Charlotte's share: $70.00 (50% of $140)
- Tax (13%): $9.10
- Total: $79.10
**Verification:** Siblings get separate invoices ✅

---

### I9: Verify Trio Dancer Sub-Invoice (Alexander Martinez)
**Action:** Click "View" on Alexander Martinez's sub-invoice
**Expected:**
- Line items: 1 (Triple Threat)
- Total dancers in routine: 3
- Alexander's share: $70.00 (33.33% of $210)
- Tax (13%): $9.10
- Total: $79.10
**Verification:** 3-way split calculation correct

---

### I10: Verify Trio Dancer Sub-Invoice (Amelia Jones)
**Action:** Click "View" on Amelia Jones's sub-invoice
**Expected:**
- Line items: 1 (Triple Threat)
- Amelia's share: $70.00 (33.33% of $210)
- Tax (13%): $9.10
- Total: $79.10
**Verification:** Same as Alexander (equal shares)

---

### I11: Verify Trio Dancer Sub-Invoice with Rounding (Ava Jones)
**Action:** Click "View" on Ava Jones's sub-invoice
**Expected:**
- Line items: 1 (Triple Threat)
- Ava's share: $70.00 (may have penny adjustment if rounding needed)
- Tax (13%): $9.10
- Total: $79.10
**Verification:** Check for penny rounding adjustment

---

### I12: Verify Sum Validation
**Action:** Calculate sum of all 6 sub-invoices manually
**Expected:**
- Emma: $129.95
- Olivia: $79.10
- Charlotte: $79.10
- Alexander: $79.10
- Amelia: $79.10
- Ava: $79.10
- **Total: $525.45** ✅ Matches parent invoice
**Verification:** Exact match (no discrepancy)

---

### I13: Database Verification
**Action:** Query sub_invoices table
**Expected:**
```sql
SELECT
  id,
  family_identifier, -- stores dancer_id
  family_name,       -- stores dancer name
  subtotal,
  tax_amount,
  total,
  (line_items::jsonb)->0->>'title' as first_entry_title
FROM sub_invoices
WHERE parent_invoice_id = '2a811127-7b5e-4447-affa-046c76ded8da'
ORDER BY total DESC;
```
**Verification:** 6 records exist, all have correct calculations

---

### I14: Back to Main Invoice Button
**Action:** Click "Back to Main Invoice" from SubInvoiceList
**Expected:** Returns to InvoiceDetail view
**Verification:**
- Button text changes to "👨‍👩‍👧‍👦 View Family Invoices (6)"
- "Split Invoice" button no longer visible

---

### I15: Regenerate Split (Delete and Recreate)
**Action:** From SubInvoiceList, click "Delete & Regenerate" button
**Expected:**
- Confirmation dialog appears
- After confirm, old sub-invoices deleted
- New split operation executes
- 6 new sub-invoices created
**Verification:** New sub-invoice IDs, same totals

---

### I16: Test Multi-Tenant Isolation
**Action:**
1. Switch to different tenant (Glow)
2. Try to access sub-invoice URL from EMPWR tenant
**Expected:** 404 or Forbidden error
**Verification:** Cross-tenant access blocked ✅

---

### I17: Test Role Access - Competition Director
**Action:** Login as Competition Director
**Expected:**
- CD can view main invoice
- CD cannot see "Split Invoice" button
- CD cannot access sub-invoice URLs (Forbidden)
**Verification:** Studio Director feature only ✅

---

### I18: Test Role Access - Super Admin
**Action:** Login as Super Admin
**Expected:**
- SA can see "Split Invoice" button
- SA can execute split operation
- SA can view sub-invoices
**Verification:** SA has testing/support access ✅

---

## Expected Test Results

**Total Tests:** 18
**Test Type:** End-to-end split invoice workflow
**Critical Coverage:**
- ✅ Solo entry splitting
- ✅ Duo entry splitting (siblings get separate invoices)
- ✅ Trio entry splitting (3-way equal share)
- ✅ Tax calculation (13% per sub-invoice)
- ✅ Sum validation (exact match to parent)
- ✅ Database persistence
- ✅ Regeneration workflow
- ✅ Multi-tenant isolation
- ✅ Role-based access control

---

## Test Environment

**Production URL:** https://empwr.compsync.net
**Test Account:** danieljohnabrahamson@gmail.com (Super Admin)
**Invoice:** 2a811127-7b5e-4447-affa-046c76ded8da
**Studio:** Test Studio - Daniel

---

**Status:** Ready to execute tests
**Next Action:** Begin I1 with Playwright MCP
