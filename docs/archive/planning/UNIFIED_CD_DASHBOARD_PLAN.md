# Unified CD Dashboard Plan: "Studio Accounts"

**Created:** 2025-12-06
**Status:** PLANNING
**Approach:** Additive (keep existing pages, build new unified view)

---

## The Problem

Glow CD's feedback reveals fragmented UX:

```
Current CD Mental Model:
"What's happening with Fever? Where do I go?"

Current System Model:
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────┐
│  Pipeline   │ →  │   Routine    │ →  │  Invoices  │ →  │ Invoice  │
│   (Approve) │    │  Summaries   │    │   (List)   │    │ (Detail) │
│             │    │   (Create)   │    │            │    │ (Pay)    │
└─────────────┘    └──────────────┘    └────────────┘    └──────────┘
     4 different pages to manage one studio
```

**CD's expectation:** One place to see studio status + take action

---

## Proposed Solution: "Studio Accounts" Dashboard

A single unified view where CDs can:
1. See ALL studios and their current status at a glance
2. Drill into any studio to see full history/details
3. Take ANY action from one place (approve, invoice, pay, void, reopen)

```
New Mental Model:
┌─────────────────────────────────────────────────────────┐
│                   STUDIO ACCOUNTS                        │
├─────────────────────────────────────────────────────────┤
│ [Filter: Competition ▼] [Filter: Status ▼] [Search]     │
├─────────────────────────────────────────────────────────┤
│ Studio          │ Status      │ Entries │ Balance │ ⚡   │
├─────────────────────────────────────────────────────────┤
│ ▶ Elite Star    │ 🔶 Invoiced │ 12      │ $163.85 │ [+] │
│   └─ Invoice VOIDED - needs new invoice                 │
│   └─ [Create Invoice] [View History]                    │
├─────────────────────────────────────────────────────────┤
│ ▶ Fever         │ 🟡 Approved │ 50      │ -       │ [+] │
│   └─ Awaiting summary submission                        │
│   └─ [Remind Studio] [Force Submit]                     │
├─────────────────────────────────────────────────────────┤
│ ▶ Studio X      │ 🟢 Paid     │ 25      │ $0.00   │ [+] │
│   └─ Fully paid on Dec 5                                │
│   └─ [View Invoice] [View Entries]                      │
└─────────────────────────────────────────────────────────┘
```

---

## Status Lifecycle (Unified View)

```
┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐
│ PENDING  │ → │ APPROVED │ → │ SUMMARIZED │ → │ INVOICED │ → │   SENT   │ → │  PAID  │
│ ⚪ Gray  │   │ 🟡 Yellow│   │ 🟠 Orange  │   │ 🔵 Blue  │   │ 🟣 Purple│   │ 🟢 Green│
└──────────┘   └──────────┘   └────────────┘   └──────────┘   └──────────┘   └────────┘
     │              │               │               │              │             │
     ▼              ▼               ▼               ▼              ▼             ▼
  [Approve]    [Wait for     [Create        [Send         [Add         [Complete]
  [Reject]      Summary]      Invoice]       Invoice]     Payment]
  [Adjust]     [Remind]      [View          [Void &       [Mark Paid]
               [Force]        Entries]       Reopen]
```

**Special States:**
- `VOIDED` - Invoice was voided, needs new invoice or resubmission
- `PARTIAL` - Partial payment received, balance remaining

---

## Data Model: Unified Studio Account

```typescript
interface StudioAccount {
  // Studio info
  studioId: string;
  studioName: string;
  studioCode: string;
  ownerEmail: string;

  // Reservation info
  reservationId: string;
  reservationStatus: 'pending' | 'approved' | 'rejected' | 'summarized' | 'invoiced' | 'closed';
  spacesRequested: number;
  spacesConfirmed: number;

  // Competition context
  competitionId: string;
  competitionName: string;

  // Entry stats
  entryCount: number;
  participantCount: number;

  // Invoice info (latest non-voided)
  invoiceId?: string;
  invoiceStatus?: 'DRAFT' | 'SENT' | 'PAID' | 'VOIDED';
  invoiceTotal?: number;
  invoiceBalance?: number;
  amountPaid?: number;

  // Timeline
  createdAt: Date;
  approvedAt?: Date;
  summarizedAt?: Date;
  invoicedAt?: Date;
  lastPaymentAt?: Date;

  // Derived unified status
  unifiedStatus: UnifiedStatus;
  availableActions: Action[];
}

type UnifiedStatus =
  | 'pending'      // Awaiting approval
  | 'approved'     // Approved, awaiting summary
  | 'summarized'   // Summary in, ready for invoice
  | 'draft'        // Invoice created but not sent
  | 'sent'         // Invoice sent, awaiting payment
  | 'partial'      // Partial payment received
  | 'paid'         // Fully paid
  | 'voided'       // Invoice voided, needs action
  | 'rejected';    // Reservation rejected

type Action =
  | 'approve'
  | 'reject'
  | 'adjust_spaces'
  | 'remind_summary'
  | 'create_invoice'
  | 'send_invoice'
  | 'add_payment'
  | 'mark_paid'
  | 'void_reopen'
  | 'view_entries'
  | 'view_invoice'
  | 'download_pdf';
```

---

## Backend: New Unified Query

