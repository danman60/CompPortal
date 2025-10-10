## Task: Private Notes Database Migration

**Context:**
- File: prisma/migrations/YYYYMMDD_add_private_notes_to_studios/migration.sql
- Feature: Add internal notes field to studios table (Competition Director only)
- Pattern: Simple ALTER TABLE migration

**Requirements:**
1. Add `internal_notes` column to `studios` table
2. Type: TEXT (allows long notes)
3. Nullable: YES (optional field)
4. Default: NULL

**Deliverables:**
- Complete migration SQL file
- Migration name: `20251010_add_private_notes_to_studios`

**Migration Content:**
```sql
-- Add internal_notes column to studios table
-- This field is only visible to Competition Directors
-- Studio Directors cannot see or edit this field

ALTER TABLE studios
ADD COLUMN internal_notes TEXT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN studios.internal_notes IS 'Internal notes for Competition Directors only. Not visible to Studio Directors.';

-- Add index for searching notes (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_studios_internal_notes
ON studios USING gin(to_tsvector('english', internal_notes));
```

**Rollback (down.sql if needed):**
```sql
-- Remove internal_notes column
ALTER TABLE studios DROP COLUMN IF EXISTS internal_notes;

-- Remove index
DROP INDEX IF EXISTS idx_studios_internal_notes;
```

**Notes:**
- TEXT type allows unlimited length
- NULL default means existing studios won't have notes
- GIN index enables fast text search on notes
- Comment documents the purpose

**Codex will**: Create migration file
**Claude will**: Apply migration via Supabase MCP, update Prisma schema
