# Pipeline Enhancement Plan: Complete the Vision

**Created:** 2025-12-06
**Status:** PLANNING
**Approach:** Enhance existing Pipeline page (not new page)

---

## Current State Audit

### Pipeline HAS (Working)
| Feature | Status |
|---------|--------|
| Approve reservation | ✅ |
| Reject reservation | ✅ |
| Adjust spaces | ✅ |
| Create invoice (summarized) | ✅ |
| Send invoice (draft) | ✅ |
| Mark as Paid (full) | ✅ |
| Reopen Summary (void + reopen) | ✅ |
| View Invoice link | ✅ |

### Pipeline MISSING (Glow CD Pain Points)
| Feature | Impact | Priority |
|---------|--------|----------|
| **Add Partial Payment** | CD can only "Mark as Paid" full, can't record partial | 🔴 HIGH |
| **Show Invoice Balance** | No visibility into amount owed vs paid | 🔴 HIGH |
| **Handle VOIDED status** | No actions shown for voided invoices | 🔴 HIGH |
| **Void-only option** | Only has "Reopen Summary" which forces studio re-submit | 🟡 MEDIUM |
| **Payment history** | No visibility into payment timeline | 🟡 MEDIUM |
| **Better status badges** | Current badges don't reflect all states | 🟡 MEDIUM |

---

## Gap Analysis: What Glow CD Couldn't Do

### 1. "Can't add payments to accounts"
**Root cause:** Pipeline only has "Mark as Paid" button, no partial payment option

**Fix:** Add "Add Payment" button that opens QuickPaymentModal
```
hasSentInvoice && !invoicePaid:
  [View Invoice] [Add Payment ▼] [Mark Paid]
                      │
                      └── Opens modal with amount, method, reference
```

### 2. "Can't figure out how to re-invoice Elite Star"
**Root cause:** Elite Star invoice is VOIDED, Pipeline doesn't show actions for voided invoices

**Current logic (line 331):**
```typescript
{!isPending && !needsInvoice && !hasDraftInvoice && !hasSentInvoice && !isPaid && (
  <span className="text-gray-500 text-sm">—</span>  // ← Shows nothing!
)}
```

**Fix:** Add VOIDED invoice handling
```
isVoided && reservationSummarized:
  [Create New Invoice] ← This is missing!

isVoided && reservationApproved:
  [Awaiting Summary] ← Show status, maybe remind button
```

### 3. "Reopened Fever not sure if I did that right"
**Root cause:** No confirmation/feedback on what "Reopen Summary" actually did

**Fix:**
- Show clearer status after action ("Reservation reopened - awaiting studio summary")
- Add visual indicator that studio needs to resubmit

### 4. "This process is complicated" (void + reissue in same screen)
**Root cause:** Current flow requires:
1. Void invoice (via Reopen Summary)
2. Wait for studio to resubmit
3. Create new invoice

**Fix Option A:** Add "Regenerate Invoice" that skips studio step
```
[Void & Regenerate Invoice]
  → Voids old invoice
  → Keeps reservation as "summarized"
  → Immediately creates new invoice
  → No studio action needed
```

