# Proactive Security Strategy - Preventing Future Breaches

**Date:** November 12, 2025
**Context:** Lessons learned from SD data breach incident

---

## What Went Wrong (Root Cause Analysis)

### The Breach Pattern
```typescript
// VULNERABLE PATTERN
if (isStudioDirector(ctx.userRole) && ctx.studioId) {
  where.studio_id = ctx.studioId;
}
// If studioId is NULL → condition FALSE → filter SKIPPED → data leak
```

### Why It Wasn't Caught Earlier
1. ❌ No test case for "SD user with NULL studioId"
2. ❌ No monitoring for role mismatches (role='SD' but studioId=NULL)
3. ❌ No automated security audit for filter bypass patterns
4. ❌ Database trigger changed behavior without code review
5. ❌ No alerting when SD accessed data outside their studio

---

## 1. Automated Security Testing (HIGH PRIORITY)

### A. Unit Tests for Edge Cases

**Create:** `CompPortal/src/__tests__/security/role-isolation.test.ts`

```typescript
/**
 * Security Test Suite: Role-Based Access Control
 * Tests edge cases that could lead to data leaks
 */

describe('Security: Role Isolation', () => {
  describe('Studio Director with NULL studioId', () => {
    it('should BLOCK getAll queries when studioId is NULL', async () => {
      const mockCtx = {
        userRole: 'studio_director',
        tenantId: EMPWR_TENANT_ID,
        studioId: null, // ← EDGE CASE
      };

      await expect(
        reservationRouter.getAll({ ctx: mockCtx, input: {} })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should BLOCK dancer queries when studioId is NULL', async () => {
      const mockCtx = {
        userRole: 'studio_director',
        tenantId: EMPWR_TENANT_ID,
        studioId: null, // ← EDGE CASE
      };

      await expect(
        dancerRouter.getAll({ ctx: mockCtx, input: {} })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should NOT return EMPWR data when tenantId is Glow', async () => {
      const mockCtx = {
        userRole: 'studio_director',
        tenantId: GLOW_TENANT_ID,
        studioId: GLOW_STUDIO_ID,
      };

      const result = await dancerRouter.getAll({ ctx: mockCtx });

      // Verify NO dancers from EMPWR tenant
      const empwrDancers = result.dancers.filter(
        d => d.tenant_id === EMPWR_TENANT_ID
      );
      expect(empwrDancers).toHaveLength(0);
    });
  });

  describe('Orphaned User Profiles', () => {
    it('should BLOCK users with role but no linked studio', async () => {
      // Simulate user with role='studio_director' but no studio.owner_id link
      const orphanedUser = await createOrphanedUser({
        role: 'studio_director',
        tenant_id: EMPWR_TENANT_ID,
        // No studio linked
      });

      const mockCtx = {
        userId: orphanedUser.id,
        userRole: 'studio_director',
        tenantId: EMPWR_TENANT_ID,
        studioId: null, // ← No studio found
      };

      await expect(
        reservationRouter.getAll({ ctx: mockCtx })
      ).rejects.toThrow('FORBIDDEN');
    });
  });
});
```

**Run frequency:** Every commit (CI/CD pipeline)

---

### B. Integration Tests for Auth Flows

**Create:** `CompPortal/src/__tests__/security/auth-flow.test.ts`

```typescript
describe('Security: Complete Auth Flow', () => {
  it('should prevent premature role assignment during signup', async () => {
    // 1. User signs up
    const { userId } = await signupUser({
      email: 'test@studio.com',
      password: 'password',
      tenant_id: EMPWR_TENANT_ID,
    });

    // 2. Check user_profiles immediately after signup
    const profile = await getUserProfile(userId);

    // ✅ Should have tenant_id
    expect(profile.tenant_id).toBe(EMPWR_TENANT_ID);

    // ✅ Should NOT have role yet (NULL until claim)
    expect(profile.role).toBeNull();

    // 3. Try to access SD-only data
    const mockCtx = {
      userId,
      userRole: null, // ← No role yet
      tenantId: EMPWR_TENANT_ID,
      studioId: null,
    };

    // ✅ Should be blocked from SD endpoints
    await expect(
      reservationRouter.getAll({ ctx: mockCtx })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('should properly set role and tenant_id after claim', async () => {
    // 1. User signs up
    const { userId } = await signupUser({
      email: 'test@studio.com',
      tenant_id: EMPWR_TENANT_ID,
    });

    // 2. User claims studio
    await claimStudio({
      userId,
      studioId: TEST_STUDIO_ID,
    });

    // 3. Verify role and tenant_id are set
    const profile = await getUserProfile(userId);
    expect(profile.role).toBe('studio_director');
    expect(profile.tenant_id).toBe(EMPWR_TENANT_ID);

    // 4. Verify studio is linked
    const studio = await getStudio(TEST_STUDIO_ID);
    expect(studio.owner_id).toBe(userId);
  });
});
```

