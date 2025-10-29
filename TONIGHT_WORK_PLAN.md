# Tonight's Work Plan - October 28, 2025

## Overview

Two main tasks for tonight:
1. **CSV/Excel Import Testing** (Dancers)
2. **Signup Flow with Supabase Edge Function Auth**

---

## Task 1: CSV/Excel Import Testing

### Location
- Import Page: `https://empwr.compsync.net/dashboard/dancers/import`
- Test Files: `D:\ClaudeCode\CompPortal\test-data\import-tests\dancers\`

### Test Files Created (10 files)

| # | File Name | Purpose | Expected Result |
|---|-----------|---------|-----------------|
| 01 | `01-perfect-match.csv` | All fields correct | ✅ Pass (5 dancers) |
| 02 | `02-column-variations.csv` | Header name flexibility | ✅ Pass (5 dancers) |
| 03 | `03-minimal-required-only.csv` | Required fields only | ✅ Pass (5 dancers) |
| 04 | `04-mixed-date-formats.csv` | Date parsing edge cases | ⚠️ Partial (10 dancers) |
| 05 | `05-special-characters.csv` | Unicode/accents/hyphens | ✅ Pass (8 dancers) |
| 06 | `06-duplicates-and-empties.csv` | Duplicate detection | ⚠️ Partial (8 rows) |
| 07 | `07-invalid-data.csv` | Validation testing | ❌ Reject (6 rows) |
| 08 | `08-extra-columns.csv` | Extra column handling | ✅ Pass (4 dancers) |
| 09 | `09-mixed-case-headers.csv` | Case-insensitive matching | ✅ Pass (4 dancers) |
| 10 | `10-missing-required-columns.csv` | Missing last_name | ❌ Reject (3 rows) |

### Testing Procedure

1. **Login** as Studio Director:
   - URL: `https://empwr.compsync.net/login`
   - Email: `danieljohnabrahamson@gmail.com`
   - Password: `123456`

2. **Navigate to Import Page:**
   - Click "Dancers" in sidebar
   - Click "Import" button in toolbar

3. **For Each Test File:**
   - Click "Choose File"
   - Select CSV file
   - Review preview screen
   - Note any warnings/errors
   - Click "Import" or "Cancel"
   - Take screenshots
   - Document results

4. **Verify Results:**
   - Check dancers list
   - Verify new dancers appear
   - Check data accuracy
   - Test search/filter
   - Verify tenant isolation

### Expected System Behavior

**Upload Screen:**
- Drag-drop or file picker
- Accept CSV, XLS, XLSX
- Show file name and size

**Preview Screen:**
- Show first 5-10 rows
- Display column mapping
- Flag validation errors
- Show counts (total/valid/invalid)

**Import Process:**
- Progress indicator
- Transaction-based
- Duplicate detection
- Auto-add tenant_id

**Success:**
- "X dancers imported"
- Redirect to dancers list
- Highlight new dancers

**Errors:**
- Clear error messages
- Row numbers indicated
- Downloadable error report

### Screenshots to Capture

- [ ] Import page initial state
- [ ] File upload interface
- [ ] Preview screen for each test file
- [ ] Success messages
- [ ] Error messages
- [ ] Final dancers list

### Documentation

**Record in:** `IMPORT_TEST_RESULTS.md` (to be created)

For each file, document:
- File name
- Expected result
- Actual result
- Screenshots
- Any errors/warnings
- Performance notes

---

## Task 2: Signup Flow with Supabase Edge Function

### Current Issues

From `SIGNUP_TENANT_ANALYSIS.md`:
1. Complex 4-tier tenant resolution
2. Generic Supabase-branded emails
3. No user_profiles record until onboarding
4. Immediate sign-out workaround

### Implementation Steps

#### Step 1: Create Supabase Edge Function (1 hour)

