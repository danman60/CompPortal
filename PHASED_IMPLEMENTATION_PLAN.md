# CompPortal Production Readiness - Phased Implementation Plan

**Created:** October 20, 2025 12:44 PM EST
**Strategy:** High impact, low risk first → Multi-tenant LAST
**Supervision Required:** Phases 1-3 can run autonomously, Phases 4-5 need oversight

---

## Phase Overview

| Phase | Focus | Risk | Impact | Duration | Can Run Unsupervised? |
|-------|-------|------|--------|----------|----------------------|
| **Phase 1** | Monitoring & Visibility | 🟢 LOW | 🔥 CRITICAL | 8 hours | ✅ YES |
| **Phase 2** | Security Hardening | 🟡 MEDIUM | 🔥 CRITICAL | 12 hours | ✅ YES (with testing) |
| **Phase 3** | Operational Resilience | 🟢 LOW | 🔥 HIGH | 16 hours | ✅ YES |
| **Phase 4** | Compliance & Legal Prep | 🟢 LOW | 🟡 MEDIUM | 24 hours | ⚠️ PARTIAL |
| **Phase 5** | Multi-Tenant Architecture | 🔴 HIGH | 🔥 CRITICAL | 56 hours | ❌ NO |

**Total Duration:** 116 hours (14.5 days) before multi-tenant

---

## Phase 1: Monitoring & Visibility 👁️
**Duration:** 8 hours
**Risk:** 🟢 LOW (read-only additions, no logic changes)
**Impact:** 🔥 CRITICAL (makes everything else safer)
**Supervision:** ✅ Can run unsupervised for 24 hours

### Why First?
- Adds safety net for all subsequent work
- If Phases 2-4 break something, we'll know immediately
- Zero risk of breaking existing functionality
- Enables fast detection of issues

### Tasks

#### 1.1 Add Sentry Error Tracking (4 hours)
**Priority:** CRITICAL
**Risk:** 🟢 NONE (client-side only initially)

**Checklist:**
- [ ] Install Sentry SDK: `npm install @sentry/nextjs`
- [ ] Run setup wizard: `npx @sentry/wizard@latest -i nextjs`
- [ ] Configure `sentry.client.config.ts`:
  - Filter sensitive data (cookies, headers)
  - Set environment tags (production/staging)
  - Configure sample rate (10% transactions)
- [ ] Configure `sentry.server.config.ts`:
  - Same as client
  - Add request ID correlation
- [ ] Add environment variables to Vercel:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN` (for source maps)
- [ ] Test error capture:
  - Trigger test error in dev
  - Verify error appears in Sentry dashboard
  - Test source map resolution
- [ ] Deploy and verify production errors captured
- [ ] Document in `docs/operations/ERROR_TRACKING.md`

**Files Created/Modified:**
- `sentry.client.config.ts` (new)
- `sentry.server.config.ts` (new)
- `next.config.js` (modified - Sentry webpack plugin)
- `docs/operations/ERROR_TRACKING.md` (new)

**Verification:**
```bash
# Should see Sentry in next.config.js
npm run build

# Should upload source maps
# Should show Sentry initialization in logs
```

**Rollback:** Remove Sentry imports, redeploy (5 minutes)

---

#### 1.2 Configure UptimeRobot External Monitoring (1 hour)
**Priority:** CRITICAL
**Risk:** 🟢 NONE (external service, no code changes)

**Checklist:**
- [ ] Sign up for UptimeRobot (free tier: 50 monitors)
- [ ] Create HTTP monitor:
  - URL: `https://comp-portal-one.vercel.app/api/health`
  - Interval: 5 minutes
  - Monitor Type: HTTP(s)
  - Keyword monitoring: `"status":"healthy"` (JSON validation)
  - Timeout: 30 seconds
- [ ] Configure alerts:
  - Alert when: Status code is NOT 200 OR keyword not found
  - Alert contacts:
    - Email: [your email]
    - SMS: [your phone] (optional)
    - Slack webhook: [if available]
  - Alert threshold: 2 failures (prevents false alarms)
- [ ] Create status page (public):
  - Custom domain: `status.compsync.net` (optional)
  - Show uptime percentage
  - Show response times
  - Show incident history
- [ ] Test alerting:
  - Temporarily break health endpoint
  - Verify alert received within 10 minutes
  - Restore endpoint
  - Verify recovery alert
- [ ] Document in `docs/operations/MONITORING.md`

**No code changes required**

**Verification:**
- Monitor shows "Up" status
- Alert test successful
- Status page accessible

---

#### 1.3 Add Performance Monitoring (2 hours)
**Priority:** HIGH
**Risk:** 🟢 NONE (read-only telemetry)

**Checklist:**
- [ ] Verify `@vercel/analytics` in package.json (already installed)
- [ ] Add Analytics component to root layout:
  ```typescript
  // src/app/layout.tsx
  import { Analytics } from '@vercel/analytics/react';

  export default function RootLayout({ children }) {
    return (
      <html>
        <body>
          {children}
          <Analytics />
        </body>
      </html>
    );
  }
  ```
- [ ] Enable Vercel Analytics in dashboard:
  - Navigate to comp-portal project
  - Settings → Analytics → Enable
- [ ] Add custom tracking for critical flows:
  ```typescript
  // src/lib/analytics.ts
  import { track } from '@vercel/analytics';

  export const trackEvent = (event: string, properties?: Record<string, any>) => {
    track(event, properties);
  };

  // Usage in key flows:
  trackEvent('reservation_created', { studio_id, competition_id });
  trackEvent('entry_submitted', { entry_count });
  trackEvent('invoice_sent', { invoice_id, total });
  ```
- [ ] Add Web Vitals tracking:
  ```typescript
  // src/app/layout.tsx
  import { SpeedInsights } from '@vercel/speed-insights/next';

  // Add to layout alongside Analytics
  <SpeedInsights />
  ```
- [ ] Deploy and verify metrics in Vercel dashboard
- [ ] Document in `docs/operations/PERFORMANCE.md`

**Files Modified:**
- `src/app/layout.tsx` (add Analytics + SpeedInsights)
- `src/lib/analytics.ts` (new - custom tracking)
- `docs/operations/PERFORMANCE.md` (new)

**Verification:**
- Analytics shows page views in Vercel dashboard
- Web Vitals metrics visible
- Custom events tracked

**Rollback:** Remove Analytics components, redeploy (5 minutes)

---

#### 1.4 Enhanced Logging Configuration (1 hour)
**Priority:** MEDIUM
**Risk:** 🟢 NONE (informational only)

**Checklist:**
- [ ] Update logger to integrate with Sentry:
  ```typescript
  // src/lib/logger.ts (modify error method)
  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context));

    // Also send to Sentry if available
    if (typeof window !== 'undefined' && window.Sentry) {
      Sentry.captureException(context?.error || new Error(message), {
        contexts: { custom: context },
      });
    }
  }
  ```
- [ ] Add logger to tRPC error handler:
  ```typescript
  // src/server/trpc.ts (modify errorFormatter)
  errorFormatter({ shape, error }) {
    logger.error('tRPC error', {
      code: error.code,
      message: error.message,
      path: shape.data.path,
      error: error.cause,
    });

    return { ...shape, ... };
  }
  ```
- [ ] Add request logging to key mutations:
  - reservation.create
  - entry.create
  - invoice.create
  - Focus on business-critical operations
- [ ] Verify logs appear in Vercel logs
- [ ] Verify errors appear in Sentry
- [ ] Document logging standards in `docs/operations/LOGGING_STANDARDS.md`

**Files Modified:**
- `src/lib/logger.ts` (Sentry integration)
- `src/server/trpc.ts` (error logging)
- `docs/operations/LOGGING_STANDARDS.md` (new)

**Verification:**
- Errors logged to console AND Sentry
- Request IDs visible in logs
- Performance logs for slow operations

---

### Phase 1 Success Criteria

