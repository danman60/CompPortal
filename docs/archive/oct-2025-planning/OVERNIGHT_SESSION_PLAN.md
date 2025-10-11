# Overnight Autonomous Session Plan

**Started**: October 9, 2025
**Demo Date**: Tomorrow (EMPWR client meeting)
**Execution Mode**: CADENCE Protocol (Autonomous)
**Estimated Duration**: 12-18 hours
**Context Budget**: 119k tokens (~15-20 sessions)

---

## 🎯 Critical Success Criteria

For tomorrow's EMPWR demo, MUST have:

✅ EMPWR subdomain working (empwr.compsync.net)
✅ Multi-tenant data isolation (no cross-contamination)
✅ All "GLOWDANCE" → "EMPWR" on landing pages
✅ Non-GLOW competitions assigned to EMPWR tenant
✅ SD user journey polished (loading screens, wizard)
✅ Email notifications firing (CD/SD alerts)
✅ Super admin can view all tenants

---

## 📋 Phase Execution Plan

### Phase 1: Multi-Tenant Foundation (2-3 hours)
**Goal**: Database schema, middleware, RLS policies

- [x] 1.1: Tenant table + tenantId on all tables (Codex)
- [x] 1.2: Middleware for subdomain detection (Codex)
- [x] 1.3: RLS policies for isolation (Claude - security critical)

**Exit Point**: If context <15%, commit progress and document resume point

### Phase 2: SD User Journey Polish (3-4 hours)
**Goal**: Professional onboarding experience

- [x] 2.1: Dashboard loading states (Codex)
- [x] 2.2: Multi-step signup wizard (Codex)
- [x] 2.3: Studio setup wizard (Codex)
- [x] 2.4: Personalization features (Codex)

**Exit Point**: Can demo SD journey even if later phases incomplete

### Phase 3: EMPWR Branding (2-3 hours)
**Goal**: Tenant-specific theming

- [x] 3.1: Theme system (Claude + Codex)
- [x] 3.2: Landing page rebrand (Codex)
- [x] 3.3: Email template branding (Codex)

**Exit Point**: EMPWR looks production-ready for demo

### Phase 4: Email Notifications (1-2 hours)
**Goal**: Automated email triggers

- [x] 4.1: CD notifications (Codex)
- [x] 4.2: SD notifications (Codex)

**Exit Point**: Communication loop complete

### Phase 5: Super Admin Dashboard (2-3 hours)
**Goal**: Owner oversight panel

- [x] 5.1: Super admin role (Claude - auth critical)
- [x] 5.2: Super admin UI (Codex)

**Exit Point**: Can view all tenants from single dashboard

### Phase 6: Quick Wins & Polish (2-3 hours)
**Goal**: Professional finishing touches

- [x] 6.1: Account existence check (Codex)
- [x] 6.2: Studio settings enhancements (Codex)
- [x] 6.3: UI polish (Codex)

**Exit Point**: Platform feels production-ready

### Phase 7: Testing & Deployment (2-3 hours)
**Goal**: Verification and evidence

- [x] 7.1: Multi-tenant testing (Claude)
- [x] 7.2: SD journey E2E (Claude)
- [x] 7.3: Production verification (Claude)

**Exit Point**: Demo-ready with screenshot evidence

---

## 🤖 Codex Delegation Map

**Codex Handles** (10 tasks - boilerplate):
1. Tenant schema migrations
2. Middleware boilerplate
3. Loading state components
4. Signup wizard UI
5. Studio wizard UI
6. Personalization components
7. Landing page updates
8. Email template updates
9. Super admin UI components
10. Studio settings UI

**Claude Handles** (11 tasks - critical):
1. RLS security policies
2. Tenant context integration
3. Theme system integration
4. Super admin auth
5. Email notification triggers
6. Multi-tenant testing
7. E2E testing
8. Production verification
9. Deployment monitoring
10. Integration work (tRPC + Supabase)
11. Morning handoff documentation

---

## 🚨 Circuit Breakers

**Stop and exit cleanly if:**
- Context drops below 15% remaining
- 3+ consecutive Vercel deployment failures
- RLS policies fail Supabase security advisor
- Critical build errors persist after 3 fix attempts

**Exit Protocol:**
1. Complete current atomic task only
2. Commit with WIP marker and exact state
3. Update PROJECT_STATUS.md with resume point
4. Push to GitHub
5. Create OVERNIGHT_SESSION_SUMMARY.md
6. Exit CADENCE loop

---

## 📊 Progress Tracking

Track completion in real-time:
- Update TodoWrite after each phase
- Commit after each major milestone
- Push to trigger Vercel deployment
- Verify with MCP tools (Supabase advisors, Vercel deployment status)

---

## 🎁 Morning Handoff Deliverables

You'll receive:
1. OVERNIGHT_SESSION_SUMMARY.md (complete work log)
2. EMPWR_DEMO_CHECKLIST.md (what to show tomorrow)
3. Production screenshots in `/docs/demo/`
4. All commits pushed to GitHub
5. Vercel deployment verified
6. Known issues documented (if any)
7. Exact resume point for next session

---

**Status**: ACTIVE - Autonomous execution in progress...
