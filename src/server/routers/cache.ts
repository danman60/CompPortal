/**
 * Cache Management tRPC Router
 * Admin endpoints for Redis cache monitoring and control
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  getRedisConfig,
  getCacheStats,
  cacheDelete,
  cacheDeletePattern,
  cacheFlush,
  CacheKeys,
  CacheInvalidation,
} from '@/lib/redis';

export const cacheRouter = router({
  /**
   * Get cache configuration status
   */
  getConfig: publicProcedure.query(async ({ ctx }) => {
    // Only admins can view cache config
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view cache configuration',
      });
    }

    const config = getRedisConfig();

    return {
      enabled: config.enabled,
      host: config.host,
      port: config.port,
      db: config.db,
      keyPrefix: config.keyPrefix,
      ttl: config.ttl,
    };
  }),

  /**
   * Get cache statistics
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    // Only admins can view cache stats
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view cache statistics',
      });
    }

    const stats = await getCacheStats();

    if (!stats) {
      return {
        available: false,
        error: 'Cache not enabled or not connected',
      };
    }

    return {
      available: true,
      connected: stats.connected,
      keys: stats.keys,
      memory: {
        used: stats.memory.used,
        usedMB: (stats.memory.used / 1024 / 1024).toFixed(2),
        peak: stats.memory.peak,
        peakMB: (stats.memory.peak / 1024 / 1024).toFixed(2),
        fragmentation: stats.memory.fragmentation,
      },
      performance: {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: (stats.hitRate * 100).toFixed(2) + '%',
        hitRateRaw: stats.hitRate,
      },
      evictions: stats.evictions,
      connections: stats.connections,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Invalidate specific cache key
   */
  invalidateKey: publicProcedure
    .input(
      z.object({
        key: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admins can invalidate cache
      if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can invalidate cache',
        });
      }

      const success = await cacheDelete(input.key);

      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Cache invalidation failed',
        });
      }

      return {
        success: true,
        message: `Cache key invalidated: ${input.key}`,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern: publicProcedure
    .input(
      z.object({
        pattern: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admins can invalidate cache
      if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can invalidate cache',
        });
      }

      const deletedCount = await cacheDeletePattern(input.pattern);

      return {
        success: true,
        message: `Invalidated ${deletedCount} cache keys matching pattern: ${input.pattern}`,
        deletedCount,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Invalidate resource-specific caches
   */
  invalidateResource: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'competition',
          'studio',
          'dancer',
          'entry',
          'reservation',
          'invoice',
          'analytics',
          'tenant',
        ]),
        id: z.string(),
        tenantId: z.string().optional(),
        studioId: z.string().optional(),
        competitionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admins can invalidate cache
      if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can invalidate cache',
        });
      }

      try {
        switch (input.type) {
          case 'competition':
            await CacheInvalidation.competition(input.id, input.tenantId || '');
            break;
          case 'studio':
            await CacheInvalidation.studio(input.id, input.tenantId || '');
            break;
          case 'dancer':
            await CacheInvalidation.dancer(input.id, input.studioId || '');
            break;
          case 'entry':
            await CacheInvalidation.entry(input.id, input.studioId || '', input.competitionId);
            break;
          case 'reservation':
            await CacheInvalidation.reservation(
              input.id,
              input.studioId || '',
              input.competitionId || ''
            );
            break;
          case 'invoice':
            await CacheInvalidation.invoice(
              input.id,
              input.studioId || '',
              input.competitionId || ''
            );
            break;
          case 'analytics':
            await CacheInvalidation.analytics(input.tenantId || '');
            break;
          case 'tenant':
            await CacheInvalidation.tenant(input.id);
            break;
        }

        return {
          success: true,
          message: `Invalidated ${input.type} cache for ID: ${input.id}`,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Cache invalidation failed',
        });
      }
    }),

  /**
   * Flush entire cache (super admin only)
   */
  flushAll: publicProcedure.mutation(async ({ ctx }) => {
    // Only super admins can flush cache
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only super admins can flush cache',
      });
    }

    const success = await cacheFlush();

    if (!success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Cache flush failed',
      });
    }

    return {
      success: true,
      message: 'Entire cache flushed successfully',
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Test cache connectivity
   */
  testConnection: publicProcedure.query(async ({ ctx }) => {
    // Only admins can test cache
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can test cache',
      });
    }

    const stats = await getCacheStats();

    return {
      connected: stats?.connected || false,
      available: !!stats,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Get cache key examples
   */
  getKeyExamples: publicProcedure.query(async ({ ctx }) => {
    // Only admins can view key examples
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view cache key examples',
      });
    }

    return {
      competition: CacheKeys.competition('comp-id-123'),
      competitions: CacheKeys.competitions('tenant-id-456'),
      studio: CacheKeys.studio('studio-id-789'),
      studios: CacheKeys.studios('tenant-id-456'),
      dancer: CacheKeys.dancer('dancer-id-abc'),
      dancers: CacheKeys.dancers('studio-id-789'),
      entry: CacheKeys.entry('entry-id-def'),
      entries: CacheKeys.entries('studio-id-789', 'comp-id-123'),
      reservation: CacheKeys.reservation('res-id-ghi'),
      reservations: CacheKeys.reservations('studio-id-789', 'comp-id-123'),
      invoice: CacheKeys.invoice('inv-id-jkl'),
      invoices: CacheKeys.invoices('studio-id-789', 'comp-id-123'),
      analytics: CacheKeys.analytics('dashboard', 'tenant-id-456', '2025-01'),
    };
  }),
});
