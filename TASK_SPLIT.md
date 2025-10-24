# Task Split: Main Agent vs Parallel Agent
**Created:** 2025-10-24 02:50 UTC
**Context:** Post-Session 5, 19 fixes deployed

---

## 🎯 Main Agent (Me) - Development Tasks

### Priority 1: Create Test Data Infrastructure (CRITICAL)
**Rationale:** Blocking all testing efforts

**Tasks:**
1. **Create seed script for test data**
   - File: `scripts/seed-test-data.ts`
   - Generate: Studio with approved reservation + confirmed routines
   - Enable: Repeatable testing scenarios

2. **Manual test data creation guide**
   - Document step-by-step workflow
   - SD creates reservation → CD approves → SD creates routines → SD submits summary

3. **Database helper queries**
   - Quick lookup queries for test verification
   - Studio ID, Competition ID, Reservation status checks

**Deliverables:**
- ✅ Test data seed script ready
- ✅ At least 1 studio with confirmed routines in production
- ✅ Documentation for QA team

**Time Estimate:** 60-90 minutes

---

### Priority 2: Investigate & Fix Invoice 400 Error (CRITICAL)
**Rationale:** Blocks invoice viewing in production

**Tasks:**
1. **Create valid test scenario**
   - Use seed data from Priority 1
   - Studio with approved reservation + confirmed routines

2. **Test invoice detail page**
   - Navigate to `/dashboard/invoices/[studioId]/[competitionId]`
   - Capture tRPC error from browser console

3. **Fix root cause**
   - RLS policy issue
   - Missing data validation
   - Query parameter mismatch

4. **Verify fix**
   - Invoice detail page loads successfully
   - Shows correct routines (confirmed only)
   - Locked invoices display correctly

**Deliverables:**
- ✅ Root cause identified and fixed
- ✅ Invoice detail pages working
- ✅ Build passing

**Time Estimate:** 45-60 minutes

---

### Priority 3: Email System Configuration (HIGH)
**Rationale:** Enables notification testing by parallel agent

**Tasks:**
1. **Verify Resend API key configured**
   - Check Vercel environment variables
   - Test with simple email send

2. **Add email notification calls**
   - Reservation submitted → email CD
   - Reservation approved → email SD
   - Summary submitted → email CD
   - Invoice sent → email SD

3. **Test email logging**
   - Verify email_logs table populates
   - Check success/failure tracking

**Deliverables:**
- ✅ All 4 email types sending
- ✅ Email logs table tracking correctly
- ✅ Parallel agent can verify delivery

**Time Estimate:** 30-45 minutes

---

### Priority 4: Code Quality & Documentation (MEDIUM)
**Tasks:**
1. Run `supabase:get_advisors` for security/performance
2. Update inline documentation
3. Clean up TODOs in code

**Time Estimate:** 15-30 minutes

---

## 🤖 Parallel Agent - Testing & Verification Tasks

### Priority 1: Production Testing Suite (IMMEDIATE)
**Rationale:** Verify all 19 fixes working in production

**Tasks:**
1. **Test Auto-Close Reservation** (when test data ready)
   - SD submits < approved spaces
   - Verify token refund
   - Confirm reservation closed

2. **Test Invoice Locking** (already partially verified)
   - PAID invoices locked ✅ (completed)
   - Test UI blocks edits
   - Verify new PAID invoices auto-lock

3. **Test Forgot Password Flow**
   - Click link on login page
   - Submit email
   - Verify no errors

4. **Test CSV Import/Export**
   - Upload routine CSV
   - Export dancers CSV
   - Export routines CSV

**Deliverables:**
- ✅ Screenshot evidence for each test
- ✅ Updated test report with results
- ✅ Bug reports for any failures

**Tools:** Playwright MCP + Supabase MCP
**Time Estimate:** 60-90 minutes

---

### Priority 2: Email Notification Verification (when configured)
**Rationale:** Validate Resend integration working

