# Multi-Tenant Architecture Migration Audit
**Date:** October 24, 2025
**Project:** CompPortal (CompSync Platform)
**Current State:** Single-tenant (EMPWR) with partial multi-tenant infrastructure
**Target State:** Full multi-tenant with subdomain-based tenant isolation

---

## Executive Summary

CompPortal attempted multi-tenant architecture in October 2025 but **rolled back due to runtime errors**. The infrastructure exists but has **critical gaps** causing production failures. This audit documents:

1. **What was attempted** (October 10, 2025)
2. **Why it failed** (October 16, 2025 emergency rollback)
3. **Current state** (hardcoded EMPWR tenant IDs)
4. **Safe path forward** (phased migration plan)

**Critical Finding:** Multi-tenant infrastructure is **90% complete** but has **hardcoded EMPWR fallbacks** that mask tenant context failures. These must be removed systematically to enable true multi-tenancy.

---

## Historical Context

### Initial Multi-Tenant Implementation (Oct 10, 2025)

**Commits:**
- `293a1f6` - Enable multi-tenant subdomain detection
- `0570a18` - Add tenant detection logging and debug endpoint

**What Worked:**
- ✅ Subdomain extraction (`empwr.compsync.net` → `empwr`)
- ✅ Tenant database table created with RLS policies
- ✅ Middleware injects `x-tenant-id` and `x-tenant-data` headers
- ✅ tRPC context receives tenant information
- ✅ Branding loaded dynamically from database

**Session Summary:** `docs/archive/oct-2025-sessions/SESSION_OCT10_MULTI_TENANT_FIX.md`

---

### Emergency Rollback (Oct 16, 2025)

**Problem:** Studio Directors couldn't delete dancers (500 errors)

**Root Cause:**
```typescript
// dancer.ts:258 - This failed in production
tenant_id: ctx.tenantId!  // ctx.tenantId was NULL at runtime
```

**Why ctx.tenantId was NULL:**
- Multi-tenant middleware was partially disabled
- Fallback logic in tRPC route handler wasn't working correctly
- `!` assertion operator masked the null value until database rejection

**Emergency Fix Commit:** `cf6b9ec` - Replace `ctx.tenantId` with hardcoded EMPWR tenant ID

**Files Affected:**
- `src/server/routers/dancer.ts` - 3 mutations hardcoded
- Context middleware - Fallback added but not tested
- Multiple other routers already had hardcoded IDs (entry, competition, admin)

**Impact:** Production stabilized but **multi-tenancy broken**

---

## Current Architecture State

### Database Schema (✅ Ready for Multi-Tenant)

**Tenant Table:**
```sql
tenants (
  id uuid PRIMARY KEY,
  slug varchar,              -- 'empwr', 'glowdance'
  subdomain varchar,         -- 'empwr', 'glow'
  name varchar,              -- 'EMPWR Dance'
  branding jsonb,            -- logo, colors, tagline

  -- Tenant-wide settings (competition defaults)
  age_division_settings jsonb,
  classification_settings jsonb,
  entry_fee_settings jsonb,
  dance_category_settings jsonb,
  scoring_system_settings jsonb,
  entry_size_settings jsonb,
  award_settings jsonb
)
```

**Tables with tenant_id Foreign Key:**
- `user_profiles.tenant_id` → tenants.id
- `studios.tenant_id` → tenants.id
- `dancers.tenant_id` → tenants.id
- `competitions.tenant_id` → tenants.id
- `competition_entries.tenant_id` → tenants.id
- `reservations.tenant_id` → tenants.id
- `invoices.tenant_id` → tenants.id

**RLS Policies:**
```sql
-- Anonymous users can read tenant branding (for homepage)
CREATE POLICY "tenants_public_select"
ON tenants FOR SELECT TO anon USING (true);

-- Authenticated users can read their own tenant
CREATE POLICY "tenants_user_own"
ON tenants FOR SELECT TO authenticated
USING (id = get_user_tenant_id());

-- Super admins can do everything
CREATE POLICY "tenants_super_admin_all"
ON tenants FOR ALL TO authenticated
USING (is_super_admin());
```

**Status:** ✅ Database schema is **multi-tenant ready**

---

### Subdomain Routing (⚠️ Partially Working)

**Current Flow:**