---

### C. Automated Security Audit Script

**Create:** `CompPortal/scripts/security-audit.ts`

```typescript
/**
 * Automated Security Audit
 * Scans codebase for vulnerable patterns
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface SecurityIssue {
  file: string;
  line: number;
  pattern: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
}

const VULNERABLE_PATTERNS = [
  {
    // Pattern that caused the breach
    pattern: /if\s*\(\s*isStudioDirector\([^)]+\)\s*&&\s*ctx\.studioId\s*\)/g,
    severity: 'CRITICAL',
    description: 'Vulnerable pattern: NULL studioId bypasses filter. Use explicit NULL check.',
  },
  {
    // Missing tenant_id filter
    pattern: /findMany\(\s*\{\s*where:\s*\{[^}]*\}\s*\}\s*\)/g,
    severity: 'HIGH',
    description: 'Query missing tenant_id filter. Verify multi-tenant isolation.',
    validator: (code: string) => !code.includes('tenant_id'),
  },
  {
    // Public procedure with sensitive data
    pattern: /publicProcedure.*\.query.*studios|dancers|entries/g,
    severity: 'MEDIUM',
    description: 'Public procedure accessing sensitive data. Should use protectedProcedure?',
  },
];

async function auditFile(filePath: string): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  VULNERABLE_PATTERNS.forEach((vulnPattern) => {
    lines.forEach((line, index) => {
      if (vulnPattern.pattern.test(line)) {
        if (!vulnPattern.validator || vulnPattern.validator(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            pattern: vulnPattern.pattern.toString(),
            severity: vulnPattern.severity,
            description: vulnPattern.description,
          });
        }
      }
    });
  });

  return issues;
}

async function runAudit() {
  const routersPath = join(__dirname, '../src/server/routers');
  const files = readdirSync(routersPath).filter(f => f.endsWith('.ts'));

  const allIssues: SecurityIssue[] = [];

  for (const file of files) {
    const filePath = join(routersPath, file);
    const issues = await auditFile(filePath);
    allIssues.push(...issues);
  }

  // Report results
  console.log('\n🔍 Security Audit Results\n');

  const critical = allIssues.filter(i => i.severity === 'CRITICAL');
  const high = allIssues.filter(i => i.severity === 'HIGH');
  const medium = allIssues.filter(i => i.severity === 'MEDIUM');

  console.log(`CRITICAL: ${critical.length}`);
  console.log(`HIGH: ${high.length}`);
  console.log(`MEDIUM: ${medium.length}\n`);

  if (allIssues.length > 0) {
    allIssues.forEach(issue => {
      console.log(`[${issue.severity}] ${issue.file}:${issue.line}`);
      console.log(`  ${issue.description}\n`);
    });

    // Fail CI if critical issues found
    if (critical.length > 0) {
      process.exit(1);
    }
  } else {
    console.log('✅ No security issues found');
  }
}

runAudit();
```

**Usage:**
```bash
npm run security-audit  # Run manually
```

**CI Integration:** Add to GitHub Actions:
```yaml
- name: Security Audit
  run: npm run security-audit
```

---

## 2. Database Monitoring & Alerting (HIGH PRIORITY)

### A. Anomaly Detection Query

**Create:** `CompPortal/scripts/detect-anomalies.sql`

