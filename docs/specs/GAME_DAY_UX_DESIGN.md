# Game Day UX Design - Comprehensive Plan

**Created:** December 12, 2025
**Purpose:** Unified design for all Game Day interfaces
**Status:** Design Document for Implementation

---

## Design Philosophy

### Core Principles
1. **Clarity over cleverness** - Every element serves a purpose
2. **Touch-first** - Designed for tablets/touchscreens
3. **Glanceable** - Critical info visible in <1 second
4. **Real-time** - Everything updates live
5. **Resilient** - Works offline, syncs when connected

### Color Palette (Dark Mode)
```
Background Hierarchy:
├── bg-gray-900      #111827  (page background)
├── bg-gray-800      #1f2937  (cards, panels)
├── bg-gray-700      #374151  (elevated, inputs)
└── bg-gray-800/50   rgba     (glass effect)

Status Colors:
├── Green   #22c55e  (success, connected, complete)
├── Blue    #3b82f6  (active, info, primary)
├── Amber   #f59e0b  (warning, pending, attention)
├── Red     #ef4444  (error, alert, destructive)
├── Purple  #8b5cf6  (special, Title Division)
└── Indigo  #6366f1  (brand, CTAs)

Award Levels:
├── Dynamic Diamond  #00D4FF  (95+)
├── Titanium         #C0C0C0  (92-94.99)
├── Platinum         #E5E4E2  (88-91.99)
├── High Gold        #FFD700  (85-87.99)
├── Gold             #DAA520  (80-84.99)
├── Silver           #C0C0C0  (75-79.99)
└── Bronze           #CD7F32  (70-74.99)
```

---

