# Scheduling Suite Architecture - Technical Design

**Date:** November 11, 2025
**Phase:** Phase 2A - Manual Scheduling MVP
**Status:** Architecture Planning
**Deadline:** December 26, 2025

---

## 🏗️ Suite-Wide Architectural Changes

### Philosophy Shift: Manual Control vs. Auto-Generation

**Previous Approach (ABANDONED):**
- AI/algorithm generates optimal schedule automatically
- CD makes minor tweaks afterward
- Complex constraint satisfaction problem
- High risk of "wrong" schedules needing major rework

**New Approach (APPROVED):**
- CD has full manual control via drag-and-drop
- System provides smart assistance (conflict detection, filtering, warnings)
- No black-box algorithm
- CD builds schedule iteratively using proven manual workflow

**Why This Matters:**
> "If the system generates a bad schedule, I have to spend hours fixing it. With manual control, I build it right the first time using my proven method." - Selena

---

## 📐 System Architecture

### Three-Tier Scheduling System

```
┌─────────────────────────────────────────────────────────────┐
│                    TIER 1: Draft Mode                        │
│  - Routines unscheduled (in pool)                           │
│  - CD drags to build schedule                                │
│  - Entry numbers auto-renumber on every change              │
│  - Conflicts detected in real-time                          │
│  - Studios can add notes/requests                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 TIER 2: Finalized Mode                       │
│  - Schedule locked (~1 month before event)                  │
│  - Entry numbers fixed                                       │
│  - Studios can view schedule, download PDFs                 │
│  - Studios can still add last-minute requests               │
│  - CD can make minor adjustments (numbers don't change)     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  TIER 3: Live/Published Mode                 │
│  - Schedule public (if CD chooses to publish)               │
│  - Studio codes revealed → Full studio names                │
│  - No more changes allowed                                   │
│  - Event day execution mode                                  │
└─────────────────────────────────────────────────────────────┘
```

### State Machine

```typescript
type ScheduleStatus =
  | 'not_started'      // No routines scheduled yet
  | 'draft'            // CD actively building schedule
  | 'finalized'        // Schedule locked, numbers fixed
  | 'published';       // Public, studio names revealed

interface ScheduleState {
  competition_id: string;
  status: ScheduleStatus;
  last_modified: Date;
  finalized_at?: Date;
  finalized_by?: string; // user_id
  published_at?: Date;
  published_by?: string;
  lock_reason?: string; // Why locked (e.g., "Within 30 days of event")
}

// Transitions
const allowedTransitions = {
  not_started: ['draft'],
  draft: ['not_started', 'finalized'], // Can reset to not_started
  finalized: ['draft', 'published'],   // Can unlock to draft
  published: [],                        // Cannot go back
};
```

---

## 🎯 Core Data Models

### Schedule Blocks (Awards & Breaks)

```typescript
interface ScheduleBlock {
  id: string;
  competition_id: string;
  tenant_id: string;
  block_type: 'award' | 'break';
  title: string; // CD writes custom text
  duration_minutes: number;
  scheduled_start_time?: Date; // NULL until placed
  display_order?: number; // Position in schedule
  metadata?: {
    overall_category?: string; // For award blocks
    award_type?: 'overall' | 'special' | 'scholarship';
    break_type?: 'short' | 'tech' | 'lunch' | 'photo';
  };
  created_at: Date;
  updated_at: Date;
}

// Examples
const lunchBreak: ScheduleBlock = {
  block_type: 'break',
  title: 'Lunch Break',
  duration_minutes: 60,
  metadata: { break_type: 'lunch' },
};

const soloAwards: ScheduleBlock = {
  block_type: 'award',
  title: 'Solo Overall Awards - Ages 7-9',
  duration_minutes: 30,
  metadata: {
    overall_category: 'solo-junior-emerald',
    award_type: 'overall',
  },
};
```

### Conflict Detection

