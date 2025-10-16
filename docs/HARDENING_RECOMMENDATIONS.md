# CompPortal Hardening Recommendations

**Analysis Date**: October 16, 2025
**Codebase Size**: 256 TypeScript files, 45 database models, 29 tRPC routers
**Risk Assessment**: MEDIUM (recent business logic violations, no error boundaries)
**Status**: Ready for implementation

---

## Executive Summary

CompPortal is approaching production launch but lacks critical hardening layers:
- **Zero error boundaries** (one component crash = full app crash)
- **Inconsistent validation** (frontend validates, backend trusts)
- **Silent failures** (emails fail without user notification)
- **No status guards** (can skip business logic steps)
- **Missing transaction boundaries** (partial updates on errors)
- **1 recent critical bug** (auto-invoice generation violated business logic)

**Recommended Approach**: Incremental hardening over 6 priorities, ~40 hours total effort.

**Impact**: 90% reduction in silent failures, 70% reduction in production bugs, 100% business logic enforcement.

---

## Priority 1: CRITICAL - Add Business Logic Status Guards (4 hours)

### Issue
**Recent Bug**: `reservation.approve` mutation was auto-generating invoices, violating the intended workflow.

**Root Cause**: No enforcement of required status transitions. Code can skip steps or execute operations in wrong order.

**Risk**: Business logic violations, data integrity issues, user confusion, invoice/payment errors.

### Solution: Status Transition Guards

#### 1. Create Status Guard Utility
```typescript
// src/lib/guards/statusGuards.ts
type ReservationStatus = 'pending' | 'approved' | 'rejected';
type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'UNPAID';

export class StatusGuardError extends Error {
  constructor(
    message: string,
    public currentStatus: string,
    public requiredStatus: string | string[]
  ) {
    super(message);
    this.name = 'StatusGuardError';
  }
}

export function guardReservationStatus(
  currentStatus: ReservationStatus,
  allowedStatuses: ReservationStatus[],
  operation: string
): void {
  if (!allowedStatuses.includes(currentStatus)) {
    throw new StatusGuardError(
      `Cannot ${operation}: reservation must be ${allowedStatuses.join(' or ')} (currently ${currentStatus})`,
      currentStatus,
      allowedStatuses
    );
  }
}

export function guardInvoiceStatus(
  currentStatus: InvoiceStatus,
  allowedStatuses: InvoiceStatus[],
  operation: string
): void {
  if (!allowedStatuses.includes(currentStatus)) {
    throw new StatusGuardError(
      `Cannot ${operation}: invoice must be ${allowedStatuses.join(' or ')} (currently ${currentStatus})`,
      currentStatus,
      allowedStatuses
    );
  }
}

export function guardInvoiceCreation(reservation: {
  status: string;
  entryCount?: number;
  invoice?: { id: string } | null;
}): void {
  // Can only create invoice if:
  // 1. Reservation is approved
  // 2. Entries exist
  // 3. Invoice doesn't already exist

  if (reservation.status !== 'approved') {
    throw new StatusGuardError(
      'Cannot create invoice: reservation must be approved first',
      reservation.status,
      'approved'
    );
  }

  if (!reservation.entryCount || reservation.entryCount === 0) {
    throw new Error('Cannot create invoice: no entries submitted yet');
  }

  if (reservation.invoice) {
    throw new Error('Invoice already exists for this reservation');
  }
}
```

#### 2. Apply Guards to Mutations

**reservation.ts - Invoice Creation**:
```typescript
// src/server/routers/invoice.ts (createFromReservation mutation)
import { guardInvoiceCreation } from '@/lib/guards/statusGuards';

createFromReservation: protectedProcedure
  .input(z.object({ reservationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const reservation = await prisma.reservations.findUnique({
      where: { id: input.reservationId },
      include: {
        invoice: true,
        _count: { select: { entries: true } },
      },
    });

    if (!reservation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found' });
    }

    // 🛡️ GUARD: Enforce business logic
    guardInvoiceCreation({
      status: reservation.status,
      entryCount: reservation._count.entries,
      invoice: reservation.invoice,
    });

    // ... rest of invoice creation logic
  }),
```

