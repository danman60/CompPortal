# Entry Creation Page - Business Logic Analysis & Rebuild Plan

**Date:** October 28, 2025
**Purpose:** Clean rebuild of entry creation page with proper tenant isolation
**Status:** Ready for implementation

---

## Part 1: What the Page SHOULD Do (Per Spec)

### A. Core Business Logic (Phase 1 Spec Lines 503-585)

#### 1. Validation Before Entry Creation
**Spec Reference:** Lines 507-526

```
✓ Verify reservation exists and is approved/adjusted
✓ Check entry quota: active_entries < entries_approved
✓ Validate minimum 1 dancer selected
✓ Verify dancers belong to user's studio (tenant isolation)
✓ Block if no dancers exist in studio roster
```

#### 2. Required Entry Fields
**Spec Reference:** Lines 457-461 (schema), 842-850 (validation)

**REQUIRED (not null):**
- `title` - Routine name (3-255 chars, alphanumeric + spaces/-/_/apostrophe)
- `category_id` - Dance category (Ballet, Jazz, Contemporary, etc.)
- `classification_id` - Skill level (Titanium, Crystal, etc.)
- `age_group_id` - Age division (calculated from dancers)
- `entry_size_category_id` - Group size (calculated from dancer count)
- `tenant_id` - Multi-tenant isolation
- `competition_id` - Which competition
- `studio_id` - Which studio
- `status` - Entry state (default 'draft')

**OPTIONAL:**
- `reservation_id` - Links to approved reservation (capacity tracking)
- `choreographer` - Choreographer name
- `special_requirements` - Props, accessibility needs, etc.
- All other fields (populated later in Phase 2/3)

#### 3. Auto-Classification Logic
**Spec Reference:** Lines 546-585

**Age Group Calculation:**
```python
# Based on YOUNGEST dancer in routine
youngest_dob = min(dancer.date_of_birth for dancer in selected_dancers)
age_at_event = (event_start_date - youngest_dob).days // 365

# Match to competition's age divisions
age_divisions = [
    {name: 'Tiny', min_age: 0, max_age: 5},
    {name: 'Mini', min_age: 6, max_age: 8},
    {name: 'Teen', min_age: 9, max_age: 12},
    {name: 'Junior', min_age: 13, max_age: 15},
    {name: 'Senior', min_age: 16, max_age: 99},
]
age_group = find_matching_division(age_at_event, age_divisions)
```

**Size Category Calculation:**
```python
# Based on TOTAL dancer count
dancer_count = len(selected_dancers)

if dancer_count == 1:     size = 'solo'
elif dancer_count == 2:   size = 'duo'
elif dancer_count == 3:   size = 'trio'
elif dancer_count <= 9:   size = 'small'
else:                     size = 'large'

# Match to competition's size categories
entry_size_category = find_by_name(size)
```

**Override Capability:**
- SD can override auto-calculated values if needed
- Useful for edge cases (age cutoff dates, special divisions)

#### 4. Dancer Attachment (entry_participants table)
**Spec Reference:** Lines 528-544

```
For each selected dancer:
  - Create entry_participants record
  - Link entry_id + dancer_id
  - Store dancer_name (denormalized for performance)
  - Store dancer_age (snapshot at time of entry)
  - Store display_order (0-indexed order in routine)
```

**Validation:**
- Minimum 1 dancer required
- All dancers must belong to studio_id (tenant isolation)
- No duplicate dancers in same entry

#### 5. Entry Quota Tracking
**Spec Reference:** Lines 513-521

```
reservation.entries_approved = 10  # CD approved 10 entries
active_entries = 8                 # SD created 8 so far
remaining = 2                       # Can create 2 more

When creating entry #9:
  ✓ 8 < 10 → ALLOW
When creating entry #11:
  ✗ 10 >= 10 → BLOCK "Entry limit reached"
```

**Business Rule:**
- Only count entries where `status != 'cancelled'`
- Display remaining capacity on page
- Block submission if capacity exceeded

