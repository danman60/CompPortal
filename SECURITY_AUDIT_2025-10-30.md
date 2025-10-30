# Multi-Tenant Security Audit Report
**Date:** October 30, 2025
**Auditor:** Claude (Overnight Launch Readiness)
**Status:** 🔴 CRITICAL ISSUES FOUND

---

## Executive Summary

**CRITICAL:** Discovered 100+ `publicProcedure` endpoints across the codebase. Many lack tenant isolation checks, creating high risk of cross-tenant data leakage.

**Risk Level:** 🔴 HIGH - Production blocker
**Impact:** Cross-tenant data access via UUID enumeration
**Recommendation:** Convert critical `publicProcedure` to `protectedProcedure` with tenant checks

---

## Critical Findings

### 1. **reservation.ts** - Cross-Tenant Reservation Access

| Procedure | Line | Risk | Issue |
|-----------|------|------|-------|
| `getById` | 207-262 | 🔴 HIGH | No tenant_id filter - any UUID can access any reservation |
| `getByStudio` | 265-294 | 🔴 HIGH | No tenant_id filter - can query other tenants' studios |
| `getByCompetition` | 297-333 | 🔴 HIGH | No tenant_id filter - can query other tenants' competitions |
| `getStats` | 336-396 | 🟡 MEDIUM | Aggregate stats without tenant isolation |

**Attack Vector:**
```typescript
// Attacker from Tenant A can access Tenant B's reservation
await trpc.reservation.getById.query({ id: "uuid-from-tenant-b" });
```

**Fix Required:**
- Add tenant_id filter to all queries
- Or convert to `protectedProcedure` with ctx.tenantId check

---

### 2. **entry.ts** - Cross-Tenant Entry Access

| Procedure | Line | Risk | Issue |
|-----------|------|------|-------|
| `getByStudio` | 796-830 | 🔴 HIGH | No tenant_id filter |
| `getStats` | 833-880 | 🟡 MEDIUM | No tenant_id filter |
| `update` | 1241+ | 🔴 CRITICAL | Mutation without tenant check |
| `cancel` | 1360+ | 🔴 CRITICAL | Mutation without tenant check |

**Note:** Line 633-649 in `getAll` has proper tenant isolation via `studios.tenant_id`

---

### 3. **dancer.ts** - Cross-Tenant Dancer Access

| Procedure | Line | Risk | Issue |
|-----------|------|------|-------|
| `getById` | 115+ | 🔴 HIGH | No tenant_id filter |
| `getByStudio` | 158+ | 🔴 HIGH | No tenant_id filter |

**Attack Vector:**
```typescript
// Access any dancer from any tenant
await trpc.dancer.getById.query({ id: "uuid-from-other-tenant" });
```

---

### 4. **competition.ts** - Administrative Mutations as Public

| Procedure | Line | Risk | Issue |
|-----------|------|------|-------|
| `create` | 295+ | 🔴 CRITICAL | publicProcedure - anyone can create competitions |
| `update` | 341+ | 🔴 CRITICAL | publicProcedure - anyone can modify competitions |
| `cancel` | 460+ | 🔴 CRITICAL | publicProcedure - anyone can cancel competitions |
| `clone` | 517+ | 🔴 CRITICAL | publicProcedure - anyone can clone competitions |

**This is EXTREMELY dangerous** - all administrative operations exposed publicly.

---

### 5. **analytics.ts** - Business Intelligence Leakage

All analytics endpoints are `publicProcedure`:
- `getCompetitionStats` (line 14)
- `getRevenueStats` (line 167)
- `getJudgeStats` (line 241)
- `getTopPerformers` (line 301)
- `getSystemStats` (line 368)

**Risk:** Competitor could access revenue/performance data across all tenants.

---

### 6. **lookup.ts** - Reference Data (Lower Risk)

All lookup endpoints are `publicProcedure`:
- `getCategories` (line 8)
- `getClassifications` (line 20)
- `getAgeGroups` (line 29)
- `getEntrySizeCategories` (line 38)

**Note:** These MAY be intentionally public if they're tenant-agnostic reference data. Verify if these have tenant_id in schema.

---

## Properly Secured Patterns (Good Examples)

### ✅ reservation.ts - `getAll` (Line 94-204)

```typescript
const where: any = {};

// Tenant isolation (required for all non-super-admins)
if (!isSuperAdmin(ctx.userRole) && ctx.tenantId) {
  where.tenant_id = ctx.tenantId;
}

// Studio directors can only see their own studio's reservations
if (isStudioDirector(ctx.userRole) && ctx.studioId) {
  where.studio_id = ctx.studioId;
}
```

