# Multi-Tenant Implementation Spec - Addendum

**Date:** October 26, 2025
**Purpose:** Reconnaissance findings that update the original implementation spec
**Status:** ✅ VERIFIED - Ready for implementation

---

## Critical Updates Based on Reconnaissance

This document supplements `MULTI_TENANT_IMPLEMENTATION_SPEC.md` with verified answers to critical questions and updated guidance.

---

## Q1: getCurrentUser Query - VERIFIED EXISTS ✅

**Original Spec Question:** Does `trpc.user.getCurrentUser` query exist for Task 3 (Settings page fix)?

**Answer:** YES - Confirmed at `src/server/routers/user.ts:36`

```typescript
getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
  // Implementation exists and working
});
```

**Impact on Spec:**
- Task 3 implementation is correct as written
- No need to create new query
- Settings page can call this directly

**No changes needed to spec Task 3**

---

## Q2: Vercel Subdomain Setup - MANUAL PROCESS ✅

**Original Spec Assumption:** May need Vercel Enterprise for wildcard domains

**Reality:** Manual subdomain setup is acceptable (no Enterprise needed)

**Why Manual Works:**
- Only 2 production tenants (EMPWR + 1 new client this year)
- Manual setup takes ~5 minutes per tenant
- New tenant frequency: ~1 per year
- Cost savings: $0 vs $2500/month Enterprise

**Process:**
1. Vercel project settings → Domains → Add Domain
2. Enter `[subdomain].compsync.net`
3. Add CNAME record to Cloudflare: `[subdomain] → cname.vercel-dns.com`
4. Wait 5-60 minutes for DNS propagation
5. HTTPS auto-provisions

**Impact on Spec:**
- No code changes needed
- Add manual subdomain setup to deployment docs
- Document process in admin onboarding checklist

**Action:** Add to Task 8 documentation section

---

## Q3: Function Signature Changes - MINIMAL NEEDED ✅

**Original Spec Concern:** Changing email/PDF signatures might break many callers

**Reality:** Signatures ALREADY support branding, just need to PASS data

### Email Templates - NO SIGNATURE CHANGES NEEDED

**Discovery:** All email template interfaces already have `tenantBranding?: TenantBranding` field

**Files checked:**
- `src/lib/email-templates.tsx:20-78` - All 12 templates have branding field
- `src/emails/*.tsx` - All React email components support branding

**Problem:** Callers don't fetch/pass the branding data

**Solution:** Add 2-3 lines to each caller to fetch tenant and pass branding

**Callers to update (5 files):**
1. `src/server/routers/reservation.ts:766` - `renderReservationApproved`
2. `src/server/routers/reservation.ts:890` - `renderReservationRejected`
3. `src/server/routers/entry.ts:482` - `renderRoutineSummarySubmitted`
4. `src/server/routers/invoice.ts:777` - `renderInvoiceDelivery`
5. `src/server/routers/email.ts` - Test email endpoints

**Time per file:** 5 minutes × 5 = 25 minutes total

### PDF Generation - ONE SIGNATURE CHANGE NEEDED

**Discovery:** `generateInvoicePDF` already has optional `tenant` parameter

**Problem:** Internal helper `initPDF()` hardcodes "EMPWR Dance Experience"

**Solution:** Add optional `tenantName` parameter with default value

**Before:**
```typescript
function initPDF(title: string, orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF
```

**After:**
```typescript
function initPDF(
  title: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  tenantName: string = 'EMPWR Dance Experience'
): jsPDF
```

**Callers to update (7 locations, all in `src/lib/pdf-reports.ts`):**
1. Line 97: `generateEntryScoreSheet`
2. Line 237: `generateCategoryResults`
3. Line 340: `generateJudgeScorecard`
4. Line 433: `generateCompetitionSummary`
5. Line 525: `generateInvoicePDF`
6. Frontend: `src/components/InvoiceDetail.tsx:495`
7. Frontend: `src/components/InvoicesList.tsx:201`

**Time:** 20 minutes for signature + 5 min/caller × 7 = 55 minutes total

**Impact on Spec:**
- Task 5 (Email Branding): Reduce from "rewrite signatures" to "pass branding data"
- Task 6 (PDF Branding): Change from "major refactor" to "add optional parameter"
- **Total time reduction: ~2 hours** (from 3 hrs to 1.25 hrs)

