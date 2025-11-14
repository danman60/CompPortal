# Scheduling Suite V4 - Unified Specification

**Date:** November 14, 2025
**Version:** 4.0 (Unified)
**Phase:** Phase 2A - Manual Scheduling MVP
**Deadline:** December 26, 2025

---

## Document Purpose

This unified specification combines:
1. Requirements from Nov 11 meeting with Selena/Emily (SCHEDULING_SUITE_REQUIREMENTS.md)
2. Locked architecture decisions (SCHEDULING_DECISIONS_LOCKED.md)
3. Technical architecture (SCHEDULING_ARCHITECTURE.md)
4. UI/UX patterns from v4 mockup iterations (Session 46 feedback)

**This is the SINGLE SOURCE OF TRUTH for scheduling implementation.**

---

## Executive Summary

**System Type:** Manual drag-and-drop scheduling system with intelligent conflict detection

**Primary Workflow:**
1. CD opens scheduling interface → 3-panel layout
2. Filters unscheduled routines by classification/age/genre
3. Drags routines from left panel to schedule grid (center)
4. System detects conflicts in real-time, shows dancer names
5. CD places award/break blocks manually using trophy helper
6. Schedule auto-renumbers in draft mode (locks on finalization)
7. Studios view their schedules only, can add notes/requests
8. CD manages requests, finalizes schedule (~1 month before event)

**Key Philosophy:** CD has full manual control. System assists with validation, not automation.

---

## 🎯 P0 Critical Requirements (MVP - Dec 26)

### 1. Manual Scheduling Interface ✅ CRITICAL

**3-Panel Layout:**
```
┌──────────────┬────────────────────────┬──────────────┐
│              │                        │              │
│  LEFT 25%    │     CENTER 50%         │  RIGHT 25%   │
│              │                        │              │
│ Unscheduled  │   Schedule Grid        │ Trophy       │
│ Routines     │   (Timeline View)      │ Helper       │
│ Pool         │                        │              │
│              │                        │              │
└──────────────┴────────────────────────┴──────────────┘
```

**LEFT Panel - Unscheduled Routines Pool:**
- **Header:** Competition name + date range from database
  - Example: "GLOW Blue Mountain Summer 2026" (June 4-7, 2026)
  - Query: `SELECT c.name, c.competition_start_date, c.competition_end_date FROM competitions c WHERE tenant_id = [glow_id]`
- **Filters Section:**
  - Classification (Emerald, Sapphire, Crystal, Titanium, Production)
  - Genre (Jazz, Contemporary, Tap, Ballet, Lyrical, Hip Hop, etc.)
  - Search input (by routine name, dancer name, studio)
  - "Clear Filters" button
