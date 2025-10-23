/**
 * Testing Router - Super Admin Only
 *
 * Provides tools for cleaning and populating test data
 * ONLY available to super admins in development/staging
 */

import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-server';
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
      let studioDirectorIds: string[] = [];

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
          // Get studio director user IDs before deleting (to delete from auth.users)
          const studioDirectors = await tx.user_profiles.findMany({
            where: {
              role: 'studio_director',
            },
            select: { id: true },
          });

          studioDirectorIds = studioDirectors.map(sd => sd.id);

          // Delete studio user profiles (but preserve CD and SA accounts)
          const studioUsers = await tx.user_profiles.deleteMany({
            where: {
              role: 'studio_director',
            },
          });

          const studios = await tx.studios.deleteMany({});
          deletedCounts.studio_users = studioUsers.count;
          deletedCounts.studios = studios.count;
        }
      });

      // Delete from auth.users AFTER transaction completes (Supabase Admin API)
      if (studioDirectorIds.length > 0) {
        let authDeletedCount = 0;
        for (const userId of studioDirectorIds) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            authDeletedCount++;
          } catch (error) {
            console.error(`Failed to delete auth user ${userId}:`, error);
            // Continue with other deletions
          }
        }
        deletedCounts.auth_users = authDeletedCount;
      }

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
   * Delete User By Email - Remove user from auth.users
   * Super Admin only - for cleaning up test accounts
   */
  deleteUserByEmail: superAdminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      // Find user in auth.users
      const result = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
        SELECT id, email FROM auth.users WHERE email = ${input.email}
      `;

      if (!result || result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `User with email ${input.email} not found`,
        });
      }

      const userId = result[0].id;

      // Delete user profile first (if exists)
      try {
        await prisma.user_profiles.delete({
          where: { id: userId },
        });
      } catch (error) {
        // Profile might not exist, continue
      }

      // Delete from auth.users
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete auth user: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      return {
        success: true,
        email: input.email,
        userId: userId,
        message: `Deleted user ${input.email}`,
      };
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
