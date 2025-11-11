# Schedule Settings Mockups - Current State Documentation

**Created:** November 11, 2025
**Location:** `CompPortal/schedule-config-*.html` + `G:/Shared drives/Stream Stage Company Wide/CompSyncEMPWR/schedule-mockups/`
**Purpose:** UI mockups for Phase 2 scheduler configuration settings
**Status:** ✅ Multiple iterations saved for comparison

---

## Overview

Collection of HTML mockups showing different approaches to the scheduler configuration interface. These define the settings Competition Directors will use to configure automatic schedule generation.

---

## Mockup Files

### 1. `schedule-config-mockup.html`
**First iteration** - Basic configuration interface
**Size:** ~27 KB
**Focus:** Initial layout and setting categories

### 2. `schedule-config-mockup-v2.html`
**Second iteration** - Refined UI with better grouping
**Size:** ~26 KB
**Focus:** Improved visual hierarchy and organization

### 3. `schedule-config-mockup-compact.html`
**Compact version** - Space-efficient layout
**Size:** ~30 KB
**Focus:** Fitting more settings on screen without scrolling

### 4. `schedule-config-mockup-final.html`
**Final iteration** - Polished, production-ready design
**Size:** ~26 KB
**Focus:** Clean, professional interface with optimal UX

---

## Configuration Categories

### 1. **Basic Schedule Settings**
Settings that define the overall schedule structure:

**Day Configuration:**
- Start date and end date
- Number of competition days
- Daily start time (e.g., 8:00 AM)
- Daily end time (e.g., 10:00 PM)

**Session Configuration:**
- Auto-create sessions (Yes/No toggle)
- Session duration target (e.g., 3-4 hours)
- OR Manual session definition

---

### 2. **Routine Timing Rules**
Settings for routine duration and spacing:

**Duration Settings:**
- Solo duration: 3 minutes (default)
- Duet duration: 3 minutes (default)
- Small group duration: 4 minutes (default)
- Large group duration: 5 minutes (default)
- Production duration: 7 minutes (default)

**Spacing Rules:**
- Transition time between routines: 30 seconds (default)
- Same dancer spacing: 3-5 routines minimum
- Costume change buffer: 30 minutes (if different costume)

---

### 3. **Age-Appropriate Timing**
When specific age divisions should be scheduled:

**Morning (Before 11:00 AM):**
- Mini (Age 5-6)
- Petite (Age 7-8)

**Midday (11:00 AM - 2:00 PM):**
- Junior (Age 9-11)
- Large groups (all ages)
- Productions (all ages)

**Afternoon/Evening (After 2:00 PM):**
- Teen (Age 12-14)
- Senior (Age 15+)

**Toggle:** Enforce strict age timing (Yes/No)

---

### 4. **Category Grouping Rules**
How routines should be organized:

**Grouping Strategy:**
- ☑ Group by Category + Age (RECOMMENDED - shown in demo)
- ☐ Group by Studio
- ☐ Group by Level (Novice, Intermediate, Advanced)
- ☐ Random distribution

**Within-Group Ordering:**
- ☑ Size progression (Solo → Duet → Small → Large)
- ☐ Level progression (Novice → Intermediate → Advanced)
- ☐ Random order within group

**Category Variety:**
- Avoid clustering same category: Yes/No
- Maximum consecutive same category: 5 routines (default)

---

### 5. **Break and Ceremony Placement**
When to insert breaks and awards:

**Break Configuration:**
- Short break duration: 15 minutes (default)
- Short break frequency: Every 90 minutes (default)
- Lunch break duration: 60 minutes (default)
- Lunch break time: 12:00 PM - 1:00 PM (default)

**Awards Ceremonies:**
- Frequency: Every 50 routines OR After each session
- Duration: 30 minutes (default)
- Placement: End of session (default) OR Mid-session

---

### 6. **Conflict Detection Settings**
What constitutes a conflict:

**Hard Conflicts (Block Save):**
- ☑ Same dancer back-to-back routines
- ☑ Schedule exceeds daily end time
- ☑ Required break/ceremony missing

