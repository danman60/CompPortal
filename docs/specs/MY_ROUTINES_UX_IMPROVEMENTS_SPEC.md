# My Routines UX Improvements - Change Specification

**Created:** 2025-11-09
**Status:** Ready for Implementation
**Priority:** HIGH (Production user feedback)
**Based on:** User feedback from GLOW CD testing session

---

## Overview

Improve the "My Routines" (Entries) list display for Studio Directors with better column visibility, real-time updates, and dancer count displays.

**User Pain Points:**
1. Missing critical columns in draft table view
2. Stale counts after deleting entries (require logout/login)
3. Manual dancer counting in card view
4. Classification hidden (requires clicking into each entry)

---

## 1. Table View - Add Missing Columns

**File:** `src/components/EntryList.tsx` (or equivalent entries table component)
**Priority:** HIGH

### Current State
- Missing columns: #, Age Group, Dancers, Fee
- Category shown but Classification hidden

### Desired State
Show ALL columns per user request:

| # | Title | Category | Classification | Age | Dancers | Fee | Actions |
|---|-------|----------|----------------|-----|---------|-----|---------|
| 1 | Sparkle | Jazz | Sapphire | Teen | 5 | $75 | Edit/Delete |
| 2 | Shine | Contemporary | Emerald | Junior | 8 | $90 | Edit/Delete |

### Implementation

**Table Headers:**
```typescript
const columns = [
  { key: '#', label: '#', width: 'w-12' },
  { key: 'title', label: 'Title', width: 'w-1/4' },
  { key: 'category', label: 'Category', width: 'w-1/6' },
  { key: 'classification', label: 'Classification', width: 'w-1/6' }, // ADD THIS
  { key: 'age_group', label: 'Age', width: 'w-20' }, // ADD THIS
  { key: 'dancers', label: 'Dancers', width: 'w-20' }, // ADD THIS
  { key: 'fee', label: 'Fee', width: 'w-20' }, // ADD THIS
  { key: 'actions', label: 'Actions', width: 'w-32' },
];
```

**Table Cells:**
```typescript
// Classification column
<td className="px-4 py-3 text-sm text-gray-900">
  {entry.classifications?.name || 'N/A'}
</td>

// Age Group column
<td className="px-4 py-3 text-sm text-gray-900">
  {entry.age_groups?.name || entry.calculated_age || 'N/A'}
</td>

// Dancers column (from _count relation)
<td className="px-4 py-3 text-sm text-gray-900">
  {entry._count?.entry_participants || 0}
</td>

// Fee column (calculate from pricing)
<td className="px-4 py-3 text-sm text-gray-900">
  ${entry.calculated_fee || '0.00'}
</td>
```

**Backend Query (ensure _count is included):**
```typescript
// In entry.getAll or entry.getByReservation
include: {
  classifications: true, // For classification name
  age_groups: true,      // For age group name
  dance_categories: true, // For category name
  entry_size_categories: true,
  _count: {
    select: {
      entry_participants: true // For dancer count
    }
  }
}
```

---

## 2. Card View - Show Dancer Count

**File:** `src/components/EntryCard.tsx` (or card view component)
**Priority:** MEDIUM

### Current State
- Shows dancer names (or list)
- SD must count manually

### Desired State (per user answer)
- **Default:** Show dancer count as badge: "5 dancers"
- **On Hover:** Show tooltip with all dancer names

### Implementation

```typescript
<div className="relative group">
  {/* Dancer Count Badge */}
  <div className="flex items-center gap-1 text-sm text-gray-700">
    <svg className="w-4 h-4" /* icon */></svg>
    <span className="font-semibold">
      {entry._count?.entry_participants || 0} dancers
    </span>
  </div>

  {/* Hover Tooltip with Dancer Names */}
  <div className="absolute left-0 top-6 z-50 hidden group-hover:block bg-gray-900 text-white text-sm p-3 rounded-lg shadow-xl min-w-[200px]">
    <p className="font-semibold mb-2">Dancers:</p>
    <ul className="space-y-1">
      {entry.entry_participants?.map((p, i) => (
        <li key={i}>{p.dancer_name}</li>
      ))}
    </ul>
  </div>
</div>
```

