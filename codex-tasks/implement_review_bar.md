# Task: Implement Live Review Bar

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 2 hours
**Status**: Ready for Codex

---

## Context

Add a persistent horizontal bar at the bottom of the routine creation screen that shows Category, Classification, Age Group, and Dancers in real-time as the user fills out the form.

**Visual**: Sticky bottom bar that updates live as form fields change.

---

## Component to Create

**File**: `src/components/RoutineReviewBar.tsx`

---

## Component Specification

### Props Interface
```typescript
interface RoutineReviewBarProps {
  category?: string;
  classification?: string;
  ageGroup?: string;
  dancers?: Array<{ id: string; first_name: string; last_name: string }>;
  isVisible?: boolean;
}
```

### Visual Design

**Layout**: Horizontal bar fixed to bottom of viewport

**Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🎭 Category: Ballet | 👯 Classification: Small Group        │
│ 👶 Age Group: Junior (8-11) | 💃 Dancers: 6 assigned        │
└─────────────────────────────────────────────────────────────┘
```

### Component Code

```tsx
'use client';

import { useState, useEffect } from 'react';

interface RoutineReviewBarProps {
  category?: string;
  classification?: string;
  ageGroup?: string;
  dancers?: Array<{ id: string; first_name: string; last_name: string }>;
  isVisible?: boolean;
}

export default function RoutineReviewBar({
  category,
  classification,
  ageGroup,
  dancers = [],
  isVisible = true
}: RoutineReviewBarProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible) return null;

  const hasContent = category || classification || ageGroup || dancers.length > 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
        isMinimized ? 'translate-y-[calc(100%-3rem)]' : 'translate-y-0'
      }`}
    >
      {/* Minimize/Expand Button */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="absolute -top-10 right-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-t-lg border border-white/20 border-b-0 text-white hover:bg-white/20 transition-colors"
      >
        {isMinimized ? '▲ Show Review' : '▼ Hide Review'}
      </button>

      {/* Review Bar */}
      <div className="bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-blue-900/95 backdrop-blur-xl border-t-2 border-white/20 shadow-2xl">
        <div className="container mx-auto px-6 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              ✨ Live Review
            </h3>
            {hasContent && (
              <span className="text-green-400 text-sm">● Updating live</span>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Category</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">🎭</span>
                {category || <span className="text-gray-500">Not selected</span>}
              </div>
            </div>

            {/* Classification */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Classification</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">👯</span>
                {classification || <span className="text-gray-500">Not selected</span>}
              </div>
            </div>

            {/* Age Group */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Age Group</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">👶</span>
                {ageGroup || <span className="text-gray-500">Will auto-calculate</span>}
              </div>
            </div>

            {/* Dancers */}
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-gray-400 text-xs mb-1">Dancers</div>
              <div className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">💃</span>
                {dancers.length > 0 ? (
                  <span>{dancers.length} assigned</span>
                ) : (
                  <span className="text-gray-500">None assigned yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Dancer List (if assigned) */}
          {dancers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="text-gray-400 text-xs mb-2">Assigned Dancers:</div>
              <div className="flex flex-wrap gap-2">
                {dancers.map((dancer) => (
                  <span
                    key={dancer.id}
                    className="bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-sm border border-purple-400/30"
                  >
                    {dancer.first_name} {dancer.last_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Integration Points

### In Routine Creation Form

**File**: `src/app/dashboard/entries/create/page.tsx` (or EntryForm component)

**Import**:
```typescript
import RoutineReviewBar from '@/components/RoutineReviewBar';
```

**Add state tracking**:
```typescript
const [reviewData, setReviewData] = useState({
  category: '',
  classification: '',
  ageGroup: '',
  dancers: []
});
```

**Update state on field changes**:
```typescript
<select
  name="dance_category"
  onChange={(e) => setReviewData(prev => ({ ...prev, category: e.target.value }))}
>
```

**Render bar**:
```tsx
<RoutineReviewBar
  category={reviewData.category}
  classification={reviewData.classification}
  ageGroup={reviewData.ageGroup}
  dancers={reviewData.dancers}
/>
```

### In Dancer Assignment Page

**File**: `src/app/dashboard/entries/[id]/assign/page.tsx` (or similar)

**Same integration pattern**, but pull initial data from entry:
```typescript
const [reviewData, setReviewData] = useState({
  category: entry?.dance_category,
  classification: entry?.classification,
  ageGroup: entry?.age_group,
  dancers: assignedDancers
});
```

---

## Mobile Responsiveness

- Bar stacks vertically on mobile (grid-cols-1)
- Minimize button always visible
- Fixed positioning works on iOS Safari
- Touch-friendly minimize button

---

## Quality Gates

1. ✅ **Sticky positioning**: Bar stays at bottom during scroll
2. ✅ **Live updates**: Changes immediately when form fields change
3. ✅ **Minimize/expand works**: Button toggles visibility
4. ✅ **Mobile responsive**: Stacks properly on small screens
5. ✅ **Glassmorphic styling**: Matches design system
6. ✅ **TypeScript compiles**: No errors
7. ✅ **z-index correct**: Doesn't overlap critical UI elements

---

## Deliverables

Output file: `codex-tasks/outputs/implement_review_bar_result.md`

Include:
1. Component code created
2. Integration points (files modified)
3. Screenshot description (what you see)
4. Mobile behavior tested
5. Build output

---

**Start Time**: [Record]
**Expected Duration**: 2 hours
