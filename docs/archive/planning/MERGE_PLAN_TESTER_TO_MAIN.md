# Merge Plan: Tester → Main (Schedule V2)

**Created:** 2025-12-06
**Status:** PLANNING - Awaiting Approval
**Scope:** Schedule V2 system only (no other tester-specific changes)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Files to Add** | 42 new files |
| **Files to Replace** | 3 files (full replacement) |
| **Files to Modify** | 8 files (partial changes) |
| **New Tables** | 6 Prisma models |
| **New Columns** | 18 columns across 3 tables |
| **Lines Added** | ~15,000 lines |

---

## Phase 1: Database Schema Migration

### 1.1 New Tables (6 models)

Create migration file: `prisma/migrations/[timestamp]_schedule_v2/migration.sql`

```sql
-- 1. day_start_times - Per-day start times for scheduling
CREATE TABLE day_start_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME DEFAULT '08:00:00'::time,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, competition_id, date)
);
CREATE INDEX idx_day_start_times_competition ON day_start_times(competition_id, date);

-- 2. schedule_blocks - Break/award blocks
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  competition_id UUID NOT NULL,
  block_type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL,
  scheduled_time TIMESTAMP,
  schedule_day DATE,
  sort_order INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. routine_notes - SD/CD notes on routines
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entry_id UUID NOT NULL,
  note_type VARCHAR(50) NOT NULL,
  note_text TEXT NOT NULL,
  is_internal BOOLEAN,
  priority VARCHAR(50),
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. age_change_tracking - Track dancer age changes during scheduling
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  competition_id UUID NOT NULL,
  dancer_id UUID NOT NULL,
  dancer_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  original_age INT NOT NULL,
  new_age INT NOT NULL,
  change_date DATE NOT NULL,
  age_group_before VARCHAR(100),
  age_group_after VARCHAR(100),
  affected_entry_ids UUID[],
  requires_rescheduling BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. schedule_conflict_overrides - CD-approved conflicts
CREATE TABLE schedule_conflict_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  routine_1_id UUID NOT NULL,
  routine_2_id UUID NOT NULL,
  override_reason TEXT NOT NULL,
  overridden_by_user_id UUID NOT NULL,
  overridden_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(dancer_id, routine_1_id, routine_2_id, tenant_id)
);

-- 6. schedule_versions - Version management for review workflow
CREATE TABLE schedule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sent_by_user_id UUID REFERENCES users(id),
  feedback_window_days INT,
  routine_count INT,
  notes_count INT,
  responding_studios_count INT,
  total_studios_count INT,
  snapshot_data JSONB,
  major_version INT DEFAULT 1,
  minor_version INT DEFAULT 1,
  is_published_to_studios BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, competition_id, version_number)
);
CREATE INDEX idx_schedule_versions_competition ON schedule_versions(competition_id);
CREATE INDEX idx_schedule_versions_status ON schedule_versions(status);
CREATE INDEX idx_schedule_versions_deadline ON schedule_versions(deadline);

-- 7. schedule_version_snapshots - Routine snapshots per version
CREATE TABLE schedule_version_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES schedule_versions(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  entry_number INT,
  scheduled_day DATE,
  performance_time TIME,
  scheduling_notes TEXT,
  has_studio_requests BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_snapshots_version ON schedule_version_snapshots(version_id);
CREATE INDEX idx_snapshots_entry ON schedule_version_snapshots(entry_id);
```

### 1.2 Column Additions

**competition_entries (10 new columns):**
```sql
ALTER TABLE competition_entries ADD COLUMN schedule_zone VARCHAR(20);
ALTER TABLE competition_entries ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN display_order INT;
ALTER TABLE competition_entries ADD COLUMN age_at_scheduling DECIMAL(4,2);
ALTER TABLE competition_entries ADD COLUMN dancer_names TEXT[] DEFAULT '{}';
ALTER TABLE competition_entries ADD COLUMN conflict_count INT DEFAULT 0;
ALTER TABLE competition_entries ADD COLUMN conflicts_with_entry_ids UUID[] DEFAULT '{}';
ALTER TABLE competition_entries ADD COLUMN has_studio_requests BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN has_cd_notes BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN age_changed BOOLEAN DEFAULT FALSE;
ALTER TABLE competition_entries ADD COLUMN version_created INT DEFAULT 0;
ALTER TABLE competition_entries ADD COLUMN version_last_modified INT DEFAULT 0;
ALTER TABLE competition_entries ADD COLUMN sd_note_version INT;
```

