# Invoice Correction Execution Plan

**Created:** 2025-12-23
**Updated:** 2025-12-23 18:30 EST
**Status:** ✅ ALL INVOICES CORRECTED - Awaiting CD approval to send emails
**Related:** PRODUCTION_FEE_REMEDIATION_PLAN.md

---

## EXECUTION STATUS

### EMPWR Studios (4) - ✅ INVOICES CORRECTED

| Studio | Old Invoice | New Invoice | Status |
|--------|-------------|-------------|--------|
| Academy of Dance Arts | `bb08b9ce-26c8-4b37-af0f-99d2e46a2bfc` | `8fa14a8c-3e77-4fb8-973f-cf7cb021fc0f` | ✅ SENT |
| Cassiahs Dance Company | `081cf8ee-0052-4a8a-be61-3a0cfb30b129` | `1344cd28-ecae-4882-bc1b-19b374d9968d` | ✅ SENT |
| Elite Star | `b62b4468-a206-4c52-a0f8-a0cb24195e67` | `1a3c868c-ddc3-4409-b438-6342ce9d5bb8` | ✅ SENT |
| Fever | `de0daeee-6756-42f9-a637-9bdd8f0913c0` | `0c5d7de7-d5ec-40b9-b033-c61467052ba2` | ✅ SENT |

**All old invoices VOIDED. All new invoices created with correct Production fees.**

### Glow Studios (4 active) - ✅ INVOICES CORRECTED

| Studio | Old Invoice | New Invoice | Status |
|--------|-------------|-------------|--------|
| Cassiahs Dance Company | `018df545-6a1c-4e66-b108-42b78e1188fb` | `0c2f6ba4-006a-455a-a13c-c808087c4921` | ✅ Created |
| Dancecore | `52c45f69-720a-40b8-b016-06cc4807d59e` | `5cb727e2-f26f-4812-bb28-5773cacdd28c` | ✅ Created |
| Fever | `fa9df6d5-d85a-4e38-9f51-22c40f89739b` | `28b887b4-ac15-4c43-8edb-1388fb9fb3d5` | ✅ Created |
| Kingston Dance Force | `0afa62a0-66db-4a28-acee-3d0afe1fa6cf` | `50467c05-d014-4044-a14c-f7977151e797` | ✅ Created |

**All old invoices VOIDED. All new invoices created with correct fees.**

### Emails - ⏳ AWAITING CD APPROVAL

- [ ] EMPWR CD approval to send emails
- [ ] Glow CD approval (after EMPWR)

---

## CRITICAL: Pre-Execution Verification

All entry fees are ALREADY FIXED in the database:
- Production entries: All now show correct $55/participant
- Title upgrades: All now show correct $145

**The ONLY issue is invoice line_items contain OLD snapshots with $0 or $115**

---

## EMPWR Studios (4) - Production $0 Issues

### 1. ACADEMY OF DANCE ARTS (SENT)

**Invoice ID:** `bb08b9ce-26c8-4b37-af0f-99d2e46a2bfc`

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $11,360.00 | $12,680.00 (+$1,320) |
| Credit (10%) | $1,136.00 | $1,268.00 |
| Other Credit | $705.00 (Glow$ + Preslee) | $705.00 ✓ |
| Pre-tax | $9,519.00 | $10,707.00 |
| Tax (13%) | $1,237.47 | $1,391.91 |
| **Total** | **$10,756.47** | **$12,098.91** |
| Deposit | $500.00 | $500.00 ✓ |
| Amount Paid | $0.00 | $0.00 ✓ |
| **Balance Due** | **$10,256.47** | **$11,598.91** |

**Production Entry:** "Little Mermaid" - 24 participants × $55 = $1,320
**Missing:** $1,320 (before discounts/tax)

---

### 2. CASSIAHS DANCE COMPANY (PAID → SENT)

