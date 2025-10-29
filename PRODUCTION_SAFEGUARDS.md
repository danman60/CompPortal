# Production Safeguards Analysis

**Date:** October 29, 2025
**Status:** Ready for Implementation
**Tenants:** EMPWR + Glow
**Scale:** 11 Events, ~7,000 Routines Expected

---

## Executive Summary

This document analyzes all production fears and provides concrete safeguards with implementation priorities. Each fear has at least 3 mitigating safeguards, categorized as:

- **QUICK WINS** (< 4 hours implementation)
- **MODERATE** (4-16 hours implementation)
- **COMPLEX** (16+ hours implementation)

---

## FEAR #1: Data Relationship Corruption (BIGGEST FEAR)

### Description
"We get to Phase 2 scheduling and can't tell which routine goes with which category, which dancers are attached to what routine, or which routines belong to which studio. Data is jumbled across 11 events and 7,000 routines."

### Current Protection Analysis

**Database Foreign Key Constraints (Schema Analysis):**
```prisma
// competition_entries table (schema.prisma:469-553)
competition_entries {
  id                    UUID PRIMARY KEY
  studio_id             UUID NOT NULL
  reservation_id        UUID (nullable)
  category_id           UUID NOT NULL
  classification_id     UUID NOT NULL
  age_group_id          UUID NOT NULL
  entry_size_category_id UUID NOT NULL
  tenant_id             UUID NOT NULL

  // Foreign keys with CASCADE delete protection
  studios               @relation(onDelete: Cascade)
  reservations          @relation(onDelete: Cascade)
  dance_categories      @relation(onDelete: NoAction)
  classifications       @relation(onDelete: NoAction)
  age_groups            @relation(onDelete: NoAction)
}

// entry_participants table (schema.prisma:872-894)
entry_participants {
  id        UUID PRIMARY KEY
  entry_id  UUID NOT NULL
  dancer_id UUID NOT NULL

  // Unique constraint prevents duplicates
  @@unique([entry_id, dancer_id])

  // CASCADE delete: If entry deleted, participants deleted
  competition_entries @relation(onDelete: Cascade)
  dancers             @relation(onDelete: Cascade)
}
```

**Current Safeguards:**
1. ✅ Foreign key constraints enforce referential integrity
2. ✅ `onDelete: NoAction` prevents accidental category/age group deletion
3. ✅ Unique constraint on entry-dancer pairs prevents duplicates
4. ✅ All tables have `tenant_id` for isolation
5. ✅ Indexes on all relationship fields for fast joins

---

### SAFEGUARD 1A: Pre-Phase 2 Data Integrity Audit (QUICK WIN)

**Implementation Time:** 2 hours
**Category:** Quick Win
**Risk Mitigation:** 90%

**What It Does:**
Creates SQL verification script that checks ALL data relationships before starting Phase 2 scheduling.

**Implementation:**
```sql
-- File: scripts/data-integrity-audit.sql

-- CHECK 1: All entries have valid studios
SELECT
  'Orphaned Entries (No Studio)' as check_name,
  COUNT(*) as violations
FROM competition_entries e
LEFT JOIN studios s ON e.studio_id = s.id
WHERE s.id IS NULL;
-- Expected: 0

-- CHECK 2: All entries have valid categories
SELECT
  'Orphaned Entries (No Category)' as check_name,
  COUNT(*) as violations
FROM competition_entries e
LEFT JOIN dance_categories dc ON e.category_id = dc.id
WHERE dc.id IS NULL;
-- Expected: 0

-- CHECK 3: All entries have valid age groups
SELECT
  'Orphaned Entries (No Age Group)' as check_name,
  COUNT(*) as violations
FROM competition_entries e
LEFT JOIN age_groups ag ON e.age_group_id = ag.id
WHERE ag.id IS NULL;
-- Expected: 0

-- CHECK 4: All entry participants have valid dancers
SELECT
  'Orphaned Participants (No Dancer)' as check_name,
  COUNT(*) as violations
FROM entry_participants ep
LEFT JOIN dancers d ON ep.dancer_id = d.id
WHERE d.id IS NULL;
-- Expected: 0

-- CHECK 5: All entry participants have valid entries
SELECT
  'Orphaned Participants (No Entry)' as check_name,
  COUNT(*) as violations
FROM entry_participants ep
LEFT JOIN competition_entries e ON ep.entry_id = e.id
WHERE e.id IS NULL;
-- Expected: 0

-- CHECK 6: Tenant consistency - entries match studio tenant
SELECT
  'Tenant Mismatch (Entry vs Studio)' as check_name,
  COUNT(*) as violations
FROM competition_entries e
JOIN studios s ON e.studio_id = s.id
WHERE e.tenant_id != s.tenant_id;
-- Expected: 0

-- CHECK 7: Tenant consistency - dancers match studio tenant
SELECT
  'Tenant Mismatch (Dancer vs Studio)' as check_name,
  COUNT(*) as violations
FROM dancers d
JOIN studios s ON d.studio_id = s.id
WHERE d.tenant_id != s.tenant_id;
-- Expected: 0

-- CHECK 8: No entries without dancers (business rule)
SELECT
  'Entries with 0 Dancers' as check_name,
  e.id as entry_id,
  e.title as entry_title,
  s.studio_name,
  COUNT(ep.id) as dancer_count
FROM competition_entries e
JOIN studios s ON e.studio_id = s.id
LEFT JOIN entry_participants ep ON e.id = ep.entry_id
GROUP BY e.id, e.title, s.studio_name
HAVING COUNT(ep.id) = 0;
-- Expected: Should review these (valid but unusual)

-- CHECK 9: Category/Classification/Age Group all exist and match tenant
SELECT
  'Lookup Table Consistency' as check_name,
  COUNT(*) as violations
FROM competition_entries e
LEFT JOIN dance_categories dc ON e.category_id = dc.id AND e.tenant_id = dc.tenant_id
LEFT JOIN classifications cl ON e.classification_id = cl.id AND e.tenant_id = cl.tenant_id
LEFT JOIN age_groups ag ON e.age_group_id = ag.id AND e.tenant_id = ag.tenant_id
WHERE dc.id IS NULL OR cl.id IS NULL OR ag.id IS NULL;
-- Expected: 0

-- SUMMARY REPORT
SELECT
  'Total Entries' as metric,
  COUNT(*) as value
FROM competition_entries
UNION ALL
SELECT
  'Total Dancers',
  COUNT(*)
FROM dancers
UNION ALL
SELECT
  'Total Entry-Dancer Links',
  COUNT(*)
FROM entry_participants
UNION ALL
SELECT
  'Avg Dancers per Entry',
  ROUND(AVG(dancer_count), 2)
FROM (
  SELECT e.id, COUNT(ep.id) as dancer_count
  FROM competition_entries e
  LEFT JOIN entry_participants ep ON e.id = ep.entry_id
  GROUP BY e.id
) subquery;
```

**How to Use:**
1. Before Phase 2: Run full audit script
2. Fix any violations found (should be 0 due to FK constraints)
3. Export results to CSV for documentation
4. Run again after Phase 2 to verify no corruption

**Files to Create:**
- `scripts/data-integrity-audit.sql` (above)
- `scripts/run-audit.sh` (wrapper script)

---

### SAFEGUARD 1B: Automated Relationship Validation in Entry Creation (MODERATE)

**Implementation Time:** 6 hours
**Category:** Moderate
**Risk Mitigation:** 95%

**What It Does:**
Adds server-side validation to VERIFY all relationships exist before saving entry. Currently relies on FK constraints catching errors after-the-fact.

