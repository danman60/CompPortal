# Backup Verification and Testing Guide

**Last Updated:** October 20, 2025
**Test Status:** ⏸️ Awaiting User Execution
**RTO (Recovery Time Objective):** TBD (target: <1 hour)
**RPO (Recovery Point Objective):** TBD (estimate: 24 hours)

---

## Overview

This document provides step-by-step procedures for verifying Supabase database backups and testing restoration. Regular backup testing ensures business continuity in case of:
- Database corruption
- Accidental data deletion
- Hardware failures
- Supabase service outages

**CRITICAL:** Database backups are USELESS if you've never tested restoration. This guide ensures you can actually recover when disaster strikes.

---

## Current Backup Configuration

### Supabase Project Details
- **Project Name:** CompPortal (Production)
- **Project Ref:** `[USER ACTION: Fill from Supabase Dashboard]`
- **Region:** `[USER ACTION: Fill from Supabase Dashboard]`
- **Tier:** `[Free/Pro - USER ACTION: Fill]`

### Access Instructions
1. Login to Supabase: https://supabase.com/dashboard
2. Select your CompPortal project
3. Navigate to **Settings → Database → Backups**

### Backup Schedule
- **Automatic Backups:** `[Daily/Weekly - USER ACTION: Verify]`
- **Backup Time:** `[Time in UTC - USER ACTION: Fill]`
- **Retention Period:** `[7 days (Free) / 30 days (Pro) - USER ACTION: Verify]`
- **Last Successful Backup:** `[USER ACTION: Check dashboard and fill timestamp]`
- **Backup Size:** `[USER ACTION: Fill from dashboard]`
- **Status:** `[Success/Failed - USER ACTION: Verify green checkmark]`

### Point-in-Time Recovery (PITR)
- **PITR Enabled:** `[Yes/No - USER ACTION: Verify]`
- **PITR Window:** `[24h (Free) / 7 days (Pro) - USER ACTION: Verify]`
- **Notes:** PITR allows restoration to any specific timestamp within the window. Highly recommended for production.

**Recommendation:** If PITR is not enabled, upgrade to Supabase Pro tier ($25/month) for 7-day PITR coverage.

---

## Backup Verification Checklist

### Weekly Quick Check (5 minutes)
Run this checklist every Monday morning:

- [ ] Login to Supabase Dashboard
- [ ] Navigate to Settings → Database → Backups
- [ ] Verify latest backup is < 36 hours old
- [ ] Verify backup status shows green checkmark (Success)
- [ ] If backup failed or is old, investigate immediately
- [ ] Check PITR status (if enabled)
- [ ] Document findings in backup log

### Monthly Detailed Review (15 minutes)
Run this on the 1st of each month:

- [ ] Review all backups from past 30 days
- [ ] Check for any failures or gaps
- [ ] Verify backup size is growing appropriately (more data = larger backups)
- [ ] Test manual backup trigger:
  - Click "Create backup" button
  - Wait for completion (~2-5 minutes)
  - Verify backup appears in list
- [ ] Review retention policy (matches business needs?)
- [ ] Update this document with current status

### Quarterly Full Restoration Test (1-2 hours)
**CRITICAL:** Run this test every 3 months or before major competitions.

**Purpose:** Verify you can actually restore the database and application works with restored data.

**Timing:** Execute during low-traffic hours (Sunday night or early Monday morning).

**Procedure:** See "Backup Restoration Testing" section below.

---

## Backup Restoration Testing

### Prerequisites
- [ ] Supabase account with access to production project
- [ ] Permission to create new Supabase projects (free tier allows multiple projects)
- [ ] Vercel account access (for testing connection)
- [ ] 1-2 hours of uninterrupted time
- [ ] Notebook for documenting timing and steps

### Test Procedure

#### Step 1: Create Test Restoration Project (5 minutes)
1. Login to Supabase: https://supabase.com/dashboard
2. Click "New Project"
3. Configure:
   - **Organization:** Same as production
   - **Name:** `compportal-restore-test-YYYY-MM-DD` (e.g., `compportal-restore-test-2025-10-20`)
   - **Database Password:** Generate strong password (save in password manager)
   - **Region:** **IMPORTANT:** Same region as production (check production project settings)
   - **Pricing Plan:** Free tier is fine for testing
4. Click "Create new project"
5. **Wait for provisioning:** ~2-5 minutes (dashboard shows progress)
6. **Record start time:** `[Fill during test]`

#### Step 2: Restore Production Backup (10-30 minutes)
1. Navigate to test project → **Settings → Database → Backups**
2. You should see option to restore from another project's backup
3. **If option exists:**
   - Select production project from dropdown
   - Choose latest backup from list
   - Click "Restore backup to this project"
   - **IMPORTANT:** This will overwrite the test project's database
   - Confirm restoration
   - **Wait for completion:** ~10-30 minutes depending on database size
   - Dashboard shows progress bar
   - **Record completion time:** `[Fill during test]`