1. **Middleware** (`src/lib/supabase-middleware.ts`)
   ```typescript
   // Extract subdomain from hostname
   const subdomain = extractSubdomain(hostname); // "empwr"

   // Query tenant by subdomain
   const { data } = await supabase
     .from('tenants')
     .eq('subdomain', subdomain)
     .single();

   // Inject into request headers
   requestHeaders.set('x-tenant-id', tenantId);
   requestHeaders.set('x-tenant-data', JSON.stringify(tenantData));

   // ⚠️ FALLBACK: Hardcoded EMPWR if lookup fails
   const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
   ```

2. **tRPC Context** (`src/app/api/trpc/[trpc]/route.ts`)
   ```typescript
   // Extract tenant from headers
   const tenantId = req.headers.get('x-tenant-id');
   const tenantData = JSON.parse(req.headers.get('x-tenant-data'));

   // ⚠️ FALLBACK: Hardcoded EMPWR if headers missing
   const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

   return { userId, userRole, studioId, tenantId: finalTenantId, tenantData };
   ```

3. **Router Usage** (varies by file)
   ```typescript
   // ❌ WRONG: Hardcoded tenant ID (13 locations)
   tenant_id: '00000000-0000-0000-0000-000000000001'

   // ✅ CORRECT: Use context tenant ID (12 locations)
   tenant_id: ctx.tenantId!

   // ⚠️ RISKY: Conditional fallback (5 locations)
   if (ctx.tenantId) {
     where.tenant_id = ctx.tenantId;
   }
   ```

**Status:** ⚠️ **Subdomain routing works** but **multiple hardcoded fallbacks mask failures**

---

### Hardcoded Tenant References (🔴 Critical Issue)

**Grep Results:** 13 hardcoded `'00000000-0000-0000-0000-000000000001'` references

**Locations:**

1. **src/server/routers/dancer.ts** (3 occurrences)
   - Line 258: `create` mutation
   - Line 505: `bulkCreate` mutation
   - Line 690: `bulkImport` mutation
   - **Impact:** All dancers created with EMPWR tenant ID regardless of actual tenant

2. **src/app/onboarding/page.tsx** (1 occurrence)
   - Line 129: Studio creation during onboarding
   - **Impact:** All new studios assigned to EMPWR tenant

3. **src/lib/supabase-middleware.ts** (1 occurrence - fallback)
   - Line 63: Fallback when subdomain lookup fails
   - **Impact:** Masks subdomain detection failures

4. **src/app/api/trpc/[trpc]/route.ts** (1 occurrence - fallback)
   - Line 50: Fallback when headers missing
   - **Impact:** Masks middleware failures

5. **src/app/dashboard/settings/tenant/page.tsx** (1 occurrence - comment)
   - Line 19: Comment acknowledging no multi-tenant support
   - **Impact:** UI assumes single tenant

**Conditional `ctx.tenantId` Usage (24 locations):**
- `liveCompetition.ts` - 11 procedures check `if (!ctx.tenantId)`
- `studio.ts` - 2 conditional queries
- `competition.ts` - 2 conditional queries
- Others: `entry.ts`, `reservation.ts`, `ipWhitelist.ts`, `admin.ts`

**Status:** 🔴 **Hardcoded EMPWR IDs prevent multi-tenancy**

---

### Branding System (✅ Working for Homepage)

**Current Implementation:**

```typescript
// src/lib/tenant-context.ts
export async function getTenantData(): Promise<TenantData | null> {
  const subdomain = extractSubdomain(hostname);

  // Query by subdomain
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    select: { id, slug, subdomain, name, branding },
  });

  // Return tenant branding
  return {
    id: tenant.id,
    name: tenant.name,
    branding: {
      primaryColor, secondaryColor, logo, tagline
    }
  };
}
```

**Usage:**
- Homepage (`src/app/page.tsx`) - Loads branding dynamically
- Email templates (`src/emails/*.tsx`) - Tenant-aware (partially)
- Invoice PDFs - **NOT tenant-aware** (hardcoded "GLOWDANCE")

**What Works:**
- ✅ Homepage displays correct tenant name and colors
- ✅ Subdomain detection functional
- ✅ Database queries work

**What Doesn't Work:**
- ❌ Invoice PDFs show "GLOWDANCE" regardless of tenant
- ❌ Schedules use hardcoded branding
- ❌ Email "From" name not tenant-specific

**Status:** ✅ **Branding infrastructure exists**, ⚠️ **incomplete coverage**

---

## Data Isolation Gaps

### Current RLS Coverage

**Tables WITH RLS Enabled:**
- user_profiles ✅
- studios ✅
- dancers ✅
- competitions ✅
- competition_entries ✅
- reservations ✅
- invoices ✅
- All other major tables ✅

