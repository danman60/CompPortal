# Tenant Isolation Architecture

**Status:** ✅ Fully Implemented (as of rollback to commit 522f9eb)

## Overview

CompPortal uses a **single database, multi-tenant architecture** with data isolation via `tenant_id` foreign keys and tRPC context-based filtering.

## Current Deployment Model

**EMPWR-only deployment:**
- Single Vercel deployment serves empwr.compsync.net
- All queries filtered to EMPWR tenant (`00000000-0000-0000-0000-000000000001`)
- Glow data exists in same database but is invisible to EMPWR users

**Future: Separate deployments per tenant**
- Each tenant gets own Vercel project deployment
- Same codebase, different `TENANT_ID` environment variable
- Zero code changes required

## Implementation Details

### 1. tRPC Context Tenant Resolution

**File:** `src/app/api/trpc/[trpc]/route.ts:49-57`

```typescript
// TEMPORARY: Default to EMPWR tenant if none detected (for demo)
const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
const finalTenantData = tenantData || {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'EMPWR Dance Experience',
  subdomain: 'demo',
  slug: 'empwr',
  branding: {},
};
```

**How it works:**
1. Every tRPC request creates a context with `ctx.tenantId`
2. Falls back to EMPWR tenant ID if no subdomain detected
3. All routers receive tenant context automatically

### 2. Router-Level Filtering

#### Competition Router (`competition.ts:56-68`)
```typescript
// Tenant filtering: super admins can see all tenants or filter by specific tenant
if (isSuperAdmin(ctx.userRole)) {
  if (tenantId) {
    where.tenant_id = tenantId;
  }
  // No tenant filter if super admin and no specific tenant requested
} else {
  // Non-super admins only see their own tenant's competitions
  if (ctx.tenantId) {
    where.tenant_id = ctx.tenantId;
  } else {
    // If no tenant context, return empty results
    return { competitions: [], total: 0 };
  }
}
```

**Pattern:**
- Super admins can see all tenants (for system management)
- Competition directors and studio directors only see their tenant
- Returns empty array if no tenant context (fail-safe)

#### Studio Router (`studio.ts:77-90`)
Uses identical pattern to competition router.

#### Entry Router (`entry.ts:603-619`)
Filters via studio relationship:
```typescript
if (!isSuperAdmin(ctx.userRole)) {
  // Non-super admins: filter entries to their tenant via studios
  if (!where.studio_id) {
    // If not already filtered by specific studio, add tenant filter
    if (!ctx.tenantId) {
      return { entries: [], total: 0, limit, offset, hasMore: false };
    }
    where.studios = {
      tenant_id: ctx.tenantId,
    };
  }
}
```

**Pattern:**
- Entries don't have direct `tenant_id` column
- Filtered via `studios.tenant_id` relationship
- Studio directors see only their studio (which is already tenant-filtered)

#### Dancer Router (`dancer.ts:258, 505, 690`)
Hardcodes EMPWR tenant on create:
```typescript
const dancer = await prisma.dancers.create({
  data: {
    ...data,
    tenant_id: '00000000-0000-0000-0000-000000000001', // EMPWR tenant
    // ...
  },
});
```

**Pattern:**
- Dancers created with hardcoded EMPWR tenant ID
- For future multi-deployment: Change to `ctx.tenantId`
- Queries filtered via studio relationship

#### Reservation Router (`reservation.ts:110-116`)
Filters via studio (which is already tenant-filtered):
```typescript
// Studio directors can only see their own studio's reservations
if (isStudioDirector(ctx.userRole) && ctx.studioId) {
  where.studio_id = ctx.studioId;
} else if (studioId) {
  // Admins can filter by studioId if provided
  where.studio_id = studioId;
}
```

**Pattern:**
- Reservations link to studios
- Studios are tenant-filtered
- Transitive isolation via studio relationship

### 3. Database Schema

**Tables with `tenant_id` column:**
- `tenants` (root table)
- `competitions`
- `studios`
- `dancers`
- `user_profiles`
- 24 other related tables

**Foreign key constraints:**
```sql
ALTER TABLE competitions
  ADD CONSTRAINT fk_competitions_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE RESTRICT;
```

**Row Level Security (RLS):** Not currently used - filtering handled at application layer (tRPC routers)

## Tenant Data

**EMPWR Tenant:**
```
ID: 00000000-0000-0000-0000-000000000001
Name: EMPWR Dance Experience
Subdomain: demo
Slug: empwr
```

**Glow Tenant:**
```
ID: 00000000-0000-0000-0000-000000000002
Name: Glow Dance Experience
Subdomain: glow
Slug: glow
```

Both exist in same database. Isolation ensures EMPWR deployment only sees EMPWR data.

## Testing Tenant Isolation

**Verify isolation:**
```sql
-- Count competitions per tenant
SELECT t.name, COUNT(c.id) as competition_count
FROM tenants t
LEFT JOIN competitions c ON c.tenant_id = t.id
GROUP BY t.name;

-- Count studios per tenant
SELECT t.name, COUNT(s.id) as studio_count
FROM tenants t
LEFT JOIN studios s ON s.tenant_id = t.id
GROUP BY t.name;

-- Count dancers per tenant
SELECT t.name, COUNT(d.id) as dancer_count
FROM tenants t
LEFT JOIN dancers d ON d.tenant_id = t.id
GROUP BY t.name;
```

**Expected result for EMPWR deployment:**
- Users should only see EMPWR competitions, studios, dancers
- Glow data invisible (filtered by WHERE clauses)

## Future: Multi-Deployment Strategy

**When adding Glow deployment:**

1. **Create new Vercel project:** "compportal-glow"
2. **Set environment variables:**
   ```env
   TENANT_ID=00000000-0000-0000-0000-000000000002
   # All other env vars same as EMPWR
   ```
3. **Deploy same codebase**
4. **Point glow.compsync.net to new deployment**

**Changes needed:** NONE - tRPC context will use `process.env.TENANT_ID` instead of hardcoded EMPWR ID

**Update required in route.ts:**
```typescript
// Change from:
const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

// To:
const finalTenantId = tenantId || process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';
```

## Security Considerations

**Strengths:**
- ✅ Application-layer filtering (fail-safe defaults)
- ✅ Super admin bypass for system management
- ✅ Role-based access control (studio directors can't see other studios)
- ✅ Foreign key constraints prevent orphaned records

**Potential improvements:**
- Add database-level RLS policies (defense in depth)
- Add `tenant_id` to JWT claims for additional validation
- Audit log all cross-tenant queries by super admins

## Rollback Context

This architecture survived the multi-tenant rollback because:
- Database already had `tenant_id` columns (preserved)
- tRPC context defaulting to EMPWR works for single-tenant
- Routers already had tenant filtering logic
- Only removed: subdomain routing, middleware tenant detection

**What was removed:**
- Subdomain-based tenant resolution
- Dynamic tenant switching
- Next.js middleware tenant injection

**What remained:**
- Database tenant_id structure
- Router filtering logic
- tRPC context tenant defaulting

This "accidental" architecture is actually ideal for the two-deployment strategy.

---

**Last updated:** 2025-10-27 (commit 7f44c79)
**Next review:** When adding Glow deployment
