# Production Seed Handbook - EMPWR Dance Experience
**Date:** October 30, 2025
**Tenant:** EMPWR Dance Experience
**Tenant ID:** `00000000-0000-0000-0000-000000000001`
**Subdomain:** `empwr.compsync.net`

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Competition Mappings](#competition-mappings)
3. [Studio Data (22 Studios, 1,546 Entries)](#studio-data)
4. [Pre-Seed Requirements](#pre-seed-requirements)
5. [Database Preparation](#database-preparation)
6. [Migration Script](#migration-script)
7. [Verification Steps](#verification-steps)
8. [Communication Plan](#communication-plan)
9. [Rollback Plan](#rollback-plan)
10. [Support & Troubleshooting](#support--troubleshooting)

---

## Executive Summary

### What This Does
Seeds 22 existing studios with approved reservations (1,546 total entries) into CompPortal mid-workflow, allowing studios to claim accounts, complete onboarding, and submit their entries.

### Migration Approach
1. **Wipe demo data** (3 test studios)
2. **Reset capacity** to 600 per competition
3. **Create user accounts** for each studio (with temp passwords)
4. **Create studios** linked to users
5. **Create reservations** (status='pending') with CSV data
6. **Call capacityService.reserve()** to transition to 'approved' status
7. **Send password setup emails** to all studio directors

### Status at a Glance
| Item | Status |
|------|--------|
| Competition IDs | ✅ Ready |
| Studio data (names, entry counts) | ✅ Ready |
| Capacity calculations | ✅ Ready |
| Migration script architecture | ✅ Ready |
| Email addresses | 🔴 **BLOCKED** |
| Deposit handling logic | 🟡 Needs decision |
| Schema updates | 🟡 Not yet implemented |
| Email templates | 🟡 Not yet created |

---

## Competition Mappings

### Competition Details

| CSV Name | Database Name | Competition ID | Dates | Capacity |
|----------|---------------|----------------|-------|----------|
| LONDON APRIL 10-12 | EMPWR Dance - London | `79cef00c-e163-449c-9f3c-d021fbb4d672` | April 10-12, 2026 | 600 |
| ST CATHARINES APRIL 16-18 | EMPWR Dance - St. Catharines #1 | `05c0eae4-cb2f-44cc-9c5e-6b2eed700904` | April 16-18, 2026 | 600 |
| ST CATHARINES MAY 7-9 | EMPWR Dance - St. Catharines #2 | `e5a6ee60-e440-4a3e-bc60-43eb40c46b30` | May 7-9, 2026 | 600 |

### Capacity After Migration

| Competition | Capacity | CSV Entries | Buffer |
|-------------|----------|-------------|--------|
| London | 600 | 583 | 17 (2.8%) |
| St. Catharines #1 | 600 | 483 | 117 (19.5%) |
| St. Catharines #2 | 600 | 480 | 120 (20%) |
| **TOTAL** | **1,800** | **1,546** | **254 (14%)** |

---

## Studio Data

### London - April 10-12, 2026 (8 studios, 583 entries)

| # | Studio Name | Contact Name(s) | Entries | Deposit | Date Rec. | Account Manager | Discount/Notes |
|---|-------------|-----------------|---------|---------|-----------|-----------------|----------------|
| 1 | EN AVANT | Tracey Coward & Angelina | 30 | $500 | - | Selena | ? |
| 2 | STEP ABOVE | Jacqueline | 125 | $1,000 | - | Selena | ? |
| 3 | ELAN DANCE ARTS | Shawna | 40 | $500 | - | Selena | ? |
| 4 | WHITBY DANCE COMPANY | Samantha & Madison | 90 | $1,000 | May 31 | Emily | 10% discount |
| 5 | ONEILL ACADEMY | Kim | 70 | $1,000 | - | Emily | n/a |
| 6 | THE DANCE SHOPPE | Ruth-Ann & Rachelle | 193 | $1,000 | - | Emily | 5% discount if balance rec. by Nov 1 |
| 7 | A.B LUCAS DANCE TEAM | Lianna & Aria Kruger | 5 | n/a | n/a | Emily | n/a |
| 8 | DANCENERGY | Ashley | 30 | $500 | May 24 | Emily | 10% discount |

**Subtotal:** 583 entries, ~$5,500 deposits

---

### St. Catharines #1 - April 16-18, 2026 (8 studios, 483 entries)

| # | Studio Name | Contact Name(s) | Entries | Deposit | Date Rec. | Account Manager | Discount/Notes |
|---|-------------|-----------------|---------|---------|-----------|-----------------|----------------|
| 9 | POISE | Linda | 70 | - | - | Selena | ? |
| 10 | ELITE STAR | Lynette & Alice | 38 | - | - | Selena | ? |
| 11 | ACADEMY OF DANCE ARTS | Nancy & Kim | 80 | - | - | Selena | ? |
| 12 | DANCETASTIC | Lia | 70 | - | - | Selena | ? |
| 13 | CASSIAHS DANCE COMPANY | Cassiah | 40 | $500 | May 14, 2025 | Emily | 10% off entry fees |
| 14 | RIVERTOWN DANCE ACADEMY | Catherine & Megan | 60 | $1,000 | June 13 | Emily | 10% off entry fees |
| 15 | DANCEOLOGY | Denise | 80 | $1,000 | May 20 | Selena | 15% off entries, GLOW $ doubled |
| 16 | POWERHOUSE DANCE COMPANY | Kristen | 145 | $1,000 | May 23 | Emily | 10% off entry fees |

**Subtotal:** 483 entries, ~$3,500 deposits (some missing)

---

### St. Catharines #2 - May 7-9, 2026 (6 studios, 480 entries)

| # | Studio Name | Contact Name(s) | Entries | Deposit | Date Rec. | Account Manager | Discount/Notes |
|---|-------------|-----------------|---------|---------|-----------|-----------------|----------------|
| 17 | DANCESATIONS | Tracy | 70 | $1,000 | May 14, 2025 | Emily | 10% off entry fees |
| 18 | ALIVE DANCE COMPANY | Aysha | 65 | $500 | - | Selena | 10% off entry fees |
| 19 | DANCEFX | Ang | 110 | $500 | July 21, 2025 | Emily | n/a |
| 20 | STUDIO 22 | Stephanie & Lisa | 95 | $1,000 | July 7, 2025 | Emily | n/a |
| 21 | FEVER | Cristina & Cassandra | 160 | $500 | July 5, 2025 | Selena | ? |
| 22 | J'DANSE | Janie | 30 | $500 | May 19, 2025 | Emily | 10% off entry fees, GLOW $ doubled |

**Subtotal:** 480 entries, ~$4,000 deposits

---

### Data Quality Notes

**Missing Critical Data:**
- ❌ **Email addresses** for ALL 22 studios (BLOCKER)
- ⚠️ Deposit amounts missing for 4 studios (#9-12)
- ⚠️ Deposit dates missing for many entries
- ⚠️ Multiple contact names (which email to use?)

**Ambiguous Data:**
- "?" in discount column (unknown or no discount?)
- "GLOW $" reference (what is this?)
- Conditional discounts ("5% if balance rec. by Nov 1")
- Some dates in 2025 (typo or actual?)

---

## Pre-Seed Requirements

### P0 Blockers (Must Complete Before Seed)

#### 1. Email Addresses (CRITICAL)
**Status:** 🔴 BLOCKED

**Required:** Email address for each of the 22 studios

**Format Needed:**
```csv
Studio Name,Primary Email,Secondary Email (optional)
EN AVANT,tracey@example.com,angelina@example.com
STEP ABOVE,jacqueline@example.com,
...
```

**Questions to Resolve:**
- Studios with multiple contacts: Which email is primary?
- A.B LUCAS DANCE TEAM: Lianna or Aria's email?
- Studios with "&" contacts: Send to both or choose one?

---

#### 2. Deposit Handling Decision
**Status:** 🟡 NEEDS DECISION

**Options:**

**Option A: Store as Metadata (Simple)**
```typescript
// Store in reservation notes/metadata
reservation_notes: {
  deposit_amount: 500,
  deposit_date: '2025-05-24',
  payment_type: 'ET'
}
```
- ✅ Simple, no schema changes
- ❌ CD must manually apply credits during invoicing

**Option B: Create Deposit Credits Table (Automated)**
```sql
CREATE TABLE reservation_deposits (
  id UUID PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id),
  amount DECIMAL(10,2),
  received_date DATE,
  payment_type VARCHAR(50),
  applied_to_invoice_id UUID REFERENCES invoices(id)
);
```
- ✅ Structured, can auto-apply to invoices
- ❌ Requires schema migration

**Recommendation:** Option A for launch speed, Option B for v2

---

#### 3. Discount Handling
**Status:** 🟡 NEEDS DECISION

**Challenge:** CSV has free-text conditional discounts:
- "5% discount if balance rec. by Nov 1"
- "10% off entry fees"
- "15% off entries, GLOW $ doubled"

**Recommendation:**
Store as plain text in reservation notes, CD applies manually during invoice creation. System cannot auto-apply conditional terms.

---

### P1 Requirements (Nice to Have)

#### 4. Schema Updates
```sql
-- Password setup tokens (for secure password reset flow)
CREATE TABLE password_setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Pending activation flag
ALTER TABLE users ADD COLUMN pending_activation BOOLEAN DEFAULT FALSE;
```

#### 5. Email Templates
- Password setup invitation
- Pre-launch announcement (1 week before)
- Reminder emails (3 days before deadline)

---

## Database Preparation

### Step 1: Backup Current State

```bash
# Via Supabase CLI or dashboard
# Create manual backup before ANY changes
```

---

### Step 2: Wipe Demo Data

```sql
BEGIN;

-- Delete demo reservations first (FK constraint)
DELETE FROM competition_entries WHERE reservation_id IN (
  SELECT id FROM reservations WHERE studio_id IN (
    SELECT id FROM studios WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  )
);

DELETE FROM capacity_ledger WHERE reservation_id IN (
  SELECT id FROM reservations WHERE studio_id IN (
    SELECT id FROM studios WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  )
);

DELETE FROM reservations WHERE studio_id IN (
  SELECT id FROM studios WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
);

-- Delete demo studios
DELETE FROM studios WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Delete demo users (studio directors only, keep CD)
DELETE FROM users
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND role = 'studio_director';

COMMIT;
```

**Verification:**
```sql
-- Should return 0 studios, 0 reservations
SELECT COUNT(*) FROM studios WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) FROM reservations WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

---

### Step 3: Reset Competition Capacity

```sql
BEGIN;

-- Set all EMPWR competitions to 600 capacity
UPDATE competitions
SET
  total_reservation_tokens = 600,
  available_reservation_tokens = 600
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND year = 2026
  AND name LIKE 'EMPWR%';

COMMIT;
```

**Verification:**
```sql
SELECT name, total_reservation_tokens, available_reservation_tokens
FROM competitions
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND year = 2026
  AND name LIKE 'EMPWR%';

-- Expected:
-- EMPWR Dance - London: 600 / 600
-- EMPWR Dance - St. Catharines #1: 600 / 600
-- EMPWR Dance - St. Catharines #2: 600 / 600
```

---

## Migration Script

### Architecture Overview

```typescript
interface StudioMigrationData {
  studioName: string;
  primaryEmail: string;
  secondaryEmail?: string;
  competitionId: string;
  entriesApproved: number;
  depositAmount?: number;
  depositDate?: string;
  paymentType?: string;
  accountManager: string;
  discountNotes?: string;
}

async function seedProduction(studios: StudioMigrationData[]) {
  const results = {
    success: [],
    failed: [],
  };

  for (const studio of studios) {
    try {
      await migrateStudio(studio);
      results.success.push(studio.studioName);
    } catch (error) {
      results.failed.push({ studio: studio.studioName, error });
      // Continue with next studio (don't fail entire batch)
    }
  }

  return results;
}
```

---

### Core Migration Function

```typescript
async function migrateStudio(data: StudioMigrationData): Promise<void> {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const migrationUserId = 'SYSTEM_MIGRATION'; // Or CD user ID

  return await prisma.$transaction(async (tx) => {
    // 1. Create user account
    const tempPassword = generateSecurePassword(); // 16-char random
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await tx.users.create({
      data: {
        email: data.primaryEmail,
        password: hashedPassword,
        role: 'studio_director',
        tenant_id: tenantId,
        pending_activation: true, // Optional flag
        created_at: new Date(),
      },
    });

    // 2. Create studio (linked to user via owner_id)
    const studioCode = generateStudioCode(); // Random 5-char code

    const studio = await tx.studios.create({
      data: {
        owner_id: user.id, // REQUIRED (NOT NULL constraint)
        tenant_id: tenantId,
        name: data.studioName,
        code: studioCode,
        created_at: new Date(),
      },
    });

    // 3. Create reservation (status='pending' initially)
    const reservation = await tx.reservations.create({
      data: {
        tenant_id: tenantId,
        studio_id: studio.id,
        competition_id: data.competitionId,
        status: 'pending', // ← Start here, capacityService will update to 'approved'
        spaces_requested: data.entriesApproved,
        spaces_confirmed: data.entriesApproved,
        requested_at: new Date(),
        notes: JSON.stringify({
          migrated: true,
          migration_date: new Date().toISOString(),
          deposit_amount: data.depositAmount,
          deposit_date: data.depositDate,
          payment_type: data.paymentType,
          account_manager: data.accountManager,
          discount_notes: data.discountNotes,
        }),
      },
    });

    // 4. Reserve capacity via CapacityService
    // This will:
    // - Check status='pending' ✅
    // - Create capacity_ledger entry (reason: 'reservation_approval')
    // - Deduct from available_reservation_tokens
    // - Update reservation.status to 'approved'
    await capacityService.reserve(
      data.competitionId,
      data.entriesApproved,
      reservation.id,
      migrationUserId
    );

    // 5. Create activity log
    await tx.activity_logs.create({
      data: {
        tenant_id: tenantId,
        user_id: migrationUserId,
        action: 'reservation.migrated',
        entity_type: 'reservation',
        entity_id: reservation.id,
        metadata: {
          studio_name: data.studioName,
          competition_id: data.competitionId,
          entries_approved: data.entriesApproved,
          deposit_amount: data.depositAmount,
        },
      },
    });

    // 6. Create password setup token
    const token = generateSecureToken(32); // Crypto-secure token
    await tx.password_setup_tokens.create({
      data: {
        user_id: user.id,
        token,
        expires_at: addDays(new Date(), 30), // 30-day expiry
      },
    });

    // 7. Send password setup email (outside transaction)
    await sendPasswordSetupEmail({
      to: data.primaryEmail,
      studioName: data.studioName,
      token,
      reservationDetails: {
        competition: await getCompetitionName(data.competitionId),
        entries: data.entriesApproved,
        deposit: data.depositAmount,
      },
    });
  });
}
```

---

### Helper Functions

```typescript
function generateStudioCode(): string {
  // Random 5-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove ambiguous chars
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateSecurePassword(): string {
  // 16-character random password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateSecureToken(length: number): string {
  // Cryptographically secure token
  return crypto.randomBytes(length).toString('hex');
}

async function sendPasswordSetupEmail(data: {
  to: string;
  studioName: string;
  token: string;
  reservationDetails: any;
}): Promise<void> {
  // Use existing email service
  await emailService.send({
    to: data.to,
    template: 'password-setup',
    data,
  });
}
```

---

## Verification Steps

### Post-Migration Verification Checklist

**1. User Accounts Created**
```sql
SELECT COUNT(*) FROM users
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND role = 'studio_director';
-- Expected: 22
```

**2. Studios Created**
```sql
SELECT COUNT(*) FROM studios
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 22
```

**3. Reservations Created (All 'approved')**
```sql
SELECT status, COUNT(*) FROM reservations
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status;
-- Expected: approved = 22
```

**4. Capacity Ledger Entries**
```sql
SELECT competition_id, reason, COUNT(*), SUM(change_amount)
FROM capacity_ledger
WHERE reason = 'reservation_approval'
  AND reservation_id IN (
    SELECT id FROM reservations
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  )
GROUP BY competition_id, reason;
-- Expected: 22 entries, negative sums matching CSV totals
```

**5. Capacity Reconciliation**
```sql
SELECT
  c.name,
  c.total_reservation_tokens,
  c.available_reservation_tokens,
  (SELECT SUM(spaces_confirmed) FROM reservations r
   WHERE r.competition_id = c.id AND r.status = 'approved') as spaces_used,
  c.total_reservation_tokens -
  (SELECT SUM(spaces_confirmed) FROM reservations r
   WHERE r.competition_id = c.id AND r.status = 'approved') as expected_available
FROM competitions c
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND c.year = 2026
  AND c.name LIKE 'EMPWR%';

-- Verify: available_reservation_tokens = expected_available
```

**6. Sample Data Spot-Check**
```sql
-- Verify specific studio data
SELECT
  s.name as studio_name,
  r.spaces_confirmed,
  r.status,
  r.notes::json->>'deposit_amount' as deposit,
  c.name as competition
FROM reservations r
JOIN studios s ON r.studio_id = s.id
JOIN competitions c ON r.competition_id = c.id
WHERE s.name IN ('STEP ABOVE', 'POWERHOUSE DANCE COMPANY', 'FEVER')
ORDER BY s.name;

-- Expected:
-- STEP ABOVE: 125 entries, approved, $1000 deposit, London
-- POWERHOUSE DANCE COMPANY: 145 entries, approved, $1000 deposit, St. Catharines #1
-- FEVER: 160 entries, approved, $500 deposit, St. Catharines #2
```

---

## Communication Plan

### Email 1: Pre-Launch Announcement (1 Week Before Seed)

**Subject:** Your EMPWR Dance 2026 Portal is Almost Ready!

**To:** All 22 studio directors (BCC)

**Template:**
```
Hi [Studio Name],

Great news! Your EMPWR Dance Competition portal is launching next week.

What You Need to Know:
✅ Your reservation for [X] entries has been secured
✅ Your deposit of [$X] has been applied to your account
✅ You'll receive login instructions on [LAUNCH DATE]

What Happens Next:
1. You'll receive a "Set Your Password" email
2. Login and complete your studio profile
3. Add your dancers and create routines
4. Submit your entry summary by [DEADLINE]

Questions? Reply to this email.

Looking forward to seeing you in 2026!

EMPWR Dance Team
empwrdance@gmail.com
```

---

### Email 2: Password Setup (Launch Day - Auto-Sent by Migration Script)

**Subject:** Set Your Password - EMPWR Dance Portal Access

**To:** Individual studio director

**Template:**
```
Hi [Studio Name],

Welcome to the EMPWR Dance Competition Portal!

Your Account Details:
📧 Email: [email]
🏢 Studio: [Studio Name]
🎉 Competition: [Competition Name]
📝 Reserved Entries: [X]
💰 Deposit Applied: $[X]

Set Your Password:
[SECURE LINK WITH TOKEN - expires in 30 days]

After Setting Your Password:
1. Complete your studio profile
2. Add your dancers
3. Create your competition entries
4. Submit your summary by [DEADLINE]

⚠️ Important: Your summary must be submitted by [DEADLINE] to confirm your entries.

Need Help?
- Portal Support: [support email]
- Competition Questions: empwrdance@gmail.com

Welcome aboard!
EMPWR Dance Team
```

---

### Email 3: Reminder (3 Days Before Deadline)

**Subject:** Reminder: Entry Summary Due in 3 Days

**Template:**
```
Hi [Studio Name],

Just a friendly reminder:

Your entry summary for EMPWR Dance - [Competition] is due in 3 days ([DATE]).

Current Status:
✅ Reservation: [X] entries approved
❌ Summary: Not yet submitted

To Complete:
1. Login at empwr.compsync.net
2. Navigate to Entries
3. Add all your routines
4. Click "Submit Summary"

Questions? Reply to this email.

EMPWR Dance Team
```

---

## Rollback Plan

### If Migration Fails Partway Through

**Scenario:** Migration script fails after seeding 10 of 22 studios.

**Recovery Steps:**

1. **Identify completed studios**
   ```sql
   SELECT s.name, r.status, r.spaces_confirmed
   FROM studios s
   JOIN reservations r ON s.id = r.studio_id
   WHERE s.tenant_id = '00000000-0000-0000-0000-000000000001'
   ORDER BY s.created_at DESC;
   ```

2. **Rollback options:**

   **Option A: Delete partial seed, retry all**
   ```sql
   -- Run cleanup script again (Step 2 from Database Preparation)
   -- Then re-run full migration
   ```

   **Option B: Continue from failure point**
   ```typescript
   // Skip already-seeded studios
   const completedStudios = await getCompletedStudios();
   const remainingStudios = allStudios.filter(
     s => !completedStudios.includes(s.studioName)
   );
   await seedProduction(remainingStudios);
   ```

3. **Verify capacity integrity**
   ```sql
   -- Run verification queries from Step 5 above
   ```

---

### If Issues Discovered After Launch

**Scenario:** Studio reports wrong entry count or missing deposit.

**Fix Process:**

1. **Verify actual agreement**
   - Check CSV source data
   - Confirm with CD

2. **Adjust reservation if needed**
   ```sql
   -- Update entry count
   UPDATE reservations
   SET spaces_confirmed = [CORRECT_COUNT]
   WHERE id = '[reservation_id]';

   -- Adjust capacity ledger
   -- (Manual reconciliation may be needed)
   ```

3. **Update notes/metadata**
   ```sql
   UPDATE reservations
   SET notes = jsonb_set(
     notes::jsonb,
     '{deposit_amount}',
     '"[CORRECT_AMOUNT]"'::jsonb
   )
   WHERE id = '[reservation_id]';
   ```

4. **Notify studio**
   - Apologize for error
   - Confirm correction
   - Provide updated summary

---

## Support & Troubleshooting

### Common Issues

**1. Studio Can't Find Password Setup Email**
- Check spam/junk folders
- Resend via admin panel (if available)
- Manual password reset via Supabase Auth

**2. Studio Reports Wrong Entry Count**
- Verify against CSV
- Adjust reservation.spaces_confirmed
- No capacity impact if staying within approved amount

**3. Capacity Math Doesn't Add Up**
- Run reconciliation query (Verification Step 5)
- Check for orphaned ledger entries
- Manually audit discrepancies

**4. Studio Can't Login After Setting Password**
- Verify email address is correct
- Check user.tenant_id matches EMPWR
- Try password reset flow

**5. Deposit Amount Wrong**
- Update reservation notes (doesn't affect workflow)
- CD can manually adjust on invoice

---

### Emergency Contacts

**Technical Issues:**
- Developer: [Your contact]
- Supabase Support: [If needed]

**Business Issues:**
- EMPWR CD: empwrdance@gmail.com
- Account Managers: Selena, Emily

---

### Monitoring Checklist (Week 1 Post-Launch)

**Daily:**
- [ ] Check studio activation rate (password setup)
- [ ] Monitor error logs for failed logins
- [ ] Check capacity ledger reconciliation
- [ ] Review support emails from studios

**Weekly:**
- [ ] Entry submission rate
- [ ] Summary submission rate
- [ ] Capacity utilization per competition
- [ ] Deposit credit application

---

## Appendix: Quick Reference

### Important UUIDs
```
Tenant: 00000000-0000-0000-0000-000000000001
London: 79cef00c-e163-449c-9f3c-d021fbb4d672
St. Catharines #1: 05c0eae4-cb2f-44cc-9c5e-6b2eed700904
St. Catharines #2: e5a6ee60-e440-4a3e-bc60-43eb40c46b30
```

### Key Files
- CSV Source: `C:\Users\Danie\Downloads\Studio Data 2026 - CompSync - Sheet1.csv`
- Migration Planning: `MIGRATION_PLANNING_SESSION_2025-10-30.md`
- Readiness Report: `MIGRATION_READINESS_2025-10-30.md`
- Competition Mapping: `COMPETITION_ID_MAPPING.json`

### Critical Business Rules (From Phase 1 Spec)
- Reservation status flow: pending → approved → summarized → invoiced → closed
- Capacity deducted on approval (via capacityService.reserve)
- Capacity refunded on summary submission (unused entries)
- Summary submission requires status='approved'
- Invoice creation requires status='summarized'

---

**Status:** ✅ Ready to execute pending email addresses

**Next Action:** Obtain email addresses for all 22 studios, then proceed with database preparation.

---

*Document Version: 1.0 - October 30, 2025*
