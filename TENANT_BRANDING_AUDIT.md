# Tenant Branding Audit Report

**Date:** January 29, 2025
**Auditor:** Claude (Session 23)
**Scope:** EMPWR → GLOW multi-tenant branding readiness

---

## Executive Summary

**Overall Status:** ⚠️ **PARTIAL IMPLEMENTATION**

- **Ready:** 40% (4/10 locations)
- **Needs Fix:** 60% (6/10 locations)
- **Risk Level:** HIGH - Hardcoded branding in critical user-facing areas

---

## Detailed Findings

### ✅ READY (Uses Tenant Variables)

#### 1. Homepage Content (src/app/page.tsx)
- **Lines:** 17-20, 42-46
- **Implementation:**
  ```typescript
  const tenantName = tenant?.name || 'Competition Portal';
  const tagline = branding.tagline || 'Professional dance competition management platform';
  ```
- **Status:** ✅ Fully dynamic
- **Tested:** Yes (displays "EMPWR Dance Experience" and "You Are the Key")

#### 2. Email Templates (src/emails/*.tsx)
- **Files:** ReservationApproved.tsx, InvoiceDelivery.tsx, etc.
- **Implementation:** All templates accept `tenantBranding` prop
  ```typescript
  interface Props {
    tenantBranding?: {
      primaryColor?: string;
      secondaryColor?: string;
      logo?: string | null;
      tenantName?: string;
    };
  }
  ```
- **Injection Point:** src/server/routers/email.ts lines 204-218
- **Status:** ✅ Fully dynamic
- **Tested:** Not yet (email sending)

#### 3. Email Theme Defaults (src/emails/theme.ts)
- **Lines:** 172-175
- **Implementation:** Provides fallback colors only (no hardcoded names)
- **Status:** ✅ Safe defaults

#### 4. Competition/Event Names
- **Source:** Database `competitions` table
- **Implementation:** All reservation cards pull from `competition.name`
- **Status:** ✅ Fully dynamic
- **Example:** "EMPWR Dance - St. Catharines #1" comes from DB

---

### ❌ NEEDS FIX (Hardcoded EMPWR Branding)

#### 5. Page Title & Metadata (src/app/layout.tsx)
**Priority:** 🔴 P0 - CRITICAL (affects SEO, browser tabs, social sharing)

- **Lines with hardcoded "EMPWR":**
  - Line 18: `title.default: 'EMPWR Dance Experience'`
  - Line 19: `title.template: '%s | EMPWR'`
  - Line 23: `authors: [{ name: 'EMPWR Team' }]`
  - Line 24: `creator: 'EMPWR'`
  - Line 25: `publisher: 'EMPWR'`
  - Line 31: `openGraph.title: 'EMPWR Dance Experience'`
  - Line 33: `openGraph.siteName: 'EMPWR'`
  - Line 39: `openGraph.images.alt: 'EMPWR Dance Experience'`
  - Line 45: `twitter.title: 'EMPWR Dance Experience'`

**Current Behavior:**
- Browser tab shows "EMPWR Dance Experience"
- Social media cards show EMPWR branding
- SEO metadata locked to EMPWR

**Required Fix:**
- Make metadata dynamic based on tenant
- Generate metadata in layout with `generateMetadata()` async function
- Pass tenant name from `getTenantData()`

**Code Change Needed:**
```typescript
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantData();
  const tenantName = tenant?.name || 'Competition Portal';

  return {
    title: {
      default: tenantName,
      template: `%s | ${tenantName}`,
    },
    // ... use tenantName throughout
  };
}
```

---

#### 6. Footer Copyright (src/components/Footer.tsx)
**Priority:** 🟡 P1 - HIGH (visible on every page)

- **Line 8:** Has tenant context available
- **Line 19:** HARDCODED in JSX: `"EMPWR Dance Experience"`

**Current Behavior:**
- Footer reads tenant from context but ignores it
- Always displays "© 2025 EMPWR Dance Experience · Powered by CompSync"

**Required Fix:**
```typescript
// Line 19 - BEFORE:
<span className="font-semibold text-white">EMPWR Dance Experience</span>

// Line 19 - AFTER:
<span className="font-semibold text-white">{tenantName}</span>
```

---

#### 7. Login Page (src/app/login/page.tsx)
**Priority:** 🟡 P1 - HIGH (first impression for users)

- **Line 55:** `"Sign in to your EMPWR account"`

**Current Behavior:**
- Login page doesn't use tenant context
- Always says "EMPWR account"

**Required Fix:**
1. Import `useTenantTheme` hook or make page server component with `getTenantData()`
2. Replace hardcoded text with tenant name

```typescript
// Option A (Client Component):
const { tenant } = useTenantTheme();
const tenantName = tenant?.name || 'Competition Portal';

// Line 55:
<p className="text-gray-300 text-center mb-8">
  Sign in to your {tenantName} account
</p>
```

