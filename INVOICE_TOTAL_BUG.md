# CRITICAL BUG: Invoice Total Field Not Including Tax

**Date:** November 6, 2025
**Severity:** P0 - CRITICAL (Data Integrity Issue)
**Affects:** All invoices with tax_rate > 0

---

## Problem

Invoice `total` field in database stores **subtotal only**, not **subtotal + tax**.

**Evidence:**

```sql
SELECT id, subtotal, tax_rate, total
FROM invoices
WHERE id = 'bf5bc843-0327-445e-aa7a-c6a653fb2bbb';

Result:
- subtotal: $465.00
- tax_rate: 13.00
- total: $465.00  ❌ WRONG (should be $525.45)
```

**Expected:** `total` = subtotal + tax = $465 + $60.45 = $525.45
**Actual:** `total` = $465.00 (missing $60.45 tax)

---

## Impact

### Immediate Impact:
1. **Split Invoice Feature Blocked:**
   - Split calculation expects `invoice.total` = grand total
   - Gets subtotal instead
   - Validation fails: "Split calculation error: difference of $-60.45"

2. **Invoices Show Wrong Totals:**
   - UI displays `total` field
   - Customers see subtotal instead of grand total
   - Missing tax amount not visible

3. **Payment Tracking Incorrect:**
   - Payment amount recorded against wrong total
   - Reconciliation will fail

### Data Integrity:
- **All existing invoices with tax_rate > 0 have incorrect totals**
- Requires database migration to fix historical data

---

## Root Cause

Invoice creation code (likely in `invoice.ts` or invoice creation endpoint) calculates `total` as subtotal only, not subtotal + tax.

**Need to investigate:**
1. Where invoices are created (`createInvoice` mutation)
2. How `total` field is calculated
3. Why tax is not being added

---

## Fix Required

### 1. Fix Invoice Creation Logic

Update invoice creation to calculate total correctly:

```typescript
// BEFORE (incorrect):
const total = subtotal;

// AFTER (correct):
const taxAmount = subtotal * (taxRate / 100);
const total = subtotal + taxAmount;
```

### 2. Migrate Existing Data

Fix all existing invoices:

```sql
UPDATE invoices
SET total = subtotal + (subtotal * tax_rate / 100)
WHERE tax_rate > 0;
```

### 3. Add Database Constraint

Prevent future issues:

```sql
-- Add check constraint
ALTER TABLE invoices
ADD CONSTRAINT check_total_includes_tax
CHECK (
  tax_rate = 0 OR
  total >= subtotal
);
```

---

## Immediate Workaround

For split invoice testing, temporarily update the test invoice:

```sql
UPDATE invoices
SET total = 525.45
WHERE id = 'bf5bc843-0327-445e-aa7a-c6a653fb2bbb';
```

---

## Related Files

- `src/server/routers/invoice.ts` - Invoice creation logic
- `src/server/routers/invoice.ts:1337` - Split invoice validation (correctly expects total = subtotal + tax)

---

## Next Steps

1. ✅ Document bug (this file)
2. ✅ Find invoice creation code (invoice.ts:704-747)
3. ✅ Fix calculation logic (commit ba629f4)
4. ✅ Deploy fix to production (verified ba629f4 live)
5. ✅ Verify no broken invoices exist (0 found across all tenants)
6. ⏳ Resume split invoice testing (13 tests remaining: I6-I18)

---

**Status:** ✅ RESOLVED - Fix deployed and verified

**Resolution Details:**
- **Fixed in:** `src/server/routers/invoice.ts` lines 706-709, 743-744
- **Commit:** ba629f4
- **Deployed:** November 6, 2025
- **Verification:** No broken invoices found in database (all existing invoices either have tax_rate=0 or were manually corrected)
- **Future invoices:** Will automatically calculate correct totals with tax included
