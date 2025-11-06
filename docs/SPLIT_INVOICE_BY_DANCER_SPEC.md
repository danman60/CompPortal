# Split Invoice by Dancer - Complete Implementation Spec

**Status:** Draft - Needs Review
**Date:** November 6, 2025
**Priority:** P1 - Critical (UI currently unreadable, feature broken)

---

## Overview

Allow Studio Directors (SD) to split a main competition invoice into individual dancer invoices with optional margin. Each dancer gets their own invoice showing only their routines and share of fees. Margin (if added) is blended invisibly into the subtotal.

---

## Current Issues

1. ❌ Database uses "family" terminology but backend splits by individual dancer
2. ❌ UI may have white-on-white text issues in some areas
3. ❌ No margin calculator functionality
4. ❌ Field naming mismatch: `family_identifier` stores `dancer_id`, `family_name` stores dancer name

---

## Database Changes

### Rename Existing Fields in `sub_invoices`

**Migration: `20251106_rename_family_to_dancer.sql`**

```sql
-- Rename family fields to dancer fields for clarity
ALTER TABLE sub_invoices
  RENAME COLUMN family_identifier TO dancer_id;

ALTER TABLE sub_invoices
  RENAME COLUMN family_name TO dancer_name;

-- Update index names
DROP INDEX IF EXISTS idx_sub_invoices_family;
CREATE INDEX idx_sub_invoices_dancer ON sub_invoices(dancer_id);

COMMENT ON COLUMN sub_invoices.dancer_id IS 'UUID of the dancer this invoice belongs to';
COMMENT ON COLUMN sub_invoices.dancer_name IS 'Full name of dancer (first + last name)';
```

### Add Margin Fields to `sub_invoices`

**Migration: `20251106_add_margin_fields.sql`**

```sql
-- Add margin tracking fields
ALTER TABLE sub_invoices ADD COLUMN margin_type VARCHAR(50);
COMMENT ON COLUMN sub_invoices.margin_type IS 'Type of margin applied: percentage_per_routine | fixed_per_routine | percentage_per_dancer | fixed_per_dancer | NULL (no margin)';

ALTER TABLE sub_invoices ADD COLUMN margin_value NUMERIC(10,2);
COMMENT ON COLUMN sub_invoices.margin_value IS 'Input value: 10 for 10% or 5.00 for $5 fixed';

ALTER TABLE sub_invoices ADD COLUMN margin_amount NUMERIC(10,2);
COMMENT ON COLUMN sub_invoices.margin_amount IS 'Calculated dollar margin for SD profit tracking';

ALTER TABLE sub_invoices ADD COLUMN original_subtotal NUMERIC(10,2);
COMMENT ON COLUMN sub_invoices.original_subtotal IS 'Subtotal before margin was added (for SD reporting)';

-- Add margin tracking to main invoices
ALTER TABLE invoices ADD COLUMN has_dancer_invoices BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN invoices.has_dancer_invoices IS 'True if this invoice has been split into dancer invoices';

ALTER TABLE invoices ADD COLUMN total_margin_applied NUMERIC(10,2);
COMMENT ON COLUMN invoices.total_margin_applied IS 'Sum of all margin across dancer invoices (for SD reporting)';
```

### Prisma Schema Updates

**File: `prisma/schema.prisma`**

```prisma
model sub_invoices {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parent_invoice_id String   @db.Uuid
  dancer_id         String   @db.VarChar(255)  // RENAMED from family_identifier
  dancer_name       String?  @db.VarChar(255)  // RENAMED from family_name
  line_items        Json
  subtotal          Decimal  @db.Decimal(10, 2)
  tax_rate          Decimal  @default(13.00) @db.Decimal(5, 2)
  tax_amount        Decimal  @db.Decimal(10, 2)
  total             Decimal  @db.Decimal(10, 2)
  status            String   @default("GENERATED") @db.VarChar(50)
  notes             String?

  // NEW: Margin fields
  margin_type       String?  @db.VarChar(50)
  margin_value      Decimal? @db.Decimal(10, 2)
  margin_amount     Decimal? @db.Decimal(10, 2)
  original_subtotal Decimal? @db.Decimal(10, 2)

  created_at        DateTime @default(now()) @db.Timestamp(6)
  updated_at        DateTime @default(now()) @db.Timestamp(6)
  tenant_id         String   @db.Uuid

  invoices          invoices @relation(fields: [parent_invoice_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  tenants           tenants  @relation(fields: [tenant_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([dancer_id], map: "idx_sub_invoices_dancer")  // RENAMED from family
  @@index([parent_invoice_id], map: "idx_sub_invoices_parent")
  @@index([tenant_id], map: "idx_sub_invoices_tenant")
  @@index([tenant_id, parent_invoice_id], map: "idx_sub_invoices_tenant_parent")
  @@schema("public")
}

model invoices {
  // ... existing fields ...

  // NEW: Dancer invoice tracking
  has_dancer_invoices   Boolean? @default(false)
  total_margin_applied  Decimal? @db.Decimal(10, 2)

  // ... existing relations ...
}
```

