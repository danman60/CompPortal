# Game Day Implementation Gap Analysis & Audit

**Created:** December 11, 2025
**Purpose:** Comprehensive audit of ALL gaps between current state and Game Day requirements
**Status:** Ready for Implementation Planning

---

## Executive Summary

After thorough analysis of user journeys, schema alignment, test simulations, and external services, I've identified **67 gaps** across 8 categories. This document serves as the implementation checklist.

| Category | Critical Gaps | High Priority | Medium | Low |
|----------|--------------|---------------|--------|-----|
| Database Schema | 4 | 6 | 3 | 2 |
| Backend API | 8 | 5 | 4 | 2 |
| Frontend Components | 6 | 8 | 5 | 3 |
| Real-time Sync | 3 | 4 | 2 | 0 |
| Offline/PWA | 4 | 3 | 2 | 1 |
| MP3/Audio | 3 | 2 | 2 | 1 |
| Security/Auth | 2 | 3 | 1 | 0 |
| Edge Cases | 2 | 4 | 3 | 2 |
| **TOTAL** | **32** | **35** | **22** | **11** |

---

## 1. DATABASE SCHEMA GAPS

### 1.1 CRITICAL - New Tables Required

#### GAP-DB-001: `live_competition_state` table missing
**Current:** No way to track real-time competition state
**Required:**
```sql
CREATE TABLE live_competition_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  current_entry_id UUID REFERENCES competition_entries(id),
  current_entry_started_at TIMESTAMPTZ,
  current_entry_status VARCHAR(20), -- 'performing', 'scoring', 'completed'
  mp3_playback_position_ms INT DEFAULT 0,
  mp3_is_playing BOOLEAN DEFAULT false,
  schedule_delay_minutes INT DEFAULT 0,
  judges_can_see_scores BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  paused_at TIMESTAMPTZ,
  day_number INT DEFAULT 1,
  session_number INT DEFAULT 1,
  last_sync_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id)
);
```
**Test Simulation:** CD clicks "Start Competition" → Where is state stored? → FAIL (no table)

#### GAP-DB-002: `break_requests` table missing
**Current:** No judge break request tracking
**Required:**
```sql
CREATE TABLE break_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  judge_id UUID NOT NULL REFERENCES judges(id),
  requested_duration_minutes INT NOT NULL, -- 2, 5, or 10
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'completed'
  requested_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  actual_duration_minutes INT,
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```
**Test Simulation:** Judge clicks "5 min break" → Where stored? → FAIL (no table)

#### GAP-DB-003: `schedule_breaks` table missing
**Current:** No emergency/scheduled break tracking
**Required:**
```sql
CREATE TABLE schedule_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  inserted_after_entry_id UUID REFERENCES competition_entries(id),
  duration_minutes INT NOT NULL,
  reason VARCHAR(255),
  break_type VARCHAR(20), -- 'emergency', 'scheduled', 'judge_request'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Test Simulation:** CD adds 10 min emergency break → Where stored? → FAIL (no table)

#### GAP-DB-004: `score_audit_log` table missing
**Current:** No audit trail for score edits
**Required:**
```sql
CREATE TABLE score_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES scores(id),
  entry_id UUID NOT NULL REFERENCES competition_entries(id),
  judge_id UUID NOT NULL REFERENCES judges(id),
  previous_score DECIMAL(6,2),
  new_score DECIMAL(6,2),
  edited_by UUID NOT NULL REFERENCES users(id),
  edit_reason VARCHAR(255),
  edited_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);
