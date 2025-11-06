# Dancer Invoice Margin Feature Specification

**Status:** Draft - Ready for Implementation
**Date:** November 6, 2025
**Priority:** P2 - Enhancement (after multi-routine testing complete)

---

## Overview

Allow Studio Directors (SD) to add private margin to dancer invoices when splitting a main invoice. Margin is blended into the subtotal and never shown separately on dancer invoices, allowing SDs to calculate and retain profit.

---

## Business Requirements

### Core Functionality

1. **When:** SD can add margin during dancer invoice generation, after main invoice is marked PAID by CD
2. **Who:** Studio Directors and Super Admins (SA for testing)
3. **What:** Add percentage or fixed dollar margin per routine or per dancer
4. **Result:** Dancer invoices show higher totals with margin blended into subtotal (invisible on invoices)

### Key Constraints

- ✅ Margin can be regenerated infinite times (experimental workflow)
- ✅ Margin is NEVER visible on dancer invoices (blended into subtotal)
- ✅ No negative margin allowed (strictly positive or zero)
- ✅ No maximum margin limits (trust SD judgment)
- ✅ Tax calculated on subtotal AFTER margin is added
- ❌ Siblings never grouped (each dancer gets separate invoice)

---

## User Workflow

### Current Split Invoice Flow (Without Margin)

```
1. CD marks invoice as PAID
2. SD clicks "Split Invoice by Dancer"
3. Modal Step 1: Review business rules
4. Modal Step 2: Confirm split
5. Click "Generate Dancer Invoices"
6. Modal Step 3: Success + download PDFs
```

### New Flow (With Margin)

```
1. CD marks invoice as PAID
2. SD clicks "Split Invoice by Dancer"
3. SINGLE MODAL with 3 sections:

   Section A: Business Rules (collapsible/scrollable)
   - How split works
   - One invoice per dancer
   - Fee splitting logic

   Section B: Margin Calculator (NEW)
   - Preview 2-3 representative dancer invoices
   - Live margin experimentation
   - Warning about margin invisibility

   Section C: Generate
   - "Generate Dancer Invoices" button

4. Dancer invoices created
5. Success message + "Download All PDFs"
```

---

## Margin Calculator UI (Section B)

### Layout

```
┌─────────────────────────────────────────────────────┐
│  💰 Add Margin (Optional)                           │
│  ⚠️ Margin will NOT appear on dancer invoices       │
│  Invoices show only blended subtotal + tax          │
├─────────────────────────────────────────────────────┤
│  Margin Type:                                       │
│  ○ Per Routine    ○ Per Dancer                     │
│                                                     │
│  Margin Amount:                                     │
│  ○ Percentage [___]%   ○ Fixed Amount $[___]       │
│                                                     │
│  Your Total Margin: $XXX.XX across 6 dancers       │
├─────────────────────────────────────────────────────┤
│  Preview (2-3 examples):                           │
│                                                     │
│  📄 Emma Johnson (1 solo routine)                  │
│  Original: $115.00 → With margin: $126.50         │
│  Tax: $16.45 → Total: $142.95                     │
│                                                     │
│  📄 Alexander Martinez (1 trio routine)            │
│  Original: $70.00 → With margin: $77.00           │
│  Tax: $10.01 → Total: $87.01                      │
│                                                     │
│  📄 Sarah Smith (7 routines: 5 group, 1 trio, 1 solo) │
│  Original: $XXX.XX → With margin: $XXX.XX         │
│  Tax: $XX.XX → Total: $XXX.XX                     │
└─────────────────────────────────────────────────────┘
```

### Interactive Behavior

1. **Live Updates:**
   - As SD types in percentage/dollar field, previews update in real-time
   - "Your Total Margin" updates immediately
   - All calculations happen client-side (no API calls until generate)

2. **Toggle Between % and $:**
   - SD enters "10%" → switches to "$" → shows dollar equivalent (e.g., "$52.50")
   - SD can manually adjust dollar amount
   - Switch back to "%" → converts dollar back to percentage
   - Preserves last value when toggling

3. **Preview Selection:**
   - Automatically picks 2-3 representative dancers:
     - Dancer with 1 routine (solo/duo/trio)
     - Dancer with 2-4 routines
     - Dancer with 5+ routines (if exists)
   - Shows variety of routine types

---

## Margin Calculation Logic

### Per Routine Calculation

**Example:** 10% per routine

```typescript
// Dancer has 3 routines
const routine1Split = 115.00; // Solo
const routine2Split = 70.00;  // Duo (50% of $140)
const routine3Split = 70.00;  // Trio (33.33% of $210)

// Apply margin to each routine
const routine1WithMargin = routine1Split * 1.10; // $126.50
const routine2WithMargin = routine2Split * 1.10; // $77.00
const routine3WithMargin = routine3Split * 1.10; // $77.00

// Sum blended subtotal
const subtotal = 126.50 + 77.00 + 77.00; // $280.50
const tax = subtotal * 0.13; // $36.47
const total = subtotal + tax; // $316.97

// Margin for SD
const marginAmount = (126.50 - 115.00) + (77.00 - 70.00) + (77.00 - 70.00); // $25.50
```

