# Game Day Audio Control System PRD

**Version:** 1.0
**Date:** December 14, 2025
**Status:** Draft

---

## 1. Executive Summary

The Game Day Audio Control System enables synchronized control of competition tabulation and MP3 audio playback across multiple stations. The system supports a tabulator (front of house) and backstage audio station with real-time synchronization, independent or linked control modes, and accurate duration tracking from actual MP3 files.

---

## 2. Problem Statement

Current tabulator has basic controls but lacks:
- Separate tabulation vs audio playback controls
- Ability to link/unlink tabulation advancement with audio playback
- Backstage audio station for sound system operators
- Central control over who can operate audio playback
- Accurate duration tracking from actual MP3 file metadata

---

## 3. User Roles & Personas

### 3.1 Tabulator Operator (Front of House)
- **Location:** Front of house / adjudication table
- **Responsibilities:**
  - Advance through competition schedule
  - Monitor routine timing
  - Optionally control audio playback
  - Enable/disable backstage control
- **Access:** `/tabulator`

### 3.2 Backstage Audio Operator
- **Location:** Backstage, connected to venue audio system
- **Responsibilities:**
  - Play/pause/stop music for routines
  - Monitor upcoming routines
  - Respond to tabulator commands
- **Access:** `/backstage`

### 3.3 Competition Director
- **Location:** Anywhere
- **Responsibilities:**
  - Configure competition settings
  - Monitor competition progress
- **Access:** All pages

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE (Supabase)                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ live_competition_state                                           │    │
│  │ - current_entry_id                                               │    │
│  │ - competition_state: 'idle' | 'active' | 'paused'               │    │
│  │ - audio_state: 'stopped' | 'playing' | 'paused'                 │    │
│  │ - audio_position_ms: number (current playback position)         │    │
│  │ - audio_started_at: timestamp (when play was pressed)           │    │
│  │ - linked_mode: boolean (tabulation linked to audio)             │    │
│  │ - backstage_control_enabled: boolean                            │    │
│  │ - operating_date: date                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ entries                                                          │    │
│  │ - music_file_url: string (Supabase storage URL)                 │    │
│  │ - music_duration_ms: number (extracted from MP3 metadata)       │    │
│  │ - music_title: string                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    Real-time subscriptions (5s polling)
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│    TABULATOR      │   │    BACKSTAGE      │   │    SCOREBOARD     │
│  /tabulator       │   │    /backstage     │   │    /scoreboard    │
│                   │   │                   │   │                   │
│ [TAB CONTROLS]    │   │ [AUDIO CONTROLS]  │   │ (View only)       │
│ ⏮ ⏹ ⏸ ▶ ⏭      │   │ ⏮ ⏹ ⏸ ▶ ⏭      │   │                   │
│                   │   │                   │   │ Shows current     │
│ [AUDIO CONTROLS]  │   │ Current routine   │   │ routine + timer   │
│ ⏮ ⏹ ⏸ ▶ ⏭      │   │ Next up           │   │                   │
│                   │   │ On deck           │   │                   │
│ [🔗 Link Toggle]  │   │                   │   │                   │
│ [📡 Backstage]    │   │ Controlled by:    │   │                   │
│                   │   │ Tabulator/Local   │   │                   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## 5. Feature Requirements

### 5.1 Tabulation Controls (Existing, Enhanced)

| Control | Action | Behavior |
|---------|--------|----------|
| **BACK** | Go to previous routine | Moves schedule position back |
| **NEXT** | Go to next routine | Moves schedule position forward |
| **START** | Start current routine | Sets competition_state to 'active', starts timer |
| **STOP** | Stop current routine | Sets competition_state to 'idle', resets timer |
| **PAUSE** | Pause current routine | Sets competition_state to 'paused', freezes timer |

**Auto-Next Toggle:**
- When enabled: Automatically advances to next routine when timer reaches 0
- When disabled: Manual advancement only

### 5.2 Audio Playback Controls (New)

| Control | Action | Behavior |
|---------|--------|----------|
| **PLAY** | Start audio playback | Sets audio_state to 'playing', records audio_started_at |
| **PAUSE** | Pause audio playback | Sets audio_state to 'paused', saves audio_position_ms |
| **STOP** | Stop audio playback | Sets audio_state to 'stopped', resets audio_position_ms to 0 |
| **SEEK** | Jump to position | Updates audio_position_ms |