**Soft Conflicts (Show Warning):**
- ☑ Same dancer spacing < 3 routines
- ☑ Costume change buffer < 30 minutes
- ☑ Age division outside preferred time
- ☑ Too many consecutive same category

**Warning Threshold:**
- Show warning if soft conflicts > 5

---

### 7. **Studio Preferences**
Handle studio-specific requests:

**Studio Grouping:**
- Keep studio routines together: Yes/No
- Maximum studio cluster size: 10 routines (if enabled)

**Preferred Time Slots:**
- Allow studios to request time preferences: Yes/No
- Priority for preferred slots: High/Medium/Low

**Travel Accommodation:**
- Flag studios requiring travel time: Yes/No
- Minimum notice before first routine: 2 hours (if flagged)

---

### 8. **Advanced Options**
Additional fine-tuning:

**Numbering:**
- Entry number start: 100 (default)
- Number increment: 1 (default)
- Numbering scheme: Sequential OR By session (100s, 200s, etc.)

**Optimization Goals:**
- Primary: Minimize conflicts (default)
- Secondary: Maximize audience engagement
- Tertiary: Balance session durations

**AI-Powered Generation:**
- Enable AI draft generation: Yes/No
- AI provider: DeepSeek (default)
- Regenerate attempts if conflicts > threshold: 3 (default)

---

## UI Components (All Mockups)

### Common Elements:

**Header:**
- Page title: "Schedule Configuration"
- Breadcrumb: Dashboard → Schedule Settings
- Save button (top right, prominent)

**Navigation:**
- Left sidebar with setting categories OR
- Top tabs for quick category switching

**Setting Rows:**
- Label (left)
- Input/Toggle/Dropdown (right)
- Help text (below, muted color)
- Some settings show examples or defaults

**Visual Grouping:**
- Card-based layout
- White background on dark purple gradient
- Section headers with icons
- Dividers between categories

**Interactive Elements:**
- Toggle switches (on/off)
- Number inputs with +/- buttons
- Time pickers
- Dropdown selects
- Radio button groups
- Checkboxes for multi-select

---

## Differences Between Iterations

### `schedule-config-mockup.html` (v1):
**Characteristics:**
- More spacing between elements
- Larger fonts
- Basic card layout
- Settings in single column

**Pros:**
- Easy to read
- Clean, uncluttered

**Cons:**
- Requires scrolling
- Takes up more vertical space

---

### `schedule-config-mockup-v2.html`:
**Characteristics:**
- Refined visual hierarchy
- Better grouping with section cards
- Improved typography
- Icons added to section headers

**Pros:**
- More professional appearance
- Clearer organization
- Visual consistency

**Cons:**
- Still single column
- Medium vertical space usage

---

### `schedule-config-mockup-compact.html`:
**Characteristics:**
- Tighter spacing
- Two-column layout where possible
- Collapsible sections
- Smaller fonts

**Pros:**
- Fits more on screen
- Less scrolling required
- Efficient use of space

**Cons:**
- Slightly harder to scan
- May feel cramped on small screens

---

### `schedule-config-mockup-final.html`:
**Characteristics:**
- Balanced spacing
- Strategic use of color
- Prominent CTAs (Save, Generate Draft buttons)
- Tooltip support indicators
- Optimal mobile responsiveness

**Pros:**
- Best overall UX
- Professional polish
- Production-ready design
- Clear visual priority

**Cons:**
- None significant (recommended version)

---

## Recommended Approach

### For Production Implementation:
**Use:** `schedule-config-mockup-final.html` as base

**Enhancements to add:**
1. **Real-time validation** - Show errors immediately
2. **Smart defaults** - Pre-populate based on competition type
3. **Templates** - Save/load configuration templates
4. **Preview** - "See sample schedule" based on current settings
5. **Tooltips** - Help text on hover for complex settings
6. **Reset button** - Return to defaults
7. **Dependency handling** - Disable/enable related settings based on toggles

---

## Integration with Schedule Demo

The settings configured here would control:

1. **Category Grouping** → Determines how routines are organized in schedule-demo.html
2. **Age-Appropriate Timing** → Controls which routines appear in morning/afternoon/evening
3. **Break Placement** → Defines where breaks appear between routines
4. **Numbering Scheme** → Sets entry number start (100) and increment
5. **Conflict Detection** → Defines what warnings appear when dragging routines
6. **AI Generation** → If enabled, auto-generates initial schedule shown in demo

---

## Workflow Example

1. **CD opens Settings page** (this mockup)
2. **CD configures preferences:**
   - Enable "Group by Category + Age"
   - Set Mini/Petite before 11am
   - Enable 15min breaks every 90min
   - Awards every 50 routines
   - Entry numbers start at 100
3. **CD clicks "Generate Draft Schedule with AI"**
4. **System generates schedule** → Opens schedule-demo.html view
5. **CD reviews/adjusts** using drag-and-drop
6. **CD finalizes** → Locks entry numbers

---

## Data Structure (Backend)

### Settings Table Schema:
```typescript
interface ScheduleConfiguration {
  competition_id: string;

  // Basic settings
  start_date: Date;
  end_date: Date;
  daily_start_time: string;  // "08:00"
  daily_end_time: string;    // "22:00"
  auto_create_sessions: boolean;
  session_duration_target: number; // minutes

  // Routine timing
  durations: {
    solo: number;
    duet: number;
    small_group: number;
    large_group: number;
    production: number;
  };
  transition_time: number;
  same_dancer_spacing: number;
  costume_change_buffer: number;

  // Age timing rules
  age_timing_rules: {
    morning_before: string;  // "11:00"
    morning_ages: string[];  // ["mini", "petite"]
    afternoon_after: string; // "14:00"
    afternoon_ages: string[]; // ["teen", "senior"]
  };
  enforce_age_timing: boolean;

  // Grouping
  grouping_strategy: "category_age" | "studio" | "level" | "random";
  within_group_ordering: "size" | "level" | "random";
  avoid_category_clustering: boolean;
  max_consecutive_same_category: number;

  // Breaks and ceremonies
  short_break_duration: number;
  short_break_frequency: number;
  lunch_break_duration: number;
  lunch_break_time: string;
  awards_frequency: "per_n_routines" | "per_session";
  awards_frequency_value: number; // e.g., 50
  awards_duration: number;
  awards_placement: "end_session" | "mid_session";

  // Conflicts
  hard_conflicts: string[];
  soft_conflicts: string[];
  warning_threshold: number;

  // Studio preferences
  keep_studio_together: boolean;
  max_studio_cluster: number;
  allow_time_preferences: boolean;

  // Advanced
  entry_number_start: number;
  entry_number_scheme: "sequential" | "by_session";
  enable_ai_generation: boolean;
  ai_provider: string;

  // Metadata
  created_at: Date;
  updated_at: Date;
}
```

---

## Next Steps for Settings

### Before Production:
1. **User testing** - Have CDs interact with mockup, gather feedback
2. **Prioritize settings** - Not all settings needed for MVP
3. **Define defaults** - What values should be pre-selected
4. **Validation rules** - What combinations are invalid
5. **Backend API** - Create endpoints to save/load configuration
6. **Database migration** - Add schedule_configurations table
7. **React components** - Build actual form with real data

### MVP Settings (Phase 2A):
- Basic schedule settings (dates, times)
- Routine timing rules (durations, spacing)
- Age-appropriate timing (at least Mini before 11am)
- Break placement (short breaks + lunch)
- Awards frequency
- Entry numbering

### Future Settings (Phase 2B+):
- Advanced conflict detection
- Studio preferences system
- AI generation toggle
- Custom templates
- Multi-day schedule support

---

## File Details

**Files:** 4 HTML mockups
**Total Size:** ~109 KB
**Dependencies:** None (standalone)
**Technology:** HTML + CSS (no JavaScript functionality)

---

**Status:** ✅ Mockups complete, ready for stakeholder review
**Recommended:** Use `schedule-config-mockup-final.html` as production design reference
**Next:** Gather CD feedback on which settings are most important