**Tasks:**
1. **Trigger each email type**
   - Submit reservation as SD
   - Approve reservation as CD
   - Submit summary as SD
   - Send invoice as CD

2. **Verify delivery**
   - Check email_logs table after each action
   - Verify success = true
   - Check recipient_email correct

3. **Test error handling**
   - Invalid email address
   - Missing template type
   - API failure scenario

**Deliverables:**
- ✅ Email logs verification screenshots
- ✅ Confirmation all 4 email types work
- ✅ Error handling documented

**Tools:** Playwright MCP + Supabase MCP
**Time Estimate:** 30-45 minutes

---

### Priority 3: Regression Testing (MEDIUM)
**Rationale:** Ensure previous fixes still working

**Tasks:**
1. **Test Session 1 fixes**
   - Deny reservation button
   - Event capacity card
   - CSV upload (10MB limit)

2. **Test Session 2-3 fixes**
   - Invoice confirmed routines only
   - Auto-close logic (when data ready)

3. **UI/UX verification**
   - Manual payment banner visible
   - Navigation working
   - No console errors

**Deliverables:**
- ✅ Regression test results
- ✅ Confirmation no features broke
- ✅ UI screenshots

**Tools:** Playwright MCP
**Time Estimate:** 45-60 minutes

---

### Priority 4: Documentation & Reporting (LOW)
**Tasks:**
1. Update `TEST_EXECUTION_REPORT_2025-10-24.md` with re-test results
2. Create final recommendation for production readiness
3. Document any blockers or issues found

**Deliverables:**
- ✅ Comprehensive test report
- ✅ Production readiness assessment

**Time Estimate:** 15-30 minutes

---

## 📊 Work Distribution Summary

### Main Agent (Development-Heavy):
- ⏱️ Total Time: 2.5-4 hours
- 🔧 Focus: Code changes, data creation, bug fixes
- 🎯 Goal: Unblock testing, fix critical bugs
- 📁 Files Modified: ~5-10 files
- 🚀 Commits: 3-5 commits

### Parallel Agent (Testing-Heavy):
- ⏱️ Total Time: 2.5-4 hours
- 🧪 Focus: Production testing, verification, documentation
- 🎯 Goal: Validate all fixes, report issues
- 📸 Evidence: 20+ screenshots
- 📝 Reports: 2-3 documentation files

---

## 🔄 Synchronization Points

### Checkpoint 1: Test Data Ready (30 minutes)
- Main agent creates seed data
- Parallel agent starts auto-close testing

### Checkpoint 2: Email Configured (90 minutes)
- Main agent enables email notifications
- Parallel agent starts email testing

### Checkpoint 3: Invoice Fix Deployed (120 minutes)
- Main agent fixes invoice 400 error
- Parallel agent verifies invoice pages working

### Checkpoint 4: Final Review (180 minutes)
- Both agents review results
- Parallel agent creates final report
- Main agent addresses any critical issues found

---

## ✅ Success Criteria

### Main Agent:
- [ ] Test data seed script working
- [ ] Invoice 400 error resolved
- [ ] All 4 email types sending
- [ ] Build passing
- [ ] Security advisors pass

### Parallel Agent:
- [ ] All 19 fixes verified in production
- [ ] Auto-close reservation tested
- [ ] Email notifications verified
- [ ] Regression tests pass
- [ ] Final report created

---

## 🚨 Escalation Protocol

**If Main Agent Blocked:**
- Document blocker in `BLOCKER.md`
- Notify parallel agent to focus on testable features
- Provide ETA for unblock

**If Parallel Agent Finds Critical Bug:**
- Create detailed bug report with screenshots
- Notify main agent immediately
- Continue testing non-blocked features

**If Both Blocked:**
- Document all issues
- Create prioritized fix list
- Wait for user intervention

---

**Next Step:** Main agent starts with Priority 1 (test data creation), parallel agent waits for test data then begins testing suite.
