# BLOCKER: Super Admin Cannot Access Cross-Tenant Invoices

**Date:** November 6, 2025
**Severity:** P2 - Blocks testing but not production functionality
**Status:** Active - Needs investigation

---

## Problem

Super Admin users cannot view invoices that belong to other tenants, resulting in 500 errors and "Invoice Not Found" messages.

**Evidence:**
- SA user (admin tenant) trying to access invoice on EMPWR tenant
- URL: `https://empwr.compsync.net/dashboard/invoices/2a811127-7b5e-4447-affa-046c76ded8da/8ed03ddd-8d8d-4439-a488-9d9343be9871`
- Result: 500 errors in console, "Invoice Not Found" displayed
- Invoice exists and is valid (verified via SQL)

---

## Root Cause Analysis

### Invoice Query Likely Filtered by Tenant

**Hypothesis:** Invoice detail query filters by tenant_id, excluding SA cross-tenant access.

**Similar Previous Issue:**
- Earlier fixed SA cross-tenant access for split invoice button (commit 7660be9, 8a0c924, c06c2c7, be25b3d)
- Backend tRPC context allows SA cross-tenant via subdomain
- Frontend role checks updated to include 'super_admin'

**Current Gap:** Invoice detail page likely doesn't allow SA to view invoices across tenants

---

## Impact

**Blocks:**
- SA testing of split invoice feature on EMPWR tenant
- SA testing of multi-routine invoices
- SA support workflow (can't help studios with invoice issues)

**Does NOT Block:**
- Studio Directors viewing their own invoices (works normally)
- Production use of split invoice feature
- Actual split invoice functionality

---

## Test Case

**Setup:**
- User: SA (danieljohnabrahamson@gmail.com) on admin tenant
- Invoice: 8ed03ddd-8d8d-4439-a488-9d9343be9871 on EMPWR tenant
- Studio: Test Studio - Daniel (2a811127-7b5e-4447-affa-046c76ded8da)
- Competition: EMPWR Dance - London (79cef00c-e163-449c-9f3c-d021fbb4d672)

**Expected:** SA can view invoice details and use split invoice button

**Actual:** 500 error, "Invoice Not Found"

---

## Database Verification

**Invoice exists and is correct:**
```sql
SELECT i.id, i.studio_id, i.competition_id, s.name as studio_name,
       c.name as competition_name, i.subtotal, i.total, i.status, i.tenant_id
FROM invoices i
JOIN studios s ON i.studio_id = s.id
JOIN competitions c ON i.competition_id = c.id
WHERE i.id = '8ed03ddd-8d8d-4439-a488-9d9343be9871';

Result:
- studio_name: Test Studio - Daniel
- competition_name: EMPWR Dance - London
- subtotal: $3,800.00
- total: $4,294.00
- status: PAID
- tenant_id: 00000000-0000-0000-0000-000000000001 (EMPWR)
```

✅ Invoice is valid and exists in database

---

## Investigation Needed

1. **Check invoice detail query** - Where does it filter by tenant?
2. **Check tRPC route** - Does invoice.getOne allow SA cross-tenant?
3. **Check frontend component** - Does InvoiceDetail page restrict SA?
4. **Check error logs** - What's the actual 500 error message?

**Likely Files:**
- `src/server/routers/invoice.ts` - Backend invoice queries
- `src/components/InvoiceDetail.tsx` - Frontend invoice display
- `src/app/api/trpc/[trpc]/route.ts` - tRPC context (already has SA logic)

---

## Workarounds

### Option 1: Use Studio Director Account (RECOMMENDED)
- Login as Studio Director on EMPWR tenant
- Studio Director can view their own invoices
- Tests real user workflow, not SA bypass

### Option 2: Test Split Invoice via API
- Call tRPC mutation directly via SQL or code
- Bypass UI entirely
- Tests backend logic without frontend

### Option 3: Query Invoice Directly
- Navigate to invoices list page
- Find invoice in table, click to view
- May work if list page has better SA support

---

## Fix Strategy

**Similar to Previous SA Cross-Tenant Fix:**

1. **Backend (invoice.ts):**
   - Allow SA to query invoices across tenants
   - Use subdomain tenant instead of user profile tenant
   - Similar to reservation split logic

2. **Frontend (InvoiceDetail.tsx):**
   - Allow SA role to view invoice details
   - Similar to split invoice button fix

**Estimated Time:** 30 minutes to 1 hour

---

## Related Issues

**Previous Fix:** Split invoice button not visible to SA (fixed in commits 7660be9, 8a0c924, c06c2c7, be25b3d)

**Pattern:** SA cross-tenant access needs to be explicitly allowed in multiple places:
- tRPC context ✅ (already done)
- Split invoice mutation ✅ (already done)
- Invoice detail query ❌ (needs fix)
- Invoice list query ❓ (unknown)

---

## Recommendation

**For immediate testing:** Use Studio Director account (danieljohnabrahamson@gmail.com or djamusic@gmail.com on EMPWR tenant)

**For long-term:** Fix SA cross-tenant invoice access to enable support workflows

---

**Status:** ⏸️ Active blocker for SA testing, workaround available
**Priority:** P2 (blocks SA testing, doesn't block production)
