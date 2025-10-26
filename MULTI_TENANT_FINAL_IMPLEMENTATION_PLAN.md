# Multi-Tenant Implementation - FINAL PLAN (Ready for Execution)

**Date:** October 26, 2025
**Status:** ✅ READY TO EXECUTE
**Session:** Next session (Session 20)
**Estimated Time:** 6 hours (5.5 hrs + 30 min buffer)

---

## 🎯 THIS IS THE PLAN WE'RE RUNNING

**This document supersedes:**
- `MULTI_TENANT_IMPLEMENTATION_SPEC.md` (original 2,260 line spec)
- `MULTI_TENANT_SPEC_ADDENDUM.md` (Q&A answers)
- `MULTI_TENANT_PRE_IMPLEMENTATION_ANALYSIS.md` (reconnaissance)
- `MULTI_TENANT_DRY_RUN_GOTCHAS.md` (issues found)

**This is the single source of truth for implementation.**

---

## Executive Summary

**Objective:** Enable per-client subdomain multi-tenancy (e.g., `empwr.compsync.net`, `starbound.compsync.net`)

**Critical Changes:**
1. Fix 6 hardcoded tenant IDs blocking multi-tenant writes
2. Fix onboarding to use server action (not client Supabase)
3. Fix getCurrentUser to return tenantId
4. Fix invalid subdomain fallback (2 layers, not 1)
5. Add tenant branding to emails (fetch + pass data)
6. Add tenant branding to PDFs (update invoice queries)

**Deployment Strategy:** Manual Vercel subdomain setup (2 tenants, no Enterprise)

**Timeline:** 6 hours (includes gotcha fixes discovered in dry-run)

---

## Pre-Implementation Setup (30 minutes)

**MANDATORY - Do before ANY code changes:**

### 1. Create Restore Points

```bash
cd D:\ClaudeCode\CompPortal

# Git tag
git add -A
git commit -m "chore: Pre-multi-tenant checkpoint - all systems stable

- Phase 1 rebuild 85% complete
- Entry creation working
- Studio Director UX validated
- Database isolation verified
- Ready for multi-tenant implementation

This is the restore point before multi-tenant changes."

git tag -a v1.0-pre-multitenant -m "Stable checkpoint before multi-tenant implementation"
git push origin main --tags
```

### 2. Supabase Database Backup

Go to Supabase dashboard → Database → Backups → "Create Backup"
- **Name:** `Pre-Multi-Tenant-2025-10-26`
- **Note:** Checkpoint before subdomain multi-tenancy

### 3. Note Current Vercel Deployment

Visit Vercel dashboard → CompPortal → Deployments
- Note the current production URL (e.g., `compportal-xyz123.vercel.app`)
- This is the rollback deployment if needed

### 4. Create Staging Branch

```bash
git checkout -b staging/multi-tenant
```

**CRITICAL:** All work happens on this branch. Only merge to main after full validation.

---

## Task 1: Fix Hardcoded Tenant IDs (45 minutes)

**Files to modify:** 3 files, 3 locations

### Location 1: `src/server/routers/dancer.ts:258`

**Before:**
```typescript
const dancer = await prisma.dancers.create({
  data: {
    ...data,
    tenant_id: '00000000-0000-0000-0000-000000000001', // EMPWR tenant
    date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
  },
  // ...
});
```

**After:**
```typescript
// Validate tenant context exists
if (!ctx.tenantId) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'No tenant context - access via subdomain required',
  });
}

const dancer = await prisma.dancers.create({
  data: {
    ...data,
    tenant_id: ctx.tenantId, // ✅ Dynamic from subdomain
    date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
  },
  // ...
});
```

### Location 2: `src/server/routers/dancer.ts:505` (CSV import)

**Before:**
```typescript
return prisma.dancers.create({
  data: {
    ...data,
    tenant_id: '00000000-0000-0000-0000-000000000001', // EMPWR tenant
    date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
  },
});
```

**After:**
```typescript
// Add validation at function start (around line 475)
if (!ctx.tenantId) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'No tenant context - access via subdomain required',
  });
}

// Then at line 505:
return prisma.dancers.create({
  data: {
    ...data,
    tenant_id: ctx.tenantId, // ✅ Dynamic from subdomain
    date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
  },
});
```

### Location 3: `src/server/routers/dancer.ts:690` (Bulk import)

**Before:**
```typescript
return prisma.dancers.create({
  data: {
    studio_id,
    tenant_id: '00000000-0000-0000-0000-000000000001', // EMPWR tenant
    ...data,
    date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
    gender: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1).toLowerCase() : undefined,
  },
});
```