```
**Test Simulation:** CD edits score from 82 to 85 → How to audit? → FAIL (no table)

### 1.2 HIGH PRIORITY - Column Additions

#### GAP-DB-005: `competition_entries.mp3_duration_ms` missing
**Current:** `music_duration` is interval type, `duration` is interval (scheduling)
**Issue:** Cannot get actual MP3 duration in milliseconds for countdown
**Required:** Add `mp3_duration_ms INT` column
**Workaround:** Extract from MP3 file at download time, store in IndexedDB

#### GAP-DB-006: `competition_entries.live_status` missing
**Current:** No per-entry live status
**Required:** Add `live_status VARCHAR(20)` -- 'queued', 'current', 'completed', 'skipped', 'scratched'
**Note:** Different from `status` which is registration status

#### GAP-DB-007: `competition_entries.scratched_reason` missing
**Current:** No field to store scratch reason
**Required:** Add `scratched_reason VARCHAR(255)`

#### GAP-DB-008: `judges.last_seen_at` missing
**Current:** Only `checked_in` boolean
**Required:** Add `last_seen_at TIMESTAMPTZ` for connection status tracking

#### GAP-DB-009: `judges.current_status` missing
**Current:** No real-time status
**Required:** Add `current_status VARCHAR(20)` -- 'connected', 'scoring', 'submitted', 'break_requested'

#### GAP-DB-010: `competitions.live_mode_started_at` missing
**Current:** Only `status` field
**Required:** Add `live_mode_started_at TIMESTAMPTZ` for tracking when Game Day started

### 1.3 MEDIUM PRIORITY - Schema Modifications

#### GAP-DB-011: `scores.total_score` range not enforced at DB level
**Current:** DECIMAL(6,2) allows any value
**Required:** Add CHECK constraint `total_score >= 60 AND total_score <= 100`
**Note:** Must also update backend validation (currently 0-10)

#### GAP-DB-012: `scores.submitted_at` vs `scored_at` confusion
**Current:** `scored_at` exists
**Required:** Clarify: `scored_at` = initial score, need `submitted_at` for final submission

#### GAP-DB-013: `competition_entries.entry_number` can be NULL
**Current:** `entry_number Int?` nullable
**Required:** For Game Day, entry numbers MUST be locked. Add NOT NULL constraint after migration

### 1.4 LOW PRIORITY

#### GAP-DB-014: No `special_awards_nominations` table
**Current:** Special awards in rankings.special_awards array
**Required:** Separate table for judge nominations during scoring

#### GAP-DB-015: No `chat_messages` table (local storage may suffice)
**Current:** No chat infrastructure
**Required:** Decide: local-only (IndexedDB) or server-backed?
**Decision from spec:** Local only, persists per competition

---

## 2. BACKEND API GAPS

### 2.1 CRITICAL - Missing Endpoints

#### GAP-API-001: Break Request System
**Missing Endpoints:**
- `liveCompetition.requestBreak` - Judge requests break
- `liveCompetition.respondToBreakRequest` - CD approves/denies
- `liveCompetition.getBreakRequests` - Get pending requests
**Test Simulation:** Judge taps "5 min" → API call? → FAIL (no endpoint)

#### GAP-API-002: Emergency Break System
**Missing Endpoints:**
- `liveCompetition.addEmergencyBreak` - CD inserts break
- `liveCompetition.endBreakEarly` - CD stops break
- `liveCompetition.getScheduleBreaks` - Get all breaks for day
**Test Simulation:** CD clicks "+ BREAK" → API? → FAIL (no endpoint)

#### GAP-API-003: Live State Control
**Missing Endpoints:**
- `liveCompetition.setCurrentRoutine` - Mark routine as performing
- `liveCompetition.advanceToNext` - Move to next routine
- `liveCompetition.goToPrevious` - Go back to previous
- `liveCompetition.pauseCompetition` - Pause all operations
- `liveCompetition.resumeCompetition` - Resume from pause
**Test Simulation:** CD clicks ">> NEXT" → API? → FAIL (no endpoint)

#### GAP-API-004: Score Editing (CD Only)
**Missing Endpoints:**
- `liveCompetition.editScore` - CD modifies submitted score
- `liveCompetition.getScoreHistory` - Get audit trail for score
**Test Simulation:** CD changes score from 82 to 85 → API? → FAIL (no endpoint)

#### GAP-API-005: Routine Management
**Missing Endpoints:**
- `liveCompetition.reorderRoutine` - Move routine in lineup
- `liveCompetition.scratchRoutine` - Mark as scratched with reason
- `liveCompetition.moveToDay` - Move routine to different day
**Test Simulation:** CD drags routine 115 to after 120 → API? → FAIL (no endpoint)

#### GAP-API-006: Score Visibility Toggle
**Missing Endpoint:**
- `liveCompetition.setScoreVisibility` - Toggle judges seeing each other's scores
**Test Simulation:** CD toggles "Show scores" → API? → FAIL (no endpoint)

#### GAP-API-007: Schedule Delay Tracking
**Missing Endpoints:**
- `liveCompetition.updateScheduleDelay` - Set delay minutes
- `liveCompetition.getScheduleDelay` - Get current delay
**Test Simulation:** Schedule shows "+5 min behind" → Where from? → FAIL (no endpoint)

#### GAP-API-008: MP3 Management
**Missing Endpoints:**
- `liveCompetition.getMP3List` - Get all MP3s for competition
- `liveCompetition.getMP3Url` - Get signed URL for specific MP3
- `liveCompetition.updateMP3Duration` - Save extracted duration
- `liveCompetition.reportCorruptedMP3` - Flag problematic file
**Test Simulation:** Backstage downloads MP3s → API? → Partial (music_file_url exists, no list endpoint)

### 2.2 HIGH PRIORITY - Fix Existing Endpoints

#### GAP-API-009: `submitScore` wrong range validation
**Current:** `liveCompetition.ts:189` - `z.number().min(0).max(10)`
**Required:** `z.number().min(60).max(100)`
**Impact:** All score submissions will fail validation

#### GAP-API-010: `getLineup` missing MP3 duration
**Current:** `liveCompetition.ts:77` - `duration: 180` hardcoded
**Required:** Return actual MP3 duration from file or `mp3_duration_ms` field
**Impact:** Countdown timer will be wrong

#### GAP-API-011: `updateRoutineStatus` is deprecated/non-functional
**Current:** `liveCompetition.ts:170-178` - Does nothing (live_status field removed)
**Required:** Either remove or implement with `live_competition_state` table

#### GAP-API-012: `getJudges` missing real-time status
**Current:** Returns static data
**Required:** Include connection status, current scoring state, break requests

#### GAP-API-013: No tenant_id on `break_requests` endpoints
**Planning ahead:** All new endpoints must filter by tenant_id

### 2.3 MEDIUM PRIORITY

#### GAP-API-014: WebSocket/Real-time events not implemented
**Current:** All endpoints are HTTP request/response
**Required:** WebSocket for:
- Score updates (judges → CD)
- Current routine changes (CD → all)
- Break requests (judge → CD)
- MP3 playback sync (backstage → all)

#### GAP-API-015: No bulk score submission
**Current:** One score at a time
**Required:** For offline sync, need to submit cached scores in batch

#### GAP-API-016: No competition day management
**Missing:** APIs for multi-day competition state

#### GAP-API-017: No score finalization endpoint
**Current:** Scores have `is_final` flag but no endpoint to set it

### 2.4 LOW PRIORITY

#### GAP-API-018: No special awards nomination endpoint
**Missing:** Judge nominates routine for Judge's Choice award

#### GAP-API-019: No real-time stats streaming
**Current:** `getStats` returns static snapshot
**Required:** Real-time progress updates for scoreboard

---

## 3. FRONTEND COMPONENT GAPS

### 3.1 CRITICAL - Missing Pages/Components

#### GAP-FE-001: Backstage UI (`/backstage`) missing
**Required Components:**
- `BackstageLayout.tsx` - Kiosk mode container
- `NowPlaying.tsx` - Current routine display
- `MP3Player.tsx` - Audio playback controls
- `PlaylistQueue.tsx` - Next 3 routines
- `DownloadManager.tsx` - MP3 download progress
- `BackstageSync.tsx` - Connection status

#### GAP-FE-002: CD Control Panel (`/dashboard/director-panel/live`) missing
**Required Components:**
- `LiveControlLayout.tsx` - Three-panel layout
- `RoutineList.tsx` - Draggable lineup
- `CurrentRoutinePanel.tsx` - Center stage view
- `JudgeStatusPanel.tsx` - Judge monitoring
- `ControlBar.tsx` - BACK/STOP/NEXT/BREAK buttons
- `BreakRequestsBar.tsx` - Pending requests
- `ScheduleDelayIndicator.tsx` - Running late/early
- `ReorderConfirmModal.tsx` - Confirmation dialog

#### GAP-FE-003: Judge Tablet UI (`/judge`) missing
**Required Components:**
- `JudgeLayout.tsx` - Tablet-optimized container
- `ScoreSlider.tsx` - 60-100 range slider
- `AwardLevelDisplay.tsx` - Shows award level for score
- `BreakRequestButtons.tsx` - 2/5/10 min buttons
- `OtherScoresDisplay.tsx` - See other judges (CD toggleable)
- `ScoreSubmitButton.tsx` - Final submission
- `JudgeSyncStatus.tsx` - Connection indicator

#### GAP-FE-004: Live Scoreboard (`/scoreboard/:competitionId`) missing
**Required Components:**
- `ScoreboardLayout.tsx` - Public display layout
- `CurrentScoreCard.tsx` - Currently performing
- `RecentScores.tsx` - Just completed
- `CategoryStandings.tsx` - Leaderboard
- `ScheduleProgress.tsx` - Progress indicator

#### GAP-FE-005: MP3 Player Component missing
**Required:**
- Web Audio API integration
- Duration extraction from file
- Playback position sync
- Volume control
- Waveform visualization (nice-to-have)

#### GAP-FE-006: Offline Cache Manager missing
**Required:**
- Service Worker registration
- IndexedDB schema for offline data
- Cache invalidation logic
- Sync queue management

### 3.2 HIGH PRIORITY

#### GAP-FE-007: ScoreSlider doesn't support 60-100 range
**Current:** Award slider exists but for different purpose
**Required:** New slider component with:
- Min: 60, Max: 100
- Increment: 0.1 or 0.5
- Award level labels

#### GAP-FE-008: No kiosk mode implementation
**Required:**
- Fullscreen API integration
- Navigation prevention
- Exit code/gesture

#### GAP-FE-009: No offline indicator component
**Required:** Show online/offline status across all Game Day views

#### GAP-FE-010: No countdown timer component
**Required:** Timer that syncs with MP3 playback position

#### GAP-FE-011: No judge authentication flow
**Current:** Judges exist in DB but no login UI
**Required:** PIN/password login for `/judge` route

#### GAP-FE-012: No drag-drop for routine reordering in CD panel
**Note:** Different from schedule page - this is live reordering

#### GAP-FE-013: No break request notification UI (CD side)
**Required:** Toast/banner for incoming requests

#### GAP-FE-014: No score edit modal (CD side)
**Required:** Modal to change submitted score with reason

### 3.3 MEDIUM PRIORITY

#### GAP-FE-015: No special awards nomination UI
#### GAP-FE-016: No corrupted MP3 warning UI
#### GAP-FE-017: No day transition UI
#### GAP-FE-018: No historical score view (per routine)
#### GAP-FE-019: No real-time connection indicator

### 3.4 LOW PRIORITY

#### GAP-FE-020: No chat interface
#### GAP-FE-021: No RTMP overlay view
#### GAP-FE-022: No print-friendly score sheets

---

## 4. REAL-TIME SYNC GAPS

### 4.1 CRITICAL

#### GAP-RT-001: No WebSocket infrastructure
**Current:** HTTP-only
**Required:**
- WebSocket server (Next.js API route or separate service)
- Client connection management
- Reconnection logic
- Room/channel per competition

#### GAP-RT-002: No LAN-mode sync
**Current:** All traffic goes through internet
**Required:**
- Local network discovery
- Peer-to-peer fallback
- Master device designation

#### GAP-RT-003: No time sync protocol
**Current:** Each device uses own clock
**Required:**
- NTP-style sync to competition master
- 250ms latency target
- Drift compensation

### 4.2 HIGH PRIORITY

#### GAP-RT-004: No event types defined
**Required events:**
- `routine:started` - Routine begins
- `routine:completed` - Routine ends
- `score:submitted` - Judge submits
- `score:updated` - CD edits score
- `break:requested` - Judge requests break
- `break:responded` - CD responds
- `playback:position` - MP3 position sync
- `state:changed` - Live state update

#### GAP-RT-005: No conflict resolution
**Required:** Handle simultaneous edits from multiple CDs

#### GAP-RT-006: No message ordering guarantees
**Required:** Sequence numbers for event ordering

#### GAP-RT-007: No presence system
**Required:** Track who's connected (judges, backstage, scoreboard)

---

## 5. OFFLINE/PWA GAPS

### 5.1 CRITICAL

#### GAP-PWA-001: No Service Worker
**Current:** Standard web app
**Required:**
- Service Worker registration
- Cache-first strategy for assets
- Network-first for API (with fallback)
- Background sync for queued mutations

#### GAP-PWA-002: No IndexedDB schema
**Required databases:**
- `mp3_cache` - Downloaded MP3 files
- `score_cache` - Offline score submissions
- `state_cache` - Competition state snapshot
- `lineup_cache` - Routine lineup
- `chat_cache` - Local chat messages

#### GAP-PWA-003: No offline queue management
**Required:**
- Queue mutations when offline
- Retry on reconnection
- Conflict resolution
- Sync status UI

#### GAP-PWA-004: No manifest.json for PWA
**Required:** App manifest for install prompt

### 5.2 HIGH PRIORITY

#### GAP-PWA-005: No cache invalidation strategy
**Required:** Versioned cache, cleanup on update

#### GAP-PWA-006: No offline-first data layer
**Required:** Check IndexedDB before network

#### GAP-PWA-007: No sync indicator
**Required:** Show pending sync count

### 5.3 MEDIUM PRIORITY

#### GAP-PWA-008: No storage quota management
**Required:** Handle storage limits for MP3s

#### GAP-PWA-009: No background sync registration
**Required:** Use Background Sync API

---

## 6. MP3/AUDIO GAPS

### 6.1 CRITICAL

#### GAP-MP3-001: No Web Audio API integration
**Required:**
- AudioContext creation
- MP3 decoding
- Playback control
- Position tracking

#### GAP-MP3-002: No duration extraction
**Required:**
- Extract duration from MP3 file header
- Store in IndexedDB
- Update UI countdown

#### GAP-MP3-003: No MP3 download manager
**Required:**
- Batch download with progress
- Resume interrupted downloads
- Verify file integrity

### 6.2 HIGH PRIORITY

#### GAP-MP3-004: No MP3 pre-scan for corruption
**Required:**
- Validate MP3 headers on download
- Flag corrupt files
- Alert backstage tech

#### GAP-MP3-005: No MP3 naming convention enforced
**Spec says:** `[EntryNumber]_[RoutineTitle]_[StudioCode].mp3`
**Required:** Rename on download or validate on upload

### 6.3 MEDIUM PRIORITY

#### GAP-MP3-006: No fallback for missing MP3
**Required:** Placeholder/silence when MP3 missing

#### GAP-MP3-007: No volume normalization
**Nice-to-have:** Normalize volume across tracks

### 6.4 LOW PRIORITY

#### GAP-MP3-008: No waveform visualization
**Nice-to-have:** Visual progress indicator

---

## 7. SECURITY/AUTH GAPS

### 7.1 CRITICAL

#### GAP-SEC-001: No judge authentication
**Current:** Judges in DB but no login
**Required:**
- Judge login endpoint
- Session management
- Route protection for `/judge`

#### GAP-SEC-002: No role-based access for live endpoints
**Current:** `publicProcedure` used
**Required:**
- CD-only endpoints (score edit, break response)
- Judge-only endpoints (score submit, break request)
- Public endpoints (scoreboard)

### 7.2 HIGH PRIORITY

#### GAP-SEC-003: No rate limiting on score submission
**Required:** Prevent spam/abuse

#### GAP-SEC-004: No audit logging for security events
**Required:** Log all score edits, break responses

#### GAP-SEC-005: No token expiration for judge sessions
**Required:** Auto-logout after inactivity

### 7.3 MEDIUM PRIORITY

#### GAP-SEC-006: No IP restriction option for kiosk mode
**Nice-to-have:** Restrict backstage to specific IP

---

## 8. EDGE CASE GAPS

### 8.1 CRITICAL

#### GAP-EDGE-001: No handling for judge disconnect mid-score
**Scenario:** Judge enters 82, loses connection before submit
**Required:**
- Auto-save draft scores
- Resume on reconnection
- Alert CD if judge offline during routine

#### GAP-EDGE-002: No handling for backstage disconnect
**Scenario:** Backstage device loses connection during playback
**Required:**
- MP3 continues playing locally
- Sync position on reconnection
- Alert CD of backstage status

### 8.2 HIGH PRIORITY

#### GAP-EDGE-003: No handling for duplicate score submission
**Scenario:** Judge submits, doesn't see confirmation, submits again
**Required:** Idempotency key or duplicate detection

#### GAP-EDGE-004: No handling for competition across midnight
**Scenario:** Day 1 runs past midnight into Day 2
**Required:** Session/day boundary logic

#### GAP-EDGE-005: No handling for CD disconnect
**Scenario:** CD loses connection
**Required:**
- Competition continues
- Backstage can advance manually
- CD resumes on reconnection

#### GAP-EDGE-006: No handling for power failure
**Scenario:** Venue loses power, devices restart
**Required:**
- State persists in IndexedDB
- Resume from last known state
- MP3 playback position preserved

### 8.3 MEDIUM PRIORITY

#### GAP-EDGE-007: No handling for score tie
**Required:** Tiebreaker rules in competition settings

#### GAP-EDGE-008: No handling for all judges scratch a routine
**Required:** Skip without scores? Mark as "no contest"?

#### GAP-EDGE-009: No handling for late routine addition
**Scenario:** Studio adds routine day-of
**Required:** Assign entry number, slot into schedule

### 8.4 LOW PRIORITY

#### GAP-EDGE-010: No handling for judge replacement mid-competition
**Scenario:** Judge gets sick, replacement comes in
**Required:** Transfer session, handle partial scores

#### GAP-EDGE-011: No handling for venue wifi failure
**Scenario:** Internet goes down but LAN works
**Required:** LAN-only mode

---

## 9. TEST SIMULATION RESULTS

### 9.1 CD User Journey Simulation

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | CD opens `/dashboard/director-panel/live` | See 3-panel layout | **FAIL** (page doesn't exist) |
| 2 | CD clicks "Start Competition" | Status changes to active | **PARTIAL** (endpoint exists, no UI) |
| 3 | CD sees lineup with entry numbers | Routines displayed in order | **PARTIAL** (getLineup exists, no UI) |
| 4 | CD clicks first routine to start | Routine marked as current | **FAIL** (no setCurrentRoutine) |
| 5 | CD sees judges scoring in real-time | Scores appear as submitted | **FAIL** (no WebSocket) |
| 6 | CD clicks ">> NEXT" | Advances to next routine | **FAIL** (no advanceToNext) |
| 7 | CD receives break request | Notification appears | **FAIL** (no break system) |
| 8 | CD approves break | Break starts, timer shows | **FAIL** (no break system) |
| 9 | CD edits a score | Score updated, audit logged | **FAIL** (no editScore) |
| 10 | CD reorders routine | Confirmation, order changes | **FAIL** (no reorderRoutine) |
| 11 | CD adds emergency break | Break inserted in schedule | **FAIL** (no addEmergencyBreak) |
| 12 | CD sees schedule delay | "+5 min" indicator | **FAIL** (no delay tracking) |
| 13 | CD ends competition | Status changes to completed | **PARTIAL** (endpoint exists, no UI) |

**CD Journey: 2/13 (15%) functional**

### 9.2 Judge User Journey Simulation

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Judge opens `/judge` | Login screen appears | **FAIL** (page doesn't exist) |
| 2 | Judge logs in with PIN | Authenticated, sees scoring | **FAIL** (no judge auth) |
| 3 | Judge sees current routine | Title, studio, time remaining | **FAIL** (no judge UI) |
| 4 | Judge moves score slider | Value updates 60-100 | **FAIL** (no slider, wrong range) |
| 5 | Judge sees award level | "HIGH GOLD (80-84)" | **FAIL** (no UI) |
| 6 | Judge adds comment | Text field works | **FAIL** (no UI) |
| 7 | Judge submits score | Score saved, confirmation | **FAIL** (range validation wrong) |
| 8 | Judge sees other scores | If CD enabled | **FAIL** (no visibility toggle) |
| 9 | Judge requests 5 min break | Request sent to CD | **FAIL** (no break system) |
| 10 | Judge goes offline | Local cache works | **FAIL** (no offline support) |
| 11 | Judge reconnects | Cached scores sync | **FAIL** (no sync) |

**Judge Journey: 0/11 (0%) functional**

### 9.3 Backstage Tech User Journey Simulation

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Tech opens `/backstage` | Kiosk mode, playlist shows | **FAIL** (page doesn't exist) |
| 2 | Tech clicks "Download All" | MP3s download with progress | **FAIL** (no download manager) |
| 3 | Tech sees current routine | Entry #, title, studio | **FAIL** (no UI) |
| 4 | Tech clicks PLAY | MP3 plays through speakers | **FAIL** (no player) |
| 5 | Tech sees countdown | Time remaining from MP3 | **FAIL** (no timer) |
| 6 | MP3 ends | Auto-advance or manual next | **FAIL** (no playback end handler) |
| 7 | Tech sees next 3 routines | Queue displayed | **FAIL** (no UI) |
| 8 | Connection lost | MP3 continues, local state | **FAIL** (no offline) |
| 9 | Day-of song upload | Quick add to queue | **FAIL** (no upload UI) |

**Backstage Journey: 0/9 (0%) functional**

### 9.4 Scoreboard User Journey Simulation

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open `/scoreboard/:id` | Public display loads | **FAIL** (page doesn't exist) |
| 2 | See current performance | Title, studio, category | **FAIL** (no UI) |
| 3 | Score submitted | Updates in real-time | **FAIL** (no WebSocket) |
| 4 | See standings | Sorted by score | **PARTIAL** (getStandings exists) |
| 5 | See schedule status | Ahead/behind indicator | **FAIL** (no delay tracking) |
| 6 | Filter by category | Category dropdown | **FAIL** (no UI) |

**Scoreboard Journey: 1/6 (17%) functional**

---

## 10. EXTERNAL SERVICE GAPS

### 10.1 Supabase

| Requirement | Status | Gap |
|-------------|--------|-----|
| MP3 bucket exists | **UNKNOWN** | Verify bucket created |
| MP3 bucket ~6000 capacity | **UNKNOWN** | Check storage quota |
| Signed URL generation | **PARTIAL** | music_file_url exists, need signed URLs |
| RLS policies for new tables | **NEEDED** | 4 new tables need policies |

### 10.2 WebSocket Service

| Requirement | Status | Gap |
|-------------|--------|-----|
| WebSocket server | **MISSING** | Need to implement |
| Room management | **MISSING** | Per-competition rooms |
| Reconnection handling | **MISSING** | Client-side logic |

### 10.3 PWA/Service Worker

| Requirement | Status | Gap |
|-------------|--------|-----|
| Service Worker | **MISSING** | Need to implement |
| Web App Manifest | **MISSING** | Need manifest.json |
| IndexedDB setup | **MISSING** | Need schema |

---

## 11. IMPLEMENTATION PRIORITY MATRIX

### P0 - Must Have for MVP (Launch Blocker)
1. Database migration (4 new tables + columns)
2. Score range fix (60-100)
3. Backstage UI + MP3 Player
4. Judge UI + authentication
5. CD Control Panel basic
6. Basic WebSocket sync
7. Offline score caching

### P1 - Required for Production
1. Break request system
2. Emergency break system
3. Score editing (CD)
4. Routine reordering
5. Live scoreboard
6. Full offline support
7. MP3 download manager

### P2 - Important but Not Blocking
1. Schedule delay tracking
2. Multi-day support
3. Chat system
4. Special awards
5. Advanced sync features

### P3 - Nice to Have
1. RTMP overlay
2. Waveform visualization
3. Print score sheets
4. Advanced analytics

---

## 12. DEPENDENCY GRAPH

```
[DB Migration]
    ↓
