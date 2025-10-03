# Multi-Agent Autonomous Development System

**Project**: GlowDance Competition Portal (CompPortal)
**Version**: 1.0.0
**Activation Command**: `"Start MAAD"`

---

## Overview

This directory contains the Multi-Agent Autonomous Development (MAAD) system for CompPortal. The system enables autonomous, multi-agent development with specialized agents working in coordination to build, test, deploy, and maintain features.

**⚠️ CRITICAL**: This system ONLY activates when the user explicitly says `"Start MAAD"`. It will NOT run autonomously otherwise.

---

## System Architecture

### 7 Specialized Agents

1. **integration-agent** (Priority 1) - Orchestrator
   - Reads project trackers
   - Plans features
   - Delegates to specialists
   - Tests end-to-end
   - Updates documentation

2. **testing-agent** (Priority 2) - QA Specialist
   - Tests production with Playwright
   - Reports bugs with evidence
   - Runs smoke/regression/full suites
   - Tracks test metrics

3. **backend-agent** (Priority 3) - API Developer
   - Builds tRPC routers
   - Creates Zod schemas
   - Implements business logic
   - Fixes backend bugs

4. **frontend-agent** (Priority 4) - UI Developer
   - Creates Next.js pages
   - Builds React components
   - Implements forms
   - Fixes UI bugs

5. **database-agent** (Priority 5) - Schema Manager
   - Applies migrations via Supabase MCP
   - Manages RLS policies
   - Runs security/performance advisors
   - Generates TypeScript types

6. **devops-agent** (Priority 6) - Deployment Monitor
   - Monitors Vercel deployments
   - Parses build errors
   - Checks production health
   - Triggers circuit breakers

7. **cleanup-agent** (Priority 7) - Code Quality
   - Removes dead code (every 5 features)
   - Refactors duplication
   - Simplifies complex functions
   - Tracks cleanup metrics

---

## Workflow

### Standard Feature Flow

```
User: "Start MAAD"
  ↓
integration-agent activates
  ↓
Reads COMPPORTAL.txt, PROJECT_STATUS.md, user journeys
  ↓
Identifies next feature from roadmap
  ↓
Plans feature breakdown
  ↓
Delegates to specialists:
  ├─→ database-agent (if schema changes)
  ├─→ backend-agent (API routes)
  └─→ frontend-agent (UI components)
  ↓
Tests end-to-end with Playwright
  ↓
devops-agent monitors deployment
  ↓
testing-agent runs smoke tests
  ↓
Fixes any bugs immediately
  ↓
Updates logs & trackers
  ↓
Commits & pushes
  ↓
Continues to next feature
```

### Cleanup Cycle (Every 5 Features)

```
After 5 features:
  ↓
cleanup-agent activates
  ├─→ Phase 1: Quick wins (10 min)
  ├─→ Phase 2: File analysis (20 min)
  └─→ Phase 3: Code quality (30 min)
  ↓
testing-agent runs regression suite
  ↓
Bug fix sprint (all agents)
  ↓
Continue with next 5 features
```

---

## MCP Tool Integration

### Supabase MCP (High Usage)
- **Used by**: database, backend, devops, integration
- **Operations**: apply_migration, execute_sql, get_advisors, generate_types
- **Critical for**: Schema changes, data queries, security checks

### Vercel MCP (High Usage)
- **Used by**: devops, integration, frontend
- **Operations**: list_deployments, get_build_logs, web_fetch
- **Critical for**: Deployment monitoring, build error detection

### Playwright MCP (High Usage)
- **Used by**: testing, frontend, integration
- **Operations**: navigate, click, fill, screenshot, evaluate
- **Critical for**: End-to-end testing, UI verification

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

## Anti-Hallucination Rules

### Rule 1: ALWAYS Read Context First
```
BEFORE doing ANYTHING:
1. Read COMPPORTAL.txt (current status)
2. Read PROJECT_STATUS.md (roadmap)
3. Read user journey files (requirements)
4. Check logs for blockers
```

### Rule 2: NEVER Rebuild Existing Features
```
✅ Check COMPPORTAL.txt first
❌ Don't assume features don't exist
✅ Verify in codebase before creating
```

### Rule 3: Use EXACT Prisma Field Names
```
❌ WRONG: competition.start_date
✅ CORRECT: competition.competition_start_date

Always read prisma/schema.prisma first!
```

### Rule 4: ALWAYS Register New Routers
```typescript
// When creating src/server/routers/newRouter.ts
// MUST update src/server/routers/_app.ts:

import { newRouter } from './newRouter'

export const appRouter = router({
  // ... existing routers
  newRouter: newRouter,  // ← ADD THIS
})
```