**Invoice ID:** `081cf8ee-0052-4a8a-be61-3a0cfb30b129`

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $11,025.00 | $13,335.00 (+$2,310) |
| Credit (10%) | $1,102.50 | $1,333.50 |
| Other Credit | $5,125.00 ($5000 dep + $125 Glow$) | $5,125.00 ✓ |
| Pre-tax | $4,797.50 | $6,876.50 |
| Tax (13%) | $623.68 | $893.95 |
| **Total** | **$5,421.18** | **$7,770.45** |
| Deposit | $500.00 | $500.00 ✓ |
| Amount Paid | $0.00 | $0.00 ✓ |
| **Balance Due** | **$4,921.18** | **$7,270.45** |

**Production Entry:** "COME ON DOWN..." - 42 participants × $55 = $2,310
**Missing:** $2,310 (before discounts/tax)

---

### 3. ELITE STAR (PAID → SENT)

**Invoice ID:** `b62b4468-a206-4c52-a0f8-a0cb24195e67`

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $8,025.00 | $9,675.00 (+$1,650) |
| Credit (10%) | $802.50 | $967.50 |
| Other Credit | $0.00 | $0.00 ✓ |
| Pre-tax | $7,222.50 | $8,707.50 |
| Tax (13%) | $938.93 | $1,131.98 |
| **Total** | **$8,161.43** | **$9,839.48** |
| Deposit | $500.00 | $500.00 ✓ |
| Amount Paid | $0.00 | $0.00 ✓ |
| **Balance Due** | **$7,661.43** | **$9,339.48** |

**Production Entry:** "Neverland" - 30 participants × $55 = $1,650
**Missing:** $1,650 (before discounts/tax)

---

### 4. FEVER (SENT)

**Invoice ID:** `de0daeee-6756-42f9-a637-9bdd8f0913c0`

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $34,565.00 | $38,635.00 (+$4,070) |
| Credit (10%) | $3,456.50 | $3,863.50 |
| Other Credit | $0.00 | $0.00 ✓ |
| Pre-tax | $31,108.50 | $34,771.50 |
| Tax (13%) | $4,044.11 | $4,520.30 |
| **Total** | **$35,152.61** | **$39,291.80** |
| Deposit | $500.00 | $500.00 ✓ |
| Amount Paid | $0.00 | $0.00 ✓ |
| **Balance Due** | **$34,652.60** | **$38,791.80** |

**Production Entry:** "Murder Mystery" - 74 participants × $55 = $4,070
**Missing:** $4,070 (before discounts/tax)

---

## Glow Studios (4 with active invoices)

### 5. CASSIAHS DANCE COMPANY (PAID → SENT)

**Invoice ID:** `018df545-6a1c-4e66-b108-42b78e1188fb`

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $11,165.00 | $13,450.00 (+$2,285) |
| Credit (10%) | $1,116.50 | $1,345.00 |
| Other Credit | $50.00 (Glow$) | $50.00 ✓ |
| Pre-tax | $9,998.50 | $12,055.00 |
| Tax (13%) | $1,299.81 | $1,567.15 |
| **Total** | **$11,298.31** | **$13,622.15** |
| Deposit | $5,500.00 | $5,500.00 ✓ |
| Amount Paid | $5,798.31 | $5,798.31 ✓ |
| **Balance Due** | **$0.00** | **$2,323.84** |

**Production Entry:** "COME ON DOWN..." - 41 participants × $55 = $2,255
**Title Entry:** "BIRDBOX" - $115 → $145 = +$30
**Missing:** $2,285 total (before discounts/tax)

---

### 6. DANCECORE (PAID → SENT)

**Invoice ID:** `52c45f69-720a-40b8-b016-06cc4807d59e`

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $11,730.00 | $13,710.00 (+$1,980) |
| Credit | $0.00 | $0.00 ✓ |
| Other Credit | $0.00 | $0.00 ✓ |
| Pre-tax | $11,730.00 | $13,710.00 |
| Tax (13%) | $1,524.90 | $1,782.30 |
| **Total** | **$13,254.90** | **$15,492.30** |
| Deposit | $500.00 | $500.00 ✓ |
| Amount Paid | $12,754.90 | $12,754.90 ✓ |
| **Balance Due** | **$0.00** | **$2,237.40** |

