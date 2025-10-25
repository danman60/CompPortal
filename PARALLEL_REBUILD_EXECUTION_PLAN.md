# CompPortal Parallel Rebuild: Execution Plan

**Created:** October 25, 2025
**Launch Window:** 3 days (October 28, 2025)
**Strategy:** Parallel rebuild at `-rebuild` routes with ZERO changes to existing pages
**Goal:** Clean implementation of Phase 1 business logic without production risk

---

## Executive Summary

**Problem:** Current pages built before business logic finalization, causing bug whack-a-mole
**Solution:** Build parallel clean implementation, test thoroughly, cutover when ready
**Risk Level:** ZERO - Old pages untouched, new pages isolated at separate routes

**Timeline Estimate:** 30-40 hours of development work
**Target Completion:** Before or immediately after Day 3 launch

---

## Core Principles

### 1. Zero Risk to Current Production
- ✅ NO changes to existing `/dashboard/entries` page
- ✅ NO changes to existing `/dashboard/reservation-pipeline` page
- ✅ NO changes to backend routers (entry.ts, reservation.ts, summary.ts, invoice.ts)
- ✅ Backend status progression added safely (does not affect existing filters)

### 2. Parallel Deployment Strategy
- New routes: `/dashboard/entries-rebuild` and `/dashboard/reservation-pipeline-rebuild`
- Old routes: Continue working with current logic
- Testing: Can compare old vs new side-by-side
- Cutover: Single navigation link change when ready

### 3. Business Logic First
- Implement exact Phase 1 spec (PHASE1_SPEC.md)
- Proper status progression: `approved` → `summarized` → `invoiced` → `closed`
- Correct capacity tracking with ledger audit trail
- Clean separation: Container → Hooks → Components

---

## Breaking Changes Identified

**From analysis of existing pages, these filters will break AFTER backend status progression:**

### ReservationPipeline.tsx Issues
| Line | Current Logic | Problem After Status Change | Fix Required |
|------|---------------|----------------------------|--------------|
| 140 | `status === 'approved' && entryCount > 0` | Won't find summarized reservations | Change to `status === 'summarized'` |
| 141 | `status === 'approved' OR 'summarized'` | Wrong status after invoice | Change to `status === 'invoiced'` |
| 142 | `status === 'approved' OR 'summarized'` | Wrong status after payment | Change to `status === 'closed'` |
| 150 | Same as line 140 | Same issue | Same fix |
| 171 | Only counts `status === 'approved'` | Capacity calc excludes later statuses | Include all active statuses |

### Files That Won't Break
- ✅ `useEntryFilters.ts` - Already checks `'approved' || 'summarized'`
- ✅ `ReservationSelector.tsx` - Already checks `'approved' || 'summarized'`

**Decision:** Don't fix these. Build clean in rebuild pages instead.

---

## Phase 0: Backend Status Progression (2-4 hours)

**Goal:** Add status transitions without breaking existing page filters

### Task 0.1: Add Status Progression in entry.ts
**File:** `src/server/routers/entry.ts`
**Location:** Line ~287 in `submitSummary` mutation
**Change:** After creating summary record

```typescript
// Add after summary creation (around line 287)
await tx.reservations.update({
  where: { id: reservation.id },
  data: {
    status: 'summarized',
    updated_at: new Date()
  }
});
```

**Why safe:** Existing ReservationPipeline checks `status === 'approved' && entryCount > 0`. After this change, summarized reservations will have `status === 'summarized'`, so they'll stop matching that filter. BUT they'll appear in rebuild page's correct `status === 'summarized'` filter.

---

### Task 0.2: Add Status Progression in invoice.ts
**File:** `src/server/routers/invoice.ts`
**Location:** After creating invoice record in `createFromReservation` mutation

```typescript
// Add after invoice creation
await ctx.db.reservations.update({
  where: { id: input.reservationId },
  data: {
    status: 'invoiced',
    updated_at: new Date()
  }
});
```

---

### Task 0.3: Add Status Progression in reservation.ts
**File:** `src/server/routers/reservation.ts`
**Location:** Line ~1050 in `markAsPaid` mutation
**Change:** Add `status: 'closed'` to existing update

```typescript
// Modify existing update (around line 1050)
data: {
  payment_status: 'completed',
  status: 'closed',  // ADD THIS LINE
  is_closed: true,
  updated_at: new Date()
}
```

---

### Task 0.4: Add Validation Guards (Recommended)
**Prevent out-of-order status transitions**

**In invoice.ts (createFromReservation):**
```typescript
// Validate reservation is in summarized state
if (reservation.status !== 'summarized') {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `Cannot create invoice: reservation must be in 'summarized' state (current: ${reservation.status})`
  });
}
```

**In reservation.ts (markAsPaid):**
```typescript
// Validate reservation is in invoiced state
if (reservation.status !== 'invoiced') {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `Cannot mark as paid: reservation must be in 'invoiced' state (current: ${reservation.status})`
  });
}
```

---

