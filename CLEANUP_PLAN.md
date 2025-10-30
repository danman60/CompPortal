# CompPortal Root Directory Cleanup Plan

**Date:** October 30, 2025
**Current Files:** 114 markdown files
**Target:** 7 core files (94% reduction)
**Strategy:** Archive historical files, merge duplicates, delete obsolete content, use existing archive directories

---

## Executive Summary

The root directory has accumulated 114 markdown files during rapid pre-launch development (Sessions 10-24, Oct 2025). This plan organizes them into:

- **KEEP:** 7 essential files (active trackers only)
- **ARCHIVE:** 88 files (use existing dirs + 4 new subdirectories under `docs/archive/`)
- **MERGE:** 15 files (combine into 4 consolidated documents, then archive)
- **DELETE:** 10 files (obsolete/temporary/fragments)

**Benefits:**
- Clean root directory for active development
- Preserved historical context in organized archives
- No data loss - everything archived or consolidated
- Easy navigation for new sessions

---

## Phase 1: KEEP in Root (7 files)

These stay in root directory - actively maintained:

### Active Trackers (3)
1. **PROJECT_STATUS.md** (16.6KB) - Current status (Session 24, Oct 30)
2. **CURRENT_WORK.md** (24.6KB) - Active work tracker (Session 24)
3. **PROJECT.md** (8.8KB) - Project rules and constants

### Essential References (4)
4. **GOTCHAS.md** (6.1KB) - Common issues reference
5. **README.md** (10.5KB) - Project overview
6. **QUICKSTART.md** (2.7KB) - Quick start guide
7. **TEST_CREDENTIALS.md** (451B) - Test account credentials

**Total: 7 files remain in root**

---

## Phase 2: ARCHIVE to docs/archive/ (88 files)

Use existing directories where possible, create new subdirectories as needed:

**Existing directories:**
- `docs/archive/oct-2025-planning/` - Planning documents
- `docs/archive/oct-2025-sessions/` - Session summaries
- `docs/archive/oct-2025-testing/` - Test reports
- `docs/archive/sessions-old/` - Older sessions
- `docs/archive/trackers/` - Old status trackers

**New directories to create:**
- `docs/archive/bugs/` - Bug investigations
- `docs/archive/blockers/` - Blocker reports
- `docs/archive/audits/` - System audits
- `docs/archive/multi-tenant/` - Multi-tenant implementation

### A. oct-2025-sessions/ (7 files - USE EXISTING)
Historical session logs:
- SESSION_10_SUMMARY.md (Oct 24 - Double-deduction bug)
- SESSION_16_SUMMARY.md (Oct 25 - Phase 6 complete)
- SESSION_18_SUMMARY.md (Oct 26 - Tenant isolation)
- SESSION_19_HANDOFF.md (Oct 26 - Context overflow)
- SESSION_19_SUMMARY.md (Oct 26 - SD UX improvements)
- SESSION_SUMMARY.md (Oct 25 - Generic summary)
- SESSION_SUMMARY_OCT28.md (Oct 28 - Testing & fixes)

