# Task: Hide Pricing from Studio Directors

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 1 hour
**Status**: Ready for Codex

---

## Context

Studio Directors should NOT see pricing information. Pricing should only be visible to Competition Directors in invoice views. Backend calculates pricing silently.

**Current Problem**: Pricing may be visible in some Studio Director views
**Goal**: Hide all pricing from Studio Directors, show only to Competition Directors

---

## Implementation Strategy

### 1. Find All Pricing References

**Search for pricing displays**:
```bash
grep -r "price\|cost\|amount\|total\|fee\|invoice" src/components/ src/app/dashboard/
```

**Common fields to check**:
- `price`
- `total_amount`
- `entry_fee`
- `routine_cost`
- `subtotal`
- `discount`
- `$` symbols

---

### 2. Add Role-Based Conditional Rendering

**Pattern to use**:
```typescript
// Get user role from context
const { userRole } = useUser(); // or from tRPC context

// Conditional rendering
{userRole === 'competition_director' || userRole === 'super_admin' ? (
  <div className="text-white">
    Price: ${price.toFixed(2)}
  </div>
) : null}
```

---

## Files to Modify

### Priority 1: Entry/Routine Lists

**File**: `src/components/EntriesList.tsx`

**Remove/Hide**:
- Any `price` or `cost` columns in table view
- Any pricing info in card view
- Total cost summaries

**Example**:
```tsx
// BEFORE
<td className="py-3 text-gray-400">${entry.price}</td>

// AFTER
{(userRole === 'competition_director' || userRole === 'super_admin') && (
  <td className="py-3 text-gray-400">${entry.price}</td>
)}
```

### Priority 2: Routine Details

**File**: `src/components/EntryDetails.tsx` or `src/app/dashboard/entries/[id]/page.tsx`

**Hide**:
- Pricing breakdown
- Individual routine costs
- Fee structure

### Priority 3: Reservation Views

**File**: `src/components/ReservationsList.tsx`

**Hide from Studio Directors**:
- Estimated costs
- Per-routine pricing
- Total invoice amounts

**Show to Competition Directors**:
- All pricing information
- Invoice generation options

### Priority 4: Invoice Pages

**File**: `src/app/dashboard/invoices/page.tsx`

**Studio Director View**:
- Show invoice status (paid/unpaid)
- Show due dates
- HIDE: Line item details, per-routine costs

**Competition Director View**:
- Show all pricing information
- Show full invoice breakdown
- Allow editing

---

## Role Detection Pattern

**Option A**: Get from tRPC context
```typescript
'use client';
import { trpc } from '@/lib/trpc';

export default function Component() {
  const { data: user } = trpc.auth.getUser.useQuery();
  const isDirector = user?.role === 'competition_director' || user?.role === 'super_admin';

  return (
    <>
      {/* Always visible */}
      <div>Routine Name</div>

      {/* Only for directors */}
      {isDirector && (
        <div>Price: ${routine.price}</div>
      )}
    </>
  );
}
```

**Option B**: Get from props (if passed from server component)
```typescript
export default function Component({ userRole }: { userRole: string }) {
  const isDirector = userRole === 'competition_director' || userRole === 'super_admin';
  // ...
}
```

**Option C**: Check from page props
```typescript
// In page.tsx (server component)
const userProfile = await prisma.user_profiles.findUnique({
  where: { id: user.id },
  select: { role: true }
});

const isDirector = userProfile?.role === 'competition_director' ||
                   userProfile?.role === 'super_admin';

// Pass to client component
<EntriesList isDirector={isDirector} />
```

---

## Specific Changes Needed

### EntriesList.tsx

**Table View**:
```tsx
{/* Remove or conditionally hide */}
{isDirector && (
  <th className="pb-3 text-gray-300 font-medium">Price</th>
)}

{/* In table rows */}
{isDirector && (
  <td className="py-3 text-gray-400">${entry.price?.toFixed(2) || 'N/A'}</td>
)}
```

**Card View**:
```tsx
<div className="bg-white/5 rounded-lg p-4">
  <h3>{entry.routine_title}</h3>
  <p>{entry.dance_category}</p>

  {/* Only show to directors */}
  {isDirector && entry.price && (
    <p className="text-purple-400">${entry.price.toFixed(2)}</p>
  )}
</div>
```

### ReservationsList.tsx

**Hide estimated totals**:
```tsx
{/* Only show to directors */}
{isDirector && (
  <div className="mt-4 border-t border-white/10 pt-4">
    <div className="flex justify-between">
      <span>Estimated Total:</span>
      <span className="font-bold">${estimatedTotal.toFixed(2)}</span>
    </div>
  </div>
)}
```

### Invoice Views

**Studio Director Invoice Page** (`src/app/dashboard/invoices/page.tsx`):
```tsx
{/* Show status only */}
<div className="bg-white/10 rounded-lg p-4">
  <div className="flex justify-between items-center">
    <div>
      <h3>Invoice #{invoice.id.slice(0, 8)}</h3>
      <p className="text-sm text-gray-400">Competition: {invoice.competition_name}</p>
    </div>
    <div>
      {invoice.paid ? (
        <span className="text-green-400">✓ Paid</span>
      ) : (
        <span className="text-yellow-400">Pending</span>
      )}
    </div>
  </div>

  {/* DON'T show pricing breakdown to studios */}
  {isDirector && (
    <div className="mt-4 text-white">
      Total: ${invoice.total_amount.toFixed(2)}
    </div>
  )}
</div>
```

---

## Backend Consideration

**Ensure pricing calculation happens server-side**:
- tRPC mutations should calculate pricing
- Don't send pricing in query responses for Studio Directors
- Filter in tRPC resolver based on user role

**Example tRPC Pattern**:
```typescript
// In entry.getAll query
.query(async ({ ctx }) => {
  const entries = await prisma.entries.findMany({...});

  // Filter pricing based on role
  if (ctx.userRole === 'studio_director') {
    return entries.map(({ price, ...entry }) => entry); // Omit price
  }

  return entries; // Include price for directors
});
```

---

## Quality Gates

1. ✅ **No pricing visible to Studio Directors**: Test as SD role
2. ✅ **Pricing visible to Competition Directors**: Test as CD role
3. ✅ **Role detection works**: Correct role fetched from context
4. ✅ **No console errors**: Check browser console
5. ✅ **TypeScript compiles**: No errors
6. ✅ **UI doesn't break**: Layout adjusts when pricing hidden

---

## Test Cases

1. **As Studio Director**:
   - View entries list → No prices shown
   - View routine details → No cost information
   - View invoices → Status only, no amounts
   - Create reservation → No pricing estimates

2. **As Competition Director**:
   - View all entries → Prices visible
   - Generate invoice → Full pricing breakdown
   - View studio invoices → All amounts shown

---

## Deliverables

Output file: `codex-tasks/outputs/hide_pricing_from_studios_result.md`

Include:
1. Files modified with line numbers
2. Role detection method used
3. Components updated
4. Test results (as both roles if possible)
5. Build output

---

**Start Time**: [Record]
**Expected Duration**: 1 hour