### Task 0.5: Test Backend Changes
**Before proceeding to frontend:**

```bash
# 1. Build passes
npm run build

# 2. Test complete flow with old pages (should still work with degraded UX)
# - Create reservation (status: 'pending')
# - Approve (status: 'approved')
# - Create entries
# - Submit summary (status: 'summarized') ← NEW
# - Old page won't show in "Pending Invoice" (expected)
# - Generate invoice (status: 'invoiced') ← NEW
# - Mark paid (status: 'closed') ← NEW

# 3. Check database directly
# Verify status values are being set correctly
```

**Acceptance Criteria:**
- ✅ Build passes
- ✅ Status values update correctly in database
- ✅ Validation guards prevent out-of-order transitions
- ✅ Old pages still functional (even if some filters empty)

**Commit:**
```
feat: Add reservation status progression for Phase 1 lifecycle

- entry.ts:287 - Set status='summarized' after summary submission
- invoice.ts - Set status='invoiced' after invoice creation
- reservation.ts:1050 - Set status='closed' on payment
- Add validation guards to prevent out-of-order transitions

Implements Phase 1 spec lines 190-198 (status flow).
Old pages may show empty filters temporarily (by design).
Rebuild pages will use correct status filters.

✅ Build pass
```

---

## Phase 1: Shared UI Components (4-6 hours)

**Goal:** Build reusable glassmorphic primitives used by both pages

**Directory:** `src/components/rebuild/ui/`

### Task 1.1: Card.tsx
**Spec Reference:** REBUILD_PLAN.md lines 554-574

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`
      bg-white/10
      backdrop-blur-md
      rounded-xl
      border border-white/20
      p-6
      shadow-lg
      ${className}
    `}>
      {children}
    </div>
  );
}
```

**Test:** Visual inspection on `/dashboard/entries-rebuild` test page

---

### Task 1.2: Badge.tsx
**Spec Reference:** REBUILD_PLAN.md lines 577-615

```typescript
interface BadgeProps {
  status?: 'draft' | 'submitted' | 'confirmed' | 'approved' | 'rejected' | 'pending' | 'summarized' | 'invoiced' | 'closed';
  variant?: 'success' | 'warning' | 'error' | 'info';
  children?: React.ReactNode;
}

export function Badge({ status, variant, children }: BadgeProps) {
  const getColorClass = () => {
    if (status === 'draft') return 'bg-gray-500/20 text-gray-300';
    if (status === 'submitted') return 'bg-blue-500/20 text-blue-300';
    if (status === 'confirmed') return 'bg-green-500/20 text-green-300';
    if (status === 'approved') return 'bg-green-500/20 text-green-300';
    if (status === 'rejected') return 'bg-red-500/20 text-red-300';
    if (status === 'pending') return 'bg-yellow-500/20 text-yellow-300';
    if (status === 'summarized') return 'bg-purple-500/20 text-purple-300';
    if (status === 'invoiced') return 'bg-indigo-500/20 text-indigo-300';
    if (status === 'closed') return 'bg-gray-500/20 text-gray-400';

    if (variant === 'success') return 'bg-green-500/20 text-green-300';
    if (variant === 'warning') return 'bg-yellow-500/20 text-yellow-300';
    if (variant === 'error') return 'bg-red-500/20 text-red-300';
    if (variant === 'info') return 'bg-blue-500/20 text-blue-300';

    return 'bg-gray-500/20 text-gray-300';
  };

  return (
    <span className={`
      px-3 py-1
      rounded-full
      text-xs
      font-medium
      uppercase
      ${getColorClass()}
    `}>
      {children || status}
    </span>
  );
}
```

---

### Task 1.3: Button.tsx
**Spec Reference:** REBUILD_PLAN.md lines 618-664

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({
  children,
  variant = 'secondary',
  onClick,
  href,
  disabled = false,
  className = '',
  type = 'button'
}: ButtonProps) {
  const baseClass = `
    px-4 py-2
    rounded-lg
    font-medium
    transition-all
    duration-200
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
  `;

  const variantClass = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
    ghost: 'text-white hover:bg-white/10',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30'
  }[variant];

  if (href) {
    return (
      <a
        className={`${baseClass} ${variantClass} ${className} inline-block text-center`}
        href={href}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${className}`}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

---

### Task 1.4: Modal.tsx

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-blue-900/90 backdrop-blur-md rounded-xl border border-white/20 p-6 max-w-2xl w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="text-white/90">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 pt-4 border-t border-white/10 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Task 1.5: Table.tsx

```typescript
interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-white">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-white/5 border-b border-white/10">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 ${className}`}>
      {children}
    </td>
  );
}

export function TableHeaderCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left font-semibold text-white/80 ${className}`}>
      {children}
    </th>
  );
}
```

---

### Task 1.6: Dropdown.tsx

```typescript
interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function Dropdown({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select...',
  className = ''
}: DropdownProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-white/80">{label}</label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      >
        {placeholder && (
          <option value="" className="bg-gray-900">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

### Commit for Phase 1:
```
feat: Add shared UI components for rebuild pages

