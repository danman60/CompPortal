# Work In Progress - October 30, 2025

## ✅ Completed This Session

### 1. Capacity Display Bug Fix (RESOLVED)
**Commits:** 47e6047, 15dcab3
- **Root Cause:** `useCountUp` hook had `count` in useEffect dependency array causing animation to restart on every state update
- **Fix:** Removed `count` from dependencies (useCountUp.ts:49)
- **Result:** Animation now completes smoothly, numbers display correctly
- **Evidence:** St. Catharines #2 (219/600), St. Catharines #1 (515/600), London (62/600)

### 2. DEBUGGING.md Protocol Update
**File:** `D:\ClaudeCode\DEBUGGING.md` lines 9-37
- Added "Back-Front-Back-Front" alternating investigation order
- Lesson learned from Oct 30 bug: Don't deep-dive one end, alternate between back/front layers
- Saves time by ruling out layers early

### 3. Invoice Status Awareness (PARTIAL)
**Files Modified:**
- `src/server/routers/reservation.ts:1367` - Added `invoiceStatus` field to getPipelineView query
- `src/components/rebuild/pipeline/DraftInvoicesBanner.tsx` - NEW redesigned notification component
- `src/components/rebuild/pipeline/PipelinePageContainer.tsx:100-102, 221` - Added draft count calculation + banner integration

**What's Working:**
- Backend now returns invoice status (DRAFT/SENT/PAID)
- Draft invoices count calculates correctly
- Banner component ready with gradient design, warning icon, "View All Drafts" button

## 🚧 Pending Work

### Invoice Status Feature (Remaining Tasks)

**Task 1: Update ReservationTable Action Buttons**
**File:** `src/components/rebuild/pipeline/ReservationTable.tsx`
**Logic Needed:**
```typescript
// In Actions column rendering:
if (reservation.invoiceId) {
  if (reservation.invoiceStatus === 'DRAFT') {
    // Show: "📧 Review & Send" button
    // Action: router.push(`/dashboard/invoices/${studioId}/${competitionId}`)
  } else if (reservation.invoiceStatus === 'SENT') {
    // Show: "Mark as Paid" button (current behavior)
  } else if (reservation.invoiceStatus === 'PAID') {
    // Show: "✓ Complete!" (current behavior)
  }
}
```

**Task 2: Update Last Action Column**
**File:** `src/server/routers/reservation.ts:1370` OR frontend transformation
**Change:**
```typescript
// Current:
lastAction: r.status === 'approved' ? 'Approved by You' : 'Reservation submitted',

// New (needs invoice status awareness):
lastAction: invoice?.status === 'DRAFT'
  ? 'Invoice Draft'
  : r.status === 'approved'
    ? 'Approved by You'
    : 'Reservation submitted',
```

**Task 3: Add Unsent Filter to Invoices/All Page**
**File:** `src/app/dashboard/invoices/all/page.tsx` (or relevant invoices page)
**Add Filter Tabs:**
- All Invoices (X)
- Draft / Unsent (X) ← Filter where `status = 'DRAFT'`
- Sent / Awaiting Payment (X) ← Filter where `status = 'SENT'`
- Paid (X) ← Filter where `status = 'PAID'`

**Add Visual Badges in Table:**
- Draft: Yellow badge "Draft - Not Sent"
- Sent: Blue badge "Sent - Awaiting Payment"
- Paid: Green badge "Paid"

**Task 4: Test Complete Flow**
1. Create invoice from pipeline (should be status='DRAFT')
2. Verify banner shows "1 unsent draft invoice"
3. Click "Review & Send" button → Opens invoice detail page
4. Click "Send" on detail page → Status changes to 'SENT'
5. Verify banner disappears
6. Verify action button changes to "Mark as Paid"
7. Test on both EMPWR + Glow tenants

### New Feature Request: Routines Card on CD Dashboard

**Location:** `/dashboard` (CD landing page) between Capacity Card and Invoices Card

**Requirements:**
1. **Card should show 3 metrics:**
   - **Reservations:** Count of approved reservations across all competitions
   - **Routines (Draft):** Count of `competition_entries` that don't have `summary_entries` records
   - **Routines (Summarized):** Count of `competition_entries` that have `summary_entries` records

2. **Calculation for "Remaining":**
   - Approved reservation count MINUS count of reservations that have summaries submitted
   - Formula: `COUNT(reservations WHERE status='approved') - COUNT(summaries)`

3. **Card Height:** Must match height of Capacity Card and Invoices Card (enforce uniform height)

4. **Card Style:** Match EventMetricsGrid style (gradient background, animated numbers via useCountUp)

**Implementation Steps:**

