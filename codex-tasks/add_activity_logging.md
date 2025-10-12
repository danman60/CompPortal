# Task: Add Activity Logging to Mutations

**Priority**: HIGH (Post-Demo Round)
**Estimate**: 1-2 hours
**Status**: Ready for Codex
**Depends On**: Activity logging migrations must be applied first

---

## Context

Activity logging infrastructure is complete (`src/lib/activity.ts`, `src/server/routers/activity.ts`) but not yet integrated into mutations. Need to add `logActivity()` calls after successful mutations to create audit trail.

**Target Mutations**:
1. Entry creation (`entry.create`)
2. Dancer operations (`dancer.create`, `dancer.batchCreate`)
3. Reservation approvals (`reservation.approve`, `reservation.reject`)
4. Studio approvals (`studio.approve`, `studio.reject`)
5. Invoice payments (`invoice.markAsPaid`)

---

## Pattern to Follow

**Activity Helper Location**: `src/lib/activity.ts`

**Function Signature**:
```typescript
export async function logActivity(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}) Promise<void>
```

**Placement**: After successful mutation, before return

**Example Pattern**:
```typescript
// Inside mutation success block
const entry = await prisma.entries.create({ data: {...} });

// Add activity logging HERE
await logActivity({
  userId: ctx.userId,
  action: 'entry.create',
  entityType: 'entry',
  entityId: entry.id,
  details: {
    routine_title: entry.routine_title,
    competition_id: entry.competition_id,
    studio_id: entry.studio_id
  }
});

return entry;
```

---

## Task 1: Entry Creation Logging

### File
`src/server/routers/entry.ts`

### Mutation
`create` mutation (search for `entry.create.useMutation`)

### Implementation

**At top of file:**
```typescript
import { logActivity } from '@/lib/activity';
```

**After successful entry creation** (after `prisma.entries.create`):
```typescript
await logActivity({
  userId: ctx.userId,
  action: 'entry.create',
  entityType: 'entry',
  entityId: entry.id,
  details: {
    routine_title: entry.routine_title,
    competition_id: entry.competition_id,
    studio_id: ctx.studioId || entry.studio_id,
    dance_category: entry.dance_category,
    classification: entry.classification
  }
});
```

---

## Task 2: Dancer Operations Logging

### File
`src/server/routers/dancer.ts`

### Mutations
- `create` mutation
- `batchCreate` mutation

### Implementation 2a: Single Dancer Create

**After successful dancer creation**:
```typescript
await logActivity({
  userId: ctx.userId,
  action: 'dancer.create',
  entityType: 'dancer',
  entityId: dancer.id,
  details: {
    first_name: dancer.first_name,
    last_name: dancer.last_name,
    studio_id: ctx.studioId || dancer.studio_id,
    date_of_birth: dancer.date_of_birth
  }
});
```

### Implementation 2b: Batch Dancer Create

**After successful batch insert** (after `prisma.dancers.createMany`):
```typescript
// Log batch operation
await logActivity({
  userId: ctx.userId,
  action: 'dancer.batchCreate',
  entityType: 'dancer',
  entityId: 'batch', // Special case for batch operations
  details: {
    count: dancers.length,
    studio_id: ctx.studioId
  },
  metadata: {
    dancer_names: dancers.map(d => `${d.first_name} ${d.last_name}`)
  }
});
```

---

## Task 3: Reservation Approvals Logging

### File
`src/server/routers/reservation.ts`

### Mutations
- `approve` mutation
- `reject` mutation

### Implementation 3a: Approve

**After successful approval** (after status update to 'approved'):
```typescript
await logActivity({
  userId: ctx.userId,
  action: 'reservation.approve',
  entityType: 'reservation',
  entityId: reservation.id,
  details: {
    studio_id: reservation.studio_id,
    competition_id: reservation.competition_id,
    routines_requested: reservation.routines_requested,
    routines_confirmed: reservation.routines_confirmed
  }
});
```

