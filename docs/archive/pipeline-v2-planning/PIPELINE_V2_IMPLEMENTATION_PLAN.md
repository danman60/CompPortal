# Pipeline V2 Implementation Plan

**Mockup Reference:** `pipeline-v2-mockup-v10.html`
**Status:** Ready for implementation
**Estimated Complexity:** Medium-High (new component, reuses existing mutations)

---

## Executive Summary

Replace the current reservation pipeline with a modern, unified CRM-style dashboard that provides:
- Single status badge per studio (human-readable stage, not raw DB status)
- 4-step bead progress indicator (Approved → Entries → Invoice → Paid)
- Collapsible capacity overview with per-competition cards
- Expandable row details with 4 detail cards + activity log
- Issues tab highlighting data integrity problems
- Complete studio journey visibility from lead to paid

---

## Design System (App-Matched)

### Colors
```css
/* Background gradient */
background: linear-gradient(135deg, #581c87 0%, #312e81 50%, #1e3a8a 100%);
/* Tailwind: from-purple-900 via-indigo-900 to-blue-900 */

/* Primary button gradient */
background: linear-gradient(135deg, #ec4899, #8b5cf6);
/* Tailwind: from-pink-500 to-purple-500 */

/* Glass card */
background: rgba(255,255,255,0.1);
backdrop-filter: blur(12px);
border: 2px solid rgba(255,255,255,0.2);
/* Tailwind: bg-white/10 backdrop-blur-md border-2 border-white/20 */

/* Subtle glass card */
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.1);
/* Tailwind: bg-white/5 border border-white/10 */
```

### Status Badge Colors
| Status | Background | Text | Border |
|--------|------------|------|--------|
| Pending Review | `bg-yellow-500/20` | `text-yellow-300` | `border-yellow-500/30` |
| Approved | `bg-emerald-500/20` | `text-emerald-300` | `border-emerald-500/30` |
| Ready to Invoice | `bg-purple-500/20` | `text-purple-300` | `border-purple-500/30` |
| Invoice Sent | `bg-blue-500/20` | `text-blue-300` | `border-blue-500/30` |
| Paid Complete | `bg-emerald-500/20` | `text-emerald-300` | `border-emerald-500/30` |
| Needs Attention | `bg-red-500/20` | `text-red-300` | `border-red-500/30` |
| Rejected | `bg-red-500/20` | `text-red-300` | `border-red-500/30` |

### Bead Progress Colors
| State | Border | Fill | Connector |
|-------|--------|------|-----------|
| Complete | `border-emerald-500` | checkmark icon | `bg-emerald-500/50` |
| Current | stage color (blue/purple) | dot | stage color |
| Error | `border-red-500` | `!` or `✕` | `bg-red-500/50` |
| Pending | `border-white/20` | empty | `bg-white/10` |

---

## Architecture Overview

### Component Structure

```
src/app/dashboard/reservation-pipeline/
├── page.tsx                           # Update to use PipelineV2
└── pipeline-v2/
    ├── PipelineV2.tsx                 # Main container component
    ├── CollapsibleSection.tsx         # Reusable collapsible wrapper
    ├── PipelineKPICards.tsx           # 6 KPI stat cards
    ├── PipelineFilters.tsx            # Search + dropdowns + hide completed
    ├── PipelineTable.tsx              # Main table with expandable rows
    ├── PipelineRow.tsx                # Single row with status, beads, action
    ├── PipelineExpandedRow.tsx        # 4 detail cards + activity log
    ├── PipelineStatusBadge.tsx        # Single status badge component
    ├── PipelineBeadProgress.tsx       # 4-step bead progress indicator
    ├── usePipelineV2.ts               # Main data hook (extends existing)
    └── types.ts                       # TypeScript interfaces

REUSED FROM EXISTING:
├── EventMetricsGrid.tsx               # Capacity cards (wrap in CollapsibleSection)
├── useCountUp.ts                      # Counter animation hook
└── PipelinePageContainer.tsx          # Data fetching logic (reference for hook)
```

---

## Data Layer

### 1. Extend `getPipelineView` Query

**File:** `src/server/routers/reservation.ts:1316`

**Current Return Shape:**
```typescript
{
  id, studioId, studioName, studioCode, studioCity, studioProvince,
  studioAddress, studioCreatedAt, contactName, contactEmail, contactPhone,
  competitionId, competitionName, competitionYear, spacesRequested,
  spacesConfirmed, entryCount, status, invoiceId, invoiceStatus,
  totalAmount, invoicePaid, lastAction, lastActionDate
}
```

**New Fields Required:**
```typescript
// Add to getPipelineView query include:
summaries: {
  select: { id: true, submitted_at: true, approved_by: true }
},
// Add to transformation:
{
  ...existing,
  // Deposit info
  depositAmount: Number(r.deposit_amount || 0),
  depositPaidAt: r.deposit_paid_at,
  // Rejection info
  rejectionReason: r.rejection_reason,
  internalNotes: r.internal_notes,
  // Approval info
  approvedAt: r.approved_at,
  approvedBy: r.approved_by,
  // Summary status
  hasSummary: !!r.summaries?.length,
  summaryId: r.summaries?.[0]?.id || null,
  summarySubmittedAt: r.summaries?.[0]?.submitted_at || null,
  // Invoice extended
  invoiceAmount: invoice?.total ? parseFloat(invoice.total.toString()) : null,
  invoiceAmountPaid: invoice?.amount_paid ? parseFloat(invoice.amount_paid.toString()) : null,
  invoiceBalanceRemaining: invoice?.balance_remaining ? parseFloat(invoice.balance_remaining.toString()) : null,
  invoiceSentAt: invoice?.sent_at,
  invoicePaidAt: invoice?.paid_at,
  invoiceDueDate: invoice?.due_date,
  // Derived (single status for display)
  displayStatus: deriveDisplayStatus(r, invoice),
  hasIssue: detectDataIntegrityIssue(r, invoice),
}
```

