# Scheduling Suite - Critical Tasks & Priorities

**Date:** November 11, 2025
**Deadline:** December 26, 2025 (45 days)
**Hard Deadline:** December 23, 2025 (Liability Waiver for Registration)

---

## 🚨 BLOCKING TASKS (Must Complete First)

### 1. Liability Waiver Integration ⏰ DUE: December 23, 2025

**Why Critical:** Registration deadline is December 23. ALL studios must accept waiver before submitting summary.

**Requirements:**
- Add checkbox to summary submission page
- Display waiver text from `competition_settings` (configurable per tenant)
- Block submission if not checked
- Store `waiver_accepted_at` timestamp in `reservations` table
- Record waiver version accepted

**Database Migration:**
```sql
ALTER TABLE reservations
ADD COLUMN waiver_accepted_at TIMESTAMPTZ,
ADD COLUMN waiver_version VARCHAR(50);
```

**Implementation:**
1. Selena sends Michael Wolf Software waiver language
2. Add to `competition_settings.waiver_text` (JSON field or new column)
3. Update `ReservationSummary.tsx` component
4. Update `reservation.submitSummary` tRPC procedure
5. Test on both EMPWR and Glow tenants

**Testing:**
- [ ] Waiver text displays correctly
- [ ] Cannot submit without checking box
- [ ] Timestamp recorded in database
- [ ] Works on EMPWR tenant
- [ ] Works on Glow tenant

**Status:** 🔴 NOT STARTED - Waiting for waiver language from Selena

---

### 2. Studio Code System

**Why Critical:** Foundation for entire scheduling system. Studios MUST be masked during draft.

**Requirements:**
- Assign single letter codes (A, B, C...) based on reservation approval order
- First approved studio = "A", second = "B", etc.
- Display codes in public/studio views
- CD view shows: "Studio A (Full Name)"
- Codes revealed when schedule published

**Database Migration:**
```sql
ALTER TABLE studios
ADD COLUMN studio_code CHAR(1),
ADD COLUMN registration_order INT;

CREATE UNIQUE INDEX idx_studios_code_per_competition
  ON studios(studio_code, tenant_id)
  WHERE studio_code IS NOT NULL;
```

**Implementation:**
1. Update `reservation.approve` procedure → assign code on approval
2. Add code assignment function (A-Z based on count)
3. Update `studio.getAll` to include codes
4. Update all UI components showing studio names
5. Add toggle: "Show Full Names" (CD only)

**Files to Update:**
- `CompPortal/src/server/routers/reservation.ts` (approval logic)
- `CompPortal/src/server/routers/studio.ts` (include codes in queries)
- `CompPortal/src/components/ScheduleView.tsx` (display codes)
- `CompPortal/src/components/DancersList.tsx` (show codes if scheduled)
- `CompPortal/src/components/EntriesList.tsx` (show codes if scheduled)

**Testing:**
- [ ] First approved studio gets "A"
- [ ] Second approved studio gets "B"
- [ ] Public view shows only codes
- [ ] CD view shows "Studio A (Name)"
- [ ] Works on both tenants

**Status:** 🟡 READY TO START - No dependencies

---

### 3. Competition Settings Update - Age Divisions

**Why Critical:** Age groups affect routine grouping, trophy helper, overall categories.

**Current Age Groups:**
- Petite: 0-7
- Mini: 8-9
- Junior: 10-12
- Teen: 13-15
- Senior: 16-19 ← CHANGE TO 16-16
- **NEW:** Senior Plus: 17-18
- **NEW:** Adult: 19-99
- **NEW:** Professional Teacher (overall only)
- **NEW:** Production (separate, end of weekend)

**Database:** `competition_settings.age_groups` JSON field

**Implementation:**
1. Update `ageGroupCalculator.ts`:
   - Add `SeniorPlus` type
   - Add `Adult` type
   - Update `getAgeGroup()` function with new ranges
2. Update `competition_settings` schema/seed data
3. Update all dropdowns showing age groups
4. Update trophy helper logic to include new categories

**Files to Update:**
- `CompPortal/src/lib/ageGroupCalculator.ts` (core logic)
- `CompPortal/src/server/routers/competition.ts` (settings management)
- `CompPortal/prisma/seed.ts` (default settings)
- `CompPortal/src/components/RoutineForm.tsx` (age display)
- `CompPortal/src/components/DancerForm.tsx` (age calculation)

