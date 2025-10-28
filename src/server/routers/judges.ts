import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

/**
 * Judges router for managing judge assignments
 * Handles creating judges, assigning to competitions, and panel management
 */
export const judgesRouter = router({
  /**
   * Create a new judge
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        credentials: z.string().optional(),
        specialization: z.string().optional(),
        certification_level: z.string().optional(),
        years_judging: z.number().int().min(0).optional(),
        competition_id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get tenant_id from competition
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
        select: { tenant_id: true },
      });

      const judge = await prisma.judges.create({
        data: {
          tenant_id: competition!.tenant_id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          credentials: input.credentials,
          specialization: input.specialization,
          certification_level: input.certification_level,
          years_judging: input.years_judging,
          competition_id: input.competition_id,
          confirmed: false,
          checked_in: false,
        },
      });

      return judge;
    }),

  /**
   * Assign judge to competition
   */
  assignToCompetition: publicProcedure
    .input(
      z.object({
        judge_id: z.string().uuid(),
        competition_id: z.string().uuid(),
        judge_number: z.number().int().min(1).optional(),
        panel_assignment: z.string().optional(),
        sessions: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify judge exists
      const judge = await prisma.judges.findUnique({
        where: { id: input.judge_id },
      });

      if (!judge) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Judge not found',
        });
      }

      // Verify competition exists
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Update judge with competition assignment
      const updatedJudge = await prisma.judges.update({
        where: { id: input.judge_id },
        data: {
          competition_id: input.competition_id,
          judge_number: input.judge_number,
          panel_assignment: input.panel_assignment,
          sessions: input.sessions || [],
        },
      });

      return updatedJudge;
    }),

  /**
   * Get all judges for a competition
   */
  getByCompetition: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const judges = await prisma.judges.findMany({
        where: { competition_id: input.competition_id },
        orderBy: [
          { judge_number: 'asc' },
          { name: 'asc' },
        ],
      });

      return judges;
    }),

  /**
   * Get all judges (for admin panel)
   */
  getAll: publicProcedure.query(async () => {
    const judges = await prisma.judges.findMany({
      include: {
        competitions: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return judges;
  }),

  /**
   * Update judge details
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        credentials: z.string().optional(),
        specialization: z.string().optional(),
        certification_level: z.string().optional(),
        years_judging: z.number().int().min(0).optional(),
        judge_number: z.number().int().min(1).optional(),
        panel_assignment: z.string().optional(),
        confirmed: z.boolean().optional(),
        checked_in: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const judge = await prisma.judges.update({
        where: { id },
        data,
      });

      return judge;
    }),

  /**
   * Delete a judge
   */
  delete: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if judge has scores
      const scoresCount = await prisma.scores.count({
        where: { judge_id: input.id },
      });

      if (scoresCount > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete judge with existing scores',
        });
      }

      await prisma.judges.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Check in a judge
   */
  checkIn: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const judge = await prisma.judges.update({
        where: { id: input.id },
        data: { checked_in: true },
      });

      return judge;
    }),
});
