# Multi-Tenant Implementation - Dry-Run Gotchas

**Date:** October 26, 2025
**Purpose:** Issues discovered during simulated dry-run before implementation
**Status:** 🚨 CRITICAL - Must address before proceeding

---

## Executive Summary

**Dry-run completed on all 6 tasks**

**Critical Gotchas Found:** 4
**Risk Level:** MEDIUM (all fixable, adds ~1 hour to timeline)
**Recommendation:** Proceed with updated implementation plan

---

## GOTCHA #1: Onboarding Uses Supabase Client, Not tRPC

**Task Affected:** Task 2 (Onboarding dynamic tenant)

**Location:** `src/app/onboarding/page.tsx:129`

**Problem:**
```typescript
// This is a CLIENT COMPONENT ('use client' at line 1)
const supabase = createClient(); // Uses Supabase client, NOT tRPC

// Line 129 - hardcoded tenant ID
await supabase
  .from('studios')
  .insert({
    tenant_id: '00000000-0000-0000-0000-000000000001', // ❌ Hardcoded
    owner_id: user.id,
    name: formData.studioName,
    // ...
  });
```

**Why It's a Problem:**
- Client components don't have `ctx.tenantId` from tRPC
- Can't use server-side `getTenantData()` (it's async and uses headers)
- Need to fetch tenant from client-side

**Original Plan Said:**
> "Replace with `ctx.tenantId`"

**Reality:** No `ctx` available in client component

**Solution:**
```typescript
// Option 1: Fetch tenant from /api/tenant endpoint
const [tenantId, setTenantId] = useState<string | null>(null);

useEffect(() => {
  fetch('/api/tenant')
    .then(res => res.json())
    .then(data => setTenantId(data.id));
}, []);

// Then use in insert
tenant_id: tenantId || (() => { throw new Error('No tenant') })(),

// Option 2: Convert to server action (better)
// Create src/app/actions/onboarding.ts server action
'use server';
import { getTenantId } from '@/lib/tenant-context';

export async function createStudio(formData) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('No tenant context');

  await prisma.studios.create({
    data: {
      tenant_id: tenantId, // ✅ Dynamic from subdomain
      ...formData,
    },
  });
}
```

**Recommended:** Use Server Action (Option 2)

**Time Impact:** +30 minutes (create server action file)

**Testing:** Verify onboarding works on both `empwr.compsync.net` and `localhost`

---

## GOTCHA #2: getCurrentUser Query Missing tenantId

**Task Affected:** Task 3 (Settings page fix)

**Location:** `src/server/routers/user.ts:36-79`

**Problem:**
```typescript
getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
  // ... queries user_profiles and studios

  return {
    id: userProfile?.id,
    role: userProfile?.role,
    first_name: userProfile?.first_name,
    // ...
    studio,
    // ❌ DOES NOT RETURN tenantId
  };
});
```

**Why It's a Problem:**
- Original plan said: "Use `trpc.user.getCurrentUser` to get `tenantId`"
- Query doesn't return `tenantId` field
- Settings page can't get tenant from this query

**Original Plan Said:**
```typescript
const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
const tenantId = currentUser?.tenantId; // ❌ This field doesn't exist
```

**Reality:** Query needs to be updated to return `tenantId`

**Solution Option 1:** Add `tenantId` to getCurrentUser return

```typescript
getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
  // ... existing code

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
    // ✅ Add tenant from context
    tenantId: ctx.tenantId,
    tenantData: ctx.tenantData,
  };
});
```

**Solution Option 2:** Use ctx directly in settings page

Since settings page already uses tRPC, we can create a simpler query:

```typescript
// In src/server/routers/tenant.ts (create new or use existing)
getTenantContext: protectedProcedure.query(async ({ ctx }) => {
  return {
    tenantId: ctx.tenantId,
    tenantData: ctx.tenantData,
  };
});

// In settings page
const { data: tenantContext } = trpc.tenant.getTenantContext.useQuery();
const tenantId = tenantContext?.tenantId;
```

