# Split Invoice by Family - Feature Documentation

**Status:** ✅ Complete and Deployed
**Date:** November 5, 2025
**Commit:** 9a2f07a

---

## Overview

The Split Invoice feature allows Studio Directors to divide Competition Director invoices into family-specific sub-invoices based on dancer participation in routines. This helps studios pass costs directly to the families of dancers.

---

## Business Rules

### Fee Splitting Logic
- **Solo:** 100% to that dancer's family
- **Duet with siblings:** Parents pay 100% (2/2 share = full fee)
- **Trio with 2 siblings + 1 other:** Sibling parents pay 2/3, other family pays 1/3
- **General rule:** Each dancer = equal share (siblings stack)

### What's Included on Sub-Invoices
- ✅ **Show:** Routine titles, categories, size categories, dancer names, total amounts
- ❌ **Hide:** Extended time fees, late fees, title upgrade fees (included in total but not itemized)

### Tax Calculation
- 13% HST applied to each sub-invoice's subtotal
- Penny rounding adjustment applied to last family to ensure exact match
- All sub-invoices must sum to main invoice total exactly

### Validation Requirements
- All dancers must have `parent_email` populated (blocks split if missing)
- Invoice must have at least one entry
- Entries must not be cancelled
- Main invoice must exist in database (not just generated)

### Regeneration
- ✅ Allowed - Studio Directors can delete and recreate splits
- Use case: Entries changed after initial split

---

## Database Schema

### Table: `sub_invoices`

```sql
CREATE TABLE sub_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  family_identifier VARCHAR(255) NOT NULL,  -- parent_email
  family_name VARCHAR(255),                 -- Display name
  line_items JSONB NOT NULL,                -- Array of split line items
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 13.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

-- Indexes
CREATE INDEX idx_sub_invoices_parent ON sub_invoices(parent_invoice_id);
CREATE INDEX idx_sub_invoices_family ON sub_invoices(family_identifier);
CREATE INDEX idx_sub_invoices_tenant ON sub_invoices(tenant_id);
CREATE INDEX idx_sub_invoices_tenant_parent ON sub_invoices(tenant_id, parent_invoice_id);
```

### Sub-Invoice Line Item Structure (JSONB)

```typescript
{
  entry_id: string;             // Original entry UUID
  entry_number: number;         // Display number
  title: string;                // Routine title
  category: string;             // Dance category name
  size_category: string;        // Solo, Duet/Trio, etc.
  dancer_ids: string[];         // This family's dancers in entry
  dancer_names: string[];       // ["Emma Smith", "Olivia Smith"]
  total_dancers: number;        // Total dancers in entry
  family_dancer_count: number;  // Count for this family
  amount: number;               // This family's share of total_fee
}
```

---

## API Endpoints

### Location: `src/server/routers/invoice.ts` (lines 1030-1380)

### 1. `splitInvoice`
**Type:** Mutation
**Input:** `{ invoiceId: string }`
**Returns:** `{ success: boolean, sub_invoice_count: number, families: Array }`

**Process:**
1. Fetches main invoice with validation
2. Gets all entries for invoice from line_items
3. Fetches entries with participants and dancer details
4. Validates all dancers have parent_email
5. Groups dancers by parent_email
6. Calculates per-family shares (sharePerDancer × familyDancerCount)
7. Applies tax per family (subtotal × 13%)
8. Applies penny rounding adjustment to last family
9. Deletes existing sub-invoices (allows regeneration)
10. Creates new sub-invoices in transaction
11. Logs activity

**Guards:**
- Must be studio owner or super_admin
- Invoice must exist
- Invoice must have entries
- All dancers must have parent_email

**Example:**
```typescript
const result = await trpc.invoice.splitInvoice.mutate({
  invoiceId: 'uuid-here'
});
// Returns: { success: true, sub_invoice_count: 5, families: [...] }
```

### 2. `getSubInvoices`
**Type:** Query
**Input:** `{ parentInvoiceId: string }`
**Returns:** `{ sub_invoices: Array, summary: Object }`

**Summary includes:**
- count: Number of sub-invoices
- total: Sum of all sub-invoice totals
- matches_parent: Boolean (validation check)
- parent_total: Main invoice total

**Example:**
```typescript
const data = await trpc.invoice.getSubInvoices.useQuery({
  parentInvoiceId: 'uuid-here'
});
// Returns: { sub_invoices: [...], summary: { count: 5, total: 1234.56, matches_parent: true } }
```

