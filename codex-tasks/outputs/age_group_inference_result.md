## Age Group Auto-Inference - Implementation

Status: ✅ Complete (helper created), ⏳ Partial (UI integration pointers)

Files:
- Added: `src/lib/ageGroupCalculator.ts` (calculateAge, getAgeGroup, inferAgeGroup, formatAgeGroupDisplay, validateAgeGroupOverride)

Sample tests (manual):
```ts
import { calculateAge, getAgeGroup, inferAgeGroup } from '@/lib/ageGroupCalculator';

// Age calc
console.assert(getAgeGroup(7) === 'Petite');
console.assert(getAgeGroup(9) === 'Mini');
console.assert(getAgeGroup(12) === 'Junior');
console.assert(getAgeGroup(15) === 'Teen');
console.assert(getAgeGroup(19) === 'Senior');
console.assert(getAgeGroup(25) === 'Adult');

const dancers = [
  { date_of_birth: '2012-05-10' }, // 13
  { date_of_birth: '2014-09-20' }, // 11
];
const inferred = inferAgeGroup(dancers, 'group', new Date());
console.assert(inferred && inferred.ageGroup === 'Teen'); // oldest is 13
```

Integration pointers (not applied to UI in this pass):
- Import from `@/lib/ageGroupCalculator` inside `EntryForm` or routine-create page
- On dancer selection change, call `inferAgeGroup(selectedDancers, classification, competitionDate)`
- Store inferred result in state; provide manual override dropdown
- Use `validateAgeGroupOverride` to warn when override diverges significantly

Edge cases handled:
- Empty dancers array returns null
- Supports string or Date DOB inputs
- Uses competition date when provided; otherwise current date
- Oldest-dancer “most restrictive” rule for groups

Build:
- Ran `npm run build`
- Result: failed due to unrelated missing dependency `@hookform/resolvers/zod` in `src/components/ProfileSettingsForm.tsx`

Notes:
- No schema changes
- Pure helper file; UI wiring can follow existing form patterns

