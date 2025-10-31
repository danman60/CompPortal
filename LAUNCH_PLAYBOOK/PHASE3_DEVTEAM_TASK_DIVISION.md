# Phase 3: DevTeam Protocol - Task Division Through November 7

**Created:** October 30, 2025
**Timeline:** October 30 (Tonight) → November 8 (Launch)
**Team:** 5 Parallel Agents + 1 Test Suite Agent (Separate Instance)
**Protocol:** DevTeam parallel execution with dependency management

---

## 🎯 OVERVIEW

**Total Implementation Time:** ~40 hours
**Parallel Agents:** 5 (can work simultaneously)
**Calendar Days:** 7 days (Oct 30 - Nov 7)
**Launch Target:** November 8, 2025 (Friday - Routine Creation Opens)

**Critical Path Dependencies:**
1. Database migrations must complete before backend validation
2. Backend validation must complete before frontend components
3. All features must complete before testing
4. Testing must complete before Nov 8 launch

---

## 👥 AGENT ASSIGNMENTS

### Agent 1: Database & Schema (DB_AGENT)
**Specialization:** Database migrations, schema changes, data seeding
**Total Time:** 6 hours
**Blocking:** Agents 2, 3, 4 depend on this completing

### Agent 2: Backend Validation (BACKEND_AGENT)
**Specialization:** tRPC routers, validation logic, business rules
**Total Time:** 12 hours
**Depends On:** Agent 1 (database schema)
**Blocking:** Agent 3 (frontend) depends on API contracts

### Agent 3: Frontend Components (FRONTEND_AGENT)
**Specialization:** React components, forms, UI changes
**Total Time:** 10 hours
**Depends On:** Agent 2 (API endpoints ready)

### Agent 4: UI/UX Polish (UX_AGENT)
**Specialization:** Styling, error messages, user flows, email templates
**Total Time:** 6 hours
**Depends On:** Agent 3 (components exist)
**Can Run:** Partially parallel with Agent 3

### Agent 5: Integration & Deployment (DEPLOY_AGENT)
**Specialization:** Build verification, deployment, smoke testing
**Total Time:** 6 hours
**Depends On:** All agents complete
**Runs:** After all features implemented

### Agent 6: Automated Test Suite (TEST_AGENT) ⭐
**Specialization:** Playwright E2E tests, validation tests, regression suite
**Total Time:** 8 hours
**Runs In:** **SEPARATE CLAUDE CODE INSTANCE**
**Deliverable:** Automated test suite to run before Nov 8 launch
**Independent:** Can work in parallel with all other agents

---

## 📅 DAY-BY-DAY SCHEDULE

### **Day 1: October 30 (Tonight) - Data Prep**
**Focus:** Data seeding preparation
**Timeline:** Evening (user availability limited)

**Manual Tasks (User):**
- [ ] Selena provides GLOW spreadsheet
- [ ] Emily merges data

**Agent Tasks:** NONE (waiting on data)

---

### **Day 2: October 31 (Friday) - Foundation**
**Focus:** Database migrations + data seeding
**Parallel Agents:** 1 (DB_AGENT) + 6 (TEST_AGENT starts)

#### DB_AGENT (6 hours):
- [ ] Create all database migrations
- [ ] Run migrations on staging database
- [ ] Seed EMPWR reservation data
- [ ] Seed GLOW reservation data
- [ ] Remove Orlando event
- [ ] Add "Production" classification (both tenants)
- [ ] Add "Production" dance category (both tenants)
- [ ] Populate time limits in entry_size_categories
- [ ] Verify all data seeded correctly

#### TEST_AGENT (starts, separate instance):
- [ ] Set up Playwright test framework
- [ ] Create test data fixtures
- [ ] Begin writing classification validation tests

**Deliverable:** Database ready for backend development

---

### **Day 3: November 1 (Saturday) - Launch Day (Accounts Only) + Backend Start**
**Focus:** Nov 1 launch + backend validation logic
**Parallel Agents:** 2 (BACKEND_AGENT) + 6 (TEST_AGENT continues)

