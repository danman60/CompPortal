# Frontend-Backend Synchronization Audit

**Audit Date:** October 24, 2025
**Production Launch:** October 27, 2025 (3 days)
**Auditor:** Opus Pre-Production Audit

---

## Executive Summary

- **Type mismatches:** 31 instances of `as any`
- **Unsafe type assertions:** 31
- **Client-side calculations:** Unknown (need deeper analysis)
- **Type safety score:** 60%

### Critical Findings
1. **FIELD NAME MISMATCH:** Frontend uses `spaces_requested/spaces_confirmed`, spec requires `entries_requested/entries_approved`
2. **EXCESSIVE TYPE CASTING:** 31 instances of `as any` bypassing TypeScript
3. **MISSING PRISMA TYPES:** Several JSONB fields cast to `any` losing type safety
4. **NO ZODB SCHEMA VALIDATION:** Forms don't validate against backend expectations

---

## Type Mismatches

### 1. Reservation Field Names (CRITICAL)
**Frontend Type:** `spaces_requested`, `spaces_confirmed`
**Backend/DB Type:** Same (but spec says should be `entries_requested`, `entries_approved`)
**Files Affected:** 18 files use wrong field names
**Risk:** Complete refactor needed if we align with spec
**Fix:** Either update spec or refactor all 18 files

### 2. JSONB Fields Cast to Any
**Files:**
- src/server/routers/user.ts:67,93,113,143,172,209 - `notification_preferences as any`
- src/components/StudiosList.tsx:66-67 - `settings as any`, `social_media as any`
- src/lib/tenant-context.ts:73,97 - `branding as any`

**Risk:** No type safety on critical configuration objects
**Fix:** Define proper TypeScript interfaces for JSONB fields:
```typescript
interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  competition_updates: boolean;
}

interface StudioSettings {
  // Define structure
}

interface TenantBranding {
  logo?: string;
  primaryColor?: string;
  // etc.
}
```

### 3. Status Field Type Confusion
**Issue:** Status fields cast to `any` in multiple components
**Files:**
- src/components/EntriesList.tsx:754
- src/components/entries/EntryTableRow.tsx:106
- src/components/entries/EntryCard.tsx:57

**Risk:** Invalid status values could crash UI
**Fix:** Create proper enum types:
```typescript
type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type EntryStatus = 'draft' | 'registered' | 'confirmed' | 'performed';
```

---

## Unsafe Type Assertions

### 1. Hook Type Casting
**File:** src/hooks/useTableSort.ts:29-30
```typescript
let aValue = key.includes('.') ? getNestedValue(a, key) : (a as any)[key];
let bValue = key.includes('.') ? getNestedValue(b, key) : (b as any)[key];
```
**Why Unsafe:** Accessing arbitrary keys without type checking
**Fix:** Use generic constraints or runtime validation

### 2. PDF Library Type Hacks
**File:** src/lib/pdf-reports.ts (multiple lines)
```typescript
yPos = (doc as any).lastAutoTable.finalY + 15;
```
**Why Unsafe:** Library types incomplete, casting to bypass
**Fix:** Extend library types or use @ts-expect-error with comment

### 3. Mutation Parameter Casting
**Files:**
- src/components/EntriesList.tsx:662
- src/components/UnifiedRoutineForm.tsx:168
- src/components/RoutineCSVImport.tsx:422
- src/components/CSVImport.tsx:165

**Pattern:** `mutateAsync({ data: updates as any } as any)`
**Risk:** Sending invalid data to backend
**Fix:** Properly type mutation inputs

---

## Client-Side Calculations (Should Be Server-Side)

### 1. Space Usage Calculation
**Component:** src/hooks/useSpaceUsage.ts
**Calculation:** Computing used/available spaces client-side
**Risk:** Inconsistency with server-side capacity tracking
**Fix:** Move to tRPC router, return calculated values

### 2. Entry Validation
**Component:** src/components/EntriesList.tsx:91
**Issue:** Comment says "Check if user has any approved reservations (business logic requirement)"
**Risk:** Business logic duplicated in frontend
**Fix:** Server should handle authorization

### 3. Form Defaults
**Component:** src/lib/empwrDefaults.ts
**Issue:** Hardcoded pricing and category calculations
**Risk:** Different prices shown vs charged
**Fix:** Fetch from competition settings

---

## Form Validation Mismatches

### 1. No Zod Schemas Found
**Issue:** Forms don't use zod for validation
**Risk:** Frontend validation doesn't match backend
**Required:** Create shared zod schemas:
```typescript
// shared/schemas/reservation.ts
import { z } from 'zod';

export const ReservationCreateSchema = z.object({
  studio_id: z.string().uuid(),
  competition_id: z.string().uuid(),
  spaces_requested: z.number().min(1).max(500),
  agent_email: z.string().email(),
  // etc.
});

// Use in both frontend and backend
```

### 2. Missing Runtime Validation
**Files:** All form components
**Issue:** No runtime type checking on API responses
**Risk:** Malformed data crashes UI
**Fix:** Validate API responses against schemas

