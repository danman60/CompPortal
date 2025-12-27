# CompPortal Enhancement Plan - December 27, 2025

## Feature 1: Routine Summaries Page Enhancement

### Goal
Transform into a financial collection dashboard for CD to track payments before scheduling.

### New Stats Section (competition-filtered)
1. **Studios** - Count of unique studios
2. **Total Entries** - Sum of entry_count
3. **Revenue (excl. HST)** - Sum of subtotals
4. **Revenue (incl. HST)** - Sum of totals with tax
5. **Outstanding Balance** - Sum of balance_remaining

### Table Enhancements
- Add **Balance** column showing `balance_remaining` per studio
- Green $0.00 = paid, Red = still owes

### Backend Changes
**File:** `src/server/routers/summary.ts`
- Add invoice lookup to getAll
- Return: invoice_subtotal, invoice_total, invoice_balance_remaining

### Frontend Changes
**File:** `src/components/RoutineSummaries.tsx`
- Add Balance column to table
- Replace stats section with 5 financial metrics
- Calculate aggregates from invoice data

---

## Feature 2: Studios Page Enhancement

### Goal
Add toggleable table/card view and soft delete functionality.

### Table View
- Toggle between card view (current) and table view
- Table columns: Studio Name, Code, Contact, Dancers, Reservations, Status, Actions

### Soft Delete (Withdraw Studio)
When studio withdraws from competition:
1. Set studio status to 'withdrawn' (or add withdrawn flag)
2. Cancel all reservations (status = 'cancelled')
3. Refund capacity via CapacityService
4. Cancel all entries (status = 'withdrawn')
5. Void unpaid invoices
6. Keep dancers (for potential return)
7. Keep audit logs

**Re-signup path:** Studio can create new reservation later, dancers still exist.

### Files to Modify
- `src/app/dashboard/studios/page.tsx` or component
- `src/server/routers/studio.ts` - add withdraw mutation
- Add capacity refund logic

---

## Feature 3: Hide Test Studios from CD Dashboards

### Goal
DJAGlowTester (and similar test accounts) should not appear in CD action items.

### Implementation Options
A) Filter by studio name pattern (contains 'Tester' or 'Test')
B) Add `is_test_account` boolean to studios table
C) Filter by specific studio IDs

### Affected Pages
- Routine Summaries
- Reservation Pipeline
- Invoice pages
- Any page showing "awaiting" or "action needed" items

---

## Feature 4: CD Submit Summary on Behalf of SD

### Goal
Allow CD to submit a routine summary on behalf of a studio that hasn't submitted yet.
Useful when studios are unresponsive, have technical issues, or CD wants to close registration.

### Use Cases
1. Studio is unresponsive but entries are ready
2. Studio has technical issues accessing the platform
3. CD wants to close registration and force-submit remaining studios

### Behavior
**Must act EXACTLY like SD pressed "Submit Summary" button:**
1. Create summary record in `summaries` table
2. Update entries from `'draft'` → `'submitted'`
3. Update reservation: `spaces_confirmed = routineCount`, `status = 'summarized'`, `is_closed = true`
4. Calculate `entries_used` / `entries_unused`, refund unused capacity
5. Create `summary_entries` snapshots for audit trail
6. Log activity as `summary.submitted_by_cd`

### Backend Changes
**File:** `src/server/routers/summary.ts`
- Add `submitOnBehalf` mutation (adminProcedure)
- Input: `{ reservationId: string, notes?: string }`
- Replicate logic from `entry.ts` lines 250-549 (SD submission)

### Frontend Changes
**Files:**
- `src/components/RoutineSummaries.tsx` - Add "Submit for Studio" button for studios in 'editing' status
- Pipeline V2 component - Similar button in "Not Submitted" section

### UI
- Button labeled "Submit for Studio" with ⬆️ icon
- Confirmation modal: "Submit summary on behalf of [Studio Name]?"
- Warning: "This will lock their entries and move them to 'Awaiting Invoice' status"
- Optional notes field for reason

---

## Execution Order

1. ~~Pure Energy Migration~~ ✅
2. ~~Delete Summer St. Catharines~~ ✅
3. ~~Studios page table view + soft delete~~ ✅ (withdraw feature working)
4. ~~Routine Summaries enhancement~~ ✅ (Balance column + financial stats)
5. ~~CD Submit on Behalf of SD~~ ✅ (submitOnBehalf mutation + UI button)
6. Test account filtering

---

## Migration Executed: Pure Energy to April

**Date:** 2025-12-27

### Actions Taken:
- Moved Pure Energy (99 entries, PAID invoice) from Summer → Spring St. Catharines
- Cancelled Peak Dance Company reservation (6 entries) - withdrew
- Kept DJAGlowTester (needs filtering from dashboards)
- Cancelled Summer St. Catharines competition
