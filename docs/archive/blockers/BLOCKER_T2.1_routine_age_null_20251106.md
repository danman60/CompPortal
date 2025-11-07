# BLOCKER: T2.1 & T2.2 - Routine Age Not Saved to Database (SYSTEMIC)

**Tests Affected:** T2.1 (Solo), T2.2 (Duet) - Affects ALL entry types
**Date:** 2025-11-06 23:14 UTC (T2.1), 23:18 UTC (T2.2)
**Severity:** P1 - High (Data integrity issue, systemic across all entry types)
**Status:** CONFIRMED SYSTEMIC - Needs Fix

## Issue Description

Age auto-calculation displays correctly in UI but `routine_age` column saves as `null` in database for ALL entry types (Solo, Duet/Trio tested).

**Confirmed Pattern:**
- **T2.1 (Solo)**: UI showed "Calculated: 16", database saved `null`
- **T2.2 (Duet)**: UI showed "Calculated: 14", database saved `null`

## Steps to Reproduce

**T2.1 (Solo):**
1. Create entry with 1 dancer (Emma Johnson, 16 years old)
2. UI shows "Calculated: 16"
3. Save entry
4. Database: `routine_age = null`

**T2.2 (Duet):**
1. Create entry with 2 dancers (Emma 16 + Ava 13)
2. UI shows "Calculated: 14" (average: (16+13)/2 = 14.5, rounded down)
3. Save entry
4. Database: `routine_age = null`

## Expected Behavior

Per Phase 1 spec lines 398-438:
- Age should be calculated from dancer birthdate
- Age should be saved to `competition_entries.routine_age` column
- Value should match UI display (16)

## Actual Behavior

- UI correctly displays: "Calculated: 16 (can select 16 or 17)"
- Age dropdown shows: "Age 16 (use calculated)" [SELECTED]
- Database saves: `routine_age = null`

## Evidence

**Screenshot:** `evidence/screenshots/T2.1-solo-entry-created-empwr-20251106.png`

**Database Query:**
```sql
SELECT title, routine_age, entry_size_category_id, classification_id, category_id, choreographer
FROM competition_entries
WHERE title = 'Test Solo - 20251106-175000'
AND tenant_id = '00000000-0000-0000-0000-000000000001';
```

**Result:**
```json
{
  "title": "Test Solo - 20251106-175000",
  "routine_age": null,  // ❌ SHOULD BE 16
  "entry_size_category_id": "390f9890-9ca4-4741-8d68-0f488a4f6860",  // ✅ Solo
  "classification_id": "06433248-e61e-4c61-8244-0c8657dccd50",  // ✅ Adult
  "category_id": "890c7630-ba83-4f1d-947f-59173a5d869f",  // ✅ Jazz
  "choreographer": "Test Choreographer",  // ✅ Correct
  "status": "draft"
}
```

## Impact Assessment

**Data Integrity:** Medium
- Routine entries missing age data
- May affect reporting, scoring, age group assignments

**User Experience:** Low
- UI displays correctly
- User unaware of missing data

**Launch Blocker:** NO
- Feature works end-to-end (entry created, capacity updated)
- Age displayed correctly in UI
- Can be fixed post-launch if needed

**Workaround:** Age can be manually verified from dancer birthdates

## Root Cause (Hypothesis)

Likely causes:
1. Frontend form state not including `routine_age` in submission payload
2. Backend endpoint not extracting age from request
3. Age calculation happening client-side but not sent to server

**Next Steps to Investigate:**
1. Check entry creation tRPC mutation payload
2. Verify EntryForm.tsx includes routine_age in submit data
3. Check backend entry.create endpoint handles routine_age

## Recommendation

**Priority:** P1 - Fix before full production launch
**Timeline:** Can be addressed during next testing cycle
**Reason:** Data completeness important for long-term system integrity

## Related Tests

- ✅ T2.1: Solo Entry - `routine_age = null` CONFIRMED
- ✅ T2.2: Duet Entry - `routine_age = null` CONFIRMED
- ⚠️ T2.3-T2.8: Likely affected (same root cause)
- ⚠️ All manual entry creation tests will show this issue
