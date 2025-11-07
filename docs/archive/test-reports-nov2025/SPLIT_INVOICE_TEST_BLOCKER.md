# BLOCKER: Split Invoice Feature - Cross-Tenant Access Issue

**Date:** November 6, 2025
**Test Phase:** Section I - Split Invoice Testing
**Severity:** P2 - Feature Incomplete (blocks testing but not production use)

---

## Problem

Cannot test Split Invoice feature because the "Split Invoice by Dancer" button does not appear for Super Admin users.

**Expected (per spec):** Super Admin should be able to split invoices for testing/support purposes.
**Actual:** Button not visible - user profile query returns no data in React component.

---

## Root Cause - UPDATED INVESTIGATION

**Initial hypothesis:** Role check issue in InvoiceDetail.tsx line 26
**Actual root cause:** Cross-tenant access issue

### Investigation Results:

1. **API Query Works:** `user.getCurrentUser` returns 200 OK with valid user data:
   ```json
   {
     "id": "b3aebafa-e291-452a-8197-f7012338687c",
     "role": "super_admin",
     "tenantId": "00000000-0000-0000-0000-000000000999",
     "tenant": {
       "name": "CompSync Admin Portal",
       "subdomain": "admin"
     }
   }
   ```

2. **Tenant Mismatch:**
   - Super Admin user belongs to: **admin tenant** (`subdomain: "admin"`)
   - Invoice being viewed is on: **EMPWR tenant** (`empwr.compsync.net`)
   - React component likely filters user query by current tenant context
   - Result: `userProfile` is `undefined` in InvoiceDetail component

3. **Button Logic:**
   ```typescript
   // Line 26 - userProfile is undefined due to tenant mismatch
   const isStudioDirector = userProfile?.role === 'studio_director';

   // Line 505 - Both conditions required
   {isStudioDirector && dbInvoice && (
     // Button renders here
   )}
   ```
   - `userProfile` is undefined → `isStudioDirector` is false
   - Button requires BOTH `isStudioDirector && dbInvoice`
   - Result: Button not rendered

**Spec states (docs/SPLIT_INVOICE_FEATURE.md:476-478):**
```
**Access Control:**
- Only Studio Director who owns the invoice can split
- Super Admin can also split (for testing/support)
```

---

## Impact

**Blocks Split Invoice Testing:**
- Cannot execute 18 planned tests in Section I
- Cannot verify split calculation algorithms
- Cannot test sub-invoice generation
- Cannot verify dancer-level invoice creation

**Does NOT Block Production:**
- Real Studio Directors can still use the feature
- Feature works as designed for intended users
- Only impacts testing and SA support workflows

---

## Test Environment

**Account Used:** danieljohnabrahamson@gmail.com (Super Admin)
**Studio:** Test Studio - Daniel (studio ID: 2a811127-7b5e-4447-affa-046c76ded8da)
**Studio Owner:** danieljohnabrahamson@gmail.com (SA owns this test studio)
**Invoice:** 2a811127-7b5e-4447-affa-046c76ded8da ($525.45, PAID ✅)

**Prerequisites Met:**
- ✅ Invoice status: PAID
- ✅ Invoice has entries (3 routines)
- ✅ All dancers have parent_email populated
- ✅ SA is studio owner
- ❌ Button not visible (role check fails)

---

## Proposed Fix

**The role check is NOT the issue.** The real problem is multi-tenant architecture:

### Option 1: Use Studio Director Test Account (RECOMMENDED FOR TESTING)

Create a real Studio Director account on EMPWR tenant to test split invoice feature:

```sql
-- Create Studio Director user in EMPWR tenant
INSERT INTO user_profiles (id, role, first_name, last_name, tenant_id)
VALUES (
  'new-uuid',
  'studio_director',
  'Test',
  'Director',
  '00000000-0000-0000-0000-000000000001' -- EMPWR tenant
);

-- Link to existing test studio
UPDATE studios
SET owner_id = 'new-uuid'
WHERE id = '2a811127-7b5e-4447-affa-046c76ded8da';
```

**Pros:**
- Tests real user workflow (not SA bypass)
- No code changes needed
- Validates actual Studio Director experience

**Cons:**
- Requires new user creation
- Can't test from SA account

### Option 2: Allow Super Admin Cross-Tenant Access (ARCHITECTURAL CHANGE)

Modify tRPC context to allow SA users to bypass tenant filtering:

```typescript
// src/server/trpc.ts
export const createContext = async (opts: CreateNextContextOptions) => {
  const session = await getServerSession(opts.req, opts.res, authOptions);

  // Allow SA to access any tenant
  if (session?.user?.role === 'super_admin') {
    return {
      userId: session.user.id,
      userRole: session.user.role,
      tenantId: extractTenantFromUrl(opts.req.url), // Use URL subdomain
      isCrossTenantAccess: true
    };
  }

  // Normal users - use their profile tenant
  return {
    userId: session?.user?.id,
    userRole: session?.user?.role,
    tenantId: session?.user?.tenantId,
    isCrossTenantAccess: false
  };
};
```

**Pros:**
- Enables SA testing across all tenants
- Aligns with spec (SA can test features)

**Cons:**
- Major architectural change
- Risk of cross-tenant data leaks if not careful
- Requires updating all tenant-filtered queries

---

## Workaround for Testing

**Option A: Create real Studio Director account**
- Create new user with `studio_director` role
- Assign as owner of test studio
- Login and test split invoice feature

**Option B: Temporarily modify code**
- Apply Option 1 fix locally
- Test split invoice feature
- Revert before commit (or commit as intentional fix)

**Option C: Test via API directly**
- Use tRPC mutation `splitInvoice` directly
- Verify backend logic works
- Skip UI testing

---

## Recommendation

**Apply Option 1 (Studio Director account) for immediate testing** - This tests the real user workflow without architectural changes.

**For production SA support:** Option 2 (cross-tenant access) should be implemented later as a separate feature to allow SA to troubleshoot Studio Director issues across tenants.

**Testing Impact:**
- With Option 1: Can complete all 18 Section I tests immediately
- With Option 2: Major architectural work required (6-8 hours)
- Without fix: 0/18 tests executable (100% blocked)

**Note:** The existing Studio Director test account (`djamusic@gmail.com`) may already work if it's on the EMPWR tenant. Should verify tenant before creating new account.

---

## Related Files

- `src/components/InvoiceDetail.tsx` - Button visibility logic
- `src/server/routers/invoice.ts:1144-1150` - Backend already allows SA (guard checks `super_admin`)
- `docs/SPLIT_INVOICE_FEATURE.md:476-478` - Spec documents SA access

**Backend is correct** ✅ - Already allows SA to split invoices
**Frontend is missing** ❌ - Button doesn't show for SA

---

## Next Steps

1. User decision: Should SA be able to split invoices?
   - If YES → Apply fix (Option 1 or 2)
   - If NO → Update spec documentation to remove SA access claim

2. After fix:
   - Execute Section I tests (18 tests)
   - Verify split calculation algorithms
   - Document test results

---

**Status:** BLOCKED - Awaiting user decision on access control fix
**Test Progress:** 0/18 Section I tests (cannot proceed without fix)