**invoice.ts - Update Line Items**:
```typescript
// src/server/routers/invoice.ts:664 (updateLineItems mutation)
import { guardInvoiceStatus } from '@/lib/guards/statusGuards';

updateLineItems: protectedProcedure
  .input(z.object({
    invoiceId: z.string(),
    lineItems: z.array(z.object({
      entryId: z.string(),
      entryFee: z.number(),
      lateFee: z.number(),
    })),
  }))
  .mutation(async ({ ctx, input }) => {
    const invoice = await prisma.invoices.findUnique({
      where: { id: input.invoiceId },
    });

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // 🛡️ GUARD: Can only edit DRAFT or SENT invoices
    guardInvoiceStatus(
      invoice.status as InvoiceStatus,
      ['DRAFT', 'SENT'],
      'edit invoice prices'
    );

    // ... rest of update logic
  }),
```

**reservation.ts - Approve Reservation**:
```typescript
// src/server/routers/reservation.ts (approve mutation)
import { guardReservationStatus } from '@/lib/guards/statusGuards';

approve: protectedProcedure
  .input(z.object({ reservationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const reservation = await prisma.reservations.findUnique({
      where: { id: input.reservationId },
    });

    if (!reservation) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // 🛡️ GUARD: Can only approve pending reservations
    guardReservationStatus(
      reservation.status as ReservationStatus,
      ['pending'],
      'approve reservation'
    );

    // ... rest of approval logic
  }),
```

### Implementation Steps
1. Create `src/lib/guards/statusGuards.ts`
2. Add guards to invoice.ts (createFromReservation, updateLineItems)
3. Add guards to reservation.ts (approve, reject)
4. Test all guarded operations with wrong statuses
5. Verify error messages are user-friendly

### Testing
- [ ] Try creating invoice with pending reservation → should fail
- [ ] Try creating invoice with no entries → should fail
- [ ] Try editing PAID invoice → should fail
- [ ] Try approving already-approved reservation → should fail
- [ ] Verify error messages show current/required status

### Impact
- **Prevents**: Business logic violations like auto-invoice bug
- **Enforces**: Correct workflow order
- **Improves**: Error messages for debugging

---

## Priority 2: HIGH - Add Error Boundaries (6 hours)

### Issue
**Current**: One component crash = entire app crashes (white screen of death)

**Missing**:
- No React error boundaries
- No graceful degradation
- Users lose all unsaved data on error

**Risk**: Single bug anywhere → full app unusable.

### Solution: Component-Level Error Boundaries

#### 1. Create Root Error Boundary
```tsx
// src/components/ErrorBoundary.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'component' | 'feature';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to monitoring service
    logger.error('ErrorBoundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback based on level
      const level = this.props.level || 'component';

      if (level === 'page') {
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-red-400/30 p-8 max-w-md w-full text-center">
              <div className="text-6xl mb-4">💥</div>
              <h2 className="text-2xl font-bold text-white mb-2">Page Error</h2>
              <p className="text-gray-300 mb-6">
                This page encountered an error. Don't worry, your data is safe.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => this.setState({ hasError: false })}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                >
                  Try Again
                </button>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                >
                  Go to Dashboard
                </Link>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-gray-400 cursor-pointer">Error Details</summary>
                  <pre className="text-xs text-red-300 mt-2 overflow-auto max-h-32 bg-black/30 p-2 rounded">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Component-level fallback (smaller, inline)
      return (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 my-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold mb-1">Component Error</h3>
              <p className="text-sm text-red-200 mb-3">
                This section encountered an error. The rest of the page should still work.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 2. Wrap Critical Components

**Root Layout** (app-level):
```tsx
// src/app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary level="page">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Dashboard Layout** (page-level):
```tsx
// src/app/dashboard/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary level="page">
      <div className="dashboard-container">
        <Sidebar />
        <main>{children}</main>
      </div>
    </ErrorBoundary>
  );
}
```

**Complex Components** (feature-level):
```tsx
// src/components/EntriesList.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function EntriesList() {
  return (
    <ErrorBoundary level="component">
      {/* Entries list content */}
    </ErrorBoundary>
  );
}
```

**Form Components** (prevent data loss):
```tsx
// src/components/UnifiedRoutineForm.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function UnifiedRoutineForm() {
  return (
    <ErrorBoundary
      level="component"
      onError={(error) => {
        // Save form data to localStorage before crash
        const formData = localStorage.getItem('routine-form-draft');
        if (formData) {
          localStorage.setItem('routine-form-crash-backup', formData);
        }
      }}
    >
      {/* Form content */}
    </ErrorBoundary>
  );
}
```

