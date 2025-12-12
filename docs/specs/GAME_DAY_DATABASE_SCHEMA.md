# Game Day Database Schema

**Status:** COMPLETE - Ready for Migration
**Last Updated:** December 11, 2025

---

## Overview

4 new tables + column additions to existing tables required for Game Day.

---

## 1. New Table: `live_competition_state`

Tracks real-time state of competition during Game Day.

### Schema

```sql
CREATE TABLE live_competition_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Competition reference
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Competition state
  competition_state VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- ENUM: 'pending', 'active', 'paused', 'completed'

  -- Current routine
  current_entry_id UUID REFERENCES competition_entries(id) ON DELETE SET NULL,
  current_entry_state VARCHAR(20) DEFAULT 'queued',
    -- ENUM: 'queued', 'current', 'scoring', 'completed', 'skipped', 'scratched'
  current_entry_started_at TIMESTAMPTZ,

  -- Playback state
  playback_state VARCHAR(20) DEFAULT 'idle',
    -- ENUM: 'idle', 'loading', 'ready', 'playing', 'paused', 'ended', 'error'
  playback_position_ms INT DEFAULT 0,
  playback_started_at TIMESTAMPTZ,

  -- Schedule tracking
  schedule_delay_minutes INT DEFAULT 0,
  originally_scheduled_end_time TIMESTAMPTZ,
  projected_end_time TIMESTAMPTZ,

  -- Judge visibility
  judges_can_see_scores BOOLEAN DEFAULT false,

  -- Multi-day support
  day_number INT DEFAULT 1,
  session_number INT DEFAULT 1,

  -- Timestamps
  live_mode_started_at TIMESTAMPTZ,
  live_mode_ended_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_competition_state UNIQUE(competition_id),
  CONSTRAINT valid_competition_state CHECK (
    competition_state IN ('pending', 'active', 'paused', 'completed')
  ),
  CONSTRAINT valid_entry_state CHECK (
    current_entry_state IN ('queued', 'current', 'scoring', 'completed', 'skipped', 'scratched')
  ),
  CONSTRAINT valid_playback_state CHECK (
    playback_state IN ('idle', 'loading', 'ready', 'playing', 'paused', 'ended', 'error')
  )
);

-- Indexes
CREATE INDEX idx_live_state_tenant ON live_competition_state(tenant_id);
CREATE INDEX idx_live_state_competition ON live_competition_state(competition_id);
CREATE INDEX idx_live_state_current_entry ON live_competition_state(current_entry_id);

-- RLS Policy
ALTER TABLE live_competition_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY live_state_tenant_isolation ON live_competition_state
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Prisma Model

```prisma
model live_competition_state {
  id                         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  competition_id             String    @unique @db.Uuid
  tenant_id                  String    @db.Uuid
  competition_state          String    @default("pending") @db.VarChar(20)
  current_entry_id           String?   @db.Uuid
  current_entry_state        String?   @default("queued") @db.VarChar(20)
  current_entry_started_at   DateTime? @db.Timestamptz(6)
  playback_state             String?   @default("idle") @db.VarChar(20)
  playback_position_ms       Int?      @default(0)
  playback_started_at        DateTime? @db.Timestamptz(6)
  schedule_delay_minutes     Int?      @default(0)
  judges_can_see_scores      Boolean?  @default(false)
  day_number                 Int?      @default(1)
  session_number             Int?      @default(1)
  live_mode_started_at       DateTime? @db.Timestamptz(6)
  live_mode_ended_at         DateTime? @db.Timestamptz(6)
  paused_at                  DateTime? @db.Timestamptz(6)
  last_sync_at               DateTime? @default(now()) @db.Timestamptz(6)
  created_at                 DateTime? @default(now()) @db.Timestamptz(6)
  updated_at                 DateTime? @default(now()) @db.Timestamptz(6)

  competitions               competitions @relation(fields: [competition_id], references: [id], onDelete: Cascade)
  competition_entries        competition_entries? @relation(fields: [current_entry_id], references: [id], onDelete: SetNull)
  tenants                    tenants @relation(fields: [tenant_id], references: [id], onDelete: Restrict)

  @@index([tenant_id], map: "idx_live_state_tenant")
  @@index([current_entry_id], map: "idx_live_state_current_entry")
  @@schema("public")
}
```

---

## 2. New Table: `break_requests`

Tracks judge break requests.

### Schema

```sql
CREATE TABLE break_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Request details
  requested_duration_minutes INT NOT NULL,
    -- Allowed values: 2, 5, 10
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- ENUM: 'pending', 'approved', 'denied', 'active', 'completed', 'cancelled'

  -- Response
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  deny_reason VARCHAR(255),

  -- Scheduling
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_duration_minutes INT,

  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_duration CHECK (requested_duration_minutes IN (2, 5, 10)),
  CONSTRAINT valid_break_status CHECK (
    status IN ('pending', 'approved', 'denied', 'active', 'completed', 'cancelled')
  )
);

