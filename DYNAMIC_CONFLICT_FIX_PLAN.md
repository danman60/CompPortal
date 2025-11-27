# DYNAMIC_CONFLICT_FIX_PLAN.md

## Problem Statement

Conflict detection was incorrectly implemented using hardcoded database fields instead of the existing dynamic `detectConflicts` procedure. This needs to be completely rewritten to use real-time conflict calculation based on schedule positions.

## What I Broke

### Backend (scheduling.ts)
1. ❌ Added `conflict_count` to SELECT query (line 620) - **REMOVE**
2. ❌ Added `conflicts_with_entry_ids` to SELECT query (line 621) - **REMOVE**
3. ❌ Added these fields to return mapping (lines 741-742) - **REMOVE**
4. ✅ Added `dancer_names` field (line 622, 743) - **KEEP** (useful for tooltips)

### Frontend (ScheduleTable.tsx)
1. ❌ Added `conflict_count` to Routine interface (line 82) - **REMOVE**
2. ❌ Added `conflicts_with_entry_ids` to Routine interface (line 83) - **REMOVE**
3. ✅ Added `dancer_names` to Routine interface (line 84) - **KEEP**
4. ❌ Created `getConflictTooltip()` function (lines 265-290) - **REWRITE**
5. ❌ Hardcoded conflict detection logic (line 260) - **REPLACE**

### Database
1. ✅ Hardcoded conflict data - **ALREADY CLEANED UP**

## What Already Exists and Works

### detectConflicts Procedure (scheduling.ts:1143-1232)
```typescript
detectConflicts: publicProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
  }))
  .query(async ({ input, ctx }) => {
    const MIN_ROUTINES_BETWEEN = 6;

    // Dynamically calculates conflicts based on entry_number spacing
    // Returns conflicts with severity levels:
    // - critical: 0 routines between (back-to-back)
    // - error: 1-3 routines between
    // - warning: 4-5 routines between

    return {
      conflicts: [...],
      summary: { total, critical, errors, warnings }
    };
  })
```

Each conflict contains:
- `dancerId`, `dancerName`
- `routine1Id`, `routine1Number`, `routine1Title`
- `routine2Id`, `routine2Number`, `routine2Title`
- `routinesBetween`, `severity`, `message`

## Fix Plan

### Step 1: Remove Hardcoded Fields from Backend

**File: src/server/routers/scheduling.ts**

Remove lines 620-621 from SELECT:
```typescript
// REMOVE THESE:
conflict_count: true,
conflicts_with_entry_ids: true,
```

Remove lines 741-742 from return mapping:
```typescript
// REMOVE THESE:
conflict_count: routine.conflict_count ?? 0,
conflicts_with_entry_ids: routine.conflicts_with_entry_ids ?? [],
```

Keep line 622 and 743:
```typescript
// KEEP THESE:
dancer_names: true,  // line 622
dancer_names: routine.dancer_names ?? [],  // line 743
```

### Step 2: Remove Hardcoded Fields from Frontend

**File: src/components/scheduling/ScheduleTable.tsx**

Remove lines 82-83 from Routine interface:
```typescript
// REMOVE THESE:
conflict_count?: number | null;
conflicts_with_entry_ids?: string[] | null;
```

Keep line 84:
```typescript
// KEEP THIS:
dancer_names?: string[] | null;
```

### Step 3: Wire Up detectConflicts Query in Page

**File: src/app/dashboard/director-panel/schedule/page.tsx**

Add after existing queries (around line 90):
```typescript
// Fetch dynamic conflicts based on current schedule
const { data: conflictsData } = trpc.scheduling.detectConflicts.useQuery(
  {
    competitionId: competition?.id || ''
  },
  {
    enabled: !!competition?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  }
);
```

### Step 4: Create Conflict Lookup Map

**File: src/app/dashboard/director-panel/schedule/page.tsx**

Add useMemo after queries:
```typescript
// Build map of routineId -> conflicts for that routine
const conflictsByRoutineId = useMemo(() => {
  if (!conflictsData?.conflicts) return new Map();

  const map = new Map<string, Array<typeof conflictsData.conflicts[0]>>();

  for (const conflict of conflictsData.conflicts) {
    // Add to routine1
    if (!map.has(conflict.routine1Id)) {
      map.set(conflict.routine1Id, []);
    }
    map.get(conflict.routine1Id)!.push(conflict);

    // Add to routine2
    if (!map.has(conflict.routine2Id)) {
      map.set(conflict.routine2Id, []);
    }
    map.get(conflict.routine2Id)!.push(conflict);
  }

  return map;
}, [conflictsData]);
```

