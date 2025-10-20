# Performance Monitoring

**Date**: October 20, 2025
**Phase**: 1.3 - Analytics & Web Vitals
**Status**: ✅ Configured (Active on Deploy)

---

## Overview

CompPortal uses Vercel Analytics and Speed Insights for real-time performance monitoring:

- **Web Vitals**: Core Web Vitals (LCP, FID, CLS, TTFB, FCP)
- **Page Analytics**: Page views, user sessions, traffic sources
- **Custom Events**: Business metrics (reservations, entries, invoices)
- **Real User Monitoring (RUM)**: Actual user experience data

---

## Components

### Vercel Analytics
- **Package**: `@vercel/analytics`
- **File**: `src/app/layout.tsx:11,92`
- **Purpose**: Page views, custom events, user sessions
- **Auto-enabled**: Works immediately on Vercel deployment

### Vercel Speed Insights
- **Package**: `@vercel/speed-insights`
- **File**: `src/app/layout.tsx:12,93`
- **Purpose**: Web Vitals, performance metrics
- **Auto-enabled**: Works immediately on Vercel deployment

### Custom Analytics Library
- **File**: `src/lib/analytics.ts`
- **Purpose**: Track critical business events
- **PII Protection**: No personal data tracked

---

## Web Vitals Tracked

### Largest Contentful Paint (LCP)
- **Target**: <2.5s (good), <4s (needs improvement), 4s+ (poor)
- **What it measures**: Load performance
- **Impact**: User perception of page speed

### First Input Delay (FID)
- **Target**: <100ms (good), <300ms (needs improvement), 300ms+ (poor)
- **What it measures**: Interactivity
- **Impact**: Responsiveness to user input

### Cumulative Layout Shift (CLS)
- **Target**: <0.1 (good), <0.25 (needs improvement), 0.25+ (poor)
- **What it measures**: Visual stability
- **Impact**: Unexpected layout shifts

### Time to First Byte (TTFB)
- **Target**: <200ms (good), <600ms (needs improvement), 600ms+ (poor)
- **What it measures**: Server response time
- **Impact**: Initial load performance

### First Contentful Paint (FCP)
- **Target**: <1.8s (good), <3s (needs improvement), 3s+ (poor)
- **What it measures**: First visible content
- **Impact**: Perceived load speed

---

## Custom Event Tracking

### Critical Business Events

All custom events are defined in `src/lib/analytics.ts` with **zero PII**.

#### 1. Reservation Created
```typescript
import { analytics } from '@/lib/analytics';

analytics.reservationCreated({
  reservationId: reservation.id,
  competitionId: competition.id,
  studioId: studio.id,
  entryCount: 15,
  status: 'pending',
});
```

**Tracked Data**:
- Reservation ID (UUID)
- Competition ID (UUID)
- Studio ID (UUID)
- Entry count (number)
- Status (string)

**Use Case**: Track reservation creation rate, identify popular competitions

#### 2. Entry Submitted
```typescript
analytics.entrySubmitted({
  entryId: entry.id,
  competitionId: competition.id,
  studioId: studio.id,
  category: 'Solo',
  ageGroup: 'Junior',
});
```

**Tracked Data**:
- Entry ID (UUID)
- Competition ID (UUID)
- Studio ID (UUID)
- Category (optional string)
- Age Group (optional string)

**Use Case**: Track entry submission patterns, category popularity

#### 3. Invoice Sent
```typescript
analytics.invoiceSent({
  invoiceId: invoice.id,
  studioId: studio.id,
  competitionId: competition.id,
  totalAmount: 1250.00,
  entryCount: 25,
  method: 'email',
});
```

**Tracked Data**:
- Invoice ID (UUID)
- Studio ID (UUID)
- Competition ID (UUID)
- Total amount (number, no currency details)
- Entry count (number)
- Method: 'email' or 'manual'

**Use Case**: Track invoicing efficiency, average invoice size

#### 4. Other Business Events

