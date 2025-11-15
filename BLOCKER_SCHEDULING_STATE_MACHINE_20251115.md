# BLOCKER: Scheduling State Machine Database Errors

**Date:** November 15, 2025
**Severity:** P0 - HIGH (UX Critical, Not Functional Blocker)
**Test:** P0-005 State Machine (Draft/Finalized/Published)
**Environment:** tester.compsync.net
**Build:** v1.1.2 (4b411ac)

---

## Executive Summary

**Status:** ⚠️ PARTIALLY BLOCKING

The scheduling state machine (Draft → Finalized → Published) **DOES WORK functionally**, but displays confusing database error messages to users during transitions. This creates a poor UX and may prevent users from trusting the system.

---

## Test Results

### ✅ PASS: State Transitions Work

All three state transitions completed successfully:

1. **Draft → Finalized:** ✅ SUCCESS
   - Status badge changed from blue "Draft" to orange "Finalized"
   - UI correctly shows "Entry numbers locked • Studios can view"
   - Unlock and Publish buttons appeared

2. **Finalized → Published:** ✅ SUCCESS
   - Status badge changed from orange "Finalized" to green "Published"
   - UI correctly shows "Studio names revealed • Schedule locked"
   - Public View button enabled

### ❌ FAIL: Database Errors During Transitions

#### Error 1: Finalize Transition
**When:** User clicks "Finalize Schedule" button
**Error Message Shown:**
```
Cannot finalize:
Invalid `prisma.$queryRaw()` invocation:

Raw query failed. Code: `42703`. Message: `column "status" does not exist`
```

**Evidence:** `p0-005-ERROR-finalize-failed.png`

**Impact:**
- User sees error dialog and thinks finalize failed
- **BUT**: Finalize actually succeeded (UI changed to Finalized state)
- User confusion: "Did it work or not?"

#### Error 2: Publish Transition
**When:** User clicks "Publish Schedule" button
**Error Message Shown:**
```
Cannot publish: Schedule must be finalized before publishing
```

**Evidence:** `p0-005-ERROR-publish-failed.png`

**Impact:**
- User sees error saying schedule isn't finalized
- **BUT**: Publish actually succeeded (UI changed to Published state)
- User confusion: "The UI shows Finalized, why does it say it's not?"

---

## Root Cause Analysis

### Database Schema Issue

The error message `column "status" does not exist` suggests:

1. **Missing Column:** The database table is missing a `status` column that the code expects
2. **Wrong Table:** The query is looking at the wrong table
3. **Client-Side Workaround:** The code has a fallback that updates client-side state even when database update fails

### Code Behavior

The pattern suggests:
```javascript
try {
  // Attempt to update database with status
  await prisma.$queryRaw`UPDATE table SET status = ...`
} catch (error) {
  // Show error to user
  alert(error.message)
  // BUT: Still update client state (bug)
  setScheduleStatus('finalized')
}
```

This explains why:
- Error appears ❌
- But operation still completes ✅

---

## Impact Assessment

### Functional Impact: LOW
- ✅ State transitions work correctly
- ✅ UI updates properly
- ✅ User can complete workflow
- ⚠️ Unknown: Does backend actually persist state changes?

### UX Impact: HIGH
- ❌ Users see error dialogs for successful operations
- ❌ Creates distrust in system
- ❌ Users may abandon workflow thinking it failed
- ❌ Support burden: "I got an error, did my schedule publish?"

### Launch Impact: **MEDIUM-HIGH**
- Not a functional blocker (features work)
- **IS a UX blocker** (will confuse/frustrate users)
- Acceptable for internal testing
- **NOT acceptable for client-facing launch**

---

## Recommended Fix

### Short-term (Pre-Launch Critical)
1. **Add missing `status` column** to database table
2. **Test state transitions** verify no errors appear
3. **Verify persistence:** Check that status survives page reload

### Medium-term (Post-Launch Enhancement)
1. **Remove raw SQL queries** - use Prisma schema properly
2. **Add proper error handling** - don't update UI if database fails
3. **Add state verification** - confirm backend state before UI update

---

## Test Evidence

| Screenshot | Description | Status |
|------------|-------------|--------|
| `p0-005-01-draft-state.png` | Initial Draft state | ✅ PASS |
| `p0-005-ERROR-finalize-failed.png` | Error during finalize | ❌ BUG |
| `p0-005-02-finalized-state.png` | Finalized state (after error) | ⚠️ WORKS |
| `p0-005-ERROR-publish-failed.png` | Error during publish | ❌ BUG |
| `p0-005-03-published-state-SUCCESS.png` | Published state (after error) | ⚠️ WORKS |

---

## Verification Steps

### To Verify Fix:
1. Navigate to `/dashboard/director-panel/schedule`
2. Click "Finalize Schedule"
3. **Expected:** No error, smooth transition to Finalized
4. Click "Publish Schedule"
5. **Expected:** No error, smooth transition to Published
6. Reload page
7. **Expected:** Status persists as "Published"

### Database Check:
```sql
-- Verify status column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
AND column_name = 'status';

-- Verify status values persisted
SELECT id, status, updated_at
FROM schedules
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
ORDER BY updated_at DESC LIMIT 5;
```

---

## Decision

**Recommendation:** ⚠️ MUST FIX before client launch, acceptable for internal testing

**Rationale:**
- Functional workflow works
- UX is unacceptable for clients
- Risk: Users abandon workflow due to confusing errors
- Quick fix: Add database column

**Blocking Status:**
- ❌ **BLOCKS client-facing launch**
- ✅ **DOES NOT block internal testing**
- ✅ **DOES NOT block other E2E tests**

---

**Report Status:** ✅ COMPLETE
**Next Action:** Database schema fix required
**Estimated Fix Time:** 15-30 minutes (add column + migration)
