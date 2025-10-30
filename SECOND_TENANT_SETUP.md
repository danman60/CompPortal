# Second Tenant Setup - Complete Session Documentation

**Session:** January 29, 2025 (Session 23)
**Purpose:** Audit and prepare CompPortal for GLOW tenant branding
**Status:** ✅ Audit Complete, Ready for Implementation

---

## 📋 Session Overview

### Objective
Identify and document ALL hardcoded "EMPWR" branding in the codebase to enable proper multi-tenant support for GLOW Dance Competition.

### Approach
1. Manual navigation through EMPWR subdomain via Playwright MCP
2. Systematic codebase scan (grep patterns, file searches)
3. Deep verification scan (15 categories checked)
4. Database verification via Supabase MCP
5. Implementation guide creation

### Outcome
**16 files** with **32 hardcoded instances** identified and documented. Database verified ready. Implementation plan created.

---

## 🔍 Audit Process (Step-by-Step)

### Phase 1: Production UI Navigation (Playwright MCP)

**Method:** Clicked through `empwr.compsync.net` to identify visible branding

**Pages Visited:**
1. Homepage (`/`)
   - Header: "EMPWR Dance Experience"
   - Tagline: "You Are the Key"
   - Footer: "© 2025 EMPWR Dance Experience"

2. Login (`/login`)
   - Text: "Sign in to your EMPWR account"

3. Signup (`/signup`)
   - Text: "Join EMPWR today"

4. Dashboard (`/dashboard`)
   - Header branding visible
   - No hardcoded text in main content

5. Profile Settings (`/dashboard/settings/profile`)
   - Generic content, no hardcoded EMPWR

6. Reservations (`/dashboard/reservations`)
   - Event names from database (dynamic)

7. Entries (`/dashboard/entries`)
   - Event names from database (dynamic)

**Screenshots Captured:**
- `empwr-homepage.png`
- `empwr-login.png`
- `empwr-signup.png`
- `empwr-dashboard.png`
- `empwr-profile.png`
- `empwr-reservations.png`
- `empwr-entries.png`
- `empwr-invoices.png`

**Initial Findings:**
- ✅ Homepage content uses tenant variables
- ❌ Footer hardcoded
- ❌ Login page hardcoded
- ❌ Signup page hardcoded
- ❌ Browser tab title hardcoded
- ✅ Competition/Event names dynamic

---

### Phase 2: Codebase Pattern Search

**Search Patterns Used:**
```bash
# Primary search
grep -r "EMPWR" src/

# Case-insensitive
grep -ri "empwr" src/

# Specific patterns
grep -r "EMPWR Dance Experience" src/
grep -r "You Are the Key" src/
grep -r "Sign in to your EMPWR" src/
grep -r "Join EMPWR today" src/
```

**Files Identified (Initial):**
1. `src/app/layout.tsx` - Metadata (9 instances)
2. `src/components/Footer.tsx` - Copyright (1 instance)
3. `src/app/login/page.tsx` - Login text (1 instance)
4. `src/app/signup/page.tsx` - Signup text (1 instance)
5. `src/lib/pdf-reports.ts` - PDF headers/footers (2 instances)
6. `src/emails/WelcomeEmail.tsx` - Welcome email (3 instances)

---

### Phase 3: Deep Verification Scan

**Categories Checked (All ✅):**
1. Environment variables (`.env*` files)
2. Configuration files (`package.json`, `tsconfig.json`)
3. API routes (`src/app/api/**/route.ts` - 13 files)
4. Server actions (`src/app/actions/*.ts`)
5. Error messages (`throw new Error`)
6. Toast notifications (`toast.success/error`)
7. Console logs (`console.log/error`)
8. Validation messages (`src/lib/validators`)
9. Aria labels (`aria-label` attributes)
10. HTML files (`public/*.html`)
11. Supabase edge functions (`supabase/functions`)
12. Contexts/Providers (`src/contexts`)
13. Middleware (`middleware.ts`)
14. Hooks (`src/hooks`)
15. README/Documentation

