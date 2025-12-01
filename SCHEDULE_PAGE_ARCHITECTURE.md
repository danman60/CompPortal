# Schedule Page Architecture Guide

**File:** `src/app/dashboard/director-panel/schedule/page.tsx`
**Status:** Production (tester branch)
**Purpose:** Dual-layer optimistic UI for fast drag-drop scheduling with database persistence

---

## 🏗️ Core Architecture: Dual-Layer State Management

The schedule page uses **two separate data layers** for performance:

### Layer 1: Draft State (UI Layer - FAST)
```typescript
// Line 56-57: Local React state for instant UI updates
const [draftsByDate, setDraftsByDate] = useState<Record<string, RoutineData[]>>({});

// Current day's draft (computed)
const draftSchedule = draftsByDate[selectedDate] || [];
```

**Purpose:** Instant UI feedback during drag-drop operations
**Scope:** Per-day mapping: `{ "2026-04-11": [routine1, routine2, ...], "2026-04-12": [...] }`
**Persistence:** Memory only (cleared on page reload)
**Updates:** Immediate via `setDraftsByDate()`

### Layer 2: Database State (Persistence Layer - AUTHORITATIVE)
```typescript
// Line 156-159: tRPC query fetching from database
const { data: routines, isLoading, refetch } = trpc.scheduling.getRoutines.useQuery({
  competitionId: TEST_COMPETITION_ID,
  tenantId: TEST_TENANT_ID,
});
```

**Purpose:** Source of truth, persisted across sessions
**Scope:** All routines for entire competition
**Persistence:** PostgreSQL database
**Updates:** Via mutations (`scheduleMutation`, `resetDay`, etc.)

---

## 📊 Data Flow Lifecycle

### 1. Initial Load (Database → Draft)
```typescript
// Lines 608-648: Load saved schedules into draft state on mount
useEffect(() => {
  if (!routines) return;

  const allDrafts: Record<string, RoutineData[]> = {};

  for (const date of ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12']) {
    const serverScheduled = routines
      .filter(r => r.isScheduled && r.scheduledDateString === date)
      .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

    if (serverScheduled.length > 0) {
      allDrafts[date] = serverScheduled.map(r => ({
        id: r.id,
        title: r.title,
        duration: r.duration,
        isScheduled: r.isScheduled,
        entryNumber: r.entryNumber,
        performanceTime: r.scheduledTimeString,
      }));
    }
  }

  setDraftsByDate(prev => ({ ...prev, ...allDrafts }));
}, [routines]);
```

**When:** Component mount, after refetch
**What:** Copies database routines into draft state
**Why:** Provides baseline for detecting unsaved changes

### 2. User Interaction (Draft Update - Instant)
```typescript
// Line 732-739: Drag-drop triggers immediate draft update
const handleScheduleChange = (newSchedule: RoutineData[]) => {
  setDraftsByDate(prev => ({
    ...prev,
    [selectedDate]: newSchedule // Update current day only
  }));
};
```

**When:** Drag-drop, reorder, conflict auto-fix
**What:** Updates `draftsByDate` for current day
**Why:** Instant UI feedback (no network delay)

### 3. Save to Database (Draft → Database)
```typescript
// Line 1164-1259: Manual or autosave persists draft to database
const handleSaveSchedule = async () => {
  const ALL_COMPETITION_DATES = ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'];

  for (const date of ALL_COMPETITION_DATES) {
    const dayDraft = draftsByDate[date] || [];
    const routinesOnly = dayDraft.filter(item => !item.isBlock);

    if (routinesOnly.length > 0) {
      await scheduleMutation.mutateAsync({
        tenantId: TEST_TENANT_ID,
        competitionId: TEST_COMPETITION_ID,
        date,
        routines: routinesOnly.map(r => ({
          routineId: r.id,
          entryNumber: r.entryNumber || 100,
          performanceTime: r.performanceTime || '08:00:00',
        })),
      });
    }
  }

  await refetch(); // Sync database back to query cache
};
```

**When:** Manual save button, 5-minute autosave
**What:** Writes all 4 days' drafts to database sequentially
**Why:** Persist changes across sessions, enable multi-user sync

