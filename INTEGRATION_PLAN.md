# Scheduler Component Integration Plan

**Created:** November 15, 2025 (End of Session 55)
**Target:** tester.compsync.net
**Estimated Time:** 3-4 hours

---

## Overview

**Status:** 9 components built and ready for integration
**Current:** Components exist but not yet integrated into schedule page
**Goal:** Wire up all components into working schedule interface

---

## Components Ready for Integration

### Already Built (Session 55):

1. ✅ **ScheduleStateMachine.tsx** (270 lines)
2. ✅ **ConflictOverrideModal.tsx** (218 lines)
3. ✅ **TrophyHelperPanel.tsx** (271 lines)
4. ✅ **ScheduleBlockCard.tsx** (175 lines)
5. ✅ **ScheduleBlockModal.tsx** (280 lines)
6. ✅ **DaySelector.tsx** (240 lines)
7. ✅ **StudioRequestsPanel.tsx** (310 lines)
8. ✅ **AgeChangeWarning.tsx** (150 lines)
9. ✅ **HotelAttritionBanner.tsx** (130 lines)

### Existing in Schedule Page:

- Basic drag-drop (working)
- Inline trophy helper (replace with component)
- Inline hotel warning (replace with component)
- Inline state machine (replace with component)
- Basic studio requests panel (replace with component)

---

## Integration Steps

### Step 1: Add Imports (5 min)

**File:** `src/app/dashboard/director-panel/schedule/page.tsx`
**Location:** Top of file (after existing imports)

```typescript
// NEW COMPONENTS
import { TrophyHelperPanel } from '@/components/TrophyHelperPanel';
import { ScheduleStateMachine } from '@/components/ScheduleStateMachine';
import { DaySelector } from '@/components/DaySelector';
import { StudioRequestsPanel } from '@/components/StudioRequestsPanel';
import { HotelAttritionBanner } from '@/components/HotelAttritionBanner';
import { AgeChangeWarning } from '@/components/AgeChangeWarning';
import { ScheduleBlockCard } from '@/components/ScheduleBlockCard';
import { ScheduleBlockModal } from '@/components/ScheduleBlockModal';
import { ConflictOverrideModal } from '@/components/ConflictOverrideModal';
```

---

### Step 2: Replace State Machine (30 min)

**Current Location:** Lines 679-757 (inline implementation)
**Action:** Replace with ScheduleStateMachine component

**Before:**
```typescript
{/* State Machine Toolbar */}
<div className="mb-6...">
  {/* Inline status badge and buttons */}
</div>
```

**After:**
```typescript
{/* State Machine */}
<ScheduleStateMachine
  competitionId={TEST_COMPETITION_ID}
  tenantId={TEST_TENANT_ID}
  currentState={scheduleStatus}
  onStateChange={() => refetch()}
/>
```

**Changes Needed:**
- Remove inline state machine UI (lines 679-757)
- Add ScheduleStateMachine component
- Wire up `scheduleStatus` state
- Connect `onStateChange` to refetch

---

### Step 3: Replace Trophy Helper (20 min)

**Current Location:** Lines 1072-1260 (inline implementation)
**Action:** Replace with TrophyHelperPanel component

**Before:**
```typescript
{/* Trophy Helper Panel */}
<div className="col-span-12...">
  {/* Inline trophy helper */}
</div>
```

**After:**
```typescript
<TrophyHelperPanel
  competitionId={TEST_COMPETITION_ID}
  tenantId={TEST_TENANT_ID}
  onLastRoutineClick={(routineId) => {
    // Scroll to routine in schedule
  }}
/>
```

**Changes Needed:**
- Remove inline trophy helper (lines 1072-1260)
- Add TrophyHelperPanel component
- Implement scroll-to-routine handler

---

### Step 4: Replace Hotel Attrition Warning (15 min)

**Current Location:** Lines 854-925 (inline implementation)
**Action:** Replace with HotelAttritionBanner component

