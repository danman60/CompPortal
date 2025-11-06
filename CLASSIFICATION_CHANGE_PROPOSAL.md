# Classification Logic Change Proposal

**Date:** November 6, 2025
**Status:** Planning - NOT YET IMPLEMENTED
**Priority:** P1 - Business Logic Change

---

## Current Logic (Group Routines 4-19 dancers)

**Algorithm:**
1. Count dancers per classification
2. Find 60%+ majority classification
3. If no 60% majority → Use highest dancer's classification
4. Allow selected classification OR one level higher

**Example:**
```
10 dancers:
- 7 Intermediate (level 2) - 70% majority
- 2 Advanced (level 3)
- 1 Beginner (level 1)

Current Result: Intermediate (majority)
Allowed: Intermediate OR Advanced (+1 bump)
```

---

## Proposed New Logic (Group Routines 4-19 dancers)

**Algorithm:**
1. Calculate AVERAGE of all dancer classification levels
2. Round to nearest classification level
3. Allow selected classification OR one level higher (+1 bump)

**Example:**
```
10 dancers:
- 7 Intermediate (level 2)
- 2 Advanced (level 3)
- 1 Beginner (level 1)

Calculation:
(7×2 + 2×3 + 1×1) / 10 = (14 + 6 + 1) / 10 = 21 / 10 = 2.1

Average: 2.1 → Round to 2 (Intermediate)

New Result: Intermediate (average)
Allowed: Intermediate OR Advanced (+1 bump)
```

---

## Comparison: 60% Majority vs Average

### Scenario 1: Clear Majority
```
10 dancers:
- 7 Intermediate (level 2)
- 3 Beginner (level 1)

Current (60% majority):
Majority: Intermediate (70%)
Suggested: Intermediate

Proposed (average):
Average: (7×2 + 3×1) / 10 = 17 / 10 = 1.7 → Round to 2 (Intermediate)
Suggested: Intermediate

✅ SAME RESULT
```

### Scenario 2: No Clear Majority (Evenly Split)
```
10 dancers:
- 5 Intermediate (level 2)
- 5 Advanced (level 3)

Current (60% majority):
No 60% majority → Use highest: Advanced (level 3)
Suggested: Advanced

Proposed (average):
Average: (5×2 + 5×3) / 10 = 25 / 10 = 2.5 → Round to 3 (Advanced)
Suggested: Advanced

✅ SAME RESULT (in this case)
```

### Scenario 3: Mixed Classifications
```
12 dancers:
- 6 Intermediate (level 2) - 50% (not 60%+)
- 4 Advanced (level 3)
- 2 Elite (level 4)

Current (60% majority):
No 60% majority → Use highest: Elite (level 4)
Suggested: Elite ⚠️

Proposed (average):
Average: (6×2 + 4×3 + 2×4) / 12 = (12 + 12 + 8) / 12 = 32 / 12 = 2.67 → Round to 3 (Advanced)
Suggested: Advanced ✅

❌ DIFFERENT RESULT
Current logic forces Elite (highest), even though most dancers are Intermediate/Advanced
New logic suggests Advanced (more representative of group)
```

### Scenario 4: Wide Spread
```
8 dancers:
- 2 Beginner (level 1)
- 3 Intermediate (level 2)
- 2 Advanced (level 3)
- 1 Elite (level 4)

Current (60% majority):
No 60% majority → Use highest: Elite (level 4)
Suggested: Elite ⚠️

Proposed (average):
Average: (2×1 + 3×2 + 2×3 + 1×4) / 8 = (2 + 6 + 6 + 4) / 8 = 18 / 8 = 2.25 → Round to 2 (Intermediate)
Suggested: Intermediate ✅

❌ DIFFERENT RESULT
Current logic forces Elite (highest), even though only 1 Elite dancer
New logic suggests Intermediate (middle of the pack)
```

---

## Advantages of Average Method

1. **More Representative:** Reflects overall skill level of group, not just highest dancer
2. **Consistent with Age Logic:** Matches existing age calculation pattern
3. **Fairer Placement:** Doesn't penalize groups with one high-level dancer
4. **Simpler to Understand:** "Average of dancers" vs "60% majority or highest"
5. **Better Edge Cases:** Handles mixed groups more fairly

---

