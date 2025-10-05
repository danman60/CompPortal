# Next Session Priorities - CompPortal

**Last Updated**: October 3, 2025
**Current Status**: RBAC Verified (73% coverage) - All critical bugs fixed
**Production**: https://comp-portal-one.vercel.app

---

## 🎯 Immediate Priorities (High Impact, Low Complexity)

### 1. **Dancer Edit UI** (Missing Feature - Blocks SA-10 Test) 🟡 HIGH
**Estimated Time**: 1-2 hours
**Impact**: Completes dancer management CRUD, unblocks RBAC testing

**Tasks**:
- [ ] Create `/dashboard/dancers/[id]/page.tsx` (edit page)
- [ ] Create `DancerEditForm.tsx` component (or modify existing DancerForm for edit mode)
- [ ] Add "Edit" button to DancersList component (links to edit page)
- [ ] Pre-populate form with existing dancer data (use `dancer.getById` query)
- [ ] Connect to existing `dancer.update` mutation in backend
- [ ] Test: Edit dancer, save, verify changes persist
- [ ] Test: RBAC - Studio directors can only edit own studio's dancers

**Files to Create/Modify**:
- `src/app/dashboard/dancers/[id]/page.tsx` (NEW)
- `src/components/DancerEditForm.tsx` (NEW or modify DancerForm.tsx)
- `src/components/DancersList.tsx` (add edit button)

**Backend**: Already exists (`src/server/routers/dancer.ts` - update mutation at line 262)

**Reference**: Similar to Entry Edit page pattern (already working)

---

### 2. **Reservation Create UI** (Missing Feature - Blocks SD-8, CD-6 Tests) 🟡 HIGH
**Estimated Time**: 2-3 hours
**Impact**: Enables studio directors to create reservations, completes reservation workflow

**Tasks**:
- [ ] Create `/dashboard/reservations/new/page.tsx` (create page)
- [ ] Create `ReservationForm.tsx` component (multi-step wizard):
  - **Step 1**: Competition selection (dropdown of available competitions)
  - **Step 2**: Spaces requested (number input)
  - **Step 3**: Agent information (first name, last name, email, phone, title)
  - **Step 4**: Consents (age of consent, waiver, media - checkboxes)
  - **Step 5**: Review & Submit
- [ ] Add "Create Reservation" button to ReservationsList component
- [ ] Connect to existing `reservation.create` mutation
- [ ] Add form validation (Zod schemas)
- [ ] Test: Create reservation, verify approval workflow works
- [ ] Test: RBAC - Studio directors can only create for own studio

**Files to Create/Modify**:
- `src/app/dashboard/reservations/new/page.tsx` (NEW)
- `src/components/ReservationForm.tsx` (NEW)
- `src/components/ReservationsList.tsx` (add create button)

**Backend**: Already exists (`src/server/routers/reservation.ts` - create mutation at line 327)

**Reference**: Similar to Entry Creation wizard (already working)

---

## 🚀 Medium-Term Priorities (Major Features)

### 3. **Entry Numbering System** (Roadmap Week 13) 🟡 HIGH
**Estimated Time**: 4-6 hours
**Impact**: Core scheduling feature, industry-standard requirement

**Tasks**:
- [ ] Database migration: Add `entry_number`, `entry_suffix`, `scheduled_time`, `is_late_entry` columns
- [ ] Add unique constraint per competition for entry_number + suffix
- [ ] Implement auto-numbering logic (starts at 100 per competition)
- [ ] Create suffix assignment logic for late entries (156a, 156b)
- [ ] Build CD interface to mark late entries and assign suffixes
- [ ] Lock entry numbers when schedule is published
- [ ] Update EntriesList component to display entry numbers
- [ ] Update all exports (PDF, CSV) to include entry numbers

**Files to Create/Modify**:
- `prisma/migrations/add_entry_numbering.sql` (NEW)
- `src/server/routers/scheduling.ts` (enhance with numbering logic)
- `src/components/EntriesList.tsx` (show entry numbers)
- `src/components/SchedulingManager.tsx` (add suffix assignment UI)

**Documentation**: See `BUGS_AND_FEATURES.md` Section 1 for full technical specs

---

### 4. **Real-Time Scoring & Tabulation** (Roadmap Week 14) 🔴 CRITICAL
**Estimated Time**: 8-12 hours
**Impact**: Competition day operations - judges need to score in real-time