**competitions (6 new columns):**
```sql
ALTER TABLE competitions ADD COLUMN schedule_feedback_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE competitions ADD COLUMN schedule_hidden_studios TEXT[] DEFAULT '{}';
ALTER TABLE competitions ADD COLUMN schedule_state VARCHAR(20) DEFAULT 'draft';
ALTER TABLE competitions ADD COLUMN schedule_finalized_at TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN schedule_finalized_by UUID;
ALTER TABLE competitions ADD COLUMN schedule_published_by UUID;
```

**studios (1 new column):**
```sql
ALTER TABLE studios ADD COLUMN studio_code VARCHAR(10);
CREATE INDEX idx_studios_studio_code ON studios(studio_code);
```

**reservations (1 new column):**
```sql
ALTER TABLE reservations ADD COLUMN studio_code VARCHAR(10);
```

---

## Phase 2: Prisma Schema Update

### 2.1 Update `prisma/schema.prisma`

**Replace entire file with tester version**, then run:
```bash
npx prisma generate
npm run type-check
```

### 2.2 Key Model Additions

From tester's schema.prisma:
- `day_start_times` model (lines 867-882)
- `schedule_blocks` model (lines 1903-1920)
- `routine_notes` model (lines 1922-1936)
- `age_change_tracking` model (lines 1938-1959)
- `schedule_conflict_overrides` model (lines 1961-1979)
- `schedule_versions` model (lines 1982-2013)
- `schedule_version_snapshots` model (lines 2015-2035)

### 2.3 Relation Updates

Add relations to existing models:
- `users` → `schedule_versions` (sent_by_user_id)
- `competitions` → `day_start_times`, `schedule_versions`
- `tenants` → all new tables
- `competition_entries` → `schedule_version_snapshots`
- `dancers` → `schedule_conflict_overrides`

---

## Phase 3: Backend Files

### 3.1 Replace (Full File Replacement)

| File | Main Lines | Tester Lines | Action |
|------|------------|--------------|--------|
| `src/server/routers/scheduling.ts` | 1,103 | 4,179 | **REPLACE** |
| `src/lib/scheduling.ts` | ~200 | ~319 | **REPLACE** |
| `src/lib/prisma.ts` | ~15 | ~21 | **REPLACE** (adds transaction timeout) |

### 3.2 New Files (Add)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/conflictAutoFix.ts` | 380 | Auto-fix conflict algorithms |
| `src/lib/StudioCodeService.ts` | 162 | Studio code assignment |
| `src/hooks/useOptimisticScheduling.ts` | 39 | Optimistic UI updates |

### 3.3 Modify (Merge Changes)

| File | Change Type | Details |
|------|-------------|---------|
| `src/lib/date-utils.ts` | **Bug fix** | UTC date handling (lines 70-82) |
| `src/lib/ageGroupCalculator.ts` | **Bug fix** | UTC age calculation (lines 20-28) |
| `src/server/routers/entry.ts` | **Minor** | +36 lines (scheduling fields) |
| `src/server/routers/studio.ts` | **Minor** | +47 lines (studio code) |

---

## Phase 4: Frontend Components

### 4.1 New Directory: `src/components/scheduling/`

**Create directory and add 18 files:**

