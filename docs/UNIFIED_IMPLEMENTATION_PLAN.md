# CompPortal Unified Implementation Plan
## Strategic Hardening + Refactoring Roadmap

**Created**: October 16, 2025
**Total Duration**: 74 hours (~2 weeks)
**Approach**: Alternating hardening and refactoring with strategic synergies
**Goal**: Production-ready, maintainable, resilient codebase

---

## Strategic Principles

### 1. Safety Nets First
Install error boundaries and status guards before major refactors, so if refactoring breaks something, the app doesn't crash completely.

### 2. Synergistic Grouping
- Email Service refactor + Failure Detection (both touch email code)
- StatusBadge + Modal (both UI component extractions)
- Server Validation before Transactions (validate inputs before complex operations)

### 3. Quick Wins Early
Start with StatusBadge (4h) to demonstrate immediate value and build momentum.

### 4. Risk Isolation
Do high-risk refactoring (EntriesList split) LAST, after all safety nets are in place.

### 5. Testing Windows
Group related changes for easier testing, then test thoroughly before moving to next wave.

---

## Implementation Waves

### 🌊 Wave 1: Foundation & Quick Wins (14 hours, 3 days)
**Theme**: Establish safety guardrails and deliver visible improvements

#### 1.1 Hardening P1: Status Guards (4 hours) ⚡ CRITICAL
**Why First**: Prevents business logic violations (auto-invoice bug pattern)

**What**:
- Create `src/lib/guards/statusGuards.ts`
- Add guards to: `invoice.ts`, `reservation.ts`, `entry.ts`
- Enforce: Reservation approval workflow, invoice editing rules

**Testing**:
- Try creating invoice with pending reservation → should fail
- Try editing PAID invoice → should fail
- Try approving already-approved reservation → should fail

**Output**: Zero business logic violations possible

---

#### 1.2 Refactoring P2: StatusBadge Component (4 hours) 🎨 QUICK WIN
**Why Second**: Fast, low-risk, immediate visual consistency

**What**:
- Create `src/components/ui/StatusBadge.tsx`
- Replace 12+ duplicated status badge implementations
- Consistent styling across all pages

**Testing**:
- View entries, reservations, invoices with all status types
- Verify consistent styling

**Output**: -300 lines of duplication, consistent UX

---

#### 1.3 Hardening P2: Error Boundaries (6 hours) 🛡️ SAFETY NET
**Why Third**: Safety net installed before larger refactors

**What**:
- Create `src/components/ErrorBoundary.tsx`
- Wrap: Root layout, dashboard layout, EntriesList, UnifiedRoutineForm
- Graceful degradation with retry

**Testing**:
- Throw error in EntriesList → rest of app works
- Throw error in form → can retry without data loss

**Output**: Component crashes don't break entire app

---

**Wave 1 Milestone**:
- ✅ Business logic protected
- ✅ Quick visual win delivered
- ✅ Safety net for future work
- 🧪 **TEST CHECKPOINT**: Full smoke test before Wave 2

---

### 🌊 Wave 2: Validation & UI Polish (14 hours, 3 days)
**Theme**: Complete UI component extraction + backend validation

#### 2.1 Refactoring P3: Modal Component (6 hours) 🎨 UI CONSISTENCY
**Why First**: Completes UI component extraction started in Wave 1

**What**:
- Create `src/components/ui/Modal.tsx`
- Replace 8+ duplicated modal implementations
- Escape key support (accessibility)

**Testing**:
- Open/close modals with Escape key
- Test all modal variants (default, warning, danger)

**Output**: -400 lines of duplication, accessible by default

---

#### 2.2 Hardening P3: Server-Side Validation (8 hours) 🔒 BACKEND SAFETY
**Why Second**: Backend protection before complex transaction work

**What**:
- Create `src/lib/validators/` (entry, invoice, reservation)
- Zod schemas for all mutations
- Business rule enforcement (capacity limits, fee ranges)

**Testing**:
- Try creating entry with negative fee → should fail
- Try exceeding reservation space limit → should fail
- Verify error messages are user-friendly

**Output**: API layer enforces business rules, cannot bypass with DevTools

---

**Wave 2 Milestone**:
- ✅ UI components extracted and reusable
- ✅ Backend validates all inputs
- ✅ Type safety improved (Zod → TypeScript)
- 🧪 **TEST CHECKPOINT**: API testing + UI smoke test

---

### 🌊 Wave 3: Services & Observability (14 hours, 3 days)
**Theme**: Extract email logic + track failures

**Synergy**: Both touch email code - refactor first, then add failure tracking

#### 3.1 Refactoring P4: Email Service Layer (8 hours) 📧 TESTABILITY
**Why First**: Extract email logic before adding failure tracking

**What**:
- Create `src/lib/services/emailService.ts`
- Extract 6 email-sending blocks from `reservation.ts`
- Centralized error handling

**Testing**:
- Approve reservation → verify email sent
- Reject reservation → verify email sent
- Check logs for errors

**Output**: -500 lines from routers, testable email service

---