## Page 1: TABULATOR (Competition Director Command Center)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                    56px │
│ [Competition Name] [Day] [Time +0:00]  [Judges: ●●○] [Print] [⚙️]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                          │  │                                 │  │
│  │   SCHEDULE PANEL         │  │   CURRENT ROUTINE               │  │
│  │   (Left 40%)             │  │   (Right 60%)                   │  │
│  │                          │  │                                 │  │
│  │   Scrollable list        │  │   Entry info + scores           │  │
│  │   with drag handles      │  │                                 │  │
│  │                          │  │                                 │  │
│  │   Each row:              │  │   ┌───────────────────────────┐ │  │
│  │   [≡] #101 Routine Name  │  │   │ #127 "Dreams Take Flight" │ │  │
│  │       Studio | 2:45      │  │   │ Starlight Dance Academy   │ │  │
│  │       [⋮ context menu]   │  │   │ Teen Jazz | Large Group   │ │  │
│  │                          │  │   │                           │ │  │
│  │   Visual states:         │  │   │ ┌───────────────────────┐ │ │  │
│  │   - Current: blue glow   │  │   │ │  TIME: 1:47 / 2:45    │ │ │  │
│  │   - Complete: green ✓    │  │   │ │  [======|----]        │ │ │  │
│  │   - Scratched: strike    │  │   │ └───────────────────────┘ │ │  │
│  │   - Break: orange        │  │   │                           │ │  │
│  │                          │  │   │ SCORES:                   │ │  │
│  └──────────────────────────┘  │   │ A: 92.50 ✓  [Edit]        │ │  │
│                                │   │ B: 91.75 ✓  [Edit]        │ │  │
│  ┌──────────────────────────┐  │   │ C: --.-  (waiting)        │ │  │
│  │ BREAK REQUESTS           │  │   │ ─────────────────────     │ │  │
│  │ [Judge A: 5min] [✓] [✗]  │  │   │ AVG: 92.13 HIGH GOLD      │ │  │
│  └──────────────────────────┘  │   └───────────────────────────┘ │  │
│                                │                                 │  │
│                                │   [← PREV] [START/NEXT →]       │  │
│                                │                                 │  │
│                                │   [+ BREAK] [SCRATCH] [MOVE]    │  │
│                                └─────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ALERT BAR (only when edge case)                               40px │
│ ⚠️ Entry #127 is 0.08 from Platinum boundary - verify scores       │
└─────────────────────────────────────────────────────────────────────┘
```

### Feature Integration Map

| Feature | Location | Component |
|---------|----------|-----------|
| 1.1 Routine Reordering | Schedule panel | Drag handles [≡] |
| 1.2 Move to Day | Context menu | "Move to..." submenu |
| 1.3 Break Requests | Below schedule | Collapsible panel |
| 1.7 Scratch/Withdraw | Context menu | "Scratch routine" option |
| 1.8 Edge Case Alerts | Bottom bar | Sticky alert banner |
| 1.9 Print Labels | Header | Print icon button |
| 1.10 Judge Connection | Header | 3 dots (●●○) status |
| 1.11 Schedule Delay | Header | "+0:00" time offset |
| 1.12 Context Menu | Each routine row | [⋮] button |

### Context Menu Design
```
┌─────────────────────────┐
│ ▶ Move to...           │
│   ├─ Friday            │
│   ├─ Saturday          │
│   └─ Sunday            │
├─────────────────────────┤
│   Start Now            │
│   Edit Entry           │
├─────────────────────────┤
│ ⚠️ Scratch Routine      │
└─────────────────────────┘
```

---

## Page 2: JUDGE (Tablet Scoring Interface)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                        48px │
│ [Judge A] [●Connected]                    [Competition Name]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │                                                               │ │
│   │                    NOW SCORING                                │ │
│   │                                                               │ │
│   │                      #127                                     │ │
│   │              "Dreams Take Flight"                             │ │
│   │            Starlight Dance Academy                            │ │
│   │                                                               │ │
│   │    [Teen Jazz]  [Large Group]  [12 dancers]                   │ │
│   │                                                               │ │
│   │   ┌─────────────────────────────────────────────────────────┐ │ │
│   │   │              TIME REMAINING                             │ │ │
│   │   │   [================|--------]   1:47                    │ │ │
│   │   └─────────────────────────────────────────────────────────┘ │ │
│   │                                                               │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │                     SCORE INPUT                               │ │
│   │                                                               │ │
│   │                      [92.50]                                  │ │
│   │                                                               │ │
│   │   0 ─────────────────●───────────────────────────────── 100   │ │
│   │                                                               │ │
│   │   ┌─────────────────────────────────────────────────────────┐ │ │
│   │   │            ★ HIGH GOLD ★                                │ │ │
│   │   └─────────────────────────────────────────────────────────┘ │ │
│   │                                                               │ │
│   │   [Comments: optional notes...]                               │ │
│   │                                                               │ │
│   │              [    SUBMIT SCORE    ]                           │ │
│   │                                                               │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ TITLE DIVISION BREAKDOWN (if applicable)        [Amber panel] │ │
│   │                                                               │ │
│   │ Technique:    [18] ═══════════════●═══  / 20                  │ │
│   │ Performance:  [17] ═══════════════●════ / 20                  │ │
│   │ Choreography: [19] ═══════════════════●= / 20                 │ │
│   │ Musicality:   [16] ════════════●═══════ / 20                  │ │
│   │ Showmanship:  [18] ═══════════════●═══  / 20                  │ │
│   │                                        ──────                 │ │
│   │                               TOTAL:    88 / 100              │ │
│   │                                                               │ │
│   │              [  SUBMIT BREAKDOWN  ]                           │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ OTHER JUDGES (if enabled)                                     │ │
│   │                                                               │ │
│   │   A: 92.50    B: 91.75    C: --      AVG: 92.13               │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ REQUEST BREAK                                    [2m] [5m] [10m]│ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Feature Integration Map

| Feature | Location | Component |
|---------|----------|-----------|
| 2.1 Title Breakdown | Below main score | Amber panel (conditional) |
| 2.2 Other Scores | Below Title | Collapsible row |
| 2.3 Time Remaining | In routine card | Progress bar + countdown |
| 2.4 tRPC Integration | All mutations | Already wired |
| 2.5 Authentication | URL params | judgeId validation |

### Score Submitted State
```
┌───────────────────────────────────────────────────────────────┐
│                     SCORE SUBMITTED ✓                         │
│                                                               │
│                       [92.50]                                 │
│                     HIGH GOLD                                 │
│                                                               │
│            🔒 Locked - Contact CD to edit                     │
│                                                               │
│             Waiting for next routine...                       │
└───────────────────────────────────────────────────────────────┘
```

---

## Page 3: BACKSTAGE (Monitor Display)

### Layout Structure (Optimized for TV/Large Display)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Competition Name]                              [●LIVE] [🔒 LOCK]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                                                                     │
│                         NOW PERFORMING                              │
│                                                                     │
│                            #127                                     │
│                                                                     │
│              ╔═══════════════════════════════════════╗              │
│              ║                                       ║              │
│              ║      "Dreams Take Flight"             ║              │
│              ║                                       ║              │
│              ║      Starlight Dance Academy          ║              │
│              ║                                       ║              │
│              ║      Teen Jazz | Large Group          ║              │
│              ║                                       ║              │
│              ╚═══════════════════════════════════════╝              │
│                                                                     │
│              ┌─────────────────────────────────────────┐            │
│              │  [══════════════════|───────────]       │            │
│              │                                         │            │
│              │              1:47                       │            │
│              │           remaining                     │            │
│              └─────────────────────────────────────────┘            │
│                                                                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │   MUSIC CONTROLS      [⏮] [▶/⏸] [⏭]    [🔊━━━━━●━━]        │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                           UP NEXT                                   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ #128  "Rhythm Nation"          |  Elite Dance Company  | 3:12  │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ #129  "Swan Lake Variation"    |  Classical Ballet     | 2:45  │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ #130  "Hip Hop Explosion"      |  Urban Dance Crew     | 2:30  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Feature Integration Map

| Feature | Location | Component |
|---------|----------|-----------|
| 3.1 Music Playback | Center | Audio controls bar |
| 3.2 Sync Status | Header | [●LIVE] indicator |
| 3.3 Kiosk Mode | Header | [🔒 LOCK] button |
| 3.4 Upcoming List | Bottom | Scrollable list (3-5 items) |

### Kiosk Mode (Fullscreen, No UI Controls)
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                                                                     │
│                         NOW PERFORMING                              │
│                                                                     │
│                            #127                                     │
│                                                                     │
│                   "Dreams Take Flight"                              │
│                                                                     │
│                  Starlight Dance Academy                            │
│                                                                     │
│                   Teen Jazz | Large Group                           │
│                                                                     │
│                                                                     │
│                           1:47                                      │
│                                                                     │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│                          UP NEXT                                    │
│            #128 "Rhythm Nation" - Elite Dance Company               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Press ESC x3 to exit kiosk mode
```

