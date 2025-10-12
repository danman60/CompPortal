# Task: Draggable Dashboard Button Reordering

**Priority**: MEDIUM (Dashboard Enhancements)
**Estimate**: 1-2 hours
**Status**: Ready for Codex

---

## Context

Dashboard card reordering already exists using `SortableDashboardCards.tsx`. Verify it works and enhance if needed.

**Reference**: `src/components/SortableDashboardCards.tsx` - Already implemented with dnd-kit

---

## Verification Steps

### 1. Check Existing Implementation

**File**: `src/components/SortableDashboardCards.tsx`

**What to verify**:
- Uses `@dnd-kit/core` and `@dnd-kit/sortable`
- Has TouchSensor for mobile support (commit 119514b added this)
- Saves order to localStorage
- Restores order on page load

**Expected code**:
```typescript
import { DndContext, closestCenter, TouchSensor, MouseSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';

// TouchSensor with delay for mobile
const sensors = useSensors(
  useSensor(MouseSensor),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5
    }
  })
);
```

---

## Enhancement Tasks

### Task 1: Add Visual Feedback

**Enhance dragging experience**:

```tsx
// In SortableCard component
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: card.id
});

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1, // ADD THIS
  cursor: isDragging ? 'grabbing' : 'grab', // ADD THIS
};
```

### Task 2: Add Reset Button

**Allow users to reset to default order**:

```tsx
const DEFAULT_ORDER = [
  'dancers',
  'routines',
  'reservations',
  'results',
  'invoices',
  'music'
];

function resetOrder() {
  setCards(originalCards.sort((a, b) =>
    DEFAULT_ORDER.indexOf(a.id) - DEFAULT_ORDER.indexOf(b.id)
  ));
  localStorage.removeItem('dashboardCardOrder'); // Clear saved order
  toast.success('Dashboard order reset to default');
}

// Add button near dashboard header
<button
  onClick={resetOrder}
  className="text-sm text-gray-400 hover:text-white transition-colors"
>
  ↺ Reset Order
</button>
```

### Task 3: Add Drag Handle

**Make it clearer what's draggable**:

```tsx
<div
  ref={setNodeRef}
  style={style}
  {...attributes}
  className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 hover:border-white/30 transition-all duration-200 relative"
>
  {/* Drag Handle */}
  <div
    {...listeners} // Only handle is draggable
    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing"
    title="Drag to reorder"
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  </div>

  {/* Card content */}
  <Link href={card.href}>
    <div className="text-4xl mb-3">{card.icon}</div>
    <h3 className="text-xl font-semibold text-white mb-2">{card.title}</h3>
    <p className="text-gray-400 text-sm">{card.description}</p>
  </Link>
</div>
```

### Task 4: Add Instruction Tooltip (First Visit)

**Show help on first visit**:

```tsx
const [showHelp, setShowHelp] = useState(() => {
  // Check if user has seen help before
  return !localStorage.getItem('dashboardHelpSeen');
});

useEffect(() => {
  if (showHelp) {
    const timer = setTimeout(() => {
      setShowHelp(false);
      localStorage.setItem('dashboardHelpSeen', 'true');
    }, 5000); // Hide after 5 seconds

    return () => clearTimeout(timer);
  }
}, [showHelp]);

// Display tooltip
{showHelp && (
  <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-4 mb-6 animate-fade-in">
    <div className="flex items-start gap-3">
      <span className="text-2xl">💡</span>
      <div>
        <p className="text-purple-200 font-medium">Tip: Customize Your Dashboard</p>
        <p className="text-purple-300/70 text-sm mt-1">
          Drag and drop the cards below to rearrange them in your preferred order.
          Your layout will be saved automatically.
        </p>
        <button
          onClick={() => {
            setShowHelp(false);
            localStorage.setItem('dashboardHelpSeen', 'true');
          }}
          className="text-purple-400 text-sm mt-2 hover:underline"
        >
          Got it, don't show again
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Testing Checklist

1. **Desktop Drag & Drop**:
   - Click and drag cards → Reorders correctly
   - Release → New order saved
   - Refresh page → Order persists

2. **Mobile Drag & Drop**:
   - Touch and hold (200ms) → Card lifts
   - Drag → Other cards shift
   - Release → Order saved

3. **Reset Button**:
   - Click reset → Returns to default order
   - localStorage cleared
   - Refresh → Default order shown

4. **Visual Feedback**:
   - Dragging card shows opacity change
   - Cursor changes (grab → grabbing)
   - Drag handle visible

5. **Performance**:
   - Smooth animations
   - No lag on drag
   - Works with 6+ cards

---

## Quality Gates

1. ✅ **Drag & drop works on desktop**: Mouse sensor active
2. ✅ **Drag & drop works on mobile**: TouchSensor with delay
3. ✅ **Order persists**: localStorage saves/loads
4. ✅ **Reset button works**: Returns to default
5. ✅ **Visual feedback clear**: Opacity, cursor, drag handle
6. ✅ **First-visit help shown**: Tooltip appears once
7. ✅ **TypeScript compiles**: No errors

---

## Files to Modify

1. `src/components/SortableDashboardCards.tsx` - Main component
2. `src/components/StudioDirectorDashboard.tsx` - Add reset button
3. `src/components/CompetitionDirectorDashboard.tsx` - Add reset button (if using)

---

## Deliverables

Output file: `codex-tasks/outputs/draggable_dashboard_reorder_result.md`

Include:
1. Verification of existing implementation
2. Enhancements added
3. Test results (desktop + mobile)
4. Reset button location
5. Build output

---

**Start Time**: [Record]
**Expected Duration**: 1-2 hours