✅ **Monitoring:**
- [ ] Sentry dashboard shows production errors
- [ ] UptimeRobot monitor shows "Up" status
- [ ] Vercel Analytics shows page views and Web Vitals
- [ ] Alert test successful (email/SMS received)

✅ **Documentation:**
- [ ] `docs/operations/ERROR_TRACKING.md` created
- [ ] `docs/operations/MONITORING.md` created
- [ ] `docs/operations/PERFORMANCE.md` created
- [ ] `docs/operations/LOGGING_STANDARDS.md` created

✅ **No Regressions:**
- [ ] Build passes: `npm run build`
- [ ] App loads normally in production
- [ ] No new errors in Sentry

---

### Phase 1 Deliverables

**For User Review:**
1. Sentry dashboard link with sample errors
2. UptimeRobot status page link
3. Vercel Analytics dashboard access
4. Documentation for all monitoring tools

**Commit Message:**
```
feat: Add production monitoring and observability (Phase 1)

- Add Sentry error tracking with source maps
- Configure UptimeRobot external monitoring (5min intervals)
- Enable Vercel Analytics and Web Vitals
- Add custom event tracking for critical flows
- Integrate logging with Sentry
- Document monitoring setup and alerting

Monitoring Stack:
- Sentry: Error tracking and alerting
- UptimeRobot: External uptime monitoring
- Vercel Analytics: Performance and user metrics
- Enhanced logging: Structured logs with request IDs

Zero breaking changes - monitoring only.

✅ Build pass
🤖 Claude Code
```

---

## Phase 2: Security Hardening 🔒
**Duration:** 12 hours
**Risk:** 🟡 MEDIUM (requires testing, may break CSV import and WebSocket)
**Impact:** 🔥 CRITICAL (fixes actual vulnerabilities)
**Supervision:** ✅ Can run unsupervised with comprehensive testing

### Why Second?
- Fixes 2 critical security vulnerabilities
- Now we have monitoring from Phase 1 to catch issues
- Can be tested thoroughly before deployment
- Required before serving real minors' data

### Tasks

#### 2.1 Replace xlsx Package (4 hours)
**Priority:** CRITICAL (CVE-2024-XXXXX)
**Risk:** 🟡 MEDIUM (may break CSV import functionality)

**Background:**
- Current: `xlsx` package (2 high-severity CVEs)
- GHSA-4r6h-8v6p-xvw6: Prototype Pollution
- GHSA-5pgg-2g8v-p4x9: Regular Expression Denial of Service
- Affected: `src/components/RoutineCSVImport.tsx` (only usage)

**Checklist:**
- [ ] Backup current RoutineCSVImport.tsx
- [ ] Install replacement: `npm install exceljs`
- [ ] Uninstall vulnerable package: `npm uninstall xlsx`
- [ ] Update RoutineCSVImport.tsx:
  ```typescript
  // OLD (xlsx):
  import * as XLSX from 'xlsx';
  const workbook = XLSX.read(data, { type: 'binary' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  // NEW (exceljs):
  import ExcelJS from 'exceljs';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  const rows = sheet.getRows(1, sheet.rowCount).map(row => ({
    // Map columns to object properties
  }));
  ```
- [ ] Add file validation:
  ```typescript
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large (max 5MB)');
  }

  // Validate file type
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  ```
- [ ] Test CSV import:
  - Create test CSV with 10 dancers
  - Upload via UI
  - Verify all fields imported correctly
  - Test with edge cases (empty cells, special characters)
  - Test with invalid file (should reject)
  - Test with oversized file (should reject)
- [ ] Run security audit: `npm audit`
- [ ] Verify no high/critical vulnerabilities remain
- [ ] Deploy to staging first
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor Sentry for import errors (Phase 1 benefit!)
- [ ] Document in `docs/operations/SECURITY_UPDATES.md`

**Files Modified:**
- `src/components/RoutineCSVImport.tsx` (replace xlsx with exceljs)
- `package.json` (remove xlsx, add exceljs)
- `docs/operations/SECURITY_UPDATES.md` (new)

**Testing Script:**
```typescript
// tests/csv-import.test.ts (create this)
import { describe, it, expect } from 'vitest';
import { parseCSV } from '@/lib/csv-parser';

describe('CSV Import Security', () => {
  it('should reject files over 5MB', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.csv');
    await expect(parseCSV(largeFile)).rejects.toThrow('File too large');
  });

  it('should reject invalid file types', async () => {
    const invalidFile = new File(['data'], 'test.exe', { type: 'application/x-msdownload' });
    await expect(parseCSV(invalidFile)).rejects.toThrow('Invalid file type');
  });

  it('should parse valid CSV', async () => {
    const csv = 'First Name,Last Name,DOB\nJohn,Doe,2010-01-01';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const result = await parseCSV(file);
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe('John');
  });
});
```

**Verification:**
```bash
npm audit
# Should show 0 high/critical vulnerabilities

npm run test
# CSV import tests should pass

npm run build
# Build should succeed
```

**Rollback Plan:**
```bash
npm uninstall exceljs
npm install xlsx@0.18.5
git checkout src/components/RoutineCSVImport.tsx
npm run build && git push
```

---

#### 2.2 Fix WebSocket Authentication (8 hours)
**Priority:** CRITICAL (CRITICAL_ISSUES.md:66-149)
**Risk:** 🟡 MEDIUM (may break real-time scoreboard if not tested)

**Background:**
- Current: WebSocket uses `dev-token` (anyone can connect)
- Risk: Unauthorized access to real-time scores and judge data
- Affected: `src/lib/websocket.ts`, `src/hooks/useWebSocket.ts`

**Checklist:**
- [ ] Install Supabase server-side client (already installed)
- [ ] Update server-side auth handler:
  ```typescript
  // src/lib/websocket.ts
  import { createClient } from '@supabase/supabase-js';

  io.on('connection', (socket) => {
    socket.on('auth', async (data: { token: string }) => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify JWT token
        const { data: { user }, error } = await supabase.auth.getUser(
          data.token
        );

        if (error || !user) {
          socket.emit('auth_error', { message: 'Invalid token' });
          socket.disconnect();
          return;
        }

        // Get user role from user_profiles
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, studio_id, tenant_id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          socket.emit('auth_error', { message: 'User profile not found' });
          socket.disconnect();
          return;
        }

        // Store authenticated user data in socket
        socket.data.userId = user.id;
        socket.data.userEmail = user.email;
        socket.data.userRole = profile.role;
        socket.data.studioId = profile.studio_id;
        socket.data.tenantId = profile.tenant_id;

        socket.emit('authenticated', {
          success: true,
          userId: user.id,
          role: profile.role,
        });

        logger.info('WebSocket authenticated', {
          userId: user.id,
          role: profile.role,
          socketId: socket.id,
        });
      } catch (err) {
        logger.error('WebSocket auth error', { error: err });
        socket.emit('auth_error', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });

    // Protect all other events with auth check
    socket.use((packet, next) => {
      if (!socket.data.userId && packet[0] !== 'auth') {
        return next(new Error('Not authenticated'));
      }
      next();
    });
  });
  ```

- [ ] Update client-side to send real token:
  ```typescript
  // src/hooks/useWebSocket.ts
  import { useSupabaseClient } from '@/hooks/useSupabaseClient';

  export function useWebSocket(options?: WebSocketOptions) {
    const supabase = useSupabaseClient();

    useEffect(() => {
      async function connect() {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!session) {
          console.warn('No session, cannot connect to WebSocket');
          return;
        }

        const socket = io(WS_URL);

        // Send real JWT token
        socket.emit('auth', {
          token: session.access_token, // Real Supabase JWT
        });

        socket.on('authenticated', (data) => {
          console.log('WebSocket authenticated', data);
          setConnected(true);
        });

        socket.on('auth_error', (data) => {
          console.error('WebSocket auth failed', data);
          setError(data.message);
          socket.disconnect();
        });
      }

      connect();
    }, []);
  }
  ```