#### 3.2 Hardening P5: Silent Failure Detection (6 hours) 📊 OBSERVABILITY
**Why Second**: Track failures in the email service we just refactored

**What**:
- Create `failure_log` table migration
- Create `src/lib/services/failureTracker.ts`
- Update EmailService to track failures
- Add UI: `FailureNotificationBanner`, admin failure page

**Testing**:
- Kill email service → create invoice → verify failure logged
- Check notification banner appears
- Retry failed email from admin page

**Output**: 100% visibility into failed operations, retry capability

---

**Wave 3 Milestone**:
- ✅ Email logic centralized and testable
- ✅ Silent failures now visible and recoverable
- ✅ Admin tools for debugging production issues
- 🧪 **TEST CHECKPOINT**: Email workflow + failure recovery testing

---

### 🌊 Wave 4: Data Integrity (10 hours, 2 days)
**Theme**: Atomic operations for consistency

#### 4.1 Hardening P4: Transaction Boundaries (10 hours) 🔐 ATOMICITY
**Why Solo**: Complex change, deserves full focus

**What**:
- Wrap invoice creation in transaction
- Wrap reservation approval in transaction
- Wrap entry deletion in transaction (cascade to participants)
- Move emails OUTSIDE transactions (non-critical)

**Testing**:
- Create invoice, throw error mid-transaction → verify rollback
- Approve reservation, throw error → verify rollback
- Verify emails still send even if transaction succeeds

**Output**: Zero partial data updates, database always consistent

---

**Wave 4 Milestone**:
- ✅ All multi-step operations are atomic
- ✅ Database integrity guaranteed
- ✅ Rollback works correctly
- 🧪 **TEST CHECKPOINT**: Stress test transactions with intentional failures

---

### 🌊 Wave 5: Major Refactor (16 hours, 3-4 days)
**Theme**: EntriesList split (NOW PROTECTED BY ALL SAFETY NETS)

**Why Last**: High-risk refactor, but now protected by error boundaries, validation, transactions

#### 5.1 Refactoring P5: EntriesList Component Split (16 hours) 🏗️ ARCHITECTURE
**Phase 1**: Extract Custom Hooks (8 hours)
- Create `src/hooks/useEntries.ts`
- Create `src/hooks/useEntryFilters.ts`
- Create `src/hooks/useBulkSelection.ts`
- Create `src/hooks/useSpaceUsage.ts`

**Phase 2**: Extract View Components (4 hours)
- Create `src/components/entries/EntriesCardView.tsx`
- Create `src/components/entries/EntriesTableView.tsx`
- Create `src/components/entries/EntryCard.tsx`
- Create `src/components/entries/EntryTableRow.tsx`

**Phase 3**: Refactor Main Component (4 hours)
- Reduce `EntriesList.tsx` from 1,316 → 200 lines
- Use extracted hooks and components
- Test thoroughly - this is a major refactor

**Testing**:
- All existing functionality still works
- Bulk selection with keyboard shortcuts
- Card/Table view toggle
- Filtering and space calculations
- Pull-to-refresh

**Output**: 85% reduction in main file, testable units, reusable logic

---

**Wave 5 Milestone**:
- ✅ Largest component refactored successfully
- ✅ Code is maintainable and testable
- ✅ Performance improved (optimized re-renders)
- 🧪 **TEST CHECKPOINT**: Full regression test of entries workflow

---

### 🌊 Wave 6: Production Monitoring (6 hours, 1 day)
**Theme**: Observability for production

#### 6.1 Hardening P6: Health Checks & Monitoring (6 hours) 📡 MONITORING
**Why Last**: Monitoring layer on top of hardened system

**What**:
- Create `/api/health` endpoint (database + email checks)
- Create `/status` public status page
- Add link to status page in footer
- Set up external monitoring (UptimeRobot)

**Testing**:
- Visit `/api/health` → verify JSON
- Visit `/status` → verify UI
- Disconnect database → verify unhealthy status

**Output**: Proactive system monitoring, <2min incident detection

---

**Wave 6 Milestone**:
- ✅ System health monitored 24/7
- ✅ Public status page for transparency
- ✅ External monitoring configured
- 🧪 **FINAL TEST**: Full end-to-end production workflow

---

## Total Timeline

| Wave | Duration | Cumulative | Theme |
|------|----------|------------|-------|
| Wave 1 | 14h (3 days) | 14h | Foundation & Quick Wins |
| Wave 2 | 14h (3 days) | 28h | Validation & UI Polish |
| Wave 3 | 14h (3 days) | 42h | Services & Observability |
| Wave 4 | 10h (2 days) | 52h | Data Integrity |
| Wave 5 | 16h (4 days) | 68h | Major Refactor |
| Wave 6 | 6h (1 day) | 74h | Production Monitoring |
| **Total** | **74 hours** | **~2 weeks** | **Production-Ready** |

---

## Dependencies Map

```
Wave 1: Status Guards → Error Boundaries
         ↓
Wave 2: Modal + StatusBadge (UI layer complete)
        Server Validation (backend protection)
         ↓
Wave 3: Email Service → Failure Detection
         ↓
Wave 4: Transactions (depends on validation)
         ↓
Wave 5: EntriesList Refactor (protected by all above)
         ↓
Wave 6: Health Checks (monitors hardened system)
```

