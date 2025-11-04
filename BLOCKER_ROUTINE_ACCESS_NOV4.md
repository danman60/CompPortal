# BLOCKER: Live User Accessed Routine Creation

**Created:** November 4, 2025
**Severity:** P1 - HIGH
**Status:** INVESTIGATING

---

## Issue Report

**Problem:** Live Studio Director user able to access routine creation dashboard
**Expected:** Button should be greyed out for all SDs except djamusic@gmail.com
**Actual:** User got into `/dashboard/entries` page

---

## Recent Changes (Commit 3b8b9e1)

**Feature Flags Deployed:**
- Dashboard card enabled ONLY for: SA, CD, djamusic@gmail.com
- Entries page protected with feature flag check
- Build passed: 76/76 pages
- Pushed to main at: ~15 minutes ago

**Code Changes:**
1. `StudioDirectorStats.tsx`: Added `canAccessRoutines` check (lines 72-77)
2. `EntriesPageContainer.tsx`: Added access block (lines 86-107)

---

## Investigation Steps

### 1. Verify Deployment Status
```bash
# Check if Vercel has deployed commit 3b8b9e1
# Expected: Deployment should show "feat: Feature flags for routine creation"
```

**Question:** Has Vercel finished deploying? (Check vercel.com dashboard)

---

### 2. Identify User Who Got In

**Need from user:**
- Which Studio Director account accessed the page?
- What email address?
- What did they see when they got in?

**Query to check their role:**
```sql
SELECT
  u.email,
  up.id as user_id,
  up.role
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE u.email = '[USER_EMAIL_HERE]';
```

---

### 3. Check Feature Flag Logic

**Current Config (feature-flags.ts:65-70):**
```typescript
[FEATURES.NEW_ROUTINE_PAGE]: {
  roles: ['super_admin', 'competition_director'],
  allowedUserIds: ['4383d45e-bdf7-45df-a349-0c9b8421ff59'], // djamusic@gmail.com
  description: 'New routine creation page',
  status: 'testing',
},
```

**Who SHOULD have access:**
- ✅ Super Admins (danieljohnabrahamson@gmail.com)
- ✅ Competition Directors (empwrdance@gmail.com, stefanoalyessia@gmail.com, glowdance@gmail.com)
- ✅ Test SD: djamusic@gmail.com (user ID: 4383d45e-bdf7-45df-a349-0c9b8421ff59)

**Who should NOT have access:**
- ❌ All other Studio Directors

---

## Possible Causes

### Cause 1: Deployment Not Complete
**Check:** Vercel deployment status
**Fix:** Wait for deployment to finish (usually 2-3 minutes)
**Verification:** Hard refresh browser (Ctrl+Shift+R)

### Cause 2: Browser Cache
**Check:** User might have old JavaScript chunk loaded
**Fix:** Ask user to hard refresh (Ctrl+Shift+R) or open incognito
**Verification:** Check footer commit hash matches 3b8b9e1

### Cause 3: User is SA/CD
**Check:** Verify user's actual role in database
**Fix:** None needed - SA/CD SHOULD have access
**Verification:** Confirm user email against allowed list

### Cause 4: Feature Flag Logic Error
**Check:** `isFeatureEnabled()` function in feature-flags.ts
**Fix:** Review logic (lines 129-150)
**Verification:** Add console.log to trace execution

### Cause 5: currentUser Query Failing
**Check:** `trpc.user.getCurrentUser.useQuery()` in StudioDirectorStats.tsx
**Fix:** Check if query returns undefined/null
**Verification:** Browser console should show error if query fails

---

## Immediate Actions

### Action 1: Get User Details
**Ask user:**
1. What email address got in?
2. What did they see on the page?
3. Can they share a screenshot?
4. What browser/device?

### Action 2: Verify Deployment
**Check Vercel:**
1. Go to vercel.com dashboard
2. Find latest deployment
3. Verify commit 3b8b9e1 is deployed
4. Check deployment logs for errors

### Action 3: Check Production
**Use Playwright MCP:**
```typescript
// Test with unauthorized SD account
// 1. Navigate to empwr.compsync.net
// 2. Login with [UNAUTHORIZED_SD_EMAIL]
// 3. Check if "My Routines" card is greyed out
// 4. Try to navigate to /dashboard/entries
// 5. Should see "Coming Soon" message
```

---

## Rollback Plan (If Needed)

### Option A: Quick Disable (5 minutes)
```typescript
// In feature-flags.ts, line 66:
roles: [], // Empty array = NOBODY can access
// Commit and push
```

### Option B: Revert Commit (2 minutes)
```bash
git revert 3b8b9e1
git push
```

### Option C: Keep SA/CD Access Only
```typescript
// In feature-flags.ts, line 67:
allowedUserIds: [], // Remove test SD access
// Only SA + CD can access
```

---

## Resolution Checklist

- [ ] Identified which user got in
- [ ] Verified their role in database
- [ ] Confirmed deployment is live (commit 3b8b9e1)
- [ ] Tested feature flag with unauthorized SD account
- [ ] Reproduced issue (or confirmed it was deployment timing)
- [ ] Applied fix (if needed)
- [ ] Verified fix on both tenants
- [ ] Confirmed with user issue is resolved

---

## Next Steps

**Waiting for:**
1. User to provide email address who got in
2. Confirmation of deployment status from Vercel
3. Screenshot or description of what they saw

**Once we have info, we can:**
1. Query their user ID and role
2. Test feature flag logic with their account
3. Determine if deployment timing or actual bug

---

**Status:** AWAITING USER INFO
**Priority:** P1 - Block production access until resolved
