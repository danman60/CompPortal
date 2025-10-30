# Database Health Audit Report
**Date:** October 30, 2025
**Auditor:** Claude (Overnight Launch Readiness)

---

## Executive Summary

**Status:** 🔴 CRITICAL ISSUE FOUND
- ✅ Tenant isolation intact (0 leaks)
- ✅ No orphaned records
- 🔴 **CRITICAL:** Capacity ledger discrepancies in 4 competitions

---

## Tenant Health Check

### Tenant Overview

| Tenant | Subdomain | Studios | Dancers | Reservations | Entries | Competitions |
|--------|-----------|---------|---------|--------------|---------|--------------|
| EMPWR Dance Experience | empwr | 3 | 214 | 14 | 17 | 5 |
| Glow Dance Competition | glow | 0 | 0 | 0 | 0 | 7 |

**Analysis:**
- ✅ **EMPWR:** Active production data (3 studios, 214 dancers)
- ✅ **Glow:** Clean slate for new competition (7 competitions configured, awaiting studios)

---

## Cross-Tenant Isolation Test

### Results: ✅ PASS - Zero leaks detected

Tested all critical FK relationships:

| Relationship | Leak Count | Status |
|--------------|------------|--------|
| reservations → studios | 0 | ✅ PASS |
| reservations → competitions | 0 | ✅ PASS |
| competition_entries → studios | 0 | ✅ PASS |
| competition_entries → competitions | 0 | ✅ PASS |
| dancers → studios | 0 | ✅ PASS |

**Conclusion:** Tenant isolation is working correctly. No cross-tenant data leakage.

---

## Referential Integrity Check

### Results: ✅ PASS - Zero orphaned records

| Orphan Type | Count | Status |
|-------------|-------|--------|
| dancers_missing_studio | 0 | ✅ PASS |
| entries_missing_reservation | 0 | ✅ PASS |
| entries_missing_competition | 0 | ✅ PASS |
| reservations_missing_studio | 0 | ✅ PASS |
| reservations_missing_competition | 0 | ✅ PASS |

**Conclusion:** All foreign keys valid. No dangling references.

---

## Capacity Ledger Integrity Check

### Results: 🔴 CRITICAL - Discrepancies found in 4 competitions

| Competition | Total Tokens | Available | Ledger Net | Calculated Available | Discrepancy |
|-------------|--------------|-----------|------------|---------------------|-------------|
| EMPWR - London | 600 | 545 | -5 | 605 | **-60** |
| EMPWR - St. Catharines #1 | 600 | 90 | -510 | 1110 | **-1020** 🔴 |
| EMPWR - St. Catharines #2 | 600 | 586 | -14 | 614 | **-28** |
| QA Automation Event | 600 | 499 | -101 | 701 | **-202** |

**Critical Finding: St. Catharines #1**
- Expected available: 1110 tokens (based on ledger)
- Actual available: 90 tokens
- Discrepancy: -1020 tokens (**MASSIVE UNDERCOUNT**)

### What This Means

The capacity tracking system has **lost sync** between:
1. `competitions.available_reservation_tokens` (the field used for checks)
2. `capacity_ledger` entries (the audit trail)