**Recommended:** Option 1 (add to getCurrentUser - less breaking change)

**Time Impact:** +10 minutes (add 2 fields to return object)

**Testing:** Verify settings page loads correct tenant, especially on different subdomains

---

## GOTCHA #3: Invalid Subdomain Has TWO Fallback Locations

**Task Affected:** Task 3.5 (Invalid subdomain 404)

**Location:** `src/lib/supabase-middleware.ts:46-68`

**Problem:** There are **TWO LAYERS** of fallback, not one!

**Layer 1 - Lines 46-57:**
```typescript
// Fallback to default tenant (demo) if no subdomain or tenant not found
if (!tenantId) {
  const { data } = await supabase
    .from('tenants')
    .select('id, slug, subdomain, name, branding')
    .eq('slug', 'demo')
    .single();

  if (data) {
    tenantId = data.id;
    tenantData = data;
  }
}
```

**Layer 2 - Lines 62-68:**
```typescript
// TEMPORARY: Default to EMPWR tenant if none detected (for demo)
const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
const finalTenantData = tenantData || {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'EMPWR Dance Experience',
  subdomain: 'demo',
};
```

**Why It's a Problem:**
- Even if Layer 1 is removed, Layer 2 still provides fallback
- Need to remove BOTH layers
- BUT preserve localhost behavior

**Original Plan Said:**
> "Remove fallback, return null, let downstream return 404"

**Reality:** Need to distinguish between:
1. Invalid subdomain (e.g., `hacker.compsync.net`) → 404
2. Localhost (e.g., `localhost:3000`) → demo tenant
3. Production no subdomain (e.g., `compsync.net`) → 404

**Corrected Solution:**
```typescript
// Extract subdomain
const subdomain = extractSubdomain(hostname);

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
    return new Response('Tenant not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
} else {
  // No subdomain detected
  if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
    // ✅ Localhost - load demo tenant for development
    const { data } = await supabase
      .from('tenants')
      .select('id, slug, subdomain, name, branding')
      .eq('slug', 'demo')
      .single();

    if (data) {
      tenantId = data.id;
      tenantData = data;
    }
  } else {
    // ✅ Production without subdomain (compsync.net) - return 404
    return new Response('Tenant not found. Please use a subdomain (e.g., empwr.compsync.net)', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ✅ NO MORE FALLBACKS - if we reach here, tenant is set or we returned 404
requestHeaders.set('x-tenant-id', tenantId!);
requestHeaders.set('x-tenant-data', JSON.stringify(tenantData!));
```

**Also Need to Fix:** `src/lib/tenant-context.ts:78-95` (similar fallback logic)

**Time Impact:** +15 minutes (fix both files, test all scenarios)

**Testing Scenarios:**
- `https://empwr.compsync.net` → 200 (EMPWR tenant)
- `https://invalid.compsync.net` → 404 (invalid subdomain)
- `https://compsync.net` → 404 (no subdomain in production)
- `http://localhost:3000` → 200 (demo tenant for dev)
- `http://localhost:3001` → 200 (demo tenant for dev)

---

## GOTCHA #4: Invoice Query Doesn't Include Tenant from Competition

**Task Affected:** Task 6 (PDF branding)

**Location:** `src/server/routers/invoice.ts:77-79`

**Problem:**
```typescript
const invoice = await prisma.invoices.findFirst({
  where: { /* ... */ },
  include: {
    studios: true,
    competitions: true, // ❌ Includes all fields but not used in return
    reservations: true,
    // ...
  },
});

// Later returns (lines 111-156):
return {
  // ...
  competition: {
    id: invoice.competitions?.id || '',
    name: invoice.competitions?.name || 'Unknown',
    year: invoice.competitions?.year || new Date().getFullYear(),
    startDate: invoice.competitions?.competition_start_date,
    endDate: invoice.competitions?.competition_end_date,
    location: invoice.competitions?.primary_location,
    // ❌ Does NOT include tenant_id from competition
  },
  // ❌ Does NOT include tenant object
};
```

