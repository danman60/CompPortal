# Auto-Classification Logic for Group Routines

**Date:** November 6, 2025
**Source:** `src/lib/classificationValidation.ts`

---

## Overview

Classification is auto-computed based on **entry size** (number of dancers) and **dancer classifications**. Different rules apply based on group size.

---

## Entry Size Rules

**Function:** `getClassificationRule(dancerCount)` (lines 25-31)

| Dancer Count | Rule Name | Auto-Classification Logic |
|--------------|-----------|---------------------------|
| 1 | Solo | 100% locked to dancer's classification |
| 2-3 | Duet/Trio | Highest dancer classification |
| 4-19 | Group | 60% majority rule OR highest |
| 20+ | Production | Auto-locked to "Production" classification |

---

## 1. Solo (1 dancer)

**Function:** `validateSoloClassification()` (lines 37-50)

**Rule:** Classification MUST match dancer's classification (100% locked)

```typescript
// Example: Dancer is "Intermediate"
const result = validateSoloClassification(dancer, selectedClassificationId);

// Only valid if:
selectedClassificationId === dancer.classification_id

// Returns:
{
  valid: true/false,
  error: "Solo must use dancer's classification (Intermediate)",
  suggested: dancer.classification_id  // Auto-suggested value
}
```

**No flexibility** - Cannot bump up or down.

---

## 2. Duet/Trio (2-3 dancers)

**Function:** `validateDuetTrioClassification()` (lines 56-118)

**Rule:** Uses **highest dancer classification**, can bump up ONE level

### Algorithm:
```typescript
// Step 1: Find highest classification among dancers
const highest = dancers.reduce((max, curr) =>
  curr.classification.skill_level > max.skill_level ? curr.classification : max
, dancers[0].classification);

// Step 2: Allow highest OR one level higher
const allowed = allClassifications.filter(c =>
  c.skill_level >= highest.skill_level &&
  c.skill_level <= highest.skill_level + 1
);
```

### Example:
```
Dancers:
- Dancer A: Beginner (level 1)
- Dancer B: Intermediate (level 2)

Highest: Intermediate (level 2)

Allowed Classifications:
✅ Intermediate (level 2) - Suggested
✅ Advanced (level 3) - Can bump up one level
❌ Beginner (level 1) - Below highest
❌ Elite (level 4) - More than one level up
```

**Returns:**
```typescript
{
  valid: true/false,
  error: "Minimum Intermediate (based on highest dancer)",
  suggested: highest.id,  // Auto-suggested (highest dancer's classification)
  allowedIds: [intermediate.id, advanced.id],
  highestLevel: 2
}
```

---

## 3. Group/Line (4-19 dancers)

**Function:** `validateGroupClassification()` (lines 124-217)

**Rule:** Uses **60% majority** classification OR highest if no 60% majority

### Algorithm:
```typescript
// Step 1: Count dancers per classification
const counts: Record<string, number> = {};
dancers.forEach(d => {
  counts[d.classification_id] = (counts[d.classification_id] || 0) + 1;
});

// Step 2: Find 60%+ majority
for (const [classId, count] of Object.entries(counts)) {
  if (count / total >= 0.6) {
    majorityClassification = classification;
    break;
  }
}

// Step 3: If no 60% majority, use highest
if (!majorityClassification) {
  majorityClassification = highest;
}

// Step 4: Allow majority OR one level higher
const allowed = allClassifications.filter(c =>
  c.skill_level >= majorityClassification.skill_level &&
  c.skill_level <= majorityClassification.skill_level + 1
);
```

### Example 1: Clear 60% Majority
```
10 dancers:
- 7 Intermediate (70%) ← 60%+ majority
- 2 Advanced
- 1 Beginner

Majority: Intermediate (70%)

Allowed Classifications:
✅ Intermediate (suggested)
✅ Advanced (bump up one level)
❌ Beginner (below majority)
❌ Elite (more than one level up)
```

