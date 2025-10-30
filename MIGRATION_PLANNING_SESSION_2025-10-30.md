# Migration Planning Session - Joining Mid-Workflow
**Date:** October 30, 2025
**Context:** Pre-launch data migration for 22 studios with existing reservations
**Status:** Planning complete, awaiting email addresses and competition IDs

---

## Table of Contents
1. [Data Source Analysis](#data-source-analysis)
2. [Critical Questions](#critical-questions)
3. [Database State Requirements](#database-state-requirements)
4. [Comprehensive Impact Analysis](#comprehensive-impact-analysis)
5. [Migration Script Architecture](#migration-script-architecture)
6. [Next Steps](#next-steps)

---

## Data Source Analysis

### Source File
`C:\Users\Danie\Downloads\Studio Data 2026 - CompSync - Sheet1.csv`

### Summary Statistics
- **Total Studios:** 22
- **Total Entries:** 1,546 entries across all competitions
- **Competitions:**
  1. LONDON APRIL 10-12: 8 studios, 583 entries
  2. ST CATHARINES APRIL 16-18: 8 studios, 483 entries
  3. ST CATHARINES MAY 7-9: 6 studios, 480 entries

### Data Structure
```csv
STUDIOS,SD/SA NAME,ENTRIES #,DEP AMOUNT,DATE REC.,TYPE,ACCOUNT REC,CONTACT,INCENTIVES / DISCOUNTS
EN AVANT,Tracey Coward & Angelina,30,500,,,Selena,Selena,?
STEP ABOVE,Jacqueline,125,1000,,,Selena,Selena,?
ELAN DANCE ARTS,Shawna,40,500,,,Selena,Selena,?
```

### Sample Data Points

**LONDON APRIL 10-12:**
- EN AVANT (Tracey): 30 entries, $500 deposit
- STEP ABOVE (Jacqueline): 125 entries, $1000 deposit
- WHITBY DANCE COMPANY (Samantha & Madison): 90 entries, $1000 deposit, 10% discount
- THE DANCE SHOPPE (Ruth-Ann & Rachelle): 193 entries, $1000 deposit, 5% discount if balance rec. by Nov 1

**ST CATHARINES APRIL 16-18:**
- POISE (Linda): 70 entries, no deposit recorded
- DANCEOLOGY (Denise): 80 entries, $1000 deposit, "15% off entries, GLOW $ doubled"
- POWERHOUSE (Kristen): 145 entries, $1000 deposit, 10% off entry fees

**ST CATHARINES MAY 7-9:**
- DANCEFX (Ang): 110 entries, $500 deposit
- FEVER (Cristina & Cassandra): 160 entries, $500 deposit
- STUDIO 22 (Stephanie & Lisa): 95 entries, $1000 deposit

---

## Critical Questions

### 1. 🔴 MISSING: Email Addresses

**Problem:** No email addresses in CSV - REQUIRED for:
- User account creation
- Sending invitation emails
- Studio claiming workflow

**Need from you:**
- Email addresses for all 22 studios
- Format: Studio Name → Email mapping

**Example needed:**
```
EN AVANT → tracey@enavant.com
STEP ABOVE → jacqueline@stepabove.com
```

---

### 2. 🔴 Competition ID Mapping

**Need database IDs for:**
```sql
SELECT id, name, year FROM competitions
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND year = 2026;
```

**Mapping needed:**
- "LONDON APRIL 10-12" → `competition_id` = ?
- "ST CATHARINES APRIL 16-18" → `competition_id` = ?
- "ST CATHARINES MAY 7-9" → `competition_id` = ?

---

### 3. 🟡 Deposit Handling

**Current data:**
- Some studios: $500 or $1000
- Some studios: blank or "n/a"

**Questions:**
- If deposit is blank/n/a, treat as $0?
- Apply deposits as invoice credits when summary submitted?
- Store deposit metadata separately for audit trail?

**Phase 1 spec context (lines 656-777):**
- Invoices generated AFTER summary submission
- Credits array: `[{"amount": 500, "label": "Deposit 2025"}]`

**Recommendation:** Store deposits as credits to be applied during invoice generation.

---

### 4. 🟡 Discount Parsing

**Current discount formats:**
- `"10% discount"`
- `"5% discount if balance rec. by Nov 1"` (conditional)
- `"10% off entry fees"`
- `"15% off entires, GLOW $ doubled"` (multiple incentives)
- `"n/a"` or `"?"`

**Phase 1 spec constraint (line 301):** Discount must be [0, 5, 10, 15]

**Recommendation:**
- Store raw discount string in reservation notes
- CD applies actual discount % manually when creating invoice
- Preserves conditional discounts and special incentives

---

### 5. 🟢 Data Quality Issues

**Issues found:**
1. Inconsistent discount format
2. Typo in column header (Row 29: "DEC REC." should be "DATE REC.")
3. Conditional discounts can't be auto-applied
4. Multiple incentives in single field ("10% off + GLOW $ doubled")
5. Unknown values (`?`) in 7 studios

**Question:** What is "GLOW $"? Loyalty program?

---

## Database State Requirements

### Critical Finding: owner_id is NOT NULL

**Schema constraint:**
```prisma
model studios {
  owner_id String @db.Uuid // NOT NULL - REQUIRED
  users_studios_owner_idTousers users @relation(fields: [owner_id], references: [id], onDelete: Cascade)
}
```

**Implication:** CANNOT create studios without creating user accounts first.

### Required Migration State

```typescript
// Must create in this order:
1. User account (with temporary password)
   ↓
2. Studio record (linked to user.id)
   ↓
3. Reservation (status='pending' initially)
   ↓
4. Call capacityService.reserve()
   ↓ Updates status: 'pending' → 'approved'
   ↓ Creates ledger entry
   ↓ Deducts capacity
```

### Database Records Created

```typescript
{
  user: {
    id: UUID,
    email: "studio@email.com",
    password: HASHED_TEMP_PASSWORD,
    role: 'studio_director',
    tenant_id: EMPWR_TENANT_ID,
    pending_activation: true, // Custom flag
  },
  studio: {
    id: UUID,
    owner_id: user.id, // REQUIRED (NOT NULL)
    name: "EN AVANT",
    email: "studio@email.com",
    code: "ABC12", // Generated
    tenant_id: EMPWR_TENANT_ID,
    contact_name: "Tracey Coward & Angelina",
  },
  reservation: {
    id: UUID,
    studio_id: studio.id,
    competition_id: LONDON_APRIL_UUID,
    status: 'approved', // After capacityService.reserve()
    spaces_requested: 30,
    spaces_confirmed: 30,
    approved_at: NOW(),
    approved_by: MIGRATION_USER_ID,
    tenant_id: EMPWR_TENANT_ID,
  },
  capacity_ledger: {
    id: UUID,
    competition_id: LONDON_APRIL_UUID,
    reservation_id: reservation.id,
    change_amount: -30, // Negative = deduction
    reason: 'reservation_approval',
    created_at: NOW(),
    created_by: MIGRATION_USER_ID,
    tenant_id: EMPWR_TENANT_ID,
  },
  reservation_deposit: { // Optional metadata table
    reservation_id: reservation.id,
    amount: 500.00,
    received_date: "2025-05-31",
    payment_type: "ET", // E-transfer
    notes: "10% discount if balance rec. by Nov 1",
  }
}
```

### Records NOT Created (Skipped)

```typescript
// These were skipped - no record of:
- ❌ Original reservation submission (no 'pending' state record)
- ❌ CD review/approval decision emails
- ❌ Email notifications:
  - "Reservation submitted" (to CD)
  - "Reservation approved" (to SD)
- ❌ Activity logs:
  - reservation.submit
  - reservation.approve (except migration log)
```

---

## Comprehensive Impact Analysis

### 1. Status Guard Analysis

#### Guard: `approve` Mutation (reservation.ts:669)
```typescript
guardReservationStatus(status, ['pending'], 'approve reservation');
```
**Impact:** ✅ **NO ISSUE**
- Migrated reservations start with status='approved'
- Guard only blocks if someone tries to approve an already-approved reservation
- Studios never call this mutation (CD-only)
- No reason to approve an already-approved reservation

#### Guard: Entry Creation (entry.ts:907)
```typescript
if (reservation.status !== 'approved') {
  throw new Error('Reservation must be approved before creating routines.');
}
```
**Impact:** ✅ **NO ISSUE**
- Migrated reservations will have status='approved'
- This is exactly what the guard expects
- Studios can create entries immediately

#### Guard: Invoice Creation (invoice.ts:615)
```typescript
if (reservation.status !== 'summarized') {
  throw new Error('reservation must be in summarized state');
}
```
**Impact:** ✅ **NO ISSUE**
- After studio submits summary, status becomes 'summarized'
- CD can then create invoice
- Normal workflow preserved

---

### 2. Capacity System Impact

#### Migration Order (CRITICAL)

**✅ CORRECT ORDER:**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Create user
  const user = await tx.users.create({...});

  // 2. Create studio (linked to user)
  const studio = await tx.studios.create({
    owner_id: user.id, // REQUIRED
    ...
  });

  // 3. Create reservation with status='pending'
  const reservation = await tx.reservations.create({
    data: {
      status: 'pending', // ← Start here
      ...
    }
  });

  // 4. Call capacityService.reserve()
  // This will:
  //   - Check status='pending' ✅
  //   - Create ledger entry ✅
  //   - Deduct capacity ✅
  //   - Update status to 'approved' ✅
  await capacityService.reserve(
    competitionId,
    entriesApproved,
    reservation.id,
    MIGRATION_USER_ID
  );
});
```

**Why this order matters:**
- capacityService.reserve() expects status='pending' (capacity.ts:68)
- It updates status to 'approved' (capacity.ts:140-148)
- Creates proper ledger entry with audit trail
- Follows exact same code path as normal approval
- Ensures capacity reconciliation shows 0 discrepancy

#### Capacity Ledger Health

**After migration, each competition will have:**
```sql
-- Example: LONDON competition
SELECT
  c.total_reservation_tokens,
  c.available_reservation_tokens,
  COALESCE(SUM(cl.change_amount), 0) as ledger_net
FROM competitions c
LEFT JOIN capacity_ledger cl ON cl.competition_id = c.id
WHERE c.id = 'LONDON_UUID'
GROUP BY c.id;

-- Expected:
-- total: 600
-- available: 600 - 583 = 17 (after migrating 8 studios)
-- ledger_net: -583 (matches available calculation)
-- discrepancy: 0 ✅
```

---

### 3. Complete Workflow After Migration

```
MIGRATED STATE:
  ✅ User exists (pending_activation: true)
  ✅ Studio exists (linked to user)
  ✅ Reservation exists (status='approved')
  ✅ Capacity deducted (-30 from London)
  ✅ Ledger entry created

↓ Studio receives "Set Your Password" email

STEP 1: User sets password, logs in
  ↓ Sees existing reservation (30 entries approved)
  ↓ Status: pending_activation → false

STEP 2: Studio adds dancers
  ↓ Manual entry or CSV import
  ↓ 0 → N dancers

STEP 3: Studio creates entries (up to 30)
  ↓ Entry 1: "My Dance" with 3 dancers
  ↓ Entry 2: "Another Routine" with 1 dancer
  ↓ ... (up to 30 entries total)
  ↓ Checks: status='approved' ✅, quota not exceeded ✅

STEP 4: Studio submits summary
  ↓ Used: 25 entries
  ↓ Unused: 5 entries
  ↓ Reservation status: 'approved' → 'summarized'
  ↓ Capacity refunded: +5 to London competition
  ↓ Ledger entry: +5 (reason='summary_refund')
  ↓ Phase 1 spec lines 589-651

STEP 5: CD creates invoice
  ↓ Checks status='summarized' ✅
  ↓ Calculates: 25 entries × $50 = $1,250
  ↓ Applies deposit credit: -$500
  ↓ Applies discount (manual): 10% = -$75
  ↓ Tax (13%): $67.50
  ↓ Total: $742.50
  ↓ Reservation status: 'summarized' → 'invoiced'
  ↓ Phase 1 spec lines 656-777

STEP 6: Studio pays, CD marks paid
  ↓ Reservation status: 'invoiced' → 'closed'
  ↓ Phase 2 access unlocked
```

---

### 4. Mutations That Will Work

#### ✅ Entry Creation
```typescript
createEntry({
  reservation_id: migratedReservation.id,
  routine_name: "My Dance",
  choreographer_name: "Tracey",
  category_id: "...",
  level_id: "...",
  style_id: "...",
  // ... other fields
})
```
**Requirements checked:**
- Reservation status = 'approved' ✅
- Entries quota not exceeded ✅
- Studio exists with dancers ✅

#### ✅ Summary Submission
```typescript
submitSummary({ reservationId })
```
**Checks (entry.ts:164-170):**
- Reservation exists ✅
- Studio matches ✅
- Status = 'approved' ✅
- At least 1 entry exists ✅

#### ✅ Invoice Creation
```typescript
createInvoice({ reservationId, discount_percent: 10, credits: [...] })
```
**Checks (invoice.ts:615):**
- Status = 'summarized' ✅ (after summary submission)
- Entries exist ✅
- No duplicate invoice ✅

#### ✅ Second Reservation (Same Studio, Same Competition)
**Phase 1 spec (line 200):** Multiple reservations allowed
```typescript
// Studio creates ANOTHER reservation for same competition
createReservation({
  studio_id: existingStudio.id,
  competition_id: LONDON_UUID,
  spaces_requested: 50
})
```
**Result:** ✅ **WORKS** - Creates separate reservation, tracked independently

---

### 5. Mutations That Could Cause Issues

#### ⚠️ `approve` Mutation
**Call:** `reservation.approve({ reservationId })`
**Guard:** Requires status='pending'
**Current:** status='approved'
**Result:** ❌ **WILL FAIL** with StatusGuardError

**Who calls this?**
- Only CDs (Competition Directors)
- Studios never have access to this mutation

**Impact:** ✅ **NOT AN ISSUE**
- Nobody should try to approve an already-approved reservation
- If CD accidentally tries, they'll get clear error message

#### ⚠️ `reject` Mutation
**Similar issue:** Requires status='pending', but we have 'approved'

**Impact:** ✅ **NOT AN ISSUE**
- No reason to reject an approved reservation
- If needed, CD can cancel reservation (different mutation)

---

### 6. Email Notification Gaps

#### Missing Notifications

Studios will **NOT** receive:
1. ❌ "Reservation submitted" confirmation (to CD)
2. ❌ "Reservation approved" notification (to Studio)

Studios **WILL** receive:
3. ✅ "Set Your Password" (migration-specific, includes context)
4. ✅ "Summary submitted" confirmation (normal workflow)
5. ✅ "Invoice created" notification (normal workflow)
6. ✅ "Payment confirmed" (normal workflow)

#### Mitigation Strategy

**Enhanced "Set Your Password" email:**
```
Subject: Your CompPortal Account is Ready - [Studio Name]

Dear [Studio Directors],

Welcome to CompPortal! Your studio account has been created and your existing
reservation has been migrated.

YOUR EXISTING RESERVATION:
- Competition: LONDON APRIL 10-12
- Entries Approved: 30
- Deposit Applied: $500
- Special Terms: 10% discount if balance received by Nov 1

NEXT STEPS:
1. Set your password: [Secure Link]
2. Add your dancers (manual or CSV import)
3. Create your 30 entries
4. Submit your summary by [Deadline]

GETTING STARTED:
After setting your password, you'll see your existing reservation in your
dashboard. You can start creating entries right away!

Questions? Reply to this email or call [Phone]

[Competition Director Name]
EMPWR Dance Experience
```

---

### 7. Activity Log Gaps

#### Missing Audit Trail

```sql
-- These events will NOT exist in activity_logs:
- reservation.submit (no record of original submission)
- reservation.approve (no record of CD decision)

-- These WILL exist:
- reservation.migrated (custom event for data migration)
- user.password_set (when they claim account)
- entry.create (normal workflow from here)
- summary.submit (normal workflow)
- invoice.create (normal workflow)
- invoice.paid (normal workflow)
```

#### Mitigation: Custom Migration Log

```typescript
await tx.activity_logs.create({
  data: {
    user_id: MIGRATION_USER_ID,
    studio_id: studio.id,
    action: 'reservation.migrated',
    entity_type: 'reservation',
    entity_id: reservation.id,
    details: {
      source: 'pre_launch_migration',
      original_deposit: 500,
      deposit_date: "2025-05-31",
      payment_type: "ET",
      entries_approved: 30,
      competition_name: 'LONDON APRIL 10-12',
      studio_directors: "Tracey Coward & Angelina",
      discount_notes: "10% discount if balance rec. by Nov 1",
      account_manager: "Selena",
      migrated_at: new Date().toISOString(),
    },
    tenant_id: EMPWR_TENANT_ID,
  }
});
```

**Benefits:**
- Complete audit trail for compliance
- Can answer "When was this reservation created?"
- Preserves original deposit terms
- Records account manager for support

---

## Migration Script Architecture

### Required Database Tables/Fields

#### Option A: Use Existing Fields
```typescript
// Store deposit info in reservation notes
reservation.internal_notes = JSON.stringify({
  deposit_amount: 500,
  deposit_date: "2025-05-31",
  payment_type: "ET",
  discount_terms: "10% discount if balance rec. by Nov 1",
  account_manager: "Selena",
});
```

#### Option B: Create New Table (Recommended)
```sql
CREATE TABLE reservation_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  received_date DATE,
  payment_type VARCHAR(50), -- 'ET', 'PD Cheque', 'Cash', etc.
  reference_number VARCHAR(100),
  account_manager VARCHAR(100),
  discount_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reservation_deposits_reservation ON reservation_deposits(reservation_id);
```

#### User Account Activation
```sql
-- Add field to users table (if not exists)
ALTER TABLE users ADD COLUMN pending_activation BOOLEAN DEFAULT FALSE;

-- Or create separate table
CREATE TABLE password_setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_setup_tokens_token ON password_setup_tokens(token);
CREATE INDEX idx_password_setup_tokens_user ON password_setup_tokens(user_id);
```

---

### Complete Migration Script

```typescript
// migrate-studios.ts

import { prisma } from '@/lib/prisma';
import { capacityService } from '@/server/services/capacity';
import { hashPassword, generateSecureToken, generateStudioCode } from '@/lib/utils';
import { sendPasswordSetupEmail } from '@/lib/email';
import { logActivity } from '@/lib/activity';

const EMPWR_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const MIGRATION_USER_ID = '[Super Admin User ID]';

interface StudioMigrationData {
  studio_name: string;
  studio_directors: string;
  entries_approved: number;
  deposit_amount: number | null;
  deposit_date: string | null;
  payment_type: string | null;
  discount_notes: string;
  account_manager: string;
  competition_id: string; // UUID
  competition_name: string; // For display

  // Required from separate source
  email: string;
  phone?: string;
}

async function migrateStudio(data: StudioMigrationData) {
  console.log(`🔄 Migrating studio: ${data.studio_name}`);

  return await prisma.$transaction(async (tx) => {
    // 1. Create user account with temporary password
    const tempPassword = generateSecureToken(); // Random secure password
    const user = await tx.users.create({
      data: {
        email: data.email,
        password: await hashPassword(tempPassword),
        role: 'studio_director',
        tenant_id: EMPWR_TENANT_ID,
        pending_activation: true, // Flag for "hasn't set password yet"
        created_at: new Date(),
      }
    });

    console.log(`  ✅ User created: ${user.email}`);

    // 2. Create studio record (linked to user)
    const studio = await tx.studios.create({
      data: {
        owner_id: user.id, // REQUIRED (NOT NULL)
        tenant_id: EMPWR_TENANT_ID,
        name: data.studio_name,
        email: data.email,
        code: generateStudioCode(), // Random 5-char code
        public_code: generateStudioCode(), // Display code
        contact_name: data.studio_directors,
        contact_email: data.email,
        phone: data.phone,
        status: 'active',
        verified_at: new Date(),
        verified_by: MIGRATION_USER_ID,
        created_at: new Date(),
      }
    });

    console.log(`  ✅ Studio created: ${studio.name} (${studio.code})`);

    // 3. Create reservation (status='pending' initially)
    const reservation = await tx.reservations.create({
      data: {
        tenant_id: EMPWR_TENANT_ID,
        studio_id: studio.id,
        competition_id: data.competition_id,
        status: 'pending', // ← Start here, capacityService will update to 'approved'
        spaces_requested: data.entries_approved,
        spaces_confirmed: data.entries_approved,
        submitted_at: new Date(),
        requested_at: new Date(),
        created_at: new Date(),
      }
    });

    console.log(`  ✅ Reservation created: ${reservation.id}`);

    // 4. Store deposit metadata (if applicable)
    if (data.deposit_amount && data.deposit_amount > 0) {
      await tx.reservation_deposits.create({
        data: {
          reservation_id: reservation.id,
          amount: data.deposit_amount,
          received_date: data.deposit_date ? new Date(data.deposit_date) : null,
          payment_type: data.payment_type,
          account_manager: data.account_manager,
          discount_notes: data.discount_notes,
          created_at: new Date(),
        }
      });

      console.log(`  ✅ Deposit recorded: $${data.deposit_amount}`);
    }

    // 5. Approve via capacityService
    // This will:
    //   - Check status='pending' ✅
    //   - Create ledger entry ✅
    //   - Deduct capacity ✅
    //   - Update status: 'pending' → 'approved' ✅
    await capacityService.reserve(
      data.competition_id,
      data.entries_approved,
      reservation.id,
      MIGRATION_USER_ID
    );

    console.log(`  ✅ Capacity reserved: ${data.entries_approved} entries`);

    // 6. Create migration activity log
    await tx.activity_logs.create({
      data: {
        user_id: MIGRATION_USER_ID,
        studio_id: studio.id,
        action: 'reservation.migrated',
        entity_type: 'reservation',
        entity_id: reservation.id,
        details: {
          source: 'pre_launch_migration',
          competition_name: data.competition_name,
          studio_directors: data.studio_directors,
          deposit_amount: data.deposit_amount,
          deposit_date: data.deposit_date,
          payment_type: data.payment_type,
          discount_notes: data.discount_notes,
          account_manager: data.account_manager,
          migrated_at: new Date().toISOString(),
        },
        tenant_id: EMPWR_TENANT_ID,
        created_at: new Date(),
      }
    });

    console.log(`  ✅ Activity log created`);

    // 7. Create password setup token
    const token = generateSecureToken();
    await tx.password_setup_tokens.create({
      data: {
        user_id: user.id,
        token: token,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        created_at: new Date(),
      }
    });

    console.log(`  ✅ Password setup token created`);

    return { user, studio, reservation, token };
  });
}

async function validateMigrationData(data: StudioMigrationData[]) {
  console.log('🔍 Validating migration data...\n');
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const studio of data) {
    // Check competition exists
    const comp = await prisma.competitions.findUnique({
      where: { id: studio.competition_id },
      select: {
        id: true,
        name: true,
        available_reservation_tokens: true,
        total_reservation_tokens: true,
      }
    });

    if (!comp) {
      errors.push(`${studio.studio_name}: Competition not found (${studio.competition_id})`);
      continue;
    }

    // Check capacity available
    const available = comp.available_reservation_tokens;
    if (available < studio.entries_approved) {
      errors.push(
        `${studio.studio_name}: Not enough capacity ` +
        `(needs ${studio.entries_approved}, only ${available} available in ${comp.name})`
      );
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studio.email)) {
      errors.push(`${studio.studio_name}: Invalid email format (${studio.email})`);
    }

    // Check for duplicate emails
    const existingUser = await prisma.users.findFirst({
      where: { email: studio.email }
    });
    if (existingUser) {
      errors.push(`${studio.studio_name}: Email already exists (${studio.email})`);
    }

    // Check for duplicate studio names
    const existingStudio = await prisma.studios.findFirst({
      where: {
        name: studio.studio_name,
        tenant_id: EMPWR_TENANT_ID,
      }
    });
    if (existingStudio) {
      errors.push(`${studio.studio_name}: Studio name already exists`);
    }

    // Warnings for missing data
    if (!studio.deposit_amount) {
      warnings.push(`${studio.studio_name}: No deposit amount (will be $0)`);
    }
    if (!studio.discount_notes || studio.discount_notes === '?' || studio.discount_notes === 'n/a') {
      warnings.push(`${studio.studio_name}: No discount terms specified`);
    }
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
    console.log();
  }

  return errors;
}

async function runMigration(dryRun: boolean = true) {
  // Load migration data
  const studios = await loadMigrationData(); // From CSV + email mapping

  console.log(`📊 Migration Summary:`);
  console.log(`  - Total studios: ${studios.length}`);
  console.log(`  - Total entries: ${studios.reduce((sum, s) => sum + s.entries_approved, 0)}`);
  console.log();

  // Pre-flight validation
  const errors = await validateMigrationData(studios);

  if (errors.length > 0) {
    console.error('❌ Validation errors:\n');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error(`\n❌ Migration aborted due to ${errors.length} errors\n`);
    return { success: false, errors };
  }

  console.log('✅ Validation passed!\n');

  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
    console.log('Planned operations:\n');

    studios.forEach(s => {
      console.log(`📍 ${s.studio_name}`);
      console.log(`  Competition: ${s.competition_name}`);
      console.log(`  Email: ${s.email}`);
      console.log(`  Directors: ${s.studio_directors}`);
      console.log(`  Entries: ${s.entries_approved}`);
      console.log(`  Deposit: $${s.deposit_amount || 0}`);
      if (s.discount_notes && s.discount_notes !== '?' && s.discount_notes !== 'n/a') {
        console.log(`  Terms: ${s.discount_notes}`);
      }
      console.log();
    });

    console.log('✅ Dry run complete. Run with --live to execute migration.\n');
    return { success: true, dryRun: true };
  }

  // Actual migration
  console.log('🚀 Starting migration...\n');
  const results = [];

  for (const studioData of studios) {
    try {
      const result = await migrateStudio(studioData);
      results.push({ success: true, studio: studioData.studio_name, result });

      // Send password setup email
      await sendPasswordSetupEmail({
        to: result.user.email,
        studioName: result.studio.name,
        studioDirectors: studioData.studio_directors,
        token: result.token,
        competitionName: studioData.competition_name,
        entriesApproved: studioData.entries_approved,
        depositAmount: studioData.deposit_amount,
        discountTerms: studioData.discount_notes,
      });

      console.log(`  ✅ Email sent to ${result.user.email}\n`);

    } catch (error) {
      results.push({
        success: false,
        studio: studioData.studio_name,
        error: error.message
      });
      console.error(`  ❌ ${studioData.studio_name}: ${error.message}\n`);
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Migration Complete:`);
  console.log(`  ✅ Successful: ${successful}/${studios.length}`);
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed}`);
    console.log('\nFailed studios:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.studio}: ${r.error}`);
    });
  }
  console.log('='.repeat(60) + '\n');

  return { success: true, results };
}

