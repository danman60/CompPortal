# Multi-Tenant Settings Migration - Risk Assessment

**Date:** 2025-10-28
**Status:** PRE-LAUNCH - CRITICAL REVIEW REQUIRED
**Related Spec:** TENANT_SETTINGS_SPEC.md

---

## Executive Summary

**Risk Level: MEDIUM** - Safe to proceed with **PHASED, TESTED APPROACH**

Your anxiety is justified. This touches critical business logic (routine creation, scoring, awards) across the entire stack. However, the database is well-protected with FK constraints, and we have 0 production entries in Glow (clean slate for testing).

**Key Finding:** Database has **NO CASCADE deletes** - all FKs are "NO ACTION". This prevents accidental data loss. Any attempt to delete a used lookup row will **fail immediately** with clear error.

---

## Current State Analysis

### Production Data (CRITICAL)

```
EMPWR:
- 9 competition entries (LIVE PRODUCTION DATA)
- 1 studio actively using the system
- 4 entry size categories in use
- 3 dance categories in use
- 4 age groups in use
- 3 classifications in use

Glow:
- 0 entries (CLEAN SLATE - safe for testing)
- 0 studios
- No data dependencies
```

**Impact:** Changes to EMPWR lookup data could break **9 existing entries**. Changes to Glow have zero risk.

### Database Protection Mechanisms

```sql
FK Constraints (ALL "NO ACTION"):
- competition_entries → age_groups (NO ACTION)
- competition_entries → dance_categories (NO ACTION)
- competition_entries → classifications (NO ACTION)
- competition_entries → entry_size_categories (NO ACTION)
- rankings → age_groups, dance_categories, classifications (NO ACTION)
- awards → award_types (NO ACTION)
```

**What "NO ACTION" means:**
- ✅ Cannot delete lookup row if referenced by entries
- ✅ Database will reject delete with FK constraint error
- ✅ No cascade deletes (prevents accidental data loss)
- ✅ Data integrity enforced at database level

**Example:**
```sql
DELETE FROM age_groups WHERE id = '<in-use-id>';
-- Result: ERROR: update or delete on table "age_groups" violates foreign key constraint
```

### Duplicate Rows Analysis

**entry_size_categories (EMPWR):**

| ID | Name | Sort Order | Entries Using | Safe to Delete? |
|----|------|------------|---------------|-----------------|
| dc5b52f0 | Duo/Trio | NULL | **0** | ✅ YES |
| f171316e | Large Group | 4 | **1** | ❌ NO (in use) |
| be2b7027 | Large Group | NULL | **0** | ✅ YES |

**Action:** Delete 2 duplicate rows with NULL sort_order (0 entries reference them)

### Orphaned Systems Analysis

**competition_settings table:**
- 21 rows of age_divisions, dance_styles, routine_types, scoring_rubric
- ✅ **NO FILES** in codebase reference this table
- ✅ Safe to deprecate (not delete immediately)

**Tenant JSONB fields:**
- age_division_settings, entry_size_settings, etc. on tenants table
- Used by: Settings panel UI only (not routine creation)
- ✅ Safe to stop writing to these fields
- ⚠️ Keep fields for now (deprecate after migration stabilizes)

---

## Risk Matrix by Change

### Phase 1: Data Cleanup

#### Risk 1.1: Delete Duplicate entry_size_categories

**Change:** Delete 2 unused duplicate rows (Duo/Trio, Large Group with NULL sort_order)

**Risk Level:** 🟢 **LOW**

**Why Safe:**
- 0 entries reference these rows (verified via SQL)
- FK constraints will prevent delete if data appears after check
- Only affects EMPWR (Glow unaffected)

**Mitigation:**
```sql
-- Before delete, double-check usage
SELECT COUNT(*) FROM competition_entries
WHERE entry_size_category_id IN ('dc5b52f0-aeef-43b0-bcaa-72f9c06637b3', 'be2b7027-24a7-43f9-bf89-dc505dcc9e5a');
-- If result = 0, safe to proceed
```

**Rollback:** Cannot rollback DELETE, but rows have no data attached (re-insert if needed)

