# Entry Journey – CompPortal Competition Entry Lifecycle

**Document Purpose:** Track a competition entry from creation to completion through all 4 phases, identifying data fields, status transitions, and schema alignment for verification.

**Last Updated:** December 13, 2025
**Cross-References:**
- `MASTER_BUSINESS_LOGIC.md` - 4-phase system overview
- `PHASE1_SPEC.md` - Registration details
- `GAME_DAY_SPEC.md` - Live event operations
- `PHASE_ALIGNMENT_ANALYSIS.md` - Data flow issues

---

## Entry Lifecycle Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ENTRY LIFECYCLE (4 PHASES)                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PHASE 1: REGISTRATION (~3 months)                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ SD creates reservation → CD approves → SD creates entries    │    │
│  │ → SD assigns dancers → SD submits summary → Invoice generated│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  PHASE 2: PLANNING (~3 months)                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Entry becomes "routine" → SD uploads MP3 → CD builds schedule│    │
│  │ → Entry gets entry_number, performance_date, schedule_sequence│   │
│  │ → Conflict detection → Schedule finalized                     │   │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  PHASE 3: GAME DAY (Event days)                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Entry appears in lineup → MP3 plays → Judges score (XX.XX)   │    │
│  │ → Entry marked completed → Scores aggregated → Awards calc   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  PHASE 4: POST-EVENT (~3 months)                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Results finalized → Reports generated → Media linked         │    │
│  │ → SD receives score reports → Parents access media portal    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Registration – Entry Creation

### Step 1.1: Prerequisite – Reservation Approved

**Actor:** Studio Director (SD) → Competition Director (CD)

**Data Created:**
```
reservations:
├── id (UUID)
├── studio_id, competition_id, tenant_id
├── entries_requested (initial request)
├── entries_approved (CD-set final count)
├── entries_used (increments as entries created)
├── status = 'pending' → 'approved' → 'summarized' → 'invoiced'
└── created_at, updated_at
```

**Status Transitions:**
- `pending` → SD submitted request
- `approved` → CD approved (or `adjusted` with different count)
- `summarized` → SD submitted summary, unused capacity refunded
- `invoiced` → Invoice generated from summary

---

### Step 1.2: Entry Creation (3-Step Process)

**Actor:** Studio Director (SD)

**UI Flow:**
1. **Step 1 - Basic Info:** Title, category, age group, classification
2. **Step 2 - Assign Dancers:** Select dancers from studio roster
3. **Step 3 - Review & Save:** Confirm details, save entry

**Data Created at Entry Creation:**

```sql
-- Table: competition_entries
INSERT INTO competition_entries (
  id,                     -- UUID, auto-generated
  tenant_id,              -- From session/context
  competition_id,         -- From selected competition
  studio_id,              -- From SD's studio
  reservation_id,         -- Links to approved reservation
  title,                  -- "Shine Bright" (SD input)
  category_id,            -- FK to categories (Jazz, Lyrical, etc.)
  age_group_id,           -- FK to age_groups (Junior, Teen, etc.)
  classification_id,      -- FK to classifications (Novice, Elite, etc.)
  entry_size_category_id, -- FK to entry_size_categories (Solo, Duet, Group)
  status,                 -- 'draft' initially
  routine_age,            -- Calculated from avg dancer ages
  created_at,
  updated_at
);

-- Table: entry_participants (for each dancer assigned)
INSERT INTO entry_participants (
  id,                     -- UUID
  entry_id,               -- FK to competition_entries
  dancer_id,              -- FK to dancers
  tenant_id,              -- Multi-tenant isolation
  dancer_name,            -- Denormalized from dancers table
  dancer_age,             -- Calculated age at competition date
  display_order           -- Order for display (1, 2, 3...)
);
```

**Entry Status at Creation:** `draft`

---

### Step 1.3: Entry Status Transitions (Phase 1)

```
Entry Status Flow (Phase 1):
┌────────┐     ┌───────────┐     ┌──────────┐     ┌─────────────────┐
│ draft  │ ──▶ │ submitted │ ──▶ │ invoiced │ ──▶ │ routine_created │
└────────┘     └───────────┘     └──────────┘     └─────────────────┘
     │              │                  │
     │              │                  │
     ▼              ▼                  │
┌───────────┐ (status change)         │
│ cancelled │ (can be cancelled       │
└───────────┘  at any time)           │
                                      │
                                 Unlocks Phase 2
```

**Trigger Events:**
- `draft` → `submitted`: SD clicks "Submit Entry"
- `submitted` → `invoiced`: Summary submitted, invoice generated
- `invoiced` → `routine_created`: Entry converted to routine in Phase 2
- Any → `cancelled`: SD or CD cancels entry (soft delete)