### Example 2: No 60% Majority
```
10 dancers:
- 5 Intermediate (50%) ← Not 60%+
- 3 Advanced (30%)
- 2 Beginner (20%)

No 60% majority → Use highest: Advanced

Allowed Classifications:
✅ Advanced (suggested - highest)
✅ Elite (bump up one level)
❌ Intermediate (below highest)
```

**Returns:**
```typescript
{
  valid: true/false,
  error: "Minimum Intermediate (60% majority)",
  suggested: majority.id,  // Auto-suggested
  allowedIds: [intermediate.id, advanced.id],
  majorityPercentage: 70,
  majorityName: "Intermediate"
}
```

---

## 4. Production (20+ dancers)

**Function:** `getProductionClassification()` (lines 223-227)

**Rule:** Auto-locked to "Production" classification

```typescript
const productionClass = allClassifications.find(c => c.name === 'Production');

// Only valid if:
selectedClassificationId === productionClass.id

// Returns:
{
  valid: true/false,
  error: "Production entries must use Production classification",
  suggested: productionClass.id,
  allowedIds: [productionClass.id],  // Only one option
  rule: 'production'
}
```

**No flexibility** - Always uses "Production" classification.

---

## Summary: Auto-Calculation Rules

| Entry Size | Auto-Calculation Logic | Flexibility |
|------------|------------------------|-------------|
| **Solo (1)** | Dancer's classification | None (locked) |
| **Duet/Trio (2-3)** | Highest dancer | Can bump up 1 level |
| **Group (4-19)** | 60% majority OR highest | Can bump up 1 level |
| **Production (20+)** | "Production" classification | None (locked) |

---

## When Does Auto-Calculation Trigger?

**At routine creation time:**
1. Studio Director selects dancers for routine
2. System counts dancers → determines rule
3. System calculates suggested classification
4. System filters dropdown to show ONLY allowed classifications
5. Studio Director selects from allowed options (or accepts suggested)

**Validation happens:**
- ✅ Client-side (form validation)
- ✅ Server-side (entry creation endpoint)
- ✅ On dancer add/remove (recalculates)

---

## Example Flow: Creating a Group Routine

```
Step 1: SD selects 8 dancers
- 5 Intermediate (62.5%) ← 60%+ majority
- 2 Advanced
- 1 Beginner

Step 2: System calculates
Rule: Group (4-19 dancers)
Majority: Intermediate (62.5%)
Suggested: Intermediate

Step 3: System filters classification dropdown
✅ Intermediate (suggested, highlighted)
✅ Advanced (can bump up)
❌ Beginner (disabled - below majority)
❌ Elite (disabled - more than one level up)

Step 4: SD selects classification
Option A: Accept Intermediate (suggested)
Option B: Choose Advanced (bump up one level)

Step 5: System validates selection
✅ If Intermediate or Advanced → Success
❌ If anything else → Error: "Minimum Intermediate (60% majority)"
```

---

## Key Concepts

**Skill Level:** Each classification has a numeric skill_level (e.g., Beginner=1, Intermediate=2, Advanced=3, Elite=4)

**Bump Up One Level:** Studio Director can select classification ONE level higher than suggested (e.g., Intermediate → Advanced)

**60% Majority:** If 60%+ of dancers share same classification, that becomes the minimum for group routines

**Fallback to Highest:** If no 60% majority, system uses highest dancer's classification

**Auto-Lock:** Solo and Production entries have no flexibility (100% locked)

---

## Code Location

**Primary Logic:** `src/lib/classificationValidation.ts`
- Lines 25-31: Entry size rules
- Lines 37-50: Solo validation
- Lines 56-118: Duet/Trio validation
- Lines 124-217: Group validation (60% majority)
- Lines 223-227: Production auto-lock
- Lines 232-293: Main validation function

**Usage in Forms:**
- `src/components/UnifiedRoutineForm.tsx`
- `src/hooks/rebuild/useEntryFormV2.ts`
- `src/components/rebuild/entries/AutoCalculatedSection.tsx`

---

**Status:** ✅ Auto-classification fully implemented and validated (Phase 2 spec lines 113-227)
