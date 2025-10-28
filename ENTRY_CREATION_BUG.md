# Entry Creation Bug - Complete Investigation Log

**Date:** October 28, 2025
**Status:** UNRESOLVED (3 failed fix attempts)
**Severity:** P0 CRITICAL - Entry creation completely broken

---

## Bug Description

**User Action:** Studio Director creates routine entry at `/dashboard/entries/create`

**Error:**
```
POST /api/trpc/entry.create 500 Internal Server Error
Invalid `prisma.competition_entries.create()` invocation
```

**Impact:** Studio Directors cannot create entries - core functionality broken

---

## Database State (Verified)

**Studios Table:**
```sql
SELECT id, name, tenant_id FROM studios
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'danieljohnabrahamson@gmail.com');
-- Result: tenant_id = '00000000-0000-0000-0000-000000000001' ✓ EXISTS
```

**Schema:**
- `competition_entries` has `tenant_id String @db.Uuid` (scalar field)
- `competition_entries` has `tenants` relation (foreign key relation)
- Unique constraint: `(tenant_id, name)` on classifications

---

## Fix Attempt Timeline

### Attempt #1: Direct `tenant_id` Scalar Field
**Commit:** d553d7a
**Code:**
```typescript
const createData = {
  // ...
  tenant_id: studio.tenant_id,  // Direct scalar field
  competitions: { connect: { id: data.competition_id } },
  studios: { connect: { id: data.studio_id } },
};
```

**Error:**
```
Argument `tenants` is missing.
Invalid `prisma.competition_entries.create()` invocation
```

**Why it failed:** Prisma requires the relation field, not just the scalar.

---

### Attempt #2: Relation Connect Only
**Commit:** 7a7d4bb
**Code:**
```typescript
const createData = {
  // ...
  tenants: { connect: { id: studio.tenant_id } },  // Relation only
  competitions: { connect: { id: data.competition_id } },
  studios: { connect: { id: data.studio_id } },
};
```

**Error:**
```
Null constraint violation on the fields: (`tenant_id`)
```

**Why it failed:** `studio.tenant_id` is somehow NULL at runtime, even though database has value.

**Safety check added:**
```typescript
if (!studio.tenant_id) {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `Studio "${studio.name}" has no tenant assigned`
  });
}
```

**Observation:** Error happened before safety check, suggesting Prisma-level issue.

---

### Attempt #3: Both Scalar AND Relation
**Commit:** b8bbe64
**Code:**
```typescript
const createData = {
  // ...
  tenant_id: studio.tenant_id,             // Direct scalar
  tenants: { connect: { id: studio.tenant_id } },  // Relation
  competitions: { connect: { id: data.competition_id } },
};
```

**Error:**
```
Unknown argument `tenant_id`. Did you mean `tenants`?
Available options are marked with ?.
```

**Why it failed:** Prisma doesn't allow providing both scalar and relation when using `connect`.

**Prisma Rule Learned:** When using `relation: { connect }`, Prisma auto-populates the scalar field. You cannot provide both.

---

## Root Cause Investigation

### Mystery: Why is `studio.tenant_id` NULL?

**Code Query (entry.ts:905-908):**
```typescript
const studio = await prisma.studios.findUnique({
  where: { id: data.studio_id },
  select: { id: true, name: true, tenant_id: true },
});
```

**Database Verification:**
```sql
-- This returns tenant_id correctly!
SELECT id, name, tenant_id FROM studios
WHERE id = '6a058889-ef9b-4e16-85da-8b1b2c5e258b';
-- tenant_id = '00000000-0000-0000-0000-000000000001'
```

**Hypothesis 1: Schema Out of Sync**
- Check if `prisma/schema.prisma` studios model has `tenant_id` field
- Run `npx prisma generate` to regenerate client

**Hypothesis 2: Procedure Context Issue**
- Entry creation uses `publicProcedure` (not `protectedProcedure`)
- Maybe `ctx.tenantId` should be used instead of `studio.tenant_id`
- Check if context is properly populated

**Hypothesis 3: Prisma Client Cache**
- Old generated Prisma client might not have latest schema
- Delete `node_modules/.prisma` and regenerate

---

## Prisma Schema State

**competition_entries model:**
```prisma
model competition_entries {
  tenant_id    String   @db.Uuid
  tenants      tenants  @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  // ... other fields
}
```

**studios model (need to verify):**
```prisma
model studios {
  tenant_id    String?  @db.Uuid  // Check if this is nullable!
  tenants      tenants  @relation(fields: [tenant_id], references: [id])
  // ... other fields
}
```

**CRITICAL CHECK NEEDED:** Is `studios.tenant_id` nullable in schema?

---

## Alternative Solutions to Try

### Option A: Use ctx.tenantId instead
```typescript
// Instead of studio.tenant_id, use context
const tenantId = ctx.tenantId || studio.tenant_id;

if (!tenantId) {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'No tenant context available'
  });
}

const createData = {
  tenants: { connect: { id: tenantId } },
  // ...
};
```

