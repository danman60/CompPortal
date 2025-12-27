# Scheduler Full Context

**Load this file when:** User says "scheduling fixes", "scheduler issue", "schedule bug"
**Last Updated:** Dec 27, 2025

---

## Architecture Overview

```
Frontend (page.tsx:3002 lines)
├── State: scheduleByDate = { "2026-04-09": ["routineId1", "block-uuid", "routineId2"...] }
├── Drag/Drop: @dnd-kit/core + @dnd-kit/sortable
├── Time Cascade: Computed from scheduleOrder + durations (frontend-side)
├── Save: Batches all days → scheduling.schedule mutation
└── Undo: Version history with restore

Backend (scheduling.ts:4392 lines)
├── schedule(): Atomic transaction, UNNEST bulk update
├── Time stored as: "HH:MM:SS" strings (TimeString type)
├── Dates stored as: "YYYY-MM-DD" strings (DateString type)
└── Entry numbers: Auto-assigned starting at 100
```

---

## Data Flow

### Schedule Save Flow
```
1. User drags routines
2. Frontend updates scheduleByDate[selectedDate] array
3. Frontend marks hasUnsavedChanges = true
4. User clicks Save (or autosave triggers)
5. handleSaveAllDays() iterates each day with changes
6. For each day: saveMutation.mutateAsync({ competitionId, tenantId, date, routines: [...] })
7. Backend: $transaction → clear old → UNNEST batch update
8. Backend: Create version snapshot
9. Frontend: refetch queries, clear dirty flags
```

### Time Calculation Flow
```
1. scheduleOrder = ["routineId1", "block-uuid", "routineId2"]
2. Start at dayStartTime (e.g., "08:00")
3. For each item:
   - Get duration (routine.duration or block.duration_minutes)
   - This item's time = currentTime
   - currentTime += duration
4. Entry numbers: 100, 101, 102... (skip blocks)
```

---

## Critical Files

### page.tsx Key Sections

| Lines | Section |
|-------|---------|
| 1-65 | Imports + block card component |
| 66-200 | Helper functions (formatTime, getClassificationColor) |
| 201-480 | SortableScheduleRow component |
| 481-670 | DroppableScheduleTable component |
| 669-730 | Main component state + queries |
| 730-950 | Mutations + handlers |
| 950-1250 | useMemo computations (routinesMap, conflicts, entryNumbers) |
| 1250-1400 | Drag handlers (onDragStart, onDragEnd) |
| 1400-1700 | Save handlers + autosave |
| 1700-3002 | JSX render |

### scheduling.ts Key Sections

| Lines | Section |
|-------|---------|
| 1-60 | Imports + doc header |
| 60-130 | Time helper functions |
| 130-200 | Legacy helpers |
| 200-340 | schedule() mutation (MAIN SAVE) |
| 340-500 | Version snapshot creation |
| 500-700 | getRoutines query (data fetch) |
| 700-1000 | Individual scheduling mutations |
| 1000-1500 | Reset/clear mutations |
| 1500-2000 | Block management (create/update/delete) |
| 2000-2500 | Version history + restore |
| 2500-3000 | PDF export |
| 3000-4392 | Email, studio codes, misc |

---

## State Variables (page.tsx)

| Variable | Type | Purpose |
|----------|------|---------|
| `selectedCompetitionId` | string | Current competition |
| `selectedDate` | string | Current day tab (YYYY-MM-DD) |
| `scheduleByDate` | Record<string, string[]> | Order arrays per day |
| `originalScheduleByDate` | Record<string, string[]> | For dirty checking |
| `routinesMap` | Map<string, Routine> | Quick lookup |
| `blocksMap` | Map<string, Block> | Block lookup |
| `entryNumbersByRoutineId` | Map<string, number> | Computed entry #s |
| `selectedRoutineIds` | Set<string> | Multi-select |
| `dayStartTimes` | Map<string, string> | Per-day start times |

---

## Mutations Reference