```typescript
interface ScheduleConflict {
  id: string;
  competition_id: string;
  tenant_id: string;

  // The two routines in conflict
  routine_1_id: string;
  routine_2_id: string;

  // The dancer causing the conflict
  dancer_id: string;
  dancer_name: string; // Denormalized for performance

  // Conflict details
  routines_between: number; // Must be >= 6
  conflict_type: 'spacing_violation' | 'back_to_back' | 'same_time';
  severity: 'warning' | 'error' | 'critical';

  // Resolution tracking
  status: 'active' | 'resolved' | 'overridden';
  resolved_at?: Date;
  resolved_by?: string; // user_id
  override_reason?: string; // CD explains why conflict is acceptable

  created_at: Date;
}

// Severity levels
// - 'critical': Back-to-back routines (0 between)
// - 'error': 1-3 routines between
// - 'warning': 4-5 routines between (close to minimum 6)
```

### Routine Notes System

```typescript
interface RoutineNote {
  id: string;
  routine_id: string;
  tenant_id: string;

  note_type: 'cd_private' | 'studio_request' | 'submission_note';
  content: string;
  author_id: string; // user_id
  author_role: 'competition_director' | 'studio_director';

  // For studio requests
  status?: 'pending' | 'completed' | 'ignored';
  priority?: 'low' | 'normal' | 'high'; // CD can set
  completed_at?: Date;
  completed_by?: string;

  created_at: Date;
  updated_at: Date;
}

// Note types explained:
// - cd_private: Only CD sees (internal notes)
// - studio_request: Studio asks for something (e.g., "Schedule after 2pm")
// - submission_note: Note from original routine submission (e.g., "Dancer has school conflict")
```

### Age Change Tracking

```typescript
interface AgeChangeEvent {
  id: string;
  routine_id: string;
  dancer_id: string;
  tenant_id: string;

  // Before change
  old_birthdate: Date;
  old_age_group: AgeGroup;
  old_average_age?: number; // For groups

  // After change
  new_birthdate: Date;
  new_age_group: AgeGroup;
  new_average_age?: number;

  // Detection
  detected_at: Date;
  detection_trigger: 'manual_edit' | 'import' | 'csv_update';

  // Resolution
  resolved: boolean;
  resolved_at?: Date;
  resolved_by?: string;
  resolution_action?: 'reassigned' | 'confirmed_correct' | 'ignored';

  created_at: Date;
}
```

### Studio Codes

```typescript
interface Studio {
  // ... existing fields ...

  // NEW FIELDS
  studio_code?: string; // Single letter (A, B, C, ...)
  registration_order?: number; // Order approved (1, 2, 3, ...)
  code_assigned_at?: Date;
  code_assigned_by?: string; // user_id
}

// Code assignment logic
function assignStudioCode(competitionId: string, studioId: string): string {
  // Count approved studios for this competition
  const approvedCount = countApprovedStudios(competitionId);

  // Convert to letter (A=0, B=1, C=2, ...)
  const code = String.fromCharCode(65 + approvedCount);

  // Update studio
  updateStudio(studioId, {
    studio_code: code,
    registration_order: approvedCount + 1,
    code_assigned_at: new Date(),
  });

  return code;
}
```

---

## 🧩 Component Architecture

### Page Structure

