# Phase 2 Scheduler Comprehensive Test Plan

**Date:** November 29, 2025
**Branch:** tester
**Environment:** tester.compsync.net/dashboard/director-panel/schedule
**Build:** 3634271 (current)

---

## Test Objectives

1. Verify all Phase 2 scheduler features work correctly
2. Confirm all Session 74-76 fixes remain stable
3. Identify any remaining issues or edge cases
4. Document current state for next development phase

---

## Test Categories

### 1. Schedule Loading & Display
- [ ] Page loads without errors
- [ ] Day tabs render correctly (Thursday-Sunday)
- [ ] Routines display with correct information
- [ ] Break/award blocks display correctly
- [ ] Trophy badges appear in dedicated column
- [ ] All table columns properly aligned
- [ ] Footer shows correct build hash

### 2. Time Calculations
- [ ] Day start time applies correctly to first routine
- [ ] Routine times cascade correctly (each starts after previous)
- [ ] Break blocks show dynamic calculated time (not static 08:00 AM)
- [ ] Award blocks show dynamic calculated time
- [ ] Duration changes update downstream times

### 3. Drag & Drop Functionality
- [ ] Can drag routines within same day
- [ ] Can drag routines between days
- [ ] Routines reorder correctly
- [ ] Times recalculate after reorder
- [ ] Break blocks stay in correct position
- [ ] Unsaved changes indicator appears

### 4. Save Functionality
- [ ] Save Schedule button only appears with changes
- [ ] Clicking Save returns HTTP 200 (not 500)
- [ ] Toast shows "Saved schedule for X day(s)"
- [ ] Unsaved changes indicator clears after save
- [ ] Database contains saved changes
- [ ] Page reload shows saved schedule

### 5. Multi-Day Operations
- [ ] Can schedule routines on multiple days
- [ ] Changes to one day don't affect others
- [ ] Reset Day clears only selected day
- [ ] Reset All clears all days
- [ ] Save applies to all changed days

### 6. Badge System
- [ ] Trophy badges display for last routine in category
- [ ] Note badges display for routines with notes
- [ ] Conflict badges display when schedule conflicts exist
- [ ] Multiple badges can coexist on same routine
- [ ] Badge dismissal works correctly
- [ ] Badges don't break table layout

### 7. Unscheduled Routines
- [ ] Unscheduled routines panel shows correct count
- [ ] Can drag from unscheduled to schedule
- [ ] Can drag from schedule back to unscheduled
- [ ] Entry numbers update correctly

### 8. Error Handling
- [ ] No console errors on page load
- [ ] No errors when dragging routines
- [ ] No errors when saving schedule
- [ ] Graceful handling of network failures

---

## Test Execution Order

### Phase 1: Basic Functionality (30 min)
1. Load page, verify no errors
2. Check day tabs navigation
3. Verify routine display
4. Check time calculations

### Phase 2: Session 74-76 Fixes (15 min)
5. Verify break block dynamic time (Session 74)
6. Verify save schedule works (Session 75)
7. Verify trophy badges layout (Session 76)

### Phase 3: Advanced Features (30 min)
8. Test drag & drop
9. Test multi-day operations
10. Test badge system
11. Test unscheduled routines

### Phase 4: Edge Cases (15 min)
12. Test with empty schedule
13. Test with maximum routines
14. Test rapid changes
15. Test network interruptions

---

## Success Criteria

**PASS:** All tests complete without errors
**FAIL:** Any P0/P1 errors found, create BLOCKER.md

---

## Test Results

Will be populated during testing below.

---
