import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

// Zod schema for routine data stored in JSONB
const routineDataSchema = z.object({
  title: z.string(),
  choreographer: z.string().optional(),
  props: z.string().optional(),
  matched_dancers: z.array(z.object({
    dancer_id: z.string().uuid(),
    dancer_name: z.string(),
    dancer_age: z.number().nullable(),
    date_of_birth: z.string().nullable(),
    classification_id: z.string().uuid().nullable().optional(),
  })),
  unmatched_dancers: z.array(z.string()).optional(),
});

export const importSessionRouter = router({
  /**
   * Create a new import session from parsed CSV data
   */
  create: publicProcedure
    .input(z.object({
      reservation_id: z.string().uuid(),
      routines: z.array(routineDataSchema),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Get reservation to find studio_id
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservation_id },
        select: { studio_id: true, tenant_id: true },
      });

      if (!reservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reservation not found',
        });
      }

      // Verify user has access to this studio (tenant isolation)
      if (ctx.userRole !== 'super_admin' && ctx.tenantId !== reservation.tenant_id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Create import session
      const session = await prisma.routine_import_sessions.create({
        data: {
          studio_id: reservation.studio_id,
          reservation_id: input.reservation_id,
          total_routines: input.routines.length,
          routines: input.routines as any, // Prisma Json type
          current_index: 0,
          completed: false,
        },
      });

      return session;
    }),

  /**
   * Get import session by ID
   */
  getById: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const session = await prisma.routine_import_sessions.findUnique({
        where: { id: input.id },
        include: {
          studios: true,
          reservations: {
            include: {
              competitions: true,
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Import session not found',
        });
      }

      // Verify tenant access
      if (ctx.userRole !== 'super_admin') {
        const studio = await prisma.studios.findUnique({
          where: { id: session.studio_id },
          select: { tenant_id: true },
        });

        if (!studio || studio.tenant_id !== ctx.tenantId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
      }

      return session;
    }),

  /**
   * Update current index (move to next routine)
   */
  updateIndex: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      current_index: z.number().int().min(0),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const session = await prisma.routine_import_sessions.findUnique({
        where: { id: input.id },
        include: { studios: { select: { tenant_id: true } } },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Verify tenant access
      if (ctx.userRole !== 'super_admin' && ctx.tenantId !== session.studios.tenant_id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updated = await prisma.routine_import_sessions.update({
        where: { id: input.id },
        data: {
          current_index: input.current_index,
          updated_at: new Date(),
        },
      });

      return updated;
    }),

  /**
   * Delete a routine from the session's routines array
   */
  deleteRoutine: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      routine_index: z.number().int().min(0),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const session = await prisma.routine_import_sessions.findUnique({
        where: { id: input.id },
        include: { studios: { select: { tenant_id: true } } },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Verify tenant access
      if (ctx.userRole !== 'super_admin' && ctx.tenantId !== session.studios.tenant_id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Remove routine from array
      const routines = session.routines as any[];
      if (input.routine_index >= routines.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Routine index out of bounds',
        });
      }

      routines.splice(input.routine_index, 1);

      // Update session
      const updated = await prisma.routine_import_sessions.update({
        where: { id: input.id },
        data: {
          routines: routines as any,
          total_routines: routines.length,
          updated_at: new Date(),
        },
      });

      return updated;
    }),

  /**
   * Mark session as completed
   */
  markComplete: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const session = await prisma.routine_import_sessions.findUnique({
        where: { id: input.id },
        include: { studios: { select: { tenant_id: true } } },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Verify tenant access
      if (ctx.userRole !== 'super_admin' && ctx.tenantId !== session.studios.tenant_id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updated = await prisma.routine_import_sessions.update({
        where: { id: input.id },
        data: {
          completed: true,
          updated_at: new Date(),
        },
      });

      return updated;
    }),

  /**
   * Get active (incomplete) import session for a studio
   * Returns most recent incomplete session
   */
  getActiveForStudio: publicProcedure
    .input(z.object({
      studio_id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Verify studio belongs to current tenant
      const studio = await prisma.studios.findUnique({
        where: { id: input.studio_id },
        select: { tenant_id: true },
      });

      if (!studio) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Studio not found' });
      }

      if (ctx.userRole !== 'super_admin' && ctx.tenantId !== studio.tenant_id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Get most recent incomplete session
      const session = await prisma.routine_import_sessions.findFirst({
        where: {
          studio_id: input.studio_id,
          completed: false,
        },
        orderBy: {
          created_at: 'desc',
        },
        include: {
          reservations: {
            include: {
              competitions: true,
            },
          },
        },
      });

      return session;
    }),
});
