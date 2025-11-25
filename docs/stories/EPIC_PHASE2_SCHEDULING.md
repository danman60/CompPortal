# EPIC: Phase 2 Scheduling System

**Epic ID:** EPIC_PHASE2_SCHEDULING
**Status:** In Progress (60% complete)
**Started:** November 19, 2025
**Target:** December 26, 2025
**Branch:** `tester`
**Assignee:** Developer (Claude)

---

## Executive Summary

Complete rebuild of the Phase 2 Scheduling system for CompPortal, enabling Competition Directors to create competition schedules via drag-and-drop interface. Handles 600+ routines with conflict detection, schedule blocks (awards/breaks), and multi-tenant isolation.

**Key Deliverable:** Production-ready scheduling interface where CDs can drag routines from "Unscheduled Routines" pool onto specific competition days, with automatic time calculation, entry numbering, and dancer conflict detection.

---

## Business Context

### Problem
Competition Directors need to manually schedule 200-600 dance routines across multiple competition days, ensuring:
- No dancer performs in conflicting time slots (need 6-minute gap minimum)
- Routines grouped logically by age/size/classification
- Award ceremonies placed after category completion
- Break blocks inserted for meals/transitions
- Entry numbers assigned sequentially starting at #100

### Solution
Drag-and-drop scheduling interface with:
- **Unscheduled Routines** (left panel): Searchable/filterable pool
- **Schedule** (right panel): Chronological table per day
- **Automatic time calculation**: Backend calculates performance times based on duration
- **Conflict detection**: Visual warnings for dancers with insufficient rest
- **Schedule blocks**: Drag-and-drop awards/breaks into schedule

### Success Metrics
- Schedule creation time: <2 hours for 600 routines
- Conflict detection: 100% accuracy
- Data integrity: Zero orphaned routines or corrupt state
- Performance: <500ms drag-and-drop response time
- Multi-user: Support 2 CDs editing simultaneously

---

## Technical Architecture

### Backend (100% Complete)
**File:** `src/server/routers/scheduling.ts` (+195 lines)

**Mutations:**
1. **`schedule`** - Unified mutation for scheduling 1-600 routines
   - Accepts: `routineIds[]`, `selectedDate`, `startTime`
   - Returns: Scheduled routines with calculated times
   - Features: Atomic transactions, row locking, idempotency

2. **`calculateScheduleTimes`** - Backend-only time calculation
   - Input: Existing schedule + new routine(s)
   - Output: Recalculated performance times for all routines
   - Logic: Sequential time addition based on duration

**Time Helpers:**
```typescript
timeStringToDateTime(date: Date, time: "HH:MM:SS"): DateTime
dateTimeToTimeString(dateTime: DateTime): "HH:MM:SS"
addMinutesToTimeString(time: "HH:MM:SS", minutes: number): "HH:MM:SS"
```

**Time Format Standard:** All times stored as `TimeString` ("HH:MM:SS" format, not DateTime)

### Frontend (40% Complete)

**Completed:**
1. **RoutineTable.tsx** (new, 226 lines)
   - Displays Unscheduled Routines pool
   - Fixed column widths for consistent layout
   - Searchable, filterable, sortable
   - Drag source for scheduling

2. **ScheduleTable.tsx** (updated, 29 lines changed)
   - Displays scheduled routines chronologically
   - Fixed column widths matching RoutineTable
   - Shows: # | Time | Routine | Studio | Classification | Category | Dancers
   - Conflict detection (red border + warning)
   - Schedule blocks (awards/breaks) inline

**Pending:**
1. **DragDropProvider.tsx** (not yet created)
   - Wraps both tables with @dnd-kit context
   - Handles drag from UR → SR
   - Handles reorder within SR
   - Shows drop indicator
   - Calls backend mutations

2. **useOptimisticScheduling.ts** (not yet created)
   - React Query hook for optimistic updates
   - Immediate UI feedback on drag
   - Background mutation calls
   - Revert on error

3. **schedule/page.tsx** (wiring needed)
   - Replace old SchedulingManager
   - Wire up DragDropProvider
   - Connect optimistic hook

---

## Stories Breakdown

### ✅ STORY_070: Backend API Complete
**Status:** Complete (Session 70, Nov 19)
**Story Points:** 8
**Commits:** 76de947, cecbdd3, c3d9e4e