**Production Entry:** "Conga" - 36 participants × $55 = $1,980
**Missing:** $1,980 (before tax)

---

### 7. FEVER (PAID → SENT)

**Invoice ID:** `fa9df6d5-d85a-4e38-9f51-22c40f89739b`

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $34,345.00 | $38,415.00 (+$4,070) |
| Credit (10%) | $3,434.50 | $3,841.50 |
| Other Credit | $975.00 (Glow$ + Injury) | $975.00 ✓ |
| Pre-tax | $29,935.50 | $33,598.50 |
| Tax (13%) | $3,891.62 | $4,367.81 |
| **Total** | **$33,827.12** | **$37,966.31** |
| Deposit | $500.00 | $500.00 ✓ |
| Amount Paid | $33,327.11 | $33,327.11 ✓ |
| **Balance Due** | **$0.00** | **$4,139.20** |

**Production Entry:** "Murder Mystery" - 74 participants × $55 = $4,070
**Missing:** $4,070 (before discounts/tax)

---

### 8. KINGSTON DANCE FORCE (SENT) - TITLE FEES ONLY

**Invoice ID:** `0afa62a0-66db-4a28-acee-3d0afe1fa6cf`

**NOTE:** Production entry is ALREADY CORRECT at $1,375 (25 × $55)!
Only Title fee issues (11 entries at $115 instead of $145)

| Field | Current | After Correction |
|-------|---------|------------------|
| Subtotal | $12,000.00 | $12,330.00 (+$330) |
| Credit (10%) | $1,200.00 | $1,233.00 |
| Other Credit | $100.00 (Glow$) | $100.00 ✓ |
| Pre-tax | $10,700.00 | $10,997.00 |
| Tax (13%) | $1,391.00 | $1,429.61 |
| **Total** | **$12,091.00** | **$12,426.61** |
| Deposit | $8,500.00 | $8,500.00 ✓ |
| Amount Paid | $0.00 | $0.00 ✓ |
| **Balance Due** | **$3,591.00** | **$3,926.61** |

**Title Entries (11 × $30 = $330):**
- Contemporary Solo Brooklyn, Open Solo Eva, Acro Solo Vera
- Acro Solo Anna, Lyrical Solo Elora, Song and Dance Solo Vera
- Musical Theatre Solo Brooklyn, Lyrical Solo Brooklyn
- Song & Dance Solo Wynnie, Open Solo Elora, Jazz Solo Brooklyn

**Missing:** $330 (before discounts/tax)

---

## Summary of Missing Revenue

| Tenant | Studio | Production | Title | Total Missing |
|--------|--------|------------|-------|---------------|
| EMPWR | Academy of Dance Arts | $1,320 | - | $1,320 |
| EMPWR | Cassiahs Dance Company | $2,310 | - | $2,310 |
| EMPWR | Elite Star | $1,650 | - | $1,650 |
| EMPWR | Fever | $4,070 | - | $4,070 |
| **EMPWR Total** | | **$9,350** | **$0** | **$9,350** |
| Glow | Cassiahs Dance Company | $2,255 | $30 | $2,285 |
| Glow | Dancecore | $1,980 | - | $1,980 |
| Glow | Fever | $4,070 | - | $4,070 |
| Glow | Kingston Dance Force | $0 | $330 | $330 |
| **Glow Total** | | **$8,305** | **$360** | **$8,665** |
| **GRAND TOTAL** | | **$17,655** | **$360** | **$18,015** |

**Note:** These are pre-discount/tax amounts. Actual invoice increases vary due to % discounts and tax calculations.

---

## Execution Steps (PER STUDIO)