```
/dashboard/director-panel/schedule
├── SchedulingPage.tsx (main container)
│   ├── ScheduleToolbar.tsx (top controls)
│   │   ├── StatusBadge (draft/finalized/published)
│   │   ├── ActionButtons (save, finalize, publish)
│   │   └── ViewToggle (day 1, day 2, both)
│   │
│   ├── LeftSidebar.tsx (routine pool)
│   │   ├── FilterPanel.tsx
│   │   │   ├── ClassificationFilter
│   │   │   ├── AgeGroupFilter
│   │   │   ├── GenreFilter
│   │   │   └── StudioFilter
│   │   ├── SearchBar.tsx
│   │   └── RoutinePool.tsx
│   │       └── RoutineCard.tsx (draggable)
│   │
│   ├── CenterPanel.tsx (schedule grid)
│   │   ├── TimelineHeader.tsx
│   │   ├── ScheduleGrid.tsx
│   │   │   ├── RoutineSlot.tsx (drop target)
│   │   │   ├── AwardBlock.tsx (draggable)
│   │   │   └── BreakBlock.tsx (draggable)
│   │   └── ConflictOverlay.tsx
│   │
│   └── RightSidebar.tsx (details panel)
│       ├── RoutineDetails.tsx
│       ├── ConflictWarnings.tsx
│       ├── StudioRequests.tsx
│       └── NotesPanel.tsx
│
/dashboard/director-panel/studio-requests
├── RequestList.tsx
│   ├── RequestFilters.tsx
│   └── RequestRow.tsx
│
/dashboard/director-panel/trophy-helper
├── TrophyHelperReport.tsx
│   └── CategorySection.tsx
│
/dashboard/studio/schedule (studio view)
├── StudioSchedule.tsx
│   ├── RoutineCard.tsx (read-only)
│   └── AddNoteButton.tsx
```

### State Management

```typescript
// Zustand store for scheduling page
interface SchedulingStore {
  // Schedule state
  scheduleStatus: ScheduleStatus;
  routines: Routine[];
  scheduledRoutines: Routine[];
  unscheduledRoutines: Routine[];

  // Blocks
  awardBlocks: ScheduleBlock[];
  breakBlocks: ScheduleBlock[];

  // Conflicts
  conflicts: ScheduleConflict[];
  activeConflicts: ScheduleConflict[];

  // Filters
  filters: {
    classification?: string[];
    ageGroup?: AgeGroup[];
    genre?: string[];
    studio?: string[];
    search?: string;
  };

  // UI state
  selectedRoutine?: string; // routine_id
  hoveredRoutine?: string;
  draggedItem?: {
    type: 'routine' | 'award' | 'break';
    id: string;
  };

  // Actions
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  scheduleRoutine: (routineId: string, position: number) => void;
  moveRoutine: (routineId: string, newPosition: number) => void;
  removeRoutine: (routineId: string) => void;
  addBlock: (block: ScheduleBlock) => void;
  detectConflicts: () => void;
  finalizeSchedule: () => Promise<void>;
}
```

---

## 🔍 Critical Business Logic

### Conflict Detection Algorithm (Detailed)

```typescript
interface ConflictDetectionResult {
  conflicts: ScheduleConflict[];
  summary: {
    critical: number; // Back-to-back
    errors: number;   // 1-3 routines between
    warnings: number; // 4-5 routines between
  };
}

async function detectAllConflicts(
  competitionId: string
): Promise<ConflictDetectionResult> {
  const MIN_ROUTINES_BETWEEN = 6;

  // Get all scheduled routines ordered by display_order
  const scheduledRoutines = await prisma.competition_entries.findMany({
    where: {
      competition_id: competitionId,
      scheduled_start_time: { not: null },
    },
    include: {
      entry_participants: {
        include: { dancers: true },
      },
    },
    orderBy: { display_order: 'asc' },
  });

  const conflicts: ScheduleConflict[] = [];

  // Build dancer → routines map
  const dancerRoutines = new Map<string, Routine[]>();
  for (const routine of scheduledRoutines) {
    for (const participant of routine.entry_participants) {
      const dancerId = participant.dancer_id;
      if (!dancerRoutines.has(dancerId)) {
        dancerRoutines.set(dancerId, []);
      }
      dancerRoutines.get(dancerId)!.push(routine);
    }
  }

  // Check conflicts for each dancer
  for (const [dancerId, routines] of dancerRoutines) {
    if (routines.length < 2) continue; // No conflicts possible

    // Check each pair of routines
    for (let i = 0; i < routines.length; i++) {
      for (let j = i + 1; j < routines.length; j++) {
        const routine1 = routines[i];
        const routine2 = routines[j];

        const routinesBetween = Math.abs(
          routine1.display_order - routine2.display_order
        ) - 1;

        if (routinesBetween < MIN_ROUTINES_BETWEEN) {
          const dancer = routine1.entry_participants.find(
            p => p.dancer_id === dancerId
          )?.dancers;

          const severity =
            routinesBetween === 0 ? 'critical' :
            routinesBetween <= 3 ? 'error' : 'warning';

          conflicts.push({
            id: generateId(),
            competition_id: competitionId,
            tenant_id: routine1.tenant_id,
            routine_1_id: routine1.id,
            routine_2_id: routine2.id,
            dancer_id: dancerId,
            dancer_name: `${dancer.first_name} ${dancer.last_name}`,
            routines_between: routinesBetween,
            conflict_type:
              routinesBetween === 0 ? 'back_to_back' : 'spacing_violation',
            severity,
            status: 'active',
            created_at: new Date(),
          });
        }
      }
    }
  }

  // Summarize
  const summary = {
    critical: conflicts.filter(c => c.severity === 'critical').length,
    errors: conflicts.filter(c => c.severity === 'error').length,
    warnings: conflicts.filter(c => c.severity === 'warning').length,
  };

  return { conflicts, summary };
}
```