**After:**
```typescript
// Add validation at function start (around line 630)
if (!ctx.tenantId) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'No tenant context - access via subdomain required',
  });
}

// Then at line 690:
return prisma.dancers.create({
  data: {
    studio_id,
    tenant_id: ctx.tenantId, // ✅ Dynamic from subdomain
    ...data,
    date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
    gender: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1).toLowerCase() : undefined,
  },
});
```

### Verification

```bash
# Should return 0 results
grep -rn "00000000-0000-0000-0000-000000000001" src/server/routers/dancer.ts
```

---

## Task 2: Fix Onboarding with Server Action (45 minutes)

**GOTCHA:** Onboarding is a client component, can't use `ctx.tenantId` directly

**Solution:** Create server action

### Step 1: Create Server Action File

**New file:** `src/app/actions/onboarding.ts`

```typescript
'use server';

import { getTenantId } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Server action for studio onboarding
 * Uses tenant context from subdomain
 */
export async function createStudioOnboarding(formData: {
  owner_id: string;
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  consent_photo_video?: boolean;
  consent_legal_info?: boolean;
}) {
  // Get tenant from subdomain context
  const tenantId = await getTenantId();

  if (!tenantId) {
    logger.error('Onboarding attempted without tenant context');
    throw new Error('No tenant context - please access via subdomain (e.g., empwr.compsync.net)');
  }

  const now = new Date();

  try {
    const studio = await prisma.studios.create({
      data: {
        tenant_id: tenantId, // ✅ Dynamic from subdomain
        owner_id: formData.owner_id,
        name: formData.name,
        address1: formData.address1 || null,
        address2: formData.address2 || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postal_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
        status: 'approved',
        country: 'Canada',
        consent_photo_video: formData.consent_photo_video ? now : null,
        consent_legal_info: formData.consent_legal_info ? now : null,
      },
    });

    logger.info('Studio created via onboarding', {
      studioId: studio.id,
      tenantId,
      studioName: studio.name,
    });

    return { success: true, studioId: studio.id };
  } catch (error) {
    logger.error('Failed to create studio in onboarding', {
      error: error instanceof Error ? error : new Error(String(error)),
      tenantId,
    });
    throw error;
  }
}

/**
 * Update existing studio during onboarding
 */
export async function updateStudioOnboarding(
  ownerId: string,
  formData: {
    name: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    phone?: string;
    email?: string;
    consent_photo_video?: boolean;
    consent_legal_info?: boolean;
  }
) {
  const tenantId = await getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context - please access via subdomain');
  }

  const now = new Date();

  try {
    const studio = await prisma.studios.updateMany({
      where: { owner_id: ownerId },
      data: {
        name: formData.name,
        address1: formData.address1 || null,
        address2: formData.address2 || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postal_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
        consent_photo_video: formData.consent_photo_video ? now : null,
        consent_legal_info: formData.consent_legal_info ? now : null,
      },
    });

    logger.info('Studio updated via onboarding', { ownerId, tenantId });

    return { success: true, count: studio.count };
  } catch (error) {
    logger.error('Failed to update studio in onboarding', {
      error: error instanceof Error ? error : new Error(String(error)),
      ownerId,
      tenantId,
    });
    throw error;
  }
}
```

### Step 2: Update Onboarding Page

**File:** `src/app/onboarding/page.tsx`

**At top of file, add import:**
```typescript
import { createStudioOnboarding, updateStudioOnboarding } from '../actions/onboarding';
```

**Find the handleSubmit function (around line 90), replace studio creation logic:**

**Before (lines 105-144):**
```typescript
if (existingStudio) {
  // Update existing studio
  const { error } = await supabase
    .from('studios')
    .update({
      name: formData.studioName,
      address1: formData.address1,
      city: formData.city,
      province: formData.province,
      postal_code: formData.postalCode,
      phone: formData.phone,
      email: formData.email || user.email,
      consent_photo_video: formData.consentPhotoVideo ? now : null,
      consent_legal_info: formData.consentLegalInfo ? now : null,
    })
    .eq('owner_id', user.id);
  studioError = error;
} else {
  // Create new studio
  const { error } = await supabase
    .from('studios')
    .insert({
      tenant_id: '00000000-0000-0000-0000-000000000001', // EMPWR tenant
      owner_id: user.id,
      name: formData.studioName,
      address1: formData.address1,
      city: formData.city,
      province: formData.province,
      postal_code: formData.postalCode,
      phone: formData.phone,
      email: formData.email || user.email,
      status: 'approved',
      country: 'Canada',
      consent_photo_video: formData.consentPhotoVideo ? now : null,
      consent_legal_info: formData.consentLegalInfo ? now : null,
    });
  studioError = error;
}

if (studioError) {
  throw new Error(`Failed to save studio: ${studioError.message}`);
}
```

