# Launch Readiness Checklist
**Date:** October 30, 2025
**Launch Target:** Tomorrow (October 31, 2025)
**Overnight Auditor:** Claude

---

## Executive Summary

**Status:** 🟡 CONDITIONAL GO - Critical issues must be addressed

**Overall Assessment:**
- ✅ Database: Backups working, integrity good, tenant isolation verified
- ✅ Performance: Excellent indexing, no N+1 queries
- ✅ Documentation: Core business logic well-documented
- 🔴 Security: **CRITICAL** - 100+ publicProcedure endpoints lack tenant checks
- 🔴 Data Integrity: **CRITICAL** - Capacity ledger out of sync (-1020 discrepancy)
- 🟡 Code Quality: 57 files with console.log, 15 TODOs

**Launch Recommendation:** **CONDITIONAL GO** with P0 mitigation plan

---

## P0 - LAUNCH BLOCKERS (Must Fix Before Production)

### 🔴 CRITICAL: Multi-Tenant Security Vulnerabilities

**Risk:** Cross-tenant data access via UUID enumeration, unauthorized competition modifications

**Files Affected:**
- `src/server/routers/competition.ts` - Lines 295+ (create), 341+ (update), 460+ (cancel)
- `src/server/routers/reservation.ts` - Lines 207-262 (getById), 265-294 (getByStudio), 297-333 (getByCompetition)
- `src/server/routers/entry.ts` - Lines 796-830 (getByStudio), 1241+ (update), 1360+ (cancel)
- `src/server/routers/dancer.ts` - Lines 115+ (getById), 158+ (getByStudio)
- `src/server/routers/analytics.ts` - All endpoints (business intel leak)

**Required Actions:**
1. Add `tenant_id` filter to ALL queries:
```typescript
const where: any = { tenant_id: ctx.tenantId };
```

2. Convert critical mutations to `protectedProcedure`:
```typescript
// BEFORE
create: publicProcedure.input(...).mutation(...)

// AFTER
create: protectedProcedure.input(...).mutation(async ({ ctx, input }) => {
  if (!['competition_director', 'super_admin'].includes(ctx.userRole)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  // ... ensure ctx.tenantId in all queries
})
```

3. Test cross-tenant isolation:
```typescript
// Login as Tenant A, try to access Tenant B's data
await trpc.reservation.getById.query({ id: "tenant-b-uuid" });
// Should throw FORBIDDEN or return null
```

**Estimated Fix Time:** 4-6 hours
**Business Impact if NOT fixed:** Legal liability, client trust destroyed, competition failure

