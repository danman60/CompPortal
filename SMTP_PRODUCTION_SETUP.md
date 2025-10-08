# SMTP Production Setup - Supabase Auth Emails

**Goal**: Configure Supabase to use Resend SMTP for Auth emails (signup confirmations, password resets)

**Current**: Using Supabase's default email service (limited, unreliable)

**Solution**: Use Resend SMTP (you already have Resend API key configured)

---

## 🚀 Quick Setup (10 minutes)

### Step 1: Get Resend SMTP Credentials

**You already have**:
- ✅ Resend API Key: `re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL`
- ✅ Resend account active and ready to use

**Resend SMTP Details**:
```
SMTP Host: smtp.resend.com
SMTP Port: 465 (SSL) or 587 (TLS)
SMTP Username: resend
SMTP Password: re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL (same as API key!)
From Email: noreply@[YOUR_VERIFIED_DOMAIN]
```

**Note**: Resend uses your API key as the SMTP password. Simple!

---

### Step 2: Configure Supabase SMTP Settings

1. **Go to Supabase Project Settings**:
   https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

2. **Scroll to "SMTP Settings"** section

3. **Enable Custom SMTP** and enter:

   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 465
   SMTP User: resend
   SMTP Password: re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL
   ```

4. **Sender Details**:
   ```
   Sender Email: noreply@glowdance.com
   Sender Name: GlowDance CompPortal
   ```

   **⚠️ IMPORTANT**: The sender email domain must be verified in Resend!

5. **Click "Save"**

---

### Step 3: Verify Domain in Resend (If Not Already Done)

**If using custom domain** (e.g., noreply@glowdance.com):

1. Go to Resend Dashboard: https://resend.com/domains
2. Click "Add Domain"
3. Add `glowdance.com`
4. Follow DNS verification steps (add SPF, DKIM records)
5. Wait for verification (usually 5-10 minutes)

**If using Resend's domain** (temporary/testing):
```
Sender Email: noreply@updates.yourdomain.com
```
This works immediately without domain verification.

---

### Step 4: Update Email Templates

1. **Go to Supabase Email Templates**:
   https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/templates

2. **Customize "Confirm signup" template**:

```html
<h2>Confirm Your Email</h2>

<p>Hello!</p>

<p>Thank you for signing up for GlowDance CompPortal. Click the button below to confirm your email address:</p>

<a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
  Confirm Email
</a>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>If you didn't create an account, you can safely ignore this email.</p>

<p>Thanks,<br>
The GlowDance Team</p>
```

3. **Update other templates** (Magic Link, Password Reset, Email Change):
   - Use similar branded styling
   - Include proper sender signature
   - Add contact information if needed

---

## 🔧 Alternative: SendGrid SMTP (If Preferred)

If you prefer SendGrid over Resend:

### SendGrid Setup
1. Create account: https://sendgrid.com/
2. Go to Settings → API Keys → Create API Key
3. Get SMTP credentials

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 465 or 587
SMTP User: apikey (literal string "apikey")
SMTP Password: [Your SendGrid API Key]
From Email: noreply@glowdance.com
```

**Pros**: 100 emails/day free, established service
**Cons**: Requires separate account from Resend

---

## 🔧 Alternative: Amazon SES (For High Volume)

For production scale (100k+ emails):

### Amazon SES Setup
1. AWS Console → Simple Email Service
2. Verify domain
3. Request production access (starts in sandbox)
4. Create SMTP credentials

```
SMTP Host: email-smtp.[region].amazonaws.com
SMTP Port: 465 or 587
SMTP User: [AWS SMTP Username]
SMTP Password: [AWS SMTP Password]
From Email: noreply@glowdance.com
```

**Pros**: Scales to millions, very cheap ($0.10 per 1000 emails)
**Cons**: More complex setup, requires AWS account

---

## ✅ Recommended: Use Resend (You Already Have It)

**Why Resend**:
- ✅ Already configured in your app
- ✅ Already have API key
- ✅ Same credentials for SMTP
- ✅ Good deliverability
- ✅ Simple setup
- ✅ 3,000 emails/month free
- ✅ Good for startups

**Steps**:
1. Use existing Resend API key as SMTP password
2. Configure in Supabase SMTP settings
3. Verify your domain (or use Resend subdomain)
4. Update email templates
5. Test!

