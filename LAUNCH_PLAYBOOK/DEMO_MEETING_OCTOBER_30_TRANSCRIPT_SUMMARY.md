# Demo Meeting October 30, 2025 - Transcript Summary

**Date:** October 30, 2025
**Duration:** ~2 hours
**Attendees:** Daniel (Dev), Emily (EMPWR CD), Selena (GLOW CD), Michael (brief)

---

## 🎯 KEY MILESTONE: MAJOR BUSINESS LOGIC DISCOVERY

This meeting uncovered **critical business logic** that must be implemented before launch. These are NOT nice-to-haves - they prevent catastrophic workflow failures.

---

## 🚨 CRITICAL TIMELINE

### November 1st Launch (Accounts + Dancers Only)
- Studios claim accounts
- Studios create/import dancers
- **NO routine creation yet**

### Routine Creation Launch (After Nov 1)
- Must implement all critical business logic below
- Date TBD based on implementation time

### December 23rd Payment Deadline
- Studios must have invoices to pay by this date
- Invoices must be generated "within 24 hours" of summary submission

---

## ✅ PRE-LAUNCH DATA REQUIRED (URGENT)

### GLOW Data Needed (Selena to provide tonight):
1. **Reservation Snapshot Spreadsheet:**
   - Studio names
   - Email addresses
   - Number of spaces reserved (per competition)
   - Deposit amounts paid
   - Any credits owed
   - Any discount percentages (5%, 10%, etc.)

2. **Competition Updates:**
   - Orlando: CANCELLED (delete from system)
   - Space counts: Need verification for all events

### EMPWR Data:
- Emily already provided complete spreadsheet
- Selena will merge email addresses into shared doc

**Action:** Daniel will seed both tenants with this data before Nov 1 launch

---

## 🔴 P0 CRITICAL FEATURES (MUST HAVE BEFORE ROUTINE CREATION)

### 1. Production Entry Logic (HIGH PRIORITY)

**When entry size = "Production":**
- Auto-lock dance style to "Production"
- Auto-lock classification to "Production" (new classification)
- No manual selection allowed
- Minimum size: 10 dancers (currently 1-20+, needs change)

**Why Critical:** Productions have completely different rules than other entries

**Implementation:**
```typescript
// When entry_size_category.name === "Production":
- dance_category = "Production" (locked)
- classification = "Production" (locked, new classification to add)
- min_dancers = 10
- User cannot change these fields
```

**Database Changes Needed:**
1. Update entry_size_categories: Production min = 10 (not 1)
2. Add new classification: "Production" (for both EMPWR + GLOW)

---

### 2. Classification Enforcement System (HIGHEST PRIORITY)

**Problem:** Studios incorrectly classify dancers/routines, creating massive scheduling issues

#### Part A: Dancer Classification (REQUIRED)
- **Every dancer MUST have a classification** (Emerald/Sapphire/Titanium/Crystal for GLOW, Novice/Part-time/Competitive for EMPWR)
- Classification set at dancer creation
- Cannot be blank/null
- Enforced in UI + database

**Why Critical:** "If we allow unclassified dancers, we're gonna have to go back to everybody and force them to classify the dancers after the fact"

#### Part B: Solo Classification Rules (STRICT)
**Rule:** A dancer can ONLY compete in ONE classification level across ALL their solos

**Example Violation:**
- ❌ Emily has Jazz solo (Emerald) + Tap solo (Sapphire)
- ✅ Emily has Jazz solo (Emerald) + Tap solo (Emerald)

**System Behavior:**
- Solo classification = dancer's classification (auto-detected, locked)
- User cannot override
- System prevents creation of solos at different levels

**Why Critical:** "The new studios will tend to put their same dancer in different levels for different solos... I'd have to contact them and ask what is she? I would rather not have to do that for every single studio."

#### Part C: Duet/Trio Classification Rules
**Rule:** Routine classification = HIGHEST level dancer in the routine

**Example:**
- Dancers: Emily (Emerald), Sarah (Sapphire)
- Duet MUST be classified as: Sapphire (highest)