- [ ] Add role-based event filtering:
  ```typescript
  // Only allow judges to submit scores
  socket.on('submit_score', async (data) => {
    if (socket.data.userRole !== 'judge') {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    // Process score submission
  });

  // Only allow CDs to view all entries
  socket.on('subscribe_all_entries', async () => {
    const allowedRoles = ['competition_director', 'super_admin'];
    if (!allowedRoles.includes(socket.data.userRole)) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    // Subscribe to all entries
  });

  // Studio directors can only see their own entries
  socket.on('subscribe_studio_entries', async (data) => {
    if (socket.data.userRole === 'studio_director') {
      if (data.studioId !== socket.data.studioId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }
    }
    // Subscribe to studio entries
  });
  ```

- [ ] Test authentication flow:
  - Test as Studio Director (should connect)
  - Test as Competition Director (should connect)
  - Test with invalid token (should disconnect)
  - Test without token (should disconnect)
  - Test role-based permissions (SD can't see other studios)
- [ ] Test real-time features:
  - Scoreboard updates
  - Judge score submission
  - Entry status changes
  - Competition announcements
- [ ] Add WebSocket tests:
  ```typescript
  // tests/websocket-auth.test.ts
  import { io, Socket } from 'socket.io-client';

  describe('WebSocket Authentication', () => {
    let socket: Socket;

    it('should reject connection without token', (done) => {
      socket = io('http://localhost:3000');
      socket.emit('auth', { token: 'invalid' });
      socket.on('auth_error', () => {
        expect(socket.connected).toBe(false);
        done();
      });
    });

    it('should authenticate with valid token', async () => {
      const session = await supabase.auth.getSession();
      socket = io('http://localhost:3000');
      socket.emit('auth', { token: session.data.session.access_token });

      await new Promise((resolve) => {
        socket.on('authenticated', (data) => {
          expect(data.success).toBe(true);
          resolve(true);
        });
      });
    });
  });
  ```
- [ ] Deploy to staging
- [ ] Test all WebSocket features in staging
- [ ] Monitor Sentry for WebSocket errors
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Document in `docs/operations/WEBSOCKET_SECURITY.md`

**Files Modified:**
- `src/lib/websocket.ts` (server auth handler)
- `src/hooks/useWebSocket.ts` (client token sending)
- `tests/websocket-auth.test.ts` (new)
- `docs/operations/WEBSOCKET_SECURITY.md` (new)

**Verification:**
```bash
# WebSocket server logs should show:
# "WebSocket authenticated" for valid connections
# "WebSocket auth error" for invalid connections

# Sentry should show:
# No new WebSocket auth errors in production

# Manual test:
# 1. Open browser dev tools → Network → WS
# 2. Connect to app
# 3. Should see 'authenticated' message
# 4. Should NOT see 'dev-token' in messages
```

**Rollback Plan:**
```bash
git revert HEAD
npm run build && git push
# WebSocket will revert to dev-token (insecure but functional)
```

---

### Phase 2 Success Criteria

✅ **Security:**
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] WebSocket requires real JWT authentication
- [ ] Role-based access control on WebSocket events
- [ ] CSV import validates file size and type

✅ **Testing:**
- [ ] CSV import tests pass (valid, invalid, oversized files)
- [ ] WebSocket auth tests pass (valid, invalid, no token)
- [ ] Manual testing in staging successful
- [ ] No new errors in Sentry after deployment

✅ **Documentation:**
- [ ] `docs/operations/SECURITY_UPDATES.md` created
- [ ] `docs/operations/WEBSOCKET_SECURITY.md` created

✅ **No Regressions:**
- [ ] Build passes: `npm run build`
- [ ] CSV import works in production
- [ ] WebSocket features work in production (scoreboard, judging)

---

### Phase 2 Deliverables

**For User Review:**
1. Security audit report (npm audit output)
2. Test results (CSV import + WebSocket auth)
3. Sentry dashboard (no new errors)
4. Documentation for security updates

**Commit Message:**
```
fix: Critical security updates - xlsx CVE and WebSocket auth (Phase 2)

Security Fixes:
1. Replace xlsx with exceljs (fixes 2 high-severity CVEs)
   - GHSA-4r6h-8v6p-xvw6: Prototype Pollution
   - GHSA-5pgg-2g8v-p4x9: ReDoS vulnerability
   - Add file size (5MB) and type validation

2. Implement WebSocket JWT authentication
   - Replace dev-token with Supabase session tokens
   - Add role-based event filtering
   - Studio Directors can only see their data
   - Judges can only submit scores
   - Competition Directors have full access

Testing:
- CSV import: 100% pass (valid, invalid, edge cases)
- WebSocket auth: 100% pass (valid, invalid, unauthorized)
- Manual testing: Staging verified
- No regressions: All features working

Files: src/components/RoutineCSVImport.tsx:150
Files: src/lib/websocket.ts:96, src/hooks/useWebSocket.ts:73

✅ Build pass
✅ Tests pass
✅ npm audit clean
🤖 Claude Code
```

---

## Phase 3: Operational Resilience 🛡️
**Duration:** 16 hours
**Risk:** 🟢 LOW (documentation and runbooks, no code changes)
**Impact:** 🔥 HIGH (prevents disasters)
**Supervision:** ✅ Can run unsupervised (mostly documentation)

### Why Third?
- Prepares for worst-case scenarios (database loss, downtime)
- Low risk (mostly documentation and testing)
- High impact (could save the business)
- Now we have monitoring to track any issues

### Tasks

#### 3.1 Backup Verification and Testing (4 hours)
**Priority:** CRITICAL
**Risk:** 🟢 NONE (read-only operations)

**Checklist:**
- [ ] Log into Supabase dashboard
- [ ] Navigate to Settings → Database → Backups
- [ ] Document current backup configuration:
  ```markdown
  ## Current Backup Configuration
  - Provider: Supabase
  - Project: [project-ref]
  - Tier: [Free/Pro]
  - Backup Schedule: Daily at [time]
  - Retention Period: [7/30 days]
  - Point-in-Time Recovery: [Enabled/Disabled]
  - PITR Window: [24 hours/7 days]
  - Last Backup: [timestamp]
  - Backup Size: [MB/GB]
  - Status: [Success/Failed]
  ```
- [ ] Verify backup schedule:
  - Daily automatic: ✅ or ❌
  - Manual backup available: ✅ or ❌
  - Backup notifications: ✅ or ❌
- [ ] Create test restoration procedure:
  1. Create new Supabase project (test-restore-[date])
  2. Restore latest backup to test project
  3. Verify data integrity:
     - Row counts match production
     - Sample queries return expected results
     - Foreign keys intact
     - Indexes created
  4. Time the restoration process (establish RTO)
  5. Delete test project
- [ ] Execute test restoration (hands-on):
  - **IMPORTANT:** Do this during low-traffic hours
  - Document every step with screenshots
  - Record time for each step
  - Note any errors or warnings
  - Verify connection strings work
- [ ] Calculate actual RTO and RPO:
  - RTO (Recovery Time Objective): How long restoration took
  - RPO (Recovery Point Objective): Time between backups (24h?)
- [ ] If PITR not enabled, document upgrade recommendation
- [ ] Create backup monitoring:
  ```typescript
  // scripts/check-backup-status.ts
  // Query Supabase API for backup status
  // Alert if last backup > 36 hours old
  // Can be run as cron job or GitHub Action
  ```
- [ ] Document findings in `docs/operations/BACKUP_VERIFICATION.md`:
  - Current configuration
  - Test results
  - RTO/RPO metrics
  - Recommendations
  - Screenshots of restoration process

**Deliverables:**
- `docs/operations/BACKUP_VERIFICATION.md`
- `scripts/check-backup-status.ts` (optional)
- Test restoration report with timing

**Success Criteria:**
- [ ] Backup restoration tested successfully
- [ ] RTO documented (<1 hour recommended)
- [ ] RPO documented (24h typical)
- [ ] Backup status verified healthy

---