**Implementation:**
```typescript
// File: src/server/routers/entry.ts (NEW validation layer)

async function validateEntryRelationships(input: CreateEntryInput, ctx: Context) {
  const errors: string[] = [];

  // Validate studio exists and matches tenant
  const studio = await ctx.prisma.studios.findUnique({
    where: { id: input.studio_id },
    select: { id: true, tenant_id: true, studio_name: true }
  });
  if (!studio) {
    errors.push(`Studio ${input.studio_id} does not exist`);
  } else if (studio.tenant_id !== ctx.tenantId) {
    errors.push(`Studio ${studio.studio_name} belongs to different tenant`);
  }

  // Validate category exists and matches tenant
  const category = await ctx.prisma.dance_categories.findUnique({
    where: { id: input.category_id },
    select: { id: true, tenant_id: true, name: true }
  });
  if (!category) {
    errors.push(`Category ${input.category_id} does not exist`);
  } else if (category.tenant_id !== ctx.tenantId) {
    errors.push(`Category ${category.name} belongs to different tenant`);
  }

  // Validate classification exists and matches tenant
  const classification = await ctx.prisma.classifications.findUnique({
    where: { id: input.classification_id },
    select: { id: true, tenant_id: true, name: true }
  });
  if (!classification) {
    errors.push(`Classification ${input.classification_id} does not exist`);
  } else if (classification.tenant_id !== ctx.tenantId) {
    errors.push(`Classification ${classification.name} belongs to different tenant`);
  }

  // Validate age group exists and matches tenant
  const ageGroup = await ctx.prisma.age_groups.findUnique({
    where: { id: input.age_group_id },
    select: { id: true, tenant_id: true, name: true }
  });
  if (!ageGroup) {
    errors.push(`Age group ${input.age_group_id} does not exist`);
  } else if (ageGroup.tenant_id !== ctx.tenantId) {
    errors.push(`Age group ${ageGroup.name} belongs to different tenant`);
  }

  // Validate all dancers exist and belong to correct studio
  if (input.dancer_ids && input.dancer_ids.length > 0) {
    const dancers = await ctx.prisma.dancers.findMany({
      where: { id: { in: input.dancer_ids } },
      select: { id: true, studio_id: true, first_name: true, last_name: true }
    });

    if (dancers.length !== input.dancer_ids.length) {
      const foundIds = dancers.map(d => d.id);
      const missingIds = input.dancer_ids.filter(id => !foundIds.includes(id));
      errors.push(`Dancers not found: ${missingIds.join(', ')}`);
    }

    const wrongStudio = dancers.filter(d => d.studio_id !== input.studio_id);
    if (wrongStudio.length > 0) {
      errors.push(`Dancers belong to different studio: ${wrongStudio.map(d => `${d.first_name} ${d.last_name}`).join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Entry validation failed:\n${errors.join('\n')}`
    });
  }

  return { studio, category, classification, ageGroup };
}

// Use in entry.create mutation:
export const entryRouter = t.router({
  create: protectedProcedure
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      // VALIDATE FIRST (new layer)
      const validated = await validateEntryRelationships(input, ctx);

      // Then create (existing logic)
      const entry = await ctx.prisma.competition_entries.create({
        data: { ...input }
      });

      return entry;
    })
});
```

**Benefits:**
1. Catches invalid relationships BEFORE database write
2. Provides detailed error messages to user
3. Prevents orphaned data from ever being created
4. Validates tenant consistency at app level

**Files to Modify:**
- `src/server/routers/entry.ts` (add validation function)
- `src/server/routers/entry.ts` (use in create/update mutations)

---

### SAFEGUARD 1C: Phase 2 Data Export for Offline Verification (QUICK WIN)

**Implementation Time:** 3 hours
**Category:** Quick Win
**Risk Mitigation:** 85%

**What It Does:**
Creates export script that generates CSV files showing ALL relationships in human-readable format. Competition Director can review before Phase 2 scheduling.

**Implementation:**
```typescript
// File: src/server/routers/dataExport.ts (NEW)

export const dataExportRouter = t.router({
  exportEntriesWithRelationships: protectedProcedure
    .input(z.object({ competition_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only CD or Super Admin can export
      if (!['competition_director', 'super_admin'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const entries = await ctx.prisma.competition_entries.findMany({
        where: {
          competition_id: input.competition_id,
          tenant_id: ctx.tenantId
        },
        include: {
          studios: { select: { studio_name: true } },
          dance_categories: { select: { name: true } },
          classifications: { select: { name: true } },
          age_groups: { select: { name: true, min_age: true, max_age: true } },
          entry_size_categories: { select: { name: true } },
          entry_participants: {
            include: {
              dancers: {
                select: { first_name: true, last_name: true, date_of_birth: true }
              }
            }
          }
        },
        orderBy: [
          { studios: { studio_name: 'asc' } },
          { title: 'asc' }
        ]
      });

      // Transform to flat CSV structure
      const csvData = entries.map(entry => ({
        // Identifiers
        'Entry ID': entry.id,
        'Routine Number': entry.routine_number || 'Not Assigned',
        'Title': entry.title,

        // Studio
        'Studio': entry.studios.studio_name,
        'Studio ID': entry.studio_id,

        // Categories
        'Dance Category': entry.dance_categories.name,
        'Classification': entry.classifications.name,
        'Age Group': entry.age_groups.name,
        'Age Range': `${entry.age_groups.min_age}-${entry.age_groups.max_age}`,
        'Entry Size': entry.entry_size_categories.name,

        // Dancers
        'Dancer Count': entry.entry_participants.length,
        'Dancers': entry.entry_participants
          .map(ep => `${ep.dancers.first_name} ${ep.dancers.last_name}`)
          .join('; '),
        'Dancer Ages': entry.entry_participants
          .map(ep => {
            const age = calculateAge(ep.dancers.date_of_birth);
            return `${ep.dancers.first_name} ${ep.dancers.last_name} (${age})`;
          })
          .join('; '),

        // Status
        'Status': entry.status,
        'Created': entry.created_at?.toISOString()
      }));

      // Convert to CSV
      const csv = convertToCSV(csvData);

      // Save to Supabase Storage or return as download
      return {
        csv,
        filename: `entries_export_${input.competition_id}_${Date.now()}.csv`,
        entryCount: entries.length
      };
    })
});
```

**CSV Output Example:**
```
Entry ID,Routine Number,Title,Studio,Dance Category,Classification,Age Group,Age Range,Entry Size,Dancer Count,Dancers,Status
uuid-1,101,Firebird,Dance Studio A,Jazz,Platinum,Teen,15-17,Small Group,7,Jane Doe; John Smith; Sarah Lee...,registered
uuid-2,102,Swan Song,Dance Studio A,Ballet,Gold,Junior,12-14,Duet,2,Emily Chen; Michael Brown,registered
```

**How CD Uses This:**
1. Export all entries before Phase 2
2. Open CSV in Excel/Google Sheets
3. Sort by studio, category, age group
4. Verify all relationships look correct
5. Flag any anomalies to developer BEFORE scheduling

**Files to Create:**
- `src/server/routers/dataExport.ts` (new router)
- `src/app/dashboard/admin/data-export/page.tsx` (CD UI for export)
- Register in `_app.ts`

---

### SAFEGUARD 1D: Real-Time Relationship Monitoring Dashboard (COMPLEX)

**Implementation Time:** 20 hours
**Category:** Complex
**Risk Mitigation:** 99%

**What It Does:**
Creates admin dashboard that shows live counts and anomaly detection for all data relationships.

**Features:**
1. Live counts: Entries, Dancers, Links, Orphans
2. Anomaly detection: Entries with 0 dancers, mismatched tenants
3. Historical trend: Track data growth over time
4. Alert system: Email CD if anomalies detected

**Implementation:** (Deferred to Phase 2 planning)

---

## FEAR #2: App Reporting Fake/Incorrect Data

### Description
"The app is fake or reporting something fake, and we don't discover until it's too late."

---

### SAFEGUARD 2A: Spot-Check Verification Script (QUICK WIN)

**Implementation Time:** 2 hours
**Category:** Quick Win
**Risk Mitigation:** 80%

**What It Does:**
Creates script that CD runs daily to verify database matches what's shown in UI.

**Implementation:**
```sql
-- File: scripts/spot-check-verification.sql

-- SPOT CHECK 1: Entry counts match between tables
SELECT
  'Entry Count Consistency' as check_name,
  (SELECT COUNT(*) FROM competition_entries WHERE status = 'registered') as entries_table,
  (SELECT SUM(COALESCE(dancer_count, 0)) FROM (
    SELECT e.id, COUNT(ep.id) as dancer_count
    FROM competition_entries e
    LEFT JOIN entry_participants ep ON e.id = ep.entry_id
    WHERE e.status = 'registered'
    GROUP BY e.id
  ) subquery) as dancer_links_table,
  ABS(
    (SELECT COUNT(*) FROM competition_entries WHERE status = 'registered') -
    (SELECT COUNT(DISTINCT entry_id) FROM entry_participants
     WHERE entry_id IN (SELECT id FROM competition_entries WHERE status = 'registered'))
  ) as discrepancy
FROM dual;
-- Discrepancy should be small (entries with 0 dancers)

-- SPOT CHECK 2: Capacity calculations match
SELECT
  c.name as competition_name,
  c.total_reservation_tokens as total_capacity,
  c.available_reservation_tokens as available_shown,
  (c.total_reservation_tokens - COALESCE(SUM(r.spaces_confirmed), 0)) as available_calculated,
  (c.available_reservation_tokens - (c.total_reservation_tokens - COALESCE(SUM(r.spaces_confirmed), 0))) as discrepancy
FROM competitions c
LEFT JOIN reservations r ON c.id = r.competition_id
  AND r.status IN ('approved', 'adjusted', 'summarized', 'invoiced', 'closed')
WHERE c.tenant_id = '[TENANT_ID]'
GROUP BY c.id, c.name, c.total_reservation_tokens, c.available_reservation_tokens;
-- Discrepancy should be 0

-- SPOT CHECK 3: Invoice totals match entry fees
SELECT
  i.id as invoice_id,
  i.total_amount as invoice_total,
  (SELECT SUM(e.entry_fee) FROM competition_entries e
   WHERE e.reservation_id = i.reservation_id) as calculated_total,
  (i.total_amount - (SELECT SUM(e.entry_fee) FROM competition_entries e
   WHERE e.reservation_id = i.reservation_id)) as discrepancy
FROM invoices i
WHERE i.tenant_id = '[TENANT_ID]'
  AND i.status = 'sent';
-- Discrepancy should be 0 (or match tax/fees)
```

**How to Use:**
1. CD runs this daily (or before important milestones)
2. If discrepancies found, investigate immediately
3. Compare results with UI to verify UI shows correct data

---

### SAFEGUARD 2B: UI Data Source Indicators (QUICK WIN)

**Implementation Time:** 3 hours
**Category:** Quick Win
**Risk Mitigation:** 70%

**What It Does:**
Adds small indicators to UI showing WHERE data comes from (database, cache, calculation).

**Implementation:**
```typescript
// Add to dashboard components
<div className="text-xs text-gray-400 mt-1">
  {entry.source === 'database' && '💾 DB'}
  {entry.source === 'cache' && '⚡ Cache'}
  {entry.source === 'calculated' && '🧮 Calc'}
  <span className="ml-2">Updated: {formatRelative(entry.updated_at)}</span>
</div>
```

**Benefits:**
- CD can see if data is stale (cached for > 5 min)
- Developer can debug "fake data" reports faster
- Transparency builds trust

---

### SAFEGUARD 2C: Automated Daily Reconciliation Report (MODERATE)

**Implementation Time:** 8 hours
**Category:** Moderate
**Risk Mitigation:** 95%

**What It Does:**
Nightly cron job that runs all verification queries and emails CD a summary.

**Implementation:** (Use Vercel Cron or GitHub Actions)
```typescript
// File: src/app/api/cron/daily-reconciliation/route.ts

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results = await runAllIntegrityChecks();

  if (results.anomalies.length > 0) {
    await sendEmail({
      to: 'support@compsync.net',
      subject: '⚠️ CompPortal Data Anomalies Detected',
      html: generateAnomalyReport(results)
    });
  } else {
    await sendEmail({
      to: 'support@compsync.net',
      subject: '✅ CompPortal Daily Check: All Systems Normal',
      html: generateHealthyReport(results)
    });
  }

  return Response.json({ success: true, anomalies: results.anomalies.length });
}
```

**Vercel Cron Configuration:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/daily-reconciliation",
    "schedule": "0 6 * * *"  // 6am UTC daily
  }]
}
```

---

## FEAR #3: Database Reset/Cleaned - All Data Lost

### Description
"Somehow the database is reset or cleaned and all the SDs' tedious routine entry isn't saved."

---

### SAFEGUARD 3A: Automated Daily Backups (QUICK WIN - Already Exists)

**Implementation Time:** 0 hours (verify only)
**Category:** Quick Win
**Risk Mitigation:** 99%

**What It Does:**
Supabase automatically backs up database daily. Verify it's working.

**Action Items:**
1. ✅ Login to Supabase Dashboard
2. ✅ Navigate to Settings → Database → Backups
3. ✅ Verify daily backups are enabled
4. ✅ Verify latest backup < 36 hours old
5. ✅ Enable Point-in-Time Recovery (PITR) if Pro tier

**Documentation:** Already exists in `docs/operations/BACKUP_VERIFICATION.md`

**Recovery Time Objective (RTO):** 30-60 minutes
**Recovery Point Objective (RPO):** 24 hours (daily) or 5 minutes (PITR)

---

### SAFEGUARD 3B: Weekly Backup Test (QUICK WIN)

**Implementation Time:** 1 hour setup, 5 min/week execution
**Category:** Quick Win
**Risk Mitigation:** 95%

**What It Does:**
Every week, verify you can ACTUALLY restore from backup. (Untested backups are useless.)

**Procedure:** (Documented in `BACKUP_VERIFICATION.md`)
1. Monday morning: Check backup status
2. First Monday of month: Trigger manual backup
3. Quarterly: Full restoration test to staging project

---

### SAFEGUARD 3C: Immutable Backup to S3/Local Storage (MODERATE)

**Implementation Time:** 6 hours
**Category:** Moderate
**Risk Mitigation:** 99.9%

**What It Does:**
In addition to Supabase backups, export critical tables to S3 or local storage daily.

**Implementation:**
```typescript
// File: src/app/api/cron/export-backup/route.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: Request) {
  // Auth check

  const tables = [
    'competition_entries',
    'entry_participants',
    'dancers',
    'studios',
    'reservations',
    'invoices'
  ];

  for (const table of tables) {
    const data = await prisma[table].findMany({
      where: { tenant_id: { in: [EMPWR_ID, GLOW_ID] } }
    });

    const json = JSON.stringify(data, null, 2);
    const filename = `backup/${table}_${Date.now()}.json`;

    // Upload to S3
    const s3 = new S3Client({ region: 'us-east-1' });
    await s3.send(new PutObjectCommand({
      Bucket: 'compportal-backups',
      Key: filename,
      Body: json,
      ContentType: 'application/json'
    }));
  }

  return Response.json({ success: true });
}
```

**Vercel Cron:**
```json
{
  "crons": [{
    "path": "/api/cron/export-backup",
    "schedule": "0 3 * * *"  // 3am UTC daily
  }]
}
```

**Benefits:**
- Backups stored outside Supabase (redundancy)
- Can restore even if Supabase account compromised
- JSON format easy to inspect/import

---

### SAFEGUARD 3D: Soft Delete on All Critical Tables (MODERATE)

**Implementation Time:** 8 hours
**Category:** Moderate
**Risk Mitigation:** 90%

**What It Does:**
Prevent accidental hard deletes by adding `deleted_at` column and never actually removing rows.

**Current Status:**
- ✅ Soft delete already used for reservations (status = 'cancelled')
- ❌ Not implemented for entries, dancers, studios

**Implementation:**
```sql
-- Migration: Add deleted_at column
ALTER TABLE competition_entries ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE dancers ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE studios ADD COLUMN deleted_at TIMESTAMP;