- **Routine Cards:**
  - Half-width cards (2 columns)
  - Checkboxes for bulk selection
  - Draggable to schedule grid
  - Show: Title, Studio Code, Classification, Category Type, Dancer Count, Duration
  - Visual indicators: Conflicts (red), Age changes (yellow), Notes (blue dot)
  - NO "Unscheduled" badge (redundant - if in this panel, it's unscheduled)
- **Draggable Blocks:**
  - "🏆 +Award Block" (draggable)
  - "☕ +Break Block" (draggable)
  - CD can drag these directly to schedule
- **Panel Controls:**
  - Collapse button (◀)
  - Collapsed state: 50px thin bar with vertical rotated label

**CENTER Panel - Schedule Grid:**
- **Day Selector Tabs:**
  - Use actual competition dates from database
  - Example: "Thursday, June 4", "Friday, June 5", "Saturday, June 6", "Sunday, June 7"
  - Active tab highlighted (purple gradient)
- **View Mode Selector:**
  - CD View (default): Shows studio codes + full names
  - Studio Director View: ONLY their routines visible
  - Judge View: Full schedule, codes ONLY (no full names)
  - Public View: (After published) Full schedule, full names
- **Schedule Table:**
  - Columns: Entry #, Time, Title, Studio, Classification, Category, Dancers, Duration
  - **NEW COLUMN:** Classification (with subtle background colors per classification)
  - Classification colors (tenant-specific):
    - Emerald: `bg-green-50`
    - Sapphire: `bg-blue-50`
    - Crystal: `bg-gray-50`
    - Titanium: `bg-slate-50`
    - Production: `bg-purple-50`
  - Rows draggable (reorder within schedule)
  - Drag FROM schedule → unscheduled pool (bidirectional)
  - Drop zones between rows (insert at position)
- **Conflict Boxes:**
  - Red boxes spanning conflicting routines
  - Show dancer name + spacing count
  - Example: "⚠️ CONFLICT: Emma Smith (< 6 routines apart)"
  - **CRITICAL:** Filter by current day only (data-day attribute)
  - Do NOT persist across days
- **Panel Controls:**
  - Collapse button (▼)
  - Maximize button (⛶)
  - Maximized state: 100% width, other panels auto-collapse

**RIGHT Panel - Trophy Helper:**
- **Header:** "Trophy Helper"
- **Content:**
  - Last routine per overall category (Classification + Age Group + Category Type)
  - Show: Category name, Last routine #, Last routine time, Total routines, Suggested award time (+30 min)
  - Highlight last routines in main schedule (gold border + 🏆 icon)
- **Award Block Creation:**
  - When award block dragged to schedule, show recommendation from trophy helper
  - Based on session position (if previous session had last routine of category)
- **Panel Controls:**
  - Collapse button (▶)
  - Collapsed state: 50px thin bar with vertical label

**Top Toolbar:**
- **Status Badge:** Draft / Finalized / Published (color-coded: blue/orange/green)
- **Undo/Redo Controls:** ↶ ↷ buttons + Ctrl+Z / Ctrl+Y shortcuts
- **Auto-Generate Draft:** Button (optional workflow, lower priority P2)
- **Save Draft:** Auto-save + manual save button
- **Finalize Schedule:** Locks numbering (~1 month before event)
- **Publish Schedule:** Reveals full studio names

---

### 2. Conflict Detection System ✅ CRITICAL

**Rule:** Minimum 6 routines between any two routines featuring the same dancer

**Real-Time Detection:**
- Triggered on every drag-drop operation
- Check all dancers in routine being placed
- Compare against all scheduled routines
- Show conflicts IMMEDIATELY with dancer names

**Conflict Display:**
```
⚠️ CONFLICT: Sarah Johnson (< 6 routines apart)
Routine #102 (Small Group "Warriors")
Routine #105 (Duet "Dream Big")
Only 2 routines between (need 6 minimum)
```

**Severity Levels:**
- **Critical:** Back-to-back routines (0 between) → Red background, blocking warning
- **Error:** 1-3 routines between → Orange background, strong warning
- **Warning:** 4-5 routines between → Yellow background, soft warning

**Conflict Resolution:**
- CD can override conflicts (adds override_reason to database)
- Warning persists but allows placement
- Conflicts tracked in schedule_conflicts table
- Status: 'active' | 'resolved' | 'overridden'

**Implementation:**
```typescript
// Check minimum spacing for same dancer
async function detectConflicts(routineId: string, proposedOrder: number): Promise<Conflict[]> {
  const MIN_ROUTINES_BETWEEN = 6;
  const dancers = await getDancersInRoutine(routineId);
  const conflicts: Conflict[] = [];

  for (const dancer of dancers) {
    const otherRoutines = await getScheduledRoutinesForDancer(dancer.id);

    for (const other of otherRoutines) {
      const routinesBetween = Math.abs(proposedOrder - other.display_order) - 1;

      if (routinesBetween < MIN_ROUTINES_BETWEEN) {
        conflicts.push({
          dancerId: dancer.id,
          dancerName: `${dancer.first_name} ${dancer.last_name}`,
          routine1: routineId,
          routine2: other.id,
          routinesBetween,
          severity: routinesBetween === 0 ? 'critical' : routinesBetween <= 3 ? 'error' : 'warning',
        });
      }
    }
  }

  return conflicts;
}
```

---

### 3. Studio Code System (Single Letter Masking) ✅ CRITICAL

**Purpose:** Mask studio identity until schedule published

**Code Assignment:**
- Assigned on reservation approval (first come, first served)
- First approved studio: "A"
- Second approved studio: "B"
- Continue through alphabet

**Database Schema:**
```sql
ALTER TABLE studios
ADD COLUMN studio_code CHAR(1),
ADD COLUMN registration_order INT,
ADD COLUMN code_assigned_at TIMESTAMPTZ,
ADD COLUMN code_assigned_by UUID REFERENCES auth.users(id);
```

**Display Logic:**
- **CD View:** "Studio A (Starlight Dance Academy)"
- **Judge View:** "A" (code only, no "Studio" prefix)
- **Studio Director View:** Their full name only
- **Public View (after published):** Full names revealed

**Implementation:**
```typescript
async function assignStudioCode(studioId: string, competitionId: string): Promise<string> {
  const order = await prisma.reservations.count({
    where: {
      competition_id: competitionId,
      status: 'approved',
    },
  });

  const code = String.fromCharCode(65 + order); // 65 = 'A'

  await prisma.studios.update({
    where: { id: studioId },
    data: {
      studio_code: code,
      registration_order: order + 1,
      code_assigned_at: new Date(),
    },
  });

  return code;
}
```

---

### 4. State Machine (Draft/Finalized/Published) ✅ CRITICAL

**Three States:**

```typescript
type ScheduleStatus = 'not_started' | 'draft' | 'finalized' | 'published';

interface ScheduleState {
  competition_id: string;
  status: ScheduleStatus;
  finalized_at?: Date;
  finalized_by?: string; // user_id
  published_at?: Date;
  published_by?: string;
}
```

**State Behaviors:**

**Draft Mode:**
- Entry numbers auto-renumber on every move
- CD can drag/drop freely
- Studios can add notes/requests
- Conflicts detected in real-time
- Changes saved frequently

**Finalized Mode (Locks ~1 month before event):**
- Entry numbers LOCK to routines (no more auto-renumber)
- Studios can view schedule, download PDFs
- Studios can still add last-minute requests
- CD can make minor adjustments (times only, not reorder)
- Schedule visible to studios

**Published Mode (Live):**
- Studio codes → Full studio names revealed
- No more changes allowed
- Public view available (if CD enables)
- Event day execution mode

**Transitions:**
- `not_started` → `draft`: CD starts scheduling
- `draft` → `finalized`: CD clicks "Finalize Schedule"
- `finalized` → `published`: CD clicks "Publish Schedule"
- `finalized` → `draft`: CD can unlock (before publish only)
- `published` → LOCKED (no going back)

**Database:**
```sql
ALTER TABLE competitions
ADD COLUMN schedule_status VARCHAR(20) DEFAULT 'not_started',
ADD CONSTRAINT schedule_status_check
  CHECK (schedule_status IN ('not_started', 'draft', 'finalized', 'published'));
```

---

### 5. Schedule Blocks (Awards & Breaks) - Functional ✅ CRITICAL

**Block Types:**
1. Award Blocks (purple background)
2. Break Blocks (gray background)

**Award Blocks:**
- Custom title (e.g., "Solo Overall Awards - Ages 7-9")
- Duration selector: 15, 30, 45, 60 minutes
- Linked to overall_category (from trophy helper)
- Draggable from toolbar to schedule
- When dropped, show trophy helper recommendation:
  - "Award Block: Last routine of this category was Routine #145 at 3:30 PM. Recommended award time: 4:00 PM."

**Break Blocks:**
- Custom text (e.g., "Lunch Break", "Tech Check", "Competition Photo")
- Duration selector: 15, 30, 45, 60, 90, 120 minutes (5-min increments)
- Draggable from toolbar to schedule
- After placement, CD can edit duration inline

**Time Rounding:**
- ALL block start times round to nearest 5-minute increment
- 8:47 AM → 8:45 AM
- 2:33 PM → 2:35 PM
- 11:52 AM → 11:50 AM

**Database Schema:**
```sql
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('award', 'break')),
  title VARCHAR(200) NOT NULL,
  duration_minutes INT NOT NULL,
  scheduled_start_time TIMESTAMPTZ,
  display_order INT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Implementation:**
```typescript
function roundToNearest5Minutes(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 5) * 5;
  const rounded = new Date(date);
  rounded.setMinutes(roundedMinutes);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}

