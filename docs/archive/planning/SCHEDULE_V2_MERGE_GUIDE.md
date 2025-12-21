# Schedule V2 Merge Guide: Tester → Main

**Created:** 2025-12-06
**Purpose:** Complete index of Schedule V2 system for merge preparation

---

## Branch Status

| Branch | Status | Key Info |
|--------|--------|----------|
| `tester` | 524 commits ahead of main | Contains all Schedule V2 |
| `main` | 19 commits not in tester | Partial payments, invoice fixes |

---

## 1. Backend Router (scheduling.ts)

**Location:** `src/server/routers/scheduling.ts`
**Size:** 4,179 lines

### Key Procedures

| Procedure | Purpose |
|-----------|---------|
| `getRoutines` | Fetch all schedulable routines |
| `getRoutinesByDay` | Day-filtered routine query |
| `getScheduleBlocks` | Break/award block retrieval |
| `createScheduleBlock` | Add break/award block |
| `deleteScheduleBlock` | Remove block |
| `updateRoutineSchedule` | Drag-drop position update |
| `bulkUpdateRoutineSchedule` | Multi-routine scheduling |
| `detectConflicts` | Dancer conflict detection |
| `getConflicts` | Current conflict retrieval |
| `exportSchedulePDF` | PDF generation |
| `exportScheduleExcel` | Excel generation |
| `autoScheduleSession` | Auto-schedule algorithm |
| `getTrophyHelper` | Top dancers suggestions |
| `saveVersion` | Version snapshot |
| `publishSchedule` | Finalize schedule |
| `getDayStartTimes` | Get per-day start times |
| `updateDayStartTime` | Set day start time |
| `getScheduleState` | Get schedule workflow state |
| `setScheduleState` | Update workflow state |

---

## 2. Frontend Pages

### Main CD Scheduler
**Path:** `src/app/dashboard/director-panel/schedule/page.tsx`
**Size:** 2,359 lines

### V2 Variant
**Path:** `src/app/dashboard/director-panel/schedule-v2/page.tsx`
**Size:** 2,472 lines

### Schedule List
**Path:** `src/app/dashboard/schedules/page.tsx`
**Size:** 211 lines

### Schedule Detail
**Path:** `src/app/dashboard/schedules/[id]/page.tsx`
**Size:** 629 lines

---

## 3. Components (`src/components/scheduling/`)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `DragDropProvider.tsx` | 1,115 | DnD context + state management |
| `ScheduleTable.tsx` | 1,339 | Main schedule grid view |
| `RoutinePool.tsx` | 803 | Unscheduled routines panel |
| `DayTabs.tsx` | 295 | Day navigation tabs |
| `RoutineCard.tsx` | 278 | Draggable routine component |
| `BreakBlockModal.tsx` | ~200 | Break/award block editor |
| `ConflictPopup.tsx` | ~150 | Conflict resolution UI |
| `TrophyHelper.tsx` | ~300 | Trophy suggestions panel |
| `VersionHistory.tsx` | ~250 | Version management UI |
| `ExportButtons.tsx` | ~150 | PDF/Excel export |
| `ScheduleHeader.tsx` | ~200 | Page header with actions |
| `DayColumn.tsx` | ~400 | Single day column |
| `TimeSlot.tsx` | ~150 | Time slot container |
| `DropZone.tsx` | ~200 | Drop target areas |
| `ConflictBadge.tsx` | ~100 | Conflict indicator |

---

## 4. Database Schema Changes

### New Tables

```sql
-- Break/award blocks
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  day_number INT NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  block_type VARCHAR(20) NOT NULL, -- 'break' | 'award' | 'custom'
  label VARCHAR(100),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Per-day start times
CREATE TABLE day_start_times (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  day_number INT NOT NULL,
  start_time TIME NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  UNIQUE(competition_id, day_number)
);

-- Version tracking
CREATE TABLE schedule_versions (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  version_number INT NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'draft' | 'tentative' | 'final'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

-- Full schedule snapshots
CREATE TABLE schedule_version_snapshots (
  id UUID PRIMARY KEY,
  version_id UUID REFERENCES schedule_versions(id),
  snapshot_data JSONB NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

-- SD notes on routines
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY,
  entry_id UUID REFERENCES competition_entries(id),
  note TEXT,
  version INT DEFAULT 1,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Accepted conflicts
CREATE TABLE schedule_conflict_overrides (
  id UUID PRIMARY KEY,
  entry_id UUID REFERENCES competition_entries(id),
  conflicting_entry_id UUID REFERENCES competition_entries(id),
  overridden_by UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Age changes during scheduling
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY,
  dancer_id UUID REFERENCES dancers(id),
  entry_id UUID REFERENCES competition_entries(id),
  old_age INT NOT NULL,
  new_age INT NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```

### competition_entries Additions

```sql
ALTER TABLE competition_entries ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN performance_date VARCHAR(10);
ALTER TABLE competition_entries ADD COLUMN performance_time VARCHAR(8);
ALTER TABLE competition_entries ADD COLUMN display_order INT;
ALTER TABLE competition_entries ADD COLUMN age_at_scheduling INT;
ALTER TABLE competition_entries ADD COLUMN dancer_names TEXT[] DEFAULT '{}';
ALTER TABLE competition_entries ADD COLUMN conflict_count INT DEFAULT 0;
ALTER TABLE competition_entries ADD COLUMN conflicts_with_entry_ids TEXT[] DEFAULT '{}';
ALTER TABLE competition_entries ADD COLUMN has_studio_requests BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN has_cd_notes BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN age_changed BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN version_created INT;
ALTER TABLE competition_entries ADD COLUMN version_last_modified INT;
ALTER TABLE competition_entries ADD COLUMN sd_note_version INT;
```