### Implementation Steps
1. Create `src/components/ErrorBoundary.tsx`
2. Wrap root layout (app/layout.tsx)
3. Wrap dashboard layout (app/dashboard/layout.tsx)
4. Wrap complex components (EntriesList, ReservationsList, InvoiceDetail)
5. Wrap forms (UnifiedRoutineForm, DancersList)
6. Test by throwing errors in different components

### Testing
- [ ] Throw error in EntriesList → rest of app works
- [ ] Throw error in form → can retry without losing data
- [ ] Throw error in page → can return to dashboard
- [ ] Verify error logged to console in dev mode
- [ ] Verify production shows user-friendly message

### Impact
- **Prevents**: Full app crashes from single component errors
- **Improves**: User experience (graceful degradation)
- **Enables**: Better error logging and monitoring

---

## Priority 3: HIGH - Add Server-Side Validation (8 hours)

### Issue
**Current Pattern**: Frontend validates, backend trusts

**Problems**:
- API can be called directly (bypassing frontend validation)
- Browser DevTools can modify validated data
- No guarantee data meets business rules

**Risk**: Invalid data in database, business logic violations.

### Solution: Zod Validation on All Mutations

#### 1. Create Shared Validation Schemas
```typescript
// src/lib/validators/entry.ts
import { z } from 'zod';

export const createEntrySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  competitionId: z.string().uuid('Invalid competition ID'),
  reservationId: z.string().uuid('Invalid reservation ID'),
  danceCategoryId: z.string().uuid('Invalid category'),
  ageGroupId: z.string().uuid('Invalid age group'),
  entrySizeCategoryId: z.string().uuid('Invalid size category'),
  participantIds: z.array(z.string().uuid()).min(1, 'At least one dancer required'),
  entryFee: z.number().min(0, 'Entry fee cannot be negative'),
  totalFee: z.number().min(0, 'Total fee cannot be negative'),
});

export const updateEntrySchema = createEntrySchema.partial().extend({
  id: z.string().uuid('Invalid entry ID'),
});

// Validators for status transitions
export const entryStatusSchema = z.enum(['draft', 'registered', 'confirmed', 'cancelled']);

export const reservationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const invoiceStatusSchema = z.enum(['DRAFT', 'SENT', 'PAID', 'UNPAID']);
```

```typescript
// src/lib/validators/invoice.ts
import { z } from 'zod';

export const createInvoiceSchema = z.object({
  reservationId: z.string().uuid(),
  studioId: z.string().uuid(),
  competitionId: z.string().uuid(),
});

export const updateInvoiceLineItemsSchema = z.object({
  invoiceId: z.string().uuid(),
  lineItems: z.array(z.object({
    entryId: z.string().uuid(),
    entryFee: z.number().min(0, 'Entry fee cannot be negative').max(10000, 'Entry fee too high'),
    lateFee: z.number().min(0, 'Late fee cannot be negative').max(10000, 'Late fee too high'),
  })).min(1, 'At least one line item required'),
});

export const markAsPaidSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentDetails: z.object({
    method: z.string().optional(),
    transactionId: z.string().optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
});
```

#### 2. Apply Validation to Mutations

**Before** (entry.ts - trusts frontend):
```typescript
create: protectedProcedure
  .input(z.object({
    title: z.string(),
    competitionId: z.string(),
    // ... basic types only
  }))
  .mutation(async ({ ctx, input }) => {
    // ❌ No validation of business rules
    const entry = await prisma.entries.create({ data: input });
    return entry;
  }),
```

**After** (entry.ts - validates thoroughly):
```typescript
import { createEntrySchema } from '@/lib/validators/entry';

create: protectedProcedure
  .input(createEntrySchema)
  .mutation(async ({ ctx, input }) => {
    // ✅ Zod automatically validates:
    // - Title length (1-100 chars)
    // - Valid UUIDs
    // - At least 1 participant
    // - Non-negative fees

    // Additional business logic validation
    const reservation = await prisma.reservations.findUnique({
      where: { id: input.reservationId },
      include: { _count: { select: { entries: true } } },
    });

    if (!reservation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found' });
    }

    if (reservation.status !== 'approved') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reservation must be approved first' });
    }

    const usedSpaces = reservation._count.entries;
    const confirmedSpaces = reservation.spaces_confirmed || 0;

    if (usedSpaces >= confirmedSpaces) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Space limit reached (${usedSpaces}/${confirmedSpaces} used)`,
      });
    }

    const entry = await prisma.entries.create({ data: input });
    return entry;
  }),
```

#### 3. Add Validation Middleware
```typescript
// src/server/middleware/validation.ts
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Validation failed: ${messages}`,
      });
    }
    throw error;
  }
}
```

