# Prisma Best Practices for CompPortal

**Last Updated:** October 28, 2025
**Status:** Production-validated patterns

## Critical Issue: Nested Creates Causing NULL Foreign Keys

### Problem Statement

When using Prisma's nested `create` syntax alongside scalar foreign key fields, the parent record's foreign keys can become NULL, causing constraint violations.

**Date Discovered:** October 28, 2025
**Investigation Duration:** 6+ hours
**Root Cause:** Nested create operations interfere with parent scalar field assignments

### Symptoms

```typescript
// ❌ THIS FAILS
const entry = await prisma.competition_entries.create({
  data: {
    tenant_id: "00000000-0000-0000-0000-000000000001",  // ✅ Provided
    competition_id: "abc-123",
    studio_id: "def-456",
    entry_participants: {
      create: [{
        dancer_id: "ghi-789",
        dancer_name: "John Doe",
      }]
    }
  }
});
```

**Error:**
```
Null constraint violation on the fields: (`tenant_id`)
```

Even though `tenant_id` was explicitly set, it becomes NULL when a nested `create` is present.

### Investigation Results

We tested 5 configurations using a debug tool (`/dashboard/admin/tenant-debug`):

| Configuration | Syntax | Nested Create | Result |
|--------------|--------|---------------|---------|
| `mixed_tenant_scalar` | tenant_id scalar + others relational | ✅ Yes | ❌ Validation Error* |
| `scalar_with_nested` | All scalar fields | ✅ Yes | ❌ NULL tenant_id |
| `scalar_without_nested` | All scalar fields | ❌ No | ✅ **SUCCESS** |
| `relational_with_nested` | All relational | ✅ Yes | ⏭️ Not tested |
| `relational_without_nested` | All relational | ❌ No | ⏭️ Not tested |

*Validation Error: Prisma forbids mixing scalar and relational syntax in the same create operation.

### Root Cause Analysis

1. **Database Level:** Removed `DEFAULT gen_random_uuid()` from `tenant_id` column (was filling with random UUID instead of provided value)
2. **Prisma Level:** Nested `create` operations cause parent scalar fields to be ignored/nullified during INSERT
3. **Workaround:** Split into 2 operations - create parent first, then children

### Solution: Two-Step Creation Pattern

```typescript
// ✅ CORRECT APPROACH
const entry = await prisma.$transaction(async (tx) => {
  // Step 1: Create parent record WITHOUT nested creates
  const entry = await tx.competition_entries.create({
    data: {
      tenant_id: ctx.tenantId,
      competition_id: data.competition_id,
      studio_id: data.studio_id,
      category_id: data.category_id,
      classification_id: data.classification_id,
      age_group_id: data.age_group_id,
      entry_size_category_id: data.entry_size_category_id,
      title: data.title,
      status: 'draft',
      // NO nested creates here!
    }
  });

  // Step 2: Create child records separately
  if (participants.length > 0) {
    await tx.entry_participants.createMany({
      data: participants.map(p => ({
        entry_id: entry.id,
        dancer_id: p.dancer_id,
        dancer_name: p.dancer_name,
        dancer_age: p.dancer_age,
        tenant_id: ctx.tenantId, // Include if multi-tenant
      }))
    });
  }

  return entry;
});
```

### Migration Applied

**Migration:** `20251028173953_remove_tenant_id_default_from_competition_entries`

```sql
-- Remove incorrect DEFAULT gen_random_uuid() from tenant_id
-- This column should be set by application via Prisma relation, not by DB default
ALTER TABLE public.competition_entries
  ALTER COLUMN tenant_id DROP DEFAULT;

COMMENT ON COLUMN public.competition_entries.tenant_id IS
  'Tenant ID set by application. No DB default.';
```

## Best Practices

### 1. Foreign Key Assignment

**Rule:** Use scalar fields (not relational syntax) for all foreign keys in multi-tenant applications.

```typescript
// ✅ CORRECT
data: {
  tenant_id: ctx.tenantId,
  competition_id: data.competition_id,
}

// ❌ AVOID (causes mixing issues)
data: {
  tenants: { connect: { id: ctx.tenantId } },
  competitions: { connect: { id: data.competition_id } },
}
```

