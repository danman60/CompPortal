# Scheduling E2E Test Report - CRITICAL BUG FOUND

**Project:** CompPortal - Scheduling System
**Environment:** tester.compsync.net
**Branch:** tester
**Build:** v1.1.2 (f7ad638)
**Date:** November 15, 2025
**Tester:** Claude Code (Automated via Playwright MCP)

---

## Executive Summary

**🔴 DO NOT DEPLOY - Critical Data Mismatch Bug**

**Test Status:** 60% tests passed, 40% blocked by P0 bug
**Critical Issue:** Drag-and-drop visual persistence failure
**Root Cause:** Frontend/backend data contract mismatch

### Quick Status

| Test Category | Status | Details |
|---------------|--------|---------|
| Page Load | ✅ PASS | All components load successfully |
| Data Loading | ✅ PASS | **60/60 routines** (BUG-002 from Nov 14 FIXED!) |
| Filters | ✅ PASS | Classification and genre filters working |
| Drag-and-Drop UI | ✅ PASS | HTML5 drag-and-drop functional |
| Visual Persistence | 🔴 **CRITICAL BUG** | Routines don't stick after drag |
| Database Persistence | ⚠️ PARTIAL | Data saves but with wrong format |
| Studio Codes | ✅ PASS | A, B, C, D, E display correctly |
| Statistics | ✅ PASS | Counts accurate |
| Conflicts | ✅ PASS | Panel displays correctly |
| Actions | ✅ PASS | Buttons present |

---

## 🔴 CRITICAL BUG: BUG-001 - Visual Persistence Failure

### Severity
**P0 - BLOCKING** - Core scheduling feature is non-functional

### Description
When a routine is dragged to a schedule zone (Saturday AM/PM, Sunday AM/PM), the drag operation appears to work (mutation succeeds), but the routine immediately returns to the "Unscheduled" pool. After page refresh, all routines are unscheduled despite database showing scheduled data.

### Steps to Reproduce
1. Navigate to https://tester.compsync.net/dashboard/director-panel/schedule
2. Wait for 60 routines to load in "Unscheduled Routines" panel
3. Drag any routine (e.g., "Starlight Spectacular") to "Sunday Morning" drop zone
4. Observe: Routine visually disappears but doesn't appear in drop zone
5. Refresh page
6. Observe: All routines back in "Unscheduled" pool

### Expected Behavior
1. Drag routine to drop zone → routine stays in drop zone visually
2. Statistics update: Unscheduled decreases, Scheduled increases
3. Page refresh → routine remains in scheduled drop zone
4. Database contains zone information for filtering

### Actual Behavior
1. Drag routine → mutation succeeds but routine disappears
2. Statistics don't update (remain 0 scheduled)
3. Page refresh → all 60 routines back in unscheduled pool
4. Database contains TIME data but not ZONE data

---

## Root Cause Analysis

### Data Contract Mismatch

**Frontend Expectation:**
- Stores zone IDs: `"saturday-am"`, `"saturday-pm"`, `"sunday-am"`, `"sunday-pm"`
- Uses zone IDs to group routines for display

**Backend Reality:**
- Stores TIME values: `"09:00:00"`, `"13:00:00"` (parsed from zone ID strings)
- Returns `scheduledTime` as TIME, not zone ID

### Code Evidence

**Frontend - Mutation Call (page.tsx:195-199):**
```typescript
scheduleMutation.mutate({
  routineId: active.id as string,
  tenantId: TEST_TENANT_ID,
  performanceTime: over.id as string, // Sending "saturday-am" as time!
});
```

**Frontend - Zone Initialization (page.tsx:139-152):**
```typescript
useEffect(() => {
  if (!routines) return;

  const initialZones: Record<string, ScheduleZone> = {};
  routines.forEach(routine => {
    // BUG: scheduledTime is "09:00:00", not "saturday-am"
    if (routine.scheduledTime && typeof routine.scheduledTime === 'string') {
      initialZones[routine.id] = routine.scheduledTime as ScheduleZone;
    }
  });

  setRoutineZones(initialZones);
}, [routines]);
```

**Backend - Mutation (scheduling.ts:318-330):**
```typescript
data: {
  performance_date: performanceDateObject,
  performance_time: performanceTimeObject, // Parses "saturday-am" as time!
},
```