---

## Part 2: Current Implementation Issues

### Issue 1: Duplicate Dropdowns (Age Groups, Size Categories)
**Root Cause:** Same as Classifications bug

**Current State:**
- ✅ `age_groups` HAS `tenant_id` in schema (line 375)
- ✅ `entry_size_categories` HAS `tenant_id` in schema (line 841)
- ❌ `lookup.getAllForEntry` NOT filtering by tenant for these tables

**Result:** Seeing EMPWR + Glow data mixed together in dropdowns

### Issue 2: 500 Internal Server Error
**Root Cause:** Multiple compounding issues

1. **Auth Issue (FIXED in dc394c1):**
   - Was using `publicProcedure` (no auth)
   - Changed to `protectedProcedure` (requires auth)
   - Using `ctx.tenantId` from authenticated user

2. **Prisma Client Out of Sync:**
   - Schema updated with `classifications.tenant_id`
   - Prisma client regenerated
   - But page still failing

3. **Possible React Error:**
   - Browser console shows minified React error #418
   - Suggests hydration mismatch or rendering issue
   - Could be from legacy code in current page

### Issue 3: Entry Creation Using Legacy Page
**Status:** Page at `/dashboard/entries/create` is ALREADY a rebuild

**Evidence:**
- `src/app/dashboard/entries/create/page.tsx` imports `EntryCreateForm`
- Comment says "Entry creation page (REBUILD)"
- Uses `src/components/rebuild/entries/EntryCreateForm.tsx`

**Implication:** Current rebuild page has bugs, needs another rebuild

---

## Part 3: Clean Rebuild Plan

### Objective
Create `/dashboard/entries/create-v2` with:
- ✅ Fresh codebase, no legacy issues
- ✅ Proper tenant isolation on ALL lookups
- ✅ Correct auto-classification logic (per spec)
- ✅ 4 save actions: Cancel, Save, Save & Another, Create Like This
- ✅ Current aesthetics/UX preserved
- ✅ Side-by-side testing capability

---

### Step 1: Backend Fixes

#### 1.1 Update lookup.getAllForEntry (lookup.ts:48-84)
**Current Issue:** Missing tenant filter on age_groups and entry_size_categories

**Fix:**
```typescript
// Line 68-75 (ALREADY CORRECT):
prisma.age_groups.findMany({
  where: { tenant_id: ctx.tenantId },  // ✅ Already has this
  orderBy: { sort_order: 'asc' },
}),
prisma.entry_size_categories.findMany({
  where: { tenant_id: ctx.tenantId },  // ✅ Already has this
  orderBy: { sort_order: 'asc' },
}),
```

**Verification Needed:** Check if this is actually in code or only in schema

#### 1.2 Verify entry.create Mutation (entry.ts:855-1008)
**Status:** FIXED in dc394c1

- ✅ Uses `protectedProcedure`
- ✅ Uses `ctx.tenantId` for tenant isolation
- ✅ Validates studio belongs to user's tenant
- ✅ Validates reservation exists and is approved
- ✅ Checks entry quota

**No changes needed**

---

### Step 2: Frontend Rebuild

#### 2.1 Create New Page Route
**File:** `src/app/dashboard/entries/create-v2/page.tsx`

```typescript
import { Suspense } from 'react';
import { EntryCreateFormV2 } from '@/components/rebuild/entries/EntryCreateFormV2';

export default function EntryCreateV2Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <Suspense fallback={<LoadingState />}>
        <EntryCreateFormV2 />
      </Suspense>
    </div>
  );
}
```

**Query Params:**
- `?reservation=<id>` (required)

#### 2.2 Create Form Component
**File:** `src/components/rebuild/entries/EntryCreateFormV2.tsx`

**Features:**
1. **Reservation Context Bar** (existing component)
   - Show competition name, studio name
   - Show capacity: "X of Y entries used"
   - Warning if approaching capacity