#### 3.2 Disaster Recovery Runbook (8 hours)
**Priority:** CRITICAL
**Risk:** 🟢 NONE (documentation only)

**Checklist:**
- [ ] Create comprehensive disaster recovery runbook
- [ ] Document all critical scenarios
- [ ] Include step-by-step procedures
- [ ] Add contact information
- [ ] Test each procedure (where possible)

**Runbook Structure:**

```markdown
# Disaster Recovery Runbook

## Emergency Contacts

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| Technical Lead | [Name] | [Phone] | [Email] | 24/7 |
| Database Admin | [Name] | [Phone] | [Email] | Business hours |
| Supabase Support | - | - | support@supabase.com | 24/7 (Pro tier) |
| Vercel Support | - | - | support@vercel.com | 24/7 (Pro tier) |

## Scenario 1: Database Corruption or Loss
**Severity:** P1 - CRITICAL
**RTO:** 30-60 minutes
**RPO:** 24 hours (last backup)

### Detection:
- Health check returns 503
- Sentry shows database connection errors
- UptimeRobot alerts
- Users report "Database error" messages

### Steps:
1. **Assess damage** (5 minutes)
   - Can you connect to database?
   - Run: `psql $DATABASE_URL -c "SELECT 1"`
   - If yes → partial corruption, proceed to Step 2
   - If no → total loss, proceed to Step 3

2. **Partial corruption recovery** (15-30 minutes)
   - Identify corrupted tables
   - Run: `SELECT * FROM pg_stat_database WHERE datname = 'postgres'`
   - Check for table errors: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
   - Try PITR: Restore to last known good point (Supabase dashboard)
   - Test application: Verify critical queries work
   - If successful → monitor for 1 hour
   - If fails → proceed to Step 3 (full restore)

3. **Full database restore** (30-60 minutes)
   - [ ] Step 3.1: Create new Supabase project
     - Login: https://supabase.com/dashboard
     - Create Project → [Competition Portal Restore YYYY-MM-DD]
     - Region: Same as production (us-east-1)
     - Database Password: Use password manager
     - Wait for provisioning (~2 minutes)

   - [ ] Step 3.2: Restore from backup
     - Navigate to new project → Settings → Database → Backups
     - Select latest backup from production project
     - Click "Restore to this project"
     - Wait for restore (~10-20 minutes depending on size)
     - Verify restore success (green checkmark)

   - [ ] Step 3.3: Update environment variables in Vercel
     - Login: https://vercel.com/dashboard
     - Select comp-portal project
     - Settings → Environment Variables
     - Update DATABASE_URL with new connection string
     - Update DIRECT_URL with new direct connection
     - Update NEXT_PUBLIC_SUPABASE_URL
     - Update NEXT_PUBLIC_SUPABASE_ANON_KEY
     - Update SUPABASE_SERVICE_ROLE_KEY
     - **IMPORTANT:** Update for Production environment

   - [ ] Step 3.4: Trigger new deployment
     - Vercel dashboard → Deployments
     - Click "Redeploy" on latest deployment
     - OR: Push empty commit to trigger deploy
       ```bash
       git commit --allow-empty -m "Emergency redeploy - new database"
       git push
       ```
     - Wait for deployment (~3 minutes)

   - [ ] Step 3.5: Verify application health
     - Visit: https://comp-portal-one.vercel.app/api/health
     - Should return 200 OK with `"status":"healthy"`
     - Test login with demo account
     - Test critical flows:
       - View competitions
       - View dancers
       - View reservations
       - Create test entry (if appropriate)
     - Check Sentry for errors (should be minimal)

   - [ ] Step 3.6: Update DNS (if using custom domain)
     - Not applicable currently (using Vercel subdomain)
     - If custom domain in future: Update A/CNAME records

   - [ ] Step 3.7: Notify users
     - Email template: "Service restored - brief downtime"
     - Explain: Database issue, restored from backup
     - Mention: Data up to [backup time] preserved
     - Apologize: For inconvenience
     - Provide: support@compsync.net contact

4. **Post-recovery validation** (30 minutes)
   - Run data integrity checks
   - Compare row counts: production vs. backup
   - Verify recent entries exist
   - Check for any missing data
   - Monitor Sentry for 1 hour
   - Monitor UptimeRobot (should be green)

5. **Post-mortem** (1-2 hours)
   - Document incident timeline
   - Identify root cause
   - Document lessons learned
   - Update runbook with improvements
   - Schedule team review

**Data Loss Window:**
- If restored from daily backup: Up to 24 hours of data may be lost
- If PITR available: Up to last transaction preserved

---

## Scenario 2: Vercel Deployment Failure
**Severity:** P2 - HIGH
**RTO:** 15-30 minutes
**RPO:** Last commit

### Detection:
- Build fails in Vercel dashboard
- Users see error page
- UptimeRobot alerts
- Sentry shows deployment errors

### Steps:
1. **Check build logs** (5 minutes)
   - Vercel dashboard → Deployments → Failed deployment
   - Read error message
   - Common causes:
     - TypeScript error
     - Missing environment variable
     - Dependency issue
     - Out of memory

2. **Quick fixes** (10 minutes)
   - TypeScript error → Fix and commit
   - Missing env var → Add in Vercel settings
   - Dependency → `npm install` and commit lock file
   - Out of memory → Increase Node memory in vercel.json

3. **Rollback to last working deployment** (5 minutes)
   - Vercel dashboard → Deployments
   - Find last successful deployment (green checkmark)
   - Click "..." menu → "Promote to Production"
   - Confirm promotion
   - Wait 1-2 minutes
   - Verify: https://comp-portal-one.vercel.app

4. **Fix root cause** (varies)
   - Debug locally: `npm run build`
   - Fix issue
   - Test locally
   - Deploy to preview first (push to branch)
   - If preview works, merge to main

---

## Scenario 3: Supabase Service Outage
**Severity:** P1 - CRITICAL
**RTO:** Wait for Supabase (typically <1 hour) or 2-4 hours for migration
**RPO:** Real-time (if migrating to backup provider)

### Detection:
- Health check returns 503
- All database queries fail
- Supabase status page shows incident
- UptimeRobot alerts

### Steps:
1. **Verify outage** (2 minutes)
   - Check Supabase status: https://status.supabase.com
   - If incident confirmed → proceed to Step 2
   - If no incident → check project-specific issue

2. **Wait or migrate decision** (5 minutes)
   - Check incident status:
     - Identified + Fix in progress → Wait (usually <1 hour)
     - Investigating + No ETA → Consider migration

   - Business impact calculation:
     - Is competition running NOW? → High urgency
     - Off-season? → Low urgency, wait

3. **If waiting** (monitor every 15 minutes)
   - Update status page: "We're experiencing a database issue"
   - Monitor Supabase status page
   - Prepare to migrate if outage exceeds 1 hour
   - Notify users via email

4. **If migrating to backup provider** (2-4 hours)
   - **Option A:** Neon (fastest)
     - Signup: https://neon.tech
     - Import latest backup SQL
     - Update DATABASE_URL in Vercel
     - Deploy

   - **Option B:** PlanetScale
     - Similar process
     - May require schema adjustments

   - **IMPORTANT:** This is LAST RESORT only

---

## Scenario 4: Competition Weekend Outage
**Severity:** P1 - CRITICAL
**RTO:** 5 minutes (offline mode) or 30 minutes (full recovery)
**RPO:** Real-time (local backup used)

### Detection:
- Judges can't submit scores
- Scoreboard not updating
- CDs can't access system during competition

### Steps:
1. **Activate offline mode** (5 minutes)
   - Judges have PWA installed (offline-first)
   - Scores queue locally in IndexedDB
   - Continue competition WITHOUT internet
   - Scores will sync when connection restored

2. **Export local data** (10 minutes)
   - Each judge exports scored entries to CSV
   - USB keys used to collect from all tablets
   - CD has master CSV with all scores
   - Can calculate awards manually if needed

3. **Parallel: Fix production** (30 minutes)
   - Follow Scenario 1, 2, or 3 above
   - Monitor restoration progress
   - Test health endpoint

4. **Restore connection** (5 minutes)
   - Verify production health
   - Tell judges to reconnect tablets
   - Offline scores auto-sync to server
   - Verify all scores uploaded
   - Resume normal operations

5. **Post-competition verification** (1 hour)
   - Export final results from database
   - Compare with manual CSV backups
   - Verify awards calculated correctly
   - Archive all data (competition + backups)

---

## Scenario 5: Critical Bug in Production
**Severity:** P2 - HIGH
**RTO:** 5 minutes (rollback) or 30 minutes (hotfix)
**RPO:** Last deployment

### Detection:
- Sentry shows spike in errors
- Users report broken functionality
- UptimeRobot shows degraded performance
- Critical feature not working (e.g., can't create entries)

### Steps:
1. **Assess severity** (2 minutes)
   - P1: Blocking all users (can't login, database down)
   - P2: Blocking critical feature (can't create entries)
   - P3: Minor feature broken (export button not working)

2. **Immediate mitigation** (5 minutes)
   - For P1/P2 → Rollback immediately (see Scenario 2)
   - For P3 → Can wait for hotfix

3. **Develop hotfix** (varies)
   - Branch from last good commit
   - Minimal fix only (no refactoring)
   - Test locally
   - Deploy to preview environment
   - Test in preview
   - If verified, deploy to production

4. **Monitor** (30 minutes)
   - Watch Sentry for new errors
   - Verify fix resolves issue
   - Check for side effects

---

## Pre-Competition Checklist

**Run 1 week before competition:**

- [ ] Backup verification
  - Latest backup < 24 hours old
  - Test restoration (quarterly requirement)
  - PITR window covers competition dates

- [ ] Export competition data
  - All reservations
  - All dancers
  - All entries
  - All schedules
  - Store locally on CD's laptop + USB backup

- [ ] Monitor all green
  - UptimeRobot: 99.9%+ uptime
  - Sentry: <10 errors/day
  - Health check: Passing

- [ ] Test critical flows
  - Login (all roles)
  - Create entry
  - Submit scores (judge tablet)
  - View scoreboard

- [ ] Review runbook
  - All contacts up to date
  - All passwords accessible
  - All links working

- [ ] Offline mode prepared
  - Judge tablets have PWA installed
  - Tested offline score entry
  - USB keys ready for backup

- [ ] Communication plan
  - Status page URL shared with users
  - Emergency hotline tested
  - Email templates ready

---

## Post-Incident Checklist

**After ANY incident:**

- [ ] Document timeline (when, what, who)
- [ ] Identify root cause
- [ ] Document temporary workarounds used
- [ ] Document resolution steps
- [ ] Calculate actual downtime
- [ ] Calculate data loss (if any)
- [ ] Notify affected users
- [ ] Update runbook with lessons learned
- [ ] Schedule post-mortem meeting
- [ ] Implement preventive measures

---

## Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| RTO (Recovery Time Objective) | <1 hour | [TBD after test] |
| RPO (Recovery Point Objective) | <24 hours | [TBD - backup frequency] |
| Uptime SLA | 99.9% | [Track in UptimeRobot] |
| Mean Time To Detect (MTTD) | <5 minutes | [With monitoring: ~5 min] |
| Mean Time To Resolve (MTTR) | <1 hour (P1) | [TBD] |

---

## Testing Schedule

- **Weekly:** Check backup status (automated)
- **Monthly:** Review runbook for accuracy
- **Quarterly:** Test backup restoration
- **Pre-Competition:** Run full checklist
- **Annually:** Disaster recovery drill (simulate outage)

```

