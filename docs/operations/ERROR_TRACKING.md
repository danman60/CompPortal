# Error Tracking with Sentry

**Date**: October 20, 2025
**Phase**: 1.1 - Production Monitoring & Visibility
**Status**: ✅ Configured (Requires Account Setup)

---

## Overview

CompPortal uses Sentry for production error tracking and monitoring. This provides:

- **Real-time error alerts** when production issues occur
- **Source maps** for readable stack traces
- **User context** for debugging (no PII)
- **Performance monitoring** for slow operations
- **Session replay** for reproducing bugs

---

## Architecture

### Client-Side Tracking
- **File**: `sentry.client.config.ts`
- **Purpose**: Browser errors, React render errors, user interactions
- **Features**:
  - Session replay with PII masking
  - Console error capture
  - Network request tracking
  - User breadcrumbs

### Server-Side Tracking
- **File**: `sentry.server.config.ts`
- **Purpose**: API errors, tRPC errors, server crashes
- **Features**:
  - Request context
  - Database query errors
  - Server-side exceptions
  - PII filtering

### Edge Runtime Tracking
- **File**: `sentry.edge.config.ts`
- **Purpose**: Middleware errors, edge function failures
- **Features**:
  - Lightweight configuration
  - Edge-specific context

---

## PII Protection

**CRITICAL**: Sentry configuration includes aggressive PII filtering to comply with COPPA/GDPR.

### Filtered Data
- ✅ All cookies (session tokens)
- ✅ Authorization headers
- ✅ Email addresses in logs
- ✅ Query parameters: token, key, secret, password, auth
- ✅ Fields containing: email, phone, name, address, dob, ssn

### beforeSend Hook
All events pass through `beforeSend()` filters before transmission to Sentry servers.

**Files**:
- `sentry.client.config.ts:31-60` - Client-side filtering
- `sentry.server.config.ts:19-58` - Server-side filtering
- `sentry.edge.config.ts:14-28` - Edge runtime filtering

---

## 🚨 USER ACTION REQUIRED

**Before Sentry works in production, you must:**

### 1. Create Sentry Account
1. Go to https://sentry.io/signup/
2. Create free account (100k events/month included)
3. Create organization (e.g., "CompPortal")
4. Create project: "compportal-nextjs"

### 2. Get Sentry Credentials

**DSN (Data Source Name)**:
1. Go to: https://sentry.io/settings/[org]/projects/compportal-nextjs/keys/
2. Copy "Client Keys (DSN)"
3. Format: `https://[key]@o[org-id].ingest.us.sentry.io/[project-id]`

**Organization Slug**:
- Found in: https://sentry.io/settings/[org]/
- Example: `compportal` or `your-org-name`

**Project Name**:
- What you named the project (e.g., `compportal-nextjs`)

**Auth Token (for source maps)**:
1. Go to: https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. **Scopes required**:
   - `project:read`
   - `project:releases`
   - `org:read`
4. Copy token (starts with `sntrys_`)

### 3. Add to Vercel Environment Variables

**Production Environment**:
```bash
# Go to: https://vercel.com/[team]/compportal/settings/environment-variables

NEXT_PUBLIC_SENTRY_DSN=https://[your-key]@o[org].ingest.us.sentry.io/[project]
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=compportal-nextjs
SENTRY_AUTH_TOKEN=sntrys_[your-token]
```

**Preview/Development** (optional):
- Set same variables for Preview/Development environments
- Helps catch staging issues

### 4. Add to Local `.env.local`

Create `.env.local` (if not exists):
```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[your-key]@o[org].ingest.us.sentry.io/[project]
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=compportal-nextjs
SENTRY_AUTH_TOKEN=sntrys_[your-token]
```

**Security**: `.env.local` is gitignored. Never commit credentials.

---

## Testing Error Capture

### Local Testing (After Setup)

**1. Test Client-Side Error**:
```tsx
// Add to any page temporarily
<button onClick={() => { throw new Error('Test Sentry Client'); }}>
  Test Error
</button>
```

**2. Test Server-Side Error**:
```tsx
// In any tRPC router temporarily
throw new Error('Test Sentry Server');
```

**3. Check Sentry Dashboard**:
- Go to: https://sentry.io/organizations/[org]/issues/
- Should see errors appear within 5 seconds

### Production Verification (After Deployment)

1. Deploy to Vercel (happens automatically on push)
2. Visit production site
3. Trigger test error (or check for natural errors)
4. Verify in Sentry dashboard:
   - Source maps working (readable stack traces)
   - No PII in error data
   - Environment = "production"
   - Release version visible

---

## Monitoring Setup

### Alert Rules (Recommended)

