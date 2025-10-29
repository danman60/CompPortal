# Tenant Settings Architecture Specification

**Status:** Draft - Critical Business Logic
**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Affects:** Multi-tenancy, Competition Settings, Routine Creation, Scoring, Awards

---

## Executive Summary

This specification defines the architecture for tenant-scoped competition settings that enable white-label customization of the CompPortal platform. Each tenant (competition brand) can configure their own age divisions, dance categories, scoring rubrics, and awards, which apply consistently across all routine creation, judging, and awards workflows.

**Core Principle:** Single source of truth via tenant-scoped lookup tables, editable through Competition Settings panel, affecting entire app.

---

## Problem Statement

### Issues Discovered (2025-10-28)

During multi-tenant audit, we discovered **THREE DISCONNECTED SYSTEMS** managing the same data:

1. **Tenant JSONB Settings** (tenants table)
   - Fields: `age_division_settings`, `entry_size_settings`, `dance_category_settings`, `scoring_system_settings`, `award_settings`
   - Used by: Settings panel UI (read/write)
   - ❌ NOT used by routine creation
   - ❌ NOT used by scoring system
   - ❌ Orphaned data

2. **Lookup Tables** (with tenant_id)
   - Tables: `dance_categories`, `age_groups`, `classifications`, `entry_size_categories`
   - Used by: Routine creation, entry forms, analytics
   - ✅ Properly tenant-scoped
   - ❌ Not editable via settings panel
   - ❌ Has duplicate rows (EMPWR: "Large Group" x2, "Duo/Trio" x2)

3. **competition_settings Table** (global key-value store)
   - 21 rows: age_divisions, dance_styles, routine_types, scoring_rubric
   - ❌ NO tenant_id column
   - ❌ Not connected to any system
   - ❌ Orphaned data

4. **Awards Tables** (empty, partially implemented)
   - Tables: `award_types`, `awards`
   - ✅ Has tenant_id
   - ❌ 0 rows (never seeded)
   - ❌ Settings panel breaks on Awards tab

**Result:** Settings panel shows empty data, routine creation uses different data, duplicates exist, cross-tenant contamination risk.

---

## Architecture Decision

### **Option B: Lookup Tables as Source of Truth**

**Decision:** Use existing tenant-scoped lookup tables as the single source of truth for all competition settings.

**Rationale:**
- Lookup tables already have tenant_id ✅
- Already used by routine creation (established data flow) ✅
- Relational data (better queryability than JSONB) ✅
- Can add foreign key constraints for data integrity ✅
- Settings panel becomes CRUD interface over these tables ✅

**Deprecated:**
- Tenant JSONB settings fields (keep for migration period, then remove)
- `competition_settings` table (orphaned, no tenant_id)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SEEDING PROCESS                        │
│  (Developer seeds default settings per tenant)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              LOOKUP TABLES (Source of Truth)                │
│  • dance_categories (tenant_id, name, sort_order, ...)      │
│  • age_groups (tenant_id, name, min_age, max_age, ...)      │
│  • classifications (tenant_id, name, skill_level, ...)      │
│  • entry_size_categories (tenant_id, name, min/max, ...)    │
│  • scoring_tiers (tenant_id, name, min/max score, color)    │
│  • award_types (tenant_id, name, category, topN, ...)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
┌─────────────┐ ┌──────────┐ ┌──────────────┐
│  SETTINGS   │ │ ROUTINE  │ │   SCORING    │
│   PANEL     │ │ CREATION │ │   SYSTEM     │
│             │ │          │ │              │
│ CD can CRUD │ │ SD reads │ │ Judges read  │
│ tenant data │ │ options  │ │ rubric       │
└─────────────┘ └──────────┘ └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │    AWARDS    │
              │  CEREMONY    │
              │              │
              │ Uses tiers + │
              │ award_types  │
              └──────────────┘
```

---

## Schema Design

### Existing Tables (Keep & Enhance)

#### `dance_categories`
```sql
CREATE TABLE dance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color_code VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
```

**Purpose:** Dance styles (Ballet, Jazz, Tap, Contemporary, Hip Hop, etc.)
**Used by:** Routine creation dropdowns, analytics, awards grouping
**Editable:** Yes, via Settings Panel > Dance Styles tab

---

#### `age_groups`
```sql
CREATE TABLE age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  min_age INTEGER NOT NULL,
  max_age INTEGER NOT NULL,
  competitive_group VARCHAR(255),
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
```

**Purpose:** Age divisions (Mini, Petite, Junior, Intermediate, Senior, etc.)
**Used by:** Routine creation, awards calculation (age-specific awards)
**Editable:** Yes, via Settings Panel > Age Divisions tab

**EMPWR Defaults (from images):**
- Micro: 5 & under
- Mini: 6-8
- Junior: 9-11
- Intermediate: 12-14
- Senior: 15-17

---

#### `classifications`
```sql
CREATE TABLE classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  skill_level INTEGER,
  color_code VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