Pass to ScheduleTable:
```typescript
<ScheduleTable
  routines={scheduledRoutines}
  // ... other props
  conflictsByRoutineId={conflictsByRoutineId}
/>
```

### Step 5: Update ScheduleTable to Use Dynamic Conflicts

**File: src/components/scheduling/ScheduleTable.tsx**

Update ScheduleTableProps interface:
```typescript
interface ScheduleTableProps {
  routines: Routine[];
  // ... other props
  conflictsByRoutineId?: Map<string, Array<{
    dancerId: string;
    dancerName: string;
    routine1Id: string;
    routine1Number: number;
    routine1Title: string;
    routine2Id: string;
    routine2Number: number;
    routine2Title: string;
    routinesBetween: number;
    severity: 'critical' | 'error' | 'warning';
    message: string;
  }>>;
}
```

Update SortableRoutineRow to receive conflicts:
```typescript
function SortableRoutineRow({
  routine,
  // ... other props
  conflicts,
}: {
  routine: Routine;
  // ... other props
  conflicts?: Array<any>; // Conflicts for this routine
})
```

Replace hardcoded conflict detection (line 260):
```typescript
// OLD (line 260):
const hasConflict = !!(routine.conflict_count && routine.conflict_count > 0);

// NEW:
const hasConflict = conflicts && conflicts.length > 0;
const conflictSeverity = conflicts?.[0]?.severity || 'warning';
```

Replace getConflictTooltip function (lines 265-290):
```typescript
// Generate detailed conflict tooltip from dynamic data
const getConflictTooltip = () => {
  if (!conflicts || conflicts.length === 0) return '';

  const conflict = conflicts[0]; // Show first conflict
  const isRoutine1 = conflict.routine1Id === routine.id;
  const conflictingRoutineNumber = isRoutine1 ? conflict.routine2Number : conflict.routine1Number;
  const conflictingRoutineTitle = isRoutine1 ? conflict.routine2Title : conflict.routine1Title;

  let tooltip = `⚠️ Conflict: ${conflict.dancerName}`;
  tooltip += `\n${conflict.routinesBetween} routine${conflict.routinesBetween !== 1 ? 's' : ''} between performances`;
  tooltip += `\n(need 6+ for costume changes)`;
  tooltip += `\n\nConflicts with:`;
  tooltip += `\n• #${conflictingRoutineNumber} ${conflictingRoutineTitle}`;

  if (routine.dancer_names && routine.dancer_names.length > 0) {
    tooltip += `\n\nDancers in this routine:`;
    tooltip += `\n${routine.dancer_names.join(', ')}`;
  }

  if (conflicts.length > 1) {
    tooltip += `\n\n+${conflicts.length - 1} more conflict${conflicts.length - 1 !== 1 ? 's' : ''}`;
  }

  return tooltip;
};
```

Pass conflicts to SortableRoutineRow:
```typescript
<SortableRoutineRow
  routine={routine}
  // ... other props
  conflicts={conflictsByRoutineId?.get(routine.id) || []}
/>
```

### Step 6: Testing Procedure

1. **Schedule routines close together (< 6 apart)**
   - Conflict icon should appear immediately
   - Tooltip shows dancer name, gap size, conflicting routine

2. **Move routines apart (6+ entries between)**
   - Conflict icon should disappear
   - No refetch needed - conflicts recalculated automatically

3. **Drag routine to create back-to-back**
   - Conflict severity should be "critical"
   - Icon color/style reflects severity

4. **Multiple conflicts**
   - Tooltip shows first conflict + count of additional conflicts

## Expected Behavior After Fix

- ✅ Conflicts calculate dynamically based on entry_number positions
- ✅ Moving routines immediately updates conflict state
- ✅ Conflict icons appear/disappear in real-time
- ✅ Tooltip shows: dancer name, gap size, conflicting routine details
- ✅ Severity levels reflected in UI (critical/error/warning)
- ✅ No hardcoded database fields needed

## Files to Modify

1. `src/server/routers/scheduling.ts` - Remove hardcoded fields
2. `src/components/scheduling/ScheduleTable.tsx` - Remove static conflict logic
3. `src/app/dashboard/director-panel/schedule/page.tsx` - Add detectConflicts query and conflict map

## Commits to Make

1. **Revert hardcoded conflict fields** - Remove all static conflict code
2. **Implement dynamic conflict system** - Wire up detectConflicts with conflict map
3. **Update conflict tooltip** - Use dynamic data for detailed information

---

**Status**: Plan documented, ready for implementation
**Estimated Time**: 30-45 minutes
**Risk**: Low - reverting to existing proven detectConflicts system
