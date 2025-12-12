# Game Day Missing Features - Exhaustive Analysis

**Generated:** December 12, 2025
**Spec Reference:** `docs/specs/GAME_DAY_SPEC.md` (602 lines)
**Status:** Implementation Gap Analysis

---

## CRITICAL: DESIGN PRINCIPLES (MUST FOLLOW)

**All implementations MUST match the existing app's design system exactly.**

### Color System

#### Primary Backgrounds
```css
/* Dark mode pages (Game Day) */
bg-gray-900                    /* Main page background */
bg-gray-800                    /* Panels, cards */
bg-gray-800/50                 /* Semi-transparent panels */
bg-gray-700                    /* Elevated elements, inputs */

/* Gradients (use for primary CTAs and highlights) */
bg-gradient-to-r from-dance-pink to-dance-purple     /* Primary buttons */
bg-gradient-to-br from-indigo-900/40 to-purple-900/40 /* Feature cards */
bg-gradient-to-br from-gray-900 to-gray-800          /* Modal backgrounds */
```

#### Status Colors
```css
/* Success */
bg-green-500/20 text-green-400     /* Status badges */
bg-green-600 hover:bg-green-500    /* Action buttons */

/* Warning/Pending */
bg-yellow-500/20 text-yellow-400   /* Status badges */
bg-orange-600/20 text-orange-400   /* Break-related */

/* Error/Destructive */
bg-red-500/20 text-red-400         /* Status badges */
bg-red-600 hover:bg-red-500        /* Destructive buttons */

/* Neutral */
bg-gray-500/20 text-gray-400       /* Inactive/disabled */
bg-blue-500/20 text-blue-400       /* Info/active */
```

### Component Patterns

#### Buttons (Use `src/components/ui/Button.tsx`)
```tsx
// Primary CTA - gradient with shadow
<Button variant="primary" size="md">
  Save Changes
</Button>

// Secondary - outline style
<Button variant="secondary" size="md">
  Cancel
</Button>

// Destructive - red
<Button variant="destructive" size="md">
  Delete
</Button>

// Ghost - minimal
<Button variant="ghost" size="icon">
  <RefreshCw className="w-5 h-5" />
</Button>
```

#### Modals (Use `src/components/ui/Modal.tsx`)
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="Optional description text"
  size="md"  // sm | md | lg | xl | 2xl | 4xl | full
  variant="default"  // default | warning | danger
  footer={
    <>
      <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
      <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
    </>
  }
>
  <div className="space-y-4">
    {/* Modal content */}
  </div>
</Modal>
```

#### Toast Notifications
```tsx
import { toast } from 'react-hot-toast';

// Success
toast.success('Score submitted successfully');

// Error
toast.error(`Failed to submit: ${error.message}`);

// Loading (for async operations)
toast.loading('Submitting score...');
```

### Typography

```css
/* Headings */
text-2xl font-bold text-white      /* Modal titles, section headers */
text-xl font-bold text-white       /* Card titles */
text-lg font-semibold text-white   /* Panel headers */

/* Body text */
text-base text-white               /* Primary content */
text-sm text-gray-300              /* Secondary content */
text-xs text-gray-400              /* Captions, labels */
text-xs text-gray-500              /* Muted text */

/* Mono (for numbers, codes) */
font-mono text-xl                  /* Scores */
font-mono tabular-nums             /* Timers */
```

### Spacing & Layout

```css
/* Page padding */
p-4 md:p-8                         /* Responsive padding */

/* Card/Panel padding */
p-6                                /* Standard card */
p-4                                /* Compact card */
p-3                                /* Tight (list items) */

/* Gap between elements */
gap-4                              /* Standard */
gap-2                              /* Tight */
gap-6                              /* Loose */

