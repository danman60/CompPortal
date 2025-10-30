import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { capacityService } from '../services/capacity';
import { TRPCError } from '@trpc/server';

// Bulk import studios with pre-approved reservations
const bulkImportInputSchema = z.array(
  z.object({
    studioName: z.string().min(1),
    studioCode: z.string().min(3).max(10),
    ownerEmail: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    competitionId: z.string().uuid(),
    spaces: z.number().int().min(1),
  })
);

export const adminRouter = router({
  /**
   * Get capacity ledger (audit trail) for a competition
   * Shows all capacity changes with reason and timestamp
   * SUPER ADMIN ONLY
   */
  getCapacityLedger: protectedProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
        reservationId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Super admin only
      if (ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Super admin access required',
        });
      }

      return capacityService.getLedger(input.competitionId, {
        reservationId: input.reservationId,
        limit: input.limit,
      });
    }),

  /**
   * Get current available capacity for a competition
   */
  getAvailableCapacity: protectedProcedure
    .input(z.object({ competitionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Super admin or competition director
      if (!ctx.userRole || !['super_admin', 'competition_director'].includes(ctx.userRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      return capacityService.getAvailable(input.competitionId);
    }),

  /**
   * Reconcile capacity - verify ledger matches current state
   * Returns discrepancy if any
   * SUPER ADMIN ONLY
   */
  reconcileCapacity: protectedProcedure
    .input(z.object({ competitionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Super admin only
      if (ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Super admin access required',
        });
      }

      return capacityService.reconcile(input.competitionId);
    }),

  bulkImportStudios: protectedProcedure
    .input(bulkImportInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check user role - only super admins and competition directors
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (!userProfile || userProfile.role === 'studio_director') {
        throw new Error('Unauthorized: Only admins can bulk import studios');
      }

      const supabase = await createServerSupabaseClient();
      const results: { success: number; failed: number; errors: string[] } = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const studio of input) {
        try {
          // Check if email already exists in Supabase auth
          const existingUser = await prisma.users.findFirst({
            where: { email: studio.ownerEmail },
          });

          if (existingUser) {
            results.failed++;
            results.errors.push(`${studio.studioName}: Email ${studio.ownerEmail} already exists`);
            continue;
          }

          // Check if studio code already exists
          const existingStudio = await prisma.studios.findUnique({
            where: { code: studio.studioCode },
          });

          if (existingStudio) {
            results.failed++;
            results.errors.push(`${studio.studioName}: Studio code ${studio.studioCode} already exists`);
            continue;
          }

          // Create Supabase auth invite (user sets own password via email link)
          const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            studio.ownerEmail,
            {
              data: {
                first_name: studio.firstName,
                last_name: studio.lastName,
                role: 'studio_director',
              },
            }
          );

          if (authError || !authData.user) {
            results.failed++;
            results.errors.push(`${studio.studioName}: Auth invite failed - ${authError?.message}`);
            continue;
          }

          // Create user profile (email is in auth.users, not user_profiles)
          // Note: tenant_id is NULL for multi-tenant users (handle_new_user trigger may create this first)
          await prisma.user_profiles.create({
            data: {
              id: authData.user.id,
              tenant_id: null, // Multi-tenant: user not locked to any tenant
              first_name: studio.firstName,
              last_name: studio.lastName,
              role: 'studio_director',
            },
          });

          // Create studio (pre-approved)
          const newStudio = await prisma.studios.create({
            data: {
              name: studio.studioName,
              code: studio.studioCode,
              owner_id: authData.user.id,
              tenant_id: ctx.tenantId!,
              status: 'approved',
              contact_email: studio.ownerEmail,
              contact_phone: studio.phone,
            },
          });

          // Create pre-approved reservation with granted spaces
          await prisma.reservations.create({
            data: {
              studio_id: newStudio.id,
              competition_id: studio.competitionId,
              tenant_id: ctx.tenantId!,
              status: 'approved',
              spaces_requested: studio.spaces,
              spaces_confirmed: studio.spaces,
              internal_notes: 'Pre-imported via bulk import',
            },
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${studio.studioName}: ${error.message}`);
        }
      }

      return results;
    }),
});