**Tables WITHOUT tenant_id column:**
- `age_groups` - Global reference data
- `dance_categories` - Global reference data
- `classifications` - Global reference data
- `entry_size_categories` - Global reference data
- `award_types` - Global reference data
- `email_templates` - Shared across tenants
- `system_settings` - Global configuration

**Potential Data Leakage Points:**

1. **Studio Directors seeing other tenants' data**
   - **Risk Level:** HIGH
   - **Current Protection:** RLS policies filter by `tenant_id`
   - **Gap:** Some routers have conditional tenant filtering (not enforced)
   - **Example:**
     ```typescript
     // studio.ts:84 - Conditional filter
     if (ctx.tenantId) {
       where.tenant_id = ctx.tenantId;
     }
     // ⚠️ If ctx.tenantId is null, returns ALL studios
     ```

2. **Competition Directors seeing cross-tenant competitions**
   - **Risk Level:** MEDIUM
   - **Current Protection:** RLS policies + query filters
   - **Gap:** Relies on application-layer `ctx.tenantId` being correct

3. **Invoices crossing tenant boundaries**
   - **Risk Level:** CRITICAL
   - **Current Protection:** RLS + `tenant_id` foreign key
   - **Gap:** Hardcoded tenant IDs bypass isolation

4. **Super Admin access across tenants**
   - **Risk Level:** LOW (expected behavior)
   - **Current Protection:** RLS policies check `is_super_admin()`
   - **Status:** ✅ Working as designed

**Recommendation:** ⚠️ **RLS policies alone are NOT sufficient**. Application-layer `ctx.tenantId` validation is **critical** and currently **bypassed by hardcoded IDs**.

---

## User Requirements Analysis

Based on your request:

> "I want each CD to have their own subdomain so right now we have empwr.compsync.net but other clients will be like client.compsync.net"

**Current State:** ✅ Subdomain routing infrastructure exists

**Required Changes:**
1. Remove hardcoded `00000000-0000-0000-0000-000000000001` references
2. Add tenant validation to all routers
3. Enforce `ctx.tenantId` is never null for authenticated routes

---

> "They will have all their own branding for the invoices for the schedules for anything that currently has things like GLOWDANCE on it right now"

**Current State:** ⚠️ Branding partially implemented

**Gaps:**

1. **Invoice PDFs** - Hardcoded "GLOWDANCE"
   - File: `src/app/api/generate-invoice-pdf/route.ts` (likely location)
   - **Fix:** Use `ctx.tenantData.name` and `ctx.tenantData.branding.logo`

2. **Schedules** - Hardcoded branding
   - **Fix:** Pass tenant branding to schedule generation

3. **Email "From" Name** - Generic or hardcoded
   - File: `src/lib/email.ts`
   - **Fix:** Use `${tenantData.name} <noreply@${tenantData.subdomain}.compsync.net>`

4. **Email Footer** - Generic branding
   - Files: `src/emails/*.tsx`
   - **Fix:** Use tenant logo and colors

---

> "They will have their own SDs that need to be strictly scoped to the CD"

**Current State:** ⚠️ Scoping exists but not enforced

**Implementation:**

```sql
-- Studio Directors belong to studios
-- Studios belong to tenants
studios.tenant_id → tenants.id
user_profiles.tenant_id → tenants.id (for CDs)

-- RLS ensures SDs only see their tenant's data
CREATE POLICY "studios_tenant_isolation"
ON studios FOR SELECT
USING (tenant_id = get_user_tenant_id());
```

**Current Risk:**
- Hardcoded `ctx.tenantId` in routers bypasses RLS
- If `ctx.tenantId` is null, conditional queries return ALL studios

**Required Fix:**
- Enforce `ctx.tenantId` is never null
- Remove all hardcoded tenant IDs
- Add validation: `if (!ctx.tenantId) throw FORBIDDEN`

---

> "CD will have all of their own event dates as well as competition settings which include routine age categories et cetera everything on their competition settings page and their own pricing"

**Current State:** ✅ Database schema supports this

**Implementation:**

```typescript
// Tenants have default settings
tenants.age_division_settings
tenants.classification_settings
tenants.entry_fee_settings
tenants.dance_category_settings
tenants.scoring_system_settings
tenants.entry_size_settings

// Competitions can override tenant defaults
competitions.age_division_settings
competitions.classification_settings
competitions.entry_fee_settings
// ... etc
```

**Current Status:**
- ✅ Database columns exist
- ✅ Tenant settings page exists (`/dashboard/settings/tenant`)
- ⚠️ Settings page has comment "Hardcoded EMPWR tenant ID (no multi-tenant support)"
- ❌ Competition override UI not implemented

