# Game Day / At Competition Mode Specification

**Last Updated:** December 11, 2025
**Status:** DECISIONS LOCKED - Ready for Implementation
**Phase:** Phase 3 of 4-phase system (Live Event)
**Build Order:** Backstage (BS) first, then CD Control Panel

---

## 1. Overview

Game Day (also called "At Competition Mode" or "Live Mode") is a dedicated real-time operation system used during dance competition events. It synchronizes all participants across multiple devices and roles:

- **Competition Director (CD)** - Master control panel, can start/stop competition
- **Judge Tablets** - Scoring interface with authenticated login
- **Backstage Tech (BS)** - Music playback + playlist management (KIOSK MODE)
- **Live Scoreboard** - Real-time results display
- **RTMP Overlay** - Livestream integration (future)

**Core Goals:**
1. Keep everyone **IN SYNC** (constantly reading system time)
2. Work **WITH OR WITHOUT internet connection** (offline-first architecture)
3. Work **WITH OR WITHOUT app playing music** (fallback + planned option)
4. **250ms acceptable latency** for sync operations
5. **Auto-sync back** when connection restored

---

## 2. Critical Architecture Decisions (LOCKED)

### 2.1 Offline-First Design
- **ALL views must work offline** after initial data download
- MP3s: Always downloaded at competition, **NEVER streamed from online**
- Scores: Cached locally, auto-sync when reconnected
- State: Persists per competition across days
- Chat: Local only, persists across days per competition

### 2.2 Music Playback
- **Web app actually plays MP3 files** connected to sound system
- **Duration derived from actual MP3 files** (not database field)
- All views see **actual physical length of MP3 as it ticks down**
- Backstage device is plugged into sound system
- MP3 storage: Supabase bucket (~6000 files capacity needed)

### 2.3 Entry Numbers (LOCKED)
- Entry numbers are **COMPETITION-WIDE** and **LOCKED** once schedule finalized
- Example: Routine 111 stays 111 **no matter where dragged in schedule**
- When reordered: **Time changes, entry number stays the same**
- CD can move routines whenever needed

### 2.4 Sync Architecture
- Constantly reading system time for sync
- 250ms acceptable latency
- Auto-sync on reconnection
- State carries over per competition (across days)

---

## 3. User Roles & Interfaces

### 3.1 Tabulator Control Panel (formerly "CD")

**Location:** `/dashboard/director-panel/live`

**Tabulator Capabilities:**
- ✅ Start/Stop competition
- ✅ See time remaining in current routine (from actual MP3)
- ✅ See judge scores as they come in (3 columns: Judge A, B, C + average)
- ✅ See adjudication level result next to each average
- ✅ Reorder routines with confirmation dialog (**ONLY Tabulator can move routines**)
- ✅ Move routine to different day easily
- ✅ See full schedule of routines for day
- ✅ See judges status (connected, scoring, break requested)
- ✅ Add emergency breaks (updates schedule times for all routines)
- ✅ Approve/deny judge break requests
- ✅ Edit scores after judge submits (emergency only)
- ✅ Toggle whether judges can see other judges' scores
- ✅ Mark routine as scratched/withdrawn (optional reason)
- ✅ **Edge case alerts** when small score diff bumps down adjudication level
- ✅ **Print labels** with scores

**Screen Layout:**
```
+------------------+------------------------+------------------+
|  SCHEDULE        |    CURRENT ROUTINE     |   SCORES PANEL   |
|  (Left Panel)    |    (Center Stage)      |   (Right Panel)  |
|                  |                        |                  |
|  111 [CURRENT]   |   "Shine Bright"       |  Judge A: 89.06  |
|  112 Next Up     |   Studio: Dance Academy|  Judge B: 88.50  |
|  113 On Deck     |   Entry #111           |  Judge C: 89.25  |
|  --- BREAK ---   |                        |  ─────────────── |
|  114 Queued      |   [====|----] 1:42     |  AVG: 88.94      |
|                  |   Time Remaining       |  PLATINUM        |
+------------------+------------------------+------------------+
|  CONTROLS                                 |  SCHEDULE STATUS |
|  [<< BACK] [STOP] [>> NEXT] [+ BREAK]     |  Running: +5 min |
+------------------+------------------------+------------------+
|  ⚠️ ALERT: Entry #108 bumped down due to 0.01 diff [REVIEW] |
+-------------------------------------------------------------+
```

### 3.2 Judge Tablet Interface (iPad)

**Location:** `/judge` (authenticated, tracks who scored what)

