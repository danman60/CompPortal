# Critical Issues Tracker

**Last Updated:** 2025-01-17
**Status:** 2 Critical, 2 High, 2 Medium

---

## 🔴 Critical Issues (Fix Immediately)

### 1. Security Vulnerability - xlsx Package
**Severity:** HIGH
**CVE:** GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9
**Status:** ⏸️ DEFERRED

**Details:**
```
xlsx package has 2 high severity vulnerabilities:
- Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
- Regular Expression Denial of Service (GHSA-5pgg-2g8v-p4x9)
No fix available from package maintainer
```

**Affected Code:**
- `src/components/RoutineCSVImport.tsx` (only usage)

**Risk Assessment:**
- **Attack Vector:** User-uploaded CSV/Excel files
- **Impact:** Server-side prototype pollution or denial of service
- **Likelihood:** Medium (requires malicious file upload)
- **Scope:** Limited to dancer/entry import features

**Mitigation Options:**

1. **Replace Package (Recommended)** - 4 hours
   ```bash
   npm uninstall xlsx
   npm install exceljs
   ```
   - Update `RoutineCSVImport.tsx` to use exceljs
   - More actively maintained, no known vulnerabilities
   - Similar API, straightforward migration

2. **Input Validation** - 1 hour
   - Add file size limits (max 5MB)
   - Validate file structure before parsing
   - Run imports in isolated process
   - Partial mitigation only

3. **Remove Feature** - 30 minutes
   - Remove CSV import entirely
   - Force manual dancer entry
   - Not recommended (feature heavily used)

**Action Plan:**
```
[ ] Research exceljs migration guide
[ ] Create RoutineCSVImport.new.tsx with exceljs
[ ] Test with sample CSV files
[ ] Replace xlsx with exceljs
[ ] Run security audit: npm audit
[ ] Deploy and verify import still works
```

---

### 2. WebSocket Authentication Missing
**Severity:** HIGH
**Status:** ⏸️ DEFERRED

**Details:**
WebSocket connections use placeholder `dev-token` instead of real JWT authentication.

**Affected Code:**
- `src/lib/websocket.ts:96` - Server-side auth check missing
- `src/hooks/useWebSocket.ts:73` - Client sends 'dev-token'

**Current Implementation:**
```typescript
// Server: src/lib/websocket.ts:96
socket.on('auth', async (data) => {
  // TODO: Verify JWT token (requires auth architecture decision)
  socket.data.userId = 'mock-user'; // ⚠️ INSECURE
  socket.emit('authenticated', { success: true });
});

// Client: src/hooks/useWebSocket.ts:73
socket.emit('auth', {
  token: options.token || 'dev-token', // ⚠️ INSECURE
});
```

**Risk Assessment:**
- **Attack Vector:** Anyone can connect to WebSocket server
- **Impact:**
  - Unauthorized access to real-time scoreboard updates
  - Ability to spoof judge scores
  - View competition data without authentication
- **Likelihood:** High (trivial to exploit)
- **Scope:** All real-time features (scoreboard, judging, live updates)

**Secure Implementation:**

```typescript
// Server: src/lib/websocket.ts
import { createClient } from '@supabase/supabase-js';

socket.on('auth', async (data) => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify Supabase session token
    const { data: { user }, error } = await supabase.auth.getUser(
      data.token
    );

    if (error || !user) {
      socket.emit('auth_error', { message: 'Invalid token' });
      socket.disconnect();
      return;
    }

    // Store authenticated user ID
    socket.data.userId = user.id;
    socket.data.userEmail = user.email;

    socket.emit('authenticated', { success: true });
  } catch (err) {
    socket.emit('auth_error', { message: 'Authentication failed' });
    socket.disconnect();
  }
});

// Client: src/hooks/useWebSocket.ts
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

const supabase = useSupabaseClient();
const { data: { session } } = await supabase.auth.getSession();

socket.emit('auth', {
  token: session?.access_token, // ✅ Real JWT
});
```

**Action Plan:**
```
[ ] Update server auth handler in websocket.ts
[ ] Update client to send Supabase session token
[ ] Add authorization checks to socket event handlers
[ ] Test: Verify unauthenticated connections rejected
[ ] Test: Verify authenticated users can connect
[ ] Deploy to staging for security testing
```

