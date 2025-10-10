#!/usr/bin/env markdown
# private_notes_migration_result

File
- codex-tasks/migrations/20251010_add_private_notes_to_studios.sql

Summary
- Adds nullable TEXT column `internal_notes` to `studios` with comment and optional GIN index for search.

SQL
```sql
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS internal_notes TEXT NULL;

COMMENT ON COLUMN studios.internal_notes IS 'Internal notes for Competition Directors only. Not visible to Studio Directors.';

CREATE INDEX IF NOT EXISTS idx_studios_internal_notes
ON studios USING gin(to_tsvector('english', internal_notes));
```

Notes
- Per `.codexrc`, schema not modified here; migration provided for application outside.

