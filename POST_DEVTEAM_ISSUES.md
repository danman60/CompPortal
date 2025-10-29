# Post-DevTeam Session Issues

**Date:** October 29, 2025
**Session:** DevTeam Protocol (16 fixes)
**Build:** 7f52cbf

---

## 🚨 P0 - CRITICAL (Blockers)

**Status:** ✅ NO P0 BLOCKERS - Safe to launch!

**Issue #1 (Originally P0):** Downgraded to P2 after investigation revealed it's not a race condition. See below.

---

## P1 - HIGH (Pre-Launch)

### 2. Email Design: ReservationApproved Broken

**Issue:** Purple "Confirmed Spaces" bubble element renders outside grey container box

**Comparison:** SignupConfirmation email has correct design

**Location:** `src/emails/ReservationApproved.tsx`

**Fix Required:**
- Review container/box styling
- Match SignupConfirmation layout
- Test email rendering in multiple clients

### 3. Email Design: PaymentConfirmed Broken

**Issue:** Same bubble element issue as ReservationApproved

**Location:** `src/emails/PaymentConfirmed.tsx` (if exists)

**Fix Required:**
- Same fix as ReservationApproved

### 4. Counter Auto-Update Still Slow

**Issue:** After approval, counter doesn't update immediately - requires page refresh

**Note:** Agent 3 added `invalidate()` but it's not working as expected

**Location:** `src/components/ReservationPipeline.tsx` line 59

**Investigation:**
- Check if `invalidate()` is being called
- Check if query is actually refetching
- May need `refetch()` in addition to `invalidate()`
- May be related to race condition issue

---

## P2 - MEDIUM (Polish)

### 5. Remove REBUILD Badge from Studio Pipeline

**Issue:** Studio Pipeline button shows "🔨 REBUILD" badge

**Location:** Likely in `src/components/CompetitionDirectorDashboard.tsx` or pipeline header

**Fix Required:**
- Remove REBUILD badge from button/header
- This is production-ready, no longer a rebuild

### 6. Double Toast on Routine Creation

**Issue:** Creating a routine shows TWO toasts:
1. "Routine Created Successfully"
2. "Entry created successfully"

**Location:** `src/components/rebuild/entries/EntryCreateFormV2.tsx` or router

**Fix Required:**
- Check if mutation triggers two success callbacks
- Check if component and router both show toasts
- Remove duplicate toast notification

### 7. Add "Title Status" Column to Entries Table

**Issue:** SD entries table at `/dashboard/entries` should show title upgrade status

**Requirement:** Display "$30 upgrade" marker for entries with title upgrades

**Location:** `src/app/dashboard/entries/page.tsx` or entries table component

**Fix Required:**
- Add column header "Title Status"
- Show "$30" or "Upgrade" badge when `title_upgrade = true`
- Add to both list and card views

### 1. Reservation Input Validation (Downgraded from P0)

**Issue:** No frontend validation prevents users from typing unreasonable numbers (e.g., 500 instead of 5)

**Example:** Studio typed "500" when they meant "5", system accepted with no warning

**Investigation:** Session 23 (45 min) - Confirmed NOT a race condition. Studio created reservation with 500 spaces, CD approved exactly what was requested. See `INVESTIGATION_REPORT_500_ROUTINES.md`.

**Location:** `src/components/ReservationForm.tsx` (line 217, 228)

**Fix Required:**
- Add `max="200"` to number input
- Add warning message for values >100
- Add confirmation dialog before submitting large requests
- Lower backend max from 1000 to 300

**Estimated Time:** 1 hour

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 (Blocker) | 0 | ✅ NO BLOCKERS |
| P1 (High) | 3 | ⚠️ Pre-launch required |
| P2 (Medium) | 4 | 📋 Post-launch acceptable |

**Total New Issues:** 7 (1 resolved as non-blocker, 6 remaining)

**Resolved in Session 23:**
- Issue #1: Investigated and downgraded from P0 to P2 (not a race condition, just missing validation)

**Caused by DevTeam Session:**
- Issue #4 (counter update) - Agent 3's `invalidate()` not working as expected

**Pre-existing Issues:**
- Issue #1 (validation) - Existed before DevTeam, just discovered during testing
- Issue #2, #3 (email design) - Agent 1 attempted fix but may not have fully resolved
- Issue #5, #6, #7 - New requests, not related to DevTeam changes

---

## Recommended Fix Order

1. **Pre-Launch:** Fix P1 issues (4-6 hours total)
   - Email designs (Issues #2, #3)
   - Counter auto-update (Issue #4)
   - Last Action dates (if needed)

2. **Post-Launch:** Address P2 polish items (4-5 hours total)
   - Input validation (Issue #1) - 1 hour
   - REBUILD badge removal (Issue #5) - 15 min
   - Double toast fix (Issue #6) - 30 min
   - Title Status column (Issue #7) - 1.5 hours

**Total Estimated Time:** 8-11 hours to resolve all issues

---

**Next Session:** Focus on P1 pre-launch issues (no P0 blocker!)