**Helper Functions (add to reservation.ts):**
```typescript
type DisplayStatus =
  | 'pending_review'
  | 'approved'
  | 'ready_to_invoice'
  | 'invoice_sent'
  | 'paid_complete'
  | 'needs_attention'
  | 'rejected';

function deriveDisplayStatus(r: Reservation, invoice: Invoice | null): DisplayStatus {
  // Check for data integrity issues first
  if (r.status === 'summarized' && !r.summaries?.length) {
    return 'needs_attention';
  }

  // Check invoice status
  if (invoice) {
    if (invoice.status === 'PAID') return 'paid_complete';
    if (invoice.status === 'SENT') return 'invoice_sent';
    if (invoice.status === 'VOIDED') return 'needs_attention';
    // DRAFT invoice with summarized status = ready to send
    if (invoice.status === 'DRAFT') return 'invoice_sent'; // Invoice created but not sent
  }

  // Reservation status mapping
  switch (r.status) {
    case 'pending': return 'pending_review';
    case 'approved': return 'approved';
    case 'rejected': return 'rejected';
    case 'summarized': return 'ready_to_invoice';
    case 'invoiced': return invoice ? 'invoice_sent' : 'needs_attention';
    default: return 'needs_attention';
  }
}

function detectDataIntegrityIssue(r: Reservation, invoice: Invoice | null): string | null {
  // Elite Star Bug: summarized but no summary record
  if (r.status === 'summarized' && !r.summaries?.length) {
    return 'STATUS_MISMATCH: Status is summarized but no summary record exists';
  }
  // Invoice exists but reservation not invoiced
  if (invoice && r.status !== 'invoiced' && r.status !== 'summarized') {
    return 'STATUS_MISMATCH: Invoice exists but reservation status is not invoiced';
  }
  // Voided invoice needs attention
  if (invoice?.status === 'VOIDED') {
    return 'VOIDED_INVOICE: Invoice was voided, studio may need to be reset';
  }
  return null;
}
```

### 2. Add Capacity Overview Query

**Add to reservation.ts or competition.ts:**
```typescript
getCapacityOverview: publicProcedure
  .query(async ({ ctx }) => {
    const competitions = await ctx.db.competition.findMany({
      where: { tenant_id: ctx.tenantId },
      include: {
        reservations: {
          where: { status: { not: 'rejected' } },
          select: {
            spaces_confirmed: true,
            status: true,
          }
        }
      }
    });

    return competitions.map(comp => ({
      id: comp.id,
      name: comp.name,
      year: comp.year,
      startDate: comp.start_date,
      location: comp.location,
      maxCapacity: comp.max_capacity || 600,
      usedCapacity: comp.reservations.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0),
      studioCount: comp.reservations.length,
      pendingCount: comp.reservations.filter(r => r.status === 'pending').length,
    }));
  }),
```

---

## Button-to-Mutation Mapping (VERIFIED)

Every button in the mockup maps to an existing, working mutation:

| UI Button | Mutation | Router | Line | Status |
|-----------|----------|--------|------|--------|
| **Approve Request** | `approve` | reservation | 647 | ✅ Verified |
| **Reject Request** | `reject` | reservation | 857 | ✅ Verified |
| **Edit Spaces** | `adjustReservationSpaces` | reservation | 1507 | ✅ Verified |
| **Edit Deposit** | `update` | reservation | 580 | ✅ Verified |
| **Reopen for Edits** | `reopenSummary` | reservation | 2291 | ✅ Verified |
| **Reset to Approved** | `reopenSummary` | reservation | 2291 | ✅ Uses same mutation |
| **Create Invoice** | `createFromReservation` | invoice | 720 | ✅ Verified |
| **Send Invoice** | `sendInvoice` | invoice | 956 | ✅ Verified |
| **View Invoice** | Navigation only | — | — | ✅ No mutation needed |
| **Void Invoice** | `voidInvoice` | invoice | 2165 | ✅ Verified |
| **Record Payment** | `applyPartialPayment` | invoice | 2387 | ✅ Verified |
| **Mark Paid** | `markAsPaid` | invoice | 1069 | ✅ Verified |
| **Add Studio** | `createStudioWithReservation` | reservation | 1878 | ✅ Verified |
| **Review Request** | Opens modal → approve/reject | — | — | ✅ Uses approve/reject |
| **Fix Issue** | `reopenSummary` | reservation | 2291 | ✅ Resets to approved |

### Queries Verified:
| Query | Router | Line | Purpose |
|-------|--------|------|---------|
| `getPipelineView` | reservation | 1316 | Main table data |
| `getCapacity` | competition | 517 | Per-competition capacity (need to call for each) |
| `getActivities` | activity | 11 | Activity log for expanded row |
| `getPaymentHistory` | invoice | 2527 | Payment history for completed studios |

### Capacity Overview - REUSE EXISTING:
**Existing Component:** `src/components/rebuild/pipeline/EventMetricsGrid.tsx`

This component already shows:
- Competition cards with capacity bars (green/yellow/red color coding)
- Used/Total spaces with counter animation (`useCountUp` hook)
- Remaining capacity
- Studios count, Pending count
- Clickable cards linking to competition edit

