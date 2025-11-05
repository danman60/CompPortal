# Daily Digest Email System

## Overview

The Daily Digest feature sends automated email summaries to Competition Directors with pending actions, upcoming events, and recent activity. This helps CDs stay informed without manually checking the dashboard daily.

**Status:** ✅ Implementation complete, ⚠️ **DISABLED by default** (requires manual activation)

**Created:** Session 35 (November 5, 2025)

---

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [User Configuration](#user-configuration)
4. [Super Admin Control Panel](#super-admin-control-panel)
5. [Activation Instructions](#activation-instructions)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Files Reference](#files-reference)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Daily Digest System                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Vercel Cron Job                                          │
│     └─> /api/cron/digest (hourly check)                     │
│                                                              │
│  2. Digest Generator                                         │
│     └─> digest-generator.ts (content compilation)           │
│                                                              │
│  3. Email Template                                           │
│     └─> DailyDigest.tsx (React Email component)             │
│                                                              │
│  4. Super Admin Control Panel                                │
│     └─> /dashboard/admin/digest (manual triggers)           │
│                                                              │
│  5. User Preferences                                         │
│     └─> EmailDigestSettings.tsx (CD configuration)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Preferences (DB)
         ↓
   Cron Job Checks Time
         ↓
   Generate Digest Content
   - Query pending actions
   - Query upcoming events
   - Query recent activity
         ↓
   Render Email Template
   - Apply tenant branding
   - Format content sections
         ↓
   Send via Resend
   - Email delivered to CD
         ↓
   Log Activity
   - Track digest sends
```

---

## Features

### Digest Content Sections

**1. Pending Actions**
- Classification exception requests (pending)
- Reservation reviews (pending)
- Action count displayed prominently
- Direct links to review pages

**2. Upcoming Events**
- Competitions in next 30 days
- Shows days until event
- Formatted date display
- Status filtering (excludes cancelled)

**3. Recent Activity**
- Last 7 days of activity
- Key actions tracked:
  - `reservation.submit`
  - `reservation.approve`
  - `reservation.adjust`
  - `classification.request`
  - `classification.approve`
  - `invoice.send`
  - `invoice.markAsPaid`
- Human-readable descriptions

### Scheduling Options

Competition Directors can configure:

- **Frequency:**
  - Daily (every day at specified time)
  - Weekly (specific day of week + time)
  - Monthly (specific day of month + time)

- **Content Filters:**
  - Include/exclude activities
  - Include/exclude upcoming events
  - Include/exclude pending actions

- **Minimum Activity Threshold:**
  - Only send if minimum number of items exists
  - Prevents empty digests

### Tenant Branding

Each digest includes tenant-specific branding:
- Primary color (buttons, accents)
- Logo (header)
- Tenant name
- Portal URL

---

## User Configuration

### Competition Director Settings

**Location:** `/dashboard/settings` → Email Digest tab

**Available Options:**

```typescript
{
  enabled: boolean,
  frequency: 'daily' | 'weekly' | 'monthly',
  time: 'HH:MM', // 24-hour format
  dayOfWeek: number, // 0-6 (Sunday-Saturday, for weekly)
  dayOfMonth: number, // 1-31 (for monthly)
  includeActivities: boolean,
  includeUpcomingEvents: boolean,
  includePendingActions: boolean,
  minimumActivityCount: number, // Don't send if below threshold
}
```

**Example Configurations:**

```json
// Daily at 8:00 AM
{
  "enabled": true,
  "frequency": "daily",
  "time": "08:00",
  "includeActivities": true,
  "includeUpcomingEvents": true,
  "includePendingActions": true,
  "minimumActivityCount": 1
}

// Weekly on Monday at 9:00 AM
{
  "enabled": true,
  "frequency": "weekly",
  "time": "09:00",
  "dayOfWeek": 1,
  "includeActivities": true,
  "includeUpcomingEvents": true,
  "includePendingActions": true,
  "minimumActivityCount": 3
}
```

### Storage

User preferences stored in `user_profiles.notification_preferences` (JSONB):

```json
{
  "email_digest": {
    "enabled": true,
    "frequency": "daily",
    "time": "08:00",
    ...
  }
}
```

---

## Super Admin Control Panel

**URL:** `/dashboard/admin/digest`

### Features

**1. Test Send**
- Select Competition Director from dropdown
- Preview digest content before sending
- Send test digest to specific user
- View summary stats (pending actions, events, activity)

**2. Scheduled Batch Send**
- Manually trigger scheduled digest check
- Sends to ALL users due right now
- Shows results (sent, failed, skipped)
- Useful for testing or manual runs

**3. Preview Content**
- View digest content without sending
- See exact counts of each section
- Verify content generation logic
- Empty state warning if no content

### API Endpoints (tRPC)

```typescript
// Preview digest for user (no send)
trpc.superAdmin.digest.previewDigest.useQuery({
  userId: string
})

// Send digest to specific user (test send)
trpc.superAdmin.digest.sendDigestToUser.useMutation({
  userId: string
})

// Send digests to all due users (batch)
trpc.superAdmin.digest.sendScheduledDigests.useMutation()
```

---

## Activation Instructions

### Prerequisites

1. Ensure Resend API key configured (`RESEND_API_KEY` in `.env`)
2. Ensure sender email configured (`RESEND_FROM_EMAIL` in `.env`)
3. Generate secure cron secret: `openssl rand -base64 32`
4. Add to `.env`: `CRON_SECRET=<generated-secret>`

### Step 1: Update vercel.json

**Current State (Disabled):**
```json
{
  "crons": []
}
```

**Activate (Hourly Check):**
```json
{
  "crons": [
    {
      "path": "/api/cron/digest",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule Options:**

| Frequency | Cron Expression | Description |
|-----------|----------------|-------------|
| Every hour | `0 * * * *` | Run at :00 of every hour |
| Every 6 hours | `0 */6 * * *` | Run at 00:00, 06:00, 12:00, 18:00 |
| Daily at 8 AM | `0 8 * * *` | Run once per day at 8:00 AM UTC |
| Twice daily | `0 8,20 * * *` | Run at 8:00 AM and 8:00 PM UTC |

**Recommendation:** Start with hourly (`0 * * * *`) to handle all timezone configurations.

### Step 2: Deploy to Vercel

```bash
git add vercel.json
git commit -m "Enable daily digest cron job"
git push origin main
```

### Step 3: Verify in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Cron Jobs**
3. Verify digest cron appears in list
4. Check status (should show "Active")
5. View execution logs

### Step 4: Add CRON_SECRET Environment Variable

1. In Vercel dashboard: **Settings** → **Environment Variables**
2. Add variable:
   - Name: `CRON_SECRET`
   - Value: `<your-generated-secret>`
   - Environments: **Production**, **Preview** (optional), **Development** (optional)
3. Redeploy for changes to take effect

### Step 5: Test Activation

**Option A: Manual API Test**
```bash
curl -X GET https://empwr.compsync.net/api/cron/digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Option B: Super Admin Panel Test**
1. Login as Super Admin
2. Go to `/dashboard/admin/digest`
3. Use "Send Scheduled Digests" button
4. Verify results displayed

**Option C: Wait for Next Hourly Run**
- Check Vercel logs in 1 hour
- Verify digest sent to eligible users

---

## Testing

### Test Scenarios

**1. Empty Digest (Should Skip)**
```typescript
// User with no pending actions, no upcoming events, no activity
// Expected: Skipped (digestContent returns null)
```

**2. Single User Test Send**
```typescript
// Via SA Control Panel:
// 1. Select user
// 2. Click "Preview Content"
// 3. Verify counts match database
// 4. Click "Send Digest"
// 5. Check user's email inbox
```

**3. Batch Send (Multiple Users)**
```typescript
// Via SA Control Panel:
// 1. Click "Send Scheduled Digests"
// 2. Verify results: { sent: [], failed: [], skipped: [] }
// 3. Check activity logs for all users
```

**4. Scheduling Logic**
```typescript
// Test daily at 8 AM:
const now = new Date('2025-11-05T08:00:00Z');
// Expected: getUsersDueForDigest() returns users with time === '08:00'

// Test weekly (Monday at 9 AM):
const now = new Date('2025-11-04T09:00:00Z'); // Monday
// Expected: Returns users with dayOfWeek === 1, time === '09:00'
```

**5. Tenant Isolation**
```typescript
// Verify digests only show data from user's tenant
// Check pendingActions, upcomingEvents, recentActivity filters
```

### Manual Testing Checklist

- [ ] Preview digest for user with content
- [ ] Preview digest for user with no content (empty state)
- [ ] Send test digest to specific user
- [ ] Verify email received in inbox
- [ ] Check email formatting (branding, links, styling)
- [ ] Click action buttons in email (verify URLs work)
- [ ] Test batch send to multiple users
- [ ] Verify activity logs created
- [ ] Check Vercel logs for cron execution
- [ ] Test with EMPWR tenant
- [ ] Test with Glow tenant

---

## Troubleshooting

### Common Issues

**Issue:** Digest not sending
```
Symptoms: No email received, no activity log

Diagnosis:
1. Check user preferences: notification_preferences.email_digest.enabled === true
2. Check time matches: getUsersDueForDigest() logic
3. Check content threshold: minimumActivityCount met?
4. Check email logs: /dashboard/admin/emails
5. Check Vercel logs: Cron job execution

Fix:
- Verify user.notification_preferences JSONB structure
- Lower minimumActivityCount for testing
- Check Resend API key configured
- Verify CRON_SECRET matches in Vercel
```

**Issue:** Empty digests sent
```
Symptoms: Email received but no content sections

Diagnosis:
1. Check database queries in digest-generator.ts
2. Verify tenant_id filtering
3. Check date range logic (last 7 days, next 30 days)
4. Verify user.role === 'competition_director'

Fix:
- Add logging to generateDigestForUser()
- Verify user has access to tenant data
- Check minimumActivityCount threshold
```

**Issue:** Cron job not executing
```
Symptoms: No logs in Vercel, digest never triggers

Diagnosis:
1. Check vercel.json crons array not empty
2. Verify CRON_SECRET environment variable set
3. Check Vercel dashboard → Cron Jobs tab
4. Verify API route exists: /api/cron/digest/route.ts

Fix:
- Redeploy after vercel.json changes
- Add CRON_SECRET to all environments
- Test API route manually via curl
- Check Vercel logs for errors
```

**Issue:** Wrong content displayed
```
Symptoms: Digest shows data from wrong tenant

Diagnosis:
1. Check all queries filter by tenant_id
2. Verify user.tenant_id matches data
3. Check tenant branding query

Fix:
- Add WHERE tenant_id = ? to all digest queries
- Verify user_profiles.tenant_id populated
- Log tenant_id at each step for debugging
```

### Debugging Tools

**1. Activity Logs**
```sql
-- Check digest sends
SELECT * FROM activity_logs
WHERE action = 'digest.send'
ORDER BY created_at DESC
LIMIT 20;
```

**2. User Preferences**
```sql
-- View CD digest settings
SELECT
  up.id,
  up.name,
  up.notification_preferences->'email_digest' as digest_prefs
FROM user_profiles up
WHERE up.role = 'competition_director';
```

**3. Eligible Users**
```typescript
// Test getUsersDueForDigest() logic
const usersDue = await getUsersDueForDigest();
console.log('Users due:', usersDue.length);
```

**4. Content Generation**
```typescript
// Test digest content for specific user
const content = await generateDigestForUser(userId, {
  includeActivities: true,
  includeUpcomingEvents: true,
  includePendingActions: true,
  minimumActivityCount: 0,
});
console.log('Digest content:', content);
```

---

## Files Reference

### Backend

**Content Generation:**
- `src/lib/digest-generator.ts` - Compile digest data from database
- `src/lib/email-templates.tsx` - Email rendering functions (exports `renderDailyDigest`)

**Email Template:**
- `src/emails/DailyDigest.tsx` - React Email component for digest

**API Routes:**
- `src/app/api/cron/digest/route.ts` - Vercel cron job handler

**tRPC Endpoints:**
- `src/server/routers/superAdmin.ts` - Digest router (lines 1484-1723)
  - `digest.previewDigest` - Preview content
  - `digest.sendDigestToUser` - Test send
  - `digest.sendScheduledDigests` - Batch send

### Frontend

**Super Admin Control Panel:**
- `src/app/dashboard/admin/digest/page.tsx` - SA digest management UI

**User Settings:**
- `src/components/EmailDigestSettings.tsx` - CD preferences modal
- `src/hooks/useEmailDigest.ts` - Preference management hook

**User Endpoints:**
- `src/server/routers/user.ts` - Save/load preferences

### Configuration

**Cron Job:**
- `vercel.json` - Cron schedule configuration (disabled by default)

**Environment Variables:**
```bash
CRON_SECRET=<secure-random-string>
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=noreply@compsync.net
```

---

## Future Enhancements

**Potential Improvements:**

1. **Digest Statistics Dashboard**
   - Track open rates (email tracking pixel)
   - Track click rates (link tracking)
   - Show delivery success rates
   - Display engagement metrics

2. **Advanced Filtering**
   - Filter by competition
   - Filter by priority level
   - Custom activity types
   - Customizable date ranges

3. **Smart Scheduling**
   - AI-driven optimal send times
   - Timezone-aware scheduling
   - Adaptive frequency (more activity = more frequent)

4. **Rich Content**
   - Inline charts/graphs
   - Summary statistics
   - Trend indicators (up/down arrows)
   - Embedded action buttons

5. **Digest Templates**
   - Multiple template styles
   - Customizable sections
   - Tenant-specific layouts

6. **Mobile App Push Notifications**
   - Digest summary as push notification
   - Deep links to specific actions

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-05 | 1.0 | Initial implementation (Session 35) |

---

## Contact

For questions or issues with the Daily Digest system:
- Check this documentation first
- Review `/dashboard/admin/digest` control panel
- Check Vercel cron logs
- Review email delivery logs at `/dashboard/admin/emails`

**Testing Environment:**
- EMPWR CD: `empwrdance@gmail.com` / `1CompSyncLogin!`
- Glow CD: `stefanoalyessia@gmail.com` / `1CompSyncLogin!`
- Super Admin: `danieljohnabrahamson@gmail.com` / `123456`
