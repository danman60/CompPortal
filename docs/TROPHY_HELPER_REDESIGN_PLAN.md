# Trophy Helper UI - Redesign Plan

**Date:** November 24, 2025
**Status:** Planning Phase
**Previous Attempt:** Removed after 10+ failed fixes (commit ac7a8b0)

---

## What the Trophy Helper is Trying to Accomplish

### Core Purpose
Help Competition Directors identify **optimal award ceremony placement** by visually marking routines that are the last scheduled in their category.

### Business Logic (Already Implemented)
```typescript
// Category = Group Size + Age Group + Classification
// Example: "Solo • Teen (13-15) • Sapphire"

For each category:
  - Count total routines in category
  - Count scheduled routines in category
  - Calculate unscheduled = total - scheduled

  IF unscheduled <= 5:
    - Mark the LAST SCHEDULED routine as "award-ready"
    - This signals: "You can safely hold awards for this category now"
```

**Location:** `src/components/scheduling/ScheduleTable.tsx:271-305`
**Variable:** `lastRoutineIds: Set<string>`

### Why This Matters
1. **Award ceremonies happen in blocks** - Not after every single routine
2. **Categories complete at different times** - Some finish early in the day, others late
3. **Studios want timely awards** - Don't make them wait 6 hours for their trophy
4. **Scheduling constraint** - Need ~15-30 min award ceremony blocks between routine sessions

### The Visual Challenge
The CD needs to see at a glance:
- **Which routines are category-enders** → "🏆 This is the last Solo Teen Sapphire"
- **Where to insert award ceremonies** → "After this routine, hold awards for these 3 categories"
- **How many categories are ready** → "We have 8 categories ready for awards"

---

## Previous Implementation (Removed)

### What Was Tried
1. **Gold vertical bar** - Left edge of row (absolute positioned `<td>`)
2. **Yellow background** - Highlight entire row (`bg-yellow-500/10`)
3. **Trophy emoji** - Inline in routine title cell with tooltip
4. **Footer counter** - "🏆 8 awards" summary

### Why It Broke the Table
- **Absolute positioning in table cells** → Layout shift, overlapping content
- **Extra `<td>` elements** → Disrupts table column structure
- **Z-index conflicts** → Gold bars covering text, trophy emoji overlaying cells
- **Tooltip implementation** → Creating layout issues with portals/overflow

**Removed in commit:** `ac7a8b0`

---

## Design Constraints for New Implementation

### Must NOT:
- ❌ Use absolute positioning within table cells
- ❌ Add extra table columns or cells
- ❌ Shift cell content or break text truncation
- ❌ Interfere with drag-and-drop functionality
- ❌ Create z-index conflicts with session separators or conflict indicators

### Must DO:
- ✅ Work within existing table structure
- ✅ Maintain clean table layout at all viewport sizes
- ✅ Coexist with session backgrounds (purple/blue alternating)
- ✅ Not conflict with existing row highlighting (hover, drag states)
- ✅ Show which category is ending (Group Size + Age + Classification)

---

## Questions for New Design

### 1. Where should the indicator live?

**Option A: Inside table** (background color, border, badge in existing cell)
- Pros: Contextual, easy to see while scrolling
- Cons: Limited space, potential layout issues

**Option B: Outside table** (sidebar legend, floating panel)
- Pros: No layout conflicts, more space for info
- Cons: Eyes must move away from schedule

**Option C: Separate section** (Award ceremony planner below schedule)
- Pros: Dedicated space, can show additional context
- Cons: Not visible while working on schedule

### 2. How much information to show?

**Minimal:** Just "🏆" symbol
- Pros: Compact, no layout issues
- Cons: No context, must click/hover for details

**Medium:** "🏆 Last Solo Teen"
- Pros: Quick glance shows category
- Cons: May not fit in tight table cells

**Full:** "🏆 Last Solo • Teen (13-15) • Sapphire (5 unscheduled)"
- Pros: Complete context
- Cons: Too much text for table cell

### 3. What action does the CD take?

