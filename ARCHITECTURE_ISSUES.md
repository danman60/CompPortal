# Architecture Issues & Technical Debt

## Issue #1: Lookup Tables Missing Tenant Isolation

**Discovered:** Session 18 (Oct 26, 2025)
**Severity:** HIGH - Data leakage across tenants
**Status:** Temporary fix applied, proper fix needed

### Problem

Three core lookup tables are missing `tenant_id` foreign keys:
- `age_groups` (lines 364-379 in schema.prisma)
- `dance_categories` (lines 665-684)
- `entry_size_categories` (lines 823-835)

**Impact:**
- All tenants see each other's age groups, categories, and sizes
- Dropdowns show 3-4x duplicates in production
- No tenant data isolation for configuration

**Current Workaround:**
Deduplicating by name in `AutoCalculatedSection.tsx:45-59`

### Proper Fix (Database Migration Required)

#### Step 1: Add tenant_id columns
```sql
ALTER TABLE age_groups ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE dance_categories ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE entry_size_categories ADD COLUMN tenant_id UUID REFERENCES tenants(id);
```

#### Step 2: Migrate existing data
```sql
-- Associate existing records with first tenant (or prompt user)
UPDATE age_groups SET tenant_id = (SELECT id FROM tenants LIMIT 1);
UPDATE dance_categories SET tenant_id = (SELECT id FROM tenants LIMIT 1);
UPDATE entry_size_categories SET tenant_id = (SELECT id FROM tenants LIMIT 1);
```

#### Step 3: Add NOT NULL constraint
```sql
ALTER TABLE age_groups ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE dance_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE entry_size_categories ALTER COLUMN tenant_id SET NOT NULL;
```

#### Step 4: Update lookupRouter
```typescript
// src/server/routers/lookup.ts
getAllForEntry: protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user?.id;
  const userProfile = await prisma.user_profiles.findUnique({
    where: { id: userId },
    select: { tenant_id: true },
  });

  const [categories, ageGroups, entrySizeCategories] = await Promise.all([
    prisma.dance_categories.findMany({
      where: {
        is_active: true,
        tenant_id: userProfile?.tenant_id,
      },
      orderBy: { sort_order: 'asc' },
    }),
    prisma.age_groups.findMany({
      where: { tenant_id: userProfile?.tenant_id },
      orderBy: { sort_order: 'asc' },
    }),
    prisma.entry_size_categories.findMany({
      where: { tenant_id: userProfile?.tenant_id },
      orderBy: { sort_order: 'asc' },
    }),
  ]);

  return { categories, ageGroups, entrySizeCategories };
});
```

#### Step 5: Update settings pages
- `/dashboard/settings/tenant` pages need to create with `tenant_id`
- All CRUD operations should filter by `tenant_id`

### Testing Plan

1. Create 2 test tenants
2. Add different age groups to each
3. Verify Tenant A only sees their age groups
4. Verify Tenant B only sees their age groups
5. Test entry creation uses correct tenant's data

### Rollback Plan

If migration fails:
1. Revert schema changes
2. Keep deduplication workaround in place
3. Document multi-tenant architecture decision

---

## Future Architecture Decisions Needed

### Question: Should lookups be tenant-specific or global?

**Option A: Tenant-Specific (Proposed Above)**
- Pro: Full multi-tenant isolation
- Pro: Each tenant customizes their own categories/ages
- Con: More complex database structure
- Con: Harder to share best practices across tenants

**Option B: Global with Tenant Overrides**
- Pro: Standard categories shared across all
- Pro: Simpler onboarding (defaults provided)
- Con: Still need override mechanism
- Con: Partial multi-tenancy

**Decision Needed:** Consult with user on multi-tenant strategy

---

**Created:** Oct 26, 2025
**Last Updated:** Oct 26, 2025
**Owner:** Engineering Team