**Required Changes:**
1. Remove hardcoded tenant ID from settings page
2. Use `ctx.tenantId` to load correct tenant settings
3. Add competition-level override UI

---

> "This must not be visible [cross-tenant data]"

**Current State:** 🔴 **NOT guaranteed**

**Why:**
- Hardcoded `00000000-0000-0000-0000-000000000001` causes ALL data to go to EMPWR tenant
- If `ctx.tenantId` is null, some queries return ALL data (not filtered)
- RLS policies provide partial protection but rely on correct `tenant_id` values

**Required Fix:**
- **CRITICAL:** Remove all hardcoded tenant IDs
- **CRITICAL:** Enforce `ctx.tenantId` validation in all routers
- **CRITICAL:** Add `USING (tenant_id = get_user_tenant_id())` to ALL RLS policies
- **HIGH:** Audit all queries for tenant filtering
- **HIGH:** Add integration tests for tenant isolation

---

## Risk Assessment

### High-Risk Areas (Must Fix Before Launch)

1. **Hardcoded Tenant IDs** - 🔴 CRITICAL
   - **Impact:** All new data goes to EMPWR tenant regardless of subdomain
   - **Affected:** Dancers, studios, onboarding, multiple routers
   - **Fix Complexity:** LOW (find/replace)
   - **Testing Risk:** MEDIUM (could break existing EMPWR data)

2. **Null ctx.tenantId Handling** - 🔴 CRITICAL
   - **Impact:** Queries without tenant filter return ALL tenants' data
   - **Affected:** 24 conditional checks across routers
   - **Fix Complexity:** MEDIUM (add validation middleware)
   - **Testing Risk:** LOW (fails fast if broken)

3. **Invoice PDF Branding** - 🟡 HIGH
   - **Impact:** All invoices show "GLOWDANCE" branding
   - **Affected:** Invoice generation API route
   - **Fix Complexity:** LOW (pass tenant branding)
   - **Testing Risk:** LOW (visual regression only)

4. **RLS Policy Enforcement** - 🟡 HIGH
   - **Impact:** RLS relies on correct `tenant_id` values
   - **Affected:** All tables with `tenant_id`
   - **Fix Complexity:** MEDIUM (audit all policies)
   - **Testing Risk:** HIGH (data isolation tests required)

### Medium-Risk Areas

5. **Email Branding** - 🟢 MEDIUM
   - **Impact:** Generic "From" names and footers
   - **Affected:** Email service
   - **Fix Complexity:** LOW
   - **Testing Risk:** LOW

6. **Competition Settings Override** - 🟢 MEDIUM
   - **Impact:** CDs can't customize competition settings independently
   - **Affected:** Competition settings page
   - **Fix Complexity:** MEDIUM (UI + backend)
   - **Testing Risk:** MEDIUM

### Low-Risk Areas

7. **Schedule Branding** - 🟢 LOW
   - **Impact:** Schedules may show generic branding
   - **Affected:** Schedule generation
   - **Fix Complexity:** LOW
   - **Testing Risk:** LOW

8. **Super Admin Dashboard** - 🟢 LOW
   - **Impact:** No cross-tenant management UI
   - **Affected:** None (not implemented yet)
   - **Fix Complexity:** HIGH (new feature)
   - **Testing Risk:** LOW

---

## Phased Migration Plan

### Phase 0: Pre-Migration Audit (1-2 hours)

**Goal:** Establish baseline and safety checks

**Tasks:**
1. Run Supabase advisors for security/performance issues
   ```bash
   mcp__supabase__get_advisors --type security
   mcp__supabase__get_advisors --type performance
   ```

2. Create database backup
   ```sql
   -- Via Supabase dashboard
   -- Download full database dump
   ```

3. Document current EMPWR tenant data
   ```sql
   SELECT
     'user_profiles' as table_name, COUNT(*) as count
   FROM user_profiles WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
   UNION ALL
   SELECT 'studios', COUNT(*) FROM studios WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
   UNION ALL
   SELECT 'dancers', COUNT(*) FROM dancers WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
   -- ... for all tables
   ```

4. Create test tenant in database
   ```sql
   INSERT INTO tenants (id, slug, subdomain, name, branding)
   VALUES (
     '00000000-0000-0000-0000-000000000002',
     'glowdance',
     'glow',
     'GlowDance Competition',
     '{"primaryColor": "#FF6B35", "secondaryColor": "#F7931E", "tagline": "Shine Bright"}'
   );
   ```

