# Critical Fixes Required - Phase 1

**Date:** October 28, 2025
**Priority:** P0 (Blocking Production Launch)
**Estimated Fix Time:** 2-3 hours

---

## 🔴 CRITICAL-01: Routine Summaries Not Displaying

**File:** `src/server/routers/summary.ts`
**Lines:** 29-41, 54

### Root Cause Analysis

The `getAll` query has TWO critical bugs:

1. **Missing tenant_id filter** (line 29)
   - Query fetches ALL summaries across ALL tenants
   - Security/isolation issue

2. **Incorrect status filter** (line 54)
   - Query looks for entries with `status: 'submitted'`
   - But entries are changed to 'invoiced' or other statuses after summary
   - Results in 0 entries found, so summary appears as "no data"

### Database Evidence

```sql
-- This summary exists:
SELECT * FROM summaries
WHERE id = 'ec8fccdc-cbbe-4d84-9803-60b1023013be';
-- Result: entries_used=1, reservation_status='summarized'

-- But entries have different status:
SELECT status FROM competition_entries
WHERE reservation_id = '83b100e5-f601-475f-84a9-53c7d67c4615';
-- Likely: status = 'invoiced' or 'confirmed' (NOT 'submitted')
```

### Fix Required

```typescript
// src/server/routers/summary.ts

// FIX 1: Add tenant_id filter (line 29)
const summaries = await prisma.summaries.findMany({
  where: {
    tenant_id: ctx.tenantId!, // ADD THIS
  },
  include: {
    reservations: {
      include: {
        studios: true,
        competitions: true,
      },
    },
  },
  orderBy: {
    submitted_at: 'desc',
  },
});

// FIX 2: Remove status filter OR broaden it (line 51-60)
// Option A: Remove status filter entirely (show all entries)
const entries = await prisma.competition_entries.findMany({
  where: {
    reservation_id: summary.reservation_id,
    // REMOVE: status: 'submitted',
  },
  select: {
    id: true,
    total_fee: true,
    status: true,
  },
});

// Option B: Include multiple statuses
const entries = await prisma.competition_entries.findMany({
  where: {
    reservation_id: summary.reservation_id,
    status: { in: ['submitted', 'confirmed', 'invoiced'] }, // Multiple statuses
  },
  select: {
    id: true,
    total_fee: true,
    status: true,
  },
});
```

### Recommended Solution

**Option A** (Remove status filter) is better because:
- The summary is already created, we just need to display it
- Entry status changes after submission don't affect the summary
- Simpler and less prone to future bugs

---

## 🔴 CRITICAL-02: React Hydration Error on Invoices Page

**File:** Likely `src/app/dashboard/invoices/all/page.tsx` or related component
**Error:** `Minified React error #419`

### Root Cause

React error #419 indicates: **"Hydration failed because the server rendered HTML didn't match the client"**

Common causes:
1. Using browser-only APIs during SSR (window, localStorage, etc.)
2. Random data generation (Math.random(), Date.now() in render)
3. Conditional rendering based on client state
4. Third-party scripts injecting content

### Investigation Needed

```bash
# Search for common hydration issues
grep -r "window\." src/app/dashboard/invoices/
grep -r "localStorage" src/app/dashboard/invoices/
grep -r "Math.random" src/app/dashboard/invoices/
grep -r "Date.now" src/app/dashboard/invoices/
```

### Potential Fixes

**Option 1: Use useEffect for client-only code**
```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null; // or loading state
```

**Option 2: Disable SSR for specific components**
```typescript
// next.config.js or component file
import dynamic from 'next/dynamic';

const InvoicesComponent = dynamic(
  () => import('@/components/InvoicesComponent'),
  { ssr: false }
);
```

**Option 3: Ensure data consistency**
```typescript
// Make sure server and client render the same initial state
const initialData = await getInitialData(); // Server
// Pass to client via props, not refetch
```

### Recommended Action

1. Check browser console for full error stack trace
2. Identify which component is causing mismatch
3. Wrap problematic code in useEffect or disable SSR
4. Test with hard refresh (Ctrl+Shift+R)

---

## 🟠 HIGH-01: Schema Drift Between Code and Database

**Impact:** Queries failing at runtime due to incorrect column names

### Evidence from Testing

**Actual Database Schema:**
```sql
-- invoices table
{
  "column_name": "status", // NOT "payment_status"
  "column_name": "tax_rate", // NOT "tax_amount" (rate vs amount!)
  "column_name": "subtotal",
  "column_name": "total",
  "column_name": "paid_at",
  "column_name": "payment_method"
}

-- reservations table
{
  "column_name": "spaces_requested", // NOT "entries_requested"
  "column_name": "spaces_confirmed", // NOT "entries_approved"
  "column_name": "status",
  "column_name": "payment_status" // Separate from status!
}

-- dancers table
{
  "column_name": "first_name", // NOT "name"
  "column_name": "last_name",
  "column_name": "date_of_birth"
}
```

### Affected Code