### 4. Database → UI Sync (After Save)
```typescript
// After mutation completes:
await refetch(); // Fetches latest from database
// → Triggers useEffect (step 1) → Updates draftsByDate
```

**When:** After successful save
**What:** Refetches `routines` query from database
**Why:** Ensures UI reflects authoritative database state

---

## 🔑 Key State Variables

### Draft State
| Variable | Type | Purpose |
|----------|------|---------|
| `draftsByDate` | `Record<string, RoutineData[]>` | Per-day draft schedules (UI layer) |
| `draftSchedule` | `RoutineData[]` | Current day's draft (computed from map) |
| `selectedDate` | `string` | Active day tab ("2026-04-11") |

### Database Queries
| Query | Returns | Refetch Triggers |
|-------|---------|------------------|
| `routines` | All competition routines | After save, reset, drag-drop save |
| `scheduleBlocks` | Award/break blocks for current day | After block create/delete/reorder |
| `conflictsData` | Dancer conflicts across all days | After schedule changes |

### Mutations
| Mutation | Purpose | Refetch After |
|----------|---------|---------------|
| `scheduleMutation` | Save draft to database | `routines`, `conflictsData` |
| `resetDay` | Unschedule all routines for one day | `routines`, `conflictsData` |
| `resetCompetition` | Unschedule ALL routines | `routines`, `blocks`, `conflictsData` |
| `unscheduleRoutines` | Unschedule specific routines | `routines`, `conflictsData` |

---

## 🎯 Entry Number Management (CRITICAL)

### Current Behavior (Session 72 - INCORRECT)
```typescript
// DragDropProvider.tsx:327-331 (WRONG - preserves existing numbers)
const entryNumber = routine.entryNumber != null && routine.isScheduled
  ? routine.entryNumber  // ❌ Keeps existing - WRONG
  : currentEntry++;      // ✅ Assigns new - CORRECT for unscheduled only
```

**Problem:** Reordering doesn't renumber, breaks sequential order

### Spec Requirement (REBUILD_SPEC_COMPARISON.md:61-85)
```
Draft Mode:
- Entry numbers auto-renumber on EVERY move
- Schedule auto-renumbers to maintain perfect sequence

Example:
Existing: Routines #100-599 on Thursday
Action: Insert new routine at position #150
Required: Renumber #150-599 → #151-600

Result:
- New routine = #150
- Old #150 becomes #151
- Old #151 becomes #152
- ... all the way to #600
```

### Correct Behavior (TO BE IMPLEMENTED)
**ALL routines must be renumbered sequentially across entire competition:**
- Thursday: 100, 101, 102, 103...
- Friday: (continues) 150, 151, 152...
- Saturday: (continues) 200, 201, 202...

**When any routine moves:** Renumber ALL routines in ALL days to maintain global sequence

---

## 🔄 Unsaved Changes Detection

```typescript
// Line 655-705: Compares draft vs database to show save button
const hasUnsavedChanges = useMemo(() => {
  // Filter out blocks (saved separately)
  const draftRoutinesOnly = draftSchedule.filter(item => !item.isBlock);

  const serverScheduled = routines
    .filter(r => r.isScheduled && r.scheduledDateString === selectedDate)
    .sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));

  // Count mismatch = unsaved
  if (draftRoutinesOnly.length !== serverScheduled.length) return true;

  // Different order/times/numbers = unsaved
  return draftRoutinesOnly.some((draft, index) => {
    const server = serverScheduled[index];
    return (
      draft.id !== server.id ||
      draft.entryNumber !== server.entryNumber ||
      draft.performanceTime !== server.scheduledTimeString
    );
  });
}, [draftSchedule, routines, selectedDate]);
```

**Triggers:**
- ✅ Different routine count
- ✅ Different routine order
- ✅ Different entry numbers
- ✅ Different performance times

---

## 🚀 Optimistic Updates Pattern

**DragDropProvider** updates `draftsByDate` immediately, then saves in background:

