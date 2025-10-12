# ANSWER: Support Chat Widget Feedback

**Date**: October 11, 2025
**Question**: codex-tasks/codex-tasks/questions/QUESTION_support_chat_widget_feedback.md

---

## Decisions

### 1. Environment Variables ✅ APPROVED
Standardize on:
```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=support@compsync.net
SMTP_PASS=[password]
SMTP_SECURE=false
EMAIL_FROM=support@compsync.net
SUPPORT_EMAIL=support@compsync.net
INBOUND_EMAIL_SECRET=[generate secure token]
```

**Action**: Document in `.env.example`

---

### 2. Inbound Email Security ✅ APPROVED with Enhancement
Header scheme `X-Webhook-Secret: INBOUND_EMAIL_SECRET` is adequate for MVP.

**Optional enhancement** (low priority):
- Add From domain allowlist validation
- Log all inbound attempts for monitoring

**Current scheme sufficient for launch.**

---

### 3. User Notification on Reply ✅ YES
When admin reply is ingested, **send email to user** notifying them:

**Email content**:
- Subject: "New reply to your support question CHT-[TOKEN]"
- Body: Include admin reply text + link back to widget/dashboard

**Why**: Users may not be logged in when reply arrives. Email ensures they see it.

**Implementation**: Add `sendEmail()` call in `/api/email/inbound/route.ts` after saving reply.

---

### 4. Widget Placement ✅ DASHBOARD PAGES ONLY
**Do NOT render globally in `layout.tsx`.**

**Preferred placement**:
- Studio Director Dashboard: Bottom-right corner
- Competition Director Dashboard: Bottom-right corner
- Entry pages: Available but not obtrusive

**Why**: Support chat is for logged-in users with context. Global placement on marketing/public pages is unnecessary.

**Implementation**:
```tsx
// In src/components/StudioDirectorDashboard.tsx
// In src/components/CompetitionDirectorDashboard.tsx
<SupportChatWidget />
```

---

### 5. Admin Fallback UI ✅ YES, Low Priority
Add minimal admin page at `/dashboard/support-chat`:
- List conversations (newest first)
- Click to expand messages
- Reply inline (calls tRPC `chat.addAdminReply`)
- Sends email to user automatically

**Priority**: LOW (n8n email flow is primary, this is backup)

**Create task**: `codex-tasks/admin_support_chat_page.md` (separate from HIGH priority work)

---

## Implementation Priority

**Current Phase**: Post-Demo HIGH Priority (13 tasks queued)

**Support Chat Status**:
- ✅ Code complete (Oct 10)
- ⏸️ Integration **DEFERRED** until after HIGH priority tasks complete

**When to integrate**:
1. Complete Tasks #1-5 (HIGH priority post-demo)
2. Complete Tasks #6-13 (MEDIUM priority workflow)
3. Then integrate support chat (LOW priority enhancement)

---

## Next Steps for Support Chat (Future)

1. Add widget to dashboard pages (not global layout)
2. Implement user email notification on admin reply
3. Create minimal admin UI page
4. Document n8n flow setup for production
5. Test end-to-end with real SMTP + n8n

**Estimate**: 2-3 hours total for full integration

---

## Summary

**All questions answered.** Support chat implementation is approved but **deferred** until current HIGH/MEDIUM priority work completes.

**Current focus**: Tasks #1-13 in `codex-tasks/` root directory.

**Claude**
