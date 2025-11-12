# Scheduling Suite - Locked Decisions

**Date:** November 11, 2025
**Status:** ✅ ALL DECISIONS CONFIRMED AND LOCKED

---

## 10 Critical Decisions - User Confirmed

### 1. Production Routine Duration ✅ LOCKED
**Decision:** Production routine default and maximum length = **15 minutes**

**Implementation:**
```typescript
const ROUTINE_DURATIONS = {
  production: { min: 15, max: 15, default: 15 }, // ALWAYS 15 minutes
};
```

---

### 2. Transition/Buffer Time ✅ LOCKED
**Decision:** **ZERO** buffer time between routines

**Implementation:**
- Routine ends at 8:03:00 → Next routine starts at 8:03:00
- No automatic spacing
- Duration includes ALL setup/performance/teardown

---

### 3. Routine Duration Defaults ✅ LOCKED
**Decision:** If routine length unknown, assume **MAXIMUM** for category type

**Implementation:**
```typescript
const DEFAULTS = {
  solo: 3,          // Always 3 min
  duet: 3,          // Always 3 min
  small_group: 5,   // Assume 5 min if unknown
  large_group: 7,   // Assume 7 min if unknown
  production: 15,   // Always 15 min
};
```

---

### 4. Studio PDF Schedule Content ✅ LOCKED
**Decision:** **Only their routines** on the SD review phase of scheduling

**Implementation:**
- Studios see ONLY their own routines in PDF
- No competitor information
- No context routines
- Clean, focused view for parents
- Includes: Routine number, time, title, dancers, category

**Example Studio PDF:**
```
GLOW DANCE COMPETITION 2026
Studio: Starlight Dance Academy

Day 1 - Friday, March 15

100  8:00 AM  "Sparkle & Shine"  Solo  Sarah Johnson
102  8:06 AM  "Warriors"  Small Group  5 Dancers
146  11:33 AM  "Dream Big"  Duet  Sarah J., Emma K.

Day 2 - Saturday, March 16

201  9:00 AM  "Shine Bright"  Solo  Emma Klein
```

---

### 5. Judge/Tablet Schedule ✅ LOCKED
**Decision:** Judges see **STUDIO CODES** (not full names)

**User Clarification:**
> "Judges should see codes on their schedule; I think we're learning everyone gets specialized version of the schedule. SDs=only their routines CDs= full vis Judges= full schedule but studio codes"

**Schedule Visibility Matrix:**
```
Role           | Visibility
---------------|------------------------------------------
Studio (SD)    | Only their routines
CD             | Full schedule, codes + full names
Judges         | Full schedule, CODES ONLY (not names)
Public         | (After published) Full schedule, full names
```

**Judge Schedule Example:**
```
Entry  Time     Title            Studio    Category     Classification
100    8:00 AM  "Sparkle"        Studio A  Solo         Emerald
101    8:03 AM  "Dream"          Studio B  Duet         Sapphire
102    8:06 AM  "Warriors"       Studio A  Small Group  Crystal
```

---

### 6. Hotel Attrition Warnings ✅ LOCKED
**Decision:** **YES** - System provides warnings

**Implementation:**
```typescript
// Warning 1: All novice on one day
if (allEmeraldRoutinesOnDay1) {
  warn("⚠️ All Emerald (Novice) routines are on Day 1. This may cause hotel attrition. Consider spreading across multiple days.");
}

// Warning 2: Studio's routines all on one day (future)
if (studioHasAllRoutinesOnOneDay) {
  warn(`⚠️ Studio '${studioName}' has all routines on Day 1. Family may check out early.`);
}
```

**Warning Locations:**
- During draft build (real-time)
- Finalization checklist (pre-lock)
- Trophy helper report (context)

---

### 7. Classification Grouping Strategy ✅ LOCKED
**Decision:** Support **BOTH** manual and auto modes

**User Clarification:**
> "We're going to have a manual mode and an auto mode (with manual after)"

**Implementation:**

**Option A - Pure Manual:**
- CD starts with empty schedule
- Drag routines from pool to timeline
- Full control over placement
- Can mix classifications freely

**Option B - Auto-to-Manual:**
- System generates draft schedule
- Uses classification grouping rules
- CD reviews and edits
- All conflict warnings still apply

**Key Principle:** Both workflows use same conflict detection and validation. Auto is just a starting point.

---

### 8. Session Structure ✅ LOCKED
**Decision:** **~3 hour sessions** within days, time-based (not routine count)

**User Clarification:**
> "This meant that sessions want to be constrained by minutes, not by amount of routines as routines are different lengths. We still want ~3 hr sessions"

**Implementation:**
```
Day 1 (Friday)
├── Morning Session   (8:00 AM - 11:00 AM)   ~3 hours
├── Lunch Break       (11:00 AM - 12:00 PM)  1 hour
├── Afternoon Session (12:00 PM - 3:00 PM)   ~3 hours
├── Dinner Break      (3:00 PM - 5:00 PM)    2 hours
└── Evening Session   (5:00 PM - 8:00 PM)    ~3 hours
```

**Key Rules:**
- Sessions are TIME-based (not routine count)
- Target: ~3 hours per session
- CD places break blocks between sessions
- Configurable per competition

---

### 9. Special Awards in Scheduling ✅ LOCKED
**Decision:** **Skip** special awards for scheduling phase

**User Clarification:**
> "Skip special awards for scheduling phase"

**Implementation:**
- Focus on overall awards only (age + classification + size)
- Special awards (Best Costume, Judges' Choice, etc.) handled separately
- Trophy helper shows overall categories only
- Award blocks for overalls only

**Phase 2:** Overall awards scheduling
**Phase 3:** Special awards + scoring integration

---

### 10. Routine Numbering ✅ LOCKED
**Decision:** Sequential starting at **100**

**Implementation:**
- First routine: 100
- Second routine: 101
- Third routine: 102
- Continues: 103, 104, 105...
- Draft mode: Auto-renumber on moves
- Finalized mode: Numbers lock to routines

---

## Summary of Locked Decisions

| Decision | Locked Value |
|----------|--------------|
| Production duration | 15 minutes |
| Buffer time | 0 minutes |
| Unknown duration | Assume maximum |
| Studio PDF | Only their routines |
| Judge schedule | Studio codes (not names) |
| Attrition warnings | Yes |
| Grouping strategy | Manual + Auto modes |
| Session structure | ~3 hour time-based sessions |
| Special awards | Skip for Phase 2 |
| Starting number | 100 |

---

**All decisions locked and documented!** ✅
**Ready for implementation.**