**Judge Capabilities:**
- ✅ Score current routine (single overall XX.XX score)
- ✅ Edit score **until submitted** (after submit, only Tabulator can edit)
- ✅ Request breaks: **[2 min] [5 min] [10 min]** buttons (shows to Tabulator)
- ✅ See other judges' scores (Tabulator toggleable)
- ✅ **BOTH input methods:** Slider OR manual number typing
- ✅ Comments field
- ✅ **Title Division breakdown** (when applicable)

**Scoring:**
- **Format: XX.XX** (two decimals ALWAYS required)
- **Valid:** 89.06, 42.67, 98.90, 75.00
- **Invalid:** 69, 72, 86.6, 89.3
- **Input:** Manual typing (faster) OR slider (visual)
- Adjudication levels from competition settings

**Screen Layout (Standard Routine):**
```
+------------------------------------------------+
|  NOW PERFORMING: "Shine Bright" (Entry #111)   |
|  Studio: Dance Academy | Category: Junior Jazz  |
|  Time Remaining: [====|----] 1:42              |
+------------------------------------------------+
|                                                |
|  YOUR SCORE: [  89.06  ]  ← Manual input       |
|              [==========|----] ← OR Slider     |
|              00.00              99.99          |
|                                                |
|  Adjudication Level: PLATINUM (88.00-91.99)   |
|                                                |
+------------------------------------------------+
|  [Show Other Scores] (if enabled)              |
|  A: 89.06  |  B: --  |  C: --  |  AVG: 89.06  |
+------------------------------------------------+
|  Special Awards: [ ] Judge's Choice            |
|  Comments: [____________________________]      |
|                                                |
|  [SUBMIT SCORE]                                |
+------------------------------------------------+
|  REQUEST BREAK: [2 min] [5 min] [10 min]       |
+------------------------------------------------+
```

**Screen Layout (Title Division Routine):**
```
+------------------------------------------------+
|  NOW PERFORMING: "Championship Solo" (#205)    |
|  ⭐ TITLE DIVISION                              |
+------------------------------------------------+
|  MAIN SCORE: [  92.50  ]                       |
+------------------------------------------------+
|  TITLE BREAKDOWN (whole numbers OK):           |
|  Technique:     [  18  ] / 20                  |
|  [Category 2]:  [  17  ] / 20                  |
|  [Category 3]:  [  19  ] / 20                  |
|  [Category 4]:  [  16  ] / 20                  |
|  [Category 5]:  [  18  ] / 20                  |
+------------------------------------------------+
|  [SUBMIT SCORE]                                |
+------------------------------------------------+
```

### 3.3 Backstage Tech Interface (KIOSK MODE)

**Location:** `/backstage` (kiosk mode - no navigation)

**Backstage Capabilities:**
- ✅ View routine playlist in scheduled order
- ✅ See current routine + next 3 upcoming
- ✅ **Play MP3 files** through connected sound system
- ✅ See actual duration countdown from MP3
- ✅ Pre-download all MP3s for offline operation
- ✅ Music file naming: `[EntryNumber]_[RoutineTitle]_[StudioCode].mp3`
- ✅ **TV Display Mode** - Can be put on TV screen in backstage area

**TV Display Feature (NEW):**
- Put on a TV screen in backstage waiting area
- Shows **time remaining in routine** while dancers wait
- Helpful because "you can't always tell how much is left in the song"
- Large, readable display optimized for viewing from distance

**Screen Layout (Control View):**
```
+----------------------------------------------------------+
|  BACKSTAGE TECH - KIOSK MODE              [Sync: ✓]      |
+----------------------------------------------------------+
|  NOW PLAYING: Entry #111 - "Shine Bright"                |
|  Studio: Dance Academy                                    |
|                                                          |
|  [▶ PLAY] [⏸ PAUSE] [⏹ STOP]                             |
|                                                          |
|  [========|----------------] 1:42 / 3:24                 |
|                                                          |
+----------------------------------------------------------+
|  UP NEXT:                                                |
|  #112 - "Glow" (Studio B) - 2:58                         |
|  #113 - "Rise" (Studio C) - 3:12                         |
|  --- 10 MIN BREAK ---                                    |
|  #114 - "Dreams" (Studio A) - 2:45                       |
+----------------------------------------------------------+
|  MP3 Status: 120/120 downloaded ✓                        |
+----------------------------------------------------------+
```

**Screen Layout (TV Display Mode):**
```
+----------------------------------------------------------+
|                                                          |
|           NOW PERFORMING                                 |
|                                                          |
|           Entry #111                                     |
|           "Shine Bright"                                 |
|           Dance Academy                                  |
|                                                          |
|                 1:42                                     |
|              remaining                                   |
|                                                          |
|           UP NEXT: #112 "Glow"                          |
|                                                          |
+----------------------------------------------------------+
```

