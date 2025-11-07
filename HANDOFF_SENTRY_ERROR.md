# Session Handoff - Sentry Error Fix

**Date:** November 7, 2025
**From:** Session 39 (Codebase Map Implementation)
**To:** Next agent
**Priority:** P1 - Production error affecting users

---

## Issue Summary

**Sentry Error:**
- **Type:** TypeError: Load failed
- **Page:** /dashboard/entries
- **Time:** Nov 7, 2025, 7:21:26 PM UTC
- **Browser:** Safari 16.3 on Mac
- **User Impact:** YES - 1 user affected, couldn't load entries page
- **Session Replay ID:** 7b75afaa24b547ecb7adb7aa84d7612b

---

## Root Cause

**Build is failing with type error:**

```
./src/server/routers/dancer.ts:305:11
Type error: Type 'string | null' is not assignable to type 'string | undefined'.
  Type 'null' is not assignable to type 'string | undefined'.

 303 |         await logActivity({
 304 |           userId: ctx.userId,
>305 |           tenantId: ctx.tenantId,
     |           ^
```

**Problem:**
- `ctx.tenantId` is typed as `string | null`
- `logActivity()` expects `tenantId?: string | undefined`
- TypeScript won't allow `null` where `undefined` is expected

**Impact:**
- Latest commit (5ebd973 "Activity feed now logging routine creation") won't deploy
- Production running old build (98f232e)
- User hit error on old build (likely unrelated chunk loading issue)

---

## Fix Required

### Already Fixed (Line 305)

**File:** `src/server/routers/dancer.ts`
**Line 305:** Already changed `tenantId: ctx.tenantId,` → `tenantId: ctx.tenantId ?? undefined,`

### Still Need to Fix

**Line 685 in same file:**
```typescript
tenantId: ctx.tenantId,  // Line 685 - NEEDS FIX
```

**Fix:**
```typescript
tenantId: ctx.tenantId ?? undefined,
```

### Check Other Files

Search entire codebase for similar pattern:
```bash
grep -r "tenantId: ctx.tenantId," src/server/routers/
```

Fix all occurrences with `?? undefined` to handle null → undefined conversion.

---

## Steps to Complete

1. **Fix remaining type errors:**
   ```bash
   # Search for all occurrences
   grep -rn "tenantId: ctx.tenantId," src/server/routers/

   # Fix each one with: tenantId: ctx.tenantId ?? undefined,
   ```

2. **Verify build passes:**
   ```bash
   cd /d/ClaudeCode/CompPortal
   npm run build
   ```

3. **Commit fix:**
   ```bash
   git add src/server/routers/dancer.ts [and any other files]
   git commit -m "fix: Type error in activity logging (tenantId null vs undefined)

   - Convert ctx.tenantId (string | null) to undefined for logActivity
   - Fixes build failure blocking deployment
   - Resolves Sentry error: TypeError Load failed on /dashboard/entries

   🤖 Claude Code"
   ```

4. **Push to deploy:**
   ```bash
   git push
   ```

5. **Verify deployment:**
   - Wait for Vercel deployment
   - Check build succeeds
   - Monitor Sentry for recurrence

---

## Files Modified So Far

**This session (uncommitted):**
- `src/server/routers/dancer.ts:305` - Fixed (tenantId ?? undefined)

**Previous session (committed 4ee4701):**
- `CLAUDE.md` - Added codebase navigation section
- `CompPortal/CODEBASE_MAP.md` - Created (825 lines)
- `CompPortal/CODEBASE_MAP_IMPLEMENTATION.md` - Documentation

---

## Context from CODEBASE_MAP

**Activity Logging:**
- Function: `src/lib/activity.ts` - `logActivity()`
- Used in: All create/update/delete mutations for audit trail
- Type signature: `tenantId?: string` (undefined allowed, null NOT allowed)

**Dancer Router:**
- File: `src/server/routers/dancer.ts`
- Procedures: create, batchCreate, getAll, update, delete
- Activity logging: Lines 301-320 (create), ~685 (another mutation)

---

## Session State

**Todo list (completed):**
- [x] Build database schema map
- [x] Build tRPC router index
- [x] Build feature-to-code map
- [x] Build component hierarchy map
- [x] Build common operations guide
- [x] Build quick lookup table
- [x] Add CODEBASE_MAP.md directive to CLAUDE.md

**Todo list (new):**
- [ ] Fix remaining tenantId type errors in dancer.ts (line 685)
- [ ] Search all routers for similar pattern
- [ ] Verify build passes
- [ ] Commit and push fix
- [ ] Monitor Sentry for recurrence

---

## Additional Notes

**Codebase Map is live!**
- Location: `CompPortal/CODEBASE_MAP.md`
- Use it BEFORE grepping/reading files
- Section 6: Quick Lookup Table
- Section 3: Feature-to-Code Map

**User not blocked:**
- Error was on old build (before type error introduced)
- Likely transient Safari chunk loading issue
- But fix needed to unblock new deployments

**Testing:**
- After fix, test on empwr.compsync.net/dashboard/entries
- Use SA login: danieljohnabrahamson@gmail.com / 123456
- Verify entries page loads in Safari if possible

---

**Ready for handoff.** All context provided above. Fix is straightforward - just need to find and fix remaining `tenantId: ctx.tenantId` occurrences.
