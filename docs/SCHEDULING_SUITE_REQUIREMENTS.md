# Scheduling Suite Requirements - Phase 2

**Date:** November 11, 2025
**Meeting:** Selena (Glow CD), Emily, Daniel
**Status:** Requirements Gathering Complete
**Priority:** HIGH - December 26th Deadline

---

## Executive Summary

Major pivot from auto-generation to **manual scheduling suite** with drag-and-drop functionality. Selena schedules manually by classification → age → genre, keeping similar routines grouped. System must support conflict detection, studio feedback, and flexible award/break placement.

**Key Decision:** NO auto-generation. CD has full manual control with smart conflict detection and filtering tools.

---

## 🎯 Core Requirements

### 1. Manual Scheduling Interface (Primary Feature)

**Approach:**
- Drag-and-drop routines into schedule slots
- No auto-generation algorithm
- CD has full manual control over placement
- Sequential numbering during draft, locked at finalization (~1 month before event)

**Classification Grouping (CRITICAL):**
- Keep classifications grouped together (Emerald, Sapphire, Crystal, Titanium)
- Add classification field to scheduling view
- Filter/select routines by: classification, age, genre
- Visual indication when classifications are grouped

**Selena's Method:**
1. Start with classification (e.g., Emerald)
2. Within classification, group by age
3. Within age, group by genre
4. Keep similar routines together

**Quote from Selena:**
> "I manually categorize and schedule based on classification, age, and genre. I need to keep similar routines together and easily filter/select routines."

---

### 2. Conflict Detection System

**Rule:** Minimum 6 dances between routines for same dancer

**Features:**
- Real-time conflict warnings when placing routines
- Show WHICH dancer has the conflict (not just "conflict exists")
- Highlight conflicting routines in red/warning color
- Allow CD to override conflicts (warning only, not blocking)

**Example:**
```
⚠️ Conflict: Dancer "Sarah Johnson" appears in Routine #45 (8:30 AM)
and Routine #48 (8:45 AM) - only 2 routines apart (need 6 minimum)
```

**Implementation:**
- Check entry_participants table for shared dancers
- Count routines between conflicts
- Surface dancer names in warning message
- Track conflicts in UI state, persist in schedule_conflicts table

---

### 3. Studio Code System

**Current:** Full studio names visible
**Change To:** Single letter codes based on registration order

**Purpose:** Mask studio identity from competitors until last minute

**Examples:**
- First registered studio: "A"
- Second registered studio: "B"
- etc.

**Implementation:**
- studios table: Add `studio_code` field (char, nullable)
- Assign codes on reservation approval (first come, first served)
- Display codes instead of names in public schedule views
- CD view shows both: "Studio A (Starlight Dance Academy)"

---

### 4. Awards Ceremony Management

**Manual System (Not Automated):**
- CD manually adds award blocks to schedule
- System generates empty award blocks that can be dragged
- CD determines timing based on "trophy helper" report

**Award Block Features:**
- Custom text field (e.g., "Solo Overall Awards - Age 7-9")
- Time duration selector (e.g., 15min, 30min, 45min, 60min)
- Drag-and-drop placement in schedule
- Round start times to nearest 5-minute increment

**Trophy Helper Report (New Feature):**
- Show when last routine of each overall category is scheduled
- Highlight last routine in each overall category on schedule
- CD uses this to determine award ceremony timing

**Overall Categories:**
- Based on: routine age + classification + group size
- NOT based on: genre
- Categories: Solo, Duet, Small Group, Large Group (per age/classification)

**New Overall Categories to Add:**
- Adult (19-99 years old)
- Senior Plus (17-18 years old) - UPDATE from current Senior range
- Professional Teacher
- Production (handled separately at end of weekend)

**Quote from Selena:**
> "I use a trophy helper tool that shows when the last routine in each category is completed, then I manually schedule awards ceremonies."

---

### 5. Break Block Management

**Features:**
- CD manually adds break blocks to schedule
- Custom text field (e.g., "Lunch Break", "Tech Check", "Competition Photo")
- Time duration selector (5min increments: 15min, 30min, 45min, 60min, 90min, 120min)
- Drag-and-drop placement in schedule
- Round start times to nearest 5-minute increment

**Common Break Types:**
- Short breaks (15min)
- Tech/changeover (30min)
- Lunch break (60-90min)
- Competition photo (30-45min)

---

### 6. Studio Feedback System

**Architecture:**
- Studios can add notes/requests to their routines
- CD sees all requests in a centralized list format
- Notes stored per routine, visible during scheduling