---

## UI Component: SplitInvoiceWizard

### File Structure

**File: `src/components/SplitInvoiceWizard.tsx`**

### Wizard Flow (3 Steps)

**Step 1: Business Rules + Margin Calculator**
- Collapsible business rules section
- Margin calculator with live preview
- Continue to Step 2

**Step 2: Confirm & Generate**
- Summary of margin settings
- "Generate Dancer Invoices" button
- Shows loading state

**Step 3: Success**
- Success message
- List of generated dancer invoices
- "Download All PDFs" button

### Step 1: Margin Calculator UI

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  📋 How Dancer Splitting Works (collapsible)        │
│  [Expand/Collapse]                                  │
│                                                     │
│  When expanded:                                    │
│  • Each dancer gets their own invoice              │
│  • Fees split equally per routine                  │
│  • Solo: 100%, Duet: 50%, Trio: 33.33%            │
│  • Tax calculated on each dancer's subtotal        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  💰 Add Margin (Optional)                           │
│  ⚠️ IMPORTANT: Margin will NOT appear on dancer     │
│  invoices. Parents see only blended subtotal + tax. │
├─────────────────────────────────────────────────────┤
│  Apply Margin:                                      │
│  ○ Per Routine    ○ Per Dancer                     │
│                                                     │
│  Margin Amount:                                     │
│  ○ Percentage [___]%   ○ Fixed Amount $[___]       │
│                                                     │
│  Your Estimated Margin: $XXX.XX across N dancers   │
├─────────────────────────────────────────────────────┤
│  📊 Preview (Representative Dancers):               │
│                                                     │
│  📄 Sarah Chen (1 routine - Solo)                  │
│  Original: $115.00 → With margin: $126.50         │
│  Tax (13%): $16.45 → Total: $142.95               │
│                                                     │
│  📄 Michael Rodriguez (3 routines - Mix)           │
│  Original: $255.00 → With margin: $280.50         │
│  Tax (13%): $36.47 → Total: $316.97               │
│                                                     │
│  📄 Emma Thompson (7 routines - Multiple groups)   │
│  Original: $485.00 → With margin: $533.50         │
│  Tax (13%): $69.36 → Total: $602.86               │
└─────────────────────────────────────────────────────┘

[Cancel]  [Continue to Confirm →]
```

### Preview Selection Logic

**Question:** How should I pick the 2-3 representative dancers to show in preview?

**Proposed Algorithm:**

1. **Categorize all dancers by routine count:**
   - Low: 1-2 routines
   - Medium: 3-5 routines
   - High: 6+ routines

2. **Pick representatives:**
   - Always show 1 from "Low" (if exists)
   - Always show 1 from "Medium" (if exists)
   - Show 1 from "High" (if exists)
   - If only 1-2 categories have dancers, show 2-3 from available categories

3. **Diversity criteria:**
   - Prefer different routine types (solo vs group)
   - Prefer dancers with different entry fees (to show variety)

**Alternative:** Random sample from each category?

**Question:** Should preview show:
- Exact routine titles for each dancer?
- Just summary: "7 routines: 5 group, 1 trio, 1 solo"?

---

## Margin Calculation Logic

### Per Routine - Percentage

**Example:** 10% per routine, Dancer in 3 routines

```typescript
// Entry 1: Solo ($115)
const entry1_original = 115.00;  // Dancer's 100% share
const entry1_margin = entry1_original * 0.10;  // $11.50
const entry1_with_margin = 126.50;

// Entry 2: Duet ($140 total)
const entry2_original = 70.00;   // Dancer's 50% share
const entry2_margin = entry2_original * 0.10;  // $7.00
const entry2_with_margin = 77.00;