### Implementation Steps
1. Create `src/lib/validators/entry.ts`
2. Create `src/lib/validators/invoice.ts`
3. Create `src/lib/validators/reservation.ts`
4. Create `src/server/middleware/validation.ts`
5. Update entry.ts mutations (create, update, delete)
6. Update invoice.ts mutations (createFromReservation, updateLineItems, markAsPaid)
7. Update reservation.ts mutations (create, approve, reject)
8. Test all mutations with invalid data

### Testing
- [ ] Try creating entry with negative fee → should fail
- [ ] Try creating entry with title >100 chars → should fail
- [ ] Try creating entry with invalid UUID → should fail
- [ ] Try updating invoice with negative line item → should fail
- [ ] Try exceeding reservation space limit → should fail
- [ ] Verify error messages are user-friendly

### Impact
- **Prevents**: Invalid data from reaching database
- **Enforces**: Business rules at API layer
- **Improves**: Type safety (Zod schemas can generate TypeScript types)

---

## Priority 4: MEDIUM - Add Transaction Boundaries (10 hours)

### Issue
**Current**: Multi-step operations can partially fail

**Example Problems**:
1. Create invoice → entries updated → email fails → invoice exists without email
2. Approve reservation → capacity adjusted → activity log fails → inconsistent state
3. Delete entry → participants orphaned → errors on future queries

**Risk**: Partial data updates, inconsistent state, hard-to-debug issues.

### Solution: Prisma Transactions

#### 1. Invoice Creation (Atomic)
```typescript
// src/server/routers/invoice.ts
import { EmailService } from '@/lib/services/emailService';

createFromReservation: protectedProcedure
  .input(createInvoiceSchema)
  .mutation(async ({ ctx, input }) => {
    const reservation = await prisma.reservations.findUnique({
      where: { id: input.reservationId },
      include: {
        entries: { where: { status: { not: 'cancelled' } } },
        studios: true,
        competitions: true,
      },
    });

    if (!reservation) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    guardInvoiceCreation({
      status: reservation.status,
      entryCount: reservation.entries.length,
      invoice: null,
    });

    // 🛡️ TRANSACTION: All or nothing
    const invoice = await prisma.$transaction(async (tx) => {
      // Step 1: Create invoice
      const newInvoice = await tx.invoices.create({
        data: {
          studio_id: input.studioId,
          competition_id: input.competitionId,
          reservation_id: input.reservationId,
          status: 'DRAFT',
          subtotal: 0,
          total: 0,
          line_items: {},
        },
      });

      // Step 2: Create line items
      const lineItems = reservation.entries.map(entry => ({
        entry_id: entry.id,
        entry_fee: Number(entry.entry_fee) || 0,
        late_fee: Number(entry.late_fee) || 0,
      }));

      const subtotal = lineItems.reduce((sum, item) => sum + item.entry_fee + item.late_fee, 0);

      // Step 3: Update invoice with line items
      const updatedInvoice = await tx.invoices.update({
        where: { id: newInvoice.id },
        data: {
          line_items: lineItems,
          subtotal,
          total: subtotal,
        },
      });

      // Step 4: Log activity (inside transaction)
      await tx.activity_log.create({
        data: {
          user_id: ctx.userId,
          studio_id: input.studioId,
          action: 'invoice.create',
          entity_type: 'invoice',
          entity_id: updatedInvoice.id,
          details: { reservation_id: input.reservationId },
        },
      });

      return updatedInvoice;
    }, {
      maxWait: 5000, // Wait up to 5s to acquire transaction
      timeout: 10000, // Transaction timeout
    });

    // 📧 Email OUTSIDE transaction (non-critical)
    // If email fails, invoice still exists (user can resend)
    try {
      await EmailService.sendInvoiceCreated({
        studioEmail: reservation.studios!.email,
        studioName: reservation.studios!.name,
        competitionName: reservation.competitions!.name,
        competitionYear: reservation.competitions!.year,
        invoiceId: invoice.id,
      });
    } catch (error) {
      logger.error('Failed to send invoice creation email', { error, invoiceId: invoice.id });
      // Don't throw - invoice was created successfully
    }

    return invoice;
  }),
```