**Root Cause:** Likely related to issues documented in `CAPACITY_REWRITE_PLAN.md`:
- Dual-write bugs (updating field without ledger, or vice versa)
- Race conditions (concurrent updates without locking)
- Missing ledger entries (old code didn't log all changes)

### Business Impact

**Immediate Risk:** 🟡 MEDIUM
- System is using `available_reservation_tokens` field for checks
- Field may be artificially LOW, blocking valid reservations
- Studios may be told "no capacity" when capacity actually exists

**Long-term Risk:** 🔴 HIGH
- Cannot trust capacity numbers for reporting
- Audit trail incomplete (ledger doesn't match reality)
- May over-allocate if field is corrected to match ledger

---

## Recommended Actions

### Immediate (Before Launch)

1. **Manual Capacity Audit**
   ```sql
   -- For each competition with discrepancy:
   -- 1. Count actual approved reservations
   SELECT SUM(spaces_confirmed) as actually_allocated
   FROM reservations
   WHERE competition_id = '05c0eae4-cb2f-44cc-9c5e-6b2eed700904'
     AND status IN ('approved', 'summarized', 'invoiced', 'closed');

   -- 2. Compare to total_reservation_tokens
   -- 3. Correct available_reservation_tokens if needed
   ```

2. **Freeze Capacity Changes**
   - Do NOT manually adjust capacity before launch
   - Let existing bookings proceed with current field values
   - Document discrepancies for post-launch fix

3. **Add Monitoring**
   ```sql
   -- Alert on capacity discrepancies > 50
   SELECT * FROM (
     SELECT
       c.id,
       c.name,
       ABS(c.available_reservation_tokens - (c.total_reservation_tokens - COALESCE(SUM(cl.change_amount), 0))) as discrepancy
     FROM competitions c
     LEFT JOIN capacity_ledger cl ON cl.competition_id = c.id
     GROUP BY c.id
   ) WHERE discrepancy > 50;
   ```

### Post-Launch Week 1

1. **Implement CAPACITY_REWRITE_PLAN.md**
   - Estimated: 5.5 hours
   - Adds atomic transactions with row locking
   - Ensures ledger + field always in sync

2. **Backfill Missing Ledger Entries**
   - Audit reservations for missing ledger entries
   - Create retroactive entries for historical changes

3. **Recalculate All Capacity Fields**
   ```sql
   -- Recalculate from ledger (source of truth)
   UPDATE competitions c
   SET available_reservation_tokens = c.total_reservation_tokens - COALESCE(
     (SELECT SUM(change_amount) FROM capacity_ledger WHERE competition_id = c.id),
     0
   );
   ```

---

## Additional Checks

### Duplicate Detection

**Check for duplicate dancers (same name + DOB):**
```sql
SELECT
  studio_id,
  first_name,
  last_name,
  date_of_birth,
  COUNT(*) as duplicate_count
FROM dancers
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY studio_id, first_name, last_name, date_of_birth
HAVING COUNT(*) > 1;
```

**Check for duplicate entries (same competition + studio + title):**
```sql
SELECT
  competition_id,
  studio_id,
  title,
  COUNT(*) as duplicate_count
FROM competition_entries
WHERE status != 'cancelled'
  AND tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY competition_id, studio_id, title
HAVING COUNT(*) > 1;
```

### Data Quality

**Check for missing required fields:**
```sql
-- Dancers without birth dates
SELECT COUNT(*) as dancers_missing_dob
FROM dancers
WHERE date_of_birth IS NULL;

-- Entries without categories
SELECT COUNT(*) as entries_missing_category
FROM competition_entries
WHERE category_id IS NULL;

-- Reservations without spaces_confirmed
SELECT COUNT(*) as reservations_missing_spaces
FROM reservations
WHERE status = 'approved'
  AND spaces_confirmed IS NULL;
```

---

## Database Health Score

| Category | Status | Priority |
|----------|--------|----------|
| Tenant Isolation | ✅ PASS | - |
| Referential Integrity | ✅ PASS | - |
| Capacity Ledger | 🔴 FAIL | P0 |
| Data Completeness | ⏳ Pending | P1 |
| Duplicate Detection | ⏳ Pending | P2 |

**Overall:** 🔴 CRITICAL - Launch blocker (capacity ledger)

---

## Recommendations Summary

**Before Launch:**
1. ✅ Document capacity discrepancies
2. ✅ Freeze capacity manual adjustments
3. ⚠️ Add capacity monitoring alert

**Post-Launch (Week 1):**
1. Implement CAPACITY_REWRITE_PLAN.md
2. Backfill ledger entries
3. Recalculate capacity fields
4. Run full data quality audit

**Do NOT attempt capacity fixes without:**
- Full understanding of root cause
- Testing on staging database
- User notification of potential booking impact

---

*Generated by Claude Code - Overnight Database Audit*
