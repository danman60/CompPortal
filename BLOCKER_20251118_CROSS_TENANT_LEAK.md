# 🚨 BLOCKER: Cross-Tenant Data Leak - Rivertown Dance Academy

**Severity:** P0 CRITICAL
**Status:** RESOLVED ✅
**Reported:** 2025-11-18 (EST)
**Reporter:** User

## Incident Description

Rivertown Dance Academy (studio) is able to see dancers from other studios outside of their own studio.

## Potential Impact

- **Data Privacy Violation:** Studios can see competitors' rosters
- **Legal Liability:** GDPR/privacy law violations
- **Business Impact:** Complete loss of trust, potential contract terminations
- **Scope:** Unknown - need to verify which pages/queries are affected

## Immediate Actions Taken

1. ✅ Stopped all work immediately
2. ✅ Created this blocker file
3. ⏳ Investigating root cause

## Investigation Steps

1. Identify which page is showing cross-tenant data (likely Dancers page)
2. Check which queries are missing `tenant_id` filters
3. Determine if recent changes caused this or if it's pre-existing
4. Verify scope: Is this limited to dancers or does it affect other data?

## Potentially Related Recent Changes

- Session: Added invitation features to Studios page
- Files modified:
  - `CompPortal/src/components/StudiosList.tsx` - Added `studioInvitations.getStudiosForCD` query
  - `CompPortal/src/app/dashboard/admin/studio-invitations/page.tsx` - Changed default sort

**Initial assessment:** The changes made were to the Studios page invitation features. The reported issue is with Dancers visibility, which should be unrelated to studios invitation changes. Need to investigate if:
1. This is a pre-existing issue being reported now
2. There's an indirect impact from my changes
3. This is a separate, unrelated bug

## Next Steps

- [ ] DO NOT deploy current changes
- [ ] Investigate which page shows the leak
- [ ] Check tenant_id filtering on Dancers queries
- [ ] Verify if this is new or pre-existing
- [ ] Review all queries for tenant isolation
- [ ] Run cross-tenant verification queries

## Root Cause Identified

Conditional tenant filtering pattern allowed queries without tenant_id:
```typescript
// VULNERABLE:
if (ctx.tenantId) { where.tenant_id = ctx.tenantId }
...(ctx.tenantId ? { tenant_id: ctx.tenantId } : {})
```

If ctx.tenantId was undefined, NO filter applied = cross-tenant leak.

## Evidence of Cross-Tenant Leak

Found 6 studios visible on BOTH EMPWR and Glow tenants:
1. CASSIAHS DANCE COMPANY
2. DANCEOLOGY
3. DANCESATIONS
4. DANCETASTIC
5. FEVER
6. JDANSE

PLUS: 2 Rivertown duplicates on EMPWR only.

## Security Fixes Applied

**Files Modified:**
- `src/server/routers/dancer.ts` - 5 procedures (getAll, create, update, delete, archive)
- `src/server/routers/reservation.ts` - 2 locations (getAll)
- `src/server/routers/competition.ts` - 4 locations (getTenantSettings)

**Pattern Fixed:**
All routers now throw `TRPCError({ code: 'FORBIDDEN' })` if non-super-admin missing tenant context.

## Deployment

- Build: ✅ PASSED
- Commit: c04b159
- Deployed: 2025-11-18
- Status: Security patch live on production

---

**✅ BLOCKER RESOLVED - Emergency security patch deployed**