| Component | Lines | Purpose |
|-----------|-------|---------|
| `DragDropProvider.tsx` | 1,115 | DnD context & state management |
| `ScheduleTable.tsx` | 1,339 | Main schedule grid view |
| `RoutinePool.tsx` | 803 | Unscheduled routines panel |
| `DayTabs.tsx` | 295 | Day navigation |
| `RoutineCard.tsx` | 278 | Draggable routine card |
| `ScheduleGrid.tsx` | 276 | Grid layout |
| `ScheduleRow.tsx` | 268 | Schedule row component |
| `RoutineTable.tsx` | 200 | Routine list table |
| `ManageStudioVisibilityModal.tsx` | 192 | Hide/show studios |
| `VersionIndicator.tsx` | 205 | Version status display |
| `StudioNoteModal.tsx` | 200 | SD note editor |
| `TimelineGrid.tsx` | 177 | Timeline layout |
| `SendToStudiosModal.tsx` | 155 | Publish to studios |
| `TimeSlotCell.tsx` | 110 | Time slot component |
| `DropIndicator.tsx` | 80 | Drop target indicator |
| `ScheduleStatusToggle.tsx` | 68 | Draft/tentative/final toggle |
| `TrophyTooltip.tsx` | 45 | Trophy helper tooltip |

### 4.2 New Root Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `ScheduleBlockCard.tsx` | ~200 | Break/award block display |
| `ScheduleBlockModal.tsx` | ~250 | Block editor modal |
| `ScheduleToolbar.tsx` | ~180 | Schedule toolbar actions |
| `ScheduleSavingProgress.tsx` | ~120 | Save progress indicator |
| `TrophyHelperPanel.tsx` | ~300 | Trophy helper suggestions |
| `FilterPanel.tsx` | ~200 | Routine filters |
| `DaySelector.tsx` | ~150 | Day selection dropdown |
| `TimelineHeader.tsx` | ~100 | Timeline header |
| `StudioRequestsPanel.tsx` | ~200 | Studio requests view |
| `AgeChangeWarning.tsx` | ~100 | Age change alert |
| `HotelAttritionBanner.tsx` | ~80 | Hotel block warning |
| `CDNoteModal.tsx` | ~150 | CD note editor |
| `ConflictOverrideModal.tsx` | ~180 | Override conflict modal |
| `AssignStudioCodesModal.tsx` | ~200 | Studio code assignment |
| `ResetAllConfirmationModal.tsx` | ~100 | Reset confirmation |
| `NuclearResetConfirmationModal.tsx` | ~120 | Full reset confirmation |
| `SchedulingManager.tsx` | ~400 | Main scheduling container |

### 4.3 Modified Components

| Component | Change |
|-----------|--------|
| `DancerCSVImport.tsx` | Minor changes |
| `RoutineCSVImport.tsx` | Minor changes |
| `rebuild/entries/EntryCreateFormV2.tsx` | Scheduling field support |
| `rebuild/entries/DancerSelectionSection.tsx` | UI improvements |
| `ui/Dialog.tsx` | New dialog component |

---

## Phase 5: Pages

### 5.1 New Pages (Add Directories)

**`src/app/dashboard/director-panel/schedule/`**
```
schedule/
└── page.tsx (2,527 lines) - Main CD scheduler
```

**`src/app/dashboard/director-panel/schedule-v2/`**
```
schedule-v2/
└── page.tsx (2,472 lines) - V2 variant (optional)
```

**`src/app/dashboard/schedules/`**
```
schedules/
├── page.tsx (264 lines) - Schedule list
└── [competitionId]/
    └── page.tsx (629 lines) - Schedule detail
```

### 5.2 Modified Pages

| Page | Change |
|------|--------|
| `src/app/dashboard/admin/digest/page.tsx` | New admin digest page |
| `src/app/dashboard/scheduling/page.tsx` | Updated scheduling entry point |

---

## Phase 6: Excluded Changes (Tester-Specific)

**DO NOT MERGE these tester-specific changes:**

| File | Reason |
|------|--------|
| `middleware.ts` | Contains tester.compsync.net tenant restriction |
| `scripts/create-tester-*.sql` | Test data scripts |
| `scripts/populate-*.js` | Test data population |
| All `BLOCKER_*.md` files | Session-specific docs |
| All `SESSION_*.md` files | Session-specific docs |
| All `SCHEDULE_*_TEST*.md` files | Test documentation |

---

## Merge Execution Steps

