# External Uptime Monitoring Setup

**Wave 6: Production Monitoring**

This guide explains how to set up external uptime monitoring for CompPortal using UptimeRobot (free tier).

## Overview

CompPortal includes a health check endpoint at `/api/health` that can be monitored by external services to detect outages and degraded services.

**Health Check Endpoint**: `https://comp-portal-one.vercel.app/api/health`

**Services Monitored**:
- Database connectivity (PostgreSQL)
- Email service (SMTP)
- Application uptime

**Detection Time**: <2 minutes for incidents

---

## UptimeRobot Setup (Free Tier)

### Step 1: Create Account

1. Visit [https://uptimerobot.com/](https://uptimerobot.com/)
2. Sign up for a free account
3. Confirm your email address
4. Log in to dashboard

### Step 2: Add Monitor

1. Click **"+ Add New Monitor"** in dashboard
2. Configure monitor settings:

**Monitor Type**: HTTP(s)

**Friendly Name**: `CompPortal Health Check`

**URL**: `https://comp-portal-one.vercel.app/api/health`

**Monitoring Interval**: 5 minutes (free tier)

**Monitor Timeout**: 30 seconds

**HTTP Method**: GET

### Step 3: Configure Alert Conditions

**Alert When**:
- Monitor is down (HTTP status ≠ 200)
- Monitor times out (>30 seconds)

**Alert Contacts**:
- Add your email address
- (Optional) Add SMS number (paid feature)
- (Optional) Integrate with Slack/Discord

**Alert Threshold**: Alert when down for 2 consecutive checks (~10 minutes)

### Step 4: Advanced Settings (Optional)

**Keyword Monitoring** (verify response content):
- Enable keyword monitoring
- Keyword: `"status":"healthy"`
- Alert if keyword is NOT found

This ensures the endpoint returns valid JSON with healthy status.

### Step 5: Enable Notifications

Configure notification settings:
- ✅ Send alerts when monitor goes DOWN
- ✅ Send alerts when monitor goes UP (recovery)
- ✅ Send weekly uptime reports

---

## Alternative: Vercel Monitoring

Vercel provides built-in monitoring for deployments:

1. Go to Vercel dashboard
2. Select CompPortal project
3. Navigate to **Settings → Monitoring**
4. Enable **Deployment Health Checks**
5. Set health check path to `/api/health`

**Note**: Vercel monitoring is project-specific and checks deployment health, not service health.

---

## Testing the Setup

### 1. Test Health Endpoint Locally

```bash
curl https://comp-portal-one.vercel.app/api/health
```

**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T12:00:00.000Z",
  "checks": {
    "database": "healthy",
    "email": "healthy",
    "application": "healthy"
  },
  "uptime": 12345,
  "environment": "production"
}
```

### 2. Verify UptimeRobot Monitoring

1. Check UptimeRobot dashboard
2. Monitor should show **"Up"** status with green indicator
3. Response time should be <500ms

### 3. Test Alert Notifications

**Option 1: Pause Monitor** (temporary test)
- In UptimeRobot dashboard, pause the monitor
- Wait 10 minutes
- Verify you receive a DOWN alert
- Resume monitor
- Verify you receive an UP alert

**Option 2: Simulate Outage** (not recommended for production)
- Temporarily disable database connection
- Wait for UptimeRobot to detect
- Re-enable database
- Verify recovery alert

---

## Public Status Page

CompPortal includes a public status page at `/status` that displays real-time system health:

**URL**: `https://comp-portal-one.vercel.app/status`

**Features**:
- Real-time service status indicators
- System uptime tracking
- Auto-refresh every 30 seconds
- Mobile-responsive design

**Access**: Public (no authentication required)

---

## Monitoring Best Practices

### 1. Regular Review
- Check UptimeRobot dashboard weekly
- Review uptime reports monthly
- Investigate any downtime incidents

### 2. Alert Fatigue Prevention
- Set alert threshold to 2+ consecutive failures (avoid false positives)
- Use escalation policies (email → SMS → phone call)
- Silence alerts during scheduled maintenance

### 3. Incident Response Plan

**When Alert Received**:
1. Check public status page: `/status`
2. Check Vercel deployment logs
3. Check database connectivity
4. Check email service logs
5. If database down: Contact Supabase support
6. If email down: Check SMTP credentials
7. Document incident in failure log

### 4. Uptime Goals
- **Target**: 99.9% uptime (8.76 hours downtime/year)
- **Acceptable**: 99.5% uptime (43.8 hours downtime/year)
- **Critical Threshold**: <99% (requires investigation)

---

## Troubleshooting

### Monitor Shows DOWN but Site Works

**Cause**: Temporary network issue or UptimeRobot false positive

**Solution**:
- Check site manually
- Review UptimeRobot response time graph
- If single occurrence, ignore
- If recurring, increase timeout or check interval

### Monitor Shows UP but Email Service Down

**Cause**: Email service is non-critical, doesn't fail health check

**Solution**:
- Check `/status` page for email service status
- Email service shows "degraded" or "not_configured"
- Database must be healthy for health check to pass
- Review email service logs separately

### Keyword Monitoring Fails

**Cause**: Health check returns different status structure

**Solution**:
- Verify health endpoint response manually
- Update keyword to match current response format
- Ensure JSON is valid

---

## Cost Considerations

**UptimeRobot Free Tier**:
- Up to 50 monitors
- 5-minute check intervals
- Email alerts included
- Sufficient for CompPortal needs

**Paid Tier** ($7/month):
- 1-minute check intervals
- SMS alerts
- Advanced reporting
- Custom status pages

**Recommendation**: Start with free tier, upgrade if needed.

---

## Integration with Failure Tracking

CompPortal's built-in failure tracking (`/dashboard/admin/failures`) complements external monitoring:

**External Monitoring** (UptimeRobot):
- Detects full system outages
- Monitors uptime from outside Vercel network
- Alerts on availability issues

**Internal Failure Tracking**:
- Tracks partial failures (email send failures)
- Provides retry capability
- Logs detailed error messages

**Best Practice**: Use both for comprehensive monitoring.

---

## Next Steps

After setting up UptimeRobot:

1. ✅ Add health check monitor
2. ✅ Configure email alerts
3. ✅ Test alert notifications
4. ✅ Bookmark public status page
5. ✅ Add status page to support docs
6. ✅ Document incident response plan
7. ✅ Schedule monthly uptime reviews

---

**Created**: Wave 6 (Production Monitoring)
**Last Updated**: October 17, 2025
**Maintained By**: CompPortal Development Team