-- Indexes
CREATE INDEX idx_break_requests_tenant ON break_requests(tenant_id);
CREATE INDEX idx_break_requests_competition ON break_requests(competition_id);
CREATE INDEX idx_break_requests_judge ON break_requests(judge_id);
CREATE INDEX idx_break_requests_status ON break_requests(status);
CREATE INDEX idx_break_requests_pending ON break_requests(competition_id, status)
  WHERE status = 'pending';

-- RLS Policy
ALTER TABLE break_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY break_requests_tenant_isolation ON break_requests
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Prisma Model

```prisma
model break_requests {
  id                         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  competition_id             String    @db.Uuid
  judge_id                   String    @db.Uuid
  tenant_id                  String    @db.Uuid
  requested_duration_minutes Int
  status                     String    @default("pending") @db.VarChar(20)
  responded_by               String?   @db.Uuid
  responded_at               DateTime? @db.Timestamptz(6)
  deny_reason                String?   @db.VarChar(255)
  scheduled_start_time       DateTime? @db.Timestamptz(6)
  actual_start_time          DateTime? @db.Timestamptz(6)
  actual_end_time            DateTime? @db.Timestamptz(6)
  actual_duration_minutes    Int?
  requested_at               DateTime? @default(now()) @db.Timestamptz(6)
  created_at                 DateTime? @default(now()) @db.Timestamptz(6)
  updated_at                 DateTime? @default(now()) @db.Timestamptz(6)

  competitions               competitions @relation(fields: [competition_id], references: [id], onDelete: Cascade)
  judges                     judges @relation(fields: [judge_id], references: [id], onDelete: Cascade)
  users                      users? @relation(fields: [responded_by], references: [id], onDelete: SetNull)
  tenants                    tenants @relation(fields: [tenant_id], references: [id], onDelete: Restrict)

  @@index([tenant_id], map: "idx_break_requests_tenant")
  @@index([competition_id], map: "idx_break_requests_competition")
  @@index([judge_id], map: "idx_break_requests_judge")
  @@index([status], map: "idx_break_requests_status")
  @@schema("public")
}
```

---

## 3. New Table: `schedule_breaks`

Tracks CD-inserted emergency/scheduled breaks.

### Schema

