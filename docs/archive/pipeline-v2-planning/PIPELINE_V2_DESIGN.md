# Pipeline V2: Unified Studio Management View

**Created:** 2025-12-06
**Status:** PLANNING (ultrathink mode)
**Approach:** Enhance existing Pipeline page with comprehensive CD controls

---

## User Requirements Summary

1. **Studio Focus View** - Isolate individual studio to see their path
2. **Reopen Summary** - Allow reopening after submission
3. **Void & Reopen** - Void invoice + reopen summary (auto-recreate?)
4. **Edit Spaces** - Modify reservation spaces
5. **Edit Deposit** - Record/modify deposits
6. **Collapsible Capacity Cards** - Hide when not relevant
7. **Visual Progress Indicator** - Show studio's journey + activity log
8. **Hide Completed Toggle** - Focus on remaining work
9. **Sortable Columns** - All columns sortable
10. **Next Action Indicator** - Clear guidance on what's needed

---

## Design Philosophy

### Current Pain Point
```
CD Mental Model:
"What's the status of Fever? What do I need to do next?"

Current Reality:
- Check Pipeline for reservation status
- Go to Routine Summaries to see if they submitted
- Go to Invoices to check invoice status
- Go to Invoice Detail to add payment
= 4+ pages for one studio
```

### Target State
```
CD Mental Model:
"What's the status of Fever? What do I need to do next?"

New Reality:
- Open Pipeline
- Find Fever row
- See status, progress, next action, all controls
= 1 page, zero navigation
```

---

## Visual Design: Studio Row Layout

### Collapsed Row (Default)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ ▶ Fever Dance          │ ● INVOICE SENT │ 50 entries │ $32,427 due │ ⚡  │
│   Glow 2026            │   78% →→→→━━━━ │ 45/50 used │ Due Dec 15  │     │
└────────────────────────────────────────────────────────────────────────────┘
                                                                     ↑
                                                    Quick actions dropdown
```

### Expanded Row (Click to expand)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ ▼ Fever Dance                                               ✅ ● ● ● ○ ○  │
│   Glow 2026                                          Progress: 3 of 5 steps│
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   RESERVATION          SUMMARY           INVOICE           PAYMENT        │
│   ─────────────────    ─────────────     ─────────────     ────────────   │
│   ✅ Approved          ✅ Submitted       ● Sent           ○ Pending      │
│   50 spaces            45 entries         INV-2026-FEV     $0 of $32,427  │
│   Dec 1, 2025          Dec 3, 2025        Dec 4, 2025                     │
│                                                                            │
│   [Edit Spaces]        [Reopen]          [View Invoice]    [Add Payment]  │
│                                          [Void & Reopen]   [Mark Paid]    │
│                                          [Regenerate]                      │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│   📋 ACTIVITY LOG (Last 5)                                                 │
│   ─────────────────────────────────────────────────────────────────────   │
│   Dec 4, 10:30 AM  │ Invoice sent to fever@dance.com                       │
│   Dec 4, 10:28 AM  │ Invoice INV-2026-FEV created (Draft)                  │
│   Dec 3, 4:15 PM   │ Summary submitted: 45 entries, 5 unused spaces        │
│   Dec 1, 9:00 AM   │ Reservation approved: 50 spaces                       │
│   Nov 28, 3:00 PM  │ Reservation request received: 50 spaces               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Progress Indicator Design

### 5-Step Pipeline
```
Step 1: RESERVATION  → ⚪ Pending / ✅ Approved / ❌ Rejected
Step 2: SUMMARY      → ⚪ Awaiting / ✅ Submitted / 🔄 Reopened
Step 3: INVOICE      → ⚪ Not Created / 📝 Draft / 📤 Sent / 🚫 Voided
Step 4: PAYMENT      → ⚪ Pending / 🔵 Partial / ✅ Paid
Step 5: COMPLETE     → ⚪ Not Complete / ✅ Complete
```

### Visual Progress Bar
```
Approved + Summary + Invoice Sent + Partial Payment:
[✅]─────[✅]─────[✅]─────[◐]─────[○]
 Rsv      Sum      Inv      Pay     Done
         "78% complete - Awaiting full payment"