- Time conversion helpers
- Unified `schedule` mutation (1-600 routines, atomic)
- `calculateScheduleTimes` mutation (backend time logic)

### ✅ STORY_071: Frontend Tables
**Status:** Complete (Session 70, Nov 19)
**Story Points:** 5
**Commit:** 08afc11

- New RoutineTable component (226 lines)
- Updated ScheduleTable with fixed columns (29 lines changed)
- Consistent pixel widths across both tables

### ⏳ STORY_072: DragDropProvider Component
**Status:** Pending
**Story Points:** 8
**Priority:** HIGH

**Requirements:**
- Wrap RoutineTable + ScheduleTable
- Handle drag UR → SR (schedule routine)
- Handle drag within SR (reorder routine)
- Show drop indicator during drag
- Call `calculateScheduleTimes` on drop
- Support multi-select drag (Shift+click, drag all)

**Acceptance Criteria:**
- [ ] Drag single routine from UR → SR works
- [ ] Performance time auto-calculates
- [ ] Entry number auto-assigns
- [ ] Drop indicator shows during drag
- [ ] Multi-select: Shift+click selects, drag moves all

**Dependencies:** STORY_070 ✅, STORY_071 ✅

---

### ⏳ STORY_073: useOptimisticScheduling Hook
**Status:** Pending
**Story Points:** 5
**Priority:** HIGH

**Requirements:**
- React Query optimistic updates
- Immediate UI update on drag
- Background mutation call
- Revert on error + show toast
- Success toast on completion

**Acceptance Criteria:**
- [ ] Drag feels instant (no lag)
- [ ] Failed mutations revert + show error toast
- [ ] Success shows green toast
- [ ] State stays consistent (UI ↔ DB)

**Dependencies:** STORY_072 ⏳

---

### ⏳ STORY_074: Page Wiring
**Status:** Pending
**Story Points:** 3
**Priority:** HIGH

**Requirements:**
- Replace old SchedulingManager component
- Wire DragDropProvider to wrap tables
- Connect useOptimisticScheduling hook
- Maintain existing toolbar (date picker, view mode, filters)
- Keep schedule blocks functionality

**Acceptance Criteria:**
- [ ] Page loads without errors
- [ ] Drag-and-drop works end-to-end
- [ ] All existing features work (blocks, conflicts, etc.)
- [ ] Build passes
- [ ] Type check passes

**Dependencies:** STORY_072 ⏳, STORY_073 ⏳

---

### ⏳ STORY_075: E2E Testing
**Status:** Pending
**Story Points:** 5
**Priority:** MEDIUM

**Requirements:**
- Test with 600 routines (production scale)
- Performance verification (drag lag, load time)
- Multi-user concurrent editing scenarios
- Conflict detection accuracy
- Schedule blocks persist correctly
- Data integrity validation

**Test Cases:**
1. Single routine drag (UR → SR)
2. Multi-select drag (5 routines at once)
3. Reorder within SR
4. Switch days (verify day isolation)
5. Place award block after routine
6. Place break block after routine
7. Drag award/break block to reorder
8. Save schedule + verify DB state
9. Concurrent: 2 CDs drag different routines
10. Concurrent: 2 CDs drag same routine (race condition)

**Testing Platform:**
- Manual: tester.compsync.net
- Automated: Playwright MCP (if token limits allow)

**Dependencies:** STORY_074 ⏳

---

## Progress Tracking

### Sprint Velocity
- **Total Story Points:** 34
- **Completed Points:** 13 (38%)
- **Remaining Points:** 21 (62%)

### Burn Down
| Date | Remaining Points | Notes |
|------|-----------------|-------|
| 2025-11-19 | 34 | Sprint start (Session 70) |
| 2025-11-20 | 21 | Backend + Tables complete (13 points) |
| 2025-11-25 | 21 | BMAD exploration + planning |

### Completion Estimate
- **Target:** December 26, 2025
- **Days Remaining:** 31 days
- **Estimated Effort:** 4-5 sessions (21 points @ ~5 points/session)
- **Status:** On track ✅

---

## Technical Decisions

### Time Format Standardization
**Decision:** Use `TimeString` ("HH:MM:SS") everywhere, not DateTime
**Rationale:** Simplifies time-only operations, avoids timezone issues
**Impact:** All backend mutations use TimeString, frontend converts for display