/* Border radius */
rounded-xl                         /* Cards, modals */
rounded-lg                         /* Buttons, inputs */
rounded-full                       /* Badges, avatars */
```

### Border Styles

```css
/* Card borders */
border border-gray-700             /* Standard card border */
border border-white/20             /* Modal border */
border-b border-gray-700           /* Dividers */

/* Status borders */
border-l-4 border-l-blue-500       /* Current item indicator */
border-l-4 border-l-yellow-500     /* Next item indicator */

/* Input borders */
border border-gray-600             /* Default input */
focus:border-indigo-500            /* Focused input */
```

### Interactive States

```css
/* Hover */
hover:bg-gray-700/30               /* List item hover */
hover:bg-gray-600                  /* Button hover */
hover:-translate-y-0.5             /* Lift effect */

/* Active/Selected */
bg-blue-600/30                     /* Selected item */
ring-2 ring-primary-500            /* Focus ring */

/* Disabled */
disabled:opacity-50 disabled:cursor-not-allowed
```

### Icons (Lucide React)

```tsx
import {
  Play, Square, ChevronLeft, ChevronRight,  // Navigation
  Coffee, Clock,                              // Breaks
  AlertCircle, CheckCircle, XCircle,          // Status
  RefreshCw, Loader2,                         // Loading
  Users, Award, Star,                         // Game Day
  Send, Lock, Unlock,                         // Actions
} from 'lucide-react';

// Standard sizes
<Icon className="w-4 h-4" />   /* Small (inline) */
<Icon className="w-5 h-5" />   /* Medium (buttons) */
<Icon className="w-6 h-6" />   /* Large (headers) */
```

### Form Elements

```tsx
// Text input
<input
  type="text"
  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
  placeholder="Enter value..."
/>

// Select
<select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option value="">Select...</option>
</select>

// Slider
<input
  type="range"
  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
/>
```

### Status Badges

```tsx
// Connected/Active
<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
  <CheckCircle className="w-3 h-3" />
  Connected
</span>

// Pending
<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
  <Loader2 className="w-3 h-3 animate-spin" />
  Pending
</span>

// Error
<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
  <AlertCircle className="w-3 h-3" />
  Error
</span>
```

### Animation

```tsx
// Spin for loading
<Loader2 className="w-5 h-5 animate-spin" />

// Pulse for attention
<div className="animate-pulse">...</div>

// Framer Motion (if needed for complex animations)
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

### Responsive Design

```css
/* Mobile-first breakpoints */
sm:    /* 640px+ */
md:    /* 768px+ */
lg:    /* 1024px+ */
xl:    /* 1280px+ */

/* Common patterns */
flex flex-col md:flex-row        /* Stack on mobile, row on desktop */
text-2xl md:text-4xl             /* Smaller on mobile */
p-4 md:p-8                       /* Less padding on mobile */
hidden md:block                  /* Hide on mobile */
```

### Reference Files

When implementing, reference these existing files:
- `src/components/ui/Button.tsx` - Button variants
- `src/components/ui/Modal.tsx` - Modal component
- `src/components/ui/dialog.tsx` - Light dialog variant
- `src/app/tabulator/page.tsx` - Dark Game Day styling
- `src/app/judge/page.tsx` - Tablet-optimized styling
- `src/app/backstage/page.tsx` - TV display styling

### DO NOT

- Use inline hardcoded colors (use Tailwind classes)
- Create new color variables without checking existing ones
- Use different modal components (use Modal.tsx)
- Skip toast notifications for user actions
- Forget disabled states on interactive elements
- Use different icon libraries (use Lucide)
- Create inline styles when Tailwind classes exist

---

## Executive Summary

| Component | Total Features | Implemented | Missing | Alignment |
|-----------|---------------|-------------|---------|-----------|
| Tabulator (`/tabulator`) | 22 | 10 | 12 | 45% |
| Judge Tablet (`/judge`) | 18 | 16 | 2 | 89% |
| Backstage (`/backstage`) | 15 | 14 | 1 | 93% |
| Scoreboard (`/scoreboard`) | 8 | 8 | 0 | 100% |
| Backend API | 45 | 45 | 0 | 100% |
| **TOTAL** | **108** | **93** | **15** | **86%** |

