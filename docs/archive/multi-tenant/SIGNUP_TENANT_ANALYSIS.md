# Signup Page Tenant ID Analysis

**Date:** October 28, 2025
**File:** `src/app/signup/page.tsx`
**Status:** ⚠️ Functional but Complex - Switching to Edge Function Recommended

---

## Current Implementation Analysis

### Tenant Resolution Strategy (Lines 31-68)

The signup page uses a **4-tier fallback** system to resolve tenant_id:

```typescript
1. Context (tenant?.id) - From TenantThemeProvider
   ↓ (if null)
2. Public API (/api/tenant) - Fetch from server
   ↓ (if fails)
3. Environment variable (NEXT_PUBLIC_TENANT_ID)
   ↓ (if not set)
4. Hostname inference (subdomain → slug lookup)
```

### Identified Issues

#### 🟡 **ISSUE-01: Race Condition Risk**
**Lines:** 101-106
```typescript
const tenantId = await resolveTenantId();
if (!tenantId) {
  setError('Unable to determine tenant. Please refresh and try again.');
  return;
}
```

**Problem:** Multiple async calls to different endpoints can fail intermittently, especially on slow connections or server issues.

**Impact:** User sees "Unable to determine tenant" error even though tenant should be resolvable.

**Evidence:** The 4-tier fallback is complex and error-prone.

---

#### 🟡 **ISSUE-02: Supabase Auth Native Email Flow**
**Lines:** 118-127
```typescript
const { data, error: signUpError } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    emailRedirectTo: `${window.location.origin}/onboarding`,
    data: {
      tenant_id: tenantId, // Passed to auth.users metadata
    },
  },
});
```

**Problem:** Using Supabase native auth email system which:
- Sends generic Supabase-branded emails
- Cannot customize templates easily
- tenant_id stored in auth.users metadata (non-queryable)

**Current Workaround:** Line 129-132 signs out immediately to prevent unconfirmed session errors

---

#### 🟠 **ISSUE-03: No user_profiles Record Created**
**Problem:** After signup, user exists in `auth.users` but NOT in `user_profiles` table until they complete onboarding.

**Impact:**
- User can't be queried by tenant_id in app code
- tenant_id lives in `auth.users.raw_user_meta_data` (JSON blob)
- No foreign key relationship to `tenants` table

**Evidence:** Code at line 117 says "user will complete profile in onboarding after email confirmation"

---

## Recommended: Switch to Supabase Edge Function

### Why Edge Function is Better

**Current Flow (Native Auth):**
```
User fills form → Supabase.auth.signUp() → Generic email sent → User confirms → Redirect to /onboarding → Create profile
```

**Proposed Flow (Edge Function):**
```
User fills form → Edge function call → Create user_profiles record → Send custom email → User confirms → Redirect to /dashboard
```

### Benefits

1. **✅ Whitelabel Emails**
   - Custom branded emails per tenant
   - Use Mailgun API (already configured in .env)
   - Full control over templates

2. **✅ tenant_id in Database**
   - Create `user_profiles` record immediately
   - Queryable tenant_id column
   - Foreign key to tenants table

3. **✅ Simpler Flow**
   - No complex 4-tier fallback needed
   - tenant_id passed directly to edge function
   - Atomic transaction: create user + profile

4. **✅ Better Error Handling**
   - Edge function can validate tenant exists
   - Return clear error messages
   - No race conditions

---

## Proposed Edge Function Implementation

### 1. Create Edge Function