### Option B: Fetch studio with full relation
```typescript
const studio = await prisma.studios.findUnique({
  where: { id: data.studio_id },
  include: { tenants: true },  // Include full relation
});

if (!studio?.tenants?.id) {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Studio has no tenant relation'
  });
}

const createData = {
  tenants: { connect: { id: studio.tenants.id } },
  // ...
};
```

### Option C: Debug with explicit logging
```typescript
const studio = await prisma.studios.findUnique({
  where: { id: data.studio_id },
  select: { id: true, name: true, tenant_id: true },
});

console.log('[DEBUG] Studio query result:', {
  studioId: studio?.id,
  studioName: studio?.name,
  tenantId: studio?.tenant_id,
  tenantIdType: typeof studio?.tenant_id,
  isNull: studio?.tenant_id === null,
  isUndefined: studio?.tenant_id === undefined,
});

// Then use the value
```

---

## Related Issues Fixed This Session

### Issue 1: Duplicate Dropdowns (FIXED)
**Problem:** Classifications showing "Titanium" and "Crystal" twice

**Root Cause:**
- `classifications` table DOES have `tenant_id` in database
- Prisma schema was MISSING `tenant_id` field
- Schema out of sync with database

**Fix Applied:**
```prisma
// Before (WRONG):
model classifications {
  name @unique @db.VarChar(100)
  // no tenant_id
}

// After (CORRECT):
model classifications {
  tenant_id String @db.Uuid
  name String @db.VarChar(100)
  tenants tenants @relation(fields: [tenant_id], references: [id])
  @@unique([tenant_id, name])
}
```

**lookup.ts updated:**
```typescript
prisma.classifications.findMany({
  where: { tenant_id: ctx.tenantId },  // Now possible!
  orderBy: { skill_level: 'asc' },
})
```

### Issue 2: Pipeline Table Display Bug (FIXED)
**Problem:** "175" displaying as "1750" in REQUESTED column

**Root Cause:** React falsy conditional rendering
```typescript
// WRONG - renders 0 as text node:
{reservation.spacesConfirmed && ... }
// When spacesConfirmed=0, React renders "0" next to "175" = "1750"

// CORRECT - explicit null check:
{(reservation.spacesConfirmed != null && ... )}
```

**Files:** `src/components/rebuild/pipeline/ReservationTable.tsx:117`

### Issue 3: Tenant Isolation on Pipeline (FIXED)
**Problem:** `getPipelineView` had NO tenant filter

**Fix:** Added `where: { tenant_id: ctx.tenantId }` to reservations query

**File:** `src/server/routers/reservation.ts:1274`

---

## Current Code State

**File:** `src/server/routers/entry.ts:966`
```typescript
const createData: any = {
  title: data.title,
  status: data.status,
  // ...
  tenants: { connect: { id: studio.tenant_id } },  // Current code
  competitions: { connect: { id: data.competition_id } },
  studios: { connect: { id: data.studio_id } },
  dance_categories: { connect: { id: data.category_id } },
  classifications: { connect: { id: data.classification_id } },
};
```

**Studio Query:** Lines 905-923
```typescript
const studio = await prisma.studios.findUnique({
  where: { id: data.studio_id },
  select: { id: true, name: true, tenant_id: true },
});

if (!studio) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Studio not found' });
}

if (!studio.tenant_id) {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `Studio "${studio.name}" has no tenant assigned`
  });
}
```

---

## Next Steps for Investigation

1. **Check Prisma Generated Types:**
   ```bash
   grep -A20 "export type studios" node_modules/.prisma/client/index.d.ts
   # Verify tenant_id is NOT optional
   ```

2. **Verify Schema Match:**
   ```bash
   npx prisma db pull  # Pull actual DB schema
   git diff prisma/schema.prisma  # Check for differences
   ```

3. **Add Debug Logging:**
   - Log `studio` object before using `studio.tenant_id`
   - Check if Prisma is returning undefined vs null
   - Verify TypeScript types match runtime values

4. **Check for Type Coercion:**
   - Could `studio.tenant_id` be empty string ""?
   - Try: `const tenantId = studio.tenant_id || ctx.tenantId`

5. **Verify Prisma Client:**
   ```bash
   rm -rf node_modules/.prisma
   npx prisma generate
   npm run build
   ```

---

## Working Commits (Reference)

- ✅ `ce0eb6e` - React falsy rendering fix + tenant isolation
- ✅ `d553d7a` - Reservations dropdown filter
- ❌ `7a7d4bb` - Entry creation (NULL constraint)
- ❌ `b8bbe64` - Entry creation (Unknown argument)

---

## Open Questions

1. Why does `studio.tenant_id` return NULL when database has value?
2. Is there a Prisma middleware intercepting the query?
3. Is `studios.tenant_id` nullable in schema definition?
4. Should we use `ctx.tenantId` from authenticated user instead?
5. Is there a TypeScript type mismatch (String vs string)?

---

## Production URLs

- Entry creation: https://empwr.compsync.net/dashboard/entries/create
- Test user: danieljohnabrahamson@gmail.com / 123456
- Studio ID: 6a058889-ef9b-4e16-85da-8b1b2c5e258b
- Tenant ID: 00000000-0000-0000-0000-000000000001

---

**Session End:** Token limit approaching - bug unresolved, needs fresh investigation