```typescript
// DragDropProvider.tsx: Immediate UI update
const handleDragEnd = (event: DragEndEvent) => {
  // 1. Calculate new schedule with times/numbers
  const newSchedule = calculateSchedule(reorderedRoutines, dayStartTime);

  // 2. Update draft state IMMEDIATELY (no await)
  onScheduleChange(newSchedule);

  // 3. Save to database in background (fire-and-forget)
  // (Not shown - happens in parent via autosave or manual save)
};
```

**Benefits:**
- Instant UI feedback (no lag)
- Network latency hidden
- User can continue working immediately

**Drawbacks:**
- Must handle save failures
- Can create temporary inconsistency if save fails
- Requires "unsaved changes" indicator

---

## 🐛 Known Bug Patterns (Avoid These)

### ❌ Anti-Pattern 1: Modifying Draft Without Sync
```typescript
// BAD: Mutates draft without triggering save
draftSchedule[0].entryNumber = 999; // ❌ Lost on page reload
```

**Fix:** Always use `setDraftsByDate()` and trigger save

### ❌ Anti-Pattern 2: Assuming Draft = Database
```typescript
// BAD: Using draft data for authoritative operations
const maxEntry = Math.max(...draftSchedule.map(r => r.entryNumber));
```

**Fix:** Use `routines` query (database) as source of truth

### ❌ Anti-Pattern 3: Not Clearing Draft After Reset
```typescript
// BAD: Reset database but not draft
await resetDay.mutateAsync({ date });
// Draft still has old data! ❌
```

**Fix:** Always clear draft when resetting:
```typescript
await resetDay.mutateAsync({ date });
setDraftsByDate(prev => {
  const next = { ...prev };
  delete next[date]; // Clear draft for reset day
  return next;
});
```

---

## 📝 Key Gotchas

1. **Blocks vs Routines:** Schedule blocks (awards/breaks) are saved separately via `createScheduleBlock`, NOT via `scheduleMutation`. Filter them out: `filter(item => !item.isBlock)`

2. **Entry Number Gaps:** Entry numbers are GLOBAL across all 4 days. Thursday: 100-150, Friday: 151-200, etc. NOT per-day.

3. **Time Strings:** Always `"HH:MM:SS"` format (e.g., `"08:00:00"`). Backend handles conversion to PostgreSQL TIME type.

4. **Autosave Timing:** 5 minutes (line 708-729). Checks `hasUnsavedChanges` and `!scheduleMutation.isPending` before triggering.

5. **Draft Loading Timing:** useEffect dependency is ONLY `routines` (line 648). Changing days doesn't reload draft - it's already in memory.

---

## 🔧 Common Operations

### Add Routine to Schedule
```typescript
// 1. Update draft (instant)
setDraftsByDate(prev => ({
  ...prev,
  [date]: [...prev[date], newRoutine]
}));

// 2. Save to database (later via autosave or manual)
// Handled by autosave interval or manual save button
```

### Reorder Routines
```typescript
// 1. Reorder array (instant)
const reordered = arrayMove(draftSchedule, oldIndex, newIndex);

// 2. Renumber ALL (sequential)
const renumbered = renumberRoutines(reordered); // ← TO BE IMPLEMENTED

// 3. Update draft
setDraftsByDate(prev => ({
  ...prev,
  [date]: renumbered
}));
```

### Unschedule Routines
```typescript
// 1. Remove from draft (instant)
setDraftsByDate(prev => ({
  ...prev,
  [date]: prev[date].filter(r => !selectedIds.has(r.id))
}));

// 2. Save to database (via mutation)
await unscheduleRoutines.mutateAsync({ routineIds: [...selectedIds] });

// 3. Refetch to sync
await refetch();
```

---

## 📍 File Locations

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Main Page | `page.tsx` | 1-1750 | Orchestration, state management |
| Drag-Drop Provider | `DragDropProvider.tsx` | 1-550 | Drag logic, drop indicators |
| Schedule Table | `ScheduleTable.tsx` | 1-400 | Scheduled routines display |
| Routine Pool | `RoutinePool.tsx` | 1-300 | Unscheduled routines display |
| Day Tabs | `DayTabs.tsx` | 1-295 | Day selector, start time editor |
| Routine Card | `RoutineCard.tsx` | 1-250 | Individual routine display |

---

**Last Updated:** Session 72
**Status:** Active Development - Auto-renumbering fix in progress
