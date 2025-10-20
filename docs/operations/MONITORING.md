# External Monitoring with UptimeRobot

**Date**: October 20, 2025
**Phase**: 1.2 - External Monitoring
**Status**: ⏸️ REQUIRES USER SETUP

---

## Overview

UptimeRobot provides **external monitoring** for CompPortal production:

- **Uptime monitoring**: Checks every 5 minutes
- **Incident detection**: <5 minute alert time
- **Status page**: Public uptime dashboard
- **Multi-channel alerts**: Email, SMS, Slack, webhook
- **Downtime tracking**: Historical uptime metrics

**Why External?** Vercel/Sentry monitor from inside. UptimeRobot monitors from outside (like a real user).

---

## 🚨 USER ACTION REQUIRED

### Step 1: Sign Up for UptimeRobot

1. Go to: https://uptimerobot.com/
2. Click "Register for FREE"
3. Create account (free tier: 50 monitors, 5-min intervals)
4. Verify email address

**Free Tier Limits**:
- 50 monitors (we need 1-2)
- 5-minute check intervals (sufficient)
- 2-month log retention
- Email + SMS alerts
- Public status pages

**Cost**: $0 (free tier sufficient)

---

### Step 2: Create HTTP Monitor

**Monitor Configuration**:

1. **Dashboard**: https://uptimerobot.com/dashboard
2. Click **"+ Add New Monitor"**
3. **Monitor Type**: HTTP(s)
4. **Friendly Name**: `CompPortal Production Health`
5. **URL**: `https://comp-portal-one.vercel.app/api/health`
6. **Monitoring Interval**: 5 minutes
7. **Monitor Timeout**: 30 seconds

**Advanced Settings**:

**Keyword Monitoring** (recommended):
- Enable "Keyword Exists"
- Keyword: `"status":"healthy"`
- Reason: Ensures API returns correct JSON, not just 200 OK

**HTTP Method**: GET

**HTTP Headers** (none required):
- Health endpoint is public
- No authentication needed

**Post Values** (none required)

---

### Step 3: Configure Alert Contacts

**Email Alerts**:
1. Go to: "My Settings" → "Alert Contacts"
2. Add email: `support@compsync.net` (or your email)
3. Verify email address

**SMS Alerts** (optional but recommended):
1. Same section: "Add Alert Contact"
2. Type: SMS
3. Enter phone number
4. Verify with code

**Slack Integration** (optional):
1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add webhook URL to UptimeRobot
3. Test alert

---

### Step 4: Create Alert Rules

**Default Alert (Built-in)**:
- Alert when monitor goes DOWN
- Alert when monitor comes UP
- Notification delay: 0 minutes (immediate)

**Recommended Settings**:
```
DOWN Alert:
- Triggers: 2 consecutive failures (10 minutes total)
- Notify: Email + SMS
- Escalation: None (free tier)

UP Alert:
- Triggers: Monitor recovers
- Notify: Email only
- Message: "CompPortal is back online"
```

**Why 2 failures?** Prevents false alarms from network blips.

---

### Step 5: Create Public Status Page

**Purpose**: Users can check CompPortal status independently

**Setup**:
1. Go to: "Status Pages" tab
2. Click "+ Add New Status Page"
3. **Type**: Public Status Page
4. **Friendly Name**: `CompPortal Status`
5. **Subdomain**: `compportal` (results in: `compportal.betteruptime.com`)
6. **Monitors to Display**: Select "CompPortal Production Health"
7. **Show Uptime %**: Yes (30 days)
8. **Custom Domain** (optional): `status.compsync.net`

**Status Page Features**:
- Real-time status (Up/Down)
- 30-day uptime percentage
- Historical incidents
- Response time graph
- Subscribe to updates

**Share URL**: Add to footer or support emails

---

## Health Endpoint

### Current Implementation

