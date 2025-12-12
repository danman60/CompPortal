# Game Day / At Competition Mode Specification

**Last Updated:** December 11, 2025
**Status:** Planning Phase - Consolidated from existing documentation
**Phase:** Phase 3 of 4-phase system (Live Event)

---

## 1. Overview

Game Day (also called "At Competition Mode" or "Live Mode") is a dedicated real-time operation system used during dance competition events. It synchronizes all participants across multiple devices and roles:

- **Competition Director (CD)** - Master control panel
- **Judge Tablets** - Scoring interface
- **Backstage Tech** - Music/playlist management
- **Live Scoreboard** - Real-time results display
- **RTMP Overlay** - Livestream integration (future)

**Goal:** When CD presses "Next", all connected devices update simultaneously to show the current routine.

---

## 2. User Roles & Interfaces

### 2.1 Competition Director Control Panel

**Location:** `/dashboard/director-panel/live` (proposed)

**Screen Layout:**
```
+------------------+------------------------+------------------+
|  ROUTINE LIST    |    CURRENT ROUTINE     |   LIVE NOTES     |
|  (Left Panel)    |    (Center Stage)      |   (Right Panel)  |
|                  |                        |                  |
|  [CURRENT] >>>   |   "Shine Bright"       |   [Add Note]     |
|  - Next Up       |   Studio: Dance Academy|   - Prop issue   |
|  - On Deck       |   Dancers: 8           |   - Timing note  |
|  - Queued        |   Category: Junior Jazz|                  |
|                  |                        |                  |
+------------------+------------------------+------------------+
|           PLAYBACK CONTROLS              |   JUDGE STATUS   |
|    [<<] [BACK]  [>> NEXT]  [PAUSE]       |   J1: Ready  J2: |
+------------------+------------------------+------------------+
```

**Features:**
- Playlist-style controls: `[<< Back]` `[>> Next]` `[Pause]`
- Active routine highlighted in list
- Upcoming routines and scheduled breaks visible
- Real-time judge sync status indicators
- Live notes entry for current routine

### 2.2 Judge Tablet Interface

**Location:** `/judge` or `/dashboard/scoring` (dedicated tablet view)

**Screen Layout:**
```
+------------------------------------------------+
|  NOW PERFORMING: "Shine Bright"                |
|  Studio: Dance Academy | Category: Junior Jazz  |
|  Dancers: Emma, Sofia, Mia, ...                |
+------------------------------------------------+
|                                                |
|  SCORE: [==========|----] 85                   |
|         0                 100                   |
|                                                |
|  [Optional: Multi-criteria sliders]            |
|  Technique:    [========|------] 82            |
|  Performance:  [=========|-----] 87            |
|  Choreography: [========|------] 84            |
|                                                |
+------------------------------------------------+
|  Special Awards:                               |
|  [ ] Judge's Choice  [ ] Outstanding Technique |
|  [ ] Best Costume    [ ] Showmanship           |
+------------------------------------------------+
|  Comments: [____________________________]      |
|                                                |
|  [SUBMIT SCORE]                                |
+------------------------------------------------+
|  Sync: [Connected] | Routine 45 of 120         |
+------------------------------------------------+
```

**Requirements:**
- Touch-optimized sliders (not typed input)
- Score range: 1-100 (configurable per competition)
- Single slider OR multi-criteria (CD configurable)
- Special awards toggles from predefined list
- Optional voice-to-text comments (future)
- Offline caching with auto-sync on reconnect
- Auto-advance when CD presses "Next"
- No manual routine navigation for judges

### 2.3 Backstage Tech Interface

**Location:** `/dashboard/backstage` (proposed)

**Features:**
- View routine playlist in scheduled order
- Download MP3s linked to routines
- Trigger music playback for current routine
- System logs elapsed time per routine
- Music file naming: `[EntryNumber]_[RoutineTitle]_[StudioCode].mp3`
- Verification checklist for sound crew

**Music Sync Questions (Outstanding):**
- Does interface integrate with actual audio equipment?
- Or just playlist management (download MP3s, play manually)?
- Fade in/out controls? Volume controls?

### 2.4 Live Scoreboard Display

**Location:** `/scoreboard/:competitionId` (public view)

**Features:**
- Real-time score updates via WebSocket
- Award level distribution (Platinum, Gold, Silver, etc.)
- Category placements (1st, 2nd, 3rd)
- Overall rankings
- Configurable: visible to studios/audience OR CD-only

### 2.5 RTMP Overlay Integration (Future)

**Purpose:** Real-time data feed to livestream overlay

**Data Pushed:**
- Routine title and entry number
- Studio name
- Dancer names
- Category/division
- Live scores (optional)

**Result:** Livestream overlays update automatically without manual intervention

---

## 3. Real-Time Synchronization

### 3.1 "Next" Button Flow

When Competition Director presses **[>> Next]**:

1. **Mark new routine as "Current"** across all devices
2. **Broadcast** routine context to each judge's tablet
3. **Lock** all judges' scoring forms to new routine ID
4. **Refresh** judge tablets automatically with:
   - Routine title
   - Studio name
   - Dancer list
   - Category/level
5. **Update** Backstage Tech display to next music file
6. **Update** Live Scoreboard with previous routine's final score
7. **Update** RTMP overlay (if connected)

### 3.2 Technical Architecture

**Recommended Stack:**
- **WebSockets or Server-Sent Events** for live updates
- **Redis** for real-time leaderboard queries and caching
- **Database triggers** for auto-calculate on score insert/update
- **Optimistic locking** to prevent concurrent update conflicts
- **Queue system** for complex calculations (if needed)

**Performance Requirements:**
- **Sub-second latency:** Scores appear immediately after judge submission
- **Concurrent scoring:** Multiple judges (3+) scoring 10+ entries/hour
- **Auto-calculation:** Average scores, award levels, placements updated in real-time
- **Live updates:** Scoreboard reflects changes without manual refresh

### 3.3 Offline Handling

- **Judges:** Scores cached locally, auto-sync when reconnected
- **Backstage Tech:** Music files pre-downloaded
- **CD:** Brief network interruptions handled gracefully
- **Conflict Resolution:** Last-write-wins with timestamp

---

## 4. Scoring System

### 4.1 Judge Scoring

**Mechanics:**
- Each judge scores 1-100 on slider interface
- Typically 3 judges per competition
- Scores submitted immediately after each routine

**Scoring Criteria (Detailed Mode):**
| Criterion | Description | Points |
|-----------|-------------|--------|
| Technique | Execution, skill level, precision | 1-100 |
| Artistic/Performance | Showmanship, stage presence, emotion | 1-100 |
| Musicality | Use of music, creativity | 1-100 |
| Execution | Formations, spacing, synchronization | 1-100 |
| Choreography | Originality, complexity, composition | 1-100 |

**Simple Mode:** Single slider 1-100

### 4.2 Award Levels (CD Configurable)

| Level | Default Range | Example |
|-------|--------------|---------|
| Platinum | 90-100 | Top tier performance |
| High Gold | 85-89.9 | Excellent |
| Gold | 80-84.9 | Very good |
| High Silver | 75-79.9 | Good |
| Silver | 70-74.9 | Satisfactory |
| Bronze | Below 70 | Participation |

**Calculation:**
1. Average score across all judges
2. Map to award level based on competition's `scoring_ranges`
3. Sort within category for placements (1st, 2nd, 3rd)

### 4.3 Tie-Break Rules (CD Configurable)

1. Highest technique score wins
2. If still tied, highest artistic score
3. If still tied, judges' discretion or shared placement

### 4.4 Special Awards

**Types (CD defines per competition):**
- Judge's Choice
- Outstanding Technique
- Best Costume
- Showmanship Award
- Choreography Award
- Rising Star

**Judge Workflow:**
- Toggle nominees during scoring
- Can nominate multiple routines per award? (TBD)
- Per session or per event? (TBD)

---

## 5. What's Already Built

### 5.1 Backend Router: `liveCompetition.ts`

**Status:** Task #26 Complete - Backend endpoints exist

| Endpoint | Description | Status |
|----------|-------------|--------|
| `getLineup` | Get competition routines in order | ✅ Built |
| `getJudges` | Get assigned judges with status | ✅ Built |
| `updateRoutineStatus` | Set routine state (queued/current/completed/skipped) | ⚠️ Deprecated (needs state table) |
| `submitScore` | Record judge score | ✅ Built |
| `getRoutineScores` | Get all scores for a routine | ✅ Built |
| `getStandings` | Get leaderboard/rankings | ✅ Built |
| `calculateScore` | Compute average + award level | ✅ Built |
| `getStats` | Get competition progress stats | ✅ Built |
| `startCompetition` | Mark competition as "active" | ✅ Built |
| `endCompetition` | Mark competition as "completed" | ✅ Built |

### 5.2 Database Schema

**Existing Fields:**
```sql
-- competition_entries
calculated_score DECIMAL(5,2)  -- Average score across judges
award_level VARCHAR(50)        -- Platinum, Gold, etc.
category_placement INT         -- 1st, 2nd, 3rd within category
running_order INT              -- Position in lineup

-- competitions
scoring_ranges JSONB           -- {"platinum": [90, 100], "gold": [80, 89], ...}
status VARCHAR                 -- pending | active | completed

-- scores
total_score DECIMAL            -- Judge's score for routine
comments TEXT                  -- Optional feedback
scored_at TIMESTAMP            -- When score submitted
```

### 5.3 What's NOT Built