```sql
-- Detect users with suspicious role/studio combinations
-- Run this query daily via cron job

-- ANOMALY 1: Studio Directors with NULL studioId
SELECT
  au.email,
  up.role,
  up.tenant_id,
  s.id as studio_id,
  '🚨 SD with no studio' as anomaly
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
LEFT JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND s.id IS NULL;

-- ANOMALY 2: Studio Directors with NULL tenant_id
SELECT
  au.email,
  up.role,
  up.tenant_id,
  s.tenant_id as studio_tenant_id,
  '🚨 SD with NULL tenant_id' as anomaly
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
LEFT JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND up.tenant_id IS NULL;

-- ANOMALY 3: Tenant mismatch between profile and studio
SELECT
  au.email,
  up.role,
  up.tenant_id as profile_tenant,
  s.tenant_id as studio_tenant,
  '🚨 Tenant mismatch' as anomaly
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND up.tenant_id != s.tenant_id;

-- ANOMALY 4: Users with studio_director role but created recently without claim
SELECT
  au.email,
  up.role,
  au.created_at,
  s.invited_at,
  '🚨 Recent SD without claim' as anomaly
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
LEFT JOIN studios s ON s.owner_id = au.id
WHERE up.role = 'studio_director'
  AND s.id IS NULL
  AND au.created_at > NOW() - INTERVAL '7 days';
```

**Alerting:** Send daily email with results to SA

---

### B. Real-Time Monitoring

**Create:** Supabase Database Webhook

```sql
-- Function to detect and alert on suspicious queries
CREATE OR REPLACE FUNCTION log_suspicious_query()
RETURNS TRIGGER AS $$
BEGIN
  -- Log if SD accesses data without studio_id filter
  IF NEW.query_text LIKE '%studios%'
     OR NEW.query_text LIKE '%dancers%'
     OR NEW.query_text LIKE '%reservations%' THEN

    -- Check if user is SD
    DECLARE
      user_role TEXT;
    BEGIN
      SELECT role INTO user_role
      FROM user_profiles
      WHERE id = NEW.user_id;

      IF user_role = 'studio_director' THEN
        -- Alert if query doesn't filter by studio_id
        IF NEW.query_text NOT LIKE '%studio_id%' THEN
          INSERT INTO security_alerts (
            user_id,
            alert_type,
            severity,
            description,
            metadata
          ) VALUES (
            NEW.user_id,
            'suspicious_query',
            'HIGH',
            'SD executed query without studio_id filter',
            jsonb_build_object(
              'query', NEW.query_text,
              'timestamp', NOW()
            )
          );
        END IF;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to query logs (if using pg_stat_statements)
```

---

## 3. Security-First Code Review Checklist

### Mandatory Checklist for All PRs

**Create:** `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Security Review Checklist

Before merging, verify:

### Role-Based Access Control
- [ ] All queries filter by `tenant_id` (if multi-tenant table)
- [ ] Studio Director queries filter by `ctx.studioId`
- [ ] **CRITICAL:** SD role checks have explicit NULL checks:
  ```typescript
  if (isStudioDirector(ctx.userRole)) {
    if (!ctx.studioId) throw FORBIDDEN;
    where.studio_id = ctx.studioId;
  }
  ```
- [ ] Competition Director queries scope by `ctx.tenantId`

### Authentication & Authorization
- [ ] Sensitive endpoints use `protectedProcedure` (not `publicProcedure`)
- [ ] User metadata includes `tenant_id` if creating new users
- [ ] Role assignments happen AFTER resource claim (not during signup)

### Data Integrity
- [ ] Foreign keys use RESTRICT (not CASCADE for deletes)
- [ ] Status transitions are validated
- [ ] Database triggers don't change role/tenant_id unexpectedly

### Testing
- [ ] Edge case tested: NULL studioId, NULL tenantId
- [ ] Cross-tenant isolation verified
- [ ] Integration test for complete auth flow

### Database Migrations
- [ ] Migration tested on staging/backup first
- [ ] No data loss or corruption risk
- [ ] Rollback plan documented if risky
```

---

## 4. Regular Security Audits (SCHEDULED)

### Monthly Security Review

**Schedule:** 1st of every month

**Tasks:**
1. Run anomaly detection query (detect-anomalies.sql)
2. Review security_alerts table for patterns
3. Run automated security audit script
4. Check Supabase advisors: `supabase:get_advisors` (security + performance)
5. Review recent commits for security-sensitive changes
6. Update vulnerable pattern list based on new findings

**Owner:** Super Admin

---

### Quarterly Penetration Testing

**Schedule:** Every 3 months

**Scenarios to test:**
1. **Orphaned account attack:** Create user, don't claim, try to access data
2. **Cross-tenant attack:** SD from EMPWR tries to access Glow data
3. **Role escalation:** Try to change own role via API manipulation
4. **Session hijacking:** Test token expiration and refresh security
5. **SQL injection:** Test all user inputs for SQL injection vectors

**Tools:**
- Burp Suite for API testing
- OWASP ZAP for automated scanning
- Manual testing with Playwright MCP