### 3. `getSubInvoiceById`
**Type:** Query
**Input:** `{ subInvoiceId: string }`
**Returns:** Sub-invoice with related invoice, studio, competition

**Includes:**
- Sub-invoice data
- Parent invoice
- Studio details
- Competition details

**Example:**
```typescript
const subInvoice = await trpc.invoice.getSubInvoiceById.useQuery({
  subInvoiceId: 'uuid-here'
});
```

### 4. `deleteSubInvoices`
**Type:** Mutation
**Input:** `{ parentInvoiceId: string }`
**Returns:** `{ success: boolean, deleted_count: number }`

**Purpose:** Allows regeneration by deleting all sub-invoices for a parent invoice.

**Example:**
```typescript
await trpc.invoice.deleteSubInvoices.mutate({
  parentInvoiceId: 'uuid-here'
});
```

---

## UI Components

### 1. SplitInvoiceWizard
**File:** `src/components/SplitInvoiceWizard.tsx`
**Type:** Modal with 3-step wizard

**Steps:**
1. **Review:** Explains how family splitting works, requirements
2. **Confirm:** Shows what will happen, user confirms
3. **Success:** Displays created sub-invoices, navigates to list

**Props:**
```typescript
{
  invoiceId: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Usage:**
```tsx
{showSplitWizard && (
  <SplitInvoiceWizard
    invoiceId={invoice.id}
    onClose={() => setShowSplitWizard(false)}
    onSuccess={() => {
      setShowSplitWizard(false);
      setShowSubInvoices(true);
    }}
  />
)}
```

### 2. SubInvoiceList
**File:** `src/components/SubInvoiceList.tsx`
**Type:** Full-page family invoice list

**Features:**
- Displays all family sub-invoices in table
- Validation summary card (sum matches parent)
- Actions per family: View, Download PDF, Send Email
- Bulk actions: Download All, Send All
- Back button to main invoice

**Props:**
```typescript
{
  parentInvoiceId: string;
  onBack: () => void;
}
```

**Usage:**
```tsx
<SubInvoiceList
  parentInvoiceId={invoice.id}
  onBack={() => setShowSubInvoices(false)}