---

#### 8. Signup Page (src/app/signup/page.tsx)
**Priority:** 🟡 P1 - HIGH (onboarding flow)

- **Line 182:** `"Join EMPWR today"`

**Current Behavior:**
- Signup page already uses `useTenantTheme` hook (line 24)
- But doesn't use tenant name in copy

**Required Fix:**
```typescript
// Line 182 - BEFORE:
<p className="text-gray-300 text-sm">Join EMPWR today</p>

// Line 182 - AFTER:
<p className="text-gray-300 text-sm">Join {tenant?.name || 'us'} today</p>
```

---

#### 9. PDF Reports (src/lib/pdf-reports.ts)
**Priority:** 🟡 P1 - HIGH (official competition documents)

- **Line 35:** `doc.text('✨ EMPWR Dance Experience', 15, 15);`
- **Line 66:** `doc.text('EMPWR Dance Experience', 15, pageHeight - 10);`

**Current Behavior:**
- All PDF functions use `initPDF()` which hardcodes EMPWR branding
- PDFs include invoice summaries, score sheets, competition reports

**Required Fix:**
1. Add `tenantName` parameter to `initPDF()` function
2. Pass tenant name from all callers
3. Update all PDF generation functions to accept tenant context

```typescript
// Line 25 - Update function signature:
function initPDF(
  title: string,
  tenantName: string = 'Competition Portal',
  orientation: 'portrait' | 'landscape' = 'portrait'
): jsPDF {
  // Line 35:
  doc.text(`✨ ${tenantName}`, 15, 15);

  // Line 66 in addFooter():
  doc.text(tenantName, 15, pageHeight - 10);
}
```

**Note:** All PDF callers need to fetch tenant data and pass it through.

---

#### 10. Email Subject Lines (Needs Verification)
**Priority:** 🟢 P2 - MEDIUM (functional but not branded)

**Status:** UNKNOWN - Needs code inspection

**Files to Check:**
- `src/server/routers/email.ts` - `getEmailSubject()` function
- All email sending locations

**Required Action:**
- Audit all email subject line generation
- Ensure no hardcoded "EMPWR" in subjects
- Verify tenant name passed to email templates

---

## Database Schema Review

### Tenants Table (prisma/schema.prisma line 1342)
```prisma
model tenants {
  id          String @id @default(dbgenerated("gen_random_uuid()"))
  slug        String @unique  // e.g. "empwr", "glow"
  subdomain   String @unique  // e.g. "empwr", "glow"
  name        String          // e.g. "EMPWR Dance Experience", "Glow Dance Competition"
  branding    Json @default("{}")  // Stores primaryColor, secondaryColor, tagline, logo
}
```

