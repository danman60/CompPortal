# Scheduling Suite - Implementation Work Plan

**Project:** CompPortal Phase 2 - Manual Scheduling System
**Target Deadline:** December 26, 2025
**Environment:** tester.compsync.net → production
**Current Status:** Backend 90% complete, Frontend 10% complete

---

## Executive Summary

**✅ Completed:**
- Database schema (100%) - All tables and columns created
- Backend API (90%) - 28/32 procedures implemented
- Basic UI (10%) - Drag-drop scheduling with filters working

**🚧 In Progress:**
- Backend completion (4 procedures remaining)
- Frontend UI development (90% remaining)

**📊 Overall Completion:** ~40% (weighted by effort)

**⏱️ Estimated Time Remaining:** 15-20 hours

---

## Current Status Detail

### ✅ Database Schema - 100% Complete

**New Tables Created:**
- `schedule_blocks` - Award and break blocks
- `schedule_conflicts` - Conflict tracking with severity levels
- `routine_notes` - CD private notes and studio requests
- `age_change_tracking` - Birthdate change monitoring

**Table Updates Complete:**
- `studios` - Studio codes, registration order
- `competitions` - State machine (draft/finalized/published)
- `competition_entries` - Scheduling metadata (display_order, schedule_zone, etc.)
- `reservations` - Waiver fields (SKIPPED per user request)

**Migration Status:** All migrations applied successfully on tester environment

---

### ✅ Backend API - 90% Complete (28/32 procedures)

**Implemented Procedures:**

**State Machine (3/3):**
- ✅ `finalizeSchedule` - Lock entry numbers, check for critical conflicts
- ✅ `publishSchedule` - Reveal studio names to public
- ✅ `unlockSchedule` - Revert to draft mode

**Scheduling Operations (7/7):**
- ✅ `scheduleRoutine` - Assign routine to time zone
- ✅ `getRoutines` - Fetch all routines with studio codes
- ✅ `assignEntryNumbers` - Sequential numbering
- ✅ `assignLateEntrySuffix` - Add suffix to late entries
- ✅ `assignLateSuffix` - Alternative late numbering
- ✅ `clearSchedule` - Reset all scheduling
- ✅ `validateSchedule` - Pre-finalize validation

**Conflict Detection (4/4):**
- ✅ `detectConflicts` - 6-routine spacing algorithm
- ✅ `getConflicts` - Fetch active conflicts
- ✅ `overrideConflict` - CD can override with reason
- ✅ `getConflictOverrides` - Fetch override history

**Schedule Blocks (2/2):**
- ✅ `createScheduleBlock` - Create award/break blocks
- ✅ `placeScheduleBlock` - Position block in schedule

**Trophy Helper (1/1):**
- ✅ `getTrophyHelper` - Last routine per category analysis

**Studio Requests (3/3):**
- ✅ `addStudioRequest` - Studio submits scheduling request
- ✅ `getStudioRequests` - CD views all requests
- ✅ `updateRequestStatus` - Mark as completed/ignored

**Sessions (3/3):**
- ✅ `getSessions` - Fetch competition sessions
- ✅ `getSessionStats` - Session capacity analysis
- ✅ `assignEntryToSession` - Assign routine to session

**Export (3/3):**
- ✅ `exportSchedulePDF` - Generate PDF schedule
- ✅ `exportScheduleICal` - Generate iCal calendar
- ✅ `exportScheduleCSV` - Generate CSV export

**Auto-Scheduling (1/1):**
- ✅ `autoScheduleSession` - Optional auto-generation (P2)

---

### ❌ Backend API - Missing (4/32 procedures)

**P0 Critical:**
1. ❌ `assignStudioCodes` - Auto-assign codes based on registration order
2. ❌ `getViewModeSchedule` - Filter schedule by view mode (CD/Studio/Judge/Public)

