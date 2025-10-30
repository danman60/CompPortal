# Competition Settings & Multi-Tenant Architecture - COMPLETE ANALYSIS

**Date:** October 30, 2025  
**Analyst:** Claude Code  
**Status:** ✅ Analysis Complete  

---

## Executive Summary

**Architecture:** Hybrid system with tenant-scoped lookup tables + competition JSONB overrides  
**Multi-Tenant Isolation:** ✅ Working correctly via `tenant_id` filtering  
**Data Integrity:** ⚠️ EMPWR has duplicate age groups that need cleanup  
**Settings UI:** ❌ Disconnected from runtime data (queries orphaned table)

---

## Key Findings

### ✅ What's Working

1. **Tenant-Scoped Lookup Tables** (PRIMARY SOURCE OF TRUTH)
   - `age_groups` - 20 rows (EMPWR: 12, Glow: 8)
   - `dance_categories` - 27 rows (EMPWR: 9, Glow: 18)
   - `entry_size_categories` - 17 rows (EMPWR: 6, Glow: 11)
   - `classifications` - 9 rows
   - `scoring_tiers` - 11 rows
   - `award_types` - 44 rows
   - All have `tenant_id` column ✅
   - All properly filtered in queries ✅
   - 150+ references across routers ✅

2. **Multi-Tenant Data Isolation**
   - EMPWR subdomain: `empwr.compsync.net`
   - Glow subdomain: `glow.compsync.net`
   - Different settings per tenant ✅
   - No cross-tenant data leakage ✅

### ⚠️ Data Issues Found

1. **EMPWR Duplicate Age Groups**
   ```
   Teen (12-14) sort_order=4
   Teen (13-14) sort_order=7   ← DUPLICATE
   
   Junior (11-12) sort_order=3
   Junior (9-11) sort_order=null  ← DUPLICATE
   
   Petite sort_order=null  ← ORPHANED
   ```

2. **Settings Router Queries Wrong Table**
   - `settings.ts` queries `competition_settings` (no tenant_id)
   - Entry creation uses `age_groups`, `dance_categories`, etc.
   - UI shows generic data, not tenant-specific data
   - CD cannot edit actual tenant configuration

3. **Orphaned competition_settings Table**
   - 21 rows (age_divisions, dance_styles, routine_types, scoring_rubric)
   - NO `tenant_id` column
   - NOT used by entry creation
   - NOT connected to any system

### ❌ What's Broken

1. Settings panel UI disconnected from runtime
2. EMPWR has duplicate/orphaned age groups
3. Global `competition_settings` table appears unused

---

## Tenant Comparison

### EMPWR Dance Experience

**Tenant ID:** `00000000-0000-0000-0000-000000000001`  
**Competitions:** 5 (3 active, 2 cancelled)  

**Settings:**
- Age Groups (12): Mini (7-8), Junior (11-12), Teen (13-14), Senior+ (17+)
- Dance Categories (9): Ballet, Jazz, Tap, Contemporary, Hip Hop, Lyrical, Acro, Musical Theatre, Pointe
- Entry Sizes (6): Solo, Duet/Trio (combined), Small Group, Large Group, Line, Super Line

**Fees:**
- Entry: $75
- Late: $25
- Tax: 0%

**Competition Overrides:** None (uses tenant defaults)

---

### Glow Dance Competition

**Tenant ID:** `4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5`  
**Competitions:** 7 (all registration_open)

**Settings:**
- Age Groups (8): Bitty (0-4), Tiny (5-6), Mini (7-8), Pre-Junior (9-10), Junior (11-12), Teen (13-14), Senior (15-16), Senior+ (17+)
- Dance Categories (18): Jazz, Street Jazz, Tap, Lyrical, Contemporary, Hip-Hop, Ballet, Pointe, Character Ballet, Contemporary Ballet, Acro, Modern, Open, Musical Theatre, Vocal, Song & Dance, Production, Photogenic
- Entry Sizes (11): Solo, Duet, Trio (separate!), Small Group, Large Group, Line, Super Line, Production, Adult Group, Vocal, Student Choreography

**Fees:**
- Entry: NULL (per competition)
- Late: $10
- Tax: 13% (HST)

**Competition Overrides:** ✅ ALL 7 competitions have custom age_division_settings in JSONB

**Question:** Why duplicate identical settings across all 7 competitions instead of using tenant defaults?

---

## Data Flow

