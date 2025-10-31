# Glow Tenant Data Seeding Report

**Date:** October 31, 2025
**Session:** Client Data Seeding
**Status:** ✅ COMPLETE
**Commit:** 3e5c2b3

---

## 📊 Summary

Successfully seeded Glow tenant with 25 pre-approved studios and reservations across 3 competitions.

### Total Numbers
- **Studios Created:** 25
- **Reservations Created:** 25
- **Total Entry Spaces:** 1,425
- **Total Deposits:** $12,500
- **Total Credits:** $7,050
- **Discount Rate:** 10% (all studios)

---

## 🏢 Studios by Competition

### St. Catharines Spring (April 9-12, 2026)
**Competition ID:** `6c433126-d10b-4198-9eee-2f00187a011d`

| Studio | Code | Entries | Deposit | Credits | Email |
|--------|------|---------|---------|---------|-------|
| NJADS | NJD5A | 100 | $500 | $800 | hello@njads.ca |
| Northern Lights | NL8GH | 55 | $500 | $475 | christineeagle@ymail.com |
| Taylors Dance | TYL3R | 60 | $500 | $500 | taylorsdance2018@outlook.com |
| Dancecore | DCR7E | 60 | $500 | $0 | dancecorecompany@gmail.com |
| The Dance Extension | DXT9K | 40 | $500 | $0 | thedanceextensioninc@gmail.com |
| Expressions Dance | EXP4S | 30 | $500 | $0 | expressionsdanceperformingarts@gmail.com |
| Impact Dance Complex | IMP2C | 40 | $500 | $625 | impactdanceinfo@gmail.com |
| Studio 519 | S5196 | 50 | $500 | $0 | studio519dance@gmail.com |

**Subtotal:** 8 studios, 435 entries, $4,000 deposits, $2,400 credits

---

### Blue Mountain Spring (April 23-26, 2026)
**Competition ID:** `5607b8e5-06dd-4d14-99f6-dfa335df82d3`

| Studio | Code | Entries | Deposit | Credits | Email |
|--------|------|---------|---------|---------|-------|
| Poise Dance Academy | POS8D | 70 | $500 | $900 | comp@poisedance.ca |
| Danceology | DLG4Y | 80 | $500 | $675 | dmkdanceology@gmail.com |
| Dancetastic | DTS3C | 100 | $500 | $1,000 | liz@dancetasticcanada.com |
| Cassiahs Dance Company | CSH7A | 70 | $500 | $875 | cassiahs.comp@gmail.com |
| Dancesations | DST9N | 50 | $500 | $625 | nikki@dancesations.com |
| Uxbridge | UXB5E | 50 | $500 | $100 | uxbridgedanceacademy@gmail.com |
| Fever | FVR2E | 50 | $500 | $0 | feverdanceacademy@gmail.com |
| Dancing Angels | DNG6L | 30 | $500 | $0 | sharonelliot123@gmail.com |
| CDA | CDA4K | 40 | $500 | $0 | caprioldanceacademycomp@gmail.com |
| Dancepirations | DPR7T | 70 | $500 | $0 | dancepirations@gmail.com |

**Subtotal:** 10 studios, 610 entries, $5,000 deposits, $4,175 credits

---

### Blue Mountain Summer (June 4-7, 2026)
**Competition ID:** `59d8567b-018f-409b-8e51-3940406197a4`

| Studio | Code | Entries | Deposit | Credits | Email |
|--------|------|---------|---------|---------|-------|
| Kingston Dance Force | KDF3F | 80 | $500 | $100 | sarrah@danceforce.ca |
| Dancemakers | DMK8R | 50 | $500 | $225 | mijkahooper@yahoo.ca |
| Rebel | RBL5E | 50 | $500 | $0 | rebeldancecompany@gmail.com |
| Prodigy Dance | PRD9Y | 60 | $500 | $150 | prodigydance2021@gmail.com |
| Legacy Acro | LGC6A | 40 | $500 | $0 | legacyacro@gmail.com |
| Mariposa | MRP2S | 60 | $500 | $0 | mariposa.dance@gmail.com |
| Goddards | GDD4R | 40 | $500 | $0 | goddardsdanceacademy@gmail.com |

**Subtotal:** 7 studios, 380 entries, $3,500 deposits, $475 credits

---

## 🔧 Database Changes

### Migrations Applied

