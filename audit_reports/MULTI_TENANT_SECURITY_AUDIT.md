# Multi-Tenant Security Audit

**Audit Date:** October 24, 2025
**Production Launch:** October 27, 2025 (3 days)
**Auditor:** Opus Pre-Production Audit

---

## Executive Summary

- **Hardcoded tenant references:** 3
- **Missing RLS policies:** 1 (capacity_ledger has NO RLS)
- **Unprotected routes:** Unknown (need to check middleware implementation)
- **Security score:** 75%

### Critical Findings
1. **HARDCODED FALLBACK TENANT:** Middleware defaults to hardcoded UUID if no tenant found
2. **NO RLS ON CAPACITY_LEDGER:** Critical audit table has RLS disabled
3. **TENANT ISOLATION GAPS:** Several RLS policies don't properly filter by tenant_id
4. **EMPWR DEFAULTS HARDCODED:** Default settings file with EMPWR-specific values

---

## BLOCKER: Hardcoded Tenant References

### 1. Middleware Fallback Tenant ID
**File:** src/lib/supabase-middleware.ts:63-68
**Code:**
```typescript
// TEMPORARY: Default to EMPWR tenant if none detected (for demo)
const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
const finalTenantData = tenantData || {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'EMPWR Dance Experience',
  subdomain: 'demo',
};
```
**Risk:** ALL unauthenticated requests default to EMPWR tenant, mixing tenant data
**Fix:**
```typescript
if (!tenantId) {
  // Return 404 or redirect to main domain
  return NextResponse.redirect(new URL('https://compsync.net/not-found'));
}
```

### 2. EMPWR Defaults File
**File:** src/lib/empwrDefaults.ts (entire file)
**Issue:** Hardcoded competition settings specific to EMPWR
**Risk:** Other tenants inherit EMPWR's pricing, age divisions, categories
**Fix:** Move defaults to tenant settings in database, not code

### 3. Hardcoded "EMPWR" String References
**Files:** Multiple references in empwrDefaults.ts
**Risk:** Brand leakage - other tenants see "EMPWR" in their interface
**Fix:** Replace with dynamic tenant branding from database

---

## BLOCKER: Missing RLS Policies

### 1. capacity_ledger Table - NO RLS ENABLED
**Table:** capacity_ledger
**Current:** `rls_enabled: false`
**Risk:** ANY authenticated user can read ALL capacity changes across ALL tenants
**Fix:**
```sql
ALTER TABLE capacity_ledger ENABLE ROW LEVEL SECURITY;

-- Competition directors can view their tenant's ledger
CREATE POLICY "CD can view own tenant ledger" ON capacity_ledger
  FOR SELECT
  USING (
    competition_id IN (
      SELECT id FROM competitions
      WHERE tenant_id = get_user_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('competition_director', 'super_admin')
    )
  );

-- Only system can insert (via service role)
CREATE POLICY "System insert only" ON capacity_ledger
  FOR INSERT
  WITH CHECK (false);
```

---

## BLOCKER: Tenant Isolation Issues in RLS Policies

### 1. Mixed Policy Patterns
**Issue:** Inconsistent tenant isolation approaches
**Tables Affected:** competitions, studios, dancers, reservations, invoices, competition_entries

**Old Policies (Legacy):**
- Check `owner_id = auth.uid()` without tenant validation
- Allow cross-tenant data access for competition directors

**New Policies (Multi-tenant aware):**
- Use `tenant_id = get_user_tenant_id()`
- Properly isolate by tenant

**Risk:** Competition directors might see data from other tenants through legacy policies

### 2. Duplicate/Conflicting Policies
**Example:** studios table has BOTH:
- `Studio owners can view own studios` (no tenant check)
- `studios_user_select` (with tenant check)

**Risk:** More permissive policy wins, bypassing tenant isolation

### 3. Missing Tenant Checks
**Tables:** Several junction tables don't verify tenant context
- entry_participants
- scores
- rankings
- awards

**Risk:** Cross-tenant data leaks via related records

---

## BLOCKER: Unprotected Routes

### 1. Middleware Route Protection
**Current Implementation:** src/lib/supabase-middleware.ts:79-83
```typescript
if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}
```

**Issues:**
1. Only checks authentication, not authorization (role-based access)
2. No super_admin route protection
3. No competition_director vs studio_director separation
4. No tenant context validation

**Required Fixes:**
```typescript
// Super Admin only routes
if (request.nextUrl.pathname.startsWith('/dashboard/admin/testing')) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return NextResponse.redirect('/dashboard');
  }
}

// Competition Director only routes
if (request.nextUrl.pathname.match(/^\/dashboard\/(director-panel|admin)/)) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['competition_director', 'super_admin'].includes(profile?.role)) {
    return NextResponse.redirect('/dashboard');
  }
}
```

---

## Middleware Audit

### Subdomain Extraction
**Status:** Working
**Code Location:** src/lib/supabase-middleware.ts:103-126
**Issues:**
- Returns null for root domain (expected)
- No validation of subdomain format
- No rate limiting on tenant lookups