**Deliverables:**
- `docs/operations/DISASTER_RECOVERY_RUNBOOK.md` (comprehensive)
- Emergency contact card (PDF for printing)
- Pre-competition checklist (separate doc)

**Success Criteria:**
- [ ] All scenarios documented with step-by-step procedures
- [ ] Emergency contacts filled in
- [ ] Runbook reviewed by technical lead
- [ ] Pre-competition checklist created

---

#### 3.3 Rate Limiting Implementation (4 hours)
**Priority:** HIGH
**Risk:** 🟡 LOW-MEDIUM (could block legitimate users if misconfigured)

**Checklist:**
- [ ] Choose rate limiting strategy:
  - **Option A:** Simple in-memory (development/testing)
  - **Option B:** Upstash Redis (recommended for production)
  - **Option C:** Vercel Edge Config (built-in, simple)

- [ ] Install dependencies (if using Upstash):
  ```bash
  npm install @upstash/ratelimit @upstash/redis
  ```

- [ ] Sign up for Upstash Redis (free tier: 10k requests/day)
  - Visit: https://upstash.com
  - Create database
  - Copy UPSTASH_REDIS_REST_URL and TOKEN
  - Add to Vercel environment variables

- [ ] Create rate limit middleware:
  ```typescript
  // src/lib/rate-limit.ts
  import { Ratelimit } from '@upstash/ratelimit';
  import { Redis } from '@upstash/redis';

  // Create Redis client
  const redis = Redis.fromEnv();

  // Rate limiters for different endpoints
  export const rateLimiters = {
    // General API: 100 requests per minute
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    }),

    // Auth endpoints: 10 requests per minute (prevent brute force)
    auth: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    }),

    // CSV upload: 5 per minute (resource intensive)
    upload: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:upload',
    }),

    // Email sending: 20 per hour (prevent spam)
    email: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      analytics: true,
      prefix: 'ratelimit:email',
    }),
  };

  export async function checkRateLimit(
    limiter: Ratelimit,
    identifier: string
  ): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const result = await limiter.limit(identifier);
    return result;
  }
  ```