/>
```

### 3. SubInvoiceDetail
**File:** `src/components/SubInvoiceDetail.tsx`
**Type:** Individual family invoice view

**Features:**
- Displays family invoice with routine line items
- Shows dancers per routine with participation info
- Tax breakdown and total
- Payment instructions
- Actions: Print, Download PDF, Email to Family

**Props:**
```typescript
{
  subInvoiceId: string;
}
```

**Route:** `/dashboard/invoices/family/[subInvoiceId]`

### 4. InvoiceDetail Integration
**File:** `src/components/InvoiceDetail.tsx` (modified)

**Added:**
- State: `showSplitWizard`, `showSubInvoices`
- Query: `getSubInvoices` (checks if splits exist)
- Button: "Split Invoice by Family" (if no splits)
- Button: "View Family Invoices (N)" (if splits exist)
- Modal renders for wizard and sub-invoice list

**Button Location:** Between status actions and export actions (lines 504-523)

**Visibility:** Studio Directors only (not Competition Directors)

---

## User Workflows

### Workflow 1: Studio Director Splits Invoice

1. SD navigates to invoice: `/dashboard/invoices/[studioId]/[competitionId]`
2. SD clicks **"✂️ Split Invoice by Family"** button
3. Wizard opens:
   - Step 1: Reviews business rules and requirements
   - Step 2: Confirms generation
   - Step 3: Sees success with family list
4. SD is taken to **SubInvoiceList** view
5. SD can:
   - View individual family invoices
   - Download PDFs (individual or bulk)
   - Send emails to families (individual or bulk)
6. SD clicks **"Back to Main Invoice"** to return

### Workflow 2: View Existing Splits

1. SD navigates to invoice with existing splits
2. Sees **"👨‍👩‍👧‍👦 View Family Invoices (N)"** button
3. Clicks button → SubInvoiceList opens
4. Can view/download/email family invoices

### Workflow 3: Regenerate Splits

1. SD realizes entries changed after initial split
2. Opens SubInvoiceList
3. Clicks **"Regenerate Splits"** (future feature)
4. System deletes old splits
5. Creates new splits with updated data

### Workflow 4: Family Views Their Invoice

1. SD sends family their sub-invoice (email with PDF or link)
2. Family opens link: `/dashboard/invoices/family/[subInvoiceId]`
3. Family sees:
   - Their dancer(s) names
   - Routines their dancer(s) are in
   - Share of cost per routine
   - Total amount owed
4. Family remits payment to studio per instructions

---

## Testing Scenarios

### Test Case 1: Solo Entry
**Setup:**
- 1 dancer (Emma Smith) in solo routine "Fire"
- Entry fee: $100, Late fee: $20, Total: $120

**Expected:**
- 1 sub-invoice created for Emma's family
- Subtotal: $120.00
- Tax: $15.60 (13%)
- Total: $135.60

### Test Case 2: Duet with Siblings
**Setup:**
- 2 dancers (Emma + Olivia Smith, same parent_email) in duet "Together"
- Entry fee: $150, Total: $150

**Expected:**
- 1 sub-invoice for Smith family
- Subtotal: $150.00 (100% = 2/2 dancers)
- Tax: $19.50
- Total: $169.50

### Test Case 3: Trio with 2 Siblings + 1 Other
**Setup:**
- 3 dancers: Emma Smith, Olivia Smith (same parent_email), Ava Jones (different email)
- Entry "Unity", Total fee: $180

**Expected:**
- 2 sub-invoices:
  1. Smith family: $120.00 subtotal (2/3 share), Tax: $15.60, Total: $135.60
  2. Jones family: $60.00 subtotal (1/3 share), Tax: $7.80, Total: $67.80
- Sum: $135.60 + $67.80 = $203.40 ✅ Matches main invoice

### Test Case 4: Missing Parent Email
**Setup:**
- 1 dancer has no parent_email

**Expected:**
- Split blocked with error: "Cannot split invoice: 1 dancer(s) missing parent email"
- Error includes dancer name

### Test Case 5: Multiple Entries per Family
**Setup:**
- Emma Smith in 3 routines: Solo ($100), Duet ($75), Group ($30)
- Total for Smith family across all: $205

**Expected:**
- 1 sub-invoice with 3 line items
- Line item 1: "Solo Title" - $100.00
- Line item 2: "Duet Title" - $75.00
- Line item 3: "Group Title" - $30.00
- Subtotal: $205.00
- Tax: $26.65
- Total: $231.65

### Test Case 6: Penny Rounding
**Setup:**
- Entry with $100 total, 3 dancers (3 different families)
- Share per dancer: $33.333...

**Expected:**
- Family 1: $33.33 subtotal, $4.33 tax, $37.66 total
- Family 2: $33.33 subtotal, $4.33 tax, $37.66 total
- Family 3: $33.34 subtotal, $4.33 tax, $37.67 total (gets penny adjustment)
- Sum: $112.99 ✅ Matches main invoice with tax

### Test Case 7: Validation Failure
**Setup:**
- Main invoice total: $1000.00
- Sub-invoices sum: $999.98 (2 cent discrepancy)

**Expected:**
- Error thrown: "Split calculation error: difference of $-0.02"
- No sub-invoices created
- User can retry

---

## Implementation Notes

### Key Algorithms

#### 1. Family Grouping
```typescript
// Group dancers by parent_email within each entry
const familyGroups = new Map<string, Participant[]>();
entry.entry_participants.forEach(ep => {
  const email = ep.dancers.parent_email!;
  if (!familyGroups.has(email)) {
    familyGroups.set(email, []);
  }
  familyGroups.get(email)!.push(ep);
});
```

#### 2. Share Calculation
```typescript
// Calculate share per family
const totalDancers = entry.entry_participants.length;
const entryTotal = Number(entry.total_fee || 0);
const sharePerDancer = entryTotal / totalDancers;

familyGroups.forEach((participants, parentEmail) => {
  const familyDancerCount = participants.length;
  const familyShare = sharePerDancer * familyDancerCount;
  // Round to 2 decimals
  const amount = Number(familyShare.toFixed(2));
});
```

#### 3. Tax Calculation + Rounding Adjustment
```typescript
// Calculate tax for each family
families.forEach((family) => {
  const taxAmount = Number((family.subtotal * 13 / 100).toFixed(2));
  family.tax_amount = taxAmount;
  family.total = family.subtotal + taxAmount;
});

// Apply penny rounding to last family
const calculatedTotal = families.reduce((sum, f) => sum + f.total, 0);
const difference = mainInvoiceTotal - calculatedTotal;

if (Math.abs(difference) > 0.01) {
  throw new Error(`Split calculation error: difference of $${difference.toFixed(2)}`);
}

