# Schedule Review Workflow Specification

**Feature:** Multi-version schedule review with Studio Director feedback collection
**Date:** November 26, 2025
**Status:** Planning - Phase 2 Extension

---

## Overview

Competition Directors create draft schedules and send them to Studio Directors for review. Studio Directors can add notes/requests on their own routines. The CD iterates through multiple versions (v0, v1, v2...) based on feedback.

---

## User Roles

1. **Competition Director (CD)** - Creates schedules, reviews SD feedback, makes adjustments
2. **Studio Director (SD)** - Views their studio's schedule, submits notes/requests on routines

---

## Workflow States

### Schedule States

| State | CD Access | SD Access | Description |
|-------|-----------|-----------|-------------|
| **Draft** | Full editing | No access | CD working on schedule, not visible to SDs |
| **Under Review** | Full editing (creates new version) | View + Add notes | Schedule sent to SDs, deadline active |
| **Review Closed** | Full editing | View only | Deadline passed, SDs can't add notes until re-sent |

### Version Flow

```
Draft v0 → Send to SDs → Under Review v0 (SDs add notes, deadline active)
                       ↓
                   CD edits → Draft v1 created
                       ↓
              Send v1 to SDs → Under Review v1 (SDs add notes, new deadline)
                       ↓
                   (repeat)
```

**Key Rules:**
- When CD clicks "Send Draft to Studios", current version LOCKS
- CD can immediately start editing v1 while v0 is under review
- Locked version stays visible to SDs until CD sends next version
- Each send creates a new review period with separate deadline

---

## Competition Director Features

### 1. Schedule Page Enhancements

**Current Location:** `/dashboard/director-panel/schedule`

#### Version Display
```
┌─────────────────────────────────────────────────┐
│ Schedule - Version 2 (Under Review)             │
│ Feedback deadline: 3 days remaining             │
│                                                  │
│ [Send Draft to Studios] [Save Schedule]         │
└─────────────────────────────────────────────────┘
```

**Version Indicator Requirements:**
- Display current version number (v0, v1, v2, etc.)
- Show state: "Draft", "Under Review v2", "Review Closed v1"
- Show days remaining if under review
- Show "Review Closed" if deadline passed

#### Send Draft to Studios Button

**Trigger:** CD clicks "Send Draft to Studios"

**Modal:**
```
┌──────────────────────────────────────────────┐
│  Send Schedule to Studio Directors          │
├──────────────────────────────────────────────┤
│                                              │
│  Set feedback deadline:                      │
│  [  7  ] days from now                      │
│                                              │
│  This will:                                  │
│  • Lock current version (v2)                │
│  • Notify all Studio Directors via email   │
│  • Allow SDs to add notes until deadline    │
│  • Create v3 when you make changes          │
│                                              │
│  [ Cancel ]              [ Send to Studios ] │
└──────────────────────────────────────────────┘
```

**Modal Fields:**
- Feedback window duration (integer, in days)
- Default: 7 days
- Range: 1-30 days

**Action:**
1. Lock current version
2. Set deadline = now + X days
3. Create email notifications for all registered SDs
4. Update schedule state to "Under Review"
5. Create new draft version (v+1) for CD to edit
6. Close modal, refresh page showing new version

#### Version History

**Location:** New section in schedule page header

```
Version History:
v2 (Current - Under Review) | 3 days left | 12/15 studios responded
v1 (Closed) | Sent Nov 20, Closed Nov 27 | 15/15 studios responded
v0 (Closed) | Sent Nov 10, Closed Nov 17 | 10/15 studios responded
```

**Functionality:**
- Click version → view locked snapshot of that version
- Show response rate (X/Y studios submitted notes)
- Show send date and close date
- Current version highlighted

### 2. SD Notes Display (Existing Enhancement)

**Current Implementation:** Hover tooltips on 📋 icon in helper column

**Keep:** Existing hover tooltip showing SD notes

**Enhancement:** Add ability to clear/dismiss notes