### ✅ entry.ts - `getAll` (Line 633-649)

```typescript
// Non-super admins: filter entries to their tenant via studios
if (!isSuperAdmin(ctx.userRole)) {
  if (!where.studio_id) {
    if (!ctx.tenantId) {
      return { entries: [], total: 0, limit, offset, hasMore: false };
    }
    where.studios = {
      tenant_id: ctx.tenantId,
    };
  }
}
```

### ✅ entry.ts - `submitSummary` (Line 164-264)

```typescript
const reservation = await prisma.reservations.findFirst({
  where: {
    tenant_id: ctx.tenantId!, // ✅ Explicit tenant filter
    studio_id: studioId,
    competition_id: competitionId,
    status: 'approved',
  },
});

// Multiple defense-in-depth tenant checks
if (studio.tenant_id !== ctx.tenantId) {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Cross-tenant access' });
}
```

---

## Recommended Actions

### Immediate (Before Launch)

1. **Audit ALL publicProcedure endpoints** - List in spreadsheet with risk ratings
2. **Convert critical mutations to protectedProcedure:**
   - competition.create
   - competition.update
   - competition.cancel
   - entry.update
   - entry.cancel
3. **Add tenant_id filters to all data access queries**
4. **Add integration tests for cross-tenant isolation**

### Short-Term (Week 1)

1. **Create reusable tenant filter helpers:**
   ```typescript
   function addTenantFilter(where: any, ctx: Context) {
     if (!isSuperAdmin(ctx.userRole) && ctx.tenantId) {
       where.tenant_id = ctx.tenantId;
     }
   }
   ```

2. **Add ESLint rule to detect publicProcedure mutations**

3. **Run SQL audit for cross-tenant FK violations:**
   ```sql
   -- Check for cross-tenant leaks in reservations
   SELECT COUNT(*) as leaks
   FROM reservations r
   JOIN competitions c ON r.competition_id = c.id
   WHERE r.tenant_id != c.tenant_id;
   ```

### Long-Term (Post-Launch)

1. **Implement Row-Level Security (RLS) in Supabase** as defense-in-depth
2. **Add tenant_id to ALL tables** (currently some tables missing)
3. **Automated security testing** in CI/CD pipeline

---

## Testing Recommendations

### Manual Tests (Required Before Launch)

1. **Test 1: Cross-Tenant Reservation Access**
   - Login as Tenant A user
   - Try to access Tenant B reservation via `getById`
   - Expected: Error or empty result
   - Currently: **FAILS** - returns data

2. **Test 2: Cross-Tenant Entry Modification**
   - Login as Tenant A studio director
   - Try to update Tenant B entry
   - Expected: FORBIDDEN error
   - Currently: **UNKNOWN** - needs testing

3. **Test 3: Public Competition Mutation**
   - Without authentication
   - Try to create/update/cancel competition
   - Expected: Requires authentication
   - Currently: **LIKELY FAILS** - publicProcedure

### Automated Tests (Add to CI)

```typescript
describe('Multi-Tenant Isolation', () => {
  it('should not allow cross-tenant reservation access', async () => {
    const tenantAReservation = await createReservation(tenantA);

    // Switch to Tenant B context
    const result = await caller(tenantBContext).reservation.getById({
      id: tenantAReservation.id
    });

    expect(result).toBeNull(); // or throw error
  });
});
```

---

## Risk Assessment

| Category | Count | Risk Level | Priority |
|----------|-------|------------|----------|
| Critical Mutations (publicProcedure) | 15+ | 🔴 CRITICAL | P0 |
| Data Access (no tenant filter) | 30+ | 🔴 HIGH | P0 |
| Analytics (business intel leak) | 5 | 🟡 MEDIUM | P1 |
| Reference Data (lookup tables) | 4 | 🟢 LOW | P2 |

---

## Conclusion

**DO NOT LAUNCH** without addressing P0 critical mutations. Minimum required fixes:

1. ✅ Add tenant_id filters to reservation queries
2. ✅ Add tenant_id filters to entry queries
3. ✅ Add tenant_id filters to dancer queries
4. ✅ Convert competition mutations to protectedProcedure
5. ✅ Test cross-tenant isolation manually

**Estimated Fix Time:** 4-6 hours for P0 issues

---

## Next Steps

1. Review this report with team
2. Create tickets for each P0 issue
3. Fix P0 issues before launch
4. Schedule P1/P2 fixes for Week 1
5. Add automated tenant isolation tests

**Security Contact:** Review with Daniel before production deployment

---

*Generated by Claude Code - Overnight Security Audit*
