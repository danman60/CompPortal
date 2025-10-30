# EMPWR Settings: PDF vs Database Full Breakdown

**Date:** October 30, 2025
**Source of Truth:** EMPWR Digital Brochure PDF (15 pages)
**Tenant:** EMPWR Dance Experience (`00000000-0000-0000-0000-000000000001`)

---

## Executive Summary

**Current State:** Database has significant discrepancies from official PDF brochure:
- ✅ **Entry Size Categories:** Perfect match (6 categories, correct ranges)
- ⚠️ **Age Divisions:** CRITICAL - 12 in DB vs 6 in PDF (duplicates + wrong ranges)
- ⚠️ **Dance Styles:** Missing 5 styles from PDF
- ❌ **Classifications:** COMPLETELY WRONG - Using generic names instead of PDF system
- ❌ **Scoring System:** COMPLETELY WRONG - Different tiers and ranges
- ❌ **Entry Fees:** Unknown - No fee structure stored per category

**Risk Level:** HIGH - Current settings don't match client's published rules

---

## 1. AGE DIVISIONS: CRITICAL MISMATCH

### PDF Says (6 Divisions)
```
1. MICRO        → 5 & UNDER     (0-5)
2. MINI         → 6-8           (6-8)
3. JUNIOR       → 9-11          (9-11)
4. INTERMEDIATE → 12-14         (12-14)
5. SENIOR       → 15-17         (15-17)
6. ADULT        → 18+           (18-99)
```

### Database Has (12 Divisions)
```sql
sort_order 0:  Micro              (0-5)    ✅ CORRECT - 3 entries
sort_order 1:  Mini (7-8)         (7-8)    ❌ WRONG AGE - Should be 6-8 - 11 entries
sort_order 2:  Pre Junior (9-10)  (9-10)   ❌ NOT IN PDF - 0 entries
sort_order 3:  Junior (11-12)     (11-12)  ❌ WRONG AGE - Should be 9-11 - 0 entries
sort_order 4:  Teen (13-14)       (13-14)  ❌ WRONG NAME - Should be "Intermediate" - 0 entries
sort_order 5:  Senior (15-16)     (15-16)  ❌ WRONG AGE - Should be 15-17 - 2 entries
sort_order 6:  Senior+ (17+)      (17-99)  ❌ NOT IN PDF - 2 entries
sort_order 7:  Intermediate       (12-14)  ✅ NAME/AGE CORRECT but duplicate of Teen - 0 entries
sort_order 10: Adult              (18-999) ✅ CORRECT - 0 entries

sort_order NULL: Junior           (9-11)   ❌ DUPLICATE (orphan) - 0 entries
sort_order NULL: Petite           (5-8)    ❌ NOT IN PDF (orphan) - 0 entries
sort_order NULL: Teen             (12-14)  ❌ DUPLICATE (orphan) - 0 entries
```

### Issues
1. **Mini wrong age:** DB has 7-8, PDF says 6-8
2. **Pre Junior doesn't exist** in PDF
3. **Junior wrong age:** DB has 11-12, PDF says 9-11
4. **Teen vs Intermediate:** DB has both, PDF only uses "INTERMEDIATE"
5. **Senior wrong age:** DB has 15-16, PDF says 15-17
6. **Senior+ doesn't exist** in PDF (18+ is called "ADULT")
7. **Three orphaned duplicates** with sort_order=null

### Impact
- **18 total entries** across EMPWR competitions
- **11 entries** use wrong Mini (7-8) - will need migration
- **2 entries** use Senior (15-16) - will need migration
- **2 entries** use Senior+ (17+) - will need migration
- **3 entries** use correct Micro
- **3 orphans** have 0 entries (safe to delete)