---

## 1. TABULATOR MISSING FEATURES

**File:** `src/app/tabulator/page.tsx` (611 lines)
**Spec Section:** Lines 61-100, 292-319

### 1.1 Routine Reordering System (HIGH PRIORITY)

**Spec Reference:** Line 70
> "Reorder routines with confirmation dialog (ONLY Tabulator can move routines)"

**What's Missing:**
- [ ] Drag-and-drop reordering UI in schedule panel
- [ ] Confirmation dialog: "Move Entry #[X] from position [A] to [B]? Times will be recalculated."
- [ ] Visual feedback during drag operation
- [ ] Time recalculation display after reorder

**Backend API Available:** `reorderRoutine` (line 1813)
```typescript
// Input schema exists:
{
  competitionId: z.string(),
  routineId: z.string(),
  newPosition: z.number(),
}
```

**Implementation Estimate:** 80-120 lines of code

---

### 1.2 Move Routine to Different Day (HIGH PRIORITY)

**Spec Reference:** Line 71
> "Move routine to different day easily"

**What's Missing:**
- [ ] Day selector dropdown/modal in routine context menu
- [ ] Confirmation: "Move Entry #[X] to [Day]?"
- [ ] Update both source and destination day schedules
- [ ] Handle entry number preservation across days

**Backend API Available:** `moveRoutineToDay` (line 1954)
```typescript
// Input schema exists:
{
  competitionId: z.string(),
  routineId: z.string(),
  targetDay: z.string(), // ISO date string
  newPosition: z.number().optional(),
}
```

**Implementation Estimate:** 60-80 lines of code

---

### 1.3 Break Request Management Panel (HIGH PRIORITY)

**Spec Reference:** Lines 74-75
> "Approve/deny judge break requests"

**What's Missing:**
- [ ] Break requests panel showing pending requests
- [ ] Request details: Judge name, duration, timestamp
- [ ] [Approve] and [Deny] buttons for each request
- [ ] Visual indicator for pending break count
- [ ] Toast/notification when new request arrives

**Backend APIs Available:**
- `getBreakRequests` (line 745)
- `approveBreak` (line 795)
- `denyBreak` (line 857)

**Current State:** Button exists (lines 577-582) but no management panel

**Implementation Estimate:** 100-150 lines of code

---

### 1.4 Emergency Break Insertion ✅ IMPLEMENTED

**Spec Reference:** Line 74
> "Add emergency breaks (updates schedule times for all routines)"

**Implementation Complete:**
- [x] "+ BREAK" button with click handler
- [x] Duration selector modal (5/10/15/custom minutes)
- [x] Insert position selection (before current, after current, specific slot)
- [x] Time cascade recalculation display
- [x] Break visualization in schedule panel

**Backend APIs Used:**
- `addEmergencyBreak` (line 1666)
- `recalculateScheduleTimes` (line 2951)

**Implementation:** `src/app/tabulator/page.tsx` (lines ~280-340)

---

### 1.5 Score Edit Capability ✅ IMPLEMENTED

**Spec Reference:** Line 76
> "Edit scores after judge submits (emergency only)"

**Implementation Complete:**
- [x] Edit button in scores panel (appears only after score submitted)
- [x] Edit modal with score input + reason field
- [x] Confirmation: "Edit Judge [X]'s score? This will be logged."
- [x] Audit log display of previous values

**Backend API Used:** `editScore` (line 2068)

**Implementation:** `src/app/tabulator/page.tsx` (lines ~490-550)

---

### 1.6 Score Visibility Toggle ✅ IMPLEMENTED

**Spec Reference:** Line 77
> "Toggle whether judges can see other judges' scores"

