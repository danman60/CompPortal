# Testing Setup Guide

**For**: Major Testing Week (October 23-27, 2025)
**Prepared**: October 16, 2025
**Estimated Setup Time**: 2-3 hours

---

## 🎯 Pre-Testing Checklist

Complete these tasks BEFORE testing begins:

### Database Setup
- [ ] Run database wipe script (creates clean demo data)
- [ ] Verify 3 demo accounts work (cd@demo.com, sd1@demo.com, sd2@demo.com)
- [ ] Verify sample competition exists ("EMPWR Dance Challenge 2025")
- [ ] Verify sample dancers exist (Emily, Sophia, Olivia, Ava, Isabella)

### Configuration Verification
- [ ] Tax rate is set in Competition Settings (test with 7%)
- [ ] Email sending is enabled (check .env for RESEND_API_KEY)
- [ ] Supabase Storage is accessible (test music upload)
- [ ] All environment variables are set in Vercel

### Documentation
- [ ] Share KNOWN_ISSUES.md with testers
- [ ] Share bug report template
- [ ] Create Slack/Discord channel for testing communication
- [ ] Schedule daily standup during testing week (15 min)

### Code Quality
- [ ] Run `npm run build` - verify no errors
- [ ] Fix hardcoded pricing bug (Priority 1)
- [ ] Check for console errors on main pages
- [ ] Test critical flows yourself first

---

## 🗄️ Database Setup

### Step 1: Run Database Wipe Script

**Method 1 - Supabase Dashboard** (Easiest):
1. Go to https://supabase.com/dashboard/project/dnrlcrgchqruyuqedtwi
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Copy entire contents of `scripts/wipe-database-keep-demos.sql`
5. Paste into SQL Editor
6. Click "Run" (Ctrl/Cmd + Enter)
7. Wait 10-15 seconds for completion
8. Verify: Should see "Query executed successfully" + row counts

**Method 2 - Supabase CLI**:
```bash
cd D:\ClaudeCode\CompPortal
npx supabase db execute --file scripts/wipe-database-keep-demos.sql --project-ref dnrlcrgchqruyuqedtwi
```

### Step 2: Verify Demo Accounts

Test login for each account:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| cd@demo.com | password123 | Competition Director | Approve reservations, create invoices |
| sd1@demo.com | password123 | Studio Director | Create routines, view invoices |
| sd2@demo.com | password123 | Studio Director | Secondary studio for multi-studio testing |

**Verification**:
```
1. Go to https://comp-portal-one.vercel.app/login
2. Log in with each account
3. Verify dashboard loads
4. Verify correct role displayed in top-right corner
5. Log out
```

### Step 3: Verify Sample Data

After wipe script runs, you should have:

**Competition**:
- Name: "EMPWR Dance Challenge 2025"
- Status: Active
- Available tokens: 600
- Has pricing configured

**Reservation** (for Demo Studio 1):
- Status: Approved
- Spaces confirmed: 10 routines
- No entries created yet (testers will create these)

**Dancers** (for Demo Studio 1):
- Emily Johnson
- Sophia Martinez
- Olivia Davis
- Ava Wilson
- Isabella Brown

**Verification**:
```
1. Log in as sd1@demo.com
2. Go to Dancers page → Should see 5 dancers
3. Go to Reservations page → Should see 1 approved reservation
4. Go to Competitions dropdown → Should see "EMPWR Dance Challenge 2025"
```

---

## ⚙️ Configuration Verification

### 1. Competition Settings (Tax Rate)

**Why**: Test invoice tax calculations

**Steps**:
1. Log in as cd@demo.com
2. Go to Dashboard → Competitions
3. Click "EMPWR Dance Challenge 2025"
4. Click "Settings" tab
5. Scroll to "Tax Rate"
6. Set to `0.0700` (7%)
7. Click "Save"

**Verify**: Create test invoice → should show 7% tax line item

---

### 2. Email Sending

**Check Environment Variable**:
```bash
# In Vercel Dashboard:
# Project Settings → Environment Variables
# Verify: RESEND_API_KEY exists and is set
```

**Test Email Sending**:
```
1. Log in as cd@demo.com
2. Approve a new reservation
3. Check email for approval notification
4. If no email: Check browser console for errors
5. If errors: Email sending is broken (report to dev)
```

---

### 3. Supabase Storage (Music Uploads)

