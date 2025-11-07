# Scheduler Feature Plan - Phase 2

**Created:** November 7, 2025
**Status:** Planning / Discovery

---

## Overview

**Requirement:** Competition Directors need to schedule 300-600 routines across multiple sessions with conflict detection and optimization.

**Key Insight:** CD will ALWAYS want manual control via drag-and-drop, regardless of AI assistance.

---

## Architecture Decision

### Manual Drag-and-Drop Scheduler = Baseline Requirement

**Then add optional AI-powered "Generate Draft" button on top.**

---

## Option 1: Manual Only (Pure Traditional)

**What to build:**
- Drag-and-drop schedule builder (2 weeks)
- Conflict detection engine (1 week)
- Validation rules (1 week)
- Session management (1 week)
- **Total: 5 weeks**

**CD workflow:**
1. Click "Create Schedule"
2. See list of 400 routines
3. Manually drag each routine into sessions
4. System shows conflict warnings
5. CD manually resolves conflicts
6. Finalize schedule
7. **Time: 12-18 hours per event**

**Cost:** $0/year operations, 5 weeks dev time

---

## Option 2: Manual + AI Assist (RECOMMENDED)

**What to build:**
- Same drag-and-drop UI (2 weeks)
- Same conflict detection (1 week)
- Same validation rules (1 week)
- Same session management (1 week)
- **+ AI "Generate Draft" button (3 days)**
- **Total: 5.5 weeks**

**CD workflow (Path A - Use AI):**
1. Click "Generate Draft Schedule with AI"
2. Wait 60 seconds
3. See AI-generated schedule in drag-and-drop UI
4. Review, manually tweak via drag-and-drop
5. Finalize
6. **Time: 2-4 hours per event**

**CD workflow (Path B - Skip AI):**
1. Click "Create Blank Schedule"
2. Manually drag-and-drop all routines
3. **Time: 12-18 hours per event**

**Cost:** $0.45/year operations (DeepSeek), 5.5 weeks dev time

---

## Why Option 2?

**Option 2 is only 3 extra days of work** for:
- ✅ 70-80% time savings for CDs who use AI
- ✅ Competitive differentiator ("AI-powered scheduling")
- ✅ Costs $0.45/year with DeepSeek (basically free)
- ✅ CD still has full manual control
- ✅ Fallback to manual if AI fails

**The drag-and-drop scheduler is required either way.** Adding AI on top is minimal extra effort for huge CD time savings.

---

## Implementation Plan

### Phase 2A: Manual Scheduler (5 weeks)

**Week 1-2: Drag-and-Drop UI**
- Session panels (time-based or count-based groupings)
- Routine cards with key info (title, dancers, duration, category, level)
- Drag routine from unscheduled list → drop into session
- Reorder routines within session
- Visual timeline view
- Session capacity indicators

**Week 3: Conflict Detection Engine**
- Same dancer back-to-back (hard error - block save)
- Costume change timing (warning - 30min buffer required)
- Spacing requirements (warning - 3-5 routines between same dancer)
- Real-time conflict highlighting in UI
- Conflict resolution suggestions

**Week 4: Validation & Rules**
- Age-appropriate timing (Mini/Petite before 11am, Teen/Senior after 2pm)
- Category distribution (avoid clustering same category)
- Level progression within category (Novice → Intermediate → Advanced)
- Break placement (15min every 90min, 60min lunch)
- Ceremony placement (every 50 routines)
- Soft warnings vs hard blocks

**Week 5: Session Management**
- Create/edit/delete sessions
- Define session time windows
- Assign awards to sessions
- Assign judges to sessions
- Schedule finalization (locks routine numbers)
- Generate session reports

---

### Phase 2B: AI Assist (+3 days) - OPTIONAL

**Day 1: DeepSeek Integration**
- Install DeepSeek SDK
- Build prompt template with scheduling rules
- Structure routine data for AI input
- Parse AI-generated JSON schedule
- Validate AI output against rules engine

**Day 2: "Generate Draft" Button**
- Add "Generate Draft Schedule with AI" button to UI
- Call DeepSeek API with event data + constraints
- Display generated schedule in drag-and-drop UI
- CD can immediately start manual tweaking
- Option to regenerate if not satisfied

