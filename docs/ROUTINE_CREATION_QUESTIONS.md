# Routine Creation - Production Classification Questions

**Status:** Awaiting Clarification
**Created:** 2025-11-02
**Context:** Understanding how Production works as dance style vs group size vs classification

---

## Background

Production is **NOT** a dancer classification. It is a **dance style** that can be selected during routine creation, and it also relates to **group size**.

Key facts established:
- Production should NOT appear in dancer classification dropdown
- Production SHOULD appear during routine creation as a dance style
- When Production style is selected → group size automatically locks to "Production"
- Production is also a group size category that can be forced when chosen as a dance style

---

## Questions Awaiting Answers

### 1. When Production Style is Chosen

**Q: Does selecting "Production" as a dance style force the routine to have 20+ dancers?**
- Or can you select Production style with fewer dancers?
- Is there a minimum dancer count requirement for Production style?

**Q: What happens to the group size selector when Production style is chosen?**
- Is it disabled and locked to "Production"?
- Or just auto-selected but changeable?

---

### 2. When a Routine Has 20+ Dancers

**Q: Does having 20+ dancers automatically set the dance STYLE to "Production"?**
- Or does it only set the GROUP SIZE to "Production" (style can still be Jazz, Contemporary, etc.)?
- Can you have a 25-dancer Jazz routine that's NOT Production style?

**Q: What's the relationship between:**
- Dance Style: Production
- Group Size: Production
- Dancer Count: 20+

Are these independent or linked?

---

### 3. Classification for Production Routines

**Q: When a routine is Production (either by style or by 20+ dancers), what CLASSIFICATION does it get?**

Options:
- A) Uses highest/majority dancer classification (like other group routines)
- B) Gets a special "Production" classification (auto-assigned)
- C) Competition Director assigns classification manually
- D) Something else?

**Q: Is there a "Production" entry in the classifications table?**
- If yes, is it ONLY for routines (never for dancers)?
- If no, how is Production classification handled in the database?

---

### 4. Entry Creation Flow for Production

**Q: When creating a Production routine, what validations apply?**
- Classification validation: Same rules as large groups (60% majority + bump up one)?
- Or different rules because it's Production?
- Can Competition Director override?

**Q: Does the classification exception request system apply to Production routines?**
- Or are Production routines exempt from classification approval flow?

---

### 5. Current Code References

**Files that mention Production:**

1. `src/lib/classificationValidation.ts` (lines 220-227):
```typescript
/**
 * Production: Auto-lock to "Production" classification
 * Phase 2 spec lines 199-227, 324-373
 */
export function getProductionClassification(
  allClassifications: Classification[]
): Classification | null {
  return allClassifications.find(c => c.name === 'Production') || null;
}
```

**Question:** Is this correct? Should Production classification exist in the database?

2. `src/lib/classificationValidation.ts` (lines 244-266):
```typescript
// Production override
if (isProduction) {
  const productionClass = getProductionClassification(allClassifications);
  if (!productionClass) {
    return {
      valid: false,
      error: 'Production classification not found in system',
      suggested: '',
      allowedIds: [],
      rule: 'production'
    };
  }

  return {
    valid: selectedClassificationId === productionClass.id,
    error: selectedClassificationId !== productionClass.id
      ? 'Production entries must use Production classification'
      : undefined,
    suggested: productionClass.id,
    allowedIds: [productionClass.id],
    rule: 'production'
  };
}
```

**Question:** Is this logic correct or outdated?

---

## Immediate Action Needed

**Task:** Remove "Production" from dancer classification dropdown (if it exists)

**Files to check:**
- `src/components/DancerCSVImport.tsx` - CSV import classification selector
- `src/components/DancerBatchForm.tsx` - Batch add classification selector
- `src/components/DancerForm.tsx` - Single dancer add/edit classification selector

**Note:** These forms currently pull classifications from `trpc.lookup.getAllForEntry.useQuery()` which returns all classifications from database. Need to:
1. Check if "Production" exists in classifications table
2. If yes, filter it out from dancer creation forms
3. Keep it available for routine creation only

---

## Related Documentation

- `src/lib/classificationValidation.ts` - Current classification validation logic
- `docs/specs/PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md` - Phase 2 spec (lines 199-227, 324-373)
- `docs/CLASSIFICATION_APPROVAL_SYSTEM.md` - Classification exception request flow

---

## Next Steps

1. Answer questions above
2. Verify Production exists in classifications table
3. Filter Production from dancer dropdowns (if needed)
4. Update warning banner to remove Production mention
5. Clarify Production logic in classificationValidation.ts
