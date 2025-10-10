#!/usr/bin/env markdown
# CompPortal – Project Context (Snapshot)

Overview
- Next.js 15 app for dance competition management with tRPC 11 and Prisma/Postgres (Supabase). Tailwind UI, React Hook Form + Zod for forms, NextAuth v5 for auth, TanStack Query for data, react-hot-toast for notifications. Email templates via @react-email/components and Resend.
- Multi-tenant architecture (public.tenants) with tenant_id on core tables. RLS in auth/public schemas (Supabase-flavored policies present in schema/migrations).

Stack
- Framework: Next.js ^15, React 18
- API: tRPC ^11 (routers under `src/server/routers`)
- DB: Prisma ^6 with `schemas = ["auth","public"]` using PostgreSQL; `@prisma/adapter-pg` + `pg`
- Auth: next-auth ^5 (beta), Supabase client/SSR helpers present
- Styling: Tailwind ^3
- Forms/Validation: react-hook-form ^7 + zod ^3
- Email: @react-email/components, react-email, Resend
- Utilities: superjson, date-fns, TanStack Query, dnd-kit

Scripts (package.json)
- `dev`: next dev
- `build`: next build
- `start`: next start
- `lint`: next lint
- `postinstall`: prisma generate
- `db:seed`: tsx prisma/seed.ts
- `db:reset`: prisma migrate reset && npm run db:seed

Key Directories
- `src/app`: Next.js app routes (e.g., dashboard, auth pages)
- `src/components`: Reusable UI (dashboards, modals, widgets)
- `src/contexts`: Tenant theme/context
- `src/emails`: React email templates
- `src/hooks`: Custom hooks (activity feed, autosave, etc.)
- `src/lib`: Prisma client, tRPC client/provider, email renderer, Supabase utils
- `src/providers`: tRPC provider
- `src/server`: tRPC backend (`routers`, `trpc.ts`)
- `prisma`: Prisma schema for `auth` and `public` schemas
- `codex-tasks`: Decomposition tasks, outputs, migrations, statuses

API Routers (src/server/routers)
- activity: Activity feed (getActivities, logActivity)
- admin, analytics, reports, settings
- competition, reservation, scheduling
- entry, dancer, studio, invoice, judges
- lookup, email, music
- user: getCurrentUser, dashboard layout, updateProfile

DB/Prisma
- Provider: postgresql; multiSchema (auth/public). EngineType library.
- Notable public tables (from schema): competitions, competition_entries, studios, reservations, invoices, dancers, user_profiles, tenants, competition_settings, etc. Most are RLS-enabled and include tenant_id where applicable.
- Tenancy: `public.tenants` plus `tenant_id` FKs and indexes on major models.

Design & UX Conventions
- Glassmorphic cards: `bg-white/10 backdrop-blur-md rounded-xl border border-white/20`
- Gradients: `bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900`
- Emoji-only icons in UI
- Forms: RHF + Zod patterns, async loading states, toasts for feedback

Emails
- Templates in `src/emails` (e.g., StudioApproved, ReservationApproved, InvoiceDelivery, MissingMusicReminder, PaymentConfirmed, RegistrationConfirmation)
- Renderer helpers in `src/lib/email-templates.tsx` (subject mapping, render functions); WelcomeEmail template added and renderer exposed.

Security
- Do not modify `/generated` or `/node_modules`
- Row Level Security noted in `auth` and several `public` models
- Supabase SSR + middleware present (e.g., `src/lib/supabase-*`, `middleware.ts`)

Recent Implementations (by task)
- Activity Feed Backend
  - Migration: `codex-tasks/migrations/20251010_create_activity_logs.sql`
  - Helper: `src/lib/activity.ts` (logActivity/mapAction/generateEntityUrl)
  - Router: `src/server/routers/activity.ts` + registered in `_app.ts`
- Bulk Judge Import
  - UI: `src/components/JudgeBulkImportModal.tsx` (CSV parse/validate/preview; import stub)
- Competition Filter Dropdown
  - UI + hook: `src/components/CompetitionFilter.tsx`
- Routine Status Timeline
  - UI: `src/components/RoutineStatusTimeline.tsx` (full + compact)
- Quote Component
  - UI: `src/components/DanceQuote.tsx`
- Welcome Greeting
  - UI: `src/components/WelcomeGreeting.tsx`
- Routine Card CSS Fix
  - Update: `src/components/EntriesList.tsx` (consistent heights)
- Quick Stats Widget
  - UI: `src/components/QuickStatsWidget.tsx`
- Studio Setup Wizard
  - UI: `src/components/StudioSetupWizard.tsx`
- Support Chat Embed
  - Update: `src/app/layout.tsx` (Crisp Script placeholder)
- Private Notes Migration
  - SQL: `codex-tasks/migrations/20251010_add_private_notes_to_studios.sql`
- Welcome Email Template
  - Email: `src/emails/WelcomeEmail.tsx` + renderer hookup
- Form Validation Feedback
  - UI: `DancerForm.tsx`, `ReservationForm.tsx` (inline error visuals)
- Profile Settings Page
  - Page: `src/app/dashboard/settings/page.tsx`
  - Form: `src/components/ProfileSettingsForm.tsx`
  - Backend: `user.updateProfile`, `getCurrentUser` extended
- Signup “User Exists” Flow
  - Page: `src/app/signup/page.tsx` improved error UX
  - New Page: `src/app/reset-password/page.tsx`

Validated Outputs & Status (task tracking)
- All tasks in `codex-tasks/*.md` have matching:
  - Output: `codex-tasks/outputs/[TASK_NAME]_result.md`
  - Status: `codex-tasks/status/STATUS_[TASK_NAME].md`
- Summary: `codex-tasks/status/STATUS_all_tasks_completed.md`

Run/Build
- Env: `.env.local` (see example), `.codexrc` includes defaults (NEXT_PUBLIC_APP_URL, SUPABASE_URL/PROJECT_ID)
- Develop: `npm run dev`
- Build: `npm run build` then `npm start`
- Prisma: `npx prisma generate` (postinstall), `npx prisma validate` (optional), custom SQL migrations under `codex-tasks/migrations/` (schema edits are avoided per policy)

Integration Notes
- Activity logging: call `logActivity` helper in key mutations (entry create/update, invoice payments, reservations)
- Judge import: wire a `judges.bulkImport` server mutation (validate + upsert) and invoke from modal
- Emails: add subject mapping for `welcome` in `getEmailSubject` if desired; ensure templates render via `renderWelcomeEmail`
- UI components: integrate `CompetitionFilter`, `QuickStatsWidget`, and `RoutineStatusTimeline` into dashboards and entry pages

Open Questions / TODOs
- Confirm final Crisp Website ID and production toggle
- Decide on permanent subject mapping for Welcome Email
- Expand validations with Zod in forms where RHF-only checks exist
- Add tests and e2e where critical flows exist (auth/signup/reservations/entries)

References
- `package.json`: scripts and deps
- `prisma/schema.prisma`: model definitions across `auth` and `public`
- `src/server/trpc.ts`: context and auth guards (protected/admin procedures)
- `src/server/routers/_app.ts`: tRPC router registration
- `codex-tasks/*.md`: task specifications and completed results

