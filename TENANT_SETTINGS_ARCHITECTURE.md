# Tenant Settings Architecture

**Date:** October 30, 2025
**Status:** PRE-LAUNCH - Architecture Decision Finalized
**Decision:** Hardcoded tenant-specific settings (not competition-editable)

---

## Executive Summary

**CURRENT ARCHITECTURE (Implemented):**
- ✅ **Lookup Tables** (PRIMARY): `age_groups`, `dance_categories`, `classifications`, `entry_size_categories`, `scoring_tiers`
  - Each row has `tenant_id` for multi-tenant isolation
  - Used throughout app for dropdowns, validation, fee calculation
  - SOURCE OF TRUTH for registration, entry creation, scoring, tabulation

- ⚠️ **JSONB Settings** (SECONDARY/LEGACY): `tenants.age_division_settings`, etc.
  - JSONB columns exist and are populated
  - NOT currently used in core flows (entry creation uses lookup tables)
  - Used only in `tenantSettings.ts` router (settings UI)

**DECISION FOR LAUNCH:**
- Tenant settings are **HARDCODED PER TENANT**
- Competition Directors CANNOT change settings on the fly
- Each tenant (EMPWR, Glow) has their own fixed settings
- Settings UI will be **READ-ONLY** display (not editable)

---

## Rationale

**Why Hardcoded (For Now):**
1. **Launch Timeline:** Too complex to build fully dynamic settings editor pre-launch
2. **Data Integrity:** Settings changes mid-season would break existing entries/scores
3. **Business Reality:** EMPWR and Glow have stable, documented settings (PDF brochures)
4. **Multi-Tenant Works:** Different tenants have different settings, isolation working

**Post-Launch Path:**
- Phase 2+: Can add per-competition overrides if needed
- For now: Code changes required to add new tenant or update settings

---

## Current Implementation

### 1. Lookup Tables (PRIMARY SOURCE OF TRUTH)

```sql
-- All tables have tenant_id for multi-tenant isolation

age_groups (
  id UUID,
  tenant_id UUID NOT NULL,  ← Multi-tenant isolation
  name VARCHAR(100),
  min_age INT,
  max_age INT,
  sort_order INT
)

dance_categories (
  id UUID,
  tenant_id UUID NOT NULL,  ← Multi-tenant isolation
  name VARCHAR(100),
  description TEXT,
  sort_order INT,
  is_active BOOLEAN DEFAULT TRUE
)

classifications (
  id UUID,
  tenant_id UUID NOT NULL,  ← Multi-tenant isolation
  name VARCHAR(100),
  description TEXT,
  skill_level INT
)

entry_size_categories (
  id UUID,
  tenant_id UUID NOT NULL,  ← Multi-tenant isolation
  name VARCHAR(100),
  min_participants INT,
  max_participants INT,
  base_fee DECIMAL(10,2),           ← Fee structure here!
  per_participant_fee DECIMAL(10,2), ← Fee structure here!
  sort_order INT
)

scoring_tiers (
  id UUID,
  tenant_id UUID NOT NULL,  ← Multi-tenant isolation
  name VARCHAR(50),
  min_score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  sort_order INT
)
```

### 2. Where Lookup Tables Are Used

**Entry Creation Flow:**
- `lookup.ts:getAllForEntry()` - Fetches all tenant-scoped settings
- `EntryCreateFormV2.tsx` - Dropdowns populated from lookup tables
- `entry.ts:create()` - Validates against lookup tables, calculates fees

**Fee Calculation:**
```typescript
// entry.ts lines 1074-1086
const sizeCategory = await prisma.entry_size_categories.findUnique({
  where: { id: entrySizeCategoryId },
  select: { base_fee: true, per_participant_fee: true },
});

const baseFee = Number(sizeCategory.base_fee || 0);
const perParticipantFee = Number(sizeCategory.per_participant_fee || 0);
const participantCount = participants?.length || 0;
finalEntryFee = baseFee + (perParticipantFee * participantCount);
```

**Scoring/Tabulation (Future Phase 3):**
- Judge interfaces will query `scoring_tiers` filtered by `tenant_id`
- Scores mapped to tiers: Bronze (0-84), Silver (84-86.99), etc.
- Awards calculated per age_group + classification combinations