### Age Change Detection

```typescript
// Detect age changes after scheduling started
async function detectAgeChanges(competitionId: string): Promise<AgeChangeEvent[]> {
  const scheduledRoutines = await prisma.competition_entries.findMany({
    where: {
      competition_id: competitionId,
      scheduled_start_time: { not: null },
      age_at_scheduling: { not: null }, // Has baseline age
    },
    include: {
      entry_participants: {
        include: { dancers: true },
      },
    },
  });

  const changes: AgeChangeEvent[] = [];

  for (const routine of scheduledRoutines) {
    // Recalculate current age
    const currentAgeResult = inferAgeGroup(
      routine.entry_participants.map(p => p.dancers),
      routine.classification
    );

    if (!currentAgeResult) continue;

    const currentAvgAge = (currentAgeResult.oldestAge + currentAgeResult.youngestAge) / 2;
    const originalAvgAge = routine.age_at_scheduling!;

    // Check if age group changed
    if (currentAgeResult.ageGroup !== routine.age_group) {
      // Find which dancer's birthdate changed
      for (const participant of routine.entry_participants) {
        const dancer = participant.dancers;

        // Check if this dancer's birthdate changed recently
        const birthdateHistory = await getBirthdateHistory(dancer.id);

        if (birthdateHistory.length > 1) {
          const oldBirthdate = birthdateHistory[birthdateHistory.length - 2];
          const newBirthdate = dancer.date_of_birth;

          changes.push({
            id: generateId(),
            routine_id: routine.id,
            dancer_id: dancer.id,
            tenant_id: routine.tenant_id,
            old_birthdate: oldBirthdate,
            old_age_group: routine.age_group,
            old_average_age: originalAvgAge,
            new_birthdate: newBirthdate,
            new_age_group: currentAgeResult.ageGroup,
            new_average_age: currentAvgAge,
            detected_at: new Date(),
            detection_trigger: 'manual_edit',
            resolved: false,
          });
        }
      }
    }
  }

  return changes;
}
```

### Trophy Helper Generation