**Studio Portal:**
- View their schedule (only their routines, no competitor info)
- Add notes/requests to specific routines (e.g., "Please schedule after 2pm")
- Download PDF of their schedule
- Sequential dancer numbers for reference

**CD Portal - Request Management:**
- List view of all studio requests
- Filter by: studio, status (pending/completed/ignored), routine
- Mark requests as completed or ignored
- See notes when hovering over routines during scheduling
- Track request history

**Quote from Selena:**
> "I prefer studios submit requests through comments rather than direct schedule modifications. I need to track and manage requests with the ability to mark completed or ignored changes."

**Important:** Studios must submit requests BEFORE schedule generation, not after.

---

### 7. Age Change Detection

**Issue:** Dancer birthdates can change after submission, affecting routine age groups

**Feature:**
- Highlight routines where average age changed after scheduling started
- Visual indicator (e.g., yellow background, warning icon)
- Show old age vs. new age
- CD manually reassigns to correct age group if needed

**Example:**
```
⚠️ Age Changed: "Sparkle & Shine" was Mini (age 8.5), now Junior (age 9.2)
Action: CD can drag to Junior age group section
```

---

### 8. Routine Notes System

**CD Notes (Private):**
- Add notes to individual routines
- Only visible to CD (not studios or dancers)
- Use cases: "Check music quality", "Parent requested early slot", "VIP studio"

**Studio Notes (From Submission):**
- Show CD any notes from routine submission
- Display on hover during scheduling
- Example: Studio wrote "Dancer has school conflict after 3pm"

---

### 9. Time Rounding

**Rule:** Round all start times to nearest 5-minute increment

**Applies To:**
- Award ceremony start times
- Break start times
- Routine start times (when manually placed)

**Examples:**
- 8:47 AM → 8:45 AM
- 2:33 PM → 2:35 PM
- 11:52 AM → 11:50 AM

---

### 10. Scheduling by Level Strategy

**GLOW Specific:** Avoid putting all novice (Emerald) routines on same day

**Reason:** Hotel attrition - if all novice dancers compete on Day 1, they check out early

**Solution:**
- Spread Emerald level across both days
- System should warn if all Emerald routines on single day
- CD has manual control to distribute

---

### 11. Music Submission Tracking

**Deadline:** 30 days before event

**Reality:** Many participants submit late

**Phase 2A Feature (Lower Priority):**
- Track music submission status per routine
- Flag routines missing music as deadline approaches
- Send automated reminders at configurable intervals

---

### 12. Automated Email System

**Registration Deadline Reminders:**
- Staff sets deadlines and warning intervals via panel (no hard-coding)
- Automated emails at configurable intervals (e.g., 7 days, 3 days, 1 day before)
- Emily and Selena to draft email text

**Email Timing Example:**
- 14 days before: "Registration closes in 2 weeks"
- 7 days before: "Registration closes in 1 week"
- 3 days before: "Final reminder - registration closes in 3 days"
- Day of: "Registration closes TODAY at midnight"

**Implementation:**
- competition_settings table: Add email reminder configuration (JSON)
- Scheduled job checks deadlines daily
- Send emails via Mailgun (existing setup)

---

### 13. Liability Waiver

**Requirement:** Add liability waiver to summary submission process

**Deadline:** Must be implemented before December 23rd registration deadline

**Source:** Michael Wolf Software waiver language (Selena to provide)

**Implementation:**
- Add checkbox to summary submission page
- Required before submission can proceed
- Store acceptance in reservations table: `waiver_accepted_at` (timestamp)
- Display waiver text from competition_settings (configurable per tenant)

---

### 14. Competition Settings Updates

**New Age Divisions:**
- Adult: 19-99 years old
- Senior Plus: 17-18 years old (UPDATE current Senior range)
- Professional Teacher (overall category only)
- Production (separate category, scheduled at end of weekend)

**Current Senior Range:**
- Needs update from current range to 17-18

**Implementation:**
- competition_settings table: Update age_groups JSON
- Add overall_categories JSON with new categories
- Update ageGroupCalculator.ts to handle new ranges

---

### 15. Studio Invitation System

**Current State:** ~80% of users haven't claimed accounts

**Priority:** Lower (not blocking scheduling)

**Next Steps:**
- Emily to download/train Selena on CD portal features
- Meeting scheduled for tomorrow (Nov 12) at 10 AM
- Reduce dependency on Daniel for support via self-service tools

---

## 🗓️ Timeline and Priorities

### Phase 2A - MVP Scheduling Suite (Deadline: December 26, 2025)

