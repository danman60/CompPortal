# Unattended Testing Safeguards

## Critical Safeguards for Guaranteed Progress

### 1. Session State Recovery Protocol

**Problem:** After auto-compact, I might forget where I was

**Solution:** Mandatory state file reading at session start

**Implementation:**
```markdown
EVERY session start (including after auto-compact):
1. Read SESSION_STATE.md FIRST
2. If Current Phase != "READY_TO_START":
   - Load TEST_RESULTS.md
   - Load BUG_TRACKER.md
   - Resume from last checkpoint
3. Output: "Resuming from [Phase] - [Next Action]"
```

**File: SESSION_STATE.md must always contain:**
- Current Phase (TESTING/BUG_ANALYSIS/FIXING/RETESTING/COMPLETE)
- Last completed action (e.g., "Test A5 - PASS")
- Next action (e.g., "Execute Test A6")
- Timestamp
- Tests passed: X/71
- Bugs found: N
- Bugs fixed: M

---

### 2. Atomic Action Logging

**Problem:** If I crash mid-action, progress is lost

**Solution:** Log BEFORE and AFTER each action

**Implementation:**
```markdown
Before action:
- Update SESSION_STATE.md: "IN PROGRESS: Test A5"

After action:
- Update SESSION_STATE.md: "COMPLETED: Test A5 - PASS"
- Update TEST_RESULTS.md: "- [x] A5: Create Dancer - Duplicate → PASS"
```

**This ensures:**
- If crash during A5: Resume from A5 (re-run)
- If crash after A5: Resume from A6 (skip A5)

---

### 3. Token Budget Monitoring

**Problem:** Run out of tokens mid-test, lose progress

**Solution:** Check budget before expensive operations

**Implementation:**
```markdown
Before each section:
- Check remaining tokens
- If < 20k tokens: Switch to "WRAP_UP" mode
  - Save current state
  - Generate summary report
  - List remaining tests
  - STOP gracefully

Before each fix:
- Check remaining tokens
- If < 30k tokens: Prioritize P0 bugs only
```

---

### 4. Checkpoint Commits (Auto-Save)

**Problem:** File system persistence isn't enough (could lose work if power loss)

**Solution:** Git commit after every section

**Implementation:**
```bash
# After Section A completes (6 tests)
git add SESSION_STATE.md TEST_RESULTS.md evidence/section_a/
git commit -m "checkpoint: Section A complete (6/6 pass)"
git push

# After Bug Fix #3
git add SESSION_STATE.md BUG_TRACKER.md FIX_LOG.md src/
git commit -m "checkpoint: Bug #3 fixed - duplicate dancer validation"
git push
```

**Frequency:**
- After each section completion (8 commits max)
- After each bug fix (N commits for N bugs)
- After each retest phase

---

### 5. Failure Recovery Strategy

**Problem:** Test fails, unclear how to proceed

**Solution:** Pre-defined failure handling logic

**Decision Tree:**
```
Test fails?
├─ Is it P0 (blocker)?
│  ├─ YES: Create BLOCKER.md → STOP → Wait for user
│  └─ NO: Continue to failure handling
│
├─ Log bug in BUG_TRACKER.md
├─ Capture screenshot evidence
├─ Mark test as FAIL in TEST_RESULTS.md
└─ Continue to next test (don't stop testing)

All tests complete?
├─ Any P0 blockers? → Generate report → STOP
├─ Any P1/P2 bugs? → Switch to BUG_ANALYSIS phase
└─ All pass? → Switch to COMPLETE phase
```

---

### 6. Evidence Management

**Problem:** 71 screenshots = large folder, slow to commit

**Solution:** Strategic evidence capture

**Strategy:**
```markdown
Evidence tiers:
1. PASS tests: No screenshot (just log)
2. FAIL tests: Full screenshot + console logs
3. Critical tests: Screenshot even if pass (e.g., invoice amount)

Evidence folder structure:
evidence/
├─ section_a/
│  └─ test_a3_duplicate_fail.png
├─ section_f/
│  └─ test_f2_summary_modal_pass.png (critical - verify $3,600)
└─ section_h/
   └─ test_h3_payment_email_pass.png (critical - verify not $0.00)
```