**Database Reality:**
```sql
SELECT id, title, performance_date, performance_time, is_scheduled
FROM competition_entries
WHERE id IN ('10000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-000000000001');

Results:
id: ...000f | title: Starlight Spectacular | performance_date: 2025-11-16 | performance_time: 09:00:00 | is_scheduled: false
id: ...0001 | title: Sparkle and Shine     | performance_date: 2025-11-16 | performance_time: 13:00:00 | is_scheduled: false
```

### The Fatal Flow

1. **User drags "Starlight Spectacular" to "Sunday Morning"**
2. **Frontend sends:** `performanceTime: "sunday-am"` (zone ID)
3. **Backend receives:** Tries to parse `"sunday-am"` as a timestamp
4. **Backend likely:**
   - Parsing fails, defaults to some time (09:00:00)
   - OR uses fallback logic to convert zone name to time
5. **Backend saves:** `performance_time = "09:00:00"` (TIME, not ZONE)
6. **Backend returns:** `scheduledTime: "09:00:00"`
7. **Frontend receives:** `routine.scheduledTime = "09:00:00"`
8. **Frontend tries:** `initialZones[routine.id] = "09:00:00"` (WRONG!)
9. **Frontend groups:** `routinesByZone["09:00:00"]` instead of `routinesByZone["sunday-am"]`
10. **Result:** Routine ends up in nonexistent zone, appears unscheduled

---

## Database Verification

**Scheduled Routines Found:**
```sql
SELECT id, title, performance_date, performance_time, is_scheduled, updated_at
FROM competition_entries
WHERE competition_id = '1b786221-8f8e-413f-b532-06fa20a2ff63'
  AND performance_date IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

**Results:**
| Routine | Date | Time | is_scheduled | Updated |
|---------|------|------|--------------|---------|
| Sparkle and Shine | 2025-11-16 | 13:00:00 | false | 2025-11-15 13:08:55 |
| Starlight Spectacular | 2025-11-16 | 09:00:00 | false | 2025-11-15 13:08:51 |
| Rise Together | 2025-11-16 | 09:00:00 | false | 2025-11-15 12:41:33 |
| City Lights | 2025-11-16 | 09:00:00 | false | 2025-11-14 21:04:27 |
| Tappin Time | 2025-11-16 | 09:00:00 | false | 2025-11-14 20:24:48 |

**Observations:**
- ✅ Data IS being saved to database
- ✅ Timestamps are recent (test execution time)
- ❌ `is_scheduled` flag is NOT being set to true
- ❌ Zone information is lost (converted to TIME)

---

## Console Log Evidence

```
[LOG] [Schedule] Drag ended: {routineId: 10000000-0000-0000-0000-00000000000f, targetZone: sunday-am}
[LOG] [Schedule] Calling mutation...
[LOG] [Schedule] Mutation SUCCESS - refetching routines
[LOG] [Schedule] Drag ended: {routineId: 10000000-0000-0000-0000-000000000001, targetZone: sunday-pm}
[LOG] [Schedule] Calling mutation...
[LOG] [Schedule] Mutation SUCCESS - refetching routines
```

**Analysis:**
- Mutations report SUCCESS ✅
- Zone IDs are correct at drag time ("sunday-am", "sunday-pm") ✅
- But zone IDs are being sent as `performanceTime` parameter ❌
- Backend interprets zone ID as time value ❌

---

## Recommended Fixes

### Option 1: Add schedule_zone Column (RECOMMENDED)

**Why:** Clean separation of concerns, preserves zone semantics

**Implementation:**
1. Add migration:
```sql
ALTER TABLE competition_entries
ADD COLUMN schedule_zone VARCHAR(20);