**Backend Query:**
```typescript
// Include participant names for tooltip
include: {
  entry_participants: {
    select: {
      dancer_name: true
    }
  },
  _count: {
    select: {
      entry_participants: true
    }
  }
}
```

---

## 3. Real-Time Count Updates (Optimistic UI)

**Files:**
- Entry delete mutation: `src/server/routers/entry.ts`
- Frontend: Entry list component + tRPC hooks

**Priority:** HIGH

### Current State
- Delete mutation succeeds
- Page refresh required to see updated counts
- Counts persist until logout/login

### Desired State (per user answer)
- **Instant update (optimistic)**
- Remove entry from list immediately
- Update counts without refresh

### Implementation

**Frontend (Optimistic Delete):**
```typescript
const deleteEntry = api.entry.delete.useMutation({
  onMutate: async (entryId) => {
    // Cancel outgoing queries
    await utils.entry.getAll.cancel();

    // Snapshot current data
    const previousEntries = utils.entry.getAll.getData();

    // Optimistically remove entry from list
    utils.entry.getAll.setData(undefined, (old) =>
      old?.filter((e) => e.id !== entryId)
    );

    return { previousEntries };
  },
  onError: (err, entryId, context) => {
    // Rollback on error
    utils.entry.getAll.setData(undefined, context?.previousEntries);
  },
  onSettled: () => {
    // Refetch to sync with server
    utils.entry.getAll.invalidate();
    utils.reservation.getAll.invalidate(); // Update reservation counts
  },
});
```

**Backend (Proper Invalidation):**
```typescript
// In entry.delete mutation
.mutation(async ({ input, ctx }) => {
  const deleted = await prisma.competition_entries.delete({
    where: { id: input.entryId },
    include: {
      _count: {
        select: { entry_participants: true }
      }
    }
  });

  // Log deletion for audit
  await logActivity({
    userId: ctx.userId!,
    tenantId: ctx.tenantId!,
    action: 'entry_deleted',
    entityType: 'entry',
    entityId: input.entryId,
    details: {
      title: deleted.title,
      participant_count: deleted._count.entry_participants
    }
  });

  return { success: true };
});
```

**Counts Recalculation:**
Ensure bottom summary updates reactively:
```typescript
// In component rendering counts
const totalCreated = entries.length;
const totalSpaces = reservation.spaces_confirmed || 0;
const remaining = totalSpaces - totalCreated;

// These automatically update when entries array changes (optimistic UI)
```

---

## 4. Classification Visibility

**Files:**
- Table view component
- Card view component

**Priority:** HIGH

### Current State
- Classification NOT shown in table or card views
- Must click into entry to see classification

### Desired State (per user request + answer)
- Classification visible in BOTH views
- Plain text (no color coding per user answer)

### Table View Implementation

Already covered in Section 1 - add Classification column.

### Card View Implementation

```typescript
<div className="bg-white rounded-lg shadow p-4">
  {/* Title */}
  <h3 className="font-bold text-lg text-gray-900 mb-2">
    {entry.title}
  </h3>

  {/* Category · Classification · Age Group */}
  <div className="text-sm text-gray-600 mb-3">
    <span>{entry.dance_categories?.name}</span>
    <span className="mx-2">·</span>
    <span className="font-semibold">{entry.classifications?.name}</span> {/* ADD THIS */}
    <span className="mx-2">·</span>
    <span>{entry.age_groups?.name || `Age ${entry.calculated_age}`}</span>
  </div>

  {/* Dancer Count (from Section 2) */}
  <div className="text-sm text-gray-700">
    👥 {entry._count?.entry_participants || 0} dancers
  </div>

  {/* Fee */}
  <div className="text-lg font-bold text-purple-600 mt-2">
    ${entry.calculated_fee || '0.00'}
  </div>
</div>
```

---

## 5. Classification Auto-Detection - New Algorithm

**File:** `src/components/rebuild/entries/AutoCalculatedSection.tsx`
**Priority:** CRITICAL (causes incorrect pricing)