**Implementation Complete:**
- [x] Toggle switch in Tabulator header/controls
- [x] Visual indicator of current visibility state
- [x] Real-time broadcast to judge tablets

**Backend APIs Used:**
- `getScoreVisibility` (line 3094)
- `setScoreVisibility` (line 3122)

**Implementation:** `src/app/tabulator/page.tsx` (lines ~400-430)

---

### 1.7 Scratch/Withdraw Routine (MEDIUM PRIORITY)

**Spec Reference:** Line 78
> "Mark routine as scratched/withdrawn (optional reason)"

**What's Missing:**
- [ ] Right-click context menu or action button on routine
- [ ] Scratch modal with optional reason field
- [ ] Visual strike-through styling for scratched routines
- [ ] Scratched routines excluded from scoring/navigation

**Backend API Available:** `scratchRoutine` (line 1909)
```typescript
// Input schema exists:
{
  competitionId: z.string(),
  routineId: z.string(),
  reason: z.string().optional(),
}
```

**Implementation Estimate:** 50-70 lines of code

---

### 1.8 Edge Case Alert System (HIGH PRIORITY)

**Spec Reference:** Lines 79, 299-309
> "Edge case alerts when small score diff bumps down adjudication level"

**What's Missing:**
- [ ] Alert bar at bottom of Tabulator (placeholder exists line 607)
- [ ] Detection logic: when average is within `edgeCaseThreshold` (default 0.1) of level boundary
- [ ] Alert format: "Entry #108 bumped down due to 0.01 diff [REVIEW]"
- [ ] Click to highlight relevant scores
- [ ] Dismiss functionality

**Algorithm Required:**
```typescript
// Check if any judge's score causes a level bump
const averageWithoutJudge = (sum - judgeScore) / (count - 1);
const fullAverage = sum / count;
if (getLevel(averageWithoutJudge) !== getLevel(fullAverage)) {
  // Alert: this judge's score caused level change
}
```

**Implementation Estimate:** 100-150 lines of code

---

### 1.9 Print Labels (LOW PRIORITY)

**Spec Reference:** Lines 80, 312-319
> "Print labels with scores"

**What's Missing:**
- [ ] Print button in scores panel
- [ ] Label template layout:
  - Routine number and name
  - Judge A, B, C scores
  - Average score
  - Adjudication level
- [ ] Print dialog/preview
- [ ] Thermal printer format support (optional)

**Implementation Estimate:** 80-120 lines of code (with print CSS)

---

### 1.10 Judge Connection Status (MEDIUM PRIORITY)

**Spec Reference:** Line 73
> "See judges status (connected, scoring, break requested)"

**What's Missing:**
- [ ] Real-time WebSocket connection tracking
- [ ] Connection status icons (green/red dot)
- [ ] "Last seen" timestamp for each judge
- [ ] Break request indicator per judge

**Current State:** Static "Waiting/Scored" display exists (lines 498-522) but no real connection status

**Implementation Estimate:** 50-80 lines of code + WebSocket integration

---

### 1.11 Schedule Delay Display Enhancement (LOW PRIORITY)

**Spec Reference:** Lines 345-348
> "Show running delay (e.g., '+5 min behind')"

**What's Missing:**
- [ ] More prominent delay indicator (current is small text)
- [ ] Color coding (green = on time, yellow = slight delay, red = significant)
- [ ] Trend indicator (improving/worsening)

**Current State:** Basic implementation exists (lines 593-602)

**Implementation Estimate:** 20-30 lines of code

---

### 1.12 Routine Context Menu (LOW PRIORITY)

**Spec Reference:** Multiple sections

**What's Missing:**
- [ ] Right-click context menu on schedule items
- [ ] Options: Jump to, Reorder, Move to Day, Scratch, View Details
- [ ] Keyboard shortcuts (arrow keys to navigate, Enter to select)

**Implementation Estimate:** 60-80 lines of code