**Estimated size:**
- ~10-15 screenshots (only failures + critical validations)
- ~2-3MB total (manageable)

---

### 7. Build Verification Before Fixes

**Problem:** Apply fix, doesn't build, wastes time

**Solution:** Mandatory build check after each fix

**Implementation:**
```bash
# After editing src/components/DancerForm.tsx
npm run build

# If build fails:
- Revert changes
- Log "Build failed, reverting fix for Bug #5"
- Mark bug as "FIX_FAILED" in BUG_TRACKER.md
- Continue to next bug

# If build passes:
- Commit fix
- Mark bug as "FIXED" in BUG_TRACKER.md
- Add to retest queue
```

---

### 8. Parallel Test Execution Safety

**Problem:** Running tests in parallel can cause race conditions

**Solution:** Sequential execution with clear dependencies

**Rules:**
- Section A-E: Sequential (depend on previous sections)
- Section F-H: Sequential (depend on summary → invoice → payment)
- Within a section: Sequential (one test at a time)
- **NO parallel test execution**

---

### 9. Time-Based Safety Stops

**Problem:** Infinite loop if test keeps failing

**Solution:** Max retry limits

**Implementation:**
```markdown
Per test:
- Max retries: 2 (for flaky UI tests)
- If fails 3 times: Mark as FAIL, move on

Per section:
- Max time: 15 minutes
- If exceeds: Log timeout, move to next section

Per session:
- Max time: 3 hours
- If exceeds: Generate partial report, STOP
```

---

### 10. Email Notification System (Optional)

**Problem:** Tests run overnight, no way to know if completed

**Solution:** Send completion email

**Implementation (if time permits):**
```typescript
// At end of COMPLETE phase
await sendEmail({
  to: "user@example.com",
  subject: "Phase 1 Tests Complete: 71/71 PASS",
  body: `
Test execution complete.

Results:
- Tests passed: 71/71 (100%)
- Bugs found: 8
- Bugs fixed: 8
- Time taken: 1h 23m

Full report: TEST_EXECUTION_REPORT.md
Evidence folder: evidence/
  `
});
```

---

## Pre-Flight Checklist (Run Before Starting)

**Before saying "continue" to start testing:**

### ✅ Environment Ready
- [ ] Reservation cleaned (Phase 0 run manually)
- [ ] Verify reservation status = 'approved'
- [ ] Verify entry_count = 0
- [ ] Verify ledger_count = 0
- [ ] CSV file exists at path
- [ ] Evidence folder created: `mkdir -p evidence/section_{a-h}`

### ✅ Tools Verified
- [ ] Playwright MCP working (`mcp__playwright__browser_snapshot`)
- [ ] Supabase MCP working (`mcp__supabase__execute_sql`)
- [ ] Can read/write files
- [ ] Can commit to git

### ✅ State Files Initialized
- [ ] SESSION_STATE.md created with "READY_TO_START"
- [ ] TEST_RESULTS.md created (empty template)
- [ ] BUG_TRACKER.md created (empty template)
- [ ] FIX_LOG.md created (empty template)

### ✅ Auto-Continue Script Ready
- [ ] Script will send "continue" every X seconds
- [ ] Script has stop condition (e.g., see "COMPLETE" in output)
- [ ] Script logs all my responses to file

---

## Stop Conditions (When to STOP Testing)

**Graceful stops:**
1. ✅ All 71 tests pass (COMPLETE)
2. ✅ Token budget < 10k remaining
3. ✅ Time limit reached (3 hours)
4. ✅ Critical P0 blocker with no clear fix