**Migration 1:** `allow_null_owner_id_for_unclaimed_studios`
- Modified `studios.owner_id` to allow NULL values
- Enables pre-approved studios without user accounts
- Studios will claim accounts later via email invitation

**Migration 2:** `add_discount_credits_to_reservations`
- Added `discount_percentage` column (DECIMAL(5,2))
- Added `credits_applied` column (DECIMAL(10,2))
- Required for storing negotiated terms with studios

### Schema Changes
- Updated Prisma schema via `prisma db pull`
- Generated Prisma Client
- Build passed (67/67 pages)

---

## 📝 Files Created

### Scripts
- `scripts/read-client-data.js` - Parse Excel files
- `scripts/seed-glow-reservations.js` - Node.js seeding script (blocked by RLS)
- `scripts/seed-glow-data.sql` - Studio creation SQL
- `scripts/glow-reservations-data.sql` - Reservation creation SQL

### Data Source
- 3 Excel files from Selena (Glow CD)
- `april 9-12 st catharines.xlsx` (8 studios)
- `april 23-26th blue mountain.xlsx` (10 studios)
- `june 4-7 blue mountain.xlsx` (7 studios)

---

## ✅ Verification Results

### Data Integrity Checks

**Studios:**
```sql
SELECT COUNT(*) FROM studios
WHERE tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
  AND status = 'approved'
  AND owner_id IS NULL;
-- Result: 25 ✅
```

**Reservations by Competition:**
```sql
SELECT
  c.name,
  COUNT(r.id) AS reservations,
  SUM(r.spaces_requested) AS entries,
  SUM(r.deposit_amount) AS deposits,
  SUM(r.credits_applied) AS credits
FROM reservations r
JOIN competitions c ON r.competition_id = c.id
WHERE r.tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5'
GROUP BY c.name
ORDER BY c.competition_start_date;
```

| Competition | Reservations | Entries | Deposits | Credits |
|-------------|--------------|---------|----------|---------|
| St. Catharines Spring | 8 | 435 | $4,000 | $2,400 |
| Blue Mountain Spring | 10 | 610 | $5,000 | $4,175 |
| Blue Mountain Summer | 7 | 380 | $3,500 | $475 |

**All verifications passed ✅**

---

## 🚀 Next Steps

### Phase 1: Account Claiming (Nov 1-7)
1. Send email invitations to all 25 studios
2. Studios click link → redirected to signup with pre-filled email
3. Studio creates account → owner_id populated
4. Studio gains access to dashboard

### Phase 2: Entry Creation (Nov 8+)
1. Studios can create dancers
2. Studios can create routine entries
3. All Phase 2 validations active (choreographer required, classification enforcement)

### Email Template Required
```
Subject: Claim Your Glow Dance Competition Account

Hi [Studio Name],

You've been pre-approved for [Competition Name]!

Your reservation:
- Entries: [X]
- Deposit: $[X]
- Credits: $[X]
- Discount: [X]%

Claim your account:
https://glow.compsync.net/claim?code=[PUBLIC_CODE]

Questions? Reply to this email.

— Glow Dance Competition Team
```

---

## 🔐 Production Impact

### Zero Breaking Changes
- Existing EMPWR tenant unaffected
- All queries properly scoped by tenant_id
- No cross-tenant data leakage
- Build passed successfully

### New Capabilities
- Studios can exist without owners (pre-approved)
- Reservations support discount percentages
- Reservations support credits/Glow Dollars
- Ready for account claiming workflow

---

## 📈 Business Value

### Pre-Approved Studios
- Studios confirmed and ready for November launch
- Deposits collected ($12,500 total)
- Credits negotiated ($7,050 total)
- 10% discount rate applied uniformly

### Launch Readiness
- 3 competitions fully configured
- 1,425 entry spaces reserved
- 25 studios ready to claim accounts
- Financial terms locked in database

---

## 🎯 Success Criteria

- [x] All 25 studios created
- [x] All 25 reservations created
- [x] All financial data seeded (deposits, credits, discounts)
- [x] Database migrations successful
- [x] Prisma schema updated
- [x] Build passed (67/67 pages)
- [x] Data verified via SQL queries
- [x] Changes committed and pushed

**Status:** ✅ COMPLETE - Ready for production deployment

---

**Commit:** 3e5c2b3
**Deploy:** Automatic via Vercel (main branch)
**Next Session:** Test account claiming workflow on production
