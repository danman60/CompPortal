# CompPortal Rebuild Plan: Entries & Pipeline Pages

**Goal:** Clean reimplementation of two core Phase 1 pages using existing backend (no router changes), focusing on proper business logic hookup and consistent UX patterns.

**Scope:** Feature parity with current pages, NOT feature additions.

---

## 1. Analysis Summary

### Backend (Reusable - No Changes)
- **Routers:** `entry.ts`, `reservation.ts`, `summary.ts`, `lookup.ts` - All production-ready
- **Schema:** Prisma models validated and indexed properly
- **Services:** `capacityService` with atomic transactions + ledger
- **Business Logic:** Defined in `docs/specs/PHASE1_SPEC.md`

### Current Frontend Issues (To Fix)
1. **Scattered state management** - Multiple hooks doing similar things
2. **Inconsistent patterns** - Different components handle same data differently
3. **Complex component trees** - Deep nesting, hard to follow data flow
4. **Mixed concerns** - UI logic + business logic + data fetching in same files
5. **Patched fixes** - Accumulated workarounds over multiple sessions

---

## 2. Rebuild Architecture

### File Structure
```
src/
├── app/
│   └── dashboard/
│       ├── entries-rebuild/
│       │   ├── page.tsx                    # Route wrapper (auth check)
│       │   └── create/
│       │       └── page.tsx                # Create routine route
│       └── reservation-pipeline-rebuild/
│           └── page.tsx                    # Route wrapper (auth check)
│
├── components/rebuild/
│   ├── entries/
│   │   ├── EntriesPageContainer.tsx        # Main container with data fetching
│   │   ├── EntriesHeader.tsx               # Header + action buttons
│   │   ├── EntriesFilters.tsx              # Reservation selector + view toggle
│   │   ├── RoutineCardList.tsx             # Card view grid
│   │   ├── RoutineCard.tsx                 # Single routine card
│   │   ├── RoutineTable.tsx                # Table view
│   │   ├── LiveSummaryBar.tsx              # Bottom summary bar
│   │   ├── SubmitSummaryModal.tsx          # Summary submission modal
│   │   └── CreateRoutineFlow.tsx           # Multi-step form (uses existing UnifiedRoutineForm)
│   │
│   ├── pipeline/
│   │   ├── PipelinePageContainer.tsx       # Main container with data fetching
│   │   ├── PipelineHeader.tsx              # Header + back button
│   │   ├── PipelineFilters.tsx             # Event dropdown + status tabs
│   │   ├── ReservationsTable.tsx           # Main table component
│   │   ├── ReservationRow.tsx              # Single table row
│   │   ├── ApproveReservationModal.tsx     # Approval modal
│   │   ├── RejectReservationModal.tsx      # Rejection modal
│   │   └── CreateInvoiceModal.tsx          # Invoice creation modal
│   │
│   └── ui/                                  # Shared components
│       ├── Card.tsx                         # Glassmorphic card base
│       ├── Badge.tsx                        # Status badges
│       ├── Button.tsx                       # Button variants
│       ├── Table.tsx                        # Table base
│       ├── Modal.tsx                        # Modal base
│       ├── Dropdown.tsx                     # Select dropdown
│       └── ProgressBar.tsx                  # Capacity visualization
│
└── hooks/rebuild/
    ├── useEntries.ts                        # Entries data + mutations
    ├── useReservations.ts                   # Reservations data + mutations
    ├── useEntriesFilters.ts                 # Client-side filtering/sorting
    └── usePipelineFilters.ts                # Pipeline filtering logic
```

---

## 3. Component Specifications

### A. Entries Page (`/dashboard/entries-rebuild`)

#### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│ EntriesHeader                                       │
│ [← Back to Dashboard]                               │
│ My Routines                                         │
│ [Assign Dancers] [Import] [Export] [Create Routine] │
├─────────────────────────────────────────────────────┤
│ EntriesFilters                                      │
│ Reservation: [EMPWR Dance - St. Catharines #1 ▼]   │
│ View: [🎴 Cards] [📊 Table]                         │
├─────────────────────────────────────────────────────┤
│ RoutineCardList (if card view)                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│ │ RoutineCard │ │ RoutineCard │ │ RoutineCard │   │
│ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                      │
│ OR                                                   │
│                                                      │
│ RoutineTable (if table view)                        │
│ [# | Title | Category | Size | Age | Fee | Actions] │
├─────────────────────────────────────────────────────┤
│ LiveSummaryBar                                      │
│ ✅ 2 Created | 💰 $230 Est. | 🎪 EMPWR Dance #1    │
│                              [📤 Submit Summary]    │
└─────────────────────────────────────────────────────┘
```

#### Data Flow
```tsx
EntriesPageContainer
  ├─ useEntries()
  │   └─ trpc.entry.getAll.useQuery()
  │   └─ trpc.entry.submitSummary.useMutation()
  │   └─ trpc.entry.delete.useMutation()
  │
  ├─ useReservations()
  │   └─ trpc.reservation.getAll.useQuery({ status: 'approved' | 'summarized' })
  │
  ├─ useEntriesFilters(entries, reservations)
  │   └─ selectedReservation state
  │   └─ viewMode state ('card' | 'table')
  │   └─ filteredEntries (client-side filter by reservation_id)
  │
  └─ Render children with props
```

#### Components

**EntriesPageContainer.tsx**
```tsx
export function EntriesPageContainer() {
  const { entries, isLoading, submitSummary, deleteEntry } = useEntries();
  const { reservations } = useReservations();
  const {
    selectedReservation,
    setSelectedReservation,
    viewMode,
    setViewMode,
    filteredEntries
  } = useEntriesFilters(entries, reservations);

  const summaryData = useMemo(() => {
    const created = filteredEntries.length;
    const estimatedTotal = filteredEntries.reduce((sum, e) => sum + (e.total_fee || 0), 0);
    const confirmedSpaces = selectedReservation?.spaces_confirmed || 0;

    return { created, estimatedTotal, confirmedSpaces };
  }, [filteredEntries, selectedReservation]);

  return (
    <>
      <EntriesHeader />
      <EntriesFilters
        reservations={reservations}
        selectedReservation={selectedReservation}
        onReservationChange={setSelectedReservation}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isLoading ? <LoadingState /> : (
        viewMode === 'card' ? (
          <RoutineCardList entries={filteredEntries} onDelete={deleteEntry} />
        ) : (
          <RoutineTable entries={filteredEntries} onDelete={deleteEntry} />
        )
      )}

      <LiveSummaryBar
        created={summaryData.created}
        estimatedTotal={summaryData.estimatedTotal}
        confirmedSpaces={summaryData.confirmedSpaces}
        reservation={selectedReservation}
        onSubmitSummary={submitSummary}
      />
    </>
  );
}
```

**RoutineCard.tsx**
```tsx
interface RoutineCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
}

export function RoutineCard({ entry, onDelete }: RoutineCardProps) {
  return (
    <Card className="glassmorphic">
      <Badge status={entry.status} />
      <div className="text-3xl font-bold">{entry.entry_number}</div>
      <h3>{entry.title}</h3>

      <div className="metadata">
        <div>🏢 {entry.studios?.name}</div>
        <div>🎭 {entry.dance_categories?.name}</div>
        <div>👥 {entry.entry_size_categories?.name}</div>
        <div>📅 {entry.age_groups?.name}</div>
      </div>

      <div className="dancers">
        {entry.entry_participants?.map(p => (
          <div key={p.id}>• {p.dancer_name}</div>
        ))}
      </div>

      <div className="music-status">
        {entry.music_file_url ? '🎵 Music Uploaded' : '🎵 Music Pending'}
      </div>

      <div className="actions">
        <Button href={`/dashboard/entries/${entry.id}`}>View</Button>
        <Button href={`/dashboard/entries/${entry.id}/edit`}>Edit</Button>
        <Button href={`/dashboard/entries/${entry.id}/music`}>🎵 Music</Button>
      </div>
    </Card>
  );
}
```

**LiveSummaryBar.tsx**
```tsx
interface LiveSummaryBarProps {
  created: number;
  estimatedTotal: number;
  confirmedSpaces: number;
  reservation: Reservation | null;
  onSubmitSummary: (reservationId: string) => Promise<void>;
}

