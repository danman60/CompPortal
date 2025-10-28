# Tenant ID Security Audit

**Date:** October 28, 2025
**Status:** 45+ critical violations identified
**Risk Level:** CRITICAL - Cross-tenant data leakage possible

## Executive Summary

Comprehensive audit of all routers revealed **45+ tenant isolation violations** across the codebase. These violations allow users from one tenant to access, modify, or delete data from other tenants.

**Impact:**
- EMPWR Dance Experience data could be accessed by Glow Dance Competition users and vice versa
- Personal dancer information (names, ages, DOB) exposed across tenants
- Financial data (invoices, payments) potentially accessible cross-tenant
- Competition results and scoring data could be viewed/modified across tenants

## Critical Violations by Category

### Category 1: Public Procedures Without Tenant Filtering (30+ endpoints)

**Risk:** Anyone can access data from any tenant without authentication checks.

#### Reservation Router (reservation.ts)
| Line | Endpoint | Violation | Risk |
|------|----------|-----------|------|
| 200-255 | `getById` | publicProcedure, no tenant_id filter | Access any reservation by ID |
| 258-287 | `getByStudio` | publicProcedure, no tenant_id filter | See all studio reservations across tenants |
| 290-326 | `getByCompetition` | publicProcedure, no tenant_id filter | See all competition reservations |

#### Entry Router (entry.ts)
| Line | Endpoint | Violation | Risk |
|------|----------|-----------|------|
| 768-802 | `getByStudio` | publicProcedure, no tenant_id filter | Access all entries for any studio |
| 1186-1231 | `update` | publicProcedure, no tenant verification | Modify entries from other tenants |
| 1234-1287 | `addParticipant` | publicProcedure, no tenant verification | Add dancers to other tenants' entries |
| 1290-1302 | `removeParticipant` | publicProcedure, no tenant verification | Remove dancers from other tenants |
| 1305-1317 | `cancel` | publicProcedure, no tenant verification | Cancel other tenants' entries |
| 1320-1332 | `confirm` | publicProcedure, no tenant verification | Confirm other tenants' entries |
| 1335-1356 | `updateMusic` | publicProcedure, no tenant verification | Modify music for other tenants |

#### Dancer Router (dancer.ts)
| Line | Endpoint | Violation | Risk |
|------|----------|-----------|------|
| 109-149 | `getById` | publicProcedure, no tenant_id filter | **PII LEAK**: Access any dancer's personal info |
| 152-171 | `getByStudio` | publicProcedure, no tenant_id filter | **PII LEAK**: See all dancers from any studio |

#### Studio Router (studio.ts)
| Line | Endpoint | Violation | Risk |
|------|----------|-----------|------|
| 121-150 | `getById` | publicProcedure, no tenant_id filter | Access any studio's details |
| 260-287 | `update` | publicProcedure, no tenant verification | Modify studios from other tenants |

#### Judge Router (judges.ts)
| Line | Endpoint | Violation | Risk |
|------|----------|-----------|------|
| 108-124 | `getByCompetition` | publicProcedure, no tenant_id filter | See judges from other tenants |
| 129-144 | `getAll` | publicProcedure, no tenant_id filter | **CRITICAL**: Exposes ALL judges across ALL tenants |
| 149-176 | `update` | publicProcedure, no tenant verification | Modify judges from other tenants |
| 180-204 | `delete` | publicProcedure, no tenant verification | Delete judges from other tenants |
| 209-223 | `checkIn` | publicProcedure, no tenant verification | Check in judges for other tenants |

#### Scoring Router (scoring.ts)
| Line | Endpoint | Violation | Risk |
|------|----------|-----------|------|
| 368-393 | `getScoresByEntry` | publicProcedure, no tenant_id filter | See scores from other tenants |
| 402-470 | `getMyScores` | publicProcedure, no tenant_id filter | See judges' scores across tenants |
| 478-513 | `getScoresByCompetition` | publicProcedure, no tenant_id filter | Competition results leaked |
| 521-573 | `getScoreboard` | publicProcedure, no tenant_id filter | Full scoreboards exposed |
| 584-605 | `calculatePlacements` | publicProcedure, no tenant_id filter | Can recalculate other tenants' results |
| 614-662 | `recalculateCompetition` | publicProcedure, no tenant_id filter | Recalculate other tenants' competitions |

