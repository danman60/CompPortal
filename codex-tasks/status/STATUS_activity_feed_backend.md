# STATUS: activity_feed_backend

Date: 2025-10-10
State: completed

Summary
- Created `activity_logs` migration and implemented `activity` tRPC router with helper utilities.
- Registered router in `_app.ts`.

Artifacts
- Migration: `codex-tasks/migrations/20251010_create_activity_logs.sql`
- Output: `codex-tasks/outputs/activity_feed_backend_result.md`

Next Steps
- Claude to apply migration and optionally call `logActivity` in entry/invoice mutations.