export function LiveSummaryBar({
  created,
  estimatedTotal,
  confirmedSpaces,
  reservation,
  onSubmitSummary
}: LiveSummaryBarProps) {
  const [showModal, setShowModal] = useState(false);
  const isIncomplete = created < confirmedSpaces;
  const isClosed = reservation?.is_closed;

  const handleSubmit = () => {
    if (isIncomplete) {
      setShowModal(true); // Show warning modal
    } else {
      onSubmitSummary(reservation!.id);
    }
  };

  return (
    <div className="fixed bottom-0 glassmorphic">
      <div className="stats">
        <div>✅ {created} Created</div>
        <div>💰 ${estimatedTotal.toFixed(2)} Est.</div>
        <div>🎪 {reservation?.competitions?.name}</div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isClosed || created === 0}
        variant="primary"
      >
        📤 Submit Summary
      </Button>

      {showModal && (
        <SubmitSummaryModal
          created={created}
          confirmedSpaces={confirmedSpaces}
          onConfirm={() => onSubmitSummary(reservation!.id)}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
```

---

### B. Pipeline Page (`/dashboard/reservation-pipeline-rebuild`)

#### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│ PipelineHeader                                      │
│ [← Back to Dashboard]                               │
│ 🎯 Reservation Pipeline                             │
├─────────────────────────────────────────────────────┤
│ PipelineFilters                                     │
│ Filter by Event: [All Events (4 reservations) ▼]   │
│                                                      │
│ [All (4)] [Pending (1)] [Approved (2)] [Invoiced (1)]│
├─────────────────────────────────────────────────────┤
│ ReservationsTable                                   │
│ ┌────┬────────┬──────────┬─────┬────────┬──────────┐│
│ │Stu │Event   │Requested│Rout.│Status  │Actions   ││
│ ├────┼────────┼──────────┼─────┼────────┼──────────┤│
│ │ABC │St.Cath │100      │0    │pending │[Approve] ││
│ │XYZ │London  │75       │68   │approved│[Summary] ││
│ │123 │Toronto │50       │50   │summary │[Invoice] ││
│ └────┴────────┴──────────┴─────┴────────┴──────────┘│
└─────────────────────────────────────────────────────┘
```

#### Data Flow
```tsx
PipelinePageContainer
  ├─ useReservations()
  │   └─ trpc.reservation.getPipelineView.useQuery()
  │   └─ trpc.reservation.approve.useMutation()
  │   └─ trpc.reservation.reject.useMutation()
  │   └─ trpc.invoice.createFromReservation.useMutation()
  │
  ├─ usePipelineFilters(reservations)
  │   └─ eventFilter state
  │   └─ statusFilter state
  │   └─ filteredReservations (client-side filter)
  │   └─ statusCounts (for tab badges)
  │
  └─ Render children with props
```

#### Components

**PipelinePageContainer.tsx**
```tsx
export function PipelinePageContainer() {
  const {
    reservations,
    isLoading,
    approve,
    reject,
    createInvoice
  } = useReservations();

  const {
    eventFilter,
    setEventFilter,
    statusFilter,
    setStatusFilter,
    filteredReservations,
    statusCounts,
    events
  } = usePipelineFilters(reservations);

  return (
    <>
      <PipelineHeader />

      <PipelineFilters
        events={events}
        eventFilter={eventFilter}
        onEventFilterChange={setEventFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
      />

      {isLoading ? <LoadingState /> : (
        <ReservationsTable
          reservations={filteredReservations}
          onApprove={approve}
          onReject={reject}
          onCreateInvoice={createInvoice}
        />
      )}
    </>
  );
}
```

**PipelineFilters.tsx**
```tsx
interface PipelineFiltersProps {
  events: Event[];
  eventFilter: string; // 'all' or competitionId
  onEventFilterChange: (eventId: string) => void;
  statusFilter: PipelineStatus;
  onStatusFilterChange: (status: PipelineStatus) => void;
  statusCounts: Record<PipelineStatus, number>;
}

export function PipelineFilters({
  events,
  eventFilter,
  onEventFilterChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts
}: PipelineFiltersProps) {
  const totalReservations = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <Dropdown
        value={eventFilter}
        onChange={onEventFilterChange}
        label="Filter by Event"
      >
        <option value="all">All Events ({totalReservations} reservations)</option>
        {events.map(event => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </Dropdown>

      <div className="status-tabs">
        <Button
          variant={statusFilter === 'all' ? 'primary' : 'ghost'}
          onClick={() => onStatusFilterChange('all')}
        >
          All ({statusCounts.all})
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'primary' : 'ghost'}
          onClick={() => onStatusFilterChange('pending')}
        >
          Pending Reservation ({statusCounts.pending})
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'primary' : 'ghost'}
          onClick={() => onStatusFilterChange('approved')}
        >
          Pending Routine Creation ({statusCounts.approved})
        </Button>
        <Button
          variant={statusFilter === 'summary_in' ? 'primary' : 'ghost'}
          onClick={() => onStatusFilterChange('summary_in')}
        >
          Pending Invoice ({statusCounts.summary_in})
        </Button>
        <Button
          variant={statusFilter === 'invoiced' ? 'primary' : 'ghost'}
          onClick={() => onStatusFilterChange('invoiced')}
        >
          Invoiced ({statusCounts.invoiced})
        </Button>
        <Button
          variant={statusFilter === 'paid' ? 'primary' : 'ghost'}
          onClick={() => onStatusFilterChange('paid')}
        >
          Paid ({statusCounts.paid})
        </Button>
      </div>
    </>
  );
}
```

**ReservationRow.tsx**
```tsx
interface ReservationRowProps {
  reservation: PipelineReservation;
  onApprove: (reservationId: string, spaces: number) => void;
  onReject: (reservationId: string, reason: string) => void;
  onCreateInvoice: (reservationId: string) => void;
}

export function ReservationRow({
  reservation,
  onApprove,
  onReject,
  onCreateInvoice
}: ReservationRowProps) {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const renderAction = () => {
    if (reservation.status === 'pending') {
      return (
        <Button onClick={() => setShowApprovalModal(true)}>
          Approve/Reject
        </Button>
      );
    }

    if (reservation.status === 'approved' && reservation.entryCount === 0) {
      return <Badge>Awaiting Routines</Badge>;
    }

    if (reservation.status === 'approved' && reservation.entryCount > 0) {
      return (
        <Button onClick={() => onCreateInvoice(reservation.id)}>
          Create Invoice
        </Button>
      );
    }

    if (reservation.invoiceId && !reservation.invoicePaid) {
      return (
        <Button href={`/dashboard/invoices/${reservation.studioId}/${reservation.competitionId}`}>
          View Invoice
        </Button>
      );
    }

    if (reservation.invoicePaid) {
      return <Badge variant="success">✓ Paid</Badge>;
    }

    return null;
  };

  return (
    <>
      <tr>
        <td>{reservation.studioName}</td>
        <td>{reservation.competitionName}</td>
        <td>{reservation.spacesRequested}</td>
        <td>{reservation.entryCount}</td>
        <td><Badge status={reservation.status} /></td>
        <td>{renderAction()}</td>
      </tr>

      {showApprovalModal && (
        <ApproveReservationModal
          reservation={reservation}
          onApprove={(spaces) => {
            onApprove(reservation.id, spaces);
            setShowApprovalModal(false);
          }}
          onReject={() => setShowRejectModal(true)}
          onClose={() => setShowApprovalModal(false)}
        />
      )}

      {showRejectModal && (
        <RejectReservationModal
          reservation={reservation}
          onReject={(reason) => {
            onReject(reservation.id, reason);
            setShowRejectModal(false);
          }}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
}
```

---

## 4. Shared UI Components

### Card.tsx
```tsx
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
      ${className}
    `}>
      {children}
    </div>
  );
}
```

### Badge.tsx
```tsx
interface BadgeProps {
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending' | 'summarized' | 'invoiced' | 'closed';
  variant?: 'success' | 'warning' | 'error' | 'info';
  children?: React.ReactNode;
}