**Passive indicator:** Just awareness
- User manually adds award blocks where they see fit

**Active button:** Click to add award block
- Clicking the trophy opens "Add Award Block" modal pre-filled with categories

**Auto-suggest:** AI-powered award ceremony placement
- System suggests optimal placement based on trophy helpers + session breaks

### 4. Visual treatment options

**Background color gradient:**
```css
/* Subtle gold gradient in row background */
background: linear-gradient(90deg, rgba(251,191,36,0.1) 0%, transparent 100%);
```

**Left border (CSS only, no absolute positioning):**
```css
/* Use table cell's own border, not extra elements */
border-left: 4px solid #fbbf24;
```

**Icon in dedicated column:**
- Add one extra column for indicators only
- Fixed width, emoji/icon only, no text

**Text badge in existing cell:**
```jsx
<td>
  {routine.title}
  {isLast && <span className="ml-2 text-yellow-400">🏆</span>}
</td>
```

**Row-level CSS classes only:**
```css
/* Apply to <tr>, affects all cells uniformly */
.award-ready-row {
  background: rgba(251,191,36,0.05);
  border-left: 3px solid #fbbf24;
}
```

---

## Recommended Approach (Tentative)

### Phase 1: Minimal Viable Indicator
1. **Visual:** CSS-only left border (3-4px gold) on `<tr>` element
2. **Info:** Trophy emoji in routine title cell (inline, no positioning)
3. **Details:** HTML title attribute for hover tooltip (browser native, no portal needed)

```tsx
<tr className={isLastInOveralls ? 'border-l-4 border-l-yellow-400 bg-yellow-500/5' : ''}>
  <td>
    {routine.title}
    {isLastInOveralls && (
      <span
        className="ml-2 text-yellow-400 text-xs"
        title={`Last routine for ${routine.entrySizeName} • ${routine.ageGroupName} • ${routine.classificationName}`}
      >
        🏆
      </span>
    )}
  </td>
  {/* ...other cells */}
</tr>
```

**Pros:**
- No absolute positioning
- No extra DOM elements
- Works with drag-and-drop
- Browser handles tooltip

**Cons:**
- Limited tooltip styling
- May not be prominent enough

### Phase 2: Enhanced UI (If Phase 1 too subtle)
- Add floating "Award Planner" panel (outside table)
- Lists all award-ready categories with "Add Block" buttons
- Doesn't interfere with table layout

---

## Testing Checklist

Before considering the new implementation complete:

- [ ] Trophy indicator visible at all screen sizes (1920px, 1440px, 1024px, 768px)
- [ ] No layout shift or cell overflow
- [ ] Works with drag-and-drop (can still drag rows)
- [ ] Doesn't conflict with session backgrounds
- [ ] Doesn't conflict with conflict indicators (red bars)
- [ ] Tooltip shows correct category info
- [ ] Indicator updates when routines are scheduled/unscheduled
- [ ] No z-index issues with other elements
- [ ] Passes build and type check
- [ ] Works on both Chrome and Firefox

---

## Next Steps

1. **Get user feedback** on design direction (minimal vs enhanced)
2. **Prototype Phase 1** minimal approach
3. **Test on production URL** with Playwright
4. **Iterate** based on feedback
5. **Document final approach** in PATTERNS.md

---

## Technical Notes

**Business Logic Location:**
- `src/components/scheduling/ScheduleTable.tsx:271-305`
- `lastRoutineIds` calculation
- `isLastInOveralls` per-routine check

**Key Variables:**
```typescript
const lastRoutineIds: Set<string> = useMemo(() => {
  // Calculates which routines are last in category
  // Triggers when: unscheduled <= 5
}, [sortedRoutines, allRoutines]);

const isLastInOveralls = lastRoutineIds.has(routine.id);
```

**Integration Points:**
- Row rendering: `SortableRoutineRow` component
- Table structure: Fixed 8-column layout
- Existing indicators: Session backgrounds, conflict markers

---

**Created:** November 24, 2025
**Author:** Claude Code
**Status:** Ready for design decision
