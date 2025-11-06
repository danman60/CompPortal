# Auto-Calculation Rules - Current Implementation

**Created:** November 4, 2025
**Purpose:** Document existing Age & Classification auto-calculation logic for routine entries

---

## 1. Age Group Auto-Calculation

**Source Files:**
- `src/components/rebuild/entries/AutoCalculatedSection.tsx` (lines 24-149)
- `src/lib/ageGroupCalculator.ts` (lines 1-128)
- `src/lib/validators/businessRules.ts` (lines 212-271)

### Current Logic

**Calculation Method:**
```typescript
// Uses YOUNGEST dancer's date of birth + competition date
const age = competitionDate.getFullYear() - birthDate.getFullYear();
// Adjust for birthday not yet occurred
if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
  age--;
}
```

**Age → Age Group Mapping:**
- **Petite:** ≤ 7 years
- **Mini:** ≤ 9 years
- **Junior:** ≤ 12 years
- **Teen:** ≤ 15 years
- **Senior:** ≤ 19 years
- **Adult:** 20+ years

**IMPORTANT NOTE:** Code uses **youngest** dancer (ageGroupCalculator.ts:73), but comment says "MOST RESTRICTIVE RULE: Use oldest dancer's age group" (line 75). **This is a discrepancy that needs clarification.**

```typescript
// Current implementation (line 73)
const youngestAge = ages[ages.length - 1].age;
const ageGroup = getAgeGroup(oldestAge); // Uses oldest, not youngest!
```

**Actual behavior:** Uses **OLDEST** dancer's age group (line 76)

### User Experience

**Auto-Detection Display:**
```
┌─────────────────────────────────────┐
│ Detected: Junior                    │
│ (based on youngest dancer)          │ ← Misleading label
└─────────────────────────────────────┘
```

**Manual Override:**
- Dropdown allows selecting any age group
- Shows warning: "⚠️ Manual override active"
- Validation warns if selection differs by >1 level from calculated

**Validation:**
- `validateDancerAge()`: Checks dancer age falls within selected age group min/max
- Allows entries without birth dates (logs warning only)

---

## 2. Size Category Auto-Calculation

**Source Files:**
- `src/components/rebuild/entries/AutoCalculatedSection.tsx` (lines 94-134)

### Current Logic

**Calculation Method:**
```typescript
// Simple count of selected dancers
const dancerCount = selectedDancers.length;

// Maps to size category ranges (configured in database)
// Example:
// - Solo: 1 dancer
// - Duo: 2 dancers
// - Group: 3-10 dancers
// - Line: 11-19 dancers
// - Production: 20+ dancers
```

**Auto-Detection Display:**
```
┌─────────────────────────────────────┐
│ Detected: Group                     │
│ (5 dancers)                         │
└─────────────────────────────────────┘
```

**Manual Override:**
- Dropdown allows selecting any size category
- Shows warning: "⚠️ Manual override active"
- No validation on reasonableness of override

---

## 3. Classification Auto-Calculation

**Source Files:**
- `src/lib/classificationValidation.ts` (lines 1-294)
- Referenced in CLASSIFICATION_APPROVAL_SYSTEM.md

### Current Logic

**Rule Selection Based on Dancer Count:**
```typescript
if (count === 1) → Solo Rule
if (count === 2-3) → Duet/Trio Rule
if (count === 4-19) → Group Rule
if (count >= 20) → Production Rule
```

### Rule 1: Solo (1 dancer)

**LOCKED - NO EXCEPTIONS**
```typescript
// Classification MUST match dancer's individual classification
// Cannot bump up or down
selectedClassification === dancer.classification_id
```

**Example:**
- Dancer: Novice → Routine MUST be Novice
- No ability to bump up to Intermediate

### Rule 2: Duet/Trio (2-3 dancers)

**Highest dancer classification + optional bump up ONE level**
```typescript
// Step 1: Find highest classification among dancers
const highest = dancers.reduce((max, curr) =>
  curr.classification.skill_level > max.skill_level ? curr : max
);

// Step 2: Allowed classifications
allowedLevels = [highest.skill_level, highest.skill_level + 1];
```

**Example:**
- Dancers: Novice + Intermediate
- Highest: Intermediate (level 2)
- Allowed: Intermediate OR Advanced (level 3)
- NOT ALLOWED: Novice (below highest), Elite (2+ levels up)

### Rule 3: Group (4-19 dancers)

**60% majority rule OR highest classification + optional bump up ONE level**
```typescript
// Step 1: Check for 60%+ majority
for (each classification) {
  if (count / total >= 0.6) {
    majorityClassification = classification;
  }
}

// Step 2: If no 60% majority, use highest
if (!majorityClassification) {
  majorityClassification = highest;
}

// Step 3: Allowed classifications
allowedLevels = [majority.skill_level, majority.skill_level + 1];
```

**Example 1 (Majority Exists):**
- 10 dancers: 7 Novice + 3 Intermediate
- 70% Novice → Majority = Novice
- Allowed: Novice OR Intermediate (bump up 1 level)

**Example 2 (No Majority):**
- 10 dancers: 3 Novice + 3 Intermediate + 4 Advanced
- No 60% majority → Use highest (Advanced)
- Allowed: Advanced OR Elite (bump up 1 level)