**After:**
```typescript
if (existingStudio) {
  // Update existing studio
  await updateStudioOnboarding(user.id, {
    name: formData.studioName,
    address1: formData.address1,
    address2: '',
    city: formData.city,
    province: formData.province,
    postal_code: formData.postalCode,
    phone: formData.phone,
    email: formData.email || user.email,
    consent_photo_video: formData.consentPhotoVideo,
    consent_legal_info: formData.consentLegalInfo,
  });
} else {
  // Create new studio
  await createStudioOnboarding({
    owner_id: user.id,
    name: formData.studioName,
    address1: formData.address1,
    address2: '',
    city: formData.city,
    province: formData.province,
    postal_code: formData.postalCode,
    phone: formData.phone,
    email: formData.email || user.email,
    consent_photo_video: formData.consentPhotoVideo,
    consent_legal_info: formData.consentLegalInfo,
  });
}
```

### Verification

```bash
# Should NOT find hardcoded tenant in onboarding
grep -n "00000000-0000-0000-0000-000000000001" src/app/onboarding/page.tsx
# Should return 0 results

# Test onboarding on localhost (should use demo tenant)
# Test onboarding on empwr.compsync.net (should use EMPWR tenant)
```

---

## Task 3: Fix Settings Page getCurrentUser (25 minutes)

**GOTCHA:** getCurrentUser doesn't return tenantId field

### Step 1: Update getCurrentUser Query

**File:** `src/server/routers/user.ts:69-79`

**Before:**
```typescript
return {
  id: userProfile?.id,
  role: userProfile?.role,
  first_name: userProfile?.first_name,
  last_name: userProfile?.last_name,
  phone: userProfile?.phone,
  email: userProfile?.users?.email,
  notification_preferences: userProfile?.notification_preferences,
  notificationsEnabled,
  studio,
};
```

**After:**
```typescript
return {
  id: userProfile?.id,
  role: userProfile?.role,
  first_name: userProfile?.first_name,
  last_name: userProfile?.last_name,
  phone: userProfile?.phone,
  email: userProfile?.users?.email,
  notification_preferences: userProfile?.notification_preferences,
  notificationsEnabled,
  studio,
  // ✅ Add tenant context from tRPC
  tenantId: ctx.tenantId,
  tenantData: ctx.tenantData,
};
```

### Step 2: Update Settings Page

**File:** `src/app/dashboard/settings/tenant/page.tsx:19-27`

**Before:**
```typescript
// Hardcoded EMPWR tenant ID (no multi-tenant support)
const tenantId = '00000000-0000-0000-0000-000000000001';
const userLoading = false;

// Fetch current tenant settings
const { data: settingsData, isLoading: settingsLoading, refetch } = trpc.tenantSettings.getTenantSettings.useQuery(
  { tenantId: tenantId! },
  { enabled: !!tenantId }
);
```

**After:**
```typescript
// Get tenant from current user context
const { data: currentUser, isLoading: userLoading } = trpc.user.getCurrentUser.useQuery();
const tenantId = currentUser?.tenantId;

// Fetch current tenant settings
const { data: settingsData, isLoading: settingsLoading, refetch } = trpc.tenantSettings.getTenantSettings.useQuery(
  { tenantId: tenantId! },
  { enabled: !!tenantId }
);
```

**Update loading check (around line 50):**

**Before:**
```typescript
const isLoading = userLoading || settingsLoading;

if (isLoading) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    </main>
  );
}
```

**After:**
```typescript
const isLoading = userLoading || settingsLoading;

if (isLoading) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    </main>
  );
}

// ✅ Add tenant validation
if (!tenantId) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200">
          No tenant context available. Please access via subdomain (e.g., empwr.compsync.net).
        </div>
      </div>
    </main>
  );
}
```

### Verification

Access settings page and verify it loads tenant-specific data from subdomain.

---

## Task 3.5: Fix Invalid Subdomain 404 (45 minutes)

**GOTCHA:** TWO fallback layers, not one!

### Step 1: Fix Supabase Middleware

**File:** `src/lib/supabase-middleware.ts:28-93`

**Replace entire section from line 28 to line 93:**