---

## 5. Security-First Architecture Principles

### Principle 1: Explicit > Implicit

❌ **BAD (Implicit):**
```typescript
if (isStudioDirector(ctx.userRole) && ctx.studioId) {
  // Implicit: If FALSE, filter is skipped
  where.studio_id = ctx.studioId;
}
```

✅ **GOOD (Explicit):**
```typescript
if (isStudioDirector(ctx.userRole)) {
  // Explicit: MUST have studioId or FAIL
  if (!ctx.studioId) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  where.studio_id = ctx.studioId;
}
```

### Principle 2: Fail Secure

When in doubt, **deny access** rather than allow.

```typescript
// Default: Deny
let hasAccess = false;

// Explicitly grant access
if (isSuperAdmin(ctx.userRole)) {
  hasAccess = true;
} else if (isCompetitionDirector(ctx.userRole) && ctx.tenantId === resource.tenant_id) {
  hasAccess = true;
} else if (isStudioDirector(ctx.userRole) && ctx.studioId === resource.studio_id) {
  hasAccess = true;
}

if (!hasAccess) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
```

### Principle 3: Defense in Depth

**Multiple layers of protection:**

1. **Database Layer:** Constraints, RLS policies
2. **Backend Layer:** tRPC procedures with auth checks
3. **Code Layer:** Explicit NULL checks, filter validation
4. **Monitoring Layer:** Real-time anomaly detection
5. **Testing Layer:** Automated edge case tests

### Principle 4: Least Privilege

```typescript
// Good: Only grant minimum required access
const studioForSD = await prisma.studios.findUnique({
  where: { id: ctx.studioId },
  select: {
    id: true,
    name: true,
    // DON'T expose: internal_notes, private_notes, profit_margin
  },
});
```

---

## 6. Incident Response Playbook

### When a Security Issue is Reported

**Step 1: Assess Severity (< 5 minutes)**
- P0 CRITICAL: Data breach, active exploit
- P1 HIGH: Potential data leak, no active exploit
- P2 MEDIUM: Security gap, no immediate risk

**Step 2: Immediate Containment (< 15 minutes)**
- P0: Disable affected endpoints immediately
- Run anomaly detection query to identify affected users
- Check logs for evidence of exploitation

**Step 3: Investigation (< 1 hour)**
- Reproduce the issue on production
- Identify root cause (code, database, config)
- Determine scope (how many users affected)
- Check if data was actually accessed (not just possible)

**Step 4: Remediation (< 4 hours)**
- Fix code vulnerabilities
- Apply database migrations if needed
- Verify fix with automated tests
- Deploy to production

**Step 5: Verification (< 1 hour)**
- Test fix on production
- Run security audit script
- Verify no regression

**Step 6: Post-Mortem (< 24 hours)**
- Document what happened
- Update vulnerable pattern list
- Add test case to prevent regression
- Update this playbook if needed

---

## 7. Implementation Priority

### Week 1: HIGH PRIORITY
- [ ] Create security test suite (role-isolation.test.ts)
- [ ] Create automated audit script (security-audit.ts)
- [ ] Add to CI/CD pipeline
- [ ] Create anomaly detection query

### Week 2: MEDIUM PRIORITY
- [ ] Set up daily anomaly detection cron job
- [ ] Create security alerts table
- [ ] Add PR security checklist template
- [ ] Document incident response playbook

### Week 3: LOW PRIORITY
- [ ] Schedule monthly security reviews (calendar)
- [ ] Schedule quarterly pen tests (calendar)
- [ ] Create security dashboard (Grafana/Metabase)
- [ ] Train team on security principles

---

## Success Metrics

**How we'll know this is working:**

1. **Zero undetected role/tenant mismatches** (daily query returns 0 rows)
2. **100% test coverage for security edge cases** (CI enforced)
3. **Security audit runs on every PR** (CI enforced)
4. **< 15 min response time for P0 security issues**
5. **Monthly security reviews completed on schedule**

---

## Resources & Tools

- **Testing:** Jest, Playwright MCP
- **Monitoring:** Supabase Advisors, Custom SQL queries
- **CI/CD:** GitHub Actions
- **Alerting:** Email alerts, Slack webhooks
- **Documentation:** This file (SECURITY_STRATEGY.md)

---

**Last Updated:** November 12, 2025
**Owner:** Super Admin
**Review Schedule:** Monthly