---

## 2. JUDGE TABLET MISSING FEATURES

**File:** `src/app/judge/page.tsx` (605 lines)
**Spec Section:** Lines 102-166

### 2.1 Title Division Breakdown ✅ IMPLEMENTED

**Spec Reference:** Lines 113, 149-166
> "Title Division breakdown (when applicable)"

**Implementation Complete:**
- [x] Detection of Title Division routines (via category name matching)
- [x] 5 breakdown score inputs:
  - Technique (20 points max)
  - Performance (20 points max)
  - Choreography (20 points max)
  - Musicality (20 points max)
  - Showmanship (20 points max)
- [x] Whole numbers OK for breakdown (via number inputs)
- [x] Auto-sum display (shows total / 100)
- [x] Layout with sliders + number inputs
- [x] Submit button with loading state
- [x] Locked state after submission

**Backend APIs Used:**
- `submitTitleBreakdown` (line 2220)
- `getTitleBreakdown` (line 2294)

**Implementation:** `src/app/judge/page.tsx` (lines ~703-896)

---

### 2.2 Other Judges' Scores Display ✅ IMPLEMENTED

**Spec Reference:** Line 110
> "See other judges' scores (Tabulator toggleable)"

**Implementation Complete:**
- [x] "Other Judges' Scores" collapsible section with toggle button
- [x] Judge A, B, C scores display in grid layout
- [x] Average calculation display with gradient styling
- [x] Respects `judgesCanSeeScores` flag from live state
- [x] "Hidden by CD" badge when visibility disabled
- [x] Highlights current judge's score with "(You)" indicator
- [x] Real-time updates via polling (2s interval)

**Implementation:** `src/app/judge/page.tsx` (lines 776-864)

---

### 2.3 Time Remaining Display ✅ IMPLEMENTED

**Spec Reference:** Line 127
> "Time Remaining: [====|----] 1:42"

**Implementation Complete:**
- [x] Progress bar with time countdown (100ms interval updates)
- [x] Sync with current routine's actual MP3 duration via `durationMs`
- [x] Real-time updates from live state (`currentEntryStartedAt`, `currentEntryState`)
- [x] Visual countdown timer with mm:ss format (tabular-nums for consistent width)
- [x] Progress bar shows elapsed time percentage
- [x] Low time warning (< 30 seconds) with red color and pulse animation
- [x] Only shows during 'performing' state

**Implementation:** `src/app/judge/page.tsx` (lines 701-731)

---

### 2.4 Real tRPC Integration ✅ IMPLEMENTED

**Spec Reference:** Entire Judge section

**Implementation Complete:**
- [x] `liveCompetition.getActiveCompetitions.useQuery` - auto-select competition (line 138)
- [x] `liveCompetition.getLiveState.useQuery` - current routine sync (line 151, 1s polling)
- [x] `liveCompetition.getRoutineScores.useQuery` - check existing scores (line 157, 2s polling)
- [x] `liveCompetition.submitScore.useMutation` - score submission (line 163)
- [x] `liveCompetition.requestBreak.useMutation` - break requests (line 176)
- [x] `liveCompetition.submitTitleBreakdown.useMutation` - Title Division (line 192)
- [x] `liveCompetition.getBreakRequests.useQuery` - break status updates (line 210, 3s polling)
- [x] Real-time updates via polling (no WebSocket needed)
- [x] Automatic routine change detection and score reset

**Implementation:** `src/app/judge/page.tsx` (lines 138-213)

---

### 2.5 Judge Authentication (MEDIUM PRIORITY)

**Spec Reference:** Lines 384-389
> "Judges have login accounts, Tracks what each judge scored"

**What's Missing:**
- [ ] Judge login flow (PIN or credentials)
- [ ] Session persistence
- [ ] Judge position assignment (A, B, C)
- [ ] Score attribution to authenticated judge

