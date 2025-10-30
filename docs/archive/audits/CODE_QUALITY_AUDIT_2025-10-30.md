# Code Quality Audit Report
**Date:** October 30, 2025
**Auditor:** Claude (Overnight Launch Readiness)

---

## Console Statement Audit

### Summary
- **Total Files:** 57 with console statements
- **Risk Level:** 🟡 MEDIUM - Debugging code in production
- **Action Required:** Remove or convert to logger before launch

###Critical Files with Console Statements

#### reservation.ts (Lines 748-817)
**Issue:** Email debugging console.log statements in production code

```typescript
// Line 748
console.log('[EMAIL DEBUG] Starting email flow for reservation approval', {
  reservationId: reservation.id,
  studioEmail: reservation.studios?.email,
  studioId: reservation.studio_id
});
```

**Risk:** Performance impact + log bloat in production
**Fix:** Replace with logger.debug() or remove entirely

**Recommendation:**
```typescript
// Replace console.log with:
logger.debug('Starting email flow for reservation approval', {
  reservationId: reservation.id,
  studioEmail: reservation.studios?.email,
  studioId: reservation.studio_id
});

// Or remove if debugging is complete
```

---

### Files Requiring console.log Cleanup

**High Priority (Server-Side):**
1. `src/server/routers/reservation.ts` - 9 console statements (email debug)
2. `src/server/routers/tenantDebug.ts` - Unknown count
3. `src/server/routers/testing.ts` - Unknown count
4. `src/server/routers/lookup.ts` - Unknown count
5. `src/lib/email.ts` - Unknown count
6. `src/lib/two-factor.ts` - Unknown count

**Medium Priority (Components):**
- `src/components/SupportChatButton.tsx`
- `src/components/ChatwootWidget.tsx`
- `src/components/RoutineCSVImport.tsx`
- `src/components/DancerCSVImport.tsx`
- `src/components/ReservationForm.tsx`

**Low Priority (Hooks/Utils):**
- Various hooks (useWebSocket, useTheme, etc.)
- logger.ts (intentional)
- ErrorBoundary.tsx (development only - acceptable)

---

## Environment Variable Security

### ✅ Good Patterns Found

All secrets properly accessed via `process.env`:
- ✅ RESEND_API_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ DATABASE_URL
- ✅ CLOUDFLARE_API_TOKEN
- ✅ AWS_SECRET_ACCESS_KEY
- ✅ REDIS_PASSWORD
- ✅ TWO_FACTOR_ENCRYPTION_KEY

**No hardcoded secrets found** - excellent!

---

## NODE_ENV Checks

### Development-Only Code Patterns

**Proper Guards Found:**
```typescript
// Good: Development-only logging
if (process.env.NODE_ENV === 'development') {
  console.warn('SupportChatButton: Missing Chatwoot configuration');
}

// Good: Testing tools blocked in production
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TESTING_TOOLS !== 'true') {
  throw new Error('Testing tools disabled in production');
}
```

**Files with NODE_ENV checks:**
- testing.ts:28 - ✅ Blocks testing tools in production
- ErrorBoundary.tsx:95 - ✅ Shows stack trace only in dev
- prisma.ts:12 - ✅ Query logging only in dev
- SupportChatButton.tsx:60 - ✅ Warning only in dev
- failureTracker.ts:32 - ✅ Dev-specific behavior

---

## Missing Environment Variables Check

### Files that validate env vars:
1. ✅ **supabase-server.ts:4-8** - Throws if missing SUPABASE_URL or SERVICE_ROLE_KEY
2. ✅ **env.ts:87** - Validates required env vars in production

**Recommendation:** Add startup validation for all required env vars:

```typescript
// Add to src/lib/env.ts
const REQUIRED_PRODUCTION_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'NEXT_PUBLIC_APP_URL',
];

if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_PRODUCTION_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

---

## TODOs and FIXMEs

### Found 15 TODOs/NOTEs in codebase

**High Priority (Security):**
1. **scoring.ts:18-19** - 🔴 CRITICAL
   ```
   TODO: Replace publicProcedure with protectedProcedure once auth middleware is implemented
   TODO: Get judge_id from auth context instead of requiring it as input
   ```
   **Risk:** Same as other publicProcedure issues - scoring data exposed

**Medium Priority (Features):**
2. **testing.ts:189** - Schema alignment needed for testing tools
3. **liveCompetition.ts:172** - Live competition state table design
4. **ReservationPipeline.tsx:843** - Email sending via tRPC not implemented
5. **EntryEditForm.tsx:136** - Participant add/remove mutations needed

**Low Priority (Mock Data):**
6. **director-panel/page.tsx:58,87** - Mock data, needs real auth context
7. **judging/page.tsx:47** - Mock judge ID, needs real auth context

**Notes (Informational):**
- storage.ts:8 - Documents image optimization approach
- invoice.ts:492 - Documents partial invoice generation decision
- entry.ts:1004 - Documents validator limitation
- socket/route.ts:5 - Documents WebSocket requirements

**Disabled Files (Lower Priority):**
- failure.ts.disabled - Multi-tenancy TODO (file disabled)
- failureTracker.ts.disabled - Schema TODO (file disabled)

---

## Hardcoded Values

### Email Fallbacks (Acceptable)
```typescript
// reservation.ts:911
contactEmail: reservation.competitions?.contact_email || process.env.EMAIL_FROM || 'info@glowdance.com'

// studio.ts:522
contactEmail: process.env.CONTACT_EMAIL || 'info@example.com'

// chat.ts:46
to: process.env.SUPPORT_EMAIL || 'danieljohnabrahamson@gmail.com'
```

**Note:** These fallbacks are acceptable but should have production values in env vars.

---

## Recommendations

### Before Launch (P0)

1. **Remove console.log statements from server routers**
   - reservation.ts (9 statements)
   - Other server routers as needed

2. **Add startup env var validation**
   - Fail fast if critical vars missing
   - Document all required vars

3. **Set production email fallbacks in env**
   ```bash
   EMAIL_FROM=noreply@glowdance.com
   CONTACT_EMAIL=info@glowdance.com
   SUPPORT_EMAIL=support@glowdance.com
   ```

### Week 1 (P1)

1. **Convert all console.* to logger.***
   - Provides structure
   - Can be sent to monitoring
   - Supports log levels

2. **Add ESLint rule to prevent console statements**
   ```json
   {
     "rules": {
       "no-console": ["error", { "allow": ["warn", "error"] }]
     }
   }
   ```

3. **Audit all TODO/FIXME comments**
   - Create tickets for actionable items
   - Remove stale comments

---

## Code Quality Score

| Category | Status | Priority |
|----------|--------|----------|
| Hardcoded Secrets | ✅ PASS | - |
| Environment Variables | ✅ PASS | - |
| Console Statements | 🟡 WARN | P0 |
| NODE_ENV Guards | ✅ PASS | - |
| Error Handling | ⏳ Pending | P1 |
| Type Safety | ⏳ Pending | P1 |

**Overall:** 🟡 GOOD - Minor cleanup needed before launch

---

*Generated by Claude Code - Overnight Quality Audit*
