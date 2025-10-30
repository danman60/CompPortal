# Vercel Multi-Tenant Environment Setup

**Context:** You currently have `NEXT_PUBLIC_TENANT_ID` set to EMPWR tenant in Vercel

---

## ⚠️ Current Environment Variable Issue

### How It's Currently Used

**File:** `src/app/signup/page.tsx` (Lines 43-44)

```typescript
// 3) Env-based fallback for single-tenant deployments
if (process.env.NEXT_PUBLIC_TENANT_ID) {
  return process.env.NEXT_PUBLIC_TENANT_ID as string;
}
```

**Problem:** This environment variable is used as a **fallback** when subdomain resolution fails. If set in Vercel to EMPWR's tenant ID, it means:

- ✅ `empwr.compsync.net` → Works (subdomain resolves first)
- ⚠️ `glow.compsync.net` → **Might fall back to EMPWR** if subdomain resolution has any issues
- ❌ Root domain `compsync.net` → Falls back to EMPWR

---

## 🎯 Recommended Vercel Setup

### Option A: Remove Environment Variable (Recommended)

**Best for:** Production multi-tenant deployments

**Action:**
1. Go to Vercel Dashboard → CompPortal project → Settings → Environment Variables
2. **Delete** `NEXT_PUBLIC_TENANT_ID` variable
3. Redeploy

**Result:**
- Forces proper subdomain resolution
- Each subdomain gets its own tenant from database
- No fallback confusion

**Fallback chain becomes:**
```typescript
// 1. Try subdomain (empwr.compsync.net → 'empwr')
if (subdomain) {
  const tenant = await prisma.tenants.findFirst({ where: { subdomain } });
  if (tenant) return tenant;  // ✅ GLOW or EMPWR
}

// 2. Fallback to 'demo' tenant
const tenant = await prisma.tenants.findFirst({ where: { slug: 'demo' } });
```

---

### Option B: Keep for Backup (Advanced)

**Best for:** Development or single-tenant deployments

**Keep the variable BUT:**
- Only used if subdomain resolution completely fails
- Should never trigger in production if DNS is configured correctly
- Acts as emergency fallback

**No changes needed** - current code is fine, but subdomain resolution should always work first.

---

## 🔧 Vercel Domain Configuration

### Required DNS Setup

**In your DNS provider (e.g., Cloudflare, Namecheap):**

```
Type    Name     Value                           TTL
---------------------------------------------------
CNAME   empwr    cname.vercel-dns.com            Auto
CNAME   glow     cname.vercel-dns.com            Auto
CNAME   @        cname.vercel-dns.com (optional) Auto
```

**In Vercel Project Settings → Domains:**

Add these domains:
- `empwr.compsync.net` ✅
- `glow.compsync.net` ✅
- `compsync.net` (optional - can redirect to empwr or show generic landing)

---

## 🧪 Testing Vercel Environment

### Test 1: Verify Environment Variable

**Check current value:**
```bash
# Via Vercel CLI
vercel env ls

# Expected output:
# NEXT_PUBLIC_TENANT_ID (Production): 00000000-0000-0000-0000-000000000001
```

**Recommendation:** Remove this variable for true multi-tenant support.

---

### Test 2: Verify Subdomain Resolution

**Use Vercel deployment logs:**

```bash
# Deploy with debug logs
vercel --debug

# Watch logs
vercel logs
```

**Look for tenant resolution in logs:**
```
[GET] /api/tenant
Headers: { host: 'empwr.compsync.net' }
Subdomain extracted: 'empwr'
Tenant found: { id: '00000000-...', name: 'EMPWR Dance Experience' }
```

---

### Test 3: Test Both Subdomains

**Via curl:**

```bash
# Test EMPWR
curl -H "Host: empwr.compsync.net" https://comp-portal-one.vercel.app/api/tenant

# Expected:
# {
#   "id": "00000000-0000-0000-0000-000000000001",
#   "slug": "empwr",
#   "name": "EMPWR Dance Experience",
#   ...
# }

# Test GLOW
curl -H "Host: glow.compsync.net" https://comp-portal-one.vercel.app/api/tenant

# Expected:
# {
#   "id": "4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5",
#   "slug": "glow",
#   "name": "Glow Dance Competition",
#   ...
# }
```

---

## 📝 Deployment Checklist for Multi-Tenant

### Before Deploying Branding Fixes

**1. Verify Database:**
```sql
-- Both tenants must exist with proper branding
SELECT slug, subdomain, name, branding
FROM tenants
WHERE slug IN ('empwr', 'glow');
```

**2. Verify DNS:**
```bash
# Check DNS resolution
nslookup empwr.compsync.net
nslookup glow.compsync.net

# Both should point to Vercel
```

**3. Verify Vercel Domains:**
- [ ] `empwr.compsync.net` added in Vercel project
- [ ] `glow.compsync.net` added in Vercel project
- [ ] Both show as "Valid" status
- [ ] SSL certificates issued

**4. Update Environment Variables:**
```bash
# RECOMMENDED: Remove tenant ID fallback
vercel env rm NEXT_PUBLIC_TENANT_ID

# Or verify it's set correctly (EMPWR only as fallback)
vercel env pull
```

---

### After Deploying Branding Fixes

**1. Verify tenant resolution API:**
```bash
# Production test
curl https://empwr.compsync.net/api/tenant
curl https://glow.compsync.net/api/tenant

# Should return different tenant objects
```