**P1 High Priority:**
3. ❌ `detectAgeChanges` - Monitor birthdate changes, flag affected routines
4. ❌ `getHotelAttritionWarning` - Check if all Emerald routines on one day

---

### 🚧 Frontend UI - 10% Complete

**Implemented:**
- ✅ 3-panel layout (left/center/right)
- ✅ Drag-and-drop routines to zones
- ✅ Classification filter
- ✅ Genre filter
- ✅ Search functionality
- ✅ Statistics panel (unscheduled/scheduled/total counts)
- ✅ Studio code display (anonymity preserved)
- ✅ Basic conflict panel (shows "No conflicts" message)

**Missing (90%):**

**P0 Critical - MVP Required:**
1. ❌ State Machine Controls
   - Status badge (Draft/Finalized/Published)
   - Finalize button + confirmation modal
   - Publish button + confirmation modal
   - Unlock button (draft revert)
2. ❌ Conflict Detection Display
   - Red conflict boxes spanning routines
   - Show dancer name + spacing count
   - Severity indicators (critical/error/warning)
   - Override conflict modal
3. ❌ Trophy Helper Panel
   - Right sidebar panel
   - Last routine per category display
   - Suggested award time (+30 min)
   - Gold border highlighting on last routines
4. ❌ Schedule Blocks UI
   - Draggable award block (🏆)
   - Draggable break block (☕)
   - Duration editor (15/30/45/60 min)
   - Custom title input
5. ❌ Display Order Column
   - Show entry numbers in schedule
   - Auto-renumber in draft mode
   - Locked numbers in finalized mode

**P1 High Priority:**
6. ❌ Studio Requests System
   - Modal to add scheduling request
   - Request status (pending/completed/ignored)
   - Priority levels (low/normal/high)
   - CD request management interface
7. ❌ View Mode Selector
   - Dropdown: CD/Studio/Judge/Public views
   - Filter routines by view mode
   - Show/hide studio names based on view
8. ❌ Age Change Warnings
   - Yellow warning icon on affected routines
   - Tooltip showing old vs new age group
   - Resolve button to acknowledge
9. ❌ Day Selector Tabs
   - Tabs with actual competition dates (e.g., "Thursday, June 4")
   - Active tab highlighting
   - Switch between days
10. ❌ Hotel Attrition Warning
    - Banner warning if all Emerald on one day
    - Dismissable alert

**P2 Nice-to-Have:**
11. ❌ Export Buttons
    - PDF button (uses existing backend)
    - iCal button (uses existing backend)
    - CSV button (uses existing backend)
12. ❌ Undo/Redo Controls
    - Undo button (↶)
    - Redo button (↷)
    - Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
13. ❌ Panel Collapse Controls
    - Collapse buttons on each panel
    - Maximize center panel
    - Persist collapsed state

---

## Implementation Plan

### Phase 1: Complete Backend (2-3 hours)

**Task 1.1: Studio Code Assignment (45 min)**
- Create `assignStudioCodes` procedure
- Algorithm: Sort studios by registration date/order
- Assign A, B, C, D, E... sequentially
- Update `studios.studio_code` field
- Track `code_assigned_at` and `code_assigned_by`

**Task 1.2: View Mode Filtering (45 min)**
- Create `getViewModeSchedule` procedure
- Filter logic:
  - CD View: Show all routines with codes + full names
  - Studio View: Show only their routines
  - Judge View: Show all routines with codes ONLY
  - Public View: Show all routines with full names (if published)
- Return filtered routine list

**Task 1.3: Age Change Detection (60 min)**
- Create `detectAgeChanges` procedure
- Compare `dancers.date_of_birth` with `age_change_tracking` history
- Flag routines where dancer age group changed
- Update `competition_entries.age_changed = true`
- Create age change records in tracking table

**Task 1.4: Hotel Attrition Warning (30 min)**
- Create `getHotelAttritionWarning` procedure
- Check if all Emerald routines scheduled on single day
- Return warning object with severity and message

