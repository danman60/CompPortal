# MCP Tools Usage Guide

**Purpose**: When and how to call MCP tools efficiently
**Goal**: Minimize token usage while maintaining quality

---

## MCP Tools Available

### Supabase MCP
- `search_docs` - Search Supabase documentation
- `list_tables` - List database tables
- `execute_sql` - Run SQL queries
- `apply_migration` - Apply database migrations
- `get_advisors` - Get security/performance recommendations
- `generate_typescript_types` - Generate Prisma types

### Vercel MCP
- `list_projects` - List all projects
- `get_project` - Get project details
- `list_deployments` - List deployments
- `get_deployment` - Get deployment status
- `get_deployment_build_logs` - Get build logs
- `web_fetch_vercel_url` - Fetch deployment URL

### Playwright MCP
- `browser_navigate` - Navigate to URL
- `browser_click` - Click elements
- `browser_fill` - Fill form fields
- `browser_snapshot` - Capture accessibility snapshot
- `browser_take_screenshot` - Take screenshot
- `browser_evaluate` - Run JavaScript

---

## Usage Patterns

### Always Call (Critical)

**Database Migrations**:
```typescript
// ALWAYS use when changing schema
supabase:apply_migration({
  name: "20251011_add_feature",
  sql: "ALTER TABLE ..."
})

// ALWAYS follow with security check
supabase:get_advisors({ type: "security" })
supabase:get_advisors({ type: "performance" })
```

**Token Cost**: ~6k tokens (2k + 2k + 2k)
**Justification**: Critical for data integrity

---

### Call Selectively (Context-Dependent)

**Deployment Verification**:
```typescript
// ✅ CALL IF: Build failed locally OR critical feature
vercel:get_deployments({ limit: 1 })

if (deploy.state === "ERROR") {
  vercel:get_deployment_build_logs({ deploymentId: deploy.id })
}

// ❌ DON'T CALL IF: Build passed locally + minor change
```

**Token Cost**: ~8k tokens (3k + 5k logs)
**When to skip**: Minor UI tweaks, documentation updates

---

**Production UI Testing**:
```typescript
// ✅ CALL IF: UI changes OR user-facing features
const PROD_URL = 'http://compsync.net'
playwright.navigate(PROD_URL + '/feature')
playwright.screenshot('verified.png')

// ❌ DON'T CALL IF: Backend-only changes
```

**Token Cost**: ~5k tokens
**When to skip**: API changes, database migrations, refactoring

---

**Type Generation**:
```typescript
// ✅ CALL IF: Schema changed (new tables/fields)
supabase:generate_typescript_types()

// ❌ DON'T CALL IF: No schema changes
```

**Token Cost**: ~3k tokens
**When to skip**: UI changes, business logic updates

---

### Never Call (Wasteful)

**Getting Known URLs**:
```typescript
// ❌ WASTEFUL (15k tokens)
const deploy = await vercel:get_deployments({ limit: 1 })
const url = deploy.url

// ✅ EFFICIENT (0 tokens)
const PROD_URL = 'http://compsync.net'  // Hardcoded
```

**Fetching Supabase Docs for Known Info**:
```typescript
// ❌ WASTEFUL
supabase:search_docs({ topic: "RLS policies" })

// ✅ EFFICIENT - Use cached knowledge or docs/reference/
```

---

## Decision Matrix

| Scenario | Supabase Advisor | Vercel Deploy | Playwright | Type Gen |
|----------|------------------|---------------|------------|----------|
| Schema change | ✅ ALWAYS | ⚠️ If fails locally | ❌ Skip | ✅ ALWAYS |
| UI feature | ❌ Skip | ⚠️ If critical | ✅ ALWAYS | ❌ Skip |
| API change | ❌ Skip | ⚠️ If fails locally | ❌ Skip | ❌ Skip |
| Bug fix | ❌ Skip | ✅ After push | ⚠️ If UI affected | ❌ Skip |
| Refactor | ❌ Skip | ⚠️ If complex | ❌ Skip | ❌ Skip |
| Docs | ❌ Skip | ❌ Skip | ❌ Skip | ❌ Skip |

**Legend**:
- ✅ ALWAYS - Required for quality
- ⚠️ CONDITIONAL - Based on change complexity
- ❌ SKIP - Not needed, wastes tokens

---

## Token Optimization Examples

### Example 1: Add New Component (UI Only)

```bash
# Changes: Created src/components/NewCard.tsx
# No schema changes, no API changes

# MCP Calls:
✅ playwright.navigate + screenshot (5k tokens)
❌ Skip supabase:get_advisors (not needed)
❌ Skip vercel:get_deployments (build passed locally)
❌ Skip supabase:generate_typescript_types (no schema change)

Total: 5k tokens (vs 18k if all called)
Savings: 72%
```

### Example 2: Database Migration

```bash
# Changes: Added new table, updated RLS policies

# MCP Calls:
✅ supabase:apply_migration (2k tokens)
✅ supabase:get_advisors (security) (2k tokens)
✅ supabase:get_advisors (performance) (2k tokens)
✅ supabase:generate_typescript_types (3k tokens)
❌ Skip playwright (no UI changes)
⚠️ vercel:get_deployments only if build fails (0 tokens if passes)

Total: 9k tokens (selective)
vs: 24k tokens (if all called)
Savings: 63%
```

### Example 3: Bug Fix (Backend Logic)

```bash
# Changes: Fixed validation in src/server/routers/entry.ts

# MCP Calls:
❌ Skip supabase tools (no schema change)
✅ vercel:get_deployments (critical fix) (3k tokens)
⚠️ playwright only if UI affected (skip if backend-only) (0 tokens)

Total: 3k tokens
vs: 18k tokens (if all called)
Savings: 83%
```

---

## Circuit Breakers

**If MCP tool fails 3+ times in a row**:
1. STOP calling that tool
2. Create `BLOCKER.md` with:
   - Tool name
   - Error messages
   - Attempted calls
   - Impact on development
3. Switch to manual verification if possible
4. Document workaround

**If 3+ Vercel deployments fail**:
1. STOP ALL WORK immediately
2. Create `BLOCKER.md`
3. Rollback to last working commit
4. Investigate root cause before continuing

---

## Best Practices

### 1. Hardcode Known Values
```typescript
// Known production URLs
const PROD_URL = 'http://compsync.net'
const VERCEL_URL = 'https://comp-portal-one.vercel.app'

// Known database info (from .env)
// Don't call MCP to get project_ref
```

### 2. Batch MCP Calls When Possible
```typescript
// ✅ GOOD - Parallel
await Promise.all([
  supabase:get_advisors({ type: "security" }),
  supabase:get_advisors({ type: "performance" })
])

// ❌ BAD - Sequential
await supabase:get_advisors({ type: "security" })
await supabase:get_advisors({ type: "performance" })
```

### 3. Cache MCP Results
```typescript
// If you need deployment info multiple times
const deploy = await vercel:get_deployments({ limit: 1 })
// Store in memory, don't call again this session
```

### 4. Skip MCP for Non-Critical Changes
```typescript
// Documentation updates, comment changes, formatting
// Don't call ANY MCP tools - just commit and push
```

---

## Token Budget Planning

**Per Feature Budget**: ~10-12k tokens total

| Activity | Tokens |
|----------|--------|
| Code reading (grep-based) | 2k |
| Code generation | 3k |
| MCP calls (selective) | 5k |
| Documentation updates | 1k |
| Commit message | 300 |
| **Total** | **11.3k** |

**Goal**: 10-15 features per 200k context budget

---

**Remember**: Every MCP call costs tokens. Call only when the value (quality, safety, verification) exceeds the cost.