**Available events** (see `src/lib/analytics.ts` for full list):
- `reservationApproved` - CD approves reservation
- `reservationRejected` - CD rejects reservation
- `competitionCreated` - New competition created
- `studioSignup` - New studio registers
- `onboardingComplete` - Studio completes onboarding
- `csvImported` - CSV import operation
- `scoreSubmitted` - Judge submits scores

---

## Dashboard Access

### Vercel Analytics Dashboard

**URL**: https://vercel.com/[team]/compportal/analytics

**Tabs**:
1. **Overview** - Page views, unique visitors, top pages
2. **Audiences** - User demographics, devices, browsers
3. **Speed Insights** - Web Vitals, performance scores
4. **Events** - Custom event tracking (reservations, entries, invoices)

### Viewing Custom Events

1. Go to: https://vercel.com/[team]/compportal/analytics
2. Click "Events" tab
3. See all custom events with counts and properties
4. Filter by time range (24h, 7d, 30d, 90d)

### Performance Scores

**Real User Scores (RUM)**:
- Based on actual user devices and networks
- More accurate than lab tests (Lighthouse)
- Shows distribution: P50, P75, P95, P99

**Example**:
- P50 (median): 2.1s LCP (good)
- P75: 3.2s LCP (needs improvement)
- P95: 5.8s LCP (poor)
- **Insight**: 95% of users see LCP under 5.8s

---

## Performance Budgets

### Recommended Targets (Production)

**Web Vitals**:
- LCP: 90% of users <2.5s
- FID: 95% of users <100ms
- CLS: 95% of users <0.1
- TTFB: 90% of users <200ms

**Page Load**:
- Dashboard: <3s (LCP)
- Entry creation: <2s (LCP)
- Reservations: <2.5s (LCP)
- Reports: <4s (LCP, acceptable for data-heavy pages)

**Bundle Size**:
- First Load JS: <300 KB (currently ~216 KB ✅)
- Per-page JS: <50 KB average

---

## Integration Points

### Where to Add Custom Tracking

**Reservation Creation** (`src/server/routers/reservation.ts`):
```typescript
// After successful reservation creation
analytics.reservationCreated({
  reservationId: result.id,
  competitionId: input.competitionId,
  studioId: ctx.user.studioId,
  entryCount: input.entryIds.length,
  status: 'pending',
});
```

**Entry Submission** (`src/server/routers/entry.ts`):
```typescript
// After entry created
analytics.entrySubmitted({
  entryId: entry.id,
  competitionId: input.competitionId,
  studioId: ctx.user.studioId,
  category: input.category,
  ageGroup: input.ageGroup,
});
```

**Invoice Sent** (`src/server/routers/invoice.ts`):
```typescript
// After email sent
analytics.invoiceSent({
  invoiceId: invoice.id,
  studioId: input.studioId,
  competitionId: input.competitionId,
  totalAmount: invoice.total,
  entryCount: invoice.entries.length,
  method: 'email',
});
```

**Note**: Phase 1.3 created the analytics library. **Phase 1.4 or later** will add actual tracking calls to routers.

---

## Performance Optimization Strategies

### Current Optimizations

**Code Splitting**:
- Next.js automatic route-based splitting
- Dynamic imports for heavy components
- Separate chunks for shared libraries

**Caching**:
- Static pages cached at edge
- API responses use SWR
- Browser cache headers configured

**Image Optimization**:
- Next.js Image component
- WebP format with fallback
- Lazy loading below fold
- Responsive srcset

### Future Optimizations (If Needed)

**If LCP >2.5s**:
1. Preload critical fonts
2. Inline critical CSS
3. Defer non-critical JS
4. Use ISR for dynamic pages

**If FID >100ms**:
1. Code split large bundles
2. Defer third-party scripts
3. Use Web Workers for heavy computation
4. Reduce JavaScript execution time