### B. blockers/ (3 files)
All resolved blockers:
- BLOCKER_APPROVAL_RACE_CONDITION.md (✅ Oct 29 - Not a race condition)
- BLOCKER_BUG3_STILL_FAILING.md (✅ Oct 25 - Transaction fix)
- BLOCKER_RESERVATION_CLOSURE.md (✅ Oct 25 - Fix #6 working)

### C. bugs/ (10 files)
Bug investigations and fixes:
- BUG_DOUBLEDEDUCTION_FINDINGS.md
- BUG_TENANT_ID_PRISMA.md
- BUG3_ROOT_CAUSE.md
- CRITICAL_FIXES.md
- FIXES_APPLIED.md
- ARCHITECTURE_ISSUES.md
- ENTRY_CREATION_BUG.md
- HANDOFF_DATE_BUG_FIX.md
- INVESTIGATION_REPORT_500_ROUTINES.md
- PHASE1_COMPLETE.md

### D. oct-2025-testing/ (20 files - USE EXISTING, AFTER MERGES)
Test reports and results:
- GOLDEN_PATH_TESTS_COMPLETE.md (MERGED - 4 files combined)
- CSV_IMPORT_TESTING_COMPLETE.md (MERGED - 4 files combined)
- FINAL_TEST_REPORTS_OCT29.md (MERGED - 4 files combined)
- PRODUCTION_TEST_EXECUTION_REPORT.md
- PLAYWRIGHT_TEST_SUITE.md
- PLAYWRIGHT_TEST_RESULTS.md
- PHASE6_TEST_REPORT.md
- PHASE1_TEST_PLAN.md
- PHASE1_TEST_RESULTS.md
- EDGE_CASE_TEST_RESULTS.md
- HIGH_LOAD_TEST_RESULTS.md
- E2E_TEST_SUITE.md
- FORWARD_TESTING_REPORT.md
- TESTING_ROUND_2_REPORT.md
- TESTING_REPORT.md
- TEST_SUITE_SUMMARY.md

### E. audits/ (14 files - NEW DIRECTORY)
System audits and analysis:

**Oct 30 Audit Series (8 files):**
- LAUNCH_READINESS_CHECKLIST_2025-10-30.md
- SECURITY_AUDIT_2025-10-30.md
- DATABASE_HEALTH_AUDIT_2025-10-30.md
- PERFORMANCE_AUDIT_2025-10-30.md
- CODE_QUALITY_AUDIT_2025-10-30.md
- DOCUMENTATION_AUDIT_2025-10-30.md
- CAPACITY_SYSTEM_DEEP_DIVE_2025-10-30.md
- MIGRATION_READINESS_2025-10-30.md

**Other Audits (6 files):**
- OPUS_PRE_PRODUCTION_AUDIT.md
- UX_UI_AESTHETIC_AUDIT.md
- SD_SECURITY_AUDIT_REPORT.md
- BACKEND_ANALYSIS_REPORT.md
- TENANT_ISOLATION_DEEP_SCAN.md
- AESTHETIC_IMPROVEMENTS_SIGNOFF.md

### F. multi-tenant/ (13 files - AFTER MERGE)
Multi-tenant implementation (Oct 29):
- TENANT_BRANDING_AUDIT_COMPLETE.md (MERGED - 3 files combined)
- MULTI_TENANT_PRE_IMPLEMENTATION_ANALYSIS.md
- MULTI_TENANT_SPEC_ADDENDUM.md
- MULTI_TENANT_FINAL_IMPLEMENTATION_PLAN.md
- MULTI_TENANT_READINESS_AUDIT.md
- MULTI_TENANT_READINESS_COMPLETE_AUDIT.md
- MULTI_TENANT_DRY_RUN_GOTCHAS.md
- SECOND_TENANT_SETUP.md
- VERCEL_MULTI_TENANT_SETUP.md
- TENANT_IMPLEMENTATION_GUIDE.md
- SIGNUP_TENANT_ANALYSIS.md

### G. migration/ (3 files)
Migration planning:
- MIGRATION_PLANNING_SESSION_2025-10-30.md
- PRODUCTION_SEED_HANDBOOK.md
- EMPWR_PDF_VS_DATABASE_BREAKDOWN.md

### H. oct-2025-planning/ (7 files - USE EXISTING)
Rebuild planning & architecture decisions:
- CAPACITY_REWRITE_PLAN.md (Oct 24 - Surgical fix plan)
- REBUILD_DECISION.md (Oct 24 - Fix vs rebuild decision)
- REBUILD_PLAN.md
- REBUILD_VS_LEGACY_COMPARISON.md
- ENTRY_REBUILD_PLAN.md
- ENTRY_CREATE_REBUILD_ANALYSIS.md
- PARALLEL_REBUILD_EXECUTION_PLAN.md (moved from DELETE)

### I. oct-2025-planning/ (continued - 13 total files in this dir)
Feature-specific planning:
- CD_ENTRIES_PAGE_PLAN.md
- SCHEDULING_SUITE_SUMMARY.md
- HARDCODED_SETTINGS_PLAN.md
- DEMO_PREP_PLAN.md
- RESEND_SETUP_CHECKLIST.md
- TEST_EXECUTION_RUNBOOK.md

### J. email/ (2 files)
Email system debugging:
- EMAIL_NOTIFICATIONS_VERIFICATION.md
- EMAIL_DEBUG_STATUS.md

### K. parallel/ (4 files)
DevTeam protocol and parallel work:
- DEVTEAM_SESSION_REPORT.md
- PARALLEL_AGENT_PROMPT.md
- PARALLEL_AGENT_REPORT.md
- POST_DEVTEAM_ISSUES.md

### L. misc/ (8 files)
Miscellaneous analysis:
- COMPETITION_SETTINGS_ANALYSIS.md
- COMPETITION_SETTINGS_FULL_ANALYSIS.md
- DANCER_DELETION_UX_REPORT.md

**Total: 85 files archived (organized into 12 subdirectories)**

---

## Phase 3: MERGE Then Archive (15 files → 4 files)

Combine related reports into consolidated documents:

### 3A. Golden Path Tests → testing/
**Merge 4 files into:** `GOLDEN_PATH_TESTS_COMPLETE.md`

**Source files:**
1. GOLDEN_PATH_TESTS.md (10.5KB) - Test definitions
2. GOLDEN_PATH_TEST_RESULTS.md (12.2KB) - Round 1: 15/15 pass
3. GOLDEN_PATH_TESTS_ROUND2.md (10.8KB) - Round 2 definitions
4. GOLDEN_PATH_TESTS_ROUND2_RESULTS.md (17.9KB) - Round 2: 10/10 pass

**Result:** Single 50KB document covering all 25 golden path tests

### 3B. CSV Import Testing → testing/
**Merge 4 files into:** `CSV_IMPORT_TESTING_COMPLETE.md`

**Source files:**
1. CSV_IMPORT_TEST_REPORT.md (9.3KB) - Initial report
2. CSV_IMPORT_AUDIT_REPORT.md (17.3KB) - Code audit
3. CSV_IMPORT_TEST_EXECUTION_REPORT.md (8.9KB) - P0 blocker
4. CSV_IMPORT_COMPREHENSIVE_TEST_REPORT.md (28.8KB) - Final report

**Result:** Single 64KB comprehensive CSV import test document

### 3C. Final Test Reports → testing/
**Merge 4 files into:** `FINAL_TEST_REPORTS_OCT29.md`

**Source files:**
1. COMPREHENSIVE_FINAL_TEST_REPORT.md (21.7KB)
2. FINAL_TEST_REPORT_POST_FIXES.md (13.2KB)
3. FINAL_COMPREHENSIVE_TEST_REPORT_SESSION_2.md (18.6KB)
4. TEST_SUITE_SUMMARY.md (8.8KB)

**Result:** Single 62KB final test report

### 3D. Tenant Branding Audit → multi-tenant/
**Merge 3 files into:** `TENANT_BRANDING_AUDIT_COMPLETE.md`

**Source files:**
1. TENANT_BRANDING_AUDIT.md (13.3KB) - Initial audit
2. TENANT_BRANDING_AUDIT_COMPLETE.md (14.0KB) - Complete audit
3. TENANT_BRANDING_FINAL_AUDIT.md (12.5KB) - Final audit

**Result:** Single 40KB tenant branding audit document

**Total: 15 files → 4 merged documents**

---

## Phase 4: DELETE (11 files)

Remove obsolete/temporary files:

### Fragments (3 files)
- TEST_1.1_RESULT.md - Incomplete test fragment
- test-fixes.md - Lowercase fragment (superseded)
- test-results.md - Lowercase fragment (superseded)

### Temporary Session Plans (4 files)
All superseded by PROJECT_STATUS.md:
- NEXT_SESSION.md
- NEXT_SESSION_URGENT.md
- NEXT_SESSION_IMPORT_UX.md
- NEXT_SESSION_IMPORTS_CONTINUED.md

### Completed TODOs (1 file)
- EMAIL_DASHBOARD_BUTTONS_TODO.md - All items completed

### Temporary Work Plans (1 file)
- TONIGHT_WORK_PLAN.md - Session-specific, obsolete

### Excessive Documents (1 file)
- PRODUCTION_SAFEGUARDS.md (73KB) - Excessive, main points in other docs

**Total: 10 files deleted** (reduced from 11, moved PARALLEL_REBUILD to archive)

---

## Implementation Steps

### Step 1: Create New Archive Directories
```bash
# Only create NEW directories (use existing where possible)
mkdir -p docs/archive/{blockers,bugs,audits,multi-tenant,migration,email,parallel,misc}
```

### Step 2: Merge Documents (Create 4 new files)
1. Combine Golden Path test files
2. Combine CSV Import test files
3. Combine Final test report files
4. Combine Tenant Branding audit files

### Step 3: Move Session Summaries
```bash
mv SESSION_*.md docs/archive/oct-2025-sessions/
```

### Step 4: Move Blockers
```bash
mv BLOCKER_*.md docs/archive/blockers/
```

### Step 5: Move Bug Reports
```bash
mv BUG*.md docs/archive/bugs/
mv CRITICAL_FIXES.md FIXES_APPLIED.md ARCHITECTURE_ISSUES.md docs/archive/bugs/
mv ENTRY_CREATION_BUG.md HANDOFF_DATE_BUG_FIX.md docs/archive/bugs/
mv INVESTIGATION_REPORT_500_ROUTINES.md PHASE1_COMPLETE.md docs/archive/bugs/
```

### Step 6: Move Test Reports (after merges)
```bash
# Move merged documents
mv GOLDEN_PATH_TESTS_COMPLETE.md docs/archive/oct-2025-testing/
mv CSV_IMPORT_TESTING_COMPLETE.md docs/archive/oct-2025-testing/
mv FINAL_TEST_REPORTS_OCT29.md docs/archive/oct-2025-testing/

# Move individual test reports
mv PRODUCTION_TEST_EXECUTION_REPORT.md docs/archive/oct-2025-testing/
mv PLAYWRIGHT_TEST_SUITE.md PLAYWRIGHT_TEST_RESULTS.md docs/archive/oct-2025-testing/
mv PHASE6_TEST_REPORT.md PHASE1_TEST_*.md docs/archive/oct-2025-testing/
mv EDGE_CASE_TEST_RESULTS.md HIGH_LOAD_TEST_RESULTS.md docs/archive/oct-2025-testing/
mv E2E_TEST_SUITE.md FORWARD_TESTING_REPORT.md docs/archive/oct-2025-testing/
mv TESTING_*.md TEST_SUITE_SUMMARY.md docs/archive/oct-2025-testing/
```

### Step 7: Move Audits
```bash
# Oct 30 audit series
mv LAUNCH_READINESS_CHECKLIST_2025-10-30.md docs/archive/audits/
mv SECURITY_AUDIT_2025-10-30.md docs/archive/audits/
mv DATABASE_HEALTH_AUDIT_2025-10-30.md docs/archive/audits/
mv PERFORMANCE_AUDIT_2025-10-30.md docs/archive/audits/
mv CODE_QUALITY_AUDIT_2025-10-30.md docs/archive/audits/
mv DOCUMENTATION_AUDIT_2025-10-30.md docs/archive/audits/
mv CAPACITY_SYSTEM_DEEP_DIVE_2025-10-30.md docs/archive/audits/
mv MIGRATION_READINESS_2025-10-30.md docs/archive/audits/

# Other audits
mv OPUS_PRE_PRODUCTION_AUDIT.md docs/archive/audits/
mv UX_UI_AESTHETIC_AUDIT.md docs/archive/audits/
mv SD_SECURITY_AUDIT_REPORT.md docs/archive/audits/
mv BACKEND_ANALYSIS_REPORT.md docs/archive/audits/
mv TENANT_ISOLATION_DEEP_SCAN.md docs/archive/audits/
mv AESTHETIC_IMPROVEMENTS_SIGNOFF.md docs/archive/audits/
```

### Step 8: Move Multi-Tenant Files (after merge)
```bash
mv TENANT_BRANDING_AUDIT_COMPLETE.md docs/archive/multi-tenant/
mv MULTI_TENANT*.md docs/archive/multi-tenant/
mv SECOND_TENANT_SETUP.md docs/archive/multi-tenant/
mv VERCEL_MULTI_TENANT_SETUP.md docs/archive/multi-tenant/
mv TENANT_IMPLEMENTATION_GUIDE.md docs/archive/multi-tenant/
mv SIGNUP_TENANT_ANALYSIS.md docs/archive/multi-tenant/
```

### Step 9: Move Migration Files
```bash
mv MIGRATION_PLANNING_SESSION_2025-10-30.md docs/archive/migration/
mv PRODUCTION_SEED_HANDBOOK.md docs/archive/migration/
mv EMPWR_PDF_VS_DATABASE_BREAKDOWN.md docs/archive/migration/
```

### Step 10: Move Architecture/Rebuild/Planning Files
```bash
# All planning and architecture docs go to oct-2025-planning/
mv CAPACITY_REWRITE_PLAN.md docs/archive/oct-2025-planning/
mv REBUILD_DECISION.md docs/archive/oct-2025-planning/
mv REBUILD_PLAN.md docs/archive/oct-2025-planning/
mv REBUILD_VS_LEGACY_COMPARISON.md docs/archive/oct-2025-planning/
mv ENTRY_REBUILD_PLAN.md docs/archive/oct-2025-planning/
mv ENTRY_CREATE_REBUILD_ANALYSIS.md docs/archive/oct-2025-planning/
mv CD_ENTRIES_PAGE_PLAN.md docs/archive/oct-2025-planning/
mv SCHEDULING_SUITE_SUMMARY.md docs/archive/oct-2025-planning/
mv HARDCODED_SETTINGS_PLAN.md docs/archive/oct-2025-planning/
mv DEMO_PREP_PLAN.md docs/archive/oct-2025-planning/
mv RESEND_SETUP_CHECKLIST.md docs/archive/oct-2025-planning/
mv TEST_EXECUTION_RUNBOOK.md docs/archive/oct-2025-planning/
```

### Step 11: Move Email Files
```bash
mv EMAIL_NOTIFICATIONS_VERIFICATION.md docs/archive/email/
mv EMAIL_DEBUG_STATUS.md docs/archive/email/
```

### Step 12: Move Parallel Work
```bash
mv DEVTEAM_SESSION_REPORT.md docs/archive/parallel/
mv PARALLEL_AGENT_PROMPT.md docs/archive/parallel/
mv PARALLEL_AGENT_REPORT.md docs/archive/parallel/
mv POST_DEVTEAM_ISSUES.md docs/archive/parallel/
```

### Step 13: Move Miscellaneous
```bash
mv COMPETITION_SETTINGS_*.md docs/archive/misc/
mv DANCER_DELETION_UX_REPORT.md docs/archive/misc/
```

### Step 14: Delete Obsolete Files
```bash
rm TEST_1.1_RESULT.md test-fixes.md test-results.md
rm NEXT_SESSION*.md TONIGHT_WORK_PLAN.md
rm EMAIL_DASHBOARD_BUTTONS_TODO.md
rm PRODUCTION_SAFEGUARDS.md
```

### Step 15: Remove DOCS_INDEX.md (info now in PROJECT_STATUS.md)
```bash
rm DOCS_INDEX.md
```

---

## Post-Cleanup Verification

### Root Directory Should Contain (7 files)
```
✓ PROJECT_STATUS.md
✓ CURRENT_WORK.md
✓ PROJECT.md
✓ GOTCHAS.md
✓ README.md
✓ QUICKSTART.md
✓ TEST_CREDENTIALS.md
```

### Archive Directory Structure
```
docs/archive/
├── oct-2025-sessions/ (7 files) [EXISTING]
├── oct-2025-testing/ (20 files - includes 3 merged docs) [EXISTING]
├── oct-2025-planning/ (13 files) [EXISTING - expanded]
├── trackers/ (existing old trackers) [EXISTING]
├── sessions-old/ (existing old sessions) [EXISTING]
├── blockers/ (3 files) [NEW]
├── bugs/ (10 files) [NEW]
├── audits/ (14 files) [NEW]
├── multi-tenant/ (13 files - includes 1 merged doc) [NEW]
├── migration/ (3 files) [NEW]
├── email/ (2 files) [NEW]
├── parallel/ (4 files) [NEW]
└── misc/ (8 files) [NEW]
```

### Verification Commands
```bash
# Count root markdown files (should be 7)
ls -1 *.md | wc -l

# Count archived files
find docs/archive -name "*.md" | wc -l

# List root directory (should be clean)
ls -lh *.md
```

---

## Benefits

### Before Cleanup
- 114 files in root directory
- Difficult to find current documents
- Historical files mixed with active trackers
- Duplicate/superseded information scattered

### After Cleanup
- 7 files in root directory (94% reduction)
- Clear separation: active vs. historical
- All history preserved in organized archives
- Leverages existing archive structure
- Easy navigation for new sessions
- Reduced context loading time
- DOCS_INDEX.md removed (info in PROJECT_STATUS.md)

---

## Risk Assessment

**Risk Level:** LOW

**Reasoning:**
- No files deleted without verification
- All historical content preserved in archives
- Merged documents combine related information (no loss)
- Can be reversed if needed (git history)

**Safeguards:**
- Git commit before starting cleanup
- Review merged documents before deleting originals
- Keep archive structure flat (easy to find files)
- Update DOCS_INDEX.md with archive locations

---

## Timeline

**Estimated Time:** 45-60 minutes

- Step 1-2: Create structure + merges (15 min)
- Step 3-14: Move files (20 min)
- Step 15: Delete obsolete files (5 min)
- Step 16: Update DOCS_INDEX.md (10 min)
- Verification + commit (10 min)

---

## Approval Checklist

Before executing this plan:

- [ ] Review files marked for deletion (11 files)
- [ ] Review merge strategy (15 files → 4 docs)
- [ ] Confirm archive structure (12 subdirectories)
- [ ] Verify no critical documents missed
- [ ] Create git commit before cleanup
- [ ] Confirm rollback plan if needed

---

**Status:** ⏳ AWAITING APPROVAL

Once approved, I will execute this cleanup plan systematically, creating backups and verifying each step.
