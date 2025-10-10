#!/usr/bin/env markdown
# activity_feed_backend_result

Files
- codex-tasks/migrations/20251010_create_activity_logs.sql
- src/lib/activity.ts
- src/server/routers/activity.ts
- src/server/routers/_app.ts (router registration)

Summary
- Added SQL migration to create `public.activity_logs` with indexes and RLS policies.
- Implemented activity router: `getActivities` (paginated, filter by `entityType`) and `logActivity`.
- Added helper `logActivity()` + `mapActionToType()` + `generateEntityUrl()` in `src/lib/activity.ts` using Prisma raw SQL (no Prisma model required).
- Registered router under `activity` in `_app.ts`.

Router Usage
- Query: `trpc.activity.getActivities.useQuery({ limit, offset, entityType })`.
- Mutation: `trpc.activity.logActivity.mutate({ action, entityType, entityId?, entityName?, details? })`.

Notes
- Kept Prisma schema unchanged per `.codexrc`; used `$queryRaw`/`$executeRaw` for access.
- Policies reference `auth.uid()` consistent with Supabase.

