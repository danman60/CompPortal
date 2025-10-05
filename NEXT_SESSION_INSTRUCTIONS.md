# Next Session Instructions - Vercel Build Investigation

**Date Created**: October 5, 2025
**Priority**: 🔴 HIGH - Production Deployment Issue
**Estimated Time**: 30-60 minutes

---

## 🚨 Primary Objective: Fix Vercel Build Failures

### Issue Description
Recent commits may have introduced build failures on Vercel deployment. The application compiles successfully locally (`npm run dev` works) but may fail during Vercel's production build process.

### Suspected Causes
1. **Email template imports** - New email components may have build-time dependencies
2. **Server-side only imports** - Email libraries (Resend, @react-email) may not be properly isolated
3. **Environment variables** - Missing `RESEND_API_KEY` might cause build errors
4. **TypeScript errors** - Strict type checking on Vercel vs local

### Recent Changes That Could Affect Build
**Commit f363b11** - Email notifications implementation:
- Added `src/emails/ReservationRejected.tsx`
- Modified `src/lib/email-templates.tsx`
- Modified `src/server/routers/reservation.ts`
- Uses `@react-email/components` and `resend` packages

**Commit b3c54fa** - Music upload implementation:
- Modified `src/components/EntryForm.tsx` (205 line addition)
- Uses `uploadMusicFile` from `src/lib/storage.ts`

---

## 📋 Investigation Checklist

### Step 1: Check Vercel Build Logs
```bash
# If using Vercel CLI
vercel logs --project compportal

# Or check via Vercel dashboard:
# https://vercel.com/your-team/compportal/deployments
```

**Look for:**
- TypeScript compilation errors
- Module resolution failures
- Missing environment variables
- Build command failures

### Step 2: Verify Email Dependencies
```bash
# Check package.json for email-related packages
cat package.json | grep -E "(resend|react-email)"

# Ensure these are installed:
npm list resend @react-email/components
```

### Step 3: Test Production Build Locally
```bash
cd /d/ClaudeCode/CompPortal

# Run production build (same as Vercel)
npm run build

# Check for errors in build output
```

### Step 4: Check Environment Variables
Verify these are set in Vercel dashboard:
- ✅ `DATABASE_URL` (Supabase)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ⚠️ `RESEND_API_KEY` (optional - email won't send but shouldn't block build)
- ✅ `NEXT_PUBLIC_APP_URL`

---

## 🔧 Common Fixes

### Fix 1: Email Components Build Error
If error mentions `@react-email/components` or `resend`:

**Problem**: Email templates imported in client-side code
**Solution**: Ensure email imports only in server-side files

```typescript
// ❌ BAD - Don't import in client components
import { ReservationApproved } from '@/emails/ReservationApproved';

// ✅ GOOD - Only import in server files (routers, API routes)
// Email templates should only be imported in:
// - src/server/routers/*.ts
// - src/lib/email-templates.tsx (server-only)
```

### Fix 2: TypeScript Strict Mode
If TypeScript errors on Vercel but not locally:

```bash
# Run local type check with strict mode
npx tsc --noEmit

# Fix any type errors shown
```

### Fix 3: Missing Dependencies
If module not found errors:

```bash
# Ensure all dependencies are in package.json (not devDependencies)
npm install resend @react-email/components --save

# Commit package.json and package-lock.json
git add package.json package-lock.json
git commit -m "fix: Ensure email dependencies in production"
git push
```

### Fix 4: Dynamic Imports for Email Templates
If email components cause bundle issues:

```typescript
// In src/server/routers/reservation.ts
// Change from static import to dynamic import

// ❌ Static import (may cause issues)
import { renderReservationApproved } from '@/lib/email-templates';

// ✅ Dynamic import (safer for server-side only code)
const { renderReservationApproved } = await import('@/lib/email-templates');
```

---

## 📊 Success Criteria

- ✅ Vercel build completes successfully
- ✅ Production deployment accessible
- ✅ All features work in production (music upload, email notifications)
- ✅ No TypeScript errors
- ✅ No runtime errors in production logs

---

## 🔄 Fallback Plan

If build continues to fail after investigation:

1. **Temporary Disable**: Comment out email notification code in reservation.ts
2. **Commit hotfix**: Push working version to restore production
3. **Investigate offline**: Fix email implementation locally
4. **Re-deploy**: Once fixed, re-enable email notifications

**Hotfix Code** (if needed):
```typescript
// In src/server/routers/reservation.ts approve() mutation
// Comment out lines 520-546 (email sending block)
// Temporarily disable email until fixed
```

---

## 📝 Documentation Updates After Fix

Once build is fixed:
1. Update `PROJECT_STATUS.md` with build fix commit
2. Add notes about email implementation to `BUGS_AND_FEATURES.md`
3. Document any environment variables needed in `.env.example`

---

## 🎯 After Build Fix: Continue with Session Plan

Once Vercel builds successfully, continue with **Phase 3: Studio Approval Workflow** from NEXT_SESSION_PLAN.md

---

**Priority Order:**
1. 🔴 Fix Vercel build (this document)
2. 🟡 Studio Approval Workflow (NEXT_SESSION_PLAN.md Phase 3)
3. ⚪ Additional enhancements (NEXT_SESSION_PLAN.md remaining items)
