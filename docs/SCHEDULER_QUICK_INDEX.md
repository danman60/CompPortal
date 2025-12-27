# Scheduler Quick Index

**Purpose:** Quick reference for fixing scheduler issues when client feedback arrives
**Last Updated:** Dec 27, 2025

---

## File Locations

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/dashboard/director-panel/schedule/page.tsx` | 3,002 | Main UI (Schedule V2) |
| `src/server/routers/scheduling.ts` | 4,392 | Backend API |
| `src/components/scheduling/RoutinePool.tsx` | ~400 | Left panel with filters |
| `src/components/scheduling/ScheduleTable.tsx` | ~300 | Schedule display table |
| `src/components/scheduling/DayTabs.tsx` | ~100 | Day selection tabs |
| `src/components/scheduling/RoutineEditModal.tsx` | ~900 | Edit routine details |
| `src/components/scheduling/ActionsDropdown.tsx` | ~200 | Actions menu |

---

## Key Line Numbers (page.tsx)

### State Management
| Line | What |
|------|------|
| 672 | `selectedCompetitionId` state |
| 673 | `selectedDate` state |
| 674 | `scheduleByDate` - schedule order per day |
| 680 | `selectedRoutineIds` - multi-select |
| 1169 | `entryNumbersByRoutineId` - entry # calculation |

### Mutations (API Calls)
| Line | Mutation | Purpose |
|------|----------|---------|
| 804 | `saveMutation` | Save schedule to DB |
| 810 | `createBlockMutation` | Add award/break blocks |
| 823 | `deleteBlockMutation` | Remove blocks |
| 839 | `unscheduleMutation` | Remove routines from schedule |
| 856 | `updateDayStartTimeMutation` | Change day start time |
| 866 | `resetDayMutation` | Clear a day's schedule |
| 876 | `resetCompetitionMutation` | Clear all days |
| 899 | `restoreVersionMutation` | Undo to previous version |

### Queries (Data Fetching)
| Line | Query | Purpose |
|------|-------|---------|
| 727 | `competition.getAll` | Competition dropdown |
| 762 | `scheduling.getRoutines` | All routines for competition |
| 767 | `scheduling.getScheduleBlocks` | Award/break blocks |
| 774 | `scheduling.getDayStartTimes` | Per-day start times |
| 894 | `scheduling.getVersionHistory` | Undo history |

### Key Handlers
| Line | Function | Purpose |
|------|----------|---------|
| 522 | `handleScheduledRoutineClick` | Shift-click multi-select |
| 1169 | `entryNumbersByRoutineId` | Calculate entry #s |
| 1208 | Conflict sorting | Sort by entry number |

---

## Key Line Numbers (scheduling.ts)

### Time Helpers
| Line | Function | Purpose |
|------|----------|---------|
| 81 | `timeStringToDateTime` | String → DB format |
| 91 | `dateTimeToTimeString` | DB → String format |
| 105 | `addMinutesToTimeString` | Time cascade math |
| 118 | `calculateDuration` | Get routine duration |

### Core Procedures
| Line | Procedure | Purpose |
|------|-----------|---------|
| 340 | `schedule` | Main save - ATOMIC TRANSACTION |
| 967 | `scheduleRoutine` | Schedule single routine |
| 1053 | `resetScheduleForDay` | Clear one day |
| 1094 | `resetScheduleForCompetition` | Clear all days |

### Save Logic (Critical!)
| Line | What |
|------|------|
| 350-360 | Duplicate entry number check |
| 363 | `$transaction` start |
| 366-378 | Phase 1a: Clear date's entry numbers |
| 380-393 | Phase 1b: Clear conflicting entry numbers |
| 408-428 | Phase 2: Batch UPDATE with UNNEST |

---

## Common Issues & Fixes

### Time Calculation Wrong
**Symptom:** Times not cascading correctly
**Check:** `addMinutesToTimeString()` at line 105-111
**Check:** Duration calculation at line 118-130

### Routines Not Saving
**Symptom:** Changes lost on refresh
**Check:** `saveMutation` at line 804
**Check:** Transaction at scheduling.ts:363

### Duplicate Entry Numbers
**Symptom:** Same # on multiple routines
**Check:** Duplicate check at scheduling.ts:350-360
**Check:** Phase 1b clear at scheduling.ts:380-393

### Metadata Missing
**Symptom:** Studio name, category, etc. blank
**Check:** `getRoutines` query at scheduling.ts:780-964
**Check:** Include statements for joins

### Day Start Time Not Updating
**Symptom:** Times don't recalculate after changing start
**Check:** `updateDayStartTimeMutation` at page.tsx:856
**Check:** `updateDayStartTime` in scheduling.ts

---

## Duration Defaults (scheduling.ts:126-130)

| Entry Size | Duration |
|------------|----------|
| Solo | 3 min |
| Duet/Trio, Small Group, Large Group | 4 min |
| Production, Line | 5 min |

**Extended Time:** If `extended_time_requested` + has duration → uses custom time

---

## Quick Debug Commands

```bash
# Check save mutation flow
grep -n "saveMutation\|schedule.useMutation" src/app/dashboard/director-panel/schedule/page.tsx

# Check entry number calculation
grep -n "entryNumber\|entry_number" src/server/routers/scheduling.ts | head -30

# Check time cascade
grep -n "addMinutes\|duration\|performanceTime" src/server/routers/scheduling.ts | head -20
```

---

## Worst Case Scenarios

| Scenario | Root Cause | Fix Location |
|----------|------------|--------------|
| Times wrong | `addMinutesToTimeString` bug | scheduling.ts:105 |
| Save fails silently | Transaction timeout | scheduling.ts:437-440 |
| Duplicates appear | Entry number collision | scheduling.ts:350-393 |
| Missing metadata | Join not included | scheduling.ts:780-823 |
| Wrong duration | Size category lookup | scheduling.ts:126-130 |

---

*Created for rapid response to client feedback*