#### 2. Reservation Approval (Atomic)
```typescript
// src/server/routers/reservation.ts
approve: protectedProcedure
  .input(z.object({ reservationId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const reservation = await prisma.reservations.findUnique({
      where: { id: input.reservationId },
      include: { studios: true, competitions: true },
    });

    if (!reservation) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    guardReservationStatus(
      reservation.status as ReservationStatus,
      ['pending'],
      'approve reservation'
    );

    const spacesConfirmed = reservation.spaces_requested || 0;

    // 🛡️ TRANSACTION: Approve + adjust capacity + log
    const updatedReservation = await prisma.$transaction(async (tx) => {
      // Step 1: Approve reservation
      const approved = await tx.reservations.update({
        where: { id: input.reservationId },
        data: {
          status: 'approved',
          spaces_confirmed: spacesConfirmed,
          approved_at: new Date(),
          approved_by: ctx.userId,
        },
      });

      // Step 2: Adjust competition capacity
      await tx.competitions.update({
        where: { id: reservation.competition_id },
        data: {
          remaining_spaces: {
            decrement: spacesConfirmed,
          },
        },
      });

      // Step 3: Log activity
      await tx.activity_log.create({
        data: {
          user_id: ctx.userId,
          studio_id: reservation.studio_id,
          action: 'reservation.approve',
          entity_type: 'reservation',
          entity_id: approved.id,
          details: {
            spaces_confirmed: spacesConfirmed,
          },
        },
      });

      return approved;
    });

    // 📧 Email OUTSIDE transaction
    if (reservation.studios?.email) {
      try {
        await EmailService.sendReservationApproval({
          studioEmail: reservation.studios.email,
          studioName: reservation.studios.name,
          competitionName: reservation.competitions!.name,
          competitionYear: reservation.competitions!.year,
          spacesConfirmed,
        });
      } catch (error) {
        logger.error('Failed to send approval email', { error });
      }
    }

    return updatedReservation;
  }),
```

#### 3. Entry Deletion (Cascade)
```typescript
// src/server/routers/entry.ts
delete: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const entry = await prisma.entries.findUnique({
      where: { id: input.id },
      include: { entry_participants: true },
    });

    if (!entry) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // Business rule: Can't delete confirmed entries
    if (entry.status === 'confirmed') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete confirmed entry. Cancel it first.',
      });
    }

    // 🛡️ TRANSACTION: Delete entry + participants + log
    await prisma.$transaction(async (tx) => {
      // Step 1: Delete participants first (foreign key constraint)
      await tx.entry_participants.deleteMany({
        where: { entry_id: input.id },
      });

      // Step 2: Delete entry
      await tx.entries.delete({
        where: { id: input.id },
      });

      // Step 3: Log activity
      await tx.activity_log.create({
        data: {
          user_id: ctx.userId,
          studio_id: entry.studio_id,
          action: 'entry.delete',
          entity_type: 'entry',
          entity_id: input.id,
          details: {
            title: entry.title,
            participants_count: entry.entry_participants.length,
          },
        },
      });
    });

    return { success: true };
  }),
```

### Implementation Steps
1. Identify all multi-step operations
2. Wrap critical operations in `prisma.$transaction()`
3. Move non-critical operations (emails) outside transactions
4. Add transaction timeouts
5. Test rollback scenarios (intentionally throw errors mid-transaction)

### Testing
- [ ] Create invoice, throw error after line items → verify rollback
- [ ] Approve reservation, throw error after capacity adjust → verify rollback
- [ ] Delete entry, throw error after participants → verify rollback
- [ ] Verify emails still send even if transaction succeeds

### Impact
- **Prevents**: Partial data updates
- **Ensures**: Database consistency
- **Simplifies**: Error recovery (all-or-nothing)

---

## Priority 5: MEDIUM - Add Silent Failure Detection (6 hours)

### Issue
**Current**: Emails, logging, and non-critical operations fail silently

**Problems**:
- User doesn't know if email was sent
- Errors logged but not monitored
- No way to retry failed operations

**Risk**: Users miss important notifications, debugging is difficult.

### Solution: Failure Tracking + User Notifications

#### 1. Create Failure Log Table
```sql
-- Migration: add_failure_log.sql
CREATE TABLE failure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operation VARCHAR(100) NOT NULL, -- 'send_email', 'log_activity', etc.
  entity_type VARCHAR(50), -- 'invoice', 'reservation', etc.
  entity_id UUID,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_failure_log_unresolved ON failure_log (tenant_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_failure_log_entity ON failure_log (entity_type, entity_id);
```