```

**Purpose:** Skill levels (Novice, Part-Time, Competitive, Elite, etc.)
**Used by:** Routine creation, awards grouping (per classification)
**Editable:** Yes, via Settings Panel > Classifications tab

**EMPWR Defaults:**
- Novice
- Part-Time
- Competitive

---

#### `entry_size_categories`
```sql
CREATE TABLE entry_size_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  min_participants INTEGER NOT NULL,
  max_participants INTEGER NOT NULL,
  base_fee DECIMAL(10,2),
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
```

**Purpose:** Routine size categories (Solo, Duet/Trio, Small Group, Large Group, Line, Super Line, Production)
**Used by:** Routine creation, pricing, awards (per category)
**Editable:** Yes, via Settings Panel > Routine Categories tab

**EMPWR Defaults (from Overall Awards image):**
- Solo: 1 participant (Top 10 awarded)
- Duet/Trio: 2-3 participants (Top 3 awarded)
- Small Groups: 4-9 participants (Top 3 awarded)
- Large Groups: 10-19 participants (Top 3 awarded)
- Lines: 20-29 participants (Top 3 awarded)
- Super Lines: 30+ participants (Top 3 awarded)
- Productions: Special category (Top 3 awarded, all ages combined)

**Current Issue:** EMPWR has duplicate rows - "Large Group" appears twice, "Duo/Trio" appears twice. Must clean up before production.

---

### New Table: `scoring_tiers`

```sql
CREATE TABLE scoring_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  color VARCHAR(7),
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name),
  CHECK (min_score >= 0 AND max_score <= 100),
  CHECK (min_score < max_score)
);
```

**Purpose:** Score ranges for award tiers (Platinum, Gold, High Gold, Silver, Bronze, etc.)
**Used by:** Scoring system, awards calculation, certificates
**Editable:** Yes, via Settings Panel > Scoring Rubric tab

**EMPWR Defaults:**
- Platinum: 95.00 - 100.00 (#E5E4E2)
- Diamond: 90.00 - 94.99 (#B9F2FF)
- Gold: 85.00 - 89.99 (#FFD700)
- Silver: 80.00 - 84.99 (#C0C0C0)
- Bronze: 0.00 - 79.99 (#CD7F32)

**Source:** competition_settings table currently has this data (will migrate to scoring_tiers)

---

### Enhanced Table: `award_types`

```sql
CREATE TABLE award_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'overall', 'session', 'adjudicator_choice', 'final', 'special'
  award_basis VARCHAR(50), -- 'placement', 'score', 'subjective'

  -- For placement-based awards
  top_n INTEGER, -- e.g., Top 10 for solos, Top 3 for groups

  -- For entry size filtering
  entry_size_filter VARCHAR(255)[], -- ['Solo', 'Duet/Trio'] or NULL for all

  -- For age division filtering
  age_division_filter VARCHAR(255)[], -- ['Mini', 'Junior'] or NULL for all

  -- For classification filtering
  classification_filter VARCHAR(255)[], -- ['Competitive'] or NULL for all

  color VARCHAR(7),
  icon_name VARCHAR(50),
  certificate_template VARCHAR(255),
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
```

**Purpose:** Define award types and eligibility rules
**Used by:** Awards ceremony, certificates, rankings
**Editable:** Yes, via Settings Panel > Awards tab

**EMPWR Defaults (from images):**

**Overall Awards (placement-based, per category):**
- Solos - Top 10
- Duets/Trios - Top 3
- Small Groups - Top 3
- Large Groups - Top 3
- Lines - Top 3
- Super Lines - Top 3
- Productions - Top 3 (all age divisions combined)

**Awarded in each classification for age divisions:**
- Micro: 5 & under
- Mini: 6-8
- Junior: 9-11
- Intermediate: 12-14
- Senior: 15-17

**Session Awards (subjective):**
- Special Awards:
  - "You Are The Key" Award
  - Choreo of the Session
- Adjudicators Choice Awards:
  - Most Potential
  - Outstanding Performance in Each Classification
  - The Jes Sachse Tap Award
  - "Unlock Your PWR" Award
  - Ambassadorship Recipients
  - Top Choreo of the Weekend

**Final Awards (score + placement based):**
- Highest Mark in Novice/Part-Time/Competitive
- "Dancer of the Year" in Each Age Division
- Top Studio in Novice/Part-Time/Competitive

---

### Table: `awards` (existing, keep as-is)

```sql
CREATE TABLE awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  entry_id UUID REFERENCES competition_entries(id),
  award_type_id UUID NOT NULL REFERENCES award_types(id),
  placement INTEGER,
  score DECIMAL(5,2),
  award_category VARCHAR(255),
  certificate_url TEXT,
  trophy_type VARCHAR(50),
  special_recognition TEXT,
  presented_at TIMESTAMP,
  presented_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** Actual awards given to entries at a competition
