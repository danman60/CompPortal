# Complete Tenant Branding Audit Report (Deep Scan)

**Date:** January 29, 2025
**Auditor:** Claude (Session 23 - Deep Scan)
**Scope:** ALL hardcoded "EMPWR" branding across entire codebase

---

## Executive Summary

**Overall Status:** ⚠️ **60% COMPLETE - 16 FIXES NEEDED**

- **Ready:** 40% (4/10 original locations)
- **Needs Fix:** 60% (6 original + 10 newly discovered = **16 total issues**)
- **Risk Level:** HIGH - Critical user-facing text and official communications

---

## 🚨 CRITICAL FIXES (P0) - Must Fix Before GLOW Launch

### 1. Page Title & Metadata (src/app/layout.tsx)
**Lines:** 18-46 (9 instances)
**Priority:** 🔴 P0
**Impact:** Browser tabs, SEO, social media cards

**Hardcoded instances:**
- Line 18: `title.default: 'EMPWR Dance Experience'`
- Line 19: `title.template: '%s | EMPWR'`
- Line 23: `authors: [{ name: 'EMPWR Team' }]`
- Line 24: `creator: 'EMPWR'`
- Line 25: `publisher: 'EMPWR'`
- Line 31: `openGraph.title: 'EMPWR Dance Experience'`
- Line 33: `openGraph.siteName: 'EMPWR'`
- Line 39: `openGraph.images.alt: 'EMPWR Dance Experience'`
- Line 45: `twitter.title: 'EMPWR Dance Experience'`

**Fix:** Convert to `generateMetadata()` function with tenant data

---

### 2. Status Page Branding (src/app/status/page.tsx)
**Lines:** 143, 159, 187
**Priority:** 🔴 P0
**Impact:** Public-facing system status page

**Hardcoded instances:**
- Line 143: `<h1>EMPWR Status</h1>`
- Line 159: `<p>EMPWR is running smoothly</p>`
- Line 187: `description="Core Next.js application serving the EMPWR web interface"`

**Fix:** Use tenant context throughout status page

---

### 3. Music Tracking Page Title (src/app/dashboard/music-tracking/page.tsx)
**Line:** 6
**Priority:** 🔴 P0
**Impact:** Page metadata

**Hardcoded:** `title: 'Music Tracking - EMPWR'`

**Fix:** Use dynamic tenant name in metadata

---

## 🟡 HIGH PRIORITY FIXES (P1) - User-Facing Text

### 4. Footer Copyright (src/components/Footer.tsx)
**Line:** 19
**Priority:** 🟡 P1
**Impact:** Visible on every page

**Hardcoded:** `"EMPWR Dance Experience"` in copyright text

**Status:** Has tenant context but doesn't use it

**Fix:**
```typescript
// Line 19 - AFTER:
<span className="font-semibold text-white">{tenantName}</span>
```

---

### 5. Login Page (src/app/login/page.tsx)
**Line:** 55
**Priority:** 🟡 P1
**Impact:** First impression

**Hardcoded:** `"Sign in to your EMPWR account"`

**Fix:** Add tenant context, use dynamic text

---

### 6. Signup Page (src/app/signup/page.tsx)
**Line:** 182
**Priority:** 🟡 P1
**Impact:** Onboarding flow

**Hardcoded:** `"Join EMPWR today"`

**Status:** Already has `useTenantTheme` hook but doesn't use tenant name

**Fix:** `"Join {tenant?.name || 'us'} today"`

---

### 7. Onboarding Page (src/app/onboarding/page.tsx)
**Lines:** 178, 375
**Priority:** 🟡 P1
**Impact:** First-time user experience

**Hardcoded instances:**
- Line 178: `"Welcome to EMPWR!"`
- Line 375: `"sharing legal information... with the EMPWR platform"`

**Fix:** Add tenant context, replace both instances

---

### 8. PDF Reports (src/lib/pdf-reports.ts)
**Lines:** 35, 66
**Priority:** 🟡 P1
**Impact:** Official competition documents

**Hardcoded instances:**
- Line 35: `doc.text('✨ EMPWR Dance Experience', 15, 15);` (header)
- Line 66: `doc.text('EMPWR Dance Experience', 15, pageHeight - 10);` (footer)

