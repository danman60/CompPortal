import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  getSlowQueries,
  getQuerySummary,
  getOptimizationRecommendations,
  exportMetrics,
  clearMetrics,
} from '@/lib/query-monitor';
import { TRPCError } from '@trpc/server';

export const performanceRouter = router({
  /**
   * Get query performance summary
   */
  getSummary: publicProcedure.query(async ({ ctx }) => {
    // Only admins can access performance metrics
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can access performance metrics',
      });
    }

    const summary = getQuerySummary();
    return {
      ...summary,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Get slow queries report
   */
  getSlowQueries: publicProcedure
    .input(
      z
        .object({
          thresholdMs: z.number().min(10).max(10000).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      // Only admins can access performance metrics
      if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can access performance metrics',
        });
      }

      const threshold = input?.thresholdMs || 100;
      const slowQueries = getSlowQueries(threshold);

      return {
        threshold,
        count: slowQueries.length,
        queries: slowQueries,
      };
    }),

  /**
   * Get optimization recommendations
   */
  getRecommendations: publicProcedure.query(async ({ ctx }) => {
    // Only admins can access performance metrics
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can access performance metrics',
      });
    }

    const recommendations = getOptimizationRecommendations();

    return {
      recommendations,
      count: recommendations.length,
    };
  }),

  /**
   * Export full metrics report
   */
  exportMetrics: publicProcedure.query(async ({ ctx }) => {
    // Only admins can access performance metrics
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can access performance metrics',
      });
    }

    return exportMetrics();
  }),

  /**
   * Clear metrics (for testing or reset)
   */
  clearMetrics: publicProcedure.mutation(async ({ ctx }) => {
    // Only admins can clear metrics
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can clear performance metrics',
      });
    }

    clearMetrics();

    return {
      success: true,
      message: 'Performance metrics cleared',
    };
  }),
});