**Fixed Dollar Per Routine:** $5 per routine

```typescript
const routine1WithMargin = 115.00 + 5.00; // $120.00
const routine2WithMargin = 70.00 + 5.00;  // $75.00
const routine3WithMargin = 70.00 + 5.00;  // $75.00

const subtotal = 120.00 + 75.00 + 75.00; // $270.00
const marginAmount = 5.00 * 3; // $15.00
```

### Per Dancer Calculation

**Example:** 10% per dancer

```typescript
// Sum dancer's original splits
const originalSubtotal = 115.00 + 70.00 + 70.00; // $255.00

// Apply margin once
const marginAmount = originalSubtotal * 0.10; // $25.50
const subtotal = originalSubtotal + marginAmount; // $280.50
const tax = subtotal * 0.13; // $36.47
const total = subtotal + tax; // $316.97
```

**Fixed Dollar Per Dancer:** $20 per dancer

```typescript
const originalSubtotal = 115.00 + 70.00 + 70.00; // $255.00
const marginAmount = 20.00; // Flat
const subtotal = originalSubtotal + marginAmount; // $275.00
const tax = subtotal * 0.13; // $35.75
const total = subtotal + tax; // $310.75
```

---

## Dancer Invoice Display (What Parents See)

### WITHOUT Margin

```
┌─────────────────────────────────────────┐
│ Family Invoice - Emma Johnson           │
├─────────────────────────────────────────┤
│ Routine Entries                         │
│ - Fly Away (Solo)            $115.00    │
├─────────────────────────────────────────┤
│ Subtotal:                    $115.00    │
│ Tax (13% HST):               $14.95     │
│ Total Due:                   $129.95    │
└─────────────────────────────────────────┘
```

### WITH 10% Margin (Parent View)

```
┌─────────────────────────────────────────┐
│ Family Invoice - Emma Johnson           │
├─────────────────────────────────────────┤
│ Routine Entries                         │
│ - Fly Away (Solo)            $126.50    │  ← Margin blended in
├─────────────────────────────────────────┤
│ Subtotal:                    $126.50    │  ← No "margin" line
│ Tax (13% HST):               $16.45     │  ← Tax on inflated subtotal
│ Total Due:                   $142.95    │
└─────────────────────────────────────────┘
```

**Key Points:**
- Routine fee shows $126.50 (not $115.00 + $11.50 margin)
- No line item for "margin" or "studio fee"
- Invoice recipient sees higher routine fee, doesn't know margin was added
- SD privately knows their $11.50 profit

---

## Database Schema Changes

### Add to `sub_invoices` table:

```sql
ALTER TABLE sub_invoices ADD COLUMN margin_type VARCHAR(50);
-- Values: 'percentage_per_routine' | 'fixed_per_routine' | 'percentage_per_dancer' | 'fixed_per_dancer' | NULL

ALTER TABLE sub_invoices ADD COLUMN margin_value NUMERIC(10,2);
-- The input value (e.g., 10 for 10%, or 5.00 for $5)

ALTER TABLE sub_invoices ADD COLUMN margin_amount NUMERIC(10,2);
-- The calculated dollar margin (e.g., $11.50)

ALTER TABLE sub_invoices ADD COLUMN original_subtotal NUMERIC(10,2);
-- Subtotal before margin (for SD reporting)
```

### Add to `invoices` table (main invoice):

```sql
ALTER TABLE invoices ADD COLUMN has_dancer_invoices BOOLEAN DEFAULT FALSE;
-- Track if this invoice has been split

ALTER TABLE invoices ADD COLUMN total_margin_applied NUMERIC(10,2);
-- Sum of all margin across dancer invoices (for SD reporting)
```

---

## Regeneration Workflow

### Scenario: SD wants to change margin

1. SD views main invoice detail page
2. Sees "👤 View Dancer Invoices (6)" button
3. Clicks button → sees list of 6 dancer invoices
4. Clicks "🔄 Regenerate with Different Margin" button
5. Modal opens with:
   - Previous margin settings pre-filled
   - Same preview calculator
   - Warning: "This will update all 6 dancer invoices"
6. SD adjusts margin, clicks "Regenerate"
7. Backend updates existing 6 dancer invoice records:
   - Recalculates line_items with new margin
   - Updates subtotal, tax, total
   - Updates margin_type, margin_value, margin_amount
   - Updates updated_at timestamp
8. Success message: "Dancer invoices regenerated with new margin"

---

## SD Reporting View

### Main Invoice Detail (SD View)

```
┌─────────────────────────────────────────────────┐
│ Invoice #INV-2026-LONDON-bf5bc843               │
│ Total Amount: $525.45                           │
│ Status: PAID ✓                                  │
├─────────────────────────────────────────────────┤
│ 📊 Your Margin Report                           │
│ Dancer Invoices Total: $577.95                  │
│ Main Invoice Total:    $525.45                  │
│ Your Margin:           $52.50 (10% per routine) │
├─────────────────────────────────────────────────┤
│ 👤 View Dancer Invoices (6)                     │
│ 🔄 Regenerate with Different Margin             │
│ 📥 Download All PDFs                            │
└─────────────────────────────────────────────────┘
```

