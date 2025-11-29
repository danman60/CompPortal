# BLOCKER: Trophy Helper Icon Breaks Schedule Table Layout

**Status:** ACTIVE
**Priority:** HIGH
**Reported:** Session continuation (user reports 5+ failed fix attempts)
**Build:** 04ac78b

## Problem Description

The trophy helper icon (🏆) appears in the schedule table when a routine is identified as the last routine in a category. When this icon appears, **the entire table layout collapses**, compressing all columns.

### User Report
> "After a certain amount of routines are scheduled the trophy helper kicks in to determine what awards are next eligible to give out. Its a trophy icon with a tooltip. Once it shows up in the table the whole table breaks."

> "This is now a persistent bug; i need you to develop a plan to work semi autonomously for the next 8 hours until this is confirmed resolved"

> "also for context; you've attempted to fix this at least 5 times already"

## Root Cause Analysis

### Location
**File:** `CompPortal-tester/src/components/scheduling/ScheduleTable.tsx`
**Lines:** 168-181

### Current Implementation
```tsx
{/* Routine Title - 100px */}
<td className="px-1 py-1 text-xs font-medium text-white" style={{ width: '100px' }}>
  <div className="flex items-center gap-1 truncate-cell">
    <span className="truncate" title={routine.title}>{routine.title}</span>
    {isLastInOveralls && (
      <span
        className="text-yellow-400 text-sm cursor-help flex-shrink-0"
        title={`Last routine for ${routine.entrySizeName} • ${routine.ageGroupName} • ${routine.classificationName}`}
      >
        🏆
      </span>
    )}
  </div>
</td>
```

### The Problem
1. **Fixed-width cell:** Routine Title column is only 100px wide
2. **Inline flex layout:** Trophy added inside flex container with routine title
3. **Page grid layout:** Parent uses `grid grid-cols-3` (page.tsx:448)
4. **Tooltip trigger:** The `title` attribute on hover triggers layout recalculation
5. **Grid collapse:** Browser recalculates grid, compressing all columns

### Why Previous Fixes Failed
Previous attempts (5+) likely tried:
- ❌ Adding `flex-shrink-0` to trophy (already present)
- ❌ Adjusting column widths
- ❌ Adding overflow handling
- ❌ CSS-only fixes (don't address root cause)

**The fundamental issue:** The trophy is IN the document flow, affecting table layout calculations.

## Definitive Solution

### Strategy
**Remove trophy from document flow** using absolute positioning and React Portal for tooltip.

### Implementation Plan

#### 1. Absolute Position Trophy Icon
```tsx
{/* Routine Title Cell - Keep simple */}
<td className="px-1 py-1 text-xs font-medium text-white relative" style={{ width: '100px' }}>
  <div className="truncate-cell">
    <span className="truncate" title={routine.title}>{routine.title}</span>
  </div>

  {/* Trophy positioned absolute, OUTSIDE flow */}
  {isLastInOveralls && (
    <div
      className="absolute right-1 top-1/2 -translate-y-1/2 z-10 pointer-events-auto"
      data-trophy-id={routine.id}
    >
      <span className="text-yellow-400 text-sm cursor-help">
        🏆
      </span>
    </div>
  )}
</td>
```

#### 2. Create Tooltip Component with React Portal
Create `TrophyTooltip.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface TrophyTooltipProps {
  routineId: string;
  entrySizeName: string;
  ageGroupName: string;
  classificationName: string;
}

export function TrophyTooltip({ routineId, entrySizeName, ageGroupName, classificationName }: TrophyTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom + 5 });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <span
        className="text-yellow-400 text-sm cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        🏆
      </span>
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed bg-gray-900/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-yellow-400/50 z-[9999] pointer-events-none"
          style={{ left: position.x, top: position.y }}
        >
          Last routine for {entrySizeName} • {ageGroupName} • {classificationName}
        </div>,
        document.body
      )}
    </>
  );
}
```

#### 3. Update ScheduleTable.tsx
Replace inline trophy with:
```tsx
import { TrophyTooltip } from './TrophyTooltip';

// In table cell:
{isLastInOveralls && (
  <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
    <TrophyTooltip
      routineId={routine.id}
      entrySizeName={routine.entrySizeName}
      ageGroupName={routine.ageGroupName}
      classificationName={routine.classificationName}
    />
  </div>
)}
```

### Why This Will Work
1. **Absolute positioning:** Trophy not in document flow, can't affect table layout
2. **React Portal:** Tooltip renders to `document.body`, completely isolated from grid
3. **No layout triggers:** No `title` attribute, no flex container interactions
4. **Guaranteed isolation:** Trophy physically cannot affect parent grid

## Testing Checklist
- [ ] Build passes
- [ ] Trophy icon appears correctly
- [ ] Tooltip shows on hover
- [ ] Table layout remains intact with trophy visible
- [ ] Grid columns maintain correct widths
- [ ] No layout shift on trophy appearance
- [ ] Tooltip doesn't break layout
- [ ] Works on both EMPWR and Glow tenants

## Success Criteria
- Trophy icon visible on last routines
- Tooltip displays correct category information
- **CRITICAL:** Table layout NEVER compresses, regardless of trophy presence
- No grid-cols-3 collapse
- All columns maintain fixed widths

## Rollback Plan
If fix fails:
1. Hide trophy entirely: `{false && isLastInOveralls && ...}`
2. Deploy immediately
3. Investigate alternative approach

## Timeline
- **Discovery:** 30 min (completed)
- **Documentation:** 15 min (completed)
- **Implementation:** 45 min
- **Testing:** 30 min
- **Deployment & Verification:** 20 min
- **Total:** ~2.5 hours

## Files to Modify
1. `src/components/scheduling/ScheduleTable.tsx` - Update trophy rendering
2. `src/components/scheduling/TrophyTooltip.tsx` - NEW file for isolated tooltip
3. Build, test, deploy

---

**Next Step:** Implement TrophyTooltip component and update ScheduleTable.tsx