- Card.tsx - Glassmorphic card base
- Badge.tsx - Status badges with all Phase 1 statuses
- Button.tsx - 4 variants (primary, secondary, ghost, danger)
- Modal.tsx - Overlay modal with backdrop
- Table.tsx - Table primitives with hover states
- Dropdown.tsx - Select component

Location: src/components/rebuild/ui/
Pattern: Consistent glassmorphic design system
Used by: Entries and Pipeline rebuild pages

✅ Build pass
```

---

## Phase 2: Custom Hooks (4-6 hours)

**Goal:** Business logic layer - encapsulate tRPC queries and mutations

**Directory:** `src/hooks/rebuild/`

### Task 2.1: useEntries.ts
**Spec Reference:** STRATEGIC_ALIGNMENT_PLAN.md lines 320-351

```typescript
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

export function useEntries() {
  const { data, isLoading, refetch } = trpc.entry.getAll.useQuery();

  const deleteMutation = trpc.entry.delete.useMutation({
    onSuccess: () => {
      toast.success('Routine deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete routine: ${error.message}`);
    },
  });

  const submitSummaryMutation = trpc.entry.submitSummary.useMutation({
    onSuccess: () => {
      toast.success('Summary submitted to Competition Director!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to submit summary: ${error.message}`);
    },
  });

  return {
    entries: data?.entries || [],
    isLoading,
    refetch,
    deleteEntry: deleteMutation.mutateAsync,
    submitSummary: submitSummaryMutation.mutateAsync,
    isDeleting: deleteMutation.isLoading,
    isSubmitting: submitSummaryMutation.isLoading,
  };
}
```

---

### Task 2.2: useReservations.ts
**Spec Reference:** STRATEGIC_ALIGNMENT_PLAN.md lines 354-380

```typescript
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

export function useReservations() {
  const { data, isLoading, refetch } = trpc.reservation.getAll.useQuery();

  return {
    reservations: data?.reservations || [],
    isLoading,
    refetch,
  };
}

export function usePipelineReservations() {
  const { data, isLoading, refetch } = trpc.reservation.getPipelineView.useQuery();

  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: () => {
      toast.success('Reservation approved!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Error approving reservation: ${error.message}`);
    },
  });

  const rejectMutation = trpc.reservation.reject.useMutation({
    onSuccess: () => {
      toast.success('Reservation rejected');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({
    onSuccess: () => {
      toast.success('Invoice created successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  return {
    reservations: data?.reservations || [],
    isLoading,
    refetch,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    createInvoice: createInvoiceMutation.mutateAsync,
    isApproving: approveMutation.isLoading,
    isRejecting: rejectMutation.isLoading,
    isCreatingInvoice: createInvoiceMutation.isLoading,
  };
}
```

---

### Task 2.3: useEntriesFilters.ts
**Spec Reference:** STRATEGIC_ALIGNMENT_PLAN.md lines 383-420

```typescript
import { useState, useEffect, useMemo } from 'react';

interface Entry {
  id: string;
  reservation_id: string;
  status: string;
  total_fee?: number;
}

interface Reservation {
  id: string;
  status: 'approved' | 'summarized' | 'invoiced' | 'closed';
  is_closed: boolean;
  spaces_confirmed: number;
  competitions?: { name: string };
}

export function useEntriesFilters(
  entries: Entry[],
  reservations: Reservation[]
) {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Filter to only approved and summarized reservations
  const selectableReservations = useMemo(
    () => reservations.filter(r => r.status === 'approved' || r.status === 'summarized'),
    [reservations]
  );

  // Auto-select first reservation on load
  useEffect(() => {
    if (!selectedReservationId && selectableReservations.length > 0) {
      const firstApproved = selectableReservations.find(r => r.status === 'approved');
      if (firstApproved) {
        setSelectedReservationId(firstApproved.id);
      } else if (selectableReservations[0]) {
        setSelectedReservationId(selectableReservations[0].id);
      }
    }
  }, [selectableReservations, selectedReservationId]);

  const selectedReservation = useMemo(
    () => selectableReservations.find(r => r.id === selectedReservationId) || null,
    [selectableReservations, selectedReservationId]
  );

  const filteredEntries = useMemo(() => {
    if (!selectedReservationId) return entries;
    return entries.filter(e => e.reservation_id === selectedReservationId);
  }, [entries, selectedReservationId]);

  return {
    selectedReservation,
    setSelectedReservation: setSelectedReservationId,
    viewMode,
    setViewMode,
    filteredEntries,
    selectableReservations,
  };
}
```

---

### Task 2.4: usePipelineFilters.ts
**Spec Reference:** STRATEGIC_ALIGNMENT_PLAN.md lines 423-507

```typescript
import { useState, useMemo } from 'react';

export type PipelineStatus = 'all' | 'pending' | 'approved' | 'summary_in' | 'invoiced' | 'paid';

interface PipelineReservation {
  id: string;
  event_id: string;
  event_name: string;
  status: string;
  entry_count: number;
  invoice_id: string | null;
  invoice_paid: boolean;
  payment_status: string;
}

export function usePipelineFilters(reservations: PipelineReservation[]) {
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<PipelineStatus>('all');

  // Extract unique events
  const events = useMemo(() => {
    const uniqueEvents = new Map();
    reservations.forEach(r => {
      if (!uniqueEvents.has(r.event_id)) {
        uniqueEvents.set(r.event_id, {
          id: r.event_id,
          name: r.event_name
        });
      }
    });
    return Array.from(uniqueEvents.values());
  }, [reservations]);

  // Filter reservations by event and status
  const filteredReservations = useMemo(() => {
    let result = reservations;

    // Event filter
    if (eventFilter !== 'all') {
      result = result.filter(r => r.event_id === eventFilter);
    }

    // Status filter (CORRECT IMPLEMENTATION)
    if (statusFilter === 'pending') {
      result = result.filter(r => r.status === 'pending');
    } else if (statusFilter === 'approved') {
      result = result.filter(r =>
        r.status === 'approved' &&
        r.entry_count === 0 &&
        !r.invoice_id
      );
    } else if (statusFilter === 'summary_in') {
      // CORRECT: Look for status='summarized' (after backend fix)
      result = result.filter(r =>
        r.status === 'summarized' &&
        !r.invoice_id
      );
    } else if (statusFilter === 'invoiced') {
      // CORRECT: Look for status='invoiced' (after backend fix)
      result = result.filter(r =>
        r.status === 'invoiced' &&
        r.payment_status !== 'completed'
      );
    } else if (statusFilter === 'paid') {
      // CORRECT: Look for status='closed' or payment complete
      result = result.filter(r =>
        r.status === 'closed' ||
        r.payment_status === 'completed'
      );
    }

    return result;
  }, [reservations, eventFilter, statusFilter]);

  // Calculate status counts
  const statusCounts = useMemo(() => ({
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    approved: reservations.filter(r =>
      r.status === 'approved' && r.entry_count === 0 && !r.invoice_id
    ).length,
    summary_in: reservations.filter(r =>
      r.status === 'summarized' && !r.invoice_id
    ).length,
    invoiced: reservations.filter(r =>
      r.status === 'invoiced' && r.payment_status !== 'completed'
    ).length,
    paid: reservations.filter(r =>
      r.status === 'closed' || r.payment_status === 'completed'
    ).length
  }), [reservations]);

  return {
    eventFilter,
    setEventFilter,
    statusFilter,
    setStatusFilter,
    filteredReservations,
    statusCounts,
    events
  };
}
```

**Key difference from old code:** Uses `status === 'summarized'`, `'invoiced'`, `'closed'` instead of checking `approved + entryCount`.

---

### Commit for Phase 2:
```
feat: Add custom hooks for rebuild pages

- useEntries.ts - Entry data + mutations (delete, submitSummary)
- useReservations.ts - Reservation data (SD view)
- usePipelineReservations.ts - Pipeline data + mutations (CD view)
- useEntriesFilters.ts - Client-side entry filtering by reservation
- usePipelineFilters.ts - Pipeline filtering (CORRECT status logic)

Location: src/hooks/rebuild/
Business Logic: Implements Phase 1 spec status flow
Key: usePipelineFilters uses 'summarized'/'invoiced'/'closed' statuses

✅ Build pass
```

---

## Phase 3: Entries Page Rebuild (8-10 hours)

**Route:** `/dashboard/entries-rebuild`
**Spec Reference:** REBUILD_PLAN.md lines 82-283

### Task 3.1: Create Route
**File:** `src/app/dashboard/entries-rebuild/page.tsx`

```typescript
import { EntriesPageContainer } from '@/components/rebuild/entries/EntriesPageContainer';

export default function EntriesRebuildPage() {
  return <EntriesPageContainer />;
}
```

---

### Task 3.2: EntriesPageContainer.tsx
**Directory:** `src/components/rebuild/entries/`

```typescript
"use client";

import { useEntries } from '@/hooks/rebuild/useEntries';
import { useReservations } from '@/hooks/rebuild/useReservations';
import { useEntriesFilters } from '@/hooks/rebuild/useEntriesFilters';
import { EntriesHeader } from './EntriesHeader';
import { EntriesFilters } from './EntriesFilters';
import { RoutineCardList } from './RoutineCardList';
import { RoutineTable } from './RoutineTable';
import { LiveSummaryBar } from './LiveSummaryBar';
import { useMemo } from 'react';

export function EntriesPageContainer() {
  const { entries, isLoading, submitSummary, deleteEntry } = useEntries();
  const { reservations } = useReservations();

  const {
    selectedReservation,
    setSelectedReservation,
    viewMode,
    setViewMode,
    filteredEntries,
    selectableReservations
  } = useEntriesFilters(entries, reservations);

  const summaryData = useMemo(() => {
    const created = filteredEntries.length;
    const estimatedTotal = filteredEntries.reduce((sum, e) => sum + (e.total_fee || 0), 0);
    const confirmedSpaces = selectedReservation?.spaces_confirmed || 0;

    return { created, estimatedTotal, confirmedSpaces };
  }, [filteredEntries, selectedReservation]);

  if (isLoading) {
    return <div className="p-8 text-white">Loading entries...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <EntriesHeader />

      <EntriesFilters
        reservations={selectableReservations}
        selectedReservation={selectedReservation}
        onReservationChange={setSelectedReservation}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="mt-8">
        {viewMode === 'card' ? (
          <RoutineCardList entries={filteredEntries} onDelete={deleteEntry} />
        ) : (
          <RoutineTable entries={filteredEntries} onDelete={deleteEntry} />
        )}
      </div>

      <LiveSummaryBar
        created={summaryData.created}
        estimatedTotal={summaryData.estimatedTotal}
        confirmedSpaces={summaryData.confirmedSpaces}
        reservation={selectedReservation}
        onSubmitSummary={submitSummary}
      />
    </div>
  );
}
```

---

### Task 3.3-3.8: Build Remaining Components

Due to length constraints, see **REBUILD_PLAN.md lines 82-283** for full component specs:
- EntriesHeader.tsx
- EntriesFilters.tsx
- RoutineCard.tsx
- RoutineCardList.tsx
- RoutineTable.tsx
- LiveSummaryBar.tsx
- SubmitSummaryModal.tsx

**Key principle:** Each component < 150 lines, single responsibility

---

### Commit for Phase 3:
```
feat: Complete Entries page rebuild

NEW FILES:
- src/app/dashboard/entries-rebuild/page.tsx (route)
- src/components/rebuild/entries/EntriesPageContainer.tsx
- src/components/rebuild/entries/EntriesHeader.tsx
- src/components/rebuild/entries/EntriesFilters.tsx
- src/components/rebuild/entries/RoutineCard.tsx
- src/components/rebuild/entries/RoutineCardList.tsx
- src/components/rebuild/entries/RoutineTable.tsx
- src/components/rebuild/entries/LiveSummaryBar.tsx
- src/components/rebuild/entries/SubmitSummaryModal.tsx

Features:
- Reservation-based filtering (correct business logic)
- Card/table view toggle
- Submit summary with incomplete warning
- Closed reservation handling

Route: /dashboard/entries-rebuild
Uses: useEntries, useReservations, useEntriesFilters hooks
Design: Glassmorphic cards, responsive grid

✅ Build pass
✅ Tested on production: [URL]
```

---

## Phase 4: Pipeline Page Rebuild (8-10 hours)

**Route:** `/dashboard/reservation-pipeline-rebuild`
**Spec Reference:** REBUILD_PLAN.md lines 286-547

### Task 4.1: Create Route
**File:** `src/app/dashboard/reservation-pipeline-rebuild/page.tsx`

```typescript
import { PipelinePageContainer } from '@/components/rebuild/pipeline/PipelinePageContainer';

export default function PipelineRebuildPage() {
  return <PipelinePageContainer />;
}
```

---

### Task 4.2: PipelinePageContainer.tsx
**Directory:** `src/components/rebuild/pipeline/`

```typescript
"use client";

import { usePipelineReservations } from '@/hooks/rebuild/useReservations';
import { usePipelineFilters } from '@/hooks/rebuild/usePipelineFilters';
import { PipelineHeader } from './PipelineHeader';
import { PipelineFilters } from './PipelineFilters';
import { ReservationsTable } from './ReservationsTable';

export function PipelinePageContainer() {
  const {
    reservations,
    isLoading,
    approve,
    reject,
    createInvoice
  } = usePipelineReservations();

  const {
    eventFilter,
    setEventFilter,
    statusFilter,
    setStatusFilter,
    filteredReservations,
    statusCounts,
    events
  } = usePipelineFilters(reservations);

  if (isLoading) {
    return <div className="p-8 text-white">Loading pipeline...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <PipelineHeader />

      <PipelineFilters
        events={events}
        eventFilter={eventFilter}
        onEventFilterChange={setEventFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
      />

      <div className="mt-8">
        <ReservationsTable
          reservations={filteredReservations}
          onApprove={approve}
          onReject={reject}
          onCreateInvoice={createInvoice}
        />
      </div>
    </div>
  );
}
```

---

### Task 4.3-4.8: Build Remaining Components

See **REBUILD_PLAN.md lines 286-547** for full specs:
- PipelineHeader.tsx
- PipelineFilters.tsx (with CORRECT status tab logic)
- ReservationsTable.tsx
- ReservationRow.tsx
- ApproveReservationModal.tsx
- RejectReservationModal.tsx
- CreateInvoiceModal.tsx

**Critical:** PipelineFilters uses correct status values:
- "Pending Invoice" tab → `status === 'summarized'` (NOT `approved + entryCount > 0`)
- "Invoiced" tab → `status === 'invoiced'`
- "Paid" tab → `status === 'closed'`

---

### Commit for Phase 4:
```
feat: Complete Pipeline page rebuild

NEW FILES:
- src/app/dashboard/reservation-pipeline-rebuild/page.tsx (route)
- src/components/rebuild/pipeline/PipelinePageContainer.tsx
- src/components/rebuild/pipeline/PipelineHeader.tsx
- src/components/rebuild/pipeline/PipelineFilters.tsx
- src/components/rebuild/pipeline/ReservationsTable.tsx
- src/components/rebuild/pipeline/ReservationRow.tsx
- src/components/rebuild/pipeline/ApproveReservationModal.tsx
- src/components/rebuild/pipeline/RejectReservationModal.tsx
- src/components/rebuild/pipeline/CreateInvoiceModal.tsx

Features:
- Event + status filtering (CORRECT business logic)
- Status tabs: Pending/Approved/Summary In/Invoiced/Paid
- Inline actions per reservation status
- Approve/reject/invoice modals

Route: /dashboard/reservation-pipeline-rebuild
Uses: usePipelineReservations, usePipelineFilters hooks
Key: Filters use 'summarized'/'invoiced'/'closed' statuses

✅ Build pass
✅ Tested on production: [URL]
```

---

## Phase 5: End-to-End Testing (4-6 hours)

**Goal:** Verify complete Phase 1 workflow using rebuild pages

### Task 5.1: Test as Studio Director

**Use Playwright MCP:**

```typescript
// Navigate to rebuild entries page
await playwright.navigate('https://www.compsync.net/dashboard/entries-rebuild');

// Verify reservation selector shows approved reservations
await playwright.screenshot('entries-rebuild-loaded.png');

// Select reservation
await playwright.click('[data-testid="reservation-select"]');
await playwright.click('text=St. Catharines');

// Verify entries load
await expect(page.locator('[data-testid="routine-card"]')).toBeVisible();

// Create new entry
await playwright.click('text=Create Routine');
// ... complete form
await playwright.click('button[type="submit"]');
await playwright.waitFor('text=Entry created');

// Submit summary
await playwright.click('text=Submit Summary');
await playwright.click('text=Confirm');
await playwright.waitFor('text=Summary submitted');

await playwright.screenshot('summary-submitted-success.png');
```

**Verify:**
- ✅ Reservation selector shows only approved/summarized
- ✅ Entries filter by selected reservation
- ✅ Summary submission works
- ✅ Toast notifications appear
- ✅ Page refreshes with updated data

---

### Task 5.2: Test as Competition Director

```typescript
// Navigate to rebuild pipeline page
await playwright.navigate('https://www.compsync.net/dashboard/reservation-pipeline-rebuild');

// Verify tabs show correct counts
await playwright.screenshot('pipeline-rebuild-loaded.png');

// Test "Pending Invoice" tab
await playwright.click('text=Pending Invoice');
// Verify only status='summarized' reservations appear
await expect(page.locator('text=summarized')).toBeVisible();

// Create invoice
await playwright.click('button:has-text("Create Invoice")');
await playwright.fill('[name="discountPercent"]', '5');
await playwright.click('text=Generate Invoice');
await playwright.waitFor('text=Invoice created');

// Verify reservation moved to "Invoiced" tab
await playwright.click('text=Invoiced');
await expect(page.locator('[data-status="invoiced"]')).toBeVisible();

await playwright.screenshot('invoice-created-success.png');
```

**Verify:**
- ✅ Status tabs filter correctly
- ✅ "Pending Invoice" shows `status='summarized'` only
- ✅ Invoice creation moves reservation to "Invoiced" tab
- ✅ Actions change based on status

---

### Task 5.3: Database Verification

```sql
-- After complete flow, verify status progression
SELECT
  id,
  status,
  spaces_requested,
  spaces_confirmed,
  is_closed,
  updated_at
FROM reservations
WHERE studio_id = '[test-studio-id]'
ORDER BY created_at DESC
LIMIT 5;

-- Expected results:
-- 1. Latest reservation should have status='closed' (if paid)
-- 2. Previous should have status='invoiced' (if invoice created)
-- 3. Older should have status='summarized' (if summary submitted)
```

---

### Task 5.4: Comparison Test (Old vs New)

**Test same workflow on both pages:**

1. **Old page:** `/dashboard/entries`
   - What breaks? → "Pending Invoice" tab empty (status='summarized' not matched)
   - What works? → Entry creation, summary submission

2. **New page:** `/dashboard/entries-rebuild`
   - What breaks? → Nothing (designed for new status flow)
   - What works? → Everything

**Document findings in CUTOVER_COMPARISON.md**

---

### Commit for Phase 5:
```
test: Add end-to-end Playwright tests for rebuild pages

- Test SD flow: entries-rebuild page
- Test CD flow: reservation-pipeline-rebuild page
- Test status progression (pending → approved → summarized → invoiced → closed)
- Compare old vs new page behavior

Results: [screenshots attached]
Old pages: Degraded UX after status progression (expected)
New pages: ✅ All workflows functional

Database verification: Status values correct
```

---

## Phase 6: Cutover Decision (2 hours)

**Goal:** Decide when/how to switch production traffic to rebuild pages

### Task 6.1: Add Dashboard Preview Buttons (Before Full Cutover)

**Goal:** Let users test rebuild pages alongside old ones

**File:** `src/components/StudioDirectorDashboard.tsx`
**Location:** Add card/banner near top of dashboard

```typescript
import { Button } from '@/components/rebuild/ui/Button';
import { Card } from '@/components/rebuild/ui/Card';

// Add this section to SD dashboard
<Card className="mb-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-bold text-white mb-1">
        🆕 New Entries Page Available
      </h3>
      <p className="text-sm text-white/70">
        Try our rebuilt interface with cleaner design and better workflow.
        Your current page still works - this is just a preview!
      </p>
    </div>
    <Button
      href="/dashboard/entries-rebuild"
      variant="primary"
      className="ml-4 whitespace-nowrap"
    >
      Try New Version →
    </Button>
  </div>
</Card>
```

**File:** `src/components/CompetitionDirectorDashboard.tsx` (or wherever CD lands)
**Location:** Add card/banner near top of dashboard

```typescript
import { Button } from '@/components/rebuild/ui/Button';
import { Card } from '@/components/rebuild/ui/Card';

// Add this section to CD dashboard
<Card className="mb-6 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border-indigo-500/50">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-bold text-white mb-1">
        🆕 New Pipeline Page Available
      </h3>
      <p className="text-sm text-white/70">
        Try our rebuilt reservation pipeline with improved status tracking.
        Your current pipeline still works - this is just a preview!
      </p>
    </div>
    <Button
      href="/dashboard/reservation-pipeline-rebuild"
      variant="primary"
      className="ml-4 whitespace-nowrap"
    >
      Try New Version →
    </Button>
  </div>
</Card>
```

**Benefits:**
- Users can compare old vs new side-by-side
- Gather feedback before full cutover
- No forced migration (gradual adoption)
- Easy to remove after cutover complete

**Commit:**
```
feat: Add preview buttons for rebuild pages to dashboards

- SD Dashboard: "Try New Version" button for entries-rebuild
- CD Dashboard: "Try New Version" button for pipeline-rebuild
- Prominent placement with gradient highlight
- Clear messaging: "preview" not "replacement"

Users can test rebuild pages before full cutover.
Remove these buttons in Phase 6.3 after cutover complete.

✅ Build pass
```

---

### Task 6.2: Create Comparison Document

**File:** `CUTOVER_COMPARISON.md`

```markdown
# Rebuild Pages Cutover Comparison

## Old Pages Status
- `/dashboard/entries` - Functional but filters incomplete after status progression
- `/dashboard/reservation-pipeline` - "Pending Invoice" tab empty after backend changes

## New Pages Status
- `/dashboard/entries-rebuild` - ✅ Fully functional
- `/dashboard/reservation-pipeline-rebuild` - ✅ Fully functional

## Recommendation
**CUTOVER NOW** - New pages tested and superior

## Rollback Plan
If issues arise, revert navigation links to old routes:
- Change nav link back to `/dashboard/entries`
- Change nav link back to `/dashboard/reservation-pipeline`
- Keep rebuild routes live for debugging
```

---

### Task 6.3: Update Navigation Links (Full Cutover)

**File:** `src/components/Navigation.tsx` (or wherever nav lives)

```typescript
// BEFORE
<NavLink href="/dashboard/entries">Entries</NavLink>
<NavLink href="/dashboard/reservation-pipeline">Pipeline</NavLink>

// AFTER
<NavLink href="/dashboard/entries-rebuild">Entries</NavLink>
<NavLink href="/dashboard/reservation-pipeline-rebuild">Pipeline</NavLink>
```

**Also remove preview buttons from dashboards:**
- Remove "Try New Version" card from StudioDirectorDashboard.tsx
- Remove "Try New Version" card from CompetitionDirectorDashboard.tsx

**Reason:** After cutover, rebuild pages ARE the main pages (no need for "preview" messaging)

---

### Task 6.4: Add Redirects (Optional Safety)

**File:** `src/middleware.ts` or Next.js config

```typescript
// Redirect old routes to new ones
if (pathname === '/dashboard/entries') {
  return NextResponse.redirect(new URL('/dashboard/entries-rebuild', request.url));
}
if (pathname === '/dashboard/reservation-pipeline') {
  return NextResponse.redirect(new URL('/dashboard/reservation-pipeline-rebuild', request.url));
}
```

---

### Task 6.5: Monitor for 24 Hours

**After cutover:**
- Check Vercel logs for errors
- Monitor user feedback
- Watch for edge cases
- Keep old components for 1 week before deletion

---

### Commit for Phase 6:
```
feat: Cutover to rebuild pages

- Update navigation links to rebuild routes
- Add redirects from old routes
- Keep old components for safety (delete in 1 week)

Old routes now redirect to:
- /dashboard/entries → /dashboard/entries-rebuild
- /dashboard/reservation-pipeline → /dashboard/reservation-pipeline-rebuild

Rollback: Revert navigation links if issues arise

✅ Tested end-to-end
✅ All Phase 1 workflows functional
✅ Ready for production
```

---

## Field Name Compatibility List

**If we need to revert to old pages, these are the field name mismatches to fix:**

| Old Page Logic | Rebuild Logic | Notes |
|----------------|---------------|-------|
| `status === 'approved' && entryCount > 0` | `status === 'summarized'` | "Pending Invoice" filter |
| `status === 'approved' OR 'summarized'` | `status === 'invoiced'` | "Invoiced" filter |
| `status === 'approved' OR 'summarized'` | `status === 'closed'` | "Paid" filter |
| Capacity calc: only `approved` | Capacity calc: all active statuses | Approval modal |

**To restore old pages:** Revert backend status progression (entry.ts, invoice.ts, reservation.ts lines from Phase 0).

---

## Success Criteria

**Before declaring rebuild complete:**

- [ ] ✅ All Phase 0 backend changes deployed and tested
- [ ] ✅ All Phase 1 UI components built and working
- [ ] ✅ All Phase 2 hooks tested with real tRPC queries
- [ ] ✅ Phase 3 Entries page tested end-to-end
- [ ] ✅ Phase 4 Pipeline page tested end-to-end
- [ ] ✅ Phase 5 Playwright tests pass (SD + CD workflows)
- [ ] ✅ Database verification shows correct status values
- [ ] ✅ No regressions in existing workflows
- [ ] ✅ Navigation links updated
- [ ] ✅ 24-hour monitoring period complete

---

## Rollback Procedures

### If Rebuild Has Critical Bug

**Option 1: Keep Old Pages Active**
```bash
# Revert navigation links to old routes
git revert [cutover-commit-sha]
git push
# Users see old pages again
```

**Option 2: Fix Forward**
```bash
# Find bug in rebuild components
# Fix in place
# Test
# Deploy
# Faster than rollback if bug is simple
```

### If Backend Status Progression Breaks Something

**Revert backend changes:**
```bash
git revert [phase-0-commit-sha]
git push
# Status values stop updating
# Old pages work normally again
```

---

## Timeline Estimates

| Phase | Estimated Hours | Can Start After |
|-------|----------------|-----------------|
| Phase 0: Backend | 2-4 hours | Immediately |
| Phase 1: UI Components | 4-6 hours | Phase 0 complete |
| Phase 2: Hooks | 4-6 hours | Phase 1 complete |
| Phase 3: Entries Page | 8-10 hours | Phase 2 complete |
| Phase 4: Pipeline Page | 8-10 hours | Phase 3 complete |
| Phase 5: Testing | 4-6 hours | Phase 4 complete |
| Phase 6: Cutover | 2 hours | Phase 5 complete |
| **TOTAL** | **32-44 hours** | Sequential execution |

**Parallel execution possible:**
- Phase 1 + 2 can overlap (components + hooks concurrently)
- Phase 3 + 4 can overlap (both pages concurrently)

**Aggressive timeline:** 20-25 hours if phases parallelized

---

## Files Created Summary

**New Directories:**
```
src/components/rebuild/
├── ui/                    # 6 shared components
├── entries/               # 9 entries page components
└── pipeline/              # 8 pipeline page components

src/hooks/rebuild/         # 4 custom hooks

src/app/dashboard/
├── entries-rebuild/       # New route
└── reservation-pipeline-rebuild/  # New route
```

**Files Modified:**
```
src/server/routers/entry.ts       # Line ~287 (status progression)
src/server/routers/invoice.ts     # After invoice creation (status progression)
src/server/routers/reservation.ts # Line ~1050 (status progression)
src/components/Navigation.tsx     # Update links (Phase 6)
```

**Files Untouched:**
```
src/components/EntriesList.tsx            # Old page (keep for safety)
src/components/ReservationPipeline.tsx    # Old page (keep for safety)
src/hooks/useEntryFilters.ts              # Old hook (keep for safety)
(All other existing components unchanged)
```

---

## Recovery Contacts

**If stuck on:**
- Backend status issues → Check BACKEND_ANALYSIS_REPORT.md lines 520-560
- Filter logic → Check STRATEGIC_ALIGNMENT_PLAN.md lines 423-507
- Component structure → Check REBUILD_PLAN.md lines 28-76
- Business logic → Check PHASE1_SPEC.md

**Emergency rollback:** Revert navigation links, keep rebuild routes live for debugging

---

**Document Version:** 1.0
**Last Updated:** October 25, 2025
**Ready for Execution:** ✅

**Next Step:** Begin Phase 0 (Backend Status Progression)