// Helper function to load and parse CSV data
async function loadMigrationData(): Promise<StudioMigrationData[]> {
  // TODO: Implement CSV parsing + email mapping
  // This would read the CSV file and merge with email addresses

  // Example structure:
  return [
    {
      studio_name: "EN AVANT",
      studio_directors: "Tracey Coward & Angelina",
      entries_approved: 30,
      deposit_amount: 500,
      deposit_date: null,
      payment_type: null,
      discount_notes: "?",
      account_manager: "Selena",
      competition_id: "LONDON_UUID", // From mapping
      competition_name: "LONDON APRIL 10-12",
      email: "tracey@enavant.com", // From separate source
      phone: null,
    },
    // ... 21 more studios
  ];
}

// Rollback function (if needed)
async function rollbackStudio(studioEmail: string) {
  console.log(`🔄 Rolling back studio: ${studioEmail}`);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.users.findFirst({
      where: { email: studioEmail },
      include: {
        studios_studios_owner_idTousers: {
          include: {
            reservations: true
          }
        }
      }
    });

    if (!user) throw new Error('User not found');

    const studio = user.studios_studios_owner_idTousers[0];
    if (!studio) throw new Error('Studio not found');

    // 1. Refund capacity for all reservations
    for (const reservation of studio.reservations) {
      await capacityService.refund(
        reservation.competition_id,
        reservation.spaces_confirmed,
        reservation.id,
        'migration_rollback',
        MIGRATION_USER_ID
      );
      console.log(`  ✅ Capacity refunded: ${reservation.spaces_confirmed}`);
    }

    // 2. Delete ledger entries
    await tx.capacity_ledger.deleteMany({
      where: {
        reservation_id: { in: studio.reservations.map(r => r.id) }
      }
    });
    console.log(`  ✅ Ledger entries deleted`);

    // 3. Delete reservation deposits
    await tx.reservation_deposits.deleteMany({
      where: {
        reservation_id: { in: studio.reservations.map(r => r.id) }
      }
    });

    // 4. Delete reservations
    await tx.reservations.deleteMany({
      where: { studio_id: studio.id }
    });
    console.log(`  ✅ Reservations deleted`);

    // 5. Delete dancers (if any)
    await tx.dancers.deleteMany({
      where: { studio_id: studio.id }
    });

    // 6. Delete password tokens
    await tx.password_setup_tokens.deleteMany({
      where: { user_id: user.id }
    });

    // 7. Delete activity logs
    await tx.activity_logs.deleteMany({
      where: { studio_id: studio.id }
    });

    // 8. Delete studio
    await tx.studios.delete({
      where: { id: studio.id }
    });
    console.log(`  ✅ Studio deleted`);

    // 9. Delete user
    await tx.users.delete({
      where: { id: user.id }
    });
    console.log(`  ✅ User deleted`);

    console.log(`✅ Rollback complete for: ${studio.name}\n`);
  });
}