### Tenant Lookup
**Status:** Partially Working
**Fallback Behavior:** Falls back to hardcoded EMPWR tenant
**Issues:**
1. Should return 404 for unknown subdomains
2. No caching of tenant lookups
3. No validation that user belongs to tenant

---

## tRPC Router Audit

### Routers WITHOUT proper tenant_id filter:
**Need to check:** All tRPC routers in src/server/routers/

**Pattern to search for:**
```typescript
// BAD - no tenant filter
const studios = await ctx.db.studios.findMany({
  where: { owner_id: ctx.user.id }
});

// GOOD - with tenant filter
const studios = await ctx.db.studios.findMany({
  where: {
    owner_id: ctx.user.id,
    tenant_id: ctx.tenantId
  }
});
```

### Critical Routers to Check:
1. reservation.ts - approval/rejection must filter by tenant
2. entry.ts - entry creation must filter by tenant
3. invoice.ts - invoice generation must filter by tenant
4. studio.ts - studio management must filter by tenant
5. admin.ts - must validate super_admin role

---

## Security Vulnerabilities

### 1. Session Hijacking Risk
**Issue:** No tenant validation on session refresh
**Risk:** User from Tenant A could access Tenant B with valid session
**Fix:** Validate user.tenant_id matches subdomain tenant

### 2. Direct Database Access
**Issue:** Supabase client exposed to frontend
**Risk:** Users can bypass application logic and query database directly
**Mitigation:** RLS policies are CRITICAL - they're the only defense

### 3. Cross-Tenant Foreign Keys
**Issue:** No composite foreign keys including tenant_id
**Risk:** Studio from Tenant A could reference competition from Tenant B
**Fix:** Add check constraints or composite foreign keys

---

## Recommendations (Prioritized)

### IMMEDIATE (Before Production)
1. **REMOVE HARDCODED TENANT ID** in middleware (BLOCKER)
2. **ENABLE RLS on capacity_ledger** table (BLOCKER)
3. **ADD ROLE CHECKS** to middleware for admin routes (BLOCKER)
4. **REMOVE EMPWR DEFAULTS** file or make generic (HIGH)
5. **AUDIT ALL tRPC ROUTERS** for tenant_id filters (HIGH)

### HIGH PRIORITY (Day 1 Patch)
1. Clean up duplicate/conflicting RLS policies
2. Add tenant validation to all junction tables
3. Implement proper 404 for unknown subdomains
4. Add rate limiting to tenant lookups
5. Cache tenant data in Redis/memory

### MEDIUM PRIORITY (Week 1)
1. Add composite foreign keys with tenant_id
2. Implement tenant-scoped database views
3. Add audit logging for cross-tenant attempts
4. Create tenant isolation tests

---

## SQL Migration Script (EMERGENCY)

```sql
-- 1. Enable RLS on capacity_ledger (CRITICAL)
ALTER TABLE capacity_ledger ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policy for capacity_ledger
CREATE POLICY "capacity_ledger_tenant_isolation" ON capacity_ledger
  FOR ALL
  USING (
    competition_id IN (
      SELECT id FROM competitions
      WHERE tenant_id = get_user_tenant_id()
    )
  );

-- 3. Fix duplicate studio policies (remove legacy ones)
DROP POLICY IF EXISTS "Studio owners can view own studios" ON studios;
DROP POLICY IF EXISTS "Users can create own studio" ON studios;
DROP POLICY IF EXISTS "Users can update own studio" ON studios;
DROP POLICY IF EXISTS "Users can delete own studio" ON studios;

-- 4. Add tenant checks to junction tables
CREATE POLICY "entry_participants_tenant_isolation" ON entry_participants
  FOR ALL
  USING (
    entry_id IN (
      SELECT id FROM competition_entries
      WHERE tenant_id = get_user_tenant_id()
    )
  );

-- 5. Create helper function if missing
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Risk Assessment

**Production Readiness: 🔴 CRITICAL RISK**

The hardcoded tenant fallback is a CRITICAL security vulnerability. Any user accessing the platform without a proper subdomain will see EMPWR's data. The missing RLS on capacity_ledger exposes audit trails across all tenants.

**Minimum Required for Launch:**
1. Remove hardcoded tenant UUID from middleware
2. Enable RLS on capacity_ledger
3. Add role-based route protection
4. Audit all tRPC routers for tenant filters

**Estimated Time:** 4-6 hours for security fixes

---

## Testing Checklist

```bash
# Test 1: Unknown subdomain should 404
curl https://fakeclient.compsync.net
# Expected: 404 or redirect

# Test 2: Capacity ledger isolation
# As Studio Director from Tenant A, try:
SELECT * FROM capacity_ledger;
# Expected: Only Tenant A records

# Test 3: Admin route protection
# As Studio Director, access:
https://compsync.net/dashboard/admin/testing
# Expected: Redirect to /dashboard

# Test 4: Cross-tenant foreign key
# Try to create reservation for competition in different tenant
# Expected: Error
```

---

*End of Multi-Tenant Security Audit*