---

## Implementation Priority Order

### Phase 1: Core Functionality (This Session)
1. ✅ 1.4 Emergency Break Insertion
2. ✅ 1.5 Score Edit Capability
3. ✅ 1.6 Score Visibility Toggle
4. ✅ 2.1 Title Division Breakdown

### Phase 2: Enhanced Tabulator (Next)
5. 1.3 Break Request Management Panel
6. 1.10 Judge Connection Status
7. 1.8 Edge Case Alert System
8. 1.11 Schedule Delay Display

### Phase 3: Judge Enhancements
9. 2.3 Time Remaining Display
10. 2.2 Other Judges' Scores Display
11. 2.5 Judge Authentication

### Phase 4: Routine Management
12. 1.12 Routine Context Menu
13. 1.7 Scratch/Withdraw Routine
14. 1.1 Routine Reordering System
15. 1.2 Move Routine to Different Day

### Phase 5: Backstage & Polish
16. 3.4 Expanded Upcoming List
17. 3.2 Sync Status Indicator
18. 3.1 Music Playback Controls
19. 3.3 Kiosk Mode Lock

### Phase 6: Infrastructure (Deferred)
20. 1.9 Print Labels
21. 6.1 WebSocket/Real-time Sync
22. 6.2 Offline-First Architecture
23. 6.3 Local Chat System

