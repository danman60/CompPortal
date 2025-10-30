# Session Handoff: EMPWR Settings Fix

**Date:** October 30, 2025
**Status:** Ready to execute
**Estimated Time:** 2 hours
**Risk Level:** Medium (database changes with 18 existing entries)

---

## Context Summary

**Decision Made:** Tenant settings are hardcoded (not competition-editable). Each tenant (EMPWR, Glow) has their own fixed settings stored in lookup tables with `tenant_id` filtering.

**Current System:**
- ✅ Entry creation uses lookup tables with tenant_id filtering
- ✅ Fee calculation works perfectly ($115 solo, $70 duet, $55 groups)
- ✅ Invoice generation works
- ❌ Lookup table data doesn't match EMPWR PDF brochure
- ⚠️ Some lookup queries missing tenant_id filters (security issue)

**Source of Truth:** `src/lib/empwrDefaults.ts` matches PDF perfectly

---

## Critical Files Created This Session

1. **SIMPLE_PLAN_EMPWR_SETTINGS.md** - 8th grade explanation of plan
2. **TENANT_SETTINGS_ARCHITECTURE.md** - Complete architecture documentation
3. **EMPWR_PDF_VS_DATABASE_BREAKDOWN.md** - Detailed comparison with migration code
4. **HARDCODED_VALUES_SCAN.md** - Verification no hardcoded values in code

---

## Execution Plan (In Order)

### Phase 1: Fix Unsafe Lookup Queries ⚠️ SECURITY
**File:** `src/server/routers/lookup.ts`
**Lines:** 8-42

**Problem:** Public procedures without tenant_id filtering could leak cross-tenant data

**Options:**
A. Add tenant_id filters to these procedures
B. Delete them (entry form uses `getAllForEntry` which IS safe)

**Procedures to fix/delete:**
- `getCategories` (line 8)
- `getClassifications` (line 20)
- `getAgeGroups` (line 29)
- `getEntrySizeCategories` (line 38)

**Recommendation:** Delete them. They're unused (entry form uses protected `getAllForEntry`).

---

### Phase 2: Pre-Flight Checks ✅ REQUIRED

**Check 1: Which classifications are used?**
```sql
SELECT
  c.name as classification_name,
  COUNT(ce.id) as entry_count
FROM classifications c
LEFT JOIN competition_entries ce ON ce.classification_id = c.id
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY c.id, c.name
ORDER BY c.name;
```