**Current EMPWR Data:**
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "slug": "empwr",
  "subdomain": "empwr",
  "name": "EMPWR Dance Experience",
  "branding": {
    "tagline": "You Are the Key",
    "primaryColor": "#8b5cf6",
    "secondaryColor": "#ec4899",
    "logo": null
  }
}
```

**Required GLOW Data:**
```json
{
  "id": "4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5",
  "slug": "glow",
  "subdomain": "glow",
  "name": "Glow Dance Competition",
  "branding": {
    "tagline": "[GLOW TAGLINE - TBD]",
    "primaryColor": "[GLOW PRIMARY - TBD]",
    "secondaryColor": "[GLOW SECONDARY - TBD]",
    "logo": null
  }
}
```

---

## User-Provided Branding Locations

Compared against your initial list:

| **Location** | **Status** | **Priority** |
|-------------|-----------|-------------|
| Email notifications | ✅ Ready (with tenantBranding prop) | - |
| Confirmation emails | ✅ Ready (same) | - |
| PDF prints (invoices, reports, summaries) | ❌ Hardcoded | P1 |
| Chrome title tab | ❌ Hardcoded | P0 |
| Login elements | ❌ Hardcoded | P1 |
| Footer | ❌ Hardcoded | P1 |

---

## Implementation Roadmap

### Phase 1: Critical Fixes (P0) - 2 hours
1. **Dynamic Metadata (layout.tsx)** - 45 min
   - Implement `generateMetadata()` function
   - Pull tenant data server-side
   - Update all metadata fields
   - Test browser tab title on both tenants

### Phase 2: High Priority Fixes (P1) - 3 hours
2. **Footer Branding (Footer.tsx)** - 15 min
   - Replace hardcoded text with tenant name
   - Test on both EMPWR and GLOW

3. **Login Page (login/page.tsx)** - 30 min
   - Add tenant context
   - Replace "EMPWR account" text
   - Test on both tenants

4. **Signup Page (signup/page.tsx)** - 15 min
   - Use existing tenant hook
   - Replace "Join EMPWR today" text
   - Test on both tenants

5. **PDF Reports (pdf-reports.ts)** - 90 min
   - Update `initPDF()` signature
   - Update all PDF generation functions
   - Update all callers to pass tenant name
   - Test PDF generation on both tenants

### Phase 3: Verification (P2) - 1 hour
6. **Email Subject Lines Audit** - 30 min
   - Grep for all subject line generation
   - Verify no hardcoded EMPWR
   - Test email sending on both tenants

7. **Comprehensive Testing** - 30 min
   - Test all flows on empwr.compsync.net
   - Test all flows on glow.compsync.net
   - Screenshot comparison
   - Document any missed instances

---

## Testing Checklist

### Per-Tenant Verification

**On empwr.compsync.net:**
- [ ] Homepage shows "EMPWR Dance Experience"
- [ ] Browser tab shows "EMPWR Dance Experience"
- [ ] Footer shows "© 2025 EMPWR Dance Experience"
- [ ] Login says "Sign in to your EMPWR Dance Experience account"
- [ ] Signup says "Join EMPWR Dance Experience today"
- [ ] PDF header shows "✨ EMPWR Dance Experience"
- [ ] Email has EMPWR colors (purple/pink)

**On glow.compsync.net:**
- [ ] Homepage shows "Glow Dance Competition"
- [ ] Browser tab shows "Glow Dance Competition"
- [ ] Footer shows "© 2025 Glow Dance Competition"
- [ ] Login says "Sign in to your Glow Dance Competition account"
- [ ] Signup says "Join Glow Dance Competition today"
- [ ] PDF header shows "✨ Glow Dance Competition"
- [ ] Email has GLOW colors (TBD)

### Cross-Tenant Isolation
- [ ] Logging into EMPWR subdomain doesn't show GLOW branding
- [ ] Logging into GLOW subdomain doesn't show EMPWR branding
- [ ] PDFs generated for EMPWR have EMPWR branding only
- [ ] PDFs generated for GLOW have GLOW branding only

---

## Risk Assessment

### Pre-Launch Risks

**HIGH RISK:**
- Browser tabs showing wrong competition name = user confusion
- PDFs with wrong branding = legal/contractual issues
- Login page saying "EMPWR" for GLOW users = unprofessional

**MEDIUM RISK:**
- Email subjects may have hardcoded EMPWR (not yet verified)
- Social media sharing will show EMPWR branding for all tenants

**LOW RISK:**
- Email templates already support dynamic branding
- Homepage already fully dynamic

---

## Recommendations

### Before GLOW Launch:
1. **Complete Phase 1 & 2 fixes** (P0 + P1 = 5 hours)
2. **Full tenant isolation test** on staging
3. **Generate test PDFs** for both tenants
4. **Send test emails** from both tenants
5. **Screenshot audit** of all pages on both subdomains

### Before Production Data Migration:
- Confirm GLOW branding values (colors, tagline)
- Update `tenants` table with GLOW branding JSON
- Test all user flows as GLOW studio director
- Verify no EMPWR branding leaks into GLOW tenant

### Long-Term Improvements:
- Create branding admin panel for Competition Directors
- Allow logo upload for each tenant
- Support custom color schemes beyond 2 colors
- Generate dynamic OG images per tenant
- Support favicon per tenant

---

## Files Requiring Changes

| **File** | **Lines** | **Change Type** | **Priority** |
|---------|----------|----------------|-------------|
| src/app/layout.tsx | 16-62 | Convert to generateMetadata() | P0 |
| src/components/Footer.tsx | 19 | Replace hardcoded text | P1 |
| src/app/login/page.tsx | 55 | Add tenant context + replace text | P1 |
| src/app/signup/page.tsx | 182 | Use existing tenant hook | P1 |
| src/lib/pdf-reports.ts | 25, 35, 66 + all callers | Add tenantName param | P1 |
| src/server/routers/email.ts | TBD | Verify subject lines | P2 |

---

## SQL Queries for Verification

### Check Current Tenant Data
```sql
SELECT id, slug, subdomain, name, branding
FROM tenants
WHERE slug IN ('empwr', 'glow');
```

### Update GLOW Branding (Example)
```sql
UPDATE tenants
SET branding = jsonb_set(
  branding::jsonb,
  '{tagline}',
  '"Shine Bright on Stage"'
)
WHERE slug = 'glow';
```

---

## Conclusion

**Current State:** 40% ready for multi-tenant branding
**Estimated Effort:** 6 hours to reach 100%
**Blocker Status:** None (all fixes are straightforward)
**Launch Impact:** HIGH - Must fix before GLOW launch

**Next Steps:**
1. Get GLOW branding specifications (name, colors, tagline)
2. Implement Phase 1 (P0) fixes
3. Implement Phase 2 (P1) fixes
4. Run comprehensive testing on both tenants
5. Deploy and verify on production

---

**Report Generated:** January 29, 2025
**Session:** 23 (Tenant Branding Audit)
**Build:** 9ec09ae