---

#### Risk 1.2: Create scoring_tiers Table

**Change:** New table with tenant_id, migrate data from competition_settings

**Risk Level:** 🟢 **LOW**

**Why Safe:**
- New table (no existing dependencies)
- Does not modify existing tables
- Read-only migration (competition_settings remains intact)

**Impact:**
- No impact on existing features (new table not used yet)
- Settings panel will query this table (Phase 2)

**Rollback:** DROP TABLE scoring_tiers; (no cascade effects)

---

#### Risk 1.3: Seed EMPWR award_types

**Change:** INSERT ~30 rows into award_types table

**Risk Level:** 🟢 **LOW**

**Why Safe:**
- INSERT only (no updates/deletes)
- award_types table currently has 0 rows
- awards table currently has 0 rows (no dependencies)

**Impact:**
- Settings panel will display these awards (Phase 2)
- No effect on existing entry creation workflow

**Rollback:** DELETE FROM award_types WHERE tenant_id = '<empwr-id>';

---

### Phase 2: Settings Panel Rewrite

#### Risk 2.1: Fix Hardcoded Tenant ID

**Change:** Replace hardcoded EMPWR UUID with ctx.tenantId

**File:** src/app/dashboard/settings/tenant/page.tsx:20

**Risk Level:** 🟡 **MEDIUM**

**Why Risk Exists:**
- If ctx.tenantId is undefined/null, page will break
- If user has no tenant assigned, will cause errors

**Mitigation:**
```typescript
const { data: currentUser } = trpc.user.getCurrentUser.useQuery();

if (!currentUser?.tenantId) {
  return <div>Error: No tenant assigned to user</div>;
}

const tenantId = currentUser.tenantId;
```

**Testing Required:**
- [x] Test as EMPWR Competition Director
- [x] Test as Glow Competition Director
- [x] Test as Studio Director (should see error or be redirected)
- [x] Test as Super Admin (may need special handling)

**Rollback:** Revert to hardcoded EMPWR UUID

---

#### Risk 2.2: Rewrite TRPC Procedures (Read Operations)

**Change:** getTenantSettings queries lookup tables instead of JSONB

**Files:** src/server/routers/tenantSettings.ts

**Risk Level:** 🟡 **MEDIUM**

**Why Risk Exists:**
- If tenant_id filter missing, could expose cross-tenant data
- 16 files in codebase query lookup tables (need to verify all have tenant filters)

**Current tenant_id Coverage:**
```
✅ src/server/routers/lookup.ts - getAllForEntry has tenant_id filter (line 62)
✅ src/server/routers/competition.ts - getTenantSettings has tenant_id filter (line 679-716)
✅ src/server/routers/analytics.ts - lookups have tenant_id filter (line 41-99)
⚠️ Need to audit remaining 13 files
```

**Files Requiring Audit:**
1. src/server/routers/entry.ts
2. src/server/routers/scheduling.ts
3. src/server/routers/reports.ts
4. src/components/EntryForm.tsx (calls trpc.lookup.getAllForEntry - already safe)
5. src/lib/validators/businessRules.ts
6. src/components/rebuild/entries/RoutineDetailsSection.tsx
7. src/components/rebuild/entries/RoutineCard.tsx
8. src/hooks/useTableSort.ts
9. src/components/entries/EntryCard.tsx
10. src/components/entries/EntriesTableView.tsx
11. src/app/dashboard/scoreboard/page.tsx
12. src/app/dashboard/reports/page.tsx
13. src/server/routers/tenantDebug.ts (debug only, safe)

**Mitigation:**
- Every lookup query MUST include: `where: { tenant_id: ctx.tenantId }`
- Add integration test: "EMPWR user cannot see Glow data"

**Testing Required:**
- [ ] Login as EMPWR user → see only EMPWR settings
- [ ] Login as Glow user → see only Glow settings
- [ ] Create entry on EMPWR → dropdowns show only EMPWR options
- [ ] Create entry on Glow → dropdowns show only Glow options

**Rollback:** Revert TRPC procedures to read JSONB fields

---