### Recommended Fix
**Option 1: Surgical Fix (Recommended)**
1. Rename "Mini (7-8)" → "Mini" and update age to 6-8 (affects 11 entries)
2. Delete "Pre Junior (9-10)" (0 entries, safe)
3. Rename "Junior (11-12)" → "Junior" and update age to 9-11 (0 entries, safe)
4. Delete "Teen (13-14)" (0 entries, keep Intermediate instead)
5. Rename "Senior (15-16)" → "Senior" and update age to 15-17 (affects 2 entries)
6. Migrate 2 entries from "Senior+ (17+)" to "Adult" (18-999), then delete Senior+
7. Delete 3 orphans (Junior, Petite, Teen with sort_order=null)
8. Update sort_order to match PDF (0-5)

**Option 2: Clean Slate (Risky)**
- Delete all 12, recreate 6 from PDF
- Requires migrating 18 existing entries to new IDs
- Higher risk of data loss

---

## 2. DANCE STYLES: 5 MISSING

### PDF Says (14 Styles)
```
1.  Classical Ballet      ← PDF uses "Classical"
2.  Tap
3.  Jazz
4.  Lyrical
5.  Contemporary
6.  Hip-Hop               ← PDF uses hyphen
7.  Musical Theatre
8.  Pointe
9.  Contemporary Ballet   ❌ MISSING FROM DB
10. Acro
11. Open                  ❌ MISSING FROM DB
12. Song & Dance          ❌ MISSING FROM DB
13. Modern                ❌ MISSING FROM DB
14. Production            ❌ MISSING FROM DB
```

### Database Has (9 Styles)
```sql
1. Ballet              ← Should be "Classical Ballet"
2. Jazz                ✅ CORRECT
3. Lyrical             ✅ CORRECT
4. Contemporary        ✅ CORRECT
5. Hip Hop             ← Should be "Hip-Hop" (with hyphen)
6. Tap                 ✅ CORRECT
7. Acro                ✅ CORRECT
8. Musical Theatre     ✅ CORRECT
9. Pointe              ✅ CORRECT
```

### Issues
1. **Missing 5 styles:** Contemporary Ballet, Open, Song & Dance, Modern, Production
2. **Naming mismatch:** "Ballet" should be "Classical Ballet"
3. **Hyphen inconsistency:** "Hip Hop" should be "Hip-Hop"

### Recommended Fix
1. Rename "Ballet" → "Classical Ballet"
2. Rename "Hip Hop" → "Hip-Hop"
3. Add 5 new styles with sort_order 9-14:
   - Contemporary Ballet (9)
   - Open (11)
   - Song & Dance (12)
   - Modern (13)
   - Production (14)

**Risk:** LOW - Adding new styles is safe, renames are safe

---

## 3. CLASSIFICATIONS: COMPLETELY WRONG

### PDF Says (3 Classifications)
```
1. NOVICE
   - Solo: Never competed in a solo in any style
   - Duet/Trio: Never competed in solo/duet/trio, 100% novice
   - Groups: At least 75% novice dancers

2. PART-TIME
   - Training: 6 hours or less per week
   - Solo: Never competed in competitive solo, trains ≤6hrs/week
   - Duet/Trio: Never competed in competitive solo/duet/trio, ≤6hrs/week, 100% part-time
   - Groups: At least 75% part-time dancers

3. COMPETITIVE
   - Any dancer training more than 6 hours per week
```

### Database Has (5 Classifications)
```sql
1. Competitive     ← Exists but description wrong
2. Crystal         ❌ NOT IN PDF
3. Elite           ❌ NOT IN PDF
4. Recreational    ❌ NOT IN PDF (similar to Part-Time but different)
5. Titanium        ❌ NOT IN PDF (confused with scoring tier?)
```

### Issues
1. **NONE of the PDF classifications exist** except "Competitive"
2. **Missing Novice** (critical - PDF shows it on page 4)
3. **Missing Part-Time** (critical - PDF shows it on page 4)
4. **Extra classifications** that don't exist in PDF rules
5. **Descriptions are generic**, not matching PDF's specific rules