**Additional Files Found:**
7. `src/app/status/page.tsx` - Status page (3 instances)
8. `src/app/dashboard/music-tracking/page.tsx` - Metadata (1 instance)
9. `src/app/onboarding/page.tsx` - Onboarding text (2 instances)
10. `src/lib/services/emailService.ts` - Email signatures (3 instances)
11. `src/server/routers/studio.ts` - Email subject (1 instance)
12. `src/server/routers/test.ts` - Test API (1 instance)
13. `src/app/dashboard/competitions/new/page.tsx` - Placeholder (1 instance)
14. `src/app/dashboard/admin/testing/page.tsx` - Test page (1 instance)
15. `src/components/NotificationCenter.tsx` - Notification text (1 instance)
16. `src/components/NotificationPreferences.tsx` - Preference text (1 instance)

**Total:** 16 files, 32 instances

---

### Phase 4: Database Verification (Supabase MCP)

**Query 1: Verify Both Tenants Exist**
```sql
SELECT
  id, slug, subdomain, name, branding, created_at
FROM tenants
WHERE slug IN ('empwr', 'glow')
ORDER BY slug;
```

**Results:**

**EMPWR Tenant:**
- ID: `00000000-0000-0000-0000-000000000001`
- Slug: `empwr`
- Subdomain: `empwr`
- Name: `EMPWR Dance Experience`
- Branding:
  ```json
  {
    "logo": null,
    "email": "empwrdance@gmail.com",
    "theme": "retro-neon-80s",
    "founder": "Emily Einsmann",
    "tagline": "You Are the Key",
    "website": "www.empwrexperience.com",
    "instagram": "@empwrdance",
    "accentColor": "#8B00FF",
    "primaryColor": "#FF1493",
    "secondaryColor": "#00FF00"
  }
  ```
- Created: Oct 10, 2025

**GLOW Tenant:**
- ID: `4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5`
- Slug: `glow`
- Subdomain: `glow`
- Name: `Glow Dance Competition`
- Branding:
  ```json
  {
    "logo": "https://static.wixstatic.com/media/6d8693_d9a1d69f9ec14e92b21bfa7f4f8318fc~mv2.jpg",
    "tagline": "An Exciting NEW Unique Competition Experience",
    "primaryColor": "#FF1493",
    "secondaryColor": "#FFD700"
  }
  ```
- Created: Oct 27, 2025

**Query 2: Check Production Data**
```sql
SELECT
  t.slug, t.name,
  COUNT(DISTINCT up.id) as user_count,
  COUNT(DISTINCT c.id) as competition_count,
  COUNT(DISTINCT s.id) as studio_count
FROM tenants t
LEFT JOIN user_profiles up ON up.tenant_id = t.id
LEFT JOIN competitions c ON c.tenant_id = t.id
LEFT JOIN studios s ON s.tenant_id = t.id
WHERE t.slug IN ('empwr', 'glow')
GROUP BY t.slug, t.name
ORDER BY t.slug;
```

**Results:**
| Tenant | Users | Competitions | Studios |
|--------|-------|--------------|---------|
| EMPWR  | 7     | 5            | 3       |
| GLOW   | 2     | 7            | 0       |

**Query 3: GLOW Competition Details**
```sql
SELECT id, name, competition_start_date, status
FROM competitions
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
ORDER BY created_at DESC
LIMIT 5;
```

**GLOW Competitions (Live Data):**
1. St. Catharines Summer 2026 2027 - May 14, 2026
2. Orlando 2026 - Feb 20, 2026
3. Blue Mountain Summer 2026 - Jun 4, 2026
4. Blue Mountain Spring 2026 - Apr 23, 2026
5. Toronto 2026 - May 8, 2026

**Conclusion:** ✅ GLOW tenant is PRODUCTION-READY with real competitions and users!

---

## 📊 Complete Findings Summary

### Issues Categorized by Priority

#### 🔴 P0 - CRITICAL (3 files, 13 instances)
**Must fix before GLOW launch**

1. **src/app/layout.tsx** (Lines 18-46)
   - Browser tab title
   - OpenGraph metadata (9 instances)
   - **Impact:** SEO, social sharing, bookmarks

2. **src/app/status/page.tsx** (Lines 143, 159, 187)
   - "EMPWR Status" heading
   - "EMPWR is running smoothly"
   - **Impact:** Public-facing status page