**Clear Note Action:**
- Click on 📋 icon → Show note in modal/popover
- Button: "Clear Note" (removes note from database)
- No "accept/reject" status - note is just cleared
- SD doesn't receive notification that note was cleared
- SD only knows if addressed when they see v1 schedule changes

**Modal/Popover Design:**
```
┌──────────────────────────────────────────────┐
│  Studio Request - Entry #123                 │
│  Studio: Dance Elite                         │
│  Routine: "Awakening"                        │
├──────────────────────────────────────────────┤
│                                              │
│  "Please schedule after 10 AM - dancers     │
│   need time to arrive from school"          │
│                                              │
│  Submitted: Nov 22, 2025 at 2:30 PM         │
│                                              │
│  [ Clear Note ]                   [ Close ]  │
└──────────────────────────────────────────────┘
```

### 3. Email Notifications (Outbound to SDs)

**Trigger:** CD clicks "Send Draft to Studios"

**Recipient:** All Studio Directors registered for this competition

**Email Template:**
```
Subject: Schedule Available for Review - [Competition Name]

Hi [Studio Director Name],

The schedule for [Competition Name] is now available for your review.

Version: v2
Feedback Deadline: December 1, 2025 (7 days)

You can view your studio's schedule and submit any scheduling requests at:
[Link to /dashboard/schedules/[competitionId]]

Important Notes:
- You will only see your studio's routines and timing
- Click any routine to add a scheduling request
- All requests must be submitted by the deadline
- You can edit requests until the deadline

Thank you,
[Competition Director Name]
[Competition Name]
```

**Email Logic:**
- Send only to SDs with at least 1 routine in the competition
- Include direct link to SD schedule view
- Include deadline prominently
- CC: None (individual emails to each SD)

---

## Studio Director Features

### 1. Schedules Dashboard

**Existing Page (Replace):** `/dashboard/scheduling`

**Current:** Basic placeholder with `SchedulingManager` component
**New Purpose:** Show all competitions SD is registered for with available schedules

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Schedules                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  EMPWR Dance Experience 2026                       │   │
│  │  April 9-11, 2026                                  │   │
│  │                                                     │   │
│  │  Version 2 - Under Review                          │   │
│  │  Feedback deadline: 3 days remaining               │   │
│  │                                                     │   │
│  │  Your routines: 12                                 │   │
│  │  Notes submitted: 3                                │   │
│  │                                                     │   │
│  │  [View Schedule →]                                 │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Glow Dance Competition 2026                       │   │
│  │  May 15-17, 2026                                   │   │
│  │                                                     │   │
│  │  No schedule available yet                         │   │
│  │                                                     │   │
│  │  [Schedule Not Published]                          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Card Requirements:**
- Show only competitions SD is registered for (has entries/reservation)
- Show schedule status: "Under Review", "Review Closed", "No schedule available"
- Show version number if published
- Show deadline if under review
- Show count: routines for this studio, notes submitted
- Click card → Navigate to `/dashboard/scheduling/[competitionId]`
- If no schedule published → disabled/grayed out

### 2. Studio Schedule View (Isolated)

**New Sub-Page:** `/dashboard/scheduling/[competitionId]`

**Purpose:** Show SD their studio's routines in schedule table format (same as CD view but filtered)

#### Header
```
┌─────────────────────────────────────────────────────────────┐
│  EMPWR Dance Experience 2026 - Schedule                     │
│  Version 2 - Under Review                                   │
│  Feedback deadline: December 1, 2025 (3 days remaining)     │
│                                                              │
│  Your routines: 12 scheduled                                │
│  Notes submitted: 3                                         │
└─────────────────────────────────────────────────────────────┘
```

#### Schedule Table (Same as CD View, Filtered)

