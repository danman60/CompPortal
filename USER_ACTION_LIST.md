# User Action Required List

**Date**: October 20, 2025
**Status**: Phase 1 & 2 Complete

---

## 🚨 CRITICAL ACTIONS (Required for Full Functionality)

### 1. Set Up Sentry Account (10 minutes)
**Why**: Error tracking won't work until Sentry account is configured
**Priority**: HIGH
**Guide**: `docs/operations/ERROR_TRACKING.md`

**Steps**:
1. Go to https://sentry.io/signup/
2. Create FREE account (100k events/month)
3. Create organization (e.g., "CompPortal")
4. Create project: "compportal-nextjs"
5. Get credentials:
   - **DSN**: https://sentry.io/settings/[org]/projects/compportal-nextjs/keys/
   - **Org Slug**: Found in URL or settings
   - **Auth Token**: https://sentry.io/settings/account/api/auth-tokens/
     - Scopes: `project:read`, `project:releases`, `org:read`
6. Add to Vercel environment variables:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://[key]@o[org].ingest.us.sentry.io/[project]
   SENTRY_ORG=your-organization-slug
   SENTRY_PROJECT=compportal-nextjs
   SENTRY_AUTH_TOKEN=sntrys_[your-token]
   ```
7. Go to: https://vercel.com/[team]/compportal/settings/environment-variables
8. Add all 4 variables to Production environment
9. Redeploy will happen automatically

**Result**: Production errors appear in Sentry dashboard within 5 minutes

---

### 2. Add SUPABASE_JWT_SECRET to Vercel (5 minutes)
**Why**: WebSocket JWT authentication won't work without this secret
**Priority**: HIGH (required for real-time features)
**Guide**: See `.env.example` line 21

**Steps**:
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/[project-ref]/settings/api
2. Scroll to "JWT Settings" section
3. Copy the **JWT Secret** value
4. Go to Vercel: https://vercel.com/[team]/compportal/settings/environment-variables
5. Add new variable:
   ```
   SUPABASE_JWT_SECRET=your_jwt_secret_here
   ```
6. Select **Production** environment
7. Click "Save"
8. Redeploy will happen automatically

**Result**: WebSocket connections authenticate using real JWT tokens (not 'dev-token')

---

## ⚠️ RECOMMENDED ACTIONS (Improves Monitoring)

### 3. Set Up UptimeRobot (15 minutes)
**Why**: External uptime monitoring, <5 minute incident detection
**Priority**: MEDIUM
**Guide**: `docs/operations/MONITORING.md`
**Cost**: FREE (50 monitors, 5-min intervals)

**Steps**:
1. Go to https://uptimerobot.com/
2. Click "Register for FREE"
3. Create account and verify email
4. Click "+ Add New Monitor"
   - Type: HTTP(s)
   - Name: `CompPortal Production Health`
   - URL: `https://comp-portal-one.vercel.app/api/health`
   - Interval: 5 minutes
   - Keyword: `"status":"healthy"`
5. Add alert contacts:
   - Email: support@compsync.net
   - SMS: [your phone] (optional)
6. Create public status page:
   - Go to "Status Pages" tab
   - Create page (e.g., `compportal.betteruptime.com`)
7. Test alert by temporarily breaking health endpoint

**Result**: Email/SMS alerts when site goes down

---

## ✅ VERIFICATION TASKS (After Phase 1-2 Deploy)

### 4. Verify Vercel Analytics (5 minutes)
**Why**: Confirm performance monitoring is active
**Priority**: LOW (auto-active, just verify)

**Steps**:
1. Go to https://vercel.com/[team]/compportal/analytics
2. Wait 10 minutes after deployment
3. Visit production site: https://comp-portal-one.vercel.app
4. Refresh analytics dashboard
5. Verify:
   - ✅ Page views showing
   - ✅ Web Vitals scores visible
   - ✅ Performance metrics (LCP, FID, CLS)

**Result**: Real-time performance data visible

---

### 5. Test Sentry Error Capture (5 minutes)
**Why**: Verify errors are being tracked
**Priority**: LOW (only after Sentry setup)

**Steps**:
1. After Sentry setup complete (Action #1)
2. Visit production site
3. Check Sentry dashboard: https://sentry.io/organizations/[org]/issues/
4. Look for test errors or natural errors
5. Verify:
   - ✅ Errors appearing in dashboard
   - ✅ Stack traces readable (source maps working)
   - ✅ No PII in error data

**Result**: Production error tracking confirmed

---

## 📋 PHASE 2 ACTIONS (No User Action Required)

### 6. CSV Import Update (Testing Required Later)
**What Changed**: Replaced `xlsx` package with `exceljs`
**Why**: Fix 2 high-severity CVE vulnerabilities
**User Action**: Test CSV import after Phase 2 deploys
**When**: After Phase 2.1 complete

**Test Steps** (when Phase 2.1 deploys):
1. Go to `/dashboard/dancers/import` or `/dashboard/entries/import`
2. Upload a CSV file (or create test file)
3. Verify import works normally
4. Check for errors in console
5. Report any issues

---

### 7. WebSocket Connection (Testing Required Later)
**What Changed**: JWT authentication replaces 'dev-token'
**Why**: Security - dev token is insecure in production
**User Action**: Verify real-time features work
**When**: After Phase 2.2 complete

**Test Steps** (when Phase 2.2 deploys):
1. Open two browser tabs
2. Tab 1: Director panel or judging interface
3. Tab 2: Same page or related page
4. Make a change in Tab 1 (e.g., approve reservation)
5. Verify Tab 2 updates in real-time
6. Check browser console for WebSocket errors

---

## 📊 ACTION SUMMARY

| # | Action | Priority | Time | Cost | Status |
|---|--------|----------|------|------|--------|
| 1 | Set up Sentry account | HIGH | 10 min | FREE | ⏸️ PENDING |
| 2 | Add SUPABASE_JWT_SECRET | HIGH | 5 min | FREE | ⏸️ PENDING |
| 3 | Set up UptimeRobot | MEDIUM | 15 min | FREE | ⏸️ PENDING |
| 4 | Verify Vercel Analytics | LOW | 5 min | FREE | ⏸️ PENDING |
| 5 | Test Sentry errors | LOW | 5 min | FREE | ⏸️ PENDING |
| 6 | Test CSV import | LOW | 5 min | FREE | ⏸️ AFTER PHASE 2.1 |
| 7 | Test WebSocket | LOW | 5 min | FREE | ⏸️ AFTER PHASE 2.2 |

**Total Time**: ~50 minutes (critical actions only: 15 min)

---

## 🎯 NEXT REVIEW (After 24 Hours)

**When You Return**:
1. Review Phase 1-2 commits in GitHub
2. Check Vercel deployment status (should be green)
3. Complete Action #1 (Sentry setup) - 10 minutes
4. Optionally complete Action #2 (UptimeRobot) - 15 minutes
5. Approve Phase 3 execution (or provide feedback)

**Questions to Consider**:
- Should we continue with Phase 3 (Operational Resilience)?
- Any issues encountered with Phase 1-2?
- Budget approval for full 5-phase implementation?

---

**Last Updated**: October 20, 2025 - Phase 1 & 2 Complete
**Next Update**: After Phase 3 Complete (or per user request)
