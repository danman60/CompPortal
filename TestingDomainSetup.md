# Testing Domain Setup - Complete Plan

## Overview

**Goal:** Separate deployment for testing new code without affecting production clients.

**Architecture:**
- `main` branch → `empwr.compsync.net` + `glow.compsync.net` (STABLE CODE)
- `staging` branch → `testtenant.compsync.net` (NEW CODE)
- Same database, tenant_id isolation + middleware enforcement

## Current Status

### ✅ Completed
- Test tenant created in database
  - ID: `00000000-0000-0000-0000-000000000003`
  - Subdomain: `testtenant`
  - Name: Test Environment

### ⏳ Pending

**1. Code Changes Required:**
- Modify `src/lib/supabase-middleware.ts` to add `ALLOWED_TENANTS` environment variable check
- Add backward-compatible default (allow all if not set)
- Block access to tenants not in allowed list

**2. Git Setup:**
- Create/update `staging` branch from current main
- Push to origin to trigger Vercel deployment

**3. Test User Accounts (Manual - via Supabase Dashboard):**
- Create `test-sa@compsync.net` (Super Admin)
- Create `test-cd@compsync.net` (Competition Director)
- Create `test-sd@compsync.net` (Studio Director)
- Create user_profiles for each
- Create test studio for SD account

**4. Vercel Configuration (Manual):**
- Add environment variable to production deployment: `ALLOWED_TENANTS=empwr,glow,admin`
- Add environment variable to staging deployment: `ALLOWED_TENANTS=testtenant`
- Add custom domain `testtenant.compsync.net` and assign to staging branch

**5. DNS Configuration (Manual):**
- Add CNAME record: `testtenant` → Vercel DNS endpoint

---

## Implementation Steps

### Step 1: Middleware Enhancement (15 min)

**File:** `src/lib/supabase-middleware.ts`

Add tenant access control:
```typescript
// After extracting subdomain, check if allowed
const allowedTenants = process.env.ALLOWED_TENANTS?.split(',') || null;

// If ALLOWED_TENANTS is set and subdomain not in list, block access
if (allowedTenants && subdomain && !allowedTenants.includes(subdomain)) {
  const url = request.nextUrl.clone();
  url.pathname = '/unauthorized';
  return NextResponse.redirect(url);
}
```

**Safety:** Default to allow-all if `ALLOWED_TENANTS` not set (backward compatible).

### Step 2: Git Branch Setup (5 min)

```bash
# Create staging branch from current main
git checkout main
git pull origin main
git checkout -b staging
git push origin staging

# Vercel will auto-detect and create staging deployment
```

### Step 3: Create Test Users (Manual - 10 min)

**Via Supabase Dashboard → Authentication → Add User:**

1. **Test Super Admin:**
   - Email: `test-sa@compsync.net`
   - Password: `123456`
   - After creation, note the user ID and run:
   ```sql
   INSERT INTO user_profiles (id, email, role, first_name, last_name, tenant_id)
   VALUES (
     '[USER_ID_FROM_AUTH]',
     'test-sa@compsync.net',
     'super_admin',
     'Test',
     'SuperAdmin',
     '00000000-0000-0000-0000-000000000003'
   );
   ```

2. **Test Competition Director:**
   - Email: `test-cd@compsync.net`
   - Password: `123456`
   - After creation, note the user ID and run:
   ```sql
   INSERT INTO user_profiles (id, email, role, first_name, last_name, tenant_id)
   VALUES (
     '[USER_ID_FROM_AUTH]',
     'test-cd@compsync.net',
     'competition_director',
     'Test',
     'Director',
     '00000000-0000-0000-0000-000000000003'
   );
   ```

3. **Test Studio Director:**
   - Email: `test-sd@compsync.net`
   - Password: `123456`
   - First, create test studio:
   ```sql
   INSERT INTO studios (id, tenant_id, name, email, phone, director_name, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     '00000000-0000-0000-0000-000000000003',
     'Test Studio',
     'test-sd@compsync.net',
     '555-0100',
     'Test Studio Director',
     NOW(),
     NOW()
   )
   RETURNING id;
   ```
   - Then create user profile with studio_id:
   ```sql
   INSERT INTO user_profiles (id, email, role, first_name, last_name, tenant_id, studio_id)
   VALUES (
     '[USER_ID_FROM_AUTH]',
     'test-sd@compsync.net',
     'studio_director',
     'Test',
     'StudioDirector',
     '00000000-0000-0000-0000-000000000003',
     '[STUDIO_ID_FROM_ABOVE]'
   );
   ```