3. **src/app/dashboard/music-tracking/page.tsx** (Line 6)
   - Page metadata title
   - **Impact:** Browser tab title

---

#### 🟡 P1 - HIGH (8 files, 14 instances)
**User-facing text, very visible**

4. **src/components/Footer.tsx** (Line 19)
   - Copyright text
   - **Impact:** Every page footer

5. **src/app/login/page.tsx** (Line 55)
   - "Sign in to your EMPWR account"
   - **Impact:** Login page

6. **src/app/signup/page.tsx** (Line 182)
   - "Join EMPWR today"
   - **Impact:** Signup page
   - **Note:** Already has `useTenantTheme` hook, just not using it

7. **src/app/onboarding/page.tsx** (Lines 178, 375)
   - "Welcome to EMPWR!"
   - Consent text mentioning EMPWR
   - **Impact:** First-time user experience

8. **src/lib/pdf-reports.ts** (Lines 35, 66)
   - PDF header: "✨ EMPWR Dance Experience"
   - PDF footer: "EMPWR Dance Experience"
   - **Impact:** All generated PDFs (invoices, reports, score sheets)

9. **src/lib/services/emailService.ts** (Lines 59, 100, 145)
   - Email signatures: "Best regards,<br/>EMPWR Team"
   - **Impact:** ALL transactional emails

10. **src/emails/WelcomeEmail.tsx** (Lines 39, 44, 81)
    - "Welcome to EMPWR — Let's get you set up"
    - "We're excited to have you on EMPWR"
    - **Impact:** First email new users receive
    - **Note:** Template already supports `tenantBranding.tenantName` prop

11. **src/server/routers/studio.ts** (Line 382)
    - Subject: "Welcome to EMPWR - Studio Approved!"
    - **Impact:** Studio approval emails

---

#### 🟢 P2 - MEDIUM (5 files, 5 instances)
**Internal/admin features, lower visibility**

12. **src/server/routers/test.ts** (Line 18)
    - "EMPWR API Server is running"
    - **Impact:** Internal testing only

13. **src/app/dashboard/competitions/new/page.tsx** (Line 82)
    - Placeholder: "e.g., EMPWR Spring Showcase 2025"
    - **Impact:** Competition creation form

14. **src/app/dashboard/admin/testing/page.tsx** (Line 190)
    - "EMPWR competition dates"
    - **Impact:** Super Admin testing page

15. **src/components/NotificationCenter.tsx** (Line 117)
    - "Get notified even when EMPWR isn't open"
    - **Impact:** Notification settings

16. **src/components/NotificationPreferences.tsx** (Line 88)
    - "Show browser notifications even when EMPWR isn't open"
    - **Impact:** Preference descriptions

---

### ✅ Intentionally Excluded

**src/lib/empwrDefaults.ts** - Entire file
- Contains EMPWR-specific competition rules (age divisions, pricing, etc.)
- Used as template/defaults for EMPWR tenant only
- GLOW will have separate defaults or use generic system
- All admin settings pages have "Load EMPWR Defaults" buttons (intentional)

**Comments & Documentation**
- Example URLs in code comments (e.g., `empwr.compsync.net`)
- Not user-facing, safe to leave as documentation

---

## 🎯 How Tenant Resolution Works

### Current Implementation

**1. URL Request**
```
User visits: glow.compsync.net
             ↓
Next.js receives: headers.get('host') = 'glow.compsync.net'
```

**2. Subdomain Extraction**
```typescript
// src/lib/tenant-context.ts
function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];  // Remove port
  const parts = host.split('.');

  if (parts.length >= 3) return parts[0];  // 'glow'
  return null;
}
```

**3. Database Query**
```typescript
const tenant = await prisma.tenants.findFirst({
  where: { subdomain: 'glow' }
});

// Returns:
// {
//   id: "4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5",
//   name: "Glow Dance Competition",
//   branding: {...}
// }
```

**4. Availability**

**Server Components:**
```typescript
import { getTenantData } from '@/lib/tenant-context';

const tenant = await getTenantData();
const tenantName = tenant?.name;
```

**Client Components:**
```typescript
'use client';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

const { tenant } = useTenantTheme();
const tenantName = tenant?.name;
```

