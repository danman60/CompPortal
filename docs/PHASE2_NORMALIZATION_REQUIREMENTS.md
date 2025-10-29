# Phase 2: Tenant Normalization Requirements

**Created:** October 29, 2025
**Context:** Multi-tenant schema analysis revealed different competition structures between EMPWR and Glow
**Status:** Future work - NOT blocking Phase 1 MVP launch

---

## Executive Summary

Phase 1 (Registration MVP) is **fully compatible** with different tenant configurations because:
- All business logic uses UUID references, not string matching
- All lookups are tenant-scoped
- No hardcoded category/classification names in code

Phase 2 (Judging/Tabulation/Awards) will require normalization because:
- Different award systems (placement-based vs score-based)
- Different classification structures
- Logic that depends on entry characteristics (e.g., "is this a solo?")

---

## Tenant Configuration Differences

### EMPWR Dance Experience

**Entry Size Categories (6):**
- Solo (1)
- **Duet/Trio (2-3)** - Combined category
- Small Group (4-9)
- Large Group (10-14)
- Line (15-19)
- Super Line (20+)

**Age Groups (12):**
- Micro, Mini, Pre Junior, Junior, Teen, Senior, Senior+, Intermediate, Adult, Petite
- Note: Has duplicates (e.g., "Junior" appears twice)

**Classifications (5):**
- Recreational, Competitive, Elite, Crystal, Titanium
- Skill-based naming convention

**Dance Categories (9):**
- Acro, Ballet, Contemporary, Hip Hop, Jazz, Lyrical, Musical Theatre, Pointe, Tap

**Awards (28 total, placement-based):**
- adjudicator_choice: 8 awards
- final: 11 awards (Dancer of the Year, Highest Mark, Top Studio)
- overall: 7 awards (Top 3/10 by size category)
- session: 2 awards

---

### Glow Dance Competition

**Entry Size Categories (11):**
- Solo (1)
- **Duet (2)** - Separate from Trio
- **Trio (3)** - Separate from Duet
- Small Group (4-9)
- Large Group (10-14)
- Line (15-19)
- Super Line (20-999)
- **Production (1-999)** - Special category
- **Adult Group (1-999)** - Age-specific
- **Vocal (1-999)** - Performance type
- **Student Choreography (1-999)** - Choreographer-specific

**Age Groups (8):**
- Bitty (0-4), Tiny (5-6), Mini (7-8), Pre-Junior (9-10), Junior (11-12), Teen (13-14), Senior (15-16), Senior+ (17-99)
- Clean structure, no duplicates

**Classifications (4):**
- Emerald (Novice), Sapphire (Level 1), Crystal (Level 2), Titanium (Full Time)
- Gemstone naming convention with skill limitations

**Dance Categories (18):**
- All EMPWR categories PLUS: Character Ballet, Contemporary Ballet, Modern, Open, Photogenic, Production, Song & Dance, Street Jazz, Vocal

**Awards (16 total, score-based + special):**
- score_tier: 6 awards (Afterglow 291-300, Platinum Plus 276-290, Platinum 261-275, Gold Plus 246-260, Gold 231-245, Bronze 216-230)
- special: 10 awards (Artistic Edge, Born to Glow, Kindness Award, etc.)

---

## Phase 2 Normalization Requirements

### 1. Title Upgrade Fee Logic (PRIORITY: HIGH)

**Issue:** Phase 1 spec lines 672-678 show logic checking for `group_size_category='solo'`

**Current Status:** NOT YET IMPLEMENTED (verified via code grep)

**Problem:**
```python
# Phase 1 spec pseudocode:
title_upgrades = Entry.count(
    reservation_id=reservation_id,
    title_upgrade=True,
    group_size_category='solo',  # ❌ String matching
    deleted_at=None
)
```

**Why it breaks:**
- EMPWR has category named "Solo" (1 dancer)
- Glow has category named "Solo" (1 dancer)
- But what if tenant adds "Adult Solo" or "Specialty Solo"?
- String matching = fragile