### Step 4: Vercel Configuration (Manual - 10 min)

**In Vercel Dashboard → Project Settings:**

1. **Environment Variables:**
   - Go to Settings → Environment Variables
   - Add `ALLOWED_TENANTS` for Production (main branch):
     ```
     ALLOWED_TENANTS=empwr,glow,admin
     ```
   - Add `ALLOWED_TENANTS` for Preview (staging branch):
     ```
     ALLOWED_TENANTS=testtenant
     ```

2. **Custom Domain:**
   - Go to Settings → Domains
   - Add domain: `testtenant.compsync.net`
   - Select "Assign to Git Branch: staging"

### Step 5: DNS Configuration (Manual - 5 min + propagation)

**In your domain registrar (Namecheap, Cloudflare, etc.):**

Add CNAME record:
```
Type: CNAME
Name: testtenant
Value: cname.vercel-dns.com (or value shown in Vercel)
TTL: 3600
```

Wait 5-60 minutes for DNS propagation.

### Step 6: Populate Test Data (Optional - 15 min)

After user accounts created, you can populate basic test data:
- 1 competition
- 2-3 events
- 10 test dancers
- 1 approved reservation

(Can be done via UI or SQL script as needed)

---

## Deployment Workflow

### Deploy to Test Environment
```bash
# You say: "deploy this to test environment"
# Claude does:
git checkout staging
git merge [feature-branch-name]
git push origin staging
# Vercel auto-deploys to testtenant.compsync.net
```

### Deploy to Production
```bash
# You say: "it's ready, deploy to production"
# Claude does:
git checkout main
git merge staging
git push origin main
# Vercel auto-deploys to empwr.compsync.net + glow.compsync.net
```

---

## Safety Mechanisms

**1. Middleware Enforcement:**
- Production deployment can ONLY access empwr, glow, admin tenants
- Staging deployment can ONLY access testtenant
- Cross-access blocked at middleware level

**2. Code Isolation:**
- Separate git branches = production never sees unstable code
- Must explicitly merge staging → main to promote

**3. Data Isolation:**
- Same database, different tenant_id
- All queries filtered by tenant_id (existing architecture)
- Test tenant can be wiped without affecting production

**4. Rollback Safety:**
- If staging breaks, production unaffected
- If production breaks, can rollback main branch without touching staging

---

## Verification Checklist

After setup complete:

- [ ] `testtenant.compsync.net` loads
- [ ] Can login with `test-cd@compsync.net` / `123456`
- [ ] Can login with `test-sd@compsync.net` / `123456`
- [ ] Staging deployment blocks access to empwr/glow subdomains
- [ ] Production deployment blocks access to testtenant subdomain
- [ ] `empwr.compsync.net` and `glow.compsync.net` unaffected by staging changes
- [ ] Test data exists in database for test tenant
- [ ] Can create/delete data on testtenant without affecting production

---

## Risk Assessment

**Low Risk:**
- DNS misconfiguration (only adding NEW subdomain, not touching empwr/glow)
- Middleware blocks production (default to allow-all, explicit env vars required to block)

**Medium Risk:**
- Shared database migrations (test on testtenant first, then apply to all)
- Forgetting to merge staging → main (document clear promotion workflow)

**Mitigations:**
- Test all changes on testtenant.compsync.net first
- Verify middleware enforcement before promoting to production
- Always run migrations on test tenant before production tenants
- Document promotion checklist

---

## Estimated Timeline

- Code changes (middleware): 15 minutes
- Git branch setup: 5 minutes
- Test user creation: 10 minutes
- Vercel configuration: 10 minutes
- DNS setup: 5 minutes + 5-60 min propagation
- Verification testing: 20 minutes

**Total: ~65 minutes active work + DNS propagation wait**

---

## Notes

- Test tenant ID: `00000000-0000-0000-0000-000000000003`
- Existing tenants: EMPWR (0001), Glow (4b9c...), Admin (0999)
- All tenants share same Supabase database
- Middleware extracts subdomain from hostname for tenant routing
- Vercel supports multiple git branches with different environment variables
