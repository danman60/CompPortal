# CompPortal Code Patterns & Examples

**Purpose:** Detailed code examples referenced from CLAUDE.md
**Usage:** Load this file when implementing features that need specific patterns

---

## Table of Contents
1. [Access Control Patterns](#access-control-patterns)
2. [Database Transaction Patterns](#database-transaction-patterns)
3. [State Transition Patterns](#state-transition-patterns)
4. [Cross-Tenant Isolation Patterns](#cross-tenant-isolation-patterns)
5. [UI/UX Component Patterns](#uiux-component-patterns)
6. [Sample Data Violations](#sample-data-violations)
7. [Commit Format Examples](#commit-format-examples)

---

## Access Control Patterns

### Super Admin Only
```typescript
if (ctx.user.role !== 'super_admin') {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
```

### Competition Director or Super Admin
```typescript
if (!['competition_director', 'super_admin'].includes(ctx.user.role)) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
```

### Studio Director (or higher)
```typescript
if (!['studio_director', 'competition_director', 'super_admin'].includes(ctx.user.role)) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
```

---

## Database Transaction Patterns

### Capacity Changes (REQUIRED Pattern)

**ALL capacity changes MUST use this pattern:**

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Lock row
  const competition = await tx.competitions.findUnique({
    where: { id: competitionId },
    select: { available_reservation_tokens: true },
  });

  // 2. Validate
  if (available < requested) throw new Error('Insufficient capacity');

  // 3. Update
  await tx.competitions.update({
    where: { id: competitionId },
    data: { available_reservation_tokens: { decrement: requested } },
  });

  // 4. Log audit trail
  await tx.capacity_ledger.create({
    data: { competition_id, change_amount: -requested, reason: 'approval' },
  });
});
```

**Never update capacity outside a transaction.**

---

## State Transition Patterns

### Phase 1 Reservation State Machine

**Valid transitions:**
```
pending → approved/adjusted/rejected
approved/adjusted → summarized
summarized → invoiced
invoiced → closed
```

### Validation Before Update

```typescript
// 1. Read current state
const current = await prisma.reservations.findUnique({
  where: { id },
  select: { status: true },
});

// 2. Validate transition is allowed
if (!isValidTransition(current.status, newStatus)) {
  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid state transition' });
}

// 3. Update with transaction
await prisma.$transaction(async (tx) => {
  await tx.reservations.update({ where: { id }, data: { status: newStatus } });
  await tx.activity_logs.create({ data: { action: `reservation.${newStatus}`, ... } });
});
```

---

## Cross-Tenant Isolation Patterns

### Pattern 1: Basic Query
```typescript
// ✅ CORRECT - Always filter by tenant
const data = await prisma.table.findMany({
  where: {
    tenant_id: ctx.tenantId,  // MANDATORY
    // ... other filters
  }
});
```

### Pattern 2: Query with Relations
```typescript
// ✅ CORRECT - Filter relations too
const entries = await prisma.competition_entries.findMany({
  where: { tenant_id: ctx.tenantId },
  include: {
    competition: {
      where: { tenant_id: ctx.tenantId }  // Verify match
    },
    dancers: {
      where: { tenant_id: ctx.tenantId }  // Verify match
    }
  }
});
```

### Pattern 3: Create Operations
```typescript
// ✅ CORRECT - Always include tenant_id
await prisma.table.create({
  data: {
    tenant_id: ctx.tenantId,  // MANDATORY
    // ... other fields
  }
});
```

### Pattern 4: Verification Query (Run After Changes)
```sql
-- Check for cross-tenant leaks
SELECT COUNT(*) as leaks
FROM table_a a
JOIN table_b b ON a.b_id = b.id
WHERE a.tenant_id != b.tenant_id;
-- Should ALWAYS return 0
```

**Common Gotchas:**
1. Forgetting tenant_id on CREATE
2. Not filtering related data in includes
3. Using service role without tenant checks
4. Soft delete without tenant filter

---

## UI/UX Component Patterns

### Fixed Position Components - Correct Example

```tsx
// ✅ CORRECT - Explicit colors, safe positioning, brand match
<button className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
  <input className="text-gray-900 placeholder:text-gray-400" />
</button>
```

### Fixed Position Components - Wrong Example

```tsx
// ❌ WRONG - Overlaps support button, inherits white text on white bg
<button className="fixed bottom-6 right-6 z-40 bg-white">
  <input /> {/* Invisible! */}
</button>
```

**Rules for Fixed Position:**
- Survey existing fixed elements BEFORE positioning new ones
- Calculate spacing: `new_right = existing_right + existing_width + gap` (min 16px gap)
- Match brand colors/gradients from existing components
- Explicit text colors on ALL elements (inputs, buttons, labels, placeholders)
- Test positioning at 1920px, 1440px, 1024px, 768px widths

---

## Sample Data Violations

### ❌ WRONG - Hardcoded Price
```typescript
const total = entries.length * 50;
```

### ✅ CORRECT - Real Data from Database
```typescript
// Phase 1 spec lines 669-680
const settings = await prisma.competition_settings.findUnique({
  where: { id: event.competition_settings_id },
});
const total = entries.length * settings.global_entry_fee;
```

**All pricing, categories, age divisions, scoring rubrics, and awards MUST come from tenant settings configured by Competition Directors.**

---

## Commit Format Examples

### Example 1: Feature with Evidence
```
feat: CSV import validation for routine entries

- Add birthdate format validation (RoutineCSVImport.tsx:234-267)
- Add real-time error highlighting (RoutineCSVImport.tsx:312-334)

✅ Build pass. Verified: EMPWR ✓ Glow ✓
Evidence: evidence/screenshots/csv-import-empwr-20251104.png

🤖 Claude Code
```

### Example 2: Refactor (No UI Changes)
```
refactor: Extract validation logic into utility

- Move date validation (utils/dates.ts:45-78)
- Update imports (components/DancerForm.tsx:12)

✅ Build pass. No UI changes (refactor only).

🤖 Claude Code
```

### Example 3: Database Migration
```
feat: Add capacity ledger for audit trail

- Create capacity_ledger table (migration: 20251104_capacity_ledger.sql)
- Add audit logging to CapacityService (CapacityService.ts:45-89)

✅ Build pass. Verified: EMPWR ✓ Glow ✓
Spec: Phase 1 lines 354-398
Evidence: evidence/queries/capacity-ledger-verify-20251104.txt

🤖 Claude Code
```

**Commit Format Rules:**
- File paths with line numbers (NOT code examples)
- Spec line references when implementing from existing specs
- Verification status for BOTH tenants (✓ or ✗)
- Evidence reference if non-trivial feature
- 2-3 bullet points max
- For refactors/internal changes: Note "No UI changes"
- No detailed narratives
- 8 lines max total

---

## Spec-Driven Examples

### Capacity Refund (Phase 1 Spec)
```typescript
// Capacity refund on summary submission (Phase 1 spec lines 589-651)
if (entriesUnused > 0) {
  await capacityService.refund(competitionId, entriesUnused, 'summary_refund');
}
```

### Migration with Spec Reference
```sql
-- Phase 1 spec lines 31-47: Events table structure
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

**Last Updated:** November 7, 2025
**Referenced By:** CLAUDE.md
**Purpose:** Keep CLAUDE.md concise while preserving all pattern examples