// CLI interface
const args = process.argv.slice(2);
const isDryRun = !args.includes('--live');
const isRollback = args.includes('--rollback');

if (isRollback) {
  const email = args[args.indexOf('--rollback') + 1];
  if (!email) {
    console.error('Usage: npm run migrate:studios -- --rollback <email>');
    process.exit(1);
  }
  rollbackStudio(email)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(`❌ Rollback failed: ${err.message}`);
      process.exit(1);
    });
} else {
  runMigration(isDryRun)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(`❌ Migration failed: ${err.message}`);
      process.exit(1);
    });
}

// Usage:
// npm run migrate:studios -- --dry-run  (default)
// npm run migrate:studios -- --live
// npm run migrate:studios -- --rollback email@example.com
```

---

## Communication Strategy

### Email 1: Pre-Launch Announcement (1 week before)

**Subject:** Important: CompPortal Launch - Action Required

**To:** All studios (BCC)

**Body:**
```
Dear Studio Directors,

We're excited to announce the launch of CompPortal on [Launch Date]!

YOUR EXISTING RESERVATION:
Your reservation for [Competition Name] has been migrated to the new system:
- Entries Reserved: [X]
- Deposit Applied: $[Y]
- Special Terms: [Discount notes if applicable]

WHAT HAPPENS NEXT:
1. On [Launch Date], you'll receive an email to set your password
2. After logging in, you'll see your existing reservation
3. Add your dancers (manual entry or CSV import)
4. Create your entries (up to [X])
5. Submit your summary by [Deadline Date]

