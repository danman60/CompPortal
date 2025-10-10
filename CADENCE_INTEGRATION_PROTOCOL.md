# CADENCE Integration Protocol (Dual-Agent Hardened)

**Continuous Autonomous Development Execution with No-pause Continuation Engine**

## Architecture: Claude (Senior) + Codex (Junior)

```
┌─────────────┐
│   Claude    │ ← Senior Dev: Architecture, Review, Integration, Git
│  (Senior)   │
└──────┬──────┘
       │ Creates Tasks
       ↓
┌─────────────────────┐
│  codex-tasks/       │
│  - Task specs       │
└──────┬──────────────┘
       │ Picked up by
       ↓
┌─────────────┐
│   Codex     │ ← Junior Dev: Boilerplate, CRUD, Forms
│  (Junior)   │
└──────┬──────┘
       │ Outputs to
       ↓
┌─────────────────────┐
│  codex-tasks/       │
│    outputs/         │
└──────┬──────────────┘
       │ Reviewed by
       ↓
┌─────────────┐
│   Claude    │ ← Reviews, Validates, Integrates, Commits, Pushes
│  (Senior)   │
└─────────────┘
```

## Phase 1: Claude Creates Task (Senior Dev)

When Claude identifies a boilerplate/CRUD task:

```markdown
// codex-tasks/create_studio_settings.md

## Task: Create Studio Settings Component

**Type**: Form Component (Boilerplate)
**Complexity**: Low (Codex can handle)

**Context**:
- File: src/components/StudioSettingsForm.tsx
- Purpose: Studio profile management form

**Requirements**:
1. React Hook Form with Zod validation
2. Fields: studio_name, contact_email, contact_phone, address, city, state_province, postal_code
3. Pre-populate with existing studio data (edit mode)
4. Submit via tRPC `studio.update` mutation
5. Toast on success/error

**Prisma Schema**:
Studios model: id, owner_id, studio_name, contact_email, contact_phone, address, city, state_province, postal_code, country

**Deliverables**:
- Complete StudioSettingsForm.tsx component
- Export default
- Follow glassmorphic pattern

**Validation**:
- Build must succeed
- Form has validation
- Error handling present
```

Claude creates this task, then **continues working on architecture** while Codex handles it.

## Phase 2: Codex Generates Code (Junior Dev)

Codex (in watch mode):
1. Detects new task file
2. Reads task specification
3. Loads patterns from `codex.config.json`
4. Generates complete implementation
5. Outputs to `codex-tasks/outputs/create_studio_settings_result.md`
6. Logs execution to `codex-tasks/logs/create_studio_settings_log.md`

**Output Format**:
```markdown
## Studio Settings Form - Implementation

**Status**: ✅ Complete

**File**: `src/components/StudioSettingsForm.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { api } from '~/utils/api';

export default function StudioSettingsForm({ studioId }: { studioId: string }) {
  // [COMPLETE IMPLEMENTATION]
}
```

**Validation**:
- ✅ Build: Simulated success
- ✅ Prisma fields: Exact match
- ✅ Glassmorphic pattern: Applied
- ✅ Form validation: Complete
```

## Phase 3: Claude Reviews & Integrates (Senior Dev)

### 3.1 Automated Review Checklist

Claude reads `codex-tasks/outputs/create_studio_settings_result.md` and validates:

```typescript
// CADENCE Auto-Review Protocol

const review = {
  // 1. Code Quality
  prismFieldNames: checkPrismaFields(code, 'prisma/schema.prisma'),  // ✅ Exact match
  typeScriptValid: simulateBuild(code),                               // ✅ No errors
  importsCorrect: validateImports(code),                              // ✅ All resolved

  // 2. Design Patterns
  glassmorphicPattern: code.includes('bg-white/10 backdrop-blur-md'), // ✅ Present
  emojiIcons: !code.includes('import.*icon'),                         // ✅ No external
  gradientBg: code.includes('from-purple-900'),                       // ✅ Applied

  // 3. Functionality
  formValidation: code.includes('react-hook-form'),                   // ✅ Present
  errorHandling: code.includes('toast.error'),                        // ✅ Present
  loadingStates: code.includes('isLoading'),                          // ✅ Present

  // 4. Integration
  trpcMutation: code.includes('api.studio.update'),                   // ✅ Correct
  routerRegistered: checkRouterExists('studio'),                      // ✅ Exists
}

if (allChecksPass(review)) {
  integrateCode()
  runBuild()
  commitAndPush()
} else {
  createBlocker(review.failures)
}
```

### 3.2 Integration Steps

```bash
# Claude's Integration Workflow

# 1. Read Codex output
const output = readFile('codex-tasks/outputs/create_studio_settings_result.md')

# 2. Extract code
const code = extractCode(output)

# 3. Write to proper location
writeFile('src/components/StudioSettingsForm.tsx', code)

# 4. Run build validation
exec('npm run build')  // Must succeed

# 5. Check Vercel deployment (if auto-push enabled)
# Skip for local - only after manual push

# 6. Commit (only if build succeeds)
exec(`git add .`)
exec(`git commit -m "feat: Add studio settings form

- Form component (StudioSettingsForm.tsx)
- React Hook Form + Zod validation
- Studio profile update mutation

Generated by Codex, integrated by Claude.

✅ Build pass.

🤖 Claude Code + Codex"`)

# 7. Push to remote
exec('git push origin main')

# 8. Verify deployment (after push)
const deploy = await vercel:get_deployments({ limit: 1 })
if (deploy.state === "ERROR") {
  const logs = await vercel:get_build_logs({ deploymentId: deploy.id })
  // Rollback if needed
  exec('git revert HEAD')
  exec('git push origin main')
}
```

### 3.3 Quality Gate Failures

If any check fails, Claude creates blocker for Codex:

```markdown
// codex-tasks/blockers/BLOCKER_studio_settings_prisma_fields.md

