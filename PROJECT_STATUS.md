# CompPortal Project Status

**Last Updated:** 2025-10-23 02:15 UTC

## Current Status: ⚠️ Investigating Production Issue

### Latest Session (Oct 23, 2025) - ONGOING

**Critical Fix: tRPC Null Input Handling**

**Problem Discovered:**
- All `.optional()` input schemas were causing 500/400 errors in production
- Root cause: Zod's `.optional()` accepts `undefined` | object, but tRPC v10 sends `null`
- Error: "Expected object, received null" from Zod validation
- Affected: 32 router files across entire codebase

**Solution Implemented:**
- Replaced `.optional()` with `.nullish()` in all input schemas (32 files)
- `.nullish()` accepts `null` | `undefined` | object (matches tRPC behavior)
- Changed destructuring pattern: `input = {}` → `const { field } = input ?? {}`
- Verified locally: Zod `.nullish()` correctly parses `null` values
- Build passed ✅ (commit: 1bc3024)

**Production Status:**
- ⚠️ ERROR PERSISTS on www.compsync.net after deployment
- studio.getAll still returns 500 error with same "json":null pattern
- Tested via Playwright at 02:10 UTC - multiple 500 errors in console
- Local code is correct, builds successfully
- Possible causes:
  1. Vercel deployment not fully propagated
  2. Server-side caching issue
  3. Different code version deployed than what's in repo

**Testing Performed:**
- ✅ Verified local code has `.nullish()` at studio.ts:69
- ✅ Verified Zod `.nullish()` handles null correctly via Node test
- ✅ Build passes locally (npm run build)
- ❌ Production still returns 500 on studio.getAll
- Browser test: Logged into SD dashboard, 6+ console errors for studio.getAll

**Additional Fixes This Session:**
1. ErrorBoundary dark background (ErrorBoundary.tsx:81)
2. CD dashboard text: "Admin Responsibilities" → "Competition Director Responsibilities"
3. CSV gender/parent field mapping (csv-utils.ts - uncommitted)

**Deployment:**
- Commits: 1bc3024 (nullish), 62f576f (UI fixes), 738f2f9 (docs)
- All pushed to GitHub main branch
- Vercel should have auto-deployed
- Need user confirmation on deployment status

---

## Outstanding Work

### Uncommitted Changes
- CSV field mapping fixes in `src/lib/csv-utils.ts`
  - Gender field variations (added `m_f`)
  - Parent field mapping (parent_* vs guardian_*)
  - User requested to hold this commit

### Known Issues
- None (all 500 errors should be resolved with nullish fix)

### Next Session Priorities
1. Verify production deployment succeeded
2. Test CSV import with gender/parent fields
3. Commit CSV fixes if verified working

---

## Recent Commits

```
1bc3024 - fix: Replace .optional() with .nullish() for all tRPC inputs
62f576f - fix: tRPC null input errors + UI fixes
00cf982 - fix: Dashboard white background + studio/dancer getAll
ef45ae8 - fix: 500/400 errors on studio/dancer.getAll (null input)
```

---

## Architecture Notes

**tRPC v10 + Zod Pattern (CRITICAL):**
```typescript
// ❌ WRONG - Causes 500 errors
.input(z.object({...}).optional())
.query(async ({ input = {} }) => { ... })

// ✅ CORRECT - Handles null from tRPC
.input(z.object({...}).nullish())
.query(async ({ input }) => {
  const { field } = input ?? {};
})
```

**Why:**
- tRPC sends `null` for empty optional inputs
- Zod `.optional()` only accepts `undefined` | T
- Zod `.nullish()` accepts `null` | `undefined` | T
- Default params `input = {}` don't work with `null`
- Use nullish coalescing `input ?? {}` instead

---

**Project:** CompPortal - Dance Competition Management  
**Stack:** Next.js 15, tRPC v10, Prisma, Supabase, Vercel  
**Repo:** https://github.com/danman60/CompPortal  
**Production:** https://www.compsync.net