**tRPC Procedures:**
```typescript
myProcedure.query(async ({ ctx }) => {
  const tenantId = ctx.tenantId;  // Already available
  const tenantData = ctx.tenantData;
});
```

---

## 🔧 Implementation Patterns

### Pattern 1: Server Component with Metadata
```typescript
// src/app/layout.tsx
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantData();
  const tenantName = tenant?.name || 'Competition Portal';

  return {
    title: { default: tenantName, template: `%s | ${tenantName}` },
    // ... all metadata
  };
}
```

### Pattern 2: Client Component
```typescript
// src/app/login/page.tsx
'use client';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function LoginPage() {
  const { tenant } = useTenantTheme();
  return <p>Sign in to your {tenant?.name} account</p>;
}
```

### Pattern 3: Component with Context Already Available
```typescript
// src/components/Footer.tsx (already has hook!)
const { tenant } = useTenantTheme();
const tenantName = tenant?.name || 'Competition Portal';
// Just use the variable!
```

### Pattern 4: PDF Reports (Need Tenant Passed)
```typescript
// src/lib/pdf-reports.ts
function initPDF(
  title: string,
  tenantName: string = 'Competition Portal'  // ← Add param
): jsPDF {
  doc.text(`✨ ${tenantName}`, 15, 15);
}

// Caller must fetch and pass:
const tenant = await getTenantData();
const pdf = generateInvoicePDF({
  ...data,
  tenantName: tenant?.name
});
```

### Pattern 5: Email Templates (Already Support Branding)
```typescript
// src/emails/WelcomeEmail.tsx (prop already exists!)
interface WelcomeEmailProps {
  tenantBranding?: {
    tenantName?: string;  // ← Already supported
  };
}

// Just use it:
const tenantName = tenantBranding?.tenantName || 'CompSync';
<Text>Welcome to {tenantName}</Text>
```

---

## 🚀 Implementation Roadmap

### Phase 1: Critical Fixes (P0) - 3 hours

**1. Dynamic Metadata (layout.tsx)** - 45 min
- Convert static `metadata` export to `generateMetadata()` async function
- Fetch tenant data server-side
- Replace all 9 hardcoded "EMPWR" references

**2. Status Page (status/page.tsx)** - 30 min
- Add tenant context
- Replace 3 hardcoded references
- Test public status page

**3. Music Tracking Metadata (music-tracking/page.tsx)** - 15 min
- Update page metadata
- Test page title

**4. Testing** - 30 min
- Verify browser tab titles on both tenants
- Check OpenGraph tags (view source)
- Test social sharing preview

---

### Phase 2: High Priority Fixes (P1) - 5 hours

**5. Footer (Footer.tsx)** - 15 min
- One-line change (already has context)
- Test on every page

**6. Login Page (login/page.tsx)** - 30 min
- Add `useTenantTheme` hook
- Replace hardcoded text
- Test login flow

**7. Signup Page (signup/page.tsx)** - 15 min
- Use existing tenant hook
- One-line change
- Test signup flow

**8. Onboarding (onboarding/page.tsx)** - 30 min
- Add tenant context
- Replace 2 instances
- Test complete onboarding

**9. PDF Reports (pdf-reports.ts)** - 90 min
- Update `initPDF()` signature
- Update all PDF generation functions
- Update all callers
- Generate test PDFs from both tenants

**10. Email Signatures (emailService.ts)** - 30 min
- Add tenantName parameter to all methods
- Update all 3 signature locations
- Test email sending

**11. Welcome Email (WelcomeEmail.tsx)** - 30 min
- Use existing `tenantBranding.tenantName` prop
- Replace 3 instances
- Test welcome email

**12. Studio Approval Email (studio.ts)** - 15 min
- Use dynamic tenant name in subject
- Test approval flow

**13. Testing** - 45 min
- Send test emails from both tenants
- Generate test PDFs from both tenants
- Complete user flow testing

---

### Phase 3: Medium Priority Fixes (P2) - 1.5 hours

**14. Test API (test.ts)** - 10 min
- Generic message

**15. Competition Placeholder (competitions/new/page.tsx)** - 10 min
- Remove EMPWR from example

**16. Testing Page (admin/testing/page.tsx)** - 10 min
- Generic text