**Deliverable:** All 32 backend procedures complete

---

### Phase 2: Critical Frontend UI (8-10 hours)

**Task 2.1: State Machine Controls (2 hours)**

**Files to Create/Modify:**
- `src/components/ScheduleStateMachine.tsx` (new)
- `src/app/dashboard/director-panel/schedule/page.tsx` (modify)

**Implementation:**
```typescript
// ScheduleStateMachine.tsx
- Status badge component (color-coded by state)
- Finalize button (checks for critical conflicts)
- Publish button (checks if finalized)
- Unlock button (revert to draft)
- Confirmation modals for each action
- Error handling for state transitions
```

**Acceptance Criteria:**
- [ ] Status badge shows current state with correct color
- [ ] Finalize button disabled if critical conflicts exist
- [ ] Publish button disabled if not finalized
- [ ] Confirmation modals prevent accidental transitions
- [ ] Success/error toast notifications
- [ ] Tested on both tenants (EMPWR + Glow)

---

**Task 2.2: Conflict Detection Display (2.5 hours)**

**Files to Create/Modify:**
- `src/components/ConflictDisplay.tsx` (new)
- `src/components/ConflictOverrideModal.tsx` (new)
- `src/components/SchedulingManager.tsx` (modify)

**Implementation:**
```typescript
// ConflictDisplay.tsx
- Fetch conflicts via tRPC
- Render red boxes spanning conflicting routines
- Show dancer name + routines between
- Severity styling (critical=red, error=orange, warning=yellow)
- Click to override (opens modal)

// ConflictOverrideModal.tsx
- Show conflict details
- Require override reason (textarea)
- Submit override to backend
```

**Acceptance Criteria:**
- [ ] Conflicts appear as red boxes over schedule grid
- [ ] Dancer name and spacing clearly visible
- [ ] Severity colors match spec (critical/error/warning)
- [ ] Override modal requires reason
- [ ] Override persists and removes visual conflict
- [ ] Refresh shows overridden conflicts resolved

---

**Task 2.3: Trophy Helper Panel (2 hours)**

**Files to Create/Modify:**
- `src/components/TrophyHelperPanel.tsx` (new)
- `src/app/dashboard/director-panel/schedule/page.tsx` (modify)

**Implementation:**
```typescript
// TrophyHelperPanel.tsx
- Fetch trophy helper data via tRPC
- Display last routine per category
- Show suggested award time (+30 min after last routine)
- Highlight last routines in main schedule (gold border + 🏆)
- Collapsible panel with expand/collapse button
```

**Acceptance Criteria:**
- [ ] Panel shows all categories with scheduled routines
- [ ] Last routine correctly identified per category
- [ ] Suggested award time calculated (+30 min)
- [ ] Gold border visible on last routines in schedule
- [ ] Panel collapsible with persistent state
- [ ] Updates in real-time when schedule changes

---

**Task 2.4: Schedule Blocks UI (2 hours)**

**Files to Create/Modify:**
- `src/components/ScheduleBlockCard.tsx` (new)
- `src/components/ScheduleBlockModal.tsx` (new)
- `src/components/SchedulingManager.tsx` (modify)

**Implementation:**
```typescript
// Draggable Blocks in Left Panel
- 🏆 +Award Block (draggable)
- ☕ +Break Block (draggable)

// ScheduleBlockModal.tsx
- Title input (e.g., "Jazz Awards Ceremony")
- Duration selector (15/30/45/60 min dropdown)
- Block type (award/break)
- Save to backend via createScheduleBlock

// Drag-Drop Handling
- Handle block drop on schedule grid
- Create block via backend
- Display block card in schedule (distinct from routine cards)
- Edit/delete block functionality
```

**Acceptance Criteria:**
- [ ] Award and break blocks draggable from left panel
- [ ] Modal opens on drop with title/duration inputs
- [ ] Blocks persist to database
- [ ] Blocks display in schedule with distinct styling
- [ ] Edit and delete functionality working
- [ ] Trophy helper shows recommendations for award blocks

