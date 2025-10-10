# 🏗️ CompSync Multi-Tenant + White-Label Setup Plan

**Date:** October 2025  
**Domain:** compsync.net  
**Stack:** Next.js 15 • Supabase • Vercel

---

## ✅ Completed Setup

### 1. Domain + DNS Configuration (Namecheap → Vercel)

**Root Domain**
| Type | Host | Value |
|------|------|--------|
| A | @ | 76.76.21.21 |

**WWW Redirect**
| Type | Host | Value |
|------|------|--------|
| CNAME | www | cname.vercel-dns.com |

**First Client Subdomain (EMPWR)**
| Type | Host | Value |
|------|------|--------|
| CNAME | empwr | cname.vercel-dns.com |

➡️ Verified in Vercel project  
➡️ https://empwr.compsync.net now routes to production app  
➡️ No wildcard / automation — manual subdomain creation for each client

---

## ⚙️ Current Behavior

- `compsync.net` → main landing / superadmin portal  
- `empwr.compsync.net` → points to same Vercel app  
- Middleware planned to detect `x-tenant` / subdomain and load branding from DB  
- DNS stays managed in Namecheap (manual white-label control)

---

## 🧩 Codebase Tasks — Next Steps

### **1. Multi-Tenant Detection Middleware**
Create `/src/middleware.ts`:

```ts
import { NextResponse } from "next/server";

export function middleware(req: Request) {
  const host = req.headers.get("host") || "";
  const [subdomain] = host.split(".");
  if (subdomain && subdomain !== "compsync" && subdomain !== "www") {
    req.headers.set("x-tenant", subdomain);
  }
  return NextResponse.next({ request: { headers: req.headers } });
}
```

→ Will allow per-tenant branding, data filtering, and routing.

---

### **2. Database: Competition Isolation**
Add/verify fields:

```sql
competitions (
  id uuid primary key,
  slug text unique,       -- matches subdomain
  name text,
  logo_url text,
  primary_color text,
  accent_color text,
  created_by uuid references user_profiles(id)
)
```

Add RLS policies:
```sql
CREATE POLICY "tenant isolation"
ON competitions
FOR ALL
USING (
  role() = 'super_admin'
  OR id IN (
    SELECT competition_id FROM user_profiles WHERE id = (select auth.uid())
  )
);
```

---

### **3. White-Label Branding Loader**
In root layout or context provider:
```ts
const tenant = headers().get("x-tenant");
const competition = await getCompetitionBySlug(tenant);

return (
  <ThemeProvider
    theme={{
      primary: competition.primary_color,
      accent: competition.accent_color,
    }}
  >
    {children}
  </ThemeProvider>
);
```

→ Dynamically load logos, theme colors, and competition name for EMPWR and future tenants.

---

### **4. SuperAdmin Dashboard (compsync.net)**
Features to implement:
- ✅ List all competitions (slug, name, logo)
- 🔄 “Login as Director” (impersonate)
- 🔄 Manage subdomain branding (color, logo)
- 🔄 Trigger DB backup / restore (via Supabase Edge Function)
- 🔄 Tech Support Tickets (view / reply / resolve)

---

### **5. Backup & Support Systems**

**Edge Function:** `/supabase/functions/db_backup.ts`
```ts
import { serve } from "https://deno.land/std/http/server.ts";
serve(async (req) => {
  const action = new URL(req.url).searchParams.get("action");
  // pg_dump or Supabase Admin API logic here
  return new Response(JSON.stringify({ status: "ok", action }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Support Tickets Table**
```sql
support_tickets (
  id uuid primary key,
  competition_id uuid,
  created_by uuid,
  title text,
  message text,
  status text default 'open',
  priority text default 'normal'
)
```

---

## 🧱 Future Subdomain Additions

| Competition | Subdomain | Notes |
|--------------|------------|-------|
| EMPWR | empwr.compsync.net | ✅ Active |
| GlowDance | glow.compsync.net | 🔄 Next |
| Ignite | ignite.compsync.net | 🔄 Future |
| Summit | summit.compsync.net | 🔄 Future |

---

## 📋 Summary

| Area | Status | Notes |
|------|---------|-------|
| DNS + EMPWR setup | ✅ Complete | Manual subdomain approach via Namecheap |
| Middleware tenant detection | 🚧 Pending | Required for per-tenant branding |
| Supabase RLS per competition | 🚧 Pending | Competition ID isolation |
| White-label theme loader | 🚧 Pending | Dynamic logo / colors |
| SuperAdmin dashboard | 🚧 Planned | Impersonation + backups + support |
| Support tickets + DB backup | 🚧 Planned | Edge functions + admin UI |

---

**Next Action:**  
Implement tenant-aware middleware + theme loader → verify EMPWR data isolation + branding load.