async function placeBlock(blockId: string, targetTime: Date): Promise<void> {
  const roundedTime = roundToNearest5Minutes(targetTime);

  await prisma.schedule_blocks.update({
    where: { id: blockId },
    data: {
      scheduled_start_time: roundedTime,
      updated_at: new Date(),
    },
  });
}
```

---

## 🎯 P1 High-Priority Requirements (Before Dec 26)

### 6. Trophy Helper Report ✅ P1

**Purpose:** Show last routine per overall category to guide award block placement

**Overall Category Definition:**
- Category Type (solo, duet, small_group, large_group, production)
- Age Group (petite, mini, junior, teen, senior, adult, senior_plus)
- Classification (emerald, sapphire, crystal, titanium)
- **NOT based on genre**

**Trophy Helper Display:**
```
Overall Category             | Last Routine  | Time     | Total | Suggested Award Time
-----------------------------|---------------|----------|-------|--------------------
Solo - Mini - Emerald        | #142 "Dream"  | 11:30 AM | 15    | 12:00 PM (+30 min)
Duet - Junior - Sapphire     | #156 "Unity"  | 1:45 PM  | 8     | 2:15 PM (+30 min)
Small Group - Teen - Crystal | #189 "Fire"   | 4:15 PM  | 22    | 4:45 PM (+30 min)
```

**Visual Indicators:**
- Last routines highlighted in main schedule: Gold border + 🏆 icon
- Trophy helper updates in real-time as schedule changes

**Implementation:**
```typescript
interface TrophyHelperEntry {
  overall_category: string; // "solo-mini-emerald"
  category_display: string; // "Solo Ages 7-8 (Emerald)"
  last_routine_id: string;
  last_routine_number: number;
  last_routine_title: string;
  last_routine_time: Date;
  total_routines_in_category: number;
  suggested_award_time: Date; // last_routine_time + 30 minutes
}

async function generateTrophyHelper(competitionId: string): Promise<TrophyHelperEntry[]> {
  const scheduledRoutines = await getScheduledRoutines(competitionId);

  // Group by overall category
  const byCategory = groupBy(scheduledRoutines, r =>
    `${r.category_type}-${r.age_group}-${r.classification}`
  );

  // Find last routine in each category
  const entries: TrophyHelperEntry[] = [];

  for (const [categoryKey, routines] of Object.entries(byCategory)) {
    const sorted = sortBy(routines, 'scheduled_start_time');
    const last = sorted[sorted.length - 1];

    entries.push({
      overall_category: categoryKey,
      category_display: formatCategoryDisplay(categoryKey),
      last_routine_id: last.id,
      last_routine_number: last.display_order,
      last_routine_title: last.routine_name,
      last_routine_time: last.scheduled_start_time,
      total_routines_in_category: routines.length,
      suggested_award_time: addMinutes(last.scheduled_start_time, 30),
    });
  }

  return sortBy(entries, 'suggested_award_time');
}
```

---

### 7. Studio Feedback System (Request Management) ✅ P1

**Studio Portal - Schedule View:**
- Studios see ONLY their routines (no competitor info)
- Download PDF of their schedule
- Add notes/requests to specific routines
- Filter by date/session
- Example request: "Please schedule after 2pm - dancer has school"

**CD Portal - Request Management:**
- Centralized list view of all studio requests
- Columns: Studio, Routine, Request, Date, Status
- Filter by: Studio, Status (pending/completed/ignored), Date Range
- Actions: Mark Complete, Mark Ignored, View Routine
- Sort by: Date, Priority (CD can set)

**Database Schema:**
```sql
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('cd_private', 'studio_request', 'submission_note')),
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'ignored')),
  priority VARCHAR(10) CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Visual Indicators:**
- Routine cards with pending requests: Blue dot indicator
- Hover over routine: Show all notes (CD private, studio requests, submission notes)

---

### 8. Age Change Detection & Highlighting ✅ P1