```typescript
// Query tenant by subdomain
let tenantId: string | null = null;
let tenantData: any = null;

if (subdomain) {
  // Production subdomain provided - lookup required
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, subdomain, name, branding')
    .eq('subdomain', subdomain)
    .single();

  if (!error && data) {
    tenantId = data.id;
    tenantData = data;
  } else {
    // ✅ Invalid subdomain - return 404 immediately
    return new Response(
      JSON.stringify({
        error: 'Tenant not found',
        message: `No tenant found for subdomain: ${subdomain}`,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} else {
  // No subdomain detected
  if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
    // ✅ Localhost - load demo tenant for development
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, subdomain, name, branding')
      .eq('slug', 'demo')
      .single();

    if (!error && data) {
      tenantId = data.id;
      tenantData = data;
    } else {
      // Demo tenant not found - this is a setup issue
      return new Response(
        JSON.stringify({
          error: 'Demo tenant not configured',
          message: 'Contact system administrator',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    // ✅ Production without subdomain (e.g., compsync.net) - return 404
    return new Response(
      JSON.stringify({
        error: 'Subdomain required',
        message: 'Please access via subdomain (e.g., empwr.compsync.net)',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Create modified request headers with tenant context
const requestHeaders = new Headers(request.headers);

// ✅ Tenant is guaranteed to be set here (or we returned 404)
requestHeaders.set('x-tenant-id', tenantId!);
requestHeaders.set('x-tenant-data', JSON.stringify(tenantData!));

// Refresh session if expired
const {
  data: { user },
} = await supabase.auth.getUser();

// Protect dashboard routes
if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

// Return response with modified request headers
const supabaseResponse = NextResponse.next({
  request: {
    headers: requestHeaders,
  },
});

return supabaseResponse;
```

### Step 2: Fix Tenant Context Helper

**File:** `src/lib/tenant-context.ts:54-95`

**Replace fallback logic (lines 54-95):**

**Before:**
```typescript
// Query by subdomain if present
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    select: {
      id: true,
      slug: true,
      subdomain: true,
      name: true,
      branding: true,
    },
  });

  if (tenant) {
    return {
      id: tenant.id,
      slug: tenant.slug || '',
      subdomain: tenant.subdomain || '',
      name: tenant.name || 'Competition Portal',
      branding: (tenant.branding && typeof tenant.branding === 'object' ? tenant.branding : {}) as any,
    };
  }
}

// Fallback to demo tenant
const tenant = await prisma.tenants.findFirst({
  where: { slug: 'demo' },
  select: {
    id: true,
    slug: true,
    subdomain: true,
    name: true,
    branding: true,
  },
});

if (!tenant) {
  return null;
}

return {
  id: tenant.id,
  slug: tenant.slug || '',
  subdomain: tenant.subdomain || '',
  name: tenant.name || 'Competition Portal',
  branding: (tenant.branding && typeof tenant.branding === 'object' ? tenant.branding : {}) as any,
};
```

**After:**
```typescript
// Query by subdomain if present
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({
    where: { subdomain },
    select: {
      id: true,
      slug: true,
      subdomain: true,
      name: true,
      branding: true,
    },
  });

  if (tenant) {
    return {
      id: tenant.id,
      slug: tenant.slug || '',
      subdomain: tenant.subdomain || '',
      name: tenant.name || 'Competition Portal',
      branding: (tenant.branding && typeof tenant.branding === 'object' ? tenant.branding : {}) as any,
    };
  }

  // ✅ Invalid subdomain - return null (middleware will handle 404)
  return null;
}

// No subdomain detected
if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
  // ✅ Localhost - load demo tenant for development
  const tenant = await prisma.tenants.findFirst({
    where: { slug: 'demo' },
    select: {
      id: true,
      slug: true,
      subdomain: true,
      name: true,
      branding: true,
    },
  });

  if (!tenant) {
    return null;
  }

  return {
    id: tenant.id,
    slug: tenant.slug || '',
    subdomain: tenant.subdomain || '',
    name: tenant.name || 'Competition Portal',
    branding: (tenant.branding && typeof tenant.branding === 'object' ? tenant.branding : {}) as any,
  };
}

// ✅ Production without subdomain - return null (middleware will handle 404)
return null;
```

### Verification

```bash
# Test invalid subdomain (should return 404)
curl https://invalid.compsync.net

# Test valid subdomain (should return 200)
curl https://empwr.compsync.net

# Test localhost (should return 200 with demo tenant)
curl http://localhost:3000

# Test production root (should return 404)
curl https://compsync.net
```

---

## Task 5: Add Email Tenant Branding (45 minutes)

**Templates already support branding - just need to fetch and pass it**

**Files to update:** 5 email send locations

### Location 1: Reservation Approved Email

**File:** `src/server/routers/reservation.ts:758-786`

**Before:**
```typescript
const emailData: ReservationApprovedData = {
  studioName: reservation.studios.name,
  competitionName: reservation.competitions?.name || 'Competition',
  competitionYear: reservation.competitions?.year || new Date().getFullYear(),
  spacesConfirmed: reservation.spaces_confirmed || 0,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reservations`,
};