**If CLS >0.1**:
1. Set explicit width/height on images
2. Reserve space for dynamic content
3. Avoid inserting content above existing
4. Use CSS aspect-ratio

---

## Monitoring Alerts

### Recommended Alert Setup

**Via Vercel Dashboard** (when available):
1. LCP degradation: Alert if P75 >4s
2. FID degradation: Alert if P95 >300ms
3. Error rate spike: Alert if >5% error rate
4. Traffic drop: Alert if traffic drops >50% week-over-week

**Manual Monitoring** (until auto-alerts available):
- Check dashboard weekly
- Review Web Vitals trends
- Monitor custom event counts
- Compare month-over-month

---

## Privacy & PII Protection

### What We Track (Safe)
- ✅ Page paths (no query params)
- ✅ User IDs (UUIDs, not names)
- ✅ Studio IDs (UUIDs, not studio names)
- ✅ Competition IDs (UUIDs)
- ✅ Aggregate counts (entries, invoices)
- ✅ Performance metrics (LCP, FID, CLS)
- ✅ Device info (browser, OS)

### What We DON'T Track
- ❌ Names (dancers, users, studios)
- ❌ Email addresses
- ❌ Birth dates
- ❌ Medical information
- ❌ Payment details
- ❌ IP addresses (Vercel strips PII)
- ❌ Query parameters with sensitive data

**Compliance**: COPPA/GDPR safe - no PII in analytics

---

## Cost Management

### Vercel Analytics Pricing

**Hobby Plan** (Free):
- Unlimited page views
- Unlimited custom events
- 30-day data retention
- Basic filtering

**Pro Plan** ($20/month, included with Vercel Pro):
- Same as Hobby
- 60-day data retention
- Advanced filtering
- Custom event properties (unlimited)

**Current Usage**: Free tier sufficient for Phase 1-3. Pro plan recommended after Phase 5 (multi-tenant) for longer retention.

---

## Troubleshooting

### Analytics Not Showing Data

**Symptom**: No page views in dashboard
**Checklist**:
1. ✅ Deployed to Vercel (required)
2. ✅ `<Analytics />` in layout.tsx (src/app/layout.tsx:92)
3. ✅ Wait 5-10 minutes for data to appear
4. ✅ Visit site to generate traffic

### Custom Events Not Appearing

**Symptom**: Events not in dashboard
**Checklist**:
1. ✅ `track()` called in code (see src/lib/analytics.ts)
2. ✅ Event triggered (test manually)
3. ✅ Check browser console for errors
4. ✅ Wait 5-10 minutes for aggregation

### Web Vitals Showing "Poor"

**LCP Poor (>4s)**:
- Check server response time (TTFB)
- Optimize images (use Next.js Image)
- Preload critical resources
- Enable caching

**FID Poor (>300ms)**:
- Reduce JavaScript bundle size
- Code split large components
- Defer non-critical scripts

**CLS Poor (>0.25)**:
- Set image dimensions explicitly
- Reserve space for ads/embeds
- Avoid DOM insertion above fold

---

## Next Steps

### After Deployment
1. ✅ Deploy to Vercel (happens automatically)
2. ✅ Visit production site to generate traffic
3. ✅ Check analytics dashboard after 10 minutes
4. ✅ Verify Web Vitals scores
5. ⏭️ **Phase 1.4**: Add tracking calls to routers

### Documentation Links
- Vercel Analytics Docs: https://vercel.com/docs/analytics
- Speed Insights Docs: https://vercel.com/docs/speed-insights
- Web Vitals Guide: https://web.dev/vitals/

---

## Files Modified

- `src/app/layout.tsx:11-12,92-93` - Added Analytics and SpeedInsights components
- `src/lib/analytics.ts` (new) - Custom event tracking library
- `package.json` - Added @vercel/speed-insights dependency

---

**Status**: ✅ Configured, auto-active on deploy
**Risk**: 🟢 Zero breaking changes (monitoring only)
**Rollback**: Remove components from layout.tsx
