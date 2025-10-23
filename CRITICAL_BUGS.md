# Critical Bugs Found - 2025-10-23

## Status: 🔴 CRITICAL - 9 Production Bugs (1 Fixed, 8 Active)

**Test Account**: danieljohnabrahamson@gmail.com (Studio Director)
**Reservations**: 15 spaces (St. Catharines), 1 space (London)

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

### Bug #13: Fee Display on Routine Creation Page 🔴 ACTIVE
**Severity**: MEDIUM - Confusing UX, shows fee before submission
**Discovered**: 2025-10-23 (User creating routine)
**URL**: https://www.compsync.net/dashboard/entries/create?competition=79cef00c-e163-449c-9f3c-d021fbb4d672&reservation=80404bd4-0407-407e-b370-caf8e496847e

**Issue**:
Per-routine summary shows fee amount during creation, but fees shouldn't be calculated/displayed until routine is submitted

**Expected Behavior**:
- Routine creation wizard should NOT show fee
- Fees calculated only after submission
- Invoice generated separately after submission

**Impact**:
- Confusing user experience
- Implies payment required before submission
- May discourage routine creation

**Fix Required**:
Remove fee display from routine creation wizard, show only after submission

---

### Bug #14: Group Size Auto-Detection Not Working 🔴 ACTIVE
**Severity**: HIGH - Core functionality broken
**Discovered**: 2025-10-23 (User creating routine)
**URL**: Same as Bug #13

**Issue**:
When adding dancers to a routine, the group size category (Solo, Duet/Trio, Small Group, etc.) should auto-detect based on dancer count, but it's not working

**Expected Behavior**:
- 1 dancer = Solo
- 2-3 dancers = Duet/Trio
- 4-9 dancers = Small Group
- 10-19 dancers = Large Group
- etc.

**Current Behavior**:
Group size field remains empty/unchanged when dancers are added

**Impact**:
- ❌ User must manually select group size
- ❌ Risk of incorrect categorization
- ❌ Extra friction in routine creation

**Files to Check**:
- Routine creation form component
- Dancer selection handler
- Group size calculation logic

---

### Bug #15: React Error #419 After Routine Creation 🔴 ACTIVE
**Severity**: HIGH - Crashes after successful creation
**Discovered**: 2025-10-23 (User creating routine)

**Error Message**:
```
Uncaught Error: Minified React error #419
visit https://react.dev/errors/419 for full message
```

