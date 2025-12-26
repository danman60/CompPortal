# Component Trees Documentation

**Purpose:** Document component hierarchies, prop flow, and state origins for key features.
**Token cost:** ~3k tokens. Load when editing specific features.

---

## Table of Contents

1. [Schedule V2](#schedule-v2)
2. [Invoice System](#invoice-system)
3. [Entry Management](#entry-management)

---

## 1. Schedule V2

**Entry point:** `src/app/dashboard/director-panel/schedule-v2/page.tsx`
**Key state:** scheduleOrder, pendingChanges, selectedDay, selectedRoutineIds

### Component Hierarchy

```
ScheduleV2Page (page.tsx)
├── State: scheduleOrder[], pendingChanges, selectedDay, versionHistory
├── Queries: trpc.scheduling.getAllRoutines, trpc.scheduling.getScheduleBlocks
├── Mutations: saveSchedule, saveScheduleBlocks
│
├── DndContext (drag-and-drop provider)
│   │
│   ├── Top Bar (inline JSX)
│   │   ├── DayTabs (DayTabs.tsx)
│   │   │   └── Props: selectedDay, onDayChange, performanceDates
│   │   ├── StatusBadge (StatusBadge.tsx)
│   │   │   └── Props: hasUnsavedChanges
│   │   ├── ActionsDropdown (ActionsDropdown.tsx)
│   │   │   └── Props: onRefresh, onExportPDF, onSaveAndEmail, etc.
│   │   └── DraggableBlockCard (inline)
│   │       └── Props: type ('award'|'break'|'event'), onClick
│   │
│   ├── Left Panel - RoutinePool (RoutinePool.tsx)
│   │   ├── Props: routines (unscheduled), filters, onFiltersChange
│   │   ├── Local State: viewMode (table|cards)
│   │   │
│   │   └── RoutineCard (RoutineCard.tsx)
│   │       └── Props: routine, viewMode, isSelected, onToggleSelection
│   │
│   └── Right Panel - ScheduleTable (ScheduleTable.tsx)
│       ├── Props: routines (scheduled), selectedDate, viewMode, conflicts
│       ├── Local State: none (stateless display)
│       │
│       └── SortableItem (inline)
│           └── Props: id, routine data, conflict info
│
├── Modals
│   ├── ScheduleBlockModal (for break/award/event)
│   ├── SendToStudiosModal
│   ├── ManageStudioVisibilityModal
│   ├── AssignStudioCodesModal
│   ├── ResetAllConfirmationModal
│   └── StudioNoteModal (SD notes viewing)
│
└── DragOverlay (preview during drag)
```

### Prop Origins

| Prop | Defined In | Type | Notes |
|------|-----------|------|-------|
| `scheduleOrder` | page.tsx:~200 | `ScheduleItem[]` | Array of {id, type} for ordering |
| `selectedDay` | page.tsx:~180 | `string` | ISO date format "YYYY-MM-DD" |
| `pendingChanges` | page.tsx:~190 | `Map<string, Change>` | Tracks unsaved modifications |
| `viewMode` | page.tsx:~170 | `ViewMode` | 'cd'|'studio'|'judge'|'public' |
| `conflicts` | Derived | `Conflict[]` | Calculated from dancer overlap |
| `trophyHelperRoutines` | Derived | `string[]` | Last routine per Overalls category |

### Key Handlers

| Handler | Location | Effect |
|---------|----------|--------|
| `handleDragEnd` | page.tsx:~400 | Reorders scheduleOrder[], marks unsaved |
| `handleSave` | page.tsx:~500 | Calls saveSchedule mutation with full order |
| `handleReset` | page.tsx:~550 | Clears scheduleOrder for day/all |
| `handleAutoFixConflict` | page.tsx:~600 | Moves routine to minimize conflicts |
| `handleVersionRestore` | page.tsx:~650 | Restores from versionHistory |

### State Flow

```
[User drags routine from pool to schedule]
    ↓
handleDragEnd(event)
    ↓
setScheduleOrder(prev => [...prev, newItem])
    ↓
hasUnsavedChanges becomes true (derived from pendingChanges)
    ↓
Save button enables, StatusBadge shows "Unsaved"
    ↓
[User clicks Save]
    ↓
saveScheduleMutation.mutate({ entries, blocks })
    ↓
[On success]
    ↓
versionHistory.push(previousState)  // For undo
refetch()                            // Refresh from server
```

### Files That Change Together

When modifying scheduling:
1. `src/app/dashboard/director-panel/schedule-v2/page.tsx` - Main logic
2. `src/components/scheduling/ScheduleTable.tsx` - Table display
3. `src/components/scheduling/RoutinePool.tsx` - Unscheduled pool
4. `src/server/routers/scheduling.ts` - Backend procedures
5. `src/lib/conflictAutoFix.ts` - Conflict resolution logic

---

## 2. Invoice System

**Entry point:** `src/components/InvoiceDetail.tsx`
**Key state:** invoice data from tRPC, local discount input

### Component Hierarchy

```
InvoiceDetail (InvoiceDetail.tsx)
├── State: customDiscountInput, showCreditModal
├── Queries: trpc.invoice.getInvoice, trpc.invoice.getPaymentHistory
├── Mutations: applyStudioDiscount, recordPayment, voidInvoice
│
├── Invoice Header
│   ├── Invoice number, status badge
│   ├── Studio info, competition info
│   └── Dates (created, due)
│
├── Line Items Table
│   ├── Entry fees (from competition_entries)
│   ├── Title fees
│   ├── Production fees
│   └── Sub-totals per category
│
├── Discount Section (CD only)
│   ├── Custom discount input (0-100%)
│   ├── Apply/Clear buttons
│   └── "Other Credits" button → CreditModal
│
├── Totals Section
│   ├── Subtotal
│   ├── Discount amount
│   ├── Credits
│   ├── Tax (if applicable)
│   └── Balance due
│
└── Actions
    ├── Record Payment button → PaymentModal
    ├── View Payment History
    ├── Void Invoice (with confirmation)
    └── Download PDF
```

### Key Handlers

| Handler | Location | Effect |
|---------|----------|--------|
| `handleApplyDiscount` | InvoiceDetail:~500 | Calls applyStudioDiscount mutation |
| `handleRecordPayment` | InvoiceDetail:~600 | Opens PaymentModal, calls recordPayment |
| `handleVoidInvoice` | InvoiceDetail:~700 | Voids invoice (status → 'voided') |

### Files That Change Together

When modifying invoicing:
1. `src/components/InvoiceDetail.tsx` - Main component
2. `src/server/routers/invoice.ts` - Backend procedures
3. `src/lib/invoiceCalculations.ts` - Fee calculations
4. Database: `invoices`, `invoice_payments`, `invoice_line_items`

---

## 3. Entry Management

**Entry point:** `src/app/dashboard/entries/page.tsx`
**Key state:** entries from tRPC, selection state

### Component Hierarchy

```
EntriesPage (page.tsx)
├── Queries: trpc.entry.getStudioEntries
│
├── EntriesTable (EntriesTable.tsx)
│   ├── Props: entries, onEdit, onDelete
│   ├── Sorting: entryNumber, title, category, dancers
│   │
│   └── Row Components
│       ├── Entry number
│       ├── Title
│       ├── Category/Classification badges
│       ├── Dancer names (truncated)
│       ├── Duration
│       └── Action buttons (Edit, Delete)
│
├── EntryCreateFormV2 (for new entries)
│   ├── Props: competitionId, onSuccess
│   ├── State: form values, selected dancers
│   │
│   ├── Routine details (title, category, classification)
│   ├── Dancer selection (multi-select)
│   ├── Extended time toggle
│   └── Special requests section
│
└── EntryEditModal (for editing)
    └── Same fields as create, pre-populated
```

### Key Handlers

| Handler | Location | Effect |
|---------|----------|--------|
| `handleCreateEntry` | EntryCreateFormV2:~200 | Calls createEntry mutation |
| `handleUpdateEntry` | EntryEditModal:~150 | Calls updateEntry mutation |
| `handleDeleteEntry` | EntriesTable:~100 | Soft delete (status='cancelled') |

### Files That Change Together

When modifying entries:
1. `src/app/dashboard/entries/page.tsx` - Page wrapper
2. `src/components/EntryCreateFormV2.tsx` - Create form
3. `src/components/EntriesTable.tsx` - Table display
4. `src/server/routers/entry.ts` - Backend procedures
5. Database: `competition_entries`, `entry_participants`
6. Triggers: `update_dancer_names` (auto-updates dancer_names array)

---

## Quick Reference: Prop Tracing

When debugging "where does this prop come from?":

1. **Check component definition** for prop type
2. **Search parent component** for prop name in JSX
3. **Trace to state/query** - usually `useState`, `useMemo`, or tRPC query
4. **Check derived values** - often computed in `useMemo`

**Common patterns:**
- `routines` → from `trpc.*.getRoutines.data`
- `on*` handlers → defined in parent, passed down
- `selected*` → local useState in nearest parent
- `conflicts` → derived in useMemo from dancer overlap

---

*Last updated: December 25, 2025*