// Entry 3: Trio ($210 total)
const entry3_original = 70.00;   // Dancer's 33.33% share
const entry3_margin = entry3_original * 0.10;  // $7.00
const entry3_with_margin = 77.00;

// Dancer Invoice
const original_subtotal = 255.00;
const blended_subtotal = 280.50;  // Shown on invoice (no "margin" line)
const margin_for_sd = 25.50;      // SD's profit (tracked in DB, not shown to parent)
const tax = 280.50 * 0.13 = 36.47;
const total = 316.97;
```

### Per Routine - Fixed Dollar

**Example:** $5 per routine, Dancer in 3 routines

```typescript
const entry1_with_margin = 115.00 + 5.00 = 120.00;
const entry2_with_margin = 70.00 + 5.00 = 75.00;
const entry3_with_margin = 70.00 + 5.00 = 75.00;

const original_subtotal = 255.00;
const blended_subtotal = 270.00;
const margin_for_sd = 15.00;
const tax = 270.00 * 0.13 = 35.10;
const total = 305.10;
```

### Per Dancer - Percentage

**Example:** 10% per dancer, Dancer in 3 routines

```typescript
const original_subtotal = 115.00 + 70.00 + 70.00 = 255.00;
const margin_for_sd = 255.00 * 0.10 = 25.50;
const blended_subtotal = 280.50;
const tax = 280.50 * 0.13 = 36.47;
const total = 316.97;