**Emergency stops:**
1. 🚨 MCP tools fail 3+ times in a row
2. 🚨 Build fails 3+ times in a row
3. 🚨 Database errors (can't connect)
4. 🚨 Test environment down (empwr.compsync.net unreachable)

**On stop:**
- Update SESSION_STATE.md with stop reason
- Generate PARTIAL_REPORT.md with progress
- Commit all evidence
- Output clear message: "STOPPED: [reason]"

---

## Session State Transitions

```
READY_TO_START
  ↓ (user says "continue")
INIT_PHASE_0 (cleanup)
  ↓
TESTING_SECTION_A
  ↓ (6 tests complete)
CHECKPOINT_COMMIT_A
  ↓
TESTING_SECTION_B
  ↓ (12 tests complete)
CHECKPOINT_COMMIT_B
  ↓
... (repeat for C, D, E, F, G, H) ...
  ↓
BUG_ANALYSIS (if bugs found)
  ↓
FIXING_BUG_1
  ↓
BUILD_VERIFY
  ↓
CHECKPOINT_COMMIT_FIX_1
  ↓
FIXING_BUG_2
  ↓
... (repeat for all bugs) ...
  ↓
RETESTING_PHASE
  ↓
(If bugs remain) → BUG_ANALYSIS
(If all pass) → COMPLETE
  ↓
GENERATE_FINAL_REPORT
  ↓
DONE
```

---

## Recovery from Failure Scenarios

### Scenario 1: Auto-Compact During Testing
**State:** SESSION_STATE.md shows "TESTING_SECTION_C", last completed "Test C4"

**Recovery:**
1. Read SESSION_STATE.md
2. Read TEST_RESULTS.md
3. See tests C1-C4 marked complete
4. Resume from C5
5. Output: "Resuming from Section C, Test C5"

### Scenario 2: Build Fails During Fix
**State:** SESSION_STATE.md shows "FIXING_BUG_3"

**Recovery:**
1. Check build logs
2. Revert changes to src/
3. Mark Bug #3 as "FIX_FAILED" in BUG_TRACKER.md
4. Move to Bug #4
5. Output: "Build failed for Bug #3, reverting and continuing to Bug #4"

### Scenario 3: Token Budget Low
**State:** 15k tokens remaining, in TESTING_SECTION_G

**Recovery:**
1. Complete Section G (10 tests, ~5k tokens)
2. Skip Section H
3. Generate summary report with partial results
4. Output: "Low token budget - completed 61/71 tests, stopping gracefully"

### Scenario 4: MCP Tool Failure
**State:** Playwright fails 3 times in a row

**Recovery:**
1. Log tool failure in SESSION_STATE.md
2. Generate BLOCKER_MCP_FAILURE.md
3. STOP testing
4. Output: "MCP tool failure - cannot continue testing. Manual intervention required."

---

## Final Verification Before Launch

**Run this SQL to verify clean state:**
```sql
SELECT
  r.id,
  r.status,
  r.spaces_confirmed,
  r.is_closed,
  COUNT(e.id) as entry_count,
  COUNT(s.id) as summary_count,
  COUNT(i.id) as invoice_count,
  COUNT(cl.id) as ledger_count
FROM reservations r
LEFT JOIN competition_entries e ON e.reservation_id = r.id AND e.deleted_at IS NULL
LEFT JOIN summaries s ON s.reservation_id = r.id
LEFT JOIN invoices i ON i.reservation_id = r.id
LEFT JOIN capacity_ledger cl ON cl.reservation_id = r.id
WHERE r.id = 'a5942efb-6f8b-42db-8415-79486e658597'
GROUP BY r.id, r.status, r.spaces_confirmed, r.is_closed;
```

**Expected:**
```json
{
  "status": "approved",
  "is_closed": false,
  "entry_count": 0,
  "summary_count": 0,
  "invoice_count": 0,
  "ledger_count": 0
}
```

**If any count > 0:** Run Phase 0 cleanup again

---

## Success Metrics

**Minimum success criteria:**
- ✅ 71/71 tests executed (even if some fail)
- ✅ All failures documented in BUG_TRACKER.md
- ✅ All evidence captured
- ✅ State persisted across auto-compact
- ✅ Final report generated

**Ideal success criteria:**
- ✅ 71/71 tests PASS
- ✅ All bugs found AND fixed
- ✅ All fixes committed
- ✅ All retests pass
- ✅ Production ready for Phase 1 launch

---

**Ready to launch? Just say "continue" and I'll begin!**