**For Pipeline V2:** Simply wrap `EventMetricsGrid` in a collapsible section:
```tsx
<CollapsibleSection title="Capacity Overview" defaultOpen={true}>
  <EventMetricsGrid metrics={eventMetrics} />
</CollapsibleSection>
```

Data already computed in `PipelinePageContainer.tsx` lines 108-123.
**No new queries needed - port directly!**

---

## Existing Mutations Reference

### Reservation Router (`src/server/routers/reservation.ts`)

| Mutation | Line | Purpose | Input |
|----------|------|---------|-------|
| `approve` | 647 | Approve reservation | `{ id, spacesConfirmed }` |
| `reject` | ~767 | Reject reservation | `{ id, reason }` |
| `update` | 580 | Update reservation (deposit, notes) | `{ id, data: {...} }` |
| `reopenSummary` | 2291 | Reopen for edits | `{ reservationId }` |
| `adjustReservationSpaces` | 1507 | Adjust spaces | `{ id, newSpaces }` |
| `createStudioWithReservation` | 1878 | Create pre-approved studio | `{ studioName, spaces, depositAmount, ... }` |
| `reduceCapacity` | 1412 | Reduce with warnings | `{ id, newCapacity, confirmed }` |

### Invoice Router (`src/server/routers/invoice.ts`)

| Mutation | Line | Purpose | Input |
|----------|------|---------|-------|
| `createFromReservation` | 720 | Create invoice | `{ reservationId }` |
| `sendInvoice` | 956 | DRAFT → SENT | `{ invoiceId }` |
| `markAsPaid` | 1069 | Mark as paid | `{ invoiceId }` |
| `voidInvoice` | 2165 | Void invoice | `{ invoiceId, reason }` |
| `applyPartialPayment` | 2387 | Record payment | `{ invoiceId, amount, paymentDate, paymentMethod, ... }` |
| `getPaymentHistory` | 2527 | Get payment audit trail | `{ invoiceId }` |

### Activity Router (`src/server/routers/activity.ts`)

| Query/Mutation | Line | Purpose | Input |
|----------------|------|---------|-------|
| `getActivities` | 11 | Get activity log for entity | `{ entityType, entityId }` |
| `logActivity` | 58 | Log new activity | `{ entityType, entityId, action, ... }` |
| `getRecentActivityForSuperAdmin` | 93 | Get recent activities | `{}` |

### Studio Router (`src/server/routers/studio.ts`)

| Mutation | Line | Purpose | Input |
|----------|------|---------|-------|
| `delete` | 798 | Delete studio | `{ id }` |

### Admin Router (`src/server/routers/admin.ts`)

| Mutation | Line | Purpose | Input |
|----------|------|---------|-------|
| `bulkImportStudios` | 87 | Bulk CSV import | `[{ studioName, studioCode, ownerEmail, ... }]` |

---

## Existing Hooks to Extend

### `usePipelineReservations` (`src/hooks/rebuild/useReservations.ts`)

**Currently Exports:**
```typescript
export function usePipelineReservations(refetchCompetitions?: () => void) {
  const { data, isLoading, refetch } = trpc.reservation.getPipelineView.useQuery();
  const approveMutation = trpc.reservation.approve.useMutation({...});
  const rejectMutation = trpc.reservation.reject.useMutation({...});
  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({...});

  return {
    reservations, isLoading, refetch,
    approve, reject, createInvoice,
    isApproving, isRejecting, isCreatingInvoice
  };
}
```

**Extend With:**
```typescript
// Add these mutations to usePipelineReservations
const updateMutation = trpc.reservation.update.useMutation({...});
const reopenSummaryMutation = trpc.reservation.reopenSummary.useMutation({...});
const sendInvoiceMutation = trpc.invoice.sendInvoice.useMutation({...});
const markAsPaidMutation = trpc.invoice.markAsPaid.useMutation({...});
const voidInvoiceMutation = trpc.invoice.voidInvoice.useMutation({...});
const applyPaymentMutation = trpc.invoice.applyPartialPayment.useMutation({...});
const deleteStudioMutation = trpc.studio.delete.useMutation({...});

return {
  ...existing,
  updateReservation, reopenSummary, sendInvoice, markAsPaid,
  voidInvoice, applyPayment, deleteStudio
};
```

---

## Component Implementation Details

### 1. PipelineV2.tsx (Main Container)

