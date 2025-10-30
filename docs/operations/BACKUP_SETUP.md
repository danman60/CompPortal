# Database Backup Setup Guide

**Purpose:** Configure automated daily database backups via GitHub Actions
**Time Required:** 5 minutes
**Cost:** $0 (uses free GitHub Actions)

---

## Prerequisites

- [x] GitHub repository exists
- [x] Repository is **PRIVATE** (backups contain sensitive data)
- [x] You have admin access to the repository
- [x] Supabase database connection string available

---

## Setup Steps

### Step 1: Get Supabase Connection String (2 minutes)

1. **Login to Supabase:**
   - Go to: https://supabase.com/dashboard
   - Select your **CompPortal production project**

2. **Navigate to Database Settings:**
   - Click **Settings** (gear icon in left sidebar)
   - Click **Database**

3. **Copy Connection String:**
   - Scroll to "Connection string" section
   - Select **Connection pooling** tab
   - Mode: **Transaction**
   - **Copy the full connection string**

   Example format:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

4. **Important:** This string contains your database password. Keep it secure!

---

### Step 2: Add GitHub Secret (2 minutes)

1. **Go to Repository Settings:**
   - Navigate to: https://github.com/YOUR_USERNAME/CompPortal/settings/secrets/actions
   - Or: Your repo → Settings → Secrets and variables → Actions

2. **Create New Secret:**
   - Click **"New repository secret"**

3. **Configure Secret:**
   - **Name:** `DATABASE_URL` (exactly this, case-sensitive)
   - **Value:** Paste the connection string from Step 1
   - Click **"Add secret"**

4. **Verify:**
   - You should see `DATABASE_URL` in your secrets list
   - The value will be hidden (shows as `***`)

---

### Step 3: Enable GitHub Actions (1 minute)

1. **Go to Actions Tab:**
   - Navigate to: https://github.com/YOUR_USERNAME/CompPortal/actions

2. **Enable Workflows (if prompted):**
   - If you see "Workflows aren't being run on this repository"
   - Click **"I understand my workflows, go ahead and enable them"**

3. **Verify Workflow Appears:**
   - You should see "Database Backup" workflow listed
   - Status: Ready to run

---

### Step 4: Test Manual Backup (2 minutes)

**Run your first backup manually to verify everything works:**

1. **Navigate to Workflow:**
   - Go to: https://github.com/YOUR_USERNAME/CompPortal/actions/workflows/database-backup.yml

2. **Trigger Workflow:**
   - Click **"Run workflow"** button (top right)
   - Branch: `main` (should be selected)
   - Click green **"Run workflow"** button

3. **Monitor Progress:**
   - Click on the workflow run (appears in list)
   - Watch the steps execute in real-time
   - Should complete in 2-5 minutes

4. **Verify Success:**
   - All steps show green checkmarks ✅
   - Check "Create database backup" step for backup size
   - Look for: "✅ Backup contains XX tables"

5. **Check Backup File:**
   - Go to: https://github.com/YOUR_USERNAME/CompPortal/tree/main/backups
   - You should see:
     - `backup_YYYYMMDD_HHMMSS.sql.gz` (compressed backup)
     - `backup_YYYYMMDD_HHMMSS.meta` (metadata file)

---

## Verification Checklist

After setup, verify these items:

- [ ] `DATABASE_URL` secret exists in GitHub repo settings
- [ ] GitHub Actions are enabled for the repository
- [ ] "Database Backup" workflow appears in Actions tab
- [ ] Manual test run completed successfully (all green checkmarks)
- [ ] Backup file exists in `backups/` directory
- [ ] Backup size is reasonable (check `.meta` file)
- [ ] No errors in workflow logs

---

## Automated Schedule

Once setup is complete, backups run automatically:

**Schedule:**
- **Frequency:** Daily
- **Time:** 3:00 AM UTC
  - 11:00 PM EST (Eastern)
  - 8:00 PM PST (Pacific)
  - 7:00 PM MST (Mountain)
- **Retention:** 30 days (older backups automatically deleted)

**Weekly Releases:**
- Every **Sunday** at 3:00 AM UTC
- Backup uploaded to GitHub Releases
- Easy download via web interface

**To check upcoming runs:**
- Go to Actions → Database Backup → "Next scheduled run"

---

## Monitoring

### Get Notified on Failures

**Email Notifications:**
1. Go to: https://github.com/settings/notifications
2. Scroll to "Actions"
3. Enable: ✅ **"Email me when a workflow fails"**
4. Save changes

**Check Manually (Weekly):**
1. Visit: https://github.com/YOUR_USERNAME/CompPortal/actions/workflows/database-backup.yml
2. Verify latest run shows green checkmark
3. Check run date is within last 36 hours

---

## Troubleshooting

### Issue: "Error: Secrets `DATABASE_URL` not found"

**Cause:** Secret not configured or named incorrectly

