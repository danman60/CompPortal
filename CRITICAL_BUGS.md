# Critical Bugs Found - 2025-10-23

## Status: ✅ 7 FIXED, 🔴 4 REMAINING (Out of 11 Total)

**Test Account**: danieljohnabrahamson@gmail.com (Studio Director)
**Reservations**: 15 spaces (St. Catharines), 1 space (London)

---

## ✅ FIXED BUGS (7)

### Bug #10: Missing Database Migration - two_factor_enabled ✅ FIXED
**Fixed**: Previous session via Supabase migration

### Bug #20: SD Can Mark Invoice as Paid ✅ FIXED
**Severity**: CRITICAL - Financial integrity violation
**Fixed**: 2025-10-23 Session (Commit: e093001)

**Solution Applied**:
- Backend: Added role check in `invoice.ts` (line 733-737) blocking studio_director role
- Frontend: Hide "Mark as Paid" button for SD role in `InvoiceDetail.tsx` (lines 19-21, 414-433)
- Show read-only status message clarifying external payment workflow

**Verification**: ✅ Code deployed, build passed

---

### Bug #18: Routines Not Marked as Submitted ✅ FIXED
**Severity**: CRITICAL - Data integrity issue
**Fixed**: 2025-10-23 Session (Commit: e6a9e4f)

**Solution Applied**:
- Explicitly preserve status field in update mutation (`entry.ts:872-888`)
- Extract status from data spread to prevent schema default override
- Allows draft → registered transition on submission

**Verification**: ✅ Code deployed, build passed

---

### Bug #16 & #17: Competition Dropdown & Capacity Tracking ✅ FIXED
**Severity**: CRITICAL - Blocked routine creation for approved reservations
**Fixed**: 2025-10-23 Session (Commit: ec7c6e7)

**Solution Applied**:
- **Bug #17**: Modified `useEntryFilters.ts` (lines 17-48) to include ALL competitions with approved reservations (not just those with existing entries)
- **Bug #16**: Modified `useSpaceUsage.ts` (lines 12-15) to match reservation by competition_id instead of always using first reservation
- Updated `EntriesList.tsx` (line 47) to pass reservationData to useEntryFilters

**Verification**: ✅ Code deployed, build passed

---

### Bug #14: Group Size Auto-Detection Not Working ✅ FIXED
**Severity**: HIGH - Extra friction in routine creation
**Fixed**: 2025-10-23 Session (Commits: 54a6a0b, 2ba5505)

**Solution Applied**:
- Added useEffect in `EntryForm.tsx` (lines 207-226) to auto-detect group size based on dancer count
- **CORRECTED** to use tenant-configured min_participants/max_participants ranges (NOT hardcoded patterns)
- Respects Competition Director's custom size category configuration

**Verification**: ✅ Code deployed, build passed, multi-tenant safe

---

### Bug #13: Fee Display on Routine Creation Page ✅ FIXED
**Severity**: MEDIUM - Confusing UX
**Fixed**: 2025-10-23 Session (Commit: 6e0876f)

**Solution Applied**:
- Removed "Estimated Fee" display from routine creation wizard review step
- Fees now calculated and displayed ONLY after submission via invoice generation
- `EntryForm.tsx` (lines 798-799)

**Verification**: ✅ Code deployed, build passed

---

### Bug #19: Reservation Pipeline Flash ✅ FIXED
**Severity**: LOW - UX annoyance
**Fixed**: 2025-10-23 Session (Commit: 3e4fe35)

**Solution Applied**:
- Added isLoading state to `ReservationPipeline.tsx` (line 42)
- Show loading spinner before empty state (lines 387-393)
- Prevents flash of "no reservations found" message before data loads

**Verification**: ✅ Code deployed, build passed

---

### Bug #11: Email Notifications Not Sending ✅ DIAGNOSED (Configuration Issue)
**Severity**: HIGH - Core notification system not functional
**Status**: NOT A CODE BUG - Configuration issue

**Root Cause**:
- Email service intentionally disabled when SMTP environment variables not configured
- Code: `src/lib/email.ts:24-27` returns null if SMTP_HOST/USER/PASS missing
- Graceful degradation working as designed

**Required Fix** (Infrastructure):
Set environment variables in Vercel:
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - Port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_SECURE` - "true" for TLS/465 (optional)
- `EMAIL_FROM` - Sender email (optional)

**Verification**: ⏳ Requires SMTP configuration in Vercel, then test reservation approval email

---

## 🔴 REMAINING BUGS (4)

### Bug #12: React Hydration Error on Dashboard 🔴 ACTIVE
**Severity**: MEDIUM - Console spam
**Error**: Minified React error #418 (Hydration mismatch)

**Investigation Required**:
- Enable source maps in production OR reproduce locally
- Check for date/time rendering, random values, or browser APIs in SSR
- Likely cause: Server vs client rendering mismatch

---

### Bug #15: React Error #419 After Routine Creation 🔴 ACTIVE
**Severity**: HIGH - Crashes after successful creation
**Error**: Minified React error #419 (Text content mismatch)

**Investigation Required**:
- Enable source maps in production OR reproduce locally
- Check routine creation success handler for dynamic text
- Related to hydration mismatch (similar to Bug #12)

---

## 📊 SESSION SUMMARY

### Fixed This Session: 6 Bugs + 1 Diagnosed
- ✅ Bug #20 (CRITICAL): SD can mark invoice as paid
- ✅ Bug #18 (CRITICAL): Routine status not updating
- ✅ Bug #16 & #17 (CRITICAL): Competition dropdown & capacity tracking
- ✅ Bug #14 (HIGH): Group size auto-detect
- ✅ Bug #13 (MEDIUM): Fee display on creation
- ✅ Bug #19 (LOW): Reservation pipeline flash
- 📋 Bug #11 (HIGH): Email notifications (diagnosed as config issue)

### Impact:
- ✅ **ALL 4 CRITICAL bugs blocking core workflow: FIXED**
- ✅ 100% build success rate (7/7 builds passed)
- ✅ All fixes deployed to production
- 📦 7 commits pushed successfully

### Commits:
1. e093001 - Bug #20: Invoice payment role check
2. e6a9e4f - Bug #18: Status field preservation
3. ec7c6e7 - Bug #16 & #17: Dropdown & capacity fixes
4. 54a6a0b - Bug #14: Group size auto-detect (initial)
5. 2ba5505 - Bug #14: Group size auto-detect (corrected for multi-tenant)
6. 6e0876f - Bug #13: Remove fee display
7. 3e4fe35 - Bug #19: Pipeline loading state

### Remaining Work:
- 2 React hydration errors (require source maps or local reproduction)
- SMTP configuration for email notifications

---

**Last Updated**: 2025-10-23
**Status**: Production-ready for testing all fixed bugs

