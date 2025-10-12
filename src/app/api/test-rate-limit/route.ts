import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit';

/**
 * Example API route with rate limiting
 * Demonstrates how to protect API endpoints from abuse
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);

  // Check rate limit
  const rateLimit = await checkRateLimit(ip, RateLimitPresets.api);

  // Add rate limit headers
  const headers = new Headers({
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
  });

  // Rate limit exceeded
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: RateLimitPresets.api.message,
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers,
      }
    );
  }

  // Success response
  return NextResponse.json(
    {
      message: 'Rate limit check passed',
      ip,
      rateLimit: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: new Date(rateLimit.reset).toISOString(),
      },
    },
    {
      status: 200,
      headers,
    }
  );
}
