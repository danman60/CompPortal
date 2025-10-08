# Resend API Key Error - SMTP Permission Fix

**Error**: "restricted_api_key: This API key is restricted to only send emails" (401)
**Cause**: Current API key has "Sending Access" only - SMTP requires "Full Access"
**Solution**: Create new API key with full permissions

---

## 🔧 Fix: Create Full Access API Key (3 Minutes)

### Step 1: Create New API Key

1. **Go to Resend API Keys**:
   https://resend.com/api-keys

2. **Click "Create API Key"**

3. **Settings**:
   ```
   Name: CompPortal SMTP (or any name)
   Permission: Full Access ← IMPORTANT!
   ```

4. **Click "Create"**

5. **Copy the API key** (shows once only!)
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Update Supabase SMTP Password

1. **Go to Supabase SMTP Settings**:
   https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

2. **Update SMTP Password**:
   ```
   SMTP Password: [Your NEW Full Access API Key]
   ```

3. **Keep everything else the same**:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 587
   SMTP User: resend
   Sender Email: onboarding@resend.dev
   ```

4. **Click "Save"**

### Step 3: Update .env.local (Optional but Recommended)

Update your local environment file:

```bash
# Old key (Sending Access only - doesn't work for SMTP)
# RESEND_API_KEY=re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL

# New key (Full Access - works for SMTP)
RESEND_API_KEY=re_[YOUR_NEW_KEY_HERE]
```

### Step 4: Test

1. Open incognito browser
2. Go to: https://comp-portal-one.vercel.app/signup
3. Create test account
4. Check for confirmation email (should arrive in 1-2 minutes)

---

## Why This Happens

**Resend has two API key permission levels**:

### "Sending Access" (Your Current Key)
- ✅ Can send emails via Resend API
- ❌ Cannot use for SMTP authentication
- ❌ Restricted to API-only operations

### "Full Access" (What You Need)
- ✅ Can send emails via Resend API
- ✅ Can use for SMTP authentication
- ✅ Can manage domains, webhooks, etc.

**SMTP requires Full Access** to authenticate properly.

---

## API Key Comparison

| Feature | Sending Access | Full Access |
|---------|----------------|-------------|
| Send via API | ✅ | ✅ |
| SMTP Authentication | ❌ | ✅ |
| Manage Domains | ❌ | ✅ |
| Manage Webhooks | ❌ | ✅ |
| View Analytics | ❌ | ✅ |

---

## Security Note

**Full Access keys are more powerful** - treat them carefully:
- ✅ Store in environment variables (not code)
- ✅ Use different keys for dev/production
- ✅ Rotate keys periodically
- ✅ Never commit to git

**Your old "Sending Access" key** is still useful:
- Keep it for API-based email sending (like invoice delivery)
- More secure for frontend operations
- Can't accidentally delete domains/settings

---

## After Creating New Key

### Update in 3 Places:

1. **Supabase SMTP Settings** (for Auth emails):
   - Use new Full Access key as SMTP password
   - This enables signup confirmations, password resets

2. **Vercel Environment Variables** (for production API):
   ```bash
   RESEND_API_KEY=re_[NEW_KEY]
   ```
   - Go to: Vercel Dashboard → Settings → Environment Variables
   - Update RESEND_API_KEY

3. **.env.local** (for local development):
   ```bash
   RESEND_API_KEY=re_[NEW_KEY]
   ```
   - Update local file
   - Don't commit to git

---

## Alternative: Keep Both Keys (Recommended)

You can use different keys for different purposes:

```bash
# Full Access - for SMTP/Admin operations
RESEND_SMTP_KEY=re_[FULL_ACCESS_KEY]

# Sending Access - for API operations (more secure)
RESEND_API_KEY=re_[SENDING_ACCESS_KEY]
```

**In Supabase**: Use FULL_ACCESS_KEY
**In Application Code**: Use SENDING_ACCESS_KEY (principle of least privilege)

---

## Expected Timeline

1. **Create key**: 1 minute
2. **Update Supabase**: 1 minute
3. **Update env vars**: 1 minute
4. **Test signup**: 2 minutes

**Total**: 5 minutes to working email confirmations

---

## Verification Checklist

After updating:
- ✅ Supabase SMTP settings saved successfully
- ✅ Test signup doesn't show "failed to send confirmation email"
- ✅ Email arrives in inbox within 1-2 minutes
- ✅ Confirmation link works and redirects to dashboard
- ✅ No 401 errors in Resend logs

---

## If Still Not Working

Check Resend logs at: https://resend.com/emails

**Look for**:
- ✅ Email shows as "Delivered" status
- ✅ No 401 authentication errors
- ✅ Recipient email is correct

**Common issues**:
- Domain verification still needed (use onboarding@resend.dev sender)
- Email in spam folder (check spam)
- Wrong API key copied (check for typos)

---

**Next Step**: Create new Full Access API key and update Supabase SMTP password.