| Component | Status | Notes |
|-----------|--------|-------|
| CD Control Panel UI | ❌ Not built | Page doesn't exist |
| Judge Tablet UI | ❌ Not built | Needs touch-optimized design |
| Backstage Tech UI | ❌ Not built | Page doesn't exist |
| Live Scoreboard UI | ❌ Not built | Needs public view |
| WebSocket Server | ❌ Not built | Real-time sync infrastructure |
| RTMP Overlay API | ❌ Not built | Future phase |
| `live_competition_state` table | ❌ Not built | Track current routine per competition |
| Audio critique recording | ❌ Not built | Optional feature |

---

## 6. Outstanding Questions

### 6.1 Scoring System
1. Default score range? (0-100 confirmed, but configurable?)
2. Single slider vs. multi-criteria per competition?
3. Can judges edit scores after submission? Grace period?
4. Normalized/scaled scores or raw scores?

### 6.2 Special Awards
5. How are awards defined? (CD creates list in Phase 1?)
6. Can judges nominate multiple routines per award?
7. Are special awards per session or per event?
8. Examples needed for default award types

### 6.3 Real-Time Sync
9. What happens if device goes offline during event?
10. How is "current routine" determined? (CD controls? Auto-advance?)
11. WebSocket vs SSE vs polling?
12. How to handle multiple competition days/sessions?

### 6.4 Audio/Music
13. Does Backstage Tech interface integrate with audio equipment?
14. Or just playlist management (download, play manually)?
15. Fade in/out controls? Volume controls?
16. MP3 sync/playback integration scope?

### 6.5 Routine Status Tracking
17. What statuses exist? (Queued, Current, Completed, Skipped?)
18. Can routines be marked scratched/withdrawn on game day?
19. How does system handle running ahead/behind schedule?
20. Separate `live_competition_state` table needed?

### 6.6 Media Capture
21. Is Media Operator a separate role?
22. File size limits for photos/videos?
23. Upload during event or post-event batch?

### 6.7 Awards Ceremony
24. Does system notify CD when ceremony should start?
25. Can ceremony be delayed if running behind?
26. What data displayed? (Top 10? Specific placements?)

### 6.8 Judge Workflow
27. Can judges score routines out of order (if they miss one)?
28. Judge scoring history/stats visible?
29. Calibration checks (flag outlier judges)?

### 6.9 Breaks During Event
30. How does system handle scheduled breaks?
31. Does timer pause or continue?
32. Can breaks be extended?

### 6.10 Technical Issues
33. What if music file won't play (corrupted)?
34. Emergency contact system between roles?

---

## 7. Implementation Roadmap

### Phase 3A: Core Infrastructure (Week 1-2)
- [ ] Create `live_competition_state` table
- [ ] Implement WebSocket server for real-time sync
- [ ] Build CD Control Panel base UI
- [ ] Add "current routine" tracking

### Phase 3B: Judge Interface (Week 2-3)
- [ ] Design touch-optimized tablet UI
- [ ] Build slider scoring component
- [ ] Implement offline caching
- [ ] Add auto-advance on "Next"

### Phase 3C: Scoring & Tabulation (Week 3-4)
- [ ] Real-time score calculation triggers
- [ ] Award level auto-assignment
- [ ] Tie-break logic
- [ ] Live scoreboard UI

### Phase 3D: Backstage & Music (Week 4-5)
- [ ] Backstage Tech playlist view
- [ ] Music file download/management
- [ ] Integration with entry numbers

### Phase 3E: Polish & Edge Cases (Week 5-6)
- [ ] Offline recovery
- [ ] Break scheduling
- [ ] Awards ceremony flow
- [ ] RTMP overlay API (stretch)

---

## 8. User Stories

1. **As a Competition Director**, I want to advance routines from one control panel so all judges stay synchronized.

2. **As a Judge**, I want my tablet to automatically show the current routine so I don't have to manually navigate.

3. **As a Livestream Operator**, I want overlays to update automatically so I don't miss routine information.

4. **As a Stage Manager**, I want visual timers between routines so I can pace the event properly.

5. **As a Competition Director**, I want to add live notes during routines so I can reference them later.

6. **As a Backstage Tech**, I want to see the music playlist in order so I can cue the correct file.

7. **As a Studio Director**, I want to see live scores (if enabled) so I know how my routines performed.

---

## 9. Source Documents

This specification was consolidated from:
- `docs/reference/BUGS_AND_FEATURES.md` (lines 122-203) - At Competition Mode
- `docs/specs/MASTER_BUSINESS_LOGIC.md` (lines 162-252) - Phase 3: Game Day
- `docs/stakeholder/COMPETITION_WORKFLOW.md` (Sections 5, 6, 9.5) - Competition Day Ops
- `docs/journeys/JUDGE_USER_JOURNEY.md` - Judge tablet interface
- `src/server/routers/liveCompetition.ts` - Backend implementation

---

**Next Steps:**
1. Answer outstanding questions with stakeholder input
2. Design UI mockups for CD Control Panel and Judge Tablet
3. Implement WebSocket infrastructure
4. Build Phase 3A core components
