# 🚀 START HERE - CompPortal Quick Start for Next Session

**Last Updated**: October 3, 2025
**Production**: https://comp-portal-one.vercel.app
**Current Phase**: RBAC Verified (73%) - Ready for Missing Features Implementation

---

## ⚡ 60-Second Context Load

**Project**: GlowDance Competition Portal (dance competition registration & management)
**Tech Stack**: Next.js 15 + tRPC + Prisma + Supabase + Vercel
**Status**: 🟢 MVP Complete, RBAC Tested, All Critical Bugs Fixed

**Your Next Task**: See `NEXT_SESSION.md` → Recommended: **Quick Wins** (Dancer Edit + Reservation Create UI)

---

## 📋 Essential Files (Read in Order)

### 1️⃣ IMMEDIATE (Read First - 5 min)
- **`NEXT_SESSION.md`** ← Your prioritized task list with time estimates
- **`QUICK_REFERENCE.md`** ← Commands, credentials, common operations

### 2️⃣ CONTEXT (Read as Needed - 10 min)
- **`CompPortal.txt`** ← Main project tracker (updated today)
- **`BUGS_AND_FEATURES.md`** ← Bug tracker + feature specs (Entry Numbering, Real-Time Scoring)
- **`TEST_RESULTS.md`** ← RBAC testing status (22/30 passed)

### 3️⃣ REFERENCE (Read When Implementing - 15 min)
- **`COMPETITION_WORKFLOW.md`** ← Complete industry workflow (500+ lines)
- **`PRODUCTION_ROADMAP.md`** ← 12-16 week development timeline
- **`TEST_CREDENTIALS.md`** ← Demo accounts for testing

---

## 🎯 Current Status Snapshot

**RBAC Testing**: ✅ 22/30 tests passed (73% coverage, 100% pass rate)
- Studio Director: 6/10 passed (missing dancer edit UI)
- Competition Director: 8/10 passed (missing reservation create UI)
- Super Admin: 9/10 passed (missing dancer edit UI)

**Bugs**: ✅ All fixed
- BUG-001: Sign out 405 error → FIXED (commit a29e1e9)
- BUG-002: Reservation approval UUID error → FIXED (commit 0e87fc3)

**Missing Features** (Blocking Tests):
1. **Dancer Edit UI** ← Implement first (1-2 hours)
2. **Reservation Create UI** ← Implement second (2-3 hours)
3. API Testing Infrastructure ← Lower priority

---

## 🚀 Recommended Next Actions

### Option A: Quick Wins (4-6 hours) ⭐ RECOMMENDED
```
1. Create Dancer Edit UI (1-2 hours)
   - File: src/app/dashboard/dancers/[id]/page.tsx
   - Backend already exists: src/server/routers/dancer.ts (update mutation)

2. Create Reservation Create UI (2-3 hours)
   - File: src/app/dashboard/reservations/new/page.tsx
   - Multi-step wizard (competition → spaces → agent → consents)

3. Test & Verify (1 hour)
   - Run SD-8, CD-6, SA-10 tests
   - Achieve 83% RBAC coverage (25/30 tests)
```

### Option B: Major Feature (8-12 hours)
```
Implement Real-Time Scoring & Tabulation System
- See BUGS_AND_FEATURES.md Section 2 for full specs
- Competition day critical feature
- WebSocket implementation required
```

---

## 🔑 Quick Access

### Test Accounts (See TEST_CREDENTIALS.md)
```
Studio Director:     demo.studio@gmail.com / StudioDemo123!
Competition Director: demo.director@gmail.com / DirectorDemo123!
Super Admin:         demo.admin@gmail.com / AdminDemo123!
```

### Common Commands (See QUICK_REFERENCE.md)
```bash
cd /d/ClaudeCode/CompPortal
npm run dev              # Start dev server
npm run build            # Build for production
git status               # Check changes
npx prisma studio        # Database GUI
```

