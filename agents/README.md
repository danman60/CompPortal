# CADENCE Protocol
**Continuous Autonomous Development Execution with No-pause Continuation Engine**

**Project**: GlowDance Competition Portal (CompPortal)
**Version**: 2.0.0
**Activation**: When user says "continue" during autonomous development sessions

---

## Overview

CADENCE is a 7-agent autonomous development system designed to execute complex software projects without human intervention. Each agent has specialized responsibilities and uses the Task tool to spawn parallel work.

**Key Difference from Single-Agent**: CADENCE uses the Task tool to spawn multiple specialized agents working in parallel, achieving 3-5x speedup on complex features.

---

## The 7 Agents

1. **integration-agent** (Priority 1) - Orchestrator
   - Reads roadmap and project trackers
   - Spawns specialized agents in parallel using Task tool
   - Coordinates feature completion
   - Never pauses or asks for permission
   - See: `agents/integration-agent.md`

2. **testing-agent** (Priority 2) - Quality Assurance
   - Runs Playwright MCP tests in production
   - Reports bugs with specific fixes
   - Validates user journeys
   - Tests after every feature
   - See: `agents/testing-agent.md`

3. **backend-agent** (Priority 3) - API Development
   - Builds tRPC routers with Zod validation
   - Implements business logic
   - Uses exact Prisma field names (never guesses)
   - Adds routers to _app.ts
   - See: `agents/backend-agent.md`

4. **frontend-agent** (Priority 4) - UI Development
   - Creates Next.js pages and React components
   - Follows glassmorphic design patterns
   - Uses emoji icons (no external libraries)
   - Implements server vs client components correctly
   - See: `agents/frontend-agent.md`

5. **database-agent** (Priority 5) - Schema Management
   - Manages Supabase schema via MCP
   - Applies migrations
   - Generates TypeScript types
   - Runs security advisors
   - See: `agents/database-agent.md`

6. **devops-agent** (Priority 6) - Deployment Monitoring
   - Monitors Vercel deployments via MCP
   - Checks build logs
   - Circuit breaker on 3+ failures
   - Validates production health
   - See: `agents/devops-agent.md`

7. **cleanup-agent** (Priority 7) - Code Quality
   - Runs every 5 features
   - Removes unused imports and dead code
   - Extracts duplicate logic to lib/
   - Maintains code standards
   - See: `agents/cleanup-agent.md`

---

## CRITICAL: Multi-Agent Execution Pattern

### ✅ CORRECT - Using Task Tool for Parallel Work

```typescript
// Spawn multiple agents in parallel
const results = await Promise.all([
  Task({
    subagent_type: "general-purpose",
    description: "backend-agent: Build API",
    prompt: readFile('agents/backend-agent.md') + `

      Feature: Competition Settings API
      Files to create:
      - src/server/routers/settings.ts
      - Quality gate: npm run build must pass
    `
  }),
  Task({
    subagent_type: "general-purpose",
    description: "frontend-agent: Build UI",
    prompt: readFile('agents/frontend-agent.md') + `

      Feature: Competition Settings Form
      Files to create:
      - src/components/CompetitionSettingsForm.tsx
      - src/app/dashboard/settings/competition/page.tsx
      - UI: Glassmorphic design, emoji icons
    `
  }),
  Task({
    subagent_type: "general-purpose",
    description: "testing-agent: Run tests",
    prompt: readFile('agents/testing-agent.md') + `

      Test: Competition Settings workflow
      Production URL: https://comp-portal-one.vercel.app
    `
  })
])

console.log("✅ All agents completed in parallel")
```

### ❌ WRONG - Single Agent Working Alone

```typescript
// Don't do this for complex features:
buildBackend()
buildFrontend()
runTests()

// This is sequential and 3-5x slower
```

---

## When to Use CADENCE (Multi-Agent)

**Perfect For**:
- ✅ Complex features requiring 10+ file changes
- ✅ Full-stack features spanning backend + frontend + database
- ✅ Multiple independent features that can run in parallel
- ✅ Urgent production fixes requiring parallel investigation
- ✅ Large refactors affecting many routers/components

**Not Needed For**:
- ❌ Simple 1-2 file changes
- ❌ Quick bug fixes
- ❌ Documentation updates
- ❌ Small iterative improvements

---

## CADENCE Execution Loop

See `agents/integration-agent.md` for the complete orchestrator logic, including:

1. **Mandatory doc reading** (COMPPORTAL.txt, PROJECT_STATUS.md, user journeys)
2. **Feature identification** from roadmap
3. **Agent spawning** in parallel using Task tool
4. **Testing** after completion
5. **Commit & push** without asking
6. **Immediate continuation** to next feature

---

## Quality Gates

**Before EVERY commit**:
- ✅ `npm run build` succeeds
- ✅ All routes compile
- ✅ No TypeScript errors
- ✅ All imports resolve
- ✅ New router registered in _app.ts (if created)
- ✅ Prisma field names match schema
- ✅ UI follows glassmorphic pattern
- ✅ Components use 'use client' where needed

---

## Circuit Breakers (Auto-Stop Conditions)

### Deployment Failures
- **Threshold**: 3 consecutive failures
- **Action**: STOP ALL WORK, create BLOCKER.md
- **Message**: "3+ consecutive deployment failures - manual intervention required"

### Database Errors
- **Threshold**: Critical migration failure or unreachable >5 minutes
- **Action**: STOP ALL WORK, create BLOCKER.md
- **Message**: "Database error - manual intervention required"

### Missing Credentials
- **Threshold**: API keys, database URLs, auth tokens missing
- **Action**: STOP ALL WORK, create BLOCKER.md
- **Message**: "Missing credentials - manual intervention required"

---

## Templates

See `agents/templates/` for:
- **spawn-parallel.md** - Parallel agent spawning template
- **spawn-sequential.md** - Sequential spawning when agents have dependencies

---

## Current CompPortal Status (Reference)

**Completed Features** (DON'T REBUILD):
- ✅ Authentication (Supabase Auth)
- ✅ Dancer Management (CSV import, CRUD, batch input)
- ✅ Competition Entries (Multi-step wizard)
- ✅ Reservations (600-token system)
- ✅ Invoices (Auto-generation, global view, payment tracking)
- ✅ Email Templates (4 React Email templates)
- ✅ Music Upload (Supabase Storage)
- ✅ Scheduling System (Auto-schedule, conflicts)
- ✅ Dancer Assignment (Two-panel click-to-assign)
- ✅ Dashboard Metrics (Unpaid invoices)

**Next Priorities** (BUILD THESE):
1. 🔴 HIGH: Competition Settings (FEAT-CompetitionSettings)
2. 🔴 HIGH: Schedule Export (PDF/CSV/iCal)
3. 🔴 HIGH: Judge Tablet Scoring Interface

---

## Success Metrics

A CADENCE session is successful when:
- ✅ Multiple agents spawned in parallel using Task tool
- ✅ No pauses or permission requests
- ✅ All features completed and tested
- ✅ Documentation updated automatically
- ✅ Roadmap progress measurable
- ✅ Builds passing
- ✅ Commits clean and descriptive

---

## Support

**Agent Details**: See individual agent `.md` files in this directory
**Templates**: See `agents/templates/` for spawning patterns
**Issues**: Check logs/ERROR_LOG.md, create BLOCKER.md if critical

---

**Version**: 2.0.0 (CADENCE)
**Last Updated**: October 4, 2025
**Status**: Ready for multi-agent autonomous development