GETTING HELP:
- User Guide: [Link to documentation]
- Video Tutorial: [Link to video]
- Support Email: support@empwrdance.com
- Phone: [Phone Number]

We're here to help make this transition smooth!

[Competition Director Name]
EMPWR Dance Experience
```

---

### Email 2: Password Setup Invitation (Launch Day)

**Subject:** Set Your CompPortal Password - [Studio Name]

**To:** Individual studio email

**Body:**
```
Dear [Studio Directors],

Welcome to CompPortal! Your studio account is ready.

YOUR EXISTING RESERVATION:
- Competition: [Competition Name]
- Entries Approved: [X]
- Deposit Applied: $[Y]
[If discount terms exist:]
- Special Terms: [Discount notes]

SET YOUR PASSWORD:
[Secure Button/Link with Token]

This link expires in 30 days.

AFTER SETTING YOUR PASSWORD:
1. You'll see your existing reservation in your dashboard
2. Add your dancers (manual or CSV import available)
3. Start creating your [X] entries
4. Submit your summary by [Deadline]

NEED HELP?
- Quick Start Guide: [Link]
- Video Tutorial: [Link]
- Email: support@empwrdance.com
- Phone: [Phone]

We're excited to have you on CompPortal!

[Competition Director Name]
EMPWR Dance Experience
```

---

### Email 3: Reminder (3 days after launch, if not activated)

**Subject:** Reminder: Set Your CompPortal Password

**To:** Studios that haven't claimed accounts

**Body:**
```
Hi [Studio Directors],

