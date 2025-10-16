# CompPortal Refactoring Recommendations

**Analysis Date**: October 16, 2025
**Codebase Size**: 256 TypeScript files, 45 database models, 29 tRPC routers
**Estimated Impact**: 30% code reduction, 60% maintainability improvement
**Status**: Ready for implementation

---

## Executive Summary

CompPortal has grown to production scale but exhibits common rapid-development patterns:
- **6 files >500 lines** (largest: 1,316 lines)
- **~800 lines of duplicated code** (badges, modals, email logic)
- **1 CRITICAL policy violation** (hardcoded pricing)
- **20+ long functions** (>50 lines)

**Recommended Approach**: Incremental refactoring over 5 priorities, ~35 hours total effort.

---

## Priority 1: CRITICAL - Fix Hardcoded Pricing (1 hour)

### Issue
**Location**: `src/components/EntriesList.tsx:879`

```tsx
// ❌ VIOLATES "NO SAMPLE DATA" POLICY
<div className="text-2xl font-bold text-purple-400">
  ${(filteredEntries.length * 50).toFixed(2)}
</div>
```

**Risk**: Users see incorrect pricing, undermines trust, blocks production launch.

### Solution
```tsx
// ✅ Calculate from actual entry fees
<div className="text-2xl font-bold text-purple-400">
  ${filteredEntries.reduce((sum, e) => sum + Number(e.total_fee || 0), 0).toFixed(2)}
</div>
```

### Files to Modify
- `src/components/EntriesList.tsx:879`

### Testing
1. Navigate to /dashboard/entries
2. Create entries with various fees
3. Verify summary bar shows correct total (not $50 × count)

---

## Priority 2: HIGH - Extract StatusBadge Component (4 hours)

### Issue
**Duplicated 12+ times** across:
- EntriesList.tsx (3 locations)
- ReservationsList.tsx (2 locations)
- InvoiceDetail.tsx (2 locations)
- ReservationPipeline.tsx (2 locations)
- AllInvoicesList.tsx (1 location)
- UnifiedRoutineForm.tsx (1 location)
- StudioApprovalList.tsx (1 location)

**Current Code** (repeated):
```tsx
<span className={`px-3 py-1 rounded-full text-xs font-semibold ${
  status === 'confirmed'
    ? 'bg-green-500/20 text-green-400 border border-green-400/30'
    : status === 'registered'
    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
    : status === 'cancelled'
    ? 'bg-red-500/20 text-red-400 border border-red-400/30'
    : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
}`}>
  {status}
</span>
```

### Solution
Create reusable component:

```tsx
// src/components/ui/StatusBadge.tsx
'use client';

interface StatusBadgeProps {
  status: 'confirmed' | 'registered' | 'cancelled' | 'draft' | 'pending' | 'approved' | 'rejected';
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_STYLES = {
  confirmed: 'bg-green-500/20 text-green-400 border-green-400/30',
  approved: 'bg-green-500/20 text-green-400 border-green-400/30',
  registered: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-400/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-400/30',
  draft: 'bg-gray-500/20 text-gray-400 border-gray-400/30',
} as const;

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={`rounded-full font-semibold uppercase border ${STATUS_STYLES[status]} ${SIZE_CLASSES[size]}`}>
      {status}
    </span>
  );
}
```

### Implementation Steps
1. Create `src/components/ui/StatusBadge.tsx`
2. Replace all 12 instances with `<StatusBadge status={entry.status} />`
3. Add import: `import { StatusBadge } from '@/components/ui/StatusBadge';`
4. Test all views to ensure styling matches

### Impact
- **-300 lines** of duplicated code
- **Consistent UX** across all status displays
- **Single source of truth** for status styling

---

## Priority 3: HIGH - Extract Modal Component (6 hours)

### Issue
**Duplicated 8+ times** with inconsistent accessibility:
- EntriesList.tsx (4 modals)
- ReservationsList.tsx (2 modals)
- InvoiceDetail.tsx (1 modal)
- DancersList.tsx (1 modal)

**Current Pattern**:
```tsx
{showModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       onClick={() => setShowModal(false)}>
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 p-6 max-w-md w-full shadow-2xl"
         onClick={(e) => e.stopPropagation()}>
      {/* Modal content */}
    </div>
  </div>
)}
```

