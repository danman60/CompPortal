# Zoom Transcript vs Phase 2 Spec - Requirements Comparison

**Created:** November 4, 2025
**Purpose:** Identify discrepancies between actual business requirements (from Nov 4 meeting) and the Phase 2 spec

---

## 🚨 CRITICAL DISCREPANCY FOUND

### **Classification Behavior for Groups**

**Phase 2 Spec (Line 11):**
> "In the new beta entries system, **classification is always auto-determined** and **locked**. Studio Directors cannot manually override classification."

**Zoom Transcript (Lines 129-133, 168-175):**
> Selena: "I think they should just be able to change it. So what… for groupings, they should be able to change it."
>
> Daniel: "No, so the previous thing that we had, which was, like, it helpfully auto-classified for you, and you could always manually override it. But then at our last meeting, we were like, we don't want to let them override it, we want to do this, so you want… you want to go back to…"
>
> Emily: "That's what I would like to do."

**Resolution Needed:** Spec says classification is ALWAYS locked. Transcript says groups CAN be manually changed. **WHICH IS CORRECT?**

---

## Detailed Requirements Comparison

### 1. Age Group Behavior

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Solo Age** | Not explicitly stated | Locked to dancer's exact age (lines 3-6) | ✅ Clarification |
| **Group Age Calculation** | Not explicitly stated | Average age, drop decimal (lines 12-15) | ✅ Clarification |
| **Age Bump +1** | Can override +1 year without approval (lines 1083-1087) | Can bump up +1 without exception (lines 15-22) | ✅ Matches |
| **Age Override Approval** | No approval needed for age group override | Confirmed - no exception needed for +1 bump (lines 15-22) | ✅ Matches |

**Verdict:** Age group logic is consistent. Transcript clarifies implementation details that spec didn't explicitly state.

---

### 2. Classification Behavior

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Solo Classification** | Locked to dancer's classification (line 20) | Locked to soloist (lines 30, 177-198) | ✅ Matches |
| **Group Classification** | **LOCKED - cannot manually override (line 11)** | **CAN BE MANUALLY CHANGED (lines 129-133)** | ❌ **CONFLICT** |
| **Classification Bump +1** | Not mentioned | Can bump +1 without exception (lines 117-123) | ⚠️ Not in spec |
| **Classification Calculation** | Solo = exact, Duet/Trio = highest OR +1, Group = 60% majority OR +1 (lines 19-23) | Average of dancers, drop decimal, can bump +1 (lines 33-36) | ⚠️ Different wording |

**Verdict:** **CRITICAL CONFLICT** - Spec says classification always locked, transcript says groups can be manually changed by SD.

---

### 3. Exception Request Trigger

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **When to Request Exception** | Whenever SD wants different classification (implied by "cannot manually override") | Only for going DOWN a level OR up 2+ levels (lines 658-668) | ❌ **CONFLICT** |
| **+1 Level Change** | Would require exception (since classification is locked) | **NO EXCEPTION NEEDED** for +1 bump (lines 658-668) | ❌ **CONFLICT** |

**Verdict:** **CRITICAL CONFLICT** - Spec implies exception needed for ANY change. Transcript says +1 bump is allowed without exception.

---

### 4. Exception Request Workflow

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Entry Creation Timing** | Entry created immediately with status `pending_classification_approval` (line 33) | Entry saved as draft and locked (lines 613-616) | ✅ Similar intent |
| **SD Cannot Edit** | Entry locked until CD responds (line 143-145) | Routine locked, sent to CD (lines 616-631) | ✅ Matches |
| **CD Decision Options** | Approve as requested OR set different classification (lines 298-316) | Approve request OR edit classification (lines 622-628) | ✅ Matches |
| **Entry Status After Approval** | Changes to regular status (lines 301, 311) | Gets back into drafts (line 631) | ✅ Similar |
| **Email Notifications** | Immediate email to CD, response email to SD (lines 140, 324-338) | Email to CD, email back to SD (line 634) | ✅ Matches |
| **Request Button Location** | Below auto-calculated section (line 109, 689) | Beside classification in auto-calculated area (lines 595-598) | ✅ Matches |

