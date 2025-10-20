# Rate Limiting Guide

**Last Updated:** October 20, 2025
**Status:** Implemented (Upstash configuration required)

## Overview

CompPortal uses Upstash Redis for distributed rate limiting.

## Rate Limits

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| API (general) | 100 req | 1 min | Prevent abuse |
| Authentication | 10 req | 1 min | Prevent brute force |
| CSV Upload | 5 req | 1 min | Prevent resource exhaustion |
| Email | 20 req | 1 hour | Prevent spam |
| Scoring | 200 req | 1 min | Allow rapid scoring |

## Setup

1. Create account: https://upstash.com
2. Create Redis database (regional, same region as Vercel)
3. Copy credentials: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
4. Add to Vercel environment variables
5. Redeploy application

## Implementation

File: `src/lib/rate-limit.ts`

Uses Upstash Ratelimit SDK with sliding window algorithm.

**Features:**
- Distributed rate limiting
- Graceful degradation (fails open if Upstash unavailable)
- Per-user tracking (User ID or IP)
- Analytics enabled

## Monitoring

- Upstash dashboard: https://console.upstash.com
- Sentry: Search for `code:TOO_MANY_REQUESTS`
- Free tier: 10,000 requests/day

## Adjusting Limits

Edit `src/lib/rate-limit.ts` and change limiter values.

Example: Increase API limit to 200 req/min:
```typescript
api: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
}),
```

Always test in preview environment first.

## Troubleshooting

**Rate limiting not working:**
- Check environment variables set in Vercel
- Verify Upstash database is active
- Redeploy after adding env vars

**Legitimate users blocked:**
- Increase rate limits if too strict
- Review Sentry for patterns
- Consider using User ID instead of IP

**Free tier limit exceeded:**
- Upgrade to paid tier ($10/month)
- Optimize window sizes
- Monitor usage approaching 8k/day
