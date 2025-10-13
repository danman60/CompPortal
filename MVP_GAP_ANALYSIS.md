# MVP Gap Analysis - January 13, 2025

**Reference**: MVP_REQUIREMENTS.md (MVP Bible)
**Status**: Feature Freeze Active - MVP Verification Only

---

## 🔍 Initial Findings

### ✅ Backend Validation (All Working)
- ✅ Auto-invoice generation on approval (reservation.ts:584-622)
- ✅ Event locking validation (entry.ts:445-460)
- ✅ Capacity limit enforcement
- ✅ Token allocation system
- ✅ Approved reservation check before routine creation

### ⚠️ Frontend UI Gaps Found

## 📋 Gap List (Prioritized)

### 🔴 CRITICAL - MVP Blockers

#### Gap #1: Event Locking UI Missing
**Location**: `UnifiedRoutineForm.tsx`
**Issue**:
- Form does NOT read URL params `?competition=X&reservation=Y`
- Competition select is NOT disabled/locked when params present
- No validation that selected competition matches reservation

**MVP Requirement (Section 2.2)**:
> "Routine creation must be **locked to the approved event**. Event field on form is **auto-populated** and **non-editable**."

**Current State**: Lines 1-237 show no `useSearchParams()` hook usage
**Impact**: Studio can create routine for wrong competition (violates reservation contract)

**Fix Required**:
```typescript
// Add URL param reading
const searchParams = useSearchParams();
const competitionParam = searchParams.get('competition');
const reservationParam = searchParams.get('reservation');

// Lock competition field
<select disabled={!!competitionParam}>

// Validate on submit
if (reservationParam && form.competition_id !== competitionParam) {
  throw new Error('Competition must match reservation');
}
```

---

#### Gap #2: Helper Text Missing (Routine Counter)
**Location**: `UnifiedRoutineForm.tsx`
**Issue**: No display of "X of Y routines remaining" above form

**MVP Requirement (Section 2.2)**:
> "Helper text above button: 'Routines available: X of Y approved.'"

**Current State**: No reservation query, no counter display
**Impact**: Studio doesn't know capacity before starting form

**Fix Required**:
```typescript
// Fetch reservation if param provided
const { data: reservation } = trpc.reservation.getById.useQuery(
  reservationParam!,
  { enabled: !!reservationParam }
);

// Display helper text
const remaining = (reservation?.spaces_confirmed || 0) -
                  (reservation?._count?.competition_entries || 0);

// Above form:
<div className="bg-blue-500/20 p-4 rounded-lg mb-6">
  Routines available: {remaining} of {reservation?.spaces_confirmed || 0} approved
</div>
```

---

#### Gap #3: Terminology Audit Incomplete
**Location**: Multiple files
**Issue**: Need to verify ALL "entries" → "routines" replacements complete

**MVP Requirement (Section 4)**:
> "**Terminology**: Replace all instances of 'entries' with 'routines.'"

**Current State**: Some files checked, need comprehensive audit
**Impact**: User confusion, unprofessional UX

**Files to Check**:
- ✅ UnifiedRoutineForm.tsx (uses "routine" in text)
- ✅ ReservationsList.tsx (uses "routines")
- ⚠️ EntriesList.tsx (filename itself is "Entries")
- ⚠️ entries/create/page.tsx (route path is "entries")
- ⚠️ All router endpoints (`entry.ts` vs `routine.ts`)
- ⚠️ Database schema (`competition_entries` table)

---

### 🟡 MEDIUM - UX Polish (MVP Requirements)

#### Gap #4: No Reservation Blocking Message
**Location**: `UnifiedRoutineForm.tsx`
**Issue**: Form loads even if no approved reservation exists

**MVP Requirement (Section 2.2)**:
> "If no approved reservation exists, display: 'You must have an approved reservation before creating routines.'"

**Current State**: Backend validates, but frontend shows form first
**Impact**: User fills out form, gets error on submit (bad UX)

