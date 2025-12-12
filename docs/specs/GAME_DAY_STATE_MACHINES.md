# Game Day State Machines

**Status:** COMPLETE - Ready for Implementation
**Last Updated:** December 11, 2025

---

## 1. Competition State Machine

### States

| State | Description |
|-------|-------------|
| `pending` | Competition created, not yet started |
| `active` | Competition in progress, routines being performed |
| `paused` | Temporarily halted (emergency, break, technical issue) |
| `completed` | Competition finished, all routines done |

### Transitions

```
                              ┌──────────────────────────────────┐
                              │                                  │
                              ▼                                  │
┌─────────┐   start()    ┌────────┐    pause()    ┌────────┐    │
│ pending │ ───────────► │ active │ ────────────► │ paused │────┘
└─────────┘              └────────┘               └────────┘  resume()
                              │                       │
                              │ end()                 │ end()
                              ▼                       ▼
                         ┌───────────┐ ◄──────────────┘
                         │ completed │
                         └───────────┘
```

### Transition Rules

| From | To | Action | Conditions | Side Effects |
|------|-----|--------|------------|--------------|
| `pending` | `active` | `start()` | Has at least 1 routine | Set `live_mode_started_at`, notify all devices |
| `active` | `paused` | `pause()` | Is currently active | Record pause time, stop countdown timers |
| `paused` | `active` | `resume()` | Was previously active | Calculate delay, restart timers |
| `active` | `completed` | `end()` | CD explicitly ends | Calculate final standings |
| `paused` | `completed` | `end()` | CD explicitly ends | Calculate final standings |

### Invalid Transitions (Blocked)

- `completed` → any (competition cannot restart)
- `pending` → `paused` (must start first)
- `pending` → `completed` (must have activity)

---

## 2. Routine State Machine

### States

| State | Description |
|-------|-------------|
| `queued` | Waiting in lineup, not yet performed |
| `current` | Currently being performed |
| `scoring` | Performance ended, judges scoring |
| `completed` | All scores submitted, routine done |
| `skipped` | Skipped during competition (can be undone) |
| `scratched` | Withdrawn from competition (permanent) |

### Transitions

```
┌────────┐   setCurrent()   ┌─────────┐  endPerformance()  ┌─────────┐
│ queued │ ───────────────► │ current │ ─────────────────► │ scoring │
└────────┘                  └─────────┘                    └─────────┘
    │                            │                              │
    │ scratch()                  │ skip()                       │ allScoresIn()
    ▼                            ▼                              ▼
┌───────────┐              ┌─────────┐                   ┌───────────┐
│ scratched │              │ skipped │ ◄─── unskip() ─── │           │
└───────────┘              └─────────┘                   │ completed │
                                │                        └───────────┘
                                │ scratch()
                                ▼
                          ┌───────────┐
                          │ scratched │
                          └───────────┘
```

### Transition Rules

| From | To | Action | Conditions | Side Effects |
|------|-----|--------|------------|--------------|
| `queued` | `current` | `setCurrent()` | Competition active | Notify all devices, start timer |
| `queued` | `scratched` | `scratch()` | CD decision | Log reason, remove from lineup |
| `current` | `scoring` | `endPerformance()` | MP3 ends or manual | Stop playback, enable scoring |
| `current` | `skipped` | `skip()` | CD decision | Log skip, move to next |
| `scoring` | `completed` | `allScoresIn()` | All judges submitted | Calculate average, assign award |
| `skipped` | `queued` | `unskip()` | CD decision | Return to lineup position |
| `skipped` | `scratched` | `scratch()` | CD decision | Permanent removal |

### Invalid Transitions (Blocked)