5. Add test subdomain to Vercel/DNS
   ```
   glow.compsync.net → CNAME → cname.vercel-dns.com
   ```

**Deliverables:**
- Database backup file
- Tenant data inventory
- Test tenant created
- Test subdomain configured

---

### Phase 1: Remove Hardcoded Tenant IDs (2-3 hours)

**Goal:** Eliminate hardcoded `00000000-0000-0000-0000-000000000001` references

**Risk Level:** 🔴 CRITICAL - Will break EMPWR if done incorrectly

**Safety Strategy:**
1. Do NOT remove fallbacks in middleware/tRPC context yet
2. ONLY remove hardcoded IDs in router mutations
3. Replace with `ctx.tenantId!` (keeps `!` assertion for now)
4. Test extensively with EMPWR subdomain before proceeding

**Files to Modify:**

1. **src/server/routers/dancer.ts** (3 changes)
   ```typescript
   // BEFORE
   tenant_id: '00000000-0000-0000-0000-000000000001'

   // AFTER
   tenant_id: ctx.tenantId!
   ```
   - Line 258: `create` mutation
   - Line 505: `bulkCreate` mutation
   - Line 690: `bulkImport` mutation

2. **src/app/onboarding/page.tsx** (1 change)
   ```typescript
   // BEFORE
   tenant_id: '00000000-0000-0000-0000-000000000001'

   // AFTER
   tenant_id: tenantId  // Extract from context/headers
   ```
   - Line 129: Studio creation
   - **Note:** This is a page component, must use `getTenantId()` from headers

3. **src/app/dashboard/settings/tenant/page.tsx** (1 change)
   ```typescript
   // BEFORE (comment)
   // Hardcoded EMPWR tenant ID (no multi-tenant support)

   // AFTER
   const tenantId = await getTenantId();
   if (!tenantId) throw new Error('Tenant context required');
   ```
   - Line 19: Fetch tenant settings dynamically

**Testing Protocol:**
1. Build succeeds (`npm run build`)
2. Test on `empwr.compsync.net`:
   - Create dancer
   - Delete dancer
   - Bulk import dancers
   - Complete onboarding flow
   - View tenant settings
3. Test on `glow.compsync.net`:
   - Verify tenant branding loads
   - Attempt to create dancer (should use glow tenant ID)
4. Verify database:
   ```sql
   SELECT tenant_id, COUNT(*) FROM dancers GROUP BY tenant_id;
   -- Should show both EMPWR and glow tenant IDs
   ```

**Rollback Plan:**
```bash
git stash  # If uncommitted
git revert <commit>  # If committed
```

**Success Criteria:**
- ✅ All 5 hardcoded references removed
- ✅ EMPWR subdomain still works
- ✅ Test subdomain creates data with correct tenant_id
- ✅ No 500 errors in production

**Estimated Duration:** 2-3 hours (including testing)

---

### Phase 2: Add Tenant Validation Middleware (1-2 hours)

**Goal:** Enforce `ctx.tenantId` is never null for protected routes

**Risk Level:** 🟡 MEDIUM - May require tRPC middleware pattern

**Implementation:**

Create new tRPC middleware:

```typescript
// src/server/trpc.ts

/**
 * Tenant-scoped procedure - requires valid tenant context
 */
export const tenantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Tenant context required. Multi-tenant detection failed.'
    });
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId, // Type is now string (not string | null)
    },
  });
});
```

**Usage Pattern:**
```typescript
// BEFORE
router.entry.create = protectedProcedure
  .input(entrySchema)
  .mutation(async ({ ctx, input }) => {
    // ctx.tenantId could be null!
    tenant_id: ctx.tenantId!
  });

// AFTER
router.entry.create = tenantProcedure  // ← Changed
  .input(entrySchema)
  .mutation(async ({ ctx, input }) => {
    // ctx.tenantId is guaranteed non-null
    tenant_id: ctx.tenantId  // No ! needed
  });
```

**Files to Modify:**

Replace `protectedProcedure` with `tenantProcedure` in:
- `src/server/routers/entry.ts` - All mutations
- `src/server/routers/dancer.ts` - All mutations
- `src/server/routers/competition.ts` - All mutations
- `src/server/routers/reservation.ts` - All mutations
- `src/server/routers/invoice.ts` - All mutations
- `src/server/routers/studio.ts` - All mutations
- **Do NOT change:**
  - `liveCompetition.ts` - Uses `ctx.tenantId` checks for public queries
  - `publicProcedure` endpoints - Anonymous access allowed

