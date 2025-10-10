# Codex Watch Mode - Startup Instructions

## Run This Command in Terminal

```bash
cd D:\ClaudeCode\CompPortal
codex --config codex.config.json --sandbox danger-full-access
```

Or double-click: **`start-codex.bat`** (in CompPortal root)

## What Codex Will Do

1. **Monitor** `codex-tasks/` directory for new `.md` task files
2. **Execute** tasks automatically when they appear
3. **Output** generated code to `codex-tasks/outputs/TASK_NAME_result.md`
4. **Log** execution details to `codex-tasks/logs/TASK_NAME_log.md`
5. **Create blockers** in `codex-tasks/blockers/` if uncertain

## How to Use

### Claude Creates Task
Claude creates a task file like:
```
codex-tasks/create_feature.md
```

### Codex Picks It Up
Codex automatically:
- Reads the task
- Follows patterns from `codex.config.json`
- Generates code
- Outputs result

### You Review & Commit
```bash
# Review output
cat codex-tasks/outputs/create_feature_result.md

# Copy to proper location
cp [generated code] src/components/Feature.tsx

# Test
npm run build

# Commit
git add .
git commit -m "feat: Add feature (Codex generated)"
git push
```

## Alternative: Manual Task Execution

If watch mode isn't available:

```bash
# Run specific task
codex run codex-tasks/TASK_NAME.md --config codex.config.json
```

## Notes

- Keep this terminal window open while working
- Claude will create tasks as needed
- You review, commit, and Claude integrates
- Both agents work in parallel for maximum speed