---

## Component Specifications

### Shared Components Needed

```typescript
// New components to create:

// 1. TimeRemainingBar - Used in Judge + Backstage
interface TimeRemainingBarProps {
  durationMs: number;
  startedAt: string;
  showLabel?: boolean;  // "1:47 remaining"
  size?: 'sm' | 'md' | 'lg';
  pulseWhenLow?: boolean;  // Flash red under 30s
}

// 2. JudgeConnectionDots - Used in Tabulator header
interface JudgeConnectionDotsProps {
  judges: { id: string; connected: boolean; name: string }[];
}

// 3. BreakRequestPanel - Used in Tabulator
interface BreakRequestPanelProps {
  requests: BreakRequest[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

// 4. EdgeCaseAlert - Used in Tabulator footer
interface EdgeCaseAlertProps {
  entry: { id: string; entryNumber: number; title: string };
  averageScore: number;
  boundaryLevel: string;
  distanceFromBoundary: number;
}

// 5. RoutineContextMenu - Used in Tabulator schedule
interface RoutineContextMenuProps {
  routine: ScheduleEntry;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: 'scratch' | 'move' | 'start' | 'edit') => void;
  availableDays: string[];
}

// 6. OtherScoresDisplay - Used in Judge
interface OtherScoresDisplayProps {
  scores: { judgeId: string; judgeName: string; score: number | null }[];
  average: number | null;
  visible: boolean;  // Controlled by Tabulator toggle
}

// 7. MusicControls - Used in Backstage
interface MusicControlsProps {
  audioUrl: string | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (position: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

// 8. UpcomingList - Used in Backstage
interface UpcomingListProps {
  routines: UpcomingRoutine[];
  count?: number;  // How many to show (default 3)
  compact?: boolean;
}
```

---

## State Management

### Live Competition State (tRPC query)
```typescript
interface LiveCompetitionState {
  // Current state
  competitionId: string;
  competitionDay: string;
  isActive: boolean;

  // Current entry
  currentEntryId: string | null;
  currentEntryState: 'pending' | 'performing' | 'scoring' | 'complete';
  currentEntryStartedAt: string | null;

  // Schedule
  todayRoutines: ScheduleEntry[];
  delayMinutes: number;  // How far behind schedule

  // Judges
  judges: JudgeInfo[];
  judgesCanSeeScores: boolean;

  // Breaks
  pendingBreakRequests: BreakRequest[];

  // Edge cases
  edgeCaseAlerts: EdgeCaseAlert[];
}
```

---

## Responsive Breakpoints

```css
/* Tablet Portrait (primary target) */
@media (min-width: 768px) {
  /* 2-column layout for Tabulator */
  /* Full scoring interface for Judge */
}

/* Tablet Landscape / Desktop */
@media (min-width: 1024px) {
  /* Wider panels */
  /* More info visible */
}

/* Large Display / TV (Backstage) */
@media (min-width: 1920px) {
  /* Huge fonts */
  /* Maximum visibility */
}
```

---

## Animation Guidelines

```css
/* Subtle transitions for state changes */
.score-update { transition: all 0.3s ease-out; }
.alert-enter { animation: slideUp 0.3s ease-out; }
.alert-pulse { animation: pulse 2s infinite; }

/* Time-critical animations */
.low-time { animation: pulse 0.5s infinite; color: #ef4444; }

/* Drag feedback */
.dragging { opacity: 0.8; transform: scale(1.02); box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
```

---

## Accessibility Notes

- All interactive elements: min 44x44px touch target
- Color is never the only indicator (icons + text)
- High contrast ratios (4.5:1 minimum)
- Focus states visible
- Screen reader labels for icons

---

## Next Steps

1. Read this document at start of implementation
2. Implement Phase 2 features (Break Requests, Judge Status, Edge Cases)
3. Update GAME_DAY_MISSING_FEATURES.md after each feature
4. Test on actual tablets before production