---

## Q4: Invalid Subdomain Behavior - SECURITY ISSUE FOUND ⚠️

**Original Spec:** Didn't address invalid subdomain handling

**Discovery:** Invalid subdomains currently fallback to EMPWR tenant (SECURITY RISK)

**Evidence:**

### Location 1: `src/lib/tenant-context.ts:78-95`
```typescript
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    // ...
  });
  if (tenant) return tenant;
}

// ❌ SECURITY ISSUE: Falls back to demo tenant
const tenant = await prisma.tenants.findFirst({
  where: { slug: 'demo' },
  // ...
});
return tenant as TenantData;
```

### Location 2: `src/lib/supabase-middleware.ts:62-68`
```typescript
// TEMPORARY: Default to EMPWR tenant if none detected (for demo)
const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
```

**Security Implications:**
- `hacker.compsync.net` → Shows EMPWR portal (data leakage risk)
- `typo.compsync.net` → Shows EMPWR portal (confusing)
- Search engines could index invalid subdomains
- Potential tenant isolation bypass

**Impact on Spec:**
- Add new Task 3.5: "Invalid Subdomain 404 Fix" (30 minutes)
- Update 3 files to return 404 for invalid subdomains
- Keep localhost fallback for development

---

## Q5: Invalid Subdomain Decision - THROW 404 ✅

**User Decision:** "we should throw 404"

**Implementation Required:**

### Fix 1: `src/lib/tenant-context.ts`

**Replace fallback logic with:**
```typescript
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    select: { id, slug, subdomain, name, branding },
  });

  if (tenant) return tenant;
  // ✅ Invalid subdomain = null (triggers 404 downstream)
  return null;
}

// ✅ Localhost only = demo tenant for development
if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
  const tenant = await prisma.tenants.findFirst({
    where: { slug: 'demo' },
  });
  return tenant as TenantData;
}

// ✅ Production without subdomain = null
return null;
```

### Fix 2: `src/lib/supabase-middleware.ts`

**Replace fallback with 404 response:**
```typescript
// Check if tenant was found
if (!tenantId || !tenantData) {
  return new Response('Tenant not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' },
  });
}

const finalTenantId = tenantId;
const finalTenantData = tenantData;
```

### Fix 3: `src/app/api/trpc/[trpc]/route.ts`

**Similar 404 logic in tRPC context creation**

**Impact on Spec:**
- Add Task 3.5: "Invalid Subdomain 404 Fix" (30 minutes)
- 3 files to modify
- Add test case: `curl https://invalid.compsync.net` → 404

---

## Q6: /api/tenant Endpoint - NO REPLACEMENT NEEDED ✅

**Original Spec Task 3:** "Replace hardcoded tenant ID with API call to /api/tenant"

**Discovery:** Endpoint ALREADY EXISTS and is perfectly implemented

**Evidence from `src/app/api/tenant/route.ts`:**
```typescript
export async function GET() {
  try {
    const tenantData = await getTenantData(); // ✅ Uses subdomain logic

    if (!tenantData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tenantData); // ✅ Returns branding
  } catch (error) {
    logger.error('Error fetching tenant data', { error });
    return NextResponse.json({ error: 'Failed to fetch tenant data' }, { status: 500 });
  }
}
```

**What it does:**
- Extracts subdomain from request
- Queries database for tenant
- Returns tenant data with branding
- Returns 404 if not found

**Clarification on Task 3:**
- ❌ NOT "replace /api/tenant endpoint"
- ✅ "Use existing endpoint in settings page"

**Impact on Spec:**
- Task 3 is about CALLING the endpoint, not replacing it
- Settings page should use `trpc.user.getCurrentUser` instead of `/api/tenant`
- Update Task 3 wording for clarity

**Updated Task 3:**

**Before:**
> Replace hardcoded tenant ID with API call to /api/tenant

**After:**
> Replace hardcoded tenant ID with `trpc.user.getCurrentUser` query

**File:** `src/app/dashboard/settings/tenant/page.tsx:20`

**Before:**
```typescript
const tenantId = '00000000-0000-0000-0000-000000000001'; // ❌ Hardcoded
```

