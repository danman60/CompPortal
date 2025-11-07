# Risk Assessment: parent_email Field Usage

**Date:** November 6, 2025
**Question:** Is parent_email functional/delicate? Can we safely remove it from invoice splitting?

---

## Usage Analysis

### 1. Invoice Splitting (invoice.ts) - **LOW RISK**

**Lines 1202, 1232, 1261, 1267, 1273, 1426:**
```typescript
// Line 1202: SELECT query includes parent_email
parent_email: true,

// Line 1232: TypeScript type includes it
parent_email: string | null;

// Line 1261: Reads it
const parentEmail = ep.dancers.parent_email;

// Line 1267, 1273: Stores in map (not used for grouping)
parent_email: parentEmail

// Line 1426: ONLY usage - stores in notes field (optional)
notes: dancer.parent_email ? `Parent email: ${dancer.parent_email}` : null,
```

**Critical Finding:** parent_email is ONLY used in line 1426 to populate the `notes` field.
- Notes field is optional (nullable)
- Notes are never displayed in split invoice UI
- Code works perfectly fine if parent_email is NULL
- **Grouping logic uses dancer_id, NOT parent_email**

**Risk Level:** ✅ **ZERO RISK** - Can safely remove without breaking functionality

---

### 2. Dancer Management (dancer.ts) - **STORAGE ONLY**

**Lines 23, 719:**
```typescript
// Line 23: Validation schema (optional field)
parent_email: z.string().email().optional().or(z.literal('')),

// Line 719: Batch import schema (optional)
parent_email: z.string().optional(),
```

**Usage:** Optional field for dancer records. Never required, never used for business logic.

**Risk Level:** ✅ **ZERO RISK** - Just a storage field

---

### 3. CSV Import (csv-utils.ts, DancerCSVImport.tsx) - **IMPORT ONLY**

**csv-utils.ts lines 45, 179:**
- Maps CSV columns to parent_email field
- Allows importing parent_email from CSV

**DancerCSVImport.tsx lines 19, 299-300:**
- TypeScript type includes parent_email
- Validates email format IF provided
- Validation is optional (only runs if field has value)

**Usage:** Allows studios to import parent emails from CSV, but doesn't require them.

**Risk Level:** ✅ **ZERO RISK** - Import works with or without parent_email

---

### 4. Testing Seed Data (testing.ts) - **TEST DATA ONLY**

**Line 282:**
```typescript
parent_email: faker.internet.email(),
```

**Usage:** Generates fake parent emails for test dancers.

**Risk Level:** ✅ **ZERO RISK** - Just test data

---

## Functional Assessment

### Is parent_email Used for Business Logic?
**NO.** It is:
- ✅ Stored in database (optional field)
- ✅ Imported via CSV (optional)
- ✅ Validated if provided (optional)
- ✅ Written to sub_invoice notes field (optional, not displayed)
- ❌ **NEVER used for grouping**
- ❌ **NEVER used for calculations**
- ❌ **NEVER used for routing/sending invoices**
- ❌ **NEVER used for sibling detection**

### What Breaks if We Remove parent_email References?
**NOTHING.** The field is:
- Not required by any validation
- Not used by any calculations
- Not displayed in any UI (except maybe dancer detail page)
- Not used for invoice splitting logic

---

## Recommendations

### Option 1: Leave Code As-Is (SAFEST)
**Pro:**
- Zero risk of breaking anything
- parent_email stays in notes (hidden, doesn't matter)
- Code continues to work exactly as it does now

**Con:**
- Unnecessary database reads
- Confusing code (reads field that's not used)

### Option 2: Remove from Invoice Splitting Only (SAFE)
**Change:**
```typescript
// invoice.ts:1202 - Remove from SELECT
dancers: {
  select: {
    id: true,
    first_name: true,
    last_name: true,
    // parent_email: true,  ← REMOVE THIS LINE
    // parent_name: true,   ← REMOVE THIS TOO
  },
}

// invoice.ts:1426 - Remove from notes
notes: null,  // Always null, don't use parent_email
```

**Risk:** ✅ **ZERO RISK** - parent_email was never functional
**Benefit:** Cleaner code, one less database read per dancer

### Option 3: Remove Field Entirely (RISKY - NOT RECOMMENDED)
**Would require:**
- Database migration to drop column
- Remove from all schemas/types
- Check if UI displays it anywhere

**Risk:** ⚠️ **MEDIUM RISK** - May break UI if displayed somewhere
**Not Recommended:** Too much work for no benefit

---

## Decision

### Recommended Action: **Option 1 - Leave Code As-Is**

**Rationale:**
- parent_email in notes field is harmless (notes never displayed)
- No functional impact on split invoice feature
- Zero risk of breaking anything
- Not worth touching production code for cosmetic cleanup

**Alternative (If you prefer clean code):** Option 2
- Safe to remove parent_email reads from invoice splitting
- But also not necessary - field doesn't hurt anything

---

## Language Fix for Margin Spec

**Current Language:**
> "Margin invisible to parents"
> "Parents see blended subtotal"

**Corrected Language:**
> "Margin invisible on dancer invoices"
> "Invoice displays blended subtotal"

**Explanation:**
- Technically invoices go to dancers (business reality: parents pay)
- Our system logic: One invoice per dancer
- Terminology: "Dancer invoice" (not "family invoice" or "parent invoice")
- Display logic: Don't care who actually pays, just generate per-dancer invoices

---

## Summary

**parent_email Risk:** ✅ **ZERO RISK**
- Not used for business logic
- Not used for grouping
- Only stored in notes field (optional, not displayed)
- Safe to leave as-is OR remove from invoice splitting

**Recommendation:** Leave code unchanged, just fix spec language.

**Spec Language Fix:** Change "parents" → "dancer invoices" or "invoice recipients"
