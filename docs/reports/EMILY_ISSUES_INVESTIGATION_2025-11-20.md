# Emily's SD Issues - Investigation Report

**Date**: November 20, 2025
**Status**: Simple fixes deployed (cf25e8b), complex issues need discussion

---

## ✅ Simple Fixes Deployed

1. **Dancers default view** → Now opens in table view
2. **Submit button** → Now reads "View/Submit Summary"
3. **Alphabetical sorting** → Entries sorted by entry# then title
4. **Age divisions** → Senior now 15-18, Adult now 19+

**Deployment**: Live on production, Emily can test after hard refresh

---

## 🔍 Complex Issues - Need Your Input

### Issue #2: Senior (age 15) detecting as "Professional/Adult"

**Classifications in Glow DB:**
- Adult: skill_level 0 ✅ (we fixed this)
- Emerald: skill_level 1
- Sapphire: skill_level 2
- Professional Teacher: skill_level 3
- Crystal: skill_level 3
- Titanium: skill_level 4

**Questions for you:**

1. When Emily says "professional/adult" - is this appearing as:
   - "Professional Teacher" (skill_level 3)?
   - "Adult" (skill_level 0)?
   - Both somehow combined?

2. What are the dancers' **individual classifications** in these routines?

3. Is she talking about the auto-detected classification or the selected one?

**Context**: We already changed Adult from skill_level 1→0 to prevent it conflicting with Emerald. But now Emily is reporting it's detecting "professional/adult" for age 15 routines. Need to understand what classification names are actually showing.

---

### Issue #3: Age 4×12yr + 1×11yr → Detects as 11

**Expected behavior**: Code uses OLDEST dancer age (line 79: "MOST RESTRICTIVE RULE")
- Should detect: 12 (oldest)
- Emily sees: 11 (youngest)

**Possible causes:**
1. Different age calculation happening somewhere else
2. Bug in the ageGroupCalculator logic
3. Emily seeing `routine_age` field vs auto-calculated age

**Need from you:**

Can you check the actual routine and tell me:
1. What ages does the UI show for each of the 5 dancers?
2. What does the routine show as "Age" or "Age Group"?
3. Is this in the auto-detection display (gray text) or the saved/selected age (actual field)?

**Important**: Need to see the exact UI Emily is looking at to diagnose this properly.

---

### Issue #4: 1 Emerald + 4 Sapphire → Detects Emerald ✅ **BUG CONFIRMED**

**Root cause found in `AutoCalculatedSection.tsx:109-114`**

**Current logic (WRONG):**
```
Average skill = floor((1+2+2+2+2) / 5) = floor(1.8) = 1
Filter: classifications with skill <= 1 → [Adult(0), Emerald(1)]
Sort DESCENDING by skill → Emerald(1) first
Return: Emerald ❌ WRONG
```

**Problem**: When averaging results in 1.8, we round down to 1, then pick the HIGHEST classification with skill_level <= 1 (Emerald). This is backwards.

**What should the business rule be?**

- **Option A**: Always round DOWN to the LOWER skill level group
  Example: 1 Emerald + 4 Sapphire → Should detect as Emerald (the lower skill)

- **Option B**: Use average but pick LOWEST skill in range
  Example: 1 Emerald + 4 Sapphire → Average 1.8 rounds to 1 → Pick Adult (0) not Emerald (1)

- **Option C**: Round to nearest skill level
  Example: 1 Emerald + 4 Sapphire → Average 1.8 rounds to 2 → Pick Sapphire

**Which option matches your competition rules?**

---

### Issue #7: Capacity counter "50/53" vs "52/53"

**Possible causes:**
1. Withdrawn entries still being counted (unlikely now with hard delete)
2. Draft vs submitted count mismatch
3. Real-time update race condition
4. Different capacity calculation logic in different places

**Need from you:**

1. When does she see the inconsistency?
   - On page load?
   - After deleting a routine?
   - After creating a routine?
   - Random / can't reproduce?

2. Can she screenshot BOTH states when it happens? (50/53 and 52/53)

3. Which counter is this?
   - Bottom LiveSummaryBar (floating at bottom of entries page)?
   - Top EventMetricsGrid (capacity cards at top of CD dashboard)?

**Context**: With the hard delete fix, withdrawn entries should no longer count. But if there's still inconsistency, might be a different issue.

---

## Recommended Next Steps

**Option A**: Fix Issue #4 (classification averaging) first - clear bug with known solution

**Option B**: Get answers to above questions first, then fix everything at once

**Option C**: Ask Emily to test the simple fixes first on production, see if any complex issues resolved

**My recommendation**: Option A - Fix the confirmed bug (#4) now, get answers on #2, #3, #7 for next session.

---

## For Emily to Test (Simple Fixes)

After hard refresh on glow.compsync.net:

1. ✅ Dancers page should open in table view by default
2. ✅ Entries page should open in table view by default
3. ✅ Entries should be sorted alphabetically when entry numbers are same
4. ✅ Submit button should say "View/Submit Summary" not "Submit Summary"
5. ✅ Senior age group should be 15-18 (was 15-16)
6. ✅ Adult age group should be 19+ (was 17+)
7. ✅ Deleted draft routines should disappear completely (not show as withdrawn)

Let me know once she confirms these work, then we'll tackle the complex issues.
