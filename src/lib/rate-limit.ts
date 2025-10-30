/**
 * Rate Limiting with Upstash Redis
 * Protects against abuse, brute force, and resource exhaustion
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from './logger';

/**
 * Redis client (only initialized in production)
 * Falls back to no-op in development if Upstash not configured
 */
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}
// Development mode: No rate limiting if Upstash not configured (silently disabled)

/**
 * Rate limiters for different endpoints
 */
export const rateLimiters = redis ? {
  /**
   * General API: 100 requests per minute per user
   * Prevents general abuse while allowing normal usage
   */
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  /**
   * Authentication: 10 requests per minute per IP
   * Prevents brute force login attempts
   */
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  /**
   * CSV Upload: 5 per minute per user
   * Prevents resource exhaustion from large file processing
   */
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'ratelimit:upload',
  }),

  /**
   * Email sending: 20 per hour per user
   * Prevents spam and excessive email usage
   */
  email: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    analytics: true,
    prefix: 'ratelimit:email',
  }),

  /**
   * Score submission: 200 per minute per judge
   * Allows rapid scoring during competitions while preventing abuse
   */
  scoring: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 m'),
    analytics: true,
    prefix: 'ratelimit:scoring',
  }),
} : null;

/**
 * Check rate limit for a specific limiter and identifier
 * @param limiter - The rate limiter to use (e.g., rateLimiters.api)
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @returns Rate limit result with success, limit, remaining, and reset time
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // If rate limiting is disabled (no Upstash configured), allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 60000,
    };
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If rate limit check fails, log error but allow request (fail open)
    logger.error('Rate limit check failed', {
      error: error instanceof Error ? error : new Error(String(error)),
      identifier,
    });

    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Get identifier for rate limiting
 * Priority: User ID > IP address > 'anonymous'
 */
export function getRateLimitIdentifier(userId?: string, ip?: string): string {
  return userId || ip || 'anonymous';
}
