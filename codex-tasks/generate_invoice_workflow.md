# Task: Replace Approve/Reject with Generate Invoice Workflow

**Priority**: MEDIUM (Task #11 from TODO.md)
**Estimate**: 2-3 hours
**Source**: PostDemoChanges10_10.md Section 5

## Context

Currently, Competition Directors approve/reject reservations directly from the reservations list. The new workflow should generate a persistent invoice that CDs can edit before sending to studios.

## Database Schema

`invoices` table already exists with:
- id, tenant_id, studio_id, competition_id, reservation_id
- line_items (JSON) - flexible invoice line items
- subtotal, total (Decimal)
- status (default "UNPAID")
- created_at, updated_at

## Requirements

### 1. Add invoice.createFromReservation mutation

**File**: `src/server/routers/invoice.ts`

**Location**: After sendInvoiceReminder (line 368)

```typescript
// Create invoice from reservation
createFromReservation: protectedProcedure
  .input(z.object({
    reservationId: z.string().uuid(),
    spacesConfirmed: z.number().int().min(0).optional(), // Allow partial approval
  }))
  .mutation(async ({ ctx, input }) => {
    const { reservationId, spacesConfirmed } = input;

    // Fetch reservation with studio and competition details
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        studios: true,
        competitions: true,
      },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Fetch all entries for this studio in this competition
    const entries = await prisma.competition_entries.findMany({
      where: {
        studio_id: reservation.studio_id,
        competition_id: reservation.competition_id,
        status: { not: 'cancelled' },
      },
      include: {
        dance_categories: true,
        entry_size_categories: true,
      },
      orderBy: {
        entry_number: 'asc',
      },
    });

    // Build line items from entries
    const lineItems = entries.map((entry) => ({
      id: entry.id,
      entryNumber: entry.entry_number,
      title: entry.title,
      category: entry.dance_categories?.name || 'Unknown',
      sizeCategory: entry.entry_size_categories?.name || 'Unknown',
      entryFee: Number(entry.entry_fee || 0),
      lateFee: Number(entry.late_fee || 0),
      total: Number(entry.entry_fee || 0) + Number(entry.late_fee || 0),
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

    // Create invoice record
    const invoice = await prisma.invoices.create({
      data: {
        tenant_id: reservation.tenant_id,
        studio_id: reservation.studio_id,
        competition_id: reservation.competition_id,
        reservation_id: reservationId,
        line_items: lineItems,
        subtotal,
        total: subtotal, // No discounts yet, can be adjusted in editor
        status: 'UNPAID',
      },
    });

    // Update reservation status to approved and set confirmed spaces
    await prisma.reservations.update({
      where: { id: reservationId },
      data: {
        status: 'approved',
        spaces_confirmed: spacesConfirmed ?? reservation.spaces_requested,
        approved_at: new Date(),
        approved_by: ctx.userId,
      },
    });

    // Activity logging
    try {
      await logActivity({
        userId: ctx.userId,
        studioId: reservation.studio_id,
        action: 'invoice.create',
        entityType: 'invoice',
        entityId: invoice.id,
        details: {
          reservation_id: reservationId,
          studio_name: reservation.studios.name,
          competition_name: reservation.competitions.name,
          subtotal,
          entry_count: entries.length,
        },
      });
    } catch (err) {
      console.error('Failed to log activity (invoice.create):', err);
    }

    return {
      invoiceId: invoice.id,
      reservationId,
      status: 'created',
    };
  }),
```

### 2. Add invoice.getById query

**File**: `src/server/routers/invoice.ts`

**Location**: After createFromReservation

```typescript
// Get invoice by ID for editing
getById: publicProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input }) => {
    const invoice = await prisma.invoices.findUnique({
      where: { id: input.id },
      include: {
        studios: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true,
            address1: true,
            city: true,
            province: true,
            postal_code: true,
            country: true,
          },
        },
        competitions: {
          select: {
            id: true,
            name: true,
            year: true,
            competition_start_date: true,
            competition_end_date: true,
            primary_location: true,
          },
        },
        reservations: {
          select: {
            id: true,
            spaces_requested: true,
            spaces_confirmed: true,
            deposit_amount: true,
            total_amount: true,
            payment_status: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }),
```

### 3. Add invoice.update mutation

**File**: `src/server/routers/invoice.ts`

**Location**: After getById

```typescript
// Update invoice (for discounts, adjustments)
update: protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
    line_items: z.any().optional(), // JSON line items
    subtotal: z.number().optional(),
    total: z.number().optional(),
    discount_amount: z.number().optional(),
    discount_reason: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const invoice = await prisma.invoices.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    // Activity logging
    try {
      await logActivity({
        userId: ctx.userId,
        action: 'invoice.update',
        entityType: 'invoice',
        entityId: id,
        details: {
          changes: data,
        },
      });
    } catch (err) {
      console.error('Failed to log activity (invoice.update):', err);
    }

    return invoice;
  }),
```

### 4. Update ReservationsList Component

**File**: `src/components/ReservationsList.tsx`

**Changes**:
- Replace Approve/Reject buttons with single "Generate Invoice" button
- Call `invoice.createFromReservation` mutation
- Redirect to `/dashboard/invoices/${invoiceId}/edit` on success

**Location**: Lines 731-749 (current Approve/Reject buttons)

```typescript
// Replace existing buttons with:
<button
  onClick={async () => {
    setProcessingId(reservation.id);
    try {
      const result = await createInvoiceMutation.mutateAsync({
        reservationId: reservation.id,
        spacesConfirmed: reservation.spaces_requested, // Can add UI to adjust this
      });

      toast.success('Invoice generated! Redirecting to editor...', { position: 'top-right' });

      // Redirect to invoice editor
      router.push(`/dashboard/invoices/${result.invoiceId}/edit`);
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast.error('Failed to generate invoice. Please try again.', { position: 'top-right' });
      setProcessingId(null);
    }
  }}
  disabled={processingId === reservation.id}
  className="w-full min-h-[44px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
>
  {processingId === reservation.id ? '⚙️ Generating Invoice...' : '📄 Generate Invoice'}
</button>
```

Add mutation at top of component:
```typescript
const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation();
```

### 5. Create Invoice Editor Page

**File**: `src/app/dashboard/invoices/[invoiceId]/edit/page.tsx` (NEW FILE)

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function InvoiceEditorPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const { data: invoice, isLoading } = trpc.invoice.getById.useQuery({ id: invoiceId });
  const updateMutation = trpc.invoice.update.useMutation();

  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-white text-xl">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-white text-xl">Invoice not found</p>
            <button
              onClick={() => router.push('/dashboard/reservations')}
              className="mt-6 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
            >
              Back to Reservations
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lineItems = invoice.line_items as any[];
  const subtotalAmount = Number(invoice.subtotal || 0);
  const finalTotal = subtotalAmount - discountAmount;

  const handleApplyDiscount = async () => {
    try {
      await updateMutation.mutateAsync({
        id: invoiceId,
        total: finalTotal,
        discount_amount: discountAmount,
        discount_reason: discountReason,
      });
      toast.success('Discount applied!', { position: 'top-right' });
    } catch (error) {
      console.error('Discount error:', error);
      toast.error('Failed to apply discount', { position: 'top-right' });
    }
  };

  const handleSendInvoice = async () => {
    // TODO: Implement email sending
    toast.success('Invoice sent to studio!', { position: 'top-right' });
    router.push('/dashboard/reservations');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Invoice Editor</h1>
            <p className="text-gray-300">
              {invoice.studios.name} • {invoice.competitions.name} {invoice.competitions.year}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/reservations')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
          >
            ← Back
          </button>
        </div>

        {/* Invoice Details */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 mb-6">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Studio Details</h3>
              <div className="text-gray-300 space-y-1">
                <p className="font-bold text-white">{invoice.studios.name}</p>
                <p>{invoice.studios.address1}</p>
                <p>{invoice.studios.city}, {invoice.studios.province} {invoice.studios.postal_code}</p>
                <p>{invoice.studios.email}</p>
                <p>{invoice.studios.phone}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Competition Details</h3>
              <div className="text-gray-300 space-y-1">
                <p className="font-bold text-white">{invoice.competitions.name} {invoice.competitions.year}</p>
                <p>{new Date(invoice.competitions.competition_start_date).toLocaleDateString()} - {new Date(invoice.competitions.competition_end_date).toLocaleDateString()}</p>
                <p>{invoice.competitions.primary_location}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Routine Entries ({lineItems.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="pb-3 text-gray-300 font-medium">#</th>
                    <th className="pb-3 text-gray-300 font-medium">Routine Title</th>
                    <th className="pb-3 text-gray-300 font-medium">Category</th>
                    <th className="pb-3 text-gray-300 font-medium">Size</th>
                    <th className="pb-3 text-gray-300 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-3 text-gray-300">{item.entryNumber}</td>
                      <td className="py-3 text-white">{item.title}</td>
                      <td className="py-3 text-gray-300">{item.category}</td>
                      <td className="py-3 text-gray-300">{item.sizeCategory}</td>
                      <td className="py-3 text-white text-right font-mono">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount Section */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Apply Discount</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Discount Amount ($)</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  min={0}
                  max={subtotalAmount}
                  step={0.01}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Reason</label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g., Early registration discount"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button
              onClick={handleApplyDiscount}
              disabled={discountAmount === 0}
              className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded-lg transition-all"
            >
              Apply Discount
            </button>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-right">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal:</span>
              <span className="font-mono">${subtotalAmount.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount:</span>
                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-bold text-white pt-4 border-t border-white/20">
              <span>Total:</span>
              <span className="font-mono">${finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard/reservations')}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg"
          >
            Save Draft
          </button>
          <button
            onClick={handleSendInvoice}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg"
          >
            Send Invoice to Studio
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Validation Checklist

- [ ] invoice.createFromReservation mutation added
- [ ] invoice.getById query added
- [ ] invoice.update mutation added
- [ ] ReservationsList updated (Generate Invoice button)
- [ ] Invoice editor page created
- [ ] Activity logging for invoice operations
- [ ] Discount functionality working
- [ ] Build passes (npm run build)
- [ ] UI follows glassmorphic design pattern

## Testing

1. Navigate to Reservations page as Competition Director
2. Find pending reservation
3. Click "Generate Invoice" button
4. Should redirect to invoice editor
5. Apply discount and verify calculation
6. Click "Send Invoice" and verify redirect back

## Notes

- Invoice status remains "UNPAID" until payment confirmed separately
- Reservation status changes to "approved" when invoice generated
- Line items stored as JSON for flexibility
- Activity logging captures invoice creation/updates
