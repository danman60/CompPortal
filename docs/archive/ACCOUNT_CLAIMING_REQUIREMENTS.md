# Account Claiming Workflow - Requirements & Status

**Date:** October 31, 2025
**Status:** ⚠️ PARTIAL - Need to create `/claim` route

---

## 🎯 Current State

### ✅ What's Complete

1. **Pre-Approved Studios in Database**
   - 54 studios with `owner_id = NULL`, `status = 'approved'`
   - Each has unique `public_code` (5 characters)
   - All have approved reservations ready

2. **Email Invitation System** ✅ READY
   - Super admin button on dashboard
   - Beautiful HTML email template
   - Shows all studio details (entries, deposits, credits)
   - Includes claim URL: `https://{tenant}.compsync.net/claim?code={PUBLIC_CODE}`
   - Manual trigger only (never auto-send)

3. **Onboarding Flow** ✅ EXISTS (`/onboarding`)
   - 3-step wizard (personal info → studio info → review)
   - Creates or updates studio on current tenant
   - Updates user profile with name
   - Sets consent flags
   - Redirects to dashboard after completion

### ⚠️ What's Missing

**Need to create `/claim` route** that:
1. Accepts `?code=PUBLIC_CODE` query parameter
2. Validates code exists and studio unclaimed (`owner_id = NULL`)
3. Shows studio name for verification
4. Redirects to signup if not authenticated
5. Redirects to login if not authenticated
6. After auth, updates `studios.owner_id` with authenticated user ID
7. Redirects to dashboard

---

## 📋 Account Claiming Flow (Complete)

### Step 1: Super Admin Sends Invitations
**Location:** Super admin dashboard (`/dashboard`)
**Button:** "Send Studio Invitations" (purple/pink gradient)

**Process:**
1. Super admin clicks button
2. Modal shows list of 54 unclaimed studios
3. Can select individual or all studios
4. Clicks "Send (X)" button
5. System sends HTML emails with claim URLs

**Email Content:**
```
Subject: Claim Your {Tenant Name} Account - {Studio Name}

Body:
- Studio name
- List of reservations (competition, entries, deposits, credits)
- Total summary
- Studio code: {PUBLIC_CODE}
- **CTA Button:** "Claim Your Account →"
- Link: https://{tenant}.compsync.net/claim?code={PUBLIC_CODE}
```

---

### Step 2: Studio Director Clicks Claim URL
**URL:** `https://{tenant}.compsync.net/claim?code={PUBLIC_CODE}`

**Scenarios:**

#### A) Not Authenticated → Redirect to Signup
```
1. Studio director clicks email link
2. System checks if authenticated
3. NOT authenticated → redirect to /signup with:
   - returnUrl=/claim?code={PUBLIC_CODE}
   - Prefill email if possible
```

#### B) Authenticated → Claim Studio
```
1. Studio director clicks email link
2. System checks if authenticated
3. IS authenticated → show claim page:
   - "You're about to claim: {Studio Name}"
   - "Your account: {user email}"
   - "Confirm to gain access to your dashboard"
4. User clicks "Claim Studio"
5. System updates: studios.owner_id = user.id
6. System checks if onboarding complete:
   - If no first_name/last_name → redirect to /onboarding
   - If complete → redirect to /dashboard
```

---

### Step 3: Studio Director Signs Up (If Needed)
**URL:** `/signup` (already exists)

**Process:**
1. Studio director creates Supabase auth account
2. System creates `user_profiles` record:
   - role = 'studio_director'
   - tenant_id = current tenant
3. After signup, redirect back to /claim?code={PUBLIC_CODE}
4. NOW authenticated, proceed to Step 2B

---

### Step 4: Studio Director Completes Onboarding
**URL:** `/onboarding` (already exists)

**3-Step Wizard:**
1. **Personal Info:** First name, last name
2. **Studio Info:**
   - Studio name (editable, prefilled from pre-approved data)
   - Address, city, province, postal code, phone
   - Consent checkboxes (photo/video, legal info)
3. **Review:** Confirm all details

**What It Does:**
- Updates `user_profiles.first_name` and `last_name`
- Updates `studios` record with complete info
- Sets `consent_photo_video` and `consent_legal_info` timestamps
- Redirects to `/dashboard`

**IMPORTANT:** Onboarding should NOT create new studio if claiming existing one
- Check if `studios.owner_id = user.id` exists
- If yes, UPDATE that studio
- If no, CREATE new studio (fallback for manual registrations)

---

### Step 5: Studio Director Accesses Dashboard
**URL:** `/dashboard`

**What They Can Do:**
- View approved reservations
- Add dancers
- Create routine entries using approved spaces
- Submit summaries when done
- View invoices

---

## 🔧 Technical Implementation (Missing Piece)

### Create `/claim` Route

**File:** `src/app/claim/page.tsx` (NEW)

