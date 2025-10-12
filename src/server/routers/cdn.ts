/**
 * CDN Management tRPC Router
 * Admin endpoints for CDN cache management and monitoring
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  getCDNConfig,
  purgeCDNCache,
  checkCDNHealth,
  getCDNStats,
} from '@/lib/cdn';

export const cdnRouter = router({
  /**
   * Get CDN configuration status
   */
  getConfig: publicProcedure.query(async ({ ctx }) => {
    // Only admins can view CDN config
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view CDN configuration',
      });
    }

    const config = getCDNConfig();

    return {
      enabled: config.enabled,
      baseUrl: config.baseUrl,
      staticAssets: config.staticAssets,
      // Don't expose cache control headers to reduce response size
    };
  }),

  /**
   * Check CDN health
   */
  checkHealth: publicProcedure.query(async ({ ctx }) => {
    // Only admins can check CDN health
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can check CDN health',
      });
    }

    const health = await checkCDNHealth();

    return {
      ...health,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Purge CDN cache for specific paths
   */
  purgeCache: publicProcedure
    .input(
      z.object({
        paths: z.array(z.string()).min(1).max(100), // Max 100 paths per request
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only super admins can purge CDN cache
      if (ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can purge CDN cache',
        });
      }

      const result = await purgeCDNCache(input.paths);

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Cache purge failed',
        });
      }

      return {
        success: true,
        message: `Purged ${input.paths.length} paths from CDN cache`,
        paths: input.paths,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Get CDN statistics
   */
  getStatistics: publicProcedure
    .input(
      z.object({
        since: z.string().optional(), // ISO 8601 date
      })
    )
    .query(async ({ input, ctx }) => {
      // Only admins can view CDN statistics
      if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can view CDN statistics',
        });
      }

      const since = input.since ? new Date(input.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await getCDNStats(since);

      if (!result.success) {
        // Return empty stats if CDN not configured or unavailable
        return {
          available: false,
          error: result.error,
          stats: null,
        };
      }

      return {
        available: true,
        stats: result.stats,
        period: {
          since: since.toISOString(),
          until: new Date().toISOString(),
        },
      };
    }),

  /**
   * Purge entire CDN cache (super admin only)
   */
  purgeAll: publicProcedure.mutation(async ({ ctx }) => {
    // Only super admins can purge entire cache
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only super admins can purge entire CDN cache',
      });
    }

    const config = getCDNConfig();

    if (!config.enabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'CDN not enabled',
      });
    }

    // Cloudflare purge everything
    if (config.baseUrl.includes('cloudflare')) {
      const zoneId = process.env.CLOUDFLARE_ZONE_ID;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN;

      if (!zoneId || !apiToken) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Cloudflare credentials not configured',
        });
      }

      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ purge_everything: true }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: data.errors?.[0]?.message || 'Purge all failed',
          });
        }

        return {
          success: true,
          message: 'Entire CDN cache purged successfully',
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Purge all failed',
        });
      }
    }

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Purge all not supported for this CDN provider',
    });
  }),

  /**
   * Test CDN with sample asset
   */
  testAsset: publicProcedure
    .input(
      z.object({
        path: z.string(), // e.g., "/favicon.ico"
      })
    )
    .query(async ({ input, ctx }) => {
      // Only admins can test CDN
      if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can test CDN',
        });
      }

      const config = getCDNConfig();

      if (!config.enabled) {
        return {
          success: false,
          error: 'CDN not enabled',
        };
      }

      const testUrl = `${config.baseUrl}${input.path}`;
      const startTime = Date.now();

      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        const latency = Date.now() - startTime;

        return {
          success: response.ok,
          url: testUrl,
          status: response.status,
          latency,
          headers: {
            'cache-control': response.headers.get('cache-control'),
            'cf-cache-status': response.headers.get('cf-cache-status'), // Cloudflare
            'x-cache': response.headers.get('x-cache'), // CloudFront
          },
        };
      } catch (error: any) {
        return {
          success: false,
          url: testUrl,
          error: error.message,
        };
      }
    }),
});
