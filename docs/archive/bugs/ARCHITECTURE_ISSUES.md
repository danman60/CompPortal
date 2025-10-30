# Architecture Issues & Technical Debt

## Issue #1: Lookup Tables Missing Tenant Isolation

**Discovered:** Session 18 (Oct 26, 2025)
**Severity:** HIGH - Data leakage across tenants
**Status:** ✅ RESOLVED (Oct 26, 2025)

### Problem

Three core lookup tables are missing `tenant_id` foreign keys:
- `age_groups` (lines 364-379 in schema.prisma)
- `dance_categories` (lines 665-684)
- `entry_size_categories` (lines 823-835)

**Impact:**
- All tenants see each other's age groups, categories, and sizes
- Dropdowns show 3-4x duplicates in production
- No tenant data isolation for configuration

### Resolution (Completed Oct 26, 2025)

**Commits:**
- e44908b - Database migration adding tenant_id columns
- 05104db - Router filtering and schema updates

**Changes:**

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

#### Step 4: Update lookupRouter ✅
```typescript
// src/server/routers/lookup.ts:48-83
getAllForEntry: protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  const [categories, ageGroups, entrySizeCategories] = await Promise.all([
    prisma.dance_categories.findMany({
      where: { is_active: true, tenant_id: ctx.tenantId },
      orderBy: { sort_order: 'asc' },
    }),
    prisma.age_groups.findMany({
      where: { tenant_id: ctx.tenantId },
      orderBy: { sort_order: 'asc' },
    }),
    prisma.entry_size_categories.findMany({
      where: { tenant_id: ctx.tenantId },
      orderBy: { sort_order: 'asc' },
    }),
  ]);

  return { categories, ageGroups, entrySizeCategories };
});
```

#### Step 5: Update Prisma schema ✅
- Added `tenant_id String @db.Uuid` to age_groups, dance_categories, entry_size_categories
- Added relations to tenants model
- Regenerated Prisma client

#### Step 6: Remove deduplication workaround ✅
- Removed lines 45-59 from AutoCalculatedSection.tsx
- Now using tenant-filtered data from router

### Next Steps

**Settings Pages (Future Enhancement):**
- Update `/dashboard/settings/tenant` to allow CD to manage lookup values
- Implement CRUD for age groups, categories, sizes per tenant
- All operations auto-filter by `ctx.tenantId`

**Production Testing (Next Session):**
1. Test entry creation form at https://www.compsync.net
2. Verify EMPWR tenant sees only their age groups/sizes
3. Verify no duplicates in dropdowns
4. Test entry creation with tenant-filtered data

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
