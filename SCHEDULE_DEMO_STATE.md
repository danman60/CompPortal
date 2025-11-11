# Schedule Demo - Current State Documentation

**Created:** November 11, 2025
**Location:** `CompPortal/schedule-demo.html` + `G:/Shared drives/Stream Stage Company Wide/CompSyncEMPWR/schedule-mockups/`
**Purpose:** Interactive HTML mockup demonstrating Phase 2 scheduler functionality
**Status:** ✅ Feature-complete for demo purposes

---

## Overview

Interactive schedule demonstration showing AI-generated competition schedule with smart grouping strategy, collapsible categories, drag-and-drop functionality, and real-time recalculation.

---

## Core Features Implemented

### 1. Smart Category + Age Grouping ✅
**What it shows:**
- Routines grouped by category AND age division (e.g., "TAP AGE 7", "JAZZ AGE 8")
- Within each group: Solo → Duet → Small Group → Large Group progression
- Visual category dividers with routine counts

**Benefits demonstrated:**
- Minimizes costume changes (same age/category likely similar costumes)
- Maximizes audience flow (variety through category changes)
- Natural pacing (high energy → calmer → high energy)

**Example groups:**
```
📋 TAP AGE 7 (4 routines)
   - Solo → Duet → Small Group progression

📋 JAZZ AGE 8 (6 routines)
   - Solo → Duet → Small Group → Large Group

📋 CONTEMPORARY AGE 9 (6 routines)
   - Grouped for costume consistency & audience flow

📋 HIP HOP AGE 10 (5 routines)
   - High energy block - builds audience excitement

📋 BALLET AGE 11 (5 routines)
   - Slower tempo after high energy - provides contrast

📋 MUSICAL THEATER AGE 12 (5 routines)
   - Midday energy boost - theatrical performances engage audience
```

---

### 2. Sequential Entry Numbering ✅
**Implementation:**
- First column: "Entry #"
- Starts at: 100
- Auto-increments: 101, 102, 103...
- Dynamic renumbering: Updates automatically when routines are moved

**Behavior:**
- Individual routine drag → Renumbers all routines sequentially
- Category group drag → Renumbers all routines sequentially
- Always maintains sequential order from 100

**JavaScript function:**
```javascript
function renumberAllRoutines() {
    let entryNumber = 100;
    document.querySelectorAll('.schedule-table tbody tr[draggable="true"]:not(.category-group-divider)').forEach(row => {
        const numberCell = row.querySelector('.entry-number');
        if (numberCell && !row.classList.contains('row-break') && !row.classList.contains('row-awards')) {
            numberCell.textContent = entryNumber;
            entryNumber++;
        }
    });
}
```

---

### 3. Collapsible Category Groups ✅
**Interaction:**
- Click **▼** icon → Collapses category (hides all routines)
- Click **►** icon → Expands category (shows all routines)
- Icon rotates on toggle

**Visual feedback:**
```css
.collapse-icon.collapsed {
    transform: rotate(-90deg);
}
```

**All categories support collapse:**
- TAP AGE 7
- JAZZ AGE 8
- CONTEMPORARY AGE 9
- HIP HOP AGE 10
- BALLET AGE 11
- MUSICAL THEATER AGE 12

---

### 4. Drag Entire Category Groups ✅
**How it works:**
1. Grab any category header (shows move cursor)
2. Drag to new position between other categories
3. Drop → Entire group moves with all its routines
4. Auto-recalculation:
   - ⏰ Times recalculated for all routines
   - 🔢 Entry numbers renumbered sequentially
   - ⚠️ Conflict warning displays

**Data structure:**
```html
<!-- Category Header -->
<tr class="category-group-divider" draggable="true" data-group="jazz-age-8">
    <td colspan="7">
        <span class="collapse-icon">▼</span>
        📋 JAZZ AGE 8
        <span class="routine-count">(6 routines)</span>
    </td>
</tr>

<!-- Routines in this group -->
<tr class="row-solo category-routine" data-group="jazz-age-8">...</tr>
<tr class="row-solo category-routine" data-group="jazz-age-8">...</tr>
<!-- etc -->
```

**JavaScript logic:**
- Collects all routines with matching `data-group` attribute
- Moves header + all routines as a unit
- Maintains routine order within group
- Triggers time/number recalculation

---

### 5. Individual Routine Drag & Drop ✅
**Behavior:**
- Drag any individual routine row
- Drop at new position (even across category boundaries)
- Auto-recalculation:
   - ⏰ Times recalculated
   - 🔢 Entry numbers renumbered
   - ⚠️ Conflict warning displays

**Visual feedback:**
```css
.dragging {
    opacity: 0.5;
    background: #e9ecef;
}

.drag-over {
    background: #d3f9d8 !important;
    border-top: 3px solid #10b981;
}
```

---

### 6. Time Recalculation ✅
**Triggers:**
- Routine moved (individual or group)
- Auto-recalculates from first routine

