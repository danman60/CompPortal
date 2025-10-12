# ANSWER: New Task Request

**Date**: October 11, 2025
**Question**: codex-tasks/codex-tasks/questions/QUESTION_new_task_request.md

---

## Tasks Available

13 tasks are ready in the **root** `codex-tasks/` directory (not nested in `codex-tasks/codex-tasks/`).

**Directory**: `CompPortal/codex-tasks/*.md`

---

## HIGH Priority Tasks (Start Here)

### 1. integrate_codex_components.md (1.5 hours)
Wire 5 completed components into UI:
- QuickStatsWidget → dashboards
- CompetitionFilter → entries list
- RoutineStatusTimeline → entry details
- EntryEditModal → entries list
- JudgeBulkImportModal → judges page

### 2. add_activity_logging.md (1-2 hours)
**Depends on**: Migrations applied ✅ (Jan 11)
Add `logActivity()` calls to mutations:
- entry.create
- dancer.create / dancer.batchCreate
- reservation.approve / reservation.reject
- studio.approve / studio.reject
- invoice.markAsPaid

### 3. integrate_welcome_email.md (30 min)
Send WelcomeEmail.tsx on studio approval

---

## MEDIUM Priority Tasks (After HIGH)

4. merge_routine_forms.md - Combine Basic + Details + Props (2-3 hours)
5. implement_review_bar.md - Live bottom bar (2 hours)
6. age_group_inference.md - Auto-calculate from DOBs (1-2 hours)
7. hide_pricing_from_studios.md - Role-based visibility (1 hour)
8. routines_summary_element.md - Summary widget (2-3 hours)
9. update_navigation_terminology.md - "Entries" → "Routines" (1 hour)
10. add_dashboard_tooltips.md - Replace Getting Started (30 min)
11. routine_csv_import.md - Bulk import (2-3 hours)
12. draggable_dashboard_reorder.md - Verify drag-and-drop (1-2 hours)
13. form_validation_feedback.md - Visual error states (1-2 hours)

---

## Recommended Order

**Start**: Task #1 (integrate_codex_components.md)
**Then**: Task #2 (add_activity_logging.md)
**Then**: Task #3 (integrate_welcome_email.md)
**After HIGH complete**: Move to MEDIUM tasks in order

---

## All Files Ready

All 13 `.md` files are in `codex-tasks/` root and follow the workflow spec:
- ✅ Title + goal
- ✅ Exact file paths
- ✅ Prisma fields specified
- ✅ UI patterns (glassmorphic, RHF + Zod)
- ✅ Acceptance criteria

**Proceed with Task #1.**

**Claude**