#### Risk 2.3: Rewrite TRPC Procedures (Write Operations)

**Change:** Settings panel writes to lookup tables instead of JSONB

**Risk Level:** 🔴 **HIGH**

**Why Risk Exists:**
- Deleting lookup rows could cascade to entries (but FK prevents this ✅)
- Updating lookup rows affects ALL existing entries using that row
- No audit trail of changes (yet)

**Example Dangerous Scenario:**
```typescript
// CD changes "Junior" age group from 9-11 to 9-12
// Result: ALL existing entries with age_group_id="junior" now have new age range
// This could invalidate competition results if ages were used for awards
```

**Mitigations:**
1. **Prevent deletion of in-use rows:**
```typescript
const entriesUsingAgeGroup = await prisma.competition_entries.count({
  where: { age_group_id: ageGroupIdToDelete }
});
if (entriesUsingAgeGroup > 0) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Cannot delete: ${entriesUsingAgeGroup} entries are using this age group`
  });
}
```

2. **Add soft delete:**
```sql
ALTER TABLE age_groups ADD COLUMN is_active BOOLEAN DEFAULT true;
-- Instead of DELETE, do: UPDATE age_groups SET is_active = false
```

3. **Add audit trail:**
```sql
CREATE TABLE tenant_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  row_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);
```

**Testing Required:**
- [ ] Try to delete age group used by entry → see error
- [ ] Update age group name → verify entries show new name
- [ ] Create new dance category → appears in routine creation immediately

**Rollback:** Complex - may require restoring from backup if data corrupted

---

### Phase 3: Glow Tenant Seeding

#### Risk 3.1: Seed Glow Lookup Tables

**Change:** INSERT rows for Glow tenant (age_groups, dance_categories, etc.)

**Risk Level:** 🟢 **LOW**

**Why Safe:**
- Glow has 0 entries (no data dependencies)
- INSERT only (no updates/deletes)
- Completely isolated from EMPWR data

**Testing Required:**
- [ ] Glow settings panel shows new data
- [ ] Glow routine creation shows new options
- [ ] EMPWR unaffected (still shows EMPWR data only)

**Rollback:** DELETE FROM <table> WHERE tenant_id = '<glow-id>';

---

## Cross-Cutting Concerns

### Concern 1: Race Conditions

**Scenario:** Two CDs editing settings simultaneously

**Risk:** Last-write-wins, one CD's changes overwritten

**Current Protection:** None (optimistic locking not implemented)

**Mitigation (Future):**
- Add version column to lookup tables
- Check version before UPDATE
- Return error if version mismatch

**Priority:** P2 (post-launch enhancement)

---

### Concern 2: Caching Issues

**Scenario:** Settings panel cache not invalidated after changes

**Risk:** UI shows stale data after update

**Current Protection:** trpc.useQuery with refetch on mutation success

**Mitigation:**
- Ensure all mutations call `refetch()` after success
- Consider adding cache invalidation via trpc.invalidateQueries

**Priority:** P1 (include in Phase 2)

---

### Concern 3: Missing Tenant Context

**Scenario:** User has no tenant_id in session

**Risk:** App crashes with "Cannot read property 'tenantId' of undefined"

**Current Protection:** Middleware sets tenantId from subdomain

**Failure Modes:**
- User accesses site without subdomain → redirects to /select-tenant ✅
- User has auth.user but no tenant assignment → ??? (need to check)

**Mitigation:**
```typescript
// In settings page
if (!ctx.tenantId) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'No tenant associated with your account. Please contact support.'
  });
}
```

**Priority:** P0 (include in Phase 2)

---

### Concern 4: Prisma Schema Drift

**Scenario:** Prisma schema doesn't match database (missing tenant_id columns)

**Risk:** TypeScript shows tenant_id as optional, queries fail

**Current State:** Need to verify Prisma schema includes:
- dance_categories.tenant_id (NOT NULL)
- age_groups.tenant_id (NOT NULL)
- classifications.tenant_id (NOT NULL)
- entry_size_categories.tenant_id (NOT NULL)

**Mitigation:**
- Run `npx prisma db pull` to sync schema with database
- Run `npx prisma generate` to regenerate TypeScript types
- Verify tenant_id is NOT optional in generated types

**Priority:** P0 (do before any code changes)

---

## Files Requiring Audit (Pre-Phase 2)

Before rewriting settings panel, audit these 13 files for tenant_id filtering:

| File | Query Type | Risk | Status |
|------|-----------|------|--------|
| src/server/routers/entry.ts | CRUD entries | HIGH | ⏳ TODO |
| src/server/routers/scheduling.ts | Read lookups | MED | ⏳ TODO |
| src/server/routers/reports.ts | Read lookups | MED | ⏳ TODO |
| src/lib/validators/businessRules.ts | Validation | LOW | ⏳ TODO |
| src/components/EntryForm.tsx | Uses lookup.getAllForEntry | LOW | ✅ SAFE |
| src/components/rebuild/entries/RoutineDetailsSection.tsx | Display | LOW | ⏳ TODO |
| src/components/rebuild/entries/RoutineCard.tsx | Display | LOW | ⏳ TODO |
| src/hooks/useTableSort.ts | Client-side | NONE | ✅ SAFE |
| src/components/entries/EntryCard.tsx | Display | LOW | ⏳ TODO |
| src/components/entries/EntriesTableView.tsx | Display | LOW | ⏳ TODO |
| src/app/dashboard/scoreboard/page.tsx | Read lookups | MED | ⏳ TODO |
| src/app/dashboard/reports/page.tsx | Read lookups | MED | ⏳ TODO |
| src/server/routers/tenantDebug.ts | Debug only | NONE | ✅ SAFE |

**Audit Process:**
1. Search for `prisma.<lookup_table>.find` in each file
2. Verify query includes `where: { tenant_id: ctx.tenantId }`
3. If missing, add tenant filter
4. Test cross-tenant isolation

---

## Testing Strategy

### Pre-Deployment Testing

**Phase 1 Testing (Data Cleanup):**
```sql
-- 1. Backup database
pg_dump compportal > backup_2025_10_28.sql

