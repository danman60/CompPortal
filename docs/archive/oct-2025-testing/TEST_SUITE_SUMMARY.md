# E2E Test Suite - Quick Reference
**Created:** October 29, 2025
**Status:** Ready to Execute
**No Code Changes Required**

---

## What's Been Created

### 1. Test Specification (`E2E_TEST_SUITE.md`)
- **45 test cases** covering Phase 1 business logic
- Organized into 6 categories (CSV Import, Dancer Mgmt, Reservations, Entries, Summary/Invoice, Edge Cases)
- Includes expected results, verification SQL, and pass criteria
- References Phase 1 spec (lines 30-1040) throughout

### 2. Test Data (`test-data/import-tests/dancers/`)
- **10 CSV files** with various test scenarios:
  - ✅ `01-perfect-match.csv` - Standard format, all fields (5 dancers)
  - ✅ `02-column-variations.csv` - Alternate column names (5 dancers)
  - ✅ `03-minimal-required.csv` - Only first_name, last_name (5 dancers)
  - ✅ `04-mixed-dates.csv` - Various date formats (10 dancers)
  - ✅ `05-special-chars.csv` - UTF-8, accents, hyphens (5 dancers)
  - ✅ `06-duplicates.csv` - Duplicate detection test (5 dancers)
  - ✅ `07-invalid-data.csv` - Validation errors (5 dancers, all invalid)
  - ✅ `08-extra-columns.csv` - Extra columns to ignore (5 dancers)
  - ✅ `09-mixed-case.csv` - Case-insensitive headers (5 dancers)
  - ✅ `10-missing-required.csv` - Missing last_name column (5 dancers)

### 3. Execution Runbook (`TEST_EXECUTION_RUNBOOK.md`)
- Step-by-step Playwright MCP commands
- Database verification queries (Supabase MCP)
- Screenshot capture points
- Result recording templates
- Troubleshooting guide

---

## How to Execute Tests

### Quick Start (Run All Tests)

**Estimated Duration:** 60-90 minutes

1. **Setup:**
   ```
   - Open Playwright MCP browser
   - Navigate to https://empwr.compsync.net
   - Authenticate as djamusic@gmail.com / 123456
   - Capture baseline database state (SQL in runbook)
   ```

2. **Execute:**
   ```
   - Follow TEST_EXECUTION_RUNBOOK.md step-by-step
   - Use Playwright MCP for UI interactions
   - Use Supabase MCP for database verification
   - Screenshot evidence at each test completion
   ```

3. **Report:**
   ```
   - Compile results into TEST_REPORT_{DATE}.md
   - Calculate pass rates by category
   - Document all failures with evidence
   - Create prioritized bug list
   ```

### Quick Start (Run CSV Import Tests Only)

**Estimated Duration:** 20 minutes

1. Navigate to `/dashboard/dancers/import`
2. For each CSV file (01-10):
   - Upload file
   - Verify preview
   - Import
   - Screenshot result
   - Query database to verify actual count
   - Record PASS/FAIL in report

---

## Test Categories Overview

| Category | Tests | Priority | Estimated Time | Prerequisites |
|----------|-------|----------|----------------|---------------|
| **1. CSV Import** | 10 | P0 | 20 min | SD access |
| **2. Dancer Management** | 5 | P1 | 10 min | SD access |
| **3. Reservation Flow** | 8 | P0 | 15 min | SD + CD access |
| **4. Entry Creation** | 10 | P0 | 20 min | Approved reservation |
| **5. Summary & Invoice** | 7 | P1 | 15 min | CD access |
| **6. Edge Cases** | 5 | P2 | 10 min | SD + CD access |

**Total:** 45 tests, 90 minutes

---

## Known Issues to Document

### P0 Issues (Critical)
1. **Bug #2: CSV Import Race Condition**
   - Location: `DancerCSVImport.tsx:97-108`
   - Impact: 4/5 dancers imported, silent failure
   - Tests Affected: 1.1, 1.2, likely 1.4
   - Expected: All tests show partial import

2. **Bug #1: Date Timezone Offset**
   - Location: `dancer.ts:575`
   - Impact: All dates off by 1 day
   - Tests Affected: 1.1, 1.2, 1.4
   - Expected: CSV `2010-05-15` → DB `2010-05-14`

### P1 Issues (High)
3. **Bug #3: Vague Error Messages**
   - Location: `dancer.ts:583-588`
   - Impact: Errors don't show which field/constraint failed
   - Tests Affected: 1.6, 1.7
   - Expected: Generic "Unknown error" messages

---

## Test Execution Tips