**Solution:**
```typescript
// ✅ Use participant count instead of category name
const titleUpgradeEligibleEntries = await prisma.competition_entries.findMany({
  where: {
    reservation_id: reservationId,
    is_title_upgrade: true,
    entry_participants: {
      _count: { equals: 1 } // Only solo (1 dancer) entries
    }
  }
});
```

**Alternative:**
```typescript
// Add flag to entry_size_categories table
model entry_size_categories {
  // ...existing fields
  allows_title_upgrade Boolean @default(false)
}

// Then query:
const sizeCategory = await prisma.entry_size_categories.findUnique({
  where: { id: entry.entry_size_category_id },
  select: { allows_title_upgrade: true }
});
```

---

### 2. Award System Normalization (PRIORITY: CRITICAL)

**Issue:** Completely different award philosophies

**EMPWR System (Placement-Based):**
- Top 3/10 by size category
- Dancer of the Year by age
- Highest Mark by classification
- Adjudicator's choice awards
- No score tiers

**Glow System (Score-Based):**
- Every routine gets tier (Afterglow, Platinum Plus, etc.)
- Based on min_score thresholds
- Special awards (adjudicator choice)
- No Top 3 placements

**Database Challenge:**
```sql
-- EMPWR award_types have:
category: 'overall', 'final', 'adjudicator_choice', 'session'
min_score: NULL (not used)
top_n: 3 or 10 (for placements)
award_basis: 'placement'

-- Glow award_types have:
category: 'score_tier', 'special'
min_score: 216-291 (thresholds)
top_n: NULL (not used)
award_basis: 'score'
```

**Normalization Solution:**

**Option A: Universal Award Engine (RECOMMENDED)**
```typescript
interface AwardCalculationStrategy {
  type: 'placement' | 'score_tier' | 'special';
  calculate(entries: Entry[], awardType: AwardType): Award[];
}

class PlacementAwardStrategy implements AwardCalculationStrategy {
  // EMPWR logic: Top N by category/age/size
}

class ScoreTierAwardStrategy implements AwardCalculationStrategy {
  // Glow logic: Score threshold matching
}

// Usage:
const strategy = getStrategyForTenant(tenantId);
const awards = strategy.calculate(entries, awardType);
```

**Option B: Tenant-Specific Award Modules**
```typescript
// Load tenant's award configuration
const awardConfig = await prisma.tenant_award_config.findUnique({
  where: { tenant_id: ctx.tenantId },
  select: { award_system_type: true } // 'placement' | 'score'
});

if (awardConfig.award_system_type === 'placement') {
  return calculatePlacementAwards(entries);
} else if (awardConfig.award_system_type === 'score') {
  return calculateScoreTierAwards(entries);
}
```

---

### 3. Scoring Rubric Differences (PRIORITY: MEDIUM)

**Glow Spec:**
```json
{
  "criteria": [
    { "category": "Technique", "points": 20 },
    { "category": "Execution", "points": 20 },
    { "category": "Stage Presence", "points": 20 },
    { "category": "Entertainment", "points": 20 },
    { "category": "Choreography", "points": 20 }
  ]
}
// Max score: 100 per judge × 3 judges = 300 total
```

**EMPWR System:** Unknown (not in current spec)

**Solution:**
```typescript
// Add scoring_rubrics table
model scoring_rubrics {
  id          String   @id @default(uuid())
  tenant_id   String   @db.Uuid
  name        String
  categories  Json     // Array of {category, max_points}
  total_max   Int      // Pre-calculated max (e.g., 100)
  judges_count Int     // Default number of judges (e.g., 3)
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  tenants     tenants  @relation(fields: [tenant_id], references: [id])
}

// Competition references rubric
model competitions {
  // ...existing fields
  scoring_rubric_id String? @db.Uuid
  scoring_rubrics   scoring_rubrics? @relation(fields: [scoring_rubric_id], references: [id])
}
```

---

### 4. Classification Skill Level Logic (PRIORITY: MEDIUM)

**Issue:** Different classification structures

**EMPWR:**
- Recreational (open)
- Competitive (intermediate)
- Elite (advanced)
- Crystal (level 2)
- Titanium (no limits)

