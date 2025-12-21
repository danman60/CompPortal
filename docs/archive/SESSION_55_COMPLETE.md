# Session 55 Complete - Password Reset Fix

**Date:** November 21, 2025
**Duration:** Multi-hour debugging session
**Status:** ✅ Complete - Password reset working in production

---

## Summary

Fixed password reset functionality for all tenants. User comp.cda@gmail.com reported inability to reset password on glow.compsync.net. Root cause was PostgreSQL SECURITY DEFINER functions with missing schema qualification causing triggers to look for non-existent `auth.email_queue` table instead of `public.email_queue`.

---

## Issue Timeline

### Initial Report
**User:** comp.cda@gmail.com unable to login
**Error:** "Invalid tenant" (HTTP 400) on password reset

### Investigation Phase 1: Edge Function
**Finding:** Edge Function querying non-existent columns
**Fix:** Changed from `primary_color, secondary_color` to `branding` JSONB
**Result:** Error progressed from 400 → 500 (progress made)

### Investigation Phase 2: SMTP Configuration
**Finding:** SMTP sender email set to `disable.invalid@mail.com` (placeholder)
**Fix:** User updated to `postmaster@compsync.net` in Supabase Dashboard
**Result:** Error changed from DNS lookup failure to authentication failure

### Investigation Phase 3: Mailgun Credentials
**Finding:** User using Mailgun API Key as SMTP password
**Clarification:** Mailgun has separate API Key (HTTP API) vs SMTP Password (SMTP)
**Result:** Decided to use existing email queue system instead

### Investigation Phase 4: Database Triggers (Root Cause)
**Finding:** Trigger functions on `auth.users` trying to INSERT into `email_queue` without schema qualification
**Root Cause:** `SECURITY DEFINER` functions executing in `auth` context looking for `auth.email_queue` (doesn't exist) instead of `public.email_queue` (exists)

**Fix Applied:**
```sql
-- Updated 3 functions:
CREATE OR REPLACE FUNCTION public.queue_password_recovery_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Added
AS $$
BEGIN
  -- Changed from: INSERT INTO email_queue
  INSERT INTO public.email_queue (...)  -- Explicit schema
  ...
END;
$$;
```

**Functions Updated:**
1. `queue_password_recovery_email()` - Password reset emails
2. `queue_signup_confirmation_email()` - Signup confirmation emails
3. `queue_email_change_confirmation()` - Email change confirmation emails

---

## Technical Details

### PostgreSQL SECURITY DEFINER Issue

**Problem:** Functions marked as `SECURITY DEFINER` run with the privileges of the function owner, but inherit the calling context's search path if not explicitly set.

**Before:**
- Function in `public` schema
- Trigger fires from `auth.users` table (auth context)
- `INSERT INTO email_queue` resolves to `auth.email_queue` (missing)
- Error: "relation email_queue does not exist"

**After:**
- Added `SET search_path = public`
- Changed to `INSERT INTO public.email_queue` (explicit)
- Function now correctly finds table in public schema

### Email Flow Architecture

**Current System:**
1. User requests password reset from frontend
2. Frontend calls `supabase.auth.resetPasswordForEmail(email)`
3. Supabase updates `auth.users.recovery_token`
4. Database trigger `trigger_queue_password_recovery` fires
5. Trigger function queues email in `public.email_queue` with:
   - `tenant_id` (from user metadata)
   - `email_type: 'password_recovery'`
   - `recipient_email`
   - `template_data` (recovery token, email, user_id)
6. Cron job runs every 30 seconds: `SELECT cron.schedule(...)`
7. Cron calls `process-email-queue` Edge Function via HTTP
8. Edge Function:
   - Fetches pending emails with tenant info
   - Generates branded HTML email using tenant settings
   - Sends via Mailgun HTTP API (not SMTP)
   - Marks email as sent in queue

**Key Components:**
- **Database:** `public.email_queue` table, triggers on `auth.users`
- **Edge Function:** `process-email-queue` (Deno/TypeScript)
- **Cron:** `pg_cron` extension scheduling
- **Email:** Mailgun HTTP API (uses API Key, not SMTP)

---

## Files Modified

### Database Functions (via SQL)
- `public.queue_password_recovery_email()` - Fixed schema qualification
- `public.queue_signup_confirmation_email()` - Fixed schema qualification
- `public.queue_email_change_confirmation()` - Fixed schema qualification

### Documentation Updated
- `PROJECT_STATUS.md` - Session 55 completion notes

---

## Testing Evidence

**Test User:** comp.cda@gmail.com
**Tenant:** Glow Dance Competition (4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5)
**Test URL:** glow.compsync.net/login

**Verification:**
```sql
-- User has tenant_id in metadata ✅
SELECT email, raw_user_meta_data->>'tenant_id' as tenant_id
FROM auth.users
WHERE email = 'comp.cda@gmail.com';
-- Result: tenant_id = 4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5

-- Email queue table exists ✅
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'email_queue';
-- Result: public.email_queue exists

-- Triggers exist on auth.users ✅
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'users';
-- Result: trigger_queue_password_recovery, etc.
```

**Production Test:**
1. User clicked "Forgot Password" on glow.compsync.net
2. Entered comp.cda@gmail.com
3. Email queued in `public.email_queue` ✅
4. Cron job processed within 30 seconds ✅
5. Email sent via Mailgun ✅
6. User received password reset email ✅

---

## Lessons Learned

1. **PostgreSQL SECURITY DEFINER Gotcha:** Always set explicit `search_path` or use fully qualified table names in security definer functions.

2. **Multi-Layer Email Systems:** CompPortal has both:
   - Custom email queue system (`public.email_queue` + triggers)
   - Supabase built-in auth emails (SMTP)
   - Understanding which system is active is critical

3. **Mailgun Credentials:** API Key (HTTP API) ≠ SMTP Password (SMTP auth)

4. **Debugging Strategy:** Start with logs, trace through layers (frontend → auth → triggers → queue → edge function → email provider)

5. **Schema Context Matters:** A function's schema location doesn't determine its execution context - the calling context does (unless overridden with SET search_path)

---

## Related Documentation

- `CompPortal/docs/EMAIL_SYSTEM_CONFIGURATION.md` - Email system architecture
- `CompPortal/supabase/functions/process-email-queue/index.ts` - Email processor
- `CompPortal/supabase/functions/password-reset/index.ts` - Alternative password reset (not used)

---

## Production Status

**System Health:** 🟢 Healthy
**Password Reset:** ✅ Working for all tenants
**Email Queue:** ✅ Processing every 30 seconds
**Edge Functions:** ✅ All operational

**Next Steps:** None - issue fully resolved.

---

**Session completed:** November 21, 2025
**User feedback:** "just tested it worked, wtf did you do" 😅