**File:** `supabase/functions/signup-user/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  try {
    const { email, password, tenant_id } = await req.json()

    // Validate tenant exists
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single()

    if (!tenant) {
      return new Response(
        JSON.stringify({ error: 'Invalid tenant' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email confirmation
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create user_profiles record with tenant_id
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: email,
        tenant_id: tenant_id,
        role: 'studio_director', // Default role
        created_at: new Date().toISOString(),
      })

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Profile creation failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send custom confirmation email via Mailgun
    const confirmationToken = authData.user.email_confirmed_at ? null :
      await generateConfirmationToken(authData.user.id)

    if (confirmationToken) {
      await sendConfirmationEmail({
        email,
        token: confirmationToken,
        tenant_name: tenant.name,
        tenant_id: tenant_id,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Check your email for confirmation link'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function sendConfirmationEmail(params: {
  email: string
  token: string
  tenant_name: string
  tenant_id: string
}) {
  const { email, token, tenant_name } = params
  const confirmUrl = `${Deno.env.get('SITE_URL')}/confirm-email?token=${token}`

  // Call Mailgun API
  const formData = new FormData()
  formData.append('from', `${tenant_name} <noreply@compsync.net>`)
  formData.append('to', email)
  formData.append('subject', `Confirm your ${tenant_name} account`)
  formData.append('html', `
    <h2>Welcome to ${tenant_name}!</h2>
    <p>Click the link below to confirm your email:</p>
    <a href="${confirmUrl}">Confirm Email</a>
  `)

  await fetch(
    `https://api.mailgun.net/v3/${Deno.env.get('MAILGUN_DOMAIN')}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${Deno.env.get('MAILGUN_API_KEY')}`)}`,
      },
      body: formData,
    }
  )
}
```

### 2. Update Signup Page

**File:** `src/app/signup/page.tsx` (Simplified)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!validateForm()) return

  setLoading(true)
  setError(null)

  try {
    // Simplified: Get tenant from context (guaranteed by middleware)
    const tenantId = tenant?.id
    if (!tenantId) {
      setError('Tenant not found. Please refresh.')
      return
    }

    // Check email doesn't exist
    const emailCheck = await checkEmailMutation.mutateAsync({ email: formData.email })
    if (emailCheck.exists) {
      setError('Email already registered')
      return
    }

    // Call edge function
    const response = await fetch('/api/signup-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        tenant_id: tenantId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error)
      return
    }

    setSuccess(true)
  } catch (err) {
    setError('Signup failed')
  } finally {
    setLoading(false)
  }
}
```

---

## Migration Steps

### Phase 1: Preparation (1 hour)
1. Create Supabase edge function (`supabase/functions/signup-user/index.ts`)
2. Add Mailgun email template
3. Create `/api/signup-user` API route (proxy to edge function)
4. Test edge function locally

### Phase 2: Update Signup Page (30 min)
1. Simplify `resolveTenantId()` - remove 4-tier fallback
2. Replace `supabase.auth.signUp()` with edge function call
3. Remove immediate sign-out workaround
4. Test signup flow

### Phase 3: Email Confirmation (1 hour)
1. Create `/confirm-email` page
2. Verify email confirmation token
3. Update auth.users.email_confirmed_at
4. Redirect to onboarding or dashboard

### Phase 4: Testing (1 hour)
1. Test signup on EMPWR tenant
2. Test signup on Glow tenant
3. Verify email delivery
4. Verify user_profiles record created with correct tenant_id
5. Verify no cross-tenant data leaks

### Phase 5: Cleanup (30 min)
1. Remove old Supabase auth email templates
2. Update documentation
3. Deploy to production

**Total Estimated Time:** 4 hours

---

## Current Issues Summary

| Issue | Severity | Impact | Fix |
|-------|----------|--------|-----|
| Complex tenant resolution | Medium | User errors, hard to debug | Use edge function |
| Generic Supabase emails | Medium | Not whitelabel | Mailgun via edge function |
| No user_profiles on signup | High | tenant_id not queryable | Create in edge function |
| Immediate sign-out workaround | Low | Confusing UX | Remove with edge function |

---

## Testing Checklist

After implementing edge function:

- [ ] Signup creates user_profiles record
- [ ] user_profiles has correct tenant_id
- [ ] Email sent via Mailgun (whitelabel)
- [ ] Email confirmation works
- [ ] Confirmed user can login
- [ ] Tenant isolation maintained
- [ ] No EMPWR users see Glow data
- [ ] No Glow users see EMPWR data

---

**Recommendation:** Implement edge function approach for cleaner architecture, better tenant isolation, and whitelabel email support.