4. **If no restore-from-project option (Free tier limitation):**
   - You'll need to manually export/import SQL:
   - In production project: Settings → Database → Database Settings → Connection String
   - Copy Direct Connection URL
   - Use `pg_dump` to export:
     ```bash
     pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" > backup.sql
     ```
   - In test project: Use `psql` to import:
     ```bash
     psql "postgresql://postgres:[password]@db.[test-project-ref].supabase.co:5432/postgres" < backup.sql
     ```
   - **Record total time:** `[Fill during test]`

#### Step 3: Verify Data Integrity (15 minutes)
1. **Connect to restored database:**
   - In test project: Settings → Database → Connection String
   - Copy Pooler connection string (port 6543)
   - Use a database client (Postico, TablePlus, or psql)

2. **Run verification queries:**
   ```sql
   -- Check all tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   -- Record count: [USER ACTION: Fill]

   -- Verify row counts match production
   SELECT 'competitions' AS table, COUNT(*) AS rows FROM competitions
   UNION ALL
   SELECT 'studios', COUNT(*) FROM studios
   UNION ALL
   SELECT 'dancers', COUNT(*) FROM dancers
   UNION ALL
   SELECT 'competition_entries', COUNT(*) FROM competition_entries
   UNION ALL
   SELECT 'reservations', COUNT(*) FROM reservations;
   -- Record results and compare with production:
   -- [USER ACTION: Fill comparison table]
   ```

3. **Verify foreign key constraints:**
   ```sql
   -- All foreign keys should exist
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY';
   -- Record count: [USER ACTION: Fill]
   -- Should match production count
   ```

4. **Test sample business queries:**
   ```sql
   -- Test 1: Get active competitions
   SELECT id, competition_name, competition_start_date, competition_end_date
   FROM competitions
   WHERE competition_end_date >= CURRENT_DATE
   ORDER BY competition_start_date
   LIMIT 5;
   -- Expected: [USER ACTION: Record results]

   -- Test 2: Get recent reservations
   SELECT r.id, r.status, s.studio_name, c.competition_name
   FROM reservations r
   JOIN studios s ON r.studio_id = s.id
   JOIN competitions c ON r.competition_id = c.id
   ORDER BY r.created_at DESC
   LIMIT 5;
   -- Expected: [USER ACTION: Record results]

   -- Test 3: Check for null anomalies
   SELECT
     COUNT(*) FILTER (WHERE studio_name IS NULL) AS null_studio_names,
     COUNT(*) FILTER (WHERE email IS NULL) AS null_emails
   FROM studios;
   -- Expected: 0 nulls (or match production)
   ```

#### Step 4: Test Application Connection (15 minutes)
**OPTIONAL:** Connect the CompPortal application to restored database to verify full functionality.

1. **Get restored database credentials:**
   - Test project → Settings → API
   - Copy:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Test project → Settings → Database
   - Copy:
     - `DATABASE_URL` (Pooler connection)
     - `DIRECT_URL` (Direct connection)

2. **Test locally (do NOT deploy to production):**
   ```bash
   # Create .env.local with test credentials
   cp .env.example .env.local
   # Paste test project credentials into .env.local

   # Run locally
   npm run dev

   # Test in browser: http://localhost:3000
   ```

3. **Verify critical flows work:**
   - [ ] Login with existing account
   - [ ] View competitions list
   - [ ] View dancers list
   - [ ] View reservations
   - [ ] Query loads without errors

4. **Check for errors:**
   - Console should show no database connection errors
   - All queries should return data
   - No missing tables or columns

#### Step 5: Calculate RTO and RPO (5 minutes)
**RTO (Recovery Time Objective):** Total time from "disaster" to "application restored"

```
RTO Calculation:
- Project creation: [X] minutes
- Backup restoration: [Y] minutes
- Data verification: [Z] minutes
- Environment variable updates (in real disaster): [~5] minutes
- Deployment trigger: [~3] minutes
- Total RTO: [X + Y + Z + 5 + 3] = [TOTAL] minutes
```

**Goal:** RTO < 60 minutes (1 hour)
**Actual:** `[USER ACTION: Fill after test]`

**RPO (Recovery Point Objective):** Maximum data loss window

```
RPO = Time between backups
- Daily backups: RPO = 24 hours (worst case)
- PITR enabled: RPO = 0-5 minutes (can restore to exact transaction)
```

**Current RPO:** `[USER ACTION: Fill based on backup schedule]`