**Tenant Isolation:**
```typescript
// lookup.ts:48-78
getAllForEntry: protectedProcedure.query(async ({ ctx }) => {
  const [categories, classifications, ageGroups, entrySizeCategories] = await Promise.all([
    prisma.dance_categories.findMany({
      where: {
        is_active: true,
        tenant_id: ctx.tenantId,  // ← ISOLATION
      },
      orderBy: { sort_order: 'asc' },
    }),
    // ... all queries filter by tenant_id
  ]);
});
```

### 3. JSONB Settings (LEGACY/UNUSED)

```sql
-- tenants table has JSONB columns (populated but not actively used)
tenants (
  id UUID,
  name VARCHAR(255),
  subdomain VARCHAR(100),
  age_division_settings JSONB,      -- ⚠️ Populated but not used
  classification_settings JSONB,    -- ⚠️ Populated but not used
  entry_fee_settings JSONB,         -- ⚠️ Populated but not used
  dance_category_settings JSONB,    -- ⚠️ Populated but not used
  scoring_system_settings JSONB,    -- ⚠️ Populated but not used
  entry_size_settings JSONB,        -- ⚠️ Populated but not used
  award_settings JSONB              -- ⚠️ Populated but not used
)
```

**Where JSONB is queried:**
- `tenantSettings.ts` - Read/write JSONB settings (for settings UI)
- NOT used in entry creation, fee calculation, or lookup queries

**Recommendation:**
- Keep JSONB for now (no harm, already populated)
- Future: Could use as "defaults" when creating new tenant
- OR could remove if never used

---

## Settings UI Requirements

### Competition Settings Page

**Location:** Accessed from CD Dashboard top-right button (currently shows "under construction")

**Purpose:** Display all tenant-specific settings (READ-ONLY for launch)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Competition Settings - EMPWR Dance Experience   │
│                                                  │
│ ✅ These are your tenant-specific settings      │
│ ℹ️ Contact support to request changes           │
└─────────────────────────────────────────────────┘

┌─────────────── Age Divisions ─────────────────┐
│ • Micro (0-5)                                   │
│ • Mini (6-8)                                    │
│ • Junior (9-11)                                 │
│ • Intermediate (12-14)                          │
│ • Senior (15-17)                                │
│ • Adult (18+)                                   │
└─────────────────────────────────────────────────┘

┌────────────── Classifications ────────────────┐
│ • Novice - Never competed in solo/duet/trio   │
│ • Part-Time - ≤6 hours/week training           │
│ • Competitive - >6 hours/week training         │
└─────────────────────────────────────────────────┘

┌──────────────── Dance Styles ────────────────┐
│ Classical Ballet, Tap, Jazz, Lyrical,         │
│ Contemporary, Hip-Hop, Musical Theatre,        │
│ Pointe, Contemporary Ballet, Acro, Open,      │
│ Song & Dance, Modern, Production               │
└─────────────────────────────────────────────────┘

┌─────────────── Entry Sizes & Fees ───────────┐
│ • Solo: $115 per entry                         │
│ • Duet/Trio (2-3): $70 per dancer              │
│ • Small Group (4-9): $55 per dancer            │
│ • Large Group (10-14): $55 per dancer          │
│ • Line (15-19): $55 per dancer                 │
│ • Super Line (20+): $55 per dancer             │
│ • Title Upgrade: $30 per solo                  │
└─────────────────────────────────────────────────┘

┌──────────────── Scoring System ──────────────┐
│ • Bronze: 0.00 - 84.00                         │
│ • Silver: 84.00 - 86.99                        │
│ • Gold: 87.00 - 89.99                          │
│ • Titanium: 90.00 - 92.99                      │
│ • Platinum: 93.00 - 95.99                      │
│ • Pandora: 96.00 - 100.00                      │
└─────────────────────────────────────────────────┘
```

### Implementation

**Router:** Already exists at `src/server/routers/tenantSettings.ts`

**Frontend:** Create new page at `src/app/dashboard/settings/competition/page.tsx`

**Data Source:** Query lookup tables (NOT JSONB) for accurate display

```typescript
// Fetch from lookup tables (source of truth)
const { data } = trpc.tenantSettings.getAll.useQuery();