**Fix Option B:** Add "Void Invoice Only" (doesn't reopen)
```
[Void Invoice] → Just voids, reservation stays summarized
[Reopen Summary] → Voids AND reopens (current behavior)
```

---

## Implementation Plan

### Phase 1: Data Enhancement (Backend)

**Modify `getPipelineView` to include:**
```typescript
invoices: {
  select: {
    id: true,
    total: true,
    status: true,
    paid_at: true,
    balance_remaining: true,  // ← ADD
    amount_paid: true,        // ← ADD
    created_at: true,         // ← ADD
  },
  orderBy: { created_at: 'desc' },
  take: 5,  // ← Get history, not just latest
}
```

**Add `hasVoidedInvoice` computed field**

---

### Phase 2: UI Enhancement (ReservationTable.tsx)

**2.1 Add Balance Column**
```
│ Studio │ Status │ Entries │ Balance │ Actions │
│ Fever  │ SENT   │ 50      │ $32,427 │ [...]   │
```

**2.2 Add Partial Payment Button**
```tsx
{hasSentInvoice && !reservation.invoicePaid && (
  <>
    <Button onClick={() => openPaymentModal(reservation)}>
      Add Payment
    </Button>
    <Button onClick={() => onMarkAsPaid(...)}>
      Mark as Paid
    </Button>
  </>
)}
```

**2.3 Add VOIDED Status Actions**
```tsx
{isVoided && reservationSummarized && (
  <Button onClick={() => onCreateInvoice(reservation.id)}>
    Create New Invoice
  </Button>
)}

{isVoided && !reservationSummarized && (
  <span className="text-yellow-400">Awaiting studio summary</span>
)}
```

**2.4 Split Reopen vs Void**
```tsx
{isSummarized && (
  <>
    <Button onClick={() => onVoidOnly(reservation)}>
      Void Invoice
    </Button>
    <Button onClick={() => onReopenSummary(reservation)}>
      Void & Reopen
    </Button>
  </>
)}
```

---

### Phase 3: Add QuickPaymentModal

Reuse existing `ApplyPartialPaymentModal` or create inline version:

```tsx
<QuickPaymentModal
  isOpen={paymentModal.isOpen}
  invoiceId={paymentModal.invoiceId}
  currentBalance={paymentModal.balance}
  onClose={() => setPaymentModal({ isOpen: false })}
  onSuccess={() => {
    refetch();
    toast.success('Payment recorded!');
  }}
/>
```

---

### Phase 4: Status Badge Enhancement

Current badges don't show all states. Add:

```tsx
const statusConfig = {
  pending: { color: 'gray', label: 'Pending Approval' },
  approved: { color: 'yellow', label: 'Awaiting Summary' },
  summarized: { color: 'orange', label: 'Ready for Invoice' },
  invoiced_draft: { color: 'blue', label: 'Invoice Draft' },
  invoiced_sent: { color: 'purple', label: 'Invoice Sent' },
  invoiced_partial: { color: 'indigo', label: 'Partial Payment' },
  paid: { color: 'green', label: 'Paid' },
  voided: { color: 'red', label: 'Voided - Action Needed' },
  rejected: { color: 'red', label: 'Rejected' },
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/server/routers/reservation.ts` | Enhance `getPipelineView` with invoice details |
| `src/components/rebuild/pipeline/ReservationTable.tsx` | Add balance column, payment button, voided handling |
| `src/components/rebuild/pipeline/PipelinePageContainer.tsx` | Add payment modal state, void-only mutation |
| `src/server/routers/invoice.ts` | Add `voidOnly` procedure (void without reopen) |
| `src/components/rebuild/pipeline/QuickPaymentModal.tsx` | NEW - inline payment entry |

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Backend: Enhance getPipelineView | 30 min |
| Backend: Add voidOnly procedure | 30 min |
| Frontend: Balance column | 30 min |
| Frontend: Payment button + modal | 1 hour |
| Frontend: VOIDED status actions | 30 min |
| Frontend: Split void/reopen buttons | 30 min |
| Frontend: Enhanced status badges | 30 min |
| Testing | 1 hour |

**Total: ~5-6 hours focused work**

---

## Success Criteria

After enhancement, Glow CD should be able to:

1. ✅ See balance owed for each studio at a glance
2. ✅ Add partial payment without leaving Pipeline
3. ✅ Create new invoice for studio with voided invoice
4. ✅ Choose between "Void Only" and "Void & Reopen"
5. ✅ Understand what state each studio is in via clear badges

---

## Alternative: Quick Fix (Immediate)

If full enhancement takes too long, quick win:

**Just add "Create Invoice" button for voided + summarized status**

This alone would fix Elite Star case:
```tsx
// In ReservationTable.tsx, add condition:
{(isSummarized || hasVoidedInvoice) && !hasDraftInvoice && !hasSentInvoice && (
  <Button onClick={() => onCreateInvoice(reservation.id)}>
    Create Invoice
  </Button>
)}
```

**5 minute fix for the immediate blocker.**

---

**Ready to proceed when approved.**