**Test Upload**:
```
1. Log in as sd1@demo.com
2. Create a test routine
3. Go to routine → Music Upload page
4. Upload a small MP3 file (< 5MB)
5. Wait 10 seconds
6. Verify "Music Uploaded" badge shows green checkmark
```

**If Upload Fails**:
```bash
# Check Supabase Storage policies:
# 1. Go to Supabase Dashboard → Storage → music-files
# 2. Click "Policies" tab
# 3. Verify policy exists: "Studio Directors can upload music"
# 4. If missing: Click "New Policy" → Allow INSERT for authenticated users
```

---

### 4. Environment Variables (Vercel)

**Required Variables**:
```bash
DATABASE_URL=postgresql://...  # Supabase connection string
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
RESEND_API_KEY=re_...  # Email sending
NEXT_PUBLIC_APP_URL=https://comp-portal-one.vercel.app
```

**Verify in Vercel**:
1. Go to https://vercel.com/dashboard
2. Select "comp-portal-one" project
3. Settings → Environment Variables
4. Check all 5 variables exist
5. If missing: Add them and redeploy

---

## 📋 Testing Communication Setup

### 1. Create Testing Channel

**Slack** (Recommended):
```
Channel Name: #compportal-testing
Purpose: Bug reports, questions, daily updates
Members: All testers + developers
Pin: Link to KNOWN_ISSUES.md
Pin: Bug report template
```

**Discord** (Alternative):
```
Channel Name: compportal-testing
Category: Testing
Permissions: Read/Write for testers
```

### 2. Share Documentation

**Send to all testers**:
- Link to KNOWN_ISSUES.md
- Bug report template (from KNOWN_ISSUES.md)
- Demo account credentials
- Testing scenarios (from KNOWN_ISSUES.md)
- Your contact info (Slack, email, phone)

**Email Template**:
```
Subject: CompPortal Testing Week - Getting Started

Hi team,

We're kicking off major testing next week! Here's what you need to know:

📚 Documentation:
- Known Issues: [link to KNOWN_ISSUES.md]
- How to report bugs: [link to section in doc]

🔑 Test Accounts:
- Competition Director: cd@demo.com / password123
- Studio Director 1: sd1@demo.com / password123
- Studio Director 2: sd2@demo.com / password123

🌐 Testing URL: https://comp-portal-one.vercel.app/

💬 Questions/Bugs: Post in #compportal-testing Slack channel

📅 Daily Standup: [Time] in [Location/Zoom]

Let's break things! 🎉

[Your Name]
```

### 3. Schedule Daily Standup

**Time**: 9:00 AM or 5:00 PM (choose one)
**Duration**: 15 minutes MAX
**Format**:
```
Each tester reports (2 min max):
1. What I tested yesterday
2. Bugs found (count + severity)
3. What I'm testing today
4. Any blockers

Developer reports (3 min max):
1. Bugs fixed since yesterday
2. Known issues still being worked on
3. Testing priorities for today
```

---

## 🔧 Quick Fixes Before Testing

### Fix #1: Hardcoded Pricing (CRITICAL)

**Run this prompt**:
```
Read docs/REFACTORING_RECOMMENDATIONS.md and implement Priority 1.
```

**Verify Fix**:
1. Create 3 entries with different fees ($30, $50, $75)
2. Check summary bar
3. Should show $155.00 (not $150.00)

---

### Fix #2: Check Console Errors

**Steps**:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Navigate to all main pages:
   - Dashboard
   - Entries List
   - Reservations
   - Invoices
   - Settings
4. Look for RED errors (warnings are OK)
5. Fix any critical errors

**Common Errors to Check**:
- 404s for missing files
- CORS errors
- Authentication errors
- Database connection errors

---

### Fix #3: Build Verification

**Run**:
```bash
cd D:\ClaudeCode\CompPortal
npm run build
```

