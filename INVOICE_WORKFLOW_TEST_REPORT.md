# Summary/Invoice/SubInvoice Workflow Test Report - BLOCKED

**Date:** November 5, 2025
**Environment:** Production (https://empwr.compsync.net)
**Test Protocol:** `SUMMARY_INVOICE_WORKFLOW_TEST.md`
**Tester:** Claude Code (Playwright MCP)
**Build Version:** v1.0.0 (6ec2330)

---

## Executive Summary

**⚠️ TESTING BLOCKED - Unable to create test data**

The invoice workflow testing could not be completed due to a critical blocker in the test data population functionality. The testing tools "POPULATE TEST DATA" function fails with a unique constraint error, preventing creation of the test scenarios needed for invoice workflow testing.

**Status:** ❌ **BLOCKED**
**Blocker:** Test data population fails with `user_profiles` unique constraint error
**Impact:** Cannot test Summary → Invoice → SubInvoice → Family Invoice workflow

---

## Test Execution Summary

### Phase Attempted: Setup

✅ **Login as Super Admin:** Successful
✅ **Navigate to Testing Tools:** Successful
✅ **Run CLEAN SLATE:** Successful (all test data wiped)
❌ **POPULATE TEST DATA:** **FAILED** - Unique constraint error

### Phases Blocked

⏸️ **Phase 1:** Studio Director submits routine summary - BLOCKED (no test studio with data)
⏸️ **Phase 2:** Competition Director generates invoice - BLOCKED (no summaries to invoice)
⏸️ **Phase 3:** Split invoice by family - BLOCKED (no invoices to split)
⏸️ **Phase 4:** Verify family invoice details - BLOCKED (no family invoices)
⏸️ **Phase 5:** Test edge cases - BLOCKED (no test data)

---

## Blocker Details

### Issue: Test Data Population Fails

**Error Message:**
```
TRPCClientError:
Invalid `prisma.user_profiles.create()` invocation:

Unique constraint failed on the fields: (`id`)
```

**Steps to Reproduce:**
1. Login as Super Admin (danieljohnabrahamson@gmail.com)
2. Navigate to `/dashboard/admin/testing`
3. Click "CLEAN SLATE" button
4. Confirm deletion by typing "DELETE ALL DATA"
5. Click "DELETE" - completes successfully (all counts = 0)
6. Click "POPULATE TEST DATA" button
7. Confirm dialog
8. **ERROR:** 500 response with unique constraint failure

**Expected Behavior:**
- Test data population should create:
  - 20 studios with realistic names
  - ~200 dancers (8-12 per studio, ages 5-18)
  - ~100 entries in various states
  - ~25 reservations (approved, rejected, pending)
  - ~10 invoices (some paid, some pending)
  - Test credentials: testsd1@test.com through testsd20@test.com

**Actual Behavior:**
- Database query fails with unique constraint error on `user_profiles.id`
- No test data created
- Error appears immediately after confirm dialog

**Evidence:**
- Screenshot: `evidence/invoice-workflow-test/blocker-populate-test-data-error.png`
- Console error: 500 response from tRPC endpoint
- Database state: All tables empty (0 studios, 0 dancers, 0 entries, 0 reservations, 0 invoices)

---

## Root Cause Analysis

### Hypothesis

The `POPULATE TEST DATA` function attempts to create `user_profiles` records with IDs that conflict with existing records in the auth system. Possible causes:

1. **Auth.users not cleaned:** `CLEAN SLATE` may only delete application tables (studios, dancers, etc.) but NOT auth.users table
2. **ID collision:** Test data function may use hardcoded UUIDs that conflict with preserved SA/CD accounts
3. **Cascading delete failure:** Foreign key constraints may prevent full deletion of user_profiles
4. **Transaction ordering:** user_profiles created before auth.users, causing FK constraint violation

### Evidence Supporting Hypothesis

1. Error specifically mentions `user_profiles` table unique constraint on `id` field
2. CLEAN SLATE documentation says "CD and SA user accounts" are preserved
3. Test data function claims to create predictable test emails (testsd1@test.com, etc.)
4. Error occurs immediately on first record creation (not after partial success)

### Recommended Investigation

**Check auth.users table after CLEAN SLATE:**
```sql
SELECT id, email, role
FROM auth.users
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

**Check user_profiles table:**
```sql
SELECT id, user_id, first_name, last_name
FROM user_profiles
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

**Review CLEAN SLATE implementation:**
- Does it delete from `auth.users`?
- Does it delete from `user_profiles`?
- Are SA/CD accounts correctly excluded from deletion?

**Review POPULATE TEST DATA implementation:**
- How are user IDs generated?
- Are they deterministic/hardcoded?
- Does it check for existing users before creating?
- Does it handle auth.users creation separately from user_profiles?

---

## Current Database State (After CLEAN SLATE)

```
Studios: 0
Dancers: 0
Entries: 0
Reservations: 0
Invoices: 0
Competitions: 10 (preserved as expected)
Sessions: 0
Judges: 0
```

**Status:** Clean slate successful, but unable to repopulate

---

## Alternative Testing Approaches (Not Attempted)

### Option 1: Manual Test Data Creation via SQL

Create minimal test data directly via SQL:
1. Create 1 test studio
2. Create 1 studio director account
3. Create 5-10 dancers for that studio
4. Create 1 approved reservation
5. Create 5 competition entries
6. Manually set reservation status to "summarized" (bypassing summary submission)
7. Test invoice generation from there

**Pros:**
- Bypasses broken test data population
- Can create exact scenario needed
- Quick to implement

**Cons:**
- Requires knowledge of exact schema and foreign keys
- May miss business logic that normal flows enforce
- Doesn't test full Studio Director workflow (summary submission)

### Option 2: Use Existing Production Data (If Available)

Check if any real studios have:
- Approved reservations
- Submitted entries
- Status = "summarized" (ready for invoice)

**Pros:**
- Real data, real scenarios
- Tests on actual production state

**Cons:**
- May not have ideal test scenarios
- Risk of affecting real studio data
- May not have family splitting scenarios

### Option 3: Fix Test Data Population Bug First

Debug and fix the `POPULATE TEST DATA` function before proceeding with testing.

**Pros:**
- Fixes the root cause
- Enables repeatable testing
- Unblocks all future testing sessions

**Cons:**
- Requires code investigation and debugging
- May take time to identify and fix
- Delays invoice workflow testing

---

## Recommendation

**Priority 1: Fix Test Data Population Bug**

**Rationale:**
- This blocker affects ALL future testing, not just invoice workflow
- Testing tools are critical for SA to validate features before release
- Repeatable test data is essential for regression testing
- Invoice workflow requires complex multi-studio scenarios

**Steps:**
1. Investigate `POPULATE TEST DATA` implementation
2. Check auth.users vs user_profiles creation order
3. Fix ID collision or FK constraint issues
4. Add error handling for duplicate keys
5. Test clean slate → populate → clean slate cycle
6. Verify test credentials work (testsd1@test.com, etc.)

**Priority 2: After Fix, Resume Invoice Workflow Testing**

Once test data population is fixed:
1. Run CLEAN SLATE
2. Run POPULATE TEST DATA
3. Verify test studios created
4. Proceed with complete invoice workflow test protocol
5. Test all 5 phases as defined in `SUMMARY_INVOICE_WORKFLOW_TEST.md`

---

## Test Protocol Checklist (Not Completed)

### Phase 1: Studio Director - Submit Routine Summary
- [ ] Login as Studio Director (testsd1@test.com or similar)
- [ ] Navigate to Reservations
- [ ] Click "Submit Summary"
- [ ] Review routines in modal
- [ ] Verify totals calculation
- [ ] Submit summary
- [ ] Verify reservation status → "summarized"
- [ ] Capture console logs with `[SUMMARY_MODAL]`, `[SUMMARY_SUBMIT]` tags

### Phase 2: Competition Director - Generate Invoice
- [ ] Login as CD (empwrdance@gmail.com)
- [ ] Navigate to Invoices or Routine Summaries
- [ ] Click "Generate Invoice" for test studio
- [ ] Verify invoice created
- [ ] Verify line items match submitted routines
- [ ] Verify totals (subtotal + tax = total)
- [ ] Capture console logs with `[INVOICE_GEN]`, `[INVOICE_CALC]` tags

### Phase 3: Split Invoice by Family
- [ ] Open invoice detail page
- [ ] Click "Split by Family" button
- [ ] Verify sub-invoices generated
- [ ] Verify validation passes (totals match parent)
- [ ] Verify one sub-invoice per family/dancer
- [ ] Capture console logs with `[SUBINVOICE_SPLIT]`, `[SUBINVOICE_VALIDATE]` tags

### Phase 4: Verify Family Invoice Details
- [ ] View sub-invoice list
- [ ] Open each family invoice
- [ ] Verify dancer names displayed
- [ ] Verify only that family's routines appear
- [ ] Verify totals correct per family
- [ ] Test PDF generation (if available)

### Phase 5: Test Edge Cases
- [ ] Single dancer with multiple routines
- [ ] Family with multiple dancers (siblings)
- [ ] Solo vs Group routines
- [ ] Zero-tax competition (if applicable)
- [ ] Rounding edge cases

---

## Console Logging Requirements (To Be Added)

The test protocol requires verbose console logging to debug the workflow. The following logging tags need to be added to components:

### Required Console Logs

**SubmitSummaryModal.tsx:**
```javascript
[SUMMARY_MODAL] Modal opened: { reservation_id, entries_count }
[SUMMARY_CALC] Calculated totals: { subtotal, tax, total }
[SUMMARY_SUBMIT] Submitting with payload: { ... }
[SUMMARY_SUBMIT] Success: { status: 'summarized' }
```

**Invoice Generation (invoice.ts router):**
```javascript
[INVOICE_GEN] Starting generation: { studio_id, competition_id }
[INVOICE_CALC] Line items: [ ... ]
[INVOICE_CALC] Totals: { subtotal, tax, total }
[INVOICE_GEN] Created: { invoice_id, invoice_number }
```

**SubInvoice Splitting (invoice.ts router):**
```javascript
[SUBINVOICE_SPLIT] Starting split: { parent_invoice_id }
[SUBINVOICE_SPLIT] Families identified: [ ... ]
[SUBINVOICE_CREATE] Creating for family: { family_name }
[SUBINVOICE_VALIDATE] Validation: { matches: true/false, difference }
```

**Status:** Not added yet (blocked by test data issue)

---

## Verification Evidence

### Evidence Captured

1. **blocker-populate-test-data-error.png**
   - Shows error message: "Invalid `prisma.user_profiles.create()` invocation: Unique constraint failed on the fields: (`id`)"
   - Database state showing 0 studios, 0 dancers, 0 entries, 0 reservations, 0 invoices
   - POPULATE TEST DATA button visible

### Evidence Not Captured (Blocked)

- Summary submission modal
- Invoice generation confirmation
- Family invoice split validation
- Sub-invoice list
- Family invoice detail pages
- Console logs from workflow

---

## Impact Assessment

### Business Impact

**Severity:** HIGH - Blocks all invoice workflow testing

**Affected Features:**
- Summary submission testing
- Invoice generation testing
- Family invoice splitting testing
- Sub-invoice verification testing
- PDF generation testing (if implemented)
- Email functionality testing (future)

**Workarounds Available:**
- Manual SQL test data creation (complex, error-prone)
- Use real production studios (risky, may not have ideal scenarios)
- Skip testing until bug fixed (not recommended)

### Technical Impact

**Development:**
- Cannot validate invoice workflow changes
- Cannot regression test after fixes
- Cannot verify family splitting logic
- Cannot test validation rules

**Testing:**
- Test data population feature broken
- All future test sessions blocked
- Cannot create repeatable test scenarios
- SA testing tools unreliable

**Production Risk:**
- Invoice workflow not verified on production environment
- Family splitting not tested with real scenarios
- Potential for validation failures or rounding errors
- No confidence in sub-invoice totals matching parent

---

## Next Steps

### Immediate Actions

1. **Create BLOCKER.md** ✅ (This document)
2. **Notify user** about blocked testing
3. **Investigate test data population bug**
   - Check POPULATE TEST DATA implementation
   - Review auth.users vs user_profiles logic
   - Test fix in isolation
4. **Verify fix works:**
   - Run CLEAN SLATE
   - Run POPULATE TEST DATA
   - Verify 20 studios created
   - Test login with testsd1@test.com

### After Blocker Resolved

1. **Resume invoice workflow testing**
2. **Follow complete test protocol** (all 5 phases)
3. **Add verbose console logging** to components
4. **Capture evidence** for each phase
5. **Document findings** in success report
6. **Test on both tenants** (EMPWR + Glow if applicable)

---

## Questions for User

1. **Should we attempt manual SQL test data creation** to bypass the blocker?
2. **Is there existing production data** we can use for testing (studios with summarized reservations)?
3. **What is the priority?** Fix blocker first vs. manual workaround vs. skip testing?
4. **Are there known issues** with test data population that we should be aware of?

---

## Conclusion

**Invoice workflow testing could not be completed** due to critical blocker in test data population functionality. The "POPULATE TEST DATA" feature fails with a unique constraint error on `user_profiles.id`, preventing creation of test studios, dancers, entries, and reservations needed for the invoice workflow.

**Recommendation:** Fix test data population bug before attempting invoice workflow testing. This blocker affects all future testing sessions and must be resolved to enable repeatable, reliable testing.

**Test Status:** ⏸️ **BLOCKED** (0% complete)
**Production Readiness:** ❓ **UNKNOWN** (Cannot verify without testing)
**Risk Level:** 🔴 **HIGH** (Invoice workflow not tested on production environment)

---

**Tested By:** Claude Code (Playwright MCP)
**Test Session:** November 5, 2025
**Evidence:** `evidence/invoice-workflow-test/blocker-populate-test-data-error.png`
**Protocol:** `SUMMARY_INVOICE_WORKFLOW_TEST.md` (not completed)
**Status:** BLOCKED - Awaiting test data population bug fix