**Problem:** Dancer birthdates can change after scheduling started, affecting age groups

**Detection:**
- Compare current age vs. age at scheduling start
- Highlight routines where age group changed
- Show old age vs. new age in details panel

**Visual Indicator:**
- Yellow background on routine card
- Warning icon (⚠️)
- Hover shows: "Age Changed: Mini (8.5) → Junior (9.2)"

**CD Actions:**
- Drag routine to correct age group section
- Mark age change as resolved
- Override (keep in current group)

**Database Schema:**
```sql
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  old_birthdate DATE NOT NULL,
  new_birthdate DATE NOT NULL,
  old_age_group VARCHAR(20) NOT NULL,
  new_age_group VARCHAR(20) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);
```

**Implementation:**
```typescript
async function detectAgeChanges(competitionId: string): Promise<AgeChangeEvent[]> {
  const scheduledRoutines = await prisma.competition_entries.findMany({
    where: {
      competition_id: competitionId,
      scheduled_start_time: { not: null },
      age_at_scheduling: { not: null },
    },
    include: {
      entry_participants: { include: { dancers: true } },
    },
  });

  const changes: AgeChangeEvent[] = [];

  for (const routine of scheduledRoutines) {
    const currentAgeResult = inferAgeGroup(
      routine.entry_participants.map(p => p.dancers),
      routine.classification
    );

    if (currentAgeResult && currentAgeResult.ageGroup !== routine.age_group) {
      // Age group changed - track it
      changes.push({
        routine_id: routine.id,
        old_age_group: routine.age_group,
        new_age_group: currentAgeResult.ageGroup,
        // ... other fields
      });
    }
  }

  return changes;
}
```

---

### 9. Routine Notes System (CD Private + Submission) ✅ P1

**Three Note Types:**
1. **CD Private Notes:** Only CD sees (internal notes like "VIP studio", "Check music quality")
2. **Studio Requests:** Studios ask for changes (visible to CD, tracked status)
3. **Submission Notes:** Notes from original entry submission (e.g., "Dancer has school conflict")

**CD Notes Panel:**
- Right sidebar shows all notes for selected routine
- CD can add/edit private notes
- See studio requests and submission notes
- Mark studio requests as completed/ignored

**Visual Display:**
- 📝 icon on routine card if CD notes exist
- Blue dot if studio requests pending
- Hover shows all notes

---

### 10. Multiple Schedule Views (Role-Based Filtering) ✅ P1

**View Selector Buttons (Top Toolbar):**
- CD View
- Studio Director View
- Judge View
- Public View (after published)

**View Matrix:**

| Role | Visibility | Studio Names | Notes Visible |
|------|-----------|--------------|---------------|
| **CD** | Full schedule | Codes + Full Names | All notes |
| **Studio Director** | Only their routines | Their full name | Their requests only |
| **Judge** | Full schedule | Codes ONLY (no full names) | No notes |
| **Public** | Full schedule (after published) | Full names revealed | No notes |

**Studio Director View - Critical Scoping:**
- STRICTLY scope to only their routines
- Filter: `WHERE reservation.studio_id = [current_studio_id]`
- Show routine number, time, title, dancers, category
- NO competitor routines visible
- Large gaps in time and routine numbers (expected)

**Judge View - Code Only Display:**
- Show: "A", "B", "C" (NOT "Studio A", "Studio B")
- Full schedule visible
- No hover details, no notes

**Implementation:**
```typescript
function getScheduleForView(competitionId: string, view: ViewMode, userId: string) {
  switch (view) {
    case 'cd':
      return getAllScheduledRoutines(competitionId);

    case 'studio_director':
      const studioId = getStudioIdForUser(userId);
      return getRoutinesForStudio(competitionId, studioId);

    case 'judge':
      return getAllScheduledRoutines(competitionId, { showCodesOnly: true });

    case 'public':
      if (!isSchedulePublished(competitionId)) {
        throw new Error('Schedule not published yet');
      }
      return getAllScheduledRoutines(competitionId, { showFullNames: true });
  }
}
```

---

### 11. Hotel Attrition Warnings ✅ P1

**Rule:** Warn if all Emerald (novice) routines on single day

**Reason:**
> "I would never do all novice in one day, and Emily would tell you for hotel pickup, never do that. It will screw you, and you'll end up with attrition." - Selena

**Warning Display:**
- During draft build (real-time)
- Finalization checklist (pre-lock)
- Trophy helper (context)

**Implementation:**
```typescript
function checkHotelAttrition(competitionId: string): Warning[] {
  const warnings: Warning[] = [];

  // Check if all Emerald routines on Day 1 only
  const emeraldRoutines = getRoutinesByClassification(competitionId, 'emerald');
  const emeraldDays = new Set(emeraldRoutines.map(r => r.day));

  if (emeraldDays.size === 1) {
    warnings.push({
      type: 'hotel_attrition',
      severity: 'warning',
      message: '⚠️ All Emerald (Novice) routines are on a single day. This may cause hotel attrition. Consider spreading across multiple days.',
    });
  }

  return warnings;
}
```

---

## 🎯 P2 Nice-to-Have Features (Phase 2B+)

### 12. Classification Grouping (Auto-Generation Option) ✅ P2

**Optional Workflow:** CD can choose auto-generation as starting point

**Auto-Generation Algorithm:**
1. Group routines by classification (Emerald, Sapphire, Crystal, Titanium)
2. Within each classification, group by age
3. Within each age, group by genre
4. Apply time-based session constraints (~3 hours per session)
5. Detect conflicts and show warnings

