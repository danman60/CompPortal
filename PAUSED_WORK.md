# Paused Work - Auto-Calculation CSV Import Validation

**Paused:** November 4, 2025
**Reason:** New issue arising - need to address priority item

---

## What Was Just Completed

### Feature Flags - DEPLOYED ✅
- Commit: 3b8b9e1
- Dashboard card enabled for SA, CD, djamusic@gmail.com only
- `/dashboard/entries` page protected with feature flag
- Entry creation consolidated (create-v2 → create)
- Build: 76/76 pages passing
- Status: LIVE on production

---

## What Was About to Start

### CSV Import Validation for Age/Classification Rules

**User Request:**
> "heads up these rules will need to be enforced in CSV import/preview as well"

**Analysis Complete:**
- Created `AUTO_CALCULATION_RULES_SUMMARY.md` with full analysis
- Identified gaps: Classification not auto-displayed in entry form
- Identified gaps: CSV import has NO validation currently
- Documented all classification rules (Solo, Duet/Trio, Group, Production)

**Implementation Plan Ready:**
Section 6 of `AUTO_CALCULATION_RULES_SUMMARY.md` outlines:
1. Real-time validation during CSV preview
2. Preview columns: Imported vs Calculated (Age & Classification)
3. Flag violations with warnings
4. Block import until violations resolved

**Files Identified for Changes:**
- `src/components/RoutineCSVImport.tsx` - Add validation step
- `src/lib/classificationValidation.ts` - Export CSV helpers
- `src/lib/ageGroupCalculator.ts` - Export CSV helpers

**Open Questions (Need User Input):**
1. **Age Group:** Youngest or Oldest dancer? (code uses oldest, UI says youngest)
2. **Classification Display:** Should it auto-show in entry form UI?
3. **CSV Strictness:** Block import entirely or allow with warnings?
4. **Approval System:** Implement classification exception requests now or defer to Phase 2?

---

## Current State of Codebase

### Feature Flags
- ✅ Infrastructure complete
- ✅ NEW_ROUTINE_PAGE flag active
- ✅ Dashboard card conditional rendering
- ✅ Entries page access protection
- ✅ Single entry creation route

### Auto-Calculation Rules
- ✅ Age Group: Auto-calculates (oldest dancer)
- ✅ Size Category: Auto-calculates (dancer count)
- ✅ Classification: Validation logic exists but NOT integrated into UI
- ❌ CSV Import: NO validation

### Documentation Created
- `FEATURE_FLAGS.md` - Feature flag usage guide
- `FEATURE_FLAGS_SAFETY.md` - Risk mitigation
- `FEATURE_FLAG_TESTING.md` - Testing guide
- `AUTO_CALCULATION_RULES_SUMMARY.md` - Complete rules analysis (NEW)

---

## How to Resume This Work

### Step 1: Clarify Open Questions
Ask user to confirm:
1. Age group rule: youngest or oldest?
2. Should classification auto-display in entry form?
3. CSV import behavior preference

### Step 2: Implement CSV Validation
Follow implementation plan in `AUTO_CALCULATION_RULES_SUMMARY.md` Section 6:

```typescript
// In RoutineCSVImport.tsx
function validateCSVRow(row, dancers, allClassifications) {
  // 1. Calculate age group from dancers
  const calculatedAgeGroup = inferAgeGroup(dancers, competitionDate);

  // 2. Calculate classification from dancer classifications
  const calculatedClassification = validateEntryClassification(
    dancers,
    row.classification_id,
    allClassifications
  );

  // 3. Compare imported vs calculated
  const violations = [];
  if (row.age_group_id !== calculatedAgeGroup.id) {
    violations.push({
      type: 'age_group',
      imported: row.age_group_name,
      calculated: calculatedAgeGroup.name
    });
  }

  if (!calculatedClassification.valid) {
    violations.push({
      type: 'classification',
      imported: row.classification_name,
      suggested: calculatedClassification.suggested,
      error: calculatedClassification.error
    });
  }

  return { valid: violations.length === 0, violations };
}
```

### Step 3: Update Preview UI
Add columns to CSV preview table:
- Imported Age Group
- Calculated Age Group
- Imported Classification
- Calculated Classification
- Status (✅ OK / ⚠️ Fix Required)

### Step 4: Test on Both Tenants
- EMPWR: Test with existing CSV imports
- Glow: Test with new data
- Verify validation catches violations
- Verify error messages are clear

---

## Priority After Resume

1. Clarify age group rule (youngest vs oldest)
2. Implement CSV validation
3. Test CSV import flow end-to-end
4. Consider adding classification to entry form UI (if needed)
5. Consider classification approval system (if launch blocker)

---

**Status:** PAUSED - Ready to resume when new issue resolved
**Next Session:** Start by reading this file + AUTO_CALCULATION_RULES_SUMMARY.md
