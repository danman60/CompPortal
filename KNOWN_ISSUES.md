# Known Issues

**Last Updated:** November 4, 2025
**Purpose:** Track non-blocking issues and planned enhancements

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

## 📋 Resolved Issues (Last 30 Days)

### ✅ CSV Import .xls Format Not Supported
**Resolved:** October 30, 2025 (Session 24)
**Fix:** Replaced ExcelJS with xlsx library (SheetJS)
**Commits:** 9da1462, 5b32704

### ✅ Birthdate Required But Not Validated
**Resolved:** October 30, 2025 (Session 24)
**Fix:** Inline editing with validation in CSV import preview
**Commits:** 6b81e91

### ✅ Tenant ID Missing in Reservation Creation
**Resolved:** November 3, 2025 (Session 27)
**Fix:** Added tenant_id to testing suite reservation creation
**Commits:** f5d8dfb

### ✅ SA Account Had Wrong Role
**Resolved:** November 3, 2025 (Session 27)
**Fix:** Changed from studio_director to super_admin
**Commits:** f5d8dfb

### ✅ Test Account Email Alias Conflict
**Resolved:** November 3, 2025 (Session 27)
**Fix:** Migrated from daniel@streamstage.live to djamusic@gmail.com
**Commits:** 3338d07

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
**Resolved This Month:** 5
**Average Resolution Time:** 2-3 days for P2, varies for P3

**Priority Breakdown:**
- P0 (Critical): 0 🎉
- P1 (High): 0 🎉
- P2 (Medium): 3
- P3 (Low): 3

---

**Next Review:** November 11, 2025 (Post-launch review)
