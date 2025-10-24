# Email Notification Debugging Guide

**Issue:** Email notifications not working in production (Vercel), but email confirmation flow works.

**Last Updated:** 2025-10-24 01:20 UTC

---

## Current Email Implementation

**File:** `src/lib/email.ts`

**Service:** Nodemailer with SMTP (PrivateEmail)

**Required Environment Variables:**
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_SECURE` - Use TLS (optional, default: false)
- `EMAIL_FROM` - Default sender email (optional, default: noreply@glowdance.com)

---

## Why Email Confirmation Works But App Notifications Don't

**Email Confirmation** = Supabase Auth's built-in email service (configured in Supabase dashboard)
- Uses Supabase's SMTP relay
- Completely separate from application email service

**App Notifications** = Custom email service using Nodemailer
- Requires SMTP credentials to be set in Vercel environment variables
- Used for: reservation notifications, invoice delivery, summary submissions, etc.

---

## Debugging Steps

### 1. Verify Environment Variables in Vercel

**Check:**
```bash
# In Vercel dashboard, go to:
# Project Settings → Environment Variables

Required variables:
- SMTP_HOST
- SMTP_USER
- SMTP_PASS

Optional:
- SMTP_PORT (defaults to 587)
- SMTP_SECURE (defaults to false)
- EMAIL_FROM (defaults to noreply@glowdance.com)
```

**IMPORTANT:** After adding/updating env vars, you MUST redeploy for changes to take effect.

### 2. Check Vercel Runtime Logs

**Location:** Vercel Dashboard → Deployments → [Latest Deployment] → Runtime Logs

**Look for:**
- `"SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS). Email disabled."`
- `"Email sending disabled: SMTP not configured"`
- `"Email send error"`

**Filter by:**
- Function: `/api/trpc/[trpc]` (where email mutations are called)
- Time: When email should have been sent

### 3. Test Email Service

**Option A: Use existing mutation**
```typescript
// In browser console on production site:
// Submit a reservation summary to trigger email to CD
```

**Option B: Create test endpoint** (if needed)
```typescript
// Add to src/app/api/test-email/route.ts
import { sendEmail } from '@/lib/email';

export async function GET() {
  const result = await sendEmail({
    to: 'your-email@example.com',
    subject: 'Test Email from CompPortal',
    html: '<p>This is a test email. If you receive this, SMTP is configured correctly.</p>',
  });

  return Response.json(result);
}
```

### 4. Check Email Logs Database

**Query:**
```sql
SELECT
  template_type,
  recipient_email,
  subject,
  success,
  error_message,
  created_at
FROM email_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Indicates:**
- If emails are being attempted
- What error messages are returned
- Which email types are failing

---

## Common Issues & Solutions

### Issue 1: Environment Variables Not Set
**Symptom:** Console shows `"SMTP not configured"`
**Solution:**
1. Set all required env vars in Vercel
2. Redeploy application
3. Check logs again

### Issue 2: Wrong SMTP Credentials
**Symptom:** `"Authentication failed"` or `"Invalid login"`
**Solution:**
1. Verify SMTP credentials with email provider
2. Update env vars in Vercel
3. Redeploy

### Issue 3: Port/Security Mismatch
**Symptom:** Connection timeout or TLS errors
**Solution:**
- Port 587: Use `SMTP_SECURE=false` (STARTTLS)
- Port 465: Use `SMTP_SECURE=true` (TLS/SSL)
- Port 25: Usually blocked by cloud providers

### Issue 4: Firewall/Rate Limiting
**Symptom:** Intermittent failures or timeouts
**Solution:**
1. Check with SMTP provider for rate limits
2. Verify Vercel's outbound IPs aren't blocked
3. Consider using SendGrid/Resend instead of direct SMTP

---

## Quick Fix: Switch to Resend

If SMTP continues to fail, consider switching to Resend (better for serverless):

**Install:**
```bash
npm install resend
```

**Update `src/lib/email.ts`:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, from = 'onboarding@resend.dev' }: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      logger.error('Email send error', { error });
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    logger.error('Email send error', { error });
    return { success: false, error: 'Unknown error' };
  }
}
```

**Environment Variable:**
- `RESEND_API_KEY` - Get from resend.com

---

## Current Email Service Code

**File:** `src/lib/email.ts` (lines 14-32)

```typescript
function getSmtpTransport() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    if (!host || !user || !pass) {
      console.warn('SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS). Email disabled.');
      return null;
    }

    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  }
  return transporter;
}
```

**This code silently fails** - it logs a warning but doesn't throw an error. This means:
- Application continues running
- Email mutations appear to succeed
- But no emails are actually sent

---

## Next Steps

1. **Check Vercel env vars** - Ensure all SMTP variables are set
2. **Redeploy** - Environment changes require redeployment
3. **Check runtime logs** - Look for SMTP configuration warnings
4. **Query email_logs table** - See if attempts are being logged
5. **Test with test endpoint** - Verify SMTP connection works
6. **Consider Resend** - If SMTP continues to fail

---

## Email Features That Need This Working

- Reservation submitted notification (to CD)
- Reservation approved notification (to SD)
- Reservation rejected notification (to SD)
- Invoice delivery (to SD)
- Payment confirmed notification (to SD)
- Routine summary submitted (to CD)