**System Behavior:**
- Auto-detect highest classification
- User can LEVEL UP (Sapphire → Titanium)
- User CANNOT level down (Sapphire → Emerald) ❌

#### Part D: Group/Line/Superline Classification Rules (60% Majority)
**Rule:** Routine classification = majority level (60%+), can level up but not down

**Example:**
- 10 dancers: 7 Emerald, 3 Sapphire
- Routine classified as: Emerald (70% majority)
- User can bump to Sapphire if desired
- User cannot select lower than calculated

**System Behavior:**
- Calculate weighted average (implementation TBD)
- Suggest classification based on majority
- Allow bump up by one level
- Prevent leveling down

**Why Critical:** "If they are in multiple levels in groups, I just want it to flag me so I can verify"

---

### 3. Age Calculation Logic (CRITICAL)

**Two Different Age Systems:**

#### System 1: Scheduling Ages (Used for competition scheduling)
- **Solos:** Exact age of dancer (e.g., 7-year-old)
- **Duet/Trio/Groups:** Average age, drop decimal (e.g., 6.7 → 6)
- **Calculation:** `floor(sum of ages / dancer count)`
- **Age as of:** December 31st of prior year (Dec 31, 2025 for 2026 season)
- **Display:** "6-year-old Emerald Tap", "12-year-old Sapphire Jazz"

#### System 2: Overall Award Ages (Used for tabulation only)
- Combined age brackets: Tiny, Bitty, Mini, Pre-Junior, Junior, Teen, Senior, Senior+
- Only used for overall awards calculation
- NOT shown during routine creation

**Current Issue:** System shows "Senior" during entry creation - should show calculated age number

**Implementation:**
```typescript
// Routine creation form:
if (entry_size === "Solo") {
  age_display = dancer.age; // exact age
} else {
  const ages = dancers.map(d => calculateAge(d.birthdate, "2025-12-31"));
  age_display = Math.floor(ages.reduce((a, b) => a + b) / ages.length);
}
// Display: `${age_display}-year-old` (NOT age group names)
```

---

### 4. Scheduling Conflict Notes (PER ROUTINE)

**Feature:** Allow studios to specify day preferences/restrictions per routine

**UI Requirements:**
1. **Per-routine comment field**
   - Label: "Schedule Notes" or "Scheduling Conflicts"
   - Placeholder: "e.g., Cannot dance on Saturday, prefer Sunday"
   - Optional field
   - Character limit: 500 chars

2. **Pre-submit warning modal** (before summary submission)
   - Text: "Please ensure you've submitted any scheduling conflicts before submitting."
   - Purpose: "Liability thing - if they send a change too late, we say 'we told you, you had the ability to do that in the system'"
   - Cannot be dismissed without acknowledging

**Why Critical:** "In the past, they don't tell me they had a communion that day and that kid couldn't dance... when I'm scheduling, I'm like, okay, I don't have to redo a whole schedule, I just know those dances can't be on that day."

---

## 🟡 P1 HIGH PRIORITY FEATURES (Wanted for Launch)

### 5. Per-Dancer Invoice Breakdown

**User Request:** Studio directors want to generate invoices per dancer (not just studio-level)

**Use Case:** Studios bill parents individually and need to know per-dancer costs

**Feature Requirements:**
1. View invoice broken down by dancer
2. Editable markup field (percentage or fixed dollar)
3. Export/print per-dancer invoices
4. Studios manage their own markups (not CD concern)

**Example:**
- CompSync charges: $75/entry
- Studio marks up to: $80/entry
- Parent invoice shows: $80/entry

**Status:** "Cool feature we could implement next season... I don't think anyone will expect that this year"

**Timeline:** Phase 2 (post-launch enhancement)

---

## 📋 CONFIGURATION UPDATES NEEDED

### Competition Settings Lock (72-Hour Window)

**Quote:** "If you need to make any changes to these settings, I would say that's like a next 72 hours thing. I don't care what they are, I just care that they don't change once it's out to people."

**Current Issues Found:**

1. **Production category needs to be added to:**
   - Entry Size Categories (min 10 dancers)
   - Dance Styles/Categories (as a style option)
   - Classifications (as "Production" classification)

