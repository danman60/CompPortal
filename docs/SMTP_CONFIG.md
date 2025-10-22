# Supabase SMTP Configuration - Namecheap Private Email

## Current Setup

**Email**: noreply@compsync.net
**Provider**: Namecheap Private Email
**Expected Delivery**: 1-5 seconds (vs 30-60s with Supabase default)

## Configuration Steps

### 1. Navigate to Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your CompPortal project
3. Navigate to: **Authentication** → **Email Templates** (or **Settings** → **Auth**)
4. Scroll down to: **SMTP Settings**

### 2. Enable Custom SMTP

Click **Enable Custom SMTP Server**

### 3. Enter SMTP Credentials

```
SMTP Host: mail.privateemail.com
SMTP Port: 587
SMTP Username: noreply@compsync.net
SMTP Password: V#;TqHBku:q8)a3
Sender Email: noreply@compsync.net
Sender Name: CompSync
```

**Connection Security**: TLS/STARTTLS (auto-detected on port 587)

### 4. Test Configuration

1. Click **Save**
2. Supabase will send a test email
3. Check `noreply@compsync.net` inbox for test confirmation
4. If successful, test with actual signup

### 5. Verify DNS Records (Optional but Recommended)

To prevent emails going to spam, ensure these DNS records exist for `compsync.net`:

**SPF Record** (TXT):
```
v=spf1 include:spf.privateemail.com ~all
```

**DKIM Record**:
- Namecheap provides this automatically
- Check: Namecheap Dashboard → Private Email → DKIM

**DMARC Record** (TXT):
```
v=DMARC1; p=quarantine; rua=mailto:noreply@compsync.net
```

### 6. Test Signup Flow

1. Go to: https://comp-portal.vercel.app/signup
2. Sign up with a test email
3. Email should arrive in **1-5 seconds**
4. Check spam folder if not received

## Troubleshooting

### Emails Still Slow
- Verify SMTP credentials are correct
- Check Namecheap Private Email status page
- Ensure port 587 is not blocked (try port 465 with SSL)

### Emails Going to Spam
- Add SPF/DKIM/DMARC records above
- Ask recipients to whitelist `noreply@compsync.net`
- Consider using subdomain: `mail.compsync.net`

### Authentication Failed
- Double-check password (special characters: `#;:)` )
- Try resetting password in Namecheap dashboard
- Ensure email account is active

## Security Note

**IMPORTANT**: After configuration, consider:
1. Changing the password to a new strong password
2. Using Supabase's environment variable storage for credentials
3. Enabling 2FA on Namecheap account

## Alternative Ports

If port 587 doesn't work, try:

**Port 465 (SSL)**:
```
SMTP Host: mail.privateemail.com
SMTP Port: 465
Connection Security: SSL/TLS
```

**Port 25 (Unencrypted - NOT recommended)**:
```
SMTP Host: mail.privateemail.com
SMTP Port: 25
Connection Security: None
```

## Expected Results

- **Before**: 30-60+ second email delivery (Supabase shared SMTP)
- **After**: 1-5 second email delivery (Namecheap Private Email)

## Verification

After setup, check delivery time:
```sql
-- Check recent signups
SELECT email, created_at, confirmed_at,
       (confirmed_at - created_at) as confirmation_delay
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

Fast emails = confirmation_delay under 10 seconds
