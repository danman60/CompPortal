# Multi-Tenant Pre-Implementation Analysis Report

**Date:** October 26, 2025
**Session:** 19 (Continuation)
**Purpose:** Crystal clear understanding before implementing multi-tenant subdomain isolation
**Context:** Previous multi-tenant attempt broke EMPWR tenant - extreme caution required

---

## Executive Summary

**Overall Assessment:** ✅ READY TO PROCEED with specific guidance

**Critical Findings:**
- ✅ Q1: `getCurrentUser` query EXISTS at `src/server/routers/user.ts:36`
- ✅ Q2: `/api/tenant` endpoint EXISTS and properly implemented
- ✅ Q3: Email/PDF function signatures DO NOT need changing (already support branding)
- ⚠️ Q4: Invalid subdomain behavior NEEDS fix (currently falls back to EMPWR)
- ⚠️ Q5: User decision: Invalid subdomains should throw 404 (not fallback)
- ✅ Q6: NO need to replace `/api/tenant` - existing implementation works

**Key Decisions:**
- Manual Vercel subdomain setup (no Enterprise needed)
- Only 2 production tenants total (EMPWR + 1 new client this year)
- Invalid subdomains = 404 error (security best practice)
- Keep existing `/api/tenant` endpoint (no replacement needed)
- Email/PDF already support `tenantBranding` parameter (just need to PASS it)

**Estimated Implementation Time:** 3.5 hours (reduced from 11 hours due to findings)

---

## Q1: getCurrentUser Query Verification

**Question:** Does `trpc.user.getCurrentUser` query exist for settings page fix?

**Answer:** ✅ YES - CONFIRMED EXISTS

**Location:** `src/server/routers/user.ts:36`

```typescript
getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
  // Implementation exists
});
```

**Impact on Implementation:**
- Settings page (Task 3) can proceed as planned
- No need to create new query
- Line 20 reference in spec is accurate

**Action:** NO changes needed - spec is correct

---

## Q2: Vercel Subdomain Setup Verification

**Question:** What's the simplest Vercel setup for subdomains without Enterprise?

**Answer:** ✅ MANUAL SETUP (acceptable for 2 tenants)

**Process:**
1. In Vercel project settings → Domains
2. Add each subdomain manually:
   - `empwr.compsync.net`
   - `[newclient].compsync.net`
3. Vercel provides DNS records to add to Cloudflare/DNS provider
4. DNS propagation (5-60 minutes)
5. Automatic HTTPS certificate provisioning

**Why Manual is Acceptable:**
- Only 2 production tenants (EMPWR + 1 new client this year)
- New tenant onboarding is infrequent (1 per year)
- Manual setup takes ~5 minutes per tenant
- No $2500/month Enterprise cost needed

**Vercel Free Tier Limits:**
- Unlimited custom domains ✅
- Automatic HTTPS ✅
- No wildcard domains ❌ (Enterprise only)

**Implementation Impact:**
- No code changes needed for Vercel setup
- Add manual step to tenant onboarding checklist
- Document DNS record process in admin docs

**Action:** Add manual subdomain setup to deployment docs

---

## Q3: Function Signature Change Assessment

**Question:** Do email/PDF functions need signature changes to support tenant branding?

**Answer:** ✅ NO - Already support branding, just need to PASS it

### Email Templates Analysis

**Current State:** ALL email template interfaces already have `tenantBranding` field

**Evidence from `src/lib/email-templates.tsx:20-78`:**

```typescript
export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string | null;
  tenantName?: string;
}

export interface ReservationApprovedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesConfirmed: number;
  portalUrl: string;
  tenantBranding?: TenantBranding; // ✅ ALREADY EXISTS
}

export interface InvoiceDeliveryData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  invoiceNumber: string;
  totalAmount: number;
  routineCount: number;
  invoiceUrl: string;
  dueDate?: string;
  tenantBranding?: TenantBranding; // ✅ ALREADY EXISTS
}

// All 12 templates have this field defined
```

**Problem:** Callers don't fetch/pass the branding data

