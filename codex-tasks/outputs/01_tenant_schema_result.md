# 01_tenant_schema_result

Summary
- Multi-tenancy is already implemented in `prisma/schema.prisma` at project root.
- `public.tenants` model exists; `tenant_id` with FK + indexes exists on: `competitions`, `studios`, `user_profiles`, `reservations`, `competition_entries`, `invoices`, `dancers`.
- Per `.codexrc` database policy, I did not modify the Prisma schema. Instead, I created a migration SQL to seed required tenants and assign existing competitions.

Files
- Migration (copy-paste to real migration if desired): `codex-tasks/migrations/20251010_seed_tenants_and_assign.sql`

Migration SQL
```sql
-- Multi-tenancy seed and assignment migration (copy into prisma migration if needed)
-- Safe for re-run: uses ON CONFLICT and non-destructive updates

-- 1) Seed tenants 'demo' and 'empwr'
INSERT INTO public.tenants (id, slug, subdomain, name, branding)
VALUES
  (gen_random_uuid(), 'demo', 'demo', 'Demo Competition Portal',
   '{"primaryColor": "#6366F1", "secondaryColor": "#8B5CF6", "logo": null, "tagline": "Dance Competition Management"}'::jsonb),
  (gen_random_uuid(), 'empwr', 'empwr', 'EMPWR Dance',
   '{"primaryColor": "#8B5CF6", "secondaryColor": "#EC4899", "logo": null, "tagline": "Empowering Dance Excellence"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 2) Ensure useful indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_competitions_tenant ON public.competitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_studios_tenant ON public.studios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON public.reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_tenant ON public.competition_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dancers_tenant ON public.dancers(tenant_id);

-- 3) Assign existing competitions by name pattern
--   - Names containing 'GLOW' -> demo
--   - All others -> empwr
UPDATE public.competitions c
SET tenant_id = t.id
FROM public.tenants t
WHERE t.slug = 'demo'
  AND c.name ILIKE '%GLOW%'
  AND c.tenant_id IS DISTINCT FROM t.id;

UPDATE public.competitions c
SET tenant_id = t.id
FROM public.tenants t
WHERE t.slug = 'empwr'
  AND (c.name IS NULL OR c.name NOT ILIKE '%GLOW%')
  AND c.tenant_id IS DISTINCT FROM t.id;
```

Validation Checklist
- Prisma schema compiles: no changes were introduced to schema in this step. `npx prisma validate` should continue to pass.
- Relations preserved: all existing FKs remain; migration only seeds and updates data.
- Indexes present: idempotent `CREATE INDEX IF NOT EXISTS` added for each tenant column.
- Cascade delete: existing relations in schema already use `onDelete: Cascade` where defined (e.g., tenants -> studios, competitions, etc.).

Notes
- Request asked to update `prisma/schema.prisma`, but `.codexrc` forbids schema edits for junior tasks. If you want me to also update the Prisma schema, please confirm and I’ll proceed in a follow-up.
- If you prefer fixed UUIDs for tenants, I can adjust the seed to use provided constants instead of `gen_random_uuid()`.