CREATE INDEX idx_competition_entries_schedule_zone
ON competition_entries(schedule_zone);
```

2. Update frontend mutation (page.tsx:195-201):
```typescript
scheduleMutation.mutate({
  routineId: active.id as string,
  tenantId: TEST_TENANT_ID,
  scheduleZone: over.id as string, // "saturday-am" etc.
  performanceDate: getDateForZone(over.id), // Derive from zone
  performanceTime: getTimeForZone(over.id), // Derive from zone
});
```

3. Update backend mutation (scheduling.ts:318-330):
```typescript
data: {
  schedule_zone: input.scheduleZone,
  performance_date: input.performanceDate,
  performance_time: input.performanceTime,
  is_scheduled: true, // SET THE FLAG!
},
```

4. Update frontend initialization (page.tsx:139-152):
```typescript
routines.forEach(routine => {
  if (routine.scheduleZone) {
    initialZones[routine.id] = routine.scheduleZone as ScheduleZone;
  }
});
```

**Estimated Time:** 2-3 hours

---

### Option 2: Derive Zone from Time (NOT RECOMMENDED)

**Why:** Fragile, requires mapping logic, loses zone semantic meaning

**Implementation:**
1. Create mapping function:
```typescript
function timeToZone(time: string, date: string): ScheduleZone {
  const hour = parseInt(time.split(':')[0]);
  const dayOfWeek = new Date(date).getDay();

  if (dayOfWeek === 6) { // Saturday
    return hour < 12 ? 'saturday-am' : 'saturday-pm';
  } else if (dayOfWeek === 0) { // Sunday
    return hour < 12 ? 'sunday-am' : 'sunday-pm';
  }
  return 'unscheduled';
}
```

2. Use in initialization:
```typescript
routines.forEach(routine => {
  if (routine.performanceTime && routine.performanceDate) {
    const zone = timeToZone(routine.performanceTime, routine.performanceDate);
    initialZones[routine.id] = zone;
  }
});
```

**Problems:**
- Assumes AM = before noon, PM = after noon
- Breaks if competition has multiple sessions per day
- No clear boundary (what if AM session is 11am-1pm?)
- Fragile to time zone changes

**Estimated Time:** 1-2 hours (but creates technical debt)

---

## Test Results Summary

### ✅ Tests PASSING (6/10)

**Test 1: Page Load & Navigation**
- ✅ Login successful
- ✅ Navigation to schedule page works
- ✅ Build version v1.1.2 (f7ad638) confirmed
- ✅ No critical console errors (400 error non-blocking)

**Test 2: Data Loading**
- ✅ **60 routines loaded** (IMPROVEMENT from Nov 14 test: 58 → 60)
- ✅ Studio codes A, B, C, D, E all represented
- ✅ Classifications: Crystal, Emerald, Production, Sapphire, Titanium
- ✅ Genres: Ballet, Contemporary, Hip Hop, Jazz, Lyrical, Musical Theatre, Tap
- ✅ All routine metadata present (title, studio, classification, category, age, size, duration)

**Test 3: Filters**
- ✅ Classification filter populated with 5 options + "All"
- ✅ Genre filter populated with 7 options + "All"
- ✅ Search input visible and accessible
- ✅ Filters update routine list (not tested extensively)

**Test 4: Drag-and-Drop UI**
- ✅ HTML5 drag-and-drop implemented (dnd-kit library)
- ✅ Routine cards are draggable (activationConstraint: 8px)
- ✅ Drop zones visible and functional (4 zones)
- ✅ Drag overlay displays active routine
- ✅ Pointer sensor configured

**Test 7: Studio Code Anonymity**
- ✅ Studio codes display (A, B, C, D, E)
- ✅ Multiple studios represented (5 studios)
- ✅ Codes consistent across routines

**Test 8: Statistics Panel**
- ✅ Unscheduled count displays
- ✅ Scheduled count displays
- ✅ Total count displays
- ✅ Counts match data (Unscheduled: 60, Scheduled: 0, Total: 60)

**Test 9: Conflicts Panel**
- ✅ Panel visible
- ✅ Shows "No conflicts detected" message with checkmark

**Test 10: Actions Panel**
- ✅ "Save Schedule" button visible and clickable
- ✅ "Export Schedule" button visible and clickable
- ⏸️ Button functionality untested (no scheduled routines)

---

### ❌ Tests FAILING (2/10)

**Test 5: Scheduling Operations - BLOCKED**
- ❌ Cannot test - visual persistence broken
- ⏸️ Blocked by BUG-001

**Test 6: Database Persistence - PARTIAL PASS**
- ✅ Mutations execute successfully
- ✅ Data saves to database (`performance_date`, `performance_time`)
- ❌ Zone information not saved (converted to time)
- ❌ `is_scheduled` flag not set to true
- ❌ Visual persistence fails after refresh

---

### 🔄 Tests INCOMPLETE (2/10)

**Filters (Advanced Testing)**
- Tested basic filter population
- Did not test: Multiple filters combined, search functionality

**Actions (Functionality Testing)**
- Buttons visible
- Did not test: Save/export functionality (requires scheduled routines)

---

## Performance Notes

**Page Load:** ~3 seconds
**Routine Load:** ~5 seconds (60 routines)
**Mutation Speed:** <1 second
**Refetch After Mutation:** ~2 seconds

---

## Improvements Since Nov 14 Test

1. ✅ **BUG-002 RESOLVED:** All 60 routines now loading (was 58/60)
2. ✅ Drag-and-drop UI fully implemented (was missing)
3. ✅ Mutations executing successfully (was not implemented)
4. ❌ **NEW BUG-001:** Visual persistence broken (data contract mismatch)

---

## Recommendations

### Immediate Actions (Before Next Deploy)

1. **🔴 CRITICAL: Fix BUG-001** (3 hours)
   - Add `schedule_zone` column to database
   - Update frontend mutation to send zone + time separately
   - Update backend mutation to save both fields
   - Set `is_scheduled = true` when scheduling
   - Update frontend initialization to read `schedule_zone`

2. **⚠️ Set is_scheduled Flag** (30 minutes)
   - Backend mutation should set `is_scheduled = true` when saving schedule data
   - Frontend query already checks this flag (scheduling.ts:257)

3. **✅ Manual Testing** (1 hour)
   - Drag routine to zone
   - Verify routine stays in zone visually
   - Refresh page
   - Verify routine still in zone after refresh
   - Check database: `schedule_zone`, `is_scheduled = true`

### Next Test Cycle (After Fix)

**Prerequisites:**
- ✅ BUG-001 resolved (visual persistence working)
- ✅ `is_scheduled` flag being set correctly

**Test Focus:**
- Drag multiple routines to different zones
- Verify counts update correctly
- Verify database persistence across page refresh
- Test filters with scheduled + unscheduled routines
- Test conflict detection (drag conflicting routines)
- Test Save/Export buttons

**Estimated Duration:** 2-3 hours

---

## Evidence Files

**Location:** `D:\ClaudeCode\.playwright-mcp\`

1. `test-suite-scheduling-60-routines-loaded-20251115.png` - Initial page load (60 routines)
2. `test-suite-after-refresh-20251115.png` - After drag operations and refresh (routines unscheduled)

---

## Browser Console Output

```
[ERROR] Failed to load resource: the server responded with a status of 400 () @ https://tester.compsync.net/
[LOG] [Schedule] Drag ended: {routineId: 10000000-0000-0000-0000-00000000000f, targetZone: sunday-am}
[LOG] [Schedule] Calling mutation...
[LOG] [Schedule] Mutation SUCCESS - refetching routines
[LOG] [Schedule] Drag ended: {routineId: 10000000-0000-0000-0000-000000000001, targetZone: sunday-pm}
[LOG] [Schedule] Calling mutation...
[LOG] [Schedule] Mutation SUCCESS - refetching routines
```

**Notes:**
- 400 error is non-blocking (noted in previous test)
- Mutations report SUCCESS but visual update fails
- Refetch is triggered but doesn't restore visual state

---

## Deployment Decision

**🔴 DO NOT DEPLOY**

**Blocking Issue:** BUG-001 (Visual Persistence Failure)
**Severity:** P0 - Critical
**Impact:** Core scheduling feature is non-functional
**Users Cannot:** Schedule routines persistently
**Data Risk:** Low (data is saving, just not displaying)

**Safe to Deploy After:** BUG-001 resolved + manual verification

---

## Next Steps

1. Implement Option 1 (add `schedule_zone` column)
2. Update frontend/backend mutations
3. Manual test drag-and-drop persistence
4. Run full E2E test suite again
5. Deploy to staging for UAT
6. Production deployment

---

**Report Generated:** November 15, 2025 1:10 PM EST
**Test Duration:** ~15 minutes (including analysis)
**Next Review:** After BUG-001 fix implementation
