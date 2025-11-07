# BUG #5 Investigation: Production Entry Validation Error

**Date:** November 7, 2025
**Status:** 🔍 ROOT CAUSE IDENTIFIED - Requires Database Verification
**Priority:** P0 (Blocks Production entries with 10 dancers)

---

## Bug Report Summary

**Original Issue:**
- Production entries fail validation with 10 dancers
- Error: "Invalid participant count for Production. Must be between..."
- Location: Routine creation form
- Impact: Cannot create Production entries with minimum requirement (10 dancers)
- Evidence: `evidence/screenshots/BUG-production-10-dancers-validation-error-20251107.png`

**Details from Testing Session:**
- Form shows "Large Group (10 dancers)" detected
- Production minimum requirement is 10 dancers
- Save fails with 500 error
- Console: `Failed to create entry: TRPCClientError: Invalid participant count for Production`

---

## Investigation Results

**Code Analysis:**

### Validation Logic Location
File: `CompPortal/src/lib/validators/businessRules.ts:25-46`

```typescript
export async function validateEntrySizeCategory(
  entrySizeCategoryId: string,
  participantCount: number
): Promise<void> {
  const sizeCategory = await prisma.entry_size_categories.findUnique({
    where: { id: entrySizeCategoryId },
    select: { name: true, min_participants: true, max_participants: true },
  });

  if (!sizeCategory) {
    throw new Error('Entry size category not found');
  }

  const min = sizeCategory.min_participants || 1;
  const max = sizeCategory.max_participants || 999;

  if (participantCount < min || participantCount > max) {
    throw new Error(
      `Invalid participant count for ${sizeCategory.name}. Must be between ${min} and ${max}. Got ${participantCount}.`
    );
  }
}
```

### Called From
File: `CompPortal/src/server/routers/entry.ts:1133`

```typescript
// Validate participant count matches size category constraints
if (entrySizeCategoryId && participantCount > 0) {
  await validateEntrySizeCategory(entrySizeCategoryId, participantCount);
}
```

---

## Root Cause Analysis

**The Issue:**
The validation function checks if `participantCount` (10 in this case) falls within the `min_participants` and `max_participants` range stored in the `entry_size_categories` database table for the "Production" category.

**Likely Scenario:**
1. User selected 10 dancers (correct for Production)
2. Form auto-detected size as "Large Group (10 dancers)" initially
3. User selected "Production" dance category
4. Production Auto-Lock triggered (EntryCreateFormV2.tsx:218-245)
5. Form set `size_category_override` to "Production"
6. Backend received `entry_size_category_id` = Production category ID
7. Validation checked: `10 < min_participants` OR `10 > max_participants`
8. **Validation failed** → This means the database has incorrect min/max values

**Hypothesis:**
The `entry_size_categories` table has **incorrect** min/max values for Production:
- ❌ **Current (likely):** `min_participants = 11` or `max_participants = 9` (or something excluding 10)
- ✅ **Expected:** `min_participants = 10, max_participants = 999`

---

## Frontend Logic (Context)

**Production Auto-Lock Feature:**
File: `CompPortal/src/components/rebuild/entries/EntryCreateFormV2.tsx:218-245`

```typescript
// Production Auto-Lock: Lock size category and classification when Production dance category selected
useEffect(() => {
  const productionCategory = lookups.categories.find(c => c.name === 'Production');
  const productionSizeCategory = lookups.entrySizeCategories.find(c => c.name === 'Production');
  const productionClass = lookups.classifications.find(c => c.name === 'Production');
  const isProductionCategory = productionCategory && formHook.form.category_id === productionCategory.id;

  // If Production dance category selected → lock size category AND classification to Production
  if (isProductionCategory) {
    // Lock size category to Production
    if (productionSizeCategory && formHook.form.size_category_override !== productionSizeCategory.id) {
      formHook.updateField('size_category_override', productionSizeCategory.id);
    }

    // Lock classification to Production
    if (productionClass && formHook.form.classification_id !== productionClass.id) {
      formHook.updateField('classification_id', productionClass.id);
    }
  }
}, [lookups, formHook.form.category_id]);
```

This logic is **correct** - it automatically sets Production size category when Production dance category is selected.

---

## Next Steps for Verification

**1. Query Database (REQUIRED):**
```sql
SELECT name, min_participants, max_participants
FROM entry_size_categories
WHERE tenant_id = '00000000-0000-0000-0000-000000000001' -- EMPWR
  AND name = 'Production';
```

**Expected Result:**
- `min_participants = 10`
- `max_participants = 999` (or NULL)

**If Actual Result is Different:**
- That confirms the bug is in the database configuration
- Fix: Update the database record

**2. Check All Tenants:**
```sql
SELECT t.name AS tenant_name, e.name AS size_category,
       e.min_participants, e.max_participants
FROM entry_size_categories e
JOIN tenants t ON e.tenant_id = t.id
WHERE e.name = 'Production'
ORDER BY t.name;
```

Verify Production size category is correct for **BOTH** EMPWR and Glow.

---

## Reproduction Status

**Cannot Reproduce on Live System:**
- Current reservation is CLOSED (summary already submitted)
- "Create Routine" button is DISABLED
- Would need an OPEN reservation with available slots to test

**Alternative Test Method:**
- Create a new reservation for a different event
- Or: Check database directly (recommended)

---

## Proposed Fix

**IF database query confirms incorrect min/max:**

**SQL Fix:**
```sql
UPDATE entry_size_categories
SET min_participants = 10,
    max_participants = 999
WHERE name = 'Production'
  AND tenant_id IN (
    '00000000-0000-0000-0000-000000000001', -- EMPWR
    '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'  -- Glow
  );
```

**Verification After Fix:**
1. Check database values updated correctly
2. Create new test reservation (or use existing open reservation)
3. Attempt to create Production entry with 10 dancers
4. Verify save succeeds

---

## Business Rules Reference

**From Phase 1 Spec (if exists):**
- Production minimum: 10 dancers
- Production maximum: Unlimited (or 999 as practical limit)

**Industry Standard:**
- Solo: 1
- Duet/Trio: 2-3
- Small Group: 4-9
- Large Group: 10-19
- Production: 10+ (typically 10-999)

---

## Evidence Files

**Bug Evidence:**
- `evidence/screenshots/BUG-production-10-dancers-validation-error-20251107.png` (from testing session)

**Code Locations:**
- Validation logic: `CompPortal/src/lib/validators/businessRules.ts:25-46`
- Entry creation: `CompPortal/src/server/routers/entry.ts:1133`
- Frontend auto-lock: `CompPortal/src/components/rebuild/entries/EntryCreateFormV2.tsx:218-245`

---

## Conclusion

**Status:** ✅ ROOT CAUSE IDENTIFIED
**Likely Fix:** Database configuration error (incorrect min/max for Production size category)
**Next Action:** Query database to confirm hypothesis
**Time to Fix:** 5-10 minutes (database UPDATE + verification)
**Risk Level:** LOW (single table UPDATE, easily reversible)

---

**Investigation Time:** ~25 minutes
**Investigator:** Claude (Autonomous)
**Blocked By:** Need database query access via Supabase MCP to confirm values
