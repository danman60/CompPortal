# SMTP Debugging Checklist - No Email Sent

**Issue**: Signup form submitted, no email sent, nothing in Resend logs
**Cause**: Supabase isn't attempting to send via SMTP at all
**Status**: Investigating configuration

---

## 🔍 Critical Checks (Do in Order)

### Check #1: Browser Console (MOST IMPORTANT)

**During signup test**:
1. Open browser console (F12 → Console tab)
2. Fill signup form
3. Click "Create Account"
4. **Look for errors in console**

**What to check**:
- ❌ Red error messages?
- ❌ Failed network requests?
- ❌ Supabase auth errors?
- ✅ Or does it show success?

**Report back**: What does the console show?

---

### Check #2: Supabase Email Confirmation Setting

**This is the #1 reason for no emails**:

1. **Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/providers

2. **Click**: "Email" provider (should expand)

3. **Check this setting**:
   ```
   ☑️ Confirm email
   ```
   **Is the checkbox CHECKED?**

4. **If unchecked**:
   - Users auto-confirm (no email sent)
   - Supabase doesn't call SMTP at all
   - This would explain empty Resend logs

5. **If checked**:
   - Move to Check #3

**Report back**: Is "Confirm email" enabled or disabled?

---

### Check #3: Verify SMTP Settings Saved

**Sometimes settings don't save properly**:

1. **Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

2. **Scroll to "SMTP Settings"**

3. **Verify these EXACT values**:
   ```
   ☑️ Enable Custom SMTP (checkbox checked?)

   SMTP Host: smtp.resend.com
   SMTP Port: 587
   SMTP User: resend
   SMTP Password: re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T

   Sender Email: onboarding@resend.dev
   Sender Name: GlowDance CompPortal
   ```

4. **Check**:
   - Is "Enable Custom SMTP" checkbox CHECKED?
   - Are all fields filled in correctly?
   - Did settings revert after saving?

**Report back**: Are SMTP settings present and enabled?

---

### Check #4: What Does Signup Form Show?

**After clicking "Create Account"**:

**Option A**: Shows error card
- ❌ "Failed to send confirmation email"
- ❌ Some other error message
- **Meaning**: Supabase tried to send but failed

**Option B**: Shows success card
- ✅ "Check your email!"
- ✅ Green checkmark
- **Meaning**: Supabase thinks it sent successfully

**Option C**: Nothing happens
- Form just sits there
- Loading spinner forever
- **Meaning**: Request failed or timed out

**Report back**: Which scenario describes your test?

---

### Check #5: Network Tab (If Form Submits)

1. Open DevTools → Network tab
2. Submit signup form
3. Look for request to `supabase.co/auth/v1/signup`

**Check response**:
- Status code: 200, 400, 500?
- Response body: Any error message?

**Report back**: What's the response from signup endpoint?

---

### Check #6: Test SMTP Connection Directly

**Supabase may have SMTP test feature**:

1. Go to SMTP Settings page
2. Look for **"Send test email"** or **"Test SMTP connection"** button
3. If exists, click it
4. Enter your email: danieljohnabrahamson@gmail.com
5. Check what happens

**Report back**: Does Supabase have test email feature? Does it work?

---

## 🔧 Common Issues & Fixes

### Issue: "Confirm Email" Disabled
**Symptom**: No emails, users auto-confirm
**Fix**: Enable "Confirm email" in Auth → Providers → Email

### Issue: SMTP Settings Not Saved
**Symptom**: Settings revert after clicking Save
**Fix**:
- Try different browser
- Clear browser cache
- Check for Supabase dashboard errors
- Contact Supabase support if persists

### Issue: Vercel Overwrites Settings
**Q**: "Does Vercel redeploy overwrite Supabase?"
**A**: No - Vercel and Supabase are separate:
- Vercel: Your application hosting
- Supabase: Your database and auth service
- Vercel redeploy doesn't touch Supabase settings
- **BUT**: You need the new API key in Vercel env vars too (for custom emails, not Auth emails)

### Issue: API Key in Wrong Place
**Clarification**:
- **Supabase SMTP settings**: Needs `re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T` as SMTP password
- **Vercel environment variables**: Also needs `RESEND_API_KEY=re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T` (for custom emails from your code)
- These are two different places!

---

## 🎯 Quick Test: Skip SMTP Temporarily

**To isolate the issue**:

1. Disable SMTP temporarily:
   - Go to SMTP Settings
   - Uncheck "Enable Custom SMTP"
   - Save

2. Test signup again

3. **If email arrives**: Your SMTP config was wrong
4. **If no email**: Problem is elsewhere (like "Confirm email" disabled)

---

## 📋 Information Needed

Please report back with answers to these:

1. **Browser console errors** during signup?
2. **Is "Confirm email" enabled** in Email provider settings?
3. **Are SMTP settings still there** after saving?
4. **What does signup form show** after submit (error/success/nothing)?
5. **Network tab response** from signup request?

Once I know these answers, I can give you the exact fix.

---

## 🚨 Most Likely Issues (in order)

### 1. "Confirm Email" is Disabled (70% chance)
- Go to Auth → Providers → Email
- Enable "Confirm email"
- Save and test

### 2. SMTP Settings Not Saved (20% chance)
- Settings revert after clicking Save
- Try different browser
- Check browser console for errors when saving

### 3. API Key Still Wrong (5% chance)
- Double-check you copied full key: `re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T`
- No extra spaces before/after
- Saved as SMTP Password field

### 4. Resend Account Issue (5% chance)
- Account suspended
- Payment issue
- Rate limited

---

## 🔄 Update Vercel Environment Variable

**Don't forget this step** (for custom emails from your code):

1. Go to: Vercel Dashboard → CompPortal → Settings → Environment Variables

2. **Update or Add**:
   ```
   RESEND_API_KEY=re_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T
   ```

3. **Apply to**: Production, Preview, Development

4. **Redeploy** for changes to take effect

**This is separate from Supabase SMTP** - both need the key!

---

**Next Step**: Check "Confirm email" setting first - that's the most likely cause of no emails being sent.