**Fix:**
1. Go to repo → Settings → Secrets and variables → Actions
2. Verify secret name is exactly `DATABASE_URL` (case-sensitive)
3. Re-create secret if needed

---

### Issue: "connection to server at '...' failed"

**Cause:** DATABASE_URL is incorrect or Supabase credentials changed

**Fix:**
1. Get fresh connection string from Supabase dashboard
2. Verify you copied the **Connection pooling** URL (port 6543)
3. Check database password is correct
4. Update `DATABASE_URL` secret in GitHub

---

### Issue: "pg_dump: error: could not connect to database"

**Cause:** Connection string format issue

**Fix:**
Ensure connection string format is:
```
postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Common mistakes:**
- Using direct connection (port 5432) instead of pooler (port 6543)
- Missing `postgres.` prefix in hostname
- Special characters in password not URL-encoded

---

### Issue: Backup file is empty or very small

**Cause:** Database has no data OR permissions issue

**Fix:**
1. Verify database actually has data:
   ```sql
   SELECT COUNT(*) FROM competitions;
   ```
2. Check connection string uses correct role (should be `postgres`)
3. Review workflow logs for specific error messages

---

### Issue: "Workflow not running on schedule"

**Cause:** GitHub Actions disabled or cron syntax error

**Fix:**
1. Check repo → Settings → Actions → General
2. Verify "Allow all actions and reusable workflows" is selected
3. Verify workflow file syntax is correct (YAML formatting)

---

## Testing Restoration

**It's critical to test restoration BEFORE you need it in an emergency.**

See detailed procedure: `docs/operations/BACKUP_VERIFICATION.md`

**Quick test:**
```bash
# 1. Get latest backup
cd backups
LATEST=$(ls -t backup_*.sql.gz | head -n 1)
echo "Testing backup: $LATEST"

# 2. Create test database in Supabase (don't use production!)
# 3. Restore to test database
gunzip -c $LATEST | psql "$TEST_DATABASE_URL"

# 4. Verify data
psql "$TEST_DATABASE_URL" -c "SELECT COUNT(*) FROM competitions;"
```

**Record RTO (Recovery Time Objective):**
- How long did restoration take?
- Document in `docs/operations/BACKUP_VERIFICATION.md`

---

## Security Considerations

### ✅ Safe Practices

- Repository is **private** (never public)
- `DATABASE_URL` stored as GitHub Secret (encrypted)
- Backup files in private repo (only authorized access)
- Connection string uses least-privilege role

### ⚠️ Security Checklist

- [ ] Repository visibility is PRIVATE
- [ ] `DATABASE_URL` secret is not exposed in logs
- [ ] Backup files never committed to public repos
- [ ] Team members with repo access are trusted
- [ ] Supabase connection uses strong password

### 🔒 Additional Hardening (Optional)

**Encrypt backups at rest:**
```bash
# Modify workflow to encrypt before commit
gpg --symmetric --cipher-algo AES256 backup.sql
# Store GPG passphrase as GitHub Secret
```

**Use read-only database user:**
```sql
-- Create read-only user for backups
CREATE USER backup_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE postgres TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

---

## Cost Analysis

**GitHub Actions (Free Tier):**
- 2,000 minutes/month included
- Backup runs: ~5 min/day = 150 min/month
- **Usage: 7.5% of free quota**
- **Cost: $0/month**

**Storage:**
- Backup size: ~10-50 MB compressed
- 30 days retention: ~300-1500 MB total
- GitHub repo storage: Free (up to 1 GB)
- **Cost: $0/month**

**Compared to Alternatives:**
- Supabase Pro (includes backups): $25/month
- AWS S3 storage: ~$1-3/month
- **GitHub Actions: FREE ✅**

---

## Alternative: Manual Backup

If GitHub Actions fails or you need immediate backup:

```bash
# 1. Get Supabase connection string (same as Step 1 above)
export DATABASE_URL="postgresql://..."

# 2. Run pg_dump locally
pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --format=plain \
  --file=manual_backup_$(date +%Y%m%d).sql

# 3. Compress
gzip manual_backup_*.sql

# 4. Store securely (external drive, encrypted cloud, etc.)
```

---

## Next Steps

After successful setup:

1. ✅ **Mark P0 task complete:** Backups are now automated
2. 📅 **Schedule quarterly restoration test** (calendar reminder)
3. 📧 **Enable GitHub Actions failure notifications**
4. 📊 **Document RTO/RPO** after first restoration test
5. 🔄 **Monitor first week** of automated runs

---

## Support

**If you encounter issues:**

1. **Check workflow logs:**
   - Actions → Database Backup → Click failed run
   - Review error messages in each step

2. **Common fixes:**
   - Verify `DATABASE_URL` secret is correct
   - Ensure repository is private
   - Check Supabase database is accessible

3. **Still stuck?**
   - Open GitHub issue with workflow logs
   - Contact technical lead
   - Reference this document

---

**Setup Status:** ⏸️ User Action Required
**Document Status:** ✅ Complete
**Last Updated:** October 29, 2025