Just a friendly reminder to activate your CompPortal account!

Your reservation for [Competition Name] ([X] entries) is waiting for you.

SET YOUR PASSWORD:
[Secure Button/Link]

DEADLINE: Submit your summary by [Date]

Need help getting started? Reply to this email or call [Phone].

[Competition Director Name]
```

---

### Email 4: Final Reminder (7 days before summary deadline)

**Subject:** Action Required: Complete Your Entries by [Deadline]

**To:** Studios that haven't submitted summary

**Body:**
```
Hi [Studio Name],

This is an important reminder about your upcoming deadline.

SUMMARY DUE: [Deadline Date] ([X] days remaining)

CURRENT STATUS:
✅ Account Activated
[✅/⏳] Dancers Added: [X]
[✅/⏳] Entries Created: [Y] of [Z]
⏳ Summary Submitted: Not yet

COMPLETE YOUR ENTRIES:
[Button/Link to Dashboard]

After you submit your summary, we'll generate your invoice with:
- Entry fees
- Deposit credit: $[Y]
- [Discount terms if applicable]

Questions? We're here to help!
Reply to this email or call [Phone]

[Competition Director Name]
```

---

## Next Steps

### Required Before Migration

1. **✅ Email Addresses**
   - Collect email addresses for all 22 studios
   - Format: Studio Name → Email mapping
   - Validate email format

2. **✅ Competition IDs**
   - Query database for competition IDs
   - Create mapping: Name → UUID
   - Verify competitions exist and have capacity

3. **✅ Schema Updates**
   - Create `reservation_deposits` table
   - Create `password_setup_tokens` table
   - Add `pending_activation` to users table (if needed)

4. **✅ Helper Functions**
   - `generateSecureToken()` - Cryptographically secure token
   - `generateStudioCode()` - Random 5-character code
   - `sendPasswordSetupEmail()` - Email template

### Migration Execution Plan

**Phase 1: Preparation (1 day)**
- [ ] Collect all email addresses
- [ ] Create competition ID mapping
- [ ] Run schema migrations (create tables)
- [ ] Test migration script on staging
- [ ] Prepare email templates

**Phase 2: Dry Run (1 day)**
- [ ] Run migration with `--dry-run` flag
- [ ] Review planned operations
- [ ] Verify capacity calculations
- [ ] Check for validation errors
- [ ] Get user approval

**Phase 3: Test Migration (1 day)**
- [ ] Migrate 2-3 test studios on staging
- [ ] Test password setup flow
- [ ] Test entry creation flow
- [ ] Verify capacity ledger
- [ ] Check email delivery

**Phase 4: Production Migration (1 day)**
- [ ] Schedule off-peak time (early morning)
- [ ] Backup database before migration
- [ ] Run production migration with `--live`
- [ ] Monitor for errors
- [ ] Send password setup emails in batches (5-10 at a time)
- [ ] Verify first few studios can login

**Phase 5: Monitoring (1 week)**
- [ ] Track activation rate daily
- [ ] Follow up with unclaimed studios (after 3 days)
- [ ] Provide support for onboarding issues
- [ ] Monitor entry creation activity
- [ ] Send reminders as deadline approaches

### Rollback Plan

**If critical issue discovered:**
1. Stop sending new invitation emails
2. Identify affected studios
3. Run rollback script for each: `npm run migrate:studios -- --rollback email@studio.com`
4. Refunds capacity automatically
5. Cleans up all migration data
6. Studios can be re-migrated after fix

**Rollback safe up until:**
- Studios start creating entries (data loss risk)
- Prefer to fix issues in place if entries exist

---

## Risk Assessment

### 🔴 High Risk Issues

**1. Email Addresses Missing**
- Cannot proceed without emails
- **Mitigation:** Collect before starting

**2. Capacity Insufficient**
- Total entries (1,546) may exceed available capacity
- **Mitigation:** Verify capacity before migration, increase if needed

**3. Duplicate Emails**
- Studio email already exists in system
- **Mitigation:** Validation check catches this, resolve before migration

### 🟡 Medium Risk Issues

**4. Studios Don't Activate Accounts**
- Some studios may not check email
- **Mitigation:** Follow-up reminders, phone calls if needed

**5. Entry Creation Issues**
- Studios may struggle with new UI
- **Mitigation:** Video tutorials, support availability, user guide

**6. Discount Terms Ambiguous**
- Conditional discounts require manual application
- **Mitigation:** Document terms in reservation notes, CD applies during invoice

### 🟢 Low Risk Issues

**7. Missing Phone Numbers**
- Optional field, not critical
- **Mitigation:** Studios can add during onboarding

**8. Unknown Discount Values (?)**
- 7 studios have "?" for discount
- **Mitigation:** Treat as blank, CD can update later

---

## Success Metrics

### Week 1 Targets
- **Activation Rate:** 80% of studios set password
- **Dancer Addition:** 50% of studios add dancers
- **Entry Creation:** 25% of studios start creating entries
- **Support Tickets:** <5 critical issues

### Week 2 Targets
- **Activation Rate:** 95% of studios set password
- **Entry Creation:** 60% of studios creating entries
- **Summary Submissions:** 30% of studios submitted summaries

### Summary Deadline
- **Target:** 90% of studios submitted summaries
- **Acceptable:** 80% (10% grace period)
- **Critical:** <70% requires intervention

---

## Questions for User

### Critical (Must Answer Before Migration)

1. **Email Addresses:**
   - Do you have email addresses for all 22 studios?
   - Can you provide a mapping file (CSV or JSON)?

2. **Competition IDs:**
   - Can you run this query and provide results?
   ```sql
   SELECT id, name, year, available_reservation_tokens
   FROM competitions
   WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
     AND year = 2026;
   ```

3. **Timeline:**
   - When do you want to run the migration? (Date/time)
   - What is the summary submission deadline?
   - How much time between launch and event date?

### Important (Should Answer Soon)

4. **Capacity:**
   - Total entries migrating: 1,546
   - Do competitions have enough capacity?
   - Should we increase capacity before migration?

5. **Support:**
   - Who will handle support questions from studios?
   - What are support hours/contact info?
   - Do you need a user guide/video tutorial created?

6. **Testing:**
   - Can we test on staging first with 2-3 studios?
   - Do you want to review dry-run output before production?

### Nice to Have

7. **Email Templates:**
   - Do you want to review/customize email templates?
   - Any branding requirements (logo, colors)?

8. **Special Cases:**
   - Any studios that need special handling?
   - Any that should be excluded from migration?

9. **What is "GLOW $"?**
   - Loyalty program?
   - Should this be tracked in system?

---

## Appendices

### A. Phase 1 Spec References

**Relevant sections:**
- Lines 30-47: Events table structure
- Lines 169-198: Reservations table + state transitions
- Lines 398-438: Reservation submission flow
- Lines 442-499: Reservation approval process
- Lines 589-651: Summary submission with capacity refund
- Lines 656-777: Invoice generation with credits

**State Transitions (Line 190-198):**
```
pending → approved (CD approves)
approved → summarized (SD submits summary)
summarized → invoiced (CD creates invoice)
invoiced → closed (CD marks paid)
```

**Capacity Formula (Lines 50-68):**
```python
remaining_capacity = initial_capacity
                   - SUM(approved_entries)
                   + SUM(refunded_entries_from_summaries)