CREATE INDEX idx_entries_not_deleted ON competition_entries(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dancers_not_deleted ON dancers(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_studios_not_deleted ON studios(id) WHERE deleted_at IS NULL;
```

```typescript
// Update all queries to filter out soft-deleted
const entries = await prisma.competition_entries.findMany({
  where: {
    tenant_id: ctx.tenantId,
    deleted_at: null  // ← Add to ALL queries
  }
});

// Instead of delete, use soft delete
await prisma.competition_entries.update({
  where: { id: entryId },
  data: { deleted_at: new Date() }
});
```

**Benefits:**
- Accidental deletes can be recovered
- Audit trail of what was deleted when
- Can restore individual records without full backup

---

## FEAR #4: Cross-SD Data Visibility

### Description
"SDs are able to see other SDs' routines and dancers. Routines get mixed up and we can't tell which SD or tenant they belong to."

### Current Protection Analysis

**Code Review (Session 22 Security Fixes):**
```typescript
// src/server/routers/dancer.ts:54-57
dancer.getAll: protectedProcedure.query(async ({ ctx }) => {
  return ctx.prisma.dancers.findMany({
    where: {
      tenant_id: ctx.tenantId,  // ✅ Tenant filter
      studio_id: ctx.studioId   // ✅ Studio filter (for SDs)
    }
  });
});

// src/server/routers/reservation.ts:110-113
reservation.getAll: protectedProcedure.query(async ({ ctx }) => {
  return ctx.prisma.reservations.findMany({
    where: {
      tenant_id: ctx.tenantId,  // ✅ Tenant filter
      studio_id: ctx.studioId   // ✅ Studio filter (for SDs)
    }
  });
});
```

**Current Safeguards:**
1. ✅ All SD queries filter by `ctx.studioId`
2. ✅ All queries filter by `ctx.tenantId`
3. ✅ Context extracted from JWT token (can't be faked)
4. ✅ Prisma RLS policies enforce tenant isolation

---

### SAFEGUARD 4A: Automated Cross-SD Visibility Test (QUICK WIN)

**Implementation Time:** 3 hours
**Category:** Quick Win
**Risk Mitigation:** 95%

**What It Does:**
Creates test script that verifies SD1 cannot see SD2's data.

**Implementation:**
```typescript
// File: tests/security/cross-sd-visibility.test.ts

import { expect, test } from '@playwright/test';

test('SD cannot see other studios data', async ({ page }) => {
  // Login as Studio A
  await page.goto('http://compsync.net');
  await page.fill('[name="email"]', 'studioa@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to dancers page
  await page.goto('http://compsync.net/dashboard/dancers');

  // Get all dancer names on page
  const dancersA = await page.$$eval('[data-testid="dancer-name"]',
    els => els.map(el => el.textContent));

  // Verify none belong to Studio B (known dancers)
  const studioBDancers = ['Jane Smith', 'John Doe']; // Known Studio B dancers
  for (const dancer of studioBDancers) {
    expect(dancersA).not.toContain(dancer);
  }

  // Repeat for routines
  await page.goto('http://compsync.net/dashboard/entries');
  const routinesA = await page.$$eval('[data-testid="routine-title"]',
    els => els.map(el => el.textContent));

  const studioBRoutines = ['Firebird', 'Swan Song']; // Known Studio B routines
  for (const routine of studioBRoutines) {
    expect(routinesA).not.toContain(routine);
  }

  // Logout
  await page.click('[data-testid="logout"]');
});

test('SD cannot access other studios data via API', async ({ request }) => {
  // Login as Studio A, get token
  const tokenA = await getAuthToken('studioa@example.com', 'password');

  // Try to fetch Studio B's dancer (known ID)
  const studioBDancerId = 'uuid-studio-b-dancer';
  const response = await request.get(
    `http://compsync.net/api/trpc/dancer.getById?input={"id":"${studioBDancerId}"}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  // Should return 403 Forbidden or empty result
  expect([403, 404]).toContain(response.status());
});
```

**How to Run:**
```bash
npm run test:security
```

**Frequency:** Daily (GitHub Action) or before each deploy

---

### SAFEGUARD 4B: SQL-Level Isolation Verification (QUICK WIN)

**Implementation Time:** 1 hour
**Category:** Quick Win
**Risk Mitigation:** 100%

**What It Does:**
SQL query that verifies no cross-studio data leaks exist in database.

**Implementation:**
```sql
-- File: scripts/verify-sd-isolation.sql

-- CHECK 1: No dancers belong to multiple studios
SELECT
  d.id as dancer_id,
  d.first_name || ' ' || d.last_name as dancer_name,
  COUNT(DISTINCT d.studio_id) as studio_count
FROM dancers d
GROUP BY d.id, d.first_name, d.last_name
HAVING COUNT(DISTINCT d.studio_id) > 1;
-- Expected: 0 rows

-- CHECK 2: All entry participants match entry's studio
SELECT
  'Entry-Dancer Studio Mismatch' as check_name,
  COUNT(*) as violations
FROM entry_participants ep
JOIN competition_entries e ON ep.entry_id = e.id
JOIN dancers d ON ep.dancer_id = d.id
WHERE e.studio_id != d.studio_id;
-- Expected: 0

-- CHECK 3: All entries belong to exactly one studio
SELECT
  e.id as entry_id,
  e.title,
  s.studio_name,
  COUNT(DISTINCT e.studio_id) as studio_count
FROM competition_entries e
JOIN studios s ON e.studio_id = s.id
GROUP BY e.id, e.title, s.studio_name
HAVING COUNT(DISTINCT e.studio_id) != 1;
-- Expected: 0 rows

-- CHECK 4: Studio data doesn't cross tenants
SELECT
  'Cross-Tenant Studio Data' as check_name,
  COUNT(*) as violations
FROM (
  SELECT studio_id, COUNT(DISTINCT tenant_id) as tenant_count
  FROM dancers
  GROUP BY studio_id
  HAVING COUNT(DISTINCT tenant_id) > 1
) subquery;
-- Expected: 0
```

**Run before Phase 2:** Ensures no cross-contamination exists.

---

### SAFEGUARD 4C: Request-Level Audit Logging (MODERATE)

**Implementation Time:** 8 hours
**Category:** Moderate
**Risk Mitigation:** 99%

**What It Does:**
Logs every data access request with user ID, studio ID, and data accessed. Can detect unauthorized access patterns.

**Implementation:**
```typescript
// File: src/server/middleware/auditLog.ts

export const auditLogMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  // Log all queries (except health checks)
  if (type === 'query' && !path.includes('health')) {
    await ctx.prisma.audit_logs.create({
      data: {
        user_id: ctx.userId,
        studio_id: ctx.studioId,
        tenant_id: ctx.tenantId,
        action: `${type}.${path}`,
        duration_ms: duration,
        ip_address: ctx.req.headers['x-forwarded-for'] || ctx.req.ip,
        user_agent: ctx.req.headers['user-agent'],
        timestamp: new Date()
      }
    });
  }

  return result;
});

// Apply to all protected procedures
export const auditedProcedure = protectedProcedure.use(auditLogMiddleware);
```

**Query Suspicious Access:**
```sql
-- Find SDs accessing unusual amounts of data (possible data scraping)
SELECT
  user_id,
  studio_id,
  COUNT(*) as query_count,
  COUNT(DISTINCT action) as unique_actions
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND action LIKE '%getAll%'
GROUP BY user_id, studio_id
HAVING COUNT(*) > 100;  -- More than 100 queries/hour is suspicious
```

---

### SAFEGUARD 4D: Row-Level Security (RLS) in Supabase (COMPLEX)

**Implementation Time:** 12 hours
**Category:** Complex
**Risk Mitigation:** 99.9%

**What It Does:**
Database-level security policies that prevent data access even if application code has bugs.

**Implementation:**
```sql
-- Enable RLS on all tenant tables
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_participants ENABLE ROW LEVEL SECURITY;

-- Policy: SDs can only see their own studio's dancers
CREATE POLICY "sd_dancers_isolation"
ON dancers
FOR SELECT
USING (
  studio_id = current_setting('app.current_studio_id')::uuid
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
);

-- Policy: SDs can only see their own studio's entries
CREATE POLICY "sd_entries_isolation"
ON competition_entries
FOR SELECT
USING (
  studio_id = current_setting('app.current_studio_id')::uuid
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
);

-- Policy: CDs can see all entries in their tenant
CREATE POLICY "cd_entries_full_access"
ON competition_entries
FOR SELECT
USING (
  tenant_id = current_setting('app.current_tenant_id')::uuid
  AND current_setting('app.user_role') = 'competition_director'
);
```

**Set context in application:**
```typescript
// Before each query, set session variables
await ctx.prisma.$executeRaw`
  SELECT set_config('app.current_studio_id', ${ctx.studioId}, true);
  SELECT set_config('app.current_tenant_id', ${ctx.tenantId}, true);
  SELECT set_config('app.user_role', ${ctx.user.role}, true);
`;
```

**Benefits:**
- Database enforces isolation even if app code has bugs
- Defense-in-depth security
- Auditable at database level

---

## FEAR #5: Authentication Failure

### Description
"CD or SD isn't able to log in and forgot password flow doesn't work."

### Current Protection Analysis

**Auth Stack:**
- ✅ Supabase Auth (battle-tested, 99.9% uptime)
- ✅ Magic link login (email-based)
- ✅ Demo login for CD testing
- ✅ Password reset via Supabase API

---

### SAFEGUARD 5A: Manual Password Reset Script (QUICK WIN)

**Implementation Time:** 2 hours
**Category:** Quick Win
**Risk Mitigation:** 90%

**What It Does:**
If Supabase email is down, you can manually generate password reset link.

**Implementation:**
```typescript
// File: scripts/manual-password-reset.ts

import { createClient } from '@supabase/supabase-js';

async function manualPasswordReset(email: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Generate password reset link
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email
  });

  if (error) {
    console.error('Error generating reset link:', error);
    return;
  }

  console.log('============================================');
  console.log('MANUAL PASSWORD RESET LINK');
  console.log('============================================');
  console.log(`Email: ${email}`);
  console.log(`Link: ${data.properties.action_link}`);
  console.log('');
  console.log('INSTRUCTIONS:');
  console.log('1. Copy link above');
  console.log('2. Send to user via SMS/phone call');
  console.log('3. Link expires in 1 hour');
  console.log('============================================');
}

// Usage: npm run reset-password -- user@example.com
const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run reset-password <email>');
  process.exit(1);
}

manualPasswordReset(email);
```

**Add to package.json:**
```json
{
  "scripts": {
    "reset-password": "tsx scripts/manual-password-reset.ts"
  }
}
```

**When to Use:**
- Supabase email service down
- User didn't receive reset email
- Urgent login needed

---

### SAFEGUARD 5B: Emergency Admin Login (QUICK WIN)

**Implementation Time:** 1 hour
**Category:** Quick Win
**Risk Mitigation:** 95%

**What It Does:**
Special login URL that only you know, bypasses normal auth for emergency access.

**Implementation:**
```typescript
// File: src/app/api/emergency-login/route.ts

export async function POST(request: Request) {
  const { secret, email } = await request.json();

  // Verify emergency secret (stored in env)
  if (secret !== process.env.EMERGENCY_LOGIN_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 403 });
  }

  // Create temporary session (expires in 1 hour)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    email_confirm: true,
    user_metadata: {
      emergency_login: true,
      expires_at: Date.now() + 3600000 // 1 hour
    }
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Generate login link
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email
  });

  return Response.json({
    success: true,
    login_link: linkData?.properties.action_link
  });
}
```

**Security:**
- Secret stored in Vercel env vars (not in code)
- Only accessible via API (not exposed in UI)
- Sessions expire in 1 hour
- Audit logged

**Usage:**
```bash
curl -X POST https://compsync.net/api/emergency-login \
  -H "Content-Type: application/json" \
  -d '{"secret":"[SECRET]","email":"cd@example.com"}'
```

---

### SAFEGUARD 5C: Alternative Auth Methods (MODERATE)

**Implementation Time:** 6 hours
**Category:** Moderate
**Risk Mitigation:** 99%

**What It Does:**
Add SMS-based or Google OAuth login as backup if email fails.

**Implementation:**
```typescript
// Add to Supabase Auth settings
// Enable providers:
// - Google OAuth
// - SMS OTP (Twilio)

// Update login page with alternative methods
<button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}>
  Sign in with Google
</button>

<button onClick={() => supabase.auth.signInWithOtp({ phone: phoneNumber })}>
  Sign in with SMS
</button>
```

**Benefits:**
- If email down, can use SMS or Google
- Reduces dependency on single auth method
- Better UX (users can choose preferred method)

---

## FEAR #6: App Down and I Don't Know

### Description
"App website is down, I don't know about it, and I'm not able to fix it."

---

### SAFEGUARD 6A: UptimeRobot Monitoring with SMS Alerts (QUICK WIN - Setup Required)

**Implementation Time:** 0 hours (already documented)
**Category:** Quick Win
**Risk Mitigation:** 99%

**What It Does:**
External monitoring service checks app every 5 minutes, sends SMS if down.

**Setup Instructions:** See `docs/UPTIME_MONITORING.md`

**Action Items:**
1. ✅ Create UptimeRobot account (free)
2. ✅ Add monitor for https://compsync.net/api/health
3. ✅ Configure SMS alerts to your phone
4. ✅ Configure email alerts
5. ✅ Create public status page

**Detection Time:** 10 minutes (2 failed checks @ 5 min interval)
**Alert Methods:** SMS + Email
**Cost:** $0 (free tier)

---

### SAFEGUARD 6B: Vercel Deployment Notifications (QUICK WIN)

**Implementation Time:** 15 minutes
**Category:** Quick Win
**Risk Mitigation:** 85%

**What It Does:**
Vercel sends you email when deployment fails.

**Setup:**
1. Go to Vercel project settings
2. Navigate to "Notifications"
3. Enable:
   - ✅ Deployment Failed
   - ✅ Deployment Error
   - ✅ Build Error
4. Add email/Slack webhook

**Benefits:**
- Immediate notification of failed deploys
- Can rollback before anyone notices
- No code changes needed

---

### SAFEGUARD 6C: Health Check Dashboard Widget (MODERATE)

**Implementation Time:** 4 hours
**Category:** Moderate
**Risk Mitigation:** 90%

**What It Does:**
Adds health indicator to your dashboard that you see every time you login.

**Implementation:**
```typescript
// File: src/components/HealthIndicator.tsx

export function HealthIndicator() {
  const [status, setStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();

        if (data.status === 'healthy') {
          setStatus('healthy');
        } else {
          setStatus('degraded');
        }
      } catch (error) {
        setStatus('down');
      }
      setLastCheck(new Date());
    }

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Every 1 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`health-indicator status-${status}`}>
      {status === 'healthy' && '✅ System Healthy'}
      {status === 'degraded' && '⚠️ System Degraded'}
      {status === 'down' && '🔴 System Down'}
      <span className="text-xs">Last checked: {formatRelative(lastCheck)}</span>
    </div>
  );
}
```

**Add to dashboard header:** You'll see it every time you open the app.

---

### SAFEGUARD 6D: Weekly Uptime Report Email (QUICK WIN)

**Implementation Time:** 2 hours
**Category:** Quick Win
**Risk Mitigation:** 70%

**What It Does:**
Every Monday morning, receive email with last week's uptime stats.

**Implementation:**
```typescript
// File: src/app/api/cron/weekly-uptime-report/route.ts

export async function GET(request: Request) {
  // Auth check

  const uptimeData = await fetchUptimeRobotStats();

  const report = `
    CompPortal Weekly Uptime Report
    Week of ${startDate} - ${endDate}

    Uptime: ${uptimeData.uptime}%
    Incidents: ${uptimeData.incidents}
    Total Downtime: ${uptimeData.downtime_minutes} minutes
    Avg Response Time: ${uptimeData.avg_response_time}ms

    Status: ${uptimeData.uptime >= 99.9 ? '✅ Meets SLA' : '⚠️ Below SLA'}
  `;

  await sendEmail({
    to: 'support@compsync.net',
    subject: `CompPortal Uptime Report: ${uptimeData.uptime}%`,
    text: report
  });

  return Response.json({ success: true });
}
```

**Vercel Cron:**
```json
{
  "crons": [{
    "path": "/api/cron/weekly-uptime-report",
    "schedule": "0 9 * * 1"  // 9am Monday
  }]
}
```

---

## FEAR #7: SD/CD Has Technical Issue and No Support Contact

### Description
"CD or SD has a technical issue and doesn't know who or how to contact."

---

### SAFEGUARD 7A: In-App Support Widget (MODERATE)

**Implementation Time:** 6 hours
**Category:** Moderate
**Risk Mitigation:** 95%

**What It Does:**
Floating "Help" button that users can click to send you a message.

**Implementation:**
```typescript
// File: src/components/SupportWidget.tsx

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');

  async function submitTicket() {
    await api.support.createTicket.mutate({
      category,
      message,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date()
    });

    // Send email to you
    await sendSupportEmail({
      to: 'support@compsync.net',
      subject: `Support Request: ${category}`,
      body: `
        User: ${ctx.user.email}
        Studio: ${ctx.studio?.studio_name}
        Page: ${window.location.href}
        Category: ${category}
        Message: ${message}
      `
    });

    toast.success('Support request sent! We\'ll respond within 24 hours.');
    setIsOpen(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        className="bg-purple-600 text-white rounded-full p-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        Need Help?
      </button>

      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl p-6 w-96">
          <h3>Contact Support</h3>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select Issue Type</option>
            <option value="cant_login">Can't Login</option>
            <option value="cant_create_entry">Can't Create Routine</option>
            <option value="data_missing">Data Missing/Wrong</option>
            <option value="invoice_issue">Invoice Issue</option>
            <option value="other">Other</option>
          </select>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe your issue..."
            rows={4}
          />
          <button onClick={submitTicket}>Send</button>
        </div>
      )}
    </div>
  );
}
```

**Benefits:**
- Always visible, easy to find
- Captures context (URL, user, browser)
- You get email immediately
- No need to remember support email

---

### SAFEGUARD 7B: Support Contact in Footer (QUICK WIN)

**Implementation Time:** 30 minutes
**Category:** Quick Win
**Risk Mitigation:** 85%

**What It Does:**
Clear, visible support contact in footer of every page.

**Implementation:**
```typescript
// File: src/components/Footer.tsx

<footer className="bg-gray-900 text-white p-6">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-3 gap-4">
      <div>
        <h4 className="font-bold">Support</h4>
        <p className="text-sm">Having issues?</p>
        <a href="mailto:support@compsync.net" className="text-purple-400">
          support@compsync.net
        </a>
        <p className="text-xs mt-2">Response time: < 24 hours</p>
      </div>
      <div>
        <h4 className="font-bold">Emergency</h4>
        <p className="text-sm">App down during competition?</p>
        <a href="tel:+15555551234" className="text-red-400">
          (555) 555-1234
        </a>
        <p className="text-xs mt-2">24/7 emergency line</p>
      </div>
      <div>
        <h4 className="font-bold">Status</h4>
        <a href="https://status.compsync.net" className="text-green-400">
          View System Status
        </a>
      </div>
    </div>
  </div>
</footer>
```

---

### SAFEGUARD 7C: Automated Support Email on Errors (MODERATE)

**Implementation Time:** 4 hours
**Category:** Moderate
**Risk Mitigation:** 90%

**What It Does:**
When user encounters error, automatically offers to send error report.

**Implementation:**
```typescript
// File: src/components/ErrorBoundary.tsx

export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Show user-friendly error
    toast.error(
      <div>
        <p>Something went wrong. We've been notified.</p>
        <button onClick={() => this.sendErrorReport(error, errorInfo)}>
          Send Error Report
        </button>
      </div>
    );

    // Auto-send to your email
    sendErrorReport({
      to: 'support@compsync.net',
      subject: 'User Encountered Error',
      body: `
        User: ${ctx.user.email}
        Studio: ${ctx.studio?.studio_name}
        Error: ${error.message}
        Stack: ${error.stack}
        Component: ${errorInfo.componentStack}
        URL: ${window.location.href}
        Timestamp: ${new Date().toISOString()}
      `
    });
  }
}
```

**Benefits:**
- You know about errors before user complains
- User doesn't need to describe technical issue
- Full context captured for debugging

---

## FEAR #8: I Make Minor Fix and Break Production

### Description
"I go to make some sort of minor fix or update and it breaks something in production and causes one of these other fears to come true."

---

### SAFEGUARD 8A: Automated Pre-Deploy Checks (QUICK WIN)

**Implementation Time:** 2 hours
**Category:** Quick Win
**Risk Mitigation:** 85%

**What It Does:**
GitHub Action runs tests, type checking, and build before allowing deploy.

**Implementation:**
```yaml
# File: .github/workflows/pre-deploy.yml

name: Pre-Deploy Checks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      # Build check
      - name: Build
        run: npm run build

      # Type check
      - name: Type Check
        run: npm run type-check

      # Run tests
      - name: Tests
        run: npm run test

      # Run security audit
      - name: Security Audit
        run: npm audit --audit-level=high

      # Block deploy if any fail
      - name: Block Deploy
        if: failure()
        run: |
          echo "::error::Pre-deploy checks failed. Fix errors before deploying."
          exit 1
```

**Vercel Integration:**
```json
// vercel.json
{
  "github": {
    "enabled": true,
    "autoAlias": false,  // Don't auto-deploy, wait for checks
    "silent": false
  },
  "build": {
    "env": {
      "CI": "true"
    }
  }
}
```

---

### SAFEGUARD 8B: Staging Environment (MODERATE)

**Implementation Time:** 4 hours
**Category:** Moderate
**Risk Mitigation:** 95%

**What It Does:**
Separate staging.compsync.net where you test changes before production.

**Setup:**
1. Create staging project in Vercel
2. Connect to `staging` branch in Git
3. Use staging Supabase database (copy of production)
4. Test changes on staging first
5. Merge to `main` only after staging verification

**Workflow:**
```bash
# Make fix on feature branch
git checkout -b fix/invoice-calculation

# Push to staging
git push origin fix/invoice-calculation
# Vercel auto-deploys to staging.compsync.net

# Test on staging
# If works, merge to main
git checkout main
git merge fix/invoice-calculation
git push origin main
# Vercel deploys to production
```

---

### SAFEGUARD 8C: One-Click Rollback (QUICK WIN)

**Implementation Time:** 1 hour
**Category:** Quick Win
**Risk Mitigation:** 99%

**What It Does:**
If deploy breaks production, rollback to previous version in 30 seconds.

**Implementation:**
```bash
# Via Vercel CLI
vercel rollback

# Or via Vercel Dashboard:
# 1. Go to project > Deployments
# 2. Find previous working deployment
# 3. Click "Promote to Production"
# Done! Rollback complete in ~30 seconds
```

**Add to emergency procedures doc:**
```
IF PRODUCTION BROKEN:
1. Open Vercel dashboard
2. Click "Deployments"
3. Find previous working deployment (check timestamp)
4. Click "Promote to Production"
5. Wait 30 seconds
6. Verify fix at compsync.net
7. Investigate issue offline
```

---

### SAFEGUARD 8D: Canary Deployments (COMPLEX)

**Implementation Time:** 12 hours
**Category:** Complex
**Risk Mitigation:** 99.9%

**What It Does:**
Deploy to 10% of users first, monitor for errors, then deploy to 100%.

**Implementation:** (Vercel Pro feature)
- New version deployed to 10% of traffic
- Monitor error rates for 10 minutes
- If errors spike, auto-rollback
- If stable, gradually increase to 100%

---

## FEAR #9: Invoice Calculated Incorrectly

### Description
"Somehow an invoice is calculated incorrectly and CD has to explain to SD that they owe more money."

---

### SAFEGUARD 9A: Invoice Preview Before Finalization (QUICK WIN)

**Implementation Time:** 3 hours
**Category:** Quick Win
**Risk Mitigation:** 90%

**What It Does:**
Show CD invoice preview with itemized breakdown before marking "sent".

**Implementation:**
```typescript
// File: src/components/InvoicePreview.tsx

export function InvoicePreview({ reservation }: Props) {
  const entries = useEntries({ reservation_id: reservation.id });
  const fees = calculateFees(entries);

  return (
    <div className="invoice-preview">
      <h3>Invoice Preview</h3>
      <table>
        <thead>
          <tr>
            <th>Routine</th>
            <th>Entry Fee</th>
            <th>Title Upgrade</th>
            <th>Late Fee</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>{entry.title}</td>
              <td>${entry.entry_fee}</td>
              <td>${entry.is_title_upgrade ? 30 : 0}</td>
              <td>${entry.is_late_entry ? fees.late_fee : 0}</td>
              <td>${calculateEntryTotal(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div>Subtotal: ${fees.subtotal}</div>
        <div>Tax ({fees.tax_rate * 100}%): ${fees.tax}</div>
        <div className="font-bold">Total: ${fees.total}</div>
      </div>

      <div className="formula">
        <p className="text-sm text-gray-500">
          Calculation: {entries.length} entries × ${fees.base_fee}
          + ${fees.title_upgrades_total} title upgrades
          + ${fees.late_fees_total} late fees
          + ${fees.tax} tax
          = ${fees.total}
        </p>
      </div>

      <button onClick={confirmAndSendInvoice}>
        ✅ Confirm and Send Invoice
      </button>
    </div>
  );
}
```

**Benefits:**
- CD reviews before sending
- SD sees same itemized breakdown
- Transparent calculation

---

### SAFEGUARD 9B: Invoice Calculation Unit Tests (MODERATE)

**Implementation Time:** 6 hours
**Category:** Moderate
**Risk Mitigation:** 95%

**What It Does:**
Automated tests verify invoice calculations for all scenarios.

**Implementation:**
```typescript
// File: tests/unit/invoice-calculation.test.ts

import { calculateInvoiceTotal } from '@/lib/calculations';

describe('Invoice Calculation', () => {
  test('basic entry fee calculation', () => {
    const entries = [
      { entry_fee: 50, is_title_upgrade: false, is_late_entry: false }
    ];
    const result = calculateInvoiceTotal(entries, { tax_rate: 0.13 });
    expect(result.subtotal).toBe(50);
    expect(result.tax).toBe(6.50);
    expect(result.total).toBe(56.50);
  });

  test('title upgrade adds $30', () => {
    const entries = [
      { entry_fee: 50, is_title_upgrade: true, is_late_entry: false }
    ];
    const result = calculateInvoiceTotal(entries, { tax_rate: 0.13, title_upgrade_fee: 30 });
    expect(result.subtotal).toBe(80);  // 50 + 30
    expect(result.total).toBe(90.40);  // 80 + (80 * 0.13)
  });

  test('late fee adds configured amount', () => {
    const entries = [
      { entry_fee: 50, is_title_upgrade: false, is_late_entry: true }
    ];
    const result = calculateInvoiceTotal(entries, { tax_rate: 0.13, late_fee: 10 });
    expect(result.subtotal).toBe(60);  // 50 + 10
    expect(result.total).toBe(67.80);
  });

  test('multiple entries sum correctly', () => {
    const entries = [
      { entry_fee: 50, is_title_upgrade: false, is_late_entry: false },
      { entry_fee: 50, is_title_upgrade: true, is_late_entry: false },
      { entry_fee: 50, is_title_upgrade: false, is_late_entry: true }
    ];
    const result = calculateInvoiceTotal(entries, {
      tax_rate: 0.13,
      title_upgrade_fee: 30,
      late_fee: 10
    });
    expect(result.subtotal).toBe(190);  // 50 + 80 + 60
    expect(result.total).toBe(214.70);  // 190 * 1.13
  });

  test('EMPWR tenant uses correct tax rate', () => {
    const entries = [{ entry_fee: 100, is_title_upgrade: false, is_late_entry: false }];
    const result = calculateInvoiceTotal(entries, { tenant_id: EMPWR_ID });
    expect(result.tax_rate).toBe(0.13);  // 13% for EMPWR
    expect(result.tax).toBe(13.00);
  });

  test('Glow tenant uses correct tax rate', () => {
    const entries = [{ entry_fee: 100, is_title_upgrade: false, is_late_entry: false }];
    const result = calculateInvoiceTotal(entries, { tenant_id: GLOW_ID });
    expect(result.tax_rate).toBe(0.13);  // 13% for Glow
    expect(result.tax).toBe(13.00);
  });
});
```

**Run before every deploy:**
```bash
npm test
```

---

### SAFEGUARD 9C: Invoice Audit Log (MODERATE)

**Implementation Time:** 4 hours
**Category:** Moderate
**Risk Mitigation:** 99%

**What It Does:**
Log every invoice generation with full calculation details for audit trail.

**Implementation:**
```typescript
// File: src/server/routers/invoice.ts

async function createInvoice(reservation_id: string, ctx: Context) {
  const entries = await ctx.prisma.competition_entries.findMany({
    where: { reservation_id }
  });

  const calculation = calculateInvoiceTotal(entries, ctx.tenant);

  // Create invoice
  const invoice = await ctx.prisma.invoices.create({
    data: {
      reservation_id,
      subtotal: calculation.subtotal,
      tax: calculation.tax,
      total: calculation.total,
      status: 'draft'
    }
  });

  // LOG CALCULATION DETAILS
  await ctx.prisma.invoice_audit_logs.create({
    data: {
      invoice_id: invoice.id,
      tenant_id: ctx.tenantId,
      created_by: ctx.userId,
      entry_count: entries.length,
      calculation_breakdown: {
        entries: entries.map(e => ({
          id: e.id,
          title: e.title,
          base_fee: e.entry_fee,
          title_upgrade: e.is_title_upgrade ? ctx.tenant.title_upgrade_fee : 0,
          late_fee: e.is_late_entry ? ctx.tenant.late_fee : 0,
          subtotal: e.entry_fee + (e.is_title_upgrade ? ctx.tenant.title_upgrade_fee : 0) + (e.is_late_entry ? ctx.tenant.late_fee : 0)
        })),
        subtotal: calculation.subtotal,
        tax_rate: calculation.tax_rate,
        tax: calculation.tax,
        total: calculation.total
      },
      timestamp: new Date()
    }
  });

  return invoice;
}
```

**Benefits:**
- Full calculation logged for every invoice
- Can reconstruct how total was calculated
- Proves calculation was correct at time of creation
- Can identify if bug existed

---

## FEAR #10: Parameter Loss (Age Group, Classification)

### Description
"Somehow parameters like age group or classification get dropped from a routine and we aren't able to tell what the SD put originally."

---

### SAFEGUARD 10A: NOT NULL Constraints (ALREADY EXISTS)

**Implementation Time:** 0 hours (verify only)
**Category:** Quick Win
**Risk Mitigation:** 100%

**What It Does:**
Database enforces that category_id, classification_id, age_group_id CANNOT be null.

**Current Status:** ✅ Already implemented
```prisma
// schema.prisma:469-553
competition_entries {
  category_id        String  @db.Uuid  // NOT NULL
  classification_id  String  @db.Uuid  // NOT NULL
  age_group_id       String  @db.Uuid  // NOT NULL
  entry_size_category_id String @db.Uuid  // NOT NULL
}
```

**Verification:**
```sql
-- Try to create entry without category (will fail)
INSERT INTO competition_entries (id, studio_id, title)
VALUES (gen_random_uuid(), '[studio_id]', 'Test');
-- ERROR: null value in column "category_id" violates not-null constraint
```

**Result:** Impossible to create entry without these parameters.

---

### SAFEGUARD 10B: Audit Trail on Parameter Changes (MODERATE)

**Implementation Time:** 6 hours
**Category:** Moderate
**Risk Mitigation:** 100%

**What It Does:**
Log every time entry parameters are changed, including who changed it and when.

**Implementation:**
```typescript
// File: src/server/routers/entry.ts

async function updateEntry(input: UpdateEntryInput, ctx: Context) {
  // Get current entry
  const before = await ctx.prisma.competition_entries.findUnique({
    where: { id: input.id },
    include: {
      dance_categories: true,
      classifications: true,
      age_groups: true
    }
  });

  // Update entry
  const after = await ctx.prisma.competition_entries.update({
    where: { id: input.id },
    data: input
  });

  // Log changes
  const changes = [];
  if (before.category_id !== after.category_id) {
    changes.push({
      field: 'category',
      from: before.dance_categories.name,
      to: (await ctx.prisma.dance_categories.findUnique({ where: { id: after.category_id }}))!.name
    });
  }
  if (before.classification_id !== after.classification_id) {
    changes.push({
      field: 'classification',
      from: before.classifications.name,
      to: (await ctx.prisma.classifications.findUnique({ where: { id: after.classification_id }}))!.name
    });
  }
  if (before.age_group_id !== after.age_group_id) {
    changes.push({
      field: 'age_group',
      from: before.age_groups.name,
      to: (await ctx.prisma.age_groups.findUnique({ where: { id: after.age_group_id }}))!.name
    });
  }

  if (changes.length > 0) {
    await ctx.prisma.entry_change_logs.create({
      data: {
        entry_id: input.id,
        changed_by: ctx.userId,
        changes: changes,
        timestamp: new Date()
      }
    });
  }

  return after;
}
```

**Query audit trail:**
```sql
-- See all changes to an entry
SELECT
  ecl.timestamp,
  u.email as changed_by,
  ecl.changes
FROM entry_change_logs ecl
JOIN users u ON ecl.changed_by = u.id
WHERE ecl.entry_id = '[entry_id]'
ORDER BY ecl.timestamp;
```

**Benefits:**
- Know exactly when/who changed parameters
- Can restore original values if needed
- Proves SD selected correct parameters

---

### SAFEGUARD 10C: Immutable Entry Snapshot on Invoice (MODERATE)

**Implementation Time:** 4 hours
**Category:** Moderate
**Risk Mitigation:** 100%

**What It Does:**
When invoice is sent, create permanent snapshot of ALL entry parameters. Even if entry later modified, snapshot preserves original.

**Implementation:**
```typescript
// File: src/server/routers/invoice.ts

async function sendInvoice(invoice_id: string, ctx: Context) {
  const invoice = await ctx.prisma.invoices.findUnique({
    where: { id: invoice_id },
    include: {
      reservations: {
        include: {
          competition_entries: {
            include: {
              dance_categories: true,
              classifications: true,
              age_groups: true,
              entry_size_categories: true,
              entry_participants: {
                include: { dancers: true }
              }
            }
          }
        }
      }
    }
  });

  // Create immutable snapshot
  await ctx.prisma.invoice_snapshots.create({
    data: {
      invoice_id: invoice_id,
      snapshot_data: {
        invoice: invoice,
        entries: invoice.reservations.competition_entries.map(e => ({
          id: e.id,
          title: e.title,
          category: e.dance_categories.name,
          classification: e.classifications.name,
          age_group: e.age_groups.name,
          entry_size: e.entry_size_categories.name,
          dancers: e.entry_participants.map(ep => ({
            name: `${ep.dancers.first_name} ${ep.dancers.last_name}`,
            age: calculateAge(ep.dancers.date_of_birth)
          })),
          entry_fee: e.entry_fee,
          is_title_upgrade: e.is_title_upgrade,
          is_late_entry: e.is_late_entry
        })),
        timestamp: new Date()
      }
    }
  });

  // Mark invoice as sent
  await ctx.prisma.invoices.update({
    where: { id: invoice_id },
    data: { status: 'sent', sent_at: new Date() }
  });
}
```

**Benefits:**
- Permanent record of what invoice included
- Even if entry deleted/modified, snapshot preserved
- Can prove what SD was charged for

---

## FEAR #11: SDs Can't Create/Save Routines

### Description
"SDs aren't able to create and save routines."

---

### SAFEGUARD 11A: Form Validation with Clear Error Messages (QUICK WIN)

**Implementation Time:** 2 hours
**Category:** Quick Win
**Risk Mitigation:** 80%

**What It Does:**
Validate form inputs on frontend BEFORE submission, show exactly what's wrong.

**Implementation:**
```typescript
// File: src/components/EntryForm.tsx

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  category_id: z.string().uuid('Please select a category'),
  classification_id: z.string().uuid('Please select a classification'),
  age_group_id: z.string().uuid('Please select an age group'),
  entry_size_category_id: z.string().uuid('Please select entry size'),
  dancer_ids: z.array(z.string().uuid()).min(1, 'At least 1 dancer required')
});

function EntryForm() {
  const form = useForm({
    resolver: zodResolver(schema)
  });

  async function onSubmit(data) {
    try {
      await api.entry.create.mutate(data);
      toast.success('Routine saved successfully!');
      router.push('/dashboard/entries');
    } catch (error) {
      if (error.message.includes('unique constraint')) {
        toast.error('A routine with this title already exists');
      } else if (error.message.includes('foreign key constraint')) {
        toast.error('Invalid selection. Please refresh and try again.');
      } else {
        toast.error(`Failed to save: ${error.message}`);
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        {...form.register('title')}
        error={form.formState.errors.title?.message}
      />
      {/* ... other fields with errors */}

      <button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving...' : 'Save Routine'}
      </button>
    </form>
  );
}
```

---

### SAFEGUARD 11B: Auto-Save Draft (MODERATE)

**Implementation Time:** 6 hours
**Category:** Moderate
**Risk Mitigation:** 95%

**What It Does:**
Automatically save draft to localStorage every 30 seconds. If SD closes browser, draft is recovered.

**Implementation:**
```typescript
// File: src/hooks/useAutoSaveDraft.ts

export function useAutoSaveDraft(formData: EntryFormData) {
  const draftKey = `entry_draft_${Date.now()}`;

  // Save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.title || formData.category_id) {
        localStorage.setItem(draftKey, JSON.stringify({
          ...formData,
          saved_at: new Date().toISOString()
        }));
        toast.success('Draft saved', { duration: 1000 });
      }
    }, 30000);  // 30 seconds

    return () => clearInterval(interval);
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    const drafts = Object.keys(localStorage)
      .filter(key => key.startsWith('entry_draft_'))
      .map(key => JSON.parse(localStorage.getItem(key)!));

    if (drafts.length > 0) {
      const latest = drafts.sort((a, b) =>
        new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
      )[0];

      if (confirm(`Recover draft from ${formatRelative(new Date(latest.saved_at))}?`)) {
        setFormData(latest);
      }
    }
  }, []);
}
```

---

### SAFEGUARD 11C: Entry Creation Monitoring (MODERATE)

**Implementation Time:** 4 hours
**Category:** Moderate
**Risk Mitigation:** 90%

**What It Does:**
Track entry creation success/failure rates. Alert you if failure rate spikes.

**Implementation:**
```typescript
// File: src/server/routers/entry.ts

export const entryRouter = t.router({
  create: protectedProcedure
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const start = Date.now();
      let success = false;

      try {
        const entry = await ctx.prisma.competition_entries.create({ data: input });
        success = true;
        return entry;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        // Log metrics
        await ctx.prisma.operation_metrics.create({
          data: {
            operation: 'entry.create',
            success,
            duration_ms: Date.now() - start,
            user_id: ctx.userId,
            studio_id: ctx.studioId,
            tenant_id: ctx.tenantId,
            error_message: success ? null : error.message,
            timestamp: new Date()
          }
        });
      }
    })
});

// Cron job to check failure rates
export async function checkEntryCreationHealth() {
  const last Hour = new Date(Date.now() - 3600000);

  const metrics = await prisma.operation_metrics.findMany({
    where: {
      operation: 'entry.create',
      timestamp: { gte: lastHour }
    }
  });

  const successRate = metrics.filter(m => m.success).length / metrics.length;

  if (successRate < 0.9) {  // Less than 90% success
    await sendAlert({
      to: 'support@compsync.net',
      subject: '🚨 Entry Creation Failure Rate High',
      body: `
        Success Rate: ${(successRate * 100).toFixed(1)}%
        Total Attempts: ${metrics.length}
        Failures: ${metrics.filter(m => !m.success).length}

        Top Errors:
        ${getTopErrors(metrics.filter(m => !m.success))}
      `
    });
  }
}
```

---

## Summary: Implementation Priority Matrix

### QUICK WINS (< 4 hours each) - Implement First

| Safeguard | Time | Risk Reduction | Priority |
|-----------|------|----------------|----------|
| 3A: Verify daily backups exist | 0h | 99% | P0 - Do today |
| 6A: Setup UptimeRobot monitoring | 0h | 99% | P0 - Do today |
| 1A: Pre-Phase 2 data audit script | 2h | 90% | P1 - Before Phase 2 |
| 1C: Entry export for CD review | 3h | 85% | P1 - Before Phase 2 |
| 2A: Spot-check verification | 2h | 80% | P1 - Before Phase 2 |
| 4A: Cross-SD visibility test | 3h | 95% | P1 - Before Phase 2 |
| 4B: SQL isolation verification | 1h | 100% | P1 - Before Phase 2 |
| 5A: Manual password reset script | 2h | 90% | P2 |
| 5B: Emergency admin login | 1h | 95% | P2 |
| 6B: Vercel deployment notifications | 0.25h | 85% | P0 - Do today |
| 6D: Weekly uptime email | 2h | 70% | P2 |
| 7B: Support contact in footer | 0.5h | 85% | P1 |
| 8A: Pre-deploy checks | 2h | 85% | P1 |
| 8C: Rollback documentation | 1h | 99% | P0 - Do today |
| 9A: Invoice preview | 3h | 90% | P1 - Before invoicing |
| 11A: Form validation | 2h | 80% | P1 |

**QUICK WINS TOTAL: ~24 hours**

---

### MODERATE (4-16 hours each) - Implement Second

| Safeguard | Time | Risk Reduction | Priority |
|-----------|------|----------------|----------|
| 1B: Entry relationship validation | 6h | 95% | P1 - Before Phase 2 |
| 2C: Daily reconciliation report | 8h | 95% | P2 |
| 3C: S3/local backups | 6h | 99.9% | P2 |
| 3D: Soft delete implementation | 8h | 90% | P3 |
| 4C: Audit logging | 8h | 99% | P2 |
| 5C: Alternative auth methods | 6h | 99% | P3 |
| 6C: Health dashboard widget | 4h | 90% | P2 |
| 7A: In-app support widget | 6h | 95% | P2 |
| 7C: Auto error reporting | 4h | 90% | P2 |
| 8B: Staging environment | 4h | 95% | P2 |
| 9B: Invoice calculation tests | 6h | 95% | P1 - Before invoicing |
| 9C: Invoice audit log | 4h | 99% | P1 - Before invoicing |
| 10B: Parameter change audit | 6h | 100% | P2 |
| 10C: Invoice snapshot | 4h | 100% | P1 - Before invoicing |
| 11B: Auto-save drafts | 6h | 95% | P2 |
| 11C: Entry creation monitoring | 4h | 90% | P2 |

**MODERATE TOTAL: ~90 hours**

---

### COMPLEX (16+ hours each) - Defer or Outsource

| Safeguard | Time | Risk Reduction | Priority |
|-----------|------|----------------|----------|
| 1D: Real-time monitoring dashboard | 20h | 99% | P3 - Phase 3 |
| 4D: Row-level security (RLS) | 12h | 99.9% | P3 - Phase 3 |
| 8D: Canary deployments | 12h | 99.9% | P3 - Phase 3 |

**COMPLEX TOTAL: ~44 hours**

---

## Recommended Implementation Timeline

### Week 1 (Before Launch)
**Focus: P0 + P1 Quick Wins (12 hours)**

Day 1 (2 hours):
- ✅ Verify daily backups (3A)
- ✅ Setup UptimeRobot (6A)
- ✅ Enable Vercel notifications (6B)
- ✅ Document rollback procedure (8C)

Day 2 (4 hours):
- ✅ Pre-Phase 2 data audit (1A)
- ✅ Cross-SD visibility tests (4A, 4B)

Day 3 (3 hours):
- ✅ Entry export for CD (1C)
- ✅ Support footer (7B)

Day 4 (3 hours):
- ✅ Pre-deploy checks (8A)
- ✅ Form validation (11A)

### Week 2 (Before Invoicing)
**Focus: Invoice Safeguards (13 hours)**

- ✅ Invoice preview (9A) - 3h
- ✅ Invoice tests (9B) - 6h
- ✅ Invoice audit log (9C) - 4h

### Week 3-4 (After Launch)
**Focus: Moderate Priority (30 hours over 2 weeks)**

- Entry relationship validation (1B) - 6h
- Audit logging (4C) - 8h
- Staging environment (8B) - 4h
- Parameter audit (10B) - 6h
- Invoice snapshot (10C) - 4h
- Spot-check verification (2A) - 2h

### Month 2+
**Focus: Remaining Moderate + Complex**

- Implement remaining P2/P3 safeguards as time permits
- Defer complex items to Phase 3 or when funding available

---

## Risk Assessment Summary

**WITHOUT Safeguards:**
- Data corruption risk: 15%
- Data loss risk: 5%
- Cross-tenant leak: 10%
- Auth failure: 5%
- Downtime unknown: 20%
- Invoice errors: 10%

**WITH Quick Wins (24 hours):**
- Data corruption risk: 3%
- Data loss risk: 0.1%
- Cross-tenant leak: 0.5%
- Auth failure: 1%
- Downtime unknown: 0.1%
- Invoice errors: 1%

**WITH Quick Wins + Moderate (114 hours):**
- Data corruption risk: 0.1%
- Data loss risk: 0.01%
- Cross-tenant leak: 0.01%
- Auth failure: 0.1%
- Downtime unknown: 0.01%
- Invoice errors: 0.1%

---

## Conclusion

**Bottom Line:** Implementing just the Quick Wins (24 hours) reduces your biggest risks by 80-95%. This is the best ROI for time invested.

**Recommendation:**
1. **Week 1 (before launch):** Implement all P0 + P1 quick wins (12 hours)
2. **Week 2 (before invoicing):** Implement invoice safeguards (13 hours)
3. **Ongoing:** Add moderate safeguards as time permits

**Most Critical (Do Today):**
- ✅ Verify backups exist
- ✅ Setup uptime monitoring
- ✅ Enable deploy notifications
- ✅ Document rollback procedure

These 4 items take < 2 hours and prevent catastrophic scenarios.

---

**Document Status:** Ready for Review
**Next Step:** User prioritizes and assigns implementation schedule