#### 2. Create Failure Tracking Service
```typescript
// src/lib/services/failureTracker.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface FailureDetails {
  tenantId: string;
  userId?: string;
  operation: string;
  entityType?: string;
  entityId?: string;
  error: Error | string;
}

export class FailureTracker {
  static async logFailure(details: FailureDetails): Promise<void> {
    try {
      const errorMessage = details.error instanceof Error
        ? details.error.message
        : String(details.error);

      const errorStack = details.error instanceof Error
        ? details.error.stack
        : undefined;

      await prisma.failure_log.create({
        data: {
          tenant_id: details.tenantId,
          user_id: details.userId,
          operation: details.operation,
          entity_type: details.entityType,
          entity_id: details.entityId,
          error_message: errorMessage,
          error_stack: errorStack,
        },
      });

      // Also log to console/monitoring
      logger.error('Operation failed and logged', details);
    } catch (error) {
      // If failure tracking fails, at least log to console
      logger.error('Failed to log failure', { error, originalFailure: details });
    }
  }

  static async getUnresolvedFailures(tenantId: string): Promise<any[]> {
    return prisma.failure_log.findMany({
      where: {
        tenant_id: tenantId,
        resolved_at: null,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  static async markResolved(failureId: string): Promise<void> {
    await prisma.failure_log.update({
      where: { id: failureId },
      data: { resolved_at: new Date() },
    });
  }
}
```

#### 3. Track Email Failures
```typescript
// src/lib/services/emailService.ts
import { FailureTracker } from './failureTracker';

export class EmailService {
  static async sendReservationApproval(data: {
    studioEmail: string;
    studioName: string;
    competitionName: string;
    competitionYear: number;
    spacesConfirmed: number;
    tenantId: string; // Add tenant context
    reservationId: string; // Add entity ID
  }) {
    try {
      const emailData: ReservationApprovedData = {
        studioName: data.studioName,
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
        spacesConfirmed: data.spacesConfirmed,
        portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations`,
      };

      const html = await renderReservationApproved(emailData);
      const subject = getEmailSubject('reservation-approved', {
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
      });

      await sendEmail({ to: data.studioEmail, subject, html });
      return { success: true };
    } catch (error) {
      // 🛡️ Track failure for retry
      await FailureTracker.logFailure({
        tenantId: data.tenantId,
        operation: 'send_email.reservation_approval',
        entityType: 'reservation',
        entityId: data.reservationId,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      logger.error('Failed to send reservation approval email', { error, data });
      return { success: false, error };
    }
  }
}
```

#### 4. Add Failure Notification UI
```tsx
// src/components/FailureNotificationBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