```sql
CREATE TABLE schedule_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Position in schedule
  insert_after_entry_id UUID REFERENCES competition_entries(id) ON DELETE SET NULL,
  day_number INT NOT NULL DEFAULT 1,
  position_in_day INT NOT NULL,

  -- Break details
  duration_minutes INT NOT NULL,
  break_type VARCHAR(20) NOT NULL DEFAULT 'emergency',
    -- ENUM: 'emergency', 'scheduled', 'lunch', 'awards', 'judge_requested'
  reason VARCHAR(255),
  title VARCHAR(100),
    -- e.g., "10 MIN BREAK", "LUNCH", "AWARDS CEREMONY"

  -- State
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    -- ENUM: 'scheduled', 'active', 'completed', 'skipped'

  -- Timing
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_duration_minutes INT,

  -- Created by
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  break_request_id UUID REFERENCES break_requests(id) ON DELETE SET NULL,
    -- If created from judge request

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_break_type CHECK (
    break_type IN ('emergency', 'scheduled', 'lunch', 'awards', 'judge_requested')
  ),
  CONSTRAINT valid_schedule_break_status CHECK (
    status IN ('scheduled', 'active', 'completed', 'skipped')
  )
);

-- Indexes
CREATE INDEX idx_schedule_breaks_tenant ON schedule_breaks(tenant_id);
CREATE INDEX idx_schedule_breaks_competition ON schedule_breaks(competition_id);
CREATE INDEX idx_schedule_breaks_day ON schedule_breaks(competition_id, day_number);
CREATE INDEX idx_schedule_breaks_position ON schedule_breaks(competition_id, day_number, position_in_day);

-- RLS Policy
ALTER TABLE schedule_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_breaks_tenant_isolation ON schedule_breaks
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Prisma Model

```prisma
model schedule_breaks {
  id                      String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  competition_id          String    @db.Uuid
  tenant_id               String    @db.Uuid
  insert_after_entry_id   String?   @db.Uuid
  day_number              Int       @default(1)
  position_in_day         Int
  duration_minutes        Int
  break_type              String    @default("emergency") @db.VarChar(20)
  reason                  String?   @db.VarChar(255)
  title                   String?   @db.VarChar(100)
  status                  String    @default("scheduled") @db.VarChar(20)
  scheduled_start_time    DateTime? @db.Timestamptz(6)
  actual_start_time       DateTime? @db.Timestamptz(6)
  actual_end_time         DateTime? @db.Timestamptz(6)
  actual_duration_minutes Int?
  created_by              String?   @db.Uuid
  break_request_id        String?   @db.Uuid
  created_at              DateTime? @default(now()) @db.Timestamptz(6)
  updated_at              DateTime? @default(now()) @db.Timestamptz(6)

  competitions            competitions @relation(fields: [competition_id], references: [id], onDelete: Cascade)
  competition_entries     competition_entries? @relation(fields: [insert_after_entry_id], references: [id], onDelete: SetNull)
  users                   users? @relation(fields: [created_by], references: [id], onDelete: SetNull)
  break_requests          break_requests? @relation(fields: [break_request_id], references: [id], onDelete: SetNull)
  tenants                 tenants @relation(fields: [tenant_id], references: [id], onDelete: Restrict)

  @@index([tenant_id], map: "idx_schedule_breaks_tenant")
  @@index([competition_id], map: "idx_schedule_breaks_competition")
  @@index([competition_id, day_number], map: "idx_schedule_breaks_day")
  @@schema("public")
}
```

---

## 4. New Table: `score_audit_log`

Tracks all score edits for audit trail.

### Schema

```sql
CREATE TABLE score_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  score_id UUID NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Score change
  previous_score DECIMAL(6,2),
  new_score DECIMAL(6,2) NOT NULL,
  score_delta DECIMAL(6,2) GENERATED ALWAYS AS (new_score - COALESCE(previous_score, 0)) STORED,

  -- Edit metadata
  edit_type VARCHAR(20) NOT NULL,
    -- ENUM: 'initial', 'judge_edit', 'cd_edit', 'finalized'
  edit_reason VARCHAR(255),

  -- Editor
  edited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  editor_role VARCHAR(20) NOT NULL,
    -- ENUM: 'judge', 'cd', 'sa'

  -- Timestamps
  edited_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_edit_type CHECK (
    edit_type IN ('initial', 'judge_edit', 'cd_edit', 'finalized')
  ),
  CONSTRAINT valid_score_range CHECK (
    new_score >= 60 AND new_score <= 100
  )
);

-- Indexes
CREATE INDEX idx_score_audit_tenant ON score_audit_log(tenant_id);
CREATE INDEX idx_score_audit_score ON score_audit_log(score_id);
CREATE INDEX idx_score_audit_entry ON score_audit_log(entry_id);
CREATE INDEX idx_score_audit_judge ON score_audit_log(judge_id);
CREATE INDEX idx_score_audit_edited_at ON score_audit_log(edited_at DESC);
CREATE INDEX idx_score_audit_editor ON score_audit_log(edited_by);

-- RLS Policy
ALTER TABLE score_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY score_audit_tenant_isolation ON score_audit_log
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Prisma Model

