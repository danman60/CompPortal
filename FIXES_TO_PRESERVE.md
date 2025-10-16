# Non-Multi-Tenant Fixes to Cherry-Pick After Rollback to b3ab89d

## Critical Fixes (Must preserve):

### 1. Commit 5b1ae33 - Rebuild dancers table with bulk actions
**Files:**
- src/components/DancersList.tsx (lines 297-353, 445-669)
- src/components/DancerCSVImport.tsx (lines 78, 401-434, 520-538)
- src/server/routers/dancer.ts (line 496 - gender normalization)

**Changes:**
- Rebuilt table from scratch with checkboxes
- Added bulk selection toolbar and bulk delete
- Replaced hover popup with click modal
- Added keyboard shortcuts (Ctrl+A, Esc)
- Fixed import error display (was silent before)
- Fixed gender normalization to title case (Male/Female)

---

### 2. Commit 4fd9967 - Fallback studio lookup + reservation title swap
**Files:**
- src/components/ReservationsList.tsx (lines 515-518)
- src/server/routers/dancer.ts (lines 289-328, 335-390, 415-449)

**Changes:**
- ReservationsList: Swapped titles so competition is main (bold h3), studio is subtitle
- dancer.ts: Added fallback studio lookup to UPDATE mutation
- dancer.ts: Added fallback studio lookup to DELETE mutation
- dancer.ts: Added fallback studio lookup to ARCHIVE mutation

**Why:** Fixes "ctx.studioId gap" - studio directors can now delete/update/archive dancers

---

### 3. Commit dd8b378 - Fix dancer import studio_id (CRITICAL)
**Files:**
- src/components/DancerCSVImport.tsx (lines ~20-35, ~160-170)

**Changes:**
- Changed from `trpc.studio.getAll.useQuery()` to `trpc.user.getCurrentUser.useQuery()`
- Extract studio from `currentUser.studio.id` instead of `studios[0].id`
- Updated preview to show `currentUser.studio.name`

**Why:** Import was showing wrong studio name and using wrong studio_id

---

### 4. Commit ca38366 - Fallback to CREATE mutation
**Files:**
- src/server/routers/dancer.ts (CREATE mutation)

**Changes:**
- Added fallback studio lookup to CREATE mutation (same pattern as UPDATE/DELETE/ARCHIVE)

**Why:** Part of the auth fallback series to fix ctx.studioId gap

---

## Other Commits (Review individually):

### 5. Commit b4d7bcb - Complete reservations grid layout and fix dancer import auth
- Reservations UI improvements
- More dancer import auth fixes

### 6. Commit 2a5ed49 - Replace hardcoded sample data with real database values
- Dashboard widget fixes

### 7. Commit dc10576 - CSV import crash and schema mismatch
- CSV import stability fixes

### 8. Commit 3ad6f0d - Add Competition Settings button + auth verification
- UI navigation improvements

### 9. Commit 6111087 - Competition Settings page navigation and structure
- Competition settings UI fixes

### 10. Commit 7f283e6 - Dance Styles, Scoring Rubric, and Awards settings
- Tenant settings features

---

## Commits to SKIP (Multi-tenant related):

- b915a14: feat: Tenant settings UI for competition defaults
- b7593f0: fix: Replace hardcoded tenant ID with user context
- 0073976: fix: Allow super admin access to tenant settings
- 9a3ffe3: docs: Document tRPC tenant context gap (Oct 16)
- 67909c6: docs: Document TEST 9 as false failure + session summary

---

## Rollback Plan:

1. **Hard reset to b3ab89d:** `git reset --hard b3ab89d`
2. **Cherry-pick critical fixes in order:**
   - `git cherry-pick 5b1ae33` (dancers table rebuild)
   - `git cherry-pick 4fd9967` (reservation swap + fallback lookups)
   - `git cherry-pick ca38366` (CREATE fallback)
   - `git cherry-pick dd8b378` (import studio_id fix)
3. **Test:** Build and verify dancers import/delete works
4. **Push:** `git push --force-with-lease`

---

**Last verified:** Oct 16, 2025
**Rollback target:** b3ab89d (Oct 15, 2025 - before multi-tenant work)
**Critical fixes preserved:** 4 commits