```typescript
// src/server/routers/studioAccounts.ts

getStudioAccounts: protectedProcedure
  .input(z.object({
    competitionId: z.string().optional(),
    status: z.enum(['all', 'pending', 'approved', ...]).optional(),
    search: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    // Fetch reservations with all related data in ONE query
    const reservations = await prisma.reservations.findMany({
      where: {
        tenant_id: ctx.tenantId,
        ...(input.competitionId && { competition_id: input.competitionId }),
      },
      include: {
        studios: true,
        competitions: true,
        invoices: {
          orderBy: { created_at: 'desc' },
          take: 1, // Latest invoice
        },
        _count: { select: { competition_entries: true } },
        summaries: { take: 1 },
      },
    });

    // Transform to unified StudioAccount objects
    return reservations.map(toStudioAccount);
  });
```

---

## Frontend Architecture

### New Files

```
src/
├── app/dashboard/
│   └── studio-accounts/
│       └── page.tsx                    # New unified page
│
├── components/studio-accounts/
│   ├── StudioAccountsPage.tsx          # Main container
│   ├── StudioAccountsTable.tsx         # Unified table
│   ├── StudioAccountRow.tsx            # Expandable row
│   ├── StudioAccountDetails.tsx        # Expanded details panel
│   ├── StatusBadge.tsx                 # Unified status badge
│   ├── ActionButtons.tsx               # Context-aware actions
│   ├── QuickPaymentModal.tsx           # Inline payment entry
│   └── StudioAccountFilters.tsx        # Filters bar
│
├── hooks/
│   └── useStudioAccounts.ts            # Data + mutations hook
│
└── server/routers/
    └── studioAccounts.ts               # New router
```

### Component Hierarchy

```
StudioAccountsPage
├── StudioAccountFilters
│   ├── CompetitionDropdown
│   ├── StatusFilter
│   └── SearchInput
│
├── StudioAccountsTable
│   └── StudioAccountRow (for each studio)
│       ├── StatusBadge
│       ├── ActionButtons
│       └── StudioAccountDetails (expandable)
│           ├── ReservationInfo
│           ├── EntryStats
│           ├── InvoiceHistory
│           ├── PaymentHistory
│           └── ActionPanel
│
└── Modals
    ├── ApprovalModal
    ├── RejectModal
    ├── QuickPaymentModal
    └── VoidConfirmModal
```

---

## Key UX Improvements

### 1. Expandable Rows (Accordion Pattern)
- Click row → Expands to show full details
- All actions available inline
- No page navigation needed

### 2. Context-Aware Action Buttons
```
Status: PENDING    → [Approve] [Reject] [Adjust]
Status: APPROVED   → [Remind] [View Entries]
Status: SUMMARIZED → [Create Invoice] [View Entries]
Status: DRAFT      → [Send Invoice] [Edit] [Void]
Status: SENT       → [Add Payment] [Mark Paid] [Void]
Status: PAID       → [View Invoice] [Download PDF]
Status: VOIDED     → [Create New Invoice] [Reopen Summary]
```

### 3. Inline Payment Entry
Instead of navigating to InvoiceDetail:
- Click "Add Payment" → Quick modal
- Enter amount, method, reference
- Submit → Updates inline
- No page navigation

### 4. Visual Status Progression
Show where studio is in lifecycle:
```
[✓ Approved] → [✓ Summary] → [● Invoice] → [ Payment] → [ Complete]
                                  ▲
                              You are here
```

---

## Migration Strategy

### Phase 1: Build New (No Risk)
1. Create `/dashboard/studio-accounts` page
2. Add to CD sidebar with "Beta" badge
3. Keep ALL existing pages working
4. No data model changes

### Phase 2: CD Testing
1. Ask EMPWR/Glow CDs to try new page
2. Gather feedback
3. Iterate on UX
4. Fix edge cases

### Phase 3: Gradual Adoption
1. Make Studio Accounts the default CD landing page
2. Keep old pages accessible via sidebar
3. Monitor usage analytics

### Phase 4: Deprecation (Optional)
1. If adoption is high, consider deprecating old pages
2. Or keep both forever (different CDs prefer different views)

---

## Effort Estimate

| Component | Complexity | Notes |
|-----------|------------|-------|
| Backend query | Low | Single query with includes |
| StudioAccountsPage | Medium | Container + state management |
| StudioAccountsTable | Medium | Sortable, filterable table |
| StudioAccountRow | Medium | Expandable accordion |
| StudioAccountDetails | High | All info + actions in one place |
| ActionButtons | Medium | Context-aware logic |
| QuickPaymentModal | Low | Reuse ApplyPartialPaymentModal |
| Filters | Low | Reuse existing filter patterns |

**Total: ~2-3 days focused work**

---

## Questions for User

1. **Naming:** "Studio Accounts" or "Account Manager" or "Studios Dashboard"?

2. **Default View:**
   - Show all studios expanded?
   - Or collapsed with click-to-expand?

3. **Action Priority:**
   - Which actions are PRIMARY (big buttons)?
   - Which are SECONDARY (dropdown menu)?

4. **Competition Scope:**
   - Show all competitions combined?
   - Or force single-competition view?

---

## Success Metrics

- CD can complete full studio lifecycle without leaving page
- Time to "add payment" reduced from 4 clicks to 2 clicks
- "Reopen + Re-invoice" possible in one place
- Reduced "how do I..." support questions

---

**Ready to proceed when approved.**