```

---

## Collapsible Capacity Cards

### Current (Always Visible)
```
┌────────────────────────────────────────────────────────────┐
│  Glow 2026                                                  │
│  450/600 tokens used (75%)                                  │
│  ████████████████████░░░░░░░░                               │
└────────────────────────────────────────────────────────────┘
```

### Proposed (Collapsible Header)
```
┌────────────────────────────────────────────────────────────┐
│  📊 Capacity Overview  [Glow 2026 ▼]  [Hide ▲]             │
├────────────────────────────────────────────────────────────┤
│  450/600 tokens (75%)  │  150 available  │  12 studios     │
│  ████████████████░░░░  │                 │                 │
└────────────────────────────────────────────────────────────┘
```

When collapsed:
```
┌────────────────────────────────────────────────────────────┐
│  📊 Capacity: 75% (450/600)                    [Show ▼]    │
└────────────────────────────────────────────────────────────┘
```

---

## Filter & Sort Controls

### Filter Bar
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Competition: [Glow 2026 ▼]   Status: [All ▼]   [□ Hide Completed]          │
│ Search: [________________________]                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

### Status Filter Options
- All Studios
- Pending Approval
- Awaiting Summary
- Ready for Invoice
- Invoice Sent (Unpaid)
- Partially Paid
- Fully Paid ✅
- Voided (Needs Action)
- Rejected

### Sortable Column Headers
```
│ Studio ▲▼ │ Status ▲▼ │ Entries ▲▼ │ Balance ▲▼ │ Due Date ▲▼ │ Actions │
```

Click column → Toggle asc/desc sort
Active sort shown with arrow indicator

---

## Action Buttons by State

### PENDING Reservation
```
[Approve] [Reject] [Adjust Spaces]
```

### APPROVED (Awaiting Summary)
```
[Remind Studio] [View Entries] [Adjust Spaces]
```

### SUMMARIZED (Ready for Invoice)
```
[Create Invoice] [Reopen Summary] [View Entries]
```

### INVOICE DRAFT
```
[Send Invoice] [Edit Invoice] [Void Invoice] [View Invoice]
```

### INVOICE SENT (Awaiting Payment)
```
[Add Payment] [Mark Paid] [Void & Reopen] [View Invoice]
```

### PARTIAL PAYMENT
```
[Add Payment] [Mark Paid] [View Invoice] [View Payments]
```

### FULLY PAID
```
[View Invoice] [View Payments] [Download PDF]
(Row can be hidden via "Hide Completed" toggle)
```

### VOIDED
```
[Create New Invoice] [Reopen Summary] [View History]
```

---

## Quick Actions Menu (⚡ Icon)

Clicking the ⚡ icon shows contextual dropdown:

```
┌─────────────────────────┐
│ Quick Actions           │
├─────────────────────────┤
│ 📧 Email Studio         │
│ 📋 View Entries         │
│ 📄 View Invoice         │
│ 💳 Record Payment       │
│ ───────────────────     │
│ ✏️ Edit Spaces          │
│ ✏️ Edit Deposit         │
│ 🔄 Reopen Summary       │
│ 🚫 Void Invoice         │
│ ───────────────────     │
│ 📊 View Activity Log    │
└─────────────────────────┘
```

---

## Activity Log Integration

### Data Source
Already logging to `activity_log` table:
- `reservation.approve`
- `reservation.reject`
- `summary.submit`
- `invoice.create`
- `invoice.send`
- `invoice.void`
- `payment.apply`

### Display in Expanded Row
```
📋 Recent Activity (click to expand full log)
─────────────────────────────────────
Dec 4  │ Invoice sent           │ by Sarah
Dec 4  │ Invoice created        │ by Sarah
Dec 3  │ Summary submitted      │ by Studio
Dec 1  │ Reservation approved   │ by Sarah
```

---

## Implementation Components

### New/Modified Files

```
src/
├── components/pipeline-v2/
│   ├── PipelineContainer.tsx      # Main container + state
│   ├── PipelineFilters.tsx        # Filter bar + search
│   ├── PipelineTable.tsx          # Sortable table
│   ├── PipelineRow.tsx            # Expandable row
│   ├── PipelineRowExpanded.tsx    # Expanded details
│   ├── ProgressIndicator.tsx      # 5-step progress bar
│   ├── QuickActionsMenu.tsx       # Dropdown menu
│   ├── ActivityLogPanel.tsx       # Recent activity display
│   ├── CapacityHeader.tsx         # Collapsible capacity cards
│   └── StudioModal.tsx            # Full studio detail modal
│
├── hooks/
│   └── usePipeline.ts             # Data fetching + mutations
│
└── server/routers/
    └── pipeline.ts                # New unified query