**Testing:**
- [ ] 17-year-old shows "Senior Plus"
- [ ] 19-year-old shows "Adult"
- [ ] Trophy helper includes all categories
- [ ] Overall breakdowns include Production
- [ ] Works on both tenants

**Status:** 🟡 READY TO START - No dependencies

---

## 🎯 HIGH PRIORITY (Week 1-2)

### 4. Manual Scheduling Interface - Core Layout

**Why Critical:** Foundation for all scheduling features. CD needs to see this ASAP.

**Requirements:**
- 3-panel layout: Left (routine pool), Center (schedule grid), Right (details)
- Drag-and-drop infrastructure using @dnd-kit
- Classification/age/genre filters in left panel
- Timeline view in center panel (8 AM - 10 PM)
- Status bar showing draft/finalized/published

**Components to Create:**
```
/dashboard/director-panel/schedule
├── SchedulingPage.tsx (main container)
├── ScheduleToolbar.tsx (top controls)
├── LeftSidebar.tsx (routine pool)
│   ├── FilterPanel.tsx
│   └── RoutinePool.tsx
├── CenterPanel.tsx (schedule grid)
│   └── ScheduleGrid.tsx
└── RightSidebar.tsx (details panel)
```

**Database Migration:**
```sql
ALTER TABLE competition_entries
ADD COLUMN scheduled_start_time TIMESTAMPTZ,
ADD COLUMN display_order INT,
ADD COLUMN age_at_scheduling DECIMAL(4,2);

CREATE INDEX idx_competition_entries_scheduled
  ON competition_entries(competition_id, scheduled_start_time)
  WHERE scheduled_start_time IS NOT NULL;
```

**Dependencies:**
- Install @dnd-kit/core, @dnd-kit/sortable
- Create Zustand store for scheduling state
- Set up tRPC procedures: schedule.getRoutines, schedule.placeRoutine, schedule.moveRoutine

**Testing:**
- [ ] Drag routine from pool to grid
- [ ] Routine appears in correct position
- [ ] Display order updates automatically
- [ ] Filter by classification works
- [ ] Filter by age works
- [ ] Filter by genre works

**Status:** 🔴 NOT STARTED - Waiting for studio codes + age divisions

---

### 5. Conflict Detection System

**Why Critical:** Core safety feature. Prevents dancers from being double-booked.

**Requirements:**
- Minimum 6 routines between same dancer
- Real-time detection on drag-and-drop
- Show dancer name in warning
- Show both routine numbers
- Severity levels: critical (0 between), error (1-3), warning (4-5)

**Database Migration:**
```sql
CREATE TABLE schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  routine_1_id UUID NOT NULL REFERENCES competition_entries(id),
  routine_2_id UUID NOT NULL REFERENCES competition_entries(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  dancer_name VARCHAR(200) NOT NULL, -- Denormalized for performance
  routines_between INT NOT NULL,
  conflict_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX idx_schedule_conflicts_competition
  ON schedule_conflicts(competition_id, status);

CREATE INDEX idx_schedule_conflicts_routines
  ON schedule_conflicts(routine_1_id, routine_2_id);
```

**Algorithm:**
1. Get all dancers in routine being placed
2. For each dancer, find other scheduled routines
3. Calculate routines between (by display_order)
4. If < 6, create conflict record
5. Return conflicts to UI for display

**Implementation Files:**
- `CompPortal/src/server/routers/schedule.ts` (conflict detection logic)
- `CompPortal/src/components/ConflictWarning.tsx` (UI component)
- `CompPortal/src/lib/conflictDetection.ts` (shared algorithm)

**Testing:**
- [ ] Place routines with same dancer 5 apart → warning shows
- [ ] Warning shows dancer name clearly
- [ ] Warning shows both routine numbers
- [ ] Warning shows routines between count
- [ ] Override conflict → marked as overridden
- [ ] Works on both tenants

**Status:** 🔴 NOT STARTED - Depends on scheduling interface

---

### 6. Award & Break Block Management

**Why Critical:** CD needs to manually place breaks and awards. Core workflow.

**Requirements:**
- Create award blocks with custom text and duration
- Create break blocks with custom text and duration
- Drag blocks onto schedule
- Time rounds to nearest 5 minutes
- Blocks push following routines later