### For SENT Invoices (3):
1. VOID existing invoice
2. Regenerate invoice (will use corrected entry_fee from database)
3. VERIFY all credits/discounts match exactly:
   - credit_amount, credit_reason
   - other_credit_amount, other_credit_reason
   - additional_credits JSONB
   - deposit_amount
   - tax_rate (13%)
4. Mark as SENT
5. Send invoice correction email to studio

### For PAID Invoices (5):
1. Record current amount_paid
2. VOID existing invoice
3. Regenerate invoice (will use corrected entry_fee from database)
4. VERIFY all credits/discounts match exactly
5. Set amount_paid = previous amount
6. Calculate balance_remaining = new_total - amount_paid
7. Mark as SENT (they owe additional balance)
8. Send invoice correction email to studio

---

## Email Sequence (Per Studio)

**Studios receive ONE email each:**

1. **Subject:** "Invoice Correction - [Competition Name] - [Studio Name]"
2. **Content includes:**
   - Reference to CD's prior communication
   - Explanation: Production billed at $0 instead of $55/participant
   - Reference to verify on previous invoice
   - Corrected amount breakdown
   - Balance due
   - Payment extension through December 30, 2025
   - **CTA Button: Direct link to studio's invoice page**

**Email Template Location:** `scripts/test-invoice-correction-email.ts`

### CTA Button URL Format (REQUIRED)
```
https://{subdomain}.compsync.net/dashboard/invoices/{studioId}/{competitionId}
```

**EMPWR Studios - Complete URL Data:**
| Studio | subdomain | studioId | competitionId |
|--------|-----------|----------|---------------|
| Academy of Dance Arts | empwr | `9f96460e-904c-4d12-8f50-aaeae27367df` | `05c0eae4-cb2f-44cc-9c5e-6b2eed700904` |
| Cassiahs Dance Company | empwr | `f2408542-d84d-46c7-a129-2649d7b288a6` | `05c0eae4-cb2f-44cc-9c5e-6b2eed700904` |
| Elite Star | empwr | `87974d9a-729d-4a8d-8e57-bdd35a804b3e` | `05c0eae4-cb2f-44cc-9c5e-6b2eed700904` |
| Fever | empwr | `758d101c-26fa-4b22-8d9b-894541b7bd2b` | `e5a6ee60-e440-4a3e-bc60-43eb40c46b30` |

**Glow Studios - Complete URL Data:**
| Studio | subdomain | studioId | competitionId |
|--------|-----------|----------|---------------|
| Cassiahs Dance Company | glow | `e3d4b5ad-8189-4260-82fb-716b9d29d860` | `5607b8e5-06dd-4d14-99f6-dfa335df82d3` |
| Dancecore | glow | `d481685c-b9f2-489e-aa51-29f1f3b4f15f` | `6c433126-d10b-4198-9eee-2f00187a011d` |
| Fever | glow | `3c973ea4-da21-48d3-bef4-e116a7a02bc7` | `5607b8e5-06dd-4d14-99f6-dfa335df82d3` |
| Kingston Dance Force | glow | `944f8cad-2fd5-463d-991d-14d52aa79275` | `59d8567b-018f-409b-8e51-3940406197a4` |

---

## Fields That MUST Be Preserved

For each regenerated invoice, verify these match the original:

| Field | Description |
|-------|-------------|
| credit_amount | % discount amount |
| credit_reason | Discount description |
| other_credit_amount | Fixed $ credit |
| other_credit_reason | Credit description |
| additional_credits | JSONB array of credits |
| deposit_amount | Deposit paid |
| tax_rate | 13% |
| amount_paid | For PAID invoices |

---

## VOIDED Invoices (3 studios - NOT in this execution)

These studios have VOIDED invoices and require new invoice generation when ready:
- Danceology (Glow) - $8,195 Production
- Dancepirations (Glow) - $4,730 Production
- Taylor's Dance Academy (Glow) - $1,100 Production

**Total VOID studios missing:** $14,025

---

## Approval Required

- [ ] EMPWR CD approval
- [ ] Glow CD approval
- [ ] User approval to execute

**DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL**