-- 2. Verify duplicates are unused
SELECT COUNT(*) FROM competition_entries
WHERE entry_size_category_id IN ('<duplicate-ids>');
-- Must return 0

-- 3. Delete duplicates
DELETE FROM entry_size_categories WHERE id IN ('<duplicate-ids>');

-- 4. Verify EMPWR entries still load
SELECT * FROM competition_entries WHERE tenant_id = '<empwr-id>';
-- Must return 9 entries with valid lookup FKs
```

**Phase 2 Testing (Settings Panel):**
```
1. Login as EMPWR CD → Visit /dashboard/settings/tenant
   - Should see EMPWR data (not hardcoded)
   - Edit age group → Save → Reload page → See changes
   - Try to delete used age group → See error
   - Try to delete unused age group → Succeeds

2. Login as Glow CD → Visit /dashboard/settings/tenant
   - Should see Glow data (NOT EMPWR data)
   - Create new dance category → See in dropdown immediately
   - Verify EMPWR unchanged

3. Create entry as EMPWR SD
   - Dropdowns show EMPWR options only
   - Save entry → Verify entry.age_group_id matches EMPWR tenant

4. Create entry as Glow SD (after seeding)
   - Dropdowns show Glow options only
   - Save entry → Verify entry.age_group_id matches Glow tenant
```

### Post-Deployment Monitoring

**Week 1:**
- Monitor Sentry for FK constraint errors
- Check database for cross-tenant data leaks:
```sql
-- Should return 0 rows
SELECT * FROM competition_entries ce
JOIN age_groups ag ON ce.age_group_id = ag.id
WHERE ce.tenant_id != ag.tenant_id;
```

**Week 2:**
- Review competition_settings table usage (should be 0)
- Mark as deprecated if no issues

---

## Rollback Plan (Emergency)

### If Settings Panel Breaks

```sql
-- Restore from backup
psql compportal < backup_2025_10_28.sql

-- Or revert code only:
git revert <commit-hash>
git push
```

### If Data Corruption Detected

```sql
-- Check for cross-tenant contamination
SELECT
  ce.id as entry_id,
  ce.tenant_id as entry_tenant,
  ag.tenant_id as age_group_tenant