**Used by:** Awards ceremony, certificates, studio results
**Editable:** No (generated by system during awards calculation)

---

## Tenant Settings Panel Implementation

### Current State
- Page: `src/app/dashboard/settings/tenant/page.tsx`
- Hardcoded tenant_id: `'00000000-0000-0000-0000-000000000001'` (line 20)
- Queries JSONB fields from tenants table (NOT lookup tables)
- Components: AgeDivisionSettings, EntrySizeSettings, DanceStyleSettings, ScoringRubricSettings, AwardsSettings

### Required Changes

#### 1. Fix Tenant Context
```typescript
// BEFORE (page.tsx:20)
const tenantId = '00000000-0000-0000-0000-000000000001';

// AFTER
const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
const tenantId = currentUser?.tenantId;
```

#### 2. Rewrite TRPC Procedures

**New Router: `src/server/routers/tenantSettings.ts`**

Replace all procedures to CRUD lookup tables instead of JSONB fields:

```typescript
// Age Divisions
getTenantAgeDivisions: protectedProcedure.query(async ({ ctx }) => {
  return await prisma.age_groups.findMany({
    where: { tenant_id: ctx.tenantId },
    orderBy: { sort_order: 'asc' }
  });
});

updateTenantAgeDivisions: protectedProcedure
  .input(z.object({ divisions: z.array(ageDivisionSchema) }))
  .mutation(async ({ ctx, input }) => {
    // Delete all existing, insert new (transaction)
    await prisma.$transaction(async (tx) => {
      await tx.age_groups.deleteMany({ where: { tenant_id: ctx.tenantId } });
      await tx.age_groups.createMany({ data: input.divisions.map(d => ({
        ...d,
        tenant_id: ctx.tenantId
      }))});
    });
  });
```

Repeat pattern for:
- Dance Categories (`dance_categories`)
- Classifications (`classifications`)
- Entry Size Categories (`entry_size_categories`)
- Scoring Rubric (`scoring_tiers`)
- Awards (`award_types`)

#### 3. Update Settings Panel Components

Each component (AgeDivisionSettings, DanceStyleSettings, etc.) should:
- Fetch data from lookup tables via new procedures
- Display current tenant-scoped rows
- Allow add/edit/delete operations
- Save back to lookup tables
- Show loading/error states
- Confirm destructive operations

---

## Seeding Strategy

### Initial Tenant Setup

When a new tenant is created, seed default settings:

