# Routine Form Fix List - November 4, 2025

**Status:** Deployment in progress (commits c4ea53f, b65a29e, dab78ea)
**Session:** Classification testing + spec alignment

---

## ✅ COMPLETED TODAY

### 1. Dancer Count Production Bug Fixed
- **Issue:** Dashboard showing 50 dancers instead of 100
- **Fix:** Changed default limit from 50 to 1000 in `dancer.ts:48,54`
- **Commit:** c4ea53f

### 2. Test Environment Setup
- **Issue:** Button stayed on admin.compsync.net (no tenant context)
- **Fix:** Redirect to `https://empwr.compsync.net` with reservation ID
- **Commit:** b65a29e

### 3. Test Data Diversified
- **Dancers:** 100 test dancers with realistic names
- **Classifications:** 25 Novice, 25 Adult, 25 Part-Time, 25 Competitive
- **Ages:** 6-18 years old (varied age groups)
- **Database:** Updated via SQL

### 4. Classification Field Added to Dancers
- **Issue:** `SelectedDancer` interface missing `classification_id`
- **Fix:** Added `classification_id` to interface and toggle logic
- **Commit:** dab78ea
- **Result:** Classification auto-calculation will now work

---

## ❌ MISSING FEATURES (From Phase 2 Spec)

### 1. **Age System is WRONG** ⚠️ CRITICAL
**Current:** Uses "Age Groups" (Mini, Junior, Teen, Senior, etc.)
**Required:** Numerical age only (e.g., "Age: 8", "Age: 14")

**Calculation:**
- Solo: Exact dancer age as of Dec 31, 2025
- Group: Average age, drop decimal (e.g., 7.8 → 7)
- Can bump up +1 year without exception

**UI Changes Needed:**
- Remove age group dropdown entirely
- Replace with: "Age: 8" (calculated) with dropdown: [8, 9]
- Age groups used ONLY for overall awards, NOT routine creation

**Files to Change:**
- `useEntryFormV2.ts`: Remove `inferredAgeGroup`, add `calculatedAge`
- `AutoCalculatedSection.tsx`: Replace age group section with age number + bump dropdown
- `EntryFormV2State`: Change `age_group_override` to `age_override: number | null`

---

### 2. **Classification Missing "Use Detected" Default**
**Current:** Dropdown starts blank, user must select
**Required:** Default to "Use detected ([Classification Name])" like size category

**UI Change:**
```tsx
<select value={classificationId} onChange={...}>
  <option value="">Use detected (Novice)</option>
  {classifications.map(...)}
</select>
```

---

### 3. **Remove Fees Notice**
**Current:** Shows purple info box about fees at summary submission
**Required:** Remove entirely

**File:** `AutoCalculatedSection.tsx:321-329`

---

### 4. **Production Auto-Lock NOT IMPLEMENTED** ⚠️ CRITICAL
**Spec:** When size category = "Production":
1. Dance category → Locked to "Production"
2. Classification → Locked to "Production" (level 99)
3. Minimum 10 dancers required

**Current:** Size category auto-calculates but doesn't lock anything

**Implementation Needed:**
```typescript
// In useEntryFormV2.ts or EntryCreateFormV2.tsx
useEffect(() => {
  if (effectiveSizeCategory?.name === 'Production') {
    // Lock dance category
    const productionCategory = categories.find(c => c.name === 'Production');
    if (productionCategory) {
      updateField('category_id', productionCategory.id);
    }

    // Lock classification
    const productionClass = classifications.find(c => c.name === 'Production');
    if (productionClass) {
      updateField('classification_id', productionClass.id);
    }
  }
}, [effectiveSizeCategory]);
```

**UI:** Disable dance category and classification dropdowns when Production selected

---

### 5. **Exception Workflow Changed** ⚠️ CRITICAL
**Old:** Exception button just opens modal
**New:**
1. Clicking "Exception Required" saves routine as **DRAFT**
2. Sends notification to CD for exception evaluation
3. CD approves/rejects exception
4. If approved, SD can submit to summary
5. If rejected, SD must fix classification