#### BACKEND_AGENT (6 hours today, 6 hours Nov 2):
**Session 1 (Nov 1, 6 hours):**
- [ ] Create age calculation utilities (`src/lib/ageCalculation.ts`)
- [ ] Create classification validation utilities (`src/lib/classificationValidation.ts`)
- [ ] Create entry size detection utilities (`src/lib/entrySizeDetection.ts`)
- [ ] Update `src/server/routers/dancer.ts`:
  - [ ] Add NOT NULL validation for classification_id
  - [ ] Add NOT NULL validation for date_of_birth
  - [ ] Remove gender/email/phone fields
- [ ] Update `src/server/routers/entry.ts` (Part 1):
  - [ ] Add choreographer validation
  - [ ] Add entry size auto-detection logic
  - [ ] Add age calculation logic

#### TEST_AGENT (continues):
- [ ] Classification validation tests complete
- [ ] Age calculation tests complete
- [ ] Entry size detection tests complete

#### LAUNCH TASKS (Manual):
- [ ] Send account claiming emails
- [ ] Monitor onboarding flow
- [ ] Quick fixes for onboarding bugs (if any)

**Deliverable:** Studios can claim accounts and create dancers

---

### **Day 4: November 2 (Sunday) - Backend Completion**
**Focus:** Complete backend validation logic
**Parallel Agents:** 2 (BACKEND_AGENT continues) + 6 (TEST_AGENT continues)

#### BACKEND_AGENT (6 hours):
**Session 2 (Nov 2, 6 hours):**
- [ ] Update `src/server/routers/entry.ts` (Part 2):
  - [ ] Add solo classification lock validation
  - [ ] Add duet/trio classification validation (highest wins)
  - [ ] Add group/line classification validation (60% majority)
  - [ ] Add production auto-lock validation
  - [ ] Add extended time validation
  - [ ] Add scheduling notes field
- [ ] Update CSV import validation:
  - [ ] Add classification required check
  - [ ] Add birthdate required check
  - [ ] Add preview with error highlighting
- [ ] API contract documentation for frontend

#### TEST_AGENT (continues):
- [ ] Extended time validation tests
- [ ] Production logic tests
- [ ] CSV import validation tests

**Deliverable:** All backend validation complete and tested

---

### **Day 5: November 3 (Monday) - Frontend Start**
**Focus:** Frontend components and forms
**Parallel Agents:** 3 (FRONTEND_AGENT) + 4 (UX_AGENT starts) + 6 (TEST_AGENT continues)

#### FRONTEND_AGENT (10 hours split over 2 days - 6h Nov 3, 4h Nov 4):
**Session 1 (Nov 3, 6 hours):**
- [ ] Update `src/components/DancerCreationForm.tsx`:
  - [ ] Remove gender field
  - [ ] Remove email field
  - [ ] Remove phone field
  - [ ] Add classification required validation
  - [ ] Add birthdate required validation
- [ ] Update `src/components/DancerCSVImport.tsx`:
  - [ ] Update template (remove gender/email/phone)
  - [ ] Add validation error display
  - [ ] Add red highlight for missing data
- [ ] Update `src/components/EntryCreationForm.tsx` (Part 1):
  - [ ] Add entry size auto-detection (disabled field)
  - [ ] Add age auto-calculation (disabled field, can bump +1)
  - [ ] Add choreographer required validation

#### UX_AGENT (starts, 3 hours today):
- [ ] Update error messages for clarity
- [ ] Add helper text for all disabled fields
- [ ] Create tooltip components
- [ ] Update form styling for consistency

#### TEST_AGENT (continues):
- [ ] Frontend component integration tests
- [ ] Form validation E2E tests

**Deliverable:** Dancer creation flow complete

---

### **Day 6: November 4 (Tuesday) - Entry Creation Complete**
**Focus:** Complete entry creation form with all business logic
**Parallel Agents:** 3 (FRONTEND_AGENT continues) + 4 (UX_AGENT continues) + 6 (TEST_AGENT continues)