---

**Task 2.5: Display Order Column (1.5 hours)**

**Files to Modify:**
- `src/components/SchedulingManager.tsx`

**Implementation:**
```typescript
// Add "Entry #" column to schedule table
- Display display_order from backend
- Auto-renumber when drag-drop in draft mode
- Show locked numbers in finalized/published mode
- Visual indicator for locked vs draft numbers
```

**Acceptance Criteria:**
- [ ] Entry numbers visible in schedule
- [ ] Numbers update after drag-drop (draft mode)
- [ ] Numbers locked in finalized mode
- [ ] Sequential numbering (1, 2, 3...)
- [ ] Visual distinction between draft and locked

---

### Phase 3: Enhanced Frontend UI (6-8 hours)

**Task 3.1: Studio Requests System (2 hours)**

**Files to Create:**
- `src/components/StudioRequestModal.tsx`
- `src/components/StudioRequestsPanel.tsx`
- `src/components/AddRequestButton.tsx`

**Implementation:**
- Studio view: Add request button on routines
- Modal to submit request (note + priority)
- CD view: Panel showing all pending requests
- Mark as completed/ignored

**Acceptance Criteria:**
- [ ] Studios can add requests to their routines
- [ ] CD sees all requests in dedicated panel
- [ ] Status management working (pending/completed/ignored)
- [ ] Request count badge on routines with requests

---

**Task 3.2: View Mode Selector (1.5 hours)**

**Files to Modify:**
- `src/app/dashboard/director-panel/schedule/page.tsx`
- `src/components/ViewModeSelector.tsx` (new)

**Implementation:**
- Dropdown with 4 options: CD/Studio/Judge/Public
- Fetch filtered schedule based on view mode
- Show/hide studio names based on view
- Persist selected view in local storage

**Acceptance Criteria:**
- [ ] Dropdown switches between views
- [ ] CD view: Shows codes + full names
- [ ] Studio view: Shows only their routines
- [ ] Judge view: Shows codes only
- [ ] Public view: Shows full names (if published)

---

**Task 3.3: Age Change Warnings (1.5 hours)**

**Files to Create:**
- `src/components/AgeChangeWarning.tsx`

**Implementation:**
- Yellow warning icon on affected routines
- Tooltip showing old vs new age group
- Resolve button to acknowledge and clear flag

**Acceptance Criteria:**
- [ ] Warning icon visible on affected routines
- [ ] Tooltip shows age change details
- [ ] Resolve button clears warning
- [ ] Persists across sessions until resolved

---

**Task 3.4: Day Selector Tabs (1.5 hours)**

**Files to Modify:**
- `src/app/dashboard/director-panel/schedule/page.tsx`

**Implementation:**
- Fetch competition dates from database
- Render tabs with formatted dates (e.g., "Thursday, June 4")
- Filter schedule by selected day
- Active tab styling

**Acceptance Criteria:**
- [ ] Tabs show actual competition dates
- [ ] Active tab highlighted
- [ ] Schedule filters by selected day
- [ ] Conflicts scoped to current day only

---

**Task 3.5: Hotel Attrition Warning (30 min)**

**Files to Create:**
- `src/components/HotelAttritionBanner.tsx`

**Implementation:**
- Fetch warning from backend
- Display banner if all Emerald on one day
- Dismissable (store in local storage)

**Acceptance Criteria:**
- [ ] Banner displays when condition met
- [ ] Warning message clear and actionable
- [ ] Dismissable and doesn't reappear same session

---

**Task 3.6: Export Buttons (1.5 hours)**

**Files to Create:**
- `src/components/ExportScheduleButtons.tsx`

**Implementation:**
- PDF export button (calls existing backend)
- iCal export button
- CSV export button
- Download handling

