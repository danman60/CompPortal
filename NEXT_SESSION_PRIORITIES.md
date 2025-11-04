# Next Session Priorities - Routine Form Completion

**Date:** November 4, 2025, 9:00 PM EST
**Estimated Time:** 6-8 hours of focused work
**Launch Deadline:** November 8, 2025 (4 days)

---

## 🎯 SESSION START CHECKLIST

1. Read this file first
2. Read `ROUTINE_FORM_FIX_LIST_NOV4.md` for detailed requirements
3. Check latest commits: `git log -5 --oneline`
4. Verify deployment completed for commits: c4ea53f, b65a29e, dab78ea, 7532362

---

## ✅ COMPLETED TODAY (November 4)

### Commits Pushed (4 total)
1. **c4ea53f** - Dancer count fix (50→1000 limit)
2. **b65a29e** - Test button tenant redirect (admin→EMPWR)
3. **dab78ea** - Classification field added to SelectedDancer
4. **7532362** - Display dancer classifications in selection list

### Database Changes
- 100 test dancers updated with realistic names, varied classifications, ages 6-18
- New reservation created for djamusic studio (e0c1eb3f)
- SA made owner of djamusic studio for testing

### Test Environment Ready
- URL: `https://empwr.compsync.net/dashboard/entries/create?reservation=e0c1eb3f-e9f6-4822-9d8b-0d2de864ae68`
- Access: SA Testing Tools → "TEST NEW ROUTINE FORM (→ EMPWR tenant)" button
- 100 dancers visible with classifications displayed

---

## 🔴 CRITICAL BLOCKERS (Must Fix Before Launch)

### 1. Age System Completely Wrong (3-4 hours)
**Status:** NOT STARTED
**Priority:** P0 - Blocks launch

**Current Behavior:**
- Uses "Age Groups" (Mini, Junior, Teen, Senior)
- Shows dropdown with age ranges (e.g., "Mini (5-7 yrs)")
- Age groups are for awards only, NOT routine creation

**Required Behavior:**
- Numerical age only (e.g., "Age: 8", "Age: 14")
- Solo: Exact dancer age as of Dec 31, 2025
- Group: Average age, drop decimal (e.g., 7.8 → 7)
- Dropdown with only 2 options: [calculated, calculated+1]
- Example: If age is 8, show dropdown: ["8", "9"]

**Files to Change:**
```
src/hooks/rebuild/useEntryFormV2.ts
├── Remove: inferredAgeGroup, effectiveAgeGroup
├── Add: calculatedAge: number | null
├── Add: allowedAges: [calculated, calculated+1]
└── Change: age_group_override → age_override: number | null

src/components/rebuild/entries/AutoCalculatedSection.tsx
├── Remove: Lines 140-190 (entire Age Group section)
├── Add: New Age section with numerical display
└── Dropdown: Only 2 options [calculated, calculated+1]

EntryFormV2State interface
└── Change: age_group_override → age_override: number | null
```

**Implementation Pseudocode:**
```typescript
// In useEntryFormV2.ts
const calculatedAge = useMemo(() => {
  if (form.selectedDancers.length === 0 || !eventStartDate) return null;

  const cutoffDate = new Date(eventStartDate.getFullYear(), 11, 31); // Dec 31

  if (form.selectedDancers.length === 1) {
    // Solo: Exact age
    return calculateAgeAtEvent(form.selectedDancers[0].date_of_birth);
  }

  // Group: Average age, drop decimal
  const ages = form.selectedDancers
    .map(d => calculateAgeAtEvent(d.date_of_birth))
    .filter(age => age !== null);

  const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return Math.floor(avgAge);
}, [form.selectedDancers, eventStartDate]);

const effectiveAge = form.age_override || calculatedAge;
const allowedAges = calculatedAge ? [calculatedAge, calculatedAge + 1] : [];
```

**UI Mockup:**
```tsx
<div>
  <label>Age</label>
  <div className="detected">
    Calculated: {calculatedAge} (can select {calculatedAge} or {calculatedAge + 1})
  </div>
  <select value={effectiveAge} onChange={...}>
    <option value={calculatedAge}>Age {calculatedAge} (use calculated)</option>
    <option value={calculatedAge + 1}>Age {calculatedAge + 1} (+1 bump)</option>
  </select>
</div>
```

---

### 2. Production Auto-Lock Missing (2 hours)
**Status:** NOT STARTED
**Priority:** P0 - Blocks launch

**Spec Reference:** PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md lines 326-373

**Requirements:**
When size category = "Production":
1. Dance category → Auto-locked to "Production"
2. Classification → Auto-locked to "Production" (level 99)
3. Minimum 10 dancers required
4. Both dropdowns disabled with "(locked)" suffix