**Before:**
```typescript
{/* Hotel Attrition Warning */}
{(() => {
  // Inline logic checking Emerald distribution
})()}
```

**After:**
```typescript
<HotelAttritionBanner
  hasWarning={hotelWarningData?.hasWarning || false}
  message={hotelWarningData?.message}
  dayDistribution={hotelWarningData?.dayDistribution || []}
  totalEmeraldRoutines={hotelWarningData?.totalEmeraldRoutines || 0}
/>
```

**Changes Needed:**
- Add `getHotelAttritionWarning` query
- Remove inline warning logic (lines 854-925)
- Add HotelAttritionBanner component

---

### Step 5: Add Day Selector (45 min)

**Location:** After header, before state machine (around line 617)
**Action:** Add DaySelector component (NEW)

**Add:**
```typescript
{/* Day Selector */}
<DaySelector
  competitionDates={competitionDates}
  selectedDay={selectedDay}
  onDayChange={(day) => {
    setSelectedDay(day);
    // Filter routines by day
  }}
  routineCountByDay={routineCountByDay}
  className="mb-6"
/>
```

**Changes Needed:**
- Add `selectedDay` state
- Fetch `competitionDates` from competition data
- Calculate `routineCountByDay` from routines
- Filter displayed routines by selected day
- Update conflict detection to scope by day

---

### Step 6: Replace Studio Requests Panel (20 min)

**Current Location:** Lines 770-852 (inline panel)
**Action:** Replace with StudioRequestsPanel component

**Before:**
```typescript
{showRequestsPanel && (
  <div className="mb-6...">
    {/* Inline requests panel */}
  </div>
)}
```

**After:**
```typescript
<StudioRequestsPanel
  competitionId={TEST_COMPETITION_ID}
  tenantId={TEST_TENANT_ID}
  isOpen={showRequestsPanel}
  onClose={() => setShowRequestsPanel(false)}
  onRoutineClick={(routineId) => {
    // Scroll to routine
  }}
/>
```

**Changes Needed:**
- Remove inline panel (lines 770-852)
- Add StudioRequestsPanel component
- Keep existing toggle button

---

### Step 7: Integrate Schedule Blocks (1 hour)

**Location:** Left panel (unscheduled routines area)
**Action:** Add draggable block templates

**Add:**
```typescript
{/* Schedule Blocks */}
<div className="mb-4 space-y-2">
  <DraggableBlockTemplate
    type="award"
    onClick={() => {
      setShowBlockModal(true);
      setBlockType('award');
    }}
  />
  <DraggableBlockTemplate
    type="break"
    onClick={() => {
      setShowBlockModal(true);
      setBlockType('break');
    }}
  />
</div>

{/* Block Modal */}
<ScheduleBlockModal
  isOpen={showBlockModal}
  onClose={() => setShowBlockModal(false)}
  onSave={(block) => {
    // Create block via mutation
    createBlockMutation.mutate({
      ...block,
      competitionId: TEST_COMPETITION_ID,
      tenantId: TEST_TENANT_ID,
    });
  }}
  competitionId={TEST_COMPETITION_ID}
  tenantId={TEST_TENANT_ID}
/>
```

**Changes Needed:**
- Add `showBlockModal` state
- Add `blockType` state
- Import `DraggableBlockTemplate` from ScheduleBlockCard
- Wire up `createScheduleBlock` mutation
- Handle drag-drop for blocks

---

### Step 8: Add Conflict Override Modal (15 min)

**Location:** Near conflict display
**Action:** Wire up ConflictOverrideModal

**Changes Needed:**
- Already have state at lines 264-266
- Replace inline override UI with modal
- Add ConflictOverrideModal component
- Wire up to conflict clicks

---

### Step 9: Add Age Change Warnings (20 min)

**Location:** On routine cards
**Action:** Add AgeChangeWarning badges