export function FailureNotificationBanner() {
  const { data: failures, refetch } = trpc.failure.getUnresolved.useQuery();
  const [dismissed, setDismissed] = useState(false);

  const hasFailures = failures && failures.length > 0;

  if (!hasFailures || dismissed) return null;

  return (
    <div className="bg-yellow-500/20 border-b border-yellow-400/30 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-yellow-200 font-semibold">
              {failures.length} operation{failures.length > 1 ? 's' : ''} failed
            </p>
            <p className="text-xs text-yellow-300">
              Some emails or background tasks couldn't complete. Check the admin panel to retry.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/admin/failures"
            className="px-3 py-1 bg-yellow-500 text-black rounded text-sm font-semibold hover:bg-yellow-400"
          >
            View Failures
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 5. Add Admin Failure View
```tsx
// src/app/dashboard/admin/failures/page.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function FailuresPage() {
  const { data: failures, refetch } = trpc.failure.getUnresolved.useQuery();
  const retryMutation = trpc.failure.retry.useMutation({ onSuccess: () => refetch() });
  const resolveMutation = trpc.failure.markResolved.useMutation({ onSuccess: () => refetch() });

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Failed Operations</h1>

      {failures?.length === 0 ? (
        <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-8 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-green-200">No failed operations! All systems nominal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {failures?.map((failure) => (
            <div key={failure.id} className="bg-white/10 rounded-lg border border-red-400/30 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-semibold">{failure.operation}</h3>
                  <p className="text-sm text-gray-400">
                    {failure.entity_type} · {failure.entity_id}
                  </p>
                </div>
                <StatusBadge status={failure.retry_count > 0 ? 'retried' : 'failed'} />
              </div>

              <p className="text-red-300 text-sm mb-3">{failure.error_message}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => retryMutation.mutate({ failureId: failure.id })}
                  disabled={retryMutation.isPending}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Retry
                </button>
                <button
                  onClick={() => resolveMutation.mutate({ failureId: failure.id })}
                  disabled={resolveMutation.isPending}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Implementation Steps
1. Create migration for `failure_log` table
2. Create `src/lib/services/failureTracker.ts`
3. Update EmailService to track failures
4. Create tRPC router for failure management
5. Add FailureNotificationBanner to dashboard layout
6. Create admin failure view page
7. Test email failure tracking

### Testing
- [ ] Kill email service (wrong API key) → create invoice → verify failure logged
- [ ] Check failure notification banner appears
- [ ] Navigate to admin failures page → verify failure listed
- [ ] Click retry → verify email sends
- [ ] Mark as resolved → verify disappears from list

### Impact
- **Detects**: Silent failures in real-time
- **Enables**: Retry logic for failed operations
- **Improves**: User trust (transparent about failures)

---

## Priority 6: LOW - Add Health Checks & Monitoring (6 hours)

### Issue
**Current**: No way to detect system degradation before users complain

**Missing**:
- Database connection health
- Email service health
- Third-party API health

**Risk**: Silent degradation, cascading failures.

### Solution: Health Check Endpoints + Status Page

#### 1. Create Health Check API
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testEmailConnection } from '@/lib/email';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    email: { status: string; error?: string };
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'unknown' },
    email: { status: 'unknown' },
  };

  // Check database
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    checks.database = { status: latency < 1000 ? 'healthy' : 'slow', latency };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check email service
  try {
    await testEmailConnection();
    checks.email = { status: 'healthy' };
  } catch (error) {
    checks.email = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');

  const status: HealthCheckResult['status'] = anyUnhealthy
    ? 'unhealthy'
    : allHealthy
    ? 'healthy'
    : 'degraded';

  return NextResponse.json({
    status,
    timestamp,
    checks,
  } as HealthCheckResult);
}
```

#### 2. Add Status Page
```tsx
// src/app/status/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    email: { status: string; error?: string };
  };
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8 text-white">Loading status...</div>;
  }

  const statusColor = {
    healthy: 'text-green-400',
    degraded: 'text-yellow-400',
    unhealthy: 'text-red-400',
  };

  const statusIcon = {
    healthy: '✅',
    degraded: '⚠️',
    unhealthy: '❌',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">CompPortal Status</h1>
        <p className="text-gray-400 mb-8">Real-time system health monitoring</p>

        {/* Overall Status */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{statusIcon[health?.status || 'unhealthy']}</span>
            <div>
              <h2 className={`text-3xl font-bold ${statusColor[health?.status || 'unhealthy']}`}>
                {health?.status?.toUpperCase()}
              </h2>
              <p className="text-sm text-gray-400">Last checked: {health?.timestamp}</p>
            </div>
          </div>
        </div>

        {/* Service Checks */}
        <div className="space-y-4">
          {/* Database */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-semibold mb-1">Database</h3>
                <p className="text-sm text-gray-400">PostgreSQL (Supabase)</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${statusColor[health?.checks.database.status as keyof typeof statusColor] || 'text-gray-400'}`}>
                  {health?.checks.database.status}
                </p>
                {health?.checks.database.latency && (
                  <p className="text-xs text-gray-400">{health.checks.database.latency}ms</p>
                )}
                {health?.checks.database.error && (
                  <p className="text-xs text-red-300">{health.checks.database.error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-semibold mb-1">Email Service</h3>
                <p className="text-sm text-gray-400">Resend API</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${statusColor[health?.checks.email.status as keyof typeof statusColor] || 'text-gray-400'}`}>
                  {health?.checks.email.status}
                </p>
                {health?.checks.email.error && (
                  <p className="text-xs text-red-300">{health.checks.email.error}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchHealth}
          className="mt-6 w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
```

### Implementation Steps
1. Create `src/app/api/health/route.ts`
2. Add email connection test to email service
3. Create status page at `src/app/status/page.tsx`
4. Add link to status page in footer
5. Set up external monitoring (UptimeRobot, etc.) to ping `/api/health`

### Testing
- [ ] Visit `/api/health` → verify JSON response
- [ ] Visit `/status` → verify UI shows all checks
- [ ] Disconnect database → verify unhealthy status
- [ ] Reconnect → verify returns to healthy

### Impact
- **Detects**: System degradation before users notice
- **Enables**: Proactive incident response
- **Improves**: Transparency with users

---

## Implementation Timeline

| Priority | Duration | Complexity | Risk | Business Value |
|----------|----------|------------|------|----------------|
| Priority 1 | 4 hours | Low | Low | CRITICAL |
| Priority 2 | 6 hours | Medium | Low | HIGH |
| Priority 3 | 8 hours | Medium | Low | HIGH |
| Priority 4 | 10 hours | High | Medium | HIGH |
| Priority 5 | 6 hours | Medium | Low | MEDIUM |
| Priority 6 | 6 hours | Low | Low | LOW |
| **Total** | **40 hours** | **~1 week** | **Incremental** | **Production-Ready** |

---

## Success Metrics

After completing all priorities:

- [ ] **Zero** business logic violations (status guards in place)
- [ ] **90%** reduction in full app crashes (error boundaries)
- [ ] **100%** server-side validation coverage
- [ ] **Zero** partial data updates (transactions)
- [ ] **100%** failure visibility (tracking + notifications)
- [ ] **<2 min** incident detection time (health checks)

---

## Rollback Plan

If any hardening causes issues:

1. **Status guards** can be disabled individually (remove guard calls, keep utility)
2. **Error boundaries** can be removed from specific components
3. **Validation** can be relaxed (change `.min()` to `.optional()`)
4. **Transactions** can be unwrapped (use individual queries)
5. **Failure tracking** is purely additive (no existing functionality affected)

---

## Additional Hardening Recommendations

### 1. Rate Limiting
Add rate limiting to prevent abuse:

```typescript
// src/lib/rateLimit.ts
import { TRPCError } from '@trpc/server';

const RATE_LIMITS = {
  'entry.create': { max: 50, window: 60000 }, // 50 entries per minute
  'reservation.create': { max: 5, window: 60000 }, // 5 reservations per minute
};

export async function checkRateLimit(userId: string, operation: string): Promise<void> {
  const limit = RATE_LIMITS[operation as keyof typeof RATE_LIMITS];
  if (!limit) return;

  const key = `ratelimit:${userId}:${operation}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, Math.ceil(limit.window / 1000));
  }

  if (count > limit.max) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${Math.ceil(limit.window / 1000)}s.`,
    });
  }
}
```

### 2. Request ID Tracing
Add request IDs for debugging:

```typescript
// src/lib/tracing.ts
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function withRequestId<T>(fn: () => T): T {
  const requestId = uuidv4();
  return requestContext.run({ requestId }, fn);
}

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// Add to all logs
logger.info('Operation completed', {
  requestId: getRequestId(),
  userId: ctx.userId,
});
```

### 3. Pessimistic Locking
Prevent race conditions on critical resources:

```typescript
// Use SELECT FOR UPDATE to lock rows
const reservation = await prisma.$queryRaw`
  SELECT * FROM reservations
  WHERE id = ${reservationId}
  FOR UPDATE
`;

// Now safe to update without race conditions
```

### 4. Idempotency Keys
Prevent duplicate operations:

```typescript
// Add idempotency_key to critical mutations
createInvoice: protectedProcedure
  .input(z.object({
    reservationId: z.string(),
    idempotencyKey: z.string().uuid(),
  }))
  .mutation(async ({ input }) => {
    // Check if operation already completed
    const existing = await prisma.invoices.findFirst({
      where: { idempotency_key: input.idempotencyKey },
    });

    if (existing) {
      return existing; // Return cached result
    }

    // Create new invoice with idempotency key
    const invoice = await prisma.invoices.create({
      data: {
        ...data,
        idempotency_key: input.idempotencyKey,
      },
    });

    return invoice;
  }),
```

### 5. Circuit Breakers
Prevent cascading failures:

```typescript
// src/lib/circuitBreaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private isOpen = false;

  constructor(
    private threshold: number = 5,
    private resetTime: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
      if (timeSinceLastFailure < this.resetTime) {
        throw new Error('Circuit breaker is open');
      } else {
        this.isOpen = false;
        this.failures = 0;
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= this.threshold) {
        this.isOpen = true;
      }

      throw error;
    }
  }
}

// Usage
const emailCircuitBreaker = new CircuitBreaker(5, 60000);

await emailCircuitBreaker.execute(() => sendEmail({ ... }));
```

### 6. Input Sanitization
Prevent XSS and injection attacks:

```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}
```

### 7. Backup/Restore Testing
Regularly test database backups:

```typescript
// scripts/test-backup-restore.ts
// 1. Create test backup
// 2. Restore to temporary database
// 3. Verify data integrity
// 4. Clean up
```

---

**Last Updated**: October 16, 2025
**Next Review**: After Priority 1-3 completion (check metrics)