**Glow:**
- Emerald (novice, 1st year)
- Sapphire (level 1, turn limits)
- Crystal (level 2, most tricks allowed)
- Titanium (no limits)

**Shared:** Crystal + Titanium (but different meanings in context)

**Problem for Judges:**
```typescript
// If judge interface shows "Crystal" - which rules apply?
// EMPWR Crystal = Level 2 (all tricks except...)
// Glow Crystal = Level 2 (all turns except fouettés...)
```

**Solution:**
```typescript
// Store classification rules in JSON
model classifications {
  // ...existing fields
  rules_description String? // Human-readable
  rules_json        Json?   // Machine-readable
  // Example:
  // {
  //   "turns": {"max_rotation": 3, "fouettes_allowed": false},
  //   "tricks": {"back_layout": false, "aerials": true}
  // }
}

// Phase 2 judge interface loads:
const classification = await prisma.classifications.findUnique({
  where: { id: entry.classification_id },
  include: { tenant: true }
});

// Display: "Crystal (Glow Level 2: No fouettés, most tricks)"
```

---

### 5. Age Division Boundary Logic (PRIORITY: LOW)

**Issue:** Age group calculation might need tenant-specific rules

**Example:**
- EMPWR: Age as of competition date
- Glow: Age as of January 1st (hypothetical)
- Another tenant: Age as of registration date

**Current Implementation:**
```typescript
// Auto-calculate age group from dancer birthdates
const avgAge = calculateAverageAge(dancers);
const ageGroup = findAgeGroup(avgAge, ageGroups);
```

**Future Consideration:**
```typescript
// Add age_calculation_method to tenant settings
model tenants {
  // ...existing fields
  age_calc_method String @default('competition_date')
  // Options: 'competition_date' | 'jan_1' | 'registration_date'
  age_calc_cutoff_date DateTime? // Custom cutoff
}

// Use in calculation:
const tenant = await getTenant(ctx.tenantId);
const referenceDate = getReferenceDateForAgeCalc(tenant, competition);
const age = calculateAge(dancer.date_of_birth, referenceDate);
```

---

### 6. Entry Size Category Edge Cases (PRIORITY: LOW)

**Issue:** Special categories like "Production" have different thresholds

**EMPWR:** Production = 35+ dancers (auto-converted from Line)
**Glow:** Production = 1-999 dancers (special category, any size)

**Current Logic:** Auto-detect from participant count

**Potential Problem:**
```typescript
// What if Glow creates a 50-person entry as "Small Group"?
// System would auto-detect as "Production" based on count
// But they intended it as special choreography showcase
```

**Solution:**
```typescript
// Add manual_override flag
model competition_entries {
  // ...existing fields
  entry_size_category_id String
  size_override_reason   String? // "Special choreography showcase"
  allow_size_mismatch    Boolean @default(false)
}

// Validation:
if (!entry.allow_size_mismatch) {
  const category = await getSizeCategory(entry.entry_size_category_id);
  const participantCount = await getParticipantCount(entry.id);

  if (participantCount < category.min_participants ||
      participantCount > category.max_participants) {
    throw new Error(`Participant count (${participantCount}) outside category range`);
  }
}
```

---

## Implementation Priority

### Before Phase 2 Launch:

1. **CRITICAL: Award System Architecture**
   - Design universal award engine OR tenant-specific modules
   - Migration path for existing award_types
   - Testing framework for both systems

2. **HIGH: Title Upgrade Logic**
   - Implement participant-count-based check
   - OR add `allows_title_upgrade` flag to size categories
   - Update invoice calculation to use new logic

3. **MEDIUM: Scoring Rubric Schema**
   - Create `scoring_rubrics` table
   - Link competitions to rubrics
   - Build judge interface to load rubric dynamically

4. **MEDIUM: Classification Rules**
   - Add `rules_json` to classifications table
   - Document rule schema
   - Build UI to display rules to judges

### Future Considerations:

5. **LOW: Age Calculation Method**
   - Add `age_calc_method` to tenants table
   - Update age group detection logic
   - Add setting to tenant admin UI

6. **LOW: Size Category Overrides**
   - Add override flags to entries
   - Build UI for manual category selection
   - Add validation bypass option

---

## Testing Strategy for Phase 2

### Dual-Tenant Test Suite:

```typescript
describe('Award Calculation - Multi-Tenant', () => {
  it('EMPWR: Calculates Top 3 placement awards', async () => {
    const entries = createMockEntries('empwr', 10);
    const awards = await calculateAwards('empwr-tenant-id', entries);
    expect(awards).toHaveLength(3); // Top 3 only
    expect(awards[0].placement).toBe(1);
  });

  it('Glow: Assigns score tier to all entries', async () => {
    const entries = createMockEntries('glow', 10);
    const awards = await calculateAwards('glow-tenant-id', entries);
    expect(awards).toHaveLength(10); // Every entry gets tier
    expect(awards.every(a => a.score_tier)).toBe(true);
  });

  it('Does not mix tenant award types', async () => {
    const empwrEntry = { tenant_id: 'empwr-id', score: 285 };
    const glowEntry = { tenant_id: 'glow-id', score: 285 };

    const empwrAwards = await calculateAwards('empwr-id', [empwrEntry]);
    const glowAwards = await calculateAwards('glow-id', [glowEntry]);

    expect(empwrAwards[0].award_type.category).toBe('overall');
    expect(glowAwards[0].award_type.category).toBe('score_tier');
  });
});
```

---

## Migration Path

### Phase 1 → Phase 2 Transition:

1. **Audit existing data**
   ```sql
   -- Check for entries that would fail normalization
   SELECT e.id, e.title, esc.name, COUNT(ep.id) as participant_count
   FROM competition_entries e
   JOIN entry_size_categories esc ON e.entry_size_category_id = esc.id
   LEFT JOIN entry_participants ep ON ep.entry_id = e.id
   GROUP BY e.id
   HAVING COUNT(ep.id) < esc.min_participants
      OR COUNT(ep.id) > esc.max_participants;
   ```

2. **Add normalization tables**
   ```sql
   -- scoring_rubrics table
   -- tenant_award_config table
   -- classification_rules expansion
   ```

3. **Backfill configurations**
   ```typescript
   // For each tenant, create default configs
   await createDefaultScoringRubric(tenantId);
   await createDefaultAwardConfig(tenantId);
   ```

4. **Deploy award engine**
   - Test in staging with both EMPWR and Glow data
   - Verify no cross-tenant contamination
   - Load test with 1000+ entries

5. **Feature flag rollout**
   ```typescript
   if (isPhase2Enabled(tenantId)) {
     return new AwardEngine(tenantId).calculate(entries);
   } else {
     return legacyCalculateAwards(entries);
   }
   ```

---

## Documentation Requirements

Before Phase 2 launch:

1. **Tenant Setup Guide**
   - "How to configure your award system"
   - "Understanding classification rules"
   - "Setting up scoring rubrics"

2. **API Changes**
   - Breaking changes (if any)
   - New endpoints for award calculation
   - Migration scripts for existing data

3. **Testing Playbook**
   - How to verify tenant isolation
   - Award calculation test scenarios
   - Rollback procedures

---

## Decision Log

### Open Questions (As of Oct 29, 2025):

1. **Award Engine Architecture:** Universal engine vs tenant-specific modules?
   - **Recommendation:** Universal engine with strategy pattern
   - **Reason:** Easier to test, maintain, and add new award types

2. **Classification Rules Storage:** JSON vs separate tables?
   - **Recommendation:** JSON with schema validation
   - **Reason:** Flexible, tenant-specific, no schema migrations per rule change

3. **Scoring Rubric Overrides:** Competition-level or entry-level?
   - **Recommendation:** Competition-level with optional entry overrides
   - **Reason:** 99% of entries use competition default, 1% need special handling

---

**Last Updated:** October 29, 2025
**Next Review:** Before Phase 2 planning begins
**Owner:** Development Team