---

## Risk Mitigation Strategy

### Before Each Wave:
1. ✅ Verify build passes
2. ✅ Run test checkpoint from previous wave
3. ✅ Create git tag: `wave-[N]-start`

### After Each Wave:
1. ✅ Full smoke test of affected features
2. ✅ Verify production deployment
3. ✅ Run test checkpoint for this wave
4. ✅ Create git tag: `wave-[N]-complete`
5. ✅ Update PROJECT_STATUS.md

### Rollback Plan:
If wave fails:
```bash
git reset --hard wave-[N-1]-complete
```

---

## Success Metrics

### After Wave 1:
- [ ] Zero business logic violations possible
- [ ] All status displays consistent
- [ ] Component crashes don't break app

### After Wave 2:
- [ ] All modals accessible (Escape key)
- [ ] API rejects invalid inputs

### After Wave 3:
- [ ] Email failures tracked and visible
- [ ] Retry capability works

### After Wave 4:
- [ ] Zero partial data updates
- [ ] Rollback on error proven

### After Wave 5:
- [ ] EntriesList.tsx <250 lines
- [ ] All existing features work
- [ ] Performance improved

### After Wave 6:
- [ ] Health endpoint returns status
- [ ] External monitoring pinging
- [ ] Status page public

### Overall (After Wave 6):
- [ ] **-2,400 lines** of code removed (10% reduction)
- [ ] **-800 lines** of duplication eliminated
- [ ] **Zero** policy violations (no hardcoded data)
- [ ] **Zero** business logic violations possible
- [ ] **90%** reduction in full app crashes
- [ ] **100%** server-side validation coverage
- [ ] **Zero** partial data updates
- [ ] **100%** failure visibility
- [ ] **<2 min** incident detection time

---

## Execution Commands

### Start a Wave:
```bash
# Example: Start Wave 1
git tag wave-1-start
```

### Execute Work:
```bash
# For hardening tasks:
Read docs/HARDENING_RECOMMENDATIONS.md and implement Priority [N].

# For refactoring tasks:
Read docs/REFACTORING_RECOMMENDATIONS.md and implement Priority [N].
```

### Complete a Wave:
```bash
# Run test checkpoint
# Verify production
git tag wave-1-complete
# Update PROJECT_STATUS.md
```

### Emergency Rollback:
```bash
git reset --hard wave-[N-1]-complete
git push --force
```

---

## Testing Checkpoints

### Wave 1 Checkpoint (Foundation):
- [ ] Create routine with invalid status → blocked by guard
- [ ] Throw error in component → app stays up
- [ ] Verify StatusBadge on all pages

### Wave 2 Checkpoint (Validation):
- [ ] Submit invalid entry via API → rejected
- [ ] Verify all modals use new component
- [ ] Verify Escape key closes modals

### Wave 3 Checkpoint (Services):
- [ ] Approval email sends successfully
- [ ] Email failure logged to failure_log
- [ ] Retry from admin page works

### Wave 4 Checkpoint (Transactions):
- [ ] Invoice creation rolls back on error
- [ ] Reservation approval rolls back on error
- [ ] Entry deletion cascades correctly

### Wave 5 Checkpoint (Refactor):
- [ ] All entries features work (card/table views)
- [ ] Bulk selection works (Ctrl+A, Escape)
- [ ] Space calculations accurate
- [ ] Pull-to-refresh works

### Wave 6 Checkpoint (Monitoring):
- [ ] /api/health returns healthy
- [ ] /status page shows all services
- [ ] External monitor pings working

---

## Communication Plan

### After Each Wave (User Update):
```
✅ Wave [N] Complete: [Theme]

Completed:
- [Task 1] (file:lines)
- [Task 2] (file:lines)

Impact:
- [Business value]

Next: Wave [N+1] - [Theme]
```

---

## Optional: Parallel Execution

If you have multiple developers:

**Team A (Backend Focus)**:
- Wave 1.1: Status Guards
- Wave 2.2: Server Validation
- Wave 3.1: Email Service
- Wave 4.1: Transactions

**Team B (Frontend Focus)**:
- Wave 1.2: StatusBadge
- Wave 1.3: Error Boundaries
- Wave 2.1: Modal
- Wave 5.1: EntriesList Refactor

**Team C (Observability)**:
- Wave 3.2: Failure Detection
- Wave 6.1: Health Checks

---

## Notes

- **Wave 1 is critical** - establishes foundation for everything else
- **Wave 3 has strong synergy** - refactor email logic, then track failures
- **Wave 5 is highest risk** - defer until all safety nets installed
- **Test checkpoints are mandatory** - don't skip testing between waves
- **Each wave is independently valuable** - can pause between waves if needed

---

**Next Step**: Execute Wave 1.1 (Status Guards)

```bash
Read docs/HARDENING_RECOMMENDATIONS.md and implement Priority 1.
```

---

**Last Updated**: October 16, 2025
**Status**: Ready for execution