### Solution
```tsx
// src/components/ui/Modal.tsx
'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'warning' | 'danger' | 'success';
  children: React.ReactNode;
}

const VARIANT_STYLES = {
  default: 'from-gray-900 to-gray-800 border-white/20',
  warning: 'from-yellow-900/90 to-orange-900/90 border-yellow-400/50',
  danger: 'from-red-900/90 to-red-800/90 border-red-400/50',
  success: 'from-green-900/90 to-green-800/90 border-green-400/50',
};

const SIZE_STYLES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-4xl',
};

export function Modal({ isOpen, onClose, title, size = 'md', variant = 'default', children }: ModalProps) {
  // Accessibility: Escape key closes modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-gradient-to-br rounded-xl border p-6 w-full shadow-2xl ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
```

### Usage Example
```tsx
// Before:
{showIncompleteConfirm && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       onClick={() => setShowIncompleteConfirm(false)}>
    <div className="bg-gradient-to-br from-yellow-900/90 to-orange-900/90 rounded-xl border-2 border-yellow-400/50 p-8 max-w-md w-full shadow-2xl"
         onClick={(e) => e.stopPropagation()}>
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-white mb-2">Incomplete Reservation</h2>
      {/* Modal content */}
    </div>
  </div>
)}

// After:
<Modal
  isOpen={showIncompleteConfirm}
  onClose={() => setShowIncompleteConfirm(false)}
  variant="warning"
  size="md"
  title="⚠️ Incomplete Reservation"
>
  <p className="text-yellow-200">You're submitting with fewer routines than reserved...</p>
  {/* Modal content */}
</Modal>
```

### Implementation Steps
1. Create `src/components/ui/Modal.tsx`
2. Replace all 8+ modal implementations
3. Add Escape key handling (already in component)
4. Test all modals for consistent behavior

### Impact
- **-400 lines** of duplicated code
- **Accessible by default** (Escape key support)
- **Consistent animations** and transitions

---

## Priority 4: MEDIUM - Create Email Service Layer (8 hours)

### Issue
Email sending logic **duplicated 6 times** in `src/server/routers/reservation.ts`:
- Lines 654-684: Invoice delivery email
- Lines 689-714: Reservation approval email
- Lines 784-809: Reservation rejection email
- Lines 979-1023: Payment confirmation email

**Problems**:
- Can't test without tRPC context
- Inconsistent error handling
- Blocks retry logic implementation

### Solution
```typescript
// src/lib/services/emailService.ts
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import {
  renderReservationApproved,
  renderReservationRejected,
  renderPaymentConfirmed,
  renderInvoiceDelivery,
  getEmailSubject,
  type ReservationApprovedData,
  type ReservationRejectedData,
  type PaymentConfirmedData,
  type InvoiceDeliveryData,
} from '@/lib/email-templates';

export class EmailService {
  private static getAppUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  static async sendReservationApproval(data: {
    studioEmail: string;
    studioName: string;
    competitionName: string;
    competitionYear: number;
    spacesConfirmed: number;
  }) {
    try {
      const emailData: ReservationApprovedData = {
        studioName: data.studioName,
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
        spacesConfirmed: data.spacesConfirmed,
        portalUrl: `${this.getAppUrl()}/dashboard/reservations`,
      };

      const html = await renderReservationApproved(emailData);
      const subject = getEmailSubject('reservation-approved', {
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
      });

      await sendEmail({ to: data.studioEmail, subject, html });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send reservation approval email', { error, data });
      return { success: false, error };
    }
  }

  static async sendReservationRejection(data: {
    studioEmail: string;
    studioName: string;
    competitionName: string;
    competitionYear: number;
    reason?: string;
    contactEmail: string;
  }) {
    try {
      const emailData: ReservationRejectedData = {
        studioName: data.studioName,
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
        reason: data.reason,
        portalUrl: `${this.getAppUrl()}/dashboard/reservations`,
        contactEmail: data.contactEmail,
      };

      const html = await renderReservationRejected(emailData);
      const subject = getEmailSubject('reservation-rejected', {
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
      });

      await sendEmail({ to: data.studioEmail, subject, html });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send reservation rejection email', { error, data });
      return { success: false, error };
    }
  }

  static async sendInvoiceDelivery(data: {
    studioEmail: string;
    studioName: string;
    competitionName: string;
    competitionYear: number;
    invoiceNumber: string;
    totalAmount: number;
    routineCount: number;
    studioId: string;
    competitionId: string;
  }) {
    try {
      const emailData: InvoiceDeliveryData = {
        studioName: data.studioName,
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
        invoiceNumber: data.invoiceNumber,
        totalAmount: data.totalAmount,
        routineCount: data.routineCount,
        invoiceUrl: `${this.getAppUrl()}/dashboard/invoices/${data.studioId}/${data.competitionId}`,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };

      const html = await renderInvoiceDelivery(emailData);
      const subject = getEmailSubject('invoice', {
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
      });

      await sendEmail({ to: data.studioEmail, subject, html });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send invoice delivery email', { error, data });
      return { success: false, error };
    }
  }

  static async sendPaymentConfirmation(data: {
    studioEmail: string;
    studioName: string;
    competitionName: string;
    competitionYear: number;
    amount: number;
    paymentStatus: string;
    invoiceNumber?: string;
  }) {
    try {
      const emailData: PaymentConfirmedData = {
        studioName: data.studioName,
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
        amount: data.amount,
        paymentStatus: data.paymentStatus,
        invoiceNumber: data.invoiceNumber,
        paymentDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };

      const html = await renderPaymentConfirmed(emailData);
      const subject = getEmailSubject('payment-confirmed', {
        paymentStatus: data.paymentStatus,
        competitionName: data.competitionName,
        competitionYear: data.competitionYear,
      });

      await sendEmail({ to: data.studioEmail, subject, html });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send payment confirmation email', { error, data });
      return { success: false, error };
    }
  }
}
```