// Line items still show individual routine fees with margin blended proportionally
// OR all margin added to subtotal as single invisible amount?
```

**Question:** For "per dancer" percentage, should margin be:
- **Option A:** Distributed proportionally across routine line items?
- **Option B:** Added as invisible lump sum to subtotal (simpler)?

### Per Dancer - Fixed Dollar

**Example:** $20 per dancer, Dancer in 3 routines

```typescript
const original_subtotal = 255.00;
const margin_for_sd = 20.00;
const blended_subtotal = 275.00;
const tax = 275.00 * 0.13 = 35.75;
const total = 310.75;
```

---

## What Parents See on Dancer Invoice

### WITHOUT Margin

```
┌─────────────────────────────────────────┐
│ Dancer Invoice - Sarah Chen             │
│ Competition: EMPWR 2026                 │
├─────────────────────────────────────────┤
│ Routine Entries                         │
│ #42  Fly Away (Solo)          $115.00   │
├─────────────────────────────────────────┤
│ Subtotal:                     $115.00   │
│ Tax (13% HST):                $14.95    │
│ Total Due:                    $129.95   │
└─────────────────────────────────────────┘
```

### WITH 10% Per Routine Margin

```
┌─────────────────────────────────────────┐
│ Dancer Invoice - Sarah Chen             │
│ Competition: EMPWR 2026                 │
├─────────────────────────────────────────┤
│ Routine Entries                         │
│ #42  Fly Away (Solo)          $126.50   │  ← Margin blended in
├─────────────────────────────────────────┤
│ Subtotal:                     $126.50   │  ← No "margin" line
│ Tax (13% HST):                $16.45    │  ← Tax on inflated subtotal
│ Total Due:                    $142.95   │
└─────────────────────────────────────────┘
```

**Question:** For PDF generation, should the routine line items show:
- Original amount ($115.00) with margin hidden in subtotal?
- Inflated amount ($126.50) per routine?

I think inflated per-routine makes more sense for "per routine" margin, but what about "per dancer" margin?

---

## Backend API Changes

### Update `invoice.splitInvoice` Mutation

**File: `src/server/routers/invoice.ts`**

**New Input Schema:**

```typescript
splitInvoice: protectedProcedure
  .input(z.object({
    invoiceId: z.string().uuid(),
    margin: z.object({
      type: z.enum([
        'percentage_per_routine',
        'fixed_per_routine',
        'percentage_per_dancer',
        'fixed_per_dancer'
      ]),
      value: z.number().min(0), // No negative margin
    }).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // ... existing validation ...

    // Calculate margin for each dancer
    const marginConfig = input.margin;

    dancerMap.forEach((dancerData, dancerId) => {
      let originalSubtotal = dancerData.subtotal;
      let marginAmount = 0;
      let adjustedSubtotal = originalSubtotal;

      if (marginConfig) {
        if (marginConfig.type === 'percentage_per_routine') {
          // Apply margin to each routine individually
          dancerData.lineItems = dancerData.lineItems.map(item => {
            const itemMargin = item.amount * (marginConfig.value / 100);
            const itemWithMargin = item.amount + itemMargin;
            marginAmount += itemMargin;
            return { ...item, amount: itemWithMargin };
          });
          adjustedSubtotal = originalSubtotal + marginAmount;
        }
        else if (marginConfig.type === 'fixed_per_routine') {
          // Add fixed dollar to each routine
          const routineCount = dancerData.lineItems.length;
          marginAmount = marginConfig.value * routineCount;
          dancerData.lineItems = dancerData.lineItems.map(item => ({
            ...item,
            amount: item.amount + marginConfig.value
          }));
          adjustedSubtotal = originalSubtotal + marginAmount;
        }
        else if (marginConfig.type === 'percentage_per_dancer') {
          // Apply margin to total
          marginAmount = originalSubtotal * (marginConfig.value / 100);
          adjustedSubtotal = originalSubtotal + marginAmount;
        }
        else if (marginConfig.type === 'fixed_per_dancer') {
          // Add fixed dollar per dancer
          marginAmount = marginConfig.value;
          adjustedSubtotal = originalSubtotal + marginAmount;
        }
      }

      const taxAmount = adjustedSubtotal * (taxRate / 100);
      const total = adjustedSubtotal + taxAmount;

      // Create sub_invoice with margin tracking
      await prisma.sub_invoices.create({
        data: {
          parent_invoice_id: invoice.id,
          dancer_id: dancerId,  // RENAMED from family_identifier
          dancer_name: dancerData.dancer_name,  // RENAMED from family_name
          line_items: dancerData.lineItems,
          subtotal: adjustedSubtotal,  // Blended subtotal (with margin)
          original_subtotal: originalSubtotal,  // Before margin
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: total,
          margin_type: marginConfig?.type || null,
          margin_value: marginConfig?.value || null,
          margin_amount: marginAmount,
          tenant_id: ctx.tenantId!,
        }
      });
    });

    // Update main invoice tracking
    const totalMargin = Array.from(dancerMap.values())
      .reduce((sum, d) => sum + d.marginAmount, 0);

    await prisma.invoices.update({
      where: { id: invoice.id },
      data: {
        has_dancer_invoices: true,
        total_margin_applied: totalMargin,
      }
    });

    return {
      success: true,
      sub_invoice_count: dancerMap.size,
      total_margin: totalMargin,
      dancers: Array.from(dancerMap.values()).map(d => ({
        name: d.dancer_name,
        id: d.dancer_id,
        original_total: d.original_subtotal,
        final_total: d.adjusted_subtotal + d.tax_amount,
        margin: d.marginAmount,
      }))
    };
  });
```

---

## SD Reporting View

**Question:** Where should SD see margin breakdown?

**Option A:** Invoice detail page shows margin report

```
┌─────────────────────────────────────────────────┐
│ Invoice #INV-2026-LONDON-bf5bc843               │
│ Main Invoice Total: $525.45 (PAID ✓)           │
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

**Option B:** Separate "Margin Report" page under Invoices

**Option C:** Show in dancer invoice list view (table row)

Which do you prefer?

---

## Regeneration Workflow

**Question:** How should regeneration work?

**Proposed Flow:**

1. SD clicks "🔄 Regenerate with Different Margin" button
2. Modal opens with:
   - Previous margin settings pre-filled
   - Same 3-step wizard
   - Warning: "This will update all 6 dancer invoices. Previously downloaded PDFs will be outdated."
3. SD adjusts margin, clicks "Regenerate"
4. Backend:
   - Deletes existing `sub_invoices` records (cascade safe, soft delete?)
   - Runs same split logic with new margin
   - Creates new `sub_invoices` records
5. Success message: "Dancer invoices regenerated"

**Alternative:** Update existing records instead of delete/recreate?

**Question:** Should regeneration:
- **Option A:** Hard delete old sub_invoices, create new ones?
- **Option B:** Update existing sub_invoices in place (preserve IDs)?
- **Option C:** Soft delete (add `deleted_at` field), create new ones?

---

## Validation Rules

1. **Margin value >= 0** (no negative margin)
2. **Invoice must be PAID** before splitting (already enforced)
3. **Warning if margin > 100%:** "Are you sure? This will more than double the invoice amount"
4. **Warning if fixed > $100/routine:** "Are you sure? This adds $X to each routine"
5. **Tax always 13% HST** on (original + margin)
6. **Rounding:** Always 2 decimal places, banker's rounding

---

## Edge Cases

### 1. Dancer with 0 routines
- Should never happen (entries have participants)
- Skip in preview if somehow occurs

### 2. Very small fees (< $1)
- Margin still applies normally
- May result in cents (e.g., $0.50 × 10% = $0.05)

### 3. Per-dancer margin with 1 routine
- Same calculation as per-routine (functionally identical)

### 4. Toggle between % and $ in UI
**Question:** When SD switches from "10%" to "$", should I:
- **Option A:** Show dollar equivalent but allow manual edit?
- **Option B:** Clear field, require new input?
- **Option C:** Convert and lock (can't manually edit dollar amount)?

### 5. Rounding drift
- Total of all dancer invoices may not equal main invoice exactly due to rounding
- Acceptable? Or should I apply rounding adjustment to last dancer?

---

## Testing Requirements

### Unit Tests
- [ ] Margin calculation: per routine, percentage (10%, 25%, 100%)
- [ ] Margin calculation: per routine, fixed ($5, $10, $50)
- [ ] Margin calculation: per dancer, percentage (10%, 25%)
- [ ] Margin calculation: per dancer, fixed ($20, $50)
- [ ] Tax calculation on margin-adjusted subtotal
- [ ] Rounding edge cases (odd cents)
- [ ] Zero margin (no margin applied)

### Integration Tests
- [ ] Split without margin
- [ ] Split with 10% per routine margin
- [ ] Split with $5 per dancer margin
- [ ] Regenerate with different margin
- [ ] Verify main invoice total != dancer invoices total (when margin)

### UI Tests (Playwright)
- [ ] Live preview updates as SD types
- [ ] Toggle between % and $ preserves value
- [ ] Warning displays when margin > 100%
- [ ] Representative dancers shown (low/medium/high routine counts)
- [ ] Dark theme readable on all steps
- [ ] Generate button disabled during loading

---

## Decisions (Confirmed)

### 1. Preview Display ✅
**Answer:** Option A - Show exact routine titles
- Format: "📄 Sarah Chen (1 routine) - Fly Away (Solo) - Original: $115.00 → With margin: $126.50"

### 2. Per-Dancer Margin Distribution ✅
**Answer:** Option A - Distribute across routine line items proportionally
- Matches final invoice calculation
- Each routine gets proportional share of margin

### 3. Regeneration Strategy ✅
**Answer:** Option A - Hard delete old, create new
- Delete all 6 old dancer invoices
- Create 6 new dancer invoices with new IDs/timestamps

### 4. SD Margin Reporting ✅
**Answer:** Show in preview as "Preview Dancer Invoices (5)"
- Display margin summary in Step 3 success view
- Show count of generated dancer invoices

### 5. Toggle % ↔ $ Behavior ✅
**Answer:** Auto-calculate and lock
- When switching from % to $, show calculated amount but prevent manual edit
- Must switch back to % mode to change value

### 6. Rounding Drift ✅
**Answer:** Option B - Apply adjustment to last dancer
- Force exact match between main invoice and sum of dancer invoices
- Add/subtract pennies from last dancer alphabetically

### 7. PDF Display ✅
**Answer:** Option A - Inflated amounts per routine
- Routine line items show margin-adjusted amounts ($126.50)
- Matches "distribute across routines" approach

---

## Success Criteria

- ✅ Database fields renamed: `family_identifier` → `dancer_id`, `family_name` → `dancer_name`
- ✅ Margin fields added to `sub_invoices` table
- ✅ SD can add margin during split (4 types: % or $ per routine/dancer)
- ✅ Live preview shows 2-3 representative dancers with variety
- ✅ Margin completely invisible on dancer invoices (blended into subtotal)
- ✅ Dark theme readable across all 3 wizard steps
- ✅ SD can regenerate with different margin
- ✅ Margin breakdown shown in SD reporting view
- ✅ No negative margin allowed
- ✅ Tax calculated correctly on margin-adjusted subtotal

---

## Implementation Order

1. **Database migrations** (rename family → dancer, add margin fields)
2. **Prisma schema update** + regenerate client
3. **Backend API changes** (split logic with margin calculation)
4. **UI wizard rebuild** (3 steps with margin calculator)
5. **SD reporting view** (show margin breakdown)
6. **Testing** (unit + integration + UI)
7. **Deploy** to production

---

**Next Step:** Review this spec, answer open questions, then I'll begin implementation.
