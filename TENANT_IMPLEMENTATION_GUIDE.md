# Tenant Implementation & Testing Guide

**Purpose:** Complete guide to implement GLOW tenant branding and test multi-tenant isolation

---

## 🔄 How Tenant ID Flow Works

### 1. Subdomain Resolution Flow

```
User visits URL
    ↓
glow.compsync.net  or  empwr.compsync.net
    ↓
Next.js receives request with headers
    ↓
getTenantData() extracts subdomain from "host" header
    ↓
Prisma queries: SELECT * FROM tenants WHERE subdomain = 'glow'
    ↓
Returns TenantData object:
{
  id: "4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5",
  slug: "glow",
  subdomain: "glow",
  name: "Glow Dance Competition",
  branding: {
    primaryColor: "#ff6b9d",
    secondaryColor: "#ffd700",
    tagline: "Shine Bright on Stage",
    logo: null
  }
}
    ↓
Available in components via useTenantTheme() hook
```

---

## 📍 Where Tenant Data is Available

### Server Components (Next.js App Router)
```typescript
import { getTenantData } from '@/lib/tenant-context';

export default async function MyServerComponent() {
  const tenant = await getTenantData();
  const tenantName = tenant?.name || 'Competition Portal';

  return <h1>Welcome to {tenantName}</h1>;
}
```

### Client Components
```typescript
'use client';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function MyClientComponent() {
  const { tenant, primaryColor, secondaryColor } = useTenantTheme();
  const tenantName = tenant?.name || 'Competition Portal';

  return <h1>Welcome to {tenantName}</h1>;
}
```

### API Routes
```typescript
import { getTenantData } from '@/lib/tenant-context';

export async function GET() {
  const tenant = await getTenantData();

  return Response.json({
    message: `${tenant?.name} API is running`
  });
}
```

### tRPC Procedures
```typescript
// Tenant data is already in context
myProcedure.query(async ({ ctx }) => {
  const tenantId = ctx.tenantId;  // Already available!
  const tenantData = ctx.tenantData;  // Full tenant object

  // Use in queries
  const data = await ctx.prisma.competitions.findMany({
    where: { tenant_id: tenantId }
  });
});
```

### Server Actions
```typescript
'use server';
import { getTenantData } from '@/lib/tenant-context';

export async function myAction() {
  const tenant = await getTenantData();
  // Use tenant data
}
```

---

## 🎯 Implementation Patterns by File Type

### Pattern 1: Server Component with Metadata
**Example:** `src/app/layout.tsx`

```typescript
import { getTenantData } from '@/lib/tenant-context';
import type { Metadata } from 'next';

// ✅ CORRECT - Dynamic metadata
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantData();
  const tenantName = tenant?.name || 'Competition Portal';

  return {
    title: {
      default: tenantName,
      template: `%s | ${tenantName}`,
    },
    description: `Modern dance competition management platform`,
    openGraph: {
      title: tenantName,
      siteName: tenantName,
    },
    // ... all metadata fields
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenantData = await getTenantData();

  return (
    <html lang="en">
      <body>
        <TenantThemeProvider initialTenant={tenantData}>
          {children}
        </TenantThemeProvider>
      </body>
    </html>
  );
}
```

---

### Pattern 2: Client Component
**Example:** `src/app/login/page.tsx`

```typescript
'use client';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function LoginPage() {
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'Competition Portal';

  return (
    <main>
      <h1>Welcome Back</h1>
      <p>Sign in to your {tenantName} account</p>
    </main>
  );
}
```

---

### Pattern 3: Component with Tenant Context Already Available
**Example:** `src/components/Footer.tsx`

```typescript
'use client';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function Footer() {
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'Competition Portal';  // ← Already has hook!

  return (
    <footer>
      <p>© 2025 {tenantName} · Powered by CompSync</p>
      {/*      ^^^^^^^^^^^^^ Just use the variable! */}
    </footer>
  );
}
```

---

