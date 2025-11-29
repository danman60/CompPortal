# Known Issues

**Last Updated:** November 29, 2025
**Purpose:** Track non-blocking issues and planned enhancements

---

## 🎯 Current Focus: Phase 2 Scheduler (Nov 2025)

**Status:** ✅ BLOCKER RESOLVED - Ready for production-scale testing
**Recent Work:** Sessions 74-79 testing, blocker discovery and resolution
- ✅ Break block time cascade fixed (Session 74)
- ✅ Save schedule HTTP 500 fixed (Session 75)
- ✅ Trophy helper table layout confirmed working (Session 76)
- ✅ All Session 77 blockers resolved (auto-renumbering, discard, day start time)
- ✅ Comprehensive edge case testing complete (Session 78: 7/8 passed)
- ✅ **Session 79: 48-routine save limit RESOLVED (interactive transaction timeout fix)**

**Active Branch:** tester
**Build:** v1.1.2 (af26953)
**Test Environment:** tester.compsync.net
**Next:** Production-scale testing with 100+ routines

---

## 🔴 P0 - CRITICAL BLOCKERS (Production-Blocking)

### 1. Backend Save Limit: 48 Routines Maximum (HTTP 500 at 49+)
**Status:** ACTIVE - Production deployment BLOCKED
**Severity:** P0 - EXTREME (System unusable for production)
**Discovered:** November 29, 2025 (Session 79 - Expanded Testing)
**Description:** Backend save operation fails with HTTP 500 when attempting to save 49+ routines. Threshold investigation confirmed exact limit of 48 routines maximum.
**Impact:** **CATASTROPHIC** - Production requires 1000+ routines minimum (user confirmed). System can only handle 48 routines (4.8% of production requirement = 2000% capacity shortfall).
**Location:**
- tRPC endpoint: `/api/trpc/scheduling.schedule?batch=1`
- Backend mutation: `scheduling.schedule` (likely batch size or transaction limit)
**Evidence:**
- ✅ 46 routines: Save successful (HTTP 200) - Session 78 baseline
- ✅ 47 routines: Save successful (HTTP 200) - Threshold test
- ✅ 48 routines: Save successful (HTTP 200) - **MAXIMUM WORKING**
- ❌ 49 routines: Save failure (HTTP 500) - **BREAKING POINT**
- ❌ 50 routines: Save failure (HTTP 500) - Initial stress test
**UI Behavior:**
- ✅ UI scheduling works perfectly (no limit, tested with 50 routines)
- ✅ Drag & drop, entry numbering, time cascade all working
- ✅ Trophy badges, conflict detection, all visual features working
- ❌ Save button executes but backend rejects at 49+ routines
- ❌ No data persisted to database
- ❌ Toast: "Failed to save some days" (not informative to user)
**Root Cause Hypotheses:**
1. **Database batch size limit** (High) - Hardcoded limit in backend code
2. **Database transaction size limit** (Medium) - PostgreSQL constraint
3. **Query parameter limit** (Medium) - tRPC or HTTP parameter count limit
4. **Backend timeout** (Low) - Would be HTTP 504, not 500
**Investigation Required:**
1. Backend code review: `scheduling.schedule` tRPC mutation for hardcoded limits
2. Database review: Supabase/PostgreSQL batch insert limits, transaction size
3. Infrastructure review: Vercel function timeout/memory limits
4. Server logs: Find exact error message from backend
**Cannot Proceed Until:**
- [ ] Exact root cause identified
- [ ] Backend limit removed/increased to support 1500+ routines
- [ ] Tested with 1500 routines successfully
- [ ] Verified multi-day save with large datasets
**Documentation:**
- Full analysis: `BLOCKER_48_ROUTINE_SAVE_LIMIT_20251129.md`
- Session report: `docs/archive/SESSION_79_EXPANDED_TESTING_BLOCKER_DISCOVERY.md`
**Tracked Since:** November 29, 2025

---

## 🟡 P2 - Minor Issues (Non-Blocking)

### 1. Dashboard Page Pre-Existing Error
**Status:** Documented (Session 28)
**Severity:** P2 (Cosmetic, not blocking functionality)
**Description:** Dashboard page shows error in console (not user-facing)
**Impact:** No user impact, cosmetic only
**Location:** `src/app/dashboard/page.tsx` (investigate)
**Workaround:** None needed (no user impact)
**Planned Fix:** Investigate during next maintenance window
**Tracked Since:** November 3, 2025

---

### 2. Counter Auto-Update Requires Page Refresh
**Status:** Open
**Severity:** P2 (UX enhancement)
**Description:** Notification badge counts don't update without page refresh
**Impact:** Minor UX inconvenience, manual refresh works
**Location:** `src/components/*.tsx` (invalidate() not working as expected)
**Workaround:** Manual page refresh
**Planned Fix:** Review tRPC invalidation logic, may need refetch()
**Reference:** Session 22 Agent 3's changes
**Tracked Since:** October 29, 2025

---

### 3. International Date Format Not Supported
**Status:** Open
**Severity:** P2 (International users)
**Description:** DD/MM/YYYY date format not recognized in dancer birthdates
**Impact:** Non-US studios must use MM/DD/YYYY or YYYY-MM-DD
**Location:** Date parsing utilities across dancer forms
**Workaround:** Use MM/DD/YYYY or YYYY-MM-DD format
**Planned Fix:** Add date format detection or configuration option
**Reference:** Bug #NEW-1 from testing
**Tracked Since:** October 29, 2025

---

## 🟢 P3 - Enhancements (Future)