### Recommended Fix
**BREAKING CHANGE - Check entries first**

Query needed:
```sql
SELECT c.name, COUNT(ce.id) as entries_count
FROM classifications c
LEFT JOIN competition_entries ce ON ce.classification_id = c.id
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY c.id, c.name;
```

**Option 1: Clean Slate**
- Delete all 5 classifications
- Create 3 from PDF (Novice, Part-Time, Competitive)
- Migrate existing entries (need user decision on mapping)

**Option 2: Surgical**
- Keep "Competitive" (update description)
- Map "Recreational" → "Part-Time" (entries need migration)
- Add "Novice"
- Delete Crystal, Elite, Titanium
- Ask user: How to map existing entries?

---

## 4. SCORING SYSTEM: COMPLETELY WRONG

### PDF Says (6 Tiers)
```
BRONZE    → 84.00 and under    (0.00 - 84.00)
SILVER    → 84.00 - 86.99      (84.00 - 86.99)
GOLD      → 87.00 - 89.99      (87.00 - 89.99)
TITANIUM  → 90.00 - 92.99      (90.00 - 92.99)  ❌ MISSING FROM DB
PLATINUM  → 93.00 - 95.99      (93.00 - 95.99)
PANDORA   → 96.00+             (96.00 - 100.00) ❌ MISSING FROM DB
```

### Database Has (5 Tiers)
```sql
1. Platinum  → 95.00 - 100.00   ← WRONG RANGE (should be 93-95.99)
2. Diamond   → 90.00 - 94.99    ❌ NOT IN PDF
3. Gold      → 85.00 - 89.99    ← WRONG RANGE (should be 87-89.99)
4. Silver    → 80.00 - 84.99    ← WRONG RANGE (should be 84-86.99)
5. Bronze    → 0.00 - 79.99     ← WRONG RANGE (should be 0-84)
```

### Score Range Comparison
| Tier | PDF Range | DB Range | Match? |
|------|-----------|----------|--------|
| Bronze | 0-84 | 0-79.99 | ❌ Gap: 80-84 missing |
| Silver | 84-86.99 | 80-84.99 | ❌ Complete mismatch |
| Gold | 87-89.99 | 85-89.99 | ❌ Starts too early |
| Titanium | 90-92.99 | N/A (Diamond 90-94.99) | ❌ Wrong tier name + range |
| Platinum | 93-95.99 | 95-100 | ❌ Wrong range |
| Pandora | 96-100 | N/A | ❌ Missing entirely |