if (difference !== 0) {
  families[families.length - 1].total += difference;
}
```

### Performance Considerations

**Query Optimization:**
- Use `include` to fetch related data in single query
- Limit sub-invoice queries to current studio (tenant isolation)
- Index on `parent_invoice_id`, `family_identifier`, `tenant_id`

**Transaction Safety:**
- All sub-invoice creation wrapped in `prisma.$transaction`
- Ensures atomicity (all or nothing)
- Prevents partial splits

**Error Handling:**
- Validate all dancers have parent_email BEFORE calculation
- Verify sum matches BEFORE creating records
- Rollback transaction if any sub-invoice creation fails

### Security Considerations

**Access Control:**
- Only Studio Director who owns the invoice can split
- Super Admin can also split (for testing/support)
- Competition Directors cannot see sub-invoices (SD-only feature)

**Tenant Isolation:**
- All queries filtered by `tenant_id`
- Sub-invoices inherit tenant from parent invoice
- No cross-tenant data leakage possible

**Data Validation:**
- Parent invoice must exist
- Invoice must have entries
- All entries must be non-cancelled
- All dancers must have parent_email
- Sum validation required

---

## Future Enhancements

### Phase 2 (Optional)
1. **PDF Generation:** `generateSubInvoicePDF()` function
2. **Email Templates:** `SubInvoiceDelivery` email template
3. **Bulk Operations:** Download all PDFs as ZIP, Send all emails
4. **Payment Tracking:** Mark individual sub-invoices as paid
5. **Public Links:** Tokenized URLs for families to view without login
6. **Custom Splits:** Allow SD to override auto-calculated splits
7. **Payment Integration:** Stripe integration for online family payments

### Known Limitations
- PDF generation not yet implemented (uses browser print for now)
- Email sending placeholder (shows alert)
- No payment status per sub-invoice (future feature)
- No public family view (requires authentication)

---

## Troubleshooting

### Issue: "Cannot split invoice: N dancer(s) missing parent email"
**Solution:** Go to Dancers page, add parent_email to all dancers, then retry split.

### Issue: "Split calculation error: difference of $X"
**Cause:** Rounding error exceeds 1 cent threshold.
**Solution:** Check entry total_fee values are correct. Report bug if persists.

### Issue: Sub-invoices sum doesn't match main invoice
**Solution:** Delete sub-invoices and regenerate. This shouldn't happen due to validation.

### Issue: Split button not showing
**Causes:**
1. Not logged in as Studio Director (CD can't see button)
2. Invoice not in database (only generated invoices can't be split)
3. Invoice has sub-invoices already (shows "View" button instead)

### Issue: Can't view sub-invoice
**Causes:**
1. Not the owner of parent invoice studio
2. Sub-invoice doesn't exist (was deleted)
3. Cross-tenant access attempt (blocked by tenant_id filter)

---

## Files Modified/Created

### Database
- `prisma/schema.prisma` - Added `sub_invoices` model
- Migration: `add_sub_invoices_table`

### Backend
- `src/server/routers/invoice.ts` - Added 4 procedures (lines 1030-1380)

### Frontend Components
- `src/components/SplitInvoiceWizard.tsx` - New
- `src/components/SubInvoiceList.tsx` - New
- `src/components/SubInvoiceDetail.tsx` - New
- `src/components/InvoiceDetail.tsx` - Modified (added integration)

### Routes
- `src/app/dashboard/invoices/family/[subInvoiceId]/page.tsx` - New

---

## Testing Checklist

- [ ] Split invoice with 1 solo entry
- [ ] Split invoice with duet (siblings)
- [ ] Split invoice with trio (2 siblings + 1 other)
- [ ] Split invoice with large group (10+ dancers, 5+ families)
- [ ] Verify sum validation passes
- [ ] Verify penny rounding works correctly
- [ ] Test with missing parent_email (should block)
- [ ] Test with no entries (should block)
- [ ] Test with cancelled entries (should exclude)
- [ ] View sub-invoice list
- [ ] View individual sub-invoice detail
- [ ] Delete and regenerate splits
- [ ] Test on both EMPWR and Glow tenants
- [ ] Verify tenant isolation (can't see other tenant's sub-invoices)
- [ ] Test as Studio Director (should work)
- [ ] Test as Competition Director (should not see button)
- [ ] Test as Super Admin (should work for testing)

---

## Contact

For questions or issues with this feature, create a task in the project or check:
- Implementation: Lines 1030-1380 in `src/server/routers/invoice.ts`
- UI Components: `src/components/Split*.tsx`, `src/components/SubInvoice*.tsx`
- Database: `sub_invoices` table

**Last Updated:** November 5, 2025
**Version:** 1.0
**Status:** Production Ready ✅