// Display sections for:
// - Age Groups (from age_groups table)
// - Classifications (from classifications table)
// - Dance Styles (from dance_categories table)
// - Entry Sizes & Fees (from entry_size_categories table)
// - Scoring Tiers (from scoring_tiers table)
```

---

## Data Flow Through System

### 1. Registration/Entry Creation (Phase 1)
```
User creates entry
  ↓
Form fetches lookup tables (filtered by tenant_id)
  ↓
User selects from dropdowns (category, classification, age group auto-detected)
  ↓
Backend validates against lookup tables (tenant_id match)
  ↓
Fee calculated from entry_size_categories.base_fee + per_participant_fee
  ↓
Entry saved with FK references to lookup table IDs
```

### 2. Scoring (Phase 3 - Future)
```
Judge scores routine (0-100)
  ↓
System queries scoring_tiers (filtered by tenant_id)
  ↓
Score mapped to tier (e.g., 92.5 → Titanium)
  ↓
Awards calculated per session + age_group + classification
```

### 3. Tabulation (Phase 3 - Future)
```
System aggregates scores per routine
  ↓
Groups by: session + age_group + classification + entry_size_category
  ↓
Calculates placements (1st, 2nd, 3rd, etc.)
  ↓
Generates award ceremony reports
  ↓