**Add:**
```typescript
// In routine card rendering
{routine.age_changed && (
  <AgeChangeWarning
    routineId={routine.id}
    routineTitle={routine.title}
    ageChanges={routine.ageChanges || []}
    compact={true}
  />
)}
```

**Changes Needed:**
- Fetch age change data with routines
- Add badge to routine cards
- Wire up resolve handler

---

### Step 10: Add Display Order Column (30 min)

**Location:** Schedule zone tables
**Action:** Add entry number column

**Add:**
```typescript
// In schedule zone rendering
<div className="text-xs text-purple-300">
  #{routine.displayOrder || index + 1}
</div>
```

**Changes Needed:**
- Show display_order from backend
- Auto-update on drag-drop in draft mode
- Lock numbers when finalized
- Visual indicator for locked vs draft

---

## Testing Checklist

After each integration step:

- [ ] **Build passes** - `npm run build`
- [ ] **No TypeScript errors**
- [ ] **Component renders correctly**
- [ ] **State updates work**
- [ ] **Mutations fire correctly**
- [ ] **No console errors**
- [ ] **Responsive design works**
- [ ] **Drag-drop still functional**

---

## Full Integration Test

After all components integrated:

1. **Load Page**
   - [ ] All 60 routines load
   - [ ] Filters work
   - [ ] Search works
   - [ ] No console errors

2. **Day Selector**
   - [ ] Tabs show correct dates
   - [ ] Routine count per day accurate
   - [ ] Switching days filters routines
   - [ ] Conflicts scoped to day

3. **State Machine**
   - [ ] Draft badge shows
   - [ ] Finalize button works
   - [ ] Publish button works
   - [ ] Unlock button works
   - [ ] Modals show/dismiss

4. **Trophy Helper**
   - [ ] Last routines identified correctly
   - [ ] Award times calculated (+30 min)
   - [ ] Click scrolls to routine
   - [ ] Panel collapses/expands

5. **Schedule Blocks**
   - [ ] Award block draggable
   - [ ] Break block draggable
   - [ ] Modal opens on click
   - [ ] Duration selector works
   - [ ] Block persists to DB

6. **Studio Requests**
   - [ ] Panel opens/closes
   - [ ] Requests show
   - [ ] Filter by status works
   - [ ] Mark completed works
   - [ ] Mark ignored works

7. **Warnings/Alerts**
   - [ ] Hotel warning shows when needed
   - [ ] Dismisses and persists
   - [ ] Age warnings show
   - [ ] Conflict override works

8. **Display Order**
   - [ ] Entry numbers show
   - [ ] Auto-renumber on drag (draft)
   - [ ] Locked when finalized

---

## Production Testing

After integration complete:

1. **Deploy to tester.compsync.net**
2. **Test with real competition data**
3. **Test on both tenants (if applicable)**
4. **Capture evidence screenshots**
5. **Document any issues**
6. **Create bug list if needed**

---

## Estimated Timeline

| Task | Time | Cumulative |
|------|------|------------|
| Add imports | 5 min | 5 min |
| State machine | 30 min | 35 min |
| Trophy helper | 20 min | 55 min |
| Hotel warning | 15 min | 70 min |
| Day selector | 45 min | 115 min |
| Requests panel | 20 min | 135 min |
| Schedule blocks | 60 min | 195 min |
| Conflict modal | 15 min | 210 min |
| Age warnings | 20 min | 230 min |
| Display order | 30 min | 260 min |
| **Total** | **4 hours 20 min** | |

**With testing:** ~5-6 hours total

---

## Success Criteria

✅ All 9 components integrated
✅ Zero build errors
✅ All features working
✅ No console errors
✅ Responsive design functional
✅ Drag-drop preserved
✅ Production-ready code

---

**Status:** Ready to begin integration
**Next Session:** Start with Step 1 (imports)
**Documentation:** This file + SESSION_55_COMPLETE.md

---

*Integration Plan - Session 55*
*Ready for execution in Session 56*
