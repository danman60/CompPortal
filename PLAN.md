# Plan: Custom Discount Percentage Input

## Summary
Replace the fixed 5%/10%/15% discount buttons in `InvoiceDetail.tsx` with a custom input box where CDs can enter any percentage (0-100%).

## Current State
- **File:** `src/components/InvoiceDetail.tsx` (lines 492-571)
- **UI:** Three hardcoded buttons (5%, 10%, 15%) that toggle discount on/off
- **Backend:** `applyStudioDiscount` mutation already accepts any percentage 0-100
- **No backend changes needed**

## Implementation

### Single File Change: `src/components/InvoiceDetail.tsx`

**Replace lines 492-571 (the discount buttons section) with:**

1. Add state for custom discount input at component level:
```tsx
const [customDiscountInput, setCustomDiscountInput] = useState<string>('');
```

2. Sync input with current discount when it changes:
```tsx
useEffect(() => {
  setCustomDiscountInput(discountPercent > 0 ? discountPercent.toFixed(1) : '');
}, [discountPercent]);
```

3. Replace the buttons with input + Apply + Clear:
```tsx
{/* Discount Input - Only for Competition Directors */}
{isCompetitionDirector && (
  <div className="mb-6 flex justify-end">
    <div className="flex items-center gap-2">
      <span className="text-gray-300 mr-2">Discount:</span>
      <input
        type="number"
        min="0"
        max="100"
        step="0.1"
        placeholder="0"
        value={customDiscountInput}
        onChange={(e) => setCustomDiscountInput(e.target.value)}
        className="w-20 px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-right"
      />
      <span className="text-gray-300">%</span>
      <button
        onClick={() => {
          if (!dbInvoice) return;
          const percent = parseFloat(customDiscountInput) || 0;
          if (percent < 0 || percent > 100) {
            toast.error('Discount must be between 0% and 100%');
            return;
          }
          applyDiscountMutation.mutate({
            invoiceId: dbInvoice.id,
            discountPercentage: percent,
          });
        }}
        disabled={!dbInvoice || applyDiscountMutation.isPending}
        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold text-sm hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
      >
        {applyDiscountMutation.isPending ? 'Applying...' : 'Apply'}
      </button>
      {discountPercent > 0.01 && (
        <button
          onClick={() => {
            if (!dbInvoice) return;
            setCustomDiscountInput('');
            applyDiscountMutation.mutate({
              invoiceId: dbInvoice.id,
              discountPercentage: 0,
            });
          }}
          disabled={!dbInvoice || applyDiscountMutation.isPending}
          className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-semibold text-sm hover:bg-red-500/30 transition-all disabled:opacity-50"
        >
          Clear
        </button>
      )}
      <button
        onClick={() => setShowCreditModal(true)}
        className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg font-semibold text-sm hover:bg-purple-500/30 transition-all ml-4"
      >
        Other Credits
      </button>
    </div>
  </div>
)}
```

## Changes Summary

| Location | Change |
|----------|--------|
| `InvoiceDetail.tsx` | Add `customDiscountInput` state |
| `InvoiceDetail.tsx` | Add `useEffect` to sync input with current discount |
| `InvoiceDetail.tsx` | Replace 5%/10%/15% buttons with number input + Apply button |
| `InvoiceDetail.tsx` | Keep Clear button (appears when discount > 0) |
| `InvoiceDetail.tsx` | Keep "Other Credits" button unchanged |

## Testing
1. Go to any invoice detail page as CD
2. Enter a custom percentage (e.g., 7.5%)
3. Click Apply - verify discount is applied
4. Click Clear - verify discount is removed
5. Try invalid values (negative, >100) - should show error toast

## No Backend Changes
The existing `invoice.applyStudioDiscount` mutation already accepts any percentage 0-100.
