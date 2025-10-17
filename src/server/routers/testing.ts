/**
 * Testing Router - Super Admin Only
 *
 * Provides tools for cleaning and populating test data
 * ONLY available to super admins in development/staging
 */

import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Middleware: Super Admin only
 */
const superAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check super admin status
  if (ctx.userRole !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Super Admin access required',
    });
  }

  // Production safety check
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TESTING_TOOLS !== 'true') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Testing tools disabled in production',
    });
  }

  return next();
});

export const testingRouter = router({
  /**
   * Clean Slate - Wipe selected data types
   * Preserves system configuration and specified account types
   */
  cleanSlate: superAdminProcedure
    .input(z.object({
      confirmation: z.string(),
      wipeOptions: z.object({
        studios: z.boolean().default(true),
        dancers: z.boolean().default(true),
        entries: z.boolean().default(true),
        reservations: z.boolean().default(true),
        invoices: z.boolean().default(true),
        judges: z.boolean().default(true),
        sessions: z.boolean().default(true),
        scores: z.boolean().default(true),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Confirmation check
      if (input.confirmation !== 'DELETE ALL DATA') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Confirmation text must be "DELETE ALL DATA"',
        });
      }

      const deletedCounts: Record<string, number> = {};

      await prisma.$transaction(async (tx) => {
        // Delete in reverse dependency order

        if (input.wipeOptions.scores) {
          const scores = await tx.scores.deleteMany({});
          deletedCounts.scores = scores.count;
        }

        if (input.wipeOptions.invoices) {
          const invoices = await tx.invoices.deleteMany({});
          deletedCounts.invoices = invoices.count;
        }

        if (input.wipeOptions.sessions) {
          const sessions = await tx.competition_sessions.deleteMany({});
          deletedCounts.sessions = sessions.count;
        }

        if (input.wipeOptions.judges) {
          const judges = await tx.judges.deleteMany({});
          deletedCounts.judges = judges.count;
        }

        if (input.wipeOptions.entries) {
          // Clear entry relationships first
          await tx.entry_participants.deleteMany({});
          const entries = await tx.competition_entries.deleteMany({});
          deletedCounts.entries = entries.count;
        }

        if (input.wipeOptions.reservations) {
          const reservations = await tx.reservations.deleteMany({});
          deletedCounts.reservations = reservations.count;
        }

        if (input.wipeOptions.dancers) {
          const dancers = await tx.dancers.deleteMany({});
          deletedCounts.dancers = dancers.count;
        }

        if (input.wipeOptions.studios) {
          // Delete studio users (but preserve CD and SA accounts)
          const studioUsers = await tx.users.deleteMany({
            where: {
              role: 'studio_director',
              is_super_admin: { not: true },
            },
          });

          const studios = await tx.studios.deleteMany({});
          deletedCounts.studio_users = studioUsers.count;
          deletedCounts.studios = studios.count;
        }
      });

      return {
        success: true,
        deletedCounts,
        message: `Cleaned ${Object.keys(deletedCounts).length} data types`,
      };
    }),

  /**
   * Populate Test Data - Generate realistic test data
   * Creates studios, dancers, entries, reservations in various states
   *
   * TODO: Schema alignment needed - this function requires updates to match
   * the actual Prisma schema for: studios, dancers, competition_entries, invoices
   */
  populateTestData: superAdminProcedure
    .mutation(async ({ ctx }) => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Populate Test Data feature requires schema alignment work. Use CLEAN SLATE for now.',
      });
    }),

  /**
   * Get current data counts (for UI display)
   */
  getDataCounts: superAdminProcedure.query(async () => {
    const [
      studios,
      dancers,
      entries,
      reservations,
      invoices,
      competitions,
      sessions,
      judges,
    ] = await Promise.all([
      prisma.studios.count(),
      prisma.dancers.count(),
      prisma.competition_entries.count(),
      prisma.reservations.count(),
      prisma.invoices.count(),
      prisma.competitions.count(),
      prisma.competition_sessions.count(),
      prisma.judges.count(),
    ]);

    return {
      studios,
      dancers,
      entries,
      reservations,
      invoices,
      competitions,
      sessions,
      judges,
    };
  }),
});
