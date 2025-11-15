# Scheduling Suite E2E Test Index

**Date:** November 15, 2025
**Version:** 1.1 (Chunked for Context Efficiency)
**Spec Reference:** SCHEDULING_SPEC_V4_UNIFIED.md
**Environment:** tester.compsync.net
**Deadline:** December 26, 2025

---

## 📖 Document Purpose

This is the master index for the Scheduling Suite E2E Test Plan. The original monolithic test suite (1610 lines) has been divided into 4 logical phases for efficient context management and execution.

**Benefits of Phased Approach:**
- ✅ Reduced context consumption per testing session
- ✅ Logical grouping by priority (Happy Path → P0 → P1 → Edge Cases)
- ✅ Clear stopping points for iterative testing
- ✅ Easier to track progress and failures
- ✅ Parallel execution possible (different phases on different days)

---

## 🗂️ Test Suite Structure

### Phase 1: Happy Path Workflow
**File:** [SCHEDULING_E2E_PHASE1_HAPPY_PATH.md](./SCHEDULING_E2E_PHASE1_HAPPY_PATH.md)

**Content:**
- Complete end-to-end CD scheduling journey (HP-001)
- 16 detailed steps from login to publish
- 23 screenshots expected

**Coverage:**
- 3-panel layout verification
- Filter/search functionality
- Drag-drop scheduling
- Conflict detection
- Trophy helper
- Award/break blocks
- View modes (CD/Judge/Studio/Public)
- Studio requests workflow
- Finalize → Publish workflow

**Execution Time:** 1.5-2 hours

**Status:** REQUIRED for launch

---

### Phase 2: P0 Critical Features
**File:** [SCHEDULING_E2E_PHASE2_P0_CRITICAL.md](./SCHEDULING_E2E_PHASE2_P0_CRITICAL.md)

**Content:**
- 6 P0 (Priority Zero) critical tests
- Absolutely essential features for viability

**Tests:**
- P0-001: 3-Panel Layout
- P0-002: Manual Drag-Drop Scheduling
- P0-003: Conflict Detection
- P0-004: Studio Code Masking
- P0-005: State Machine (Draft/Finalized/Published)
- P0-006: Schedule Blocks (Award & Break)

**Execution Time:** 45-60 minutes

**Status:** REQUIRED for launch (blockers if fail)

---

### Phase 3: P1 High-Priority Features
**File:** [SCHEDULING_E2E_PHASE3_P1_HIGH_PRIORITY.md](./SCHEDULING_E2E_PHASE3_P1_HIGH_PRIORITY.md)

**Content:**
- 6 P1 (Priority One) high-priority tests
- Important enhancements, not critical for launch

**Tests:**
- P1-001: Trophy Helper Report
- P1-002: Studio Feedback System
- P1-003: Age Change Detection
- P1-004: Routine Notes System
- P1-005: View Mode Filtering
- P1-006: Hotel Attrition Warning

**Execution Time:** 45-60 minutes

**Status:** Best effort (not blocking for launch)

---

### Phase 4: Edge Cases & Multi-Tenant
**File:** [SCHEDULING_E2E_PHASE4_EDGE_CASES.md](./SCHEDULING_E2E_PHASE4_EDGE_CASES.md)

**Content:**
- 6 Edge Case tests
- 2 Multi-Tenant isolation tests

**Tests:**
- EC-001: Panel Collapse/Expand
- EC-002: Filter Combinations
- EC-003: Day Selector Edge Cases
- EC-004: Conflict Severity Levels
- EC-005: Time Rounding
- EC-006: Auto-Renumber in Draft Mode
- MT-001: Cross-Tenant Data Leak Prevention
- MT-002: Studio Code Uniqueness Per Tenant

**Execution Time:** 1-1.5 hours

**Status:** Multi-tenant tests REQUIRED, edge cases best effort

---

## 📊 Execution Summary

**Total Tests:** 25+
- Happy Path: 1 test (16 steps)
- P0 Critical: 6 tests
- P1 High-Priority: 6 tests
- Edge Cases: 6 tests
- Multi-Tenant: 2 tests

**Total Estimated Time:** 4-6 hours (full suite)

**Launch-Blocking Tests:**
- ✅ Phase 1: Happy Path (MUST PASS)
- ✅ Phase 2: All P0 tests (MUST PASS)
- ✅ Phase 4: Multi-Tenant tests (MUST PASS)

**Non-Blocking Tests:**
- ⚠️ Phase 3: P1 tests (best effort)
- ⚠️ Phase 4: Edge case tests (best effort)

---

## 🚀 Recommended Execution Order

### Sequential Approach (Single Session)
1. Execute Phase 1 (Happy Path)
   - If fails: STOP, fix blocking issue, restart
2. Execute Phase 2 (P0 Critical)
   - If fails: STOP, fix blocking issue, restart
3. Execute Phase 3 (P1 High-Priority)
   - If fails: Document, continue (not blocking)