### Usage in Routers
```typescript
// Before (reservation.ts:689-714):
if (reservation.studios?.email) {
  try {
    const emailData: ReservationApprovedData = {
      studioName: reservation.studios.name,
      competitionName: reservation.competitions?.name || 'Competition',
      competitionYear: reservation.competitions?.year || new Date().getFullYear(),
      spacesConfirmed: reservation.spaces_confirmed || 0,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations`,
    };
    const html = await renderReservationApproved(emailData);
    const subject = getEmailSubject('reservation-approved', { /* ... */ });
    await sendEmail({ to: reservation.studios.email, subject, html });
  } catch (error) {
    logger.error('Failed to send approval email', { error });
  }
}

// After:
if (reservation.studios?.email) {
  await EmailService.sendReservationApproval({
    studioEmail: reservation.studios.email,
    studioName: reservation.studios.name,
    competitionName: reservation.competitions?.name || 'Competition',
    competitionYear: reservation.competitions?.year || new Date().getFullYear(),
    spacesConfirmed: reservation.spaces_confirmed || 0,
  });
}
```

### Implementation Steps
1. Create `src/lib/services/emailService.ts`
2. Replace all 6 email-sending blocks in `reservation.ts`
3. Add unit tests for email service (mock sendEmail)
4. Verify all emails still send correctly

### Impact
- **-500 lines** from routers
- **Testable** without tRPC context
- **Centralized** error handling
- **Easier** to add retry logic, rate limiting

---

## Priority 5: MEDIUM - Refactor EntriesList.tsx (16 hours)

### Issue
**Largest component**: 1,316 lines with mixed responsibilities:
1. Data fetching (tRPC queries)
2. State management (13 useState hooks)
3. Filtering and sorting
4. Card view rendering
5. Table view rendering
6. 4 different modals
7. Bulk selection with keyboard shortcuts
8. Space usage calculations
9. Live summary bar
10. Pull-to-refresh

**Problems**:
- Hard to test individual features
- High re-render frequency (13 separate state hooks)
- Can't reuse logic in other views

### Solution Architecture
```
EntriesList.tsx (200 lines - orchestration only)
├── hooks/
│   ├── useEntries.ts (data fetching, 50 lines)
│   ├── useEntryFilters.ts (filtering logic, 40 lines)
│   ├── useBulkSelection.ts (selection state, 60 lines)
│   └── useSpaceUsage.ts (capacity calculations, 40 lines)
├── components/entries/
│   ├── EntriesCardView.tsx (150 lines)
│   ├── EntriesTableView.tsx (200 lines)
│   ├── EntryCard.tsx (80 lines)
│   ├── EntryTableRow.tsx (60 lines)
│   ├── EntriesFilterBar.tsx (100 lines)
│   ├── BulkSelectionToolbar.tsx (80 lines)
│   ├── EntrySummaryBar.tsx (120 lines)
│   └── SpaceUsageIndicator.tsx (60 lines)
└── components/entries/modals/
    ├── EntryDetailModal.tsx (120 lines)
    ├── EntrySummaryModal.tsx (150 lines)
    └── IncompleteSubmissionModal.tsx (100 lines)
```

### Phase 1: Extract Custom Hooks (8 hours)

#### `src/hooks/useEntries.ts`
```tsx
import { trpc } from '@/lib/trpc';

