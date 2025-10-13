## Multi‑User Studio Accounts with Roles – Result

Status: ✅ Migration added

Migration
- Added file: `codex-tasks/migrations/20251012_add_studio_users_roles.sql`
  - Creates `public.studio_users` join table with role and JSONB permissions
  - Adds indexes and RLS policies for select/insert/update/delete
  - Seeds existing studio owners into `studio_users` as `owner`

Next Steps (optional)
- Add minimal tRPC endpoints to list/add/remove studio users
- Update studio settings UI to manage users and roles

Build
- No code changes required; database migration only. Global build still blocked by unrelated resolver dependency.