**Database Migration:**
```sql
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('award', 'break')),
  title VARCHAR(200) NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  scheduled_start_time TIMESTAMPTZ,
  display_order INT,
  metadata JSONB, -- For overall_category, award_type, break_type
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX idx_schedule_blocks_competition
  ON schedule_blocks(competition_id, scheduled_start_time)
  WHERE scheduled_start_time IS NOT NULL;
```

**UI Components:**
- Modal to create award block (text input + duration dropdown)
- Modal to create break block (text input + duration dropdown)
- Draggable block cards in left sidebar
- Block display in schedule grid (colored backgrounds)

**Duration Options:**
- Breaks: 15min, 30min, 45min, 60min, 90min, 120min
- Awards: 15min, 30min, 45min, 60min

**Testing:**
- [ ] Create award block → appears in pool
- [ ] Drag award to schedule → places correctly
- [ ] Award duration pushes routines later
- [ ] Start time rounds to 5min increment
- [ ] Create break block → works same way
- [ ] Works on both tenants

**Status:** 🔴 NOT STARTED - Depends on scheduling interface

---

## 🔄 MEDIUM PRIORITY (Week 3-4)

### 7. Studio Feedback System

**Why Critical:** Studios need to submit scheduling requests. CD needs to track them.

**Database Migration:**
```sql
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('cd_private', 'studio_request', 'submission_note')),
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'ignored')),
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX idx_routine_notes_routine
  ON routine_notes(routine_id, note_type);

CREATE INDEX idx_routine_notes_status
  ON routine_notes(status, note_type)
  WHERE status = 'pending';
```

**Studio Portal:**
- View their schedule (only their routines)
- Add note/request to each routine
- Download PDF of their schedule

**CD Portal:**
- List view of all studio requests
- Filter by: studio, status, routine
- Mark request: completed, ignored
- See notes on hover during scheduling

**Testing:**
- [ ] Studio adds note → saves correctly
- [ ] CD sees note in request list
- [ ] CD marks completed → status updates
- [ ] CD marks ignored → status updates
- [ ] Hover shows notes on schedule
- [ ] Works on both tenants

**Status:** 🔴 NOT STARTED - Depends on scheduling interface

---

### 8. Age Change Detection

**Why Critical:** Birthdates can change, affecting age groups. CD needs warning.

**Database Migration:**
```sql
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  old_birthdate DATE NOT NULL,
  new_birthdate DATE NOT NULL,
  old_age_group VARCHAR(20) NOT NULL,
  new_age_group VARCHAR(20) NOT NULL,
  old_average_age DECIMAL(4,2),
  new_average_age DECIMAL(4,2),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_action VARCHAR(50),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX idx_age_change_tracking_routine
  ON age_change_tracking(routine_id, resolved);
```

**Algorithm:**
1. Store `age_at_scheduling` when routine first scheduled
2. On dancer birthdate update → recalculate routine age
3. If age group changed → create tracking record
4. Highlight routine in yellow on schedule
5. CD can drag to correct age group

**Testing:**
- [ ] Change dancer birthdate → routine highlights
- [ ] Hover shows old vs. new age
- [ ] CD drags to new group → resolves warning
- [ ] Works on both tenants

**Status:** 🔴 NOT STARTED - Depends on scheduling interface

---

### 9. Trophy Helper Report

**Why Critical:** CD uses this to determine award timing. Core workflow.

**Requirements:**
- Show last routine in each overall category
- Overall category = age + classification + size (solo/duet/group)
- Suggest award time = last routine time + 30 minutes
- Highlight last routines on schedule
- Button to create award block from report

**Algorithm:**
1. Get all scheduled routines
2. Group by: category_type + age_group + classification
3. Sort each group by scheduled_start_time
4. Find last routine in each group
5. Add 30 minutes for suggested award time

**UI:**
- Table showing categories
- Last routine info (number, title, time)
- Suggested award time
- "Create Award Block" button

**Testing:**
- [ ] Report shows all categories
- [ ] Last routine per category correct
- [ ] Suggested times calculated correctly
- [ ] Click "Create" → award block created
- [ ] Works on both tenants

**Status:** 🔴 NOT STARTED - Depends on award block system

---

## 📋 LOWER PRIORITY (Week 5-6)

### 10. Automated Email Reminders

**Requirements:**
- Staff configures deadlines and warning intervals
- System sends emails at specified times
- Uses Mailgun (existing setup)
- Emily & Selena draft email text