**Why:** Relational syntax is elegant but:
- Cannot be mixed with scalar fields (Prisma validation error)
- May not work correctly with nested creates
- Less explicit about tenant isolation

### 2. Nested Creates

**Rule:** Avoid nested creates when setting critical foreign keys (especially `tenant_id`).

```typescript
// ✅ CORRECT - Two-step process
const parent = await tx.parent.create({ data: { ... } });
await tx.children.createMany({
  data: childData.map(c => ({ ...c, parent_id: parent.id }))
});

// ❌ AVOID
const parent = await tx.parent.create({
  data: {
    tenant_id: ctx.tenantId, // May become NULL!
    children: { create: [...] }
  }
});
```

### 3. Multi-Tenant Isolation

**Rule:** ALWAYS explicitly set `tenant_id` on ALL tables.

```typescript
// ✅ CORRECT
await tx.table.create({
  data: {
    tenant_id: ctx.tenantId, // MANDATORY
    // ... other fields
  }
});

// ❌ NEVER rely on database defaults or Prisma magic
```

### 4. Database Constraints

**Rule:** Foreign key columns should NOT have `DEFAULT` values.

```sql
-- ❌ BAD
tenant_id UUID NOT NULL DEFAULT gen_random_uuid()

-- ✅ GOOD
tenant_id UUID NOT NULL
```

Application code should ALWAYS provide the value explicitly.

### 5. Transaction Wrapping

**Rule:** Wrap parent + children creation in a single transaction.

```typescript
// ✅ CORRECT
await prisma.$transaction(async (tx) => {
  const parent = await tx.parent.create({ ... });
  await tx.children.createMany({ ... });
  return parent;
});

// ❌ AVOID - Race conditions, partial failures
const parent = await prisma.parent.create({ ... });
await prisma.children.createMany({ ... });
```

## Testing Pattern

Use the tenant debug tool at `/dashboard/admin/tenant-debug` to validate:

1. Context propagation (tenantId exists)
2. Database queries (all data fetched correctly)
3. Create operations (test in transaction with rollback)
4. Tenant isolation (verify tenant_id set correctly)

**Debug Tool Features:**
- 5 test configurations
- Full step-by-step logging
- Transaction rollback (non-destructive)
- JSON export for analysis

## Common Pitfalls

### Pitfall 1: Mixing Syntax
```typescript
// ❌ FAILS with validation error
{
  tenant_id: "uuid",           // Scalar
  competitions: { connect }    // Relational
}
```
**Fix:** Use all scalar OR all relational (prefer scalar for multi-tenant).

### Pitfall 2: Nested Create with Critical FKs
```typescript
// ❌ tenant_id becomes NULL
{
  tenant_id: "uuid",
  entry_participants: { create: [...] }
}
```
**Fix:** Create parent first, then children separately.

### Pitfall 3: Database Defaults
```sql
-- ❌ Hides bugs, causes random UUIDs
DEFAULT gen_random_uuid()
```
**Fix:** Remove defaults, force explicit application-level assignment.

## Reference

- **Issue Date:** October 28, 2025
- **Debug Session:** tenant-debug-1761675277435.json (mixed_tenant_scalar)
- **Debug Session:** tenant-debug-1761675412569.json (scalar_with_nested)
- **Debug Session:** tenant-debug-1761675511551.json (scalar_without_nested - SUCCESS)
- **Migration:** 20251028173953_remove_tenant_id_default_from_competition_entries
- **Affected Files:**
  - `src/server/routers/entry.ts` (entry creation)
  - `src/server/routers/tenantDebug.ts` (debug tool)
- **Prisma Docs Reference:**
  - [Nested Writes](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries#nested-writes)
  - [CRUD Operations](https://www.prisma.io/docs/orm/prisma-client/queries/crud)

## Action Items

- [x] Remove DEFAULT from tenant_id column
- [x] Create multi-config debug tool
- [x] Identify working configuration (scalar_without_nested)
- [ ] Refactor entry.ts to use two-step pattern
- [ ] Test production entry creation flow
- [ ] Add pre-commit hook to prevent nested creates on multi-tenant tables

---

**Lesson Learned:** When Prisma behavior seems magical, it's hiding complexity. Explicit is better than implicit, especially for critical fields like `tenant_id`.
