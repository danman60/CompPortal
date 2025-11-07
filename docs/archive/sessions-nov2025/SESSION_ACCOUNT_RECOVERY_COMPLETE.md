# Session Complete: Account Recovery System

**Date:** November 6, 2025
**Status:** ✅ Complete & Deployed
**Commits:** b6a80a8, 2c84ccb, 59daaba

---

## Problem Solved

**Issue:** Database backup/restore deleted auth.users but preserved studios table, creating 8 orphaned studios (owner_id pointing to non-existent auth accounts).

**Root Cause:** GitHub Action backup only included `public` schema, not `auth` schema.

---

## Solution Delivered

### 1. Account Recovery System (Full Implementation)

**Database:**
- Migration: `account_recovery_tokens` table with RLS policies
- Schema update: Added relations to studios and tenants

**Backend (tRPC Router):**
- `getOrphanedStudios` - Auto-detects studios with deleted auth accounts
- `prepareRecovery` - Creates auth account + recovery token
- `sendRecoveryEmail` - Sends recovery link (manual SA button, NEVER automatic)
- `validateToken` - Validates recovery token
- `completeRecovery` - User sets password, auto-login

**Frontend:**
- `/account-recovery` page - Password creation UI with token validation
- `/dashboard/admin/account-recovery` - SA panel with:
  - Auto-detection of 8 orphaned studios
  - Manual test input (enter any email to test)
  - Prepare Recovery + Send Email buttons per studio
  - Stats dashboard (orphaned count, with tokens, affected dancers)

**Navigation:**
- Added Account Recovery card to SA dashboard (CompetitionDirectorDashboard.tsx:205-211)

**Files Created/Modified:**
- `src/server/routers/accountRecovery.ts` (437 lines)
- `src/app/account-recovery/page.tsx`
- `src/app/dashboard/admin/account-recovery/page.tsx`
- `prisma/schema.prisma` (added account_recovery_tokens model)
- `src/lib/email.ts` (added 'account-recovery' template type)
- `src/server/routers/_app.ts` (registered router)
- `src/components/CompetitionDirectorDashboard.tsx` (added quick action)

### 2. Disabled Destructive Testing Tools

**Feature Flag:**
- `ENABLE_DESTRUCTIVE_TOOLS = false` in testing/page.tsx:21
- Disables Clean Slate and Populate Test Data buttons
- Shows "🔒 Disabled for Production Safety" message
- Easily re-enabled by changing flag to `true`

### 3. Fixed Backup to Include Auth Schema

**GitHub Action:**
- Added `--schema=auth` to pg_dump command (database-backup.yml:79-80)
- Now backs up auth.users table
- Prevents future orphaned studios

### 4. Updated CLAUDE.md

**UI/UX Requirements Added (lines 305-326):**
- Always add navigation for new admin pages
- Always use explicit background colors (bg-gray-50, bg-white)
- Always use explicit text colors (text-gray-900, text-gray-600)
- Test on production URLs before marking complete

---

## Current State

**Orphaned Studios (Ready for Recovery):**
- Total: 8 studios (BDL1F already manually fixed, 7 remaining)
- EMPWR tenant: 4 studios (24 dancers affected)
- Glow tenant: 4 studios (82 dancers affected)
- Total dancers affected: 106

**Manual Recovery Completed:**
- BDL1F (Body Lines Dance & Fitness) - Fixed manually as proof of concept
- Studio: ca775418-8c0b-41b2-aac3-6f08f3033ebb
- New auth: 88b6b4f9-9839-4dfe-aedf-6f57e5b7c8b0
- Status: Linked successfully, 91 dancers accessible

**Remaining Orphaned Studios:**
1. EMPWR: Uxbridge Dance Academy (16 dancers)
2. EMPWR: ACADEMY OF DANCE ARTS (0 dancers)
3. EMPWR: CASSIAHS DANCE COMPANY (0 dancers)
4. EMPWR: ONEILL ACADEMY (24 dancers)
5. Glow: CDA (27 dancers)
6. Glow: NJADS (0 dancers)
7. Glow: Impact Dance Complex (39 dancers)
8. Glow: Northern Lights (0 dancers)

---

## How to Use Account Recovery

**Access Panel:**
- URL: `https://empwr.compsync.net/dashboard/admin/account-recovery`
- Or: SA Dashboard → Account Recovery card

**Recovery Process:**
1. SA views orphaned studios list
2. Click "Prepare Recovery" (creates auth + token)
3. Click "Send Email" (manual button, sends recovery link)
4. User receives email: "Action Required: Update Your CompSync Password"
5. User clicks link → creates password → auto-login → sees all data

**Manual Test:**
- Enter any orphaned studio email in yellow test box
- System prepares + sends in one click

---

## Future Prevention

**Next backup will include auth.users:**
- Scheduled: 5x daily (2 AM, 8 AM, 12 PM, 4 PM, 8 PM EST)
- Manual trigger: GitHub Actions → Database Backup → Run workflow
- Future restores will NOT create orphaned studios

---

## Testing Status

**Build:** ✅ Pass
**Manual Verification:** BDL1F studio successfully recovered
**Production URLs:**
- Account Recovery Panel: `empwr.compsync.net/dashboard/admin/account-recovery`
- Recovery Page: `empwr.compsync.net/account-recovery?token=xyz`

**Not Yet Tested:**
- Full recovery flow with email send (awaiting user testing)
- Multi-tenant isolation (should test on both EMPWR + Glow)

---

## Notes

**DanceFX Studio:**
- Status: NOT orphaned (unclaimed)
- Code: DFX3
- Email: dancefxstudio@yahoo.ca
- owner_id: NULL (never claimed, not deleted)
- Action: Needs invitation link, NOT recovery flow

**Email Policy:**
- ✅ Emails ONLY sent via manual SA button
- ❌ NEVER automatic (no cron, no git push triggers)
- 🔐 Only Super Admin can press send button

**Production Safety:**
- Clean Slate and Populate Test Data disabled
- Feature flag prevents accidental data loss
- Account recovery system tested manually on BDL1F

---

## Session End Checklist

- [x] Account recovery system complete
- [x] Build passes
- [x] All changes committed and pushed
- [x] Destructive tools disabled
- [x] Backup workflow fixed
- [x] CLAUDE.md updated with UI guidelines
- [x] Session notes archived
- [x] Production ready

---

**Next Steps for User:**
1. Test account recovery on remaining 7 orphaned studios
2. Verify email delivery
3. Monitor next backup to confirm auth schema included
4. Consider enabling DanceFX invitation flow