**Mitigation Strategy (If Can't Fix Before Launch):**
- Monitor logs for cross-tenant access attempts
- Rate limit all publicProcedure endpoints
- Add IP allowlisting for known clients
- WARN clients about limited security

**Reference:** `SECURITY_AUDIT_2025-10-30.md`

---

### 🔴 CRITICAL: Capacity Ledger Discrepancy

**Risk:** Capacity numbers don't match reality, may block valid reservations or allow over-booking

**Discrepancies Found:**
| Competition | Available | Should Be | Discrepancy | Impact |
|-------------|-----------|-----------|-------------|--------|
| St. Catharines #1 | 90 | 1110 | **-1020** 🔴 | May reject valid bookings |
| QA Automation | 499 | 701 | -202 | May reject valid bookings |
| London | 545 | 605 | -60 | May reject valid bookings |
| St. Catharines #2 | 586 | 614 | -28 | May reject valid bookings |

**Root Cause:** Dual-write bugs in old capacity code (field updated without ledger, or vice versa)

**Required Actions:**
1. **DO NOT** manually fix capacity numbers before launch
2. **DO** monitor for "insufficient capacity" errors
3. **DO** document discrepancies for studios
4. Post-launch (Week 1): Implement `CAPACITY_REWRITE_PLAN.md` (5.5 hours)

**Immediate Monitoring:**
```sql
-- Alert on capacity discrepancies > 50
SELECT
  c.name,
  c.available_reservation_tokens as actual,
  c.total_reservation_tokens - COALESCE(SUM(cl.change_amount), 0) as calculated,
  ABS(c.available_reservation_tokens - (c.total_reservation_tokens - COALESCE(SUM(cl.change_amount), 0))) as discrepancy
FROM competitions c
LEFT JOIN capacity_ledger cl ON cl.competition_id = c.id
GROUP BY c.id
HAVING discrepancy > 50;
```

**Workaround for Studios:** If they report "no capacity" but you know capacity exists, manually approve via Competition Director panel

**Reference:** `DATABASE_HEALTH_AUDIT_2025-10-30.md`

---

### 🟡 HIGH: Console.log Statements in Production

**Risk:** Performance impact, log bloat, potential data leaks in logs

**Critical Files:**
- `src/server/routers/reservation.ts:748-817` - 9 email debug statements
- `src/server/routers/tenantDebug.ts` - Testing code
- `src/lib/email.ts` - Email debugging
- `src/lib/two-factor.ts` - Auth debugging

**Required Action:**
```typescript
// FIND:
console.log('[EMAIL DEBUG] Starting email flow...', { data });

// REPLACE WITH:
logger.debug('Starting email flow', { data });

// OR REMOVE entirely if debugging complete
```

**Estimated Fix Time:** 30 minutes (9 statements in reservation.ts)

**Mitigation if NOT fixed:** Set `NODE_ENV=production` to suppress dev console.logs (verify NODE_ENV guards exist)

**Reference:** `CODE_QUALITY_AUDIT_2025-10-30.md`

---

### 🟡 HIGH: Unbounded Queries (Pagination Missing)

**Risk:** Performance degradation, memory exhaustion on large datasets

**Files Affected:**
- `src/server/routers/reservation.ts:265-294` - `getByStudio` (no limit)
- `src/server/routers/entry.ts:796-830` - `getByStudio` (no limit)

**Required Action:**
```typescript
const reservations = await prisma.reservations.findMany({
  where: { studio_id: input.studioId, tenant_id: ctx.tenantId },
  orderBy: [{ requested_at: 'desc' }],
  take: 100, // Limit to most recent 100
});
```

**Estimated Fix Time:** 30 minutes

**Reference:** `PERFORMANCE_AUDIT_2025-10-30.md`

---

## P1 - HIGH PRIORITY (Week 1 Post-Launch)

### 1. Implement Redis Caching for Lookup Tables

**Opportunity:** 40-50% reduction in database load

**Implementation:**
```typescript
// Cache rarely-changing reference data
getCategories: publicProcedure.query(async () => {
  return redis.cached('categories', () =>
    prisma.dance_categories.findMany(),
    3600 // 1 hour TTL
  );
});
```

**Estimated Time:** 2 hours
**Expected Impact:** Significant DB load reduction

**Reference:** `PERFORMANCE_AUDIT_2025-10-30.md:159-176`

---

### 2. Capacity System Rewrite

**Goal:** Eliminate discrepancies, ensure atomic operations with audit trail

**Implementation Plan:** See `CAPACITY_REWRITE_PLAN.md`
- Estimated Time: 5.5 hours
- Adds PostgreSQL advisory locks
- Single service for all capacity changes
- Ledger as source of truth

**Reference:** `DATABASE_HEALTH_AUDIT_2025-10-30.md:144-162`

---

### 3. Add Response Time Monitoring

**Goal:** Identify slow queries in production

**Implementation:**
```typescript
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();

  if (after - before > 100) {
    logger.warn('Slow query detected', {
      model: params.model,
      action: params.action,
      duration: after - before,
    });
  }

  return result;
});
```

**Estimated Time:** 1 hour

**Reference:** `PERFORMANCE_AUDIT_2025-10-30.md:332-349`

---

### 4. Convert All Console.* to Logger.*

**Goal:** Structured logging with levels, can be sent to monitoring

**Implementation:**
```bash
# Find all console statements
grep -r "console\." src/server --exclude-dir=node_modules

# Convert to logger
console.log → logger.info
console.error → logger.error
console.warn → logger.warn
console.debug → logger.debug (NODE_ENV gated)
```

**Estimated Time:** 2 hours (57 files)

**Reference:** `CODE_QUALITY_AUDIT_2025-10-30.md:46-66`

---

### 5. Add JSDoc to publicProcedure Mutations

**Goal:** Document why endpoints are public vs protected

**Example:**
```typescript
/**
 * Create new competition
 *
 * @permission competition_director or super_admin only
 * @sideEffect Creates default age groups, categories, classifications
 * @validation Requires valid tenant_id in context
 */
create: protectedProcedure
  .input(competitionInputSchema)
  .mutation(async ({ ctx, input }) => {
```

**Estimated Time:** 2 hours

**Reference:** `DOCUMENTATION_AUDIT_2025-10-30.md:81-98`

---

### 6. Add Startup Environment Variable Validation

**Goal:** Fail fast if critical vars missing

**Implementation:**
```typescript
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

**Estimated Time:** 1 hour

**Reference:** `CODE_QUALITY_AUDIT_2025-10-30.md:113-137`

---

## P2 - MEDIUM PRIORITY (Ongoing)

### 1. Resolve Scoring TODOs

**Issue:** Scoring endpoints are publicProcedure, should require judge auth

```typescript
// scoring.ts:18-19
// TODO: Replace publicProcedure with protectedProcedure once auth middleware is implemented
// TODO: Get judge_id from auth context instead of requiring it as input
```

**Estimated Time:** 3 hours (depends on auth system)

**Reference:** `CODE_QUALITY_AUDIT_2025-10-30.md:145-151`

---

### 2. Add ESLint Rule to Prevent Console Statements

**Goal:** Catch console.log in CI/CD before merge

```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

**Estimated Time:** 30 minutes

**Reference:** `CODE_QUALITY_AUDIT_2025-10-30.md:219-226`

---

### 3. Implement Row-Level Security (RLS) in Supabase

**Goal:** Defense-in-depth for multi-tenant isolation

**Estimated Time:** 4 hours
**Benefit:** Catch cross-tenant bugs at database level

**Reference:** `SECURITY_AUDIT_2025-10-30.md:199`

---

### 4. Add Query Result Caching in tRPC Middleware

**Goal:** Cache GET requests for 30-60s

**Estimated Time:** 3 hours

**Reference:** `PERFORMANCE_AUDIT_2025-10-30.md:289-292`

---

## Testing Checklist (Before Launch)

### Manual Tests (REQUIRED)

- [ ] **Test 1: Cross-Tenant Isolation**
  - Login as EMPWR user (`danieljohnabrahamson@gmail.com`)
  - Try to access Glow competition via direct UUID
  - Expected: Forbidden or empty result
  - Currently: **LIKELY FAILS** - Fix P0 security issues first

- [ ] **Test 2: Capacity Reservation**
  - Create reservation for St. Catharines #1 (has -1020 discrepancy)
  - Verify capacity check uses `available_reservation_tokens` field
  - Document if "insufficient capacity" error occurs (false positive)

- [ ] **Test 3: Studio Registration Flow**
  - Register new studio on Glow tenant
  - Submit reservation for competition
  - Verify tenant_id correctly set
  - Verify data invisible to EMPWR tenant

- [ ] **Test 4: Payment Processing (Critical)**
  - Submit test payment via Stripe
  - Verify invoice generation
  - Verify email notifications
  - Verify payment status updates

- [ ] **Test 5: Email Deliverability**
  - Send test emails for all triggers:
    - Reservation approved
    - Reservation rejected
    - Summary submitted
    - Invoice generated
  - Verify SPF/DKIM configured
  - Check spam folder placement

### Smoke Tests (After Deploy)

- [ ] Homepage loads (both tenants)
- [ ] Login works (both user types)
- [ ] Dashboard renders (no console errors)
- [ ] Database queries respond <200ms
- [ ] Vercel deployment healthy
- [ ] No errors in Vercel logs (first 5 minutes)

---

## Database Backup Status

**Status:** ✅ EXCELLENT

**Schedule:** 3x daily (2 AM, 11 AM, 7 PM EST)
**Retention:** 30 days (90 backups)
**Storage:** ~29MB total
**Last Backup:** October 30, 2025 03:38 UTC (320KB compressed from 6MB)

**Verification:**
- ✅ All 71 tables backed up
- ✅ Safe restoration flags configured
- ✅ Automated via GitHub Actions
- ✅ Backups tested for completeness

**Reference:** `.github/workflows/database-backup.yml`

---

## Performance Metrics

| Metric | Status | Notes |
|--------|--------|-------|
| Database Indexing | ✅ EXCELLENT | 160+ indexes, comprehensive coverage |
| N+1 Queries | ✅ PASS | No patterns found |
| Data Fetching | ✅ GOOD | Good use of select/include |
| Caching | 🟡 POOR | Configured but not used (P1 opportunity) |
| Query Limits | 🟡 FAIR | Some unbounded queries (P0 fix) |
| Transaction Usage | ✅ GOOD | Atomic with timeouts |

**Reference:** `PERFORMANCE_AUDIT_2025-10-30.md`

---

## Security Metrics

| Category | Status | Priority |
|----------|--------|----------|
| Critical Mutations (publicProcedure) | 🔴 FAIL | P0 |
| Data Access (no tenant filter) | 🔴 FAIL | P0 |
| Analytics (business intel leak) | 🟡 WARN | P1 |
| Reference Data (lookup tables) | 🟢 PASS | P2 |
| Hardcoded Secrets | ✅ PASS | - |
| Environment Variables | ✅ PASS | - |

**Reference:** `SECURITY_AUDIT_2025-10-30.md`

---

## Documentation Quality

| Category | Status | Notes |
|----------|--------|-------|
| Critical Business Logic | ✅ GOOD | capacity.ts, submitSummary well-documented |
| tRPC Procedures | 🟡 FAIR | Some lack JSDoc, especially publicProcedure |
| Inline Comments | ✅ GOOD | Good use of emoji markers, guard explanations |
| Spec References | ✅ EXCELLENT | Phase 1 spec referenced throughout |
| Error Messages | ✅ GOOD | User-friendly with business context |
| Type Definitions | ✅ EXCELLENT | Zod schemas well-named |

**Reference:** `DOCUMENTATION_AUDIT_2025-10-30.md`

---

## Estimated Fix Time Summary

**P0 (Launch Blockers):**
- Multi-tenant security fixes: 4-6 hours
- Console.log cleanup (critical files): 30 minutes
- Add pagination limits: 30 minutes
- **Total P0: 5-7 hours**

**P1 (Week 1):**
- Redis caching: 2 hours
- Capacity system rewrite: 5.5 hours
- Response time monitoring: 1 hour
- Console.log conversion (all files): 2 hours
- JSDoc documentation: 2 hours
- Env var validation: 1 hour
- **Total P1: 13.5 hours**

**P2 (Ongoing):**
- Scoring auth: 3 hours
- ESLint rules: 30 minutes
- Row-level security: 4 hours
- tRPC caching middleware: 3 hours
- **Total P2: 10.5 hours**

---

## Launch Decision Matrix

### Scenario A: Fix ALL P0 Issues (Recommended)
**Timeline:** Launch delayed 1 day (November 1)
**Risk:** LOW
**Confidence:** HIGH
**Recommendation:** ✅ **RECOMMENDED**

### Scenario B: Launch with P0 Mitigation Only
**Timeline:** Launch tomorrow (October 31)
**Risk:** MEDIUM-HIGH
**Mitigation Required:**
- Rate limiting on all publicProcedure endpoints
- IP allowlisting for known clients
- Manual capacity overrides prepared
- 24/7 monitoring enabled
- Rollback plan ready
**Recommendation:** 🟡 **CONDITIONAL GO** (high risk)

### Scenario C: Launch with Known Issues
**Timeline:** Launch tomorrow (October 31)
**Risk:** HIGH
**Mitigation:** Log monitoring only
**Recommendation:** ❌ **NOT RECOMMENDED**

---

## Rollback Plan (If Production Fails)

**Trigger Conditions:**
1. Cross-tenant data leak detected
2. Payment system failure
3. Widespread authentication issues
4. Database corruption

**Rollback Steps:**
1. Disable new registrations (feature flag)
2. Revert to last known good commit via Vercel
3. Restore database from most recent backup
4. Notify clients of temporary maintenance
5. Debug in staging environment
6. Re-deploy with fix + smoke tests

**Backup Restoration:**
```bash
# Download latest backup
gh run download --name backup_20251030_033800.sql.gz

# Restore (STAGING ONLY)
gunzip backup_20251030_033800.sql.gz
psql $STAGING_DATABASE_URL < backup_20251030_033800.sql
```

---

## Monitoring Recommendations (Post-Launch)

### Day 1 Monitoring:
- [ ] Vercel error logs (every 30 minutes)
- [ ] Database query performance (slow queries >100ms)
- [ ] Cross-tenant access attempts (grep logs for "FORBIDDEN")
- [ ] Capacity "insufficient" errors (may be false positives)
- [ ] Email deliverability (check bounce rates)
- [ ] Payment processing success rate

### Week 1 Alerts:
- Slow queries > 1 second
- Error rate > 1% of requests
- Memory usage > 80%
- Database connections > 80% of pool
- Capacity discrepancies > 100 tokens

---

## Launch Day Checklist

**Morning (Before Launch):**
- [ ] Run `npm run build` - verify passes
- [ ] Run `npm run type-check` - verify passes
- [ ] Verify Vercel production deployment healthy
- [ ] Test login on both tenants (EMPWR + Glow)
- [ ] Verify database backups running (check GitHub Actions)
- [ ] Verify email sending works (test on staging)
- [ ] Verify payment processing works (test mode)
- [ ] Review Vercel logs (should be clean)

**During Launch:**
- [ ] Monitor Vercel logs (real-time)
- [ ] Monitor database connections
- [ ] Monitor error rates
- [ ] Stand by for user-reported issues
- [ ] Document any workarounds needed

**Evening (Post-Launch):**
- [ ] Review error logs (categorize issues)
- [ ] Check capacity numbers vs bookings
- [ ] Verify no cross-tenant leaks (SQL query)
- [ ] Verify payment reconciliation
- [ ] Plan P1 fixes for Week 1

---

## Final Recommendation

**Status:** 🟡 **CONDITIONAL GO**

**Recommended Path:**
1. **Option A (Safest):** Delay launch 1 day, fix P0 security issues (5-7 hours)
2. **Option B (Riskier):** Launch with P0 mitigation + 24/7 monitoring

**Critical Success Factors:**
- Multi-tenant isolation MUST be secure (P0)
- Database backups MUST continue working (already verified ✅)
- Payment processing MUST be tested end-to-end
- Rollback plan MUST be ready

**What's Working Well:**
- ✅ Database backups automated and verified
- ✅ Database integrity excellent (no leaks, no orphans)
- ✅ Performance excellent (160+ indexes, no N+1 queries)
- ✅ Core business logic well-documented
- ✅ Tenant isolation proven at database level

**What Needs Attention:**
- 🔴 Multi-tenant security at API level (100+ endpoints)
- 🔴 Capacity ledger discrepancy (-1020 tokens)
- 🟡 Console.log cleanup
- 🟡 Pagination for unbounded queries

**Risk Assessment:**
- **Data Loss Risk:** LOW (excellent backups + referential integrity)
- **Security Risk:** HIGH (publicProcedure without tenant checks)
- **Performance Risk:** LOW (excellent indexing, monitoring needed)
- **Business Continuity Risk:** MEDIUM (capacity discrepancies may block valid bookings)

---

## Overnight Audit Summary

**Reports Generated:**
1. ✅ `SECURITY_AUDIT_2025-10-30.md` - Multi-tenant security analysis
2. ✅ `CODE_QUALITY_AUDIT_2025-10-30.md` - Console.log, TODOs, secrets
3. ✅ `DATABASE_HEALTH_AUDIT_2025-10-30.md` - Integrity, capacity ledger
4. ✅ `DOCUMENTATION_AUDIT_2025-10-30.md` - Code documentation quality
5. ✅ `PERFORMANCE_AUDIT_2025-10-30.md` - Indexes, N+1 queries, caching
6. ✅ `LAUNCH_READINESS_CHECKLIST_2025-10-30.md` - This comprehensive report

**Total Audit Time:** ~6 hours (overnight)

**Key Findings:**
- 2 critical issues (security + capacity)
- 5 high-priority improvements (Week 1)
- 4 medium-priority enhancements (ongoing)
- Overall system architecture is solid
- Database health excellent
- Performance foundations strong

**Next Steps:**
1. Review this checklist with team
2. Decide: Fix P0 issues first (1 day delay) OR launch with mitigation
3. If launching: Enable monitoring, prepare rollback
4. Schedule P1 fixes for Week 1
5. Celebrate launch! 🎉

---

*Generated by Claude Code - Overnight Launch Readiness Audit*
*All audit reports available in CompPortal/ directory*
