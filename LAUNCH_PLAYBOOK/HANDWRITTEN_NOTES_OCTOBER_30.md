# Handwritten Notes from October 30 Demo Meeting

**Source:** Daniel's handwritten notes during/after meeting
**Priority:** These are items he deemed important enough to write down

---

## 🐛 BUGS / ISSUES TO FIX

### 1. Title Incorrectly Duplicated on Routine Entry
**Issue:** Routine title showing duplicated somehow
**Location:** Routine creation form
**Priority:** P1 (UX bug)

---

## ✅ ENFORCEMENTS NEEDED (CRITICAL)

### 2. Enforce Choreographer on Entry Creation
**Rule:** Choreographer field REQUIRED when creating routine
**Current:** Optional
**Change:** Make NOT NULL, add UI validation
**Priority:** P0

### 3. Enforce Birth Date on Dancer Creation
**Rule:** Birth date REQUIRED when creating dancer
**Current:** Optional (allows blank)
**Change:** Make NOT NULL, add UI validation
**Why Critical:** Age calculation depends on this
**Priority:** P0

### 4. Enforce Dancer Classification (SUPER IMPORTANT)
**Rule:** Classification REQUIRED when creating dancer
**Current:** Optional
**Change:** Make NOT NULL, add UI validation
**Note:** Handwritten "SUPER IMPORTANT" - aligns with transcript discovery
**Priority:** P0 (HIGHEST)

---

## 🗑️ FIELDS TO REMOVE

### 5. Remove Gender on Dancer Creation and Dancer Altogether
**Action:** Delete gender field from:
- Dancer creation form
- Dancer edit form
- Dancers table schema
- All related components
**Reason:** Not needed for competition management
**Priority:** P1 (cleanup)

### 6. Remove Email and Phone on Dancer Creation
**Action:** Delete from dancer creation/edit forms:
- Email field
- Phone field
**Keep:** Studio contact info (studio-level only)
**Reason:** Parent/dancer contact not needed, studio is contact point
**Priority:** P1 (simplification)

---

## 💰 DEPOSIT & PRICING DISPLAY

### 7. Deposit Viewable Important on SD Account Claiming
**Feature:** When studio director claims account and logs in first time
**Must Show:** Deposit amount already paid (from seeded data)
**Location:** Dashboard or reservation details
**Why Important:** Studios need to see their deposit reflected immediately
**Priority:** P0 (part of seeding workflow)

### 8. Remove Running Price Total on Routine Creation Prior to Summary
**Current:** Routine creation shows running total as entries added
**Change:** Hide price calculations until summary submission
**Reason:** Pricing finalized at invoice generation (with discounts/credits)
**Show Total:** Only after summary submitted, when CD generates invoice
**Priority:** P1 (reduce confusion)

---

## ⚠️ WARNING MESSAGES

### 9. Warning for 24 Hours Wait to Submit on Summary Submission
**Message:** "Please allow up to 24 hours for invoice generation after submitting your summary"
**Location:** Summary submission confirmation screen
**Why:** Sets expectation that CD needs time to review and create invoice
**Timing:** Before Dec 23rd deadline, studios need to account for this
**Priority:** P1 (expectation management)

---

## 🎨 UI/UX FIXES

### 10. New Routine v2 Needs Nav Back
**Issue:** Entry creation v2 form missing back navigation
**Location:** `/dashboard/entries-rebuild/create` or similar
**Add:** Back button/breadcrumb navigation
**Priority:** P1 (usability)

---

## 📋 AGE CATEGORY CLARIFICATION (REITERATED)

### 11. Age Category for Scheduling ≠ Age Category for Awards
**Scheduling Ages:**
- Exact numbers (5-year-old, 12-year-old)
- Drop decimal for groups
- Shown during routine creation

**Award Ages:**
- Named brackets (Tiny, Mini, Junior, Senior, etc.)
- Only for overall awards tabulation
- NOT shown during routine creation

**Current Issue:** System shows award age names instead of scheduling ages
**Fix Required:** Display calculated age number, not age group name
**Priority:** P0 (already captured in transcript summary)

---

## 🔄 CROSS-REFERENCE WITH TRANSCRIPT

**Items that match transcript discoveries:**
- ✅ Enforce dancer classification (SUPER IMPORTANT) - matches transcript P0
- ✅ Deposit viewable on account claiming - matches seeding workflow
- ✅ Age category distinction - matches transcript discovery
- ✅ Enforce choreographer - additional enforcement not in transcript
- ✅ Enforce birth date - additional enforcement not in transcript
- ✅ Remove gender/email/phone - simplification not in transcript
- ✅ Remove running price total - UX improvement not in transcript
- ✅ 24-hour wait warning - expectation setting not in transcript

**New items (not in transcript):**
1. Title duplication bug
2. Remove gender field entirely
3. Remove email/phone from dancers
4. Running price total removal
5. 24-hour wait warning
6. Nav back button missing

---

## ✅ CONSOLIDATED PRIORITY LIST

### P0 (MUST HAVE BEFORE ROUTINE CREATION):
1. **Enforce dancer classification** (SUPER IMPORTANT)
2. **Enforce birth date on dancer creation**
3. **Enforce choreographer on entry creation**
4. **Deposit viewable on SD account claiming**
5. **Age category display fix** (numbers not names)
6. *(All transcript P0 items: Production logic, classification rules, scheduling notes)*

### P1 (HIGH PRIORITY):
1. **Fix title duplication bug**
2. **Remove gender field entirely**
3. **Remove email/phone from dancer creation**
4. **Remove running price total before summary**
5. **Add 24-hour wait warning on summary**
6. **Add nav back button to New Routine v2**

---

**Notes:**
- Items marked "SUPER IMPORTANT" handwritten - developer's own assessment
- Deposit visibility critical for seeding workflow trust
- Enforcement additions (choreographer, birth date) prevent incomplete data
- Removals (gender, email, phone) simplify UX and reduce confusion
- Warnings (24-hour wait) manage expectations

**Next Step:** Integrate these with transcript discoveries into single implementation plan