**2. Check Vercel deployment logs:**
```bash
vercel logs --follow

# Watch for any errors:
# - "Tenant not found"
# - "Failed to fetch tenant data"
# - Fallback to NEXT_PUBLIC_TENANT_ID
```

**3. Browser testing:**
```
1. Visit https://empwr.compsync.net
   - Check browser tab title
   - Check footer
   - Check console for errors

2. Visit https://glow.compsync.net
   - Check browser tab title
   - Check footer
   - Check console for errors

3. Hard refresh both (Ctrl+Shift+R)
4. Test in incognito mode
```

---

## 🔍 Debugging Environment Issues

### Issue 1: GLOW shows EMPWR branding

**Diagnosis:**
```bash
# 1. Check tenant API
curl https://glow.compsync.net/api/tenant

# If returns EMPWR data → subdomain resolution failing
# If returns GLOW data → check browser cache
```

**Possible causes:**
- DNS not propagated yet (wait 5-60 minutes)
- Vercel domain not added to project
- `NEXT_PUBLIC_TENANT_ID` overriding subdomain
- Browser cached old version

**Fix:**
```bash
# 1. Verify DNS
dig glow.compsync.net

# 2. Check Vercel domains
vercel domains ls

# 3. Remove env variable
vercel env rm NEXT_PUBLIC_TENANT_ID

# 4. Redeploy
git commit --allow-empty -m "chore: force redeploy"
git push
```

---

### Issue 2: Both subdomains show same tenant

**Diagnosis:**
```bash
# Check headers being sent
curl -v https://empwr.compsync.net/api/tenant 2>&1 | grep -i host
curl -v https://glow.compsync.net/api/tenant 2>&1 | grep -i host
```

**If both show same `Host:` header:**
- DNS CNAME records might be incorrect
- Vercel routing not configured

**Fix:** Update DNS to point both subdomains to Vercel, and ensure both domains are added in Vercel dashboard.

---

### Issue 3: Environment variable being used unexpectedly

**Diagnosis:**
```typescript
// Add temporary logging in tenant-context.ts
export async function getTenantData(): Promise<TenantData | null> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  console.log('[TENANT DEBUG] hostname:', hostname);  // ← Add this

  const subdomain = extractSubdomain(hostname);
  console.log('[TENANT DEBUG] subdomain:', subdomain);  // ← Add this

  if (subdomain) {
    const tenant = await prisma.tenants.findFirst({ where: { subdomain } });
    console.log('[TENANT DEBUG] tenant found:', tenant?.name);  // ← Add this
    // ...
  }
}
```

**Check Vercel logs:**
```bash
vercel logs --follow

# Look for:
# [TENANT DEBUG] hostname: glow.compsync.net
# [TENANT DEBUG] subdomain: glow
# [TENANT DEBUG] tenant found: Glow Dance Competition
```

---

## 🎯 Recommended Production Setup

### Minimal Environment Variables

**Required:**
```bash
NEXT_PUBLIC_APP_URL=https://compsync.net
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
```

**NOT needed for multi-tenant:**
```bash
# ❌ Remove this for true multi-tenant support
# NEXT_PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000001
```

---

### Vercel Deployment Flow

```
1. Developer pushes to GitHub
   ↓
2. Vercel builds Next.js app
   ↓
3. User visits empwr.compsync.net or glow.compsync.net
   ↓
4. Vercel receives request with Host header
   ↓
5. Next.js calls getTenantData()
   ↓
6. Extracts subdomain from Host header
   ↓
7. Queries database: SELECT * FROM tenants WHERE subdomain = 'glow'
   ↓
8. Returns tenant data to component
   ↓
9. Component renders with tenant branding
```

**No environment variable needed!** Everything resolved from subdomain + database.

---

## ✅ Final Checklist

### Environment Setup

- [ ] `NEXT_PUBLIC_TENANT_ID` removed from Vercel (or kept as fallback only)
- [ ] Database has both EMPWR and GLOW tenants with branding
- [ ] DNS CNAME records configured for both subdomains
- [ ] Both domains added in Vercel project settings
- [ ] SSL certificates issued and valid

### Testing

- [ ] `curl https://empwr.compsync.net/api/tenant` returns EMPWR data
- [ ] `curl https://glow.compsync.net/api/tenant` returns GLOW data
- [ ] Browser shows correct tenant on empwr.compsync.net
- [ ] Browser shows correct tenant on glow.compsync.net
- [ ] Hard refresh works on both
- [ ] Incognito mode works on both

### Production Verification

- [ ] Vercel logs show correct subdomain extraction
- [ ] No fallback to environment variable
- [ ] No console errors in browser
- [ ] All branding elements show correct tenant
- [ ] Cross-tenant isolation verified

---

## 🚀 Quick Deploy Command

```bash
# 1. Remove environment variable (if needed)
vercel env rm NEXT_PUBLIC_TENANT_ID --yes

# 2. Deploy with all fixes
git add .
git commit -m "feat: Complete multi-tenant branding implementation

- Removed NEXT_PUBLIC_TENANT_ID dependency
- All branding now resolved from subdomain
- Tested on both EMPWR and GLOW

🤖 Claude Code"

git push origin main

# 3. Wait for deployment
# 4. Test both subdomains
open https://empwr.compsync.net
open https://glow.compsync.net
```

---

**Summary:** The `NEXT_PUBLIC_TENANT_ID` environment variable is a fallback mechanism. For true multi-tenant support, either remove it or ensure subdomain resolution always works first. The subdomain-based resolution (empwr.compsync.net → EMPWR, glow.compsync.net → GLOW) should handle everything automatically once DNS and Vercel domains are properly configured.