### 3.4 Live Scoreboard Display

**Location:** `/scoreboard/:competitionId` (public view)

**Features:**
- Real-time score updates
- Award level distribution
- Category placements
- Running schedule status (ahead/behind)

---

## 4. Scoring System (LOCKED - Updated per Client Feedback)

### 4.1 Judge Scoring

| Setting | Value |
|---------|-------|
| Score Range | **00.00 - 99.99** |
| Score Format | **XX.XX** (two decimals ALWAYS required) |
| Valid Examples | 89.06, 42.67, 98.90, 75.00 |
| Invalid Examples | 69, 72, 86.6, 89.3 (must have exactly 2 decimals) |
| Input Method | **BOTH slider AND manual typing** (user choice) |
| Number of Judges | **Exactly 3** (Judge A, Judge B, Judge C) |
| Edit Window | Judge can edit **until submit** |
| Post-Submit Edit | **Tabulator only** (emergency) |
| Score Visibility | Tabulator toggleable - judges can see other scores or not |

### 4.2 Title Division Scoring (NEW)

When routine is upgraded to **Title** status, judges enter:
1. **Regular score** (XX.XX format)
2. **5 breakdown scores** (whole numbers OK):
   - Technique (20 points max)
   - [4 additional categories - TBD from client screenshot]

### 4.3 Adjudication Levels

Adjudication levels are **tenant-configurable** via `competition_settings`.
Each tenant defines their own level names, score ranges, and display colors.

**Database Schema:**
```typescript
// competition_settings.adjudication_levels (JSONB)
{
  "levels": [
    { "name": "Dynamic Diamond", "min": 95.00, "max": 99.99, "color": "#00D4FF" },
    { "name": "Titanium", "min": 92.00, "max": 94.99, "color": "#C0C0C0" },
    { "name": "Platinum", "min": 88.00, "max": 91.99, "color": "#E5E4E2" },
    { "name": "Afterglow", "min": 85.00, "max": 87.99, "color": "#FFD700" }
    // ... tenant defines their own levels
  ],
  "edgeCaseThreshold": 0.1  // Alert when score diff < this causes level bump
}
```

**Implementation:**
- System reads levels from `competition_settings.adjudication_levels`
- Award level determined by `average >= level.min && average <= level.max`
- Display color from `level.color`
- NOT hardcoded - fully tenant-configurable

**Terminology:** Use "Adjudication" not "Awards Ceremony"

### 4.4 Score Display to Tabulator

- 3-column display: Judge A, Judge B, Judge C
- Average calculated automatically in real-time
- Adjudication level result displayed next to average
- Tabulator sees all scores immediately

### 4.5 Edge Case Alert System (NEW - CRITICAL)

**Scenario:** When one judge's small difference (e.g., 0.01) causes a routine to bump DOWN to a lower adjudication level.

**Example:** Two judges score 99.00, one scores 98.99 — if this bumps the routine down a level:
1. System displays **visual alert** to Tabulator
2. Tabulator initiates **human conversation** with judge
3. Judge decides whether to revisit their score
4. **Judge re-enters corrected score on their iPad** (Tabulator does NOT edit directly)
5. This is NOT automated — requires human decision

**Rationale:** Studios receive printouts showing all 3 judge scores + average. They will notice discrepancies.

### 4.6 Label Printing (NEW)

Tabulator needs ability to **print labels** with:
- Routine number and name
- Judge A, B, C scores
- Average score
- Adjudication level

---

## 5. Break System (LOCKED)

### 5.1 Judge Break Requests

| Button | Duration |
|--------|----------|
| [2 min] | 2 minute break |
| [5 min] | 5 minute break |
| [10 min] | 10 minute break |

- Request shows to CD only
- CD can approve or deny
- CD can stop break early to make up time

### 5.2 Emergency Breaks (CD)

- CD can add emergency breaks anywhere in schedule
- Breaks update schedule times for ALL subsequent routines
- Schedule delay shown to all views
- CD may stop break early to recover time

### 5.3 Schedule Delay Display

- Show running delay (e.g., "+5 min behind")
- All views see this status
- Helps CD decide when to cut breaks

---

## 6. Routine Management (LOCKED)

### 6.1 Reordering

- CD can reorder routines **at any time**
- **Confirmation dialog required** for reorder
- Time slot changes, **entry number stays locked**
- Can move routine to different day

