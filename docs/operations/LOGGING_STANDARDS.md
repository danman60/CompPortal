# Logging Standards

**Date**: October 20, 2025
**Phase**: 1.4 - Enhanced Logging
**Status**: ✅ Implemented

---

## Overview

CompPortal uses structured logging with automatic Sentry integration for production error tracking.

**Logger**: `src/lib/logger.ts`

**Key Features**:
- Structured JSON logs (easy parsing)
- Request ID correlation (trace requests)
- Sentry integration (automatic error tracking)
- PII protection (no sensitive data)
- Performance tracking (duration metrics)

---

## Log Levels

### Debug (Development Only)
**When**: Detailed debugging information
**Example**: Variable values, function calls, algorithm steps
**Production**: Disabled (not logged)

```typescript
logger.debug('Processing entry batch', {
  batchSize: 50,
  currentIndex: 25,
});
```

### Info
**When**: Normal application flow, important events
**Example**: User actions, system events, successful operations

```typescript
logger.info('Reservation created', {
  reservationId: reservation.id,
  studioId: studio.id,
  entryCount: 15,
});
```

### Warn
**When**: Unusual but handled situations, potential issues
**Example**: Deprecated API usage, fallback behavior, rate limiting

**Sentry**: Sent to Sentry as "warning" level

```typescript
logger.warn('CSV import had validation errors', {
  filePath: 'entries.csv',
  totalRows: 100,
  errorCount: 5,
  successCount: 95,
});
```

### Error
**When**: Errors, exceptions, failures
**Example**: Database errors, API failures, unhandled cases

**Sentry**: Sent to Sentry as "error" level

```typescript
logger.error('Failed to send invoice email', {
  error: err,
  invoiceId: invoice.id,
  recipientEmail: '[REDACTED]', // Don't log actual email
  attemptCount: 3,
});
```

---

## Usage Patterns

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// Info log
logger.info('Competition created', {
  competitionId: comp.id,
  name: comp.name, // Safe: competition name not PII
});

// Error log with exception
try {
  await sendEmail(invoice);
} catch (err) {
  logger.error('Email send failed', {
    error: err instanceof Error ? err : new Error(String(err)),
    invoiceId: invoice.id,
  });
  throw err;
}
```

---

### Request ID Correlation

**Purpose**: Trace a request through multiple operations

```typescript
import { generateRequestId, logger } from '@/lib/logger';

// In API route or tRPC procedure
const requestId = generateRequestId();

logger.info('Processing reservation', {
  requestId,
  reservationId: input.id,
});

// Later in the same request
logger.info('Sending notification', {
  requestId, // Same ID - can correlate logs
  notificationType: 'reservation_approved',
});
```

**In Sentry**: Search for `requestId` to see all logs from one request

---

### HTTP Request Logging

**Purpose**: Track API performance and errors

```typescript
// In API routes
const start = Date.now();

try {
  // ... handle request
  const duration = Date.now() - start;

  logger.http('GET', '/api/health', 200, duration, {
    requestId: req.headers['x-request-id'],
  });
} catch (err) {
  const duration = Date.now() - start;

  logger.http('GET', '/api/health', 500, duration, {
    requestId: req.headers['x-request-id'],
    error: err instanceof Error ? err : new Error(String(err)),
  });
}
```

**Automatic Sentry**: 5xx errors auto-logged to Sentry

---

### Performance Tracking

**Purpose**: Measure slow operations

```typescript
const stopTimer = logger.startTimer('Database query: complex reservation report');

const results = await db.reservation.findMany({
  // ... complex query
});