**Audio Source:**
- Loads MP3 from `entries.music_file_url`
- Duration from `entries.music_duration_ms` (extracted on upload)
- Falls back to HTML5 Audio duration detection if not stored

### 5.3 Link Mode Toggle

**Purpose:** Synchronize tabulation advancement with audio playback

| Mode | Behavior |
|------|----------|
| **Linked (ON)** | START tabulation = PLAY audio, STOP tabulation = STOP audio, NEXT tabulation = STOP current + load next audio |
| **Unlinked (OFF)** | Tabulation and audio operate independently |

**Default:** Linked (ON)

### 5.4 Backstage Control Toggle

**Purpose:** Enable/disable backstage station's ability to control audio

| State | Backstage Can... |
|-------|------------------|
| **Enabled** | Play, pause, stop audio |
| **Disabled** | View only (controls grayed out) |

**Default:** Enabled

**Visual Indicator on Backstage:**
- Green badge: "Controls Active"
- Red badge: "Controls Disabled by Tabulator"

### 5.5 Duration Tracking

**Priority Order for Duration:**
1. `entries.music_duration_ms` (pre-extracted from MP3 metadata)
2. HTML5 Audio `duration` event (runtime detection)
3. Fallback: 180000ms (3 minutes)

**Timer Display:**
- Shows remaining time: `duration - current_position`
- Updates in real-time during playback
- Color coding:
  - Green: >30 seconds remaining
  - Yellow: 10-30 seconds remaining
  - Red: <10 seconds remaining (flashing)

### 5.6 Backstage Page (`/backstage`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ BACKSTAGE AUDIO                              [Status Badge] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NOW PERFORMING                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ #42 - "Dance Like Nobody's Watching"                │   │
│  │ Studio: Elite Dance Academy                         │   │
│  │ Category: Teen Contemporary                         │   │
│  │                                                     │   │
│  │ ▶ ══════════════════════●══════ 2:34 / 3:15       │   │
│  │                                                     │   │
│  │        [⏮] [⏹] [⏸] [▶] [⏭]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  NEXT UP                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ #43 - "Firework"                                    │   │
│  │ Studio: Rhythm Nation                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ON DECK                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ #44 - "Rise Up"                                     │   │
│  │ Studio: Dance Unlimited                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Large, easy-to-read display for backstage environment
- Audio waveform visualization (optional, phase 2)
- Volume control (client-side only)
- Pre-load next routine's audio in background

---

## 6. Database Schema Changes

### 6.1 Modify `live_competition_state` Table

```sql
ALTER TABLE live_competition_state ADD COLUMN IF NOT EXISTS audio_state text DEFAULT 'stopped';
ALTER TABLE live_competition_state ADD COLUMN IF NOT EXISTS audio_position_ms integer DEFAULT 0;
ALTER TABLE live_competition_state ADD COLUMN IF NOT EXISTS audio_started_at timestamptz;
ALTER TABLE live_competition_state ADD COLUMN IF NOT EXISTS linked_mode boolean DEFAULT true;
ALTER TABLE live_competition_state ADD COLUMN IF NOT EXISTS backstage_control_enabled boolean DEFAULT true;

-- Add constraint for audio_state
ALTER TABLE live_competition_state ADD CONSTRAINT audio_state_check
  CHECK (audio_state IN ('stopped', 'playing', 'paused'));
```

### 6.2 Modify `entries` Table

```sql
ALTER TABLE entries ADD COLUMN IF NOT EXISTS music_duration_ms integer;
```

---

## 7. API Endpoints (tRPC)

### 7.1 New Procedures in `liveCompetition` Router

