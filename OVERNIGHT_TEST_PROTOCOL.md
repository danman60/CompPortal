# Overnight Autonomous Test-Fix-Verify Protocol

**Date Created:** November 14, 2025
**Project:** CompPortal Scheduling Suite
**Environment:** tester.compsync.net
**Mode:** Autonomous (user says "continue" to advance)

---

## 🔒 CRITICAL SAFETY RULES (NON-NEGOTIABLE)

**⚠️ PRODUCTION DATA PROTECTION:**

1. ✅ **ONLY work on `tester` branch** - NEVER touch `main`
2. ✅ **ONLY test on tester.compsync.net** - NEVER access production subdomains
3. ❌ **NEVER navigate to empwr.compsync.net** (production EMPWR data)
4. ❌ **NEVER navigate to glow.compsync.net** (production Glow data)
5. ✅ **ALL code changes ONLY committed to `tester` branch**
6. ✅ **ALL deployments ONLY to tester environment**

**Production tenants are OFF LIMITS:**
- EMPWR Dance Experience (empwr.compsync.net) - REAL CLIENT DATA
- Glow Dance Competition (glow.compsync.net) - REAL CLIENT DATA

**Testing tenant (SAFE):**
- Test Competition (tester.compsync.net) - TEST DATA ONLY

---

## Protocol Overview

**Objective:** Achieve 100% spec compliance for scheduling suite through automated test-fix-deploy-verify cycles.

**User Command:** Just say **"continue"** to advance to next step

**Stopping Condition:** All tests pass with 100% spec compliance verified

---

## Test-Fix-Deploy Loop

### CYCLE STRUCTURE

```
┌─────────────────────────────────────────┐
│  1. RUN TEST SUITE                      │
│     - Execute SCHEDULING_E2E_TEST_SUITE │
│     - Capture screenshots               │
│     - Document bugs found               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. ANALYZE RESULTS                      │
│     - Count passing vs failing tests    │
│     - Calculate spec compliance %       │
│     - Identify critical blockers        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. FIX BUGS (Priority Order)           │
│     - Fix P0 (blocking) bugs first      │
│     - Commit with proper format         │
│     - Build must pass                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. WAIT FOR DEPLOYMENT                 │
│     - Trust Vercel auto-deploy          │
│     - Wait 2 minutes for propagation    │
│     - Verify build hash changed         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. VERIFY FIXES                        │
│     - Re-run failed tests only          │
│     - Confirm bugs resolved             │
│     - Check for regressions             │
└──────────────┬──────────────────────────┘
               │
               ▼
        ALL TESTS PASS?
         YES ──► STOP (100% compliance)
         NO  ──► LOOP BACK TO STEP 1
```

---

## Execution Rules

### When User Says "Continue"

**I will:**
1. ✅ Execute next step in current cycle
2. ✅ Show progress update (e.g., "Cycle 3, Step 2: Analyzing results")
3. ✅ Take screenshots for evidence
4. ✅ Update OVERNIGHT_TEST_LOG.md with findings
5. ✅ Move to next step automatically

**I will NOT:**
- ❌ Ask for confirmation before fixing bugs
- ❌ Wait for user approval to commit
- ❌ Stop unless all tests pass or critical blocker found

### Stopping Conditions

**STOP and REPORT when:**
1. ✅ 100% spec compliance achieved (all tests pass)
2. ⚠️ Critical blocker found (data loss, build breaks)
3. 🔄 Infinite loop detected (same bug fails 3+ times)
4. ⏰ 50+ cycles completed (something's wrong)

### Evidence Requirements

**Every cycle must produce:**
- Screenshots: `test-cycle-{N}-step-{X}-{description}.png`
- Bug list: Updated in OVERNIGHT_TEST_LOG.md
- Commit: Proper 8-line format with spec references
- Verification: Before/after screenshots showing fix

---

## Test Suite Reference

**Primary Test Document:** `SCHEDULING_E2E_TEST_SUITE.md`

**Test Coverage:**
- 50+ test cases
- 12 test suites
- P0 Critical + P1 High Priority features

**Spec Reference:** `docs/SCHEDULING_SPEC_V4_UNIFIED.md`

---

## Progress Tracking

### Cycle Log Format

```markdown
## CYCLE N - [Timestamp]

**Step 1: Test Execution**
- Tests Run: X/50
- Tests Passed: X
- Tests Failed: X
- Spec Compliance: X%

**Bugs Found:**
- BUG-XXX: Description (Priority)

**Step 2: Analysis**
- Critical Blockers: X
- High Priority: X
- Medium Priority: X

**Step 3: Fixes Applied**
- Fixed: BUG-XXX (file:line changes)
- Commit: [hash]

**Step 4: Deployment**
- Build: [hash]
- Deploy Time: X minutes

**Step 5: Verification**
- Bugs Resolved: X
- Bugs Remaining: X
- New Compliance: X%

---
```

---

## File Organization

```
CompPortal-tester/
├── OVERNIGHT_TEST_PROTOCOL.md        # This file
├── OVERNIGHT_TEST_LOG.md             # Auto-generated cycle log
├── SCHEDULING_E2E_TEST_SUITE.md      # Test cases
├── .playwright-mcp/
│   ├── cycle-1-step-1-initial.png
│   ├── cycle-1-step-5-verified.png
│   ├── cycle-2-step-1-initial.png
│   └── ...
└── docs/
    ├── SCHEDULING_SPEC_V4_UNIFIED.md # Spec reference
    └── SCHEDULING_FINAL_BUGS.md      # Final bug report
```

---

## Example Session

**User:** "continue"
**Claude:**
```
🔄 CYCLE 1 - STEP 1: Running Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing: Page Load & Navigation (5 tests)
✅ 1.1: Login successful
✅ 1.2: Page navigates to /dashboard/scheduling
❌ 1.3: Page loads (ERROR: React crash)
...

Tests: 3/5 passed
Spec Compliance: 60%
Critical Bugs: 1 (React error #310)

Ready for Step 2. Say "continue" to analyze.
```

**User:** "continue"
**Claude:**
```
🔍 CYCLE 1 - STEP 2: Analyzing Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG-001: React error #310 - Scheduling page crash
Priority: P0 (BLOCKING)
Impact: Cannot test any scheduling features
Cause: Missing competition selection in SchedulingManager

Fix Strategy: Add default competition selection
Estimated: 15 minutes

Ready for Step 3. Say "continue" to fix bugs.
```

---

## Success Criteria

**Protocol COMPLETE when:**
- ✅ All 50+ tests pass
- ✅ 100% spec compliance verified
- ✅ No console errors
- ✅ Screenshots confirm all features working
- ✅ Final test log shows clean run

**Deliverables:**
- `OVERNIGHT_TEST_LOG.md` - Complete cycle history
- `SCHEDULING_FINAL_BUGS.md` - Any known limitations
- `.playwright-mcp/final-*.png` - Evidence screenshots
- Updated codebase with all fixes committed

---

## Emergency Protocols

**If infinite loop detected:**
1. STOP after 3 failed attempts on same bug
2. Create `BLOCKER_overnight_[bug].md`
3. Report to user with detailed analysis

**If build breaks:**
1. STOP immediately
2. Rollback last commit
3. Report error to user

**If data loss detected:**
1. STOP ALL WORK
2. Create `BLOCKER_DATA_LOSS.md`
3. DO NOT CONTINUE until user approves

---

**Ready to start?** User says "continue" to begin Cycle 1, Step 1.
