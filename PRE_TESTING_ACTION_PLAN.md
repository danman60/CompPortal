# Pre-Testing Action Plan

**Status**: Ready to Execute
**Time Required**: 2-3 hours
**Goal**: Maximum testing success next week

---

## 🚀 Execute This Plan Right Now

### **PHASE 1: CRITICAL FIXES** (1 hour)

#### ✅ Task 1.1: Fix Hardcoded Pricing Bug
**Priority**: CRITICAL - Blocks accurate testing
**Time**: 15 min

```bash
# Run this prompt:
Read docs/REFACTORING_RECOMMENDATIONS.md and implement Priority 1.
```

**Verify**:
```bash
npm run build
# Should succeed with no errors
```

**Test**:
1. Go to https://comp-portal-one.vercel.app/dashboard/entries
2. Create 3 test entries with fees: $30, $50, $75
3. Check summary bar shows: $155.00 (not $150.00)
4. ✅ Pass: Real total shown | ❌ Fail: Still shows $50 × count

---

#### ✅ Task 1.2: Run Build Verification
**Priority**: HIGH - Catch errors early
**Time**: 10 min

```bash
cd D:\ClaudeCode\CompPortal
npm run build
```

**Expected**: ✓ Compiled successfully (55 routes)

**If Fails**:
- Read error messages
- Fix TypeScript errors
- Fix missing imports
- Re-run until passes
- Commit fixes

---

#### ✅ Task 1.3: Check Console Errors
**Priority**: HIGH - Fix before testers report
**Time**: 15 min

**Steps**:
1. Open https://comp-portal-one.vercel.app in Chrome
2. Open DevTools (F12) → Console tab
3. Navigate to each page, look for RED errors:
   - Dashboard
   - /dashboard/entries
   - /dashboard/reservations
   - /dashboard/invoices
   - /dashboard/settings
4. Screenshot any errors
5. Fix critical ones (auth, database, CORS)
6. Warnings are OK, errors are NOT

---

#### ✅ Task 1.4: Verify Demo Accounts Work
**Priority**: HIGH - Testers need these
**Time**: 10 min

**Test Each Account**:

| Email | Password | Expected Role | Test Login |
|-------|----------|---------------|------------|
| cd@demo.com | password123 | Competition Director | ✅ / ❌ |
| sd1@demo.com | password123 | Studio Director | ✅ / ❌ |
| sd2@demo.com | password123 | Studio Director | ✅ / ❌ |

**If Fails**: Run database wipe script (Task 2.1)

---

#### ✅ Task 1.5: Self-Test Critical Flow
**Priority**: HIGH - Don't ship broken workflows
**Time**: 10 min

**Flow**: New Studio → Reservation → Entries → Invoice

```
1. Sign up as test@example.com / password123
2. Complete onboarding (studio name: "Test Studio")
3. Create 3 dancers
4. Request reservation (5 routines)
5. Switch to cd@demo.com
6. Approve reservation (allocate 5 spaces)
7. Switch back to test@example.com
8. Create 5 routines
9. Upload music for 1 routine
10. Submit summary
11. Switch to cd@demo.com
12. Create invoice for "Test Studio"
13. Verify invoice total is correct (not $0)
```

**Pass Criteria**: All 13 steps complete without errors

---

### **PHASE 2: DATABASE SETUP** (30 min)

#### ✅ Task 2.1: Run Database Wipe Script
**Priority**: HIGH - Clean test environment
**Time**: 15 min

**Method 1 - Supabase Dashboard** (Easiest):
```
1. Go to: https://supabase.com/dashboard/project/dnrlcrgchqruyuqedtwi
2. Click "SQL Editor" (left sidebar)
3. Click "New Query"
4. Open: D:\ClaudeCode\CompPortal\scripts\wipe-database-keep-demos.sql
5. Copy entire file contents
6. Paste into SQL Editor
7. Click "Run" (or Ctrl+Enter)
8. Wait 10-15 seconds
9. Should see: "Query executed successfully"
```

**Verify Demo Data Created**:
```
1. Log in as sd1@demo.com
2. Go to Dancers → Should see 5 dancers
3. Go to Reservations → Should see 1 approved reservation
4. Go to Competitions dropdown → Should see "EMPWR Dance Challenge 2025"
```

---