### Important URLs
- **Production**: https://comp-portal-one.vercel.app
- **GitHub**: https://github.com/danman60/CompPortal.git
- **Supabase**: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl

---

## 🗂️ Project Structure

```
CompPortal/
├── START_HERE.md           ← You are here
├── NEXT_SESSION.md         ← Detailed task priorities
├── QUICK_REFERENCE.md      ← Commands & credentials
├── CompPortal.txt          ← Main project tracker
├── BUGS_AND_FEATURES.md    ← Bug tracker + feature specs
├── COMPETITION_WORKFLOW.md ← Industry workflow (500+ lines)
├── PRODUCTION_ROADMAP.md   ← Development timeline
├── TEST_RESULTS.md         ← RBAC testing results
├── TEST_CREDENTIALS.md     ← Test accounts
│
├── src/
│   ├── app/                ← Next.js routes
│   ├── components/         ← React components
│   ├── lib/                ← Utilities
│   └── server/routers/     ← tRPC API (12 routers)
│
├── prisma/
│   └── schema.prisma       ← Database schema
│
└── docs/
    ├── archive/            ← Old docs (75+ files)
    ├── screenshots/        ← Test screenshots
    └── old-tests/          ← Legacy test scripts
```

---

## ⚠️ Known Issues & Gotchas

1. **Prisma Decimal Types**: Always wrap in `Number()` before `.toFixed()` to avoid TypeError
2. **Music Naming**: Entry number prefix should be enforced in validation (currently suggestion only)
3. **Email Bouncing**: Test credential emails may bounce - check Supabase email settings
4. **Schedule Logic**: Conflict detection rules need specification (marked TBD in workflow docs)

---

## 🎯 Success Criteria for Next Session

**Minimum Goal** (Quick Wins):
- [ ] Dancer Edit UI implemented and tested
- [ ] Reservation Create UI implemented and tested
- [ ] RBAC coverage increased to 83% (25/30 tests)

**Stretch Goal** (Major Feature):
- [ ] Real-Time Scoring system MVP (judge interface + live scoreboard)
- [ ] WebSocket integration for live updates
- [ ] Award level auto-categorization working

---

## 💡 Context Management Tips

**Token Budget Strategy**:
- Read START_HERE.md first (this file) - 5 min
- Read NEXT_SESSION.md for task details - 10 min
- Read only relevant sections of COMPETITION_WORKFLOW.md as needed
- Use QUICK_REFERENCE.md for credentials/commands (don't re-read docs)

**Efficient File Reading**:
- Use `offset` and `limit` parameters in Read tool for large files
- Check file size before reading (large files = use targeted reads)
- Reference line numbers when discussing code (e.g., "reservation.ts:327")

**Testing Strategy**:
- Use Playwright MCP for all UI testing (browser automation)
- Test in production after each deploy (https://comp-portal-one.vercel.app)
- Verify RBAC by testing as different users (3 test accounts available)

---

## 🚀 Quick Start Checklist

Before you start coding:
- [ ] Read START_HERE.md (this file) ✅
- [ ] Read NEXT_SESSION.md for your task
- [ ] Check git status (`git status`)
- [ ] Verify production is working (visit URL)
- [ ] Load test credentials (TEST_CREDENTIALS.md)
- [ ] Review relevant feature spec (BUGS_AND_FEATURES.md)

During coding:
- [ ] Use TodoWrite tool to track progress
- [ ] Build frequently (`npm run build`)
- [ ] Test in production after deploy
- [ ] Update relevant docs as you go

After completion:
- [ ] Update TEST_RESULTS.md with new test results
- [ ] Update CompPortal.txt with session summary
- [ ] Git commit with descriptive message
- [ ] Deploy to Vercel and verify

---

**Ready to Start?** → Open `NEXT_SESSION.md` for detailed task breakdown

**Need Quick Reference?** → Open `QUICK_REFERENCE.md` for commands/credentials

**Need Context?** → Open `CompPortal.txt` for full project history