---

### Step 1.4: Summary Submission

**Actor:** Studio Director (SD)

**What Happens:**
1. SD reviews all entries linked to reservation
2. SD clicks "Submit Summary"
3. System calculates: `unused_capacity = entries_approved - entries_used`
4. Unused capacity refunded to competition pool
5. Invoice generated from submitted entries

**Data Changes:**
```sql
-- Reservation updated
UPDATE reservations SET
  status = 'summarized',
  summary_submitted_at = NOW()
WHERE id = :reservation_id;

-- Entries updated
UPDATE competition_entries SET
  status = 'invoiced'
WHERE reservation_id = :reservation_id AND status = 'submitted';
```

---

## Phase 2: Planning – Scheduling & Music

### Step 2.1: Entry → Routine Conversion

**Note:** In CompPortal, "entries" and "routines" use the same `competition_entries` table. The status `routine_created` indicates the entry has transitioned to Phase 2.

**What Changes:**
- Entry status: `invoiced` → `routine_created`
- Entry ready for scheduling and music upload

---

### Step 2.2: Music Upload

**Actor:** Studio Director (SD)

**UI Location:** `/dashboard/entries/[entryId]` or `/dashboard/music-upload` (bulk)

**Data Updated:**
```sql
UPDATE competition_entries SET
  music_file_url = 'https://storage.supabase.co/bucket/mp3/[filename].mp3',
  mp3_duration_ms = 185000,  -- Duration extracted from MP3 metadata
  music_uploaded_at = NOW()
WHERE id = :entry_id;
```

**File Naming Convention:** `[EntryNumber]_[RoutineTitle]_[StudioCode].mp3`

**Validation:**
- Format: MP3 only
- Max size: 50MB
- Duration: Extracted automatically via Web Audio API
- Required: Before schedule can be finalized

---

### Step 2.3: Schedule Assignment (CD Action)

**Actor:** Competition Director (CD) via Schedule Builder

**UI Location:** `/dashboard/director-panel/schedule/[competitionId]`

**Data Updated on Schedule Save:**
```sql
UPDATE competition_entries SET
  performance_date = '2026-04-11',        -- Which day
  schedule_sequence = 15,                  -- Order within day (1, 2, 3...)
  entry_number = 111,                      -- Competition-wide unique number
  is_scheduled = true,
  scheduled_start_time = '09:45:00',       -- Calculated start time
  dancer_names = ARRAY['Emma S.', 'Mia R.'], -- Denormalized for conflict detection
  conflict_count = 0,                      -- Number of conflicts with adjacent entries
  conflicts_with_entry_ids = ARRAY[]::UUID[], -- IDs of conflicting entries
  updated_at = NOW()
WHERE id = :entry_id;
```

**Critical Fields Set During Scheduling:**

