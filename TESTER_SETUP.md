# Tester Environment Setup

**Date:** November 11, 2025
**Branch:** `tester`
**Domain:** tester.compsync.net
**Status:** ✅ Branch created and pushed

---

## ✅ Completed

1. **Git Branch Setup**
   - Created `tester` branch from latest `main`
   - Pushed to remote: `origin/tester`
   - Commit: da12e71 (includes ALLOWED_TENANTS middleware)

2. **Middleware Enforcement**
   - **Production (main)**: Clean, no restrictions
   - **Tester branch**: Has ALLOWED_TENANTS check (lines 13-23)

3. **Vercel Domain Connection**
   - tester.compsync.net → `tester` branch (user configured)

---

## ⏳ Remaining Manual Steps

### Step 1: Set Environment Variable in Vercel (CRITICAL)

**Go to:** Vercel Dashboard → CompPortal → Settings → Environment Variables

**Add for `tester` branch ONLY:**
```
ALLOWED_TENANTS=tester
```

**Why:** This activates the middleware enforcement, ensuring tester branch can ONLY access the tester tenant (not empwr or glow).

**Verification:**
- After setting, redeploy tester branch
- Try accessing empwr.compsync.net from tester deployment → Should get 403
- Try accessing tester.compsync.net → Should work ✅

---

### Step 2: Create Test Tenant in Database (if not exists)

**Check if exists:**
```sql
SELECT id, subdomain, name FROM tenants WHERE subdomain = 'tester';
```

**If doesn't exist, create:**
```sql
INSERT INTO tenants (id, subdomain, slug, name, branding, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'tester',
  'tester',
  'Test Environment',
  '{"primary_color": "#3B82F6", "logo_url": null}',
  NOW(),
  NOW()
);
```

---

### Step 3: Create Test User Accounts (Manual via Supabase Dashboard)

**Accounts needed:**

1. **Test Super Admin**
   - Email: test-sa@compsync.net
   - Password: 123456
   - Role: super_admin
   - Tenant: NULL (super admin not tied to tenant)

2. **Test Competition Director**
   - Email: test-cd@compsync.net
   - Password: 123456
   - Role: competition_director
   - Tenant: Test Environment (tester)

3. **Test Studio Director**
   - Email: test-sd@compsync.net
   - Password: 123456
   - Role: studio_director
   - Tenant: Test Environment (tester)
   - Studio: Create test studio "Test Studio"

**How to create via Supabase Dashboard:**
1. Go to Authentication → Users → Add User
2. Enter email + password
3. Confirm email (auto-confirm in settings)
4. Go to Table Editor → user_profiles
5. Add row with user ID, role, tenant_id

---

### Step 4: DNS Configuration (if not done)

**Check:** Does tester.compsync.net resolve?

**If not, add CNAME record:**
```
Type: CNAME
Name: tester
Value: cname.vercel-dns.com
TTL: 3600
```

**Wait:** 5-60 minutes for propagation

---

## Testing Checklist

After completing all steps:

- [ ] tester.compsync.net loads
- [ ] Can login as test-sa@compsync.net
- [ ] Can login as test-cd@compsync.net
- [ ] Can login as test-sd@compsync.net
- [ ] Cannot access empwr.compsync.net from tester deployment (403 expected)
- [ ] Cannot access glow.compsync.net from tester deployment (403 expected)
- [ ] Production (empwr/glow) still works normally

---

## Middleware Code (On Tester Branch Only)

```typescript
// Extract subdomain from hostname FIRST
const hostname = request.headers.get('host') || '';
const subdomain = extractSubdomain(hostname);

// Enforce ALLOWED_TENANTS if environment variable is set
// This allows production to only access empwr/glow/admin
// and staging to only access tester
const allowedTenants = process.env.ALLOWED_TENANTS?.split(',').map(t => t.trim()) || [];
if (allowedTenants.length > 0 && subdomain && !allowedTenants.includes(subdomain)) {
  // Block access to disallowed tenants
  return NextResponse.json(
    { error: 'Unauthorized tenant access', subdomain, allowed: allowedTenants },
    { status: 403 }
  );
}
```

**Key safety feature:** Only activates if `ALLOWED_TENANTS` env var is set.

---

## Architecture

```
Production (main branch):
├── empwr.compsync.net
├── glow.compsync.net
└── No ALLOWED_TENANTS env var → No restrictions

Tester (tester branch):
├── tester.compsync.net
├── ALLOWED_TENANTS=tester → Enforced isolation
└── Cannot access empwr or glow data
```

**Database:** Same database, tenant_id isolation + middleware enforcement

**Code:** Separate git branches → independent deployments

---

## Future: Phase 2 Scheduling Development

**Workflow:**
1. Develop new features on `tester` branch
2. Test on tester.compsync.net with test accounts
3. Once stable, merge `tester` → `main`
4. Production gets new features

**Benefits:**
- Zero risk to production clients
- Realistic testing environment
- Same database structure
- Independent deployment cycle

---

**Setup Status:** ⏳ Pending Vercel env var + test accounts
**Next Action:** Set `ALLOWED_TENANTS=tester` in Vercel for tester branch