#### Step 6: Document Results
Fill in the test results table:

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Project creation time | <5 min | `[Fill]` | `[✅/❌]` |
| Backup restoration time | <30 min | `[Fill]` | `[✅/❌]` |
| Total RTO | <60 min | `[Fill]` | `[✅/❌]` |
| Data integrity | 100% | `[Fill %]` | `[✅/❌]` |
| All tables restored | Yes | `[Yes/No]` | `[✅/❌]` |
| Row counts match | Yes | `[Yes/No]` | `[✅/❌]` |
| Foreign keys intact | Yes | `[Yes/No]` | `[✅/❌]` |
| Sample queries work | Yes | `[Yes/No]` | `[✅/❌]` |

**Test Date:** `[USER ACTION: Fill]`
**Tested By:** `[USER ACTION: Fill]`
**Overall Result:** `[PASS/FAIL]`

#### Step 7: Clean Up Test Project (5 minutes)
1. Navigate to test project → Settings → General
2. Scroll to "Danger Zone"
3. Click "Delete Project"
4. Type project name to confirm
5. Click "I understand, delete this project"
6. Wait for deletion confirmation

**IMPORTANT:** Always delete test projects to avoid confusion and unnecessary costs.

---

## Monitoring and Automation

### Automated Backup Monitoring Script

Create a GitHub Action or cron job to monitor backup status:

```typescript
// scripts/check-backup-status.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkBackupStatus() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Note: Supabase doesn't expose backup status via API directly
  // This would need to use Supabase Management API or manual checks

  // For now, manual check recommended
  console.log('⚠️ Manual backup verification required');
  console.log('📋 Visit: https://supabase.com/dashboard');
  console.log('✅ Verify backup < 36 hours old');
}

checkBackupStatus();
```

**Future Enhancement:** Set up Supabase webhook or use Management API to automate backup monitoring.

---

## Troubleshooting

### Issue: Backup restoration fails
**Symptoms:** Error during restore, progress stuck, or connection timeout

**Solutions:**
1. Check database size - large databases (>5GB) may take longer
2. Verify source backup is not corrupted (check status in dashboard)
3. Try restoring an older backup
4. Contact Supabase support: support@supabase.com

### Issue: Restored data doesn't match production
**Symptoms:** Row counts differ, recent data missing

**Solutions:**
1. Check backup timestamp - may be older than expected
2. Verify you selected the correct (latest) backup
3. Check RPO - data created after last backup won't be in restore
4. If PITR enabled, try restoring to more recent timestamp

### Issue: Application won't connect to restored database
**Symptoms:** Connection errors, authentication failures

**Solutions:**
1. Verify DATABASE_URL uses Pooler connection (port 6543)
2. Check SUPABASE_JWT_SECRET matches (copy from test project settings)
3. Verify ANON_KEY and SERVICE_ROLE_KEY are from test project
4. Check RLS policies are enabled (same as production)

---

## Recommendations

### ✅ Immediate Actions
1. **Run first restoration test** - Schedule 2 hours this week
2. **Document actual RTO/RPO** - Fill in test results above
3. **Enable PITR if not active** - Upgrade to Pro tier if needed

### 🔄 Ongoing Maintenance
1. **Weekly:** Check backup status (5 min)
2. **Monthly:** Review backup retention and size (15 min)
3. **Quarterly:** Full restoration test (1-2 hours)
4. **Before major competitions:** Verify backups are current

### 📈 Future Improvements
1. **Automate backup monitoring** - GitHub Action or cron job
2. **Set up Slack/email alerts** - Notify if backup fails
3. **Cross-region backup** - Store backup in different region
4. **Local backup exports** - Export critical data to S3/local storage

---

## Backup Restoration Log

Track all restoration tests here:

| Date | Tester | Backup Age | RTO (min) | Result | Notes |
|------|--------|------------|-----------|--------|-------|
| `[Fill]` | `[Fill]` | `[Fill]` | `[Fill]` | `[✅/❌]` | `[Fill]` |

---

## Emergency Contact Information

**If backups are failing or restoration is needed:**

| Contact | Purpose | Details |
|---------|---------|---------|
| Supabase Support | Backup/restore issues | support@supabase.com (24/7 for Pro tier) |
| Vercel Support | Deployment issues | support@vercel.com |
| Technical Lead | Escalation | `[USER ACTION: Fill]` |

---

## References

- [Supabase Backup Documentation](https://supabase.com/docs/guides/database/backups)
- [Supabase PITR Guide](https://supabase.com/docs/guides/database/point-in-time-recovery)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- CompPortal Disaster Recovery Runbook: `docs/operations/DISASTER_RECOVERY_RUNBOOK.md`

---

**Next Steps:**
1. User: Complete first restoration test and fill in TBD sections
2. User: Document actual RTO and RPO metrics
3. User: Schedule quarterly testing in calendar
4. Development: Automate backup monitoring (future enhancement)