export function useEntries(competitionId?: string) {
  const { data, isLoading, refetch, dataUpdatedAt } = trpc.entry.getAll.useQuery({
    limit: 100,
    offset: 0,
  });

  const entries = data?.entries || [];

  const { data: reservationData } = trpc.reservation.getAll.useQuery({
    competitionId: competitionId || undefined,
    status: 'approved',
  });

  const selectedReservation = reservationData?.reservations?.[0];

  const confirmedSpaces = selectedReservation?.spaces_confirmed || 0;
  const usedSpaces = entries.filter(e =>
    e.competition_id === competitionId && e.status !== 'cancelled'
  ).length;

  return {
    entries,
    isLoading,
    refetch,
    dataUpdatedAt,
    reservation: selectedReservation,
    confirmedSpaces,
    usedSpaces,
    isAtLimit: usedSpaces >= confirmedSpaces,
    isIncomplete: usedSpaces < confirmedSpaces,
  };
}
```

#### `src/hooks/useEntryFilters.ts`
```tsx
import { useMemo } from 'react';

export function useEntryFilters(
  entries: any[],
  filter: 'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled',
  selectedCompetition: string
) {
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesStatus = filter === 'all' || entry.status === filter;
      const matchesCompetition = !selectedCompetition || entry.competition_id === selectedCompetition;
      return matchesStatus && matchesCompetition;
    });
  }, [entries, filter, selectedCompetition]);

  const competitions = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.competition_id)))
      .map(id => entries.find(e => e.competition_id === id)?.competitions)
      .filter(Boolean);
  }, [entries]);

  const statusCounts = useMemo(() => ({
    all: entries.length,
    draft: entries.filter(e => e.status === 'draft').length,
    registered: entries.filter(e => e.status === 'registered').length,
    confirmed: entries.filter(e => e.status === 'confirmed').length,
    cancelled: entries.filter(e => e.status === 'cancelled').length,
  }), [entries]);

  return {
    filteredEntries,
    competitions,
    statusCounts,
  };
}
```

#### `src/hooks/useBulkSelection.ts`
```tsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export function useBulkSelection(entries: any[], viewMode: 'cards' | 'table') {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  const handleSelectAll = () => {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map(e => e.id)));
    }
  };

  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAllFiltered = () => {
    setSelectedEntries(new Set(entries.map(e => e.id)));
    toast.success(`${entries.length} routines selected`);
  };

  const handleClearSelection = () => {
    setSelectedEntries(new Set());
    toast.success('Selection cleared');
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (viewMode !== 'table') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && entries.length > 0) {
        e.preventDefault();
        handleSelectAllFiltered();
      }
      if (e.key === 'Escape' && selectedEntries.size > 0) {
        e.preventDefault();
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, entries, selectedEntries]);

  return {
    selectedEntries,
    handleSelectAll,
    handleSelectEntry,
    handleSelectAllFiltered,
    handleClearSelection,
  };
}
```

### Phase 2: Extract View Components (4 hours)

#### `src/components/entries/EntriesCardView.tsx`
```tsx
import { EntryCard } from './EntryCard';

interface EntriesCardViewProps {
  entries: any[];
}