**Fix:** Add `tenantName` parameter to `initPDF()` and all callers

---

### 9. Email Service Signatures (src/lib/services/emailService.ts)
**Lines:** 59, 100, 145
**Priority:** 🟡 P1
**Impact:** Email signatures

**Hardcoded:** `"Best regards,<br/>EMPWR Team"`

**Fix:** Use tenant name: `"${tenantName} Team"`

---

### 10. Welcome Email Template (src/emails/WelcomeEmail.tsx)
**Lines:** 39, 44, 81
**Priority:** 🟡 P1
**Impact:** First email new users receive

**Hardcoded instances:**
- Line 39: `<Preview>Welcome to EMPWR — Let's get you set up</Preview>`
- Line 44: `We're excited to have you on EMPWR.`
- Line 81: `We're here to help you make the most of EMPWR.`

**Fix:** Use `tenantBranding.tenantName` prop (already supported in interface)

---

### 11. Studio Approval Email Subject (src/server/routers/studio.ts)
**Line:** 382
**Priority:** 🟡 P1
**Impact:** Studio approval notification

**Hardcoded:** `subject: 'Welcome to EMPWR - Studio Approved!'`

**Fix:** Use `getEmailSubject()` helper or dynamic tenant name

---

## 🟢 MEDIUM PRIORITY FIXES (P2) - Admin/Internal Features

### 12. Test API Response (src/server/routers/test.ts)
**Line:** 18
**Priority:** 🟢 P2
**Impact:** Internal testing only

**Hardcoded:** `message: 'EMPWR API Server is running'`

**Fix:** Generic message: `'API Server is running'`

---

### 13. Competition Name Placeholder (src/app/dashboard/competitions/new/page.tsx)
**Line:** 82
**Priority:** 🟢 P2
**Impact:** Placeholder text in form

**Hardcoded:** `placeholder="e.g., EMPWR Spring Showcase 2025"`

**Fix:** Use tenant-agnostic example: `"e.g., Spring Showcase 2025"`

---

### 14. Testing Page Text (src/app/dashboard/admin/testing/page.tsx)
**Line:** 190
**Priority:** 🟢 P2
**Impact:** Super Admin testing page only

**Hardcoded:** `<li>EMPWR competition dates</li>`

**Fix:** Generic text: `"Competition dates"`

---

### 15. Notification Settings Text (src/components/NotificationCenter.tsx)
**Line:** 117
**Priority:** 🟢 P2
**Impact:** User preferences

**Hardcoded:** `"Get notified even when EMPWR isn't open"`

**Fix:** Use tenant name or generic: `"even when the app isn't open"`

---

### 16. Notification Preferences (src/components/NotificationPreferences.tsx)
**Line:** 88
**Priority:** 🟢 P2
**Impact:** Settings description

**Hardcoded:** `"Show browser notifications even when EMPWR isn't open"`

**Fix:** Generic text: `"even when the app isn't open"`

---

## ✅ SAFE/INTENTIONAL (No Changes Needed)

### Configuration Files (Keep As-Is)
- **src/lib/empwrDefaults.ts** - Tenant-specific defaults file (intentional)
  - Contains EMPWR competition rules, pricing, age divisions
  - Used as fallback/template for EMPWR tenant only
  - GLOW will have separate glowDefaults.ts or use generic defaults