#### FRONTEND_AGENT (4 hours):
**Session 2 (Nov 4, 4 hours):**
- [ ] Update `src/components/EntryCreationForm.tsx` (Part 2):
  - [ ] Add classification selector (smart dropdown based on entry size)
  - [ ] Add extended time checkbox + slider
  - [ ] Add scheduling notes textarea
  - [ ] Add production auto-lock logic
  - [ ] Add time limit display
- [ ] Create `src/components/ExtendedTimeSelector.tsx`:
  - [ ] Checkbox component
  - [ ] Slider from max_time to 10 minutes
  - [ ] Fee calculation display
- [ ] Create `src/components/ClassificationSelector.tsx`:
  - [ ] Smart dropdown (filters based on entry size)
  - [ ] Helper text for suggested classification

#### UX_AGENT (3 hours):
- [ ] Draft November 1 email template (HTML)
- [ ] Create pre-submit warning modal
- [ ] Update success messages
- [ ] Add 24-hour invoice wait message
- [ ] Styling for extended time selector

#### TEST_AGENT (continues):
- [ ] Entry creation flow E2E tests
- [ ] Classification lock tests (solo/duet/group)
- [ ] Extended time tests
- [ ] Production entry tests

**Deliverable:** Entry creation flow complete with all validation

---

### **Day 7: November 5 (Wednesday) - Polish & Display Changes**
**Focus:** Deposit display, UI polish, button states
**Parallel Agents:** 3 (FRONTEND_AGENT wrap-up) + 4 (UX_AGENT) + 6 (TEST_AGENT continues)

#### FRONTEND_AGENT (2 hours wrap-up):
- [ ] Update `src/app/dashboard/entries/page.tsx`:
  - [ ] Remove running price total
  - [ ] Add deposit/credits/discount display
- [ ] Update `src/app/dashboard/page.tsx`:
  - [ ] Add routine creation disabled button
  - [ ] Add tooltip "Opens November 8th"
- [ ] Update `src/components/SummarySubmission.tsx`:
  - [ ] Add pre-submit warning modal
  - [ ] Add post-submit success message

#### UX_AGENT (3 hours final):
- [ ] Fix title duplication bug
- [ ] Add nav back button to entry creation
- [ ] Final styling pass
- [ ] Accessibility check
- [ ] Mobile responsiveness check

#### TEST_AGENT (continues):
- [ ] Deposit display tests
- [ ] Disabled button state tests
- [ ] Summary submission flow tests
- [ ] Regression suite expansion

**Deliverable:** All UI complete and polished

---

### **Day 8: November 6 (Thursday) - Integration & Testing**
**Focus:** Integration testing, bug fixes, UAT prep
**Parallel Agents:** 5 (DEPLOY_AGENT) + 6 (TEST_AGENT finalizes)

#### DEPLOY_AGENT (6 hours):
- [ ] Run full build verification
- [ ] Deploy to staging
- [ ] Run smoke tests on EMPWR tenant:
  - [ ] Create dancer with all validations
  - [ ] Create entry (solo) - verify classification lock
  - [ ] Create entry (duet) - verify highest level
  - [ ] Create entry (group) - verify majority
  - [ ] Create entry (production) - verify auto-lock
  - [ ] Test extended time flow
  - [ ] Test summary submission
  - [ ] Verify deposit display
- [ ] Run smoke tests on GLOW tenant (same tests)
- [ ] Document any bugs found
- [ ] Quick fixes for P0 bugs

#### TEST_AGENT (finalizes, 2 hours):
- [ ] Complete all test suites
- [ ] Generate test coverage report
- [ ] Document test execution instructions
- [ ] Create "Pre-Launch Test Checklist"
- [ ] **DELIVERABLE:** Automated test suite ready to run

**Deliverable:** System tested on both tenants, bugs documented

---

### **Day 9: November 7 (Friday) - UAT & Final Fixes**
**Focus:** User acceptance testing, final polish
**Parallel Agents:** 5 (DEPLOY_AGENT - bug fixes)