**Day 3: Testing & Refinement**
- Test with real Phase 1 data (59 entries from production)
- Refine prompts based on results quality
- Add loading states and error handling
- Document AI-generated explanations for placements

---

## DeepSeek Cost Analysis

**Pricing:**
- Input: ~$0.14 per million tokens
- Output: ~$0.28 per million tokens

**Per Schedule Generation:**
- Input: ~10k tokens (routines + rules) = $0.0014
- Output: ~5k tokens (schedule JSON) = $0.0014
- **Total: $0.003 per generation**

**Annual Cost:**
- 50 events × 3 iterations average = 150 generations
- 150 × $0.003 = **$0.45/year**

**10-Year Cost:** $4.50 (negligible)

---

## Technical Architecture

### Database Schema (New Tables)

```sql
-- Schedule container
CREATE TABLE schedules (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  status VARCHAR(20), -- draft, published, finalized
  generated_by VARCHAR(20), -- manual, ai
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Session (grouping of routines)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  schedule_id UUID REFERENCES schedules(id),
  name VARCHAR(255),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  order_index INT,
  created_at TIMESTAMP
);

-- Scheduled routine (routine + placement)
CREATE TABLE scheduled_routines (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  routine_id UUID REFERENCES competition_entries(id), -- Entries become routines
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  routine_number INT, -- Sequential numbering
  order_in_session INT,
  created_at TIMESTAMP
);

-- Breaks
CREATE TABLE session_breaks (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  start_time TIMESTAMP,
  duration_minutes INT,
  type VARCHAR(50), -- lunch, transition, technical
  created_at TIMESTAMP
);

-- Award ceremonies
CREATE TABLE session_ceremonies (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  start_time TIMESTAMP,
  duration_minutes INT,
  awards_for TEXT, -- Description of awards being presented
  created_at TIMESTAMP
);
```

### Frontend Components

```
src/components/scheduler/
├── ScheduleBuilder.tsx          # Main drag-and-drop interface
├── SessionPanel.tsx              # Session container with routines
├── RoutineCard.tsx               # Draggable routine card
├── UnscheduledList.tsx           # List of routines not yet scheduled
├── ConflictDetector.tsx          # Real-time conflict warnings
├── TimelineView.tsx              # Visual timeline of schedule
├── SessionManager.tsx            # Create/edit sessions
├── GenerateDraftButton.tsx       # AI generation button (Phase 2B)
└── SchedulePreview.tsx           # Read-only schedule view
```

### Backend Services

```
src/server/services/
├── scheduleOptimizer.ts          # Traditional rules engine
├── conflictDetector.ts           # Detect scheduling conflicts
├── scheduleValidator.ts          # Validate final schedule
└── aiScheduleGenerator.ts        # DeepSeek integration (Phase 2B)
```

### tRPC Routers