#### Invoice Router (invoice.ts)
| Line | Endpoint | Violation | Risk |
|------|----------|-----------|------|
| 545-594 | `sendInvoiceReminder` | publicProcedure, no tenant_id filter | Send reminders for other tenants' invoices |

### Category 2: Missing Tenant Verification in Updates (15+ operations)

**Risk:** Users can modify or delete data from other tenants if they know the UUID.

#### Competition Router (competition.ts)
| Line | Endpoint | Violation | Fix Required |
|------|----------|-----------|--------------|
| 338-387 | `update` | No tenant_id verification | Verify competition.tenant_id === ctx.tenantId |
| 457-469 | `cancel` | No tenant_id verification | Verify before update |
| 514-632 | `clone` | Can clone from other tenants | Verify source competition tenant_id |

#### Reservation Router (reservation.ts)
| Line | Endpoint | Violation | Fix Required |
|------|----------|-----------|--------------|
| 564-629 | `update` | No tenant_id verification | Verify reservation.tenant_id === ctx.tenantId |
| 810-936 | `reject` | No tenant_id verification | Verify before rejection |
| 938-985 | `cancel` | No tenant_id verification | Verify before cancellation |
| 988-1023 | `delete` | No tenant_id verification | Verify before deletion |

#### Studio Router (studio.ts)
| Line | Endpoint | Violation | Fix Required |
|------|----------|-----------|--------------|
| 290-388 | `approve` | No tenant_id verification | Verify studio.tenant_id === ctx.tenantId |
| 390-482 | `reject` | No tenant_id verification | Verify before rejection |

#### Scoring Router (scoring.ts)
| Line | Endpoint | Violation | Fix Required |
|------|----------|-----------|--------------|
| 177-279 | `submitScore` | No cross-entity tenant verification | Verify judge and entry from same tenant |
| 292-360 | `updateScore` | No tenant_id verification | Verify score.tenant_id === ctx.tenantId |

### Category 3: Missing Tenant Filtering in Lookups

**Risk:** Returns global data instead of tenant-scoped data.

#### Lookup Router (lookup.ts)
| Line | Endpoint | Table | Fix Required |
|------|----------|-------|--------------|
| 8-17 | `getCategories` | dance_categories | Add `where: { tenant_id: ctx.tenantId }` |
| 20-26 | `getClassifications` | classifications | Add `where: { tenant_id: ctx.tenantId }` |
| 29-35 | `getAgeGroups` | age_groups | Add `where: { tenant_id: ctx.tenantId }` |
| 38-44 | `getEntrySizeCategories` | entry_size_categories | Add `where: { tenant_id: ctx.tenantId }` |

### Category 4: Hardcoded Tenant IDs (Fixed in this session)

| File | Line | Issue | Status |
|------|------|-------|--------|
| dancer.ts | 258 | Hardcoded EMPWR tenant UUID | ✅ Fixed |
| dancer.ts | 505 | Hardcoded EMPWR tenant UUID | ✅ Fixed |
| dancer.ts | 690 | Hardcoded EMPWR tenant UUID | ✅ Fixed |

## Correct Implementations (Examples to Follow)

### ✅ Competition Router
- Line 676-704: `getTenantSettings` - Correctly filters by tenant_id

### ✅ Invoice Router
- Line 67-77: `getByStudioAndCompetition` - Filters by ctx.tenantId
- Line 331-340: `getByStudio` - Filters by ctx.tenantId
- Line 719-729: `sendInvoice` - Verifies tenant_id after fetch

### ✅ Entry Router (create operation)
- Line 1057-1072: Two-step creation with explicit tenant_id

### ✅ Email Preferences Router
- All operations correctly filter by user_id AND include tenant_id

## Priority Remediation Plan

### P0 - IMMEDIATE (Blocks Production Launch)
**Impact:** Critical security vulnerabilities allowing cross-tenant data access