**Columns (Same order as CD schedule page):**
- Checkbox (hidden for SD)
- Icons (only 📋 visible if SD added note)
- Entry # (sequential number)
- Day
- Time
- Routine Title
- Studio (always shows SD's studio name)
- Classification
- Category
- Age Group
- Entry Size
- Duration

**Filtering Logic:**
- Show ONLY routines where `studio_id = SD's studio ID`
- Show award/break blocks (same as CD view)
- Show time gaps where other studios' routines exist

**Gap Display (Other Studios' Routines):**
```
| -  | -  | -   | Apr 9 | 09:15 | [Gap - 4 min] | -     | -         | -        | -         | -          | 4 min |
```

**Gap Requirements:**
- No routine details shown (title, studio, classification hidden)
- Show day, time, duration only
- Visual: Gray background, italic text "[Gap - X min]"
- Purpose: SD sees timing/spacing but not competitor info

**Award/Break Blocks:**
- Show same as CD view: "🏆 Award Ceremony" or "☕ Break"
- Full transparency (SDs need to know when awards/breaks are)

#### Click Routine → Add Note Modal

**Trigger:** SD clicks any row in their schedule table

**Modal:**
```
┌──────────────────────────────────────────────────────────────┐
│  Add Scheduling Request                                      │
│  Entry #123 - "Awakening" (Emerald Solo, Age 10-12)         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Current time: Thursday, April 9 at 9:30 AM                 │
│                                                              │
│  Your request:                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Please schedule after 10 AM - dancers need time to   │  │
│  │ arrive from school                                   │  │
│  │                                                       │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Note: The Competition Director will review your request    │
│  but cannot guarantee accommodation.                         │
│                                                              │
│  [ Cancel ]                              [ Submit Request ]  │
└──────────────────────────────────────────────────────────────┘
```

**Modal Fields:**
- Routine details (read-only context)
- Current scheduled time (read-only)
- Textarea: Request/note (500 char max)
- Disclaimer: CD will review but can't guarantee

**Actions:**
- Submit → Save to `competition_entries.scheduling_notes`
- Set `has_studio_requests = true`
- Close modal, show toast: "Request submitted"
- Update notes count in header
- Add 📋 icon to routine row

**Edit Existing Note:**
- If SD clicks routine with existing note, modal pre-fills with current text
- SD can edit or clear their note
- "Clear Request" button removes note entirely

**Deadline Enforcement:**
- If deadline passed: Modal shows read-only view
- Message: "Review period closed. You can view your request but cannot edit until the next review period."
- No submit/edit buttons shown

#### Version Switching (If Previous Versions Exist)

**Dropdown in header:**
```
Viewing: [Version 2 (Current) ▼]
         Version 1 (Nov 20-27)
         Version 0 (Nov 10-17)
```

**Functionality:**
- SD can view previous versions (read-only)
- See their notes from previous versions
- See how schedule changed between versions
- Current version always default view

---

## Database Schema Changes

### 1. New Table: `schedule_versions`

```sql
CREATE TABLE schedule_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),

  version_number INTEGER NOT NULL, -- 0, 1, 2, 3...
  status VARCHAR(50) NOT NULL, -- 'draft', 'under_review', 'review_closed'

  sent_at TIMESTAMP, -- When CD clicked "Send to Studios"
  deadline TIMESTAMP, -- When review period ends
  closed_at TIMESTAMP, -- When deadline passed (auto-set)

  sent_by_user_id UUID REFERENCES users(id), -- CD who sent it
  feedback_window_days INTEGER, -- How many days SDs had to respond

  -- Snapshot metadata
  routine_count INTEGER, -- How many routines in this version
  notes_count INTEGER, -- How many SD notes submitted
  responding_studios_count INTEGER, -- How many studios submitted at least 1 note
  total_studios_count INTEGER, -- How many studios registered

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, competition_id, version_number)
);

CREATE INDEX idx_schedule_versions_competition ON schedule_versions(competition_id);
CREATE INDEX idx_schedule_versions_status ON schedule_versions(status);
```

### 2. Modify Table: `competition_entries`

**Add version tracking:**

```sql
ALTER TABLE competition_entries
ADD COLUMN version_created INTEGER DEFAULT 0, -- Which version this routine was first scheduled
ADD COLUMN version_last_modified INTEGER DEFAULT 0, -- Which version last changed time/day
ADD COLUMN sd_note_version INTEGER; -- Which version SD added/edited note
```

**Existing fields (already in schema):**
- `scheduling_notes` (TEXT) - SD's request text
- `has_studio_requests` (BOOLEAN) - Flag if SD added note
- `scheduled_day` (DATE)
- `performance_time` (TIME)
- `entry_number` (INTEGER)

### 3. New Table: `schedule_version_snapshots` (Optional - for full history)

If we want to preserve complete schedule state per version:

```sql
CREATE TABLE schedule_version_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  version_id UUID NOT NULL REFERENCES schedule_versions(id),

  -- Snapshot of competition_entries row at time of version send
  entry_id UUID NOT NULL REFERENCES competition_entries(id),
  entry_number INTEGER,
  scheduled_day DATE,
  performance_time TIME,
  scheduling_notes TEXT,
  has_studio_requests BOOLEAN,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshots_version ON schedule_version_snapshots(version_id);
CREATE INDEX idx_snapshots_entry ON schedule_version_snapshots(entry_id);
```

**Alternative:** Just rely on `version_last_modified` and calculate diffs on-the-fly (lighter weight)

---

## API Endpoints (tRPC Procedures)

### CD Procedures

#### 1. `scheduling.sendToStudios`

**Input:**
```typescript
{
  tenantId: string;
  competitionId: string;
  feedbackWindowDays: number; // 1-30
}
```

**Logic:**
1. Get current version number (max version_number + 1)
2. Create new record in `schedule_versions`:
   - version_number = current max + 1
   - status = 'under_review'
   - sent_at = NOW()
   - deadline = NOW() + feedbackWindowDays
   - sent_by_user_id = current CD user ID
3. Optional: Create snapshots in `schedule_version_snapshots`
4. Update all routines: set `version_last_modified` if changed since last version
5. Queue email notifications for all registered SDs
6. Return: new version object

**Output:**
```typescript
{
  versionId: string;
  versionNumber: number;
  deadline: Date;
  emailsSent: number;
}
```

#### 2. `scheduling.getCurrentVersion`

**Input:**
```typescript
{
  tenantId: string;
  competitionId: string;
}
```

**Output:**
```typescript
{
  versionNumber: number;
  status: 'draft' | 'under_review' | 'review_closed';
  deadline?: Date;
  daysRemaining?: number;
  respondingStudios: number;
  totalStudios: number;
  notesCount: number;
}
```

#### 3. `scheduling.getVersionHistory`

**Input:**
```typescript
{
  tenantId: string;
  competitionId: string;
}
```

**Output:**
```typescript
Array<{
  versionNumber: number;
  status: string;
  sentAt: Date;
  deadline: Date;
  closedAt?: Date;
  respondingStudios: number;
  totalStudios: number;
  notesCount: number;
}>
```

#### 4. `scheduling.clearStudioNote`

**Input:**
```typescript
{
  tenantId: string;
  entryId: string; // competition_entries.id
}
```

**Logic:**
1. Verify CD has access to this competition
2. Update competition_entries:
   - scheduling_notes = NULL
   - has_studio_requests = FALSE
   - sd_note_version = NULL
3. Return success

### SD Procedures

#### 5. `scheduling.getStudioSchedule`

**Input:**
```typescript
{
  tenantId: string;
  competitionId: string;
  versionNumber?: number; // Optional - defaults to current
}
```

**Logic:**
1. Verify SD is registered for this competition
2. Get schedule_version record
3. If version not published yet → return 404
4. Get all routines for SD's studio where is_scheduled = true
5. Get all award/break blocks for competition
6. Calculate gaps (time slots between SD's routines)
7. Return filtered schedule

**Output:**
```typescript
{
  version: {
    number: number;
    status: string;
    deadline?: Date;
    daysRemaining?: number;
    canEditNotes: boolean; // true if under_review and before deadline
  };
  routines: Array<{
    id: string;
    entryNumber: number;
    title: string;
    scheduledDay: Date;
    performanceTime: string;
    classification: string;
    category: string;
    ageGroup: string;
    entrySize: string;
    duration: number;
    hasNote: boolean;
    noteText?: string;
  }>;
  blocks: Array<{
    type: 'award' | 'break';
    scheduledDay: Date;
    startTime: string;
    duration: number;
  }>;
  gaps: Array<{
    scheduledDay: Date;
    startTime: string;
    duration: number;
  }>;
}
```

#### 6. `scheduling.submitStudioNote`

**Input:**
```typescript
{
  tenantId: string;
  entryId: string;
  noteText: string; // 500 char max
}
```

**Logic:**
1. Verify SD owns this routine (studio_id matches)
2. Get current version
3. Verify status = 'under_review' and before deadline
4. Update competition_entries:
   - scheduling_notes = noteText
   - has_studio_requests = TRUE
   - sd_note_version = current version number
5. Return success

**Output:**
```typescript
{
  success: boolean;
  noteText: string;
  submittedAt: Date;
}
```

#### 7. `scheduling.getAvailableSchedules`

**Input:**
```typescript
{
  tenantId: string;
  studioId: string;
}
```

**Logic:**
1. Get all competitions where SD has entries/reservations
2. For each competition, get latest published schedule_version
3. Return list with metadata

**Output:**
```typescript
Array<{
  competitionId: string;
  competitionName: string;
  competitionDates: { start: Date; end: Date };
  hasSchedule: boolean;
  version?: {
    number: number;
    status: string;
    deadline?: Date;
    daysRemaining?: number;
  };
  routineCount: number;
  notesCount: number;
}>
```

---

## UI Components

### New Components to Create

#### 1. `SendToStudiosModal.tsx`

**Location:** `src/components/scheduling/SendToStudiosModal.tsx`

**Props:**
```typescript
interface SendToStudiosModalProps {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  tenantId: string;
  currentVersion: number;
  onSuccess: () => void;
}
```

**Features:**
- Number input for feedback window (1-30 days, default 7)
- Summary of what will happen
- Submit → calls `scheduling.sendToStudios`
- Success toast + refresh parent

#### 2. `VersionIndicator.tsx`

**Location:** `src/components/scheduling/VersionIndicator.tsx`

**Props:**
```typescript
interface VersionIndicatorProps {
  versionNumber: number;
  status: 'draft' | 'under_review' | 'review_closed';
  deadline?: Date;
  daysRemaining?: number;
}
```

**Display:**
- Version badge with color based on status
- Deadline countdown if under review
- "Review Closed" badge if past deadline

#### 3. `StudioScheduleTable.tsx`

**Location:** `src/components/scheduling/StudioScheduleTable.tsx`

**Props:**
```typescript
interface StudioScheduleTableProps {
  routines: StudioRoutine[];
  blocks: ScheduleBlock[];
  gaps: ScheduleGap[];
  canEditNotes: boolean;
  onClickRoutine: (routineId: string) => void;
}
```

**Features:**
- Same table structure as CD ScheduleTable
- Gaps rendered as gray rows: "[Gap - X min]"
- Click row → trigger modal if canEditNotes
- 📋 icon shown if routine has note

#### 4. `StudioNoteModal.tsx`

**Location:** `src/components/scheduling/StudioNoteModal.tsx`

**Props:**
```typescript
interface StudioNoteModalProps {
  open: boolean;
  onClose: () => void;
  routine: StudioRoutine;
  canEdit: boolean;
  onSubmit: (noteText: string) => Promise<void>;
}
```

**Features:**
- Show routine details (context)
- Textarea for note (500 char limit)
- Pre-fill if existing note
- Submit/Clear buttons
- Read-only if deadline passed

#### 5. `SchedulesDashboard.tsx`

**Location:** `src/app/dashboard/schedules/page.tsx`

**Features:**
- Fetch available schedules via `scheduling.getAvailableSchedules`
- Card layout showing competitions
- Click card → navigate to `/dashboard/schedules/[competitionId]`
- Show status, version, deadline per competition

#### 6. `StudioScheduleView.tsx`

**Location:** `src/app/dashboard/schedules/[competitionId]/page.tsx`

**Features:**
- Fetch schedule via `scheduling.getStudioSchedule`
- Render StudioScheduleTable
- Version switcher dropdown
- Handle click → open StudioNoteModal
- Real-time deadline countdown

### Modified Components

#### 7. `ScheduleTable.tsx` (CD View)

**Location:** `src/components/scheduling/ScheduleTable.tsx`

**Changes:**
- Add version indicator at top
- Enhance 📋 icon click → show modal with "Clear Note" button
- Display version number in header

#### 8. CD Schedule Page

**Location:** `src/app/dashboard/director-panel/schedule/page.tsx`

**Changes:**
- Add "Send Draft to Studios" button
- Add VersionIndicator component
- Add version history section
- Fetch current version on load

---

## Email Notification System

### Template: `schedule-published.html`

**File:** `src/emails/schedule-published.html`

**Variables:**
- `studioDirectorName`
- `competitionName`
- `versionNumber`
- `deadline`
- `daysRemaining`
- `scheduleUrl`
- `competitionDirectorName`

**Send Logic:**
- Triggered by `scheduling.sendToStudios`
- Queue emails via `email_queue` table
- Send to all SDs with entries in competition

---

## Cron Jobs / Background Tasks

### 1. Close Review Periods

**Frequency:** Every 1 hour

**Logic:**
```sql
UPDATE schedule_versions
SET status = 'review_closed',
    closed_at = NOW()
WHERE status = 'under_review'
  AND deadline < NOW()
  AND closed_at IS NULL;
```

**Purpose:** Auto-close review periods when deadline passes

### 2. Send Deadline Reminders

**Frequency:** Daily at 9 AM

**Logic:**
- Find versions with status = 'under_review'
- Where deadline is in 1 day (tomorrow)
- Send reminder email to SDs who haven't submitted notes

**Email Template:** `schedule-deadline-reminder.html`

---

## Testing Checklist

### CD Workflow
- [ ] Create schedule draft
- [ ] Click "Send Draft to Studios"
- [ ] Set feedback window (7 days)
- [ ] Verify version locks (v0)
- [ ] Verify new version created (v1 draft)
- [ ] Make changes to v1 while v0 under review
- [ ] View version history
- [ ] Click 📋 icon to see SD note
- [ ] Clear SD note
- [ ] Wait for deadline to pass
- [ ] Verify version auto-closes

### SD Workflow
- [ ] Receive email notification
- [ ] Navigate to /dashboard/schedules
- [ ] See competition card with version info
- [ ] Click card → view studio schedule
- [ ] Verify only own routines visible
- [ ] Verify gaps shown for other studios
- [ ] Verify award/break blocks visible
- [ ] Click routine → open note modal
- [ ] Submit note
- [ ] Verify 📋 icon appears
- [ ] Edit existing note
- [ ] Clear note
- [ ] Wait for deadline → verify can't edit
- [ ] View previous version

### Multi-Version Flow
- [ ] CD sends v0 to SDs
- [ ] SDs submit notes on v0
- [ ] CD makes changes → v1 created
- [ ] CD sends v1 to SDs
- [ ] SDs see updated schedule
- [ ] SDs submit new notes on v1
- [ ] Verify v0 notes preserved in history
- [ ] Verify version switching works

### Edge Cases
- [ ] SD with no routines scheduled → no access
- [ ] SD clicks before CD publishes → 404
- [ ] Multiple SDs from same studio → both can add notes
- [ ] CD clears note then SD views → note gone
- [ ] Deadline passes mid-session → edit disabled
- [ ] SD tries to edit after deadline → blocked

---

## Implementation Phases

### Phase 1: Database & API (Week 1)
- [ ] Create `schedule_versions` table
- [ ] Add version columns to `competition_entries`
- [ ] Implement `scheduling.sendToStudios`
- [ ] Implement `scheduling.getCurrentVersion`
- [ ] Implement `scheduling.getStudioSchedule`
- [ ] Implement `scheduling.submitStudioNote`
- [ ] Implement `scheduling.getAvailableSchedules`
- [ ] Implement `scheduling.clearStudioNote`

### Phase 2: CD UI (Week 2)
- [ ] Create `SendToStudiosModal` component
- [ ] Create `VersionIndicator` component
- [ ] Modify CD schedule page to show version
- [ ] Add "Send Draft to Studios" button
- [ ] Add version history display
- [ ] Enhance 📋 icon to show clear note option

### Phase 3: SD UI (Week 3)
- [ ] Create `SchedulesDashboard` page
- [ ] Create `StudioScheduleView` page
- [ ] Create `StudioScheduleTable` component
- [ ] Create `StudioNoteModal` component
- [ ] Implement gap rendering
- [ ] Implement deadline enforcement

### Phase 4: Email & Automation (Week 4)
- [ ] Create email templates
- [ ] Implement email sending on publish
- [ ] Create cron job to close reviews
- [ ] Create cron job for deadline reminders
- [ ] Test email delivery

### Phase 5: Testing & Polish (Week 5)
- [ ] Full workflow testing (CD + SD)
- [ ] Multi-version testing
- [ ] Edge case testing
- [ ] UI polish and responsive design
- [ ] Performance optimization
- [ ] Documentation updates

---

## Open Questions / Decisions Needed

1. **Version snapshots:** Full snapshots in separate table OR calculate diffs on-the-fly?
   - Recommendation: Start without snapshots, add if needed

2. **Email frequency limits:** Should we batch emails or send immediately?
   - Recommendation: Queue and send within 5 minutes

3. **Note character limit:** 500 chars sufficient?
   - Recommendation: Yes, keep it concise

4. **Can SDs see other SDs' notes on same routine?**
   - Assumption: No, only CD sees all notes

5. **What if CD deletes/unschedules routine that has SD note?**
   - Recommendation: Note preserved in database, shown in history

6. **Should there be a "Final" state where no more versions can be sent?**
   - Recommendation: No, allow unlimited iterations

7. **Should SDs get notified when CD publishes new version?**
   - Answer from workflow: Yes, email notification

8. **Can CD edit deadline after sending?**
   - Recommendation: No, deadline is locked when sent (prevents moving goalposts)

---

## Success Metrics

- Average response rate (% of studios submitting notes)
- Average turnaround time (CD sends → makes changes → sends again)
- Number of versions before schedule finalized
- SD engagement (% who click "View Schedule")
- Note submission rate vs. routine count

---

**End of Specification**

---

## Appendix: Example Data Flow

### Scenario: 3-Version Workflow

**Day 1:** CD creates schedule
- 50 routines scheduled across 3 days
- Status: Draft v0
- No SD access

**Day 2:** CD sends to SDs (7-day window)
- v0 locked, status = 'under_review'
- Deadline = Day 9
- Email sent to 15 SDs
- CD can start editing v1

**Day 3-8:** SDs submit notes
- 12/15 SDs submit notes
- Total 25 notes across 50 routines
- CD sees 📋 icons on 25 routines

**Day 9:** Deadline passes
- v0 auto-closes (status = 'review_closed')
- SDs can view v0 but can't edit notes
- CD reviews notes, makes changes to v1

**Day 10:** CD sends v1 (5-day window)
- v1 locked, status = 'under_review'
- Deadline = Day 15
- Email sent to 15 SDs
- SDs now see updated schedule
- CD starts editing v2

**Day 11-14:** SDs submit new notes
- 8/15 SDs submit notes on v1
- Total 12 notes (less than v0 - improvements working!)

**Day 15:** Deadline passes
- v1 auto-closes
- CD makes final tweaks to v2

**Day 16:** CD sends v2 (3-day window - final check)
- v2 locked, status = 'under_review'
- Deadline = Day 19
- Only 2 notes submitted (schedule nearly final!)

**Day 19:** Schedule finalized
- v2 closes
- CD doesn't send another version
- Schedule remains visible to SDs as read-only

---

**Total versions:** 3
**Total iterations:** 16 days from start to final
**SD engagement:** High (declining notes = good sign)