**Expected Output**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (55/55)
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB    120 kB
├ ○ /login                               8.1 kB    125 kB
...
```

**If Build Fails**:
- Read error message carefully
- Fix TypeScript errors first
- Fix missing imports
- Fix syntax errors
- Re-run `npm run build` until it passes

---

## 🧪 Self-Test Critical Flows

Before handing off to testers, test these yourself:

### Flow 1: New Studio Registration (10 min)
```
1. Sign up as newstudio@test.com
2. Complete onboarding form
3. Create 3 dancers
4. Request reservation (5 routines)
5. Switch to CD account
6. Approve reservation
7. Switch back to SD account
8. Create 5 routines
9. Upload music for 2 routines
10. Submit summary
```

**Expected**: All steps complete without errors

---

### Flow 2: Invoice Generation (5 min)
```
1. Log in as cd@demo.com
2. Go to Reservation Pipeline
3. Click "Create Invoice" for approved reservation
4. Verify invoice shows correct totals
5. Click "Send Invoice"
6. Log in as sd1@demo.com
7. Go to Invoices
8. Verify invoice is visible
9. Check line items match entries
```

**Expected**: Invoice reflects accurate pricing

---

### Flow 3: Bulk Operations (5 min)
```
1. Log in as sd1@demo.com
2. Go to Dancers
3. Click "Import" → upload CSV with 10 dancers
4. Verify all 10 imported successfully
5. Go to Entries
6. Select 5 entries in table view (Ctrl+A)
7. Click "Delete Selected"
8. Verify deletion confirmation
```

**Expected**: Bulk operations work without errors

---

## 📊 Monitoring During Testing Week

### Daily Metrics to Track

**Bug Count by Severity**:
- 🔴 Critical (app broken): 0 target
- 🟠 High (workflow blocked): < 3 per day
- 🟡 Medium (workaround exists): < 10 per day
- 🟢 Low (cosmetic): unlimited

**Resolution Time**:
- Critical: < 2 hours
- High: < 1 day
- Medium: < 3 days
- Low: Backlog (post-testing)

**Test Coverage**:
- [ ] All user roles tested (CD, SD)
- [ ] All main workflows tested (signup → invoice)
- [ ] Mobile testing completed
- [ ] Edge cases tested (invalid inputs, etc.)
- [ ] Performance tested (100+ entries)

---

## 🚨 Emergency Procedures

### If Production Goes Down

**Steps**:
1. Check Vercel status: https://vercel.com/status
2. Check Supabase status: https://status.supabase.com
3. Check recent deployments in Vercel Dashboard
4. If recent deploy caused it: Rollback to previous deployment
5. If external service: Wait for status page updates
6. Communicate downtime in testing channel

**Rollback in Vercel**:
```
1. Go to Vercel Dashboard → comp-portal-one
2. Click "Deployments" tab
3. Find last working deployment
4. Click "..." → "Promote to Production"
5. Wait 1-2 minutes for DNS propagation
6. Test site is back up
```

---

### If Database Gets Corrupted

**Steps**:
1. Don't panic - we have backups
2. Run wipe script again (creates fresh state)
3. Re-run self-test flows
4. Resume testing

**Note**: Testing data is expendable. Better to wipe and start fresh than debug corrupted test data.

---

## ✅ Pre-Testing Day Checklist

**Day Before Testing Starts**:
- [ ] Run database wipe script
- [ ] Test all 3 demo accounts
- [ ] Fix hardcoded pricing bug
- [ ] Run `npm run build` successfully
- [ ] Self-test all 3 critical flows
- [ ] Send email to testers with docs/credentials
- [ ] Create testing Slack channel
- [ ] Schedule daily standups
- [ ] Set up bug tracking (GitHub Issues)
- [ ] Clear your schedule for rapid bug fixes

---

## 🎉 Testing Week Success Criteria

**By End of Week**:
- [ ] Zero critical bugs remain
- [ ] All high-priority bugs fixed or have workarounds
- [ ] Test coverage > 80% (all major workflows tested)
- [ ] Performance acceptable (page loads < 3 seconds)
- [ ] Mobile experience tested and approved
- [ ] Documentation updated based on tester feedback
- [ ] Confidence level: 95%+ for production launch

---

## 📞 Support During Testing

**Availability**:
- Mon-Fri: 9 AM - 6 PM (rapid response)
- Evenings: Check Slack periodically
- Weekends: Emergency only

**Response Times**:
- Critical bug: < 1 hour
- High priority: < 4 hours
- Medium/Low: Next business day

**Contact Methods** (in order of urgency):
1. Critical: Call/text [your phone]
2. High: Slack DM
3. Medium: #compportal-testing channel
4. Low: GitHub Issue

---

Good luck with testing! 🚀

*Remember: Every bug found in testing is a bug NOT found in production.*