**Verdict:** Exception workflow logic is consistent.

---

### 5. Summary Submission Blocking

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Block Condition** | Cannot submit if ANY entry has `status = 'pending_classification_approval'` (lines 344-356) | Cannot submit with unresolved exception requests (lines 853-862) | ✅ Matches |
| **Error Message** | Shows count of pending requests with list (lines 360-371) | Not specified in detail | ✅ Spec more detailed |

**Verdict:** Blocking logic is consistent.

---

### 6. Extended Time Pricing

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Solo Extended Time** | Not in spec | $5 flat (line 808) | ⚠️ Missing from spec |
| **Group Extended Time** | Not in spec | $2 per dancer (line 808) | ⚠️ Missing from spec |
| **Calculation Basis** | Not in spec | Based on actual number of dancers (line 814) | ⚠️ Missing from spec |

**Verdict:** Extended time pricing NOT documented in Phase 2 spec. This is NEW information.

---

### 7. Title Upgrade

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Title Upgrade Cost** | Not in spec | $30 flat (line 820) | ⚠️ Missing from spec |
| **Title Upgrade Eligibility** | Not in spec | **ONLY SOLOS** (lines 820-844) | ⚠️ Missing from spec |
| **UI Behavior** | Not in spec | Should hide for non-solos (lines 835-844) | ⚠️ Missing from spec |

**Verdict:** Title upgrade details NOT documented in Phase 2 spec. This is NEW information.

---

### 8. Pre-Summary Warning

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Warning Before Submit** | Not in spec | Checklist before summarizing (lines 445-514) | ⚠️ Missing from spec |
| **Warning Content** | Not in spec | Warn about dancer classifications being locked (lines 445-514) | ⚠️ Missing from spec |

**Verdict:** Pre-summary checklist NOT documented in Phase 2 spec. This is NEW feature request.

---

### 9. Daily Digest Email

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Frequency** | Daily at 9 AM (line 641) | Daily digest (line 865) | ✅ Matches |
| **Condition** | Only if pending items exist (line 642) | Not specified | ⚠️ Spec more detailed |
| **Content** | Classification requests, reservations, invoices (lines 578-630) | Exception requests, invoices to generate, invoices to send (lines 871-874) | ✅ Similar |

**Verdict:** Daily digest logic is consistent. Spec has more detailed implementation.

---

### 10. Dancer Classification Locking

| Aspect | Phase 2 Spec | Zoom Transcript | Status |
|--------|--------------|-----------------|--------|
| **Lock Timing** | Not explicitly stated | Lock on dancer creation (lines 253-256) | ⚠️ Missing from spec |
| **Change Rules** | Not explicitly stated | Can change ONLY if dancer not attached to routines (lines 217-277) | ⚠️ Missing from spec |
| **Warning Message** | Not explicitly stated | Warn user: must detach from routines to change (lines 286-290, 406-442) | ⚠️ Missing from spec |

**Verdict:** Dancer classification locking rules NOT documented in Phase 2 spec. This is NEW information.

---

## Summary of Conflicts

### 🔴 CRITICAL CONFLICTS (Must Resolve Before Implementation)

1. **Classification Manual Override for Groups**
   - **Spec says:** Classification ALWAYS locked, cannot manually change
   - **Transcript says:** Groups CAN be manually changed by SD
   - **Lines:** Spec line 11 vs Transcript lines 129-133
   - **Impact:** Fundamental UX difference

2. **Exception Request Trigger**
   - **Spec says:** Exception needed for ANY classification change (implied by "locked")
   - **Transcript says:** Exception ONLY for going down OR up 2+ levels (NOT for +1 bump)
   - **Lines:** Spec lines 11, 28 vs Transcript lines 658-668
   - **Impact:** When to show "Request Exception" button