```typescript
interface TrophyHelperEntry {
  overall_category: string; // e.g., "Solo - Junior - Emerald"
  category_display: string; // e.g., "Solo Ages 10-12 (Emerald)"
  last_routine_id: string;
  last_routine_number: number;
  last_routine_title: string;
  last_routine_time: Date;
  total_routines_in_category: number;
  suggested_award_time: Date; // last_routine_time + 30 minutes
}

async function generateTrophyHelper(
  competitionId: string
): Promise<TrophyHelperEntry[]> {
  const scheduledRoutines = await getScheduledRoutines(competitionId);

  // Group by overall category (age + classification + size)
  const byCategory = new Map<string, Routine[]>();

  for (const routine of scheduledRoutines) {
    // Overall category key
    const categoryKey = [
      routine.category_type, // solo, duet, small_group, large_group
      routine.age_group,      // petite, mini, junior, teen, senior, adult
      routine.classification, // emerald, sapphire, crystal, titanium
    ].join('-');

    if (!byCategory.has(categoryKey)) {
      byCategory.set(categoryKey, []);
    }
    byCategory.get(categoryKey)!.push(routine);
  }

  // Find last routine in each category
  const entries: TrophyHelperEntry[] = [];

  for (const [categoryKey, routines] of byCategory) {
    const sorted = routines.sort((a, b) =>
      a.scheduled_start_time! < b.scheduled_start_time! ? -1 : 1
    );

    const last = sorted[sorted.length - 1];
    const [categoryType, ageGroup, classification] = categoryKey.split('-');

    entries.push({
      overall_category: categoryKey,
      category_display: formatCategoryDisplay(categoryType, ageGroup, classification),
      last_routine_id: last.id,
      last_routine_number: last.display_order!,
      last_routine_title: last.routine_name,
      last_routine_time: last.scheduled_start_time!,
      total_routines_in_category: routines.length,
      suggested_award_time: addMinutes(last.scheduled_start_time!, 30),
    });
  }

  // Sort by suggested award time
  return entries.sort((a, b) =>
    a.suggested_award_time < b.suggested_award_time ? -1 : 1
  );
}
```

### Time Rounding

```typescript
// Round to nearest 5-minute increment
function roundToNearest5Minutes(date: Date): Date {
  const ms = date.getTime();
  const minutesMs = 1000 * 60;
  const fiveMinutesMs = minutesMs * 5;

  const rounded = Math.round(ms / fiveMinutesMs) * fiveMinutesMs;

  return new Date(rounded);
}

// Example usage
const originalTime = new Date('2025-01-15T14:37:22Z'); // 2:37:22 PM
const roundedTime = roundToNearest5Minutes(originalTime);
// Result: 2025-01-15T14:35:00Z (2:35:00 PM)

// Apply to all block placements
function placeBlock(block: ScheduleBlock, targetTime: Date) {
  const roundedTime = roundToNearest5Minutes(targetTime);

  return prisma.schedule_blocks.update({
    where: { id: block.id },
    data: {
      scheduled_start_time: roundedTime,
      updated_at: new Date(),
    },
  });
}
```

---

## 🔐 Access Control

### Role-Based Permissions

```typescript
interface SchedulingPermissions {
  // Competition Director (CD)
  cd: {
    view_schedule: true;
    edit_schedule: true;
    create_blocks: true;
    delete_blocks: true;
    view_all_notes: true;
    edit_cd_notes: true;
    view_studio_requests: true;
    manage_requests: true; // Mark complete/ignored
    finalize_schedule: true;
    publish_schedule: true;
    override_conflicts: true;
    view_trophy_helper: true;
  };

  // Studio Director (SD)
  sd: {
    view_schedule: 'own_routines_only'; // Only see their routines
    edit_schedule: false;
    create_blocks: false;
    delete_blocks: false;
    view_all_notes: false;
    edit_cd_notes: false;
    view_studio_requests: 'own_only'; // Only their requests
    manage_requests: false;
    add_routine_notes: true; // Can request changes
    download_schedule_pdf: true;
  };

  // Super Admin (SA)
  sa: {
    // All CD permissions plus:
    view_all_tenants: true;
    edit_all_tenants: true;
    access_system_tools: true;
  };
}
```

### Row-Level Security (RLS)

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

## 📊 Performance Considerations

### Caching Strategy

```typescript
// Cache conflict detection results (expensive operation)
const conflictCache = new Map<string, {
  timestamp: Date;
  conflicts: ScheduleConflict[];
}>();

const CACHE_TTL_MS = 30000; // 30 seconds

function getCachedConflicts(competitionId: string): ScheduleConflict[] | null {
  const cached = conflictCache.get(competitionId);

  if (!cached) return null;

  const age = Date.now() - cached.timestamp.getTime();
  if (age > CACHE_TTL_MS) {
    conflictCache.delete(competitionId);
    return null;
  }

  return cached.conflicts;
}

// Invalidate cache on schedule changes
function onScheduleChange(competitionId: string) {
  conflictCache.delete(competitionId);
  // Trigger background re-detection
  queueConflictDetection(competitionId);
}
```