**Current State:** Hardcoded `judgePosition: 'A'` (line 93)

**Implementation Estimate:** 100-150 lines of code (new login page)

---

## 3. BACKSTAGE MISSING FEATURES

**File:** `src/app/backstage/page.tsx` (224 lines)
**Spec Section:** Lines 168-226

### 3.1 Music Playback Controls (MEDIUM PRIORITY)

**Spec Reference:** Lines 175, 195
> "Play MP3 files through connected sound system"

**What's Missing:**
- [ ] [PLAY] [PAUSE] [STOP] control buttons
- [ ] Volume control slider
- [ ] Seek bar for current track
- [ ] Auto-advance to next track option

**Spec Layout (lines 195):**
```
[▶ PLAY] [⏸ PAUSE] [⏹ STOP]
```

**Current State:** MP3DownloadPanel exists for download but no playback controls

**Implementation Estimate:** 80-120 lines of code + Web Audio API

---

### 3.2 Sync Status Indicator ✅ IMPLEMENTED

**Spec Reference:** Line 190
> "[Sync: ✓]"

**Implementation Complete:**
- [x] Connection status badge in header (green/yellow/red indicator)
- [x] Last sync timestamp ("Just now", "Xs ago")
- [x] Status tracking: 'connected' | 'syncing' | 'error'

**Files Modified:**
- `src/app/backstage/page.tsx` (lines 47-48, 111-125, 199-210)

---

### 3.3 Kiosk Mode Lock ✅ IMPLEMENTED

**Spec Reference:** Line 170, 479
> "Kiosk mode - no navigation"
> "Press ESC 3 times rapidly to exit"

**Implementation Complete:**
- [x] Remove "Test Page" navigation link (hidden in kiosk mode)
- [x] ESC key handler for exit (3 rapid presses within 1.5 seconds)
- [x] Full screen mode button with toggle
- [x] Audio panel also hidden in kiosk mode

**Files Modified:**
- `src/app/backstage/page.tsx` (lines 49-51, 100-148, 225-256)

---

### 3.4 Expanded Upcoming List ✅ IMPLEMENTED

**Spec Reference:** Lines 200-205
> "UP NEXT: #112, #113, --- BREAK ---, #114"

**Implementation Complete:**
- [x] Shows next 4 routines (via API `upcomingRoutines` array)
- [x] Distinct styling for first item ("NEXT" label, larger text)
- [x] Numbered list (2, 3, 4) for subsequent routines
- [x] Category/age group and duration for each

**Files Modified:**
- `src/app/api/backstage/route.ts` (lines 111-176)
- `src/app/backstage/page.tsx` (lines 246-276)

---

## 4. SCOREBOARD - COMPLETE

**File:** `src/app/scoreboard/[competitionId]/page.tsx` (250 lines)

All spec features implemented:
- [x] Real-time score updates (5-second polling)
- [x] Award level distribution with legend
- [x] Category placements with badges
- [x] Running schedule status (ahead/behind)
- [x] Category filter dropdown
- [x] Auto-refresh indicator

**No missing features.**

---

## 5. BACKEND API - COMPLETE

**File:** `src/server/routers/liveCompetition.ts` (~3150 lines)

All 45 procedures implemented:

### Competition Control (7)
- [x] `startCompetition` (line 571)
- [x] `stopCompetition` (line 615)
- [x] `endCompetition` (line 649)
- [x] `pauseCompetition` (line 1510)
- [x] `resumeCompetition` (line 1538)
- [x] `startLiveMode` (line 1565)
- [x] `endLiveMode` (line 1637)

### Routine Navigation (5)
- [x] `getLineup` (line 56)
- [x] `setCurrentRoutine` (line 1199)
- [x] `advanceRoutine` (line 1268)
- [x] `previousRoutine` (line 1372)
- [x] `updateRoutineStatus` (line 175)