### Entry Creation (Runtime)

```typescript
// Step 1: Query tenant-scoped lookup tables
const ageGroups = await prisma.age_groups.findMany({
  where: { tenant_id: ctx.tenantId }  // ✅ Proper filtering
});

const danceCategories = await prisma.dance_categories.findMany({
  where: { tenant_id: ctx.tenantId }  // ✅ Proper filtering
});

// Step 2: User selects from dropdowns
// Step 3: Create entry with foreign keys
await prisma.competition_entries.create({
  data: {
    age_group_id: selectedId,  // FK → age_groups
    dance_category_id: categoryId  // FK → dance_categories
  }
});
```

### Settings Panel (Admin UI)

```typescript
// ❌ CURRENT (WRONG):
const settings = await prisma.competition_settings.findMany({
  where: { is_active: true }  // No tenant_id!
});

// ✅ SHOULD BE:
const ageGroups = await prisma.age_groups.findMany({
  where: { tenant_id: ctx.tenantId }
});
```

---

## Recommendations

### P0 - Immediate Fixes

1. **Fix EMPWR duplicate age groups**
   ```sql
   DELETE FROM age_groups 
   WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
     AND name IN ('Teen', 'Junior', 'Petite')
     AND sort_order IS NULL;
   ```

2. **Update settings.ts router**
   - Change queries from `competition_settings` to tenant-scoped tables
   - Add CRUD operations for each lookup table
   - Add proper tenant_id filtering

3. **Deprecate competition_settings table**
   - Mark as deprecated in schema
   - Document that it's not tenant-scoped
   - Or migrate to add tenant_id column

### P1 - Data Cleanup

4. **Review Glow competition overrides**
   - All 7 competitions have identical age_division_settings
   - If same, move to tenant defaults
   - Clear JSONB if not needed

5. **Add validation constraints**
   - NOT NULL on sort_order
   - CHECK (min_age < max_age)
   - Prevent orphaned entries

### P2 - Architecture Improvements

6. **Document override hierarchy**
   - Competition JSONB > Tenant defaults > System defaults
   - Create specification document

7. **Settings management UI**
   - CD can edit tenant defaults
   - Preview changes
   - Audit trail

---

## Schema Details

### Lookup Table Structure (Common Pattern)

```sql
CREATE TABLE age_groups (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  min_age INT,
  max_age INT,
  sort_order INT,
  created_at TIMESTAMP,
  
  UNIQUE(tenant_id, name),
  INDEX idx_age_groups_tenant(tenant_id)
);
```

**Key Features:**
- ✅ `tenant_id` NOT NULL
- ✅ CASCADE delete
- ✅ Unique constraint per tenant
- ✅ Performance index

### entry_size_categories Schema

```sql
id                UUID PK
name              VARCHAR
min_participants  INT
max_participants  INT
base_fee          DECIMAL
per_participant_fee DECIMAL
sort_order        INT
created_at        TIMESTAMP
tenant_id         UUID (FK → tenants)
```

---

## Code References

**Router files using lookup tables:** 150+ references

**Top routers:**
1. `entry.ts` - 60+ references (entry creation)
2. `competition.ts` - 30+ references (setup)
3. `admin.ts` - 20+ references (seeding)
4. `analytics.ts` - 15+ references (reporting)

**Consistent pattern:**
```typescript
where: { tenant_id: ctx.tenantId }  // ✅ Always filtered
orderBy: { sort_order: 'asc' }       // ✅ Consistent sorting
```

---

## Multi-Tenant Isolation Verification

**✅ Tested:**
- [x] EMPWR data queries
- [x] Glow data queries
- [x] tenant_id filtering
- [x] No cross-tenant leakage
- [x] Proper row counts

**Database Verification:**
```sql
-- Tenant data summary
EMPWR: 5 competitions, 21 settings (shared global)
Glow: 7 competitions, 21 settings (shared global)

-- Tenant-specific data
EMPWR age_groups: 12
Glow age_groups: 8

EMPWR dance_categories: 9
Glow dance_categories: 18

EMPWR entry_sizes: 6
Glow entry_sizes: 11
```

---

## Next Steps

1. ✅ Analysis complete
2. ⏳ Await user direction on:
   - Fix EMPWR duplicates?
   - Update settings router?
   - Deprecate competition_settings?
   - Cleanup Glow overrides?

---

**Analysis Complete** - Ready for implementation decisions

