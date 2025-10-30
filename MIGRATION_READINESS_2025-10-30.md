# Migration Readiness Report
**Date:** October 30, 2025
**Status:** 🔴 BLOCKED - Capacity Shortfall Detected

---

## Executive Summary

**CRITICAL ISSUE FOUND:** Insufficient capacity to migrate all 1,546 entries from CSV data.

**Capacity Shortfall:**
- London: **SHORT 45 spaces** (need 583, have 538)
- St. Catharines #1: **SHORT 393 spaces** (need 483, have 90)
- St. Catharines #2: ✅ OK (need 480, have 576)

**Total Shortfall:** 438 entry spaces across 2 competitions

---

## Competition ID Mappings (From Database)

### CSV → Database Competition Mapping

| CSV Name | Database Name | Competition ID | Dates |
|----------|---------------|----------------|-------|
| LONDON APRIL 10-12 | EMPWR Dance - London | `79cef00c-e163-449c-9f3c-d021fbb4d672` | April 10-12, 2026 |
| ST CATHARINES APRIL 16-18 | EMPWR Dance - St. Catharines #1 | `05c0eae4-cb2f-44cc-9c5e-6b2eed700904` | April 16-18, 2026 |
| ST CATHARINES MAY 7-9 | EMPWR Dance - St. Catharines #2 | `e5a6ee60-e440-4a3e-bc60-43eb40c46b30` | May 7-9, 2026 |

---

## Capacity Analysis

### Current Database State (Before Migration)

| Competition | Total Capacity | Used | Available | Existing Reservations |
|-------------|----------------|------|-----------|----------------------|
| London | 600 | 62 | **538** | 3 (test data) |
| St. Catharines #1 | 600 | 510 | **90** | 6 (test data) |
| St. Catharines #2 | 600 | 24 | **576** | 3 (test data) |

### CSV Migration Requirements

| Competition | Studios | Total Entries Needed |
|-------------|---------|---------------------|
| London | 8 | **583** |
| St. Catharines #1 | 8 | **483** |
| St. Catharines #2 | 6 | **480** |

### Gap Analysis

| Competition | Available | Required | Status |
|-------------|-----------|----------|--------|
| London | 538 | 583 | 🔴 **SHORT 45** |
| St. Catharines #1 | 90 | 483 | 🔴 **SHORT 393** |
| St. Catharines #2 | 576 | 480 | ✅ OK (+96) |

---

## Capacity Ledger Audit

### London (79cef00c-e163-449c-9f3c-d021fbb4d672)
```
Total:            600
Approvals:        -157 (2 entries)
Refunds:          +145 (1 entry)
Net Used:         -12
Available:        538
Expected:         600 - 12 = 588 ❌ MISMATCH (shows 538, expect 588)
Discrepancy:      -50
```

### St. Catharines #1 (05c0eae4-cb2f-44cc-9c5e-6b2eed700904)
```
Total:            600
Approvals:        -1,085 (6 entries)
Refunds:          +575 (4 entries)
Net Used:         -510
Available:        90
Expected:         600 - 510 = 90 ✅ MATCH
```

### St. Catharines #2 (e5a6ee60-e440-4a3e-bc60-43eb40c46b30)
```
Total:            600
Approvals:        -545 (5 entries)
Refunds:          +521 (3 entries)
Net Used:         -24
Available:        576
Expected:         600 - 24 = 576 ✅ MATCH
```

**⚠️ ISSUE:** London capacity ledger shows 50-space discrepancy. Needs investigation.

---

## Existing Studios (Potential Conflicts)

