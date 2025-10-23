# Automated Testing Cycle - Resume Instructions

**Status**: ACTIVE
**Started**: 2025-10-23
**Mode**: Continuous test-fix-deploy loop

## How to Resume After Auto-Compact

When the session resumes, execute this protocol:

1. **Read State File**:
   ```
   Read: TESTING_STATE.json
   ```

2. **Check if cycle is active**:
   - If `cycle_active: true` → Continue testing
   - If `cycle_active: false` → User stopped, don't resume

3. **Resume from last checkpoint**:
   - Load `current_test` from state
   - Continue from that test in `test_queue`
   - If `awaiting_deployment: true` → Wait then re-test

4. **Continue Loop**:
   ```
   while (TESTING_STATE.cycle_active) {
     1. Run next test from queue
     2. If bugs found → Fix code
     3. Build and deploy
     4. Wait for deployment (don't poll)
     5. Re-test
     6. Log results to test-errors.md
     7. Update TESTING_STATE.json
   }
   ```

## Test Execution Order

1. **login_and_navigation** - Basic auth and routing
2. **reservations_page_load** - Check /dashboard/reservations loads
3. **reservations_dropdown** - Verify 4 competitions show
4. **reservation_creation** - Full form submission
5. **dancers_page** - /dashboard/dancers functionality
6. **entries_page** - /dashboard/entries functionality
7. **invoices_page** - /dashboard/invoices functionality
8. **cd_dashboard** - Competition Director views

## Bug Fix Protocol

When bug found:

1. **Log Error**:
   ```markdown
   | URL | Error | Design | Status |
   |-----|-------|--------|--------|
   | /route | Description | UX issue | fixing |
   ```

2. **Fix Code**:
   - Identify root cause
   - Apply fix
   - Test locally if possible

3. **Deploy**:
   ```bash
   git add -A
   git commit -m "fix: [description]"
   git push
   ```

4. **Update State**:
   ```json
   {
     "awaiting_deployment": true,
     "deployment_hash": "commit-sha",
     "bugs_fixed": ++
   }
   ```

5. **Wait & Re-test**:
   - Trust deployment (don't poll)
   - Wait 2-3 minutes
   - Re-run failed test
   - Verify fix

## State File Updates

After each action:

```json
{
  "cycle_active": true,
  "current_test": "reservations_dropdown",
  "tests_run": 5,
  "bugs_found": 2,
  "bugs_fixed": 2,
  "last_test_time": "2025-10-23T03:00:00Z",
  "errors_found": [
    {
      "test": "reservations_dropdown",
      "url": "/dashboard/reservations/new",
      "error": "Dropdown empty",
      "status": "fixed",
      "commit": "abc123"
    }
  ]
}
```

## Exit Conditions

Stop testing when:

1. `cycle_active: false` (user stopped)
2. All tests pass (3 consecutive clean runs)
3. Same error 3+ times (blocker)
4. Context < 15% (exit protocol)

## Context Exit Protocol

When context drops below 15%:

1. **Commit current work**:
   ```bash
   git add TESTING_STATE.json test-errors.md
   git commit -m "wip: Testing cycle checkpoint (context limit)"
   git push
   ```

2. **Update state**:
   ```json
   {
     "cycle_active": true,
     "current_test": "next_test_name"
   }
   ```

3. **Exit**: Session ends, will resume on next "continue"

## Production Test Credentials

- **SD User**: danieljohnabrahamson@gmail.com / 123456
- **CD User**: (need credentials)
- **Base URL**: https://www.compsync.net

## Playwright MCP Pattern

```typescript
// Login
await mcp__playwright__browser_navigate({url: 'https://www.compsync.net/login'});
await mcp__playwright__browser_fill_form({
  fields: [
    {name: 'Email', type: 'textbox', ref: 'email-field', value: 'danieljohnabrahamson@gmail.com'},
    {name: 'Password', type: 'textbox', ref: 'password-field', value: '123456'}
  ]
});
await mcp__playwright__browser_click({element: 'Sign In', ref: 'submit-btn'});

// Test page
await mcp__playwright__browser_navigate({url: 'https://www.compsync.net/dashboard/reservations'});
const errors = await mcp__playwright__browser_console_messages({onlyErrors: true});
const snapshot = await mcp__playwright__browser_snapshot();

// Log findings
if (errors.length > 0) {
  // Append to test-errors.md
  // Update TESTING_STATE.json
  // Fix bug
}
```

## Success Criteria

Cycle completes when:
- ✅ All routes load without errors
- ✅ All dropdowns populate correctly
- ✅ Forms submit successfully
- ✅ Business logic enforced
- ✅ No console errors
- ✅ No 500 network errors

---

**To Stop Cycle**: Set `cycle_active: false` in TESTING_STATE.json
**To Resume**: Say "continue" and I'll read TESTING_STATE.json and resume