4. Execute Phase 4 (Edge Cases & Multi-Tenant)
   - If MT tests fail: STOP, fix tenant isolation issue
   - If EC tests fail: Document, continue (not blocking)

### Parallel Approach (Multiple Sessions)
**Day 1:**
- Phase 1: Happy Path

**Day 2:**
- Phase 2: P0 Critical Features
- Phase 4: Multi-Tenant tests (critical portion)

**Day 3:**
- Phase 3: P1 High-Priority Features
- Phase 4: Edge Cases (non-critical portion)

---

## 📁 Test Evidence Organization

**Screenshot Naming Convention:**
- Phase 1: `hp-001-##-description.png`
- Phase 2: `p0-00#-description.png`
- Phase 3: `p1-00#-description.png`
- Phase 4: `ec-00#-description.png`, `mt-00#-description.png`

**Storage Location:**
- Local: `.playwright-mcp/evidence/`
- Archive: `.playwright-mcp/.evidence/` (after session complete)

---

## 🔍 Test Environment Setup

**Glow Competition (Tester):**
- URL: `https://tester.compsync.net`
- Competition: "Test Competition Spring 2026"
- Competition ID: `1b786221-8f8e-413f-b532-06fa20a2ff63`
- Dates: April 9-12, 2026
- Routines: 60+ submitted
- Studios: 10+ approved

**EMPWR Competition (Production - Multi-Tenant Tests Only):**
- URL: `https://empwr.compsync.net`
- Used for: MT-001, MT-002 only

**Login Credentials:**
- CD (Glow): `registration@glowdancecomp.com` / `1CompSyncLogin!`
- CD (EMPWR): `empwrdance@gmail.com` / `1CompSyncLogin!`
- SD (Test Studio): `djamusic@gmail.com` / `123456`

---

## ✅ Success Criteria (Overall)

**Minimum for Launch:**
- ✅ Phase 1: Happy Path completes all 16 steps
- ✅ Phase 2: All 6 P0 tests pass
- ✅ Phase 4: Both MT tests pass (no cross-tenant leaks)
- ✅ No console errors during critical tests
- ✅ All required screenshots captured

**Ideal (Full Pass):**
- ✅ All 4 phases complete without failures
- ✅ All 25+ tests pass
- ✅ Evidence documented for every test
- ✅ Zero critical bugs found

---

## 🐛 Failure Handling

### If Happy Path (Phase 1) Fails
1. STOP all testing immediately
2. Document failure point (which step)
3. Capture error screenshot + browser console
4. Create `BLOCKER_SCHEDULING_[date].md`
5. Fix blocking issue
6. Restart from Phase 1

### If P0 Test (Phase 2) Fails
1. STOP current phase
2. Document failure (which P0 test)
3. Capture error evidence
4. Create `BLOCKER_SCHEDULING_P0_[date].md`
5. Fix blocking issue
6. Re-run Phase 2

### If P1 Test (Phase 3) Fails
1. Document failure (which P1 test)
2. Capture error evidence
3. Create issue in tracking system
4. **Continue to next test** (not blocking)
5. Address in post-launch sprint

### If Multi-Tenant Test (Phase 4) Fails
1. STOP all testing immediately
2. Document failure (MT-001 or MT-002)
3. Capture evidence from BOTH tenants
4. Create `BLOCKER_TENANT_ISOLATION_[date].md`
5. Fix critical security issue
6. Re-run Phase 4 MT tests

### If Edge Case Test (Phase 4) Fails
1. Document failure (which EC test)
2. Capture error evidence
3. Create issue in tracking system
4. **Continue to next test** (not blocking)
5. Address in post-launch sprint

---

## 📄 Related Documents

**Specification:**
- [SCHEDULING_SPEC_V4_UNIFIED.md](../docs/SCHEDULING_SPEC_V4_UNIFIED.md) - Full spec

**Architecture:**
- [SCHEDULING_ARCHITECTURE.md](../docs/SCHEDULING_ARCHITECTURE.md) - System design

**Original Test Suite (Archived):**
- `docs/archive/SCHEDULING_E2E_TEST_SUITE_MONOLITHIC.md` (1610 lines, for reference only)

---

## 📝 Changelog

**v1.1 - November 15, 2025**
- ✅ Divided monolithic test suite (1610 lines) into 4 phases
- ✅ Created Phase 1: Happy Path (775 lines)
- ✅ Created Phase 2: P0 Critical (260 lines)
- ✅ Created Phase 3: P1 High-Priority (250 lines)
- ✅ Created Phase 4: Edge Cases & Multi-Tenant (325 lines)
- ✅ Created this master index

**v1.0 - November 14, 2025**
- Initial monolithic test suite created (1610 lines)

---

**Document Status:** ✅ COMPLETE
**Ready for Execution:** YES
**Context Savings:** ~1200 lines per phase (75% reduction)
**Recommended Usage:** Load only the phase you're currently executing
