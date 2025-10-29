/**
 * Failure Log Router
 *
 * tRPC endpoints for failure tracking and management.
 *
 * Wave 3.2: Silent Failure Detection
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  getPendingFailures,
  getFailureById,
  getFailureCountByStatus,
  retryFailure,
  markResolved,
  markPermanentlyFailed,
} from '@/lib/services/failureTracker';

export const failureRouter = router({
  /**
   * Get count of failures by status
   */
  getCountByStatus: publicProcedure.query(async ({ ctx }) => {
    // TODO: Add tenant filtering when multi-tenancy is restored
    return await getFailureCountByStatus();
  }),

  /**
   * Get all pending failures
   */
  getPending: publicProcedure.query(async ({ ctx }) => {
    // TODO: Add tenant filtering when multi-tenancy is restored
    return await getPendingFailures();
  }),

  /**
   * Get failure by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getFailureById(input.id);
    }),

  /**
   * Retry a failed operation
   */
  retry: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await retryFailure(input.id);
    }),

  /**
   * Mark failure as resolved
   */
  resolve: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await markResolved(input.id);
    }),

  /**
   * Mark failure as permanently failed
   */
  markPermanentlyFailed: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await markPermanentlyFailed(input.id);
    }),
});
