# Automated Test-Fix-Deploy Cycle

## Overview
This document describes the automated overnight testing cycle for production.

## Test Flow

### Phase 1: Login and Setup
1. Navigate to https://www.compsync.net/login
2. Login as danieljohnabrahamson@gmail.com / 123456
3. Verify successful login (dashboard visible)

### Phase 2: Test All SD Routes
For each route, capture:
- Console errors (network, runtime, type errors)
- Network failures (500, 404, etc.)
- Missing critical UI elements
- Screenshot if errors found

**Routes to test:**
- `/dashboard` - Overview
- `/dashboard/entries` - Entry list
- `/dashboard/entries/create` - Entry form
- `/dashboard/dancers` - Dancer management
- `/dashboard/reservations` - Reservations
- `/dashboard/invoices` - Invoices
- `/dashboard/music` - Music library
- `/dashboard/settings` - Settings

### Phase 3: Categorize Issues
- **CRITICAL**: 500 errors, workflow blockers, missing data
- **WARNING**: Console errors, UI issues, minor bugs
- **PASSED**: No issues detected

### Phase 4: Auto-Fix
For each critical issue:
1. Analyze error pattern
2. Generate fix
3. Apply fix to codebase
4. Run `npm run build`
5. If build passes: commit + push
6. Wait for Vercel deployment
7. Re-test fixed route

### Phase 5: Report
Generate summary:
- Total issues found
- Issues fixed
- Issues remaining
- Next recommended actions

## Implementation Using MCP Tools

```typescript
// 1. Login
await mcp__playwright__browser_navigate({ url: 'https://www.compsync.net/login' });
await mcp__playwright__browser_snapshot(); // Check page loaded
await mcp__playwright__browser_fill_form({
  fields: [
    { name: 'email', type: 'textbox', ref: '[email]', value: 'danieljohnabrahamson@gmail.com' },
    { name: 'password', type: 'textbox', ref: '[password]', value: '123456' }
  ]
});
await mcp__playwright__browser_click({ element: 'Sign In', ref: '[submit]' });

// 2. Test each route
const routes = ['/dashboard', '/dashboard/entries', ...];
for (const route of routes) {
  await mcp__playwright__browser_navigate({ url: `https://www.compsync.net${route}` });
  const consoleErrors = await mcp__playwright__browser_console_messages({ onlyErrors: true });
  const snapshot = await mcp__playwright__browser_snapshot();

  if (consoleErrors.length > 0) {
    await mcp__playwright__browser_take_screenshot({
      filename: `error-${route.replace(/\//g, '-')}.png`
    });
    // Log error for fixing
  }
}

// 3. Analyze and fix
// Parse console errors, identify patterns, apply fixes

// 4. Redeploy and retest
```

## Error Patterns to Auto-Fix

### Pattern 1: null/undefined errors
```
Error: Cannot read property 'X' of null
Fix: Add optional chaining or null guard
```

### Pattern 2: 500 errors on tRPC endpoints
```
Error: GET /api/trpc/X.Y 500
Fix: Check WHERE clauses, tenant context, Prisma queries
```

### Pattern 3: Missing UI elements
```
Error: Expected element 'X' not found
Fix: Check conditional rendering, data loading states
```

### Pattern 4: Type errors
```
Error: Type 'X' is not assignable to type 'Y'
Fix: Update type definitions or add type guards
```

## Exit Conditions

Stop the cycle when:
1. Context usage reaches 15%
2. All tests pass (0 critical issues)
3. Same error appears 3+ times (blocker)
4. User sends STOP command

## Resume Protocol

After context exit:
1. Update PROJECT_STATUS.md with:
   - Tests run count
   - Issues fixed count
   - Current phase
   - Next test to run
2. Commit progress
3. User says "continue" to resume