```typescript
// src/lib/seed-tenant-defaults.ts

export async function seedTenantDefaults(tenantId: string, template: 'empwr' | 'custom') {
  if (template === 'empwr') {
    // Age Groups
    await prisma.age_groups.createMany({
      data: [
        { tenant_id: tenantId, name: 'Micro', short_name: 'Micro', min_age: 0, max_age: 5, sort_order: 1 },
        { tenant_id: tenantId, name: 'Mini', short_name: 'Mini', min_age: 6, max_age: 8, sort_order: 2 },
        { tenant_id: tenantId, name: 'Junior', short_name: 'Junior', min_age: 9, max_age: 11, sort_order: 3 },
        { tenant_id: tenantId, name: 'Intermediate', short_name: 'Int', min_age: 12, max_age: 14, sort_order: 4 },
        { tenant_id: tenantId, name: 'Senior', short_name: 'Senior', min_age: 15, max_age: 17, sort_order: 5 },
      ]
    });

    // Dance Categories
    await prisma.dance_categories.createMany({
      data: [
        { tenant_id: tenantId, name: 'Ballet', sort_order: 1 },
        { tenant_id: tenantId, name: 'Jazz', sort_order: 2 },
        { tenant_id: tenantId, name: 'Lyrical', sort_order: 3 },
        { tenant_id: tenantId, name: 'Contemporary', sort_order: 4 },
        { tenant_id: tenantId, name: 'Hip Hop', sort_order: 5 },
        { tenant_id: tenantId, name: 'Tap', sort_order: 6 },
        { tenant_id: tenantId, name: 'Acro', sort_order: 7 },
        { tenant_id: tenantId, name: 'Musical Theatre', sort_order: 8 },
        { tenant_id: tenantId, name: 'Pointe', sort_order: 9 },
      ]
    });

    // Entry Size Categories
    await prisma.entry_size_categories.createMany({
      data: [
        { tenant_id: tenantId, name: 'Solo', min_participants: 1, max_participants: 1, sort_order: 1 },
        { tenant_id: tenantId, name: 'Duet/Trio', min_participants: 2, max_participants: 3, sort_order: 2 },
        { tenant_id: tenantId, name: 'Small Group', min_participants: 4, max_participants: 9, sort_order: 3 },
        { tenant_id: tenantId, name: 'Large Group', min_participants: 10, max_participants: 19, sort_order: 4 },
        { tenant_id: tenantId, name: 'Line', min_participants: 20, max_participants: 29, sort_order: 5 },
        { tenant_id: tenantId, name: 'Super Line', min_participants: 30, max_participants: 999, sort_order: 6 },
        { tenant_id: tenantId, name: 'Production', min_participants: 4, max_participants: 999, sort_order: 7 },
      ]
    });

    // Classifications
    await prisma.classifications.createMany({
      data: [
        { tenant_id: tenantId, name: 'Novice', skill_level: 1, sort_order: 1 },
        { tenant_id: tenantId, name: 'Part-Time', skill_level: 2, sort_order: 2 },
        { tenant_id: tenantId, name: 'Competitive', skill_level: 3, sort_order: 3 },
      ]
    });

    // Scoring Tiers
    await prisma.scoring_tiers.createMany({
      data: [
        { tenant_id: tenantId, name: 'Platinum', min_score: 95, max_score: 100, color: '#E5E4E2', sort_order: 1 },
        { tenant_id: tenantId, name: 'Diamond', min_score: 90, max_score: 94.99, color: '#B9F2FF', sort_order: 2 },
        { tenant_id: tenantId, name: 'Gold', min_score: 85, max_score: 89.99, color: '#FFD700', sort_order: 3 },
        { tenant_id: tenantId, name: 'Silver', min_score: 80, max_score: 84.99, color: '#C0C0C0', sort_order: 4 },
        { tenant_id: tenantId, name: 'Bronze', min_score: 0, max_score: 79.99, color: '#CD7F32', sort_order: 5 },
      ]
    });

    // Award Types (see full EMPWR awards below)
    await seedEmpwrAwards(tenantId);
  }
}
```

---

## EMPWR Awards Seeding (Complete)

### Overall Awards
```typescript
const overallAwards = [
  { name: 'Top 10 Solos', category: 'overall', top_n: 10, entry_size_filter: ['Solo'] },
  { name: 'Top 3 Duets/Trios', category: 'overall', top_n: 3, entry_size_filter: ['Duet/Trio'] },
  { name: 'Top 3 Small Groups', category: 'overall', top_n: 3, entry_size_filter: ['Small Group'] },
  { name: 'Top 3 Large Groups', category: 'overall', top_n: 3, entry_size_filter: ['Large Group'] },
  { name: 'Top 3 Lines', category: 'overall', top_n: 3, entry_size_filter: ['Line'] },
  { name: 'Top 3 Super Lines', category: 'overall', top_n: 3, entry_size_filter: ['Super Line'] },
  { name: 'Top 3 Productions', category: 'overall', top_n: 3, entry_size_filter: ['Production'], description: 'All age divisions combined for Top 3' },
];
```

### Session Awards
```typescript
const sessionAwards = [
  { name: 'You Are The Key Award', category: 'session', award_basis: 'subjective' },
  { name: 'Choreo of the Session', category: 'session', award_basis: 'subjective' },
];
```

