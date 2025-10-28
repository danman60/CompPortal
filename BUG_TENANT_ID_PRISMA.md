# Bug Report - Tenant ID Prisma Null Constraint Violation

**Date:** October 28, 2025
**Status:** 🔍 INVESTIGATING - Prisma behavior with relation syntax
**Severity:** P0 - Blocking entry creation in production
**Commits:** 0918e29, 05acb65

---

## 🐛 Bug Summary

Entry creation fails with `Null constraint violation on the fields: (tenant_id)` despite:
- ✅ Context has valid `tenantId`
- ✅ Using consistent relational syntax (`connect`) for all relations
- ✅ All other relations (competitions, studios, etc.) work correctly
- ✅ Only `tenants` relation fails

---

## 📊 Debug Tool Evidence

**From:** `tenant-debug-1761672478908.json`

**Line 447 - Error:**
```
"Null constraint violation on the fields: (`tenant_id`)"
```

**Line 453-458 - Context Verification:**
```json
{
  "userId": "b3aebafa-e291-452a-8197-f7012338687c",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "role": "studio_director",
  "tenantIdExists": true
}
```

**Line 512-556 - Create Data Object:**
```json
{
  "title": "[DEBUG TEST] Entry Creation Flow Test",
  "status": "draft",
  "tenants": {
    "connect": { "id": "00000000-0000-0000-0000-000000000001" }
  },
  "competitions": { "connect": { "id": "6fbf65ed-ce0b-4fef-bc38-a7609d6f21f6" } },
  "studios": { "connect": { "id": "6a058889-ef9b-4e16-85da-8b1b2c5e258b" } },
  "dance_categories": { "connect": { "id": "f3a58c90-71e5-4194-a4c9-c732c1021069" } },
  "classifications": { "connect": { "id": "2b2ac47d-0f25-46c2-951f-20bb407c3b4e" } },
  "age_groups": { "connect": { "id": "99cc6147-ba3f-40e0-8d68-249bff64753e" } },
  "entry_size_categories": { "connect": { "id": "dc5b52f0-aeef-43b0-bcaa-72f9c06637b3" } },
  "entry_participants": {
    "create": [{
      "dancer_id": "e3e8f3d3-b2c7-4b7f-8459-0f6ce4395e84",
      "dancer_name": "Daniel Abrahamson",
      "dancer_age": 10
    }]
  }
}
```

**All relations using `connect` syntax consistently** ✅

---

## 🎓 Prisma Documentation Research

**Key Finding:** Prisma enforces consistency in relation syntax

**From Prisma GitHub discussions:**
> "When you use at least one connect or create block in a create() or update(), other scalar relation fields cannot be used directly. You must be consistent - either use all scalar fields OR all relational syntax."

**Reason:**
- Prevents exponential growth in generated input types
- With n foreign keys, mixing would require 2^n input types
- Intentional design limitation

**Two Valid Approaches:**
1. **All relational:** `tenants: { connect: { id } }`
2. **All scalar:** `tenant_id: id`

**Cannot mix** both in same operation.

---

## ❓ Open Questions (Need Prisma MCP)

### Q1: Schema Definition Check
**Question:** Is the `tenants` relation defined correctly in `competition_entries`?

**Need to verify:**
```prisma
model competition_entries {
  tenant_id String @db.Uuid
  tenants   tenants @relation(fields: [tenant_id], references: [id], ...)
}
```

**Possible issues:**
- Missing `@relation` attribute
- Wrong `fields` or `references`
- Relation name conflict

### Q2: Prisma Client Generation
**Question:** Was `npx prisma generate` run after schema changes?

**Context:** We modified `schema.prisma` multiple times in recent commits:
- Added `tenant_id` to email_logs, judges, scores, email_preferences
- Added `tenants` relations to these tables

**Possible issue:** Outdated Prisma Client not aware of new schema

### Q3: Relation Inconsistency
**Question:** Why does `tenants` relation fail but all others succeed?

**All using same syntax:**
- ✅ `competitions: { connect: { id } }` - WORKS
- ✅ `studios: { connect: { id } }` - WORKS
- ✅ `dance_categories: { connect: { id } }` - WORKS
- ❌ `tenants: { connect: { id } }` - FAILS

