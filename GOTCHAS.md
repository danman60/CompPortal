# CompPortal Gotchas & Common Issues

**When to load this:** User reports something isn't working, before deep debugging.

## Prisma Best Practices

### ✅ CORRECT: Two-Step Creation Pattern

When creating records with FK relationships:

```typescript
// ✅ CORRECT - Scalar FK assignment
const entry = await prisma.competition_entries.create({
  data: {
    tenant_id: ctx.tenantId!,
    competition_id: competitionId,    // Scalar FK
    studio_id: studioId,               // Scalar FK
    reservation_id: reservationId,     // Scalar FK
    routine_name: "My Routine",
  },
});

// Then create related records
await prisma.entry_participants.createMany({
  data: dancers.map(d => ({
    tenant_id: ctx.tenantId!,
    entry_id: entry.id,  // FK to created entry
    dancer_id: d.id,
  })),
});
```

### ❌ WRONG: Nested Create (Causes Dual-Write Bugs)

```typescript
// ❌ WRONG - Nested create can execute twice
const entry = await prisma.competition_entries.create({
  data: {
    routine_name: "My Routine",
    competitions: {
      connect: { id: competitionId },  // BAD
    },
    entry_participants: {
      create: dancers.map(d => ({      // DUAL WRITE
        dancer_id: d.id,
      })),
    },
  },
});
```

**Why it's wrong:** Nested creates can trigger operations twice, especially with database triggers. Always use scalar FK assignment.

## Tenant ID Isolation

### Critical Rule: tenant_id Required on ALL Creates

**ONLY check if table has tenant_id in schema!** Don't add tenant_id unless column exists.

**Check schema first:**
```bash
grep "model table_name" prisma/schema.prisma -A 10
```

If table has `tenant_id String @db.Uuid`, then:

```typescript
// ✅ CORRECT
await prisma.table_name.create({
  data: {
    tenant_id: ctx.tenantId!,  // REQUIRED
    // ... other fields
  },
});
```

**Tables with tenant_id (require it on create):**
- competitions, studios, user_profiles
- reservations, competition_entries, entry_participants
- invoices, dancers, summaries, summary_entries
- email_logs, judges, scores, capacity_ledger
- age_groups, dance_categories, classifications

**Tables WITHOUT tenant_id (inherit from FK):**
- competition_sessions (via competition_id)
- competition_locations (via competition_id)
- schedules (via competition_id)
- schedule_items (via schedule_id → competition_id)

**Isolation through FK chain is sufficient** - don't add tenant_id unless schema has it.

### Missing tenant_id Errors

**Error:** `Null constraint violation on the fields: (tenant_id)`

**Fix:**
1. Check if table has tenant_id in schema
2. If YES: Add `tenant_id: ctx.tenantId!` to create data
3. If NO: Table uses FK chain for isolation (correct)

## Field Name Typos

**October 28 Bug:** `SubmitSummaryModal.tsx`
```typescript
// ❌ WRONG
studioId: reservation.studios_id,       // Typo!
competitionId: reservation.competitions_id,  // Typo!

// ✅ CORRECT
studioId: reservation.studio_id,        // Matches interface
competitionId: reservation.competition_id,   // Matches interface
```

**How to catch:** Always check interface definition at top of file.

## Chunk Caching (Next.js)

**Symptom:** Code changes don't appear despite correct build hash in footer.

**Debug:**
```javascript
// Use Playwright to check loaded chunks
const scripts = Array.from(document.querySelectorAll('script[src]'));
const chunks = scripts.filter(s => s.src.includes('chunks/'));
return chunks.map(s => new URL(s.src).pathname.split('/').pop());
```

**If chunk hash unchanged across commits:**
1. Add cache buster comment with timestamp
2. Make substantial change (change button text/emoji)
3. Rename component file (e.g., ComponentNew.tsx)

**See:** `CLAUDE.md` JavaScript Chunk Cache Debugging section

## Active vs. Legacy Components

**CompPortal has TWO entries systems:**

1. **Rebuild (ACTIVE):** `/dashboard/entries` → `EntriesPageContainer.tsx`
   - Uses: LiveSummaryBar → SubmitSummaryModal
   - Clean Phase 1 implementation

2. **Legacy (OLD):** `EntriesList.tsx` (not used in production)
   - Has debug buttons we added
   - NOT the active page!

**Always check which component is actually being used** before debugging.

## Schema Drift

**Symptom:** TypeScript error "property does not exist" but database has the column.

**Example:** `summaries` table had `tenant_id` in DB but not in Prisma schema.

**Fix:**
1. Add field to `prisma/schema.prisma`
2. Add relation to parent model (e.g., tenants)
3. Run `npx prisma generate`
4. Build and test

**Don't create migration** - column already exists in DB (drift).

## Database Triggers

**Hidden business logic can cause double-operations.**

**Check for triggers:**
```sql
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgisinternal = false
ORDER BY table_name, trigger_name;
```

**October 24 Bug:** `reservation_tokens_trigger` was deducting capacity after service class already did it.

**Lesson:** Check database triggers FIRST when investigating double-operations.

## Minimal Fixes vs. Rewrites

**If code was working yesterday → minimal fix only.**

See `ANTI_PATTERNS.md` for complete protocol.

**Example from this session:**
- ❌ Spent hours on chunk caching (not the issue)
- ✅ Real fix: 2-line typo correction + missing tenant_id

## Pre-Launch Checklist

Before marking feature complete:
- [ ] Build passes (`npm run build`)
- [ ] Tested on BOTH tenants (EMPWR + Glow)
- [ ] No cross-tenant data leaks
- [ ] All tenant_id filters in queries
- [ ] Soft delete used (status='cancelled')
- [ ] Matches Phase 1 spec (if business logic)

## Quick Debug Order

When user reports "X isn't working":

1. **Check active component** (which file is actually used?)
2. **Check database triggers** (hidden logic causing doubles?)
3. **Check field names** (typos in object keys?)
4. **Check tenant_id** (missing on create? schema has it?)
5. **Check chunk cache** (old JS despite new build?)
6. **Check schema drift** (DB column exists but not in Prisma?)

Load full protocols only after quick checks fail.