- [ ] Add rate limiting to tRPC procedures:
  ```typescript
  // src/server/trpc.ts
  import { rateLimiters, checkRateLimit } from '@/lib/rate-limit';

  // Create rate-limited procedure
  export const rateLimitedProcedure = protectedProcedure.use(
    async ({ ctx, next }) => {
      const identifier = ctx.userId || ctx.req?.ip || 'anonymous';

      const result = await checkRateLimit(rateLimiters.api, identifier);

      if (!result.success) {
        logger.warn('Rate limit exceeded', {
          userId: ctx.userId,
          ip: ctx.req?.ip,
          limit: result.limit,
          reset: new Date(result.reset),
        });

        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds`,
        });
      }

      return next({ ctx });
    }
  );
  ```

- [ ] Apply rate limits to critical routers:
  ```typescript
  // src/server/routers/auth.ts
  export const authRouter = t.router({
    login: publicProcedure
      .use(async ({ ctx, next }) => {
        const ip = ctx.req?.ip || 'unknown';
        const result = await checkRateLimit(rateLimiters.auth, ip);
        if (!result.success) {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
        }
        return next({ ctx });
      })
      .input(loginSchema)
      .mutation(async ({ input }) => {
        // Login logic
      }),
  });

  // src/server/routers/entry.ts
  export const entryRouter = t.router({
    create: rateLimitedProcedure // Uses default 100/min
      .input(createEntrySchema)
      .mutation(async ({ ctx, input }) => {
        // Entry creation logic
      }),

    bulkImport: protectedProcedure
      .use(async ({ ctx, next }) => {
        const result = await checkRateLimit(rateLimiters.upload, ctx.userId);
        if (!result.success) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
        return next({ ctx });
      })
      .input(bulkImportSchema)
      .mutation(async ({ ctx, input }) => {
        // Bulk import logic (resource intensive)
      }),
  });
  ```

- [ ] Add rate limit headers to responses:
  ```typescript
  // middleware.ts
  export async function middleware(request: NextRequest) {
    const response = await updateSession(request);

    // Add rate limit headers (if checked in middleware)
    // This is optional - rate limits are checked in tRPC
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '95');
    response.headers.set('X-RateLimit-Reset', Date.now() + 60000);

    return response;
  }
  ```

- [ ] Create admin endpoint to view rate limit stats:
  ```typescript
  // src/server/routers/admin.ts
  export const adminRouter = t.router({
    getRateLimitStats: adminProcedure.query(async () => {
      // Query Upstash Redis for analytics
      // Show top rate-limited users
      // Show overall request volume
    }),
  });
  ```

- [ ] Test rate limiting:
  ```bash
  # Test script
  for i in {1..150}; do
    curl -X POST https://comp-portal-one.vercel.app/api/trpc/entry.create \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"json":{...}}' \
      -w "%{http_code}\n" &
  done

  # Should see:
  # 1-100: 200 OK
  # 101-150: 429 Too Many Requests
  ```

- [ ] Monitor rate limits in production:
  - Upstash dashboard shows analytics
  - Sentry tracks TOO_MANY_REQUESTS errors
  - Log warnings for rate limit hits

- [ ] Document in `docs/operations/RATE_LIMITING.md`:
  - Configuration
  - Limits per endpoint
  - How to adjust limits
  - How to whitelist IPs (if needed)

**Files Created/Modified:**
- `src/lib/rate-limit.ts` (new)
- `src/server/trpc.ts` (add rateLimitedProcedure)
- `src/server/routers/auth.ts` (apply auth rate limit)
- `src/server/routers/entry.ts` (apply upload rate limit)
- `docs/operations/RATE_LIMITING.md` (new)

**Verification:**
```bash
# Should see rate limits in Upstash dashboard
# Should see 429 errors in Sentry when limits exceeded
# Should see warnings in logs
```

**Rollback Plan:**
Remove rate limit middleware, redeploy (5 minutes)

**Success Criteria:**
- [ ] Rate limiters configured for all critical endpoints
- [ ] Tested and verified (100 req/min blocks 101st request)
- [ ] Upstash analytics showing request volume
- [ ] No false positives (legitimate users not blocked)

---

### Phase 3 Success Criteria

✅ **Resilience:**
- [ ] Backup restoration tested and documented (RTO < 1 hour)
- [ ] Disaster recovery runbook complete (all scenarios covered)
- [ ] Rate limiting active on all critical endpoints
- [ ] Pre-competition checklist created

✅ **Documentation:**
- [ ] `docs/operations/BACKUP_VERIFICATION.md` complete with test results
- [ ] `docs/operations/DISASTER_RECOVERY_RUNBOOK.md` comprehensive
- [ ] `docs/operations/RATE_LIMITING.md` documents all limits
- [ ] Emergency contact card created

✅ **Testing:**
- [ ] Backup restoration successful (with timing)
- [ ] Rate limits tested (blocks after threshold)
- [ ] No false positives (legitimate users not affected)

✅ **Monitoring:**
- [ ] Backup status tracked
- [ ] Rate limit analytics in Upstash
- [ ] UptimeRobot configured with runbook URLs

---

### Phase 3 Deliverables

**For User Review:**
1. Backup test report (with RTO/RPO metrics)
2. Complete disaster recovery runbook (5 scenarios)
3. Rate limiting analytics dashboard
4. Pre-competition checklist

**Commit Message:**
```
feat: Operational resilience - backups, DR, rate limiting (Phase 3)

Operational Improvements:
1. Backup Verification System
   - Tested backup restoration (RTO: [X] minutes)
   - Documented PITR configuration
   - Created backup monitoring script
   - RPO: 24 hours (daily backups)

2. Disaster Recovery Runbook
   - 5 critical scenarios documented
   - Database corruption/loss recovery
   - Vercel deployment failure
   - Supabase outage handling
   - Competition weekend contingency
   - Critical bug rollback
   - Pre-competition checklist
   - Post-incident procedures

3. Application Rate Limiting
   - API: 100 req/min per user
   - Auth: 10 req/min (brute force prevention)
   - Upload: 5 req/min (resource protection)
   - Email: 20 req/hour (spam prevention)
   - Upstash Redis analytics enabled

Testing:
- Backup restoration: PASSED ([X] minutes)
- Rate limiting: PASSED (blocks after threshold)
- No legitimate users affected

Docs: 3 new operational guides
Zero breaking changes - safety improvements only.