### 🟡 MISSING FROM SPEC (Should Add)

3. **Extended Time Pricing**
   - Solo: $5 flat
   - Groups: $2 per dancer
   - (Lines 808-817)

4. **Title Upgrade Details**
   - Cost: $30 flat
   - Eligibility: ONLY solos
   - UI: Hide for non-solos
   - (Lines 820-844)

5. **Pre-Summary Warning Checklist**
   - Show checklist before summary submission
   - Warn about locked dancer classifications
   - (Lines 445-514)

6. **Dancer Classification Locking Rules**
   - Lock on creation
   - Can change ONLY if not attached to routines
   - Show warning message
   - (Lines 217-442)

7. **Solo Age Group Behavior**
   - Solos locked to exact dancer age
   - (Lines 3-6)

8. **Group Age Calculation**
   - Average age, drop decimal
   - (Lines 6-15)

---

## Recommended Actions

### IMMEDIATE (Before Tomorrow's Launch)

1. **User Clarification Required:**
   - **Q1:** Should groups allow manual classification selection, or should classification be locked?
     - Option A: Follow spec (always locked, exception request for changes)
     - Option B: Follow transcript (groups can be manually changed, exception only for 2+ levels or going down)

   - **Q2:** When should "Request Exception" button appear?
     - Option A: ANY classification mismatch (follow spec)
     - Option B: Only when going down OR up 2+ levels (follow transcript)

2. **Implementation Priority:**
   - Wait for user answers to Q1 and Q2 before implementing classification logic
   - Implement extended time pricing display ($5 solo, $2 per dancer groups)
   - Implement title upgrade visibility (hide for non-solos)
   - Add pre-summary warning checklist

### MEDIUM PRIORITY (Post-Launch)

3. **Update Phase 2 Spec:**
   - Add extended time pricing section
   - Add title upgrade section
   - Add pre-summary warning section
   - Add dancer classification locking rules
   - Add solo age group behavior
   - Add group age calculation details
   - **Resolve classification manual override conflict** (update spec to match actual requirements)
   - **Resolve exception trigger conflict** (update spec to match actual requirements)

### LOW PRIORITY (Documentation)

4. **Daily Digest Already Well-Documented:**
   - Spec lines 566-643 have complete implementation details
   - No changes needed

---

## Current Implementation State

### ✅ Already Implemented (Matches Both)
- Exception request workflow (button, modal, CD review flow)
- Summary submission blocking
- Daily digest structure
- Email notifications

### ⚠️ Partially Implemented (Needs Completion)
- Classification display in Auto-Calculated section ✅
- Exception button beside classification ✅
- Classification auto-calculation logic ❌ (Phase 2 coming soon)
- Extended time pricing display ❌ (not showing $5/$2)
- Title upgrade visibility ❌ (shows for all entries)
- Pre-summary checklist ❌ (not implemented)

### ❌ Not Implemented (Blocked by Conflict)
- Classification manual selection for groups (CONFLICT - need user decision)
- Exception request trigger logic (CONFLICT - need user decision)
- Classification +1 bump without exception (CONFLICT - need user decision)

---

## Questions for User

1. **Classification for Groups:**
   - Do you want to allow SDs to manually select classification for groups (like the transcript says)?
   - OR should classification be locked and require exception request for ANY change (like the spec says)?

2. **Exception Request Trigger:**
   - Should exception requests be required for ANY classification change (spec)?
   - OR only for going down or up 2+ levels, with +1 bump allowed without exception (transcript)?

3. **Classification +1 Bump:**
   - Is the +1 bump allowed for groups WITHOUT requesting an exception?
   - OR is ANY change from auto-calculated value an exception request?

---

**Next Step:** Wait for user answers to resolve conflicts before implementing classification logic for tomorrow's launch.
