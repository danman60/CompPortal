# SMTP 500 Error - Detailed Debugging

**Error**: `cafugvuaatsgihrsmvvl.supabase.co/auth/v1/signup` returns 500
**Meaning**: Supabase Auth tried to send email via SMTP and it failed
**Result**: User creation rolled back (no user created in database)

---

## 🔍 Why Settings "Look Correct" But Still Fail

Even if settings appear unchanged, SMTP can fail for:
1. **API key regenerated** in Resend (old key in Supabase)
2. **Port mismatch** (465 vs 587 behavior changed)
3. **Resend account issue** (suspended, rate limited)
4. **Sender domain** requires verification now

---

## 🧪 Test #1: Verify Resend API Key Works

**Run this test** (takes 10 seconds):

```bash
cd D:\ClaudeCode\CompPortal
node test-resend-api.js
```

**Expected Results**:

**✅ If SUCCESS**:
- Email will be sent via Resend API
- Check your inbox: danieljohnabrahamson@gmail.com
- Check Resend logs: https://resend.com/emails
- **Conclusion**: API key is valid and working

**❌ If FAILED**:
- Error will show why API key doesn't work
- **Possible causes**:
  - API key was regenerated/revoked
  - API key lost Full Access permissions
  - Resend account suspended
- **Fix**: Create new API key in Resend dashboard

---

## 🔍 Test #2: Check Exact SMTP Settings in Supabase

**Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

**Compare these EXACTLY**:

### Current Settings Should Be:
```
☑️ Enable Custom SMTP (checkbox MUST be checked)

SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T

Sender Email: onboarding@resend.dev
Sender Name: GlowDance CompPortal
```

**Critical checks**:
- [ ] Port is **587** (not 465)
- [ ] User is **resend** (lowercase, no typos)
- [ ] Password is the FULL ACCESS key
- [ ] Sender is **onboarding@resend.dev** (Resend's default)

---

## 🔍 Test #3: Check Resend Account Status

**Go to**: https://resend.com/overview

**Check for**:
- ⚠️ Warning banners (account issues)
- ⚠️ "Verify your account" messages
- ⚠️ "Payment required" notices
- ⚠️ Suspended/limited status

**Also check**: https://resend.com/api-keys
- Is `re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T` listed?
- Status: **Active** or **Revoked**?
- Permissions: **Full Access** or **Sending Access**?

---

## 🔍 Test #4: Try Supabase's SMTP Test Feature

**On SMTP Settings page**:

**Look for**: "Send test email" button (may be at bottom)

**If exists**:
1. Click it
2. Enter: danieljohnabrahamson@gmail.com
3. Click send
4. **Watch for**:
   - Success message → SMTP works from Supabase
   - Error message → Shows exact SMTP error
   - 500 error → Same issue as signup

**Result**:
- ✅ Test succeeds → SMTP works, signup should work
- ❌ Test fails with error → Shows exact problem
- ❌ Test fails with 500 → Need to check Resend account/key

---

## 🔧 Most Likely Fixes

### Fix #1: Regenerate API Key in Resend

**Why**: Old key may be revoked or lost permissions

**Steps**:
1. Go to: https://resend.com/api-keys
2. Check if current key `re_iwv9H3gt_...` shows as **Revoked** or **Inactive**
3. If yes, create NEW key:
   - Click "Create API Key"
   - Name: CompPortal SMTP 2
   - Permission: **Full Access** ⭐
   - Click Create
4. Copy new key
5. Update in Supabase SMTP settings
6. Click Save
7. Test again

---

### Fix #2: Switch to Port 465 (or back to 587)

**Why**: Sometimes Resend SMTP behavior changes

**Current**: Port 587 (TLS)
**Try**: Port 465 (SSL)

**Steps**:
1. Change Port to: **465**
2. Click Save
3. Test signup again

**OR if currently 465**:
1. Change Port to: **587**
2. Click Save
3. Test signup again

---

### Fix #3: Try Different Sender Email

**Why**: `onboarding@resend.dev` might have restrictions now

**Try these in order**:

**Option A**: Use your email as sender
```
Sender Email: danieljohnabrahamson@gmail.com
```

**Option B**: Use Resend subdomain (if you have one)
```
Sender Email: noreply@yourdomain.resend.dev
```

**Option C**: Verify and use glowdance.com
1. Go to: https://resend.com/domains
2. Add domain: glowdance.com
3. Add DNS records
4. Wait for verification
5. Use: noreply@glowdance.com

---

### Fix #4: Disable Email Confirmation Temporarily

**To isolate SMTP issue**:

1. Go to: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/providers
2. Click "Email"
3. **Uncheck**: "Confirm email"
4. Click Save
5. Test signup again

**Expected**:
- ✅ Signup succeeds → SMTP was the issue
- ❌ Signup still fails → Different problem

**⚠️ WARNING**: Users won't get confirmation emails. Only for testing!

---

## 📊 Diagnostic Summary

| Test | Purpose | If Fails → Action |
|------|---------|------------------|
| API Key Test | Verify Resend API works | Regenerate API key |
| SMTP Settings | Verify configuration | Fix typos/port |
| Resend Account | Check account status | Fix account issues |
| Supabase Test | Test from Supabase | Shows exact error |

---

## 🆘 If Nothing Works

**Last resort options**:

### Option A: Use SendGrid Instead
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [SendGrid API Key]
From: noreply@glowdance.com
```

**Why**: SendGrid is more reliable for Auth emails

### Option B: Disable SMTP, Use Supabase Default
1. Uncheck "Enable Custom SMTP"
2. Supabase will use its default email service
3. Limited but works for testing

---

## 📋 Report Back

**After running tests, tell me**:

1. **API Key Test** (node test-resend-api.js):
   - [ ] SUCCESS / FAILED?
   - [ ] If failed, what error?

2. **Resend Dashboard Check**:
   - [ ] API key shows as: Active / Revoked / Not found?
   - [ ] Account shows warnings: YES / NO?

3. **Supabase SMTP Test** (if button exists):
   - [ ] Test succeeded: YES / NO?
   - [ ] Error message: (copy here)

4. **Current SMTP Settings**:
   - [ ] Port: 587 or 465?
   - [ ] Sender: onboarding@resend.dev or different?

Once I know these, I can give you the exact fix!

---

**Most likely**: API key was regenerated and old key is in Supabase. Just need new key!