**Manual Override:**
- CD can still drag/drop to rearrange
- All conflict detection still applies
- Auto-generation just provides starting point

**Quote from Selena:**
> "I prefer to have control over the process. Manual scheduling rather than auto-generation."

**Priority:** Lower - Manual workflow is primary, auto is optional enhancement

---

### 13. Music Submission Tracking ✅ P2

**Deadline:** 30 days before event

**Features:**
- Track music submission status per routine
- Flag routines missing music as deadline approaches
- Send automated reminders at configurable intervals

**Database:**
```sql
ALTER TABLE competition_entries
ADD COLUMN music_submitted_at TIMESTAMPTZ,
ADD COLUMN music_file_url TEXT;
```

---

### 14. Automated Email Reminders ✅ P2

**Registration Deadline Reminders:**
- Staff sets deadlines and intervals via panel (no hard-coding)
- Automated emails at: 7 days, 3 days, 1 day before
- Emily and Selena to draft email text

**Implementation:**
- competition_settings table: Add email reminder configuration (JSON)
- Scheduled job checks deadlines daily
- Send emails via Mailgun

---

## 📊 Database Schema - Complete

### New Tables

#### schedule_blocks
```sql
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('award', 'break')),
  title VARCHAR(200) NOT NULL,
  duration_minutes INT NOT NULL,
  scheduled_start_time TIMESTAMPTZ,
  display_order INT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_blocks_competition ON schedule_blocks(competition_id, display_order);
```

#### schedule_conflicts
```sql
CREATE TABLE schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  routine_1_id UUID NOT NULL REFERENCES competition_entries(id),
  routine_2_id UUID NOT NULL REFERENCES competition_entries(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  dancer_name VARCHAR(200) NOT NULL, -- Denormalized for performance
  routines_between INT NOT NULL,
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('spacing_violation', 'back_to_back', 'same_time')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'overridden')),
  override_reason TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_conflicts_routines ON schedule_conflicts(routine_1_id, routine_2_id);
CREATE INDEX idx_schedule_conflicts_status ON schedule_conflicts(competition_id, status);
```

#### routine_notes
```sql
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('cd_private', 'studio_request', 'submission_note')),
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'ignored')),
  priority VARCHAR(10) CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routine_notes_routine ON routine_notes(routine_id, note_type, status);
```

#### age_change_tracking
```sql
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  old_birthdate DATE NOT NULL,
  new_birthdate DATE NOT NULL,
  old_age_group VARCHAR(20) NOT NULL,
  new_age_group VARCHAR(20) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_age_change_tracking_routine ON age_change_tracking(routine_id, resolved);
```

### Existing Table Updates

#### studios
```sql
ALTER TABLE studios
ADD COLUMN studio_code CHAR(1),
ADD COLUMN registration_order INT,
ADD COLUMN code_assigned_at TIMESTAMPTZ,
ADD COLUMN code_assigned_by UUID REFERENCES auth.users(id);

CREATE INDEX idx_studios_code ON studios(studio_code);
```

#### reservations
```sql
ALTER TABLE reservations
ADD COLUMN waiver_accepted_at TIMESTAMPTZ,
ADD COLUMN waiver_version VARCHAR(50);
```

#### competition_entries (routines)
```sql
ALTER TABLE competition_entries
ADD COLUMN scheduled_start_time TIMESTAMPTZ,
ADD COLUMN display_order INT,
ADD COLUMN age_at_scheduling DECIMAL(4,2),
ADD COLUMN last_age_check TIMESTAMPTZ,
-- Denormalized for performance
ADD COLUMN dancer_names TEXT[],
ADD COLUMN conflict_count INT DEFAULT 0,
ADD COLUMN has_studio_requests BOOLEAN DEFAULT FALSE,
ADD COLUMN has_cd_notes BOOLEAN DEFAULT FALSE,
ADD COLUMN age_changed BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_competition_entries_scheduled ON competition_entries(competition_id, scheduled_start_time) WHERE scheduled_start_time IS NOT NULL;
CREATE INDEX idx_competition_entries_display_order ON competition_entries(competition_id, display_order) WHERE display_order IS NOT NULL;
```

#### competitions
```sql
ALTER TABLE competitions
ADD COLUMN schedule_status VARCHAR(20) DEFAULT 'not_started' CHECK (schedule_status IN ('not_started', 'draft', 'finalized', 'published')),
ADD COLUMN schedule_finalized_at TIMESTAMPTZ,
ADD COLUMN schedule_finalized_by UUID REFERENCES auth.users(id),
ADD COLUMN schedule_published_at TIMESTAMPTZ,
ADD COLUMN schedule_published_by UUID REFERENCES auth.users(id);
```

---

## 🔧 tRPC Procedures - Complete List

### Scheduling Operations
```typescript
// Get all routines for scheduling
schedulingRouter.getRoutines = protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Returns: scheduledRoutines[], unscheduledRoutines[]
  });

// Schedule routine at position
schedulingRouter.scheduleRoutine = protectedProcedure
  .input(z.object({
    routineId: z.string().uuid(),
    position: z.number(),
    startTime: z.date(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Update routine: scheduled_start_time, display_order
    // 2. Renumber subsequent routines
    // 3. Detect conflicts
    // 4. Return updated schedule + conflicts
  });

// Move routine within schedule
schedulingRouter.moveRoutine = protectedProcedure
  .input(z.object({
    routineId: z.string().uuid(),
    newPosition: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Update display_order
    // 2. Renumber (if draft mode)
    // 3. Detect conflicts
  });

// Unschedule routine (drag back to pool)
schedulingRouter.unscheduleRoutine = protectedProcedure
  .input(z.object({ routineId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Set scheduled_start_time = NULL, display_order = NULL
    // 2. Renumber remaining routines
    // 3. Clear conflicts for this routine
  });
```