stopTimer(); // Logs duration automatically
```

**Output** (console):
```json
{
  "timestamp": "2025-10-20T12:44:00.000Z",
  "level": "info",
  "message": "Performance: Database query: complex reservation report",
  "duration": 1250,
  "label": "Database query: complex reservation report"
}
```

---

## Sentry Integration

### Automatic Error Tracking

**All errors logged via `logger.error()` are sent to Sentry in production.**

**Example**:
```typescript
try {
  await updateReservation(id, data);
} catch (err) {
  // This error is AUTOMATICALLY sent to Sentry (production)
  logger.error('Reservation update failed', {
    error: err instanceof Error ? err : new Error(String(err)),
    reservationId: id,
    userId: ctx.userId,
  });

  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err });
}
```

**In Sentry Dashboard**:
- Error message: "Reservation update failed"
- Tags: `logger=true`, `userId=[id]`
- Extra: `reservationId`, `requestId`, etc.
- Stack trace: Full error stack from `context.error`

---

### Automatic Warning Tracking

**All warnings logged via `logger.warn()` are sent to Sentry in production.**

```typescript
// Warn about deprecated API usage
logger.warn('Using deprecated CSV import format', {
  studioId: studio.id,
  fileFormat: 'legacy',
  recommendedFormat: 'v2',
});
```

**In Sentry**: Appears as "warning" level, separate from errors

---

### tRPC Error Logging

**All tRPC errors (except validation/auth) are automatically logged.**

**File**: `src/server/trpc.ts:25-48`

**What gets logged**:
- ✅ Database errors (INTERNAL_SERVER_ERROR)
- ✅ Not found errors (NOT_FOUND)
- ✅ Conflict errors (CONFLICT)
- ✅ Precondition errors (PRECONDITION_FAILED)
- ❌ Validation errors (BAD_REQUEST with Zod) - Too noisy
- ❌ Auth errors (UNAUTHORIZED, FORBIDDEN) - Expected behavior

**Example**:
```typescript
// In a tRPC router
export const reservationRouter = router({
  approve: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await approveReservation(input.id);
      } catch (err) {
        // This error is AUTOMATICALLY logged by tRPC error formatter
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve reservation',
          cause: err,
        });
      }
    }),
});
```

**No manual logging needed** - tRPC error formatter handles it.

---

## Critical Business Operations

### What to Log

**Always log these operations** (for audit trail and debugging):

1. **Reservation Lifecycle**
   ```typescript
   logger.info('Reservation created', { reservationId, studioId, competitionId });
   logger.info('Reservation approved', { reservationId, approvedBy: userId });
   logger.info('Reservation rejected', { reservationId, rejectedBy: userId, reason });
   ```

2. **Entry Management**
   ```typescript
   logger.info('Entry created', { entryId, studioId, competitionId });
   logger.info('Entry updated', { entryId, updatedFields: Object.keys(updates) });
   logger.info('Entry deleted', { entryId, deletedBy: userId });
   ```

3. **Invoicing**
   ```typescript
   logger.info('Invoice generated', { invoiceId, studioId, totalAmount });
   logger.info('Invoice sent', { invoiceId, method: 'email', recipientCount: 1 });
   logger.error('Invoice send failed', { error: err, invoiceId, attemptCount: 3 });
   ```

4. **Data Imports**
   ```typescript
   logger.info('CSV import started', { type: 'dancers', rowCount: 100 });
   logger.warn('CSV import had errors', { errorCount: 5, successCount: 95 });
   logger.info('CSV import completed', { totalProcessed: 100, duration: 2500 });
   ```

5. **Authentication Events**
   ```typescript
   logger.info('User logged in', { userId, role: userRole });
   logger.warn('Failed login attempt', { email: '[REDACTED]', attemptCount: 3 });
   logger.error('2FA verification failed', { userId, method: 'totp' });
   ```

6. **Security Events**
   ```typescript
   logger.warn('Rate limit exceeded', { userId, endpoint: '/api/trpc/entry.create' });
   logger.error('Unauthorized access attempt', { userId, requiredRole: 'admin', actualRole: 'studio_director' });
   ```

---

## PII Protection

### NEVER Log These

**Personal Identifiable Information (PII)**:
- ❌ Dancer names
- ❌ Email addresses (use `'[REDACTED]'` placeholder)
- ❌ Phone numbers
- ❌ Birth dates
- ❌ Medical information (allergies, medications)
- ❌ Home addresses
- ❌ Parent names
- ❌ Payment details (credit cards, bank accounts)

### Safe to Log

**Non-PII identifiers and metadata**:
- ✅ User IDs (UUIDs)
- ✅ Studio IDs (UUIDs)
- ✅ Entry IDs (UUIDs)
- ✅ Competition IDs (UUIDs)
- ✅ Aggregate counts (number of dancers, entries)
- ✅ Business metrics (total amounts - no payment details)
- ✅ Timestamps
- ✅ Status values ('pending', 'approved', etc.)
- ✅ Error messages (sanitized)

### Example - Good vs. Bad

**BAD** (includes PII):
```typescript
logger.info('Dancer registered', {
  name: 'Jane Smith', // ❌ PII
  email: 'jane@example.com', // ❌ PII
  dateOfBirth: '2010-05-15', // ❌ PII
  parentPhone: '555-1234', // ❌ PII
});
```

**GOOD** (PII-safe):
```typescript
logger.info('Dancer registered', {
  dancerId: 'dancer_abc123', // ✅ UUID
  studioId: 'studio_xyz789', // ✅ UUID
  ageGroup: 'Junior', // ✅ Metadata
  registeredBy: userId, // ✅ UUID
});
```

---

## Log Format

### Console Output (Development)

```json
{
  "timestamp": "2025-10-20T12:44:00.000Z",
  "level": "info",
  "message": "Reservation created",
  "reservationId": "res_abc123",
  "studioId": "studio_xyz789",
  "entryCount": 15,
  "requestId": "req_1729431840000_xyz123"
}
```

**Readable**: Formatted JSON in development for easy reading

---

### Console Output (Production)

```json
{"timestamp":"2025-10-20T12:44:00.000Z","level":"info","message":"Reservation created","reservationId":"res_abc123","studioId":"studio_xyz789","entryCount":15,"requestId":"req_1729431840000_xyz123"}
```

**Compact**: Single-line JSON for Vercel log parsing

---

## Viewing Logs

### Development (Local)

**Console**: Logs appear in terminal running `npm run dev`

**Format**: Pretty-printed JSON

---

### Production (Vercel)

**Dashboard**: https://vercel.com/[team]/compportal/logs

**Filter by**:
- Time range (last 1h, 24h, 7d)
- Log level (info, warn, error)
- Search text (e.g., "Reservation created")

**Example Query**:
```
level:error AND studioId:studio_xyz789
```

---

### Production (Sentry)

**Dashboard**: https://sentry.io/organizations/[org]/issues/

**Filter by**:
- Tag: `logger=true` (all logs from logger)
- User ID: `userId=[id]`
- Path: `path=/api/trpc/reservation.create`

**Grouped by**: Error message + stack trace

---

## Error Sampling

### Why Sample?

**Problem**: High-traffic app generates millions of logs
**Solution**: Sample errors to stay within Sentry quota

**Current Settings** (see `sentry.*.config.ts`):
- **Production**: 10% sampling (1 in 10 transactions tracked)
- **Development**: 100% sampling (all transactions tracked)

---

### What Gets Sampled

**Sampled** (reduced):
- Transaction traces (performance monitoring)
- Breadcrumbs (user actions)

**NOT Sampled** (always sent):
- Errors (`logger.error()`)
- Warnings (`logger.warn()`)
- tRPC errors

**Why**: Errors are critical, performance data can be sampled

---

## Best Practices

### 1. Log at the Right Level

**Info**: Normal operations, audit trail
**Warn**: Recoverable issues, degraded performance
**Error**: Failures, exceptions, bugs

### 2. Include Context

**Bad**:
```typescript
logger.error('Failed');
```

**Good**:
```typescript
logger.error('Failed to approve reservation', {
  error: err,
  reservationId: id,
  userId: ctx.userId,
  attemptCount: 3,
});
```

### 3. Use Request IDs

**Helps correlate logs** from the same request across multiple operations.

```typescript
const requestId = generateRequestId();
logger.info('Step 1', { requestId });
logger.info('Step 2', { requestId });
logger.error('Step 3 failed', { requestId, error: err });
```

### 4. Filter PII

**Never log** email, name, birth date, medical info. Use UUIDs instead.

### 5. Don't Log Everything

**Too much logging**:
- Performance overhead
- Storage costs
- Noise in dashboard

**What NOT to log**:
- Every database query
- Every function call
- Validation errors (too noisy)

---

## Troubleshooting

### Logs Not Appearing in Sentry

**Symptom**: Errors logged to console but not in Sentry

**Checklist**:
1. ✅ Environment: `NODE_ENV=production`
2. ✅ DSN set: `NEXT_PUBLIC_SENTRY_DSN` in Vercel env vars
3. ✅ Error object provided: `context.error` must be an Error instance
4. ✅ Wait 5 minutes for Sentry aggregation
5. ✅ Check Sentry dashboard filters (date range, environment)

### Too Many Logs in Sentry

**Symptom**: Hitting Sentry quota, too noisy

**Fix**: Filter noisy errors

```typescript
// In logger.ts, add to error method
if (message.includes('Validation failed')) {
  // Don't send validation errors to Sentry
  return;
}
```

**Or**: Adjust `beforeSend` in Sentry config to filter by error type

---

## Next Steps

### After Phase 1.4
1. ✅ Enhanced logger with Sentry integration
2. ✅ tRPC error logging
3. ✅ Logging standards documented
4. ⏭️ Add tracking to critical operations (manual integration)

### Future Enhancements (Phase 3+)
- Log aggregation (Logtail, Datadog)
- Custom log retention policies
- Automated log analysis (anomaly detection)
- Alerting on log patterns

---

## Files Modified

- `src/lib/logger.ts:14,62-110` - Sentry integration for error/warn
- `src/server/trpc.ts:6,25-48` - tRPC error logging
- `docs/operations/LOGGING_STANDARDS.md` (this file) - Documentation

---

**Status**: ✅ Complete and active
**Risk**: 🟢 Zero breaking changes
**Impact**: High (enables production debugging)