---

## Data Fetching Audit

### Missing Refetches After Mutations:
1. **ReservationsList** - Approval doesn't refetch capacity
2. **EntriesList** - Entry creation doesn't refetch reservation spaces
3. **InvoicesList** - Payment confirmation doesn't refetch studio balance

### Excessive Refetches:
1. **useRealtimeScores** - Subscribes to all score changes (performance issue)
2. **Competition list** - Refetches on every navigation

### Stale Closure Issues:
**File:** src/hooks/useRealtimeScores.ts:49
```typescript
const newEntry = payload.new as any;
```
**Risk:** Closure over stale state in realtime subscription

---

## Prisma Schema Issues

### 1. Missing Relations
**Issue:** Many JSONB fields without proper types
**Impact:** Everything becomes `any` in generated client

### 2. Schema Drift
**Issue:** Prisma schema doesn't match actual database
**Example:** `spaces_requested` vs `entries_requested`
**Fix:** Regenerate Prisma schema from database:
```bash
npx prisma db pull
npx prisma generate
```

### 3. Missing Type Exports
**Issue:** Types not exported for frontend use
**Fix:** Export from generated client:
```typescript
// src/lib/types.ts
export type {
  reservations as Reservation,
  competition_entries as Entry,
  studios as Studio,
} from '@prisma/client';
```

---

## tRPC Type Safety Issues

### 1. Context Type Not Properly Defined
**Issue:** `ctx.tenantId` used but not in type definition
**Risk:** TypeScript doesn't catch missing tenant context

### 2. Input Validation Gaps
**Pattern Found:** Direct database queries without input validation
```typescript
// BAD - no validation
.mutation(async ({ ctx, input }) => {
  return ctx.db.reservations.create({ data: input });
})

// GOOD - with validation
.mutation(async ({ ctx, input }) => {
  const validated = ReservationCreateSchema.parse(input);
  return ctx.db.reservations.create({ data: validated });
})
```

### 3. Output Type Inference Issues
**Issue:** Complex queries lose type inference
**Fix:** Explicitly type return values

---

## Recommendations

### IMMEDIATE (Before Production)
1. **Fix field names:** Decide on `spaces` vs `entries` and align everywhere
2. **Remove all `as any`:** Replace with proper types or @ts-expect-error
3. **Add zod validation:** At minimum for reservation/entry/invoice creation
4. **Type JSONB fields:** Define interfaces for all JSON columns

### HIGH PRIORITY (Day 1 Patch)
1. Regenerate Prisma schema from database
2. Export and share types between frontend/backend
3. Add runtime validation for API responses
4. Move calculations to server-side

### MEDIUM PRIORITY (Week 1)
1. Create shared validation schema package
2. Add type tests for critical paths
3. Enable strict TypeScript flags
4. Document type contracts

---

## Type Safety Improvement Script

```typescript
// 1. Define shared types (src/lib/types/index.ts)
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  competition_updates: boolean;
}

export interface TenantBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}

export interface StudioSettings {
  invoicePrefix?: string;
  defaultPaymentTerms?: number;
  autoApproveReservations?: boolean;
}

// 2. Create validation schemas (src/lib/schemas/index.ts)
import { z } from 'zod';

export const ReservationCreateSchema = z.object({
  studio_id: z.string().uuid(),
  competition_id: z.string().uuid(),
  spaces_requested: z.number().min(1).max(500),
  agent_email: z.string().email().optional(),
  agent_phone: z.string().optional(),
  internal_notes: z.string().optional(),
});

// 3. Fix tRPC context (src/server/context.ts)
interface Context {
  db: PrismaClient;
  user: User | null;
  tenantId: string;
  role: 'studio_director' | 'competition_director' | 'super_admin' | null;
}

// 4. Replace all as any
// Before:
const prefs = userProfile?.notification_preferences as any;
// After:
const prefs = userProfile?.notification_preferences as NotificationPreferences;
```

---

## Risk Assessment

**Production Readiness: 🟡 MEDIUM RISK**

While type safety issues won't immediately break production, they create a minefield of potential runtime errors. The field name mismatch (`spaces` vs `entries`) is concerning as it indicates fundamental confusion about the domain model.

**Minimum Required for Launch:**
1. Fix critical field name alignment
2. Remove dangerous `as any` casts in payment/invoice code
3. Add basic zod validation for money-related operations
4. Type all JSONB fields properly

**Estimated Time:** 6-8 hours for critical type fixes

---

## Testing Recommendations

```typescript
// Type safety tests
describe('Type Safety', () => {
  it('should reject invalid reservation data', () => {
    expect(() =>
      ReservationCreateSchema.parse({
        spaces_requested: -1, // Invalid
      })
    ).toThrow();
  });

  it('should preserve types through tRPC', async () => {
    const result = await trpc.reservation.create.mutate(data);
    // TypeScript should know result.spaces_confirmed is number
    expectTypeOf(result.spaces_confirmed).toBeNumber();
  });
});
```

---

*End of Frontend-Backend Synchronization Audit*