#### DEPLOY_AGENT (ongoing):
- [ ] UAT with Emily (EMPWR) - 1 hour
- [ ] UAT with Selena (GLOW) - 1 hour
- [ ] Fix any UAT findings
- [ ] Final deployment to production
- [ ] Verify production deployment
- [ ] Enable routine_creation_enabled flag (Nov 8 morning)

#### TEST_AGENT (separate instance):
- [ ] Run full automated test suite
- [ ] Generate pre-launch test report
- [ ] Confirm all tests passing

**Deliverable:** System ready for Nov 8 launch

---

### **Day 10: November 8 (Saturday) - LAUNCH**
**Focus:** Routine creation goes live
**Timeline:** Morning

#### LAUNCH TASKS:
- [ ] Enable routine creation button (flip feature flag)
- [ ] Send email to studios: "Routine creation now open"
- [ ] Monitor for first entries
- [ ] Run automated test suite in production
- [ ] Quick response team on standby

**SUCCESS CRITERIA:**
- [ ] All P0 features working
- [ ] Classification validation preventing errors
- [ ] Extended time capturing correctly
- [ ] Deposits showing correctly
- [ ] Both tenants working
- [ ] Zero cross-tenant data leaks

---

## 📋 DETAILED TASK BREAKDOWN BY AGENT

### **DB_AGENT Tasks (6 hours total)**

#### Database Migrations (2 hours):
```sql
-- Migration 1: Required fields
ALTER TABLE dancers
ALTER COLUMN classification_id SET NOT NULL,
ALTER COLUMN date_of_birth SET NOT NULL;

-- Migration 2: Field removals
ALTER TABLE dancers
DROP COLUMN gender,
DROP COLUMN email,
DROP COLUMN phone;

-- Migration 3: Entry changes
ALTER TABLE competition_entries
ALTER COLUMN choreographer SET NOT NULL,
ADD COLUMN scheduling_notes TEXT,
ADD COLUMN extended_time_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN routine_length_minutes INTEGER NULL,
ADD COLUMN routine_length_seconds INTEGER NULL;

-- Migration 4: Entry size categories
ALTER TABLE entry_size_categories
ADD COLUMN max_time_minutes INTEGER,
ADD COLUMN max_time_seconds INTEGER DEFAULT 0;

UPDATE entry_size_categories SET min_size = 10 WHERE name = 'Production';

-- Migration 5: Competition settings
ALTER TABLE competition_settings
ADD COLUMN extended_time_fee_solo DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN extended_time_fee_group DECIMAL(10,2) DEFAULT 2.00,
ADD COLUMN routine_creation_enabled BOOLEAN DEFAULT FALSE;
```

#### Data Seeding (3 hours):
- [ ] Seed time limits for all entry sizes
- [ ] Add "Production" classification (EMPWR + GLOW)
- [ ] Add "Production" dance category (EMPWR + GLOW)
- [ ] Seed EMPWR reservations from spreadsheet
- [ ] Seed GLOW reservations from spreadsheet
- [ ] Remove Orlando event

#### Verification (1 hour):
- [ ] Run Supabase advisors (security + performance)
- [ ] Generate TypeScript types
- [ ] Verify all constraints working
- [ ] Test data integrity

---

### **BACKEND_AGENT Tasks (12 hours total)**

#### Utility Functions (3 hours):
**File: `src/lib/ageCalculation.ts`**
```typescript
export function calculateAge(birthdate: Date, asOfDate: Date): number;
export function calculateRoutineAge(dancers: Dancer[], entrySize: string): number;
export function getAllowedAges(calculatedAge: number): number[];
```

**File: `src/lib/classificationValidation.ts`**
```typescript
export function validateSoloClassification(dancer: Dancer, entry: Entry): void;
export function validateDuetTrioClassification(dancers: Dancer[], entry: Entry): void;
export function validateGroupClassification(dancers: Dancer[], entry: Entry): void;
export function calculateMajorityClassification(dancers: Dancer[]): Classification;
```

**File: `src/lib/entrySizeDetection.ts`**
```typescript
export function detectEntrySize(dancerCount: number): string;
export function getEntrySizeRange(dancerCount: number): { min: number; max: number };
```