### User Feedback
"All my dancers are emerald/sapphire but it auto detected to Crystal"

### New Algorithm: AVERAGE + +1 Bump (Like Age Calculation)

**User Request:** Change from "60% majority + highest" to "AVERAGE + +1 bump" pattern

**Behavior:**
- Calculate AVERAGE of all dancer skill_levels (round down)
- Allow +1 bump to go up one classification level
- Make +1 bump available for GROUPS (not just solos)
- Remove 60% majority rule entirely

### Implementation

**Step 1: Calculate Average Classification**
```typescript
const autoCalculatedClassification = React.useMemo(() => {
  if (selectedDancers.length === 0) return null;

  const dancerClassifications = selectedDancers
    .map(d => {
      if (!d.classification_id) return null;
      return classifications.find(c => c.id === d.classification_id);
    })
    .filter((c): c is Classification => c !== null);

  if (dancerClassifications.length === 0) return null;

  // Solo: Use dancer's exact classification (no change from current)
  if (selectedDancers.length === 1) {
    return dancerClassifications[0];
  }

  // Non-Solo: AVERAGE classification (like age calculation)
  const totalSkillLevel = dancerClassifications.reduce(
    (sum, cls) => sum + (cls.skill_level ?? 0),
    0
  );
  const avgSkillLevel = Math.floor(totalSkillLevel / dancerClassifications.length);

  // Find classification closest to average (round down)
  const avgClassification = classifications
    .filter(c => (c.skill_level ?? 0) <= avgSkillLevel)
    .sort((a, b) => (b.skill_level ?? 0) - (a.skill_level ?? 0))[0];

  return avgClassification || dancerClassifications[0];
}, [selectedDancers, classifications]);
```

**Step 2: Update +1 Bump UI for Groups**
```typescript
{/* +1 Bump Classification (for GROUPS too, not just solos) */}
{autoCalculatedClassification && (
  <div className="flex items-center gap-2 mt-2">
    <input
      type="checkbox"
      id="bumpClassification"
      checked={bumpClassification}
      onChange={(e) => setBumpClassification(e.target.checked)}
      className="rounded border-gray-300"
    />
    <label htmlFor="bumpClassification" className="text-sm text-gray-700">
      Bump classification +1 level?
      <span className="ml-1 text-gray-500">
        ({autoCalculatedClassification.name} → {getBumpedClassification()?.name || 'N/A'})
      </span>
    </label>
  </div>
)}
```

**Step 3: Helper Function for Bumped Classification**
```typescript
const getBumpedClassification = () => {
  if (!autoCalculatedClassification) return null;

  const currentLevel = autoCalculatedClassification.skill_level ?? 0;
  const nextLevel = currentLevel + 1;

  return classifications.find(c => c.skill_level === nextLevel) || null;
};

const finalClassification = bumpClassification
  ? getBumpedClassification()
  : autoCalculatedClassification;
```

**Step 4: Update Help Text**
```typescript
<p className="text-xs text-gray-500 mt-1">
  Based on average of dancer classifications (rounded down).
  You may bump up one level if needed.
</p>
```

### Examples

**Example 1: 3 Crystal (level 1) + 2 Sapphire (level 3)**
- Total: 1+1+1+3+3 = 9
- Average: 9/5 = 1.8 → rounds to 1
- Auto-detected: Crystal (level 1)
- Can bump to: Emerald (level 2)

**Example 2: 5 Emerald (level 2)**
- Total: 2+2+2+2+2 = 10
- Average: 10/5 = 2.0
- Auto-detected: Emerald (level 2)
- Can bump to: Sapphire (level 3)

**Example 3: 2 Sapphire (level 3) + 1 Diamond (level 4)**
- Total: 3+3+4 = 10
- Average: 10/3 = 3.33 → rounds to 3
- Auto-detected: Sapphire (level 3)
- Can bump to: Diamond (level 4)

### Changes from Current Logic

**REMOVED:**
- 60% majority rule (lines 106-111)
- "Highest" fallback when no majority