**File:** `supabase/functions/signup-user/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  try {
    const { email, password, tenant_id } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Validate tenant exists
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

    // 2. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. Create user_profiles record
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        tenant_id: tenant_id,
        role: 'studio_director',
        created_at: new Date().toISOString(),
      })

    if (profileError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Profile creation failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Send custom email via Mailgun
    await sendConfirmationEmail({
      email,
      tenant_name: tenant.name,
      tenant_id: tenant_id,
      user_id: authData.user.id,
    })

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
  tenant_name: string
  tenant_id: string
  user_id: string
}) {
  // Mailgun implementation here
  // See SIGNUP_TENANT_ANALYSIS.md lines 214-244
}
```

#### Step 2: Update Signup Page (30 min)

**File:** `src/app/signup/page.tsx`

**Changes:**
1. Simplify `resolveTenantId()` - remove 4-tier fallback
2. Replace `supabase.auth.signUp()` with edge function call
3. Remove immediate sign-out workaround

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!validateForm()) return

  setLoading(true)
  setError(null)

  try {
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

#### Step 3: Create API Route (30 min)

**File:** `src/app/api/signup-user/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Call Supabase edge function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/signup-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Step 4: Create Email Confirmation Page (1 hour)

**File:** `src/app/confirm-email/page.tsx`

- Parse confirmation token from URL
- Verify token with Supabase
- Update `auth.users.email_confirmed_at`
- Redirect to onboarding or dashboard

#### Step 5: Testing (1 hour)

1. Test on EMPWR tenant
2. Test on Glow tenant
3. Verify email delivery
4. Verify user_profiles created
5. Verify tenant isolation
6. Test error cases

### Environment Variables Needed

Add to `.env.local`:
```
MAILGUN_API_KEY=your-key
MAILGUN_DOMAIN=your-domain
SUPABASE_SERVICE_ROLE_KEY=your-key
```

---

## Quick Reference

### URLs
- **EMPWR Production:** `https://empwr.compsync.net`
- **Glow Production:** `https://glow.compsync.net`
- **Dancer Import:** `/dashboard/dancers/import`
- **Signup Page:** `/signup`

### Login Credentials
- **Studio Director:** danieljohnabrahamson@gmail.com / 123456
- **Competition Director:** empwrdance@gmail.com / [password unknown]

### Tenant IDs
- **EMPWR:** `00000000-0000-0000-0000-000000000001`
- **Glow:** `4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5`

### Test Data Locations
- **Dancers CSV:** `D:\ClaudeCode\CompPortal\test-data\import-tests\dancers\`
- **Test Plan:** `D:\ClaudeCode\CompPortal\test-data\import-tests\IMPORT_TEST_PLAN.md`

---

## Success Criteria

### Import Testing
- [ ] All 10 CSV files tested
- [ ] Results documented in IMPORT_TEST_RESULTS.md
- [ ] Screenshots captured for each scenario
- [ ] Bugs/issues filed (if any)

### Signup Flow
- [ ] Edge function deployed
- [ ] Signup page updated
- [ ] Email confirmation working
- [ ] Tested on both tenants
- [ ] user_profiles created with tenant_id
- [ ] Whitelabel emails sent via Mailgun

---

## Time Estimates

| Task | Estimated Time |
|------|----------------|
| **Import Testing** | 1.5 hours |
| - Setup | 15 min |
| - Test 10 files | 60 min |
| - Documentation | 15 min |
| **Signup Flow** | 4 hours |
| - Edge function | 1 hour |
| - Signup page updates | 30 min |
| - API route | 30 min |
| - Email confirmation | 1 hour |
| - Testing | 1 hour |
| **Total** | **5.5 hours** |

---

## Notes

- Take breaks between tasks
- Document everything as you go
- Screenshot errors immediately
- Test on both tenants for every change
- Verify tenant isolation always

---

**Generated by:** Claude Code Work Plan
**Created:** October 28, 2025
**Ready for:** Tonight's work session