**After:**
```typescript
const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
const tenantId = currentUser?.tenantId;

if (!tenantId) {
  return <div>Loading tenant data...</div>;
}
```

---

## Deployment Strategy - MANUAL SUBDOMAIN CONFIRMED ✅

**User Context:**
- No Vercel Enterprise
- Only 2 production tenants total
- 1 new tenant per year
- Manual onboarding acceptable

**Subdomain Setup Per Tenant (15 minutes):**

1. **Vercel:** Add domain `[subdomain].compsync.net`
2. **Cloudflare:** Add CNAME record
3. **Wait:** 5-60 minutes DNS propagation
4. **Database:** Insert tenant record
5. **Test:** Access subdomain, verify isolation

**Documentation Needed:**
- Step-by-step Vercel domain setup guide
- Cloudflare DNS configuration screenshots
- Database tenant insertion SQL template
- Testing checklist for new tenant

**Impact on Spec:**
- Add Task 8 subtask: "Create manual subdomain setup guide"
- Document exact DNS records needed
- Include troubleshooting section

---

## Restore Point Strategy - COMBINED APPROACH ✅

**Before ANY code changes:**

### 1. Git Tag (Code Restore)
```bash
git tag -a v1.0-pre-multitenant -m "Stable checkpoint before multi-tenant implementation"
git push origin main --tags
```

**Rollback if needed:**
```bash
git reset --hard v1.0-pre-multitenant
git push origin main --force
```

### 2. Vercel Snapshot (Deployment Restore)
- Current production deployment automatically saved
- Rollback via Vercel dashboard → Deployments → "Promote to Production"
- Zero downtime rollback

### 3. Supabase Backup (Data Restore)
```bash
# Create named backup in Supabase dashboard
# Name: "Pre-Multi-Tenant 2025-10-26"
```

**Rollback if needed:**
```bash
supabase db reset
psql -h [host] -U postgres < backup.sql
```

### 4. Staging Branch Testing
```bash
git checkout -b staging
# Implement all changes
# Test thoroughly
# Only merge to main after validation
```

**Testing Checklist:**
- [ ] `empwr.compsync.net` loads EMPWR data
- [ ] `invalid.compsync.net` returns 404
- [ ] `localhost:3000` loads demo tenant
- [ ] Emails show correct tenant branding
- [ ] PDFs show correct tenant name
- [ ] Settings page dynamic tenant
- [ ] No hardcoded tenant IDs
- [ ] `npm run build` succeeds
- [ ] Playwright production test passes

**Impact on Spec:**
- Add "Pre-Implementation Setup" section before Task 1
- Document rollback procedures
- Include staging branch workflow

---

## Updated Time Estimates

**Original Spec Estimate:** 8-12 hours

**Updated Estimate Based on Reconnaissance:** 3.5-4.5 hours

**Time Savings:**
- Email signatures: Already support branding (-1.5 hrs)
- PDF signatures: Only 1 function needs change (-1 hr)
- /api/tenant: Already exists, no replacement (-0.5 hrs)
- getCurrentUser: Already exists, no creation (-0.5 hrs)

**New Task Added:**
- Invalid subdomain 404 fix (+0.5 hrs)

**Breakdown:**

| Task | Original | Updated | Notes |
|------|----------|---------|-------|
| Task 1: Hardcoded tenant IDs | 1.5 hrs | 0.75 hrs | Only 6 locations |
| Task 2: Onboarding tenant fix | 0.5 hrs | 0.25 hrs | Simple ctx swap |
| Task 3: Settings page fix | 0.5 hrs | 0.25 hrs | Use existing query |
| **Task 3.5: Invalid subdomain 404** | - | **0.5 hrs** | **NEW** |
| Task 4: Dancer router validation | 0.5 hrs | 0.25 hrs | Optional enhancement |
| Task 5: Email branding | 3 hrs | 0.75 hrs | Just pass data |
| Task 6: PDF branding | 2 hrs | 0.75 hrs | Add optional param |
| Task 7: Testing | 1 hr | 0.5 hrs | Automated checks |
| Task 8: Documentation | 1 hr | 0.5 hrs | Manual subdomain guide |

**Total:** 3.5 hrs implementation + 1 hr buffer = **4.5 hours**

**Confidence Level:** HIGH (95%) - All unknowns resolved

---

## Implementation Order (Updated)