2. **Routine Details Section**
   ```
   ┌─ Routine Details ─────────────────────┐
   │ Title: [_________________________]    │
   │ Choreographer: [_________________]    │
   │ Category: [Ballet ▼]                  │
   │ Classification: [Titanium ▼]          │
   │ Special Requirements: [___________]   │
   └───────────────────────────────────────┘
   ```

3. **Dancer Selection Section**
   ```
   ┌─ Select Dancers ──────────────────────┐
   │ Search: [_______]  Sort: [Name ▼]     │
   │                                        │
   │ ☑ Jane Smith (12 years)                │
   │ ☑ Emily Davis (11 years)               │
   │ ☐ Sarah Johnson (13 years)             │
   │ ☐ Mike Wilson (12 years)               │
   │                                        │
   │ Selected: 2 dancers                    │
   └───────────────────────────────────────┘
   ```

4. **Auto-Calculated Section**
   ```
   ┌─ Auto-Calculated ─────────────────────┐
   │ Age Group: Junior (based on youngest) │
   │   Override: [Use Different ▼]         │
   │                                        │
   │ Size Category: Duet/Trio (2 dancers)  │
   │   Override: [Use Different ▼]         │
   └───────────────────────────────────────┘
   ```

5. **Action Buttons**
   ```
   [Cancel]  [Save & Close]  [Save & Create Another]  [Create Like This]
   ```

#### 2.3 Form State Hook
**File:** `src/hooks/rebuild/useEntryFormV2.ts`

**State:**
```typescript
interface EntryFormV2State {
  // Basic fields
  title: string;
  choreographer: string;
  category_id: string;
  classification_id: string;
  special_requirements: string;

  // Dancer selection
  selectedDancers: SelectedDancer[];
  dancerSearchQuery: string;
  dancerSortBy: 'name' | 'age';

  // Auto-calculated (can be overridden)
  age_group_override: string | null;
  size_category_override: string | null;
}
```

**Auto-Calculation Logic:**
```typescript
// Age group: youngest dancer age
const inferredAgeGroup = useMemo(() => {
  if (selectedDancers.length === 0) return null;

  const dancersWithAge = selectedDancers.filter(d => d.dancer_age !== null);
  if (dancersWithAge.length === 0) return null;

  const youngestAge = Math.min(...dancersWithAge.map(d => d.dancer_age!));

  // Match against competition's age_groups (from lookups)
  return ageGroups.find(ag =>
    ag.min_age <= youngestAge && youngestAge <= ag.max_age
  );
}, [selectedDancers, ageGroups]);

// Size category: dancer count
const inferredSizeCategory = useMemo(() => {
  const count = selectedDancers.length;
  if (count === 0) return null;

  // Match against competition's entry_size_categories
  return sizeCategories.find(sc =>
    sc.min_participants <= count && count <= sc.max_participants
  );
}, [selectedDancers, sizeCategories]);
```

**Validation:**
```typescript
const canSave = useMemo(() => {
  return (
    title.trim().length >= 3 &&
    category_id.length > 0 &&
    classification_id.length > 0 &&
    selectedDancers.length >= 1 &&
    inferredAgeGroup !== null &&
    inferredSizeCategory !== null &&
    reservationId !== null
  );
}, [/* deps */]);
```

#### 2.4 Sub-Components (Reusable)

**A. ReservationContextBar.tsx** (REUSE EXISTING)
- Shows competition, studio, capacity info
- No changes needed

**B. RoutineDetailsSection.tsx**
```typescript
interface Props {
  form: EntryFormV2State;
  updateField: (field: keyof EntryFormV2State, value: any) => void;
  categories: DanceCategory[];
  classifications: Classification[];
}

// Simple form inputs with labels
```

