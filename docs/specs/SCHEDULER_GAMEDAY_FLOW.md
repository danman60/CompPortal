# Scheduler to Game Day Flow Specification

## Overview

This document specifies how schedules created in scheduler-v2 flow into Game Day pages (tabulator, backstage, judge panels).

## Key Terminology

| Field | Purpose | Mutability | Assignment |
|-------|---------|------------|------------|
| `entry_number` | Permanent identifier (e.g., #401) | **LOCKED** after finalize | Scheduler assigns during scheduling |
| `running_order` | Current performance position | **MUTABLE** in Game Day | Scheduler sets on finalize; Game Day can reorder |

## Current Implementation Analysis

### What Scheduler-v2 Currently Saves

**File:** `src/server/routers/scheduling.ts` (lines 287-395)

The `schedule` mutation saves:
- `performance_date` - What day the routine performs
- `performance_time` - What time the routine performs
- `entry_number` - The visible number (e.g., #401)
- `is_scheduled` - Boolean flag

**MISSING:** `running_order` is NOT set by the scheduler.

### What Game Day Queries Expect

**File:** `src/server/routers/liveCompetition.ts` (lines 85-176)

The `getLineup` query orders by:
```typescript
orderBy: { running_order: 'asc' }
```

**Fallback:** If `running_order` is NULL, uses array index (`order: entry.running_order || index + 1`).

**File:** `src/app/api/backstage/route.ts` (lines 74-104)

Backstage API orders by:
```sql
ORDER BY e.running_order ASC NULLS LAST, e.entry_number ASC
```

### Current GAP

| Step | Expected | Actual |
|------|----------|--------|
| Scheduler saves | Sets `running_order` | Does NOT set `running_order` |
| Game Day loads | Uses `running_order` | Falls back to `entry_number` |
| Result | Works | Works (via fallback), but semantically incorrect |

## Existing Finalize Functionality

**File:** `src/server/routers/scheduling.ts` (lines 4264-4282)

```typescript
toggleScheduleStatus: publicProcedure
  .input(z.object({
    tenantId: z.string().uuid(),
    competitionId: z.string().uuid(),
    status: z.enum(['unpublished', 'tentative', 'final']),
  }))
  .mutation(async ({ input }) => {
    const updatedCompetition = await prisma.competitions.update({
      where: { id: input.competitionId, tenant_id: input.tenantId },
      data: {
        schedule_state: input.status,
        schedule_finalized_at: input.status === 'final' ? new Date() : null,
      },
    });
    return updatedCompetition;
  });
```

**UI Location:** `src/app/dashboard/director-panel/schedule-v2/page.tsx` (line 880)

Status Flow: `unpublished` -> `tentative` -> `final`

### Schedule Versions Table

Already exists for backup/restore:
- `schedule_versions` table
- Version snapshots created on save
- Contains `snapshot_data` JSON with full routine details

## Proposed Architecture

### Phase 1: entry_number vs running_order Clarification

```
SCHEDULER (Drafting Phase)
├── Assigns entry_number (sequential per scheduler logic)
├── Can do multiple drafts
├── entry_number can change during drafts
└── Sets running_order = position on each save

SCHEDULER (Finalize)
├── schedule_state = 'final'
├── entry_number LOCKED (no more changes)
├── running_order = initial_running_order
└── schedule_finalized_at = now()

GAME DAY
├── Loads by running_order
├── Can reorder routines (changes running_order ONLY)
├── entry_number NEVER changes
└── Tracks moves in move_log table
```

### Phase 2: Move Log Table (New)

```sql
CREATE TABLE game_day_move_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  entry_id UUID NOT NULL REFERENCES competition_entries(id),

  -- Position tracking
  previous_running_order INT NOT NULL,
  new_running_order INT NOT NULL,

  -- Context
  moved_by_user_id UUID REFERENCES auth.users(id),
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,

  -- For undo
  can_undo BOOLEAN DEFAULT TRUE,
  undone_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### Phase 3: Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SCHEDULER-V2                                │
│                                                                  │
│  Save Draft:                                                     │
│  ├── entry_number = position (1, 2, 3...)                       │
│  ├── running_order = position (same as entry_number)            │
│  └── is_scheduled = true                                        │
│                                                                  │
│  Finalize:                                                       │
│  ├── schedule_state = 'final'                                   │
│  ├── schedule_finalized_at = NOW()                              │
│  └── entry_number LOCKED                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GAME DAY PAGES                              │
│                                                                  │
│  Load:                                                           │
│  ├── Query: ORDER BY running_order ASC                          │
│  └── Display: Shows entry_number to users                       │
│                                                                  │
│  Reorder (when needed):                                          │
│  ├── Updates running_order ONLY                                 │
│  ├── entry_number NEVER changes                                 │
│  └── Creates move_log entry                                     │
│                                                                  │
│  Example:                                                        │
│  Original: [#401, #402, #403, #404]  (running_order 1,2,3,4)    │
│  After:    [#401, #403, #402, #404]  (running_order 1,2,3,4)    │
│  Result:   #402 now has running_order=3, #403 has running_order=2│
│            But entry_numbers stay: 401, 403, 402, 404           │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Step 1: Add running_order to Scheduler Save (IMMEDIATE)

**File:** `src/server/routers/scheduling.ts` (line 367-383)

Change from:
```sql
UPDATE competition_entries ce
SET
  performance_date = ${performanceDate},
  performance_time = data.perf_time,
  entry_number = data.entry_num,
  is_scheduled = true,
  updated_at = ${updatedAt}
FROM (
  SELECT
    UNNEST(${ids}::uuid[]) AS id,
    UNNEST(${entryNums}::int[]) AS entry_num,
    UNNEST(${perfTimes}::timestamp[]) AS perf_time
) AS data
WHERE ce.id = data.id
  AND ce.tenant_id = ${input.tenantId}::uuid
```

To:
```sql
UPDATE competition_entries ce
SET
  performance_date = ${performanceDate},
  performance_time = data.perf_time,
  entry_number = data.entry_num,
  running_order = data.running_ord,  -- NEW
  is_scheduled = true,
  updated_at = ${updatedAt}
FROM (
  SELECT
    UNNEST(${ids}::uuid[]) AS id,
    UNNEST(${entryNums}::int[]) AS entry_num,
    UNNEST(${perfTimes}::timestamp[]) AS perf_time,
    UNNEST(${runningOrders}::int[]) AS running_ord  -- NEW
) AS data
WHERE ce.id = data.id
  AND ce.tenant_id = ${input.tenantId}::uuid
```

**Note:** `running_order` = array position (1, 2, 3, etc.) based on order in routines array.

### Step 2: Set up Tester Data (IMMEDIATE)

Update tester competition entries to have sequential `running_order`:

```sql
-- For April 11, 2026 (operating_date in tester)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY entry_number) as rn
  FROM competition_entries
  WHERE competition_id = '1b786221-8f8e-413f-b532-06fa20a2ff63'
    AND performance_date = '2026-04-11'
    AND status != 'cancelled'
)
UPDATE competition_entries ce
SET running_order = n.rn
FROM numbered n
WHERE ce.id = n.id;
```

### Step 3: Game Day Reorder Mutation (FUTURE)

```typescript
reorderRoutine: publicProcedure
  .input(z.object({
    tenantId: z.string().uuid(),
    competitionId: z.string().uuid(),
    entryId: z.string().uuid(),
    newRunningOrder: z.number(),
    reason: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Get current running_order
    // 2. Log move to game_day_move_log
    // 3. Update running_order (shift others as needed)
    // 4. NEVER touch entry_number
  });
```

### Step 4: Move Log UI (FUTURE)

- Show recent moves in sidebar
- Allow undo of individual moves
- Compare to original scheduler order

## Test Data Status

**Tester Competition:** "Test Competition Spring 2026" (ID: 1b786221-8f8e-413f-b532-06fa20a2ff63)

| Date | Entries | With running_order | Status |
|------|---------|-------------------|--------|
| April 9, 2026 | 200 | 1 | Needs backfill |
| April 10, 2026 | 200 | 2 | Needs backfill |
| April 11, 2026 | 200 | 0 | **Needs backfill** (operating_date) |
| April 12, 2026 | 200 | 0 | Needs backfill |

**Current Workaround:** Game Day pages fall back to `entry_number` order when `running_order` is NULL.

## Summary

| Component | Current State | Required Fix |
|-----------|--------------|--------------|
| Scheduler save | Missing running_order | Add to UNNEST batch update |
| Game Day load | Falls back to entry_number | Will work correctly after fix |
| Move log table | Does not exist | Create for audit trail |
| Tester data | running_order NULL | Backfill for immediate testing |
| Finalize button | EXISTS (tentative/final toggle) | Already implemented |

---

## Operating Date / Current Entry Sync (IMPLEMENTED)

### Problem Discovered

When `setOperatingDate` was called to change the operating day:
1. `operating_date` was updated (e.g., to April 11)
2. `current_entry_id` was NOT updated (stayed pointing to April 10 entry)
3. Result: Tabulator showed left panel from April 11 but "NOW PERFORMING" from April 10

### Root Cause

The `setOperatingDate` mutation (lines 1261-1295) only updated `operating_date` without resetting `current_entry_id`.

### Fix Applied (Session Dec 15, 2025, REFINED)

**File:** `src/server/routers/liveCompetition.ts` (lines 1274-1353)

**Key Insight:** `operating_date` is a VIEW filter (which day to show), `current_entry_id` is the PLAYHEAD (which routine is performing). These are independent concepts but must stay in sync.

The `setOperatingDate` mutation now uses **smart reset logic**:

1. **Check current entry's date** - See if `current_entry_id` is already on the target date
2. **Only reset on cross-day mismatch** - If current entry is on a different day, reset to first entry of target day
3. **Preserve position otherwise** - If current entry is already on target day, keep it

**Use Cases:**
| Scenario | Current Entry | Target Date | Action |
|----------|---------------|-------------|--------|
| Start new day | April 10 entry | April 11 | RESET to first April 11 entry |
| Accidental click (same day) | April 11 entry | April 11 | PRESERVE position |
| No current entry | NULL | April 11 | SET to first April 11 entry |

```typescript
// Check if current entry exists and what date it's on
let currentEntryDate: string | null = null;
if (existingState?.current_entry_id) {
  const currentEntry = await prisma.competition_entries.findUnique({
    where: { id: existingState.current_entry_id },
    select: { performance_date: true },
  });
  if (currentEntry?.performance_date) {
    currentEntryDate = new Date(currentEntry.performance_date).toISOString().split('T')[0];
  }
}

// Only reset if cross-day mismatch
const needsReset = !currentEntryDate || currentEntryDate !== targetDate;

// Update live state - Only reset current_entry fields if we're changing days
update: {
  operating_date: input.operatingDate ? new Date(input.operatingDate) : null,
  ...(needsReset && {
    current_entry_id: newCurrentEntryId,
    current_entry_state: null,
    current_entry_started_at: null,
  }),
  updated_at: new Date(),
}
```

### Prevention Mechanism

This ensures:
- **Cross-day protection:** Cannot show "NOW PERFORMING" from different day than lineup
- **Position preservation:** Mid-day clicks on same day don't lose progress
- **Returns `didReset` flag** so UI can inform operator if position changed

## Files to Modify

1. `src/server/routers/scheduling.ts:367-383` - Add running_order to batch update
2. Database: Create `game_day_move_log` table (migration)
3. Database: Backfill running_order for tester data (SQL)
4. `src/server/routers/liveCompetition.ts` - Add reorder mutation (future)

---

*Last updated: Session continuing from context summary*