### Database Indexes

```sql
-- Optimize conflict detection queries
CREATE INDEX idx_competition_entries_scheduled
  ON competition_entries(competition_id, scheduled_start_time)
  WHERE scheduled_start_time IS NOT NULL;

CREATE INDEX idx_competition_entries_display_order
  ON competition_entries(competition_id, display_order)
  WHERE display_order IS NOT NULL;

-- Optimize dancer lookup in conflicts
CREATE INDEX idx_entry_participants_dancer
  ON entry_participants(dancer_id, entry_id);

-- Optimize note queries
CREATE INDEX idx_routine_notes_routine_type
  ON routine_notes(routine_id, note_type, status)
  WHERE status IS NOT NULL;

-- Optimize trophy helper queries
CREATE INDEX idx_competition_entries_category
  ON competition_entries(competition_id, age_group, classification, category_type)
  WHERE scheduled_start_time IS NOT NULL;
```

### Denormalization Strategy

```typescript
// Store computed values to avoid joins
interface Routine {
  // ... existing fields ...

  // DENORMALIZED for performance
  dancer_names: string[];        // Avoid join to entry_participants + dancers
  dancer_count: number;          // Quick display
  conflict_count: number;        // Show "⚠️ 3" without query
  has_studio_requests: boolean;  // Show blue dot without query
  has_cd_notes: boolean;         // Show note icon without query
  age_changed: boolean;          // Show yellow highlight without query
}

// Update denormalized fields on relevant changes
async function updateRoutineCacheFields(routineId: string) {
  const routine = await prisma.competition_entries.findUnique({
    where: { id: routineId },
    include: {
      entry_participants: {
        include: { dancers: true },
      },
    },
  });

  const dancerNames = routine.entry_participants.map(
    p => `${p.dancers.first_name} ${p.dancers.last_name}`
  );

  const conflictCount = await prisma.schedule_conflicts.count({
    where: {
      OR: [
        { routine_1_id: routineId },
        { routine_2_id: routineId },
      ],
      status: 'active',
    },
  });

  const hasStudioRequests = await prisma.routine_notes.count({
    where: {
      routine_id: routineId,
      note_type: 'studio_request',
      status: 'pending',
    },
  }) > 0;

  const hasCdNotes = await prisma.routine_notes.count({
    where: {
      routine_id: routineId,
      note_type: 'cd_private',
    },
  }) > 0;

  const ageChanged = await checkAgeChange(routineId);

  await prisma.competition_entries.update({
    where: { id: routineId },
    data: {
      dancer_names,
      dancer_count: routine.entry_participants.length,
      conflict_count: conflictCount,
      has_studio_requests: hasStudioRequests,
      has_cd_notes: hasCdNotes,
      age_changed: ageChanged,
    },
  });
}
```

---

## 🎨 UI/UX Patterns

### Drag-and-Drop Implementation

```typescript
// Using @dnd-kit/core for drag-and-drop
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';

function SchedulingPage() {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setDraggedItem({
      id: active.id as string,
      type: active.data.current?.type as 'routine' | 'award' | 'break',
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setDraggedItem(null);
      return;
    }

    const itemId = active.id as string;
    const targetPosition = over.data.current?.position as number;

    // Place routine at target position
    scheduleRoutine(itemId, targetPosition);

    // Trigger conflict detection
    detectConflicts();

    setDraggedItem(null);
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <LeftSidebar routines={unscheduledRoutines} />
      <CenterPanel scheduledRoutines={scheduledRoutines} />
      <RightSidebar selectedRoutine={selectedRoutine} />
    </DndContext>
  );
}
```

### Conflict Warning Display