| Mutation | Input | What it does |
|----------|-------|--------------|
| `scheduling.schedule` | { competitionId, tenantId, date, routines: [{routineId, entryNumber, performanceTime}] } | Atomic save |
| `scheduling.createScheduleBlock` | { competitionId, tenantId, date, type, title, duration } | Add block |
| `scheduling.deleteScheduleBlock` | { blockId, tenantId } | Remove block |
| `scheduling.unscheduleRoutines` | { routineIds, tenantId } | Remove from schedule |
| `scheduling.updateDayStartTime` | { competitionId, tenantId, date, startTime } | Change day start |
| `scheduling.resetDay` | { competitionId, tenantId, date } | Clear day |
| `scheduling.restoreVersion` | { competitionId, tenantId, versionId } | Undo |

---

## Common Bug Patterns

### 1. Times Not Cascading
**Symptom:** All routines show same time or wrong sequence
**Cause:** Duration not being read correctly
**Fix:** Check `routine.duration` calculation at page.tsx:~1170
```typescript
// Duration comes from backend - check scheduling.ts:940-951
duration: (() => {
  if (routine.extended_time_requested && (routine.routine_length_minutes || routine.routine_length_seconds)) {
    const totalSeconds = (routine.routine_length_minutes || 0) * 60 + (routine.routine_length_seconds || 0);
    return Math.round(totalSeconds / 60) || 3;
  }
  const sizeName = routine.entry_size_categories?.name?.toLowerCase() || '';
  if (sizeName.includes('solo')) return 3;
  if (sizeName.includes('production') || sizeName.includes('line')) return 5;
  return 4;
})(),
```

### 2. Save Not Persisting
**Symptom:** Changes lost on page refresh
**Cause:** Save mutation not completing, or wrong data sent
**Debug:**
```typescript
// Check saveMutation at page.tsx:804
const saveMutation = trpc.scheduling.schedule.useMutation({
  onSuccess: () => {
    refetchVersions();
  },
});
// Check handleSaveAllDays at page.tsx:1564
```

### 3. Duplicate Entry Numbers
**Symptom:** Two routines with same #101
**Cause:** entryNumbersByRoutineId not updated, or race condition
**Fix:** scheduling.ts:350-393 has duplicate detection + clear logic

### 4. Missing Studio Name/Code
**Symptom:** Studio shows as blank or "X"
**Cause:** Join not included in query
**Fix:** Check scheduling.ts:886-888
```typescript
const studioCode = routine.studios.reservations[0]?.studio_code ||
                   routine.studios.code ||
                   'X';
```

### 5. Wrong Day Start Time
**Symptom:** First routine starts at wrong time
**Cause:** dayStartTimes not loaded or not applied
**Fix:** Check getDayStartTimes query and how it's used in time cascade

---

## Duration Defaults

| Entry Size Category | Default Duration |
|---------------------|------------------|
| Solo | 3 min |
| Duet/Trio | 4 min |
| Small Group | 4 min |
| Large Group | 4 min |
| Line | 5 min |
| Production | 5 min |

**Extended Time Override:** If `extended_time_requested = true` AND has `routine_length_minutes/seconds`, uses custom duration.

---

## Testing Checklist

When client reports issue:
1. [ ] Which competition? Which day?
2. [ ] What did they do? (drag, save, change start time, etc.)
3. [ ] What did they expect?
4. [ ] What happened instead?
5. [ ] Any console errors? (check browser devtools)
6. [ ] Check DB: Is data correct in `competition_entries` table?

---

## Quick Fixes

### Force Refresh Data
```typescript
// In browser console:
location.reload(true)  // Hard refresh
```

### Check Entry Data in DB
```sql
SELECT id, title, entry_number, performance_date, performance_time, is_scheduled, duration
FROM competition_entries
WHERE competition_id = 'xxx' AND performance_date = '2026-04-09'
ORDER BY entry_number;
```

### Check Version History
```sql
SELECT id, version_number, created_at, snapshot_data
FROM schedule_versions
WHERE competition_id = 'xxx'
ORDER BY created_at DESC
LIMIT 5;
```