**Tasks**:
- [ ] Database migration: Add `scoring_ranges` JSONB to competitions, `calculated_score`, `award_level`, `category_placement` to entries
- [ ] Build judge scoring interface with sliders (1-100 per criterion)
- [ ] Implement real-time calculation engine (average across judges)
- [ ] Auto-categorize entries into award levels (Platinum, Gold, Silver)
- [ ] Set up WebSocket or Server-Sent Events for live scoreboard updates
- [ ] Build live scoreboard component with auto-refresh
- [ ] Add database triggers for auto-calculation on score insert
- [ ] Optimize for concurrent scoring (3+ judges, 10+ entries/hour)
- [ ] Create score sheets export (PDF with entry numbers, awards, placements)

**Files to Create/Modify**:
- `prisma/migrations/add_real_time_scoring.sql` (NEW)
- `src/lib/websocket.ts` (NEW - WebSocket server)
- `src/hooks/useRealtimeScores.ts` (NEW - WebSocket client hook)
- `src/server/routers/scoring.ts` (enhance for real-time)
- `src/app/dashboard/scoring/page.tsx` (enhance with sliders)
- `src/app/dashboard/scoreboard/page.tsx` (enhance with WebSocket)
- `src/components/LiveScoreboard.tsx` (NEW - real-time display)

**Documentation**: See `BUGS_AND_FEATURES.md` Section 2 for full technical specs

---

## 📋 Lower Priority (Nice-to-Have)

### 5. **API Testing Infrastructure** (Roadmap Week 16-17) 🔵 MEDIUM
**Estimated Time**: 4-6 hours
**Impact**: Complete remaining RBAC security tests (SD-4, SD-9, SD-10, CD-10)

**Tasks**:
- [ ] Set up Playwright request interception for API testing
- [ ] Create test scripts for cross-studio access attempts
- [ ] Validate RBAC enforcement at API level (bypassing UI)
- [ ] Document security test results

**Files to Create**:
- `tests/security/cross-studio-access.spec.ts` (NEW)
- `tests/security/rbac-api-validation.spec.ts` (NEW)

---

### 6. **Complete RBAC Golden Tests** (If Time Permits)
**Remaining Tests**: 8/30 (SD-4, SD-8, SD-9, SD-10, CD-6, CD-10, SA-10)
- Most blocked by missing features (#1, #2, #5 above)
- Complete after implementing Dancer Edit UI and Reservation Create UI

---

## 🎯 Recommended Next Session Plan

**Option A: Quick Wins (4-6 hours)**
1. ✅ Dancer Edit UI (1-2 hours)
2. ✅ Reservation Create UI (2-3 hours)
3. ✅ Test SD-8, CD-6, SA-10 (complete RBAC testing to 83%)

**Option B: Major Feature (8-12 hours)**
1. ✅ Real-Time Scoring & Tabulation System (full implementation)
2. Test scoring with 3 demo judges
3. Validate live scoreboard updates

**Option C: Balanced Approach (6-8 hours)**
1. ✅ Dancer Edit UI (1-2 hours)
2. ✅ Entry Numbering System (4-6 hours)
3. Update schedule generation to assign entry numbers

---

## 📚 Key Documentation References

Before starting next session, review:
1. **BUGS_AND_FEATURES.md** - Complete feature specifications
2. **COMPETITION_WORKFLOW.md** - Industry workflow and business logic
3. **PRODUCTION_ROADMAP.md** - Full development timeline
4. **TEST_RESULTS.md** - RBAC testing status and remaining tests

---

## 🚨 Known Issues / Technical Debt

1. **Decimal.toFixed() Bug**: Systematically review all Prisma Decimal usage (not just entry fees)
2. **Email Bouncing**: Test credentials emails may bounce - need to verify Supabase email settings
3. **Music File Naming**: Enforce entry number prefix in filename validation (not just suggestion)
4. **Schedule Logic**: Conflict detection rules need specification (see COMPETITION_WORKFLOW.md Section 11)

---

**Recommendation for Next Session**:
Start with **Option A (Quick Wins)** to complete missing UI features and increase RBAC test coverage to 83% (25/30 tests). This provides immediate value and unblocks user workflows before tackling major features like Real-Time Scoring.