```typescript
// Set audio playback state
setAudioState: protectedProcedure
  .input(z.object({
    competitionId: z.string(),
    audioState: z.enum(['stopped', 'playing', 'paused']),
    positionMs: z.number().optional(),
  }))
  .mutation(...)

// Update audio position (for seek)
updateAudioPosition: protectedProcedure
  .input(z.object({
    competitionId: z.string(),
    positionMs: z.number(),
  }))
  .mutation(...)

// Toggle linked mode
setLinkedMode: protectedProcedure
  .input(z.object({
    competitionId: z.string(),
    linked: z.boolean(),
  }))
  .mutation(...)

// Toggle backstage control
setBackstageControl: protectedProcedure
  .input(z.object({
    competitionId: z.string(),
    enabled: z.boolean(),
  }))
  .mutation(...)

// Get live state (enhanced)
getLiveState: protectedProcedure
  .input(z.object({ competitionId: z.string() }))
  .query(...)
  // Returns: { ...existing, audioState, audioPositionMs, audioStartedAt, linkedMode, backstageControlEnabled }
```

---

## 8. Implementation Phases

### Phase 1: Database & API (Est. 2 hours)
1. Run database migration for new columns
2. Update `liveCompetition` router with new procedures
3. Update `getLiveState` to return audio fields
4. Add music duration extraction on upload

### Phase 2: Tabulator Enhancement (Est. 3 hours)
1. Add audio controls section to tabulator UI
2. Implement HTML5 Audio integration
3. Add Link Mode toggle
4. Add Backstage Control toggle
5. Update timer to use actual MP3 duration

### Phase 3: Backstage Page (Est. 3 hours)
1. Create `/backstage` page
2. Implement audio player with controls
3. Add real-time sync with tabulator
4. Add control enable/disable handling
5. Add preloading of next routine audio

### Phase 4: Testing & Polish (Est. 2 hours)
1. Test linked/unlinked modes
2. Test backstage control enable/disable
3. Test duration accuracy
4. Test real-time sync across multiple browsers
5. Add loading states and error handling

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Audio sync latency | <500ms between tabulator and backstage |
| Duration accuracy | Within 1 second of actual MP3 duration |
| Control response time | <200ms from click to state change |
| Page load time | <2 seconds for backstage page |

---

## 10. Edge Cases & Error Handling

### 10.1 Missing MP3 File
- Display "No music file uploaded" message
- Disable audio controls
- Allow tabulation to proceed normally

### 10.2 Network Disconnection
- Show "Disconnected" warning banner
- Queue control actions for retry
- Auto-reconnect with exponential backoff

### 10.3 Concurrent Control Conflicts
- Last-write-wins for state changes
- Show toast notification when state changed by another user
- "State changed by Tabulator" / "State changed by Backstage"

### 10.4 Browser Audio Restrictions
- Handle autoplay restrictions gracefully
- Show "Click to enable audio" prompt if needed
- Pre-load audio on user interaction

---

## 11. Security Considerations

- Only authenticated users with CD role can access controls
- Backstage page requires authentication
- Audio file URLs use signed Supabase storage URLs
- Rate limiting on state update mutations

---

## 12. Future Enhancements (Phase 2+)

1. **Audio Waveform Display** - Visual waveform for easier navigation
2. **Multiple Audio Tracks** - Support for walk-on/walk-off music
3. **Cue Points** - Preset seek points within tracks
4. **Volume Control Sync** - Central volume control from tabulator
5. **Audio Recording** - Record live audio for review
6. **Backup Audio Source** - Fallback to cloud if local fails

---

## Appendix A: Existing Database Context

### `live_competition_state` Current Schema
```sql
CREATE TABLE live_competition_state (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  competition_id uuid NOT NULL,
  current_entry_id uuid,
  competition_state text DEFAULT 'idle',
  started_at timestamptz,
  operating_date date,
  created_at timestamptz,
  updated_at timestamptz
);
```

### `entries` Current Schema (relevant fields)
```sql
-- Existing fields
music_file_url text,
music_title text,
routine_duration_seconds integer, -- This is routine time, NOT music duration
```

---

## Appendix B: UI Mockups

### Tabulator Control Bar (Enhanced)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TABULATION                          │  AUDIO                                │
│ [⏮ BACK] [⏹ STOP] [▶ START] [⏭ NEXT] │  [⏹] [⏸] [▶] 2:34/3:15 ═══●═══     │
│                                     │                                       │
│ [🔗 Linked: ON ]                    │  [📡 Backstage: ENABLED ]            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*End of PRD*
