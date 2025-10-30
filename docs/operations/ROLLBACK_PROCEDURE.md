# Rollback Procedure

**Purpose:** Quick reference for reverting failed deployments
**Audience:** Competition Director (emergency), Developer (normal)
**Last Updated:** October 29, 2025

---

## When to Rollback

**Immediate rollback if:**
- ✅ Deployment causes 500 errors on critical pages (login, dashboard, entries)
- ✅ Data integrity issue detected (cross-tenant leak, missing data)
- ✅ Authentication system broken (users can't log in)
- ✅ Payment processing fails
- ✅ Build succeeds but app doesn't load

**Don't rollback for:**
- ❌ Minor UI issues (typos, styling)
- ❌ Non-critical page errors (help pages, static content)
- ❌ Performance degradation (unless severe)

---

## Emergency Rollback (5 minutes)

### Via Vercel Dashboard (No Command Line Required)

**Step 1: Access Deployments**
1. Go to https://vercel.com/YOUR_ORG/compportal/deployments
2. You'll see list of recent deployments with timestamps

**Step 2: Identify Last Good Deployment**
- Look for deployment BEFORE the broken one
- Check "Status: Ready" (green checkmark)
- Note the commit hash (e.g., `df42afb`)

**Step 3: Promote Previous Deployment**
1. Click on the last good deployment
2. Click "⋮" (three dots menu) in top right
3. Click "Promote to Production"
4. Confirm the promotion

**Step 4: Verify Rollback**
1. Wait 30 seconds for DNS propagation
2. Open https://www.compsync.net in incognito mode
3. Check footer shows old commit hash
4. Test critical flow (login → dashboard)

**Total Time: ~2 minutes**

---

## Standard Rollback (Git Revert)

### When to Use
- When you need to permanently undo changes
- When multiple deployments need to be rolled back
- When hotfix is required on top of rollback

### Steps

**1. Identify Bad Commit**
```bash
cd CompPortal
git log --oneline -10
```

Example output:
```
c87e2e8 feat: add Sentry test pages
df42afb chore: trigger redeploy with Sentry env vars
8933fdd fix: validation bugs
b7c77ac feat: new feature that broke things  ← BAD COMMIT
a218733 fix: previous stable version
```

**2. Revert the Commit**
```bash
# Option A: Revert single commit (creates new commit that undoes changes)
git revert b7c77ac --no-edit

# Option B: Revert multiple commits (if last 3 deployments are bad)
git revert --no-edit HEAD~2..HEAD

# Option C: Hard reset (DANGER: loses commits permanently)
# Only use if you're CERTAIN you want to delete work
git reset --hard a218733  # Go back to stable version
git push --force  # REQUIRES --force, be careful!
```

**3. Push and Deploy**
```bash
# For revert (safe):
git push

# For hard reset (dangerous):
git push --force  # Only if you used git reset --hard
```

**4. Verify Deploy**
- Check https://vercel.com/deployments for new deployment
- Wait for "Ready" status (~2 minutes)
- Test in incognito: https://www.compsync.net
- Check footer commit hash matches reverted state

---

## Database Rollback

### When Database Migration Goes Wrong

**CRITICAL:** Database rollbacks are HIGH RISK. Consult developer before proceeding.

**Scenario 1: Migration Added Column (Safe to Rollback)**
```sql
-- If migration added a column you don't need:
ALTER TABLE table_name DROP COLUMN column_name;
```

**Scenario 2: Migration Deleted Column (DATA LOSS RISK)**
```
⚠️ STOP: Cannot rollback deleted column without backup
Action: Restore from Supabase daily backup
Time: 30-60 minutes
```

**Scenario 3: Migration Changed Data (CRITICAL)**
```
⚠️ STOP: Contact developer immediately
- Data changes are often irreversible
- May require point-in-time restore
- May affect multiple tenants
```

### Restoring from Backup (Last Resort)

**Only if:**
- Data corruption detected
- Multiple attempts to fix failed
- Developer confirms no other option

**Steps:**
1. Go to Supabase Dashboard → Settings → Backups
2. Find backup BEFORE the bad deployment
3. Click "Restore" (NOTE: This will overwrite current database)
4. Wait 5-30 minutes for restore to complete
5. Test thoroughly before announcing restoration

**Data Loss Warning:** Any data created AFTER the backup will be lost.

---

## Verification Checklist

After ANY rollback, verify these critical flows:

### Authentication
- [ ] Studio Director can log in
- [ ] Competition Director can log in
- [ ] Dashboard loads after login
- [ ] Session persists across page refreshes

### Core Functionality
- [ ] Studios can view their dancers
- [ ] Studios can view their reservations
- [ ] Studios can view their entries
- [ ] Competition Director can view pipeline
- [ ] No console errors in browser dev tools

### Data Integrity
```sql
-- Run these queries to spot-check data:

-- Check entry counts by studio
SELECT studio_id, COUNT(*) as entry_count
FROM competition_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY studio_id
ORDER BY entry_count DESC;

-- Check recent activity logs
SELECT action, COUNT(*) as count
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action
ORDER BY count DESC;

-- Check for orphaned entries
SELECT COUNT(*) as orphaned_entries
FROM competition_entries e
LEFT JOIN studios s ON e.studio_id = s.id
WHERE s.id IS NULL;
-- Should return 0
```

### Tenant Isolation
- [ ] EMPWR users see only EMPWR data
- [ ] Glow users see only Glow data
- [ ] No cross-tenant data visible

---

## Communication Template

### Internal Notification (Slack/Email)
```
🚨 ROLLBACK EXECUTED

Time: [timestamp]
Reason: [brief description of issue]
Action: Rolled back to commit [hash]
Status: ✅ Verified working / ⏳ Testing in progress
Impact: [which features were affected]
Next Steps: [what you're doing to prevent recurrence]
```

### User Notification (If Users Were Affected)
```
Subject: Brief Service Disruption Resolved

Dear Studio Directors,

We experienced a brief technical issue between [start time] and [end time]
that has now been resolved. All systems are functioning normally.

If you experienced any issues during this time:
- Your data is safe and intact
- Any in-progress work may need to be re-entered
- Please try logging out and back in if you see any unusual behavior

We apologize for any inconvenience.

Contact support if you have any concerns: support@compsync.net

Thank you,
CompSync Team
```

---

## Prevention Checklist

To avoid needing rollbacks:

### Before Every Deploy
- [ ] `npm run build` passes locally
- [ ] `npm run type-check` passes
- [ ] Test on staging environment (if available)
- [ ] Review git diff before pushing
- [ ] Check CLAUDE.md for pre-launch protocols

### After Every Deploy
- [ ] Wait for Vercel "Ready" status
- [ ] Check footer commit hash matches
- [ ] Test login → dashboard flow
- [ ] Check browser console for errors
- [ ] Check Sentry for new errors

### Red Flags (Test Immediately)
- Database schema changes
- Authentication code changes
- Capacity/reservation logic changes
- Cross-cutting refactors

---

## Rollback History

| Date | Commit | Reason | Resolution Time |
|------|--------|--------|-----------------|
| - | - | - | - |

**Instructions:** Update this table whenever a rollback occurs for future reference.

---

## Emergency Contacts

**Developer:** [Your contact info]
**Hosting:** Vercel (vercel.com/support)
**Database:** Supabase (supabase.com/dashboard → Support)
**Monitoring:** Sentry (sentry.io)

---

**Document Status:** ✅ Complete
**Review Frequency:** After each rollback incident
**Owner:** Technical Lead
