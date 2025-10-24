# Advanced Scheduling Suite - Documentation

**Status:** Initial Implementation Complete
**Created:** 2025-10-24
**Context Used:** ~80k tokens

---

## Overview

The Advanced Scheduling Suite provides Competition Directors (CDs) with a drag-and-drop interface to schedule all confirmed routines across competition days and sessions. It includes automatic conflict detection, Studio Director (SD) suggestion workflows, and locked routine number assignment.

---

## Database Schema

### Tables Created

1. **`schedules`** - Master schedule container
   - `id`, `competition_id`, `status` (draft/locked), `locked_at`, `created_by`
   - One schedule per competition

2. **`schedule_items`** - Individual routine/break placements
   - Routine items: `entry_id`, `routine_number` (100-999)
   - Break items: `break_type` (lunch/break/awards), `break_label`
   - Positioning: `day_number` (1-4), `session_number` (1-4), `running_order`
   - Timing: `start_time`, `duration_minutes`

3. **`schedule_conflicts`** - Auto-detected conflicts
   - `conflict_type`, `entry_ids`, `dancer_ids`, `severity`, `description`
   - Example: Dancer in back-to-back routines (< 3 routines apart)

4. **`schedule_suggestions`** - SD change requests
   - `suggestion_type`, `details` (JSONB), `notes`, `status` (pending/approved/rejected)
   - CDs review and approve/reject suggestions

5. **`competition_entries.routine_number`** - Added field
   - Denormalized for locked schedules
   - Routine number stays with entry even if moved

---

## Routine Number Assignment

### Draft Mode
- Routine numbers assigned sequentially (100, 101, 102...) during auto-generation
- Numbers can be reassigned as routines are moved
- Numbers stored only in `schedule_items` table

### Locked Mode
- When CD locks schedule (typically 14 days before event):
  - Routine numbers copied to `competition_entries.routine_number`
  - Numbers become permanent even if routines are moved later
  - Example: "Tap to the Sky" is #105 forever, even if moved to different day/session

---

## User Flows

### Competition Director Workflow

1. **Create Schedule**
   - Navigate to `/dashboard/admin/schedule-builder?competitionId=<id>`
   - Click "Auto-Generate" to create initial schedule from confirmed entries

2. **Review & Edit**
   - Select day/session to view routines
   - Drag-drop routines to reorder
   - Drag-drop break cards (lunch, breaks, awards)
   - Click "Detect Conflicts" to check for issues

3. **Lock Schedule**
   - Review all conflicts
   - Click "Lock Schedule" to finalize
   - Routine numbers become permanent
   - Schedule published to SDs

### Studio Director Workflow (Future)

1. **View Schedule**
   - Receive draft schedule notification
   - View assigned routine numbers and times
   - See their studio's routines highlighted

2. **Suggest Changes** (Sandbox Mode)
   - Drag routines in a sandbox environment
   - Submit suggestions with notes
   - CD reviews and approves/rejects

---

## Conflict Detection

### Rules Implemented

1. **Back-to-Back Dancers** (Critical)
   - Dancer appears in < 2 routines apart
   - Severity: CRITICAL
   - Description: "Dancer appears in routines with only 1 routine(s) in between"

2. **Close Dancer Appearances** (Warning)
   - Dancer appears in < 3 routines apart
   - Severity: WARNING
   - Description: "Needs 3+ routines for costume changes"

### Future Conflict Rules (Not Implemented)

- Category-specific spacing (e.g., ballet not after hip-hop)
- Studio-specific requests (e.g., all group numbers in morning)
- Judge availability constraints
- Location/stage limitations

---

## Auto-Generation Logic

### Current Implementation (Placeholder)

Simple sequential ordering:
1. Sort entries by: entry size → category → age group
2. Assign routine numbers starting at 100
3. Place 20 routines per session
4. Add awards ceremony (30 min) after each session
5. 4 sessions per day, up to 4 days

### Future Advanced Logic (User-Provided)

User will provide specific rules for:
- Entry size ordering (solos first, groups later, etc.)
- Category blocks (all jazz together, then tap, etc.)
- Age division placement
- Break timing and duration
- Awards ceremony logic

---

## API Endpoints (tRPC Router)

Located: `src/server/routers/scheduleBuilder.ts`

### Queries

- `getByCompetition({ competitionId })` - Fetch schedule with all items, conflicts, suggestions

### Mutations

- `create({ competitionId })` - Create new draft schedule
- `autoGenerate({ competitionId })` - Auto-generate from confirmed entries
- `lock({ scheduleId })` - Lock schedule (copy routine numbers to entries)
- `addItem(...)` - Add routine or break card
- `updateItem(...)` - Update routine position/number
- `reorderItems(...)` - Bulk drag-drop update
- `deleteItem({ id })` - Remove item
- `detectConflicts({ scheduleId })` - Run conflict detection
- `createSuggestion(...)` - SD creates change suggestion
- `reviewSuggestion({ suggestionId, status })` - CD approves/rejects

