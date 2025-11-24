# Session: Schedule Bug Fixes & Testing Protocol
**Date:** 2024-11-24
**Branch:** tester
**Build:** 158b7ee

---

## Issues Reported

User reported two critical bugs:

### Bug 1: Schedule Blocks Not Appearing on Selected Day
**Symptom:** Award/break blocks created via modal don't appear in schedule table after creation
**Root Cause:** `placeScheduleBlock` mutation didn't set `schedule_day` field, only `scheduled_time`
**Impact:** Blocks created but not visible because query filters by `schedule_day`

### Bug 2: Routines Appearing on All Days
**Symptom:** Routines scheduled for Saturday appear on Thursday, Friday, Sunday too
**Root Cause:** `draftSchedule` state persisted across day changes, showing all draft routines regardless of `selectedDate`
**Impact:** Day isolation broken - wrong routines shown when switching days

---

## Fixes Implemented

### Fix 1: Set schedule_day in placeScheduleBlock
**File:** `src/server/routers/scheduling.ts`
**Lines:** 1463-1475
**Change:**
```typescript
// Extract date-only part for schedule_day (YYYY-MM-DD at midnight)
const scheduleDay = new Date(roundedTime);
scheduleDay.setHours(0, 0, 0, 0);

const updated = await prisma.schedule_blocks.update({
  where: { id: input.blockId },
  data: {
    scheduled_time: roundedTime,
    schedule_day: scheduleDay, // ← NEW: Set the day field for date filtering
    sort_order: input.displayOrder,
    updated_at: new Date(),
  },
});
```

**Result:** Schedule blocks now have `schedule_day` set when placed, making them queryable by date

---

### Fix 2: Clear Draft When Changing Days
**File:** `src/app/dashboard/director-panel/schedule/page.tsx`
**Lines:** 193-197
**Change:**
```typescript
// Clear draft when selectedDate changes (ensures correct day filtering)
useEffect(() => {
  console.log('[SchedulePage] selectedDate changed to:', selectedDate);
  setDraftSchedule([]); // Clear draft to force reload from server
}, [selectedDate]);
```

**Result:** Draft state clears when switching days, forcing reload from server with correct date filter

---

### Fix 3: Multi-Routine Drag in SR (Previous Session)
**File:** `src/components/scheduling/DragDropProvider.tsx`
**Lines:** 258-298
**Change:** Added multi-drag reorder logic for scheduled routines
**Commit:** 35aec87

---

## Deployment Verification

✅ **Build:** Passed (57s, 89/89 pages)
✅ **Pushed:** tester branch (158b7ee)
✅ **Deployed:** tester.compsync.net
✅ **Console Logs:** New code executing (`selectedDate changed to:`)
✅ **Footer:** Shows v1.1.2 (158b7ee)

---

## Testing Limitations

### Playwright MCP Token Limits
**Issue:** Page responses exceed 147k tokens due to 600 routines in DOM
**Impact:** Cannot use browser_snapshot, browser_click, or browser_run_code without hitting 25k token limit
**Workaround:** Database-level verification + manual UI testing required

### Test Data Configuration
**Issue:** Schedule page uses hardcoded TEST_COMPETITION_ID but database has different competition IDs
**Actual Competitions:**
- GLOW Blue Mountain Spring 2026 (263 routines)
- GLOW St. Catharines Spring 2026 (324 routines)
- GLOW Toronto 2026 (189 routines)
- Others (68, 1 routines)

**UI Shows:** "Test Competition Spring 2026" (doesn't exist in DB)
**Conclusion:** Schedule page using test/demo data, not real competitions

---

## Happy Path Testing Protocol Created

**File:** `SCHEDULE_HAPPY_PATH_TEST.md`
**Purpose:** Comprehensive 8-test protocol for continuous validation
**Tests:**
1. Reset All Schedules
2. Drag ~150 Routines Across Days (100→Thursday, 150→Friday, etc.)
3. Place Award Blocks with auto-time
4. Place Break Blocks with auto-time
5. Multi-Select Drag in SR
6. Cross-Day Validation (day isolation)
7. Block Drag and Reorder
8. Save Error Handling

**Usage:** Run on every "continue" during schedule development
**Estimated Time:** 15-20 minutes per full run

---

## Verification Status

### ✅ Code-Level Verification
- [x] Fix 1: schedule_day field added to placeScheduleBlock mutation
- [x] Fix 2: useEffect clears draft on selectedDate change
- [x] Fix 3: Multi-drag reorder logic implemented
- [x] Build passes
- [x] Deployment successful
- [x] New code executing (console logs visible)

### ⚠️ UI-Level Verification (Blocked)
- [ ] Cannot test via Playwright (token limits)
- [ ] Manual testing required
- [ ] Database queries show no schedule blocks created yet (user hasn't tested)
- [ ] No routines scheduled yet (all days show 0)

### 🔧 Manual Verification Needed
User should test:
1. **Create award block on Thursday** → Verify appears only on Thursday, not other days
2. **Schedule 10 routines on Saturday** → Switch to Friday → Verify isolation (Saturday routines don't appear)
3. **Shift-select 3 routines** → Drag one → Verify all 3 move together
4. **Save schedule** → Check console for Prisma errors (should be none)

---

## Commits This Session

1. **35aec87** - Multi-routine drag in SR reorder (previous session)
2. **158b7ee** - Schedule blocks place on correct day + day isolation

---

## Next Steps

### For Developer (Claude)
1. Wait for user to manually test fixes
2. If bugs found → Fix and retest
3. If tests pass → Mark protocol as validated
4. Consider reducing test data (<100 routines) for future Playwright testing

### For User
1. Hard refresh tester.compsync.net (Ctrl+Shift+R)
2. Navigate to Schedule page
3. Test Bug 1 fix: Create award block → Verify appears on correct day only
4. Test Bug 2 fix: Schedule routines on Saturday → Switch days → Verify isolation
5. Report results

---

## Known Issues

1. **Playwright Testing:** Page size (147k tokens) exceeds MCP tool limits
2. **Test Data:** Hardcoded competition IDs don't match database
3. **600 Routines:** Large dataset makes UI interaction slow/difficult

---

## Success Criteria

- [x] Build passes
- [x] Code deployed to tester
- [x] schedule_day field populated on block placement
- [x] Draft clears when changing days
- [ ] Manual verification pending (user testing required)

---

*Session completed: 2024-11-24*
*Total commits: 2 (35aec87, 158b7ee)*
*Files changed: 3 (DragDropProvider.tsx, scheduling.ts, schedule/page.tsx)*
*Testing protocol: SCHEDULE_HAPPY_PATH_TEST.md created*
