# Game Day Audio Control - Implementation Gap Analysis

**Date:** December 14, 2025
**PRD Version:** 1.0
**Analysis Based On:** GAMEDAY_AUDIO_CONTROL_PRD.md vs actual codebase

---

## Summary

| Category | Count |
|----------|-------|
| Fully Implemented | 6 |
| Partially Implemented | 6 |
| Not Implemented | 5 |
| Needs Verification | 5 |

**Estimated Completion:** ~70%

---

## 1. Fully Implemented

### 1.1 Database Schema (PRD Section 6)
- [x] `audio_state` column (stopped/playing/paused)
- [x] `audio_position_ms` column
- [x] `audio_started_at` column
- [x] `linked_mode` column (default: true)
- [x] `backstage_control_enabled` column (default: true)
- [x] `music_duration_ms` on entries table

### 1.2 tRPC API Procedures (PRD Section 7)
- [x] `setAudioState` - Set audio playback state
- [x] `updateAudioPosition` - Update position for seek
- [x] `setLinkedMode` - Toggle linked mode
- [x] `setBackstageControl` - Toggle backstage control
- [x] `getLiveState` returns all audio fields

### 1.3 Backstage Control Toggle (PRD 5.4)
- [x] Toggle button on tabulator UI
- [x] State persists to database
- [x] Backstage page shows "Controls Active" (green) when enabled
- [x] Backstage page shows "Disabled by Tabulator" (red) when disabled
- [x] Controls grayed out when disabled

### 1.4 Real-Time Sync (PRD Section 4)
- [x] 1-second polling on backstage page
- [x] State sync between tabulator and backstage
- [x] UI reflects changes within ~1 second

### 1.5 Browser Autoplay Handling (PRD 10.4)
- [x] "Enable Audio" button exists on tabulator
- [x] Audio element created on user interaction
- [x] Graceful handling of autoplay restrictions

### 1.6 Backstage Page Layout (PRD 5.6)
- [x] `/backstage` route exists
- [x] "Now Performing" section with current routine
- [x] "Next Up" section
- [x] "On Deck" section
- [x] Studio name, category, routine title displayed
- [x] Large, readable display format

---

## 2. Partially Implemented

### 2.1 Link Mode Behavior (PRD 5.3)
**Status:** UI toggle exists, behavior needs verification

| Expected Behavior | Implemented |
|-------------------|-------------|
| START tabulation = PLAY audio | Needs testing |
| STOP tabulation = STOP audio | Needs testing |
| NEXT tabulation = STOP + load next | Needs testing |

**Location:** `tabulator/page.tsx` lines 430-539

### 2.2 Timer Color Coding (PRD 5.5)
**Status:** Basic timer exists, color coding not implemented

| Condition | Expected Color | Implemented |
|-----------|----------------|-------------|
| >30 seconds remaining | Green | No |
| 10-30 seconds remaining | Yellow | No |
| <10 seconds remaining | Red (flashing) | No |

### 2.3 Audio Progress Bar & Seek (PRD 5.2)
**Status:** Seek handler exists, visual progress bar unclear

- [x] `handleAudioSeek` function implemented
- [ ] Visual progress bar with scrubber
- [ ] Current time / Total time display

### 2.4 Play/Pause/Stop Buttons (PRD 5.2)
**Status:** Handlers exist, visibility conditional on audio enabled

- [x] `handleAudioPlay`, `handleAudioPause`, `handleAudioStop` implemented
- [ ] Buttons always visible (currently hidden until "Enable Audio" clicked)
- [ ] Clear disabled state when no music file

### 2.5 Music Duration Extraction (PRD 5.5)
**Status:** Column exists, extraction on upload not verified

- [x] `music_duration_ms` column on entries table
- [ ] Automatic extraction from MP3 metadata on upload
- [x] Fallback to HTML5 Audio duration detection

### 2.6 Pre-load Next Routine Audio (PRD 5.6)
**Status:** Next routine data available, preloading not implemented

- [x] Next routine info displayed on backstage
- [ ] Audio file pre-loaded in background
- [ ] Instant transition on routine change

---

## 3. Not Implemented

