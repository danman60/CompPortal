# Production $0 Fee Remediation Plan

**Created:** 2025-12-23
**Updated:** 2025-12-23
**Status:** PENDING CD APPROVAL
**Related Incident:** INCIDENT_2025-12-23_PRODUCTION_ZERO_FEE.md

---

## Overview

| Metric | Count |
|--------|-------|
| Production Entries at $0 | 13 |
| Title Upgrade Entries Missing $30 | 12 (overlap with Production studios) |
| Unique Invoices to Correct | 9 |
| EMPWR Invoices | 4 |
| Glow Invoices | 5 |
| Missing Production Revenue | $28,105 |
| Missing Title Upgrade Revenue | $360 |
| **Total Missing Revenue** | **$28,465** |

---

## Phase 1: Fix Root Cause - COMPLETED

```sql
-- EXECUTED 2025-12-23
UPDATE entry_size_categories
SET per_participant_fee = 55.00
WHERE name = 'Production'
AND tenant_id IN (
  '00000000-0000-0000-0000-000000000001',  -- EMPWR
  '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'   -- Glow
);
-- Also cleaned up duplicate Glow Production row
```

**Status:** Production pricing now set to $55/participant. New entries will be billed correctly.

---

## Affected Invoices by Studio

### EMPWR Tenant ($9,350 Production)

| Studio | Status | Production Entry | Participants | Additional |
|--------|--------|------------------|--------------|------------|
| Academy of Dance Arts | SENT | Little Mermaid | 24 | $1,320 |
| Cassiahs Dance Company | PAID | COME ON DOWN... | 42 | $2,310 |
| Elite Star | PAID | Neverland | 30 | $1,650 |
| Fever | SENT | Murder Mystery | 74 | $4,070 |

### Glow Tenant ($18,755 Production + $360 Title Upgrade)

| Studio | Status | Production | Title Upgrade Missing | Additional |
|--------|--------|------------|----------------------|------------|
| Cassiahs Dance Company | PAID | 1 entry (41 ppl) | 1 entry (+$30) | $2,285 |
| Dancecore | PAID | 1 entry (36 ppl) | - | $1,980 |
| Expressions Dance | PAID | 5 entries (165 ppl) | - | $9,075 |
| Fever | PAID | 1 entry (74 ppl) | - | $4,070 |
| Kingston Dance Force | SENT | 1 entry (25 ppl) | 11 entries (+$330) | $1,705 |

**Cassiahs Title Entry:** BIRDBOX ($115 → $145)
**Kingston Title Entries:** 11 solos at $115 each → should be $145 each

---

## Phase 2: Fix Entry Fees (PENDING)

### Production Entries (13 total)
Update entry_fee to `participants × $55`:

```sql
UPDATE competition_entries ce
SET
  entry_fee = (SELECT COUNT(*) * 55 FROM entry_participants WHERE entry_id = ce.id),
  total_fee = (SELECT COUNT(*) * 55 FROM entry_participants WHERE entry_id = ce.id) + COALESCE(late_fee, 0)
WHERE ce.id IN (
  -- List of 13 Production entry IDs
);
```

### Title Upgrade Entries (12 total for Cassiahs + Kingston)
Add $30 to entry_fee:

```sql
UPDATE competition_entries
SET
  entry_fee = 145,
  total_fee = 145 + COALESCE(late_fee, 0)
WHERE is_title_upgrade = true
AND entry_fee = 115
AND studio_id IN (
  -- Cassiahs Dance Company (Glow)
  -- Kingston Dance Force (Glow)
);
```

---

## Phase 3: Process Invoices (PENDING)

### SENT Invoices (3 total)
- Academy of Dance Arts (EMPWR)
- Fever (EMPWR)
- Kingston Dance Force (Glow) - includes 11 title upgrades

**Process:**
1. VOID existing invoice
2. Regenerate invoice with corrected entry fees
3. Mark as SENT

### PAID Invoices (6 total)
- Cassiahs Dance Company (EMPWR)
- Elite Star (EMPWR)
- Cassiahs Dance Company (Glow) - includes 1 title upgrade
- Dancecore (Glow)
- Expressions Dance (Glow)
- Fever (Glow)

**Process:**
1. Record current amount_paid
2. VOID existing invoice
3. Regenerate invoice with correct total
4. Set amount_paid = what they already paid
5. Set balance_remaining = new_total - amount_paid
6. Set status = 'SENT' (pending additional payment)

---

## Phase 4: Email Notification (PENDING)

Each studio receives personalized email explaining:
- Billing error with Production entries (and Title Upgrade if applicable)
- Original invoice voided
- New invoice with corrected amount
- For PAID: Previous payment credited, balance remaining
- For SENT: Corrected total

---

## Email Template for Studios

**Subject:** Invoice Correction - [Competition Name] Entry Fee Adjustment

Dear [Studio Name],

We recently identified a billing configuration error affecting some entries. We are correcting this and issuing updated invoices.

**Issues Identified:**
[IF PRODUCTION:] - Production entries were billed at $0 instead of $55/participant
[IF TITLE:] - Title Upgrade entries were missing the +$30 fee

**Invoice Update:**
- Original Invoice has been **voided**
- Corrected Invoice is now available in your portal

**Your Corrections:**
| Entry Title | Issue | Was | Now | Difference |
|------------|-------|-----|-----|------------|
| [Title] | [Production/Title] | $[old] | $[new] | +$[diff] |

[IF PAID:]
**Payment Status:** You previously paid $[paid]. The corrected total is $[new_total], leaving a balance of $[remaining].

[IF SENT:]
**Action:** Please disregard the previous invoice. The updated balance due is $[new_total].

We sincerely apologize for this error. Please contact us with any questions.

Best regards,
[Competition] Team

---

## Verification Queries

```sql
-- Verify Production pricing fixed (DONE)
SELECT name, per_participant_fee, tenant_id
FROM entry_size_categories WHERE name = 'Production';

-- Verify Production entry fees updated
SELECT ce.title, ce.entry_fee,
  (SELECT COUNT(*) * 55 FROM entry_participants WHERE entry_id = ce.id) as expected
FROM competition_entries ce
JOIN entry_size_categories esc ON ce.entry_size_category_id = esc.id
WHERE esc.name = 'Production';

-- Verify Title Upgrade entry fees ($145 for all)
SELECT ce.title, ce.entry_fee, s.name as studio
FROM competition_entries ce
JOIN studios s ON ce.studio_id = s.id
WHERE ce.is_title_upgrade = true
AND ce.entry_fee != 145
AND ce.status != 'cancelled';

-- Verify invoice totals after correction
SELECT s.name, i.status, i.total, i.amount_paid, i.balance_remaining
FROM invoices i
JOIN studios s ON i.studio_id = s.id
WHERE i.status != 'VOIDED';
```

---

## Additional Studios Needing Separate Title Upgrade Fix

These studios have missing $30 title upgrade fees but are NOT getting Production invoice corrections:

| Studio | Tenant | Entries | Missing |
|--------|--------|---------|---------|
| WHITBY DANCE COMPANY | EMPWR | 3 | $90 |
| Steppin Up | Glow | 3 | $90 |

**Total:** $180 (handle separately after CD discussion)

---

## Approvals Required

- [x] Phase 1: Production pricing fix - **COMPLETED**
- [ ] EMPWR CD approval for invoice corrections
- [ ] Glow CD approval for invoice corrections
- [ ] User approval to execute Phases 2-4

---

**Next Step:** Await CD approval before executing Phases 2-4.
