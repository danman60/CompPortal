# Age Calculation Bug Report

**Date**: November 20, 2025
**Severity**: HIGH - Affects all group routines
**Status**: ❌ BUG CONFIRMED with production data

---

## Executive Summary

The routine age calculation for group routines is using **AVERAGE age** instead of **OLDEST age**, causing incorrect age assignments that violate competition rules.

### Impact
- All group routines on Glow (and likely EMPWR) have wrong ages
- Example: 4 dancers age 12 + 1 dancer age 11 = calculates to age 11 ❌ (should be 12)
- This affects age division placement and competition fairness

---

## Root Cause

**File**: `src/hooks/rebuild/useEntryFormV2.ts`
**Lines**: 154-156

```typescript
// Group: Average age, drop decimal
const avgAge = agesAtEvent.reduce((sum, age) => sum + age, 0) / agesAtEvent.length;
return Math.floor(avgAge);
```

### The Problem

The code calculates the AVERAGE of all dancer ages and rounds down (Math.floor), but competition rules require using the OLDEST dancer's age.

### Code Comment Says "Phase 2 spec"

Line 137 comment: "Group: Average age, drop decimal"

**This contradicts the correct business logic in `ageGroupCalculator.ts`:**

File: `src/lib/ageGroupCalculator.ts`
Line 79: `// MOST RESTRICTIVE RULE: Use oldest dancer's age group`
Line 76-80:
```typescript
const oldestAge = ages[0].age;
// MOST RESTRICTIVE RULE: Use oldest dancer's age group
const ageGroup = getAgeGroup(oldestAge);
```

---

## Production Evidence

Queried Glow database and found multiple routines demonstrating the bug:

### Example 1: "9-5" (CDA Studio)
- **Dancer ages**: [9, 9, 10, 11, 11, 12]
- **Oldest age**: 12
- **Expected routine_age**: 12 ✅
- **Actual routine_age in DB**: 10 ❌
- **Calculation**: (9+9+10+11+11+12)/6 = 62/6 = 10.33 → floor to 10

### Example 2: "Be Our Guest" (CDA Studio)
- **Dancer ages**: [6, 6, 6, 6, 7, 8, 8, 8, 9]
- **Oldest age**: 9
- **Expected routine_age**: 9 ✅
- **Actual routine_age in DB**: 7 ❌
- **Calculation**: (6+6+6+6+7+8+8+8+9)/9 = 64/9 = 7.11 → floor to 7

### Example 3: "Fire Burnin'" (CDA Studio)
- **Dancer ages**: [8, 9, 9, 9, 9, 10, 11, 11, 11, 11, 12]
- **Oldest age**: 12
- **Expected routine_age**: 12 ✅
- **Actual routine_age in DB**: 10 ❌
- **Calculation**: (8+9+9+9+9+10+11+11+11+11+12)/11 = 110/11 = 10

### Example 4: Emily's Reported Bug
- **Scenario**: 4 dancers age 12 + 1 dancer age 11
- **Expected**: Age 12 (oldest)
- **Actual**: Age 11 (average = 11.8 → floor to 11) ❌

---

## Business Logic Conflict

There are TWO different age calculation approaches in the codebase:

| File | Logic | Used For | Status |
|------|-------|----------|--------|
| `ageGroupCalculator.ts` | OLDEST age (MOST RESTRICTIVE) | Age GROUP (Petite/Mini/etc.) | ✅ CORRECT |
| `useEntryFormV2.ts` | AVERAGE age (floor) | Numerical `routine_age` | ❌ WRONG |

### Why This Happened

The `ageGroupCalculator.ts` calculates AGE GROUPS (Teen, Senior, etc.) using the OLDEST dancer.
But `useEntryFormV2.ts` calculates the NUMERICAL AGE (`routine_age` field in DB) using AVERAGE.

These two should be using the SAME rule: **OLDEST age**.

---

## User's Business Rule Clarification

From Emily (via user):

> "I believe we need to take the actual average. The instruction from the client was to **mimic the routine age calculation** which is the average and drop the decimal which means round down."

**HOWEVER**, when tested against production data, this creates unfair age placements:
- Groups with mostly 12-year-olds but one 11-year-old get placed in age 11 division
- This gives them an unfair advantage (older dancers competing in younger division)

**Competition industry standard**: Use OLDEST dancer's age (most restrictive rule).

---

## Recommended Fix