**Logic:**
- Starts at first routine time (8:00 AM)
- Adds routine duration + 30sec transition
- Handles breaks (15min, 30min, 60min)
- Handles awards ceremonies (30min)
- Updates all visible time cells

**JavaScript:**
```javascript
function recalculateTimes(tbody) {
    let currentTime = 8.0; // 8:00 AM in decimal

    rows.forEach(row => {
        if (isRoutine) {
            const duration = parseInt(row.dataset.duration);
            timeCol.textContent = formatTime(currentTime);
            currentTime += (duration / 60) + (0.5 / 60); // routine + 30sec
        }
        else if (isBreak) {
            // Extract break duration from text
            currentTime += (breakDuration / 60);
        }
    });
}
```

---

### 7. One-Click Highlight Filters ✅
**Filter Categories:**

**🏢 Studio Filters:**
- Starlight Dance Academy
- Elite Performers
- Dance Dynamics
- Tiny Toes Studio
- Grace Motion Studio
- Urban Dance Crew

**🎂 Age Filters:**
- Age 7, 8, 9, 10, 11, 12

**🎭 Category Filters:**
- Tap
- Jazz
- Contemporary
- Hip Hop
- Ballet
- Musical Theater

**Behavior:**
- Click filter → Highlights all matching routines (gold glow + ⭐ icon)
- Click again → Clears highlights
- Only one filter active at a time
- "Clear" button removes all highlights

**Visual highlighting:**
```css
.schedule-table tbody tr.highlighted {
    background: rgba(251, 191, 36, 0.25) !important;
    box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.5);
}

.schedule-table tbody tr.highlighted::before {
    content: '⭐';
    position: absolute;
    left: -20px;
}
```

---

## Table Structure

### Columns (7 total):
1. **Entry #** (60px) - Sequential numbering starting at 100
2. **Time** (80px) - Performance time (auto-calculated)
3. **Routine Name** (200px) - Title of routine
4. **Studio** (150px) - Studio name
5. **Dancer(s)** (150px) - Performer names or "Group (N)"
6. **Category** (120px) - Badge showing category + age (e.g., "Jazz Age 8")
7. **Type** (80px) - Badge showing Solo/Duet/Small Group/Large Group/Production

### Row Types:
- **Category Group Divider** - Purple header with collapse icon, draggable
- **Routine Row** - White/colored border-left by type, draggable
- **Break Row** - Grey background, shows duration
- **Awards Row** - Gold background, shows ceremony info
- **Production Row** - Red border-left, typically opens/closes sessions

---

## Color Coding

### Row Border Colors (by type):
- **Solo:** Blue (`#3b82f6`)
- **Duet:** Green (`#10b981`)
- **Small Group:** Purple (`#8b5cf6`)
- **Large Group:** Orange (`#f59e0b`)
- **Production:** Red (`#ef4444`)
- **Break:** Grey (`#adb5bd`)
- **Awards:** Gold (`#ffc107`)

### Type Badges:
- **Solo:** Light blue background
- **Duet:** Light green background
- **Small Group:** Light purple background
- **Large Group:** Light orange background
- **Production:** Light red background

---

## Session Structure

### SESSION 1 - Morning (8:00 AM - 11:15 AM)
- **Routines:** 32
- **Awards:** 11:15 AM
- **Structure:**
  - Production opener (Broadway Dreams)
  - TAP AGE 7 block
  - JAZZ AGE 8 block
  - Break (15 min)
  - CONTEMPORARY AGE 9 block
  - HIP HOP AGE 10 block
  - BALLET AGE 11 block
  - Small studio block (Tiny Toes - Lyrical Age 8)
  - Production closer (A Night at the Movies)
  - Awards ceremony (30 min)
  - Break (30 min)

### SESSION 2 - Midday (11:15 AM - 1:30 PM)
- **Routines:** 28
- **Awards:** 1:00 PM
- **Structure:**
  - MUSICAL THEATER AGE 12 block
  - Break (15 min)
  - Additional categories (abbreviated for demo)
  - Lunch break (60 min)
  - Awards ceremony (30 min)

---

## Interactive Controls

### Top Bar:
- **Info text:** "Smart Grouping Strategy" explanation
- **↻ Regenerate button:** (Demo only - not functional)
- **💾 Save & Publish button:** (Demo only - not functional)

### Filter Bar:
- Studio filters (6 buttons)
- Age filters (6 buttons)
- Category filters (6 buttons)
- Clear button

### Conflict Warning:
- Yellow warning box (hidden by default)
- Auto-shows when routines moved
- Auto-hides after 5 seconds

---

## Technical Implementation

### Data Attributes:
```html
<tr draggable="true"
    data-id="6"
    data-duration="3"
    data-type="solo"
    data-group="jazz-age-8"
    class="row-solo category-routine">
```

**Attributes:**
- `data-id`: Unique routine ID
- `data-duration`: Duration in minutes (for time calc)
- `data-type`: solo/duet/small-group/large-group/production
- `data-group`: Category group identifier (for collapse/drag)
- `class`: Visual styling + functionality