### Rule 4: Production (20+ dancers)

**AUTO-LOCKED - NO EXCEPTIONS**
```typescript
// Must use "Production" classification
// Cannot use any other classification
selectedClassification.name === 'Production'
```

**Example:**
- 25 dancers with any mix of classifications
- Routine AUTOMATICALLY set to "Production"
- No ability to select Novice, Intermediate, etc.

---

## 4. Current Gaps & Issues

### Issue 1: Classification NOT Auto-Displayed in Entry Form

**Current State:**
- ✅ Age Group: Auto-calculated and displayed
- ✅ Size Category: Auto-calculated and displayed
- ❌ **Classification: Validation logic exists but NOT integrated into entry form UI**

**What Exists:**
- `classificationValidation.ts` has all validation functions
- Functions return `suggested`, `allowedIds`, `error` messages

**What's Missing:**
- No "Auto-Calculated Classification" section in EntryCreateFormV2
- No real-time classification suggestion as dancers are selected
- No pre-filtering of classification dropdown based on rules

### Issue 2: CSV Import - No Validation

**Current State:**
- RoutineCSVImport.tsx exists (line 9 in AutoCalculatedSection references)
- **Does NOT enforce age/classification rules during import**

**What Needs to be Added:**
- Age group validation per dancer DOB
- Classification validation per dancer count + classifications
- Preview showing calculated vs. imported values
- Warnings/errors for rule violations

### Issue 3: Age Group Label Mismatch

**Code Comment vs. Implementation:**
- UI says: "based on youngest dancer"
- Code actually uses: **oldest dancer's age group**
- Need clarification: Which is correct business logic?

---

## 5. Classification Approval System (Design Phase)

**Status:** Designed but not implemented (CLASSIFICATION_APPROVAL_SYSTEM.md)

### Proposed Flow

**When SD violates classification rules:**
1. **Entry creation blocked** with modal popup
2. **Two options:**
   - "Go Back" → Fix classification manually
   - "Request Exception" → Send to CD for approval

**Request includes:**
- Routine details
- All dancers + their classifications
- Auto-calculated classification
- Requested classification
- SD's text justification (REQUIRED)

**CD Review:**
- Badge in CD dashboard showing pending requests
- Card-based review interface
- Filter by studio
- Shows all context (dancers, calculations, justification)

**CD Decision Options:**
1. ✅ Approve as Requested
2. ❌ Deny - Keep Auto-Calculated
3. 🔄 Approve with Different Classification (dropdown)
4. 📞 Further Clarification Required

**Edge Cases:**
- 5-day reminder if no CD response
- SD can delete entry before CD responds
- Production entries (20+): NO EXCEPTIONS allowed

---

## 6. Next Steps for CSV Import Validation

### Required Implementation

**1. Real-Time Validation During CSV Preview**
```typescript
// For each row in CSV:
// - Parse dancer DOBs
// - Calculate age group from youngest/oldest (clarify which!)
// - Validate age group matches imported value
// - Calculate classification from dancer classifications
// - Validate classification matches imported value
// - Flag violations with error/warning
```

**2. Preview Table Columns**
```
| Routine Name | Dancers | Imported Age | Calc Age | Imported Class | Calc Class | Status |
|--------------|---------|--------------|----------|----------------|------------|--------|
| Jazz Solo    | 1       | Junior       | Junior   | Novice         | Novice     | ✅ OK   |
| Hip Hop Duo  | 2       | Teen         | Junior   | Advanced       | Intermedi. | ⚠️ FIX  |
```

**3. Validation Rules**
- **Age Group:** Must match calculated (youngest or oldest dancer - TBD)
- **Classification:**
  - Solo: Must match exactly
  - Duet/Trio: Must be highest or +1 level
  - Group: Must be 60% majority (or highest) or +1 level
  - Production: Must be "Production"

**4. User Actions on Violations**
- **Option 1:** Fix in CSV and re-upload
- **Option 2:** Edit in preview table (if editable)
- **Option 3:** Request exception for each violation (if approval system implemented)
- **Block import** if unresolved violations exist

### Files to Modify

1. **RoutineCSVImport.tsx**
   - Add validation step after CSV parse
   - Show validation results in preview
   - Block import if violations exist

2. **classificationValidation.ts**
   - Export helper for CSV validation
   - Return user-friendly error messages

3. **ageGroupCalculator.ts**
   - Export helper for CSV validation
   - Clarify youngest vs. oldest logic

---

## 7. Open Questions

**Q1: Age Group - Youngest or Oldest?**
- UI label says "youngest"
- Code uses "oldest"
- Which is correct business rule?

**Q2: Classification Auto-Display**
- Should EntryCreateFormV2 show calculated classification?
- Should dropdown be pre-filtered to only show allowed classifications?
- Or keep validation on save/submit only?

**Q3: CSV Import Strictness**
- Block import entirely if violations?
- Or allow import with warnings + require fixes before summary submission?

**Q4: Classification Approval System**
- Implement now or defer?
- Required for launch or Phase 2 feature?

---

**End of Document**
