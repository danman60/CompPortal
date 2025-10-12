# Task: Add Age Group Auto-Inference

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 1-2 hours
**Status**: Ready for Codex

---

## Context

Automatically calculate the age group for a routine based on dancer ages (DOB) and routine classification. Use the most restrictive division. Allow manual override.

**Age Groups**:
- Petite: 5-7 years
- Mini: 8-9 years
- Junior: 10-12 years
- Teen: 13-15 years
- Senior: 16-19 years
- Adult: 20+ years

---

## Implementation

### File to Create

**Helper**: `src/lib/ageGroupCalculator.ts`

```typescript
/**
 * Age Group Calculator for Dance Competitions
 * Uses dancer DOBs and routine classification to determine age division
 */

export type AgeGroup = 'Petite' | 'Mini' | 'Junior' | 'Teen' | 'Senior' | 'Adult';

interface Dancer {
  date_of_birth: string | Date; // ISO date string or Date object
  first_name?: string;
  last_name?: string;
}

/**
 * Calculate age as of competition date (or today if not specified)
 */
export function calculateAge(dob: string | Date, asOfDate?: Date): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const referenceDate = asOfDate || new Date();

  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get age group from age
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age <= 7) return 'Petite';
  if (age <= 9) return 'Mini';
  if (age <= 12) return 'Junior';
  if (age <= 15) return 'Teen';
  if (age <= 19) return 'Senior';
  return 'Adult';
}

/**
 * Infer age group for routine based on dancers
 * Uses MOST RESTRICTIVE rule:
 * - For groups: Use the OLDEST dancer's age group
 * - For solos: Use the dancer's age group
 */
export function inferAgeGroup(
  dancers: Dancer[],
  classification: string,
  competitionDate?: Date
): {
  ageGroup: AgeGroup;
  oldestAge: number;
  youngestAge: number;
  ageRange: string;
} | null {
  if (!dancers || dancers.length === 0) {
    return null;
  }

  // Calculate ages for all dancers
  const ages = dancers
    .map(d => ({
      dancer: d,
      age: calculateAge(d.date_of_birth, competitionDate)
    }))
    .sort((a, b) => b.age - a.age); // Sort by age descending (oldest first)

  const oldestAge = ages[0].age;
  const youngestAge = ages[ages.length - 1].age;

  // MOST RESTRICTIVE RULE: Use oldest dancer's age group
  const ageGroup = getAgeGroup(oldestAge);

  return {
    ageGroup,
    oldestAge,
    youngestAge,
    ageRange: ages.length === 1
      ? `${oldestAge}`
      : `${youngestAge}-${oldestAge}`
  };
}

/**
 * Format age group for display with age range
 */
export function formatAgeGroupDisplay(result: ReturnType<typeof inferAgeGroup>): string {
  if (!result) return 'Unknown';

  if (result.oldestAge === result.youngestAge) {
    return `${result.ageGroup} (Age ${result.oldestAge})`;
  }

  return `${result.ageGroup} (Ages ${result.ageRange})`;
}

/**
 * Validate if manual override is reasonable
 */
export function validateAgeGroupOverride(
  inferredGroup: AgeGroup,
  manualGroup: AgeGroup,
  ages: { oldest: number; youngest: number }
): { valid: boolean; warning?: string } {
  // Allow override but warn if it's way off
  const allGroups: AgeGroup[] = ['Petite', 'Mini', 'Junior', 'Teen', 'Senior', 'Adult'];
  const inferredIndex = allGroups.indexOf(inferredGroup);
  const manualIndex = allGroups.indexOf(manualGroup);

  const diff = Math.abs(inferredIndex - manualIndex);

  if (diff === 0) {
    return { valid: true };
  }

  if (diff === 1) {
    return {
      valid: true,
      warning: `Note: Manual group differs from calculated (${inferredGroup})`
    };
  }

  return {
    valid: true,
    warning: `⚠️ WARNING: Manual group significantly differs from calculated (${inferredGroup}). Please verify.`
  };
}
```

---

## Integration Points

### 1. During Routine Creation

**File**: `src/components/EntryForm.tsx` (or create page)

**Add state for age group**:
```typescript
const [inferredAgeGroup, setInferredAgeGroup] = useState<string | null>(null);
const [manualAgeGroupOverride, setManualAgeGroupOverride] = useState<string | null>(null);
```

