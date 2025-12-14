# Phase 3: Game Day Development (CRITICAL - SYNCHRONIZED SYSTEM)

**Game Day** refers to the at-competition live views. These pages are ALL kept in live sync via the `live_competition_state` table and must be considered as a unified system.

## Game Day Pages (All Must Stay In Sync)

| URL | Purpose | Controller |
|-----|---------|------------|
| `/game-day-test` | Multi-view test page (all pages combined for testing) | - |
| `/backstage` | Backstage monitor showing current/next routines | Reads state |
| `/judge` | Judge scoring interface | Reads state, submits scores |
| `/tabulator` | **MASTER CONTROLLER** - Controls current routine & music playback | Writes state |
| `/scoreboard` | Public display of scores and awards | Reads state |

## Synchronization Architecture

```
                    ┌─────────────────┐
                    │   TABULATOR     │ ◄── MASTER CONTROLLER
                    │ (writes state)  │
                    └────────┬────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │  live_competition_state │ ◄── Single Source of Truth
                │  (database table)       │
                └────────────┬────────────┘
                             │
         ┌───────────┬───────┴───────┬───────────┐
         ▼           ▼               ▼           ▼
    ┌─────────┐ ┌─────────┐   ┌───────────┐ ┌───────────┐
    │BACKSTAGE│ │  JUDGE  │   │SCOREBOARD │ │GAME-DAY   │
    │(reads)  │ │(reads/  │   │(reads)    │ │TEST       │
    │         │ │scores)  │   │           │ │(reads)    │
    └─────────┘ └─────────┘   └───────────┘ └───────────┘
```

## MANDATORY: Cross-Page Impact Analysis

**BEFORE making any change to a Game Day page, you MUST:**

### 1. Identify the change type:
- State field change (affects all pages reading that field)
- API endpoint change (affects all pages calling that endpoint)
- Data structure change (affects all pages parsing that data)
- UI-only change (isolated to single page)

### 2. Check all affected pages:
- If modifying `live_competition_state` fields → Check ALL 5 pages
- If modifying `liveCompetition` router → Check ALL pages using those procedures
- If modifying score submission → Check judge, tabulator, scoreboard

### 3. Database constraints to respect:
```
competition_state: 'pending' | 'active' | 'paused' | 'completed'
current_entry_state: 'queued' | 'current' | 'scoring' | 'completed' | 'skipped' | 'scratched'
playback_state: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error'
```

### 4. Frontend vs Backend vocabulary:
- Frontend React state: `'not_started'`, `'running'`, `'break'`
- Database constraints: `'pending'`, `'active'`, `'paused'`
- **NEVER mix these** - frontend uses local state, database uses constraint values

## Key Files

| Component | File Path |
|-----------|-----------|
| Tabulator Page | `src/app/tabulator/page.tsx` |
| Backstage Page | `src/app/backstage/page.tsx` |
| Judge Page | `src/app/judge/page.tsx` |
| Scoreboard Page | `src/app/scoreboard/page.tsx` |
| Game Day Test | `src/app/game-day-test/page.tsx` |
| Director Panel Live | `src/app/dashboard/director-panel/live/page.tsx` |
| Live Competition Router | `src/server/routers/liveCompetition.ts` |
| Live State Table | `live_competition_state` (database) |

## Change Checklist

When modifying ANY Game Day component:

- [ ] Identified all pages affected by this change
- [ ] Verified database constraint values are correct
- [ ] Tested state synchronization across pages
- [ ] Checked that Tabulator can still control other pages
- [ ] Verified music playback state propagates correctly
- [ ] Confirmed score submission updates all views

## Testing URLs (Tester Environment)

- https://tester.compsync.net/game-day-test
- https://tester.compsync.net/backstage
- https://tester.compsync.net/judge
- https://tester.compsync.net/tabulator
- https://tester.compsync.net/scoreboard

## Related Documentation

- `docs/specs/MASTER_BUSINESS_LOGIC.md` - Phase system overview
- `src/server/routers/liveCompetition.ts` - All Game Day APIs
