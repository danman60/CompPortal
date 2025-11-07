# Archive Plan - November 2025 Sprint Cleanup

**Date:** November 7, 2025
**Status:** Planning phase
**Latest Build:** b53f109 (sortable entries, feedback system)

---

## Files to Archive

### Root Directory (D:\ClaudeCode)

#### Session/Test Reports (→ docs/archive/test-reports-nov2025/)
- ❌ `PRODUCTION_LAUNCH_TEST_RESULTS.md` (Nov 7)
- ❌ `PRODUCTION_LAUNCH_TEST_RESULTS_FINAL.md` (Nov 7)
- ❌ `PRODUCTION_TEST_RESULTS_20251107.md` (Nov 7)
- ❌ `FINAL_TEST_COMPLETION_REPORT.md` (Nov 7)
- ❌ `TEST_COMPLETION_FINAL_SUMMARY.md` (Nov 7)
- ❌ `TEST_SESSION_FINAL_SUMMARY_20251107.md` (Nov 7)
- ❌ `EXCEPTION_WORKFLOW_TEST_COMPLETE_20251107.md` (Nov 7)
- ❌ `FINAL_TEST_SESSION_SUMMARY_20251107.md` (Nov 7)
- ❌ `COMPREHENSIVE_TEST_REPORT_FINAL_20251107.md` (Nov 7)
- ❌ `TESTING_PROGRESS_INTERIM_20251106.md` (Nov 6)
- ❌ `TEST_SUITE_STATUS.md`

#### Completed Session Logs (→ docs/archive/sessions-nov2025/)
- ❌ `SESSION_ACCOUNT_RECOVERY_COMPLETE.md`
- ❌ `SESSION_ACCOUNT_RECOVERY_TESTING.md`
- ❌ `DClaudeCodeCompPortalSESSION_LOG_2025-10-02.md` (corrupted filename)

#### Resolved Blocker Files (→ docs/archive/blockers/)
- ❌ `BLOCKER_T2.1_routine_age_null_20251106.md` (Nov 6 - resolved)
- ❌ `BUG4_INVESTIGATION_RESOLVED.md` (Nov 7 - resolved)
- ❌ `BUG5_INVESTIGATION.md` (Nov 7 - resolved)
- ❌ `BUG5_VERIFICATION_COMPLETE.md` (Nov 7 - resolved)

#### Implementation/Analysis Docs (→ docs/archive/implementations/)
- ❌ `DASHBOARD_PERFORMANCE_FIX.md`
- ❌ `TENANT_LOGO_IMPLEMENTATION.md`
- ❌ `ROUTINE_DATA_ANALYSIS.md`
- ❌ `DANCER_INVOICE_UI_FIXES.md`

#### Test Protocols (→ docs/archive/test-protocols/)
- ❌ `BUGFIX_TEST_SUITE.md`
- ❌ `AUTONOMOUS_TEST_PROTOCOL.md`
- ❌ `PRODUCTION_LAUNCH_TEST_SUITE.md`

#### Setup/Onboarding (→ docs/archive/onboarding/)
- ❌ `SETUP_COMPLETE_README.md`
- ❌ `READY_FOR_AUTONOMOUS_TESTING.md`

#### Pre-Release Planning (→ docs/archive/planning/)
- ❌ `Pre-Release_Routines.md`

### CompPortal Directory

#### Completed Test Reports (→ docs/archive/test-reports-nov2025/)
- ❌ `SPLIT_INVOICE_TEST_PROTOCOL.md`
- ❌ `SPLIT_INVOICE_TEST_BLOCKER.md`
- ❌ `INVOICE_TOTAL_BUG.md`
- ❌ `SPLIT_INVOICE_TEST_RESULTS.md`

#### Session Summaries (→ docs/archive/sessions-nov2025/)
- ❌ `SESSION_SUMMARY_MULTI_ROUTINE_TEST_DATA.md`
- ❌ `SESSION_PRICING_FIX_AND_SCHEMA_VALIDATION.md`

#### Resolved Investigations (→ docs/archive/investigations/)
- ❌ `PARENT_EMAIL_RISK_ASSESSMENT.md`
- ❌ `PARENT_EMAIL_INVESTIGATION.md`

#### Design Docs (→ docs/archive/design/)
- ❌ `MULTI_ROUTINE_TEST_DATA_DESIGN.md`
- ❌ `CLASSIFICATION_CHANGE_PROPOSAL.md`
- ❌ `AUTO_CLASSIFICATION_EXPLANATION.md`

#### Resolved Blockers (→ docs/archive/blockers/)
- ❌ `BLOCKER_SA_INVOICE_ACCESS.md`

---

## Files to KEEP in Root/CompPortal

### Root Directory - Keep These
- ✅ `ANTI_PATTERNS.md` (active protocol)
- ✅ `DEBUGGING.md` (active protocol)
- ✅ `DEVTEAM_PROTOCOL.md` (active protocol)
- ✅ `PROJECT_STATUS.md` (active tracker)
- ✅ `CURRENT_WORK.md` (active tracker)
- ✅ `CLAUDE.md` (system instructions)

### CompPortal Directory - Keep These
- ✅ `PROJECT.md` (project config)
- ✅ `PROJECT_STATUS.md` (active tracker)
- ✅ `CURRENT_WORK.md` (active tracker)
- ✅ `KNOWN_ISSUES.md` (active tracker)
- ✅ `ROUTINE_CREATION_LAUNCH.md` (active launch plan)
- ✅ `PROCESS_IMPROVEMENTS.md` (active improvement tracking)
- ✅ `BASELINE_METRICS_NOV4.md` (current baseline)
- ✅ `NEXT_SESSION_PRIORITIES.md` (active priorities)
- ✅ `GOTCHAS.md` (active reference)
- ✅ `DEBUGGING.md` (active protocol)
- ✅ `README.md` (project readme)
- ✅ `QUICKSTART.md` (getting started guide)

---

## Archive Structure

```
CompPortal/docs/archive/
├── test-reports-nov2025/      # All test reports
├── sessions-nov2025/          # Session summaries
├── blockers/                  # Resolved blockers
├── implementations/           # Implementation docs
├── test-protocols/            # Test suite definitions
├── onboarding/               # Setup guides
├── planning/                 # Pre-release planning
├── investigations/           # Investigation reports
└── design/                   # Design proposals
```

---

## Actions Required

1. Create missing archive subdirectories
2. Move files according to plan above
3. Update PROJECT_STATUS.md with current state (Nov 7, feedback system)
4. Update CURRENT_WORK.md with latest sprint summary
5. Delete corrupted filename: `DClaudeCodeCompPortalSESSION_LOG_2025-10-02.md`
6. Verify all blockers marked resolved are truly resolved

---

## Current State Summary (for Trackers)

**Latest Work (Nov 7, 2025):**
- ✅ Sortable columns on entries table (b53f109)
- ✅ User feedback system with SA admin panel (5b861d6)
- ✅ Feedback widget positioning fixed (d7d556e)
- ✅ Account recovery page with dark mode (e06b68a)
- ✅ Dancer invoice PDF generator (f286629)

**Production Status:**
- Both tenants operational (EMPWR + Glow)
- Routine creation launched Nov 8 (active)
- All P0 bugs resolved (BUG #4, BUG #5)
- Build passing (78/78 pages from last status)

**Current Phase:**
- Post-sprint pause
- System stable
- Ready for next feature work
