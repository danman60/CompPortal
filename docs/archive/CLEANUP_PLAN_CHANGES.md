# Cleanup Plan Updates

## Changes from Original Plan

### Files to Keep: 10 → 7 (removed 3)

**Removed from KEEP (now archiving):**
1. DOCS_INDEX.md → Deleting (info in PROJECT_STATUS.md)
2. CAPACITY_REWRITE_PLAN.md → Archive to `oct-2025-planning/`
3. REBUILD_DECISION.md → Archive to `oct-2025-planning/`

**Reasoning:** These are historical planning documents, not active trackers. User requested archiving item #6.

---

### Archive Strategy: Use Existing Directories

**Original Plan:** Create 12 new subdirectories
**Updated Plan:** Use 3 existing + create 8 new subdirectories

**Existing directories being used:**
- `docs/archive/oct-2025-sessions/` - Session summaries (7 files)
- `docs/archive/oct-2025-testing/` - All test reports (20 files after merges)
- `docs/archive/oct-2025-planning/` - All planning/architecture docs (13 files)

**New directories to create:**
- `blockers/` - Blocker reports (3 files)
- `bugs/` - Bug investigations (10 files)
- `audits/` - System audits (14 files)
- `multi-tenant/` - Multi-tenant implementation (13 files)
- `migration/` - Migration planning (3 files)
- `email/` - Email debugging (2 files)
- `parallel/` - DevTeam work (4 files)
- `misc/` - Miscellaneous analysis (8 files)

---

### Files to Delete: 11 → 10 (moved 1)

**Moved from DELETE to ARCHIVE:**
- PARALLEL_REBUILD_EXECUTION_PLAN.md (45KB) → `oct-2025-planning/`
  - Reasoning: Large document with planning details, preserve for historical context

**Updated DELETE list (10 files):**
1. TEST_1.1_RESULT.md - Fragment
2. test-fixes.md - Fragment
3. test-results.md - Fragment
4. NEXT_SESSION.md - Superseded
5. NEXT_SESSION_URGENT.md - Superseded
6. NEXT_SESSION_IMPORT_UX.md - Superseded
7. NEXT_SESSION_IMPORTS_CONTINUED.md - Superseded
8. EMAIL_DASHBOARD_BUTTONS_TODO.md - Completed
9. TONIGHT_WORK_PLAN.md - Temporary
10. PRODUCTION_SAFEGUARDS.md (73KB) - Excessive
11. DOCS_INDEX.md - Info now in PROJECT_STATUS.md

---

### Final Numbers

| Category | Original Plan | Updated Plan | Change |
|----------|---------------|--------------|--------|
| KEEP in root | 10 | 7 | -3 (94% reduction vs 90%) |
| ARCHIVE | 85 | 88 | +3 |
| MERGE → Archive | 15 → 4 | 15 → 4 | (same) |
| DELETE | 11 | 11 | (same, but different files) |
| **Total files** | **114** | **114** | - |
| **Root after cleanup** | **10** | **7** | **-3 files** |

---

### Benefits of Updated Plan

1. **Cleaner root** - 7 files instead of 10 (just active trackers + README/QUICKSTART)
2. **Leverages existing structure** - Uses oct-2025-* directories already in place
3. **Better organization** - All planning docs in one place (oct-2025-planning/)
4. **Preserved history** - PARALLEL_REBUILD moved to archive instead of deleted
5. **No DOCS_INDEX.md** - Documentation map in PROJECT_STATUS.md, one less file to maintain

---

### Implementation Impact

**Original timeline:** 45-60 minutes
**Updated timeline:** 40-50 minutes (fewer directories to create, simpler structure)

**Complexity:** Same (15 steps)
**Risk:** Same (LOW - all historical content preserved)

---

**Status:** ✅ Ready for execution with user approval