[Score Range Fix] → [Judge UI] → [Score Submission Flow]
    ↓                    ↓
[Live State Table] → [CD Panel] → [Routine Control]
    ↓                    ↓
[Break Tables] → [Break System UI] → [Break Flow Complete]
    ↓
[Audit Log] → [Score Editing] → [Audit Trail Complete]

[MP3 Player] → [Backstage UI] → [Kiosk Mode]
    ↓
[Duration Extraction] → [Countdown Timer]

[WebSocket Server] → [Real-time Sync] → [All UIs Connected]
    ↓
[Offline Cache] → [Service Worker] → [PWA Complete]
```

---

## 13. RISK ASSESSMENT

### High Risk Items
1. **WebSocket at scale** - Many devices, many events, need load testing
2. **Offline/Online sync** - Conflict resolution is complex
3. **MP3 playback sync** - 250ms target is aggressive
4. **Multi-day state** - State management across days

### Mitigation Strategies
1. Load test WebSocket with simulated 50 devices
2. Design sync protocol with explicit conflict rules
3. Use audio timestamps, not wall clock
4. Explicit day transition ceremony in UI

---

## 14. ESTIMATED EFFORT

| Category | Tasks | Story Points | Dev Days |
|----------|-------|--------------|----------|
| DB Schema | 4 migrations | 8 | 2 |
| Backend API | 15 endpoints | 30 | 7 |
| Frontend | 4 major pages | 60 | 15 |
| Real-time | WebSocket + sync | 20 | 5 |
| Offline/PWA | Full offline | 25 | 6 |
| Testing | E2E + manual | 15 | 4 |
| **TOTAL** | | **158** | **39 days** |

---

## 15. NEXT STEPS

1. **Immediate:** Fix score range validation (GAP-API-009) - 30 min
2. **This Week:** Database migration for 4 new tables - 2 days
3. **Next:** Implement break system APIs - 2 days
4. **Then:** Start Backstage UI + MP3 player - 5 days
5. **Parallel:** WebSocket infrastructure - 3 days

---

*This audit identifies 67 gaps that must be addressed before Game Day can launch. The critical path runs through database schema → backend APIs → WebSocket → frontend UIs. Estimated total effort: ~39 dev days.*
