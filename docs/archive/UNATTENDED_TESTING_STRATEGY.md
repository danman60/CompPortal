# Unattended Testing Strategy for Phase 1

## Problem Statement

**Challenge:** Need to run 71-test comprehensive suite overnight without manual intervention
**Risks:**
- Agent hits blocker and stops (wasting time)
- Token budget runs out mid-test
- No incremental progress saved if failure occurs
- Can't resume from checkpoint

---

## Recommended Strategy: Chunked Testing with Checkpointing

### Approach 1: Sequential Section Testing (RECOMMENDED)

**Concept:** Break 71 tests into 8 sections, run each as separate agent task with checkpointing

**Sections:**
- Section A: Dancer Management (6 tests) - ~5 min
- Section B: Manual Routine Creation (12 tests) - ~15 min
- Section C: CSV Import Workflow (15 tests) - ~20 min
- Section D: Routine Validation (10 tests) - ~10 min
- Section E: Exception Requests (5 tests) - ~5 min
- Section F: Summary Submission (8 tests) - ~10 min
- Section G: Invoice Creation (10 tests) - ~15 min
- Section H: Payment Confirmation (5 tests) - ~5 min

**Total estimated time:** ~85 minutes

**How it works:**

```markdown
# Master Test Orchestrator

1. Launch Section A agent
   - Execute 6 tests
   - Save results to SECTION_A_RESULTS.md
   - On failure: Create BLOCKER_SECTION_A.md and STOP
   - On success: Continue to Section B

2. Launch Section B agent
   - Load SECTION_A_RESULTS.md for context
   - Execute 12 tests
   - Save results to SECTION_B_RESULTS.md
   - On failure: STOP with blocker doc
   - On success: Continue to Section C

3. Repeat for all 8 sections...

4. Final report: Aggregate all section results
   - Pass rate: X/71 tests
   - Failed sections: [list]
   - Total time: Y minutes
```

**Benefits:**
- ✅ Can resume from last successful section if interrupted
- ✅ Incremental progress saved after each section
- ✅ Clearer failure isolation (know exactly which section failed)
- ✅ Can run sections in parallel if independent

**Implementation:**

```typescript
// Example agent spawn
await Task({
  subagent_type: "general-purpose",
  description: "Execute Section A tests",
  prompt: `
Execute Section A (Dancer Management) tests from PHASE1_COMPREHENSIVE_TEST_SUITE.md.

Requirements:
1. Run Phase 0 cleanup first
2. Execute tests A1-A6 sequentially
3. Capture screenshots for each test
4. Stop immediately on first failure
5. Create SECTION_A_RESULTS.md with:
   - Pass/Fail for each test
   - Screenshots saved in evidence/section_a/
   - Any errors encountered
6. If all pass: Return success + evidence folder path
7. If any fail: Create BLOCKER_SECTION_A.md and return failure

Test environment: empwr.compsync.net
Login: danieljohnabrahamson@gmail.com / 123456
`
});
```

---

### Approach 2: Parallel Section Testing (FASTER)

**Concept:** Run independent sections in parallel, then sequential sections

**Parallel Groups:**

**Group 1 (Independent - Can run in parallel):**
- Section A: Dancer Management
- Section B: Manual Routine Creation (first 5 routines)

**Group 2 (Sequential - Depends on Group 1):**
- Section C: CSV Import (needs dancers from A)
- Section D: Validation (needs routines from B+C)

**Group 3 (Sequential - Depends on Group 2):**
- Section E: Exception Requests (needs routines)
- Section F: Summary Submission (needs all routines)

**Group 4 (Sequential - Depends on Group 3):**
- Section G: Invoice Creation (needs summary)
- Section H: Payment (needs invoice)

**Estimated time:** ~45 minutes (parallel execution cuts time in half)

---

### Approach 3: Atomic Test Execution (MOST ROBUST)

**Concept:** Each test is its own agent task, with state checkpointing

**How it works:**