---

## Validation Rules

1. **Margin value must be >= 0**
   - No negative margin
   - Zero margin allowed (no margin)

2. **Maximum reasonable check (warning only):**
   - If margin > 100%, show warning: "Are you sure? This will more than double the invoice amount"
   - If fixed margin > $100 per routine, show warning: "Are you sure? This adds $X to each routine"
   - Still allow if SD confirms

3. **Tax calculation:**
   - Always 13% HST on (original subtotal + margin)
   - Tax never applied to margin separately

4. **Regeneration limit:**
   - No limit on regenerations
   - Each regeneration overwrites previous dancer invoices

---

## Edge Cases

### 1. Dancer with Zero Routines (Should Never Happen)
- Skip in preview
- Don't create dancer invoice

### 2. Very Small Routine Fees (< $1)
- Margin still applies normally
- Could result in cents (e.g., $0.50 × 10% = $0.05)

### 3. Rounding with Percentage
- Always round to 2 decimal places
- Use banker's rounding (round to nearest even)

### 4. No Margin (Zero or Skipped)
- Store margin_type = NULL
- margin_value = 0
- margin_amount = 0
- Invoice totals match main invoice exactly

### 5. Main Invoice Changed After Split
- Dancer invoices are snapshots
- If CD changes main invoice, dancer invoices DON'T auto-update
- SD must regenerate manually if needed

---

## API Endpoints

### New Endpoint: `invoice.generateDancerInvoices`

```typescript
input: {
  invoiceId: string;
  margin?: {
    type: 'percentage_per_routine' | 'fixed_per_routine' | 'percentage_per_dancer' | 'fixed_per_dancer';
    value: number; // e.g., 10 for 10%, or 5.00 for $5
  };
}

output: {
  dancerInvoices: Array<{
    id: string;
    familyName: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    marginAmount: number; // For SD visibility only
  }>;
  totalMargin: number;
  mainInvoiceTotal: number;
  dancerInvoicesTotal: number;
}
```

### Updated Endpoint: `invoice.regenerateDancerInvoices`

```typescript
input: {
  invoiceId: string;
  margin?: {
    type: 'percentage_per_routine' | 'fixed_per_routine' | 'percentage_per_dancer' | 'fixed_per_dancer';
    value: number;
  };
}

output: {
  // Same as generateDancerInvoices
}
```

---

## Testing Requirements

### Before Implementation:
1. ✅ Add multi-routine test data (dancers in 5-7 routines)
2. ✅ Test split invoice calculation with complex scenarios
3. ✅ Verify sub-invoice totals aggregate correctly

### Unit Tests:
- [ ] Margin calculation: per routine, percentage
- [ ] Margin calculation: per routine, fixed dollar
- [ ] Margin calculation: per dancer, percentage
- [ ] Margin calculation: per dancer, fixed dollar
- [ ] Tax calculation on margin-adjusted subtotal
- [ ] Rounding edge cases
- [ ] Zero margin (no margin applied)
- [ ] Regeneration updates existing records

### Integration Tests:
- [ ] Generate dancer invoices without margin
- [ ] Generate dancer invoices with 10% per routine margin
- [ ] Generate dancer invoices with $5 per dancer margin
- [ ] Regenerate with different margin
- [ ] Verify main invoice total != dancer invoices total (when margin applied)
- [ ] Download all PDFs (with margin invisible)

### UI Tests:
- [ ] Live preview updates as SD types
- [ ] Toggle between % and $ preserves value
- [ ] Warning displays prominently
- [ ] Representative dancers shown in preview
- [ ] Regeneration modal pre-fills previous margin
- [ ] SD reporting view shows margin breakdown

---

## Success Criteria

- ✅ SD can add margin during dancer invoice generation
- ✅ Margin is completely invisible on dancer invoices (blended into subtotal)
- ✅ SD can regenerate infinite times with different margin
- ✅ Live preview shows accurate calculations for 2-3 dancers
- ✅ Tax calculated correctly on margin-adjusted subtotal
- ✅ SD reporting view shows profit breakdown
- ✅ No negative margin allowed
- ✅ Dancer invoices total > main invoice total (when margin applied)

---

## Future Enhancements (Out of Scope)

- [ ] Margin templates (save favorite margin settings)
- [ ] Per-routine-type margin (different % for solo vs trio)
- [ ] Margin analytics (track profit over time)
- [ ] Bulk apply margin to multiple main invoices
- [ ] Margin sharing (split profit with assistant teachers)

---

**Next Steps:**
1. Add multi-routine test data to existing test suite
2. Verify split invoice calculations with complex scenarios
3. Implement margin feature after testing complete
4. Test margin feature end-to-end
5. Deploy to production

---

**Status:** ✅ Specification Complete - Ready for Test Data Enhancement
