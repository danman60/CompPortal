# Current Work - Tenant ID Prisma Investigation

**Session:** October 28, 2025 (Deep Debugging)
**Status:** 🔍 INVESTIGATING - Prisma relation syntax issue
**Commits:** 0918e29 (entry fix attempt), 05acb65 (debug tool)
**Build Status:** ✅ PASS (61/61 pages)
**Tokens Used:** ~107k/200k

---

## 🎯 Current Focus

**Problem:** Entry creation fails with `Null constraint violation on tenant_id` despite correct relation syntax

**Why This Matters:**
- Blocking ALL entry creation in production
- User postponing client demos → losing money
- Multi-day persistent issue across sessions
- Need to decide: fix vs full architecture migration

---

## 📊 Debug Tool Results (CRITICAL DATA)

**File:** `tenant-debug-1761672478908.json`

### ✅ What's Working

1. **Session Context (100% correct):**
   - userId: `b3aebafa-e291-452a-8197-f7012338687c`
   - tenantId: `00000000-0000-0000-0000-000000000001` ✅
   - role: `studio_director`
   - tenantIdExists: `true` ✅

2. **Data Lookups (All successful):**
   - ✅ Competition found with correct tenant_id
   - ✅ Studio found with correct tenant_id
   - ✅ Dancer found with correct tenant_id
   - ✅ All categories/classifications loaded

3. **Relation Syntax (Consistent):**
   - ✅ Using `connect` for ALL relations
   - ✅ No mixing of scalar + relational syntax
   - ✅ Follows Prisma best practices

### ❌ What's Failing

**Error:** `Null constraint violation on the fields: (tenant_id)`

**Create Data Object:**
```json
{
  "tenants": { "connect": { "id": "00000000-0000-0000-0000-000000000001" } },
  "competitions": { "connect": { "id": "..." } },
  "studios": { "connect": { "id": "..." } },
  "dance_categories": { "connect": { "id": "..." } },
  "classifications": { "connect": { "id": "..." } },
  "age_groups": { "connect": { "id": "..." } },
  "entry_size_categories": { "connect": { "id": "..." } }
}
```

**The Mystery:**
- ALL other relations work (competitions, studios, etc.)
- ONLY `tenants` relation fails
- Same syntax used everywhere
- Why?

---

## 🎓 Prisma Documentation Research

**Key Finding:** Prisma enforces consistency in relation operations

**From Prisma GitHub:**
> "When you use at least one connect or create block, other scalar relation fields cannot be used directly. You must be consistent - either use all scalar fields OR all relational syntax."

**Valid Approaches:**
1. **All relational:** `tenants: { connect: { id } }` ← We're using this
2. **All scalar:** `tenant_id: id`

**Cannot mix both.**

**Design Reason:** Prevents exponential growth in generated input types (2^n where n = number of FKs)

---

## ❓ Open Investigation Questions

### Q1: Schema Definition
**Is the `tenants` relation properly defined in schema.prisma?**

Need to verify:
```prisma
model competition_entries {
  tenant_id String @db.Uuid
  tenants   tenants @relation(fields: [tenant_id], references: [id], ...)
}
```

Possible issues:
- Missing `@relation` attribute
- Wrong `fields` or `references` mapping
- Relation name conflict

### Q2: Prisma Client Generation
**Was `npx prisma generate` run after schema changes?**

Context: Modified schema multiple times:
- Added tenant_id to email_logs, judges, scores
- Added tenants relations
- Changed competition_entries tenant field

Possible issue: Outdated Prisma Client

### Q3: Relation Behavior Difference
**Why does `tenants` fail but all others succeed?**

All using identical syntax:
- ✅ competitions: { connect } - WORKS
- ✅ studios: { connect } - WORKS
- ❌ tenants: { connect } - FAILS

Possible issues:
- Different cascade/onDelete settings?
- Missing index on tenant_id?
- Relation configured differently?

### Q4: Nested Create Interference
**Could entry_participants nested create be causing issues?**

Note: entry_participants does NOT have tenant_id field

Possible issues:
- Prisma trying to inherit tenant_id?
- Transaction ordering problem?
- Foreign key constraint timing?

### Q5: Relation Mode
**What relationMode is configured?**

Need to check:
```prisma
datasource db {
  provider     = "postgresql"
  relationMode = "foreignKeys" // or "prisma"?
}
```

### Q6: Database Triggers
**Are there triggers on competition_entries?**

Previous issue: Had legacy trigger causing double-deduction

Need SQL query:
```sql
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'competition_entries'::regclass
  AND tgisinternal = false;
```

---

## 🔬 Investigation Plan (With Prisma MCP)

**User installing Prisma MCP now**

### Step 1: Schema Inspection
- Get full competition_entries model
- Verify tenants relation definition
- Compare with working relations

### Step 2: Client Verification
- Check Prisma Client version
- Verify generated types include tenants
- Re-generate if needed

### Step 3: Database Introspection
- Introspect actual DB schema
- Compare with Prisma schema
- Check for mismatches

### Step 4: Relation Configuration
- Check relationMode
- Verify @relation attributes
- Check cascade settings

### Step 5: Isolation Testing
- Try entry WITHOUT nested participants
- Try entry with ONLY tenant relation
- Compare behavior

---

## 📝 Attempt History

**Pattern: Every attempt fails with different error**

1. **Commit 07b0978:** Used relation `tenants: { connect }`
   - Error: "Argument `tenants` is missing"

2. **Commit f09df3e:** Changed to scalar `tenant_id: ctx.tenantId`
   - Error: "Argument `tenants` is missing"

3. **Commit 0918e29:** Back to relation `tenants: { connect }`
   - Error: "Null constraint violation on tenant_id"

**Insight:** Not a simple syntax issue - something deeper wrong

---

## 🎯 Hypothesis

**Most Likely:**
1. **Schema mismatch** - tenants relation not defined correctly
2. **Outdated client** - Generated client doesn't know about tenants relation
3. **Database constraint** - Trigger or constraint interfering

**Less Likely:**
4. Nested create bug
5. Relation mode misconfiguration
6. Prisma version bug

---

## 🚀 Next Steps

1. ✅ Install Prisma MCP (in progress)
2. 🔍 Run systematic investigation (Steps 1-5)
3. 📊 Document exact root cause
4. 🛠️ Apply targeted fix
5. 🧪 Re-test with debug tool
6. ✅ Verify entry creation works

---

## 📂 Related Files

- `BUG_TENANT_ID_PRISMA.md` - Detailed bug documentation
- `tenant-debug-1761672478908.json` - Debug tool output
- `src/server/routers/entry.ts` - Entry creation logic
- `src/server/routers/tenantDebug.ts` - Debug endpoints
- `prisma/schema.prisma` - Database schema
- `src/app/dashboard/admin/tenant-debug/page.tsx` - Debug UI

---

**Current State:** Debug tool proves context is correct. Waiting for Prisma MCP to investigate schema/client mismatch.

**User Action:** Installing Prisma MCP for deep investigation
