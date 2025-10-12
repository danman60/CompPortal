#!/usr/bin/env markdown
# Bootstrap Checklist (Quick Start)

Purpose
- Fast startup guide to regain context and begin work immediately.

Load Context
- Read `.codexrc` for workflow and directories.
- Skim project snapshot: `codex-tasks/outputs/PROJECT_CONTEXT.md`.
- Review recent history: `codex-tasks/logs/ROLLING_LOG.md` and the latest `codex-tasks/logs/SESSION_YYYY-MM-DD.md`.

Environment
- Ensure these env vars are set for email/chat:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`
  - `EMAIL_FROM`, `SUPPORT_EMAIL`
  - `INBOUND_EMAIL_SECRET` (for `/api/email/inbound`)
  - `NEXT_PUBLIC_APP_URL`

Dev Commands
- Install deps (if needed): `npm install`
- Develop: `npm run dev`
- Build: `npm run build` then `npm start`

Daily Task Loop
1) Check for questions/answers: `codex-tasks/questions/`, `codex-tasks/answers/`.
2) Scan tasks: `codex-tasks/*.md` (non-doc files).
3) Implement; write result to `codex-tasks/outputs/[TASK_NAME]_result.md`.
4) Update status: `codex-tasks/status/STATUS_[TASK_NAME].md`.
5) If blocked/unclear, add a question/blocker file per `.codexrc`.

Support Chat (Option A with n8n)
- Outbound: handled by SMTP via `src/lib/email.ts`; tokenized subject (CHT-XXXXXX).
- Inbound: POST to `/api/email/inbound` with header `X-Webhook-Secret: INBOUND_EMAIL_SECRET`.
- Widget: `<SupportChatWidget />` (file: `src/components/SupportChatWidget.tsx`), polls replies.
- n8n flow instructions: `codex-tasks/outputs/CHAT_N8N_SETUP.md`.

Key Files
- Routers: `src/server/routers/` (`_app.ts` registers all).
- Emails: `src/lib/email-templates.tsx`, `src/lib/email.ts` (SMTP).
- Prisma schema: `prisma/schema.prisma` (multi-schema: auth/public).
- Migrations (SQL only for new tables): `codex-tasks/migrations/`.

Logging
- End each session with a new `codex-tasks/logs/SESSION_YYYY-MM-DD.md` and append a short entry to `codex-tasks/logs/ROLLING_LOG.md`.