**Check 2: Any scores exist?**
```sql
SELECT COUNT(*) as scored_entries
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND score IS NOT NULL;
```
**Expected:** 0 (competition hasn't happened yet)

---

### Phase 3: Fix Age Groups (12→6)

**Current State:**
- 12 age groups (duplicates, wrong ranges, 18 entries affected)

**Target State:**
- 6 age groups matching PDF

**Steps:**
1. Migrate 2 entries from "Senior+ (17+)" to "Adult (18-999)"
2. Update "Mini (7-8)" → min_age=6
3. Update "Junior (11-12)" → min_age=9
4. Update "Senior (15-16)" → max_age=17
5. Update "Adult" → max_age=99, sort_order=6
6. Update "Intermediate" → sort_order=4
7. Delete: Pre Junior, Teen, Senior+, 3 orphans (Junior, Petite, Teen with sort_order=null)

**SQL:** See EMPWR_PDF_VS_DATABASE_BREAKDOWN.md lines 147-195

---

### Phase 4: Add Missing Dance Styles (9→14)

**Add:**
- Contemporary Ballet (sort 9)
- Open (sort 11)
- Song & Dance (sort 12)
- Modern (sort 13)
- Production (sort 14)

**Rename:**
- "Ballet" → "Classical Ballet"
- "Hip Hop" → "Hip-Hop"

**Fix sort_order:** Reorder all to match PDF sequence

**SQL:** See EMPWR_PDF_VS_DATABASE_BREAKDOWN.md lines 237-292

---

### Phase 5: Fix Classifications (5→3)

**DEPENDS ON:** Phase 2 Check 1 results

**Target:**
- Novice (new)
- Part-Time (new or renamed from Recreational)
- Competitive (update description)

**Delete:** Crystal, Elite, Titanium, Recreational (after migrating entries)

**Decision needed:** How to migrate existing entries?
- Recreational → Part-Time?
- Crystal/Elite → Competitive?

**SQL:** See EMPWR_PDF_VS_DATABASE_BREAKDOWN.md lines 339-423

---

### Phase 6: Fix Scoring System (5→6)

**DEPENDS ON:** Phase 2 Check 2 result = 0

**Target:**
- Bronze (0-84)
- Silver (84-86.99)
- Gold (87-89.99)
- Titanium (90-92.99) NEW
- Platinum (93-95.99)
- Pandora (96-100) NEW

**Delete:** All 5 existing, create 6 new

**SQL:** See EMPWR_PDF_VS_DATABASE_BREAKDOWN.md lines 478-535

---

### Phase 7: Replace Competition Settings Page

**Current:** `src/app/dashboard/settings/competition/page.tsx` + `CompetitionSettingsForm.tsx`
**Queries:** Orphaned `competition_settings` table (wrong data source)

**New Approach:**
- Query lookup tables (age_groups, dance_categories, etc.)
- Display read-only
- Show: "These are your EMPWR settings. Contact support to change."

**Create:** New component `CompetitionSettingsDisplay.tsx`

**Structure:**
```tsx
- Age Divisions section (6 items from age_groups)
- Classifications section (3 items from classifications)
- Dance Styles section (14 items from dance_categories)
- Entry Sizes & Fees section (6 items from entry_size_categories)
- Scoring System section (6 items from scoring_tiers)
```

---

### Phase 8: Add Title Upgrade Checkbox

**File:** `src/components/rebuild/entries/RoutineDetailsSection.tsx`

**Add after line 136 (after special_requirements):**
```tsx
{/* Title Upgrade */}
<div className="flex items-center gap-3">
  <input
    type="checkbox"
    id="is_title_upgrade"
    checked={form.is_title_upgrade}
    onChange={(e) => updateField('is_title_upgrade', e.target.checked)}
    className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-2 focus:ring-purple-500"
  />
  <label htmlFor="is_title_upgrade" className="text-sm font-medium text-gray-300">
    Title Division Upgrade (+$30)
  </label>
</div>
```

**Hook:** `src/hooks/rebuild/useEntryFormV2.ts` needs `is_title_upgrade: boolean` in state

**Backend:** Already accepts it (entry.ts line 94)

---

### Phase 9: Testing Checklist

**On production (empwr.compsync.net):**

1. **Create Test Entry:**
   - Age Groups dropdown: 6 options? ✓
   - Dance Styles dropdown: 14 options? ✓
   - Classifications dropdown: 3 options? ✓
   - Solo fee: $115? ✓
   - Duet (2 dancers) fee: $140? ✓
   - Small Group (7 dancers) fee: $385? ✓
   - Title upgrade checkbox visible? ✓
   - Title upgrade adds $30? ✓

2. **View Settings Page:**
   - Navigate to Competition Settings (top right button)
   - All sections display correctly? ✓
   - Data matches EMPWR PDF? ✓

3. **Check Invoice:**
   - Generate invoice from test entry
   - Line items correct? ✓
   - Totals accurate? ✓

4. **Clean Up:**
   - Delete test entry
   - Verify no orphaned data

---

## Rollback Plan

**If something breaks:**

1. **Age Groups:** Re-insert deleted rows (save IDs before deleting)
2. **Classifications:** Re-insert deleted rows
3. **Scoring Tiers:** Re-insert deleted rows
4. **Supabase Point-in-Time Recovery:** Can restore to before changes

**Prevention:**
- Run each phase separately
- Verify after each phase
- Don't delete rows until migration confirmed

---

## Success Criteria

- [ ] All lookup queries have tenant_id filters
- [ ] Age groups: 6 clean options (Micro, Mini, Junior, Intermediate, Senior, Adult)
- [ ] Dance styles: 14 options matching PDF
- [ ] Classifications: 3 options (Novice, Part-Time, Competitive)
- [ ] Scoring: 6 tiers (Bronze through Pandora)
- [ ] Competition Settings page displays read-only data
- [ ] Title upgrade checkbox functional
- [ ] Test entry created successfully
- [ ] Invoice generates correctly
- [ ] All 18 existing entries still valid (no broken FK references)

---

## Known Risks

1. **Deleting age groups used by 18 entries:** Mitigate by migrating entries first
2. **Changing scoring after scores exist:** Check first, abort if scores found
3. **Breaking Glow tenant:** Always filter by EMPWR tenant_id
4. **Frontend cache:** Hard refresh (Ctrl+Shift+R) after changes

---

## Questions To Answer

1. **Staging environment?** Or execute on production directly?
2. **Backup first?** Can Supabase do point-in-time restore?
3. **Review SQL?** Show each command before executing?
4. **Classification migration:** How to map Crystal/Elite/Titanium entries?

---

## EMPWR Tenant ID (Critical)

**Always verify working on:**
```
00000000-0000-0000-0000-000000000001
```

**Glow tenant (don't touch):**
```
4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5
```

---

## Next Session Start

1. Load this handoff document
2. Review plan with user
3. Get approval for classification migration strategy
4. Execute phases 1-9 in order
5. Test thoroughly
6. Document completion

---

**Status:** Ready to execute. All analysis complete. SQL migrations prepared. Just need user approval to proceed.