**Why It's a Problem:**
- Frontend calls `generateInvoicePDF(invoice)`
- PDF function expects `invoice.tenant.branding` but it's not in the returned object
- Competition has `tenant_id` but it's not included in the select/return

**Original Plan Said:**
> "Fetch tenant from invoice.competition in frontend"

**Reality:** Competition data doesn't include tenant, so frontend can't access it

**Solution:**

### Update invoice query to include tenant:

**File:** `src/server/routers/invoice.ts:77`

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

### Update return object to include tenant:

**File:** `src/server/routers/invoice.ts:111-156`

**Add after line 135:**
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
```

**Same fix needed in:** `generateForStudio` query (lines 159-250) - similar structure

**Time Impact:** +20 minutes (update 2 queries + return objects)

**Testing:** Verify PDF shows correct tenant name in header/footer

---

## Updated Implementation Timeline

**Original Estimate:** 3.5-4.5 hours
**With Gotchas:** 4.5-5.5 hours

**Breakdown:**

| Task | Original | With Gotchas | Delta |
|------|----------|--------------|-------|
| Pre-Implementation | 30 min | 30 min | - |
| Task 1: Hardcoded tenant IDs | 45 min | 45 min | - |
| Task 2: Onboarding | 15 min | **45 min** | +30 min (server action) |
| Task 3: Settings page | 15 min | **25 min** | +10 min (update query) |
| Task 3.5: Invalid subdomain 404 | 30 min | **45 min** | +15 min (2 fallback layers) |
| Task 5: Email branding | 45 min | 45 min | - |
| Task 6: PDF branding | 45 min | **65 min** | +20 min (update invoice queries) |
| Task 7: Testing | 30 min | 30 min | - |
| Task 8: Documentation | 30 min | 30 min | - |
| **Total** | **4.5 hrs** | **5.5 hrs** | **+1 hr** |

---

## Updated Task Details

### Task 2: Onboarding (Revised)

**Create new file:** `src/app/actions/onboarding.ts`

```typescript
'use server';

import { getTenantId } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma';

export async function createStudioOnboarding(formData: {
  owner_id: string;
  name: string;
  address1?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  consent_photo_video?: boolean;
  consent_legal_info?: boolean;
}) {
  const tenantId = await getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context - please access via subdomain');
  }

  const now = new Date();

  return await prisma.studios.create({
    data: {
      tenant_id: tenantId, // ✅ Dynamic from subdomain
      owner_id: formData.owner_id,
      name: formData.name,
      address1: formData.address1,
      city: formData.city,
      province: formData.province,
      postal_code: formData.postal_code,
      phone: formData.phone,
      email: formData.email,
      status: 'approved',
      country: 'Canada',
      consent_photo_video: formData.consent_photo_video ? now : null,
      consent_legal_info: formData.consent_legal_info ? now : null,
    },
  });
}
```

**Update:** `src/app/onboarding/page.tsx:125-144`

**Before:**
```typescript
const { error } = await supabase
  .from('studios')
  .insert({
    tenant_id: '00000000-0000-0000-0000-000000000001', // ❌ Hardcoded
    owner_id: user.id,
    // ...
  });
```

**After:**
```typescript
import { createStudioOnboarding } from '../actions/onboarding';

// In submit handler:
try {
  await createStudioOnboarding({
    owner_id: user.id,
    name: formData.studioName,
    address1: formData.address1,
    city: formData.city,
    province: formData.province,
    postal_code: formData.postalCode,
    phone: formData.phone,
    email: formData.email || user.email,
    consent_photo_video: formData.consentPhotoVideo,
    consent_legal_info: formData.consentLegalInfo,
  });
} catch (error) {
  throw new Error(`Failed to create studio: ${error.message}`);
}
```

---

### Task 3: Settings Page (Revised)

**Update:** `src/server/routers/user.ts:69-79`

**After line 78, add:**
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

**Update:** `src/app/dashboard/settings/tenant/page.tsx:19-20`

**Before:**
```typescript
const tenantId = '00000000-0000-0000-0000-000000000001';
const userLoading = false;
```

**After:**
```typescript
const { data: currentUser, isLoading: userLoading } = trpc.user.getCurrentUser.useQuery();
const tenantId = currentUser?.tenantId;

