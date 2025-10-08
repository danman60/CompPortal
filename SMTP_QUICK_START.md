# SMTP Quick Start - 5 Minute Setup

**Your Resend API Key**: `re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL`

---

## 🚀 Step-by-Step Setup (5 minutes)

### Step 1: Configure SMTP in Supabase (3 minutes)

1. **Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/settings/auth

2. **Scroll down to "SMTP Settings"**

3. **Click "Enable Custom SMTP"**

4. **Enter these exact values**:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 465
   SMTP User: resend
   SMTP Password: re_RY89G5sR_6xYgH12W135RGuJYE16NgAAL
   ```

5. **Sender Details**:
   ```
   Sender Email: noreply@glowdance.com
   Sender Name: GlowDance CompPortal
   ```

   **Note**: If `noreply@glowdance.com` doesn't work, use Resend's default:
   ```
   Sender Email: onboarding@resend.dev
   ```

6. **Click "Save"** at the bottom

---

### Step 2: Enable Email Confirmation (1 minute)

1. **Go to**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/providers

2. **Click "Email" provider**

3. **Make sure these are ENABLED**:
   - ✅ **Enable email provider**
   - ✅ **Confirm email**

4. **Click "Save"**

---

### Step 3: Test (1 minute)

1. **Open incognito browser**
2. **Go to**: https://comp-portal-one.vercel.app/signup
3. **Create test account** with temp email
4. **Check email** (should arrive in 1-2 minutes)
5. **Click confirmation link**

---

## ✅ Expected Result

After setup:
- ✅ Signup sends confirmation email via Resend SMTP
- ✅ Email arrives within 1-2 minutes
- ✅ Click link confirms account
- ✅ User can log in

---

## 🔧 If Email Doesn't Arrive

### Quick Fix: Use Resend's Default Sender
If you haven't verified `glowdance.com` domain yet:

1. Go back to SMTP Settings
2. Change sender email to: `onboarding@resend.dev`
3. Save and test again

This works immediately without domain verification.

### Verify in Resend Dashboard
1. Go to: https://resend.com/emails
2. Check if email shows as sent
3. Check delivery status

---

## 📱 Next: Verify Domain (Optional but Recommended)

**For production, verify your domain** (5-10 minutes):

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Add: `glowdance.com`
4. Add DNS records (SPF, DKIM, DMARC)
5. Wait for verification
6. Update sender email to: `noreply@glowdance.com`

**Benefits**:
- ✅ Better deliverability
- ✅ Professional sender address
- ✅ Brand recognition
- ✅ Higher email limits

---

## 🎯 Summary

**What you need to do RIGHT NOW**:
1. Paste SMTP credentials into Supabase (3 min)
2. Enable email confirmation (1 min)
3. Test signup (1 min)

**Total time**: 5 minutes

**Then everything will work** - signup confirmations, password resets, email changes!

---

**See full documentation**: `SMTP_PRODUCTION_SETUP.md` for troubleshooting and advanced options