const html = await renderReservationApproved(emailData);
```

**After:**
```typescript
// Fetch tenant branding
const tenant = await prisma.tenants.findUnique({
  where: { id: reservation.competitions?.tenant_id },
  select: { name: true, branding: true },
});

const emailData: ReservationApprovedData = {
  studioName: reservation.studios.name,
  competitionName: reservation.competitions?.name || 'Competition',
  competitionYear: reservation.competitions?.year || new Date().getFullYear(),
  spacesConfirmed: reservation.spaces_confirmed || 0,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reservations`,
  // ✅ Add tenant branding
  tenantBranding: tenant?.branding ? {
    primaryColor: (tenant.branding as any).primaryColor,
    secondaryColor: (tenant.branding as any).secondaryColor,
    logo: (tenant.branding as any).logo,
    tenantName: tenant.name,
  } : undefined,
};

const html = await renderReservationApproved(emailData);
```

### Location 2: Reservation Rejected Email

**File:** `src/server/routers/reservation.ts:885-920`

**Similar pattern - add tenant fetch before emailData creation:**

```typescript
// Fetch tenant branding
const tenant = await prisma.tenants.findUnique({
  where: { id: reservation.competitions?.tenant_id },
  select: { name: true, branding: true },
});

const emailData: ReservationRejectedData = {
  studioName: reservation.studios.name,
  competitionName: reservation.competitions?.name || 'Competition',
  competitionYear: reservation.competitions?.year || new Date().getFullYear(),
  reason: input.reason,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reservations`,
  contactEmail: process.env.EMAIL_FROM || 'noreply@glowdance.com',
  // ✅ Add tenant branding
  tenantBranding: tenant?.branding ? {
    primaryColor: (tenant.branding as any).primaryColor,
    secondaryColor: (tenant.branding as any).secondaryColor,
    logo: (tenant.branding as any).logo,
    tenantName: tenant.name,
  } : undefined,
};
```

### Location 3: Summary Submitted Email

**File:** `src/server/routers/entry.ts:475-490`

**Need to fetch competition first, then tenant:**

```typescript
// Fetch competition and tenant
const competition = await prisma.competitions.findUnique({
  where: { id: summary.competition_id },
  select: {
    name: true,
    year: true,
    tenant_id: true,
  },
});

const tenant = await prisma.tenants.findUnique({
  where: { id: competition?.tenant_id },
  select: { name: true, branding: true },
});

const emailData = {
  studioName: summary.reservations?.studios?.name || 'Your Studio',
  competitionName: competition?.name || 'Competition',
  competitionYear: competition?.year || new Date().getFullYear(),
  entryCount: summary.entries_count || 0,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
  // ✅ Add tenant branding
  tenantBranding: tenant?.branding ? {
    primaryColor: (tenant.branding as any).primaryColor,
    secondaryColor: (tenant.branding as any).secondaryColor,
    logo: (tenant.branding as any).logo,
    tenantName: tenant.name,
  } : undefined,
};
```

### Location 4: Invoice Delivery Email

**File:** `src/server/routers/invoice.ts:770-785`

**Fetch tenant from invoice's competition:**

```typescript
// Fetch tenant branding
const competition = await prisma.competitions.findUnique({
  where: { id: invoice.competition_id },
  select: { tenant_id: true },
});

const tenant = await prisma.tenants.findUnique({
  where: { id: competition?.tenant_id },
  select: { name: true, branding: true },
});

