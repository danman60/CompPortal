#!/usr/bin/env markdown
# QUESTION: Feedback on SMTP + n8n Chat Workflow (Option A)

Date: 2025-10-10

Summary
- Implemented a lightweight support chat that lets users submit a question in‑app, emails the admin (with a token in subject), and ingests admin replies (via n8n) back into the widget.
- Switched email stack from Resend to PrivateEmail SMTP.

What’s Implemented
- SMTP mailer
  - File: ../src/lib/email.ts (now Nodemailer SMTP)
  - Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM`, `SUPPORT_EMAIL`
- Chat DB (SQL only, no Prisma schema changes)
  - File: codex-tasks/migrations/20251010_support_chat_schema.sql
  - Tables: `public.chat_conversations`, `public.chat_messages`
- tRPC router
  - File: ../src/server/routers/chat.ts
  - `createQuestion` (stores question, emails admin), `getMessages` (poll by token), `addAdminReply` (for future web admin)
- Inbound email webhook
  - File: ../src/app/api/email/inbound/route.ts
  - Expects POST JSON `{ subject, text }` with header `X-Webhook-Secret: INBOUND_EMAIL_SECRET`
  - Parses token `CHT-XXXXXX` from subject and saves admin reply
- Widget UI
  - File: ../src/components/SupportChatWidget.tsx
  - Glassmorphic; collects name/email/message; shows “we’ll email you” and polls for admin replies

n8n Setup (Option A)
- Doc: codex-tasks/outputs/CHAT_N8N_SETUP.md
- Flow: IMAP Email (support mailbox) → Function (shape `{subject,text}`) → HTTP Request POST to `/api/email/inbound` with `X-Webhook-Secret`.
- Subject contains token added by our outbound email (e.g., “New Chat Question CHT-ABC123”). Keeping subject intact threads the reply.

Rationale: Option A vs B
- A (inbox replies via n8n) keeps admin in email; requires n8n but no extra admin UI.
- B (reply in admin page) is simpler to operate; no n8n. We can add later if preferred.

Open Questions for Feedback
1) Confirm env usage: OK to standardize on `SUPPORT_EMAIL` + `EMAIL_FROM` and the SMTP vars above?
2) Inbound: Approve `INBOUND_EMAIL_SECRET` header scheme? Any additional verification you want (e.g., allowlist From domain)?
3) User outbound on admin reply: Do we want to also email the user when reply is ingested (in addition to widget update)?
4) Placement: Should I render `<SupportChatWidget />` globally (e.g., in `src/app/layout.tsx`) or only on dashboard pages?
5) Admin fallback: Do you want a minimal internal page to list conversations and send replies without email (Option B as backup)?

Validation Checklist
- SMTP: `sendEmail()` works under Nodemailer; logs to `email_logs` when `templateType` provided.
- `createQuestion` sends email to `SUPPORT_EMAIL` with tokenized subject.
- Inbound endpoint saves admin message when called with `{ subject, text }` and secret header.
- Widget polls `getMessages` every 5s and renders replies.

Next Steps (pending your approval)
- Wire `<SupportChatWidget />` into `layout.tsx`.
- Add optional user notification email upon reply ingestion.
- Provide a minimal admin UI as a fallback.