**17. Notification Text (2 files)** - 20 min
- NotificationCenter.tsx
- NotificationPreferences.tsx

**18. Final Testing** - 30 min
- Complete regression test
- Cross-tenant isolation verification

---

## 📋 Testing Strategy

### Local Testing (Development)

**Setup:**
```bash
# 1. Edit /etc/hosts
sudo nano /etc/hosts

# Add:
127.0.0.1 empwr.localhost
127.0.0.1 glow.localhost

# 2. Start dev server
npm run dev

# 3. Test both:
# http://empwr.localhost:3000
# http://glow.localhost:3000
```

**Verification:**
- [ ] Footer shows correct tenant
- [ ] Login page shows correct tenant
- [ ] Signup page shows correct tenant
- [ ] Browser tab title correct
- [ ] No console errors

---

### Production Testing (Vercel)

**Prerequisites:**
- [ ] DNS configured (empwr.compsync.net, glow.compsync.net)
- [ ] Vercel domains added
- [ ] SSL certificates valid
- [ ] Database has both tenants

**Testing Checklist:**

**EMPWR (empwr.compsync.net):**
- [ ] Browser tab: "EMPWR Dance Experience"
- [ ] Homepage: Shows EMPWR name and tagline
- [ ] Footer: "© 2025 EMPWR Dance Experience"
- [ ] Login: "Sign in to your EMPWR Dance Experience account"
- [ ] Signup: "Join EMPWR Dance Experience today"
- [ ] PDFs: Header "EMPWR Dance Experience"
- [ ] Emails: "EMPWR Team" signature

**GLOW (glow.compsync.net):**
- [ ] Browser tab: "Glow Dance Competition"
- [ ] Homepage: Shows GLOW name and tagline
- [ ] Footer: "© 2025 Glow Dance Competition"
- [ ] Login: "Sign in to your Glow Dance Competition account"
- [ ] Signup: "Join Glow Dance Competition today"
- [ ] PDFs: Header "Glow Dance Competition"
- [ ] Emails: "Glow Team" signature

**Cross-Tenant Isolation:**
- [ ] EMPWR user sees zero mentions of GLOW
- [ ] GLOW user sees zero mentions of EMPWR
- [ ] Switching subdomains switches all branding
- [ ] No leaked tenant data

---

## ⚙️ Vercel Environment Configuration

### Current Setup (Confirmed)

**Environment Variable:**
```
NEXT_PUBLIC_TENANT_ID = "00000000-0000-0000-0000-000000000001"
```

**Usage:** Fallback mechanism in `src/app/signup/page.tsx` (lines 43-44)

**Resolution Order:**
1. ✅ Subdomain from host header (empwr.compsync.net → 'empwr')
2. ✅ API endpoint (/api/tenant)
3. ⚠️ Environment variable (falls back to EMPWR)
4. ✅ Hostname inference

### Recommendation

**Option A: Remove Variable (Recommended)**
- Forces proper subdomain resolution
- No confusion
- True multi-tenant behavior

**Option B: Keep as Emergency Fallback**
- Only triggers if subdomain resolution completely fails
- Should never happen in production with proper DNS
- Acts as safety net

**Action Required:** Consider removing `NEXT_PUBLIC_TENANT_ID` from Vercel for cleaner multi-tenant support.

---

## 📝 Key Decisions Made

### 1. Database Schema
**Decision:** No changes needed to database
**Reason:** GLOW tenant already fully configured with branding and production data

### 2. Environment Variables
**Decision:** Document but don't remove `NEXT_PUBLIC_TENANT_ID` yet
**Reason:** Acts as fallback, subdomain resolution should always work first

### 3. Implementation Priority
**Decision:** P0 → P1 → P2 order
**Reason:** Most visible issues first, testing after each phase

### 4. Testing Approach
**Decision:** Local testing with /etc/hosts, then production
**Reason:** Safer to test locally before deploying to live subdomains

### 5. PDF Reports
**Decision:** Pass tenant name as parameter to all PDF functions
**Reason:** PDFs generated server-side, need explicit tenant context

### 6. Email Templates
**Decision:** Use existing `tenantBranding` prop structure
**Reason:** Already designed for multi-tenant, just not using tenant name

---

## 🎯 Success Criteria

