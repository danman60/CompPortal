# 🚨 BLOCKER: Cross-Tenant Data Leak - Rivertown Dance Academy

**Severity:** P0 CRITICAL
**Status:** ACTIVE INCIDENT
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

## Resolution Plan

TBD - Awaiting investigation results

---

**DO NOT PROCEED WITH ANY WORK UNTIL THIS IS RESOLVED**