### Atomic Transactions
**Decision:** All schedule updates wrapped in database transactions
**Rationale:** Prevent partial updates, ensure data integrity
**Impact:** All-or-nothing updates, row locking prevents race conditions

### Optimistic UI
**Decision:** Use React Query's optimistic updates for drag-and-drop
**Rationale:** Immediate feedback improves UX, revert on error prevents corruption
**Impact:** Drag feels instant, backend mutations happen in background

### Fixed Column Widths
**Decision:** Tables use exact pixel widths (# = 45px, Time = 65px, etc.)
**Rationale:** Consistent alignment between UR and SR tables
**Impact:** Eliminates layout shift issues, improves visual coherence

---

## Risks & Mitig

ation

### Risk: Performance with 600 Routines
**Likelihood:** Medium
**Impact:** High
**Mitigation:**
- Use React.memo for table rows
- Virtual scrolling if needed (react-window)
- Pagination or "Load More" for UR table
- Backend indexing on `competition_id` + `performance_date`

### Risk: Race Conditions (Multi-User)
**Likelihood:** Medium
**Impact:** High
**Mitigation:**
- Database row locking on schedule updates
- Optimistic locking (version field)
- Conflict resolution UI (show warning, allow override)
- WebSocket updates for real-time sync (future enhancement)

### Risk: Context Token Limits
**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Fresh chat per story (BMAD methodology)
- Load only relevant files per story
- Use CODEBASE_MAP.md for quick file references
- Archive completed session notes

### Risk: Scope Creep
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Strictly follow sprint-status.yaml stories
- Defer non-critical features to Phase 2B
- Focus on production readiness, not perfection
- User feedback loop post-launch for enhancements

---

## Dependencies

### External Systems
- **Supabase PostgreSQL** - Database for schedule storage
- **tRPC** - API layer for mutations/queries
- **@dnd-kit** - Drag-and-drop library
- **React Query** - Optimistic updates + caching

### Internal Features
- **Phase 1 (Registration)** - Must remain functional during Phase 2 development
- **Multi-tenant isolation** - All queries filtered by `tenant_id`
- **Conflict detection** - Existing logic in `scheduling.ts`
- **Schedule blocks** - Awards/breaks already implemented

---

## Rollout Plan

### Stage 1: Development (Current)
- Complete STORY_072, 073, 074
- Build passes, type check passes
- Manual smoke testing on tester.compsync.net

### Stage 2: Testing (Week of Dec 1)
- Complete STORY_075 (E2E testing)
- Performance verification with 600 routines
- Multi-user concurrent editing tests
- Bug fixes as needed

### Stage 3: Staging (Week of Dec 15)
- CD manual testing on tester environment
- Real-world workflow validation
- Final bug fixes + polish

### Stage 4: Production (Dec 26, 2025)
- Deploy to main branch
- Vercel production deployment
- Monitor logs for errors
- Rollback plan: Revert to old SchedulingManager if critical issues

---

## Success Criteria

### Functional
- [ ] Drag-and-drop works for 600 routines without lag
- [ ] Conflict detection shows warnings correctly
- [ ] Schedule blocks (awards/breaks) work as expected
- [ ] Multi-tenant isolation maintained (no cross-tenant data leaks)
- [ ] Data integrity: Zero orphaned routines or corrupt state

### Performance
- [ ] Drag-and-drop response time: <500ms
- [ ] Page load time: <2s (600 routines)
- [ ] Build time: <2 min
- [ ] No console errors or warnings

### Quality
- [ ] Build passes
- [ ] Type check passes
- [ ] Tested on EMPWR tenant
- [ ] Tested on Glow tenant
- [ ] E2E test suite passes (24/32 tests minimum)
- [ ] Code review checklist complete

---

## Related Documentation

- **Specs:** `docs/specs/MASTER_BUSINESS_LOGIC.md` (Phase 2 overview)
- **Architecture:** `SCHEDULE_PAGE_REBUILD_SPEC.md` (detailed rebuild plan)
- **Codebase:** `CODEBASE_MAP.md` (file locations + quick reference)
- **Session Notes:** `docs/archive/SESSION_70_COMPLETE.md` (backend completion)
- **BMAD Exploration:** `D:\ClaudeCode\BMAD_EXPLORATION.md` (methodology adoption)

---

**Last Updated:** November 25, 2025
**Next Review:** After STORY_072 completion
**Epic Owner:** Developer (Claude)
