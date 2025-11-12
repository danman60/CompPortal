# Scheduling Suite - Changes From Demo

**Date:** November 11, 2025
**Comparison:** Original Demo vs. New Detailed Specification
**Status:** Complete Analysis

---

## Executive Summary

The original demo (schedule-demo.html) was a proof-of-concept showing category+age grouping with drag-and-drop. After the stakeholder meeting with Selena and Emily, we have **significantly expanded** the requirements with **40+ additional details** and **architectural changes**.

**Key Philosophy Shift:** From "demo concept" to **production-ready manual scheduling system with hybrid auto-generation option**.

---

## 🔄 Major Architectural Changes

### 1. Manual vs Auto-Generation

**Demo Approach:**
- Implied auto-generation would create schedule
- CD would make minor tweaks

**New Spec:**
✅ **HYBRID SYSTEM**
- **Option A:** Pure manual (Selena's preference)
  - Start with empty schedule
  - CD drags routines one by one
  - Full control over placement
- **Option B:** Auto-to-manual
  - System generates draft
  - CD reviews and heavily edits
  - All warnings still apply

**Quote:**
> User: "We're going to have a manual mode and an auto mode (with manual after)"

---

### 2. State Machine Model

**Demo:** No state concept

**New Spec:** ✅ **Three-tier state system**
```
Draft Mode
- Numbers auto-renumber
- Studios can add notes
- CD actively building

Finalized Mode (~30 days before)
- Numbers LOCK to routines
- Limited changes allowed
- Studios view schedule

Published Mode
- Studio codes → Full names revealed
- Public access
- No more changes
```

**Database:**
```sql
ALTER TABLE competitions
ADD COLUMN schedule_status VARCHAR(20) DEFAULT 'not_started'
  CHECK (schedule_status IN ('not_started', 'draft', 'finalized', 'published'));
```

---

### 3. Multiple Schedule Views

**Demo:** Single schedule view

**New Spec:** ✅ **Specialized views per role**

| Role | What They See |
|------|---------------|
| **Studio (SD)** | Only their routines |
| **CD** | Full schedule, codes + names |
| **Judges** | Full schedule, codes only |
| **Public** | (After published) Full schedule, full names |

**Implementation:**
- Same data, different filtering
- Role-based RLS policies
- Separate PDF templates per role

---

## 📐 Detailed Feature Changes

### 4. Routine Duration Rules

**Demo:**
- Solo/Duet: 3 min
- Small Group: 5 min
- Large Group: 7 min
- Production: **7 min** ❌ WRONG

**New Spec:** ✅ **Corrected durations**
- Solo/Duet: 3 min
- Small Group: 3-5 min (assume 5 if unknown)
- Large Group: 5-7 min (assume 7 if unknown)
- Production: **15 min** ✅ CONFIRMED

**Why Changed:**
> Selena: "production should be 15 minutes. It says 7. I don't know if that's just a test right now."

---

### 5. Transition Time

**Demo:** Not specified

**New Spec:** ✅ **ZERO buffer time**
- Routine ends 8:03:00 → Next starts 8:03:00
- No automatic spacing
- Duration includes ALL setup/performance/teardown

**Why Specified:**
> Selena: "I never added that buffer time that might kill our schedule"

---

### 6. Routine Numbering

**Demo:**
- Started at 100 ✅
- Auto-renumbered on moves ✅
- No lock concept ❌

**New Spec:** ✅ **Number locking system**
- Draft mode: Auto-renumber (like demo)
- Finalized mode: Numbers LOCK to routines
- If routine moves after finalization, number stays with it

**Why Changed:** Numbers must remain stable once printed/distributed to studios.

---

### 7. Session Structure

**Demo:** Not addressed

**New Spec:** ✅ **~3 hour time-based sessions**
```
Morning Session   (8:00 AM - 11:00 AM)   ~3 hours
Afternoon Session (12:00 PM - 3:00 PM)   ~3 hours
Evening Session   (5:00 PM - 8:00 PM)    ~3 hours
```

**Key Rule:** Sessions constrained by MINUTES, not routine count.

**Why Specified:**
> User: "This meant that sessions want to be constrained by minutes, not by amount of routines as routines are different lengths. We still want ~3 hr sessions"

---

## 🏆 Award System Details

### 8. Trophy Helper Report

**Demo:** Not included

**New Spec:** ✅ **Comprehensive trophy helper**
- Shows last routine in each overall category
- Total routines per category
- Suggested award time (last + 30 min)
- Button to create award block
- Highlights last routines on schedule

**Why Added:** Core workflow requirement from Selena.

**Quote:**
> Selena: "I use a trophy helper tool that shows when the last routine in each category is completed, then I manually schedule awards ceremonies."

---

### 9. Award Types

**Demo:** Generic "award blocks"

**New Spec:** ✅ **Overall awards only (Phase 2)**
- Based on: Age + Classification + Size
- NOT based on: Genre
- Special awards: Deferred to Phase 3

**Why Changed:**
> User: "Skip special awards for scheduling phase"

---

### 10. Ribbon System

**Demo:** Not addressed

**New Spec:** ✅ **Glow-specific: NO ribbons**
- Verbal placement only (1st, 2nd, 3rd)
- Overalls get trophies
- EMPWR may differ (configurable per tenant)

**Why Specified:**
> Selena: "we don't give out ribbons anymore. We don't do ribbons for Glow."

---

## 📝 Studio Interaction

### 11. Studio Feedback System

**Demo:** Not included

**New Spec:** ✅ **Comprehensive request management**

**Features:**
- Studios add notes/requests to routines
- CD sees centralized request list
- Mark: pending / completed / ignored
- In-app notifications (bell icon)
- Optional email notifications
- Printable checklist

**Why Added:**
> Selena: "I prefer studios submit requests through comments rather than direct schedule modifications."

---

### 12. Studio PDF Content

**Demo:** Not addressed

**New Spec:** ✅ **Only their routines (clean view)**
- No competitor information
- No context routines
- Parent-friendly format
- Includes: Number, time, title, dancers, category

**Why Specified:**
> Selena: "it gives you, like, a printout, because they actually post it for their parents"
> User: "Only their routines on the SD review phase of scheduling"

---

### 13. Studio Schedule Portal

**Demo:** Not included

**New Spec:** ✅ **Dedicated studio schedule view**
- View their routines only
- Add notes/requests per routine
- Download PDF button
- Filter by day, dancer, category
- No competitor visibility

---

## 🚨 Conflict Detection

### 14. Primary Conflict Rule

**Demo:**
- Showed conflicts visually
- No specific spacing rule defined

**New Spec:** ✅ **6-routine minimum spacing**

**Severity Levels:**
- Critical (0 between): Back-to-back, physically impossible
- Error (1-3 between): Serious issue
- Warning (4-5 between): Close to minimum

**Display:**
```
⚠️ Conflict: Dancer "Sarah Johnson" appears in:
- Routine #45 (8:30 AM)
- Routine #48 (8:45 AM)
Only 2 routines apart (need 6 minimum)
```

**Why Changed:** Must show WHICH dancer has conflict (not just "conflict exists").

---

### 15. Extended Conflict Types

**Demo:** Not included

**New Spec:** ✅ **Additional conflict detection**
1. Same dancer across studios
2. Costume change time (3-routine min if flagged)
3. Age group variety (too many consecutive)
4. Classification variety (too many consecutive)
5. Studio spacing (too many consecutive routines)

---

### 16. Conflict Override System

**Demo:** Not included

**New Spec:** ✅ **Override with reason tracking**
- CD can override any conflict
- MUST enter reason (text field)
- Override recorded in database
- Warning remains visible but marked "overridden"
- Audit trail maintained

---

## 🗓️ Classification Grouping

### 17. Grouping Strategy

**Demo:**
- Strict category+age grouping
- Example: "TAP AGE 7", "JAZZ AGE 8"
- All routines in group moved together

**New Spec:** ✅ **FLEXIBLE grouping**
- CD can mix classifications for variety
- Hotel attrition strategy (spread Emerald across days)
- Audience variety (mix levels)
- NOT strict "all Emerald together"

**Why Changed:**
> Selena: "I take small groups from another level, and I'll put them in the middle"

**Demo Approach:** Still valid for auto-generation, but manual allows mixing.

---

### 18. Hotel Attrition Warnings

**Demo:** Not included

**New Spec:** ✅ **System warnings**
- Warn if all Emerald on one day
- Future: Warn if studio's routines all on one day
- CD can override but should be informed

**Why Added:**
> Selena: "I would never do all novice in one day, and Emily would tell you for hotel pickup, never do that. It will screw you, and you'll end up with attrition."

---

## 🎨 Studio Code System

### 19. Code Assignment

**Demo:** Not addressed

**New Spec:** ✅ **Single letter codes (A-Z)**
- Based on reservation approval order
- First approved: "A"
- Second approved: "B"
- Fallback for 26+: AA, AB, AC...

**Code Visibility:**
- Draft: Studios see codes, CD sees codes+names
- Published: Full names revealed

**Why Added:** Mask studio identity during draft to prevent competitive gaming.

---

## 📊 UI/UX Enhancements

### 20. Filter Panel

**Demo:**
- 3 filter types: Studio, Age, Category

**New Spec:** ✅ **Enhanced filtering**
- Classification (radio: only one)
- Category Type (checkboxes: multiple)
- Age Group (checkboxes: multiple)
- Genre (checkboxes: multiple)
- Studio (dropdown)
- Search (text field)

**Display:**
- Shows unscheduled count: "Emerald Solos (8 unscheduled)"
- Updates in real-time as routines placed

---

### 21. Details Panel

**Demo:** Not included

**New Spec:** ✅ **Right sidebar details panel**
- Selected routine details
- Conflict warnings (with dancer names)
- Studio requests (if any)
- CD private notes (editable)
- Age change warnings (if any)

---

### 22. Visual Indicators

**Demo:** Basic color coding

**New Spec:** ✅ **Rich visual system**
- Conflicts: Red background, ⚠️ icon
- Age changes: Yellow background, warning icon
- Studio requests: Blue dot indicator
- CD notes: Note icon
- Last routine per category: Trophy icon, gold border

---

### 23. Auto-Save

**Demo:** Not addressed

**New Spec:** ✅ **Auto-save on every drag**
- "Last saved: 2 minutes ago" indicator
- No manual save button needed
- Conflict detection runs on auto-save
- Undo/redo support (10-step history)

---

### 24. Responsive Design

**Demo:** Desktop only

**New Spec:** ✅ **Multi-device support**
- CD scheduling: Desktop/laptop optimized (drag-and-drop)
- Studio schedule view: Mobile-friendly (responsive)
- Studio PDF: Mobile-friendly (readable on phone)
- Filters: Touch-friendly on tablet

---

## 🎵 Additional Systems

### 25. Music Submission Tracking (Phase 2B)

**Demo:** Not included

**New Spec:** ✅ **Music deadline management**
- Official deadline: 30 days before event
- Track submission status per routine
- Email reminders (configurable intervals)
- Flag routines missing music
- Generate DJ playlist/link

**Why Added:**
> Selena: "I really don't need it till, like, the week before each location, but we tell them 30 days."

---

### 26. Email Notification System

**Demo:** Not included

**New Spec:** ✅ **Configurable reminders**
- Registration deadline reminders
- Music submission reminders
- Schedule change notifications
- Template variables (studio name, deadline, portal link)
- Staff configures intervals (no hard-coding)

---

### 27. Age Change Detection

**Demo:** Not included

**New Spec:** ✅ **Birthdate change tracking**
- Detect when dancer birthdate updated after scheduling
- Routine's average age changes
- May move to different age group
- Highlight routine in yellow
- Show old vs. new age
- CD can drag to correct group

**Database:**
```sql
CREATE TABLE age_change_tracking (
  id UUID PRIMARY KEY,
  routine_id UUID NOT NULL,
  dancer_id UUID NOT NULL,
  old_age_group VARCHAR(20),
  new_age_group VARCHAR(20),
  detected_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  tenant_id UUID NOT NULL
);
```

---

## 📋 Notes System

### 28. Three Note Types

**Demo:** Not included

**New Spec:** ✅ **Comprehensive notes system**

**1. CD Private Notes:**
- Only visible to CD
- Internal reminders
- Not visible to studios or judges

**2. Studio Request Notes:**
- Added by studios in their portal
- Visible to CD in request management list
- CD can mark: pending / completed / ignored

**3. Submission Notes:**
- From original routine submission
- Carried forward to scheduling
- Visible to CD on hover

**Database:**
```sql
CREATE TABLE routine_notes (
  id UUID PRIMARY KEY,
  routine_id UUID NOT NULL,
  note_type VARCHAR(20) CHECK (note_type IN ('cd_private', 'studio_request', 'submission_note')),
  content TEXT NOT NULL,
  author_id UUID,
  status VARCHAR(20), -- For studio requests
  tenant_id UUID NOT NULL
);
```

---

## 🔧 Technical Infrastructure

### 29. Performance Targets

**Demo:** Not specified

**New Spec:** ✅ **Defined performance requirements**
- Schedule load time: < 2 seconds
- Drag-and-drop lag: < 100ms
- Conflict detection: < 500ms
- Filter application: < 200ms
- Scale: Up to 500 routines per competition

**Optimization Strategies:**
- Virtualize long lists (react-window)
- Debounce conflict detection
- Proper database indexes
- Cache frequently accessed data

---

### 30. Browser Compatibility

**Demo:** Not specified

**New Spec:** ✅ **Target browsers**
- Chrome (primary)
- Safari (Mac users)
- Firefox (some users)
- Edge (Windows users)
- NOT: Internet Explorer

**Testing:** Verify drag-and-drop works in all browsers.

---

### 31. Accessibility

**Demo:** Not addressed

**New Spec:** ✅ **ADA compliance**
- Screen reader support
- Keyboard navigation
- High contrast mode
- Text size adjustable
- ARIA labels on all interactive elements

---

## 📊 Database Schema Additions

### 32. New Tables

**Demo:** No database schema

**New Spec:** ✅ **4 new tables**

**1. schedule_conflicts**
- Tracks all detected conflicts
- Includes dancer name, routines between, severity
- Override tracking (who, when, why)

**2. schedule_blocks**
- Awards and break blocks
- Custom text, duration, placement
- Metadata (overall category, award type)

**3. routine_notes**
- CD private, studio requests, submission notes
- Status tracking (pending/completed/ignored)
- Priority levels

**4. age_change_tracking**
- Birthdate changes after scheduling
- Old vs. new age group
- Resolution tracking

---

### 33. Existing Table Updates

**Demo:** No database schema

**New Spec:** ✅ **Schema extensions**

**studios:**
- `studio_code` (CHAR(1)) - A, B, C...
- `registration_order` (INT) - Assignment sequence

**reservations:**
- `waiver_accepted_at` (TIMESTAMPTZ)
- `waiver_version` (VARCHAR)

**competition_entries:**
- `scheduled_start_time` (TIMESTAMPTZ)
- `display_order` (INT)
- `assigned_number` (INT) - Locked number after finalization
- `age_at_scheduling` (DECIMAL) - Baseline for change detection
- `extended_time` (BOOLEAN)
- `actual_duration_minutes` (INT)
- `music_file_url` (VARCHAR)
- `music_submitted_at` (TIMESTAMPTZ)

**competitions:**
- `schedule_status` (VARCHAR) - not_started/draft/finalized/published
- `schedule_lock_days_before` (INT) - Default 30
- `routine_number_start` (INT) - Default 100

---

## 🎯 Priority Changes Summary

### Critical Changes (Must Implement for MVP)

1. ✅ **Production duration: 15 minutes** (was 7 in demo)
2. ✅ **Zero buffer time** (explicit rule)
3. ✅ **Number locking system** (draft vs finalized)
4. ✅ **Studio code system** (A-Z masking)
5. ✅ **Conflict detection with dancer names** (show WHO)
6. ✅ **Trophy helper report** (CD core workflow)
7. ✅ **Studio feedback system** (notes/requests)
8. ✅ **Multiple schedule views** (SD/CD/Judge/Public)
9. ✅ **~3 hour sessions** (time-based)
10. ✅ **Hybrid manual + auto** (both workflows)

---

### High Priority (Phase 2A)

11. ✅ Hotel attrition warnings
12. ✅ Age change detection
13. ✅ Extended conflict types
14. ✅ Three note types system
15. ✅ Enhanced filtering
16. ✅ Visual indicators (conflicts, age changes, requests)
17. ✅ Auto-save with undo/redo
18. ✅ Responsive design
19. ✅ Override tracking
20. ✅ Details panel

---

### Medium Priority (Phase 2B)

21. ✅ Music submission tracking
22. ✅ Email notification system
23. ✅ Costume change conflicts
24. ✅ Variety warnings (age/classification)
25. ✅ Printable checklist
26. ✅ Dark mode
27. ✅ Accessibility features

---

### Deferred (Phase 3)

28. ⏸️ Judge tablet app
29. ⏸️ Scoring integration
30. ⏸️ Special awards system
31. ⏸️ Tabulation automation

---

## 📈 Scope Expansion

**Demo Scope:** ~20% of final system
- Basic drag-and-drop
- Category+age grouping
- Simple filters
- Visual schedule grid

**New Spec Scope:** 100% production system
- Manual + auto workflows
- Comprehensive conflict detection
- Studio feedback loop
- Multiple role views
- Trophy helper integration
- State machine management
- Email notifications
- Change tracking
- Performance optimization
- Accessibility compliance

**Expansion Factor:** ~5x more features than demo

---

## 🔍 What Stayed the Same

1. ✅ Drag-and-drop core interaction
2. ✅ Category+age grouping strategy (for auto mode)
3. ✅ 5-minute time rounding
4. ✅ Sequential numbering starting at 100
5. ✅ Break and award blocks
6. ✅ Visual timeline layout
7. ✅ Filter panel concept
8. ✅ Entry number display

**Demo foundation is solid** - we're building ON it, not replacing it.

---

## 📝 Summary Table

| Feature | Demo | New Spec | Change Type |
|---------|------|----------|-------------|
| Production duration | 7 min | 15 min | ❌ FIX REQUIRED |
| Buffer time | Not specified | 0 min | ✅ NEW RULE |
| Number locking | No | Yes (finalized mode) | ✅ NEW FEATURE |
| Studio codes | No | A-Z system | ✅ NEW FEATURE |
| Conflict dancer names | No | Yes | ✅ ENHANCEMENT |
| Trophy helper | No | Full report | ✅ NEW FEATURE |
| Studio feedback | No | Full system | ✅ NEW FEATURE |
| Multiple views | No | SD/CD/Judge/Public | ✅ NEW FEATURE |
| Sessions | Not defined | ~3 hour time-based | ✅ NEW RULE |
| Workflow | Implied auto | Manual + Auto | ✅ HYBRID APPROACH |
| State machine | No | Draft/Finalized/Published | ✅ NEW ARCHITECTURE |
| Age change detection | No | Full tracking | ✅ NEW FEATURE |
| Music tracking | No | Phase 2B system | ✅ NEW FEATURE |
| Email notifications | No | Configurable | ✅ NEW FEATURE |
| Notes system | No | 3 types | ✅ NEW FEATURE |
| Auto-save | No | Yes with undo | ✅ NEW FEATURE |

---

## 🎯 Implementation Impact

**Demo to Production Effort:**
- Demo: ~2-3 days of mockup work
- Production system: **6 weeks of development** (Dec 26 deadline)

**Lines of Code Estimate:**
- Demo: ~500 lines HTML/CSS/JS
- Production: ~15,000+ lines TypeScript/React/SQL

**Database Changes:**
- Demo: 0 tables
- Production: 4 new tables, 4 table updates, 20+ new fields

**Documentation:**
- Demo: 2 markdown files (~1,000 lines)
- Production: 5 specification files (~4,000+ lines)

---

## ✅ Next Steps

1. **Update Demo:** Fix production duration (7 → 15 min)
2. **Architecture:** Implement state machine (draft/finalized/published)
3. **Database:** Create 4 new tables + migrations
4. **Studio Codes:** Implement assignment logic
5. **Conflict Detection:** Build 6-routine spacing + dancer name display
6. **Trophy Helper:** Build report generation
7. **Studio Feedback:** Build notes/request system
8. **Multiple Views:** Implement role-based filtering

---

**Document Status:** ✅ Complete - Comprehensive comparison
**Implementation:** Ready to begin Phase 2A development