### competitions Additions

```sql
ALTER TABLE competitions ADD COLUMN schedule_state VARCHAR(20);
ALTER TABLE competitions ADD COLUMN schedule_finalized_at TIMESTAMP;
ALTER TABLE competitions ADD COLUMN schedule_finalized_by UUID;
ALTER TABLE competitions ADD COLUMN schedule_published_by UUID;
ALTER TABLE competitions ADD COLUMN schedule_feedback_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE competitions ADD COLUMN schedule_hidden_studios TEXT[] DEFAULT '{}';
```

---

## 5. Merge Strategy

### Recommended Approach: Feature Branch Merge

```bash
# 1. Create integration branch from main
git checkout main
git pull origin main
git checkout -b merge-schedule-v2

# 2. Merge tester into integration branch
git merge tester

# 3. Resolve conflicts (see below)

# 4. Test thoroughly

# 5. Merge to main
git checkout main
git merge merge-schedule-v2
git push origin main
```

### Expected Conflicts

| File | Reason | Resolution |
|------|--------|------------|
| `src/server/routers/invoice.ts` | Both branches modified | Keep main's partial payment fixes, merge tester's schedule export |
| `src/server/routers/reservation.ts` | Both branches modified | Preserve main's capacity logic, add tester's schedule hooks |
| `prisma/schema.prisma` | Both branches added fields | Combine all additions |
| `src/server/api/root.ts` | Router exports | Add `scheduling: schedulingRouter` |
| `package.json` | Dependencies | Merge both |
| `package-lock.json` | Dependencies | Regenerate after merge |

---

## 6. Pre-Merge Checklist

### Schema Migrations
- [ ] Create consolidated migration file
- [ ] Test migration on backup database first
- [ ] Apply schedule_blocks table
- [ ] Apply day_start_times table
- [ ] Apply schedule_versions table
- [ ] Apply schedule_version_snapshots table
- [ ] Apply routine_notes table
- [ ] Apply schedule_conflict_overrides table
- [ ] Apply age_change_tracking table
- [ ] Apply competition_entries columns
- [ ] Apply competitions columns

### Code Verification
- [ ] Run `npx prisma generate`
- [ ] Run `npm run type-check`
- [ ] Run `npm run build`
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Router Integration
- [ ] scheduling router exported in root.ts
- [ ] All procedures have tenant_id filter
- [ ] Access control checks present (CD+ only)

---

## 7. Post-Merge Verification

### Basic Functionality
- [ ] Schedule page loads (`/dashboard/director-panel/schedule`)
- [ ] Unscheduled routines appear in pool
- [ ] Day tabs navigate correctly
- [ ] Drag-drop works (pool → schedule)
- [ ] Drag-drop works (schedule → schedule)
- [ ] Drag-drop works (schedule → pool / unschedule)

### Blocks
- [ ] Break blocks can be added
- [ ] Award blocks can be added
- [ ] Blocks appear at correct times
- [ ] Blocks can be deleted
- [ ] Block times cascade correctly

### Conflicts
- [ ] Conflicts detected when dancer in multiple entries
- [ ] Conflict icons appear on affected entries
- [ ] Conflict popup shows details
- [ ] Conflicts can be overridden
- [ ] Override persists after refresh

### Versioning
- [ ] Save version creates snapshot
- [ ] Version history shows all saves
- [ ] Can revert to previous version
- [ ] Tentative state publishes to SDs
- [ ] Final state locks schedule

### Export
- [ ] PDF export generates correctly
- [ ] PDF contains all scheduled entries
- [ ] Excel export generates correctly
- [ ] Excel formatting correct

### Multi-Tenant
- [ ] Test on EMPWR tenant
- [ ] Test on Glow tenant
- [ ] No cross-tenant data leakage
- [ ] tenant_id on all new tables

---

## 8. Key Workflows

### Drag-Drop Flow
1. CD drags routine from RoutinePool
2. DragDropProvider tracks drag state
3. DropZone highlights valid drop targets
4. On drop, `updateRoutineSchedule` mutation fires
5. Backend updates entry with performance_date, performance_time, display_order
6. Conflict detection runs automatically
7. ScheduleTable re-renders with new position
8. Conflicts shown if any detected

### Conflict Detection Algorithm
1. Query all entries sharing dancers with dropped entry
2. For each related entry with performance_time set:
   - Calculate time overlap with buffer window
   - If overlap, add to conflicts_with_entry_ids
3. Update conflict_count on affected entries
4. Return conflict list for UI display

### Version Save Flow
1. CD clicks "Save Version"
2. Backend creates schedule_versions record
3. Backend snapshots all entry positions to schedule_version_snapshots
4. Version appears in VersionHistory panel
5. CD can click previous version to restore

---

## 9. Quick Reference

### Testing URLs
- EMPWR: `https://empwr.compsync.net/dashboard/director-panel/schedule`
- Glow: `https://glow.compsync.net/dashboard/director-panel/schedule`

### Key API Calls
```typescript
// Get all routines for scheduling
api.scheduling.getRoutines.useQuery({ competitionId })

// Update routine position
api.scheduling.updateRoutineSchedule.useMutation()

// Get conflicts
api.scheduling.getConflicts.useQuery({ competitionId })

// Add break block
api.scheduling.createScheduleBlock.useMutation()

// Export PDF
api.scheduling.exportSchedulePDF.useMutation()
```

### Important State
```typescript
// DragDropProvider context
{
  draggedEntry: Entry | null,
  isDragging: boolean,
  dropTargetDay: number | null,
  dropTargetTime: string | null,
}

// Schedule state (on competition)
schedule_state: 'draft' | 'tentative' | 'final'
```

---

**End of Guide**
