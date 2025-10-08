# Email Not Sending - Troubleshooting Checklist

**Issue**: Emails not sending, nothing in Resend logs
**Meaning**: Supabase isn't calling SMTP at all

---

## ✅ Check These Settings (In Order)

### 1. Verify SMTP Settings Still Exist in Supabase

**Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

**Scroll to "SMTP Settings"**

**Check**:
- [ ] ☑️ **"Enable Custom SMTP"** checkbox is CHECKED
- [ ] **SMTP Host**: `smtp.resend.com`
- [ ] **SMTP Port**: `587` (or `465`)
- [ ] **SMTP User**: `resend`
- [ ] **SMTP Password**: `re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T` (Full Access key)
- [ ] **Sender Email**: `onboarding@resend.dev`
- [ ] **Sender Name**: `GlowDance CompPortal`

**If any are missing/wrong**: Settings may have been reset. Re-enter them and click **Save**.

---

### 2. Verify "Confirm Email" is Still Enabled

**Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/providers

**Click**: "Email" provider (should expand)

**Check**:
- [ ] ☑️ **"Confirm email"** checkbox is CHECKED

**If unchecked**: Users auto-confirm without emails. Enable it and click **Save**.

---

### 3. Test SMTP Connection in Supabase

**On SMTP Settings page**:

**Look for**: "Send test email" or "Test SMTP connection" button

**If exists**:
1. Click it
2. Enter: `danieljohnabrahamson@gmail.com`
3. Click send
4. Check Resend logs: https://resend.com/emails
5. Check your inbox

**Result**:
- ✅ Email arrives → SMTP works, issue is elsewhere
- ❌ Email fails → Check error message in Supabase
- ❌ Nothing in Resend logs → SMTP not configured or not calling Resend

---

### 4. Check Recent Changes in Supabase Dashboard

**Possible issue**: Settings may have been reset during Supabase updates or changes.

**Check**:
1. Was Supabase project restarted recently?
2. Were any Auth settings changed?
3. Was database migrated or restored?

---

### 5. Browser Console Errors During Signup

**Test signup again**:
1. Open incognito browser
2. Open DevTools (F12)
3. Go to Console tab
4. Try signup: https://comp-portal-one.vercel.app/signup
5. Watch for errors

**Look for**:
- 500 errors from Supabase
- SMTP errors
- Network failures
- Rate limiting messages

**Report back**: What errors appear?

---

### 6. Vercel Environment Variable (For Custom Emails)

**Note**: This is separate from Supabase Auth emails!

**Go to**: Vercel Dashboard → CompPortal → Settings → Environment Variables

**Check**:
- [ ] `RESEND_API_KEY` exists
- [ ] Value: `re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T`
- [ ] Applied to: Production, Preview, Development

**If missing/wrong**:
1. Add or update the variable
2. Redeploy: Deployments → Latest → "Redeploy"

**Impact**: This only affects custom emails (invoices, etc.), NOT signup confirmations.

---

## 🔍 Most Likely Causes

### Cause #1: "Enable Custom SMTP" Checkbox Unchecked (80%)
- Supabase settings may have been reset
- SMTP disabled by accident
- **Fix**: Re-enable and save

### Cause #2: "Confirm Email" Disabled (15%)
- Users auto-confirming without emails
- No SMTP calls made
- **Fix**: Enable in Email provider settings

### Cause #3: SMTP Settings Lost (5%)
- Settings reverted to default
- Need to re-enter credentials
- **Fix**: Re-enter all SMTP settings

---

## 🧪 Quick Test

**After fixing settings**:

1. **Create new test account**:
   - Incognito browser
   - New email address (use temp-mail.org)
   - Submit signup

2. **Check immediately**:
   - Resend logs: https://resend.com/emails (should show new email within 10 seconds)
   - Temp email inbox (email should arrive in 1-2 minutes)
   - Browser console (any errors?)

3. **If still not working**:
   - Screenshot Supabase SMTP settings
   - Screenshot Email provider settings
   - Copy browser console errors
   - Share with me

---

## 📋 Report Back

**Please check and tell me**:

1. **SMTP Settings Status**:
   - [ ] Enable Custom SMTP checkbox: CHECKED / UNCHECKED?
   - [ ] All fields filled correctly: YES / NO / SOME MISSING?

2. **Email Provider Status**:
   - [ ] Confirm email checkbox: CHECKED / UNCHECKED?

3. **Test Result**:
   - [ ] Test email sent from Supabase: SUCCESS / FAILED / NO BUTTON?
   - [ ] Email in Resend logs: YES / NO?
   - [ ] Email received: YES / NO?

4. **Browser Console**:
   - [ ] Any errors during signup: YES / NO?
   - [ ] Error messages: (copy here)

Once I know these answers, I can provide the exact fix!

---

**Most likely**: SMTP settings got reset. Just need to re-enter them and click Save.