```typescript
src/server/routers/schedule.ts

export const scheduleRouter = t.router({
  // Create blank schedule
  create: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Get schedule with sessions
  get: publicProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // Update routine placement (drag-and-drop)
  updateRoutinePlacement: publicProcedure
    .input(z.object({
      routineId: z.string(),
      sessionId: z.string(),
      orderInSession: z.number()
    }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // Detect conflicts
  detectConflicts: publicProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // Finalize schedule (lock routine numbers)
  finalize: publicProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),

  // AI: Generate draft (Phase 2B)
  generateDraft: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

---

## Conflict Detection Rules

### Hard Constraints (Block Save)
1. **No back-to-back dancers**
   - Same dancer cannot be in consecutive routines
   - Error: "Dancer {name} is in back-to-back routines #{A} and #{B}"

2. **Schedule overflow**
   - All routines must fit within event time window
   - Error: "Schedule extends beyond event end time"

### Soft Constraints (Warnings)
1. **Costume change buffer**
   - Same dancer, different costume = minimum 30 minutes between routines
   - Warning: "Dancer {name} has only {X} minutes for costume change"

2. **Spacing requirements**
   - Same dancer should have 3-5 routines between performances
   - Warning: "Dancer {name} has only {X} routines between #{A} and #{B} (recommend 3-5)"

3. **Age-appropriate timing**
   - Mini/Petite solos before 11am
   - Teen/Senior solos after 2pm
   - Large groups 11am-2pm
   - Warning: "Mini solo scheduled at 2:30pm (recommend before 11am)"

4. **Category variety**
   - Don't cluster same category (mix ballet, jazz, contemporary)
   - Warning: "5 consecutive ballet routines (recommend variety)"

5. **Level progression**
   - Within same category, order as Novice → Intermediate → Advanced
   - Warning: "Advanced routine before Novice in same category"

---

## UI/UX Requirements

### Drag-and-Drop Behavior
- Smooth animations (framer-motion)
- Visual feedback (highlight drop zones)
- Snap to grid for alignment
- Undo/redo support
- Auto-save drafts

### Conflict Highlighting
- Red border: Hard error (blocks save)
- Yellow border: Warning (can save)
- Tooltip on hover: Explanation + suggestion
- "Resolve All Conflicts" button

### Timeline View
- Horizontal timeline showing all sessions
- Color-coded by category or age division
- Zoom in/out for detail/overview
- Jump to specific time

### Mobile Considerations
- Responsive drag-and-drop (may need alternative UI on mobile)
- Touch-friendly targets
- Simplified view for small screens

---

## Outstanding Questions (From Master Spec)

### 1. Routine Numbering
- Sequential per event (100, 101, 102...)?
- Or per session (Session 1: 100-125, Session 2: 200-225)?
- When assigned? (At draft creation or finalization?)
- **Decision needed from user**

### 2. Session Creation
- CD manually defines sessions?
- Or system suggests based on time/count?
- **Decision needed from user**

### 3. Music Upload
- Required before scheduling?
- Or can be uploaded after schedule created?
- Deadline enforcement?
- **Decision needed from user**

### 4. Feedback Integration
- How do studios submit feedback on draft schedule?
- Free text? Structured requests?
- Does CD manually adjust or does system auto-adjust?
- **Decision needed from user**

---

## Success Metrics

### For Manual Scheduler
- CD can schedule 400 routines in 12-18 hours
- 95%+ of conflicts detected automatically
- Zero invalid schedules saved (validation works)

### For AI Assist (If Built)
- 80%+ of AI-generated schedules require < 1 hour of manual tweaking
- CD time savings: 12 hours → 3 hours per event (75% reduction)
- CDs actually use the feature (not just a gimmick)

---

## Risks & Mitigations

### Risk 1: Drag-and-Drop Performance
- **Risk:** 400+ routine cards = UI lag
- **Mitigation:** Virtualized lists (react-window), lazy rendering

### Risk 2: Complex Conflict Detection
- **Risk:** Rules engine misses edge cases
- **Mitigation:** Comprehensive test suite, CD can override warnings

### Risk 3: AI Generates Invalid Schedule
- **Risk:** DeepSeek returns schedule with conflicts
- **Mitigation:** Backend validation layer (same rules engine), CD must review

### Risk 4: DeepSeek API Downtime
- **Risk:** AI feature unavailable when CD needs it
- **Mitigation:** Retry logic, fallback to manual always available

---

## Dependencies

**Before starting Phase 2 scheduler:**
- ✅ Phase 1 complete (entries created and submitted)
- ✅ Routines data model defined (entries convert to routines)
- ⏳ Phase 2 spec questions answered (11 outstanding from MASTER_BUSINESS_LOGIC.md)

---

## Existing Implementation (DISCOVERED)

### ✅ Already Built (~60% Complete)

**Backend Router:**
- **File:** `src/server/routers/scheduling.ts` (1,104 lines)
- **Location in _app.ts:** Registered as `scheduling` router
- ✅ Get sessions for competition
- ✅ Get entries with scheduling info
- ✅ Detect conflicts (dancer overlap, costume change, capacity)
- ✅ Auto-schedule entries to session
- ✅ Manually assign entry to session
- ✅ Clear schedule
- ✅ Publish schedule and lock entry numbers
- ✅ Assign late entry suffix (156a, 156b)
- ✅ Get session statistics
- ✅ Validate entire schedule
- ✅ Export schedule (CSV, iCal, PDF with jsPDF)
- ✅ Assign entry numbers (starts at 100)

**Business Logic Library:**
- **File:** `src/lib/scheduling.ts` (319 lines)
- ✅ Conflict detection (dancer overlap, costume changes)
- ✅ Session capacity checking
- ✅ Auto-scheduling algorithm (category/studio grouping)
- ✅ Session statistics calculation
- ✅ Schedule validation
- ✅ Time calculations and utilities

**Frontend Components:**
- **Main:** `src/components/SchedulingManager.tsx` (main interface)
- **Supporting:** `src/components/SessionCard.tsx` (session display)
- **Supporting:** `src/components/UnscheduledEntries.tsx` (entry list)
- **Supporting:** `src/components/ConflictPanel.tsx` (conflict display)
- **Advanced:** `src/components/schedule/` folder:
  - `ScheduleRoutineCard.tsx`
  - `ScheduleBreakCard.tsx`
  - `ScheduleDay.tsx`
  - `ConflictPanel.tsx`
  - `SuggestionsPanel.tsx.disabled` (not active)
- **Hook:** `src/hooks/useConflictDetection.ts`

**Database Schema (Already Exists):**
- ✅ `competition_sessions` table
  - Fields: session_name, session_number, session_date, start_time, end_time, max_entries, entry_count
- ✅ `competition_entries` table additions:
  - Fields: session_id, performance_time, running_order, entry_number, entry_suffix, is_late_entry
- ✅ `competitions` table additions:
  - Fields: schedule_locked, schedule_published_at

**Disabled/Archive Files:**
- `src/server/routers/scheduleBuilder.ts.disabled` (old implementation)
- `src/app/dashboard/admin/schedule-builder/_page.tsx.disabled` (old UI)

---

## What's Missing (Gaps to Fill)

### 1. Drag-and-Drop UI
- **Exists:** Basic scheduling interface
- **Missing:** Drag-and-drop functionality (react-dnd or dnd-kit)
- **Effort:** 1-2 weeks

### 2. Advanced Scheduling Rules
- **Exists:** Basic category/studio grouping
- **Missing:** Age-appropriate timing (Mini before 11am, Teen after 2pm), level progression, break placement
- **Effort:** 1 week

### 3. Feedback System
- **Exists:** None
- **Missing:** Studio feedback submission, CD review interface, feedback incorporation
- **Effort:** 1-2 weeks

### 4. AI-Powered Draft Generation
- **Exists:** Auto-schedule algorithm (basic)
- **Missing:** DeepSeek/LLM integration for intelligent draft generation
- **Effort:** 3 days

### 5. Session Management UI
- **Exists:** Basic session display
- **Missing:** Create/edit/delete sessions UI, break/ceremony placement
- **Effort:** 1 week

---

## Revised Implementation Plan

### Phase 2A: Enhance Existing Scheduler (3-4 weeks)

**Week 1: Drag-and-Drop**
- Add dnd-kit to existing SchedulingManager
- Drag routine from UnscheduledEntries → drop into SessionCard
- Reorder within session
- Update assignEntryToSession mutation

**Week 2: Advanced Rules**
- Enhance autoScheduleSession with age-appropriate timing
- Add level progression logic
- Add break/ceremony placement
- Update conflict detection

**Week 3: Session Management**
- Build session create/edit UI
- Add break placement interface
- Add ceremony configuration
- Wire up to existing router

**Week 4: Polish & Testing**
- Mobile responsiveness
- Conflict resolution UI
- Schedule finalization workflow
- Export improvements (if needed)

### Phase 2B: AI Assist (Optional +3 days)

**Enhance Existing Auto-Schedule:**
- Replace basic algorithm with DeepSeek call
- Keep existing autoScheduleSession as fallback
- Add "Generate with AI" vs "Auto-Schedule" button options

---

## Next Steps

1. **Test existing scheduler** - Does it work on production? Any bugs?
2. **Answer Phase 2 spec questions** (routine numbering, session creation, feedback system)
3. **Decide:** Enhance existing (3-4 weeks) vs rebuild with drag-and-drop (5 weeks)
4. **Choose:** Add AI assist (+3 days) or traditional only
5. **Start implementation**

---

**Current State:** ~60% complete (backend + basic UI exists)

**To Production:** 3-4 weeks of enhancements + testing

**Decision Point:** Enhance existing + AI Assist (4 weeks, $0.45/year) or Enhance existing only (3.5 weeks, $0)?

**Recommendation:** Enhance existing + AI Assist (small incremental effort, huge value)
