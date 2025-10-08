# Resend Sandbox Mode - Immediate Fix

**Issue**: "You can only send testing emails to your own email address"
**Cause**: Resend account in sandbox mode until domain verified
**Solution**: Use Resend's default sender (no verification needed)

---

## ✅ Immediate Fix (2 Minutes)

### Change Sender Email to Resend's Default

1. **Go to Supabase SMTP Settings**:
   https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

2. **Change ONLY the sender email**:
   ```
   BEFORE: Sender Email: noreply@glowdance.com
   AFTER:  Sender Email: onboarding@resend.dev
   ```

3. **Keep everything else the same**:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 465 (or 587)
   SMTP User: resend
   SMTP Password: re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL
   Sender Name: GlowDance CompPortal
   ```

4. **Click "Save"**

5. **Test immediately**:
   - Open incognito browser
   - Go to: https://comp-portal-one.vercel.app/signup
   - Create test account with ANY email address
   - Email will arrive within 1-2 minutes

---

## Why This Works

- **Resend's default domain** (`onboarding@resend.dev`) is pre-verified
- **No sandbox restrictions** apply to this sender
- **Works for all recipient emails** (not just yours)
- **No domain verification needed** to start testing

---

## To Answer Your Question: "Do I use Vercel domain?"

**No** - Vercel domains are for website hosting, not email sending.

**Email domains explained**:
- ❌ **comp-portal-one.vercel.app** = Hosting domain (can't send email)
- ✅ **onboarding@resend.dev** = Resend's email domain (works now)
- ✅ **noreply@glowdance.com** = Your domain (needs verification)

**For production**, you'll eventually want to verify your own domain (glowdance.com), but for testing and early launch, `onboarding@resend.dev` works perfectly fine.

---

## Production Domain Verification (Later)

When you're ready to use `noreply@glowdance.com`:

### Option A: Verify glowdance.com in Resend (Recommended)
1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Add: `glowdance.com`
4. Add DNS records (SPF, DKIM, DMARC)
5. Wait 5-10 minutes for verification
6. Update Supabase sender to: `noreply@glowdance.com`

**Benefits**:
- Professional sender address
- Better deliverability
- Brand recognition
- Higher sending limits

### Option B: Use SendGrid Instead
If you prefer different SMTP provider:
1. Create account: https://sendgrid.com/
2. Get SMTP credentials
3. Update Supabase SMTP settings
4. SendGrid has easier domain verification

### Option C: Register Cheap Domain for Email
If glowdance.com isn't available:
- Register domain just for email ($10-15/year)
- Examples: glowdanceportal.com, glowdance-comp.com
- Verify in Resend
- Use for all system emails

---

## Current vs Production Email

### Testing/Launch (Use Now)
```
From: GlowDance CompPortal <onboarding@resend.dev>
```
- ✅ Works immediately
- ✅ No verification needed
- ✅ Free tier: 3,000 emails/month
- ⚠️ Generic sender domain

### Production (After Domain Verification)
```
From: GlowDance CompPortal <noreply@glowdance.com>
```
- ✅ Professional sender
- ✅ Better deliverability
- ✅ Brand recognition
- ⚠️ Requires DNS access

---

## Test Plan

### Test 1: Confirm Email Works Now
1. Change sender to `onboarding@resend.dev`
2. Save in Supabase
3. Test signup with temp email: https://temp-mail.org
4. Verify email arrives
5. Click confirmation link

### Test 2: Test with Multiple Providers
- Gmail
- Outlook
- Yahoo
- Check spam folders

### Test 3: Verify Email Content
- Branding looks correct
- Links work
- Redirect to dashboard works

---

## Next Steps

**RIGHT NOW** (2 minutes):
1. Change sender email to `onboarding@resend.dev`
2. Save in Supabase
3. Test signup

**LATER** (when ready for production):
1. Get DNS access to glowdance.com
2. Verify domain in Resend
3. Switch sender to `noreply@glowdance.com`

---

**Bottom Line**: You can launch and test with `onboarding@resend.dev` sender. Domain verification is optional for now, recommended for later.