```typescript
// Main orchestrator loop
for (let i = 1; i <= 71; i++) {
  const result = await executeTest(i);

  await saveCheckpoint({
    test_number: i,
    status: result.status,
    evidence: result.screenshot,
    timestamp: Date.now()
  });

  if (result.status === 'FAIL') {
    await createBlocker(i, result.error);
    break; // Stop on first failure
  }
}
```

**Benefits:**
- ✅ Can resume from exact test that failed
- ✅ Maximum granularity for debugging
- ✅ Clear audit trail (71 checkpoints)

**Drawbacks:**
- ❌ Slower (71 agent spawns)
- ❌ Higher token usage (context switching)

---

## Token Budget Management

**Problem:** 200k token budget might run out mid-test

**Solutions:**

### 1. Use Haiku for Simple Tests
```typescript
// For validation tests (no complex logic)
await Task({
  model: "haiku", // Cheaper, faster
  subagent_type: "general-purpose",
  description: "Verify dancer name validation",
  prompt: "..."
});
```

### 2. Batch Evidence Collection
Instead of screenshot per test, batch screenshots:
```typescript
// Take 1 screenshot showing 5 test results
await playwright.screenshot({
  filename: "evidence/section_a_tests_1_5.png"
});
```

### 3. Lazy Evidence (Only on Failure)
Only capture detailed evidence when test fails:
```typescript
if (test.status === 'FAIL') {
  await captureFullEvidence(); // Screenshots, logs, DB state
} else {
  await captureMinimalEvidence(); // Just pass/fail status
}
```

---

## Failure Handling Strategies

### Strategy 1: Continue on Non-Critical Failures

**Concept:** Some tests can fail without blocking others

```markdown
Test Priority Levels:
- P0 (Blocker): Stop all testing if fails
  - Phase 0 cleanup
  - Reservation creation
  - Database connectivity

- P1 (Critical): Stop section but allow other sections
  - Dancer creation
  - Manual routine creation
  - Summary submission

- P2 (Important): Log failure, continue section
  - Validation messages
  - UI text correctness
  - Email formatting
```

**Implementation:**
```typescript
if (test.priority === 'P0' && test.status === 'FAIL') {
  throw new Error('P0 test failed - stopping all tests');
}

if (test.priority === 'P1' && test.status === 'FAIL') {
  await logFailure(test);
  return 'SKIP_SECTION';
}

if (test.priority === 'P2' && test.status === 'FAIL') {
  await logFailure(test);
  continue; // Keep testing
}
```

### Strategy 2: Automatic Retry on Flaky Tests

**Concept:** Some UI tests are flaky (timing, rendering), retry 1-2 times

```typescript
async function executeTestWithRetry(test, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await executeTest(test);

    if (result.status === 'PASS') return result;

    if (i < maxRetries - 1) {
      await sleep(5000); // Wait 5s before retry
      console.log(`Retry ${i + 1}/${maxRetries} for test ${test.id}`);
    }
  }

  return { status: 'FAIL', error: 'Failed after retries' };
}
```

---

## Overnight Execution Plan

**Recommended overnight workflow:**

### Option A: Conservative (Most Reliable)
```bash
# 10:00 PM - Start Section A
# 10:05 PM - Section A complete → Start Section B
# 10:20 PM - Section B complete → Start Section C
# 10:40 PM - Section C complete → Start Section D
# 10:50 PM - Section D complete → Start Section E
# 10:55 PM - Section E complete → Start Section F
# 11:05 PM - Section F complete → Start Section G
# 11:20 PM - Section G complete → Start Section H
# 11:25 PM - Section H complete → Generate final report
# 11:30 PM - DONE (1.5 hours total)
```

**Implementation:**
```typescript
// Main orchestrator (single agent)
const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

for (const section of sections) {
  const result = await Task({
    subagent_type: "general-purpose",
    model: "sonnet", // Use Sonnet for complex UI testing
    description: `Execute Section ${section}`,
    prompt: loadSectionPrompt(section)
  });

  await saveResults(section, result);

  if (result.status === 'FAIL') {
    await createBlocker(section, result);
    break;
  }
}

await generateFinalReport();
```

### Option B: Aggressive (Faster, Riskier)
```bash
# 10:00 PM - Start ALL sections in parallel
# 10:45 PM - All complete (or failures documented)
# 10:50 PM - Generate final report
```