### Conflict Detection
```typescript
// Detect all conflicts
schedulingRouter.detectConflicts = protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Returns: { conflicts: Conflict[], summary: { critical, errors, warnings } }
  });

// Override conflict
schedulingRouter.overrideConflict = protectedProcedure
  .input(z.object({
    conflictId: z.string().uuid(),
    reason: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Update conflict: status = 'overridden', override_reason
  });
```

### Schedule Blocks
```typescript
// Create award block
schedulingRouter.createAwardBlock = protectedProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    title: z.string(),
    durationMinutes: z.number(),
    metadata: z.object({
      overall_category: z.string().optional(),
    }).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Create schedule_block (block_type = 'award')
  });

// Create break block
schedulingRouter.createBreakBlock = protectedProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    title: z.string(),
    durationMinutes: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Create schedule_block (block_type = 'break')
  });

// Place block at position
schedulingRouter.placeBlock = protectedProcedure
  .input(z.object({
    blockId: z.string().uuid(),
    targetTime: z.date(),
    displayOrder: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Round targetTime to nearest 5 minutes
    // 2. Update block: scheduled_start_time, display_order
  });
```

### Trophy Helper
```typescript
// Generate trophy helper report
schedulingRouter.getTrophyHelper = protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Returns: TrophyHelperEntry[] (last routine per category)
  });
```

### Routine Notes
```typescript
// Add CD private note
schedulingRouter.addCdNote = protectedProcedure
  .input(z.object({
    routineId: z.string().uuid(),
    content: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Create routine_note (note_type = 'cd_private')
  });

// Add studio request
schedulingRouter.addStudioRequest = protectedProcedure
  .input(z.object({
    routineId: z.string().uuid(),
    content: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Create routine_note (note_type = 'studio_request')
  });

// Get all studio requests (CD view)
schedulingRouter.getStudioRequests = protectedProcedure
  .input(z.object({
    competitionId: z.string().uuid(),
    filters: z.object({
      status: z.enum(['pending', 'completed', 'ignored']).optional(),
      studioId: z.string().uuid().optional(),
    }).optional(),
  }))
  .query(async ({ ctx, input }) => {
    // Returns: RoutineNote[] (note_type = 'studio_request')
  });

// Update request status
schedulingRouter.updateRequestStatus = protectedProcedure
  .input(z.object({
    noteId: z.string().uuid(),
    status: z.enum(['completed', 'ignored']),
  }))
  .mutation(async ({ ctx, input }) => {
    // Update routine_note: status, updated_at
  });
```

### State Machine
```typescript
// Finalize schedule
schedulingRouter.finalizeSchedule = protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: No critical conflicts
    // 2. Lock entry numbers (no more auto-renumber)
    // 3. Update competition: schedule_status = 'finalized'
  });

// Publish schedule
schedulingRouter.publishSchedule = protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: Status must be 'finalized'
    // 2. Update competition: schedule_status = 'published'
    // 3. Reveal full studio names
  });

// Unlock schedule (finalized → draft)
schedulingRouter.unlockSchedule = protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Update competition: schedule_status = 'draft'
  });
```

### Studio Code Assignment
```typescript
// Assign studio code on reservation approval
reservationRouter.approveReservation = protectedProcedure
  .input(z.object({ reservationId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Approve reservation
    // 2. Call assignStudioCode(studioId, competitionId)
    // 3. Return updated reservation + studio_code
  });
```

### Age Change Detection
```typescript
// Detect age changes
schedulingRouter.detectAgeChanges = protectedProcedure
  .input(z.object({ competitionId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Returns: AgeChangeEvent[]
  });

// Resolve age change
schedulingRouter.resolveAgeChange = protectedProcedure
  .input(z.object({
    changeId: z.string().uuid(),
    action: z.enum(['reassigned', 'confirmed_correct', 'ignored']),
  }))
  .mutation(async ({ ctx, input }) => {
    // Update age_change_tracking: resolved = true, resolution_action
  });
```

---

## 🎨 React Component Structure