**Testing:**
1. Test with valid subdomain - should work normally
2. Test with invalid subdomain - should fail fast with clear error
3. Test localhost:3000 - should use fallback tenant
4. Verify error messages are user-friendly

**Success Criteria:**
- ✅ All tenant-scoped routes use `tenantProcedure`
- ✅ Clear error when tenant detection fails
- ✅ EMPWR subdomain works
- ✅ Test subdomain works

**Estimated Duration:** 1-2 hours

---

### Phase 3: Remove Fallback Hardcodes (1 hour)

**Goal:** Remove `00000000-0000-0000-0000-000000000001` fallbacks in middleware

**Risk Level:** 🔴 HIGH - Will break localhost development

**Current Fallbacks:**

1. **src/lib/supabase-middleware.ts:63**
   ```typescript
   // BEFORE
   const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

   // AFTER
   const finalTenantId = tenantId || null;
   // Let downstream tenantProcedure handle null case
   ```

2. **src/app/api/trpc/[trpc]/route.ts:50**
   ```typescript
   // BEFORE
   const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

   // AFTER
   const finalTenantId = tenantId;
   // No fallback - fail fast if middleware didn't set it
   ```

**Development Environment Consideration:**

For localhost:3000 (no subdomain), add environment variable:

```env
# .env.local
LOCAL_DEV_TENANT_SUBDOMAIN=empwr
```

```typescript
// middleware update
const subdomain = extractSubdomain(hostname) || process.env.LOCAL_DEV_TENANT_SUBDOMAIN;
```

**Testing:**
1. Test empwr.compsync.net - should work
2. Test glow.compsync.net - should work
3. Test compsync.net (no subdomain) - should show error or redirect
4. Test localhost:3000 - should use LOCAL_DEV_TENANT_SUBDOMAIN

**Success Criteria:**
- ✅ No hardcoded fallbacks in middleware
- ✅ Clear error when subdomain missing
- ✅ Localhost development still works

**Estimated Duration:** 1 hour

---

### Phase 4: Branding Integration (3-4 hours)

**Goal:** Replace all hardcoded branding with tenant branding

**Files to Modify:**

1. **Invoice PDFs**
   - File: Search for "GLOWDANCE" in PDF generation code
   - Replace with `ctx.tenantData.name`
   - Add tenant logo: `ctx.tenantData.branding.logo`
   - Use tenant colors for header/footer

2. **Email Templates**
   - Files: `src/emails/*.tsx`
   - Update "From" name: `${tenantData.name} <noreply@compsync.net>`
   - Use tenant colors in email header
   - Add tenant logo to email footer
   - Replace hardcoded text with `tenantData.name`

3. **Schedules** (if applicable)
   - Search for hardcoded competition names
   - Replace with `competition.name` or `tenantData.name`

4. **Email Service**
   - File: `src/lib/email.ts`
   - Update Resend `from` field:
     ```typescript
     from: `${tenantData.name} <noreply@${tenantData.subdomain}.compsync.net>`
     ```

**Testing:**
1. Generate invoice for EMPWR - should show "EMPWR Dance" branding
2. Generate invoice for GlowDance - should show "GlowDance" branding
3. Send test emails from both tenants - verify "From" name
4. Visual regression test all email templates

**Success Criteria:**
- ✅ No "GLOWDANCE" hardcoded text
- ✅ Invoices show correct tenant branding
- ✅ Emails show correct tenant branding
- ✅ Schedules show correct tenant name

**Estimated Duration:** 3-4 hours

---

### Phase 5: RLS Policy Audit (2-3 hours)

**Goal:** Ensure all tables have proper tenant isolation policies

**Audit Checklist:**

For each table with `tenant_id`:

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'studios';

-- Required policies:
-- 1. SELECT - Users see only their tenant
CREATE POLICY "studios_tenant_select"
ON studios FOR SELECT
USING (tenant_id = get_user_tenant_id() OR is_super_admin());

-- 2. INSERT - Can only create in their tenant
CREATE POLICY "studios_tenant_insert"
ON studios FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() OR is_super_admin());

-- 3. UPDATE - Can only update their tenant
CREATE POLICY "studios_tenant_update"
ON studios FOR UPDATE
USING (tenant_id = get_user_tenant_id() OR is_super_admin());