**Must Have:**
1. ✅ Manual drag-and-drop scheduling interface
2. ✅ Classification grouping and filtering
3. ✅ Conflict detection (6-dance rule with dancer names)
4. ✅ Studio code system (single letters)
5. ✅ Award block management (manual, trophy helper report)
6. ✅ Break block management (manual, custom duration)
7. ✅ Studio feedback/notes system
8. ✅ Age change detection and highlighting
9. ✅ Routine notes (CD private + studio submission notes)
10. ✅ Time rounding (5-minute increments)
11. ✅ Liability waiver on summary submission (Dec 23 deadline)
12. ✅ Age division updates (Adult, Senior Plus, Production)

**Should Have:**
- Trophy helper report (last routine per overall category)
- Studio portal schedule view (only their routines)
- Request management list for CD
- Sequential dancer numbering

**Could Have (Phase 2B+):**
- Automated email reminders (configurable)
- Music submission tracking
- Level distribution warnings (Emerald spread check)

---

## 📊 Database Schema Changes

### New Tables

**schedule_conflicts:**
```sql
CREATE TABLE schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  routine_1_id UUID NOT NULL REFERENCES competition_entries(id),
  routine_2_id UUID NOT NULL REFERENCES competition_entries(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  routines_between INT NOT NULL, -- How many routines between conflicts
  conflict_type VARCHAR(50) NOT NULL, -- 'spacing_violation', 'back_to_back', etc.
  severity VARCHAR(20) NOT NULL, -- 'warning', 'error', 'critical'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'overridden'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```

**schedule_blocks (Awards & Breaks):**
```sql
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  block_type VARCHAR(20) NOT NULL, -- 'award', 'break'
  title VARCHAR(200) NOT NULL, -- Custom text (e.g., "Solo Overall Awards - Age 7-9")
  duration_minutes INT NOT NULL,
  scheduled_start_time TIMESTAMPTZ, -- NULL if not yet placed
  display_order INT, -- Position in schedule
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```

**routine_notes:**
```sql
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  note_type VARCHAR(20) NOT NULL, -- 'cd_private', 'studio_request', 'submission_note'
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'ignored' (for studio requests)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```

**age_change_tracking:**
```sql
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  dancer_id UUID NOT NULL REFERENCES dancers(id),
  old_birthdate DATE NOT NULL,
  new_birthdate DATE NOT NULL,
  old_age_group VARCHAR(20) NOT NULL,
  new_age_group VARCHAR(20) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```

### Existing Table Updates

**studios:**
```sql
ALTER TABLE studios
ADD COLUMN studio_code CHAR(1), -- Single letter based on registration order
ADD COLUMN registration_order INT; -- Track order for code assignment
```

**reservations:**
```sql
ALTER TABLE reservations
ADD COLUMN waiver_accepted_at TIMESTAMPTZ, -- Liability waiver acceptance
ADD COLUMN waiver_version VARCHAR(50); -- Track which version was accepted
```

**competition_entries (routines):**
```sql
ALTER TABLE competition_entries
ADD COLUMN scheduled_start_time TIMESTAMPTZ, -- When routine is scheduled
ADD COLUMN display_order INT, -- Position in final schedule
ADD COLUMN age_at_scheduling DECIMAL(4,2), -- Store age when first scheduled
ADD COLUMN last_age_check TIMESTAMPTZ; -- Track when age was last validated
```

**competition_settings:**
```sql
-- Update JSON fields to include new categories
-- age_groups: Add Adult (19-99), Senior Plus (17-18)
-- overall_categories: Add Professional Teacher, Production
-- email_reminders: Add configuration for automated reminders
-- waiver_text: Add liability waiver language
```

---

## 🎨 UI/UX Requirements

### Scheduling Interface Layout

**Left Sidebar - Routine Pool:**
- List of unscheduled routines
- Filters: Classification, Age, Genre, Studio
- Search by routine name or dancer name
- Visual indicators: conflicts (red), age changes (yellow), notes (blue dot)

**Center Panel - Schedule Grid:**
- Timeline view (8 AM - 10 PM)
- Drag-and-drop zones for routines
- Award blocks (purple background)
- Break blocks (gray background)
- Routine blocks show: Entry #, Title, Studio Code, Classification, Age
- Hover shows: Full details, notes, conflicts

**Right Sidebar - Details Panel:**
- Selected routine details
- Conflict warnings
- Studio requests
- CD notes (editable)
- Age change warnings

**Top Toolbar:**
- Save draft
- Finalize schedule (locks numbering)
- Add award block
- Add break block
- Toggle view: Day 1 / Day 2 / Both
- Filter toggles

### Studio Portal - Schedule View

**Features:**
- View only their routines (no competitor info)
- Download PDF of their schedule
- Add notes/requests to routines
- Sequential dancer numbers visible
- Arrival time recommendations