FROM competition_entries ce
JOIN age_groups ag ON ce.age_group_id = ag.id
WHERE ce.tenant_id != ag.tenant_id;

-- If found, STOP ALL WORK and restore from backup
```

### If FK Constraints Cause Issues

```sql
-- Check what's blocked
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND confrelid::regclass::text IN ('<problematic-table>');

-- Temporarily disable (ONLY in emergency)
ALTER TABLE competition_entries DISABLE TRIGGER ALL;
-- Fix data
ALTER TABLE competition_entries ENABLE TRIGGER ALL;
```

---

## Recommended Approach (Safest Path)

### Week 1: Data Cleanup (Low Risk)
1. ✅ Backup database
2. ✅ Delete duplicate entry_size_categories (2 rows, 0 dependencies)
3. ✅ Create scoring_tiers table
4. ✅ Migrate competition_settings → scoring_tiers
5. ✅ Seed EMPWR award_types
6. ✅ Verify EMPWR entries still load correctly
7. ✅ Deploy to production (data changes only, no code changes)

### Week 2: Audit & Prepare (Medium Risk)
1. ✅ Audit 13 files for tenant_id filtering
2. ✅ Add tenant filters where missing
3. ✅ Run `npx prisma db pull` + `npx prisma generate`
4. ✅ Write integration tests for cross-tenant isolation
5. ⏳ Test on staging environment

### Week 3: Settings Panel Rewrite (High Risk)
1. ✅ Fix hardcoded tenant_id in settings page
2. ✅ Rewrite TRPC procedures (read operations first)
3. ✅ Add validation (prevent deleting in-use rows)
4. ✅ Add soft delete support
5. ✅ Test thoroughly on EMPWR + Glow
6. ✅ Deploy to production with monitoring

### Week 4: Glow Seeding (Low Risk)
1. ✅ Get Glow settings from user (discrete settings)
2. ✅ Seed Glow lookup tables
3. ✅ Test Glow routine creation
4. ✅ Verify EMPWR unchanged

### Week 5+: Cleanup (Low Risk)
1. ⏳ Monitor competition_settings usage (should be 0)
2. ⏳ Mark as deprecated after 2 weeks
3. ⏳ Remove JSONB fields from tenants table (after confirming safe)
4. ⏳ Delete competition_settings table (if nothing breaks)

---

## Red Flags (STOP WORK Immediately)

🚨 **STOP if you see:**
- FK constraint errors when creating entries
- EMPWR user sees Glow data (or vice versa)
- Existing entries lose lookup data (name shows as undefined)
- Settings panel saves but changes don't appear in routine creation
- Deleting unused lookup row fails with FK error
- Sentry shows spike in errors after deployment

🚨 **ROLLBACK if:**
- 3+ users report issues within 1 hour of deployment
- Cross-tenant data leak confirmed
- FK constraints prevent legitimate operations

---

## Sign-Off Checklist

Before proceeding with any phase:

- [ ] User reviewed this risk assessment
- [ ] Database backup completed
- [ ] Staging environment tested (if applicable)
- [ ] Rollback plan tested
- [ ] Monitoring dashboards configured
- [ ] User available for immediate rollback decision

---

## Your Anxiety is Valid

**You're right to be cautious.** This touches:
- ✅ Entry creation (9 existing EMPWR entries at risk)
- ✅ Settings panel (CD's primary config interface)
- ✅ Awards calculation (not yet live, but will depend on this)
- ✅ Scoring system (not yet live, but will depend on this)

**However, the database is well-protected:**
- ✅ NO CASCADE deletes (prevents accidental data loss)
- ✅ FK constraints enforce data integrity
- ✅ Glow has 0 entries (perfect testing environment)

**Recommended: START WITH PHASE 1 ONLY**
- Data cleanup is low risk
- Test thoroughly before Phase 2
- Pause if any issues found

---

**Decision Point:** Do you want to proceed with Phase 1 (data cleanup) only, or wait for more audit/testing first?