### 6.2 Scratched/Withdrawn

- CD can mark routine as scratched
- **Optional reason field**
- Routine removed from active lineup

### 6.3 Entry Numbers

- Competition-wide numbering (e.g., 111, 112, 113...)
- **LOCKED once schedule finalized**
- Entry 111 remains 111 no matter where moved

---

## 7. Chat System (LOCKED)

- **Local only** (no server storage)
- Persists across days per competition
- For internal communication between CD/BS/Judges

---

## 8. Authentication & Storage

### 8.1 Judge Auth

- Judges have **login accounts**
- Tracks what each judge scored
- Required for score attribution

### 8.2 MP3 Storage

- **Supabase bucket** (~6000 files capacity)
- **Always downloaded** at competition start
- **Never streamed** during event
- Offline operation after download

### 8.3 State Persistence

- State carries over per competition
- Persists across days
- Survives app restart

---

## 8A. Music Upload System (Pre-Competition) - NEW

### Studio Upload Portal

Studios upload MP3s via their routines dashboard before competition.

**Features:**
- Upload MP3 directly from routine detail page
- File naming convention: `[EntryNumber]_[RoutineTitle]_[StudioCode].mp3`
- Progress indicator during upload
- **Big green checkmark** when all music uploaded for studio

### Competition Director View

**Missing Music Report:**
- Shows which studios are missing music
- Lists specific entries without MP3s
- Count: "Studio A is missing music from 3 entries"
- Easy communication: Click to email studio about missing music

**Workflow:**
1. Week before competition: System generates missing music report
2. CD sends reminder to studios with missing music
3. Studios upload remaining files
4. Day before: All MP3s downloaded to backstage computer

---

## 9. What's Already Built

### 9.1 Backend Router: `liveCompetition.ts`

| Endpoint | Status | Notes |
|----------|--------|-------|
| `getLineup` | ✅ Built | Needs MP3 duration |
| `getJudges` | ✅ Built | Good |
| `submitScore` | ✅ Built | Update to XX.XX format (00.00-99.99) |
| `getRoutineScores` | ✅ Built | Good |
| `getStandings` | ✅ Built | Good |
| `calculateScore` | ✅ Built | Good |
| `startCompetition` | ✅ Built | Good |
| `endCompetition` | ✅ Built | Good |

### 9.2 Needs Building

| Component | Priority | Notes |
|-----------|----------|-------|
| Backstage UI | **P0** | Build first, kiosk mode |
| MP3 Player | **P0** | Web Audio API, duration from file |
| CD Control Panel | **P1** | After backstage |
| Judge Tablet UI | **P1** | XX.XX format (slider + typing) |
| Break System | **P2** | Request + emergency breaks |
| Offline Sync | **P2** | Service worker + IndexedDB |
| Local Chat | **P3** | Simple local storage |

---

## 10. Question Resolutions (ANSWERED)

All outstanding questions have been answered with reasonable defaults. Client can override.

### 10.1 Technical (RESOLVED)

| Question | Default Answer | Rationale |
|----------|----------------|-----------|
| Web Audio API latency | <50ms acceptable | Standard for dance music; not a live band |
| Service Worker vs Electron | **PWA with Service Worker** | Simpler deployment, no app store approval |
| IndexedDB size concerns | 500MB max per competition | ~100 MP3s @ 5MB each + metadata |

### 10.2 UX Details (RESOLVED)

| Question | Default Answer | Rationale |
|----------|----------------|-----------|
| Reorder confirmation text | "Move Entry #[X] from position [A] to [B]? Times will be recalculated." | Clear, actionable |
| Kiosk mode exit | **Press ESC 3 times rapidly** | Prevents accidental exit, no mouse needed |
| Judge login | **6-digit PIN code** | Fast entry on tablet, secure enough |

### 10.3 Awards (RESOLVED)

| Question | Default Answer | Rationale |
|----------|----------------|-----------|
| Special award nomination | **During scoring** - checkbox on score form | Minimal context switching |
| When given | **Per competition** (end of event) | Standard industry practice |

### 10.4 Edge Cases (RESOLVED)

| Question | Default Answer | Rationale |
|----------|----------------|-----------|
| Corrupted MP3 | **Show warning + manual skip option** | CD decides, not auto-skip |
| Judge disconnects mid-score | **Cache locally, resume on reconnect** | Preserves work |
| Multiple days | **Day 1 state persists, Day 2 continues sequence** | Entry numbers stay locked |
| Score increments | **Two decimals (XX.XX)** | Client requirement |

---

## 11. Implementation Roadmap (Updated)