const emailData: InvoiceDeliveryData = {
  studioName: invoice.studios.name,
  competitionName: invoice.competitions?.name || 'Competition',
  competitionYear: invoice.competitions?.year || new Date().getFullYear(),
  invoiceNumber: invoiceNumber,
  totalAmount: Number(invoice.total || 0),
  routineCount: lineItemCount,
  invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/invoices/${invoice.id}`,
  dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : undefined,
  // ✅ Add tenant branding
  tenantBranding: tenant?.branding ? {
    primaryColor: (tenant.branding as any).primaryColor,
    secondaryColor: (tenant.branding as any).secondaryColor,
    logo: (tenant.branding as any).logo,
    tenantName: tenant.name,
  } : undefined,
};
```

### Location 5: Test Email Endpoints (Optional)

**File:** `src/server/routers/email.ts:145-225`

Similar updates for test/preview endpoints (not critical, but nice to have).

### Verification

Send test email (approve a reservation) and verify:
- Email displays tenant name (not "EMPWR" if on different tenant)
- Email uses tenant colors if configured
- Email shows tenant logo if configured

---

## Task 6: Add PDF Tenant Branding (65 minutes)

**GOTCHA:** Invoice queries don't include tenant from competition

### Step 1: Update initPDF Helper

**File:** `src/lib/pdf-reports.ts:25-66`

**Before:**
```typescript
function initPDF(title: string, orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary);
  doc.text('✨ EMPWR Dance Experience', 15, 15);

  // ... rest of header

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text);
  doc.text('EMPWR Dance Experience', 15, pageHeight - 10);

  return doc;
}
```

**After:**
```typescript
function initPDF(
  title: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  tenantName: string = 'EMPWR Dance Experience' // ✅ Optional with default
): jsPDF {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary);
  doc.text(`✨ ${tenantName}`, 15, 15); // ✅ Dynamic

  // ... rest of header

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text);
  doc.text(tenantName, 15, pageHeight - 10); // ✅ Dynamic

  return doc;
}
```

### Step 2: Update initPDF Callers

**File:** `src/lib/pdf-reports.ts`

**Update 5 internal calls:**

**Line 97:**
```typescript
// Before
const doc = initPDF(`Entry Score Sheet - #${data.entry.entry_number}`);

// After (add tenant parameter when available)
const doc = initPDF(
  `Entry Score Sheet - #${data.entry.entry_number}`,
  'portrait',
  data.tenantName || 'EMPWR Dance Experience'
);
```

**Line 237:**
```typescript
// Before
const doc = initPDF(`Category Results - ${data.category} (${data.age_group})`);

// After
const doc = initPDF(
  `Category Results - ${data.category} (${data.age_group})`,
  'portrait',
  data.tenantName || 'EMPWR Dance Experience'
);
```

**Line 340:**
```typescript
// Before
const doc = initPDF(`Judge Scorecard - ${data.judge.name}`, 'landscape');

// After
const doc = initPDF(
  `Judge Scorecard - ${data.judge.name}`,
  'landscape',
  data.tenantName || 'EMPWR Dance Experience'
);
```

**Line 433:**
```typescript
// Before
const doc = initPDF('Competition Summary Report');

// After
const doc = initPDF(
  'Competition Summary Report',
  'portrait',
  data.tenantName || 'EMPWR Dance Experience'
);
```

**Line 525 (generateInvoicePDF):**
```typescript
// Before (line 600+)
const doc = initPDF(`Invoice - ${invoice.invoiceNumber}`);

// After
const doc = initPDF(
  `Invoice - ${invoice.invoiceNumber}`,
  'portrait',
  invoice.tenant?.name || 'EMPWR Dance Experience'
);
```

### Step 3: Update Invoice Queries to Include Tenant

**File:** `src/server/routers/invoice.ts:77-79`

**Before:**
```typescript
include: {
  studios: true,
  competitions: true,
  reservations: true,
},
```

**After:**
```typescript
include: {
  studios: true,
  competitions: {
    include: {
      tenants: {
        select: {
          id: true,
          name: true,
          branding: true,
        },
      },
    },
  },
  reservations: true,
},
```

### Step 4: Update Invoice Return Object

**File:** `src/server/routers/invoice.ts:128-156`

**After the `competition` object (around line 135), add:**

```typescript
competition: {
  id: invoice.competitions?.id || '',
  name: invoice.competitions?.name || 'Unknown',
  year: invoice.competitions?.year || new Date().getFullYear(),
  startDate: invoice.competitions?.competition_start_date,
  endDate: invoice.competitions?.competition_end_date,
  location: invoice.competitions?.primary_location,
},
// ✅ Add tenant object
tenant: invoice.competitions?.tenants ? {
  id: invoice.competitions.tenants.id,
  name: invoice.competitions.tenants.name,
  branding: invoice.competitions.tenants.branding,
} : null,
reservation: invoice.reservations ? {
  // ... existing code
```

### Step 5: Update generateForStudio Query (Same Fix)

**File:** `src/server/routers/invoice.ts:200-250` (approximate)

**Find the similar `include` and return object in `generateForStudio`, apply same fixes:**

1. Update `include` to nest `competitions.tenants`
2. Add `tenant` to return object

### Verification

```typescript
// Download invoice PDF
// Check header shows correct tenant name (not hardcoded EMPWR)
```

---

## Task 7: Testing & Validation (30 minutes)

### Automated Checks

```bash
cd D:\ClaudeCode\CompPortal

# 1. No hardcoded tenant IDs
grep -rn "00000000-0000-0000-0000-000000000001" src/ --exclude-dir=node_modules
# Expected: 0 results

# 2. Build succeeds
npm run build
# Expected: ✓ Compiled successfully

# 3. TypeScript check
npx tsc --noEmit
# Expected: no errors
```

### Manual Testing Checklist

**On `empwr.compsync.net`:**
- [ ] Login works
- [ ] Dashboard loads
- [ ] Settings page shows EMPWR settings (not error)
- [ ] Create dancer → Check DB shows EMPWR tenant_id
- [ ] Onboarding creates studio with EMPWR tenant_id
- [ ] Approve reservation → Email shows "EMPWR Dance Experience"
- [ ] Download invoice PDF → Header shows "EMPWR Dance Experience"

**On `localhost:3000`:**
- [ ] Login works (demo tenant)
- [ ] Dashboard loads
- [ ] All features work as before

**On invalid subdomain:**
- [ ] `curl https://invalid.compsync.net` → 404
- [ ] `curl https://compsync.net` → 404 (no subdomain)

### Database Validation

```sql
-- Check no dancers with hardcoded tenant
SELECT id, first_name, last_name, tenant_id
FROM dancers
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC
LIMIT 10;

-- Check studios have correct tenant
SELECT name, tenant_id, created_at
FROM studios
ORDER BY created_at DESC
LIMIT 10;
```

---

## Task 8: Documentation (30 minutes)

### Create Manual Subdomain Setup Guide

**New file:** `docs/VERCEL_SUBDOMAIN_SETUP.md`

```markdown
# Vercel Subdomain Setup Guide

**For:** Manual tenant onboarding (no Vercel Enterprise)
**Frequency:** ~1 new tenant per year
**Time per tenant:** 15 minutes

---

## Prerequisites

- Access to Vercel dashboard (CompPortal project)
- Access to Cloudflare dashboard (compsync.net domain)
- Supabase admin access (for tenant creation)

---

## Step 1: Create Tenant in Database

```sql
-- Generate new tenant ID
SELECT gen_random_uuid(); -- Copy this ID for next step

-- Insert tenant record
INSERT INTO tenants (
  id,
  slug,
  subdomain,
  name,
  branding
) VALUES (
  '[UUID-from-above]',
  'starbound', -- Tenant slug (lowercase, no spaces)
  'starbound', -- Subdomain (must match Vercel domain)
  'Starbound Dance Company', -- Display name
  '{
    "primaryColor": "#FF6B9D",
    "secondaryColor": "#4ECDC4",
    "logo": null,
    "tagline": "Reach for the stars"
  }'::jsonb
);

-- Verify
SELECT id, slug, subdomain, name FROM tenants WHERE slug = 'starbound';
```

---

## Step 2: Add Subdomain in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **CompPortal** project
3. Navigate to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `starbound.compsync.net`
6. Click **Add**

**Vercel will show DNS records needed** (copy for next step)

---

## Step 3: Configure DNS in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select **compsync.net** domain
3. Navigate to **DNS** → **Records**
4. Click **Add record**

**Record details:**
- **Type:** CNAME
- **Name:** `starbound` (matches subdomain)
- **Target:** `cname.vercel-dns.com` (from Vercel)
- **Proxy status:** ✅ Proxied (orange cloud)
- **TTL:** Auto

5. Click **Save**

---

## Step 4: Verify DNS Propagation

**Wait 5-60 minutes for DNS propagation**

Check status:
```bash
# Check DNS resolution
nslookup starbound.compsync.net

# Expected output:
# Non-authoritative answer:
# starbound.compsync.net canonical name = cname.vercel-dns.com
```

**In Vercel dashboard:**
- Domain status should change to **"Valid Configuration"** (green checkmark)
- HTTPS certificate auto-provisions (1-5 minutes after valid DNS)

---

## Step 5: Test New Subdomain

```bash
# Test subdomain loads
curl https://starbound.compsync.net

# Should return 200 (not 404)
```

**Browser test:**
1. Visit `https://starbound.compsync.net`
2. Should load login page (not 404)
3. Login as Competition Director
4. Verify dashboard loads
5. Check Settings → Competition Settings shows Starbound settings

---

## Step 6: Create First User

```sql
-- User creation happens via Supabase Auth UI
-- Or manual SQL:

-- 1. Create auth user (via Supabase dashboard or API)
-- 2. Create user profile
INSERT INTO user_profiles (
  id,
  role,
  first_name,
  last_name
) VALUES (
  '[auth-user-id]',
  'competition_director',
  'Jane',
  'Smith'
);
```

**Provide credentials to client:**
- Subdomain: `https://starbound.compsync.net`
- Username: `jane@starbound.com`
- Temporary password: `[generated]`

---

## Troubleshooting

### Domain shows "Invalid Configuration" in Vercel

**Cause:** DNS not propagated yet
**Solution:** Wait up to 1 hour, then check nslookup

### Subdomain returns 404

**Possible causes:**
1. Tenant not in database → Check SQL insert
2. Subdomain mismatch → Verify `tenants.subdomain` matches Vercel domain
3. DNS not working → Check nslookup

### HTTPS certificate not provisioning

**Cause:** DNS must be valid first
**Solution:** Wait for "Valid Configuration" in Vercel, then certificate auto-provisions

---

## Rollback Process

If tenant onboarding fails:

```sql
-- Delete tenant and cascade all data
DELETE FROM tenants WHERE slug = 'starbound';

-- Remove from Vercel
-- Dashboard → Settings → Domains → Remove domain

-- Remove from Cloudflare
-- DNS → Delete CNAME record
```
```

---

## Commit & Push (5 minutes)

```bash
# Verify all changes
git status

# Add all changes
git add -A

# Commit with detailed message
git commit -m "feat: Multi-tenant subdomain support

Implemented per-client subdomain isolation for multi-tenancy.

Changes:
- Fixed 6 hardcoded tenant IDs (dancer.ts:258,505,690)
- Created onboarding server action (tenant from subdomain)
- Updated getCurrentUser to return tenantId
- Fixed invalid subdomain fallback (returns 404, not EMPWR)
- Added tenant branding to 5 email templates
- Added tenant branding to PDF generation
- Updated invoice queries to include tenant data

Testing:
✅ empwr.compsync.net loads EMPWR data
✅ invalid.compsync.net returns 404
✅ localhost:3000 loads demo tenant
✅ Emails show correct tenant branding
✅ PDFs show correct tenant name
✅ Settings page dynamic tenant
✅ No hardcoded tenant IDs remain
✅ npm run build succeeds

Spec reference: MULTI_TENANT_FINAL_IMPLEMENTATION_PLAN.md
Gotchas fixed: MULTI_TENANT_DRY_RUN_GOTCHAS.md (4 issues)

Ready for production multi-tenant launch.

🤖 Generated with Claude Code"

# Push to staging branch
git push origin staging/multi-tenant
```

---

## Merge to Main (After Validation)

**ONLY after ALL tests pass on staging:**

```bash
# Switch to main
git checkout main

# Merge staging
git merge staging/multi-tenant

# Push to production
git push origin main

# Tag release
git tag -a v1.0-multi-tenant -m "Multi-tenant subdomain support launched"
git push --tags
```

---

## Rollback Procedures

### If Build Fails

```bash
git reset --hard v1.0-pre-multitenant
git push origin staging/multi-tenant --force
```

### If Production Breaks

**Vercel rollback:**
1. Go to Vercel → Deployments
2. Find last known good deployment
3. Click "⋯" → "Promote to Production"

**Code rollback:**
```bash
git revert HEAD
git push origin main
```

### If Database Corrupted

```bash
# Restore from Supabase backup
# Dashboard → Database → Backups → "Pre-Multi-Tenant-2025-10-26" → Restore
```

---

## Success Criteria

**Implementation complete when:**
- [ ] All 10 automated tests pass
- [ ] All manual tests pass
- [ ] `npm run build` succeeds with 0 errors
- [ ] EMPWR tenant works identically to before
- [ ] Invalid subdomain returns 404 (not fallback)
- [ ] Localhost still works for development
- [ ] User approves staging deployment
- [ ] Merged to main
- [ ] Production deployment successful

---

## Time Tracking

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Pre-Implementation | 30 min | | Restore points |
| Task 1: Hardcoded IDs | 45 min | | 3 locations |
| Task 2: Onboarding | 45 min | | Server action |
| Task 3: Settings page | 25 min | | getCurrentUser |
| Task 3.5: Invalid 404 | 45 min | | 2 fallback layers |
| Task 5: Email branding | 45 min | | 5 locations |
| Task 6: PDF branding | 65 min | | Invoice queries |
| Task 7: Testing | 30 min | | Full validation |
| Task 8: Documentation | 30 min | | Subdomain guide |
| **Total** | **6 hours** | | |

---

**Plan Status:** ✅ READY TO EXECUTE
**Next Session:** Session 20
**Confidence Level:** 90% (dry-run complete, all gotchas solved)
**Risk Level:** LOW (restore points ready, staging-first approach)

---

## THIS IS THE PLAN WE'RE RUNNING

**Start with:** Pre-Implementation Setup → Task 1 → Task 2 → Task 3 → Task 3.5 → Task 5 → Task 6 → Task 7 → Task 8 → Commit → Test → Merge

**No deviations** - Follow this plan exactly as written.
