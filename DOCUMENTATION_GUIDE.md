# Claude Code Documentation Guide

**Purpose:** Standards and templates for documentation that accelerates future Claude Code sessions.
**Target:** ~5-10k tokens per document to stay within efficient loading limits.
**Principle:** Document *relationships* and *hidden logic*, not obvious code.

---

## Table of Contents

1. [Documentation Types](#documentation-types)
2. [Priority Matrix](#priority-matrix)
3. [Templates](#templates)
4. [Anti-Patterns](#anti-patterns)
5. [Maintenance](#maintenance)

---

## 1. Documentation Types

### Type A: Component Dependency Graph
**What it captures:** Parent-child relationships, prop flow, state origin.
**When it helps:** Tracing where a handler originates, understanding what re-renders.
**Token cost:** ~500-1000 tokens per feature.

### Type B: Database Side Effects
**What it captures:** Triggers, functions, RLS policies, computed columns.
**When it helps:** "Mystery" behavior during debugging, understanding why data changed.
**Token cost:** ~300-500 tokens per trigger.

### Type C: tRPC Response Shapes
**What it captures:** Actual JSON structure returned by procedures.
**When it helps:** Building UI without reading router code, understanding nullability.
**Token cost:** ~200-400 tokens per procedure.

### Type D: Files That Change Together
**What it captures:** Which files must be updated for common operations.
**When it helps:** Ensuring no file is missed during changes.
**Token cost:** ~100-200 tokens per operation.

### Type E: State Flow Diagrams
**What it captures:** Where state lives, how it propagates, what triggers updates.
**When it helps:** Complex interactive features with multiple state sources.
**Token cost:** ~300-600 tokens per feature.

### Type F: Business Logic Edge Cases
**What it captures:** Non-obvious behavior, special cases, "why" explanations.
**When it helps:** Understanding intentional complexity, avoiding "fixes" that break features.
**Token cost:** ~200-400 tokens per edge case.

---

## 2. Priority Matrix

| Priority | Type | ROI Reason |
|----------|------|------------|
| **P0** | Database Side Effects | Prevents hours of debugging "impossible" behavior |
| **P0** | Files That Change Together | Prevents incomplete changes |
| **P1** | Component Dependency Graph | Speeds prop tracing by 5-10x |
| **P1** | Business Logic Edge Cases | Prevents breaking intentional behavior |
| **P2** | tRPC Response Shapes | Reduces router reading |
| **P3** | State Flow Diagrams | Helps complex features only |

**Rule of thumb:** Document what has caused confusion in past sessions.

---

## 3. Templates

### Template A: Component Dependency Graph

```markdown
## [Feature Name] Component Tree

### Overview
Entry point: `src/app/dashboard/[path]/page.tsx`
Lines: [start]-[end]
Key state: [list main useState/useQuery hooks]

### Component Hierarchy

\`\`\`
PageComponent (page.tsx)
├── State: entries, pendingChanges, selectedDay
├── Queries: trpc.scheduling.getSchedule
│
└── ChildComponent (ChildComponent.tsx)
    ├── Props: entries, onDrop, onEdit
    ├── Local State: draggedItem
    │
    └── GrandchildComponent (Grandchild.tsx)
        ├── Props: entry, onEdit
        └── Renders: title, duration, conflicts
\`\`\`

### Prop Origins

| Prop | Defined In | Type | Notes |
|------|-----------|------|-------|
| `onDrop` | PageComponent:45 | `(id, day, seq) => void` | Updates pendingChanges |
| `entries` | PageComponent:23 | `Entry[]` | From tRPC query |
| `selectedDay` | PageComponent:31 | `string` | Format: "YYYY-MM-DD" |

### Key Handlers

| Handler | Location | Effect |
|---------|----------|--------|
| `handleDrop` | PageComponent:78-95 | Updates pendingChanges, triggers conflict recalc |
| `handleSave` | PageComponent:102-130 | Calls saveSchedule mutation |
| `handleUndo` | PageComponent:135-150 | Restores from version history |
```

---

### Template B: Database Side Effects

```markdown
## Database Triggers & Functions

### Trigger: [trigger_name]

**Table:** `[table_name]`
**Events:** AFTER INSERT / UPDATE / DELETE
**Function:** `[function_name]`

**What it does:**
- [Bullet point description of logic]
- [Side effects on other tables]

**When it fires:**
- [Specific conditions that trigger it]

**Example scenario:**
\`\`\`
1. User schedules entry (UPDATE competition_entries SET schedule_sequence = 5)
2. Trigger fires
3. Conflict counts recalculated for all entries on same day
4. Updated entries: competition_entries WHERE performance_date = [same day]
\`\`\`

**Gotchas:**
- [Non-obvious behavior]
- [Performance implications]

---

### RLS Policy: [policy_name]

**Table:** `[table_name]`
**Operation:** SELECT / INSERT / UPDATE / DELETE
**Expression:**
\`\`\`sql
[policy SQL]
\`\`\`

**Effect:** [What rows are visible/modifiable]

**Bypass:** [When/how RLS is bypassed, if ever]
```

---

### Template C: tRPC Response Shapes

```markdown
## tRPC Response Types

### Router: [router_name]

#### Procedure: [procedure_name]

**Type:** query / mutation
**Input:**
\`\`\`typescript
{
  competitionId: string;          // Required
  performanceDate?: string;       // Optional, format "YYYY-MM-DD"
}
\`\`\`

**Output:**
\`\`\`typescript
{
  entries: Array<{
    id: string;
    title: string;
    studio_name: string;
    duration: number;              // In SECONDS (not minutes!)
    scheduled_start_time: string | null;  // Format "HH:MM:SS" or null if unscheduled
    conflict_count: number;
    conflicts_with_entry_ids: string[];
    // Extended time fields (may be null)
    extended_time_requested: boolean;
    routine_length_minutes: number | null;
    routine_length_seconds: number | null;
  }>;
  blocks: Array<{
    id: string;
    block_type: 'break' | 'award' | 'lunch' | 'adjudication';
    duration_minutes: number;
    schedule_sequence: number;
  }>;
  dayStartTimes: Record<string, string>;  // Key: "YYYY-MM-DD", Value: "HH:MM"
}
\`\`\`

**Notes:**
- `duration` is in SECONDS for entries, MINUTES for blocks
- `scheduled_start_time` is null for unscheduled entries
- `dayStartTimes` may not have entry for every day (use default "09:00")
```

---

### Template D: Files That Change Together

```markdown
## Files That Change Together

### Operation: Add New Entry Field

**Must update:**
1. `prisma/schema.prisma` - Add field to model
2. `src/server/routers/entry.ts` - Add to input schema + select
3. `src/components/EntryCreateFormV2.tsx` - Add form field
4. `src/components/EntriesTable.tsx` - Add column (if visible)

**May update:**
- `src/types/entry.ts` - If custom types exist
- CSV import logic - If field should be importable

**Verification:**
- [ ] `npm run db:push` succeeds
- [ ] Form shows new field
- [ ] Field saves to database
- [ ] Field displays in table

---

### Operation: Add New tRPC Procedure

**Must update:**
1. `src/server/routers/[feature].ts` - Add procedure
2. `src/server/api/root.ts` - Export router (if new router)

**Frontend usage:**
\`\`\`typescript
// Query
const { data } = trpc.[router].[procedure].useQuery({ ... });

// Mutation
const mutation = trpc.[router].[procedure].useMutation({
  onSuccess: () => { ... },
});
\`\`\`

---

### Operation: Add Database Trigger

**Must update:**
1. Supabase SQL Editor - Create trigger + function
2. `CODEBASE_MAP.md` - Document in Database Side Effects section
3. Test - Verify trigger fires as expected

**Template:**
\`\`\`sql
CREATE OR REPLACE FUNCTION [function_name]()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic here
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER [trigger_name]
AFTER INSERT OR UPDATE ON [table_name]
FOR EACH ROW
EXECUTE FUNCTION [function_name]();
\`\`\`
```

---

### Template E: State Flow Diagram

```markdown
## [Feature] State Flow

### State Locations

| State | Location | Type | Initial Value |
|-------|----------|------|---------------|
| `entries` | ScheduleV2:23 | `Entry[]` | From tRPC query |
| `pendingChanges` | ScheduleV2:31 | `Map<string, Change>` | `new Map()` |
| `hasUnsavedChanges` | ScheduleV2:45 | `boolean` | Derived from pendingChanges.size > 0 |

### Data Flow

\`\`\`
[User drags entry]
    ↓
handleDrop(entryId, newDay, newSequence)
    ↓
setPendingChanges(prev => prev.set(entryId, { day, seq }))
    ↓
hasUnsavedChanges becomes true
    ↓
Save button enables
    ↓
[User clicks Save]
    ↓
saveScheduleMutation.mutate(pendingChanges)
    ↓
[On success]
    ↓
setPendingChanges(new Map())  // Clear pending
refetch()                      // Refresh from server
\`\`\`

### Derived State

| Derived Value | Computed From | Logic |
|---------------|---------------|-------|
| `hasUnsavedChanges` | `pendingChanges` | `pendingChanges.size > 0` |
| `displayedEntries` | `entries + pendingChanges` | Merge pending into base |
| `conflictCount` | `displayedEntries` | Count overlapping dancer_names |

### Sync Points

- **Query invalidation:** After save, refetch all
- **Optimistic updates:** None (wait for server confirmation)
- **Conflict detection:** Recalculated on every pendingChange update
```

---

### Template F: Business Logic Edge Cases

```markdown
## Business Logic Edge Cases

### Feature: [Feature Name]

#### Edge Case: [Case Name]

**Scenario:**
[Describe when this happens]

**Expected Behavior:**
[What should happen]

**Why:**
[Business reason for this behavior]

**Code Location:**
`src/path/to/file.tsx:123-145`

**Example:**
\`\`\`
Input: Entry with extended_time_requested=true but routine_length_minutes=null
Expected: Use default duration (3min solo, 4min group, 5min line)
Actual behavior matches expected: ✓
\`\`\`

---

#### Edge Case: Capacity Refund on Summary Cancellation

**Scenario:**
Studio submits summary, then Competition Director cancels/rejects it.

**Expected Behavior:**
1. Summary status → 'cancelled'
2. Capacity refunded: `available_reservation_tokens += (spaces_confirmed - actual_entries)`
3. Reservation status → 'approved' (can resubmit)

**Why:**
Studios should be able to correct mistakes without losing their reservation.

**Code Location:**
`src/server/routers/summary.ts:234-267`

**Gotcha:**
Capacity is NOT refunded if reservation is cancelled entirely (only if summary is cancelled).
```

---

## 4. Anti-Patterns

### Don't Document

| Anti-Pattern | Why It's Bad |
|--------------|--------------|
| Obvious code (`const x = 1 + 2`) | Wastes tokens, Claude can read this |
| Every function signature | Use TypeScript for this |
| Implementation details that change frequently | Goes stale quickly |
| Copy-paste of entire files | Too large, hard to maintain |

### Do Document

| Pattern | Why It Helps |
|---------|--------------|
| "Why" behind non-obvious code | Prevents "fixing" intentional behavior |
| Relationships between files | Speeds up multi-file changes |
| Hidden behavior (triggers, RLS) | Prevents debugging rabbit holes |
| Gotchas learned from past bugs | Prevents repeating mistakes |

---

## 5. Maintenance

### When to Update

| Trigger | Action |
|---------|--------|
| New feature added | Add component tree + response shapes |
| Bug caused by hidden behavior | Document the side effect |
| Same question asked twice | Add to edge cases |
| File relationships discovered | Update "Files That Change Together" |

### Review Cadence

- **Monthly:** Review for stale documentation
- **After major feature:** Add new component trees
- **After production incident:** Add edge case documentation

### Location

| Document | Path | Load When |
|----------|------|-----------|
| Main codebase map | `CODEBASE_MAP.md` | Session start |
| Database side effects | `docs/DATABASE_EFFECTS.md` | Debugging data issues |
| Component trees | `docs/COMPONENT_TREES.md` | Working on specific feature |
| Response shapes | `docs/TRPC_SHAPES.md` | Building UI against API |

### Token Budget

| Document | Target Size | Load Frequency |
|----------|-------------|----------------|
| CODEBASE_MAP.md | 5-7k tokens | Every session |
| DATABASE_EFFECTS.md | 2-3k tokens | When debugging |
| COMPONENT_TREES.md | 3-5k tokens | When editing UI |
| TRPC_SHAPES.md | 2-4k tokens | When building forms |

**Total budget at session start:** ~10-15k tokens for documentation.

---

## Quick Start Checklist

For a new feature, document:

- [ ] Component tree (Template A)
- [ ] tRPC response shapes (Template C)
- [ ] Any database triggers added (Template B)
- [ ] Files that changed together (Template D)
- [ ] Any edge cases discovered (Template F)

For a bug fix, document:

- [ ] If caused by hidden behavior → Add to DATABASE_EFFECTS.md
- [ ] If required multiple file changes → Add to "Files That Change Together"
- [ ] If non-obvious fix → Add inline "why" comment

---

*This guide itself is ~2.5k tokens. Reference it when creating new documentation.*