```typescript
interface ConflictWarningProps {
  conflict: ScheduleConflict;
  onOverride: () => void;
  onResolve: () => void;
}

function ConflictWarning({ conflict, onOverride, onResolve }: ConflictWarningProps) {
  const severity = conflict.severity;

  const bgColor = {
    critical: 'bg-red-100 border-red-500',
    error: 'bg-orange-100 border-orange-500',
    warning: 'bg-yellow-100 border-yellow-500',
  }[severity];

  const icon = {
    critical: '🚨',
    error: '⚠️',
    warning: '⚡',
  }[severity];

  return (
    <div className={`border-l-4 p-4 mb-2 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold mb-1">
            {severity === 'critical' && 'Critical Conflict'}
            {severity === 'error' && 'Scheduling Conflict'}
            {severity === 'warning' && 'Close Spacing Warning'}
          </h4>
          <p className="text-sm mb-2">
            Dancer <strong>{conflict.dancer_name}</strong> appears in:
          </p>
          <ul className="text-sm mb-3 space-y-1">
            <li>• Routine #{getRoutineNumber(conflict.routine_1_id)}</li>
            <li>• Routine #{getRoutineNumber(conflict.routine_2_id)}</li>
            <li className="text-red-600 font-medium">
              Only {conflict.routines_between} routines between (need 6 minimum)
            </li>
          </ul>
          <div className="flex gap-2">
            <button onClick={onResolve} className="btn-sm btn-primary">
              Move Routine
            </button>
            <button onClick={onOverride} className="btn-sm btn-secondary">
              Override (Accept Risk)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Trophy Helper Display

```typescript
function TrophyHelperReport({ entries }: { entries: TrophyHelperEntry[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Trophy Helper</h2>
      <p className="text-sm text-gray-600">
        Shows when the last routine in each overall category is scheduled.
        Use this to place award ceremonies.
      </p>

      <table className="w-full">
        <thead>
          <tr>
            <th>Overall Category</th>
            <th>Last Routine</th>
            <th>Time</th>
            <th>Suggested Award Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.overall_category}>
              <td>{entry.category_display}</td>
              <td>
                #{entry.last_routine_number} - {entry.last_routine_title}
              </td>
              <td>{formatTime(entry.last_routine_time)}</td>
              <td className="font-medium text-purple-600">
                {formatTime(entry.suggested_award_time)}
              </td>
              <td>
                <button
                  onClick={() => createAwardBlock(entry)}
                  className="btn-sm btn-primary"
                >
                  Create Award Block
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🚀 Implementation Phases

### Week 1 (Nov 11-17): Foundation
- [ ] Database schema migrations (all new tables)
- [ ] Studio code assignment logic
- [ ] Basic scheduling page layout (3-panel design)
- [ ] Drag-and-drop infrastructure (@dnd-kit setup)
- [ ] tRPC procedures for scheduling operations

### Week 2 (Nov 18-24): Core Features
- [ ] Conflict detection algorithm
- [ ] Classification grouping and filtering
- [ ] Award/break block management
- [ ] Time rounding logic
- [ ] Demo meeting with Selena (Nov 18-19)

### Week 3 (Nov 25-Dec 1): Studio Integration
- [ ] Studio portal schedule view
- [ ] Studio request/note system
- [ ] CD request management list
- [ ] Trophy helper report

### Week 4 (Dec 2-8): Polish
- [ ] Age change detection
- [ ] Routine notes UI
- [ ] Conflict warning UI
- [ ] Performance optimizations

### Week 5 (Dec 9-15): Testing
- [ ] End-to-end testing
- [ ] Multi-tenant isolation verification
- [ ] Production deployment

### Week 6 (Dec 16-22): Final Push
- [ ] Liability waiver integration (Dec 23 deadline)
- [ ] Bug fixes from testing
- [ ] Documentation updates
- [ ] User training materials

### Launch: December 26, 2025 ✅

---

**Document Status:** ✅ Complete - Architecture Defined
**Next Review:** Implementation kickoff
