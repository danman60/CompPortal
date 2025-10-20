import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';

/**
 * Example API route with rate limiting
 * Demonstrates how to protect API endpoints from abuse using Upstash Redis
 */
export async function GET(request: NextRequest) {
  // Get IP address from request
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // Check rate limit using API limiter
  const rateLimit = await checkRateLimit(rateLimiters?.api || null, ip);

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
        message: 'You have exceeded the rate limit. Please slow down and try again later.',
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
