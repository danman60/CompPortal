# Supabase Redirect URLs - Quick Fix

**Current Status**:
- ✅ Site URL: `https://comp-portal-one.vercel.app` (correct!)
- ❌ Redirect URLs: `http://localhost:3000/*` (needs production URL added)

---

## 🔧 Quick Fix (2 minutes)

The Vercel integration set the Site URL correctly, but we need to **add** the production URL to redirect URLs (not replace localhost - keep both).

### Steps to Add Production URL

1. **Go to Supabase Auth Configuration**:
   https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/url-configuration

2. **In the "Redirect URLs" field, add these lines** (keep the localhost one):
   ```
   http://localhost:3000/*
   https://comp-portal-one.vercel.app/*
   https://comp-portal-one.vercel.app/auth/callback
   https://comp-portal-one.vercel.app/dashboard
   ```

3. **Click "Save"** at the bottom

---

## ✅ Expected Final Configuration

After adding the URLs, you should see:

**Site URL**:
```
https://comp-portal-one.vercel.app
```

**Redirect URLs** (all of these):
```
http://localhost:3000/*
https://comp-portal-one.vercel.app/*
https://comp-portal-one.vercel.app/auth/callback
https://comp-portal-one.vercel.app/dashboard
```

---

## 🧪 Test After Adding

Once saved, test signup confirmation:

1. Open incognito browser
2. Go to: https://comp-portal-one.vercel.app/signup
3. Create test account with temp email
4. Check confirmation email
5. Verify link points to production URL
6. Click link, verify redirect works

---

## 📝 Why We Need Both

- `http://localhost:3000/*` - For local development
- `https://comp-portal-one.vercel.app/*` - For production
- Having both allows seamless dev + prod workflow

---

**Status**: Ready to add redirect URLs and test
