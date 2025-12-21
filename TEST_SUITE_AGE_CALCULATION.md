# Age Calculation Bug Fix - Test Suite

**Date:** 2025-01-13
**Purpose:** Verify recent age calculation timezone bug fixes across all user workflows
**Tester:** Claude Code (automated via Playwright MCP)
**Test Account:** DJAmusic (SD), EMPWR CD

---

## Test Scope

### Bugs Being Verified:
1. **Timezone bug:** Dancers' ages showing 1 year older than actual
2. **Date display bug:** Birthdates displaying one day earlier (e.g., Jan 6 → Jan 5)
3. **Entry form age calculation:** Wrong ages in dancer selection dropdown
4. **Group routine age calculation:** Incorrect routine age for multi-dancer entries

### Critical Fix Commits:
- `dd01fd7` - Age calculation UTC fixes (3 files)
- `eb2a35e` - Dancer birthdate timezone fix (frontend display)

---

## Test Plan

### Phase 1: Setup & Reservation Creation
- [ ] Login as DJAmusic (SD)
- [ ] Identify EMPWR competition with available capacity
- [ ] Create approved reservation via Supabase MCP (if needed)
- [ ] Note competition start date for age verification

### Phase 2: Manual Dancer Creation (5 dancers)
Age cutoff coverage (assuming competition in April 2026):
- [ ] Dancer 1: DOB Jan 6, 2016 → Age 10 (Mini)
- [ ] Dancer 2: DOB June 15, 2013 → Age 12 (Junior)
- [ ] Dancer 3: DOB Dec 31, 2010 → Age 15 (Teen)
- [ ] Dancer 4: DOB Jan 1, 2009 → Age 17 (Senior)
- [ ] Dancer 5: DOB Aug 20, 2018 → Age 7 (Petite)

**Verification Points:**
- Screenshot each dancer form showing correct age
- Screenshot `/dancers` dashboard after each creation
- Verify ages display correctly in list view

### Phase 3: Bulk Create (5 dancers)
- [ ] Create batch form with 5 dancers (varied DOBs)
- [ ] Screenshot bulk create form
- [ ] Verify ages calculated correctly before save
- [ ] Screenshot `/dancers` dashboard after save

### Phase 4: CSV Import (5 dancers)
- [ ] Generate CSV with 5 dancers (varied DOBs)
- [ ] Upload CSV and begin step-through import
- [ ] Screenshot import preview for each dancer
- [ ] Verify ages shown correctly in preview
- [ ] Complete import
- [ ] Screenshot `/dancers` dashboard final state

### Phase 5: Entry Creation (10+ routines, MANUAL)
- [ ] Solo 1: Dancer from Phase 2 (verify age in dropdown)
- [ ] Solo 2: Dancer from Phase 3 (verify age in dropdown)
- [ ] Solo 3: Dancer from Phase 4 (verify age in dropdown)
- [ ] Duet 1: 2 dancers same age (verify routine age)
- [ ] Duet 2: 2 dancers different ages (verify routine age = youngest)
- [ ] Small Group 1: 3+ dancers varied ages (CRITICAL: verify routine age)
- [ ] Small Group 2: 3+ dancers same age
- [ ] Solo 4, 5, 6: Fill to 10+ total routines

**Verification Points:**
- Screenshot entry form showing dancer list with ages
- Screenshot each created entry showing routine age
- Verify routine age = youngest dancer age (for groups)

### Phase 6: Summary Submission
- [ ] Navigate to reservation summary page
- [ ] Screenshot summary showing all entries
- [ ] Submit summary
- [ ] Screenshot confirmation

### Phase 7: Invoice Generation (CD Account)
- [ ] Logout SD account
- [ ] Login as EMPWR CD (empwrdance@gmail.com)
- [ ] Navigate to `/dashboard/reservation-pipeline`
- [ ] Locate DJAmusic test reservation
- [ ] Screenshot pipeline showing reservation
- [ ] Click "Create Invoice"
- [ ] Screenshot invoice preview
- [ ] Click "Send Invoice"
- [ ] Screenshot send confirmation

---

## Expected Results

### Age Calculations (for April 2026 competition):
- 2016 birth → 10 years old (NOT 11)
- 2013 birth → 12-13 years old
- 2010 birth → 15-16 years old
- 2009 birth → 17 years old
- 2018 birth → 7-8 years old

### Date Display:
- Jan 6, 2016 → Displays as "Jan 6, 2016" (NOT "Jan 5, 2016")
- All dates display as entered (no day shift)

### Routine Age:
- Solo: Dancer's age
- Group: Youngest dancer's age in group

---

## Evidence Collection

**Screenshot naming:** `test-suite-[phase]-[step]-[timestamp].png`
**Storage:** `.playwright-mcp/test-suite-20250113/`

---

## Error Protocol

**If any step fails:**
1. Capture screenshot of error state
2. Note failure in results
3. Email user immediately with error details
4. STOP testing to avoid corrupting data

**On completion:**
1. Compile all screenshots
2. Generate results summary
3. Email user with pass/fail report

---

## Test Data Cleanup

**DO NOT DELETE:**
- Test dancers (keep for future reference)
- Test routines (audit trail)
- Test reservation/invoice (billing record)

**Mark clearly:**
- All test data labeled "TEST - [name]"
- Easy to identify vs. real studio data

---

## Execution Status

- [ ] Test plan reviewed and approved
- [ ] Ready to execute
- [ ] Execution in progress
- [ ] Results compiled
- [ ] User notified

---

**Notes:**
- Test focuses on UI display verification (not database values)
- All actions performed via Playwright MCP (real user simulation)
- No direct database manipulation except reservation creation
- Full evidence trail for audit purposes