**Implementation:**
```typescript
// In EntryCreateFormV2.tsx or useEntryFormV2.ts
useEffect(() => {
  if (effectiveSizeCategory?.name === 'Production') {
    // Lock dance category
    const productionCategory = categories.find(c => c.name === 'Production');
    if (productionCategory && form.category_id !== productionCategory.id) {
      updateField('category_id', productionCategory.id);
    }

    // Lock classification
    const productionClass = classifications.find(c => c.name === 'Production');
    if (productionClass && form.classification_id !== productionClass.id) {
      updateField('classification_id', productionClass.id);
    }
  }
}, [effectiveSizeCategory, categories, classifications]);

// Validation
if (effectiveSizeCategory?.name === 'Production' && selectedDancers.length < 10) {
  errors.push('Productions require minimum 10 dancers');
}
```

**UI Changes:**
- Disable dance category dropdown when Production
- Disable classification dropdown when Production
- Show helper text: "(locked for productions)"
- Red error if < 10 dancers

---

### 3. Exception Workflow Changed (1-2 hours)
**Status:** NOT STARTED
**Priority:** P0 - Blocks launch

**Old Behavior:**
- "Exception Required" button just opens modal
- User fills out request, submits
- Entry saves normally

**New Behavior:**
1. Click "Exception Required" → Open modal
2. User writes justification
3. **Save routine as DRAFT status**
4. Send email notification to CD
5. CD reviews and approves/rejects
6. If approved → SD can submit to summary
7. If rejected → SD must fix classification

**Database Changes:**
```sql
-- Add status column to competition_entries if not exists
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Allowed statuses:
-- 'draft' - Saved but not submitted (has pending exception)
-- 'pending_classification_exception' - Awaiting CD approval
-- 'active' - Normal entry, submitted to summary
-- 'cancelled' - Soft deleted
```

**Implementation:**
```typescript
// When "Exception Required" clicked:
1. Open modal for justification
2. On submit:
   - Save entry with status='draft'
   - Create classification_exception_request record
   - Send email to CD
   - Show toast: "Routine saved as draft. CD will review exception request."
3. Block summary submission if any entries have status='draft'
```

---

## 🟡 IMPORTANT FIXES (Should Fix)

### 4. Classification "Use Detected" Default (30 min)
**Status:** NOT STARTED
**Priority:** P1 - Polish

**Current:** Dropdown starts blank
**Required:** Default to detected classification like size category

```tsx
<select value={classificationId} onChange={...}>
  <option value="">Use detected (Novice)</option>
  {classifications.map(...)}
</select>
```

---

### 5. Remove Fees Notice (5 min)
**Status:** NOT STARTED
**Priority:** P1 - Polish

**File:** `AutoCalculatedSection.tsx:321-329`
**Action:** Delete the purple info box about fees at summary submission

---

### 6. Group Classification 60% Majority Rule (1 hour)
**Status:** NOT STARTED (TODO comment exists)
**Priority:** P2 - Enhancement

**Current:** Simplified to "highest wins" (AutoCalculatedSection.tsx:86)
**Required:** 60% majority threshold, falls back to highest if no majority

**Spec:** PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md lines 153-196

```typescript
function calculateMajorityClassification(dancers, classifications) {
  const counts = {};
  const total = dancers.length;

  // Count dancers per classification
  dancers.forEach(d => {
    if (!d.classification_id) return;
    counts[d.classification_id] = (counts[d.classification_id] || 0) + 1;
  });

  // Find 60%+ majority
  for (const [classId, count] of Object.entries(counts)) {
    if (count / total >= 0.6) {
      return classifications.find(c => c.id === classId);
    }
  }

  // No clear majority: return highest
  return getHighestClassification(dancers, classifications);
}
```

---

### 7. Validation for +1 Bump Only (1 hour)
**Status:** NOT STARTED
**Priority:** P2 - Enhancement

**Age:** Can only select [calculated, calculated+1] (handled by dropdown options)

**Classification:**
- Solo: Locked to dancer level, +1 via button only
- Group: Can select up to +1 level from auto-calculated
- Block +2 or going down (show exception button)

**Current:** Exception button appears but doesn't block save
**Required:** Validation that enforces +1 maximum

---

## 📦 DELIVERABLES BY END OF SESSION

### Code Changes
- [ ] Age system rewritten to numerical (no age groups)
- [ ] Production auto-lock implemented (dance + classification)
- [ ] Exception workflow updated (save as draft + CD notification)
- [ ] Classification defaults to "Use detected"
- [ ] Fees notice removed
- [ ] 60% majority rule implemented (optional)
- [ ] +1 bump validation added (optional)

### Documentation
- [ ] Update ROUTINE_FORM_FIX_LIST_NOV4.md with completion status
- [ ] Create PHASE2_COMPLETE_SPEC_NOV4.md (merged spec)
- [ ] Update PROJECT_STATUS.md

