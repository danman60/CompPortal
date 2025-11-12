# Scheduling Suite - Detailed Specification

**Date:** November 11, 2025
**Source:** Stakeholder Meeting Transcript + Requirements Analysis
**Status:** Comprehensive Detail Capture

---

## 🎯 Hybrid Approach: Manual + Auto-to-Manual

**IMPORTANT DECISION:** System will support BOTH workflows:

1. **Pure Manual:** CD builds schedule from scratch using drag-and-drop (Selena's preference)
2. **Auto-to-Manual:** System can generate draft schedule, CD reviews/edits with warnings (Future enhancement)

**Key Principle:** ALL warnings and conflict detection apply to BOTH workflows. The system never allows dangerous scheduling without explicit CD override.

---

## 📐 Routine Duration & Timing Rules

### Duration Standards ✅ CONFIRMED

**Fixed Durations by Category Type:**
```typescript
const ROUTINE_DURATIONS = {
  solo: { min: 3, max: 3, default: 3 },      // Always 3 minutes
  duet: { min: 3, max: 3, default: 3 },      // Always 3 minutes
  small_group: { min: 3, max: 5, default: 5 }, // 3-5 minutes, assume 5 if unknown
  large_group: { min: 5, max: 7, default: 7 }, // 5-7 minutes, assume 7 if unknown
  production: { min: 15, max: 15, default: 15 }, // ALWAYS 15 minutes ✅ CONFIRMED
};
```

**DECISION LOCKED:**
- Production routine default and maximum length: **15 minutes**
- All other durations: **Assume maximum** for category type if unknown

**Quote from Transcript:**
> Selena: "production should be 15 minutes. It says 7. I don't know if that's just a test right now."

**Rule:** If routine length is unknown, assume the MAXIMUM for that category type to avoid over-scheduling.

---

### Transition Time: ZERO ✅ CONFIRMED

**DECISION LOCKED:** NO buffer/transition time between routines.

**Quote from Transcript:**
> Selena: "If it was 3 minutes and 3 minutes, we'd just go 3… that's their… supposed to be their start and end time. Like, that's supposed to be them setting up, getting on stage, and getting off stage, so I never added that buffer time that might kill our schedule."

**Implementation:**
- Routine ends at 8:03:00 → Next routine starts at 8:03:00 (same second) ✅
- NO automatic spacing added by system ✅
- Duration INCLUDES setup, performance, and teardown ✅

**Example Schedule:**
```
8:00:00 - Routine 101 (Solo, 3 min) → ends 8:03:00
8:03:00 - Routine 102 (Duet, 3 min) → ends 8:06:00
8:06:00 - Routine 103 (Small Group, 5 min) → ends 8:11:00
8:11:00 - Routine 104 (Production, 15 min) → ends 8:26:00
```

---

### Extended Time Routines

**Special Case:** Some routines are flagged for extended time (above category maximum).

**Quote from Transcript:**
> Daniel: "Except for the ones that have been specifically flagged for extended time, in which case it can calculate the actual length of the routine."

**Implementation:**
- Add `extended_time` boolean flag to competition_entries
- Add `actual_duration_minutes` field (only used if extended_time = true)
- If extended_time = false, use category default
- If extended_time = true, use actual_duration_minutes

**Database:**
```sql
ALTER TABLE competition_entries
ADD COLUMN extended_time BOOLEAN DEFAULT FALSE,
ADD COLUMN actual_duration_minutes INT;

-- Validation: actual_duration_minutes required if extended_time = true
```

---

## 🔢 Routine Numbering System

### Starting Number ✅ CONFIRMED

**DECISION LOCKED:** Sequential numbering starting at **100**

**Implementation:**
- Default starting number: 100
- First routine: 100
- Second routine: 101
- Third routine: 102
- Continues sequentially: 103, 104, 105...

**Database:**
```sql
-- Add to competition_settings
ALTER TABLE competitions
ADD COLUMN routine_number_start INT DEFAULT 100;
```

---

### Numbering During Draft vs Finalized

**Draft Mode:**
- Numbers auto-renumber on EVERY drag/move
- Sequential from starting number (100, 101, 102, ...)
- Numbers represent current position only

**Finalized Mode (locked ~1 month before event):**
- Numbers LOCKED to routines
- If CD moves routine after finalization, number stays with routine (no longer sequential)
- This prevents confusion after numbers are printed/distributed

**Quote from Transcript:**
> Daniel: "At this stage, we want all those numbers to change based on their position in the schedule, so they remain sequential, but then closer to competition time, if you end up deciding you have to move this number, now, at a certain point, that number becomes locked to that routine."

**Implementation:**
```typescript
interface CompetitionEntry {
  // ... existing fields
  assigned_number: number | null; // Locked number (if finalized)
  display_order: number;          // Current position
}

function getRoutineNumber(routine: CompetitionEntry, scheduleStatus: ScheduleStatus): number {
  if (scheduleStatus === 'finalized' || scheduleStatus === 'published') {
    return routine.assigned_number!; // Use locked number
  } else {
    return routine.display_order; // Use position (auto-renumbers)
  }
}
```

---

### Multi-Day Numbering

**Question for User:** How should numbering work across multiple days?

**Option A - Continuous:**
- Day 1: 100-250
- Day 2: 251-400
- Day 3: 401-550

**Option B - Reset per day:**
- Day 1: 100-250
- Day 2: 100-250
- Day 3: 100-250

**Recommendation:** Option A (continuous) to avoid duplicate numbers across competition.

---

## 📅 Session & Day Structure

### Day vs Session Terminology ✅ CONFIRMED

**DECISION LOCKED:** Competitions have **~3 hour sessions** within days.

**Transcript Finding:**
> Selena: "the amount per session doesn't really affect, because sometimes it's more, sometimes it's less, depending if it's a whole bunch of solos versus groups"

**User Clarification:**
> "This meant that sessions want to be constrained by minutes, not by amount of routines as routines are different lengths. We still want ~3 hr sessions"

**Structure:**
```
Competition
├── Day 1 (Friday)
│   ├── Morning Session (8 AM - 11 AM) - ~3 hours ✅
│   ├── Afternoon Session (12 PM - 3 PM) - ~3 hours ✅
│   └── Evening Session (5 PM - 8 PM) - ~3 hours ✅
├── Day 2 (Saturday)
│   └── ... same structure
```

**Key Rules:**
- Sessions are **time-based** (not routine count) ✅
- Target session length: **~3 hours** ✅
- CD can place break blocks between sessions
- Routines can flow across session boundaries if needed
- Session start/end times configurable per competition

**Database:**
```sql
-- competition_entries already has scheduled_start_time (timestamp)
-- Derive day from timestamp
-- No session field needed initially

-- If sessions needed later:
ALTER TABLE competition_entries
ADD COLUMN session_id UUID REFERENCES schedule_sessions(id);

CREATE TABLE schedule_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  session_name VARCHAR(100) NOT NULL, -- "Day 1 Morning", "Day 2 Afternoon"
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_number INT NOT NULL,
  session_order INT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```

---

## 🎭 Classification Grouping Strategy

### Strict vs Flexible Grouping

**Transcript Finding:** Selena mixes classifications for variety and hotel strategy.

**Quote:**
> Selena: "I take small groups from another level, and I'll put them in the middle. I would switch… I would select, I want to change now from Emerald Solos, I want to switch now to Crystal small groups."

**Key Insight:** Grouping is PREFERRED but NOT STRICT. CD needs flexibility.

**Selena's Workflow:**
1. Start with one classification (e.g., Emerald Solos)
2. Place several routines
3. Switch to another classification for variety (e.g., Crystal Small Groups)
4. Place a few routines
5. Switch back to original classification
6. Continue this mixing pattern

**Why Mix?**
- Prevent "all novice on one day" (hotel attrition)
- Add variety for audience
- Strategic placement for specific studios/dancers

**Implementation:**
- Filter panel shows available classifications
- CD can toggle classifications on/off
- Multiple classifications can be visible at once
- Routine pool shows filtered routines sorted by age, then genre
- NO enforcement of "all Emerald together" - CD has full control

---

### Hotel Attrition Prevention

**Critical Business Rule:** Avoid scheduling all novice (Emerald) routines on one day.

**Quote:**
> Selena: "I would never do all novice in one day, and Emily would tell you for hotel pickup, never do that. It will screw you, and you'll end up with attrition. If the parent has to only dance on one day, then they're gonna leave, and that family's gonna leave. So you need to spread out all levels over all days."

**System Warning:**
- Detect if all Emerald routines are on Day 1
- Show warning: "⚠️ All Emerald (Novice) routines are on Day 1. This may cause hotel attrition. Consider spreading across multiple days."
- CD can override but should be warned

**Advanced Warning (Future):**
- Detect if any STUDIO's routines are all on one day
- Warn: "⚠️ Studio 'Starlight Dance' has all routines on Day 1. Family may check out early."

---

## 🏨 Studio Schedule Requirements

### Studio PDF Content

**Question from Analysis:** What do studios see in their PDF?

**Transcript Finding:**
> Selena: "they get a PDF. Individual PDF... it gives you, like, a printout, because they actually post it for their parents, and sometimes that's how their parents find it."

**Clarification Needed:** Does the PDF show:
- **Option A:** Only their routines (clean, focused)
- **Option B:** Their routines + some context (5 routines before/after for timing)
- **Option C:** Full schedule with their routines highlighted

**Recommendation:** Option B - Show their routines with 5-routine context window before/after each.

**Why Context?**
- Parents need to know when to arrive (not just their routine time)
- Shows if there's a long gap between routines (can leave venue)
- Helps with arrival planning

**PDF Format:**
```
GLOW DANCE COMPETITION 2026
Studio: Starlight Dance Academy
Schedule: Day 1 - Friday, March 15

--- CONTEXT (arrive by) ---
95  8:45 AM  "Another Studio's Routine"  [grayed out]
96  8:48 AM  "Another Studio's Routine"  [grayed out]

--- YOUR ROUTINES ---
97  8:51 AM  "Sparkle & Shine"  Solo  Sarah Johnson  [highlighted]
98  8:54 AM  "Dream Big"  Duet  Sarah J., Emma K.  [highlighted]

--- CONTEXT ---
99  8:57 AM  "Another Studio's Routine"  [grayed out]
100 9:00 AM  "Another Studio's Routine"  [grayed out]

[Long gap - no routines for Studio]

--- CONTEXT (arrive by) ---
145 11:30 AM  "Another Studio's Routine"  [grayed out]

--- YOUR ROUTINES ---
146 11:33 AM  "Warriors"  Small Group  5 Dancers  [highlighted]
```

---

### Studio Portal Schedule View

**Features:**
- View their schedule (only their routines visible by default)
- Option to "Show context" (5 routines before/after)
- Download PDF button
- Add notes/requests to specific routines
- Filter by day, dancer, category type

**No Competitor Information:**
> Daniel: "dancers should only see their own routines and schedules, with no competitor information visible"

**Implementation:**
- Filter competition_entries WHERE studio_id = current_user_studio
- Show routine number, time, title, dancers, category
- NO studio names except their own
- PDF generation uses same filtering

---

## 👨‍⚖️ Judge Schedule & Tablet Display

### Judge Requirements

**Transcript Finding:**
> Selena: "when it gets to that part where we have to print it for the judges, or have it on their tab"

**Question:** What do judges need to see?

**Likely Requirements:**
- Full studio names (NOT codes) - judges need to know who they're judging
- Routine number, title, studio, dancers, category, classification, age
- Different format than public schedule (more detailed)

**Phase Decision:**
- **Phase 2:** Focus on CD scheduling + studio views
- **Phase 3:** Judge tablet app + scoring integration

**For Phase 2:**
- Document judge requirements
- Ensure schedule data model supports judge view
- Defer tablet app to Phase 3

---

## 🏆 Awards System Details

### Overall Awards vs Special Awards

**Transcript Finding:**
> Daniel: "The only two types of award classifications are overalls and special awards. Special awards are custom, bespoke text fields."

**Overall Awards:**
- Based on: Age + Classification + Category Type (solo/duet/group)
- NOT based on: Genre (tap, jazz, contemporary, etc.)
- System calculates top performers (scoring integration - Phase 3)
- Trophy helper shows when last routine in each overall category completes

**Special Awards:**
- Custom text fields (e.g., "Best Costume", "Judges' Choice", "Scholarship Award")
- Not tied to specific category combinations
- Manually selected winners
- Can be announced at any time

**Award Block Types:**
```typescript
interface AwardBlock extends ScheduleBlock {
  block_type: 'award';
  award_type: 'overall' | 'special';
  metadata: {
    overall_category?: string; // "Solo-Junior-Emerald"
    award_name?: string; // For special awards: "Best Costume"
    num_placements?: number; // How many places (1st, 2nd, 3rd, etc.)
  };
}
```

**Placement vs Ribbons:**
> Selena: "we don't give out ribbons anymore. We don't do ribbons for Glow. We don't need to do 1st through fifth."
> Dani: "we still, like, say, like, in the top three, kind of, if there's a lot in the same category, we kind of, like, say in third place, or in the second place."

**Glow Specific:**
- NO ribbons (no physical awards for placement)
- Still announce top 3 placements verbally
- Overalls get trophies (physical awards)

**EMPWR May Be Different:**
- May use ribbons
- May announce more than top 3
- Configuration per tenant

---

### Trophy Helper Report Details

**Purpose:** Help CD determine when to place award ceremonies.

**Shows:**
1. All overall categories (age + classification + size)
2. Last routine in each category (number, title, time)
3. Total routines in that category
4. Suggested award time (last routine + 30 minutes)
5. Button to create award block

**Quote:**
> Selena: "I use a trophy helper tool that shows when the last routine in each category is completed, then I manually schedule awards ceremonies."

**Additional Feature - Highlight Last Routines:**
- Last routine in each overall category gets highlighted on schedule
- Visual indicator (e.g., trophy icon, gold border)
- Helps CD see where award breaks should go

**Trophy Helper UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Trophy Helper Report                                            │
├─────────────────────────────────────────────────────────────────┤
│ Overall Category    Last Routine  Time    Routines  Suggested   │
├─────────────────────────────────────────────────────────────────┤
│ Solo Ages 7-9       #125 "Dance"  2:15 PM    12    2:45 PM  ⭐  │
│ (Emerald)                                          [Create Award]│
├─────────────────────────────────────────────────────────────────┤
│ Duet Ages 7-9       #138 "Dream"  2:45 PM     8    3:15 PM  ⭐  │
│ (Emerald)                                          [Create Award]│
├─────────────────────────────────────────────────────────────────┤
│ Small Group 7-9     #156 "Stars"  3:30 PM     6    4:00 PM  ⭐  │
│ (Emerald)                                          [Create Award]│
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Routine Notes & Studio Requests

### Three Types of Notes

**1. CD Private Notes:**
- Only visible to CD
- Internal reminders (e.g., "Check music quality", "VIP studio")
- Can be added at any time
- Not visible to studios or judges

**2. Studio Request Notes:**
- Added by studios in their portal
- Request specific times or changes (e.g., "Please schedule after 2pm")
- Visible to CD in request management list
- CD can mark: completed, ignored, or pending
- Studio can see status of their requests

**3. Submission Notes:**
- Notes added during original routine submission
- Carried forward to scheduling phase
- Visible to CD during scheduling (on hover)
- Example: "Dancer has school conflict after 3pm"

**Database Design:**
```sql
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES competition_entries(id),
  note_type VARCHAR(20) NOT NULL
    CHECK (note_type IN ('cd_private', 'studio_request', 'submission_note')),
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  author_role VARCHAR(20) NOT NULL, -- 'competition_director', 'studio_director'

  -- For studio requests only
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'ignored')),
  priority VARCHAR(10) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX idx_routine_notes_routine_type
  ON routine_notes(routine_id, note_type);

CREATE INDEX idx_routine_notes_requests
  ON routine_notes(status, note_type, priority)
  WHERE note_type = 'studio_request';
```

---

### Studio Request Management System

**CD Request List View:**

**Columns:**
- Studio name
- Routine number
- Routine title
- Request text
- Date submitted
- Priority (low/normal/high)
- Status (pending/completed/ignored)
- Actions

**Filters:**
- Studio dropdown
- Status (pending/completed/ignored/all)
- Priority
- Date range

**Actions:**
- Click routine → jump to routine in schedule
- Mark complete → status = completed, completed_at = now
- Mark ignored → status = ignored
- Change priority → CD can escalate/de-escalate

**Quote:**
> Selena: "I prefer studios submit requests through comments rather than direct schedule modifications. I need to track and manage requests with the ability to mark completed or ignored changes."

**Important Timing:**
> Selena: "Studios must submit requests BEFORE schedule generation, not after."

**Implementation:**
- Allow studios to add requests during draft mode
- Once finalized, disable new requests (can still view existing)
- Once published, all requests locked (read-only)

---

### Email vs Portal Notifications

**Transcript Finding:**
> Selena: "when I got an email, they'd be like, okay, I need to move, this needs to go this time. I have a checklist, so I'll print it out."

**Current Workflow (Old System):**
- Studios send emails with requests
- Selena prints list
- Manually tracks what's done

**New Workflow (CompPortal):**
- Studios add requests in portal
- CD sees centralized list in app
- Mark completed in app (no printing needed)
- Email notification OPTIONAL (configurable)

**Configuration:**
```typescript
interface NotificationSettings {
  email_cd_on_new_request: boolean; // Email CD when studio adds request
  email_studio_on_status_change: boolean; // Email studio when CD marks complete/ignored
  email_studio_schedule_changes: boolean; // Email when their routines move
}
```

---

## 🔄 Age Change Detection Details

### When Age Changes Occur

**Scenarios:**
1. Studio updates dancer birthdate after routine submission
2. Dancer birthdate imported incorrectly, then corrected
3. Dancer's birthday passes between submission and competition (rare)

**Impact:**
- Routine's average age changes
- May move to different age group (e.g., Mini → Junior)
- Trophy helper categories affected
- Overall awards affected

---

### Detection Algorithm

**Trigger Points:**
1. When dancer birthdate is updated (after create)
2. Daily scheduled job checks all scheduled routines
3. Manual "Check Age Changes" button for CD

**Process:**
```typescript
async function detectAgeChanges(competitionId: string) {
  // Get all routines with baseline age stored
  const routines = await getScheduledRoutinesWithBaselineAge(competitionId);

  for (const routine of routines) {
    // Recalculate current age
    const currentAgeResult = inferAgeGroup(routine.dancers, routine.classification);
    const currentAvgAge = (currentAgeResult.oldestAge + currentAgeResult.youngestAge) / 2;
    const baselineAvgAge = routine.age_at_scheduling;

    // Check if age group changed
    if (currentAgeResult.ageGroup !== routine.age_group) {
      // Create tracking record
      await createAgeChangeEvent({
        routine_id: routine.id,
        old_age_group: routine.age_group,
        new_age_group: currentAgeResult.ageGroup,
        old_average_age: baselineAvgAge,
        new_average_age: currentAvgAge,
        affected_dancers: findDancersWithChangedBirthdates(routine),
      });

      // Highlight routine on schedule
      await flagRoutineForReview(routine.id, 'age_changed');
    }
  }
}
```

---

### UI Indicators

**On Schedule:**
- Yellow background highlight
- Warning icon (⚠️)
- Tooltip: "Age group changed: Was Mini (8.5 avg), now Junior (9.2 avg)"

**In Details Panel:**
```
⚠️ Age Group Changed

Original: Mini (Ages 8-9)
Current: Junior (Ages 10-12)

Affected Dancer:
- Sarah Johnson (DOB changed from 2016-03-15 to 2015-03-15)

Action Required:
☐ Drag routine to Junior age group section
☐ Update trophy helper calculations
☐ Mark as resolved
```

**Resolution:**
- CD drags routine to correct age group section
- Click "Mark as Resolved"
- Warning clears
- Age change tracking record updated: resolved = true

---

## 🎨 Studio Code System Details

### Code Assignment Logic

**Rule:** Single letter (A-Z) based on reservation approval order.

**Quote:**
> "Change studio codes from current format to single letters based on registration order."

**Process:**
1. Studio submits reservation request
2. CD approves reservation
3. System assigns next available letter (A, B, C, ...)
4. Code stored in studios table
5. Code displayed everywhere until schedule published

---

### Code Visibility Rules

**Draft Mode:**
- Public view: Not visible (schedule not public yet)
- Studio view: See their own code + name ("You are Studio A")
- CD view: See codes + full names ("Studio A (Starlight Dance Academy)")

**Finalized Mode:**
- Public view: Still not visible (schedule not public yet)
- Studio view: See their own code + name
- CD view: See codes + full names
- Studios can see other routines' codes (not names)

**Published Mode:**
- Public view: Full studio names revealed (codes no longer needed)
- Studio view: Full names visible
- CD view: Full names visible
- Historical reference: Codes still in database for audit trail

---

### Display Examples

**CD View During Draft:**
```
Time     Entry  Title            Studio                          Category
8:00 AM  100    "Sparkle"        Studio A (Starlight Dance)     Solo
8:03 AM  101    "Dream"          Studio B (Elite Performers)    Duet
8:06 AM  102    "Warriors"       Studio A (Starlight Dance)     Small Group
```

**Studio A View During Draft:**
```
Time     Entry  Title            Studio      Category
8:00 AM  100    "Sparkle"        Studio A    Solo
8:06 AM  102    "Warriors"       Studio A    Small Group

[Note: You are Studio A. Competitor names hidden until schedule published.]
```

**Public View After Published:**
```
Time     Entry  Title            Studio                  Category
8:00 AM  100    "Sparkle"        Starlight Dance         Solo
8:03 AM  101    "Dream"          Elite Performers        Duet
8:06 AM  102    "Warriors"       Starlight Dance         Small Group
```

---

### What if 26+ Studios?

**Fallback Strategy:**
1. A-Z (26 studios)
2. AA, AB, AC... (next 26 studios)
3. BA, BB, BC... (next 26 studios)

**Code:**
```typescript
function generateStudioCode(registrationOrder: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  if (registrationOrder < 26) {
    // A-Z
    return letters[registrationOrder];
  } else if (registrationOrder < 52) {
    // AA-AZ
    return 'A' + letters[registrationOrder - 26];
  } else {
    // BA-BZ, CA-CZ, etc.
    const firstLetter = letters[Math.floor((registrationOrder - 26) / 26)];
    const secondLetter = letters[(registrationOrder - 26) % 26];
    return firstLetter + secondLetter;
  }
}
```

---

## 🚨 Conflict Detection - Extended Rules

### Primary Rule: 6-Routine Minimum

**Already Documented:** Minimum 6 routines between same dancer.

**Severity Levels:**
- **Critical (0 routines):** Back-to-back, physically impossible
- **Error (1-3 routines):** Serious issue, likely to cause problems
- **Warning (4-5 routines):** Close to minimum, watch carefully

---

### Additional Conflict Types to Consider

**1. Same Dancer, Multiple Studios:**
- Dancer registered with 2 different studios
- Both studios scheduled in same competition
- Need conflict detection across studios
- Warning: "Sarah Johnson appears in Studio A and Studio B routines"

**2. Costume Change Time:**
- If same dancer in 2 routines with different costumes
- Need minimum time for costume change
- Not mentioned in transcript but logical requirement
- Recommendation: 3 routines minimum if costume change noted

**3. Age Group Back-to-Back:**
- May want to avoid same age group back-to-back for variety
- Recommendation: Warning only (not blocking)
- "3 consecutive Junior routines - consider mixing age groups"

**4. Classification Back-to-Back:**
- Similar to age group - variety consideration
- Warning: "5 consecutive Emerald routines - consider mixing levels"

**5. Same Studio Back-to-Back:**
- If studio has multiple routines, may want spacing
- Helps with studio arrival logistics
- Warning: "Studio A has 4 consecutive routines - ensure they're prepared"

---

### Conflict Override System

**When CD Overrides:**
1. Click "Override" on conflict warning
2. Required: Enter reason (text field)
3. System records override in schedule_conflicts table
4. Warning remains visible but marked as "overridden"
5. Audit trail maintained

**Override Reasons (Examples):**
- "Dancers are very experienced, can handle back-to-back"
- "No costume change needed"
- "Families requested to go early and get done"
- "Studio explicitly confirmed they can handle this"

---

## 📊 Scoring & Tabulation Integration (Phase 3)

### Trophy Helper Dependency on Scoring

**Quote:**
> Daniel: "We need to know when an overall closes, so then you can start the tabulation early to understand the right award structure."

**Phase 2 Requirement:**
- Trophy helper shows WHEN last routine completes
- CD manually places award ceremony after that time

**Phase 3 Addition:**
- System calculates overall winners from scores
- Trophy helper shows: "Last routine complete - Scoring in progress"
- Tabulation system flags when overall category scoring complete
- Award ceremony can't start until scoring complete

**Data Flow:**
```
Routine completes
→ Judge scores
→ All scores submitted for category
→ Tabulation calculates overall winners
→ Trophy helper updates: "Ready for awards"
→ CD places award ceremony
→ Awards announced
```

---

## 🎵 Music Submission System (Phase 2B)

### Music Deadline: 30 Days Before Event

**Quote:**
> Emily: "It's due 30 days prior to the event."
> Selena: "Some of them start creeping two weeks before, truly, but… I don't really need their music online for my side... I really don't need it till, like, the week before each location, but we tell them 30 days."

**Key Insights:**
- Official deadline: 30 days before
- Reality: Many submit late (2 weeks before)
- CD doesn't actually need it until 1 week before
- Music plays a role in generation of "link for whoever plays the music"

---

### Music Submission Workflow

**Phase 1 (Already Built):**
- Studios can upload music files during routine submission
- Files stored in Supabase Storage
- Associated with competition_entries

**Phase 2B (Future):**
- Track music submission status per routine
- Flag routines missing music
- Email reminders at configurable intervals (14 days, 7 days, 3 days, 1 day)
- Generate music playlist/link for DJ/tech crew

---

### Music Tracking Fields

**Database:**
```sql
ALTER TABLE competition_entries
ADD COLUMN music_file_url VARCHAR(500),
ADD COLUMN music_submitted_at TIMESTAMPTZ,
ADD COLUMN music_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN music_approved_at TIMESTAMPTZ,
ADD COLUMN music_notes TEXT; -- CD can add notes about music quality
```

**Status Logic:**
```typescript
function getMusicStatus(routine: CompetitionEntry, competitionDate: Date): MusicStatus {
  const daysUntilComp = Math.floor(
    (competitionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (!routine.music_file_url) {
    if (daysUntilComp <= 7) return 'critical'; // 1 week or less
    if (daysUntilComp <= 14) return 'warning'; // 2 weeks or less
    if (daysUntilComp <= 30) return 'due_soon'; // 30 days or less
    return 'not_due';
  }

  if (!routine.music_approved) return 'pending_review';
  return 'approved';
}
```

---

## 📧 Email Notification System Details

### Configurable Reminders

**Quote:**
> Daniel: "Allow staff to set their own deadlines and warnings through a panel rather than hard-coding them."

**Reminder Types:**
1. Registration deadline reminders
2. Music submission deadline reminders
3. Summary submission deadline reminders
4. Schedule release notifications
5. Competition day reminders

---

### Registration Deadline Example

**Configuration UI:**
```
Registration Deadline: December 23, 2025

Email Reminders:
☑ 14 days before (Dec 9)  [Edit Template]
☑ 7 days before (Dec 16)  [Edit Template]
☑ 3 days before (Dec 20)  [Edit Template]
☑ 1 day before (Dec 22)   [Edit Template]
☑ Day of deadline (Dec 23) [Edit Template]

[Add Reminder] [Save Configuration]
```

**Template Variables:**
- `{studio_name}` - Studio name
- `{competition_name}` - Competition name
- `{deadline_date}` - Formatted deadline date
- `{days_remaining}` - Number of days until deadline
- `{portal_url}` - Link to their portal

**Database:**
```sql
CREATE TABLE email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  reminder_type VARCHAR(50) NOT NULL, -- 'registration', 'music', 'summary', etc.
  days_before INT NOT NULL,
  email_subject VARCHAR(200) NOT NULL,
  email_body TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

-- Scheduled job checks daily for reminders to send
```

---

### Schedule Change Notifications

**When to Notify:**
- Studio's routine time changes (after finalized)
- Studio's routine moved to different day
- Awards ceremony time changes (affects arrival)

**Quote:**
> Selena: "Email studio when their routines move" (implied from request management discussion)

**Configuration:**
```typescript
interface ScheduleNotificationSettings {
  notify_on_time_change: boolean;
  notify_on_day_change: boolean;
  notify_on_awards_change: boolean;
  min_time_change_minutes: number; // Only notify if change > X minutes
}
```

---

## 🎭 Additional Details from Transcript

### Detail 11: Demo Meeting Tomorrow

**Quote from Transcript:**
> Daniel: "I'm going to show you exactly how to do it, and then you can kind of..."

**Context:** Meeting scheduled for November 12 at 10 AM to walk Emily and Selena through CD portal features.

**Purpose:**
- Reduce dependency on Daniel for support
- Teach self-service tools
- Emily will help train Selena

---

### Detail 12: Routine Count Display

**Feature:** Show how many routines left to schedule in filtered view.

**Quote:**
> Selena: "It tells me how many I haven't scheduled yet and in the order of the age"

**Implementation:**
- Filter panel shows: "Emerald Solos (8 unscheduled)"
- As routines are placed: Counter decreases
- Visual progress: "5 of 8 scheduled"

---

### Detail 13: Remove Old Software from Website

**Action Item:**
> Selena: "Remove old software from website today"

**Context:** Glow is migrating to CompPortal, needs to remove references to old system to avoid confusion.

---

### Detail 14: Sample Studio Schedule PDF

**Action Item:**
> Emily: "Share sample studio schedule PDF with Daniel via email"

**Purpose:** Show exact format/content that studios expect in their downloadable schedule.

---

### Detail 15: Tabulation/Scoring is Separate

**Quote:**
> Daniel: "Scoring and the judge's scoring panel and stuff, we can defer that as well. It sounds like scheduling is latest and loudest."

**Clarification:** Scoring/judging is PHASE 3, not Phase 2.

**Phase 2 Focus:** Scheduling only
**Phase 3 Focus:** Judging, scoring, tabulation, awards calculation

---

### Detail 16: Judge Demo Exists

**Quote:**
> Daniel: "There is a demo of the judge scoring a little slider, and you slide the score"

**Context:** Judge scoring interface has been prototyped but not implemented in production.

---

### Detail 17: Routine Category Field Display

**Quote:**
> Selena: "Routine and add a note saying dance at a category. So when it goes to the main schedule, where everyone can see it, and the judges, when it gets to that part where we have to print it for the judges, or have it on their tab."

**Interpretation:** Some routines need a note about which category they're competing in (context: special award categories or custom classifications).

---

### Detail 18: Parent Access to Schedule

**Quote:**
> Selena: "it gives you, like, a printout, because they actually post it for their parents, and sometimes that's how their parents find it."

**Key Insight:** Studios share PDF schedule with parents.

**Recommendation:**
- Make PDF format parent-friendly
- Include venue information
- Include arrival time recommendations
- Easy to read on mobile devices

---

### Detail 19: Multiple Days/Locations

**Quote:**
> Selena: "I really don't need it till, like, the week before each location"

**Key Word:** "Each location" - implies multiple locations within one competition.

**Question:** Does Glow have:
- Option A: One competition, one location, multiple days
- Option B: One competition, multiple locations (different cities/venues)

**Recommendation:** Support both. Competition settings should allow multiple locations.

---

### Detail 20: Liability Waiver Source

**Action Item:**
> Selena: "Send Daniel the liability waiver language from Michael Wolf Software for insurance purposes"

**Context:** Using industry-standard waiver language from established competition software provider.

---

### Detail 21: Trophy Helper Document Format

**Action Item:**
> Selena: "Send Daniel the trophy helper document so he can see the format"

**Purpose:** Reference document showing expected format/content of trophy helper report.

---

### Detail 22: Account Claiming Status

**Quote:**
> Daniel: "About 80% of people hadn't claimed their accounts yet"

**Context:** Studios have been invited but haven't set passwords yet.

**Implication:** Studio feedback system needs to account for studios that haven't logged in yet.

---

### Detail 23: Routine Order by Age Within Classification

**Quote:**
> Selena: "in the order of the age, and I take those and start inputting them until there's no more left"

**Sorting Logic:** Within filtered classification, routines should be sorted by age (youngest to oldest or vice versa).

**Implementation:**
```typescript
// When filtering by classification
const filteredRoutines = routines
  .filter(r => r.classification === selectedClassification)
  .sort((a, b) => a.age_group_order - b.age_group_order); // Petite < Mini < Junior < Teen < Senior < Adult
```

---

### Detail 24: Schedule Finalization Timing

**Quote:**
> Daniel: "closer to competition time, if you end up deciding you have to move this number, now, at a certain point, that number becomes locked to that routine"

**Timing:** "~1 month before event"

**Question:** Exact timing?
- 30 days before?
- 4 weeks before?
- Configurable per competition?

**Recommendation:** Configurable, default to 30 days.

```sql
ALTER TABLE competitions
ADD COLUMN schedule_lock_days_before INT DEFAULT 30;
```

---

### Detail 25: No Ribbon Physical Awards

**Quote:**
> Selena: "we don't give out ribbons anymore. We don't do ribbons for Glow. We don't need to do 1st through fifth."

**Glow Specific:**
- Verbal placement announcements (1st, 2nd, 3rd)
- NO physical ribbons for placement
- Overall awards get trophies

**EMPWR May Be Different:**
- Check if EMPWR uses ribbons
- Configuration per tenant

---

### Detail 26: Categories Don't Split

**Quote:**
> Emily: "split the categories"
> Selena: "we did only up to 5, but we don't give out ribbons anymore"

**Context:** Old system split categories if more than 5 competitors. Glow no longer does this.

**Rule:** NO splitting categories regardless of size (20 kids = 20 kids, all compete together).

---

### Detail 27: Session Placement Only

**Quote:**
> Emily: "you just do session placement, you just do the placement"

**Interpretation:** Glow does "session placement" (verbal recognition) but not ribbons.

**Question:** What is "session placement"?
- Verbal recognition during session?
- Certificate of participation?
- Just score/feedback, no physical award?

---

### Detail 28: Multiple Filtering Active

**Quote:**
> Selena: "I would be able to... my selection from Crystal and go back to Emerald, and then now Crystal is no longer on my screen, so I have just my Emerald sorted"

**Key Feature:** Toggle filters on/off, only one active at a time OR multiple filters combined?

**Interpretation:** Selena toggles between classifications (only one at a time).

**But Also:** May want multiple filters (e.g., "Emerald" + "Solo" + "Age 7-9")

**Recommendation:** Support both:
- Classification: Radio buttons (only one)
- Category Type: Checkboxes (multiple)
- Age Group: Checkboxes (multiple)
- Genre: Checkboxes (multiple)

---

### Detail 29: Auto vs Manual Toggle

**User Clarification:**
> "I think we should have the manual option as described as well as the auto to manual flow we're already building, as long as all the warnings are there."

**Implementation:**
```
Schedule Creation Options:

○ Build Manually (Selena's Preference)
  - Start with empty schedule
  - Drag routines from pool to timeline
  - Full manual control

○ Generate Draft (AI-Assisted)
  - System generates initial schedule
  - Uses rules and preferences
  - CD reviews and edits
  - All conflict warnings still apply

[Continue]
```

**Key Principle:** Both workflows use same conflict detection, warnings, and validation rules. AI generation is just a starting point, not a final product.

---

### Detail 30: Schedule Review Rounds

**Quote:**
> Daniel: "And then there's, like, rounds of feedback. So they give you… you get a bunch of thoughts from people, you can kind of…"

**Workflow:**
1. CD creates draft schedule
2. Studios view their schedules
3. Studios submit notes/requests
4. CD reviews requests
5. CD makes changes
6. (Repeat rounds 2-5 as needed)
7. CD finalizes schedule (locks numbers)
8. Final review period (limited changes)
9. CD publishes schedule (reveals names)

---

### Detail 31: Notification in Portal

**Quote:**
> Selena: "Or, like, if it's a notification in this portal, I've never done it that way"

**Feature:** In-app notifications for CD when studios submit requests.

**Implementation:**
- Bell icon in top nav
- Badge with count of pending requests
- Click to see notification list
- Click notification → jumps to request in list

---

### Detail 32: Checklist Tracking

**Quote:**
> Selena: "I have a checklist, so I'll print it out"

**Feature Request:** CD wants printable checklist of studio requests.

**Implementation:**
- "Print Checklist" button on request list
- Generates PDF with checkboxes
- Can physically check off items
- OR: Digital checklist in app (checkbox per request)

---

### Detail 33: Email Forwarding Reduction

**Quote:**
> Emily: "Download/train Selena on new CD portal features to avoid forwarding those requests to Daniel"

**Goal:** Self-service tools reduce support burden.

**Strategy:**
- Build intuitive UI
- Add tooltips/help text
- Create video tutorials
- In-app guided tours
- Reduce need to ask Daniel for help

---

### Detail 34: Same App for All Roles

**Quote:**
> Dani: "Same app."
> Daniel: "There's… there is a demo of the judge scoring..."

**Clarification:** All roles (SA, CD, SD, Judges) use same app with different views/permissions.

**Not:** Separate apps for each role.

---

### Detail 35: Schedule State Persistence

**Important:** Schedule state should save automatically.

**Features:**
- Auto-save on every drag operation
- "Last saved: 2 minutes ago" indicator
- No explicit "Save" button needed (but provide one for peace of mind)
- Conflict detection runs on auto-save
- Undo/redo support (10-step history)

---

### Detail 36: Responsive Design Requirements

**Context:** CD may use tablet/laptop for scheduling, studios may use mobile.

**Requirements:**
- CD scheduling: Desktop/laptop optimized (drag-and-drop needs mouse)
- Studio schedule view: Mobile-friendly (responsive, easy to read)
- Studio PDF: Mobile-friendly (readable on phone)
- Filters: Touch-friendly on tablet

---

### Detail 37: Dark Mode / Light Mode

**Not mentioned in transcript, but consider:**
- CD may schedule late at night
- Dark mode reduces eye strain
- Industry standard for modern apps

**Recommendation:** Support both, default to light mode.

---

### Detail 38: Accessibility Requirements

**Legal Requirement:** ADA compliance for public-facing schedule.

**Requirements:**
- Screen reader support
- Keyboard navigation
- High contrast mode
- Text size adjustable
- ARIA labels on all interactive elements

---

### Detail 39: Browser Compatibility

**Target Browsers:**
- Chrome (primary)
- Safari (Mac users)
- Firefox (some users)
- Edge (Windows users)

**NOT:** Internet Explorer (deprecated)

**Testing:** Verify drag-and-drop works in all target browsers.

---

### Detail 40: Performance Targets

**Scale:**
- Glow: ~200-300 routines per competition
- EMPWR: Similar scale
- Future clients: Up to 500 routines?

**Performance Targets:**
- Schedule load time: < 2 seconds
- Drag-and-drop lag: < 100ms
- Conflict detection: < 500ms
- Filter application: < 200ms

**Optimization:**
- Virtualize long lists (react-window)
- Debounce conflict detection
- Index database properly
- Cache frequently accessed data

---

## 📋 Summary of All Details

**Total Details Captured:** 40+

**Categories:**
1. **Routine Timing:** Durations, transitions, extended time (Details 1-3)
2. **Numbering:** Starting number, draft vs finalized, multi-day (Details 4-6)
3. **Structure:** Days vs sessions, classification grouping (Details 7-9)
4. **Studio Views:** PDF content, portal features, parent access (Details 10, 14, 18-19)
5. **Awards:** Overall vs special, trophy helper, no ribbons (Details 15-17, 25-27)
6. **Notes & Requests:** Three types, management system, email vs portal (Details 20-23, 31-33)
7. **Conflicts:** Extended rules, override system (Detail 28)
8. **Integration:** Scoring (Phase 3), music submission (Phase 2B) (Details 29-30)
9. **Action Items:** Meetings, documents, migrations (Details 11, 13, 21-22, 34)
10. **Technical:** Auto-save, responsive, performance (Details 35-40)

---

**Document Status:** ✅ Comprehensive - 40+ details captured
**Next Action:** User review and prioritization
**Implementation:** Use as reference during Phase 2 development
