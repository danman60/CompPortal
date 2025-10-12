# QuickStart for Claude Code Sessions

**Purpose**: Minimal context loading for maximum session efficiency
**Token Budget**: ~1.5k tokens (vs 8k previous)
**Result**: 3-4x more sessions per 200k budget

---

## Session Start Checklist (Execute in Order)

### 1. Read Core Status (Required)
```bash
# Read these 3 files ONLY at session start
Read: PROJECT_STATUS.md (~150 lines)
Read: CURRENT_WORK.md (5 lines)
Read: BUGS_AND_FEATURES.md (active issues only)

# Get recent commits
git log -3 --oneline

# Total: ~1.5k tokens
```

### 2. Assess Current Work
- What's the active task? (CURRENT_WORK.md)
- Are there blockers? (BUGS_AND_FEATURES.md)
- What was last commit? (git log)

### 3. Only Load What You Need
**DON'T automatically read**:
- User journeys (unless UX changes)
- Full component files (use grep first)
- Historical logs (archived in docs/archive/HISTORY.md)
- Testing reports (unless running tests)

**DO read selectively**:
- Specific file sections (use grep + Read with offset/limit)
- Pattern references (docs/patterns/ for boilerplate)
- MCP usage guide (docs/reference/MCP_USAGE.md when calling tools)

---

## Grep-First Strategy

```bash
# ❌ OLD WAY (Wasteful)
Read(EntryForm.tsx)  # 500 lines, 3k tokens

# ✅ NEW WAY (Efficient)
Grep(pattern="handleSubmit", file="EntryForm.tsx")  # 20 lines, 200 tokens
# Cache result: "EntryForm.tsx:93-116 = submission logic"
# Reference cache note when needed
```

**Grep Patterns for Common Tasks**:
- Find component exports: `grep "^export.*function\|^export.*const"`
- Find router endpoints: `grep "export.*Router" src/server/routers/`
- Find Prisma models: `grep "^model" prisma/schema.prisma`
- Find tRPC calls: `grep "trpc\\..*\\.(useQuery|useMutation)"`

---

## Feature Implementation Flow

### 1. Understand Requirements (Minimal Reading)
```bash
# Read feature requirement
grep "#<feature-number>" BUGS_AND_FEATURES.md

# Find related code (grep, don't read full files)
grep "<keyword>" src/components/*.tsx
grep "<keyword>" src/server/routers/*.ts
```

### 2. Generate Code (Use Patterns)
```bash
# Load pattern template
Read: docs/patterns/component_pattern.tsx

# Apply pattern to requirements
# Generate code with strict types
```

### 3. Verify (MCP Tools - Selective)
```bash
# Only call MCP when needed:
✅ supabase:apply_migration (if schema changed)
✅ supabase:get_advisors (if migration applied)
❌ vercel:get_deployments (skip if build passes locally)
❌ playwright (skip if no UI changes)
```

### 4. Commit (Template-Based)
```bash
# Use git template (auto-formatted)
git commit  # Opens editor with template pre-filled
```

---

## Context Monitoring

**CRITICAL: Exit at 15% remaining**

```typescript
// Check context % at START of every work session
if (contextRemaining < 15%) {
  console.log("⚠️ Context at 15% - EXITING")

  // Complete ONLY current atomic task
  finishCurrentTask()

  // Commit with exit marker
  gitCommit("wip: Exit at 15% context")

  // Update CURRENT_WORK.md
  updateCurrentWork("Resume: <next-step>")

  break  // STOP - Don't start new features
}
```

---

## Session End Checklist

```bash
✅ Commit with template (auto-formatted)
✅ Update CURRENT_WORK.md (5 lines)
✅ Update PROJECT_STATUS.md if major milestone
✅ Push to remote

❌ Don't create:
- Full session logs (use docs/sessions/ for major milestones only)
- Detailed implementation docs
- Future enhancement lists
```

---

## Reference Quick Links

**Patterns & Templates**:
- docs/patterns/ - Component, router, migration templates
- docs/reference/MCP_USAGE.md - When to call which MCP tools
- docs/reference/SCHEMA_SUMMARY.md - Key Prisma models (cached)

**Current State**:
- PROJECT_STATUS.md - Current phase, recent work
- CURRENT_WORK.md - Active task (5 lines)
- BUGS_AND_FEATURES.md - Active issues

**History** (Only if needed):
- docs/archive/HISTORY.md - All past sessions
- docs/sessions/ - Session summaries
- git log --oneline -10 - Recent commits

---

## Token Savings

| Activity | Old | New | Savings |
|----------|-----|-----|---------|
| Session start | 8k | 1.5k | 81% |
| Feature reading | 3k | 1k | 67% |
| Code reading | 5k | 2k | 60% |
| MCP calls | 15k | 6k | 60% |
| Documentation | 4k | 1k | 75% |
| **Total** | **35k** | **11.5k** | **67%** |

**Result**: 10-15 sessions per 200k budget (vs 4-6 previous)

---

**Remember**: Load less, grep more, reference patterns, exit at 15% context.