### Implementation 3b: Reject

**After successful rejection** (after status update to 'rejected'):
```typescript
await logActivity({
  userId: ctx.userId,
  action: 'reservation.reject',
  entityType: 'reservation',
  entityId: reservation.id,
  details: {
    studio_id: reservation.studio_id,
    competition_id: reservation.competition_id,
    rejection_reason: input.reason || 'No reason provided'
  }
});
```

---

## Task 4: Studio Approvals Logging

### File
`src/server/routers/studio.ts`

### Mutations
- `approve` mutation
- `reject` mutation

### Implementation 4a: Approve

**After successful approval** (after status update to 'approved'):
```typescript
await logActivity({
  userId: ctx.userId,
  action: 'studio.approve',
  entityType: 'studio',
  entityId: studio.id,
  details: {
    studio_name: studio.name,
    owner_id: studio.owner_id,
    email: studio.email
  }
});
```

### Implementation 4b: Reject

**After successful rejection** (after status update to 'rejected'):
```typescript
await logActivity({
  userId: ctx.userId,
  action: 'studio.reject',
  entityType: 'studio',
  entityId: studio.id,
  details: {
    studio_name: studio.name,
    owner_id: studio.owner_id,
    rejection_reason: input.reason || 'No reason provided'
  }
});
```

---

## Task 5: Invoice Payment Logging

### File
`src/server/routers/invoice.ts` OR `src/server/routers/reservation.ts`

### Mutation
`markAsPaid` mutation (search for this in both files)

### Implementation

**After successful payment status update**:
```typescript
await logActivity({
  userId: ctx.userId,
  action: 'invoice.markAsPaid',
  entityType: 'invoice',
  entityId: invoice.id || reservation.id, // Depends on implementation
  details: {
    studio_id: invoice.studio_id || reservation.studio_id,
    competition_id: invoice.competition_id || reservation.competition_id,
    amount: invoice.total_amount || 'N/A',
    payment_method: 'manual_mark_paid'
  }
});
```

---

## Quality Gates (MANDATORY)

Before marking complete:

1. ✅ **Import added**: `import { logActivity } from '@/lib/activity';` at top of each file
2. ✅ **TypeScript compiles**: `npm run build` succeeds
3. ✅ **No circular dependencies**: activity.ts doesn't import router files
4. ✅ **Async/await correct**: All logActivity calls use `await`
5. ✅ **Error handling**: Wrap in try/catch or let errors propagate?
   - **Answer**: Let errors propagate - activity logging should not block mutations
6. ✅ **Details meaningful**: Include key fields for audit trail
7. ✅ **No sensitive data**: Don't log passwords, tokens, or PII beyond necessary

---

## Error Handling Pattern

**Option A** (Recommended): Silent fail
```typescript
try {
  await logActivity({...});
} catch (error) {
  console.error('Failed to log activity:', error);
  // Don't throw - allow mutation to succeed
}
```

**Option B**: Let it throw (stricter audit)
```typescript
await logActivity({...}); // If this fails, mutation fails
```

**Recommendation**: Use Option A - activity logging failure should not break user workflows.

---

## Deliverables

Output file: `codex-tasks/outputs/add_activity_logging_result.md`

Include:
1. All mutations modified (file:lines)
2. Import statements added
3. Error handling approach used
4. Build output (success/fail)
5. Any issues encountered

---

## Reference Files

**Read these first:**
- `src/lib/activity.ts` - Activity logging helper and types
- `src/server/routers/activity.ts` - Activity router (for understanding schema)
- `prisma/schema.prisma` - Check activity_logs table schema

**Files to modify:**
- `src/server/routers/entry.ts`
- `src/server/routers/dancer.ts`
- `src/server/routers/reservation.ts`
- `src/server/routers/studio.ts`
- `src/server/routers/invoice.ts` (if markAsPaid exists here)

---

**Start Time**: [Record when you start]
**Expected Duration**: 1-2 hours
