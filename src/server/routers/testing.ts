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
          // Get all approved reservations to refund capacity BEFORE deletion
          const reservationsToDelete = await tx.reservations.findMany({
            where: { status: 'approved' },
            select: {
              id: true,
              competition_id: true,
              spaces_confirmed: true,
            },
          });

          // Delete capacity_ledger entries FIRST (to avoid orphaned ledger entries)
          const ledgerDeleted = await tx.capacity_ledger.deleteMany({});
          deletedCounts.capacity_ledger = ledgerDeleted.count;

          // Delete all reservations
          const reservations = await tx.reservations.deleteMany({});
          deletedCounts.reservations = reservations.count;

          // Refund capacity for approved reservations back to competitions
          // ALSO reset available_reservation_tokens to total_reservation_tokens to ensure clean state
          const competitions = await tx.competitions.findMany({
            select: { id: true, total_reservation_tokens: true },
          });

          for (const comp of competitions) {
            await tx.competitions.update({
              where: { id: comp.id },
              data: {
                available_reservation_tokens: comp.total_reservation_tokens,
              },
            });
          }
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
   * Creates 25 studios across all pipeline stages with matching capacity
   */
  populateTestData: superAdminProcedure
    .mutation(async ({ ctx }) => {
      const tenantId = ctx.tenantId!;
      const createdCounts: Record<string, number> = {};

      // Get available competitions
      const competitions = await prisma.competitions.findMany({
        where: { tenant_id: tenantId, status: { not: 'cancelled' } },
        orderBy: { competition_start_date: 'asc' },
        take: 3,
      });

      if (competitions.length === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No active competitions found. Please create competitions first.',
        });
      }

      // Pipeline stage distribution (25 studios total)
      const stageDistribution = [
        { stage: 'pending', count: 5 },           // 5 pending reservations
        { stage: 'approved', count: 6 },          // 6 approved (no summary yet)
        { stage: 'summarized', count: 6 },        // 6 with summaries (ready to invoice)
        { stage: 'invoiced_draft', count: 4 },    // 4 with draft invoices
        { stage: 'invoiced_sent', count: 2 },     // 2 with sent invoices
        { stage: 'paid', count: 2 },              // 2 fully paid
      ];

      let studioIndex = 0;
      const password = 'TestPassword123!';

      await prisma.$transaction(async (tx) => {
        for (const { stage, count } of stageDistribution) {
          for (let i = 0; i < count; i++) {
            studioIndex++;
            const studioName = `${faker.company.name()} Dance Studio`;
            const email = `testsd${studioIndex}@test.com`;
            const spacesRequested = faker.number.int({ min: 15, max: 35 });

            // Create auth user
            const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
            });

            if (error || !authUser.user) {
              console.error(`Failed to create auth user for ${email}:`, error);
              continue;
            }

            // Create user profile
            await tx.user_profiles.create({
              data: {
                id: authUser.user.id,
                role: 'studio_director',
                tenant_id: tenantId,
              },
            });

            // Generate studio code
            const studioCode = `TS${studioIndex.toString().padStart(3, '0')}`;

            // Create studio
            const studio = await tx.studios.create({
              data: {
                owner_id: authUser.user.id,
                code: studioCode,
                public_code: studioCode,
                name: studioName,
                city: faker.location.city(),
                province: 'Ontario',
                country: 'Canada',
                phone: faker.phone.number(),
                email,
                tenant_id: tenantId,
              },
            });

            createdCounts.studios = (createdCounts.studios || 0) + 1;

            // Create 8-12 dancers per studio
            const dancerCount = faker.number.int({ min: 8, max: 12 });
            for (let d = 0; d < dancerCount; d++) {
              await tx.dancers.create({
                data: {
                  studio_id: studio.id,
                  first_name: faker.person.firstName(),
                  last_name: faker.person.lastName(),
                  date_of_birth: faker.date.birthdate({ min: 5, max: 18, mode: 'age' }),
                  gender: faker.helpers.arrayElement(['Female', 'Male', 'Non-binary']),
                  parent_name: faker.person.fullName(),
                  parent_email: faker.internet.email(),
                  parent_phone: faker.phone.number(),
                  tenant_id: tenantId,
                },
              });
              createdCounts.dancers = (createdCounts.dancers || 0) + 1;
            }

            // Select a competition for this studio
            const competition = competitions[i % competitions.length];

            // Create reservation based on stage
            if (stage !== 'no_reservation') {
              const reservation = await tx.reservations.create({
                data: {
                  studio_id: studio.id,
                  competition_id: competition.id,
                  spaces_requested: spacesRequested,
                  spaces_confirmed: stage === 'pending' ? 0 : spacesRequested,
                  status: stage === 'pending' ? 'pending' :
                          stage.startsWith('approved') || stage.startsWith('summarized') || stage.startsWith('invoiced') || stage === 'paid' ? 'approved' :
                          stage.startsWith('summarized') ? 'summarized' :
                          'approved',
                  requested_at: faker.date.recent({ days: 14 }),
                  approved_at: stage !== 'pending' ? faker.date.recent({ days: 10 }) : null,
                  agent_first_name: faker.person.firstName(),
                  agent_last_name: faker.person.lastName(),
                  agent_email: email,
                  agent_phone: faker.phone.number(),
                  age_of_consent: true,
                  waiver_consent: true,
                  media_consent: true,
                  deposit_amount: 100,
                  tenant_id: tenantId,
                },
              });

              createdCounts.reservations = (createdCounts.reservations || 0) + 1;

              // Deduct capacity for approved reservations
              if (stage !== 'pending') {
                await tx.competitions.update({
                  where: { id: competition.id },
                  data: {
                    available_reservation_tokens: { decrement: spacesRequested },
                  },
                });

                // Add capacity ledger entry
                await tx.capacity_ledger.create({
                  data: {
                    competition_id: competition.id,
                    reservation_id: reservation.id,
                    change_amount: -spacesRequested,
                    reason: 'approval',
                    tenant_id: tenantId,
                  },
                });
              }

              // Create invoice for stages that need it
              if (stage.startsWith('invoiced') || stage === 'paid') {
                const invoiceStatus = stage === 'invoiced_draft' ? 'DRAFT' : 'SENT';
                const paidAt = stage === 'paid' ? faker.date.recent({ days: 3 }) : null;

                await tx.invoices.create({
                  data: {
                    studio_id: studio.id,
                    competition_id: competition.id,
                    reservation_id: reservation.id,
                    status: invoiceStatus,
                    subtotal: spacesRequested * 50, // $50 per entry
                    total: spacesRequested * 50,
                    paid_at: paidAt,
                    payment_method: paidAt ? 'credit_card' : null,
                    tenant_id: tenantId,
                  },
                });

                createdCounts.invoices = (createdCounts.invoices || 0) + 1;
              }
            }
          }
        }
      });

      return {
        success: true,
        createdCounts,
        message: `Created ${studioIndex} studios across all pipeline stages`,
      };
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