```typescript
// src/app/dashboard/director-panel/pipeline-v2/PipelineV2.tsx
'use client';

import { useState, useMemo } from 'react';
import { usePipelineV2 } from './usePipelineV2';
import { PipelineCapacityOverview } from './PipelineCapacityOverview';
import { PipelineKPICards } from './PipelineKPICards';
import { PipelineFilters } from './PipelineFilters';
import { PipelineTable } from './PipelineTable';

export function PipelineV2() {
  const [activeTab, setActiveTab] = useState<'all' | 'issues'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [capacityExpanded, setCapacityExpanded] = useState(true);

  const { reservations, capacity, isLoading, ...mutations } = usePipelineV2();

  const filteredReservations = useMemo(() => {
    let result = reservations || [];
    if (activeTab === 'issues') {
      result = result.filter(r => r.hasIssue);
    }
    if (filters.status) {
      result = result.filter(r => r.displayStatus === filters.status);
    }
    if (filters.competition) {
      result = result.filter(r => r.competitionId === filters.competition);
    }
    if (filters.hideCompleted) {
      result = result.filter(r => r.displayStatus !== 'paid_complete');
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(r =>
        r.studioName.toLowerCase().includes(term) ||
        r.studioCode?.toLowerCase().includes(term) ||
        r.contactEmail?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [reservations, activeTab, filters]);

  const stats = useMemo(() => ({
    total: reservations?.length || 0,
    pending: reservations?.filter(r => r.displayStatus === 'pending_review').length || 0,
    readyToInvoice: reservations?.filter(r => r.displayStatus === 'ready_to_invoice').length || 0,
    awaitingPayment: reservations?.filter(r => r.displayStatus === 'invoice_sent').length || 0,
    paidComplete: reservations?.filter(r => r.displayStatus === 'paid_complete').length || 0,
    needsAttention: reservations?.filter(r => r.hasIssue).length || 0,
  }), [reservations]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Studio Pipeline</h1>
            <p className="text-sm text-purple-200/60 mt-1">
              {stats.total} studios across {capacity?.length || 0} competitions
            </p>
          </div>
          <button className="bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add Studio
          </button>
        </header>

        {/* Collapsible Capacity Overview */}
        <PipelineCapacityOverview
          competitions={capacity}
          isExpanded={capacityExpanded}
          onToggle={() => setCapacityExpanded(!capacityExpanded)}
        />

        {/* KPI Cards */}
        <PipelineKPICards stats={stats} onFilterClick={setFilters} />

        {/* Filters */}
        <PipelineFilters
          filters={filters}
          onChange={setFilters}
          competitions={capacity}
        />

        {/* Main Table */}
        <PipelineTable
          reservations={filteredReservations}
          isLoading={isLoading}
          expandedId={expandedId}
          onExpandChange={setExpandedId}
          mutations={mutations}
        />

        {/* Footer */}
        <footer className="mt-6 flex items-center justify-between text-sm text-purple-200/50">
          <div>Showing {filteredReservations.length} of {stats.total} studios</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              {stats.pending} pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              {stats.needsAttention} issues
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
```

### 2. PipelineCapacityOverview.tsx

```typescript
// src/app/dashboard/director-panel/pipeline-v2/PipelineCapacityOverview.tsx
'use client';

interface Props {
  competitions: CompetitionCapacity[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function PipelineCapacityOverview({ competitions, isExpanded, onToggle }: Props) {
  return (
    <section className="bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl mb-6 overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-medium text-white">Capacity Overview</span>
          {!isExpanded && (
            <span className="text-xs text-purple-200/50">
              {competitions.map(c => `${Math.round(c.usedCapacity / c.maxCapacity * 100)}% ${c.name}`).join(' | ')}
            </span>
          )}
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-purple-200/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitions.map(comp => (
              <div key={comp.id} className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">{comp.name} {comp.year}</h3>
                    <p className="text-xs text-purple-200/50 mt-0.5">
                      {formatDate(comp.startDate)} - {comp.location}
                    </p>
                  </div>
                  {comp.pendingCount > 0 && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded-md border border-yellow-500/30">
                      {comp.pendingCount} pending
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200/50">Capacity</span>
                    <span className="text-white">{comp.usedCapacity} / {comp.maxCapacity}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, comp.usedCapacity / comp.maxCapacity * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-purple-200/50">
                    <span>{comp.maxCapacity - comp.usedCapacity} available</span>
                    <span>{comp.studioCount} studios</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
```

### 3. PipelineStatusBadge.tsx (Single Status)

```typescript
// src/app/dashboard/director-panel/pipeline-v2/PipelineStatusBadge.tsx
'use client';

import { DisplayStatus } from './types';

interface Props {
  status: DisplayStatus;
}

const STATUS_CONFIG: Record<DisplayStatus, { bg: string; text: string; border: string; label: string; icon?: boolean }> = {
  'pending_review': { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30', label: 'Pending Review' },
  'approved': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Approved' },
  'ready_to_invoice': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30', label: 'Ready to Invoice' },
  'invoice_sent': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30', label: 'Invoice Sent' },
  'paid_complete': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Paid Complete', icon: true },
  'needs_attention': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', label: 'Needs Attention' },
  'rejected': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', label: 'Rejected' },
};

export function PipelineStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['needs_attention'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border}`}>
      {config.icon && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {config.label}
    </span>
  );
}
```

### 4. PipelineBeadProgress.tsx (4-Step Beads)

```typescript
// src/app/dashboard/director-panel/pipeline-v2/PipelineBeadProgress.tsx
'use client';

import { DisplayStatus } from './types';

interface Props {
  status: DisplayStatus;
  hasIssue: string | null;
}

type BeadState = 'complete' | 'current' | 'error' | 'pending';

function getBeadStates(status: DisplayStatus, hasIssue: string | null): BeadState[] {
  // 4 beads: Approved, Entries, Invoice, Paid
  if (hasIssue) {
    // Show error state
    if (status === 'needs_attention') {
      return ['complete', 'error', 'error', 'pending'];
    }
  }

  switch (status) {
    case 'pending_review':
      return ['current', 'pending', 'pending', 'pending'];
    case 'rejected':
      return ['error', 'pending', 'pending', 'pending'];
    case 'approved':
      return ['complete', 'pending', 'pending', 'pending'];
    case 'ready_to_invoice':
      return ['complete', 'current', 'pending', 'pending'];
    case 'invoice_sent':
      return ['complete', 'complete', 'current', 'pending'];
    case 'paid_complete':
      return ['complete', 'complete', 'complete', 'complete'];
    default:
      return ['pending', 'pending', 'pending', 'pending'];
  }
}

