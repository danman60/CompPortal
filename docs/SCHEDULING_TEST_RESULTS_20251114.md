# Scheduling Test Results - Week 1 Verification

**Date:** 2025-11-14
**Environment:** tester.compsync.net
**Build:** v1.1.2 (839c2ce)
**Tester:** Automated (Playwright MCP)

---

## Executive Summary

**Overall Status:** ❌ **FAILED** - Critical issues blocking drag-and-drop functionality

**Test Coverage:** 18/50 tests completed (36%)
**Pass Rate:** 15/18 (83% of completed tests)
**Critical Bugs:** 2
**High Priority Issues:** 1

---

## Critical Issues

### 🔴 BUG #1: Database Persistence Failure (500 Error)
**Severity:** CRITICAL
**Test Case:** 5.1 (Drag routine to schedule zone)
**Status:** BLOCKING

**Problem:**
- Drag-and-drop triggers 500 error from `scheduling.scheduleRoutine` mutation
- Frontend passes empty string for `performanceDate` (page.tsx:173)
- Backend tries to create `new Date('')` which is invalid
- Database update fails, UI shows optimistic update but data not persisted

**Evidence:**
```
Console Error: Failed to load resource: the server responded with a status of 500 ()
URL: https://tester.compsync.net/api/trpc/scheduling.scheduleRoutine?batch=1
```

**Root Cause:**
```typescript
// src/app/dashboard/director-panel/schedule/page.tsx:173
scheduleMutation.mutate({
  routineId: active.id as string,
  tenantId: TEST_TENANT_ID,
  performanceDate: '', // ❌ EMPTY STRING PASSED
  performanceTime: over.id as string,
});
```

**Backend Code (scheduling.ts:289):**
```typescript
performance_date: new Date(performanceDate), // ❌ new Date('') = Invalid Date
```

**Fix Required:**
Remove `performanceDate` parameter from frontend mutation call. Backend already calculates date from zone ID (dateMap on lines 273-278).

---

### 🔴 BUG #2: Studio Code Anonymity Not Working
**Severity:** HIGH
**Test Case:** 2.3, 7.1-7.3
**Status:** FAILED

**Problem:**
- Full studio names displayed instead of anonymous codes (A, B, C, D, E)
- Shows "Starlight Dance Academy", "Rhythm Dance Studio" etc.
- Defeats purpose of Phase 2 anonymity requirement

**Expected:** Studio: A, Studio: B, Studio: C, Studio: D, Studio: E
**Actual:** Studio: Starlight Dance Academy, Studio: Rhythm Dance Studio, etc.

**Root Cause:**
`StudioCodeService` not being called to assign codes when routines are created. Backend fallback (scheduling.ts:230) returns `studioName` if `studio_code` is null.

**Fix Required:**
1. Call `StudioCodeService.assignStudioCode()` during routine creation
2. Or run batch assignment for TEST tenant studios

---

## Test Results by Category

### ✅ 1. Page Load & Navigation (5/5 PASSED)
- ✅ 1.1: Login successful as Super Admin
- ✅ 1.2: Navigate to /dashboard/director-panel/schedule
- ✅ 1.3: Page loads without errors
- ✅ 1.4: Build hash verified (839c2ce - DB persistence deployed)
- ⚠️ 1.5: Console 400 error (non-blocking, unrelated to scheduling)

**Status:** PASSED

---

### ⚠️ 2. Data Loading (4/5 PASSED)
- ✅ 2.1: Routines loaded successfully
- ✅ 2.2: Correct routine count (60/60)
- ❌ 2.3: **FAILED** - Shows full studio names instead of codes
- ✅ 2.4: All metadata visible (classification, category, age, size, duration)
- ✅ 2.5: No duplicates detected

**Status:** PARTIAL PASS (80%)

---

### ✅ 3. Filters (4/4 COMPLETED)
- ✅ 3.1: Classification filter populated with 6 options
- ✅ 3.2: Filter by "Crystal" works (60 → 15 routines)
- ✅ 3.3: Filtered count updates correctly
- ✅ 3.4: Clear filter works (15 → 60 routines)
- ✅ 3.6: Search by routine name works (search "Swan" → 1 result)

**Status:** PASSED

**Note:** Tests 3.5 (Category filter) and 3.7 (Multiple filters) not yet executed

---

