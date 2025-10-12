# Task: Add Tooltips Above Dashboard Cards

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 30 minutes
**Status**: Ready for Codex

---

## Context

Replace the "Getting Started" section on Studio Director dashboard with tooltips positioned above each dashboard card.

**Current**: "Getting Started" numbered list at bottom of dashboard
**New**: Tooltips above each card explaining what it does

---

## Files to Modify

**Primary File**: `src/components/StudioDirectorDashboard.tsx`

---

## Implementation

### Step 1: Remove "Getting Started" Section

**Find and remove** (lines ~130-154):
```tsx
{/* Recent Activity */}
<div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
  <h2 className="text-2xl font-bold text-white mb-4">💡 Getting Started</h2>
  <div className="space-y-3 text-gray-300">
    <div className="flex items-start gap-3">
      <span className="text-purple-400 font-bold">1.</span>
      <p>Reserve your routines in <Link href="/dashboard/reservations">...</Link></p>
    </div>
    {/* ... rest of steps ... */}
  </div>
</div>
```

### Step 2: Add Tooltip Component

**Create**: `src/components/Tooltip.tsx`

```tsx
'use client';

import { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({
  text,
  children,
  position = 'top'
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl border border-white/20 whitespace-nowrap">
            {text}
            {/* Arrow */}
            <div className={`absolute ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`}>
              <div className="w-0 h-0 border-4 border-transparent border-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 3: Update Dashboard Cards with Tooltips

**In StudioDirectorDashboard.tsx**, update the cards data:

```typescript
import Tooltip from './Tooltip';

const STUDIO_DIRECTOR_CARDS: DashboardCard[] = [
  {
    id: 'dancers',
    href: '/dashboard/dancers',
    icon: '💃',
    title: 'My Dancers',
    description: 'Register and manage dancers',
    tooltip: 'Add or import your dancers' // Add this
  },
  {
    id: 'routines',
    href: '/dashboard/entries',
    icon: '🎭',
    title: 'My Routines',
    description: 'Create and edit routines',
    tooltip: 'Create your routines' // Add this
  },
  {
    id: 'reservations',
    href: '/dashboard/reservations',
    icon: '📋',
    title: 'My Reservations',
    description: 'Reserve routines for events',
    tooltip: 'Reserve routine slots' // Add this
  },
  {
    id: 'results',
    href: '/dashboard/scoreboard',
    icon: '🏆',
    title: 'Results',
    description: 'View competition scores',
    tooltip: 'Check your scores and rankings'
  },
  {
    id: 'invoices',
    href: '/dashboard/invoices',
    icon: '💰',
    title: 'My Invoices',
    description: 'View studio billing',
    tooltip: 'View and pay invoices'
  },
  {
    id: 'music',
    href: '/dashboard/music',
    icon: '🎵',
    title: 'Music Tracking',
    description: 'Monitor music file uploads',
    tooltip: 'Upload routine music files'
  },
];
```

### Step 4: Update SortableDashboardCards Component

**File**: `src/components/SortableDashboardCards.tsx`

**Update interface**:
```typescript
export interface DashboardCard {
  id: string;
  href: string;
  icon: string;
  title: string;
  description: string;
  tooltip?: string; // Add this
}
```

**Wrap each card with Tooltip**:
```tsx
import Tooltip from './Tooltip';

// In the map function
{cards.map((card) => (
  <Tooltip key={card.id} text={card.tooltip || ''} position="top">
    <Link
      href={card.href}
      className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 hover:border-white/30 transition-all duration-200 hover:scale-105 cursor-move"
    >
      <div className="text-4xl mb-3">{card.icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{card.title}</h3>
      <p className="text-gray-400 text-sm">{card.description}</p>
    </Link>
  </Tooltip>
))}
```

---

## Tooltip Text Mapping

**Studio Director Cards**:
- Dancers: "Add or import your dancers"
- Routines: "Create your routines"
- Reservations: "Reserve routine slots"
- Results: "Check your scores and rankings"
- Invoices: "View and pay invoices"
- Music: "Upload routine music files"

**Competition Director Cards** (optional):
- Events: "Manage competitions and reservations"
- Studios: "Approve and manage studios"
- Judges: "Assign judges to panels"
- Scoring: "Live scoring interface"
- Invoices: "Generate and send invoices"

---

## Alternative: Simple Text Above Cards

**If tooltip component is too complex**, use simple text:

```tsx
<div className="space-y-8">
  {/* Stats */}
  <StudioDirectorStats />

  {/* Section Header with Subtitle */}
  <div>
    <h2 className="text-2xl font-bold text-white mb-2">Quick Actions</h2>
    <p className="text-gray-400 text-sm mb-6">
      Get started by adding dancers, reserving slots, and creating routines
    </p>
  </div>

  {/* Cards */}
  <SortableDashboardCards cards={STUDIO_DIRECTOR_CARDS} />
</div>
```

---

## Design Requirements

### Tooltip Styling
```css
Background: bg-gray-900
Border: border-white/20
Text: text-white text-sm
Shadow: shadow-xl
Arrow: Pointing to card
Animation: Fade in/out on hover
```

### Positioning
- Appears on hover
- Positioned above card (top)
- Centered horizontally
- z-index: 50 (above other elements)

### Mobile Behavior
- Show on touch/tap (not just hover)
- Auto-hide after 3 seconds
- Don't block card click

---

## Quality Gates

1. ✅ **"Getting Started" section removed**: No numbered list
2. ✅ **Tooltips appear on hover**: All cards have tooltips
3. ✅ **Text is helpful**: Tooltips guide user actions
4. ✅ **Mobile friendly**: Works on touch devices
5. ✅ **TypeScript compiles**: No errors
6. ✅ **Doesn't break layout**: Cards still clickable

---

## Deliverables

Output file: `codex-tasks/outputs/add_dashboard_tooltips_result.md`

Include:
1. Files modified
2. Tooltip component created (or alternative approach)
3. Cards updated with tooltip text
4. "Getting Started" section removed
5. Build output

---

**Start Time**: [Record]
**Expected Duration**: 30 minutes