**Acceptance Criteria:**
- [ ] PDF downloads correctly formatted schedule
- [ ] iCal downloads calendar file
- [ ] CSV downloads spreadsheet
- [ ] All formats include correct data

---

**Task 3.7: Undo/Redo Controls (1 hour - OPTIONAL)**

**Files to Create:**
- `src/hooks/useScheduleHistory.ts`

**Implementation:**
- Track schedule state changes
- Undo/redo buttons
- Keyboard shortcuts

**Acceptance Criteria:**
- [ ] Undo reverts last action
- [ ] Redo restores undone action
- [ ] Ctrl+Z and Ctrl+Y work
- [ ] History cleared on finalize

---

## Testing Requirements

### Backend Testing (via Playwright MCP)

**For Each New Procedure:**
1. [ ] Unit test with valid inputs
2. [ ] Error handling test (invalid tenant, missing data)
3. [ ] Multi-tenant isolation verification
4. [ ] Database verification (data saved correctly)

**Backend Test Suite:**
- [ ] `assignStudioCodes` - Verify codes assigned alphabetically
- [ ] `getViewModeSchedule` - Test all 4 view modes
- [ ] `detectAgeChanges` - Test birthdate change detection
- [ ] `getHotelAttritionWarning` - Test Emerald distribution check

---

### Frontend Testing (via Playwright MCP)

**For Each UI Component:**
1. [ ] Visual rendering test
2. [ ] User interaction test (click, drag, input)
3. [ ] Data persistence test (refresh page)
4. [ ] Multi-tenant test (EMPWR + Glow)
5. [ ] Edge case test (empty state, errors)

**Critical UI Test Scenarios:**

**State Machine:**
- [ ] Draft → Finalized (with no critical conflicts)
- [ ] Draft → Finalized (blocked by critical conflicts)
- [ ] Finalized → Published (success)
- [ ] Published → Unlock (revert to draft)

**Conflict Detection:**
- [ ] Create back-to-back conflict (0 between)
- [ ] Create 3-routine spacing conflict (warning)
- [ ] Override conflict with reason
- [ ] Verify override persists

**Trophy Helper:**
- [ ] Last routines highlighted correctly
- [ ] Suggested award time accurate
- [ ] Panel updates on schedule changes

**Schedule Blocks:**
- [ ] Drag award block to schedule
- [ ] Drag break block to schedule
- [ ] Edit block title and duration
- [ ] Delete block

**Display Order:**
- [ ] Numbers sequential in draft mode
- [ ] Numbers update on drag-drop
- [ ] Numbers locked in finalized mode

---

## Deployment Plan

### Step 1: Backend Deployment (30 min)

**Pre-Deployment:**
1. [ ] Run full build: `npm run build`
2. [ ] Type check: `npm run type-check`
3. [ ] Commit changes: 8-line format
4. [ ] Push to tester branch

**Deployment:**
1. [ ] Verify Vercel build success
2. [ ] Test new procedures on tester.compsync.net
3. [ ] Database verification queries

**Rollback Plan:**
- Revert commit if procedures fail
- No data risk (procedures are additive)

---

### Step 2: Frontend MVP Deployment (1 hour)

**Pre-Deployment:**
1. [ ] Build passes locally
2. [ ] All P0 components tested manually
3. [ ] Screenshots captured for evidence
4. [ ] Commit + push to tester

**Deployment:**
1. [ ] Verify on tester.compsync.net
2. [ ] Test state machine transitions
3. [ ] Test conflict detection
4. [ ] Test trophy helper
5. [ ] Test schedule blocks
6. [ ] Capture evidence screenshots

**Success Criteria:**
- [ ] No console errors
- [ ] State transitions work correctly
- [ ] Conflicts display properly
- [ ] Trophy helper accurate
- [ ] Blocks drag and drop

---

### Step 3: Production Deployment (2 hours)

**Pre-Deployment Checklist:**
1. [ ] All tests passing on tester environment
2. [ ] User acceptance testing complete
3. [ ] Documentation updated
4. [ ] Backup production database
5. [ ] Rollback plan documented