**File**: `src/app/api/health/route.ts`

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T12:44:00.000Z",
  "services": {
    "database": "healthy",
    "email": "healthy"
  }
}
```

**Checks Performed**:
1. **Database**: Simple query to `users` table
2. **Email**: SMTP connection test (optional)

**Response Codes**:
- `200 OK` - All services healthy
- `503 Service Unavailable` - Database or email down

---

## Monitoring Strategy

### What Gets Monitored

**Primary Monitor**:
- URL: `/api/health`
- Interval: 5 minutes
- Keyword: `"status":"healthy"`
- Timeout: 30 seconds

**Why `/api/health`?**
- Tests database connectivity (most critical)
- Tests API response time
- Tests Vercel edge network
- Lightweight (no heavy queries)

**Future Monitors** (if needed):
- `/` - Homepage availability
- `/dashboard` - Dashboard load time
- `/api/trpc/health` - tRPC health check

---

## Alert Scenarios

### Scenario 1: Database Down

**Symptom**: Health endpoint returns 503
**Alert**: Email + SMS within 10 minutes
**User Action**:
1. Check Supabase dashboard: https://app.supabase.com/project/[project]/database
2. If Supabase down: Contact support@supabase.com
3. Check #status channel on Supabase Discord
4. Monitor recovery

**Resolution Time**: Usually 5-15 minutes (Supabase SLA)

---

### Scenario 2: Vercel Edge Down

**Symptom**: Health endpoint times out (no response)
**Alert**: Email + SMS within 10 minutes
**User Action**:
1. Check Vercel status: https://vercel-status.com/
2. Check deployment logs: https://vercel.com/[team]/compportal/deployments
3. If widespread: Wait for Vercel recovery
4. If isolated: Check Sentry for errors

**Resolution Time**: Usually 5-30 minutes (Vercel SLA)

---

### Scenario 3: Bad Deployment

**Symptom**: Health endpoint returns 500 or malformed JSON
**Alert**: Email + SMS within 10 minutes (keyword "healthy" not found)
**User Action**:
1. Check latest deployment: https://vercel.com/[team]/compportal/deployments
2. Check Sentry for errors: https://sentry.io/organizations/[org]/issues/
3. Rollback deployment if needed:
   ```bash
   vercel rollback [deployment-url]
   ```
4. Investigate root cause

**Resolution Time**: 5-10 minutes (instant rollback)

---

### Scenario 4: Email Service Down

**Symptom**: Health endpoint returns partial failure
**Alert**: Email only (SMS if critical)
**User Action**:
1. Check SMTP credentials in Vercel env vars
2. Check email provider status (if using third-party)
3. Test email sending manually
4. Monitor email queue

**Impact**: **Low** - App still works, email delayed
**Resolution Time**: 30 minutes - 2 hours

---

## Dashboard & Reporting

### UptimeRobot Dashboard

**URL**: https://uptimerobot.com/dashboard

**Metrics Shown**:
- **Current Status**: Up/Down/Paused
- **Uptime %**: Last 24h, 7d, 30d, 90d
- **Average Response Time**: Last 24h
- **Downtime History**: Duration, reason, date

**Example Uptime Report**:
```
Last 30 days: 99.95% uptime
Incidents: 2
Total downtime: 22 minutes
Avg response time: 145ms
```

---

### Response Time Monitoring

**Why It Matters**:
- Detect performance degradation
- Identify regional issues
- Baseline for SLA

**Normal Response Times**:
- US East: 50-150ms
- US West: 100-200ms
- Europe: 150-250ms
- Asia: 200-400ms

**Alert Thresholds** (configure if needed):
- Warning: >500ms average over 30 minutes
- Critical: >1000ms average over 30 minutes

---

## Integration with Other Tools

### Sentry Integration (Future)

**When UptimeRobot detects downtime:**
1. Check Sentry for recent errors
2. Correlate downtime with error spikes
3. Identify root cause faster

**Example**:
- UptimeRobot: Down at 2:15 PM
- Sentry: 50 errors starting 2:14 PM
- Root cause: Database connection pool exhausted

---

### Slack Integration

**Setup** (optional):
1. Create Slack webhook: https://[workspace].slack.com/apps/A0F7XDUAZ-incoming-webhooks
2. Add to UptimeRobot alert contacts
3. Configure alert message format

**Slack Message Format**:
```
🔴 CompPortal is DOWN
Monitor: CompPortal Production Health
URL: https://comp-portal-one.vercel.app/api/health
Started: 2:15 PM EST
Duration: 5 minutes
Status Page: https://compportal.betteruptime.com
```

---

## Maintenance Windows

### Planned Maintenance

**Before database migrations or major deploys:**

1. Go to UptimeRobot dashboard
2. Click monitor → "Pause Monitoring"
3. Perform maintenance
4. Resume monitoring after verification

**Alternative**: Create maintenance window in UptimeRobot (Pro feature)

---

## Historical Data & SLA Tracking

### Uptime SLA Targets

**Production Targets**:
- **99.9% uptime** = 43 minutes/month downtime allowed
- **99.95% uptime** = 22 minutes/month downtime allowed
- **99.99% uptime** = 4 minutes/month downtime allowed

**Current Target**: 99.9% (free tier, reasonable for Phase 1-3)

**Future Target**: 99.95% (after multi-tenant, paid tier)

---

### Monthly Reporting

**What to Track**:
1. Uptime percentage
2. Number of incidents
3. Total downtime duration
4. Average response time
5. Slowest endpoint

**Example Monthly Report**:
```
October 2025 - CompPortal Uptime Report