| Field | Source | Purpose |
|-------|--------|---------|
| `performance_date` | CD drag/drop | Which competition day |
| `schedule_sequence` | Position in day | ORDER BY for lineup |
| `entry_number` | Auto-assigned | Display number (#111, #112) |
| `is_scheduled` | Boolean flag | Filter for scheduled entries |
| `dancer_names[]` | Denormalized | Conflict detection |
| `conflict_count` | Calculated | Show warning badges |
| `scheduled_start_time` | Calculated | Display only (not authoritative) |

---

### Step 2.4: Entry Number Assignment (LOCKED)

**Business Rule:** Entry numbers are **competition-wide** and **permanently locked** once assigned.

**Example:**
- Entry #111 = "Shine Bright" by Dance Academy
- If CD moves #111 to different position, **time changes but number stays #111**
- Entry number is the **permanent identifier** for all media, scores, and reports

**Database Constraint:**
```sql
-- Entry number is unique per competition
ALTER TABLE competition_entries
ADD CONSTRAINT unique_entry_number_per_competition
UNIQUE (competition_id, entry_number);
```

---

### Step 2.5: Schedule Finalization

**Actor:** Competition Director (CD)

**What Happens:**
1. CD clicks "Finalize Schedule"
2. System validates all entries have required fields
3. Entry numbers become **immutable**
4. Schedule published to studios
5. Phase 2 complete, ready for Game Day

**Data Changes:**
```sql
-- Competition updated
UPDATE competitions SET
  schedule_finalized = true,
  schedule_finalized_at = NOW()
WHERE id = :competition_id;

-- No further changes to entry_number allowed after this
```

---

## Phase 3: Game Day – Live Performance

### Step 3.1: Live Competition State Initialization

**Actor:** Competition Director / Tabulator

**Data Created:**
```sql
INSERT INTO live_competition_state (
  competition_id,
  tenant_id,
  competition_state,        -- 'not_started' → 'active' → 'paused' → 'ended'
  operating_date,           -- Which day's routines to show
  day_number,               -- 1, 2, 3...
  session_number,           -- 1, 2... within day
  current_entry_id,         -- FK to competition_entries
  current_entry_state,      -- 'queued' | 'performing' | 'completed'
  judges_can_see_scores,    -- Toggle for score visibility
  playback_state            -- 'stopped' | 'playing' | 'paused'
);
```

---

### Step 3.2: Entry Appears in Lineup

**APIs Reading Entry Data:**

1. **Backstage Display** (`/api/backstage`)
   - Shows: Entry #, title, studio, duration, dancer names
   - Order: `schedule_sequence ASC, entry_number ASC`

2. **Tabulator Lineup** (`liveCompetition.getLineup`)
   - Shows: Full lineup with scores, conflicts, status
   - Order: `schedule_sequence ASC` (FIXED - was `running_order`)

3. **Audio Manifest** (`/api/audio/manifest`)
   - Returns: MP3 URLs for download
   - Order: `performance_date ASC, schedule_sequence ASC`

**Entry Fields Consumed:**

| Field | Backstage | Tabulator | Audio | Scoreboard |
|-------|-----------|-----------|-------|------------|
| `id` | ✅ | ✅ | ✅ | ✅ |
| `entry_number` | ✅ | ✅ | ✅ | ✅ |
| `title` | ✅ | ✅ | ✅ | ✅ |
| `studio.name` | ✅ | ✅ | - | ✅ |
| `dancer_names[]` | ✅ | ✅ | - | - |
| `category.name` | - | ✅ | - | ✅ |
| `mp3_duration_ms` | ✅ | ✅ | - | - |
| `music_file_url` | - | - | ✅ | - |
| `schedule_sequence` | ✅ | ✅ | ✅ | - |
| `live_status` | ✅ | ✅ | - | ✅ |

---

### Step 3.3: Entry Performance

**State Transitions:**
```
Entry Live Status Flow:
┌────────┐     ┌────────────┐     ┌───────────┐
│ queued │ ──▶ │ performing │ ──▶ │ completed │
└────────┘     └────────────┘     └───────────┘
     │                                   │
     │                                   │
     ▼                                   │
┌───────────┐                           │
│ scratched │ (CD can scratch at        │
└───────────┘  any point)               │
```

**Performance Flow:**
1. **Queued:** Entry waiting in lineup
2. **Performing:** Music playing, judges scoring
3. **Completed:** Scores submitted, moves to next entry

**Data Changes During Performance:**
```sql
-- When entry starts performing
UPDATE live_competition_state SET
  current_entry_id = :entry_id,
  current_entry_state = 'performing',
  playback_state = 'playing'
WHERE competition_id = :competition_id;

-- When entry completes
UPDATE competition_entries SET
  live_status = 'completed'
WHERE id = :entry_id;
```

---

### Step 3.4: Judge Scoring

**Actor:** 3 Judges on tablets

**Data Created:**
```sql
INSERT INTO scores (
  id,
  entry_id,               -- FK to competition_entries
  judge_id,               -- FK to judges
  tenant_id,
  competition_id,
  score,                  -- XX.XX format (e.g., 89.06)
  breakdown_scores,       -- JSONB for Title Division (optional)
  special_awards,         -- ARRAY of award IDs selected
  comments,               -- Judge notes
  submitted_at,
  is_final                -- true after submission
);
```

**Scoring Rules:**
- Format: `XX.XX` (two decimals required)
- Range: `00.00` to `99.99`
- Input: Slider OR manual typing
- 3 judges required per routine
- Average calculated for adjudication level

**Adjudication Level Calculation:**
```javascript
const average = (scores.judgeA + scores.judgeB + scores.judgeC) / 3;
const level = adjudicationLevels.find(l => average >= l.min && average <= l.max);
// e.g., "Platinum" for 88.00-91.99
```

---

### Step 3.5: Entry Completion

**After All Judges Submit:**
```sql
-- Calculate final average
UPDATE competition_entries SET
  final_score = (SELECT AVG(score) FROM scores WHERE entry_id = :entry_id),
  adjudication_level = 'Platinum',  -- Based on average
  live_status = 'completed'
WHERE id = :entry_id;
```

---

## Phase 4: Post-Event – Results & Reports

### Step 4.1: Results Finalization

**Actor:** Competition Director (CD)

**Data Updated:**
```sql
UPDATE competitions SET
  competition_state = 'ended',
  results_finalized = true,
  results_finalized_at = NOW()
WHERE id = :competition_id;
```

### Step 4.2: Entry in Reports

**Reports Generated:**
- **Studio Report:** All entries for a studio with scores, placements
- **Category Report:** Rankings within category/level/age group
- **Judge Sheet:** Individual judge scores per entry

**Entry Fields in Reports:**

| Field | Studio Report | Category Report | Judge Sheet |
|-------|---------------|-----------------|-------------|
| `entry_number` | ✅ | ✅ | ✅ |
| `title` | ✅ | ✅ | ✅ |
| `dancer_names[]` | ✅ | - | ✅ |
| `category` | ✅ | ✅ | ✅ |
| `final_score` | ✅ | ✅ | ✅ |
| `adjudication_level` | ✅ | ✅ | ✅ |
| `placement` | - | ✅ | - |
| `individual_scores` | - | - | ✅ |

### Step 4.3: Media Linkage

**How Media is Linked:**
- Media files tagged with `entry_number`
- Parents access via dancer name + DOB lookup
- Only see routines featuring their dancer

---

## Schema Alignment Matrix

### Fields by Phase (Comprehensive)

| Field | Phase 1 Sets | Phase 2 Sets | Phase 3 Reads | Phase 4 Reads | Current Status |
|-------|--------------|--------------|---------------|---------------|----------------|
| `id` | ✅ | - | ✅ | ✅ | OK |
| `tenant_id` | ✅ | - | ✅ | ✅ | OK |
| `competition_id` | ✅ | - | ✅ | ✅ | OK |
| `studio_id` | ✅ | - | ✅ | ✅ | OK |
| `reservation_id` | ✅ | - | - | - | OK |
| `title` | ✅ | - | ✅ | ✅ | OK |
| `category_id` | ✅ | - | ✅ | ✅ | OK |
| `age_group_id` | ✅ | - | ✅ | ✅ | OK |
| `classification_id` | ✅ | - | ✅ | ✅ | OK |
| `entry_size_category_id` | ✅ | - | - | - | OK |
| `status` | ✅ (Phase 1 statuses) | - | - | - | OK |
| `routine_age` | ✅ (calc) | - | ✅ | - | 70-80% populated |
| `performance_date` | - | ✅ | ✅ | ✅ | Awaiting Phase 2 |
| `schedule_sequence` | - | ✅ | ✅ | - | Awaiting Phase 2 |
| `entry_number` | - | ✅ | ✅ | ✅ | Awaiting Phase 2 |
| `is_scheduled` | - | ✅ | ✅ | - | Awaiting Phase 2 |
| `scheduled_start_time` | - | ✅ | ✅ | - | Awaiting Phase 2 |
| `dancer_names[]` | - | ✅ | ✅ | ✅ | **3-5% populated - CRITICAL** |
| `music_file_url` | - | ✅ | ✅ | - | **0% populated - MEDIUM** |
| `mp3_duration_ms` | - | ✅ | ✅ | - | **0% populated - MEDIUM** |
| `conflict_count` | - | ✅ | - | - | Awaiting Phase 2 |
| `conflicts_with_entry_ids[]` | - | ✅ | - | - | Awaiting Phase 2 |
| `live_status` | - | - | ✅ (RW) | - | Default 'queued' |
| `final_score` | - | - | ✅ (calc) | ✅ | Set during Game Day |
| `adjudication_level` | - | - | ✅ (calc) | ✅ | Set during Game Day |

---

## Critical Data Issues Identified

### Issue 1: `dancer_names` Not Populated (CRITICAL)

**Problem:** Only 3-5% of production entries have `dancer_names[]` populated, despite 99-100% having `entry_participants` records.

**Impact:**
- Conflict detection fails
- Backstage display shows blank dancers
- Schedule V2 can't show dancer info

**Root Cause:** Denormalization from `entry_participants` → `dancer_names` not triggered on entry creation.

**Fix Required:**
```sql
-- Backfill existing entries
UPDATE competition_entries ce
SET dancer_names = (
  SELECT array_agg(ep.dancer_name ORDER BY ep.display_order)
  FROM entry_participants ep
  WHERE ep.entry_id = ce.id
)
WHERE dancer_names IS NULL OR array_length(dancer_names, 1) IS NULL;

-- Add trigger for future entries
CREATE OR REPLACE FUNCTION sync_dancer_names()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE competition_entries
  SET dancer_names = (
    SELECT array_agg(ep.dancer_name ORDER BY ep.display_order)
    FROM entry_participants ep
    WHERE ep.entry_id = NEW.entry_id
  )
  WHERE id = NEW.entry_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Issue 2: MP3 Data Missing (MEDIUM)

**Problem:** `mp3_duration_ms` and `music_file_url` are 0% populated.

**Impact:**
- Backstage can't show countdown timer
- Default 3-minute fallback used
- Audio playback won't work

**Required:** Studios must upload music files before Game Day.

---

### Issue 3: Router Ordering Inconsistency (CRITICAL - FIXED)

**Problem:** Different Game Day components were using different ordering fields.

**Fix Applied:**
- Changed `liveCompetition.getLineup` from `running_order` to `schedule_sequence`
- Changed status filter from `status: 'registered'` to `status: { not: 'cancelled' }`

---

## Verification Checklist

### Phase 1 → Phase 2 Transition
- [ ] Entry has `reservation_id` linked
- [ ] Entry has `status = 'invoiced'` or `'routine_created'`
- [ ] `entry_participants` records exist
- [ ] `routine_age` calculated

### Phase 2 → Phase 3 Transition
- [ ] Entry has `performance_date` set
- [ ] Entry has `schedule_sequence` set
- [ ] Entry has `entry_number` assigned (unique per competition)
- [ ] Entry has `is_scheduled = true`
- [ ] `dancer_names[]` populated (from entry_participants)
- [ ] `music_file_url` populated (if MP3 uploaded)
- [ ] `mp3_duration_ms` extracted (from MP3)

### Phase 3 → Phase 4 Transition
- [ ] All judges submitted scores
- [ ] `final_score` calculated
- [ ] `adjudication_level` assigned
- [ ] `live_status = 'completed'`

---

## Cross-Journey Touchpoints

### Entry ↔ Studio Director Journey

| SD Journey Step | Entry Field Changed | Entry Status |
|-----------------|---------------------|--------------|
| Create Entry | All Phase 1 fields | `draft` |
| Assign Dancers | `entry_participants` created | `draft` |
| Submit Entry | - | `submitted` |
| Submit Summary | - | `invoiced` |
| Upload Music | `music_file_url`, `mp3_duration_ms` | - |
| View Schedule | (read only) | - |

### Entry ↔ Competition Director Journey

| CD Journey Step | Entry Field Changed | Entry Status |
|-----------------|---------------------|--------------|
| Approve Reservation | - | - |
| Schedule Entry | `performance_date`, `schedule_sequence`, `entry_number`, `is_scheduled`, `dancer_names[]` | - |
| Finalize Schedule | `entry_number` locked | - |
| Start Competition | - | `live_status = 'queued'` |
| Current Routine | - | `live_status = 'performing'` |
| Complete Routine | `final_score`, `adjudication_level` | `live_status = 'completed'` |

### Entry ↔ Judge Journey

| Judge Step | Entry Field Changed | Data Created |
|------------|---------------------|--------------|
| View Routine Info | (read only) | - |
| Submit Score | - | `scores` record |
| Special Awards | - | `scores.special_awards[]` |

---

## Data Persistence Verification Queries

### Check Entry Completeness (All Phases)
```sql
SELECT
  ce.id,
  ce.title,
  ce.status,
  ce.entry_number,
  ce.performance_date,
  ce.schedule_sequence,
  ce.is_scheduled,
  array_length(ce.dancer_names, 1) as dancer_count,
  ce.music_file_url IS NOT NULL as has_mp3,
  ce.mp3_duration_ms,
  ce.live_status,
  ce.final_score,
  (SELECT COUNT(*) FROM entry_participants ep WHERE ep.entry_id = ce.id) as participant_count,
  (SELECT COUNT(*) FROM scores s WHERE s.entry_id = ce.id) as score_count
FROM competition_entries ce
WHERE ce.competition_id = 'YOUR_COMP_ID'
ORDER BY ce.schedule_sequence;
```

### Check Data Coverage by Tenant
```sql
SELECT
  t.name as tenant,
  COUNT(*) as total_entries,
  COUNT(ce.performance_date) as has_date,
  COUNT(ce.schedule_sequence) as has_seq,
  COUNT(ce.entry_number) as has_num,
  COUNT(CASE WHEN ce.is_scheduled THEN 1 END) as scheduled,
  COUNT(CASE WHEN ce.dancer_names IS NOT NULL AND array_length(ce.dancer_names, 1) > 0 THEN 1 END) as has_dancers,
  COUNT(ce.music_file_url) as has_mp3,
  COUNT(ce.routine_age) as has_age
FROM competition_entries ce
JOIN tenants t ON ce.tenant_id = t.id
WHERE ce.status != 'cancelled'
GROUP BY t.name;
```

---

*Generated by Claude Code - Entry Journey Analysis*