## Rounding Rules

**Standard Rounding (Round to Nearest):**
- Average 1.0-1.49 → Round to 1 (Beginner)
- Average 1.5-2.49 → Round to 2 (Intermediate)
- Average 2.5-3.49 → Round to 3 (Advanced)
- Average 3.5-4.0 → Round to 4 (Elite)

**Alternative (Round Up):**
- Average 1.01+ → Round to 2
- Average 2.01+ → Round to 3
- Average 3.01+ → Round to 4

**Question for User:** Standard rounding (round to nearest) or always round up?

---

## Implementation Plan

### Files to Modify:

1. **`src/lib/classificationValidation.ts`**
   - Modify `validateGroupClassification()` function (lines 124-217)
   - Replace 60% majority logic with average calculation
   - Keep "+1 bump" logic unchanged

2. **UI Messages (if any)**
   - Update error messages from "60% majority" to "group average"
   - Update tooltips/help text

3. **Tests**
   - Update test cases for new logic
   - Add tests for rounding edge cases

### Code Changes:

```typescript
// OLD (lines 136-165):
// Count dancers per classification
const counts: Record<string, number> = {};
dancers.forEach(d => {
  counts[d.classification_id] = (counts[d.classification_id] || 0) + 1;
});

// Find 60%+ majority
let majorityClassification: Classification | null = null;
let majorityCount = 0;

for (const [classId, count] of Object.entries(counts)) {
  if (count / total >= 0.6) {
    const classification = dancers.find(d => d.classification_id === classId)?.classification;
    if (classification) {
      majorityClassification = classification;
      majorityCount = count;
      break;
    }
  }
}

// No 60% majority: use highest classification
if (!majorityClassification) {
  const highest = dancers.reduce((max, curr) =>
    curr.classification.skill_level > max.skill_level ? curr.classification : max
  , dancers[0].classification);
  majorityClassification = highest;
}

// NEW:
// Calculate average classification level
const totalLevel = dancers.reduce((sum, d) => sum + d.classification.skill_level, 0);
const averageLevel = totalLevel / dancers.length;

// Round to nearest integer
const roundedLevel = Math.round(averageLevel);

// Find classification with this skill level
const suggestedClassification = allClassifications.find(c => c.skill_level === roundedLevel);

if (!suggestedClassification) {
  throw new Error(`No classification found for skill level ${roundedLevel}`);
}
```

### Return Value Changes:

```typescript
// OLD:
{
  majorityPercentage: (majorityCount / total) * 100,
  majorityName: "Intermediate"
}

// NEW:
{
  averageLevel: 2.67,
  roundedLevel: 3,
  suggestedName: "Advanced"
}
```

---

## Questions for User

Before implementing, please confirm:

1. **Rounding Method:**
   - ✅ Standard rounding (1.5 → 2, 2.5 → 3)?
   - OR Always round up (1.01 → 2, 2.01 → 3)?

2. **Bump Logic:**
   - Keep "+1 bump" logic unchanged? (SD can select average OR +1 level higher)

3. **Solo/Duet/Trio:**
   - Keep solo logic unchanged (locked to dancer's classification)?
   - Keep duet/trio logic unchanged (highest dancer + optional bump)?
   - OR apply average logic to duet/trio as well?

4. **Production:**
   - Keep production logic unchanged (locked to "Production" classification)?

5. **Error Messages:**
   - Update UI messages to say "group average" instead of "60% majority"?

6. **Age Calculation:**
   - Confirm: Age already uses average + round + optional bump?
   - Should classification work exactly the same way?

---

## Testing Checklist

After implementation:
- [ ] Test with 10 dancers, all same classification (average = exact)
- [ ] Test with mixed classifications (average = fractional)
- [ ] Test rounding edge cases (1.5, 2.5, 3.5)
- [ ] Test "+1 bump" still works
- [ ] Test validation rejects below average
- [ ] Test validation rejects more than +1 bump
- [ ] Verify error messages display correctly
- [ ] Test on production (EMPWR + Glow tenants)

---

## Estimated Implementation Time

- Code changes: 30 minutes
- Testing: 30 minutes
- Deployment + verification: 15 minutes
- **Total: 1.25 hours**

---

**Status:** ⏳ Awaiting user confirmation on questions above before proceeding