### Efficiency
- ✅ Use Bash to create SQL query templates with placeholders
- ✅ Take screenshots only at completion points
- ✅ Copy/paste SQL queries from runbook, edit IDs as needed
- ✅ Document blockers immediately (don't skip tests)

### Accuracy
- ✅ ALWAYS verify via database, not just UI
- ✅ Compare expected vs. actual explicitly
- ✅ Note timestamp before each test for filtering queries
- ✅ Use LIMIT in queries to reduce noise

### Organization
- ✅ Create report file at start, fill as you go
- ✅ Track time per category
- ✅ Mark tests as PASS/FAIL/BLOCKED in real-time
- ✅ Save all screenshots with naming convention: `test_{N}_{STATUS}.png`

---

## Expected Pass Rates

### Before Bug Fixes
- **Category 1 (CSV Import):** 30-40% pass (6 known bugs expected)
- **Category 2 (Dancer Mgmt):** 80-90% pass (minor issues possible)
- **Category 3 (Reservations):** 60-70% pass (some blocked by CD access)
- **Category 4 (Entries):** 70-80% pass (depends on reservation setup)
- **Category 5 (Summary/Invoice):** 50-60% pass (mostly blocked by CD access)
- **Category 6 (Edge Cases):** 40-50% pass (complex scenarios)

**Overall Expected:** 50-60% pass rate

### After Bug Fixes
- **Category 1 (CSV Import):** 90-100% pass
- **Category 2-6:** 80-90% pass

---

## Report Template

```markdown
# E2E Test Execution Report
**Date:** {YYYY-MM-DD}
**Duration:** {MINUTES} min
**Tester:** Claude Code / Playwright MCP

## Summary
- Total Tests: 45
- Passed: XX (XX%)
- Failed: XX (XX%)
- Blocked: XX (XX%)

## Category Results
### Category 1: CSV Import (P0)
| Test | File | Expected | Actual | Status | Notes |
|------|------|----------|--------|--------|-------|
| 1.1 | 01-perfect-match.csv | 5 | 4 | ❌ FAIL | Bug #2 + #1 |
| 1.2 | 02-column-variations.csv | 5 | 4 | ❌ FAIL | Bug #2 + #1 |
| 1.3 | 03-minimal-required.csv | 5 | 5 | ✅ PASS | - |
| ... | ... | ... | ... | ... | ... |

**Pass Rate:** X/10 (XX%)

[Continue for each category...]

## Known Issues Confirmed
1. ✅ Bug #2 confirmed (Tests 1.1, 1.2, 1.4)
2. ✅ Bug #1 confirmed (Tests 1.1, 1.2, 1.4)
3. ✅ Bug #3 confirmed (Tests 1.6, 1.7)

## New Issues Discovered
[List any unexpected failures]

## Database Changes
- Dancers: +XX rows
- Reservations: +XX rows
- Entries: +XX rows

## Recommendations
1. Fix P0 bugs (Bug #2, #1)
2. Re-run tests after fixes
3. Complete blocked tests with CD access
```

---

## File Locations

```
D:\ClaudeCode\CompPortal\
├── E2E_TEST_SUITE.md              # Test specification (this is the source of truth)
├── TEST_EXECUTION_RUNBOOK.md      # Step-by-step execution guide
├── TEST_SUITE_SUMMARY.md          # This file (quick reference)
├── CSV_IMPORT_TEST_REPORT.md      # Previous test results (reference)
├── CSV_IMPORT_AUDIT_REPORT.md     # Code audit findings (reference)
└── test-data/
    └── import-tests/
        └── dancers/
            ├── 01-perfect-match.csv
            ├── 02-column-variations.csv
            ├── 03-minimal-required.csv
            ├── 04-mixed-dates.csv
            ├── 05-special-chars.csv
            ├── 06-duplicates.csv
            ├── 07-invalid-data.csv
            ├── 08-extra-columns.csv
            ├── 09-mixed-case.csv
            └── 10-missing-required.csv
```

---

## Next Steps

### Immediate (Now)
1. ✅ Test suite design complete
2. ✅ Test data files created
3. ✅ Execution runbook written
4. ⏭️ **Ready to execute tests**

### Execution Options

**Option A: Full Test Run (90 min)**
- Execute all 45 tests following runbook
- Generate comprehensive report
- Document all failures with evidence

**Option B: CSV Import Only (20 min)**
- Execute Category 1 tests (1.1-1.10)
- Confirm known bugs (Bug #1, #2, #3)
- Quick validation before bug fixes

**Option C: Smoke Test (30 min)**
- Execute 1-2 tests from each category
- Validate test infrastructure works
- Identify any setup issues

---

## Success Criteria

### Test Suite Quality
- ✅ All 45 test cases documented
- ✅ Test data files created (10 CSV files)
- ✅ Execution runbook complete
- ✅ Database verification queries provided
- ✅ Report template ready

### Execution Quality (When Run)
- 🔲 Evidence captured (screenshots + SQL results)
- 🔲 Pass/Fail recorded for each test
- 🔲 Known bugs documented with test numbers
- 🔲 New issues identified and prioritized
- 🔲 Report generated with recommendations

---

## Additional Resources

- **Phase 1 Specification:** `docs/specs/PHASE1_SPEC.md` (lines 30-1040)
- **Previous Test Report:** `CSV_IMPORT_TEST_REPORT.md` (2 of 10 tests executed)
- **Code Audit Report:** `CSV_IMPORT_AUDIT_REPORT.md` (3 bugs identified)
- **Business Logic Overview:** `docs/specs/MASTER_BUSINESS_LOGIC.md`

---

**STATUS: ✅ READY TO EXECUTE**

All test infrastructure is in place. No code changes required. Tests can be run continuously and reports generated at completion.
