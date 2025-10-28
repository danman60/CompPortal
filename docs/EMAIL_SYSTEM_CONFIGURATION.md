# CompPortal Email System Configuration Guide

## ✅ System Status

**Deployment:** Complete
**Cron Jobs:** Active (fixed pg_net extension issue)
**Edge Function:** Deployed and running

---

## 🔧 Critical Configuration: Signup with tenant_id

**IMPORTANT:** For the email system to work, you **MUST** pass `tenant_id` in user metadata during signup.

### Current Issue

The signup is returning a **500 error** because `tenant_id` is not being passed in user metadata. Our database trigger looks for this value to know which tenant's branding to use.

### Required Frontend Change

Update your signup code to include `tenant_id` in the `options.data` field:

```typescript
// ❌ WRONG - This will cause 500 error
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password
})

// ✅ CORRECT - Include tenant_id
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      tenant_id: currentTenantId // Pass the tenant UUID here
    }
  }
})
```

### How to Get tenant_id

**Option 1: From Subdomain (Recommended)**

```typescript
// Example: empwr.compsync.net → lookup tenant by subdomain
const subdomain = window.location.hostname.split('.')[0]; // 'empwr'

const { data: tenant } = await supabase
  .from('tenants')
  .select('id')
  .eq('slug', subdomain)
  .single();

const tenantId = tenant?.id;
```

**Option 2: From Context (if already loaded)**

```typescript
// If you have tenant context from middleware/layout
const tenantId = tenant.id; // From your tenant context
```

### Example Complete Signup Flow

```typescript
async function handleSignup(email: string, password: string) {
  // 1. Get tenant from subdomain
  const subdomain = window.location.hostname.split('.')[0];

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', subdomain)
    .single();

  if (tenantError || !tenant) {
    throw new Error('Invalid tenant');
  }

  // 2. Sign up with tenant_id in metadata
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        tenant_id: tenant.id // ← CRITICAL: This enables branded emails
      },
      emailRedirectTo: `https://${subdomain}.compsync.net/onboarding`
    }
  });

  if (error) throw error;

  return data;
}
```

---

## 🎨 What Happens After Fix

Once you pass `tenant_id` correctly:

1. **User signs up** → Supabase creates auth.users record with `tenant_id` in metadata
2. **Database trigger fires** → Detects `tenant_id` and `confirmation_token`
3. **Email queued** → Inserts into `email_queue` with tenant info
4. **Cron job runs** (every 30s) → Calls Edge Function
5. **Edge Function processes** → Generates branded email with tenant's config
6. **Mailgun sends** → User receives email from `empwr@compsync.net` or `glow@compsync.net`
7. **User clicks link** → Redirected to tenant-specific confirmation page

---

## 📧 Email Branding by Tenant

### EMPWR Dance Experience
- **From:** EMPWR Dance Experience <empwr@compsync.net>
- **Footer:** © EMPWR Dance Experience. All rights reserved.
- **Link Format:** https://www.compsync.net/empwr/auth/confirm?token=...

### Glow Dance Competition
- **From:** Glow Dance Competition <glow@compsync.net>
- **Footer:** © Glow Dance Competition. All rights reserved.
- **Link Format:** https://www.compsync.net/glow/auth/confirm?token=...

---

## 🧪 Testing After Fix

### Test 1: Signup with tenant_id

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
  options: {
    data: {
      tenant_id: '00000000-0000-0000-0000-000000000001' // EMPWR tenant ID
    }
  }
})

// Should return 200, no 500 error
console.log('Signup successful:', data);
```

### Test 2: Verify Email Queued

```sql
-- Run in Supabase SQL Editor
SELECT
  id,
  email_type,
  recipient_email,
  status,
  created_at,
  (template_data->>'tenant_id') as tenant_id
FROM email_queue
ORDER BY created_at DESC
LIMIT 1;
```

Expected output:
```
email_type: signup_confirmation
recipient_email: test@example.com
status: pending (then 'sent' after 30 seconds)
tenant_id: 00000000-0000-0000-0000-000000000001
```

### Test 3: Check Email Sent

Wait 30 seconds, then check:

```sql
SELECT
  status,
  sent_at,
  error
FROM email_queue
WHERE recipient_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
```
status: sent
sent_at: 2025-10-27 14:30:15.123456+00
error: null
```

---

## 🔍 Troubleshooting

### Problem: Still getting 500 error after fix

**Check:**
1. Is `tenant_id` being passed? Check with:
```sql
SELECT email, raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC LIMIT 1;
```

2. Is tenant_id a valid UUID?
```sql
SELECT id FROM tenants WHERE id = 'YOUR_TENANT_ID';
```

### Problem: Email not being queued

**Check trigger is firing:**
```sql
SELECT * FROM email_queue WHERE recipient_email = 'test@example.com';
```

If empty, trigger didn't fire. Verify:
- User has `confirmation_token` (check `auth.users`)
- User has `tenant_id` in `raw_user_meta_data`

### Problem: Email stuck in 'pending'

**Check cron job:**
```sql
SELECT jobname, active FROM cron.job WHERE jobname LIKE '%email%';
```

**Check recent cron runs:**
```sql
SELECT job_name, status, return_message, start_time
FROM cron.job_run_details
WHERE job_name = 'process-email-queue-30s'
ORDER BY start_time DESC
LIMIT 5;
```

### Problem: Email fails to send

**Check error message:**
```sql
SELECT error, retry_count FROM email_queue WHERE status = 'failed';
```

Common errors:
- `Mailgun API error` → Check MAILGUN_API_KEY in Edge Function secrets
- `Tenant X missing email configuration` → Check tenant config in database
- `schema "net" does not exist` → pg_net extension not installed (fixed in migration)

---

## 📊 Monitoring Queries

Use these to monitor the email system:

```sql
-- Email queue status
SELECT status, COUNT(*)
FROM email_queue
GROUP BY status;

-- Recent emails by tenant
SELECT
  t.name as tenant,
  eq.status,
  COUNT(*) as count
FROM email_queue eq
JOIN tenants t ON eq.tenant_id = t.id
WHERE eq.created_at > NOW() - INTERVAL '1 hour'
GROUP BY t.name, eq.status;

-- Failed emails with errors
SELECT
  recipient_email,
  error,
  retry_count,
  created_at
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 🚀 Next Steps

1. **Update signup code** to pass `tenant_id` (see example above)
2. **Configure Edge Function secrets** in Supabase Dashboard:
   - MAILGUN_API_KEY
   - SITE_URL
3. **Test signup flow** with real email
4. **Monitor email queue** to ensure emails send
5. **Disable default Supabase auth emails** (SMTP settings)

---

## 🎯 Success Criteria

- ✅ Signup returns 200 (not 500)
- ✅ Email appears in `email_queue` with correct `tenant_id`
- ✅ Email status changes from `pending` → `sent` within 30 seconds
- ✅ User receives branded email from correct `tenant@compsync.net`
- ✅ Confirmation link redirects to correct tenant subdomain

---

**System is ready once `tenant_id` is passed during signup!** 🎉
