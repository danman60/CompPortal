-- CreateTable: tenants table for multi-tenant architecture
CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "subdomain" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "branding" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraints for tenants
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "public"."tenants"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_subdomain_key" ON "public"."tenants"("subdomain");

-- AlterTable: Add tenant_id to competitions
ALTER TABLE "public"."competitions" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- AlterTable: Add tenant_id to studios
ALTER TABLE "public"."studios" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- AlterTable: Add tenant_id to user_profiles (nullable for super_admin)
ALTER TABLE "public"."user_profiles" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- AlterTable: Add tenant_id to reservations
ALTER TABLE "public"."reservations" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- AlterTable: Add tenant_id to competition_entries
ALTER TABLE "public"."competition_entries" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- AlterTable: Add tenant_id to invoices
ALTER TABLE "public"."invoices" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- AlterTable: Add tenant_id to dancers
ALTER TABLE "public"."dancers" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- Seed tenants BEFORE creating foreign keys
INSERT INTO "public"."tenants" ("id", "slug", "subdomain", "name", "branding", "created_at", "updated_at")
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'demo',
    'demo',
    'Demo Competition Portal',
    '{"primaryColor": "#6366F1", "secondaryColor": "#8B5CF6", "logo": null, "tagline": "Dance Competition Management"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'empwr',
    'empwr',
    'EMPWR Dance',
    '{"primaryColor": "#8B5CF6", "secondaryColor": "#EC4899", "logo": null, "tagline": "Empowering Dance Excellence"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (slug) DO NOTHING;

-- Assign existing competitions to tenants
-- All competitions with "GLOW" in name → demo tenant
UPDATE "public"."competitions"
SET "tenant_id" = '00000000-0000-0000-0000-000000000001'::uuid
WHERE UPPER("name") LIKE '%GLOW%';

-- All other competitions → empwr tenant
UPDATE "public"."competitions"
SET "tenant_id" = '00000000-0000-0000-0000-000000000002'::uuid
WHERE UPPER("name") NOT LIKE '%GLOW%';

-- Assign all studios to empwr tenant by default (can be reassigned later)
UPDATE "public"."studios"
SET "tenant_id" = '00000000-0000-0000-0000-000000000002'::uuid;

-- Assign user_profiles based on their studios' tenant (will be NULL for super_admin)
UPDATE "public"."user_profiles" up
SET "tenant_id" = s."tenant_id"
FROM "public"."studios" s
WHERE s."owner_id" = up."id";

-- Update reservations tenant_id based on competition
UPDATE "public"."reservations" r
SET "tenant_id" = c."tenant_id"
FROM "public"."competitions" c
WHERE r."competition_id" = c."id";

-- Update competition_entries tenant_id based on competition
UPDATE "public"."competition_entries" ce
SET "tenant_id" = c."tenant_id"
FROM "public"."competitions" c
WHERE ce."competition_id" = c."id";

-- Update invoices tenant_id based on competition
UPDATE "public"."invoices" i
SET "tenant_id" = c."tenant_id"
FROM "public"."competitions" c
WHERE i."competition_id" = c."id";

-- Update dancers tenant_id based on studio
UPDATE "public"."dancers" d
SET "tenant_id" = s."tenant_id"
FROM "public"."studios" s
WHERE d."studio_id" = s."id";

-- AddForeignKey: competitions → tenants
ALTER TABLE "public"."competitions" ADD CONSTRAINT "competitions_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: studios → tenants
ALTER TABLE "public"."studios" ADD CONSTRAINT "studios_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: user_profiles → tenants (nullable)
ALTER TABLE "public"."user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: reservations → tenants
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: competition_entries → tenants
ALTER TABLE "public"."competition_entries" ADD CONSTRAINT "competition_entries_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: invoices → tenants
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: dancers → tenants
ALTER TABLE "public"."dancers" ADD CONSTRAINT "dancers_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: competitions tenant_id
CREATE INDEX IF NOT EXISTS "idx_competitions_tenant" ON "public"."competitions"("tenant_id");

-- CreateIndex: studios tenant_id
CREATE INDEX IF NOT EXISTS "idx_studios_tenant" ON "public"."studios"("tenant_id");

-- CreateIndex: user_profiles tenant_id
CREATE INDEX IF NOT EXISTS "idx_user_profiles_tenant" ON "public"."user_profiles"("tenant_id");

-- CreateIndex: reservations tenant_id
CREATE INDEX IF NOT EXISTS "idx_reservations_tenant" ON "public"."reservations"("tenant_id");

-- CreateIndex: competition_entries tenant_id
CREATE INDEX IF NOT EXISTS "idx_entries_tenant" ON "public"."competition_entries"("tenant_id");

-- CreateIndex: invoices tenant_id
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant" ON "public"."invoices"("tenant_id");

-- CreateIndex: dancers tenant_id
CREATE INDEX IF NOT EXISTS "idx_dancers_tenant" ON "public"."dancers"("tenant_id");