---

## UI Components

Located: `src/components/schedule/`

1. **`ScheduleRoutineCard`** - Draggable routine with routine number, title, studio, category, dancers
2. **`ScheduleBreakCard`** - Draggable break (lunch/break/awards) with duration
3. **`ConflictPanel`** - Sidebar showing conflicts by severity
4. **`SuggestionsPanel`** - Modal for reviewing SD suggestions
5. **`ScheduleDay`** - Placeholder for future day-based view

---

## Navigation

**CD Access:**
- `/dashboard/admin/schedule-builder?competitionId=<id>`
- Role check: `competition_director` or `super_admin`

**SD Access (Future):**
- `/dashboard/schedule-view?competitionId=<id>` (read-only)
- `/dashboard/schedule-suggest?competitionId=<id>` (sandbox mode)

---

## Missing Features (TODO)

### High Priority

1. **Add Break Card UI**
   - Toolbar with draggable break templates
   - Click to add lunch/break/awards to timeline

2. **Manual Routine Number Edit**
   - Input field on routine card to override auto-assigned number

3. **Time Calculation**
   - Auto-calculate `start_time` based on running order + durations
   - Display estimated session end times

4. **SD Sandbox Interface**
   - Separate page for SDs to drag-drop and submit suggestions
   - Visual diff showing changes vs. current schedule

5. **Suggestion Details**
   - Better formatting of `details` JSONB field
   - Show "Move routine #105 from Day 1 Session 1 to Day 2 Session 3"

### Medium Priority

6. **Schedule Export**
   - PDF export with day/session breakdown
   - CSV export for third-party tools

7. **Undo/Redo**
   - History stack for drag-drop operations

8. **Multi-Select Drag**
   - Select multiple routines and move together

9. **Search/Filter**
   - Filter by studio, category, age group
   - Search by routine title or dancer name

10. **Schedule Templates**
    - Save/load common scheduling patterns

### Low Priority

11. **Real-Time Collaboration**
    - Show when other CDs are editing
    - Prevent conflicting edits

12. **Schedule Comparison**
    - Compare draft versions
    - Show what changed between locks

---

## Technical Notes

### Drag-Drop Library
- Using `@dnd-kit` (check if installed via `package.json`)
- Alternative: `react-beautiful-dnd` or `react-dnd`

### Build Status
- ✅ Schema compiles
- ✅ tRPC router registered
- ⏳ UI build pending (awaiting dnd-kit dependencies)

### Performance Considerations
- Large competitions (500+ routines) may need pagination
- Consider virtual scrolling for long day/session lists
- Conflict detection runs O(n²) - optimize for 1000+ routines

---

## Migration Path

**To apply schema changes:**

```bash
# Option 1: Use Supabase MCP (if configured)
# Apply migration SQL directly via MCP tool

# Option 2: Manual Prisma workflow (requires env vars)
npx prisma migrate dev --name add_scheduling_suite
npx prisma generate
```

**Rollback:**
- Drop tables: `schedules`, `schedule_items`, `schedule_conflicts`, `schedule_suggestions`
- Drop column: `competition_entries.routine_number`

---

## Testing Checklist

### Unit Tests (Future)
- [ ] Conflict detection algorithm
- [ ] Routine number assignment logic
- [ ] Reorder validation (no duplicate running_order)

### Integration Tests
- [ ] Auto-generate for competition with 100 entries
- [ ] Lock schedule and verify denormalization
- [ ] Drag-drop updates running_order correctly

### Manual Testing
- [ ] Create schedule via UI
- [ ] Auto-generate and verify layout
- [ ] Drag routine to different session
- [ ] Add break card manually
- [ ] Detect conflicts and verify accuracy
- [ ] Lock schedule and check routine_number in DB
- [ ] SD submits suggestion
- [ ] CD approves/rejects suggestion

---

## Known Issues

1. **Missing dnd-kit dependency** - Need to install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
2. **Context access in tRPC** - `ctx.user` may be `undefined` depending on auth middleware
3. **Routine number gaps** - No validation to prevent skipping numbers or duplicates in draft mode
4. **Performance with large datasets** - No optimization for 500+ routines yet

---

## Future Enhancements

- **Live Updates**: WebSocket notifications when CD publishes schedule
- **Mobile Support**: Touch-friendly drag-drop for tablets
- **Analytics**: Report showing session duration, break timing stats
- **Accessibility**: Keyboard shortcuts for drag-drop (arrow keys + spacebar)
- **Localization**: Support for non-English competition names/categories

---

*Generated by Claude Code - Advanced Scheduling Suite Implementation*