**Step 1: Create tRPC endpoint for routines stats**
**File:** `src/server/routers/dashboard.ts` (create if doesn't exist) or add to existing router
```typescript
getRoutinesStats: protectedProcedure.query(async ({ ctx }) => {
  // Only for CDs
  if (isStudioDirector(ctx.userRole)) {
    return null; // Or throw error
  }

  const [totalReservations, totalSummaries, draftRoutinesCount, summarizedRoutinesCount] = await Promise.all([
    // Approved reservations count
    prisma.reservations.count({
      where: {
        tenant_id: ctx.tenantId!,
        status: 'approved',
      },
    }),

    // Summaries count (summarized reservations)
    prisma.summaries.count({
      where: {
        tenant_id: ctx.tenantId!,
      },
    }),

    // Draft routines: entries without summary_entries
    prisma.competition_entries.count({
      where: {
        tenant_id: ctx.tenantId!,
        summary_entries: {
          none: {}, // Entries that have NO summary_entries
        },
      },
    }),

    // Summarized routines: entries with summary_entries
    prisma.competition_entries.count({
      where: {
        tenant_id: ctx.tenantId!,
        summary_entries: {
          some: {}, // Entries that have summary_entries
        },
      },
    }),
  ]);

  const remaining = totalReservations - totalSummaries;

  return {
    totalReservations,
    draftRoutines: draftRoutinesCount,
    summarizedRoutines: summarizedRoutinesCount,
    remaining,
  };
});
```

**Step 2: Create RoutinesCard component**
**File:** `src/components/rebuild/dashboard/RoutinesCard.tsx`
```typescript
import { useCountUp } from '@/hooks/rebuild/useCountUp';

interface RoutinesCardProps {
  totalReservations: number;
  draftRoutines: number;
  summarizedRoutines: number;
  remaining: number;
}

export function RoutinesCard({ totalReservations, draftRoutines, summarizedRoutines, remaining }: RoutinesCardProps) {
  const { count: reservationsCount } = useCountUp(totalReservations);
  const { count: draftCount } = useCountUp(draftRoutines);
  const { count: summarizedCount } = useCountUp(summarizedRoutines);
  const { count: remainingCount } = useCountUp(remaining);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 relative overflow-hidden hover:bg-white/15 transition-all h-full flex flex-col">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

      {/* Title */}
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg">📝 Routines Overview</h3>
        <p className="text-xs text-gray-400">Across all competitions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Reservations */}
        <div>
          <div className="text-2xl font-bold text-green-400">{reservationsCount}</div>
          <div className="text-xs text-gray-400">Reservations</div>
        </div>

        {/* Draft Routines */}
        <div>
          <div className="text-2xl font-bold text-yellow-400">{draftCount}</div>
          <div className="text-xs text-gray-400">Draft Routines</div>
        </div>

        {/* Summarized Routines */}
        <div>
          <div className="text-2xl font-bold text-blue-400">{summarizedCount}</div>
          <div className="text-xs text-gray-400">Summarized</div>
        </div>

        {/* Remaining */}
        <div>
          <div className="text-2xl font-bold text-purple-400">{remainingCount}</div>
          <div className="text-xs text-gray-400">Remaining</div>
        </div>
      </div>

      {/* Optional: Link to view details */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <a href="/dashboard/director-panel/routines" className="text-xs text-purple-400 hover:text-purple-300">
          View All Routines →
        </a>
      </div>
    </div>
  );
}
```

**Step 3: Integrate into CD Dashboard**
**File:** `src/app/dashboard/page.tsx` (or wherever CD dashboard is)
- Add RoutinesCard between Capacity Card and Invoices Card
- Ensure grid/flexbox gives all cards equal height (`h-full` on card, parent uses `grid grid-cols-3 gap-4` or `flex flex-row gap-4 items-stretch`)

**Step 4: Enforce Equal Card Heights**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* All cards will have same height in grid */}
  <CapacityCard {...} />
  <RoutinesCard {...} />
  <InvoicesCard {...} />
</div>
```

## Estimated Time Remaining

**Invoice Status Feature:** 2-3 hours
- Task 1: 45 min (table actions)
- Task 2: 15 min (last action column)
- Task 3: 1 hour (invoices/all page filters)
- Task 4: 30 min (testing both tenants)

**Routines Card Feature:** 1.5-2 hours
- Backend endpoint: 30 min
- Card component: 45 min
- Integration + height matching: 30 min
- Testing: 15 min

**Total:** 3.5-5 hours

## Next Session Recommendations

Given context remaining (~86k tokens), options:

**Option A:** Continue in this session
- Complete invoice status feature (Tasks 1-4)
- Leave routines card for next session

**Option B:** Pause and commit current progress
- Commit partial invoice status work (banner + backend changes)
- Create detailed plan for next session
- Fresh context for both remaining features

**Option C:** Build & deploy current progress to see banner in action
- Test notification banner on production
- Get screenshot of new design
- Continue with remaining work in next session

**Recommended:** Option C - Build and show you the banner design first, get feedback, then tackle remaining features with fresh context.