**Logic:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function ClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenantTheme();
  const code = searchParams.get('code');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studio, setStudio] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function init() {
      if (!code) {
        setError('No studio code provided');
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // Check authentication
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        // Not authenticated → redirect to signup with return URL
        router.push(`/signup?returnUrl=${encodeURIComponent(`/claim?code=${code}`)}`);
        return;
      }

      setUser(authUser);

      // Validate studio code
      const { data: studioData, error: studioError } = await supabase
        .from('studios')
        .select('id, name, public_code, owner_id, tenant_id')
        .eq('public_code', code.toUpperCase())
        .eq('tenant_id', tenant?.id) // Must be on current tenant
        .single();

      if (studioError || !studioData) {
        setError('Invalid or expired studio code');
        setLoading(false);
        return;
      }

      if (studioData.owner_id !== null) {
        setError('This studio has already been claimed');
        setLoading(false);
        return;
      }

      setStudio(studioData);
      setLoading(false);
    }

    init();
  }, [code, router, tenant]);

  const handleClaim = async () => {
    if (!studio || !user) return;

    setLoading(true);
    setError('');

    const supabase = createClient();

    // Update studio ownership
    const { error: updateError } = await supabase
      .from('studios')
      .update({ owner_id: user.id })
      .eq('id', studio.id);

    if (updateError) {
      setError(`Failed to claim studio: ${updateError.message}`);
      setLoading(false);
      return;
    }

    // Check if onboarding complete
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    if (!profile?.first_name || !profile?.last_name) {
      // Need to complete onboarding
      router.push('/onboarding');
    } else {
      // Go straight to dashboard
      router.push('/dashboard');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
        <h1 className="text-3xl font-bold text-white mb-4">
          🎉 Claim Your Studio
        </h1>

        <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
          <p className="text-gray-300 text-sm mb-2">You're about to claim:</p>
          <p className="text-2xl font-bold text-white">{studio.name}</p>
        </div>

        <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
          <p className="text-gray-300 text-sm mb-2">Your account:</p>
          <p className="text-white font-semibold">{user.email}</p>
        </div>

        <p className="text-gray-300 text-sm mb-6">
          By claiming this studio, you'll gain access to your competition dashboard where you can manage dancers, create entries, and submit summaries.
        </p>

        <button
          onClick={handleClaim}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Claim Studio →
        </button>

        <p className="text-gray-400 text-xs text-center mt-4">
          Wrong account? <a href="/api/auth/signout" className="text-purple-300 hover:text-purple-200">Sign out</a> and try again.
        </p>
      </div>
    </div>
  );
}
```

---

## ✅ Testing Checklist

### Before Sending Invitations

- [ ] Verify 54 unclaimed studios in database
- [ ] Test super admin login (empwrdance@gmail.com / 1CompSyncLogin!)
- [ ] Confirm pause button visible and working
- [ ] Confirm invitation button visible
- [ ] Open invitation modal and verify studio list shows correctly

### Test Account Claiming Flow

1. **Test with existing account:**
   - [ ] Log in as test user (daniel@streamstage.live / 123456)
   - [ ] Visit claim URL manually: `https://empwr.compsync.net/claim?code=ENV2T`
   - [ ] Should claim studio and redirect to dashboard or onboarding

2. **Test with new signup:**
   - [ ] Log out completely
   - [ ] Visit claim URL: `https://empwr.compsync.net/claim?code=STP3A`
   - [ ] Should redirect to `/signup?returnUrl=...`
   - [ ] Create new account
   - [ ] Should redirect back to claim page
   - [ ] Claim studio
   - [ ] Complete onboarding
   - [ ] Land on dashboard with studio access

3. **Test invalid scenarios:**
   - [ ] Visit `/claim?code=XXXXX` (invalid code) → should show error
   - [ ] Try to claim already-claimed studio → should show error
   - [ ] Try to claim studio from wrong tenant → should show error

---

## 📧 Email Policy Reminder

**CRITICAL:**
- ✅ Email functionality exists in code
- ✅ Manual button on super admin dashboard
- ❌ **NEVER** send emails via git push or deployment
- ❌ **NEVER** send emails from Claude Code
- ✅ **ONLY** when you manually click the button

---

## 🚀 Next Steps (After `/claim` Route)

1. Create `/claim` route (implementation above)
2. Test claiming flow with test account
3. Send test invitation to yourself
4. Verify full flow works end-to-end
5. Send invitations to all 54 studios
6. Monitor for any support questions

---

## 📊 Expected Results

**After invitations sent:**
- 54 emails delivered
- Studios click claim links
- Studios create accounts or log in
- Studios claim their pre-approved accounts
- Studios complete onboarding
- Studios access dashboard
- Studios can create dancers and entries

**Success Metrics:**
- Claim rate (how many studios claim accounts)
- Completion rate (how many finish onboarding)
- Time to first entry created
- Support requests volume

---

**Last Updated:** October 31, 2025
**Status:** Ready for `/claim` route implementation
**Next:** Create claim page, test, then send invitations