```
src/app/dashboard/director-panel/schedule/
├── page.tsx                          # Main scheduling page
├── components/
│   ├── SchedulingLayout.tsx          # 3-panel container with DnD context
│   ├── ScheduleToolbar.tsx           # Top controls (status, actions, view toggle)
│   │
│   ├── LeftPanel/
│   │   ├── UnscheduledPanel.tsx      # Left panel container
│   │   ├── CompetitionHeader.tsx     # Competition name + dates
│   │   ├── FilterPanel.tsx           # Classification, Genre, Search filters
│   │   ├── DraggableBlocks.tsx       # Award/Break block buttons
│   │   ├── RoutinePool.tsx           # Unscheduled routine cards
│   │   └── RoutineCard.tsx           # Individual routine card (draggable)
│   │
│   ├── CenterPanel/
│   │   ├── ScheduleGrid.tsx          # Center panel container
│   │   ├── DaySelector.tsx           # Day tabs (actual dates)
│   │   ├── ViewModeSelector.tsx      # CD/Studio/Judge/Public
│   │   ├── ScheduleTable.tsx         # Main schedule table
│   │   ├── ScheduleRow.tsx           # Routine row (draggable, droppable)
│   │   ├── ConflictOverlay.tsx       # Red conflict boxes
│   │   └── DropZone.tsx              # Drop target between rows
│   │
│   ├── RightPanel/
│   │   ├── TrophyHelper.tsx          # Right panel container
│   │   ├── CategorySection.tsx       # Last routine per category
│   │   └── AwardRecommendation.tsx   # Suggested award time
│   │
│   └── Modals/
│       ├── CreateAwardBlockModal.tsx # Award block creation
│       ├── CreateBreakBlockModal.tsx # Break block creation
│       ├── ConflictDetailsModal.tsx  # Conflict override
│       └── FinalizeConfirmModal.tsx  # Finalization confirmation
│
├── hooks/
│   ├── useScheduling.ts              # Main scheduling state (Zustand)
│   ├── useConflicts.ts               # Conflict detection
│   ├── useTrophyHelper.ts            # Trophy helper data
│   └── useFilters.ts                 # Filter state
│
└── utils/
    ├── conflictDetection.ts          # Client-side conflict checking
    ├── timeRounding.ts               # Round to 5-minute increments
    └── categoryGrouping.ts           # Group routines by category

src/app/dashboard/director-panel/studio-requests/
├── page.tsx                          # CD request management list
└── components/
    ├── RequestList.tsx               # List view
    ├── RequestFilters.tsx            # Filter by studio/status
    └── RequestRow.tsx                # Individual request row

src/app/dashboard/studio/schedule/
├── page.tsx                          # Studio schedule view
└── components/
    ├── StudioSchedule.tsx            # Schedule (only their routines)
    ├── RoutineCard.tsx               # Read-only routine card
    └── AddNoteButton.tsx             # Add studio request
```

---

## 🚀 Implementation Roadmap

### Week 1 (Nov 18-22): Foundation + Database
- [ ] Database migrations (all 4 new tables + existing table updates)
- [ ] Studio code assignment logic (on reservation approval)
- [ ] tRPC procedures: Basic CRUD (getRoutines, scheduleRoutine, moveRoutine)
- [ ] React page structure: 3-panel layout with @dnd-kit setup
- [ ] Left panel: Unscheduled routines pool + filters

**Deliverables:**
- Can drag routines from pool to schedule (basic placement)
- Filters work (classification, genre, search)
- Database schema complete

---

### Week 2 (Nov 25-29): Core Scheduling Features
- [ ] Conflict detection algorithm (backend + frontend)
- [ ] Trophy helper generation (last routine per category)
- [ ] Award/break block creation + placement
- [ ] Time rounding logic (5-minute increments)
- [ ] Day selector tabs (actual competition dates)
- [ ] Auto-renumbering in draft mode

**Deliverables:**
- Conflict warnings show dancer names
- Trophy helper displays last routines
- Award/break blocks draggable and functional
- Schedule grid shows classification colors

---

### Week 3 (Dec 2-6): Studio Integration + Views
- [ ] View mode switching (CD/Studio/Judge/Public)
- [ ] Studio portal schedule view (only their routines)
- [ ] Studio request system (add notes/requests)
- [ ] CD request management list (mark completed/ignored)
- [ ] Row-level security policies (RLS)

**Deliverables:**
- Studios can view their schedules and add requests
- CD can manage all studio requests in one list
- Judge view shows codes only
- Studio view strictly scoped (no competitor info)

---

### Week 4 (Dec 9-13): Polish + State Machine
- [ ] State machine (Draft/Finalized/Published)
- [ ] Finalize schedule button (locks numbers)
- [ ] Publish schedule button (reveals names)
- [ ] Age change detection + highlighting
- [ ] Routine notes UI (CD private, studio requests, submission notes)
- [ ] Conflict override modal (with reason)
- [ ] Panel collapse/maximize controls

**Deliverables:**
- Can finalize schedule → numbers lock
- Can publish schedule → studio names revealed
- Age changes highlighted in yellow
- Conflict warnings fully functional with override

---

### Week 5 (Dec 16-20): Testing + Bug Fixes
- [ ] End-to-end testing on BOTH tenants (EMPWR + Glow)
- [ ] Multi-tenant isolation verification
- [ ] Performance optimization (caching, indexes)
- [ ] Hotel attrition warnings
- [ ] Undo/Redo system (10-step history)
- [ ] Auto-save + manual save

**Deliverables:**
- All P0 features tested on production
- No cross-tenant leaks
- Performance acceptable (<2s for conflict detection)

---

### Week 6 (Dec 23-26): Final Push + Launch
- [ ] Liability waiver integration (Dec 23 deadline)
- [ ] Final bug fixes from testing
- [ ] Documentation updates
- [ ] User training materials (video walkthrough)
- [ ] Deploy to production

**Launch: December 26, 2025** ✅

---

## 📋 Testing Checklist

### Manual Scheduling
- [ ] Drag routine from pool to schedule → places correctly
- [ ] Drag routine within schedule → reorders and renumbers (draft mode)
- [ ] Drag routine from schedule to pool → unschedules correctly
- [ ] Checkboxes work for bulk selection
- [ ] Half-width cards display all info correctly