**Implementation:**
```typescript
// Parallel execution
const results = await Promise.allSettled([
  executeSection('A'),
  executeSection('B'),
  executeSection('C'),
  executeSection('D'),
  executeSection('E'),
  executeSection('F'),
  executeSection('G'),
  executeSection('H')
]);

await generateFinalReport(results);
```

---

## Recommended Setup for Tonight

**I recommend Option A (Sequential Sections) because:**

1. ✅ **Reliable:** Stop on first failure prevents cascading issues
2. ✅ **Debuggable:** Know exactly which section failed
3. ✅ **Resumable:** Can restart from failed section tomorrow
4. ✅ **Token efficient:** Sections reuse context from previous sections
5. ✅ **Fast enough:** 1.5 hours is acceptable for overnight run

**Steps to execute tonight:**

1. **Prepare test environment:**
   - Run Phase 0 cleanup manually to verify it works
   - Verify test reservation exists and is clean
   - Verify CSV file is accessible

2. **Launch main orchestrator agent:**
   ```typescript
   await Task({
     subagent_type: "general-purpose",
     model: "sonnet",
     description: "Execute Phase 1 Comprehensive Test Suite",
     prompt: `
Execute all 8 sections of PHASE1_COMPREHENSIVE_TEST_SUITE.md sequentially.

For each section:
1. Execute tests in order
2. Save results to SECTION_X_RESULTS.md
3. Stop on first failure and create BLOCKER_SECTION_X.md
4. Continue to next section only if all tests pass

Final deliverable:
- PHASE1_TEST_EXECUTION_REPORT.md with:
  - Pass/fail summary (X/71 tests passed)
  - Time taken per section
  - Evidence folder with screenshots
  - List of any blockers found

Environment: empwr.compsync.net
Test reservation: a5942efb-6f8b-42db-8415-79486e658597
`
   });
   ```

3. **Monitor in morning:**
   - Check PHASE1_TEST_EXECUTION_REPORT.md
   - Review any BLOCKER_*.md files
   - Look at evidence screenshots

---

## Alternative: GitHub Actions / CI Pipeline

**For truly unattended testing:**

```yaml
# .github/workflows/phase1-test.yml
name: Phase 1 Comprehensive Test

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM daily
  workflow_dispatch:      # Manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Playwright
        run: npx playwright install chromium

      - name: Run Phase 1 Tests
        run: |
          npx playwright test phase1-comprehensive.spec.ts
        env:
          TEST_URL: https://empwr.compsync.net
          SD_EMAIL: ${{ secrets.SD_EMAIL }}
          SD_PASSWORD: ${{ secrets.SD_PASSWORD }}
          CD_EMAIL: ${{ secrets.CD_EMAIL }}
          CD_PASSWORD: ${{ secrets.CD_PASSWORD }}

      - name: Upload Evidence
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-evidence
          path: evidence/

      - name: Create Test Report
        if: always()
        run: |
          echo "# Phase 1 Test Results" > $GITHUB_STEP_SUMMARY
          cat test-results/report.md >> $GITHUB_STEP_SUMMARY
```

**Benefits:**
- ✅ Fully automated (no Claude needed)
- ✅ Runs on schedule
- ✅ Email notifications on failure
- ✅ Artifact storage (screenshots, logs)

**Drawbacks:**
- ❌ Requires writing Playwright test scripts
- ❌ More setup time (not ready for tonight)

---

## Summary & Recommendation

**For tonight (immediate need):**
Use **Sequential Section Testing** (Approach 1) with main orchestrator agent

**For long-term (next sprint):**
Build **GitHub Actions CI pipeline** for nightly regression testing

**Estimated completion time tonight:** 1.5-2 hours
**Estimated token usage:** ~50k tokens (well within 200k budget)
**Failure handling:** Stop on first blocker, resume tomorrow if needed

**Would you like me to:**
1. ✅ Launch the sequential section testing now?
2. ✅ Create the orchestrator agent prompt?
3. ✅ Set up the evidence folder structure?
4. ⏭️ Build GitHub Actions pipeline (tomorrow)?
