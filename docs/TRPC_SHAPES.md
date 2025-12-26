# tRPC Response Shapes Documentation

**Purpose:** Document actual response shapes for key tRPC procedures to speed up UI development.
**Token cost:** ~3k tokens. Load when building UI against tRPC queries.

---

## Table of Contents

1. [Scheduling Router](#scheduling-router)
2. [Invoice Router](#invoice-router)
3. [Entry Router](#entry-router)
4. [Reservation Router](#reservation-router)
5. [Common Patterns](#common-patterns)

---

## 1. Scheduling Router

**File:** `src/server/routers/scheduling.ts`

### Procedure: getAllRoutines

**Type:** query
**Input:**
```typescript
{
  competitionId: string;  // Required
}
```

**Output:**
```typescript
Array<{
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  studioCode: string;               // e.g., "ADA" for short codes
  classificationId: string;
  classificationName: string;       // e.g., "Sapphire", "Crystal"
  categoryId: string;
  categoryName: string;             // e.g., "Jazz", "Contemporary"
  ageGroupId: string;
  ageGroupName: string;             // e.g., "Junior", "Teen"
  entrySizeId: string;
  entrySizeName: string;            // e.g., "Solo", "Duo/Trio", "Group"
  duration: number;                 // In SECONDS (default 180 for 3min)
  entryNumber: number | null;       // Assigned entry number
  scheduledDay: string | null;      // ISO date "YYYY-MM-DD"
  scheduledTimeString: string | null; // "HH:MM:SS" format
  routineAge: number | null;        // Calculated age for routine
  has_studio_requests: boolean;     // SD notes indicator
  scheduling_notes: string | null;  // SD notes text
  dancer_names: string[];           // Array of dancer names
  participants: Array<{
    dancerId: string;
    dancerName: string;
  }>;
}>
```

**Notes:**
- `duration` is in SECONDS, not minutes
- `scheduledDay` is null for unscheduled routines
- Use `dancer_names` for display (trigger-maintained array)
- `participants` has full dancer info for conflict detection

---

### Procedure: getScheduleBlocks

**Type:** query
**Input:**
```typescript
{
  competitionId: string;
  performanceDate?: string;  // Optional filter by date
}
```

**Output:**
```typescript
Array<{
  id: string;
  block_type: 'break' | 'award' | 'event' | 'adjudication';
  title: string;
  duration_minutes: number;         // In MINUTES (not seconds!)
  scheduled_time: string | null;    // ISO datetime
  sort_order: number | null;        // Position in schedule
  performance_date: string | null;  // ISO date
}>
```

**Notes:**
- Block durations are in MINUTES (unlike routine durations in seconds)
- `adjudication` is legacy, prefer `award` for new blocks

---

### Procedure: saveSchedule

**Type:** mutation
**Input:**
```typescript
{
  competitionId: string;
  performanceDate: string;          // ISO date
  entries: Array<{
    id: string;
    entryNumber: number;
  }>;
}
```

**Output:**
```typescript
{
  success: boolean;
  savedCount: number;
}
```

---

## 2. Invoice Router

**File:** `src/server/routers/invoice.ts`

### Procedure: getInvoice

**Type:** query
**Input:**
```typescript
{
  invoiceId: string;
}
```

**Output:**
```typescript
{
  id: string;
  invoiceNumber: string;            // e.g., "INV-2026-EMPWR-001"
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'voided' | 'overdue';
  studioId: string;
  studioName: string;
  competitionId: string;
  competitionName: string;

  // Amounts (all in cents for precision)
  subtotal: number;
  discountPercent: number;          // 0-100
  discountAmount: number;           // Calculated
  creditAmount: number;             // Manual credits
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;

  // Dates
  createdAt: string;                // ISO datetime
  dueDate: string;                  // ISO datetime
  paidAt: string | null;

  // Line items
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;              // In cents
    totalPrice: number;
    category: 'entry_fee' | 'title_fee' | 'production_fee' | 'other';
  }>;

  // Payment history
  payments: Array<{
    id: string;
    amount: number;
    method: 'cash' | 'check' | 'credit_card' | 'e_transfer' | 'other';
    reference: string | null;
    recordedAt: string;
    recordedBy: string;
  }>;
}
```

**Notes:**
- All monetary values in CENTS (divide by 100 for display)
- `balanceDue` = `totalAmount - paidAmount`
- `discountAmount` = `subtotal * discountPercent / 100`

---

### Procedure: applyStudioDiscount

**Type:** mutation
**Input:**
```typescript
{
  invoiceId: string;
  discountPercentage: number;       // 0-100
}
```

**Output:**
```typescript
{
  success: boolean;
  newTotal: number;
  discountAmount: number;
}
```

---

## 3. Entry Router

**File:** `src/server/routers/entry.ts`

### Procedure: getStudioEntries

**Type:** query
**Input:**
```typescript
{
  studioId: string;
  competitionId: string;
}
```

**Output:**
```typescript
Array<{
  id: string;
  entryNumber: number;
  title: string;
  status: 'draft' | 'submitted' | 'approved' | 'cancelled';

  // Classification
  classificationId: string;
  classificationName: string;

  // Category
  categoryId: string;
  categoryName: string;

  // Age group
  ageGroupId: string;
  ageGroupName: string;

  // Entry size
  entrySizeId: string;
  entrySizeName: string;

  // Duration (extended time)
  duration: number | null;              // Custom duration in SECONDS
  routine_length_minutes: number | null;
  routine_length_seconds: number | null;
  extended_time_requested: boolean;

  // Dancers
  dancer_names: string[];               // From trigger
  participantCount: number;

  // Fees
  entryFee: number;                     // In cents

  // Metadata
  createdAt: string;
  updatedAt: string;
}>
```

---

### Procedure: createEntry

**Type:** mutation
**Input:**
```typescript
{
  competitionId: string;
  studioId: string;
  title: string;
  classificationId: string;
  categoryId: string;
  ageGroupId: string;
  entrySizeId: string;
  dancerIds: string[];                  // Array of dancer UUIDs
  extended_time_requested?: boolean;
  routine_length_minutes?: number;
  routine_length_seconds?: number;
  scheduling_notes?: string;
}
```

**Output:**
```typescript
{
  id: string;
  entryNumber: number;
}
```

---

## 4. Reservation Router

**File:** `src/server/routers/reservation.ts`

### Procedure: getStudioReservation

**Type:** query
**Input:**
```typescript
{
  studioId: string;
  competitionId: string;
}
```

**Output:**
```typescript
{
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'summarized' | 'cancelled';
  spaces_requested: number;
  spaces_confirmed: number | null;
  spaces_used: number;                  // Actual entries created

  // Timestamps
  submittedAt: string;
  approvedAt: string | null;
  summarizedAt: string | null;

  // Summary data (after submission)
  summaryId: string | null;
  actualEntryCount: number | null;

  // Capacity info
  tokensUsed: number;
  tokensRemaining: number;
}
```

---

## 5. Common Patterns

### Nullable Fields

Many fields can be null - always check before use:
```typescript
// BAD
const time = entry.scheduledTimeString.split(':');  // Crashes if null

// GOOD
const time = entry.scheduledTimeString?.split(':') ?? ['00', '00', '00'];
```

### Duration Units

| Context | Unit | Example |
|---------|------|---------|
| Routine duration | Seconds | `180` = 3 minutes |
| Block duration | Minutes | `15` = 15 minutes |
| Extended time fields | Minutes + Seconds | `routine_length_minutes: 4, routine_length_seconds: 30` |

### Money Values

All monetary values are in CENTS:
```typescript
// Display formatting
const displayAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Input handling
const centsFromDollars = (dollars: number) => Math.round(dollars * 100);
```

### Date Formats

| Field | Format | Example |
|-------|--------|---------|
| ISO date | `YYYY-MM-DD` | `"2026-04-15"` |
| ISO datetime | `YYYY-MM-DDTHH:mm:ss.sssZ` | `"2026-04-15T09:00:00.000Z"` |
| Time string | `HH:MM:SS` | `"09:30:00"` |

### Status Enums

Common status values across the system:

```typescript
// Entries
type EntryStatus = 'draft' | 'submitted' | 'approved' | 'cancelled';

// Invoices
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'voided' | 'overdue';

// Reservations
type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'summarized' | 'cancelled';
```

---

*Last updated: December 25, 2025*