export function EntriesCardView({ entries }: EntriesCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
```

#### `src/components/entries/EntryCard.tsx`
```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface EntryCardProps {
  entry: any;
}

export function EntryCard({ entry }: EntryCardProps) {
  const router = useRouter();
  const hasMusic = !!entry.music_file_url;

  return (
    <div
      onClick={() => router.push(`/dashboard/entries/${entry.id}/edit`)}
      className={`bg-white/10 backdrop-blur-md rounded-xl border p-6 hover:bg-white/20 transition-all flex flex-col cursor-pointer ${
        entry.status === 'confirmed'
          ? 'border-green-400/40'
          : entry.status === 'registered'
          ? 'border-yellow-400/40'
          : entry.status === 'cancelled'
          ? 'border-red-400/40'
          : 'border-gray-400/40'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        {entry.entry_number ? (
          <div>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-lg shadow-md">
              #{entry.entry_number}{entry.entry_suffix || ''}
            </span>
            {entry.is_late_entry && (
              <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
                LATE
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-500 text-sm">Pending Assignment</span>
        )}
        <StatusBadge status={entry.status} />
      </div>

      {/* Title */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-1">{entry.title}</h3>
        <p className="text-sm text-gray-400">
          {entry.competitions?.name} ({entry.competitions?.year})
        </p>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span>🏢</span>
          <span>{entry.studios?.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span>🎭</span>
          <span>{entry.dance_categories?.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span>👥</span>
          <span>{entry.entry_participants?.length || 0} Dancer(s)</span>
        </div>
        {entry.age_groups && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>📅</span>
            <span>{entry.age_groups.name}</span>
          </div>
        )}
      </div>

      {/* Music Status */}
      <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border ${
        hasMusic
          ? 'bg-green-500/20 border-green-400/30'
          : 'bg-yellow-500/20 border-yellow-400/30'
      }`}>
        <span className={hasMusic ? 'text-green-400' : 'text-yellow-400'}>
          {hasMusic ? '✅' : '🎵'}
        </span>
        <span className={`text-sm ${hasMusic ? 'text-green-300' : 'text-yellow-300'}`}>
          {hasMusic ? 'Music Uploaded' : 'Music Pending'}
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/dashboard/entries/${entry.id}`}
          className="text-center bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-all"
        >
          View
        </Link>
        <Link
          href={`/dashboard/entries/${entry.id}/edit`}
          className="text-center bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-sm transition-all"
        >
          Edit
        </Link>
        <Link
          href={`/dashboard/entries/${entry.id}/music`}
          className="text-center bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-sm transition-all"
        >
          🎵 Music
        </Link>
      </div>
    </div>
  );
}
```

### Phase 3: Refactored Main Component (4 hours)

#### `src/components/EntriesList.tsx` (new - 200 lines)
```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import PullToRefresh from 'react-pull-to-refresh';
import { SkeletonCard } from '@/components/Skeleton';
import { useEntries } from '@/hooks/useEntries';
import { useEntryFilters } from '@/hooks/useEntryFilters';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { EntriesCardView } from '@/components/entries/EntriesCardView';
import { EntriesTableView } from '@/components/entries/EntriesTableView';
import { EntriesFilterBar } from '@/components/entries/EntriesFilterBar';
import { BulkSelectionToolbar } from '@/components/entries/BulkSelectionToolbar';
import { EntrySummaryBar } from '@/components/entries/EntrySummaryBar';

export default function EntriesList() {
  const [filter, setFilter] = useState<'all' | 'draft' | 'registered' | 'confirmed' | 'cancelled'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Custom hooks for data and logic
  const { entries, isLoading, refetch, dataUpdatedAt, reservation, confirmedSpaces, usedSpaces, isAtLimit } =
    useEntries(selectedCompetition);

  const { filteredEntries, competitions, statusCounts } =
    useEntryFilters(entries, filter, selectedCompetition);

  const { selectedEntries, handleSelectAll, handleSelectEntry, handleSelectAllFiltered, handleClearSelection } =
    useBulkSelection(filteredEntries, viewMode);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refetch}>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">My Routines</h1>
            <p className="text-gray-400">Manage your competition routines</p>
          </div>

          <div className="flex gap-3">
            {/* Create Routine Button */}
            {isAtLimit ? (
              <div className="relative group">
                <button disabled className="bg-gray-600 text-gray-400 px-6 py-3 rounded-lg cursor-not-allowed opacity-50">
                  ➕ Create Routine
                </button>
                <div className="absolute right-0 top-full mt-2 w-64 bg-red-500/20 border border-red-400/30 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="text-xs text-red-200">
                    Space limit reached for this competition.
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href={reservation
                  ? `/dashboard/entries/create?competition=${selectedCompetition}&reservation=${reservation.id}`
                  : '/dashboard/entries/create'
                }
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
              >
                ➕ Create Routine
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <EntriesFilterBar
          filter={filter}
          setFilter={setFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          competitions={competitions}
          selectedCompetition={selectedCompetition}
          setSelectedCompetition={setSelectedCompetition}
          statusCounts={statusCounts}
          dataUpdatedAt={dataUpdatedAt}
        />

        {/* Bulk Selection Toolbar (Table Mode Only) */}
        {viewMode === 'table' && filteredEntries.length > 0 && (
          <BulkSelectionToolbar
            selectedCount={selectedEntries.size}
            totalCount={filteredEntries.length}
            onSelectAll={handleSelectAllFiltered}
            onClearSelection={handleClearSelection}
          />
        )}

        {/* Entries Grid/Table */}
        {filteredEntries.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold text-white mb-2">No routines found</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all' ? 'No routines have been created yet.' : `No ${filter} routines found.`}
            </p>
            <Link
              href="/dashboard/entries/create"
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
            >
              Create Your First Routine
            </Link>
          </div>
        ) : viewMode === 'cards' ? (
          <EntriesCardView entries={filteredEntries} />
        ) : (
          <EntriesTableView
            entries={filteredEntries}
            selectedEntries={selectedEntries}
            onSelectAll={handleSelectAll}
            onSelectEntry={handleSelectEntry}
          />
        )}

        {/* Results Count */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          Showing {filteredEntries.length} of {entries.length} routines
        </div>

        {/* Summary Bar */}
        <EntrySummaryBar
          filteredEntries={filteredEntries}
          selectedCompetition={selectedCompetition}
          competitions={competitions}
          confirmedSpaces={confirmedSpaces}
          usedSpaces={usedSpaces}
        />
      </div>
    </PullToRefresh>
  );
}
```

### Implementation Steps
1. **Phase 1** (8 hours): Extract all 4 hooks
2. **Phase 2** (4 hours): Extract view components (Card, Table, etc.)
3. **Phase 3** (4 hours): Refactor main component to use extracted pieces
4. Test thoroughly - this is a major refactor

### Impact
- **Main file reduced**: 1,316 → 200 lines (85% reduction)
- **Testable units**: Each hook and component can be tested independently
- **Reusable logic**: Hooks can be used in other entry-related views
- **Better performance**: Optimized re-renders with proper memoization

---

## Testing Checklist

### Priority 1 (Hardcoded Pricing)
- [ ] Create entries with different fees ($30, $50, $75)
- [ ] Verify summary bar shows sum of actual fees (not $50 × count)
- [ ] Test with 0 entries (should show $0.00)

### Priority 2 (StatusBadge)
- [ ] View entries with all statuses (draft, registered, confirmed, cancelled)
- [ ] View reservations with all statuses (pending, approved, rejected)
- [ ] View invoices with all statuses (DRAFT, SENT, PAID, UNPAID)
- [ ] Verify consistent styling across all pages

### Priority 3 (Modal)
- [ ] Open/close all modals with Escape key
- [ ] Verify backdrop click closes modal
- [ ] Test modal variants (default, warning, danger, success)
- [ ] Test modal sizes (sm, md, lg, xl)

### Priority 4 (EmailService)
- [ ] Approve reservation → verify approval email sent
- [ ] Reject reservation → verify rejection email sent
- [ ] Mark invoice as paid → verify payment confirmation sent
- [ ] Check logs for email errors

### Priority 5 (EntriesList Refactor)
- [ ] All existing functionality still works
- [ ] Bulk selection with keyboard shortcuts (Ctrl+A, Escape)
- [ ] Card/Table view toggle
- [ ] Filtering by status and competition
- [ ] Space usage calculations
- [ ] Pull-to-refresh

---

## Rollback Plan

If any refactoring causes issues:

1. **Git rollback**: `git revert <commit-hash>`
2. **Keep new components**: If StatusBadge or Modal works, keep it even if other parts fail
3. **Incremental adoption**: You don't have to replace all 12 status badges at once - can do 1-2 files at a time

---

## Estimated Timeline

| Priority | Duration | Complexity | Risk |
|----------|----------|------------|------|
| Priority 1 | 1 hour | Low | Low |
| Priority 2 | 4 hours | Low | Low |
| Priority 3 | 6 hours | Medium | Low |
| Priority 4 | 8 hours | Medium | Medium |
| Priority 5 | 16 hours | High | High |
| **Total** | **35 hours** | **~1 week** | **Incremental** |

---

## Success Metrics

After completing all priorities:

- [ ] **-2,400 lines** of code removed (10% reduction)
- [ ] **-800 lines** of duplication eliminated
- [ ] **Zero** policy violations (no hardcoded data)
- [ ] **100%** test coverage on new services
- [ ] **Consistent** UI patterns (badges, modals)
- [ ] **Faster** development (reusable components)
- [ ] **Easier** onboarding (smaller, focused files)

---

## Additional Recommendations (Future)

### Error Boundaries
Add error boundaries to prevent full-page crashes:
- `src/components/ErrorBoundary.tsx`
- Wrap all route components

### Performance Monitoring
- Add React DevTools Profiler
- Monitor component render counts
- Identify performance bottlenecks

### Design System Documentation
- Create Storybook for UI components
- Document StatusBadge, Modal, etc.
- Add usage examples

### E2E Testing
- Add Playwright tests for critical flows
- Test entry creation → invoice generation → payment
- Test reservation approval workflow

---

**Last Updated**: October 16, 2025
**Next Review**: After Priority 1-3 completion (check metrics)