---

## 🧪 Testing SMTP Configuration

### Test 1: Send Test Email from Supabase
1. After configuring SMTP, go to:
   https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth
2. Look for "Send test email" button
3. Enter your email
4. Click send
5. Check inbox (and spam)

### Test 2: Signup Test
1. Create new test account on production
2. Use temp email: https://temp-mail.org
3. Check for confirmation email
4. Verify email arrives within 1-2 minutes
5. Click link, verify redirect works

### Test 3: Password Reset
1. Go to login page
2. Click "Forgot password"
3. Enter test email
4. Check for reset email
5. Verify link works

---

## 📊 Expected Results After SMTP Setup

**Before** (Supabase default):
- ❌ Emails unreliable
- ❌ Limited sending
- ❌ No customization
- ❌ May not arrive

**After** (Resend SMTP):
- ✅ Reliable delivery
- ✅ 3,000 emails/month free
- ✅ Full template customization
- ✅ Tracking and analytics
- ✅ Professional sender domain
- ✅ Better deliverability

---

## 🔍 Troubleshooting

### Issue: "SMTP Authentication Failed"
**Solution**:
- Verify API key is correct
- Check username is exactly "resend"
- Ensure no extra spaces in credentials

### Issue: "Invalid Sender Email"
**Solution**:
- Domain must be verified in Resend
- Or use Resend's subdomain: `updates.yourdomain.com`
- Check sender email matches verified domain

### Issue: Emails Still Not Arriving
**Solution**:
1. Check Resend dashboard for send logs
2. Check spam folder
3. Verify SMTP credentials saved correctly
4. Test with multiple email providers

### Issue: "SMTP Connection Timeout"
**Solution**:
- Try port 587 instead of 465
- Check firewall settings
- Verify SMTP host is exactly `smtp.resend.com`

---

## 📋 Quick Reference

### Resend SMTP Configuration
```
Host: smtp.resend.com
Port: 465 (SSL) or 587 (TLS)
User: resend
Pass: re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL
From: noreply@glowdance.com (or verified domain)
```

### Where to Configure
- **Supabase**: Project Settings → Auth → SMTP Settings
- **Resend Dashboard**: https://resend.com/overview
- **Domain Verification**: https://resend.com/domains

### After Setup
1. ✅ Enable "Confirm email" in Auth providers
2. ✅ Update email templates with branding
3. ✅ Test signup flow end-to-end
4. ✅ Monitor Resend dashboard for delivery

---

## 🚀 Implementation Checklist

- [ ] Get Resend SMTP credentials (already have API key)
- [ ] Configure SMTP in Supabase Auth settings
- [ ] Verify sender domain in Resend (or use Resend subdomain)
- [ ] Update Supabase email templates with branding
- [ ] Enable "Confirm email" in Email provider settings
- [ ] Test signup confirmation email
- [ ] Test password reset email
- [ ] Test email change confirmation
- [ ] Monitor first 10-20 emails for delivery
- [ ] Document configuration in project docs

---

## 💰 Cost Comparison

### Resend (Recommended)
- **Free Tier**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails
- **Your Usage**: ~100-500 emails/month (Auth emails only)
- **Cost**: FREE for your scale

### SendGrid
- **Free Tier**: 100 emails/day (3,000/month)
- **Paid**: $19.95/month for 50,000 emails
- Similar pricing to Resend

### Amazon SES
- **Cost**: $0.10 per 1,000 emails
- **Your Usage**: ~$0.05/month
- Cheapest but more complex

**Recommendation**: Stick with Resend (already configured, simple, free at your scale)

---

## 🎯 Next Steps

1. **RIGHT NOW** (5 minutes):
   - Configure SMTP in Supabase with Resend credentials above
   - Enable "Confirm email" in Email provider settings

2. **TEST** (5 minutes):
   - Create test account
   - Verify email arrives
   - Check email looks good

3. **VERIFY** (2 minutes):
   - Check Resend dashboard shows email sent
   - Confirm delivery successful
   - Test with different email providers (Gmail, Outlook)

**Total Time**: 12 minutes to full SMTP production setup

---

**Ready to configure?** Use the Resend credentials above in Supabase SMTP settings!