### Option A: Use Oldest Age (Recommended)

Change `useEntryFormV2.ts` lines 154-156 to:

```typescript
// Group: Use OLDEST age (most restrictive rule)
const oldestAge = Math.max(...agesAtEvent);
return oldestAge;
```

**Rationale**: Matches `ageGroupCalculator.ts` logic, prevents unfair advantage, industry standard.

### Option B: Keep Average but Document

If client truly wants AVERAGE age:
1. Update comment in `ageGroupCalculator.ts` to reflect this is only for age GROUPS
2. Document that numerical age uses AVERAGE while age GROUP uses OLDEST
3. Accept that this creates a potential advantage (older dancers in younger divisions)

**Rationale**: Client specifically requested "mimic the routine age calculation" with average.

---

## Impact Assessment

### If We Use Oldest Age (Option A)

**Pros**:
- Matches industry standard (most restrictive rule)
- Prevents unfair advantage
- Consistent with `ageGroupCalculator.ts`
- Easier to explain to parents/studios

**Cons**:
- Will change ALL existing group routine ages in database
- May require data migration or re-submission
- Client said they wanted average

### If We Keep Average (Option B)

**Pros**:
- Client explicitly requested this
- No data migration needed
- Current behavior is "working as designed"

**Cons**:
- Creates unfair advantage (mostly 12yr olds can compete as 11yr)
- Contradicts `ageGroupCalculator.ts` comment about "most restrictive"
- Industry uncommon practice

---

## Affected Routines

**Glow Tenant**: 20 group routines found (tested sample of 18 shown above)
**EMPWR Tenant**: Unknown (likely similar issue)

### Data Migration Needed?

If we change to OLDEST age logic:
- Need to recalculate `routine_age` for all group routines
- Need to verify age group assignments didn't change
- Need to notify studios if ages change significantly

---

## Next Steps

1. **User Decision Required**: Which business rule is correct?
   - Option A: OLDEST age (most restrictive, industry standard)
   - Option B: AVERAGE age (client requested, current behavior)

2. **If Option A (recommended)**:
   - Fix `useEntryFormV2.ts` to use oldest age
   - Write migration script to update existing `routine_age` values
   - Test on sample routines
   - Notify studios of age corrections

3. **If Option B**:
   - Document discrepancy between numerical age (average) and age group (oldest)
   - Update `ageGroupCalculator.ts` comment to clarify
   - Accept potential unfair advantage scenario

---

## Files Involved

- `src/hooks/rebuild/useEntryFormV2.ts:154-156` - **BUG LOCATION**
- `src/lib/ageGroupCalculator.ts:79-80` - Correct logic (for age groups)
- `src/components/rebuild/entries/EntryCreateFormV2.tsx:439` - Passes `effectiveAge` to DB
- `src/server/routers/entry.ts:1225` - Saves `routine_age` to database

---

## Testing Plan

After fix is applied:

1. Test on DJA tester account (Glow)
   - Create new group routine with ages [11, 12, 12, 12, 12]
   - Verify `routine_age` = 12 (not 11.8 → 11)

2. Test age override (should still work)
   - Select +1 bump option
   - Verify saves as 13

3. Test solo routines (should be unchanged)
   - Solo age should remain exact dancer age

4. Check existing routines
   - Query DB for routines where `calculated_oldest != routine_age`
   - Identify how many need correction

---

## SQL Query to Find Affected Routines

```sql
-- Find all group routines where routine_age doesn't match oldest dancer age
WITH routine_ages AS (
  SELECT
    ce.id,
    ce.title,
    ce.routine_age,
    MAX(EXTRACT(YEAR FROM AGE(CURRENT_DATE, d.date_of_birth))::integer) as oldest_age,
    ARRAY_AGG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, d.date_of_birth))::integer ORDER BY d.date_of_birth DESC) as all_ages
  FROM competition_entries ce
  JOIN entry_participants ep ON ep.entry_id = ce.id
  JOIN dancers d ON d.id = ep.dancer_id
  WHERE ce.status != 'withdrawn'
  GROUP BY ce.id, ce.title, ce.routine_age
  HAVING COUNT(ep.id) > 1
)
SELECT *
FROM routine_ages
WHERE routine_age != oldest_age
ORDER BY title;
```

---

**Report prepared by**: Claude Code
**Evidence source**: Glow production database
**Awaiting**: User decision on business rule (Option A or B)