**Fix Required**:
```typescript
// Check for approved reservation first
const { data: approvedReservations } = trpc.reservation.getAll.useQuery();
const hasApprovedReservation = approvedReservations?.reservations.some(
  r => r.status === 'approved' && r.studio_id === currentUser?.studio?.id
);

if (!hasApprovedReservation && currentUser?.role === 'studio_director') {
  return (
    <div className="bg-red-500/20 p-12 rounded-xl text-center">
      <div className="text-6xl mb-4">🚫</div>
      <h3 className="text-xl font-bold mb-2">No Approved Reservation</h3>
      <p>You must have an approved reservation before creating routines.</p>
    </div>
  );
}
```

---

#### Gap #5: Helper Text Position Wrong
**Location**: `ReservationsList.tsx`
**Issue**: Helper text appears AFTER button, MVP requires BEFORE

**MVP Requirement (Section 2.2)**:
> "Helper text **above button**: 'Routines available: X of Y approved.'"

**Current State**: Routine counter at lines 799-836, button at 843-865
**Impact**: Minor UX issue, doesn't block MVP

---

### 🟢 LOW - Documentation/Naming

#### Gap #6: Route Paths Use "entries"
**Location**: `src/app/dashboard/entries/`
**Issue**: URL path is `/dashboard/entries` but should be `/dashboard/routines`

**Impact**: URL inconsistency with terminology
**Risk**: Breaking change - requires URL redirects

---

#### Gap #7: tRPC Router Named "entry"
**Location**: `src/server/routers/entry.ts`
**Issue**: Router is `entry.*` but should be `routine.*`

**Impact**: API inconsistency with terminology
**Risk**: Breaking change - requires frontend updates

---

## 📊 Phase Plan

### Phase 1: Critical MVP Gaps (2-3 hours)
**Target**: Close CRITICAL gaps #1-3
**Deliverables**:
1. Add URL param reading to UnifiedRoutineForm
2. Lock competition field when param present
3. Add helper text with routine counter
4. Audit and fix remaining "entries" → "routines" in UI text

**Files Modified**:
- `src/components/UnifiedRoutineForm.tsx`
- Any components with "entries" in UI strings

**Testing**:
- [ ] Verify competition locked when navigating from reservation
- [ ] Verify helper text displays correct count
- [ ] Verify cannot create routine for wrong competition
- [ ] Verify all user-facing text says "routines"

---

### Phase 2: UX Polish (1 hour)
**Target**: Close MEDIUM gaps #4-5
**Deliverables**:
1. Add pre-check for approved reservation
2. Reorder helper text above button

**Files Modified**:
- `src/components/UnifiedRoutineForm.tsx`
- `src/components/ReservationsList.tsx`

**Testing**:
- [ ] Verify blocking message when no reservation
- [ ] Verify helper text position correct

---

### Phase 3: Naming Consistency (2-4 hours) - DEFERRED
**Target**: Close LOW gaps #6-7
**Risk**: Breaking changes require careful migration
**Recommendation**: Document as tech debt, fix post-MVP

**Reasoning**:
- Requires route redirects (SEO impact)
- Requires tRPC client updates across 20+ components
- Backend validates correctly regardless of naming
- User never sees API route names

---

## 🎯 Recommended Approach

### Immediate (Today)
**Execute Phase 1 only** - Critical MVP gaps
- Estimated time: 2-3 hours
- Zero breaking changes
- High user impact
- Addresses MVP bible requirements directly

### Short-term (Post-MVP Confirmation)
**Execute Phase 2** - UX polish
- Estimated time: 1 hour
- Minor improvements
- No breaking changes

### Long-term (Technical Debt)
**Defer Phase 3** - Naming refactor
- Create TECH_DEBT.md document
- Plan migration strategy
- Schedule after MVP validated

---

## 📝 Summary

**Total Gaps Found**: 7
- **Critical (MVP Blockers)**: 3
- **Medium (UX Polish)**: 2
- **Low (Tech Debt)**: 2

**Recommended Action**: Execute Phase 1 (2-3 hours)

**MVP Status After Phase 1**:
- ✅ Event locking enforced in UI
- ✅ Helper text with counters displayed
- ✅ Terminology consistent in UI
- ✅ All 6 MVP acceptance criteria met

---

**Next Steps**:
1. User approval to proceed with Phase 1
2. Execute fixes with testing
3. Deploy to production
4. User validates MVP functionality