### Filters
- [ ] Classification filter → shows only matching routines
- [ ] Genre filter → shows only matching routines
- [ ] Search input → filters by routine name, dancer name, studio
- [ ] Multiple filters → shows intersection (AND logic)
- [ ] Clear Filters button → resets all filters

### Conflict Detection
- [ ] Place routines with same dancer 5 apart → shows warning
- [ ] Place routines with same dancer 6+ apart → no warning
- [ ] Warning shows dancer name clearly
- [ ] Warning shows both routine numbers
- [ ] Override conflict → warning persists but allows placement
- [ ] Conflict boxes span correct routines (red overlay)
- [ ] Conflict boxes filter by current day only

### Studio Codes
- [ ] First approved studio gets "A"
- [ ] Second approved studio gets "B"
- [ ] CD view shows "Studio A (Full Name)"
- [ ] Judge view shows "A" (code only, no "Studio" prefix)
- [ ] Studio view shows their full name only

### Schedule Blocks
- [ ] Create award block → appears as draggable
- [ ] Drag award block to schedule → places correctly
- [ ] Award block shows trophy helper recommendation on drop
- [ ] Create break block → appears as draggable
- [ ] Drag break block to schedule → places correctly
- [ ] Break duration editable after placement
- [ ] Block start times round to nearest 5 minutes

### Trophy Helper
- [ ] Generate report → shows last routine per category
- [ ] Last routines highlighted on schedule (gold border + 🏆)
- [ ] Report updates when schedule changes
- [ ] Suggested award time = last routine time + 30 minutes
- [ ] Categories grouped by: Category Type + Age Group + Classification (NOT genre)

### Studio Feedback
- [ ] Studio adds note to routine → saves correctly
- [ ] CD sees note in request list
- [ ] CD marks request complete → updates status
- [ ] CD marks request ignored → updates status
- [ ] Hover over routine → shows studio notes
- [ ] Blue dot indicator appears on routines with pending requests

### State Machine
- [ ] Draft mode: Numbers auto-renumber on drag
- [ ] Finalize schedule → numbers lock
- [ ] Finalized mode: Can't reorder, can adjust times
- [ ] Publish schedule → studio names revealed
- [ ] Published mode: No changes allowed
- [ ] Unlock schedule (finalized → draft) works

### View Modes
- [ ] CD view: Full schedule, codes + full names
- [ ] Studio view: ONLY their routines, NO competitors
- [ ] Judge view: Full schedule, codes ONLY (no "Studio" prefix)
- [ ] Public view: (After published) Full names revealed

### Age Change Detection
- [ ] Change dancer birthdate → routine highlights yellow
- [ ] Hover shows old age vs. new age
- [ ] CD can drag to correct age group
- [ ] Mark age change as resolved → removes highlight

### Panel Controls
- [ ] Left panel collapse → shrinks to 50px thin bar
- [ ] Center panel maximize → expands to 100%, others collapse
- [ ] Right panel collapse → shrinks to 50px thin bar
- [ ] Click maximize again → restores default layout

### Multi-Tenant Isolation
- [ ] EMPWR CD can't see Glow routines
- [ ] Glow CD can't see EMPWR routines
- [ ] Studio A on EMPWR can't see Studio B on Glow
- [ ] All queries filtered by tenant_id

---

## 🔐 Security & Access Control

### Row-Level Security (RLS) Policies

```sql
-- schedule_blocks: CD can CRUD their tenant's blocks
CREATE POLICY schedule_blocks_cd_access ON schedule_blocks
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role = 'competition_director'
    )
  );

-- routine_notes: Studios can only add/view their own requests
CREATE POLICY routine_notes_studio_access ON routine_notes
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      -- CD sees all notes
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND role = 'competition_director'
      )
      OR
      -- Studio sees only their requests
      (
        note_type = 'studio_request'
        AND author_id = auth.uid()
      )
    )
  );

-- schedule_conflicts: CD only
CREATE POLICY schedule_conflicts_cd_only ON schedule_conflicts
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role = 'competition_director'
    )
  );
```

---

## 📚 Reference Documents

**This Spec Replaces:**
- SCHEDULING_SUITE_REQUIREMENTS.md (Nov 11)
- SCHEDULING_DECISIONS_LOCKED.md (Nov 11)
- SCHEDULING_ARCHITECTURE.md (Nov 11)
- SCHEDULING_CHANGES_FROM_DEMO.md (Nov 11)
- All v4 mockup feedback from Session 46

**Related Specs:**
- `docs/specs/PHASE1_SPEC.md` - Phase 1 registration system
- `docs/specs/MASTER_BUSINESS_LOGIC.md` - 4-phase system overview

---

## ✅ Success Criteria

**Phase 2A Complete When:**
1. ✅ Selena can manually schedule entire competition via drag-and-drop
2. ✅ Conflict detection warns about spacing violations with dancer names
3. ✅ Studio codes mask identity until published
4. ✅ Award and break blocks can be placed manually
5. ✅ Studios can submit notes/requests, CD can manage them
6. ✅ Age changes are detected and highlighted
7. ✅ Trophy helper report shows last routine per category
8. ✅ Schedule can be finalized (locks numbering) and published (reveals names)
9. ✅ View modes work correctly (CD/Studio/Judge/Public)
10. ✅ All P0 features tested on BOTH tenants (EMPWR + Glow)

---

**Document Status:** ✅ UNIFIED SPEC COMPLETE
**Next Action:** Begin Week 1 implementation (database migrations + foundation)
**Review Scheduled:** Demo with Selena (TBD - targeting Dec 13-14)