### Phase 3A: Backstage + Music (Week 1-2) - BUILD FIRST
- [ ] Backstage Tech UI (kiosk mode)
- [ ] MP3 player component (Web Audio API)
- [ ] Duration extraction from MP3 files
- [ ] MP3 download manager for offline
- [ ] Real-time countdown display

### Phase 3B: CD Control Panel (Week 2-3)
- [ ] CD main interface
- [ ] Start/stop competition
- [ ] Routine reorder with confirmation
- [ ] Emergency break insertion
- [ ] Running scores display
- [ ] Schedule delay indicator

### Phase 3C: Judge Interface (Week 3-4)
- [ ] Judge auth/login
- [ ] XX.XX format input (slider + typing)
- [ ] Break request buttons (2/5/10 min)
- [ ] Score visibility toggle (CD controls)
- [ ] Offline score caching

### Phase 3D: Sync Infrastructure (Week 4-5)
- [ ] Offline-first architecture
- [ ] Service worker for PWA
- [ ] IndexedDB for local storage
- [ ] Auto-sync on reconnection
- [ ] Time sync across devices (250ms target)

### Phase 3E: Polish (Week 5-6)
- [ ] Local chat system
- [ ] Special awards flow
- [ ] Edge case handling
- [ ] Testing with real MP3s

---

## 12. Source Documents

Consolidated from:
- `docs/reference/BUGS_AND_FEATURES.md` - At Competition Mode
- `docs/specs/MASTER_BUSINESS_LOGIC.md` - Phase 3: Game Day
- `docs/stakeholder/COMPETITION_WORKFLOW.md` - Competition Day Ops
- `docs/journeys/JUDGE_USER_JOURNEY.md` - Judge tablet interface
- `src/server/routers/liveCompetition.ts` - Backend implementation
- **User decisions from December 11, 2025 Q&A session**

---

## 13. Decision Log

| Date | Decision | Details |
|------|----------|---------|
| 2025-12-11 | Build order | Backstage first, then Tabulator |
| 2025-12-11 | Offline | Must work with/without internet |
| 2025-12-11 | Music | App plays MP3, never streams |
| 2025-12-11 | Sync latency | 250ms acceptable |
| 2025-12-11 | Score range | ~~60-100~~ → **00.00-99.99** (client feedback) |
| 2025-12-11 | Score format | **XX.XX two decimals ALWAYS** (client: Selena) |
| 2025-12-11 | Input method | **BOTH slider AND manual typing** |
| 2025-12-11 | Number of judges | **Exactly 3** (Judge A, B, C) |
| 2025-12-11 | Scoring mode | Single overall score |
| 2025-12-11 | Title Division | **5 breakdown categories** when Title status |
| 2025-12-11 | Score edit | Judge until submit, then Tabulator only |
| 2025-12-11 | Entry numbers | Competition-wide, LOCKED |
| 2025-12-11 | Reorder permission | **ONLY Tabulator can move routines** |
| 2025-12-11 | Breaks | Judge requests 2/5/10 min buttons |
| 2025-12-11 | Chat | Local only, persists per competition |
| 2025-12-11 | Judge auth | Login accounts required |
| 2025-12-11 | Backstage | Kiosk mode + **TV Display Mode** |
| 2025-12-11 | MP3 storage | Supabase bucket (~6000 files) |
| 2025-12-11 | Edge case alerts | Alert when 0.01 diff bumps down level |
| 2025-12-11 | Label printing | Tabulator can print score labels |
| 2025-12-11 | Music upload | Studios upload via portal, missing music report |
| 2025-12-11 | Terminology | "Adjudication" not "Awards Ceremony" |
| 2025-12-11 | Role rename | "Tabulator" replaces "CD" in live views |

---

## 14. Supplementary Spec Documents

The following detailed specifications have been created:

| Document | Contents |
|----------|----------|
| `GAME_DAY_STATE_MACHINES.md` | 5 state machines (Competition, Routine, Score, Break, Playback) |
| `GAME_DAY_DATABASE_SCHEMA.md` | 4 new tables + column additions with SQL/Prisma |
| `GAME_DAY_WEBSOCKET_PROTOCOL.md` | Complete real-time sync protocol |
| `GAME_DAY_API_CONTRACTS.md` | All Zod schemas for input/output validation |
| `GAME_DAY_TEST_SPECIFICATIONS.md` | Unit, integration, E2E, offline, performance tests |

---

## 15. Client Feedback Source

**Client:** Selena
**Date:** December 2025
**Source File:** `Client Feedback.md`

All major decisions in this spec have been validated against client requirements.