#### Router Updates (6 hours):
**File: `src/server/routers/dancer.ts`**
- [ ] Add validation for required classification
- [ ] Add validation for required birthdate
- [ ] Remove gender/email/phone from create/update mutations
- [ ] Add check: prevent classification change if entries exist

**File: `src/server/routers/entry.ts`**
- [ ] Add choreographer validation
- [ ] Add entry size auto-detection
- [ ] Add age calculation and validation
- [ ] Add classification validation (all 4 types)
- [ ] Add production auto-lock logic
- [ ] Add extended time validation
- [ ] Add scheduling notes field

#### CSV Import (2 hours):
**File: `src/server/routers/import.ts`**
- [ ] Add classification validation
- [ ] Add birthdate validation
- [ ] Return detailed error messages with row numbers
- [ ] Preview mode with error highlighting

#### API Documentation (1 hour):
- [ ] Document all new endpoints
- [ ] Document validation rules
- [ ] Create API contract for frontend

---

### **FRONTEND_AGENT Tasks (10 hours total)**

#### Dancer Forms (3 hours):
**File: `src/components/DancerCreationForm.tsx`**
- [ ] Remove gender field
- [ ] Remove email field
- [ ] Remove phone field
- [ ] Add classification required indicator (red asterisk)
- [ ] Add birthdate required indicator
- [ ] Update validation messages

**File: `src/components/DancerCSVImport.tsx`**
- [ ] Update CSV template download
- [ ] Add validation preview with red highlights
- [ ] Block import button if errors exist
- [ ] Show error summary

#### Entry Creation Form (5 hours):
**File: `src/components/EntryCreationForm.tsx`**
- [ ] Add entry size auto-detection (disabled field)
- [ ] Add age auto-calculation (dropdown with calc+1 only)
- [ ] Add classification smart selector
- [ ] Add extended time checkbox + slider
- [ ] Add scheduling notes textarea
- [ ] Add production auto-lock logic
- [ ] Add time limit display
- [ ] Add choreographer required validation

**File: `src/components/ExtendedTimeSelector.tsx` (NEW)**
- [ ] Checkbox component
- [ ] Slider from max_time to 10 minutes
- [ ] Real-time fee calculation display
- [ ] Validation for routine length if checked

**File: `src/components/ClassificationSelector.tsx` (NEW)**
- [ ] Smart dropdown (filters options based on rules)
- [ ] Helper text showing suggested classification
- [ ] Disabled for solos
- [ ] Disabled for productions

#### Display Changes (2 hours):
**File: `src/app/dashboard/entries/page.tsx`**
- [ ] Remove running price total
- [ ] Add deposit paid display
- [ ] Add credits owed display
- [ ] Add discount percentage display

**File: `src/app/dashboard/page.tsx`**
- [ ] Add routine creation disabled button
- [ ] Add tooltip "Routine creation opens November 8th"

**File: `src/components/SummarySubmission.tsx`**
- [ ] Add pre-submit warning modal
- [ ] Add post-submit success message with 24h note

---

### **UX_AGENT Tasks (6 hours total)**

#### Error Messages (2 hours):
- [ ] Update all validation error messages for clarity
- [ ] Add helper text for all auto-calculated fields
- [ ] Create tooltip components for explanations
- [ ] Update form field descriptions

#### Email Template (1 hour):
- [ ] Draft November 1 account claiming email (HTML)
- [ ] Include deposit/credits/discount info
- [ ] Test email rendering

#### Modals & Alerts (1 hour):
- [ ] Pre-submit warning modal (scheduling conflicts)
- [ ] Post-submit success alert (24-hour wait)
- [ ] Validation error modals

#### Bug Fixes (1 hour):
- [ ] Fix title duplication bug (investigate and fix)
- [ ] Add nav back button to entry creation

#### Final Polish (1 hour):
- [ ] Styling consistency pass
- [ ] Accessibility check (keyboard navigation, ARIA labels)
- [ ] Mobile responsiveness check
- [ ] Color contrast check

