# Lean Session Protocol - CompPortal

**Created**: October 4, 2025
**Purpose**: Maximize session capacity by reducing context overhead from ~15k to ~2k tokens at session start

---

## Quick Start (Every Session)

### 1. Load Minimal Context
```bash
# Read only these files at session start:
- PROJECT_STATUS.md (~69 lines)
- git log -3 (last 3 commits)
- Todo list (if active)
```

**Expected token usage**: ~2,000 tokens (vs previous ~15,000)

### 2. Work Efficiently
- Use Grep to find functions (don't read full files)
- Reference line numbers in notes
- Take brief notes during work, document at commit time

### 3. Commit Concisely
- 12-line max commit messages
- File paths with line numbers (not code examples)
- Reference issues/gaps by commit hash

---

## When to Load Full Context

### Load from Archive When:
- Debugging issues that need historical context
- Reviewing design decisions from previous sessions
- Need detailed test execution steps
- Understanding why a feature was implemented a certain way

### Archive Contents (docs/archive/)
```
SESSION_LOG_*.md          - Detailed session notes (487-806 lines each)
MVP_REGISTRATION_*.md     - Complete test results (412 lines)
PROJECT_STATUS_OLD.md     - Full project roadmap (532 lines)
```

**To load**: Explicitly read files from `docs/archive/` when needed

---

## Documentation Standards

### Commit Messages (12 lines max)

✅ **GOOD**:
```
feat: Add space limit enforcement

- Frontend: Counter UI (EntriesList.tsx:125-210)
- Backend: Link reservations (EntryForm.tsx:93-116)
- UX: Disable button at capacity

Fixes MVP Gap #1.

🤖 [Claude Code]
Co-Authored-By: Claude <noreply@anthropic.com>
```

❌ **TOO VERBOSE** (avoid):
```
feat: Implement comprehensive space limit enforcement

Added complete space limit tracking system with:

Backend Changes:
- Modified EntryForm.tsx to fetch approved reservations
- Added reservation_id linking when creating entries
- Existing validation in entry.ts now triggers
[... 30 more lines ...]
```

### Status Updates (2-3 sentences default)

✅ **GOOD**:
```
Space limit enforcement complete. Counter shows "X/Y spaces used" with color-coded 
progress bar. Button disables at capacity. Committed e29ba13.
```

❌ **TOO VERBOSE** (avoid):
```
I have successfully implemented the space limit enforcement feature by modifying 
the EntryForm component to fetch approved reservations and pass the reservation_id 
to the backend. The backend validation in entry.ts lines 327-352 now triggers...
[... 3 more paragraphs ...]
```

### Test Documentation (Tables > Narratives)

✅ **GOOD** (~150 lines):
```markdown
## Test Results

| Phase | Result | Evidence |
|-------|--------|----------|
| SD creates reservation | ✅ PASS | 10 spaces |
| CD approves | ✅ PASS | 10 confirmed |
| SD creates routines | ✅ PASS | 3 created |

## Gaps
1. Space limit - 3h fix
2. UI polish - 2h fix
```

❌ **TOO VERBOSE** (avoid):
```markdown
## Test Execution

**Steps Executed**:
1. First, I logged in as Studio Director using demo.studio@gmail.com
2. Then I navigated to /dashboard/reservations
3. I clicked the "Create Reservation" button
4. Selected competition: GLOW Dance - Orlando (2026)
[... 400 more lines of narrative ...]
```

---

## File Reading Strategy

### ❌ OLD WAY (Wasteful)
```
Read EntryForm.tsx (300+ lines)
Read EntriesList.tsx (285 lines)
Read EntryForm.tsx again to verify
```

### ✅ NEW WAY (Efficient)
```
Grep "handleSubmit" in EntryForm.tsx
Cache note: "EntryForm.tsx:93-116 = submission logic"
Reference cached note when needed
```

**Savings**: ~2,000 tokens per task

---

## Session End Checklist

### Before Commit:
- [ ] Write 12-line commit message
- [ ] Update PROJECT_STATUS.md (2-3 bullets max)
- [ ] Optional: Brief session note if major milestone

### What NOT to Create:
- ❌ Full session logs (unless major milestone)
- ❌ Detailed implementation docs (code is the doc)
- ❌ Extensive test narratives (use tables)
- ❌ Future enhancement lists (keep in issues/todos)

---

## Expected Results

**Session Capacity**:
- **Before**: 5-6 sessions before context limit
- **After**: 12-15 sessions before limit (2.5x improvement)

**Token Usage**:
- **Session start**: 2k tokens (vs 15k) - 87% reduction
- **Per commit**: 500 tokens (vs 2k) - 75% reduction
- **Per update**: 200 tokens (vs 1k) - 80% reduction

**Time Savings**:
- Less documentation overhead (~20% faster sessions)
- Smoother continuity between sessions
- Fewer summarization interruptions

---

## Reference Material Preservation

### ✅ What's Archived (Safe)
All detailed documentation moved to `docs/archive/`:
- Session logs (4 files, 1,700+ lines total)
- Complete test results (412 lines)
- Full project roadmap (532 lines)
- Historical context preserved for deep dives

### 📋 What's Active (Lean)
Only current essentials in project root:
- PROJECT_STATUS.md (69 lines) - current state only
- COMPPORTAL.txt - credentials + quick reference
- LEAN_SESSION_GUIDE.md (this file) - how to work lean

### 🔄 When to Archive
After completing a major milestone:
1. Move detailed session log to docs/archive/
2. Update PROJECT_STATUS.md with 2-3 bullet summary
3. Keep archive path in commit message for reference

---

## Example Session Flow

### Session Start (5 minutes)
1. Read PROJECT_STATUS.md
2. Check last 3 commits: `git log -3 --oneline`
3. Review todo list
4. Start working

**Context loaded**: ~2,000 tokens

### During Work (Focus)
1. Use Grep to find code
2. Take brief notes (line numbers, decisions)
3. Implement features
4. Test changes

**Avoid**: Re-reading full files, writing detailed docs mid-session

### Session End (5 minutes)
1. Write concise commit (12 lines)
2. Update PROJECT_STATUS.md (2-3 bullets)
3. Push changes
4. Optional: Brief note if milestone

**Documentation time**: ~10% of session (vs 30% before)

---

## Success Metrics

Track these to validate approach:
- Session count before hitting context limit
- Token usage at session start
- Time spent on documentation vs implementation
- Ease of context restoration in next session

**Target**: 12-15 sessions before summarization needed

---

**Remember**: Full context is always available in `docs/archive/`. This lean approach is about **default efficiency**, not losing information.

---

**Last Updated**: October 4, 2025
**Status**: Active - use starting next session