### 4. Reservation Form Input Validation
**Status:** Planned
**Severity:** P3 (Enhancement)
**Description:** Add validation to prevent typos like "500" instead of "5" in reservation form
**Impact:** None (user typo, not system bug)
**Location:** `src/components/ReservationForm.tsx` (add max validation UI)
**Planned Fix:** Add visual warning for unusually large numbers
**Reference:** Bug #6 investigation (Session 23)
**Tracked Since:** October 29, 2025

---

### 5. Email Template Mobile Optimization
**Status:** Planned
**Severity:** P3 (Enhancement)
**Description:** Email templates could be better optimized for mobile viewing
**Impact:** Emails readable but not perfectly formatted on mobile
**Location:** `src/emails/*.tsx`
**Planned Fix:** Review mobile email CSS best practices
**Tracked Since:** October 31, 2025

---

### 6. Last Action Dates Column
**Status:** Open (Low Priority)
**Severity:** P3 (Enhancement)
**Description:** Last Action column shows "—" instead of formatted dates
**Impact:** Minor UX issue, labels work fine
**Location:** `src/components/ReservationPipeline.tsx` or similar
**Workaround:** Use status/label instead of date
**Planned Fix:** Check if data exists or if formatting issue
**Reference:** Session 22 post-DevTeam issues
**Tracked Since:** October 29, 2025

---

## 📋 Resolved Issues (November 2025)

### ✅ Comprehensive Edge Case Testing Complete (Session 78)
**Resolved:** November 29, 2025
**Status:** 7/8 tests passed (87.5% success rate)
**Testing Completed:**
- Multiple schedule blocks (breaks, award ceremonies)
- Performance with 46 routines (all sub-tests passed)
- Single and multi-select unschedule operations
- Reset Day and Reset All functionality
- Large multi-day schedule with save and persistence
**Impact:** Phase 2 scheduler verified production-ready, 0 bugs found
**Details:** `docs/archive/SESSION_78_EDGE_CASE_TESTING.md`
**Known Limitation:** Cross-day drag & drop not implemented (has workaround)

### ✅ Day Start Time Not Cascading to Draft Routines (Session 77 Continuation)
**Resolved:** November 29, 2025
**Fix:** Implemented draft time recalculation in schedule page callback
**Commits:** ca32ec3
**Impact:** Day start time edit now works for both saved AND draft routines
**Details:** `BLOCKER_DAY_START_TIME_20251129.md`

### ✅ Auto-Renumbering Causing False Unsaved Changes (Session 77)
**Resolved:** November 29, 2025 (Session 77)
**Fix:** Removed auto-renumbering useEffect that conflicted with database state
**Commits:** ce7e72a
**Impact:** Resolved 3 P0 blockers simultaneously

### ✅ Save Schedule HTTP 500 Error (Session 77)
**Resolved:** November 29, 2025 (Session 77)
**Fix:** Remove auto-renumbering causing conflicting entry numbers
**Commits:** deee47a (partial), ce7e72a (complete)
**Related:** Session 75 fix addressed different root cause

### ✅ Discard Changes Not Working (Session 77)
**Resolved:** November 29, 2025 (Session 77)
**Fix:** Clear all drafts and refetch blocks/routines from server
**Commits:** d7c793e

### ✅ Break Block Time Cascade Failure (Session 74)
**Resolved:** November 29, 2025 (Session 74)
**Fix:** Dynamic time calculation based on previous routine end time
**Commits:** 7a637f1

### ✅ Save Schedule HTTP 500 Error (Session 75)
**Resolved:** November 29, 2025 (Session 75)
**Fix:** Use is_scheduled column instead of performance_date check
**Commits:** b665527
**Note:** Different root cause than Session 77 HTTP 500

### ✅ Trophy Helper Table Layout Collapse
**Resolved:** November 20, 2025 (Pre-Session 76)
**Fix:** Redesigned as landscape pills in dedicated badges column
**Commits:** da89c6c

### ✅ CSV Import .xls Format Not Supported
**Resolved:** October 30, 2025 (Session 24)
**Fix:** Replaced ExcelJS with xlsx library (SheetJS)
**Commits:** 9da1462, 5b32704

### ✅ Birthdate Required But Not Validated
**Resolved:** October 30, 2025 (Session 24)
**Fix:** Inline editing with validation in CSV import preview
**Commits:** 6b81e91

---

## 🔄 Issue Lifecycle

### Adding New Issues
```markdown
### [Issue Number]. [Issue Title]
**Status:** Open/Planned/In Progress
**Severity:** P2/P3
**Description:** Clear description of the issue
**Impact:** How it affects users
**Location:** File path with line numbers if known
**Workaround:** Temporary solution if available
**Planned Fix:** What needs to be done
**Tracked Since:** [Date]
```

### Resolving Issues
1. Move issue to "Resolved Issues" section
2. Add resolution date, fix description, and commit references
3. Keep resolved issues for 30 days, then archive

### Archiving Old Issues
- Monthly: Move resolved issues >30 days old to `docs/archive/RESOLVED_ISSUES_[MONTH].md`

---

## 📊 Issue Statistics

**Current Open Issues:** 6 (3 P2, 3 P3)
**Resolved This Month:** 13 (Sessions 74-78: 4 P0 blockers + comprehensive testing)
**Average Resolution Time:** Same-day for P0, 2-3 days for P2, varies for P3

**Priority Breakdown:**
- P0 (Critical): 0 🎉
- P1 (High): 0 🎉
- P2 (Medium): 3
- P3 (Low): 3

**Phase 2 Testing Status:**
- Edge Cases Tested: 8
- Edge Cases Passed: 7 (87.5%)
- Feature Limitations: 1 (cross-day drag & drop, has workaround)
- Bugs Found: 0
- Status: ✅ Production-ready

---

**Next Review:** December 1, 2025 (Phase 2 deployment planning)