Current database has 3 test studios:
1. **asd** - 3 reservations (St. Catharines #1, #2)
2. **Dancertons** - 7 reservations (all 3 competitions)
3. **Dans Dancer** - 8 reservations (all 3 + QA event)

**None match CSV studio names** - no duplicate conflicts.

**Action Required:** These test studios should be deleted or moved to a test tenant before migration.

---

## Resolution Options for Capacity Shortfall

### Option 1: Increase Competition Capacity (RECOMMENDED)
**Increase total_reservation_tokens** to accommodate migration data:

```sql
-- London: Need 583, have 538 available, currently 600 total
-- Increase by 45 + buffer (50) = +95
UPDATE competitions
SET
  total_reservation_tokens = 695,
  available_reservation_tokens = available_reservation_tokens + 95
WHERE id = '79cef00c-e163-449c-9f3c-d021fbb4d672';

-- St. Catharines #1: Need 483, have 90 available, currently 600 total
-- Increase by 393 + buffer (50) = +443
UPDATE competitions
SET
  total_reservation_tokens = 1043,
  available_reservation_tokens = available_reservation_tokens + 443
WHERE id = '05c0eae4-cb2f-44cc-9c5e-6b2eed700904';
```

**Pros:**
- Simple, one-time adjustment
- All studios migrate successfully
- Capacity matches real-world commitments

**Cons:**
- Changes competition limits
- Need CD approval for capacity increase

---

### Option 2: Delete Test Data First
**Remove existing test reservations** to free up space:

```sql
-- This would free up:
-- London: +12 net (not enough, still short 33)
-- St. Catharines #1: +510 net (sufficient!)
-- St. Catharines #2: +24 net (already sufficient)
```

**Pros:**
- Cleans up test data
- No capacity limit changes

**Cons:**
- Only solves St. Catharines #1
- London still short by ~33 spaces
- Loses test data (may be valuable)

---

### Option 3: Reduce CSV Entry Counts
**Negotiate with studios** to reduce initial allocations:

- London: Reduce by 45 entries across 8 studios (~6 per studio)
- St. Catharines #1: Reduce by 393 entries across 8 studios (~49 per studio)

**Pros:**
- No database changes needed

**Cons:**
- Business negotiation required
- May not reflect actual agreements
- Could cause disputes with studios

---

## RECOMMENDED SOLUTION

**Combination Approach:**

1. **Delete test data** (frees up space, cleans DB)
   - Removes 3 test studios
   - Removes 12 test reservations

2. **Increase competition capacity** to match CSV requirements
   - London: 600 → 650 (+50 buffer)
   - St. Catharines #1: 600 → 700 (+100 buffer after test deletion)
   - St. Catharines #2: Keep at 600 (sufficient)

3. **Document as "Capacity Correction"**
   - CSV data = truth source
   - Competition limits should match real commitments

**SQL Script:**
```sql
BEGIN;

-- 1. Delete test studios and their data
DELETE FROM reservations
WHERE studio_id IN (
  'de74304a-c0b3-4a5b-85d3-80c4d4c7073a', -- asd
  '2ade9fc1-3580-4d75-97a8-70ed2c8ba517', -- Dancertons
  '6a058889-ef9b-4e16-85da-8b1b2c5e258b'  -- Dans Dancer
);

DELETE FROM capacity_ledger
WHERE reservation_id IN (
  SELECT id FROM reservations
  WHERE studio_id IN (
    'de74304a-c0b3-4a5b-85d3-80c4d4c7073a',
    '2ade9fc1-3580-4d75-97a8-70ed2c8ba517',
    '6a058889-ef9b-4e16-85da-8b1b2c5e258b'
  )
);

DELETE FROM studios
WHERE id IN (
  'de74304a-c0b3-4a5b-85d3-80c4d4c7073a',
  '2ade9fc1-3580-4d75-97a8-70ed2c8ba517',
  '6a058889-ef9b-4e16-85da-8b1b2c5e258b'
);

-- 2. Reset capacity to match test data removal
UPDATE competitions
SET
  total_reservation_tokens = 650,
  available_reservation_tokens = 650
WHERE id = '79cef00c-e163-449c-9f3c-d021fbb4d672'; -- London

UPDATE competitions
SET
  total_reservation_tokens = 700,
  available_reservation_tokens = 700
WHERE id = '05c0eae4-cb2f-44cc-9c5e-6b2eed700904'; -- St. Catharines #1

UPDATE competitions
SET
  total_reservation_tokens = 600,
  available_reservation_tokens = 600
WHERE id = 'e5a6ee60-e440-4a3e-bc60-43eb40c46b30'; -- St. Catharines #2

COMMIT;
```

**After cleanup:**
- London: 650 available vs 583 needed = ✅ OK (+67 surplus)
- St. Catharines #1: 700 available vs 483 needed = ✅ OK (+217 surplus)
- St. Catharines #2: 600 available vs 480 needed = ✅ OK (+120 surplus)

---

## Migration Blockers Summary

### P0 Blockers (Must Resolve Before Migration)

1. **✅ Competition IDs** - RESOLVED (mapped above)
2. **🔴 Capacity Shortfall** - BLOCKED (438 spaces short)
3. **🟡 Test Data Cleanup** - ACTION NEEDED (3 test studios exist)
4. **🔴 Email Addresses** - BLOCKED (not in CSV, required for user accounts)

### P1 Requirements (Needed for Migration Script)

5. **Schema Updates** - NOT STARTED
   - `reservation_deposits` table
   - `password_setup_tokens` table
   - `pending_activation` field on users

6. **Helper Functions** - NOT STARTED
   - `generateSecureToken()`
   - `generateStudioCode()`
   - `sendPasswordSetupEmail()`

7. **Email Templates** - NOT STARTED
   - Password setup invitation
   - Pre-launch announcement
   - Reminder emails

---

## CSV Data Quality Issues

### Missing Critical Data
- ❌ **Email addresses** (REQUIRED for user account creation)
- ⚠️ **Contact names** incomplete (some missing, some ambiguous)
- ⚠️ **Deposit dates** missing for many entries
- ⚠️ **Discount terms** unclear (conditional, manual application needed)

### Data Ambiguities
1. **Multiple contacts per studio** - "Tracey Coward & Angelina" - which email?
2. **Question marks in discounts** - "?" means unknown or no discount?
3. **Conditional discounts** - "5% if balance rec. by Nov 1" - how to handle?
4. **GLOW $** reference - what is this?

---

## Next Steps (Priority Order)

### Immediate Actions Required

1. **User Decision on Capacity Resolution**
   - Approve capacity increase? Which option?
   - Approve test data deletion?

2. **Obtain Missing Email Addresses**
   - All 22 studios need email addresses
   - Resolve multi-contact ambiguity

3. **Execute Cleanup + Capacity Adjustment**
   - Run SQL script to delete test data
   - Increase competition capacity
   - Verify ledger reconciliation

### After Blockers Resolved

4. **Create Schema Updates Migration**
   - reservation_deposits table
   - password_setup_tokens table
   - pending_activation field

5. **Implement Migration Script**
   - User creation flow
   - Studio creation with owner_id
   - Reservation creation via capacityService

6. **Test on Staging**
   - Dry-run with 2-3 studios
   - Verify capacity ledger integrity
   - Test password setup flow

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Insufficient capacity | 🔴 ACTIVE | Critical | Increase capacity before migration |
| Duplicate studios | 🟢 Low | Medium | Test data cleanup first |
| Email delivery fails | 🟡 Medium | High | Use verified SendGrid sender |
| Capacity ledger mismatch | 🟡 Medium | High | Full reconciliation after migration |
| Studios can't set password | 🟡 Medium | Medium | Manual password reset available |
| Deposit credit not applied | 🟢 Low | Medium | CD applies manually on invoice |

---

## Capacity Ledger Investigation (London)

**Discrepancy Found:** London shows 538 available, but ledger math suggests 588.

**Possible Causes:**
1. Manual capacity adjustment not logged in ledger
2. Deleted reservation didn't refund capacity
3. Race condition in capacity update
4. Initial capacity set incorrectly

**Investigation Query:**
```sql
-- Check all capacity changes for London
SELECT
  cl.*,
  r.status,
  r.spaces_requested,
  r.spaces_confirmed
FROM capacity_ledger cl
LEFT JOIN reservations r ON cl.reservation_id = r.id
WHERE cl.competition_id = '79cef00c-e163-449c-9f3c-d021fbb4d672'
ORDER BY cl.created_at;
```

**Resolution:** Delete test data and reset to clean state (see recommended solution above).

---

*Generated by Claude Code - Migration Readiness Analysis*
