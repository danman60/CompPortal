# INCIDENT REPORT: Production Entry Size $0 Fee Billing

**Incident ID:** INC-2025-12-23-001
**Severity:** P1 - Financial Impact
**Status:** INVESTIGATING
**Reported:** 2025-12-23
**Reporter:** User (via Claude Code session)

---

## Executive Summary

Production entry size category has NULL pricing configured in both EMPWR and Glow tenants, causing all Production entries to be billed at $0. This affects submitted entries and invoices that have already been SENT or PAID.

---

## Impact Assessment

### Financial Impact

| Tenant | Entries | Total Participants | Missing Revenue |
|--------|---------|-------------------|-----------------|
| EMPWR | 4 | 170 | $9,350 |
| Glow | 9 | 341 | $18,755 |
| **TOTAL** | **13** | **511** | **$28,105** |

### Affected Invoices

**EMPWR:**
| Studio | Invoice Status | Entry Title | Participants | Missing |
|--------|---------------|-------------|--------------|---------|
| Academy of Dance Arts | SENT | Little Mermaid | 24 | $1,320 |
| Cassiahs Dance Company | **PAID** | COME ON DOWN... | 42 | $2,310 |
| Elite Star | **PAID** | Neverland | 30 | $1,650 |
| Fever | SENT | Murder Mystery | 74 | $4,070 |

**Glow:**
| Studio | Invoice Status | Entry Title | Participants | Missing |
|--------|---------------|-------------|--------------|---------|
| Cassiahs Dance Company | **PAID** | COME ON DOWN... | 41 | $2,255 |
| Dancecore | **PAID** | Conga | 36 | $1,980 |
| Expressions Dance | **PAID** | Spring | 21 | $1,155 |
| Expressions Dance | **PAID** | Pool Party | 23 | $1,265 |
| Expressions Dance | **PAID** | Graffiti Alley | 35 | $1,925 |
| Expressions Dance | **PAID** | Slumber Party | 65 | $3,575 |
| Expressions Dance | **PAID** | Ain't Nothing Wrong | 21 | $1,155 |
| Fever | **PAID** | Murder Mystery | 74 | $4,070 |
| Kingston Dance Force | SENT | Production | 25 | $1,375 |

---

## Root Cause

### Database Configuration Issue

The `entry_size_categories` table has Production entries with **NULL pricing**:

```sql
SELECT id, name, base_fee, per_participant_fee, tenant_id
FROM entry_size_categories
WHERE name = 'Production';
```

| Tenant | base_fee | per_participant_fee |
|--------|----------|---------------------|
| EMPWR | NULL | NULL |
| Glow | NULL | NULL |

### Expected Pricing

Based on EMPWR source of truth and comparable size categories:
- **per_participant_fee:** $55 (matches Large Group, Line, Super Line)

### How It Was Missed

- October 30, 2025 settings cleanup focused on age groups, classifications, dance styles, scoring tiers
- Entry size fees were noted as "already correct" but Production was not verified
- Production was added as a dance category (style) but entry size pricing was overlooked

---

## Timeline

| Date | Event |
|------|-------|
| Oct 30, 2025 | EMPWR settings cleanup - Production entry size pricing not verified |
| Nov-Dec 2025 | Studios create Production entries, system calculates $0 fee |
| Dec 2025 | Invoices generated and sent with $0 Production line items |
| Dec 2025 | Some invoices marked PAID (studios paid less than owed) |
| Dec 23, 2025 | Issue discovered and reported |

---

## Affected Systems

1. **entry_size_categories** - Missing pricing configuration
2. **competition_entries** - entry_fee = $0 for Production entries
3. **invoices** - line_items contain $0 for Production entries
4. **summary_entries** - May contain incorrect fee calculations

---

## Remediation Plan

### Phase 1: Configure Pricing (Prevents Future Issues)
```sql
-- EMPWR Production pricing
UPDATE entry_size_categories
SET per_participant_fee = 55.00
WHERE name = 'Production'
AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- Glow Production pricing
UPDATE entry_size_categories
SET per_participant_fee = 55.00
WHERE name = 'Production'
AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';
```

### Phase 2: Fix Entry Fees
```sql
-- Update entry_fee for affected entries
-- Formula: participant_count * 55
UPDATE competition_entries ce
SET entry_fee = (
  SELECT COUNT(*) * 55
  FROM entry_participants ep
  WHERE ep.entry_id = ce.id
),
total_fee = (
  SELECT COUNT(*) * 55
  FROM entry_participants ep
  WHERE ep.entry_id = ce.id
) + COALESCE(late_fee, 0)
WHERE ce.id IN (
  -- List of affected entry IDs
);
```

### Phase 3: Invoice Corrections

**Option A: Supplemental Invoice**
- Create new invoice for the missing amount only
- Preserves payment history on original invoice