```prisma
model score_audit_log {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  score_id         String    @db.Uuid
  entry_id         String    @db.Uuid
  judge_id         String    @db.Uuid
  tenant_id        String    @db.Uuid
  previous_score   Decimal?  @db.Decimal(6, 2)
  new_score        Decimal   @db.Decimal(6, 2)
  edit_type        String    @db.VarChar(20)
  edit_reason      String?   @db.VarChar(255)
  edited_by        String    @db.Uuid
  editor_role      String    @db.VarChar(20)
  edited_at        DateTime? @default(now()) @db.Timestamptz(6)

  scores                   scores @relation(fields: [score_id], references: [id], onDelete: Cascade)
  competition_entries      competition_entries @relation(fields: [entry_id], references: [id], onDelete: Cascade)
  judges                   judges @relation(fields: [judge_id], references: [id], onDelete: Cascade)
  users                    users @relation(fields: [edited_by], references: [id], onDelete: Restrict)
  tenants                  tenants @relation(fields: [tenant_id], references: [id], onDelete: Restrict)

  @@index([tenant_id], map: "idx_score_audit_tenant")
  @@index([score_id], map: "idx_score_audit_score")
  @@index([entry_id], map: "idx_score_audit_entry")
  @@index([judge_id], map: "idx_score_audit_judge")
  @@index([edited_at(sort: Desc)], map: "idx_score_audit_edited_at")
  @@schema("public")
}
```

---

## 5. Column Additions to Existing Tables

### 5.1 `competition_entries` additions

```sql
ALTER TABLE competition_entries
ADD COLUMN live_status VARCHAR(20) DEFAULT 'queued',
ADD COLUMN scratched_reason VARCHAR(255),
ADD COLUMN scratched_at TIMESTAMPTZ,
ADD COLUMN scratched_by UUID REFERENCES users(id),
ADD COLUMN mp3_duration_ms INT,
ADD COLUMN mp3_validated BOOLEAN DEFAULT false,
ADD COLUMN mp3_validation_error VARCHAR(255);

-- Add constraint
ALTER TABLE competition_entries
ADD CONSTRAINT valid_live_status CHECK (
  live_status IN ('queued', 'current', 'scoring', 'completed', 'skipped', 'scratched')
);

-- Add index for live queries
CREATE INDEX idx_entries_live_status ON competition_entries(competition_id, live_status);
```

### 5.2 `judges` additions

```sql
ALTER TABLE judges
ADD COLUMN pin_code VARCHAR(6),
ADD COLUMN judge_position VARCHAR(1), -- 'A', 'B', or 'C'
ADD COLUMN last_seen_at TIMESTAMPTZ,
ADD COLUMN current_status VARCHAR(20) DEFAULT 'offline',
ADD COLUMN device_id VARCHAR(255),
ADD COLUMN session_token VARCHAR(255);

-- Add constraint for judge position (A, B, C only)
ALTER TABLE judges
ADD CONSTRAINT valid_judge_position CHECK (
  judge_position IN ('A', 'B', 'C')
);

-- Add constraint
ALTER TABLE judges
ADD CONSTRAINT valid_judge_status CHECK (
  current_status IN ('offline', 'connected', 'scoring', 'submitted', 'break_requested')
);

-- Add index for connection tracking
CREATE INDEX idx_judges_status ON judges(competition_id, current_status);
```

### 5.3 `competitions` additions

```sql
ALTER TABLE competitions
ADD COLUMN live_mode_started_at TIMESTAMPTZ,
ADD COLUMN live_mode_ended_at TIMESTAMPTZ,
ADD COLUMN entry_number_start INT DEFAULT 100,
ADD COLUMN entry_numbers_locked BOOLEAN DEFAULT false,
ADD COLUMN entry_numbers_locked_at TIMESTAMPTZ;
```

### 5.4 `scores` additions

```sql
ALTER TABLE scores
ADD COLUMN status VARCHAR(20) DEFAULT 'draft',
ADD COLUMN submitted_at TIMESTAMPTZ,
ADD COLUMN finalized_at TIMESTAMPTZ;

-- Add constraint for score range (00.00-99.99 XX.XX format)
ALTER TABLE scores
ADD CONSTRAINT valid_total_score_range CHECK (
  total_score >= 0.00 AND total_score <= 99.99
);

-- Add constraint for status
ALTER TABLE scores
ADD CONSTRAINT valid_score_status CHECK (
  status IN ('draft', 'submitted', 'edited', 'final')
);
```