**Status Field Needed:** Add `status` enum to entries:
- `draft` - Saved but not submitted
- `pending_classification_exception` - Awaiting CD approval
- `active` - Normal entry
- `cancelled` - Soft deleted

---

### 6. **Group Classification 60% Majority Rule**
**Current:** Simplified to "highest wins"
**Required:** 60% majority threshold, falls back to highest if no majority

**File:** `AutoCalculatedSection.tsx:86` has TODO comment

---

### 7. **Age Bump Validation Missing**
**Current:** Age groups can be overridden to anything
**Required:** Can ONLY select [calculated, calculated+1]

**Example:** If calculated age is 8, dropdown shows only: [8, 9]

---

### 8. **Classification Bump Validation Missing**
**Current:** Dropdown unlocked but no validation
**Required:**
- Solo: Locked to dancer level, +1 bump button
- Group: Can select up to +1 level from auto-calculated
- **Block** +2 levels or going down (trigger exception)

---

## 📋 NEXT SESSION PRIORITIES

### Phase 1: Fix Critical Blockers (2-3 hours)
1. **Age System Rewrite** - Replace age groups with numerical age + bump
2. **Production Auto-Lock** - Lock dance/classification when Production selected
3. **Exception Workflow** - Save as draft + CD notification
4. **Remove Fees Notice** - Delete purple info box

### Phase 2: Polish & Validation (1-2 hours)
5. **Classification "Use Detected"** - Default selection
6. **60% Majority Rule** - Group classification calculation
7. **Bump Validation** - Age +1 only, Classification +1 only

### Phase 3: Testing (1 hour)
8. Test all scenarios with diverse test data
9. Verify on both EMPWR and Glow tenants
10. User acceptance testing

---

## 🗂️ SPEC CONSOLIDATION NEEDED

User request: **Merge Phase 2 Business Logic Spec with Exception Workflow + today's notes**

**Files to Merge:**
1. `LAUNCH_PLAYBOOK/PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md`
2. `SESSION_SUMMARY_NOV4.md`
3. `CLASSIFICATION_APPROVAL_PROGRESS.md`
4. Today's clarifications (above)

**Output:** Single unified `PHASE2_COMPLETE_SPEC_NOV4.md` with:
- Age system (numerical, not groups)
- Classification auto-calculation (with detection default)
- Production auto-lock
- Exception workflow (draft + CD approval)
- All validation rules
- UI mockups
- Implementation pseudocode

---

## 📊 TEST DATA STATUS

**Test Studio - Daniel (djamusic):**
- Owner: SA (danieljohnabrahamson@gmail.com)
- Dancers: 100 with realistic names
- Classifications: 25 Novice, 25 Adult, 25 Part-Time, 25 Competitive
- Ages: 6-18 years old
- Reservation: e0c1eb3f-e9f6-4822-9d8b-0d2de864ae68 (approved, 100 spaces)

**Test URL:**
`https://empwr.compsync.net/dashboard/entries/create?reservation=e0c1eb3f-e9f6-4822-9d8b-0d2de864ae68`

**Access from SA Testing Tools:**
- Login: admin.compsync.net as SA
- Click: "TEST NEW ROUTINE FORM (→ EMPWR tenant)" button

---

## 🔧 DEPLOYMENT STATUS

**Commits Pushed:**
- c4ea53f: Dancer count fix (50→1000)
- b65a29e: Test button tenant redirect
- dab78ea: Classification field added to dancers

**Awaiting Deployment:** ~2-3 minutes from last push
**Hard Refresh Required:** Ctrl+Shift+R after deployment

**Expected After Deployment:**
- 100 dancers visible in form
- Dancers show classifications (Novice, Adult, Part-Time, Competitive)
- Classification auto-calculation works
- Age system still uses groups (needs fix)
- Production auto-lock missing (needs implementation)

---

**End of Fix List**
**Date:** November 4, 2025, 8:45 PM EST
**Next Session:** Implement critical blockers from Phase 1