**Follow this exact sequence:**

### Pre-Implementation (30 minutes)
1. Create git tag `v1.0-pre-multitenant`
2. Create Supabase database backup
3. Note current Vercel deployment URL
4. Create `staging` branch
5. Review all updated tasks

### Core Implementation (2.5 hours)
1. **Task 1** (45 min) - Fix 6 hardcoded tenant IDs
2. **Task 2** (15 min) - Onboarding dynamic tenant
3. **Task 3** (15 min) - Settings page getCurrentUser
4. **Task 3.5** (30 min) - Invalid subdomain 404 fix ⭐ NEW
5. **Task 5** (45 min) - Email branding (pass data)
6. **Task 6** (45 min) - PDF branding (add param)

### Testing & Docs (1.5 hours)
7. **Task 7** (30 min) - Run full test suite
8. **Task 8** (30 min) - Manual subdomain setup guide
9. **Playwright** (30 min) - Production validation

### Merge (5 minutes)
10. Only after ALL tests pass on staging
11. Merge to main
12. Monitor production deployment

**Total:** 4.5 hours (with buffer)

---

## Critical Warnings (Updated)

### ⚠️ WARNING 1: Localhost Must Work

**Development requirement:** `localhost:3000` MUST load demo tenant

**Fix ensures:**
```typescript
// In tenant-context.ts
if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
  // Return demo tenant for dev
  const tenant = await prisma.tenants.findFirst({ where: { slug: 'demo' } });
  return tenant as TenantData;
}
```

**Don't break:**
- Local development
- E2E tests
- Playwright tests
- Contributor onboarding

### ⚠️ WARNING 2: Backwards Compatibility

**Email/PDF must handle missing branding:**

```typescript
// Email templates already do this:
const primaryColor = tenantBranding?.primaryColor || '#6B46C1';

// PDF should match:
const tenantName = invoice.tenant?.name || 'EMPWR Dance Experience';
```

**Keep fallbacks** - ensures emails/PDFs work even if branding fetch fails

### ⚠️ WARNING 3: Test Invalid Subdomains

**Must verify 404 behavior:**
```bash
curl https://invalid.compsync.net
# Expected: 404 Not Found

curl https://empwr.compsync.net
# Expected: 200 OK

curl http://localhost:3000
# Expected: 200 OK (demo tenant)
```

**Failure = security vulnerability**

---

## Spec Integration Instructions

**This addendum should be read BEFORE implementing tasks in the main spec.**

**Key Changes to Main Spec:**

1. **Task 3:** Change from "API call" to "use getCurrentUser query"
2. **Add Task 3.5:** Invalid subdomain 404 fix (new task)
3. **Task 5:** Change from "rewrite signatures" to "pass branding data"
4. **Task 6:** Change from "major refactor" to "add optional parameter"
5. **Task 8:** Add manual subdomain setup guide
6. **Pre-Implementation:** Add restore point setup section
7. **Time Estimates:** Update all tasks with reduced times

**Critical Files Referenced:**
- `src/server/routers/user.ts:36` - getCurrentUser exists ✅
- `src/app/api/tenant/route.ts` - Endpoint exists ✅
- `src/lib/email-templates.tsx:20-78` - Branding interfaces exist ✅
- `src/lib/pdf-reports.ts:25` - initPDF needs update ⚠️
- `src/lib/tenant-context.ts:78-95` - Fallback needs removal ⚠️
- `src/lib/supabase-middleware.ts:62-68` - Fallback needs removal ⚠️

---

## Final Approval Checklist

**Before starting implementation, confirm:**
- [ ] Read full pre-implementation analysis report
- [ ] Understand all 6 Q&A sections
- [ ] Approve restore point strategy
- [ ] Approve staging-first approach
- [ ] Approve 4.5 hour timeline
- [ ] Approve updated task breakdown
- [ ] All questions answered satisfactorily
- [ ] Ready to proceed with confidence

**Confidence Level:** 95% (all reconnaissance complete, unknowns resolved)

**Risk Level:** LOW (restore points ready, staging branch required)

**Next Step:** User approval → Create restore points → Begin Task 1

---

**Addendum Status:** ✅ COMPLETE
**Date:** October 26, 2025
**Ready to Implement:** YES (pending user approval)
