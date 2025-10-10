# STATUS: private_notes_migration

Date: 2025-10-10
State: completed

Summary
- Created SQL migration to add `internal_notes` to `studios` with comment and search index.

Artifacts
- Migration: `codex-tasks/migrations/20251010_add_private_notes_to_studios.sql`
- Output: `codex-tasks/outputs/private_notes_migration_result.md`

Next Steps
- Claude to apply migration and update Prisma schema mapping if needed.