- `scratched` → any (permanent removal)
- `completed` → `current` (can't re-perform)
- `queued` → `scoring` (must perform first)
- `queued` → `completed` (must score)

---

## 3. Score State Machine

### States

| State | Description |
|-------|-------------|
| `empty` | No score entered yet |
| `draft` | Score entered but not submitted |
| `submitted` | Judge has submitted (locked for judge) |
| `edited` | CD has modified the submitted score |
| `final` | Score finalized, no more changes |

### Transitions

```
┌───────┐   enterScore()   ┌───────┐    submit()    ┌───────────┐
│ empty │ ────────────────► │ draft │ ─────────────► │ submitted │
└───────┘                   └───────┘               └───────────┘
    ▲                           │                        │
    │ clear()                   │ clear()                │ cdEdit()
    └───────────────────────────┘                        ▼
                                                    ┌────────┐
                                                    │ edited │
                                                    └────────┘
                                                         │
                              ┌───────────┐              │ cdEdit()
                              │           │ ◄────────────┘
                              │   final   │
                              └───────────┘
                                    ▲
                                    │ finalize()
                                    │
                              (from submitted or edited)
```

### Transition Rules

| From | To | Action | Conditions | Side Effects |
|------|-----|--------|------------|--------------|
| `empty` | `draft` | `enterScore()` | Judge moves slider | Store locally, update UI |
| `draft` | `empty` | `clear()` | Judge clears | Remove local value |
| `draft` | `submitted` | `submit()` | Judge submits | Save to DB, notify CD |
| `submitted` | `edited` | `cdEdit()` | CD has edit rights | Log to audit, update DB |
| `edited` | `edited` | `cdEdit()` | CD edits again | Log to audit, update DB |
| `submitted` | `final` | `finalize()` | All scores in | Lock permanently |
| `edited` | `final` | `finalize()` | All scores in | Lock permanently |

### Invalid Transitions (Blocked)

- `submitted` → `draft` (judge can't un-submit)
- `final` → any (permanently locked)
- `empty` → `submitted` (must enter score first)

### Business Rules

1. **Judge can only edit in `draft` state** - Once submitted, locked
2. **CD can edit `submitted` or `edited`** - Must provide reason
3. **All edits logged to `score_audit_log`**
4. **Scores become `final` when routine is `completed`**

---

## 4. Break Request State Machine

### States

| State | Description |
|-------|-------------|
| `pending` | Request submitted, awaiting CD response |
| `approved` | CD approved, break scheduled |
| `denied` | CD denied the request |
| `active` | Break currently in progress |
| `completed` | Break has ended |
| `cancelled` | Request withdrawn before response |

### Transitions

```
┌─────────┐   approve()   ┌──────────┐   startBreak()   ┌────────┐
│ pending │ ────────────► │ approved │ ───────────────► │ active │
└─────────┘               └──────────┘                  └────────┘
    │                                                        │
    │ deny()                                                 │ endBreak()
    ▼                                                        ▼
┌────────┐                                             ┌───────────┐
│ denied │                                             │ completed │
└────────┘                                             └───────────┘

    │ cancel() (before response)
    ▼
┌───────────┐
│ cancelled │
└───────────┘
```

### Transition Rules

| From | To | Action | Conditions | Side Effects |
|------|-----|--------|------------|--------------|
| `pending` | `approved` | `approve()` | CD approves | Schedule break, notify judge |
| `pending` | `denied` | `deny()` | CD denies | Notify judge with reason |
| `pending` | `cancelled` | `cancel()` | Judge cancels | Remove request |
| `approved` | `active` | `startBreak()` | Break time reached | Start countdown, pause competition |
| `active` | `completed` | `endBreak()` | Time elapsed or CD ends early | Resume competition, recalc delay |

### Business Rules

1. **Only one pending request per judge at a time**
2. **Approved breaks auto-start at scheduled time**
3. **CD can end break early (to recover time)**
4. **Break duration updates schedule delay**

---

## 5. MP3 Playback State Machine

### States

| State | Description |
|-------|-------------|
| `idle` | No file loaded |
| `loading` | File being loaded/decoded |
| `ready` | File loaded, ready to play |
| `playing` | Currently playing |
| `paused` | Playback paused |
| `ended` | Playback reached end |
| `error` | Error loading or playing |

### Transitions

```
┌──────┐   load()    ┌─────────┐   loaded()   ┌───────┐
│ idle │ ──────────► │ loading │ ───────────► │ ready │
└──────┘             └─────────┘              └───────┘
    ▲                     │                       │
    │ unload()            │ error()               │ play()
    │                     ▼                       ▼
    │                ┌───────┐              ┌─────────┐
    │                │ error │              │ playing │
    │                └───────┘              └─────────┘
    │                     │                   │     │
    │                     │ retry()           │     │ pause()
    │                     │                   │     ▼
    │                     └──► loading        │ ┌────────┐
    │                                         │ │ paused │
    │ unload()                                │ └────────┘
    └─────────────────────────────────────────┤     │
                                              │     │ play()
                                              │     └──► playing
                                              │
                                              │ ended (auto)
                                              ▼
                                         ┌───────┐
                                         │ ended │
                                         └───────┘
                                              │
                                              │ replay()
                                              ▼
                                           ready
```

### Transition Rules

| From | To | Action | Conditions | Side Effects |
|------|-----|--------|------------|--------------|
| `idle` | `loading` | `load(url)` | Valid URL | Fetch file, decode audio |
| `loading` | `ready` | `loaded()` | Decode success | Extract duration, enable play |
| `loading` | `error` | `error()` | Decode fails | Show error, alert tech |
| `ready` | `playing` | `play()` | Manual start | Start audio, sync position |
| `playing` | `paused` | `pause()` | Manual pause | Store position |
| `paused` | `playing` | `play()` | Resume | Continue from position |
| `playing` | `ended` | Auto | Position >= duration | Trigger routine completion |
| `ended` | `ready` | `replay()` | CD allows | Reset position to 0 |
| any | `idle` | `unload()` | Manual | Release audio resources |
| `error` | `loading` | `retry()` | Manual | Re-attempt load |

### Position Sync Events

```typescript
// Broadcast every 500ms while playing
interface PlaybackPositionEvent {
  type: 'playback:position';
  routineId: string;
  positionMs: number;
  durationMs: number;
  isPlaying: boolean;
  timestamp: number;
}
```

---

## 6. Schedule Break State Machine

### States

| State | Description |
|-------|-------------|
| `scheduled` | Break planned in schedule |
| `active` | Break currently in progress |
| `completed` | Break has ended |
| `skipped` | Break was skipped |

### Transitions

```
┌───────────┐   start()    ┌────────┐   end()    ┌───────────┐
│ scheduled │ ────────────► │ active │ ─────────► │ completed │
└───────────┘               └────────┘            └───────────┘
      │
      │ skip()
      ▼
┌─────────┐
│ skipped │
└─────────┘
```

---

## 7. Combined State Diagram

Shows how state machines interact:

```
COMPETITION: pending ──► active ──────────────────────────► completed
                            │                                    ▲
                            ▼                                    │
ROUTINE[n]:   queued ──► current ──► scoring ──► completed ──────┤
                            │                        │           │
                            ▼                        ▼           │
PLAYBACK:     idle ──► loading ──► ready ──► playing ──► ended   │
                                                │                │
                                                ▼                │
SCORES[j]:    empty ──────────────► draft ──► submitted ─────────┤
                                                │                │
                                                ▼                │
                                              final ─────────────┘
```

---

## 8. Implementation Notes

### State Storage

```typescript
interface LiveCompetitionState {
  competitionState: 'pending' | 'active' | 'paused' | 'completed';
  currentRoutineId: string | null;
  currentRoutineState: 'queued' | 'current' | 'scoring' | 'completed' | 'skipped' | 'scratched';
  playbackState: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';
  playbackPositionMs: number;
  scheduleDelayMinutes: number;
  judgesCanSeeScores: boolean;
  dayNumber: number;
  sessionNumber: number;
}
```

### State Persistence

- **Server:** `live_competition_state` table (source of truth)
- **Client:** IndexedDB (offline cache)
- **Sync:** WebSocket events + polling fallback

### Validation Helper

```typescript
function canTransition(
  machine: 'competition' | 'routine' | 'score' | 'break' | 'playback',
  currentState: string,
  targetState: string
): boolean {
  const validTransitions = STATE_TRANSITIONS[machine];
  return validTransitions[currentState]?.includes(targetState) ?? false;
}
```

---

*All state machines are now fully defined with valid transitions, conditions, and side effects. Implementation can proceed.*
