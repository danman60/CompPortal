# Day Start Time Display Bug - Claude Code Handoff

**Date:** December 5, 2025 (UPDATED)
**File:** `D:\ClaudeCode\CompPortal-tester\src\app\dashboard\director-panel\schedule-v2\page.tsx`
**Branch:** tester
**Previous Fix Attempts:** 3+ (all failed)

---

## Problem Summary

When CD updates the start time on a DayCard (e.g., 8:00 AM → 9:00 AM):
- ✅ Time saves to database correctly
- ✅ DayCard shows new time
- ❌ Schedule table still shows routines starting at OLD time (always 8:00 AM)

---

## Root Cause (VERIFIED from current code ~line 1590)

The `DroppableScheduleTable` component receives a **hardcoded** value:

```typescript
<DroppableScheduleTable
  ...
  dayStartMinutes={8 * 60}  // ← HARDCODED! Always 480 (8:00 AM)
```

The `getDayStartMinutes(selectedDate)` helper function exists and works (~line 975), but it's **never called** when passing the prop.

---

## COMPLETE FIX

### Step 1: Find DroppableScheduleTable render (~line 1590)

Search for `<DroppableScheduleTable`

### Step 2: Replace the hardcoded prop

**FIND this line (around line 1600):**
```typescript
dayStartMinutes={8 * 60}
```

**REPLACE WITH:**
```typescript
dayStartMinutes={getDayStartMinutes(selectedDate)}
```

### Step 3: Add key prop to force re-render when times change

Add a `key` prop to the component so React knows to re-render when day start times change:

```typescript
<DroppableScheduleTable
  key={`schedule-${selectedDate}-${JSON.stringify(dayStartTimes?.map(d => d.start_time) || [])}`}
  scheduleOrder={scheduleOrder}
  ...
```

### Step 4: (Optional) Make getDayStartMinutes a useCallback

The current plain function (~line 975) should work, but if issues persist, wrap in useCallback:

```typescript
const getDayStartMinutes = useCallback((date: string): number => {
  const storedStartTime = dayStartTimes?.find((dst: any) => {
    const dstDate = new Date(dst.date);
    const targetDate = new Date(date);
    return dstDate.getTime() === targetDate.getTime();
  });

  if (storedStartTime?.start_time) {
    const timeValue = new Date(storedStartTime.start_time);
    const hours = timeValue.getUTCHours();
    const minutes = timeValue.getUTCMinutes();
    return hours * 60 + minutes;
  }

  return 8 * 60; // Default to 8:00 AM
}, [dayStartTimes]);
```

---

## Why Previous Fixes Failed

1. **Fixed helper but not the call site** - Helper function works but JSX still has `8 * 60`
2. **No key prop** - React memoization prevents re-render even when dayStartMinutes changes
3. **Date comparison issues** - Different date formats (ISO string vs Date object) causing mismatches

---

## Verification Steps

1. Open Schedule V2 on tester (tester.compsync.net)
2. Schedule some routines on a day
3. Note first routine time (should show 8:00 AM default)
4. Click time display on DayCard to edit
5. Change to 9:30 AM, press Enter or click Save
6. **First routine should immediately show 9:30 AM**
7. **All subsequent routines should cascade** (9:33 AM, 9:36 AM, etc.)
8. Switch to different day and back - times should persist
9. Refresh page - times should still be correct from database

---

## Files

- `src/app/dashboard/director-panel/schedule-v2/page.tsx` - line ~1590-1600

---

## Priority

**P1 - High** - CDs need accurate start times for each competition day