---

### **DEPLOY_AGENT Tasks (6 hours total)**

#### Build & Deploy (2 hours):
- [ ] Run `npm run build` - verify success
- [ ] Run `npm run type-check` - verify success
- [ ] Deploy to staging (Vercel)
- [ ] Verify deployment successful
- [ ] Check build logs for warnings

#### Smoke Testing (3 hours):
**EMPWR Tenant:**
- [ ] Create dancer with all validations
- [ ] Test CSV import (valid + invalid data)
- [ ] Create solo entry - verify classification lock
- [ ] Create duet entry - verify highest level
- [ ] Create group entry - verify majority
- [ ] Create production entry - verify auto-lock
- [ ] Test extended time flow
- [ ] Test scheduling notes
- [ ] Submit summary - verify warning modal
- [ ] Verify deposit display

**GLOW Tenant:**
- [ ] Repeat all above tests

**Cross-Tenant:**
- [ ] Verify zero data leaks
- [ ] Verify correct tenant settings
- [ ] Verify time limits correct

#### UAT Coordination (1 hour):
- [ ] Schedule UAT with Emily
- [ ] Schedule UAT with Selena
- [ ] Document UAT findings
- [ ] Prioritize bug fixes

---

### **TEST_AGENT Tasks (8 hours total, separate instance) ⭐**

#### Test Framework Setup (1 hour):
- [ ] Set up Playwright test framework
- [ ] Configure test database
- [ ] Create test data fixtures
- [ ] Set up test tenant (or use GLOW for testing)

#### Test Suites (6 hours):

**Classification Tests (1.5 hours):**
```typescript
describe('Classification Validation', () => {
  test('Solo classification locked to dancer classification');
  test('Cannot change solo classification');
  test('Duet uses highest dancer level');
  test('Duet allows bump up one level');
  test('Duet blocks selection below highest');
  test('Group calculates 60% majority correctly');
  test('Group allows bump up one level');
  test('Group blocks bump up two levels');
  test('Production auto-locks to Production classification');
});
```

**Age Calculation Tests (1 hour):**
```typescript
describe('Age Calculation', () => {
  test('Solo shows exact age');
  test('Group shows floor(average age)');
  test('Age cutoff is Dec 31 2025');
  test('Can bump age up by 1 year');
  test('Cannot bump age up by 2+ years');
  test('Age display shows number not group name');
});
```

**Entry Size Tests (0.5 hours):**
```typescript
describe('Entry Size Auto-Detection', () => {
  test('1 dancer = Solo');
  test('2 dancers = Duet');
  test('10 dancers = Large Group');
  test('Entry size locked and cannot be changed');
  test('Entry size updates when dancers added/removed');
});
```

**Production Tests (0.5 hours):**
```typescript
describe('Production Logic', () => {
  test('Production locks dance style to Production');
  test('Production locks classification to Production');
  test('Production requires min 10 dancers');
  test('Production with 9 dancers shows error');
});
```

**Extended Time Tests (1 hour):**
```typescript
describe('Extended Time', () => {
  test('Time limit displays correctly for each entry size');
  test('Extended time checkbox shows fee calculation');
  test('Solo extended time = $5 per dancer');
  test('Group extended time = $2 per dancer');
  test('Routine length required if extended time checked');
  test('Slider range is max_time to 10 minutes');
});
```

**Required Fields Tests (0.5 hours):**
```typescript
describe('Required Fields', () => {
  test('Dancer creation requires classification');
  test('Dancer creation requires birthdate');
  test('Entry creation requires choreographer');
  test('CSV import rejects missing classification');
  test('CSV import rejects missing birthdate');
});
```

**Deposit Display Tests (0.5 hours):**
```typescript
describe('Deposit Display', () => {
  test('Deposit paid shows on entries page');
  test('Credits owed shows if > 0');
  test('Discount percentage shows if > 0');
  test('Running total removed from entries page');
});
```

**Summary Submission Tests (0.5 hours):**
```typescript
describe('Summary Submission', () => {
  test('Pre-submit warning modal appears');
  test('Post-submit success message shows 24h wait');
  test('Routine creation button disabled Nov 1-7');
  test('Routine creation button enabled Nov 8');
});
```