2. **Settings Review Required:**
   - Both CDs confirmed their age groups/classifications look correct
   - Emily: Novice, Part-time, Competitive (3 levels)
   - Selena: Emerald, Sapphire, Titanium, Crystal (4 levels)

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### Database Schema Changes Required

1. **Add "Production" classification** to both tenants
2. **Update entry_size_categories** - Production min_size = 10
3. **Enforce dancer classification** - NOT NULL constraint
4. **Add scheduling_notes field** to competition_entries table

### Validation Rules to Implement

**Dancer Level:**
```sql
-- Classification required on dancer creation
ALTER TABLE dancers
ALTER COLUMN classification_id SET NOT NULL;
```

**Entry Level:**
```typescript
// Solo validation
if (entry_size === "Solo") {
  if (dancers[0].classification_id !== entry.classification_id) {
    throw new Error("Solo classification must match dancer classification");
  }
}

// Duet/Trio validation
if (["Duet", "Trio"].includes(entry_size)) {
  const highest = Math.max(...dancers.map(d => d.classification_level));
  if (entry.classification_level < highest) {
    throw new Error(`Classification must be at least ${highest_name}`);
  }
}

// Group validation (60% majority)
if (["Small Group", "Large Group", "Line", "Superline"].includes(entry_size)) {
  const suggested = calculateMajorityClassification(dancers);
  if (entry.classification_level < suggested.level) {
    throw new Error(`Majority rule: minimum ${suggested.name}`);
  }
  if (entry.classification_level > suggested.level + 1) {
    throw new Error("Can only bump up one level from majority");
  }
}

// Production auto-lock
if (entry_size === "Production") {
  entry.dance_category_id = PRODUCTION_CATEGORY_ID; // locked
  entry.classification_id = PRODUCTION_CLASSIFICATION_ID; // locked
  entry.min_dancers = 10;
}
```

### Age Calculation Function

```typescript
function calculateRoutineAge(dancers: Dancer[], entry_size: string): number {
  const cutoffDate = new Date("2025-12-31");

  if (entry_size === "Solo") {
    return calculateAge(dancers[0].birthdate, cutoffDate);
  }

  // Duet/Trio/Groups/Lines/Productions
  const ages = dancers.map(d => calculateAge(d.birthdate, cutoffDate));
  const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return Math.floor(avgAge); // drop decimal
}

function calculateAge(birthdate: Date, asOfDate: Date): number {
  const years = asOfDate.getFullYear() - birthdate.getFullYear();
  const monthDiff = asOfDate.getMonth() - birthdate.getMonth();
  const dayDiff = asOfDate.getDate() - birthdate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return years - 1;
  }
  return years;
}
```

---

## 📊 WORKFLOW CLARIFICATIONS

### Phase 1 Workflow (Current - Registration + Entry Creation)

1. **Studio Onboarding** (Nov 1 launch)
   - Studios claim accounts via email invitation
   - Complete onboarding (studio details, waivers)
   - Create/import dancers **with required classification**

2. **Routine Creation** (Post-Nov 1, after logic implemented)
   - Create routine with auto-detected age/size/classification
   - Attach dancers to routine
   - Add scheduling notes if needed
   - System enforces all business rules

3. **Summary Submission**
   - Pre-submit warning about scheduling conflicts
   - Studios confirm final routine list
   - Unused reservation slots refunded to capacity

4. **Invoice Generation** (CD action)
   - CD receives email notification
   - CD creates invoice (applies discounts/credits from seed data)
   - CD sends invoice to studio
   - Invoice must be generated "within 24 hours" per Selena

5. **Payment** (External to app)
   - Studio pays via check/transfer
   - CD marks invoice as paid in system

---

## 🎤 NOTABLE QUOTES

**On Classification Logic:**
> "This is great stuff, and this is exactly the kind of business logic that we want to be baked into this thing to save you the time."

**On Launch Timeline:**
> "November 1st... that is pretty much ready, but I'm just gonna spit shine a few things."

**On Invoice Timing:**
> "Once I hit submit, I generate an invoice usually within 24 hours or less."

**On Business Logic Discovery:**
> "It's really important for me to uncover any other critical business logic things that you need prior to launch, so we don't discover them after the fact."