**1. High Error Rate Alert**:
- Condition: More than 10 errors in 5 minutes
- Action: Email to support@compsync.net
- Setup: https://sentry.io/organizations/[org]/alerts/rules/

**2. New Issue Alert**:
- Condition: First time seeing this error
- Action: Slack notification (if integrated)
- Setup: Same URL as above

**3. Regression Alert**:
- Condition: Error marked "resolved" happens again
- Action: Email to team
- Setup: Same URL as above

### Performance Monitoring

**Transaction Sampling**:
- Production: 10% (see `sentry.*.config.ts:11`)
- Development: 100% (captures all requests)

**Why 10%?**
- Free tier: 100k transactions/month
- Estimated traffic: 1M requests/month
- 10% = 100k sampled (within limits)

### Session Replay

**Replay Rates**:
- Error sessions: 100% (when error occurs)
- Normal sessions: 10% (random sampling)

**PII Protection**:
```typescript
maskAllText: true,      // Hide all text content
blockAllMedia: true,    // Hide images/video
```

**Why Replay?**
- See exactly what user did before error
- Reproduces UI bugs easily
- No PII captured (all masked)

---

## Integration with Logger

**Phase 1.4** will integrate Sentry with existing logger (`src/lib/logger.ts`).

**Current**: Errors logged to console only
**After 1.4**: Errors logged to console AND Sentry

**Example**:
```typescript
import { logger } from '@/lib/logger';

logger.error('Payment failed', {
  studioId: '123',
  amount: 50.00,
  // Error automatically sent to Sentry
});
```

---

## Troubleshooting

### Build Warnings (Expected)

**"Missing instrumentation file"**:
- **Status**: Expected warning
- **Impact**: None (configs still work)
- **Future**: May migrate to instrumentation.ts (Next.js 15+)

**"Deprecated sentry.client.config.ts"**:
- **Status**: Expected warning
- **Impact**: Works fine, may need migration later
- **Action**: Ignore for now

### Source Maps Not Uploading

**Symptom**: Stack traces show minified code
**Fix**: Verify `SENTRY_AUTH_TOKEN` in Vercel environment variables

**Check Build Logs**:
```bash
# In Vercel deployment logs, look for:
[@sentry/nextjs] Successfully uploaded source maps
```

### Errors Not Appearing

**Checklist**:
1. ✅ `NEXT_PUBLIC_SENTRY_DSN` set in Vercel
2. ✅ Environment = production (check Sentry dashboard filters)
3. ✅ Error actually thrown (check browser console)
4. ✅ beforeSend not filtering error (check console for "Sentry" logs)

### Too Many Errors

**Symptom**: Hitting rate limits, noisy dashboard
**Fix**: Adjust sample rates in config files

```typescript
// Lower sample rate to reduce volume
tracesSampleRate: 0.05,  // 5% instead of 10%
replaysSessionSampleRate: 0.05,
```

---

## Cost Management

### Free Tier Limits
- **Errors**: 5,000/month
- **Performance**: 100k transactions/month
- **Replays**: 50 sessions/month

### Expected Usage (60 SDs, 2 CDs)
- **Errors**: ~500/month (assuming 95% uptime)
- **Performance**: ~100k/month (with 10% sampling)
- **Replays**: ~50/month (with 10% sampling)

**Verdict**: Free tier sufficient for Phase 1-2. May need paid tier after Phase 5 (multi-tenant).

### If Quota Exceeded

**Options**:
1. **Increase sampling** - Lower rates to reduce volume
2. **Filter noisy errors** - Ignore known issues
3. **Upgrade plan** - Developer tier: $26/month (50k errors)

---

## Next Steps

### After Account Setup
1. ✅ Create Sentry account
2. ✅ Add env vars to Vercel
3. ✅ Deploy to production
4. ✅ Test error capture
5. ✅ Configure alert rules
6. ⏭️ **Phase 1.4**: Integrate with logger

### Documentation Links
- Sentry Next.js Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Vercel Integration: https://vercel.com/integrations/sentry
- PII Scrubbing: https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/

---

## Files Modified

- `sentry.client.config.ts` (new) - Client-side error tracking
- `sentry.server.config.ts` (new) - Server-side error tracking
- `sentry.edge.config.ts` (new) - Edge runtime tracking
- `next.config.js:1,97-114` - Wrapped with Sentry SDK
- `.env.example:21-27` - Added Sentry variables
- `package.json` - Added @sentry/nextjs dependency

---

**Status**: ✅ Code complete, awaiting account setup
**Risk**: 🟢 Zero breaking changes (monitoring only)
**Rollback**: Simple - remove Sentry env vars from Vercel