**Estimated Time:** 2 hours

---

## ⚠️ High-Priority Issues (Fix This Week)

### 3. Next.js Metadata Viewport Deprecation
**Severity:** MEDIUM
**Status:** ⏸️ DEFERRED
**Affected:** 47 pages

**Details:**
Next.js 15 deprecated viewport config in metadata exports. All pages show warnings:
```
⚠ Unsupported metadata viewport is configured in metadata export
Read more: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
```

**Affected Pages:**
- All `/dashboard/*` pages (40+ pages)
- `/login`, `/signup`, `/reset-password`
- `/status`, `/onboarding`
- Root `/` page

**Current Implementation (Deprecated):**
```typescript
// src/app/layout.tsx
export const metadata: Metadata = {
  title: 'CompPortal',
  viewport: {  // ❌ Deprecated
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};
```

**Correct Implementation:**
```typescript
// src/app/layout.tsx
export const viewport: Viewport = {  // ✅ Correct
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'CompPortal',
  // viewport removed
};
```

**Migration Strategy:**

1. **Root Layout** - Fix `src/app/layout.tsx` first
2. **Dashboard Layout** - Fix `src/app/dashboard/layout.tsx`
3. **Bulk Fix** - Use find/replace for remaining pages:

```bash
# Find all pages with viewport in metadata
grep -r "viewport:" src/app/**/page.tsx

# Create script to automate migration
cat > fix-viewport.sh <<'EOF'
#!/bin/bash
for file in $(find src/app -name "*.tsx" -type f); do
  # Extract viewport config
  # Move to separate export
  # Remove from metadata
done
EOF
```

**Action Plan:**
```
[ ] Fix root layout.tsx
[ ] Fix dashboard layout.tsx
[ ] Create automated migration script
[ ] Run script on all remaining pages
[ ] Test build: npm run build
[ ] Verify no viewport warnings
[ ] Deploy to staging
```

**Estimated Time:** 3 hours (manual) or 1 hour (automated script)

---

### 4. Email Integration Incomplete
**Severity:** MEDIUM
**Status:** ⏸️ DEFERRED

**Details:**
EmailService class exists but not integrated into workflows. Users don't receive notifications.