export function Badge({ status, variant, children }: BadgeProps) {
  const getColorClass = () => {
    if (status === 'draft') return 'bg-gray-500/20 text-gray-300';
    if (status === 'submitted') return 'bg-blue-500/20 text-blue-300';
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
      ${getColorClass()}
    `}>
      {children || status}
    </span>
  );
}
```

### Button.tsx
```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  variant = 'secondary',
  onClick,
  href,
  disabled = false,
  className = ''
}: ButtonProps) {
  const baseClass = `
    px-4 py-2
    rounded-lg
    font-medium
    transition-all
    duration-200
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const variantClass = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
    ghost: 'text-white hover:bg-white/10'
  }[variant];

  const Component = href ? 'a' : 'button';

  return (
    <Component
      className={`${baseClass} ${variantClass} ${className}`}
      onClick={!disabled ? onClick : undefined}
      href={href}
      disabled={disabled}
    >
      {children}
    </Component>
  );
}
```

---

## 5. Hooks Implementation

### useEntries.ts
```tsx
export function useEntries(reservationId?: string) {
  const { data, isLoading, refetch } = trpc.entry.getAll.useQuery({
    reservationId,
  });

  const deleteMutation = trpc.entry.delete.useMutation({
    onSuccess: () => {
      toast.success('Routine deleted');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
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
  };
}
```

### useReservations.ts
```tsx
export function useReservations(filters?: { studioId?: string; competitionId?: string; status?: string }) {
  const { data, isLoading, refetch } = trpc.reservation.getAll.useQuery(filters || {});

  return {
    reservations: data?.reservations || [],
    isLoading,
    refetch,
  };
}

export function usePipelineReservations() {
  const { data, isLoading, refetch } = trpc.reservation.getPipelineView.useQuery();
  const { refetch: refetchCompetitions } = trpc.competition.getAll.useQuery();

  const approveMutation = trpc.reservation.approve.useMutation({
    onSuccess: () => {
      toast.success('Reservation approved!');
      refetch();
      refetchCompetitions(); // Update capacity
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
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
      toast.success('Invoice created!');
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
  };
}
```

### useEntriesFilters.ts
```tsx
export function useEntriesFilters(
  entries: Entry[],
  reservations: Reservation[]
) {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Auto-select first approved reservation if none selected
  useEffect(() => {
    if (!selectedReservationId && reservations.length > 0) {
      const firstApproved = reservations.find(r => r.status === 'approved');
      if (firstApproved) {
        setSelectedReservationId(firstApproved.id);
      }
    }
  }, [reservations, selectedReservationId]);

  const selectedReservation = reservations.find(r => r.id === selectedReservationId) || null;

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
  };
}
```

### usePipelineFilters.ts
```tsx
export type PipelineStatus = 'all' | 'pending' | 'approved' | 'summary_in' | 'invoiced' | 'paid';

export function usePipelineFilters(reservations: PipelineReservation[]) {
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<PipelineStatus>('all');

  const events = useMemo(() => {
    const uniqueEvents = new Map();
    reservations.forEach(r => {
      if (!uniqueEvents.has(r.competitionId)) {
        uniqueEvents.set(r.competitionId, {
          id: r.competitionId,
          name: r.competitionName,
        });
      }
    });
    return Array.from(uniqueEvents.values());
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    let result = reservations;

    // Event filter
    if (eventFilter !== 'all') {
      result = result.filter(r => r.competitionId === eventFilter);
    }

    // Status filter
    if (statusFilter === 'pending') {
      result = result.filter(r => r.status === 'pending');
    } else if (statusFilter === 'approved') {
      result = result.filter(r => r.status === 'approved' && r.entryCount === 0 && !r.invoiceId);
    } else if (statusFilter === 'summary_in') {
      result = result.filter(r => r.status === 'approved' && r.entryCount > 0 && !r.invoiceId);
    } else if (statusFilter === 'invoiced') {
      result = result.filter(r => r.invoiceId && !r.invoicePaid);
    } else if (statusFilter === 'paid') {
      result = result.filter(r => r.invoicePaid);
    }

    return result;
  }, [reservations, eventFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: reservations.length,
      pending: reservations.filter(r => r.status === 'pending').length,
      approved: reservations.filter(r => r.status === 'approved' && r.entryCount === 0 && !r.invoiceId).length,
      summary_in: reservations.filter(r => r.status === 'approved' && r.entryCount > 0 && !r.invoiceId).length,
      invoiced: reservations.filter(r => r.invoiceId && !r.invoicePaid).length,
      paid: reservations.filter(r => r.invoicePaid).length,
    };
  }, [reservations]);

  return {
    eventFilter,
    setEventFilter,
    statusFilter,
    setStatusFilter,
    filteredReservations,
    statusCounts,
    events,
  };
}
```

---

## 6. Implementation Phases

### Week 1: Foundation
- [ ] Create shared UI components (Card, Badge, Button, Table, Modal, Dropdown)
- [ ] Create hooks (useEntries, useReservations, useEntriesFilters, usePipelineFilters)
- [ ] Set up routes (`/dashboard/entries-rebuild`, `/dashboard/reservation-pipeline-rebuild`)
- [ ] Test glassmorphic design system consistency

### Week 2: Entries Page
- [ ] EntriesPageContainer with data fetching
- [ ] EntriesHeader + EntriesFilters
- [ ] RoutineCard component
- [ ] RoutineCardList grid layout
- [ ] RoutineTable component
- [ ] LiveSummaryBar
- [ ] SubmitSummaryModal (with incomplete warning)

### Week 3: Pipeline Page
- [ ] PipelinePageContainer with data fetching
- [ ] PipelineHeader + PipelineFilters
- [ ] ReservationsTable
- [ ] ReservationRow with action logic
- [ ] ApproveReservationModal
- [ ] RejectReservationModal
- [ ] CreateInvoiceModal

### Week 4: Routine Creation
- [ ] Reuse existing UnifiedRoutineForm
- [ ] Wrap in CreateRoutineFlow container
- [ ] Wire up to rebuild hooks
- [ ] Test multi-step validation

### Week 5: Polish & Testing
- [ ] Mobile responsiveness
- [ ] Keyboard navigation
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] User acceptance testing

---

## 7. Migration Strategy

### Testing Phase
1. Deploy rebuild pages to production at new routes
2. Internal testing (SA + CD roles)
3. Collect feedback
4. Iterate on UX

### Cutover Phase
1. Update navigation links to point to rebuild pages
2. Add redirect from old routes to new routes
3. Monitor for errors
4. Archive old components

### Rollback Plan
If critical issues found:
1. Revert navigation links
2. Remove redirects
3. Keep rebuild pages accessible for debugging

---

## 8. Success Criteria

### Functional
- [ ] All existing features work (create, edit, delete, submit summary)
- [ ] Proper business logic (capacity deduction/refund, status transitions)
- [ ] No regressions in backend mutations

### UX
- [ ] Consistent glassmorphic design
- [ ] Clear action hierarchy
- [ ] Intuitive navigation
- [ ] Responsive on mobile/tablet

### Code Quality
- [ ] Single responsibility components
- [ ] Clear data flow (Container → Hooks → UI)
- [ ] Reusable shared components
- [ ] No duplicated logic

---

## 9. Key Differences from Current Implementation

### What's Better
✅ **Separation of concerns** - Data fetching in containers, presentation in components
✅ **Consistent patterns** - All pages follow same Container → Filters → List → Bar structure
✅ **Shared components** - UI primitives reused across both pages
✅ **Cleaner state management** - Hooks handle single responsibility
✅ **No feature creep** - Exact parity with existing functionality

### What's the Same
✅ **Backend routers** - Zero changes to tRPC endpoints
✅ **Database schema** - No migrations needed
✅ **Business logic** - Follows Phase 1 spec exactly
✅ **Design system** - Glassmorphic purple/indigo gradients

---

**Ready to build.** ✅