### CSS Classes:
- `.category-group-divider`: Category header rows
- `.category-routine`: Routines belonging to a category group
- `.collapse-icon`: Collapsible arrow icon
- `.entry-number`: First column cell (entry #)
- `.time-col`: Second column cell (time)
- `.row-*`: Type-specific styling (row-solo, row-duet, etc.)
- `.highlighted`: Applied by filter buttons
- `.dragging`: Applied during drag operation
- `.drag-over`: Applied to drop target
- `.hidden`: Applied to collapsed routines

---

## JavaScript Functions

### Core Functions:
```javascript
// Initialization
initializeSchedule()               // Sets up entry numbers
renumberAllRoutines()              // Sequential numbering from 100
setupGroupDragHandlers()           // Attaches drag events to category headers

// Collapse/Expand
// Click handler on .collapse-icon
// Toggles .hidden class on category-routine rows

// Group Drag
// dragstart: Collect routines with matching data-group
// drop: Move header + all routines together
// dragend: Clean up classes

// Individual Routine Drag
// Standard HTML5 drag & drop
// Triggers recalculateTimes() and renumberAllRoutines()

// Time Recalculation
recalculateTimes(tbody)            // Updates all time cells
parseTime(timeStr)                 // "8:00 AM" → 8.0 decimal
formatTime(decimalTime)            // 8.5 → "8:30 AM"

// Highlight Filters
highlightRows(filterType, value)   // Adds .highlighted class
clearHighlights()                  // Removes all .highlighted classes

// Conflict Warning
showConflictWarning(message)       // Displays warning, auto-hides after 5sec
```

---

## Known Limitations (Demo Scope)

### Not Implemented (Intentionally):
1. **Backend integration** - No actual API calls
2. **Data persistence** - Changes don't save
3. **Regenerate button** - Not functional (demo button only)
4. **Save & Publish button** - Not functional (demo button only)
5. **Complex conflict detection** - Basic warning only
6. **Session boundaries** - Can drag across sessions (would validate in real app)
7. **Real-time collaboration** - Single user only
8. **Undo/Redo** - Not implemented

### Demo Data:
- Fixed sample routines (not pulled from database)
- Static studio names and dancer names
- Hardcoded durations (3-7 minutes)
- Manual category assignments

---

## File Details

**Main File:** `schedule-demo.html`
**Size:** ~1,340 lines
**Dependencies:** None (standalone HTML/CSS/JS)
**Browser Support:** Modern browsers (Chrome, Firefox, Safari, Edge)

**Sections:**
- Lines 1-400: CSS styles
- Lines 401-450: Filter bar + controls
- Lines 451-900: Session 1 routines
- Lines 901-1000: Session 2 routines
- Lines 1001-1340: JavaScript functionality

---

## Next Iteration Ideas

### Enhancements to Consider:
1. **Multi-day schedule** - Add day tabs
2. **Session create/edit UI** - Define session time windows
3. **Break/ceremony placement UI** - Drag-and-drop breaks
4. **Conflict detection panel** - Show specific conflicts with resolution suggestions
5. **Routine details panel** - Click routine → see full details
6. **Export preview** - Show what PDF/CSV/iCal would look like
7. **AI "Generate Draft" button** - Simulate LLM-powered auto-schedule
8. **Undo/Redo buttons** - Track change history
9. **Schedule statistics** - Show session duration, routine counts, conflicts
10. **Responsive mobile view** - Simplified interface for tablets/phones

---

## Testing Checklist

### Verified Working:
- ✅ Entry numbering starts at 100
- ✅ Entry numbers update on any move
- ✅ All 6 category groups collapse/expand
- ✅ All 6 category groups drag successfully
- ✅ Individual routines drag within/across categories
- ✅ Times recalculate correctly after moves
- ✅ Break times display correctly (with empty entry # cell)
- ✅ Awards times display correctly (with empty entry # cell)
- ✅ All 18 highlight filters work (6 studio + 6 age + 6 category)
- ✅ Clear button removes all highlights
- ✅ Conflict warning shows on move
- ✅ Page loads without errors

---

## Usage Instructions

### For Demo Purposes:
1. Open `schedule-demo.html` in any modern browser
2. Try collapsing categories (click ▼ icon)
3. Try dragging category headers to reorder
4. Try dragging individual routines
5. Use highlight filters to find specific routines
6. Watch entry numbers and times recalculate automatically

### For Development Reference:
- Review data structure for backend implementation
- Study drag-and-drop logic for real scheduler
- Use grouping strategy for auto-schedule algorithm
- Reference CSS for production UI design
- Adapt JavaScript functions for React/Vue components

---

**Status:** ✅ Demo complete and ready for user feedback
**Location:** Saved to shared drive for stakeholder review
**Next Steps:** Gather feedback, refine based on CD input, plan production implementation