**Anywhere using these columns:**
- `i.payment_status` → Should be `i.status`
- `i.tax_amount` → Should calculate from `i.tax_rate * i.subtotal`
- `r.entries_requested` → Should be `r.spaces_requested`
- `r.entries_approved` → Should be `r.spaces_confirmed`
- `d.name` → Should be `d.first_name + ' ' + d.last_name`

### Fix Process

**Step 1: Sync Prisma Schema**
```bash
# From project root
cd D:\ClaudeCode\CompPortal
npx prisma db pull --force
npx prisma generate
```

**Step 2: Check for Breaking Changes**
```bash
git diff prisma/schema.prisma
# Review all changed fields
```

**Step 3: Update Application Code**
- Search codebase for old field names
- Update all queries to use correct names
- Run build to catch TypeScript errors

**Step 4: Test Thoroughly**
- Test each affected feature
- Verify calculations still correct
- Check UI displays correct data

### Terminology Issue

**Spec vs Implementation:**
- Spec uses: `entries_requested`, `entries_approved`
- Database uses: `spaces_requested`, `spaces_confirmed`
- Frontend displays: "Routines Requested", "Routines Submitted"

**This is semantic confusion - need alignment:**
1. Are they "entries", "spaces", or "routines"?
2. Pick ONE term and use everywhere
3. Update spec OR database to match

---

## 🟡 MEDIUM-01: PDF Table Width Warnings

**File:** Invoice PDF generation (likely using jsPDF or similar)
**Warning:** "Of the table content, 93 units width could not fit page"

### Quick Fix

```typescript
// Reduce column widths or font size
{
  styles: {
    fontSize: 9, // Reduce from 10
    cellPadding: 2,
  },
  columnStyles: {
    0: { cellWidth: 15 }, // Adjust as needed
    1: { cellWidth: 40 },
    // etc.
  },
}
```

### Better Fix

- Use responsive table width calculation
- Reduce padding/margins
- Use landscape orientation if needed

---

## 🟡 MEDIUM-02: Camera/Microphone Permission Errors

**Console:** "Potential permissions policy violation: camera/microphone is not allowed"

### Fix

Add to `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        }
      ]
    }
  ];
}
```

Or add meta tag to root layout:
```html
<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
```

---

## Priority Order

1. **FIX CRITICAL-01 FIRST** (Routine summaries) - 30 min
   - Add tenant_id filter
   - Remove/broaden status filter
   - Test on production

2. **FIX CRITICAL-02** (React error) - 1-2 hours
   - Debug with full console output
   - Identify hydration mismatch
   - Apply appropriate fix

3. **FIX HIGH-01** (Schema drift) - 1 hour
   - Run prisma db pull
   - Update affected code
   - Full regression test

4. **FIX MEDIUM issues** - 30 min total
   - PDF width adjustment
   - Permissions policy header

---

## Testing Checklist After Fixes

- [ ] Routine summaries page shows data
- [ ] Can approve summary successfully
- [ ] Invoice page loads without React errors
- [ ] All queries execute without errors
- [ ] Tenant isolation still working
- [ ] PDF generates without warnings
- [ ] No console errors

---

## Code Examples for Fixes

### Complete Fix for summary.ts

```typescript
// src/server/routers/summary.ts
export const summaryRouter = router({
  getAll: adminProcedure
    .input(
      z.object({
        competitionId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // ✅ FIX: Add tenant filter
      const summaries = await prisma.summaries.findMany({
        where: {
          tenant_id: ctx.tenantId!, // ADDED
        },
        include: {
          reservations: {
            include: {
              studios: true,
              competitions: true,
            },
          },
        },
        orderBy: {
          submitted_at: 'desc',
        },
      });

      // Filter by competition if specified
      const filteredSummaries = input.competitionId
        ? summaries.filter(s => s.reservations?.competition_id === input.competitionId)
        : summaries;

      // For each summary, get the related entries to calculate totals
      const summariesWithDetails = await Promise.all(
        filteredSummaries.map(async (summary) => {
          // ✅ FIX: Remove status filter
          const entries = await prisma.competition_entries.findMany({
            where: {
              reservation_id: summary.reservation_id,
              // REMOVED: status: 'submitted',
            },
            select: {
              id: true,
              total_fee: true,
              status: true,
            },
          });

          const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.total_fee || 0), 0);

          return {
            id: summary.id,
            reservation_id: summary.reservation_id,
            studio_id: summary.reservations?.studio_id || '',
            studio_name: summary.reservations?.studios?.name || '',
            studio_code: summary.reservations?.studios?.studio_code || null,
            competition_id: summary.reservations?.competition_id || '',
            competition_name: summary.reservations?.competitions?.name || '',
            entries_used: summary.entries_used,
            entries_unused: summary.entries_unused,
            submitted_at: summary.submitted_at,
            entry_count: entries.length,
            total_amount: totalAmount,
            entries: entries,
          };
        })
      );

      return {
        summaries: summariesWithDetails,
      };
    }),
  // ... rest of router
});
```

---

**END OF CRITICAL_FIXES.md**