**Option B: Void and Reissue**
- Void original invoice
- Generate new invoice with correct totals
- More disruptive, requires re-payment

**Option C: Manual Adjustment**
- Update invoice line_items JSONB directly
- Recalculate subtotal/total
- For PAID invoices, mark additional amount due

**Recommendation:** Option A (Supplemental Invoice) for PAID invoices, Option C for SENT invoices

---

## Verification Queries

### Check Production pricing after fix:
```sql
SELECT name, base_fee, per_participant_fee, tenant_id
FROM entry_size_categories
WHERE name = 'Production'
ORDER BY tenant_id;
```

### Verify entry fees updated:
```sql
SELECT ce.id, ce.title, ce.entry_fee,
       (SELECT COUNT(*) FROM entry_participants ep WHERE ep.entry_id = ce.id) as participants,
       (SELECT COUNT(*) * 55 FROM entry_participants ep WHERE ep.entry_id = ce.id) as expected_fee
FROM competition_entries ce
JOIN entry_size_categories esc ON ce.entry_size_category_id = esc.id
WHERE esc.name = 'Production'
AND ce.status = 'submitted';
```

---

## Prevention Measures

1. **Add NOT NULL constraint** to pricing columns (or check constraint requiring at least one)
2. **Add validation** in entry creation to reject $0 fees for group entries
3. **Audit script** to detect $0 fee entries with multiple participants
4. **Settings verification checklist** when updating tenant configurations

---

## Stakeholder Communication

- [ ] Notify EMPWR CD about pricing discrepancy
- [ ] Notify Glow CD about pricing discrepancy
- [ ] Determine approach for PAID invoices (supplemental vs adjustment)
- [ ] Communicate with affected studios about additional charges

---

## Approvals Required

- [ ] User approval to update entry_size_categories pricing
- [ ] User approval to update entry fees
- [ ] User/CD decision on invoice correction approach
- [ ] User approval before any invoice modifications

---

## Status Updates

| Date | Update |
|------|--------|
| 2025-12-23 | Incident identified, root cause confirmed, report created |
| 2025-12-23 | Additional Glow CD reports received (3 related issues) |
| 2025-12-23 | Issue #1 (Poise) confirmed NOT a bug - totals are correct |
| 2025-12-23 | Issue #2 (NJADS) FIXED - PDF deposit bug (cfa80f1) + Pipeline balance bug (pending) |
| 2025-12-23 | Issue #3 (Dancepirations) - No active invoice, both VOIDED |

---

## Additional Glow CD Reports (Dec 23)

### Issue #1: Poise Studio - Totals Mismatch
- **Reported:** Routine summaries shows $10,185 but actual total is over $15k before discounts
- **Status:** ✅ NOT A BUG
- **Finding:** $10,185 IS the correct total after credits are applied
- **DB Values:** subtotal=$14,670, credit=$1,467 (10%), other_credit=$3,018.18 → total=$10,184.82

### Issue #2: NJADS - Deposit Credit Not Applied
- **Reported:** Shows $500 balance due, not applying $500 deposit credit
- **Status:** ✅ FIXED (2 bugs found)

**Bug A: PDF Deposit Display** (commit cfa80f1)
- PDF generation looked for deposit in wrong location (`summary.depositAmount` instead of `reservation.depositAmount`)
- Fix: Updated `pdf-reports.ts` line 943 to check both locations

**Bug B: Pipeline Balance Display** (pending deploy)
- Pipeline showed $500 balance because `balance_remaining = 0` was treated as falsy
- `reservation.ts` line 1647: `invoice?.balance_remaining ? ...` returns null when balance is 0
- Fix: Changed to `invoice?.balance_remaining != null ? ...` to properly handle 0
- This caused fallback calculation: `total - amountPaid = 14066 - 13566 = $500` (didn't account for deposit)

### Issue #3: Dancepirations - Multiple Credits Display Issue
- **Reported:** Long note added for discount, but display doesn't match what SD sees
- **Reported:** Multiple credits (Glow $ + other credit) have to be combined into one field
- **Request:** Need ability to apply multiple credits separately
- **Status:** ⚠️ NO ACTIVE INVOICE
- **Finding:** Both invoices for Dancepirations are VOIDED status - no active invoice to fix
- **Action Needed:** CD needs to generate new invoice for this studio

---

## Main Incident Status

**Production $0 Fee Issue:** AWAITING APPROVAL

The main incident (13 Production entries billed at $0, $28,105 missing revenue) requires:
1. ⬜ Approval to fix entry_size_categories pricing ($55/participant)
2. ⬜ Approval to update entry fees on affected entries
3. ⬜ CD decision on invoice correction approach (supplemental vs void/reissue)

**Next Action:** Await user approval on remediation approach