### Adjudicators Choice Awards
```typescript
const adjudicatorAwards = [
  { name: 'Most Potential', category: 'adjudicator_choice', award_basis: 'subjective' },
  { name: 'Outstanding Performance - Novice', category: 'adjudicator_choice', award_basis: 'subjective', classification_filter: ['Novice'] },
  { name: 'Outstanding Performance - Part-Time', category: 'adjudicator_choice', award_basis: 'subjective', classification_filter: ['Part-Time'] },
  { name: 'Outstanding Performance - Competitive', category: 'adjudicator_choice', award_basis: 'subjective', classification_filter: ['Competitive'] },
  { name: 'The Jes Sachse Tap Award', category: 'adjudicator_choice', award_basis: 'subjective' },
  { name: 'Unlock Your PWR Award', category: 'adjudicator_choice', award_basis: 'subjective' },
  { name: 'Ambassadorship Recipients', category: 'adjudicator_choice', award_basis: 'subjective' },
  { name: 'Top Choreo of the Weekend', category: 'adjudicator_choice', award_basis: 'subjective' },
];
```

### Final Awards
```typescript
const finalAwards = [
  // Highest Mark per classification
  { name: 'Highest Mark - Novice', category: 'final', award_basis: 'score', classification_filter: ['Novice'] },
  { name: 'Highest Mark - Part-Time', category: 'final', award_basis: 'score', classification_filter: ['Part-Time'] },
  { name: 'Highest Mark - Competitive', category: 'final', award_basis: 'score', classification_filter: ['Competitive'] },

  // Dancer of the Year per age division
  { name: 'Dancer of the Year - Micro', category: 'final', award_basis: 'score', age_division_filter: ['Micro'] },
  { name: 'Dancer of the Year - Mini', category: 'final', award_basis: 'score', age_division_filter: ['Mini'] },
  { name: 'Dancer of the Year - Junior', category: 'final', award_basis: 'score', age_division_filter: ['Junior'] },
  { name: 'Dancer of the Year - Intermediate', category: 'final', award_basis: 'score', age_division_filter: ['Intermediate'] },
  { name: 'Dancer of the Year - Senior', category: 'final', award_basis: 'score', age_division_filter: ['Senior'] },

  // Top Studio per classification
  { name: 'Top Studio - Novice', category: 'final', award_basis: 'score', classification_filter: ['Novice'] },
  { name: 'Top Studio - Part-Time', category: 'final', award_basis: 'score', classification_filter: ['Part-Time'] },
  { name: 'Top Studio - Competitive', category: 'final', award_basis: 'score', classification_filter: ['Competitive'] },
];
```

---

## Data Cleanup Plan

### Step 1: Remove Duplicate Rows (EMPWR tenant)

**SQL via Supabase MCP:**

```sql
-- Find duplicates in entry_size_categories
SELECT id, name, tenant_id, sort_order
FROM entry_size_categories
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND name IN ('Large Group', 'Duo/Trio')
ORDER BY name, sort_order NULLS LAST;

-- Delete rows with NULL sort_order (keep ones with explicit sort_order)
DELETE FROM entry_size_categories
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND name IN ('Large Group', 'Duo/Trio')
  AND sort_order IS NULL;
```

**Verification:**
```sql
-- Should return 0 duplicates
SELECT name, COUNT(*)
FROM entry_size_categories
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY name
HAVING COUNT(*) > 1;
```

### Step 2: Migrate competition_settings to scoring_tiers

```sql
-- Create scoring_tiers table (see schema above)
-- Then migrate data:
INSERT INTO scoring_tiers (tenant_id, name, min_score, max_score, color, sort_order)
SELECT
  '00000000-0000-0000-0000-000000000001' as tenant_id,
  (setting_value->>'label')::VARCHAR as name,
  (setting_value->>'min_score')::DECIMAL as min_score,
  (setting_value->>'max_score')::DECIMAL as max_score,
  (setting_value->>'color')::VARCHAR as color,
  display_order as sort_order
FROM competition_settings
WHERE setting_category = 'scoring_rubric';
```

### Step 3: Archive competition_settings

Do NOT delete immediately - reference concerns about breakage.

Instead:
1. Add `deprecated` column: `ALTER TABLE competition_settings ADD COLUMN deprecated BOOLEAN DEFAULT false;`
2. Mark all rows: `UPDATE competition_settings SET deprecated = true;`
3. Add comment: `COMMENT ON TABLE competition_settings IS 'DEPRECATED 2025-10-28: Data migrated to tenant-scoped lookup tables. Do not use for new features.';`
4. Monitor for 2 weeks - if nothing breaks, then delete table