### Testing
- [ ] Test with 1 dancer (solo) - age locked, classification locked, +1 bump works
- [ ] Test with 3 dancers (group) - average age (drop decimal), classification auto-calc
- [ ] Test with 10+ dancers selecting Production size - dance/classification lock
- [ ] Test exception workflow - saves as draft, CD notified
- [ ] Verify on both EMPWR and Glow tenants

---

## 🧪 TEST SCENARIOS

### Solo Classification Lock
1. Select 1 dancer (Novice, age 8)
2. Verify: Classification dropdown DISABLED, shows "Novice"
3. Verify: "+1 Bump" button appears
4. Click "+1 Bump"
5. Verify: Classification changes to Adult (next level up)
6. Verify: No exception required for +1 bump

### Group Classification Auto-Calc
1. Select 3 dancers: 1 Novice, 2 Part-Time
2. Verify: Auto-calculated as Part-Time (60% majority)
3. Verify: Dropdown unlocked, can select Part-Time or Competitive
4. Select Novice (going down)
5. Verify: "Exception Required" button appears
6. Click exception button
7. Verify: Modal opens, can write justification
8. Submit exception
9. Verify: Routine saves as DRAFT status

### Age Numerical Calculation
1. Select 1 dancer (DOB: 2010-06-15)
2. Event: Dec 31, 2025
3. Verify: Age shows "15" (not age group)
4. Verify: Dropdown shows only ["15", "16"]
5. Select 16
6. Verify: No exception needed

### Production Auto-Lock
1. Select 10 dancers
2. Verify: Size category auto-detects as "Large Group"
3. Manually change size override to "Production"
4. Verify: Dance category locked to "Production" (disabled)
5. Verify: Classification locked to "Production" (disabled)
6. Remove 5 dancers (now 5 total)
7. Verify: Red error "Productions require minimum 10 dancers"

---

## 📊 CURRENT STATE SUMMARY

**Working:**
- ✅ Dancer selection with 100 test dancers
- ✅ Classifications visible in dancer list
- ✅ Size category auto-calculation
- ✅ Classification auto-calculation (basic - highest wins)
- ✅ Extended time pricing ($5 solo / $2 per dancer)
- ✅ Title upgrade (solos only)
- ✅ Exception button appears when +2/down detected

**Broken/Missing:**
- ❌ Age uses groups instead of numbers
- ❌ Production doesn't lock dance/classification
- ❌ Exception doesn't save as draft
- ❌ Classification doesn't default to "Use detected"
- ❌ Fees notice still showing (should remove)
- ❌ 60% majority rule not implemented
- ❌ +1 bump not validated

---

## 🔧 DEVELOPMENT NOTES

### Test Environment
- **URL:** `https://empwr.compsync.net/dashboard/entries/create?reservation=e0c1eb3f-e9f6-4822-9d8b-0d2de864ae68`
- **Login:** admin.compsync.net as SA, click test button
- **Studio:** Test Studio - Daniel (djamusic)
- **Dancers:** 100 with varied classifications and ages
- **Reservation:** e0c1eb3f (approved, 100 spaces)

### Important Files
```
src/hooks/rebuild/useEntryFormV2.ts         - Form state & logic
src/components/rebuild/entries/
├── EntryCreateFormV2.tsx                   - Main form component
├── AutoCalculatedSection.tsx               - Age/size/classification display
├── DancerSelectionSection.tsx              - Dancer list with classifications
├── RoutineDetailsSection.tsx               - Title, category, choreographer
└── ExtendedTimeSection.tsx                 - Extended time request
```

### Build & Deploy
```bash
npm run build                               # Must pass before commit
git add -A && git commit -m "..."          # 8-line format
git push                                    # Vercel auto-deploys
# Wait 2-3 minutes, hard refresh (Ctrl+Shift+R)
```

### Database
- EMPWR tenant: `00000000-0000-0000-0000-000000000001`
- Glow tenant: `4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5`
- Always test on BOTH tenants for data changes
- Use Supabase MCP for all SQL operations

---

## 💡 TIPS FOR SUCCESS

1. **Start with Age System** - It's the most complex, affects everything else
2. **Test frequently** - After each major change, test on production
3. **Read ROUTINE_FORM_FIX_LIST_NOV4.md** - Has detailed pseudocode
4. **Check Phase 2 Spec** - Reference for all business rules
5. **Use TodoWrite** - Track progress, prevents forgetting tasks
6. **Hard refresh after deploy** - Ctrl+Shift+R to see changes
7. **Don't batch commits** - Commit after each feature works

---

## 📞 BLOCKERS & QUESTIONS

If you encounter:
- Uncertainty about business logic → Check PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md
- UI/UX questions → Ask user for clarification
- Database schema issues → Use Supabase MCP to inspect
- Build failures → Read error carefully, check imports
- Can't reproduce issue → Use Playwright MCP to test on production

---

**End of Next Session Priorities**
**Last Updated:** November 4, 2025, 9:00 PM EST
**Next Session:** Start here, complete critical blockers first