**Layout:**
- Card view per routine
- Routine name, dancers, entry #, scheduled time
- "Add Note" button per routine
- Filter by date/session

### CD Portal - Request Management

**List View:**
- All studio requests in one place
- Columns: Studio, Routine, Request, Date, Status
- Actions: Mark Complete, Ignore, View Routine
- Filter by: Studio, Status, Date Range
- Sort by: Date, Priority (CD can set)

---

## 🔧 Technical Implementation Notes

### Conflict Detection Algorithm

```typescript
// Check minimum spacing between routines for same dancer
function detectConflicts(
  routineId: string,
  proposedStartTime: Date,
  proposedOrder: number
): Conflict[] {
  const conflicts: Conflict[] = [];
  const MIN_ROUTINES_BETWEEN = 6;

  // Get all dancers in this routine
  const dancers = await getDancersInRoutine(routineId);

  // For each dancer, find other scheduled routines
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
          severity: routinesBetween === 0 ? 'critical' : 'warning',
        });
      }
    }
  }

  return conflicts;
}
```

### Studio Code Assignment

```typescript
// Assign studio codes on reservation approval
async function assignStudioCode(studioId: string, competitionId: string) {
  // Get registration order (count approved reservations)
  const order = await prisma.reservations.count({
    where: {
      competition_id: competitionId,
      status: 'approved',
    },
  });

  // Convert to letter (A, B, C, ...)
  const code = String.fromCharCode(65 + order); // 65 = 'A'

  // Update studio
  await prisma.studios.update({
    where: { id: studioId },
    data: {
      studio_code: code,
      registration_order: order + 1,
    },
  });

  return code;
}
```

### Time Rounding

```typescript
// Round time to nearest 5-minute increment
function roundToNearest5Minutes(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 5) * 5;
  const rounded = new Date(date);
  rounded.setMinutes(roundedMinutes);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}
```

### Trophy Helper Report

```typescript
// Generate trophy helper report showing last routine per overall category
async function generateTrophyHelper(competitionId: string) {
  // Get all scheduled routines
  const routines = await getScheduledRoutines(competitionId);

  // Group by overall category (age + classification + size)
  const byCategory = groupBy(routines, (r) =>
    `${r.age_group}-${r.classification}-${r.category_type}`
  );

  // Find last routine in each category
  const lastRoutines = Object.entries(byCategory).map(([category, routines]) => {
    const sorted = sortBy(routines, 'scheduled_start_time');
    const last = sorted[sorted.length - 1];

    return {
      category,
      lastRoutineId: last.id,
      lastRoutineNumber: last.display_order,
      lastRoutineTime: last.scheduled_start_time,
      totalRoutines: routines.length,
    };
  });

  return lastRoutines;
}
```

---

## 📋 Testing Checklist

### Phase 2A MVP Testing

**Scheduling Interface:**
- [ ] Drag routine from pool to schedule → places correctly
- [ ] Drag routine within schedule → reorders and renumbers
- [ ] Filter by classification → shows only matching routines
- [ ] Filter by age → shows only matching routines
- [ ] Filter by genre → shows only matching routines
- [ ] Multiple filters active → shows intersection

**Conflict Detection:**
- [ ] Place routines with same dancer 5 apart → shows warning
- [ ] Place routines with same dancer 6+ apart → no warning
- [ ] Warning shows dancer name clearly
- [ ] Warning shows both routine numbers
- [ ] Override conflict → warning persists but allows placement

**Studio Codes:**
- [ ] First approved studio gets "A"
- [ ] Second approved studio gets "B"
- [ ] Public schedule shows codes only
- [ ] CD schedule shows "Studio A (Full Name)"

**Award Blocks:**
- [ ] Create award block → appears in draggable list
- [ ] Drag award block to schedule → places correctly
- [ ] Award block duration → adjusts following routine times
- [ ] Start time rounds to nearest 5 minutes

**Break Blocks:**
- [ ] Create break block → appears in draggable list
- [ ] Drag break block to schedule → places correctly
- [ ] Break duration options: 15, 30, 45, 60, 90, 120 minutes
- [ ] Start time rounds to nearest 5 minutes

**Studio Feedback:**
- [ ] Studio adds note to routine → saves correctly
- [ ] CD sees note in request list
- [ ] CD marks request complete → updates status
- [ ] CD marks request ignored → updates status
- [ ] Hover over routine → shows studio notes

**Age Change Detection:**
- [ ] Change dancer birthdate → routine highlights yellow
- [ ] Hover shows old age vs. new age
- [ ] CD can drag to correct age group