**C. DancerSelectionSection.tsx**
```typescript
interface Props {
  dancers: Dancer[];
  selectedDancers: SelectedDancer[];
  toggleDancer: (dancer: SelectedDancer) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: 'name' | 'age';
  setSortBy: (s: 'name' | 'age') => void;
}

// Searchable, sortable list with checkboxes
// Show dancer name + age in parentheses
```

**D. AutoCalculatedSection.tsx**
```typescript
interface Props {
  inferredAgeGroup: AgeGroup | null;
  inferredSizeCategory: SizeCategory | null;
  ageGroupOverride: string | null;
  sizeCategoryOverride: string | null;
  setAgeGroupOverride: (id: string | null) => void;
  setSizeCategoryOverride: (id: string | null) => void;
  ageGroups: AgeGroup[];
  sizeCategories: SizeCategory[];
}

// Display inferred values
// Show dropdown to override if needed
```

**E. EntryFormActions.tsx**
```typescript
interface Props {
  canSave: boolean;
  onSave: (action: SaveAction) => Promise<void>;
  isSaving: boolean;
}

// 4 buttons: Cancel, Save, Save & Another, Create Like This
```

---

### Step 3: Add "Try Rebuild" Button to Entries Page

**File:** `src/app/dashboard/entries/page.tsx`

**Location:** Add next to existing "Create Entry" button

```typescript
<div className="flex gap-4">
  <button onClick={handleCreateEntry}>
    Create Entry
  </button>

  <button
    onClick={() => router.push(`/dashboard/entries/create-v2?reservation=${reservationId}`)}
    className="bg-yellow-500 hover:bg-yellow-600"
  >
    🔧 Try Rebuild Version
  </button>
</div>
```

**User Flow:**
1. SD clicks "Create Entry" → Goes to current page (if works)
2. SD clicks "Try Rebuild" → Goes to V2 (for testing)
3. After V2 confirmed working → Swap routes

---

### Step 4: Testing Checklist

#### 4.1 Dropdown Isolation Tests
- [ ] Classifications dropdown shows ONLY user's tenant data
- [ ] Age Groups dropdown shows ONLY user's tenant data
- [ ] Size Categories dropdown shows ONLY user's tenant data
- [ ] Dance Categories dropdown shows ONLY user's tenant data
- [ ] NO duplicates in any dropdown

#### 4.2 Auto-Classification Tests
**Age Group:**
- [ ] Solo dancer (12 years) → Correctly calculates "Junior"
- [ ] Duet (11 & 13 years) → Uses youngest (11) → "Teen"
- [ ] Group (all 15+ years) → "Senior"
- [ ] Override works and persists

**Size Category:**
- [ ] 1 dancer → "Solo"
- [ ] 2 dancers → "Duet/Trio"
- [ ] 5 dancers → "Small Group"
- [ ] 12 dancers → "Large Group"
- [ ] Override works and persists

#### 4.3 Capacity Tests
- [ ] Shows "3 of 10 entries used" correctly
- [ ] Blocks creation when at capacity
- [ ] Warning displayed when approaching capacity

#### 4.4 Save Action Tests
- [ ] "Cancel" → Returns to entries page, no save
- [ ] "Save & Close" → Saves entry, returns to page
- [ ] "Save & Create Another" → Saves entry, clears form completely
- [ ] "Create Like This" → Saves entry, keeps dancers/category, clears title

#### 4.5 Validation Tests
- [ ] Blocks save if title < 3 chars
- [ ] Blocks save if category not selected
- [ ] Blocks save if classification not selected
- [ ] Blocks save if no dancers selected
- [ ] Shows helpful error messages

#### 4.6 Tenant Isolation Tests (CRITICAL)
- [ ] EMPWR user cannot see Glow data
- [ ] Glow user cannot see EMPWR data
- [ ] Entry created with correct tenant_id
- [ ] Entry links to studio in same tenant
- [ ] Reservation belongs to same tenant

---

### Step 5: Data Cleanup (After Rebuild Works)