Awards presented based on scoring_tier thresholds
```

---

## Critical Dependencies on Settings

### Entry Creation
- **Requires:** age_groups, dance_categories, classifications, entry_size_categories
- **Breaks if:** Missing tenant_id rows, invalid FK references
- **Fee Impact:** Changes to entry_size_categories.base_fee/per_participant_fee affect NEW entries only

### Invoice Generation
- **Reads:** competition_entries.entry_fee, competition_entries.total_fee
- **Calculation:** Already happened at entry creation (stored)
- **Breaks if:** entry_size_categories deleted/modified after entries created

### Scoring/Judging (Phase 3)
- **Requires:** scoring_tiers (to display tier names + ranges)
- **Breaks if:** Tiers changed after scores entered (would recategorize scores)
- **Critical:** scoring_tiers MUST be immutable once competition starts

### Awards/Tabulation (Phase 3)
- **Groups by:** age_groups, classifications, entry_size_categories
- **Breaks if:** Lookup table rows deleted (orphaned FK references)
- **Critical:** All lookup tables MUST be immutable once entries exist

---

## Immutability Requirements

**Once entries exist for a tenant:**
1. ❌ **DO NOT delete** age_groups, classifications, dance_categories, entry_size_categories rows
2. ⚠️ **CAUTION editing** scoring_tiers (changes how existing scores are categorized)
3. ⚠️ **CAUTION editing** fees (won't affect existing entries, only new ones)
4. ✅ **SAFE to add** new rows (e.g., new dance style) as long as sort_order maintained

**Safe Operations:**
- Add new age_group (higher sort_order)
- Add new dance_category (higher sort_order)
- Update descriptions (non-breaking)
- Update is_active=false (soft delete, better than hard delete)

**Breaking Operations:**
- Delete rows with existing FK references
- Change min_age/max_age (affects age group detection)
- Change min_score/max_score (recategorizes scores)
- Change min_participants/max_participants (affects entry size detection)

---

## Current Data Quality Issues

From `EMPWR_PDF_VS_DATABASE_BREAKDOWN.md`:

### EMPWR Tenant Issues
1. **Age Divisions:** 12 rows vs 6 in PDF (duplicates + wrong ranges)
2. **Dance Styles:** 9 rows vs 14 in PDF (missing 5)
3. **Classifications:** 5 rows vs 3 in PDF (wrong names)
4. **Scoring Tiers:** 5 rows vs 6 in PDF (missing Titanium + Pandora)
5. **Entry Fees:** ✅ CORRECT (Solo $115, Duet $70, Groups $55)
6. **Entry Sizes:** ✅ PERFECT (Solo, Duet/Trio, Small/Large Group, Line, Super Line)

### Glow Tenant
- Not analyzed yet (need PDF brochure for comparison)
- Likely has same issues (demo data seeded similarly)

---

## empwrDefaults.ts Role

**File:** `src/lib/empwrDefaults.ts`

**Purpose:** Reference constants that match EMPWR PDF perfectly

**Current Usage:**
- UI components for initial display/defaults
- NOT used in fee calculations or entry creation
- NOT used in lookup table queries

**Recommendation:**
- Use as SEED DATA to populate lookup tables
- Then lookup tables become source of truth
- Keep file as reference documentation

---

## Implementation Plan (For Launch)

### Phase 1: Fix EMPWR Data (Urgent - Pre-Launch)
1. Update `age_groups` table (12 → 6, correct ranges)
2. Add 5 missing dance styles to `dance_categories`
3. Fix `classifications` (5 → 3, correct names/rules)
4. Fix `scoring_tiers` (5 → 6, add Titanium + Pandora)

### Phase 2: Create Settings UI (Launch Day)
1. Create `/dashboard/settings/competition/page.tsx`
2. Display all tenant settings (read-only)
3. Query lookup tables (NOT JSONB)
4. Add "Contact support to change settings" message

### Phase 3: Title Upgrade UI (Nice-to-Have)
1. Add checkbox to `RoutineDetailsSection.tsx`
2. Display "+$30 title upgrade" in fee calculation
3. Already in schema, just missing from UI

### Phase 4: Verify Glow Tenant (Post-Launch)
1. Get Glow PDF brochure
2. Compare against database
3. Fix mismatches

### Phase 5: Future Enhancements (Post-Phase 1)
- Per-competition overrides (if needed)
- Settings editor for super admin
- Settings versioning (track changes over time)

---

## Testing Checklist

### Before Launch
- [ ] EMPWR settings match PDF exactly
- [ ] Glow settings verified (or acceptable as-is)
- [ ] Entry creation uses correct tenant_id filtered lookups
- [ ] Fee calculation accurate (Solo $115, Duet $140, Group $385 for 7 dancers)
- [ ] No cross-tenant data leaks (EMPWR can't see Glow settings)
- [ ] Settings UI displays correctly
- [ ] Title upgrade checkbox visible and functional

### After Launch (Monitoring)
- [ ] No orphaned FK errors (deleted lookup table rows)
- [ ] Fees calculated correctly on invoices
- [ ] Age group auto-detection working
- [ ] Entry size auto-detection working
- [ ] All dropdowns populated (no empty selects)

---

## FAQ

**Q: Can Competition Directors change settings?**
A: No, not for launch. Settings are hardcoded per tenant. Post-launch: Maybe per-competition overrides.

**Q: Can we add a new tenant?**
A: Yes, requires:
1. Insert into `tenants` table
2. Populate lookup tables (age_groups, dance_categories, etc.) with tenant_id
3. Deploy with new subdomain routing

**Q: What if EMPWR wants to add a new dance style mid-season?**
A: Safe to add (high sort_order), won't break existing entries. Requires database migration.

**Q: What if scoring tiers need to change?**
A: DANGEROUS after scoring starts. Would recategorize all scores. Avoid.

**Q: Why have both lookup tables AND JSONB?**
A: Legacy/transition. Lookup tables are source of truth. JSONB could be removed or used as defaults.

**Q: How do we keep PDF brochure in sync with database?**
A: Manual process for now. Future: Settings editor that generates PDF automatically.

---

## Files to Review

### Critical Files (Settings Usage)
- `src/server/routers/lookup.ts` - Fetches lookup tables (source of truth)
- `src/server/routers/entry.ts` - Entry creation + fee calculation
- `src/server/routers/tenantSettings.ts` - Settings CRUD (currently JSONB)
- `src/components/rebuild/entries/EntryCreateFormV2.tsx` - Entry form UI
- `src/lib/empwrDefaults.ts` - Reference constants (matches PDF)

### Settings UI (To Create)
- `src/app/dashboard/settings/competition/page.tsx` - NEW: Settings display page
- `src/components/CompetitionSettingsDisplay.tsx` - NEW: Read-only settings component

### Documentation
- `EMPWR_PDF_VS_DATABASE_BREAKDOWN.md` - Detailed discrepancy analysis
- `HARDCODED_VALUES_SCAN.md` - Verification of no hardcoded values in code
- `COMPETITION_SETTINGS_ANALYSIS.md` - Original settings investigation

---

**Status:** Architecture documented, ready for implementation
**Next Step:** Fix EMPWR lookup table data to match PDF
