-- Query Optimization: Add strategic indexes for common access patterns
-- Target: Reduce query times for frequently accessed data

-- ============================================================================
-- COMPOSITE INDEXES FOR TENANT + STATUS FILTERING
-- ============================================================================
-- Most queries filter by tenant_id first, then status
-- These composite indexes allow efficient filtering on both columns

CREATE INDEX IF NOT EXISTS "idx_studios_tenant_status"
  ON "public"."studios"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_competitions_tenant_status"
  ON "public"."competitions"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_reservations_tenant_status"
  ON "public"."reservations"("tenant_id", "status");

-- ============================================================================
-- TIMESTAMP INDEXES FOR SORTING AND RANGE QUERIES
-- ============================================================================
-- Commonly used for "recent items" queries and date range filtering

CREATE INDEX IF NOT EXISTS "idx_dancers_created_at"
  ON "public"."dancers"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_studios_created_at"
  ON "public"."studios"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_reservations_created_at"
  ON "public"."reservations"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_invoices_created_at"
  ON "public"."invoices"("created_at" DESC);

-- ============================================================================
-- TENANT + TIMESTAMP COMPOSITE INDEXES
-- ============================================================================
-- For "recent items in tenant" queries (dashboard widgets, activity feeds)

CREATE INDEX IF NOT EXISTS "idx_entries_tenant_created"
  ON "public"."entries"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_dancers_tenant_created"
  ON "public"."dancers"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_timestamp"
  ON "public"."activity_logs"("tenant_id", "timestamp" DESC);

-- ============================================================================
-- FOREIGN KEY INDEXES (if missing)
-- ============================================================================
-- PostgreSQL doesn't auto-index foreign keys, but they're heavily used in joins

CREATE INDEX IF NOT EXISTS "idx_entries_age_group_id"
  ON "public"."entries"("age_group_id");

CREATE INDEX IF NOT EXISTS "idx_entries_entry_size_category_id"
  ON "public"."entries"("entry_size_category_id");

CREATE INDEX IF NOT EXISTS "idx_dancers_tenant_id"
  ON "public"."dancers"("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_id"
  ON "public"."invoices"("tenant_id");

-- ============================================================================
-- STUDIO + COMPETITION COMPOSITE INDEXES
-- ============================================================================
-- For studio-specific competition queries (reservations list, invoice generation)

CREATE INDEX IF NOT EXISTS "idx_reservations_studio_competition"
  ON "public"."reservations"("studio_id", "competition_id");

CREATE INDEX IF NOT EXISTS "idx_entries_studio_competition"
  ON "public"."entries"("studio_id", "competition_id");

CREATE INDEX IF NOT EXISTS "idx_invoices_studio_competition"
  ON "public"."invoices"("studio_id", "competition_id");

-- ============================================================================
-- USER ROLE LOOKUP OPTIMIZATION
-- ============================================================================
-- Frequently queried for permission checks

CREATE INDEX IF NOT EXISTS "idx_user_roles_user_tenant"
  ON "public"."user_roles"("user_id", "tenant_id");

CREATE INDEX IF NOT EXISTS "idx_user_roles_role"
  ON "public"."user_roles"("role");

-- ============================================================================
-- EMAIL TRACKING INDEXES
-- ============================================================================
-- For email delivery monitoring and retry logic

CREATE INDEX IF NOT EXISTS "idx_email_logs_status"
  ON "public"."email_logs"("status");

CREATE INDEX IF NOT EXISTS "idx_email_logs_sent_at"
  ON "public"."email_logs"("sent_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_email_logs_tenant_status"
  ON "public"."email_logs"("tenant_id", "status");

-- ============================================================================
-- COMPETITION DATE RANGE QUERIES
-- ============================================================================
-- For filtering active/upcoming competitions

CREATE INDEX IF NOT EXISTS "idx_competitions_start_date"
  ON "public"."competitions"("competition_start_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_competitions_end_date"
  ON "public"."competitions"("competition_end_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_competitions_tenant_dates"
  ON "public"."competitions"("tenant_id", "competition_start_date", "competition_end_date");

-- ============================================================================
-- ENTRY NUMBER LOOKUP OPTIMIZATION
-- ============================================================================
-- For quick entry lookups by number

CREATE INDEX IF NOT EXISTS "idx_entries_entry_number"
  ON "public"."entries"("entry_number");

-- ============================================================================
-- MUSIC FILE TRACKING
-- ============================================================================
-- For music upload status monitoring

CREATE INDEX IF NOT EXISTS "idx_entries_music_status"
  ON "public"."entries"("music_file_url")
  WHERE "music_file_url" IS NOT NULL;

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================
-- Smaller indexes for specific query patterns

-- Active competitions only
CREATE INDEX IF NOT EXISTS "idx_competitions_active"
  ON "public"."competitions"("tenant_id", "competition_start_date")
  WHERE "status" = 'active';

-- Pending reservations (awaiting approval)
CREATE INDEX IF NOT EXISTS "idx_reservations_pending"
  ON "public"."reservations"("tenant_id", "created_at" DESC)
  WHERE "status" = 'pending';

-- Unpaid invoices
CREATE INDEX IF NOT EXISTS "idx_invoices_unpaid"
  ON "public"."invoices"("tenant_id", "studio_id", "created_at" DESC)
  WHERE "status" = 'UNPAID';

-- Active studios only
CREATE INDEX IF NOT EXISTS "idx_studios_active"
  ON "public"."studios"("tenant_id", "name")
  WHERE "status" = 'active';

-- ============================================================================
-- TEXT SEARCH OPTIMIZATION
-- ============================================================================
-- B-tree indexes for prefix matching (studio/entry search)

CREATE INDEX IF NOT EXISTS "idx_studios_name_lower"
  ON "public"."studios"(LOWER("name") text_pattern_ops);

CREATE INDEX IF NOT EXISTS "idx_entries_title_lower"
  ON "public"."entries"(LOWER("routine_title") text_pattern_ops);

CREATE INDEX IF NOT EXISTS "idx_dancers_name"
  ON "public"."dancers"("first_name", "last_name");

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================
-- Update statistics for query optimizer

ANALYZE public.entries;
ANALYZE public.studios;
ANALYZE public.competitions;
ANALYZE public.reservations;
ANALYZE public.dancers;
ANALYZE public.invoices;
ANALYZE public.user_roles;
ANALYZE public.activity_logs;
