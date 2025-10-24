# Agent Coordination Strategy
**Created:** 2025-10-24 02:55 UTC
**Session:** Post-Session 5, preparing parallel work

---

## 🎯 Work Split Overview

### Main Agent (Development Focus)
**Role:** Code changes, bug fixes, infrastructure
**Time:** 2.5-4 hours
**Files to Modify:** 5-10 code files
**Commits Expected:** 3-5

**Key Responsibilities:**
1. Create test data infrastructure
2. Fix invoice 400 error
3. Configure email notifications
4. Run security advisors
5. Respond to bug reports from parallel agent

### Parallel Agent (Testing Focus)
**Role:** Production verification, documentation, bug reporting
**Time:** 2.5-4 hours
**Files to Modify:** Documentation only
**Commits Expected:** 0 (no code changes)

**Key Responsibilities:**
1. Verify all 19 fixes in production
2. Test forgot password flow
3. Test CSV exports
4. Regression testing
5. Create comprehensive test report

---

## 📋 Task Dependencies

```
Main Agent Task 1 (Test Data)
    ↓
Parallel Agent Task 4 (Auto-Close Test)

Main Agent Task 2 (Invoice Fix)
    ↓
Parallel Agent Task 5 (Invoice Detail Test)

Main Agent Task 3 (Email Config)
    ↓
Parallel Agent Task 6 (Email Verification)

[INDEPENDENT - Can Run Anytime]
Parallel Agent Task 2 (Forgot Password)
Parallel Agent Task 3 (CSV Export)
Parallel Agent Task 7 (Regression)
```

---

## 🔄 Synchronization Protocol

### Communication Files

**Main Agent → Parallel Agent:**
- `UNBLOCKED.md` - List tasks now ready to test
- `TEST_DATA_READY.md` - IDs and credentials for test scenarios
- `DEPLOYMENT_NOTES.md` - What changed in latest deploy

**Parallel Agent → Main Agent:**
- `BUG_REPORTS.md` - Issues found during testing
- `TEST_PROGRESS.md` - Current status of testing
- `PARALLEL_TEST_RESULTS_FINAL.md` - Final comprehensive report

### Status Updates

**Every 30 minutes, both agents update:**

**Main Agent updates `MAIN_AGENT_STATUS.md`:**
```markdown
**Time:** [HH:MM]
**Current Task:** [Task name]
**Progress:** [%]
**Blockers:** [List any issues]
**Next Unblock:** [ETA for parallel agent]
```

**Parallel Agent updates `PARALLEL_AGENT_STATUS.md`:**
```markdown
**Time:** [HH:MM]
**Tests Completed:** [count]
**Tests Blocked:** [count]
**Bugs Found:** [count]
**Waiting For:** [What's blocking]
```

---

## 🚫 Strict Boundaries

### Main Agent MUST NOT:
- ❌ Run Playwright tests (that's parallel agent's job)
- ❌ Create test reports (parallel agent documents)
- ❌ Verify fixes manually (parallel agent verifies)

### Parallel Agent MUST NOT:
- ❌ Modify application code
- ❌ Run builds or deployments
- ❌ Apply migrations
- ❌ Install packages
- ❌ Commit/push code changes
- ❌ Fix bugs (only report them)

---

## 📊 Success Metrics

### Combined Success Criteria:

**By End of Session:**
- [ ] All 19 fixes verified in production
- [ ] Test data infrastructure created
- [ ] Invoice 400 error resolved
- [ ] Email system configured and tested
- [ ] Comprehensive test report delivered
- [ ] 0 critical bugs remaining
- [ ] Production ready for full deployment

---

## 🎬 Kickoff Sequence

### Step 1: Main Agent Starts (Now)
1. Create `test-evidence/` directory
2. Start Priority 1: Test data seed script
3. Update `MAIN_AGENT_STATUS.md` every 30 min

### Step 2: Parallel Agent Starts (When Prompted)
1. Read all context files
2. Start Task 2 (Forgot Password) - not blocked
3. Start Task 3 (CSV Export) - not blocked
4. Wait for unblock signals from main agent

### Step 3: First Checkpoint (30 min)
- Main agent: Test data created?
- Parallel agent: How many tests completed?
- Adjust priorities based on progress

### Step 4: Mid-Session (90 min)
- Main agent: Invoice fix deployed?
- Parallel agent: Any critical bugs found?
- Re-sync on priorities

### Step 5: Final Review (180 min)
- Parallel agent: Deliver final test report
- Main agent: Address any critical bugs found
- Both: Create final production readiness assessment

---

## 🚨 Emergency Protocols

### If Parallel Agent Finds Critical Bug:

**Parallel Agent Actions:**
1. Stop current task
2. Document bug thoroughly
3. Create entry in `BUG_REPORTS.md`
4. Ping main agent (via status file)
5. Continue with other non-blocked tests

**Main Agent Actions:**
1. Read bug report
2. Assess severity
3. If CRITICAL: Stop current task, fix bug first
4. If HIGH: Finish current task, then fix
5. If MEDIUM/LOW: Add to backlog
6. Update `MAIN_AGENT_STATUS.md` with ETA

### If Main Agent Gets Blocked:

**Main Agent Actions:**
1. Document blocker in `BLOCKER.md`
2. Estimate unblock time
3. Update `MAIN_AGENT_STATUS.md`
4. Work on other unblocked tasks

**Parallel Agent Actions:**
1. Check `BLOCKER.md`
2. Focus on independent tests
3. Document what's blocked
4. Continue where possible

---

## 📁 File Organization

### Evidence Directory Structure:
```
test-evidence/
├── task_2_forgot_password/
│   ├── login_page.png
│   ├── reset_page.png
│   └── success_message.png
├── task_3_csv_export/
│   ├── dancers_export.png
│   └── routines_export.png
├── task_4_auto_close/
│   ├── before_submit.png
│   ├── after_submit.png
│   └── db_verification.png
└── ...
```

### Status Files Location:
```
CompPortal/
├── MAIN_AGENT_STATUS.md
├── PARALLEL_AGENT_STATUS.md
├── BUG_REPORTS.md
├── UNBLOCKED.md
├── TEST_DATA_READY.md
└── PARALLEL_TEST_RESULTS_FINAL.md
```

---

## 🎓 Quick Reference

### Main Agent Quick Commands:
```bash
# Create test data
npm run seed:test

# Run build
npm run build

# Apply migration
supabase migration apply

# Check advisors
supabase get_advisors --type=security
```

### Parallel Agent Quick Commands:
```javascript
// Navigate
await mcp__playwright__browser_navigate({ url: "..." });

// Take screenshot
await mcp__playwright__browser_take_screenshot({ filename: "..." });

// Query database
await mcp__supabase__execute_sql({ query: "..." });

// Click button
await mcp__playwright__browser_click({ element: "...", ref: "..." });
```

---

## ✅ Pre-Flight Checklist

**Before Starting Parallel Work:**

Main Agent:
- [ ] Read TASK_SPLIT.md
- [ ] Create test-evidence/ directory
- [ ] Initialize status file
- [ ] Understand priorities 1-4

Parallel Agent:
- [ ] Read PARALLEL_AGENT_PROMPT.md
- [ ] Read PARALLEL_TASK_RESULTS.md (previous work)
- [ ] Understand strict rules (no code changes)
- [ ] Know which tasks not blocked
- [ ] Ready with Playwright + Supabase MCP

---

**READY TO BEGIN PARALLEL WORK!**

Main agent starts immediately with test data creation.
Parallel agent awaits user command to launch with prompt.