### Pattern 4: PDF Reports (Need Tenant Passed In)
**Example:** `src/lib/pdf-reports.ts`

```typescript
// Update function signature to accept tenant name
function initPDF(
  title: string,
  tenantName: string = 'Competition Portal',  // ← Add parameter
  orientation: 'portrait' | 'landscape' = 'portrait'
): jsPDF {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'letter' });

  // Use tenant name
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary);
  doc.text(`✨ ${tenantName}`, 15, 15);  // ← Dynamic

  return doc;
}

// Update all callers
export function generateEntryScoreSheet(data: {...}) {
  const doc = initPDF(
    `Entry Score Sheet - #${data.entry.entry_number}`,
    data.tenantName  // ← Pass from caller
  );
  // ...
}
```

**Caller needs to fetch tenant:**
```typescript
// In tRPC router or API route
const tenant = await getTenantData();
const pdf = generateEntryScoreSheet({
  ...data,
  tenantName: tenant?.name || 'Competition Portal'
});
```

---

### Pattern 5: Email Templates
**Example:** `src/emails/WelcomeEmail.tsx`

```typescript
interface WelcomeEmailProps {
  name: string;
  email: string;
  tenantBranding?: {
    tenantName?: string;  // ← Already supported!
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function WelcomeEmail({ name, email, tenantBranding }: WelcomeEmailProps) {
  const tenantName = tenantBranding?.tenantName || 'CompSync';

  return (
    <Html>
      <Preview>Welcome to {tenantName} — Let's get you set up</Preview>
      <Body>
        <Text>We're excited to have you on {tenantName}.</Text>
      </Body>
    </Html>
  );
}
```

**Caller must pass tenant branding:**
```typescript
// In email router
const tenant = await getTenantData();
const html = await render(
  <WelcomeEmail
    name={user.name}
    email={user.email}
    tenantBranding={{
      tenantName: tenant?.name,
      primaryColor: tenant?.branding?.primaryColor,
      secondaryColor: tenant?.branding?.secondaryColor,
    }}
  />
);
```

---

## 🚀 Step-by-Step Implementation

### Step 1: Set Up GLOW Tenant in Database

```sql
-- Connect to your Supabase database
-- Via Supabase Studio SQL Editor or psql

-- 1. Verify GLOW tenant exists
SELECT id, slug, subdomain, name, branding
FROM tenants
WHERE slug = 'glow';

-- Expected result:
-- id: 4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5
-- slug: glow
-- subdomain: glow
-- name: (may be empty or placeholder)
-- branding: {} or null

-- 2. Update GLOW tenant with proper branding
UPDATE tenants
SET
  name = 'Glow Dance Competition',
  branding = jsonb_build_object(
    'tagline', 'Shine Bright on Stage',
    'primaryColor', '#ff6b9d',
    'secondaryColor', '#ffd700',
    'logo', null
  )
WHERE slug = 'glow';

-- 3. Verify both tenants
SELECT
  slug,
  subdomain,
  name,
  branding->>'tagline' as tagline,
  branding->>'primaryColor' as primary_color,
  branding->>'secondaryColor' as secondary_color
FROM tenants
WHERE slug IN ('empwr', 'glow')
ORDER BY slug;

-- Expected output:
-- empwr | empwr | EMPWR Dance Experience | You Are the Key | #8b5cf6 | #ec4899
-- glow  | glow  | Glow Dance Competition | Shine Bright on Stage | #ff6b9d | #ffd700
```

---

### Step 2: Test Tenant Resolution Locally

**Option A: Edit /etc/hosts (Recommended)**

```bash
# Windows: C:\Windows\System32\drivers\etc\hosts
# Mac/Linux: /etc/hosts

# Add these lines:
127.0.0.1 empwr.localhost
127.0.0.1 glow.localhost
```

Then access:
- EMPWR: `http://empwr.localhost:3000`
- GLOW: `http://glow.localhost:3000`

**Option B: Use ngrok (For Production Subdomains)**

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Tunnel with ngrok
ngrok http 3000

# Result: https://abc123.ngrok.io
```

Then configure DNS:
- Create CNAME for `empwr.compsync.net` → `abc123.ngrok.io`
- Create CNAME for `glow.compsync.net` → `abc123.ngrok.io`

---

### Step 3: Implement Fixes (Priority Order)

#### Fix 1: Footer (Easiest - 5 minutes)

**File:** `src/components/Footer.tsx`

```typescript
// Line 19 - BEFORE:
© {currentYear} <span className="font-semibold text-white">EMPWR Dance Experience</span>

// Line 19 - AFTER:
© {currentYear} <span className="font-semibold text-white">{tenantName}</span>
```

**Test:**
1. Visit `http://empwr.localhost:3000`
2. Scroll to footer → Should say "© 2025 EMPWR Dance Experience"
3. Visit `http://glow.localhost:3000`
4. Scroll to footer → Should say "© 2025 Glow Dance Competition"

---

#### Fix 2: Signup Page (Easy - 10 minutes)

**File:** `src/app/signup/page.tsx`

```typescript
// Line 182 - BEFORE:
<p className="text-gray-300 text-sm">Join EMPWR today</p>

// Line 182 - AFTER:
<p className="text-gray-300 text-sm">Join {tenant?.name || 'us'} today</p>
```

**Test:**
1. Visit `http://empwr.localhost:3000/signup`
2. Should say "Join EMPWR Dance Experience today"
3. Visit `http://glow.localhost:3000/signup`
4. Should say "Join Glow Dance Competition today"

---

#### Fix 3: Login Page (Medium - 15 minutes)

**File:** `src/app/login/page.tsx`

```typescript
// Add at top:
'use client';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function LoginPage() {
  // Add hook:
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'your';

  // ... existing code

  // Line 54-55 - Update:
  return (
    // ...
    <p className="text-gray-300 text-center mb-8">
      Sign in to your {tenantName} account
    </p>
  );
}
```

**Test:**
1. Visit `http://empwr.localhost:3000/login`
2. Should say "Sign in to your EMPWR Dance Experience account"
3. Visit `http://glow.localhost:3000/login`
4. Should say "Sign in to your Glow Dance Competition account"

---

#### Fix 4: Page Metadata (Complex - 30 minutes)

**File:** `src/app/layout.tsx`

```typescript
import { getTenantData } from '@/lib/tenant-context';
import type { Metadata } from 'next';

// Replace existing metadata export with this function:
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantData();
  const tenantName = tenant?.name || 'Competition Portal';
  const description = 'Modern dance competition management platform for studios, directors, and judges. Streamline registrations, scheduling, scoring, and results.';

  return {
    title: {
      default: tenantName,
      template: `%s | ${tenantName}`,
    },
    description,
    keywords: ['dance competition', 'competition management', 'dance studio', 'competition software', 'dance registration', 'scoring system'],
    authors: [{ name: `${tenantName} Team` }],
    creator: tenantName,
    publisher: tenantName,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://comp-portal-one.vercel.app'),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      title: tenantName,
      description,
      siteName: tenantName,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: tenantName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: tenantName,
      description,
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    manifest: '/manifest.json',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch tenant for initial SSR
  const tenantData = await getTenantData();

  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <ErrorBoundary>
          <TenantThemeProvider initialTenant={tenantData}>
            <TRPCProvider>
              <ToastProvider />
              <div className="flex-1">{children}</div>
              <Footer />
            </TRPCProvider>
          </TenantThemeProvider>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Test:**
1. Visit `http://empwr.localhost:3000`
2. Check browser tab → Should say "EMPWR Dance Experience"
3. Visit `http://glow.localhost:3000`
4. Check browser tab → Should say "Glow Dance Competition"
5. View page source → Check `<title>` and `<meta>` tags

---

## 🧪 Testing Workflow

### Phase 1: Local Testing (localhost subdomains)

**Setup:**
```bash
# 1. Add to /etc/hosts
127.0.0.1 empwr.localhost
127.0.0.1 glow.localhost

# 2. Start dev server
cd D:\ClaudeCode\CompPortal
npm run dev

# 3. Test both subdomains
# Open browser tabs:
# - http://empwr.localhost:3000
# - http://glow.localhost:3000
```

**Verification Checklist:**
- [ ] EMPWR shows "EMPWR Dance Experience" everywhere
- [ ] GLOW shows "Glow Dance Competition" everywhere
- [ ] Footer updates per tenant
- [ ] Login page updates per tenant
- [ ] Signup page updates per tenant
- [ ] Browser tab title changes per tenant

---

### Phase 2: Production Testing (actual subdomains)

**Prerequisites:**
1. DNS records configured:
   - `empwr.compsync.net` CNAME → Vercel
   - `glow.compsync.net` CNAME → Vercel
2. Vercel domains added in project settings
3. Database has both tenants with branding

**Testing Steps:**

```bash
# 1. Deploy to production
git add .
git commit -m "feat: Add dynamic tenant branding for GLOW

- Convert layout.tsx to generateMetadata()
- Add tenant context to login/signup pages
- Update footer to use tenant name

Tested on both EMPWR and GLOW subdomains.

🤖 Claude Code"

git push origin main

# 2. Wait for Vercel deployment (~2 minutes)

# 3. Test on production
```

**Via Playwright MCP:**
```typescript
// Test EMPWR
await page.goto('https://empwr.compsync.net');
await page.waitForLoadState('networkidle');
const empwrTitle = await page.title();
// Expect: "EMPWR Dance Experience"

// Test GLOW
await page.goto('https://glow.compsync.net');
await page.waitForLoadState('networkidle');
const glowTitle = await page.title();
// Expect: "Glow Dance Competition"

// Screenshot comparison
await page.goto('https://empwr.compsync.net');
await page.screenshot({ path: 'empwr-homepage.png' });

await page.goto('https://glow.compsync.net');
await page.screenshot({ path: 'glow-homepage.png' });
```

---

### Phase 3: Cross-Tenant Isolation Testing

**Test 1: Login as Studio Director on EMPWR**
```
1. Visit https://empwr.compsync.net/login
2. Login with danieljohnabrahamson@gmail.com / 123456
3. Check dashboard → Should see EMPWR branding only
4. Create a test entry
5. Generate PDF → Should have "EMPWR Dance Experience" header
```

**Test 2: Login as Studio Director on GLOW**
```
1. Visit https://glow.compsync.net/signup
2. Create new account: glowtester@test.com / password
3. Complete onboarding → Should say "Welcome to Glow!"
4. Check dashboard → Should see GLOW branding only
5. NO mention of EMPWR anywhere
```

**Test 3: Email Verification**
```
1. Trigger email from EMPWR (reservation approval, etc.)
2. Check email → Should say "EMPWR Team"
3. Trigger email from GLOW
4. Check email → Should say "Glow Team"
```

**Test 4: PDF Generation**
```
1. Generate invoice PDF on EMPWR
2. Check header → "✨ EMPWR Dance Experience"
3. Check footer → "EMPWR Dance Experience"
4. Generate invoice PDF on GLOW
5. Check header → "✨ Glow Dance Competition"
6. Check footer → "Glow Dance Competition"
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Tenant is null in client components
**Symptom:** `tenant?.name` returns undefined

**Solution:**
```typescript
// Check if TenantThemeProvider is in layout
// Should be wrapping all client components

// In layout.tsx:
<TenantThemeProvider initialTenant={tenantData}>
  {children}
</TenantThemeProvider>
```

---

### Issue 2: Wrong tenant on localhost
**Symptom:** Always shows EMPWR even on glow.localhost

**Solution:**
```bash
# 1. Clear browser cache (Ctrl+Shift+Delete)
# 2. Hard refresh (Ctrl+Shift+R)
# 3. Check /etc/hosts file has correct entries
# 4. Restart dev server
```

---

### Issue 3: Metadata not updating
**Symptom:** Browser tab still shows "EMPWR" for GLOW

**Solution:**
```bash
# 1. Ensure generateMetadata() is async function
# 2. Check it's calling await getTenantData()
# 3. Hard refresh browser (Ctrl+Shift+R)
# 4. Check in incognito mode
```

---

### Issue 4: PDF has wrong branding
**Symptom:** GLOW PDFs show EMPWR header

**Solution:**
```typescript
// Ensure caller passes tenant name:
const tenant = await getTenantData();
const pdf = generateInvoicePDF({
  ...data,
  tenantName: tenant?.name || 'Competition Portal'  // ← Must pass
});
```

---

## 📋 Complete Testing Checklist

### Before Deploying to Production

- [ ] Database has GLOW tenant with complete branding
- [ ] All 16 files updated with dynamic tenant logic
- [ ] Local testing on empwr.localhost works
- [ ] Local testing on glow.localhost works
- [ ] No console errors on either subdomain
- [ ] Build passes: `npm run build`
- [ ] Type check passes: `npm run type-check`

### After Deploying to Production

**EMPWR Subdomain:**
- [ ] Browser tab: "EMPWR Dance Experience"
- [ ] Homepage: Shows "EMPWR Dance Experience" and "You Are the Key"
- [ ] Footer: "© 2025 EMPWR Dance Experience"
- [ ] Login: "Sign in to your EMPWR Dance Experience account"
- [ ] Signup: "Join EMPWR Dance Experience today"
- [ ] Dashboard: No mention of GLOW
- [ ] Emails: Signed "EMPWR Team"
- [ ] PDFs: Header and footer say "EMPWR Dance Experience"

**GLOW Subdomain:**
- [ ] Browser tab: "Glow Dance Competition"
- [ ] Homepage: Shows "Glow Dance Competition" and "Shine Bright on Stage"
- [ ] Footer: "© 2025 Glow Dance Competition"
- [ ] Login: "Sign in to your Glow Dance Competition account"
- [ ] Signup: "Join Glow Dance Competition today"
- [ ] Dashboard: No mention of EMPWR
- [ ] Emails: Signed "Glow Team"
- [ ] PDFs: Header and footer say "Glow Dance Competition"

**Cross-Tenant Isolation:**
- [ ] EMPWR user cannot see GLOW data
- [ ] GLOW user cannot see EMPWR data
- [ ] Switching subdomains switches branding completely
- [ ] No leaked references to other tenant

---

## 🚀 Quick Start Commands

```bash
# 1. Update GLOW tenant in database
# Run SQL from Step 1 above in Supabase SQL Editor

# 2. Set up local testing
echo "127.0.0.1 empwr.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 glow.localhost" | sudo tee -a /etc/hosts

# 3. Start dev server
cd D:\ClaudeCode\CompPortal
npm run dev

# 4. Test both tenants
open http://empwr.localhost:3000
open http://glow.localhost:3000

# 5. After making changes
npm run build  # Verify build passes
git add .
git commit -m "feat: Add tenant-aware branding"
git push origin main

# 6. Test on production
# Visit https://empwr.compsync.net
# Visit https://glow.compsync.net
```

---

## 📝 Summary

**Tenant ID flows through:**
1. Subdomain in URL → `getTenantData()` → Database query → TenantData object
2. Available everywhere:
   - Server: `await getTenantData()`
   - Client: `useTenantTheme()` hook
   - tRPC: `ctx.tenantData`

**To implement:**
1. Set up GLOW tenant in database (SQL above)
2. Update 16 files to use dynamic tenant
3. Test locally with subdomain hosts
4. Deploy and test on production
5. Verify complete isolation

**Testing priority:**
1. Start with easy fixes (Footer, Signup)
2. Then medium (Login, Onboarding)
3. Finally complex (Metadata, PDFs, Emails)
4. Full isolation test at end

Ready to start? I recommend beginning with the Footer fix - it's a 1-line change with immediate visible results!