```

### Backend: Unified Query

```typescript
// New procedure: getUnifiedPipeline
// Combines:
// - Reservations with status
// - Entry counts
// - Summary status
// - Invoice status + balance
// - Recent activity logs
// - Next action recommendation

interface PipelineStudio {
  // Core identity
  studioId: string;
  studioName: string;
  studioCode: string;

  // Reservation
  reservationId: string;
  reservationStatus: 'pending' | 'approved' | 'rejected';
  spacesRequested: number;
  spacesConfirmed: number;
  depositAmount: number;

  // Summary
  summaryId: string | null;
  summarySubmitted: boolean;
  entriesUsed: number;
  entriesUnused: number;

  // Invoice
  invoiceId: string | null;
  invoiceStatus: 'DRAFT' | 'SENT' | 'PAID' | 'VOIDED' | null;
  invoiceTotal: number;
  invoiceBalance: number;
  amountPaid: number;

  // Computed
  progressPercent: number;
  progressStep: 1 | 2 | 3 | 4 | 5;
  nextAction: string;
  nextActionType: 'approve' | 'remind' | 'create_invoice' | 'payment' | 'complete';

  // Activity
  recentActivity: {
    action: string;
    timestamp: Date;
    userId: string;
    userName: string;
  }[];
}
```

---

## Effort Estimate

| Component | Complexity | Estimate |
|-----------|------------|----------|
| Backend: Unified query | High | 2-3 hours |
| CapacityHeader (collapsible) | Low | 30 min |
| PipelineFilters + sort | Medium | 1 hour |
| PipelineTable (sortable) | Medium | 1 hour |
| PipelineRow (expandable) | High | 2 hours |
| ProgressIndicator | Low | 30 min |
| QuickActionsMenu | Medium | 1 hour |
| ActivityLogPanel | Medium | 1 hour |
| All mutations (edit spaces, deposit, etc) | Medium | 2 hours |
| Testing + polish | Medium | 2 hours |

**Total: ~12-14 hours focused work (2-3 days)**

---

## Questions to Clarify

1. **Auto-recreate invoice on void?**
   - Option A: Void only → CD manually creates new invoice
   - Option B: Void & Regenerate → System auto-creates new invoice same data
   - Option C: Both available as separate actions

2. **Activity log scope?**
   - Show last 5 events inline?
   - Or expandable panel with full history?

3. **Studio detail modal?**
   - Click studio name → Full page modal with everything?
   - Or just expand row for all details?

4. **Hide completed threshold?**
   - Hide when fully paid?
   - Or hide when invoice status = PAID regardless of partial?

---

## Success Criteria

After implementation, CD should be able to:

✅ See ALL studios in one view with clear status
✅ Sort by any column to find studios quickly
✅ Filter to focus on specific status (e.g., "unpaid only")
✅ Hide completed studios to reduce noise
✅ Expand any studio to see full details + history
✅ Take ANY action without leaving the page
✅ Understand next step at a glance
✅ Track when things happened via activity log

---

**Ready for approval to begin implementation.**