**On Classification Enforcement:**
> "If we allow unclassified dancers, we're gonna have to go back to everybody and force them to classify the dancers after the fact. So that seems like something you really want to get on dancer creation."

**On Production Logic:**
> "Once you're in the production style choice, you're locked into the group size and you're also locked into classification."

**Final Commitment:**
> "I'm locked in, baby. We'll do accounts and dancers on the first, and then let's build on what we have. Keep thinking, Selena, please, of exactly these kind of logic blockers that we need before we open up routine creation."

---

## ✅ ACTION ITEMS

### Daniel (Developer)
1. ⏰ **Tonight:** Wait for Selena's data spreadsheet
2. ⏰ **Tonight/Tomorrow:** Seed both tenants with reservation data
3. ⏰ **By Nov 1:** Account claiming email templates ready
4. 🔴 **Before Routine Creation:** Implement all P0 features
   - Production auto-lock logic
   - Classification enforcement system
   - Age calculation display fix
   - Scheduling notes per routine
5. 📋 **72-hour window:** Add "Production" classification to both tenants

### Emily (EMPWR)
1. ⏰ **Tonight:** Merge Selena's data with email spreadsheet
2. 📧 Already receiving email notifications (confirmed working)

### Selena (GLOW)
1. ⏰ **Tonight:** Complete shared spreadsheet with:
   - All reservation details
   - Email addresses
   - Deposits paid
   - Credits owed
   - Discount percentages
2. 💭 **Ongoing:** Think of additional "logic blockers" before routine creation

---

## 🚀 REVISED LAUNCH PLAN

### Phase 1A: November 1st (Accounts + Dancers)
**Scope:**
- Account claiming workflow
- Onboarding completion
- Dancer creation/import
- **Classification REQUIRED on dancer creation**

**Out of Scope:**
- Routine creation (locked)
- Reservations (pre-seeded by Daniel)

### Phase 1B: TBD After Nov 1 (Routine Creation)
**Prerequisites:**
- All P0 features implemented
- Classification logic tested
- Age calculation verified
- Production rules working

**Scope:**
- Full routine creation workflow
- Summary submission
- Invoice generation

### Phase 2: Post-Launch Enhancements
- Per-dancer invoice breakdown
- Additional scheduling features
- Phase 2 business logic (scheduling system)

---

## 🔍 TECHNICAL DEBT / NOTES

1. **Majority Classification Weighting:** Implementation details TBD - "We'll let that happen, that'll be a back-end thing"

2. **Overall Age Groups:** Currently stored in database but should NOT be shown during routine creation - only used for awards tabulation

3. **Email Notifications:** Working perfectly for Emily - confirmed receiving all notifications

4. **Competition Settings:** Locked post-launch to prevent breaking routine data

---

## 📈 RISK ASSESSMENT

### HIGH RISK if not implemented:
- **Classification enforcement:** "Every single studio" will create misclassified entries requiring manual CD intervention
- **Production rules:** Studios will incorrectly classify productions, requiring schedule rework
- **Age calculation:** Wrong age display confuses users and creates scheduling errors

### MEDIUM RISK if delayed:
- **Scheduling notes:** Increases post-submission changes, but won't break system
- **Per-dancer invoices:** Studios have workarounds, but highly requested feature

---

## 💡 KEY INSIGHTS

1. **Selena's Background:** Used a different competition software recently that had classification enforcement - she knows this feature exists and works

2. **CD Pain Points:** Manual intervention for classification errors is their #1 time sink - "I can't see every kid in every dance"

3. **Studio Behavior:** New studios don't understand that classification "follows the dancer, not the routine"

4. **Launch Philosophy:** Better to delay routine creation than launch with broken business logic

5. **Data Seeding Value:** Pre-populating reservations/deposits saves studios from re-entering data

---

**Meeting End:** ~2:03am (Daniel's timezone)
**Next Sync:** After Nov 1 launch
**Overall Mood:** Positive, productive, critical discoveries made

---

*This summary captures the critical business logic discovered during the demo meeting. All P0 features must be implemented before routine creation is opened to studios.*