**Affected Features:**
- Reservation approvals/rejections (studios don't get notified)
- Invoice generation (no email sent)
- Entry submissions (no confirmation email)
- Password resets (relies on Supabase only)

**Existing Infrastructure:**
- ✅ `src/services/emailService.ts` - EmailService class created
- ✅ `src/lib/email/` - Email templates (React Email components)
- ✅ Environment variables configured (SMTP_HOST, SMTP_USER, etc.)
- ❌ Not called from tRPC routers
- ❌ UI buttons don't trigger emails

**Missing Integration Points:**

1. **Reservation Router** (`src/server/routers/reservation.ts`)
```typescript
// Current: No email sent
updateStatus: protectedProcedure
  .mutation(async ({ input }) => {
    const updated = await prisma.reservations.update({...});
    // ❌ Missing: await emailService.sendReservationApproved(...)
    return updated;
  });
```

2. **Invoice Router** (`src/server/routers/invoice.ts`)
```typescript
// Current: No email sent
create: protectedProcedure
  .mutation(async ({ input }) => {
    const invoice = await prisma.invoices.create({...});
    // ❌ Missing: await emailService.sendInvoice(...)
    return invoice;
  });
```

3. **Reservation Pipeline UI** (`src/components/ReservationPipeline.tsx:738`)
```typescript
// TODO: Implement actual email sending via tRPC mutation
<button onClick={() => console.log('Email not implemented')}>
  Send Email
</button>
```

**Integration Plan:**

```typescript
// 1. Add email procedure to reservation router
import { EmailService } from '@/services/emailService';

const emailService = new EmailService();

export const reservationRouter = router({
  updateStatus: protectedProcedure
    .mutation(async ({ input, ctx }) => {
      const reservation = await prisma.reservations.update({...});

      // Send email based on new status
      if (input.status === 'approved') {
        await emailService.sendReservationApproved({
          to: reservation.studio.contact_email,
          studioName: reservation.studio.studio_name,
          competitionName: reservation.competition.competition_name,
          spacesConfirmed: reservation.spaces_confirmed,
        });
      } else if (input.status === 'rejected') {
        await emailService.sendReservationRejected({
          to: reservation.studio.contact_email,
          studioName: reservation.studio.studio_name,
          competitionName: reservation.competition.competition_name,
          reason: input.rejection_reason,
        });
      }

      return reservation;
    }),
});

// 2. Update UI to remove TODO
<button onClick={() => mutate({ id, status: 'approved' })}>
  Approve & Send Email
</button>
```

**Action Plan:**
```
[ ] Add email calls to reservation.updateStatus
[ ] Add email calls to invoice.create
[ ] Add email calls to entry.create (confirmation)
[ ] Update ReservationPipeline.tsx UI
[ ] Test email delivery (use Mailtrap for dev)
[ ] Configure production SMTP (SendGrid/Postmark)
[ ] Deploy and verify emails sent
```

**Estimated Time:** 2 hours

---

## ℹ️ Medium-Priority Issues (Next Sprint)

### 5. Multi-Tenancy Filtering Disabled
**Severity:** LOW
**Status:** ⏸️ DEFERRED (Not urgent - single-tenant mode)

**Details:**
Failure logs router doesn't filter by tenant. Currently single-tenant so not a security risk.

**Location:** `src/server/routers/failure.ts:25,33`

```typescript
list: publicProcedure.query(async () => {
  // TODO: Add tenant filtering when multi-tenancy is restored
  return await prisma.failure_logs.findMany({
    // Missing: where: { tenant_id: ctx.tenant.id }
  });
});
```

**Action Required:**
- Add tenant filtering when multi-tenancy enabled
- Not urgent (CompPortal is single-tenant)

---

### 6. Live Competition State Management
**Severity:** LOW
**Status:** ⏸️ DEFERRED (Works for single-instance deployments)

**Details:**
Live competition state stored in-memory. Lost on server restart.

**Location:** `src/server/routers/liveCompetition.ts:172`

```typescript
// TODO: Remove or implement with separate live_competition_state table
const state = new Map(); // ⚠️ In-memory only
```

**Problems:**
- State lost on Vercel serverless function cold starts
- Won't scale horizontally (multiple instances = different state)
- No persistence between deployments

**Solutions:**

1. **Redis** (Recommended for real-time)
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

await redis.set(`competition:${id}:state`, JSON.stringify(state));
```

2. **Database Table**
```sql
CREATE TABLE live_competition_state (
  competition_id UUID PRIMARY KEY,
  current_entry_id UUID,
  state JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Action Required:**
- Implement when scaling to multiple regions/instances
- Not urgent (single-region deployment works fine)

**Estimated Time:** 4 hours

---

## 📋 Action Priority Matrix

| Priority | Issue | Impact | Effort | Fix By |
|----------|-------|--------|--------|--------|
| 🔴 P0 | WebSocket Auth | High | 2h | ASAP |
| 🔴 P0 | xlsx Vulnerability | Medium | 4h | This Week |
| ⚠️ P1 | Viewport Deprecation | Low | 3h | This Week |
| ⚠️ P1 | Email Integration | Medium | 2h | This Week |
| ℹ️ P2 | Multi-Tenancy Filter | None | 1h | When needed |
| ℹ️ P2 | Live State Redis | Low | 4h | When scaling |

**Total P0 Work:** 6 hours
**Total P1 Work:** 5 hours
**Total P2 Work:** 5 hours (deferred)

---

## 🔒 Security Audit Summary

**Last Audit:** 2025-01-17

### Vulnerabilities Found
- **High:** 1 (xlsx package)
- **Medium:** 1 (WebSocket auth)
- **Low:** 0

### Recommended Actions
1. ✅ Document all issues (this file)
2. ⏸️ Fix WebSocket auth (deferred)
3. ⏸️ Replace xlsx package (deferred)
4. ⏸️ Run `npm audit fix` after fixes (deferred)
5. ⏸️ Add security testing to CI/CD (future)

### Next Security Review
**Scheduled:** Before production launch or when multi-tenant mode enabled

---

## 📝 Notes

- All critical issues documented here are **DEFERRED** per user request
- No work will be performed on these issues until explicitly requested
- This document serves as the authoritative tracker for known issues
- Update this file when issues are fixed or new issues discovered

**For Questions:** Contact development team or reference individual issue sections above.