**Routine Notes:**
- [ ] CD adds private note → saves correctly
- [ ] Private note not visible to studio
- [ ] Hover over routine → shows all notes

**Trophy Helper:**
- [ ] Generate report → shows last routine per category
- [ ] Last routines highlighted on schedule
- [ ] Report updates when schedule changes

**Liability Waiver:**
- [ ] Summary submission page shows waiver
- [ ] Checkbox required to proceed
- [ ] Acceptance timestamp recorded

**Age Divisions:**
- [ ] Adult (19-99) appears in settings
- [ ] Senior Plus (17-18) appears in settings
- [ ] Production category available
- [ ] Professional Teacher category available

---

## 🎯 Success Criteria

**Phase 2A Complete When:**
1. ✅ Selena can manually schedule entire competition via drag-and-drop
2. ✅ Conflict detection warns about spacing violations with dancer names
3. ✅ Studio codes mask identity until finalized
4. ✅ Award and break blocks can be placed manually
5. ✅ Studios can submit notes/requests, CD can manage them
6. ✅ Age changes are detected and highlighted
7. ✅ Trophy helper report shows last routine per category
8. ✅ Liability waiver on summary submission (Dec 23 deadline)
9. ✅ Adult, Senior Plus, Production categories available
10. ✅ Schedule can be finalized (locks numbering)

**Demo Meeting:** One week from today (Nov 18-19, 2025) with Selena and Emily

---

## 📞 Follow-Up Actions

### Immediate (This Week):
- [ ] Daniel: Change studio codes to single letters
- [ ] Daniel: Update Selena's email to registration@glowdancecomp.com (✅ DONE)
- [ ] Selena: Send trophy helper document to Daniel
- [ ] Selena: Send liability waiver language from Michael Wolf Software
- [ ] Selena: Remove old software from website today

### Short-Term (Next Week):
- [ ] Daniel: Build manual scheduling suite (Dec 26 deadline)
- [ ] Daniel: Implement conflict detection with dancer names
- [ ] Daniel: Add classification grouping to schedule view
- [ ] Daniel: Build award/break block system
- [ ] Daniel: Build studio feedback system
- [ ] Daniel: Add liability waiver to summary submission (Dec 23 deadline)

### Mid-Term (Before Dec 26):
- [ ] Selena & Emily: Draft automated email reminder text
- [ ] Daniel: Build trophy helper report
- [ ] Daniel: Add age change detection/highlighting
- [ ] Daniel: Update age divisions (Adult, Senior Plus, Production)
- [ ] Daniel: Schedule demo meeting in one week

### Tomorrow (Nov 12):
- [ ] 10 AM Meeting: Daniel walks Emily and Selena through CD portal features
- [ ] Goal: Reduce dependency on Daniel for support via self-service tools

---

## 📚 Reference Documents

**To Be Provided by Selena:**
- Trophy helper document (format reference)
- Liability waiver language (from Michael Wolf Software)
- Sample studio schedule PDF (Emily to send via email)

**Existing Documentation:**
- `CompPortal/schedule-demo.html` - Interactive demo (category+age grouping)
- `CompPortal/SCHEDULE_DEMO_STATE.md` - Demo feature documentation
- `CompPortal/SETTINGS_MOCKUPS_STATE.md` - Settings mockup documentation
- `docs/specs/PHASE1_SPEC.md` - Phase 1 implementation (registration)

---

## 💡 Key Insights from Meeting

### What Works:
- Selena's manual scheduling method is proven and reliable
- Classification → Age → Genre grouping makes sense
- Studio feedback via notes (not direct edits) maintains CD control
- Trophy helper tool is critical for award timing

### What Changed:
- **PIVOT:** From auto-generation to manual drag-and-drop
- Studio codes simplified to single letters
- Awards timing stays manual (not automated)
- Conflict detection based on routine count, not time

### What's Critical:
- December 23: Liability waiver must be live (registration deadline)
- December 26: Scheduling suite MVP must be complete
- Conflict detection must show dancer names (not just "conflict exists")
- Classifications must stay grouped (core workflow requirement)

### Quotes to Remember:

**Selena on Auto-Generation:**
> "I prefer to have control over the process. Manual scheduling rather than auto-generation."

**Selena on Studio Requests:**
> "I prefer studios submit requests through comments rather than direct schedule modifications."

**Selena on Awards:**
> "I use a trophy helper tool that shows when the last routine in each category is completed, then I manually schedule awards ceremonies."

**Daniel on System Goals:**
> "Building tools to handle routine tasks so I can focus on fixing broken systems."

---

**Document Status:** ✅ Complete - Ready for Implementation
**Next Review:** Demo meeting in one week (Nov 18-19, 2025)