#### ✅ Task 2.2: Configure Tax Rate for Testing
**Priority**: MEDIUM - Test invoice calculations
**Time**: 5 min

```
1. Log in as cd@demo.com
2. Dashboard → Competitions
3. Click "EMPWR Dance Challenge 2025"
4. Click "Settings" tab
5. Find "Tax Rate" field
6. Enter: 0.0700 (7% tax)
7. Click "Save"
```

**Verify**: Create test invoice → should show tax line item

---

#### ✅ Task 2.3: Test Music Upload
**Priority**: MEDIUM - Critical feature
**Time**: 10 min

```
1. Log in as sd1@demo.com
2. Create a test routine
3. Go to routine → Music Upload page
4. Download test MP3: https://file-examples.com/storage/fe7f07d19a32fca9e11ab87/2017/11/file_example_MP3_700KB.mp3
5. Upload the MP3
6. Wait 30 seconds
7. Verify "Music Uploaded" badge shows green ✅
```

**If Upload Fails**:
- Check Supabase Storage policies
- Check .env has NEXT_PUBLIC_SUPABASE_URL
- Check browser console for errors
- Report to dev if still broken

---

### **PHASE 3: DOCUMENTATION** (45 min)

#### ✅ Task 3.1: Share Docs with Testers
**Priority**: HIGH - They need guidance
**Time**: 15 min

**Create Testing Package**:
1. Open Google Drive / Dropbox / OneDrive
2. Create folder: "CompPortal Testing Week"
3. Upload these docs:
   - `docs/KNOWN_ISSUES.md`
   - `docs/TESTING_SETUP_GUIDE.md`
4. Share folder link with testers
5. Add permissions (view-only is fine)

**Send Email**:
```
Subject: CompPortal Testing - Get Started

Hi team,

Testing starts next week! Here's your starter pack:

📚 Documentation: [link to folder]
🔑 Credentials: See TESTING_SETUP_GUIDE.md
🌐 Testing URL: https://comp-portal-one.vercel.app/
💬 Questions: #compportal-testing Slack channel

Demo Accounts:
- Competition Director: cd@demo.com / password123
- Studio Director 1: sd1@demo.com / password123
- Studio Director 2: sd2@demo.com / password123

Please read KNOWN_ISSUES.md before reporting bugs!

Thanks,
[Your Name]
```

---

#### ✅ Task 3.2: Create Testing Slack Channel
**Priority**: MEDIUM - Centralized communication
**Time**: 10 min

**Setup**:
```
1. Create channel: #compportal-testing
2. Add description: "Bug reports & questions for CompPortal testing week"
3. Invite all testers
4. Pin message with:
   - Link to documentation
   - Demo credentials
   - Bug report template
   - Your contact info
```

**Pin This Message**:
```
🧪 CompPortal Testing Resources

📋 Docs: [link]
🔑 Credentials: cd@demo.com, sd1@demo.com, sd2@demo.com (all: password123)
🌐 URL: https://comp-portal-one.vercel.app/

🐛 Report bugs using this template:
**Summary**: [one sentence]
**Role**: Competition Director / Studio Director
**Steps**: 1. 2. 3.
**Expected**: [what should happen]
**Actual**: [what happened]
**Screenshots**: [if applicable]

📞 Urgent issues: DM @[your name]
```

---

#### ✅ Task 3.3: Setup Bug Tracking
**Priority**: MEDIUM - Organized issue management
**Time**: 20 min

**GitHub Issues Setup**:
```
1. Go to: https://github.com/[your-org]/CompPortal/issues
2. Create labels:
   - bug (red)
   - high-priority (orange)
   - medium-priority (yellow)
   - low-priority (blue)
   - testing (purple)
   - known-issue (gray)
3. Create issue templates (Settings → Features → Issues → Set up templates)
```

**Bug Report Template** (.github/ISSUE_TEMPLATE/bug_report.md):
```markdown
---
name: Bug Report
about: Report a bug found during testing
title: '[BUG] '
labels: bug, testing
---

## Summary
[One sentence description]

## Role
- [ ] Competition Director
- [ ] Studio Director

## Steps to Reproduce
1. Go to [page]
2. Click [button]
3. Enter [data]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happened]

## Screenshots
[If applicable]

## Environment
- Browser: [Chrome/Firefox/Safari + version]
- Device: [Desktop/Mobile/Tablet]
- Account: [cd@demo.com / sd1@demo.com / sd2@demo.com]

## Console Errors
[Open DevTools → Console, paste any red errors here]
```