Uptime: 99.92%
Incidents: 3
  - Oct 5: 8 minutes (database maintenance)
  - Oct 12: 4 minutes (Vercel edge issue)
  - Oct 20: 2 minutes (bad deployment, rolled back)
Total Downtime: 14 minutes
Avg Response Time: 152ms
P95 Response Time: 280ms

Status: ✅ Meets 99.9% SLA
```

---

## Cost Optimization

### Free Tier Limits

**What's Included**:
- 50 monitors
- 5-minute intervals
- Email + SMS alerts
- Public status pages
- 2-month logs

**When to Upgrade** ($7/month):
- Need 1-minute intervals (faster detection)
- Need longer log retention (>2 months)
- Need advanced alerting (escalation rules)
- Need maintenance windows

**Current Assessment**: Free tier sufficient through Phase 4.

---

## Testing the Monitor

### After Setup - Test Alert

**Test 1: Simulate Downtime**:
1. Temporarily break health endpoint:
   ```typescript
   // In src/app/api/health/route.ts
   return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
   ```
2. Commit and deploy
3. Wait 10 minutes (2 failures at 5-min intervals)
4. Verify alert received (email/SMS)
5. Revert change
6. Verify recovery alert

**Test 2: Response Time**:
1. Add artificial delay:
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
   ```
2. Check UptimeRobot dashboard for response time spike
3. Revert change

---

## Troubleshooting

### Monitor Shows "Down" But Site Works

**Possible Causes**:
1. **Keyword not found**: Health endpoint changed format
   - Fix: Update keyword in monitor settings
2. **Timeout too short**: Health check slow
   - Fix: Increase timeout to 60 seconds
3. **False positive**: Network blip
   - Fix: Increase failure threshold to 3 checks (15 min)

### No Alerts Received

**Checklist**:
1. ✅ Alert contact verified (check email)
2. ✅ Monitor assigned to alert contact
3. ✅ Alert threshold met (2+ failures)
4. ✅ Check spam folder

### Status Page Not Updating

**Checklist**:
1. ✅ Monitor added to status page
2. ✅ Status page published (not draft)
3. ✅ Clear browser cache
4. ✅ Wait 5 minutes for update

---

## Security Considerations

### Public Health Endpoint

**Safe to expose**:
- No authentication required
- No sensitive data returned
- No database queries beyond connection test
- Rate limited by Vercel

**What NOT to expose**:
- Detailed error messages (use generic "unhealthy")
- Database credentials
- Internal IP addresses
- Stack traces

**Current Status**: ✅ Safe (see `src/app/api/health/route.ts`)

---

## Next Steps

### After UptimeRobot Setup
1. ✅ Create account and monitor
2. ✅ Configure alerts (email + SMS)
3. ✅ Create public status page
4. ✅ Test alert by breaking health endpoint
5. ✅ Add status page link to footer
6. ⏭️ Monitor for 30 days to establish baseline

### Documentation Links
- UptimeRobot Docs: https://uptimerobot.com/help/
- Status Pages: https://uptimerobot.com/help/status-pages/
- Alert Integrations: https://uptimerobot.com/help/alert-contacts/

---

## Files Referenced

- `src/app/api/health/route.ts` - Health check endpoint (already exists)

---

**Status**: ⏸️ Awaiting user account creation
**Risk**: 🟢 Zero breaking changes (external only)
**Cost**: $0 (free tier)
**Time to Setup**: 15 minutes