**Database:**
```sql
-- Add to competition_settings or new table
CREATE TABLE email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  reminder_type VARCHAR(50) NOT NULL, -- 'registration_deadline', 'music_deadline', etc.
  days_before INT NOT NULL,
  email_subject VARCHAR(200) NOT NULL,
  email_body TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```

**Status:** 🟡 DEFERRED - Not blocking MVP

---

### 11. Music Submission Tracking

**Requirements:**
- Track music submission per routine
- Flag routines missing music
- Send reminders as deadline approaches

**Status:** 🟡 DEFERRED - Not blocking MVP

---

### 12. Level Distribution Warnings

**Requirements:**
- Warn if all Emerald (novice) routines on same day
- Suggest distribution across days

**Status:** 🟡 DEFERRED - Not blocking MVP

---

## 📊 Implementation Timeline

### Week 1 (Nov 11-17)
- [x] Requirements documentation (this document)
- [x] Architecture design (SCHEDULING_ARCHITECTURE.md)
- [ ] Liability waiver integration (Dec 23 deadline!)
- [ ] Studio code system
- [ ] Age division updates

### Week 2 (Nov 18-24)
- [ ] Scheduling interface layout
- [ ] Drag-and-drop infrastructure
- [ ] Basic routine placement
- [ ] **Demo meeting with Selena (Nov 18-19)**

### Week 3 (Nov 25-Dec 1)
- [ ] Conflict detection system
- [ ] Award/break block management
- [ ] Classification grouping

### Week 4 (Dec 2-8)
- [ ] Studio feedback system
- [ ] Trophy helper report
- [ ] Age change detection

### Week 5 (Dec 9-15)
- [ ] Polish and bug fixes
- [ ] Performance optimizations
- [ ] Testing on both tenants

### Week 6 (Dec 16-22)
- [ ] Final testing
- [ ] Production deployment
- [ ] User training/documentation

### December 23, 2025: Registration Deadline ✅
- Liability waiver MUST be live

### December 26, 2025: Scheduling MVP Launch ✅

---

## ⚠️ Risk Factors

### High Risk
1. **Liability waiver not ready by Dec 23** → Cannot accept registrations
2. **Conflict detection has bugs** → Dancers double-booked
3. **Studio codes not working** → Identity revealed too early
4. **Age divisions wrong** → Trophy helper broken

### Medium Risk
1. **Drag-and-drop performance issues** → CD frustrated
2. **Trophy helper calculations wrong** → Award timing incorrect
3. **Studio feedback system broken** → Manual email tracking fallback

### Mitigation
- Start with blocking tasks first (waiver, codes, ages)
- Test on both tenants at every step
- Have Selena review demo in week 2 (course correction time)
- Build fallbacks (manual tracking if systems fail)

---

## 🎯 Success Criteria

**MVP Complete When:**
1. ✅ Liability waiver live on summary submission (Dec 23)
2. ✅ Studio codes assigned and displaying correctly
3. ✅ Age divisions updated (Adult, Senior Plus, Production)
4. ✅ CD can drag-and-drop routines to build schedule
5. ✅ Conflict detection warns with dancer names
6. ✅ Award/break blocks can be created and placed
7. ✅ Trophy helper shows last routine per category
8. ✅ Studios can view schedule and add notes
9. ✅ CD can manage studio requests
10. ✅ Schedule can be finalized (locks numbering)
11. ✅ Schedule can be published (reveals studio names)

**Launch Checklist:**
- [ ] All 11 success criteria met
- [ ] Tested on EMPWR production
- [ ] Tested on Glow production
- [ ] Multi-tenant isolation verified
- [ ] No console errors
- [ ] Build passes
- [ ] Selena approves in demo
- [ ] Documentation complete
- [ ] Emergency rollback plan ready

---

## 📞 Next Steps

### Immediate Actions:
1. **User:** Selena sends liability waiver language
2. **Dev:** Start liability waiver integration (blocking task #1)
3. **Dev:** Implement studio code system (blocking task #2)
4. **Dev:** Update age divisions (blocking task #3)

### This Week:
- Schedule follow-up with Selena (1 week from Nov 11 = Nov 18-19)
- Complete blocking tasks (#1-3)
- Start scheduling interface layout (#4)

### Next Meeting (Nov 18-19):
- Demo scheduling interface to Selena
- Get feedback on layout and workflow
- Confirm conflict detection requirements
- Review trophy helper mockup

---

**Document Status:** ✅ Complete - Ready for Implementation
**Owner:** Daniel
**Reviewers:** Selena, Emily