### Tenant Settings Admin Buttons (Keep As-Is)
- **src/app/dashboard/settings/tenant/components/*.tsx**
  - "Load EMPWR Defaults" buttons (lines vary)
  - **Justification:** Button allows CD to load EMPWR-style defaults as starting point
  - **Note:** Could make dynamic ("Load {tenantSlug} Defaults") but low priority

### Comments (Ignore)
- **src/components/SupportChatButton.tsx:6** - Comment only
- **src/lib/analytics.ts:2** - Comment only

### Database Seeds (Ignore)
- **prisma/seed.ts** - Test data for EMPWR tenant
- **prisma/migrations/**.sql - Historical migration data

---

## Implementation Roadmap (Updated)

### Phase 1: Critical (P0) - 3 hours
1. **Dynamic Metadata (layout.tsx)** - 45 min
2. **Status Page (status/page.tsx)** - 30 min
3. **Music Tracking Metadata (music-tracking/page.tsx)** - 15 min
4. **Test all metadata changes** - 30 min

### Phase 2: High Priority (P1) - 5 hours
5. **Footer (Footer.tsx)** - 15 min
6. **Login Page (login/page.tsx)** - 30 min
7. **Signup Page (signup/page.tsx)** - 15 min
8. **Onboarding Page (onboarding/page.tsx)** - 30 min
9. **PDF Reports (pdf-reports.ts)** - 90 min
10. **Email Service (emailService.ts)** - 30 min
11. **Welcome Email (WelcomeEmail.tsx)** - 30 min
12. **Studio Approval Email (studio.ts)** - 15 min
13. **Test all user-facing changes** - 45 min

### Phase 3: Medium Priority (P2) - 1.5 hours
14. **Test API (test.ts)** - 10 min
15. **Competition Placeholder (competitions/new/page.tsx)** - 10 min
16. **Testing Page (admin/testing/page.tsx)** - 10 min
17. **Notification Text (NotificationCenter + Preferences)** - 20 min
18. **Final comprehensive test** - 30 min

---

## Total Effort Estimate

| **Phase** | **Issues** | **Est. Time** |
|----------|-----------|--------------|
| P0 Critical | 3 | 3 hours |
| P1 High | 8 | 5 hours |
| P2 Medium | 5 | 1.5 hours |
| **TOTAL** | **16** | **9.5 hours** |

---

## Testing Checklist (Updated)

### EMPWR Tenant (empwr.compsync.net)
- [ ] Browser tab: "EMPWR Dance Experience"
- [ ] Status page: "EMPWR Status" / "EMPWR is running smoothly"
- [ ] Footer: "© 2025 EMPWR Dance Experience"
- [ ] Login: "Sign in to your EMPWR Dance Experience account"
- [ ] Signup: "Join EMPWR Dance Experience today"
- [ ] Onboarding: "Welcome to EMPWR!"
- [ ] PDF header: "✨ EMPWR Dance Experience"
- [ ] Email signatures: "EMPWR Team"
- [ ] Welcome email: "Welcome to EMPWR"
- [ ] Studio approval subject: "Welcome to EMPWR - Studio Approved!"

### GLOW Tenant (glow.compsync.net)
- [ ] Browser tab: "Glow Dance Competition"
- [ ] Status page: "Glow Status" / "Glow is running smoothly"
- [ ] Footer: "© 2025 Glow Dance Competition"
- [ ] Login: "Sign in to your Glow Dance Competition account"
- [ ] Signup: "Join Glow Dance Competition today"
- [ ] Onboarding: "Welcome to Glow!"
- [ ] PDF header: "✨ Glow Dance Competition"
- [ ] Email signatures: "Glow Team"
- [ ] Welcome email: "Welcome to Glow"
- [ ] Studio approval subject: "Welcome to Glow - Studio Approved!"

### Generic/Neutral Text
- [ ] Test API: "API Server is running" (no tenant name)
- [ ] Competition placeholder: "e.g., Spring Showcase 2025"
- [ ] Notifications: "when the app isn't open"

---

## Risk Assessment (Updated)

### Critical Risks (P0)
- **Browser tabs showing "EMPWR"** for all tenants = brand confusion
- **Status page** = public-facing, shows wrong competition
- **Page metadata** = affects SEO, social sharing, bookmarks

### High Risks (P1)
- **PDFs with EMPWR branding** = legal/contractual issues with GLOW
- **Emails saying "EMPWR Team"** = unprofessional for GLOW tenant
- **Onboarding says "Welcome to EMPWR"** = immediate bad impression

### Medium Risks (P2)
- **Internal admin tools** referencing EMPWR = minor confusion
- **Notification text** = low visibility but inconsistent

---

## Files Requiring Changes (Complete List)

| **File** | **Lines** | **Instances** | **Priority** |
|---------|----------|--------------|-------------|
| src/app/layout.tsx | 18-46 | 9 | P0 |
| src/app/status/page.tsx | 143, 159, 187 | 3 | P0 |
| src/app/dashboard/music-tracking/page.tsx | 6 | 1 | P0 |
| src/components/Footer.tsx | 19 | 1 | P1 |
| src/app/login/page.tsx | 55 | 1 | P1 |
| src/app/signup/page.tsx | 182 | 1 | P1 |
| src/app/onboarding/page.tsx | 178, 375 | 2 | P1 |
| src/lib/pdf-reports.ts | 35, 66 | 2 | P1 |
| src/lib/services/emailService.ts | 59, 100, 145 | 3 | P1 |
| src/emails/WelcomeEmail.tsx | 39, 44, 81 | 3 | P1 |
| src/server/routers/studio.ts | 382 | 1 | P1 |
| src/server/routers/test.ts | 18 | 1 | P2 |
| src/app/dashboard/competitions/new/page.tsx | 82 | 1 | P2 |
| src/app/dashboard/admin/testing/page.tsx | 190 | 1 | P2 |
| src/components/NotificationCenter.tsx | 117 | 1 | P2 |
| src/components/NotificationPreferences.tsx | 88 | 1 | P2 |

**Total:** 16 files, 32 instances of hardcoded "EMPWR"

---

## Database Requirements

### GLOW Tenant Data Needed
```sql
-- Ensure GLOW tenant exists with complete branding
UPDATE tenants
SET
  name = 'Glow Dance Competition',  -- Required for all text replacements
  branding = jsonb_set(
    branding::jsonb,
    '{tagline}',
    '"[GLOW TAGLINE]"'  -- Homepage tagline
  )
WHERE slug = 'glow';

-- Verify both tenants
SELECT
  slug,
  subdomain,
  name,
  branding->>'tagline' as tagline,
  branding->>'primaryColor' as primary_color
FROM tenants
WHERE slug IN ('empwr', 'glow');
```

---

## Recommendations

### Immediate (Before GLOW Launch)
1. Complete all P0 fixes (3 hours)
2. Complete all P1 fixes (5 hours)
3. Get GLOW branding specs from client
4. Test all flows on both subdomains
5. Generate test PDFs from both tenants
6. Send test emails from both tenants

### Short-Term (Post-Launch)
7. Complete P2 fixes (1.5 hours)
8. Create branding admin panel for CDs
9. Document tenant branding architecture

### Long-Term Improvements
- Support logo upload per tenant
- Dynamic favicons per tenant
- Custom color schemes (>2 colors)
- Tenant-specific CSS overrides
- Per-tenant analytics tracking

---

## Comparison with User's List

| **Your Item** | **Our Audit Status** | **Notes** |
|--------------|---------------------|-----------|
| Email notifications | ✅ Templates ready | But signatures need fix (emailService.ts:59,100,145) |
| Confirmation emails | ⚠️ Mostly ready | WelcomeEmail.tsx needs fix (3 instances) |
| PDF prints | ❌ Hardcoded | pdf-reports.ts:35,66 |
| Chrome title tab | ❌ Hardcoded | layout.tsx:18-46 (9 instances) |
| Login elements | ❌ Hardcoded | login/page.tsx:55 |
| Footer | ❌ Hardcoded | Footer.tsx:19 |

**Additional locations found:** 10 more files not on original list

---

## Next Steps

1. **Get GLOW Branding Details:**
   - Official competition name
   - Tagline
   - Primary color (hex)
   - Secondary color (hex)
   - Logo (if available)

2. **Prioritized Implementation:**
   - Start with P0 (3 hours) - most visible
   - Then P1 (5 hours) - user-facing
   - Finally P2 (1.5 hours) - polish

3. **Testing Strategy:**
   - Create test checklist per tenant
   - Screenshot comparison
   - PDF generation test
   - Email sending test
   - Cross-browser testing

4. **Documentation:**
   - Update tenant setup guide
   - Document branding architecture
   - Create troubleshooting guide

---

**Report Generated:** January 29, 2025 (Deep Scan)
**Session:** 23 (Complete Audit)
**Build:** 9ec09ae
**Total Issues Found:** 32 instances across 16 files
**Estimated Fix Time:** 9.5 hours