**ADDED:**
- Average calculation with round down
- +1 bump available for groups (not just solos)
- Help text explaining average-based detection

### Testing

**Verify classification skill_levels:**
```sql
SELECT id, name, skill_level
FROM classifications
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5' -- GLOW
ORDER BY skill_level ASC;
```

**Expected hierarchy:**
- Crystal: skill_level=1
- Emerald: skill_level=2
- Sapphire: skill_level=3
- Diamond: skill_level=4 (if exists)

---

## 6. Testing Checklist

### Table View
- [ ] All columns visible: #, Title, Category, Classification, Age, Dancers, Fee, Actions
- [ ] Classification shows correct value from database
- [ ] Age shows age group name or calculated age
- [ ] Dancers shows count from `_count.entry_participants`
- [ ] Fee shows calculated price
- [ ] Table responsive on mobile (may need horizontal scroll)

### Card View
- [ ] Dancer count badge shows: "X dancers"
- [ ] Hover tooltip displays all dancer names
- [ ] Classification visible: "Category · Classification · Age"
- [ ] Layout not broken by new elements

### Real-Time Updates
- [ ] Delete entry → entry removed from list immediately
- [ ] Bottom counts update without refresh:
  - "X of Y routines created"
  - "Y routines remaining"
- [ ] Reservation page counts also update
- [ ] Error handling: rollback if delete fails

### Classification Detection
- [ ] Solo with Emerald dancer → detects Emerald ✅
- [ ] Group: 3 Sapphire, 2 Emerald → detects Sapphire (highest) ✅
- [ ] Group: 5 Crystal, 1 Sapphire → should detect Sapphire (highest), not Crystal ❓
- [ ] Log classification detection in console for debugging
- [ ] Verify skill_level values in GLOW tenant

### Multi-Tenant
- [ ] Works on EMPWR tenant
- [ ] Works on GLOW tenant
- [ ] Counts isolated per tenant

---

## 7. Implementation Order

**Phase 1: Critical Fixes (Deploy First)**
1. ✅ Classification auto-detection bug investigation + fix
2. ✅ Add Classification column to table view
3. ✅ Add Classification to card view

**Phase 2: UX Improvements (Deploy Second)**
4. ✅ Add missing table columns (#, Age, Dancers, Fee)
5. ✅ Add dancer count + hover tooltip to cards

**Phase 3: Performance (Deploy Third)**
6. ✅ Real-time optimistic updates for delete
7. ✅ Proper cache invalidation across all affected queries

---

## 8. Files to Modify

**Frontend Components:**
- `src/components/EntryList.tsx` (table view) - add columns
- `src/components/EntryCard.tsx` (card view) - add classification + dancer count
- `src/components/rebuild/entries/AutoCalculatedSection.tsx` - debug/fix detection

**Backend Routers:**
- `src/server/routers/entry.ts`:
  - Update `getAll` include to fetch classifications, age_groups, _count
  - Ensure `delete` mutation triggers proper invalidation

**Queries to Update:**
```typescript
// entry.getAll and entry.getByReservation
include: {
  classifications: true,
  age_groups: true,
  dance_categories: true,
  entry_size_categories: true,
  entry_participants: {
    select: { dancer_name: true } // For hover tooltip
  },
  _count: {
    select: { entry_participants: true } // For dancer count
  }
}
```

---

## 9. Success Criteria

**Deployment successful when:**
1. ✅ Classification visible in both table and card views
2. ✅ All columns visible in draft table view
3. ✅ Dancer count shown with hover tooltip in card view
4. ✅ Delete entry updates counts instantly (no refresh needed)
5. ✅ Classification auto-detection uses HIGHEST tier (bug fixed)
6. ✅ No performance degradation (queries optimized)
7. ✅ Works on both EMPWR and GLOW tenants

---

**Next Steps:**
1. Investigate classification auto-detection bug in production data
2. Implement table/card view changes
3. Add optimistic UI for delete mutations
4. Test thoroughly on both tenants
5. Deploy and monitor

**Estimated Effort:** 3-4 hours implementation + 1 hour testing
