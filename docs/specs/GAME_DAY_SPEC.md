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

### 3.1 Competition Director (CD) Control Panel

**Location:** `/dashboard/director-panel/live`

**CD Capabilities:**
- ✅ Start/Stop competition
- ✅ See time remaining in current routine (from actual MP3)
- ✅ See judge scores as they come in (running scores + average)
- ✅ Reorder routines with confirmation dialog
- ✅ Move routine to different day easily
- ✅ See full length of routines left for day
- ✅ See judges status (connected, scoring, break requested)
- ✅ Add emergency breaks (updates schedule times for all routines)
- ✅ Approve/deny judge break requests
- ✅ Edit scores after judge submits
- ✅ Toggle whether judges can see other judges' scores
- ✅ Mark routine as scratched/withdrawn (optional reason)

**Screen Layout:**
```
+------------------+------------------------+------------------+
|  ROUTINE LIST    |    CURRENT ROUTINE     |   STATUS PANEL   |
|  (Left Panel)    |    (Center Stage)      |   (Right Panel)  |
|                  |                        |                  |
|  111 [CURRENT]   |   "Shine Bright"       |  JUDGE STATUS    |
|  112 Next Up     |   Studio: Dance Academy|  J1: ✓ Scored 82 |
|  113 On Deck     |   Entry #111           |  J2: ✓ Scored 85 |
|  --- BREAK ---   |                        |  J3: ⏳ Scoring...|
|  114 Queued      |   [====|----] 1:42     |                  |
|                  |   Time Remaining       |  AVG: 83.5       |
+------------------+------------------------+------------------+
|  CONTROLS                                 |  SCHEDULE STATUS |
|  [<< BACK] [STOP] [>> NEXT] [+ BREAK]     |  Running: +5 min |
+------------------+------------------------+------------------+
|  BREAK REQUESTS: J2 requests 5 min [APPROVE] [DENY]         |
+-------------------------------------------------------------+
```

### 3.2 Judge Tablet Interface

**Location:** `/judge` (authenticated, tracks who scored what)

**Judge Capabilities:**
- ✅ Score current routine (single overall score)
- ✅ Edit score **until submitted** (after submit, only CD can edit)
- ✅ Request breaks: **[2 min] [5 min] [10 min]** buttons (shows to CD)
- ✅ See other judges' scores (CD toggleable)
- ✅ Award slider (already built - reuse)
- ✅ Comments field

**Scoring:**
- **Range: 60-100** (not 0-100)
- **Single overall score** (not multi-criteria)
- Titled scoring levels from competition settings
- Scores save real metadata

**Screen Layout:**
```
+------------------------------------------------+
|  NOW PERFORMING: "Shine Bright" (Entry #111)   |
|  Studio: Dance Academy | Category: Junior Jazz  |
|  Time Remaining: [====|----] 1:42              |
+------------------------------------------------+
|                                                |
|  YOUR SCORE: [==========|----] 82              |
|              60                100              |
|                                                |
|  Award Level: HIGH GOLD (80-84)                |
|                                                |
+------------------------------------------------+
|  [Show Other Scores] (if enabled by CD)        |
|  J1: 82  |  J2: --  |  J3: --  |  AVG: 82     |
+------------------------------------------------+
|  Special Awards: [ ] Judge's Choice            |
|  Comments: [____________________________]      |
|                                                |
|  [SUBMIT SCORE]                                |
+------------------------------------------------+
|  REQUEST BREAK: [2 min] [5 min] [10 min]       |
+------------------------------------------------+
|  Sync: [Connected] | Entry 45 of 120           |
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

**Screen Layout:**
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

### 3.4 Live Scoreboard Display

**Location:** `/scoreboard/:competitionId` (public view)

**Features:**
- Real-time score updates
- Award level distribution
- Category placements
- Running schedule status (ahead/behind)

---

## 4. Scoring System (LOCKED)

### 4.1 Judge Scoring

| Setting | Value |
|---------|-------|
| Score Range | **60-100** |
| Scoring Mode | **Single overall score** (not multi-criteria) |
| Edit Window | Judge can edit **until submit** |
| Post-Submit Edit | **CD only** |
| Score Visibility | CD toggleable - judges can see other scores or not |

### 4.2 Award Levels

Award levels are defined in **competition settings** (already exists).
System uses `scoring_ranges` from competition config.

### 4.3 Score Display to CD

- Running scores visible as judges submit
- Average calculated in real-time
- CD sees all scores immediately

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

## 9. What's Already Built

### 9.1 Backend Router: `liveCompetition.ts`

| Endpoint | Status | Notes |
|----------|--------|-------|
| `getLineup` | ✅ Built | Needs MP3 duration |
| `getJudges` | ✅ Built | Good |
| `submitScore` | ✅ Built | Update range to 60-100 |
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
| Judge Tablet UI | **P1** | 60-100 slider |
| Break System | **P2** | Request + emergency breaks |
| Offline Sync | **P2** | Service worker + IndexedDB |
| Local Chat | **P3** | Simple local storage |

---

## 10. Outstanding Questions (REMAINING)

### 10.1 Technical
1. **Web Audio API** - Any specific requirements for MP3 playback latency?
2. **Service Worker** - PWA approach for offline, or electron app?
3. **IndexedDB** - For offline score storage, any size concerns?

### 10.2 UX Details
4. **Confirmation dialogs** - What exact text for reorder confirmation?
5. **Kiosk mode** - Full screen lock? How to exit?
6. **Judge login** - PIN code? Password? Biometric?

### 10.3 Awards
7. **Special awards** - How do judges nominate? (Separate screen? During scoring?)
8. **Per session or per event?** - When are special awards given?

### 10.4 Edge Cases
9. **Corrupted MP3** - Show warning and allow skip? Auto-skip?
10. **Judge disconnects mid-score** - Cache and resume? Require re-score?
11. **Multiple days** - How to handle day transitions?

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
- [ ] 60-100 slider (single score)
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
| 2025-12-11 | Build order | Backstage first, then CD |
| 2025-12-11 | Offline | Must work with/without internet |
| 2025-12-11 | Music | App plays MP3, never streams |
| 2025-12-11 | Sync latency | 250ms acceptable |
| 2025-12-11 | Score range | 60-100 (not 0-100) |
| 2025-12-11 | Scoring mode | Single overall score |
| 2025-12-11 | Score edit | Judge until submit, then CD only |
| 2025-12-11 | Entry numbers | Competition-wide, LOCKED |
| 2025-12-11 | Breaks | Judge requests 2/5/10 min buttons |
| 2025-12-11 | Chat | Local only, persists per competition |
| 2025-12-11 | Judge auth | Login accounts required |
| 2025-12-11 | Backstage | Kiosk mode |
| 2025-12-11 | MP3 storage | Supabase bucket (~6000 files) |