### Scoring (6)
- [x] `submitScore` (line 218)
- [x] `getRoutineScores` (line 286)
- [x] `getStandings` (line 351)
- [x] `calculateScore` (line 412)
- [x] `editScore` (line 2068)
- [x] `getScoreHistory` (line 2155)

### Title Division (2)
- [x] `submitTitleBreakdown` (line 2220)
- [x] `getTitleBreakdown` (line 2294)

### Breaks (11)
- [x] `requestBreak` (line 693)
- [x] `getBreakRequests` (line 745)
- [x] `approveBreak` (line 795)
- [x] `denyBreak` (line 857)
- [x] `getScheduledBreaks` (line 906)
- [x] `startBreak` (line 956)
- [x] `endBreak` (line 985)
- [x] `addBreak` (line 1027)
- [x] `addEmergencyBreak` (line 1666)
- [x] `endBreakEarly` (line 1722)
- [x] `getActiveBreak` (line 1773)

### Schedule Management (6)
- [x] `reorderRoutine` (line 1813)
- [x] `scratchRoutine` (line 1909)
- [x] `moveRoutineToDay` (line 1954)
- [x] `getScheduleDelay` (line 2872)
- [x] `recalculateScheduleTimes` (line 2951)
- [x] `updateScheduleDelay` (line 3064)

### Score Visibility (2)
- [x] `getScoreVisibility` (line 3094)
- [x] `setScoreVisibility` (line 3122)

### State & Judges (6)
- [x] `getLiveState` (line 1067)
- [x] `initializeLiveState` (line 1155)
- [x] `updatePlaybackState` (line 1465)
- [x] `getStats` (line 510)
- [x] `getJudges` (line 128)
- [x] `getActiveCompetitions` (line 22)

**No missing APIs.**

---

## 6. CROSS-CUTTING CONCERNS

### 6.1 WebSocket/Real-time Sync (NOT IMPLEMENTED)

**Spec Reference:** Lines 21-24, 51-55
> "250ms acceptable latency for sync operations"

**What's Missing:**
- [ ] WebSocket server setup
- [ ] Real-time state broadcasts
- [ ] Client reconnection logic
- [ ] Optimistic updates

**Current State:** Using polling (1-5 second intervals)

**Impact:** Higher latency, more server load

---

### 6.2 Offline-First Architecture (PARTIAL)

**Spec Reference:** Lines 31-36
> "ALL views must work offline after initial data download"

**What's Missing:**
- [ ] Service Worker registration
- [ ] IndexedDB state caching (beyond MP3s)
- [ ] Offline score submission queue
- [ ] Sync conflict resolution

**Current State:** MP3 offline download works, but app requires connection

---

### 6.3 Local Chat System (NOT IMPLEMENTED)

**Spec Reference:** Lines 374-379
> "Local only (no server storage), Persists across days per competition"

**What's Missing:**
- [ ] Chat UI component
- [ ] LocalStorage persistence
- [ ] Per-competition chat history
- [ ] Message timestamps

**Implementation Estimate:** 150-200 lines of code

---

## 7. IMPLEMENTATION PRIORITY MATRIX

### P0 - Critical (Block Demo/Testing)

| Feature | Component | Effort | API Ready |
|---------|-----------|--------|-----------|
| ~~Real tRPC integration~~ | Judge | ~~Medium~~ | ✅ **IMPLEMENTED** |
| Break request panel | Tabulator | Medium | Yes |
| Edge case alerts | Tabulator | High | Partial |

### P1 - High (Core Experience)

| Feature | Component | Effort | API Ready |
|---------|-----------|--------|-----------|
| Routine reordering | Tabulator | High | Yes |
| Move to day | Tabulator | Medium | Yes |
| Title Division breakdown | Judge | High | Yes |
| Emergency break insertion | Tabulator | Medium | Yes |

### P2 - Medium (Enhanced Experience)