**Context**:
- Error occurs AFTER routine is created successfully
- React error #419 = "Text content does not match server-rendered HTML"
- Related to hydration mismatch (similar to Bug #12)

**Impact**:
- Console errors after routine creation
- May prevent navigation or cause UI issues
- User experience degraded

**Investigation Needed**:
1. Check routine creation success handler
2. Review text rendering in post-creation components
3. Look for dynamic content that differs server/client
4. Check for whitespace differences in HTML

---

### Bug #16: Reservation Capacity Tracking Incorrect 🔴 CRITICAL
**Severity**: CRITICAL - Core business logic broken
**Discovered**: 2025-10-23 (User viewing routines page)

**Issue**:
Routines page shows incorrect reservation capacity:
- **Actual**: 15 spaces (St. Catharines), 1 space (London)
- **Displayed**: "2/15 routines for London"

**Problems**:
1. Shows wrong competition (London instead of St. Catharines)
2. Counts incorrectly (showing 2 routines when only 1 space allocated)
3. Capacity tracking completely wrong

**Impact**:
- ❌ CRITICAL: Users can't trust capacity information
- ❌ May allow over-booking
- ❌ May prevent legitimate bookings
- ❌ Financial impact (incorrect routine counts)

**Investigation Required**:
1. Check reservation capacity query
2. Verify competition ID matching
3. Review routine count calculation
4. Check database for correct reservation data

**Database Verification Needed**:
```sql
SELECT r.id, r.requested_spots, r.allocated_spots,
       c.name as competition_name
FROM reservations r
JOIN competitions c ON r.competition_id = c.id
WHERE r.studio_id = (SELECT id FROM studios WHERE owner_id = ...)
```

---

### Bug #17: Competition Dropdown Missing St. Catharines 🔴 CRITICAL
**Severity**: CRITICAL - Blocks routine creation for approved reservation
**Discovered**: 2025-10-23 (User attempting routine creation)

**Issue**:
User has approved reservation for St. Catharines (15 spaces) but St. Catharines doesn't appear in competition dropdown on routines page

**Impact**:
- ❌ CRITICAL: Cannot create routines for largest reservation
- ❌ Blocks entire workflow for approved studios
- ❌ 15 paid spots unusable

**Expected Behavior**:
Dropdown should show ALL competitions where user has approved reservations

**Current Behavior**:
St. Catharines competition missing from dropdown despite active, approved reservation

**Investigation Required**:
1. Check competition dropdown query/filter logic
2. Verify reservation status check
3. Review competition active/published status
4. Check for date filtering that might exclude competition

---

### Bug #18: Routines Not Marked as Submitted 🔴 CRITICAL
**Severity**: CRITICAL - Data integrity issue
**Discovered**: 2025-10-23 (User after routine submission)

**Issue**:
After submitting routine, user can go back to routines page and submit ANOTHER routine. Previously submitted routines are not marked as "submitted" and remain in editable/submittable state.

**Problems**:
1. Duplicate submissions possible
2. Routine status not updating after submission
3. No distinction between draft and submitted routines
4. User confusion about what's been submitted

**Expected Behavior**:
- After submission, routine status should change to "submitted" or "registered"
- Submitted routines should not be editable
- Submitted routines should not show "Submit" button again
- Clear visual distinction between draft and submitted

**Current Behavior**:
- All routines appear as drafts
- Can "submit" same routine multiple times
- No status change after submission

**Impact**:
- ❌ CRITICAL: Duplicate routine submissions
- ❌ Data integrity issues
- ❌ Invoice calculation errors
- ❌ Competition entry count errors

**Database Check Required**:
```sql
SELECT id, status, created_at, updated_at
FROM competition_entries
WHERE reservation_id = ...
ORDER BY created_at DESC
```

**Files to Investigate**:
- Routine submission handler
- Entry status update logic
- Routines list query (status filter)
- Entry status field definition

---

## Priority Actions

### Priority Order (By Severity)

**🔥 CRITICAL - BLOCKS CORE WORKFLOW:**
1. **Bug #16**: Capacity tracking incorrect - CRITICAL data integrity
2. **Bug #17**: St. Catharines missing from dropdown - blocks 15 routines
3. **Bug #18**: Routines not marked as submitted - duplicate submissions

**🚨 HIGH PRIORITY - BREAKS FUNCTIONALITY:**
4. **Bug #14**: Group size auto-detect not working
5. **Bug #15**: React error #419 after routine creation
6. **Bug #11**: Email notifications not sending
7. **Bug #12**: React error #418 on dashboard navigation

**⚠️ MEDIUM PRIORITY - UX ISSUES:**
8. **Bug #13**: Fee display on creation page (confusing but not blocking)

**✅ FIXED:**
9. **Bug #10**: Two-factor migration applied ✅

### Immediate Actions Required

**Database Investigation (Bugs #16, #17, #18)**:
```sql
-- Check reservations for user
SELECT r.id, r.requested_spots, r.allocated_spots, r.status,
       c.name as competition_name, c.id as competition_id
FROM reservations r
JOIN competitions c ON r.competition_id = c.id
JOIN studios s ON r.studio_id = s.id
WHERE s.owner_id = (SELECT id FROM user_profiles WHERE users.email = 'danieljohnabrahamson@gmail.com')
ORDER BY c.name;

-- Check routine entries and their status
SELECT e.id, e.status, e.routine_name, e.created_at,
       c.name as competition_name,
       r.allocated_spots as reservation_capacity
FROM competition_entries e
JOIN competitions c ON e.competition_id = c.id
LEFT JOIN reservations r ON e.reservation_id = r.id
WHERE e.studio_id = (SELECT id FROM studios WHERE owner_id = ...)
ORDER BY e.created_at DESC;
```

**Code Investigation Priority**:
1. Routine submission handler - check status update (Bug #18)
2. Capacity calculation logic - fix wrong competition/count (Bug #16)
3. Competition dropdown filter - restore St. Catharines (Bug #17)
4. Group size auto-detect - restore functionality (Bug #14)
5. Fee display logic - remove from creation wizard (Bug #13)

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
