# CompPortal-Tester Project Instructions

**Branch:** `tester`
**Purpose:** Phase 2 Development - Game Day / At Competition Mode
**Deploy Target:** tester.compsync.net

---

## Game Day Continue Protocol

**Trigger:** User says "continue game day" or "continue on tester"

### Session Start Sequence

1. **Verify Branch**
   ```bash
   git checkout tester
   git pull origin tester
   ```

2. **Get Task Status**
   ```
   mcp__task-master-ai__get_tasks(projectRoot: "D:\\ClaudeCode\\CompPortal-tester")
   ```

3. **Get Next Task**
   ```
   mcp__task-master-ai__next_task(projectRoot: "D:\\ClaudeCode\\CompPortal-tester")
   ```

4. **Load Relevant Spec**
   - Database work → `docs/specs/GAME_DAY_DATABASE_SCHEMA.md`
   - API work → `docs/specs/GAME_DAY_API_CONTRACTS.md`
   - UI work → `docs/specs/GAME_DAY_SPEC.md`
   - WebSocket work → `docs/specs/GAME_DAY_WEBSOCKET_PROTOCOL.md`
   - State machines → `docs/specs/GAME_DAY_STATE_MACHINES.md`

5. **Begin Implementation**
   ```
   mcp__task-master-ai__set_task_status(id: "X", status: "in-progress")
   ```

### During Implementation

- Use `supabase` MCP for all database operations
- Use `playwright` MCP for testing on tester.compsync.net
- Commit to `tester` branch (NOT main)
- Push to deploy to tester environment

### Task Completion

1. Mark task done:
   ```
   mcp__task-master-ai__set_task_status(id: "X", status: "done")
   ```

2. Get next task:
   ```
   mcp__task-master-ai__next_task(projectRoot: "D:\\ClaudeCode\\CompPortal-tester")
   ```

3. Continue until session ends or user stops

---

## Build Order (Dependency Chain)

### Phase 1: Foundation (No Dependencies) - START HERE
| Task | Title | Spec Section |
|------|-------|--------------|
| 16 | Database Migration - Live State Tables | DATABASE_SCHEMA.md Section 1-4 |
| 22 | MP3 File Management API | API_CONTRACTS.md Section 4 |
| 10 | LAN Sync Infrastructure | WEBSOCKET_PROTOCOL.md |

### Phase 2: Backend APIs (Depends on Task 16)
| Task | Title | Spec Section |
|------|-------|--------------|
| 17 | Break Request API | API_CONTRACTS.md Section 5 |
| 18 | Emergency Break API | API_CONTRACTS.md Section 6 |
| 19 | Live Routine Control API | API_CONTRACTS.md Section 3 |
| 20 | Routine Reorder & Scratch API | API_CONTRACTS.md Section 3 |
| 21 | Score Edit with Audit Log | API_CONTRACTS.md Section 4 |
| 34 | Title Breakdown + Judge Position Schema | DATABASE_SCHEMA.md Section 5 |

### Phase 3: UI Components (Depends on APIs)
| Task | Title | Spec Section |
|------|-------|--------------|
| 1 | Backstage Tech UI - Kiosk Mode | SPEC.md Section 3.3 |
| 2 | MP3 Player Component | SPEC.md Section 6 |
| 3 | MP3 Download Manager | SPEC.md Section 6 |
| 4 | Tabulator Control Panel | SPEC.md Section 3.1 |
| 7 | Judge Tablet UI (XX.XX format) | SPEC.md Section 3.2 |

### Phase 4: Advanced Features (Depends on UI)
| Task | Title | Spec Section |
|------|-------|--------------|
| 26 | Title Division Scoring | SPEC.md Section 4.2 |
| 27 | Edge Case Alert System | SPEC.md Section 4.5 |
| 28 | Label Printing | SPEC.md Section 4.6 |
| 29 | TV Display Mode | SPEC.md Section 3.3 |
| 30 | Music Upload System | SPEC.md Section 8A |

---

## Key Spec Requirements (Quick Reference)

### Score Format
- **Format:** XX.XX (two decimals ALWAYS required)
- **Range:** 00.00 - 99.99
- **Valid:** 89.06, 42.67, 98.90, 75.00
- **Invalid:** 69, 72, 86.6, 89.3
- **Input:** BOTH slider AND manual typing

### Adjudication Levels
- **Tenant-configurable** via `competition_settings.adjudication_levels` JSONB
- Each tenant defines their own level names and score ranges
- Edge case threshold: 0.1 (configurable)

### Terminology
- "Tabulator" (not CD) for live views
- "Adjudication" (not Awards Ceremony)
- Judge A, Judge B, Judge C (exactly 3)

### Blocking Items
- Title Division 5 category names (need client screenshot)
- Can proceed with placeholder names: `technique`, `category2`, `category3`, `category4`, `category5`

---

## Testing Protocol

1. **All changes tested on:** tester.compsync.net
2. **Tester tenant ID:** Use existing tester tenant
3. **Credentials:** Use SA login from parent CLAUDE.md
4. **Verification:** Screenshot evidence required for UI changes

---

## Session End

Before ending session:
1. Commit all changes to `tester` branch
2. Push to trigger deployment
3. Update Task Master with final status
4. Note any blockers in task details

---

*This protocol enables seamless continuation of Game Day development across sessions.*
