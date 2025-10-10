# Simple Dual-Agent Workflow

**Claude (Senior) + Codex (Junior) = Faster Development**

## The Simple Flow

### 1. You Open Two Windows

**Window 1: Codex Terminal**
```bash
cd D:\ClaudeCode\CompPortal
codex --config codex.config.json --sandbox danger-full-access
```

Or just double-click: **`start-codex.bat`**

**Window 2: Claude Code** (this window)

### 2. Claude Creates Tasks While Working

When I identify boilerplate work:

```typescript
// I create: codex-tasks/create_feature.md
writeFile('codex-tasks/create_feature.md', taskSpec)

// Then I continue with complex work
// You tell Codex "continue" when ready
```

### 3. You Tell Codex "Continue"

In Codex terminal: **"continue"**

Codex:
- Checks `codex-tasks/` for new `.md` files
- Reads task specs
- Generates code
- Outputs to `codex-tasks/outputs/create_feature_result.md`

### 4. Claude Checks for Results

In my CADENCE loop, I check:

```typescript
const outputs = glob('codex-tasks/outputs/*_result.md')

if (outputs.length > 0) {
  // Read each output
  // Validate quality gates
  // Integrate code
  // Commit & push
  // Delete output file (processed)
}
```

### 5. Repeat

You just say "continue" in Codex terminal when you want it to pick up new tasks. That's it.

## What Each Agent Does

**Codex (when you say "continue"):**
- Checks for task files
- Generates code
- Outputs result

**Claude (autonomous loop):**
- Creates tasks
- Works on complex features
- Checks for Codex outputs
- Reviews & integrates
- Commits & pushes
- Verifies deployment

## Folder Structure

```
codex-tasks/
├── create_feature.md          ← Claude creates
├── outputs/
│   └── create_feature_result.md  ← Codex outputs, Claude processes & deletes
└── blockers/
    └── issue.md               ← Codex creates if stuck
```

## That's It

1. Open Codex terminal: `codex --config codex.config.json`
2. Say "start CADENCE" to me
3. When I create tasks, you say "continue" to Codex
4. I check outputs and integrate
5. Everything backed up to git

Simple, parallel, quality-gated. No complex automation needed.