**Possible issues:**
- `tenants` relation defined differently?
- Cascade/onDelete settings different?
- Index missing on tenant_id?

### Q4: Nested Create Interference
**Question:** Could `entry_participants` nested create be causing issues?

**From logs (line 547-555):**
```json
"entry_participants": {
  "create": [{
    "dancer_id": "e3e8f3d3-b2c7-4b7f-8459-0f6ce4395e84",
    "dancer_name": "Daniel Abrahamson",
    "dancer_age": 10
  }]
}
```

**Note:** `entry_participants` does NOT have `tenant_id` in schema

**Possible issues:**
- Prisma trying to inherit tenant_id from parent?
- Nested create transaction ordering?
- Foreign key constraint timing?

### Q5: Relation Mode
**Question:** Is the database using `foreignKeys` relation mode?

**From Prisma docs:**
- Default for relational DBs: `relationMode = "foreignKeys"`
- Alternative: `relationMode = "prisma"` (no foreign keys)

**Check needed:**
```prisma
datasource db {
  provider     = "postgresql"
  relationMode = "foreignKeys" // or "prisma"?
}
```

### Q6: Database Constraint Timing
**Question:** Is there a database trigger or constraint interfering?

**Known from previous debugging:**
- Had legacy `reservation_tokens_trigger` causing double-deduction
- Could there be a trigger on `competition_entries`?

**Need to check:**
```sql
SELECT tgname, tgrelid::regclass, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'competition_entries'::regclass
  AND tgisinternal = false;
```

---

## 🔬 Investigation Plan (With Prisma MCP)

### Step 1: Schema Inspection
```
Use Prisma MCP to:
1. Get full competition_entries model definition
2. Verify tenants relation is properly defined
3. Check @relation attribute syntax
4. Compare with working relations (competitions, studios)
```

### Step 2: Prisma Client Check
```
1. Check Prisma Client version
2. Verify generated types include tenants relation
3. Confirm schema.prisma matches generated client
4. Re-generate if needed: npx prisma generate
```

### Step 3: Database Introspection
```
Use Prisma MCP to:
1. Introspect actual database schema
2. Compare with Prisma schema
3. Check for mismatches in constraints
4. Verify foreign key exists in DB
```

### Step 4: Relation Configuration
```
1. Check relationMode in datasource
2. Verify all @relation attributes consistent
3. Check for relation name conflicts
4. Verify cascade/onDelete settings
```

### Step 5: Isolation Test
```
1. Try creating entry WITHOUT nested entry_participants
2. Try creating entry with ONLY tenant relation
3. Compare behavior vs other relations
```

---

## 🎯 Expected Outcomes

**Hypothesis 1: Schema Mismatch**
- `tenants` relation missing or misconfigured in schema
- **Fix:** Update schema.prisma, regenerate client

**Hypothesis 2: Outdated Client**
- Prisma Client doesn't know about tenants relation
- **Fix:** Run `npx prisma generate`

**Hypothesis 3: Database Constraint**
- Foreign key or trigger interfering
- **Fix:** Remove/update constraint

**Hypothesis 4: Relation Mode Issue**
- Wrong relationMode setting
- **Fix:** Set correct relationMode in datasource

**Hypothesis 5: Nested Create Bug**
- entry_participants create causing parent tenant_id to fail
- **Fix:** Reorder operations or use two-step create

---

## 📝 Notes

**Attempts So Far:**
1. ❌ Commit 07b0978: Used relation `tenants: { connect }` → "Argument `tenants` is missing"
2. ❌ Commit f09df3e: Changed to scalar `tenant_id: ctx.tenantId` → "Argument `tenants` is missing"
3. ❌ Commit 0918e29: Back to relation `tenants: { connect }` → "Null constraint violation"

**Pattern:** Every attempt fails, but with different errors

**Key Insight:** Debug tool shows we're using correct syntax, but Prisma isn't accepting it

---

## 🚀 Next Actions

1. ✅ Install Prisma MCP
2. 🔍 Run Step 1-5 investigation with MCP
3. 📊 Document findings
4. 🛠️ Apply fix based on root cause
5. 🧪 Test with debug tool

---

**Investigation Status:** Waiting for Prisma MCP installation