---

## Migration Strategy

### Phase 1: Data Cleanup (Immediate)
1. ✅ Remove duplicate entry_size_categories for EMPWR
2. ✅ Verify no duplicates in other lookup tables
3. ✅ Create scoring_tiers table
4. ✅ Migrate competition_settings → scoring_tiers for EMPWR tenant
5. ✅ Seed award_types for EMPWR tenant

### Phase 2: Settings Panel Rewrite (Next)
1. ✅ Fix tenant_id context (use ctx.tenantId instead of hardcoded)
2. ✅ Rewrite TRPC procedures to CRUD lookup tables
3. ✅ Update settings panel components to use new procedures
4. ✅ Add validation (prevent deleting in-use categories)
5. ✅ Test on EMPWR tenant
6. ✅ Test on Glow tenant (verify isolation)

### Phase 3: Glow Tenant Seeding (Next)
1. ✅ Ask user for Glow defaults (same as EMPWR or custom?)
2. ✅ Seed lookup tables for Glow tenant
3. ✅ Verify settings panel works on Glow
4. ✅ Verify routine creation shows Glow settings only

### Phase 4: Deprecation & Cleanup (Post-Launch)
1. ⏳ Monitor deprecated competition_settings table (2 weeks)
2. ⏳ Remove JSONB fields from tenants table (after confirming not used)
3. ⏳ Delete competition_settings table (if nothing breaks)
4. ⏳ Update documentation

---

## Validation Rules

### Prevent Orphaned Data

Before allowing deletion of lookup table rows, check for usage:

```typescript
// Example: Before deleting age_group
const entriesUsingAgeGroup = await prisma.competition_entries.count({
  where: { age_group_id: ageGroupIdToDelete }
});

if (entriesUsingAgeGroup > 0) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Cannot delete age group: ${entriesUsingAgeGroup} entries are using it`
  });
}
```

Apply to:
- age_groups (check competition_entries)
- dance_categories (check competition_entries)
- classifications (check competition_entries)
- entry_size_categories (check competition_entries)
- scoring_tiers (check awards, scores)
- award_types (check awards)

### Unique Constraints

All lookup tables must have:
```sql
UNIQUE(tenant_id, name)
```

Prevent duplicate names within same tenant, allow same name across tenants.

---

## Testing Requirements

### Unit Tests
- [ ] Lookup table CRUD operations
- [ ] Tenant isolation (can't access other tenant's data)
- [ ] Validation rules (prevent deleting in-use items)
- [ ] Duplicate prevention (UNIQUE constraints work)

### Integration Tests
- [ ] Settings panel CRUD on EMPWR tenant
- [ ] Settings panel CRUD on Glow tenant
- [ ] Routine creation uses correct tenant's settings
- [ ] Scoring system uses correct tenant's rubric
- [ ] Awards calculation uses correct tenant's award_types

### Manual Testing Checklist
- [ ] Create age division on EMPWR → appears in EMPWR routine creation only
- [ ] Create dance category on Glow → appears in Glow routine creation only
- [ ] Update scoring tier on EMPWR → judges see updated rubric
- [ ] Delete unused entry size category → succeeds
- [ ] Delete in-use entry size category → fails with error message
- [ ] Switch between EMPWR and Glow → see different settings

---

## Rollback Plan

If issues discovered post-deployment:

1. **Settings Panel Breaks:**
   - Revert TRPC procedures to read JSONB fields
   - Settings panel continues working (read-only)
   - Fix lookup table code separately

2. **Routine Creation Breaks:**
   - Lookup tables unchanged (already used by routine creation)
   - No rollback needed for this system

3. **Data Corruption:**
   - Restore from database backup
   - Re-apply seeding scripts
   - Investigate root cause before re-deploying

---

## Open Questions

### Q1: Glow Tenant Defaults
Should Glow use same defaults as EMPWR, or custom settings?

**Decision:** ✅ CUSTOM - Glow has discrete settings provided by user

**Glow Settings (Complete):**

**Age Divisions:**
- Bitty: 0-4
- Tiny: 5-6
- Mini: 7-8
- Pre-Junior: 9-10
- Junior: 11-12
- Teen: 13-14
- Senior: 15-16
- Senior+: 17+

**Routine Categories (Entry Size):**
- Solo: 1 dancer, 3:00 max
- Duet: 2 dancers, 3:00 max
- Trio: 3 dancers, 3:00 max
- Small Group: 4-9 dancers, 3:30 max
- Large Group: 10-14 dancers, 4:00 max
- Line: 15-19 dancers, 5:00 max
- Super Line: 20+ dancers, 5:00 max
- Production: 1-999 dancers, 15:00 max (includes prop setup/exits)
- Adult Group: 1-999 dancers, 3:30 max
- Vocal: 1-999 dancers, 3:00 max
- Student Choreography: 1-999 dancers, 3:00 max

**Dance Styles:**
- Street Jazz
- Tap
- Jazz
- Lyrical
- Contemporary
- Hip-Hop
- Ballet
- Pointe
- Character Ballet
- Contemporary Ballet
- Acro
- Open
- Musical Theatre
- Vocal
- Song & Dance
- Modern
- Production
- Photogenic

**Levels (Classifications):**
- Emerald (Novice): 1st-year competitors only, max 2 solos
- Sapphire (Level 1): Max triple pirouette, no fouettés/aerials
- Crystal (Level 2): All turns except fouettés, all tricks except back tuck/full twist
- Titanium (Full Time): No limits, may appear in lower levels if ≤10% of group

**Scoring Rubric:**
- Afterglow: 291-300 points (out of 300 total)
- Platinum Plus: 276-290
- Platinum: 261-275
- Gold Plus: 246-260
- Gold: 231-245
- Bronze: 216-230

**Scoring Criteria (5 judges × 20 points each = 100 points max per judge, 300 total):**
- Technique: 20 points
- Execution: 20 points
- Stage Presence: 20 points
- Entertainment: 20 points
- Choreography: 20 points

**Special Awards:**
- Heartfelt Execution
- Creative Brilliance
- Outstanding Technique
- Captivating Performance
- Outstanding Performance
- Artistic Edge
- Unparalleled Precision
- You Are Glowing Award (judges' choice, includes full entry-fee scholarship)
- Kindness Award (selected by Glow Team)
- Born to Glow Award (in memory of Eleanor 'Ellie' Butler)

---

### Q2: competition_settings Table
Safe to delete after migration?

**User Concern:** "I'm worried what this will break"

**Mitigation:**
1. Mark as deprecated first
2. Monitor for 2 weeks
3. Search codebase for references
4. Delete only if zero usage found

**Decision:** Deprecate now, delete later after monitoring period

---

### Q3: Routine Types vs Entry Size Categories
Are these the same thing?

**Current State:**
- `entry_size_categories` table stores: Solo, Duet/Trio, Small Group, etc.
- `competition_settings` has separate `routine_types` with similar data
- Routine creation uses `entry_size_categories`

**User Confirmation:** "Yes I think entry size"

**Decision:** entry_size_categories is correct, routine_types in competition_settings is duplicate/orphaned

---

## Success Criteria

This specification is successfully implemented when:

1. ✅ Settings panel reads/writes lookup tables (not JSONB)
2. ✅ Settings panel uses ctx.tenantId (not hardcoded EMPWR)
3. ✅ All tabs functional: Age Divisions, Dance Styles, Scoring Rubric, Awards
4. ✅ EMPWR has complete awards seeded (matching images)
5. ✅ No duplicate rows in any lookup table
6. ✅ Routine creation dropdowns match settings panel data
7. ✅ EMPWR and Glow see different settings (tenant isolation verified)
8. ✅ Deleting in-use settings prevented with clear error
9. ✅ competition_settings table marked deprecated (not deleted yet)

---

## References

- **User Request:** 2025-10-28 conversation about tenant settings
- **EMPWR Awards Images:** 3 images provided showing complete awards structure
- **Affected Files:**
  - `src/app/dashboard/settings/tenant/page.tsx` (settings panel UI)
  - `src/server/routers/tenantSettings.ts` (TRPC procedures)
  - `src/components/EntryForm.tsx` (routine creation, line 100)
  - `src/server/routers/lookup.ts` (lookup data queries)
- **Database Tables:**
  - `tenants` (JSONB settings fields - to deprecate)
  - `competition_settings` (orphaned - to deprecate)
  - `dance_categories`, `age_groups`, `classifications`, `entry_size_categories` (source of truth)
  - `scoring_tiers` (new table - to create)
  - `award_types`, `awards` (existing - to populate)

---

**END OF SPECIFICATION**