✅ Build pass
✅ Tests pass
🤖 Claude Code
```

---

## Phase 4: Compliance & Legal Preparation 📋
**Duration:** 24 hours
**Risk:** 🟢 LOW (documentation and workflows)
**Impact:** 🟡 MEDIUM (required for legal compliance)
**Supervision:** ⚠️ PARTIAL (legal review needed from user)

### Why Fourth?
- Ensures legal compliance before handling minors' data
- Low technical risk (mostly workflows and docs)
- Requires user/legal input (can't run fully autonomous)
- Foundation for Phase 5 (multi-tenant will need these)

### Tasks

#### 4.1 Data Retention Policy and Automation (16 hours)
**Priority:** HIGH (legal requirement)
**Risk:** 🟢 LOW (new features, no breaking changes)

**Checklist:**
- [ ] Define data retention policy:
  ```markdown
  ## CompPortal Data Retention Policy

  ### Personal Data (Dancers)
  - Retention: 90 days after competition end date
  - After 90 days: Anonymize or delete
  - Rationale: Legal compliance (COPPA/GDPR)

  ### Financial Records (Invoices, Payments)
  - Retention: 7 years (IRS requirement)
  - Exception: Do not delete financial records

  ### Activity Logs
  - Retention: 1 year
  - After 1 year: Archive to cold storage

  ### Competition Results
  - Retention: Indefinite (historical record)
  - Anonymization: Remove PII, keep scores/placements
  ```

- [ ] Create retention configuration table:
  ```sql
  -- Add to migration
  CREATE TABLE data_retention_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    data_type VARCHAR(50) NOT NULL, -- 'dancer', 'invoice', 'activity_log', etc.
    retention_days INTEGER NOT NULL, -- 90, 2555 (7 years), 365
    action VARCHAR(20) NOT NULL, -- 'delete' or 'anonymize'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Insert defaults
  INSERT INTO data_retention_config (tenant_id, data_type, retention_days, action) VALUES
    ('00000000-0000-0000-0000-000000000001', 'dancer', 90, 'anonymize'),
    ('00000000-0000-0000-0000-000000000001', 'invoice', 2555, 'keep'),
    ('00000000-0000-0000-0000-000000000001', 'activity_log', 365, 'delete');
  ```

- [ ] Create anonymization service:
  ```typescript
  // src/lib/data-retention.ts
  import { prisma } from '@/lib/prisma';
  import { logger } from '@/lib/logger';

  export async function anonymizeDancer(dancerId: string) {
    await prisma.dancers.update({
      where: { id: dancerId },
      data: {
        first_name: 'ANONYMIZED',
        last_name: 'DANCER',
        date_of_birth: null,
        email: null,
        phone: null,
        parent_name: null,
        parent_email: null,
        parent_phone: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        medical_conditions: null,
        allergies: null,
        medications: null,
        photo_url: null,
        // Keep: studio_id, competition entries (for historical records)
      },
    });

    logger.info('Dancer anonymized', { dancerId });
  }

  export async function getExpiredDancers(tenantId: string): Promise<Dancer[]> {
    const retentionConfig = await prisma.data_retention_config.findFirst({
      where: { tenant_id: tenantId, data_type: 'dancer' },
    });

    if (!retentionConfig) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionConfig.retention_days);

    // Find dancers whose last competition ended before cutoff
    const expiredDancers = await prisma.dancers.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active', // Not already anonymized
        entry_participants: {
          every: {
            competition_entries: {
              competitions: {
                competition_end_date: { lt: cutoffDate },
              },
            },
          },
        },
      },
      include: {
        entry_participants: {
          include: {
            competition_entries: {
              include: { competitions: true },
            },
          },
        },
      },
    });

    return expiredDancers;
  }

  export async function runDataRetention(tenantId: string) {
    const expiredDancers = await getExpiredDancers(tenantId);

    logger.info('Running data retention', {
      tenantId,
      expiredCount: expiredDancers.length,
    });

    let anonymizedCount = 0;

    for (const dancer of expiredDancers) {
      try {
        await anonymizeDancer(dancer.id);
        anonymizedCount++;
      } catch (error) {
        logger.error('Failed to anonymize dancer', {
          dancerId: dancer.id,
          error,
        });
      }
    }

    logger.info('Data retention complete', {
      tenantId,
      anonymizedCount,
    });

    return { anonymizedCount };
  }
  ```

- [ ] Create scheduled job:
  ```typescript
  // src/app/api/cron/data-retention/route.ts
  import { NextResponse } from 'next/server';
  import { runDataRetention } from '@/lib/data-retention';
  import { logger } from '@/lib/logger';

  // Vercel Cron Job
  // Configure in vercel.json
  export async function GET(request: Request) {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Run for all tenants
      const tenants = await prisma.tenants.findMany();

      const results = [];
      for (const tenant of tenants) {
        const result = await runDataRetention(tenant.id);
        results.push({ tenantId: tenant.id, ...result });
      }

      logger.info('Scheduled data retention completed', { results });

      return NextResponse.json({
        success: true,
        results,
      });
    } catch (error) {
      logger.error('Data retention job failed', { error });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  ```

- [ ] Configure Vercel Cron:
  ```json
  // vercel.json
  {
    "crons": [
      {
        "path": "/api/cron/data-retention",
        "schedule": "0 2 * * *"
      }
    ]
  }
  ```
  - Runs daily at 2am UTC
  - Requires Vercel Pro tier for cron jobs
  - Alternative: Use GitHub Actions cron

- [ ] Create admin UI for retention management:
  ```typescript
  // src/app/dashboard/admin/data-retention/page.tsx
  'use client';

  export default function DataRetentionPage() {
    const [expiredDancers] = trpc.admin.getExpiredDancers.useQuery();
    const runRetention = trpc.admin.runDataRetention.useMutation();

    return (
      <div>
        <h1>Data Retention Management</h1>

        <div className="stats">
          <p>Dancers eligible for anonymization: {expiredDancers?.length || 0}</p>
          <p>Last run: {lastRun}</p>
        </div>

        <button onClick={() => runRetention.mutate()}>
          Run Data Retention Now
        </button>

        <table>
          {/* List expired dancers with last competition date */}
        </table>
      </div>
    );
  }
  ```

- [ ] Create tRPC admin router:
  ```typescript
  // src/server/routers/admin.ts
  export const adminRouter = t.router({
    getExpiredDancers: adminProcedure
      .input(z.object({ tenantId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = input.tenantId || ctx.tenantId;
        return await getExpiredDancers(tenantId);
      }),

    runDataRetention: adminProcedure
      .input(z.object({ tenantId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = input.tenantId || ctx.tenantId;
        return await runDataRetention(tenantId);
      }),
  });
  ```

- [ ] Add audit logging:
  ```typescript
  // Log all anonymizations
  await prisma.activity_logs.create({
    data: {
      user_id: 'SYSTEM',
      action: 'dancer_anonymized',
      details: `Dancer ${dancerId} anonymized per retention policy`,
      timestamp: new Date(),
    },
  });
  ```

- [ ] Test retention system:
  - Create test dancer with old competition
  - Run retention job
  - Verify dancer anonymized
  - Verify competition entries preserved
  - Verify audit log created

- [ ] Document in `docs/operations/DATA_RETENTION.md`:
  - Retention policy
  - Anonymization process
  - How to run manually
  - How to adjust retention periods
  - Legal rationale

**Files Created:**
- `prisma/migrations/XXXXXX_add_data_retention/migration.sql`
- `src/lib/data-retention.ts`
- `src/app/api/cron/data-retention/route.ts`
- `src/app/dashboard/admin/data-retention/page.tsx`
- `src/server/routers/admin.ts` (extend)
- `vercel.json` (add cron)
- `docs/operations/DATA_RETENTION.md`

**Verification:**
```bash
# Test cron endpoint
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://comp-portal-one.vercel.app/api/cron/data-retention

# Should see:
# { "success": true, "results": [...] }
```

**Success Criteria:**
- [ ] Retention policy documented and approved
- [ ] Anonymization function tested
- [ ] Cron job configured (or GitHub Action)
- [ ] Admin UI created
- [ ] Audit logging working

---

#### 4.2 Parental Consent Workflow (8 hours)
**Priority:** HIGH (COPPA compliance for <13 years old)
**Risk:** 🟢 LOW (new feature, no breaking changes)

**Checklist:**
- [ ] Add consent fields to dancers table:
  ```sql
  -- Migration
  ALTER TABLE dancers
    ADD COLUMN parent_consent_given BOOLEAN DEFAULT false,
    ADD COLUMN parent_consent_timestamp TIMESTAMPTZ,
    ADD COLUMN parent_consent_ip VARCHAR(45),
    ADD COLUMN parent_consent_method VARCHAR(20); -- 'online', 'paper', 'email'
  ```

- [ ] Update dancer creation form:
  ```typescript
  // src/components/DancerForm.tsx

  // Add age calculation
  const calculateAge = (dob: Date) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Show consent checkbox if under 13
  {age < 13 && (
    <div className="consent-section">
      <h3>Parental Consent Required</h3>
      <p>
        This dancer is under 13 years old. Federal law (COPPA) requires
        parental consent to collect personal information from children.
      </p>

      <label>
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          required
        />
        I am the parent or legal guardian of {firstName} {lastName}, and I
        consent to the collection and processing of their personal information
        for competition registration and related purposes as described in the{' '}
        <a href="/privacy" target="_blank">Privacy Policy</a>.
      </label>

      <p className="text-sm text-gray-600">
        By checking this box, you acknowledge that you have read and understood
        how we collect, use, and protect your child's information.
      </p>
    </div>
  )}
  ```

- [ ] Update dancer creation mutation:
  ```typescript
  // src/server/routers/dancer.ts
  export const dancerRouter = t.router({
    create: protectedProcedure
      .input(z.object({
        first_name: z.string(),
        last_name: z.string(),
        date_of_birth: z.date(),
        parent_consent_given: z.boolean().optional(),
        // ... other fields
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate age
        const age = calculateAge(input.date_of_birth);

        // Require consent for minors under 13
        if (age < 13 && !input.parent_consent_given) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Parental consent required for dancers under 13 years old',
          });
        }

        const dancer = await prisma.dancers.create({
          data: {
            ...input,
            parent_consent_timestamp: input.parent_consent_given ? new Date() : null,
            parent_consent_ip: ctx.req?.ip || null,
            parent_consent_method: 'online',
          },
        });

        // Log consent
        if (input.parent_consent_given) {
          await prisma.activity_logs.create({
            data: {
              user_id: ctx.userId,
              action: 'parental_consent_given',
              details: `Consent given for dancer ${dancer.id} (age ${age})`,
              timestamp: new Date(),
            },
          });
        }

        return dancer;
      }),
  });
  ```

- [ ] Create consent verification report:
  ```typescript
  // src/server/routers/admin.ts
  export const adminRouter = t.router({
    getMinorsWithoutConsent: adminProcedure.query(async ({ ctx }) => {
      const today = new Date();
      const thirteenYearsAgo = new Date(
        today.getFullYear() - 13,
        today.getMonth(),
        today.getDate()
      );

      const minorsWithoutConsent = await prisma.dancers.findMany({
        where: {
          date_of_birth: { gt: thirteenYearsAgo },
          parent_consent_given: false,
        },
        include: {
          studios: true,
        },
      });

      return minorsWithoutConsent;
    }),
  });
  ```

- [ ] Create admin UI for consent tracking:
  ```typescript
  // src/app/dashboard/admin/parental-consent/page.tsx
  'use client';

  export default function ParentalConsentPage() {
    const { data: minors } = trpc.admin.getMinorsWithoutConsent.useQuery();

    return (
      <div>
        <h1>Parental Consent Tracking</h1>

        {minors && minors.length > 0 && (
          <div className="alert alert-warning">
            <p>⚠️ {minors.length} minors registered without parental consent</p>
            <p>These dancers cannot participate until consent is obtained.</p>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Dancer Name</th>
              <th>Age</th>
              <th>Studio</th>
              <th>Consent Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {minors?.map((dancer) => (
              <tr key={dancer.id}>
                <td>{dancer.first_name} {dancer.last_name}</td>
                <td>{calculateAge(dancer.date_of_birth)}</td>
                <td>{dancer.studios.name}</td>
                <td>
                  {dancer.parent_consent_given ? (
                    <span className="badge badge-success">Consent Given</span>
                  ) : (
                    <span className="badge badge-warning">Pending</span>
                  )}
                </td>
                <td>
                  <button onClick={() => emailParent(dancer)}>
                    Email Parent
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  ```

- [ ] Create email template for consent follow-up:
  ```typescript
  // src/lib/email-templates/parental-consent.tsx
  import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

  export function ParentalConsentEmail({ dancerName, parentName, consentUrl }) {
    return (
      <Html>
        <Head />
        <Body>
          <Container>
            <Text>Dear {parentName},</Text>

            <Text>
              Your child, {dancerName}, has been registered for a dance competition
              through CompPortal. Federal law requires parental consent to collect
              personal information from children under 13 years old.
            </Text>

            <Text>
              Please click the link below to review our privacy policy and provide
              your consent:
            </Text>

            <Button href={consentUrl}>
              Provide Parental Consent
            </Button>

            <Text>
              If you have any questions, please contact us at support@compsync.net.
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }
  ```

- [ ] Test consent workflow:
  - Create dancer under 13 without consent → should fail
  - Create dancer under 13 with consent → should succeed
  - Create dancer over 13 → no consent required
  - Verify consent timestamp and IP logged
  - Verify audit log created

- [ ] Document in `docs/operations/PARENTAL_CONSENT.md`:
  - Legal requirements (COPPA)
  - Consent workflow
  - How to track minors
  - Email template
  - Verification report

**Files Created:**
- `prisma/migrations/XXXXXX_add_parental_consent/migration.sql`
- `src/components/DancerForm.tsx` (modify)
- `src/server/routers/dancer.ts` (modify)
- `src/server/routers/admin.ts` (extend)
- `src/app/dashboard/admin/parental-consent/page.tsx`
- `src/lib/email-templates/parental-consent.tsx`
- `docs/operations/PARENTAL_CONSENT.md`

**Success Criteria:**
- [ ] Consent checkbox added to dancer form
- [ ] Backend validation enforces consent for <13
- [ ] Admin can track minors without consent
- [ ] Email template created
- [ ] Audit logging working

---

### Phase 4 Success Criteria

✅ **Compliance:**
- [ ] Data retention policy documented and implemented
- [ ] Parental consent workflow functional
- [ ] Anonymization tested and working
- [ ] Admin UI for compliance tracking

✅ **Documentation:**
- [ ] `docs/operations/DATA_RETENTION.md` complete
- [ ] `docs/operations/PARENTAL_CONSENT.md` complete
- [ ] Privacy policy draft created (needs legal review)

✅ **Legal Prep:**
- [ ] User/legal team consulted on retention policy
- [ ] Consent workflow approved
- [ ] Next steps documented (attorney review)

✅ **No Regressions:**
- [ ] Build passes
- [ ] Existing dancer creation works
- [ ] No impact on existing features

---

### Phase 4 Deliverables

**For User Review:**
1. Data retention policy (needs approval)
2. Parental consent workflow (functional)
3. Admin dashboards (retention + consent tracking)
4. Privacy policy draft (needs legal review)
5. Recommendations for attorney consultation

**Commit Message:**
```
feat: Compliance and legal prep - data retention + parental consent (Phase 4)

Compliance Features:
1. Data Retention System
   - Automated anonymization after 90 days
   - Configurable retention periods per data type
   - Preserves financial records (7 years)
   - Daily cron job (Vercel Cron)
   - Admin UI for manual execution
   - Audit logging for all anonymizations

2. Parental Consent Workflow
   - Required for dancers under 13 (COPPA compliance)
   - Consent checkbox in dancer form
   - Backend validation enforces consent
   - Logs timestamp, IP, and method
   - Admin tracking dashboard
   - Email template for consent requests

3. Documentation
   - Data retention policy documented
   - Parental consent procedures
   - Privacy policy draft (needs legal review)

Admin Tools:
- /dashboard/admin/data-retention - Manage retention
- /dashboard/admin/parental-consent - Track minors

Legal: Requires attorney review before production launch

✅ Build pass
✅ Tests pass
🤖 Claude Code
```

---

## Phase 5: Multi-Tenant Architecture 🏢
**Duration:** 56 hours (1.5 weeks)
**Risk:** 🔴 HIGH (previously rolled back, complex changes)
**Impact:** 🔥 CRITICAL (required for 2nd client)
**Supervision:** ❌ REQUIRES CLOSE SUPERVISION

### Why Last?
- Highest risk (previously rolled back in PROJECT_STATUS.md:118-127)
- Most complex changes (touches all routers)
- All safety nets now in place (monitoring, backups, runbooks)
- Can test thoroughly with Phases 1-4 monitoring

### Prerequisites Before Starting
- [ ] All Phases 1-4 complete and stable
- [ ] No critical issues in production
- [ ] Backup tested successfully
- [ ] User available for supervision and testing
- [ ] Rollback plan approved

### Strategy
- Feature flag to enable/disable multi-tenant
- Incremental implementation (one router at a time)
- Extensive testing between steps
- Can rollback at any point

**DETAILED PLAN OMITTED - REQUIRES USER SUPERVISION**

This phase will be planned in detail when user is ready to supervise. Given the previous rollback and complexity, this should NOT be executed autonomously.

---

## Summary: What Can Run Unsupervised in Next 24 Hours

### ✅ Phase 1: Monitoring (8 hours) - SAFE TO RUN
- Sentry setup
- UptimeRobot configuration
- Vercel Analytics
- Enhanced logging

**Why safe:**
- Read-only additions
- No logic changes
- Instant rollback possible
- Makes everything else safer

**Recommendation:** START HERE

---

### ✅ Phase 2: Security (12 hours) - CAN RUN WITH TESTING
- Replace xlsx package
- Fix WebSocket auth

**Why mostly safe:**
- Monitoring from Phase 1 will catch issues
- Comprehensive testing included
- Only touches 2 features (CSV import, WebSocket)
- Rollback plan included

**Recommendation:** RUN AFTER PHASE 1

---

### ✅ Phase 3: Resilience (16 hours) - SAFE TO RUN
- Backup testing
- Disaster recovery runbook
- Rate limiting

**Why safe:**
- Mostly documentation
- Rate limiting is additive
- No breaking changes

**Recommendation:** RUN AFTER PHASE 2

---

### ⚠️ Phase 4: Compliance (24 hours) - PARTIAL SUPERVISION
- Data retention policy (NEEDS APPROVAL)
- Parental consent workflow

**Why needs input:**
- Retention policy requires legal approval
- Consent wording may need review

**Recommendation:** Can implement, but needs user review before production

---

### ❌ Phase 5: Multi-Tenant (56 hours) - REQUIRES FULL SUPERVISION
- Complex, previously rolled back
- Touches all routers
- High risk of breaking changes

**Recommendation:** DO NOT START without user supervision

---

## Execution Order for Unsupervised Work (Next 24 Hours)

**Hour 0-8: Phase 1** (Monitoring)
1. Sentry setup (4h)
2. UptimeRobot (1h)
3. Analytics (2h)
4. Logging (1h)

**Hour 8-20: Phase 2** (Security)
1. Replace xlsx (4h)
2. WebSocket auth (8h)

**Total: 20 hours of safe, high-impact work**

After 24 hours, user reviews results and approves Phase 3.

---

**End of Phased Implementation Plan**