const BEAD_TITLES = ['Approved', 'Entries Submitted', 'Invoice', 'Paid'];

export function PipelineBeadProgress({ status, hasIssue }: Props) {
  const states = getBeadStates(status, hasIssue);

  return (
    <div className="flex items-center justify-center gap-1">
      {states.map((state, i) => (
        <Fragment key={i}>
          {/* Bead */}
          <div
            className={`progress-bead w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${getBeadStyles(state)}`}
            title={BEAD_TITLES[i]}
          >
            {getBeadContent(state)}
          </div>
          {/* Connector (except after last) */}
          {i < 3 && (
            <div className={`w-4 h-0.5 ${getConnectorColor(state, states[i + 1])}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function getBeadStyles(state: BeadState): string {
  switch (state) {
    case 'complete':
      return 'bg-emerald-500/20 border-2 border-emerald-500';
    case 'current':
      return 'bg-blue-500/20 border-2 border-blue-500';
    case 'error':
      return 'bg-red-500/20 border-2 border-red-500';
    case 'pending':
      return 'bg-white/5 border-2 border-white/20';
  }
}

function getBeadContent(state: BeadState): React.ReactNode {
  switch (state) {
    case 'complete':
      return <CheckIcon className="w-3 h-3 text-emerald-400" />;
    case 'current':
      return <div className="w-2 h-2 rounded-full bg-blue-400" />;
    case 'error':
      return <span className="text-red-400 text-xs font-bold">!</span>;
    case 'pending':
      return null;
  }
}

function getConnectorColor(current: BeadState, next: BeadState): string {
  if (current === 'complete' && next === 'complete') return 'bg-emerald-500/50';
  if (current === 'complete') return 'bg-emerald-500/50';
  if (current === 'error' || next === 'error') return 'bg-red-500/50';
  return 'bg-white/10';
}
```

### 5. PipelineExpandedRow.tsx (4 Detail Cards + Activity)

```typescript
// src/app/dashboard/director-panel/pipeline-v2/PipelineExpandedRow.tsx
'use client';

import { PipelineReservation, PipelineMutations } from './types';

interface Props {
  reservation: PipelineReservation;
  mutations: PipelineMutations;
}

export function PipelineExpandedRow({ reservation: r, mutations }: Props) {
  return (
    <div className={`p-6 border-t ${r.hasIssue ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>

      {/* Error Alert (if applicable) */}
      {r.hasIssue && (
        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30 mb-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-300">Status Mismatch</h4>
              <p className="text-sm text-red-200/70 mt-1">{r.hasIssue}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => mutations.reopenSummary({ reservationId: r.id })}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 text-white text-sm font-medium rounded-lg"
                >
                  Reset to Approved
                </button>
                <button className="px-4 py-2 bg-white/10 text-purple-100 text-sm rounded-lg hover:bg-white/20">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Detail Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Reservation Card */}
        <DetailCard
          title="Reservation"
          status={r.status !== 'pending' ? 'complete' : 'current'}
          statusLabel={r.status === 'pending' ? 'Pending' : 'Approved'}
          icon={<CheckIcon />}
          fields={[
            { label: 'Spaces', value: `${r.spacesConfirmed || r.spacesRequested} confirmed` },
            { label: 'Deposit', value: r.depositPaidAt ? `$${r.depositAmount} paid` : `$${r.depositAmount} required`, highlight: !!r.depositPaidAt },
            { label: 'Approved', value: r.approvedAt ? formatDate(r.approvedAt) : 'Pending' },
          ]}
          actions={[
            { label: 'Edit Spaces', onClick: () => mutations.openSpacesModal(r.id) },
            { label: 'Edit Deposit', onClick: () => mutations.openDepositModal(r.id) },
          ]}
        />

        {/* Summary Card */}
        <DetailCard
          title="Summary"
          status={r.hasSummary ? 'complete' : (r.status === 'approved' ? 'pending' : 'current')}
          statusLabel={r.hasSummary ? 'Submitted' : 'Awaiting'}
          icon={<DocumentTextIcon />}
          fields={[
            { label: 'Entries', value: r.entryCount ? `${r.entryCount} routines` : '—' },
            { label: 'Unused', value: r.spacesConfirmed && r.entryCount ? `${r.spacesConfirmed - r.entryCount} spaces` : '—', warning: (r.spacesConfirmed - r.entryCount) > 0 },
            { label: 'Submitted', value: r.summarySubmittedAt ? formatDate(r.summarySubmittedAt) : '—' },
          ]}
          actions={r.hasSummary ? [
            { label: 'Reopen for Edits', onClick: () => mutations.reopenSummary({ reservationId: r.id }), variant: 'warning' },
          ] : []}
        />

        {/* Invoice Card */}
        <DetailCard
          title="Invoice"
          status={r.invoiceId ? (r.invoiceStatus === 'SENT' ? 'current' : 'complete') : 'pending'}
          statusLabel={r.invoiceStatus || 'Not Created'}
          icon={<DocumentIcon />}
          highlight={r.invoiceStatus === 'SENT'}
          fields={[
            { label: 'Invoice #', value: r.invoiceId ? <a href="#" className="text-pink-400 hover:underline">{r.invoiceNumber}</a> : '—' },
            { label: 'Total', value: r.invoiceAmount ? `$${r.invoiceAmount.toFixed(2)}` : '—' },
            { label: 'Sent', value: r.invoiceSentAt ? formatDate(r.invoiceSentAt) : '—' },
          ]}
          actions={[
            r.invoiceId && { label: 'View Invoice', onClick: () => window.open(`/invoices/${r.invoiceId}`) },
            r.invoiceId && r.invoiceStatus !== 'VOIDED' && { label: 'Void Invoice', onClick: () => mutations.voidInvoice({ invoiceId: r.invoiceId! }), variant: 'danger' },
          ].filter(Boolean)}
        />

        {/* Payment Card */}
        <DetailCard
          title="Payment"
          status={r.invoiceStatus === 'PAID' ? 'complete' : 'pending'}
          statusLabel={r.invoiceStatus === 'PAID' ? 'Complete' : 'Pending'}
          icon={<CurrencyDollarIcon />}
          fields={[
            { label: 'Deposit', value: r.depositPaidAt ? `$${r.depositAmount}` : '—', highlight: !!r.depositPaidAt },
            { label: 'Remaining', value: r.invoiceBalanceRemaining !== null ? `$${r.invoiceBalanceRemaining.toFixed(2)}` : '—', warning: r.invoiceBalanceRemaining > 0 },
            { label: 'Due', value: r.invoiceDueDate ? formatDate(r.invoiceDueDate) : '—' },
          ]}
          actions={[
            r.invoiceStatus === 'SENT' && { label: 'Record Payment', onClick: () => mutations.openPaymentModal(r.invoiceId!), variant: 'primary' },
            r.invoiceStatus === 'SENT' && { label: 'Mark Paid', onClick: () => mutations.markAsPaid({ invoiceId: r.invoiceId! }), variant: 'success' },
          ].filter(Boolean)}
        />
      </div>

      {/* Activity Log */}
      <div className="mt-5 bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white">Activity</h4>
          <button className="text-xs text-pink-400 hover:underline">View all</button>
        </div>
        <div className="space-y-2 text-sm">
          {r.activities?.slice(0, 3).map((activity, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-purple-200/40 w-20 shrink-0">{formatShortDate(activity.createdAt)}</span>
              <span className="text-purple-200/70">{activity.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 6. Action Button Standardization

**Standardized action language (verb + noun pattern):**

| Status | Primary Action | Action Color |
|--------|---------------|--------------|
| pending_review | Review Request | `bg-yellow-500/20 text-yellow-300` |
| approved | (no primary action) | — |
| ready_to_invoice | Create Invoice | `btn-primary` (pink-purple gradient) |
| invoice_sent | Record Payment | `bg-emerald-500/20 text-emerald-300` |
| paid_complete | Done | `text-emerald-400` (text only) |
| needs_attention | Fix Issue | `bg-red-500 text-white` |

**Expanded row actions follow same pattern:**
- "Approve Request" / "Reject Request" (for pending)
- "Edit Spaces" / "Edit Deposit" (for reservation card)
- "Reopen for Edits" (for summary card)
- "View Invoice" / "Void Invoice" (for invoice card)
- "Record Payment" / "Mark Paid" (for payment card)
- "Reset to Approved" (for issues)

---

## Type Definitions

```typescript
// src/app/dashboard/director-panel/pipeline-v2/types.ts

export type DisplayStatus =
  | 'pending_review'
  | 'approved'
  | 'ready_to_invoice'
  | 'invoice_sent'
  | 'paid_complete'
  | 'needs_attention'
  | 'rejected';

export interface PipelineReservation {
  id: string;
  studioId: string;
  studioName: string;
  studioCode: string | null;
  studioCity: string;
  studioProvince: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string;
  competitionId: string;
  competitionName: string;
  competitionYear: number;
  spacesRequested: number;
  spacesConfirmed: number;
  entryCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'summarized' | 'invoiced';
  // Deposit
  depositAmount: number;
  depositPaidAt: Date | null;
  // Approval
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  // Summary
  hasSummary: boolean;
  summaryId: string | null;
  summarySubmittedAt: Date | null;
  // Invoice
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: 'DRAFT' | 'SENT' | 'PAID' | 'UNPAID' | 'VOIDED' | null;
  invoiceAmount: number | null;
  invoiceAmountPaid: number | null;
  invoiceBalanceRemaining: number | null;
  invoiceSentAt: Date | null;
  invoicePaidAt: Date | null;
  invoiceDueDate: Date | null;
  // Derived
  displayStatus: DisplayStatus;
  hasIssue: string | null;
  // Activity
  activities?: Activity[];
}

export interface CompetitionCapacity {
  id: string;
  name: string;
  year: number;
  startDate: Date;
  location: string;
  maxCapacity: number;
  usedCapacity: number;
  studioCount: number;
  pendingCount: number;
}

export interface PipelineMutations {
  approve: (input: { id: string; spacesConfirmed: number }) => void;
  reject: (input: { id: string; reason?: string }) => void;
  createInvoice: (input: { reservationId: string }) => void;
  sendInvoice: (input: { invoiceId: string }) => void;
  markAsPaid: (input: { invoiceId: string }) => void;
  voidInvoice: (input: { invoiceId: string; reason?: string }) => void;
  applyPayment: (input: { invoiceId: string; amount: number; paymentDate: Date }) => void;
  reopenSummary: (input: { reservationId: string }) => void;
  // NOTE: "Reset to Approved" uses reopenSummary - it already sets status='approved'
  adjustSpaces: (input: { id: string; newSpaces: number }) => void;
  updateDeposit: (input: { id: string; depositAmount: number }) => void;
  openSpacesModal: (id: string) => void;
  openDepositModal: (id: string) => void;
  openPaymentModal: (invoiceId: string) => void;
  isLoading: boolean;
}

export interface FilterState {
  status?: DisplayStatus;
  competition?: string;
  search?: string;
  hideCompleted?: boolean;
}

export interface PipelineStats {
  total: number;
  pending: number;
  readyToInvoice: number;
  awaitingPayment: number;
  paidComplete: number;
  needsAttention: number;
}
```

---

## Implementation Steps

### Phase 1: Backend Extension (2 files)

1. **Extend `getPipelineView` query** (`src/server/routers/reservation.ts:1316`)
   - Add `summaries` to include
   - Add new fields to transformation
   - Add helper functions for status derivation and issue detection
   - Run `npm run build` to verify types

2. **Add `getCapacityOverview` query** (`src/server/routers/reservation.ts` or `competition.ts`)
   - Returns capacity data per competition

### Phase 2: Hook Extension (1 file)

3. **Extend `usePipelineReservations`** (`src/hooks/rebuild/useReservations.ts`)
   - Add missing mutations (sendInvoice, markAsPaid, voidInvoice, applyPayment, reopenSummary)
   - Add capacity query
   - Export new mutations

### Phase 3: Component Implementation (10 files)

4. **Create type definitions** (`types.ts`)
5. **Create usePipelineV2 hook** (thin wrapper)
6. **Create PipelineCapacityOverview** (collapsible capacity section)
7. **Create PipelineKPICards** (6 stat cards)
8. **Create PipelineFilters** (search + dropdowns)
9. **Create PipelineStatusBadge** (single status badge)
10. **Create PipelineBeadProgress** (4-step beads)
11. **Create PipelineRow** (table row with status, beads, action)
12. **Create PipelineExpandedRow** (4 cards + activity)
13. **Create PipelineTable** (table container)
14. **Create PipelineV2** (main container)

### Phase 4: Integration

15. **Update director-panel page** to use new PipelineV2 component
16. **Test on both tenants** (EMPWR + Glow)
17. **Verify all mutations work** end-to-end

---

## Testing Checklist

### Status Display
- [ ] Pending Review badge shows correctly
- [ ] Approved badge shows correctly
- [ ] Ready to Invoice badge shows correctly
- [ ] Invoice Sent badge shows correctly
- [ ] Paid Complete badge shows correctly with checkmark
- [ ] Needs Attention badge shows for issues

### Bead Progress
- [ ] Pending: first bead yellow/current, rest empty
- [ ] Approved: first bead green/complete, rest empty
- [ ] Ready to Invoice: 2 beads complete, current on 2nd
- [ ] Invoice Sent: 3 beads engaged, current on 3rd
- [ ] Paid Complete: all 4 beads green with checkmarks
- [ ] Error state: red beads with exclamation mark

### Capacity Overview
- [ ] Collapsible toggle works
- [ ] Shows inline summary when collapsed
- [ ] Shows competition cards when expanded
- [ ] Capacity bars reflect actual data
- [ ] Pending count badges show correctly

### Actions
- [ ] Approve mutation works (pending → approved)
- [ ] Reject mutation works (pending → rejected)
- [ ] Create Invoice works (summarized → invoiced:DRAFT)
- [ ] Send Invoice works (DRAFT → SENT)
- [ ] Mark Paid works (SENT → PAID)
- [ ] Void Invoice works (any → VOIDED)
- [ ] Reopen Summary works (summarized/invoiced → approved)
- [ ] Record Payment opens modal

### Expanded Row
- [ ] 4 detail cards render correctly
- [ ] Activity log shows recent activity
- [ ] Issue alert shows for problematic studios
- [ ] All action buttons work

### Filters
- [ ] Search by name works
- [ ] Search by code works
- [ ] Search by email works
- [ ] Competition filter works
- [ ] Stage filter works
- [ ] Hide completed toggle works

### Production Verification
- [ ] Tested on EMPWR
- [ ] Tested on Glow
- [ ] No console errors
- [ ] No data leakage between tenants

---

## Files Changed Summary

**New Page Route:** `/dashboard/pipeline-v2` (separate from existing pipeline)

| File | Action | Lines Est. |
|------|--------|------------|
| `src/server/routers/reservation.ts` | Modify | +80 |
| `src/app/dashboard/pipeline-v2/page.tsx` | Create | 10 |
| `src/app/dashboard/pipeline-v2/types.ts` | Create | 100 |
| `src/app/dashboard/pipeline-v2/usePipelineV2.ts` | Create | 80 |
| `src/app/dashboard/pipeline-v2/CollapsibleSection.tsx` | Create | 40 |
| `src/app/dashboard/pipeline-v2/PipelineKPICards.tsx` | Create | 60 |
| `src/app/dashboard/pipeline-v2/PipelineFilters.tsx` | Create | 80 |
| `src/app/dashboard/pipeline-v2/PipelineStatusBadge.tsx` | Create | 40 |
| `src/app/dashboard/pipeline-v2/PipelineBeadProgress.tsx` | Create | 100 |
| `src/app/dashboard/pipeline-v2/PipelineRow.tsx` | Create | 100 |
| `src/app/dashboard/pipeline-v2/PipelineExpandedRow.tsx` | Create | 250 |
| `src/app/dashboard/pipeline-v2/PipelineTable.tsx` | Create | 100 |
| `src/app/dashboard/pipeline-v2/PipelineV2.tsx` | Create | 200 |

**Reused (no changes):**
- `EventMetricsGrid.tsx` - Capacity cards (imported directly)
- `useCountUp.ts` - Counter animations

**Total Estimated New Lines:** ~1,240

---

## STEP-BY-STEP IMPLEMENTATION (Continue-Friendly)

**Designed for:** Spam "continue" until finished, then test on production
**Test Account:** DEMO STUDIO djamusic@gmail.com on EMPWR tenant

### PHASE 1: Foundation (Steps 1-4)

#### Step 1: Create types.ts
- [ ] Create `src/app/dashboard/pipeline-v2/types.ts`
- [ ] Define `DisplayStatus` type (7 statuses)
- [ ] Define `PipelineReservation` interface (all fields from mockup)
- [ ] Define `CompetitionCapacity` interface
- [ ] Define `PipelineMutations` interface
- [ ] Define `FilterState` and `PipelineStats`

#### Step 2: Extend getPipelineView query
- [ ] Add `summaries` to include in reservation.ts
- [ ] Add `deriveDisplayStatus()` helper function
- [ ] Add `detectDataIntegrityIssue()` helper function
- [ ] Add new fields to transformation (deposit, summary, invoice extended)
- [ ] Run `npm run build` to verify

#### Step 3: Create usePipelineV2 hook
- [ ] Create `src/app/dashboard/pipeline-v2/usePipelineV2.ts`
- [ ] Import and extend usePipelineReservations pattern
- [ ] Add all mutations from button mapping table
- [ ] Add capacity data fetching
- [ ] Export typed hook

#### Step 4: Create page.tsx route
- [ ] Create `src/app/dashboard/pipeline-v2/page.tsx`
- [ ] Import PipelineV2 component (will create next)
- [ ] Export default page component
- [ ] Run `npm run build` to verify route

### PHASE 2: Components - Small (Steps 5-8)

#### Step 5: Create CollapsibleSection.tsx
- [ ] Create collapsible wrapper component
- [ ] Props: title, children, defaultOpen
- [ ] Chevron rotation animation
- [ ] Match glass card styling

#### Step 6: Create PipelineStatusBadge.tsx
- [ ] Create status badge component
- [ ] STATUS_CONFIG with 7 statuses
- [ ] Color coding per mockup (yellow/green/purple/blue/red)
- [ ] Checkmark icon for paid_complete

#### Step 7: Create PipelineBeadProgress.tsx
- [ ] Create 4-step bead component
- [ ] getBeadStates() function mapping status to bead states
- [ ] Bead styling (complete/current/error/pending)
- [ ] Connector lines between beads
- [ ] Tooltips for each step

#### Step 8: Create PipelineKPICards.tsx
- [ ] Create 6 KPI cards grid
- [ ] Match mockup: Total, Pending, Ready, Awaiting, Paid, Issues
- [ ] Clickable cards to filter
- [ ] Color coding per status

### PHASE 3: Components - Complex (Steps 9-11)

#### Step 9: Create PipelineFilters.tsx
- [ ] Search input (name, code, email)
- [ ] Competition dropdown
- [ ] Stage dropdown
- [ ] Hide completed checkbox
- [ ] Match glass card styling

#### Step 10: Create PipelineRow.tsx
- [ ] Create table row component
- [ ] Import PipelineStatusBadge and PipelineBeadProgress
- [ ] Expandable chevron
- [ ] Action button per status
- [ ] Match mockup exactly

#### Step 11: Create PipelineExpandedRow.tsx
- [ ] Create expanded detail section
- [ ] 4 detail cards: Reservation, Summary, Invoice, Payment
- [ ] Activity log section
- [ ] Issue alert for problematic studios
- [ ] All action buttons with mutations

### PHASE 4: Assembly (Steps 12-14)

#### Step 12: Create PipelineTable.tsx
- [ ] Create table container
- [ ] Header row with columns
- [ ] Map over reservations
- [ ] Handle expand/collapse state
- [ ] Loading state

#### Step 13: Create PipelineV2.tsx (Main Container)
- [ ] Import all components
- [ ] Import EventMetricsGrid for capacity
- [ ] Wrap capacity in CollapsibleSection
- [ ] Add KPI cards, filters, table
- [ ] Filter logic (search, competition, stage, hide completed)
- [ ] Stats calculation
- [ ] Match mockup header and footer

#### Step 14: Final Integration
- [ ] Update page.tsx to import PipelineV2
- [ ] Run `npm run build`
- [ ] Fix any type errors
- [ ] Deploy to Vercel

### PHASE 5: Testing (Steps 15-17)

#### Step 15: Visual Verification
- [ ] Navigate to /dashboard/pipeline-v2 on EMPWR
- [ ] Verify capacity section (collapsible, shows data)
- [ ] Verify KPI cards show correct counts
- [ ] Verify status badges render correctly
- [ ] Verify bead progress for each status type
- [ ] Screenshot evidence

#### Step 16: Functional Testing (DEMO STUDIO)
- [ ] Login as djamusic@gmail.com on EMPWR
- [ ] Test expand/collapse rows
- [ ] Test filters (search, competition, stage)
- [ ] Test hide completed toggle
- [ ] Screenshot evidence

#### Step 17: Mutation Testing
- [ ] Test approve workflow (if pending studio exists)
- [ ] Test create invoice (if summarized studio exists)
- [ ] Test record payment button
- [ ] Verify no console errors
- [ ] Final screenshots

---

## Summary Checklist

- [ ] Phase 1 complete (Foundation)
- [ ] Phase 2 complete (Small components)
- [ ] Phase 3 complete (Complex components)
- [ ] Phase 4 complete (Assembly)
- [ ] Phase 5 complete (Testing)
- [ ] Build passes
- [ ] No console errors
- [ ] Screenshots captured
- [ ] Ready for user review
