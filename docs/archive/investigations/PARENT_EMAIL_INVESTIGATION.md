# CRITICAL MISALIGNMENT: Parent Email Usage Investigation

**Date:** November 6, 2025
**Status:** 🚨 CRITICAL - Major misunderstanding discovered
**Reported By:** User (Daniel)

---

## User's Concern

> "i'm worried we're still not in sync... you mentioned PARENT EMAILS. This is depreciated, we NEVER store parent emails or contact parents or track or care if dancers are siblings."

---

## Investigation Findings

### 1. Database Schema - `dancers` Table

**Parent email fields EXIST in schema:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'dancers' AND column_name LIKE '%parent%';

Results:
- parent_name (character varying, nullable)
- parent_email (character varying, nullable)  ← EXISTS
- parent_phone (character varying, nullable)
```

**Status:** ✅ Column exists in database schema

---

### 2. Split Invoice Code - `invoice.ts:1198-1204`

**Code READS parent_email from database:**
```typescript
dancers: {
  select: {
    id: true,
    first_name: true,
    last_name: true,
    parent_email: true,  // ← READING from database
    parent_name: true,
  },
},
```

**Code STORES parent_email in sub-invoice notes (line 1426):**
```typescript
notes: dancer.parent_email ? `Parent email: ${dancer.parent_email}` : null,
```

**Status:** ❌ Code actively uses parent_email field

---

### 3. Split Invoice Logic - How Grouping Actually Works

**Current Implementation (invoice.ts:1237-1277):**
- Groups by `dancer_id` (NOT by parent_email)
- Creates ONE sub-invoice per dancer
- Uses `family_identifier = dancer_id`
- Uses `family_name = dancer_name`
- Stores parent_email in notes field (optional)

**Key Code (line 1417-1418):**
```typescript
family_identifier: dancer.dancer_id,  // Use dancer_id as identifier
family_name: dancer.dancer_name,      // Use dancer name
```

**Status:** ✅ Grouping is correct (by dancer_id, not parent_email)
**Status:** ❌ But code still reads + stores parent_email

---

### 4. Margin Feature Spec - Language Used

**Line 11:**
> "Margin is blended into the subtotal and never shown separately to **parents**"

**Line 23:**
> "Dancer invoices show higher totals with margin blended into subtotal (invisible to **parents**)"

**Line 31:**
> "❌ Siblings never grouped (each dancer gets separate invoice)"

**Line 82:**
> "⚠️ Margin will NOT appear on dancer invoices
> **Parents** see only blended subtotal + tax"

**Line 227-229:**
> "No line item for 'margin' or 'studio fee'
> **Parent** sees higher routine fee, doesn't know margin was added
> SD privately knows their $11.50 profit"

**Status:** ❌ Spec uses "parent" language throughout, implying parent communication

---

### 5. Test Data Query Confusion

**Yesterday's Session:**
I queried for dancers with `parent_email IS NOT NULL` assuming this was required for billing.

**Query:**
```sql
SELECT first_name, last_name, parent_email
FROM dancers
WHERE parent_email IS NOT NULL;
```

**Result:** Only 5 dancers returned (Emma Johnson missing)

**My Assumption (WRONG):** "We need parent_email to bill families"
**Reality:** parent_email is deprecated, we bill by dancer_id regardless

**Status:** ❌ Wrong assumption led to wrong test data approach

---

## Discrepancies Summary

| Area | What Code Does | What User Says | Status |
|------|----------------|----------------|--------|
| **Database Schema** | Has parent_email column | Should not exist | ❌ Schema mismatch |
| **Split Invoice Code** | Reads parent_email | Should ignore it | ❌ Code mismatch |
| **Sub-Invoice Notes** | Stores "Parent email: X" | Should not store | ❌ Implementation wrong |
| **Grouping Logic** | Groups by dancer_id | Correct (by dancer) | ✅ Correct |
| **Margin Spec Language** | Uses "parent" terminology | Should say "dancer" | ❌ Spec language wrong |
| **Test Data Assumption** | Needs parent_email | Does not need it | ❌ Wrong assumption |

---

## Root Cause Analysis

### Why This Happened:

1. **Schema Legacy:** Database has parent_email column from earlier design
2. **Code Not Updated:** Split invoice code still references parent_email
3. **Spec Language:** Margin spec uses "parent" terminology (business language vs. technical reality)
4. **My Assumption:** Assumed parent_email was required for billing (wrong)
5. **No Explicit Documentation:** No spec explicitly stated "parent_email is deprecated"

---

## Business Logic - What SHOULD Happen

**Per User's Clarification:**
1. **NO parent tracking** - We don't store or use parent emails
2. **NO sibling grouping** - Each dancer gets their own invoice
3. **NO parent contact** - Studio handles all communication with families
4. **Dancer-centric billing** - One invoice per dancer, regardless of siblings

**Terminology:**
- "Dancer invoice" ✅ (not "family invoice")
- "What dancers see" ✅ (not "what parents see")
- "Bill per dancer" ✅ (not "bill per family")

---

## Impact Assessment

### What Works Correctly:
✅ Split invoice creates ONE invoice per dancer
✅ Grouping by dancer_id (not parent_email)
✅ Fee splitting calculations
✅ Tax calculations
✅ Totals validation

### What's Wrong:
❌ Code reads parent_email field (unnecessary)
❌ Code stores parent_email in notes (wrong)
❌ Spec uses "parent" language (confusing)
❌ Test data query filtered by parent_email (wrong approach)
❌ Database schema has deprecated parent_email column

### What Needs Fixing:
1. **Code:** Remove parent_email reads from invoice.ts
2. **Code:** Remove parent_email from sub-invoice notes
3. **Spec:** Update language from "parent" to "dancer"
4. **Test Data:** Use ALL dancers, ignore parent_email field
5. **Schema:** Consider removing parent_email column (or document as deprecated)

---

## Recommended Actions

### Immediate (This Session):
1. ✅ Create this investigation report
2. ⏳ Update margin spec language (parent → dancer)
3. ⏳ Remove parent_email logic from invoice.ts
4. ⏳ Revise test data approach (use all 100+ dancers)

### Near-term:
- Document parent_email as deprecated in schema comments
- Add comment in dancers table migration about deprecation
- Update any UI that references "family invoice" to "dancer invoice"

### Long-term:
- Consider removing parent_email column entirely (after confirming no other usage)
- Audit codebase for other parent-related assumptions

---

## Corrected Understanding

**Dancer Invoices (NOT Family Invoices):**
- One invoice per dancer
- Identified by dancer_id
- Named by dancer name
- No grouping by parent/family
- No sibling discounts or bundling
- Studio Director handles all family communication

**Margin Feature:**
- Studio Director adds margin to **dancer invoices**
- **Dancers** (or their families, via studio) see blended totals
- Margin invisible to **whoever pays the invoice**
- Studio keeps margin as profit

**Test Data:**
- Can use ANY dancers in Test Studio
- Don't need parent_email populated
- Should design realistic multi-routine scenarios
- Focus on variety of group sizes and categories

---

## Next Steps

1. Await user confirmation of findings
2. Fix margin spec language
3. Remove parent_email logic from code
4. Design multi-routine test data using ALL available dancers
5. Test split invoice with corrected understanding

---

**Status:** 🚨 Awaiting user confirmation before proceeding with fixes