### 5.5 `competition_settings` additions (TENANT-CONFIGURABLE ADJUDICATION LEVELS)

```sql
-- Adjudication levels are TENANT-CONFIGURABLE
-- Each tenant defines their own level names, score ranges, and display colors
ALTER TABLE competition_settings
ADD COLUMN adjudication_levels JSONB DEFAULT '{
  "levels": [
    {"name": "Dynamic Diamond", "min": 95.00, "max": 99.99, "color": "#00D4FF"},
    {"name": "Titanium", "min": 92.00, "max": 94.99, "color": "#C0C0C0"},
    {"name": "Platinum", "min": 88.00, "max": 91.99, "color": "#E5E4E2"},
    {"name": "Afterglow", "min": 85.00, "max": 87.99, "color": "#FFD700"},
    {"name": "High Gold", "min": 82.00, "max": 84.99, "color": "#DAA520"},
    {"name": "Gold", "min": 78.00, "max": 81.99, "color": "#FFD700"},
    {"name": "Silver", "min": 72.00, "max": 77.99, "color": "#C0C0C0"},
    {"name": "Bronze", "min": 65.00, "max": 71.99, "color": "#CD7F32"},
    {"name": "Participation", "min": 0.00, "max": 64.99, "color": "#808080"}
  ],
  "edgeCaseThreshold": 0.1
}'::JSONB;

-- Example JSONB structure:
-- {
--   "levels": [
--     { "name": "Dynamic Diamond", "min": 95.00, "max": 99.99, "color": "#00D4FF" },
--     { "name": "Titanium", "min": 92.00, "max": 94.99, "color": "#C0C0C0" },
--     ...
--   ],
--   "edgeCaseThreshold": 0.1  -- Alert when score diff < this causes level bump
-- }

-- Add GIN index for JSONB queries (if needed)
CREATE INDEX idx_comp_settings_adj_levels ON competition_settings USING GIN (adjudication_levels);
```

---

## 6. Migration SQL

### Full Migration Script