### Step 1: Create Migration
```bash
cd CompPortal
# Create consolidated migration from Phase 1 SQL
npx prisma migrate dev --name schedule_v2_system --create-only
# Review migration, then apply
npx prisma migrate deploy
```

### Step 2: Update Prisma Schema
```bash
# Copy tester's schema.prisma to main
cp ../CompPortal-tester/prisma/schema.prisma prisma/schema.prisma
# Generate Prisma client
npx prisma generate
```

### Step 3: Copy Backend Files
```bash
# Replace scheduling router
cp ../CompPortal-tester/src/server/routers/scheduling.ts src/server/routers/

# Replace lib files
cp ../CompPortal-tester/src/lib/scheduling.ts src/lib/
cp ../CompPortal-tester/src/lib/prisma.ts src/lib/

# Add new lib files
cp ../CompPortal-tester/src/lib/conflictAutoFix.ts src/lib/
cp ../CompPortal-tester/src/lib/StudioCodeService.ts src/lib/

# Add new hooks
cp ../CompPortal-tester/src/hooks/useOptimisticScheduling.ts src/hooks/
```

### Step 4: Apply Minor File Patches
```bash
# Merge date-utils.ts changes (UTC fixes)
# Merge ageGroupCalculator.ts changes (UTC fixes)
# Merge entry.ts changes (scheduling fields)
# Merge studio.ts changes (studio code)
```

### Step 5: Copy Frontend Components
```bash
# Create scheduling directory
mkdir -p src/components/scheduling

# Copy all scheduling components
cp ../CompPortal-tester/src/components/scheduling/*.tsx src/components/scheduling/

# Copy new root components
cp ../CompPortal-tester/src/components/ScheduleBlockCard.tsx src/components/
cp ../CompPortal-tester/src/components/ScheduleBlockModal.tsx src/components/
# ... (all root components from list)
```

### Step 6: Copy Pages
```bash
# Create schedule directory
mkdir -p src/app/dashboard/director-panel/schedule
cp ../CompPortal-tester/src/app/dashboard/director-panel/schedule/page.tsx src/app/dashboard/director-panel/schedule/

# Create schedules directory
mkdir -p "src/app/dashboard/schedules/[competitionId]"
cp ../CompPortal-tester/src/app/dashboard/schedules/page.tsx src/app/dashboard/schedules/
cp "../CompPortal-tester/src/app/dashboard/schedules/[competitionId]/page.tsx" "src/app/dashboard/schedules/[competitionId]/"
```

### Step 7: Build & Verify
```bash
npm run type-check
npm run build
```

---

## Post-Merge Verification Checklist

### Database
- [ ] All 6 new tables exist
- [ ] All indexes created
- [ ] RLS policies applied (if needed)
- [ ] tenant_id on all new tables

### Backend
- [ ] `npx prisma generate` succeeds
- [ ] `npm run type-check` passes
- [ ] `npm run build` passes
- [ ] scheduling router exports 50+ procedures

### Frontend
- [ ] Schedule page loads: `/dashboard/director-panel/schedule`
- [ ] Schedules list loads: `/dashboard/schedules`
- [ ] No console errors
- [ ] Drag-drop initializes

### Functional Tests
- [ ] Can drag routine to schedule
- [ ] Can add break block
- [ ] Conflicts detected
- [ ] Day tabs navigate
- [ ] Export PDF works
- [ ] Save version works

### Multi-Tenant
- [ ] EMPWR data isolated
- [ ] Glow data isolated
- [ ] No cross-tenant leakage

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Schema migration failure | HIGH | Test on backup database first |
| Type errors after schema change | MEDIUM | Run type-check before build |
| Missing component imports | MEDIUM | Check all imports in pages |
| Broken existing functionality | LOW | Run existing tests first |
| Performance regression | LOW | Transaction timeout increased |

---

## Rollback Plan

If merge fails:
```bash
# Revert to main
git checkout main
git reset --hard HEAD~1

# Rollback database migration
npx prisma migrate resolve --rolled-back [migration_name]
```

---

**Approval Required Before Execution**