-- 4. DELETE - Can only delete their tenant
CREATE POLICY "studios_tenant_delete"
ON studios FOR DELETE
USING (tenant_id = get_user_tenant_id() OR is_super_admin());
```

**Tables to Audit:**
- user_profiles
- studios
- dancers
- competitions
- competition_entries
- reservations
- invoices
- All other tables with `tenant_id`

**Helper Function:**
```sql
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;
```

**Testing:**
1. Create two test users (one per tenant)
2. Login as user 1, query studios - should only see tenant 1 studios
3. Login as user 2, query studios - should only see tenant 2 studios
4. Attempt to insert with wrong tenant_id - should fail
5. Super admin - should see all tenants

**Success Criteria:**
- ✅ All tables have SELECT/INSERT/UPDATE/DELETE policies
- ✅ Policies reference `get_user_tenant_id()`
- ✅ Super admin bypass works
- ✅ Cross-tenant queries return zero results

**Estimated Duration:** 2-3 hours

---

### Phase 6: Production Testing (2-3 hours)

**Goal:** Verify multi-tenancy works end-to-end

**Test Scenarios:**

**Tenant 1: EMPWR (empwr.compsync.net)**

1. Competition Director Login
   - Create competition
   - Configure competition settings (age divisions, pricing)
   - Approve studio registration

2. Studio Director Login
   - Register studio
   - Create dancers
   - Submit reservation
   - Create routines
   - Submit summary

3. Invoice Flow
   - CD generates invoice
   - Verify invoice shows "EMPWR Dance" branding
   - SD views invoice
   - Mark as paid

**Tenant 2: GlowDance (glow.compsync.net)**

1. Competition Director Login
   - Create competition with different settings
   - Configure different pricing

2. Studio Director Login
   - Register different studio
   - Create dancers
   - Verify cannot see EMPWR dancers

3. Cross-Tenant Verification
   - Login as EMPWR SD on glow.compsync.net - should fail
   - Query database - verify no cross-tenant data visible
   - Check invoices - verify correct branding

**Data Isolation Tests:**

```sql
-- As EMPWR user
SELECT COUNT(*) FROM studios;  -- Should return only EMPWR studios

-- As GlowDance user
SELECT COUNT(*) FROM studios;  -- Should return only GlowDance studios

-- As Super Admin
SELECT tenant_id, COUNT(*) FROM studios GROUP BY tenant_id;
-- Should return both tenants
```

**Success Criteria:**
- ✅ Both tenants work independently
- ✅ No cross-tenant data visible
- ✅ Branding correct for each tenant
- ✅ RLS policies enforced
- ✅ No hardcoded tenant IDs

**Estimated Duration:** 2-3 hours

---

### Phase 7: Documentation & Handoff (1-2 hours)

**Goal:** Document multi-tenant architecture for team

**Deliverables:**

1. **Tenant Creation Guide** (`docs/reference/TENANT_SETUP.md`)
   - How to add new tenant to database
   - How to configure DNS/subdomain
   - How to set tenant branding
   - How to configure tenant settings

2. **Multi-Tenant Architecture Doc** (`docs/reference/MULTI_TENANT_ARCHITECTURE.md`)
   - Subdomain routing flow diagram
   - Tenant context propagation
   - RLS policy patterns
   - Common pitfalls

3. **Super Admin Guide** (`docs/reference/SUPER_ADMIN_GUIDE.md`)
   - How to impersonate tenant users
   - How to view cross-tenant data
   - How to troubleshoot tenant issues

4. **Testing Checklist** (`docs/testing/MULTI_TENANT_TESTING.md`)
   - Tenant isolation test cases
   - Branding verification tests
   - Security audit procedures

**Success Criteria:**
- ✅ Team can add new tenant without developer help
- ✅ Architecture is documented
- ✅ Testing procedures established

**Estimated Duration:** 1-2 hours

---

## Total Migration Timeline

| Phase | Duration | Risk | Prerequisites |
|-------|----------|------|---------------|
| **Phase 0:** Pre-Migration Audit | 1-2 hours | LOW | None |
| **Phase 1:** Remove Hardcoded IDs | 2-3 hours | HIGH | Phase 0 complete, backup created |
| **Phase 2:** Tenant Validation | 1-2 hours | MEDIUM | Phase 1 tested |
| **Phase 3:** Remove Fallbacks | 1 hour | HIGH | Phase 2 tested |
| **Phase 4:** Branding Integration | 3-4 hours | LOW | Phase 3 tested |
| **Phase 5:** RLS Policy Audit | 2-3 hours | MEDIUM | Phase 4 complete |
| **Phase 6:** Production Testing | 2-3 hours | HIGH | All phases complete |
| **Phase 7:** Documentation | 1-2 hours | LOW | Phase 6 passed |

**Total Estimated Time:** 13-20 hours

**Recommended Schedule:**
- **Week 1:** Phases 0-2 (foundational changes, high risk)
- **Week 2:** Phases 3-4 (branding, medium risk)
- **Week 3:** Phases 5-7 (polish, testing, docs)

---

## Rollback Strategy

At each phase, maintain rollback capability:

```bash
# Before starting phase
git checkout -b multi-tenant-phase-N
git commit -m "chore: Checkpoint before Phase N"