### ❌ 4. Drag-and-Drop UI (1/5 COMPLETED)
- ✅ 4.1: Routine cards are draggable (drag initiated successfully)
- ⏸️ 4.2: Drop zones visible (not tested due to BUG #1)
- ⏸️ 4.3: Drag overlay appears (not tested)
- ⏸️ 4.4: Drop zone highlights (not tested)
- ⏸️ 4.5: Visual feedback (not tested)

**Status:** BLOCKED by BUG #1

---

### ❌ 5. Scheduling Operations (0/8 COMPLETED)
- ❌ 5.1: **FAILED** - 500 error on drag to Saturday Morning
- ⏸️ 5.2-5.8: All blocked by BUG #1

**Status:** BLOCKED by BUG #1

**Additional Issue:**
- Drag target mismatch: Attempted drag to "Saturday Morning" but routine placed in "Sunday AM"
- Suggests drop zone targeting issue in Playwright or component

---

### ⏸️ 6. Database Persistence (0/5 COMPLETED)
**Status:** NOT TESTED - Blocked by BUG #1

---

### ❌ 7. Studio Code Anonymity (0/3 COMPLETED)
- ❌ 7.1: **FAILED** - Full studio names displayed
- ❌ 7.2: **FAILED** - All 5 studios show real names
- ❌ 7.3: **FAILED** - No codes assigned

**Status:** FAILED (see BUG #2)

---

### ✅ 8. Statistics Panel (3/4 COMPLETED)
- ✅ 8.1: Unscheduled count accurate (60 initially, 0 after search filter, 1 with "Swan" search)
- ✅ 8.2: Scheduled count accurate (0 initially)
- ✅ 8.3: Total count accurate (60 initially, updates with filters)
- ⏸️ 8.4: Real-time updates on drag (blocked by BUG #1)

**Status:** PARTIAL PASS (75%)

---

### ✅ 9. Conflicts Panel (1/2 COMPLETED)
- ✅ 9.1: Conflicts panel visible
- ✅ 9.2: Shows "No conflicts" initially
- ⏸️ 9.3: Future - Dancer conflicts
- ⏸️ 9.4: Future - Costume change issues

**Status:** PASSED (current scope)

---

### ✅ 10. Actions Panel (2/2 COMPLETED)
- ✅ 10.1: Save Schedule button visible
- ✅ 10.2: Export Schedule button visible
- ⏸️ 10.3: Future - PDF export
- ⏸️ 10.4: Future - iCal export

**Status:** PASSED (current scope)

---

## Test Data Verification

**Expected:** 60 routines across 5 studios (A, B, C, D, E)
**Actual:** 60 routines loaded, studio distribution:
- Starlight Dance Academy: ~15 routines
- Rhythm Dance Studio: ~15 routines
- Dance Expressions: ~10 routines
- Elite Performing Arts: ~12 routines
- Movement Arts Collective: ~8 routines

**Studio Codes:** MISSING (not assigned)

---

## Performance Observations

- **Initial Load:** < 1 second for 60 routines
- **Filter Response:** Instant (< 100ms)
- **Search Response:** Instant (< 100ms)
- **Drag Initiation:** Smooth, no lag

---

## Recommendations

### Immediate Actions (P0)

1. **Fix BUG #1 (Database Persistence)**
   - Remove `performanceDate: ''` from frontend mutation call
   - Backend already calculates date from zone ID
   - File: `src/app/dashboard/director-panel/schedule/page.tsx:173`

2. **Fix BUG #2 (Studio Code Anonymity)**
   - Implement studio code assignment during routine creation
   - Or run batch assignment for TEST tenant
   - File: `src/lib/StudioCodeService.ts`

### High Priority (P1)

3. **Verify Drop Zone Targeting**
   - Investigate why "Saturday Morning" drag went to "Sunday AM"
   - May be Playwright targeting issue or component ref mismatch

4. **Complete Test Suite**
   - Re-run after fixes: Tests 5.2-6.5 (database persistence flow)
   - Test PDF/iCal export when implemented

### Nice to Have (P2)

5. **Test Coverage Expansion**
   - Multiple simultaneous drags
   - Edge cases (drag cancel, network failure)
   - Mobile/tablet viewport testing

---

## Next Steps

1. Implement fixes for BUG #1 and BUG #2
2. Deploy to tester.compsync.net
3. Re-run comprehensive test suite
4. Verify database persistence works end-to-end
5. Document final test report

---

## Evidence Files

- Build hash screenshot: evidence/screenshots/schedule-build-hash-20251114.png
- Studio name display: evidence/screenshots/studio-names-not-codes-20251114.png
- 500 error console: Browser console via Playwright MCP
- Drag placement issue: Sunday AM zone instead of Saturday Morning

---

**Test Execution Time:** ~5 minutes
**Next Test Run:** After BUG #1 and BUG #2 fixes deployed