```

### B. Capacity System Deep Dive

**Reference:** `CAPACITY_SYSTEM_DEEP_DIVE_2025-10-30.md`

**Key Findings:**
- CapacityService implemented and working (lines 1-334)
- Uses PostgreSQL advisory locks for race condition prevention
- Idempotency via multiple guards (status + ledger check)
- Current system healthy: 4/5 competitions at 0 discrepancy

**Migration Implications:**
- Must create reservation with status='pending' first
- Call capacityService.reserve() to properly deduct capacity
- This creates ledger entry and updates status to 'approved'
- Ensures reconciliation shows 0 discrepancy after migration

### C. Security Audit References

**Reference:** `SECURITY_AUDIT_2025-10-30.md`

**Relevant Findings:**
- Tenant isolation working at database level (0 leaks)
- RLS policies in place
- All capacity operations use tenant_id filter
- Migration must respect tenant boundaries

**Migration Considerations:**
- All records must include tenant_id
- Verify no cross-tenant data leaks after migration
- Test with BOTH tenants (EMPWR + Glow)

---

## Document Status

**Status:** ✅ Planning Complete
**Next:** Awaiting email addresses and competition IDs
**Ready For:** Dry-run migration script execution

**Last Updated:** October 30, 2025
**Author:** Claude Code
**Session Context:** Migration planning for 22 studios joining mid-workflow

---

**END OF MIGRATION PLANNING SESSION**

*Save this document for reference when executing migration.*