1. **Fix all publicProcedure endpoints exposing PII**
   - dancer.ts: getById, getByStudio
   - studio.ts: getById

2. **Fix reservation queries**
   - reservation.ts: getById, getByStudio, getByCompetition

3. **Fix entry queries and mutations**
   - entry.ts: getByStudio, update, addParticipant, removeParticipant, cancel, confirm

4. **Fix judge endpoints**
   - judges.ts: getAll, getByCompetition, update, delete, checkIn

### P1 - HIGH (Fix Before Beta Users)
**Impact:** Financial and competition integrity violations

1. **Fix scoring endpoints**
   - scoring.ts: All query endpoints need tenant filtering

2. **Add tenant verification to UPDATE operations**
   - competition.ts: update, cancel, clone
   - reservation.ts: update, reject, cancel, delete
   - studio.ts: approve, reject

### P2 - MEDIUM (Fix Before Full Launch)
**Impact:** Configuration data leakage

1. **Fix lookup endpoints**
   - lookup.ts: Add tenant_id filters to all queries

2. **Cross-entity tenant verification**
   - scoring.ts: Verify judge and entry from same tenant

### P3 - LOW (Post-Launch Hardening)
**Impact:** Edge cases and audit trail improvements

1. Add comprehensive audit logging for all tenant-scoped operations
2. Add automated tests for tenant isolation
3. Pre-commit hook to prevent new violations

## Remediation Patterns

### Pattern 1: Change publicProcedure to protectedProcedure

```typescript
// ❌ BEFORE
getById: publicProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input }) => {
    return prisma.table.findUnique({ where: { id: input.id } });
  });

// ✅ AFTER
getById: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const record = await prisma.table.findUnique({ where: { id: input.id } });

    if (!record) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    if (record.tenant_id !== ctx.tenantId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot access data from another tenant' });
    }

    return record;
  });
```

### Pattern 2: Add tenant_id to findMany queries

```typescript
// ❌ BEFORE
const results = await prisma.table.findMany({
  where: { studio_id: input.studioId },
});

// ✅ AFTER
const results = await prisma.table.findMany({
  where: {
    tenant_id: ctx.tenantId!,
    studio_id: input.studioId,
  },
});
```

### Pattern 3: Verify tenant_id before UPDATE/DELETE

```typescript
// ❌ BEFORE
await prisma.table.update({
  where: { id: input.id },
  data: { status: 'cancelled' },
});

// ✅ AFTER
const record = await prisma.table.findUnique({ where: { id: input.id } });

if (!record) {
  throw new TRPCError({ code: 'NOT_FOUND' });
}

if (record.tenant_id !== ctx.tenantId) {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot modify data from another tenant' });
}

await prisma.table.update({
  where: { id: input.id },
  data: { status: 'cancelled' },
});
```

## Testing Requirements

After remediation, verify:

1. **Cross-tenant access blocked**
   - Login to EMPWR tenant (empwr.compsync.net)
   - Try to access Glow data using known UUIDs
   - Should receive 403 FORBIDDEN errors

2. **Same-tenant access works**
   - Login to EMPWR tenant
   - Access EMPWR data
   - Should work normally

3. **Database isolation**
   - Run SQL query to verify no cross-tenant references:
   ```sql
   -- Should return 0
   SELECT COUNT(*) FROM competition_entries e
   JOIN competitions c ON e.competition_id = c.id
   WHERE e.tenant_id != c.tenant_id;
   ```

## Completion Checklist

- [x] Comprehensive audit completed
- [x] TENANT_ID_AUDIT.md created
- [x] Hardcoded tenant UUIDs fixed (dancer.ts)
- [ ] P0 violations fixed (reservations, entries, dancers, judges)
- [ ] P1 violations fixed (scoring, updates)
- [ ] P2 violations fixed (lookups, cross-entity)
- [ ] Cross-tenant access tests written
- [ ] Database integrity verified
- [ ] Production deployment

---

**Last Updated:** October 28, 2025
**Next Review:** After P0 fixes deployed
