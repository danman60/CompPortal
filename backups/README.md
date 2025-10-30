# Database Backups

**Status:** ✅ Automated via GitHub Actions
**Schedule:** Daily at 3 AM UTC
**Retention:** 30 days (rolling)
**Format:** PostgreSQL SQL dump (gzip compressed)

---

## What's in This Directory

This directory contains automated database backups created by GitHub Actions.

**Files:**
- `backup_YYYYMMDD_HHMMSS.sql.gz` - Compressed SQL dump
- `backup_YYYYMMDD_HHMMSS.meta` - Backup metadata (size, date, run ID)

**Why store in Git:**
- Version control for disaster recovery
- No external storage costs
- Easy access from anywhere
- Automatic retention management

---

## How It Works

**GitHub Actions Workflow:** `.github/workflows/database-backup.yml`

1. **Runs daily** at 3 AM UTC via cron schedule
2. **Exports database** using `pg_dump` from Supabase
3. **Compresses** the backup with gzip
4. **Verifies** backup integrity (checks for tables)
5. **Commits** to this directory
6. **Cleans up** backups older than 30 days
7. **Creates GitHub Release** weekly (Sundays) for easy download

**Trigger manually:**
- Go to: https://github.com/YOUR_REPO/actions/workflows/database-backup.yml
- Click "Run workflow"
- Select branch: `main`
- Click "Run workflow"

---

## Restoring from Backup

### Quick Restore (Emergency)

```bash
# 1. Find the backup you need
cd backups
ls -lh backup_*.sql.gz

# 2. Decompress
gunzip backup_20250129_030000.sql.gz

# 3. Restore to database
# WARNING: This will overwrite your current database!
psql "$DATABASE_URL" < backup_20250129_030000.sql

# 4. Verify restoration
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM competitions;"
```

### Restore to Test Database

```bash
# 1. Create test database in Supabase
# 2. Get DATABASE_URL from test project

# 3. Restore backup
gunzip -c backup_20250129_030000.sql.gz | psql "$TEST_DATABASE_URL"

# 4. Test the restoration
psql "$TEST_DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

---

## Backup Verification

**Check backup exists:**
```bash
# Should see recent backup (within 36 hours)
ls -lht backups/backup_*.sql.gz | head -n 1
```

**Check backup size:**
```bash
# Production database should be growing over time
du -h backups/backup_*.sql.gz | tail -n 5
```

**Check backup contents:**
```bash
# Peek inside without extracting
zcat backups/backup_20250129_030000.sql.gz | head -n 50
```

---

## Monitoring

**Check backup status:**
1. Go to: https://github.com/YOUR_REPO/actions/workflows/database-backup.yml
2. Verify latest run shows green checkmark
3. If failed, click run to see error logs

**GitHub will email you if:**
- Workflow fails
- Backup integrity check fails
- pg_dump encounters errors

**To receive notifications:**
1. Go to: https://github.com/settings/notifications
2. Enable "Actions" notifications
3. Choose email or GitHub notification

---

## Troubleshooting

### "ERROR: Backup file is empty"
**Cause:** pg_dump failed or DATABASE_URL is incorrect

**Fix:**
1. Check GitHub Actions run logs
2. Verify `DATABASE_URL` secret is set correctly
3. Test manually: `pg_dump "$DATABASE_URL" --file=test.sql`

### "No changes to commit"
**Cause:** Backup identical to previous one (no data changes)

**Fix:** This is normal. If concerning, verify database is actually changing:
```sql
SELECT MAX(created_at) FROM competition_entries;
```

### "Permission denied" during restore
**Cause:** Database user lacks privileges

**Fix:**
```bash
# Use database owner credentials
psql "$DATABASE_URL" -c "ALTER DATABASE postgres OWNER TO postgres;"
```

### Backup taking too long (>15 min)
**Cause:** Database is very large

**Fix:**
1. Increase `timeout-minutes` in workflow
2. Consider excluding large tables (if applicable)
3. Use `--exclude-table-data` for specific tables

---

## Security

**Is it safe to commit backups to Git?**

✅ **Yes, if your repository is private**
- GitHub repo should be private (never public!)
- Backups contain sensitive production data
- Only authorized team members have access

❌ **No, if your repository is public**
- NEVER commit production backups to public repos
- Use GitHub Releases (private) or external storage instead

**Current repo visibility:** Check at https://github.com/YOUR_REPO/settings

---

## Alternative: Download from GitHub Releases

Every Sunday, a backup is automatically uploaded to GitHub Releases.

**Download:**
1. Go to: https://github.com/YOUR_REPO/releases
2. Find latest release tagged `backup-YYYYMMDD_HHMMSS`
3. Download `backup_YYYYMMDD_HHMMSS.sql.gz`
4. Extract and restore as shown above

**Why use Releases:**
- Easy web interface download
- No need to clone repo
- Cleaner than browsing commits

---

## Testing Backup/Restore

**Test restoration quarterly** (every 3 months):

```bash
# 1. Create test Supabase project
# 2. Get test DATABASE_URL

# 3. Restore latest backup
cd backups
LATEST=$(ls -t backup_*.sql.gz | head -n 1)
gunzip -c $LATEST | psql "$TEST_DATABASE_URL"

# 4. Verify data integrity
psql "$TEST_DATABASE_URL" -c "
  SELECT
    'competitions' AS table, COUNT(*) AS rows FROM competitions
  UNION ALL
    SELECT 'studios', COUNT(*) FROM studios
  UNION ALL
    SELECT 'dancers', COUNT(*) FROM dancers;
"

# 5. Document RTO (Recovery Time Objective)
# Record how long the process took

# 6. Delete test project when done
```

See `docs/operations/BACKUP_VERIFICATION.md` for full test procedure.

---

## Costs

**GitHub Actions:** Free (2,000 minutes/month on free tier)
**Storage:** Free (backups are small, <100MB each)
**Total Cost:** $0/month

**Compared to:**
- Supabase Pro (with backups): $25/month
- S3 storage: ~$1-5/month

---

## Future Enhancements

- [ ] Email notification on backup failure (via SendGrid)
- [ ] Slack notification with backup status
- [ ] Upload to S3 for redundancy
- [ ] Automated restoration testing
- [ ] Backup encryption at rest

---

## Emergency Contacts

**If backups are failing:**
1. Check GitHub Actions logs first
2. Verify DATABASE_URL secret is valid
3. Contact developer if unresolved

**If restoration is needed:**
1. Follow "Restoring from Backup" section above
2. Test on staging/test database first
3. Document restoration time for RTO metrics
4. Update Vercel env vars if needed

---

**Last Updated:** October 29, 2025
**Maintained By:** Technical Team
**Backup Workflow:** `.github/workflows/database-backup.yml`