```sql
-- Migration: Game Day Tables
-- Date: 2025-12-11
-- Description: Add tables and columns for Game Day / At Competition Mode

BEGIN;

-- 1. Create live_competition_state table
CREATE TABLE IF NOT EXISTS live_competition_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  competition_state VARCHAR(20) NOT NULL DEFAULT 'pending',
  current_entry_id UUID REFERENCES competition_entries(id) ON DELETE SET NULL,
  current_entry_state VARCHAR(20) DEFAULT 'queued',
  current_entry_started_at TIMESTAMPTZ,
  playback_state VARCHAR(20) DEFAULT 'idle',
  playback_position_ms INT DEFAULT 0,
  playback_started_at TIMESTAMPTZ,
  schedule_delay_minutes INT DEFAULT 0,
  judges_can_see_scores BOOLEAN DEFAULT false,
  day_number INT DEFAULT 1,
  session_number INT DEFAULT 1,
  live_mode_started_at TIMESTAMPTZ,
  live_mode_ended_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_competition_state UNIQUE(competition_id)
);

-- 2. Create break_requests table
CREATE TABLE IF NOT EXISTS break_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  requested_duration_minutes INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  deny_reason VARCHAR(255),
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_duration_minutes INT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create schedule_breaks table
CREATE TABLE IF NOT EXISTS schedule_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  insert_after_entry_id UUID REFERENCES competition_entries(id) ON DELETE SET NULL,
  day_number INT NOT NULL DEFAULT 1,
  position_in_day INT NOT NULL,
  duration_minutes INT NOT NULL,
  break_type VARCHAR(20) NOT NULL DEFAULT 'emergency',
  reason VARCHAR(255),
  title VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_duration_minutes INT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  break_request_id UUID REFERENCES break_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create score_audit_log table
CREATE TABLE IF NOT EXISTS score_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  previous_score DECIMAL(6,2),
  new_score DECIMAL(6,2) NOT NULL,
  edit_type VARCHAR(20) NOT NULL,
  edit_reason VARCHAR(255),
  edited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  editor_role VARCHAR(20) NOT NULL,
  edited_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Add columns to competition_entries
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS live_status VARCHAR(20) DEFAULT 'queued',
ADD COLUMN IF NOT EXISTS scratched_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS scratched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scratched_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS mp3_duration_ms INT,
ADD COLUMN IF NOT EXISTS mp3_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mp3_validation_error VARCHAR(255);

-- 6. Add columns to judges
ALTER TABLE judges
ADD COLUMN IF NOT EXISTS pin_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_token VARCHAR(255);

-- 7. Add columns to competitions
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS live_mode_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS live_mode_ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS entry_number_start INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS entry_numbers_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS entry_numbers_locked_at TIMESTAMPTZ;

-- 8. Add columns to scores
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- 9. Create all indexes
CREATE INDEX IF NOT EXISTS idx_live_state_tenant ON live_competition_state(tenant_id);
CREATE INDEX IF NOT EXISTS idx_live_state_competition ON live_competition_state(competition_id);
CREATE INDEX IF NOT EXISTS idx_break_requests_tenant ON break_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_break_requests_competition ON break_requests(competition_id);
CREATE INDEX IF NOT EXISTS idx_break_requests_judge ON break_requests(judge_id);
CREATE INDEX IF NOT EXISTS idx_break_requests_status ON break_requests(status);
CREATE INDEX IF NOT EXISTS idx_schedule_breaks_tenant ON schedule_breaks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_breaks_competition ON schedule_breaks(competition_id);
CREATE INDEX IF NOT EXISTS idx_score_audit_tenant ON score_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_score_audit_score ON score_audit_log(score_id);
CREATE INDEX IF NOT EXISTS idx_score_audit_entry ON score_audit_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_entries_live_status ON competition_entries(competition_id, live_status);
CREATE INDEX IF NOT EXISTS idx_judges_status ON judges(competition_id, current_status);

-- 10. Enable RLS on all new tables
ALTER TABLE live_competition_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_audit_log ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies
CREATE POLICY live_state_tenant_isolation ON live_competition_state
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY break_requests_tenant_isolation ON break_requests
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY schedule_breaks_tenant_isolation ON schedule_breaks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY score_audit_tenant_isolation ON score_audit_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMIT;
```

---

## 7. Rollback Script

```sql
-- Rollback: Game Day Tables
BEGIN;

DROP TABLE IF EXISTS score_audit_log CASCADE;
DROP TABLE IF EXISTS schedule_breaks CASCADE;
DROP TABLE IF EXISTS break_requests CASCADE;
DROP TABLE IF EXISTS live_competition_state CASCADE;

ALTER TABLE competition_entries
DROP COLUMN IF EXISTS live_status,
DROP COLUMN IF EXISTS scratched_reason,
DROP COLUMN IF EXISTS scratched_at,
DROP COLUMN IF EXISTS scratched_by,
DROP COLUMN IF EXISTS mp3_duration_ms,
DROP COLUMN IF EXISTS mp3_validated,
DROP COLUMN IF EXISTS mp3_validation_error;

ALTER TABLE judges
DROP COLUMN IF EXISTS pin_code,
DROP COLUMN IF EXISTS last_seen_at,
DROP COLUMN IF EXISTS current_status,
DROP COLUMN IF EXISTS device_id,
DROP COLUMN IF EXISTS session_token;

ALTER TABLE competitions
DROP COLUMN IF EXISTS live_mode_started_at,
DROP COLUMN IF EXISTS live_mode_ended_at,
DROP COLUMN IF EXISTS entry_number_start,
DROP COLUMN IF EXISTS entry_numbers_locked,
DROP COLUMN IF EXISTS entry_numbers_locked_at;

ALTER TABLE scores
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS submitted_at,
DROP COLUMN IF EXISTS finalized_at;

COMMIT;
```

---

*Database schema is complete with all 4 new tables, column additions, indexes, and RLS policies. Ready for migration.*