---

### **PHASE 4: OPTIONAL QUICK WINS** (30-60 min)

These improve testing experience but aren't critical:

#### ⭐ Task 4.1: Extract StatusBadge Component
**Priority**: LOW - Nice to have
**Time**: 30 min

```bash
# Run this prompt:
Read docs/REFACTORING_RECOMMENDATIONS.md and implement Priority 2.
```

**Benefit**: Consistent status badges, cleaner code

**Skip if**: Running out of time

---

#### ⭐ Task 4.2: Add Error Boundaries
**Priority**: LOW - Prevents white screen crashes
**Time**: 30 min

Create `src/components/ErrorBoundary.tsx`:
```tsx
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-8 max-w-md">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap main layout in `src/app/layout.tsx`:
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Benefit**: Crashes show error message instead of white screen

**Skip if**: No time left

---

## 📊 Completion Checklist

Mark each task as you complete it:

### Phase 1: Critical Fixes (MUST DO)
- [ ] Task 1.1: Fix hardcoded pricing bug ✅
- [ ] Task 1.2: Run build verification ✅
- [ ] Task 1.3: Check console errors ✅
- [ ] Task 1.4: Verify demo accounts work ✅
- [ ] Task 1.5: Self-test critical flow ✅

### Phase 2: Database Setup (MUST DO)
- [ ] Task 2.1: Run database wipe script ✅
- [ ] Task 2.2: Configure tax rate ✅
- [ ] Task 2.3: Test music upload ✅

### Phase 3: Documentation (SHOULD DO)
- [ ] Task 3.1: Share docs with testers ✅
- [ ] Task 3.2: Create testing Slack channel ✅
- [ ] Task 3.3: Setup bug tracking ✅

### Phase 4: Optional Quick Wins (NICE TO HAVE)
- [ ] Task 4.1: Extract StatusBadge component ⭐
- [ ] Task 4.2: Add error boundaries ⭐

---

## 🎯 Success Criteria

**Ready for Testing When**:
- ✅ All Phase 1 tasks complete (critical fixes)
- ✅ All Phase 2 tasks complete (database ready)
- ✅ All Phase 3 tasks complete (docs shared)
- ✅ Build passes without errors
- ✅ Demo accounts work
- ✅ Critical flow works end-to-end
- ✅ Testers have credentials and docs

**Confidence Level**: 95%+ for successful testing week

---

## ⏰ Time Estimates

| Phase | Required? | Time | When |
|-------|-----------|------|------|
| Phase 1 | ✅ MUST | 1 hour | Today |
| Phase 2 | ✅ MUST | 30 min | Today |
| Phase 3 | ✅ SHOULD | 45 min | Today/Tomorrow |
| Phase 4 | ⭐ NICE | 1 hour | If time allows |
| **Total** | | **2-3 hours** | **Before Monday** |

---

## 🚨 If You Run Out of Time

**Minimum to Ship**:
1. ✅ Fix hardcoded pricing (Task 1.1)
2. ✅ Build passes (Task 1.2)
3. ✅ Demo accounts work (Task 1.4)
4. ✅ Share credentials with testers (Task 3.1 email only)

**Everything else can be done Monday morning** (but try to finish!)

---

## 📞 Emergency Help

If stuck on any task:
1. Check error messages carefully
2. Search GitHub Issues for similar problems
3. Ask in Slack #compportal-dev
4. DM the dev team lead

**Don't waste more than 15 minutes stuck on one task** - ask for help!

---

## ✅ Final Check Before Testing Week

**Day Before Testing (Sunday/Monday Morning)**:
```bash
# 1. Verify build
npm run build

# 2. Verify demo accounts (visit site, log in each)
# https://comp-portal-one.vercel.app/login

# 3. Verify docs shared (check email sent)

# 4. Verify Slack channel created

# 5. Clear your calendar for rapid bug fixes
```

**You're ready when**:
- All must-do tasks checked ✅
- Testers have credentials
- You've tested critical flow yourself
- You're mentally prepared for chaos 😄

---

🎉 **Good luck! Let's have a successful testing week!** 🎉

*Remember: Bugs found in testing = bugs NOT found in production*