### Rule 5: Follow UI Patterns
```typescript
// Glassmorphic design (ALWAYS):
className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20"

// Emoji icons ONLY (no external libraries):
<span className="text-4xl">🎭</span>  // ✅ Good
import { FaIcon } from 'react-icons'   // ❌ Never
```

---

## Circuit Breakers

### Deployment Failures
- **Threshold**: 3 consecutive failures
- **Action**: STOP ALL WORK
- **Message**: "3+ consecutive deployment failures - manual intervention required"

### Database Down
- **Threshold**: >5 minutes unreachable
- **Action**: STOP ALL WORK
- **Message**: "Database unreachable - manual intervention required"

---

## Logging Infrastructure

### Progress Tracking
- **logs/PROGRESS_LOG.md** - Feature completions, commits, status
- **logs/CLEANUP_METRICS.md** - Cleanup statistics over time

### Error Tracking
- **logs/ERROR_LOG.md** - Build, runtime, database, test failures
- **logs/BLOCKERS.md** - Issues preventing progress

### Quality Tracking
- **logs/CLEANUP_LOG.md** - Cleanup operations log
- **logs/TEST_LOG.md** - Test execution results

---

## Scripts

### Auto-Cleanup Script
```bash
./scripts/auto-cleanup.sh
```
- Removes OS junk files
- Deletes backup files
- Reports console.log usage
- Reports TypeScript 'any' usage
- Lists large files (>500 lines)

### Test Runner
```bash
./scripts/run-tests.sh [smoke|regression|full]
```
- **smoke**: 5-minute critical tests
- **regression**: 20-minute user journey tests
- **full**: 60-minute comprehensive suite

---

## Project Context (Reference)

**Current Status**:
- **Phase**: Backend Feature Development - 70% Complete
- **Latest Commit**: [check COMPPORTAL.txt]
- **Production**: https://comp-portal-one.vercel.app/
- **Database**: Supabase (cafugvuaatsgihrsmvvl)

**Completed Features** (DON'T REBUILD):
- ✅ Authentication (Supabase Auth)
- ✅ Dancer Management (CSV import, CRUD)
- ✅ Competition Entries (Multi-step wizard)
- ✅ Reservations (600-token system)
- ✅ Invoices (Auto-generation)
- ✅ Email Templates (4 React Email templates)
- ✅ Music Upload (Supabase Storage)
- ✅ Scheduling System (Auto-schedule, conflicts)

**Next Priorities** (BUILD THESE):
1. 🔴 HIGH: Schedule Export (PDF/CSV/iCal)
2. 🔴 HIGH: Judge Tablet Scoring Interface
3. 🔴 HIGH: Analytics Dashboard

---

## Usage

### Activation
User must say: **"Start MAAD"**

### Continuous Autonomous Operation ⚠️
**IMPORTANT**: The system is designed for CONTINUOUS AUTONOMOUS DEVELOPMENT.

**The system will ONLY stop for**:
- ✅ Completion of 100% of roadmap
- ✅ Critical blockers (missing credentials, 3+ build failures, database down)
- ✅ User command: "Stop MAAD"

**The system will NOT stop for**:
- ❌ Low-priority questions (makes autonomous decisions)
- ❌ Optional feature choices (uses best practices)
- ❌ Minor implementation details (follows existing patterns)
- ❌ Testing preferences (runs all available tests)

**Autonomous Decision-Making**:
- Makes reasonable decisions for non-critical questions
- Documents all decisions in logs/PROGRESS_LOG.md
- Continues building without user intervention
- Only stops for CRITICAL issues requiring manual intervention

### Stopping Conditions (Critical Only)
- ✅ Roadmap 100% complete
- ✅ 3+ consecutive build failures
- ✅ Database unreachable >5 minutes
- ✅ Missing critical credentials
- ✅ User says: "Stop MAAD"

### Monitoring
- Check `logs/PROGRESS_LOG.md` for current status
- Check `logs/ERROR_LOG.md` for failures
- Check `logs/BLOCKERS.md` for blockers
- Check `logs/TEST_LOG.md` for test results

---

## Success Metrics

**Per Session**:
- ✅ Features completed (count)
- ✅ Build success rate (>90%)
- ✅ Tests passing (100%)
- ✅ Commits clean (proper format)
- ✅ Documentation updated
- ✅ No regressions

**Overall**:
- ✅ Roadmap progress toward 100%
- ✅ Code quality maintained
- ✅ Production stability
- ✅ Test coverage increasing

---

## Support

**Issues**: Check logs first, then report blockers
**Modifications**: Edit agent .md files as needed
**Configuration**: Update .claude/config.json

---

**Remember**: This is an autonomous system designed to build features while maintaining quality. Trust the agents to do their jobs, but verify progress through logs.

**Version**: 1.0.0
**Last Updated**: October 3, 2025
**Status**: Ready for activation