**Email Send Locations (5 files):**
1. `src/server/routers/reservation.ts:766` - `renderReservationApproved`
2. `src/server/routers/reservation.ts:890` - `renderReservationRejected`
3. `src/server/routers/entry.ts:482` - `renderRoutineSummarySubmitted`
4. `src/server/routers/invoice.ts:777` - `renderInvoiceDelivery`
5. `src/server/routers/email.ts:150,221,415,418` - Test/preview emails

**Example Current Call (reservation.ts:760-766):**
```typescript
const emailData = {
  studioName: reservation.studios?.name || 'Your Studio',
  competitionName: reservation.competitions?.name || 'Competition',
  competitionYear: reservation.competitions?.year || new Date().getFullYear(),
  spacesConfirmed: reservation.spaces_confirmed || 0,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations`,
  // ❌ Missing: tenantBranding
};

const html = await renderReservationApproved(emailData);
```

**Required Fix (MINIMAL CHANGE):**
```typescript
// Add tenant query to existing data fetch
const tenant = await prisma.tenants.findUnique({
  where: { id: reservation.competitions?.tenant_id },
  select: { name: true, branding: true },
});

const emailData = {
  studioName: reservation.studios?.name || 'Your Studio',
  competitionName: reservation.competitions?.name || 'Competition',
  competitionYear: reservation.competitions?.year || new Date().getFullYear(),
  spacesConfirmed: reservation.spaces_confirmed || 0,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations`,
  // ✅ Add branding
  tenantBranding: tenant?.branding ? {
    primaryColor: tenant.branding.primaryColor,
    secondaryColor: tenant.branding.secondaryColor,
    logo: tenant.branding.logo,
    tenantName: tenant.name,
  } : undefined,
};
```

**Impact:** 5 files need 2-3 lines added each = 15 minutes total

### PDF Generation Analysis

**Current State:** `generateInvoicePDF` already has `tenant` parameter (optional)

**Evidence from `src/lib/pdf-reports.ts:547-549`:**
```typescript
export function generateInvoicePDF(invoice: {
  // ... other fields
  tenant?: {
    branding?: {
      logo?: string | null;
      // ... other branding fields
    };
  };
  // ...
}) {
  // Function signature already supports tenant branding
}
```

**Problem:** `initPDF()` helper hardcodes "EMPWR Dance Experience"

**Evidence from `src/lib/pdf-reports.ts:25-66`:**
```typescript
function initPDF(title: string, orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary);
  doc.text('✨ EMPWR Dance Experience', 15, 15); // ❌ HARDCODED

  // Footer
  doc.text('EMPWR Dance Experience', 15, pageHeight - 10); // ❌ HARDCODED

  return doc;
}
```

**PDF Callers (5 locations in same file):**
1. Line 97: `generateEntryScoreSheet` → calls `initPDF`
2. Line 237: `generateCategoryResults` → calls `initPDF`
3. Line 340: `generateJudgeScorecard` → calls `initPDF`
4. Line 433: `generateCompetitionSummary` → calls `initPDF`
5. Line 525: `generateInvoicePDF` → calls `initPDF`

**Required Fix:**
```typescript
// Change signature to accept optional tenant name
function initPDF(
  title: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  tenantName: string = 'EMPWR Dance Experience' // Default for backwards compatibility
): jsPDF {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary);
  doc.text(`✨ ${tenantName}`, 15, 15); // ✅ Dynamic

  // Footer
  doc.text(tenantName, 15, pageHeight - 10); // ✅ Dynamic

  return doc;
}
```

**Impact:** 1 function signature change + 5 call sites updated = 20 minutes

### Frontend PDF Calls

**Invoice PDF Generation (2 locations):**
1. `src/components/InvoiceDetail.tsx:495` - `generateInvoicePDF(invoice)`
2. `src/components/InvoicesList.tsx:201` - `generateInvoicePDF(invoiceData)`

**Current Problem:** These components don't pass tenant data

**Fix:** Add tenant to invoice query (already includes competition → tenant relationship)

**Impact:** 2 component updates = 10 minutes

### Total Function Signature Assessment

**Signatures Needing Changes:** 1 (`initPDF` - add optional parameter with default)
**Callers Needing Updates:** 12 total
- 5 email template calls (add tenant branding)
- 5 internal PDF calls (pass tenant name)
- 2 frontend PDF calls (pass tenant from invoice data)

**Estimated Time:** 45 minutes (not 3+ hours as feared)

**Risk Level:** LOW
- Optional parameters with defaults = backwards compatible
- TypeScript will catch missing tenant data
- Email templates already handle missing branding gracefully

**Action:** Proceed with minimal signature changes as documented

---

## Q4: Invalid Subdomain Behavior Verification

**Question:** What happens when invalid subdomain is used?

**Answer:** ⚠️ SECURITY ISSUE - Falls back to EMPWR tenant

**Current Behavior Analysis:**

### Location 1: `src/lib/tenant-context.ts:78-95`

```typescript
// After trying subdomain lookup
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    select: { id, slug, subdomain, name, branding },
  });

  if (tenant) {
    return tenant; // ✅ Found tenant
  }
}

// ❌ SECURITY ISSUE: Fallback to demo tenant
const tenant = await prisma.tenants.findFirst({
  where: { slug: 'demo' },
  // ... returns EMPWR tenant for invalid subdomains
});
```

### Location 2: `src/lib/supabase-middleware.ts:62-68`

```typescript
// TEMPORARY: Default to EMPWR tenant if none detected (for demo)
const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
const finalTenantData = tenantData || {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'EMPWR Dance Experience',
  subdomain: 'demo',
};
```

### Location 3: `src/app/api/trpc/[trpc]/route.ts` (similar fallback)

**Security Implications:**

1. **Data Leakage Risk:** Invalid subdomain `hacker.compsync.net` → shows EMPWR data
2. **Confusion:** Users typing wrong subdomain see EMPWR instead of error
3. **SEO Issues:** Search engines indexing invalid subdomains
4. **Tenant Isolation Bypass:** Could be exploited to access default tenant

**Examples:**
- `typo.compsync.net` → Shows EMPWR portal (should be 404)
- `test.compsync.net` → Shows EMPWR portal (should be 404)
- `competitor.compsync.net` → Shows EMPWR portal (should be 404)

**Action:** MUST fix to throw 404 for invalid subdomains

---

## Q5: Invalid Subdomain Decision

**User Decision:** "we should throw 404"

**Implementation Required:**

### Fix 1: `src/lib/tenant-context.ts`

**Before (lines 78-95):**
```typescript
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    select: { id, slug, subdomain, name, branding },
  });

  if (tenant) {
    return tenant;
  }
}

// ❌ Fallback to demo
const tenant = await prisma.tenants.findFirst({
  where: { slug: 'demo' },
  // ...
});
return tenant as TenantData;
```

**After:**
```typescript
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    select: { id, slug, subdomain, name, branding },
  });

  if (tenant) {
    return tenant;
  }

  // ✅ Invalid subdomain = not found
  return null;
}

// ✅ No subdomain (localhost) = demo tenant for development
if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
  const tenant = await prisma.tenants.findFirst({
    where: { slug: 'demo' },
    // ...
  });
  return tenant as TenantData;
}

// ✅ Production without subdomain (compsync.net) = 404
return null;
```

### Fix 2: `src/lib/supabase-middleware.ts:62-68`

**Before:**
```typescript
// TEMPORARY: Default to EMPWR tenant if none detected (for demo)
const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
const finalTenantData = tenantData || {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'EMPWR Dance Experience',
  subdomain: 'demo',
};
```

**After:**
```typescript
// Check if tenant was found
if (!tenantId || !tenantData) {
  // Return 404 for invalid subdomain
  return new Response('Tenant not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' },
  });
}

const finalTenantId = tenantId;
const finalTenantData = tenantData;
```

### Fix 3: `src/app/api/trpc/[trpc]/route.ts`

**Similar logic needed in tRPC context creation**

**Implementation Impact:**
- 3 files to modify
- Estimated time: 30 minutes
- Risk: LOW (explicit 404 is safer than silent fallback)
- Testing: Easy to verify with invalid subdomain

**Action:** Implement 404 for invalid subdomains in all 3 locations

---

## Q6: /api/tenant Endpoint Verification

**Question:** Do we need to replace existing `/api/tenant` endpoint?

**Answer:** ✅ NO - Existing endpoint is perfect

**Evidence from `src/app/api/tenant/route.ts:1-30`:**

```typescript
import { NextResponse } from 'next/server';
import { getTenantData } from '@/lib/tenant-context';
import { logger } from '@/lib/logger';

/**
 * GET /api/tenant
 *
 * Returns current tenant data for client-side consumption
 */
export async function GET() {
  try {
    const tenantData = await getTenantData(); // ✅ Already uses subdomain logic

    if (!tenantData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 } // ✅ Already returns 404
      );
    }

    return NextResponse.json(tenantData); // ✅ Returns branding data
  } catch (error) {
    logger.error('Error fetching tenant data', { error: error instanceof Error ? error : new Error(String(error)) });
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
```

**Analysis:**
- ✅ Uses `getTenantData()` from tenant-context.ts
- ✅ Returns 404 for missing tenant
- ✅ Returns full branding data
- ✅ Proper error handling

**What It Does:**
1. Extracts subdomain from request hostname
2. Queries database for tenant by subdomain
3. Returns tenant data including branding
4. Used by frontend to get tenant info client-side

**Implementation Spec Task 3 Reference:**
> "Replace hardcoded tenant ID with API call to /api/tenant"

**Clarification:** Settings page needs to CALL this endpoint, not replace it

**Fix for `src/app/dashboard/settings/tenant/page.tsx:20`:**

**Before:**
```typescript
const tenantId = '00000000-0000-0000-0000-000000000001'; // ❌ Hardcoded
```

**After:**
```typescript
const { data: currentUser } = trpc.user.getCurrentUser.useQuery(); // ✅ Uses existing query
const tenantId = currentUser?.tenantId; // ✅ Dynamic from user context
```

**Action:** Update settings page to use `getCurrentUser` query (NOT replace /api/tenant)

---

## Manual Subdomain Setup Process

**For Each New Tenant:**

### Step 1: Vercel Project Settings
1. Go to Vercel dashboard → CompPortal project
2. Navigate to Settings → Domains
3. Click "Add Domain"
4. Enter: `[tenant-subdomain].compsync.net`
5. Click "Add"

### Step 2: DNS Configuration (Cloudflare)
1. Vercel shows DNS records needed:
   ```
   Type: CNAME
   Name: [tenant-subdomain]
   Value: cname.vercel-dns.com
   ```
2. Go to Cloudflare → DNS settings for compsync.net
3. Add CNAME record as shown
4. Set Proxy status: Proxied (orange cloud) ✅
5. Save

### Step 3: Verification
1. Wait 5-60 minutes for DNS propagation
2. Check Vercel dashboard - "Valid Configuration" appears
3. HTTPS certificate auto-provisions (1-5 minutes)
4. Test: `https://[tenant-subdomain].compsync.net`

### Step 4: Database Setup
```sql
-- Insert new tenant record
INSERT INTO tenants (
  id,
  slug,
  subdomain,
  name,
  branding
) VALUES (
  gen_random_uuid(),
  'starbound', -- tenant slug
  'starbound', -- matches Vercel subdomain
  'Starbound Dance Company',
  '{"primaryColor": "#FF6B9D", "secondaryColor": "#4ECDC4"}'::jsonb
);
```

### Step 5: Test Multi-Tenant Isolation
1. Access `https://starbound.compsync.net/login`
2. Create test studio account
3. Verify EMPWR data not visible
4. Check database: `SELECT * FROM studios WHERE tenant_id = '[new-tenant-id]'`

**Time Per Tenant:** ~15 minutes (including DNS propagation wait)

**Frequency:** 1 per year (acceptable manual process)

---

## Restore Point Strategy

**CRITICAL:** Verified restore point before implementation

### Option 1: Git Tag (Recommended)

**Before Implementation:**
```bash
git add -A
git commit -m "chore: Pre-multi-tenant checkpoint - all systems stable"
git tag -a v1.0-pre-multitenant -m "Stable checkpoint before multi-tenant implementation"
git push origin main --tags
```

**If Implementation Fails:**
```bash
git reset --hard v1.0-pre-multitenant
git push origin main --force
```

**Pros:**
- ✅ Fast rollback (1 command)
- ✅ Full code history preserved
- ✅ Can compare before/after
- ✅ No external dependencies

**Cons:**
- ❌ Doesn't rollback database changes
- ❌ Requires force push (notify team)

### Option 2: Vercel Deployment Rollback

**Vercel keeps 100 production deployments automatically**

**If Implementation Fails:**
1. Go to Vercel dashboard → CompPortal
2. Deployments tab
3. Find last known good deployment (before multi-tenant)
4. Click "⋯" → "Promote to Production"
5. Instant rollback

**Pros:**
- ✅ Zero downtime
- ✅ Instant rollback
- ✅ No database touched
- ✅ Built-in feature

**Cons:**
- ❌ Only rolls back frontend
- ❌ Doesn't rollback database schema

### Option 3: Database Backup

**Before Implementation:**
```bash
# Download full database dump
supabase db dump --data-only > backup-pre-multitenant.sql

# Or use Supabase dashboard → Database → Backups → Create backup
```

**If Database Corrupted:**
```bash
supabase db reset
psql -h [db-host] -U postgres -d postgres < backup-pre-multitenant.sql
```

**Pros:**
- ✅ Full data recovery
- ✅ Can test restore before implementation

**Cons:**
- ❌ Slow to restore (5-10 minutes)
- ❌ Requires Supabase CLI
- ❌ May lose recent data

### Recommended Strategy: COMBINED APPROACH

**Before Starting Implementation:**

1. **Git Tag (Code Safety)**
   ```bash
   git tag -a v1.0-pre-multitenant -m "Checkpoint before multi-tenant"
   git push --tags
   ```

2. **Vercel Snapshot (Deployment Safety)**
   - Current production deployment automatically saved
   - Note deployment URL for reference

3. **Database Backup (Data Safety)**
   ```bash
   # Create named backup in Supabase dashboard
   # Name: "Pre-Multi-Tenant 2025-10-26"
   ```

4. **Test in Staging First**
   - Create `staging` branch
   - Implement all changes
   - Test with invalid subdomains
   - Test EMPWR tenant still works
   - Test email/PDF branding
   - Only merge to main after full validation

**Rollback Decision Matrix:**

| Issue | Solution | Time |
|-------|----------|------|
| Code bug | `git reset --hard v1.0-pre-multitenant` | 2 min |
| Build failure | Vercel rollback to previous deployment | 30 sec |
| Data corruption | Supabase restore from backup | 10 min |
| Partial failure | Cherry-pick revert specific commits | 5 min |

**Testing Checklist Before Merge:**
- [ ] `empwr.compsync.net` loads EMPWR data ✅
- [ ] `invalid.compsync.net` returns 404 ✅
- [ ] `localhost:3000` loads demo tenant ✅
- [ ] Emails show correct tenant branding ✅
- [ ] PDFs show correct tenant name ✅
- [ ] Settings page uses dynamic tenant ID ✅
- [ ] Dancer creation uses `ctx.tenantId` ✅
- [ ] Onboarding uses `ctx.tenantId` ✅
- [ ] npm run build succeeds ✅
- [ ] No hardcoded tenant IDs remain ✅

---

## Updated Implementation Plan

**Based on reconnaissance findings, implementation reduced from 11 hours to 3.5 hours**

### Task 1: Fix Hardcoded Tenant IDs (45 minutes)

**Files to Update:**
1. `src/server/routers/dancer.ts:258` - Replace with `ctx.tenantId`
2. `src/server/routers/dancer.ts:505` - CSV import
3. `src/server/routers/dancer.ts:690` - Bulk import
4. `src/app/onboarding/page.tsx:129` - Use tenant from context

**Pattern:**
```typescript
// ❌ Before
tenant_id: '00000000-0000-0000-0000-000000000001',

// ✅ After
tenant_id: ctx.tenantId || (() => {
  throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No tenant context' });
})(),
```

**Verification:**
```bash
grep -rn "00000000-0000-0000-0000-000000000001" src/
# Should return 0 results after fix
```

### Task 2: Settings Page Dynamic Tenant (15 minutes)

**File:** `src/app/dashboard/settings/tenant/page.tsx:20`

**Before:**
```typescript
const tenantId = '00000000-0000-0000-0000-000000000001';
```

**After:**
```typescript
const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
const tenantId = currentUser?.tenantId;

if (!tenantId) {
  return <div>Loading tenant data...</div>;
}
```

**Verification:** Settings page loads tenant data from user context

### Task 3: Invalid Subdomain 404 (30 minutes)

**Files:**
1. `src/lib/tenant-context.ts:78-95` - Remove demo fallback
2. `src/lib/supabase-middleware.ts:62-68` - Return 404 response
3. `src/app/api/trpc/[trpc]/route.ts` - Similar fix

**Testing:**
```bash
curl https://invalid.compsync.net
# Expected: 404 Not Found

curl https://empwr.compsync.net
# Expected: 200 OK (EMPWR portal)

curl http://localhost:3000
# Expected: 200 OK (demo tenant for dev)
```

### Task 4: Email Tenant Branding (45 minutes)

**Files (5 total):**
1. `src/server/routers/reservation.ts:760-766` - Add tenant query
2. `src/server/routers/reservation.ts:885-890` - Add tenant query
3. `src/server/routers/entry.ts:475-482` - Add tenant query
4. `src/server/routers/invoice.ts:770-777` - Add tenant query
5. `src/server/routers/email.ts:145-150,215-221` - Test email branding

**Pattern to Add:**
```typescript
// Fetch tenant branding
const tenant = await prisma.tenants.findUnique({
  where: { id: reservation.competitions?.tenant_id },
  select: { name: true, branding: true },
});

// Add to emailData
const emailData = {
  // ... existing fields
  tenantBranding: tenant?.branding ? {
    primaryColor: tenant.branding.primaryColor,
    secondaryColor: tenant.branding.secondaryColor,
    logo: tenant.branding.logo,
    tenantName: tenant.name,
  } : undefined,
};
```

**Verification:** Send test email, check branding displays tenant name/colors

### Task 5: PDF Tenant Branding (45 minutes)

**Files:**
1. `src/lib/pdf-reports.ts:25` - Add `tenantName` parameter to `initPDF`
2. `src/lib/pdf-reports.ts:97,237,340,433,525` - Pass tenant name to `initPDF` calls
3. `src/components/InvoiceDetail.tsx:495` - Pass tenant from invoice
4. `src/components/InvoicesList.tsx:201` - Pass tenant from invoice

**Before:**
```typescript
function initPDF(title: string, orientation = 'portrait'): jsPDF {
  // ...
  doc.text('✨ EMPWR Dance Experience', 15, 15);
}
```

**After:**
```typescript
function initPDF(
  title: string,
  orientation = 'portrait',
  tenantName = 'EMPWR Dance Experience' // Default for backwards compat
): jsPDF {
  // ...
  doc.text(`✨ ${tenantName}`, 15, 15);
}
```

**Verification:** Generate invoice PDF, check header shows correct tenant

### Task 6: Manual Subdomain Documentation (20 minutes)

**File:** `docs/VERCEL_SUBDOMAIN_SETUP.md` (create new)

**Content:**
- Step-by-step Vercel domain setup
- Cloudflare DNS configuration
- Database tenant insertion
- Testing checklist
- Troubleshooting common issues

### Task 7: Testing & Validation (30 minutes)

**Test Cases:**
1. ✅ EMPWR tenant still works
2. ✅ Invalid subdomain returns 404
3. ✅ Localhost shows demo tenant
4. ✅ Emails show tenant branding
5. ✅ PDFs show tenant name
6. ✅ Settings page loads dynamic tenant
7. ✅ Dancer creation uses ctx.tenantId
8. ✅ No hardcoded tenant IDs remain
9. ✅ Build succeeds
10. ✅ Playwright test production

**Total Time:** 3.5 hours (down from 11 hours estimated in spec)

---

## Critical Warnings

### ⚠️ WARNING 1: Test Staging First

**DO NOT merge directly to production**

1. Create `staging` branch
2. Implement all changes
3. Deploy to Vercel preview
4. Test invalid subdomains
5. Test EMPWR tenant
6. Test all email/PDF branding
7. Only merge after full validation

**Risk if skipped:** Breaking EMPWR tenant again

### ⚠️ WARNING 2: Database Changes Cannot Be Rolled Back

**If tenant data gets corrupted:**
- Git rollback won't fix database
- Vercel rollback won't fix database
- ONLY database backup can restore

**Mitigation:** Create database backup BEFORE starting

### ⚠️ WARNING 3: DNS Propagation Time

**New subdomain takes 5-60 minutes to work**

**Don't panic if:**
- New subdomain shows "DNS_PROBE_FINISHED_NXDOMAIN"
- Vercel shows "Invalid Configuration" initially
- HTTPS certificate not provisioned yet

**Wait 1 hour before troubleshooting**

### ⚠️ WARNING 4: Localhost Behavior Must Stay

**Developer experience requirement:**

`localhost:3000` MUST still load demo tenant (EMPWR) for development

**Don't break:**
- Local development
- E2E tests
- Playwright tests
- Contributor onboarding

**Fix ensures:** Only production subdomains enforce strict tenant lookup

### ⚠️ WARNING 5: Email Template Backwards Compatibility

**Email templates must handle missing branding gracefully**

**Current implementation already does this:**
```typescript
<Header tenantBranding={tenantBranding} />
// Inside Header component:
const primaryColor = tenantBranding?.primaryColor || '#6B46C1'; // Fallback
```

**Don't change this pattern** - keeps emails working even if branding fetch fails

---

## Final Recommendations

### ✅ Proceed with Implementation

**Confidence Level:** HIGH (95%)

**Reasons:**
1. Email/PDF already support branding (just need to pass it)
2. `/api/tenant` endpoint already works (no replacement needed)
3. Invalid subdomain fix is straightforward (30 min task)
4. Only 2 production tenants (manual Vercel setup acceptable)
5. Restore point strategy is comprehensive
6. Implementation time reduced by 68% due to findings

### 📋 Pre-Implementation Checklist

**Before writing any code:**
- [ ] Create git tag `v1.0-pre-multitenant`
- [ ] Create Supabase database backup
- [ ] Note current Vercel deployment URL
- [ ] Create `staging` branch
- [ ] Read through all 7 implementation tasks
- [ ] Confirm user approval of this analysis

### 🎯 Implementation Order

**Follow this sequence exactly:**

1. **Restore Points** (5 min) - Git tag + DB backup
2. **Staging Branch** (1 min) - Create branch
3. **Task 1** (45 min) - Fix hardcoded tenant IDs
4. **Task 2** (15 min) - Settings page dynamic tenant
5. **Task 3** (30 min) - Invalid subdomain 404
6. **Task 4** (45 min) - Email tenant branding
7. **Task 5** (45 min) - PDF tenant branding
8. **Task 6** (20 min) - Manual subdomain docs
9. **Task 7** (30 min) - Testing & validation
10. **Merge** (5 min) - Only after all tests pass

**Total:** 3.5 hours + 1 hour buffer = 4.5 hours

### 🚨 Stop Conditions

**Immediately stop and ask user if:**
- Build fails 3+ times
- EMPWR tenant breaks at any point
- Database constraints violated
- Email/PDF rendering errors
- TypeScript errors can't be resolved
- Any security concern arises

### ✅ Success Criteria

**Implementation is complete when:**
1. ✅ All 10 test cases pass
2. ✅ npm run build succeeds
3. ✅ No hardcoded tenant IDs in codebase
4. ✅ Playwright test on production passes
5. ✅ EMPWR tenant works identically to before
6. ✅ Invalid subdomain returns 404
7. ✅ User approves staging deployment

---

## Questions for User

**Before proceeding with implementation:**

1. **Approve restore point strategy?** (Git tag + Vercel snapshot + DB backup)
2. **Approve staging-first approach?** (No direct main branch commits)
3. **Approve 4.5 hour timeline?** (3.5 hrs implementation + 1 hr buffer)
4. **Any concerns about findings?** (Email/PDF signatures, 404 behavior, etc.)
5. **Ready to proceed?** (Or need additional analysis?)

---

**Report Status:** ✅ ANALYSIS COMPLETE
**Next Step:** Await user approval to begin implementation
**Restore Point:** READY (git tag + backup strategy documented)
**Confidence:** HIGH (all reconnaissance complete, risks identified)