### Implementation Complete When:
- [ ] All 32 hardcoded instances replaced with dynamic tenant
- [ ] Build passes with zero TypeScript errors
- [ ] All 26 testing checklist items pass
- [ ] Cross-tenant isolation verified
- [ ] PDFs generated with correct tenant branding
- [ ] Emails sent with correct tenant signatures
- [ ] No console errors on either subdomain

### Ready for Production When:
- [ ] Local testing complete
- [ ] Production testing complete
- [ ] GLOW user tested complete flow (signup → onboarding → dashboard)
- [ ] EMPWR user verified no GLOW leakage
- [ ] PDF generation tested on both tenants
- [ ] Email sending tested on both tenants
- [ ] Performance verified (no slowdowns from tenant queries)

---

## 📚 Documentation Created

1. **TENANT_BRANDING_AUDIT.md** - Initial audit (6 issues)
2. **TENANT_BRANDING_AUDIT_COMPLETE.md** - Deep scan (16 files, 32 instances)
3. **TENANT_BRANDING_FINAL_AUDIT.md** - Exhaustive final audit with all details
4. **TENANT_IMPLEMENTATION_GUIDE.md** - How-to guide with code patterns
5. **VERCEL_MULTI_TENANT_SETUP.md** - Environment variable and Vercel config
6. **SECOND_TENANT_SETUP.md** - This document (complete session)

---

## 🚀 Next Actions

### Immediate (Can Start Now)
1. **Quick Win: Footer Fix** - 5 minutes, 1-line change
2. **Quick Win: Signup Fix** - 10 minutes, already has hook
3. **Test Locally** - Verify multi-tenant working with /etc/hosts

### Short-Term (This Week)
4. **Complete P0 Fixes** - 3 hours, critical metadata
5. **Complete P1 Fixes** - 5 hours, user-facing text
6. **Production Testing** - Full tenant isolation verification

### Medium-Term (Next Week)
7. **Complete P2 Fixes** - 1.5 hours, polish
8. **Performance Testing** - Verify tenant queries optimized
9. **Documentation Update** - Update tenant onboarding guide

---

## 💡 Key Insights

### What Went Well
- ✅ Systematic audit process caught all instances
- ✅ Database verification confirmed production readiness
- ✅ Existing architecture supports multi-tenant (just needs activation)
- ✅ GLOW has real competitions and users waiting

### Challenges Identified
- ⚠️ PDF reports need significant refactoring (tenant context everywhere)
- ⚠️ Email signatures need parameter threading
- ⚠️ 9 metadata fields all hardcoded in layout
- ⚠️ Environment variable might cause confusion

### Architecture Strengths
- ✅ Tenant resolution already implemented
- ✅ TenantThemeProvider works perfectly
- ✅ Database schema supports multiple tenants
- ✅ Email templates already have branding props

### Recommendations
1. Start with easiest fixes to demonstrate working system
2. Test incrementally after each phase
3. Consider removing `NEXT_PUBLIC_TENANT_ID` for clarity
4. Add monitoring for tenant resolution failures
5. Document tenant onboarding process for future clients

---

## 📊 Effort Summary

| **Phase** | **Files** | **Instances** | **Est. Time** | **Priority** |
|-----------|-----------|--------------|--------------|-------------|
| P0 Critical | 3 | 13 | 3 hours | 🔴 Must Do |
| P1 High | 8 | 14 | 5 hours | 🟡 Should Do |
| P2 Medium | 5 | 5 | 1.5 hours | 🟢 Nice to Have |
| **TOTAL** | **16** | **32** | **9.5 hours** | - |

**Additional Time:**
- Testing: 2 hours
- Documentation: 1 hour
- Buffer: 1.5 hours
- **Grand Total: ~14 hours**

---

## 🎉 Current Status

**Audit:** ✅ 100% Complete
**Database:** ✅ Production Ready
**Implementation:** ⏳ Ready to Begin
**Testing Plan:** ✅ Documented
**Documentation:** ✅ Complete

**Confidence Level:** HIGH - All 32 instances identified and documented with clear implementation path.

---

**Session End:** January 29, 2025
**Next Session:** Implementation Phase
**Recommended Start:** Footer fix (5 minutes, immediate results)