#### 5.1 Remove Duplicate Classifications
**Query:**
```sql
-- Find duplicates
SELECT tenant_id, name, COUNT(*)
FROM classifications
GROUP BY tenant_id, name
HAVING COUNT(*) > 1;

-- Keep oldest, delete newer
DELETE FROM classifications c1
WHERE EXISTS (
  SELECT 1 FROM classifications c2
  WHERE c1.tenant_id = c2.tenant_id
    AND c1.name = c2.name
    AND c1.created_at > c2.created_at
);
```

#### 5.2 Remove Duplicate Size Categories
**Query:**
```sql
-- Find duplicates (Large Group with different definitions)
SELECT tenant_id, name, min_participants, max_participants, COUNT(*)
FROM entry_size_categories
GROUP BY tenant_id, name, min_participants, max_participants
HAVING COUNT(*) > 1;

-- Manual review before deletion
```

---

### Step 6: Rollout Plan

#### Phase 1: Side-by-Side Testing (Days 1-2)
- Deploy V2 to production
- V1 remains default
- SD can opt-in to V2 via "Try Rebuild" button
- Monitor for errors in both versions

#### Phase 2: Gradual Migration (Days 3-4)
- If V2 stable → Make V2 default
- V1 accessible via "Use Legacy" button
- Monitor user feedback

#### Phase 3: V1 Deprecation (Day 5+)
- Remove V1 entirely
- `/dashboard/entries/create` → V2 codebase
- Delete legacy files

---

## Part 4: Files to Create/Modify

### New Files
```
src/app/dashboard/entries/create-v2/page.tsx
src/components/rebuild/entries/EntryCreateFormV2.tsx
src/components/rebuild/entries/RoutineDetailsSection.tsx
src/components/rebuild/entries/DancerSelectionSection.tsx
src/components/rebuild/entries/AutoCalculatedSection.tsx
src/components/rebuild/entries/EntryFormActions.tsx
src/hooks/rebuild/useEntryFormV2.ts
```

### Modified Files
```
src/server/routers/lookup.ts (verify tenant filters)
src/app/dashboard/entries/page.tsx (add "Try Rebuild" button)
```

### No Changes Needed
```
src/server/routers/entry.ts (already fixed in dc394c1)
prisma/schema.prisma (all tables have tenant_id)
```

---

## Part 5: Success Criteria

### Must-Have (P0)
- [ ] Entry creation succeeds without 500 errors
- [ ] NO duplicate data in any dropdown
- [ ] Tenant isolation verified on BOTH EMPWR + Glow
- [ ] Auto-classification works per spec
- [ ] All 4 save actions work correctly

### Should-Have (P1)
- [ ] Page loads in < 2 seconds
- [ ] Smooth UX, no visual glitches
- [ ] Helpful validation messages
- [ ] Capacity tracking accurate

### Nice-to-Have (P2)
- [ ] Dancer photos in selection list
- [ ] "Recently used" dancers at top
- [ ] Keyboard shortcuts for save actions

---

## Part 6: Estimated Effort

**Backend Verification:** 30 minutes
- Verify lookup.ts already has tenant filters
- Confirm entry.create working

**Frontend Rebuild:** 3-4 hours
- Page route: 10 min
- Form container: 30 min
- Sub-components: 2 hours
- Form hook: 1 hour
- Testing/polish: 30 min

**Testing:** 1 hour
- All checkboxes above
- Both tenants
- Edge cases

**Total:** 4.5-5.5 hours

---

## Part 7: Risk Assessment

### Low Risk
- Schema already has all needed fields
- Backend mutation already fixed
- Proven rebuild pattern (worked for Classifications)

### Medium Risk
- Auto-classification logic complexity
- React hydration errors if not careful
- Dancer age calculation edge cases

### Mitigation
- Reference spec pseudocode exactly
- Use server components where possible
- Extensive testing with real data

---

**STATUS: READY FOR REBUILD**

All analysis complete. Clean build plan defined. Waiting for approval to proceed.
