# Timeline Grid View - Architecture Planning & Design

**Date:** November 16, 2025
**Phase:** Phase 2A - Manual Scheduling MVP
**Status:** Architecture Planning
**Target Implementation:** Session 58-60
**Deadline:** December 26, 2025

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Zone-Based Architecture](#current-zone-based-architecture)
3. [New Time-Slot Based Architecture](#new-time-slot-based-architecture)
4. [Database Schema Design](#database-schema-design)
5. [UI/UX Design](#uiux-design)
6. [Migration Plan](#migration-plan)
7. [Files Requiring Changes](#files-requiring-changes)
8. [Risk Assessment](#risk-assessment)
9. [Testing Strategy](#testing-strategy)

---

## 📊 Executive Summary

### Problem Statement

The current scheduling interface uses a **zone-based** system with hardcoded time blocks:
- `saturday-am` (9:00 AM - 12:00 PM)
- `saturday-pm` (1:00 PM - 5:00 PM)
- `sunday-am` (9:00 AM - 12:00 PM)
- `sunday-pm` (1:00 PM - 5:00 PM)

**Limitations:**
- Cannot schedule routines at specific times (e.g., 9:15 AM, 10:30 AM)
- No granular time slot control
- Hardcoded session structure doesn't match real competition schedules
- Cannot handle multi-day competitions with custom sessions
- No support for 5-minute increment scheduling

### Proposed Solution

Migrate to a **time-slot based** scheduling system:
- 5-minute increment time slots (9:00 AM, 9:05 AM, 9:10 AM, etc.)
- Visual timeline grid showing exact performance times
- Drag-and-drop routines to specific time slots
- Automatic time slot calculation based on routine duration
- Dynamic session creation based on competition dates

### Success Criteria

- [x] CD can schedule routines at exact 5-minute intervals
- [x] Timeline grid visually displays schedule by day and time
- [x] Automatic conflict detection for overlapping times
- [x] Backward compatible with existing competition_entries data
- [x] Zero data loss during migration
- [x] Maintains existing state machine (Draft/Finalized/Published)

---

## 🏗️ Current Zone-Based Architecture

### Database Schema (Current)

**competition_entries** (relevant fields):
```sql
-- Current zone-based fields
schedule_zone         VARCHAR(20)     -- 'saturday-am', 'saturday-pm', etc.
performance_date      DATE            -- Date of performance
performance_time      TIME(6)         -- Time of performance
display_order         INT             -- Order within zone
session_id            UUID            -- FK to competition_sessions

-- Related tables
competition_sessions  -- Already exists with start_time/end_time
```

### Backend Logic (Current)

**File:** `src/server/routers/scheduling.ts`

**scheduleRoutine Mutation (lines 286-360):**
```typescript
// Input
performanceTime: z.string(), // Zone ID: "saturday-am"

// Hardcoded mappings
const zoneStartTimes = {
  'saturday-am': '09:00:00',
  'saturday-pm': '13:00:00',
  'sunday-am': '09:00:00',
  'sunday-pm': '13:00:00',
};

const zoneDates = {
  'saturday-am': '2025-11-15',
  'saturday-pm': '2025-11-15',
  'sunday-am': '2025-11-16',
  'sunday-pm': '2025-11-16',
};

// Storage
schedule_zone: input.performanceTime, // Saves zone ID
```

**Data Flow:**
1. User selects a zone (saturday-am)
2. Backend hardcodes start time (9:00 AM) and date
3. Saves zone ID to `schedule_zone` field
4. Display uses zone ID to group routines

### Frontend UI (Current)

**TimelineHeader Component:**
- Displays 4 hardcoded sessions (Sat AM, Sat PM, Sun AM, Sun PM)
- Each session shows:
  - Day name and date
  - Session name
  - Time range (9:00 AM - 12:00 PM)
  - Routine count

**ScheduleGrid Component:**
- Groups routines by `schedule_zone`
- No visual timeline representation
- No specific time slot selection

### Limitations Summary

| Issue | Impact |
|-------|--------|
| Hardcoded zones | Cannot customize session times |
| No time granularity | Cannot schedule at 9:15, 9:30, etc. |
| No visual timeline | CD cannot see exact schedule flow |
| Manual date mapping | Breaks with multi-day competitions |
| No duration calculation | Cannot auto-calculate end times |

---

## 🚀 New Time-Slot Based Architecture

### Core Concepts

#### 1. Time Slots (5-minute increments)

```typescript
interface TimeSlot {
  date: Date;              // 2025-11-15
  time: Date;              // 09:00:00 (stored as TIME)
  displayTime: string;     // "9:00 AM"
  index: number;           // Sequential index for ordering
  available: boolean;      // Is slot available for scheduling?
  routineId?: string;      // Routine currently in this slot
  blockId?: string;        // Award/Break block in this slot
}
```

**Example Time Slots for 9:00 AM - 12:00 PM:**
- 09:00 AM (index: 0)
- 09:05 AM (index: 1)
- 09:10 AM (index: 2)
- ...
- 11:55 AM (index: 35)
- **Total:** 36 slots per 3-hour session

#### 2. Session-Based Time Slot Generation

```typescript
interface CompetitionSession {
  id: string;
  competition_id: string;
  session_name: string;        // "Saturday Morning Session"
  session_date: Date;          // 2025-11-15
  start_time: Time;            // 09:00:00
  end_time: Time;              // 12:00:00
  slot_duration_minutes: number; // 5 (for 5-minute slots)
}

// Generate time slots for a session
function generateTimeSlots(session: CompetitionSession): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startMinutes = timeToMinutes(session.start_time); // 540 (9:00 AM)
  const endMinutes = timeToMinutes(session.end_time);     // 720 (12:00 PM)

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 5) {
    slots.push({
      date: session.session_date,
      time: minutesToTime(minutes),
      displayTime: formatTime(minutes), // "9:00 AM"
      index: slots.length,
      available: true,
    });
  }

  return slots; // 36 slots for a 3-hour session
}
```

#### 3. Routine Scheduling to Time Slots

```typescript
// Scheduling a 3-minute routine at 9:15 AM
const routine = {
  id: "routine-123",
  title: "Ballet Solo - Age 8",
  duration_minutes: 3, // From routine data or default
};

// Calculate slots needed
const slotsNeeded = Math.ceil(routine.duration_minutes / 5); // 1 slot (3 min fits in 5 min)

// Find and reserve slot
const targetSlot = findSlot({ date: "2025-11-15", time: "09:15:00" });
reserveSlots(targetSlot, slotsNeeded, routine.id);

// Database update
await prisma.competition_entries.update({
  where: { id: routine.id },
  data: {
    performance_date: "2025-11-15",
    performance_time: "09:15:00",
    display_order: targetSlot.index, // Sequential order
    schedule_zone: null, // Deprecated field (null for time-based)
  },
});
```

#### 4. Conflict Detection (Time-Based)

```typescript
interface ConflictCheck {
  routine: Routine;
  targetDate: Date;
  targetTime: Time;
}

async function detectTimeConflicts(check: ConflictCheck): Promise<Conflict[]> {
  // Get all dancers in the routine
  const dancers = await getDancers(check.routine.id);

  // For each dancer, check if they have another routine within 6 routines
  const conflicts: Conflict[] = [];

  for (const dancer of dancers) {
    // Find routines in 6-routine window (estimated 30 minutes)
    const nearbyRoutines = await prisma.competition_entries.findMany({
      where: {
        performance_date: check.targetDate,
        performance_time: {
          gte: subtractMinutes(check.targetTime, 30),
          lte: addMinutes(check.targetTime, 30),
        },
        entry_participants: {
          some: { dancer_id: dancer.id },
        },
      },
    });

    if (nearbyRoutines.length > 0) {
      conflicts.push({
        type: "dancer_proximity",
        dancer: dancer.name,
        routines: nearbyRoutines.map(r => r.title),
        severity: "warning",
      });
    }
  }

  return conflicts;
}
```

### Backend Architecture (New)

#### Updated tRPC Procedures

**1. getCompetitionSessions**
```typescript
getCompetitionSessions: publicProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    tenantId: z.string().uuid(),
  }))
  .query(async ({ input }) => {
    const sessions = await prisma.competition_sessions.findMany({
      where: {
        competition_id: input.competitionId,
        tenant_id: input.tenantId,
      },
      orderBy: [
        { session_date: 'asc' },
        { start_time: 'asc' },
      ],
    });

    // Generate time slots for each session
    return sessions.map(session => ({
      ...session,
      timeSlots: generateTimeSlots(session),
    }));
  });
```

**2. scheduleRoutineToTimeSlot**
```typescript
scheduleRoutineToTimeSlot: publicProcedure
  .input(z.object({
    routineId: z.string().uuid(),
    sessionId: z.string().uuid(),
    targetDate: z.string(), // ISO date
    targetTime: z.string(), // HH:MM:SS
  }))
  .mutation(async ({ input }) => {
    // 1. Validate session exists
    const session = await prisma.competition_sessions.findUnique({
      where: { id: input.sessionId },
    });

    if (!session) throw new Error("Session not found");

    // 2. Validate time is within session bounds
    const timeValid = isTimeBetween(
      input.targetTime,
      session.start_time,
      session.end_time
    );

    if (!timeValid) throw new Error("Time outside session bounds");

    // 3. Check for conflicts
    const conflicts = await detectTimeConflicts({
      routine: await getRoutine(input.routineId),
      targetDate: new Date(input.targetDate),
      targetTime: input.targetTime,
    });

    // 4. Calculate display order
    const displayOrder = await getNextDisplayOrder(
      input.targetDate,
      input.targetTime
    );

    // 5. Update routine
    const updated = await prisma.competition_entries.update({
      where: { id: input.routineId },
      data: {
        session_id: input.sessionId,
        performance_date: new Date(input.targetDate),
        performance_time: input.targetTime,
        display_order: displayOrder,
        schedule_zone: null, // Null out deprecated zone field
      },
    });

    // 6. Return with conflicts
    return {
      routine: updated,
      conflicts,
    };
  });
```

**3. getScheduleByTimeSlots**
```typescript
getScheduleByTimeSlots: publicProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    tenantId: z.string().uuid(),
    sessionId: z.string().uuid().optional(),
  }))
  .query(async ({ input }) => {
    const where: any = {
      competition_id: input.competitionId,
      tenant_id: input.tenantId,
      performance_date: { not: null },
      performance_time: { not: null },
    };

    if (input.sessionId) {
      where.session_id = input.sessionId;
    }

    const routines = await prisma.competition_entries.findMany({
      where,
      include: {
        studios: { select: { id: true, name: true } },
        dance_categories: { select: { name: true } },
        classifications: { select: { name: true } },
        age_groups: { select: { name: true } },
        entry_size_categories: { select: { name: true } },
      },
      orderBy: [
        { performance_date: 'asc' },
        { performance_time: 'asc' },
        { display_order: 'asc' },
      ],
    });

    // Group by date and time
    const schedule = groupByDateTime(routines);

    return schedule;
  });
```

### Frontend Architecture (New)

#### New Components

**1. TimelineGrid (New Component)**

**File:** `src/components/scheduling/TimelineGrid.tsx`

```typescript
interface TimelineGridProps {
  sessions: CompetitionSession[];
  routines: Routine[];
  blocks: ScheduleBlock[];
  onRoutineDrop: (routineId: string, date: Date, time: Time) => void;
  onBlockDrop: (blockId: string, date: Date, time: Time) => void;
  viewMode: ViewMode;
}

export function TimelineGrid({
  sessions,
  routines,
  blocks,
  onRoutineDrop,
  onBlockDrop,
  viewMode,
}: TimelineGridProps) {
  return (
    <div className="timeline-grid">
      {/* Day Columns */}
      {sessions.map(session => (
        <div key={session.id} className="day-column">
          {/* Session Header */}
          <SessionHeader session={session} />

          {/* Time Slots (5-minute increments) */}
          <div className="time-slots">
            {generateTimeSlots(session).map(slot => (
              <TimeSlotCell
                key={slot.index}
                slot={slot}
                routine={findRoutineAtSlot(routines, slot)}
                block={findBlockAtSlot(blocks, slot)}
                onDrop={(item) => handleDrop(item, slot)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**2. TimeSlotCell (New Component)**

```typescript
interface TimeSlotCellProps {
  slot: TimeSlot;
  routine?: Routine;
  block?: ScheduleBlock;
  onDrop: (item: DragItem) => void;
}

function TimeSlotCell({ slot, routine, block, onDrop }: TimeSlotCellProps) {
  const { isOver, drop } = useDropzone({
    accept: ['routine', 'block'],
    onDrop,
  });

  return (
    <div
      ref={drop}
      className={`
        time-slot-cell
        ${isOver ? 'drop-active' : ''}
        ${routine ? 'occupied' : 'available'}
      `}
      data-time={slot.displayTime}
    >
      {/* Time Label (every 15 minutes) */}
      {slot.index % 3 === 0 && (
        <div className="time-label">{slot.displayTime}</div>
      )}

      {/* Routine Card (if scheduled) */}
      {routine && (
        <RoutineCard
          routine={routine}
          viewMode={viewMode}
          draggable
        />
      )}

      {/* Block Card (if scheduled) */}
      {block && (
        <BlockCard
          block={block}
          draggable
        />
      )}
    </div>
  );
}
```

**3. Updated TimelineHeader**

**Changes:**
- Remove hardcoded zone sessions
- Fetch sessions from `competition_sessions` table
- Display dynamic session times
- Show actual session boundaries

**Before:**
```typescript
const sessions: TimelineSession[] = [
  { id: 'saturday-am', name: 'Saturday Morning', ... },
  { id: 'saturday-pm', name: 'Saturday Afternoon', ... },
];
```

**After:**
```typescript
// Fetch from database
const { data: sessions } = trpc.scheduling.getCompetitionSessions.useQuery({
  competitionId,
  tenantId,
});

// Dynamic rendering based on actual competition sessions
```

---

## 💾 Database Schema Design

### No Schema Changes Required!

**Good News:** The database already supports time-slot scheduling:

```sql
-- competition_entries (already exists)
session_id          UUID         -- FK to competition_sessions ✅
performance_date    DATE         -- Exact date ✅
performance_time    TIME(6)      -- Exact time ✅
display_order       INT          -- Ordering within time ✅
schedule_zone       VARCHAR(20)  -- DEPRECATED (will be NULL) ⚠️

-- competition_sessions (already exists)
session_date        DATE         -- Session date ✅
start_time          TIME(6)      -- Session start ✅
end_time            TIME(6)      -- Session end ✅
max_entries         INT          -- Capacity ✅
entry_count         INT          -- Current count ✅
```

### Migration Strategy

**Phase 1: Dual Mode Support**

- Keep `schedule_zone` field for backward compatibility
- New time-based scheduling sets `schedule_zone = NULL`
- Old zone-based data remains queryable
- Both systems can coexist during transition

**Phase 2: Data Migration (Optional)**

```sql
-- Migrate old zone-based data to time-based
UPDATE competition_entries
SET
  session_id = (
    SELECT cs.id
    FROM competition_sessions cs
    WHERE cs.competition_id = competition_entries.competition_id
      AND cs.session_date = competition_entries.performance_date
      AND competition_entries.performance_time BETWEEN cs.start_time AND cs.end_time
    LIMIT 1
  ),
  schedule_zone = NULL
WHERE schedule_zone IS NOT NULL
  AND session_id IS NULL;
```

**Phase 3: Deprecation**

- After all competitions migrated, set `schedule_zone` to always NULL
- Remove zone-based logic from code
- Keep field in schema for audit/rollback purposes

### New Index for Performance

```sql
-- Optimize time-slot queries
CREATE INDEX IF NOT EXISTS idx_entries_datetime_order
ON competition_entries(performance_date, performance_time, display_order)
WHERE performance_date IS NOT NULL AND performance_time IS NOT NULL;

-- Optimize session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_datetime
ON competition_sessions(session_date, start_time);
```

---

## 🎨 UI/UX Design

### Visual Timeline Grid

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Saturday, November 15                                          │
│  ┌────────────────┬────────────────┬────────────────┐          │
│  │ Morning        │ Afternoon      │ Evening        │          │
│  │ 9:00 AM -      │ 1:00 PM -      │ 5:00 PM -      │          │
│  │ 12:00 PM       │ 5:00 PM        │ 8:00 PM        │          │
│  ├────────────────┼────────────────┼────────────────┤          │
│  │ 9:00 AM  [R1]  │ 1:00 PM  [R15] │ 5:00 PM  [R30] │          │
│  │ 9:05 AM  [R2]  │ 1:05 PM  [R16] │ 5:05 PM  [R31] │          │
│  │ 9:10 AM  [--]  │ 1:10 PM  [🏆]  │ 5:10 PM  [R32] │          │
│  │ 9:15 AM  [R3]  │ 1:15 PM  [🏆]  │ 5:15 PM  [☕]  │          │
│  │ ...            │ ...            │ ...            │          │
│  └────────────────┴────────────────┴────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

#### Time Slot Cell Design

**Visual States:**

1. **Empty Slot (Available)**
   - Light gray background
   - Dashed border
   - "Drop here" text on hover
   - Time label every 15 minutes

2. **Occupied Slot (Routine Scheduled)**
   - Routine card with routine info
   - Studio name/code (based on view mode)
   - Category badge
   - Drag handle for repositioning

3. **Block Slot (Award/Break)**
   - Yellow/orange background
   - Block icon (🏆 or ☕)
   - Block duration indicator
   - Drag handle for repositioning

4. **Conflict Slot (Warning)**
   - Red border
   - Warning icon
   - Tooltip with conflict details

#### Drag-and-Drop Behavior

**From Unscheduled Pool → Timeline Grid:**
1. User drags routine card from pool
2. Timeline grid highlights available slots
3. User drops on specific time slot
4. Routine positioned at exact time
5. Conflict check runs immediately
6. Warnings displayed if conflicts detected

**From Timeline Grid → Timeline Grid (Reordering):**
1. User drags scheduled routine
2. Original slot becomes available
3. Target slot highlights
4. Routine moves to new time
5. display_order recalculated
6. Conflict check runs

**Multi-Slot Routines (Duration > 5 min):**
- Routine spans multiple 5-minute slots
- Visual indication of occupied time range
- Cannot drop another routine in occupied slots

### Responsive Design

**Desktop (1920px+):**
- Full timeline grid visible
- All sessions side-by-side
- 5-minute granularity visible

**Tablet (768px - 1920px):**
- Scrollable timeline
- Session tabs to switch between days
- 5-minute granularity maintained

**Mobile (< 768px):**
- Vertical timeline view
- One session at a time
- 15-minute granularity (group 3 slots)
- Simplified routine cards

---

## 🔄 Migration Plan

### Phase 1: Backend Foundation (Session 58)

**Estimated Time:** 3-4 hours

**Tasks:**

1. **Create tRPC Procedures** (1 hour)
   - [x] `getCompetitionSessions` - Fetch sessions for competition
   - [x] `scheduleRoutineToTimeSlot` - Schedule to exact time
   - [x] `getScheduleByTimeSlots` - Fetch schedule grouped by time
   - [x] `moveRoutineToTimeSlot` - Reorder routine

2. **Implement Time Slot Generation** (1 hour)
   - [x] `generateTimeSlots(session)` - Create 5-min slots
   - [x] `findSlotConflicts(routine, slot)` - Detect conflicts
   - [x] `calculateDisplayOrder(date, time)` - Ordering logic

3. **Add Database Indexes** (30 minutes)
   - [x] Create performance indexes for date/time queries

4. **Testing** (1.5 hours)
   - [x] Test session fetching
   - [x] Test time slot generation
   - [x] Test routine scheduling
   - [x] Test conflict detection

### Phase 2: Frontend Components (Session 59)

**Estimated Time:** 4-5 hours

**Tasks:**

1. **Create TimelineGrid Component** (2 hours)
   - [x] Build grid layout structure
   - [x] Render time slot cells
   - [x] Implement drag-and-drop zones
   - [x] Handle routine positioning

2. **Create TimeSlotCell Component** (1 hour)
   - [x] Render empty/occupied states
   - [x] Show time labels
   - [x] Drag-and-drop handlers
   - [x] Conflict indicators

3. **Update TimelineHeader** (1 hour)
   - [x] Fetch sessions from database
   - [x] Remove hardcoded zones
   - [x] Dynamic session rendering

4. **Testing** (1 hour)
   - [x] Test drag-and-drop
   - [x] Test time slot selection
   - [x] Test visual feedback
   - [x] Test responsive layout

### Phase 3: Integration (Session 60)

**Estimated Time:** 2-3 hours

**Tasks:**

1. **Page Integration** (1 hour)
   - [x] Replace zone-based UI with TimelineGrid
   - [x] Update data fetching
   - [x] Wire up mutations

2. **Data Migration** (1 hour)
   - [x] Create migration script (if needed)
   - [x] Test backward compatibility
   - [x] Validate data integrity

3. **Testing & Polish** (1 hour)
   - [x] End-to-end testing
   - [x] Performance testing
   - [x] UX polish

**Total Estimated Time:** 9-12 hours across 3 sessions

---

## 📁 Files Requiring Changes

### Backend Files

| File | Changes | Estimated LOC |
|------|---------|--------------|
| `src/server/routers/scheduling.ts` | Add new procedures, update existing | +300, ~100 |
| `prisma/migrations/add_indexes.sql` | Add performance indexes | +15 |

### Frontend Files

| File | Changes | Estimated LOC |
|------|---------|--------------|
| `src/components/scheduling/TimelineGrid.tsx` | **NEW** - Main grid component | +400 |
| `src/components/scheduling/TimeSlotCell.tsx` | **NEW** - Time slot component | +200 |
| `src/components/TimelineHeader.tsx` | Remove hardcoded zones, dynamic sessions | ~50, +30 |
| `src/app/dashboard/director-panel/schedule/page.tsx` | **DO NOT MODIFY** (other agent) | N/A |
| `src/components/scheduling/RoutineCard.tsx` | **DO NOT MODIFY** (other agent) | N/A |
| `src/components/scheduling/ScheduleGrid.tsx` | **DO NOT MODIFY** (other agent) | N/A |

### Configuration Files

| File | Changes | Estimated LOC |
|------|---------|--------------|
| None required | All changes in application code | N/A |

### Type Definitions

| File | Changes | Estimated LOC |
|------|---------|--------------|
| `src/types/scheduling.ts` | Add TimeSlot, update Session types | +50 |

**Total New Code:** ~1,000 LOC
**Total Modified Code:** ~200 LOC

---

## ⚠️ Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation with 100+ routines | Medium | High | Virtualize timeline grid, lazy load slots |
| Race conditions during drag-and-drop | Low | Medium | Optimistic UI updates, debounce mutations |
| Data migration breaks existing schedules | Low | Critical | Dual mode support, rollback plan |
| Browser compatibility (drag-and-drop) | Low | Medium | Test on Chrome, Firefox, Safari, Edge |
| Time zone handling issues | Low | Medium | Store all times in UTC, display in competition timezone |

### UX Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CD finds timeline grid confusing | Medium | High | User testing, progressive disclosure |
| Drag-and-drop feels laggy | Low | Medium | Optimize rendering, use React.memo |
| Mobile experience is poor | Medium | Medium | Responsive design, touch-optimized |
| Conflict warnings are overwhelming | Medium | Medium | Collapsible warnings, severity levels |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Deadline pressure (Dec 26) | High | Critical | Phased rollout, MVP first |
| Breaking existing workflows | Low | Critical | Backward compatibility, dual mode |
| Training burden for CDs | Medium | Medium | Documentation, video tutorials |

---

## 🧪 Testing Strategy

### Unit Tests

**Backend:**
- `generateTimeSlots()` - Correct slot count, times, indexes
- `findSlotConflicts()` - Detect overlaps, proximity conflicts
- `calculateDisplayOrder()` - Sequential ordering
- `scheduleRoutineToTimeSlot()` - Data validation, edge cases

**Frontend:**
- `TimelineGrid` - Renders correct number of slots
- `TimeSlotCell` - Handles drag-and-drop events
- `formatTime()` - Correct 12-hour display

### Integration Tests

- Drag routine from pool → Timeline grid → Database update
- Move routine between time slots → display_order update
- Schedule overlapping routines → Conflict detection fires
- Switch view modes → Studio codes/names update

### E2E Tests (Playwright MCP)

**Test Scenarios:**

1. **Schedule Routine at Specific Time**
   ```gherkin
   Given I am on the scheduling page
   When I drag "Ballet Solo - Age 8" to Saturday 9:15 AM
   Then the routine appears at exactly 9:15 AM
   And the database shows performance_time = "09:15:00"
   ```

2. **Detect Time Conflicts**
   ```gherkin
   Given "Dancer A" is in "Routine 1" at 9:15 AM
   When I schedule "Routine 2" with "Dancer A" at 9:20 AM
   Then a conflict warning appears
   And the warning shows "Dancer A in 2 routines within 5 minutes"
   ```

3. **Reorder Routines**
   ```gherkin
   Given "Routine 1" is at 9:15 AM
   When I drag "Routine 1" to 10:30 AM
   Then "Routine 1" moves to 10:30 AM
   And display_order is recalculated
   ```

### Performance Tests

**Metrics:**
- Timeline grid renders in < 500ms with 100 routines
- Drag-and-drop responds in < 100ms
- Conflict detection completes in < 200ms
- Database queries execute in < 50ms

**Load Test:**
- 200 routines across 3 days
- 6 sessions (2 per day)
- 10 simultaneous CD operations

---

## 📚 Reference Documents

**Related Specs:**
- `SCHEDULING_SPEC_V4_UNIFIED.md` - Overall scheduling requirements
- `SCHEDULING_ARCHITECTURE.md` - System architecture
- `PHASE1_SPEC.md` - Registration phase spec

**Related Components:**
- `TimelineHeader.tsx` - Session header display
- `ScheduleToolbar.tsx` - Scheduling controls
- `FilterPanel.tsx` - Routine filtering
- `TrophyHelperPanel.tsx` - Award recommendations

**Database Schema:**
- `prisma/schema.prisma` - Full schema definition
- `competition_sessions` table - Session data
- `competition_entries` table - Routine data

---

## 🎯 Success Metrics

**User Experience:**
- CD can schedule 100 routines in < 30 minutes
- 90% reduction in scheduling errors
- Zero time-zone related bugs
- < 5% conflict resolution time

**Technical Performance:**
- Page load time < 2 seconds
- Drag-and-drop latency < 100ms
- Database query time < 50ms
- Zero data loss during migration

**Business Impact:**
- Schedule creation 2x faster than manual Excel
- Conflict detection catches 100% of proximity issues
- CD confidence in system increases to 90%+
- Zero production incidents related to scheduling

---

## 📅 Implementation Timeline

```
Session 58 (Week 1)
├─ Day 1: Backend foundation
│  ├─ Create tRPC procedures
│  ├─ Implement time slot generation
│  └─ Add database indexes
└─ Day 2: Testing
   └─ Unit tests for backend logic

Session 59 (Week 2)
├─ Day 1: Frontend components
│  ├─ Create TimelineGrid
│  ├─ Create TimeSlotCell
│  └─ Update TimelineHeader
└─ Day 2: Testing
   └─ Component tests

Session 60 (Week 3)
├─ Day 1: Integration
│  └─ Wire up page.tsx
└─ Day 2: E2E testing & Polish
   ├─ Playwright tests
   ├─ Performance optimization
   └─ UX polish
```

**Deadline:** December 26, 2025
**Buffer:** 1 week for unexpected issues

---

**Document Status:** ✅ Complete
**Next Action:** Review with team, begin Session 58 implementation
**Owner:** Development Team
**Reviewers:** Product, QA, UX