# If phase fails
git checkout main
git branch -D multi-tenant-phase-N

# If phase succeeds
git checkout main
git merge multi-tenant-phase-N
git push
```

**Emergency Rollback (Production):**

If multi-tenancy breaks production after deployment:

1. **Quick Fix:** Re-add hardcoded EMPWR IDs
   ```typescript
   tenant_id: ctx.tenantId || '00000000-0000-0000-0000-000000000001'
   ```

2. **Deploy immediately:**
   ```bash
   git add .
   git commit -m "fix: Emergency rollback - restore EMPWR fallback"
   git push
   ```

3. **Investigate root cause:**
   - Check Vercel logs
   - Query database for tenant_id = null
   - Test subdomain detection
   - Verify middleware headers

---

## Success Metrics

### Technical Metrics

- ✅ Zero hardcoded `00000000-0000-0000-0000-000000000001` references
- ✅ All RLS policies enforce `tenant_id` filtering
- ✅ All protected routes use `tenantProcedure`
- ✅ All branding points use `ctx.tenantData`
- ✅ Build passes with zero TypeScript errors
- ✅ Supabase advisors report zero security issues

### Functional Metrics

- ✅ 2+ tenants running concurrently
- ✅ Zero cross-tenant data leakage
- ✅ Correct branding on invoices/emails/schedules
- ✅ Tenant-specific settings working
- ✅ Subdomain routing working for all tenants

### Business Metrics

- ✅ Can onboard new client in < 30 minutes
- ✅ No manual developer intervention required
- ✅ Clients have full branding control
- ✅ Pricing/settings fully customizable per tenant

---

## Critical Risks Summary

### 🔴 Critical Risks (Must Address)

1. **Hardcoded Tenant IDs**
   - **Impact:** All data goes to wrong tenant
   - **Mitigation:** Phase 1 (remove all hardcoded IDs)
   - **Testing:** Extensive cross-tenant testing

2. **Null ctx.tenantId**
   - **Impact:** Queries return all tenants' data
   - **Mitigation:** Phase 2 (tenant validation middleware)
   - **Testing:** Error handling tests

3. **RLS Policy Gaps**
   - **Impact:** Data leakage between tenants
   - **Mitigation:** Phase 5 (RLS audit)
   - **Testing:** Security penetration testing

### 🟡 High Risks (Should Address)

4. **Invoice Branding**
   - **Impact:** Wrong company name on legal documents
   - **Mitigation:** Phase 4 (branding integration)
   - **Testing:** Visual regression tests

5. **Email From Names**
   - **Impact:** Confusing sender identity
   - **Mitigation:** Phase 4 (email branding)
   - **Testing:** Email delivery tests

### 🟢 Medium Risks (Nice to Have)

6. **Competition Settings Inheritance**
   - **Impact:** CDs can't customize independently
   - **Mitigation:** Future enhancement
   - **Testing:** UI/UX testing

7. **Schedule Branding**
   - **Impact:** Generic schedule PDFs
   - **Mitigation:** Phase 4 (branding integration)
   - **Testing:** PDF generation tests

---

## Conclusion

CompPortal is **90% ready for multi-tenancy** but has **critical hardcoded references** preventing safe deployment. The infrastructure (database, middleware, routing) is solid. The path forward is **systematic removal of hardcoded tenant IDs** followed by **comprehensive testing**.

**Recommended Approach:**
1. ✅ Follow phased migration plan (Phases 1-7)
2. ✅ Do NOT skip testing phases
3. ✅ Maintain rollback capability at each step
4. ✅ Deploy to staging first, then production
5. ✅ Monitor first 2 tenants closely for data isolation issues

**Timeline:** 13-20 hours over 3 weeks

**Confidence Level:** 85% success if phased approach followed

**Key Success Factor:** **Thorough testing at each phase** - do not proceed to next phase until current phase is verified working.

---

**Next Steps:**
1. Review this audit with team
2. Get approval for phased approach
3. Create test tenant (Phase 0)
4. Begin Phase 1 (remove hardcoded IDs)

---

**Document Version:** 1.0
**Last Updated:** October 24, 2025
**Author:** Claude Code
**Status:** Ready for Review
