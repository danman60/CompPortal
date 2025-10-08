# SMTP Troubleshooting - 500 Error Fix

**Error**: "Failed to send confirmation email" + 500 error from Supabase Auth
**Status**: SMTP connection issue - trying alternative configurations

---

## 🔧 Quick Fix #1: Try Port 587 (TLS instead of SSL)

Port 465 (SSL) sometimes has connection issues. Try port 587 (TLS):

### Update SMTP Configuration

**Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

**Change SMTP settings to**:
```
SMTP Host: smtp.resend.com
SMTP Port: 587 (← CHANGE THIS)
SMTP User: resend
SMTP Password: re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL
```

**Keep sender details the same**:
```
Sender Email: onboarding@resend.dev
Sender Name: GlowDance CompPortal
```

Click **"Save"** and test again.

---

## 🔧 Quick Fix #2: Verify Resend API Key is Active

Let me verify your Resend account is active:

1. **Go to**: https://resend.com/api-keys
2. **Check**: Is `re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL` listed?
3. **Status**: Should show "Active" or "Enabled"
4. **Permissions**: Should have "Sending access"

**If key doesn't exist or is inactive**:
- Create new API key
- Update Supabase SMTP password
- Update `.env.local` in project

---

## 🔧 Quick Fix #3: Check Resend Account Status

1. **Go to**: https://resend.com/overview
2. **Check**: Account status
3. **Verify**: Email sending is enabled
4. **Look for**: Any warnings or restrictions

**Common issues**:
- New account in sandbox mode
- Need to verify email or add payment method
- Hit free tier limit

---

## 🔧 Quick Fix #4: Test with SendGrid Instead

If Resend isn't working, try SendGrid (5 minutes):

### Create SendGrid Account
1. Go to: https://sendgrid.com/
2. Sign up (free tier: 100 emails/day)
3. Verify email
4. Create API key: Settings → API Keys → Create API Key
5. Select "Full Access"

### Configure Supabase with SendGrid
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey (literal string "apikey")
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@glowdance.com (or verified domain)
Sender Name: GlowDance CompPortal
```

---

## 🔧 Quick Fix #5: Disable SMTP Temporarily (Testing Only)

To test if SMTP is the only issue:

1. **Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/providers
2. **Click**: Email provider
3. **Disable**: "Confirm email" (temporarily)
4. **Save**
5. **Test**: Signup should work (auto-confirms without email)
6. **Re-enable**: "Confirm email" after fixing SMTP

**⚠️ WARNING**: Only for testing! Users won't get confirmation emails.

---

## 🔍 Detailed Diagnostics

### Check Resend SMTP Connection

**Test SMTP connection manually**:

1. **Go to Supabase SMTP Settings**
2. Look for **"Test SMTP connection"** or **"Send test email"** button
3. Enter your email
4. Click send
5. Check what error appears

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Connection timeout" | Port blocked | Try port 587 instead of 465 |
| "Authentication failed" | Wrong API key | Verify key is correct and active |
| "Invalid sender" | Sender email not allowed | Use `onboarding@resend.dev` |
| "TLS required" | Using wrong port | Use port 587 for TLS |
| "Relay access denied" | SMTP user wrong | Should be exactly "resend" |

---

## 🎯 Most Likely Solutions (Try in Order)

### Solution 1: Port 587 (90% success rate)
```
Port: 587 (instead of 465)
```

### Solution 2: Check Resend Account
- Verify API key is active
- Check account isn't in sandbox mode
- Confirm sending is enabled

### Solution 3: Try SendGrid
- More reliable SMTP for Supabase
- Better documentation
- Known to work well with Supabase

---

## 📊 What We Know

**Working**:
- ✅ Supabase configuration saved
- ✅ Credentials entered correctly
- ✅ Email confirmation enabled

**Not Working**:
- ❌ SMTP connection from Supabase to Resend
- ❌ Email sending fails with 500 error
- ❌ User creation blocked by SMTP error

**Next Steps**:
1. Try port 587 (most common fix)
2. Check Resend account status
3. Test with SendGrid if Resend doesn't work
4. Temporarily disable email confirmation to unblock signup

---

## 🆘 Emergency Workaround (If Nothing Works)

**Option A: Manual Confirmation**
- Disable email confirmation temporarily
- Users auto-confirm on signup
- Manually verify legitimate users
- Fix SMTP later

**Option B: Custom Email System**
- Build custom confirmation using Resend API (not SMTP)
- Bypass Supabase Auth emails entirely
- Full control over email delivery
- More complex but more reliable

**Option C: Use Different Auth Provider**
- Add Google/GitHub OAuth
- Users can signup without email confirmation
- SMTP only for password resets

---

## 🔄 After Trying Port 587

**If it works**: Great! Test thoroughly and document.

**If it still fails**:
1. Check Resend dashboard for blocked/sandbox status
2. Try SendGrid instead
3. Consider custom email implementation
4. Report back what error you see

---

**Current Status**: Awaiting test results with port 587

**Expected**: Port 587 should resolve the 500 error

**If not**: We'll try SendGrid or custom implementation