### Issues
1. **Missing 2 tiers:** Titanium, Pandora
2. **Extra tier:** Diamond (doesn't exist in PDF)
3. **ALL ranges are wrong** except they overlap correctly
4. **Tier names mismatch** at high end

### BREAKING CHANGE WARNING
**If any entries have been scored:**
- Scores 80-84: Currently "Silver", should be "Bronze"
- Scores 85-86.99: Currently "Gold", should be "Silver"
- Scores 90-92.99: Currently "Diamond", should be "Titanium"
- Scores 93-94.99: Currently "Diamond", should be "Platinum"
- Scores 96-100: Currently "Platinum", should be "Pandora"

### Recommended Fix
**CRITICAL: Check for scored entries first**

Query needed:
```sql
SELECT COUNT(*) as scored_entries
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND score IS NOT NULL;
```

**If scored entries exist:**
- Create migration script to recategorize scores
- Notify user that tier awards will change
- Document score → tier changes

**If NO scored entries (pre-competition):**
- Safe to delete all 5 tiers and recreate 6 from PDF

---

## 5. ENTRY SIZE CATEGORIES: ✅ PERFECT MATCH

### PDF Says vs Database
```
✅ Solo        → 1 dancer      (1-1)    MATCH
✅ Duet/Trio   → 2-3 dancers   (2-3)    MATCH
✅ Small Group → 4-9 dancers   (4-9)    MATCH
✅ Large Group → 10-14 dancers (10-14)  MATCH
✅ Line        → 15-19 dancers (15-19)  MATCH
✅ Super Line  → 20+ dancers   (20-999) MATCH
```

**No changes needed - This is the ONLY thing that matches perfectly!**

---

## 6. ENTRY FEES: MISSING STRUCTURE

### PDF Says
```
Solo                    → $115 per entry
Duet/Trio               → $70 per dancer
Groups/Lines/Production → $55 per dancer
Title Upgrade           → $30 per solo (optional)
```

### Database Has
- competitions.entry_fee = $75 (doesn't match ANY PDF price)
- No per-category fee structure
- No title upgrade fee

### Issues
1. **$75 fee doesn't match** Solo ($115), Duet ($70), or Group ($55)
2. **No per-category fees** stored anywhere
3. **No title upgrade** fee ($30)
4. **Unclear unit:** Is $75 per entry? Per dancer? Fixed?

### Questions
1. Where should category-specific fees be stored?
   - Option A: Add columns to entry_size_categories (base_fee, per_participant_fee)
   - Option B: Add columns to competitions (solo_fee, duet_fee, group_fee, title_fee)
   - Option C: Store in competition JSONB settings
   - Option D: Create fee_structure table

2. Is $75 a legacy/test value or intentional?

3. How to calculate fees?
   ```typescript
   // Example:
   Solo entry = $115 (fixed)
   Duet entry with 2 dancers = $70 × 2 = $140
   Small Group with 7 dancers = $55 × 7 = $385
   Title upgrade (on solo) = +$30
   ```

### Recommended Fix
**Need user decision on schema:**

Option A (Simplest - Add to entry_size_categories):
```sql
ALTER TABLE entry_size_categories
ADD COLUMN base_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN per_participant_fee DECIMAL(10,2) DEFAULT 0;

-- Then populate:
UPDATE entry_size_categories SET base_fee = 115, per_participant_fee = 0 WHERE name = 'Solo';
UPDATE entry_size_categories SET base_fee = 0, per_participant_fee = 70 WHERE name = 'Duet/Trio';
-- etc.
```

Option B (Add to competitions for flexibility):
```sql
ALTER TABLE competitions
ADD COLUMN solo_fee DECIMAL(10,2),
ADD COLUMN duet_trio_fee DECIMAL(10,2),
ADD COLUMN group_fee DECIMAL(10,2),
ADD COLUMN title_upgrade_fee DECIMAL(10,2);
```

---

## 7. AWARDS STRUCTURE: NOT IN DATABASE

### PDF Says
**Overall Awards (Top Placements):**
- Solo: Top 10 per age/classification
- Duet/Trio: Top 3 per age/classification
- Small Group: Top 3 per age/classification
- Large Group: Top 3 per age/classification
- Line: Top 3 per age/classification
- Super Line: Top 3 per age/classification
- Production: Top 3 (all ages combined)

**Special Awards:**
- You Are The Key Award
- Choreo of the Session
- Most Potential
- Outstanding Performance (each classification)
- The Jes Sachse Tap Award
- Unlock Your PWR Award
- Ambassadorship Recipients (8 dancers per event)
- Top Choreo of the Weekend

**Final Awards:**
- Highest Mark in Novice/Part-Time/Competitive
- Dancer of the Year (each age division)
- Top Studio in Novice/Part-Time/Competitive

### Database Has
- award_types table exists (44 rows total, tenant-scoped)
- Need to query to see if EMPWR awards match PDF

**Query needed:**
```sql
SELECT name, description, award_category, sort_order
FROM award_types
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY award_category, sort_order;
```

---

## 8. TITLE DIVISION: NOT IN DATABASE

### PDF Says
- Age divisions: Micro, Mini, Junior, Intermediate, Senior (NO Adult)
- All levels combined
- Separate scoring (100 marks per judge)
- Criteria: Technique (20), Stage Presence (20), Execution (20), Costume (20), Entertainment (20)
- Fee: $30 per solo upgrade
- Awards: Custom award, tiara, scholarship/cash prize

### Database
- No title division tracking
- No separate scoring criteria
- No upgrade fee

### Questions
1. Should title division be:
   - A boolean flag on entry? (is_title_entry)
   - A separate classification?
   - Part of competition settings?

2. How to implement separate scoring?
   - Different score fields?
   - Different scoring_tier system?

---

## 9. DANCE OFF: NOT IN DATABASE

### PDF Says
- Divisions: 12 & Under, 13 & Up
- Eligibility: Competitive groups (excluding productions) from Mini/Junior/Intermediate/Senior
- Requirement: Studio must enter 10+ routines (3 must be groups)
- Fee: No additional fee
- Selection: 1 group per division chosen by Studio Director
- Awards: Champion, First Runner-Up, Second Runner-Up (each division)

### Database
- No dance_off tracking
- No eligibility logic
- No studio routine count tracking

### Questions
1. Implement as:
   - Boolean flag on entry? (is_dance_off_entry)
   - Separate table? (dance_off_submissions)
   - Part of competition settings?

2. How to track "10 routine minimum"?

---

## 10. AMBASSADORSHIP PROGRAM: NOT IN DATABASE

### PDF Says
- Selection: 8 outstanding dancers per event
- Commitments: Photoshoot, mentorship, outreach project, awards presentation
- Benefits: Merchandise, professional photoshoot, choreography experience, mentorship

### Database
- No ambassadorship tracking
- Not critical for Phase 1 (registration)

---

## Summary of Required Actions

### CRITICAL (Blocking Registration)
1. ✅ **Age Divisions** - Fix 12 → 6 (affects 18 entries)
2. ✅ **Classifications** - Fix 5 → 3 (need entry count check)
3. ⚠️ **Entry Fees** - Add fee structure (need schema decision)

### HIGH PRIORITY (Needed Before Judging)
4. ❌ **Scoring System** - Fix 5 → 6 tiers (check for scored entries first)
5. ⚠️ **Dance Styles** - Add 5 missing styles

### MEDIUM PRIORITY (Phase 2+)
6. ⚠️ **Title Division** - Design and implement
7. ⚠️ **Dance Off** - Design and implement
8. ⚠️ **Awards** - Verify against PDF

### LOW PRIORITY (Future)
9. ⚠️ **Ambassadorship** - Track selections

---

## Next Steps

**USER DECISIONS NEEDED:**

1. **Age Divisions Fix Strategy?**
   - Surgical fix (rename + update ages) ← Recommended
   - Clean slate (delete all, recreate 6)

2. **Entry Fees Schema?**
   - Add to entry_size_categories table
   - Add to competitions table
   - Create fee_structure table
   - Store in JSONB settings

3. **Classifications Migration?**
   - How to map existing entries (Recreational → Part-Time?)
   - Delete Crystal/Elite/Titanium?
   - Proceed with breaking change?

4. **Scoring System?**
   - Check for scored entries first
   - If scored: migrate scores to new tiers
   - If not: safe to replace
   - Proceed with breaking change?

5. **Implementation Order?**
   - Phase 1: Safe additions (dance styles)
   - Phase 2: Surgical fixes (age divisions)
   - Phase 3: Breaking changes (classifications, scoring)

**QUERIES TO RUN:**
```sql
-- 1. Check classification usage
SELECT c.name, COUNT(ce.id) as entries_count
FROM classifications c
LEFT JOIN competition_entries ce ON ce.classification_id = c.id
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY c.id, c.name;

-- 2. Check for scored entries
SELECT COUNT(*) as scored_entries
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND score IS NOT NULL;

-- 3. Verify award types
SELECT name, description, award_category
FROM award_types
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY award_category, sort_order;
```

**Ready for implementation after user answers above questions.**