| Feature | Component | Effort | API Ready |
|---------|-----------|--------|-----------|
| ~~Other judges' scores~~ | Judge | ~~Low~~ | ✅ **IMPLEMENTED** |
| ~~Time remaining (Judge)~~ | Judge | ~~Low~~ | ✅ **IMPLEMENTED** |
| Score edit capability | Tabulator | Medium | Yes |
| Score visibility toggle | Tabulator | Low | Yes |
| Music playback controls | Backstage | High | N/A |
| Scratch routine | Tabulator | Medium | Yes |

### P3 - Low (Polish)

| Feature | Component | Effort | API Ready |
|---------|-----------|--------|-----------|
| Print labels | Tabulator | Medium | N/A |
| ~~Sync status indicator~~ | Backstage | ~~Low~~ | ✅ **IMPLEMENTED** |
| Kiosk mode lock | Backstage | Low | N/A |
| Judge authentication | Judge | High | Partial |
| Local chat | All | High | N/A |
| Context menu | Tabulator | Medium | Yes |

---

## 8. ESTIMATED TOTAL EFFORT

| Priority | Features | Est. Lines | Est. Hours |
|----------|----------|------------|------------|
| P0 | 3 | ~350 | 6-8 |
| P1 | 4 | ~400 | 8-12 |
| P2 | 7 | ~350 | 6-10 |
| P3 | 6 | ~500 | 10-15 |
| **TOTAL** | **20** | **~1600** | **30-45** |

---

## 9. QUICK REFERENCE: API → UI MAPPING

| Backend API | Used In UI | Status |
|-------------|-----------|--------|
| `getActiveCompetitions` | Tabulator | ✅ Used |
| `getLineup` | Tabulator | ✅ Used |
| `getLiveState` | Tabulator | ✅ Used |
| `getRoutineScores` | Tabulator | ✅ Used |
| `startCompetition` | Tabulator | ✅ Used |
| `stopCompetition` | Tabulator | ✅ Used |
| `advanceRoutine` | Tabulator | ✅ Used |
| `previousRoutine` | Tabulator | ✅ Used |
| `setCurrentRoutine` | Tabulator | ✅ Used |
| `reorderRoutine` | Tabulator | ❌ Not wired |
| `moveRoutineToDay` | Tabulator | ❌ Not wired |
| `scratchRoutine` | Tabulator | ❌ Not wired |
| `addEmergencyBreak` | Tabulator | ❌ Not wired |
| `getBreakRequests` | Tabulator | ❌ Not wired |
| `approveBreak` | Tabulator | ❌ Not wired |
| `denyBreak` | Tabulator | ❌ Not wired |
| `editScore` | Tabulator | ❌ Not wired |
| `getScoreVisibility` | Tabulator | ❌ Not wired |
| `setScoreVisibility` | Tabulator | ❌ Not wired |
| `submitScore` | Judge | ❌ Using mock |
| `requestBreak` | Judge | ❌ Using mock |
| `submitTitleBreakdown` | Judge | ❌ Not implemented |
| `getTitleBreakdown` | Judge | ❌ Not implemented |

---

## 10. FILES TO MODIFY

### Primary Changes
1. `src/app/tabulator/page.tsx` - Add 12 missing features
2. `src/app/judge/page.tsx` - Add 5 missing features + real API calls
3. `src/app/backstage/page.tsx` - Add 4 missing features

### New Files Needed
1. `src/components/game-day/ReorderConfirmationModal.tsx`
2. `src/components/game-day/BreakRequestPanel.tsx`
3. `src/components/game-day/EdgeCaseAlert.tsx`
4. `src/components/game-day/TitleDivisionBreakdown.tsx`
5. `src/components/game-day/PrintLabelTemplate.tsx`
6. `src/components/game-day/LocalChat.tsx` (optional)
7. `src/app/judge/login/page.tsx` (for auth)

---

*This document should be updated as features are implemented.*