## Blocker: Incorrect Prisma Field Names

**Task**: create_studio_settings.md
**Output**: codex-tasks/outputs/create_studio_settings_result.md

**Issue**: Used incorrect field names in form
- ❌ Used: `name` (doesn't exist)
- ✅ Should be: `studio_name` (exact schema field)

**Fix Required**:
Update form to use exact Prisma field names:
- studio_name
- contact_email
- contact_phone

**Claude Action**: Correcting and re-integrating
```

Claude fixes, integrates, commits with note about fix.

## Phase 4: Continuous Loop (CADENCE)

```typescript
// Claude's CADENCE Loop

while (true) {
  // Check context budget
  if (contextRemaining < 15%) {
    exitCADENCE()
    break
  }

  // 1. Identify next feature
  const feature = getNextFeature('BUGS_AND_FEATURES.md')

  // 2. Decide: Claude or Codex?
  if (isBoilerplate(feature)) {
    // Delegate to Codex
    createTask(`codex-tasks/${feature.name}.md`, feature.spec)

    // Continue with architecture while Codex works
    workOnArchitecture()

    // Review Codex output when ready
    waitForOutput(`codex-tasks/outputs/${feature.name}_result.md`)

    reviewAndIntegrate()
    commitAndPush()

  } else {
    // Claude handles complex work
    spawnAgents(feature)
    integrate()
    commitAndPush()
  }

  // 3. Verify deployment
  verifyProduction()

  // 4. Continue to next feature
  continue  // NO PAUSES
}
```

## Hardened Git Protocol

### Commit Message Template

```bash
# Claude's commit format (8 lines)

feat: [Brief title]

- Component/Change (file:lines)
- Generated by: Codex [if applicable]
- Reviewed by: Claude
- Integration: [how it fits]

Fixes #ref. ✅ Build pass.

🤖 Claude Code + Codex [if Codex-generated]
🤖 Claude Code [if Claude-generated]
```

### Pre-Commit Validation

```typescript
// Claude runs before EVERY commit

const preCommitChecks = {
  build: exec('npm run build'),                    // ✅ Must succeed
  prismaFields: validatePrismaFields(),            // ✅ Exact match
  routerRegistry: checkRouterRegistration(),       // ✅ If new router
  designPatterns: validateGlasmorphic(),          // ✅ UI components
  tests: exec('npm run test'),                     // ⚠️ If tests exist
}

if (!allPass(preCommitChecks)) {
  console.log('❌ Pre-commit checks failed. Not committing.')
  logFailures(preCommitChecks)
  return false
}

// All checks pass → Commit
return true
```

### Post-Push Verification

```typescript
// After git push, Claude verifies deployment

async function verifyDeployment() {
  // 1. Get latest deployment
  const deploy = await vercel:get_deployments({ limit: 1 })

  // 2. Check state
  if (deploy.state === "ERROR") {
    // Get logs
    const logs = await vercel:get_build_logs({ deploymentId: deploy.id })

    // Analyze failure
    const issue = analyzeBuildFailure(logs)

    // Rollback
    exec('git revert HEAD')
    exec('git push origin main --force')

    // Create blocker
    createBlocker('DEPLOYMENT_FAILURE', issue)

    return false
  }

  // 3. Test with Playwright
  const PROD_URL = 'http://compsync.net'
  await playwright.navigate(PROD_URL + '/feature')
  await playwright.screenshot('verified.png')

  // 4. Check for runtime errors
  const hasErrors = await playwright.evaluate('console.error.called')

  if (hasErrors) {
    // Rollback and investigate
    return false
  }

  return true  // ✅ Deployment verified
}
```

## Parallel Execution Metrics

**Traditional Sequential (1 agent)**:
- Feature 1: 15 minutes (Claude)
- Feature 2: 20 minutes (Claude)
- Feature 3: 10 minutes (Claude)
- **Total: 45 minutes**

**CADENCE Dual-Agent (Claude + Codex)**:
- Feature 1: 15 minutes (Claude - complex)
- Feature 2: 5 minutes (Codex - boilerplate) ← Parallel with Feature 1
- Feature 3: 10 minutes (Claude - architecture)
- **Total: 25 minutes (44% faster)**

**Token Savings**:
- Claude doesn't generate boilerplate: -8k tokens per task
- Codex handles repetitive code: -5k tokens
- **Result: 30+ sessions before limit (vs 5-6)**

## Circuit Breakers

Claude stops CADENCE if:

1. **Build fails 3+ times** → Create BLOCKER.md, stop loop
2. **Deployment fails 3+ times** → Rollback, investigate, stop
3. **Codex produces invalid code 3+ times** → Disable delegation, handle manually
4. **Context <15% remaining** → Save state, exit cleanly
5. **User says "STOP"** → Immediate halt

## Summary

**Codex (Junior)**:
- Generates boilerplate, CRUD, forms
- Outputs to `codex-tasks/outputs/`
- Follows patterns strictly

**Claude (Senior)**:
- Creates tasks for Codex
- Reviews all Codex output
- Validates quality gates
- Integrates into codebase
- Runs build validation
- Commits with proper messages
- Pushes to git
- Verifies deployment
- Handles complex architecture

**Result**:
- 2-3x faster development
- Quality gates enforced
- Git history clean
- Production verified
- 30+ sessions before context limit

---

**Hardened CADENCE = Autonomous + Parallel + Quality-Gated Development**
