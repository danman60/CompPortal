# Critical Bugs Found - 2025-10-23

## Status: 🔴 ACTIVE - 3 Critical Production Bugs

### Bug #10: Missing Database Migration - two_factor_enabled ✅ FIXED
**Severity**: HIGH - Blocked notifications toggle functionality
**Discovered**: 2025-10-23 (User testing in production)

**Error Message**:
```
Failed to update notifications:
Invalid `prisma.user_profiles.update()` invocation:
The column `user_profiles.two_factor_enabled` does not exist in the current database.
```

**Root Cause**:
- Two-factor authentication migration (20250113000003) was in schema.prisma but NOT applied to production database
- Code referenced `two_factor_enabled` column that didn't exist
- Migration file existed locally but was never run on production

**Impact**:
- ❌ Settings page notifications toggle crashes with 500 error
- ❌ Users unable to enable/disable email notifications
- ❌ Profile updates fail if notifications preference changes

**Fix Applied**:
- Applied migration `add_two_factor_fields` to production database
- Added columns: `two_factor_enabled`, `two_factor_secret`, `two_factor_backup_codes`, `two_factor_verified_at`
- Created `two_factor_audit_log` table with RLS policies
- Migration applied successfully via Supabase MCP

**Verification**: ⏳ Pending - needs production test of notifications toggle

---

### Bug #11: Email Notifications Not Sending 🔴 ACTIVE
**Severity**: HIGH - Core notification system not functional
**Discovered**: 2025-10-23 (User testing in production)

**User Report**:
"email notification didn't work when I got an approved reservation"

**Symptoms**:
- No email sent when reservation approved
- Notifications toggle doesn't trigger any emails
- Email system appears silent despite code being present

**Investigation Needed**:
1. Check SMTP configuration in production environment
2. Verify email service initialization
3. Check email logs table for attempted sends
4. Review reservation approval trigger code
5. Test email sending functionality

**Potential Root Causes**:
- SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)
- Email service not initialized on startup
- Reservation approval not triggering email send
- Email logs not being created
- Rate limiting or provider blocking

**Files to Check**:
- Email service initialization
- Reservation approval handler
- Email template system
- SMTP configuration

---

### Bug #12: React Hydration Error on Dashboard 🔴 ACTIVE
**Severity**: MEDIUM - Causes console errors, may affect functionality
**Discovered**: 2025-10-23 (User navigating SD dashboard)

**Error Message**:
```
Uncaught Error: Minified React error #418
visit https://react.dev/errors/418?args[]=text&args[]= for full message
```

**Context**:
- Occurs when navigating back to Studio Director dashboard
- React error #418 = "Hydration failed because the initial UI does not match what was rendered on the server"
- Minified production build (harder to debug)

**Impact**:
- Console spam with errors
- Potential UI inconsistencies
- May cause unexpected behavior

**Investigation Needed**:
1. Identify which component is causing hydration mismatch
2. Check for:
   - Date/time rendering differences (server vs client)
   - Random values or UUIDs generated during render
   - Browser-only APIs called during SSR
   - Conditional rendering based on client-side state
3. Enable non-minified build for better error messages

**Common Hydration Causes**:
- `new Date()` called during render
- `Math.random()` during render
- Browser APIs (localStorage, window) in component body
- Suppressed hydration warnings with `suppressHydrationWarning`

---

## Priority Actions

**IMMEDIATE** (Bug #10):
1. ✅ Applied two-factor migration to production
2. ⏳ Test notifications toggle on production (/dashboard/settings/profile)
3. ⏳ Verify error is resolved

**HIGH PRIORITY** (Bug #11):
1. Check production environment variables for SMTP config
2. Query email_logs table to see if sends are being attempted
3. Test email sending manually via tRPC endpoint
4. Review reservation approval code for email trigger

**MEDIUM PRIORITY** (Bug #12):
1. Add logging to identify hydration mismatch component
2. Review SD dashboard components for SSR issues
3. Test with non-minified build for clearer errors
4. Fix identified hydration source

---

## Testing Session Context

**Total Workflows Tested**: 110+
**Previous Bugs Fixed**: 9 (all verified)
**Success Rate Before**: 100%
**New Critical Bugs**: 3 (discovered during user testing)

**Key Insight**: Production testing revealed critical issues not caught by workflow testing:
- Missing database migrations
- Email system configuration
- Client-side hydration errors

**Next Steps**: Focus on fixing these 3 critical bugs before resuming comprehensive testing.

---

**Created**: 2025-10-23
**Last Updated**: 2025-10-23
**Status**: Active Investigation