### 3.1 Network Disconnection Handling (PRD 10.2)
- [ ] "Disconnected" warning banner
- [ ] Queue control actions for retry
- [ ] Auto-reconnect with exponential backoff

### 3.2 Concurrent Control Conflict Toasts (PRD 10.3)
- [ ] Toast notification when state changed by another user
- [ ] "State changed by Tabulator" message
- [ ] "State changed by Backstage" message

### 3.3 Rate Limiting (PRD Section 11)
- [ ] Rate limiting on state update mutations

### 3.4 "No Music File" Message (PRD 10.1)
- [ ] Display "No music file uploaded" when entry has no music
- [ ] Disable audio controls when no file
- [ ] Allow tabulation to proceed normally

### 3.5 Auto-Next Toggle (PRD 5.1)
- [ ] Auto-advance to next routine when timer reaches 0
- [ ] Toggle to enable/disable auto-next

---

## 4. Needs Verification

### 4.1 Audio File Loading
- [ ] Verify MP3 loads from `entries.music_file_url`
- [ ] Test signed Supabase storage URLs
- [ ] Verify playback works end-to-end

### 4.2 Audio Position Sync
- [ ] Verify `audio_position_ms` updates during playback
- [ ] Test seek functionality syncs between clients
- [ ] Verify pause preserves position

### 4.3 Linked Mode Auto-Actions
- [ ] Test START tabulation triggers PLAY audio
- [ ] Test STOP tabulation triggers STOP audio
- [ ] Test NEXT routine stops current and loads next

### 4.4 Volume Control
- [ ] Client-side volume control exists on backstage
- [ ] Volume persists locally

### 4.5 Success Metrics (PRD Section 9)
- [ ] Audio sync latency <500ms
- [ ] Duration accuracy within 1 second
- [ ] Control response time <200ms
- [ ] Page load time <2 seconds

---

## 5. Priority Recommendations

### P0 - Critical (Required for basic functionality)
1. Verify audio file loading and playback works
2. Test Link Mode behavior end-to-end
3. Implement "No music file" messaging

### P1 - High (Significant UX impact)
1. Timer color coding (visual feedback for timing)
2. Concurrent control conflict toasts (prevent confusion)
3. Audio progress bar with scrubber

### P2 - Medium (Polish)
1. Network disconnection handling
2. Pre-load next routine audio
3. Auto-reconnect with backoff

### P3 - Low (Future enhancement)
1. Rate limiting
2. Auto-next toggle
3. Volume sync between clients

---

## 6. Files Reference

| Component | File | Key Lines |
|-----------|------|-----------|
| Tabulator UI | `src/app/tabulator/page.tsx` | 79-85 (interface), 291-322 (mutations), 430-539 (handlers) |
| Backstage UI | `src/app/backstage/page.tsx` | 49-57 (interface), 84-90 (polling), 100+ (controls) |
| tRPC Router | `src/server/routers/liveCompetition.ts` | 3237-3368 (audio procedures) |
| PRD Spec | `docs/specs/GAMEDAY_AUDIO_CONTROL_PRD.md` | Full spec |

---

## 7. Testing Checklist

### Basic Functionality
- [ ] Navigate to /tabulator - see audio controls section
- [ ] Click "Enable Audio" - audio element created
- [ ] Click Play - audio plays (if music file exists)
- [ ] Click Pause - audio pauses
- [ ] Click Stop - audio stops, position resets
- [ ] Toggle "Linked" - state persists
- [ ] Toggle "Backstage" - state persists

### Backstage Sync
- [ ] Open /backstage in second browser
- [ ] Verify current routine shows
- [ ] Toggle "Backstage: OFF" on tabulator
- [ ] Verify backstage shows "Disabled by Tabulator"
- [ ] Verify controls grayed out on backstage
- [ ] Toggle "Backstage: ON" on tabulator
- [ ] Verify backstage shows "Controls Active"

### Audio Playback
- [ ] Find entry with music_file_url populated
- [ ] Navigate tabulator to that entry
- [ ] Click Play - verify audio actually plays
- [ ] Move playback position - verify sync to backstage
- [ ] Stop on tabulator - verify backstage stops

---

*Last Updated: December 14, 2025*
