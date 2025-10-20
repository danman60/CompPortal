# Disaster Recovery Runbook

**Last Updated:** October 20, 2025
**Version:** 1.0
**Status:** 🔴 CRITICAL REFERENCE - Keep accessible during emergencies

---

## 🚨 Emergency Quick Reference

**IF YOU'RE IN AN ACTIVE INCIDENT, GO DIRECTLY TO THE RELEVANT SCENARIO:**

| Symptom | Likely Scenario | Go To |
|---------|-----------------|-------|
| "Database error" messages | [Scenario 1: Database Loss](#scenario-1-database-corruption-or-loss) | Page 1 |
| Build failed, 500 errors | [Scenario 2: Deployment Failure](#scenario-2-vercel-deployment-failure) | Page 2 |
| Can't connect to database | [Scenario 3: Supabase Outage](#scenario-3-supabase-service-outage) | Page 3 |
| Competition in progress, site down | [Scenario 4: Competition Weekend](#scenario-4-competition-weekend-outage) | Page 4 |
| Feature broken after deploy | [Scenario 5: Critical Bug](#scenario-5-critical-bug-in-production) | Page 5 |

**Key Metrics:**
- **RTO (Recovery Time Objective):** Target < 1 hour for P1 incidents
- **RPO (Recovery Point Objective):** 24 hours (daily backups) or 0-5 min (PITR)
- **Uptime SLA:** 99.9% (≈ 43 minutes downtime/month)

---

## Emergency Contacts

**CRITICAL:** Keep these contacts accessible offline (print this page).

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| **Primary On-Call** | `[USER: Fill]` | `[USER: Fill]` | `[USER: Fill]` | 24/7 |
| **Backup On-Call** | `[USER: Fill]` | `[USER: Fill]` | `[USER: Fill]` | Business hours |
| **Database Admin** | `[USER: Fill]` | `[USER: Fill]` | `[USER: Fill]` | Business hours |
| **Supabase Support** | Supabase | N/A | support@supabase.com | 24/7 (Pro tier only) |
| **Vercel Support** | Vercel | N/A | support@vercel.com | 24/7 (Pro tier only) |
| **Sentry Support** | Sentry | N/A | support@sentry.io | Business hours |

### Communication Channels
- **Incident Chat:** `[USER: Fill Slack/Discord/Teams channel]`
- **User Notifications:** Email list in 1Password → CompPortal → Emergency Contacts
- **Status Page:** https://status.compsync.net `[USER: Set up via UptimeRobot]`

---

## Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - CRITICAL** | Total outage, all users blocked | Immediate (24/7) | Database down, site unreachable |
| **P2 - HIGH** | Major feature broken, many users affected | <30 minutes | Can't create entries, login broken |
| **P3 - MEDIUM** | Minor feature broken, few users affected | <2 hours | Export button not working |
| **P4 - LOW** | Cosmetic issue, no functional impact | Next business day | UI alignment issue |

---

## Scenario 1: Database Corruption or Loss

**Severity:** 🔴 P1 - CRITICAL
**RTO:** 30-60 minutes
**RPO:** 24 hours (daily backup) or 0-5 min (PITR)

### Detection Signs
- Health endpoint returns 503: https://comp-portal-one.vercel.app/api/health
- Sentry shows "Connection terminated unexpectedly" errors
- UptimeRobot sends alert email
- Users report: "Something went wrong" or "Database error"
- Can't connect via psql or database client

### Steps to Recover

#### Step 1: Assess Damage (5 minutes)
```bash
# Try connecting to database directly
psql "$DATABASE_URL" -c "SELECT 1 AS health_check"

# If successful → Partial corruption (go to Step 2)
# If connection refused → Total loss (go to Step 3)
```

**Document findings:**
- Connection status: `[Working/Failed]`
- Error message: `[Record full error]`
- Timestamp noticed: `[Record time]`
- User impact: `[How many users affected?]`

#### Step 2: Partial Corruption Recovery (15-30 minutes)
If database is accessible but data is corrupted:

```sql
-- Check which tables have issues
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for corrupted indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Verify row counts (compare with known-good backup)
SELECT 'competitions' AS table, COUNT(*) AS rows FROM competitions
UNION ALL
SELECT 'studios', COUNT(*) FROM studios
UNION ALL
SELECT 'dancers', COUNT(*) FROM dancers;
```

**If PITR is available (Supabase Pro):**
1. Login to Supabase Dashboard
2. Navigate to Settings → Database → Point in Time Recovery
3. Select timestamp BEFORE corruption occurred
4. Click "Restore to this point"
5. Wait 5-15 minutes for PITR restoration
6. Test application health endpoint
7. If successful → Monitor for 1 hour, document incident
8. If fails → Proceed to Step 3 (full restore)

**If PITR not available:**
- Skip to Step 3 (full backup restoration)

#### Step 3: Full Database Restore (30-60 minutes)

**3.1 - Create New Supabase Project (5 minutes)**
1. Login: https://supabase.com/dashboard
2. Click "New Project"
3. Settings:
   - Organization: `[Same as production]`
   - Name: `CompPortal-Restore-[YYYY-MM-DD-HHmm]` (e.g., CompPortal-Restore-2025-10-20-1430)
   - Region: **IMPORTANT:** Use same region as production (check production settings first)
   - Password: Generate strong password → Save in 1Password immediately
   - Plan: Free (can upgrade later if needed)
4. Click "Create new project"
5. **Wait for provisioning:** ~2-5 minutes
6. **Note start time:** `[Record: HH:MM]`

**3.2 - Restore from Backup (10-30 minutes)**
1. In new project, navigate to Settings → Database → Backups
2. Look for "Restore from backup" section
3. **If available:**
   - Select production project from dropdown
   - Choose latest backup before corruption
   - Click "Restore backup to this project"
   - Confirm (this will overwrite test database)
   - Wait for completion: 10-30 minutes (dashboard shows progress)
   - **Note completion time:** `[Record: HH:MM]`

4. **If restore-from-project not available (manual method):**
   ```bash
   # In production project: Get connection string
   # Settings → Database → Connection String → Direct connection
   PROD_DB="postgresql://postgres:[password]@db.[prod-ref].supabase.co:5432/postgres"

   # Export production database (if accessible)
   pg_dump "$PROD_DB" > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

   # In new project: Get connection string
   RESTORE_DB="postgresql://postgres:[password]@db.[restore-ref].supabase.co:5432/postgres"

   # Import to new project
   psql "$RESTORE_DB" < emergency_backup_*.sql

   # Verify import
   psql "$RESTORE_DB" -c "SELECT COUNT(*) FROM competitions"
   ```

**3.3 - Verify Data Integrity (10 minutes)**
```sql
-- Connect to restored database
psql "postgresql://postgres:[password]@db.[restore-ref].supabase.co:5432/postgres"

-- Verify all tables exist
\dt

-- Check row counts (compare with backup status)
SELECT 'competitions' AS table, COUNT(*) AS rows FROM competitions
UNION ALL
SELECT 'studios', COUNT(*) FROM studios
UNION ALL
SELECT 'dancers', COUNT(*) FROM dancers
UNION ALL
SELECT 'competition_entries', COUNT(*) FROM competition_entries
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations;

-- Test critical queries
SELECT id, competition_name FROM competitions ORDER BY created_at DESC LIMIT 5;
SELECT id, studio_name FROM studios ORDER BY created_at DESC LIMIT 5;

-- Check for anomalies
SELECT COUNT(*) FROM dancers WHERE first_name IS NULL; -- Should be 0
SELECT COUNT(*) FROM reservations WHERE status IS NULL; -- Should be 0
```

**Document results:** `[Fill: Row counts, any missing data, anomalies]`

**3.4 - Update Vercel Environment Variables (5 minutes)**
1. Login to Vercel: https://vercel.com/dashboard
2. Select CompPortal project
3. Settings → Environment Variables
4. Update the following for **Production** environment:

   From restored Supabase project (Settings → API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[restore-ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[copy from new project]
   SUPABASE_SERVICE_ROLE_KEY=[copy from new project]
   SUPABASE_JWT_SECRET=[copy from Settings → API → JWT Secret]
   ```

   From restored Supabase project (Settings → Database):
   ```
   DATABASE_URL=postgresql://postgres.[restore-ref]:[password]@aws-X-us-east-Y.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   DIRECT_URL=postgresql://postgres:[password]@db.[restore-ref].supabase.co:5432/postgres?sslmode=require
   ```

5. **IMPORTANT:** Double-check all values before saving
6. Click "Save" for each variable

**3.5 - Trigger Deployment (3 minutes)**
```bash
# Option A: Vercel dashboard
# Go to Deployments → Click "Redeploy" on latest

# Option B: Git push (if dashboard unavailable)
git commit --allow-empty -m "🚨 EMERGENCY: Redeploy with restored database"
git push origin main
```

Wait for deployment: ~2-5 minutes

**3.6 - Verify Application Health (10 minutes)**
```bash
# Test health endpoint
curl https://comp-portal-one.vercel.app/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","database":"connected"}

# If health check fails:
# - Check Vercel build logs for errors
# - Verify environment variables are correct
# - Check Sentry for error details
```

**Manual testing:**
- [ ] Visit https://comp-portal-one.vercel.app
- [ ] Login with test account
- [ ] View competitions page
- [ ] View dancers page
- [ ] View reservations page
- [ ] Create test entry (if appropriate - may want to wait)
- [ ] Check Sentry dashboard for errors (should be minimal)

**3.7 - Notify Users (5 minutes)**
Send email to all Competition Directors and Studio Directors:

```
Subject: CompPortal Service Restored - Brief Downtime

Dear CompPortal Users,

We experienced a brief database issue that has now been resolved.

What happened:
- Database connectivity issue detected at [TIME]
- Backup restoration completed at [TIME]
- Total downtime: [X] minutes

Data status:
- All data restored from backup taken on [BACKUP_TIMESTAMP]
- If you created/edited data between [BACKUP_TIME] and [INCIDENT_TIME], it may not be present
- Please verify your recent entries and contact support if anything is missing

Current status:
✅ All systems operational
✅ Full functionality restored
✅ Monitoring in place to prevent recurrence

We apologize for any inconvenience. If you have any questions or notice any issues, please contact support@compsync.net immediately.

Thank you for your patience.

- CompPortal Team
```

**3.8 - Post-Recovery Monitoring (30 minutes)**
- [ ] Watch Sentry error rate (should stabilize to normal levels within 15 min)
- [ ] Check UptimeRobot status (should be green)
- [ ] Monitor /api/health endpoint every 5 minutes for 30 minutes
- [ ] Watch for user reports in support channel
- [ ] Check database connection pool usage in Supabase dashboard

**3.9 - Update Incident Log**
Document in `docs/incidents/[YYYY-MM-DD]-database-restoration.md`:
- **Incident start:** `[Time]`
- **Detection method:** `[How did we find out?]`
- **Root cause:** `[What caused the corruption/loss?]`
- **Recovery start:** `[Time]`
- **Recovery complete:** `[Time]`
- **Total downtime:** `[Minutes]`
- **Data loss window:** `[Time range of lost data]`
- **Actions taken:** `[List each step]`
- **Follow-up actions:** `[What will prevent this in future?]`

#### Step 4: Plan Decommissioning of Old Database (After 24 hours)
Once verified stable for 24 hours:
- [ ] Archive old (corrupted) database project (don't delete immediately)
- [ ] Export any data not in backup (if accessible)
- [ ] Update documentation with new project reference
- [ ] After 7 days of stability: Delete old project

---

## Scenario 2: Vercel Deployment Failure

**Severity:** 🟡 P2 - HIGH
**RTO:** 5-30 minutes
**RPO:** Last successful commit

### Detection Signs
- Build fails in Vercel dashboard (red X)
- Email notification from Vercel: "Deployment failed"
- Users see error page or old version of site
- UptimeRobot alerts (if health check fails)
- Sentry shows sudden drop in traffic

### Steps to Recover

#### Step 1: Check Build Logs (5 minutes)
1. Login to Vercel: https://vercel.com/dashboard
2. Navigate to CompPortal project → Deployments
3. Click on failed deployment (red X)
4. Review build logs - scroll to first error

**Common error patterns:**
```
TypeScript error:
❌ Type error: Property 'xyz' does not exist on type 'ABC'
→ Fix: Correct type definition, push fix

Missing environment variable:
❌ Error: NEXT_PUBLIC_SUPABASE_URL is not defined
→ Fix: Add env var in Vercel settings

Dependency issue:
❌ Cannot find module 'package-name'
→ Fix: Run `npm install`, commit lock file

Out of memory:
❌ FATAL ERROR: Reached heap limit
→ Fix: Add to vercel.json: "builds": [{"config": {"maxLambdaSize": "10mb"}}]
```

**Document the error:** `[Record error message]`

#### Step 2: Quick Rollback (2 minutes)
**If error is not immediately fixable, rollback:**

1. Vercel dashboard → Deployments
2. Find last successful deployment (green ✅)
3. Click "..." menu → "Promote to Production"
4. Confirm promotion
5. Wait 1-2 minutes for activation
6. Verify: https://comp-portal-one.vercel.app

**Site should now be back online** (using previous version)

#### Step 3: Fix Root Cause (Varies: 10-60 minutes)
```bash
# Pull latest code
git pull origin main

# Try building locally
npm run build

# If build fails locally:
# - Read error message carefully
# - Fix the issue (TypeScript errors, missing imports, etc.)
# - Test build again: npm run build
# - Once successful, commit and push

git add .
git commit -m "fix: [describe the fix]"
git push origin main

# Vercel will auto-deploy - monitor dashboard
```

**If fix requires testing:**
```bash
# Create preview deployment first
git checkout -b fix/deployment-issue
# Make fixes
git push origin fix/deployment-issue
# Test preview URL: https://compportal-[branch-hash].vercel.app
# If works, merge to main:
git checkout main
git merge fix/deployment-issue
git push origin main
```

#### Step 4: Monitor Deployment (5 minutes)
- [ ] Watch Vercel build logs in real-time
- [ ] Verify build completes successfully (green ✅)
- [ ] Test production URL immediately after deploy
- [ ] Check Sentry for any new errors
- [ ] Verify critical pages load: /, /login, /dashboard

#### Step 5: Post-Incident Actions
- [ ] Document what caused the build failure
- [ ] Add pre-commit hook or CI check to prevent recurrence
- [ ] Review deploy process - can we catch these errors earlier?
- [ ] Update runbook with any new troubleshooting steps

---

## Scenario 3: Supabase Service Outage

**Severity:** 🔴 P1 - CRITICAL
**RTO:** <1 hour (wait for Supabase) or 2-4 hours (migration)
**RPO:** 0 minutes (if migrating with latest backup)

### Detection Signs
- Health endpoint returns 503
- All database queries fail with connection timeout
- Supabase status page shows incident: https://status.supabase.com
- UptimeRobot alerts
- Sentry shows spike in "Connection refused" errors

### Steps to Respond

#### Step 1: Verify It's a Supabase Outage (2 minutes)
```bash
# Try connecting directly to database
psql "$DATABASE_URL" -c "SELECT 1"

# Check Supabase status page
curl https://status.supabase.com | grep -i "operational"

# Check if other Supabase services are affected
curl https://[project-ref].supabase.co/rest/v1/ -I
```

**Signs it's a Supabase outage:**
- Supabase status page shows incident
- Can't connect to database from multiple locations
- Other Supabase projects also affected

**Signs it's OUR issue (not Supabase outage):**
- Supabase status page says "Operational"
- Can connect from other tools (psql, TablePlus)
- Only our application is affected
- → Go to Scenario 1 or 2 instead

#### Step 2: Business Impact Assessment (5 minutes)
**Critical questions:**
- Is a competition happening RIGHT NOW?
  - YES → HIGH URGENCY (consider migration)
  - NO → MEDIUM URGENCY (wait for Supabase)

- What's the incident status on Supabase status page?
  - "Investigating" + No ETA → Consider migration if >1 hour
  - "Identified" + Fix in progress + ETA <1 hour → Wait
  - "Monitoring" + Fix deployed → Wait and monitor

**Document decision:** `[Wait / Migrate - Reason: ________]`

#### Step 3A: If Waiting for Supabase (Monitor every 15 min)
1. **Update status page immediately:**
   - Go to UptimeRobot status page
   - Post update: "Experiencing database connectivity issues due to upstream provider. Monitoring situation. ETA: [check Supabase status]"

2. **Notify users proactively:**
   ```
   Subject: CompPortal Temporary Outage - Database Provider Issue

   We are currently experiencing connectivity issues due to our database provider (Supabase) experiencing an outage.

   Status: Monitoring upstream provider
   ETA: [Copy from Supabase status page]
   Impact: All features unavailable temporarily

   We are monitoring the situation and will provide updates every 30 minutes.

   For urgent questions during this time, please contact [emergency phone].

   We apologize for the inconvenience.
   ```

3. **Monitor progress:**
   - Check https://status.supabase.com every 15 minutes
   - Test database connection every 15 minutes
   - Be ready to notify users when service is restored

4. **When service restored:**
   - Test all critical flows immediately
   - Notify users: "Service restored"
   - Monitor Sentry for 1 hour for any lingering issues
   - Document incident

#### Step 3B: If Migrating to Backup Provider (LAST RESORT - 2-4 hours)
**⚠️ WARNING: Only do this for P1 incidents during active competitions**

**Option A: Migrate to Neon (Fastest - ~2 hours)**
1. Signup: https://neon.tech (generous free tier)
2. Create new project → Select same region as production
3. Get latest SQL backup:
   ```bash
   # If Supabase is partially accessible:
   pg_dump "$DIRECT_URL" > emergency_migration_$(date +%Y%m%d).sql

   # If completely down: Use latest backup file from regular backups
   ```
4. Import to Neon:
   ```bash
   # Get Neon connection string from dashboard
   NEON_DB="postgresql://[user]:[password]@[endpoint].neon.tech/[database]"
   psql "$NEON_DB" < emergency_migration_*.sql
   ```
5. Update Vercel environment variables with Neon credentials
6. Redeploy application
7. Test thoroughly
8. **REVERT when Supabase is back** (Neon is emergency only)

**Option B: Self-hosted PostgreSQL on Render/Railway (~3-4 hours)**
Similar process but more configuration required.

**Migration Checklist:**
- [ ] Export latest data (if possible)
- [ ] Provision new database
- [ ] Import data
- [ ] Update all environment variables
- [ ] Test connection locally first
- [ ] Deploy to production
- [ ] Verify all features work
- [ ] Monitor closely
- [ ] Plan reversion to Supabase when restored

---

## Scenario 4: Competition Weekend Outage

**Severity:** 🔴🔴 P1 - CRITICAL (Business-threatening)
**RTO:** 5 minutes (offline mode) or 30 minutes (full recovery)
**RPO:** 0 minutes (local backups used)

### Detection Signs
- **During active competition:**
  - Judges can't submit scores
  - Scoreboard not updating
  - Competition Director can't access control panel
  - Parents can't view results

### Context
Competition weekends are HIGHEST PRIORITY incidents because:
- Dozens of paying customers (Studio Directors) are present
- Hundreds of dancers and parents are affected
- Real-time scoring is expected
- Brand reputation is at stake
- Alternative solutions (offline mode) are built-in

### Immediate Response (0-5 minutes)

#### Step 1: Activate Offline Mode Immediately
**DO NOT WAIT TO DIAGNOSE - ACTIVATE OFFLINE MODE FIRST**

1. **Announce to all judges:**
   - "System connectivity issue detected"
   - "Continue scoring - your tablets will queue scores locally"
   - "Do not refresh or close browser"
   - "Scores will auto-sync when connection restored"

2. **Verify offline mode is working:**
   - PWA (Progressive Web App) should be installed on all tablets
   - IndexedDB stores scores locally when offline
   - Check one tablet: Open DevTools → Application → IndexedDB → Check for queued scores

3. **Competition Director actions:**
   - Export current scores to CSV (if possible before full outage)
   - Have USB keys ready to collect scored entries from each judge
   - Continue competition normally - scoring can happen offline

**Offline mode means: Competition can continue without internet. Zero impact to dancers/parents.**

### Parallel: Fix Production (5-30 minutes)

While competition continues offline, technical team fixes production:

1. **Diagnose the issue:**
   - Check health endpoint
   - Check Sentry errors
   - Check Vercel deployment status
   - Check Supabase status

2. **Follow appropriate scenario:**
   - Database issue → Scenario 1
   - Deployment issue → Scenario 2
   - Supabase outage → Scenario 3
   - Application bug → Scenario 5

3. **Communicate with on-site team:**
   - Use phone/SMS (not Slack if WiFi is down)
   - Update every 10 minutes with progress
   - Give realistic ETAs

### Restore Connection (5-10 minutes)

Once production is restored:

1. **Verify production health thoroughly:**
   ```bash
   # Health check
   curl https://comp-portal-one.vercel.app/api/health

   # Test score submission endpoint specifically
   curl -X POST https://comp-portal-one.vercel.app/api/trpc/scores.submit \
     -H "Authorization: Bearer [test-token]" \
     -d '{"test":true}'
   ```

2. **Tell judges to reconnect (one tablet first):**
   - "System is restored"
   - "Please ensure you have internet connection"
   - "Your queued scores will auto-sync now"
   - Test ONE tablet first before announcing to all

3. **Monitor sync process:**
   - Watch Sentry for sync errors
   - Verify scores appear in database
   - Check for duplicate submissions (should be prevented by deduplication)

4. **Verify all scores uploaded:**
   ```sql
   -- Check recent scores
   SELECT COUNT(*) FROM scores WHERE created_at > NOW() - INTERVAL '1 hour';

   -- Compare with expected count (judges × routines)
   ```

### Post-Outage Verification (30 minutes)

- [ ] Export final results from database
- [ ] Compare with manual CSV backups from judges
- [ ] Verify awards calculated correctly
- [ ] Archive all data (database + local backups)
- [ ] Test scoreboard display for parents
- [ ] Send "Thank you for your patience" message to studio directors

### Incident Post-Mortem (After competition)

- [ ] Full timeline documentation
- [ ] Root cause analysis
- [ ] Compensation discussion (if applicable)
- [ ] Update offline mode documentation
- [ ] Test offline→online sync with larger dataset
- [ ] Review pre-competition checklist - did we miss something?

### Prevention for Next Competition

- [ ] Run pre-competition checklist (see below) 1 week before
- [ ] Test judge tablets offline mode
- [ ] Export all competition data to USB backup before event
- [ ] Have technical contact on-call during competition hours
- [ ] Set up mobile hotspot as backup internet

---

## Scenario 5: Critical Bug in Production

**Severity:** 🟡 P2 - HIGH (can escalate to P1)
**RTO:** 5 minutes (rollback) or 30 minutes (hotfix)
**RPO:** Last deployment

### Detection Signs
- Sentry shows spike in errors (10+ errors in 5 minutes)
- Users report specific feature is broken
- UptimeRobot shows degraded performance (but site is up)
- Critical feature not working:
  - Can't create entries
  - Can't submit reservations
  - Login broken
  - Payments failing

### Response Steps

#### Step 1: Assess Severity (2 minutes)
**P1 (Immediate rollback):**
- Can't login (all users blocked)
- Database connection errors
- Entire site down (500 errors)

**P2 (Can fix with hotfix):**
- Can't create entries (major feature broken)
- Can't submit scores (judges affected)
- CSV import failing

**P3 (Can wait):**
- Export button not working
- UI display issue
- Email notifications delayed

**Document:** `[Severity level] - [Impact description]`

#### Step 2: Immediate Mitigation

**For P1: Rollback immediately (5 minutes)**
1. Vercel dashboard → Deployments
2. Find last known-good deployment (green ✅)
3. Click "..." → "Promote to Production"
4. Verify site is functional again
5. Then work on fix (Step 3)

**For P2: Decide rollback vs hotfix**
- Can you fix in < 30 minutes? → Hotfix
- Fix will take > 30 minutes? → Rollback first, fix later

**For P3: No rollback needed**
- Fix and deploy during next release window

#### Step 3: Develop Hotfix (10-30 minutes)

```bash
# Create hotfix branch from last good commit
git checkout main
git pull

# Find last good commit (before the bug)
git log --oneline -10
# Find the commit that introduced the bug, use commit BEFORE it

git checkout -b hotfix/[bug-description] [last-good-commit-hash]

# Make minimal fix (do NOT refactor or add features)
# Test locally: npm run build && npm run start

# Commit fix
git add .
git commit -m "hotfix: [describe the bug fix]"

# Push to preview environment first
git push origin hotfix/[bug-description]

# Test preview URL thoroughly: https://compportal-[hash].vercel.app
# Verify fix works AND no new bugs introduced

# If preview works, merge to main
git checkout main
git merge hotfix/[bug-description]
git push origin main
```

#### Step 4: Monitor Deployment (5 minutes)
- [ ] Watch Vercel build logs
- [ ] Verify deployment succeeds
- [ ] Test production URL immediately
- [ ] Check Sentry - error rate should drop to normal
- [ ] Test the specific feature that was broken
- [ ] Test adjacent features (make sure fix didn't break anything)

#### Step 5: Post-Incident

- [ ] Update incident log
- [ ] Write post-mortem: What caused the bug? How did it get to production?
- [ ] Add test coverage for this bug
- [ ] Review deploy process - should this have been caught in review?
- [ ] Consider: Do we need staging environment testing?

---

## Pre-Competition Checklist

**Run this checklist 1 week before any major competition.**

### System Health (30 minutes)

- [ ] **Verify backups are current**
  - Login to Supabase → Settings → Database → Backups
  - Latest backup < 24 hours old: ✅ / ❌
  - Backup status: Success ✅ / Failed ❌
  - If failed: Investigate immediately

- [ ] **Test backup restoration**
  - Last test date: `[Fill]`
  - If > 90 days ago: Run full restoration test (see BACKUP_VERIFICATION.md)
  - Document RTO: `[Minutes]`

- [ ] **Check monitoring systems**
  - UptimeRobot: 99.9%+ uptime ✅ / ❌
  - Sentry: <10 errors/day ✅ / ❌
  - Health endpoint: https://comp-portal-one.vercel.app/api/health → 200 OK ✅ / ❌

- [ ] **Verify environment variables**
  - All required variables set in Vercel: ✅ / ❌
  - No "undefined" errors in Sentry: ✅ / ❌

- [ ] **Check database capacity**
  - Supabase dashboard → Settings → Usage
  - Database size: `[XX GB / YY GB]`
  - Connections: `[XX / 60 pooler connections]`
  - Plenty of headroom: ✅ / ❌

### Application Testing (45 minutes)

- [ ] **Test critical flows**
  - [ ] Login (all roles: SA, CD, SD, Judge)
  - [ ] Create competition
  - [ ] Create studio
  - [ ] Register dancer
  - [ ] Create entry
  - [ ] Submit reservation
  - [ ] Approve reservation (CD)
  - [ ] Submit score (Judge tablet)
  - [ ] View scoreboard
  - [ ] Calculate awards

- [ ] **Test judge tablets specifically**
  - [ ] PWA installed on all tablets
  - [ ] Offline mode works (disable WiFi, submit score, re-enable WiFi, verify sync)
  - [ ] All tablets charged and ready
  - [ ] Backup chargers available

- [ ] **Test data export**
  - [ ] Export competition data to CSV
  - [ ] Verify CSV contains all expected data
  - [ ] Save CSV to USB backup drive
  - [ ] Test CSV import (restore from backup)

### Communication & Documentation (15 minutes)

- [ ] **Review this runbook**
  - All contact info up to date: ✅ / ❌
  - All links working: ✅ / ❌
  - Print emergency contact card: ✅ / ❌

- [ ] **Update status page**
  - UptimeRobot status page URL: `[Fill]`
  - Share with studio directors: ✅ / ❌

- [ ] **Prepare email templates**
  - "System restored" template ready: ✅ / ❌
  - "Brief downtime" template ready: ✅ / ❌
  - Support email monitored: ✅ / ❌

### On-Call & Escalation (10 minutes)

- [ ] **Confirm on-call schedule**
  - Primary on-call: `[Name]` - Confirmed: ✅ / ❌
  - Backup on-call: `[Name]` - Confirmed: ✅ / ❌
  - Phone numbers tested: ✅ / ❌

- [ ] **Test escalation**
  - Can reach Supabase support (if Pro tier): ✅ / ❌
  - Can reach Vercel support (if Pro tier): ✅ / ❌
  - Local backups accessible offline: ✅ / ❌

### Offline Contingency (15 minutes)

- [ ] **USB backup prepared**
  - All competition data exported: ✅ / ❌
  - Stored on USB drive: ✅ / ❌
  - USB drive tested (can read files): ✅ / ❌

- [ ] **Manual process documented**
  - Paper backup of judge assignments: ✅ / ❌
  - Manual scoring sheets (if needed): ✅ / ❌
  - Award calculation spreadsheet: ✅ / ❌

**Checklist completed by:** `[Name]`
**Date:** `[YYYY-MM-DD]`
**Competition:** `[Competition name]`
**Overall status:** ✅ Ready / ⚠️ Issues found / ❌ Not ready

---

## Post-Incident Checklist

**Run this after ANY incident (P1, P2, or P3).**

- [ ] **Document timeline**
  - Incident detected: `[Time]`
  - Response initiated: `[Time]`
  - Service restored: `[Time]`
  - Total downtime: `[Minutes]`

- [ ] **Identify root cause**
  - What caused the incident? `[Fill]`
  - Was it preventable? Yes / No
  - If yes, how? `[Fill]`

- [ ] **Document workarounds used**
  - Temporary fixes applied: `[List]`
  - Rollbacks performed: `[List]`
  - Manual interventions: `[List]`

- [ ] **Document resolution**
  - Final fix applied: `[Describe]`
  - Verification steps: `[List]`
  - Confidence level: High / Medium / Low

- [ ] **Calculate impact**
  - Users affected: `[Number or percentage]`
  - Data lost: `[Time range or amount]`
  - Financial impact: `[If applicable]`

- [ ] **Notify affected users**
  - Email sent: ✅ / ❌
  - Explanation provided: ✅ / ❌
  - Apology given: ✅ / ❌
  - Compensation discussed (if applicable): ✅ / ❌

- [ ] **Update runbook**
  - New scenario added: ✅ / ❌
  - Existing scenario updated: ✅ / ❌
  - New troubleshooting steps: ✅ / ❌

- [ ] **Schedule post-mortem meeting**
  - Date: `[YYYY-MM-DD]`
  - Attendees: `[List]`
  - Agenda: Review timeline, root cause, preventive measures

- [ ] **Implement preventive measures**
  - Action item 1: `[Fill]` - Owner: `[Name]` - Due: `[Date]`
  - Action item 2: `[Fill]` - Owner: `[Name]` - Due: `[Date]`
  - Action item 3: `[Fill]` - Owner: `[Name]` - Due: `[Date]`

---

## Key Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **RTO** (Recovery Time Objective) | <1 hour | `[TBD after first test]` | ⏸️ |
| **RPO** (Recovery Point Objective) | <24 hours | `[Daily backups = 24h]` | ✅ |
| **MTTR** (Mean Time To Resolve) | <1 hour (P1) | `[Track incidents]` | ⏸️ |
| **MTTD** (Mean Time To Detect) | <5 minutes | `[With monitoring]` | ✅ |
| **Uptime SLA** | 99.9% | `[Track in UptimeRobot]` | ⏸️ |

---

## Testing Schedule

| Test Type | Frequency | Last Completed | Next Due | Owner |
|-----------|-----------|----------------|----------|-------|
| Backup restoration | Quarterly | `[USER: Fill]` | `[USER: Fill]` | `[USER: Fill]` |
| Runbook review | Monthly | `[USER: Fill]` | `[USER: Fill]` | `[USER: Fill]` |
| Pre-competition checklist | Before each competition | `[USER: Fill]` | `[USER: Fill]` | `[USER: Fill]` |
| DR drill (simulated outage) | Annually | `[USER: Fill]` | `[USER: Fill]` | `[USER: Fill]` |

---

## References

- **Backup Verification:** `docs/operations/BACKUP_VERIFICATION.md`
- **Monitoring Guide:** `docs/operations/MONITORING.md`
- **Error Tracking:** `docs/operations/ERROR_TRACKING.md`
- **Supabase Status:** https://status.supabase.com
- **Vercel Status:** https://www.vercel-status.com
- **Sentry Dashboard:** https://sentry.io/organizations/[org]/issues/

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-20 | Initial runbook created | Claude Code |
| | | | |

---

**🚨 EMERGENCY QUICK REFERENCE - PRINT THIS PAGE 🚨**

| What's Broken | First Action | Scenario |
|---------------|--------------|----------|
| "Database error" | Check Supabase dashboard | [Scenario 1](#scenario-1-database-corruption-or-loss) |
| Build failed | Rollback in Vercel | [Scenario 2](#scenario-2-vercel-deployment-failure) |
| Can't connect to DB | Check https://status.supabase.com | [Scenario 3](#scenario-3-supabase-service-outage) |
| Competition is live, site down | Activate offline mode NOW | [Scenario 4](#scenario-4-competition-weekend-outage) |
| Feature broken after deploy | Check Sentry, consider rollback | [Scenario 5](#scenario-5-critical-bug-in-production) |

**Emergency Contacts:** See page 1
**Health Check:** https://comp-portal-one.vercel.app/api/health
**Vercel Dashboard:** https://vercel.com/dashboard
**Supabase Dashboard:** https://supabase.com/dashboard
**Sentry Dashboard:** https://sentry.io

---

*This runbook is a living document. Update it after every incident. Your future self will thank you.*