if (!tenantId && !userLoading) {
  return <div>No tenant context available</div>;
}
```

---

### Task 3.5: Invalid Subdomain 404 (Revised - Both Layers)

See GOTCHA #3 solution above for full implementation

**Files to update:**
1. `src/lib/supabase-middleware.ts:46-68` (remove both fallback layers)
2. `src/lib/tenant-context.ts:78-95` (similar fix)
3. `src/app/api/trpc/[trpc]/route.ts` (if has similar fallback)

---

### Task 6: PDF Branding (Revised - Include Tenant)

See GOTCHA #4 solution above for full implementation

**Files to update:**
1. `src/server/routers/invoice.ts:77-79` (add tenant to include)
2. `src/server/routers/invoice.ts:111-156` (add tenant to return)
3. `src/server/routers/invoice.ts:159-250` (generateForStudio - same fix)

---

## Testing Checklist (Updated)

**Critical Tests:**

- [ ] Task 1: No hardcoded tenant IDs in codebase
  ```bash
  grep -rn "00000000-0000-0000-0000-000000000001" src/ --exclude-dir=node_modules
  # Should return 0 results
  ```

- [ ] Task 2: Onboarding creates studio with correct tenant
  ```sql
  SELECT name, tenant_id FROM studios ORDER BY created_at DESC LIMIT 5;
  -- Verify tenant_id matches subdomain tenant
  ```

- [ ] Task 3: Settings page loads correct tenant
  - Access `empwr.compsync.net/dashboard/settings/tenant`
  - Verify page loads EMPWR settings, not error

- [ ] Task 3.5: Invalid subdomains return 404
  - `curl https://invalid.compsync.net` → 404
  - `curl https://compsync.net` → 404
  - `curl https://empwr.compsync.net` → 200
  - `curl http://localhost:3000` → 200 (demo tenant)

- [ ] Task 5: Emails show correct tenant branding
  - Approve reservation on `empwr.compsync.net`
  - Check email shows "EMPWR Dance Experience" not generic

- [ ] Task 6: PDFs show correct tenant name
  - Download invoice PDF from EMPWR subdomain
  - Verify header shows "EMPWR Dance Experience"
  - Download from different tenant (after setup)
  - Verify header shows that tenant's name

---

## Recommendations

### 1. Proceed with Implementation ✅

All gotchas are fixable with clear solutions. No blockers found.

### 2. Add +1 Hour Buffer ✅

Original 4.5 hrs → New estimate 5.5 hrs + 30 min buffer = **6 hours total**

### 3. Test Localhost Thoroughly ⚠️

Invalid subdomain fix could break localhost if not careful. Ensure:
- `localhost:3000` loads demo tenant
- `127.0.0.1:3000` loads demo tenant
- `localhost:[any-port]` loads demo tenant

### 4. Create Onboarding Server Action First 🎯

This is the trickiest gotcha. Get this working before other tasks.

### 5. Update Pre-Implementation Analysis ✅

Add these gotchas to the main analysis document so user is fully informed.

---

## Questions for User

**Before proceeding:**

1. **Approve 6-hour timeline?** (Was 4.5 hrs, now 5.5 hrs + 30 min buffer)
2. **Approve server action approach for onboarding?** (More robust than client fetch)
3. **Approve adding tenant fields to getCurrentUser?** (Simplest solution for settings page)
4. **Any concerns about localhost behavior?** (Will still work, but want to confirm)

---

**Dry-Run Status:** ✅ COMPLETE
**Gotchas Found:** 4 (all fixable)
**Risk Level:** LOW (with updated plan)
**Confidence:** 90% (up from 95% due to gotchas, but still high)
**Recommendation:** PROCEED with updated 6-hour timeline