**Deployment Steps:**
1. [ ] Merge tester → main branch
2. [ ] Verify Vercel production build
3. [ ] Run smoke test on production
4. [ ] Test on EMPWR tenant
5. [ ] Test on Glow tenant
6. [ ] Monitor logs for 24 hours

**Post-Deployment:**
1. [ ] User training session with Selena
2. [ ] Document any issues found
3. [ ] Create follow-up task list
4. [ ] Archive session notes

---

## Risk Management

### High Risk Items

**Risk 1: State Machine Edge Cases**
- **Impact:** Could lock schedule prematurely
- **Mitigation:** Unlock button allows reverting to draft
- **Testing:** Test all state transitions thoroughly

**Risk 2: Conflict Detection Performance**
- **Impact:** Slow with 100+ routines
- **Mitigation:** Optimize query with proper indexes
- **Testing:** Load test with 200 routines

**Risk 3: Multi-Tenant Data Leak**
- **Impact:** Critical security issue
- **Mitigation:** All queries filter by tenant_id
- **Testing:** Cross-tenant leak verification queries

**Risk 4: Export Function Failures**
- **Impact:** CD cannot print schedules
- **Mitigation:** Graceful error handling, manual export option
- **Testing:** Test PDF generation with various schedule sizes

---

## Success Metrics

### Completion Criteria

**MVP Complete (Dec 26 deadline):**
- [ ] All P0 backend procedures implemented
- [ ] All P0 frontend components implemented
- [ ] State machine working (Draft → Finalized → Published)
- [ ] Conflict detection working (visual display + override)
- [ ] Trophy helper panel functional
- [ ] Schedule blocks working (award + break)
- [ ] Tested on both tenants
- [ ] Evidence screenshots captured

**Full Feature Complete:**
- [ ] All backend procedures (32/32)
- [ ] All frontend components (P0 + P1 + P2)
- [ ] Export functions working (PDF/iCal/CSV)
- [ ] Undo/redo implemented
- [ ] Production deployment successful
- [ ] User training complete

---

## Timeline

**Week 1 (Current):**
- [ ] Day 1: Complete backend procedures (4 remaining)
- [ ] Day 2-3: State machine + conflict detection UI
- [ ] Day 4-5: Trophy helper + schedule blocks UI

**Week 2:**
- [ ] Day 1-2: Display order + studio requests
- [ ] Day 3: View mode selector + age warnings
- [ ] Day 4: Day selector + hotel warning
- [ ] Day 5: Export buttons + testing

**Week 3:**
- [ ] Day 1-2: Comprehensive testing on tester
- [ ] Day 3: Bug fixes
- [ ] Day 4: User acceptance testing
- [ ] Day 5: Production deployment

**Total:** 15 working days (assuming 1-2 hours/day focused work)

---

## Next Steps

**Immediate (Today):**
1. Complete 4 missing backend procedures
2. Test backend on tester.compsync.net
3. Start state machine UI component

**This Week:**
1. Complete P0 frontend components
2. Test MVP on tester environment
3. Capture evidence screenshots

**Next Week:**
1. Complete P1 frontend components
2. Comprehensive testing
3. Production deployment

---

## Document Control

**Created:** November 15, 2025
**Author:** Claude Code
**Status:** Active
**Last Updated:** November 15, 2025
**Next Review:** December 1, 2025 (2 weeks before deadline)

**Related Documents:**
- `SCHEDULING_SPEC_V4_UNIFIED.md` - Complete specification
- `SCHEDULING_E2E_COMPLETE_TEST_REPORT_20251115.md` - Test results
- `CODEBASE_MAP.md` - Code navigation reference
- `CLAUDE.md` - Development protocols

---

**Work Plan Owner:** Daniel Abrahamson
**Execution:** Claude Code + User collaboration
**Target Completion:** December 26, 2025
