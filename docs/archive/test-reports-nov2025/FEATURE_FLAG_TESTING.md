# Feature Flag Testing Guide

**Created:** November 4, 2025
**Purpose:** How to test feature flags on production with different accounts

---

## ✅ Current Setup

### Feature: `NEW_ROUTINE_PAGE`
**Who Can See:**
- ✅ Super Admin (SA): `danieljohnabrahamson@gmail.com`
- ✅ Competition Director (CD): `empwrdance@gmail.com` (EMPWR), `stefanoalyessia@gmail.com` (Glow)
- ✅ Test Studio Director (SD): `djamusic@gmail.com` (user ID: 4383d45e-bdf7-45df-a349-0c9b8421ff59)
- ❌ All Other Studio Directors: Will see old version

**Purpose:** Test and demo new routine creation with specific accounts before opening to all studios

---

## 🧪 Testing Matrix

### Test 1: djamusic@gmail.com (Test SD - Feature Enabled)
**Account:** djamusic@gmail.com / 123456
**Role:** studio_director
**Expected:** ✅ Sees NEW routine creation page
**Why:** User ID is in `allowedUserIds` array

**Steps:**
1. Navigate to empwr.compsync.net
2. Login with djamusic@gmail.com / 123456
3. Go to Entries → Create Entry
4. **VERIFY:** New routine creation page loads (with new UX/validation)

---

### Test 2: Another SD Account (Feature Disabled)
**Account:** Any other SD account (NOT djamusic@gmail.com)
**Role:** studio_director
**Expected:** ❌ Sees OLD routine creation page (or button greyed out)
**Why:** Not in `allowedUserIds`, role not allowed

**Steps:**
1. Navigate to empwr.compsync.net
2. Login with a different SD account
3. Go to Entries → Create Entry
4. **VERIFY:** Old routine creation page loads (or feature not accessible)

**Problem:** You don't have another test SD account!

---

## 🎯 Verification Without Second Account

### Option 1: Temporarily Remove User ID (Safest)
**To verify other SDs can't see it:**

1. **Comment out the user ID in code:**
   ```typescript
   // In src/lib/feature-flags.ts
   [FEATURES.NEW_ROUTINE_PAGE]: {
     roles: ['super_admin', 'competition_director'],
     // allowedUserIds: ['4383d45e-bdf7-45df-a349-0c9b8421ff59'], // TEMP DISABLED
     description: 'New routine creation page',
     status: 'testing',
   },
   ```

2. **Commit and push** (or just test locally)

3. **Test with djamusic@gmail.com:**
   - Should NOT see new version (feature disabled for SDs)
   - Confirms feature flags working correctly

4. **Re-enable the user ID:**
   ```typescript
   allowedUserIds: ['4383d45e-bdf7-45df-a349-0c9b8421ff59'], // RE-ENABLED
   ```

5. **Commit and push**

6. **Test again with djamusic@gmail.com:**
   - Should see new version (user-specific override working)

---

### Option 2: Check Feature Flag Status Programmatically
**Add debug output in your routine creation page:**

```typescript
// In your routine creation component
import { FEATURES, isFeatureEnabled } from '@/lib/feature-flags';

export default function CreateEntryPage({ userRole, userId }: Props) {
  const canSeeNewVersion = isFeatureEnabled(
    FEATURES.NEW_ROUTINE_PAGE,
    userRole,
    userId
  );

  console.log('[FeatureFlag] NEW_ROUTINE_PAGE:', {
    userRole,
    userId,
    canSeeNewVersion,
  });

  if (canSeeNewVersion) {
    return <NewRoutineCreationPage />;
  }

  return <OldRoutineCreationPage />;
}
```

**Then check browser console:**
- djamusic@gmail.com: `canSeeNewVersion: true`
- Other SD: `canSeeNewVersion: false`

---

### Option 3: Create Quick Test Account (15 min)
**If you want a real second SD account for testing:**

```sql
-- 1. Create test user in auth.users via Supabase dashboard
-- Email: test-sd@example.com, Password: TestPassword123

-- 2. User profile will be created automatically by trigger

-- 3. Create test studio for this user
INSERT INTO studios (
  name,
  email,
  address1,
  city,
  province_state,
  postal_code,
  phone,
  owner_id,
  tenant_id,
  status
) VALUES (
  'Test SD Studio',
  'test-sd@example.com',
  '123 Test St',
  'Toronto',
  'ON',
  'M1M 1M1',
  '416-555-0100',
  '[USER_ID_FROM_STEP_1]',
  '00000000-0000-0000-0000-000000000001', -- EMPWR tenant
  'approved'
);
```

**Then test with:**
- test-sd@example.com: Should NOT see new feature
- djamusic@gmail.com: Should see new feature

---

## 📊 Expected Behavior Summary

| Account | Role | Feature Enabled? | Reason |
|---------|------|------------------|--------|
| danieljohnabrahamson@gmail.com | super_admin | ✅ YES | Role allowed |
| empwrdance@gmail.com | competition_director | ✅ YES | Role allowed |
| stefanoalyessia@gmail.com | competition_director | ✅ YES | Role allowed |
| djamusic@gmail.com | studio_director | ✅ YES | User ID override |
| Any other SD | studio_director | ❌ NO | Role not allowed, not in user ID list |

---

## 🚀 Launch Day Process

**When ready to open to all Studio Directors:**

```typescript
// In src/lib/feature-flags.ts
[FEATURES.NEW_ROUTINE_PAGE]: {
  roles: ['super_admin', 'competition_director', 'studio_director'], // ← Add this
  allowedUserIds: ['4383d45e-bdf7-45df-a349-0c9b8421ff59'], // Can keep or remove
  description: 'New routine creation page',
  status: 'released', // ← Update status
},
```

**Commit, push, and ALL SDs will see the new version!**

---

## 🐛 Troubleshooting

### Issue: djamusic@gmail.com doesn't see new version
**Check:**
1. User ID correct? `4383d45e-bdf7-45df-a349-0c9b8421ff59`
2. Build deployed? Check Vercel logs
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for feature flag logs

---

### Issue: Other SDs ARE seeing new version
**Check:**
1. Did you accidentally add 'studio_director' to roles array?
2. Check FEATURE_CONFIG in deployed code
3. Verify git commit has correct config

---

### Issue: Feature flag not working at all
**Check:**
1. Is userRole being passed correctly?
2. Is userId being passed correctly?
3. Check console for "[FeatureFlags] Unknown feature key" warnings
4. Verify import path: `from '@/lib/feature-flags'`

---

## 💡 Pro Tips

### Demo to CDs
**Best practices:**
1. Login as CD account (empwrdance@gmail.com)
2. Show them new routine creation page
3. Explain this is what SDs will see
4. Get feedback before full launch

### Testing with djamusic@gmail.com
**What to test:**
1. Create routine with new flow
2. Try all validation scenarios
3. Test CSV import
4. Test batch creation
5. Verify it saves correctly

### Monitoring After Deploy
```sql
-- Check if feature flag user is creating entries
SELECT
  u.email,
  COUNT(*) as entries_created
FROM competition_entries ce
JOIN user_profiles up ON ce.created_by = up.id
JOIN auth.users u ON u.id = up.id
WHERE ce.created_at > NOW() - INTERVAL '24 hours'
  AND u.email = 'djamusic@gmail.com'
GROUP BY u.email;
```

---

**Questions?** Check FEATURE_FLAGS.md for more details
**Safety Concerns?** Check FEATURE_FLAGS_SAFETY.md