**Calculate when dancers added**:
```typescript
import { inferAgeGroup, formatAgeGroupDisplay } from '@/lib/ageGroupCalculator';

// When dancers are assigned
useEffect(() => {
  if (selectedDancers.length > 0 && classification) {
    const result = inferAgeGroup(selectedDancers, classification);
    if (result) {
      setInferredAgeGroup(result.ageGroup);
    }
  }
}, [selectedDancers, classification]);
```

**Display with override option**:
```tsx
<div className="bg-white/5 rounded-lg p-4">
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Age Group
  </label>

  {/* Show inferred */}
  {inferredAgeGroup && (
    <div className="bg-blue-500/10 border border-blue-400/30 rounded p-3 mb-2">
      <div className="text-blue-200 text-sm">
        ✨ Auto-calculated: <strong>{inferredAgeGroup}</strong>
      </div>
      <div className="text-blue-300/70 text-xs mt-1">
        Based on dancers' ages (using oldest dancer)
      </div>
    </div>
  )}

  {/* Allow manual override */}
  <select
    value={manualAgeGroupOverride || inferredAgeGroup || ''}
    onChange={(e) => setManualAgeGroupOverride(e.target.value)}
    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
  >
    <option value="">Select age group...</option>
    <option value="Petite">Petite (5-7)</option>
    <option value="Mini">Mini (8-9)</option>
    <option value="Junior">Junior (10-12)</option>
    <option value="Teen">Teen (13-15)</option>
    <option value="Senior">Senior (16-19)</option>
    <option value="Adult">Adult (20+)</option>
  </select>

  {manualAgeGroupOverride && manualAgeGroupOverride !== inferredAgeGroup && (
    <div className="text-yellow-400 text-xs mt-2">
      ⚠️ Manual override applied (calculated: {inferredAgeGroup})
    </div>
  )}
</div>
```

### 2. In Review Bar

**File**: `src/components/RoutineReviewBar.tsx` (if created in previous task)

**Update age group display**:
```tsx
<div className="bg-white/10 rounded-lg p-3 border border-white/20">
  <div className="text-gray-400 text-xs mb-1">Age Group</div>
  <div className="text-white font-medium flex items-center gap-2">
    <span className="text-xl">👶</span>
    {ageGroup ? (
      <span className="flex items-center gap-1">
        {ageGroup}
        {isInferred && <span className="text-xs text-blue-400">✨ auto</span>}
      </span>
    ) : (
      <span className="text-gray-500">Will auto-calculate</span>
    )}
  </div>
</div>
```

### 3. Save to Database

**In form submit handler**:
```typescript
const ageGroupToSave = manualAgeGroupOverride || inferredAgeGroup;

await createEntry({
  ...formData,
  age_group: ageGroupToSave,
  age_group_auto_calculated: !manualAgeGroupOverride // Track if auto or manual
});
```

---

## Edge Cases

### No Dancers Assigned Yet
- Show placeholder: "Will auto-calculate after dancers assigned"
- Allow manual selection
- Mark as temporary

### Mixed Ages (Large Age Range)
- Use oldest dancer's age group (most restrictive)
- Show warning if range is > 5 years
- Example: "Ages 8-15 → Teen (using oldest)"

### Solo vs Group
- Solo: Use the single dancer's age
- Group: Use oldest dancer's age (most restrictive rule)

---

## Quality Gates

1. ✅ **Age calculation accurate**: Test with various DOBs
2. ✅ **Most restrictive rule applied**: Oldest dancer determines group
3. ✅ **Manual override works**: User can change auto-calculated group
4. ✅ **Warning shown**: When manual differs from auto
5. ✅ **Saves to database**: age_group field populated
6. ✅ **TypeScript compiles**: No errors
7. ✅ **Handles edge cases**: No dancers, single dancer, large age range

---

## Test Cases

```typescript
// Test with sample dancers
const testDancers = [
  { date_of_birth: '2015-03-15', first_name: 'Alice' }, // Age 10
  { date_of_birth: '2013-07-20', first_name: 'Bob' },   // Age 12
  { date_of_birth: '2014-11-05', first_name: 'Carol' }  // Age 11
];

const result = inferAgeGroup(testDancers, 'Small Group');
console.log(result);
// Expected: { ageGroup: 'Junior', oldestAge: 12, youngestAge: 10, ageRange: '10-12' }
```

---

## Deliverables

Output file: `codex-tasks/outputs/age_group_inference_result.md`

Include:
1. Helper file created (`ageGroupCalculator.ts`)
2. Integration points modified
3. Test results with sample data
4. Edge cases handled
5. Build output

---

**Start Time**: [Record]
**Expected Duration**: 1-2 hours
