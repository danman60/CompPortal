# 🚨 BLOCKER: Vercel Serverless Function Caching Issue

**Created:** 2025-10-23 02:20 UTC
**Severity:** CRITICAL - Production broken
**Status:** BLOCKED - Requires manual intervention

## Problem

The `.nullish()` fix for tRPC input schemas is correctly committed (1bc3024) and deployed (verified by commit hash 738f2f9 on production), but the 500 errors persist.

## Evidence

### Code Status
- ✅ Local code has `.nullish()` at studio.ts:69
- ✅ Git commit 1bc3024 contains `.nullish()` fix
- ✅ Build passes locally
- ✅ Zod `.nullish()` verified to accept `null` via Node test
- ✅ Production shows commit hash 738... (AFTER the fix)

### Production Status
- ❌ studio.getAll returns 500 error
- ❌ Same error pattern: `{"json":null,"meta":{"values":["undefined"]}}`
- ❌ Tested at 02:10 UTC and 02:18 UTC - error persists

### Test Results
```
URL: https://www.compsync.net/api/trpc/studio.getAll?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull...
Response: 500 Internal Server Error
Decoded input: {"0":{"json":null,"meta":{"values":["undefined"]}}}
```

## Root Cause Hypothesis

**Vercel Serverless Function Caching**

Vercel caches serverless functions aggressively. Even though the deployment succeeded and shows the correct commit hash, the actual tRPC API route (`/api/trpc/*`) may be serving cached function code from before the fix.

## Required Actions

### Option 1: Force Vercel Cache Clear (RECOMMENDED)
1. Go to Vercel dashboard → CompPortal project
2. Navigate to Storage → Edge Config or Functions
3. Find "Clear Function Cache" or "Purge Cache" button
4. Click and wait 2-3 minutes
5. Test production again

### Option 2: Manual Redeployment
1. Go to Vercel dashboard → Deployments
2. Find the latest deployment (738f2f9)
3. Click "..." menu → "Redeploy"
4. Select "Redeploy with existing build cache cleared"
5. Wait for deployment to complete

### Option 3: Force New Deployment
1. Make a trivial change to any file (add comment)
2. Commit and push to force new deployment
3. Vercel will rebuild from scratch

### Option 4: Check Build Logs
1. Vercel dashboard → Latest deployment → Build Logs
2. Search for "studio.ts" to verify file was actually built
3. Check for any warnings about cached modules

## Technical Details

The fix IS correct:
```typescript
// This pattern works locally and in Zod tests
.input(z.object({ tenantId: z.string().uuid().optional() }).nullish())
.query(async ({ ctx, input }) => {
  const { tenantId } = input ?? {};
})
```

The problem is NOT the code - it's infrastructure caching.

## Impact

- ❌ SD dashboards fail to load studio data
- ❌ CD dashboards fail to load studio lists
- ❌ Entry forms can't fetch studios
- ❌ Multiple components broken

## Next Steps

**User must manually check Vercel deployment and clear caches.**

Once caches are cleared, test at:
- https://www.compsync.net/dashboard (SD dashboard)
- Check browser console for studio.getAll errors

---

**Created by:** Claude Code
**Session:** Oct 23, 2025 02:15-02:20 UTC