#### Test Documentation (1 hour):
- [ ] Create test execution guide
- [ ] Document how to run tests
- [ ] Create pre-launch test checklist
- [ ] Generate test coverage report
- [ ] Create test failure debugging guide

**DELIVERABLE:** Complete automated test suite ready to run before Nov 8 launch

---

## 🔗 DEPENDENCY GRAPH

```
Day 2: DB_AGENT (Foundation)
  ↓
Day 3-4: BACKEND_AGENT (Validation Logic)
  ↓
Day 5-6: FRONTEND_AGENT (UI Components)
  ↓
Day 7: UX_AGENT (Polish)
  ↓
Day 8-9: DEPLOY_AGENT (Testing & Deployment)

PARALLEL (Independent):
Day 2-8: TEST_AGENT (Separate Instance)
```

**Critical Path:** DB → Backend → Frontend → Deploy (8 days minimum)
**With Parallelization:** 8 days actual (agents work simultaneously where possible)

---

## ⚠️ RISK MITIGATION

### High-Risk Items:
1. **Classification weighting formula** - May need iteration
   - Mitigation: Start with simple majority, refine if needed

2. **Extended time slider UX** - May be confusing
   - Mitigation: Add clear labels and real-time fee display

3. **CSV import validation** - Complex error handling
   - Mitigation: Detailed error messages with row numbers

4. **Cross-tenant data leaks** - Critical security risk
   - Mitigation: Extensive testing on both tenants, SQL verification

### Contingency Plans:
- **If behind schedule:** Cut P1 features (title bug, nav button)
- **If UAT finds issues:** Nov 8 launch becomes "soft launch" with monitoring
- **If test suite incomplete:** Manual testing checklist as backup

---

## 📊 PROGRESS TRACKING

### Daily Standups (Async):
Each agent reports:
- [ ] Tasks completed
- [ ] Current blockers
- [ ] ETA for remaining work
- [ ] Help needed

### Build Verification:
After each major agent completion:
- [ ] Run `npm run build`
- [ ] Run `npm run type-check`
- [ ] Commit with 8-line format
- [ ] Deploy to staging

### Testing Milestones:
- [ ] Day 4: Backend unit tests passing
- [ ] Day 6: Frontend component tests passing
- [ ] Day 8: Integration tests passing
- [ ] Day 9: Full regression suite passing

---

## ✅ LAUNCH READINESS CHECKLIST

### Technical:
- [ ] All database migrations applied
- [ ] All P0 features implemented
- [ ] Build passes with no errors
- [ ] Type check passes
- [ ] Automated tests passing
- [ ] Both tenants tested
- [ ] No cross-tenant data leaks
- [ ] Deployment successful

### Business:
- [ ] Deposits displaying correctly
- [ ] Classification validation working
- [ ] Extended time capturing correctly
- [ ] Email template approved
- [ ] UAT sign-off from Emily
- [ ] UAT sign-off from Selena

### Communication:
- [ ] November 1 emails sent
- [ ] November 8 announcement draft ready
- [ ] Support documentation updated
- [ ] Quick response team briefed

---

## 🎯 SUCCESS METRICS

**Nov 8 Launch Success:**
- 0 P0 bugs reported in first 24 hours
- Classification validation prevents all miscategorized entries
- Extended time captured for 100% of requests
- Deposits visible to 100% of studios
- Both tenants functioning identically
- Zero cross-tenant data leaks

**Week 1 Post-Launch:**
- Studios creating entries without CD intervention
- Fewer than 5 support tickets per day
- No manual classification fixes needed
- Automated tests passing daily

---

**NEXT STEPS:**
1. User approves this task division
2. Launch agents in parallel starting Day 2 (Oct 31)
3. TEST_AGENT launches in separate Claude Code instance
4. Daily progress check-ins
5. Nov 8 launch

**Ready to execute DevTeam Protocol? Confirm to begin parallel agent execution.**
