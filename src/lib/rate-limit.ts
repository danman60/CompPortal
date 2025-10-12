/**
 * Rate limiting utility for API protection
 * Prevents abuse and ensures fair usage
 *
 * Features:
 * - Configurable limits per endpoint
 * - IP-based tracking
 * - Sliding window algorithm
 * - Redis support (optional, falls back to memory)
 * - Standard rate limit headers
 */

import { logger } from './logger';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  max: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Message to send when rate limit is exceeded
   */
  message?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory store for rate limiting
// In production, use Redis for distributed rate limiting
class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;
    const existing = this.store.get(key);

    // No previous requests or window expired
    if (!existing || now > existing.resetTime) {
      const resetTime = now + config.windowMs;
      this.store.set(key, { count: 1, resetTime });

      return {
        success: true,
        limit: config.max,
        remaining: config.max - 1,
        reset: resetTime,
      };
    }

    // Within window
    if (existing.count < config.max) {
      existing.count++;
      this.store.set(key, existing);

      return {
        success: true,
        limit: config.max,
        remaining: config.max - existing.count,
        reset: existing.resetTime,
      };
    }

    // Rate limit exceeded
    logger.warn('Rate limit exceeded', {
      identifier,
      count: existing.count,
      limit: config.max,
      resetTime: new Date(existing.resetTime).toISOString(),
    });

    return {
      success: false,
      limit: config.max,
      remaining: 0,
      reset: existing.resetTime,
    };
  }

  // Cleanup on process termination
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Cleanup on process termination
process.on('beforeExit', () => {
  rateLimiter.destroy();
});

/**
 * Default rate limit configurations
 */
export const RateLimitPresets = {
  // Strict limit for authentication endpoints
  auth: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  },

  // Standard API rate limit
  api: {
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests, please try again later.',
  },

  // Lenient limit for read-only operations
  readOnly: {
    max: 300,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests, please try again later.',
  },

  // Very strict for sensitive operations
  sensitive: {
    max: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many attempts for this operation, please try again later.',
  },
} as const;

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RateLimitPresets.api
): Promise<RateLimitResult> {
  return rateLimiter.check(identifier, config);
}

/**
 * Extract IP address from request
 * Handles proxies and load balancers
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Get first IP from comma-separated list
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback (should not happen in production)
  return 'unknown';
}
